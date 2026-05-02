import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";

export const AccessibilityPolicy = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === 'ar';

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-green-700 to-green-800 text-white p-4 md:p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t("accessibility.title")}</h1>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate("/settings");
                }
              }}
              className="px-4 py-2 bg-white text-green-700 font-bold rounded-lg hover:bg-gray-100"
            >
              ← {t("accessibility.back")}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 mt-8">
        <article className={`${isDark ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"} rounded-lg p-8 shadow-lg`}>
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{t("accessibility.commitmentTitle")}</h2>
            <p>{t("accessibility.commitmentText")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{t("accessibility.standardsTitle")}</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>{t("accessibility.standard1")}</li>
              <li>{t("accessibility.standard2")}</li>
              <li>{t("accessibility.standard3")}</li>
              <li>{t("accessibility.standard4")}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{t("accessibility.featuresTitle")}</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>{t("accessibility.feature1")}</li>
              <li>{t("accessibility.feature2")}</li>
              <li>{t("accessibility.feature3")}</li>
              <li>{t("accessibility.feature4")}</li>
              <li>{t("accessibility.feature5")}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{t("accessibility.improvementsTitle")}</h2>
            <p className="mb-4">{t("accessibility.improvementsText")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{t("accessibility.reportTitle")}</h2>
            <p className="mb-4">{t("accessibility.reportText")}</p>
          </section>
        </article>
      </main>
    </div>
  );
};
