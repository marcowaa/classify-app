import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { flashGames, symbolCategories } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";

import { registerAuthRoutes } from "./auth";
import { registerAdminRoutes } from "./admin";
import { registerParentRoutes } from "./parent";
import { registerChildRoutes } from "./child";
import { registerAdminSettingsRoutes } from "./admin.settings";
import { registerActivityLogRoutes } from "./admin-activity";
import { registerAnalyticsRoutes } from "./admin-analytics";
import { registerTrialAnalyticsRoutes } from "./trial-analytics";
import { registerGiftManagementRoutes } from "./admin-gifts";
import { registerNotificationSettingsRoutes } from "./admin-notification-settings";
import { registerAdminTaskNotificationRoutes } from "./admin-task-notification-settings";
import trustedDevicesRouter from "./trusted-devices";
import adsRouter from "./ads";
import parentLinkingRouter from "./parent-linking";
import { registerPaymentRoutes } from "./payments";
import { registerStoreRoutes } from "./store";
import { registerReferralRoutes } from "./referrals";
import { registerLibraryRoutes } from "./library";
import { registerSchoolRoutes } from "./school";
import { registerTeacherRoutes } from "./teacher";
import { registerFollowRoutes } from "./follow";
import { registerMarketplaceRoutes } from "./marketplace";
import { registerObjectStorageRoutes } from "../replit_integrations/object_storage";
import { registerMediaUploadRoutes } from "./media-uploads";
import { registerSymbolRoutes } from "./symbols";
import { registerSwaggerDocs } from "../swagger";

// Seed built-in games if they don't exist yet
async function seedDefaultGames() {
  const db = storage.db;
  try {
    // ── Built-in game definitions ──
    const builtinGames = [
      {
        title: "تحدي الرياضيات - Math Challenge 🔢",
        description: "لعبة تعليمية ممتعة لتحسين مهارات الحساب — 10 عوالم، نظام ذكاء تكيّفي، وتقرير أداء للوالدين!",
        embedUrl: "/games/math-challenge.html",
        thumbnailUrl: "/games/previews/math-challenge.svg",
        category: "math",
        minAge: 5,
        maxAge: 14,
        pointsPerPlay: 10,
        maxPlaysPerDay: 5,
      },
      {
        title: "مملكة الذاكرة - Memory Kingdom 🧠",
        description: "100 مستوى عبر 10 عوالم! 11 نوع لعب، 10 زعماء، 5 قدرات خارقة، متجر سمات، نظام XP وسلسلة يومية، تقرير ذكاء معرفي للوالدين!",
        embedUrl: "/games/memory-match.html",
        thumbnailUrl: "/games/previews/memory-match.svg",
        category: "puzzle",
        minAge: 4,
        maxAge: 14,
        pointsPerPlay: 10,
        maxPlaysPerDay: 0,
      },
      {
        title: "مملكة الجواهر - Gem Kingdom 💎",
        description: "100 مستوى عبر 10 عوالم سحرية! 13 نوع عائق، 20 وحش، 40 إنجاز، ذكاء تكيفي، قصص تعليمية، تقارير أداء للوالدين!",
        embedUrl: "/games/gem-kingdom.html",
        thumbnailUrl: "/games/previews/gem-kingdom.svg",
        category: "puzzle",
        minAge: 5,
        maxAge: 14,
        pointsPerPlay: 10,
        maxPlaysPerDay: 0,
      },
      {
        title: "مغامرة الفواكه - Fruit Adventure 🐍",
        description: "لعبة ثعبان ثلاثية الأبعاد! 9 مستويات، 5 أشكال للثعبان، 8 قدرات خارقة، نظام طقس، كاميرا ذكية، خريطة مصغرة، وتأثيرات بصرية مذهلة!",
        embedUrl: "/games/snake-3d.html",
        thumbnailUrl: "/games/previews/snake-3d.svg",
        category: "puzzle",
        minAge: 5,
        maxAge: 14,
        pointsPerPlay: 10,
        maxPlaysPerDay: 0,
      },
      {
        title: "مملكة القطة التعليمية - Cat Kingdom 🐱👑",
        description: "100 مستوى تعليمي عبر 10 عوالم! ألوان، أشكال، أرقام، جمع، طرح، حروف عربية وإنجليزية، كلمات، أنماط، تحديات مختلطة! نظام قطة أليفة، متجر أشكال، زعماء، شارات إنجاز!",
        embedUrl: "/games/cat-kingdom.html",
        thumbnailUrl: "/games/previews/cat-kingdom.svg",
        category: "educational",
        minAge: 4,
        maxAge: 12,
        pointsPerPlay: 10,
        maxPlaysPerDay: 0,
      },
      {
        title: "مملكة الجليد التعليمية - Ice Kingdom Academy ❄️🌍",
        description: "100 مستوى تعليمي عبر 10 عوالم جليدية! ألوان، حيوانات، طقس، أرقام، جمع، طرح، جغرافيا، علوم، ديناصورات! نظام بطريق أليف، مكافأة يومية، قدرات خارقة، متجر أشكال!",
        embedUrl: "/games/ice-kingdom.html",
        thumbnailUrl: "/games/previews/ice-kingdom.svg",
        category: "educational",
        minAge: 4,
        maxAge: 12,
        pointsPerPlay: 10,
        maxPlaysPerDay: 0,
      },
    ];

    for (const game of builtinGames) {
      // Remove duplicates: keep only the first row per embedUrl
      const rows = await db.select({ id: flashGames.id })
        .from(flashGames)
        .where(eq(flashGames.embedUrl, game.embedUrl));

      if (rows.length > 1) {
        // Keep first, delete rest
        const idsToDelete = rows.slice(1).map((r: any) => r.id);
        for (const dupId of idsToDelete) {
          await db.delete(flashGames).where(eq(flashGames.id, dupId));
        }
        console.log(`🧹 Removed ${idsToDelete.length} duplicate(s) for ${game.embedUrl}`);
        // Update the surviving record with latest info
        await db.update(flashGames)
          .set({ title: game.title, description: game.description, thumbnailUrl: game.thumbnailUrl })
          .where(eq(flashGames.id, rows[0].id));
      } else if (rows.length === 1) {
        // Update title/description to latest
        await db.update(flashGames)
          .set({ title: game.title, description: game.description, thumbnailUrl: game.thumbnailUrl })
          .where(eq(flashGames.id, rows[0].id));
      } else {
        // Insert new
        await db.insert(flashGames).values({
          ...game,
          isActive: true,
        });
        console.log(`✅ Seeded default game: ${game.title}`);
      }
    }

    // Keep admin-added games intact. Seed only ensures builtin games exist and stay updated.
  } catch (err) {
    console.warn("⚠️ Could not seed default games:", (err as Error).message);
  }
}

