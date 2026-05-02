import type { Express } from "express";
import { storage } from "../storage";
import {
  schools,
  schoolTeachers,
  teacherTasks,
  teacherTaskOrders,
  teacherBalances,
  templateTasks,
  parentTaskLibrary,
  taskFavorites,
  teacherTaskLikes,
  taskCart,
  follows,
  children,
  parentChild,
  childSchoolAssignment,
  teacherReviews,
  schoolReviews,
  parents,
  parentAuditLogs,
  tasks,
  parentWallet,
} from "../../shared/schema";
import { eq, and, sql, desc, or, ilike, inArray, count, ne, isNull, asc } from "drizzle-orm";
import { authMiddleware, requireLinkedChildForParentMonetization } from "./middleware";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";

function normalizeAnswersForStorage(answers: any, correctAnswerIndex: number = 0): any[] {
  if (!Array.isArray(answers)) return [];

  const normalizeText = (value: unknown): string => {
    return typeof value === "string" ? value.trim() : "";
  };

  const normalizeMedia = (value: any) => {
    if (!value || typeof value !== "object") return undefined;
    const url = normalizeText(value.url);
    if (!url) return undefined;
    return {
      objectPath: typeof value.objectPath === "string" ? value.objectPath : undefined,
      url,
      mimeType: typeof value.mimeType === "string" ? value.mimeType : undefined,
      size: typeof value.size === "number" ? value.size : undefined,
      width: typeof value.width === "number" ? value.width : undefined,
      height: typeof value.height === "number" ? value.height : undefined,
      purpose: typeof value.purpose === "string" ? value.purpose : undefined,
      uploadedByType: ["admin", "parent", "teacher", "child"].includes(value.uploadedByType)
        ? value.uploadedByType
        : undefined,
      uploadedById: typeof value.uploadedById === "string" ? value.uploadedById : undefined,
      createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
    };
  };

  return answers.map((answer: any, index: number) => {
    const id = `answer-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 11)}`;

    if (typeof answer === "string") {
      const text = normalizeText(answer);
      if (!text) return null;
      return {
        id,
        text,
        isCorrect: index === correctAnswerIndex,
      };
    }

    if (typeof answer === "object" && answer !== null) {
      const text = normalizeText(answer.text);
      const imageUrl = normalizeText(answer.imageUrl);
      const media = normalizeMedia(answer.media);
      const hasContent = !!text || !!imageUrl || !!media?.url;
      if (!hasContent) return null;

      return {
        id: answer.id || id,
        text,
        isCorrect: answer.isCorrect !== undefined ? !!answer.isCorrect : index === correctAnswerIndex,
        imageUrl: imageUrl || undefined,
        media,
        stickerId: typeof answer.stickerId === "string" ? answer.stickerId : undefined,
        stickerVariant: ["full", "circle", "rounded", "diamond"].includes(answer.stickerVariant)
          ? answer.stickerVariant
          : undefined,
      };
    }

    const text = normalizeText(String(answer));
    if (!text) return null;
    return {
      id,
      text,
      isCorrect: index === correctAnswerIndex,
    };
  }).filter((answer) => !!answer);
}

