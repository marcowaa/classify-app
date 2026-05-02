import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Eye, Send, Mail, Phone, Calendar, Wallet, ListTodo, Share2, X, Image, ArrowDownCircle, ShoppingBag, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDateLocale } from "@/i18n/config";

interface Parent {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  uniqueCode: string;
  childrenCount: number;
  walletBalance: number;
  tasksCount: number;
  publicTasksCount: number;
  createdAt: string;
  failedLoginAttempts?: number | null;
  lockedUntil?: string | null;
  children: Array<{ id: string; name: string; totalPoints: number }>;
}

interface ParentDetails extends Parent {
  deposits: Array<{
    id: string;
    amount: string | number;
    status: string;
    createdAt: string;
    transactionId?: string | null;
    paymentMethod?: {
      id: string;
      name: string;
      type: string;
      bankName?: string | null;
    } | null;
  }>;
  purchases: Array<{
    id: string;
    totalAmount: string | number;
    paymentStatus: string;
    currency: string;
    invoiceNumber?: string | null;
    createdAt: string;
    itemsCount: number;
  }>;
  financeSummary?: {
    depositsCount: number;
    purchasesCount: number;
    totalDeposits: number;
    completedDeposits: number;
    totalPurchases: number;
    paidPurchases: number;
  };
  wallet: { balance: number };
  tasks: Array<{ id: string; question: string; status: string }>;
  templateTasks: Array<{ id: string; title: string; isPublic: boolean; usageCount: number }>;
  earnings: { total: number; transactions: any[] };
  referral: { code: string; totalReferrals: number; activeReferrals: number } | null;
}

const formatAmount = (value: string | number | null | undefined) => Number(value || 0).toFixed(2);

const depositStatusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: i18next.t("admin.parents.pending"), className: "bg-yellow-100 text-yellow-800" },
  completed: { label: i18next.t("admin.parents.depositStatus.accepted"), className: "bg-green-100 text-green-800" },
  cancelled: { label: i18next.t("admin.parents.depositStatus.rejected"), className: "bg-red-100 text-red-800" },
};

const purchaseStatusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: "قيد الانتظار", className: "bg-yellow-100 text-yellow-800" },
  paid: { label: i18next.t("admin.parents.depositStatus.paid"), className: "bg-green-100 text-green-800" },
  failed: { label: "فشل", className: "bg-red-100 text-red-800" },
  refunded: { label: "مسترجع", className: "bg-gray-100 text-gray-700" },
};

