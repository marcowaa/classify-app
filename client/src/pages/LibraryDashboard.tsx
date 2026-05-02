import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import ImageCropper from "@/components/ImageCropper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getDateLocale } from "@/i18n/config";
import { queryClient } from "@/lib/queryClient";
import { LibraryNotificationBell } from "@/components/AccountNotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { RoleOnboardingChecklist } from "@/components/RoleOnboardingChecklist";
import { AccountSwitcherDialog } from "@/components/AccountSwitcherDialog";
import {
  Store, Package, Users, TrendingUp, Plus, Edit, Trash2,
  Copy, LogOut, Link, Share2, Activity, Truck, ShieldCheck, Wallet, Camera, Loader2, Upload
} from "lucide-react";

interface Product {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  discountPercent: number;
  discountMinQuantity: number;
  stock: number;
  isActive: boolean;
  displayCountries?: string[];
  displayCurrencies?: string[];
  moderationStatus?: "pending_review" | "approved" | "rejected";
  moderationReason?: string | null;
}

interface LibraryOrder {
  id: string;
  status: string;
  quantity: number;
  subtotal: string;
  shippingAddress: string | null;
  holdDays: number;
  protectionExpiresAt: string | null;
  deliveryCode: string | null;
  productTitle?: string;
  buyerName?: string;
  buyerEmail?: string;
  createdAt: string;
}

interface LibraryBalance {
  availableBalance: string;
  pendingBalance: string;
  totalSalesAmount: string;
  totalCommissionAmount: string;
}

interface LibraryWithdrawal {
  id: string;
  amount: string;
  paymentMethod: string;
  status: string;
  requestedAt: string;
}

interface LibraryInvoice {
  id: string;
  invoiceDate: string;
  totalOrders: number;
  grossSalesAmount: string;
  totalCommissionAmount: string;
  netAmount: string;
  status: string;
}

