import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Package, XCircle } from "lucide-react";

type ReviewStatus = "pending_review" | "approved" | "rejected";

interface MerchantProductReviewItem {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  price: string;
  stock: number;
  moderationStatus: ReviewStatus;
  moderationReason?: string | null;
  displayCountries?: string | null;
  displayCurrencies?: string | null;
  createdAt: string;
}

interface ProductRejectionTemplate {
  id: string;
  text: string;
  usageCount: number;
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending_review: "بانتظار المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

interface MerchantProductsReviewTabProps {
  token: string;
}

export function MerchantProductsReviewTab({ token }: MerchantProductsReviewTabProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<ReviewStatus>("pending_review");
  const [newTemplateText, setNewTemplateText] = useState("");
  const [rejectionReasonDraft, setRejectionReasonDraft] = useState<Record<string, string>>({});
  const [selectedTemplateByProduct, setSelectedTemplateByProduct] = useState<Record<string, string>>({});

  const { data: merchantProducts, isLoading } = useQuery({
    queryKey: ["admin-merchant-products-review", status],
    queryFn: async () => {
      const res = await fetch(`/api/admin/merchant-products/review?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch merchant review queue");
      const data = await res.json();
      return (data.data || []) as MerchantProductReviewItem[];
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

  const reviewMerchantProductMutation = useMutation({
    mutationFn: async ({
      productId,
      decision,
      reason,
      templateId,
    }: {
      productId: string;
      decision: "approve" | "reject";
      reason?: string;
      templateId?: string;
    }) => {
      const res = await fetch(`/api/admin/merchant-products/${productId}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision, reason, templateId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to review product");
      return body;
    },
    onSuccess: () => {
      toast({ title: "تم تحديث حالة المنتج" });
      queryClient.invalidateQueries({ queryKey: ["admin-merchant-products-review"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product-rejection-templates"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل تحديث حالة المنتج", variant: "destructive" });
    },
  });

  const getCountries = (product: MerchantProductReviewItem) => {
    return String(product.displayCountries || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
  };

  const getCurrencies = (product: MerchantProductReviewItem) => {
    return String(product.displayCurrencies || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            مراجعة منتجات التجار الخارجيين
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {(["pending_review", "approved", "rejected"] as ReviewStatus[]).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={status === value ? "default" : "outline"}
                onClick={() => setStatus(value)}
              >
                {STATUS_LABELS[value]}
              </Button>
            ))}
            <Badge variant="secondary">{(merchantProducts || []).length} منتج</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">جاري تحميل المنتجات...</p>
        ) : (merchantProducts || []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد منتجات في هذا التصنيف</p>
        ) : (
          <div className="space-y-2 max-h-[32rem] overflow-y-auto">
            {(merchantProducts || []).map((product) => {
              const countries = getCountries(product);
              const currencies = getCurrencies(product);
              const canReview = product.moderationStatus === "pending_review";
              const selectedTemplate = selectedTemplateByProduct[product.id] || "";

              return (
                <div key={product.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        السعر: {product.price} • المخزون: {product.stock} • التاجر: {product.parentId || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(product.createdAt).toLocaleString("ar")}</p>
                    </div>
                    <Badge variant={product.moderationStatus === "approved" ? "default" : "secondary"}>
                      {STATUS_LABELS[product.moderationStatus]}
                    </Badge>
                  </div>

                  {(countries || currencies) && (
                    <p className="text-xs text-muted-foreground">
                      {countries ? `الدول: ${countries}` : ""}
                      {countries && currencies ? " • " : ""}
                      {currencies ? `العملات: ${currencies}` : ""}
                    </p>
                  )}

                  {product.moderationStatus === "rejected" && product.moderationReason && (
                    <p className="text-xs text-red-600">سبب الرفض: {product.moderationReason}</p>
                  )}

                  {canReview && (
                    <div className="grid gap-2 md:grid-cols-3">
                      <select
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                        value={selectedTemplate}
                        onChange={(e) => {
                          const selected = String(e.target.value || "");
                          setSelectedTemplateByProduct((prev) => ({ ...prev, [product.id]: selected }));
                          const template = (productRejectionTemplates || []).find((tpl) => tpl.id === selected);
                          if (!template) return;
                          setRejectionReasonDraft((prev) => ({ ...prev, [product.id]: template.text }));
                        }}
                      >
                        <option value="">اختيار قالب رفض (اختياري)</option>
                        {(productRejectionTemplates || []).map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.text}
                          </option>
                        ))}
                      </select>

                      <Input
                        placeholder="سبب الرفض"
                        value={rejectionReasonDraft[product.id] || ""}
                        onChange={(e) => setRejectionReasonDraft((prev) => ({ ...prev, [product.id]: e.target.value }))}
                      />

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => reviewMerchantProductMutation.mutate({ productId: product.id, decision: "approve" })}
                          disabled={reviewMerchantProductMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 ml-1" /> موافقة
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            reviewMerchantProductMutation.mutate({
                              productId: product.id,
                              decision: "reject",
                              reason: rejectionReasonDraft[product.id] || "",
                              templateId: selectedTemplateByProduct[product.id] || "",
                            })
                          }
                          disabled={reviewMerchantProductMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 ml-1" /> رفض
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