export function ParentsTab({
  token }: { token: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedParent, setSelectedParent] = useState<ParentDetails | null>(null);
  const [depositFilter, setDepositFilter] = useState<"all" | "pending" | "completed" | "cancelled">("all");
  const [purchaseFilter, setPurchaseFilter] = useState<"all" | "pending" | "paid" | "failed" | "refunded">("all");
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyForm, setNotifyForm] = useState({ title: "", message: "", imageUrl: "" });
  const [notifyImageFile, setNotifyImageFile] = useState<File | null>(null);
  const [notifyImagePreview, setNotifyImagePreview] = useState<string>("");
  const [notifyError, setNotifyError] = useState("");
  const notifyImageInputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: parents, isLoading, error } = useQuery({
    queryKey: ["admin-parents"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "فشل تحميل البيانات");
      }
      const data = await res.json();
      return data.data || [];
    },
  });

  const getParentDetails = async (id: string) => {
    const res = await fetch(`/api/admin/parents/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  };

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ parentId, data, imageFile }: { parentId: string; data: typeof notifyForm; imageFile: File | null }) => {
      let localImageUrl = data.imageUrl || "";

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadRes = await fetch("/api/admin/upload-public-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || uploadJson?.success === false) {
          throw new Error(uploadJson?.message || "فشل رفع الصورة المحلية");
        }

        localImageUrl = uploadJson?.data?.url || "";
      }

      const res = await fetch(`/api/admin/parents/${parentId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, imageUrl: localImageUrl || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "فشل إرسال الإشعار");
      }
      return json;
    },
    onSuccess: () => {
      setShowNotifyModal(false);
      setNotifyForm({ title: "", message: "", imageUrl: "" });
      setNotifyImageFile(null);
      setNotifyImagePreview("");
      setNotifyError("");
      queryClient.invalidateQueries({ queryKey: ["admin-parent-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
    },
    onError: (error: any) => {
      setNotifyError(error?.message || "فشل إرسال الإشعار");
    },
  });

  const unlockParentMutation = useMutation({
    mutationFn: async (parentId: string) => {
      const res = await fetch(`/api/admin/parents/${parentId}/unlock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "فشل فك الحظر");
      }
      return json;
    },
    onSuccess: async (_, parentId) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-parents"] });
      if (selectedParent?.id === parentId) {
        const refreshed = await getParentDetails(parentId);
        if (refreshed) setSelectedParent(refreshed);
      }
    },
  });

  const handleViewDetails = async (parent: Parent) => {
    const details = await getParentDetails(parent.id);
    if (details) {
      setSelectedParent(details);
      setDepositFilter("all");
      setPurchaseFilter("all");
    }
  };

  const handleSendNotification = () => {
    if (!selectedParent || !notifyForm.title || !notifyForm.message) return;
    setNotifyError("");
    sendNotificationMutation.mutate({ parentId: selectedParent.id, data: notifyForm, imageFile: notifyImageFile });
  };

  const filteredParents = parents?.filter((p: Parent) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phoneNumber?.includes(searchTerm)
  ) || [];

  const filteredDeposits = selectedParent?.deposits?.filter((deposit) =>
    depositFilter === "all" ? true : deposit.status === depositFilter
  ) || [];

  const filteredPurchases = selectedParent?.purchases?.filter((purchase) =>
    purchaseFilter === "all" ? true : purchase.paymentStatus === purchaseFilter
  ) || [];

  const isParentLocked = (parent: { lockedUntil?: string | null }) => {
    if (!parent?.lockedUntil) return false;
    return new Date(parent.lockedUntil) > new Date();
  };

  if (isLoading) {
    return <div className="p-4">{t("admin.parents.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          إدارة الآباء
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{parents?.length || 0} والد</Badge>
          <Input
            placeholder={t("admin.parents.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
            data-testid="input-search-parents"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParents.map((parent: Parent) => (
          <Card key={parent.id} className="hover-elevate cursor-pointer" data-testid={`card-parent-${parent.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{parent.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{parent.childrenCount} طفل</Badge>
                  {isParentLocked(parent) && (
                    <Badge className="bg-red-100 text-red-800 border-red-200">
                      <Lock className="h-3 w-3 ml-1" />
                      محظور
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{parent.email}</span>
                </div>
                {parent.phoneNumber && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{parent.phoneNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(parent.createdAt).toLocaleDateString(getDateLocale())}</span>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary">
                    <Wallet className="h-3 w-3 ml-1" />
                    {parent.walletBalance} ر.س
                  </Badge>
                  <Badge variant="outline">
                    <ListTodo className="h-3 w-3 ml-1" />
                    {parent.tasksCount} مهمة
                  </Badge>
                  {parent.publicTasksCount > 0 && (
                    <Badge>
                      <Share2 className="h-3 w-3 ml-1" />
                      {parent.publicTasksCount} عامة
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDetails(parent)}
                  data-testid={`button-view-parent-${parent.id}`}
                >
                  <Eye className="h-4 w-4 ml-1" />
                  التفاصيل
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    const details = await getParentDetails(parent.id);
                    if (details) {
                      setSelectedParent(details);
                      setShowNotifyModal(true);
                      setNotifyError("");
                    }
                  }}
                  data-testid={`button-notify-parent-${parent.id}`}
                >
                  <Send className="h-4 w-4 ml-1" />
                  إشعار
                </Button>
                {isParentLocked(parent) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={unlockParentMutation.isPending}
                    onClick={() => unlockParentMutation.mutate(parent.id)}
                    data-testid={`button-unlock-parent-${parent.id}`}
                  >
                    <Unlock className="h-4 w-4 ml-1" />
                    فك الحظر
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredParents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا يوجد آباء مسجلين</p>
        </div>
      )}

      {selectedParent && !showNotifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{selectedParent.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedParent(null)}
                data-testid="button-close-parent-details"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">البريد الإلكتروني</div>
                <div className="font-medium">{selectedParent.email}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">الهاتف</div>
                <div className="font-medium">{selectedParent.phoneNumber || "غير محدد"}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">الرصيد</div>
                <div className="font-medium">{selectedParent.wallet?.balance || 0} ر.س</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">الأرباح</div>
                <div className="font-medium">{selectedParent.earnings?.total || 0} نقطة</div>
              </div>
              <div className="p-4 border rounded-lg col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">حالة تسجيل الدخول</div>
                    <div className="font-medium flex items-center gap-2 mt-1">
                      {isParentLocked(selectedParent) ? (
                        <>
                          <Lock className="h-4 w-4 text-red-600" />
                          <span className="text-red-700">محظور حتى {selectedParent.lockedUntil ? new Date(selectedParent.lockedUntil).toLocaleString(getDateLocale()) : "-"}</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-4 w-4 text-green-600" />
                          <span className="text-green-700">نشط</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">محاولات فاشلة: {selectedParent.failedLoginAttempts || 0}</div>
                  </div>
                  {isParentLocked(selectedParent) && (
                    <Button
                      variant="destructive"
                      disabled={unlockParentMutation.isPending}
                      onClick={() => unlockParentMutation.mutate(selectedParent.id)}
                      data-testid="button-unlock-parent-from-details"
                    >
                      {unlockParentMutation.isPending ? "جاري فك الحظر..." : "فك الحظر"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <div className="p-4 rounded-lg border bg-blue-50">
                <div className="text-xs text-blue-700 mb-1">إجمالي الإيداعات</div>
                <div className="text-lg font-bold text-blue-900">{formatAmount(selectedParent.financeSummary?.totalDeposits)} ر.س</div>
              </div>
              <div className="p-4 rounded-lg border bg-green-50">
                <div className="text-xs text-green-700 mb-1">الإيداعات المقبولة</div>
                <div className="text-lg font-bold text-green-900">{formatAmount(selectedParent.financeSummary?.completedDeposits)} ر.س</div>
              </div>
              <div className="p-4 rounded-lg border bg-purple-50">
                <div className="text-xs text-purple-700 mb-1">إجمالي المشتريات</div>
                <div className="text-lg font-bold text-purple-900">{formatAmount(selectedParent.financeSummary?.totalPurchases)} ر.س</div>
              </div>
              <div className="p-4 rounded-lg border bg-amber-50">
                <div className="text-xs text-amber-700 mb-1">المشتريات المدفوعة</div>
                <div className="text-lg font-bold text-amber-900">{formatAmount(selectedParent.financeSummary?.paidPurchases)} ر.س</div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">الأطفال ({selectedParent.children?.length || 0})</h4>
              <div className="flex gap-2 flex-wrap">
                {selectedParent.children?.map((child) => (
                  <Badge key={child.id} variant="outline">
                    {child.name} - {child.totalPoints} نقطة
                  </Badge>
                ))}
              </div>
            </div>

            {selectedParent.referral && (
              <div className="mb-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">كود الإحالة</h4>
                <div className="flex gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">الكود: </span>
                    <span className="font-mono font-bold">{selectedParent.referral.code}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">الإحالات: </span>
                    <span>{selectedParent.referral.totalReferrals}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">النشطة: </span>
                    <span>{selectedParent.referral.activeReferrals}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border rounded-xl p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-blue-600" />
                  سجلات الإيداعات ({filteredDeposits.length}/{selectedParent.deposits?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { key: "all", label: "الكل" },
                    { key: "pending", label: t("admin.parents.pending") },
                    { key: "completed", label: t("admin.parents.depositStatus.accepted") },
                    { key: "cancelled", label: t("admin.parents.depositStatus.rejected") },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setDepositFilter(item.key as "all" | "pending" | "completed" | "cancelled")}
                      className={`px-3 py-1 rounded-full text-xs border transition ${
                        depositFilter === item.key
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {filteredDeposits.length ? (
                    filteredDeposits.map((deposit) => {
                      const status = depositStatusMeta[deposit.status] || {
                        label: deposit.status,
                        className: "bg-gray-100 text-gray-700",
                      };

                      return (
                        <div key={deposit.id} className="p-3 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-sm">{formatAmount(deposit.amount)} ر.س</div>
                            <Badge className={status.className}>{status.label}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>الوسيلة: {deposit.paymentMethod?.name || deposit.paymentMethod?.type || "غير معروف"}</div>
                            {deposit.transactionId && <div>رقم العملية: {deposit.transactionId}</div>}
                            <div>{new Date(deposit.createdAt).toLocaleString(getDateLocale())}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">لا توجد نتائج مطابقة لهذا الفلتر</p>
                  )}
                </div>
              </div>

              <div className="border rounded-xl p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-purple-600" />
                  سجلات المشتريات ({filteredPurchases.length}/{selectedParent.purchases?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { key: "all", label: "الكل" },
                    { key: "paid", label: t("admin.parents.depositStatus.paid") },
                    { key: "pending", label: "قيد الانتظار" },
                    { key: "failed", label: "فشل" },
                    { key: "refunded", label: "مسترجع" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setPurchaseFilter(item.key as "all" | "pending" | "paid" | "failed" | "refunded")}
                      className={`px-3 py-1 rounded-full text-xs border transition ${
                        purchaseFilter === item.key
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {filteredPurchases.length ? (
                    filteredPurchases.map((purchase) => {
                      const status = purchaseStatusMeta[purchase.paymentStatus] || {
                        label: purchase.paymentStatus,
                        className: "bg-gray-100 text-gray-700",
                      };

                      return (
                        <div key={purchase.id} className="p-3 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-sm">{formatAmount(purchase.totalAmount)} {purchase.currency || "USD"}</div>
                            <Badge className={status.className}>{status.label}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>عدد المنتجات: {purchase.itemsCount || 0}</div>
                            {purchase.invoiceNumber && <div>الفاتورة: {purchase.invoiceNumber}</div>}
                            <div>{new Date(purchase.createdAt).toLocaleString(getDateLocale())}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">لا توجد نتائج مطابقة لهذا الفلتر</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">المهام العامة ({selectedParent.templateTasks?.filter(t => t.isPublic).length || 0})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedParent.templateTasks?.filter(t => t.isPublic).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{task.title}</span>
                    <Badge variant="secondary">{task.usageCount} استخدام</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => setShowNotifyModal(true)}
              data-testid="button-send-notification-from-details"
            >
              <Send className="h-4 w-4 ml-2" />
              إرسال إشعار
            </Button>
          </div>
        </div>
      )}

      {showNotifyModal && selectedParent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">إرسال إشعار لـ {selectedParent.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowNotifyModal(false);
                  setNotifyForm({ title: "", message: "", imageUrl: "" });
                  setNotifyImageFile(null);
                  setNotifyImagePreview("");
                  setNotifyError("");
                }}
                data-testid="button-close-notify-modal"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">العنوان</label>
                <Input
                  value={notifyForm.title}
                  onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })}
                  placeholder="عنوان الإشعار"
                  data-testid="input-notify-title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الرسالة</label>
                <Textarea
                  value={notifyForm.message}
                  onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })}
                  placeholder="نص الرسالة"
                  rows={3}
                  data-testid="input-notify-message"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">صورة الإشعار (اختياري - من الجهاز المحلي)</label>
                <div className="flex gap-2 items-center">
                  <Image className="h-5 w-5 text-muted-foreground mt-2" />
                  <input
                    ref={notifyImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setNotifyImageFile(file);
                      setNotifyImagePreview(file ? URL.createObjectURL(file) : "");
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => notifyImageInputRef.current?.click()}
                    className="w-full justify-start"
                    data-testid="input-notify-image"
                  >
                    {notifyImageFile ? notifyImageFile.name : "اختر صورة من الجهاز"}
                  </Button>
                </div>
                {notifyImagePreview && (
                  <div className="mt-2">
                    <img src={notifyImagePreview} alt="preview" className="max-h-28 rounded-lg border" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1"
                      onClick={() => {
                        setNotifyImageFile(null);
                        setNotifyImagePreview("");
                      }}
                    >
                      إزالة الصورة
                    </Button>
                  </div>
                )}
              </div>
              {notifyError && <p className="text-sm text-red-600">{notifyError}</p>}
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleSendNotification}
                disabled={sendNotificationMutation.isPending || !notifyForm.title || !notifyForm.message}
                className="flex-1"
                data-testid="button-send-notification"
              >
                {sendNotificationMutation.isPending ? "جاري الإرسال..." : "إرسال"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNotifyModal(false);
                  setNotifyForm({ title: "", message: "", imageUrl: "" });
                  setNotifyImageFile(null);
                  setNotifyImagePreview("");
                  setNotifyError("");
                }}
                className="flex-1"
                data-testid="button-cancel-notification"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
