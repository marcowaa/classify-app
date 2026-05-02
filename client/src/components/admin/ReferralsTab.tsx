import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Gift,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  Settings,
  Save,
  MousePointer,
  Share2,
  Eye,
  BarChart3,
  Megaphone,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { getDateLocale } from "@/i18n/config";
import { useToast } from "@/hooks/use-toast";

interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCode: string;
  status: string;
  pointsAwarded: number;
  referredAt: string;
  activatedAt: string | null;
  rewardedAt: string | null;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  referredEmail: string;
}

interface ReferralStats {
  total: number;
  active: number;
  pending: number;
  rewarded: number;
  totalPointsAwarded: number;
}

interface ReferralCode {
  id: string;
  parentId: string;
  code: string;
  totalReferrals: number;
  activeReferrals: number;
  totalPointsEarned: number;
  createdAt: string;
  parentName: string;
  parentEmail: string;
}

interface ReferralOverview {
  parents: { total: number; converted: number };
  libraries: { total: number; converted: number };
  schools: { total: number; converted: number };
  teachers: { total: number; converted: number };
  children: { totalVisits: number };
}

interface ReferralSettingsData {
  id: string;
  pointsPerReferral: number;
  pointsPerAdShare: number;
  commissionRate: string;
  minActiveDays: number;
  isActive: boolean;
}

interface UserTracking {
  parentId: string;
  parentName: string;
  parentEmail: string;
  totalClicks: number;
  adsClicked: number;
  totalShares: number;
  totalPointsEarned: number;
  adsShared: number;
}

interface AdTrackingDetail {
  clicks: Array<{
    parentId: string;
    parentName: string;
    parentEmail: string;
    clickCount: number;
    lastClick: string;
  }>;
  shares: Array<{
    parentId: string;
    parentName: string;
    parentEmail: string;
    shareCount: number;
    totalPoints: number;
    platforms: string;
    lastShare: string;
  }>;
}

interface Ad {
  id: string;
  title: string;
  isActive: boolean;
  viewCount: number;
  clickCount: number;
}

type ViewTab = "settings" | "referrals" | "codes" | "ad-tracking";