// Seed symbol categories & symbols if empty
async function seedSymbolCategories() {
  const db = storage.db;
  try {
    const existing = await db.select({ count: sql<number>`count(*)::int` }).from(symbolCategories);
    if ((existing[0]?.count || 0) > 0) return; // Already seeded

    const categories = [
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

    await db.insert(symbolCategories).values(categories);
    console.log("✅ Seeded 9 symbol categories");
  } catch (err) {
    console.warn("⚠️ Could not seed symbol categories:", (err as Error).message);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const db = storage.db;

  await seedDefaultGames();
  await seedSymbolCategories();

  // Health Check
  app.get("/api/health", async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      return res.status(200).json({
        status: "ok",
        checks: {
          database: "healthy",
        },
      });
    } catch (error) {
      const payload: {
        status: "degraded";
        checks: { database: "unhealthy" };
        message?: string;
      } = {
        status: "degraded",
        checks: {
          database: "unhealthy",
        },
      };

      if (process.env.NODE_ENV !== "production") {
        payload.message = error instanceof Error ? error.message : "Database unavailable";
      }

      return res.status(503).json(payload);
    }
  });

  // Register all route groups
  registerAuthRoutes(app);
  registerAdminRoutes(app);
  registerAdminSettingsRoutes(app);
  registerActivityLogRoutes(app);
  registerAnalyticsRoutes(app);
  registerTrialAnalyticsRoutes(app);
  registerGiftManagementRoutes(app);
  registerNotificationSettingsRoutes(app);
  registerAdminTaskNotificationRoutes(app);
  registerParentRoutes(app);
  registerChildRoutes(app);
  registerPaymentRoutes(app);
  registerStoreRoutes(app);
  registerReferralRoutes(app);
  registerLibraryRoutes(app);
  registerSchoolRoutes(app);
  registerTeacherRoutes(app);
  registerFollowRoutes(app);
  registerMarketplaceRoutes(app);
  registerObjectStorageRoutes(app);
  registerMediaUploadRoutes(app);
  registerSymbolRoutes(app);

  // Register new feature routes
  app.use("/api", trustedDevicesRouter);
  app.use("/api", adsRouter);
  app.use("/api", parentLinkingRouter);

  // Register Swagger API documentation
  registerSwaggerDocs(app);

  // ✅ Create HTTP server (will be returned)
  const httpServer = createServer(app);
  return httpServer;
}
