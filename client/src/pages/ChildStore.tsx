import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ShoppingCart, Star,
  Grid3X3, List, Package, Truck, Shield, Clock,
  Smartphone, Gamepad2, BookOpen, Dumbbell, Shirt, Book, Palette, Gift,
  X, Plus, Minus, MapPin, Check, ArrowLeft, ArrowRight, Sparkles, Bell, ChevronDown, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getTrialExplorationProgressPercent, markTrialExplorationStep } from "@/lib/trialExperience";
import { evaluateTrialAccess, inferTrialAccountState } from "@/lib/trialPolicyEngine";
import {
  readTrialPurchaseIntent,
  saveTrialPurchaseIntent,
  clearTrialPurchaseIntent,
  setTrialPurchaseFlowState,
} from "@/lib/trialPurchaseFlow";
import { readTrialChildLinkData, saveTrialChildLinkData } from "@/lib/trialChildLinkStorage";
import { clearCampaignAttribution, readCampaignAttribution, saveCampaignAttribution } from "@/lib/campaignAttribution";
import { MandatoryTaskModal } from "@/components/MandatoryTaskModal";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import { ChildBottomNav } from "@/components/ChildBottomNav";
import { SectionExplainerCard } from "@/components/SectionExplainerCard";
import { TrialUpgradePromptDialog } from "@/components/TrialUpgradePromptDialog";
import { trackTrialFunnelEvent } from "@/lib/trialAnalytics";

const categoryIcons: Record<string, any> = {
  Smartphone, Gamepad2, BookOpen, Dumbbell, Shirt, Book, Palette, Gift, Package
};

interface Product {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  price: string;
  originalPrice?: string;
  pointsPrice: number;
  image?: string;
  images?: string[];
  stock: number;
  brand?: string;
  rating?: string;
  reviewCount?: number;
  isFeatured?: boolean;
  categoryId?: string;
  category?: { id: string; name: string; nameAr: string; icon: string; color: string };
  productType?: string;
  discountPercent?: number;
  isLibraryProduct?: boolean;
  libraryId?: string;
  libraryName?: string;
}

interface Category {
  id: string;
  parentId: string | null;
  name: string;
  nameAr: string;
  namePt: string | null;
  targetAudience?: "all" | "parents" | "children" | "fathers" | "mothers";
  icon: string;
  color: string;
}

interface CheckoutPaymentMethod {
  id: string;
  type: string;
  displayName: string;
}

interface CheckoutPaymentMethodsMeta {
  platform?: string;
  googlePlayEnforced?: boolean;
  walletCheckoutEnabled?: boolean;
  googlePlayMethodType?: string;
}

