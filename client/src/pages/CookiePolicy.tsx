import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Cookie, ArrowLeft, ArrowRight, Shield, Settings, BarChart3, Lock, Mail, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Content { title: string; subtitle: string; lastUpdated: string; intro: string; sections: { id: string; icon: string; title: string; paragraphs: string[]; items?: string[]; table?: { name: string; purpose: string; duration: string; type: string }[] }[] }

const ar: Content = {
  title: "سياسة ملفات تعريف الارتباط",
  subtitle: "كيف نستخدم ملفات تعريف الارتباط (Cookies) والتقنيات المشابهة",
  lastUpdated: "21 فبراير 2026",
  intro: "تُوضّح هذه السياسة كيفية استخدام Classify لملفات تعريف الارتباط (Cookies) وتقنيات التخزين المحلي والتقنيات المشابهة عند زيارة منصتنا أو استخدام خدماتنا. نحن نستخدم هذه التقنيات لضمان الأداء الأمثل للمنصة وتقديم تجربة مخصصة وآمنة.",
  sections: [
    { id: "what-are-cookies", icon: "Cookie", title: "ما هي ملفات تعريف الارتباط؟", paragraphs: ["ملفات تعريف الارتباط (Cookies) هي ملفات نصية صغيرة يتم حفظها على جهازكم (الكمبيوتر أو الهاتف أو الجهاز اللوحي) عند زيارة موقع إلكتروني. تُستخدم على نطاق واسع في تشغيل المواقع وتحسين أدائها وتقديم تجربة مخصصة.", "تقنيات مشابهة نستخدمها تشمل:"], items: ["ملفات تعريف الارتباط (HTTP Cookies): ملفات صغيرة يرسلها الخادم ويحفظها المتصفح.", "تخزين محلي (Local Storage): مساحة تخزين في المتصفح للبيانات التي لا تنتهي صلاحيتها تلقائيًا.", "تخزين الجلسة (Session Storage): مساحة تخزين مؤقتة تُمسح عند إغلاق المتصفح.", "رموز الجلسة (Session Tokens): معرّفات فريدة تُستخدم للحفاظ على حالة تسجيل الدخول."] },
    { id: "cookies-we-use", icon: "Settings", title: "ملفات تعريف الارتباط التي نستخدمها", paragraphs: ["فيما يلي تفصيل كامل لملفات تعريف الارتباط المستخدمة على المنصة:"], table: [
      { name: "connect.sid", purpose: "الحفاظ على جلسة تسجيل الدخول", duration: "24 ساعة", type: "ضروري" },
      { name: "device_refresh", purpose: "تجديد الجلسة تلقائيًا للأجهزة الموثوقة", duration: "30 يومًا", type: "ضروري" },
      { name: "oauth_state", purpose: "حماية من هجمات CSRF أثناء المصادقة", duration: "10 دقائق", type: "ضروري" },
      { name: "i18nextLng", purpose: "تذكّر اللغة المفضلة", duration: "سنة واحدة", type: "وظيفي" },
      { name: "theme", purpose: "تذكّر وضع العرض (مظلم / مضيء)", duration: "سنة واحدة", type: "وظيفي" },
    ] },
    { id: "cookie-types", icon: "Shield", title: "أنواع ملفات تعريف الارتباط", paragraphs: ["نُصنّف ملفات تعريف الارتباط التي نستخدمها إلى الفئات التالية:"], items: [
      "ملفات ضرورية (Essential): مطلوبة لتشغيل المنصة بشكل صحيح. بدونها لا يمكن تسجيل الدخول أو الوصول إلى الحسابات. لا يمكن تعطيلها.",
      "ملفات وظيفية (Functional): تُحسّن تجربة الاستخدام من خلال تذكر تفضيلاتكم مثل اللغة ووضع العرض. يمكن تعطيلها لكن قد تتأثر تجربتكم.",
      "ملفات تحليلية (Analytics): تُستخدم لفهم كيفية استخدام المنصة وتحسينها. نجمع هذه البيانات بشكل مجمّع ومجهول الهوية. حاليًا لا نستخدم أي أدوات تحليل خارجية.",
    ] },
    { id: "children-cookies", icon: "Shield", title: "ملفات تعريف الارتباط والأطفال", paragraphs: ["نتبع سياسة صارمة بشأن استخدام ملفات تعريف الارتباط مع حسابات الأطفال:"], items: [
      "نستخدم فقط ملفات تعريف الارتباط الضرورية لتشغيل المنصة (جلسة تسجيل الدخول).",
      "لا نستخدم أي ملفات تتبع أو تحليل على صفحات الأطفال.",
      "لا نستخدم أي ملفات تعريف ارتباط لأغراض إعلانية على صفحات الأطفال.",
      "لا نشارك أي بيانات ملفات تعريف الارتباط الخاصة بالأطفال مع أطراف ثالثة.",
    ] },
    { id: "manage-cookies", icon: "Settings", title: "كيفية إدارة ملفات تعريف الارتباط", paragraphs: ["يمكنكم التحكم في ملفات تعريف الارتباط من خلال:"], items: [
      "إعدادات المتصفح: تتيح معظم المتصفحات حظر أو حذف ملفات تعريف الارتباط من خلال الإعدادات. ابحثوا عن قسم \"الخصوصية\" أو \"ملفات تعريف الارتباط\" في إعدادات متصفحكم.",
      "Chrome: الإعدادات → الخصوصية والأمان → ملفات تعريف الارتباط والبيانات الأخرى.",
      "Firefox: الإعدادات → الخصوصية والأمان → ملفات تعريف الارتباط وبيانات المواقع.",
      "Safari: التفضيلات → الخصوصية → إدارة بيانات الموقع.",
      "Edge: الإعدادات → الخصوصية → ملفات تعريف الارتباط.",
      "تنبيه: قد يؤدي حذف ملفات تعريف الارتباط الضرورية إلى تسجيل خروجكم وفقدان بعض التفضيلات.",
    ] },
    { id: "third-party-cookies", icon: "Shield", title: "ملفات تعريف الارتباط من أطراف ثالثة", paragraphs: ["حاليًا، لا نستخدم أي ملفات تعريف ارتباط من أطراف ثالثة على منصتنا. جميع ملفات تعريف الارتباط هي \"ملفات الطرف الأول\" (First-Party Cookies) — أي أنها صادرة من نطاق classi-fy.com فقط.", "إذا قررنا في المستقبل استخدام أي خدمات أطراف ثالثة تتطلب ملفات تعريف ارتباط (مثل أدوات التحليل)، سنحدّث هذه السياسة مسبقًا ونطلب موافقتكم."] },
    { id: "updates", icon: "Settings", title: "التحديثات على هذه السياسة", paragraphs: ["قد نقوم بتحديث سياسة ملفات تعريف الارتباط من وقت لآخر. سنُخطركم بأي تغييرات جوهرية عبر إشعار على المنصة. ننصحكم بمراجعة هذه الصفحة بانتظام."] },
    { id: "contact", icon: "Mail", title: "التواصل معنا", paragraphs: ["لأي استفسارات حول ملفات تعريف الارتباط:"], items: ["البريد الإلكتروني: support@classi-fy.com", "مسؤول حماية البيانات: privacy@classi-fy.com"] },
  ],
};

