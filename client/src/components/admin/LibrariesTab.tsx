import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Store, MapPin, Link, Settings, Copy, Eye, Package, Users, CheckCircle2, XCircle, Wallet, Bell, Moon, Upload, Image as ImageIcon, Loader2, X } from "lucide-react";

interface Library {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  username: string;
  referralCode: string;
  activityScore: number;
  totalProducts: number;
  totalSales: number;
  isActive: boolean;
  createdAt: string;
  commissionRatePct: number;
}

interface LibraryOrder {
  id: string;
  libraryId: string;
  status: string;
  quantity: number;
  subtotal: string;
  productTitle?: string;
  parentName?: string;
  libraryName?: string;
  createdAt: string;
}

interface LibraryWithdrawal {
  id: string;
  libraryId: string;
  libraryName?: string;
  amount: string;
  paymentMethod: string;
  status: string;
  requestedAt: string;
}

interface LibraryProductReviewItem {
  id: string;
  libraryId: string;
  libraryName?: string;
  title: string;
  price: string;
  stock: number;
  moderationStatus: "pending_review" | "approved" | "rejected";
  moderationReason?: string | null;
  createdAt: string;
}

interface ProductRejectionTemplate {
  id: string;
  text: string;
  usageCount: number;
}

export default function LibrariesTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const token = localStorage.getItem("adminToken");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [libraryDetails, setLibraryDetails] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectionReasonDraft, setRejectionReasonDraft] = useState<Record<string, string>>({});
  const [newTemplateText, setNewTemplateText] = useState("");
  const [uploadingLibraryImage, setUploadingLibraryImage] = useState(false);
  const libraryImageInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    imageUrl: "",
    username: "",
    password: "",
    commissionRatePct: "10",
  });

  const { data: libraries, isLoading, error } = useQuery({
    queryKey: ["admin-libraries"],
    queryFn: async () => {
      const res = await fetch("/api/admin/libraries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.data || [];
    },
  });

  const { data: referralSettings } = useQuery({
    queryKey: ["admin-library-referral-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/library-referral-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.data;
    },
  });

  const { data: libraryStoreSettings } = useQuery({
    queryKey: ["admin-library-store-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/app-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.data?.libraryStore || { showThemeToggle: true, showNotifications: true };
    },
  });

  const { data: libraryOrders } = useQuery({
    queryKey: ["admin-library-orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/library-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch library orders");
      const data = await res.json();
      return (data.data || []) as LibraryOrder[];
    },
  });

  const { data: libraryWithdrawals } = useQuery({
    queryKey: ["admin-library-withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/admin/library-withdrawals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch library withdrawals");
      const data = await res.json();
      return (data.data || []) as LibraryWithdrawal[];
    },
  });

  const { data: pendingLibraryProducts } = useQuery({
    queryKey: ["admin-library-products-review", "pending_review"],
    queryFn: async () => {
      const res = await fetch("/api/admin/library-products/review?status=pending_review", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch library products review queue");
      const data = await res.json();
      return (data.data || []) as LibraryProductReviewItem[];
    },
  });

  const { data: productRejectionTemplates } = useQuery({
    queryKey: ["admin-product-rejection-templates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/product-rejection-templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch rejection templates");
      const data = await res.json();
      return (data.data || []) as ProductRejectionTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/libraries", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("admin.libraries.libraryAdded") });
      setShowAddModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || t("admin.libraries.libraryAddFailed"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/libraries/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("admin.libraries.libraryUpdated") });
      setShowEditModal(false);
      setSelectedLibrary(null);
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || t("admin.libraries.libraryUpdateFailed"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/libraries/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("admin.libraries.libraryDeleted") });
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: () => {
      toast({ title: t("admin.libraries.libraryDeleteFailed"), variant: "destructive" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/library-referral-settings", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("admin.libraries.settingsUpdated") });
      queryClient.invalidateQueries({ queryKey: ["admin-library-referral-settings"] });
    },
    onError: () => {
      toast({ title: t("admin.libraries.settingsUpdateFailed"), variant: "destructive" });
    },
  });

  const updateLibraryStoreSettingsMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const currentSettings = libraryStoreSettings || { showThemeToggle: true, showNotifications: true };
      const merged = { ...currentSettings, ...data };
      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ libraryStore: merged }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("admin.libraries.storeSettingsUpdated") });
      queryClient.invalidateQueries({ queryKey: ["admin-library-store-settings"] });
    },
    onError: () => {
      toast({ title: t("admin.libraries.storeSettingsUpdateFailed"), variant: "destructive" });
    },
  });

  const confirmOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/admin/library-orders/${orderId}/confirm`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to confirm order");
      return body;
    },
    onSuccess: () => {
      toast({ title: t("admin.libraries.orderConfirmed") });
      queryClient.invalidateQueries({ queryKey: ["admin-library-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || t("admin.libraries.orderConfirmFailed"), variant: "destructive" });
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/admin/library-orders/${orderId}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: "تم رفض الطلب من الأدمن" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to reject order");
      return body;
    },
    onSuccess: () => {
      toast({ title: t("admin.libraries.orderRejected") });
      queryClient.invalidateQueries({ queryKey: ["admin-library-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || t("admin.libraries.orderRejectFailed"), variant: "destructive" });
    },
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const res = await fetch(`/api/admin/library-withdrawals/${withdrawalId}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to approve withdrawal");
      return body;
    },
    onSuccess: () => {
      toast({ title: t("admin.libraries.withdrawalApproved") });
      queryClient.invalidateQueries({ queryKey: ["admin-library-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || t("admin.libraries.withdrawalApproveFailed"), variant: "destructive" });
    },
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const res = await fetch(`/api/admin/library-withdrawals/${withdrawalId}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: "تم رفض طلب السحب" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to reject withdrawal");
      return body;
    },
    onSuccess: () => {
      toast({ title: t("admin.libraries.withdrawalRejected") });
      queryClient.invalidateQueries({ queryKey: ["admin-library-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || t("admin.libraries.withdrawalRejectFailed"), variant: "destructive" });
    },
  });

  const approveLibraryProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/admin/library-products/${productId}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision: "approve" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to approve product");
      return body;
    },
    onSuccess: () => {
      toast({ title: "تمت الموافقة على المنتج" });
      queryClient.invalidateQueries({ queryKey: ["admin-library-products-review", "pending_review"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل اعتماد المنتج", variant: "destructive" });
    },
  });

  const rejectLibraryProductMutation = useMutation({
    mutationFn: async ({ productId, reason, templateId }: { productId: string; reason?: string; templateId?: string }) => {
      const res = await fetch(`/api/admin/library-products/${productId}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision: "reject", reason, templateId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to reject product");
      return body;
    },
    onSuccess: () => {
      toast({ title: "تم رفض المنتج" });
      queryClient.invalidateQueries({ queryKey: ["admin-library-products-review", "pending_review"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product-rejection-templates"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل رفض المنتج", variant: "destructive" });
    },
  });

  const createRejectionTemplateMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/admin/product-rejection-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to create template");
      return body;
    },
    onSuccess: () => {
      toast({ title: "تم حفظ قالب سبب الرفض" });
      setNewTemplateText("");
      queryClient.invalidateQueries({ queryKey: ["admin-product-rejection-templates"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل حفظ القالب", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", location: "", imageUrl: "", username: "", password: "", commissionRatePct: "10" });
  };

  const openEditModal = (lib: Library) => {
    setSelectedLibrary(lib);
    setFormData({
      name: lib.name,
      description: lib.description || "",
      location: lib.location || "",
      imageUrl: lib.imageUrl || "",
      username: lib.username,
      password: "",
      commissionRatePct: (lib.commissionRatePct ?? 10).toString(),
    });
    setShowEditModal(true);
  };

  const openDetailsModal = async (lib: Library) => {
    setSelectedLibrary(lib);
    try {
      const res = await fetch(`/api/admin/libraries/${lib.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLibraryDetails(data.data);
      }
    } catch (e) {
      console.error(e);
    }
    setShowDetailsModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("admin.libraries.copied") });
  };

  const handleLibraryImageUpload = async (file: File) => {
    if (!token) {
      toast({ title: t("admin.libraries.libraryAddFailed"), variant: "destructive" });
      return;
    }

    setUploadingLibraryImage(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload-public-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "upload_failed");
      const data = json?.data || json;
      const imageUrl = String(data?.fullUrl || data?.url || "").trim();
      if (!imageUrl) throw new Error("upload_failed");
      setFormData((prev) => ({ ...prev, imageUrl }));
    } catch (err: any) {
      toast({ title: err?.message || t("admin.libraries.libraryAddFailed"), variant: "destructive" });
    } finally {
      setUploadingLibraryImage(false);
      if (libraryImageInputRef.current) libraryImageInputRef.current.value = "";
    }
  };

  const filteredLibraries = (libraries || []).filter((lib: Library) =>
    lib.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lib.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loginUrl = `${window.location.origin}/library/login`;

  if (isLoading) {
    return <div className="flex justify-center p-8">{t("admin.libraries.loading")}</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-8">{t("admin.libraries.dataLoadFailed")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Input
            placeholder={t("admin.libraries.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
            data-testid="input-search-libraries"
          />
          <Badge variant="secondary">
            {filteredLibraries.length} مكتبة
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettingsModal(true)} data-testid="button-library-settings">
            <Settings className="h-4 w-4 ml-2" />
            إعدادات الإحالة
          </Button>
          <Button onClick={() => setShowAddModal(true)} data-testid="button-add-library">
            <Plus className="h-4 w-4 ml-2" />
            إضافة مكتبة
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLibraries.map((lib: Library) => (
          <Card key={lib.id} className={!lib.isActive ? "opacity-60" : ""} data-testid={`card-library-${lib.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {lib.imageUrl ? (
                    <img src={lib.imageUrl} alt={lib.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{lib.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">@{lib.username}</p>
                  </div>
                </div>
                {!lib.isActive && <Badge variant="secondary">{t("admin.libraries.inactive")}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {lib.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3" /> {lib.location}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm mb-3">
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" /> {lib.totalProducts} منتج
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> {lib.totalSales} مبيعات
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant="outline">نقاط: {lib.activityScore}</Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">عمولة: {lib.commissionRatePct ?? 10}%</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openDetailsModal(lib)} data-testid={`button-view-library-${lib.id}`}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEditModal(lib)} data-testid={`button-edit-library-${lib.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => {
                      if (confirm(t("admin.libraries.confirmDeleteLibrary"))) {
                        deleteMutation.mutate(lib.id);
                      }
                    }}
                    data-testid={`button-delete-library-${lib.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("admin.libraries.libraryOrders")}</span>
            <Badge variant="secondary">
              {(libraryOrders || []).filter((o) => o.status === "pending_admin").length} بانتظار التأكيد
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-y-auto">
          {(libraryOrders || []).slice(0, 30).map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{order.productTitle || t("admin.libraries.product")} - {order.libraryName || t("admin.libraries.library")}</p>
                <p className="text-sm text-muted-foreground truncate">المشتري: {order.parentName || "-"} • الكمية: {order.quantity}</p>
                <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString("ar")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={order.status === "pending_admin" ? "secondary" : "outline"}>{order.status}</Badge>
                {order.status === "pending_admin" && (
                  <>
                    <Button size="sm" onClick={() => confirmOrderMutation.mutate(order.id)}>
                      <CheckCircle2 className="h-4 w-4 ml-1" /> تأكيد
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => rejectOrderMutation.mutate(order.id)}>
                      <XCircle className="h-4 w-4 ml-1" /> رفض
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {(!libraryOrders || libraryOrders.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-6">{t("admin.libraries.noLibraryOrders")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Package className="h-4 w-4" /> مراجعة منتجات المكتبات</span>
            <Badge variant="secondary">{(pendingLibraryProducts || []).length} بانتظار الاعتماد</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="إضافة قالب سبب رفض"
              value={newTemplateText}
              onChange={(e) => setNewTemplateText(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => createRejectionTemplateMutation.mutate(newTemplateText)}
              disabled={!newTemplateText.trim() || createRejectionTemplateMutation.isPending}
            >
              حفظ القالب
            </Button>
            <Badge variant="outline" className="justify-center">
              {(productRejectionTemplates || []).length} قوالب رفض
            </Badge>
          </div>

          {(pendingLibraryProducts || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد منتجات معلّقة للمراجعة</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(pendingLibraryProducts || []).map((product) => (
                <div key={product.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{product.libraryName || "-"} • {product.price} • مخزون {product.stock}</p>
                    </div>
                    <Badge variant="secondary">{product.moderationStatus}</Badge>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    <select
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      defaultValue=""
                      onChange={(e) => {
                        const selected = String(e.target.value || "");
                        if (!selected) return;
                        const template = (productRejectionTemplates || []).find((tpl) => tpl.id === selected);
                        if (!template) return;
                        setRejectionReasonDraft((prev) => ({ ...prev, [product.id]: template.text }));
                      }}
                    >
                      <option value="">اختيار قالب رفض (اختياري)</option>
                      {(productRejectionTemplates || []).map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>{tpl.text}</option>
                      ))}
                    </select>
                    <Input
                      placeholder="سبب الرفض"
                      value={rejectionReasonDraft[product.id] || ""}
                      onChange={(e) => setRejectionReasonDraft((prev) => ({ ...prev, [product.id]: e.target.value }))}
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => approveLibraryProductMutation.mutate(product.id)}>
                        <CheckCircle2 className="h-4 w-4 ml-1" /> موافقة
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectLibraryProductMutation.mutate({ productId: product.id, reason: rejectionReasonDraft[product.id] || "" })}
                      >
                        <XCircle className="h-4 w-4 ml-1" /> رفض
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> طلبات سحب الأموال</span>
            <Badge variant="secondary">
              {(libraryWithdrawals || []).filter((w) => w.status === "pending").length} بانتظار المراجعة
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-y-auto">
          {(libraryWithdrawals || []).slice(0, 30).map((request) => (
            <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{request.libraryName || t("admin.libraries.library")}</p>
                <p className="text-sm text-muted-foreground truncate">المبلغ: {request.amount} • الطريقة: {request.paymentMethod}</p>
                <p className="text-xs text-muted-foreground">{new Date(request.requestedAt).toLocaleString("ar")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={request.status === "pending" ? "secondary" : "outline"}>{request.status}</Badge>
                {request.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => approveWithdrawalMutation.mutate(request.id)}>
                      <CheckCircle2 className="h-4 w-4 ml-1" /> موافقة
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => rejectWithdrawalMutation.mutate(request.id)}>
                      <XCircle className="h-4 w-4 ml-1" /> رفض
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {(!libraryWithdrawals || libraryWithdrawals.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-6">{t("admin.libraries.noWithdrawalRequests")}</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.libraries.addNewLibrary")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.libraries.libraryName")}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-library-name"
              />
            </div>
            <div>
              <Label>{t("admin.libraries.descriptionLabel")}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-library-description"
              />
            </div>
            <div>
              <Label>{t("admin.libraries.locationLabel")}</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                data-testid="input-library-location"
              />
            </div>
            <div>
              <Label>{t("admin.libraries.imageUrl")}</Label>
              <div className="space-y-2 mt-1">
                {formData.imageUrl ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={formData.imageUrl} alt="library" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 rounded-lg border-2 border-dashed flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <input
                  ref={libraryImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLibraryImageUpload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploadingLibraryImage}
                  onClick={() => libraryImageInputRef.current?.click()}
                  data-testid="input-library-image"
                >
                  {uploadingLibraryImage ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
                  رفع صورة
                </Button>
              </div>
            </div>
            <div>
              <Label>{t("admin.libraries.username")}</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                data-testid="input-library-username"
              />
            </div>
            <div>
              <Label>{t("admin.libraries.password")}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                data-testid="input-library-password"
              />
            </div>
            <div>
              <Label>{t("admin.libraries.dailyCommission")}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.commissionRatePct}
                onChange={(e) => setFormData({ ...formData, commissionRatePct: e.target.value })}
                data-testid="input-library-commission"
              />
              <p className="text-xs text-gray-500 mt-1">{t("admin.libraries.dailyCommissionDesc")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>{t("common.cancel")}</Button>
            <Button 
              onClick={() => createMutation.mutate(formData)}
              disabled={createMutation.isPending}
              data-testid="button-submit-library"
            >
              {createMutation.isPending ? t("admin.libraries.adding") : t("admin.libraries.addBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.libraries.editLibrary")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.libraries.libraryName")}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.libraries.descriptionLabel")}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.libraries.locationLabel")}</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.libraries.imageUrl")}</Label>
              <div className="space-y-2 mt-1">
                {formData.imageUrl ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={formData.imageUrl} alt="library" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 rounded-lg border-2 border-dashed flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <input
                  ref={libraryImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLibraryImageUpload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploadingLibraryImage}
                  onClick={() => libraryImageInputRef.current?.click()}
                >
                  {uploadingLibraryImage ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
                  رفع صورة
                </Button>
              </div>
            </div>
            <div>
              <Label>{t("admin.libraries.username")}</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.libraries.newPasswordOpt")}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.libraries.dailyCommission")}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.commissionRatePct}
                onChange={(e) => setFormData({ ...formData, commissionRatePct: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">{t("admin.libraries.dailyCommissionDesc")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={selectedLibrary?.isActive}
                onCheckedChange={(checked) => {
                  if (selectedLibrary) {
                    updateMutation.mutate({ 
                      id: selectedLibrary.id, 
                      data: { isActive: checked } 
                    });
                  }
                }}
              />
              <Label>{t("admin.libraries.activeLabel")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>{t("common.cancel")}</Button>
            <Button 
              onClick={() => {
                if (selectedLibrary) {
                  const data: any = { ...formData };
                  if (!data.password) delete data.password;
                  updateMutation.mutate({ id: selectedLibrary.id, data });
                }
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? t("admin.libraries.updating") : t("admin.libraries.saveBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المكتبة: {selectedLibrary?.name}</DialogTitle>
          </DialogHeader>
          {libraryDetails && (
            <Tabs defaultValue="info">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">{t("admin.libraries.infoTab")}</TabsTrigger>
                <TabsTrigger value="products">المنتجات ({libraryDetails.products?.length || 0})</TabsTrigger>
                <TabsTrigger value="activity">{t("admin.libraries.activityTab")}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("admin.libraries.username")}</Label>
                    <p className="font-medium">@{libraryDetails.username}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("admin.libraries.locationLabel")}</Label>
                    <p className="font-medium">{libraryDetails.location || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("admin.libraries.activityPoints")}</Label>
                    <p className="font-medium">{libraryDetails.activityScore}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("admin.libraries.commissionRate")}</Label>
                    <p className="font-medium">{libraryDetails.commissionRatePct ?? 10}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("admin.libraries.totalSales")}</Label>
                    <p className="font-medium">{libraryDetails.totalSales}</p>
                  </div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t("admin.libraries.referralCodeLabel")}</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-background px-2 py-1 rounded">{libraryDetails.referralCode}</code>
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(libraryDetails.referralCode)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t("admin.libraries.loginLink")}</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-background px-2 py-1 rounded text-xs">{loginUrl}</code>
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(loginUrl)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold">{libraryDetails.stats?.totalProducts || 0}</p>
                      <p className="text-muted-foreground">{t("admin.libraries.totalProducts")}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold">{libraryDetails.stats?.totalReferrals || 0}</p>
                      <p className="text-muted-foreground">{t("admin.libraries.referrals")}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="products">
                {libraryDetails.products?.length > 0 ? (
                  <div className="space-y-2">
                    {libraryDetails.products.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {p.imageUrl && <img src={p.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />}
                          <div>
                            <p className="font-medium">{p.title}</p>
                            <p className="text-sm text-muted-foreground">{p.price} ج.م</p>
                          </div>
                        </div>
                        <Badge variant={p.isActive ? "default" : "secondary"}>
                          {p.stock} في المخزون
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">{t("admin.libraries.noProducts")}</p>
                )}
              </TabsContent>
              
              <TabsContent value="activity">
                {libraryDetails.activityLogs?.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {libraryDetails.activityLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-2 border-b">
                        <span className="text-sm">{log.action}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">+{log.points}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString("ar")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">{t("admin.libraries.noActivity")}</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.libraries.librarySettings")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Library Store UI Settings */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Store className="h-4 w-4" />
                إعدادات واجهة متجر المكتبات
              </h4>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-purple-500" />
                  <Label>{t("admin.libraries.showThemeToggle")}</Label>
                </div>
                <Switch
                  checked={libraryStoreSettings?.showThemeToggle !== false}
                  onCheckedChange={(checked) => updateLibraryStoreSettingsMutation.mutate({ showThemeToggle: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-500" />
                  <Label>{t("admin.libraries.showNotificationIcon")}</Label>
                </div>
                <Switch
                  checked={libraryStoreSettings?.showNotifications !== false}
                  onCheckedChange={(checked) => updateLibraryStoreSettingsMutation.mutate({ showNotifications: checked })}
                />
              </div>
            </div>

            {/* Referral Settings */}
            {referralSettings && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  إعدادات الإحالات
                </h4>
              <div>
                <Label>{t("admin.libraries.pointsPerReferral")}</Label>
                <Input
                  type="number"
                  defaultValue={referralSettings.pointsPerReferral}
                  onChange={(e) => updateSettingsMutation.mutate({ pointsPerReferral: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t("admin.libraries.pointsPerSale")}</Label>
                <Input
                  type="number"
                  defaultValue={referralSettings.pointsPerSale}
                  onChange={(e) => updateSettingsMutation.mutate({ pointsPerSale: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t("admin.libraries.pointsPerProduct")}</Label>
                <Input
                  type="number"
                  defaultValue={referralSettings.pointsPerProductAdd}
                  onChange={(e) => updateSettingsMutation.mutate({ pointsPerProductAdd: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={referralSettings.isActive}
                  onCheckedChange={(checked) => updateSettingsMutation.mutate({ isActive: checked })}
                />
                <Label>{t("admin.libraries.enableReferrals")}</Label>
              </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
