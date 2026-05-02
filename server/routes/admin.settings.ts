import type { Express } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { storage } from "../storage";
import {
  appSettings,
  rewardsSettings,
  tasksSettings,
  storeSettings,
  notificationSettings,
  paymentSettings,
  siteSettings,
  themeSettings,
  seoSettings,
  supportSettings,
  paymentMethods,
} from "../../shared/schema";
import { adminMiddleware, authMiddleware } from "./middleware";
import { eq, and, isNull } from "drizzle-orm";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { filterPaymentMethodsByCountry, resolveRequestCountryCode } from "../utils/paymentCountry";
import {
  getPaidServicesConfig,
  savePaidServicesConfig,
  toAdminPaidServicesView,
  toPublicPaidServicesView,
} from "../services/paidServicesConfig";
import {
  getChatChannelBinding,
  listChatChannelBindings,
  upsertChatChannelBinding,
  type ChatBindingRole,
} from "../services/chatChannelBindings";

const db = storage.db;

function resolveBindingActor(req: any): { role: ChatBindingRole; userId: string } | null {
  const type = String(req.user?.type || "").trim();

  if (type === "parent") {
    const userId = String(req.user?.parentId || req.user?.userId || "").trim();
    return userId ? { role: "parent", userId } : null;
  }

  if (type === "child") {
    const userId = String(req.user?.childId || "").trim();
    return userId ? { role: "child", userId } : null;
  }

  if (type === "teacher") {
    const userId = String(req.user?.teacherId || "").trim();
    return userId ? { role: "teacher", userId } : null;
  }

  if (type === "school") {
    const userId = String(req.user?.schoolId || "").trim();
    return userId ? { role: "school", userId } : null;
  }

  if (type === "admin") {
    const userId = String(req.user?.adminId || req.user?.userId || "").trim();
    return userId ? { role: "admin", userId } : null;
  }

  return null;
}

function tableForName(name: string) {
  switch (name) {
    case "app_settings":
    case "app":
      return appSettings;
    case "rewards_settings":
    case "rewards":
      return rewardsSettings;
    case "tasks_settings":
    case "tasks":
      return tasksSettings;
    case "store_settings":
    case "store":
      return storeSettings;
    case "notification_settings":
    case "notifications":
      return notificationSettings;
    case "payment_settings":
    case "payment":
      return paymentSettings;
    case "site_settings":
    case "site":
      return siteSettings;
    case "theme_settings":
    case "theme":
      return themeSettings;
    case "seo_settings":
    case "seo":
      return seoSettings;
    case "support_settings":
    case "support":
      return supportSettings;
    default:
      return null;
  }
}

// Default SEO settings for new installations
const DEFAULT_SEO_SETTINGS = {
  siteTitle: "Classify — تطبيق تعليمي للأطفال مع رقابة أبوية",
  siteDescription: "أفضل تطبيق تعليمي للأطفال من 6-17 سنة. ألعاب تعليمية تفاعلية في الرياضيات والذاكرة والتهجئة مع نظام رقابة أبوية كامل. تحكم في وقت الشاشة، تتبع التقدم، مهام ومكافآت.",
  keywords: "تطبيق تعليمي للأطفال, رقابة أبوية, ألعاب تعليمية, التحكم في وقت الشاشة, تطبيق أطفال آمن, مهام ومكافآت, تعليم تفاعلي, حماية الأطفال على الإنترنت, parental control app, kids educational games, screen time control, child safety app",
  canonicalUrl: "https://classi-fy.com",
  defaultLanguage: "ar",
  ogType: "website",
  ogTitle: "Classify — تطبيق تعليمي آمن للأطفال مع رقابة أبوية",
  ogDescription: "تطبيق تعليمي تفاعلي للأطفال مع رقابة أبوية ذكية، مهام يومية، نظام مكافآت، وتحكم كامل بوقت الشاشة.",
  ogImage: "https://classi-fy.com/screenshots/mobile-home.png",
  twitterCard: "summary_large_image",
  twitterSite: "@classifyapp",
  twitterCreator: "@classifyapp",
  robotsIndex: true,
  robotsFollow: true,
  robotsNoarchive: false,
  googlebot: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  bingbot: "index, follow",
  allowGPTBot: false,
  allowClaudeBot: false,
  allowGoogleAI: false,
  sitemapEnabled: true,
  sitemapChangefreq: "weekly",
  sitemapPriority: "0.8",
  schemaOrgType: "SoftwareApplication",
  schemaOrgName: "Classify",
  schemaOrgDescription: "منصة تعليمية للأطفال مع أدوات رقابة أبوية ذكية وتجربة تعلم تفاعلية.",
  schemaOrgLogo: "https://classi-fy.com/icons/icon-512.png",
  themeColor: "#6B4D9D",
};

