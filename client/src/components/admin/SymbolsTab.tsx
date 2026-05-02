import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Smile, Search, Database, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface SymbolCategory {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface LibrarySymbol {
  id: string;
  categoryId: string;
  char: string;
  nameAr: string;
  nameEn: string;
  tags: string[];
  imageUrl: string | null;
  price: number;
  isPremium: boolean;
  sortOrder: number;
  isActive: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  "numbers-letters": "🔢",
  "emotions-faces": "😀",
  "animals": "🐱",
  "nature-elements": "🌿",
  "shapes-colors": "🔵",
  "educational-tools": "📚",
  "activities-hobbies": "⚽",
  "rewards-achievements": "🏆",
  "project-specific": "✨",
};

const PAGE_SIZE = 100;

export function SymbolsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<LibrarySymbol | null>(null);
  const [formData, setFormData] = useState({
    char: "",
    nameAr: "",
    nameEn: "",
    tags: "",
    categoryId: "",
    sortOrder: 0,
    isActive: true,
    isPremium: false,
  });

  // Fetch categories
  const { data: categoriesData, isLoading: catsLoading } = useQuery({
    queryKey: ["admin-symbol-categories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/symbol-categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });
  const categories: SymbolCategory[] = Array.isArray(categoriesData) ? categoriesData : [];

  // Fetch symbols
  const { data: symbolsResponse, isLoading: symsLoading } = useQuery({
    queryKey: ["admin-library-symbols", selectedCategory],
    queryFn: async () => {
      const catParam = selectedCategory !== "all" ? `?category=${selectedCategory}` : "";
      const res = await fetch(`/api/admin/library-symbols${catParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { symbols: [], total: 0 };
      const json = await res.json();
      return json?.data || { symbols: [], total: 0 };
    },
    enabled: !!token,
  });
  const allSymbols: LibrarySymbol[] = Array.isArray(symbolsResponse?.symbols) ? symbolsResponse.symbols : [];
  const totalCount = symbolsResponse?.total || 0;

  // Client-side search filtering
  const filteredSymbols = useMemo(() => {
    if (!searchQuery.trim()) return allSymbols;
    const q = searchQuery.toLowerCase();
    return allSymbols.filter(
      (s) =>
        s.char.includes(q) ||
        s.nameAr.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.tags?.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [allSymbols, searchQuery]);

  // Pagination on filtered symbols
  const totalPages = Math.ceil(filteredSymbols.length / PAGE_SIZE);
  const paginatedSymbols = filteredSymbols.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (selectedCategory === "all") {
      for (const s of allSymbols) {
        counts[s.categoryId] = (counts[s.categoryId] || 0) + 1;
      }
    }
    return counts;
  }, [allSymbols, selectedCategory]);

  // Seed mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/seed-symbols", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to seed symbols");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-library-symbols"] });
      queryClient.invalidateQueries({ queryKey: ["admin-symbol-categories"] });
      const seeded = data?.data?.seeded || 0;
      alert(`تم تهيئة ${seeded} رمز بنجاح!`);
    },
    onError: () => {
      alert("فشل في تهيئة الرموز");
    },
  });

  // Save symbol mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingSymbol
        ? `/api/admin/library-symbols/${editingSymbol.id}`
        : "/api/admin/library-symbols";
      const method = editingSymbol ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save symbol");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-library-symbols"] });
      closeModal();
    },
  });

  // Delete symbol mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/library-symbols/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete symbol");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-library-symbols"] });
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSymbol(null);
    setFormData({ char: "", nameAr: "", nameEn: "", tags: "", categoryId: categories[0]?.id || "", sortOrder: 0, isActive: true, isPremium: false });
  };

  const handleAdd = () => {
    setEditingSymbol(null);
    setFormData({ char: "", nameAr: "", nameEn: "", tags: "", categoryId: selectedCategory !== "all" ? selectedCategory : (categories[0]?.id || ""), sortOrder: 0, isActive: true, isPremium: false });
    setIsModalOpen(true);
  };

  const handleEdit = (symbol: LibrarySymbol) => {
    setEditingSymbol(symbol);
    setFormData({
      char: symbol.char,
      nameAr: symbol.nameAr,
      nameEn: symbol.nameEn,
      tags: Array.isArray(symbol.tags) ? symbol.tags.join(", ") : "",
      categoryId: symbol.categoryId,
      sortOrder: symbol.sortOrder,
      isActive: symbol.isActive,
      isPremium: symbol.isPremium,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.char) { alert("الرجاء إدخال الرمز"); return; }
    if (!formData.nameAr) { alert("الرجاء إدخال الاسم بالعربية"); return; }
    if (!formData.categoryId) { alert("الرجاء اختيار الفئة"); return; }
    saveMutation.mutate({
      ...formData,
      tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا الرمز؟")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSeed = () => {
    if (confirm("سيتم إضافة أكثر من 1000 رمز إلى المكتبة. هل تريد المتابعة؟")) {
      seedMutation.mutate();
    }
  };

  const isLoading = catsLoading || symsLoading;

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {/* Header with seed button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">مكتبة الرموز</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount > 0 ? `${totalCount} رمز في المكتبة` : "المكتبة فارغة"}
            {categories.length > 0 && ` • ${categories.length} فئات`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSeed} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> جاري التهيئة...</>
            ) : (
              <><Database className="w-4 h-4 mr-2" /> تهيئة جميع الرموز (1100+)</>
            )}
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            إضافة رمز
          </Button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => { setSelectedCategory("all"); setPage(1); }}
        >
          الكل
          {totalCount > 0 && <Badge variant="secondary" className="mr-2 text-xs">{totalCount}</Badge>}
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? "default" : "outline"}
            size="sm"
            onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
            className={!cat.isActive ? "opacity-50" : ""}
          >
            <span className="mr-1">{cat.icon || CATEGORY_ICONS[cat.slug] || "📁"}</span>
            {cat.nameAr}
            {categoryCounts[cat.id] > 0 && (
              <Badge variant="secondary" className="mr-2 text-xs">{categoryCounts[cat.id]}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="بحث في الرموز... (اسم، رمز، أو علامة)"
          className="pr-10"
        />
      </div>

      {/* Symbol grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {paginatedSymbols.map((symbol: LibrarySymbol) => (
          <Card
            key={symbol.id}
            className={`group relative hover:shadow-md transition-shadow ${!symbol.isActive ? "opacity-40" : ""}`}
          >
            <CardContent className="p-2 text-center">
              <div className="text-3xl mb-1 leading-none">{symbol.char}</div>
              <p className="text-[10px] font-medium truncate" title={symbol.nameAr}>
                {symbol.nameAr}
              </p>
              <p className="text-[9px] text-muted-foreground truncate" title={symbol.nameEn}>
                {symbol.nameEn}
              </p>
              <div className="flex justify-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEdit(symbol)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(symbol.id)}>
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredSymbols.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Smile className="w-16 h-16 mx-auto mb-4 opacity-50" />
          {totalCount === 0 ? (
            <div>
              <p className="text-lg mb-2">المكتبة فارغة</p>
              <p className="mb-4">اضغط على "تهيئة جميع الرموز" لإضافة أكثر من 1000 رمز تلقائياً</p>
              <Button onClick={handleSeed} disabled={seedMutation.isPending}>
                <Database className="w-4 h-4 mr-2" />
                تهيئة جميع الرموز (1100+)
              </Button>
            </div>
          ) : searchQuery ? (
            <p>لا توجد نتائج لـ "{searchQuery}"</p>
          ) : (
            <p>لا توجد رموز في هذه الفئة</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages} ({filteredSymbols.length} رمز)
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Add/Edit modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSymbol ? "تعديل الرمز" : "إضافة رمز جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الرمز (إيموجي أو حرف)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={formData.char}
                  onChange={(e) => setFormData({ ...formData, char: e.target.value })}
                  placeholder="🌟"
                  className="text-2xl text-center w-20"
                  maxLength={4}
                />
                {formData.char && <span className="text-4xl">{formData.char}</span>}
              </div>
            </div>
            <div>
              <Label>الاسم بالعربية</Label>
              <Input
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="نجمة"
              />
            </div>
            <div>
              <Label>الاسم بالإنجليزية</Label>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="Star"
              />
            </div>
            <div>
              <Label>الفئة</Label>
              <select
                className="w-full border rounded-md p-2 bg-background"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">اختر الفئة</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon || ""} {cat.nameAr} ({cat.nameEn})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>العلامات (مفصولة بفاصلة)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="star, reward, shine"
              />
            </div>
            <div>
              <Label>الترتيب</Label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>نشط</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isPremium}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPremium: checked })}
                />
                <Label>مميز</Label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeModal}>إلغاء</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
