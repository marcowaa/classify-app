import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Copy, ExternalLink, Key, Mail, Settings, Volume2, Shield, User } from "lucide-react";
import { PaidServicesConfigSection } from "@/components/admin/PaidServicesConfigSection";

interface OTPSettings {
  enabled: boolean;
  provider: string;
  expiryMinutes: number;
  codeLength: number;
  maxAttempts: number;
}

interface NotificationSettings {
  soundEnabled: boolean;
  soundChoice: string;
  customSoundUrl?: string | null;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

interface InHomeConnectorConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  apiKeyMasked?: string;
  timeoutMs: number;
  webhookSecret: string;
  webhookSecretMasked?: string;
}

interface InHomeConnectorResponse {
  config: InHomeConnectorConfig;
  webhookUrl: string;
  lastWebhookEvent?: {
    event?: string | null;
    receivedAt?: string | null;
    purchaseId?: string | null;
    trackingCode?: string | null;
    status?: string | null;
  } | null;
}

const NOTIFICATION_SOUNDS = [
  { value: "default", label: i18next.t("admin.settingsTab.defaultSound") },
  { value: "chime", label: i18next.t("admin.settingsTab.ringSound") },
  { value: "bell", label: i18next.t("admin.settingsTab.bellSound") },
  { value: "pop", label: i18next.t("admin.settingsTab.bubbleSound") },
  { value: "ding", label: i18next.t("admin.settingsTab.dingSound") },
  { value: "custom", label: i18next.t("admin.settingsTab.customSound") },
];

function normalizeUrlInput(baseUrl: string): string {
  const normalized = (baseUrl || "").trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `https://${normalized}`;
}

