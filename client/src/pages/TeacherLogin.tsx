import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";
import { cacheAdultAccountSession } from "@/lib/adultAccountSessions";

export default function TeacherLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({ title: t("teacherLogin.enterCredentialsRequired"), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || t("teacherLogin.loginFailed"));
      }

      localStorage.setItem("teacherToken", data.token);
      localStorage.setItem("teacherData", JSON.stringify(data.teacher));
      cacheAdultAccountSession({
        role: "teacher",
        token: data.token,
        accountId: data.teacher?.id || data.teacher?.username,
        displayName: data.teacher?.name || data.teacher?.username,
        dataValue: JSON.stringify(data.teacher || {}),
      });

      toast({ title: `${t("teacherLogin.welcome")} ${data.teacher.name}` });
      setLocation("/teacher/dashboard");
    } catch (error: any) {
      toast({ title: error.message || t("teacherLogin.loginFailed"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 relative">
      <div className="absolute top-4 ltr:right-4 rtl:left-4 z-50"><LanguageSelector /></div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{t("teacherLogin.title")}</CardTitle>
          <CardDescription>
            {t("teacherLogin.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("teacherLogin.username")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="teacher_001"
                className="focus:placeholder-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("teacherLogin.password")}</Label>
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
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? t("teacherLogin.loggingIn") : t("teacherLogin.login")}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>{t("teacherLogin.accountCreatedBySchool")}</p>
            <p className="text-xs mt-1">{t("teacherLogin.contactSchoolAdmin")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
