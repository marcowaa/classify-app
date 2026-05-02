import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";

export const AdminAuth = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const isRTL = i18n.language === 'ar';

  const pageShellClass = isDark
    ? "bg-gradient-to-b from-slate-950 via-slate-900 to-gray-900"
    : "bg-gradient-to-b from-sky-50 via-cyan-50 to-emerald-50";
  const cardClass = isDark
    ? "border border-white/10 bg-slate-900/85 backdrop-blur-xl shadow-[0_28px_48px_-28px_rgba(0,0,0,0.92)]"
    : "border border-white/70 bg-white/94 backdrop-blur-xl shadow-[0_28px_48px_-28px_rgba(15,23,42,0.68)]";
  const elevatedButtonClass = isDark
    ? "rounded-2xl border border-white/10 shadow-[0_14px_22px_-14px_rgba(0,0,0,0.85)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]"
    : "rounded-2xl border border-white/40 shadow-[0_14px_22px_-14px_rgba(15,23,42,0.55)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]";
  const primaryButtonClass = "bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-600 text-white";
  const secondaryButtonClass = isDark
    ? "bg-slate-800 hover:bg-slate-700 text-gray-200"
    : "bg-gray-100 hover:bg-gray-200 text-gray-800";
  const inputClass = isDark
    ? "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
    : "w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500";

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error("Login failed");
      return res.json();
    },
    onSuccess: (data) => {
      const token = data?.data?.token;
      if (!token) {
        throw new Error("Login failed");
      }
      localStorage.setItem("adminToken", token);
      navigate("/admin-dashboard");
    },
    onError: () => toast({ title: t("admin.invalidCredentials"), variant: "destructive" }),
  });

  const forgotMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: forgotUsername }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      const masked = data?.data?.maskedEmail;
      if (masked) {
        setForgotMessage(t("adminAuth.recoverySentTo", { email: masked }));
      } else {
        setForgotMessage(t("adminAuth.recoveryGeneric"));
      }
    },
  });

  if (showForgot) {
    return (
      <div className={`relative min-h-screen overflow-x-clip px-3 py-6 sm:px-6 sm:py-10 ${pageShellClass}`} dir={isRTL ? "rtl" : "ltr"}>
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={`absolute -top-16 ${isRTL ? "-left-16" : "-right-16"} h-64 w-64 rounded-full ${isDark ? "bg-cyan-500/18" : "bg-cyan-300/45"} blur-3xl`} />
          <div className={`absolute top-1/3 ${isRTL ? "-right-16" : "-left-16"} h-72 w-72 rounded-full ${isDark ? "bg-emerald-500/12" : "bg-emerald-200/55"} blur-3xl`} />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md">
          <div className="mb-3 flex items-center justify-end">
            <LanguageSelector />
          </div>

          <div className={`rounded-3xl p-6 sm:p-8 ${cardClass}`}>
            <h1 className={`text-2xl sm:text-3xl font-extrabold text-center mb-5 ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("adminAuth.recoverPassword")}
            </h1>

            <div className={`p-4 rounded-2xl mb-6 ${isDark ? "bg-slate-800 text-slate-300" : "bg-sky-50 text-sky-700"}`}>
              <p className="text-sm">{t("adminAuth.recoverInstructions")}</p>
            </div>

            {forgotMessage && (
              <div className={`p-3 rounded-2xl mb-4 border ${isDark ? "bg-green-900/25 border-green-700 text-green-300" : "bg-green-50 border-green-300 text-green-700"}`}>
                <p className="text-sm">{forgotMessage}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className={`mb-2 block font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("adminAuth.username")}
                </label>
                <input
                  type="text"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  autoComplete="username"
                  className={inputClass}
                  placeholder={t("adminAuth.usernamePlaceholder")}
                />
              </div>

              <button
                type="button"
                onClick={() => forgotMutation.mutate()}
                disabled={!forgotUsername || forgotMutation.isPending}
                className={`min-h-11 w-full px-4 py-2.5 font-bold disabled:opacity-50 ${elevatedButtonClass} ${primaryButtonClass}`}
              >
                {forgotMutation.isPending ? t("adminAuth.sending") : t("adminAuth.sendRecoveryLink")}
              </button>

              <button
                type="button"
                onClick={() => { setShowForgot(false); setForgotMessage(""); }}
                className={`min-h-11 w-full px-4 py-2.5 font-bold ${elevatedButtonClass} ${secondaryButtonClass}`}
              >
                {t("adminAuth.backToLogin")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen overflow-x-clip px-3 py-6 sm:px-6 sm:py-10 ${pageShellClass}`} dir={isRTL ? "rtl" : "ltr"}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-16 ${isRTL ? "-left-16" : "-right-16"} h-64 w-64 rounded-full ${isDark ? "bg-cyan-500/18" : "bg-cyan-300/45"} blur-3xl`} />
        <div className={`absolute top-1/3 ${isRTL ? "-right-16" : "-left-16"} h-72 w-72 rounded-full ${isDark ? "bg-emerald-500/12" : "bg-emerald-200/55"} blur-3xl`} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-3 flex items-center justify-end">
          <LanguageSelector />
        </div>

        <div className={`rounded-3xl p-6 sm:p-8 ${cardClass}`}>
          <h1 className={`text-3xl font-extrabold text-center mb-7 ${isDark ? "text-white" : "text-gray-800"}`}>
            {t("admin.panelTitle")}
          </h1>

          <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-5">
            <div className={`p-4 rounded-2xl ${isDark ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600"}`}>
              <p className="text-sm">{t("admin.enterCredentials")}</p>
            </div>

            <div>
              <label className={`mb-2 block font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                {t("admin.username")}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className={inputClass}
                placeholder="admin_user"
                data-testid="input-admin-username"
              />
            </div>

            <div>
              <label className={`mb-2 block font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                {t("admin.password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={inputClass}
                placeholder="Aa123456"
                data-testid="input-admin-password"
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className={`min-h-11 w-full px-4 py-2.5 font-bold disabled:opacity-50 ${elevatedButtonClass} ${primaryButtonClass}`}
              data-testid="button-admin-login"
            >
              {t("admin.login")}
            </button>

            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className={`w-full text-sm text-center font-semibold ${isDark ? "text-cyan-300 hover:text-cyan-200" : "text-blue-700 hover:text-blue-800"}`}
            >
              {t("admin.forgotPassword")}
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className={`min-h-11 w-full px-4 py-2.5 font-bold ${elevatedButtonClass} ${secondaryButtonClass}`}
              data-testid="link-back-home"
            >
              {t("admin.backToHome")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
