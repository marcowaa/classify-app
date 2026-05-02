import type { Express } from "express";
import { storage } from "../storage";
import { symbolCategories, librarySymbols } from "../../shared/schema";
import { eq, and, or, ilike, sql, asc, desc, inArray } from "drizzle-orm";
import { authMiddleware } from "./middleware";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";

export function registerSymbolRoutes(app: Express) {
  const db = storage.db;

  // Get all categories
  app.get("/api/symbols/categories", async (_req, res) => {
    try {
      const cats = await db.select().from(symbolCategories)
        .where(eq(symbolCategories.isActive, true))
        .orderBy(asc(symbolCategories.sortOrder));
      res.json(successResponse(cats));
    } catch (err: any) {
      console.error("Get symbol categories error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب فئات الرموز"));
    }
  });

  // Get symbols by category (with pagination)
  app.get("/api/symbols", async (req, res) => {
    try {
      const { category, q, page = "1", limit = "100" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 100));
      const offset = (pageNum - 1) * limitNum;

      const conditions: any[] = [eq(librarySymbols.isActive, true)];

      if (category && category !== "all") {
        conditions.push(eq(librarySymbols.categoryId, category as string));
      }

      if (q && typeof q === "string" && q.trim().length >= 1) {
        const search = `%${q.trim()}%`;
        conditions.push(
          or(
            ilike(librarySymbols.nameAr, search),
            ilike(librarySymbols.nameEn, search),
            ilike(librarySymbols.char, search),
            sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${librarySymbols.tags}::jsonb) t WHERE t ILIKE ${search})`
          )
        );
      }

      const [items, countResult] = await Promise.all([
        db.select().from(librarySymbols)
          .where(and(...conditions))
          .orderBy(asc(librarySymbols.sortOrder), asc(librarySymbols.nameEn))
          .limit(limitNum)
          .offset(offset),
        db.select({ count: sql<number>`count(*)::int` }).from(librarySymbols)
          .where(and(...conditions)),
      ]);

      res.json(successResponse({
        symbols: items,
        total: countResult[0]?.count || 0,
        page: pageNum,
        limit: limitNum,
        hasMore: offset + items.length < (countResult[0]?.count || 0),
      }));
    } catch (err: any) {
      console.error("Get symbols error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب الرموز"));
    }
  });

  // Search symbols (lightweight autocomplete endpoint)
  app.get("/api/symbols/search", async (req, res) => {
    try {
      const { q, limit = "30" } = req.query;
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 30));

      if (!q || typeof q !== "string" || q.trim().length < 1) {
        return res.json(successResponse([]));
      }

      const search = `%${q.trim()}%`;
      const results = await db.select({
        id: librarySymbols.id,
        char: librarySymbols.char,
        nameAr: librarySymbols.nameAr,
        nameEn: librarySymbols.nameEn,
        categoryId: librarySymbols.categoryId,
        imageUrl: librarySymbols.imageUrl,
        price: librarySymbols.price,
        isPremium: librarySymbols.isPremium,
      }).from(librarySymbols)
        .where(and(
          eq(librarySymbols.isActive, true),
          or(
            ilike(librarySymbols.nameAr, search),
            ilike(librarySymbols.nameEn, search),
            ilike(librarySymbols.char, search),
            sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${librarySymbols.tags}::jsonb) t WHERE t ILIKE ${search})`
          )
        ))
        .orderBy(asc(librarySymbols.sortOrder))
        .limit(limitNum);

      res.json(successResponse(results));
    } catch (err: any) {
      console.error("Search symbols error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في البحث"));
    }
  });

  // Admin: Add library symbol
  app.post("/api/admin/library-symbols", authMiddleware, async (req: any, res) => {
    try {
      const { categoryId, char, nameAr, nameEn, tags, imageUrl, price, isPremium } = req.body;
      if (!categoryId || !char || !nameAr || !nameEn) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "جميع الحقول مطلوبة"));
      }
      const [sym] = await db.insert(librarySymbols).values({
        categoryId, char, nameAr, nameEn,
        tags: tags || [],
        imageUrl: imageUrl || null,
        price: price || 0,
        isPremium: isPremium || false,
      }).returning();
      res.json(successResponse(sym));
    } catch (err: any) {
      console.error("Add library symbol error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في إضافة الرمز"));
    }
  });

  // Admin: Update library symbol
  app.patch("/api/admin/library-symbols/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates: any = {};
      const allowed = ["categoryId", "char", "nameAr", "nameEn", "tags", "imageUrl", "price", "isPremium", "isActive", "sortOrder"];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const [sym] = await db.update(librarySymbols).set(updates).where(eq(librarySymbols.id, id)).returning();
      if (!sym) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "الرمز غير موجود"));
      res.json(successResponse(sym));
    } catch (err: any) {
      console.error("Update library symbol error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في تحديث الرمز"));
    }
  });

  // Admin: Delete library symbol
  app.delete("/api/admin/library-symbols/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(librarySymbols).where(eq(librarySymbols.id, id));
      res.json(successResponse({ deleted: true }));
    } catch (err: any) {
      console.error("Delete library symbol error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في حذف الرمز"));
    }
  });

  // Admin: Bulk import library symbols
  app.post("/api/admin/library-symbols/bulk-import", authMiddleware, async (req: any, res) => {
    try {
      const { symbols: syms } = req.body;
      if (!Array.isArray(syms) || syms.length === 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "لا توجد رموز للاستيراد"));
      }

      const values = syms.map((s: any, i: number) => ({
        categoryId: s.categoryId,
        char: s.char,
        nameAr: s.nameAr || s.char,
        nameEn: s.nameEn || s.char,
        tags: s.tags || [],
        imageUrl: s.imageUrl || null,
        price: s.price || 0,
        isPremium: s.isPremium || false,
        sortOrder: s.sortOrder ?? i,
      }));

      // Batch insert in chunks of 100
      let inserted = 0;
      for (let i = 0; i < values.length; i += 100) {
        const chunk = values.slice(i, i + 100);
        const result = await db.insert(librarySymbols).values(chunk).returning({ id: librarySymbols.id });
        inserted += result.length;
      }

      res.json(successResponse({ imported: inserted }));
    } catch (err: any) {
      console.error("Bulk import library symbols error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في استيراد الرموز"));
    }
  });

  // Admin: Add category  
  app.post("/api/admin/symbol-categories", authMiddleware, async (req: any, res) => {
    try {
      const { slug, nameAr, nameEn, icon, sortOrder } = req.body;
      if (!slug || !nameAr || !nameEn) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "جميع الحقول مطلوبة"));
      }
      const [cat] = await db.insert(symbolCategories).values({
        slug, nameAr, nameEn,
        icon: icon || null,
        sortOrder: sortOrder || 0,
      }).returning();
      res.json(successResponse(cat));
    } catch (err: any) {
      console.error("Add symbol category error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في إضافة الفئة"));
    }
  });

  // Admin: Update symbol category
  app.patch("/api/admin/symbol-categories/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates: any = {};
      const allowed = ["slug", "nameAr", "nameEn", "icon", "sortOrder", "isActive"];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const [cat] = await db.update(symbolCategories).set(updates).where(eq(symbolCategories.id, id)).returning();
      if (!cat) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "الفئة غير موجودة"));
      res.json(successResponse(cat));
    } catch (err: any) {
      console.error("Update symbol category error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في تحديث الفئة"));
    }
  });

  // Admin: Delete symbol category
  app.delete("/api/admin/symbol-categories/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(symbolCategories).where(eq(symbolCategories.id, id));
      res.json(successResponse({ deleted: true }));
    } catch (err: any) {
      console.error("Delete symbol category error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في حذف الفئة"));
    }
  });

  // Admin: Get all categories (including inactive)
  app.get("/api/admin/symbol-categories", authMiddleware, async (_req: any, res) => {
    try {
      const cats = await db.select().from(symbolCategories).orderBy(asc(symbolCategories.sortOrder));
      res.json(successResponse(cats));
    } catch (err: any) {
      console.error("Admin get symbol categories error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب الفئات"));
    }
  });

  // Admin: Get all library symbols (with optional category filter)
  app.get("/api/admin/library-symbols", authMiddleware, async (req: any, res) => {
    try {
      const { category } = req.query;
      const conditions: any[] = [];
      if (category && category !== "all") {
        conditions.push(eq(librarySymbols.categoryId, category as string));
      }
      const items = conditions.length > 0
        ? await db.select().from(librarySymbols).where(and(...conditions)).orderBy(asc(librarySymbols.sortOrder))
        : await db.select().from(librarySymbols).orderBy(asc(librarySymbols.sortOrder));
      const countResult = conditions.length > 0
        ? await db.select({ count: sql<number>`count(*)::int` }).from(librarySymbols).where(and(...conditions))
        : await db.select({ count: sql<number>`count(*)::int` }).from(librarySymbols);
      res.json(successResponse({ symbols: items, total: countResult[0]?.count || 0 }));
    } catch (err: any) {
      console.error("Admin get library symbols error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب الرموز"));
    }
  });

  // Admin: Seed all 1100+ symbols
  app.post("/api/admin/seed-symbols", authMiddleware, async (_req: any, res) => {
    try {
      // --- Categories ---
      const categoriesDef = [
        { slug: "numbers-letters", nameAr: "أرقام وحروف", nameEn: "Numbers & Letters", icon: "🔢", sortOrder: 1 },
        { slug: "emotions-faces", nameAr: "وجوه ومشاعر", nameEn: "Emotions & Faces", icon: "😀", sortOrder: 2 },
        { slug: "animals", nameAr: "حيوانات", nameEn: "Animals", icon: "🐱", sortOrder: 3 },
        { slug: "nature-elements", nameAr: "طبيعة وعناصر", nameEn: "Nature & Elements", icon: "🌿", sortOrder: 4 },
        { slug: "shapes-colors", nameAr: "أشكال وألوان", nameEn: "Shapes & Colors", icon: "🔵", sortOrder: 5 },
        { slug: "educational-tools", nameAr: "أدوات تعليمية", nameEn: "Educational Tools", icon: "📚", sortOrder: 6 },
        { slug: "activities-hobbies", nameAr: "أنشطة وهوايات", nameEn: "Activities & Hobbies", icon: "⚽", sortOrder: 7 },
        { slug: "rewards-achievements", nameAr: "مكافآت وإنجازات", nameEn: "Rewards & Achievements", icon: "🏆", sortOrder: 8 },
        { slug: "project-specific", nameAr: "رموز المنصة", nameEn: "Project Symbols", icon: "✨", sortOrder: 9 },
      ];
      const catMap: Record<string, string> = {};
      for (const cat of categoriesDef) {
        const existing = await db.select({ id: symbolCategories.id })
          .from(symbolCategories).where(eq(symbolCategories.slug, cat.slug)).limit(1);
        if (existing.length > 0) {
          catMap[cat.slug] = existing[0].id;
        } else {
          const [inserted] = await db.insert(symbolCategories).values(cat).returning();
          catMap[cat.slug] = inserted.id;
        }
      }

      // --- Symbol data (inline) ---
      type SD = { char: string; nameAr: string; nameEn: string; tags: string[] };
      const numbersLetters: SD[] = [
        {char:"0️⃣",nameAr:"صفر",nameEn:"Zero",tags:["number","digit","0"]},{char:"1️⃣",nameAr:"واحد",nameEn:"One",tags:["number","digit","1"]},{char:"2️⃣",nameAr:"اثنان",nameEn:"Two",tags:["number","digit","2"]},{char:"3️⃣",nameAr:"ثلاثة",nameEn:"Three",tags:["number","digit","3"]},{char:"4️⃣",nameAr:"أربعة",nameEn:"Four",tags:["number","digit","4"]},{char:"5️⃣",nameAr:"خمسة",nameEn:"Five",tags:["number","digit","5"]},{char:"6️⃣",nameAr:"ستة",nameEn:"Six",tags:["number","digit","6"]},{char:"7️⃣",nameAr:"سبعة",nameEn:"Seven",tags:["number","digit","7"]},{char:"8️⃣",nameAr:"ثمانية",nameEn:"Eight",tags:["number","digit","8"]},{char:"9️⃣",nameAr:"تسعة",nameEn:"Nine",tags:["number","digit","9"]},{char:"🔟",nameAr:"عشرة",nameEn:"Ten",tags:["number","digit","10"]},
        {char:"➕",nameAr:"جمع",nameEn:"Plus",tags:["math","add"]},{char:"➖",nameAr:"طرح",nameEn:"Minus",tags:["math","subtract"]},{char:"✖️",nameAr:"ضرب",nameEn:"Multiply",tags:["math","times"]},{char:"➗",nameAr:"قسمة",nameEn:"Divide",tags:["math","division"]},{char:"🟰",nameAr:"يساوي",nameEn:"Equals",tags:["math","equal"]},{char:"💯",nameAr:"مئة",nameEn:"Hundred",tags:["number","score","perfect"]},{char:"#️⃣",nameAr:"هاشتاج",nameEn:"Hash",tags:["symbol","number"]},{char:"*️⃣",nameAr:"نجمة",nameEn:"Asterisk",tags:["symbol","star"]},
        {char:"🅰️",nameAr:"أ (إنجليزي)",nameEn:"A",tags:["letter","english"]},{char:"🅱️",nameAr:"ب (إنجليزي)",nameEn:"B",tags:["letter","english"]},{char:"©️",nameAr:"حقوق",nameEn:"Copyright C",tags:["letter","c"]},{char:"Ⓜ️",nameAr:"م (دائري)",nameEn:"Circle M",tags:["letter","m"]},{char:"🅾️",nameAr:"أو",nameEn:"O",tags:["letter","english"]},{char:"🅿️",nameAr:"بي",nameEn:"P",tags:["letter","english"]},{char:"ℹ️",nameAr:"معلومات",nameEn:"Info",tags:["letter","information"]},
        {char:"أ",nameAr:"ألف",nameEn:"Alef",tags:["arabic","letter"]},{char:"ب",nameAr:"باء",nameEn:"Ba",tags:["arabic","letter"]},{char:"ت",nameAr:"تاء",nameEn:"Ta",tags:["arabic","letter"]},{char:"ث",nameAr:"ثاء",nameEn:"Tha",tags:["arabic","letter"]},{char:"ج",nameAr:"جيم",nameEn:"Jim",tags:["arabic","letter"]},{char:"ح",nameAr:"حاء",nameEn:"Ha",tags:["arabic","letter"]},{char:"خ",nameAr:"خاء",nameEn:"Kha",tags:["arabic","letter"]},{char:"د",nameAr:"دال",nameEn:"Dal",tags:["arabic","letter"]},{char:"ذ",nameAr:"ذال",nameEn:"Dhal",tags:["arabic","letter"]},{char:"ر",nameAr:"راء",nameEn:"Ra",tags:["arabic","letter"]},{char:"ز",nameAr:"زاي",nameEn:"Zay",tags:["arabic","letter"]},{char:"س",nameAr:"سين",nameEn:"Sin",tags:["arabic","letter"]},{char:"ش",nameAr:"شين",nameEn:"Shin",tags:["arabic","letter"]},{char:"ص",nameAr:"صاد",nameEn:"Sad",tags:["arabic","letter"]},{char:"ض",nameAr:"ضاد",nameEn:"Dad",tags:["arabic","letter"]},{char:"ط",nameAr:"طاء",nameEn:"Tah",tags:["arabic","letter"]},{char:"ظ",nameAr:"ظاء",nameEn:"Dhah",tags:["arabic","letter"]},{char:"ع",nameAr:"عين",nameEn:"Ain",tags:["arabic","letter"]},{char:"غ",nameAr:"غين",nameEn:"Ghain",tags:["arabic","letter"]},{char:"ف",nameAr:"فاء",nameEn:"Fa",tags:["arabic","letter"]},{char:"ق",nameAr:"قاف",nameEn:"Qaf",tags:["arabic","letter"]},{char:"ك",nameAr:"كاف",nameEn:"Kaf",tags:["arabic","letter"]},{char:"ل",nameAr:"لام",nameEn:"Lam",tags:["arabic","letter"]},{char:"م",nameAr:"ميم",nameEn:"Mim",tags:["arabic","letter"]},{char:"ن",nameAr:"نون",nameEn:"Nun",tags:["arabic","letter"]},{char:"ه",nameAr:"هاء",nameEn:"Ha2",tags:["arabic","letter"]},{char:"و",nameAr:"واو",nameEn:"Waw",tags:["arabic","letter"]},{char:"ي",nameAr:"ياء",nameEn:"Ya",tags:["arabic","letter"]},
        {char:"∞",nameAr:"لانهاية",nameEn:"Infinity",tags:["math"]},{char:"≈",nameAr:"تقريبا",nameEn:"Approximately",tags:["math"]},{char:"≠",nameAr:"لا يساوي",nameEn:"Not Equal",tags:["math"]},{char:"≤",nameAr:"أقل من أو يساوي",nameEn:"Less Equal",tags:["math"]},{char:"≥",nameAr:"أكبر من أو يساوي",nameEn:"Greater Equal",tags:["math"]},{char:"π",nameAr:"باي",nameEn:"Pi",tags:["math","greek"]},{char:"√",nameAr:"جذر",nameEn:"Square Root",tags:["math"]},{char:"%",nameAr:"نسبة مئوية",nameEn:"Percent",tags:["math"]},{char:"∑",nameAr:"مجموع",nameEn:"Summation",tags:["math"]},{char:"∆",nameAr:"دلتا",nameEn:"Delta",tags:["math","triangle"]},
        {char:"①",nameAr:"أول",nameEn:"First",tags:["number","ordinal"]},{char:"②",nameAr:"ثاني",nameEn:"Second",tags:["number","ordinal"]},{char:"③",nameAr:"ثالث",nameEn:"Third",tags:["number","ordinal"]},{char:"④",nameAr:"رابع",nameEn:"Fourth",tags:["number","ordinal"]},{char:"⑤",nameAr:"خامس",nameEn:"Fifth",tags:["number","ordinal"]},{char:"⑥",nameAr:"سادس",nameEn:"Sixth",tags:["number","ordinal"]},{char:"⑦",nameAr:"سابع",nameEn:"Seventh",tags:["number","ordinal"]},{char:"⑧",nameAr:"ثامن",nameEn:"Eighth",tags:["number","ordinal"]},{char:"⑨",nameAr:"تاسع",nameEn:"Ninth",tags:["number","ordinal"]},{char:"⑩",nameAr:"عاشر",nameEn:"Tenth",tags:["number","ordinal"]},
        {char:"¼",nameAr:"ربع",nameEn:"Quarter",tags:["fraction","math"]},{char:"½",nameAr:"نصف",nameEn:"Half",tags:["fraction","math"]},{char:"¾",nameAr:"ثلاثة أرباع",nameEn:"Three Quarters",tags:["fraction","math"]},{char:"⅓",nameAr:"ثلث",nameEn:"Third Frac",tags:["fraction","math"]},{char:"⅔",nameAr:"ثلثين",nameEn:"Two Thirds",tags:["fraction","math"]},
      ];
      const emotionsFaces: SD[] = [
        {char:"😀",nameAr:"وجه سعيد",nameEn:"Grinning Face",tags:["happy","smile"]},{char:"😃",nameAr:"سعيد عيون كبيرة",nameEn:"Grinning Big Eyes",tags:["happy","smile"]},{char:"😄",nameAr:"سعيد عيون مبتسمة",nameEn:"Grinning Squinting",tags:["happy","laugh"]},{char:"😁",nameAr:"ابتسامة عريضة",nameEn:"Beaming",tags:["happy","grin"]},{char:"😆",nameAr:"ضاحك",nameEn:"Laughing",tags:["happy","laugh","fun"]},{char:"😅",nameAr:"ضحك بعرق",nameEn:"Sweat Smile",tags:["nervous","laugh"]},{char:"🤣",nameAr:"ضحك بالأرض",nameEn:"ROFL",tags:["laugh","funny"]},{char:"😂",nameAr:"دموع فرح",nameEn:"Joy Tears",tags:["laugh","cry","happy"]},{char:"🙂",nameAr:"ابتسامة خفيفة",nameEn:"Slight Smile",tags:["smile","happy"]},{char:"🙃",nameAr:"وجه مقلوب",nameEn:"Upside Down",tags:["silly","playful"]},{char:"😉",nameAr:"غمزة",nameEn:"Wink",tags:["wink"]},{char:"😊",nameAr:"خجول",nameEn:"Blush",tags:["blush","happy","shy"]},{char:"😇",nameAr:"ملاك",nameEn:"Angel",tags:["angel","innocent","good"]},{char:"🥰",nameAr:"وجه حب",nameEn:"Love Face",tags:["love","hearts"]},{char:"😍",nameAr:"عيون قلب",nameEn:"Heart Eyes",tags:["love","wow"]},{char:"🤩",nameAr:"عيون نجوم",nameEn:"Star Eyes",tags:["excited","wow","star"]},{char:"😘",nameAr:"قبلة",nameEn:"Kiss",tags:["kiss","love"]},{char:"😗",nameAr:"وجه مقبل",nameEn:"Kissing",tags:["kiss"]},{char:"😚",nameAr:"قبلة خجولة",nameEn:"Kissing Closed",tags:["kiss","shy"]},{char:"😙",nameAr:"قبلة مبتسمة",nameEn:"Kissing Smile",tags:["kiss","smile"]},{char:"🥲",nameAr:"ابتسامة بدمعة",nameEn:"Smiling Tear",tags:["sad","happy","tear"]},{char:"😋",nameAr:"لذيذ",nameEn:"Yummy",tags:["food","delicious"]},{char:"😛",nameAr:"لسان",nameEn:"Tongue",tags:["playful"]},{char:"😜",nameAr:"غمزة بلسان",nameEn:"Wink Tongue",tags:["playful","silly"]},{char:"🤪",nameAr:"مجنون",nameEn:"Zany",tags:["crazy","silly","fun"]},{char:"😝",nameAr:"لسان مغمض",nameEn:"Squinting Tongue",tags:["playful"]},{char:"🤑",nameAr:"وجه مال",nameEn:"Money Face",tags:["money","rich"]},{char:"🤗",nameAr:"حضن",nameEn:"Hugging",tags:["hug","warm"]},{char:"🤭",nameAr:"ضحكة خجولة",nameEn:"Hand Over Mouth",tags:["shy","giggle"]},{char:"🤫",nameAr:"صمت",nameEn:"Shushing",tags:["quiet","secret"]},{char:"🤔",nameAr:"تفكير",nameEn:"Thinking",tags:["think","question"]},{char:"🫡",nameAr:"تحية",nameEn:"Saluting",tags:["salute","respect"]},{char:"🤐",nameAr:"فم مغلق",nameEn:"Zipper Mouth",tags:["silent","secret"]},{char:"🤨",nameAr:"حاجب مرفوع",nameEn:"Raised Eyebrow",tags:["skeptical"]},{char:"😐",nameAr:"وجه محايد",nameEn:"Neutral",tags:["neutral","blank"]},{char:"😑",nameAr:"وجه بلا تعبير",nameEn:"Expressionless",tags:["blank","bored"]},{char:"😶",nameAr:"بدون فم",nameEn:"No Mouth",tags:["silent","speechless"]},{char:"😏",nameAr:"ابتسامة ماكرة",nameEn:"Smirk",tags:["smirk","confident"]},{char:"😒",nameAr:"غير معجب",nameEn:"Unamused",tags:["bored","annoyed"]},{char:"🙄",nameAr:"عيون متدحرجة",nameEn:"Rolling Eyes",tags:["annoyed"]},{char:"😬",nameAr:"كشرة",nameEn:"Grimace",tags:["awkward","nervous"]},{char:"🤥",nameAr:"كاذب",nameEn:"Lying",tags:["lie"]},{char:"😌",nameAr:"مرتاح",nameEn:"Relieved",tags:["calm","peaceful"]},{char:"😔",nameAr:"حزين",nameEn:"Pensive",tags:["sad","thoughtful"]},{char:"😪",nameAr:"نعسان",nameEn:"Sleepy",tags:["sleepy","tired"]},{char:"🤤",nameAr:"لعاب",nameEn:"Drooling",tags:["drool","hungry"]},{char:"😴",nameAr:"نائم",nameEn:"Sleeping",tags:["sleep","zzz"]},{char:"😷",nameAr:"كمامة",nameEn:"Medical Mask",tags:["sick","mask"]},{char:"🤒",nameAr:"مريض بحرارة",nameEn:"Thermometer",tags:["sick","fever"]},{char:"🤕",nameAr:"مصاب",nameEn:"Bandage Head",tags:["hurt","injury"]},{char:"🤢",nameAr:"غثيان",nameEn:"Nauseated",tags:["sick"]},{char:"🤮",nameAr:"يتقيأ",nameEn:"Vomiting",tags:["sick"]},{char:"🥵",nameAr:"حار",nameEn:"Hot Face",tags:["hot"]},{char:"🥶",nameAr:"بارد",nameEn:"Cold Face",tags:["cold"]},{char:"🥴",nameAr:"مترنح",nameEn:"Woozy",tags:["dizzy"]},{char:"😵",nameAr:"مصدوم",nameEn:"Dizzy Face",tags:["dizzy","shock"]},{char:"🤯",nameAr:"رأس منفجر",nameEn:"Mind Blown",tags:["shocked","wow"]},{char:"🤠",nameAr:"كاوبوي",nameEn:"Cowboy",tags:["hat","western"]},{char:"🥳",nameAr:"احتفال",nameEn:"Partying",tags:["party","celebrate"]},{char:"🥸",nameAr:"متنكر",nameEn:"Disguised",tags:["disguise"]},{char:"😎",nameAr:"نظارة شمسية",nameEn:"Sunglasses",tags:["cool","sun"]},{char:"🤓",nameAr:"نظارة ذكي",nameEn:"Nerd",tags:["nerd","smart"]},{char:"🧐",nameAr:"محقق",nameEn:"Monocle",tags:["inspect","detective"]},{char:"😕",nameAr:"محتار",nameEn:"Confused",tags:["confused"]},{char:"😟",nameAr:"قلق",nameEn:"Worried",tags:["worried"]},{char:"🙁",nameAr:"حزين قليلا",nameEn:"Slightly Frowning",tags:["sad"]},{char:"☹️",nameAr:"حزين",nameEn:"Frowning",tags:["sad","unhappy"]},{char:"😮",nameAr:"فم مفتوح",nameEn:"Open Mouth",tags:["surprised"]},{char:"😯",nameAr:"مندهش",nameEn:"Hushed",tags:["surprised"]},{char:"😲",nameAr:"مصدوم",nameEn:"Astonished",tags:["shocked"]},{char:"😳",nameAr:"محرج",nameEn:"Flushed",tags:["embarrassed"]},{char:"🥺",nameAr:"عيون متوسلة",nameEn:"Pleading Eyes",tags:["please","cute"]},{char:"🥹",nameAr:"يحبس دموع",nameEn:"Holding Tears",tags:["emotional","touched"]},{char:"😨",nameAr:"خائف",nameEn:"Fearful",tags:["scared","fear"]},{char:"😰",nameAr:"قلق بارد",nameEn:"Anxious Sweat",tags:["anxious"]},{char:"😢",nameAr:"يبكي",nameEn:"Crying",tags:["cry","sad"]},{char:"😭",nameAr:"يبكي بشدة",nameEn:"Loudly Crying",tags:["cry","sad"]},{char:"😱",nameAr:"صراخ",nameEn:"Screaming",tags:["scared","scream"]},{char:"😤",nameAr:"غاضب",nameEn:"Huffing",tags:["angry","frustrated"]},{char:"😡",nameAr:"غاضب جدا",nameEn:"Pouting",tags:["angry","mad"]},{char:"😠",nameAr:"غضبان",nameEn:"Angry",tags:["angry"]},{char:"😈",nameAr:"شيطان مبتسم",nameEn:"Smiling Devil",tags:["devil"]},{char:"👻",nameAr:"شبح",nameEn:"Ghost",tags:["ghost","spooky"]},{char:"👽",nameAr:"فضائي",nameEn:"Alien",tags:["alien","space"]},{char:"🤖",nameAr:"روبوت",nameEn:"Robot",tags:["robot","technology"]},
        {char:"👋",nameAr:"تلويح",nameEn:"Wave",tags:["hand","hello"]},{char:"✋",nameAr:"يد مرفوعة",nameEn:"Hand",tags:["hand","stop"]},{char:"👌",nameAr:"أوكي",nameEn:"OK Hand",tags:["ok","perfect"]},{char:"✌️",nameAr:"سلام",nameEn:"Peace",tags:["peace","victory"]},{char:"🤞",nameAr:"حظ",nameEn:"Crossed Fingers",tags:["luck","hope"]},{char:"👍",nameAr:"إعجاب",nameEn:"Thumbs Up",tags:["like","good"]},{char:"👎",nameAr:"عدم إعجاب",nameEn:"Thumbs Down",tags:["dislike","bad"]},{char:"👏",nameAr:"تصفيق",nameEn:"Clapping",tags:["clap","bravo"]},{char:"🙌",nameAr:"يدين مرفوعة",nameEn:"Raising Hands",tags:["celebration"]},{char:"🙏",nameAr:"دعاء",nameEn:"Folded Hands",tags:["pray","please"]},{char:"💪",nameAr:"عضلة",nameEn:"Flexed Bicep",tags:["strong","muscle"]},
        {char:"❤️",nameAr:"قلب أحمر",nameEn:"Red Heart",tags:["love","heart","red"]},{char:"🧡",nameAr:"قلب برتقالي",nameEn:"Orange Heart",tags:["love","heart"]},{char:"💛",nameAr:"قلب أصفر",nameEn:"Yellow Heart",tags:["love","heart"]},{char:"💚",nameAr:"قلب أخضر",nameEn:"Green Heart",tags:["love","heart"]},{char:"💙",nameAr:"قلب أزرق",nameEn:"Blue Heart",tags:["love","heart"]},{char:"💜",nameAr:"قلب بنفسجي",nameEn:"Purple Heart",tags:["love","heart"]},{char:"🖤",nameAr:"قلب أسود",nameEn:"Black Heart",tags:["love","heart"]},{char:"🤍",nameAr:"قلب أبيض",nameEn:"White Heart",tags:["love","heart"]},{char:"💖",nameAr:"قلب لامع",nameEn:"Sparkling Heart",tags:["love","sparkle"]},{char:"💝",nameAr:"قلب شريط",nameEn:"Heart Ribbon",tags:["love","gift"]},{char:"💗",nameAr:"قلب ينمو",nameEn:"Growing Heart",tags:["love"]},{char:"💓",nameAr:"قلب ينبض",nameEn:"Beating Heart",tags:["love"]},{char:"💕",nameAr:"قلبين",nameEn:"Two Hearts",tags:["love"]},
      ];
      const animals: SD[] = [
        {char:"🐶",nameAr:"كلب",nameEn:"Dog Face",tags:["dog","pet"]},{char:"🐱",nameAr:"قطة",nameEn:"Cat Face",tags:["cat","pet"]},{char:"🐭",nameAr:"فأر",nameEn:"Mouse",tags:["mouse"]},{char:"🐹",nameAr:"هامستر",nameEn:"Hamster",tags:["hamster","pet"]},{char:"🐰",nameAr:"أرنب",nameEn:"Rabbit",tags:["rabbit","bunny"]},{char:"🦊",nameAr:"ثعلب",nameEn:"Fox",tags:["fox","clever"]},{char:"🐻",nameAr:"دب",nameEn:"Bear",tags:["bear","teddy"]},{char:"🐼",nameAr:"باندا",nameEn:"Panda",tags:["panda"]},{char:"🐻‍❄️",nameAr:"دب قطبي",nameEn:"Polar Bear",tags:["bear","arctic"]},{char:"🐨",nameAr:"كوالا",nameEn:"Koala",tags:["koala"]},{char:"🐯",nameAr:"نمر",nameEn:"Tiger",tags:["tiger","wild"]},{char:"🦁",nameAr:"أسد",nameEn:"Lion",tags:["lion","king"]},{char:"🐮",nameAr:"بقرة",nameEn:"Cow",tags:["cow","farm"]},{char:"🐷",nameAr:"خنزير",nameEn:"Pig",tags:["pig","farm"]},{char:"🐸",nameAr:"ضفدع",nameEn:"Frog",tags:["frog","green"]},{char:"🐵",nameAr:"قرد",nameEn:"Monkey",tags:["monkey"]},{char:"🙈",nameAr:"قرد لا يرى",nameEn:"See No Evil",tags:["monkey","hide"]},{char:"🙉",nameAr:"قرد لا يسمع",nameEn:"Hear No Evil",tags:["monkey"]},{char:"🙊",nameAr:"قرد لا يتكلم",nameEn:"Speak No Evil",tags:["monkey"]},{char:"🐔",nameAr:"دجاجة",nameEn:"Chicken",tags:["chicken","farm"]},{char:"🐧",nameAr:"بطريق",nameEn:"Penguin",tags:["penguin","ice"]},{char:"🐦",nameAr:"طائر",nameEn:"Bird",tags:["bird","fly"]},{char:"🐤",nameAr:"كتكوت",nameEn:"Chick",tags:["chick","baby"]},{char:"🐣",nameAr:"كتكوت يفقس",nameEn:"Hatching Chick",tags:["chick","egg"]},{char:"🦆",nameAr:"بطة",nameEn:"Duck",tags:["duck","bird"]},{char:"🦅",nameAr:"نسر",nameEn:"Eagle",tags:["eagle","bird"]},{char:"🦉",nameAr:"بومة",nameEn:"Owl",tags:["owl","night","wise"]},{char:"🦇",nameAr:"خفاش",nameEn:"Bat",tags:["bat","night"]},{char:"🐺",nameAr:"ذئب",nameEn:"Wolf",tags:["wolf","wild"]},{char:"🐴",nameAr:"حصان",nameEn:"Horse",tags:["horse","ride"]},{char:"🦄",nameAr:"يونيكورن",nameEn:"Unicorn",tags:["unicorn","magic"]},{char:"🐝",nameAr:"نحلة",nameEn:"Bee",tags:["bee","honey"]},{char:"🐛",nameAr:"حشرة",nameEn:"Bug",tags:["bug","insect"]},{char:"🦋",nameAr:"فراشة",nameEn:"Butterfly",tags:["butterfly","insect"]},{char:"🐌",nameAr:"حلزون",nameEn:"Snail",tags:["snail","slow"]},{char:"🐞",nameAr:"دعسوقة",nameEn:"Ladybug",tags:["ladybug","insect"]},{char:"🐜",nameAr:"نملة",nameEn:"Ant",tags:["ant","insect"]},{char:"🐢",nameAr:"سلحفاة",nameEn:"Turtle",tags:["turtle","slow"]},{char:"🐍",nameAr:"ثعبان",nameEn:"Snake",tags:["snake"]},{char:"🦈",nameAr:"قرش",nameEn:"Shark",tags:["shark","ocean"]},{char:"🐳",nameAr:"حوت",nameEn:"Whale",tags:["whale","ocean"]},{char:"🐬",nameAr:"دولفين",nameEn:"Dolphin",tags:["dolphin","ocean"]},{char:"🐟",nameAr:"سمكة",nameEn:"Fish",tags:["fish","ocean"]},{char:"🐠",nameAr:"سمكة استوائية",nameEn:"Tropical Fish",tags:["fish","colorful"]},{char:"🦐",nameAr:"جمبري",nameEn:"Shrimp",tags:["shrimp","seafood"]},{char:"🦀",nameAr:"سلطعون",nameEn:"Crab",tags:["crab","seafood"]},{char:"🐙",nameAr:"أخطبوط",nameEn:"Octopus",tags:["octopus","ocean"]},{char:"🦩",nameAr:"فلامنغو",nameEn:"Flamingo",tags:["flamingo","pink"]},{char:"🦚",nameAr:"طاووس",nameEn:"Peacock",tags:["peacock","beautiful"]},{char:"🦜",nameAr:"ببغاء",nameEn:"Parrot",tags:["parrot","colorful"]},{char:"🦢",nameAr:"بجعة",nameEn:"Swan",tags:["swan","elegant"]},{char:"🐘",nameAr:"فيل",nameEn:"Elephant",tags:["elephant","big"]},{char:"🦏",nameAr:"وحيد القرن",nameEn:"Rhinoceros",tags:["rhino"]},{char:"🐪",nameAr:"جمل",nameEn:"Camel",tags:["camel","desert"]},{char:"🦒",nameAr:"زرافة",nameEn:"Giraffe",tags:["giraffe","tall"]},{char:"🦘",nameAr:"كنغر",nameEn:"Kangaroo",tags:["kangaroo","jump"]},{char:"🦍",nameAr:"غوريلا",nameEn:"Gorilla",tags:["gorilla","strong"]},{char:"🐾",nameAr:"بصمة حيوان",nameEn:"Paw Prints",tags:["paw","animal"]},{char:"🦔",nameAr:"قنفذ",nameEn:"Hedgehog",tags:["hedgehog","cute"]},{char:"🦦",nameAr:"قضاعة",nameEn:"Otter",tags:["otter","cute"]},{char:"🐑",nameAr:"خروف",nameEn:"Sheep",tags:["sheep","wool"]},{char:"🐐",nameAr:"ماعز",nameEn:"Goat",tags:["goat","farm"]},
      ];
      const natureElements: SD[] = [
        {char:"☀️",nameAr:"شمس",nameEn:"Sun",tags:["sun","bright","day"]},{char:"🌤️",nameAr:"شمس سحاب",nameEn:"Sun Cloud",tags:["sun","cloud"]},{char:"⛅",nameAr:"غيوم وشمس",nameEn:"Partly Cloudy",tags:["cloud","sun"]},{char:"☁️",nameAr:"سحابة",nameEn:"Cloud",tags:["cloud","weather"]},{char:"🌧️",nameAr:"مطر",nameEn:"Rain Cloud",tags:["rain","weather"]},{char:"⛈️",nameAr:"عاصفة رعدية",nameEn:"Thunder Storm",tags:["storm","lightning"]},{char:"🌩️",nameAr:"برق",nameEn:"Lightning",tags:["lightning","storm"]},{char:"🌨️",nameAr:"ثلج",nameEn:"Snow Cloud",tags:["snow","winter"]},{char:"❄️",nameAr:"رقاقة ثلج",nameEn:"Snowflake",tags:["snow","ice","winter"]},{char:"⛄",nameAr:"رجل ثلج",nameEn:"Snowman",tags:["snow","winter"]},{char:"🌪️",nameAr:"إعصار",nameEn:"Tornado",tags:["tornado","storm"]},{char:"🌊",nameAr:"موجة",nameEn:"Wave",tags:["wave","ocean","sea"]},{char:"💧",nameAr:"قطرة ماء",nameEn:"Droplet",tags:["water","drop"]},{char:"🌈",nameAr:"قوس قزح",nameEn:"Rainbow",tags:["rainbow","colors"]},{char:"🌙",nameAr:"هلال",nameEn:"Crescent Moon",tags:["moon","night"]},{char:"🌕",nameAr:"بدر",nameEn:"Full Moon",tags:["moon","full"]},{char:"⭐",nameAr:"نجمة",nameEn:"Star",tags:["star","shine"]},{char:"🌟",nameAr:"نجمة متوهجة",nameEn:"Glowing Star",tags:["star","glow"]},{char:"✨",nameAr:"بريق",nameEn:"Sparkles",tags:["sparkle","magic"]},{char:"💫",nameAr:"نجمة دوارة",nameEn:"Dizzy Star",tags:["star","dizzy"]},{char:"🔥",nameAr:"نار",nameEn:"Fire",tags:["fire","hot","flame"]},{char:"🌋",nameAr:"بركان",nameEn:"Volcano",tags:["volcano","lava"]},{char:"🌍",nameAr:"الأرض",nameEn:"Earth",tags:["earth","globe","world"]},{char:"🪐",nameAr:"كوكب",nameEn:"Planet",tags:["planet","saturn","space"]},
        {char:"🌱",nameAr:"شتلة",nameEn:"Seedling",tags:["plant","grow"]},{char:"🪴",nameAr:"نبتة",nameEn:"Potted Plant",tags:["plant","pot"]},{char:"🌲",nameAr:"شجرة صنوبر",nameEn:"Evergreen",tags:["tree","pine"]},{char:"🌳",nameAr:"شجرة",nameEn:"Tree",tags:["tree","green"]},{char:"🌴",nameAr:"نخلة",nameEn:"Palm Tree",tags:["palm","tropical"]},{char:"🌵",nameAr:"صبار",nameEn:"Cactus",tags:["cactus","desert"]},{char:"🍀",nameAr:"برسيم رباعي",nameEn:"Four Leaf Clover",tags:["clover","luck"]},{char:"🍃",nameAr:"ورقة شجر",nameEn:"Leaf",tags:["leaf","green"]},{char:"🍂",nameAr:"أوراق خريف",nameEn:"Fallen Leaf",tags:["leaf","autumn"]},{char:"🍁",nameAr:"ورقة قيقب",nameEn:"Maple Leaf",tags:["maple","leaf"]},{char:"🌾",nameAr:"قمح",nameEn:"Rice Ear",tags:["wheat","grain"]},{char:"🌿",nameAr:"عشب",nameEn:"Herb",tags:["herb","green"]},
        {char:"🌸",nameAr:"زهرة كرز",nameEn:"Cherry Blossom",tags:["flower","cherry","pink"]},{char:"🌹",nameAr:"وردة حمراء",nameEn:"Rose",tags:["rose","flower","love"]},{char:"🌺",nameAr:"كركديه",nameEn:"Hibiscus",tags:["flower","tropical"]},{char:"🌻",nameAr:"دوار الشمس",nameEn:"Sunflower",tags:["flower","sun"]},{char:"🌼",nameAr:"زهرة",nameEn:"Blossom",tags:["flower","bloom"]},{char:"🌷",nameAr:"توليب",nameEn:"Tulip",tags:["flower","tulip"]},{char:"🪻",nameAr:"لافندر",nameEn:"Lavender",tags:["flower","purple"]},
        {char:"🍎",nameAr:"تفاحة حمراء",nameEn:"Red Apple",tags:["apple","fruit"]},{char:"🍏",nameAr:"تفاحة خضراء",nameEn:"Green Apple",tags:["apple","fruit"]},{char:"🍐",nameAr:"كمثرى",nameEn:"Pear",tags:["pear","fruit"]},{char:"🍊",nameAr:"برتقالة",nameEn:"Orange",tags:["orange","fruit"]},{char:"🍋",nameAr:"ليمون",nameEn:"Lemon",tags:["lemon","fruit"]},{char:"🍌",nameAr:"موزة",nameEn:"Banana",tags:["banana","fruit"]},{char:"🍉",nameAr:"بطيخ",nameEn:"Watermelon",tags:["watermelon","fruit"]},{char:"🍇",nameAr:"عنب",nameEn:"Grapes",tags:["grapes","fruit"]},{char:"🍓",nameAr:"فراولة",nameEn:"Strawberry",tags:["strawberry","fruit"]},{char:"🫐",nameAr:"توت أزرق",nameEn:"Blueberries",tags:["blueberry","fruit"]},{char:"🍒",nameAr:"كرز",nameEn:"Cherries",tags:["cherry","fruit"]},{char:"🍑",nameAr:"خوخ",nameEn:"Peach",tags:["peach","fruit"]},{char:"🥭",nameAr:"مانجو",nameEn:"Mango",tags:["mango","fruit"]},{char:"🍍",nameAr:"أناناس",nameEn:"Pineapple",tags:["pineapple","fruit"]},{char:"🥥",nameAr:"جوز هند",nameEn:"Coconut",tags:["coconut","tropical"]},{char:"🥝",nameAr:"كيوي",nameEn:"Kiwi",tags:["kiwi","fruit"]},
      ];
      const shapesColors: SD[] = [
        {char:"🔴",nameAr:"دائرة حمراء",nameEn:"Red Circle",tags:["circle","red","shape"]},{char:"🟠",nameAr:"دائرة برتقالية",nameEn:"Orange Circle",tags:["circle","orange"]},{char:"🟡",nameAr:"دائرة صفراء",nameEn:"Yellow Circle",tags:["circle","yellow"]},{char:"🟢",nameAr:"دائرة خضراء",nameEn:"Green Circle",tags:["circle","green"]},{char:"🔵",nameAr:"دائرة زرقاء",nameEn:"Blue Circle",tags:["circle","blue"]},{char:"🟣",nameAr:"دائرة بنفسجية",nameEn:"Purple Circle",tags:["circle","purple"]},{char:"🟤",nameAr:"دائرة بنية",nameEn:"Brown Circle",tags:["circle","brown"]},{char:"⚫",nameAr:"دائرة سوداء",nameEn:"Black Circle",tags:["circle","black"]},{char:"⚪",nameAr:"دائرة بيضاء",nameEn:"White Circle",tags:["circle","white"]},
        {char:"🔺",nameAr:"مثلث أحمر",nameEn:"Red Triangle Up",tags:["triangle","red"]},{char:"🔻",nameAr:"مثلث أحمر لأسفل",nameEn:"Red Triangle Down",tags:["triangle","red"]},{char:"🔶",nameAr:"معين برتقالي كبير",nameEn:"Large Orange Diamond",tags:["diamond","orange"]},{char:"🔷",nameAr:"معين أزرق كبير",nameEn:"Large Blue Diamond",tags:["diamond","blue"]},{char:"🔸",nameAr:"معين برتقالي صغير",nameEn:"Small Orange Diamond",tags:["diamond","orange"]},{char:"🔹",nameAr:"معين أزرق صغير",nameEn:"Small Blue Diamond",tags:["diamond","blue"]},
        {char:"🟥",nameAr:"مربع أحمر",nameEn:"Red Square",tags:["square","red"]},{char:"🟧",nameAr:"مربع برتقالي",nameEn:"Orange Square",tags:["square","orange"]},{char:"🟨",nameAr:"مربع أصفر",nameEn:"Yellow Square",tags:["square","yellow"]},{char:"🟩",nameAr:"مربع أخضر",nameEn:"Green Square",tags:["square","green"]},{char:"🟦",nameAr:"مربع أزرق",nameEn:"Blue Square",tags:["square","blue"]},{char:"🟪",nameAr:"مربع بنفسجي",nameEn:"Purple Square",tags:["square","purple"]},{char:"🟫",nameAr:"مربع بني",nameEn:"Brown Square",tags:["square","brown"]},{char:"⬛",nameAr:"مربع أسود",nameEn:"Black Square",tags:["square","black"]},{char:"⬜",nameAr:"مربع أبيض",nameEn:"White Square",tags:["square","white"]},
        {char:"⭕",nameAr:"دائرة فارغة",nameEn:"Hollow Circle",tags:["circle","hollow"]},{char:"💠",nameAr:"معين بنقطة",nameEn:"Diamond Dot",tags:["diamond","shape"]},{char:"♦️",nameAr:"ماسة",nameEn:"Diamond Suit",tags:["diamond","card"]},{char:"♠️",nameAr:"بستوني",nameEn:"Spade Suit",tags:["spade","card"]},{char:"♣️",nameAr:"سباتي",nameEn:"Club Suit",tags:["club","card"]},{char:"♥️",nameAr:"قلب",nameEn:"Heart Suit",tags:["heart","card"]},
        {char:"⬆️",nameAr:"سهم أعلى",nameEn:"Up Arrow",tags:["arrow","up"]},{char:"⬇️",nameAr:"سهم أسفل",nameEn:"Down Arrow",tags:["arrow","down"]},{char:"➡️",nameAr:"سهم يمين",nameEn:"Right Arrow",tags:["arrow","right"]},{char:"⬅️",nameAr:"سهم يسار",nameEn:"Left Arrow",tags:["arrow","left"]},{char:"🔄",nameAr:"أسهم دائرية",nameEn:"Cycle Arrows",tags:["arrow","refresh"]},{char:"⚡",nameAr:"برق",nameEn:"Zap",tags:["lightning","power"]},{char:"💎",nameAr:"ألماس",nameEn:"Gem",tags:["diamond","gem"]},{char:"🫧",nameAr:"فقاعات",nameEn:"Bubbles",tags:["bubbles","soap"]},
      ];
      const educationalTools: SD[] = [
        {char:"📚",nameAr:"كتب",nameEn:"Books",tags:["book","study","library"]},{char:"📖",nameAr:"كتاب مفتوح",nameEn:"Open Book",tags:["book","read"]},{char:"📕",nameAr:"كتاب أحمر",nameEn:"Red Book",tags:["book","red"]},{char:"📗",nameAr:"كتاب أخضر",nameEn:"Green Book",tags:["book","green"]},{char:"📘",nameAr:"كتاب أزرق",nameEn:"Blue Book",tags:["book","blue"]},{char:"📙",nameAr:"كتاب برتقالي",nameEn:"Orange Book",tags:["book","orange"]},{char:"📓",nameAr:"دفتر",nameEn:"Notebook",tags:["notebook","write"]},{char:"📒",nameAr:"دفتر أصفر",nameEn:"Ledger",tags:["notebook","yellow"]},{char:"📄",nameAr:"صفحة",nameEn:"Page",tags:["paper","document"]},{char:"📝",nameAr:"مذكرة",nameEn:"Memo",tags:["note","write","pencil"]},{char:"✏️",nameAr:"قلم رصاص",nameEn:"Pencil",tags:["pencil","write","draw"]},{char:"🖊️",nameAr:"قلم حبر",nameEn:"Pen",tags:["pen","write"]},{char:"🖌️",nameAr:"فرشاة رسم",nameEn:"Paintbrush",tags:["brush","paint","art"]},{char:"🖍️",nameAr:"تلوين",nameEn:"Crayon",tags:["crayon","color","art"]},{char:"🔍",nameAr:"عدسة مكبرة",nameEn:"Magnifying Glass",tags:["search","look"]},{char:"📐",nameAr:"مثلث هندسي",nameEn:"Triangle Ruler",tags:["ruler","geometry","math"]},{char:"📏",nameAr:"مسطرة",nameEn:"Straight Ruler",tags:["ruler","measure"]},{char:"🧮",nameAr:"معداد",nameEn:"Abacus",tags:["abacus","math","count"]},{char:"📁",nameAr:"مجلد",nameEn:"File Folder",tags:["folder","organize"]},{char:"📊",nameAr:"رسم بياني",nameEn:"Bar Chart",tags:["chart","graph","data"]},{char:"📈",nameAr:"رسم صاعد",nameEn:"Chart Up",tags:["chart","up","growth"]},{char:"📉",nameAr:"رسم هابط",nameEn:"Chart Down",tags:["chart","down"]},{char:"🧪",nameAr:"أنبوب اختبار",nameEn:"Test Tube",tags:["science","chemistry","lab"]},{char:"🔬",nameAr:"مجهر",nameEn:"Microscope",tags:["science","biology"]},{char:"🔭",nameAr:"تلسكوب",nameEn:"Telescope",tags:["science","astronomy"]},{char:"🧬",nameAr:"حمض نووي",nameEn:"DNA",tags:["science","biology"]},{char:"🧲",nameAr:"مغناطيس",nameEn:"Magnet",tags:["magnet","physics"]},{char:"💻",nameAr:"لابتوب",nameEn:"Laptop",tags:["computer","laptop"]},{char:"🖥️",nameAr:"كمبيوتر",nameEn:"Desktop",tags:["computer","monitor"]},{char:"📱",nameAr:"هاتف",nameEn:"Mobile Phone",tags:["phone","mobile"]},{char:"🎒",nameAr:"حقيبة مدرسة",nameEn:"Backpack",tags:["backpack","school"]},{char:"🏫",nameAr:"مدرسة",nameEn:"School",tags:["school","building"]},{char:"🎓",nameAr:"قبعة تخرج",nameEn:"Graduation Cap",tags:["graduate","education"]},{char:"🧑‍🏫",nameAr:"معلم",nameEn:"Teacher",tags:["teacher","education"]},{char:"🗺️",nameAr:"خريطة العالم",nameEn:"World Map",tags:["map","geography"]},{char:"🧭",nameAr:"بوصلة",nameEn:"Compass",tags:["compass","direction"]},{char:"⏰",nameAr:"ساعة منبه",nameEn:"Alarm Clock",tags:["clock","time"]},{char:"⏱️",nameAr:"ساعة إيقاف",nameEn:"Stopwatch",tags:["timer","time"]},{char:"⌛",nameAr:"ساعة رملية",nameEn:"Hourglass",tags:["time","sand"]},{char:"🔔",nameAr:"جرس",nameEn:"Bell",tags:["bell","notification"]},{char:"📌",nameAr:"دبوس",nameEn:"Pushpin",tags:["pin","important"]},{char:"📎",nameAr:"مشبك ورق",nameEn:"Paperclip",tags:["clip","paper"]},{char:"✂️",nameAr:"مقص",nameEn:"Scissors",tags:["scissors","cut"]},{char:"🪄",nameAr:"عصا سحرية",nameEn:"Magic Wand",tags:["magic","wand"]},{char:"🎨",nameAr:"لوحة ألوان",nameEn:"Artist Palette",tags:["art","paint","color"]},{char:"🧠",nameAr:"دماغ",nameEn:"Brain",tags:["brain","think","smart"]},{char:"💡",nameAr:"لمبة",nameEn:"Light Bulb",tags:["idea","light"]},{char:"🔑",nameAr:"مفتاح",nameEn:"Key",tags:["key","unlock"]},{char:"📋",nameAr:"قائمة",nameEn:"Clipboard",tags:["list","checklist"]},{char:"✅",nameAr:"تم",nameEn:"Check Mark",tags:["check","done","correct"]},{char:"❌",nameAr:"خطأ",nameEn:"Cross Mark",tags:["wrong","error"]},{char:"❓",nameAr:"سؤال",nameEn:"Question Mark",tags:["question","ask"]},{char:"❗",nameAr:"تعجب",nameEn:"Exclamation",tags:["important","alert"]},{char:"💬",nameAr:"فقاعة حوار",nameEn:"Speech Bubble",tags:["chat","talk"]},{char:"💭",nameAr:"فقاعة تفكير",nameEn:"Thought Bubble",tags:["think","thought"]},
      ];
      const activitiesHobbies: SD[] = [
        {char:"⚽",nameAr:"كرة قدم",nameEn:"Soccer Ball",tags:["soccer","football","sport"]},{char:"🏀",nameAr:"كرة سلة",nameEn:"Basketball",tags:["basketball","sport"]},{char:"🏈",nameAr:"كرة قدم أمريكية",nameEn:"Football",tags:["football","sport"]},{char:"⚾",nameAr:"بيسبول",nameEn:"Baseball",tags:["baseball","sport"]},{char:"🎾",nameAr:"تنس",nameEn:"Tennis",tags:["tennis","sport"]},{char:"🏐",nameAr:"كرة طائرة",nameEn:"Volleyball",tags:["volleyball","sport"]},{char:"🎱",nameAr:"بلياردو",nameEn:"Pool Ball",tags:["billiards","pool"]},{char:"🏓",nameAr:"بنغ بونغ",nameEn:"Ping Pong",tags:["table tennis"]},{char:"🏸",nameAr:"ريشة",nameEn:"Badminton",tags:["badminton","sport"]},{char:"🥊",nameAr:"ملاكمة",nameEn:"Boxing Glove",tags:["boxing","sport"]},{char:"🥋",nameAr:"كاراتيه",nameEn:"Martial Arts",tags:["martial arts","karate"]},{char:"⛳",nameAr:"غولف",nameEn:"Golf",tags:["golf","sport"]},{char:"⛸️",nameAr:"تزلج",nameEn:"Ice Skating",tags:["skating","ice"]},{char:"🎿",nameAr:"تزلج ثلج",nameEn:"Skiing",tags:["ski","snow"]},{char:"🛹",nameAr:"سكيتبورد",nameEn:"Skateboard",tags:["skateboard"]},{char:"🚴",nameAr:"دراجة",nameEn:"Cycling",tags:["bicycle","bike"]},{char:"🏊",nameAr:"سباحة",nameEn:"Swimming",tags:["swim","water"]},{char:"🤸",nameAr:"جمباز",nameEn:"Gymnastics",tags:["gymnastics","flip"]},{char:"🏋️",nameAr:"رفع أثقال",nameEn:"Weight Lifting",tags:["gym","weight"]},{char:"🏇",nameAr:"سباق خيل",nameEn:"Horse Racing",tags:["horse","race"]},
        {char:"🎮",nameAr:"ألعاب فيديو",nameEn:"Video Game",tags:["game","controller","play"]},{char:"🕹️",nameAr:"عصا تحكم",nameEn:"Joystick",tags:["game","arcade"]},{char:"🎲",nameAr:"نرد",nameEn:"Dice",tags:["dice","game","roll"]},{char:"🧩",nameAr:"أحجية",nameEn:"Puzzle Piece",tags:["puzzle","game"]},{char:"♟️",nameAr:"شطرنج",nameEn:"Chess Pawn",tags:["chess","game"]},{char:"🎯",nameAr:"هدف",nameEn:"Bullseye",tags:["target","goal"]},{char:"🎪",nameAr:"سيرك",nameEn:"Circus Tent",tags:["circus","fun"]},{char:"🎭",nameAr:"مسرح",nameEn:"Theater",tags:["theater","drama"]},{char:"🎬",nameAr:"سينما",nameEn:"Clapper Board",tags:["movie","film"]},{char:"🎤",nameAr:"ميكروفون",nameEn:"Microphone",tags:["mic","sing"]},{char:"🎧",nameAr:"سماعات",nameEn:"Headphone",tags:["music","listen"]},{char:"🎼",nameAr:"نوتة موسيقية",nameEn:"Musical Score",tags:["music","notes"]},{char:"🎵",nameAr:"نغمة",nameEn:"Musical Note",tags:["music","note"]},{char:"🎶",nameAr:"نغمات",nameEn:"Musical Notes",tags:["music","melody"]},{char:"🥁",nameAr:"طبل",nameEn:"Drum",tags:["drum","music"]},{char:"🎹",nameAr:"بيانو",nameEn:"Piano",tags:["piano","music"]},{char:"🎸",nameAr:"غيتار",nameEn:"Guitar",tags:["guitar","music"]},{char:"🎺",nameAr:"بوق",nameEn:"Trumpet",tags:["trumpet","music"]},{char:"🎻",nameAr:"كمان",nameEn:"Violin",tags:["violin","music"]},{char:"📷",nameAr:"كاميرا",nameEn:"Camera",tags:["camera","photo"]},{char:"📹",nameAr:"كاميرا فيديو",nameEn:"Video Camera",tags:["video","record"]},{char:"🧵",nameAr:"خيط",nameEn:"Thread",tags:["sew","craft"]},{char:"🎣",nameAr:"صيد سمك",nameEn:"Fishing",tags:["fish","hobby"]},{char:"🧗",nameAr:"تسلق",nameEn:"Climbing",tags:["climb","adventure"]},{char:"🏕️",nameAr:"تخييم",nameEn:"Camping",tags:["camp","outdoor"]},{char:"🎠",nameAr:"حصان دوار",nameEn:"Carousel",tags:["carousel","fun"]},{char:"🎡",nameAr:"عجلة دوارة",nameEn:"Ferris Wheel",tags:["ferris wheel","fun"]},{char:"🎢",nameAr:"أفعوانية",nameEn:"Roller Coaster",tags:["rollercoaster","fun"]},{char:"🏖️",nameAr:"شاطئ",nameEn:"Beach",tags:["beach","summer"]},
      ];
      const rewardsAchievements: SD[] = [
        {char:"🏆",nameAr:"كأس",nameEn:"Trophy",tags:["trophy","winner","champion"]},{char:"🥇",nameAr:"ميدالية ذهبية",nameEn:"Gold Medal",tags:["medal","gold","first"]},{char:"🥈",nameAr:"ميدالية فضية",nameEn:"Silver Medal",tags:["medal","silver"]},{char:"🥉",nameAr:"ميدالية برونزية",nameEn:"Bronze Medal",tags:["medal","bronze"]},{char:"🏅",nameAr:"ميدالية رياضية",nameEn:"Sports Medal",tags:["medal","sport"]},{char:"🎖️",nameAr:"وسام عسكري",nameEn:"Military Medal",tags:["medal","honor"]},{char:"📜",nameAr:"شهادة",nameEn:"Scroll",tags:["certificate","diploma"]},{char:"🎓",nameAr:"تخرج",nameEn:"Graduation",tags:["graduate","success"]},{char:"👑",nameAr:"تاج",nameEn:"Crown",tags:["crown","king","queen"]},{char:"💎",nameAr:"ألماسة",nameEn:"Gem Stone",tags:["gem","diamond"]},{char:"⭐",nameAr:"نجمة ذهبية",nameEn:"Star",tags:["star","rating"]},{char:"🌟",nameAr:"نجمة متوهجة",nameEn:"Glowing Star",tags:["star","shine"]},{char:"✨",nameAr:"بريق",nameEn:"Sparkles",tags:["sparkle","magic"]},{char:"🎉",nameAr:"احتفال",nameEn:"Party Popper",tags:["party","celebrate"]},{char:"🎊",nameAr:"كونفيتي",nameEn:"Confetti Ball",tags:["confetti","celebrate"]},{char:"🎈",nameAr:"بالون",nameEn:"Balloon",tags:["balloon","party"]},{char:"🎁",nameAr:"هدية",nameEn:"Gift",tags:["gift","present"]},{char:"🎀",nameAr:"شريط هدية",nameEn:"Ribbon",tags:["ribbon","gift"]},{char:"🏁",nameAr:"علم نهاية",nameEn:"Checkered Flag",tags:["finish","race"]},{char:"🚀",nameAr:"صاروخ",nameEn:"Rocket",tags:["rocket","fast","success"]},{char:"💥",nameAr:"انفجار",nameEn:"Boom",tags:["explosion","wow"]},{char:"🔥",nameAr:"نار",nameEn:"Fire",tags:["fire","hot","streak"]},{char:"⚡",nameAr:"برق",nameEn:"Lightning",tags:["lightning","power"]},{char:"💪",nameAr:"قوة",nameEn:"Strong",tags:["strong","muscle"]},{char:"🙌",nameAr:"يدين مرفوعة",nameEn:"Raised Hands",tags:["celebration"]},{char:"👏",nameAr:"تصفيق",nameEn:"Clapping",tags:["clap","bravo"]},{char:"🤝",nameAr:"مصافحة",nameEn:"Handshake",tags:["handshake","teamwork"]},{char:"🎂",nameAr:"كعكة عيد",nameEn:"Birthday Cake",tags:["cake","birthday"]},{char:"🍰",nameAr:"قطعة كيك",nameEn:"Cake Slice",tags:["cake","dessert"]},{char:"🍭",nameAr:"مصاصة",nameEn:"Lollipop",tags:["candy","sweet"]},{char:"🍬",nameAr:"حلوى",nameEn:"Candy",tags:["candy","sweet"]},{char:"🍫",nameAr:"شوكولاتة",nameEn:"Chocolate",tags:["chocolate","sweet"]},{char:"🧁",nameAr:"كب كيك",nameEn:"Cupcake",tags:["cupcake","sweet"]},{char:"🦸",nameAr:"بطل خارق",nameEn:"Superhero",tags:["hero","super"]},{char:"💰",nameAr:"كيس مال",nameEn:"Money Bag",tags:["money","reward"]},{char:"🪙",nameAr:"عملة",nameEn:"Coin",tags:["coin","money"]},{char:"🌈",nameAr:"قوس قزح",nameEn:"Rainbow",tags:["rainbow","hope"]},{char:"📈",nameAr:"نمو",nameEn:"Growth",tags:["progress","up"]},{char:"🎯",nameAr:"هدف محقق",nameEn:"Target Hit",tags:["goal","target"]},{char:"✅",nameAr:"مكتمل",nameEn:"Complete",tags:["done","check"]},{char:"💯",nameAr:"درجة كاملة",nameEn:"Perfect Score",tags:["perfect","100"]},
      ];
      const projectSpecific: SD[] = [
        {char:"📝",nameAr:"مهمة",nameEn:"Task",tags:["task","homework"]},{char:"✏️",nameAr:"إجابة",nameEn:"Answer",tags:["answer","write"]},{char:"❓",nameAr:"سؤال",nameEn:"Question",tags:["question","quiz"]},{char:"💡",nameAr:"فكرة",nameEn:"Idea",tags:["idea","hint"]},{char:"⏱️",nameAr:"وقت",nameEn:"Timer",tags:["time","countdown"]},{char:"📊",nameAr:"تقرير",nameEn:"Report",tags:["report","grade"]},{char:"🎯",nameAr:"هدف يومي",nameEn:"Daily Goal",tags:["goal","daily"]},{char:"🏅",nameAr:"وسام",nameEn:"Badge",tags:["badge","achievement"]},{char:"⭐",nameAr:"نجمة تقييم",nameEn:"Rating Star",tags:["rating","star"]},{char:"🔔",nameAr:"تنبيه",nameEn:"Notification",tags:["notification","alert"]},{char:"📚",nameAr:"مكتبة المهام",nameEn:"Task Library",tags:["library","tasks"]},{char:"👨‍👩‍👧‍👦",nameAr:"عائلة",nameEn:"Family",tags:["family","parent"]},{char:"👦",nameAr:"ولد",nameEn:"Boy",tags:["boy","child"]},{char:"👧",nameAr:"بنت",nameEn:"Girl",tags:["girl","child"]},{char:"👨",nameAr:"أب",nameEn:"Father",tags:["father","dad"]},{char:"👩",nameAr:"أم",nameEn:"Mother",tags:["mother","mom"]},{char:"🧑‍🏫",nameAr:"معلم",nameEn:"Teacher",tags:["teacher","educator"]},{char:"🏫",nameAr:"مدرسة",nameEn:"School",tags:["school","building"]},{char:"📖",nameAr:"درس",nameEn:"Lesson",tags:["lesson","study"]},{char:"🧪",nameAr:"اختبار",nameEn:"Test",tags:["test","exam"]},{char:"📋",nameAr:"قائمة مهام",nameEn:"Task List",tags:["list","tasks"]},{char:"🗓️",nameAr:"جدول",nameEn:"Calendar",tags:["calendar","schedule"]},{char:"🔁",nameAr:"تكرار",nameEn:"Repeat",tags:["repeat","loop"]},{char:"📤",nameAr:"إرسال",nameEn:"Send",tags:["send","upload"]},{char:"📥",nameAr:"استلام",nameEn:"Receive",tags:["receive","download"]},{char:"🔒",nameAr:"مقفل",nameEn:"Locked",tags:["lock","secure"]},{char:"🔓",nameAr:"مفتوح",nameEn:"Unlocked",tags:["unlock","open"]},{char:"⚙️",nameAr:"إعدادات",nameEn:"Settings",tags:["settings","gear"]},{char:"🛡️",nameAr:"حماية",nameEn:"Shield",tags:["shield","protect"]},{char:"💬",nameAr:"محادثة",nameEn:"Chat",tags:["chat","message"]},{char:"🔗",nameAr:"رابط",nameEn:"Link",tags:["link","connect"]},{char:"📌",nameAr:"تثبيت",nameEn:"Pin",tags:["pin","important"]},{char:"🏠",nameAr:"الرئيسية",nameEn:"Home",tags:["home","main"]},{char:"👤",nameAr:"حساب",nameEn:"Account",tags:["account","profile"]},{char:"🎮",nameAr:"ألعاب تعليمية",nameEn:"Educational Games",tags:["game","learn"]},{char:"🛒",nameAr:"متجر",nameEn:"Store",tags:["store","shop"]},{char:"💳",nameAr:"دفع",nameEn:"Payment",tags:["payment","card"]},{char:"📲",nameAr:"تطبيق",nameEn:"App",tags:["app","mobile"]},{char:"🌐",nameAr:"إنترنت",nameEn:"Internet",tags:["internet","web"]},{char:"🌙",nameAr:"وضع ليلي",nameEn:"Night Mode",tags:["night","dark"]},{char:"☀️",nameAr:"وضع نهاري",nameEn:"Day Mode",tags:["day","light"]},
      ];

      const allGroups: { cat: string; data: SD[] }[] = [
        { cat: "numbers-letters", data: numbersLetters },
        { cat: "emotions-faces", data: emotionsFaces },
        { cat: "animals", data: animals },
        { cat: "nature-elements", data: natureElements },
        { cat: "shapes-colors", data: shapesColors },
        { cat: "educational-tools", data: educationalTools },
        { cat: "activities-hobbies", data: activitiesHobbies },
        { cat: "rewards-achievements", data: rewardsAchievements },
        { cat: "project-specific", data: projectSpecific },
      ];

      let totalInserted = 0;
      for (const group of allGroups) {
        const categoryId = catMap[group.cat];
        if (!categoryId) continue;
        const existingCount = await db.select({ count: sql<number>`count(*)::int` })
          .from(librarySymbols).where(eq(librarySymbols.categoryId, categoryId));
        if ((existingCount[0]?.count || 0) >= group.data.length) {
          totalInserted += existingCount[0]?.count || 0;
          continue;
        }
        const values = group.data.map((s, i) => ({
          categoryId, char: s.char, nameAr: s.nameAr, nameEn: s.nameEn,
          tags: s.tags, price: 0, isPremium: false, sortOrder: i,
        }));
        for (let i = 0; i < values.length; i += 100) {
          const chunk = values.slice(i, i + 100);
          const result = await db.insert(librarySymbols).values(chunk).returning({ id: librarySymbols.id });
          totalInserted += result.length;
        }
      }
      res.json(successResponse({ seeded: totalInserted, categories: Object.keys(catMap).length }));
    } catch (err: any) {
      console.error("Seed symbols error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في تهيئة الرموز"));
    }
  });
}
