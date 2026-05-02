import { isNotNull, isNull, sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json, jsonb, decimal, inet, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// إعدادات التطبيق العامة
export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// إعدادات المكافآت
export const rewardsSettings = pgTable("rewards_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pointsPerTask: integer("points_per_task").default(10).notNull(),
  dailyLimit: integer("daily_limit").default(100).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// إعدادات المهام
export const tasksSettings = pgTable("tasks_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  maxTasksPerDay: integer("max_tasks_per_day").default(10).notNull(),
  allowCustomTasks: boolean("allow_custom_tasks").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// مهام البدء السريع للآباء (يديرها الأدمن)
export const parentQuickTasks = pgTable("parent_quick_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 80 }).notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  verificationKey: varchar("verification_key", { length: 80 }).notNull(),
  rewardPoints: integer("reward_points").default(10).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdByAdminId: varchar("created_by_admin_id").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const parentQuickTaskCompletions = pgTable("parent_quick_task_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").notNull().references(() => parentQuickTasks.id, { onDelete: "cascade" }),
  verificationKey: varchar("verification_key", { length: 80 }).notNull(),
  awardedPoints: integer("awarded_points").default(0).notNull(),
  verificationMetadata: jsonb("verification_metadata"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => ({
  uniqueParentTaskCompletion: uniqueIndex("parent_quick_task_completion_parent_task_uq").on(table.parentId, table.taskId),
  parentCompletedIdx: index("parent_quick_task_completion_parent_completed_idx").on(table.parentId, table.completedAt),
}));

// إعدادات إشعارات المهام (افتراضي عام)
export const taskNotificationGlobalPolicy = pgTable("task_notification_global_policy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  levelDefault: integer("level_default").default(3).notNull(), // 1..4
  repeatIntervalMinutes: integer("repeat_interval_minutes").default(5).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  escalationEnabled: boolean("escalation_enabled").default(false).notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // HH:mm
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // HH:mm
  channelsJson: json("channels_json")
    .$type<{ inApp: boolean; webPush: boolean; mobilePush: boolean; parentEscalation: boolean }>()
    .default(sql`'{"inApp":true,"webPush":true,"mobilePush":true,"parentEscalation":false}'::jsonb`)
    .notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// إعدادات إشعارات المهام لكل طفل (Override)
export const taskNotificationChildPolicy = pgTable("task_notification_child_policy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().unique().references(() => children.id, { onDelete: "cascade" }),
  level: integer("level").notNull(), // 1..4
  repeatIntervalMinutes: integer("repeat_interval_minutes").notNull(),
  maxRetries: integer("max_retries").notNull(),
  escalationEnabled: boolean("escalation_enabled").notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),
  channelsJson: json("channels_json")
    .$type<{ inApp: boolean; webPush: boolean; mobilePush: boolean; parentEscalation: boolean }>()
    .notNull(),
  isOverride: boolean("is_override").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// إعدادات المتجر
export const storeSettings = pgTable("store_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeEnabled: boolean("store_enabled").default(true).notNull(),
  minPointsToBuy: integer("min_points_to_buy").default(10).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// إعدادات الإشعارات
export const notificationSettings = pgTable("notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enablePush: boolean("enable_push").default(true).notNull(),
  enableEmail: boolean("enable_email").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// إعدادات الدفع
export const paymentSettings = pgTable("payment_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentEnabled: boolean("payment_enabled").default(false).notNull(),
  gateway: varchar("gateway", { length: 50 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// مكتبة الرموز
export const symbols = pgTable("symbols", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  emoji: text("emoji"),
  imageUrl: text("image_url"),
  category: varchar("category", { length: 50 }).default("general").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const parents = pgTable("parents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  gender: varchar("gender", { length: 10 }), // male | female
  phoneNumber: text("phone_number"),
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  smsVerified: boolean("sms_verified").default(false).notNull(),
  uniqueCode: varchar("unique_code", { length: 10 }).notNull().unique(),
  qrCode: text("qr_code"),
  taskBgColor: varchar("task_bg_color", { length: 7 }).default("#ffffff"),
  twoFAEnabled: boolean("two_fa_enabled").default(false).notNull(),
  privacyAccepted: boolean("privacy_accepted").default(false).notNull(),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  privacyAcceptedIp: text("privacy_accepted_ip"),
  pin: varchar("pin", { length: 255 }),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  // Social profile fields
  governorate: text("governorate"),
  city: text("city"),
  avatarUrl: text("avatar_url"),
  coverImageUrl: text("cover_image_url"),
  bio: text("bio"),
  socialLinks: json("social_links").$type<{ facebook?: string; twitter?: string; instagram?: string; youtube?: string; tiktok?: string; website?: string }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailLowerUnique: uniqueIndex("parents_email_unique_lower")
    .on(sql`LOWER(${table.email})`),
}));

export const trustedDevices = pgTable("trusted_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  deviceIdHash: text("device_id_hash").notNull(),
  deviceLabel: text("device_label").notNull(),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  userAgent: text("user_agent"),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});

export const insertTrustedDeviceSchema = createInsertSchema(trustedDevices).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export type InsertTrustedDevice = z.infer<typeof insertTrustedDeviceSchema>;
export type TrustedDevice = typeof trustedDevices.$inferSelect;

export const children = pgTable("children", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  shippingAddress: text("shipping_address"),
  avatarUrl: text("avatar_url"),
  birthday: timestamp("birthday"),
  schoolName: text("school_name"),
  academicGrade: text("academic_grade"),
  hobbies: text("hobbies"),
  governorate: text("governorate"),
  pin: varchar("pin", { length: 255 }),
  pinUpdatedAt: timestamp("pin_updated_at"),
  coverImageUrl: text("cover_image_url"),
  bio: text("bio"),
  shareCode: varchar("share_code", { length: 12 }).unique(),
  profilePublic: boolean("profile_public").default(true).notNull(),
  interests: json("interests").$type<string[]>(),
  privacyAccepted: boolean("privacy_accepted").default(false).notNull(),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  privacyAcceptedIp: text("privacy_accepted_ip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// شجرة نمو الطفل
export const childGrowthTrees = pgTable("child_growth_trees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }).unique(),
  currentStage: integer("current_stage").default(1).notNull(), // 1-8 (seed to majestic tree)
  totalGrowthPoints: integer("total_growth_points").default(0).notNull(),
  tasksCompleted: integer("tasks_completed").default(0).notNull(),
  gamesPlayed: integer("games_played").default(0).notNull(),
  rewardsEarned: integer("rewards_earned").default(0).notNull(),
  wateringsCount: integer("waterings_count").default(0).notNull(),
  lastGrowthAt: timestamp("last_growth_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChildGrowthTreeSchema = createInsertSchema(childGrowthTrees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChildGrowthTree = z.infer<typeof insertChildGrowthTreeSchema>;
export type ChildGrowthTree = typeof childGrowthTrees.$inferSelect;

// أحداث نمو الشجرة
export const childGrowthEvents = pgTable("child_growth_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // task_complete, game_played, reward_earned, daily_login, etc.
  growthPoints: integer("growth_points").default(0).notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
});

export const insertChildGrowthEventSchema = createInsertSchema(childGrowthEvents).omit({
  id: true,
  occurredAt: true,
});

export type InsertChildGrowthEvent = z.infer<typeof insertChildGrowthEventSchema>;
export type ChildGrowthEvent = typeof childGrowthEvents.$inferSelect;

// إعدادات شجرة النمو (يتحكم فيها الأدمن)
export const growthTreeSettings = pgTable("growth_tree_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Watering settings
  wateringEnabled: boolean("watering_enabled").default(true).notNull(),
  wateringCostPoints: integer("watering_cost_points").default(10).notNull(),
  wateringGrowthPoints: integer("watering_growth_points").default(15).notNull(),
  maxWateringsPerDay: integer("max_waterings_per_day").default(5).notNull(),
  // Stage icons (JSON array of 20 icon identifiers)
  stageIcons: json("stage_icons").$type<string[]>().default(sql`'["seed","sprout","sapling","youngPlant","bush","smallTree","growingTree","mediumTree","tallTree","strongTree","largeTree","matureTree","fruitTree","grandTree","ancientTree","goldenTree","crystalTree","diamondTree","legendaryTree","cosmicTree"]'::jsonb`).notNull(),
  // Stage requirements override (JSON: array of { stage, minPoints, requiresWatering, wateringsRequired })
  stageRequirements: json("stage_requirements").$type<{ stage: number; minPoints: number; requiresWatering: boolean; wateringsRequired: number }[]>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GrowthTreeSettings = typeof growthTreeSettings.$inferSelect;

// سجل ري شجرة النمو
export const childWateringLog = pgTable("child_watering_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  pointsSpent: integer("points_spent").default(0).notNull(),
  growthPointsEarned: integer("growth_points_earned").default(0).notNull(),
  wateredAt: timestamp("watered_at").defaultNow().notNull(),
});

export type ChildWateringLog = typeof childWateringLog.$inferSelect;

export const childTrustedDevices = pgTable("child_trusted_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  deviceIdHash: text("device_id_hash").notNull(),
  deviceLabel: text("device_label").notNull(),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  userAgent: text("user_agent"),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});

export const insertChildTrustedDeviceSchema = createInsertSchema(childTrustedDevices).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export type InsertChildTrustedDevice = z.infer<typeof insertChildTrustedDeviceSchema>;
export type ChildTrustedDevice = typeof childTrustedDevices.$inferSelect;

export const pointAdjustments = pgTable("point_adjustments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetType: varchar("target_type", { length: 20 }).notNull(),
  targetId: varchar("target_id").notNull(),
  adminId: varchar("admin_id").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPointAdjustmentSchema = createInsertSchema(pointAdjustments).omit({
  id: true,
  createdAt: true,
});

export type InsertPointAdjustment = z.infer<typeof insertPointAdjustmentSchema>;
export type PointAdjustment = typeof pointAdjustments.$inferSelect;

export const parentChild = pgTable("parent_child", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  relationshipRole: varchar("relationship_role", { length: 30 }).default("owner").notNull(), // owner | co_guardian | viewer
  linkSource: varchar("link_source", { length: 30 }).default("manual").notNull(), // manual | approved_request
  linkedByParentId: varchar("linked_by_parent_id").references(() => parents.id, { onDelete: "set null" }),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
}, (table) => ({
  uniqueParentChild: sql`UNIQUE (${table.parentId}, ${table.childId})`,
}));

export type TaskAnswerMedia = {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
  media?: {
    objectPath?: string;
    url: string;
    mimeType?: string;
    size?: number;
    width?: number;
    height?: number;
    purpose?: string;
    uploadedByType?: "admin" | "parent" | "teacher" | "child";
    uploadedById?: string;
    createdAt?: string;
  };
  stickerId?: string;
  stickerVariant?: "full" | "circle" | "rounded" | "diamond";
};

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").references(() => schoolTeachers.id, { onDelete: "set null" }),
  senderType: varchar("sender_type", { length: 10 }).default("parent").notNull(), // "parent" | "teacher"
  subjectId: varchar("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  imageUrl: text("image_url"),
  gifUrl: text("gif_url"),
  answers: json("answers").$type<TaskAnswerMedia[]>().notNull(),
  pointsReward: integer("points_reward").default(10).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskResults = pgTable("task_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  selectedAnswerId: varchar("selected_answer_id", { length: 50 }).notNull(),
  isCorrect: boolean("is_correct").notNull(),
  pointsEarned: integer("points_earned").default(0).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const taskCreateIdempotency = pgTable("task_create_idempotency", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  endpoint: varchar("endpoint", { length: 120 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
  requestHash: varchar("request_hash", { length: 64 }).notNull(),
  status: varchar("status", { length: 20 }).default("processing").notNull(), // processing | completed | failed
  responsePayload: jsonb("response_payload").$type<Record<string, any> | null>(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueParentEndpointKey: uniqueIndex("task_create_idempotency_parent_endpoint_key_uq").on(
    table.parentId,
    table.endpoint,
    table.idempotencyKey
  ),
  parentCreatedIdx: index("task_create_idempotency_parent_created_idx").on(table.parentId, table.createdAt),
  endpointStatusIdx: index("task_create_idempotency_endpoint_status_idx").on(table.endpoint, table.status),
}));

// Product Categories (hierarchical: main categories + subcategories)
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id"),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  namePt: text("name_pt"),
  targetAudience: varchar("target_audience", { length: 20 }).default("all").notNull(), // all | parents | children | fathers | mothers
  icon: varchar("icon", { length: 50 }).default("Package").notNull(),
  color: varchar("color", { length: 20 }).default("#667eea").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "cascade" }), // nullable: null = global product
  categoryId: varchar("category_id").references(() => productCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameI18n: json("name_i18n").$type<Record<string, string>>(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  descriptionI18n: json("description_i18n").$type<Record<string, string>>(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  pointsPrice: integer("points_price").notNull(),
  image: text("image"),
  images: json("images").$type<string[]>().default([]),
  stock: integer("stock").default(999).notNull(),
  productType: varchar("product_type", { length: 30 }).default("digital").notNull(), // digital | physical | subscription
  brand: text("brand"),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("4.5"),
  reviewCount: integer("review_count").default(0).notNull(),
  displayCountries: json("display_countries").$type<string[]>().default([]).notNull(),
  displayCurrencies: json("display_currencies").$type<string[]>().default([]).notNull(),
  moderationStatus: varchar("moderation_status", { length: 30 }).default("approved").notNull(), // approved | pending_review | rejected
  moderationReason: text("moderation_reason"),
  moderationReviewedAt: timestamp("moderation_reviewed_at"),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").default(1).notNull(),
  pointsPrice: integer("points_price").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  shippingAddress: text("shipping_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const childPurchases = pgTable("child_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  pointsSpent: integer("points_spent").notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
});

// ===== Parent purchases / owned products / assigned products =====
export const parentPurchases = pgTable("parent_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  paymentStatus: varchar("payment_status", { length: 30 }).default("pending").notNull(), // pending | paid | failed | refunded
  invoiceNumber: text("invoice_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const parentPurchaseItems = pgTable("parent_purchase_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseId: varchar("purchase_id").notNull().references(() => parentPurchases.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const parentOwnedProducts = pgTable("parent_owned_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  sourcePurchaseId: varchar("source_purchase_id").references(() => parentPurchases.id, { onDelete: "set null" }),
  status: varchar("status", { length: 40 }).default("pending_admin_approval").notNull(), // pending_admin_approval | active | assigned_to_child | exhausted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const childAssignedProducts = pgTable("child_assigned_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  parentOwnedProductId: varchar("parent_owned_product_id").notNull().references(() => parentOwnedProducts.id, { onDelete: "cascade" }),
  requiredPoints: integer("required_points").notNull(),
  progressPoints: integer("progress_points").default(0).notNull(),
  status: varchar("status", { length: 30 }).default("active").notNull(), // active | completed | shipment_requested | shipped
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  shipmentRequestedAt: timestamp("shipment_requested_at"),
  shippedAt: timestamp("shipped_at"),
});

export const shippingRequests = pgTable("shipping_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignedProductId: varchar("assigned_product_id").notNull().references(() => childAssignedProducts.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  shippingAddress: text("shipping_address"),
  status: varchar("status", { length: 30 }).default("requested").notNull(), // requested | approved | shipped | cancelled
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const flashGames = pgTable("flash_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  embedUrl: text("embed_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  category: varchar("category", { length: 50 }).default("general").notNull(),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  pointsPerPlay: integer("points_per_play").default(5).notNull(),
  maxPlaysPerDay: integer("max_plays_per_day").default(0).notNull(), // 0 = unlimited
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Child Game Assignments =====
export const childGameAssignments = pgTable("child_game_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  gameId: varchar("game_id").notNull().references(() => flashGames.id, { onDelete: "cascade" }),
  maxPlaysPerDay: integer("max_plays_per_day").default(0).notNull(), // 0 = use game default
  isActive: boolean("is_active").default(true).notNull(),
  assignedBy: varchar("assigned_by").notNull(), // admin id
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueChildGame: sql`UNIQUE (${table.childId}, ${table.gameId})`,
}));

// ===== Game Play History =====
export const gamePlayHistory = pgTable("game_play_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  gameId: varchar("game_id").notNull().references(() => flashGames.id, { onDelete: "cascade" }),
  pointsEarned: integer("points_earned").default(0).notNull(),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

export const pointsHistory = pgTable("points_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  source: varchar("source", { length: 20 }).notNull(),
  sourceId: varchar("source_id"),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const pointsLedger = pgTable("points_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }),
  pointsDelta: integer("points_delta").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reason: varchar("reason", { length: 50 }).notNull(),
  requestId: varchar("request_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const outboxEvents = pgTable("outbox_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(),
  payloadJson: json("payload_json").$type<Record<string, any>>().notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  lastError: text("last_error"),
  availableAt: timestamp("available_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
});

export const taskAttemptsSummary = pgTable("task_attempts_summary", {
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  totalAttempts: integer("total_attempts").default(0).notNull(),
  failedAttempts: integer("failed_attempts").default(0).notNull(),
  lastAttemptAt: timestamp("last_attempt_at"),
}, (table) => ({
  taskAttemptsPk: sql`PRIMARY KEY (${table.taskId}, ${table.childId})`,
}));

export const taskMonitoringCounters = pgTable("task_monitoring_counters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").references(() => children.id, { onDelete: "set null" }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }),
  metric: varchar("metric", { length: 50 }).notNull(),
  value: integer("value").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const themeSettings = pgTable("theme_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  primaryColor: varchar("primary_color", { length: 7 }).default("#67c5ab").notNull(),
  secondaryColor: varchar("secondary_color", { length: 7 }).default("#0f97ff").notNull(),
  accentColor: varchar("accent_color", { length: 7 }).default("#ff4343").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).default("superadmin").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  entity: varchar("entity", { length: 50 }).notNull(),
  entityId: varchar("entity_id"),
  meta: json("meta").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  emoji: varchar("emoji", { length: 10 }).default("📚").notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#6B4D9D").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templateTasks = pgTable("template_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  question: text("question").notNull(),
  answers: json("answers").$type<TaskAnswerMedia[]>().notNull(),
  pointsReward: integer("points_reward").default(10).notNull(),
  difficulty: varchar("difficulty", { length: 20 }).default("medium").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdByParent: boolean("created_by_parent").default(false).notNull(),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(false).notNull(),
  pointsCost: integer("points_cost").default(5).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const parentStickers = pgTable("parent_stickers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sourceImageUrl: text("source_image_url"),
  variant: varchar("variant", { length: 20 }).default("full").notNull(),
  stickerMedia: json("sticker_media").$type<{
    objectPath?: string;
    url: string;
    mimeType?: string;
    size?: number;
    width?: number;
    height?: number;
    purpose?: string;
  }>().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  parentIdx: index("parent_stickers_parent_idx").on(table.parentId),
}));

export const parentStickerUsages = pgTable("parent_sticker_usages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stickerId: varchar("sticker_id").notNull().references(() => parentStickers.id, { onDelete: "cascade" }),
  ownerParentId: varchar("owner_parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  usedByParentId: varchar("used_by_parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }),
  templateTaskId: varchar("template_task_id").references(() => templateTasks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  stickerIdx: index("parent_sticker_usages_sticker_idx").on(table.stickerId),
  ownerIdx: index("parent_sticker_usages_owner_idx").on(table.ownerParentId),
  usedByIdx: index("parent_sticker_usages_usedby_idx").on(table.usedByParentId),
  uniqueUsage: uniqueIndex("parent_sticker_usages_unique").on(table.stickerId, table.usedByParentId),
}));

export const parentWallet = pgTable("parent_wallet", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().unique().references(() => parents.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0").notNull(),
  totalDeposited: decimal("total_deposited", { precision: 12, scale: 2 }).default("0").notNull(),
  totalSpent: decimal("total_spent", { precision: 12, scale: 2 }).default("0").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  displayName: text("display_name"),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name"),
  bankName: text("bank_name"),
  phoneNumber: text("phone_number"),
  supportedCountries: json("supported_countries").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  gatewayConfig: json("gateway_config").$type<Record<string, any>>(),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deposits = pgTable("deposits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  paymentMethodId: varchar("payment_method_id").notNull().references(() => paymentMethods.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  transactionId: text("transaction_id"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const googlePlayPurchases = pgTable("google_play_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  depositId: varchar("deposit_id").references(() => deposits.id, { onDelete: "set null" }),
  productId: varchar("product_id", { length: 255 }).notNull(),
  purchaseToken: text("purchase_token").notNull(),
  orderId: text("order_id"),
  packageName: varchar("package_name", { length: 255 }).notNull(),
  walletAmount: decimal("wallet_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  purchaseState: varchar("purchase_state", { length: 20 }).notNull(),
  acknowledgementState: varchar("acknowledgement_state", { length: 20 }).notNull(),
  consumptionState: varchar("consumption_state", { length: 20 }).notNull(),
  rawPayload: jsonb("raw_payload").$type<Record<string, any>>(),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
  creditedAt: timestamp("credited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  purchaseTokenUnique: uniqueIndex("google_play_purchases_purchase_token_uq").on(table.purchaseToken),
  orderProductUnique: uniqueIndex("google_play_purchases_order_product_uq")
    .on(table.orderId, table.productId)
    .where(isNotNull(table.orderId)),
  parentCreatedIdx: index("google_play_purchases_parent_created_idx").on(table.parentId, table.createdAt),
}));

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").references(() => children.id, { onDelete: "cascade" }),
  libraryId: varchar("library_id").references(() => libraries.id, { onDelete: "cascade" }),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").references(() => schoolTeachers.id, { onDelete: "cascade" }),
  adminId: varchar("admin_id").references(() => admins.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  title: text("title"),
  message: text("message").notNull(),
  style: varchar("style", { length: 20 }).default("toast").notNull(),
  priority: varchar("priority", { length: 20 }).default("normal").notNull(),
  soundAlert: boolean("sound_alert").default(false).notNull(),
  vibration: boolean("vibration").default(false).notNull(),
  relatedId: varchar("related_id"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  resolvedAt: timestamp("resolved_at"),
  ctaAction: varchar("cta_action", { length: 50 }),
  ctaTarget: text("cta_target"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const riskAlerts = pgTable("risk_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "set null" }),
  childId: varchar("child_id").references(() => children.id, { onDelete: "set null" }),
  targetType: varchar("target_type", { length: 20 }).notNull(), // parent | child | referral
  targetId: varchar("target_id").notNull(),
  riskType: varchar("risk_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).default("medium").notNull(), // low | medium | high
  riskScore: integer("risk_score").default(50).notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  details: text("details").notNull(),
  evidence: json("evidence").$type<Record<string, any>>(),
  status: varchar("status", { length: 20 }).default("open").notNull(), // open | reviewed | resolved
  detectionCount: integer("detection_count").default(1).notNull(),
  firstDetectedAt: timestamp("first_detected_at").defaultNow().notNull(),
  lastDetectedAt: timestamp("last_detected_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedByAdminId: varchar("resolved_by_admin_id").references(() => admins.id, { onDelete: "set null" }),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "cascade" }),
  purpose: varchar("purpose", { length: 20 }).notNull(),
  code: text("code").notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  destination: text("destination").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  deviceHash: text("device_hash"),
  ipAddress: inet("ip_address"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  pendingPurposeUnique: uniqueIndex("otp_pending_unique")
    .on(table.parentId, table.purpose)
    .where(sql`status = 'pending'`),
  destinationPurposeStatusIdx: index("otp_destination_purpose_status_idx")
    .on(table.destination, table.purpose, table.status),
}));

export const otpRequestLogs = pgTable("otp_request_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destination: text("destination").notNull(),
  ipAddress: inet("ip_address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const broadcastNotifications = pgTable("broadcast_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => admins.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  targetAudience: varchar("target_audience", { length: 20 }).default("all").notNull(),
  priority: varchar("priority", { length: 10 }).default("normal").notNull(),
  recipientCount: integer("recipient_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// جدول الهدايا المرسلة للأطفال
export const childGifts = pgTable("child_gifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  productImage: text("product_image"),
  pointsCost: integer("points_cost").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // "pending" | "delivered" | "acknowledged"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
});

// إعدادات إشعارات الأطفال
export const childNotificationSettings = pgTable("child_notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().unique().references(() => children.id, { onDelete: "cascade" }),
  mode: varchar("mode", { length: 20 }).default("popup_soft").notNull(), // "popup_strict" | "popup_soft" | "floating_bubble"
  repeatDelayMinutes: integer("repeat_delay_minutes").default(5).notNull(),
  requireOverlayPermission: boolean("require_overlay_permission").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// اشتراكات Push الخاصة بالطفل (ويب/أندرويد/iOS)
export const childPushSubscriptions = pgTable("child_push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 20 }).notNull(), // web | android | ios
  endpoint: text("endpoint"), // web push endpoint
  token: text("token"), // mobile token
  p256dh: text("p256dh"),
  auth: text("auth"),
  deviceId: text("device_id"),
  isActive: boolean("is_active").default(true).notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  byChildActiveIdx: index("idx_child_push_subscriptions_child_active").on(table.childId, table.isActive),
}));

// Parent push subscriptions
export const parentPushSubscriptions = pgTable("parent_push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 20 }).notNull(),
  endpoint: text("endpoint"),
  token: text("token"),
  p256dh: text("p256dh"),
  auth: text("auth"),
  deviceId: text("device_id"),
  isActive: boolean("is_active").default(true).notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  byParentActiveIdx: index("idx_parent_push_subscriptions_parent_active").on(table.parentId, table.isActive),
}));

// Parent notification preferences (web push controls + quiet hours)
export const parentNotificationPreferences = pgTable("parent_notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().unique().references(() => parents.id, { onDelete: "cascade" }),
  webPushEnabled: boolean("web_push_enabled").default(true).notNull(),
  mutedTypes: json("muted_types").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  byParentIdx: index("idx_parent_notification_preferences_parent").on(table.parentId),
}));

// Teacher push subscriptions
export const teacherPushSubscriptions = pgTable("teacher_push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 20 }).notNull(),
  endpoint: text("endpoint"),
  token: text("token"),
  p256dh: text("p256dh"),
  auth: text("auth"),
  deviceId: text("device_id"),
  isActive: boolean("is_active").default(true).notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  byTeacherActiveIdx: index("idx_teacher_push_subscriptions_teacher_active").on(table.teacherId, table.isActive),
}));

// إعدادات وقت الشاشة للأطفال
export const screenTimeSettings = pgTable("screen_time_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  dailyLimitMinutes: integer("daily_limit_minutes").default(120).notNull(), // Default 2 hours
  isEnabled: boolean("is_enabled").default(false).notNull(),
  allowedStartTime: varchar("allowed_start_time", { length: 5 }).default("08:00"), // HH:MM
  allowedEndTime: varchar("allowed_end_time", { length: 5 }).default("20:00"),     // HH:MM
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  byChildIdx: index("idx_screen_time_settings_child").on(table.childId),
}));

// سجل الاستخدام اليومي للأطفال
export const childDailyUsage = pgTable("child_daily_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  totalMinutes: integer("total_minutes").default(0).notNull(),
  sessionsCount: integer("sessions_count").default(0).notNull(),
  lastActivityAt: timestamp("last_activity_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  byChildDateIdx: index("idx_child_daily_usage_child_date").on(table.childId, table.date),
}));

// سجل محاولات تسليم إشعارات المهام
export const taskNotificationDeliveryAttempts = pgTable("task_notification_delivery_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 20 }).notNull(), // in_app | web_push | mobile_push | parent_escalation
  attemptNo: integer("attempt_no").default(1).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | sent | failed | acknowledged
  error: text("error"),
  sentAt: timestamp("sent_at"),
  nextRetryAt: timestamp("next_retry_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  byTaskChildTimeIdx: index("idx_task_notification_attempts_task_child_time").on(table.taskId, table.childId, table.createdAt),
  byStatusRetryIdx: index("idx_task_notification_attempts_status_retry").on(table.status, table.nextRetryAt),
}));

// جدول الأحداث للأطفال
export const childEvents = pgTable("child_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // "GIFT_ASSIGNED", "TASK_ASSIGNED", etc.
  relatedId: varchar("related_id"), // productId, taskId, etc.
  meta: json("meta").$type<Record<string, any>>(), // Additional data
  isAcknowledged: boolean("is_acknowledged").default(false).notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Optional expiry
});

// ===== جداول الأجهزة الموثوقة =====
// جدول الأجهزة الموثوقة للآباء
export const trustedDevicesParent = pgTable("trusted_devices_parent", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  deviceId: varchar("device_id").notNull(), // فريد محلي من localStorage
  deviceName: text("device_name").notNull(), // اسم الجهاز (Chrome on Windows, etc.)
  deviceType: varchar("device_type", { length: 20 }).notNull(), // "desktop" | "mobile" | "tablet"
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  isTrusted: boolean("is_trusted").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // اختياري: تاريخ انتهاء الثقة
}, (table) => ({
  uniqueParentDevice: sql`UNIQUE (${table.parentId}, ${table.deviceId})`,
}));

// جدول الأجهزة الموثوقة للأطفال
export const trustedDevicesChild = pgTable("trusted_devices_child", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  deviceId: varchar("device_id").notNull(), // فريد محلي من localStorage
  deviceName: text("device_name").notNull(), // اسم الجهاز
  deviceType: varchar("device_type", { length: 20 }).notNull(), // "desktop" | "mobile" | "tablet"
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  isTrusted: boolean("is_trusted").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // اختياري: تاريخ انتهاء الثقة
}, (table) => ({
  uniqueChildDevice: sql`UNIQUE (${table.childId}, ${table.deviceId})`,
}));

// ===== جداول الإعلانات =====
// جدول الإعلانات للأطفال
export const childAds = pgTable("child_ads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content").notNull(), // يمكن أن يكون: صورة (URL)، فيديو (URL/embed)، رابط، كود HTML
  contentType: varchar("content_type", { length: 20 }).notNull(), // "image" | "video" | "link" | "code"
  mediaUrl: text("media_url"), // للصور والفيديوهات
  linkUrl: text("link_url"), // للروابط
  htmlCode: text("html_code"), // للكود HTML
  pointsReward: integer("points_reward").default(10).notNull(), // النقاط المعطاة عند المشاهدة
  watchDurationSeconds: integer("watch_duration_seconds").default(30).notNull(), // المدة المطلوبة
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(0).notNull(), // ترتيب العرض
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// جدول الإعلانات للآباء
export const parentAds = pgTable("parent_ads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content").notNull(), // نفس أنواع المحتوى
  contentType: varchar("content_type", { length: 20 }).notNull(), // "image" | "video" | "link" | "code"
  mediaUrl: text("media_url"),
  linkUrl: text("link_url"),
  htmlCode: text("html_code"),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(0).notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// جدول تسجيل مشاهدة الإعلانات
export const adWatchHistory = pgTable("ad_watch_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").references(() => children.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "cascade" }),
  adId: varchar("ad_id").notNull(),
  adType: varchar("ad_type", { length: 10 }).notNull(), // "child" | "parent"
  watchedDuration: integer("watched_duration").default(0).notNull(), // بالثواني
  pointsEarned: integer("points_earned").default(0).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  watchedAt: timestamp("watched_at").defaultNow().notNull(),
});

// ===== جداول ربط الآباء والأطفال المحسّن =====
// جدول الرموز السرية لربط الآباء والأطفال
export const parentChildLinkingCodes = pgTable("parent_child_linking_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 10 }).notNull().unique(), // رمز عشوائي فريد
  qrCodeUrl: text("qr_code_url"), // رابط QR code
  isUsed: boolean("is_used").default(false).notNull(),
  usedByParentId: varchar("used_by_parent_id").references(() => parents.id, { onDelete: "set null" }), // الأب الثاني الذي استخدم الكود
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"), // ينتهي الكود بعد 24 ساعة عادة
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// جدول طلبات ربط والد جديد بحساب طفل (يحتاج موافقة الوالد الأول)
export const parentLinkRequests = pgTable("parent_link_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestingParentId: varchar("requesting_parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  primaryParentId: varchar("primary_parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // "pending" | "approved" | "rejected"
  respondedAt: timestamp("responded_at"),
  notificationId: varchar("notification_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// جدول حالة مشاركة البيانات بين الآباء والأطفال
export const parentParentSync = pgTable("parent_parent_sync", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  primaryParentId: varchar("primary_parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  secondaryParentId: varchar("secondary_parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  syncStatus: varchar("sync_status", { length: 20 }).default("active").notNull(), // "active" | "pending" | "revoked"
  sharedChildren: json("shared_children").$type<string[]>().notNull(), // مصفوفة من childId
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueParentSync: sql`UNIQUE (${table.primaryParentId}, ${table.secondaryParentId})`,
}));

// ===== Phase 1: Sessions & Trusted Devices =====
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  deviceId: varchar("device_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  uniqueParentDeviceSession: sql`UNIQUE (${table.parentId}, ${table.deviceId})`,
}));

// ===== Phase 1: Login History & Audit =====
export const loginHistory = pgTable("login_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  deviceId: varchar("device_id").notNull(),
  deviceHash: text("device_hash"),
  success: boolean("success").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  failureReason: varchar("failure_reason", { length: 100 }),
  suspiciousActivity: boolean("suspicious_activity").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Phase 1: Store - Price Tiers =====
export const priceTiers = pgTable("price_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  currency: varchar("currency", { length: 3 }).notNull(),
  unitAmount: decimal("unit_amount", { precision: 12, scale: 2 }).notNull(),
  interval: varchar("interval", { length: 20 }).default("once").notNull(), // "once" | "monthly" | "yearly"
  stripePriceId: varchar("stripe_price_id"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Phase 1: Store - Orders =====
export const storeOrders = pgTable("store_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).notNull(), // "PENDING" | "PAYMENT_INITIATED" | "PAID" | "FAILED" | "REFUNDED"
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  shippingAddressId: varchar("shipping_address_id").references(() => shippingAddresses.id, { onDelete: "set null" }),
  stripeSessionId: varchar("stripe_session_id"),
  idempotencyKey: varchar("idempotency_key").notNull().unique(),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===== Phase 1: Store - Order Items =====
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => storeOrders.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  priceTierId: varchar("price_tier_id").notNull().references(() => priceTiers.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitAmount: decimal("unit_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Phase 1: Payments - Transactions =====
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => storeOrders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 30 }).notNull(), // "stripe"
  providerRef: varchar("provider_ref").notNull(), // payment_intent or charge ID
  status: varchar("status", { length: 30 }).notNull(), // "pending" | "completed" | "failed" | "refunded"
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  idempotencyKey: varchar("idempotency_key").notNull().unique(),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Phase 1: Payments - Webhook Events =====
export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider", { length: 30 }).notNull(), // "stripe"
  eventType: varchar("event_type", { length: 100 }).notNull(), // "checkout.session.completed"
  dedupeKey: varchar("dedupe_key").notNull().unique(), // Stripe event ID
  payload: json("payload").$type<Record<string, any>>().notNull(),
  signatureVerified: boolean("signature_verified").default(false).notNull(),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Media platform (object storage) =====
export const media = pgTable("media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectKey: text("object_key").notNull(),
  url: text("url").notNull(),
  storageProvider: varchar("storage_provider", { length: 30 }).default("object_storage").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  checksum: text("checksum"),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
  ownerType: varchar("owner_type", { length: 30 }),
  ownerId: varchar("owner_id", { length: 100 }),
  dedupeKey: text("dedupe_key"),
  scanStatus: varchar("scan_status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  purgeAt: timestamp("purge_at"),
}, (table) => ({
  ownerDedupeUnique: uniqueIndex("media_owner_dedupe_key_idx")
    .on(table.ownerId, table.dedupeKey)
    .where(isNotNull(table.dedupeKey)),
}));

export const mediaReferences = pgTable("media_references", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mediaId: varchar("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  field: varchar("field", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  uniqueActiveRef: uniqueIndex("media_ref_unique_active")
    .on(table.mediaId, table.entityType, table.entityId, table.field)
    .where(isNull(table.deletedAt)),
}));

export const mediaEvents = pgTable("media_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mediaId: varchar("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
  actorType: varchar("actor_type", { length: 30 }),
  actorId: varchar("actor_id", { length: 100 }),
  action: varchar("action", { length: 50 }).notNull(),
  meta: json("meta").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Phase 1: Wallets =====
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().unique().references(() => parents.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(), // "active" | "frozen"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===== Phase 1: Wallet Transfers (Ledger) =====
export const walletTransfers = pgTable("wallet_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // "DEPOSIT" | "REFUND" | "SPEND" (spending Phase 2)
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  relatedOrderId: varchar("related_order_id").references(() => storeOrders.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Phase 1: Entitlements (Owned Products) =====
export const entitlements = pgTable("entitlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").references(() => children.id, { onDelete: "cascade" }), // NULL = parent owns, populated = child owns
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  orderId: varchar("order_id").references(() => storeOrders.id, { onDelete: "set null" }),
  status: varchar("status", { length: 30 }).notNull(), // "ACTIVE" | "ASSIGNED_AS_GIFT" | "EXPIRED"
  metadata: json("metadata").$type<Record<string, any>>(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueOrderProduct: sql`UNIQUE (${table.orderId}, ${table.productId}, ${table.parentId})`,
}));

// ===== Phase 1: Gifts =====
export const gifts = pgTable("gifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  pointsThreshold: integer("points_threshold").notNull(),
  status: varchar("status", { length: 30 }).notNull(), // "SENT" | "UNLOCKED" | "ACTIVATED" | "REVOKED"
  message: text("message"),
  unlockedAt: timestamp("unlocked_at"),
  activatedAt: timestamp("activated_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Phase 1: Shipping Addresses =====
export const shippingAddresses = pgTable("shipping_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 2 }).notNull(), // ISO 3166-1 alpha-2
  isDefault: boolean("is_default").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===== Phase 1: Refunds =====
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(), // "pending" | "completed" | "failed"
  providerRef: varchar("provider_ref"),
  reason: varchar("reason", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===== Referral Settings (Admin) =====
export const referralSettings = pgTable("referral_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pointsPerReferral: integer("points_per_referral").default(100).notNull(),
  pointsPerAdShare: integer("points_per_ad_share").default(10).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("10.00").notNull(),
  minActiveDays: integer("min_active_days").default(7).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===== Referral System =====
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  referredId: varchar("referred_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  referralCode: varchar("referral_code", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | active | rewarded
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  referredAt: timestamp("referred_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"),
  rewardedAt: timestamp("rewarded_at"),
}, (table) => ({
  uniqueReferral: sql`UNIQUE (${table.referrerId}, ${table.referredId})`,
}));

// ===== Child Activity Status =====
export const childActivityStatus = pgTable("child_activity_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().unique().references(() => children.id, { onDelete: "cascade" }),
  isOnline: boolean("is_online").default(false).notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  currentActivity: varchar("current_activity", { length: 50 }), // game | task | idle
  sessionStartedAt: timestamp("session_started_at"),
  totalPlayTimeToday: integer("total_play_time_today").default(0).notNull(), // in minutes
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===== Parent Referral Code (for sharing) =====
export const parentReferralCodes = pgTable("parent_referral_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().unique().references(() => parents.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  totalReferrals: integer("total_referrals").default(0).notNull(),
  activeReferrals: integer("active_referrals").default(0).notNull(),
  totalPointsEarned: integer("total_points_earned").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Ads System =====
export const ads = pgTable("ads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  targetAudience: varchar("target_audience", { length: 20 }).default("all").notNull(), // all | parents | children
  priority: integer("priority").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  viewCount: integer("view_count").default(0).notNull(),
  clickCount: integer("click_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAdSchema = createInsertSchema(ads).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true, clickCount: true });

// ===== Ad Click Tracking (per user per ad) =====
export const adClicks = pgTable("ad_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adId: varchar("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  clickedAt: timestamp("clicked_at").defaultNow().notNull(),
});

// ===== Ad Share Tracking (per user per ad per platform) =====
export const adShares = pgTable("ad_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adId: varchar("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 30 }).notNull(), // whatsapp | facebook | twitter | telegram | copy | other
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  sharedAt: timestamp("shared_at").defaultNow().notNull(),
});

// ===== Ad Conversion Tracking (ad click/open -> checkout) =====
export const adConversions = pgTable("ad_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adId: varchar("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  purchaseId: varchar("purchase_id").notNull().references(() => parentPurchases.id, { onDelete: "cascade" }),
  productId: varchar("product_id").references(() => products.id, { onDelete: "set null" }),
  quantity: integer("quantity").default(1).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  convertedAt: timestamp("converted_at").defaultNow().notNull(),
});
export type Ad = typeof ads.$inferSelect;
export type InsertAd = z.infer<typeof insertAdSchema>;

export const insertParentSchema = createInsertSchema(parents).omit({
  id: true,
  createdAt: true,
  qrCode: true,
  failedLoginAttempts: true,
  lockedUntil: true,
});
export const insertChildSchema = createInsertSchema(children).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, status: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertThemeSettingsSchema = createInsertSchema(themeSettings).omit({ id: true, updatedAt: true });
export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export const insertParentQuickTaskSchema = createInsertSchema(parentQuickTasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertParentQuickTaskCompletionSchema = createInsertSchema(parentQuickTaskCompletions).omit({ id: true, completedAt: true });

export type ParentQuickTask = typeof parentQuickTasks.$inferSelect;
export type InsertParentQuickTask = z.infer<typeof insertParentQuickTaskSchema>;
export type ParentQuickTaskCompletion = typeof parentQuickTaskCompletions.$inferSelect;
export type InsertParentQuickTaskCompletion = z.infer<typeof insertParentQuickTaskCompletionSchema>;

// ===== Scheduled Tasks =====
export const scheduledTasks = pgTable("scheduled_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  templateTaskId: varchar("template_task_id").references(() => templateTasks.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  answers: json("answers").$type<TaskAnswerMedia[]>().notNull(),
  pointsReward: integer("points_reward").default(10).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | sent | cancelled
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduledTaskSchema = createInsertSchema(scheduledTasks).omit({ id: true, createdAt: true, sentAt: true, status: true });
export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type InsertScheduledTask = z.infer<typeof insertScheduledTaskSchema>;

// ===== Scheduled Sessions (جلسات المهام المجدولة) =====
export const scheduledSessions = pgTable("scheduled_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  intervalMinutes: integer("interval_minutes").default(15).notNull(), // الفاصل الزمني بين المهام بالدقائق
  activationType: varchar("activation_type", { length: 20 }).default("on_login").notNull(), // on_login | immediate | scheduled
  scheduledStartAt: timestamp("scheduled_start_at"), // وقت البدء المجدول (للنوع scheduled)
  actualStartAt: timestamp("actual_start_at"), // وقت البدء الفعلي
  pausedAt: timestamp("paused_at"), // وقت الإيقاف المؤقت
  totalTasks: integer("total_tasks").default(0).notNull(),
  completedTasks: integer("completed_tasks").default(0).notNull(),
  totalPointsReward: integer("total_points_reward").default(0).notNull(), // إجمالي النقاط للجلسة
  status: varchar("status", { length: 20 }).default("draft").notNull(), // draft | active | paused | completed | cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  parentIdx: index("ss_parent_idx").on(table.parentId),
  childIdx: index("ss_child_idx").on(table.childId),
  statusIdx: index("ss_status_idx").on(table.status),
}));

export const insertScheduledSessionSchema = createInsertSchema(scheduledSessions).omit({
  id: true, createdAt: true, updatedAt: true, actualStartAt: true, pausedAt: true, completedTasks: true, status: true,
});
export type ScheduledSession = typeof scheduledSessions.$inferSelect;
export type InsertScheduledSession = z.infer<typeof insertScheduledSessionSchema>;

// ===== Scheduled Session Tasks (مهام الجلسة المجدولة) =====
export const scheduledSessionTasks = pgTable("scheduled_session_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => scheduledSessions.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(), // ترتيب المهمة في الجلسة (1, 2, 3...)
  templateTaskId: varchar("template_task_id").references(() => templateTasks.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  answers: json("answers").$type<TaskAnswerMedia[]>().notNull(),
  pointsReward: integer("points_reward").default(10).notNull(),
  imageUrl: text("image_url"),
  status: varchar("status", { length: 20 }).default("locked").notNull(), // locked | unlocked | completed | skipped
  unlockedAt: timestamp("unlocked_at"), // وقت فتح المهمة
  completedAt: timestamp("completed_at"), // وقت إكمال المهمة
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }), // ربط بالمهمة الفعلية عند إرسالها
  selectedAnswerId: varchar("selected_answer_id", { length: 50 }), // الإجابة المختارة
  isCorrect: boolean("is_correct"), // هل الإجابة صحيحة
  pointsEarned: integer("points_earned").default(0).notNull(), // النقاط المكتسبة
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("sst_session_idx").on(table.sessionId),
  statusIdx: index("sst_status_idx").on(table.status),
  orderIdx: index("sst_order_idx").on(table.sessionId, table.orderIndex),
}));

export const insertScheduledSessionTaskSchema = createInsertSchema(scheduledSessionTasks).omit({
  id: true, createdAt: true, unlockedAt: true, completedAt: true, taskId: true, selectedAnswerId: true, isCorrect: true, pointsEarned: true, status: true,
});
export type ScheduledSessionTask = typeof scheduledSessionTasks.$inferSelect;
export type InsertScheduledSessionTask = z.infer<typeof insertScheduledSessionTaskSchema>;

// ===== Profit Transactions (Commission tracking) =====
export const profitTransactions = pgTable("profit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  buyerId: varchar("buyer_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  templateTaskId: varchar("template_task_id").references(() => templateTasks.id, { onDelete: "set null" }),
  totalPoints: integer("total_points").notNull(),
  sellerEarnings: integer("seller_earnings").notNull(),
  appCommission: integer("app_commission").notNull(),
  commissionRate: integer("commission_rate").default(10).notNull(), // percentage
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProfitTransaction = typeof profitTransactions.$inferSelect;

// ===== Parent Notifications (Admin to Parent) =====
export const parentNotifications = pgTable("parent_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  adminId: varchar("admin_id").references(() => admins.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  imageUrl: text("image_url"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertParentNotificationSchema = createInsertSchema(parentNotifications).omit({ id: true, createdAt: true, isRead: true });
export type ParentNotification = typeof parentNotifications.$inferSelect;
export type InsertParentNotification = z.infer<typeof insertParentNotificationSchema>;

// ===== Library Merchants System =====
export const libraries = pgTable("libraries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  imageUrl: text("image_url"),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  referralCode: varchar("referral_code", { length: 20 }).notNull().unique(),
  activityScore: integer("activity_score").default(0).notNull(),
  totalProducts: integer("total_products").default(0).notNull(),
  totalSales: integer("total_sales").default(0).notNull(),
  commissionRatePct: decimal("commission_rate_pct", { precision: 5, scale: 2 }).default("10.00").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  // Social profile fields
  bio: text("bio"),
  coverImageUrl: text("cover_image_url"),
  governorate: text("governorate"),
  city: text("city"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  socialLinks: json("social_links").$type<{ facebook?: string; twitter?: string; instagram?: string; youtube?: string; tiktok?: string; website?: string }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const libraryProducts = pgTable("library_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  libraryId: varchar("library_id").notNull().references(() => libraries.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: integer("discount_percent").default(0).notNull(),
  discountMinQuantity: integer("discount_min_quantity").default(1).notNull(),
  stock: integer("stock").default(0).notNull(),
  displayCountries: json("display_countries").$type<string[]>().default([]).notNull(),
  displayCurrencies: json("display_currencies").$type<string[]>().default([]).notNull(),
  moderationStatus: varchar("moderation_status", { length: 30 }).default("pending_review").notNull(), // approved | pending_review | rejected
  moderationReason: text("moderation_reason"),
  moderationReviewedAt: timestamp("moderation_reviewed_at"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const libraryReferrals = pgTable("library_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  libraryId: varchar("library_id").notNull().references(() => libraries.id, { onDelete: "cascade" }),
  referredParentId: varchar("referred_parent_id").references(() => parents.id, { onDelete: "set null" }),
  referralCode: varchar("referral_code", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("clicked").notNull(), // clicked | registered | purchased
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  convertedAt: timestamp("converted_at"),
});

export const libraryActivityLogs = pgTable("library_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  libraryId: varchar("library_id").notNull().references(() => libraries.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(), // product_added | product_updated | sale | referral_click
  points: integer("points").default(0).notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const libraryReferralSettings = pgTable("library_referral_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pointsPerReferral: integer("points_per_referral").default(50).notNull(),
  pointsPerSale: integer("points_per_sale").default(10).notNull(),
  pointsPerProductAdd: integer("points_per_product_add").default(5).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===== Library Daily Sales (for commission tracking) =====
export const libraryDailySales = pgTable("library_daily_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  libraryId: varchar("library_id").notNull().references(() => libraries.id, { onDelete: "cascade" }),
  saleDate: timestamp("sale_date").notNull(),
  totalSalesAmount: decimal("total_sales_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalPointsSales: integer("total_points_sales").default(0).notNull(),
  totalOrders: integer("total_orders").default(0).notNull(),
  commissionRatePct: decimal("commission_rate_pct", { precision: 5, scale: 2 }).default("10.00").notNull(),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  isPaid: boolean("is_paid").default(false).notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const libraryOrders = pgTable("library_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentPurchaseId: varchar("parent_purchase_id").references(() => parentPurchases.id, { onDelete: "set null" }),
  buyerParentId: varchar("buyer_parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  libraryId: varchar("library_id").notNull().references(() => libraries.id, { onDelete: "cascade" }),
  libraryProductId: varchar("library_product_id").notNull().references(() => libraryProducts.id, { onDelete: "restrict" }),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  shippingAddress: text("shipping_address"),
  status: varchar("status", { length: 30 }).default("pending_admin").notNull(),
  adminConfirmedAt: timestamp("admin_confirmed_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  completedAt: timestamp("completed_at"),
  deliveryCode: varchar("delivery_code", { length: 10 }),
  deliveryCodeSentAt: timestamp("delivery_code_sent_at"),
  deliveryCodeVerifiedAt: timestamp("delivery_code_verified_at"),
  commissionRatePct: decimal("commission_rate_pct", { precision: 5, scale: 2 }).default("10.00").notNull(),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  libraryEarningAmount: decimal("library_earning_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  holdDays: integer("hold_days").default(15).notNull(),
  protectionExpiresAt: timestamp("protection_expires_at"),
  isSettled: boolean("is_settled").default(false).notNull(),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const libraryBalances = pgTable("library_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  libraryId: varchar("library_id").notNull().unique().references(() => libraries.id, { onDelete: "cascade" }),
  pendingBalance: decimal("pending_balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  frozenBalance: decimal("frozen_balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  availableBalance: decimal("available_balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalSalesAmount: decimal("total_sales_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalCommissionAmount: decimal("total_commission_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalWithdrawnAmount: decimal("total_withdrawn_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const libraryReturnRequests = pgTable("library_return_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  libraryOrderId: varchar("library_order_id").notNull().references(() => libraryOrders.id, { onDelete: "cascade" }),
  parentPurchaseId: varchar("parent_purchase_id").references(() => parentPurchases.id, { onDelete: "set null" }),
  buyerParentId: varchar("buyer_parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  libraryId: varchar("library_id").notNull().references(() => libraries.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).default("under_review").notNull(), // under_review | merchant_responded | approved | rejected | cancelled
  reason: varchar("reason", { length: 80 }).notNull(),
  details: text("details"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  eligibleUntil: timestamp("eligible_until").notNull(),
  freezeAmount: decimal("freeze_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  freezeSource: varchar("freeze_source", { length: 20 }).default("pending").notNull(), // pending | available
  merchantResponse: text("merchant_response"),
  merchantRespondedAt: timestamp("merchant_responded_at"),
  adminDecision: varchar("admin_decision", { length: 20 }), // approve | reject
  adminNote: text("admin_note"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const libraryWithdrawalRequests = pgTable("library_withdrawal_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  libraryId: varchar("library_id").notNull().references(() => libraries.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 40 }).notNull(),
  paymentDetails: json("payment_details").$type<Record<string, any>>(),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  adminNote: text("admin_note"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const libraryDailyInvoices = pgTable("library_daily_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  libraryId: varchar("library_id").notNull().references(() => libraries.id, { onDelete: "cascade" }),
  invoiceDate: timestamp("invoice_date").notNull(),
  totalOrders: integer("total_orders").default(0).notNull(),
  grossSalesAmount: decimal("gross_sales_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalCommissionAmount: decimal("total_commission_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLibraryDailySalesSchema = createInsertSchema(libraryDailySales).omit({
  id: true, createdAt: true, updatedAt: true
});
export type LibraryDailySales = typeof libraryDailySales.$inferSelect;
export type InsertLibraryDailySales = z.infer<typeof insertLibraryDailySalesSchema>;

export const insertLibraryOrderSchema = createInsertSchema(libraryOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  adminConfirmedAt: true,
  shippedAt: true,
  deliveredAt: true,
  completedAt: true,
  deliveryCode: true,
  deliveryCodeSentAt: true,
  deliveryCodeVerifiedAt: true,
  protectionExpiresAt: true,
  isSettled: true,
  settledAt: true,
});
export type LibraryOrder = typeof libraryOrders.$inferSelect;
export type InsertLibraryOrder = z.infer<typeof insertLibraryOrderSchema>;

export const insertLibraryBalanceSchema = createInsertSchema(libraryBalances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type LibraryBalance = typeof libraryBalances.$inferSelect;
export type InsertLibraryBalance = z.infer<typeof insertLibraryBalanceSchema>;

export const insertLibraryReturnRequestSchema = createInsertSchema(libraryReturnRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  requestedAt: true,
  merchantRespondedAt: true,
  resolvedAt: true,
});
export type LibraryReturnRequest = typeof libraryReturnRequests.$inferSelect;
export type InsertLibraryReturnRequest = z.infer<typeof insertLibraryReturnRequestSchema>;

export const insertLibraryWithdrawalRequestSchema = createInsertSchema(libraryWithdrawalRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
});
export type LibraryWithdrawalRequest = typeof libraryWithdrawalRequests.$inferSelect;
export type InsertLibraryWithdrawalRequest = z.infer<typeof insertLibraryWithdrawalRequestSchema>;

export const insertLibraryDailyInvoiceSchema = createInsertSchema(libraryDailyInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type LibraryDailyInvoice = typeof libraryDailyInvoices.$inferSelect;
export type InsertLibraryDailyInvoice = z.infer<typeof insertLibraryDailyInvoiceSchema>;

// ===== Child Purchase Requests (for parent approval flow) =====
export const childPurchaseRequests = pgTable("child_purchase_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id),
  libraryProductId: varchar("library_product_id").references(() => libraryProducts.id),
  quantity: integer("quantity").default(1).notNull(),
  pointsPrice: integer("points_price").notNull(),
  status: varchar("status", { length: 30 }).default("pending").notNull(), // pending | approved | rejected
  parentDecision: varchar("parent_decision", { length: 20 }), // approve | reject
  rejectionReason: text("rejection_reason"),
  shippingAddress: text("shipping_address"),
  orderId: varchar("order_id").references(() => orders.id),
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChildPurchaseRequestSchema = createInsertSchema(childPurchaseRequests).omit({
  id: true, createdAt: true, decidedAt: true, orderId: true, parentDecision: true, rejectionReason: true, shippingAddress: true
});
export type ChildPurchaseRequest = typeof childPurchaseRequests.$inferSelect;
export type InsertChildPurchaseRequest = z.infer<typeof insertChildPurchaseRequestSchema>;

export const insertLibrarySchema = createInsertSchema(libraries).omit({
  id: true, createdAt: true, updatedAt: true, activityScore: true, totalProducts: true, totalSales: true
});
export const insertLibraryProductSchema = createInsertSchema(libraryProducts).omit({
  id: true, createdAt: true, updatedAt: true
});

export type Library = typeof libraries.$inferSelect;
export type InsertLibrary = z.infer<typeof insertLibrarySchema>;
export type LibraryProduct = typeof libraryProducts.$inferSelect;
export type InsertLibraryProduct = z.infer<typeof insertLibraryProductSchema>;

export type Parent = typeof parents.$inferSelect;
export type Child = typeof children.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;

// ===== Social Login Providers =====
export const socialLoginProviders = pgTable("social_login_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider", { length: 50 }).notNull().unique(), // google, facebook, apple, twitter, github, microsoft
  displayName: text("display_name").notNull(),
  displayNameAr: text("display_name_ar"),
  iconUrl: text("icon_url"),
  iconName: varchar("icon_name", { length: 50 }), // lucide icon name or custom
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  redirectUri: text("redirect_uri"),
  scopes: text("scopes"), // comma separated
  isActive: boolean("is_active").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  settings: json("settings").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSocialLoginProviderSchema = createInsertSchema(socialLoginProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SocialLoginProvider = typeof socialLoginProviders.$inferSelect;
export type InsertSocialLoginProvider = z.infer<typeof insertSocialLoginProviderSchema>;

// ===== OTP Providers (مزودي OTP - البريد الإلكتروني والرسائل النصية وواتساب) =====
export const otpProviders = pgTable("otp_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider", { length: 20 }).notNull().unique(), // email, sms, whatsapp
  displayName: text("display_name").notNull(),
  displayNameAr: text("display_name_ar"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  iconName: varchar("icon_name", { length: 50 }), // lucide icon name
  isActive: boolean("is_active").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  // OTP Settings
  codeLength: integer("code_length").default(6).notNull(),
  expiryMinutes: integer("expiry_minutes").default(5).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  cooldownMinutes: integer("cooldown_minutes").default(1).notNull(), // time between resend
  // Provider-specific settings (stored securely, not exposed to public API)
  settings: json("settings").$type<{
    // For email: fromEmail, templateId, etc.
    // For SMS: provider (twilio/aws/firebase), fromNumber, etc.
    // For WhatsApp: provider (twilio/custom), fromNumber/endpoint, etc.
    [key: string]: any;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOtpProviderSchema = createInsertSchema(otpProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateOtpProviderSchema = insertOtpProviderSchema.partial();

export type OtpProvider = typeof otpProviders.$inferSelect;
export type InsertOtpProvider = z.infer<typeof insertOtpProviderSchema>;
export type UpdateOtpProvider = z.infer<typeof updateOtpProviderSchema>;

// ===== Parent Social Identities (for linking social accounts) =====
export const parentSocialIdentities = pgTable("parent_social_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(), // google, facebook, etc.
  providerId: text("provider_id").notNull(), // user ID from the provider
  email: text("email"),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertParentSocialIdentitySchema = createInsertSchema(parentSocialIdentities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ParentSocialIdentity = typeof parentSocialIdentities.$inferSelect;
export type InsertParentSocialIdentity = z.infer<typeof insertParentSocialIdentitySchema>;

// ===== Child Login Requests (طلبات تسجيل دخول الأطفال) =====
export const childLoginRequests = pgTable("child_login_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
  deviceName: text("device_name"),
  browserInfo: text("browser_info"),
  ipAddress: varchar("ip_address", { length: 50 }),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | approved | rejected | expired
  sessionToken: text("session_token"),
  expiresAt: timestamp("expires_at").notNull(),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChildLoginRequestSchema = createInsertSchema(childLoginRequests).omit({
  id: true,
  sessionToken: true,
  respondedAt: true,
  createdAt: true,
});

export type ChildLoginRequest = typeof childLoginRequests.$inferSelect;
export type InsertChildLoginRequest = z.infer<typeof insertChildLoginRequestSchema>;

// ===== SEO Settings (إعدادات تحسين محركات البحث) =====
export const seoSettings = pgTable("seo_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Basic Meta Tags
  siteTitle: text("site_title").default("Classify — تطبيق تعليمي للأطفال مع رقابة أبوية").notNull(),
  siteDescription: text("site_description").default("أفضل تطبيق تعليمي للأطفال من 6-17 سنة. ألعاب تعليمية تفاعلية مع نظام رقابة أبوية كامل وتحكم في وقت الشاشة.").notNull(),
  keywords: text("keywords").default("تطبيق تعليمي للأطفال, رقابة أبوية, ألعاب تعليمية, التحكم في وقت الشاشة, تطبيق أطفال آمن, مهام ومكافآت").notNull(),

  // Open Graph
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  ogType: varchar("og_type", { length: 50 }).default("website"),

  // Twitter Card
  twitterCard: varchar("twitter_card", { length: 50 }).default("summary_large_image"),
  twitterSite: text("twitter_site"),
  twitterCreator: text("twitter_creator"),

  // Robots & Crawlers
  robotsIndex: boolean("robots_index").default(true).notNull(),
  robotsFollow: boolean("robots_follow").default(true).notNull(),
  robotsNoarchive: boolean("robots_noarchive").default(false).notNull(),
  googlebot: text("googlebot"), // custom googlebot directives
  bingbot: text("bingbot"), // custom bingbot directives

  // AI Crawlers Control
  allowGPTBot: boolean("allow_gpt_bot").default(false).notNull(),
  allowClaudeBot: boolean("allow_claude_bot").default(false).notNull(),
  allowGoogleAI: boolean("allow_google_ai").default(false).notNull(),

  // Sitemap
  sitemapEnabled: boolean("sitemap_enabled").default(true).notNull(),
  sitemapChangefreq: varchar("sitemap_changefreq", { length: 20 }).default("weekly"),
  sitemapPriority: decimal("sitemap_priority", { precision: 2, scale: 1 }).default("0.8"),

  // Schema.org / Structured Data
  schemaOrgType: varchar("schema_org_type", { length: 50 }).default("SoftwareApplication"),
  schemaOrgName: text("schema_org_name"),
  schemaOrgDescription: text("schema_org_description"),
  schemaOrgLogo: text("schema_org_logo"),

  // Analytics
  googleAnalyticsId: text("google_analytics_id"),
  googleTagManagerId: text("google_tag_manager_id"),
  facebookPixelId: text("facebook_pixel_id"),

  // Canonical & Language
  canonicalUrl: text("canonical_url"),
  defaultLanguage: varchar("default_language", { length: 10 }).default("ar"),
  hreflangTags: json("hreflang_tags").$type<Array<{ lang: string, url: string }>>(),

  // PWA
  themeColor: varchar("theme_color", { length: 7 }).default("#6B4D9D"),
  manifestName: text("manifest_name"),
  manifestShortName: text("manifest_short_name"),

  // Custom Head Injection
  customHeadCode: text("custom_head_code"), // for custom scripts in <head>
  customBodyCode: text("custom_body_code"), // for custom scripts before </body>

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by").references(() => parents.id),
});

export const insertSeoSettingsSchema = createInsertSchema(seoSettings).omit({
  id: true,
  updatedAt: true,
});

export type SeoSettings = typeof seoSettings.$inferSelect;
export type InsertSeoSettings = z.infer<typeof insertSeoSettingsSchema>;

// ===== Support Settings (إعدادات الدعم الفني) =====
export const supportSettings = pgTable("support_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Contact Information
  supportEmail: text("support_email").default("support@classify.app").notNull(),
  supportPhone: text("support_phone"),
  supportPhoneAlt: text("support_phone_alt"), // رقم بديل
  whatsappNumber: text("whatsapp_number"),
  telegramUsername: text("telegram_username"),

  // Social Media
  facebookUrl: text("facebook_url"),
  twitterUrl: text("twitter_url"),
  instagramUrl: text("instagram_url"),
  linkedinUrl: text("linkedin_url"),
  youtubeUrl: text("youtube_url"),

  // Working Hours
  workingHoursStart: varchar("working_hours_start", { length: 10 }).default("09:00"),
  workingHoursEnd: varchar("working_hours_end", { length: 10 }).default("17:00"),
  workingDays: text("working_days").default("الأحد - الخميس"), // e.g., "Sun-Thu"
  timezone: varchar("timezone", { length: 50 }).default("Asia/Riyadh"),

  // Display Messages
  emergencyMessage: text("emergency_message"), // رسالة طوارئ تظهر للجميع
  maintenanceMode: boolean("maintenance_mode").default(false).notNull(),
  maintenanceMessage: text("maintenance_message").default("التطبيق تحت الصيانة، نعود قريباً"),

  // Error Page Settings
  errorPageTitle: text("error_page_title").default("حدث خطأ غير متوقع"),
  errorPageMessage: text("error_page_message").default("نأسف على هذا الخطأ. يرجى التواصل مع الدعم الفني."),
  showContactOnError: boolean("show_contact_on_error").default(true).notNull(),

  // FAQ / Help
  faqUrl: text("faq_url"),
  helpCenterUrl: text("help_center_url"),
  privacyPolicyUrl: text("privacy_policy_url"),
  termsOfServiceUrl: text("terms_of_service_url"),

  // Address (for legal/business purposes)
  companyName: text("company_name").default("Classify"),
  companyAddress: text("company_address"),
  companyCity: text("company_city"),
  companyCountry: text("company_country").default("المملكة العربية السعودية"),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by").references(() => parents.id),
});

export const insertSupportSettingsSchema = createInsertSchema(supportSettings).omit({
  id: true,
  updatedAt: true,
});

export type SupportSettings = typeof supportSettings.$inferSelect;
export type InsertSupportSettings = z.infer<typeof insertSupportSettingsSchema>;

// Child Profile Update Schema
export const childProfileUpdateSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  birthday: z.string().optional().nullable(),
  schoolName: z.string().max(200).optional().nullable(),
  academicGrade: z.string().max(50).optional().nullable(),
  hobbies: z.string().max(500).optional().nullable(),
  schoolId: z.string().optional().nullable(),
  governorate: z.string().max(100).optional().nullable(),
});

export type ChildProfileUpdate = z.infer<typeof childProfileUpdateSchema>;

// ===== Schools & Teachers System =====

export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  address: text("address"),
  city: text("city"),
  governorate: text("governorate"),
  imageUrl: text("image_url"),
  coverImageUrl: text("cover_image_url"),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  referralCode: varchar("referral_code", { length: 20 }).notNull().unique(),
  phoneNumber: text("phone_number"),
  email: text("email"),
  socialLinks: json("social_links").$type<{ facebook?: string; twitter?: string; instagram?: string; youtube?: string; tiktok?: string; website?: string }>(),
  activityScore: integer("activity_score").default(0).notNull(),
  totalTeachers: integer("total_teachers").default(0).notNull(),
  totalStudents: integer("total_students").default(0).notNull(),
  commissionRatePct: decimal("commission_rate_pct", { precision: 5, scale: 2 }).default("10.00").notNull(),
  withdrawalCommissionPct: decimal("withdrawal_commission_pct", { precision: 5, scale: 2 }).default("0.00").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  enrollmentOpen: boolean("enrollment_open").default(false).notNull(),
  enrollmentConditions: json("enrollment_conditions").$type<{
    minAge?: number;
    maxAge?: number;
    requiredGovernorates?: string[];
    minActivityScore?: number;
    requireCompleteProfile?: boolean;
    requireAvatar?: boolean;
    customNote?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const schoolTeachers = pgTable("school_teachers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  birthday: text("birthday"),
  bio: text("bio"),
  subject: text("subject"),
  yearsExperience: integer("years_experience").default(0),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  referralCode: varchar("referral_code", { length: 24 }).unique(),
  monthlyRate: decimal("monthly_rate", { precision: 10, scale: 2 }),
  perTaskRate: decimal("per_task_rate", { precision: 10, scale: 2 }),
  pricingModel: varchar("pricing_model", { length: 20 }).default("per_task"),
  commissionRatePct: decimal("commission_rate_pct", { precision: 5, scale: 2 }).default("10.00").notNull(),
  coverImageUrl: text("cover_image_url"),
  socialLinks: json("social_links").$type<{ facebook?: string; twitter?: string; instagram?: string; youtube?: string; tiktok?: string; website?: string }>(),
  isActive: boolean("is_active").default(true).notNull(),
  totalTasksSold: integer("total_tasks_sold").default(0).notNull(),
  totalStudents: integer("total_students").default(0).notNull(),
  activityScore: integer("activity_score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const schoolPosts = pgTable("school_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").references(() => schoolTeachers.id, { onDelete: "cascade" }),
  authorType: varchar("author_type", { length: 10 }).notNull(), // "school" | "teacher"
  content: text("content").notNull(),
  mediaUrls: json("media_urls").$type<string[]>().default(sql`'[]'::jsonb`),
  mediaTypes: json("media_types").$type<string[]>().default(sql`'[]'::jsonb`),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const schoolPostComments = pgTable("school_post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => schoolPosts.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "set null" }),
  childId: varchar("child_id").references(() => children.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schoolPostLikes = pgTable("school_post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => schoolPosts.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "set null" }),
  childId: varchar("child_id").references(() => children.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schoolReviews = pgTable("school_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teacherReviews = pgTable("teacher_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teacherTasks = pgTable("teacher_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  question: text("question").notNull(),
  answers: json("answers").$type<{ id: string; text: string; isCorrect: boolean; imageUrl?: string; videoUrl?: string }[]>().notNull(),
  questionImages: json("question_images").$type<string[]>().default(sql`'[]'::jsonb`),
  imageUrl: text("image_url"),
  gifUrl: text("gif_url"),
  videoUrl: text("video_url"),
  coverImageUrl: text("cover_image_url"),
  subjectLabel: text("subject_label"),
  pointsReward: integer("points_reward").default(10).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  purchaseCount: integer("purchase_count").default(0).notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teacherTaskOrders = pgTable("teacher_task_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherTaskId: varchar("teacher_task_id").notNull().references(() => teacherTasks.id, { onDelete: "restrict" }),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  buyerParentId: varchar("buyer_parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").references(() => children.id, { onDelete: "set null" }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  commissionRatePct: decimal("commission_rate_pct", { precision: 5, scale: 2 }).default("10.00").notNull(),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  teacherEarningAmount: decimal("teacher_earning_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  status: varchar("status", { length: 30 }).default("completed").notNull(),
  holdDays: integer("hold_days").default(7).notNull(),
  isSettled: boolean("is_settled").default(false).notNull(),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teacherBalances = pgTable("teacher_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }).unique(),
  pendingBalance: decimal("pending_balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  availableBalance: decimal("available_balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalSalesAmount: decimal("total_sales_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalCommissionAmount: decimal("total_commission_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalWithdrawnAmount: decimal("total_withdrawn_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teacherWithdrawalRequests = pgTable("teacher_withdrawal_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 40 }).notNull(),
  paymentDetails: json("payment_details").$type<Record<string, any>>(),
  withdrawalCommissionPct: decimal("withdrawal_commission_pct", { precision: 5, scale: 2 }).default("0.00").notNull(),
  withdrawalCommissionAmount: decimal("withdrawal_commission_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  adminNote: text("admin_note"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const childSchoolAssignment = pgTable("child_school_assignment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }).unique(),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const childTeacherAssignment = pgTable("child_teacher_assignment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  subjectLabel: text("subject_label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teacherHiring = pgTable("teacher_hiring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  pricingModel: varchar("pricing_model", { length: 20 }).notNull(),
  agreedRate: decimal("agreed_rate", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  lastPaymentDate: timestamp("last_payment_date"),
  nextPaymentDate: timestamp("next_payment_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schoolReferralSettings = pgTable("school_referral_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pointsPerReferral: integer("points_per_referral").default(50).notNull(),
  pointsPerTeacherAdd: integer("points_per_teacher_add").default(20).notNull(),
  pointsPerStudentJoin: integer("points_per_student_join").default(10).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const schoolReferrals = pgTable("school_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  referredParentId: varchar("referred_parent_id").references(() => parents.id, { onDelete: "set null" }),
  referredChildId: varchar("referred_child_id").references(() => children.id, { onDelete: "set null" }),
  referralCode: varchar("referral_code", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("clicked").notNull(), // clicked | enrolled
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  convertedAt: timestamp("converted_at"),
});

export const teacherReferrals = pgTable("teacher_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  referredParentId: varchar("referred_parent_id").references(() => parents.id, { onDelete: "set null" }),
  referredChildId: varchar("referred_child_id").references(() => children.id, { onDelete: "set null" }),
  referralCode: varchar("referral_code", { length: 24 }).notNull(),
  status: varchar("status", { length: 20 }).default("clicked").notNull(), // clicked | hired | purchased
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  convertedAt: timestamp("converted_at"),
});

export const childReferralVisits = pgTable("child_referral_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  shareCode: varchar("share_code", { length: 12 }).notNull(),
  visitorParentId: varchar("visitor_parent_id").references(() => parents.id, { onDelete: "set null" }),
  visitorChildId: varchar("visitor_child_id").references(() => children.id, { onDelete: "set null" }),
  visitorIp: text("visitor_ip"),
  visitorUserAgent: text("visitor_user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schoolActivityLogs = pgTable("school_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").references(() => schoolTeachers.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(),
  points: integer("points").default(0).notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Teacher Transfers (نقل المعلمين) =====
export const teacherTransfers = pgTable("teacher_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  fromSchoolId: varchar("from_school_id").references(() => schools.id, { onDelete: "set null" }),
  toSchoolId: varchar("to_school_id").references(() => schools.id, { onDelete: "set null" }),
  transferredByType: varchar("transferred_by_type", { length: 10 }).notNull(), // "school" | "admin"
  transferredById: varchar("transferred_by_id").notNull(),
  performanceRating: integer("performance_rating").notNull(), // 1-5
  performanceComment: text("performance_comment").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("completed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Follow System (نظام المتابعة) =====
export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerParentId: varchar("follower_parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 20 }).notNull(), // "school" | "teacher" | "library"
  entityId: varchar("entity_id").notNull(),
  lastCheckedAt: timestamp("last_checked_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueFollow: uniqueIndex("unique_follow_idx").on(table.followerParentId, table.entityType, table.entityId),
  entityIdx: index("follows_entity_idx").on(table.entityType, table.entityId),
}));

export const insertFollowSchema = createInsertSchema(follows).omit({ id: true, createdAt: true });
export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;

// ===== Poll / Voting System (نظام التصويتات) =====
export const schoolPolls = pgTable("school_polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").references(() => schoolTeachers.id, { onDelete: "set null" }),
  authorType: varchar("author_type", { length: 10 }).notNull(), // "school" | "teacher"
  question: text("question").notNull(),
  options: json("options").$type<{ id: string; text: string; imageUrl?: string }[]>().notNull(),
  allowMultiple: boolean("allow_multiple").default(false).notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isClosed: boolean("is_closed").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  totalVotes: integer("total_votes").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const schoolPollVotes = pgTable("school_poll_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => schoolPolls.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  selectedOptions: json("selected_options").$type<string[]>().notNull(), // array of option IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueVote: uniqueIndex("unique_poll_vote_idx").on(table.pollId, table.parentId),
}));

// ===== Library Posts System (منشورات المكتبات) =====
export const libraryPosts = pgTable("library_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  libraryId: varchar("library_id").notNull().references(() => libraries.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mediaUrls: json("media_urls").$type<string[]>().default(sql`'[]'::jsonb`),
  mediaTypes: json("media_types").$type<string[]>().default(sql`'[]'::jsonb`),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const libraryPostComments = pgTable("library_post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => libraryPosts.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const libraryPostLikes = pgTable("library_post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => libraryPosts.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const libraryReviews = pgTable("library_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  libraryId: varchar("library_id").notNull().references(() => libraries.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLibraryPostSchema = createInsertSchema(libraryPosts).omit({ id: true, createdAt: true, updatedAt: true, likesCount: true, commentsCount: true });
export type LibraryPost = typeof libraryPosts.$inferSelect;
export type InsertLibraryPost = z.infer<typeof insertLibraryPostSchema>;

export const insertLibraryPostCommentSchema = createInsertSchema(libraryPostComments).omit({ id: true, createdAt: true });
export type LibraryPostComment = typeof libraryPostComments.$inferSelect;
export type InsertLibraryPostComment = z.infer<typeof insertLibraryPostCommentSchema>;

export type LibraryPostLike = typeof libraryPostLikes.$inferSelect;
export type LibraryReview = typeof libraryReviews.$inferSelect;
export const insertLibraryReviewSchema = createInsertSchema(libraryReviews).omit({ id: true, createdAt: true });
export type InsertLibraryReview = z.infer<typeof insertLibraryReviewSchema>;

// ===== Parent Task Library (مكتبة مهام الأهل) =====
export const parentTaskLibrary = pgTable("parent_task_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  sourceType: varchar("source_type", { length: 20 }).notNull(), // "teacher_task" | "template_task"
  sourceTaskId: varchar("source_task_id").notNull(),
  title: text("title").notNull(),
  question: text("question").notNull(),
  answers: json("answers").$type<TaskAnswerMedia[]>().notNull(),
  imageUrl: text("image_url"),
  gifUrl: text("gif_url"),
  subjectLabel: text("subject_label"),
  pointsReward: integer("points_reward").default(10).notNull(),
  purchaseType: varchar("purchase_type", { length: 20 }).default("permanent").notNull(), // "one_time" | "limited" | "permanent"
  maxUsageCount: integer("max_usage_count"), // null = unlimited (permanent), number for limited uses
  usageCount: integer("usage_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  parentIdx: index("ptl_parent_idx").on(table.parentId),
  sourceIdx: index("ptl_source_idx").on(table.sourceType, table.sourceTaskId),
}));

export const insertParentTaskLibrarySchema = createInsertSchema(parentTaskLibrary).omit({ id: true, createdAt: true, usageCount: true });
export type ParentTaskLibrary = typeof parentTaskLibrary.$inferSelect;
export type InsertParentTaskLibrary = z.infer<typeof insertParentTaskLibrarySchema>;

// ===== Task Favorites (المهام المفضلة) =====
export const taskFavorites = pgTable("task_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  taskType: varchar("task_type", { length: 20 }).notNull(), // "teacher_task" | "template_task"
  taskId: varchar("task_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueFav: uniqueIndex("unique_task_fav_idx").on(table.parentId, table.taskType, table.taskId),
  parentFavIdx: index("tf_parent_idx").on(table.parentId),
}));

export const insertTaskFavoriteSchema = createInsertSchema(taskFavorites).omit({ id: true, createdAt: true });
export type TaskFavorite = typeof taskFavorites.$inferSelect;
export type InsertTaskFavorite = z.infer<typeof insertTaskFavoriteSchema>;

// ===== Teacher Task Likes (إعجاب المهام) =====
export const teacherTaskLikes = pgTable("teacher_task_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => teacherTasks.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueLike: uniqueIndex("unique_task_like_idx").on(table.taskId, table.parentId),
  taskIdx: index("ttl_task_idx").on(table.taskId),
}));

export type TeacherTaskLike = typeof teacherTaskLikes.$inferSelect;

// ===== Task Cart (سلة المهام) =====
export const taskCart = pgTable("task_cart", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  teacherTaskId: varchar("teacher_task_id").notNull().references(() => teacherTasks.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueCartItem: uniqueIndex("unique_cart_item_idx").on(table.parentId, table.teacherTaskId),
  parentCartIdx: index("tc_parent_idx").on(table.parentId),
}));

export type TaskCartItem = typeof taskCart.$inferSelect;

// ===== Child Friendships (صداقات الأطفال) =====
export const childFriendships = pgTable("child_friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  addresseeId: varchar("addressee_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, accepted, rejected, blocked
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueFriendship: uniqueIndex("unique_friendship_idx").on(table.requesterId, table.addresseeId),
  requesterIdx: index("cf_requester_idx").on(table.requesterId),
  addresseeIdx: index("cf_addressee_idx").on(table.addresseeId),
}));

export type ChildFriendship = typeof childFriendships.$inferSelect;

// ===== Friend Activity Notifications (إشعارات نشاط الأصدقاء) =====
export const childFriendNotifications = pgTable("child_friend_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  fromChildId: varchar("from_child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // achievement, level_up, task_streak, watering, points_milestone, new_friend
  title: text("title").notNull(),
  message: text("message").notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  childIdx: index("cfn_child_idx").on(table.childId),
  readIdx: index("cfn_read_idx").on(table.childId, table.isRead),
}));

export type ChildFriendNotification = typeof childFriendNotifications.$inferSelect;

// ===== Child Follows (متابعات الأطفال) =====
export const childFollows = pgTable("child_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull(), // id of child, school, or teacher
  followingType: varchar("following_type", { length: 20 }).notNull(), // child, school, teacher
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueFollow: uniqueIndex("unique_child_follow_idx").on(table.followerId, table.followingId, table.followingType),
  followerIdx: index("cfl_follower_idx").on(table.followerId),
  followingIdx: index("cfl_following_idx").on(table.followingId, table.followingType),
}));

export type ChildFollow = typeof childFollows.$inferSelect;
// ===== Child Posts (منشورات الأطفال) =====
export const childPosts = pgTable("child_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mediaUrls: json("media_urls").$type<string[]>().default(sql`'[]'::jsonb`),
  mediaTypes: json("media_types").$type<string[]>().default(sql`'[]'::jsonb`),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  childIdx: index("cp_child_idx").on(table.childId),
  createdIdx: index("cp_created_idx").on(table.createdAt),
}));

export const childPostComments = pgTable("child_post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => childPosts.id, { onDelete: "cascade" }),
  childId: varchar("child_id").references(() => children.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar"),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const childPostLikes = pgTable("child_post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => childPosts.id, { onDelete: "cascade" }),
  childId: varchar("child_id").references(() => children.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueLike: uniqueIndex("cpl_unique_like_idx").on(table.postId, table.childId),
}));

export type ChildPost = typeof childPosts.$inferSelect;
export type ChildPostComment = typeof childPostComments.$inferSelect;
export type ChildPostLike = typeof childPostLikes.$inferSelect;

// ======= PARENT POSTS =======
export const parentPosts = pgTable("parent_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  content: text("content"),
  mediaUrls: json("media_urls").$type<string[]>().default([]),
  mediaTypes: json("media_types").$type<string[]>().default([]),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const parentPostComments = pgTable("parent_post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => parentPosts.id, { onDelete: "cascade" }),
  authorId: varchar("author_id"),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar"),
  authorType: varchar("author_type", { length: 20 }).default("parent"),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const parentPostLikes = pgTable("parent_post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => parentPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id"),
  userType: varchar("user_type", { length: 20 }).default("parent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueLike: uniqueIndex("ppl_unique_like_idx").on(table.postId, table.userId),
}));

export type ParentPost = typeof parentPosts.$inferSelect;
export type ParentPostComment = typeof parentPostComments.$inferSelect;
export type ParentPostLike = typeof parentPostLikes.$inferSelect;

// ===== Symbol Library (مكتبة الرموز) =====
export const symbolCategories = pgTable("symbol_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  icon: text("icon"), // emoji icon for category itself
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const librarySymbols = pgTable("library_symbols", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => symbolCategories.id, { onDelete: "cascade" }),
  char: text("char").notNull(), // emoji character or unicode symbol
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  tags: json("tags").$type<string[]>().default([]).notNull(),
  imageUrl: text("image_url"), // optional custom image (PNG/SVG)
  price: integer("price").default(0).notNull(), // 0 = free, >0 = premium
  isPremium: boolean("is_premium").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("lsym_category_idx").on(table.categoryId),
  premiumIdx: index("lsym_premium_idx").on(table.isPremium),
}));

export const insertSymbolCategorySchema = createInsertSchema(symbolCategories).omit({ id: true, createdAt: true });
export type SymbolCategory = typeof symbolCategories.$inferSelect;
export type InsertSymbolCategory = z.infer<typeof insertSymbolCategorySchema>;

export const insertLibrarySymbolSchema = createInsertSchema(librarySymbols).omit({ id: true, createdAt: true });
export type LibrarySymbol = typeof librarySymbols.$inferSelect;
export type InsertLibrarySymbol = z.infer<typeof insertLibrarySymbolSchema>;

// ===== School Enrollment System =====

export const schoolEnrollments = pgTable("school_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | approved | rejected
  parentNote: text("parent_note"),
  rejectionReason: text("rejection_reason"),
  attachments: json("attachments").$type<{ url: string; name: string; type: string; size?: number }[]>().default(sql`'[]'::jsonb`),
  childProfileSnapshot: json("child_profile_snapshot").$type<{
    name: string;
    age?: number;
    birthday?: string;
    governorate?: string;
    schoolName?: string;
    academicGrade?: string;
    hobbies?: string;
    avatarUrl?: string;
    totalPoints: number;
    interests?: string[];
    bio?: string;
    profileCompleteness: number;
  }>(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"), // 'school' or admin identifier
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  schoolIdx: index("enrollment_school_idx").on(table.schoolId),
  parentIdx: index("enrollment_parent_idx").on(table.parentId),
  childIdx: index("enrollment_child_idx").on(table.childId),
  statusIdx: index("enrollment_status_idx").on(table.status),
}));

export const insertSchoolEnrollmentSchema = createInsertSchema(schoolEnrollments).omit({ id: true, createdAt: true, reviewedAt: true, reviewedBy: true });
export type SchoolEnrollment = typeof schoolEnrollments.$inferSelect;
export type InsertSchoolEnrollment = z.infer<typeof insertSchoolEnrollmentSchema>;

// ===== Teacher Assignment Requests (طلبات تعيين المعلمين) =====
export const teacherAssignmentRequests = pgTable("teacher_assignment_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  monthlyPoints: integer("monthly_points").notNull(),
  perHelpPoints: integer("per_help_points").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | accepted | rejected
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
}, (table) => ({
  parentIdx: index("tar_parent_idx").on(table.parentId),
  teacherIdx: index("tar_teacher_idx").on(table.teacherId),
  statusIdx: index("tar_status_idx").on(table.status),
}));

export const teacherAssignmentRequestChildren = pgTable("teacher_assignment_request_children", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => teacherAssignmentRequests.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
}, (table) => ({
  requestIdx: index("tarc_request_idx").on(table.requestId),
  childIdx: index("tarc_child_idx").on(table.childId),
}));

// ===== Teacher Child Permissions (صلاحيات المعلم للأطفال) =====
export const teacherChildPermissions = pgTable("teacher_child_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  requestId: varchar("request_id").notNull().references(() => teacherAssignmentRequests.id, { onDelete: "cascade" }),
  monthlyPoints: integer("monthly_points").notNull(),
  perHelpPoints: integer("per_help_points").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  teacherIdx: index("tcp_teacher_idx").on(table.teacherId),
  childIdx: index("tcp_child_idx").on(table.childId),
  parentIdx: index("tcp_parent_idx").on(table.parentId),
  uniquePermission: uniqueIndex("tcp_unique_idx").on(table.teacherId, table.childId),
}));

// ===== Task Help Requests (طلبات المساعدة في المهام) =====
export const taskHelpRequests = pgTable("task_help_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  helperType: varchar("helper_type", { length: 10 }).notNull(), // "parent" | "teacher"
  helperId: varchar("helper_id").notNull(), // parentId or teacherId
  slaEscalated: boolean("sla_escalated").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(), // active | resolved
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => ({
  taskIdx: index("thr_task_idx").on(table.taskId),
  childIdx: index("thr_child_idx").on(table.childId),
  helperIdx: index("thr_helper_idx").on(table.helperType, table.helperId),
}));

// ===== Task Help Messages (رسائل المساعدة) =====
export const taskHelpMessages = pgTable("task_help_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  helpRequestId: varchar("help_request_id").notNull().references(() => taskHelpRequests.id, { onDelete: "cascade" }),
  senderType: varchar("sender_type", { length: 10 }).notNull(), // "child" | "parent" | "teacher"
  senderId: varchar("sender_id").notNull(),
  messageType: varchar("message_type", { length: 10 }).notNull(), // "text" | "image" | "voice"
  content: text("content"), // text content
  mediaUrl: text("media_url"), // for images and voice recordings
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  helpRequestIdx: index("thm_help_request_idx").on(table.helpRequestId),
  createdIdx: index("thm_created_idx").on(table.createdAt),
}));

// ===== Task Help Feedback (تقييم جودة جلسة المساعدة) =====
export const taskHelpFeedback = pgTable("task_help_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  helpRequestId: varchar("help_request_id").notNull().references(() => taskHelpRequests.id, { onDelete: "cascade" }).unique(),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").references(() => schoolTeachers.id, { onDelete: "set null" }),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(), // 1..5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  childIdx: index("thf_child_idx").on(table.childId),
  teacherIdx: index("thf_teacher_idx").on(table.teacherId),
  parentIdx: index("thf_parent_idx").on(table.parentId),
}));

// ===== Teacher Help Session Payments (سجل مالي لجلسات المساعدة) =====
export const teacherHelpSessionPayments = pgTable("teacher_help_session_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  helpRequestId: varchar("help_request_id").notNull().references(() => taskHelpRequests.id, { onDelete: "cascade" }).unique(),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").references(() => parents.id, { onDelete: "set null" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  perHelpPoints: integer("per_help_points").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("completed").notNull(),
  claimedAt: timestamp("claimed_at"),
  resolvedAt: timestamp("resolved_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  teacherIdx: index("thsp_teacher_idx").on(table.teacherId),
  parentIdx: index("thsp_parent_idx").on(table.parentId),
  childIdx: index("thsp_child_idx").on(table.childId),
}));

export type TeacherAssignmentRequest = typeof teacherAssignmentRequests.$inferSelect;
export type TeacherAssignmentRequestChild = typeof teacherAssignmentRequestChildren.$inferSelect;
export type TeacherChildPermission = typeof teacherChildPermissions.$inferSelect;
export type TaskHelpRequest = typeof taskHelpRequests.$inferSelect;
export type TaskHelpMessage = typeof taskHelpMessages.$inferSelect;
export type TaskHelpFeedback = typeof taskHelpFeedback.$inferSelect;
export type TeacherHelpSessionPayment = typeof teacherHelpSessionPayments.$inferSelect;

// ===== Monthly Subscription Deductions =====
export const monthlySubscriptionDeductions = pgTable("monthly_subscription_deductions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  permissionId: varchar("permission_id").notNull().references(() => teacherChildPermissions.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  pointsDeducted: integer("points_deducted").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  status: varchar("status", { length: 20 }).default("success").notNull(), // success | failed | insufficient_balance
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  permissionMonthIdx: uniqueIndex("msd_permission_month_idx").on(table.permissionId, table.month),
  parentMonthIdx: index("msd_parent_month_idx").on(table.parentId, table.month),
}));

export type MonthlySubscriptionDeduction = typeof monthlySubscriptionDeductions.$inferSelect;

// ===== Parent Audit Logs =====
export const parentAuditLogs = pgTable("parent_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 50 }).notNull(), // profile, password, wallet, deposit, gift, child, task, teacher, screen_time
  entityId: varchar("entity_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  parentIdx: index("pal_parent_idx").on(table.parentId),
  actionIdx: index("pal_action_idx").on(table.action),
  createdIdx: index("pal_created_idx").on(table.createdAt),
}));

export type ParentAuditLog = typeof parentAuditLogs.$inferSelect;

// ===== Parent-Teacher Direct Messages =====
export const parentTeacherConversations = pgTable("parent_teacher_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => schoolTeachers.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  parentUnreadCount: integer("parent_unread_count").default(0),
  teacherUnreadCount: integer("teacher_unread_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  parentTeacherIdx: uniqueIndex("ptc_parent_teacher_idx").on(table.parentId, table.teacherId),
  lastMsgIdx: index("ptc_last_msg_idx").on(table.lastMessageAt),
}));

export const parentTeacherMessages = pgTable("parent_teacher_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => parentTeacherConversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull(),
  senderType: varchar("sender_type", { length: 10 }).notNull(), // "parent" | "teacher"
  content: text("content"),
  mediaUrl: text("media_url"),
  messageType: varchar("message_type", { length: 10 }).default("text").notNull(), // "text" | "image" | "voice"
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index("ptm_conversation_idx").on(table.conversationId),
  createdIdx: index("ptm_created_idx").on(table.createdAt),
}));

export type ParentTeacherConversation = typeof parentTeacherConversations.$inferSelect;
export type ParentTeacherMessage = typeof parentTeacherMessages.$inferSelect;