const enContent: Content = {
  title: "Cookie Policy",
  subtitle: "How We Use Cookies and Similar Technologies",
  lastUpdated: "February 21, 2026",
  intro: "This policy explains how Classify uses cookies, local storage, and similar technologies when you visit our platform or use our services. We use these technologies to ensure optimal platform performance and deliver a personalized, secure experience.",
  sections: [
    { id: "what-are-cookies", icon: "Cookie", title: "What Are Cookies?", paragraphs: ["Cookies are small text files saved on your device (computer, phone, or tablet) when you visit a website. They are widely used to operate websites, improve their performance, and deliver personalized experiences.", "Similar technologies we use include:"], items: ["HTTP Cookies: Small files sent by the server and stored by the browser.", "Local Storage: Browser storage for data that doesn't expire automatically.", "Session Storage: Temporary storage cleared when the browser is closed.", "Session Tokens: Unique identifiers used to maintain login state."] },
    { id: "cookies-we-use", icon: "Settings", title: "Cookies We Use", paragraphs: ["Below is a complete breakdown of cookies used on our platform:"], table: [
      { name: "connect.sid", purpose: "Maintain login session", duration: "24 hours", type: "Essential" },
      { name: "device_refresh", purpose: "Auto-renew session for trusted devices", duration: "30 days", type: "Essential" },
      { name: "oauth_state", purpose: "Protection against CSRF attacks during authentication", duration: "10 minutes", type: "Essential" },
      { name: "i18nextLng", purpose: "Remember preferred language", duration: "1 year", type: "Functional" },
      { name: "theme", purpose: "Remember display mode (dark/light)", duration: "1 year", type: "Functional" },
    ] },
    { id: "cookie-types", icon: "Shield", title: "Types of Cookies", paragraphs: ["We categorize the cookies we use into the following groups:"], items: [
      "Essential Cookies: Required for proper platform operation. Without them, login and account access are not possible. Cannot be disabled.",
      "Functional Cookies: Enhance the user experience by remembering preferences such as language and display mode. Can be disabled but may affect your experience.",
      "Analytics Cookies: Used to understand how the platform is used and improve it. Data is collected in aggregate and anonymized form. Currently, we do not use any external analytics tools.",
    ] },
    { id: "children-cookies", icon: "Shield", title: "Cookies and Children", paragraphs: ["We follow a strict policy regarding cookie use with children's accounts:"], items: [
      "We use only essential cookies required for platform operation (login session).",
      "We do not use any tracking or analytics cookies on children's pages.",
      "We do not use any advertising cookies on children's pages.",
      "We do not share any children's cookie data with third parties.",
    ] },
    { id: "manage-cookies", icon: "Settings", title: "How to Manage Cookies", paragraphs: ["You can control cookies through:"], items: [
      "Browser Settings: Most browsers allow blocking or deleting cookies through settings. Look for the \"Privacy\" or \"Cookies\" section in your browser settings.",
      "Chrome: Settings → Privacy and Security → Cookies and other site data.",
      "Firefox: Settings → Privacy & Security → Cookies and Site Data.",
      "Safari: Preferences → Privacy → Manage Website Data.",
      "Edge: Settings → Privacy → Cookies.",
      "Note: Deleting essential cookies may log you out and cause loss of some preferences.",
    ] },
    { id: "third-party-cookies", icon: "Shield", title: "Third-Party Cookies", paragraphs: ["Currently, we do not use any third-party cookies on our platform. All cookies are first-party cookies issued from the classi-fy.com domain only.", "If we decide in the future to use any third-party services requiring cookies (such as analytics tools), we will update this policy in advance and request your consent."] },
    { id: "updates", icon: "Settings", title: "Updates to This Policy", paragraphs: ["We may update this Cookie Policy from time to time. We will notify you of any material changes via a notice on the platform. We recommend reviewing this page regularly."] },
    { id: "contact", icon: "Mail", title: "Contact Us", paragraphs: ["For any inquiries about cookies:"], items: ["Email: support@classi-fy.com", "Data Protection Officer: privacy@classi-fy.com"] },
  ],
};