export function ReferralsTab({
  token }: { token: string }) {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<ViewTab>("settings");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState<Partial<ReferralSettingsData>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ["admin-referral-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referrals/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data;
    },
  });

  const { data: referrals } = useQuery<Referral[]>({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referrals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data || [];
    },
  });

  const { data: codes } = useQuery<ReferralCode[]>({
    queryKey: ["admin-referral-codes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referral-codes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data || [];
    },
  });

  const { data: settings } = useQuery<ReferralSettingsData>({
    queryKey: ["admin-referral-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referral-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data && !settingsLoaded) {
        setSettingsForm(data.data);
        setSettingsLoaded(true);
      }
      return data.data;
    },
  });

  const { data: referralOverview } = useQuery<ReferralOverview>({
    queryKey: ["admin-referral-overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referrals/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data;
    },
  });

  const { data: userTracking } = useQuery<UserTracking[]>({
    queryKey: ["admin-ad-user-tracking"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ads/user-tracking", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data || [];
    },
    enabled: activeView === "ad-tracking",
  });

  const { data: allAds } = useQuery<Ad[]>({
    queryKey: ["admin-ads-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data || [];
    },
    enabled: activeView === "ad-tracking",
  });

  const { data: adTracking } = useQuery<AdTrackingDetail>({
    queryKey: ["admin-ad-tracking", selectedAdId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ads/${selectedAdId}/tracking`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data;
    },
    enabled: !!selectedAdId,
  });

  const saveSettings = useMutation({
    mutationFn: async (formData: Partial<ReferralSettingsData>) => {
      const res = await fetch("/api/admin/referral-settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referral-settings"] });
      toast({ title: "✅ تم الحفظ", description: "تم تحديث إعدادات الإحالة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "❌ خطأ", description: err.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500 text-white">نشط</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 text-white">معلق</Badge>;
      case "rewarded":
        return <Badge className="bg-blue-500 text-white">تم المكافأة</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredReferrals = referrals?.filter(
    (r) =>
      !searchQuery ||
      r.referrerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referrerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referredName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referralCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCodes = codes?.filter(
    (c) =>
      !searchQuery ||
      c.parentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.parentEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUserTracking = userTracking?.filter(
    (u) =>
      !searchQuery ||
      u.parentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.parentEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: "settings", label: "الإعدادات", icon: <Settings className="h-4 w-4" /> },
    { id: "referrals", label: "الإحالات", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "codes", label: "أكواد الإحالة", icon: <Users className="h-4 w-4" /> },
    { id: "ad-tracking", label: "تتبع الإعلانات", icon: <BarChart3 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي الإحالات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.active || 0}</p>
                <p className="text-sm text-muted-foreground">نشطة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-sm text-muted-foreground">معلقة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.rewarded || 0}</p>
                <p className="text-sm text-muted-foreground">مُكافأة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalPointsAwarded || 0}</p>
                <p className="text-sm text-muted-foreground">نقاط موزعة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Parents Referrals</p>
            <p className="font-bold">{referralOverview?.parents?.converted || 0} / {referralOverview?.parents?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Libraries Referrals</p>
            <p className="font-bold">{referralOverview?.libraries?.converted || 0} / {referralOverview?.libraries?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Schools Referrals</p>
            <p className="font-bold">{referralOverview?.schools?.converted || 0} / {referralOverview?.schools?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Teachers Referrals</p>
            <p className="font-bold">{referralOverview?.teachers?.converted || 0} / {referralOverview?.teachers?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Children Link Visits</p>
            <p className="font-bold">{referralOverview?.children?.totalVisits || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeView === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {activeView !== "settings" && (
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>
      )}

      {/* Settings Tab */}
      {activeView === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              إعدادات نظام الإحالة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-purple-500" />
                  نقاط لكل إحالة ناجحة
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={settingsForm.pointsPerReferral ?? settings?.pointsPerReferral ?? 100}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, pointsPerReferral: parseInt(e.target.value) || 0 }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  النقاط التي يحصل عليها المستخدم عند تسجيل شخص جديد عبر رابط الإحالة
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-blue-500" />
                  نقاط لكل مشاركة إعلان
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={settingsForm.pointsPerAdShare ?? settings?.pointsPerAdShare ?? 10}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, pointsPerAdShare: parseInt(e.target.value) || 0 }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  النقاط التي يحصل عليها المستخدم عند مشاركة إعلان على منصات التواصل
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  نسبة العمولة (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={settingsForm.commissionRate ?? settings?.commissionRate ?? "10.00"}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, commissionRate: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  أقل عدد أيام نشاط
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={settingsForm.minActiveDays ?? settings?.minActiveDays ?? 7}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, minActiveDays: parseInt(e.target.value) || 0 }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  عدد الأيام التي يجب أن يكون فيها المستخدم المُحال نشطاً لتأكيد الإحالة
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-3">
                <Switch
                  checked={settingsForm.isActive ?? settings?.isActive ?? true}
                  onCheckedChange={(checked) =>
                    setSettingsForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
                <Label>تفعيل نظام الإحالة</Label>
              </div>

              <Button
                onClick={() => saveSettings.mutate(settingsForm)}
                disabled={saveSettings.isPending}
                className="gap-2"
              >
                {saveSettings.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ الإعدادات
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referrals Tab */}
      {activeView === "referrals" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              سجل الإحالات ({filteredReferrals?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!filteredReferrals?.length ? (
              <p className="text-center text-muted-foreground py-8">لا توجد إحالات بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3">المُحيل</th>
                      <th className="text-right p-3">المُحال</th>
                      <th className="text-right p-3">الكود</th>
                      <th className="text-right p-3">الحالة</th>
                      <th className="text-right p-3">النقاط</th>
                      <th className="text-right p-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReferrals.map((ref) => (
                      <tr key={ref.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{ref.referrerName}</p>
                            <p className="text-sm text-muted-foreground">{ref.referrerEmail}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{ref.referredName}</p>
                            <p className="text-sm text-muted-foreground">{ref.referredEmail}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <code className="bg-muted px-2 py-1 rounded">{ref.referralCode}</code>
                        </td>
                        <td className="p-3">{getStatusBadge(ref.status)}</td>
                        <td className="p-3 font-bold text-green-600">{ref.pointsAwarded}</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(ref.referredAt).toLocaleDateString(getDateLocale())}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Referral Codes Tab */}
      {activeView === "codes" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              أكواد الإحالة ({filteredCodes?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!filteredCodes?.length ? (
              <p className="text-center text-muted-foreground py-8">لا توجد أكواد إحالة بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3">الوالد</th>
                      <th className="text-right p-3">الكود</th>
                      <th className="text-right p-3">إجمالي الإحالات</th>
                      <th className="text-right p-3">نشطة</th>
                      <th className="text-right p-3">النقاط المكتسبة</th>
                      <th className="text-right p-3">تاريخ الإنشاء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCodes.map((code) => (
                      <tr key={code.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{code.parentName}</p>
                            <p className="text-sm text-muted-foreground">{code.parentEmail}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <code className="bg-primary/10 text-primary px-2 py-1 rounded font-bold">
                            {code.code}
                          </code>
                        </td>
                        <td className="p-3 font-bold">{code.totalReferrals}</td>
                        <td className="p-3">
                          <Badge className="bg-green-500 text-white">{code.activeReferrals}</Badge>
                        </td>
                        <td className="p-3 font-bold text-amber-600">{code.totalPointsEarned}</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(code.createdAt).toLocaleDateString(getDateLocale())}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ad Tracking Tab */}
      {activeView === "ad-tracking" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                تتبع المستخدمين — ملخص النقرات والمشاركات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!filteredUserTracking?.length ? (
                <p className="text-center text-muted-foreground py-8">لا توجد بيانات تتبع بعد</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right p-3">المستخدم</th>
                        <th className="text-right p-3">
                          <div className="flex items-center gap-1"><MousePointer className="h-3 w-3" /> النقرات</div>
                        </th>
                        <th className="text-right p-3">إعلانات منقورة</th>
                        <th className="text-right p-3">
                          <div className="flex items-center gap-1"><Share2 className="h-3 w-3" /> المشاركات</div>
                        </th>
                        <th className="text-right p-3">إعلانات مشاركة</th>
                        <th className="text-right p-3">
                          <div className="flex items-center gap-1"><Star className="h-3 w-3" /> نقاط مكتسبة</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUserTracking.map((u) => (
                        <tr key={u.parentId} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{u.parentName}</p>
                              <p className="text-sm text-muted-foreground">{u.parentEmail}</p>
                            </div>
                          </td>
                          <td className="p-3 font-bold text-blue-600">{u.totalClicks}</td>
                          <td className="p-3">{u.adsClicked}</td>
                          <td className="p-3 font-bold text-green-600">{u.totalShares}</td>
                          <td className="p-3">{u.adsShared}</td>
                          <td className="p-3 font-bold text-amber-600">{u.totalPointsEarned}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                تتبع تفصيلي لكل إعلان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allAds?.map((ad) => (
                  <button
                    key={ad.id}
                    onClick={() => setSelectedAdId(selectedAdId === ad.id ? null : ad.id)}
                    className={`p-3 rounded-lg border text-start transition-all ${
                      selectedAdId === ad.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm truncate flex-1">{ad.title}</p>
                      {selectedAdId === ad.id ? (
                        <ChevronUp className="h-4 w-4 text-primary flex-shrink-0 ms-2" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ms-2" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {ad.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointer className="h-3 w-3" /> {ad.clickCount}
                      </span>
                      <Badge variant={ad.isActive ? "default" : "secondary"} className="text-xs">
                        {ad.isActive ? t("admin.referrals.active") : "متوقف"}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>

              {selectedAdId && adTracking && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MousePointer className="h-4 w-4 text-blue-500" />
                      النقرات ({adTracking.clicks?.length || 0})
                    </h4>
                    {adTracking.clicks?.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-right p-2">المستخدم</th>
                              <th className="text-right p-2">عدد النقرات</th>
                              <th className="text-right p-2">آخر نقرة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adTracking.clicks.map((c, i) => (
                              <tr key={i} className="border-b hover:bg-muted/30">
                                <td className="p-2">
                                  <p className="font-medium">{c.parentName}</p>
                                  <p className="text-xs text-muted-foreground">{c.parentEmail}</p>
                                </td>
                                <td className="p-2 font-bold text-blue-600">{c.clickCount}</td>
                                <td className="p-2 text-muted-foreground">
                                  {new Date(c.lastClick).toLocaleDateString(getDateLocale())}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">لا توجد نقرات مسجلة</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-green-500" />
                      المشاركات ({adTracking.shares?.length || 0})
                    </h4>
                    {adTracking.shares?.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-right p-2">المستخدم</th>
                              <th className="text-right p-2">عدد المشاركات</th>
                              <th className="text-right p-2">المنصات</th>
                              <th className="text-right p-2">النقاط</th>
                              <th className="text-right p-2">آخر مشاركة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adTracking.shares.map((s, i) => (
                              <tr key={i} className="border-b hover:bg-muted/30">
                                <td className="p-2">
                                  <p className="font-medium">{s.parentName}</p>
                                  <p className="text-xs text-muted-foreground">{s.parentEmail}</p>
                                </td>
                                <td className="p-2 font-bold text-green-600">{s.shareCount}</td>
                                <td className="p-2">
                                  <div className="flex gap-1 flex-wrap">
                                    {s.platforms?.split(", ").map((p) => (
                                      <Badge key={p} variant="secondary" className="text-xs">
                                        {p}
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-2 font-bold text-amber-600">{s.totalPoints}</td>
                                <td className="p-2 text-muted-foreground">
                                  {new Date(s.lastShare).toLocaleDateString(getDateLocale())}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">لا توجد مشاركات مسجلة</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
