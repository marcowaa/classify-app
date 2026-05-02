import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface SEOSettings {
  siteTitle: string;
  siteDescription: string;
  keywords: string;
  ogImage: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  favicon: string;
  twitterHandle?: string;
  twitterSite?: string;
  twitterCreator?: string;
  twitterCard?: string;
  googleVerification: string;
  robots: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  robotsNoarchive?: boolean;
  googlebot?: string;
  bingbot?: string;
  canonicalUrl: string;
  schemaOrgType?: string;
  schemaOrgName?: string;
  schemaOrgDescription?: string;
  schemaOrgLogo?: string;
  themeColor: string;
}

const isBrowser = typeof window !== "undefined";

const INDEXABLE_ROUTES = new Set([
  "/",
  "/age-gate",
  "/download",
  "/trial-games",
  "/about",
  "/contact",
  "/legal",
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/cookie-policy",
  "/child-safety",
  "/refund-policy",
  "/acceptable-use",
  "/accessibility",
  "/delete-account",
]);

const CANONICAL_ROUTE_ALIASES: Record<string, string> = {
  "/register": "/parent-auth",
  "/login": "/parent-auth",
  "/signin": "/parent-auth",
  "/parent-login": "/parent-auth",
  "/parent-signin": "/parent-auth",
  "/child-login": "/child-link",
  "/child-signin": "/child-link",
  "/store/libraries": "/library-store",
};

// Per-route SEO metadata so each page gets a unique title/description
const ROUTE_SEO: Record<string, { title: string; description: string }> = {
  "/": { title: "Classify — تطبيق تعليمي للأطفال مع دعم عائلي | Kids Educational App with Family Guidance", description: "Classify — أفضل تطبيق تعليمي للأطفال من 6-17 سنة. ألعاب تعليمية تفاعلية في الرياضيات والذاكرة والتهجئة مع دعم عائلي متوازن. تنظيم وقت الشاشة، تتبع التقدم، مهام ومكافآت. حمّل مجاناً!" },
  "/age-gate": { title: "اختيار العمر الآمن | Classify", description: "ابدأ من بوابة العمر لاختيار المسار المناسب للطفل أو ولي الأمر مع روابط واضحة لكل سياسات المنصة." },
  "/parent-auth": { title: "دخول ولي الأمر | Classify", description: "تسجيل الدخول أو إنشاء حساب ولي أمر جديد لإدارة تعليم أطفالك ومتابعة تقدمهم." },
  "/child-link": { title: "دخول الطفل | Classify", description: "سجّل دخول طفلك للبدء باللعب والتعلم في بيئة آمنة." },
  "/parent-dashboard": { title: "لوحة تحكم ولي الأمر | Classify", description: "إدارة ومتابعة تقدم أطفالك التعليمي، التحكم في وقت الشاشة، وإدارة المهام والمكافآت." },
  "/child-games": { title: "ألعاب تعليمية تفاعلية للأطفال | Classify", description: "العب ألعاب تعليمية ممتعة في الرياضيات والذاكرة والتهجئة. تعلم مهارات جديدة!" },
  "/parent-store": { title: "متجر المكافآت | Classify", description: "تصفح المنتجات والمكافآت التعليمية لتحفيز أطفالك." },
  "/child-store": { title: "متجر الطفل | Classify", description: "تصفح المكافآت والهدايا المتاحة لك." },
  "/privacy-policy": { title: "سياسة الخصوصية | Classify", description: "سياسة الخصوصية وحماية البيانات الشخصية لمنصة Classify التعليمية. متوافق مع COPPA وGDPR." },
  "/privacy": { title: "الخصوصية | Classify", description: "معلومات حول خصوصية بياناتك في Classify." },
  "/terms": { title: "شروط الاستخدام | Classify", description: "شروط وأحكام استخدام منصة Classify التعليمية." },
  "/about": { title: "شرح كامل موقع Classify | منصة تعليمية للأطفال مع دعم الأهل", description: "شرح شامل لمنصة Classify: تطبيق تعليمي للأطفال، ألعاب تعليمية تفاعلية، دعم الأهل للأبناء وليس المراقبة، تنظيم وقت الشاشة، تتبع تقدم الطفل، مهام ومكافآت، سلامة الأطفال، وسياسات الخصوصية." },
  "/contact": { title: "تواصل معنا | Classify", description: "تواصل مع فريق دعم Classify للمساعدة والاستفسارات." },
  "/child-safety": { title: "سلامة الأطفال على الإنترنت | Classify", description: "كيف نحمي أطفالك ونضمن سلامتهم الرقمية على المنصة. حماية الأطفال أولويتنا." },
  "/refund-policy": { title: "سياسة الاسترداد | Classify", description: "سياسة استرداد المبالغ والمشتريات في Classify." },
  "/cookie-policy": { title: "سياسة ملفات الارتباط | Classify", description: "كيف نستخدم ملفات تعريف الارتباط في Classify." },
  "/legal": { title: "المركز القانوني | Classify", description: "جميع السياسات والشروط القانونية لمنصة Classify." },
  "/download": { title: "تحميل تطبيق Classify مجاناً | ألعاب تعليمية ودعم عائلي", description: "حمّل تطبيق Classify المجاني على أندرويد. ألعاب تعليمية تفاعلية مع دعم عائلي مرن وتنظيم وقت الشاشة." },
  "/trial-games": { title: "جرب ألعاب Classify التعليمية مجاناً | ألعاب ذكاء للأطفال", description: "جرب ألعابنا التعليمية مجاناً — رياضيات، ذاكرة، تهجئة. ألعاب آمنة للأطفال بدون تسجيل." },
  "/wallet": { title: "المحفظة | Classify", description: "إدارة رصيدك ومعاملاتك المالية." },
  "/notifications": { title: "الإشعارات | Classify", description: "إشعاراتك ومستجداتك." },
  "/subjects": { title: "المواد الدراسية | Classify", description: "تصفح المواد والموضوعات التعليمية." },
  "/settings": { title: "الإعدادات | Classify", description: "إعدادات حسابك وتفضيلاتك." },
  "/delete-account": { title: "حذف الحساب | Classify", description: "طلب حذف حسابك وبياناتك." },
  "/accessibility": { title: "إمكانية الوصول | Classify", description: "التزامنا بمعايير إمكانية الوصول." },
  "/acceptable-use": { title: "الاستخدام المقبول | Classify", description: "سياسة الاستخدام المقبول لمنصة Classify." },
  "/forgot-password": { title: "استعادة كلمة المرور | Classify", description: "استعد كلمة مرورك عبر البريد الإلكتروني." },
};

