import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Store, Eye, EyeOff } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";
import { cacheAdultAccountSession } from "@/lib/adultAccountSessions";
import { buildWhatsAppSupportUrl, fetchSupportSettingsPublic } from "@/lib/supportContact";

export default function LibraryLogin() {
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
  const librarySupportHref = buildWhatsAppSupportUrl(
    supportSettings?.whatsappNumber,
    t("libraryLogin.contactSupport"),
  ) || supportFallbackHref;
  const librarySupportIsExternal = librarySupportHref.startsWith("https://wa.me/");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({ title: t("libraryLogin.enterCredentialsRequired"), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/library/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || t("libraryLogin.loginFailed"));
      }

      localStorage.setItem("libraryToken", data.token);
      localStorage.setItem("libraryData", JSON.stringify(data.library));
      cacheAdultAccountSession({
        role: "library",
        token: data.token,
        accountId: data.library?.id || data.library?.username,
        displayName: data.library?.name || data.library?.username,
        dataValue: JSON.stringify(data.library || {}),
      });

      toast({ title: `${t("libraryLogin.welcome")} ${data.library.name}` });
      setLocation("/library/dashboard");
    } catch (error: any) {
      toast({ title: error.message || t("libraryLogin.loginFailed"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4 relative">
      <div className="absolute top-4 ltr:right-4 rtl:left-4 z-50"><LanguageSelector /></div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t("libraryLogin.title")}</CardTitle>
          <CardDescription>
            {t("libraryLogin.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("libraryLogin.username")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="library_user01"
                className="focus:placeholder-transparent"
                data-testid="input-library-login-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("libraryLogin.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Aa123456"
                  className="focus:placeholder-transparent"
                  data-testid="input-library-login-password"
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
              className="w-full"
              disabled={isLoading}
              data-testid="button-library-login"
            >
              {isLoading ? t("libraryLogin.loggingIn") : t("libraryLogin.login")}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>{t("libraryLogin.noAccount")}</p>
            <a
              href={librarySupportHref}
              target={librarySupportIsExternal ? "_blank" : undefined}
              rel={librarySupportIsExternal ? "noopener noreferrer" : undefined}
              className="text-primary hover:underline"
            >
              {t("libraryLogin.contactSupport")}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
