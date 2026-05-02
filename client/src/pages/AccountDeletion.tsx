import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { UserX, ArrowLeft, ArrowRight, AlertTriangle, CheckCircle, Mail, Shield, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const AccountDeletion = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const isRTL = i18n.language === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    if (!email || !password || !confirmed) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/parent/delete-account", { confirmPassword: password });
      if (res.ok) {
        setDeleted(true);
      } else {
        const data = await res.json();
        toast({
          title: t("legal.deletion.errorTitle"),
          description: data.message || t("legal.deletion.errorGeneric"),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t("legal.deletion.errorTitle"),
        description: t("legal.deletion.errorGeneric"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (deleted) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-red-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
        <div className={`max-w-md mx-auto p-8 text-center rounded-2xl shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            {t("legal.deletion.successTitle")}
          </h2>
          <p className={`mb-6 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            {t("legal.deletion.successText")}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t("legal.deletion.goHome")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-red-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label={t("common.back")}
            >
              <BackArrow className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <UserX className="w-6 h-6" />
              <h1 className="text-xl md:text-2xl font-bold">{t("legal.deletion.pageTitle")}</h1>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Info Card */}
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className={`px-6 py-5 ${isDark ? "bg-red-900/20 border-b border-gray-700" : "bg-red-50 border-b border-red-100"}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
              <p className={`font-semibold ${isDark ? "text-red-400" : "text-red-700"}`}>
                {t("legal.deletion.warningTitle")}
              </p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">
            <p className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {t("legal.deletion.warningText")}
            </p>

            <div className={`rounded-xl p-4 ${isDark ? "bg-gray-750 border border-gray-700" : "bg-gray-50 border border-gray-200"}`}>
              <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("legal.deletion.whatDeletedTitle")}
              </h3>
              <ul className="space-y-2">
                {[
                  t("legal.deletion.deleted1"),
                  t("legal.deletion.deleted2"),
                  t("legal.deletion.deleted3"),
                  t("legal.deletion.deleted4"),
                  t("legal.deletion.deleted5"),
                ].map((item, i) => (
                  <li key={i} className={`flex items-start gap-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    <Trash2 className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`rounded-xl p-4 ${isDark ? "bg-blue-900/20 border border-blue-800" : "bg-blue-50 border border-blue-200"}`}>
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <p className={`text-sm ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                  {t("legal.deletion.timeframeNote")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Deletion Form */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 py-6 space-y-5">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {t("legal.deletion.emailLabel")}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white focus:border-red-500"
                    : "bg-white border-gray-300 text-gray-900 focus:border-red-500"
                } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                placeholder={t("legal.deletion.emailPlaceholder")}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {t("legal.deletion.passwordLabel")}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white focus:border-red-500"
                    : "bg-white border-gray-300 text-gray-900 focus:border-red-500"
                } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                placeholder={t("legal.deletion.passwordPlaceholder")}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                {t("legal.deletion.confirmCheckbox")}
              </span>
            </label>

            <button
              onClick={handleDelete}
              disabled={!email || !password || !confirmed || loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                !email || !password || !confirmed || loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 active:bg-red-800"
              }`}
            >
              {loading ? t("legal.deletion.deleting") : t("legal.deletion.deleteButton")}
            </button>

            <div className={`text-center pt-2 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <p className={`text-sm mb-3 pt-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("legal.deletion.orEmailText")}
              </p>
              <a
                href="mailto:support@classi-fy.com?subject=Account%20Deletion%20Request"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium border transition-colors ${
                  isDark
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Mail className="w-4 h-4" />
                {t("legal.deletion.emailRequest")}
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AccountDeletion;
