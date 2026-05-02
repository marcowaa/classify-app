import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Megaphone,
  Eye,
  MousePointer,
  Users,
  Baby,
  Calendar,
  Link2,
  Image,
  Upload,
  BarChart3,
  ArrowUpDown,
  Globe,
  X,
  Copy,
  ExternalLink,
  TrendingUp,
  Clock,
  Send,
} from "lucide-react";

interface Ad {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  targetAudience: string;
  priority: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  viewCount: number;
  clickCount: number;
  createdAt: string;
}

interface StoreProductOption {
  id: string;
  name: string;
  nameAr?: string | null;
  price: string;
  originalPrice?: string | null;
}

interface AdsAnalyticsAudienceRow {
  audience: string;
  adsCount: number;
  views: number;
  clicks: number;
  ctrPercent: number;
  estimatedConversions: number;
}

interface AdsAnalyticsProductRow {
  productId: string;
  productName: string;
  campaignAds: number;
  estimatedConversions: number;
  estimatedUnits: number;
  estimatedRevenue: number;
}

interface AdsAnalyticsData {
  totals: {
    adsCount: number;
    totalViews: number;
    totalClicks: number;
    totalEstimatedConversions: number;
    ctrPercent: number;
  };
  rangeDays: number;
  windowStart: string;
  byAudience: AdsAnalyticsAudienceRow[];
  topCampaignProducts: AdsAnalyticsProductRow[];
}

type CampaignDeliveryStrength = "quiet" | "popup" | "strong";
type CampaignFilterMode = "all" | "campaign" | "general";

const getDeliveryStrengthLabel = (strength: CampaignDeliveryStrength): string => {
  if (strength === "strong") return "قوي (منبثق + Push + صوت)";
  if (strength === "popup") return "منبثق (Toast + Push)";
  return "هادئ (داخل التطبيق فقط)";
};

const resolveDeliveryStrengthFromPriority = (priority: number): CampaignDeliveryStrength => {
  if (priority >= 8) return "strong";
  if (priority >= 4) return "popup";
  return "quiet";
};

