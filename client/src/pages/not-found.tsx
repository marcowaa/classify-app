import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { Search, Home, ArrowLeft, ArrowRight } from "lucide-react";

export default function NotFound() {
  const { t, i18n } = useTranslation();
  const [location, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const parentClassification = String(localStorage.getItem("parentAccountClassification") || "").trim().toUpperCase();
  const hasChildToken = Boolean(localStorage.getItem("childToken"));
  const hasParentToken = Boolean(localStorage.getItem("token"));
  const isParentTrial = parentClassification === "PARENT_TRIAL";
  const isChildTrial = Boolean(localStorage.getItem("childAccountClassification") === "CHILD_TRIAL" || (hasChildToken && !hasParentToken));
  const trialNotice = isChildTrial ? "link-parent" : "complete-account";
  const trialRegistrationPath = `/parent-auth?mode=register&notice=${trialNotice}&from=${encodeURIComponent(location || "/")}`;

  const resolveRecommendedPath = (): string => {
    const currentPath = String(location || "/").toLowerCase();

    if (currentPath.startsWith("/parent") || currentPath.startsWith("/wallet") || currentPath.startsWith("/subjects") || currentPath.startsWith("/notifications")) {
      return hasParentToken ? "/parent-dashboard" : "/parent-auth";
    }

    if (currentPath.startsWith("/child")) {
      return hasChildToken ? "/child-games" : "/child-link";
    }

    if (currentPath.startsWith("/library")) {
      return "/library/login";
    }

    if (currentPath.startsWith("/teacher")) {
      return "/teacher/login";
    }

    if (currentPath.startsWith("/school")) {
      return "/school/login";
    }

    if (currentPath.startsWith("/admin")) {
      return "/admin";
    }

    return "/";
  };

  const recommendedPath = resolveRecommendedPath();

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 via-white to-purple-50"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-md w-full text-center">
        {/* Illustration */}
        <div className="relative mb-8">
          <div className={`text-[120px] md:text-[160px] font-black leading-none select-none ${isDark ? "text-gray-800" : "text-gray-100"}`}>
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`p-5 rounded-full ${isDark ? "bg-blue-900/30" : "bg-blue-100"}`}>
              <Search className={`w-12 h-12 ${isDark ? "text-blue-400" : "text-blue-500"}`} />
            </div>
          </div>
        </div>

        {/* Text */}
        <h1 className={`text-2xl md:text-3xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
          {t("notFound.title")}
        </h1>
        <p className={`mb-8 leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {t("notFound.description")}
        </p>

        {(isParentTrial || isChildTrial) && (
          <p className={`mb-5 text-sm font-semibold ${isDark ? "text-amber-200" : "text-amber-700"}`}>
            {isChildTrial
              ? t("parentAuth.linkParentNotice", "This feature needs a linked parent account. Please create one to continue.")
              : t("parentAuth.completeAccountNotice", "To continue this page, create or complete your parent account first.")}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              if (isParentTrial || isChildTrial) {
                navigate(trialRegistrationPath);
                return;
              }
              navigate(recommendedPath);
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg shadow-blue-500/25"
          >
            <Home className="w-5 h-5" />
            {(isParentTrial || isChildTrial)
              ? t("parentAuth.register", "Create Account")
              : t("notFound.goHome")}
          </button>
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate(recommendedPath)}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border transition-colors ${isDark
                ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
          >
            <BackArrow className="w-5 h-5" />
            {t("notFound.goBack")}
          </button>
        </div>
      </div>
    </div>
  );
}