function buildInHomeLoginUrl(baseUrl: string): string {
  const normalized = normalizeUrlInput(baseUrl);
  if (!normalized) return "";

  try {
    const parsed = new URL(normalized);
    const cleanedPath = parsed.pathname
      .replace(/\/+$/, "")
      .replace(/\/(api|api\/v1)$/i, "");

    parsed.pathname = `${cleanedPath}/admin/login`;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function buildInHomeAltLoginUrl(baseUrl: string): string {
  const normalized = normalizeUrlInput(baseUrl);
  if (!normalized) return "";

  try {
    const parsed = new URL(normalized);
    const cleanedPath = parsed.pathname
      .replace(/\/+$/, "")
      .replace(/\/(api|api\/v1)$/i, "");

    parsed.pathname = `${cleanedPath}/login`;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function SettingsTab({
  token,
  initialTab = "otp",
  hideTabs = false,
}: {
  token: string;
  initialTab?: "otp" | "notifications" | "account" | "api";
  hideTabs?: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [diagnoseOutput, setDiagnoseOutput] = useState("");
  const [notificationSoundFile, setNotificationSoundFile] = useState<File | null>(null);
  const [inHomeConfig, setInHomeConfig] = useState<InHomeConnectorConfig>({
    enabled: false,
    baseUrl: "",
    apiKey: "",
    timeoutMs: 5000,
    webhookSecret: "",
  });

  const [otpSettings, setOtpSettings] = useState<OTPSettings>({
    enabled: true,
    provider: "email",
    expiryMinutes: 5,
    codeLength: 6,
    maxAttempts: 3,
  });

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    soundEnabled: true,
    soundChoice: "default",
    customSoundUrl: null,
    pushEnabled: false,
    emailEnabled: true,
  });

  const inHomeLoginUrl = buildInHomeLoginUrl(inHomeConfig.baseUrl);
  const inHomeAltLoginUrl = buildInHomeAltLoginUrl(inHomeConfig.baseUrl);
  const normalizedInHomeBaseUrl = normalizeUrlInput(inHomeConfig.baseUrl);
  const hasInHomeBaseUrlInput = (inHomeConfig.baseUrl || "").trim().length > 0;
  const inHomeBaseUrlInvalid = hasInHomeBaseUrlInput && !inHomeLoginUrl;

  const copyText = async (value: string, successMessage: string) => {
    try {
      if (!value) return;
      await navigator.clipboard.writeText(value);
      setMessage(successMessage);
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("تعذر النسخ. انسخ الرابط يدويًا.");
      setTimeout(() => setMessage(""), 2500);
    }
  };

  const { data: settingsData } = useQuery({
    queryKey: ["admin-app-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/app-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (settingsData) {
      if (settingsData.otp) {
        setOtpSettings(settingsData.otp);
      }
      if (settingsData.notifications) {
        setNotifSettings(settingsData.notifications);
      }
    }
  }, [settingsData]);

  // Fetch admin profile (username + masked email)
  const { data: profileData } = useQuery({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const res = await fetch("/api/admin/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
  });

  const { data: inHomeConnectorData } = useQuery<InHomeConnectorResponse | null>({
    queryKey: ["admin-inhome-shipping-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/store/inhome-shipping-config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (!inHomeConnectorData?.config) return;
    setInHomeConfig({
      enabled: !!inHomeConnectorData.config.enabled,
      baseUrl: inHomeConnectorData.config.baseUrl || "",
      apiKey: "",
      apiKeyMasked: inHomeConnectorData.config.apiKeyMasked || "",
      timeoutMs: Number(inHomeConnectorData.config.timeoutMs || 5000),
      webhookSecret: "",
      webhookSecretMasked: inHomeConnectorData.config.webhookSecretMasked || "",
    });
  }, [inHomeConnectorData]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      setMessage("تم حفظ الإعدادات بنجاح");
      setTimeout(() => setMessage(""), 3000);
      queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] });
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setMessage("تم تحديث بريد الاستعادة بنجاح");
        setRecoveryEmail("");
        setTimeout(() => setMessage(""), 3000);
        queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      }
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("كلمات المرور غير متطابقة");
      }
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setMessage("تم تغيير كلمة المرور بنجاح");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setMessage(""), 3000);
      }
    },
    onError: (error: any) => {
      setMessage(`خطأ: ${error.message}`);
    },
  });

  const uploadNotificationSoundMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("soundFile", file);

      const res = await fetch("/api/admin/notification-sound/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      return res.json();
    },
    onSuccess: (data) => {
      const uploadedUrl = data?.data?.customSoundUrl;
      if (uploadedUrl) {
        setNotifSettings((prev) => ({
          ...prev,
          soundChoice: "custom",
          customSoundUrl: uploadedUrl,
          soundEnabled: true,
        }));
        setNotificationSoundFile(null);
        setMessage(t("admin.settingsTab.uploadSoundUploaded"));
        setTimeout(() => setMessage(""), 3000);
      }
    },
  });

  const saveInHomeConnectorMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/store/inhome-shipping-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          enabled: inHomeConfig.enabled,
          baseUrl: inHomeConfig.baseUrl,
          apiKey: inHomeConfig.apiKey || inHomeConfig.apiKeyMasked || "",
          timeoutMs: inHomeConfig.timeoutMs,
          webhookSecret: inHomeConfig.webhookSecret || inHomeConfig.webhookSecretMasked || "",
        }),
      });

      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to save connector settings");
      }
      return json;
    },
    onSuccess: () => {
      setMessage("تم حفظ إعدادات in-home بنجاح");
      setTimeout(() => setMessage(""), 3000);
      queryClient.invalidateQueries({ queryKey: ["admin-inhome-shipping-config"] });
    },
    onError: (error: any) => {
      setMessage(`خطأ: ${error.message || "فشل حفظ الإعدادات"}`);
    },
  });

  const testInHomeConnectorMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/store/inhome-shipping-config/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.data?.message || json?.message || "Connector test failed");
      }
      return json;
    },
    onSuccess: (result) => {
      const msg = result?.data?.message || "Connector is connected";
      setMessage(`تم الاختبار بنجاح: ${msg}`);
      setTimeout(() => setMessage(""), 4000);
      queryClient.invalidateQueries({ queryKey: ["admin-inhome-shipping-config"] });
    },
    onError: (error: any) => {
      setMessage(`فشل الاختبار: ${error.message || "Connection failed"}`);
    },
  });

  const diagnoseInHomeConnectorMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/store/inhome-shipping-config/diagnose", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!json) {
        throw new Error("Empty diagnostic response");
      }

      return {
        ok: res.ok && !!json.success,
        data: json.data,
      };
    },
    onSuccess: (result) => {
      const diagnosis = result?.data;
      if (!diagnosis) {
        setDiagnoseOutput("No diagnostic data returned");
        setMessage("تم تنفيذ التشخيص لكن بدون بيانات");
        return;
      }

      const lines = [
        `Summary: ${diagnosis?.summary?.ok ? "OK" : "FAIL"}`,
        `Message: ${diagnosis?.summary?.message || "-"}`,
        `Enabled: ${diagnosis?.connector?.enabled ? "true" : "false"}`,
        `Base URL: ${diagnosis?.connector?.baseUrl || "-"}`,
        `Has API Key: ${diagnosis?.connector?.hasApiKey ? "yes" : "no"}`,
        `Has Webhook Secret: ${diagnosis?.connector?.hasWebhookSecret ? "yes" : "no"}`,
        `Validation: ${diagnosis?.checks?.validation?.ok ? "OK" : `FAIL (${diagnosis?.checks?.validation?.message || "unknown"})`}`,
        `DNS: ${diagnosis?.checks?.dns?.ok ? `OK (${diagnosis?.checks?.dns?.hostname} -> ${diagnosis?.checks?.dns?.address})` : `FAIL (${diagnosis?.checks?.dns?.message || "unknown"})`}`,
        `Probe: ${diagnosis?.checks?.probe?.ok ? `OK (${diagnosis?.checks?.probe?.message || "connected"})` : `FAIL (${diagnosis?.checks?.probe?.message || "unknown"})`}`,
      ];

      const recommendations = Array.isArray(diagnosis?.recommendations) ? diagnosis.recommendations : [];
      if (recommendations.length > 0) {
        lines.push("", "Recommendations:");
        recommendations.forEach((item: string, idx: number) => lines.push(`${idx + 1}. ${item}`));
      }

      setDiagnoseOutput(lines.join("\n"));
      setMessage(diagnosis?.summary?.ok ? "نتيجة التشخيص: الاتصال سليم" : "نتيجة التشخيص: توجد مشاكل تحتاج إصلاح");
      setTimeout(() => setMessage(""), 4500);
    },
    onError: (error: any) => {
      setDiagnoseOutput("");
      setMessage(`فشل التشخيص: ${error?.message || "unknown error"}`);
      setTimeout(() => setMessage(""), 4500);
    },
  });

  const handleSaveOTP = () => {
    saveSettingsMutation.mutate({ otp: otpSettings });
  };

  const handleSaveNotifications = () => {
    saveSettingsMutation.mutate({ notifications: notifSettings });
  };

  const handleUploadNotificationSound = () => {
    if (!notificationSoundFile) {
      setMessage(t("admin.settingsTab.uploadSoundSelectFirst"));
      setTimeout(() => setMessage(""), 2500);
      return;
    }

    uploadNotificationSoundMutation.mutate(notificationSoundFile);
  };

  return (
    <div className="p-4 max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">الإعدادات - Settings</h2>

      {message && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded text-green-800">
          {message}
        </div>
      )}

      <Tabs defaultValue={initialTab} className="w-full">
        {!hideTabs && (
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="otp" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>OTP</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span>الإشعارات</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>الحساب</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              <span>in-home</span>
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="otp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                إعدادات OTP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>تفعيل OTP</Label>
                <Switch
                  checked={otpSettings.enabled}
                  onCheckedChange={(checked) => setOtpSettings({ ...otpSettings, enabled: checked })}
                  data-testid="switch-otp-enabled"
                />
              </div>

              <div>
                <Label>مزود OTP</Label>
                <Select
                  value={otpSettings.provider}
                  onValueChange={(value) => setOtpSettings({ ...otpSettings, provider: value })}
                >
                  <SelectTrigger data-testid="select-otp-provider">
                    <SelectValue placeholder="اختر المزود" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">البريد الإلكتروني</SelectItem>
                    <SelectItem value="sms">رسالة SMS</SelectItem>
                    <SelectItem value="both">كلاهما</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>مدة صلاحية الكود (دقائق)</Label>
                <Input
                  type="number"
                  value={otpSettings.expiryMinutes}
                  onChange={(e) => setOtpSettings({ ...otpSettings, expiryMinutes: parseInt(e.target.value) || 5 })}
                  min={1}
                  max={30}
                  data-testid="input-otp-expiry"
                />
              </div>

              <div>
                <Label>طول الكود</Label>
                <Select
                  value={otpSettings.codeLength.toString()}
                  onValueChange={(value) => setOtpSettings({ ...otpSettings, codeLength: parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-otp-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 أرقام</SelectItem>
                    <SelectItem value="6">6 أرقام</SelectItem>
                    <SelectItem value="8">8 أرقام</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>الحد الأقصى للمحاولات</Label>
                <Input
                  type="number"
                  value={otpSettings.maxAttempts}
                  onChange={(e) => setOtpSettings({ ...otpSettings, maxAttempts: parseInt(e.target.value) || 3 })}
                  min={1}
                  max={10}
                  data-testid="input-otp-max-attempts"
                />
              </div>

              <Button onClick={handleSaveOTP} disabled={saveSettingsMutation.isPending} data-testid="button-save-otp">
                {saveSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ إعدادات OTP"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                إعدادات الإشعارات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <Label>تفعيل صوت الإشعارات</Label>
                </div>
                <Switch
                  checked={notifSettings.soundEnabled}
                  onCheckedChange={(checked) => setNotifSettings({ ...notifSettings, soundEnabled: checked })}
                  data-testid="switch-notification-sound"
                />
              </div>

              {notifSettings.soundEnabled && (
                <div>
                  <Label>نوع الصوت</Label>
                  <Select
                    value={notifSettings.soundChoice}
                    onValueChange={(value) => setNotifSettings({ ...notifSettings, soundChoice: value })}
                  >
                    <SelectTrigger data-testid="select-notification-sound">
                      <SelectValue placeholder="اختر الصوت" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_SOUNDS.map((sound) => (
                        <SelectItem key={sound.value} value={sound.value}>
                          {sound.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="mt-3 space-y-2">
                    <Label>{t("admin.settingsTab.customSoundUploadLabel")}</Label>
                    <div className="flex flex-col md:flex-row gap-2">
                      <Input
                        type="file"
                        accept=".mp3,.wav,.ogg,.m4a,.aac,audio/*"
                        onChange={(e) => setNotificationSoundFile(e.target.files?.[0] || null)}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleUploadNotificationSound}
                        disabled={uploadNotificationSoundMutation.isPending}
                      >
                        {uploadNotificationSoundMutation.isPending
                          ? t("admin.settingsTab.uploadingSoundButton")
                          : t("admin.settingsTab.uploadSoundButton")}
                      </Button>
                    </div>

                    {notifSettings.customSoundUrl ? (
                      <div className="rounded-md border border-dashed border-gray-300 p-2">
                        <p className="text-xs text-gray-600 mb-2">{t("admin.settingsTab.customSoundPreviewLabel")}</p>
                        <audio controls src={notifSettings.customSoundUrl} className="w-full" />
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <Label>الإشعارات المدفوعة (Push)</Label>
                </div>
                <Switch
                  checked={notifSettings.pushEnabled}
                  onCheckedChange={(checked) => setNotifSettings({ ...notifSettings, pushEnabled: checked })}
                  data-testid="switch-push-notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <Label>إشعارات البريد الإلكتروني</Label>
                </div>
                <Switch
                  checked={notifSettings.emailEnabled}
                  onCheckedChange={(checked) => setNotifSettings({ ...notifSettings, emailEnabled: checked })}
                  data-testid="switch-email-notifications"
                />
              </div>

              <Button onClick={handleSaveNotifications} disabled={saveSettingsMutation.isPending} data-testid="button-save-notifications">
                {saveSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ إعدادات الإشعارات"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <div className="space-y-6">
            {/* Admin Profile Info */}
            {profileData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    معلومات الحساب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">اسم المستخدم</span>
                    <span className="font-mono font-bold">{profileData.username}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">بريد الاستعادة</span>
                    <span className="font-mono text-sm text-muted-foreground">{profileData.maskedEmail}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">الصلاحية</span>
                    <span className="font-mono">{profileData.role}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  تحديث بريد الاستعادة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  البريد الإلكتروني يُستخدم فقط لاستعادة كلمة المرور ولا يظهر في أي مكان عام
                </p>
                <Input
                  type="email"
                  placeholder="البريد الإلكتروني للاستعادة"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  data-testid="input-recovery-email"
                />
                <Button
                  onClick={() => changeEmailMutation.mutate()}
                  disabled={!recoveryEmail || changeEmailMutation.isPending}
                  data-testid="button-update-recovery-email"
                >
                  {changeEmailMutation.isPending ? "جاري التحديث..." : "تحديث بريد الاستعادة"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تغيير كلمة المرور</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="password"
                  placeholder="كلمة المرور الحالية"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  data-testid="input-current-password"
                />
                <Input
                  type="password"
                  placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
                <Input
                  type="password"
                  placeholder="تأكيد كلمة المرور الجديدة"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
                <Button
                  onClick={() => changePasswordMutation.mutate()}
                  disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? "جاري التغيير..." : "تغيير كلمة المرور"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api">
          <Card className="mb-4">
            <CardHeader>
              <div className="space-y-3">
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  تكامل in-home للشحن
                </CardTitle>
                <div className="grid gap-2 sm:grid-cols-2">
                  {inHomeLoginUrl ? (
                    <Button asChild type="button" variant="secondary" data-testid="button-open-inhome-dashboard" className="justify-between">
                      <a href={inHomeLoginUrl} target="_blank" rel="noopener noreferrer">
                        <span>فتح تسجيل دخول لوحة in-home</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button type="button" variant="secondary" disabled data-testid="button-open-inhome-dashboard" className="justify-between">
                      <span>فتح تسجيل دخول لوحة in-home</span>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}

                  {inHomeAltLoginUrl ? (
                    <Button asChild type="button" variant="outline" data-testid="button-open-inhome-dashboard-alt" className="justify-between">
                      <a href={inHomeAltLoginUrl} target="_blank" rel="noopener noreferrer">
                        <span>فتح صفحة login البديلة</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" disabled data-testid="button-open-inhome-dashboard-alt" className="justify-between">
                      <span>فتح صفحة login البديلة</span>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => copyText(inHomeLoginUrl, "تم نسخ رابط لوحة in-home")}
                    disabled={!inHomeLoginUrl}
                    className="justify-between"
                  >
                    <span>نسخ رابط لوحة in-home</span>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => copyText(inHomeAltLoginUrl, "تم نسخ رابط login البديل")}
                    disabled={!inHomeAltLoginUrl}
                    className="justify-between"
                  >
                    <span>نسخ رابط login البديل</span>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => copyText(normalizedInHomeBaseUrl, "تم نسخ Base URL")}
                    disabled={!normalizedInHomeBaseUrl}
                    className="justify-between"
                  >
                    <span>نسخ Base URL</span>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {inHomeBaseUrlInvalid && (
                  <p className="text-xs text-amber-600">
                    Base URL غير صالح. استخدم رابطًا كاملاً مثل https://inhome.classi-fy.com
                  </p>
                )}
                {!inHomeBaseUrlInvalid && !!normalizedInHomeBaseUrl && (
                  <p className="text-xs text-muted-foreground">
                    إذا لم تُفتح الصفحة بعد الضغط، فالمشكلة غالبًا من DNS/الاستضافة لخدمة in-home نفسها وليس من الزر.
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">تفعيل التكامل</p>
                  <p className="text-xs text-muted-foreground">عند التعطيل، checkout في Classify يستمر بشكل طبيعي بدون أي اتصال خارجي.</p>
                </div>
                <Switch
                  checked={inHomeConfig.enabled}
                  onCheckedChange={(checked) => setInHomeConfig((prev) => ({ ...prev, enabled: checked }))}
                  data-testid="switch-inhome-enabled"
                />
              </div>

              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={inHomeConfig.baseUrl}
                  onChange={(e) => setInHomeConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://inhome.classi-fy.com"
                  data-testid="input-inhome-base-url"
                />
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  value={inHomeConfig.apiKey}
                  onChange={(e) => setInHomeConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={inHomeConfig.apiKeyMasked || "in-home api key"}
                  data-testid="input-inhome-api-key"
                />
                {inHomeConfig.apiKeyMasked && !inHomeConfig.apiKey && (
                  <p className="text-xs text-muted-foreground">القيمة الحالية: {inHomeConfig.apiKeyMasked}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <Input
                  value={inHomeConfig.webhookSecret}
                  onChange={(e) => setInHomeConfig((prev) => ({ ...prev, webhookSecret: e.target.value }))}
                  placeholder={inHomeConfig.webhookSecretMasked || "x-inhome-webhook-secret"}
                  data-testid="input-inhome-webhook-secret"
                />
                {inHomeConfig.webhookSecretMasked && !inHomeConfig.webhookSecret && (
                  <p className="text-xs text-muted-foreground">القيمة الحالية: {inHomeConfig.webhookSecretMasked}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Timeout (ms)</Label>
                <Input
                  type="number"
                  value={inHomeConfig.timeoutMs}
                  onChange={(e) => setInHomeConfig((prev) => ({ ...prev, timeoutMs: parseInt(e.target.value, 10) || 5000 }))}
                  min={500}
                  max={30000}
                  data-testid="input-inhome-timeout"
                />
              </div>

              <div className="p-3 border rounded-lg bg-muted/40">
                <p className="text-sm font-medium mb-1">Webhook URL (ضعه داخل in-home Webhooks)</p>
                <p className="text-xs font-mono break-all" data-testid="text-inhome-webhook-url">
                  {inHomeConnectorData?.webhookUrl || "https://classi-fy.com/api/store/inhome/webhook"}
                </p>
              </div>

              <div className="p-3 border rounded-lg bg-muted/30">
                <p className="text-sm font-medium mb-2">آخر Webhook مستلم</p>
                {inHomeConnectorData?.lastWebhookEvent ? (
                  <div className="space-y-1 text-xs">
                    <div>event: {inHomeConnectorData.lastWebhookEvent.event || "-"}</div>
                    <div>status: {inHomeConnectorData.lastWebhookEvent.status || "-"}</div>
                    <div>purchaseId: {inHomeConnectorData.lastWebhookEvent.purchaseId || "-"}</div>
                    <div>trackingCode: {inHomeConnectorData.lastWebhookEvent.trackingCode || "-"}</div>
                    <div>receivedAt: {inHomeConnectorData.lastWebhookEvent.receivedAt || "-"}</div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">لا يوجد Webhook مستلم حتى الآن.</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => saveInHomeConnectorMutation.mutate()}
                  disabled={saveInHomeConnectorMutation.isPending}
                  data-testid="button-save-inhome-config"
                >
                  {saveInHomeConnectorMutation.isPending ? "جاري الحفظ..." : "حفظ إعدادات التكامل"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testInHomeConnectorMutation.mutate()}
                  disabled={testInHomeConnectorMutation.isPending}
                  data-testid="button-test-inhome-config"
                >
                  {testInHomeConnectorMutation.isPending ? "جاري الاختبار..." : "اختبار الاتصال"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => diagnoseInHomeConnectorMutation.mutate()}
                  disabled={diagnoseInHomeConnectorMutation.isPending}
                  data-testid="button-diagnose-inhome-config"
                >
                  {diagnoseInHomeConnectorMutation.isPending ? "جاري التشخيص..." : "تشخيص مباشر"}
                </Button>
              </div>

              {diagnoseOutput && (
                <div className="p-3 border rounded-lg bg-black/90 text-green-300">
                  <p className="text-xs font-semibold mb-2 text-green-200">Diagnostic Output</p>
                  <pre className="text-[11px] whitespace-pre-wrap break-words leading-5" data-testid="text-inhome-diagnose-output">
                    {diagnoseOutput}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <PaidServicesConfigSection token={token} />

        </TabsContent>
      </Tabs>
    </div>
  );
}
