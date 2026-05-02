import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Mail, ArrowLeft, ArrowRight, MessageSquare, Globe, Clock, MapPin } from "lucide-react";

export const ContactUs = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const channels = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: t("legal.contact.emailTitle"),
      detail: "support@classi-fy.com",
      href: "mailto:support@classi-fy.com",
      color: "blue",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: t("legal.contact.websiteTitle"),
      detail: "classi-fy.com",
      href: "https://classi-fy.com",
      color: "teal",
    },
  ];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-orange-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">
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
              <MessageSquare className="w-6 h-6" />
              <h1 className="text-xl md:text-2xl font-bold">{t("legal.contact.pageTitle")}</h1>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Intro */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-6 text-center">
            <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-orange-400" : "text-orange-500"}`} />
            <h2 className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
              {t("legal.contact.introTitle")}
            </h2>
            <p className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {t("legal.contact.introText")}
            </p>
          </div>
        </div>

        {/* Channels */}
        <div className="space-y-4">
          {channels.map((ch, idx) => (
            <a
              key={idx}
              href={ch.href}
              target={ch.href.startsWith("http") ? "_blank" : undefined}
              rel={ch.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className={`block rounded-2xl shadow-lg p-5 transition-transform hover:scale-[1.01] ${isDark ? "bg-gray-800 hover:bg-gray-750" : "bg-white hover:bg-gray-50"}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${
                  ch.color === "blue"
                    ? isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"
                    : isDark ? "bg-teal-900/30 text-teal-400" : "bg-teal-100 text-teal-600"
                }`}>
                  {ch.icon}
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{ch.title}</h3>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{ch.detail}</p>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Response Time */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 py-5">
            <div className="flex items-start gap-3">
              <Clock className={`w-5 h-5 mt-0.5 shrink-0 ${isDark ? "text-orange-400" : "text-orange-500"}`} />
              <div>
                <h3 className={`font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                  {t("legal.contact.responseTitle")}
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {t("legal.contact.responseText")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 py-5">
            <div className="flex items-start gap-3">
              <MapPin className={`w-5 h-5 mt-0.5 shrink-0 ${isDark ? "text-orange-400" : "text-orange-500"}`} />
              <div>
                <h3 className={`font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                  {t("legal.contact.locationTitle")}
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {t("legal.contact.locationText")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContactUs;
