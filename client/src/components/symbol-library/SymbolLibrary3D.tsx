/**
 * SymbolLibrary3D — Advanced 3D Interactive Symbol Library
 *
 * Features:
 *  - Lazy-loaded R3F 3D scene header with floating symbols
 *  - Fuzzy search via Fuse.js with instant autocomplete
 *  - Category tabs with animated indicator
 *  - Framer-motion 3D card hover effects (tilt, glow, bounce)
 *  - Confetti burst on selection
 *  - Premium lock/unlock indicator
 *  - Recent symbols from localStorage
 *  - Pagination ("Load more") for 1000+ symbols
 *  - Selected symbol bar with "Insert" action
 *  - Responsive & child-friendly UI
 */
import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  X,
  Sparkles,
  Crown,
  Lock,
  ChevronDown,
  Star,
  Zap,
  GripVertical,
} from "lucide-react";

// Scene3D removed — Three.js crashed in production minified builds.
// The 3D header is replaced with a CSS-animated emoji banner below.

// ─── types ────────────────────────────────────────────────────────────
type SymbolCategory = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  sortOrder: number;
};

type SymbolItem = {
  id: string;
  char: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  tags?: string[] | string;
  imageUrl?: string | null;
  price: number;
  isPremium: boolean;
  sortOrder?: number;
};

export type SymbolLibrary3DProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (symbol: { char: string; nameAr: string; nameEn: string }) => void;
  insertTarget?: string;
};

// ─── category theme map ───────────────────────────────────────────────
const CATEGORY_THEMES: Record<
  string,
  { gradient: string; accent: string; glow: string; particles: string }
> = {
  "numbers-letters": {
    gradient: "from-blue-50 to-indigo-100",
    accent: "#3B82F6",
    glow: "rgba(59,130,246,0.35)",
    particles: "#60A5FA",
  },
  "emotions-faces": {
    gradient: "from-orange-50 to-amber-100",
    accent: "#FB923C",
    glow: "rgba(251,146,60,0.35)",
    particles: "#FDBA74",
  },
  animals: {
    gradient: "from-green-50 to-emerald-100",
    accent: "#22C55E",
    glow: "rgba(34,197,94,0.35)",
    particles: "#86EFAC",
  },
  "nature-elements": {
    gradient: "from-purple-50 to-violet-100",
    accent: "#A855F7",
    glow: "rgba(168,85,247,0.35)",
    particles: "#C084FC",
  },
  "shapes-colors": {
    gradient: "from-pink-50 to-rose-100",
    accent: "#EC4899",
    glow: "rgba(236,72,153,0.35)",
    particles: "#F472B6",
  },
  "educational-tools": {
    gradient: "from-yellow-50 to-amber-100",
    accent: "#EAB308",
    glow: "rgba(234,179,8,0.35)",
    particles: "#FCD34D",
  },
  "activities-hobbies": {
    gradient: "from-cyan-50 to-sky-100",
    accent: "#06B6D4",
    glow: "rgba(6,182,212,0.35)",
    particles: "#67E8F9",
  },
  "rewards-achievements": {
    gradient: "from-amber-50 to-yellow-100",
    accent: "#F59E0B",
    glow: "rgba(245,158,11,0.35)",
    particles: "#FBBF24",
  },
  "project-specific": {
    gradient: "from-violet-50 to-purple-100",
    accent: "#8B5CF6",
    glow: "rgba(139,92,246,0.35)",
    particles: "#A78BFA",
  },
};

const DEFAULT_THEME = {
  gradient: "from-slate-50 to-gray-100",
  accent: "#6366F1",
  glow: "rgba(99,102,241,0.35)",
  particles: "#A5B4FC",
};

function getTheme(slug?: string) {
  return (slug && CATEGORY_THEMES[slug]) || DEFAULT_THEME;
}

// ─── confetti helper ──────────────────────────────────────────────────
function fireConfetti(x = 0.5, y = 0.7) {
  confetti({
    particleCount: 40,
    spread: 55,
    startVelocity: 25,
    gravity: 0.9,
    origin: { x, y },
    colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#A78BFA", "#FBBF24"],
    shapes: ["circle", "square"],
    ticks: 50,
    scalar: 0.9,
  });
}

function fireStarBurst(x = 0.5, y = 0.7) {
  confetti({
    particleCount: 18,
    spread: 360,
    startVelocity: 15,
    gravity: 0.4,
    origin: { x, y },
    colors: ["#FFD700", "#FFA500"],
    shapes: ["star" as any],
    scalar: 1.2,
    ticks: 40,
  });
}

