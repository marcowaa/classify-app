import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, ArrowLeft, Settings, Globe, Moon, Sun, Bell, BellOff,
  Shield, Eye, EyeOff, Loader2, Smartphone, Trash2,
  CheckCircle, Volume2, VolumeX, User, ChevronLeft, ChevronRight, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { getDateLocale } from "@/i18n/config";
import { ChildBottomNav } from "@/components/ChildBottomNav";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";

interface ChildSettings {
  language: string;
  theme: string;
  soundEnabled: boolean;
  calmMode: boolean;
  showOnlineStatus: boolean;
}

interface TrustedDevice {
  id: string;
  deviceName: string;
  deviceType: string;
  lastUsed: string;
  isCurrent: boolean;
}

export default function ChildSettings() {
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("childToken");
  const isRTL = i18n.language === "ar";

  const [settings, setSettings] = useState<ChildSettings>({
    language: i18n.language || "ar",
    theme: isDark ? "dark" : "light",
    soundEnabled: true,
    calmMode: localStorage.getItem("child_ui_calm_mode") === "1",
    showOnlineStatus: true,
  });

  const { data: childInfo, isLoading } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch info");
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
  });

  const { data: trustedDevices } = useQuery({
    queryKey: ["child-trusted-devices"],
    queryFn: async () => {
      const res = await fetch("/api/child/trusted-devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!token,
  });

  const removeDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return apiRequest("DELETE", `/api/child/trusted-devices/${deviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-trusted-devices"] });
      toast({
        title: t("childSettings.removed"),
        description: t("childSettings.deviceRemoved"),
      });
    },
  });

  const handleLanguageChange = (lang: string) => {
    setSettings(prev => ({ ...prev, language: lang }));
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    toast({
      title: t("childSettings.languageChanged"),
      description: t("childSettings.languageChangedTo", { lang: lang === "ar" ? "العربية" : lang === "pt" ? "Português" : "English" }),
    });
  };

  const handleThemeChange = (theme: string) => {
    setSettings(prev => ({ ...prev, theme }));
    // Use ThemeContext's toggleTheme to stay in sync
    const wantsDark = theme === "dark";
    if (wantsDark !== isDark) {
      toggleTheme();
    }
    toast({
      title: t("childSettings.themeChanged"),
      description: theme === "dark"
        ? t("childSettings.darkMode")
        : t("childSettings.lightMode"),
    });
  };

  const handleToggle = (key: keyof ChildSettings) => {
    const nextValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: nextValue }));

    if (key === "calmMode") {
      localStorage.setItem("child_ui_calm_mode", nextValue ? "1" : "0");
      window.dispatchEvent(new Event("child-ui-mode-changed"));
    }

    toast({
      title: t("childSettings.saved"),
      description: t("childSettings.settingSaved"),
    });
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50"}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-purple-400"}`}>
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  const NavChevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className={`min-h-screen pb-24 ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50"}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.history.length > 1 ? window.history.back() : navigate("/child-games")}
                className="p-2 hover:bg-white/15 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              </button>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <h1 className="text-lg font-bold">{t("childSettings.title")}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-bold">{childInfo?.totalPoints || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Profile Card - Clickable */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card
            className={`border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}
            onClick={() => navigate("/child-profile")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className={`w-16 h-16 border-2 ${isDark ? "border-purple-500" : "border-purple-200"} shadow-md`}>
                  <AvatarImage src={childInfo?.avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-purple-400 to-fuchsia-500 text-white text-xl font-bold">
                    {childInfo?.name?.charAt(0) || "؟"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className={`text-lg font-bold truncate ${isDark ? "text-white" : "text-gray-800"}`}>
                    {childInfo?.name || t("childSettings.myChild")}
                  </h2>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {t("childSettings.viewEditProfile")}
                  </p>
                </div>
                <NavChevron className={`w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Language & Theme */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <CardContent className="pt-5 pb-5 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("childSettings.languageAppearance")}
                </h3>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Globe className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                  <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("childSettings.language")}
                  </Label>
                </div>
                <Select value={settings.language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className={`w-32 min-h-[44px] rounded-xl ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {settings.theme === "dark" ? (
                    <Moon className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                  ) : (
                    <Sun className="w-4 h-4 text-yellow-500" />
                  )}
                  <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("childSettings.theme")}
                  </Label>
                </div>
                <Select value={settings.theme} onValueChange={handleThemeChange}>
                  <SelectTrigger className={`w-32 min-h-[44px] rounded-xl ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("childSettings.lightTheme")}</SelectItem>
                    <SelectItem value="dark">{t("childSettings.darkTheme")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <CardContent className="pt-5 pb-5 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("childSettings.notificationsAndSounds")}
                </h3>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-orange-500" />
                  <div>
                    <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {t("childSettings.notifications")}
                    </Label>
                    <p className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      {t("childSettings.mandatoryTaskAlerts", { defaultValue: "إشعارات المهام إلزامية ولا يمكن إيقافها" })}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDark ? "bg-orange-900/40 text-orange-300" : "bg-orange-100 text-orange-700"}`}>
                  {t("childSettings.locked", { defaultValue: "إلزامي" })}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {settings.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <VolumeX className={`w-4 h-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                  )}
                  <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("childSettings.sounds")}
                  </Label>
                </div>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={() => handleToggle("soundEnabled")}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {settings.calmMode ? (
                    <Moon className="w-4 h-4 text-indigo-500" />
                  ) : (
                    <Sun className="w-4 h-4 text-yellow-500" />
                  )}
                  <div>
                    <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {t("childSettings.calmMode", { defaultValue: "الوضع الهادئ" })}
                    </Label>
                    <p className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      {t("childSettings.calmModeDesc", { defaultValue: "تقليل الحركات والمؤثرات" })}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.calmMode}
                  onCheckedChange={() => handleToggle("calmMode")}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <CardContent className="pt-5 pb-5 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("childSettings.privacy")}
                </h3>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {settings.showOnlineStatus ? (
                    <Eye className="w-4 h-4 text-blue-500" />
                  ) : (
                    <EyeOff className={`w-4 h-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                  )}
                  <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {t("childSettings.showOnlineStatus")}
                  </Label>
                </div>
                <Switch
                  checked={settings.showOnlineStatus}
                  onCheckedChange={() => handleToggle("showOnlineStatus")}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-purple-500" />
                  <div>
                    <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {t("childSettings.showProgressToParents")}
                    </Label>
                    <p className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      {t("childSettings.progressAlwaysVisible", { defaultValue: "متابعة الوالدين مفعلة دائمًا ولا يمكن تعديلها من حساب الطفل" })}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDark ? "bg-purple-900/40 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
                  {t("childSettings.locked", { defaultValue: "إلزامي" })}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Trusted Devices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <CardContent className="pt-5 pb-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("childSettings.trustedDevices")}
                </h3>
              </div>

              {trustedDevices && trustedDevices.length > 0 ? (
                <div className="space-y-2.5">
                  {trustedDevices.map((device: TrustedDevice) => (
                    <div
                      key={device.id}
                      className={`flex items-center justify-between p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? "bg-gray-600" : "bg-white shadow-sm"}`}>
                          <Smartphone className={`w-4 h-4 ${isDark ? "text-gray-300" : "text-gray-500"}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
                            {device.deviceName || t("childSettings.unknownDevice")}
                          </p>
                          <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            {device.isCurrent && (
                              <span className="text-green-500 font-medium">
                                {t("childSettings.currentDevice")}
                              </span>
                            )}
                            {new Date(device.lastUsed).toLocaleDateString(getDateLocale())}
                          </p>
                        </div>
                      </div>
                      {!device.isCurrent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDeviceMutation.mutate(device.id)}
                          disabled={removeDeviceMutation.isPending}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[40px] min-w-[40px] rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-6 rounded-xl ${isDark ? "bg-gray-700/30" : "bg-gray-50"}`}>
                  <Smartphone className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                  <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {t("childSettings.noTrustedDevices")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <div className={`text-center text-xs py-6 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
          {t("childSettings.footerGreeting", { name: childInfo?.name || "" })}
        </div>
      </main>

      <ChildBottomNav activeTab="settings" />
    </div>
  );
}
