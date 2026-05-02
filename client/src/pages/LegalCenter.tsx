import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Scale, ArrowLeft, ArrowRight, Shield, FileText, Cookie, Baby, CreditCard, ShieldAlert, UserX, Info, Phone } from "lucide-react";

const pages = {
  ar: [
    { href: "/privacy-policy", icon: <Shield className="w-6 h-6" />, title: "سياسة الخصوصية", desc: "كيف نجمع بياناتكم ونستخدمها ونحميها — GDPR, CCPA, COPPA", color: "blue", updated: "21 فبراير 2026" },
    { href: "/terms", icon: <FileText className="w-6 h-6" />, title: "شروط الاستخدام", desc: "الشروط والأحكام التي تحكم استخدام المنصة والخدمات", color: "purple", updated: "21 فبراير 2026" },
    { href: "/child-safety", icon: <Baby className="w-6 h-6" />, title: "سلامة الأطفال", desc: "التزاماتنا بحماية الأطفال — COPPA & GDPR-K", color: "green", updated: "21 فبراير 2026" },
    { href: "/cookie-policy", icon: <Cookie className="w-6 h-6" />, title: "سياسة ملفات الارتباط", desc: "كيف نستخدم ملفات تعريف الارتباط والتقنيات المشابهة", color: "amber", updated: "21 فبراير 2026" },
    { href: "/refund-policy", icon: <CreditCard className="w-6 h-6" />, title: "سياسة الاسترداد", desc: "شروط وأحكام استرداد الأموال وإلغاء الاشتراكات", color: "red", updated: "21 فبراير 2026" },
    { href: "/acceptable-use", icon: <ShieldAlert className="w-6 h-6" />, title: "الاستخدام المقبول", desc: "قواعد السلوك المسموح والمحظور على المنصة", color: "teal", updated: "21 فبراير 2026" },
    { href: "/delete-account", icon: <UserX className="w-6 h-6" />, title: "حذف الحساب", desc: "كيفية حذف حسابكم وبياناتكم بالكامل من المنصة", color: "gray", updated: "21 فبراير 2026" },
    { href: "/about", icon: <Info className="w-6 h-6" />, title: "من نحن", desc: "معلومات عن Classify ورؤيتنا ورسالتنا التعليمية", color: "indigo", updated: "21 فبراير 2026" },
    { href: "/contact", icon: <Phone className="w-6 h-6" />, title: "تواصل معنا", desc: "قنوات التواصل والدعم الفني", color: "sky", updated: "21 فبراير 2026" },
  ],
  en: [
    { href: "/privacy-policy", icon: <Shield className="w-6 h-6" />, title: "Privacy Policy", desc: "How we collect, use, and protect your data — GDPR, CCPA, COPPA", color: "blue", updated: "February 21, 2026" },
    { href: "/terms", icon: <FileText className="w-6 h-6" />, title: "Terms of Service", desc: "Terms and conditions governing platform and service use", color: "purple", updated: "February 21, 2026" },
    { href: "/child-safety", icon: <Baby className="w-6 h-6" />, title: "Child Safety", desc: "Our commitments to protecting children — COPPA & GDPR-K", color: "green", updated: "February 21, 2026" },
    { href: "/cookie-policy", icon: <Cookie className="w-6 h-6" />, title: "Cookie Policy", desc: "How we use cookies and similar technologies", color: "amber", updated: "February 21, 2026" },
    { href: "/refund-policy", icon: <CreditCard className="w-6 h-6" />, title: "Refund Policy", desc: "Terms and conditions for refunds and cancellations", color: "red", updated: "February 21, 2026" },
    { href: "/acceptable-use", icon: <ShieldAlert className="w-6 h-6" />, title: "Acceptable Use Policy", desc: "Rules of permitted and prohibited conduct on the platform", color: "teal", updated: "February 21, 2026" },
    { href: "/delete-account", icon: <UserX className="w-6 h-6" />, title: "Delete Account", desc: "How to delete your account and all data from the platform", color: "gray", updated: "February 21, 2026" },
    { href: "/about", icon: <Info className="w-6 h-6" />, title: "About Us", desc: "About Classify — our vision and educational mission", color: "indigo", updated: "February 21, 2026" },
    { href: "/contact", icon: <Phone className="w-6 h-6" />, title: "Contact Us", desc: "Support and communication channels", color: "sky", updated: "February 21, 2026" },
  ],
};

