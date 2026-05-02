import { z } from "zod";

// ============ Profile ============

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phoneNumber: z.string().max(20).optional(),
  governorate: z.string().max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  avatarUrl: z.string().max(2048).optional().nullable(),
  coverImageUrl: z.string().max(2048).optional().nullable(),
  currentPassword: z.string().min(1).max(128).optional(),
}).refine(data => Object.values(data).some(v => v !== undefined), {
  message: "At least one field is required",
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  otpCode: z.string().min(4).max(10).optional(),
  code: z.string().min(4).max(10).optional(),
  otpId: z.string().optional(),
  otpMethod: z.enum(["email", "sms", "whatsapp"]).default("email"),
}).refine(data => data.otpCode || data.code, {
  message: "OTP code is required",
});

export const deleteAccountSchema = z.object({
  confirmPassword: z.string().min(1),
});

export const roleInterestRequestSchema = z.object({
  roleType: z.enum(["teacher", "school", "library"]),
  phoneNumber: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+0-9\s()-]+$/, "Invalid phone number format"),
});

// ============ Store & Products ============

export const storeCheckoutSchema = z.object({
  productId: z.string().min(1),
  priceTierId: z.string().optional(),
  quantity: z.number().int().positive().max(100).default(1),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().nonnegative().max(1000000),
  pointsPrice: z.number().int().nonnegative().max(1000000).optional(),
  image: z.string().max(2048).optional(),
  stock: z.number().int().nonnegative().max(100000).default(0),
});

export const updateProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().nonnegative().max(1000000).optional(),
  pointsPrice: z.number().int().nonnegative().max(1000000).optional(),
  image: z.string().max(2048).optional(),
  stock: z.number().int().nonnegative().max(100000).optional(),
});

export const storePurchaseSchema = z.object({
  childId: z.string().min(1),
  productId: z.string().min(1),
});

export const checkoutPreviewSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive().max(100),
  })).min(1).max(50),
});

export const checkoutConfirmSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive().max(100),
  })).min(1).max(50),
  paymentReference: z.string().trim().min(4).max(200),
});

export const assignProductToChildSchema = z.object({
  childId: z.string().min(1),
  requiredPoints: z.number().int().nonnegative().max(1000000).optional(),
});

export const requestShippingSchema = z.object({
  shippingAddress: z.string().min(5).max(500),
});

// ============ Financial ============

export const depositSchema = z.object({
  paymentMethodId: z.string().min(1),
  amount: z.union([z.string(), z.number()]).transform(val => {
    const n = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(n) || n <= 0) throw new Error("Invalid amount");
    return n;
  }),
  notes: z.string().max(500).optional(),
  transactionId: z.string().trim().min(4).max(120),
  receiptUrl: z.string().url().max(2048).optional().or(z.literal("")),
});

// ============ Tasks ============

const answerObjectSchema = z.object({
  id: z.string().optional(),
  text: z.string().optional(),
  isCorrect: z.boolean().optional(),
  imageUrl: z.string().max(2048).optional(),
  media: z.object({
    objectPath: z.string().optional(),
    url: z.string().max(4096),
    mimeType: z.string().optional(),
    size: z.number().int().nonnegative().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    purpose: z.string().optional(),
    uploadedByType: z.enum(["admin", "parent", "teacher", "child"]).optional(),
    uploadedById: z.string().optional(),
    createdAt: z.string().optional(),
  }).optional(),
  stickerId: z.string().optional(),
  stickerVariant: z.enum(["full", "circle", "rounded", "diamond"]).optional(),
}).refine((value) => {
  const text = String(value.text || "").trim();
  const imageUrl = String(value.imageUrl || "").trim();
  const mediaUrl = String(value.media?.url || "").trim();
  return text.length > 0 || imageUrl.length > 0 || mediaUrl.length > 0;
}, {
  message: "Answer must include text or media",
});

const answerSchema = z.union([
  z.string().min(1),
  answerObjectSchema,
]);

export const createTaskSchema = z.object({
  childId: z.string().min(1),
  subjectId: z.string().optional(),
  question: z.string().max(5000).optional(),
  answers: z.array(answerSchema).min(2).max(10),
  pointsReward: z.number().int().nonnegative().max(10000).default(10),
  imageUrl: z.string().max(2048).optional(),
  gifUrl: z.string().max(2048).optional(),
}).refine((data) => {
  const question = String(data.question || "").trim();
  const imageUrl = String(data.imageUrl || "").trim();
  const gifUrl = String(data.gifUrl || "").trim();
  return question.length > 0 || imageUrl.length > 0 || gifUrl.length > 0;
}, {
  message: "Question text or media is required",
});