const iconMap: Record<string, JSX.Element> = { Cookie: <Cookie className="w-5 h-5" />, Settings: <Settings className="w-5 h-5" />, Shield: <Shield className="w-5 h-5" />, BarChart3: <BarChart3 className="w-5 h-5" />, Lock: <Lock className="w-5 h-5" />, Mail: <Mail className="w-5 h-5" /> };

export const CookiePolicy = (): JSX.Element => {
  const { i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const lang = i18n.language === "ar" ? "ar" : "en";
  const isRTL = lang === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const c = lang === "ar" ? ar : enContent;
  const [openToc, setOpenToc] = useState(false);

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-amber-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-amber-600 to-orange-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><BackArrow className="w-5 h-5" /></button>
            <div className="flex items-center gap-2"><Cookie className="w-6 h-6" /><h1 className="text-xl md:text-2xl font-bold">{c.title}</h1></div>
          </div>
          <LanguageSelector />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className={`px-6 md:px-8 py-5 ${isDark ? "border-b border-gray-700" : "bg-amber-50 border-b border-amber-100"}`}>
            <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Classify — {c.subtitle}</p>
            <p className={`text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{lang === "ar" ? "آخر تحديث" : "Last Updated"}: {c.lastUpdated}</p>
          </div>
          <div className="px-6 md:px-8 py-6"><p className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>{c.intro}</p></div>
        </div>
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <button onClick={() => setOpenToc(!openToc)} className={`w-full px-6 md:px-8 py-4 flex items-center justify-between transition-colors`}>
            <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{lang === "ar" ? "📑 جدول المحتويات" : "📑 Table of Contents"}</h2>
            <ChevronDown className={`w-5 h-5 transition-transform ${openToc ? "rotate-180" : ""}`} />
          </button>
          {openToc && (<div className={`px-6 md:px-8 pb-5 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}><ol className="pt-3 space-y-1.5">{c.sections.map((s, i) => (<li key={s.id}><a href={`#${s.id}`} className={`text-sm hover:underline ${isDark ? "text-amber-400" : "text-amber-600"}`}>{i + 1}. {s.title}</a></li>))}</ol></div>)}
        </div>
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-6 space-y-8">
            {c.sections.map((section, idx) => (
              <section key={section.id} id={section.id}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg shrink-0 ${isDark ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-600"}`}>{iconMap[section.icon] || <Cookie className="w-5 h-5" />}</div>
                  <h2 className={`text-lg md:text-xl font-bold pt-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>{idx + 1}. {section.title}</h2>
                </div>
                <div className={`${isRTL ? "pr-12" : "pl-12"}`}>
                  {section.paragraphs.map((p, pi) => (<p key={pi} className={`leading-relaxed mb-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{p}</p>))}
                  {section.items && (<ul className="space-y-2 mb-4">{section.items.map((item, i) => (<li key={i} className={`flex items-start gap-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}><span className="text-amber-500 mt-1.5 shrink-0">•</span><span className="leading-relaxed">{item}</span></li>))}</ul>)}
                  {section.table && (
                    <div className="overflow-x-auto mb-4">
                      <table className={`w-full text-sm border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                        <thead><tr className={isDark ? "bg-gray-750" : "bg-gray-50"}>
                          <th className={`px-3 py-2 text-start font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>{lang === "ar" ? "الاسم" : "Name"}</th>
                          <th className={`px-3 py-2 text-start font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>{lang === "ar" ? "الغرض" : "Purpose"}</th>
                          <th className={`px-3 py-2 text-start font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>{lang === "ar" ? "المدة" : "Duration"}</th>
                          <th className={`px-3 py-2 text-start font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>{lang === "ar" ? "النوع" : "Type"}</th>
                        </tr></thead>
                        <tbody>{section.table.map((row, ri) => (
                          <tr key={ri} className={isDark ? "border-t border-gray-700" : "border-t border-gray-200"}>
                            <td className={`px-3 py-2 font-mono text-xs ${isDark ? "text-amber-400" : "text-amber-700"}`}>{row.name}</td>
                            <td className={`px-3 py-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{row.purpose}</td>
                            <td className={`px-3 py-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{row.duration}</td>
                            <td className={`px-3 py-2`}><span className={`px-2 py-0.5 rounded text-xs font-medium ${row.type === "ضروري" || row.type === "Essential" ? (isDark ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700") : (isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700")}`}>{row.type}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
                {idx < c.sections.length - 1 && <div className={`mt-6 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`} />}
              </section>
            ))}
          </div>
        </div>
        <div className="text-center py-6"><p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>© {new Date().getFullYear()} Classify by Proomnes.</p></div>
      </main>
    </div>
  );
};
