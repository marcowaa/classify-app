import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import {
  schools,
  schoolTeachers,
  schoolPosts,
  schoolPostComments,
  schoolPostLikes,
  teacherReviews,
  teacherTasks,
  teacherTaskOrders,
  teacherBalances,
  teacherWithdrawalRequests,
  teacherHiring,
  childTeacherAssignment,
  teacherReferrals,
  parentChild,
  schoolActivityLogs,
  schoolReferralSettings,
  parents,
  children,
  templateTasks,
  subjects,
  schoolPolls,
  schoolPollVotes,
  notifications,
  teacherAssignmentRequests,
  teacherAssignmentRequestChildren,
  teacherChildPermissions,
  taskHelpRequests,
  taskHelpMessages,
  teacherHelpSessionPayments,
  taskHelpFeedback,
  tasks,
  teacherPushSubscriptions,
  parentTeacherConversations,
  parentTeacherMessages,
} from "../../shared/schema";
import { eq, desc, and, sql, lte, count, or } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { createPresignedUpload, finalizeUpload, resolveUploadProxyTargetByObjectPath } from "../services/uploadService";
import { finalizeUploadSchema } from "../../shared/media";
import { notifyAllAdmins } from "../notifications";
import { getVapidPublicKey } from "../services/webPushService";
import { NOTIFICATION_TYPES, NOTIFICATION_STYLES, NOTIFICATION_PRIORITIES } from "../../shared/notificationTypes";
import { uploadProxyLimiter } from "../utils/rateLimiters";

const db = storage.db;
const HELP_AUTO_ASSIGN_TIMEOUT_SECONDS = 60;
const HELP_FIRST_RESPONSE_SLA_SECONDS = Number(process.env.HELP_FIRST_RESPONSE_SLA_SECONDS || "120");
const JWT_SECRET = process.env["JWT_SECRET"] ?? "";

if (!JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET environment variable is required. Teacher authentication cannot start without it.");
}

// ===== Zod Validation Schemas =====

const answerSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "نص الإجابة مطلوب"),
  isCorrect: z.boolean(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
});

const createTeacherTaskSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  question: z.string().min(1, "السؤال مطلوب"),
  answers: z.array(answerSchema).min(2, "يجب أن يكون هناك إجابتان على الأقل")
    .refine(arr => arr.some(a => a.isCorrect), "يجب تحديد إجابة صحيحة واحدة على الأقل"),
  imageUrl: z.string().nullable().optional(),
  gifUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  questionImages: z.array(z.string()).optional(),
  subjectLabel: z.string().nullable().optional(),
  pointsReward: z.number().min(1).max(10000).optional().default(10),
  price: z.union([z.string(), z.number()]).refine(val => parseFloat(String(val)) >= 0, "السعر يجب أن يكون 0 أو أكثر"),
});

const sendTaskToChildSchema = z.object({
  childId: z.string().min(1, "معرف الطفل مطلوب"),
  question: z.string().min(1, "السؤال مطلوب"),
  answers: z.array(answerSchema).min(2, "يجب أن يكون هناك إجابتان على الأقل")
    .refine(arr => arr.some(a => a.isCorrect), "يجب تحديد إجابة صحيحة واحدة على الأقل"),
  pointsReward: z.number().min(1).max(10000),
  imageUrl: z.string().nullable().optional(),
  gifUrl: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
});

const createTaskFromTemplateSchema = z.object({
  templateId: z.string().min(1, "معرف القالب مطلوب"),
  price: z.union([z.string(), z.number()]).refine(val => parseFloat(String(val)) >= 0, "السعر يجب أن يكون 0 أو أكثر"),
  title: z.string().optional(),
  pointsReward: z.number().min(1).max(10000).optional(),
});

const withdrawalSchema = z.object({
  amount: z.union([z.string(), z.number()]).refine(val => parseFloat(String(val)) > 0, "مبلغ السحب غير صحيح"),
  paymentMethod: z.string().min(1, "طريقة الدفع مطلوبة"),
  paymentDetails: z.any().optional(),
});

// ===== Teacher Middleware =====

interface TeacherRequest extends Request {
  teacher?: { teacherId: string; schoolId: string };
}

const teacherMiddleware = async (req: TeacherRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { teacherId: string; schoolId: string; type: string; exp?: number };

    if (decoded.type !== "teacher") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({ message: "Token expired" });
    }

    const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, decoded.teacherId));
    if (!teacher[0] || !teacher[0].isActive) {
      return res.status(401).json({ message: "Teacher account is deactivated" });
    }

    req.teacher = { teacherId: decoded.teacherId, schoolId: decoded.schoolId };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const optionalAuthMiddleware = (req: any, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const appSecret = process.env["APP_JWT_SECRET"] || process.env["JWT_SECRET"] || "classify-app-2025-secret";
        const decoded = jwt.verify(token, appSecret) as any;
        if (decoded.parentId || decoded.userId) {
          req.authUser = { parentId: decoded.parentId || decoded.userId, type: "parent" };
        } else if (decoded.childId) {
          req.authUser = { childId: decoded.childId, type: "child" };
        }
      }
    }
  } catch {
    // Continue as guest
  }
  next();
};

// ===== Helper Functions =====

async function ensureTeacherBalance(teacherId: string) {
  const rows = await db.select().from(teacherBalances).where(eq(teacherBalances.teacherId, teacherId)).limit(1);
  if (rows[0]) return rows[0];
  const created = await db.insert(teacherBalances).values({ teacherId }).returning();
  return created[0];
}

async function settleMaturedTeacherOrders(teacherId: string) {
  const now = new Date();
  // Orders that are completed and past hold days
  const maturedOrders = await db.select().from(teacherTaskOrders).where(
    and(
      eq(teacherTaskOrders.teacherId, teacherId),
      eq(teacherTaskOrders.status, "completed"),
      eq(teacherTaskOrders.isSettled, false),
    )
  );

  // Filter by hold days
  const readyOrders = maturedOrders.filter((order: any) => {
    const createdDate = new Date(order.createdAt);
    const holdMs = (order.holdDays || 7) * 24 * 60 * 60 * 1000;
    return now.getTime() > createdDate.getTime() + holdMs;
  });

  if (!readyOrders.length) {
    return { maturedCount: 0, releasedAmount: 0 };
  }

  const releasedAmount = readyOrders.reduce((sum: number, row: any) => sum + (parseFloat(String(row.teacherEarningAmount || "0")) || 0), 0);
  const orderIds = readyOrders.map((o: any) => o.id);

  await db.transaction(async (tx: any) => {
    for (const orderId of orderIds) {
      await tx
        .update(teacherTaskOrders)
        .set({ isSettled: true, settledAt: now })
        .where(eq(teacherTaskOrders.id, orderId));
    }

    const existingBalance = await tx.select().from(teacherBalances).where(eq(teacherBalances.teacherId, teacherId)).limit(1);
    if (!existingBalance[0]) {
      await tx.insert(teacherBalances).values({
        teacherId,
        pendingBalance: "0.00",
        availableBalance: releasedAmount.toFixed(2),
      });
    } else {
      await tx
        .update(teacherBalances)
        .set({
          pendingBalance: sql`GREATEST(0, ${teacherBalances.pendingBalance} - ${releasedAmount.toFixed(2)})`,
          availableBalance: sql`${teacherBalances.availableBalance} + ${releasedAmount.toFixed(2)}`,
          updatedAt: now,
        })
        .where(eq(teacherBalances.teacherId, teacherId));
    }
  });

  return { maturedCount: readyOrders.length, releasedAmount };
}

async function generateTeacherReferralCode(): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 12; attempt++) {
    let randomPart = "";
    for (let i = 0; i < 8; i++) {
      randomPart += alphabet[Math.floor(Math.random() * alphabet.length)] || "A";
    }
    const candidate = `TCH${randomPart}`;
    const existing = await db.select({ id: schoolTeachers.id }).from(schoolTeachers)
      .where(eq(schoolTeachers.referralCode, candidate)).limit(1);
    if (!existing[0]) {
      return candidate;
    }
  }
  return `TCH${Date.now().toString(36).toUpperCase()}`;
}

async function ensureTeacherReferralCode(teacherId: string, currentCode?: string | null): Promise<string> {
  const normalized = String(currentCode || "").trim().toUpperCase();
  if (normalized) return normalized;
  const generated = await generateTeacherReferralCode();
  await db.update(schoolTeachers).set({ referralCode: generated, updatedAt: new Date() }).where(eq(schoolTeachers.id, teacherId));
  return generated;
}

async function resolveTeacherReferralPoints(): Promise<number> {
  const settings = await db.select().from(schoolReferralSettings).limit(1);
  return settings[0]?.pointsPerReferral || 50;
}

async function convertTeacherReferral(input: {
  teacherId: string;
  schoolId: string;
  parentId: string;
  childId?: string | null;
  status: "hired" | "purchased";
  referralCode?: string | null;
}) {
  const normalizedCode = String(input.referralCode || "").trim().toUpperCase();
  const points = await resolveTeacherReferralPoints();

  const referralMatch = await db.select().from(teacherReferrals)
    .where(
      and(
        eq(teacherReferrals.teacherId, input.teacherId),
        eq(teacherReferrals.status, "clicked"),
        normalizedCode
          ? eq(teacherReferrals.referralCode, normalizedCode)
          : eq(teacherReferrals.referredParentId, input.parentId)
      )
    )
    .orderBy(desc(teacherReferrals.createdAt))
    .limit(1);

  if (referralMatch[0]) {
    await db.update(teacherReferrals)
      .set({
        status: input.status,
        referredParentId: input.parentId,
        referredChildId: input.childId || null,
        pointsAwarded: points,
        convertedAt: new Date(),
      })
      .where(eq(teacherReferrals.id, referralMatch[0].id));
    return;
  }

  if (normalizedCode) {
    await db.insert(teacherReferrals).values({
      teacherId: input.teacherId,
      schoolId: input.schoolId,
      referredParentId: input.parentId,
      referredChildId: input.childId || null,
      referralCode: normalizedCode,
      status: input.status,
      pointsAwarded: points,
      convertedAt: new Date(),
    });
  }
}

// ===== Register Routes =====

