import { useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, Package, Eye, Search, Star,
  Image, Tag, BarChart3, X, Copy, ShoppingCart,
  ArrowUpDown, Globe, Layers, Sparkles, Box,
  TrendingUp, DollarSign, Filter, Grid3X3, List, Upload, ChevronLeft, ChevronRight, GripVertical,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  price: string | number;
  originalPrice?: string | number | null;
  pointsPrice: number;
  stock: number;
  image?: string;
  images?: string[];
  categoryId?: string | null;
  productType?: string;
  brand?: string;
  rating?: string;
  reviewCount?: number;
  displayCountries?: string[];
  displayCurrencies?: string[];
  isFeatured?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

interface Category {
  id: string;
  parentId?: string | null;
  name: string;
  nameAr: string;
  namePt?: string | null;
  icon: string;
  color: string;
}

const PRODUCT_TYPES = [
  { value: "digital", label: i18next.t("admin.products.typeDigital"), icon: "💻" },
  { value: "physical", label: i18next.t("admin.products.typePhysical"), icon: "📦" },
  { value: "subscription", label: i18next.t("admin.products.typeSubscription"), icon: "🔄" },
];

export function ProductsTab({
  token }: { token: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [previewImage, setPreviewImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCategoryScope, setFilterCategoryScope] = useState<"all" | "main" | "sub">("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "price" | "points" | "stock" | "name">("date");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categoryScope, setCategoryScope] = useState<"all" | "main" | "sub">("all");
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    price: "",
    originalPrice: "",
    pointsPrice: "",
    stock: "999",
    image: "",
    images: [] as string[],
    categoryId: "",
    productType: "digital",
    brand: "",
    displayCountries: "",
    displayCurrencies: "",
    isFeatured: false,
    isActive: true,
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to fetch products");
      return (json?.data || []) as Product[];
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return (json?.data || []) as Category[];
    },
  });

  const mainCategories = useMemo(
    () => (categories || []).filter((c) => !c.parentId),
    [categories]
  );

  const subCategories = useMemo(
    () => (categories || []).filter((c) => !!c.parentId),
    [categories]
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    (categories || []).forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j?.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); resetForm(); toast({ title: t("admin.products.productCreated") }); },
    onError: (err: Error) => toast({ title: err.message || t("admin.products.productCreateFailed"), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j?.message || "Failed to update"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); resetForm(); toast({ title: t("admin.products.productUpdated") }); },
    onError: (err: Error) => toast({ title: err.message || t("admin.products.productUpdateFailed"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j?.message || "Failed to delete"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); toast({ title: t("admin.products.productDeleted") }); },
    onError: (err: Error) => toast({ title: err.message || t("admin.products.productDeleteFailed"), variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (p: Product) => {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: p.name + " " + t("admin.products.copy"),
          nameAr: p.nameAr ? p.nameAr + " " + t("admin.products.copy") : "",
          description: p.description,
          descriptionAr: p.descriptionAr,
          price: parseFloat(typeof p.price === "string" ? p.price : p.price.toString()),
          originalPrice: p.originalPrice ? parseFloat(p.originalPrice.toString()) : null,
          pointsPrice: p.pointsPrice,
          stock: p.stock,
          image: p.image,
          categoryId: p.categoryId,
          productType: p.productType || "digital",
          brand: p.brand,
          displayCountries: Array.isArray(p.displayCountries) ? p.displayCountries.join(",") : "",
          displayCurrencies: Array.isArray(p.displayCurrencies) ? p.displayCurrencies.join(",") : "",
          isFeatured: false,
          isActive: false,
        }),
      });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); toast({ title: t("admin.products.productDuplicated") }); },
    onError: (err: Error) => toast({ title: err.message || t("admin.products.productDuplicateFailed"), variant: "destructive" }),
  });

  const resetForm = () => {
    setShowModal(false);
    setEditingProduct(null);
    setPreviewImage(false);
    setCategoryScope("all");
    setUploadingImages(false);
    setForm({
      name: "", nameAr: "", description: "", descriptionAr: "",
      price: "", originalPrice: "", pointsPrice: "", stock: "999",
      image: "", images: [], categoryId: "", productType: "digital", brand: "",
      displayCountries: "", displayCurrencies: "",
      isFeatured: false, isActive: true,
    });
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("images", f));
      const res = await fetch("/api/admin/products/upload-images", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Upload failed");
      const urls: string[] = json?.data?.urls || [];
      setForm((prev) => {
        const newImages = [...prev.images, ...urls];
        return { ...prev, images: newImages, image: prev.image || newImages[0] || "" };
      });
      toast({ title: `تم رفع ${urls.length} صور بنجاح` });
    } catch (err: any) {
      toast({ title: err.message || "فشل رفع الصور", variant: "destructive" });
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setForm((prev) => {
      const newImages = prev.images.filter((_, i) => i !== idx);
      const removedUrl = prev.images[idx];
      // If removed image was the main image, set next one
      const newMainImage = prev.image === removedUrl ? (newImages[0] || "") : prev.image;
      // Try to delete file from server (best effort)
      fetch("/api/admin/products/delete-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: removedUrl }),
      }).catch(() => {});
      return { ...prev, images: newImages, image: newMainImage };
    });
  };

  const setMainImage = (url: string) => {
    setForm((prev) => ({ ...prev, image: url }));
  };

  const moveImage = (fromIdx: number, toIdx: number) => {
    setForm((prev) => {
      const newImages = [...prev.images];
      const [moved] = newImages.splice(fromIdx, 1);
      newImages.splice(toIdx, 0, moved);
      return { ...prev, images: newImages };
    });
  };

  const openEdit = (p: Product) => {
    const editedCategory = (categories || []).find((c) => c.id === p.categoryId);
    if (editedCategory?.parentId) setCategoryScope("sub");
    else if (editedCategory) setCategoryScope("main");
    else setCategoryScope("all");

    setEditingProduct(p);
    setForm({
      name: p.name,
      nameAr: p.nameAr || "",
      description: p.description || "",
      descriptionAr: p.descriptionAr || "",
      price: typeof p.price === "string" ? p.price : p.price.toString(),
      originalPrice: p.originalPrice ? p.originalPrice.toString() : "",
      pointsPrice: p.pointsPrice.toString(),
      stock: p.stock.toString(),
      image: p.image || "",
      images: p.images || [],
      categoryId: p.categoryId || "",
      productType: p.productType || "digital",
      brand: p.brand || "",
      displayCountries: Array.isArray(p.displayCountries) ? p.displayCountries.join(",") : "",
      displayCurrencies: Array.isArray(p.displayCurrencies) ? p.displayCurrencies.join(",") : "",
      isFeatured: p.isFeatured || false,
      isActive: p.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.price || !form.pointsPrice) return;
    const payload = {
      name: form.name,
      nameAr: form.nameAr || null,
      description: form.description || null,
      descriptionAr: form.descriptionAr || null,
      price: parseFloat(form.price),
      originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
      pointsPrice: parseInt(form.pointsPrice),
      stock: parseInt(form.stock) || 999,
      image: form.image || (form.images.length > 0 ? form.images[0] : null),
      images: form.images,
      categoryId: form.categoryId || null,
      productType: form.productType,
      brand: form.brand || null,
      displayCountries: form.displayCountries,
      displayCurrencies: form.displayCurrencies,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
    };
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Stats
  const list = products || [];
  const activeCount = list.filter((p) => p.isActive !== false).length;
  const featuredCount = list.filter((p) => p.isFeatured).length;
  const lowStock = list.filter((p) => p.stock < 10).length;
  const totalValue = list.reduce((s, p) => s + parseFloat(typeof p.price === "string" ? p.price : p.price.toString()) * p.stock, 0);

  // Filter & sort
  let filtered = list;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || (p.nameAr || "").includes(q) || (p.brand || "").toLowerCase().includes(q));
  }
  if (filterCategory !== "all") {
    filtered = filtered.filter((p) => {
      if (p.categoryId === filterCategory) return true;
      if (!p.categoryId) return false;
      const productCategory = categoryMap.get(p.categoryId);
      return !!productCategory?.parentId && productCategory.parentId === filterCategory;
    });
  }
  if (filterType !== "all") filtered = filtered.filter((p) => (p.productType || "digital") === filterType);
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "price": return parseFloat(b.price.toString()) - parseFloat(a.price.toString());
      case "points": return b.pointsPrice - a.pointsPrice;
      case "stock": return a.stock - b.stock;
      case "name": return a.name.localeCompare(b.name, "ar");
      default: return new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime();
    }
  });

  const getPrice = (p: Product) => parseFloat(typeof p.price === "string" ? p.price : p.price.toString());
  const getDiscount = (p: Product) => {
    if (!p.originalPrice) return 0;
    const orig = parseFloat(p.originalPrice.toString());
    return orig > getPrice(p) ? Math.round((1 - getPrice(p) / orig) * 100) : 0;
  };

  const getCategoryName = (catId?: string | null) => {
    if (!catId || !categories) return null;
    return categories.find((c) => c.id === catId);
  };

  const getCategoryLabel = (cat?: Category | null) => {
    if (!cat) return "";
    return cat.nameAr || cat.name;
  };

  const categoryOptions = useMemo(() => {
    if (!categories) return [] as Category[];

    if (categoryScope === "main") {
      return mainCategories;
    }

    if (categoryScope === "sub") {
      return subCategories;
    }

    return categories;
  }, [categories, categoryScope, mainCategories, subCategories]);

  const filterCategoryOptions = useMemo(() => {
    if (!categories) return [] as Category[];

    if (filterCategoryScope === "main") {
      return mainCategories;
    }

    if (filterCategoryScope === "sub") {
      return subCategories;
    }

    return categories;
  }, [categories, filterCategoryScope, mainCategories, subCategories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-500" />
            إدارة المنتجات
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.products.subtitle")}</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
          <Plus className="h-4 w-4" />
          منتج جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{list.length}</p>
                <p className="text-xs text-muted-foreground">{t("admin.products.totalProducts")}</p>
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
                <p className="text-xs text-muted-foreground">{t("admin.products.activeProducts")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{featuredCount}</p>
                <p className="text-xs text-muted-foreground">{t("admin.products.featuredProducts")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                <Box className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lowStock}</p>
                <p className="text-xs text-muted-foreground">{t("admin.products.lowStock")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        {/* Search + View toggle */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border rounded-xl text-sm bg-background"
              placeholder={t("admin.products.searchPlaceholder")}
            />
          </div>
          <div className="flex gap-1 border rounded-lg p-0.5">
            <Button size="icon" variant={viewMode === "grid" ? "default" : "ghost"} className="h-8 w-8" onClick={() => setViewMode("grid")}>
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant={viewMode === "list" ? "default" : "ghost"} className="h-8 w-8" onClick={() => setViewMode("list")}>
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Sort & Filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">{t("admin.products.sortBy")}</span>
          {([
            { key: "date", label: t("admin.products.sortNewest") },
            { key: "price", label: t("admin.products.sortPrice") },
            { key: "points", label: t("admin.products.sortPoints") },
            { key: "stock", label: t("admin.products.sortStock") },
            { key: "name", label: t("admin.products.sortName") },
          ] as const).map((s) => (
            <Button key={s.key} size="sm" variant={sortBy === s.key ? "default" : "outline"} className="h-7 text-xs" onClick={() => setSortBy(s.key)}>
              {s.label}
            </Button>
          ))}

          <span className="text-sm text-muted-foreground mr-3">| نوع:</span>
          <Button size="sm" variant={filterType === "all" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilterType("all")}>الكل</Button>
          {PRODUCT_TYPES.map((t) => (
            <Button key={t.value} size="sm" variant={filterType === t.value ? "default" : "outline"} className="h-7 text-xs gap-1" onClick={() => setFilterType(t.value)}>
              {t.icon} {t.label}
            </Button>
          ))}

          {categories && categories.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground mr-3">| فئة:</span>
              <Button
                size="sm"
                variant={filterCategoryScope === "main" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => {
                  setFilterCategoryScope("main");
                  setFilterCategory("all");
                }}
              >
                رئيسي
              </Button>
              <Button
                size="sm"
                variant={filterCategoryScope === "sub" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => {
                  setFilterCategoryScope("sub");
                  setFilterCategory("all");
                }}
              >
                فرعي
              </Button>
              <Button
                size="sm"
                variant={filterCategoryScope === "all" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => {
                  setFilterCategoryScope("all");
                  setFilterCategory("all");
                }}
              >
                كل الفئات
              </Button>
              <Button size="sm" variant={filterCategory === "all" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilterCategory("all")}>الكل</Button>
              {filterCategoryOptions.map((c) => {
                const parent = c.parentId ? categoryMap.get(c.parentId) : null;
                const label = c.parentId
                  ? `${(parent?.nameAr || parent?.name || "")}${parent ? " / " : ""}${c.nameAr || c.name}`
                  : (c.nameAr || c.name);
                return (
                  <Button key={c.id} size="sm" variant={filterCategory === c.id ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilterCategory(c.id)}>
                    {label}
                  </Button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">{searchQuery ? "لا توجد نتائج" : "لا توجد منتجات بعد"}</p>
            <p className="text-sm text-muted-foreground mb-4">أضف منتجك الأول ليظهر في المتجر</p>
            {!searchQuery && (
              <Button onClick={() => setShowModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة أول منتج
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const discount = getDiscount(p);
            const cat = getCategoryName(p.categoryId);
            return (
              <Card key={p.id} className={`overflow-hidden transition-all group ${p.isActive === false ? "opacity-60" : "hover:shadow-lg"}`}>
                {/* Image */}
                <div className="relative aspect-[16/10] bg-muted/30">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Images count badge */}
                  {p.images && p.images.length > 1 && (
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-black/60 text-white text-[10px] gap-0.5">
                        <Image className="h-2.5 w-2.5" /> {p.images.length}
                      </Badge>
                    </div>
                  )}
                  {/* Badges overlay */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {p.isFeatured && (
                      <Badge className="bg-amber-500 text-white gap-1 text-[10px]">
                        <Star className="h-2.5 w-2.5" /> مميز
                      </Badge>
                    )}
                    {discount > 0 && (
                      <Badge className="bg-red-500 text-white text-[10px]">-{discount}%</Badge>
                    )}
                    {p.stock < 10 && p.stock > 0 && (
                      <Badge className="bg-orange-500 text-white text-[10px]">مخزون قليل</Badge>
                    )}
                    {p.stock === 0 && (
                      <Badge className="bg-red-700 text-white text-[10px]">نفد المخزون</Badge>
                    )}
                  </div>
                  {p.isActive === false && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-gray-500 text-white text-[10px]">متوقف</Badge>
                    </div>
                  )}
                </div>

                <CardContent className="pt-3 pb-3 px-4">
                  {/* Category & Type */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {cat && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cat.color + "20", color: cat.color }}>
                        {cat.nameAr || cat.name}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {PRODUCT_TYPES.find((t) => t.value === (p.productType || "digital"))?.icon}{" "}
                      {PRODUCT_TYPES.find((t) => t.value === (p.productType || "digital"))?.label}
                    </span>
                    {p.brand && <span className="text-[10px] text-muted-foreground">• {p.brand}</span>}
                  </div>

                  {/* Name */}
                  <h3 className="font-bold text-sm truncate">{p.name}</h3>
                  {p.nameAr && p.nameAr !== p.name && (
                    <p className="text-xs text-muted-foreground truncate">{p.nameAr}</p>
                  )}

                  {/* Price row */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-green-600">{getPrice(p).toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground">ج.م</span>
                    </div>
                    {discount > 0 && p.originalPrice && (
                      <span className="text-xs text-muted-foreground line-through">{parseFloat(p.originalPrice.toString()).toFixed(2)}</span>
                    )}
                    <span className="text-xs text-blue-600 font-medium mr-auto">{p.pointsPrice} نقطة</span>
                  </div>

                  {/* Stock */}
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>المخزون: {p.stock}</span>
                    {p.rating && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-400 fill-amber-400" />{p.rating}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 mt-3 pt-2 border-t">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => openEdit(p)}>
                      <Edit className="h-3 w-3" /> تعديل
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateMutation.mutate(p)} title="نسخ">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => { if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) deleteMutation.mutate(p.id); }}
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="grid gap-3">
          {filtered.map((p) => {
            const discount = getDiscount(p);
            const cat = getCategoryName(p.categoryId);
            return (
              <Card key={p.id} className={`transition-all ${p.isActive === false ? "opacity-60 hover:opacity-80" : "hover:shadow-md"}`}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="shrink-0">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-20 h-14 sm:w-28 sm:h-18 object-cover rounded-lg ring-1 ring-gray-200 dark:ring-gray-700" />
                      ) : (
                        <div className="w-20 h-14 sm:w-28 sm:h-18 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-bold text-sm truncate">{p.name}</h3>
                            {p.isFeatured && <Badge className="bg-amber-500 text-white gap-0.5 text-[10px] h-4"><Star className="h-2.5 w-2.5" />مميز</Badge>}
                            {p.isActive === false && <Badge variant="secondary" className="text-[10px] h-4">متوقف</Badge>}
                            {discount > 0 && <Badge className="bg-red-500 text-white text-[10px] h-4">-{discount}%</Badge>}
                            {cat && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cat.color + "20", color: cat.color }}>
                                {cat.nameAr}
                              </span>
                            )}
                          </div>

                          {/* Price & stats */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span className="font-semibold text-green-600 text-sm">{getPrice(p).toFixed(2)} ج.م</span>
                            {discount > 0 && p.originalPrice && (
                              <span className="line-through">{parseFloat(p.originalPrice.toString()).toFixed(2)}</span>
                            )}
                            <span className="text-blue-600 font-medium">{p.pointsPrice} نقطة</span>
                            <span>المخزون: {p.stock}</span>
                            <span>{PRODUCT_TYPES.find((t) => t.value === (p.productType || "digital"))?.icon} {PRODUCT_TYPES.find((t) => t.value === (p.productType || "digital"))?.label}</span>
                            {p.brand && <span>• {p.brand}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)} title="تعديل">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateMutation.mutate(p)} title="نسخ">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => { if (confirm("حذف المنتج؟")) deleteMutation.mutate(p.id); }}>
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
                  <Package className="h-5 w-5 text-blue-500" />
                  {editingProduct ? "تعديل المنتج" : "إنشاء منتج جديد"}
                </CardTitle>
                <Button size="icon" variant="ghost" onClick={resetForm} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {/* Name EN + AR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                    <Tag className="h-3.5 w-3.5 text-blue-500" />
                    اسم المنتج (EN) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-background"
                    placeholder="Product Name"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                    <Tag className="h-3.5 w-3.5 text-blue-500" />
                    اسم المنتج (عربي)
                  </label>
                  <input
                    type="text"
                    value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-background"
                    placeholder="اسم المنتج بالعربي"
                  />
                </div>
              </div>

              {/* Description EN + AR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">الوصف (EN)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none bg-background"
                    rows={2} placeholder="Description" dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">الوصف (عربي)</label>
                  <textarea
                    value={form.descriptionAr}
                    onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none bg-background"
                    rows={2} placeholder="وصف المنتج بالعربي"
                  />
                </div>
              </div>

              {/* Price + Original Price + Points */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <DollarSign className="h-3.5 w-3.5 text-green-500" />
                  التسعير
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">السعر (ج.م) *</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">السعر الأصلي</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.originalPrice}
                      onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                      className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background"
                      placeholder="قبل الخصم"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">النقاط *</label>
                    <input
                      type="number" min="0"
                      value={form.pointsPrice}
                      onChange={(e) => setForm({ ...form, pointsPrice: e.target.value })}
                      className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background"
                      placeholder="100"
                    />
                  </div>
                </div>
                {form.price && form.originalPrice && parseFloat(form.originalPrice) > parseFloat(form.price) && (
                  <p className="text-xs text-green-600 mt-1">
                    خصم {Math.round((1 - parseFloat(form.price) / parseFloat(form.originalPrice)) * 100)}%
                  </p>
                )}
              </div>

              {/* Stock + Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                    <Box className="h-3.5 w-3.5 text-orange-500" />
                    المخزون
                  </label>
                  <input
                    type="number" min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm bg-background"
                    placeholder="999"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    العلامة التجارية
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm bg-background"
                    placeholder="مثال: Samsung, Nike..."
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                    <Globe className="h-3.5 w-3.5 text-indigo-500" />
                    الدول المعروض لها المنتج
                  </label>
                  <input
                    type="text"
                    value={form.displayCountries}
                    onChange={(e) => setForm({ ...form, displayCountries: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm bg-background"
                    placeholder="EG,SA,AE"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-1">اتركها فارغة لعرض المنتج في كل الدول</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                    <DollarSign className="h-3.5 w-3.5 text-green-500" />
                    العملات المتاحة
                  </label>
                  <input
                    type="text"
                    value={form.displayCurrencies}
                    onChange={(e) => setForm({ ...form, displayCurrencies: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm bg-background"
                    placeholder="EGP,SAR,USD"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-1">اتركها فارغة لإتاحة كل العملات</p>
                </div>
              </div>

              {/* Category + Product Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                    <Layers className="h-3.5 w-3.5 text-indigo-500" />
                    الفئة
                  </label>
                  <div className="flex items-center gap-1 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryScope("main");
                        setForm({ ...form, categoryId: "" });
                      }}
                      className={`px-2 py-1 rounded-lg text-xs border transition-colors ${
                        categoryScope === "main"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      قسم رئيسي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryScope("sub");
                        setForm({ ...form, categoryId: "" });
                      }}
                      className={`px-2 py-1 rounded-lg text-xs border transition-colors ${
                        categoryScope === "sub"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      قسم فرعي
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryScope("all")}
                      className={`px-2 py-1 rounded-lg text-xs border transition-colors ${
                        categoryScope === "all"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      الكل
                    </button>
                  </div>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm bg-background"
                  >
                    <option value="">بدون فئة</option>
                    {categoryOptions.map((c) => {
                      const parent = c.parentId ? categoryMap.get(c.parentId) : null;
                      const prefix = c.parentId ? `${getCategoryLabel(parent)} / ` : "";
                      return (
                        <option key={c.id} value={c.id}>
                          {`${prefix}${getCategoryLabel(c)}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                    <Package className="h-3.5 w-3.5 text-cyan-500" />
                    نوع المنتج
                  </label>
                  <div className="flex gap-2">
                    {PRODUCT_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm({ ...form, productType: t.value })}
                        className={`flex-1 py-2 px-2 rounded-xl border-2 text-center text-xs font-medium transition-all ${
                          form.productType === t.value
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Images — Upload from device */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <Image className="h-3.5 w-3.5 text-pink-500" />
                  صور المنتج
                  {form.images.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] mr-1">{form.images.length} صور</Badge>
                  )}
                </label>

                {/* Upload button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-dashed border-2 py-6 mb-3"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImages}
                >
                  {uploadingImages ? (
                    <span className="animate-pulse">جاري الرفع...</span>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-pink-500" />
                      <span>اختر صور من الجهاز (حتى 10 صور)</span>
                    </>
                  )}
                </Button>

                {/* Image gallery */}
                {form.images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {form.images.map((url, idx) => (
                      <div
                        key={idx}
                        className={`relative group aspect-square rounded-lg overflow-hidden ring-2 transition-all ${
                          form.image === url
                            ? "ring-blue-500 shadow-lg"
                            : "ring-gray-200 dark:ring-gray-700 hover:ring-blue-300"
                        }`}
                      >
                        <img
                          src={url}
                          alt={`صورة ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setMainImage(url)}
                          onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                        />
                        {form.image === url && (
                          <div className="absolute top-1 right-1">
                            <Badge className="bg-blue-500 text-white text-[9px] px-1">رئيسية</Badge>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                          {idx > 0 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); moveImage(idx, idx - 1); }}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          )}
                          {idx < form.images.length - 1 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); moveImage(idx, idx + 1); }}
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Featured + Active toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
                  <div className="flex items-center gap-2">
                    <Star className={`h-4 w-4 ${form.isFeatured ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium">منتج مميز</p>
                      <p className="text-[10px] text-muted-foreground">يظهر في القسم المميز</p>
                    </div>
                  </div>
                  <Switch checked={form.isFeatured} onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
                  <div className="flex items-center gap-2">
                    <Eye className={`h-4 w-4 ${form.isActive ? "text-green-500" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium">{form.isActive ? "نشط" : "متوقف"}</p>
                      <p className="text-[10px] text-muted-foreground">{form.isActive ? "ظاهر في المتجر" : "مخفي"}</p>
                    </div>
                  </div>
                  <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t">
                <Button
                  onClick={handleSubmit}
                  disabled={!form.name.trim() || !form.price || !form.pointsPrice || createMutation.isPending || updateMutation.isPending}
                  className="flex-1 gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "جاري الحفظ..." : editingProduct ? "💾 تحديث المنتج" : "🚀 نشر المنتج"}
                </Button>
                <Button variant="outline" onClick={resetForm} className="gap-2">
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
