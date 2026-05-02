import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { School, Eye, EyeOff } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";
import { cacheAdultAccountSession } from "@/lib/adultAccountSessions";
import { buildWhatsAppSupportUrl, fetchSupportSettingsPublic } from "@/lib/supportContact";

export default function SchoolLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: supportSettings } = useQuery({
    queryKey: ["public-support-settings"],
    queryFn: fetchSupportSettingsPublic,
    staleTime: 60_000,
  });

  const supportFallbackHref = supportSettings?.supportPhone
    ? `tel:${supportSettings.supportPhone}`
    : "/contact";
  const schoolSupportHref = buildWhatsAppSupportUrl(
    supportSettings?.whatsappNumber,
    t("schoolLogin.contactSupport"),
  ) || supportFallbackHref;
  const schoolSupportIsExternal = schoolSupportHref.startsWith("https://wa.me/");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({ title: t("schoolLogin.enterCredentialsRequired"), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/school/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || t("schoolLogin.loginFailed"));
      }

      localStorage.setItem("schoolToken", data.data.token);
      localStorage.setItem("schoolData", JSON.stringify(data.data.school));
      cacheAdultAccountSession({
        role: "school",
        token: data.data.token,
        accountId: data.data.school?.id || data.data.school?.username,
        displayName: data.data.school?.name || data.data.school?.username,
        dataValue: JSON.stringify(data.data.school || {}),
      });

      toast({ title: `${t("schoolLogin.welcome")} ${data.data.school.name}` });
      setLocation("/school/dashboard");
    } catch (error: any) {
      toast({ title: error.message || t("schoolLogin.loginFailed"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-4 relative">
      <div className="absolute top-4 ltr:right-4 rtl:left-4 z-50"><LanguageSelector /></div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <School className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">{t("schoolLogin.title")}</CardTitle>
          <CardDescription>
            {t("schoolLogin.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("schoolLogin.username")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="school_admin01"
                className="focus:placeholder-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("schoolLogin.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Aa123456"
                  className="focus:placeholder-transparent"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "right-1" : "left-1"}`}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? t("schoolLogin.loggingIn") : t("schoolLogin.login")}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>{t("schoolLogin.noAccount")}</p>
            <a
              href={schoolSupportHref}
              target={schoolSupportIsExternal ? "_blank" : undefined}
              rel={schoolSupportIsExternal ? "noopener noreferrer" : undefined}
              className="text-blue-600 hover:underline"
            >
              {t("schoolLogin.contactSupport")}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
