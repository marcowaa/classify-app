import type { Express } from "express";
import { storage } from "../storage";
import {
  parents,
  referrals,
  parentReferralCodes,
  parentWallet,
  ads,
  adShares,
  referralSettings,
} from "../../shared/schema";
import { eq, sql, and, or, isNull } from "drizzle-orm";
import { authMiddleware } from "./middleware";
import { createNotification } from "../notifications";
import { NOTIFICATION_TYPES } from "../../shared/notificationTypes";
import { monitorReferralReward } from "../services/riskMonitor";
import crypto from "crypto";

const db = storage.db;

function generateReferralCode(length: number = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[crypto.randomInt(0, chars.length)] || "A").join("");
}

const DEFAULT_REFERRAL_POINTS = 100;
const DEFAULT_AD_SHARE_POINTS = 10;

type ReferralProgramSettings = {
  isActive: boolean;
  pointsPerReferral: number;
  pointsPerAdShare: number;
  minActiveDays: number;
};

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

async function loadReferralProgramSettings(executor: any): Promise<ReferralProgramSettings> {
  const settingsRows = await executor.select().from(referralSettings).limit(1);
  const settings = settingsRows[0];
  return {
    isActive: settings?.isActive !== false,
    pointsPerReferral: toNonNegativeInteger(settings?.pointsPerReferral, DEFAULT_REFERRAL_POINTS),
    pointsPerAdShare: toNonNegativeInteger(settings?.pointsPerAdShare, DEFAULT_AD_SHARE_POINTS),
    minActiveDays: toNonNegativeInteger(settings?.minActiveDays, 0),
  };
}