export const createTaskFromTemplateSchema = z.object({
  childId: z.string().min(1),
  templateId: z.string().min(1),
  pointsReward: z.number().int().nonnegative().max(10000).optional(),
});

export const createCustomTaskSchema = z.object({
  title: z.string().min(1).max(500),
  question: z.string().min(1).max(5000),
  answers: z.array(answerSchema).min(2).max(10),
  pointsReward: z.number().int().nonnegative().max(10000).default(10),
  subjectId: z.string().optional(),
  isPublic: z.boolean().default(false),
  pointsCost: z.number().int().nonnegative().max(10000).default(0),
});

export const createAndSendTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  question: z.string().max(5000).optional(),
  answers: z.array(answerSchema).min(2).max(10),
  pointsReward: z.number().int().nonnegative().max(10000).default(10),
  subjectId: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  childId: z.string().min(1),
  saveAsTemplate: z.boolean().default(false),
  taskMedia: z.any().optional(),
}).refine((data) => {
  const question = String(data.question || "").trim();
  const mediaUrl = String(data.taskMedia?.url || "").trim();
  return question.length > 0 || mediaUrl.length > 0;
}, {
  message: "Question text or media is required",
});

export const sendTemplateTaskSchema = z.object({
  templateTaskId: z.string().min(1),
  childId: z.string().min(1),
  points: z.number().int().nonnegative().max(10000).optional(),
});

export const scheduledTaskSchema = z.object({
  childId: z.string().min(1),
  templateTaskId: z.string().optional(),
  question: z.string().min(1).max(5000).optional(),
  answers: z.array(answerSchema).min(2).max(10).optional(),
  pointsReward: z.number().int().nonnegative().max(10000).default(10),
  scheduledAt: z.string().min(1),
});

export const scheduledSessionSchema = z.object({
  childId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  intervalMinutes: z.number().int().positive().max(1440).default(30),
  activationType: z.enum(["manual", "immediate", "scheduled"]).default("manual"),
  scheduledStartAt: z.string().optional(),
  tasks: z.array(z.object({
    templateTaskId: z.string().optional(),
    question: z.string().optional(),
    answers: z.array(answerSchema).optional(),
    pointsReward: z.number().int().nonnegative().max(10000).optional(),
  })).min(1).max(50),
});

// ============ Gifts ============

export const sendGiftSchema = z.object({
  entitlementId: z.string().min(1),
  childId: z.string().min(1),
  pointsThreshold: z.number().int().nonnegative().max(1000000).optional(),
  message: z.string().max(500).optional(),
});

export const revokeGiftSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ============ Teacher Assignment ============

export const teacherAssignmentSchema = z.object({
  teacherId: z.string().min(1),
  childIds: z.array(z.string().min(1)).min(1).max(50),
  monthlyPoints: z.number().int().nonnegative().max(1000000),
  perHelpPoints: z.number().int().nonnegative().max(1000000),
});

// ============ Help Chat ============

export const helpChatMessageSchema = z.object({
  messageType: z.enum(["text", "image", "voice"]).default("text"),
  content: z.string().min(1).max(5000).optional(),
  mediaUrl: z.string().max(2048).optional(),
}).refine(data => data.content || data.mediaUrl, {
  message: "Message content or media is required",
});

// ============ Notifications ============

export const respondLoginSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

// ============ Games ============

export const updateChildGamesSchema = z.object({
  gameIds: z.array(z.string()).optional(),
  maxPlaysPerDay: z.number().int().nonnegative().max(100).optional(),
});

// ============ Social ============

export const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  mediaUrls: z.array(z.string().max(2048)).max(10).optional(),
  mediaTypes: z.array(z.string()).max(10).optional(),
});

export const checkLikesSchema = z.object({
  postIds: z.array(z.string().min(1)).min(1).max(100),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const socialLinksSchema = z.object({
  socialLinks: z.any(),
});

// ============ Push Subscriptions ============

export const pushSubscriptionSchema = z.object({
  platform: z.enum(["web", "android", "ios"]).default("web"),
  endpoint: z.string().max(2048).optional(),
  token: z.string().max(2048).optional(),
  p256dh: z.string().max(2048).optional(),
  auth: z.string().max(2048).optional(),
  deviceId: z.string().max(200).optional(),
});

export const notificationPreferencesSchema = z.object({
  webPushEnabled: z.boolean().optional(),
  mutedTypes: z.array(z.string().min(1).max(80)).max(100).optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
});

// ============ Screen Time ============

export const screenTimeSchema = z.object({
  dailyLimitMinutes: z.number().int().min(5).max(1440).optional(),
  isEnabled: z.boolean().optional(),
  allowedStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  allowedEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});
