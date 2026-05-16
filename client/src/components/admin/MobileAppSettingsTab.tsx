import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Smartphone, Download, Globe, Shield, Palette, Bot, Info, Upload, Image, Loader2, X, ArrowUp, ArrowDown, Plus, Trash2, CheckCircle2 } from "lucide-react";

interface AppConfig {
  // Basic App Info
  appName: string;
  appNameAr: string;
  appVersion: string;
  appBuildNumber: string;
  appDescription: string;
  appDescriptionAr: string;
  packageName: string;
  appIconUrl: string;

  // Download Settings
  apkEnabled: boolean;
  apkUrl: string;
  apkSize: string;
  minAndroidVersion: string;
  showHomeApkButton: boolean;
  showHomeAabButton: boolean;
  showHomePwaButton: boolean;
  homeAgeCardEnabled: boolean;
  homeAgeOptionOneText: string;
  homeAgeOptionTwoText: string;
  homeAgeOptionOneBg: string;
  homeAgeOptionOneTextColor: string;
  homeAgeOptionTwoFrom: string;
  homeAgeOptionTwoTo: string;
  homeAgeOptionTwoTextColor: string;
  ageGateCardChildTitleAr: string;
  ageGateCardChildBodyAr: string;
  ageGateCardChildTitleEn: string;
  ageGateCardChildBodyEn: string;
  ageGateCardParentTitleAr: string;
  ageGateCardParentBodyAr: string;
  ageGateCardParentTitleEn: string;
  ageGateCardParentBodyEn: string;
  ageGateIntroOverlayEnabled: boolean;
  ageGateIntroCards: Array<{
    id: string;
    titleAr: string;
    bodyAr: string;
    titleEn: string;
    bodyEn: string;
    imageUrl: string;
    enabled: boolean;
  }>;
  parentThresholdAge: number;
  iosEnabled: boolean;
  iosUrl: string;
  appScreenshots: string[];

  // Store Listing
  storeShortDesc: string;
  storeShortDescAr: string;
  storeFullDesc: string;
  storeFullDescAr: string;
  playPromoText: string;
  playPromoTextAr: string;
  appStoreSubtitle: string;
  appStoreKeywords: string;
  appStorePromoText: string;
  storeCategory: string;
  storeContentRating: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  developerName: string;
  developerEmail: string;
  developerWebsite: string;

  // Crawler / SEO for App
  appOgTitle: string;
  appOgDescription: string;
  appOgImage: string;
  appSchemaType: string;
  appKeywords: string;
  appKeywordsAr: string;
  deepLinksEnabled: boolean;
  assetlinksEnabled: boolean;
  appleSiteAssociationEnabled: boolean;

  // PWA Settings
  pwaEnabled: boolean;
  pwaThemeColor: string;
  pwaBackgroundColor: string;
  pwaDisplayMode: string;
  pwaStartUrl: string;
  pwaName: string;
  pwaShortName: string;
}

interface MobileApkBuild {
  id: string;
  version: string;
  buildNumber: string;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeLabel: string;
  mimeType: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  uploadedBy: string;
}

interface MobileApkBuildsState {
  activeBuildId: string | null;
  builds: MobileApkBuild[];
}

interface TrialPolicyConfig {
  trialExpiryDays: number;
  explorePromptPercent: number;
  purchaseIntentPromptEnabled: boolean;
  showSocialLoginButtons: boolean;
  firstProductDiscountEnabled: boolean;
  firstProductDiscountPercent: number;
}

const DEFAULT_CONFIG: AppConfig = {
  appName: "Classify",
  appNameAr: i18next.t("admin.mobileApp.appNameDefault"),
  appVersion: "1.1",
  appBuildNumber: "1",
  appDescription: "Kids Educational & Family Guidance Platform",
  appDescriptionAr: "منصة تعليمية ممتعة للأطفال مع دعم عائلي ذكي",
  packageName: "com.classi_fy.twa",
  appIconUrl: "/icons/icon-512.png",

  apkEnabled: true,
  apkUrl: "/apps/classi-fy-app-latest.apk",
  apkSize: "2.6 MB",
  minAndroidVersion: "6.0",
  showHomeApkButton: true,
  showHomeAabButton: true,
  showHomePwaButton: true,
  homeAgeCardEnabled: true,
  homeAgeOptionOneText: "العمر من 6 إلى 12 سنة",
  homeAgeOptionTwoText: "العمر من 13 إلى 17 سنة",
  homeAgeOptionOneBg: "#ffffff",
  homeAgeOptionOneTextColor: "#5b21b6",
  homeAgeOptionTwoFrom: "#06b6d4",
  homeAgeOptionTwoTo: "#2563eb",
  homeAgeOptionTwoTextColor: "#ffffff",
  ageGateCardChildTitleAr: "رحلة تعلم ممتعة لطفلك",
  ageGateCardChildBodyAr: "أنشطة قصيرة وألعاب ذكية تنمّي التفكير والتركيز والثقة كل يوم.",
  ageGateCardChildTitleEn: "A joyful start for your child",
  ageGateCardChildBodyEn: "Short activities and smart games that grow focus, thinking, and confidence every day.",
  ageGateCardParentTitleAr: "ابدأ بخطوة بسيطة",
  ageGateCardParentBodyAr: "اربط حساب طفلك الآن وابدأ خطة واضحة لتنمية المهارات مع تقدم مشجّع.",
  ageGateCardParentTitleEn: "One simple step for parents",
  ageGateCardParentBodyEn: "Link your child's account and start a clear skill-building plan with encouraging progress moments.",
  ageGateIntroOverlayEnabled: true,
  ageGateIntroCards: [
    {
      id: "intro-child-default",
      titleAr: "رحلة تعلم ممتعة لطفلك",
      bodyAr: "أنشطة قصيرة وألعاب ذكية تنمّي التفكير والتركيز والثقة كل يوم.",
      titleEn: "A joyful start for your child",
      bodyEn: "Short activities and smart games that grow focus, thinking, and confidence every day.",
      imageUrl: "",
      enabled: true,
    },
    {
      id: "intro-parent-default",
      titleAr: "ابدأ بخطوة بسيطة",
      bodyAr: "اربط حساب طفلك الآن وابدأ خطة واضحة لتنمية المهارات مع تقدم مشجّع.",
      titleEn: "One simple step for parents",
      bodyEn: "Link your child's account and start a clear skill-building plan with encouraging progress moments.",
      imageUrl: "",
      enabled: true,
    },
  ],
  parentThresholdAge: 13,
  iosEnabled: false,
  iosUrl: "",
  appScreenshots: [
    "/screenshots/classify/classify-1.jpeg",
    "/screenshots/classify/classify-2.jpeg",
    "/screenshots/classify/classify-3.jpeg",
    "/screenshots/classify/classify-4.jpeg",
    "/screenshots/classify/classify-5.jpeg",
  ],

  storeShortDesc: "Safe kids learning app with family guidance",
  storeShortDescAr: "تعلم ممتع وآمن للأطفال مع دعم عائلي ذكي",
  storeFullDesc: "Classify helps families build healthy learning habits through interactive educational activities, rewards, and family guidance tools.\n\nKey features:\n• Child-safe educational activities\n• Task and reward motivation system\n• Family guidance with progress tracking\n• Structured learning routines with clear goals\n• Family-friendly experience in Arabic and English",
  storeFullDescAr: "يساعد Classify العائلات على بناء عادات تعلم صحية عبر أنشطة تعليمية تفاعلية، ونظام مكافآت، وأدوات دعم عائلي عملية.\n\nأهم المزايا:\n• أنشطة تعليمية آمنة للأطفال\n• نظام مهام ومكافآت للتحفيز\n• دعم عائلي ذكي مع تتبع التقدم\n• روتين تعلم منظم بأهداف واضحة\n• تجربة عائلية سهلة بالعربية والإنجليزية",
  playPromoText: "New seasonal activities and improved child progress insights.",
  playPromoTextAr: "أنشطة موسمية جديدة وتحسينات في تقارير تقدم الطفل.",
  appStoreSubtitle: "Kids learning with family guidance",
  appStoreKeywords: "kids learning,family guidance,education,tasks,rewards,children",
  appStorePromoText: "New educational challenges every week for better learning consistency.",
  storeCategory: "Education",
  storeContentRating: "Everyone",
  privacyPolicyUrl: "https://classi-fy.com/privacy",
  termsUrl: "https://classi-fy.com/terms",
  developerName: "Proomnes",
  developerEmail: "",
  developerWebsite: "https://classi-fy.com",

  appOgTitle: "Classify - تطبيق الدعم العائلي",
  appOgDescription: "تطبيق عربي للدعم العائلي يساعد الآباء في تنظيم تجربة التعلّم مع أطفالهم",
  appOgImage: "",
  appSchemaType: "MobileApplication",
  appKeywords: "family guidance, kids education, tasks, rewards, educational games",
  appKeywordsAr: "دعم عائلي, تطبيق أطفال, مهام, مكافآت, ألعاب تعليمية",
  deepLinksEnabled: true,
  assetlinksEnabled: true,
  appleSiteAssociationEnabled: false,

  pwaEnabled: true,
  pwaThemeColor: "#6B4D9D",
  pwaBackgroundColor: "#ffffff",
  pwaDisplayMode: "standalone",
  pwaStartUrl: "/",
  pwaName: "Classify",
  pwaShortName: "Classify",
};

