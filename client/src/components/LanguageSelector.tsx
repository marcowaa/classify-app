import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Globe, Check } from "lucide-react";

type MenuPosition = {
  top: number;
  left: number;
};

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 8 });

  const languages = [
    { code: "ar", name: "العربية", nativeName: "العربية" },
    { code: "en", name: "English", nativeName: "English" },
    { code: "pt", name: "Português", nativeName: "Português" },
    { code: "es", name: "Español", nativeName: "Español" },
    { code: "fr", name: "Français", nativeName: "Français" },
    { code: "de", name: "Deutsch", nativeName: "Deutsch" },
    { code: "tr", name: "Türkçe", nativeName: "Türkçe" },
    { code: "ru", name: "Русский", nativeName: "Русский" },
    { code: "zh", name: "中文", nativeName: "中文" },
    { code: "hi", name: "हिन्दी", nativeName: "हिन्दी" },
  ];

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = toggleButtonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const isRTL = i18n.language === "ar";
      const nextTop = rect.bottom + 8;
      const menuWidth = menuRef.current?.offsetWidth || 210;
      const preferredLeft = isRTL ? rect.right - menuWidth : rect.left;
      const minLeft = 8;
      const maxLeft = Math.max(minLeft, window.innerWidth - menuWidth - 8);
      const clampedLeft = Math.min(Math.max(preferredLeft, minLeft), maxLeft);

      setMenuPosition({ top: nextTop, left: clampedLeft });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [i18n.language, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const targetNode = e.target as Node;
      const clickedOutsideTrigger = containerRef.current && !containerRef.current.contains(targetNode);
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(targetNode);

      if (clickedOutsideTrigger && clickedOutsideMenu) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
    document.documentElement.dir = langCode === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = langCode;
    setIsOpen(false);
  };

  return (
    <div className="relative z-10" ref={containerRef}>
      <button
        ref={toggleButtonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={i18n.language === "ar" ? "تغيير اللغة" : "Change language"}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`group inline-flex items-center justify-center w-10 h-10 rounded-xl font-semibold transition-all duration-200 border ${
          isDark
            ? "bg-slate-900 hover:bg-slate-800 text-white border-slate-700"
            : "bg-white hover:bg-indigo-50 text-gray-800 border-indigo-100 shadow-sm"
        }`}
        data-testid="button-language-toggle"
      >
        <Globe className={`w-5 h-5 ${isDark ? "text-slate-300" : "text-indigo-600"}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={menuPosition}
          role="menu"
          className={`fixed min-w-max rounded-2xl shadow-2xl z-[12000] overflow-hidden border backdrop-blur-md ${
            isDark
              ? "bg-[#0b1b2c] border-cyan-200/35"
              : "bg-white border-indigo-200"
          }`}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              role="menuitemradio"
              aria-checked={i18n.language === lang.code}
              className={`w-full px-4 py-3 ${i18n.language === "ar" ? "text-right" : "text-left"} flex items-center gap-3 transition-all ${
                i18n.language === lang.code
                  ? isDark
                    ? "bg-cyan-100 text-[#072136] font-bold"
                    : "bg-indigo-100 text-indigo-900 font-bold"
                  : isDark
                    ? "text-cyan-50 hover:bg-cyan-900/30"
                    : "text-slate-800 hover:bg-indigo-50"
              }`}
              data-testid={`button-language-${lang.code}`}
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight">{lang.name}</p>
                <p className={`text-xs leading-tight ${isDark ? "text-cyan-100/85" : "text-slate-600"}`}>{lang.nativeName}</p>
              </div>
              {i18n.language === lang.code && (
                <Check className={`w-4.5 h-4.5 ${i18n.language === "ar" ? "mr-auto" : "ml-auto"}`} />
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
