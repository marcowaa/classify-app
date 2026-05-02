import React, { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Gamepad2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Save, X,
  BookOpen, ChevronDown, ChevronUp, ExternalLink, Download, Globe,
  Code, Upload, CheckCircle2, AlertTriangle, Lightbulb, FolderOpen,
  Eye, Link, FileUp, Search, Filter, CheckSquare, Square, Power,
  PowerOff, Play, RefreshCw, BarChart3, XCircle, Sparkles, Puzzle, Brain
} from "lucide-react";

interface Game {
  id: string;
  title: string;
  description: string | null;
  embedUrl: string;
  thumbnailUrl: string | null;
  category: string;
  minAge: number | null;
  maxAge: number | null;
  pointsPerPlay: number;
  maxPlaysPerDay: number;
  isActive: boolean;
  createdAt: string;
}

interface GameForm {
  title: string;
  description: string;
  embedUrl: string;
  thumbnailUrl: string;
  category: string;
  minAge: string;
  maxAge: string;
  pointsPerPlay: string;
  maxPlaysPerDay: string;
}

type AddMethod = "url" | "upload" | null;

const emptyForm: GameForm = {
  title: "",
  description: "",
  embedUrl: "",
  thumbnailUrl: "",
  category: "general",
  minAge: "",
  maxAge: "",
  pointsPerPlay: "5",
  maxPlaysPerDay: "0",
};

const CATEGORIES = [
  { value: "general", label: "admin.games.catGeneral", icon: "🎮" },
  { value: "educational", label: "admin.games.catEducational", icon: "📚" },
  { value: "math", label: "admin.games.catMath", icon: "🔢" },
  { value: "language", label: "admin.games.catLanguages", icon: "🗣️" },
  { value: "science", label: "admin.games.catScience", icon: "🔬" },
  { value: "puzzle", label: "admin.games.catPuzzles", icon: "🧩" },
  { value: "creative", label: "admin.games.catCreative", icon: "🎨" },
  { value: "sport", label: "admin.games.catSports", icon: "⚽" },
];

// Built-in games that ship with the platform
interface BuiltinGame {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  embedUrl: string;
  thumbnailEmoji: string;
  category: string;
  minAge: number;
  maxAge: number;
  pointsPerPlay: number;
  maxPlaysPerDay: number;
  gradient: string;
}

const BUILTIN_GAMES: BuiltinGame[] = [
  {
    id: "builtin-memory-match",
    title: "Memory Kingdom",
    titleAr: "مملكة الذاكرة 🧠",
    description: "100 levels across 10 worlds! 11 mechanics, 10 bosses, power-ups, shop, XP, daily streak, and cognitive report for parents!",
    descriptionAr: "100 مستوى عبر 10 عوالم! 11 نوع لعب، 10 زعماء، 5 قدرات خارقة، متجر سمات، نظام XP وسلسلة يومية، تقرير ذكاء معرفي للوالدين!",
    embedUrl: "/games/memory-match.html",
    thumbnailEmoji: "🧠",
    category: "puzzle",
    minAge: 4,
    maxAge: 14,
    pointsPerPlay: 10,
    maxPlaysPerDay: 0,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: "builtin-math-challenge",
    title: "Math Challenge",
    titleAr: "تحدي الرياضيات 🔢",
    description: "Fun educational game to improve math skills with adaptive difficulty and parent reports!",
    descriptionAr: "لعبة تعليمية ممتعة لتحسين مهارات الحساب — 10 عوالم، نظام ذكاء تكيّفي، وتقرير أداء للوالدين!",
    embedUrl: "/games/math-challenge.html",
    thumbnailEmoji: "🔢",
    category: "math",
    minAge: 5,
    maxAge: 14,
    pointsPerPlay: 10,
    maxPlaysPerDay: 5,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    id: "builtin-gem-kingdom",
    title: "Gem Kingdom",
    titleAr: "مملكة الجواهر 💎",
    description: "100 levels across 10 magical worlds! 13 obstacle types, 20 monsters, 40 achievements, adaptive AI, educational stories, and parent reports!",
    descriptionAr: "100 مستوى عبر 10 عوالم سحرية! 13 نوع عائق، 20 وحش، 40 إنجاز، ذكاء تكيفي، قصص تعليمية، تقارير أداء للوالدين!",
    embedUrl: "/games/gem-kingdom.html",
    thumbnailEmoji: "💎",
    category: "puzzle",
    minAge: 5,
    maxAge: 14,
    pointsPerPlay: 10,
    maxPlaysPerDay: 0,
    gradient: "from-amber-500 to-red-500",
  },
  {
    id: "builtin-snake-3d",
    title: "Fruit Adventure",
    titleAr: "مغامرة الفواكه 🐍",
    description: "3D snake game! 9 levels, 5 snake shapes, 8 power-ups, weather system, smart camera, mini-map, and stunning visual effects!",
    descriptionAr: "لعبة ثعبان ثلاثية الأبعاد! 9 مستويات، 5 أشكال للثعبان، 8 قدرات خارقة، نظام طقس، كاميرا ذكية، خريطة مصغرة، وتأثيرات بصرية مذهلة!",
    embedUrl: "/games/snake-3d.html",
    thumbnailEmoji: "🐍",
    category: "puzzle",
    minAge: 5,
    maxAge: 14,
    pointsPerPlay: 10,
    maxPlaysPerDay: 0,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    id: "builtin-cat-kingdom",
    title: "Cat Kingdom",
    titleAr: "مملكة القطة التعليمية 🐱👑",
    description: "100 educational levels across 10 worlds! Colors, shapes, numbers, addition, subtraction, Arabic & English letters, words, patterns, mixed challenges! Cat pet system, skin store, bosses, achievement badges!",
    descriptionAr: "100 مستوى تعليمي عبر 10 عوالم! ألوان، أشكال، أرقام، جمع، طرح، حروف عربية وإنجليزية، كلمات، أنماط، تحديات مختلطة! نظام قطة أليفة، متجر أشكال، زعماء، شارات إنجاز!",
    embedUrl: "/games/cat-kingdom.html",
    thumbnailEmoji: "🐱",
    category: "educational",
    minAge: 4,
    maxAge: 12,
    pointsPerPlay: 10,
    maxPlaysPerDay: 0,
    gradient: "from-orange-400 to-pink-500",
  },
  {
    id: "builtin-ice-kingdom",
    title: "Ice Kingdom Academy",
    titleAr: "مملكة الجليد التعليمية ❄️🌍",
    description: "100 educational levels across 10 ice worlds! Colors, animals, weather, numbers, addition, subtraction, geography, science, dinosaurs! Penguin pet, daily bonus, power-ups, skin store!",
    descriptionAr: "100 مستوى تعليمي عبر 10 عوالم جليدية! ألوان، حيوانات، طقس، أرقام، جمع، طرح، جغرافيا، علوم، ديناصورات! نظام بطريق أليف، مكافأة يومية، قدرات خارقة، متجر أشكال!",
    embedUrl: "/games/ice-kingdom.html",
    thumbnailEmoji: "❄️",
    category: "educational",
    minAge: 4,
    maxAge: 12,
    pointsPerPlay: 10,
    maxPlaysPerDay: 0,
    gradient: "from-cyan-400 to-blue-600",
  },
];