export function MobileAppSettingsTab({ token }: { token: string }) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === "ar";

  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [apkVersion, setApkVersion] = useState("");
  const [apkBuildNumber, setApkBuildNumber] = useState("");
  const [apkNotes, setApkNotes] = useState("");
  const [activatingBuildId, setActivatingBuildId] = useState<string | null>(null);
  const [deletingBuildId, setDeletingBuildId] = useState<string | null>(null);
  const [trialPolicy, setTrialPolicy] = useState<TrialPolicyConfig>({
    trialExpiryDays: 7,
    explorePromptPercent: 30,
    purchaseIntentPromptEnabled: true,
    showSocialLoginButtons: true,
    firstProductDiscountEnabled: true,
    firstProductDiscountPercent: 15,
  });

  const parseResponseSafely = async (res: Response) => {
    const raw = await res.text();
    try {
      const json = JSON.parse(raw);
      return { json, raw };
    } catch {
      return { json: null as any, raw };
    }
  };

  const handleImageUpload = async (field: keyof AppConfig, file: File) => {
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-public-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");
      const data = json.data || json;
      // Use fullUrl for SEO fields, relative path for internal use
      const url = field === "appOgImage" ? data.fullUrl : data.url;
      handleChange(field, url);
      toast({ title: isRTL ? "تم رفع الصورة بنجاح" : "Image uploaded successfully" });
    } catch (err: any) {
      toast({ title: isRTL ? "فشل رفع الصورة" : "Image upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingField(null);
    }
  };

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["admin-app-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/app-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
  });

  const { data: apkBuildsData, isLoading: isLoadingBuilds } = useQuery<MobileApkBuildsState>({
    queryKey: ["admin-mobile-apk-builds"],
    queryFn: async () => {
      const res = await fetch("/api/admin/mobile-apk-builds", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch APK builds");
      const json = await res.json();
      return json?.data || { activeBuildId: null, builds: [] };
    },
    enabled: !!token,
  });

  const { data: trialPolicyData } = useQuery({
    queryKey: ["admin-trial-policy"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/trial-policy", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch trial policy settings");
      }
      const json = await res.json();
      return json?.data || null;
    },
    enabled: !!token,
  });

  const { data: agePolicyData } = useQuery({
    queryKey: ["admin-age-policy"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/age-policy", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch age policy settings");
      }
      const json = await res.json();
      return json?.data || null;
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (settingsData?.mobileApp) {
      const mobile = settingsData.mobileApp as Record<string, any>;
      const fallbackCards = [
        {
          id: "intro-child-fallback",
          titleAr: String(mobile.ageGateCardChildTitleAr || DEFAULT_CONFIG.ageGateCardChildTitleAr),
          bodyAr: String(mobile.ageGateCardChildBodyAr || DEFAULT_CONFIG.ageGateCardChildBodyAr),
          titleEn: String(mobile.ageGateCardChildTitleEn || DEFAULT_CONFIG.ageGateCardChildTitleEn),
          bodyEn: String(mobile.ageGateCardChildBodyEn || DEFAULT_CONFIG.ageGateCardChildBodyEn),
          imageUrl: "",
          enabled: true,
        },
        {
          id: "intro-parent-fallback",
          titleAr: String(mobile.ageGateCardParentTitleAr || DEFAULT_CONFIG.ageGateCardParentTitleAr),
          bodyAr: String(mobile.ageGateCardParentBodyAr || DEFAULT_CONFIG.ageGateCardParentBodyAr),
          titleEn: String(mobile.ageGateCardParentTitleEn || DEFAULT_CONFIG.ageGateCardParentTitleEn),
          bodyEn: String(mobile.ageGateCardParentBodyEn || DEFAULT_CONFIG.ageGateCardParentBodyEn),
          imageUrl: "",
          enabled: true,
        },
      ];

      const incomingCards = Array.isArray(mobile.ageGateIntroCards)
        ? mobile.ageGateIntroCards
          .map((card: any, index: number) => ({
            id: String(card?.id || `intro-card-${index + 1}`),
            titleAr: String(card?.titleAr || ""),
            bodyAr: String(card?.bodyAr || ""),
            titleEn: String(card?.titleEn || ""),
            bodyEn: String(card?.bodyEn || ""),
            imageUrl: String(card?.imageUrl || ""),
            enabled: card?.enabled !== false,
          }))
          .filter((card: any) => card.titleAr || card.bodyAr || card.titleEn || card.bodyEn)
        : [];

      setConfig((prev) => ({
        ...prev,
        ...mobile,
        ageGateIntroOverlayEnabled: mobile.ageGateIntroOverlayEnabled !== false,
        ageGateIntroCards: incomingCards.length > 0 ? incomingCards : fallbackCards,
      }));
    }
  }, [settingsData]);

  useEffect(() => {
    if (!agePolicyData) return;
    const threshold = Number(agePolicyData.parentThresholdAge);
    if (!Number.isFinite(threshold)) return;
    setConfig((prev) => ({
      ...prev,
      parentThresholdAge: Math.min(120, Math.max(1, Math.trunc(threshold))),
    }));
  }, [agePolicyData]);

  useEffect(() => {
    if (!trialPolicyData) return;
    setTrialPolicy({
      trialExpiryDays: Number(trialPolicyData.trialExpiryDays || 7),
      explorePromptPercent: Number(trialPolicyData.explorePromptPercent || 30),
      purchaseIntentPromptEnabled: typeof trialPolicyData.purchaseIntentPromptEnabled === "boolean"
        ? trialPolicyData.purchaseIntentPromptEnabled
        : true,
      showSocialLoginButtons: typeof trialPolicyData.showSocialLoginButtons === "boolean"
        ? trialPolicyData.showSocialLoginButtons
        : true,
      firstProductDiscountEnabled: Boolean(trialPolicyData.firstProductDiscountEnabled),
      firstProductDiscountPercent: Number(trialPolicyData.firstProductDiscountPercent || 15),
    });
  }, [trialPolicyData]);

  const saveMutation = useMutation({
    mutationFn: async (data: AppConfig) => {
      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mobileApp: data }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] });
    },
  });

  const saveTrialPolicyMutation = useMutation({
    mutationFn: async (data: TrialPolicyConfig) => {
      const res = await fetch("/api/admin/settings/trial-policy", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to save trial policy");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trial-policy"] });
    },
  });

  const saveAgePolicyMutation = useMutation({
    mutationFn: async (parentThresholdAge: number) => {
      const res = await fetch("/api/admin/settings/age-policy", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ parentThresholdAge }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to save age policy");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-mobile-app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-age-policy"] });
    },
  });

  const handleChange = (field: keyof AppConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateScreenshot = (index: number, value: string) => {
    setConfig((prev) => ({
      ...prev,
      appScreenshots: prev.appScreenshots.map((item, i) => (i === index ? value : item)),
    }));
  };

  const addScreenshot = () => {
    setConfig((prev) => {
      if (prev.appScreenshots.length >= 10) return prev;
      return { ...prev, appScreenshots: [...prev.appScreenshots, ""] };
    });
  };

  const removeScreenshot = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      appScreenshots: prev.appScreenshots.filter((_, i) => i !== index),
    }));
  };

  const moveScreenshot = (index: number, direction: -1 | 1) => {
    setConfig((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.appScreenshots.length) return prev;
      const next = [...prev.appScreenshots];
      const current = next[index];
      next[index] = next[target];
      next[target] = current;
      return { ...prev, appScreenshots: next };
    });
  };

  const handleScreenshotUpload = async (index: number, file: File) => {
    setUploadingField(`appScreenshots-${index}`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-public-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Upload failed");
      const data = json.data || {};
      updateScreenshot(index, data.url || "");
      toast({ title: isRTL ? "تم رفع لقطة التطبيق" : "Screenshot uploaded" });
    } catch (err: any) {
      toast({ title: isRTL ? "فشل رفع الصورة" : "Image upload failed", description: err?.message, variant: "destructive" });
    } finally {
      setUploadingField(null);
    }
  };

  const updateAgeGateCard = (index: number, patch: Partial<AppConfig["ageGateIntroCards"][number]>) => {
    setConfig((prev) => ({
      ...prev,
      ageGateIntroCards: prev.ageGateIntroCards.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const addAgeGateCard = () => {
    setConfig((prev) => ({
      ...prev,
      ageGateIntroCards: [
        ...prev.ageGateIntroCards,
        {
          id: `intro-card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          titleAr: "",
          bodyAr: "",
          titleEn: "",
          bodyEn: "",
          imageUrl: "",
          enabled: true,
        },
      ],
    }));
  };

  const removeAgeGateCard = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      ageGateIntroCards: prev.ageGateIntroCards.filter((_, i) => i !== index),
    }));
  };

  const moveAgeGateCard = (index: number, direction: -1 | 1) => {
    setConfig((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.ageGateIntroCards.length) return prev;
      const next = [...prev.ageGateIntroCards];
      const current = next[index];
      next[index] = next[target];
      next[target] = current;
      return { ...prev, ageGateIntroCards: next };
    });
  };

  const handleAgeGateCardImageUpload = async (index: number, file: File) => {
    setUploadingField(`ageGateIntroCards-${index}`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-public-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Upload failed");
      const data = json.data || {};
      updateAgeGateCard(index, { imageUrl: data.url || "" });
      toast({ title: isRTL ? "تم رفع صورة البطاقة" : "Card image uploaded" });
    } catch (err: any) {
      toast({
        title: isRTL ? "فشل رفع الصورة" : "Image upload failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async () => {
    try {
      await Promise.all([
        saveMutation.mutateAsync(config),
        saveAgePolicyMutation.mutateAsync(Number(config.parentThresholdAge || 13)),
        saveTrialPolicyMutation.mutateAsync(trialPolicy),
      ]);
      toast({ title: isRTL ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully" });
    } catch (error: any) {
      toast({
        title: isRTL ? "فشل في حفظ الإعدادات" : "Failed to save settings",
        description: error?.message,
        variant: "destructive",
      });
    }
  };

  const handleUploadApkVersion = async (file: File) => {
    if (!apkVersion.trim()) {
      toast({
        title: isRTL ? "أدخل رقم الإصدار أولاً" : "Enter version first",
        variant: "destructive",
      });
      return;
    }

    setUploadingField("apk-file");
    try {
      const formData = new FormData();
      formData.append("apkFile", file);
      formData.append("version", apkVersion.trim());
      formData.append("buildNumber", apkBuildNumber.trim());
      formData.append("notes", apkNotes.trim());
      formData.append("activateNow", "true");

      const res = await fetch("/api/admin/mobile-apk-builds/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const { json, raw } = await parseResponseSafely(res);
      if (!res.ok || !json?.success) {
        const message =
          json?.message ||
          (raw?.includes("Bad Gateway")
            ? (isRTL ? "فشل رفع الملف: مشكلة من الخادم الوسيط (Bad Gateway)" : "Upload failed: upstream proxy returned Bad Gateway")
            : raw?.slice(0, 200)) ||
          "Upload failed";
        throw new Error(message);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-mobile-apk-builds"] });
      queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] });
      setApkNotes("");
      toast({ title: isRTL ? "تم رفع النسخة وتفعيلها" : "Version uploaded and activated" });
    } catch (error: any) {
      toast({
        title: isRTL ? "فشل رفع النسخة" : "Failed to upload version",
        description: error?.message,
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
    }
  };

  const handleActivateBuild = async (buildId: string) => {
    setActivatingBuildId(buildId);
    try {
      const res = await fetch(`/api/admin/mobile-apk-builds/${buildId}/activate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-mobile-apk-builds"] });
      queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] });
      toast({ title: isRTL ? "تم تفعيل النسخة للتحميل" : "Version is now active for download" });
    } catch (error: any) {
      toast({
        title: isRTL ? "فشل تفعيل النسخة" : "Failed to activate version",
        description: error?.message,
        variant: "destructive",
      });
    } finally {
      setActivatingBuildId(null);
    }
  };

  const handleDeleteBuild = async (buildId: string) => {
    setDeletingBuildId(buildId);
    try {
      const res = await fetch(`/api/admin/mobile-apk-builds/${buildId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-mobile-apk-builds"] });
      queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] });
      toast({ title: isRTL ? "تم حذف النسخة" : "Version deleted" });
    } catch (error: any) {
      toast({
        title: isRTL ? "فشل حذف النسخة" : "Failed to delete version",
        description: error?.message,
        variant: "destructive",
      });
    } finally {
      setDeletingBuildId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="w-6 h-6" />
            {isRTL ? "إعدادات التطبيق" : "Mobile App Settings"}
          </h1>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {isRTL ? "إدارة إعدادات تطبيق الجوال والتحميل وبيانات المتجر" : "Manage mobile app, download, and store listing settings"}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending || saveTrialPolicyMutation.isPending || saveAgePolicyMutation.isPending}>
          <Save className="w-4 h-4 ml-2" />
          {(saveMutation.isPending || saveTrialPolicyMutation.isPending || saveAgePolicyMutation.isPending) ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic" className="flex items-center gap-1 text-xs">
            <Info className="w-4 h-4" />
            {isRTL ? "أساسي" : "Basic"}
          </TabsTrigger>
          <TabsTrigger value="download" className="flex items-center gap-1 text-xs">
            <Download className="w-4 h-4" />
            {isRTL ? "التحميل" : "Download"}
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-1 text-xs">
            <Globe className="w-4 h-4" />
            {isRTL ? "المتجر" : "Store"}
          </TabsTrigger>
          <TabsTrigger value="crawler" className="flex items-center gap-1 text-xs">
            <Bot className="w-4 h-4" />
            {isRTL ? "الزواحف" : "Crawlers"}
          </TabsTrigger>
          <TabsTrigger value="pwa" className="flex items-center gap-1 text-xs">
            <Palette className="w-4 h-4" />
            PWA
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                {isRTL ? "معلومات التطبيق الأساسية" : "Basic App Information"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "الاسم، الإصدار، الوصف، وأيقونة التطبيق" : "Name, version, description, and app icon"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم التطبيق (إنجليزي)" : "App Name (English)"}</Label>
                  <Input value={config.appName} onChange={(e) => handleChange("appName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم التطبيق (عربي)" : "App Name (Arabic)"}</Label>
                  <Input value={config.appNameAr} onChange={(e) => handleChange("appNameAr", e.target.value)} dir="rtl" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "رقم الإصدار" : "Version"}</Label>
                  <Input value={config.appVersion} onChange={(e) => handleChange("appVersion", e.target.value)} placeholder="1.1" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "رقم البناء" : "Build Number"}</Label>
                  <Input value={config.appBuildNumber} onChange={(e) => handleChange("appBuildNumber", e.target.value)} placeholder="1" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم الحزمة" : "Package Name"}</Label>
                  <Input value={config.packageName} onChange={(e) => handleChange("packageName", e.target.value)} placeholder="com.classi_fy.twa" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف التطبيق (إنجليزي)" : "App Description (English)"}</Label>
                  <Textarea value={config.appDescription} onChange={(e) => handleChange("appDescription", e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف التطبيق (عربي)" : "App Description (Arabic)"}</Label>
                  <Textarea value={config.appDescriptionAr} onChange={(e) => handleChange("appDescriptionAr", e.target.value)} rows={3} dir="rtl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "أيقونة التطبيق" : "App Icon"}</Label>
                <div className="flex items-center gap-3">
                  {config.appIconUrl ? (
                    <div className="relative group">
                      <img src={config.appIconUrl} alt="App Icon" className="h-16 w-16 rounded-xl border object-cover" />
                      <button
                        onClick={() => handleChange("appIconUrl", "")}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className={`h-16 w-16 rounded-xl border-2 border-dashed flex items-center justify-center ${isDark ? "border-gray-600" : "border-gray-300"}`}>
                      <Image className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingField === "appIconUrl"}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/png,image/jpeg,image/webp,image/svg+xml";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleImageUpload("appIconUrl", file);
                        };
                        input.click();
                      }}
                    >
                      {uploadingField === "appIconUrl" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {isRTL ? "رفع" : "Upload"}
                    </Button>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      {isRTL ? "يفضل 1024x1024 PNG مربعة — الرفع من الجهاز فقط" : "Preferably 1024x1024 square PNG - upload from device only"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Download Tab */}
        <TabsContent value="download" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                {isRTL ? "إعدادات التحميل" : "Download Settings"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "التحكم في روابط تحميل التطبيق على المنصات المختلفة" : "Control app download links for different platforms"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`p-4 rounded-xl border ${isDark ? "border-emerald-700/40 bg-emerald-900/10" : "border-emerald-200 bg-emerald-50/70"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      {isRTL ? "إدارة نسخ APK" : "APK Versions Manager"}
                    </p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {isRTL ? "ارفع نسخة جديدة، فعّل نسخة للزر، واحتفظ بسجل كامل للنسخ" : "Upload, activate download version, and keep full version history"}
                    </p>
                  </div>
                  {isLoadingBuilds ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <Input
                    value={apkVersion}
                    onChange={(e) => setApkVersion(e.target.value)}
                    placeholder={isRTL ? "رقم الإصدار (مثال 1.4.0)" : "Version (e.g. 1.4.0)"}
                  />
                  <Input
                    value={apkBuildNumber}
                    onChange={(e) => setApkBuildNumber(e.target.value)}
                    placeholder={isRTL ? "رقم البناء (اختياري)" : "Build number (optional)"}
                  />
                  <Input
                    value={apkNotes}
                    onChange={(e) => setApkNotes(e.target.value)}
                    placeholder={isRTL ? "ملاحظات النسخة (اختياري)" : "Release notes (optional)"}
                  />
                </div>

                <Button
                  type="button"
                  variant="default"
                  disabled={uploadingField === "apk-file"}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".apk,application/vnd.android.package-archive";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleUploadApkVersion(file);
                    };
                    input.click();
                  }}
                >
                  {uploadingField === "apk-file" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isRTL ? "رفع نسخة APK جديدة واستبدال النسخة النشطة" : "Upload new APK and replace active download"}
                </Button>

                <div className="mt-4 space-y-2">
                  {(apkBuildsData?.builds || []).length === 0 ? (
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {isRTL ? "لا توجد نسخ مرفوعة حتى الآن" : "No uploaded versions yet"}
                    </p>
                  ) : (
                    (apkBuildsData?.builds || []).map((build) => (
                      <div
                        key={build.id}
                        className={`rounded-lg border p-3 ${build.isActive ? (isDark ? "border-emerald-500 bg-emerald-900/10" : "border-emerald-300 bg-emerald-50") : (isDark ? "border-gray-700" : "border-gray-200")}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">
                            v{build.version}{build.buildNumber ? ` (${build.buildNumber})` : ""}
                          </p>
                          {build.isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500 text-white">
                              <CheckCircle2 className="w-3 h-3" />
                              {isRTL ? "النشطة للتحميل" : "Active download"}
                            </span>
                          ) : null}
                          <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{build.fileSizeLabel}</span>
                          <a
                            href={build.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs underline ms-auto"
                          >
                            {isRTL ? "فتح الملف" : "Open file"}
                          </a>
                        </div>

                        <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{build.fileName}</p>
                        {build.notes ? (
                          <p className={`text-xs mt-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{build.notes}</p>
                        ) : null}

                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={build.isActive ? "secondary" : "default"}
                            disabled={build.isActive || activatingBuildId === build.id}
                            onClick={() => handleActivateBuild(build.id)}
                          >
                            {activatingBuildId === build.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {isRTL ? "تفعيل للتحميل" : "Set as download version"}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={deletingBuildId === build.id}
                            onClick={() => handleDeleteBuild(build.id)}
                          >
                            {deletingBuildId === build.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            {isRTL ? "حذف" : "Delete"}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Android */}
              <div className={`p-4 rounded-xl border ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <p className="font-bold">Android APK</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {isRTL ? "تحميل مباشر لـ APK" : "Direct APK download"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={config.apkEnabled} onCheckedChange={(v) => handleChange("apkEnabled", v)} />
                </div>
                {config.apkEnabled && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "رابط APK" : "APK URL"}</Label>
                        <Input value={config.apkUrl} onChange={(e) => handleChange("apkUrl", e.target.value)} placeholder="/apps/classi-fy-app-latest.apk" dir="ltr" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "حجم الملف" : "File Size"}</Label>
                        <Input value={config.apkSize} onChange={(e) => handleChange("apkSize", e.target.value)} placeholder="6 MB" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{isRTL ? "أدنى إصدار اندرويد" : "Min Android Version"}</Label>
                      <Input value={config.minAndroidVersion} onChange={(e) => handleChange("minAndroidVersion", e.target.value)} placeholder="6.0" />
                    </div>
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                <p className="font-bold mb-3">{isRTL ? "أزرار التحميل في الصفحة الرئيسية" : "Home download buttons"}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">APK</span>
                    <Switch checked={config.showHomeApkButton} onCheckedChange={(v) => handleChange("showHomeApkButton", v)} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">Google Play AAB</span>
                    <Switch checked={config.showHomeAabButton} onCheckedChange={(v) => handleChange("showHomeAabButton", v)} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">PWA ZIP</span>
                    <Switch checked={config.showHomePwaButton} onCheckedChange={(v) => handleChange("showHomePwaButton", v)} />
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold">{isRTL ? "كارد اختيار العمر في الصفحة الرئيسية" : "Home age selection card"}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {isRTL ? "يظهر فقط للزائر بدون جلسة/كاش تسجيل محفوظ" : "Shown only for visitors without saved login/session cache"}
                    </p>
                  </div>
                  <Switch checked={config.homeAgeCardEnabled} onCheckedChange={(v) => handleChange("homeAgeCardEnabled", v)} />
                </div>

                {config.homeAgeCardEnabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "العمر الفاصل لولي الأمر" : "Parent threshold age"}</Label>
                        <Input
                          type="number"
                          min={1}
                          max={120}
                          value={String(config.parentThresholdAge ?? 13)}
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value, 10);
                            if (!Number.isFinite(value)) {
                              handleChange("parentThresholdAge", 13);
                              return;
                            }
                            handleChange("parentThresholdAge", Math.min(120, Math.max(1, value)));
                          }}
                        />
                        <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {isRTL
                            ? "إذا كان العمر أكبر من أو يساوي هذا الرقم يعتبر المستخدم ولي أمر، وإلا يعتبر طفل"
                            : "If age is greater than or equal to this value, user is treated as parent; otherwise child"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "نص الخيار الأول (بدون إجراء)" : "First option text (no action)"}</Label>
                        <Input
                          value={config.homeAgeOptionOneText}
                          onChange={(e) => handleChange("homeAgeOptionOneText", e.target.value)}
                          placeholder={isRTL ? "العمر من 6 إلى 12 سنة" : "Age 6 to 12"}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "نص الخيار الثاني (يفتح دخول ولي الأمر)" : "Second option text (opens parent login)"}</Label>
                        <Input
                          value={config.homeAgeOptionTwoText}
                          onChange={(e) => handleChange("homeAgeOptionTwoText", e.target.value)}
                          placeholder={isRTL ? "العمر من 13 إلى 17 سنة" : "Age 13 to 17"}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "خلفية الخيار الأول" : "First option background"}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={config.homeAgeOptionOneBg}
                            onChange={(e) => handleChange("homeAgeOptionOneBg", e.target.value)}
                            className="w-14 h-10 p-1"
                          />
                          <Input
                            value={config.homeAgeOptionOneBg}
                            onChange={(e) => handleChange("homeAgeOptionOneBg", e.target.value)}
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "لون نص الخيار الأول" : "First option text color"}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={config.homeAgeOptionOneTextColor}
                            onChange={(e) => handleChange("homeAgeOptionOneTextColor", e.target.value)}
                            className="w-14 h-10 p-1"
                          />
                          <Input
                            value={config.homeAgeOptionOneTextColor}
                            onChange={(e) => handleChange("homeAgeOptionOneTextColor", e.target.value)}
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "بداية تدرج الخيار الثاني" : "Second option gradient start"}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={config.homeAgeOptionTwoFrom}
                            onChange={(e) => handleChange("homeAgeOptionTwoFrom", e.target.value)}
                            className="w-14 h-10 p-1"
                          />
                          <Input
                            value={config.homeAgeOptionTwoFrom}
                            onChange={(e) => handleChange("homeAgeOptionTwoFrom", e.target.value)}
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "نهاية تدرج الخيار الثاني" : "Second option gradient end"}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={config.homeAgeOptionTwoTo}
                            onChange={(e) => handleChange("homeAgeOptionTwoTo", e.target.value)}
                            className="w-14 h-10 p-1"
                          />
                          <Input
                            value={config.homeAgeOptionTwoTo}
                            onChange={(e) => handleChange("homeAgeOptionTwoTo", e.target.value)}
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "لون نص الخيار الثاني" : "Second option text color"}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={config.homeAgeOptionTwoTextColor}
                            onChange={(e) => handleChange("homeAgeOptionTwoTextColor", e.target.value)}
                            className="w-14 h-10 p-1"
                          />
                          <Input
                            value={config.homeAgeOptionTwoTextColor}
                            onChange={(e) => handleChange("homeAgeOptionTwoTextColor", e.target.value)}
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-300/25 bg-cyan-500/5 p-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-sm">
                            {isRTL ? "البطاقات التعريفية العائمة الإلزامية" : "Mandatory floating intro cards"}
                          </p>
                          <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {isRTL
                              ? "تظهر في منتصف الشاشة فوق تصميم اختيار العمر، ويجب المرور بالتتالي حتى آخر بطاقة"
                              : "Shown in screen center above age design, and user must go sequentially until last card"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
                          <span className="text-xs font-semibold">{isRTL ? "تفعيل" : "Enabled"}</span>
                          <Switch
                            checked={config.ageGateIntroOverlayEnabled}
                            onCheckedChange={(v) => handleChange("ageGateIntroOverlayEnabled", v)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {isRTL ? `عدد البطاقات: ${config.ageGateIntroCards.length}` : `Cards count: ${config.ageGateIntroCards.length}`}
                        </p>
                        <Button type="button" size="sm" variant="outline" onClick={addAgeGateCard}>
                          <Plus className="w-4 h-4" />
                          {isRTL ? "إضافة بطاقة" : "Add card"}
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {config.ageGateIntroCards.map((card, index) => (
                          <div key={card.id} className={`rounded-lg border p-3 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                {isRTL ? `بطاقة ${index + 1}` : `Card ${index + 1}`}
                              </span>
                              <div className="ms-auto flex items-center gap-1">
                                <div className="flex items-center gap-1 rounded-md border px-2 py-1">
                                  <span className="text-[11px] font-semibold">{isRTL ? "مفعلة" : "Enabled"}</span>
                                  <Switch
                                    checked={card.enabled}
                                    onCheckedChange={(v) => updateAgeGateCard(index, { enabled: v })}
                                  />
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => moveAgeGateCard(index, -1)} disabled={index === 0}>
                                  <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => moveAgeGateCard(index, 1)} disabled={index === config.ageGateIntroCards.length - 1}>
                                  <ArrowDown className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeAgeGateCard(index)}
                                  disabled={config.ageGateIntroCards.length <= 1}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">{isRTL ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
                                <Input value={card.titleAr} onChange={(e) => updateAgeGateCard(index, { titleAr: e.target.value })} dir="rtl" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{isRTL ? "العنوان (English)" : "Title (English)"}</Label>
                                <Input value={card.titleEn} onChange={(e) => updateAgeGateCard(index, { titleEn: e.target.value })} dir="ltr" />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">{isRTL ? "النص (عربي)" : "Body (Arabic)"}</Label>
                                <Textarea value={card.bodyAr} onChange={(e) => updateAgeGateCard(index, { bodyAr: e.target.value })} rows={3} dir="rtl" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{isRTL ? "النص (English)" : "Body (English)"}</Label>
                                <Textarea value={card.bodyEn} onChange={(e) => updateAgeGateCard(index, { bodyEn: e.target.value })} rows={3} dir="ltr" />
                              </div>

                              <div className="space-y-1 md:col-span-2">
                                <Label className="text-xs">{isRTL ? "صورة البطاقة (اختياري)" : "Card image (optional)"}</Label>
                                <div className="space-y-2">
                                  {card.imageUrl ? (
                                    <div className="relative w-full h-24 rounded-lg overflow-hidden border">
                                      <img src={card.imageUrl} alt={`age-gate-card-${index + 1}`} className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => updateAgeGateCard(index, { imageUrl: "" })}
                                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/75"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className={`h-24 w-full rounded-lg border-2 border-dashed flex items-center justify-center ${isDark ? "border-gray-600 text-gray-500" : "border-gray-300 text-gray-400"}`}>
                                      <Image className="w-5 h-5" />
                                    </div>
                                  )}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={uploadingField === `ageGateIntroCards-${index}`}
                                    onClick={() => {
                                      const input = document.createElement("input");
                                      input.type = "file";
                                      input.accept = "image/png,image/jpeg,image/webp,image/gif";
                                      input.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) handleAgeGateCardImageUpload(index, file);
                                      };
                                      input.click();
                                    }}
                                  >
                                    {uploadingField === `ageGateIntroCards-${index}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    {isRTL ? "رفع" : "Upload"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* iOS */}
              <div className={`p-4 rounded-xl border ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-bold">{isRTL ? "سياسة الحساب التجريبي" : "Trial account policy"}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {isRTL ? "التحكم في وقت التحويل للتسجيل وخصم أول منتج" : "Control conversion timing and first-product discount"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{isRTL ? "انتهاء الفترة التجريبية (بالأيام)" : "Trial expiry (days)"}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={String(trialPolicy.trialExpiryDays)}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value, 10);
                        setTrialPolicy((prev) => ({
                          ...prev,
                          trialExpiryDays: Number.isFinite(value) ? Math.min(60, Math.max(1, value)) : 7,
                        }));
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">{isRTL ? "نسبة الاستكشاف قبل طلب التسجيل" : "Exploration percent before auth prompt"}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={String(trialPolicy.explorePromptPercent)}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value, 10);
                        setTrialPolicy((prev) => ({
                          ...prev,
                          explorePromptPercent: Number.isFinite(value) ? Math.min(100, Math.max(1, value)) : 30,
                        }));
                      }}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-sm font-medium">{isRTL ? "إظهار تسجيل الدخول الاجتماعي في نافذة الربط" : "Show social login in link prompt"}</span>
                      <Switch
                        checked={trialPolicy.showSocialLoginButtons}
                        onCheckedChange={(v) => setTrialPolicy((prev) => ({ ...prev, showSocialLoginButtons: v }))}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-sm font-medium">{isRTL ? "تفعيل محفز الشراء المباشر (بدون انتظار نسبة الاستكشاف)" : "Enable direct purchase-intent prompt"}</span>
                      <Switch
                        checked={trialPolicy.purchaseIntentPromptEnabled}
                        onCheckedChange={(v) => setTrialPolicy((prev) => ({ ...prev, purchaseIntentPromptEnabled: v }))}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-sm font-medium">{isRTL ? "تفعيل خصم أول منتج" : "Enable first-product discount"}</span>
                      <Switch
                        checked={trialPolicy.firstProductDiscountEnabled}
                        onCheckedChange={(v) => setTrialPolicy((prev) => ({ ...prev, firstProductDiscountEnabled: v }))}
                      />
                    </div>
                  </div>

                  {trialPolicy.firstProductDiscountEnabled && (
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">{isRTL ? "نسبة خصم أول منتج" : "First-product discount percent"}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        value={String(trialPolicy.firstProductDiscountPercent)}
                        onChange={(e) => {
                          const value = Number.parseInt(e.target.value, 10);
                          setTrialPolicy((prev) => ({
                            ...prev,
                            firstProductDiscountPercent: Number.isFinite(value) ? Math.min(90, Math.max(1, value)) : 15,
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍎</span>
                    <div>
                      <p className="font-bold">iOS (App Store)</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {isRTL ? "رابط متجر آبل" : "Apple App Store link"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={config.iosEnabled} onCheckedChange={(v) => handleChange("iosEnabled", v)} />
                </div>
                {config.iosEnabled && (
                  <div className="space-y-1">
                    <Label className="text-xs">{isRTL ? "رابط App Store" : "App Store URL"}</Label>
                    <Input value={config.iosUrl} onChange={(e) => handleChange("iosUrl", e.target.value)} placeholder="https://apps.apple.com/app/classify/id123456789" dir="ltr" />
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-bold">{isRTL ? "لقطات التطبيق" : "App Screenshots"}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {isRTL ? "تظهر في صفحة التحميل العامة" : "Displayed on the public download page"}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addScreenshot} disabled={config.appScreenshots.length >= 10}>
                    <Plus className="w-4 h-4" />
                    {isRTL ? "إضافة" : "Add"}
                  </Button>
                </div>

                <div className="space-y-3">
                  {config.appScreenshots.map((screenshot, index) => (
                    <div key={`app-screenshot-${index}`} className={`rounded-lg border p-3 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          {isRTL ? `لقطة ${index + 1}` : `Screenshot ${index + 1}`}
                        </span>
                        <div className="ms-auto flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => moveScreenshot(index, -1)} disabled={index === 0}>
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => moveScreenshot(index, 1)} disabled={index === config.appScreenshots.length - 1}>
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeScreenshot(index)} disabled={config.appScreenshots.length <= 1}>
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          value={screenshot}
                          onChange={(e) => updateScreenshot(index, e.target.value)}
                          placeholder="/uploads/public/screenshot-1.webp"
                          dir="ltr"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingField === `appScreenshots-${index}`}
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/png,image/jpeg,image/webp,image/gif";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) handleScreenshotUpload(index, file);
                            };
                            input.click();
                          }}
                        >
                          {uploadingField === `appScreenshots-${index}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {isRTL ? "رفع" : "Upload"}
                        </Button>
                      </div>

                      {screenshot && (
                        <img
                          src={screenshot}
                          alt={`screenshot-${index + 1}`}
                          className="mt-2 h-24 w-20 rounded-md object-cover border"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Listing Tab */}
        <TabsContent value="store" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {isRTL ? "بيانات المتجر" : "Store Listing"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "المعلومات المعروضة في متاجر التطبيقات" : "Information displayed on app stores"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف قصير (80 حرف)" : "Short Description (80 chars)"}</Label>
                  <Input value={config.storeShortDesc} onChange={(e) => handleChange("storeShortDesc", e.target.value)} maxLength={80} />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.storeShortDesc.length}/80</p>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف قصير - عربي" : "Short Desc (Arabic)"}</Label>
                  <Input value={config.storeShortDescAr} onChange={(e) => handleChange("storeShortDescAr", e.target.value)} maxLength={80} dir="rtl" />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.storeShortDescAr.length}/80</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف كامل" : "Full Description"}</Label>
                  <Textarea value={config.storeFullDesc} onChange={(e) => handleChange("storeFullDesc", e.target.value)} rows={5} maxLength={4000} />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.storeFullDesc.length}/4000</p>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف كامل - عربي" : "Full Desc (Arabic)"}</Label>
                  <Textarea value={config.storeFullDescAr} onChange={(e) => handleChange("storeFullDescAr", e.target.value)} rows={5} maxLength={4000} dir="rtl" />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.storeFullDescAr.length}/4000</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "نص ترويجي Google Play" : "Google Play Promo Text"}</Label>
                  <Input
                    value={config.playPromoText}
                    onChange={(e) => handleChange("playPromoText", e.target.value)}
                    maxLength={170}
                  />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.playPromoText.length}/170</p>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "نص ترويجي Google Play (عربي)" : "Google Play Promo Text (Arabic)"}</Label>
                  <Input
                    value={config.playPromoTextAr}
                    onChange={(e) => handleChange("playPromoTextAr", e.target.value)}
                    maxLength={170}
                    dir="rtl"
                  />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.playPromoTextAr.length}/170</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "العنوان الفرعي App Store" : "App Store Subtitle"}</Label>
                  <Input
                    value={config.appStoreSubtitle}
                    onChange={(e) => handleChange("appStoreSubtitle", e.target.value)}
                    maxLength={30}
                  />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.appStoreSubtitle.length}/30</p>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "كلمات App Store" : "App Store Keywords"}</Label>
                  <Input
                    value={config.appStoreKeywords}
                    onChange={(e) => handleChange("appStoreKeywords", e.target.value)}
                    maxLength={100}
                    dir="ltr"
                  />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.appStoreKeywords.length}/100</p>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "النص الترويجي App Store" : "App Store Promo Text"}</Label>
                  <Input
                    value={config.appStorePromoText}
                    onChange={(e) => handleChange("appStorePromoText", e.target.value)}
                    maxLength={170}
                  />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.appStorePromoText.length}/170</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "تصنيف التطبيق" : "Category"}</Label>
                  <Select value={config.storeCategory} onValueChange={(v) => handleChange("storeCategory", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Parenting">Parenting</SelectItem>
                      <SelectItem value="Productivity">Productivity</SelectItem>
                      <SelectItem value="Tools">Tools</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "تصنيف المحتوى" : "Content Rating"}</Label>
                  <Select value={config.storeContentRating} onValueChange={(v) => handleChange("storeContentRating", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Everyone">Everyone</SelectItem>
                      <SelectItem value="Everyone 10+">Everyone 10+</SelectItem>
                      <SelectItem value="Teen">Teen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "بيانات المطور" : "Developer Info"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم المطور" : "Developer Name"}</Label>
                  <Input value={config.developerName} onChange={(e) => handleChange("developerName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "بريد المطور" : "Developer Email"}</Label>
                  <Input value={config.developerEmail} onChange={(e) => handleChange("developerEmail", e.target.value)} type="email" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "موقع المطور" : "Developer Website"}</Label>
                  <Input value={config.developerWebsite} onChange={(e) => handleChange("developerWebsite", e.target.value)} dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "رابط سياسة الخصوصية" : "Privacy Policy URL"}</Label>
                  <Input value={config.privacyPolicyUrl} onChange={(e) => handleChange("privacyPolicyUrl", e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "رابط شروط الاستخدام" : "Terms URL"}</Label>
                  <Input value={config.termsUrl} onChange={(e) => handleChange("termsUrl", e.target.value)} dir="ltr" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Crawler / SEO Tab */}
        <TabsContent value="crawler" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                {isRTL ? "بيانات الزواحف وتحسين الظهور" : "Crawler & SEO Data"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "إعدادات Open Graph و Schema.org الخاصة بصفحة التطبيق" : "Open Graph and Schema.org settings for the app page"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>OG Title</Label>
                  <Input value={config.appOgTitle} onChange={(e) => handleChange("appOgTitle", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>OG Image</Label>
                  <div className="flex items-center gap-3">
                    {config.appOgImage ? (
                      <div className="relative group">
                        <img src={config.appOgImage} alt="OG" className="h-14 w-24 rounded-lg border object-cover" />
                        <button
                          onClick={() => handleChange("appOgImage", "")}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className={`h-14 w-24 rounded-lg border-2 border-dashed flex items-center justify-center ${isDark ? "border-gray-600" : "border-gray-300"}`}>
                        <Image className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingField === "appOgImage"}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/png,image/jpeg,image/webp";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleImageUpload("appOgImage", file);
                          };
                          input.click();
                        }}
                      >
                        {uploadingField === "appOgImage" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isRTL ? "رفع" : "Upload"}
                      </Button>
                      <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        {isRTL ? "يفضل 1200x630 — الرفع المحلي فقط" : "Recommended 1200x630 - upload from device only"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>OG Description</Label>
                <Textarea value={config.appOgDescription} onChange={(e) => handleChange("appOgDescription", e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "كلمات مفتاحية (إنجليزي)" : "Keywords (English)"}</Label>
                  <Input value={config.appKeywords} onChange={(e) => handleChange("appKeywords", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "كلمات مفتاحية (عربي)" : "Keywords (Arabic)"}</Label>
                  <Input value={config.appKeywordsAr} onChange={(e) => handleChange("appKeywordsAr", e.target.value)} dir="rtl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Schema.org Type</Label>
                <Select value={config.appSchemaType} onValueChange={(v) => handleChange("appSchemaType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MobileApplication">MobileApplication</SelectItem>
                    <SelectItem value="SoftwareApplication">SoftwareApplication</SelectItem>
                    <SelectItem value="WebApplication">WebApplication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {isRTL ? "الروابط العميقة والتحقق" : "Deep Links & Verification"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Deep Links</Label>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Android App Links</p>
                  </div>
                  <Switch checked={config.deepLinksEnabled} onCheckedChange={(v) => handleChange("deepLinksEnabled", v)} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>assetlinks.json</Label>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Android Digital Asset Links</p>
                  </div>
                  <Switch checked={config.assetlinksEnabled} onCheckedChange={(v) => handleChange("assetlinksEnabled", v)} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Apple Site Association</Label>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>iOS Universal Links</p>
                  </div>
                  <Switch checked={config.appleSiteAssociationEnabled} onCheckedChange={(v) => handleChange("appleSiteAssociationEnabled", v)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PWA Tab */}
        <TabsContent value="pwa" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                {isRTL ? "إعدادات التطبيق التقدمي (PWA)" : "Progressive Web App (PWA)"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "إعدادات التثبيت عبر المتصفح" : "Browser install settings"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg mb-4">
                <div>
                  <Label>{isRTL ? "تفعيل PWA" : "Enable PWA"}</Label>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {isRTL ? "يسمح بتثبيت التطبيق من المتصفح" : "Allows installing the app from browser"}
                  </p>
                </div>
                <Switch checked={config.pwaEnabled} onCheckedChange={(v) => handleChange("pwaEnabled", v)} />
              </div>

              {config.pwaEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PWA Name</Label>
                      <Input value={config.pwaName} onChange={(e) => handleChange("pwaName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>PWA Short Name</Label>
                      <Input value={config.pwaShortName} onChange={(e) => handleChange("pwaShortName", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{isRTL ? "لون الثيم" : "Theme Color"}</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={config.pwaThemeColor} onChange={(e) => handleChange("pwaThemeColor", e.target.value)} className="w-14 h-10 p-1" />
                        <Input value={config.pwaThemeColor} onChange={(e) => handleChange("pwaThemeColor", e.target.value)} className="flex-1" dir="ltr" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? "لون الخلفية" : "Background Color"}</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={config.pwaBackgroundColor} onChange={(e) => handleChange("pwaBackgroundColor", e.target.value)} className="w-14 h-10 p-1" />
                        <Input value={config.pwaBackgroundColor} onChange={(e) => handleChange("pwaBackgroundColor", e.target.value)} className="flex-1" dir="ltr" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? "وضع العرض" : "Display Mode"}</Label>
                      <Select value={config.pwaDisplayMode} onValueChange={(v) => handleChange("pwaDisplayMode", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standalone">Standalone</SelectItem>
                          <SelectItem value="fullscreen">Fullscreen</SelectItem>
                          <SelectItem value="minimal-ui">Minimal UI</SelectItem>
                          <SelectItem value="browser">Browser</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "رابط البداية" : "Start URL"}</Label>
                    <Input value={config.pwaStartUrl} onChange={(e) => handleChange("pwaStartUrl", e.target.value)} placeholder="/" dir="ltr" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
