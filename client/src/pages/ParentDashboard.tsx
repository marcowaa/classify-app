import { useEffect, useState, lazy, Suspense, memo, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest, authenticatedFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { ParentWebPushRegistrar } from "@/components/ParentWebPushRegistrar";
import { ParentMobilePushRegistrar } from "@/components/ParentMobilePushRegistrar";
import { ParentFeaturePulse } from "@/components/ParentFeaturePulse";
import { SectionExplainerCard } from "@/components/SectionExplainerCard";
import { ParentQuickStartChecklist } from "@/components/ParentQuickStartChecklist";
import { TrialUpgradePromptDialog } from "@/components/TrialUpgradePromptDialog";
import { AccountSwitcherDialog } from "@/components/AccountSwitcherDialog";
import { useParentSSE } from "@/hooks/useParentSSE";
import { GovernorateSelect } from "@/components/ui/GovernorateSelect";
import { evaluateTrialAccess, inferTrialAccountState, type TrialCapability } from "@/lib/trialPolicyEngine";
import { getTrialExplorationProgressPercent, markTrialExplorationStep } from "@/lib/trialExperience";

// Lazy-load dialogs and wizards (only shown on user interaction)
const OnboardingWizard = lazy(() => import("@/components/OnboardingWizard").then(m => ({ default: m.OnboardingWizard })));
const ScreenTimeDialog = lazy(() => import("@/components/parent/ScreenTimeDialog").then(m => ({ default: m.ScreenTimeDialog })));
const ChildGamesControl = lazy(() => import("@/components/parent/ChildGamesControl").then(m => ({ default: m.ChildGamesControl })));
const ChildReportPDF = lazy(() => import("@/components/parent/ChildReportPDF").then(m => ({ default: m.ChildReportPDF })));
import { ACADEMIC_GRADES } from "@shared/constants";

// Lazy-load heavy chart library (recharts ~200KB + framer-motion ~30KB)
const AnnualReportChart = lazy(() => import("@/components/AnnualReportChart").then(m => ({ default: m.AnnualReportChart })));
// Lazy-load QR code library
const QRCodeSVG = lazy(() => import("qrcode.react").then(m => ({ default: m.QRCodeSVG })));
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Wallet,
  Bell,
  ShoppingBag,
  Settings,
  LogOut,
  QrCode,
  Plus,
  Gift,
  Target,
  Star,
  Trophy,
  Copy,
  Check,
  BookOpen,
  Gamepad2,
  Share2,
  Clock,
  ChevronRight,
  Zap,
  Link2,
  Moon,
  Sun,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Package,
  Megaphone,
  ExternalLink,
  MousePointer,
  KeyRound,
  Search,
  User,
  X,
  School,
  GraduationCap,
  Heart,
  CalendarClock,
  MoreVertical,
  Repeat
} from "lucide-react";

