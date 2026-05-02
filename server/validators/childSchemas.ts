import { z } from "zod";

// ============ Auth / Linking ============

export const childLinkSchema = z.object({
  childName: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  childBirthDate: z.string().max(20).optional(),
  childAge: z.number().int().min(1).max(120).optional(),
});

export const childLoginRequestSchema = z.object({
  childName: z.string().min(1).max(100),
  parentCode: z.string().min(1).max(50),
  deviceId: z.string().max(200).optional(),
  childBirthDate: z.string().max(20).optional(),
  childAge: z.number().int().min(1).max(120).optional(),
});

export const childRequestLoginByNameSchema = z.object({
  childName: z.string().min(1).max(100),
  parentCode: z.string().min(1).max(50),
  deviceId: z.string().max(200).optional(),
});

export const childLogoutSchema = z.object({
  deviceId: z.string().max(200).optional(),
  revokeDevice: z.boolean().optional(),
});

export const childRefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// ============ Profile ============

export const childUpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  birthday: z.string().optional(),
  schoolName: z.string().max(200).optional(),
  academicGrade: z.string().max(50).optional(),
  hobbies: z.string().max(500).optional(),
});

export const childShowcaseSettingsSchema = z.object({
  bio: z.string().max(500).optional(),
  interests: z.string().max(500).optional(),
  profilePublic: z.boolean().optional(),
});

// ============ Tasks ============

export const childSubmitTaskSchema = z.object({
  taskId: z.string().min(1),
  selectedAnswerId: z.string().min(1),
});

export const childAnswerTaskSchema = z.object({
  taskId: z.string().min(1),
  selectedAnswerId: z.string().min(1),
});

export const childCompleteGameSchema = z.object({
  gameId: z.string().min(1),
  score: z.number().int().nonnegative().max(1000000),
  totalQuestions: z.number().int().nonnegative().max(10000).optional(),
});

export const childTaskNotificationCompleteSchema = z.object({
  notificationId: z.string().min(1),
  answerId: z.string().min(1).optional(),
});

// ============ Store ============

export const childPurchaseRequestSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(100).default(1),
});

// ============ Help Chat ============

export const childHelpRequestSchema = z.object({
  taskId: z.string().min(1),
  initialQuestion: z.string().min(1).max(2000),
});

export const childHelpChatMessageSchema = z.object({
  messageType: z.enum(["text", "image", "voice"]).default("text"),
  content: z.string().min(1).max(5000).optional(),
  mediaUrl: z.string().max(2048).optional(),
}).refine(data => data.content || data.mediaUrl, {
  message: "Message content or media is required",
});

// ============ Notifications ============

export const childNotificationSettingsSchema = z.object({
  mode: z.enum(["popup_strict", "popup_soft", "floating_bubble", "normal", "focus", "silent"]),
  repeatDelayMinutes: z.number().int().min(0).max(1440).optional(),
  requireOverlayPermission: z.boolean().optional(),
});

// ============ Push ============

export const childPushSubscriptionSchema = z.object({
  platform: z.enum(["web", "android", "ios"]).default("web"),
  endpoint: z.string().max(2048).optional(),
  token: z.string().max(2048).optional(),
  p256dh: z.string().max(2048).optional(),
  auth: z.string().max(2048).optional(),
  deviceId: z.string().max(200).optional(),
});

// ============ Social ============

export const childCreatePostSchema = z.object({
  content: z.string().min(1).max(5000),
  mediaUrls: z.array(z.string().max(2048)).max(10).optional(),
  mediaTypes: z.array(z.string()).max(10).optional(),
});

export const childCheckLikesSchema = z.object({
  postIds: z.array(z.string().min(1)).min(1).max(100),
});

export const childCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const childFriendRequestSchema = z.object({
  friendId: z.string().min(1),
});

export const childFriendActionSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export const childFollowSchema = z.object({
  followingId: z.string().min(1),
  followingType: z.enum(["child", "parent", "teacher"]),
});

export const childFollowCheckSchema = z.object({
  targets: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(["child", "parent", "teacher"]),
  })).min(1).max(100),
});

export const childNotifyAchievementSchema = z.object({
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
});

// ============ Screen Time ============

export const childScreenTimeHeartbeatSchema = z.object({
  minutes: z.number().int().positive().max(1440).optional(),
});