interface CheckoutPaymentMethodsPayload {
  methods: CheckoutPaymentMethod[];
  meta?: CheckoutPaymentMethodsMeta;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface ChildPurchaseRequest {
  id: string;
  productId?: string;
  quantity: number;
  pointsPrice: number;
  status: string;
  rejectionReason?: string | null;
  orderId?: string | null;
  decidedAt?: string | null;
  createdAt?: string | null;
  product?: {
    name?: string;
    nameAr?: string;
    image?: string;
  } | null;
}

interface ChildOrderDetailsResponse {
  order?: {
    id?: string;
    status?: string;
    shippingStatus?: string;
    createdAt?: string;
    updatedAt?: string;
    totalAmount?: string | number;
    currency?: string;
  };
  items?: Array<{
    id?: string;
    productId?: string;
    quantity?: number;
    unitAmount?: string | number;
    product?: {
      id?: string;
      name?: string;
      nameAr?: string;
      image?: string;
    } | null;
  }>;
}

interface StoreCampaignResolutionResponse {
  active?: boolean;
  reason?: string;
  campaign?: {
    promoProductId?: string;
    sourceAdId?: string | null;
    discountPercent?: number | null;
    targetAudience?: string;
    startDate?: string | null;
    endDate?: string | null;
  };
}

interface ChildStoreProps {
  parentMode?: boolean;
}

interface TrialParentLinkPayload {
  childId?: string;
  childName?: string;
  shareCode?: string;
  trialChildToken?: string;
  trialChildLinkUrl?: string;
  trialChildQrCodeUrl?: string;
}

const detectCheckoutPlatform = (): string => {
  if (typeof navigator !== "undefined") {
    const userAgent = navigator.userAgent || "";
    if (/android/i.test(userAgent)) return "android";
    if (/(iphone|ipad|ipod)/i.test(userAgent)) return "ios";
  }

  return "web";
};

export const ChildStore = ({ parentMode = false }: ChildStoreProps): JSX.Element => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const childToken = localStorage.getItem("childToken");
  const parentToken = localStorage.getItem("token");
  const isParentMode = parentMode && !!parentToken && !childToken;
  const token = childToken || (isParentMode ? parentToken : null);
  const isGuest = !token;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedMainCategory, setExpandedMainCategory] = useState<string | null>(null);
  const [showLibraryOnly, setShowLibraryOnly] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [cartDialogSection, setCartDialogSection] = useState<"cart" | "orders" | "inventory">("cart");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("EG");
  const [selectedCurrency, setSelectedCurrency] = useState("EGP");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("wallet");
  const checkoutPlatform = useMemo(() => detectCheckoutPlatform(), []);
  const checkoutPurchaseKind = useMemo(() => {
    const productTypes = cart.map((item) => String(item.product.productType || "").trim().toLowerCase());
    const hasDigital = productTypes.some((type) => type === "digital" || type === "subscription");
    const hasPhysical = productTypes.some((type) => type === "physical" || type === "library");

    if (hasDigital && hasPhysical) return "mixed";
    if (hasDigital) return "digital";
    if (hasPhysical) return "physical";
    return "unknown";
  }, [cart]);
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(null);
  const [selectedChildOrderId, setSelectedChildOrderId] = useState<string | null>(null);
  const [showTrialLinkPrompt, setShowTrialLinkPrompt] = useState(false);
  const [trialPromptContext, setTrialPromptContext] = useState<"explore" | "purchase">("explore");
  const [pendingParentLink, setPendingParentLink] = useState<TrialParentLinkPayload | null>(null);
  const [activeSectionHintId, setActiveSectionHintId] = useState<string | null>(null);
  const lastShownSectionHintIdRef = useRef<string | null>(null);
  const [sectionHintSchedulerTick, setSectionHintSchedulerTick] = useState(0);
  const sectionHintShownCountRef = useRef<number>(0);
  const hasHydratedTrialIntentRef = useRef(false);
  const [dismissedSectionHints, setDismissedSectionHints] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("childStoreSectionHints");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const resolvedParentLink: TrialParentLinkPayload | null = useMemo(() => {
    if (pendingParentLink?.trialChildLinkUrl || pendingParentLink?.trialChildToken || pendingParentLink?.shareCode || pendingParentLink?.trialChildQrCodeUrl) {
      return pendingParentLink;
    }

    const storedLinkData = readTrialChildLinkData();
    if (!storedLinkData) {
      return null;
    }

    return {
      trialChildLinkUrl: storedLinkData.trialChildLinkUrl || undefined,
      trialChildToken: storedLinkData.trialChildToken || undefined,
      shareCode: storedLinkData.shareCode || undefined,
      trialChildQrCodeUrl: storedLinkData.trialChildQrCodeUrl || undefined,
    };
  }, [pendingParentLink]);

  const captureTrialPurchaseIntent = () => {
    if (isParentMode || cart.length === 0) return false;

    const stored = saveTrialPurchaseIntent({
      createdAt: Date.now(),
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        name: item.product.name,
        nameAr: item.product.nameAr,
        image: item.product.image,
        price: item.product.price,
        pointsPrice: getEffectivePointsPrice(item.product),
      })),
    });

    if (stored) {
      setTrialPurchaseFlowState("captured");
      trackTrialFunnelEvent("TRIAL_PURCHASE_INTENT_CAPTURED", {
        itemCount: cart.length,
      });
    }

    return stored;
  };

  const sectionHints = useMemo(() => {
    if (isParentMode) {
      return [
        {
          id: "parent-overview",
          icon: "💡",
          title: "انطلاقة احترافية",
          description: "ابدأ بخريطة واضحة: حدّد الهدف، اختر القسم الصحيح، ثم ابنِ سلة ذكية بدون تشتيت.",
        },
        {
          id: "parent-campaign",
          icon: "🏷️",
          title: "اقتناص العروض بذكاء",
          description: "افتح المنتجات الترويجية مباشرة من الكروت والإشعارات، وقارن القيمة قبل اتخاذ قرار الشراء.",
        },
        {
          id: "parent-checkout",
          icon: "🧾",
          title: "إتمام آمن ومدروس",
          description: "قبل التأكيد النهائي راجع وسيلة الدفع، الإجمالي، والخصومات لضمان تجربة شراء موثوقة.",
        },
      ];
    }

    return [
      {
        id: "child-overview",
        icon: "🎯",
        title: "خطة لعب وشراء",
        description: "اكتشف الأقسام خطوة بخطوة، واختر المنتجات المناسبة بدل التصفح العشوائي.",
      },
      {
        id: "child-points",
        icon: "⭐",
        title: "قيمة كل نقطة",
        description: "وازن بين رغبتك والرصيد المتاح، ثم طوّر نقاطك بالمهام والألعاب قبل أي طلب جديد.",
      },
      {
        id: "child-parent-link",
        icon: "👨‍👩‍👧",
        title: "الربط الأسري الفوري",
        description: "عند الحاجة للموافقة، أرسل الرابط أو QR مباشرة لولي الأمر لتسريع إكمال الطلب.",
      },
    ];
  }, [isParentMode]);

  const nonDismissedSectionHints = useMemo(
    () => sectionHints.filter((hint) => !dismissedSectionHints[hint.id]),
    [sectionHints, dismissedSectionHints]
  );

  const shouldUseTimedTrialHints = useMemo(() => {
    if (!isParentMode) return true;
    const parentClassification = String(localStorage.getItem("parentAccountClassification") || "")
      .trim()
      .toUpperCase()
      .replace(/[-\s]+/g, "_");
    return parentClassification === "PARENT_TRIAL";
  }, [isParentMode]);

  const sectionHintSessionPrefix = isParentMode ? "parent-store" : "child-store";
  const SECTION_HINT_MIN_GAP_MS = 12000;
  const SECTION_HINT_MAX_GAP_MS = 40000;
  const SECTION_HINT_MAX_PER_SESSION = 5;
  const SECTION_HINT_SHOW_PROBABILITY = 0.4;

  useEffect(() => {
    const shownRaw = Number(sessionStorage.getItem(`${sectionHintSessionPrefix}-hints-shown-count`) || "0");
    sectionHintShownCountRef.current = Number.isFinite(shownRaw) && shownRaw > 0
      ? Math.floor(shownRaw)
      : 0;
  }, [sectionHintSessionPrefix]);

  const visibleSectionHints = useMemo(() => {
    if (!shouldUseTimedTrialHints) {
      return nonDismissedSectionHints;
    }
    if (!activeSectionHintId) {
      return [];
    }
    return nonDismissedSectionHints.filter((hint) => hint.id === activeSectionHintId);
  }, [shouldUseTimedTrialHints, nonDismissedSectionHints, activeSectionHintId]);

  useEffect(() => {
    if (!shouldUseTimedTrialHints) {
      setActiveSectionHintId(null);
      return;
    }

    if (nonDismissedSectionHints.length === 0) {
      setActiveSectionHintId(null);
      return;
    }

    if (activeSectionHintId && nonDismissedSectionHints.some((hint) => hint.id === activeSectionHintId)) {
      return;
    }

    if (sectionHintShownCountRef.current >= SECTION_HINT_MAX_PER_SESSION) {
      return;
    }

    const now = Date.now();
    const lastShownRaw = Number(sessionStorage.getItem(`${sectionHintSessionPrefix}-hints-last-at`) || "0");
    const lastShownAt = Number.isFinite(lastShownRaw) && lastShownRaw > 0 ? lastShownRaw : 0;

    const cooldownRemainingMs = lastShownAt > 0
      ? Math.max(0, SECTION_HINT_MIN_GAP_MS - (now - lastShownAt))
      : 0;

    const randomGapMs = Math.floor(
      Math.random() * (SECTION_HINT_MAX_GAP_MS - SECTION_HINT_MIN_GAP_MS + 1),
    ) + SECTION_HINT_MIN_GAP_MS;

    const delayMs = cooldownRemainingMs + randomGapMs;

    const timer = window.setTimeout(() => {
      const shouldShowHint = sectionHintShownCountRef.current === 0
        || Math.random() < SECTION_HINT_SHOW_PROBABILITY;

      if (!shouldShowHint) {
        setSectionHintSchedulerTick((prev) => prev + 1);
        return;
      }

      const candidates = nonDismissedSectionHints.filter(
        (hint) => hint.id !== lastShownSectionHintIdRef.current
      );
      const source = candidates.length > 0 ? candidates : nonDismissedSectionHints;
      const nextHint = source[Math.floor(Math.random() * source.length)];

      if (!nextHint?.id) {
        setSectionHintSchedulerTick((prev) => prev + 1);
        return;
      }

      lastShownSectionHintIdRef.current = nextHint.id;
      sectionHintShownCountRef.current += 1;
      sessionStorage.setItem(`${sectionHintSessionPrefix}-hints-shown-count`, String(sectionHintShownCountRef.current));
      sessionStorage.setItem(`${sectionHintSessionPrefix}-hints-last-at`, String(Date.now()));
      setActiveSectionHintId(nextHint.id);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    shouldUseTimedTrialHints,
    nonDismissedSectionHints,
    activeSectionHintId,
    sectionHintSchedulerTick,
    sectionHintSessionPrefix,
    SECTION_HINT_MAX_PER_SESSION,
    SECTION_HINT_MIN_GAP_MS,
    SECTION_HINT_MAX_GAP_MS,
    SECTION_HINT_SHOW_PROBABILITY,
  ]);

  const handleSectionHintAction = (id: string) => {
    if (id === "child-overview" || id === "parent-overview") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (id === "child-points") {
      navigate("/child-games");
      return;
    }

    if (id === "child-parent-link") {
      setTrialPromptContext("explore");
      setShowTrialLinkPrompt(true);
      return;
    }

    if (id === "parent-campaign") {
      setShowLibraryOnly(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (id === "parent-checkout") {
      setCartDialogSection("cart");
      setShowCart(true);
    }
  };

  const dismissSectionHint = (id: string) => {
    if (activeSectionHintId === id) {
      setActiveSectionHintId(null);
    }
    setDismissedSectionHints((prev) => {
      const next = { ...prev, [id]: true };
      localStorage.setItem("childStoreSectionHints", JSON.stringify(next));
      return next;
    });
  };

  const availableCountries = ["EG", "SA", "AE", "QA", "KW", "BH", "OM", "US", "GB"];
  const availableCurrencies = ["EGP", "SAR", "AED", "QAR", "KWD", "BHD", "OMR", "USD", "EUR"];

  const getAuthHeaders = (): Record<string, string> => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  const redirectToRequiredRegistration = () => {
    toast({
      title: t("childStore.askParentToRegister"),
      description: t("childStore.askParentToRegisterDesc"),
    });
    localStorage.removeItem("familyCode");
    const target = `${window.location.pathname}${window.location.search || ""}`;
    const authParams = new URLSearchParams({
      mode: "register",
      redirect: target || (isParentMode ? "/parent-store" : "/child-store"),
    });
    if (resolvedParentLink?.trialChildToken) {
      authParams.set("trialChildToken", String(resolvedParentLink.trialChildToken));
    }
    navigate(`/parent-auth?${authParams.toString()}`);
  };

  const { data: categoriesData } = useQuery({
    queryKey: ["store-categories"],
    queryFn: async () => {
      const res = await fetch("/api/store/categories", {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: true,
    refetchInterval: 60000,
  });

  const { data: publicSettingsData } = useQuery({
    queryKey: ["public-mobile-settings", "trial-policy"],
    queryFn: async () => {
      const res = await fetch("/api/public/mobile-app-settings");
      if (!res.ok) {
        throw new Error("Failed to fetch public mobile settings");
      }
      return res.json();
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["store-products", selectedCategory, searchQuery, sortBy, selectedCountry, selectedCurrency],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);
      params.append("sort", sortBy);
      params.append("country", selectedCountry);
      params.append("currency", selectedCurrency);
      const res = await fetch(`/api/store/products?${params}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: true,
    refetchInterval: 30000,
  });

  const { data: childInfo } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${childToken}` },
      });
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!childToken,
    refetchInterval: childToken ? 15000 : false,
  });

  const { data: childPurchaseRequestsData } = useQuery({
    queryKey: ["child-store-purchase-requests", childToken],
    queryFn: async () => {
      const res = await fetch("/api/child/store/purchase-requests", {
        headers: { Authorization: `Bearer ${childToken}` },
      });
      const json = await res.json();
      return (json?.data || []) as ChildPurchaseRequest[];
    },
    enabled: !!childToken,
    refetchInterval: childToken ? 8000 : false,
  });

  useEffect(() => {
    if (!childToken) return;
    const saved = localStorage.getItem("childStoreDismissedRequestId");
    setDismissedRequestId(saved || null);
  }, [childToken]);

  const { data: parentWallet } = useQuery({
    queryKey: ["parent-wallet", "child-store-parent-mode"],
    queryFn: async () => {
      const res = await fetch("/api/parent/wallet", {
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      const json = await res.json();
      return json?.data || json;
    },
    enabled: isParentMode && !!parentToken,
    refetchInterval: isParentMode ? 15000 : false,
  });

  const { data: parentProfileData } = useQuery({
    queryKey: ["parent-profile-data", "child-store-parent-mode"],
    queryFn: async () => {
      const res = await fetch("/api/parent/profile-data", {
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      const json = await res.json();
      return json?.data || json || {};
    },
    enabled: isParentMode && !!parentToken,
    refetchInterval: isParentMode ? 20000 : false,
  });

  const { data: checkoutPaymentMethodsData } = useQuery({
    queryKey: ["store-payment-methods", selectedCountry, checkoutPlatform, checkoutPurchaseKind],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("country", selectedCountry);
      params.set("platform", checkoutPlatform);
      if (checkoutPurchaseKind !== "unknown") {
        params.set("purchaseKind", checkoutPurchaseKind);
      }

      const res = await fetch(`/api/store/payment-methods?${params.toString()}`, {
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      const json = await res.json();
      return {
        methods: (json?.data || []) as CheckoutPaymentMethod[],
        meta: (json?.meta || {}) as CheckoutPaymentMethodsMeta,
      } as CheckoutPaymentMethodsPayload;
    },
    enabled: isParentMode && !!parentToken,
    refetchInterval: isParentMode ? 30000 : false,
  });

  const { data: parentOrdersData, isLoading: loadingParentOrders } = useQuery({
    queryKey: ["parent-orders", "child-store-parent-mode"],
    queryFn: async () => {
      const res = await fetch("/api/parent/purchases", {
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: isParentMode && !!parentToken,
    refetchInterval: isParentMode ? 20000 : false,
  });

  const { data: parentInventoryData, isLoading: loadingParentInventory } = useQuery({
    queryKey: ["parent-inventory", "child-store-parent-mode"],
    queryFn: async () => {
      const res = await fetch("/api/parent/owned-products", {
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: isParentMode && !!parentToken,
    refetchInterval: isParentMode ? 20000 : false,
  });

  const { data: childOrderDetailsData, isLoading: loadingChildOrderDetails } = useQuery({
    queryKey: ["child-store-order-details", childToken, selectedChildOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/child/store/orders/${selectedChildOrderId}`, {
        headers: { Authorization: `Bearer ${childToken}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || t("childStore.error"));
      }
      return (json?.data || {}) as ChildOrderDetailsResponse;
    },
    enabled: !!childToken && !!selectedChildOrderId,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = isParentMode ? "/api/store/checkout" : "/api/child/store/purchase-request";
      const body = isParentMode
        ? {
          items: data.items || [],
          paymentMethodId: selectedPaymentMethodId,
          sourceAdId: data.sourceAdId,
          shippingAddress: {
            name: "Parent",
            line1: "",
            city: "",
            state: "",
            postalCode: "",
            country: selectedCountry,
          },
          totalAmount: (data.items || []).reduce(
            (sum: number, item: any) => sum + (parseFloat(item.price || "0") * Number(item.quantity || 1)),
            0
          ),
          currency: selectedCurrency,
          platform: checkoutPlatform,
          purchaseKind: checkoutPurchaseKind,
        }
        : data;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t("childStore.notEnoughPoints"));
      }
      return res.json();
    },
    onSuccess: (result: any) => {
      const payload = result?.data || result;
      if (!isParentMode && payload?.requiresParentLink && payload?.parentLink) {
        const parentLink = payload.parentLink;
        saveTrialChildLinkData({
          shareCode: parentLink?.shareCode,
          trialChildToken: parentLink?.trialChildToken,
          trialChildLinkUrl: parentLink?.trialChildLinkUrl,
          trialChildQrCodeUrl: parentLink?.trialChildQrCodeUrl,
        });

        setShowCheckout(false);
        setShowCart(false);
        setPendingParentLink(parentLink);
        setShowTrialLinkPrompt(true);
        return;
      }

      if (isParentMode && result?.paymentRequired && result?.paymentUrl) {
        window.location.href = String(result.paymentUrl);
        return;
      }

      if (isParentMode) {
        clearCampaignAttribution();
      }

      setCart([]);
      setShowCheckout(false);
      queryClient.invalidateQueries({ queryKey: ["child-info"] });
      queryClient.invalidateQueries({ queryKey: ["child-store-purchase-requests", childToken] });
      queryClient.invalidateQueries({ queryKey: ["parent-wallet", "child-store-parent-mode"] });
      queryClient.invalidateQueries({ queryKey: ["parent-orders", "child-store-parent-mode"] });
      toast({
        title: isParentMode ? t("parentStore.purchaseCompleted") : t("childStore.requestSent"),
        description: isParentMode ? t("parentStore.purchaseCompletedDesc") : t("childStore.parentWillReview"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("childStore.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const requestReturnMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const res = await fetch(`/api/parent/purchases/${purchaseId}/return-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({
          reason: "item_not_as_described",
          details: "Return requested from parent store orders tab.",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || t("parentStore.returnRequestFailed"));
      }
      return json;
    },
    onSuccess: () => {
      toast({
        title: t("parentStore.returnRequestSubmitted"),
        description: t("parentStore.returnRequestSubmittedDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["parent-orders", "child-store-parent-mode"] });
    },
    onError: (error: any) => {
      toast({
        title: t("parentStore.returnRequestFailed"),
        description: error?.message || t("parentStore.returnRequestFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const categories: Category[] = categoriesData?.data || categoriesData || [];
  const mainCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parentId === parentId);
  const allProducts: Product[] = productsData?.data || productsData || [];

  // Filter by library if showLibraryOnly is true
  const products: Product[] = useMemo(() => {
    if (showLibraryOnly) {
      return allProducts.filter((p: Product) => p.isLibraryProduct);
    }
    return allProducts;
  }, [allProducts, showLibraryOnly]);

  const featuredProducts = useMemo(() =>
    products.filter((p: Product) => p.isFeatured).slice(0, 6), [products]
  );

  const cartTotalAmount = useMemo(() =>
    cart.reduce((sum, item) => sum + (parseFloat(item.product.price || "0") * item.quantity), 0), [cart]
  );

  const trialFirstProductDiscountEnabled = useMemo(() => {
    const raw = publicSettingsData?.data?.trialPolicy?.firstProductDiscountEnabled;
    return typeof raw === "boolean" ? raw : true;
  }, [publicSettingsData]);
  const trialFirstProductDiscountPercent = useMemo(() => {
    const raw = Number(publicSettingsData?.data?.trialPolicy?.firstProductDiscountPercent);
    if (!Number.isFinite(raw)) return 15;
    return Math.min(100, Math.max(0, Math.trunc(raw)));
  }, [publicSettingsData]);
  const parentOrders: any[] = Array.isArray(parentOrdersData) ? parentOrdersData : [];

  const firstProductDiscountAmount = useMemo(() => {
    if (!isParentMode) return 0;
    if (loadingParentOrders) return 0;
    if (!trialFirstProductDiscountEnabled || trialFirstProductDiscountPercent <= 0) return 0;
    if (parentOrders.length > 0 || cart.length === 0) return 0;

    const firstCartItem = cart[0];
    if (!firstCartItem) return 0;

    const unitPrice = parseFloat(firstCartItem.product.price || "0");
    const quantity = Math.max(1, Number(firstCartItem.quantity || 1));
    const baseSubtotal = Number((unitPrice * quantity).toFixed(2));
    if (!Number.isFinite(baseSubtotal) || baseSubtotal <= 0) return 0;

    const rawDiscount = Number((baseSubtotal * (trialFirstProductDiscountPercent / 100)).toFixed(2));
    return Math.min(baseSubtotal, Math.max(0, rawDiscount));
  }, [
    isParentMode,
    loadingParentOrders,
    trialFirstProductDiscountEnabled,
    trialFirstProductDiscountPercent,
    parentOrders.length,
    cart,
  ]);

  const cartTotalAmountAfterDiscount = useMemo(() => {
    if (!isParentMode) return cartTotalAmount;
    return Number(Math.max(0, cartTotalAmount - firstProductDiscountAmount).toFixed(2));
  }, [isParentMode, cartTotalAmount, firstProductDiscountAmount]);

  const checkoutPaymentMethodsPayload: CheckoutPaymentMethodsPayload | undefined = checkoutPaymentMethodsData as CheckoutPaymentMethodsPayload | undefined;
  const checkoutPaymentMethods: CheckoutPaymentMethod[] = Array.isArray(checkoutPaymentMethodsPayload?.methods)
    ? checkoutPaymentMethodsPayload!.methods
    : [];
  const checkoutPaymentMeta = checkoutPaymentMethodsPayload?.meta || {};
  const walletCheckoutEnabled = checkoutPaymentMeta.walletCheckoutEnabled !== false;
  const googlePlayEnforced = Boolean(checkoutPaymentMeta.googlePlayEnforced);
  const walletOptionEnabled = isParentMode && walletCheckoutEnabled && !googlePlayEnforced;
  const hasAnyPaymentOption = !isParentMode || walletOptionEnabled || checkoutPaymentMethods.length > 0;
  const availablePoints = isParentMode ? Number(parentWallet?.balance || 0) : Number(childInfo?.totalPoints || 0);
  const requiresWalletBalance = walletOptionEnabled && selectedPaymentMethodId === "wallet";
  const canAfford = isGuest ? true : (isParentMode
    ? (requiresWalletBalance ? cartTotalAmountAfterDiscount <= availablePoints : true)
    : cart.reduce((sum, item) => sum + getEffectivePointsPrice(item.product) * item.quantity, 0) <= availablePoints);
  const canProceedToCheckout = isParentMode ? canAfford && hasAnyPaymentOption : canAfford;
  const checkoutActionDisabled = checkoutMutation.isPending || (isParentMode && !hasAnyPaymentOption);
  const trialExplorePromptPercent = useMemo(() => {
    const raw = Number(publicSettingsData?.data?.trialPolicy?.explorePromptPercent);
    if (!Number.isFinite(raw)) return 30;
    return Math.min(100, Math.max(1, Math.trunc(raw)));
  }, [publicSettingsData]);
  const purchaseIntentPromptEnabled = useMemo(() => {
    const raw = publicSettingsData?.data?.trialPolicy?.purchaseIntentPromptEnabled;
    return typeof raw === "boolean" ? raw : true;
  }, [publicSettingsData]);
  const showSocialLoginButtons = useMemo(() => {
    const raw = publicSettingsData?.data?.trialPolicy?.showSocialLoginButtons;
    return typeof raw === "boolean" ? raw : true;
  }, [publicSettingsData]);
  const promoProductId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("promoProductId") || "").trim();
  }, []);
  const promoAdId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("promoAdId") || "").trim();
  }, []);
  const promoDiscountFromUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const parsed = Number.parseInt(String(params.get("promoDiscount") || ""), 10);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(90, Math.max(1, Math.trunc(parsed)));
  }, []);
  const { data: campaignResolutionData } = useQuery({
    queryKey: ["store-campaign-resolve", promoAdId, promoProductId, isParentMode],
    queryFn: async (): Promise<StoreCampaignResolutionResponse> => {
      const params = new URLSearchParams();
      if (promoAdId) params.set("promoAdId", promoAdId);
      if (promoProductId) params.set("promoProductId", promoProductId);
      params.set("audience", isParentMode ? "parents" : "children");

      const res = await fetch(`/api/store/campaign/resolve?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || t("childStore.error"));
      }
      return (json?.data || {}) as StoreCampaignResolutionResponse;
    },
    enabled: Boolean(promoAdId || promoProductId),
    staleTime: 30_000,
  });
  const effectivePromoProductId = useMemo(() => {
    if (promoAdId) {
      if (!campaignResolutionData?.active) return "";
      return String(campaignResolutionData?.campaign?.promoProductId || "").trim();
    }
    return promoProductId;
  }, [promoAdId, promoProductId, campaignResolutionData?.active, campaignResolutionData?.campaign?.promoProductId]);
  const effectivePromoAdId = useMemo(() => {
    if (!promoAdId) return "";
    if (!campaignResolutionData?.active) return "";
    return String(campaignResolutionData?.campaign?.sourceAdId || promoAdId).trim();
  }, [promoAdId, campaignResolutionData?.active, campaignResolutionData?.campaign?.sourceAdId]);
  const persistedCampaignAttribution = useMemo(() => readCampaignAttribution(), []);
  const effectivePromoProductIdWithFallback = useMemo(() => {
    if (effectivePromoProductId) return effectivePromoProductId;
    return String(persistedCampaignAttribution?.promoProductId || "").trim();
  }, [effectivePromoProductId, persistedCampaignAttribution?.promoProductId]);
  const effectivePromoAdIdWithFallback = useMemo(() => {
    if (effectivePromoAdId) return effectivePromoAdId;
    return String(persistedCampaignAttribution?.sourceAdId || "").trim();
  }, [effectivePromoAdId, persistedCampaignAttribution?.sourceAdId]);
  const effectivePromoDiscountPercentWithFallback = useMemo(() => {
    const resolved = Number(campaignResolutionData?.campaign?.discountPercent);
    if (Number.isFinite(resolved) && resolved > 0) {
      return Math.min(90, Math.max(1, Math.trunc(resolved)));
    }
    if (Number.isFinite(Number(promoDiscountFromUrl)) && Number(promoDiscountFromUrl) > 0) {
      return Math.min(90, Math.max(1, Math.trunc(Number(promoDiscountFromUrl))));
    }
    return null;
  }, [campaignResolutionData?.campaign?.discountPercent, promoDiscountFromUrl]);

  const getEffectivePointsPrice = (product: Product): number => {
    const basePoints = Number(product.pointsPrice || 0);
    const isPromoProduct = Boolean(
      !isParentMode &&
      effectivePromoProductIdWithFallback &&
      product.id === effectivePromoProductIdWithFallback
    );

    if (!isPromoProduct || !effectivePromoDiscountPercentWithFallback) {
      return basePoints;
    }

    const discounted = Math.round(basePoints * (1 - effectivePromoDiscountPercentWithFallback / 100));
    return Math.max(1, discounted);
  };

  const cartTotalPoints = useMemo(() =>
    cart.reduce((sum, item) => sum + getEffectivePointsPrice(item.product) * item.quantity, 0),
    [cart, effectivePromoProductIdWithFallback, effectivePromoDiscountPercentWithFallback, isParentMode]
  );

  const linkedChildren = useMemo(() => {
    if (!isParentMode) return [] as any[];
    const maybeChildren = (parentProfileData as any)?.children;
    return Array.isArray(maybeChildren) ? maybeChildren : [];
  }, [isParentMode, parentProfileData]);
  const hasLinkedChildren = !isParentMode || linkedChildren.length > 0;

  const trialAccountState = useMemo(() => inferTrialAccountState({
    isParentMode,
    classification: localStorage.getItem("parentAccountClassification"),
    hasLinkedChildren: isParentMode ? hasLinkedChildren : undefined,
    hasLinkedParent: !isParentMode
      ? Boolean((childInfo as any)?.parentId || (childInfo as any)?.linkedParentId || (childInfo as any)?.parent?.id)
      : undefined,
  }), [isParentMode, hasLinkedChildren, childInfo]);

  const guardParentCheckoutByChildren = () => {
    if (!isParentMode || hasLinkedChildren) return true;
    toast({
      title: t("noLinkedChildren"),
      description: t("parentInventory.noLinkedChildren"),
      variant: "destructive",
    });
    return false;
  };

  const runTrialSensitiveAction = (
    action: () => void,
    options?: { forPurchaseIntent?: boolean }
  ) => {
    markTrialExplorationStep("store-sensitive-action");

    const capability = options?.forPurchaseIntent ? "purchase" : "use";
    const decision = evaluateTrialAccess({
      accountState: trialAccountState,
      capability,
      isAuthenticated: !!token,
      exploreProgressPercent: getTrialExplorationProgressPercent(),
      exploreThresholdPercent: trialExplorePromptPercent,
      purchaseIntentPromptEnabled,
      requireLinkOnPurchase: !isParentMode,
    });

    if (decision.decision === "prompt") {
      const purchasePromptReasons = new Set([
        "CHILD_LINK_REQUIRED",
        "PURCHASE_INTENT_AUTH_REQUIRED",
      ]);
      const isPurchasePrompt = options?.forPurchaseIntent || purchasePromptReasons.has(decision.reason);
      setTrialPromptContext(isPurchasePrompt ? "purchase" : "explore");

      if (isPurchasePrompt) {
        captureTrialPurchaseIntent();
      }

      setPendingParentLink(null);
      setShowTrialLinkPrompt(true);
      return;
    }

    if (decision.decision === "block") {
      toast({
        title: t("errors.permissionDenied", "غير مسموح"),
        description: t("childStore.askParentToRegisterDesc"),
        variant: "destructive",
      });
      return;
    }

    action();
  };

  useEffect(() => {
    markTrialExplorationStep(isParentMode ? "parent-store" : "child-store");
  }, [isParentMode]);

  useEffect(() => {
    if (!selectedProduct?.id) return;
    markTrialExplorationStep("store-product-view");
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (!effectivePromoProductIdWithFallback || products.length === 0 || selectedProduct?.id) return;
    const promoProduct = products.find((item) => item.id === effectivePromoProductIdWithFallback);
    if (!promoProduct) return;
    setSelectedProduct(promoProduct);
    markTrialExplorationStep("store-promo-open");
  }, [effectivePromoProductIdWithFallback, products, selectedProduct?.id]);

  useEffect(() => {
    if (!effectivePromoProductIdWithFallback && !effectivePromoAdIdWithFallback) return;
    saveCampaignAttribution({
      promoProductId: effectivePromoProductIdWithFallback || undefined,
      sourceAdId: effectivePromoAdIdWithFallback || undefined,
    });
  }, [effectivePromoProductIdWithFallback, effectivePromoAdIdWithFallback]);

  useEffect(() => {
    if (!isParentMode || hasHydratedTrialIntentRef.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("trialIntent") !== "1") return;

    const parsedIntent = readTrialPurchaseIntent();
    if (!parsedIntent) return;

    try {
      const items = Array.isArray(parsedIntent?.items) ? parsedIntent.items : [];
      if (items.length === 0) return;

      const hydratedCart: CartItem[] = items
        .map((item: any) => {
          const productId = String(item?.productId || "").trim();
          const quantity = Number.parseInt(String(item?.quantity || 1), 10);
          if (!productId) return null;

          const product: Product = {
            id: productId,
            name: String(item?.name || item?.nameAr || "Product"),
            nameAr: String(item?.nameAr || item?.name || ""),
            price: String(item?.price || "0"),
            pointsPrice: Number.parseInt(String(item?.pointsPrice || 0), 10) || 0,
            image: item?.image ? String(item.image) : undefined,
            stock: 999,
          };

          return {
            product,
            quantity: Number.isFinite(quantity) ? Math.max(1, quantity) : 1,
          } as CartItem;
        })
        .filter(Boolean) as CartItem[];

      if (hydratedCart.length > 0) {
        setCart(hydratedCart);
        setShowCheckout(true);
        setTrialPurchaseFlowState("hydrated");
      }
    } catch {
      // Ignore malformed trial intent payload.
    } finally {
      hasHydratedTrialIntentRef.current = true;
      clearTrialPurchaseIntent();
      const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [isParentMode]);

  useEffect(() => {
    if (!isParentMode) return;

    const methodIds = checkoutPaymentMethods.map((method) => method.id);

    if (selectedPaymentMethodId === "wallet" && !walletOptionEnabled) {
      if (methodIds.length > 0) {
        setSelectedPaymentMethodId(methodIds[0]);
      }
      return;
    }

    if (selectedPaymentMethodId === "wallet" && walletOptionEnabled) {
      return;
    }

    if (selectedPaymentMethodId !== "wallet") {
      const hasSelected = methodIds.includes(selectedPaymentMethodId);
      if (!hasSelected) {
        if (walletOptionEnabled) {
          setSelectedPaymentMethodId("wallet");
          return;
        }

        if (methodIds.length > 0) {
          setSelectedPaymentMethodId(methodIds[0]);
        }
      }
      return;
    }

    const hasSelected = methodIds.includes(selectedPaymentMethodId);
    if (!hasSelected) {
      if (walletOptionEnabled) {
        setSelectedPaymentMethodId("wallet");
      } else if (methodIds.length > 0) {
        setSelectedPaymentMethodId(methodIds[0]);
      }
    }
  }, [isParentMode, checkoutPaymentMethods, selectedPaymentMethodId, walletOptionEnabled]);
  const parentInventory: any[] = Array.isArray(parentInventoryData) ? parentInventoryData : [];
  const childPurchaseRequests: ChildPurchaseRequest[] = Array.isArray(childPurchaseRequestsData)
    ? childPurchaseRequestsData
    : [];
  const latestChildPurchaseRequest = childPurchaseRequests.length > 0 ? childPurchaseRequests[0] : null;
  const shouldShowChildRequestStatus = !isParentMode
    && !!latestChildPurchaseRequest
    && latestChildPurchaseRequest.id !== dismissedRequestId;
  const latestChildRequestProductName = latestChildPurchaseRequest
    ? ((i18n.language === "ar"
      ? latestChildPurchaseRequest.product?.nameAr || latestChildPurchaseRequest.product?.name
      : latestChildPurchaseRequest.product?.name || latestChildPurchaseRequest.product?.nameAr) || "-")
    : "-";
  const latestChildRequestDecidedAt = latestChildPurchaseRequest?.decidedAt
    ? new Date(latestChildPurchaseRequest.decidedAt).toLocaleString(i18n.language)
    : null;
  const childOrder = childOrderDetailsData?.order;
  const childOrderItems = Array.isArray(childOrderDetailsData?.items) ? childOrderDetailsData.items : [];

  useEffect(() => {
    if (!childToken || isParentMode) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let reconnectDelay = 1000;
    const maxDelay = 30000;
    let disposed = false;

    const refreshPurchaseState = () => {
      queryClient.invalidateQueries({ queryKey: ["child-store-purchase-requests", childToken] });
      if (selectedChildOrderId) {
        queryClient.invalidateQueries({ queryKey: ["child-store-order-details", childToken, selectedChildOrderId] });
      }
    };

    const connect = () => {
      if (disposed) return;
      eventSource = new EventSource(`/api/child/events?token=${encodeURIComponent(childToken)}`);

      eventSource.addEventListener("purchase_request_decision", () => {
        refreshPurchaseState();
      });

      eventSource.addEventListener("notification", () => {
        refreshPurchaseState();
      });

      eventSource.addEventListener("connected", () => {
        reconnectDelay = 1000;
      });

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (!disposed) {
          reconnectTimeout = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, maxDelay);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, [childToken, isParentMode, queryClient, selectedChildOrderId]);

  const getOrderItems = (order: any): any[] => {
    if (Array.isArray(order?.items)) return order.items;
    return [];
  };

  const getParentOrderStatusLabel = (status?: string): string => {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "completed" || normalized === "delivered" || normalized === "paid") return t("parentStore.statusCompleted");
    if (normalized === "return_requested") return t("parentStore.statusReturnRequested");
    if (normalized === "returned") return t("parentStore.statusReturned");
    if (normalized === "pending" || normalized === "payment_initiated") return t("parentStore.statusPending");
    if (normalized === "processing") return t("parentStore.statusProcessing");
    if (normalized === "shipped") return t("parentStore.statusShipped");
    if (normalized === "cancelled" || normalized === "failed") return t("parentStore.statusCancelled");
    return status || t("parentStore.statusPending");
  };

  const getParentOrderItemName = (item: any): string => {
    const directName = item?.name || item?.title || item?.productName || item?.nameAr;
    if (directName) return directName;
    const productId = String(item?.productId || "");
    const product = products.find((p) => p.id === productId);
    if (product) return product.nameAr || product.name;
    return t("parentStore.product", "منتج");
  };

  const getParentInventoryName = (item: any): string => {
    const product = item?.product || item;
    return product?.nameAr || product?.name || item?.title || t("parentStore.product", "منتج");
  };

  const getParentInventoryImage = (item: any): string | undefined => {
    const product = item?.product || item;
    return product?.image || product?.imageUrl;
  };

  const getParentInventoryPoints = (item: any): number => {
    return Number(item?.requiredPoints ?? item?.points ?? item?.product?.pointsPrice ?? 0);
  };

  const addToCart = (product: Product) => {
    runTrialSensitiveAction(() => {
      markTrialExplorationStep("store-add-to-cart");
      setCart(prev => {
        const existing = prev.find(item => item.product.id === product.id);
        if (existing) {
          return prev.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...prev, { product, quantity: 1 }];
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const handleCheckout = () => {
    if (!token) {
      runTrialSensitiveAction(() => {
        redirectToRequiredRegistration();
      }, { forPurchaseIntent: true });
      return;
    }

    if (isParentMode) {
      if (!guardParentCheckoutByChildren()) return;
      if (!hasAnyPaymentOption) return;
      runTrialSensitiveAction(() => {
        checkoutMutation.mutate({
          sourceAdId: effectivePromoAdIdWithFallback || undefined,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
          })),
        });
      }, { forPurchaseIntent: true });
      return;
    }

    captureTrialPurchaseIntent();

    cart.forEach(item => {
      const isCampaignItem = Boolean(
        effectivePromoProductIdWithFallback &&
        item.product.id === effectivePromoProductIdWithFallback &&
        effectivePromoDiscountPercentWithFallback &&
        effectivePromoDiscountPercentWithFallback > 0
      );

      checkoutMutation.mutate({
        productId: item.product.id,
        quantity: item.quantity,
        sourceAdId: isCampaignItem ? (effectivePromoAdIdWithFallback || undefined) : undefined,
        promoProductId: isCampaignItem ? effectivePromoProductIdWithFallback : undefined,
        promoDiscountPercent: isCampaignItem ? effectivePromoDiscountPercentWithFallback : undefined,
      });
    });
  };

  const renderStars = (rating: string = "4.5") => {
    const stars = parseFloat(rating);
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`w-3 h-3 ${i <= stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = categoryIcons[iconName] || Package;
    return IconComponent;
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const storeSurfaceClass = "border border-white/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/82 backdrop-blur-xl shadow-[0_20px_32px_-24px_rgba(15,23,42,0.55)]";
  const storeRaisedButtonClass = "rounded-2xl border border-white/40 dark:border-white/10 bg-white/20 dark:bg-slate-800/70 shadow-[0_12px_20px_-16px_rgba(15,23,42,0.6)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]";
  const categoryChipBaseClass = "whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-all min-h-[36px] border";
  const subCategoryChipBaseClass = "whitespace-nowrap px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 transition-all border min-h-[32px]";
  const productCardClass = "group cursor-pointer transition-all duration-300 overflow-hidden rounded-2xl border border-orange-100/80 dark:border-orange-900/30 bg-white/95 dark:bg-slate-900/90 shadow-[0_18px_28px_-24px_rgba(249,115,22,0.6)] hover:-translate-y-1 hover:shadow-[0_26px_36px_-22px_rgba(249,115,22,0.7)]";
  const listCardClass = "flex overflow-hidden cursor-pointer rounded-2xl border border-orange-100/80 dark:border-orange-900/30 bg-white/95 dark:bg-slate-900/90 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_30px_-22px_rgba(249,115,22,0.55)]";
  const productMediaClass = "relative aspect-square bg-gradient-to-br from-orange-100 to-amber-50 dark:from-slate-800 dark:to-slate-700 overflow-hidden";
  const addIconButtonClass = "h-8 w-8 p-0 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-[0_12px_20px_-12px_rgba(249,115,22,0.95)]";
  const addLabelButtonClass = "rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-[0_12px_20px_-12px_rgba(249,115,22,0.95)]";
  const dialogShellClass = "border border-orange-100 dark:border-orange-900/30 bg-white/95 dark:bg-slate-900/95 shadow-[0_30px_50px_-34px_rgba(15,23,42,0.7)]";

  return (
    <div className="relative min-h-screen overflow-x-clip bg-gradient-to-b from-amber-50 via-orange-50 to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-gray-900 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-24 ${isRTL ? "-left-20" : "-right-20"} h-72 w-72 rounded-full bg-orange-300/35 blur-3xl dark:bg-orange-500/20`} />
        <div className={`absolute top-1/3 ${isRTL ? "-right-24" : "-left-24"} h-80 w-80 rounded-full bg-amber-200/50 blur-3xl dark:bg-amber-500/10`} />
      </div>
      {childInfo?.id && <MandatoryTaskModal childId={childInfo.id} />}

      <header className="sticky top-0 z-50 border-b border-white/30 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white shadow-[0_14px_28px_-18px_rgba(249,115,22,0.9)] backdrop-blur">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between py-2 sm:py-3 gap-2">
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate(isParentMode ? "/parent-dashboard" : "/child-games")}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 min-h-[44px] shrink-0 ${storeRaisedButtonClass}`}
              data-testid="button-back-games"
            >
              <BackArrow className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-xl">🛍️</span>
                <span className="text-sm sm:text-lg font-bold hidden xs:inline">{t("childStore.storeName")}</span>
              </div>
            </button>

            <div className="flex-1 max-w-xl mx-1 sm:mx-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder={t('childStore.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full ps-8 sm:ps-10 pe-3 py-1.5 sm:py-2 rounded-xl bg-white/95 dark:bg-slate-800/90 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-white/50 dark:border-white/10 text-sm min-h-[36px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_-14px_rgba(15,23,42,0.45)]"
                  data-testid="input-search"
                />
                <Search className="absolute start-2 sm:start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 ${storeRaisedButtonClass}`}>
                <span className="text-lg">⭐</span>
                <div>
                  <p className="text-[10px] opacity-80">{t("childStore.pointsBalance")}</p>
                  <p className="font-bold text-sm">{availablePoints}</p>
                </div>
              </div>

              <button
                onClick={() => setShowCart(true)}
                className={`relative p-2 sm:p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center ${storeRaisedButtonClass}`}
                data-testid="button-open-cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -end-0.5 bg-yellow-400 text-gray-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                  >
                    {cart.length}
                  </motion.span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="relative -mb-1">
          <svg viewBox="0 0 1440 40" className="w-full h-6 sm:h-8 text-orange-700/60" preserveAspectRatio="none">
            <path fill="currentColor" d="M0,20 C360,40 720,0 1080,20 C1260,30 1380,15 1440,20 L1440,0 L0,0 Z" />
          </svg>
        </div>

        <div className="bg-black/10 backdrop-blur-md py-1.5 sm:py-2 border-t border-white/15">
          <div className="max-w-7xl mx-auto px-2 sm:px-4">
            {/* Main categories row */}
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-hide pb-1">
              <button
                onClick={() => { setSelectedCategory(null); setExpandedMainCategory(null); setShowLibraryOnly(false); }}
                className={`${categoryChipBaseClass} ${!selectedCategory && !showLibraryOnly && !expandedMainCategory ? "bg-white text-orange-700 font-bold border-white/80 shadow-[0_10px_18px_-12px_rgba(15,23,42,0.65)]" : "border-white/30 text-white hover:bg-white/15"
                  }`}
                data-testid="button-category-all"
              >
                {t("childStore.all")}
              </button>
              <button
                onClick={() => { setSelectedCategory(null); setExpandedMainCategory(null); setShowLibraryOnly(true); }}
                className={`${categoryChipBaseClass} ${showLibraryOnly ? "bg-purple-600 text-white font-bold border-purple-400 shadow-[0_10px_18px_-12px_rgba(88,28,135,0.8)]" : "bg-purple-500/20 border-purple-300/40 text-white hover:bg-purple-500/35"
                  }`}
                data-testid="button-category-library"
              >
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                {t("childStore.libraries")}
              </button>
              {mainCategories.map((cat: Category) => {
                const Icon = getCategoryIcon(cat.icon);
                const subs = getSubcategories(cat.id);
                const isExpanded = expandedMainCategory === cat.id;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setShowLibraryOnly(false);
                      if (subs.length > 0) {
                        if (isExpanded) {
                          setExpandedMainCategory(null);
                          setSelectedCategory(null);
                        } else {
                          setExpandedMainCategory(cat.id);
                          setSelectedCategory(cat.id);
                        }
                      } else {
                        setExpandedMainCategory(null);
                        setSelectedCategory(cat.id);
                      }
                    }}
                    className={`${categoryChipBaseClass} ${(isSelected || isExpanded) ? "bg-white text-orange-700 font-bold border-white/80 shadow-[0_10px_18px_-12px_rgba(15,23,42,0.65)]" : "border-white/30 text-white hover:bg-white/15"
                      }`}
                    data-testid={`button-category-${cat.id}`}
                  >
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                    {i18n.language === "ar" ? cat.nameAr : i18n.language === "pt" && cat.namePt ? cat.namePt : cat.name}
                    {subs.length > 0 && (
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Subcategories row */}
            {expandedMainCategory && getSubcategories(expandedMainCategory).length > 0 && (
              <div className="flex items-center gap-2 mt-1.5 overflow-x-auto scrollbar-hide pb-1">
                <button
                  onClick={() => setSelectedCategory(expandedMainCategory)}
                  className={`${subCategoryChipBaseClass} ${selectedCategory === expandedMainCategory
                    ? "bg-white text-orange-700 font-bold border-white/80 shadow-[0_10px_18px_-12px_rgba(15,23,42,0.65)]"
                    : "border-white/30 text-white hover:bg-white/15"
                    }`}
                >
                  {t("childStore.all")}
                </button>
                {getSubcategories(expandedMainCategory).map((sub: Category) => {
                  const SubIcon = getCategoryIcon(sub.icon);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedCategory(sub.id)}
                      className={`${subCategoryChipBaseClass} ${selectedCategory === sub.id
                        ? "bg-white text-orange-700 font-bold border-white/80 shadow-[0_10px_18px_-12px_rgba(15,23,42,0.65)]"
                        : "border-white/30 text-white hover:bg-white/15"
                        }`}
                      data-testid={`button-subcategory-${sub.id}`}
                    >
                      <SubIcon className="w-3 h-3" />
                      {i18n.language === "ar" ? sub.nameAr : i18n.language === "pt" && sub.namePt ? sub.namePt : sub.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={`mx-2 sm:mx-4 mt-2 rounded-2xl py-1.5 sm:py-2 ${storeSurfaceClass}`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="hidden sm:flex items-center gap-3 md:gap-6">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[11px] sm:text-xs">{t("childStore.fastDelivery")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] sm:text-xs">{t("childStore.qualityGuarantee")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-[11px] sm:text-xs">{t("childStore.support247")}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-28 sm:w-36 h-8 text-xs min-h-[36px] border-orange-100 dark:border-orange-900/40 bg-white/90 dark:bg-slate-800/80" data-testid="select-sort">
                  <SelectValue placeholder={t('childStore.sortPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">{t("childStore.bestSelling")}</SelectItem>
                  <SelectItem value="points_asc">{t("childStore.pointsLowest")}</SelectItem>
                  <SelectItem value="points_desc">{t("childStore.pointsHighest")}</SelectItem>
                  <SelectItem value="newest">{t("childStore.newest")}</SelectItem>
                  <SelectItem value="rating">{t("childStore.rating")}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-0.5 border border-orange-100 dark:border-orange-900/40 rounded-xl p-0.5 bg-white/80 dark:bg-slate-800/70">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 sm:p-2 rounded-lg min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-orange-500 text-white" : "text-gray-500 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30"}`}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 sm:p-2 rounded-lg min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-orange-500 text-white" : "text-gray-500 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30"}`}
                  data-testid="button-view-list"
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-2.5 sm:px-4 py-4 sm:py-6">
        {visibleSectionHints.length > 0 && (
          <section className="pointer-events-none fixed inset-x-0 top-[5.25rem] z-[70] px-2 sm:px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
                {visibleSectionHints.map((hint) => (
                  <SectionExplainerCard
                    key={hint.id}
                    id={hint.id}
                    icon={hint.icon}
                    title={hint.title}
                    description={hint.description}
                    onDismiss={dismissSectionHint}
                    onAutoHide={(hintId) => {
                      if (activeSectionHintId === hintId) {
                        setActiveSectionHintId(null);
                      }
                    }}
                    autoHideMs={1500}
                    onAction={handleSectionHintAction}
                    isDark={false}
                    tone="child"
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {shouldShowChildRequestStatus && latestChildPurchaseRequest && (
          <div className={`mb-4 sm:mb-6 rounded-2xl border p-3 sm:p-4 ${latestChildPurchaseRequest.status === "approved"
            ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/20"
            : latestChildPurchaseRequest.status === "rejected"
              ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20"
              : "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/20"
            }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`font-bold ${latestChildPurchaseRequest.status === "approved"
                  ? "text-green-700 dark:text-green-300"
                  : latestChildPurchaseRequest.status === "rejected"
                    ? "text-red-700 dark:text-red-300"
                    : "text-blue-700 dark:text-blue-300"
                  }`}>
                  {latestChildPurchaseRequest.status === "approved"
                    ? t("notifications.approved")
                    : latestChildPurchaseRequest.status === "rejected"
                      ? t("notifications.rejected")
                      : t("childStore.parentWillReview")}
                </p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-200 truncate">
                  {latestChildRequestProductName}
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  {latestChildPurchaseRequest.pointsPrice} {t("childStore.point")}
                </p>
                {latestChildPurchaseRequest.status === "approved" && latestChildPurchaseRequest.orderId && (
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {t("parentStore.orderNumber")}{latestChildPurchaseRequest.orderId.slice(0, 8)}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setSelectedChildOrderId(latestChildPurchaseRequest.orderId || null)}
                    >
                      {t("store.orderStatus")}
                    </Button>
                  </div>
                )}
                {latestChildRequestDecidedAt && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {latestChildRequestDecidedAt}
                  </p>
                )}
                {latestChildPurchaseRequest.status === "rejected" && latestChildPurchaseRequest.rejectionReason && (
                  <p className="mt-2 text-xs text-red-700 dark:text-red-300">
                    {latestChildPurchaseRequest.rejectionReason}
                  </p>
                )}
                {latestChildPurchaseRequest.productId && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 h-7 px-2 text-[11px]"
                    onClick={() => {
                      const product = products.find((p) => p.id === latestChildPurchaseRequest.productId);
                      if (product) setSelectedProduct(product);
                    }}
                  >
                    {t("view")}
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  localStorage.setItem("childStoreDismissedRequestId", latestChildPurchaseRequest.id);
                  setDismissedRequestId(latestChildPurchaseRequest.id);
                }}
              >
                {t("close")}
              </Button>
            </div>
          </div>
        )}

        {!selectedCategory && !searchQuery && featuredProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-8"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-1.5 sm:gap-2">
                <span className="text-xl">✨</span>
                {t("childStore.featuredProducts")}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
              {featuredProducts.map((product: Product, index: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Card
                    className={productCardClass}
                    onClick={() => setSelectedProduct(product)}
                    data-testid={`card-featured-product-${product.id}`}
                  >
                    <div className={productMediaClass}>
                      {(product.images && product.images.length > 1) ? (
                        <ProductImageCarousel
                          images={product.images}
                          mainImage={product.image}
                          alt={product.name}
                          className="w-full h-full"
                          compact
                          hoverArrows
                          autoSlide
                          autoSlideInterval={2000}
                        />
                      ) : product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {availablePoints >= getEffectivePointsPrice(product) && (
                        <Badge className="absolute top-2 end-2 bg-green-500 text-white text-xs">
                          {t("childStore.availableToYou")}
                        </Badge>
                      )}
                      {product.discountPercent && product.discountPercent > 0 && (
                        <Badge className="absolute top-2 start-2 bg-red-500 text-white text-xs font-bold z-10">
                          -{product.discountPercent}%
                        </Badge>
                      )}
                      {product.isLibraryProduct && (
                        <Badge className="absolute bottom-2 start-2 bg-purple-500 text-white text-xs">
                          {product.libraryName || t('childStore.library')}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{product.brand || "Classify"}</p>
                      <h3 className="font-medium text-sm text-gray-800 dark:text-white line-clamp-2 mb-2">{product.nameAr || product.name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(product.rating)}
                        <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                            <span className="text-xs text-gray-400 line-through">
                              {Math.round(parseFloat(product.originalPrice) * 10)} {t("childStore.point")}
                            </span>
                          )}
                          <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            <span className="font-bold text-sm">{getEffectivePointsPrice(product)}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className={addIconButtonClass}
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                          data-testid={`button-add-cart-${product.id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white truncate">
              {selectedCategory
                ? (() => { const c = categories.find((c: Category) => c.id === selectedCategory); return c ? (i18n.language === "ar" ? c.nameAr : i18n.language === "pt" && c.namePt ? c.namePt : c.name) : t('childStore.products'); })()
                : searchQuery ? t('childStore.searchResults', { query: searchQuery }) : t('childStore.allProducts')
              }
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 shrink-0">{products.length} {t("childStore.productUnit")}</p>
          </div>

          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400 animate-pulse">{t("childStore.allProducts")}...</p>
            </div>
          ) : products.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10 sm:py-16"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-5xl sm:text-6xl mb-4"
              >
                📦
              </motion.div>
              <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">{t("childStore.noProducts")}</h3>
              <p className="text-sm text-gray-400">{t("childStore.tryDifferentSearch")}</p>
            </motion.div>
          ) : (
            <div className={viewMode === "grid"
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4"
              : "space-y-2 sm:space-y-4"
            }>
              {products.map((product: Product, index: number) => (
                viewMode === "grid" ? (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Card
                      className={productCardClass}
                      data-testid={`card-product-${product.id}`}
                    >
                      <div
                        className={productMediaClass}
                        onClick={() => setSelectedProduct(product)}
                      >
                        {(product.images && product.images.length > 1) ? (
                          <ProductImageCarousel
                            images={product.images}
                            mainImage={product.image}
                            alt={product.name}
                            className="w-full h-full"
                            compact
                            hoverArrows
                            autoSlide
                            autoSlideInterval={2000}
                          />
                        ) : product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        {availablePoints >= getEffectivePointsPrice(product) && (
                          <Badge className="absolute top-2 start-2 bg-green-500 text-white text-xs">
                            {t("childStore.availableToYou")}
                          </Badge>
                        )}
                        {product.discountPercent && product.discountPercent > 0 && (
                          <Badge className="absolute top-2 end-2 bg-red-500 text-white text-xs font-bold">
                            -{product.discountPercent}%
                          </Badge>
                        )}
                        {product.isLibraryProduct && (
                          <Badge className="absolute bottom-2 start-2 bg-purple-500 text-white text-xs">
                            {product.libraryName || t('childStore.library')}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{product.brand || "Classify"}</p>
                        <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-white line-clamp-2 mb-2 min-h-[2rem] sm:min-h-[2.5rem]">{product.nameAr || product.name}</h3>
                        <div className="flex items-center gap-1 mb-2">
                          {renderStars(product.rating)}
                          <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                              <span className="text-xs text-gray-400 line-through">
                                {Math.round(parseFloat(product.originalPrice) * 10)} {t("childStore.point")}
                              </span>
                            )}
                            <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                              <span className="font-bold">{getEffectivePointsPrice(product)}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className={addLabelButtonClass}
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                            data-testid={`button-add-cart-${product.id}`}
                          >
                            <ShoppingCart className="w-4 h-4 me-1" />
                            {t("childStore.addBtn")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card
                      className={listCardClass}
                      onClick={() => setSelectedProduct(product)}
                      data-testid={`card-product-list-${product.id}`}
                    >
                      <div className="relative w-28 h-28 sm:w-40 sm:h-40 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                        {(product.images && product.images.length > 1) ? (
                          <ProductImageCarousel
                            images={product.images}
                            mainImage={product.image}
                            alt={product.name}
                            className="w-full h-full"
                            compact
                            hoverArrows
                            autoSlide
                            autoSlideInterval={2000}
                          />
                        ) : product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        {product.discountPercent && product.discountPercent > 0 && (
                          <Badge className="absolute top-2 end-2 bg-red-500 text-white text-xs font-bold">
                            -{product.discountPercent}%
                          </Badge>
                        )}
                        {product.isLibraryProduct && (
                          <Badge className="absolute bottom-2 start-2 bg-purple-500 text-white text-xs">
                            {product.libraryName || t('childStore.library')}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{product.brand || "Classify"}</p>
                          <h3 className="font-medium text-gray-800 dark:text-white mb-2">{product.nameAr || product.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{product.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {renderStars(product.rating)}
                            <span className="text-xs text-gray-400">({product.reviewCount || 0} {t("childStore.review")})</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex flex-col">
                            {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                              <span className="text-xs text-gray-400 line-through">
                                {Math.round(parseFloat(product.originalPrice) * 10)} {t("childStore.point")}
                              </span>
                            )}
                            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-full">
                              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                              <span className="font-bold text-lg">{getEffectivePointsPrice(product)} {t("childStore.point")}</span>
                            </div>
                          </div>
                          <Button
                            className={addLabelButtonClass}
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                          >
                            <ShoppingCart className="w-4 h-4 me-2" />
                            {t("childStore.addToCart")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className={`max-w-lg max-h-[90vh] overflow-y-auto ${dialogShellClass}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t("childStore.shoppingCart")} ({cart.length} {t("childStore.productUnit")})
            </DialogTitle>
            {isParentMode && (
              <div className="grid grid-cols-3 gap-1 rounded-xl p-1 border border-gray-200 dark:border-gray-700 mt-3">
                <button
                  onClick={() => setCartDialogSection("cart")}
                  className={`px-2 py-2 rounded-lg text-xs font-bold ${cartDialogSection === "cart" ? "bg-orange-500 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  {t("parentStore.cartTab")}
                </button>
                <button
                  onClick={() => setCartDialogSection("orders")}
                  className={`px-2 py-2 rounded-lg text-xs font-bold ${cartDialogSection === "orders" ? "bg-orange-500 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  {t("parentStore.myOrdersTab")}
                </button>
                <button
                  onClick={() => setCartDialogSection("inventory")}
                  className={`px-2 py-2 rounded-lg text-xs font-bold ${cartDialogSection === "inventory" ? "bg-orange-500 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  {t("parentStore.myInventory")}
                </button>
              </div>
            )}
          </DialogHeader>

          {(!isParentMode || cartDialogSection === "cart") && (cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t("childStore.cartEmpty")}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.product.image ? (
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.product.nameAr || item.product.name}</h4>
                      <div className="flex items-center gap-1 text-yellow-600 font-bold">
                        <Star className="w-3 h-3 fill-yellow-500" />
                        {getEffectivePointsPrice(item.product)} {t("childStore.point")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 h-8 w-8 p-0"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">{t("childStore.totalLabel")}</span>
                  <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold text-xl">
                      {isParentMode ? `${cartTotalAmount.toFixed(2)} ${selectedCurrency}` : `${cartTotalPoints} ${t("childStore.point")}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("childStore.currentBalance")}</span>
                  <span className={`font-bold ${canAfford ? "text-green-600" : "text-red-600"}`}>
                    {isParentMode ? `${availablePoints.toFixed(2)} ${selectedCurrency}` : `${availablePoints} ${t("childStore.point")}`}
                  </span>
                </div>

                {!canAfford && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
                    <p className="text-red-600 dark:text-red-400 font-bold mb-2">{t("childStore.insufficientPoints")}</p>
                    <p className="text-red-500 text-sm mb-3">
                      {isParentMode
                        ? `${(cartTotalAmount - availablePoints).toFixed(2)} ${selectedCurrency}`
                        : t("childStore.needMorePoints", { points: cartTotalPoints - availablePoints })}
                    </p>
                    <Button
                      onClick={() => { setShowCart(false); navigate(isParentMode ? "/parent-dashboard" : "/child-games"); }}
                      className="bg-green-500 hover:bg-green-600"
                      data-testid="button-play-games-cart"
                    >
                      <Gamepad2 className="w-4 h-4 me-2" />
                      {t("childStore.playToEarn")}
                    </Button>
                  </div>
                )}

                {canProceedToCheckout && hasLinkedChildren && (
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      setShowCart(false);
                      if (!token) {
                        runTrialSensitiveAction(() => {
                          redirectToRequiredRegistration();
                        }, { forPurchaseIntent: true });
                        return;
                      }
                      if (!guardParentCheckoutByChildren()) {
                        navigate("/parent-dashboard");
                        return;
                      }
                      markTrialExplorationStep("store-checkout-view");
                      setShowCheckout(true);
                    }}
                    data-testid="button-proceed-checkout"
                  >
                    <Star className="w-4 h-4 me-2" />
                    {isParentMode ? t("parentStore.proceedToCheckout") : t("childStore.completePurchasePoints")}
                  </Button>
                )}

                {canAfford && isParentMode && !hasLinkedChildren && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
                    <p className="text-red-600 dark:text-red-400 font-bold mb-2">{t("noLinkedChildren")}</p>
                    <p className="text-red-500 text-sm mb-3">{t("parentInventory.noLinkedChildren")}</p>
                    <Button
                      onClick={() => { setShowCart(false); navigate("/parent-dashboard"); }}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {t("linkChild")}
                    </Button>
                  </div>
                )}
              </div>
            </>
          ))}

          {isParentMode && cartDialogSection === "orders" && (
            <div className="space-y-3">
              {loadingParentOrders ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={`parent-order-skeleton-${idx}`} className="rounded-xl border p-3 animate-pulse border-gray-200 dark:border-gray-700">
                      <div className="h-3 w-32 rounded mb-2 bg-gray-200 dark:bg-gray-700" />
                      <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  ))}
                </div>
              ) : parentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">{t("parentStore.noOrdersYet")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {parentOrders.slice(0, 12).map((order: any) => (
                    <Card key={`parent-order-${order.id}`} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold">{t("parentStore.orderNumber")}{order.id?.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString(i18n.language) : ""}</p>
                          </div>
                          <div className="text-right">
                            <Badge>{getParentOrderStatusLabel(order.status)}</Badge>
                            <p className="text-sm font-bold text-orange-600 mt-1">{order.totalAmount} {t("parentStore.currency")}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-gray-500">
                            {getOrderItems(order).length} {t("parentStore.productCount")}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}
                          >
                            {expandedOrderId === order.id ? t("close") : t("view")}
                          </Button>
                        </div>

                        {expandedOrderId === order.id && (
                          <div className="mt-1 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 space-y-1.5">
                            {getOrderItems(order).length === 0 ? (
                              <p className="text-[11px] text-gray-500">-</p>
                            ) : (
                              getOrderItems(order).map((item: any, idx: number) => (
                                <div key={`${order.id}-item-${idx}`} className="flex items-center justify-between gap-2 text-[11px]">
                                  <span className="truncate">{getParentOrderItemName(item)}</span>
                                  <span className="whitespace-nowrap">{item?.quantity || 1} x {item?.unitPrice || item?.price || "0"}</span>
                                </div>
                              ))
                            )}

                            {order?.returnRequest?.status && (
                              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2 text-[11px]">
                                <p className="font-semibold text-amber-700 dark:text-amber-300">
                                  {t("parentStore.returnRequestStatus")} {order.returnRequest.status}
                                </p>
                                {order.returnRequest.resolvedAt && (
                                  <p className="text-gray-500 mt-1">
                                    {t("parentStore.returnResolvedAt")}: {new Date(order.returnRequest.resolvedAt).toLocaleDateString(i18n.language)}
                                  </p>
                                )}
                              </div>
                            )}

                            {order?.canRequestReturn && (
                              <div className="pt-1">
                                <Button
                                  type="button"
                                  className="h-7 px-2 text-[11px]"
                                  variant="outline"
                                  disabled={requestReturnMutation.isPending}
                                  onClick={() => requestReturnMutation.mutate(order.id)}
                                >
                                  {requestReturnMutation.isPending ? t("parentStore.processing") : t("parentStore.requestReturn")}
                                </Button>
                                {order?.returnEligibleUntil && (
                                  <p className="text-[10px] text-gray-500 mt-1">
                                    {t("parentStore.returnEligibleUntil")} {new Date(order.returnEligibleUntil).toLocaleDateString(i18n.language)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {isParentMode && cartDialogSection === "inventory" && (
            <div className="space-y-3">
              {loadingParentInventory ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={`parent-inventory-skeleton-${idx}`} className="rounded-xl border p-3 animate-pulse border-gray-200 dark:border-gray-700">
                      <div className="h-3 w-28 rounded mb-2 bg-gray-200 dark:bg-gray-700" />
                      <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  ))}
                </div>
              ) : parentInventory.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">{t("parentStore.noProducts")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {parentInventory.slice(0, 12).map((item: any, idx: number) => (
                    <Card key={`parent-inventory-${item.id || idx}`} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                            {getParentInventoryImage(item) ? (
                              <img src={getParentInventoryImage(item)} alt={getParentInventoryName(item)} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{getParentInventoryName(item)}</p>
                            <p className="text-xs text-gray-500">{getParentInventoryPoints(item)} {t("parentStore.pointsSuffix")}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${dialogShellClass}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              {t("childStore.requestPurchase")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {!isParentMode && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-800 dark:text-blue-300">{t("childStore.parentApprovalNeeded")}</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">{t("childStore.requestWillBeSentToParent")}</p>
                  </div>
                </div>
              </div>
            )}

            {isParentMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-semibold mb-2">{t("parentStore.country")}</p>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCountries.map((country) => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">{t("parentStore.currencyLabel")}</p>
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map((currency) => (
                        <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                {t("childStore.paymentMethod")}
              </h3>
              {isParentMode && googlePlayEnforced && (
                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                  {t("parentStore.googlePlayEnforcedNotice")}
                </div>
              )}
              {isParentMode ? (
                <div className="space-y-2">
                  {walletOptionEnabled && (
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethodId("wallet")}
                      className={`w-full flex items-center justify-between p-4 rounded-lg border-2 ${selectedPaymentMethodId === "wallet" ? "border-yellow-400 bg-white dark:bg-gray-800" : "border-transparent bg-white/60 dark:bg-gray-800/60"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{t("parentStore.payFromWalletTitle")}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t("parentStore.balanceLabel")}: {availablePoints.toFixed(2)} {selectedCurrency}</p>
                        </div>
                      </div>
                      {selectedPaymentMethodId === "wallet" && <Check className="w-6 h-6 text-green-500" />}
                    </button>
                  )}

                  {checkoutPaymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethodId(method.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-lg border-2 ${selectedPaymentMethodId === method.id ? "border-yellow-400 bg-white dark:bg-gray-800" : "border-transparent bg-white/60 dark:bg-gray-800/60"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{method.displayName || method.type}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{method.type}</p>
                        </div>
                      </div>
                      {selectedPaymentMethodId === method.id && <Check className="w-6 h-6 text-green-500" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-yellow-400">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div>
                      <p className="font-bold">{t("childStore.payWithPoints")}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t("childStore.yourBalance")}: {availablePoints} {t("childStore.points")}</p>
                    </div>
                  </div>
                  <Check className="w-6 h-6 text-green-500" />
                </div>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-bold mb-3">{t("childStore.orderSummary")}</h3>
              <div className="space-y-2 text-sm">
                {cart.map(item => (
                  <div key={item.product.id} className="flex justify-between">
                    <span>{item.product.nameAr || item.product.name} x{item.quantity}</span>
                    {isParentMode ? (
                      <span>{(parseFloat(item.product.price || "0") * item.quantity).toFixed(2)} {selectedCurrency}</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        {getEffectivePointsPrice(item.product) * item.quantity}
                      </span>
                    )}
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>{t("childStore.total")}:</span>
                  {isParentMode ? (
                    <span className="text-yellow-700">{cartTotalAmountAfterDiscount.toFixed(2)} {selectedCurrency}</span>
                  ) : (
                    <span className="flex items-center gap-2 text-yellow-600">
                      <Star className="w-5 h-5 fill-yellow-500" />
                      {cartTotalPoints} {t("childStore.points")}
                    </span>
                  )}
                </div>
                {isParentMode && firstProductDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span>{t("discount", "خصم")} ({trialFirstProductDiscountPercent}%)</span>
                    <span>-{firstProductDiscountAmount.toFixed(2)} {selectedCurrency}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>{t("childStore.balanceAfterPurchase")}:</span>
                  <span className="text-green-600 font-bold">
                    {isParentMode
                      ? `${(availablePoints - cartTotalAmountAfterDiscount).toFixed(2)} ${selectedCurrency}`
                      : `${availablePoints - cartTotalPoints} ${t("childStore.points")}`}
                  </span>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 py-6 text-lg"
              onClick={handleCheckout}
              disabled={checkoutActionDisabled}
              data-testid="button-confirm-checkout"
            >
              {checkoutMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("childStore.processing")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  {isParentMode
                    ? t("parentStore.confirmPaymentWithAmount", { amount: cartTotalAmountAfterDiscount.toFixed(2), currency: selectedCurrency })
                    : `${t("childStore.sendRequestToParent")} (${cartTotalPoints} ${t("childStore.points")})`}
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedChildOrderId}
        onOpenChange={(open) => {
          if (!open) setSelectedChildOrderId(null);
        }}
      >
        <DialogContent className={`max-w-lg max-h-[85vh] overflow-y-auto ${dialogShellClass}`}>
          <DialogHeader>
            <DialogTitle>{t("store.orderStatus")}</DialogTitle>
          </DialogHeader>

          {loadingChildOrderDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : childOrder ? (
            <div className="space-y-3">
              <div className="rounded-xl border p-3 space-y-1">
                <p className="text-sm font-bold">
                  {t("parentStore.orderNumber")}{String(childOrder.id || "").slice(0, 8)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {t("store.orderStatus")}:
                  {" "}
                  {getParentOrderStatusLabel(childOrder.status)}
                </p>
                {childOrder.shippingStatus && (
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {t("store.orderStatus")}: {childOrder.shippingStatus}
                  </p>
                )}
                {childOrder.createdAt && (
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {new Date(childOrder.createdAt).toLocaleString(i18n.language)}
                  </p>
                )}
              </div>

              <div className="rounded-xl border p-3 space-y-2">
                {childOrderItems.length === 0 ? (
                  <p className="text-sm text-gray-500">-</p>
                ) : (
                  childOrderItems.map((item, idx) => (
                    <div key={`child-order-item-${idx}`} className="flex items-center justify-between text-sm gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                          {item.product?.image ? (
                            <img src={item.product.image} alt={item.product?.nameAr || item.product?.name || "product"} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <span className="truncate">
                          {item.product?.nameAr
                            || item.product?.name
                            || products.find((p) => p.id === item.productId)?.nameAr
                            || products.find((p) => p.id === item.productId)?.name
                            || item.productId
                            || "-"}
                        </span>
                      </div>
                      <span className="whitespace-nowrap font-medium">{item.quantity || 1} x {item.unitAmount || "0"}</span>
                    </div>
                  ))
                )}
              </div>

              <Button className="w-full" variant="outline" onClick={() => setSelectedChildOrderId(null)}>
                {t("close")}
              </Button>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-gray-500">{t("childStore.error")}</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${dialogShellClass}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-500" />
              {t("productDetail.title")}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
                {(selectedProduct.images && selectedProduct.images.length > 1) ? (
                  <ProductImageCarousel
                    images={selectedProduct.images}
                    mainImage={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full"
                    contain
                  />
                ) : selectedProduct.image ? (
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-contain rounded-xl" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{selectedProduct.brand || "Classify"}</p>
                <h4 className="font-bold text-xl text-gray-800 dark:text-white">{selectedProduct.nameAr || selectedProduct.name}</h4>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{selectedProduct.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {renderStars(selectedProduct.rating)}
                  <span className="text-xs text-gray-400">({selectedProduct.reviewCount || 0} {t("productDetail.reviews")})</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("productDetail.price")}</p>
                  <div className="flex items-center gap-2 text-2xl font-bold text-yellow-600">
                    <Star className="w-6 h-6 fill-yellow-500" />
                    {getEffectivePointsPrice(selectedProduct)} {t("productDetail.point")}
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("productDetail.yourBalance")}</p>
                  <p className={`text-xl font-bold ${availablePoints >= getEffectivePointsPrice(selectedProduct) ? "text-green-600" : "text-red-600"}`}>
                    {availablePoints} {t("productDetail.point")}
                  </p>
                </div>
              </div>

              {availablePoints >= getEffectivePointsPrice(selectedProduct) ? (
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 py-6"
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                  data-testid="button-add-to-cart"
                >
                  <ShoppingCart className="w-5 h-5 me-2" />
                  {t("productDetail.addToCart")}
                </Button>
              ) : (
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-red-600 dark:text-red-400 font-bold mb-2">{t("productDetail.insufficientPoints")}</p>
                  <p className="text-sm text-red-500 mb-4">
                    {t("productDetail.needMorePoints", { points: getEffectivePointsPrice(selectedProduct) - availablePoints })}
                  </p>
                  <Button
                    onClick={() => navigate(isParentMode ? "/parent-dashboard" : "/child-games")}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Gamepad2 className="w-4 h-4 me-2" />
                    {t("productDetail.playToEarn")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TrialUpgradePromptDialog
        open={showTrialLinkPrompt}
        onOpenChange={setShowTrialLinkPrompt}
        title={trialPromptContext === "purchase" ? t("childStore.parentApprovalNeeded") : t("childStore.askParentToRegister")}
        description={trialPromptContext === "purchase" ? t("childStore.requestWillBeSentToParent") : t("childStore.askParentToRegisterDesc")}
        helperText={trialPromptContext === "purchase" ? t("requestCodeFromParents") : undefined}
        closeLabel={trialPromptContext === "purchase" ? t("childStore.cancel") : t("close")}
        registerLabel={t("parentAuth.register")}
        copyLabel={t("copy")}
        linkCodeLabel={t("parentDashboard.yourLinkCode")}
        showSocialLoginButtons={showSocialLoginButtons}
        parentLinkInfo={resolvedParentLink}
        onCopyLink={async () => {
          try {
            await navigator.clipboard.writeText(resolvedParentLink?.trialChildLinkUrl || "");
            toast({ title: t("copy") });
          } catch {
            // Clipboard permissions can fail on some browsers.
          }
        }}
        onRegister={() => {
          if (trialPromptContext === "purchase") {
            captureTrialPurchaseIntent();
          }
          setShowTrialLinkPrompt(false);
          const parentPath = resolvedParentLink?.trialChildToken
            ? `/parent-auth?mode=register&trialChildToken=${encodeURIComponent(String(resolvedParentLink.trialChildToken))}`
            : "/parent-auth?mode=register";
          navigate(parentPath);
        }}
      />

      {!isParentMode && <ChildBottomNav activeTab="games" />}
    </div>
  );
};

export default ChildStore;
