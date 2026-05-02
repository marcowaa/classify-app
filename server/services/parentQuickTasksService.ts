import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import {
  childGameAssignments,
  children,
  deposits,
  gifts,
  parentChild,
  parentNotificationPreferences,
  parentPosts,
  parentQuickTaskCompletions,
  parentQuickTasks,
  parentPushSubscriptions,
  parentWallet,
  parents,
  products,
  storeOrders,
  tasks,
  type ParentQuickTask,
} from "../../shared/schema";

export type ParentQuickVerificationKey =
  | "LINK_FIRST_CHILD"
  | "LINK_SECOND_CHILD"
  | "COMPLETE_PARENT_PROFILE"
  | "ADD_CHILD_PROFILE_DETAILS"
  | "CREATE_FIRST_TASK"
  | "CREATE_THREE_TASKS"
  | "ADD_FIRST_PRODUCT"
  | "REQUEST_FIRST_DEPOSIT"
  | "PLACE_FIRST_STORE_ORDER"
  | "SEND_FIRST_GIFT"
  | "ASSIGN_FIRST_GAME"
  | "CREATE_FIRST_PARENT_POST"
  | "ENABLE_PARENT_NOTIFICATIONS"
  | "ADD_FIRST_CHILD_SHIPPING_ADDRESS"
  | "SETUP_PARENT_PUSH";

type ParentQuickTemplate = {
  code: string;
  title: string;
  description: string;
  verificationKey: ParentQuickVerificationKey;
  rewardPoints: number;
  sortOrder: number;
};

export const PARENT_QUICK_TASK_CATALOG: ParentQuickTemplate[] = [
  {
    code: "link-first-child",
    title: "ربط أول طفل بالحساب",
    description: "أضف أول طفل في إدارة الأسرة حتى تفعيل تجربة الأب الكاملة.",
    verificationKey: "LINK_FIRST_CHILD",
    rewardPoints: 30,
    sortOrder: 1,
  },
  {
    code: "link-second-child",
    title: "ربط طفل ثان",
    description: "اربط طفلًا إضافيًا لتفعيل إدارة عائلية أوسع.",
    verificationKey: "LINK_SECOND_CHILD",
    rewardPoints: 40,
    sortOrder: 2,
  },
  {
    code: "complete-parent-profile",
    title: "إكمال ملف الأب",
    description: "أضف صورة أو نبذة أو المدينة/المحافظة في الملف الشخصي.",
    verificationKey: "COMPLETE_PARENT_PROFILE",
    rewardPoints: 20,
    sortOrder: 3,
  },
  {
    code: "add-child-profile-details",
    title: "إضافة تفاصيل لملف طفل",
    description: "أدخل مدرسة أو صفًا دراسيًا أو هوايات لأحد الأطفال.",
    verificationKey: "ADD_CHILD_PROFILE_DETAILS",
    rewardPoints: 20,
    sortOrder: 4,
  },
  {
    code: "create-first-task",
    title: "إنشاء أول مهمة تعليمية",
    description: "أنشئ مهمة واحدة على الأقل من لوحة الأب.",
    verificationKey: "CREATE_FIRST_TASK",
    rewardPoints: 25,
    sortOrder: 5,
  },
  {
    code: "create-three-tasks",
    title: "إنشاء 3 مهام",
    description: "أكمل إنشاء 3 مهام أو أكثر للأطفال.",
    verificationKey: "CREATE_THREE_TASKS",
    rewardPoints: 35,
    sortOrder: 6,
  },
  {
    code: "add-first-product",
    title: "إضافة أول منتج",
    description: "أضف منتجك الأول ضمن متجر الأب.",
    verificationKey: "ADD_FIRST_PRODUCT",
    rewardPoints: 25,
    sortOrder: 7,
  },
  {
    code: "request-first-deposit",
    title: "طلب أول إيداع",
    description: "قدّم أول طلب شحن للمحفظة.",
    verificationKey: "REQUEST_FIRST_DEPOSIT",
    rewardPoints: 20,
    sortOrder: 8,
  },
  {
    code: "place-first-store-order",
    title: "إجراء أول طلب متجر",
    description: "أنشئ أول عملية شراء من متجر المنصة.",
    verificationKey: "PLACE_FIRST_STORE_ORDER",
    rewardPoints: 30,
    sortOrder: 9,
  },
  {
    code: "send-first-gift",
    title: "إرسال أول هدية",
    description: "أرسل هدية لطفلك مرتبطة بنقاط الإنجاز.",
    verificationKey: "SEND_FIRST_GIFT",
    rewardPoints: 30,
    sortOrder: 10,
  },
  {
    code: "assign-first-game",
    title: "تعيين أول لعبة",
    description: "فعّل لعبة لطفل واحد على الأقل.",
    verificationKey: "ASSIGN_FIRST_GAME",
    rewardPoints: 20,
    sortOrder: 11,
  },
  {
    code: "create-first-parent-post",
    title: "نشر أول منشور",
    description: "أنشئ منشورك الأول في مجتمع الآباء.",
    verificationKey: "CREATE_FIRST_PARENT_POST",
    rewardPoints: 20,
    sortOrder: 12,
  },
  {
    code: "enable-parent-notifications",
    title: "تفعيل تفضيلات الإشعارات",
    description: "احفظ إعدادات إشعارات الأب مرة واحدة على الأقل.",
    verificationKey: "ENABLE_PARENT_NOTIFICATIONS",
    rewardPoints: 15,
    sortOrder: 13,
  },
  {
    code: "add-first-child-shipping-address",
    title: "إضافة عنوان شحن لطفل",
    description: "أدخل عنوان شحن لطفل واحد على الأقل.",
    verificationKey: "ADD_FIRST_CHILD_SHIPPING_ADDRESS",
    rewardPoints: 20,
    sortOrder: 14,
  },
  {
    code: "setup-parent-push",
    title: "تفعيل استقبال إشعارات الجهاز",
    description: "قم بربط جهاز واحد على الأقل لاستلام إشعارات الأب.",
    verificationKey: "SETUP_PARENT_PUSH",
    rewardPoints: 15,
    sortOrder: 15,
  },
];

