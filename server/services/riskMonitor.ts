import { and, desc, eq, gte, sql } from "drizzle-orm";
import { storage } from "../storage";
import { createNotification, notifyAllAdmins } from "../notifications";
import { NOTIFICATION_PRIORITIES, NOTIFICATION_STYLES, NOTIFICATION_TYPES } from "../../shared/notificationTypes";
import { children, deposits, parentChild, parentPurchases, parentReferralCodes, parentWallet, pointsLedger, referrals, riskAlerts } from "../../shared/schema";

const db = storage.db;

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const RISK_THRESHOLDS = {
  DEPOSIT_HIGH_SINGLE_AMOUNT: readNumberEnv("RISK_DEPOSIT_HIGH_SINGLE_AMOUNT", 30000),
  DEPOSIT_HIGH_DAILY_COMPLETED_PLUS_NEW: readNumberEnv("RISK_DEPOSIT_HIGH_DAILY_COMPLETED_PLUS_NEW", 100000),
  DEPOSIT_MEDIUM_PENDING_COUNT: readNumberEnv("RISK_DEPOSIT_MEDIUM_PENDING_COUNT", 3),
  DEPOSIT_MEDIUM_DAILY_COUNT: readNumberEnv("RISK_DEPOSIT_MEDIUM_DAILY_COUNT", 5),

  WALLET_HIGH_SINGLE_SPEND: readNumberEnv("RISK_WALLET_HIGH_SINGLE_SPEND", 15000),
  WALLET_HIGH_DAILY_SPEND: readNumberEnv("RISK_WALLET_HIGH_DAILY_SPEND", 50000),

  CHILD_POINTS_EARN_DELTA_MEDIUM: readNumberEnv("RISK_CHILD_POINTS_EARN_DELTA_MEDIUM", 120),
  CHILD_POINTS_EARN_HOURLY_MEDIUM: readNumberEnv("RISK_CHILD_POINTS_EARN_HOURLY_MEDIUM", 220),
  CHILD_POINTS_SPEND_DELTA_MEDIUM: readNumberEnv("RISK_CHILD_POINTS_SPEND_DELTA_MEDIUM", 100),
  CHILD_POINTS_SPEND_HOURLY_MEDIUM: readNumberEnv("RISK_CHILD_POINTS_SPEND_HOURLY_MEDIUM", 220),

  REFERRAL_HIGH_DAILY_COUNT: readNumberEnv("RISK_REFERRAL_HIGH_DAILY_COUNT", 5),
  REFERRAL_HIGH_REWARD_POINTS: readNumberEnv("RISK_REFERRAL_HIGH_REWARD_POINTS", 300),
};

type RiskSeverity = "low" | "medium" | "high";

type CreateRiskAlertParams = {
  parentId?: string | null;
  childId?: string | null;
  targetType: "parent" | "child" | "referral";
  targetId: string;
  riskType: string;
  severity: RiskSeverity;
  riskScore: number;
  title: string;
  summary: string;
  details: string;
  evidence?: Record<string, any>;
};

function severityPriority(severity: RiskSeverity) {
  if (severity === "high") return NOTIFICATION_PRIORITIES.BLOCKING;
  if (severity === "medium") return NOTIFICATION_PRIORITIES.WARNING;
  return NOTIFICATION_PRIORITIES.NORMAL;
}

