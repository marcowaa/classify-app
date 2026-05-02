import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ShieldAlert, ArrowLeft, ArrowRight, Ban, AlertTriangle, Shield, Users, Mail, Lock, ChevronDown, Gavel } from "lucide-react";
import { useState } from "react";

const ar = {
  title: "سياسة الاستخدام المقبول",
  subtitle: "قواعد السلوك المسموح والمحظور على المنصة",
  lastUpdated: "21 فبراير 2026",
  version: "الإصدار 2.0",
  intro: "تحدد سياسة الاستخدام المقبول القواعد والمعايير التي يجب على جميع مستخدمي Classify الالتزام بها. تهدف هذه السياسة لضمان بيئة آمنة وتعليمية ومحترمة لجميع المستخدمين، وخاصة الأطفال. أي انتهاك لهذه السياسة قد يؤدي إلى تعليق أو إنهاء حسابكم.",
  sections: [
    {
      id: "acceptable-use", icon: "Shield", title: "الاستخدام المقبول", paragraphs: ["يُسمح باستخدام منصة Classify للأغراض التالية فقط:"], items: [
        "الوصول إلى المحتوى التعليمي والألعاب المعرفية المقدمة من المنصة.",
        "إنشاء وإدارة حسابات أطفالكم ومتابعة تقدمهم التعليمي.",
        "التفاعل مع الميزات التعليمية بما يتوافق مع شروط الاستخدام.",
        "مشاركة إنجازات أطفالكم التعليمية داخل المنصة.",
        "التواصل مع فريق الدعم لحل المشكلات أو الاستفسارات.",
        "استخدام أدوات الإشراف العائلي لتنظيم تجربة أطفالكم.",
      ]
    },
    {
      id: "prohibited-content", icon: "Ban", title: "المحتوى المحظور", paragraphs: ["يُحظر تمامًا نشر أو إرسال أو تخزين أو مشاركة أي محتوى يتضمن:"], items: [
        "مواد إباحية أو جنسية أو تستغل الأطفال بأي شكل.",
        "محتوى عنيف أو دموي أو يحرّض على العنف.",
        "خطاب كراهية أو محتوى عنصري أو تمييزي بناءً على العرق أو الدين أو الجنس أو الإعاقة.",
        "تهديدات أو مضايقات أو تنمر أو ترهيب لأي شخص.",
        "مواد تنتهك حقوق الملكية الفكرية للآخرين (حقوق النشر، العلامات التجارية).",
        "معلومات شخصية لأطراف ثالثة دون موافقتهم (doxxing).",
        "محتوى احتيالي أو مضلل أو معلومات مغلوطة عن قصد.",
        "ترويج للمخدرات أو الكحول أو التبغ أو المواد الخطرة.",
        "محتوى ديني أو سياسي متطرف أو يحرّض على الكراهية.",
        "إعلانات أو رسائل ترويجية غير مصرح بها (spam).",
      ]
    },
    {
      id: "prohibited-actions", icon: "AlertTriangle", title: "الأفعال المحظورة", paragraphs: ["يُحظر تمامًا القيام بأي من الأفعال التالية:"], items: [
        "محاولة الوصول غير المصرح به إلى حسابات أو بيانات مستخدمين آخرين.",
        "استخدام أدوات أو برامج لاختراق المنصة أو استغلال ثغراتها الأمنية.",
        "إجراء هندسة عكسية أو تفكيك أو محاولة استخراج كود المنصة المصدري.",
        "التلاعب بنتائج الألعاب أو التقارير التعليمية بطرق غير مشروعة.",
        "إنشاء حسابات وهمية أو استخدام هويات مزيفة.",
        "انتحال شخصية موظفي Classify أو أي شخص آخر.",
        "استخدام المنصة لأغراض تجارية غير مصرح بها.",
        "نقل أو بيع حسابكم أو أي بيانات من المنصة لأطراف ثالثة.",
        "تعطيل أو التدخل في عمل المنصة أو تأثيرها على المستخدمين الآخرين (مثل هجمات DDoS أو الحمل الزائد).",
        "استخدام المنصة لجمع بيانات المستخدمين الآخرين (web scraping).",
        "تجاوز أو محاولة تعطيل أي تدابير أمنية أو تقنية مطبقة على المنصة.",
        "استخدام أدوات أتمتة أو روبوتات للتفاعل مع المنصة بدون إذن.",
      ]
    },
    {
      id: "children-safety", icon: "Users", title: "حماية الأطفال — قواعد إضافية", paragraphs: ["نظرًا لأن منصتنا تخدم الأطفال، فإننا نفرض قواعد صارمة إضافية:"], items: [
        "يُحظر تمامًا أي محاولة للتواصل مباشرة مع أطفال ليسوا أبناءكم عبر المنصة.",
        "يُحظر جمع أو طلب أي معلومات شخصية من أطفال.",
        "يُحظر إنشاء حساب طفل لشخص بالغ أو العكس.",
        "يًحظر مشاركة بيانات تسجيل الدخول لحسابات الأطفال مع أشخاص غير مصرح لهم.",
        "أي نشاط مشبوه يتعلق بسلامة الأطفال سيتم الإبلاغ عنه فورًا للسلطات المختصة.",
      ]
    },
    {
      id: "consequences", icon: "Gavel", title: "عواقب انتهاك السياسة", paragraphs: ["في حالة انتهاك أي بند من بنود هذه السياسة، قد نتخذ واحدًا أو أكثر من الإجراءات التالية:"], items: [
        "تحذير رسمي: إشعار عبر البريد الإلكتروني بالانتهاك وطلب التوقف الفوري.",
        "تقييد مؤقت: تقييد بعض ميزات الحساب لفترة محددة.",
        "تعليق الحساب: تعليق الحساب مؤقتًا لفترة تتراوح بين 7 و 30 يومًا.",
        "إنهاء الحساب: حذف الحساب نهائيًا بدون إمكانية استرداد الأموال.",
        "إبلاغ السلطات: في حالات الانتهاكات الجسيمة (خاصة المتعلقة بسلامة الأطفال)، سنُبلغ الجهات القانونية المختصة.",
        "الإجراء القانوني: نحتفظ بحقنا في اتخاذ إجراءات قانونية ضد المخالفين.",
      ]
    },
    {
      id: "reporting", icon: "AlertTriangle", title: "الإبلاغ عن الانتهاكات", paragraphs: ["إذا لاحظتم أي انتهاك لهذه السياسة، يُرجى الإبلاغ فورًا:"], items: [
        "بلاغات سلامة الأطفال: safety@classi-fy.com (أولوية قصوى — مراجعة خلال 24 ساعة).",
        "بلاغات عامة: support@classi-fy.com (مراجعة خلال 48 ساعة).",
        "يمكنكم الإبلاغ دون الإفصاح عن هويتكم.",
        "جميع البلاغات تُراجع بسرية تامة.",
        "لن نتخذ أي إجراء سلبي ضد من يُبلغ بحسن نية.",
      ]
    },
    {
      id: "security", icon: "Lock", title: "أمان الحساب — مسؤوليات المستخدم", paragraphs: ["أنتم مسؤولون عن الحفاظ على أمان حسابكم:"], items: [
        "استخدام كلمة مرور قوية وفريدة لحسابكم (8 أحرف على الأقل، تتضمن أرقامًا وحروفًا).",
        "عدم مشاركة بيانات تسجيل الدخول مع أي شخص.",
        "تفعيل المصادقة الثنائية (2FA) لحماية إضافية.",
        "إبلاغنا فورًا في حالة الاشتباه بوجود وصول غير مصرح به لحسابكم.",
        "تسجيل الخروج من الأجهزة العامة أو المشتركة.",
        "تحديث معلومات حسابكم بانتظام للتأكد من صحتها.",
      ]
    },
    {
      id: "cooperation", icon: "Shield", title: "التعاون مع الجهات المختصة", paragraphs: ["نتعاون بشكل كامل مع الجهات القانونية والرقابية فيما يخص:"], items: [
        "أي جرائم إلكترونية تتم عبر منصتنا أو باستخدامها.",
        "تحقيقات تتعلق بسلامة الأطفال واستغلالهم.",
        "أوامر المحاكم وطلبات الجهات القانونية المشروعة.",
        "الامتثال لقوانين حماية البيانات والخصوصية.",
      ]
    },
    {
      id: "contact", icon: "Mail", title: "التواصل معنا", paragraphs: ["لأي استفسارات حول هذه السياسة:"], items: [
        "البريد الإلكتروني: support@classi-fy.com",
        "بلاغات السلامة: safety@classi-fy.com",
        "مسؤول حماية البيانات: privacy@classi-fy.com",
      ]
    },
  ],
};

