import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Info, ArrowLeft, ArrowRight, GraduationCap, Heart, Shield, Users, Star, Download, Gamepad2, Target, Clock3, BookOpenCheck } from "lucide-react";

export const AboutUs = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const narrative = isRTL
    ? {
      heroTitle: "شرح كامل منصة Classify",
      heroText:
        "Classify منصة تعليمية للأطفال تجمع بين الألعاب التعليمية، التدرج المهاري، ودعم الأسرة بخطوات واضحة. هدفنا بناء طفل واثق، منظم، ومحب للتعلم عبر تجربة آمنة ومرنة.",
      missionTitle: "كيف يعمل الموقع من البداية للنهاية؟",
      missionText:
        "تبدأ الرحلة من تحديد العمر، ثم يوجّه النظام الطفل أو ولي الأمر للمسار المناسب. الطفل يحصل على تجربة تعليمية تفاعلية تشمل ألعاب ذكاء، ذاكرة، رياضيات، تهجئة، ومهام مهارية. ولي الأمر يحصل على لوحة تحكم لمتابعة التقدم، تنظيم وقت الشاشة، وتقديم التحفيز بطريقة تربوية إيجابية.",
      supportTitle: "دور الأهل: دعم الأبناء لا مراقبتهم",
      supportText:
        "فلسفة Classify واضحة: الأهل يساندون أبناءهم ويبنون معهم عادات تعلم صحية، وليس الهدف المراقبة الصارمة. لذلك نعتمد على التوجيه، التشجيع، الأهداف التعليمية، والمكافآت الذكية بدل الضغط أو التتبع المرهق.",
      sectionsTitle: "ماذا ستجد داخل المنصة؟",
      linksTitle: "روابط مهمة داخل الموقع",
      seoTitle: "كلمات مفتاحية أساسية للبحث",
      copyright: "جميع الحقوق محفوظة",
    }
    : {
      heroTitle: "Complete Classify Platform Guide",
      heroText:
        "Classify is a kids educational platform that combines interactive learning games, step-by-step skill development, and family guidance. Our goal is to help children grow with confidence, focus, and healthy learning habits in a safe digital space.",
      missionTitle: "How the website works end to end",
      missionText:
        "The journey starts from age selection, then the system routes each user to the right child or parent path. Children get educational gameplay in math, memory, spelling, and core skills. Parents get clear guidance tools to support progress, set balanced screen time, and encourage learning through positive reinforcement.",
      supportTitle: "Parent role: support, not surveillance",
      supportText:
        "Classify is built on supportive parenting, not stressful monitoring. Parents guide children, celebrate progress, and create healthy routines using goals, encouragement, and educational rewards.",
      sectionsTitle: "What you can do inside Classify",
      linksTitle: "Important pages",
      seoTitle: "Core SEO keywords",
      copyright: "All rights reserved",
    };

  const values = [
    {
      icon: <Gamepad2 className="w-6 h-6" />,
      title: isRTL ? "ألعاب تعليمية تفاعلية" : "Interactive educational games",
      desc: isRTL
        ? "ألعاب تعليمية للأطفال في الرياضيات والذاكرة والتهجئة وبناء التفكير المنطقي."
        : "Educational games for kids in math, memory, spelling, and logical thinking.",
    },
    {
      icon: <Clock3 className="w-6 h-6" />,
      title: isRTL ? "تنظيم وقت الشاشة" : "Balanced screen-time guidance",
      desc: isRTL
        ? "تنظيم وقت الشاشة للأطفال مع توازن بين التعلم والراحة والمتابعة الإيجابية."
        : "Healthy screen-time support with balanced study, play, and rest routines.",
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: isRTL ? "مهام ومكافآت ذكية" : "Smart tasks and rewards",
      desc: isRTL
        ? "خطة تحفيز تعتمد على أهداف تعليمية واضحة ومكافآت تساعد الطفل على الاستمرار."
        : "Skill-oriented tasks and motivational rewards that reinforce learning goals.",
    },
    {
      icon: <BookOpenCheck className="w-6 h-6" />,
      title: isRTL ? "لوحة ولي الأمر" : "Parent dashboard and insights",
      desc: isRTL
        ? "متابعة تقدم الطفل، اكتشاف نقاط القوة، ودعمه بخطة تعلم أسرية عملية."
        : "Track child progress, discover strengths, and guide learning with family insights.",
    },
  ];

  const keywordCloud = [
    "تطبيق تعليمي للأطفال",
    "ألعاب تعليمية للأطفال",
    "kids educational app",
    "interactive learning games",
    "parental support app",
    "family guidance for children",
    "math games for kids",
    "memory games for children",
    "spelling games",
    "safe kids app",
    "screen time support",
    "مهام ومكافآت للأطفال",
    "تعليم الأطفال باللعب",
    "child progress tracking",
    "educational platform for families",
    "app for parents and kids",
    "learning habits for children",
    "child-safe educational technology",
  ];

  const importantLinks = [
    { href: "/download", label: isRTL ? "تحميل التطبيق" : "Download App" },
    { href: "/trial-games", label: isRTL ? "الألعاب التجريبية" : "Trial Games" },
    { href: "/parent-auth", label: isRTL ? "دخول ولي الأمر" : "Parent Access" },
    { href: "/child-link", label: isRTL ? "دخول الطفل" : "Child Access" },
    { href: "/legal", label: isRTL ? "المركز القانوني" : "Legal Center" },
    { href: "/child-safety", label: isRTL ? "سلامة الأطفال" : "Child Safety" },
    { href: "/privacy-policy", label: isRTL ? "سياسة الخصوصية" : "Privacy Policy" },
    { href: "/terms", label: isRTL ? "شروط الاستخدام" : "Terms" },
  ];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-teal-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-teal-600 to-emerald-700 text-white">
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
              <Info className="w-6 h-6" />
              <h1 className="text-xl md:text-2xl font-bold">{t("legal.about.pageTitle")}</h1>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className={`px-6 md:px-8 py-6 text-center ${isDark ? "bg-teal-900/20" : "bg-teal-50"}`}>
            <Star className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-teal-400" : "text-teal-600"}`} />
            <h2 className={`text-2xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
              {narrative.heroTitle}
            </h2>
            <p className={`text-lg leading-relaxed max-w-2xl mx-auto ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {narrative.heroText}
            </p>
          </div>
        </div>

        {/* Full Explanation */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-6">
            <h2 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              {narrative.missionTitle}
            </h2>
            <p className={`leading-relaxed mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {narrative.missionText}
            </p>
            <p className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {isRTL
                ? "يشمل الموقع صفحات أساسية مثل: تحميل التطبيق، الألعاب التجريبية، دخول ولي الأمر، دخول الطفل، المركز القانوني، وسياسات الأمان والخصوصية. كل صفحة مصممة لتقديم قيمة تعليمية واضحة وسهلة الفهم للعائلة."
                : "The website includes key pages such as app download, trial games, parent access, child access, legal center, and safety/privacy policies. Each section is designed to make educational value clear and actionable for families."}
            </p>
          </div>
        </div>

        {/* Parent Support Message */}
        <div className={`rounded-2xl shadow-lg overflow-hidden border ${isDark ? "bg-teal-900/20 border-teal-700/40" : "bg-teal-50 border-teal-200"}`}>
          <div className="px-6 md:px-8 py-6">
            <h2 className={`text-xl font-bold mb-3 ${isDark ? "text-teal-200" : "text-teal-900"}`}>
              {narrative.supportTitle}
            </h2>
            <p className={`leading-relaxed font-semibold ${isDark ? "text-teal-100" : "text-teal-800"}`}>
              {narrative.supportText}
            </p>
          </div>
        </div>

        {/* Values Grid */}
        <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{narrative.sectionsTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {values.map((v, idx) => (
            <div
              key={idx}
              className={`rounded-2xl shadow-lg p-6 ${isDark ? "bg-gray-800" : "bg-white"}`}
            >
              <div className={`p-3 rounded-xl inline-block mb-3 ${isDark ? "bg-teal-900/30 text-teal-400" : "bg-teal-100 text-teal-600"}`}>
                {v.icon}
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>{v.title}</h3>
              <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>{v.desc}</p>
            </div>
          ))}
        </div>

        {/* SEO Keywords */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-6">
            <h2 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>{narrative.seoTitle}</h2>
            <div className="flex flex-wrap gap-2">
              {keywordCloud.map((keyword) => (
                <span
                  key={keyword}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border ${isDark ? "bg-teal-900/25 border-teal-700/40 text-teal-100" : "bg-teal-50 border-teal-200 text-teal-800"}`}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Internal SEO Links */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-6">
            <h2 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>{narrative.linksTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {importantLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center justify-between rounded-xl border px-3 py-2 font-semibold transition-colors ${isDark ? "border-gray-700 bg-gray-900/40 text-gray-200 hover:bg-gray-700/40" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-teal-50"}`}
                >
                  <span>{item.label}</span>
                  <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Version */}
        <div className={`rounded-2xl shadow-lg px-6 md:px-8 py-5 text-center ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Classify v1.3.0 — {narrative.copyright}
          </p>
          <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            {isRTL
              ? "SEO Focus: kids educational app, family guidance, parental support, child safety, learning games"
              : "SEO Focus: kids educational app, family guidance, parental support, child safety, learning games"}
          </p>
        </div>
      </main>
    </div>
  );
};

export default AboutUs;