export function useSEO() {
  const [location] = useLocation();

  const { data: seoSettings } = useQuery<SEOSettings>({
    queryKey: ["seo-settings"],
    queryFn: async () => {
      const res = await fetch("/api/seo-settings");
      if (!res.ok) {
        return {
          siteTitle: "Classify — تطبيق تعليمي للأطفال مع دعم عائلي",
          siteDescription: "أفضل تطبيق تعليمي للأطفال من 6-17 سنة. ألعاب تعليمية تفاعلية مع دعم عائلي متوازن وتنظيم وقت الشاشة.",
          keywords: "تطبيق تعليمي للأطفال, دعم عائلي, ألعاب تعليمية, تنظيم وقت الشاشة, تطبيق أطفال آمن, مهام ومكافآت, family guidance app, kids educational games, screen time support",
          ogImage: "/screenshots/mobile-home.png",
          favicon: "",
          twitterHandle: "",
          googleVerification: "",
          robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
          canonicalUrl: "https://classi-fy.com",
          themeColor: "#6B4D9D"
        };
      }
      const json = await res.json();
      return json.data ?? json;
    },
    staleTime: 1000 * 60 * 5,
    enabled: isBrowser,
  });

  useEffect(() => {
    if (!isBrowser || !seoSettings) return;

    const normalizeRoutePath = (rawLocation: string) => {
      try {
        const parsed = new URL(rawLocation, window.location.origin);
        const pathname = parsed.pathname || "/";
        return pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
      } catch {
        const pathOnly = String(rawLocation || "/").split("?")[0].split("#")[0] || "/";
        return pathOnly.length > 1 ? pathOnly.replace(/\/+$/, "") : "/";
      }
    };

    const normalizedPath = normalizeRoutePath(location);
    const canonicalPath = CANONICAL_ROUTE_ALIASES[normalizedPath] || normalizedPath;
    const isIndexableRoute = INDEXABLE_ROUTES.has(canonicalPath);

    // Per-route SEO: use route-specific title/description if available
    const routeSeo = ROUTE_SEO[canonicalPath] || ROUTE_SEO[normalizedPath];
    const pageTitle = routeSeo?.title || seoSettings.siteTitle || "Classify";
    const pageDescription = routeSeo?.description || seoSettings.siteDescription;

    document.title = pageTitle;

    // Set html dir based on current language (preserve lang attribute set elsewhere)
    const htmlEl = document.documentElement;
    const currentLang = htmlEl.getAttribute("lang") || "ar";

    const updateMeta = (name: string, content: string, isProperty?: boolean) => {
      if (!content) return;
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    updateMeta("description", pageDescription);
    updateMeta("keywords", seoSettings.keywords);
    const robotsFromFlags = [
      seoSettings.robotsIndex === false ? "noindex" : "index",
      seoSettings.robotsFollow === false ? "nofollow" : "follow",
      seoSettings.robotsNoarchive ? "noarchive" : "",
      "max-image-preview:large",
      "max-snippet:-1",
      "max-video-preview:-1",
    ]
      .filter(Boolean)
      .join(", ");

    const robotsValue = !isIndexableRoute
      ? "noindex, nofollow, noarchive"
      : seoSettings.robots || robotsFromFlags;
    updateMeta("robots", robotsValue);
    if (!isIndexableRoute) {
      updateMeta("googlebot", "noindex, nofollow, noarchive");
      updateMeta("bingbot", "noindex, nofollow, noarchive");
    } else if (seoSettings.googlebot) {
      updateMeta("googlebot", seoSettings.googlebot);
      if (seoSettings.bingbot) {
        updateMeta("bingbot", seoSettings.bingbot);
      }
    }
    updateMeta("theme-color", seoSettings.themeColor);

    if (seoSettings.googleVerification) {
      updateMeta("google-site-verification", seoSettings.googleVerification);
    }

    const resolvedOgTitle = seoSettings.ogTitle || pageTitle;
    const resolvedOgDescription = seoSettings.ogDescription || pageDescription;
    updateMeta("og:title", resolvedOgTitle, true);
    updateMeta("og:description", resolvedOgDescription, true);
    updateMeta("og:type", seoSettings.ogType || "website", true);
    updateMeta("og:locale", currentLang === "ar" ? "ar_EG" : "en_US", true);
    updateMeta("og:site_name", "Classify", true);
    if (seoSettings.ogImage) {
      updateMeta("og:image", seoSettings.ogImage, true);
    }

    // Dynamic canonical URL per page (always anchored to canonical base domain)
    const canonicalBase = (seoSettings.canonicalUrl || window.location.origin).replace(/\/$/, "");
    const safeCanonicalPath = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
    const currentCanonical = `${canonicalBase}${safeCanonicalPath}`;
    updateMeta("og:url", currentCanonical, true);

    updateMeta("twitter:card", seoSettings.twitterCard || "summary_large_image");
    updateMeta("twitter:title", resolvedOgTitle);
    updateMeta("twitter:description", resolvedOgDescription);
    if (seoSettings.ogImage) {
      updateMeta("twitter:image", seoSettings.ogImage);
    }
    const twitterSite = seoSettings.twitterSite || seoSettings.twitterHandle;
    const twitterCreator = seoSettings.twitterCreator || seoSettings.twitterHandle;
    if (twitterSite) {
      updateMeta("twitter:site", twitterSite);
    }
    if (twitterCreator) {
      updateMeta("twitter:creator", twitterCreator);
    }

    if (seoSettings.favicon) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = seoSettings.favicon;
    }

    // Dynamic canonical link per page
    let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = currentCanonical;

    const existingSchema = document.getElementById("dynamic-schema-org");
    if (existingSchema) {
      existingSchema.remove();
    }

    const schemaScript = document.createElement("script");
    schemaScript.id = "dynamic-schema-org";
    schemaScript.type = "application/ld+json";
    schemaScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": seoSettings.schemaOrgType || "SoftwareApplication",
      name: seoSettings.schemaOrgName || "Classify",
      description: seoSettings.schemaOrgDescription || pageDescription,
      url: currentCanonical,
      image: seoSettings.ogImage || undefined,
      logo: seoSettings.schemaOrgLogo || undefined,
    });
    document.head.appendChild(schemaScript);

  }, [seoSettings, location]);

  return seoSettings;
}