// Default Support settings for new installations
const DEFAULT_SUPPORT_SETTINGS = {
  supportEmail: "support@classify.app",
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  workingDays: "الأحد - الخميس",
  timezone: "Asia/Riyadh",
  maintenanceMode: false,
  maintenanceMessage: "التطبيق تحت الصيانة، نعود قريباً",
  errorPageTitle: "حدث خطأ غير متوقع",
  errorPageMessage: "نأسف على هذا الخطأ. يرجى التواصل مع الدعم الفني.",
  showContactOnError: true,
  companyName: "Classify",
  companyCountry: "المملكة العربية السعودية",
};

export function registerAdminSettingsRoutes(app: Express) {
  // ===== SEO SETTINGS ENDPOINTS =====

  // Public: Get SEO settings (for meta tags in frontend)
  app.get("/api/seo-settings", async (_req, res) => {
    try {
      const result = await db.select().from(seoSettings);
      if (result[0]) {
        return res.json(successResponse(result[0], "SEO settings retrieved"));
      }
      // Return defaults if no settings exist
      return res.json(successResponse(DEFAULT_SEO_SETTINGS, "Default SEO settings"));
    } catch (error: any) {
      console.error("Fetch SEO settings error:", error);
      res.json(successResponse(DEFAULT_SEO_SETTINGS, "Default SEO settings"));
    }
  });

  // Admin: Get full SEO settings
  app.get("/api/admin/seo-settings", adminMiddleware, async (_req: any, res) => {
    try {
      const result = await db.select().from(seoSettings);
      if (result[0]) {
        return res.json(successResponse(result[0], "SEO settings retrieved"));
      }
      // Create default settings if none exist
      const newSettings = await db.insert(seoSettings).values(DEFAULT_SEO_SETTINGS).returning();
      return res.json(successResponse(newSettings[0], "SEO settings initialized"));
    } catch (error: any) {
      console.error("Admin fetch SEO settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch SEO settings"));
    }
  });

  // Admin: Update SEO settings
  app.put("/api/admin/seo-settings", adminMiddleware, async (req: any, res) => {
    try {
      const existing = await db.select().from(seoSettings);

      if (existing[0]) {
        const updated = await db
          .update(seoSettings)
          .set({ ...req.body, updatedAt: new Date(), updatedBy: req.userId })
          .where(eq(seoSettings.id, existing[0].id))
          .returning();
        return res.json(successResponse(updated[0], "SEO settings updated"));
      }

      // Create if not exists
      const newSettings = await db
        .insert(seoSettings)
        .values({ ...req.body, updatedBy: req.userId })
        .returning();
      return res.json(successResponse(newSettings[0], "SEO settings created"));
    } catch (error: any) {
      console.error("Update SEO settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update SEO settings"));
    }
  });

  // ===== SUPPORT SETTINGS ENDPOINTS =====

  // Public: Get support contact info (for error pages and footer)
  app.get("/api/support-settings", async (_req, res) => {
    try {
      const result = await db.select().from(supportSettings);
      if (result[0]) {
        // Return only public-facing fields
        const publicFields = {
          supportEmail: result[0].supportEmail,
          supportPhone: result[0].supportPhone,
          whatsappNumber: result[0].whatsappNumber,
          telegramUsername: result[0].telegramUsername,
          facebookUrl: result[0].facebookUrl,
          twitterUrl: result[0].twitterUrl,
          instagramUrl: result[0].instagramUrl,
          workingHoursStart: result[0].workingHoursStart,
          workingHoursEnd: result[0].workingHoursEnd,
          workingDays: result[0].workingDays,
          timezone: result[0].timezone,
          emergencyMessage: result[0].emergencyMessage,
          maintenanceMode: result[0].maintenanceMode,
          maintenanceMessage: result[0].maintenanceMessage,
          errorPageTitle: result[0].errorPageTitle,
          errorPageMessage: result[0].errorPageMessage,
          showContactOnError: result[0].showContactOnError,
          faqUrl: result[0].faqUrl,
          helpCenterUrl: result[0].helpCenterUrl,
          privacyPolicyUrl: result[0].privacyPolicyUrl,
          termsOfServiceUrl: result[0].termsOfServiceUrl,
          companyName: result[0].companyName,
        };
        return res.json(successResponse(publicFields, "Support settings retrieved"));
      }
      return res.json(successResponse(DEFAULT_SUPPORT_SETTINGS, "Default support settings"));
    } catch (error: any) {
      console.error("Fetch support settings error:", error);
      res.json(successResponse(DEFAULT_SUPPORT_SETTINGS, "Default support settings"));
    }
  });

  // Admin: Get full support settings
  app.get("/api/admin/support-settings", adminMiddleware, async (_req: any, res) => {
    try {
      const result = await db.select().from(supportSettings);
      if (result[0]) {
        return res.json(successResponse(result[0], "Support settings retrieved"));
      }
      // Create default settings if none exist
      const newSettings = await db.insert(supportSettings).values(DEFAULT_SUPPORT_SETTINGS).returning();
      return res.json(successResponse(newSettings[0], "Support settings initialized"));
    } catch (error: any) {
      console.error("Admin fetch support settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch support settings"));
    }
  });

  // Admin: Update support settings
  app.put("/api/admin/support-settings", adminMiddleware, async (req: any, res) => {
    try {
      const existing = await db.select().from(supportSettings);

      if (existing[0]) {
        const updated = await db
          .update(supportSettings)
          .set({ ...req.body, updatedAt: new Date(), updatedBy: req.userId })
          .where(eq(supportSettings.id, existing[0].id))
          .returning();
        return res.json(successResponse(updated[0], "Support settings updated"));
      }

      // Create if not exists
      const newSettings = await db
        .insert(supportSettings)
        .values({ ...req.body, updatedBy: req.userId })
        .returning();
      return res.json(successResponse(newSettings[0], "Support settings created"));
    } catch (error: any) {
      console.error("Update support settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update support settings"));
    }
  });

  // ===== ROBOTS.TXT ENDPOINT =====
  app.get("/robots.txt", async (_req, res) => {
    try {
      const candidates = [
        path.resolve(process.cwd(), "dist", "public", "robots.txt"),
        path.resolve(process.cwd(), "client", "public", "robots.txt"),
      ];

      for (const filePath of candidates) {
        try {
          const robotsTxt = await fs.readFile(filePath, "utf-8");
          res.type("text/plain").send(robotsTxt);
          return;
        } catch {
          // Try next candidate path.
        }
      }

      throw new Error("robots.txt file not found");
    } catch (error: any) {
      console.error("Generate robots.txt error:", error);
      res.type("text/plain").send("User-agent: *\nAllow: /\n");
    }
  });

  // Public settings endpoint - returns merged minimal settings + active payment methods
  app.get("/api/settings", async (_req, res) => {
    try {
      const [site, theme, store, notification, payment, activePaymentMethods, paidServicesConfig] = await Promise.all([
        db.select().from(siteSettings),
        db.select().from(themeSettings),
        db.select().from(storeSettings),
        db.select().from(notificationSettings),
        db.select().from(paymentSettings),
        db.select({
          id: paymentMethods.id,
          type: paymentMethods.type,
          displayName: paymentMethods.displayName,
          accountName: paymentMethods.accountName,
          bankName: paymentMethods.bankName,
          accountNumber: paymentMethods.accountNumber,
          phoneNumber: paymentMethods.phoneNumber,
          supportedCountries: paymentMethods.supportedCountries,
          gatewayConfig: paymentMethods.gatewayConfig,
          isDefault: paymentMethods.isDefault,
        }).from(paymentMethods).where(and(
          isNull(paymentMethods.parentId),
          eq(paymentMethods.isActive, true)
        )),
        getPaidServicesConfig(db),
      ]);

      const requestCountryCode = resolveRequestCountryCode(_req as any);
      const filteredPaymentMethods = filterPaymentMethodsByCountry(activePaymentMethods, requestCountryCode);

      const response = {
        site: site.reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {}),
        theme: theme[0] || null,
        store: store[0] || null,
        notification: notification[0] || null,
        payment: payment[0] || null,
        paymentMethods: filteredPaymentMethods,
        paidServices: toPublicPaidServicesView(paidServicesConfig),
      };

      res.json(successResponse(response));
    } catch (error: any) {
      console.error("Fetch public settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch settings"));
    }
  });

  // Admin: get all settings (parallelized for performance)
  app.get("/api/admin/settings", adminMiddleware, async (_req: any, res) => {
    try {
      const [appS, rewards, tasks, store, notification, payment, site, theme] = await Promise.all([
        db.select().from(appSettings),
        db.select().from(rewardsSettings),
        db.select().from(tasksSettings),
        db.select().from(storeSettings),
        db.select().from(notificationSettings),
        db.select().from(paymentSettings),
        db.select().from(siteSettings),
        db.select().from(themeSettings),
      ]);

      res.json(successResponse({ app: appS, rewards, tasks, store, notification, payment, site, theme }));
    } catch (error: any) {
      console.error("Fetch admin settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch admin settings"));
    }
  });

  // Admin: unified paid services config (stored in site_settings as JSON)
  app.get("/api/admin/paid-services-config", adminMiddleware, async (_req: any, res) => {
    try {
      const config = await getPaidServicesConfig(db);
      res.json(successResponse(toAdminPaidServicesView(config)));
    } catch (error: any) {
      console.error("Fetch paid services config error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch paid services config"));
    }
  });

  // Admin: update unified paid services config
  app.put("/api/admin/paid-services-config", adminMiddleware, async (req: any, res) => {
    try {
      const saved = await savePaidServicesConfig(db, req.body || {});
      res.json(successResponse(toAdminPaidServicesView(saved), "Paid services config updated"));
    } catch (error: any) {
      console.error("Update paid services config error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update paid services config"));
    }
  });

  // Public: sanitized paid services state only (no secrets)
  app.get("/api/paid-services-config", async (_req, res) => {
    try {
      const config = await getPaidServicesConfig(db);
      res.json(successResponse(toPublicPaidServicesView(config)));
    } catch (error: any) {
      console.error("Fetch public paid services config error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch paid services config"));
    }
  });

  app.get("/api/chat-channels/options", authMiddleware, async (req: any, res) => {
    try {
      const actor = resolveBindingActor(req);
      if (!actor) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
      }

      const [config, binding] = await Promise.all([
        getPaidServicesConfig(db),
        getChatChannelBinding(actor.role, actor.userId),
      ]);

      const telegram = config.services.telegram_bot;
      const apprise = config.services.apprise_router;

      return res.json(
        successResponse({
          role: actor.role,
          userId: actor.userId,
          channels: {
            telegram: {
              enabled: telegram?.enabled === true && telegram?.mode !== "disabled" && telegram?.audiences?.[actor.role]?.enabled !== false,
              visibleToUser: telegram?.audiences?.[actor.role]?.visibleToUser === true,
              binding: {
                telegramChatId: binding?.telegramChatId || "",
                telegramEnabled: binding?.telegramEnabled === true,
              },
            },
            whatsapp: {
              enabled: apprise?.enabled === true && apprise?.mode !== "disabled" && apprise?.audiences?.[actor.role]?.enabled !== false,
              visibleToUser: apprise?.audiences?.[actor.role]?.visibleToUser === true,
              binding: {
                whatsappNumber: binding?.whatsappNumber || "",
                whatsappEnabled: binding?.whatsappEnabled === true,
              },
            },
          },
        })
      );
    } catch (error: any) {
      console.error("Fetch chat channel options error:", error);
      return res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch chat channel options"));
    }
  });

  app.put("/api/chat-channels/bindings", authMiddleware, async (req: any, res) => {
    try {
      const actor = resolveBindingActor(req);
      if (!actor) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
      }

      const config = await getPaidServicesConfig(db);
      const telegram = config.services.telegram_bot;
      const apprise = config.services.apprise_router;

      const canEditTelegram = telegram?.audiences?.[actor.role]?.visibleToUser === true;
      const canEditWhatsapp = apprise?.audiences?.[actor.role]?.visibleToUser === true;

      const payload = req.body || {};

      const saved = await upsertChatChannelBinding({
        role: actor.role,
        userId: actor.userId,
        telegramChatId: canEditTelegram ? payload.telegramChatId : undefined,
        telegramEnabled: canEditTelegram ? payload.telegramEnabled === true : undefined,
        whatsappNumber: canEditWhatsapp ? payload.whatsappNumber : undefined,
        whatsappEnabled: canEditWhatsapp ? payload.whatsappEnabled === true : undefined,
      });

      return res.json(successResponse(saved, "Chat channel binding updated"));
    } catch (error: any) {
      console.error("Update chat channel binding error:", error);
      return res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update chat channel binding"));
    }
  });

  app.get("/api/admin/chat-channels/bindings", adminMiddleware, async (req: any, res) => {
    try {
      const role = String(req.query?.role || "").trim() as ChatBindingRole;
      const limit = Number(req.query?.limit || 200);
      const bindings = await listChatChannelBindings({
        role: role || undefined,
        limit,
      });

      return res.json(successResponse({ bindings, total: bindings.length }));
    } catch (error: any) {
      console.error("Admin list chat bindings error:", error);
      return res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to list chat channel bindings"));
    }
  });

  // Admin: create or upsert setting for keyed tables (app/site)
  app.post("/api/admin/settings/:table", adminMiddleware, async (req: any, res) => {
    try {
      const { table } = req.params;
      const tbl = tableForName(table);
      if (!tbl) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Unknown settings table"));
      }

      // special handling for key/value tables
      if (tbl === appSettings || tbl === siteSettings) {
        const { key, value } = req.body;
        if (!key) {
          return res
            .status(400)
            .json(errorResponse(ErrorCode.BAD_REQUEST, "Key is required"));
        }

        // try update existing
        const existing = await db.select().from(tbl).where(eq(tbl.key, key));
        if (existing[0]) {
          await db.update(tbl).set({ value }).where(eq(tbl.key, key));
          return res.json(successResponse(undefined, "Updated"));
        }
        await db.insert(tbl).values({ key, value });
        return res.json(successResponse(undefined, "Created"));
      }

      // generic: insert a row
      const insertRes = await db.insert(tbl).values(req.body).returning();
      res.json(successResponse(insertRes[0]));
    } catch (error: any) {
      console.error("Create setting error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create setting"));
    }
  });

  // Admin: update by id
  app.put("/api/admin/settings/:table/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { table, id } = req.params;
      const tbl = tableForName(table);
      if (!tbl) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Unknown settings table"));
      }

      await db.update(tbl).set(req.body).where(eq(tbl.id, id));
      res.json(successResponse());
    } catch (error: any) {
      console.error("Update setting error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update setting"));
    }
  });

  // Admin: delete by id
  app.delete("/api/admin/settings/:table/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { table, id } = req.params;
      const tbl = tableForName(table);
      if (!tbl) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Unknown settings table"));
      }

      await db.delete(tbl).where(eq(tbl.id, id));
      res.json(successResponse());
    } catch (error: any) {
      console.error("Delete setting error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete setting"));
    }
  });
}