async function upsertRiskAlert(params: CreateRiskAlertParams) {
  const recentWindow = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const existing = await db
    .select()
    .from(riskAlerts)
    .where(
      and(
        eq(riskAlerts.targetType, params.targetType),
        eq(riskAlerts.targetId, params.targetId),
        eq(riskAlerts.riskType, params.riskType),
        eq(riskAlerts.status, "open"),
        gte(riskAlerts.lastDetectedAt, recentWindow),
      ),
    )
    .orderBy(desc(riskAlerts.lastDetectedAt))
    .limit(1);

  if (existing[0]) {
    const mergedEvidence = {
      ...(existing[0].evidence || {}),
      ...(params.evidence || {}),
      lastUpdateAt: new Date().toISOString(),
    };

    const updated = await db
      .update(riskAlerts)
      .set({
        severity: params.severity,
        riskScore: Math.max(existing[0].riskScore || 0, params.riskScore),
        summary: params.summary,
        details: params.details,
        evidence: mergedEvidence,
        detectionCount: (existing[0].detectionCount || 1) + 1,
        lastDetectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(riskAlerts.id, existing[0].id))
      .returning();

    return updated[0];
  }

  const inserted = await db
    .insert(riskAlerts)
    .values({
      parentId: params.parentId || null,
      childId: params.childId || null,
      targetType: params.targetType,
      targetId: params.targetId,
      riskType: params.riskType,
      severity: params.severity,
      riskScore: params.riskScore,
      title: params.title,
      summary: params.summary,
      details: params.details,
      evidence: params.evidence || null,
      status: "open",
      detectionCount: 1,
      firstDetectedAt: new Date(),
      lastDetectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return inserted[0];
}

async function notifyAdminWithRisk(alert: any) {
  const metadata = {
    alertId: alert.id,
    riskType: alert.riskType,
    severity: alert.severity,
    targetType: alert.targetType,
    targetId: alert.targetId,
    riskScore: alert.riskScore,
    parentId: alert.parentId,
    childId: alert.childId,
  };

  await notifyAllAdmins({
    type: NOTIFICATION_TYPES.SECURITY_ALERT,
    title: `${alert.severity === "high" ? "🚨" : "⚠️"} ${alert.title}`,
    message: `${alert.summary}\nالمستخدم المشتبه: ${alert.targetId}`,
    relatedId: alert.id,
    metadata,
    style: NOTIFICATION_STYLES.MODAL,
    priority: severityPriority(alert.severity as RiskSeverity),
    soundAlert: alert.severity !== "low",
  });

  if (alert.parentId) {
    await createNotification({
      parentId: alert.parentId,
      type: NOTIFICATION_TYPES.SECURITY_ALERT,
      title: "تنبيه أمني قيد المراجعة",
      message: "تم رصد نشاط غير معتاد على حسابك ويتم مراجعته لحمايتك.",
      style: NOTIFICATION_STYLES.BANNER,
      priority: NOTIFICATION_PRIORITIES.WARNING,
      relatedId: alert.id,
      metadata,
    });
  }
}

async function createAndNotify(params: CreateRiskAlertParams) {
  const alert = await upsertRiskAlert(params);
  await notifyAdminWithRisk(alert);
  return alert;
}

export async function monitorDepositCreation(input: { parentId: string; amount: number; depositId?: string | null }) {
  const { parentId, amount, depositId } = input;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [pendingCountRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(deposits)
    .where(and(eq(deposits.parentId, parentId), eq(deposits.status, "pending")));

  const [dailyCountRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(deposits)
    .where(and(eq(deposits.parentId, parentId), gte(deposits.createdAt, oneDayAgo)));

  const [dailyCompletedSumRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${deposits.amount}::numeric), 0)` })
    .from(deposits)
    .where(and(eq(deposits.parentId, parentId), eq(deposits.status, "completed"), gte(deposits.createdAt, oneDayAgo)));

  const pendingCount = Number(pendingCountRow?.count || 0);
  const dailyCount = Number(dailyCountRow?.count || 0);
  const dailyCompleted = Number(dailyCompletedSumRow?.total || 0);

  if (
    amount >= RISK_THRESHOLDS.DEPOSIT_HIGH_SINGLE_AMOUNT ||
    dailyCompleted + amount >= RISK_THRESHOLDS.DEPOSIT_HIGH_DAILY_COMPLETED_PLUS_NEW
  ) {
    await createAndNotify({
      parentId,
      targetType: "parent",
      targetId: parentId,
      riskType: "deposit_volume_spike",
      severity: "high",
      riskScore: 92,
      title: "نمط إيداع مرتفع غير معتاد",
      summary: `تم رصد إيداع كبير (${amount.toFixed(2)}) أو حجم إيداعات يومي مرتفع جدًا.`,
      details: "قد يشير ذلك إلى محاولة تدوير أموال أو استغلال نظام الرصيد عبر إيداعات متكررة مرتفعة خلال فترة قصيرة.",
      evidence: { amount, dailyCompleted, pendingCount, dailyCount, depositId: depositId || null },
    });
    return;
  }

  if (
    pendingCount >= RISK_THRESHOLDS.DEPOSIT_MEDIUM_PENDING_COUNT ||
    dailyCount >= RISK_THRESHOLDS.DEPOSIT_MEDIUM_DAILY_COUNT
  ) {
    await createAndNotify({
      parentId,
      targetType: "parent",
      targetId: parentId,
      riskType: "deposit_frequency_spike",
      severity: "medium",
      riskScore: 74,
      title: "تكرار طلبات إيداع مرتفع",
      summary: `الحساب لديه ${pendingCount} طلبات إيداع قيد المراجعة و ${dailyCount} طلبات خلال 24 ساعة.`,
      details: "الطلب المتكرر بكثافة قد يكون محاولة لاختبار ثغرات التحقق أو التحايل على السياسات المالية.",
      evidence: { amount, pendingCount, dailyCount, depositId: depositId || null },
    });
  }
}

export async function monitorWalletSpend(input: { parentId: string; amount: number; source: string; relatedId?: string | null }) {
  const { parentId, amount, source, relatedId } = input;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [dailySpentRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${parentPurchases.totalAmount}::numeric), 0)` })
    .from(parentPurchases)
    .where(and(eq(parentPurchases.parentId, parentId), gte(parentPurchases.createdAt, oneDayAgo)));

  const [walletRow] = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId)).limit(1);

  const dailySpent = Number(dailySpentRow?.total || 0);
  const walletBalance = Number(walletRow?.balance || 0);

  if (
    amount >= RISK_THRESHOLDS.WALLET_HIGH_SINGLE_SPEND ||
    dailySpent >= RISK_THRESHOLDS.WALLET_HIGH_DAILY_SPEND
  ) {
    await createAndNotify({
      parentId,
      targetType: "parent",
      targetId: parentId,
      riskType: "wallet_spend_spike",
      severity: "high",
      riskScore: 88,
      title: "إنفاق محفظة مرتفع غير معتاد",
      summary: `تم رصد إنفاق مرتفع (${amount.toFixed(2)}) أو إجمالي يومي (${dailySpent.toFixed(2)}).`,
      details: "قد يشير ذلك إلى استخدام غير مصرح به للحساب أو سلوك شراء احتيالي سريع.",
      evidence: { source, amount, dailySpent, walletBalance, relatedId: relatedId || null },
    });
  }
}

