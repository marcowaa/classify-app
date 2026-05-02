import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, Globe, Search, Bot, BarChart3, FileCode, Upload, Image as ImageIcon, Loader2, X } from "lucide-react";

export function SeoSettingsTab() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("adminToken");
  const [uploadingField, setUploadingField] = useState<"ogImage" | "schemaOrgLogo" | null>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);
  const schemaLogoInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/seo-settings"],
    enabled: !!token,
  });

  const [formData, setFormData] = useState<any>(null);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/admin/seo-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-settings"] });
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

  const handleImageUpload = async (field: "ogImage" | "schemaOrgLogo", file: File) => {
    if (!token) {
      toast({ title: t("admin.settingsSaveError"), variant: "destructive" });
      return;
    }

    setUploadingField(field);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload-public-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Upload failed");

      const data = json?.data || json;
      const imageUrl = String(data?.fullUrl || data?.url || "").trim();
      if (!imageUrl) throw new Error("Upload failed");

      handleChange(field, imageUrl);
      toast({ title: t("common.saved") || "Saved" });
    } catch (error: any) {
      toast({
        title: error?.message || t("admin.settingsSaveError"),
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
      if (field === "ogImage" && ogImageInputRef.current) ogImageInputRef.current.value = "";
      if (field === "schemaOrgLogo" && schemaLogoInputRef.current) schemaLogoInputRef.current.value = "";
    }
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
          <h1 className="text-2xl font-bold">{t("admin.seoSettings")}</h1>
          <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {t("admin.seoSettingsDescription")}
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-seo">
          <Save className="w-4 h-4 ml-2" />
          {updateMutation.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t("admin.seoBasic")}
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            {t("admin.seoSocial")}
          </TabsTrigger>
          <TabsTrigger value="crawlers" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            {t("admin.seoCrawlers")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            {t("admin.seoAnalytics")}
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            {t("admin.seoAdvanced")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.seoMetaTags")}</CardTitle>
              <CardDescription>{t("admin.seoMetaTagsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteTitle">{t("admin.seoSiteTitle")}</Label>
                <Input
                  id="siteTitle"
                  value={settings.siteTitle || ""}
                  onChange={(e) => handleChange("siteTitle", e.target.value)}
                  placeholder="Classify - تطبيق الدعم العائلي"
                  data-testid="input-site-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">{t("admin.seoSiteDescription")}</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.siteDescription || ""}
                  onChange={(e) => handleChange("siteDescription", e.target.value)}
                  placeholder={t("admin.seoSiteDescriptionPlaceholder")}
                  rows={3}
                  data-testid="input-site-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">{t("admin.seoKeywords")}</Label>
                <Input
                  id="keywords"
                  value={settings.keywords || ""}
                  onChange={(e) => handleChange("keywords", e.target.value)}
                  placeholder={t("admin.seoKeywordsPlaceholder")}
                  data-testid="input-keywords"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="canonicalUrl">{t("admin.seoCanonicalUrl")}</Label>
                  <Input
                    id="canonicalUrl"
                    value={settings.canonicalUrl || ""}
                    onChange={(e) => handleChange("canonicalUrl", e.target.value)}
                    placeholder="https://classify.app"
                    data-testid="input-canonical-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="themeColor">{t("admin.seoThemeColor")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="themeColor"
                      type="color"
                      value={settings.themeColor || "#7c3aed"}
                      onChange={(e) => handleChange("themeColor", e.target.value)}
                      className="w-16 h-10 p-1"
                      data-testid="input-theme-color"
                    />
                    <Input
                      value={settings.themeColor || "#7c3aed"}
                      onChange={(e) => handleChange("themeColor", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.seoOpenGraph")}</CardTitle>
              <CardDescription>{t("admin.seoOpenGraphDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ogTitle">{t("admin.seoOgTitle")}</Label>
                <Input
                  id="ogTitle"
                  value={settings.ogTitle || ""}
                  onChange={(e) => handleChange("ogTitle", e.target.value)}
                  placeholder={t("admin.seoOgTitlePlaceholder")}
                  data-testid="input-og-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogDescription">{t("admin.seoOgDescription")}</Label>
                <Textarea
                  id="ogDescription"
                  value={settings.ogDescription || ""}
                  onChange={(e) => handleChange("ogDescription", e.target.value)}
                  rows={2}
                  data-testid="input-og-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogImage">{t("admin.seoOgImage")}</Label>
                <div className="space-y-2">
                  {settings.ogImage ? (
                    <div className="relative w-full h-36 rounded-lg overflow-hidden border">
                      <img src={settings.ogImage} alt="og-preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleChange("ogImage", "")}
                        className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1 hover:bg-black/75"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 rounded-lg border-2 border-dashed flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    ref={ogImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload("ogImage", file);
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => ogImageInputRef.current?.click()} disabled={uploadingField === "ogImage"}>
                    {uploadingField === "ogImage" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Image
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitterSite">{t("admin.seoTwitterSite")}</Label>
                  <Input
                    id="twitterSite"
                    value={settings.twitterSite || ""}
                    onChange={(e) => handleChange("twitterSite", e.target.value)}
                    placeholder="@classifyapp"
                    data-testid="input-twitter-site"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterCreator">Twitter Creator</Label>
                  <Input
                    id="twitterCreator"
                    value={settings.twitterCreator || ""}
                    onChange={(e) => handleChange("twitterCreator", e.target.value)}
                    placeholder="@classifyapp"
                    data-testid="input-twitter-creator"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ogType">OG Type</Label>
                  <Select
                    value={settings.ogType || "website"}
                    onValueChange={(v) => handleChange("ogType", v)}
                  >
                    <SelectTrigger data-testid="select-og-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="profile">Profile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterCard">{t("admin.seoTwitterCard")}</Label>
                  <Select
                    value={settings.twitterCard || "summary_large_image"}
                    onValueChange={(v) => handleChange("twitterCard", v)}
                  >
                    <SelectTrigger data-testid="select-twitter-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                      <SelectItem value="app">App</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="googlebot">Googlebot Directives</Label>
                  <Input
                    id="googlebot"
                    value={settings.googlebot || ""}
                    onChange={(e) => handleChange("googlebot", e.target.value)}
                    placeholder="index, follow, max-snippet:-1, max-image-preview:large"
                    data-testid="input-googlebot-directives"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bingbot">Bingbot Directives</Label>
                  <Input
                    id="bingbot"
                    value={settings.bingbot || ""}
                    onChange={(e) => handleChange("bingbot", e.target.value)}
                    placeholder="index, follow"
                    data-testid="input-bingbot-directives"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crawlers" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.seoRobots")}</CardTitle>
              <CardDescription>{t("admin.seoRobotsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label htmlFor="robotsIndex">{t("admin.seoRobotsIndex")}</Label>
                  <Switch
                    id="robotsIndex"
                    checked={settings.robotsIndex !== false}
                    onCheckedChange={(v) => handleChange("robotsIndex", v)}
                    data-testid="switch-robots-index"
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label htmlFor="robotsFollow">{t("admin.seoRobotsFollow")}</Label>
                  <Switch
                    id="robotsFollow"
                    checked={settings.robotsFollow !== false}
                    onCheckedChange={(v) => handleChange("robotsFollow", v)}
                    data-testid="switch-robots-follow"
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label htmlFor="sitemapEnabled">{t("admin.seoSitemapEnabled")}</Label>
                  <Switch
                    id="sitemapEnabled"
                    checked={settings.sitemapEnabled !== false}
                    onCheckedChange={(v) => handleChange("sitemapEnabled", v)}
                    data-testid="switch-sitemap-enabled"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.seoAiCrawlers")}</CardTitle>
              <CardDescription>{t("admin.seoAiCrawlersDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>GPTBot (OpenAI)</Label>
                    <p className="text-sm text-gray-500">{t("admin.seoAllowGptBot")}</p>
                  </div>
                  <Switch
                    checked={settings.allowGPTBot === true}
                    onCheckedChange={(v) => handleChange("allowGPTBot", v)}
                    data-testid="switch-allow-gptbot"
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>ClaudeBot (Anthropic)</Label>
                    <p className="text-sm text-gray-500">{t("admin.seoAllowClaudeBot")}</p>
                  </div>
                  <Switch
                    checked={settings.allowClaudeBot === true}
                    onCheckedChange={(v) => handleChange("allowClaudeBot", v)}
                    data-testid="switch-allow-claudebot"
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Google-Extended</Label>
                    <p className="text-sm text-gray-500">{t("admin.seoAllowGoogleAi")}</p>
                  </div>
                  <Switch
                    checked={settings.allowGoogleAI === true}
                    onCheckedChange={(v) => handleChange("allowGoogleAI", v)}
                    data-testid="switch-allow-google-ai"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.seoAnalyticsIntegration")}</CardTitle>
              <CardDescription>{t("admin.seoAnalyticsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleAnalyticsId">{t("admin.seoGoogleAnalytics")}</Label>
                <Input
                  id="googleAnalyticsId"
                  value={settings.googleAnalyticsId || ""}
                  onChange={(e) => handleChange("googleAnalyticsId", e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  data-testid="input-google-analytics"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="googleTagManagerId">{t("admin.seoGoogleTagManager")}</Label>
                <Input
                  id="googleTagManagerId"
                  value={settings.googleTagManagerId || ""}
                  onChange={(e) => handleChange("googleTagManagerId", e.target.value)}
                  placeholder="GTM-XXXXXXX"
                  data-testid="input-gtm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebookPixelId">{t("admin.seoFacebookPixel")}</Label>
                <Input
                  id="facebookPixelId"
                  value={settings.facebookPixelId || ""}
                  onChange={(e) => handleChange("facebookPixelId", e.target.value)}
                  placeholder="XXXXXXXXXXXXXXXX"
                  data-testid="input-fb-pixel"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.seoCustomCode")}</CardTitle>
              <CardDescription>{t("admin.seoCustomCodeDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customHeadCode">{t("admin.seoCustomHeadCode")}</Label>
                <Textarea
                  id="customHeadCode"
                  value={settings.customHeadCode || ""}
                  onChange={(e) => handleChange("customHeadCode", e.target.value)}
                  placeholder={`<!-- Custom scripts for <head> -->`}
                  rows={5}
                  className="font-mono text-sm"
                  dir="ltr"
                  data-testid="input-custom-head"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customBodyCode">{t("admin.seoCustomBodyCode")}</Label>
                <Textarea
                  id="customBodyCode"
                  value={settings.customBodyCode || ""}
                  onChange={(e) => handleChange("customBodyCode", e.target.value)}
                  placeholder={`<!-- Custom scripts before </body> -->`}
                  rows={5}
                  className="font-mono text-sm"
                  dir="ltr"
                  data-testid="input-custom-body"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.seoSchemaOrg")}</CardTitle>
              <CardDescription>{t("admin.seoSchemaOrgDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schemaOrgType">{t("admin.seoSchemaType")}</Label>
                  <Select
                    value={settings.schemaOrgType || "SoftwareApplication"}
                    onValueChange={(v) => handleChange("schemaOrgType", v)}
                  >
                    <SelectTrigger data-testid="select-schema-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SoftwareApplication">Software Application</SelectItem>
                      <SelectItem value="WebApplication">Web Application</SelectItem>
                      <SelectItem value="MobileApplication">Mobile Application</SelectItem>
                      <SelectItem value="Organization">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schemaOrgName">Schema Name</Label>
                  <Input
                    id="schemaOrgName"
                    value={settings.schemaOrgName || ""}
                    onChange={(e) => handleChange("schemaOrgName", e.target.value)}
                    placeholder="Classify"
                    data-testid="input-schema-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schemaOrgDescription">Schema Description</Label>
                <Textarea
                  id="schemaOrgDescription"
                  value={settings.schemaOrgDescription || ""}
                  onChange={(e) => handleChange("schemaOrgDescription", e.target.value)}
                  placeholder="Structured description used in JSON-LD"
                  rows={3}
                  data-testid="input-schema-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schemaOrgLogo">{t("admin.seoSchemaLogo")}</Label>
                  <div className="space-y-2">
                    {settings.schemaOrgLogo ? (
                      <div className="relative w-full h-28 rounded-lg overflow-hidden border bg-white">
                        <img src={settings.schemaOrgLogo} alt="schema-logo" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => handleChange("schemaOrgLogo", "")}
                          className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1 hover:bg-black/75"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <input
                      ref={schemaLogoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload("schemaOrgLogo", file);
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => schemaLogoInputRef.current?.click()} disabled={uploadingField === "schemaOrgLogo"}>
                      {uploadingField === "schemaOrgLogo" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Upload Logo
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
