import type { Express } from "express";
import { storage } from "../storage";
import { follows, schools, schoolTeachers, libraries, parents, schoolPosts } from "../../shared/schema";
import { eq, and, sql, desc, count, gt, inArray } from "drizzle-orm";
import { authMiddleware } from "./middleware";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";

export function registerFollowRoutes(app: Express) {
  const db = storage.db;

  // ===== متابعة كيان =====
  app.post("/api/follow", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { entityType, entityId } = req.body;

      if (!entityType || !entityId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "entityType و entityId مطلوبان"));
      }

      if (!["school", "teacher", "library"].includes(entityType)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "نوع الكيان غير صالح"));
      }

      // Verify entity exists
      if (entityType === "school") {
        const school = await db.select({ id: schools.id }).from(schools).where(eq(schools.id, entityId)).limit(1);
        if (!school.length) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المدرسة غير موجودة"));
      } else if (entityType === "teacher") {
        const teacher = await db.select({ id: schoolTeachers.id }).from(schoolTeachers).where(eq(schoolTeachers.id, entityId)).limit(1);
        if (!teacher.length) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المدرس غير موجود"));
      } else if (entityType === "library") {
        const lib = await db.select({ id: libraries.id }).from(libraries).where(eq(libraries.id, entityId)).limit(1);
        if (!lib.length) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المكتبة غير موجودة"));
      }

      // Check if already following
      const existing = await db.select({ id: follows.id }).from(follows)
        .where(and(
          eq(follows.followerParentId, parentId),
          eq(follows.entityType, entityType),
          eq(follows.entityId, entityId),
        )).limit(1);

      if (existing.length) {
        return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "أنت تتابع هذا الكيان بالفعل"));
      }

      const [follow] = await db.insert(follows).values({
        followerParentId: parentId,
        entityType,
        entityId,
      }).returning();

      res.json(successResponse({ followId: follow.id }, "تمت المتابعة بنجاح"));
    } catch (err: any) {
      console.error("Follow error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في عملية المتابعة"));
    }
  });

  // ===== إلغاء المتابعة =====
  app.delete("/api/follow", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { entityType, entityId } = req.body;

      if (!entityType || !entityId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "entityType و entityId مطلوبان"));
      }

      const deleted = await db.delete(follows)
        .where(and(
          eq(follows.followerParentId, parentId),
          eq(follows.entityType, entityType),
          eq(follows.entityId, entityId),
        )).returning();

      if (!deleted.length) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "لم يتم العثور على المتابعة"));
      }

      res.json(successResponse(null, "تم إلغاء المتابعة بنجاح"));
    } catch (err: any) {
      console.error("Unfollow error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في عملية إلغاء المتابعة"));
    }
  });

  // ===== قائمة الكيانات التي يتابعها الأب =====
  app.get("/api/follow/my", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      const myFollows = await db.select().from(follows)
        .where(eq(follows.followerParentId, parentId))
        .orderBy(desc(follows.createdAt));

      // Enrich with entity details
      const enriched = await Promise.all(myFollows.map(async (f: any) => {
        let entityName = "";
        let entityImage = "";
        if (f.entityType === "school") {
          const [s] = await db.select({ name: schools.name, imageUrl: schools.imageUrl }).from(schools).where(eq(schools.id, f.entityId)).limit(1);
          if (s) { entityName = s.name; entityImage = s.imageUrl || ""; }
        } else if (f.entityType === "teacher") {
          const [t] = await db.select({ name: schoolTeachers.name, avatarUrl: schoolTeachers.avatarUrl }).from(schoolTeachers).where(eq(schoolTeachers.id, f.entityId)).limit(1);
          if (t) { entityName = t.name; entityImage = t.avatarUrl || ""; }
        } else if (f.entityType === "library") {
          const [l] = await db.select({ name: libraries.name, imageUrl: libraries.imageUrl }).from(libraries).where(eq(libraries.id, f.entityId)).limit(1);
          if (l) { entityName = l.name; entityImage = l.imageUrl || ""; }
        }
        return { ...f, entityName, entityImage };
      }));

      res.json(successResponse({ follows: enriched }));
    } catch (err: any) {
      console.error("Get follows error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب المتابعات"));
    }
  });

  // ===== عدد المتابعين لكيان =====
  app.get("/api/follow/count/:type/:id", async (req, res) => {
    try {
      const { type, id } = req.params;

      if (!["school", "teacher", "library"].includes(type)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "نوع الكيان غير صالح"));
      }

      const [result] = await db.select({ count: count() }).from(follows)
        .where(and(eq(follows.entityType, type), eq(follows.entityId, id)));

      res.json(successResponse({ count: result?.count || 0 }));
    } catch (err: any) {
      console.error("Follow count error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب عدد المتابعين"));
    }
  });

  // ===== هل الأب يتابع كيان معين =====
  app.get("/api/follow/status/:type/:id", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { type, id } = req.params;

      const existing = await db.select({ id: follows.id }).from(follows)
        .where(and(
          eq(follows.followerParentId, parentId),
          eq(follows.entityType, type),
          eq(follows.entityId, id),
        )).limit(1);

      res.json(successResponse({ isFollowing: existing.length > 0 }));
    } catch (err: any) {
      console.error("Follow status error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب حالة المتابعة"));
    }
  });

  // ===== عدد المحتوى الجديد من المتابَعين =====
  app.get("/api/follow/new-content-counts", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      const myFollows = await db.select({
        entityType: follows.entityType,
        entityId: follows.entityId,
        lastCheckedAt: follows.lastCheckedAt,
      }).from(follows)
        .where(eq(follows.followerParentId, parentId));

      if (!myFollows.length) {
        return res.json(successResponse({ schools: 0, teachers: 0 }));
      }

      let schoolNewCount = 0;
      let teacherNewCount = 0;

      // Get followed school IDs with their lastCheckedAt
      const schoolFollows = myFollows.filter((f: any) => f.entityType === "school");
      const teacherFollows = myFollows.filter((f: any) => f.entityType === "teacher");

      // Count new posts from followed schools
      for (const sf of schoolFollows) {
        const [result] = await db.select({ count: count() }).from(schoolPosts)
          .where(and(
            eq(schoolPosts.schoolId, sf.entityId),
            eq(schoolPosts.authorType, "school"),
            eq(schoolPosts.isActive, true),
            gt(schoolPosts.createdAt, sf.lastCheckedAt),
          ));
        schoolNewCount += result?.count || 0;
      }

      // Count new posts from followed teachers
      for (const tf of teacherFollows) {
        const [result] = await db.select({ count: count() }).from(schoolPosts)
          .where(and(
            eq(schoolPosts.teacherId, tf.entityId),
            eq(schoolPosts.authorType, "teacher"),
            eq(schoolPosts.isActive, true),
            gt(schoolPosts.createdAt, tf.lastCheckedAt),
          ));
        teacherNewCount += result?.count || 0;
      }

      res.json(successResponse({ schools: schoolNewCount, teachers: teacherNewCount }));
    } catch (err: any) {
      console.error("New content counts error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب عدد المحتوى الجديد"));
    }
  });

  // ===== تحديث وقت آخر زيارة لنوع كيان =====
  app.post("/api/follow/mark-seen/:type", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { type } = req.params;

      if (!["school", "teacher", "library"].includes(type)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "نوع الكيان غير صالح"));
      }

      await db.update(follows)
        .set({ lastCheckedAt: new Date() })
        .where(and(
          eq(follows.followerParentId, parentId),
          eq(follows.entityType, type),
        ));

      res.json(successResponse(null, "تم تحديث وقت الزيارة"));
    } catch (err: any) {
      console.error("Mark seen error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في تحديث وقت الزيارة"));
    }
  });

  // ===== Public endpoints: قوائم المدارس والمدرسين =====

  // قائمة المدارس العامة (مع فلترة بالمحافظة)
  app.get("/api/public/schools", async (req, res) => {
    try {
      const { governorate, search, limit = "20", offset = "0" } = req.query;

      let query = db.select({
        id: schools.id,
        name: schools.name,
        nameAr: schools.nameAr,
        description: schools.description,
        address: schools.address,
        city: schools.city,
        governorate: schools.governorate,
        imageUrl: schools.imageUrl,
        coverImageUrl: schools.coverImageUrl,
        isVerified: schools.isVerified,
        totalTeachers: schools.totalTeachers,
        totalStudents: schools.totalStudents,
      }).from(schools)
        .where(eq(schools.isActive, true))
        .orderBy(desc(schools.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      let results = await query;

      // Filter by governorate if provided
      if (governorate) {
        results = results.filter((s: any) => s.governorate === governorate);
      }

      // Filter by search term if provided
      if (search) {
        const term = (search as string).toLowerCase();
        results = results.filter((s: any) =>
          s.name.toLowerCase().includes(term) ||
          (s.nameAr && s.nameAr.toLowerCase().includes(term))
        );
      }

      res.json(successResponse({ schools: results }));
    } catch (err: any) {
      console.error("Public schools error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب المدارس"));
    }
  });

  // مدرسو مدرسة معينة (public)
  app.get("/api/public/schools/:id/teachers", async (req, res) => {
    try {
      const { id } = req.params;

      // Verify school exists and is active
      const [school] = await db.select({ id: schools.id }).from(schools)
        .where(and(eq(schools.id, id), eq(schools.isActive, true))).limit(1);

      if (!school) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المدرسة غير موجودة"));
      }

      const teachers = await db.select({
        id: schoolTeachers.id,
        name: schoolTeachers.name,
        avatarUrl: schoolTeachers.avatarUrl,
        bio: schoolTeachers.bio,
        subject: schoolTeachers.subject,
        yearsExperience: schoolTeachers.yearsExperience,
      }).from(schoolTeachers)
        .where(and(eq(schoolTeachers.schoolId, id), eq(schoolTeachers.isActive, true)))
        .orderBy(schoolTeachers.name);

      res.json(successResponse({ teachers }));
    } catch (err: any) {
      console.error("Public school teachers error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب المدرسين"));
    }
  });

  // بروفايل مدرس (public)
  app.get("/api/public/teacher/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const [teacher] = await db.select({
        id: schoolTeachers.id,
        name: schoolTeachers.name,
        avatarUrl: schoolTeachers.avatarUrl,
        coverImageUrl: schoolTeachers.coverImageUrl,
        bio: schoolTeachers.bio,
        subject: schoolTeachers.subject,
        yearsExperience: schoolTeachers.yearsExperience,
        socialLinks: schoolTeachers.socialLinks,
        totalTasksSold: schoolTeachers.totalTasksSold,
        totalStudents: schoolTeachers.totalStudents,
        schoolId: schoolTeachers.schoolId,
      }).from(schoolTeachers)
        .where(and(eq(schoolTeachers.id, id), eq(schoolTeachers.isActive, true)))
        .limit(1);

      if (!teacher) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المدرس غير موجود"));
      }

      // Get school name
      const [school] = await db.select({ name: schools.name, imageUrl: schools.imageUrl })
        .from(schools).where(eq(schools.id, teacher.schoolId)).limit(1);

      // Get follower count
      const [followCount] = await db.select({ count: count() }).from(follows)
        .where(and(eq(follows.entityType, "teacher"), eq(follows.entityId, id)));

      res.json(successResponse({
        ...teacher,
        schoolName: school?.name || "",
        schoolImageUrl: school?.imageUrl || "",
        followersCount: followCount?.count || 0,
      }));
    } catch (err: any) {
      console.error("Public teacher profile error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب بيانات المدرس"));
    }
  });

  // بروفايل مكتبة (public)
  app.get("/api/public/library/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const [library] = await db.select({
        id: libraries.id,
        name: libraries.name,
        description: libraries.description,
        bio: libraries.bio,
        location: libraries.location,
        imageUrl: libraries.imageUrl,
        coverImageUrl: libraries.coverImageUrl,
        governorate: libraries.governorate,
        city: libraries.city,
        phoneNumber: libraries.phoneNumber,
        email: libraries.email,
        socialLinks: libraries.socialLinks,
        totalProducts: libraries.totalProducts,
        totalSales: libraries.totalSales,
      }).from(libraries)
        .where(and(eq(libraries.id, id), eq(libraries.isActive, true)))
        .limit(1);

      if (!library) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المكتبة غير موجودة"));
      }

      // Get follower count
      const [followCount] = await db.select({ count: count() }).from(follows)
        .where(and(eq(follows.entityType, "library"), eq(follows.entityId, id)));

      res.json(successResponse({
        ...library,
        followersCount: followCount?.count || 0,
      }));
    } catch (err: any) {
      console.error("Public library profile error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب بيانات المكتبة"));
    }
  });

  // منشورات مكتبة (public)
  app.get("/api/public/library/:id/posts", async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = "20", offset = "0" } = req.query;
      const { libraryPosts: lp } = await import("../../shared/schema");

      const posts = await db.select().from(lp)
        .where(and(eq(lp.libraryId, id), eq(lp.isActive, true)))
        .orderBy(desc(lp.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      res.json(successResponse({ posts }));
    } catch (err: any) {
      console.error("Public library posts error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب المنشورات"));
    }
  });

  // تقييمات مكتبة (public)
  app.get("/api/public/library/:id/reviews", async (req, res) => {
    try {
      const { id } = req.params;
      const { libraryReviews: lr } = await import("../../shared/schema");

      const reviews = await db.select({
        id: lr.id,
        rating: lr.rating,
        comment: lr.comment,
        createdAt: lr.createdAt,
        parentName: parents.name,
        parentAvatarUrl: parents.avatarUrl,
      }).from(lr)
        .leftJoin(parents, eq(lr.parentId, parents.id))
        .where(and(eq(lr.libraryId, id), eq(lr.isActive, true)))
        .orderBy(desc(lr.createdAt));

      // Calculate average rating
      const totalRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
      const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : "0";

      res.json(successResponse({ reviews, avgRating, totalReviews: reviews.length }));
    } catch (err: any) {
      console.error("Public library reviews error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب التقييمات"));
    }
  });
}