export function AdsTab({
  token }: { token: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [previewImage, setPreviewImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sortBy, setSortBy] = useState<"priority" | "views" | "clicks" | "date">("date");
  const [filterAudience, setFilterAudience] = useState<string>("all-filter");
  const [campaignFilterMode, setCampaignFilterMode] = useState<CampaignFilterMode>("all");
  const [campaignProductId, setCampaignProductId] = useState<string>("");
  const [campaignDiscountPercent, setCampaignDiscountPercent] = useState<number>(15);
  const [testSampleSize, setTestSampleSize] = useState<number>(5);
  const [analyticsRangeDays, setAnalyticsRangeDays] = useState<number>(30);
  const [form, setForm] = useState({
    title: "",
    content: "",
    imageUrl: "",
    linkUrl: "",
    targetAudience: "all",
    priority: 0,
    isActive: true,
    startDate: "",
    endDate: "",
  });

  const audienceOptions = useMemo(() => ([
    { value: "all", label: t("admin.ads.all"), icon: Globe, color: "bg-purple-500", description: "يظهر لجميع المستخدمين" },
    { value: "parents", label: t("admin.ads.parentsOnly"), icon: Users, color: "bg-blue-500", description: "يظهر للآباء فقط" },
    { value: "children", label: t("admin.ads.childrenOnly"), icon: Baby, color: "bg-pink-500", description: "يظهر للأطفال فقط" },
  ]), [t]);

  const priorityPresets = useMemo(() => ([
    { value: 0, label: t("admin.ads.normal"), color: "text-gray-500" },
    { value: 5, label: t("admin.ads.high"), color: "text-amber-500" },
    { value: 10, label: t("admin.ads.urgent"), color: "text-red-500" },
  ]), [t]);

  const { data: ads, isLoading } = useQuery<Ad[]>({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data || [];
    },
  });

  const { data: analyticsData } = useQuery<AdsAnalyticsData | null>({
    queryKey: ["admin-ads-analytics", analyticsRangeDays],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ads/analytics?rangeDays=${analyticsRangeDays}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || null;
    },
    enabled: !!token,
  });

  const { data: productsData = [] } = useQuery<StoreProductOption[]>({
    queryKey: ["admin-products-for-ads"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      return rows.filter((p: any) => !p?.parentId && p?.isActive !== false);
    },
    enabled: !!token,
  });

  const buildCampaignLink = (productId: string, discountPercent: number, audience: string, adId?: string): string => {
    const targetPath = audience === "children" ? "/child-store" : "/parent-store";
    const params = new URLSearchParams();
    params.set("promoProductId", productId);
    params.set("promoDiscount", String(Math.min(90, Math.max(1, Math.trunc(discountPercent || 0)))));
    if (adId) {
      params.set("promoAdId", adId);
    }
    return `${targetPath}?${params.toString()}`;
  };

  const parseCampaignLinkInfo = (linkUrl: string | null | undefined): {
    isCampaign: boolean;
    promoProductId: string;
    promoAdId: string;
    targetPath: string;
  } => {
    const raw = String(linkUrl || "").trim();
    if (!raw) {
      return { isCampaign: false, promoProductId: "", promoAdId: "", targetPath: "" };
    }

    try {
      const parsed = raw.startsWith("/")
        ? new URL(raw, window.location.origin)
        : new URL(raw);
      const promoProductId = String(parsed.searchParams.get("promoProductId") || "").trim();
      const promoAdId = String(parsed.searchParams.get("promoAdId") || "").trim();
      return {
        isCampaign: promoProductId.length > 0,
        promoProductId,
        promoAdId,
        targetPath: `${parsed.pathname}${parsed.search}${parsed.hash}`,
      };
    } catch {
      return { isCampaign: false, promoProductId: "", promoAdId: "", targetPath: "" };
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...data,
          imageUrl: data.imageUrl || null,
          linkUrl: data.linkUrl || null,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل إنشاء الإعلان");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ads-analytics"] });
      resetForm();
      toast({ title: "تم إنشاء الإعلان بنجاح ✅" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في إنشاء الإعلان", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof form }) => {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...data,
          imageUrl: data.imageUrl || null,
          linkUrl: data.linkUrl || null,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل تحديث الإعلان");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ads-analytics"] });
      resetForm();
      toast({ title: "تم تحديث الإعلان بنجاح ✅" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في تحديث الإعلان", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل حذف الإعلان");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ads-analytics"] });
      toast({ title: "تم حذف الإعلان بنجاح 🗑️" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في حذف الإعلان", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/ads/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل تبديل الحالة");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ads-analytics"] });
      toast({ title: "تم تبديل حالة الإعلان ✅" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في تبديل الحالة", description: err.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (ad: Ad) => {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: ad.title + " (نسخة)",
          content: ad.content,
          imageUrl: ad.imageUrl,
          linkUrl: ad.linkUrl,
          targetAudience: ad.targetAudience,
          priority: ad.priority,
          isActive: false,
          startDate: ad.startDate,
          endDate: ad.endDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل نسخ الإعلان");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ads-analytics"] });
      toast({ title: "تم نسخ الإعلان بنجاح 📋" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في نسخ الإعلان", description: err.message, variant: "destructive" });
    },
  });

  const testSendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/ads/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          imageUrl: form.imageUrl || null,
          linkUrl: form.linkUrl || null,
          targetAudience: form.targetAudience || "all",
          sampleSize: Math.min(20, Math.max(1, Math.trunc(testSampleSize || 5))),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل الإرسال التجريبي");
      return json?.data || {};
    },
    onSuccess: (data: any) => {
      const sentParents = Number(data?.sentParents || 0);
      const sentChildren = Number(data?.sentChildren || 0);
      const deliveryStrength = String(data?.deliveryStrength || resolveDeliveryStrengthFromPriority(form.priority || 0)) as CampaignDeliveryStrength;
      toast({
        title: "تم الإرسال التجريبي ✅",
        description: `تم إرسال ${sentParents} إشعارًا للآباء و ${sentChildren} إشعارًا للأطفال (${getDeliveryStrengthLabel(deliveryStrength)}).`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في الإرسال التجريبي", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowModal(false);
    setEditingAd(null);
    setPreviewImage(false);
    setUploadingImage(false);
    setCampaignProductId("");
    setCampaignDiscountPercent(15);
    setTestSampleSize(5);
    setForm({
      title: "",
      content: "",
      imageUrl: "",
      linkUrl: "",
      targetAudience: "all",
      priority: 0,
      isActive: true,
      startDate: "",
      endDate: "",
    });
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-public-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل رفع الصورة");
      const data = json.data || json;
      setForm((prev) => ({ ...prev, imageUrl: data.fullUrl || data.url }));
      setPreviewImage(true);
      toast({ title: "تم رفع الصورة بنجاح ✅" });
    } catch (err: any) {
      toast({ title: "فشل رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const openEdit = (ad: Ad) => {
    let nextCampaignProductId = "";
    let nextCampaignDiscount = 15;
    try {
      const rawLink = String(ad.linkUrl || "").trim();
      if (rawLink) {
        const parsed = rawLink.startsWith("/")
          ? new URL(rawLink, window.location.origin)
          : new URL(rawLink);
        nextCampaignProductId = parsed.searchParams.get("promoProductId") || "";
        const promoRaw = Number(parsed.searchParams.get("promoDiscount") || "15");
        if (Number.isFinite(promoRaw)) {
          nextCampaignDiscount = Math.min(90, Math.max(1, Math.trunc(promoRaw)));
        }
      }
    } catch {
      nextCampaignProductId = "";
      nextCampaignDiscount = 15;
    }

    setCampaignProductId(nextCampaignProductId);
    setCampaignDiscountPercent(nextCampaignDiscount);
    setEditingAd(ad);
    setForm({
      title: ad.title,
      content: ad.content,
      imageUrl: ad.imageUrl || "",
      linkUrl: ad.linkUrl || "",
      targetAudience: ad.targetAudience,
      priority: ad.priority,
      isActive: ad.isActive,
      startDate: ad.startDate ? ad.startDate.split("T")[0] : "",
      endDate: ad.endDate ? ad.endDate.split("T")[0] : "",
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editingAd) {
      updateMutation.mutate({ id: editingAd.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  // Stats
  const adsList = ads || [];
  const totalViews = adsList.reduce((s, a) => s + a.viewCount, 0);
  const totalClicks = adsList.reduce((s, a) => s + a.clickCount, 0);
  const activeCount = adsList.filter((a) => a.isActive).length;
  const avgCTR = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0";

  // Sorting & filtering
  let filteredAds = filterAudience === "all-filter" ? adsList : adsList.filter((a) => a.targetAudience === filterAudience);
  filteredAds = filteredAds.filter((a) => {
    if (campaignFilterMode === "all") return true;
    const campaignInfo = parseCampaignLinkInfo(a.linkUrl);
    if (campaignFilterMode === "campaign") return campaignInfo.isCampaign;
    return !campaignInfo.isCampaign;
  });
  filteredAds = [...filteredAds].sort((a, b) => {
    switch (sortBy) {
      case "priority": return b.priority - a.priority;
      case "views": return b.viewCount - a.viewCount;
      case "clicks": return b.clickCount - a.clickCount;
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const getAudienceBadge = (audience: string) => {
    const opt = audienceOptions.find((o) => o.value === audience) || audienceOptions[0];
    const Icon = opt.icon;
    return (
      <Badge className={`${opt.color} text-white gap-1`}>
        <Icon className="h-3 w-3" />
        {opt.label}
      </Badge>
    );
  };

  const getStatusInfo = (ad: Ad) => {
    const now = new Date();
    if (!ad.isActive) return { label: "متوقف", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
    if (ad.startDate && new Date(ad.startDate) > now) return { label: "مجدول", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    if (ad.endDate && new Date(ad.endDate) < now) return { label: "منتهي", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    return { label: "نشط", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  };

  const selectedCampaignProduct = productsData.find((p) => p.id === campaignProductId) || null;
  const selectedDeliveryStrength = resolveDeliveryStrengthFromPriority(form.priority || 0);
  const generatedCampaignPath = useMemo(() => {
    if (!campaignProductId) return "";
    return buildCampaignLink(campaignProductId, campaignDiscountPercent, form.targetAudience, editingAd?.id);
  }, [campaignProductId, campaignDiscountPercent, form.targetAudience, editingAd?.id]);
  const campaignPreviewLink = useMemo(() => {
    const raw = String(form.linkUrl || "").trim();
    if (raw) return raw;
    return generatedCampaignPath;
  }, [form.linkUrl, generatedCampaignPath]);
  const campaignPreviewInfo = useMemo(() => parseCampaignLinkInfo(campaignPreviewLink), [campaignPreviewLink]);
  const finalCustomerPreviewUrl = useMemo(() => {
    if (!campaignPreviewLink) return "";
    return campaignPreviewLink.startsWith("/")
      ? `${window.location.origin}${campaignPreviewLink}`
      : campaignPreviewLink;
  }, [campaignPreviewLink]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-amber-500" />
            إدارة الإعلانات
          </h2>
          <p className="text-sm text-muted-foreground mt-1">إدارة الإعلانات المعروضة للمستخدمين في التطبيق</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" data-testid="button-add-ad">
          <Plus className="h-4 w-4" />
          إعلان جديد
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <Megaphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    مستوى الإرسال الحالي: {getDeliveryStrengthLabel(selectedDeliveryStrength)}
                  </p>
                <p className="text-2xl font-bold">{adsList.length}</p>
                <p className="text-xs text-muted-foreground">إجمالي الإعلانات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">إعلانات نشطة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">إجمالي المشاهدات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <MousePointer className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analyticsData?.totals?.ctrPercent ?? avgCTR}%</p>
                <p className="text-xs text-muted-foreground">معدل النقر CTR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {analyticsData && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base">تحويلات حسب الجمهور</CardTitle>
                <div className="flex items-center gap-1">
                  {[1, 7, 30, 90].map((days) => (
                    <Button
                      key={days}
                      size="sm"
                      variant={analyticsRangeDays === days ? "default" : "outline"}
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setAnalyticsRangeDays(days)}
                    >
                      {days}d
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[11px] text-muted-foreground">
                آخر {analyticsData.rangeDays} يوم
              </p>
              {analyticsData.byAudience.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا تتوفر بيانات كافية حتى الآن.</p>
              ) : (
                analyticsData.byAudience.map((row) => (
                  <div key={row.audience} className="rounded-lg border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getAudienceBadge(row.audience)}
                        <span className="text-xs text-muted-foreground">{row.adsCount} حملة</span>
                      </div>
                      <span className="text-sm font-semibold">{row.estimatedConversions} تحويل</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-3">
                      <span>{row.views.toLocaleString()} مشاهدة</span>
                      <span>{row.clicks.toLocaleString()} نقرة</span>
                      <span>CTR {row.ctrPercent}%</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">أفضل المنتجات تحويلًا</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analyticsData.topCampaignProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">اربط إعلانًا بمنتج ليظهر هنا.</p>
              ) : (
                analyticsData.topCampaignProducts.map((row) => (
                  <div key={row.productId} className="rounded-lg border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{row.productName}</p>
                      <Badge variant="outline">{row.estimatedConversions} تحويل</Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-3">
                      <span>{row.campaignAds} حملة</span>
                      <span>{row.estimatedUnits} وحدة</span>
                      <span>{row.estimatedRevenue.toLocaleString()} إيراد</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toolbar: Sort & Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">ترتيب:</span>
        {([
          { key: "date", label: "الأحدث", icon: Clock },
          { key: "priority", label: "الأولوية", icon: ArrowUpDown },
          { key: "views", label: "المشاهدات", icon: Eye },
          { key: "clicks", label: "النقرات", icon: MousePointer },
        ] as const).map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={sortBy === s.key ? "default" : "outline"}
            className="gap-1 h-8 text-xs"
            onClick={() => setSortBy(s.key)}
          >
            <s.icon className="h-3 w-3" />
            {s.label}
          </Button>
        ))}
        <span className="text-sm text-muted-foreground mr-4">| فلتر:</span>
        <Button
          size="sm"
          variant={filterAudience === "all-filter" ? "default" : "outline"}
          className="h-8 text-xs"
          onClick={() => setFilterAudience("all-filter")}
        >
          الكل
        </Button>
        {audienceOptions.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            variant={filterAudience === opt.value ? "default" : "outline"}
            className="h-8 text-xs gap-1"
            onClick={() => setFilterAudience(opt.value)}
          >
            <opt.icon className="h-3 w-3" />
            {opt.label}
          </Button>
        ))}
        <span className="text-sm text-muted-foreground mr-4">| نوع المحتوى:</span>
        <Button
          size="sm"
          variant={campaignFilterMode === "all" ? "default" : "outline"}
          className="h-8 text-xs"
          onClick={() => setCampaignFilterMode("all")}
        >
          الكل
        </Button>
        <Button
          size="sm"
          variant={campaignFilterMode === "campaign" ? "default" : "outline"}
          className="h-8 text-xs"
          onClick={() => setCampaignFilterMode("campaign")}
        >
          حملات منتجات
        </Button>
        <Button
          size="sm"
          variant={campaignFilterMode === "general" ? "default" : "outline"}
          className="h-8 text-xs"
          onClick={() => setCampaignFilterMode("general")}
        >
          إعلانات عامة
        </Button>
      </div>

      {/* Ads List */}
      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : filteredAds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">لا توجد إعلانات بعد</p>
            <p className="text-sm text-muted-foreground mb-4">أضف إعلانك الأول ليظهر للمستخدمين</p>
            <Button onClick={() => setShowModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة أول إعلان
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAds.map((ad) => {
            const status = getStatusInfo(ad);
            const ctr = ad.viewCount > 0 ? ((ad.clickCount / ad.viewCount) * 100).toFixed(1) : "0";
            const campaignInfo = parseCampaignLinkInfo(ad.linkUrl);
            return (
              <Card key={ad.id} className={`transition-all ${!ad.isActive ? "opacity-60 hover:opacity-80" : "hover:shadow-md"}`}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex gap-4">
                    {/* Image thumbnail */}
                    {ad.imageUrl && (
                      <div className="shrink-0">
                        <img
                          src={ad.imageUrl}
                          alt={ad.title}
                          className="w-24 h-16 sm:w-32 sm:h-20 object-cover rounded-lg ring-1 ring-gray-200 dark:ring-gray-700"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = "none";
                            if (img.parentElement) {
                              img.parentElement.innerHTML = '<div class="w-24 h-16 sm:w-32 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><span class="text-gray-400 text-xs">صورة غير متاحة</span></div>';
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h3 className="font-bold text-base truncate">{ad.title}</h3>
                            {getAudienceBadge(ad.targetAudience)}
                            {campaignInfo.isCampaign ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                حملة منتج
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                إعلان عام
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                            {ad.priority > 0 && (
                              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-1.5 py-0.5 rounded">
                                ⬆ أولوية {ad.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{ad.content}</p>

                          {/* Stats row */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              {ad.viewCount.toLocaleString()} مشاهدة
                            </span>
                            <span className="flex items-center gap-1">
                              <MousePointer className="h-3.5 w-3.5" />
                              {ad.clickCount.toLocaleString()} نقرة
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3.5 w-3.5" />
                              CTR: {ctr}%
                            </span>
                            {ad.linkUrl && (
                              <a href={/^https?:\/\//i.test(ad.linkUrl) ? ad.linkUrl : `https://${ad.linkUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                                <ExternalLink className="h-3 w-3" />
                                رابط
                              </a>
                            )}
                            {(ad.startDate || ad.endDate) && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {ad.startDate ? new Date(ad.startDate).toLocaleDateString("ar") : "∞"}
                                {" → "}
                                {ad.endDate ? new Date(ad.endDate).toLocaleDateString("ar") : "∞"}
                              </span>
                            )}
                            {campaignInfo.isCampaign && campaignInfo.targetPath && (
                              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-300" dir="ltr">
                                <Link2 className="h-3.5 w-3.5" />
                                {campaignInfo.targetPath}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={ad.isActive}
                            onCheckedChange={() => toggleMutation.mutate(ad.id)}
                            data-testid={`switch-ad-${ad.id}`}
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(ad)} title="تعديل" data-testid={`button-edit-ad-${ad.id}`}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateMutation.mutate(ad)} title="نسخ" data-testid={`button-duplicate-ad-${ad.id}`}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذا الإعلان؟")) {
                                deleteMutation.mutate(ad.id);
                              }
                            }}
                            title="حذف"
                            data-testid={`button-delete-ad-${ad.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== Create/Edit Modal ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-amber-500" />
                  {editingAd ? "تعديل الإعلان" : "إنشاء إعلان جديد"}
                </CardTitle>
                <Button size="icon" variant="ghost" onClick={resetForm} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {/* Title */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <Megaphone className="h-3.5 w-3.5 text-amber-500" />
                  عنوان الإعلان <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-background"
                  placeholder="مثال: عرض خاص — خصم 50% لفترة محدودة!"
                  data-testid="input-ad-title"
                />
              </div>

              {/* Content */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  📝 محتوى الإعلان <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all resize-none bg-background"
                  rows={3}
                  placeholder="اكتب وصف الإعلان هنا..."
                  data-testid="input-ad-content"
                />
                <p className="text-xs text-muted-foreground mt-1">{form.content.length}/500 حرف</p>
              </div>

              {/* Image upload with Preview */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <Image className="h-3.5 w-3.5 text-blue-500" />
                  صورة الإعلان
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingImage ? "جاري الرفع..." : "رفع صورة"}
                  </Button>
                  {form.imageUrl && (
                    <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
                    >
                      حذف الصورة
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setPreviewImage(!previewImage)}
                    >
                      {previewImage ? "إخفاء" : "معاينة"}
                    </Button>
                    </>
                  )}
                </div>
                {previewImage && form.imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                    <img src={form.imageUrl} alt="معاينة" className="w-full h-40 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">يُفضل صورة أفقية بأبعاد 1200×400 بكسل — الرفع من جهازك فقط</p>
              </div>

              {/* Link URL */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <Link2 className="h-3.5 w-3.5 text-green-500" />
                  رابط عند النقر
                </label>

                <div className="rounded-xl border p-3 mb-3 bg-muted/30">
                  <p className="text-xs font-semibold mb-2">إعلان منتج مخفّض (اختياري)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select
                      value={campaignProductId}
                      onChange={(e) => setCampaignProductId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                    >
                      <option value="">اختيار منتج من المتجر</option>
                      {productsData.map((p) => (
                        <option key={p.id} value={p.id}>
                          {(p.nameAr || p.name)}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={campaignDiscountPercent}
                      onChange={(e) => setCampaignDiscountPercent(Math.min(90, Math.max(1, parseInt(e.target.value) || 15)))}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                      placeholder="نسبة الخصم"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!campaignProductId) return;
                        const generatedLink = buildCampaignLink(
                          campaignProductId,
                          campaignDiscountPercent,
                          form.targetAudience,
                          editingAd?.id
                        );
                        setForm((prev) => ({ ...prev, linkUrl: generatedLink }));

                        if (!form.title.trim() && selectedCampaignProduct) {
                          setForm((prev) => ({
                            ...prev,
                            title: `خصم ${campaignDiscountPercent}% على ${(selectedCampaignProduct.nameAr || selectedCampaignProduct.name)}`,
                          }));
                        }
                      }}
                      disabled={!campaignProductId}
                    >
                      توليد رابط الحملة
                    </Button>
                  </div>
                  {selectedCampaignProduct && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      المنتج: {selectedCampaignProduct.nameAr || selectedCampaignProduct.name}
                    </p>
                  )}
                </div>

                <input
                  type="url"
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all bg-background"
                  placeholder="https://example.com/offer"
                  dir="ltr"
                  data-testid="input-ad-link"
                />
                <p className="text-xs text-muted-foreground mt-1">يُفتح في نافذة جديدة عند نقر المستخدم</p>
              </div>

              {/* Target Audience — Visual Selector */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <Users className="h-3.5 w-3.5 text-purple-500" />
                  الجمهور المستهدف
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {audienceOptions.map((opt) => {
                    const isSelected = form.targetAudience === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, targetAudience: opt.value })}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          isSelected
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-sm"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                        data-testid={`audience-${opt.value}`}
                      >
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${isSelected ? "text-amber-600" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${isSelected ? "text-amber-700 dark:text-amber-400" : ""}`}>{opt.label}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority — Visual Selector */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-amber-500" />
                  الأولوية
                </label>
                <div className="flex gap-2 items-center flex-wrap">
                  {priorityPresets.map((p) => (
                    <Button
                      key={p.value}
                      type="button"
                      size="sm"
                      variant={form.priority === p.value ? "default" : "outline"}
                      className="gap-1"
                      onClick={() => setForm({ ...form, priority: p.value })}
                    >
                      {p.label}
                    </Button>
                  ))}
                  <span className="text-muted-foreground mx-2">أو</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border rounded-lg text-sm text-center bg-background"
                    data-testid="input-ad-priority"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">الأعلى أولوية يظهر أولاً. القيمة من 0 إلى 100</p>
              </div>

              {/* Schedule — Date Range */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  جدولة العرض
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">تاريخ البدء</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background"
                      data-testid="input-ad-start-date"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background"
                      data-testid="input-ad-end-date"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">اتركها فارغة ليظهر الإعلان بدون قيود زمنية</p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${form.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                    {form.isActive ? (
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{form.isActive ? "الإعلان نشط" : "الإعلان متوقف"}</p>
                    <p className="text-xs text-muted-foreground">{form.isActive ? "سيظهر للمستخدمين فوراً" : "لن يظهر حتى التفعيل"}</p>
                  </div>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                  data-testid="switch-ad-active"
                />
              </div>

              {/* Campaign Preview & Test Send */}
              <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-semibold">معاينة وإرسال تجريبي للحملة</p>
                  {getAudienceBadge(form.targetAudience)}
                </div>

                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <p className="text-xs font-semibold">المسار النهائي للعميل (Preview)</p>
                  {campaignPreviewLink ? (
                    <>
                      <p className="text-[11px] text-muted-foreground">
                        الوجهة: {campaignPreviewInfo.isCampaign ? "حملة متجر" : "رابط عام"}
                      </p>
                      {campaignPreviewInfo.isCampaign && (
                        <p className="text-[11px] text-muted-foreground" dir="ltr">
                          promoProductId: {campaignPreviewInfo.promoProductId || "-"} | promoAdId: {campaignPreviewInfo.promoAdId || (editingAd?.id || "(auto on save)")}
                        </p>
                      )}
                      <p className="text-[11px] text-blue-600 truncate" dir="ltr">{finalCustomerPreviewUrl}</p>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(finalCustomerPreviewUrl);
                              toast({ title: "تم نسخ مسار العميل" });
                            } catch {
                            }
                          }}
                        >
                          <Copy className="h-3 w-3" />
                          نسخ المسار
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => window.open(finalCustomerPreviewUrl, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-3 w-3" />
                          فتح المعاينة
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">أضف رابطًا مباشرًا أو استخدم "توليد رابط الحملة" لعرض المسار النهائي.</p>
                  )}
                </div>

                <div className="rounded-xl border bg-background overflow-hidden">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="campaign-preview" className="w-full h-28 object-cover" />
                  ) : null}
                  <div className="p-3">
                    <p className="font-semibold text-sm line-clamp-1">{form.title || "عنوان الإعلان سيظهر هنا"}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{form.content || "محتوى الإعلان سيظهر هنا"}</p>
                    {form.linkUrl ? (
                      <p className="text-[11px] text-blue-600 mt-2 truncate" dir="ltr">{form.linkUrl}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs text-muted-foreground">حجم العينة لكل فئة:</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={testSampleSize}
                    onChange={(e) => setTestSampleSize(Math.min(20, Math.max(1, parseInt(e.target.value) || 5)))}
                    className="w-20 px-2 py-1.5 border rounded-lg text-sm text-center bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1"
                    onClick={() => testSendMutation.mutate()}
                    disabled={!form.title.trim() || !form.content.trim() || testSendMutation.isPending}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {testSendMutation.isPending ? "جارٍ الإرسال..." : "إرسال تجريبي"}
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    سيتم الإرسال لعينة صغيرة فقط (حد أقصى 20) حسب الجمهور المحدد.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t">
                <Button
                  onClick={handleSubmit}
                  disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending || updateMutation.isPending}
                  className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  data-testid="button-save-ad"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "جاري الحفظ..." : editingAd ? "💾 تحديث الإعلان" : "🚀 نشر الإعلان"}
                </Button>
                <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-cancel-ad">
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