export async function registerTeacherRoutes(app: Express) {

  // ===== Auth =====

  app.post("/api/teacher/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.username, username));
      if (!teacher[0]) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      if (!teacher[0].isActive) {
        return res.status(401).json({ message: "الحساب غير نشط" });
      }

      const passwordMatch = await bcrypt.compare(password, teacher[0].password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      // Check if the school is also active
      const school = await db.select().from(schools).where(eq(schools.id, teacher[0].schoolId));
      if (!school[0] || !school[0].isActive) {
        return res.status(401).json({ message: "المدرسة المرتبطة غير نشطة" });
      }

      const referralCode = await ensureTeacherReferralCode(teacher[0].id, teacher[0].referralCode);

      const token = jwt.sign(
        { teacherId: teacher[0].id, schoolId: teacher[0].schoolId, type: "teacher" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.json({
        success: true,
        token,
        teacher: {
          id: teacher[0].id,
          name: teacher[0].name,
          avatarUrl: teacher[0].avatarUrl,
          subject: teacher[0].subject,
          schoolId: teacher[0].schoolId,
          schoolName: school[0].name,
          referralCode,
        }
      });
    } catch (error: any) {
      console.error("Teacher login error:", error);
      res.status(500).json({ message: "فشل تسجيل الدخول" });
    }
  });

  // ===== Profile =====

  app.get("/api/teacher/profile", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, teacherId));

      if (!teacher[0]) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      const referralCode = await ensureTeacherReferralCode(teacherId, teacher[0].referralCode);

      const { password, ...safeTeacher } = teacher[0];

      const school = await db.select({ name: schools.name, imageUrl: schools.imageUrl }).from(schools).where(eq(schools.id, teacher[0].schoolId));
      const tasksCount = await db.select().from(teacherTasks).where(eq(teacherTasks.teacherId, teacherId));
      const studentsCount = await db.select().from(childTeacherAssignment).where(eq(childTeacherAssignment.teacherId, teacherId));
      const reviewsData = await db.select().from(teacherReviews).where(eq(teacherReviews.teacherId, teacherId));
      const postsCount = await db.select().from(schoolPosts).where(and(eq(schoolPosts.teacherId, teacherId), eq(schoolPosts.authorType, "teacher")));

      const avgRating = reviewsData.length > 0
        ? reviewsData.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsData.length
        : 0;

      res.json({
        success: true,
        data: {
          ...safeTeacher,
          referralCode,
          schoolName: school[0]?.name,
          schoolImageUrl: school[0]?.imageUrl,
          stats: {
            tasksCount: tasksCount.length,
            studentsCount: studentsCount.length,
            postsCount: postsCount.length,
            reviewsCount: reviewsData.length,
            avgRating: Math.round(avgRating * 10) / 10,
          }
        }
      });
    } catch (error: any) {
      console.error("Get teacher profile error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put("/api/teacher/profile", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { name, avatarUrl, coverImageUrl, birthday, bio, subject, yearsExperience, socialLinks } = req.body;

      const updates: any = { updatedAt: new Date() };
      if (name) updates.name = name;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
      if (birthday !== undefined) updates.birthday = birthday;
      if (bio !== undefined) updates.bio = bio;
      if (subject !== undefined) updates.subject = subject;
      if (yearsExperience !== undefined) updates.yearsExperience = yearsExperience;
      if (socialLinks !== undefined) updates.socialLinks = socialLinks;

      const updated = await db.update(schoolTeachers).set(updates)
        .where(eq(schoolTeachers.id, teacherId))
        .returning();

      const { password, ...safe } = updated[0];
      res.json({ success: true, data: safe });
    } catch (error: any) {
      console.error("Update teacher profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ===== File Uploads =====

  app.post("/api/teacher/uploads/presign", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const body = z
        .object({
          contentType: z.string().min(1),
          size: z.number().int().positive(),
          purpose: z.string().min(1),
          originalName: z.string().min(1),
        })
        .parse(req.body);

      const result = await createPresignedUpload({
        actor: { type: "parent", id: req.teacher!.teacherId },
        purpose: body.purpose,
        contentType: body.contentType,
        size: body.size,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error("Teacher upload presign error:", error);
      res.status(500).json({ success: false, message: "فشل إنشاء رابط الرفع" });
    }
  });

  app.post("/api/teacher/uploads/finalize", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const body = finalizeUploadSchema.parse(req.body);
      const media = await finalizeUpload({
        actor: { type: "parent", id: req.teacher!.teacherId },
        input: body,
      });

      res.json({ success: true, data: media });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error?.message === "OBJECT_NOT_FOUND") {
        return res.status(400).json({ success: false, message: "الملف غير موجود في التخزين" });
      }
      console.error("Teacher upload finalize error:", error);
      res.status(500).json({ success: false, message: "فشل تأكيد رفع الملف" });
    }
  });

  app.put("/api/teacher/uploads/proxy", teacherMiddleware, uploadProxyLimiter, async (req: TeacherRequest, res) => {
    try {
      const target = resolveUploadProxyTargetByObjectPath({
        actor: { type: "parent", id: req.teacher!.teacherId },
        objectPath: req.headers["x-upload-object-path"],
      });
      if (!target.ok) {
        return res.status(400).json({ success: false, message: "جلسة رفع غير صالحة" });
      }

      const upstreamRequestInit: any = {
        method: "PUT",
        headers: {
          "Content-Type": String(req.headers["content-type"] || "application/octet-stream"),
          ...(req.headers["content-length"] ? { "Content-Length": String(req.headers["content-length"]) } : {}),
        },
        body: req as any,
        duplex: "half",
      };

      const upstreamRes = await fetch(target.targetUrl, upstreamRequestInit);

      if (!upstreamRes.ok) {
        const details = await upstreamRes.text().catch(() => "");
        return res.status(502).json({
          success: false,
          message: "فشل رفع الملف إلى التخزين",
          details: details.slice(0, 500),
        });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Teacher upload proxy error:", error);
      return res.status(500).json({ success: false, message: "فشل رفع الملف عبر الخادم" });
    }
  });

  // ===== Posts (Teacher perspective) =====

  app.get("/api/teacher/posts", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const posts = await db.select().from(schoolPosts)
        .where(and(eq(schoolPosts.teacherId, teacherId), eq(schoolPosts.authorType, "teacher")))
        .orderBy(desc(schoolPosts.createdAt));

      res.json({ success: true, data: posts });
    } catch (error: any) {
      console.error("Get teacher posts error:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post("/api/teacher/posts", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const schoolId = req.teacher!.schoolId;
      const { content, mediaUrls, mediaTypes } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: "محتوى المنشور مطلوب" });
      }

      const post = await db.insert(schoolPosts).values({
        schoolId,
        teacherId,
        authorType: "teacher",
        content: content.trim(),
        mediaUrls: mediaUrls || [],
        mediaTypes: mediaTypes || [],
      }).returning();

      // Log activity for the school
      await db.insert(schoolActivityLogs).values({
        schoolId,
        teacherId,
        action: "teacher_post_created",
        points: 2,
        metadata: { postId: post[0].id },
      });

      await db.update(schools)
        .set({
          activityScore: sql`${schools.activityScore} + 2`,
          updatedAt: new Date(),
        })
        .where(eq(schools.id, schoolId));

      res.json({ success: true, data: post[0] });
    } catch (error: any) {
      console.error("Create teacher post error:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.put("/api/teacher/posts/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;
      const { content, mediaUrls, mediaTypes, isActive } = req.body;

      const post = await db.select().from(schoolPosts)
        .where(and(eq(schoolPosts.id, id), eq(schoolPosts.teacherId, teacherId), eq(schoolPosts.authorType, "teacher")));

      if (!post[0]) {
        return res.status(404).json({ message: "المنشور غير موجود" });
      }

      const updates: any = { updatedAt: new Date() };
      if (content) updates.content = content.trim();
      if (mediaUrls !== undefined) updates.mediaUrls = mediaUrls;
      if (mediaTypes !== undefined) updates.mediaTypes = mediaTypes;
      if (typeof isActive === "boolean") updates.isActive = isActive;

      const updated = await db.update(schoolPosts).set(updates)
        .where(eq(schoolPosts.id, id))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Update teacher post error:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete("/api/teacher/posts/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;

      const post = await db.select().from(schoolPosts)
        .where(and(eq(schoolPosts.id, id), eq(schoolPosts.teacherId, teacherId), eq(schoolPosts.authorType, "teacher")));

      if (!post[0]) {
        return res.status(404).json({ message: "المنشور غير موجود" });
      }

      await db.delete(schoolPosts).where(eq(schoolPosts.id, id));
      res.json({ success: true, message: "تم حذف المنشور" });
    } catch (error: any) {
      console.error("Delete teacher post error:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // ===== Tasks CRUD =====

  app.get("/api/teacher/tasks", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const tasks = await db.select().from(teacherTasks)
        .where(eq(teacherTasks.teacherId, teacherId))
        .orderBy(desc(teacherTasks.createdAt));

      res.json({ success: true, data: tasks });
    } catch (error: any) {
      console.error("Get teacher tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/teacher/tasks", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const parsed = createTeacherTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "بيانات غير صحيحة" });
      }
      const { title, question, answers, imageUrl, gifUrl, videoUrl, coverImageUrl, questionImages, subjectLabel, pointsReward, price } = parsed.data;

      const task = await db.insert(teacherTasks).values({
        teacherId,
        title,
        question,
        answers,
        imageUrl: imageUrl || null,
        gifUrl: gifUrl || null,
        videoUrl: videoUrl || null,
        coverImageUrl: coverImageUrl || null,
        questionImages: questionImages || [],
        subjectLabel: subjectLabel || null,
        pointsReward: pointsReward || 10,
        price: String(price),
      }).returning();

      // Update teacher activity score
      await db.update(schoolTeachers).set({
        activityScore: sql`${schoolTeachers.activityScore} + 3`,
        updatedAt: new Date(),
      }).where(eq(schoolTeachers.id, teacherId));

      res.json({ success: true, data: task[0] });
    } catch (error: any) {
      console.error("Create teacher task error:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/teacher/tasks/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;
      const { title, question, answers, imageUrl, gifUrl, videoUrl, coverImageUrl, questionImages, subjectLabel, pointsReward, price, isActive, isPublic } = req.body;

      const task = await db.select().from(teacherTasks)
        .where(and(eq(teacherTasks.id, id), eq(teacherTasks.teacherId, teacherId)));

      if (!task[0]) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }

      const updates: any = { updatedAt: new Date() };
      if (title) updates.title = title;
      if (question) updates.question = question;
      if (answers) updates.answers = answers;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (gifUrl !== undefined) updates.gifUrl = gifUrl;
      if (videoUrl !== undefined) updates.videoUrl = videoUrl;
      if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
      if (questionImages !== undefined) updates.questionImages = questionImages;
      if (subjectLabel !== undefined) updates.subjectLabel = subjectLabel;
      if (pointsReward !== undefined) updates.pointsReward = pointsReward;
      if (price !== undefined) updates.price = String(price);
      if (typeof isActive === "boolean") updates.isActive = isActive;
      if (typeof isPublic === "boolean") updates.isPublic = isPublic;

      const updated = await db.update(teacherTasks).set(updates)
        .where(eq(teacherTasks.id, id))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Update teacher task error:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/teacher/tasks/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;

      const task = await db.select().from(teacherTasks)
        .where(and(eq(teacherTasks.id, id), eq(teacherTasks.teacherId, teacherId)));

      if (!task[0]) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }

      // Check if task has orders
      const orders = await db.select().from(teacherTaskOrders).where(eq(teacherTaskOrders.teacherTaskId, id));
      if (orders.length > 0) {
        // Soft-delete
        await db.update(teacherTasks).set({ isActive: false, updatedAt: new Date() }).where(eq(teacherTasks.id, id));
        return res.json({ success: true, message: "تم تعطيل المهمة (لا يمكن حذفها لوجود طلبات)" });
      }

      await db.delete(teacherTasks).where(eq(teacherTasks.id, id));
      res.json({ success: true, message: "تم حذف المهمة" });
    } catch (error: any) {
      console.error("Delete teacher task error:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // ===== Orders =====

  app.get("/api/teacher/orders", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const orders = await db.select({
        order: teacherTaskOrders,
        taskTitle: teacherTasks.title,
        buyerName: parents.name,
        childName: children.name,
      })
        .from(teacherTaskOrders)
        .leftJoin(teacherTasks, eq(teacherTaskOrders.teacherTaskId, teacherTasks.id))
        .leftJoin(parents, eq(teacherTaskOrders.buyerParentId, parents.id))
        .leftJoin(children, eq(teacherTaskOrders.childId, children.id))
        .where(eq(teacherTaskOrders.teacherId, teacherId))
        .orderBy(desc(teacherTaskOrders.createdAt));

      const data = orders.map((row: any) => ({
        ...row.order,
        taskTitle: row.taskTitle,
        buyerName: row.buyerName,
        childName: row.childName,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Get teacher orders error:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // ===== Balance & Withdrawals =====

  app.get("/api/teacher/balance", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      await settleMaturedTeacherOrders(teacherId);

      const balance = await ensureTeacherBalance(teacherId);
      const pendingWithdrawals = await db
        .select()
        .from(teacherWithdrawalRequests)
        .where(and(eq(teacherWithdrawalRequests.teacherId, teacherId), eq(teacherWithdrawalRequests.status, "pending")))
        .orderBy(desc(teacherWithdrawalRequests.requestedAt));

      res.json({
        success: true,
        data: {
          ...balance,
          pendingWithdrawals,
        },
      });
    } catch (error: any) {
      console.error("Get teacher balance error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch balance" });
    }
  });

  app.post("/api/teacher/withdrawals", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const parsed = withdrawalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message || "بيانات غير صحيحة" });
      }
      const { amount, paymentMethod, paymentDetails } = parsed.data;

      const requestedAmount = parseFloat(String(amount));
      if (!paymentMethod) {
        return res.status(400).json({ success: false, message: "طريقة الدفع مطلوبة" });
      }

      await settleMaturedTeacherOrders(teacherId);
      const balance = await ensureTeacherBalance(teacherId);
      const available = parseFloat(String(balance.availableBalance || "0")) || 0;
      if (requestedAmount > available) {
        return res.status(400).json({ success: false, message: "الرصيد المتاح غير كافٍ" });
      }

      // Get withdrawal commission from teacher's school
      const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, teacherId)).limit(1);
      const school = teacher[0] ? await db.select().from(schools).where(eq(schools.id, teacher[0].schoolId)).limit(1) : [];
      const withdrawalCommPct = parseFloat(String(school[0]?.withdrawalCommissionPct || "0"));
      const commissionAmount = (requestedAmount * withdrawalCommPct) / 100;
      const netAmount = requestedAmount - commissionAmount;

      const now = new Date();
      const created = await db.transaction(async (tx: any) => {
        await tx
          .update(teacherBalances)
          .set({
            availableBalance: sql`${teacherBalances.availableBalance} - ${requestedAmount.toFixed(2)}`,
            updatedAt: now,
          })
          .where(eq(teacherBalances.teacherId, teacherId));

        const inserted = await tx.insert(teacherWithdrawalRequests).values({
          teacherId,
          amount: requestedAmount.toFixed(2),
          paymentMethod: String(paymentMethod),
          paymentDetails: paymentDetails || null,
          withdrawalCommissionPct: withdrawalCommPct.toFixed(2),
          withdrawalCommissionAmount: commissionAmount.toFixed(2),
          netAmount: netAmount.toFixed(2),
          status: "pending",
        }).returning();

        return inserted[0];
      });

      // Notify admins about new teacher withdrawal request
      try {
        const teacherInfo = await db.select({ name: schoolTeachers.name }).from(schoolTeachers).where(eq(schoolTeachers.id, teacherId)).limit(1);
        const teacherName = teacherInfo[0]?.name || "معلم";
        await notifyAllAdmins({
          type: NOTIFICATION_TYPES.WITHDRAWAL_APPROVED,
          title: "💰 طلب سحب معلم",
          message: `${teacherName} طلب سحب $${requestedAmount.toFixed(2)} عبر ${paymentMethod}`,
          style: NOTIFICATION_STYLES.TOAST,
          priority: NOTIFICATION_PRIORITIES.URGENT,
          soundAlert: true,
          relatedId: created.id,
          metadata: { teacherId, teacherName, amount: requestedAmount, paymentMethod },
        });
      } catch (err) {
        console.error("Failed to notify admins about teacher withdrawal:", err);
      }

      res.json({ success: true, data: created, message: "تم إرسال طلب السحب" });
    } catch (error: any) {
      console.error("Create teacher withdrawal error:", error);
      res.status(500).json({ success: false, message: "Failed to create withdrawal request" });
    }
  });

  app.get("/api/teacher/withdrawals", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const rows = await db
        .select()
        .from(teacherWithdrawalRequests)
        .where(eq(teacherWithdrawalRequests.teacherId, teacherId))
        .orderBy(desc(teacherWithdrawalRequests.requestedAt));
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error("Get teacher withdrawals error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch withdrawals" });
    }
  });

  // ===== Students =====

  app.get("/api/teacher/students", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const assignments = await db.select({
        assignment: childTeacherAssignment,
        childName: children.name,
        childAvatar: children.avatarUrl,
        parentName: parents.name,
      })
        .from(childTeacherAssignment)
        .leftJoin(children, eq(childTeacherAssignment.childId, children.id))
        .leftJoin(parentChild, eq(childTeacherAssignment.childId, parentChild.childId))
        .leftJoin(parents, eq(parentChild.parentId, parents.id))
        .where(eq(childTeacherAssignment.teacherId, teacherId))
        .orderBy(desc(childTeacherAssignment.createdAt));

      const data = assignments.map((row: any) => ({
        ...row.assignment,
        childName: row.childName,
        childAvatar: row.childAvatar,
        parentName: row.parentName,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Get teacher students error:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // ===== Hiring Contracts =====

  app.get("/api/teacher/contracts", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const contracts = await db.select({
        contract: teacherHiring,
        parentName: parents.name,
        childName: children.name,
      })
        .from(teacherHiring)
        .leftJoin(parents, eq(teacherHiring.parentId, parents.id))
        .leftJoin(children, eq(teacherHiring.childId, children.id))
        .where(eq(teacherHiring.teacherId, teacherId))
        .orderBy(desc(teacherHiring.createdAt));

      const data = contracts.map((row: any) => ({
        ...row.contract,
        parentName: row.parentName,
        childName: row.childName,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Get teacher contracts error:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // ===== Reviews (read-only) =====

  app.get("/api/teacher/reviews", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const reviews = await db.select({
        review: teacherReviews,
        parentName: parents.name,
      })
        .from(teacherReviews)
        .leftJoin(parents, eq(teacherReviews.parentId, parents.id))
        .where(eq(teacherReviews.teacherId, teacherId))
        .orderBy(desc(teacherReviews.createdAt));

      const data = reviews.map((row: any) => ({
        ...row.review,
        parentName: row.parentName,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Get teacher reviews error:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // ===== Dashboard Stats =====

  app.get("/api/teacher/stats", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;

      const [teacherData] = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, teacherId));
      const tasksList = await db.select().from(teacherTasks).where(eq(teacherTasks.teacherId, teacherId));
      const ordersList = await db.select().from(teacherTaskOrders).where(eq(teacherTaskOrders.teacherId, teacherId));
      const studentsList = await db.select().from(childTeacherAssignment).where(eq(childTeacherAssignment.teacherId, teacherId));
      const reviewsList = await db.select().from(teacherReviews).where(eq(teacherReviews.teacherId, teacherId));
      const helpSessions = await db.select().from(teacherHelpSessionPayments).where(eq(teacherHelpSessionPayments.teacherId, teacherId));
      const balance = await ensureTeacherBalance(teacherId);

      const avgRating = reviewsList.length > 0
        ? reviewsList.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsList.length
        : 0;

      const totalRevenue = ordersList.reduce((sum: number, o: any) => sum + (parseFloat(String(o.teacherEarningAmount || "0")) || 0), 0);

      res.json({
        success: true,
        data: {
          activityScore: teacherData?.activityScore || 0,
          totalTasks: tasksList.length,
          activeTasks: tasksList.filter((t: any) => t.isActive).length,
          totalOrders: ordersList.length,
          totalStudents: studentsList.length,
          totalReviews: reviewsList.length,
          avgRating: Math.round(avgRating * 10) / 10,
          totalHelpSessions: helpSessions.length,
          totalRevenue: totalRevenue.toFixed(2),
          availableBalance: balance.availableBalance,
          pendingBalance: balance.pendingBalance,
        }
      });
    } catch (error: any) {
      console.error("Get teacher stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ===== Public Teacher Profile =====

  app.get("/api/store/teachers/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const teacher = await db.select({
        id: schoolTeachers.id,
        name: schoolTeachers.name,
        avatarUrl: schoolTeachers.avatarUrl,
        coverImageUrl: schoolTeachers.coverImageUrl,
        bio: schoolTeachers.bio,
        subject: schoolTeachers.subject,
        yearsExperience: schoolTeachers.yearsExperience,
        pricingModel: schoolTeachers.pricingModel,
        monthlyRate: schoolTeachers.monthlyRate,
        perTaskRate: schoolTeachers.perTaskRate,
        socialLinks: schoolTeachers.socialLinks,
        activityScore: schoolTeachers.activityScore,
        totalTasksSold: schoolTeachers.totalTasksSold,
        totalStudents: schoolTeachers.totalStudents,
        referralCode: schoolTeachers.referralCode,
        schoolId: schoolTeachers.schoolId,
        createdAt: schoolTeachers.createdAt,
      }).from(schoolTeachers)
        .where(and(eq(schoolTeachers.id, id), eq(schoolTeachers.isActive, true)));

      if (!teacher[0]) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      const referralCode = await ensureTeacherReferralCode(teacher[0].id, teacher[0].referralCode);

      // Get school info
      const school = await db.select({
        id: schools.id,
        name: schools.name,
        imageUrl: schools.imageUrl,
      }).from(schools).where(eq(schools.id, teacher[0].schoolId));

      // Get tasks
      const tasks = await db.select().from(teacherTasks)
        .where(and(eq(teacherTasks.teacherId, id), eq(teacherTasks.isActive, true), eq(teacherTasks.isPublic, true)))
        .orderBy(desc(teacherTasks.createdAt));

      // Get reviews
      const reviews = await db.select({
        review: teacherReviews,
        parentName: parents.name,
      })
        .from(teacherReviews)
        .leftJoin(parents, eq(teacherReviews.parentId, parents.id))
        .where(and(eq(teacherReviews.teacherId, id), eq(teacherReviews.isActive, true)))
        .orderBy(desc(teacherReviews.createdAt))
        .limit(20);

      const reviewsData = reviews.map((row: any) => ({
        ...row.review,
        parentName: row.parentName,
      }));

      const avgRating = reviewsData.length > 0
        ? reviewsData.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsData.length
        : 0;

      // Get posts
      const posts = await db.select().from(schoolPosts)
        .where(and(eq(schoolPosts.teacherId, id), eq(schoolPosts.authorType, "teacher"), eq(schoolPosts.isActive, true)))
        .orderBy(desc(schoolPosts.createdAt))
        .limit(20);

      res.json({
        success: true,
        data: {
          ...teacher[0],
          referralCode,
          school: school[0] || null,
          tasks,
          reviews: reviewsData,
          avgRating: Math.round(avgRating * 10) / 10,
          posts,
        }
      });
    } catch (error: any) {
      console.error("Get public teacher profile error:", error);
      res.status(500).json({ message: "Failed to fetch teacher" });
    }
  });

  app.get("/api/store/teachers/by-referral/:code", async (req, res) => {
    try {
      const { code } = req.params;
      if (!code || typeof code !== "string" || code.length > 64) {
        return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "Invalid referral code" });
      }

      const teacher = await db.select({
        id: schoolTeachers.id,
        name: schoolTeachers.name,
        avatarUrl: schoolTeachers.avatarUrl,
        bio: schoolTeachers.bio,
        subject: schoolTeachers.subject,
        referralCode: schoolTeachers.referralCode,
        activityScore: schoolTeachers.activityScore,
        totalTasksSold: schoolTeachers.totalTasksSold,
        totalStudents: schoolTeachers.totalStudents,
        schoolId: schoolTeachers.schoolId,
      }).from(schoolTeachers)
        .where(and(eq(schoolTeachers.referralCode, code.trim().toUpperCase()), eq(schoolTeachers.isActive, true)))
        .limit(1);

      if (!teacher[0]) {
        return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Referral teacher not found" });
      }

      return res.json({ success: true, data: teacher[0] });
    } catch (error: any) {
      console.error("Get teacher by referral code error:", error);
      return res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch referral teacher" });
    }
  });

  app.post("/api/store/teachers/:id/referral-click", optionalAuthMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { referralCode } = req.body || {};

      const teacher = await db.select({ id: schoolTeachers.id, schoolId: schoolTeachers.schoolId, referralCode: schoolTeachers.referralCode })
        .from(schoolTeachers)
        .where(and(eq(schoolTeachers.id, id), eq(schoolTeachers.isActive, true)))
        .limit(1);

      if (!teacher[0]) {
        return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Teacher not found" });
      }

      const normalizedCode = String(referralCode || teacher[0].referralCode || "").trim().toUpperCase();
      if (!normalizedCode) {
        return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "Referral code is required" });
      }

      await db.insert(teacherReferrals).values({
        teacherId: teacher[0].id,
        schoolId: teacher[0].schoolId,
        referralCode: normalizedCode,
        referredParentId: req.authUser?.parentId || null,
        referredChildId: req.authUser?.childId || null,
        status: "clicked",
      });

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Record teacher referral click error:", error);
      return res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "Failed to record referral click" });
    }
  });

  // ===== Public: Buy Teacher Task =====

  app.post("/api/store/teachers/:teacherId/tasks/:taskId/buy", async (req, res) => {
    try {
      const { teacherId, taskId } = req.params;
      const { parentId, childId, referralCode } = req.body;

      if (!parentId) {
        return res.status(400).json({ message: "Parent ID required" });
      }

      const task = await db.select().from(teacherTasks).where(
        and(eq(teacherTasks.id, taskId), eq(teacherTasks.teacherId, teacherId), eq(teacherTasks.isActive, true))
      );

      if (!task[0]) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }

      const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, teacherId)).limit(1);
      if (!teacher[0]) {
        return res.status(404).json({ message: "المعلم غير موجود" });
      }

      const price = parseFloat(String(task[0].price));
      const commissionPct = parseFloat(String(teacher[0].commissionRatePct));
      const commissionAmount = (price * commissionPct) / 100;
      const teacherEarning = price - commissionAmount;

      const order = await db.insert(teacherTaskOrders).values({
        teacherTaskId: taskId,
        teacherId,
        buyerParentId: parentId,
        childId: childId || null,
        price: price.toFixed(2),
        commissionRatePct: commissionPct.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        teacherEarningAmount: teacherEarning.toFixed(2),
        status: "completed",
        holdDays: 7,
      }).returning();

      // Update task purchase count
      await db.update(teacherTasks).set({
        purchaseCount: sql`${teacherTasks.purchaseCount} + 1`,
        updatedAt: new Date(),
      }).where(eq(teacherTasks.id, taskId));

      // Update teacher stats
      await db.update(schoolTeachers).set({
        totalTasksSold: sql`${schoolTeachers.totalTasksSold} + 1`,
        updatedAt: new Date(),
      }).where(eq(schoolTeachers.id, teacherId));

      // Add to pending balance
      await ensureTeacherBalance(teacherId);
      await db.update(teacherBalances).set({
        pendingBalance: sql`${teacherBalances.pendingBalance} + ${teacherEarning.toFixed(2)}`,
        totalSalesAmount: sql`${teacherBalances.totalSalesAmount} + ${price.toFixed(2)}`,
        totalCommissionAmount: sql`${teacherBalances.totalCommissionAmount} + ${commissionAmount.toFixed(2)}`,
        updatedAt: new Date(),
      }).where(eq(teacherBalances.teacherId, teacherId));

      await convertTeacherReferral({
        teacherId,
        schoolId: teacher[0].schoolId,
        parentId,
        childId: childId || null,
        status: "purchased",
        referralCode: referralCode || null,
      });

      res.json({ success: true, data: order[0] });
    } catch (error: any) {
      console.error("Buy teacher task error:", error);
      res.status(500).json({ message: "Failed to purchase task" });
    }
  });

  // ===== Public: Teacher Review =====

  app.post("/api/store/teachers/:teacherId/review", async (req, res) => {
    try {
      const { teacherId } = req.params;
      const { parentId, rating, comment } = req.body;

      if (!parentId || !rating) {
        return res.status(400).json({ message: "Parent ID and rating required" });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      // Check if already reviewed
      const existing = await db.select().from(teacherReviews).where(
        and(eq(teacherReviews.teacherId, teacherId), eq(teacherReviews.parentId, parentId))
      );

      if (existing[0]) {
        const updated = await db.update(teacherReviews).set({
          rating,
          comment: comment || null,
        }).where(eq(teacherReviews.id, existing[0].id)).returning();
        return res.json({ success: true, data: updated[0], message: "تم تحديث التقييم" });
      }

      const review = await db.insert(teacherReviews).values({
        teacherId,
        parentId,
        rating,
        comment: comment || null,
      }).returning();

      res.json({ success: true, data: review[0] });
    } catch (error: any) {
      console.error("Submit teacher review error:", error);
      res.status(500).json({ message: "Failed to submit review" });
    }
  });

  // ===== Public: Hire Teacher =====

  app.post("/api/store/teachers/:teacherId/hire", async (req, res) => {
    try {
      const { teacherId } = req.params;
      const { parentId, childId, pricingModel, agreedRate, referralCode } = req.body;

      if (!parentId || !childId || !pricingModel || !agreedRate) {
        return res.status(400).json({ message: "جميع الحقول مطلوبة" });
      }

      const teacher = await db.select().from(schoolTeachers).where(
        and(eq(schoolTeachers.id, teacherId), eq(schoolTeachers.isActive, true))
      );

      if (!teacher[0]) {
        return res.status(404).json({ message: "المعلم غير موجود" });
      }

      // Check if already hired for this child
      const existingHiring = await db.select().from(teacherHiring).where(
        and(
          eq(teacherHiring.teacherId, teacherId),
          eq(teacherHiring.childId, childId),
          eq(teacherHiring.status, "active")
        )
      );

      if (existingHiring[0]) {
        return res.status(400).json({ message: "المعلم معين بالفعل لهذا الطفل" });
      }

      const hiring = await db.insert(teacherHiring).values({
        parentId,
        teacherId,
        childId,
        pricingModel,
        agreedRate: String(agreedRate),
      }).returning();

      // Create teacher assignment
      const existingAssignment = await db.select().from(childTeacherAssignment).where(
        and(eq(childTeacherAssignment.childId, childId), eq(childTeacherAssignment.teacherId, teacherId))
      );

      if (!existingAssignment[0]) {
        await db.insert(childTeacherAssignment).values({
          childId,
          teacherId,
          subjectLabel: teacher[0].subject || null,
        });

        // Update teacher total students
        await db.update(schoolTeachers).set({
          totalStudents: sql`${schoolTeachers.totalStudents} + 1`,
          updatedAt: new Date(),
        }).where(eq(schoolTeachers.id, teacherId));
      }

      await convertTeacherReferral({
        teacherId,
        schoolId: teacher[0].schoolId,
        parentId,
        childId,
        status: "hired",
        referralCode: referralCode || null,
      });

      res.json({ success: true, data: hiring[0] });
    } catch (error: any) {
      console.error("Hire teacher error:", error);
      res.status(500).json({ message: "Failed to hire teacher" });
    }
  });

  // ===== Template Tasks for Teachers =====

  // Get all active subjects
  app.get("/api/teacher/subjects", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const result = await db.select().from(subjects).where(eq(subjects.isActive, true)).orderBy(subjects.name);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch subjects error:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Get template tasks for a subject (admin-created templates for teachers to use)
  app.get("/api/teacher/subjects/:subjectId/templates", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const { subjectId } = req.params;
      const result = await db.select().from(templateTasks)
        .where(and(
          eq(templateTasks.subjectId, subjectId),
          eq(templateTasks.isActive, true),
          eq(templateTasks.createdByParent, false),
        ))
        .orderBy(desc(templateTasks.createdAt));
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch teacher template tasks error:", error);
      res.status(500).json({ message: "Failed to fetch template tasks" });
    }
  });

  // Create task from template (teacher version)
  app.post("/api/teacher/create-task-from-template", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const parsed = createTaskFromTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "بيانات غير صحيحة" });
      }
      const { templateId, price, title, pointsReward } = parsed.data;

      // Get template
      const template = await db.select().from(templateTasks).where(eq(templateTasks.id, templateId));
      if (!template[0]) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }

      // Get subject info for label
      const subjectInfo = await db.select().from(subjects).where(eq(subjects.id, template[0].subjectId));

      const task = await db.insert(teacherTasks).values({
        teacherId,
        title: title || template[0].title || template[0].question.substring(0, 60),
        question: template[0].question,
        answers: template[0].answers,
        subjectLabel: subjectInfo[0]?.name || null,
        pointsReward: pointsReward || template[0].pointsReward,
        price: String(price),
      }).returning();

      // Update teacher activity score
      await db.update(schoolTeachers).set({
        activityScore: sql`${schoolTeachers.activityScore} + 3`,
        updatedAt: new Date(),
      }).where(eq(schoolTeachers.id, teacherId));

      // Increment template usage count
      await db.update(templateTasks).set({
        usageCount: sql`${templateTasks.usageCount} + 1`,
      }).where(eq(templateTasks.id, templateId));

      res.json({ success: true, data: task[0] });
    } catch (error: any) {
      console.error("Create teacher task from template error:", error);
      res.status(500).json({ message: "Failed to create task from template" });
    }
  });

  // ===== Polls — Teacher Management =====

  // Create poll
  app.post("/api/teacher/polls", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const schoolId = req.teacher!.schoolId;
      const { question, options, allowMultiple, isAnonymous, isPinned, expiresAt } = req.body;

      if (!question || !question.trim()) {
        return res.status(400).json({ message: "سؤال التصويت مطلوب" });
      }
      if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
        return res.status(400).json({ message: "يجب إضافة 2-10 خيارات" });
      }

      const formattedOptions = options.map((opt: any, i: number) => ({
        id: String(i + 1),
        text: String(opt.text || opt).trim(),
        ...(opt.imageUrl ? { imageUrl: String(opt.imageUrl) } : {}),
      })).filter((o: any) => o.text);

      if (formattedOptions.length < 2) {
        return res.status(400).json({ message: "يجب إضافة خيارين على الأقل" });
      }

      const poll = await db.insert(schoolPolls).values({
        schoolId,
        teacherId,
        authorType: "teacher",
        question: question.trim(),
        options: formattedOptions,
        allowMultiple: allowMultiple || false,
        isAnonymous: isAnonymous || false,
        isPinned: isPinned || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }).returning();

      // Update teacher activity
      await db.update(schoolTeachers).set({
        activityScore: sql`${schoolTeachers.activityScore} + 3`,
        updatedAt: new Date(),
      }).where(eq(schoolTeachers.id, teacherId));

      res.json({ success: true, data: poll[0] });
    } catch (error: any) {
      console.error("Create teacher poll error:", error);
      res.status(500).json({ message: "فشل إنشاء التصويت" });
    }
  });

  // List polls (teacher’s own)
  app.get("/api/teacher/polls", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const polls = await db.select().from(schoolPolls)
        .where(and(eq(schoolPolls.teacherId, teacherId), eq(schoolPolls.authorType, "teacher")))
        .orderBy(desc(schoolPolls.isPinned), desc(schoolPolls.createdAt));

      const pollsWithStats = await Promise.all(polls.map(async (poll: any) => {
        const votes = await db.select().from(schoolPollVotes)
          .where(eq(schoolPollVotes.pollId, poll.id));

        const optionCounts: Record<string, number> = {};
        poll.options.forEach((o: any) => { optionCounts[o.id] = 0; });
        votes.forEach((v: any) => {
          (v.selectedOptions as string[]).forEach((optId: string) => {
            if (optionCounts[optId] !== undefined) optionCounts[optId]++;
          });
        });

        return {
          ...poll,
          optionCounts,
          votersCount: votes.length,
        };
      }));

      res.json({ success: true, data: pollsWithStats });
    } catch (error: any) {
      console.error("Get teacher polls error:", error);
      res.status(500).json({ message: "فشل جلب التصويتات" });
    }
  });

  // Update poll
  app.put("/api/teacher/polls/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;
      const { isPinned, isClosed, isActive } = req.body;

      const poll = await db.select().from(schoolPolls)
        .where(and(eq(schoolPolls.id, id), eq(schoolPolls.teacherId, teacherId)));
      if (!poll[0]) {
        return res.status(404).json({ message: "التصويت غير موجود" });
      }

      const updates: any = { updatedAt: new Date() };
      if (typeof isPinned === "boolean") updates.isPinned = isPinned;
      if (typeof isClosed === "boolean") updates.isClosed = isClosed;
      if (typeof isActive === "boolean") updates.isActive = isActive;

      const updated = await db.update(schoolPolls).set(updates)
        .where(eq(schoolPolls.id, id)).returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Update teacher poll error:", error);
      res.status(500).json({ message: "فشل تحديث التصويت" });
    }
  });

  // Delete poll
  app.delete("/api/teacher/polls/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;

      const poll = await db.select().from(schoolPolls)
        .where(and(eq(schoolPolls.id, id), eq(schoolPolls.teacherId, teacherId)));
      if (!poll[0]) {
        return res.status(404).json({ message: "التصويت غير موجود" });
      }

      await db.delete(schoolPolls).where(eq(schoolPolls.id, id));
      res.json({ success: true, message: "تم حذف التصويت" });
    } catch (error: any) {
      console.error("Delete teacher poll error:", error);
      res.status(500).json({ message: "فشل حذف التصويت" });
    }
  });

  // ===== Teacher Assignment Requests (طلبات تعيين المعلم) =====

  // List assignment requests for this teacher
  app.get("/api/teacher/assignment-requests", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const status = (req.query.status as string) || undefined;

      let query = db.select({
        request: teacherAssignmentRequests,
        parent: {
          id: parents.id,
          name: parents.name,
          avatarUrl: parents.avatarUrl,
        },
      })
        .from(teacherAssignmentRequests)
        .leftJoin(parents, eq(teacherAssignmentRequests.parentId, parents.id))
        .where(eq(teacherAssignmentRequests.teacherId, teacherId))
        .orderBy(desc(teacherAssignmentRequests.createdAt));

      if (status) {
        query = db.select({
          request: teacherAssignmentRequests,
          parent: {
            id: parents.id,
            name: parents.name,
            avatarUrl: parents.avatarUrl,
          },
        })
          .from(teacherAssignmentRequests)
          .leftJoin(parents, eq(teacherAssignmentRequests.parentId, parents.id))
          .where(and(eq(teacherAssignmentRequests.teacherId, teacherId), eq(teacherAssignmentRequests.status, status)))
          .orderBy(desc(teacherAssignmentRequests.createdAt));
      }

      const requests = await query;

      // Get children for each request
      const result = await Promise.all(requests.map(async (r: any) => {
        const childrenRows = await db.select({
          id: children.id,
          name: children.name,
          avatarUrl: children.avatarUrl,
        })
          .from(teacherAssignmentRequestChildren)
          .innerJoin(children, eq(teacherAssignmentRequestChildren.childId, children.id))
          .where(eq(teacherAssignmentRequestChildren.requestId, r.request.id));

        return {
          ...r.request,
          parent: r.parent,
          children: childrenRows,
        };
      }));

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Get teacher assignment requests error:", error);
      res.status(500).json({ message: "فشل جلب الطلبات" });
    }
  });

  // Respond to assignment request (accept/reject)
  app.put("/api/teacher/assignment-requests/:id/respond", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;
      const { action, rejectionReason } = req.body;

      if (!action || !["accept", "reject"].includes(action)) {
        return res.status(400).json({ message: "الإجراء مطلوب (accept أو reject)" });
      }

      const request = await db.select().from(teacherAssignmentRequests)
        .where(and(eq(teacherAssignmentRequests.id, id), eq(teacherAssignmentRequests.teacherId, teacherId)));

      if (!request[0]) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }

      if (request[0].status !== "pending") {
        return res.status(400).json({ message: "تم الرد على هذا الطلب مسبقاً" });
      }

      const newStatus = action === "accept" ? "accepted" : "rejected";
      const now = new Date();

      await db.update(teacherAssignmentRequests).set({
        status: newStatus,
        rejectionReason: action === "reject" ? (rejectionReason || null) : null,
        respondedAt: now,
      }).where(eq(teacherAssignmentRequests.id, id));

      // If accepted, create permissions for each child
      if (action === "accept") {
        const requestChildren = await db.select().from(teacherAssignmentRequestChildren)
          .where(eq(teacherAssignmentRequestChildren.requestId, id));

        for (const rc of requestChildren) {
          // Check if permission already exists
          const existing = await db.select().from(teacherChildPermissions)
            .where(and(
              eq(teacherChildPermissions.teacherId, teacherId),
              eq(teacherChildPermissions.childId, rc.childId)
            ));

          if (!existing[0]) {
            await db.insert(teacherChildPermissions).values({
              teacherId,
              childId: rc.childId,
              parentId: request[0].parentId,
              requestId: id,
              monthlyPoints: request[0].monthlyPoints,
              perHelpPoints: request[0].perHelpPoints,
            });
          }

          // Also create childTeacherAssignment if needed
          const existingAssignment = await db.select().from(childTeacherAssignment)
            .where(and(eq(childTeacherAssignment.childId, rc.childId), eq(childTeacherAssignment.teacherId, teacherId)));

          if (!existingAssignment[0]) {
            const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, teacherId));
            await db.insert(childTeacherAssignment).values({
              childId: rc.childId,
              teacherId,
              subjectLabel: teacher[0]?.subject || null,
            });

            await db.update(schoolTeachers).set({
              totalStudents: sql`${schoolTeachers.totalStudents} + 1`,
              updatedAt: now,
            }).where(eq(schoolTeachers.id, teacherId));
          }
        }
      }

      // Notify parent about the response
      await db.insert(notifications).values({
        parentId: request[0].parentId,
        type: action === "accept"
          ? NOTIFICATION_TYPES.TEACHER_ASSIGNMENT_ACCEPTED
          : NOTIFICATION_TYPES.TEACHER_ASSIGNMENT_REJECTED,
        title: action === "accept" ? "تم قبول طلب التعيين" : "تم رفض طلب التعيين",
        message: action === "accept"
          ? "وافق المعلم على طلب تعيينه لأطفالك"
          : `رفض المعلم الطلب${rejectionReason ? `: ${rejectionReason}` : ""}`,
        relatedId: id,
        metadata: { requestId: id, teacherId },
      });

      res.json({ success: true, message: action === "accept" ? "تم قبول الطلب" : "تم رفض الطلب" });
    } catch (error: any) {
      console.error("Respond to assignment request error:", error);
      res.status(500).json({ message: "فشل الرد على الطلب" });
    }
  });

  // Get assigned children (children teacher has permission to send tasks to)
  app.get("/api/teacher/assigned-children", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;

      const permissions = await db.select({
        permission: teacherChildPermissions,
        child: {
          id: children.id,
          name: children.name,
          avatarUrl: children.avatarUrl,
          totalPoints: children.totalPoints,
        },
        parent: {
          id: parents.id,
          name: parents.name,
        },
      })
        .from(teacherChildPermissions)
        .innerJoin(children, eq(teacherChildPermissions.childId, children.id))
        .innerJoin(parents, eq(teacherChildPermissions.parentId, parents.id))
        .where(and(eq(teacherChildPermissions.teacherId, teacherId), eq(teacherChildPermissions.isActive, true)));

      const result = permissions.map((p: any) => ({
        childId: p.child.id,
        childName: p.child.name,
        childAvatar: p.child.avatarUrl,
        childPoints: p.child.totalPoints,
        parentName: p.parent.name,
        parentId: p.parent.id,
        monthlyPoints: p.permission.monthlyPoints,
        perHelpPoints: p.permission.perHelpPoints,
        assignedAt: p.permission.createdAt,
      }));

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Get assigned children error:", error);
      res.status(500).json({ message: "فشل جلب الأطفال المعينين" });
    }
  });

  // Send task to assigned child
  app.post("/api/teacher/send-task-to-child", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const parsed = sendTaskToChildSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "بيانات غير صحيحة" });
      }
      const { childId, question, answers, pointsReward, imageUrl, gifUrl, subjectId } = parsed.data;

      // Verify teacher has permission for this child
      const permission = await db.select().from(teacherChildPermissions)
        .where(and(
          eq(teacherChildPermissions.teacherId, teacherId),
          eq(teacherChildPermissions.childId, childId),
          eq(teacherChildPermissions.isActive, true)
        ));

      if (!permission[0]) {
        return res.status(403).json({ message: "ليس لديك صلاحية إرسال مهام لهذا الطفل" });
      }

      // Normalize answers with IDs
      const normalizedAnswers = answers.map((a: any, i: number) => ({
        id: a.id || String(i + 1),
        text: a.text,
        isCorrect: a.isCorrect,
        imageUrl: a.imageUrl || undefined,
      }));

      // Create task in the main tasks table with senderType = "teacher"
      const task = await db.insert(tasks).values({
        parentId: null,
        childId,
        teacherId,
        senderType: "teacher",
        subjectId: subjectId || null,
        question,
        answers: normalizedAnswers,
        pointsReward: Math.min(Math.max(1, pointsReward), 10000),
        imageUrl: imageUrl || null,
        gifUrl: gifUrl || null,
      }).returning();

      // Notify the child
      await db.insert(notifications).values({
        childId,
        type: NOTIFICATION_TYPES.TEACHER_TASK_ASSIGNED,
        title: "مهمة جديدة من المعلم!",
        message: `لديك مهمة جديدة: ${question.substring(0, 50)}...`,
        relatedId: task[0].id,
        metadata: { taskId: task[0].id, teacherId },
      });

      // Update teacher activity score
      await db.update(schoolTeachers).set({
        activityScore: sql`${schoolTeachers.activityScore} + 2`,
        updatedAt: new Date(),
      }).where(eq(schoolTeachers.id, teacherId));

      res.json({ success: true, data: { taskId: task[0].id } });
    } catch (error: any) {
      console.error("Send task to child error:", error);
      res.status(500).json({ message: "فشل إرسال المهمة" });
    }
  });

  // Get reports for an assigned child
  app.get("/api/teacher/child-reports/:childId", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { childId } = req.params;

      // Verify teacher has permission
      const permission = await db.select().from(teacherChildPermissions)
        .where(and(
          eq(teacherChildPermissions.teacherId, teacherId),
          eq(teacherChildPermissions.childId, childId),
          eq(teacherChildPermissions.isActive, true)
        ));

      if (!permission[0]) {
        return res.status(403).json({ message: "ليس لديك صلاحية عرض تقارير هذا الطفل" });
      }

      // Get child info
      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json({ message: "الطفل غير موجود" });
      }

      // Get tasks sent by this teacher to this child
      const teacherTasks = await db.select().from(tasks)
        .where(and(eq(tasks.childId, childId), eq(tasks.teacherId, teacherId)));

      const totalTasks = teacherTasks.length;
      const completedTasks = teacherTasks.filter((t: any) => t.status === "completed").length;
      const pendingTasks = teacherTasks.filter((t: any) => t.status === "pending").length;
      const totalPoints = teacherTasks.filter((t: any) => t.status === "completed")
        .reduce((sum: number, t: any) => sum + (t.pointsReward || 0), 0);

      res.json({
        success: true,
        data: {
          child: {
            id: child[0].id,
            name: child[0].name,
            avatarUrl: child[0].avatarUrl,
            totalPoints: child[0].totalPoints,
          },
          stats: {
            totalTasks,
            completedTasks,
            pendingTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            totalPointsEarned: totalPoints,
          },
          recentTasks: teacherTasks.slice(0, 20).map((t: any) => ({
            id: t.id,
            question: t.question,
            status: t.status,
            pointsReward: t.pointsReward,
            createdAt: t.createdAt,
          })),
        },
      });
    } catch (error: any) {
      console.error("Get child reports error:", error);
      res.status(500).json({ message: "فشل جلب تقارير الطفل" });
    }
  });

  // ===== Help Chat System (نظام المساعدة) =====

  // Get help requests for this teacher
  app.get("/api/teacher/help-requests", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const page = Math.max(1, parseInt(String(req.query.page)) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 50));
      const offset = (page - 1) * limit;

      const staleAssigned = await db.select({
        id: taskHelpRequests.id,
        childId: taskHelpRequests.childId,
        helperType: taskHelpRequests.helperType,
        helperId: taskHelpRequests.helperId,
      })
        .from(taskHelpRequests)
        .innerJoin(tasks, eq(taskHelpRequests.taskId, tasks.id))
        .innerJoin(teacherChildPermissions, and(
          eq(teacherChildPermissions.teacherId, teacherId),
          eq(teacherChildPermissions.childId, taskHelpRequests.childId),
          eq(teacherChildPermissions.isActive, true)
        ))
        .where(and(
          eq(taskHelpRequests.status, "active"),
          eq(taskHelpRequests.slaEscalated, false),
          eq(tasks.teacherId, teacherId),
          or(
            eq(taskHelpRequests.helperType, "parent"),
            eq(taskHelpRequests.helperType, "teacher")
          ),
          sql`${taskHelpRequests.createdAt} <= now() - (${HELP_FIRST_RESPONSE_SLA_SECONDS} * interval '1 second')`
        ))
        .limit(20);

      for (const reqRow of staleAssigned) {
        const [helperReplies] = await db.select({ value: count(taskHelpMessages.id) })
          .from(taskHelpMessages)
          .where(and(
            eq(taskHelpMessages.helpRequestId, reqRow.id),
            eq(taskHelpMessages.senderType, reqRow.helperType as any),
            eq(taskHelpMessages.senderId, reqRow.helperId)
          ));

        if (Number(helperReplies?.value || 0) > 0) {
          continue;
        }

        let nextHelperType: "parent" | "teacher" | null = null;
        let nextHelperId = "";

        if (reqRow.helperType === "parent") {
          nextHelperType = "teacher";
          nextHelperId = teacherId;
        } else {
          const fallbackParent = await db.select({ parentId: parentChild.parentId })
            .from(parentChild)
            .where(eq(parentChild.childId, reqRow.childId))
            .limit(1);

          if (fallbackParent[0]?.parentId) {
            nextHelperType = "parent";
            nextHelperId = fallbackParent[0].parentId;
          }
        }

        if (!nextHelperType || !nextHelperId || (nextHelperType === reqRow.helperType && nextHelperId === reqRow.helperId)) {
          continue;
        }

        const moved = await db.update(taskHelpRequests)
          .set({ helperType: nextHelperType, helperId: nextHelperId, slaEscalated: true })
          .where(and(
            eq(taskHelpRequests.id, reqRow.id),
            eq(taskHelpRequests.status, "active"),
            eq(taskHelpRequests.slaEscalated, false),
            eq(taskHelpRequests.helperType, reqRow.helperType),
            eq(taskHelpRequests.helperId, reqRow.helperId)
          ))
          .returning({ id: taskHelpRequests.id, childId: taskHelpRequests.childId });

        if (!moved[0]) {
          continue;
        }

        await db.insert(notifications).values({
          childId: moved[0].childId,
          type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
          title: "تحويل تلقائي لطلب المساعدة",
          message: "تم تحويل طلب المساعدة تلقائياً بسبب تأخر الرد الأول.",
          relatedId: reqRow.id,
          metadata: {
            helpRequestId: reqRow.id,
            reason: "first_response_sla_timeout",
            switchedTo: nextHelperType,
          },
        });

        if (nextHelperType === "teacher") {
          await db.insert(notifications).values({
            teacherId: nextHelperId,
            type: NOTIFICATION_TYPES.TASK_HELP_REQUESTED,
            title: "طلب مساعدة محول تلقائياً",
            message: "تم تحويل طلب مساعدة إليك تلقائياً بسبب تأخر الرد الأول.",
            relatedId: reqRow.id,
            metadata: { helpRequestId: reqRow.id, reason: "first_response_sla_timeout", canClaim: false },
          });
        } else {
          await db.insert(notifications).values({
            parentId: nextHelperId,
            type: NOTIFICATION_TYPES.TASK_HELP_REQUESTED,
            title: "طلب مساعدة محول تلقائياً",
            message: "تم تحويل طلب مساعدة إليك تلقائياً بسبب تأخر الرد الأول.",
            relatedId: reqRow.id,
            metadata: { helpRequestId: reqRow.id, reason: "first_response_sla_timeout", canClaim: false },
          });
        }
      }

      const expiredUnassigned = await db.select({
        id: taskHelpRequests.id,
      })
        .from(taskHelpRequests)
        .innerJoin(tasks, eq(taskHelpRequests.taskId, tasks.id))
        .innerJoin(teacherChildPermissions, and(
          eq(teacherChildPermissions.teacherId, teacherId),
          eq(teacherChildPermissions.childId, taskHelpRequests.childId),
          eq(teacherChildPermissions.isActive, true)
        ))
        .where(and(
          eq(taskHelpRequests.status, "active"),
          eq(taskHelpRequests.helperType, "unassigned"),
          eq(taskHelpRequests.helperId, ""),
          eq(tasks.teacherId, teacherId),
          sql`${taskHelpRequests.createdAt} <= now() - (${HELP_AUTO_ASSIGN_TIMEOUT_SECONDS} * interval '1 second')`
        ))
        .limit(20);

      for (const reqRow of expiredUnassigned) {
        await db.update(taskHelpRequests)
          .set({ helperType: "teacher", helperId: teacherId })
          .where(and(
            eq(taskHelpRequests.id, reqRow.id),
            eq(taskHelpRequests.status, "active"),
            eq(taskHelpRequests.helperType, "unassigned"),
            eq(taskHelpRequests.helperId, "")
          ));
      }

      const assignedHelpReqs = await db.select({
        helpRequest: taskHelpRequests,
        child: {
          id: children.id,
          name: children.name,
          avatarUrl: children.avatarUrl,
        },
        task: {
          id: tasks.id,
          question: tasks.question,
        },
      })
        .from(taskHelpRequests)
        .innerJoin(children, eq(taskHelpRequests.childId, children.id))
        .innerJoin(tasks, eq(taskHelpRequests.taskId, tasks.id))
        .where(and(
          eq(taskHelpRequests.helperType, "teacher"),
          eq(taskHelpRequests.helperId, teacherId)
        ))
        .orderBy(desc(taskHelpRequests.createdAt))
        .limit(limit)
        .offset(offset);

      const unclaimedHelpReqs = await db.select({
        helpRequest: taskHelpRequests,
        child: {
          id: children.id,
          name: children.name,
          avatarUrl: children.avatarUrl,
        },
        task: {
          id: tasks.id,
          question: tasks.question,
        },
      })
        .from(taskHelpRequests)
        .innerJoin(children, eq(taskHelpRequests.childId, children.id))
        .innerJoin(tasks, eq(taskHelpRequests.taskId, tasks.id))
        .innerJoin(teacherChildPermissions, and(
          eq(teacherChildPermissions.teacherId, teacherId),
          eq(teacherChildPermissions.childId, taskHelpRequests.childId),
          eq(teacherChildPermissions.isActive, true)
        ))
        .where(and(
          eq(taskHelpRequests.helperType, "unassigned"),
          eq(taskHelpRequests.status, "active"),
          eq(tasks.teacherId, teacherId)
        ))
        .orderBy(desc(taskHelpRequests.createdAt))
        .limit(limit)
        .offset(offset);

      const helpReqs = [...assignedHelpReqs, ...unclaimedHelpReqs].filter(
        (row, idx, arr) => arr.findIndex((x: any) => x.helpRequest.id === row.helpRequest.id) === idx
      );

      const result = helpReqs.map((h: any) => ({
        id: h.helpRequest.id,
        taskId: h.task.id,
        taskQuestion: h.task.question,
        childId: h.child.id,
        childName: h.child.name,
        childAvatar: h.child.avatarUrl,
        helperType: h.helpRequest.helperType,
        canClaim: h.helpRequest.helperType === "unassigned" && h.helpRequest.status === "active",
        status: h.helpRequest.status,
        createdAt: h.helpRequest.createdAt,
        resolvedAt: h.helpRequest.resolvedAt,
      }));

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Get teacher help requests error:", error);
      res.status(500).json({ message: "فشل جلب طلبات المساعدة" });
    }
  });

  app.put("/api/teacher/help-requests/:helpRequestId/claim", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { helpRequestId } = req.params;

      const rows = await db.select({
        helpRequest: taskHelpRequests,
        task: {
          teacherId: tasks.teacherId,
        },
      })
        .from(taskHelpRequests)
        .innerJoin(tasks, eq(taskHelpRequests.taskId, tasks.id))
        .where(eq(taskHelpRequests.id, helpRequestId))
        .limit(1);

      const row = rows[0];
      if (!row) {
        return res.status(404).json({ message: "طلب المساعدة غير موجود" });
      }

      const hasPermission = await db.select({ id: teacherChildPermissions.id })
        .from(teacherChildPermissions)
        .where(and(
          eq(teacherChildPermissions.teacherId, teacherId),
          eq(teacherChildPermissions.childId, row.helpRequest.childId),
          eq(teacherChildPermissions.isActive, true)
        ))
        .limit(1);

      if (!hasPermission[0] || row.task.teacherId !== teacherId) {
        return res.status(403).json({ message: "غير مصرح لك باستلام هذا الطلب" });
      }

      if (row.helpRequest.status !== "active") {
        return res.status(409).json({ message: "هذا الطلب غير نشط" });
      }

      if (row.helpRequest.helperType === "teacher" && row.helpRequest.helperId === teacherId) {
        return res.json({ success: true, data: { claimed: true, helpRequestId } });
      }

      if (row.helpRequest.helperType !== "unassigned" || row.helpRequest.helperId !== "") {
        return res.status(409).json({ message: "تم استلام الطلب بواسطة طرف آخر" });
      }

      const updated = await db.update(taskHelpRequests)
        .set({ helperType: "teacher", helperId: teacherId })
        .where(and(
          eq(taskHelpRequests.id, helpRequestId),
          eq(taskHelpRequests.status, "active"),
          eq(taskHelpRequests.helperType, "unassigned"),
          eq(taskHelpRequests.helperId, "")
        ))
        .returning();

      if (!updated[0]) {
        return res.status(409).json({ message: "تم استلام الطلب بواسطة طرف آخر" });
      }

      await db.insert(notifications).values({
        childId: updated[0].childId,
        type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
        title: "تم استلام طلب المساعدة",
        message: "تم استلام طلبك من أحد الأطراف المعنية، يمكنك متابعة الدردشة الآن",
        relatedId: helpRequestId,
        metadata: { helpRequestId, claimedBy: "teacher" },
      });

      const linkedParents = await db.select({ parentId: parentChild.parentId })
        .from(parentChild)
        .where(eq(parentChild.childId, updated[0].childId));

      if (linkedParents.length > 0) {
        await db.insert(notifications).values(
          linkedParents.map((p: { parentId: string }) => ({
            parentId: p.parentId,
            type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
            title: "تم استلام الطلب بواسطة المعلم",
            message: "تم استلام طلب المساعدة من المعلم، لم يعد متاحاً للاستلام",
            relatedId: helpRequestId,
            metadata: { helpRequestId, claimedBy: "teacher", claimedById: teacherId },
          }))
        );
      }

      res.json({ success: true, data: { claimed: true, helpRequestId } });
    } catch (error: any) {
      console.error("Claim teacher help request error:", error);
      res.status(500).json({ message: "فشل استلام طلب المساعدة" });
    }
  });

  // Get messages for a help request (teacher)
  app.get("/api/teacher/help-chat/:helpRequestId/messages", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { helpRequestId } = req.params;

      // Verify this help request belongs to this teacher
      const helpReq = await db.select().from(taskHelpRequests)
        .where(and(
          eq(taskHelpRequests.id, helpRequestId),
          eq(taskHelpRequests.helperType, "teacher"),
          eq(taskHelpRequests.helperId, teacherId)
        ));

      if (!helpReq[0]) {
        return res.status(404).json({ message: "طلب المساعدة غير موجود" });
      }

      const messages = await db.select().from(taskHelpMessages)
        .where(eq(taskHelpMessages.helpRequestId, helpRequestId))
        .orderBy(taskHelpMessages.createdAt);

      res.json({ success: true, data: messages });
    } catch (error: any) {
      console.error("Get help chat messages error:", error);
      res.status(500).json({ message: "فشل جلب الرسائل" });
    }
  });

  // Send message in help chat (teacher)
  app.post("/api/teacher/help-chat/:helpRequestId/messages", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { helpRequestId } = req.params;
      const { messageType, content, mediaUrl } = req.body;

      if (!messageType || !["text", "image", "voice"].includes(messageType)) {
        return res.status(400).json({ message: "نوع الرسالة مطلوب" });
      }

      if (messageType === "text" && !content) {
        return res.status(400).json({ message: "محتوى الرسالة مطلوب" });
      }

      if ((messageType === "image" || messageType === "voice") && !mediaUrl) {
        return res.status(400).json({ message: "رابط الوسائط مطلوب" });
      }

      // Verify this help request belongs to this teacher
      const helpReq = await db.select().from(taskHelpRequests)
        .where(and(
          eq(taskHelpRequests.id, helpRequestId),
          eq(taskHelpRequests.helperType, "teacher"),
          eq(taskHelpRequests.helperId, teacherId)
        ));

      if (!helpReq[0]) {
        return res.status(404).json({ message: "طلب المساعدة غير موجود" });
      }

      if (helpReq[0].status !== "active") {
        return res.status(409).json({ message: "تم إغلاق جلسة المساعدة" });
      }

      const message = await db.insert(taskHelpMessages).values({
        helpRequestId,
        senderType: "teacher",
        senderId: teacherId,
        messageType,
        content: content || null,
        mediaUrl: mediaUrl || null,
      }).returning();

      // Notify the child
      await db.insert(notifications).values({
        childId: helpReq[0].childId,
        type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
        title: "رسالة مساعدة جديدة",
        message: messageType === "text" ? (content?.substring(0, 50) || "لديك رسالة جديدة") : "لديك رسالة مساعدة جديدة (وسائط)",
        relatedId: helpRequestId,
        metadata: { helpRequestId, messageId: message[0].id },
      });

      res.json({ success: true, data: message[0] });
    } catch (error: any) {
      console.error("Send help chat message error:", error);
      res.status(500).json({ message: "فشل إرسال الرسالة" });
    }
  });

  // Resolve (close) a help request (teacher)
  app.put("/api/teacher/help-requests/:helpRequestId/resolve", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { helpRequestId } = req.params;

      const helpReq = await db.select().from(taskHelpRequests)
        .where(and(
          eq(taskHelpRequests.id, helpRequestId),
          eq(taskHelpRequests.helperType, "teacher"),
          eq(taskHelpRequests.helperId, teacherId)
        ));

      if (!helpReq[0]) {
        return res.status(404).json({ message: "طلب المساعدة غير موجود" });
      }

      if (helpReq[0].status === "resolved") {
        return res.json({ success: true, message: "تم الحل مسبقاً" });
      }

      const [helperReplies] = await db.select({ value: count(taskHelpMessages.id) })
        .from(taskHelpMessages)
        .where(and(
          eq(taskHelpMessages.helpRequestId, helpRequestId),
          eq(taskHelpMessages.senderType, "teacher"),
          eq(taskHelpMessages.senderId, teacherId)
        ));

      if (Number(helperReplies?.value || 0) === 0) {
        return res.status(409).json({ message: "لا يمكن إغلاق طلب المساعدة قبل إرسال رد للمحادثة" });
      }

      const resolvedAt = new Date();
      await db.update(taskHelpRequests)
        .set({ status: "resolved", resolvedAt })
        .where(eq(taskHelpRequests.id, helpRequestId));

      await db.insert(notifications).values({
        childId: helpReq[0].childId,
        type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
        title: "تم إنهاء جلسة المساعدة",
        message: "المعلم أنهى جلسة المساعدة. يمكنك متابعة المهمة الآن.",
        relatedId: helpRequestId,
        metadata: { helpRequestId, resolvedBy: "teacher", resolvedById: teacherId },
      });

      const linkedParents = await db.select({ parentId: parentChild.parentId })
        .from(parentChild)
        .where(eq(parentChild.childId, helpReq[0].childId));

      if (linkedParents.length > 0) {
        await db.insert(notifications).values(
          linkedParents.map((p: { parentId: string }) => ({
            parentId: p.parentId,
            type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
            title: "تم إغلاق جلسة المساعدة",
            message: "المعلم أنهى جلسة المساعدة لطفلك. راجعوا معه إن كان لديه أي استفسارات إضافية.",
            relatedId: helpRequestId,
            metadata: { helpRequestId, resolvedBy: "teacher", resolvedById: teacherId },
          }))
        );
      }

      const permission = await db.select({
        parentId: teacherChildPermissions.parentId,
        perHelpPoints: teacherChildPermissions.perHelpPoints,
      })
        .from(teacherChildPermissions)
        .where(and(
          eq(teacherChildPermissions.teacherId, teacherId),
          eq(teacherChildPermissions.childId, helpReq[0].childId),
          eq(teacherChildPermissions.isActive, true)
        ))
        .limit(1);

      const existingPayment = await db.select({ id: teacherHelpSessionPayments.id })
        .from(teacherHelpSessionPayments)
        .where(eq(teacherHelpSessionPayments.helpRequestId, helpRequestId))
        .limit(1);

      if (!existingPayment[0]) {
        await db.insert(teacherHelpSessionPayments).values({
          helpRequestId,
          taskId: helpReq[0].taskId,
          teacherId,
          parentId: permission[0]?.parentId || null,
          childId: helpReq[0].childId,
          perHelpPoints: Number(permission[0]?.perHelpPoints || 0),
          status: "completed",
          claimedAt: helpReq[0].createdAt,
          resolvedAt,
        });
      }

      await db.update(schoolTeachers).set({
        activityScore: sql`${schoolTeachers.activityScore} + 2`,
        updatedAt: resolvedAt,
      }).where(eq(schoolTeachers.id, teacherId));

      const teacherInfo = await db.select({ schoolId: schoolTeachers.schoolId })
        .from(schoolTeachers)
        .where(eq(schoolTeachers.id, teacherId))
        .limit(1);

      if (teacherInfo[0]) {
        await db.insert(schoolActivityLogs).values({
          schoolId: teacherInfo[0].schoolId,
          teacherId,
          action: "task_help_session_resolved",
          points: 2,
          metadata: {
            helpRequestId,
            taskId: helpReq[0].taskId,
            childId: helpReq[0].childId,
            perHelpPoints: Number(permission[0]?.perHelpPoints || 0),
          },
        });
      }

      res.json({ success: true, message: "تم إغلاق طلب المساعدة" });
    } catch (error: any) {
      console.error("Resolve help request error:", error);
      res.status(500).json({ message: "فشل إغلاق طلب المساعدة" });
    }
  });

  app.get("/api/teacher/help-session-payments", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const month = typeof req.query.month === "string" ? req.query.month : "";

      let whereClause: any = eq(teacherHelpSessionPayments.teacherId, teacherId);
      if (month && /^\d{4}-\d{2}$/.test(month)) {
        whereClause = and(
          eq(teacherHelpSessionPayments.teacherId, teacherId),
          sql`to_char(${teacherHelpSessionPayments.resolvedAt}, 'YYYY-MM') = ${month}`
        );
      }

      const rows = await db.select({
        payment: teacherHelpSessionPayments,
        child: {
          id: children.id,
          name: children.name,
        },
        parent: {
          id: parents.id,
          name: parents.name,
        },
        task: {
          id: tasks.id,
          question: tasks.question,
        },
      })
        .from(teacherHelpSessionPayments)
        .leftJoin(children, eq(teacherHelpSessionPayments.childId, children.id))
        .leftJoin(parents, eq(teacherHelpSessionPayments.parentId, parents.id))
        .leftJoin(tasks, eq(teacherHelpSessionPayments.taskId, tasks.id))
        .where(whereClause)
        .orderBy(desc(teacherHelpSessionPayments.resolvedAt));

      const totalHelpPoints = rows.reduce((sum: number, r: any) => sum + Number(r.payment.perHelpPoints || 0), 0);

      const feedbackRows = await db.select({
        helpRequestId: taskHelpFeedback.helpRequestId,
        rating: taskHelpFeedback.rating,
      }).from(taskHelpFeedback)
        .where(and(
          eq(taskHelpFeedback.teacherId, teacherId),
          month && /^\d{4}-\d{2}$/.test(month)
            ? sql`to_char(${taskHelpFeedback.createdAt}, 'YYYY-MM') = ${month}`
            : sql`TRUE`
        ));

      const avgSessionRating = feedbackRows.length > 0
        ? feedbackRows.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / feedbackRows.length
        : 0;

      const feedbackByHelpRequest = new Map<string, number>();
      for (const row of feedbackRows) {
        if (row.helpRequestId) feedbackByHelpRequest.set(row.helpRequestId, Number(row.rating || 0));
      }

      res.json({
        success: true,
        data: {
          month: month || null,
          summary: {
            sessionsCount: rows.length,
            totalHelpPoints,
            feedbackCount: feedbackRows.length,
            avgSessionRating: Math.round(avgSessionRating * 10) / 10,
          },
          items: rows.map((r: any) => ({
            id: r.payment.id,
            helpRequestId: r.payment.helpRequestId,
            child: r.child,
            parent: r.parent,
            childName: r.child?.name || "",
            parentName: r.parent?.name || "",
            taskQuestion: r.task?.question || "",
            pointsAmount: Number(r.payment.perHelpPoints || 0),
            perHelpPoints: Number(r.payment.perHelpPoints || 0),
            feedbackRating: feedbackByHelpRequest.get(r.payment.helpRequestId) || null,
            resolvedAt: r.payment.resolvedAt,
          })),
        },
      });
    } catch (error: any) {
      console.error("Get teacher help session payments error:", error);
      res.status(500).json({ message: "فشل جلب السجل المالي للمساعدة" });
    }
  });

  // Upload media for help chat (teacher)
  app.post("/api/teacher/help-chat/upload-media", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const multer = (await import("multer")).default;
      const path = await import("path");
      const fs = await import("fs");
      const uploadDir = path.resolve(process.cwd(), "uploads", "help-chat");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const store = multer.diskStorage({
        destination: (_r: any, _f: any, cb: any) => cb(null, uploadDir),
        filename: (_r: any, file: any, cb: any) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
      });
      const upload = multer({
        storage: store,
        limits: { fileSize: 8 * 1024 * 1024 },
        fileFilter: (_r: any, f: any, cb: any) => {
          const allowed = new Set([
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "audio/webm",
            "audio/wav",
            "audio/mpeg",
            "audio/mp3",
            "audio/ogg",
          ]);
          if (allowed.has(String(f.mimetype || "").toLowerCase())) cb(null, true);
          else cb(new Error("Unsupported file type. Allowed: JPG/PNG/WEBP/GIF and WEBM/WAV/MP3/OGG"));
        },
      }).single("file");
      upload(req as any, res as any, (err: any) => {
        if (err) return res.status(400).json({ message: err.message });
        const file = (req as any).file;
        if (!file) return res.status(400).json({ message: "No file uploaded" });
        const url = `/uploads/help-chat/${file.filename}`;
        const type = file.mimetype.startsWith("audio/") ? "voice" : "image";
        res.json({ success: true, data: { url, type } });
      });
    } catch (error: any) {
      console.error("Upload help chat media error:", error);
      res.status(500).json({ message: "فشل رفع الملف" });
    }
  });

  // ===== Teacher Notifications =====

  app.get("/api/teacher/notifications", teacherMiddleware, async (req: any, res) => {
    try {
      const teacherId = req.teacher.teacherId;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      const items = await db.select().from(notifications)
        .where(eq(notifications.teacherId, teacherId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit).offset(offset);

      const [{ value: total }] = await db.select({ value: count() }).from(notifications)
        .where(eq(notifications.teacherId, teacherId));

      res.json({ success: true, data: { items, total: Number(total), limit, offset, hasMore: offset + limit < Number(total) } });
    } catch (error: any) {
      console.error("Teacher notifications error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.get("/api/teacher/notifications/unread-count", teacherMiddleware, async (req: any, res) => {
    try {
      const teacherId = req.teacher.teacherId;
      const [{ value: unread }] = await db.select({ value: count() }).from(notifications)
        .where(and(eq(notifications.teacherId, teacherId), eq(notifications.isRead, false)));
      res.json({ success: true, data: { count: Number(unread) } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.post("/api/teacher/notifications/read-all", teacherMiddleware, async (req: any, res) => {
    try {
      const teacherId = req.teacher.teacherId;
      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.teacherId, teacherId), eq(notifications.isRead, false)));
      res.json({ success: true, message: "تم تعليم الكل كمقروء" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.post("/api/teacher/notifications/:id/read", teacherMiddleware, async (req: any, res) => {
    try {
      const teacherId = req.teacher.teacherId;
      const { id } = req.params;
      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.id, id), eq(notifications.teacherId, teacherId)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  // ===== Teacher Push Notifications =====

  app.get("/api/teacher/push-public-key", teacherMiddleware, async (_req: TeacherRequest, res) => {
    try {
      const publicKey = getVapidPublicKey();
      if (!publicKey) {
        return res.status(503).json({ success: false, error: "WEB_PUSH_NOT_CONFIGURED", message: "Web push is not configured" });
      }
      res.json({ success: true, data: { publicKey } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.post("/api/teacher/push-subscriptions", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { platform, endpoint, token, p256dh, auth, deviceId } = req.body || {};

      if (!platform || !["web", "android", "ios"].includes(platform)) {
        return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "platform must be web, android, or ios" });
      }
      if (!endpoint && !token) {
        return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "endpoint or token is required" });
      }

      const existing = await db.select().from(teacherPushSubscriptions)
        .where(eq(teacherPushSubscriptions.teacherId, teacherId));

      const match = existing.find((row: any) => {
        if (deviceId && row.deviceId === deviceId && row.platform === platform) return true;
        if (endpoint && row.endpoint === endpoint) return true;
        if (token && row.token === token) return true;
        return false;
      });

      if (match) {
        const [updated] = await db.update(teacherPushSubscriptions).set({
          platform, endpoint: endpoint || null, token: token || null,
          p256dh: p256dh || null, auth: auth || null, deviceId: deviceId || null,
          isActive: true, lastSeenAt: new Date(), updatedAt: new Date(),
        }).where(eq(teacherPushSubscriptions.id, match.id)).returning();
        return res.json({ success: true, data: updated });
      }

      const [created] = await db.insert(teacherPushSubscriptions).values({
        teacherId, platform, endpoint: endpoint || null, token: token || null,
        p256dh: p256dh || null, auth: auth || null, deviceId: deviceId || null, isActive: true,
      }).returning();
      res.json({ success: true, data: created });
    } catch (error: any) {
      console.error("Teacher push subscription error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.delete("/api/teacher/push-subscriptions/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;
      await db.delete(teacherPushSubscriptions)
        .where(and(eq(teacherPushSubscriptions.id, id), eq(teacherPushSubscriptions.teacherId, teacherId)));
      res.json({ success: true, message: "تم حذف الاشتراك" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  // ======= TEACHER-PARENT DIRECT MESSAGING =======

  // Get conversations list
  app.get("/api/teacher/messages/conversations", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const conversations = await db.select({
        conversation: parentTeacherConversations,
        parentName: parents.name,
        parentAvatar: parents.avatarUrl,
      })
        .from(parentTeacherConversations)
        .innerJoin(parents, eq(parentTeacherConversations.parentId, parents.id))
        .where(eq(parentTeacherConversations.teacherId, teacherId))
        .orderBy(desc(parentTeacherConversations.lastMessageAt));

      res.json({ success: true, data: conversations });
    } catch (error: any) {
      console.error("Teacher get conversations error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  // Get messages in a conversation
  app.get("/api/teacher/messages/:conversationId", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { conversationId } = req.params;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      const conv = await db.select().from(parentTeacherConversations)
        .where(and(
          eq(parentTeacherConversations.id, conversationId),
          eq(parentTeacherConversations.teacherId, teacherId),
        ));
      if (!conv[0]) return res.status(404).json({ success: false, error: "NOT_FOUND" });

      const messages = await db.select().from(parentTeacherMessages)
        .where(eq(parentTeacherMessages.conversationId, conversationId))
        .orderBy(desc(parentTeacherMessages.createdAt))
        .limit(limit)
        .offset(offset);

      // Mark teacher unread as read
      await db.update(parentTeacherConversations).set({ teacherUnreadCount: 0 })
        .where(eq(parentTeacherConversations.id, conversationId));
      await db.update(parentTeacherMessages).set({ isRead: true })
        .where(and(
          eq(parentTeacherMessages.conversationId, conversationId),
          eq(parentTeacherMessages.senderType, "parent"),
          eq(parentTeacherMessages.isRead, false),
        ));

      res.json({ success: true, data: { messages: messages.reverse(), conversation: conv[0] } });
    } catch (error: any) {
      console.error("Teacher get messages error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  // Send message in conversation
  app.post("/api/teacher/messages/:conversationId", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { conversationId } = req.params;
      const { messageType, content, mediaUrl } = req.body;

      if (!content && !mediaUrl) {
        return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "Message content or media is required" });
      }

      const conv = await db.select().from(parentTeacherConversations)
        .where(and(
          eq(parentTeacherConversations.id, conversationId),
          eq(parentTeacherConversations.teacherId, teacherId),
        ));
      if (!conv[0]) return res.status(404).json({ success: false, error: "NOT_FOUND" });

      const [msg] = await db.insert(parentTeacherMessages).values({
        conversationId,
        senderId: teacherId,
        senderType: "teacher",
        content: content || null,
        mediaUrl: mediaUrl || null,
        messageType: messageType || "text",
      }).returning();

      await db.update(parentTeacherConversations).set({
        lastMessageAt: new Date(),
        parentUnreadCount: sql`${parentTeacherConversations.parentUnreadCount} + 1`,
      }).where(eq(parentTeacherConversations.id, conversationId));

      res.status(201).json({ success: true, data: msg });
    } catch (error: any) {
      console.error("Teacher send message error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });
}