export async function registerReferralRoutes(app: Express) {
  app.get("/api/parent/referral-code", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;

      const existing = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.parentId, parentId));

      if (existing[0]) {
        return res.json({
          success: true,
          data: existing[0],
          shareLink: `${process.env.REPLIT_DEV_DOMAIN || 'https://classify.app'}/register?ref=${existing[0].code}`
        });
      }

      let code = generateReferralCode();
      let attempts = 0;
      while (attempts < 10) {
        const checkCode = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.code, code));
        if (!checkCode[0]) break;
        code = generateReferralCode();
        attempts++;
      }

      const [newCode] = await db.insert(parentReferralCodes).values({
        parentId,
        code,
      }).returning();

      res.json({
        success: true,
        data: newCode,
        shareLink: `${process.env.REPLIT_DEV_DOMAIN || 'https://classify.app'}/register?ref=${newCode.code}`
      });
    } catch (error: any) {
      console.error("Get referral code error:", error);
      res.status(500).json({ message: "Failed to get referral code" });
    }
  });

  app.get("/api/parent/referrals", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;

      const myReferrals = await db
        .select({
          id: referrals.id,
          referredId: referrals.referredId,
          status: referrals.status,
          pointsAwarded: referrals.pointsAwarded,
          referredAt: referrals.referredAt,
          activatedAt: referrals.activatedAt,
          referredName: parents.name,
        })
        .from(referrals)
        .leftJoin(parents, eq(referrals.referredId, parents.id))
        .where(eq(referrals.referrerId, parentId));

      const codeInfo = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.parentId, parentId));

      res.json({
        success: true,
        data: {
          referrals: myReferrals,
          stats: codeInfo[0] || { totalReferrals: 0, activeReferrals: 0, totalPointsEarned: 0 },
        }
      });
    } catch (error: any) {
      console.error("Get referrals error:", error);
      res.status(500).json({ message: "Failed to get referrals" });
    }
  });

  app.post("/api/referrals/apply", authMiddleware, async (req: any, res) => {
    try {
      const { referralCode } = req.body;
      const newParentId = req.user?.parentId || req.user?.userId;

      const referralProgram = await loadReferralProgramSettings(db);
      if (!referralProgram.isActive) {
        return res.status(403).json({ message: "Referral program is currently disabled" });
      }

      if (!referralCode || !newParentId) {
        return res.status(400).json({ message: "Referral code is required" });
      }

      const codeRecord = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.code, referralCode.toUpperCase()));
      if (!codeRecord[0]) {
        return res.status(404).json({ message: "Invalid referral code" });
      }

      const referrerId = codeRecord[0].parentId;

      if (referrerId === newParentId) {
        return res.status(400).json({ message: "Cannot use your own referral code" });
      }

      const existingReferral = await db.select().from(referrals).where(eq(referrals.referredId, newParentId));
      if (existingReferral[0]) {
        return res.status(400).json({ message: "Referral already applied" });
      }

      const [referral] = await db.insert(referrals).values({
        referrerId,
        referredId: newParentId,
        referralCode: referralCode.toUpperCase(),
        status: "pending",
      }).returning();

      await db.update(parentReferralCodes)
        .set({ totalReferrals: sql`${parentReferralCodes.totalReferrals} + 1` })
        .where(eq(parentReferralCodes.parentId, referrerId));

      await createNotification({
        parentId: referrerId,
        type: NOTIFICATION_TYPES.NEW_REFERRAL,
        title: "إحالة جديدة!",
        message: "لديك إحالة جديدة في انتظار التفعيل!",
        relatedId: referral.id,
      });

      res.json({ success: true, message: "Referral code applied successfully" });
    } catch (error: any) {
      console.error("Apply referral error:", error);
      res.status(500).json({ message: "Failed to apply referral" });
    }
  });

  app.post("/api/referrals/activate", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;

      // All referral activation in a single transaction to prevent double-reward
      const result = await db.transaction(async (tx: any) => {
        const referralProgram = await loadReferralProgramSettings(tx);
        if (!referralProgram.isActive) {
          throw new Error("REFERRAL_DISABLED");
        }

        if (referralProgram.minActiveDays > 0) {
          const referredParent = await tx
            .select({ createdAt: parents.createdAt })
            .from(parents)
            .where(eq(parents.id, parentId))
            .limit(1);

          if (!referredParent[0]?.createdAt) {
            throw new Error("PARENT_NOT_FOUND");
          }

          const eligibleAt = new Date(referredParent[0].createdAt);
          eligibleAt.setDate(eligibleAt.getDate() + referralProgram.minActiveDays);
          if (Date.now() < eligibleAt.getTime()) {
            const remainingMs = eligibleAt.getTime() - Date.now();
            const remainingDays = Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
            throw new Error(`MIN_ACTIVE_DAYS_NOT_MET:${remainingDays}`);
          }
        }

        // Lock the referral row with FOR UPDATE
        const pendingReferral = await tx.select().from(referrals)
          .where(eq(referrals.referredId, parentId))
          .for("update");

        if (!pendingReferral[0] || pendingReferral[0].status !== "pending") {
          throw new Error("NO_PENDING_REFERRAL");
        }

        const referral = pendingReferral[0];

        const rewardPoints = referralProgram.pointsPerReferral;

        await tx.update(referrals)
          .set({
            status: "active",
            activatedAt: new Date()
          })
          .where(eq(referrals.id, referral.id));

        await tx.update(parentReferralCodes)
          .set({ activeReferrals: sql`${parentReferralCodes.activeReferrals} + 1` })
          .where(eq(parentReferralCodes.parentId, referral.referrerId));

        const wallet = await tx.select().from(parentWallet).where(eq(parentWallet.parentId, referral.referrerId));
        if (wallet[0]) {
          await tx.update(parentWallet)
            .set({
              balance: sql`${parentWallet.balance} + ${rewardPoints}`,
              updatedAt: new Date()
            })
            .where(eq(parentWallet.parentId, referral.referrerId));
        } else {
          await tx.insert(parentWallet).values({
            parentId: referral.referrerId,
            balance: rewardPoints.toString(),
          });
        }

        await tx.update(referrals)
          .set({
            status: "rewarded",
            pointsAwarded: rewardPoints,
            rewardedAt: new Date()
          })
          .where(eq(referrals.id, referral.id));

        await tx.update(parentReferralCodes)
          .set({ totalPointsEarned: sql`${parentReferralCodes.totalPointsEarned} + ${rewardPoints}` })
          .where(eq(parentReferralCodes.parentId, referral.referrerId));

        return { referral, rewardPoints };
      });

      await createNotification({
        parentId: result.referral.referrerId,
        type: NOTIFICATION_TYPES.REFERRAL_REWARD,
        title: "مكافأة الإحالة!",
        message: `تهانينا! حصلت على ${result.rewardPoints} نقطة كمكافأة للإحالة الناجحة!`,
        relatedId: result.referral.id,
      });

      void monitorReferralReward({
        referrerParentId: result.referral.referrerId,
        referredParentId: result.referral.referredId,
        rewardPoints: result.rewardPoints,
        source: "referrals_activate",
      }).catch((error: any) => {
        console.error("Risk monitor (referral activate) failed:", error?.message || error);
      });

      res.json({
        success: true,
        message: `Referral activated! Referrer received ${result.rewardPoints} points.`
      });
    } catch (error: any) {
      if (error.message === "NO_PENDING_REFERRAL") {
        return res.status(404).json({ message: "No pending referral found" });
      }
      if (error.message === "REFERRAL_DISABLED") {
        return res.status(403).json({ message: "Referral program is currently disabled" });
      }
      if (error.message === "PARENT_NOT_FOUND") {
        return res.status(404).json({ message: "Parent account not found" });
      }
      if (typeof error.message === "string" && error.message.startsWith("MIN_ACTIVE_DAYS_NOT_MET:")) {
        const remainingDays = Number(error.message.split(":")[1] || "1");
        return res.status(400).json({ message: `Referral activation requires ${remainingDays} more day(s)` });
      }
      console.error("Activate referral error:", error);
      res.status(500).json({ message: "Failed to activate referral" });
    }
  });

  // ===== Parent Ads (for referral section) =====

  // Get active ads for parent to view and share
  app.get("/api/parent/ads", authMiddleware, async (req: any, res) => {
    try {
      const now = new Date();
      const activeAds = await db.select().from(ads)
        .where(and(
          eq(ads.isActive, true),
          or(isNull(ads.startDate), sql`${ads.startDate} <= ${now}`),
          or(isNull(ads.endDate), sql`${ads.endDate} >= ${now}`),
          or(eq(ads.targetAudience, "all"), eq(ads.targetAudience, "parents"))
        ));

      // Get share counts for this parent
      const parentId = req.user?.parentId || req.user?.userId;
      const shares = await db.select({
        adId: adShares.adId,
        shareCount: sql<number>`count(*)`,
        totalPoints: sql<number>`COALESCE(sum(${adShares.pointsAwarded}), 0)`,
      })
        .from(adShares)
        .where(eq(adShares.parentId, parentId))
        .groupBy(adShares.adId);

      const shareMap: Record<string, { shareCount: number; totalPoints: number }> = {};
      for (const s of shares) {
        shareMap[s.adId] = { shareCount: Number(s.shareCount), totalPoints: Number(s.totalPoints) };
      }

      const adsWithShares = activeAds.map((ad: any) => ({
        ...ad,
        myShares: shareMap[ad.id]?.shareCount || 0,
        mySharePoints: shareMap[ad.id]?.totalPoints || 0,
      }));

      res.json({ success: true, data: adsWithShares });
    } catch (error: any) {
      console.error("Get parent ads error:", error);
      res.status(500).json({ message: "Failed to get ads" });
    }
  });

  // Track parent ad share + award points
  app.post("/api/parent/ads/:id/share", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;
      const { id } = req.params;
      const { platform } = req.body;

      if (!platform) {
        return res.status(400).json({ message: "Platform is required" });
      }

      const referralProgram = await loadReferralProgramSettings(db);
      if (!referralProgram.isActive) {
        return res.status(403).json({ message: "Referral program is currently disabled" });
      }

      const pointsPerShare = referralProgram.pointsPerAdShare;

      // Record share
      await db.insert(adShares).values({
        adId: id,
        parentId,
        platform,
        pointsAwarded: pointsPerShare,
      });

      // Award points
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
      if (wallet[0]) {
        await db.update(parentWallet)
          .set({ balance: sql`${parentWallet.balance} + ${pointsPerShare}`, updatedAt: new Date() })
          .where(eq(parentWallet.parentId, parentId));
      } else {
        await db.insert(parentWallet).values({ parentId, balance: pointsPerShare.toString() });
      }

      res.json({ success: true, data: { pointsAwarded: pointsPerShare } });
    } catch (error: any) {
      console.error("Share ad error:", error);
      res.status(500).json({ message: "Failed to track share" });
    }
  });

  // Get parent's referral stats including ads sharing summary
  app.get("/api/parent/referral-stats", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;

      // Referral code info — auto-create if missing
      let codeInfo = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.parentId, parentId));

      if (!codeInfo[0]) {
        let code = generateReferralCode();
        let attempts = 0;
        while (attempts < 10) {
          const checkCode = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.code, code));
          if (!checkCode[0]) break;
          code = generateReferralCode();
          attempts++;
        }
        const [newCode] = await db.insert(parentReferralCodes).values({
          parentId,
          code,
        }).returning();
        codeInfo = [newCode];
      }

      // Get referral settings
      const settingsRows = await db.select().from(referralSettings);
      const settingsData = settingsRows[0] || { pointsPerReferral: 100, pointsPerAdShare: 10 };

      // Get total ad share points
      const shareStats = await db.select({
        totalShares: sql<number>`count(*)`,
        totalSharePoints: sql<number>`COALESCE(sum(${adShares.pointsAwarded}), 0)`,
      })
        .from(adShares)
        .where(eq(adShares.parentId, parentId));

      // Build share link
      const code = codeInfo[0]?.code;
      const baseUrl = process.env.APP_URL || process.env.REPLIT_DEV_DOMAIN || 'https://classi-fy.com';
      const shareLink = code ? `${baseUrl}/register?ref=${code}` : null;

      res.json({
        success: true,
        data: {
          referralCode: code || null,
          shareLink,
          totalReferrals: codeInfo[0]?.totalReferrals || 0,
          activeReferrals: codeInfo[0]?.activeReferrals || 0,
          pointsEarned: codeInfo[0]?.totalPointsEarned || 0,
          totalAdShares: Number(shareStats[0]?.totalShares || 0),
          totalAdSharePoints: Number(shareStats[0]?.totalSharePoints || 0),
          settings: {
            pointsPerReferral: settingsData.pointsPerReferral,
            pointsPerAdShare: settingsData.pointsPerAdShare,
          },
        },
      });
    } catch (error: any) {
      console.error("Get referral stats error:", error);
      res.status(500).json({ message: "Failed to get referral stats" });
    }
  });
}