export async function monitorChildPoints(input: { childId: string; delta: number; reason: string; requestId?: string | null }) {
  const { childId, delta, reason, requestId } = input;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [childInfo] = await db.select({ id: children.id, name: children.name }).from(children).where(eq(children.id, childId)).limit(1);
  const [link] = await db.select({ parentId: parentChild.parentId }).from(parentChild).where(eq(parentChild.childId, childId)).limit(1);

  if (!childInfo) return;

  const [hourEarnedRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(CASE WHEN ${pointsLedger.pointsDelta} > 0 THEN ${pointsLedger.pointsDelta} ELSE 0 END), 0)` })
    .from(pointsLedger)
    .where(and(eq(pointsLedger.childId, childId), gte(pointsLedger.createdAt, oneHourAgo)));

  const [hourSpentRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(CASE WHEN ${pointsLedger.pointsDelta} < 0 THEN ABS(${pointsLedger.pointsDelta}) ELSE 0 END), 0)` })
    .from(pointsLedger)
    .where(and(eq(pointsLedger.childId, childId), gte(pointsLedger.createdAt, oneHourAgo)));

  const hourEarned = Number(hourEarnedRow?.total || 0);
  const hourSpent = Number(hourSpentRow?.total || 0);

  if (
    delta > 0 &&
    (delta >= RISK_THRESHOLDS.CHILD_POINTS_EARN_DELTA_MEDIUM || hourEarned >= RISK_THRESHOLDS.CHILD_POINTS_EARN_HOURLY_MEDIUM)
  ) {
    await createAndNotify({
      parentId: link?.parentId || null,
      childId,
      targetType: "child",
      targetId: childId,
      riskType: "child_points_earning_spike",
      severity: reason === "AD_WATCH_COMPLETED" ? "high" : "medium",
      riskScore: reason === "AD_WATCH_COMPLETED" ? 86 : 70,
      title: "ارتفاع غير طبيعي في كسب نقاط الطفل",
      summary: `الطفل ${childInfo.name} كسب ${hourEarned} نقطة خلال ساعة (آخر عملية: ${delta}).`,
      details: "قد يكون هناك استغلال لطريقة منح النقاط (تكرار ألعاب/إعلانات/مهام بسرعة غير طبيعية).",
      evidence: { reason, delta, hourEarned, hourSpent, requestId: requestId || null },
    });
  }

  if (
    delta < 0 &&
    (Math.abs(delta) >= RISK_THRESHOLDS.CHILD_POINTS_SPEND_DELTA_MEDIUM || hourSpent >= RISK_THRESHOLDS.CHILD_POINTS_SPEND_HOURLY_MEDIUM)
  ) {
    await createAndNotify({
      parentId: link?.parentId || null,
      childId,
      targetType: "child",
      targetId: childId,
      riskType: "child_points_spending_spike",
      severity: "medium",
      riskScore: 72,
      title: "إنفاق نقاط الطفل مرتفع",
      summary: `الطفل ${childInfo.name} أنفق ${hourSpent} نقطة خلال ساعة (آخر خصم: ${Math.abs(delta)}).`,
      details: "قد يشير ذلك إلى عمليات شراء/خصم متسارعة تحتاج مراجعة للتأكد من سلامة استخدام الحساب.",
      evidence: { reason, delta, hourEarned, hourSpent, requestId: requestId || null },
    });
  }
}