const colorMap: Record<string, { bg: string; bgDark: string; text: string; textDark: string; border: string; borderDark: string }> = {
  blue:   { bg: "bg-blue-50", bgDark: "bg-blue-900/20", text: "text-blue-600", textDark: "text-blue-400", border: "border-blue-200", borderDark: "border-blue-800" },
  purple: { bg: "bg-purple-50", bgDark: "bg-purple-900/20", text: "text-purple-600", textDark: "text-purple-400", border: "border-purple-200", borderDark: "border-purple-800" },
  green:  { bg: "bg-green-50", bgDark: "bg-green-900/20", text: "text-green-600", textDark: "text-green-400", border: "border-green-200", borderDark: "border-green-800" },
  amber:  { bg: "bg-amber-50", bgDark: "bg-amber-900/20", text: "text-amber-600", textDark: "text-amber-400", border: "border-amber-200", borderDark: "border-amber-800" },
  red:    { bg: "bg-red-50", bgDark: "bg-red-900/20", text: "text-red-600", textDark: "text-red-400", border: "border-red-200", borderDark: "border-red-800" },
  teal:   { bg: "bg-teal-50", bgDark: "bg-teal-900/20", text: "text-teal-600", textDark: "text-teal-400", border: "border-teal-200", borderDark: "border-teal-800" },
  gray:   { bg: "bg-gray-50", bgDark: "bg-gray-700/30", text: "text-gray-600", textDark: "text-gray-400", border: "border-gray-200", borderDark: "border-gray-700" },
  indigo: { bg: "bg-indigo-50", bgDark: "bg-indigo-900/20", text: "text-indigo-600", textDark: "text-indigo-400", border: "border-indigo-200", borderDark: "border-indigo-800" },
  sky:    { bg: "bg-sky-50", bgDark: "bg-sky-900/20", text: "text-sky-600", textDark: "text-sky-400", border: "border-sky-200", borderDark: "border-sky-800" },
};

export const LegalCenter = (): JSX.Element => {
  const { i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const lang = i18n.language === "ar" ? "ar" : "en";
  const isRTL = lang === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const p = lang === "ar" ? pages.ar : pages.en;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-slate-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-slate-700 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><BackArrow className="w-5 h-5" /></button>
            <div className="flex items-center gap-2"><Scale className="w-6 h-6" /><h1 className="text-xl md:text-2xl font-bold">{lang === "ar" ? "المركز القانوني" : "Legal Center"}</h1></div>
          </div>
          <LanguageSelector />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-8 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-6">
            <h2 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>{lang === "ar" ? "مرحبًا بكم في المركز القانوني" : "Welcome to the Legal Center"}</h2>
            <p className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {lang === "ar"
                ? "يضم هذا المركز جميع الوثائق القانونية والسياسات المتعلقة باستخدام منصة Classify. نلتزم بالشفافية الكاملة ونحرص على حماية حقوقكم وخصوصيتكم. يُرجى قراءة هذه المستندات بعناية قبل استخدام خدماتنا."
                : "This center contains all legal documents and policies related to using the Classify platform. We are committed to full transparency and protecting your rights and privacy. Please read these documents carefully before using our services."}
            </p>
            <div className={`mt-4 p-3 rounded-xl ${isDark ? "bg-green-900/20 border border-green-800" : "bg-green-50 border border-green-200"}`}>
              <p className={`text-sm ${isDark ? "text-green-400" : "text-green-700"}`}>
                {lang === "ar"
                  ? "✅ جميع السياسات متوافقة مع: قانون COPPA (حماية خصوصية الأطفال)، اللائحة العامة لحماية البيانات GDPR، قانون كاليفورنيا CCPA/CPRA، ومتطلبات Google Play و Apple App Store."
                  : "✅ All policies are compliant with: COPPA (Children's Online Privacy Protection Act), GDPR (General Data Protection Regulation), CCPA/CPRA (California Consumer Privacy Act), and Google Play & Apple App Store requirements."}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {p.map((page) => {
            const cm = colorMap[page.color] || colorMap.gray;
            return (
              <button
                key={page.href}
                onClick={() => navigate(page.href)}
                className={`rounded-2xl shadow-lg overflow-hidden text-start transition-all hover:shadow-xl hover:scale-[1.02] border ${isDark ? `${cm.bgDark} ${cm.borderDark}` : `${cm.bg} ${cm.border}`}`}
              >
                <div className="px-5 py-5">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isDark ? cm.textDark : cm.text} ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm`}>{page.icon}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-bold text-base mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{page.title}</h3>
                      <p className={`text-sm leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>{page.desc}</p>
                      <p className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{lang === "ar" ? "آخر تحديث" : "Updated"}: {page.updated}</p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className={`rounded-2xl shadow-lg overflow-hidden mt-8 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-5">
            <h3 className={`font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>{lang === "ar" ? "📬 تواصل معنا" : "📬 Contact Us"}</h3>
            <p className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {lang === "ar"
                ? "لأي استفسارات قانونية أو متعلقة بالخصوصية، يُرجى التواصل معنا:"
                : "For any legal or privacy-related inquiries, please contact us:"}
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: lang === "ar" ? "الدعم العام" : "General Support", email: "support@classi-fy.com" },
                { label: lang === "ar" ? "حماية البيانات" : "Data Protection", email: "privacy@classi-fy.com" },
                { label: lang === "ar" ? "سلامة الأطفال" : "Child Safety", email: "safety@classi-fy.com" },
                { label: lang === "ar" ? "الفوترة" : "Billing", email: "billing@classi-fy.com" },
              ].map(c => (
                <div key={c.email} className={`p-3 rounded-xl ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                  <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>{c.label}</p>
                  <p className={`text-sm font-mono ${isDark ? "text-blue-400" : "text-blue-600"}`}>{c.email}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="text-center py-6"><p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>© {new Date().getFullYear()} Classify by Proomnes. {lang === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}</p></div>
      </main>
    </div>
  );
};