export default function LibraryDashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = localStorage.getItem("libraryToken");
  const libraryData = JSON.parse(localStorage.getItem("libraryData") || "{}");

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [cropperMode, setCropperMode] = useState<"avatar" | "cover">("avatar");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [deliveryCodes, setDeliveryCodes] = useState<Record<string, string>>({});
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [withdrawDetails, setWithdrawDetails] = useState("");
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    price: "",
    discountPercent: 0,
    discountMinQuantity: 1,
    stock: 0,
    displayCountries: "",
    displayCurrencies: "",
  });

  useEffect(() => {
    if (!token) {
      setLocation("/library/login");
    }
  }, [token, setLocation]);

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["library-profile"],
    queryFn: async () => {
      const res = await fetch("/api/library/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.data;
    },
    enabled: !!token,
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["library-products"],
    queryFn: async () => {
      const res = await fetch("/api/library/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!token,
  });

  const { data: referrals } = useQuery({
    queryKey: ["library-referrals"],
    queryFn: async () => {
      const res = await fetch("/api/library/referrals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!token,
  });

  const { data: activityLogs } = useQuery({
    queryKey: ["library-activity"],
    queryFn: async () => {
      const res = await fetch("/api/library/activity", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!token,
  });

  const { data: orders } = useQuery({
    queryKey: ["library-orders"],
    queryFn: async () => {
      const res = await fetch("/api/library/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return (data.data || []) as LibraryOrder[];
    },
    enabled: !!token,
  });

  const { data: balanceData } = useQuery({
    queryKey: ["library-balance"],
    queryFn: async () => {
      const res = await fetch("/api/library/balance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.data as LibraryBalance;
    },
    enabled: !!token,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["library-withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/library/withdrawals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return (data.data || []) as LibraryWithdrawal[];
    },
    enabled: !!token,
  });

  const { data: invoices } = useQuery({
    queryKey: ["library-daily-invoices"],
    queryFn: async () => {
      const res = await fetch("/api/library/invoices/daily", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return (data.data || []) as LibraryInvoice[];
    },
    enabled: !!token,
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: typeof productForm) => {
      const res = await fetch("/api/library/products", {
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
      toast({ title: t('libraryDashboard.productAddedSuccess') });
      setShowProductModal(false);
      resetProductForm();
      queryClient.invalidateQueries({ queryKey: ["library-products"] });
      queryClient.invalidateQueries({ queryKey: ["library-profile"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || t('libraryDashboard.productAddFailed'), variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/library/products/${id}`, {
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
      toast({ title: t('libraryDashboard.productUpdated') });
      setShowProductModal(false);
      setEditingProduct(null);
      resetProductForm();
      queryClient.invalidateQueries({ queryKey: ["library-products"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || t('libraryDashboard.productUpdateFailed'), variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/library/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('libraryDashboard.productDeleted') });
      queryClient.invalidateQueries({ queryKey: ["library-products"] });
      queryClient.invalidateQueries({ queryKey: ["library-profile"] });
    },
    onError: () => {
      toast({ title: t('libraryDashboard.productDeleteFailed'), variant: "destructive" });
    },
  });

  const shipOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/library/orders/${orderId}/ship`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to ship order");
      return body;
    },
    onSuccess: () => {
      toast({ title: t('libraryDashboard.orderShipped') });
      queryClient.invalidateQueries({ queryKey: ["library-orders"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || t('libraryDashboard.shipUpdateFailed'), variant: "destructive" });
    },
  });

  const verifyDeliveryMutation = useMutation({
    mutationFn: async ({ orderId, code }: { orderId: string; code: string }) => {
      const res = await fetch(`/api/library/orders/${orderId}/verify-delivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to verify delivery");
      return body;
    },
    onSuccess: (_, variables) => {
      toast({ title: t('libraryDashboard.deliveryConfirmed') });
      setDeliveryCodes((prev) => ({ ...prev, [variables.orderId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["library-orders"] });
      queryClient.invalidateQueries({ queryKey: ["library-balance"] });
      queryClient.invalidateQueries({ queryKey: ["library-daily-invoices"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || t('libraryDashboard.deliveryVerifyFailed'), variant: "destructive" });
    },
  });

  const createWithdrawalMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        amount: withdrawAmount,
        paymentMethod: withdrawMethod,
        paymentDetails: { details: withdrawDetails },
      };
      const res = await fetch("/api/library/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to request withdrawal");
      return body;
    },
    onSuccess: () => {
      toast({ title: t('libraryDashboard.withdrawalRequestSent') });
      setWithdrawAmount("");
      setWithdrawMethod("");
      setWithdrawDetails("");
      queryClient.invalidateQueries({ queryKey: ["library-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["library-balance"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || t('libraryDashboard.withdrawalRequestFailed'), variant: "destructive" });
    },
  });

  const resetProductForm = () => {
    setProductForm({
      title: "",
      description: "",
      imageUrl: "",
      price: "",
      discountPercent: 0,
      discountMinQuantity: 1,
      stock: 0,
      displayCountries: "",
      displayCurrencies: "",
    });
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      title: product.title,
      description: product.description || "",
      imageUrl: product.imageUrl || "",
      price: product.price,
      discountPercent: product.discountPercent,
      discountMinQuantity: product.discountMinQuantity,
      stock: product.stock,
      displayCountries: Array.isArray(product.displayCountries) ? product.displayCountries.join(",") : "",
      displayCurrencies: Array.isArray(product.displayCurrencies) ? product.displayCurrencies.join(",") : "",
    });
    setShowProductModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("libraryToken");
    localStorage.removeItem("libraryData");
    setLocation("/library/login");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t('libraryDashboard.copied') });
  };

  const uploadProductImage = async (file: File) => {
    if (!token) return;

    setIsUploadingImage(true);
    try {
      const presignRes = await fetch("/api/library/uploads/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentType: file.type || "image/jpeg",
          size: file.size,
          purpose: "library_product_image",
          originalName: file.name,
        }),
      });

      const presignJson = await presignRes.json();
      if (!presignRes.ok || !presignJson?.data?.uploadURL || !presignJson?.data?.objectPath) {
        throw new Error(presignJson?.message || t('libraryDashboard.imagePresignFailed'));
      }

      let putRes: Response | null = null;
      let directUploadError: unknown = null;

      try {
        putRes = await fetch(presignJson.data.uploadURL, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "image/jpeg",
          },
          body: file,
        });
      } catch (error) {
        directUploadError = error;
      }

      if (!putRes?.ok) {
        const isAbsoluteUploadURL = /^https?:\/\//i.test(String(presignJson.data.uploadURL || ""));

        if (isAbsoluteUploadURL) {
          const proxyRes = await fetch("/api/library/uploads/proxy", {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "image/jpeg",
              Authorization: `Bearer ${token}`,
              "x-upload-object-path": presignJson.data.objectPath,
            },
            body: file,
          });

          if (!proxyRes.ok) {
            const proxyJson = await proxyRes.json().catch(() => ({}));
            throw new Error(proxyJson?.message || t('libraryDashboard.imageStorageUploadFailed'));
          }
        } else {
          if (putRes) {
            throw new Error(t('libraryDashboard.imageStorageUploadFailed'));
          }
          throw new Error((directUploadError as any)?.message || t('libraryDashboard.imageStorageUploadFailed'));
        }
      }

      const finalizeRes = await fetch("/api/library/uploads/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          objectPath: presignJson.data.objectPath,
          mimeType: file.type || "image/jpeg",
          size: file.size,
          originalName: file.name,
          purpose: "library_product_image",
          dedupeKey: `library-product-${file.name}-${file.size}-${file.lastModified}`,
        }),
      });

      const finalizeJson = await finalizeRes.json();
      if (!finalizeRes.ok || !finalizeJson?.data?.url) {
        throw new Error(finalizeJson?.message || t('libraryDashboard.imageFinalizeFailed'));
      }

      setProductForm((prev) => ({ ...prev, imageUrl: finalizeJson.data.url }));
      toast({ title: t('libraryDashboard.imageUploadSuccess') });
    } catch (error: any) {
      toast({
        title: error?.message || t('libraryDashboard.imageUploadFailed'),
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Library profile image upload with cropper
  async function uploadLibraryProfileImage(file: File): Promise<string> {
    const presignRes = await fetch("/api/library/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        contentType: file.type,
        size: file.size,
        purpose: "library_profile_image",
        originalName: file.name,
      }),
    });
    if (!presignRes.ok) throw new Error(t('libraryDashboard.imageUploadFailed'));
    const presignJson = await presignRes.json();

    const uploadURL = presignJson.data.uploadURL;
    const isLocalUrl = uploadURL.startsWith("/api/");
    if (isLocalUrl) {
      const directRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!directRes.ok) throw new Error(t('libraryDashboard.imageStorageUploadFailed'));
    } else {
      const proxyRes = await fetch("/api/library/uploads/proxy", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type,
          "x-upload-object-path": presignJson.data.objectPath,
        },
        body: file,
      });
      if (!proxyRes.ok) throw new Error(t('libraryDashboard.imageStorageUploadFailed'));
    }

    const finalizeRes = await fetch("/api/library/uploads/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        objectPath: presignJson.data.objectPath,
        mimeType: file.type,
        size: file.size,
        originalName: file.name,
        purpose: "library_profile_image",
      }),
    });
    const finalizeJson = await finalizeRes.json();
    if (!finalizeRes.ok) throw new Error(t('libraryDashboard.imageFinalizeFailed'));
    return finalizeJson.data.url;
  }

  function handleSelectLibraryImage(e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t('libraryDashboard.selectImageOnly'), variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setCropperImage(url);
    setCropperMode(type);
    setCropperOpen(true);
    e.target.value = "";
  }

  async function handleCroppedLibraryImage(blob: Blob) {
    const type = cropperMode;
    const file = new File([blob], `library-${type}.jpg`, { type: "image/jpeg" });

    if (type === "avatar") setAvatarUploading(true);
    else setCoverUploading(true);

    try {
      const url = await uploadLibraryProfileImage(file);
      // Update library profile
      const updateRes = await fetch("/api/library/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          [type === "avatar" ? "imageUrl" : "coverImageUrl"]: url,
        }),
      });
      if (!updateRes.ok) throw new Error(t('libraryDashboard.profileUpdateFailed'));
      queryClient.invalidateQueries({ queryKey: ["library-profile"] });
      toast({ title: type === "avatar" ? t('libraryDashboard.avatarUploaded') : t('libraryDashboard.coverUploaded') });
    } catch (error: any) {
      toast({ title: error.message || t('libraryDashboard.imageUploadFailed'), variant: "destructive" });
    } finally {
      if (type === "avatar") setAvatarUploading(false);
      else setCoverUploading(false);
    }
  }

  const referralLink = `${window.location.origin}/?libraryRef=${profile?.referralCode || libraryData.referralCode}`;
  const libraryOnboardingItems = [
    { id: "add-product", label: t("libraryDashboard.addProduct") },
    { id: "review-orders", label: t("libraryDashboard.tabOrders") },
    { id: "review-finance", label: t("libraryDashboard.tabFinance") },
  ];

  if (!token) return null;

  if (loadingProfile) {
    return <div className="flex items-center justify-center min-h-screen">{t('libraryDashboard.pageLoading')}</div>;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {profile?.imageUrl ? (
              <img src={profile.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Store className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold truncate">{profile?.name || libraryData.name}</h1>
              <p className="text-sm text-muted-foreground truncate">{t('libraryDashboard.title')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <LanguageSelector />
            <LibraryNotificationBell />
            <AccountSwitcherDialog currentRole="library" />
            <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 ml-2" />
              <span className="hidden sm:inline">{t('libraryDashboard.logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-6">
        <RoleOnboardingChecklist storageKey="library" items={libraryOnboardingItems} />

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile?.totalProducts || 0}</p>
                  <p className="text-muted-foreground">{t('libraryDashboard.products')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile?.totalSales || 0}</p>
                  <p className="text-muted-foreground">{t('libraryDashboard.sales')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Share2 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{referrals?.length || 0}</p>
                  <p className="text-muted-foreground">{t('libraryDashboard.referrals')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile?.activityScore || 0}</p>
                  <p className="text-muted-foreground">{t('libraryDashboard.activityPoints')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              {t('libraryDashboard.referralLink')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label>{t('libraryDashboard.referralLinkLabel')}</Label>
                <div className="flex gap-2">
                  <Input value={referralLink} readOnly className="text-sm" />
                  <Button variant="outline" onClick={() => copyToClipboard(referralLink)} data-testid="button-copy-referral-link">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('libraryDashboard.referralCode')}</Label>
                <div className="flex gap-2">
                  <Input value={profile?.referralCode || ""} readOnly className="w-32" />
                  <Button variant="outline" onClick={() => copyToClipboard(profile?.referralCode || "")} data-testid="button-copy-referral-code">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="products">
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max min-w-full h-auto gap-1">
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="products">{t('libraryDashboard.tabProducts')}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="orders">{t('libraryDashboard.tabOrders')}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="referrals">{t('libraryDashboard.tabReferrals')}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="activity">{t('libraryDashboard.tabActivity')}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="finance">{t('libraryDashboard.tabFinance')}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="profile">{t('libraryDashboard.tabProfile')}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('libraryDashboard.myProducts')} ({products?.length || 0})</h2>
              <Button onClick={() => { resetProductForm(); setEditingProduct(null); setShowProductModal(true); }} data-testid="button-add-product">
                <Plus className="h-4 w-4 ml-2" />
                {t('libraryDashboard.addProduct')}
              </Button>
            </div>

            {loadingProducts ? (
              <div className="text-center py-8">{t('libraryDashboard.loading')}</div>
            ) : products?.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product: Product) => (
                  <Card key={product.id} className={!product.isActive ? "opacity-60" : ""} data-testid={`card-product-${product.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex gap-4">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.title} className="w-20 h-20 rounded-lg object-cover" />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium">{product.title}</h3>
                          <p className="text-lg font-bold text-primary">{product.price} {t('libraryDashboard.currency')}</p>
                          {product.discountPercent > 0 && (
                            <Badge variant="secondary" className="mt-1">
                              {t('libraryDashboard.discountBadge', { percent: product.discountPercent, min: product.discountMinQuantity })}
                            </Badge>
                          )}
                          {product.moderationStatus && (
                            <Badge variant={product.moderationStatus === "approved" ? "default" : product.moderationStatus === "rejected" ? "destructive" : "secondary"} className="mt-1 mr-1">
                              {product.moderationStatus === "approved" ? "معتمد" : product.moderationStatus === "rejected" ? "مرفوض" : "قيد المراجعة"}
                            </Badge>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">{t('libraryDashboard.stock')} {product.stock}</p>
                          {product.moderationReason && (
                            <p className="text-xs text-red-600 mt-1">سبب الرفض: {product.moderationReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end gap-1 mt-3">
                        <Button size="sm" variant="ghost" onClick={() => openEditProduct(product)} data-testid={`button-edit-product-${product.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(t('libraryDashboard.confirmDeleteProduct'))) {
                              deleteProductMutation.mutate(product.id);
                            }
                          }}
                          data-testid={`button-delete-product-${product.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('libraryDashboard.noProducts')}</p>
                  <Button className="mt-4" onClick={() => setShowProductModal(true)}>
                    <Plus className="h-4 w-4 ml-2" />
                    {t('libraryDashboard.addFirstProduct')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="referrals">
            {referrals?.length > 0 ? (
              <div className="space-y-2">
                {referrals.map((ref: any) => (
                  <div key={ref.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Badge variant={ref.status === "purchased" ? "default" : "secondary"}>
                        {ref.status === "clicked" ? t('libraryDashboard.referralClicked') : ref.status === "registered" ? t('libraryDashboard.referralRegistered') : t('libraryDashboard.referralPurchased')}
                      </Badge>
                      <span className="mr-2 text-sm text-muted-foreground">
                        {new Date(ref.createdAt).toLocaleDateString(getDateLocale())}
                      </span>
                    </div>
                    {ref.pointsAwarded > 0 && (
                      <Badge variant="outline">+{ref.pointsAwarded} {t('libraryDashboard.point')}</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('libraryDashboard.noReferrals')}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t('libraryDashboard.shareReferralHint')}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {(orders || []).length > 0 ? (
              <div className="space-y-3">
                {(orders || []).map((order) => (
                  <Card key={order.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{order.productTitle || t('libraryDashboard.libraryProduct')}</p>
                          <p className="text-sm text-muted-foreground">{t('libraryDashboard.buyer')} {order.buyerName || "-"} ({order.buyerEmail || "-"})</p>
                          <p className="text-sm text-muted-foreground">{t('libraryDashboard.quantity')} {order.quantity} • {t('libraryDashboard.total')} {order.subtotal}</p>
                          {order.shippingAddress && <p className="text-sm text-muted-foreground">{t('libraryDashboard.address')} {order.shippingAddress}</p>}
                        </div>
                        <Badge variant={order.status === "pending_admin" ? "secondary" : "outline"}>{order.status}</Badge>
                      </div>

                      {order.status === "pending_admin" && (
                        <div className="text-sm text-muted-foreground p-3 rounded-md bg-muted">
                          {t('libraryDashboard.orderPendingAdmin')}
                        </div>
                      )}

                      {order.status === "admin_confirmed" && (
                        <Button onClick={() => shipOrderMutation.mutate(order.id)} data-testid={`button-ship-${order.id}`}>
                          <Truck className="h-4 w-4 ml-2" /> {t('libraryDashboard.markShipped')}
                        </Button>
                      )}

                      {order.status === "shipped" && (
                        <div className="space-y-2">
                          <p className="text-sm">{t('libraryDashboard.enterDeliveryCode')}</p>
                          <div className="flex gap-2">
                            <Input
                              value={deliveryCodes[order.id] || ""}
                              onChange={(e) => setDeliveryCodes((prev) => ({ ...prev, [order.id]: e.target.value }))}
                              placeholder={t('libraryDashboard.deliveryCodePlaceholder')}
                            />
                            <Button
                              onClick={() => verifyDeliveryMutation.mutate({ orderId: order.id, code: deliveryCodes[order.id] || "" })}
                              data-testid={`button-deliver-${order.id}`}
                            >
                              <ShieldCheck className="h-4 w-4 ml-2" /> {t('libraryDashboard.markDelivered')}
                            </Button>
                          </div>
                        </div>
                      )}

                      {order.status === "delivered" && (
                        <div className="text-sm text-amber-700 bg-amber-50 rounded-md p-3">
                          {t('libraryDashboard.deliveredHoldNotice', { days: order.holdDays || 15 })}
                          {order.protectionExpiresAt && (
                            <span className="block mt-1">{t('libraryDashboard.availabilityDate')} {new Date(order.protectionExpiresAt).toLocaleDateString(getDateLocale())}</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">{t('libraryDashboard.noOrders')}</CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity">
            {activityLogs?.length > 0 ? (
              <div className="space-y-2">
                {activityLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span>{log.action === "product_added" ? t('libraryDashboard.activityProductAdded') : log.action === "product_updated" ? t('libraryDashboard.activityProductUpdated') : log.action}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">+{log.points}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleDateString(getDateLocale())}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('libraryDashboard.noActivity')}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="finance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{t('libraryDashboard.availableBalance')}</p>
                  <p className="text-2xl font-bold">{balanceData?.availableBalance || "0.00"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{t('libraryDashboard.pendingBalance')}</p>
                  <p className="text-2xl font-bold">{balanceData?.pendingBalance || "0.00"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{t('libraryDashboard.totalSales')}</p>
                  <p className="text-2xl font-bold">{balanceData?.totalSalesAmount || "0.00"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{t('libraryDashboard.totalCommission')}</p>
                  <p className="text-2xl font-bold">{balanceData?.totalCommissionAmount || "0.00"}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> {t('libraryDashboard.requestWithdrawal')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <Input
                    placeholder={t('libraryDashboard.amount')}
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <Input
                    placeholder={t('libraryDashboard.paymentMethodPlaceholder')}
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value)}
                  />
                  <Input
                    placeholder={t('libraryDashboard.paymentDetailsPlaceholder')}
                    value={withdrawDetails}
                    onChange={(e) => setWithdrawDetails(e.target.value)}
                  />
                </div>
                <Button onClick={() => createWithdrawalMutation.mutate()} disabled={createWithdrawalMutation.isPending}>
                  {createWithdrawalMutation.isPending ? t('libraryDashboard.sending') : t('libraryDashboard.confirmWithdrawal')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('libraryDashboard.withdrawalHistory')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(withdrawals || []).length > 0 ? (
                  (withdrawals || []).map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{w.amount} • {w.paymentMethod}</p>
                        <p className="text-xs text-muted-foreground">{new Date(w.requestedAt).toLocaleString(getDateLocale())}</p>
                      </div>
                      <Badge variant={w.status === "pending" ? "secondary" : "outline"}>{w.status}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('libraryDashboard.noWithdrawals')}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('libraryDashboard.dailyInvoices')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(invoices || []).length > 0 ? (
                  (invoices || []).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString(getDateLocale())}</p>
                        <p className="text-sm text-muted-foreground">{t('libraryDashboard.invoiceOrders')} {invoice.totalOrders} • {t('libraryDashboard.invoiceGross')} {invoice.grossSalesAmount} • {t('libraryDashboard.invoiceNet')} {invoice.netAmount}</p>
                      </div>
                      <Badge variant={invoice.status === "pending" ? "secondary" : "outline"}>{invoice.status}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('libraryDashboard.noInvoices')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="overflow-hidden">
              {/* Cover Image */}
              <div className="relative h-40 sm:h-48 md:h-56 bg-gradient-to-l from-emerald-500 to-teal-700">
                {profile?.coverImageUrl && (
                  <img src={profile.coverImageUrl} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  className="absolute bottom-2 left-2 bg-black/50 hover:bg-black/70 text-white rounded-full px-3 py-1.5 text-xs flex items-center gap-1 transition-all"
                >
                  {coverUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                  {coverUploading ? t('libraryDashboard.uploading') : t('libraryDashboard.changeCover')}
                </button>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSelectLibraryImage(e, "cover")} />
              </div>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="relative -mt-14">
                    {profile?.imageUrl ? (
                      <img src={profile.imageUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white object-cover shadow-lg bg-white" />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white bg-emerald-100 flex items-center justify-center shadow-lg">
                        <Store className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-600" />
                      </div>
                    )}
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
                    >
                      {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSelectLibraryImage(e, "avatar")} />
                  </div>
                  <div className="flex-1 pt-2">
                    <h2 className="text-xl font-bold">{profile?.name || libraryData.name}</h2>
                    {profile?.description && <p className="text-sm text-muted-foreground mt-1">{profile.description}</p>}
                    {profile?.bio && <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                      {profile?.location && <span>📍 {profile.location}</span>}
                      {profile?.email && <span>✉️ {profile.email}</span>}
                      {profile?.phoneNumber && <span>📱 {profile.phoneNumber}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? t("libraryDashboard.editProduct") : t("libraryDashboard.addNewProduct")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('libraryDashboard.productTitleLabel')}</Label>
              <Input
                value={productForm.title}
                onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                data-testid="input-product-title"
              />
            </div>
            <div>
              <Label>{t('libraryDashboard.productDescriptionLabel')}</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                data-testid="input-product-description"
              />
            </div>
            <div>
              <Label>{t('libraryDashboard.productImageUrlLabel')}</Label>
              <Input
                value={productForm.imageUrl}
                onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                data-testid="input-product-image"
              />
              <div className="mt-2 flex items-center gap-2">
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await uploadProductImage(file);
                      }
                      e.currentTarget.value = "";
                    }}
                  />
                  <span className={`inline-flex items-center rounded-md border px-3 py-2 text-sm cursor-pointer ${isUploadingImage ? "opacity-60 pointer-events-none" : ""}`}>
                    {isUploadingImage ? t('libraryDashboard.uploading') : t('libraryDashboard.chooseFromGallery')}
                  </span>
                </label>
              </div>
              {productForm.imageUrl && (
                <img
                  src={productForm.imageUrl}
                  alt="preview"
                  className="mt-2 h-20 w-20 rounded-md object-cover border"
                />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('libraryDashboard.productPriceLabel')}</Label>
                <Input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  data-testid="input-product-price"
                />
              </div>
              <div>
                <Label>{t('libraryDashboard.productStockLabel')}</Label>
                <Input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                  data-testid="input-product-stock"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('libraryDashboard.discountPercentLabel')}</Label>
                <Input
                  type="number"
                  value={productForm.discountPercent}
                  onChange={(e) => setProductForm({ ...productForm, discountPercent: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t('libraryDashboard.discountMinQuantityLabel')}</Label>
                <Input
                  type="number"
                  value={productForm.discountMinQuantity}
                  onChange={(e) => setProductForm({ ...productForm, discountMinQuantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>الدول المستهدفة</Label>
                <Input
                  value={productForm.displayCountries}
                  onChange={(e) => setProductForm({ ...productForm, displayCountries: e.target.value })}
                  placeholder="EG,SA,AE"
                />
              </div>
              <div>
                <Label>العملات المتاحة</Label>
                <Input
                  value={productForm.displayCurrencies}
                  onChange={(e) => setProductForm({ ...productForm, displayCurrencies: e.target.value })}
                  placeholder="EGP,SAR,USD"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductModal(false)}>{t('libraryDashboard.cancel')}</Button>
            <Button
              onClick={() => {
                if (editingProduct) {
                  updateProductMutation.mutate({ id: editingProduct.id, data: productForm });
                } else {
                  createProductMutation.mutate(productForm);
                }
              }}
              disabled={createProductMutation.isPending || updateProductMutation.isPending}
              data-testid="button-submit-product"
            >
              {createProductMutation.isPending || updateProductMutation.isPending ? t('libraryDashboard.saving') : t('libraryDashboard.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onClose={() => { setCropperOpen(false); setCropperImage(""); }}
        imageSrc={cropperImage}
        onCropComplete={handleCroppedLibraryImage}
        mode={cropperMode}
      />
    </div>
  );
}