const en = {
  title: "Acceptable Use Policy",
  subtitle: "Rules of Conduct — Permitted and Prohibited Platform Use",
  lastUpdated: "February 21, 2026",
  version: "Version 2.0",
  intro: "The Acceptable Use Policy defines the rules and standards that all Classify users must follow. This policy aims to ensure a safe, educational, and respectful environment for all users, especially children. Any violation of this policy may result in suspension or termination of your account.",
  sections: [
    { id: "acceptable-use", icon: "Shield", title: "Acceptable Use", paragraphs: ["Classify may be used only for the following purposes:"], items: ["Accessing educational content and cognitive games provided by the platform.", "Creating and managing your children's accounts and tracking their educational progress.", "Interacting with educational features in accordance with the Terms of Service.", "Sharing your children's educational achievements within the platform.", "Communicating with the support team for issue resolution or inquiries.", "Using family guidance tools to manage your children's experience."] },
    { id: "prohibited-content", icon: "Ban", title: "Prohibited Content", paragraphs: ["It is strictly prohibited to post, send, store, or share any content that includes:"], items: ["Pornographic, sexual, or content that exploits children in any form.", "Violent, graphic, or content inciting violence.", "Hate speech or discriminatory content based on race, religion, gender, or disability.", "Threats, harassment, bullying, or intimidation of any person.", "Materials infringing others' intellectual property rights (copyrights, trademarks).", "Personal information of third parties without their consent (doxxing).", "Fraudulent, misleading, or intentionally false information.", "Promotion of drugs, alcohol, tobacco, or dangerous substances.", "Extreme religious or political content inciting hatred.", "Unauthorized advertisements or promotional messages (spam)."] },
    { id: "prohibited-actions", icon: "AlertTriangle", title: "Prohibited Actions", paragraphs: ["The following actions are strictly prohibited:"], items: ["Attempting unauthorized access to other users' accounts or data.", "Using tools or software to hack the platform or exploit security vulnerabilities.", "Reverse engineering, decompiling, or attempting to extract the platform's source code.", "Manipulating game results or educational reports through illegitimate means.", "Creating fake accounts or using false identities.", "Impersonating Classify staff or any other person.", "Using the platform for unauthorized commercial purposes.", "Transferring or selling your account or any platform data to third parties.", "Disrupting or interfering with platform operations or affecting other users (e.g., DDoS attacks, overloading).", "Using the platform to collect other users' data (web scraping).", "Circumventing or attempting to disable any security or technical measures on the platform.", "Using automation tools or bots to interact with the platform without permission."] },
    { id: "children-safety", icon: "Users", title: "Child Protection — Additional Rules", paragraphs: ["Since our platform serves children, we enforce additional strict rules:"], items: ["Any attempt to directly contact children who are not yours through the platform is strictly prohibited.", "Collecting or requesting personal information from children is prohibited.", "Creating a child account for an adult or vice versa is prohibited.", "Sharing login credentials for children's accounts with unauthorized persons is prohibited.", "Any suspicious activity related to child safety will be immediately reported to relevant authorities."] },
    { id: "consequences", icon: "Gavel", title: "Policy Violation Consequences", paragraphs: ["In case of violation of any provision of this policy, we may take one or more of the following actions:"], items: ["Formal warning: Email notification of the violation and request for immediate cessation.", "Temporary restriction: Restricting certain account features for a specified period.", "Account suspension: Temporarily suspending the account for 7 to 30 days.", "Account termination: Permanently deleting the account without refund eligibility.", "Authority notification: In cases of serious violations (especially related to child safety), we will notify relevant legal authorities.", "Legal action: We reserve the right to take legal action against violators."] },
    { id: "reporting", icon: "AlertTriangle", title: "Reporting Violations", paragraphs: ["If you notice any violation of this policy, please report it immediately:"], items: ["Child safety reports: safety@classi-fy.com (highest priority — reviewed within 24 hours).", "General reports: support@classi-fy.com (reviewed within 48 hours).", "You may report anonymously.", "All reports are reviewed in strict confidence.", "We will not take any adverse action against good-faith reporters."] },
    { id: "security", icon: "Lock", title: "Account Security — User Responsibilities", paragraphs: ["You are responsible for maintaining the security of your account:"], items: ["Use a strong, unique password (at least 8 characters, including numbers and letters).", "Do not share login credentials with anyone.", "Enable Two-Factor Authentication (2FA) for additional protection.", "Notify us immediately if you suspect unauthorized access to your account.", "Log out from public or shared devices.", "Regularly update your account information to ensure accuracy."] },
    { id: "cooperation", icon: "Shield", title: "Cooperation with Authorities", paragraphs: ["We fully cooperate with legal and regulatory authorities regarding:"], items: ["Any cybercrimes committed through or using our platform.", "Investigations related to child safety and exploitation.", "Court orders and legitimate legal requests.", "Compliance with data protection and privacy laws."] },
    { id: "contact", icon: "Mail", title: "Contact Us", paragraphs: ["For any inquiries about this policy:"], items: ["Email: support@classi-fy.com", "Safety reports: safety@classi-fy.com", "Data Protection Officer: privacy@classi-fy.com"] },
  ],
};

