import { useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import i18next from "i18next";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Store, Star, Package, Search, Filter, ShoppingCart, BookOpen, Plus, Minus, X, CreditCard, MapPin, Check, Bell, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { authenticatedFetch } from "@/lib/queryClient";

interface Library {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  governorate?: string;
  activityScore: number;
  isActive: boolean;
  referralCode: string;
  productCount?: number;
}

interface LibraryProduct {
  id: string;
  libraryId: string;
  title?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  price: string;
  image?: string;
  imageUrl?: string;
  stock: number;
  discountPercent?: number;
  discountMinQuantity?: number;
  library?: Library;
}

interface CartItem {
  product: LibraryProduct;
  quantity: number;
}

const CART_STORAGE_KEY = "parent-store-cart";

const detectCheckoutPlatform = (): string => {
  if (typeof navigator !== "undefined") {
    const userAgent = navigator.userAgent || "";
    if (/android/i.test(userAgent)) return "android";
    if (/(iphone|ipad|ipod)/i.test(userAgent)) return "ios";
  }

  return "web";
};

function buildCheckoutIdempotencyKey(params: {
  items: Array<{ productId: string; quantity: number }>;
  paymentMethodId: string;
  shippingAddress: Record<string, string>;
  referralCode?: string;
}) {
  const normalizedItems = [...params.items]
    .map((item) => ({ productId: String(item.productId), quantity: Number(item.quantity) }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

  const shipping = {
    name: (params.shippingAddress.name || "").trim(),
    line1: (params.shippingAddress.line1 || "").trim(),
    city: (params.shippingAddress.city || "").trim(),
    state: (params.shippingAddress.state || "").trim(),
    postalCode: (params.shippingAddress.postalCode || "").trim(),
    country: (params.shippingAddress.country || "").trim(),
  };

  const payload = JSON.stringify({
    items: normalizedItems,
    paymentMethodId: String(params.paymentMethodId || ""),
    shipping,
    referralCode: String(params.referralCode || ""),
  });

  const encoded = btoa(unescape(encodeURIComponent(payload))).replace(/[^a-zA-Z0-9]/g, "").slice(0, 96);
  return `checkout_${encoded}`;
}

const normalizeSharedCartProduct = (product: LibraryProduct): LibraryProduct => {
  const resolvedName = product.title || product.nameAr || product.name || i18next.t("libraryStore.product");
  const resolvedImage = product.imageUrl || product.image;

  return {
    ...product,
    title: resolvedName,
    name: product.name || resolvedName,
    nameAr: product.nameAr || resolvedName,
    imageUrl: resolvedImage,
    image: resolvedImage,
    stock: typeof product.stock === "number" ? product.stock : 999,
    price: String(product.price ?? "0"),
  };
};

export default function LibraryStore() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const checkoutPlatform = useMemo(() => detectCheckoutPlatform(), []);
  const checkoutPurchaseKind = "physical";
  const referralCode = useMemo(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")?.trim();
    return ref ? ref.toUpperCase() : "";
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<LibraryProduct | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<LibraryProduct | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedShippingProviderKey, setSelectedShippingProviderKey] = useState("standard");
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    line1: "",
    city: "",
    state: "",
    postalCode: "",
    country: "EG",
  });

  const { data: libraryStoreSettings } = useQuery({
    queryKey: ["library-store-settings"],
    queryFn: async () => {
      const res = await fetch("/api/public/library-store-settings");
      if (!res.ok) return { showThemeToggle: true, showNotifications: true };
      const json = await res.json();
      return json?.data || { showThemeToggle: true, showNotifications: true };
    },
  });

  const { data: unreadNotificationsData } = useQuery<{ count: number }>({
    queryKey: ["/api/parent/notifications/unread-count"],
    queryFn: () => authenticatedFetch<{ count: number }>("/api/parent/notifications/unread-count"),
    enabled: !!token,
  });

  const unreadNotifications = typeof unreadNotificationsData?.count === "number"
    ? unreadNotificationsData.count
    : 0;

  const { data: referralLibraryData } = useQuery({
    queryKey: ["library-by-referral", referralCode],
    queryFn: async () => {
      const res = await fetch(`/api/store/libraries/by-referral/${encodeURIComponent(referralCode)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    },
    enabled: !!referralCode,
  });

  const { data: librariesData, isLoading: loadingLibraries } = useQuery({
    queryKey: ["store-libraries"],
    queryFn: async () => {
      const res = await fetch("/api/store/libraries");
      const json = await res.json();
      return json?.data || [];
    },
  });

  const libraries: Library[] = librariesData || [];

  useEffect(() => {
    const referralLibrary = referralLibraryData as Library | null;
    if (!referralCode || !referralLibrary?.id) return;

    setSelectedLibrary((current) => current || referralLibrary.id);
    localStorage.setItem("libraryReferralCode", referralCode);
    localStorage.setItem("libraryReferralLibraryId", referralLibrary.id);

    const clickSessionKey = `library-ref-click-${referralCode}`;
    if (sessionStorage.getItem(clickSessionKey) === "1") return;

    sessionStorage.setItem(clickSessionKey, "1");
    fetch(`/api/store/libraries/${referralLibrary.id}/referral-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode }),
    }).catch(() => {
      sessionStorage.removeItem(clickSessionKey);
    });
  }, [referralCode, referralLibraryData]);

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["library-products", selectedLibrary, libraries.length],
    queryFn: async () => {
      if (selectedLibrary) {
        const res = await fetch(`/api/store/libraries/${selectedLibrary}`);
        const json = await res.json();
        return (json?.data?.products || []).map((p: any) => ({
          id: p.id,
          libraryId: p.libraryId,
          title: p.title,
          description: p.description,
          imageUrl: p.imageUrl,
          price: p.price,
          stock: p.stock,
          discountPercent: p.discountPercent || 0,
          discountMinQuantity: p.discountMinQuantity || 1,
        }));
      }
      const allProducts: any[] = [];
      for (const lib of libraries.slice(0, 5)) {
        const res = await fetch(`/api/store/libraries/${lib.id}`);
        const json = await res.json();
        if (json?.data?.products) {
          allProducts.push(...json.data.products.map((p: any) => ({
            id: p.id,
            libraryId: p.libraryId,
            title: p.title,
            description: p.description,
            imageUrl: p.imageUrl,
            price: p.price,
            stock: p.stock,
            discountPercent: p.discountPercent || 0,
            discountMinQuantity: p.discountMinQuantity || 1,
            library: lib,
          })));
        }
      }
      return allProducts;
    },
    enabled: libraries.length > 0 || !!selectedLibrary,
  });

  const products: LibraryProduct[] = productsData || [];

  const { data: paymentMethodsData } = useQuery({
    queryKey: ["library-store-payment-methods"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("platform", checkoutPlatform);
      params.set("purchaseKind", checkoutPurchaseKind);
      const res = await fetch(`/api/store/payment-methods?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  const { data: shippingProvidersData } = useQuery({
    queryKey: ["library-store-shipping-providers"],
    queryFn: async () => {
      const res = await fetch("/api/store/shipping-providers");
      const json = await res.json();
      return json?.data || [];
    },
    enabled: true,
  });

  const { data: walletData } = useQuery({
    queryKey: ["library-store-wallet"],
    queryFn: async () => {
      const res = await fetch("/api/parent/wallet", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
  });

  const paymentMethods: any[] = paymentMethodsData || [];
  const shippingProviders: any[] = shippingProvidersData || [];
  const suggestedShippingProvider = useMemo(
    () => shippingProviders.find((provider: any) => provider?.recommended),
    [shippingProviders]
  );
  const inHomeShippingProvider = useMemo(
    () => shippingProviders.find((provider: any) => provider?.key === "in_home"),
    [shippingProviders]
  );
  const wallet: any = walletData || {};

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setCart(parsed);
      }
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  const cartItemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(
      new CustomEvent("parent-store-cart-updated", { detail: { count: cartItemsCount } })
    );
  }, [cart, cartItemsCount]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0),
    [cart]
  );

  const checkoutItems = useMemo(() => {
    if (buyNowProduct) {
      return [{ product: normalizeSharedCartProduct(buyNowProduct), quantity: 1 }];
    }
    return cart;
  }, [buyNowProduct, cart]);

  const checkoutTotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0),
    [checkoutItems]
  );

  const isShippingAddressComplete = useMemo(() => {
    return !!(
      shippingAddress.name.trim() &&
      shippingAddress.city.trim() &&
      shippingAddress.line1.trim() &&
      shippingAddress.state.trim() &&
      shippingAddress.postalCode.trim()
    );
  }, [shippingAddress]);

  const checkoutMutation = useMutation({
    mutationFn: async (variables: { isBuyNow: boolean; idempotencyKey: string }) => {
      const response = await fetch("/api/store/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": variables.idempotencyKey,
        },
        body: JSON.stringify({
          items: checkoutItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          paymentMethodId: selectedPaymentMethod,
          shippingAddress,
          shippingProviderKey: selectedShippingProviderKey === "standard" ? null : selectedShippingProviderKey,
          totalAmount: checkoutTotal,
          referralCode,
          platform: checkoutPlatform,
          purchaseKind: checkoutPurchaseKind,
          idempotencyKey: variables.idempotencyKey,
          isBuyNow: variables.isBuyNow,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message || "Checkout failed");
      }
      return body;
    },
    onSuccess: (data, variables) => {
      if (data?.paymentRequired && data?.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      if (!variables?.isBuyNow) {
        setCart([]);
      }
      setShowCheckout(false);
      setShowCart(false);
      setBuyNowProduct(null);
      setSelectedPaymentMethod("");
      setShippingAddress({ name: "", line1: "", city: "", state: "", postalCode: "", country: "EG" });
      queryClient.invalidateQueries({ queryKey: ["library-store-wallet"] });
      alert(t('libraryStore.orderCreatedSuccess'));
    },
    onError: (error: any) => {
      alert(error?.message || t('libraryStore.purchaseFailed'));
    },
  });

  const requireParentAuth = () => {
    if (token) return true;
    alert(t('libraryStore.loginRequired'));
    navigate("/parent-auth");
    return false;
  };

  const addToCart = (product: LibraryProduct) => {
    if (!requireParentAuth()) return;
    if (Number(product.stock || 0) <= 0) {
      alert(t('libraryStore.productUnavailable'));
      return;
    }
    const normalizedProduct = normalizeSharedCartProduct(product);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === normalizedProduct.id);
      if (existing) {
        if (existing.quantity >= Number(normalizedProduct.stock || 0)) {
          return prev;
        }
        return prev.map((item) =>
          item.product.id === normalizedProduct.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product: normalizedProduct, quantity: 1 }];
    });
  };

  const handleBuyNow = (product: LibraryProduct) => {
    if (!requireParentAuth()) return;
    setBuyNowProduct(normalizeSharedCartProduct(product));
    setShowCheckout(true);
  };

  const getProductTitle = (product: LibraryProduct) => {
    return product.title || product.nameAr || product.name || t("libraryStore.product");
  };

  const getProductImage = (product: LibraryProduct) => {
    return product.imageUrl || product.image || "";
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) => prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item)));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCheckout = () => {
    if (!checkoutItems.length) {
      alert(t('libraryStore.cartEmpty'));
      return;
    }
    if (!selectedPaymentMethod) {
      alert(t('libraryStore.selectPayment'));
      return;
    }
    if (!isShippingAddressComplete) {
      alert(t('libraryStore.completeShipping'));
      return;
    }
    const idempotencyKey = buildCheckoutIdempotencyKey({
      items: checkoutItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      paymentMethodId: selectedPaymentMethod,
      shippingAddress,
      referralCode,
    });

    checkoutMutation.mutate({ isBuyNow: !!buyNowProduct, idempotencyKey });
  };

  const openProductDetail = (product: LibraryProduct) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const calculateDiscountedPrice = (product: LibraryProduct, quantity: number = 1) => {
    const basePrice = parseFloat(product.price);
    if (product.discountPercent && product.discountMinQuantity && quantity >= product.discountMinQuantity) {
      return basePrice * (1 - product.discountPercent / 100);
    }
    return basePrice;
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <header className={`sticky top-0 z-50 ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-store")}
              data-testid="button-back"
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              <h1 className="text-sm sm:text-xl font-bold hidden sm:inline">{t('libraryStore.storeTitle')}</h1>
            </div>
            <div className="flex items-center gap-1 mr-auto">
              <LanguageSelector />
              {libraryStoreSettings?.showNotifications !== false && token && (
                <ParentNotificationBell />
              )}
              {libraryStoreSettings?.showThemeToggle !== false && (
                <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              className="mr-1 sm:mr-3 text-xs sm:text-sm px-2 sm:px-4"
              onClick={() => {
                if (!requireParentAuth()) return;
                setShowCart(true);
              }}
              data-testid="button-library-cart"
            >
              <ShoppingCart className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline">{t('libraryStore.cartLabel')}</span> ({cartItemsCount})
            </Button>
          </div>

          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('libraryStore.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
                data-testid="input-search"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">{t('libraryStore.availableLibraries')}</h2>
            <Badge variant="secondary">{libraries.length}</Badge>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            <Button
              variant={selectedLibrary === null ? "default" : "outline"}
              onClick={() => setSelectedLibrary(null)}
              className="flex-shrink-0"
              data-testid="button-all-libraries"
            >
              {t('libraryStore.all')}
            </Button>
            {libraries.map((library) => (
              <Button
                key={library.id}
                variant={selectedLibrary === library.id ? "default" : "outline"}
                onClick={() => setSelectedLibrary(library.id)}
                className="flex-shrink-0"
                data-testid={`button-library-${library.id}`}
              >
                <div className="flex items-center gap-2">
                  <span>{library.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 ml-1" />
                    {library.activityScore}
                  </Badge>
                </div>
              </Button>
            ))}
          </div>
        </section>

        {loadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3 sm:p-4">
                  <div className={`h-24 sm:h-32 ${isDark ? "bg-gray-700" : "bg-gray-200"} rounded-lg mb-3`}></div>
                  <div className={`h-4 ${isDark ? "bg-gray-700" : "bg-gray-200"} rounded w-3/4 mb-2`}></div>
                  <div className={`h-4 ${isDark ? "bg-gray-700" : "bg-gray-200"} rounded w-1/2`}></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('libraryStore.noProducts')}</h3>
            <p className="text-gray-500">{t('libraryStore.noProductsInLibrary')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className={`hover-elevate cursor-pointer ${isDark ? "bg-gray-800 border-gray-700" : ""}`}
                onClick={() => openProductDetail(product)}
                data-testid={`card-product-${product.id}`}
              >
                <CardContent className="p-3 sm:p-4">
                  {getProductImage(product) ? (
                    <img
                      src={getProductImage(product)}
                      alt={getProductTitle(product)}
                      className="w-full h-24 sm:h-32 object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className={`w-full h-24 sm:h-32 ${isDark ? "bg-gray-700" : "bg-gray-100"} rounded-lg mb-3 flex items-center justify-center`}>
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}

                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                    {getProductTitle(product)}
                  </h3>

                  {product.library && (
                    <p className="text-xs text-gray-500 mb-2">{product.library.name}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-600">{product.price} {t('libraryStore.currency')}</span>
                    {product.discountPercent && product.discountPercent > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {t('libraryStore.discountBadge', { percent: product.discountPercent })}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <Package className="h-3 w-3" />
                    <span>{t('libraryStore.stockAvailable', { count: product.stock })}</span>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row items-center gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      className="flex-1 w-full text-xs sm:text-sm h-8 sm:h-9"
                      size="sm"
                      data-testid={`button-add-cart-${product.id}`}
                      onClick={() => addToCart(product)}
                      disabled={Number(product.stock || 0) <= 0}
                    >
                      <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                      {t('libraryStore.addShort')}
                    </Button>
                    <Button
                      className="flex-1 w-full bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm h-8 sm:h-9"
                      size="sm"
                      data-testid={`button-buy-now-${product.id}`}
                      onClick={() => handleBuyNow(product)}
                      disabled={Number(product.stock || 0) <= 0}
                    >
                      {t('libraryStore.buyShort')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showProductDetail} onOpenChange={setShowProductDetail}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? getProductTitle(selectedProduct) : ""}</DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              {getProductImage(selectedProduct) ? (
                <img
                  src={getProductImage(selectedProduct)}
                  alt={getProductTitle(selectedProduct)}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className={`w-full h-48 ${isDark ? "bg-gray-700" : "bg-gray-100"} rounded-lg flex items-center justify-center`}>
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
              )}

              {selectedProduct.description && (
                <p className="text-gray-600 dark:text-gray-300">{selectedProduct.description}</p>
              )}

              <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div>
                  <span className="text-2xl font-bold text-blue-600">{selectedProduct.price} {t('libraryStore.currency')}</span>
                </div>
                <Badge variant="outline">{t('libraryStore.stockAvailable', { count: selectedProduct.stock })}</Badge>
              </div>

              {selectedProduct.discountPercent && selectedProduct.discountPercent > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {t('libraryStore.bulkDiscountNote', { percent: selectedProduct.discountPercent, min: selectedProduct.discountMinQuantity || 1 })}
                  </p>
                </div>
              )}

              {selectedProduct.library && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Store className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold">{selectedProduct.library.name}</p>
                    {selectedProduct.library.city && (
                      <p className="text-xs text-gray-500">{selectedProduct.library.city}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="w-full"
                  size="lg"
                  data-testid="button-add-to-cart"
                  onClick={() => {
                    if (!selectedProduct) return;
                    addToCart(selectedProduct);
                    setShowProductDetail(false);
                  }}
                  disabled={Number(selectedProduct.stock || 0) <= 0}
                >
                  <ShoppingCart className="h-5 w-5 ml-2" />
                  {Number(selectedProduct.stock || 0) <= 0 ? t('libraryStore.outOfStock') : t('libraryStore.addToCartAlt')}
                </Button>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                  data-testid="button-buy-now"
                  onClick={() => {
                    if (!selectedProduct) return;
                    handleBuyNow(selectedProduct);
                    setShowProductDetail(false);
                  }}
                  disabled={Number(selectedProduct.stock || 0) <= 0}
                >
                  {t('libraryStore.buyNow')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t('libraryStore.libraryCartTitle', { count: cartItemsCount })}
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">{t('libraryStore.cartEmpty')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                      {getProductImage(item.product) ? (
                        <img src={getProductImage(item.product)} alt={getProductTitle(item.product)} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{getProductTitle(item.product)}</h4>
                      <p className="text-orange-600 font-bold">{item.product.price} {t('libraryStore.currency')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={Number(item.product.stock || 0) > 0 && item.quantity >= Number(item.product.stock || 0)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-500 h-8 w-8 p-0" onClick={() => removeFromCart(item.product.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>{t('libraryStore.totalLabel')}</span>
                  <span className="text-orange-600">{cartTotal.toFixed(2)} {t('libraryStore.currency')}</span>
                </div>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    setShowCart(false);
                    setBuyNowProduct(null);
                    setShowCheckout(true);
                  }}
                  disabled={cart.length === 0}
                >
                  <CreditCard className="w-4 h-4 ml-2" />
                  {t('libraryStore.completePurchase')}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCheckout}
        onOpenChange={(open) => {
          setShowCheckout(open);
          if (!open) {
            setBuyNowProduct(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {buyNowProduct ? t('libraryStore.directPurchaseTitle') : t('libraryStore.checkoutTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> {t('libraryStore.shippingAddress')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input placeholder={t('libraryStore.fullName')} value={shippingAddress.name} onChange={(e) => setShippingAddress((prev) => ({ ...prev, name: e.target.value }))} />
                <Input placeholder={t('libraryStore.city')} value={shippingAddress.city} onChange={(e) => setShippingAddress((prev) => ({ ...prev, city: e.target.value }))} />
                <Input placeholder={t('libraryStore.detailedAddress')} value={shippingAddress.line1} onChange={(e) => setShippingAddress((prev) => ({ ...prev, line1: e.target.value }))} className="sm:col-span-2" />
                <Input placeholder={t('libraryStore.district')} value={shippingAddress.state} onChange={(e) => setShippingAddress((prev) => ({ ...prev, state: e.target.value }))} />
                <Input placeholder={t('libraryStore.postalCode')} value={shippingAddress.postalCode} onChange={(e) => setShippingAddress((prev) => ({ ...prev, postalCode: e.target.value }))} />
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">{t("libraryStore.shippingMethodTitle")}</p>
                  <Badge variant="secondary" className="text-[11px]">{t("libraryStore.shippingMethodOptional")}</Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedShippingProviderKey("standard")}
                    className={`rounded-xl border p-3 text-right transition-colors ${selectedShippingProviderKey === "standard"
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    data-testid="button-library-shipping-standard"
                  >
                    <div className="flex items-start gap-2">
                      <Store className="w-4 h-4 mt-0.5 text-orange-500" />
                      <div>
                        <p className="text-sm font-semibold">{t("libraryStore.shippingMethodStandard")}</p>
                        <p className="text-xs opacity-80">{t("libraryStore.shippingMethodStandardDesc")}</p>
                      </div>
                    </div>
                  </button>

                  {inHomeShippingProvider && (
                    <button
                      type="button"
                      onClick={() => inHomeShippingProvider.enabled && setSelectedShippingProviderKey(inHomeShippingProvider.key)}
                      disabled={!inHomeShippingProvider.enabled}
                      className={`rounded-xl border p-3 text-right transition-colors ${selectedShippingProviderKey === inHomeShippingProvider.key
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                        } ${inHomeShippingProvider.enabled ? "" : "opacity-60 cursor-not-allowed"}`}
                      data-testid="button-library-shipping-inhome"
                    >
                      <div className="flex items-start gap-2">
                        <Store className={`w-4 h-4 mt-0.5 ${inHomeShippingProvider.enabled ? "text-emerald-600" : "text-amber-600"}`} />
                        <div>
                          <p className="text-sm font-semibold flex items-center gap-1.5">
                            <span>{i18n.language === "ar" ? inHomeShippingProvider.labelAr : inHomeShippingProvider.labelEn}</span>
                            {suggestedShippingProvider?.key === inHomeShippingProvider.key && (
                              <Badge className="h-5 px-1.5 text-[10px] bg-emerald-600 text-white">{t("libraryStore.shippingMethodRecommended")}</Badge>
                            )}
                          </p>
                          <p className="text-xs opacity-80">
                            {i18n.language === "ar" ? inHomeShippingProvider.descriptionAr : inHomeShippingProvider.descriptionEn}
                          </p>
                          {!inHomeShippingProvider.enabled && (
                            <p className="text-[11px] mt-1 text-amber-600 dark:text-amber-400">{t("libraryStore.shippingMethodUnavailableHint")}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> {t('libraryStore.paymentMethod')}
              </h3>
              <div className="space-y-2">
                {paymentMethods.length === 0 ? (
                  <p className="text-gray-500 text-sm">{t('libraryStore.noPaymentMethods')}</p>
                ) : (
                  paymentMethods.map((method: any) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`w-full p-3 border rounded-lg text-right flex items-center gap-3 transition-colors ${selectedPaymentMethod === method.id ? "border-orange-500 bg-orange-50" : "hover:bg-gray-50"}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === method.id ? "border-orange-500" : "border-gray-300"}`}>
                        {selectedPaymentMethod === method.id && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                      </div>
                      <span>{method.displayName || method.accountName || method.bankName || method.type}</span>
                    </button>
                  ))
                )}
                <button
                  onClick={() => setSelectedPaymentMethod("wallet")}
                  className={`w-full p-3 border rounded-lg text-right flex items-center gap-3 transition-colors ${selectedPaymentMethod === "wallet" ? "border-orange-500 bg-orange-50" : "hover:bg-gray-50"}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === "wallet" ? "border-orange-500" : "border-gray-300"}`}>
                    {selectedPaymentMethod === "wallet" && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                  </div>
                  <span>{t('libraryStore.payFromWallet', { balance: wallet?.balance || 0 })}</span>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold mb-3">{t('libraryStore.orderSummary')}</h3>
              <div className="space-y-2 text-sm">
                {checkoutItems.map((item) => (
                  <div key={item.product.id} className="flex justify-between">
                    <span>{getProductTitle(item.product)} x{item.quantity}</span>
                    <span>{(parseFloat(item.product.price) * item.quantity).toFixed(2)} {t('libraryStore.currency')}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>{t('libraryStore.totalLabel')}</span>
                  <span className="text-orange-600">{checkoutTotal.toFixed(2)} {t('libraryStore.currency')}</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 py-6 text-lg"
              onClick={handleCheckout}
              disabled={checkoutMutation.isPending || !selectedPaymentMethod || !isShippingAddressComplete || checkoutItems.length === 0}
            >
              {checkoutMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('libraryStore.processing')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-5 h-5" /> {t('libraryStore.confirmPurchase')}
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
