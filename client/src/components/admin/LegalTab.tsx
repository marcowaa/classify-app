import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, FileText, Save, Loader2, RefreshCw, Clock, Users, Eye, EyeOff, AlertTriangle, Heart, DollarSign, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SectionType = "privacy" | "terms" | "child-safety" | "refund" | "legal-center";

interface SectionConfig {
  id: SectionType;
  emoji: string;
  label: string;
  activeBg: string;
  activeShadow: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionConfig[] = [
  {
    id: "privacy",
    emoji: "🔒",
    label: "سياسة الخصوصية",
    activeBg: "bg-indigo-600 hover:bg-indigo-700",
    activeShadow: "shadow-indigo-200 dark:shadow-indigo-900/50",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: "terms",
    emoji: "📜",
    label: "شروط الاستخدام",
    activeBg: "bg-emerald-600 hover:bg-emerald-700",
    activeShadow: "shadow-emerald-200 dark:shadow-emerald-900/50",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: "child-safety",
    emoji: "😊",
    label: "سلامة الأطفال",
    activeBg: "bg-blue-600 hover:bg-blue-700",
    activeShadow: "shadow-blue-200 dark:shadow-blue-900/50",
    icon: <Heart className="w-5 h-5" />,
  },
  {
    id: "refund",
    emoji: "💰",
    label: "سياسة الاسترداد",
    activeBg: "bg-amber-600 hover:bg-amber-700",
    activeShadow: "shadow-amber-200 dark:shadow-amber-900/50",
    icon: <DollarSign className="w-5 h-5" />,
  },
  {
    id: "legal-center",
    emoji: "⚡",
    label: "المركز القانوني",
    activeBg: "bg-purple-600 hover:bg-purple-700",
    activeShadow: "shadow-purple-200 dark:shadow-purple-900/50",
    icon: <Scale className="w-5 h-5" />,
  },
];

interface LegalTabProps {
  token: string;
}

export const LegalTab = ({ token }: LegalTabProps): JSX.Element => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<SectionType>("privacy");
  const [contents, setContents] = useState<Record<SectionType, string>>({
    "privacy": "",
    "terms": "",
    "child-safety": "",
    "refund": "",
    "legal-center": "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-legal"],
    queryFn: async () => {
      const res = await fetch("/api/admin/legal", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch legal pages");
      const json = await res.json();
      return json.data as {
        privacy: string;
        terms: string;
        childSafety: string;
        refund: string;
        legalCenter: string;
        privacyUpdatedAt: string;
        termsUpdatedAt: string;
        childSafetyUpdatedAt: string;
        refundUpdatedAt: string;
        legalCenterUpdatedAt: string;
      };
    },
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    if (data && !initialized) {
      setContents({
        "privacy": data.privacy || "",
        "terms": data.terms || "",
        "child-safety": data.childSafety || "",
        "refund": data.refund || "",
        "legal-center": data.legalCenter || "",
      });
      setInitialized(true);
    }
  }, [data, initialized]);

  const saveMutation = useMutation({
    mutationFn: async (params: { type: SectionType; content: string }) => {
      const res = await fetch("/api/admin/legal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to save");
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-legal"] });
      setInitialized(false);
      toast({
        title: "✅ تم الحفظ",
        description: result.message || "تم حفظ المحتوى وإشعار أولياء الأمور",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "❌ خطأ",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const content = contents[activeSection];
    if (!content.trim() || content.trim().length < 10) {
      toast({
        title: "⚠️ المحتوى قصير جداً",
        description: "يجب أن يكون المحتوى 10 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate({ type: activeSection, content });
  };

  const activeConfig = SECTIONS.find(s => s.id === activeSection)!;
  const currentContent = contents[activeSection];

  const updatedAtMap: Record<SectionType, string | undefined> = {
    "privacy": data?.privacyUpdatedAt,
    "terms": data?.termsUpdatedAt,
    "child-safety": data?.childSafetyUpdatedAt,
    "refund": data?.refundUpdatedAt,
    "legal-center": data?.legalCenterUpdatedAt,
  };
  const updatedAt = updatedAtMap[activeSection];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">الصفحات القانونية</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">تعديل جميع الصفحات القانونية للمنصة</p>
          </div>
        </div>
        <button
          onClick={() => { setInitialized(false); refetch(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => { setActiveSection(section.id); setShowPreview(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all text-sm ${
              activeSection === section.id
                ? `${section.activeBg} text-white shadow-lg ${section.activeShadow}`
                : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {section.icon}
            {section.emoji} {section.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="mr-3 text-gray-500">جاري التحميل...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Info bar */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {updatedAt && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>آخر تعديل: {new Date(updatedAt).toLocaleString("ar-EG")}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>{currentContent.length} حرف</span>
              </div>
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? "إخفاء المعاينة" : "معاينة"}
            </button>
          </div>

          {/* Alert */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-700 dark:text-amber-300">تنبيه مهم</p>
              <p className="text-amber-600 dark:text-amber-400 mt-1">
                عند الحفظ سيتم <strong>إشعار جميع أولياء الأمور</strong> تلقائياً بأن {activeConfig.label} قد تم تحديثها.
              </p>
            </div>
          </div>

          {/* Editor */}
          <div className="relative">
            <label className="block text-sm font-semibold mb-2">
              محتوى {activeConfig.label}
            </label>
            <textarea
              value={currentContent}
              onChange={(e) => setContents(prev => ({ ...prev, [activeSection]: e.target.value }))}
              rows={18}
              className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono text-sm leading-relaxed resize-y focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition"
              placeholder={`اكتب محتوى ${activeConfig.label} هنا...\n\nيمكنك استخدام HTML للتنسيق:\n<h3>عنوان</h3>\n<p>فقرة</p>\n<ul><li>عنصر</li></ul>`}
              dir="auto"
            />
          </div>

          {/* Preview */}
          {showPreview && currentContent && (
            <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 pb-3 border-b dark:border-gray-700">
                <Eye className="w-4 h-4" />
                معاينة المحتوى كما سيظهر للمستخدم
              </div>
              <div
                className="prose dark:prose-invert max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentContent }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>سيتم إشعار جميع أولياء الأمور عند الحفظ</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${activeConfig.activeBg} ${activeConfig.activeShadow} ${saveMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saveMutation.isPending ? "جاري الحفظ..." : `حفظ ${activeConfig.label} وإشعار الجميع`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
