import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Sparkles, Crown } from "lucide-react";

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
  imageUrl?: string | null;
  price: number;
  isPremium: boolean;
};

type SymbolPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (symbol: { char: string; nameAr: string; nameEn: string }) => void;
  insertTarget?: string; // "question" | "title" | "answer-{idx}" for context
};

export function SymbolPicker({ open, onOpenChange, onSelect, insertTarget }: SymbolPickerProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [recentSymbols, setRecentSymbols] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("recentSymbols") || "[]");
    } catch { return []; }
  });
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto-focus search when opened
  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["symbol-categories"],
    queryFn: async () => {
      const res = await fetch("/api/symbols/categories");
      const json = await res.json();
      return json.data as SymbolCategory[];
    },
    enabled: open,
    staleTime: 10 * 60 * 1000, // 10m cache
  });

  // Fetch symbols
  const { data: symbolsData, isLoading } = useQuery({
    queryKey: ["symbols", activeCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory !== "all") params.set("category", activeCategory);
      if (search.trim()) params.set("q", search.trim());
      params.set("limit", "200");
      const res = await fetch(`/api/symbols?${params}`);
      const json = await res.json();
      return json.data as { symbols: SymbolItem[]; total: number; hasMore: boolean };
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesData || [];
  const symbolsList = symbolsData?.symbols || [];

  // Group symbols by category for display when "all" is active and no search
  const groupedSymbols = useMemo(() => {
    if (activeCategory !== "all" || search.trim()) return null;
    const groups: Record<string, SymbolItem[]> = {};
    for (const s of symbolsList) {
      if (!groups[s.categoryId]) groups[s.categoryId] = [];
      groups[s.categoryId].push(s);
    }
    return groups;
  }, [symbolsList, activeCategory, search]);

  const handleSelect = useCallback((symbol: SymbolItem) => {
    onSelect({ char: symbol.char, nameAr: symbol.nameAr, nameEn: symbol.nameEn });
    // Update recents
    setRecentSymbols(prev => {
      const updated = [symbol.char, ...prev.filter(c => c !== symbol.char)].slice(0, 20);
      localStorage.setItem("recentSymbols", JSON.stringify(updated));
      return updated;
    });
  }, [onSelect]);

  const getCategoryName = (cat: SymbolCategory) => isAr ? cat.nameAr : cat.nameEn;
  const getCatById = (id: string) => categories.find(c => c.id === id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {isAr ? "مكتبة الرموز" : "Symbol Library"}
          </DialogTitle>
        </DialogHeader>

        {/* Search bar */}
        <div className="px-4 py-2 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isAr ? "بحث عن رمز... (مثال: قلب، نجمة، 😀)" : "Search symbols... (e.g. heart, star, 😀)"}
              className="pl-9 pr-8 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-2 py-2 border-b shrink-0 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {isAr ? "🌐 الكل" : "🌐 All"}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat.icon} {getCategoryName(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Symbols grid */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3">
            {/* Recent symbols */}
            {!search.trim() && activeCategory === "all" && recentSymbols.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {isAr ? "🕐 الأخيرة" : "🕐 Recent"}
                </p>
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                  {recentSymbols.map((char, i) => (
                    <button
                      key={`recent-${i}`}
                      onClick={() => {
                        // Find the full symbol data or just use the char
                        const found = symbolsList.find(s => s.char === char);
                        if (found) handleSelect(found);
                        else onSelect({ char, nameAr: "", nameEn: "" });
                      }}
                      className="aspect-square flex items-center justify-center rounded-lg text-xl hover:bg-accent hover:scale-110 transition-all cursor-pointer"
                      title={char}
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {isAr ? "جاري التحميل..." : "Loading..."}
              </div>
            )}

            {!isLoading && symbolsList.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm">{isAr ? "لا توجد نتائج" : "No results found"}</p>
              </div>
            )}

            {/* Grouped display (when showing all with no search) */}
            {!isLoading && groupedSymbols && (
              <>
                {categories.map(cat => {
                  const catSymbols = groupedSymbols[cat.id];
                  if (!catSymbols || catSymbols.length === 0) return null;
                  return (
                    <div key={cat.id} className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1 z-10">
                        {cat.icon} {getCategoryName(cat)}
                      </p>
                      <SymbolGrid symbols={catSymbols} onSelect={handleSelect} isAr={isAr} />
                    </div>
                  );
                })}
              </>
            )}

            {/* Flat display (when filtering by category or searching) */}
            {!isLoading && !groupedSymbols && symbolsList.length > 0 && (
              <SymbolGrid symbols={symbolsList} onSelect={handleSelect} isAr={isAr} />
            )}

            {/* Show hasMore indicator */}
            {symbolsData?.hasMore && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                {isAr ? "استخدم البحث لرؤية المزيد..." : "Use search to see more..."}
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SymbolGrid({ symbols, onSelect, isAr }: { 
  symbols: SymbolItem[]; 
  onSelect: (s: SymbolItem) => void; 
  isAr: boolean;
}) {
  return (
    <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
      {symbols.map(s => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          className="group relative aspect-square flex items-center justify-center rounded-lg text-xl hover:bg-accent hover:scale-110 transition-all cursor-pointer"
          title={isAr ? s.nameAr : s.nameEn}
        >
          {s.char}
          {s.isPremium && (
            <Crown className="absolute -top-0.5 -right-0.5 h-3 w-3 text-amber-500" />
          )}
        </button>
      ))}
    </div>
  );
}

export default SymbolPicker;