const ChildReportCard = memo(function ChildReportCard({ child, token, isDark, t }: { child: any; token: string | null; isDark: boolean; t: (key: string, options?: any) => string }) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/api/parent/children", child.id, "reports", period],
    queryFn: async () => {
      const res = await fetch(`/api/parent/children/${child.id}/reports?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && !!child.id,
  });

  const report = reportData?.data || null;

  return (
    <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold ${isDark ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-600"
            }`}>
            {child.name?.charAt(0) || "👤"}
          </div>
          <div className="min-w-0">
            <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {child.name}
            </h3>
            <p className={`text-sm truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {child.totalPoints || 0} {t('parentDashboard.points')} • {t('parentDashboard.level')} {child.level || 1}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Suspense fallback={null}>
            <ChildReportPDF childId={child.id} childName={child.name} />
          </Suspense>
          <div className="flex flex-wrap gap-1">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm rounded-lg transition-all ${period === p
                  ? "bg-blue-500 text-white"
                  : isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                data-testid={`button-period-${p}-${child.id}`}
              >
                {p === "daily" ? t('parentDashboard.daily') : p === "weekly" ? t('parentDashboard.weekly') : t('parentDashboard.monthly')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : report ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`p-3 rounded-lg text-center ${isDark ? "bg-gray-700" : "bg-white"}`}>
              <p className="text-2xl font-bold text-blue-500">{report.summary?.totalTasks || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.total')}</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${isDark ? "bg-gray-700" : "bg-white"}`}>
              <p className="text-2xl font-bold text-green-500">{report.summary?.completedTasks || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.completed')}</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${isDark ? "bg-gray-700" : "bg-white"}`}>
              <p className="text-2xl font-bold text-yellow-500">{report.summary?.pendingTasks || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.pending')}</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${isDark ? "bg-gray-700" : "bg-white"}`}>
              <p className="text-2xl font-bold text-purple-500">{report.summary?.pointsEarned || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.points')}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.completionRate')}:</span>
            <div className="flex-1 w-full">
              <Progress value={report.summary?.completionRate || 0} className="h-2" />
            </div>
            <span className={`text-sm font-bold self-end sm:self-auto ${isDark ? "text-white" : "text-gray-800"}`}>
              {report.summary?.completionRate || 0}%
            </span>
          </div>

          {report.bySubject?.length > 0 && (
            <div className="space-y-2">
              <p className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>{t('parentDashboard.bySubject')}:</p>
              <div className="grid gap-2">
                {report.bySubject.map((subj: any) => (
                  <div
                    key={subj.subjectId}
                    className={`flex items-center justify-between p-2 rounded-lg ${isDark ? "bg-gray-700" : "bg-white"
                      }`}
                  >
                    <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {subj.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {subj.completed}/{subj.total}
                      </span>
                      <Badge variant={subj.rate >= 70 ? "default" : subj.rate >= 40 ? "secondary" : "outline"}>
                        {subj.rate}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className={isDark ? "text-gray-400" : "text-gray-500"}>{t('parentDashboard.noDataAvailable')}</p>
        </div>
      )}
    </div>
  );
});

// Parse error message from apiRequest errors (format: "statusCode: {json}")
function extractErrorMessage(err: any): string {
  const raw = err?.message || "";
  try {
    const jsonPart = raw.substring(raw.indexOf("{"));
    if (jsonPart) {
      const parsed = JSON.parse(jsonPart);
      return parsed?.message || parsed?.error || raw;
    }
  } catch { }
  return raw;
}

export const ParentDashboard = (): JSX.Element => {
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");

  // Real-time SSE notifications
  useParentSSE();

  const [cartCount, setCartCount] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showLinkCode, setShowLinkCode] = useState(false);
  const [partnerLinkCodeInput, setPartnerLinkCodeInput] = useState("");
  const [generatedPartnerCode, setGeneratedPartnerCode] = useState("");
  const [generatedPartnerCodeExpiresAt, setGeneratedPartnerCodeExpiresAt] = useState<string | null>(null);
  const [showPartnerLinkTip, setShowPartnerLinkTip] = useState(false);
  const [showSpouseLinkCard, setShowSpouseLinkCard] = useState(false);
  const [activeDashboardHintId, setActiveDashboardHintId] = useState<string | null>(null);
  const lastShownDashboardHintIdRef = useRef<string | null>(null);
  const [dashboardHintSchedulerTick, setDashboardHintSchedulerTick] = useState(0);
  const dashboardHintShownCountRef = useRef<number>((() => {
    const raw = Number(sessionStorage.getItem("parent-dashboard-hints-shown-count") || "0");
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  })());
  const [dismissedDashboardHints, setDismissedDashboardHints] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("parentDashboardSectionHints");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [gamesChild, setGamesChild] = useState<any>(null);
  const [screenTimeChild, setScreenTimeChild] = useState<any>(null);
  const [selectedReportChild, setSelectedReportChild] = useState<string>("all");

  // PIN management state
  const [showAddChildPin, setShowAddChildPin] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildPin, setNewChildPin] = useState("");
  const [newChildBirthday, setNewChildBirthday] = useState("");
  const [newChildGovernorate, setNewChildGovernorate] = useState("");
  const [newChildGrade, setNewChildGrade] = useState("");
  const [addChildStep, setAddChildStep] = useState(1);
  const [newChildSchoolSearch, setNewChildSchoolSearch] = useState("");
  const [newChildSchoolId, setNewChildSchoolId] = useState("");
  const [newChildSchoolName, setNewChildSchoolName] = useState("");
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [pinTargetChild, setPinTargetChild] = useState<any>(null);
  const [childPinValue, setChildPinValue] = useState("");
  const [showSetMyPin, setShowSetMyPin] = useState(false);
  const [myPinValue, setMyPinValue] = useState("");
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showPurchaseDecisionDialog, setShowPurchaseDecisionDialog] = useState(false);
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState<any | null>(null);
  const [purchaseDecisionMode, setPurchaseDecisionMode] = useState<"approve" | "reject">("approve");
  const [purchaseShippingForm, setPurchaseShippingForm] = useState({
    name: "",
    phone: "",
    city: "",
    area: "",
    line1: "",
    notes: "",
  });
  const [purchaseRejectReason, setPurchaseRejectReason] = useState("");
  const [showMobileHeaderMenu, setShowMobileHeaderMenu] = useState(false);

  // School search for child creation
  const { data: schoolSuggestions } = useQuery({
    queryKey: ["/api/public/schools", newChildGovernorate, newChildSchoolSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (newChildGovernorate) params.set("governorate", newChildGovernorate);
      if (newChildSchoolSearch) params.set("search", newChildSchoolSearch);
      params.set("limit", "10");
      const res = await fetch(`/api/public/schools?${params}`);
      const json = await res.json();
      return json.data?.schools || [];
    },
    enabled: addChildStep === 2 && (!!newChildGovernorate || newChildSchoolSearch.length >= 2),
    staleTime: 30000,
  });

  // Dashboard search
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["/api/search", dashboardSearch],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/search?q=${encodeURIComponent(dashboardSearch)}&type=all&limit=8`);
      const json = await res.json();
      return json.data || { schools: [], teachers: [], tasks: [] };
    },
    enabled: dashboardSearch.length >= 2,
    staleTime: 15000,
  });

  // Optimized polling: reduced frequencies to minimize network load
  // Critical data: 30s | Secondary data: 60s | Rarely changing: 5min
  const { data: parentInfo } = useQuery({
    queryKey: ["/api/parent/info"],
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
    staleTime: 60000,
  });

  const { data: children } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: wallet } = useQuery({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: notifications } = useQuery({
    queryKey: ["/api/parent/notifications", "dashboard", 3],
    queryFn: () => authenticatedFetch("/api/parent/notifications?includeMeta=1&limit=3&offset=0"),
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: unreadNotificationsData } = useQuery<{ count: number }>({
    queryKey: ["/api/parent/notifications/unread-count"],
    queryFn: () => authenticatedFetch<{ count: number }>("/api/parent/notifications/unread-count"),
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: childrenStatus } = useQuery({
    queryKey: ["/api/parent/children/status"],
    enabled: !!token,
    refetchInterval: token ? 300000 : false,
    staleTime: 300000,
  });

  const { data: referralStats } = useQuery({
    queryKey: ["/api/parent/referral-stats"],
    enabled: !!token,
    refetchInterval: token ? 120000 : false,
    staleTime: 120000,
  });

  const { data: parentAds } = useQuery({
    queryKey: ["/api/parent/ads"],
    enabled: !!token,
    refetchInterval: token ? 300000 : false,
    staleTime: 300000,
  });

  const { data: familyPinStatus } = useQuery({
    queryKey: ["/api/auth/family-pin-status"],
    enabled: !!token,
    staleTime: 60000,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["/api/parent/purchases"],
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
    staleTime: 60000,
  });

  const { data: ownedProducts } = useQuery({
    queryKey: ["/api/parent/owned-products"],
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
    staleTime: 60000,
  });

  const { data: tasks } = useQuery({
    queryKey: ["/api/parent/tasks"],
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
    staleTime: 60000,
  });

  const { data: subjects } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!token,
    refetchInterval: token ? 300000 : false,
    staleTime: 300000,
  });

  const { data: tasksBySubject } = useQuery({
    queryKey: ["/api/parent/tasks/by-subject"],
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
    staleTime: 60000,
  });

  const { data: purchaseRequests } = useQuery({
    queryKey: ["/api/parent/purchase-requests"],
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: familySyncStatus } = useQuery<any[]>({
    queryKey: ["/api/parent/sync-status"],
    queryFn: () => authenticatedFetch<any[]>("/api/parent/sync-status"),
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
    staleTime: 30000,
  });

  const { data: familyLinkRequests } = useQuery<any[]>({
    queryKey: ["/api/parent/link-requests"],
    queryFn: () => authenticatedFetch<any[]>("/api/parent/link-requests"),
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
    staleTime: 30000,
  });

  // Quick-access: followed entities & new content indicators
  const { data: myFollows } = useQuery({
    queryKey: ["/api/follow/my"],
    queryFn: () => authenticatedFetch("/api/follow/my"),
    enabled: !!token,
    staleTime: 60000,
    refetchInterval: token ? 120000 : false,
  });

  const { data: newContentCounts } = useQuery({
    queryKey: ["/api/follow/new-content-counts"],
    queryFn: () => authenticatedFetch("/api/follow/new-content-counts"),
    enabled: !!token,
    staleTime: 30000,
    refetchInterval: token ? 60000 : false,
  });

  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-quick-access]")) {
        setShowSchoolDropdown(false);
        setShowTeacherDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showMobileHeaderMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMobileHeaderMenu(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showMobileHeaderMenu]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileHeaderMenu(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { toast } = useToast();

  const purchaseDecisionMutation = useMutation({
    mutationFn: async ({ requestId, decision, shippingAddress, rejectionReason }: { requestId: string; decision: "approve" | "reject"; shippingAddress?: string; rejectionReason?: string }) => {
      return apiRequest("PATCH", `/api/parent/purchase-requests/${requestId}/decision`, {
        decision,
        shippingAddress,
        rejectionReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      toast({
        title: t("parentDashboard.purchaseRequestUpdated"),
        description: t("parentDashboard.purchaseRequestUpdatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("errors.error"),
        description: t("errors.somethingWentWrong"),
        variant: "destructive",
      });
    },
  });

  const generatePartnerLinkCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/parent/generate-linking-code", {});
      return res.json();
    },
    onSuccess: (payload: any) => {
      const data = payload?.data || {};
      setGeneratedPartnerCode(data.code || "");
      setGeneratedPartnerCodeExpiresAt(data.expiresAt || null);
      setShowSpouseLinkCard(true);
      toast({
        title: t("parentDashboard.spouseLinkToastCreatedTitle"),
        description: t("parentDashboard.spouseLinkToastCreatedDesc"),
      });
    },
    onError: (err: any) => {
      toast({
        title: t("parentDashboard.spouseLinkToastCreateFailed"),
        description: extractErrorMessage(err) || t("parentDashboard.spouseLinkToastTryAgain"),
        variant: "destructive",
      });
    },
  });

  const syncWithPartnerCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/parent/sync-with-code", { code });
      return res.json();
    },
    onSuccess: () => {
      setPartnerLinkCodeInput("");
      toast({
        title: t("parentDashboard.spouseLinkToastRequestSent"),
        description: t("parentDashboard.spouseLinkToastRequestSentDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
    },
    onError: (err: any) => {
      toast({
        title: t("parentDashboard.spouseLinkToastRequestFailed"),
        description: extractErrorMessage(err) || t("parentDashboard.spouseLinkToastCheckCode"),
        variant: "destructive",
      });
    },
  });

  const revokeFamilySyncMutation = useMutation({
    mutationFn: async (syncId: string) => {
      const res = await apiRequest("PUT", `/api/parent/sync/${syncId}/revoke`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      toast({
        title: t("parentDashboard.spouseLinkRevokeDone", { defaultValue: "تم إلغاء الربط" }),
      });
    },
    onError: (err: any) => {
      toast({
        title: t("parentDashboard.spouseLinkRevokeFailed", { defaultValue: "فشل إلغاء الربط" }),
        description: extractErrorMessage(err) || t("parentDashboard.spouseLinkToastTryAgain"),
        variant: "destructive",
      });
    },
  });

  // PIN mutations
  const addChildWithPinMutation = useMutation({
    mutationFn: async ({ childName, pin }: { childName: string; pin: string }) => {
      const res = await apiRequest("POST", "/api/auth/add-child-with-pin", {
        childName,
        pin,
        birthday: newChildBirthday || undefined,
        governorate: newChildGovernorate || undefined,
        academicGrade: newChildGrade || undefined,
        schoolId: newChildSchoolId || undefined,
        schoolName: newChildSchoolName || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/family-pin-status"] });
      setShowAddChildPin(false);
      setNewChildName("");
      setNewChildPin("");
      setNewChildBirthday("");
      setNewChildGovernorate("");
      setNewChildGrade("");
      setNewChildSchoolSearch("");
      setNewChildSchoolId("");
      setNewChildSchoolName("");
      setAddChildStep(1);
      toast({ title: t("parentDashboard.childAdded"), description: t("parentDashboard.canNowLoginWithPin") });
    },
    onError: (err: any) => {
      const msg = extractErrorMessage(err);
      toast({ title: t("parentDashboard.error"), description: msg || t("parentDashboard.childAddFailed"), variant: "destructive" });
    },
  });

  const setChildPinMutation = useMutation({
    mutationFn: async ({ childId, pin }: { childId: number; pin: string }) => {
      const res = await apiRequest("PUT", "/api/auth/set-child-pin", { childId, pin: pin || "" });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/family-pin-status"] });
      setShowSetPinModal(false);
      setPinTargetChild(null);
      setChildPinValue("");
      const pinRemoved = data?.data?.pinRemoved;
      toast({ title: pinRemoved ? t("parentDashboard.pinRemoved") : t("parentDashboard.pinSet") });
    },
    onError: (err: any) => {
      const msg = extractErrorMessage(err);
      toast({ title: t("parentDashboard.error"), description: msg || t("parentDashboard.pinSetFailed"), variant: "destructive" });
    },
  });

  const setMyPinMutation = useMutation({
    mutationFn: async ({ pin }: { pin: string }) => {
      const res = await apiRequest("PUT", "/api/auth/set-pin", { pin: pin || "" });
      return res.json();
    },
    onSuccess: (data: any) => {
      const payload = data?.data || data;
      if (payload?.familyCode) {
        localStorage.setItem("familyCode", payload.familyCode);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/family-pin-status"] });
      setShowSetMyPin(false);
      setMyPinValue("");
      const pinRemoved = payload?.pinRemoved;
      toast({ title: pinRemoved ? t("parentDashboard.pinRemoved") : t("parentDashboard.yourPinSet") });
    },
    onError: (err: any) => {
      const msg = extractErrorMessage(err);
      toast({ title: t("parentDashboard.error"), description: msg || t("parentDashboard.pinSetFailed"), variant: "destructive" });
    },
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTrialUpgradePrompt, setShowTrialUpgradePrompt] = useState(false);
  const [trialBlockedDestination, setTrialBlockedDestination] = useState("/parent-dashboard");
  const [trialInteractionCount, setTrialInteractionCount] = useState<number>(() => {
    const raw = sessionStorage.getItem("parent-trial-dashboard-click-count");
    const parsed = Number(raw || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  });

  const { data: publicSettingsData } = useQuery({
    queryKey: ["public-mobile-app-settings"],
    queryFn: async () => {
      const res = await fetch("/api/public/mobile-app-settings");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const showSocialLoginButtonsByPolicy = useMemo(() => {
    const raw = (publicSettingsData as any)?.data?.trialPolicy?.showSocialLoginButtons;
    return typeof raw === "boolean" ? raw : true;
  }, [publicSettingsData]);
  const trialExplorePromptPercent = useMemo(() => {
    const raw = Number((publicSettingsData as any)?.data?.trialPolicy?.explorePromptPercent);
    if (!Number.isFinite(raw)) return 30;
    return Math.min(100, Math.max(1, Math.trunc(raw)));
  }, [publicSettingsData]);

  const markSeenMutation = useMutation({
    mutationFn: async (type: string) => {
      return apiRequest("POST", `/api/follow/mark-seen/${type}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow/new-content-counts"] });
    },
  });

  const followsList = (myFollows as any)?.follows || [];
  const followedSchools = followsList.filter((f: any) => f.entityType === "school");
  const followedTeachers = followsList.filter((f: any) => f.entityType === "teacher");
  const newSchoolCount = (newContentCounts as any)?.schools || 0;
  const newTeacherCount = (newContentCounts as any)?.teachers || 0;

  const handleSchoolIconClick = () => {
    if (followedSchools.length === 1) {
      markSeenMutation.mutate("school");
      navigate(`/school/${followedSchools[0].entityId}`);
    } else {
      setShowSchoolDropdown(!showSchoolDropdown);
      setShowTeacherDropdown(false);
    }
  };

  const handleTeacherIconClick = () => {
    if (followedTeachers.length === 1) {
      markSeenMutation.mutate("teacher");
      navigate(`/teacher/${followedTeachers[0].entityId}`);
    } else {
      setShowTeacherDropdown(!showTeacherDropdown);
      setShowSchoolDropdown(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("deviceTrusted");
    localStorage.removeItem("parentAccountClassification");
    navigate("/age-gate");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyGeneratedPartnerCode = () => {
    if (!generatedPartnerCode) return;
    navigator.clipboard.writeText(generatedPartnerCode);
    toast({
      title: t("parentDashboard.spouseLinkToastCodeCopied"),
      description: t("parentDashboard.spouseLinkToastShareCode"),
    });
  };

  const sharePartnerCodeOnWhatsApp = () => {
    if (!generatedPartnerCode) {
      toast({
        title: t("parentDashboard.spouseLinkToastNoCode"),
        description: t("parentDashboard.spouseLinkToastGenerateFirst"),
        variant: "destructive",
      });
      return;
    }

    const text = `${t("parentDashboard.spouseLinkWhatsappShareText")} ${generatedPartnerCode}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const dismissPartnerLinkTip = () => {
    setShowPartnerLinkTip(false);
    localStorage.setItem("parent-dashboard-partner-link-tip-dismissed", "1");
  };

  const openPurchaseDecisionDialog = (request: any, mode: "approve" | "reject") => {
    setSelectedPurchaseRequest(request);
    setPurchaseDecisionMode(mode);
    setPurchaseShippingForm({
      name: parentData?.name || "",
      phone: parentData?.phone || "",
      city: "",
      area: "",
      line1: parentData?.address || "",
      notes: "",
    });
    setPurchaseRejectReason("");
    setShowPurchaseDecisionDialog(true);
  };

  const buildShippingAddressPayload = () => {
    const parts = [
      `${isRTL ? "الاسم" : "Name"}: ${purchaseShippingForm.name.trim()}`,
      `${isRTL ? "الهاتف" : "Phone"}: ${purchaseShippingForm.phone.trim()}`,
      `${isRTL ? "المدينة" : "City"}: ${purchaseShippingForm.city.trim()}`,
      `${isRTL ? "الحي" : "Area"}: ${purchaseShippingForm.area.trim()}`,
      `${isRTL ? "العنوان" : "Address"}: ${purchaseShippingForm.line1.trim()}`,
    ];

    if (purchaseShippingForm.notes.trim()) {
      parts.push(`${isRTL ? "ملاحظات" : "Notes"}: ${purchaseShippingForm.notes.trim()}`);
    }

    return parts.join("\n");
  };

  const confirmPurchaseDecision = () => {
    if (!selectedPurchaseRequest) return;

    if (purchaseDecisionMode === "approve") {
      const requiredApproveFields = [
        purchaseShippingForm.name.trim(),
        purchaseShippingForm.phone.trim(),
        purchaseShippingForm.city.trim(),
        purchaseShippingForm.area.trim(),
        purchaseShippingForm.line1.trim(),
      ];

      if (requiredApproveFields.some((value) => !value)) {
        toast({
          title: isRTL ? "بيانات ناقصة" : "Missing data",
          description: isRTL
            ? "يرجى إدخال جميع بيانات الشراء قبل الموافقة"
            : "Please fill all purchase fields before approving",
          variant: "destructive",
        });
        return;
      }

      purchaseDecisionMutation.mutate({
        requestId: selectedPurchaseRequest.id,
        decision: "approve",
        shippingAddress: buildShippingAddressPayload(),
      });
      setShowPurchaseDecisionDialog(false);
      return;
    }

    if (!purchaseRejectReason.trim()) {
      toast({
        title: isRTL ? "سبب الرفض مطلوب" : "Rejection reason required",
        description: isRTL ? "اكتب سبب الرفض ليصل للطفل" : "Write rejection reason to send to child",
        variant: "destructive",
      });
      return;
    }

    purchaseDecisionMutation.mutate({
      requestId: selectedPurchaseRequest.id,
      decision: "reject",
      rejectionReason: purchaseRejectReason.trim(),
    });
    setShowPurchaseDecisionDialog(false);
  };

  const notificationsList = Array.isArray((notifications as any)?.items)
    ? (notifications as any).items
    : Array.isArray(notifications)
      ? notifications
      : [];
  const childrenList = useMemo(() => Array.isArray(children) ? children : [], [children]);
  const tasksList = useMemo(() => Array.isArray(tasks) ? tasks : [], [tasks]);
  const subjectsList = Array.isArray(subjects) ? subjects : [];
  const tasksBySubjectList = Array.isArray(tasksBySubject) ? tasksBySubject : [];
  const ordersList = useMemo(() => Array.isArray(recentOrders) ? recentOrders : (recentOrders as any)?.data || [], [recentOrders]);
  const ownedProductsList = useMemo(() => Array.isArray(ownedProducts) ? ownedProducts : (ownedProducts as any)?.data || [], [ownedProducts]);
  const purchaseRequestsList = useMemo(() => Array.isArray(purchaseRequests) ? purchaseRequests : [], [purchaseRequests]);
  const syncRows = useMemo(() => Array.isArray(familySyncStatus) ? familySyncStatus : [], [familySyncStatus]);
  const pendingFamilyRequests = useMemo(
    () => (Array.isArray(familyLinkRequests) ? familyLinkRequests : []).filter((item: any) => item.status === "pending"),
    [familyLinkRequests]
  );
  const childNameById = useMemo(() => {
    return childrenList.reduce((acc: Record<string, string>, child: any) => {
      if (child?.id) acc[child.id] = child.name || child.id;
      return acc;
    }, {});
  }, [childrenList]);
  const trialAccountState = useMemo(() => inferTrialAccountState({
    isParentMode: true,
    classification: localStorage.getItem("parentAccountClassification"),
    hasLinkedChildren: childrenList.length > 0,
  }), [childrenList.length]);

  const isParentTrial = trialAccountState === "parent_trial";

  const runTrialRestrictedAction = (
    action: () => void,
    blockedDestination = "/parent-dashboard",
    capability: TrialCapability = "use"
  ) => {
    markTrialExplorationStep(`parent-dashboard-action:${blockedDestination}`);

    const decision = evaluateTrialAccess({
      accountState: trialAccountState,
      capability,
      isAuthenticated: !isParentTrial,
      exploreProgressPercent: getTrialExplorationProgressPercent(),
      exploreThresholdPercent: trialExplorePromptPercent,
    });

    if (decision.decision === "allow") {
      action();
      return;
    }

    if (decision.decision === "block") {
      toast({
        title: t("errors.permissionDenied", "غير مسموح"),
        description: t("parentDashboard.noChildrenDesc"),
        variant: "destructive",
      });
      return;
    }

    setTrialBlockedDestination(blockedDestination);
    setShowTrialUpgradePrompt(true);
    setActiveTab("overview");
  };
  const availableInventoryCount = useMemo(() => ownedProductsList.filter((p: any) => p.status === "active").length, [ownedProductsList]);
  const activeOrdersCount = useMemo(() => ordersList.filter((o: any) => !["FAILED", "REFUNDED"].includes(o.status)).length, [ordersList]);
  const pendingPurchaseRequests = useMemo(() => purchaseRequestsList.filter((r: any) => r.status === "pending"), [purchaseRequestsList]);
  const getRequestOriginalPoints = (request: any) => {
    const productUnitPoints = Number(request?.product?.pointsPrice ?? 0);
    const quantity = Math.max(1, Number(request?.quantity ?? 1));
    if (!Number.isFinite(productUnitPoints) || productUnitPoints <= 0) {
      return null;
    }
    return productUnitPoints * quantity;
  };
  const getRequestDiscountSummary = (request: any) => {
    const originalPoints = getRequestOriginalPoints(request);
    const finalPoints = Math.max(0, Number(request?.pointsPrice ?? 0));
    if (!originalPoints || finalPoints <= 0 || finalPoints >= originalPoints) {
      return null;
    }
    const discountPoints = originalPoints - finalPoints;
    const discountPercent = Math.round((discountPoints / originalPoints) * 100);
    return { originalPoints, finalPoints, discountPoints, discountPercent };
  };
  const parentData = parentInfo as any || {};
  const walletData = wallet as any || {};
  const referralData = (referralStats as any)?.data || referralStats as any || {};
  const parentAdsList = Array.isArray((parentAds as any)?.data) ? (parentAds as any).data : Array.isArray(parentAds) ? parentAds : [];
  const statusData = childrenStatus as any || {};
  const pinData = (familyPinStatus as any)?.data || familyPinStatus as any || {};

  const unreadNotifications = typeof unreadNotificationsData?.count === "number"
    ? unreadNotificationsData.count
    : notificationsList.filter((n: any) => !n.isRead).length || 0;
  const totalChildrenPoints = useMemo(() => childrenList.reduce((sum: number, c: any) => sum + (c.totalPoints || 0), 0) || 0, [childrenList]);
  const pendingTasks = useMemo(() => tasksList.filter((t: any) => t.status === "pending").length || 0, [tasksList]);
  const completedTasks = useMemo(() => tasksList.filter((t: any) => t.status === "completed").length || 0, [tasksList]);

  useEffect(() => {
    markTrialExplorationStep("parent-dashboard");
  }, []);

  useEffect(() => {
    markTrialExplorationStep(`parent-dashboard-tab:${activeTab}`);
  }, [activeTab]);

  useEffect(() => {
    if (!isParentTrial) return;
    if (trialInteractionCount === 0 || trialInteractionCount % 7 !== 0) return;

    setTrialBlockedDestination("/parent-dashboard");
    setShowTrialUpgradePrompt(true);
    toast({
      title: t("parentAuth.register"),
      description: t("parentDashboard.trialHintLinkingDesc"),
    });
  }, [isParentTrial, t, toast, trialInteractionCount]);

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const rawCart = localStorage.getItem("parent-store-cart");
        if (!rawCart) {
          setCartCount(0);
          return;
        }
        const parsedCart = JSON.parse(rawCart);
        if (!Array.isArray(parsedCart)) {
          setCartCount(0);
          return;
        }
        const totalItems = parsedCart.reduce((sum: number, item: any) => sum + (item?.quantity || 0), 0);
        setCartCount(totalItems);
      } catch {
        setCartCount(0);
      }
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("parent-store-cart-updated", updateCartCount as EventListener);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("parent-store-cart-updated", updateCartCount as EventListener);
    };
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem("parent-dashboard-partner-link-tip-dismissed") === "1";
    setShowPartnerLinkTip(!dismissed);
  }, []);

  const dashboardHints = useMemo(() => ([
    {
      id: "parent-overview",
      icon: "📊",
      title: t("parentDashboard.overview"),
      description: t("parentDashboard.trialHintOverviewDesc", "ابدأ من نظرة عامة واضحة: تابع الأطفال، الرصيد، والمهام من شاشة واحدة قبل أي خطوة شراء."),
    },
    {
      id: "parent-linking",
      icon: "🔗",
      title: t("parentDashboard.linkChildren"),
      description: t("parentDashboard.trialHintLinkingDesc", "اربط حسابات الأطفال الآن لتفعيل كامل الصلاحيات، الإشعارات الفورية، ومزامنة الأداء العائلي."),
    },
    {
      id: "parent-store",
      icon: "🛍️",
      title: t("parentDashboard.store"),
      description: t("parentDashboard.trialHintStoreDesc", "ادخل المتجر بخطة: اختر المنتج المناسب، راجع الخصومات، وأكمل الشراء بثقة وأمان."),
    },
  ]), [t]);

  const nonDismissedDashboardHints = useMemo(
    () => dashboardHints.filter((hint) => !dismissedDashboardHints[hint.id]),
    [dashboardHints, dismissedDashboardHints]
  );

  const DASHBOARD_HINT_MIN_GAP_MS = 10000;
  const DASHBOARD_HINT_MAX_GAP_MS = 35000;
  const DASHBOARD_HINT_MAX_PER_SESSION = 4;
  const DASHBOARD_HINT_SHOW_PROBABILITY = 0.45;

  const visibleDashboardHints = useMemo(() => {
    if (!isParentTrial) {
      return nonDismissedDashboardHints;
    }
    if (!activeDashboardHintId) {
      return [];
    }
    return nonDismissedDashboardHints.filter((hint) => hint.id === activeDashboardHintId);
  }, [isParentTrial, nonDismissedDashboardHints, activeDashboardHintId]);

  useEffect(() => {
    if (!isParentTrial) {
      setActiveDashboardHintId(null);
      return;
    }

    if (nonDismissedDashboardHints.length === 0) {
      setActiveDashboardHintId(null);
      return;
    }

    if (activeDashboardHintId && nonDismissedDashboardHints.some((hint) => hint.id === activeDashboardHintId)) {
      return;
    }

    if (dashboardHintShownCountRef.current >= DASHBOARD_HINT_MAX_PER_SESSION) {
      return;
    }

    const now = Date.now();
    const lastShownRaw = Number(sessionStorage.getItem("parent-dashboard-hints-last-at") || "0");
    const lastShownAt = Number.isFinite(lastShownRaw) && lastShownRaw > 0 ? lastShownRaw : 0;

    const cooldownRemainingMs = lastShownAt > 0
      ? Math.max(0, DASHBOARD_HINT_MIN_GAP_MS - (now - lastShownAt))
      : 0;

    const randomGapMs = Math.floor(
      Math.random() * (DASHBOARD_HINT_MAX_GAP_MS - DASHBOARD_HINT_MIN_GAP_MS + 1),
    ) + DASHBOARD_HINT_MIN_GAP_MS;

    const delayMs = cooldownRemainingMs + randomGapMs;

    const timer = window.setTimeout(() => {
      const shouldShowHint = dashboardHintShownCountRef.current === 0
        || Math.random() < DASHBOARD_HINT_SHOW_PROBABILITY;

      if (!shouldShowHint) {
        setDashboardHintSchedulerTick((prev) => prev + 1);
        return;
      }

      const candidates = nonDismissedDashboardHints.filter(
        (hint) => hint.id !== lastShownDashboardHintIdRef.current
      );
      const source = candidates.length > 0 ? candidates : nonDismissedDashboardHints;
      const nextHint = source[Math.floor(Math.random() * source.length)];

      if (!nextHint?.id) {
        setDashboardHintSchedulerTick((prev) => prev + 1);
        return;
      }

      lastShownDashboardHintIdRef.current = nextHint.id;
      dashboardHintShownCountRef.current += 1;
      sessionStorage.setItem("parent-dashboard-hints-shown-count", String(dashboardHintShownCountRef.current));
      sessionStorage.setItem("parent-dashboard-hints-last-at", String(Date.now()));
      setActiveDashboardHintId(nextHint.id);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    isParentTrial,
    nonDismissedDashboardHints,
    activeDashboardHintId,
    dashboardHintSchedulerTick,
    DASHBOARD_HINT_MAX_PER_SESSION,
    DASHBOARD_HINT_MIN_GAP_MS,
    DASHBOARD_HINT_MAX_GAP_MS,
    DASHBOARD_HINT_SHOW_PROBABILITY,
  ]);

  const handleDashboardHintAction = useCallback((id: string) => {
    if (id === "parent-overview") {
      setActiveTab("overview");
      return;
    }
    if (id === "parent-linking") {
      setActiveTab("children");
      return;
    }
    if (id === "parent-store") {
      runTrialRestrictedAction(() => navigate("/parent-store"), "/parent-store");
    }
  }, [navigate, runTrialRestrictedAction]);

  const dismissDashboardHint = useCallback((id: string) => {
    if (activeDashboardHintId === id) {
      setActiveDashboardHintId(null);
    }
    setDismissedDashboardHints((prev) => {
      const next = { ...prev, [id]: true };
      localStorage.setItem("parentDashboardSectionHints", JSON.stringify(next));
      return next;
    });
  }, [activeDashboardHintId]);

  const surfacePanelClass = isDark
    ? "bg-slate-900/84 border-white/10 shadow-[0_22px_36px_-28px_rgba(56,189,248,0.85)]"
    : "bg-white/90 border-indigo-100/90 shadow-[0_22px_36px_-28px_rgba(79,70,229,0.38)]";
  const raisedIconButtonClass = `rounded-2xl border transition-all duration-200 active:translate-y-0.5 hover:-translate-y-0.5 ${isDark
    ? "border-slate-700 bg-slate-900/90 hover:border-sky-400/40 hover:bg-slate-800 text-gray-100 shadow-[0_14px_28px_-20px_rgba(56,189,248,0.8)]"
    : "border-indigo-200/80 bg-white hover:border-indigo-300 hover:bg-indigo-50/90 text-gray-700 shadow-[0_14px_28px_-20px_rgba(79,70,229,0.45)]"
    }`;
  const searchInputClass = isDark
    ? "bg-slate-950/85 border-slate-700/80 text-white placeholder-gray-500 shadow-[inset_0_1px_0_rgba(148,163,184,0.15)]"
    : "bg-white/95 border-indigo-100 text-gray-900 placeholder-gray-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_-14px_rgba(79,70,229,0.3)]";
  const summaryCardButtonClass = "text-start rounded-2xl focus:outline-none transition-all duration-200 hover:-translate-y-1 active:translate-y-[1px]";
  const tabsListClass = `${isDark ? "bg-slate-900/84 border-white/10" : "bg-white/92 border-indigo-100/90"} grid w-full grid-cols-5 p-1.5 rounded-2xl border shadow-[0_18px_28px_-22px_rgba(99,102,241,0.35)] gap-1.5`;
  const tabsTriggerClass = `gap-1 min-w-0 px-1 sm:px-3 text-[10px] sm:text-sm rounded-xl transition-all duration-200 data-[state=active]:text-white data-[state=active]:shadow-[0_10px_18px_-12px_rgba(79,70,229,0.9)] data-[state=active]:bg-gradient-to-r ${isDark ? "data-[state=active]:from-sky-500 data-[state=active]:to-indigo-500" : "data-[state=active]:from-indigo-500 data-[state=active]:to-sky-500"}`;
  const panelCardClass = isDark
    ? "bg-slate-900/84 border-white/10 shadow-[0_20px_34px_-28px_rgba(56,189,248,0.75)]"
    : "bg-white/95 border-indigo-100/90 shadow-[0_20px_34px_-28px_rgba(79,70,229,0.35)]";
  const quickActionButtonClass = "h-auto py-4 flex-col gap-2 hover:opacity-95 shadow-lg transition-all duration-200 hover:-translate-y-1 active:translate-y-[1px]";

  return (
    <div
      className={`relative min-h-screen overflow-x-clip pb-[max(1rem,env(safe-area-inset-bottom))] ${isDark ? "bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" : "bg-gradient-to-br from-indigo-100 via-white to-sky-100"}`}
      onClickCapture={(event) => {
        if (!isParentTrial) return;
        const target = event.target as HTMLElement | null;
        if (!target) return;
        if (!target.closest("button, a, [role='button']")) return;

        setTrialInteractionCount((prev) => {
          const next = prev + 1;
          sessionStorage.setItem("parent-trial-dashboard-click-count", String(next));
          return next;
        });
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-20 ${isRTL ? "-left-20" : "-right-20"} h-64 w-64 rounded-full blur-3xl ${isDark ? "bg-sky-500/20" : "bg-blue-300/45"}`} />
        <div className={`absolute top-1/3 ${isRTL ? "-right-24" : "-left-24"} h-72 w-72 rounded-full blur-3xl ${isDark ? "bg-indigo-500/20" : "bg-indigo-200/70"}`} />
      </div>
      <ParentWebPushRegistrar />
      <ParentMobilePushRegistrar />
      <ParentFeaturePulse />
      <Suspense fallback={null}><OnboardingWizard /></Suspense>
      <header className={`sticky top-0 z-40 ${isDark ? "bg-slate-950/85 border-white/10" : "bg-white/80 border-indigo-200/80"} border-b backdrop-blur-xl`}>
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate("/parent-profile")}
              className={`h-9 w-9 sm:h-10 sm:w-10 rounded-2xl overflow-hidden flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px] ${isDark ? "shadow-[0_16px_28px_-20px_rgba(56,189,248,0.8)]" : "shadow-[0_16px_28px_-20px_rgba(79,70,229,0.45)]"}`}
              aria-label="Profile"
              data-testid="button-header-avatar"
            >
              {parentData?.avatarUrl ? (
                <img src={parentData.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className={`h-full w-full ${isDark ? "bg-gradient-to-br from-purple-600 to-indigo-600" : "bg-gradient-to-br from-purple-500 to-indigo-500"} flex items-center justify-center`}>
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className={`text-base sm:text-xl font-extrabold tracking-tight truncate ${isDark ? "text-white" : "text-gray-900"}`}>Classify</h1>
                <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDark ? "bg-indigo-500/20 text-indigo-300 border border-indigo-400/30" : "bg-indigo-50 text-indigo-600 border border-indigo-100"}`}>
                  Parent
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t('parentDashboard.welcomeUser', { name: parentData?.name || '' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={`hidden md:flex items-center gap-1.5 p-1.5 rounded-2xl border ${surfacePanelClass}`}>
              <Button className={raisedIconButtonClass} variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle" aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}>
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <LanguageSelector />
              <PWAInstallButton variant="ghost" size="icon" showText={false} />
              <Button className={raisedIconButtonClass} variant="ghost" size="icon" onClick={() => navigate("/settings")} data-testid="button-settings" aria-label="Settings">
                <Settings className="h-5 w-5" />
              </Button>
            </div>

            <ParentNotificationBell />

            <div className="md:hidden relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileHeaderMenu((prev) => !prev)}
                data-testid="button-mobile-header-menu"
                aria-label={t("common.more", "المزيد")}
                aria-expanded={showMobileHeaderMenu}
                aria-controls="parent-dashboard-mobile-header-menu"
                className={raisedIconButtonClass}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>

              <button
                aria-label={t("common.close", "إغلاق")}
                aria-hidden={!showMobileHeaderMenu}
                className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-200 ${showMobileHeaderMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={() => setShowMobileHeaderMenu(false)}
              />
              <div
                id="parent-dashboard-mobile-header-menu"
                role="menu"
                aria-hidden={!showMobileHeaderMenu}
                className={`absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} z-50 w-[min(16rem,calc(100vw-0.75rem))] rounded-2xl border shadow-2xl p-2 backdrop-blur-sm origin-top transition-all duration-200 ${isDark ? "bg-slate-900/95 border-slate-700" : "bg-white/95 border-indigo-100"
                  } ${showMobileHeaderMenu ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`}
              >
                <button
                  onClick={() => {
                    toggleTheme();
                    setShowMobileHeaderMenu(false);
                  }}
                  role="menuitem"
                  style={{ transitionDelay: showMobileHeaderMenu ? "35ms" : "0ms" }}
                  className={`w-full px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all duration-200 ${showMobileHeaderMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"} ${isDark ? "text-gray-100 hover:bg-slate-800" : "text-gray-700 hover:bg-indigo-50"
                    }`}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{isDark ? t("settings.lightMode", "الوضع الفاتح") : t("settings.darkMode", "الوضع الداكن")}</span>
                </button>

                <div style={{ transitionDelay: showMobileHeaderMenu ? "70ms" : "0ms" }} className={`px-1 py-1 transition-all duration-200 ${showMobileHeaderMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}>
                  <LanguageSelector />
                </div>

                <div style={{ transitionDelay: showMobileHeaderMenu ? "95ms" : "0ms" }} className={`px-1 py-1 transition-all duration-200 ${showMobileHeaderMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}>
                  <PWAInstallButton variant="ghost" size="default" showText={true} />
                </div>

                <button
                  onClick={() => {
                    setShowMobileHeaderMenu(false);
                    navigate("/settings");
                  }}
                  role="menuitem"
                  style={{ transitionDelay: showMobileHeaderMenu ? "120ms" : "0ms" }}
                  className={`w-full px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all duration-200 ${showMobileHeaderMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"} ${isDark ? "text-gray-100 hover:bg-slate-800" : "text-gray-700 hover:bg-indigo-50"
                    }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>{t("settings.title", "الإعدادات")}</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileHeaderMenu(false);
                    const switcher = document.getElementById("parent-mobile-switch-account-trigger");
                    switcher?.click();
                  }}
                  role="menuitem"
                  style={{ transitionDelay: showMobileHeaderMenu ? "133ms" : "0ms" }}
                  className={`w-full px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all duration-200 ${showMobileHeaderMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"} ${isDark ? "text-gray-100 hover:bg-slate-800" : "text-gray-700 hover:bg-indigo-50"
                    }`}
                >
                  <Repeat className="h-4 w-4" />
                  <span>{t("switchAccount")}</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileHeaderMenu(false);
                    setShowLogoutConfirm(true);
                  }}
                  role="menuitem"
                  style={{ transitionDelay: showMobileHeaderMenu ? "145ms" : "0ms" }}
                  className={`w-full px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all duration-200 ${showMobileHeaderMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"} text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10`}
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t("parentDashboard.logout", "تسجيل الخروج")}</span>
                </button>
              </div>
            </div>

            <AccountSwitcherDialog
              currentRole="parent"
              triggerId="parent-mobile-switch-account-trigger"
              className="hidden"
            />

            <AccountSwitcherDialog
              currentRole="parent"
              className={`hidden sm:inline-flex ${raisedIconButtonClass} text-indigo-500 hover:text-indigo-600`}
            />

            <Button variant="ghost" size="icon" onClick={() => setShowLogoutConfirm(true)} className={`hidden sm:inline-flex ${raisedIconButtonClass} text-red-500 hover:text-red-600`} data-testid="button-logout" aria-label="Logout">
              <LogOut className="h-5 w-5" />
            </Button>

            <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('parentDashboard.logoutTitle', 'تسجيل الخروج')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('parentDashboard.logoutConfirm', 'هل أنت متأكد أنك تريد تسجيل الخروج؟')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel', 'إلغاء')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">
                    {t('parentDashboard.logout', 'تسجيل الخروج')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <TrialUpgradePromptDialog
              open={showTrialUpgradePrompt}
              onOpenChange={setShowTrialUpgradePrompt}
              title={t("parentDashboard.linkChildren")}
              description={t("parentDashboard.noChildrenDesc")}
              helperText={`${t("socialLogin.loginWith")} ${t("socialLogin.google")} ${t("socialLogin.or")} ${t("parentAuth.register")}`}
              closeLabel={t("close")}
              registerLabel={t("parentAuth.register")}
              copyLabel={t("copy")}
              linkCodeLabel={t("parentDashboard.yourLinkCode")}
              showSocialLoginButtons={showSocialLoginButtonsByPolicy}
              isDark={isDark}
              onRegister={() => {
                setShowTrialUpgradePrompt(false);
                localStorage.removeItem("token");
                localStorage.removeItem("userId");
                localStorage.removeItem("deviceTrusted");
                localStorage.removeItem("parentAccountClassification");
                navigate(`/parent-auth?mode=register&redirect=${encodeURIComponent(trialBlockedDestination || "/parent-dashboard")}`);
              }}
            />
          </div>
        </div>
      </header>

      {/* Search Box + Quick Access Icons */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4">
        <div className={`flex items-center gap-2 rounded-[1.35rem] border p-2 ${surfacePanelClass}`}>
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-400"}`} />
            <input
              type="text"
              value={dashboardSearch}
              onChange={(e) => {
                setDashboardSearch(e.target.value);
                setShowSearchResults(e.target.value.length >= 2);
              }}
              onFocus={() => dashboardSearch.length >= 2 && setShowSearchResults(true)}
              placeholder={t('parentDashboard.searchPlaceholder', 'ابحث عن مدارس، معلمين، مهام...')}
              className={`w-full pr-10 pl-10 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all ${searchInputClass}`}
            />
            {dashboardSearch && (
              <button onClick={() => { setDashboardSearch(""); setShowSearchResults(false); }} className="absolute left-3 top-1/2 -translate-y-1/2">
                <X className={`h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-400"}`} />
              </button>
            )}
          </div>

          {/* Quick Access: School */}
          <div className="relative" data-quick-access>
            <button
              onClick={handleSchoolIconClick}
              className={`${raisedIconButtonClass} relative p-2.5 ${isDark ? "hover:border-blue-400/60" : "hover:border-blue-300"}`}
              title={t('parentDashboard.mySchools', 'مدارسي')}
            >
              <School className={`h-5 w-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
              {newSchoolCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {newSchoolCount > 9 ? "9+" : newSchoolCount}
                </span>
              )}
            </button>
            {/* School Dropdown */}
            {showSchoolDropdown && (
              <div className={`absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} w-[min(16rem,calc(100vw-2rem))] sm:w-64 rounded-xl border shadow-2xl z-50 overflow-hidden ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className={`px-3 py-2 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`}>
                  <p className={`text-xs font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}>🏫 {t('parentDashboard.followedSchools', 'المدارس المتابَعة')}</p>
                </div>
                {followedSchools.length === 0 ? (
                  <p className={`text-center py-4 text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t('parentDashboard.noFollowedSchools', 'لا توجد مدارس متابَعة')}</p>
                ) : (
                  followedSchools.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        markSeenMutation.mutate("school");
                        navigate(`/school/${s.entityId}`);
                        setShowSchoolDropdown(false);
                      }}
                      className={`w-full ${isRTL ? "text-right" : "text-left"} px-3 py-2.5 flex items-center gap-3 transition-colors ${isDark ? "text-gray-200 hover:bg-gray-800" : "text-gray-700 hover:bg-blue-50"}`}
                    >
                      {s.entityImage ? (
                        <img src={s.entityImage} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isDark ? "bg-blue-900" : "bg-blue-100"}`}>
                          <School className="h-4 w-4 text-blue-500" />
                        </div>
                      )}
                      <span className="text-sm font-medium truncate flex-1">{s.entityName}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quick Access: Teacher */}
          <div className="relative" data-quick-access>
            <button
              onClick={handleTeacherIconClick}
              className={`${raisedIconButtonClass} relative p-2.5 ${isDark ? "hover:border-purple-400/60" : "hover:border-purple-300"}`}
              title={t('parentDashboard.myTeachers', 'معلميّ')}
            >
              <GraduationCap className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
              {newTeacherCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {newTeacherCount > 9 ? "9+" : newTeacherCount}
                </span>
              )}
            </button>
            {/* Teacher Dropdown */}
            {showTeacherDropdown && (
              <div className={`absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} w-[min(16rem,calc(100vw-2rem))] sm:w-64 rounded-xl border shadow-2xl z-50 overflow-hidden ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className={`px-3 py-2 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`}>
                  <p className={`text-xs font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}>👨‍🏫 {t('parentDashboard.followedTeachers', 'المعلمون المتابَعون')}</p>
                </div>
                {followedTeachers.length === 0 ? (
                  <p className={`text-center py-4 text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t('parentDashboard.noFollowedTeachers', 'لا يوجد معلمون متابَعون')}</p>
                ) : (
                  followedTeachers.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        markSeenMutation.mutate("teacher");
                        navigate(`/teacher/${t.entityId}`);
                        setShowTeacherDropdown(false);
                      }}
                      className={`w-full ${isRTL ? "text-right" : "text-left"} px-3 py-2.5 flex items-center gap-3 transition-colors ${isDark ? "text-gray-200 hover:bg-gray-800" : "text-gray-700 hover:bg-purple-50"}`}
                    >
                      {t.entityImage ? (
                        <img src={t.entityImage} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isDark ? "bg-purple-900" : "bg-purple-100"}`}>
                          <GraduationCap className="h-4 w-4 text-purple-500" />
                        </div>
                      )}
                      <span className="text-sm font-medium truncate flex-1">{t.entityName}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quick Access: My Account */}
          <button
            onClick={() => navigate("/parent-profile")}
            className={`${raisedIconButtonClass} relative p-2.5 ${isDark ? "hover:border-emerald-400/60" : "hover:border-emerald-300"}`}
            title={t('parentDashboard.myAccount', 'حسابي')}
          >
            <User className={`h-5 w-5 ${isDark ? "text-green-400" : "text-green-600"}`} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </button>
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && dashboardSearch.length >= 2 && (
          <div className={`mt-2 rounded-2xl border max-h-80 overflow-y-auto z-50 relative ${surfacePanelClass}`}>
            {searchLoading && (
              <p className={`text-center py-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("parentDashboard.searching")}</p>
            )}

            {/* Schools */}
            {searchResults?.schools?.length > 0 && (
              <div>
                <p className={`px-3 pt-2 pb-1 text-xs font-bold ${isDark ? "text-gray-500" : "text-gray-400"}`}>🏫 {t("parentDashboard.schools")}</p>
                {searchResults.schools.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => { navigate(`/school/${s.id}`); setShowSearchResults(false); setDashboardSearch(""); }}
                    className={`w-full text-right px-3 py-2.5 flex items-center gap-3 hover:bg-blue-500 hover:text-white transition-colors ${isDark ? "text-gray-200" : "text-gray-700"}`}
                  >
                    <School className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs opacity-70">{s.governorate || ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Teachers */}
            {searchResults?.teachers?.length > 0 && (
              <div>
                <p className={`px-3 pt-2 pb-1 text-xs font-bold ${isDark ? "text-gray-500" : "text-gray-400"}`}>👨‍🏫 {t("parentDashboard.teachers")}</p>
                {searchResults.teachers.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => { navigate(`/teacher/${t.id}`); setShowSearchResults(false); setDashboardSearch(""); }}
                    className={`w-full text-right px-3 py-2.5 flex items-center gap-3 hover:bg-blue-500 hover:text-white transition-colors ${isDark ? "text-gray-200" : "text-gray-700"}`}
                  >
                    <GraduationCap className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs opacity-70">{t.subject || ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Tasks */}
            {searchResults?.tasks?.length > 0 && (
              <div>
                <p className={`px-3 pt-2 pb-1 text-xs font-bold ${isDark ? "text-gray-500" : "text-gray-400"}`}>📝 {t("parentDashboard.tasks")}</p>
                {searchResults.tasks.map((task: any) => (
                  <button
                    key={task.id}
                    onClick={() => { navigate(`/teacher/${task.teacherId}`); setShowSearchResults(false); setDashboardSearch(""); }}
                    className={`w-full text-right px-3 py-2.5 flex items-center gap-3 hover:bg-blue-500 hover:text-white transition-colors ${isDark ? "text-gray-200" : "text-gray-700"}`}
                  >
                    <BookOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs opacity-70">{task.subjectLabel || ""} • {task.price} {t("parentDashboard.currency")}</p>
                    </div>
                    <Heart className="h-3 w-3 opacity-50 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {!searchLoading && searchResults && !searchResults.schools?.length && !searchResults.teachers?.length && !searchResults.tasks?.length && (
              <p className={`text-center py-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("parentDashboard.noResultsFor", { query: dashboardSearch })}</p>
            )}
          </div>
        )}
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-7 space-y-6">
        <ParentQuickStartChecklist token={token} />

        {visibleDashboardHints.length > 0 && (
          <section className="pointer-events-none fixed inset-x-0 top-[5.25rem] z-[70] px-3 sm:px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
                {visibleDashboardHints.map((hint) => (
                  <SectionExplainerCard
                    key={hint.id}
                    id={hint.id}
                    icon={hint.icon}
                    title={hint.title}
                    description={hint.description}
                    onDismiss={dismissDashboardHint}
                    onAutoHide={(hintId) => {
                      if (activeDashboardHintId === hintId) {
                        setActiveDashboardHintId(null);
                      }
                    }}
                    autoHideMs={1500}
                    onAction={handleDashboardHintAction}
                    isDark={isDark}
                    tone="parent"
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => setActiveTab("children")} className={`${summaryCardButtonClass} focus:ring-2 focus:ring-blue-400`}>
            <Card className={`${isDark ? "bg-gradient-to-br from-blue-900/70 to-indigo-900/70 border-blue-700/50" : "bg-gradient-to-br from-blue-500 to-indigo-600"} text-white border-0 h-full ring-1 ring-white/20 shadow-[0_24px_34px_-24px_rgba(30,64,175,0.95)]`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-80">{t('parentDashboard.children')}</p>
                    <p className="text-2xl font-bold">{childrenList.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Users className="h-6 w-6 opacity-90" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>

          <button onClick={() => runTrialRestrictedAction(() => navigate("/wallet"), "/wallet")} className={`${summaryCardButtonClass} focus:ring-2 focus:ring-green-400`}>
            <Card className={`${isDark ? "bg-gradient-to-br from-emerald-900/70 to-green-900/70 border-emerald-700/50" : "bg-gradient-to-br from-emerald-500 to-green-600"} text-white border-0 h-full ring-1 ring-white/20 shadow-[0_24px_34px_-24px_rgba(5,150,105,0.95)]`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-80">{t('parentDashboard.walletBalance')}</p>
                    <p className="text-2xl font-bold">${Number(walletData?.balance || 0).toFixed(0)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Wallet className="h-6 w-6 opacity-90" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>

          <button onClick={() => setActiveTab("children")} className={`${summaryCardButtonClass} focus:ring-2 focus:ring-purple-400`}>
            <Card className={`${isDark ? "bg-gradient-to-br from-violet-900/70 to-purple-900/70 border-violet-700/50" : "bg-gradient-to-br from-violet-500 to-purple-600"} text-white border-0 h-full ring-1 ring-white/20 shadow-[0_24px_34px_-24px_rgba(126,34,206,0.95)]`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-80">{t('parentDashboard.totalPoints')}</p>
                    <p className="text-2xl font-bold">{totalChildrenPoints}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Star className="h-6 w-6 opacity-90" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>

          <button onClick={() => runTrialRestrictedAction(() => navigate("/parent-store"), "/parent-store")} className={`${summaryCardButtonClass} focus:ring-2 focus:ring-orange-400`}>
            <Card className={`${isDark ? "bg-gradient-to-br from-orange-900/70 to-amber-900/70 border-orange-700/50" : "bg-gradient-to-br from-orange-500 to-amber-500"} text-white border-0 h-full ring-1 ring-white/20 shadow-[0_24px_34px_-24px_rgba(217,119,6,0.95)]`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-80">{t('parentDashboard.store')}</p>
                    <p className="text-2xl font-bold">{availableInventoryCount || 0}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 opacity-90" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full">
            <TabsList className={tabsListClass}>
              <TabsTrigger value="overview" className={tabsTriggerClass} data-testid="tab-overview">
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate max-[380px]:hidden sm:inline">{t('parentDashboard.overview')}</span>
              </TabsTrigger>
              <TabsTrigger value="children" className={tabsTriggerClass} data-testid="tab-children">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate max-[380px]:hidden sm:inline">{t('parentDashboard.children')}</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className={tabsTriggerClass} data-testid="tab-tasks">
                <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate max-[380px]:hidden sm:inline">{t('parentDashboard.tasks')}</span>
              </TabsTrigger>
              <TabsTrigger value="referral" className={tabsTriggerClass} data-testid="tab-referral">
                <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate max-[380px]:hidden sm:inline">{t('parentDashboard.referrals')}</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className={tabsTriggerClass} data-testid="tab-reports">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate max-[380px]:hidden sm:inline">{t('parentDashboard.reports')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {isParentTrial && (
              <Card className={panelCardClass}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isDark ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
                      <Link2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{t("parentDashboard.noChildren")}</p>
                      <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("parentDashboard.noChildrenDesc")}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" className="gap-2" onClick={() => setActiveTab("children")}>
                          <Users className="h-4 w-4" />
                          {t("parentDashboard.linkChildren")}
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowQR(true)}>
                          <QrCode className="h-4 w-4" />
                          {t("parentDashboard.showQRCode")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={panelCardClass}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-blue-500" />
                    {t('parentDashboard.linkChildren')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`${isDark ? "bg-slate-800 border border-slate-700" : "bg-indigo-50 border border-indigo-100"} p-4 rounded-2xl text-center`}>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"} mb-2`}>{t('parentDashboard.yourLinkCode')}</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-3xl font-mono font-bold text-blue-500 tracking-widest">
                        {showLinkCode
                          ? (parentData?.uniqueCode || "...")
                          : (parentData?.uniqueCode ? "●".repeat(parentData.uniqueCode.length) : "...")}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowLinkCode(!showLinkCode)}
                        data-testid="button-toggle-code"
                      >
                        {showLinkCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyCode(parentData?.uniqueCode || "")}
                        data-testid="button-copy-code"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowQR(true)}
                    className="w-full gap-2"
                    variant="outline"
                    data-testid="button-show-qr"
                  >
                    <QrCode className="h-4 w-4" />
                    {t('parentDashboard.showQRCode')}
                  </Button>
                </CardContent>
              </Card>

              <Card className={panelCardClass}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    {t('parentDashboard.quickActions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => runTrialRestrictedAction(() => navigate("/parent-tasks"), "/parent-tasks")}
                      className={`${quickActionButtonClass} bg-gradient-to-br from-blue-500 to-indigo-600`}
                      data-testid="button-create-task"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-xs">{t('parentDashboard.createTask')}</span>
                    </Button>
                    <Button
                      onClick={() => runTrialRestrictedAction(() => navigate("/wallet"), "/wallet")}
                      className={`${quickActionButtonClass} bg-gradient-to-br from-violet-500 to-purple-600`}
                      data-testid="button-wallet"
                    >
                      <Wallet className="h-5 w-5" />
                      <span className="text-xs">{t('parentDashboard.wallet')}</span>
                    </Button>
                    <Button
                      onClick={() => runTrialRestrictedAction(() => navigate("/subjects"), "/subjects")}
                      className={`${quickActionButtonClass} bg-gradient-to-br from-indigo-500 to-sky-600`}
                      data-testid="button-subjects"
                    >
                      <BookOpen className="h-5 w-5" />
                      <span className="text-xs">{t('parentDashboard.subjects')}</span>
                    </Button>
                    <Button
                      onClick={() => setShowSpouseLinkCard((prev) => !prev)}
                      className={`${quickActionButtonClass} bg-gradient-to-br from-cyan-500 to-blue-600`}
                      data-testid="button-toggle-parent-link-card"
                    >
                      <KeyRound className="h-5 w-5" />
                      <span className="text-xs">{t("parentDashboard.linkParentPartnerButton")}</span>
                    </Button>
                  </div>

                  {showSpouseLinkCard && (
                    <div dir={isRTL ? "rtl" : "ltr"} className={`mt-3 rounded-xl border p-4 space-y-4 relative isolate overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : "bg-blue-50 border-blue-200"}`}>
                      {showPartnerLinkTip && (
                        <div className={`rounded-lg border p-3 ${isDark ? "bg-blue-900/30 border-blue-800 text-blue-100" : "bg-blue-100 border-blue-300 text-blue-900"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-xs leading-5 font-medium">
                              {t("parentDashboard.spouseLinkTip")}
                            </p>
                            <Button variant="ghost" size="sm" onClick={dismissPartnerLinkTip} className="h-7 px-2 text-xs" data-testid="button-dismiss-partner-link-tip">
                              {t("parentDashboard.spouseLinkDismiss")}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-blue-500" />
                        <p className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                          {t("parentDashboard.spouseLinkTitle")}
                        </p>
                      </div>

                      <ol className={`text-xs space-y-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        <li>{t("parentDashboard.spouseLinkStep1")}</li>
                        <li>{t("parentDashboard.spouseLinkStep2")}</li>
                        <li>{t("parentDashboard.spouseLinkStep3")}</li>
                      </ol>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                        <div className={`rounded-lg border p-3 space-y-3 overflow-hidden ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-blue-200"}`}>
                          <p className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {t("parentDashboard.spouseLinkPrimaryTitle")}
                          </p>
                          <Button
                            type="button"
                            onClick={() => generatePartnerLinkCodeMutation.mutate()}
                            className="w-full gap-2 relative z-10 bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                            disabled={generatePartnerLinkCodeMutation.isPending}
                            data-testid="button-generate-partner-link-code"
                          >
                            <KeyRound className="h-4 w-4" />
                            {generatePartnerLinkCodeMutation.isPending
                              ? t("parentDashboard.spouseLinkGenerating")
                              : t("parentDashboard.spouseLinkGeneratePrimary")}
                          </Button>

                          {generatedPartnerCode && (
                            <div className={`rounded-lg p-3 border ${isDark ? "bg-gray-950 border-gray-700" : "bg-blue-50 border-blue-200"}`}>
                              <p className={`text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {t("parentDashboard.spouseLinkCodeLabel")}
                              </p>
                              <div className={`flex flex-col sm:flex-row gap-2 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
                                <code className="flex-1 text-base font-mono font-bold tracking-wider text-blue-500 break-all">{generatedPartnerCode}</code>
                                <Button type="button" variant="outline" size="sm" className="bg-white text-gray-800 border-gray-300 hover:bg-gray-100" onClick={copyGeneratedPartnerCode} data-testid="button-copy-partner-link-code">
                                  {t("parentDashboard.spouseLinkCopy")}
                                </Button>
                                <Button type="button" variant="outline" size="sm" className="bg-white text-gray-800 border-gray-300 hover:bg-gray-100" onClick={sharePartnerCodeOnWhatsApp} data-testid="button-share-partner-link-code-whatsapp">
                                  {t("parentDashboard.spouseLinkWhatsApp")}
                                </Button>
                              </div>
                              {generatedPartnerCodeExpiresAt && (
                                <p className={`text-[11px] mt-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                  {t("parentDashboard.spouseLinkExpiresAt")} {new Date(generatedPartnerCodeExpiresAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className={`rounded-lg border p-3 space-y-2 overflow-hidden ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-blue-200"}`}>
                          <label className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {t("parentDashboard.spouseLinkSecondaryTitle")}
                          </label>
                          <label className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {t("parentDashboard.spouseLinkInputLabel")}
                          </label>
                          <div className={`flex flex-col sm:flex-row gap-2 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
                            <input
                              value={partnerLinkCodeInput}
                              onChange={(e) => setPartnerLinkCodeInput(e.target.value.toUpperCase())}
                              placeholder={t("parentDashboard.spouseLinkInputPlaceholder")}
                              className={`flex-1 px-3 py-2 rounded-lg border text-sm ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                              data-testid="input-partner-link-code"
                            />
                            <Button
                              type="button"
                              onClick={() => syncWithPartnerCodeMutation.mutate(partnerLinkCodeInput.trim())}
                              disabled={!partnerLinkCodeInput.trim() || syncWithPartnerCodeMutation.isPending}
                              className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
                              data-testid="button-submit-partner-link-code"
                            >
                              {syncWithPartnerCodeMutation.isPending
                                ? t("parentDashboard.spouseLinkSending")
                                : t("parentDashboard.spouseLinkSend")}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className={`rounded-lg border p-3 space-y-3 ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-blue-200"}`}>
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-cyan-500" />
                          <p className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {t("parentDashboard.spouseLinkStatusTitle", { defaultValue: "حالة ربط العائلة" })}
                          </p>
                        </div>

                        {syncRows.length === 0 ? (
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {t("parentDashboard.spouseLinkNoActive", { defaultValue: "لا يوجد ربط نشط حالياً" })}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {syncRows.map((sync: any) => {
                              const sharedCount = Array.isArray(sync?.sharedChildren) ? sync.sharedChildren.length : 0;
                              return (
                                <div key={sync.id} className={`rounded-md border p-2 ${isDark ? "border-gray-700 bg-gray-950" : "border-gray-200 bg-gray-50"}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={`text-xs font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                                      {sync.secondaryParentName || t("parentDashboard.spouseLinkUnknownParent", { defaultValue: "ولي أمر" })}
                                    </p>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${sync.syncStatus === "active" ? "bg-emerald-100 text-emerald-700" : sync.syncStatus === "revoked" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                      {sync.syncStatus}
                                    </span>
                                  </div>
                                  <p className={`text-[11px] mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                    {t("parentDashboard.spouseLinkSharedChildrenCount", { defaultValue: "عدد الأطفال المشاركين" })}: {sharedCount}
                                  </p>
                                  {sync.syncStatus === "active" && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="mt-2 h-7 px-3 text-xs"
                                      onClick={() => revokeFamilySyncMutation.mutate(sync.id)}
                                      disabled={revokeFamilySyncMutation.isPending}
                                      data-testid={`button-revoke-family-sync-${sync.id}`}
                                    >
                                      {revokeFamilySyncMutation.isPending
                                        ? t("parentDashboard.spouseLinkRevoking", { defaultValue: "جاري الإلغاء..." })
                                        : t("parentDashboard.spouseLinkRevoke", { defaultValue: "إلغاء الربط" })}
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className={`pt-2 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                          <p className={`text-xs font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {t("parentDashboard.spouseLinkPendingRequestsTitle", { defaultValue: "طلبات الربط المعلقة" })}
                          </p>
                          {pendingFamilyRequests.length === 0 ? (
                            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {t("parentDashboard.spouseLinkNoPendingRequests", { defaultValue: "لا توجد طلبات معلقة" })}
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {pendingFamilyRequests.slice(0, 5).map((request: any) => (
                                <div key={request.id} className={`text-[11px] rounded-md px-2 py-1 ${isDark ? "bg-gray-950 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                                  {t("parentDashboard.childName", { defaultValue: "الطفل" })}: {childNameById[request.childId] || request.childId}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>

            {pendingPurchaseRequests.length > 0 && (
              <Card className={panelCardClass}>
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-purple-500" />
                    {t('parentDashboard.pendingPurchaseRequests')}
                    <Badge variant="secondary" className="bg-purple-500 text-white">{pendingPurchaseRequests.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingPurchaseRequests.map((request: any) => (
                      <div
                        key={request.id}
                        className={`p-4 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-purple-50 border-purple-200"}`}
                        data-testid={`purchase-request-${request.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-white"}`}>
                            {request.product?.image ? (
                              <img src={request.product.image} alt="" className="h-10 w-10 object-cover rounded" />
                            ) : (
                              <Package className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {request.child?.name}
                              </span>
                              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                {t('parentDashboard.wantsToBuy')}
                              </span>
                            </div>
                            <p className={`font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
                              {request.product?.nameAr || request.product?.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-yellow-100 text-yellow-700">
                                <Star className="h-3 w-3 ml-1" />
                                {request.pointsPrice} {t('parentDashboard.points')}
                              </Badge>
                              {(() => {
                                const discountSummary = getRequestDiscountSummary(request);
                                if (!discountSummary) return null;
                                return (
                                  <>
                                    <Badge variant="outline" className="border-gray-300 text-gray-600">
                                      <span className="line-through">{discountSummary.originalPoints}</span>
                                    </Badge>
                                    <Badge className="bg-emerald-100 text-emerald-700">
                                      {isRTL ? `خصم ${discountSummary.discountPercent}%` : `${discountSummary.discountPercent}% off`}
                                    </Badge>
                                  </>
                                );
                              })()}
                              {request.libraryProductId && (
                                <Badge className="bg-purple-100 text-purple-700">
                                  {t('parentDashboard.library')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            className="flex-1 bg-green-500 hover:bg-green-600"
                            onClick={() => openPurchaseDecisionDialog(request, "approve")}
                            disabled={purchaseDecisionMutation.isPending}
                            data-testid={`button-approve-${request.id}`}
                          >
                            <CheckCircle className="h-4 w-4 ml-2" />
                            {isRTL ? "مراجعة + موافقة" : "Review + Approve"}
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => openPurchaseDecisionDialog(request, "reject")}
                            disabled={purchaseDecisionMutation.isPending}
                            data-testid={`button-reject-${request.id}`}
                          >
                            <XCircle className="h-4 w-4 ml-2" />
                            {isRTL ? "مراجعة + رفض" : "Review + Reject"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Dialog open={showPurchaseDecisionDialog} onOpenChange={setShowPurchaseDecisionDialog}>
              <DialogContent className={isDark ? "bg-gray-900 border-gray-700" : "bg-white"}>
                <DialogHeader>
                  <DialogTitle>
                    {purchaseDecisionMode === "approve"
                      ? (isRTL ? "مراجعة طلب الشراء قبل الموافقة" : "Review purchase before approval")
                      : (isRTL ? "مراجعة طلب الشراء قبل الرفض" : "Review purchase before rejection")}
                  </DialogTitle>
                </DialogHeader>

                {selectedPurchaseRequest && (
                  <div className="space-y-3">
                    <div className={`rounded-lg border p-3 ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
                      <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {selectedPurchaseRequest.child?.name} - {selectedPurchaseRequest.product?.nameAr || selectedPurchaseRequest.product?.name}
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {isRTL ? "النقاط المطلوبة" : "Requested points"}: {selectedPurchaseRequest.pointsPrice}
                      </p>
                      {(() => {
                        const discountSummary = getRequestDiscountSummary(selectedPurchaseRequest);
                        if (!discountSummary) return null;
                        return (
                          <div className={`mt-2 text-xs space-y-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            <p>
                              {isRTL ? "قبل الخصم" : "Before discount"}: {discountSummary.originalPoints} {t('parentDashboard.points')}
                            </p>
                            <p>
                              {isRTL ? "الخصم" : "Discount"}: {discountSummary.discountPercent}% ({discountSummary.discountPoints} {t('parentDashboard.points')})
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={purchaseDecisionMode === "approve" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setPurchaseDecisionMode("approve")}
                      >
                        {isRTL ? "موافقة" : "Approve"}
                      </Button>
                      <Button
                        type="button"
                        variant={purchaseDecisionMode === "reject" ? "destructive" : "outline"}
                        className="flex-1"
                        onClick={() => setPurchaseDecisionMode("reject")}
                      >
                        {isRTL ? "رفض" : "Reject"}
                      </Button>
                    </div>

                    {purchaseDecisionMode === "approve" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          value={purchaseShippingForm.name}
                          onChange={(e) => setPurchaseShippingForm((prev) => ({ ...prev, name: e.target.value }))}
                          className={`h-10 rounded-lg border px-3 text-sm ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                          placeholder={isRTL ? "اسم المستلم" : "Recipient name"}
                          data-testid="input-purchase-name"
                        />
                        <input
                          value={purchaseShippingForm.phone}
                          onChange={(e) => setPurchaseShippingForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className={`h-10 rounded-lg border px-3 text-sm ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                          placeholder={isRTL ? "رقم الهاتف" : "Phone number"}
                          data-testid="input-purchase-phone"
                        />
                        <input
                          value={purchaseShippingForm.city}
                          onChange={(e) => setPurchaseShippingForm((prev) => ({ ...prev, city: e.target.value }))}
                          className={`h-10 rounded-lg border px-3 text-sm ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                          placeholder={isRTL ? "المدينة" : "City"}
                          data-testid="input-purchase-city"
                        />
                        <input
                          value={purchaseShippingForm.area}
                          onChange={(e) => setPurchaseShippingForm((prev) => ({ ...prev, area: e.target.value }))}
                          className={`h-10 rounded-lg border px-3 text-sm ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                          placeholder={isRTL ? "الحي / المنطقة" : "Area / District"}
                          data-testid="input-purchase-area"
                        />
                        <input
                          value={purchaseShippingForm.line1}
                          onChange={(e) => setPurchaseShippingForm((prev) => ({ ...prev, line1: e.target.value }))}
                          className={`h-10 rounded-lg border px-3 text-sm sm:col-span-2 ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                          placeholder={isRTL ? "العنوان التفصيلي" : "Detailed address"}
                          data-testid="input-purchase-line1"
                        />
                        <textarea
                          value={purchaseShippingForm.notes}
                          onChange={(e) => setPurchaseShippingForm((prev) => ({ ...prev, notes: e.target.value }))}
                          className={`min-h-[72px] rounded-lg border px-3 py-2 text-sm resize-y sm:col-span-2 ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                          placeholder={isRTL ? "ملاحظات إضافية (اختياري)" : "Additional notes (optional)"}
                          data-testid="textarea-purchase-notes"
                        />
                      </div>
                    ) : (
                      <textarea
                        value={purchaseRejectReason}
                        onChange={(e) => setPurchaseRejectReason(e.target.value)}
                        className={`min-h-[92px] w-full rounded-lg border px-3 py-2 text-sm resize-y ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                        placeholder={isRTL ? "اكتب سبب الرفض الذي سيصل للطفل" : "Write rejection reason sent to child"}
                        data-testid="textarea-purchase-rejection-reason"
                      />
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setShowPurchaseDecisionDialog(false)}>
                        {isRTL ? "إلغاء" : "Cancel"}
                      </Button>
                      <Button
                        className="flex-1"
                        variant={purchaseDecisionMode === "approve" ? "default" : "destructive"}
                        onClick={confirmPurchaseDecision}
                        disabled={purchaseDecisionMutation.isPending}
                        data-testid="button-confirm-purchase-decision"
                      >
                        {purchaseDecisionMutation.isPending
                          ? (isRTL ? "جارٍ التنفيذ..." : "Processing...")
                          : purchaseDecisionMode === "approve"
                            ? (isRTL ? "تأكيد الموافقة" : "Confirm approval")
                            : (isRTL ? "تأكيد الرفض" : "Confirm rejection")}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {notificationsList.length > 0 && (
              <Card className={panelCardClass}>
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-500" />
                    {t('parentDashboard.latestNotifications')}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/notifications")} data-testid="button-view-all-notifications">
                    {t('parentDashboard.viewAll')}
                    <ChevronRight className="h-4 w-4 mr-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notificationsList.slice(0, 3).map((notif: any) => (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-3 p-3 rounded-lg ${isDark
                          ? notif.isRead ? "bg-gray-800" : "bg-gray-800/80 border border-blue-700/50"
                          : notif.isRead ? "bg-gray-50" : "bg-blue-50 border border-blue-200"
                          }`}
                        data-testid={`notification-item-${notif.id}`}
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${["task_completed", "task", "task_assigned", "task_reminder"].includes(notif.type) ? "bg-green-100 text-green-600" :
                          ["gift_activated", "gift_unlocked", "reward", "reward_unlocked", "product_assigned"].includes(notif.type) ? "bg-purple-100 text-purple-600" :
                            ["points_earned", "points_adjustment", "referral_reward"].includes(notif.type) ? "bg-yellow-100 text-yellow-600" :
                              "bg-blue-100 text-blue-600"
                          }`}>
                          {["task_completed", "task", "task_assigned", "task_reminder"].includes(notif.type) ? <Trophy className="h-5 w-5" /> :
                            ["gift_activated", "gift_unlocked", "reward", "reward_unlocked", "product_assigned"].includes(notif.type) ? <Gift className="h-5 w-5" /> :
                              ["points_earned", "points_adjustment", "referral_reward"].includes(notif.type) ? <Star className="h-5 w-5" /> :
                                <Bell className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{notif.title}</p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"} truncate`}>{notif.message || notif.body}</p>
                        </div>
                        {!notif.isRead && <Badge variant="secondary" className="bg-blue-500 text-white text-xs">{t('parentDashboard.new')}</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="children" className="mt-6 space-y-4">
            {/* PIN Status Card */}
            <Card className={panelCardClass}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-amber-500" />
                    <span className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                      {t("parentDashboard.familyPin")}
                    </span>
                    {pinData?.parentHasPin ? (
                      <Badge variant="default" className="bg-green-500 text-xs">{t("parentDashboard.pinActive")}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">{t("parentDashboard.pinInactive")}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowSetMyPin(true)}
                      variant={pinData?.parentHasPin ? "outline" : "default"}
                      size="sm"
                      className="gap-1"
                    >
                      <KeyRound className="h-3 w-3" />
                      {pinData?.parentHasPin ? t("parentDashboard.changePin") : t("parentDashboard.setPin")}
                    </Button>
                    <Button onClick={() => setShowAddChildPin(true)} size="sm" className="gap-1">
                      <Plus className="h-3 w-3" />
                      {t("parentDashboard.addChild")}
                    </Button>
                  </div>
                </div>
                {pinData?.familyCode && (
                  <p className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {t("parentDashboard.familyCodeLabel")}: {pinData.familyCode}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className={panelCardClass}>
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  {t('parentDashboard.linkedChildren')} ({childrenList.length})
                </CardTitle>
                <Button onClick={() => runTrialRestrictedAction(() => navigate("/parent-tasks"), "/parent-tasks")} size="sm" className="gap-2" data-testid="button-new-task">
                  <Plus className="h-4 w-4" />
                  {t('parentDashboard.createTask')}
                </Button>
              </CardHeader>
              <CardContent>
                {childrenList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {childrenList.map((child: any) => {
                      const childrenStatusList = statusData?.children || [];
                      const status = childrenStatusList.find((s: any) => s.id === child.id);
                      const progressPercent = status?.points ? Math.min((status.points / 1000) * 100, 100) : 0;

                      return (
                        <div
                          key={child.id}
                          className={`p-4 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-sm`}
                          data-testid={`card-child-${child.id}`}
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div className={`h-14 w-14 rounded-full ${isDark ? "bg-gray-700" : "bg-gradient-to-br from-blue-100 to-purple-100"} flex items-center justify-center`}>
                              <span className="text-2xl">👧</span>
                            </div>
                            <div className="flex-1">
                              <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{child.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={status?.status === "excellent" ? "default" : status?.status === "needs_attention" ? "destructive" : "secondary"} className="text-xs">
                                  {status?.statusMessage || t('parentDashboard.active')}
                                </Badge>
                                {(() => {
                                  const pinChild = pinData?.children?.find((c: any) => c.id === child.id);
                                  return pinChild?.hasPin ? (
                                    <Badge
                                      variant="outline"
                                      className="text-xs gap-1 border-amber-400 text-amber-600"
                                      title={pinChild.pinUpdatedAt ? `${t("pinManagement.lastUpdated", { date: new Date(pinChild.pinUpdatedAt).toLocaleDateString() })}` : ""}
                                    >
                                      <KeyRound className="h-2.5 w-2.5" /> PIN
                                    </Badge>
                                  ) : null;
                                })()}
                                {status?.speedLevel && (
                                  <span className="text-xs text-gray-500">
                                    {status.speedLevel === "superfast" ? "🚀" : status.speedLevel === "fast" ? "⚡" : status.speedLevel === "moderate" ? "📈" : "🌱"}
                                    {status.pointsPerDay} {t('parentDashboard.pointsPerDay')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-yellow-500">{status?.points || child.totalPoints || 0}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.points')}</p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span className={isDark ? "text-gray-400" : "text-gray-500"}>{t('parentDashboard.progressTo1000')}</span>
                              <span className={isDark ? "text-gray-400" : "text-gray-500"}>{progressPercent.toFixed(0)}%</span>
                            </div>
                            <Progress value={progressPercent} className="h-2" />
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className={`${isDark ? "bg-gray-700" : "bg-blue-50"} p-2 rounded-lg text-center`}>
                              <Trophy className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                              <p className="text-sm font-bold">{status?.tasksCompleted || 0}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.tasks')}</p>
                            </div>
                            <div className={`${isDark ? "bg-gray-700" : "bg-green-50"} p-2 rounded-lg text-center`}>
                              <Gamepad2 className="h-4 w-4 mx-auto text-green-500 mb-1" />
                              <p className="text-sm font-bold">{status?.gamesPlayed || 0}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.games')}</p>
                            </div>
                            <div className={`${isDark ? "bg-gray-700" : "bg-pink-50"} p-2 rounded-lg text-center`}>
                              <Gift className="h-4 w-4 mx-auto text-pink-500 mb-1" />
                              <p className="text-sm font-bold">{status?.pendingGifts || 0}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.gifts')}</p>
                            </div>
                            <div className={`${isDark ? "bg-gray-700" : "bg-yellow-50"} p-2 rounded-lg text-center`}>
                              <Clock className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                              <p className="text-sm font-bold">{status?.daysSinceJoined || 0}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.days')}</p>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <Button
                              onClick={() => navigate("/assign-task")}
                              variant="default"
                              size="sm"
                              className="w-full h-11 rounded-xl justify-center gap-2 font-semibold shadow-sm"
                              data-testid={`button-send-task-${child.id}`}
                            >
                              <Target className="h-4 w-4" />
                              {t('parentDashboard.sendTask')}
                            </Button>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <Button
                                onClick={() => runTrialRestrictedAction(() => navigate("/parent-tasks"), "/parent-tasks")}
                                variant="outline"
                                size="sm"
                                className={`h-11 rounded-xl justify-start gap-2 text-xs px-3 ${isDark ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-white border-gray-200 hover:bg-gray-50"}`}
                                title={isRTL ? "الجلسات المجدولة" : "Scheduled sessions"}
                                data-testid={`button-scheduled-sessions-${child.id}`}
                              >
                                <CalendarClock className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{isRTL ? "الجلسات" : "Sessions"}</span>
                              </Button>
                              <Button
                                onClick={() => setGamesChild(child)}
                                variant="outline"
                                size="sm"
                                className={`h-11 rounded-xl justify-start gap-2 text-xs px-3 ${isDark ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-white border-gray-200 hover:bg-gray-50"}`}
                                data-testid={`button-games-${child.id}`}
                              >
                                <Gamepad2 className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{t('parentDashboard.games')}</span>
                              </Button>
                              <Button
                                onClick={() => setScreenTimeChild(child)}
                                variant="outline"
                                size="sm"
                                className={`h-11 rounded-xl justify-start gap-2 text-xs px-3 ${isDark ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-white border-gray-200 hover:bg-gray-50"}`}
                                title={isRTL ? "وقت الشاشة" : "Screen Time"}
                                data-testid={`button-screen-time-${child.id}`}
                              >
                                <Clock className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{isRTL ? "وقت الشاشة" : "Screen Time"}</span>
                              </Button>
                              <Button
                                onClick={() => runTrialRestrictedAction(() => navigate("/parent-inventory"), "/parent-inventory")}
                                variant="outline"
                                size="sm"
                                className={`h-11 rounded-xl justify-start gap-2 text-xs px-3 ${isDark ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-white border-gray-200 hover:bg-gray-50"}`}
                                data-testid={`button-inventory-${child.id}`}
                              >
                                <Gift className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{t('parentDashboard.gifts')}</span>
                              </Button>
                            </div>

                            <div className="flex justify-end">
                              <Button
                                onClick={() => { setPinTargetChild(child); setChildPinValue(""); setShowSetPinModal(true); }}
                                variant="ghost"
                                size="sm"
                                className="h-9 rounded-lg gap-1.5 text-amber-500 hover:text-amber-600"
                                data-testid={`button-pin-${child.id}`}
                              >
                                <KeyRound className="h-4 w-4" />
                                {isRTL ? "إدارة PIN" : "Manage PIN"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`text-center py-12 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <Users className={`h-16 w-16 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                    <p className={`text-lg font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t('parentDashboard.noChildren')}</p>
                    <p className={`text-sm mt-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{t('parentDashboard.noChildrenDesc')}</p>
                    <Button onClick={() => setShowQR(true)} className="mt-4 gap-2" data-testid="button-show-qr-empty">
                      <QrCode className="h-4 w-4" />
                      {t('parentDashboard.showQRCode')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6 space-y-6">
            <Card className={panelCardClass}>
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  {t('parentDashboard.taskManagement')}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {pendingTasks} {t('parentDashboard.pending')}
                  </Badge>
                  <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                    <Check className="h-3 w-3" />
                    {completedTasks} {t('parentDashboard.completed')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Button
                    onClick={() => runTrialRestrictedAction(() => navigate("/parent-tasks"), "/parent-tasks")}
                    className="h-auto py-6 flex-col gap-2 bg-gradient-to-br from-blue-500 to-blue-600"
                    data-testid="button-tasks-section"
                  >
                    <BookOpen className="h-8 w-8" />
                    <span>{t('parentDashboard.tasksSection')}</span>
                  </Button>
                  <Button
                    onClick={() => runTrialRestrictedAction(() => navigate("/parent-tasks"), "/parent-tasks")}
                    variant="outline"
                    className="h-auto py-6 flex-col gap-2"
                    data-testid="button-create-new-task"
                  >
                    <Plus className="h-8 w-8" />
                    <span>{t('parentDashboard.createDirectTask')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {subjectsList.length > 0 && (
              <Card className={panelCardClass}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-500" />
                    {t('parentDashboard.subjects')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {subjectsList.map((subject: any) => (
                      <div
                        key={subject.id}
                        className={`p-4 rounded-xl text-center cursor-pointer transition-all hover:scale-105 ${isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-50 hover:bg-gray-100"}`}
                        style={{ borderLeft: `4px solid ${subject.color}` }}
                        onClick={() => navigate(`/subject-tasks?subject=${subject.id}`)}
                        data-testid={`subject-card-${subject.id}`}
                      >
                        <span className="text-3xl block mb-2">{subject.emoji}</span>
                        <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{subject.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {tasksBySubjectList.length > 0 ? (
              <div className="space-y-4">
                {tasksBySubjectList.map((group: any) => (
                  <Card key={group.subject?.id || "none"} className={panelCardClass}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">{group.subject?.emoji || "📋"}</span>
                        {group.subject?.name || t('parentDashboard.noSubject')}
                        <Badge variant="outline" className="mr-auto">{group.tasks?.length || 0} {t('parentDashboard.task')}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {group.tasks?.slice(0, 5).map((task: any) => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}
                            data-testid={`task-item-${task.id}`}
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${task.status === "completed" ? "bg-green-100" :
                              task.status === "pending" ? "bg-yellow-100" :
                                "bg-blue-100"
                              }`}>
                              {task.status === "completed" ? <Check className="h-4 w-4 text-green-600" /> :
                                task.status === "pending" ? <Clock className="h-4 w-4 text-yellow-600" /> :
                                  <Target className="h-4 w-4 text-blue-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}>{task.question}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                {task.child?.name || t('parentDashboard.child')} - {task.pointsReward} {t('parentDashboard.points')}
                              </p>
                            </div>
                            <Badge variant={task.status === "completed" ? "default" : task.status === "pending" ? "secondary" : "outline"}>
                              {task.status === "completed" ? t('parentDashboard.completed') : task.status === "pending" ? t('parentDashboard.pending') : t('parentDashboard.inProgress')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className={panelCardClass}>
                <CardContent className="py-8">
                  <div className="text-center">
                    <Trophy className={`h-12 w-12 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{t('parentDashboard.noTasks')}</p>
                    <p className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t('parentDashboard.createFirstTask')}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="store" className="mt-6" hidden>
            <Card className={panelCardClass}>
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-green-500" />
                  {t('parentDashboard.storeAndPurchases')}
                </CardTitle>
                <Button onClick={() => runTrialRestrictedAction(() => navigate("/parent-store"), "/parent-store")} variant="outline" size="sm" className="gap-2" data-testid="button-go-to-store">
                  {t('parentDashboard.visitStore')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {/* Visit Store */}
                  <button
                    onClick={() => runTrialRestrictedAction(() => navigate("/parent-store"), "/parent-store")}
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-5 text-white shadow-lg shadow-green-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98]"
                    data-testid="button-shop-now"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
                        <ShoppingBag className="h-7 w-7" />
                      </div>
                      <span className="text-sm font-semibold tracking-wide">{t('parentDashboard.shopNow')}</span>
                    </div>
                  </button>

                  {/* My Inventory */}
                  <button
                    onClick={() => runTrialRestrictedAction(() => navigate("/parent-inventory"), "/parent-inventory")}
                    className={`group relative overflow-hidden rounded-2xl p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ring-1 ${isDark ? "bg-gray-800/80 ring-gray-700/50 hover:bg-gray-800" : "bg-white ring-gray-200/80 hover:ring-purple-200"}`}
                    data-testid="button-my-inventory"
                  >
                    <div className="relative flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300 ${isDark ? "bg-purple-500/15 group-hover:bg-purple-500/25" : "bg-purple-50 group-hover:bg-purple-100"}`}>
                          <Package className={`h-7 w-7 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                        </div>
                        {availableInventoryCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-violet-500 px-1.5 text-[11px] font-bold text-white shadow-lg shadow-purple-500/30 ring-2 ring-white dark:ring-gray-800">
                            {availableInventoryCount}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>{t('parentDashboard.myInventory')}</span>
                    </div>
                  </button>

                  {/* Cart */}
                  <button
                    onClick={() => runTrialRestrictedAction(() => navigate("/parent-store?view=cart"), "/parent-store?view=cart")}
                    className={`group relative overflow-hidden rounded-2xl p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ring-1 ${isDark ? "bg-gray-800/80 ring-gray-700/50 hover:bg-gray-800" : "bg-white ring-gray-200/80 hover:ring-blue-200"}`}
                    data-testid="button-cart"
                  >
                    <div className="relative flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300 ${isDark ? "bg-blue-500/15 group-hover:bg-blue-500/25" : "bg-blue-50 group-hover:bg-blue-100"}`}>
                          <ShoppingBag className={`h-7 w-7 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                        </div>
                        {cartCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-1.5 text-[11px] font-bold text-white shadow-lg shadow-blue-500/30 ring-2 ring-white dark:ring-gray-800">
                            {cartCount}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>{t('parentDashboard.cart')}</span>
                    </div>
                  </button>

                  {/* My Orders */}
                  <button
                    onClick={() => runTrialRestrictedAction(() => navigate("/parent-store?view=orders"), "/parent-store?view=orders")}
                    className={`group relative overflow-hidden rounded-2xl p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ring-1 ${isDark ? "bg-gray-800/80 ring-gray-700/50 hover:bg-gray-800" : "bg-white ring-gray-200/80 hover:ring-amber-200"}`}
                    data-testid="button-orders"
                  >
                    <div className="relative flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300 ${isDark ? "bg-amber-500/15 group-hover:bg-amber-500/25" : "bg-amber-50 group-hover:bg-amber-100"}`}>
                          <Clock className={`h-7 w-7 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
                        </div>
                        {activeOrdersCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 text-[11px] font-bold text-white shadow-lg shadow-amber-500/30 ring-2 ring-white dark:ring-gray-800">
                            {activeOrdersCount}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>{t('parentDashboard.myOrders')}</span>
                    </div>
                  </button>
                </div>

                {ordersList.length > 0 && (
                  <>
                    <h3 className={`font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>{t('parentDashboard.recentOrders')}</h3>
                    <div className="space-y-2">
                      {ordersList.slice(0, 3).map((order: any) => (
                        <div
                          key={order.id}
                          className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}
                          data-testid={`order-item-${order.id}`}
                        >
                          <div className={`h-10 w-10 rounded-lg ${isDark ? "bg-gray-700" : "bg-white"} flex items-center justify-center`}>
                            <ShoppingBag className="h-5 w-5 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{t('parentDashboard.order')} #{order.id?.slice(0, 8)}</p>
                            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>${order.totalAmount}</p>
                          </div>
                          <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                            {order.status === "completed" ? t('parentDashboard.completed') : t('parentDashboard.processing')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referral" className="mt-6 space-y-6">
            {/* Referral Code & Share Section */}
            <Card className={panelCardClass}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-purple-500" />
                  {t('parentDashboard.referralProgram')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`${isDark ? "bg-gradient-to-br from-purple-900/50 to-indigo-900/50" : "bg-gradient-to-br from-purple-500 to-indigo-600"} rounded-xl p-6 text-white mb-6`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                      <Gift className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">
                        {t('parentDashboard.earn100Points').replace('100', String(referralData?.settings?.pointsPerReferral || 100))}
                      </h3>
                      <p className="text-sm opacity-90">{t('parentDashboard.perFriendSignup')}</p>
                    </div>
                  </div>
                  {/* Referral Code */}
                  <div className="flex items-center gap-2 bg-white/20 rounded-lg p-3 mb-3">
                    <p className="flex-1 font-mono text-lg">{referralData?.referralCode || parentData?.uniqueCode || "..."}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyCode(referralData?.referralCode || parentData?.uniqueCode || "")}
                      data-testid="button-copy-referral"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  {/* Referral Link - Visible */}
                  {referralData?.shareLink && (
                    <div className="bg-white/10 rounded-lg p-3 mb-3">
                      <p className="text-xs opacity-70 mb-1">{t("parentDashboard.yourReferralLink")}</p>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 font-mono text-sm break-all select-all text-yellow-200" dir="ltr">
                          {referralData.shareLink}
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(referralData.shareLink);
                            toast({ title: t('parentDashboard.linkCopied') });
                          }}
                          data-testid="button-copy-referral-link"
                        >
                          {<Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* Share Referral Link on Social Media */}
                  {referralData?.shareLink && (
                    <div className="space-y-2">
                      <p className="text-xs opacity-80">{t('parentDashboard.shareReferralCode')}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1 bg-green-500 hover:bg-green-600 text-white border-0"
                          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(t('parentDashboard.referralShareText') + ' ' + referralData.shareLink)}`, '_blank')}
                        >
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1 bg-blue-600 hover:bg-blue-700 text-white border-0"
                          onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralData.shareLink)}`, '_blank')}
                        >
                          Facebook
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1 bg-sky-500 hover:bg-sky-600 text-white border-0"
                          onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(t('parentDashboard.referralShareText') + ' ' + referralData.shareLink)}`, '_blank')}
                        >
                          X / Twitter
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1 bg-blue-400 hover:bg-blue-500 text-white border-0"
                          onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralData.shareLink)}&text=${encodeURIComponent(t('parentDashboard.referralShareText'))}`, '_blank')}
                        >
                          Telegram
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1"
                          onClick={() => {
                            navigator.clipboard.writeText(referralData.shareLink);
                            toast({ title: t('parentDashboard.linkCopied') });
                          }}
                        >
                          <Copy className="h-3 w-3" /> {t('parentDashboard.copyLink')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-xl text-center`}>
                    <p className="text-2xl font-bold text-blue-500">{referralData?.totalReferrals || 0}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.totalReferrals')}</p>
                  </div>
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-xl text-center`}>
                    <p className="text-2xl font-bold text-green-500">{referralData?.activeReferrals || 0}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.activeReferrals')}</p>
                  </div>
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-xl text-center`}>
                    <p className="text-2xl font-bold text-purple-500">{referralData?.pointsEarned || 0}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.earnedFromReferrals')}</p>
                  </div>
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-xl text-center`}>
                    <p className="text-2xl font-bold text-amber-500">{referralData?.totalAdSharePoints || 0}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.adSharePoints')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ads Section */}
            {parentAdsList.length > 0 && (
              <Card className={panelCardClass}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-orange-500" />
                    {t('parentDashboard.adsToShare')}
                    <Badge variant="secondary" className="text-xs">
                      +{referralData?.settings?.pointsPerAdShare || 10} {t('parentDashboard.pointsPerShare')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {parentAdsList.map((ad: any) => (
                      <div
                        key={ad.id}
                        className={`rounded-xl border p-4 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                      >
                        <div className="flex items-start gap-4">
                          {ad.imageUrl && (
                            <img
                              src={ad.imageUrl}
                              alt={ad.title}
                              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-base mb-1">{ad.title}</h4>
                            <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {ad.content?.length > 120 ? ad.content.substring(0, 120) + "..." : ad.content}
                            </p>
                            {ad.linkUrl && (
                              <a
                                href={/^https?:\/\//i.test(ad.linkUrl) ? ad.linkUrl : `https://${ad.linkUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-500 hover:underline flex items-center gap-1 mb-3"
                                onClick={() => {
                                  fetch(`/api/ads/${ad.id}/click`, {
                                    method: "POST",
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                }}
                              >
                                <ExternalLink className="h-3 w-3" /> {t('parentDashboard.viewAd')}
                              </a>
                            )}
                            {/* Share Buttons */}
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const safeLink = ad.linkUrl ? (/^https?:\/\//i.test(ad.linkUrl) ? ad.linkUrl : `https://${ad.linkUrl}`) : '';
                                return [
                                  { platform: "whatsapp", label: "WhatsApp", color: "bg-green-500 hover:bg-green-600", url: `https://wa.me/?text=${encodeURIComponent(ad.title + (safeLink ? ' ' + safeLink : ''))}` },
                                  { platform: "facebook", label: "Facebook", color: "bg-blue-600 hover:bg-blue-700", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(safeLink || window.location.origin)}` },
                                  { platform: "twitter", label: "X", color: "bg-gray-800 hover:bg-gray-900", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(ad.title + (safeLink ? ' ' + safeLink : ''))}` },
                                  { platform: "telegram", label: "Telegram", color: "bg-blue-400 hover:bg-blue-500", url: `https://t.me/share/url?url=${encodeURIComponent(safeLink || window.location.origin)}&text=${encodeURIComponent(ad.title)}` },
                                ];
                              })().map(({ platform, label, color, url }) => (
                                <Button
                                  key={platform}
                                  size="sm"
                                  className={`text-xs text-white border-0 ${color}`}
                                  onClick={() => {
                                    window.open(url, '_blank');
                                    fetch(`/api/parent/ads/${ad.id}/share`, {
                                      method: "POST",
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({ platform }),
                                    }).then(() => {
                                      queryClient.invalidateQueries({ queryKey: ["/api/parent/referral-stats"] });
                                      queryClient.invalidateQueries({ queryKey: ["/api/parent/ads"] });
                                      toast({ title: `+${referralData?.settings?.pointsPerAdShare || 10} ${t('parentDashboard.pointsEarned')}` });
                                    });
                                  }}
                                >
                                  {label}
                                </Button>
                              ))}
                            </div>
                            {ad.myShares > 0 && (
                              <p className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                {t('parentDashboard.sharedTimes', { count: ad.myShares })} — +{ad.mySharePoints} {t('parentDashboard.points')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="mt-6 space-y-6">
            {/* Child Selector */}
            {childrenList.length > 1 && (
              <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-900 border border-gray-800" : "bg-white border"}`}>
                <Users className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <span className={`text-sm font-medium flex-shrink-0 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {t('parentDashboard.selectChild')}
                </span>
                <select
                  value={selectedReportChild}
                  onChange={(e) => setSelectedReportChild(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${isDark
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-200 text-gray-900"
                    }`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                  data-testid="select-report-child"
                >
                  <option value="all">{t('parentDashboard.allChildren')}</option>
                  {childrenList.map((child: any) => (
                    <option key={child.id} value={String(child.id)}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Card className={panelCardClass}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  {t('parentDashboard.childReports')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {childrenList.length > 0 ? (
                  <div className="space-y-6">
                    {(selectedReportChild === "all"
                      ? childrenList
                      : childrenList.filter((c: any) => String(c.id) === selectedReportChild)
                    ).map((child: any) => (
                      <ChildReportCard key={child.id} child={child} token={token} isDark={isDark} t={t} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                      {t('parentDashboard.noChildren')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Annual Report Chart - shown when a single child is selected */}
            {selectedReportChild !== "all" && (
              <Card className={panelCardClass}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    {t('parentDashboard.annualReport')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}>
                    <AnnualReportChart childId={selectedReportChild} isParentView={true} />
                  </Suspense>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowQR(false)}>
          <div
            className={`${isDark ? "bg-gray-900" : "bg-white"} rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{t('parentDashboard.qrCode')}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowQR(false)} aria-label="Close QR code modal">
                <span className="text-xl">&times;</span>
              </Button>
            </div>
            <div className={`${isDark ? "bg-white" : "bg-gray-100"} p-6 rounded-xl inline-block mb-4`}>
              <Suspense fallback={<div className="w-[180px] h-[180px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
                <QRCodeSVG value={parentData?.uniqueCode || "PARENT"} size={180} />
              </Suspense>
            </div>
            <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t('parentDashboard.scanWithChild')}
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <p className="text-2xl font-mono font-bold text-blue-500 tracking-widest">
                {showLinkCode
                  ? (parentData?.uniqueCode || "...")
                  : (parentData?.uniqueCode ? "●".repeat(parentData.uniqueCode.length) : "...")}
              </p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLinkCode(!showLinkCode)}
                data-testid="button-toggle-code-modal"
                aria-label={showLinkCode ? "Hide link code" : "Show link code"}
              >
                {showLinkCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyCode(parentData?.uniqueCode || "")}
                aria-label="Copy link code"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={() => setShowQR(false)} className="w-full" data-testid="button-close-qr">
              {t('parentDashboard.closeQR')}
            </Button>
          </div>
        </div>
      )}

      {/* Child Games Control Dialog */}
      {gamesChild && (
        <Suspense fallback={null}>
          <ChildGamesControl
            childId={gamesChild.id}
            childName={gamesChild.name}
            token={token || ""}
            onClose={() => setGamesChild(null)}
          />
        </Suspense>
      )}

      {/* Screen Time Dialog */}
      <Suspense fallback={null}>
        <ScreenTimeDialog
          child={screenTimeChild}
          open={!!screenTimeChild}
          onClose={() => setScreenTimeChild(null)}
        />
      </Suspense>

      {/* Add Child with PIN Modal - Multi-Step */}
      {showAddChildPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <Plus className="h-5 w-5 text-blue-500" /> {t("parentDashboard.addNewChild")}
            </h3>

            {/* Step indicators */}
            <div className="flex gap-2 mb-4">
              {[1, 2].map(step => (
                <div key={step} className={`flex-1 h-1.5 rounded-full transition-colors ${step <= addChildStep ? "bg-blue-500" : isDark ? "bg-gray-700" : "bg-gray-200"
                  }`} />
              ))}
            </div>

            {/* Step 1: Basic Info */}
            {addChildStep === 1 && (
              <div className="space-y-4">
                <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("parentDashboard.step1BasicInfo")}</p>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("parentDashboard.childName")}
                  </label>
                  <input
                    type="text"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder={t("parentDashboard.childNamePlaceholder")}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("parentDashboard.pinCode4Digits")}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={newChildPin}
                    onChange={(e) => setNewChildPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="1234"
                    maxLength={4}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 text-center text-xl tracking-widest font-mono ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {t("parentDashboard.childWillUsePin")}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => setAddChildStep(2)}
                    disabled={!newChildName.trim() || newChildPin.length < 4}
                    className="flex-1"
                  >
                    {t("parentDashboard.next")}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowAddChildPin(false); setNewChildName(""); setNewChildPin(""); setAddChildStep(1); }}>
                    {t("parentDashboard.cancel")}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Academic Info (Optional) */}
            {addChildStep === 2 && (
              <div className="space-y-4">
                <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("parentDashboard.step2OptionalInfo")}</p>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("parentDashboard.birthday")}
                  </label>
                  <input
                    type="date"
                    value={newChildBirthday}
                    onChange={(e) => setNewChildBirthday(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("parentDashboard.governorate")}
                  </label>
                  <GovernorateSelect
                    value={newChildGovernorate}
                    onChange={setNewChildGovernorate}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("parentDashboard.academicYear")}
                  </label>
                  <select
                    value={newChildGrade}
                    onChange={(e) => setNewChildGrade(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  >
                    <option value="">{t("parentDashboard.selectGrade")}</option>
                    {ACADEMIC_GRADES.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("parentDashboard.school")}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newChildSchoolName || newChildSchoolSearch}
                      onChange={(e) => {
                        setNewChildSchoolSearch(e.target.value);
                        setNewChildSchoolId("");
                        setNewChildSchoolName("");
                      }}
                      placeholder={newChildGovernorate ? t("parentDashboard.searchSchool") : t("parentDashboard.selectGovernorateFirst")}
                      className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    />
                    {newChildSchoolId && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
                    )}
                  </div>
                  {/* School suggestions dropdown */}
                  {newChildSchoolSearch && !newChildSchoolId && schoolSuggestions && schoolSuggestions.length > 0 && (
                    <div className={`mt-1 rounded-lg border shadow-lg max-h-32 overflow-y-auto ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                      {schoolSuggestions.map((s: any) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setNewChildSchoolId(s.id);
                            setNewChildSchoolName(s.name);
                            setNewChildSchoolSearch("");
                          }}
                          className={`w-full text-right px-3 py-2 text-sm hover:bg-blue-500 hover:text-white transition-colors ${isDark ? "text-gray-200" : "text-gray-800"}`}
                        >
                          {s.name} {s.governorate ? `(${s.governorate})` : ""}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {t("parentDashboard.typeSchoolOrSelect")}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => addChildWithPinMutation.mutate({ childName: newChildName, pin: newChildPin })}
                    disabled={addChildWithPinMutation.isPending}
                    className="flex-1"
                  >
                    {addChildWithPinMutation.isPending ? t("parentDashboard.adding") : t("parentDashboard.addConfirm")}
                  </Button>
                  <Button variant="outline" onClick={() => setAddChildStep(1)}>
                    {t("parentDashboard.back")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Set Child PIN Modal */}
      {showSetPinModal && pinTargetChild && (() => {
        const pinChild = pinData?.children?.find((c: any) => c.id === pinTargetChild.id);
        const hasPinAlready = !!pinChild?.hasPin;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                <KeyRound className="h-5 w-5 text-amber-500" /> {t("parentDashboard.setPinFor", { name: pinTargetChild.name })}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("parentDashboard.newPin4Digits")}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={childPinValue}
                    onChange={(e) => setChildPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder={hasPinAlready ? t("parentDashboard.leaveEmptyToRemove") : "1234"}
                    maxLength={4}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 text-center text-xl tracking-widest font-mono ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                  {hasPinAlready && (
                    <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {t("parentDashboard.leaveEmptyToRemoveHint")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => setChildPinMutation.mutate({ childId: pinTargetChild.id, pin: childPinValue })}
                    disabled={(childPinValue.length > 0 && childPinValue.length < 4) || setChildPinMutation.isPending}
                    className={`flex-1 ${childPinValue.length === 0 && hasPinAlready ? "bg-red-500 hover:bg-red-600" : ""}`}
                  >
                    {setChildPinMutation.isPending
                      ? t("parentDashboard.setting")
                      : childPinValue.length === 0 && hasPinAlready
                        ? t("parentDashboard.removePin")
                        : t("parentDashboard.setConfirm")}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowSetPinModal(false); setPinTargetChild(null); setChildPinValue(""); }}>
                    {t("parentDashboard.cancel")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Set My PIN Modal */}
      {showSetMyPin && (() => {
        const hasMyPin = !!pinData?.parentHasPin;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                <KeyRound className="h-5 w-5 text-amber-500" /> {t("parentDashboard.setYourPin")}
              </h3>
              <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("parentDashboard.pinAllowsQuickLogin")}
              </p>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("parentDashboard.pin4Digits")}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={myPinValue}
                    onChange={(e) => setMyPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder={hasMyPin ? t("parentDashboard.leaveEmptyToRemove") : "1234"}
                    maxLength={4}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 text-center text-xl tracking-widest font-mono ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                  {hasMyPin && (
                    <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {t("parentDashboard.leaveEmptyToRemoveHint")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => setMyPinMutation.mutate({ pin: myPinValue })}
                    disabled={(myPinValue.length > 0 && myPinValue.length < 4) || setMyPinMutation.isPending}
                    className={`flex-1 ${myPinValue.length === 0 && hasMyPin ? "bg-red-500 hover:bg-red-600" : ""}`}
                  >
                    {setMyPinMutation.isPending
                      ? t("parentDashboard.setting")
                      : myPinValue.length === 0 && hasMyPin
                        ? t("parentDashboard.removePin")
                        : t("parentDashboard.setConfirm")}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowSetMyPin(false); setMyPinValue(""); }}>
                    {t("parentDashboard.cancel")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