export function isParentQuickVerificationKey(value: string): value is ParentQuickVerificationKey {
  return PARENT_QUICK_TASK_CATALOG.some((item) => item.verificationKey === value);
}

export function getParentQuickVerificationOptions() {
  return PARENT_QUICK_TASK_CATALOG.map((item) => ({
    code: item.code,
    title: item.title,
    description: item.description,
    verificationKey: item.verificationKey,
    defaultRewardPoints: item.rewardPoints,
  }));
}

export async function ensureParentQuickTasksSeeded(db: any, adminId?: string | null) {
  const existing = await db.select().from(parentQuickTasks);
  const existingByCode = new Map(existing.map((row: ParentQuickTask) => [row.code, row]));

  const inserts = PARENT_QUICK_TASK_CATALOG
    .filter((item) => !existingByCode.has(item.code))
    .map((item) => ({
      code: item.code,
      title: item.title,
      description: item.description,
      verificationKey: item.verificationKey,
      rewardPoints: item.rewardPoints,
      sortOrder: item.sortOrder,
      isActive: true,
      createdByAdminId: adminId || null,
    }));

  if (inserts.length > 0) {
    await db.insert(parentQuickTasks).values(inserts);
  }
}

type VerificationResult = {
  matched: boolean;
  metadata?: Record<string, any>;
};