const iconMap: Record<string, JSX.Element> = { Shield: <Shield className="w-5 h-5" />, Ban: <Ban className="w-5 h-5" />, AlertTriangle: <AlertTriangle className="w-5 h-5" />, Users: <Users className="w-5 h-5" />, Gavel: <Gavel className="w-5 h-5" />, Lock: <Lock className="w-5 h-5" />, Mail: <Mail className="w-5 h-5" /> };

export const AcceptableUse = (): JSX.Element => {
  const { i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const lang = i18n.language === "ar" ? "ar" : "en";
  const isRTL = lang === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const c = lang === "ar" ? ar : en;
  const [openToc, setOpenToc] = useState(false);

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-teal-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><BackArrow className="w-5 h-5" /></button>
            <div className="flex items-center gap-2"><ShieldAlert className="w-6 h-6" /><h1 className="text-xl md:text-2xl font-bold">{c.title}</h1></div>
          </div>
          <LanguageSelector />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className={`px-6 md:px-8 py-5 ${isDark ? "border-b border-gray-700" : "bg-teal-50 border-b border-teal-100"}`}>
            <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Classify — {c.subtitle}</p>
            <div className="flex flex-wrap gap-4 mt-2">
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{lang === "ar" ? "آخر تحديث" : "Last Updated"}: {c.lastUpdated}</p>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{c.version}</p>
            </div>
          </div>
          <div className="px-6 md:px-8 py-6"><p className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>{c.intro}</p></div>
        </div>
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <button onClick={() => setOpenToc(!openToc)} className={`w-full px-6 md:px-8 py-4 flex items-center justify-between transition-colors`}>
            <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{lang === "ar" ? "📑 جدول المحتويات" : "📑 Table of Contents"}</h2>
            <ChevronDown className={`w-5 h-5 transition-transform ${openToc ? "rotate-180" : ""}`} />
          </button>
          {openToc && (<div className={`px-6 md:px-8 pb-5 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}><ol className="pt-3 space-y-1.5">{c.sections.map((s, i) => (<li key={s.id}><a href={`#${s.id}`} className={`text-sm hover:underline ${isDark ? "text-teal-400" : "text-teal-600"}`}>{i + 1}. {s.title}</a></li>))}</ol></div>)}
        </div>
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-6 space-y-8">
            {c.sections.map((section, idx) => (
              <section key={section.id} id={section.id}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg shrink-0 ${isDark ? "bg-teal-900/30 text-teal-400" : "bg-teal-100 text-teal-600"}`}>{iconMap[section.icon] || <Shield className="w-5 h-5" />}</div>
                  <h2 className={`text-lg md:text-xl font-bold pt-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>{idx + 1}. {section.title}</h2>
                </div>
                <div className={`${isRTL ? "pr-12" : "pl-12"}`}>
                  {section.paragraphs.map((p, pi) => (<p key={pi} className={`leading-relaxed mb-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{p}</p>))}
                  {section.items && (<ul className="space-y-2 mb-4">{section.items.map((item, i) => (<li key={i} className={`flex items-start gap-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}><span className="text-teal-500 mt-1.5 shrink-0">•</span><span className="leading-relaxed">{item}</span></li>))}</ul>)}
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