export async function monitorReferralReward(input: { referrerParentId: string; referredParentId?: string | null; rewardPoints: number; source: string }) {
  const { referrerParentId, referredParentId, rewardPoints, source } = input;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [dailyRefCountRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(referrals)
    .where(and(eq(referrals.referrerId, referrerParentId), gte(referrals.referredAt, oneDayAgo)));

  const [codeStats] = await db
    .select({
      totalReferrals: parentReferralCodes.totalReferrals,
      totalPointsEarned: parentReferralCodes.totalPointsEarned,
    })
    .from(parentReferralCodes)
    .where(eq(parentReferralCodes.parentId, referrerParentId))
    .limit(1);

  const dailyReferrals = Number(dailyRefCountRow?.count || 0);
  const totalPointsEarned = Number(codeStats?.totalPointsEarned || 0);

  if (
    dailyReferrals >= RISK_THRESHOLDS.REFERRAL_HIGH_DAILY_COUNT ||
    rewardPoints >= RISK_THRESHOLDS.REFERRAL_HIGH_REWARD_POINTS
  ) {
    await createAndNotify({
      parentId: referrerParentId,
      targetType: "referral",
      targetId: referrerParentId,
      riskType: "referral_abuse_pattern",
      severity: "high",
      riskScore: 90,
      title: "نمط إحالات مشبوه",
      summary: `تم رصد ${dailyReferrals} إحالات خلال 24 ساعة مع مكافأة ${rewardPoints} نقطة.`,
      details: "قد يشير إلى إنشاء حسابات متعددة بغرض جمع نقاط الإحالة بشكل احتيالي.",
      evidence: { source, rewardPoints, dailyReferrals, totalPointsEarned, referredParentId: referredParentId || null },
    });
  }
}

export async function monitorPaymentCallbackRejection(input: {
  provider: string;
  purchaseId?: string | null;
  parentId?: string | null;
  reason: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const provider = String(input.provider || "unknown").toLowerCase();
  const targetId = input.parentId || (input.purchaseId ? `purchase:${input.purchaseId}` : `provider:${provider}`);

  await createAndNotify({
    parentId: input.parentId || null,
    targetType: "parent",
    targetId,
    riskType: "payment_callback_rejected",
    severity: "high",
    riskScore: 93,
    title: "رفض Callback مدفوعات غير موثّق",
    summary: `تم رفض callback للمزود ${provider} بسبب فشل التحقق الأمني.`,
    details: "تم إيقاف تحديث حالة الدفع لحماية النظام من تزوير أو إعادة إرسال callback غير موثّق.",
    evidence: {
      provider,
      purchaseId: input.purchaseId || null,
      reason: input.reason,
      ip: input.ip || null,
      userAgent: input.userAgent || null,
    },
  });
}