// Legacy URL mappings for backwards compatibility
const LEGACY_URL_MAP: Record<string, string[]> = {
  "/games/memory-match.html": ["/memory-match"],
};

export function GamesTab({ token }: { token: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GameForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [addMethod, setAddMethod] = useState<AddMethod>(null);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"delete" | "activate" | "deactivate" | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [urlCheckStatus, setUrlCheckStatus] = useState<"idle" | "checking" | "ok" | "failed">("idle");
  const [urlCheckedValue, setUrlCheckedValue] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const normalizeEmbedUrl = (raw: string): string => {
    const value = String(raw || "").trim();
    if (!value) return "";
    if (value.startsWith("/")) return value;
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
      return parsed.toString();
    } catch {
      return "";
    }
  };

  const validateForm = (data: GameForm): boolean => {
    const title = String(data.title || "").trim();
    if (!title || title.length < 2) return false;

    const normalizedUrl = normalizeEmbedUrl(data.embedUrl);
    if (!normalizedUrl) return false;

    const points = Number(data.pointsPerPlay);
    if (!Number.isFinite(points) || points < 0 || points > 1000) {
      return false;
    }

    const maxPlays = Number(data.maxPlaysPerDay || 0);
    if (!Number.isFinite(maxPlays) || maxPlays < 0 || maxPlays > 500) {
      return false;
    }

    const minAge = data.minAge ? Number(data.minAge) : null;
    const maxAge = data.maxAge ? Number(data.maxAge) : null;
    if (minAge !== null && (!Number.isInteger(minAge) || minAge < 0 || minAge > 18)) {
      return false;
    }
    if (maxAge !== null && (!Number.isInteger(maxAge) || maxAge < 0 || maxAge > 18)) {
      return false;
    }
    if (minAge !== null && maxAge !== null && minAge > maxAge) {
      return false;
    }

    return true;
  };

  // Queries
  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["admin-games"],
    queryFn: async () => {
      const res = await fetch("/api/admin/games", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: GameForm) => {
      const normalizedEmbedUrl = normalizeEmbedUrl(data.embedUrl);
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: data.title.trim(),
          description: data.description || null,
          embedUrl: normalizedEmbedUrl,
          thumbnailUrl: data.thumbnailUrl || null,
          category: data.category,
          minAge: data.minAge ? parseInt(data.minAge) : null,
          maxAge: data.maxAge ? parseInt(data.maxAge) : null,
          pointsPerPlay: parseInt(data.pointsPerPlay) || 5,
          maxPlaysPerDay: parseInt(data.maxPlaysPerDay) || 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to create game");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-games"] });
      resetForm();
    },
    onError: (error: any) => {
      setSubmitError(String(error?.message || "request_failed"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GameForm }) => {
      const normalizedEmbedUrl = normalizeEmbedUrl(data.embedUrl);
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: data.title.trim(),
          description: data.description || null,
          embedUrl: normalizedEmbedUrl,
          thumbnailUrl: data.thumbnailUrl || null,
          category: data.category,
          minAge: data.minAge ? parseInt(data.minAge) : null,
          maxAge: data.maxAge ? parseInt(data.maxAge) : null,
          pointsPerPlay: parseInt(data.pointsPerPlay) || 5,
          maxPlaysPerDay: parseInt(data.maxPlaysPerDay) || 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to update game");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-games"] });
      resetForm();
    },
    onError: (error: any) => {
      setSubmitError(String(error?.message || "request_failed"));
    },
  });

  const validateUrlMutation = useMutation({
    mutationFn: async (embedUrl: string) => {
      const res = await fetch("/api/admin/games/validate-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ embedUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "validate_failed");
      return json?.data || json;
    },
    onSuccess: (data: any) => {
      const reachable = !!data?.reachable;
      setUrlCheckStatus(reachable ? "ok" : "failed");
      setUrlCheckedValue(String(form.embedUrl || "").trim());
      if (data?.normalizedUrl) {
        setForm((prev) => ({ ...prev, embedUrl: String(data.normalizedUrl) }));
      }
    },
    onError: () => {
      setUrlCheckStatus("failed");
      setUrlCheckedValue(String(form.embedUrl || "").trim());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete game");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-games"] });
      setDeleteConfirmId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/games/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to toggle game");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-games"] }),
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async ({ ids, isActive }: { ids: string[]; isActive: boolean }) => {
      const res = await fetch("/api/admin/games/bulk-toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, isActive }),
      });
      if (!res.ok) throw new Error("Failed to bulk toggle");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-games"] });
      setSelectedGames(new Set());
      setBulkAction(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/admin/games/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Failed to bulk delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-games"] });
      setSelectedGames(new Set());
      setBulkAction(null);
    },
  });

  // Add built-in game to database
  const addBuiltinMutation = useMutation({
    mutationFn: async (builtin: BuiltinGame) => {
      // Check if already added (client-side guard)
      if (games?.some(g => g.embedUrl === builtin.embedUrl)) {
        throw new Error("هذه اللعبة مضافة بالفعل");
      }
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: builtin.titleAr,
          description: builtin.descriptionAr,
          embedUrl: builtin.embedUrl,
          thumbnailUrl: null,
          category: builtin.category,
          minAge: builtin.minAge,
          maxAge: builtin.maxAge,
          pointsPerPlay: builtin.pointsPerPlay,
          maxPlaysPerDay: builtin.maxPlaysPerDay,
        }),
      });
      if (res.status === 409) {
        // Already exists on server — just refresh the list
        queryClient.invalidateQueries({ queryKey: ["admin-games"] });
        return;
      }
      if (!res.ok) throw new Error("Failed to add built-in game");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-games"] });
    },
  });

  // Check which built-in games are already added (by embedUrl, including legacy URLs)
  const getBuiltinStatus = (embedUrl: string): "added" | "not-added" => {
    if (!games) return "not-added";
    const legacyUrls = LEGACY_URL_MAP[embedUrl] || [];
    const allUrls = [embedUrl, ...legacyUrls];
    return games.some(g => allUrls.includes(g.embedUrl)) ? "added" : "not-added";
  };

  // Handlers
  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    setAddMethod(null);
    setUploadProgress(null);
    setWizardStep(1);
    setUrlCheckStatus("idle");
    setUrlCheckedValue("");
    setSubmitError(null);
  };

  const startEdit = (game: Game) => {
    setForm({
      title: game.title,
      description: game.description || "",
      embedUrl: game.embedUrl,
      thumbnailUrl: game.thumbnailUrl || "",
      category: game.category || "general",
      minAge: game.minAge?.toString() || "",
      maxAge: game.maxAge?.toString() || "",
      pointsPerPlay: game.pointsPerPlay.toString(),
      maxPlaysPerDay: game.maxPlaysPerDay?.toString() || "0",
    });
    setEditingId(game.id);
    setAddMethod("url");
    setShowForm(true);
    setWizardStep(2);
    setUrlCheckStatus("idle");
    setUrlCheckedValue("");
    setSubmitError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateForm(form);
    if (!isValid) {
      setSubmitError("invalid_input");
      return;
    }

    const normalizedEmbedUrl = normalizeEmbedUrl(form.embedUrl);
    const normalizedForm: GameForm = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      embedUrl: normalizedEmbedUrl,
      thumbnailUrl: form.thumbnailUrl.trim(),
      minAge: form.minAge.trim(),
      maxAge: form.maxAge.trim(),
      pointsPerPlay: String(Number(form.pointsPerPlay || 0)),
      maxPlaysPerDay: String(Number(form.maxPlaysPerDay || 0)),
    };

    setForm(normalizedForm);
    setSubmitError(null);
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: normalizedForm });
    } else {
      createMutation.mutate(normalizedForm);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.match(/\.(html|htm)$/i)) {
      setUploadProgress("❌ " + t("admin.games.uploadInvalidFormat"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadProgress("❌ " + t("admin.games.uploadTooLarge"));
      return;
    }

    setUploadProgress("⏳ " + t("admin.games.uploadInProgress"));
    const formData = new FormData();
    formData.append("gameFile", file);

    try {
      const res = await fetch("/api/admin/games/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        const gameUrl = json.data.url;
        setForm(prev => ({ ...prev, embedUrl: gameUrl }));
        setUrlCheckStatus("idle");
        setUrlCheckedValue("");
        setUploadProgress(`✅ تم الرفع — ${json.data.originalName} (${(json.data.size / 1024).toFixed(1)}KB)`);
        // Auto-fill title from filename if empty
        if (!form.title) {
          const name = json.data.originalName.replace(/\.(html|htm)$/i, "").replace(/[-_]/g, " ");
          setForm(prev => ({ ...prev, title: name, embedUrl: gameUrl }));
        }
      } else {
        setUploadProgress(`❌ فشل الرفع: ${json.message}`);
      }
    } catch (err: any) {
      setUploadProgress(`❌ خطأ في الرفع: ${err.message}`);
    }
  }, [token, form.title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleThumbnailUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSubmitError("invalid_input");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("upload_too_large");
      return;
    }

    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-public-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "upload_failed");
      const data = json?.data || json;
      const uploadedUrl = String(data?.fullUrl || data?.url || "").trim();
      if (!uploadedUrl) throw new Error("upload_failed");

      setForm((prev) => ({ ...prev, thumbnailUrl: uploadedUrl }));
      setSubmitError(null);
      toast({ title: t("admin.games.uploadSuccess") });
    } catch (error: any) {
      setSubmitError(String(error?.message || "upload_failed"));
      toast({
        title: t("admin.games.uploadFailed", { message: String(error?.message || "upload_failed") }),
        variant: "destructive",
      });
    } finally {
      setUploadingThumbnail(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    }
  }, [token, t, toast]);

  const toggleSelectGame = (id: string) => {
    setSelectedGames(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedGames.size === filtered.length) {
      setSelectedGames(new Set());
    } else {
      setSelectedGames(new Set(filtered.map(g => g.id)));
    }
  };

  const executeBulkAction = () => {
    const ids = Array.from(selectedGames);
    if (bulkAction === "delete") {
      bulkDeleteMutation.mutate(ids);
    } else if (bulkAction === "activate") {
      bulkToggleMutation.mutate({ ids, isActive: true });
    } else if (bulkAction === "deactivate") {
      bulkToggleMutation.mutate({ ids, isActive: false });
    }
  };

  // Filtering
  const filtered = games?.filter(g => {
    const matchSearch = g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.embedUrl?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory === "all" || g.category === filterCategory;
    const matchStatus = filterStatus === "all" ||
      (filterStatus === "active" && g.isActive) ||
      (filterStatus === "inactive" && !g.isActive);
    return matchSearch && matchCategory && matchStatus;
  }) || [];

  // Stats
  const totalGames = games?.length || 0;
  const activeGames = games?.filter(g => g.isActive).length || 0;
  const inactiveGames = totalGames - activeGames;
  const localGames = games?.filter(g => g.embedUrl.startsWith("/")).length || 0;
  const externalGames = totalGames - localGames;
  const activeRatio = totalGames > 0 ? Math.round((activeGames / totalGames) * 100) : 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentGames = games?.filter((g) => new Date(g.createdAt).getTime() >= sevenDaysAgo).length || 0;
  const categoryCounts = (games || []).reduce<Record<string, number>>((acc, game) => {
    const key = game.category || "general";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "general";
  const topCategoryConfig = CATEGORIES.find((c) => c.value === topCategory) || CATEGORIES[0];
  const normalizedEmbedPreview = normalizeEmbedUrl(form.embedUrl);
  const canProceedToStep2 = !!String(form.title || "").trim() && !!normalizedEmbedPreview;
  const currentEmbedChangedAfterCheck = String(form.embedUrl || "").trim() !== urlCheckedValue;
  const canSubmitCreate = wizardStep === 2 && canProceedToStep2;

  if (isLoading) return <div className="p-4 text-gray-700 dark:text-gray-200">{t("admin.games.loading")}</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
          <Gamepad2 className="w-7 h-7" />
          إدارة الألعاب
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setUploadProgress(null);
              setAddMethod(null);
              setShowForm(true);
              setWizardStep(1);
              setUrlCheckStatus("idle");
              setUrlCheckedValue("");
              setSubmitError(null);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            إضافة لعبة
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition"
          >
            <BookOpen className="w-5 h-5" />
            الدليل
            {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ========== ADD GAME FORM ========== */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          {/* Form Header */}
          <div className="flex justify-between items-center p-5 border-b dark:border-gray-700 bg-gradient-to-l from-blue-50 to-white dark:from-gray-800 dark:to-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              {editingId ? <><Pencil className="w-5 h-5 text-blue-600" /> تعديل لعبة</> : <><Plus className="w-5 h-5 text-blue-600" /> إضافة لعبة جديدة</>}
            </h3>
            <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Method Selection (only for new games) */}
          {!editingId && !addMethod && (
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 font-medium">{t("admin.games.chooseMethod")}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setAddMethod("url")}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition group"
                >
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                    <Link className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="font-bold text-blue-700 dark:text-blue-300 text-lg">{t("admin.games.externalUrl")}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">ألصق رابط لعبة من موقع خارجي مثل itch.io أو CrazyGames أو أي رابط HTML</p>
                </button>
                <button
                  onClick={() => setAddMethod("upload")}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-green-300 dark:border-green-600 rounded-xl hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition group"
                >
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                    <FileUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="font-bold text-green-700 dark:text-green-300 text-lg">{t("admin.games.uploadHtml")}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">ارفع ملف .html من جهازك — يتم تخزينه على السيرفر والرابط يتولّد تلقائياً</p>
                </button>
              </div>
            </div>
          )}

          {/* Upload Zone (for upload method) */}
          {addMethod === "upload" && !editingId && (
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-green-600" /> رفع ملف اللعبة
                </p>
                <button onClick={() => setAddMethod(null)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> تغيير الطريقة
                </button>
              </div>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-green-300 dark:border-green-600 rounded-xl p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50/30 dark:hover:bg-green-900/10 transition"
              >
                <Upload className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("admin.games.dropHtmlHere")}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("admin.games.acceptsHtml")}</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".html,.htm" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
              {uploadProgress && (
                <div className={`mt-3 text-sm p-3 rounded-lg ${uploadProgress.startsWith("✅") ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300" : uploadProgress.startsWith("❌") ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300" : "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"}`}>
                  {uploadProgress}
                </div>
              )}
            </div>
          )}

          {/* URL input hint */}
          {addMethod === "url" && !editingId && (
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <Link className="w-4 h-4 text-blue-600" /> إضافة عبر رابط
                </p>
                <button onClick={() => setAddMethod(null)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> تغيير الطريقة
                </button>
              </div>
            </div>
          )}

          {/* Game Details Form */}
          {(addMethod || editingId) && (
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {!editingId && (
                <div className="md:col-span-2 flex items-center gap-2 text-sm">
                  <span className={`px-2 py-1 rounded-full ${wizardStep === 1 ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"}`}>1</span>
                  <span className="text-gray-600 dark:text-gray-300">{t("admin.games.gameTitle")}</span>
                  <span className="text-gray-400">→</span>
                  <span className={`px-2 py-1 rounded-full ${wizardStep === 2 ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"}`}>2</span>
                  <span className="text-gray-600 dark:text-gray-300">{t("admin.games.description")}</span>
                </div>
              )}

              {submitError && (
                <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                  {t("admin.games.uploadFailed", { message: submitError })}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t("admin.games.gameTitle")}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value });
                    setSubmitError(null);
                  }}
                  required
                  placeholder={t("admin.games.gameTitlePlaceholder")}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                  رابط التضمين (Embed URL) *
                  {form.embedUrl && normalizedEmbedPreview && (
                    <button type="button" onClick={() => setPreviewUrl(form.embedUrl)} className="mr-2 text-blue-600 hover:underline text-xs">{t("admin.games.preview")}</button>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.embedUrl}
                    onChange={(e) => {
                      setForm({ ...form, embedUrl: e.target.value });
                      setUrlCheckStatus("idle");
                      setSubmitError(null);
                    }}
                    required
                    placeholder={addMethod === "upload" ? "سيتم ملؤه تلقائياً بعد الرفع" : "https://example.com/game أو /games/file.html"}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    dir="ltr"
                    readOnly={addMethod === "upload" && !!form.embedUrl}
                  />
                  <button
                    type="button"
                    disabled={!normalizedEmbedPreview || validateUrlMutation.isPending}
                    onClick={() => {
                      if (!normalizedEmbedPreview) return;
                      setUrlCheckStatus("checking");
                      validateUrlMutation.mutate(normalizedEmbedPreview);
                    }}
                    className="px-3 py-2 rounded-lg border dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                    title={t("admin.games.confirm")}
                  >
                    {urlCheckStatus === "checking"
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <CheckCircle2 className={`w-4 h-4 ${urlCheckStatus === "ok" ? "text-green-600" : urlCheckStatus === "failed" ? "text-red-600" : "text-gray-500"}`} />}
                  </button>
                </div>
              </div>

              {!editingId && wizardStep === 1 && (
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-200 transition"
                  >
                    {t("admin.games.cancelBtn")}
                  </button>
                  <button
                    type="button"
                    disabled={!canProceedToStep2 || urlCheckStatus === "checking" || (urlCheckStatus !== "ok" && !normalizedEmbedPreview.startsWith("/")) || currentEmbedChangedAfterCheck}
                    onClick={() => setWizardStep(2)}
                    className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {t("admin.games.confirm")}
                  </button>
                </div>
              )}

              {(editingId || wizardStep === 2) && (
                <>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t("admin.games.description")}</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("admin.games.descPlaceholder")}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t("admin.games.thumbnailUrl")}</label>
                <div className="space-y-2">
                  {form.thumbnailUrl ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border dark:border-gray-600">
                      <img src={form.thumbnailUrl} alt="thumbnail-preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, thumbnailUrl: "" })}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/75"
                        title={t("admin.games.remove")}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-lg border-2 border-dashed dark:border-gray-600 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                      {t("admin.games.noImage")}
                    </div>
                  )}
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleThumbnailUpload(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={uploadingThumbnail}
                    className="w-full border rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    {uploadingThumbnail ? t("admin.games.uploading") : t("admin.games.uploadImage")}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t("admin.games.category")}</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t("admin.games.pointsPerGame")}</label>
                <input
                  type="number"
                  min="0"
                  value={form.pointsPerPlay}
                  onChange={(e) => setForm({ ...form, pointsPerPlay: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t("admin.games.maxDailyPlays")}</label>
                <input
                  type="number"
                  min="0"
                  value={form.maxPlaysPerDay}
                  onChange={(e) => setForm({ ...form, maxPlaysPerDay: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder={t("admin.games.noLimit")}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t("admin.games.minAge")}</label>
                  <input
                    type="number"
                    min="0"
                    max="18"
                    value={form.minAge}
                    onChange={(e) => setForm({ ...form, minAge: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder={t("admin.games.optional")}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t("admin.games.maxAge")}</label>
                  <input
                    type="number"
                    min="0"
                    max="18"
                    value={form.maxAge}
                    onChange={(e) => setForm({ ...form, maxAge: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder={t("admin.games.optional")}
                  />
                </div>
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end pt-2 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-200 transition"
                >
                  إلغاء
                </button>
                {!editingId && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-5 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-200 transition"
                  >
                    {t("admin.games.changeMethod")}
                  </button>
                )}
                {form.embedUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(form.embedUrl)}
                    className="flex items-center gap-2 px-5 py-2 border border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                  >
                    <Eye className="w-4 h-4" />
                    معاينة
                  </button>
                )}
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending || !form.embedUrl || (!editingId && !canSubmitCreate)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? "تحديث" : "إنشاء اللعبة"}
                </button>
              </div>
                </>
              )}
            </form>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalGames}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("admin.games.totalGames")}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{activeGames}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("admin.games.enabled")}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 text-center">
          <div className="text-3xl font-bold text-red-500 dark:text-red-400">{inactiveGames}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("admin.games.disabled")}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{localGames}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("admin.games.local")}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 text-center">
          <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{externalGames}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("admin.games.external")}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 text-center">
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{activeRatio}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("admin.games.enabled")}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 text-center">
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{recentGames}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">7D</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          <span className="text-sm">{t("admin.games.category")}</span>
        </div>
        <div className="text-sm font-semibold text-gray-800 dark:text-white">
          {topCategoryConfig.icon} {t(topCategoryConfig.label)} ({categoryCounts[topCategory] || 0})
        </div>
      </div>

      {/* ========== BUILT-IN GAMES SECTION ========== */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 border-2 border-indigo-200 dark:border-indigo-700/50 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">الألعاب المدمجة</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">ألعاب مبنية داخل التطبيق — أضفها بنقرة واحدة لتظهر للأطفال</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BUILTIN_GAMES.map((builtin) => {
            const status = getBuiltinStatus(builtin.embedUrl);
            const isAdded = status === "added";
            const existingGame = games?.find(g => g.embedUrl === builtin.embedUrl);
            return (
              <div
                key={builtin.id}
                className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                  isAdded
                    ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 hover:border-indigo-300 dark:hover:border-indigo-600"
                }`}
              >
                <div className={`h-2 bg-gradient-to-r ${builtin.gradient}`} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${builtin.gradient} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
                      {builtin.thumbnailEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-800 dark:text-white truncate">{builtin.titleAr}</h4>
                        {isAdded && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3" />
                            مضافة
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{builtin.descriptionAr}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                          {CATEGORIES.find(c => c.value === builtin.category)?.icon} {builtin.category}
                        </span>
                        <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                          ⭐ {builtin.pointsPerPlay} نقطة
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                          👶 {builtin.minAge}–{builtin.maxAge} سنة
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {isAdded ? (
                      <>
                        <button
                          onClick={() => setPreviewUrl(builtin.embedUrl)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
                        >
                          <Eye className="w-4 h-4" />
                          معاينة
                        </button>
                        {existingGame && (
                          <button
                            onClick={() => startEdit(existingGame)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                          >
                            <Pencil className="w-4 h-4" />
                            تعديل
                          </button>
                        )}
                        {existingGame && (
                          <button
                            onClick={() => toggleMutation.mutate(existingGame.id)}
                            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                              existingGame.isActive
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200"
                            }`}
                          >
                            {existingGame.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {existingGame.isActive ? "مفعّلة" : "معطّلة"}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setPreviewUrl(builtin.embedUrl)}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-500 transition"
                        >
                          <Eye className="w-4 h-4" />
                          معاينة
                        </button>
                        <button
                          onClick={() => addBuiltinMutation.mutate(builtin)}
                          disabled={addBuiltinMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-bold hover:from-indigo-700 hover:to-purple-700 transition shadow-md disabled:opacity-50"
                        >
                          {addBuiltinMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              إضافة للقائمة
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== GUIDE PANEL ========== */}
      {showGuide && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 border-2 border-amber-200 dark:border-amber-700/50 rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t("admin.games.guideTitle")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.games.guideSubtitle")}</p>
              </div>
            </div>
            <button onClick={() => setShowGuide(false)} className="p-2 hover:bg-amber-200/50 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="bg-white dark:bg-gray-700/50 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-lg flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Gamepad2 className="w-5 h-5" /> كيف يعمل نظام الألعاب؟
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <p>الألعاب تعمل عبر <strong>iframe</strong> — أي صفحة HTML يمكن تحميلها داخل إطار في صفحة الطفل.</p>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 font-mono text-xs" dir="ltr">
                الأدمن يضيف اللعبة ← الولي يتحكم بالوصول ← الطفل يلعب ← يحصل نقاط
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-700/50 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-lg flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Code className="w-5 h-5" /> طرق إضافة الألعاب
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border dark:border-gray-600 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10">
                <div className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2 mb-2">
                  <Link className="w-4 h-4" /> رابط خارجي (URL)
                </div>
                <ul className="text-xs space-y-1">
                  <li>• ألصق رابط اللعبة من أي موقع يدعم iframe</li>
                  <li>• مثل: itch.io, CrazyGames, HTML5Games</li>
                  <li>• لا يستهلك مساحة السيرفر</li>
                  <li>• يعتمد على توفر الموقع الخارجي</li>
                </ul>
              </div>
              <div className="border dark:border-gray-600 rounded-lg p-4 bg-green-50/50 dark:bg-green-900/10">
                <div className="font-bold text-green-700 dark:text-green-300 flex items-center gap-2 mb-2">
                  <FileUp className="w-4 h-4" /> رفع ملف HTML
                </div>
                <ul className="text-xs space-y-1">
                  <li>• ارفع ملف .html مباشرة من جهازك</li>
                  <li>• الرابط يتولّد تلقائياً</li>
                  <li>• أسرع وأكثر موثوقية</li>
                  <li>• حد أقصى: 10MB لكل ملف</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-700/50 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
              <Download className="w-5 h-5" /> مصادر ألعاب مجانية
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300 grid grid-cols-1 md:grid-cols-3 gap-3">
              <a href="https://itch.io/games/html5/free" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-3 hover:border-green-400 transition group">
                <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline flex items-center justify-between">
                  🎮 itch.io <ExternalLink className="w-3 h-3" />
                </div>
                <p className="text-xs mt-1">{t("admin.games.largestFreeLibrary")}</p>
              </a>
              <a href="https://github.com/nicknamedev/html5-games" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-3 hover:border-green-400 transition group">
                <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline flex items-center justify-between">
                  🐙 GitHub <ExternalLink className="w-3 h-3" />
                </div>
                <p className="text-xs mt-1">{t("admin.games.openSourceRepos")}</p>
              </a>
              <a href="https://www.crazygames.com/t/html5" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-3 hover:border-green-400 transition group">
                <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline flex items-center justify-between">
                  🤪 CrazyGames <ExternalLink className="w-3 h-3" />
                </div>
                <p className="text-xs mt-1">{t("admin.games.freeEmbeddableGames")}</p>
              </a>
              <a href="https://html5games.com" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-3 hover:border-green-400 transition group">
                <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline flex items-center justify-between">
                  🌐 HTML5Games <ExternalLink className="w-3 h-3" />
                </div>
                <p className="text-xs mt-1">{t("admin.games.largeCategorizedLibrary")}</p>
              </a>
              <a href="https://gdevelop.io/game-example" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-3 hover:border-green-400 transition group">
                <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline flex items-center justify-between">
                  🔧 GDevelop <ExternalLink className="w-3 h-3" />
                </div>
                <p className="text-xs mt-1">{t("admin.games.makeGamesNoCoding")}</p>
              </a>
              <a href="https://www.codepen.io/search/pens?q=html5+game" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-3 hover:border-green-400 transition group">
                <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline flex items-center justify-between">
                  ✏️ CodePen <ExternalLink className="w-3 h-3" />
                </div>
                <p className="text-xs mt-1">{t("admin.games.smallHtmlGames")}</p>
              </a>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
            <h4 className="font-bold flex items-center gap-2 text-red-700 dark:text-red-300 mb-2">
              <AlertTriangle className="w-5 h-5" /> تنبيهات مهمة
            </h4>
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <p>⚠️ تأكد أن اللعبة الخارجية تسمح بالتضمين (iframe)</p>
              <p>⚠️ اختبر اللعبة على الموبايل — أغلب الأطفال يستخدمون الجوال</p>
              <p>⚠️ تحقق أن اللعبة آمنة وخالية من إعلانات غير مناسبة</p>
              <p>⚠️ النقاط تُمنح عند ضغط الطفل "أنهيت اللعبة"</p>
            </div>
          </div>
        </div>
      )}

      {/* ========== FILTERS & SEARCH ========== */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("admin.games.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
        >
          <option value="all">{t("admin.games.allCategories")}</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
        >
          <option value="all">{t("admin.games.allStatuses")}</option>
          <option value="active">{t("admin.games.enabledOnly")}</option>
          <option value="inactive">{t("admin.games.disabledOnly")}</option>
        </select>
      </div>

      {/* ========== BULK ACTIONS BAR ========== */}
      {selectedGames.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            تم تحديد {selectedGames.size} لعبة
          </span>
          <div className="flex gap-2 mr-auto">
            <button
              onClick={() => setBulkAction("activate")}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
            >
              <Power className="w-4 h-4" />
              تفعيل الكل
            </button>
            <button
              onClick={() => setBulkAction("deactivate")}
              className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 transition"
            >
              <PowerOff className="w-4 h-4" />
              تعطيل الكل
            </button>
            <button
              onClick={() => setBulkAction("delete")}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
            >
              <Trash2 className="w-4 h-4" />
              حذف الكل
            </button>
            <button
              onClick={() => setSelectedGames(new Set())}
              className="flex items-center gap-1 px-3 py-1.5 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-200"
            >
              <X className="w-4 h-4" />
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* ========== GAMES TABLE ========== */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto border dark:border-gray-700">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
              <th className="px-3 py-3 text-center w-10">
                <button onClick={toggleSelectAll} className="text-gray-500 hover:text-blue-600 transition">
                  {selectedGames.size === filtered.length && filtered.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">{t("admin.games.colGame")}</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">{t("admin.games.category")}</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">{t("admin.games.colSource")}</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">{t("admin.games.colPoints")}</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">{t("admin.games.colDailyLimit")}</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">{t("admin.games.colAge")}</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">{t("admin.games.colStatus")}</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">{t("admin.games.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((game) => (
              <tr key={game.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedGames.has(game.id) ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}>
                <td className="px-3 py-3 text-center">
                  <button onClick={() => toggleSelectGame(game.id)} className="text-gray-500 hover:text-blue-600 transition">
                    {selectedGames.has(game.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {game.thumbnailUrl ? (
                      <img src={game.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                        <Gamepad2 className="w-6 h-6 text-purple-500 dark:text-purple-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 dark:text-white truncate">{game.title}</div>
                      {game.description && <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{game.description}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs whitespace-nowrap">
                    {CATEGORIES.find(c => c.value === game.category)?.icon} {CATEGORIES.find(c => c.value === game.category)?.label || game.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {game.embedUrl.startsWith("/") ? (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs whitespace-nowrap">📦 محلية</span>
                  ) : (
                    <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full text-xs whitespace-nowrap">🌐 خارجية</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-yellow-600 dark:text-yellow-400">+{game.pointsPerPlay}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{game.maxPlaysPerDay > 0 ? game.maxPlaysPerDay : "∞"}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {game.minAge || game.maxAge
                    ? `${game.minAge || "—"} - ${game.maxAge || "—"}`
                    : "الكل"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleMutation.mutate(game.id)}
                    disabled={toggleMutation.isPending}
                    className="flex items-center gap-1 disabled:opacity-50"
                    title={game.isActive ? t("admin.games.disable") : t("admin.games.enable")}
                  >
                    {game.isActive ? (
                      <ToggleRight className="w-7 h-7 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-gray-400" />
                    )}
                    <span className={`text-xs font-medium ${game.isActive ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                      {game.isActive ? t("admin.games.enabledStatus") : t("admin.games.disabledStatus")}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setPreviewUrl(game.embedUrl)}
                      className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition text-purple-600 dark:text-purple-400"
                      title="معاينة"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEdit(game)}
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition text-blue-600 dark:text-blue-400"
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(game.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition text-red-600 dark:text-red-400"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t("admin.games.noGames")}</p>
            <p className="text-xs mt-1">اضغط "إضافة لعبة" لبدء إضافة الألعاب</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="text-sm text-gray-500 dark:text-gray-400 flex gap-4 flex-wrap">
        <span>إجمالي: {totalGames}</span>
        <span>مفعّل: {activeGames}</span>
        <span>معطّل: {inactiveGames}</span>
        <span>محلية: {localGames}</span>
        <span>خارجية: {externalGames}</span>
        {filtered.length !== totalGames && <span className="text-blue-600 dark:text-blue-400">نتائج الفلتر: {filtered.length}</span>}
      </div>

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t("admin.games.confirmDelete")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  هل أنت متأكد من حذف لعبة "{games?.find(g => g.id === deleteConfirmId)?.title}"؟
                </p>
              </div>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mb-4 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
              ⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف اللعبة وجميع بياناتها نهائياً.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Trash2 className="w-4 h-4" /> حذف نهائي</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== BULK ACTION CONFIRMATION MODAL ========== */}
      {bulkAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setBulkAction(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bulkAction === "delete" ? "bg-red-100 dark:bg-red-900/30" : bulkAction === "activate" ? "bg-green-100 dark:bg-green-900/30" : "bg-yellow-100 dark:bg-yellow-900/30"}`}>
                {bulkAction === "delete" ? <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" /> :
                 bulkAction === "activate" ? <Power className="w-6 h-6 text-green-600 dark:text-green-400" /> :
                 <PowerOff className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  {bulkAction === "delete" ? "حذف جماعي" : bulkAction === "activate" ? "تفعيل جماعي" : "تعطيل جماعي"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  سيتم {bulkAction === "delete" ? "حذف" : bulkAction === "activate" ? t("admin.games.enable") : t("admin.games.disable")} {selectedGames.size} لعبة
                </p>
              </div>
            </div>
            {bulkAction === "delete" && (
              <p className="text-xs text-red-600 dark:text-red-400 mb-4 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع الألعاب المحددة نهائياً.
              </p>
            )}
            <div className="max-h-32 overflow-y-auto mb-4 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg space-y-1">
              {Array.from(selectedGames).map(id => {
                const game = games?.find(g => g.id === id);
                return game && <div key={id}>• {game.title}</div>;
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkAction(null)}
                className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition"
              >
                إلغاء
              </button>
              <button
                onClick={executeBulkAction}
                disabled={bulkDeleteMutation.isPending || bulkToggleMutation.isPending}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${bulkAction === "delete" ? "bg-red-600 hover:bg-red-700" : bulkAction === "activate" ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}`}
              >
                {(bulkDeleteMutation.isPending || bulkToggleMutation.isPending) ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>{t("admin.games.confirm")}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== PREVIEW MODAL ========== */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex flex-col z-50" onClick={() => setPreviewUrl(null)}>
          <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-800 dark:text-white">{t("admin.games.previewGame")}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono" dir="ltr">{previewUrl}</span>
              </div>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
          </div>
          <div className="flex-1 bg-black relative min-h-0" onClick={(e) => e.stopPropagation()}>
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                allowFullScreen
                title="معاينة اللعبة"
              />
          </div>
        </div>
      )}
    </div>
  );
}
