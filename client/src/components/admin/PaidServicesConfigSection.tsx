import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type PaidServiceMode = "disabled" | "trial" | "active";
type PaidServiceAudienceRole = "parent" | "child" | "teacher" | "school" | "admin";

type PaidServiceAudiencePolicy = {
  enabled: boolean;
  visibleToUser: boolean;
};

type PaidServiceField = {
  key: string;
  label: string;
  type: "text" | "secret";
  placeholder?: string;
};

type PaidServiceConfigEntry = {
  id: string;
  label: string;
  description: string;
  provider: string;
  enabled: boolean;
  mode: PaidServiceMode;
  status: "commented" | "ready";
  fields: PaidServiceField[];
  settings: Record<string, string>;
  secretConfigured: Record<string, boolean>;
  audiences: Record<PaidServiceAudienceRole, PaidServiceAudiencePolicy>;
};

type PaidServicesAdminResponse = {
  version: number;
  services: Record<string, PaidServiceConfigEntry>;
  updatedAt: string;
};

const ROLE_LABELS: Record<PaidServiceAudienceRole, string> = {
  parent: "ولي الأمر",
  child: "الطفل",
  teacher: "المعلم",
  school: "المدرسة",
  admin: "الإدارة",
};

const AUDIENCE_ROLES: PaidServiceAudienceRole[] = ["parent", "child", "teacher", "school", "admin"];

export function PaidServicesConfigSection({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [paidServicesConfig, setPaidServicesConfig] = useState<PaidServicesAdminResponse | null>(null);
  const [message, setMessage] = useState("");

  const { data: paidServicesData } = useQuery<PaidServicesAdminResponse | null>({
    queryKey: ["admin-paid-services-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/paid-services-config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (!paidServicesData) return;
    setPaidServicesConfig(paidServicesData);
  }, [paidServicesData]);

  const savePaidServicesMutation = useMutation({
    mutationFn: async () => {
      if (!paidServicesConfig) throw new Error("لا توجد إعدادات للحفظ");
      const res = await fetch("/api/admin/paid-services-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ services: paidServicesConfig.services }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to save paid services config");
      }
      return json;
    },
    onSuccess: (result) => {
      setMessage("تم حفظ إعدادات الخدمات المدفوعة بنجاح");
      setTimeout(() => setMessage(""), 3000);
      const nextData = result?.data as PaidServicesAdminResponse | undefined;
      if (nextData) {
        setPaidServicesConfig(nextData);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-paid-services-config"] });
    },
    onError: (error: any) => {
      setMessage(`خطأ: ${error.message || "فشل حفظ إعدادات الخدمات المدفوعة"}`);
    },
  });

  const updatePaidService = (serviceId: string, updater: (prev: PaidServiceConfigEntry) => PaidServiceConfigEntry) => {
    setPaidServicesConfig((prev) => {
      if (!prev || !prev.services?.[serviceId]) return prev;
      return {
        ...prev,
        services: {
          ...prev.services,
          [serviceId]: updater(prev.services[serviceId]),
        },
      };
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          توحيد الخدمات المدفوعة (قيد التعليق)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          أضف المفاتيح وفعل/عطّل أي خدمة من لوحة التحكم. جميع الخدمات أدناه تبدأ معطلة افتراضيًا.
        </p>
        {message && <p className="text-sm text-green-700">{message}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {!paidServicesConfig && (
          <p className="text-sm text-muted-foreground">جاري تحميل إعدادات الخدمات المدفوعة...</p>
        )}

        {paidServicesConfig && Object.values(paidServicesConfig.services).map((service) => (
          <div key={service.id} className="rounded-lg border p-4 space-y-3" data-testid={`paid-service-${service.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{service.label}</p>
                <p className="text-xs text-muted-foreground">{service.description}</p>
                <p className="text-xs mt-1">
                  الحالة: <span className="font-medium">{service.status === "commented" ? "قيد التعليق" : "جاهز"}</span>
                </p>
              </div>
              <Switch
                checked={service.enabled}
                onCheckedChange={(checked) =>
                  updatePaidService(service.id, (prev) => ({ ...prev, enabled: checked }))
                }
                data-testid={`switch-paid-service-${service.id}`}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>الوضع</Label>
                <Select
                  value={service.mode}
                  onValueChange={(value) =>
                    updatePaidService(service.id, (prev) => ({ ...prev, mode: value as PaidServiceMode }))
                  }
                >
                  <SelectTrigger data-testid={`select-paid-service-mode-${service.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">معطّل</SelectItem>
                    <SelectItem value="trial">تجريبي</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Provider Key</Label>
                <Input
                  value={service.provider}
                  onChange={(e) =>
                    updatePaidService(service.id, (prev) => ({ ...prev, provider: e.target.value }))
                  }
                  data-testid={`input-paid-service-provider-${service.id}`}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {service.fields.map((field) => (
                <div key={`${service.id}-${field.key}`} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input
                    value={service.settings[field.key] || ""}
                    onChange={(e) =>
                      updatePaidService(service.id, (prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          [field.key]: e.target.value,
                        },
                      }))
                    }
                    placeholder={field.placeholder || ""}
                    data-testid={`input-paid-service-${service.id}-${field.key}`}
                  />
                  {field.type === "secret" && service.secretConfigured?.[field.key] && !(service.settings[field.key] || "") && (
                    <p className="text-xs text-muted-foreground">تم ضبط قيمة سرية مسبقًا</p>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-medium">ضبط الأدوار (تفعيل + إظهار للمستخدم)</p>
              <div className="space-y-2">
                {AUDIENCE_ROLES.map((role) => {
                  const policy = service.audiences?.[role] || { enabled: true, visibleToUser: role !== "admin" };
                  return (
                    <div key={`${service.id}-${role}`} className="grid grid-cols-1 gap-2 sm:grid-cols-3 items-center">
                      <span className="text-sm">{ROLE_LABELS[role]}</span>
                      <div className="flex items-center justify-between rounded border px-2 py-1">
                        <span className="text-xs text-muted-foreground">تفعيل القناة</span>
                        <Switch
                          checked={policy.enabled}
                          onCheckedChange={(checked) =>
                            updatePaidService(service.id, (prev) => ({
                              ...prev,
                              audiences: {
                                ...prev.audiences,
                                [role]: {
                                  ...(prev.audiences?.[role] || { enabled: true, visibleToUser: role !== "admin" }),
                                  enabled: checked,
                                },
                              },
                            }))
                          }
                          data-testid={`switch-paid-service-${service.id}-${role}-enabled`}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded border px-2 py-1">
                        <span className="text-xs text-muted-foreground">إظهار للمستخدم</span>
                        <Switch
                          checked={policy.visibleToUser}
                          onCheckedChange={(checked) =>
                            updatePaidService(service.id, (prev) => ({
                              ...prev,
                              audiences: {
                                ...prev.audiences,
                                [role]: {
                                  ...(prev.audiences?.[role] || { enabled: true, visibleToUser: role !== "admin" }),
                                  visibleToUser: checked,
                                },
                              },
                            }))
                          }
                          data-testid={`switch-paid-service-${service.id}-${role}-visible`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <Button
            onClick={() => savePaidServicesMutation.mutate()}
            disabled={savePaidServicesMutation.isPending || !paidServicesConfig}
            data-testid="button-save-paid-services-config"
          >
            {savePaidServicesMutation.isPending ? "جاري الحفظ..." : "حفظ إعدادات الخدمات المدفوعة"}
          </Button>
          {paidServicesConfig?.updatedAt && (
            <span className="text-xs text-muted-foreground">آخر تحديث: {paidServicesConfig.updatedAt}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