// ─── parse tags safely ────────────────────────────────────────────────
function parseTags(tags: string[] | string | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── constants ────────────────────────────────────────────────────────
const PAGE_SIZE = 100;
const RECENT_KEY = "symbolLib3d_recent";
const MAX_RECENT = 24;

// ─── main component ──────────────────────────────────────────────────
export function SymbolLibrary3D({
  open,
  onOpenChange,
  onSelect,
  insertTarget,
}: SymbolLibrary3DProps) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  // state
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolItem | null>(null);
  const [justSelected, setJustSelected] = useState(false);
  const [show3D, setShow3D] = useState(true);
  const [recentSymbols, setRecentSymbols] = useState<SymbolItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // reset on open
  useEffect(() => {
    if (open) {
      setSearch("");
      setActiveCategory("all");
      setPage(1);
      setSelectedSymbol(null);
      setJustSelected(false);
      setTimeout(() => searchRef.current?.focus(), 150);
    }
  }, [open]);

  // ─── data fetching ─────────────────────────────────────────────────
  const { data: categoriesData } = useQuery<SymbolCategory[]>({
    queryKey: ["symbol-categories"],
    queryFn: async () => {
      const res = await fetch("/api/symbols/categories");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: open,
    staleTime: 10 * 60 * 1000,
  });

  const { data: symbolsData, isLoading } = useQuery<{
    symbols: SymbolItem[];
    total: number;
    hasMore: boolean;
  }>({
    queryKey: ["symbols-lib3d", activeCategory, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory !== "all") params.set("category", activeCategory);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/symbols?${params}`);
      const json = await res.json();
      return json.data ?? { symbols: [], total: 0, hasMore: false };
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesData ?? [];
  const rawSymbols = symbolsData?.symbols ?? [];
  const hasMore = symbolsData?.hasMore ?? false;
  const total = symbolsData?.total ?? 0;

  // active category object
  const activeCat = categories.find((c) => c.id === activeCategory);
  const activeCatSlug = activeCat?.slug;
  const theme = getTheme(activeCatSlug);

  // ─── fuzzy search ──────────────────────────────────────────────────
  const fuse = useMemo(() => {
    const items = rawSymbols.map((s) => ({
      ...s,
      _tags: parseTags(s.tags).join(" "),
    }));
    return new Fuse(items, {
      keys: ["nameAr", "nameEn", "char", "_tags"],
      threshold: 0.35,
      ignoreLocation: true,
      includeScore: true,
    });
  }, [rawSymbols]);

  const filteredSymbols = useMemo(() => {
    const q = search.trim();
    if (!q) return rawSymbols;
    return fuse.search(q).map((r) => r.item);
  }, [fuse, search, rawSymbols]);

  // preview emojis for the animated banner (first 12)
  const bannerEmojis = useMemo(
    () => filteredSymbols.slice(0, 12).map((s) => s.char),
    [filteredSymbols],
  );

  // grouped by category when viewing "all"
  const groupedSymbols = useMemo(() => {
    if (activeCategory !== "all" || search.trim()) return null;
    const groups: Record<string, SymbolItem[]> = {};
    for (const s of filteredSymbols) {
      if (!groups[s.categoryId]) groups[s.categoryId] = [];
      groups[s.categoryId].push(s);
    }
    return groups;
  }, [filteredSymbols, activeCategory, search]);

  // ─── handlers ──────────────────────────────────────────────────────
  const getCatName = (cat: SymbolCategory) =>
    isAr ? cat.nameAr : cat.nameEn;
  const getCatById = (id: string) => categories.find((c) => c.id === id);

  const handleSelect = useCallback(
    (sym: SymbolItem) => {
      setSelectedSymbol(sym);
      setJustSelected(true);
      setTimeout(() => setJustSelected(false), 600);

      // confetti burst
      fireConfetti();

      // update recents
      setRecentSymbols((prev) => {
        const updated = [
          sym,
          ...prev.filter((s) => s.id !== sym.id),
        ].slice(0, MAX_RECENT);
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    [],
  );

  const handleInsert = useCallback(() => {
    if (!selectedSymbol) return;
    fireStarBurst();
    onSelect({
      char: selectedSymbol.char,
      nameAr: selectedSymbol.nameAr,
      nameEn: selectedSymbol.nameEn,
    });
    onOpenChange(false);
  }, [selectedSymbol, onSelect, onOpenChange]);

  const handleCategoryChange = useCallback((catId: string) => {
    setActiveCategory(catId);
    setPage(1);
    setSearch("");
  }, []);

  // ─── drag helpers ──────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.DragEvent, sym: SymbolItem) => {
      e.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          char: sym.char,
          nameAr: sym.nameAr,
          nameEn: sym.nameEn,
        }),
      );
      e.dataTransfer.effectAllowed = "copy";
    },
    [],
  );

  // ─── render ────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[96vw] max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* ── Header ─────────────────────────────────────────── */}
        <DialogHeader className="px-5 pt-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <motion.div
              animate={{ rotate: [0, 12, -12, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <Sparkles className="h-5 w-5 text-amber-500" />
            </motion.div>
            {isAr ? "مكتبة الرموز التفاعلية" : "Interactive Symbol Library"}
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 font-normal"
            >
              3D
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* ── Search bar ─────────────────────────────────────── */}
        <div className="px-4 py-2 border-b shrink-0 bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isAr
                  ? "بحث سريع... (مثال: قلب، نجمة، 😀)"
                  : "Quick search... (e.g. heart, star, 😀)"
              }
              className="pl-9 pr-8 h-9 text-sm rounded-xl bg-background"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {search.trim() && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-muted-foreground mt-1 px-1"
            >
              {isAr
                ? `${filteredSymbols.length} نتيجة`
                : `${filteredSymbols.length} results`}
            </motion.p>
          )}
        </div>

        {/* ── Category tabs ──────────────────────────────────── */}
        <div className="px-3 py-2 border-b shrink-0 overflow-x-auto hide-scrollbar">
          <div className="flex gap-1.5 min-w-max">
            <CategoryPill
              active={activeCategory === "all"}
              onClick={() => handleCategoryChange("all")}
              icon="🌐"
              label={isAr ? "الكل" : "All"}
            />
            {categories.map((cat) => (
              <CategoryPill
                key={cat.id}
                active={activeCategory === cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                icon={cat.icon}
                label={getCatName(cat)}
              />
            ))}
          </div>
        </div>

        {/* ── Animated Emoji Banner ────────────────────────── */}
        {show3D && bannerEmojis.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 80 }}
            exit={{ opacity: 0, height: 0 }}
            className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${theme.gradient}`}
          >
            <div className="flex items-center justify-center h-full gap-2 px-4 overflow-hidden">
              {bannerEmojis.map((emoji, i) => (
                <motion.span
                  key={`banner-${i}`}
                  className="text-3xl select-none"
                  animate={{
                    y: [0, -8, 0],
                    scale: [1, 1.15, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2 + (i % 3) * 0.5,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                >
                  {emoji}
                </motion.span>
              ))}
            </div>
            <button
              onClick={() => setShow3D(false)}
              className="absolute top-2 right-2 text-[10px] bg-white/60 backdrop-blur rounded-full px-2 py-0.5 hover:bg-white/80 transition"
            >
              {isAr ? "إخفاء" : "Hide"}
            </button>
          </motion.div>
        )}

        {!show3D && bannerEmojis.length > 0 && (
          <button
            onClick={() => setShow3D(true)}
            className="shrink-0 text-[11px] text-center py-1.5 text-muted-foreground hover:text-foreground border-b transition"
          >
            {isAr ? "✨ عرض الرموز المتحركة" : "✨ Show Animated Banner"}
          </button>
        )}

        {/* ── Content area (scrollable) ──────────────────────── */}
        <ScrollArea className="flex-1 min-h-0">
          <div ref={gridRef} className="p-4">
            {/* Recent symbols */}
            {!search.trim() &&
              activeCategory === "all" &&
              recentSymbols.length > 0 && (
                <section className="mb-5">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" />
                    {isAr ? "المستخدمة مؤخراً" : "Recently Used"}
                  </h3>
                  <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                    {recentSymbols.map((sym, i) => (
                      <SymbolCard3D
                        key={`recent-${sym.id}-${i}`}
                        symbol={sym}
                        isAr={isAr}
                        isSelected={selectedSymbol?.id === sym.id}
                        onSelect={handleSelect}
                        onDragStart={handleDragStart}
                        theme={getTheme(
                          getCatById(sym.categoryId)?.slug,
                        )}
                        delay={i * 0.02}
                      />
                    ))}
                  </div>
                </section>
              )}

            {/* Loading state */}
            {isLoading && (
              <div className="text-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                  }}
                  className="inline-block"
                >
                  <Zap className="h-6 w-6 text-amber-400" />
                </motion.div>
                <p className="text-sm text-muted-foreground mt-2">
                  {isAr ? "جاري التحميل..." : "Loading symbols..."}
                </p>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && filteredSymbols.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-sm text-muted-foreground">
                  {isAr ? "لا توجد نتائج" : "No results found"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr
                    ? "جرّب كلمة بحث مختلفة"
                    : "Try a different search term"}
                </p>
              </motion.div>
            )}

            {/* Grouped display (all categories, no search) */}
            {!isLoading && groupedSymbols && (
              <>
                {categories.map((cat) => {
                  const catSymbols = groupedSymbols[cat.id];
                  if (!catSymbols || catSymbols.length === 0) return null;
                  const catTheme = getTheme(cat.slug);
                  return (
                    <section key={cat.id} className="mb-5">
                      <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 sticky top-0 bg-background/80 backdrop-blur py-1 z-10">
                        <span>{cat.icon}</span>
                        {getCatName(cat)}
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0"
                        >
                          {catSymbols.length}
                        </Badge>
                      </h3>
                      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                        {catSymbols.map((sym, i) => (
                          <SymbolCard3D
                            key={sym.id}
                            symbol={sym}
                            isAr={isAr}
                            isSelected={selectedSymbol?.id === sym.id}
                            onSelect={handleSelect}
                            onDragStart={handleDragStart}
                            theme={catTheme}
                            delay={i * 0.01}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </>
            )}

            {/* Flat display (filtered by category or search) */}
            {!isLoading && !groupedSymbols && filteredSymbols.length > 0 && (
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                {filteredSymbols.map((sym, i) => (
                  <SymbolCard3D
                    key={sym.id}
                    symbol={sym}
                    isAr={isAr}
                    isSelected={selectedSymbol?.id === sym.id}
                    onSelect={handleSelect}
                    onDragStart={handleDragStart}
                    theme={theme}
                    delay={i * 0.01}
                  />
                ))}
              </div>
            )}

            {/* Load more */}
            {hasMore && !search.trim() && (
              <div className="text-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-1.5 rounded-full"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  {isAr
                    ? `تحميل المزيد (${total - rawSymbols.length} متبقي)`
                    : `Load more (${total - rawSymbols.length} remaining)`}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Selected symbol bar ────────────────────────────── */}
        <AnimatePresence>
          {selectedSymbol && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="shrink-0 border-t px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"
            >
              <div className="flex items-center gap-3">
                <motion.span
                  className="text-3xl"
                  animate={
                    justSelected
                      ? { scale: [1, 1.5, 1], rotate: [0, 10, -10, 0] }
                      : {}
                  }
                  transition={{ duration: 0.4 }}
                >
                  {selectedSymbol.char}
                </motion.span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {isAr ? selectedSymbol.nameAr : selectedSymbol.nameEn}
                  </p>
                  {selectedSymbol.isPremium && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-600">
                      <Crown className="h-3 w-3" />
                      {selectedSymbol.price > 0
                        ? `${selectedSymbol.price} ${isAr ? "نقطة" : "pts"}`
                        : isAr
                          ? "مميز"
                          : "Premium"}
                    </div>
                  )}
                </div>
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <Button
                  onClick={handleInsert}
                  className="gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
                  size="sm"
                >
                  <Sparkles className="h-4 w-4" />
                  {isAr ? "إدراج الرمز" : "Insert Symbol"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ─── category pill ────────────────────────────────────────────────────
function CategoryPill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {icon} {label}
    </motion.button>
  );
}

// ─── 3D animated symbol card ──────────────────────────────────────────
function SymbolCard3D({
  symbol,
  isAr,
  isSelected,
  onSelect,
  onDragStart,
  theme,
  delay = 0,
}: {
  symbol: SymbolItem;
  isAr: boolean;
  isSelected: boolean;
  onSelect: (s: SymbolItem) => void;
  onDragStart: (e: React.DragEvent, s: SymbolItem) => void;
  theme: { glow: string; accent: string };
  delay?: number;
}) {
  return (
    <motion.button
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, symbol)}
      onClick={() => onSelect(symbol)}
      initial={{ opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: Math.min(delay, 0.5), duration: 0.25, type: "spring", stiffness: 300, damping: 20 }}
      whileHover={{
        scale: 1.2,
        rotateY: 8,
        rotateX: -5,
        boxShadow: `0 8px 24px ${theme.glow}`,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.9 }}
      className={`
        group relative aspect-square flex items-center justify-center rounded-xl text-xl
        cursor-pointer select-none transition-colors
        ${
          isSelected
            ? "ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-950/30 shadow-lg"
            : "hover:bg-accent/60"
        }
      `}
      style={{
        perspective: "800px",
        transformStyle: "preserve-3d",
      }}
      title={isAr ? symbol.nameAr : symbol.nameEn}
    >
      <span className="relative z-10 pointer-events-none text-lg sm:text-xl">
        {symbol.char}
      </span>

      {/* Premium crown */}
      {symbol.isPremium && (
        <Crown className="absolute -top-0.5 -right-0.5 h-3 w-3 text-amber-500 z-20" />
      )}

      {/* Hover glow ring */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          boxShadow: `inset 0 0 12px ${theme.glow}, 0 0 8px ${theme.glow}`,
        }}
      />

      {/* Selection bounce indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400"
        />
      )}
    </motion.button>
  );
}

// ─── global styles (hide scrollbar for category tabs) ─────────────────
const styleEl =
  typeof document !== "undefined" &&
  (() => {
    const existing = document.getElementById("symbol-lib-styles");
    if (existing) return existing;
    const el = document.createElement("style");
    el.id = "symbol-lib-styles";
    el.textContent = `.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`;
    document.head.appendChild(el);
    return el;
  })();

export default SymbolLibrary3D;