export async function verifyParentQuickTask(params: {
  db: any;
  parentId: string;
  verificationKey: ParentQuickVerificationKey;
}): Promise<VerificationResult> {
  const { db, parentId, verificationKey } = params;

  if (verificationKey === "LINK_FIRST_CHILD") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parentChild)
      .where(eq(parentChild.parentId, parentId));
    const linkedChildren = Number(rows[0]?.count || 0);
    return { matched: linkedChildren >= 1, metadata: { linkedChildren } };
  }

  if (verificationKey === "LINK_SECOND_CHILD") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parentChild)
      .where(eq(parentChild.parentId, parentId));
    const linkedChildren = Number(rows[0]?.count || 0);
    return { matched: linkedChildren >= 2, metadata: { linkedChildren } };
  }

  if (verificationKey === "COMPLETE_PARENT_PROFILE") {
    const rows = await db
      .select({
        avatarUrl: parents.avatarUrl,
        bio: parents.bio,
        city: parents.city,
        governorate: parents.governorate,
      })
      .from(parents)
      .where(eq(parents.id, parentId))
      .limit(1);

    const row = rows[0];
    if (!row) return { matched: false };

    const hasProfileData = Boolean(
      String(row.avatarUrl || "").trim() ||
      String(row.bio || "").trim() ||
      String(row.city || "").trim() ||
      String(row.governorate || "").trim()
    );

    return { matched: hasProfileData };
  }

  if (verificationKey === "ADD_CHILD_PROFILE_DETAILS") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parentChild)
      .innerJoin(children, eq(children.id, parentChild.childId))
      .where(
        and(
          eq(parentChild.parentId, parentId),
          or(
            isNotNull(children.schoolName),
            isNotNull(children.academicGrade),
            isNotNull(children.hobbies)
          )
        )
      );

    const count = Number(rows[0]?.count || 0);
    return { matched: count > 0, metadata: { childrenWithDetails: count } };
  }

  if (verificationKey === "CREATE_FIRST_TASK") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(eq(tasks.parentId, parentId));
    const count = Number(rows[0]?.count || 0);
    return { matched: count >= 1, metadata: { tasksCreated: count } };
  }

  if (verificationKey === "CREATE_THREE_TASKS") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(eq(tasks.parentId, parentId));
    const count = Number(rows[0]?.count || 0);
    return { matched: count >= 3, metadata: { tasksCreated: count } };
  }

  if (verificationKey === "ADD_FIRST_PRODUCT") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.parentId, parentId));
    const count = Number(rows[0]?.count || 0);
    return { matched: count >= 1, metadata: { productsCreated: count } };
  }

  if (verificationKey === "REQUEST_FIRST_DEPOSIT") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(deposits)
      .where(eq(deposits.parentId, parentId));
    const count = Number(rows[0]?.count || 0);
    return { matched: count >= 1, metadata: { depositRequests: count } };
  }

  if (verificationKey === "PLACE_FIRST_STORE_ORDER") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeOrders)
      .where(eq(storeOrders.parentId, parentId));
    const count = Number(rows[0]?.count || 0);
    return { matched: count >= 1, metadata: { storeOrders: count } };
  }

  if (verificationKey === "SEND_FIRST_GIFT") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gifts)
      .where(eq(gifts.parentId, parentId));
    const count = Number(rows[0]?.count || 0);
    return { matched: count >= 1, metadata: { giftsSent: count } };
  }

  if (verificationKey === "ASSIGN_FIRST_GAME") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parentChild)
      .innerJoin(children, eq(children.id, parentChild.childId))
      .innerJoin(childGameAssignments, eq(childGameAssignments.childId, children.id))
      .where(eq(parentChild.parentId, parentId));
    const count = Number(rows[0]?.count || 0);
    return { matched: count >= 1, metadata: { gameAssignments: count } };
  }

  if (verificationKey === "CREATE_FIRST_PARENT_POST") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parentPosts)
      .where(eq(parentPosts.parentId, parentId));
    const count = Number(rows[0]?.count || 0);
    return { matched: count >= 1, metadata: { parentPosts: count } };
  }

  if (verificationKey === "ENABLE_PARENT_NOTIFICATIONS") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parentNotificationPreferences)
      .where(eq(parentNotificationPreferences.parentId, parentId));
    const count = Number(rows[0]?.count || 0);
    return { matched: count >= 1, metadata: { preferencesSaved: count } };
  }

  if (verificationKey === "ADD_FIRST_CHILD_SHIPPING_ADDRESS") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parentChild)
      .innerJoin(children, eq(children.id, parentChild.childId))
      .where(
        and(
          eq(parentChild.parentId, parentId),
          isNotNull(children.shippingAddress)
        )
      );

    const count = Number(rows[0]?.count || 0);
    return { matched: count >= 1, metadata: { childrenWithShippingAddress: count } };
  }

  if (verificationKey === "SETUP_PARENT_PUSH") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parentPushSubscriptions)
      .where(
        and(
          eq(parentPushSubscriptions.parentId, parentId),
          eq(parentPushSubscriptions.isActive, true)
        )
      );
    const count = Number(rows[0]?.count || 0);
    return { matched: count >= 1, metadata: { activePushSubscriptions: count } };
  }

  return { matched: false };
}

export async function awardParentQuickTaskIfQualified(params: {
  db: any;
  parentId: string;
  taskId: string;
  verificationKey: ParentQuickVerificationKey;
  rewardPoints: number;
  metadata?: Record<string, any>;
}) {
  const { db, parentId, taskId, verificationKey, rewardPoints, metadata } = params;

  if (rewardPoints <= 0) {
    return { awarded: false, reason: "non_positive_reward" as const };
  }

  const existingCompletion = await db
    .select({ id: parentQuickTaskCompletions.id })
    .from(parentQuickTaskCompletions)
    .where(
      and(
        eq(parentQuickTaskCompletions.parentId, parentId),
        eq(parentQuickTaskCompletions.taskId, taskId)
      )
    )
    .limit(1);

  if (existingCompletion[0]) {
    return { awarded: false, reason: "already_completed" as const };
  }

  await db.transaction(async (tx: any) => {
    const locked = await tx.execute(sql`
      SELECT id, balance
      FROM parent_wallet
      WHERE parent_id = ${parentId}
      FOR UPDATE
    `);

    const walletRow = locked.rows?.[0];

    if (!walletRow) {
      await tx.insert(parentWallet).values({
        parentId,
        balance: String(rewardPoints),
      });
    } else {
      await tx
        .update(parentWallet)
        .set({
          balance: sql`${parentWallet.balance} + ${rewardPoints}`,
          updatedAt: new Date(),
        })
        .where(eq(parentWallet.parentId, parentId));
    }

    await tx.insert(parentQuickTaskCompletions).values({
      parentId,
      taskId,
      verificationKey,
      awardedPoints: rewardPoints,
      verificationMetadata: metadata || {},
    });
  });

  return { awarded: true, reason: "awarded" as const };
}

export function normalizeRewardPoints(value: unknown, fallback = 10): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const asInt = Math.trunc(parsed);
  return Math.max(1, Math.min(100000, asInt));
}
