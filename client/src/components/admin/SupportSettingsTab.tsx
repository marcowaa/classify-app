import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, Phone, Globe, Clock, AlertTriangle, Building2 } from "lucide-react";

export function SupportSettingsTab() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("adminToken");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/support-settings"],
    enabled: !!token,
  });

  const [formData, setFormData] = useState<any>(null);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/admin/support-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-settings"] });
      toast({ title: t("admin.settingsSaved"), variant: "default" });
    },
    onError: () => {
      toast({ title: t("admin.settingsSaveError"), variant: "destructive" });
    },
  });

  const settings = formData || data || {};

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...(prev || settings), [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData || settings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.supportSettings")}</h1>
          <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {t("admin.supportSettingsDescription")}
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-support">
          <Save className="w-4 h-4 ml-2" />
          {updateMutation.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>

      <Tabs defaultValue="contact" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {t("admin.supportContact")}
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t("admin.supportSocial")}
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t("admin.supportHours")}
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {t("admin.supportMessages")}
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {t("admin.supportCompany")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contact" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.supportContactInfo")}</CardTitle>
              <CardDescription>{t("admin.supportContactDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">{t("admin.supportEmail")}</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.supportEmail || ""}
                    onChange={(e) => handleChange("supportEmail", e.target.value)}
                    placeholder="support@classify.app"
                    data-testid="input-support-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone">{t("admin.supportPhone")}</Label>
                  <Input
                    id="supportPhone"
                    value={settings.supportPhone || ""}
                    onChange={(e) => handleChange("supportPhone", e.target.value)}
                    placeholder="+966 XX XXX XXXX"
                    dir="ltr"
                    data-testid="input-support-phone"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber">{t("admin.supportWhatsapp")}</Label>
                  <Input
                    id="whatsappNumber"
                    value={settings.whatsappNumber || ""}
                    onChange={(e) => handleChange("whatsappNumber", e.target.value)}
                    placeholder="+966 XX XXX XXXX"
                    dir="ltr"
                    data-testid="input-whatsapp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegramUsername">{t("admin.supportTelegram")}</Label>
                  <Input
                    id="telegramUsername"
                    value={settings.telegramUsername || ""}
                    onChange={(e) => handleChange("telegramUsername", e.target.value)}
                    placeholder="@classifyapp"
                    dir="ltr"
                    data-testid="input-telegram"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.supportSocialMedia")}</CardTitle>
              <CardDescription>{t("admin.supportSocialDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebookUrl">Facebook</Label>
                  <Input
                    id="facebookUrl"
                    value={settings.facebookUrl || ""}
                    onChange={(e) => handleChange("facebookUrl", e.target.value)}
                    placeholder="https://facebook.com/classifyapp"
                    dir="ltr"
                    data-testid="input-facebook"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterUrl">Twitter / X</Label>
                  <Input
                    id="twitterUrl"
                    value={settings.twitterUrl || ""}
                    onChange={(e) => handleChange("twitterUrl", e.target.value)}
                    placeholder="https://twitter.com/classifyapp"
                    dir="ltr"
                    data-testid="input-twitter"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagramUrl">Instagram</Label>
                  <Input
                    id="instagramUrl"
                    value={settings.instagramUrl || ""}
                    onChange={(e) => handleChange("instagramUrl", e.target.value)}
                    placeholder="https://instagram.com/classifyapp"
                    dir="ltr"
                    data-testid="input-instagram"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtubeUrl">YouTube</Label>
                  <Input
                    id="youtubeUrl"
                    value={settings.youtubeUrl || ""}
                    onChange={(e) => handleChange("youtubeUrl", e.target.value)}
                    placeholder="https://youtube.com/@classifyapp"
                    dir="ltr"
                    data-testid="input-youtube"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">LinkedIn</Label>
                <Input
                  id="linkedinUrl"
                  value={settings.linkedinUrl || ""}
                  onChange={(e) => handleChange("linkedinUrl", e.target.value)}
                  placeholder="https://linkedin.com/company/classifyapp"
                  dir="ltr"
                  data-testid="input-linkedin"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.supportWorkingHours")}</CardTitle>
              <CardDescription>{t("admin.supportWorkingHoursDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workingHoursStart">{t("admin.supportStartTime")}</Label>
                  <Input
                    id="workingHoursStart"
                    type="time"
                    value={settings.workingHoursStart || "09:00"}
                    onChange={(e) => handleChange("workingHoursStart", e.target.value)}
                    data-testid="input-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingHoursEnd">{t("admin.supportEndTime")}</Label>
                  <Input
                    id="workingHoursEnd"
                    type="time"
                    value={settings.workingHoursEnd || "17:00"}
                    onChange={(e) => handleChange("workingHoursEnd", e.target.value)}
                    data-testid="input-end-time"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workingDays">{t("admin.supportWorkingDays")}</Label>
                  <Input
                    id="workingDays"
                    value={settings.workingDays || ""}
                    onChange={(e) => handleChange("workingDays", e.target.value)}
                    placeholder="الأحد - الخميس"
                    data-testid="input-working-days"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">{t("admin.supportTimezone")}</Label>
                  <Input
                    id="timezone"
                    value={settings.timezone || "Asia/Riyadh"}
                    onChange={(e) => handleChange("timezone", e.target.value)}
                    placeholder="Asia/Riyadh"
                    dir="ltr"
                    data-testid="input-timezone"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.supportMaintenanceMode")}</CardTitle>
              <CardDescription>{t("admin.supportMaintenanceDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>{t("admin.supportMaintenanceEnabled")}</Label>
                  <p className="text-sm text-gray-500">{t("admin.supportMaintenanceEnabledDescription")}</p>
                </div>
                <Switch
                  checked={settings.maintenanceMode === true}
                  onCheckedChange={(v) => handleChange("maintenanceMode", v)}
                  data-testid="switch-maintenance-mode"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenanceMessage">{t("admin.supportMaintenanceMessage")}</Label>
                <Textarea
                  id="maintenanceMessage"
                  value={settings.maintenanceMessage || ""}
                  onChange={(e) => handleChange("maintenanceMessage", e.target.value)}
                  placeholder="التطبيق تحت الصيانة، نعود قريباً"
                  rows={2}
                  data-testid="input-maintenance-message"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyMessage">{t("admin.supportEmergencyMessage")}</Label>
                <Textarea
                  id="emergencyMessage"
                  value={settings.emergencyMessage || ""}
                  onChange={(e) => handleChange("emergencyMessage", e.target.value)}
                  placeholder={t("admin.supportEmergencyPlaceholder")}
                  rows={2}
                  data-testid="input-emergency-message"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.supportErrorPage")}</CardTitle>
              <CardDescription>{t("admin.supportErrorPageDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>{t("admin.supportShowContactOnError")}</Label>
                  <p className="text-sm text-gray-500">{t("admin.supportShowContactOnErrorDescription")}</p>
                </div>
                <Switch
                  checked={settings.showContactOnError !== false}
                  onCheckedChange={(v) => handleChange("showContactOnError", v)}
                  data-testid="switch-show-contact-error"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="errorPageTitle">{t("admin.supportErrorTitle")}</Label>
                <Input
                  id="errorPageTitle"
                  value={settings.errorPageTitle || ""}
                  onChange={(e) => handleChange("errorPageTitle", e.target.value)}
                  placeholder="حدث خطأ غير متوقع"
                  data-testid="input-error-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="errorPageMessage">{t("admin.supportErrorMessage")}</Label>
                <Textarea
                  id="errorPageMessage"
                  value={settings.errorPageMessage || ""}
                  onChange={(e) => handleChange("errorPageMessage", e.target.value)}
                  placeholder="نأسف على هذا الخطأ. يرجى التواصل مع الدعم الفني."
                  rows={2}
                  data-testid="input-error-message"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.supportCompanyInfo")}</CardTitle>
              <CardDescription>{t("admin.supportCompanyDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t("admin.supportCompanyName")}</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName || ""}
                    onChange={(e) => handleChange("companyName", e.target.value)}
                    placeholder="Classify"
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyCountry">{t("admin.supportCountry")}</Label>
                  <Input
                    id="companyCountry"
                    value={settings.companyCountry || ""}
                    onChange={(e) => handleChange("companyCountry", e.target.value)}
                    placeholder="المملكة العربية السعودية"
                    data-testid="input-company-country"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyCity">{t("admin.supportCity")}</Label>
                  <Input
                    id="companyCity"
                    value={settings.companyCity || ""}
                    onChange={(e) => handleChange("companyCity", e.target.value)}
                    placeholder="الرياض"
                    data-testid="input-company-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">{t("admin.supportAddress")}</Label>
                  <Input
                    id="companyAddress"
                    value={settings.companyAddress || ""}
                    onChange={(e) => handleChange("companyAddress", e.target.value)}
                    placeholder={t("admin.supportAddressPlaceholder")}
                    data-testid="input-company-address"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.supportLegalLinks")}</CardTitle>
              <CardDescription>{t("admin.supportLegalDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="privacyPolicyUrl">{t("admin.supportPrivacyUrl")}</Label>
                  <Input
                    id="privacyPolicyUrl"
                    value={settings.privacyPolicyUrl || ""}
                    onChange={(e) => handleChange("privacyPolicyUrl", e.target.value)}
                    placeholder="/privacy"
                    dir="ltr"
                    data-testid="input-privacy-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termsOfServiceUrl">{t("admin.supportTermsUrl")}</Label>
                  <Input
                    id="termsOfServiceUrl"
                    value={settings.termsOfServiceUrl || ""}
                    onChange={(e) => handleChange("termsOfServiceUrl", e.target.value)}
                    placeholder="/terms"
                    dir="ltr"
                    data-testid="input-terms-url"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="faqUrl">{t("admin.supportFaqUrl")}</Label>
                  <Input
                    id="faqUrl"
                    value={settings.faqUrl || ""}
                    onChange={(e) => handleChange("faqUrl", e.target.value)}
                    placeholder="/faq"
                    dir="ltr"
                    data-testid="input-faq-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="helpCenterUrl">{t("admin.supportHelpCenterUrl")}</Label>
                  <Input
                    id="helpCenterUrl"
                    value={settings.helpCenterUrl || ""}
                    onChange={(e) => handleChange("helpCenterUrl", e.target.value)}
                    placeholder="/help"
                    dir="ltr"
                    data-testid="input-help-url"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