export function registerMarketplaceRoutes(app: Express) {
  const db = storage.db;

  // ===== Universal Search (البحث الشامل) =====
  app.get("/api/search", authMiddleware, async (req: any, res) => {
    try {
      const { q, type = "all", limit = "10", offset = "0" } = req.query;

      if (!q || String(q).trim().length < 2) {
        return res.json(successResponse({ schools: [], teachers: [], tasks: [] }));
      }

      const term = String(q).trim();
      const lim = Math.min(parseInt(limit as string) || 10, 50);
      const off = parseInt(offset as string) || 0;

      const results: { schools?: any[]; teachers?: any[]; tasks?: any[] } = {};

      // Search schools
      if (type === "all" || type === "schools") {
        const schoolResults = await db.select({
          id: schools.id,
          name: schools.name,
          nameAr: schools.nameAr,
          governorate: schools.governorate,
          city: schools.city,
          imageUrl: schools.imageUrl,
          isVerified: schools.isVerified,
          totalTeachers: schools.totalTeachers,
          totalStudents: schools.totalStudents,
        }).from(schools)
          .where(and(
            eq(schools.isActive, true),
            or(
              ilike(schools.name, `%${term}%`),
              ilike(schools.nameAr, `%${term}%`)
            )
          ))
          .orderBy(desc(schools.activityScore))
          .limit(lim)
          .offset(off);

        results.schools = schoolResults.map((s: any) => ({ ...s, _type: "school" }));
      }

      // Search teachers
      if (type === "all" || type === "teachers") {
        const teacherResults = await db.select({
          id: schoolTeachers.id,
          name: schoolTeachers.name,
          avatarUrl: schoolTeachers.avatarUrl,
          bio: schoolTeachers.bio,
          subject: schoolTeachers.subject,
          yearsExperience: schoolTeachers.yearsExperience,
          totalTasksSold: schoolTeachers.totalTasksSold,
          schoolId: schoolTeachers.schoolId,
        }).from(schoolTeachers)
          .where(and(
            eq(schoolTeachers.isActive, true),
            or(
              ilike(schoolTeachers.name, `%${term}%`),
              ilike(schoolTeachers.subject, `%${term}%`)
            )
          ))
          .orderBy(desc(schoolTeachers.activityScore))
          .limit(lim)
          .offset(off);

        results.teachers = teacherResults.map((t: any) => ({ ...t, _type: "teacher" }));
      }

      // Search teacher tasks
      if (type === "all" || type === "tasks") {
        const taskResults = await db.select({
          id: teacherTasks.id,
          title: teacherTasks.title,
          question: teacherTasks.question,
          subjectLabel: teacherTasks.subjectLabel,
          price: teacherTasks.price,
          pointsReward: teacherTasks.pointsReward,
          purchaseCount: teacherTasks.purchaseCount,
          teacherId: teacherTasks.teacherId,
          imageUrl: teacherTasks.imageUrl,
        }).from(teacherTasks)
          .where(and(
            eq(teacherTasks.isActive, true),
            eq(teacherTasks.isPublic, true),
            or(
              ilike(teacherTasks.title, `%${term}%`),
              ilike(teacherTasks.question, `%${term}%`),
              ilike(teacherTasks.subjectLabel, `%${term}%`)
            )
          ))
          .orderBy(desc(teacherTasks.purchaseCount))
          .limit(lim)
          .offset(off);

        results.tasks = taskResults.map((t: any) => ({ ...t, _type: "teacher_task" }));
      }

      res.json(successResponse(results));
    } catch (err: any) {
      console.error("Search error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في البحث"));
    }
  });

  // ===== Task Favorites (المفضلة) =====

  // Get parent's favorites
  app.get("/api/parent/favorites", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const favs = await db.select().from(taskFavorites)
        .where(eq(taskFavorites.parentId, parentId))
        .orderBy(desc(taskFavorites.createdAt));

      // Enrich with task details
      const enriched = [];
      for (const fav of favs) {
        let taskDetail: any = null;
        if (fav.taskType === "teacher_task") {
          const [t] = await db.select({
            id: teacherTasks.id,
            title: teacherTasks.title,
            question: teacherTasks.question,
            price: teacherTasks.price,
            pointsReward: teacherTasks.pointsReward,
            subjectLabel: teacherTasks.subjectLabel,
            teacherId: teacherTasks.teacherId,
            imageUrl: teacherTasks.imageUrl,
            purchaseCount: teacherTasks.purchaseCount,
          }).from(teacherTasks).where(eq(teacherTasks.id, fav.taskId)).limit(1);
          taskDetail = t || null;
        } else if (fav.taskType === "template_task") {
          const [t] = await db.select({
            id: templateTasks.id,
            title: templateTasks.title,
            question: templateTasks.question,
            pointsReward: templateTasks.pointsReward,
            pointsCost: templateTasks.pointsCost,
          }).from(templateTasks).where(eq(templateTasks.id, fav.taskId)).limit(1);
          taskDetail = t || null;
        }
        if (taskDetail) {
          enriched.push({ ...fav, task: taskDetail });
        }
      }

      res.json(successResponse({ favorites: enriched }));
    } catch (err: any) {
      console.error("Get favorites error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب المفضلة"));
    }
  });

  // Toggle favorite
  app.post("/api/parent/favorites/toggle", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { taskType, taskId } = req.body;

      if (!taskType || !taskId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "taskType و taskId مطلوبان"));
      }
      if (!["teacher_task", "template_task"].includes(taskType)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "نوع المهمة غير صالح"));
      }

      // Check if already favorited
      const existing = await db.select().from(taskFavorites)
        .where(and(
          eq(taskFavorites.parentId, parentId),
          eq(taskFavorites.taskType, taskType),
          eq(taskFavorites.taskId, taskId)
        )).limit(1);

      if (existing[0]) {
        await db.delete(taskFavorites).where(eq(taskFavorites.id, existing[0].id));
        return res.json(successResponse({ isFavorited: false, message: "تم إزالة المهمة من المفضلة" }));
      }

      await db.insert(taskFavorites).values({ parentId, taskType, taskId });
      res.json(successResponse({ isFavorited: true, message: "تم إضافة المهمة للمفضلة" }));
    } catch (err: any) {
      console.error("Toggle favorite error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في تحديث المفضلة"));
    }
  });

  // Check if a task is favorited
  app.get("/api/parent/favorites/check", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { taskType, taskId } = req.query;

      if (!taskType || !taskId) {
        return res.json(successResponse({ isFavorited: false }));
      }

      const existing = await db.select({ id: taskFavorites.id }).from(taskFavorites)
        .where(and(
          eq(taskFavorites.parentId, parentId),
          eq(taskFavorites.taskType, taskType as string),
          eq(taskFavorites.taskId, taskId as string)
        )).limit(1);

      res.json(successResponse({ isFavorited: !!existing[0] }));
    } catch (err: any) {
      console.error("Check favorite error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ"));
    }
  });

  // ===== Parent Task Library (مكتبة مهام الأهل) =====

  // Get parent's task library
  app.get("/api/parent/task-library", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const items = await db.select().from(parentTaskLibrary)
        .where(and(eq(parentTaskLibrary.parentId, parentId), eq(parentTaskLibrary.isActive, true)))
        .orderBy(desc(parentTaskLibrary.createdAt));

      res.json(successResponse({ tasks: items }));
    } catch (err: any) {
      console.error("Get task library error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب مكتبة المهام"));
    }
  });

  // Buy teacher task and add to library
  app.post("/api/parent/buy-teacher-task", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { teacherTaskId, childId, purchaseType = "permanent", maxUsageCount } = req.body;

      // Validate purchaseType
      const validTypes = ["one_time", "limited", "permanent"];
      if (!validTypes.includes(purchaseType)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "نوع الشراء غير صالح"));
      }
      if (purchaseType === "limited" && (!maxUsageCount || maxUsageCount < 1)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "يجب تحديد عدد مرات الاستخدام"));
      }

      if (!teacherTaskId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "معرّف المهمة مطلوب"));
      }

      // Get the teacher task
      const [task] = await db.select().from(teacherTasks)
        .where(and(eq(teacherTasks.id, teacherTaskId), eq(teacherTasks.isActive, true)))
        .limit(1);

      if (!task) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المهمة غير موجودة"));
      }

      // Get teacher info
      const [teacher] = await db.select().from(schoolTeachers)
        .where(eq(schoolTeachers.id, task.teacherId)).limit(1);

      if (!teacher) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المعلم غير موجود"));
      }

      // Check wallet balance
      const price = parseFloat(String(task.price));
      if (isNaN(price) || price <= 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "سعر المهمة غير صالح"));
      }

      const commissionPct = parseFloat(String(teacher.commissionRatePct));
      const commissionAmount = (price * commissionPct) / 100;
      const teacherEarning = price - commissionAmount;

      // Atomic transaction: deduct wallet + create order + update stats
      const txResult = await db.transaction(async (tx: any) => {
        // Atomic deduct: only succeeds if balance >= price (prevents race condition)
        const updated = await tx.update(parentWallet).set({
          balance: sql`${parentWallet.balance} - ${price.toFixed(2)}`,
        }).where(and(
          eq(parentWallet.parentId, parentId),
          sql`${parentWallet.balance} >= ${price.toFixed(2)}`
        )).returning();

        if (!updated[0]) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        // Create order
        const [order] = await tx.insert(teacherTaskOrders).values({
          teacherTaskId: task.id,
          teacherId: task.teacherId,
          buyerParentId: parentId,
          childId: childId || null,
          price: price.toFixed(2),
          commissionRatePct: commissionPct.toFixed(2),
          commissionAmount: commissionAmount.toFixed(2),
          teacherEarningAmount: teacherEarning.toFixed(2),
          status: "completed",
          holdDays: 7,
        }).returning();

        // Update teacher stats
        await tx.update(teacherTasks).set({
          purchaseCount: sql`${teacherTasks.purchaseCount} + 1`,
          updatedAt: new Date(),
        }).where(eq(teacherTasks.id, task.id));

        await tx.update(schoolTeachers).set({
          totalTasksSold: sql`${schoolTeachers.totalTasksSold} + 1`,
          updatedAt: new Date(),
        }).where(eq(schoolTeachers.id, task.teacherId));

        // Add to pending teacher balance
        const [existingBal] = await tx.select().from(teacherBalances)
          .where(eq(teacherBalances.teacherId, task.teacherId)).limit(1);
        if (!existingBal) {
          await tx.insert(teacherBalances).values({ teacherId: task.teacherId }).onConflictDoNothing();
        }
        await tx.update(teacherBalances).set({
          pendingBalance: sql`${teacherBalances.pendingBalance} + ${teacherEarning.toFixed(2)}`,
          totalSalesAmount: sql`${teacherBalances.totalSalesAmount} + ${price.toFixed(2)}`,
          totalCommissionAmount: sql`${teacherBalances.totalCommissionAmount} + ${commissionAmount.toFixed(2)}`,
          updatedAt: new Date(),
        }).where(eq(teacherBalances.teacherId, task.teacherId));

        // Add to parent's task library
        const [libItem] = await tx.insert(parentTaskLibrary).values({
          parentId,
          sourceType: "teacher_task",
          sourceTaskId: task.id,
          title: task.title,
          question: task.question,
          answers: task.answers,
          imageUrl: task.imageUrl,
          gifUrl: task.gifUrl,
          subjectLabel: task.subjectLabel,
          pointsReward: task.pointsReward,
          purchaseType: purchaseType as string,
          maxUsageCount: purchaseType === "one_time" ? 1 : purchaseType === "limited" ? (maxUsageCount || 1) : null,
        }).returning();

        return { order, libItem };
      });

      res.json(successResponse({
        order: txResult.order,
        libraryItem: txResult.libItem,
        message: "تم شراء المهمة وإضافتها لمكتبتك بنجاح",
      }));
    } catch (err: any) {
      if (err.message === "INSUFFICIENT_BALANCE") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "رصيدك غير كافٍ"));
      }
      console.error("Buy teacher task error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في شراء المهمة"));
    }
  });

  // Use task from library — assign to child
  app.post("/api/parent/task-library/:id/use", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { id } = req.params;
      const {
        childId,
        pointsReward: customPoints,
        question: customQuestion,
        answers: customAnswers,
        imageUrl: customImage,
        gifUrl: customGif,
        taskMedia,
      } = req.body;

      if (!childId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "معرّف الطفل مطلوب"));
      }

      // Verify parent owns this child
      const [link] = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)))
        .limit(1);
      if (!link) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "غير مصرح"));
      }

      // Get library item
      const [item] = await db.select().from(parentTaskLibrary)
        .where(and(
          eq(parentTaskLibrary.id, id),
          eq(parentTaskLibrary.parentId, parentId),
          eq(parentTaskLibrary.isActive, true)
        )).limit(1);

      if (!item) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المهمة غير موجودة في المكتبة"));
      }

      // Check usage limits for limited purchase type
      if (item.maxUsageCount !== null && item.usageCount >= item.maxUsageCount) {
        // Deactivate and return error
        await db.update(parentTaskLibrary).set({ isActive: false }).where(eq(parentTaskLibrary.id, id));
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "تم استنفاد عدد مرات استخدام هذه المهمة"));
      }

      // Use custom points or original
      const finalPoints = (customPoints && customPoints > 0) ? customPoints : item.pointsReward;

      const normalizedAnswers = normalizeAnswersForStorage(customAnswers !== undefined ? customAnswers : item.answers, 0);
      if (normalizedAnswers.length < 2) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "At least two non-empty answers are required"));
      }

      const correctCount = normalizedAnswers.filter((answer: any) => answer.isCorrect).length;
      if (correctCount !== 1) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Exactly one correct answer is required"));
      }

      const mergedQuestionRaw = customQuestion !== undefined ? customQuestion : item.question;
      const normalizedQuestion = String(mergedQuestionRaw || "").trim();
      const taskMediaUrl = String(taskMedia?.url || "").trim();
      const mergedImageUrl = customImage !== undefined ? String(customImage || "").trim() : String(item.imageUrl || "").trim();
      const mergedGifUrl = customGif !== undefined ? String(customGif || "").trim() : String(item.gifUrl || "").trim();
      const hasQuestionText = normalizedQuestion.length > 0;
      const hasQuestionMedia = !!taskMediaUrl || !!mergedImageUrl || !!mergedGifUrl;

      if (!hasQuestionText && !hasQuestionMedia) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Question text or media is required"));
      }

      const finalQuestion = hasQuestionText ? normalizedQuestion : "سؤال وسائط";
      const finalImageUrl = taskMediaUrl || mergedImageUrl || null;
      const finalGifUrl = mergedGifUrl || null;

      // Check wallet for points reward
      const [wallet] = await db.select().from(parentWallet)
        .where(eq(parentWallet.parentId, parentId)).limit(1);

      const balance = Number(wallet?.balance || 0);
      if (balance < finalPoints) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST,
          `رصيدك غير كافٍ لإرسال المهمة. الرصيد: ${balance}, المطلوب: ${finalPoints}`));
      }

      // Deduct points
      await db.update(parentWallet).set({
        balance: sql`${parentWallet.balance} - ${finalPoints}`,
      }).where(eq(parentWallet.parentId, parentId));

      // Create actual task for child (use custom values if provided, otherwise original)
      const [newTask] = await db.insert(tasks).values({
        parentId,
        childId,
        question: finalQuestion,
        answers: normalizedAnswers,
        imageUrl: finalImageUrl,
        gifUrl: finalGifUrl,
        pointsReward: finalPoints,
        status: "pending",
      }).returning();

      // Update usage count
      const newUsageCount = item.usageCount + 1;
      await db.update(parentTaskLibrary).set({
        usageCount: sql`${parentTaskLibrary.usageCount} + 1`,
      }).where(eq(parentTaskLibrary.id, id));

      // Check if should deactivate (one_time or limited exhausted)
      if (item.purchaseType === "one_time" || (item.maxUsageCount !== null && newUsageCount >= item.maxUsageCount)) {
        await db.update(parentTaskLibrary).set({ isActive: false })
          .where(eq(parentTaskLibrary.id, id));
      }

      res.json(successResponse({
        task: newTask,
        remainingUses: item.maxUsageCount !== null ? Math.max(0, item.maxUsageCount - newUsageCount) : null,
        message: "تم إرسال المهمة للطفل",
      }));
    } catch (err: any) {
      console.error("Use library task error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في إرسال المهمة"));
    }
  });

  // ===== Recommendations (التوصيات) =====
  app.get("/api/parent/recommendations", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { type = "all", limit = "10" } = req.query;
      const lim = Math.min(parseInt(limit as string) || 10, 30);

      // Get parent's children info for context
      const childLinks = await db.select({ childId: parentChild.childId })
        .from(parentChild).where(eq(parentChild.parentId, parentId));
      const childIds = childLinks.map((l: any) => l.childId);

      // Get children details (governorate, school)
      let childGovernorates: string[] = [];
      let childSchoolIds: string[] = [];

      if (childIds.length > 0) {
        const childrenData = await db.select({
          id: children.id,
          governorate: children.governorate,
        }).from(children).where(inArray(children.id, childIds));
        childGovernorates = childrenData.map((c: any) => c.governorate).filter(Boolean) as string[];

        const schoolAssignments = await db.select({ schoolId: childSchoolAssignment.schoolId })
          .from(childSchoolAssignment).where(inArray(childSchoolAssignment.childId, childIds));
        childSchoolIds = schoolAssignments.map((s: any) => s.schoolId);
      }

      // Get parent's existing follows to exclude
      const existingFollows = await db.select({
        entityType: follows.entityType,
        entityId: follows.entityId,
      }).from(follows).where(eq(follows.followerParentId, parentId));

      const followedSchoolIds = existingFollows.filter((f: any) => f.entityType === "school").map((f: any) => f.entityId);
      const followedTeacherIds = existingFollows.filter((f: any) => f.entityType === "teacher").map((f: any) => f.entityId);

      // Get existing purchases to avoid recommending same tasks
      const existingOrders = await db.select({ taskId: teacherTaskOrders.teacherTaskId })
        .from(teacherTaskOrders).where(eq(teacherTaskOrders.buyerParentId, parentId));
      const purchasedTaskIds = existingOrders.map((o: any) => o.taskId);

      const result: { teachers?: any[]; schools?: any[]; tasks?: any[] } = {};

      // Recommend teachers
      if (type === "all" || type === "teachers") {
        // Teachers from same governorate or from child's school, not already followed
        let teacherQuery = db.select({
          id: schoolTeachers.id,
          name: schoolTeachers.name,
          avatarUrl: schoolTeachers.avatarUrl,
          subject: schoolTeachers.subject,
          bio: schoolTeachers.bio,
          totalTasksSold: schoolTeachers.totalTasksSold,
          activityScore: schoolTeachers.activityScore,
          schoolId: schoolTeachers.schoolId,
        }).from(schoolTeachers)
          .where(eq(schoolTeachers.isActive, true))
          .orderBy(desc(schoolTeachers.activityScore))
          .limit(lim);

        let allTeachers = await teacherQuery;

        // Score and sort teachers
        const scoredTeachers = allTeachers
          .filter((t: any) => !followedTeacherIds.includes(t.id))
          .map((t: any) => {
            let score = t.activityScore || 0;
            // Boost if from child's school
            if (childSchoolIds.includes(t.schoolId)) score += 100;
            // Boost by tasks sold
            score += (t.totalTasksSold || 0) * 2;
            return { ...t, _score: score, _type: "teacher" };
          })
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, lim);

        result.teachers = scoredTeachers;
      }

      // Recommend schools
      if (type === "all" || type === "schools") {
        let allSchools = await db.select({
          id: schools.id,
          name: schools.name,
          nameAr: schools.nameAr,
          governorate: schools.governorate,
          imageUrl: schools.imageUrl,
          isVerified: schools.isVerified,
          totalTeachers: schools.totalTeachers,
          totalStudents: schools.totalStudents,
          activityScore: schools.activityScore,
        }).from(schools)
          .where(eq(schools.isActive, true))
          .orderBy(desc(schools.activityScore))
          .limit(lim * 2);

        const scoredSchools = allSchools
          .filter((s: any) => !followedSchoolIds.includes(s.id))
          .map((s: any) => {
            let score = s.activityScore || 0;
            // Boost if same governorate as children
            if (childGovernorates.includes(s.governorate || "")) score += 50;
            // Boost verified
            if (s.isVerified) score += 30;
            score += (s.totalTeachers || 0) * 3;
            return { ...s, _score: score, _type: "school" };
          })
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, lim);

        result.schools = scoredSchools;
      }

      // Recommend tasks
      if (type === "all" || type === "tasks") {
        let allTasks = await db.select({
          id: teacherTasks.id,
          title: teacherTasks.title,
          question: teacherTasks.question,
          price: teacherTasks.price,
          pointsReward: teacherTasks.pointsReward,
          subjectLabel: teacherTasks.subjectLabel,
          purchaseCount: teacherTasks.purchaseCount,
          teacherId: teacherTasks.teacherId,
          imageUrl: teacherTasks.imageUrl,
        }).from(teacherTasks)
          .where(and(
            eq(teacherTasks.isActive, true),
            eq(teacherTasks.isPublic, true)
          ))
          .orderBy(desc(teacherTasks.purchaseCount))
          .limit(lim * 3);

        const scoredTasks = allTasks
          .filter((t: any) => !purchasedTaskIds.includes(t.id))
          .map((t: any) => {
            let score = (t.purchaseCount || 0) * 5;
            // Boost if from followed teacher
            if (followedTeacherIds.includes(t.teacherId)) score += 50;
            // Boost if from child's school teacher
            return { ...t, _score: score, _type: "teacher_task" };
          })
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, lim);

        result.tasks = scoredTasks;
      }

      res.json(successResponse(result));
    } catch (err: any) {
      console.error("Recommendations error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في التوصيات"));
    }
  });

  // ===== Parent Profile Data (بيانات ملف الأهل) =====
  app.get("/api/parent/profile-data", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      // Get parent info
      const [parent] = await db.select({
        id: parents.id,
        name: parents.name,
        email: parents.email,
        phoneNumber: parents.phoneNumber,
        avatarUrl: parents.avatarUrl,
        coverImageUrl: parents.coverImageUrl,
        bio: parents.bio,
        governorate: parents.governorate,
        city: parents.city,
        socialLinks: parents.socialLinks,
        createdAt: parents.createdAt,
      }).from(parents).where(eq(parents.id, parentId)).limit(1);

      const [profileUpdateCount] = await db
        .select({ count: count() })
        .from(parentAuditLogs)
        .where(and(
          eq(parentAuditLogs.parentId, parentId),
          eq(parentAuditLogs.action, "PROFILE_UPDATED")
        ));

      const profileRequiresPassword = Number(profileUpdateCount?.count || 0) >= 1;

      // Get follow counts
      const [followCounts] = await db.select({
        following: count(),
      }).from(follows).where(eq(follows.followerParentId, parentId));

      // Get library task count
      const [libCount] = await db.select({
        count: count(),
      }).from(parentTaskLibrary).where(and(
        eq(parentTaskLibrary.parentId, parentId),
        eq(parentTaskLibrary.isActive, true)
      ));

      // Get favorites count
      const [favCount] = await db.select({
        count: count(),
      }).from(taskFavorites).where(eq(taskFavorites.parentId, parentId));

      // Get children count
      const [childCount] = await db.select({
        count: count(),
      }).from(parentChild).where(eq(parentChild.parentId, parentId));

      res.json(successResponse({
        parent,
        profileRequiresPassword,
        stats: {
          following: followCounts?.following || 0,
          libraryTasks: libCount?.count || 0,
          favorites: favCount?.count || 0,
          children: childCount?.count || 0,
        },
      }));
    } catch (err: any) {
      console.error("Profile data error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في بيانات الملف"));
    }
  });

  // Get parent's followed entities
  app.get("/api/parent/following", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { type } = req.query;

      let query = db.select().from(follows)
        .where(eq(follows.followerParentId, parentId))
        .orderBy(desc(follows.createdAt));

      let results = await query;

      if (type) {
        results = results.filter((f: any) => f.entityType === type);
      }

      // Enrich with entity details
      const enriched = [];
      for (const f of results) {
        let entity: any = null;
        if (f.entityType === "school") {
          const [s] = await db.select({
            id: schools.id, name: schools.name, imageUrl: schools.imageUrl, governorate: schools.governorate,
          }).from(schools).where(eq(schools.id, f.entityId)).limit(1);
          entity = s;
        } else if (f.entityType === "teacher") {
          const [t] = await db.select({
            id: schoolTeachers.id, name: schoolTeachers.name, avatarUrl: schoolTeachers.avatarUrl, subject: schoolTeachers.subject,
          }).from(schoolTeachers).where(eq(schoolTeachers.id, f.entityId)).limit(1);
          entity = t;
        } else if (f.entityType === "library") {
          // Libraries use a different table, skip for now
        }
        if (entity) {
          enriched.push({ ...f, entity });
        }
      }

      res.json(successResponse({ following: enriched }));
    } catch (err: any) {
      console.error("Get following error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ"));
    }
  });

  // ===== Browse Teacher Tasks (تصفح مهام المعلمين) =====
  app.get("/api/parent/browse-tasks", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { subject, sort = "popular", limit = "20", offset = "0", q, teacherId: filterTeacherId } = req.query;
      const lim = Math.min(parseInt(limit as string) || 20, 50);
      const off = parseInt(offset as string) || 0;

      let conditions = [eq(teacherTasks.isActive, true), eq(teacherTasks.isPublic, true)];
      if (filterTeacherId && String(filterTeacherId).trim()) {
        conditions.push(eq(teacherTasks.teacherId, String(filterTeacherId).trim()));
      }
      if (subject && String(subject).trim()) {
        conditions.push(ilike(teacherTasks.subjectLabel, `%${String(subject).trim()}%`));
      }
      if (q && String(q).trim().length >= 2) {
        const term = String(q).trim();
        conditions.push(or(
          ilike(teacherTasks.title, `%${term}%`),
          ilike(teacherTasks.question, `%${term}%`)
        )!);
      }

      let orderBy;
      switch (sort) {
        case "newest": orderBy = desc(teacherTasks.createdAt); break;
        case "price_low": orderBy = asc(teacherTasks.price); break;
        case "price_high": orderBy = desc(teacherTasks.price); break;
        case "likes": orderBy = desc(teacherTasks.likesCount); break;
        default: orderBy = desc(teacherTasks.purchaseCount);
      }

      const allTasks = await db.select({
        id: teacherTasks.id,
        title: teacherTasks.title,
        question: teacherTasks.question,
        subjectLabel: teacherTasks.subjectLabel,
        price: teacherTasks.price,
        pointsReward: teacherTasks.pointsReward,
        purchaseCount: teacherTasks.purchaseCount,
        likesCount: teacherTasks.likesCount,
        teacherId: teacherTasks.teacherId,
        imageUrl: teacherTasks.imageUrl,
        coverImageUrl: teacherTasks.coverImageUrl,
        createdAt: teacherTasks.createdAt,
      }).from(teacherTasks)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(lim)
        .offset(off);

      // Get teacher names for tasks
      const teacherIds = Array.from(new Set(allTasks.map((t: any) => String(t.teacherId)))) as string[];
      let teacherMap: Record<string, { name: string; avatarUrl: string | null }> = {};
      if (teacherIds.length > 0) {
        const teachers = await db.select({
          id: schoolTeachers.id,
          name: schoolTeachers.name,
          avatarUrl: schoolTeachers.avatarUrl,
        }).from(schoolTeachers).where(inArray(schoolTeachers.id, teacherIds));
        teachers.forEach((t: any) => { teacherMap[t.id] = { name: t.name, avatarUrl: t.avatarUrl }; });
      }

      // Check which tasks parent already purchased
      const purchasedIds = new Set(
        (await db.select({ taskId: teacherTaskOrders.teacherTaskId })
          .from(teacherTaskOrders)
          .where(eq(teacherTaskOrders.buyerParentId, parentId)))
          .map((o: any) => o.taskId)
      );

      // Check which tasks parent liked
      const likedIds = new Set(
        (await db.select({ taskId: teacherTaskLikes.taskId })
          .from(teacherTaskLikes)
          .where(eq(teacherTaskLikes.parentId, parentId)))
          .map((l: any) => l.taskId)
      );

      // Check which tasks are in cart
      const cartIds = new Set(
        (await db.select({ taskId: taskCart.teacherTaskId })
          .from(taskCart)
          .where(eq(taskCart.parentId, parentId)))
          .map((c: any) => c.taskId)
      );

      const enriched = allTasks.map((t: any) => ({
        ...t,
        teacherName: teacherMap[t.teacherId]?.name || "معلم",
        teacherAvatar: teacherMap[t.teacherId]?.avatarUrl || null,
        isPurchased: purchasedIds.has(t.id),
        isLiked: likedIds.has(t.id),
        inCart: cartIds.has(t.id),
      }));

      res.json(successResponse({ tasks: enriched }));
    } catch (err: any) {
      console.error("Browse tasks error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في تصفح المهام"));
    }
  });

  // ===== Task Likes (إعجاب المهام) =====

  // Toggle like on a teacher task
  app.post("/api/parent/tasks/:taskId/like", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { taskId } = req.params;

      // Verify task exists
      const [task] = await db.select({ id: teacherTasks.id }).from(teacherTasks)
        .where(and(eq(teacherTasks.id, taskId), eq(teacherTasks.isActive, true))).limit(1);
      if (!task) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المهمة غير موجودة"));
      }

      // Check existing like
      const [existing] = await db.select().from(teacherTaskLikes)
        .where(and(eq(teacherTaskLikes.taskId, taskId), eq(teacherTaskLikes.parentId, parentId))).limit(1);

      if (existing) {
        // Unlike
        await db.delete(teacherTaskLikes).where(eq(teacherTaskLikes.id, existing.id));
        await db.update(teacherTasks).set({
          likesCount: sql`GREATEST(${teacherTasks.likesCount} - 1, 0)`,
        }).where(eq(teacherTasks.id, taskId));

        const [updated] = await db.select({ likesCount: teacherTasks.likesCount })
          .from(teacherTasks).where(eq(teacherTasks.id, taskId)).limit(1);

        return res.json(successResponse({ isLiked: false, likesCount: updated?.likesCount || 0 }));
      }

      // Like
      await db.insert(teacherTaskLikes).values({ taskId, parentId });
      await db.update(teacherTasks).set({
        likesCount: sql`${teacherTasks.likesCount} + 1`,
      }).where(eq(teacherTasks.id, taskId));

      const [updated] = await db.select({ likesCount: teacherTasks.likesCount })
        .from(teacherTasks).where(eq(teacherTasks.id, taskId)).limit(1);

      res.json(successResponse({ isLiked: true, likesCount: updated?.likesCount || 0 }));
    } catch (err: any) {
      console.error("Toggle task like error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في الإعجاب"));
    }
  });

  // Check likes status for multiple tasks
  app.post("/api/parent/tasks/check-likes", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { taskIds } = req.body;
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.json(successResponse({}));
      }

      const likes = await db.select({ taskId: teacherTaskLikes.taskId })
        .from(teacherTaskLikes)
        .where(and(eq(teacherTaskLikes.parentId, parentId), inArray(teacherTaskLikes.taskId, taskIds)));

      const likedMap: Record<string, boolean> = {};
      likes.forEach((l: any) => { likedMap[l.taskId] = true; });

      res.json(successResponse(likedMap));
    } catch (err: any) {
      console.error("Check task likes error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ"));
    }
  });

  // ===== Task Cart (سلة المهام) =====

  // Get cart items
  app.get("/api/parent/cart", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      const items = await db.select({
        id: taskCart.id,
        teacherTaskId: taskCart.teacherTaskId,
        createdAt: taskCart.createdAt,
        taskTitle: teacherTasks.title,
        taskQuestion: teacherTasks.question,
        taskPrice: teacherTasks.price,
        taskPointsReward: teacherTasks.pointsReward,
        taskSubjectLabel: teacherTasks.subjectLabel,
        taskImageUrl: teacherTasks.imageUrl,
        taskCoverImageUrl: teacherTasks.coverImageUrl,
        taskIsActive: teacherTasks.isActive,
        teacherId: teacherTasks.teacherId,
      }).from(taskCart)
        .innerJoin(teacherTasks, eq(taskCart.teacherTaskId, teacherTasks.id))
        .where(eq(taskCart.parentId, parentId))
        .orderBy(desc(taskCart.createdAt));

      // Get teacher names
      const teacherIds = Array.from(new Set(items.map((i: any) => String(i.teacherId)))) as string[];
      let teacherMap: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const teachers = await db.select({ id: schoolTeachers.id, name: schoolTeachers.name })
          .from(schoolTeachers).where(inArray(schoolTeachers.id, teacherIds));
        teachers.forEach((t: any) => { teacherMap[t.id] = t.name; });
      }

      const enriched = items.map((i: any) => ({
        ...i,
        teacherName: teacherMap[i.teacherId] || "معلم",
      }));

      // Get wallet balance
      const [wallet] = await db.select({ balance: parentWallet.balance })
        .from(parentWallet).where(eq(parentWallet.parentId, parentId)).limit(1);

      const totalPrice = items.reduce((sum: number, i: any) => sum + parseFloat(String(i.taskPrice)), 0);

      res.json(successResponse({
        items: enriched,
        totalPrice: totalPrice.toFixed(2),
        walletBalance: wallet?.balance || "0.00",
        itemCount: items.length,
      }));
    } catch (err: any) {
      console.error("Get cart error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب السلة"));
    }
  });

  // Add to cart
  app.post("/api/parent/cart/add", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { teacherTaskId } = req.body;

      if (!teacherTaskId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "معرّف المهمة مطلوب"));
      }

      // Verify task exists and is active
      const [task] = await db.select({ id: teacherTasks.id, price: teacherTasks.price })
        .from(teacherTasks)
        .where(and(eq(teacherTasks.id, teacherTaskId), eq(teacherTasks.isActive, true), eq(teacherTasks.isPublic, true)))
        .limit(1);

      if (!task) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المهمة غير موجودة"));
      }

      // Check if already purchased
      const [alreadyBought] = await db.select({ id: teacherTaskOrders.id })
        .from(teacherTaskOrders)
        .where(and(eq(teacherTaskOrders.teacherTaskId, teacherTaskId), eq(teacherTaskOrders.buyerParentId, parentId)))
        .limit(1);

      if (alreadyBought) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "لقد اشتريت هذه المهمة مسبقاً"));
      }

      // Add to cart (ignore conflict = already in cart)
      await db.insert(taskCart).values({ parentId, teacherTaskId }).onConflictDoNothing();

      // Get updated cart count
      const [cartCount] = await db.select({ count: count() })
        .from(taskCart).where(eq(taskCart.parentId, parentId));

      res.json(successResponse({ message: "تم إضافة المهمة للسلة", cartCount: cartCount?.count || 0 }));
    } catch (err: any) {
      console.error("Add to cart error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في إضافة المهمة للسلة"));
    }
  });

  // Remove from cart
  app.delete("/api/parent/cart/:itemId", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { itemId } = req.params;

      await db.delete(taskCart).where(and(eq(taskCart.id, itemId), eq(taskCart.parentId, parentId)));

      const [cartCount] = await db.select({ count: count() })
        .from(taskCart).where(eq(taskCart.parentId, parentId));

      res.json(successResponse({ message: "تم إزالة المهمة من السلة", cartCount: cartCount?.count || 0 }));
    } catch (err: any) {
      console.error("Remove from cart error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في إزالة المهمة"));
    }
  });

  // Cart count
  app.get("/api/parent/cart/count", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const [result] = await db.select({ count: count() })
        .from(taskCart).where(eq(taskCart.parentId, parentId));
      res.json(successResponse({ count: result?.count || 0 }));
    } catch (err: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ"));
    }
  });

  // Checkout cart (buy all items)
  app.post("/api/parent/cart/checkout", authMiddleware, requireLinkedChildForParentMonetization, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { purchaseType = "permanent", maxUsageCount } = req.body || {};

      // Validate purchaseType
      const validTypes = ["one_time", "limited", "permanent"];
      const finalPurchaseType = validTypes.includes(purchaseType) ? purchaseType : "permanent";
      if (finalPurchaseType === "limited" && (!maxUsageCount || maxUsageCount < 1)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "يجب تحديد عدد مرات الاستخدام للشراء المحدود"));
      }

      // Get cart items
      const items = await db.select({
        id: taskCart.id,
        teacherTaskId: taskCart.teacherTaskId,
      }).from(taskCart).where(eq(taskCart.parentId, parentId));

      if (items.length === 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "السلة فارغة"));
      }

      // Get tasks details
      const taskIds: string[] = items.map((i: any) => i.teacherTaskId);
      const taskDetails = await db.select().from(teacherTasks)
        .where(and(inArray(teacherTasks.id, taskIds), eq(teacherTasks.isActive, true)));

      if (taskDetails.length === 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "المهام غير متوفرة"));
      }

      // Calculate total price
      const totalPrice = taskDetails.reduce((sum: number, t: any) => sum + parseFloat(String(t.price)), 0);

      // Check wallet balance
      const [wallet] = await db.select().from(parentWallet)
        .where(eq(parentWallet.parentId, parentId)).limit(1);

      const balance = Number(wallet?.balance || 0);
      if (balance < totalPrice) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST,
          `رصيدك غير كافٍ. الرصيد: ${balance.toFixed(2)}, المطلوب: ${totalPrice.toFixed(2)}`));
      }

      // Deduct total from wallet
      await db.update(parentWallet).set({
        balance: sql`${parentWallet.balance} - ${totalPrice.toFixed(2)}`,
      }).where(eq(parentWallet.parentId, parentId));

      // Process each task
      const orders = [];
      const libraryItems = [];

      for (const task of taskDetails) {
        const price = parseFloat(String(task.price));

        // Get teacher commission rate
        const [teacher] = await db.select({ commissionRatePct: schoolTeachers.commissionRatePct })
          .from(schoolTeachers).where(eq(schoolTeachers.id, task.teacherId)).limit(1);

        const commissionPct = parseFloat(String(teacher?.commissionRatePct || "10"));
        const commissionAmount = (price * commissionPct) / 100;
        const teacherEarning = price - commissionAmount;

        // Create order
        const [order] = await db.insert(teacherTaskOrders).values({
          teacherTaskId: task.id,
          teacherId: task.teacherId,
          buyerParentId: parentId,
          price: price.toFixed(2),
          commissionRatePct: commissionPct.toFixed(2),
          commissionAmount: commissionAmount.toFixed(2),
          teacherEarningAmount: teacherEarning.toFixed(2),
          status: "completed",
          holdDays: 7,
        }).returning();
        orders.push(order);

        // Update task purchase count
        await db.update(teacherTasks).set({
          purchaseCount: sql`${teacherTasks.purchaseCount} + 1`,
          updatedAt: new Date(),
        }).where(eq(teacherTasks.id, task.id));

        // Update teacher stats
        await db.update(schoolTeachers).set({
          totalTasksSold: sql`${schoolTeachers.totalTasksSold} + 1`,
          updatedAt: new Date(),
        }).where(eq(schoolTeachers.id, task.teacherId));

        // Ensure teacher balance & update
        const [existingBal] = await db.select().from(teacherBalances)
          .where(eq(teacherBalances.teacherId, task.teacherId)).limit(1);
        if (!existingBal) {
          await db.insert(teacherBalances).values({ teacherId: task.teacherId }).onConflictDoNothing();
        }
        await db.update(teacherBalances).set({
          pendingBalance: sql`${teacherBalances.pendingBalance} + ${teacherEarning.toFixed(2)}`,
          totalSalesAmount: sql`${teacherBalances.totalSalesAmount} + ${price.toFixed(2)}`,
          totalCommissionAmount: sql`${teacherBalances.totalCommissionAmount} + ${commissionAmount.toFixed(2)}`,
          updatedAt: new Date(),
        }).where(eq(teacherBalances.teacherId, task.teacherId));

        // Add to parent's task library
        const [libItem] = await db.insert(parentTaskLibrary).values({
          parentId,
          sourceType: "teacher_task",
          sourceTaskId: task.id,
          title: task.title,
          question: task.question,
          answers: task.answers,
          imageUrl: task.imageUrl,
          gifUrl: task.gifUrl,
          subjectLabel: task.subjectLabel,
          pointsReward: task.pointsReward,
          purchaseType: finalPurchaseType,
          maxUsageCount: finalPurchaseType === "one_time" ? 1 : finalPurchaseType === "limited" ? (maxUsageCount || 1) : null,
        }).returning();
        libraryItems.push(libItem);
      }

      // Clear cart
      await db.delete(taskCart).where(eq(taskCart.parentId, parentId));

      res.json(successResponse({
        ordersCount: orders.length,
        totalPaid: totalPrice.toFixed(2),
        message: `تم شراء ${orders.length} مهمة بنجاح وإضافتها لمكتبتك`,
      }));
    } catch (err: any) {
      console.error("Cart checkout error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في إتمام الشراء"));
    }
  });
}
