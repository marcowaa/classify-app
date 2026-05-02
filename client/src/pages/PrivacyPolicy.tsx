import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  Shield, ArrowLeft, ArrowRight, Lock, Eye, UserX, Database, Mail,
  Baby, RefreshCw, FileText, Globe, Server, Clock, Scale, Fingerprint,
  AlertTriangle, Smartphone, BarChart3, Link2, Cookie, Users, Building2,
  ChevronDown
} from "lucide-react";
import { useState } from "react";

interface Section {
  id: string;
  icon: JSX.Element;
  title: string;
  paragraphs: string[];
  items?: string[];
  subsections?: { title: string; paragraphs: string[]; items?: string[] }[];
}

const contentAr: { title: string; subtitle: string; lastUpdated: string; version: string; intro: string; sections: Section[] } = {
  title: "سياسة الخصوصية",
  subtitle: "سياسة الخصوصية وحماية البيانات الشخصية",
  lastUpdated: "21 فبراير 2026",
  version: "الإصدار 3.0",
  intro: "مرحبًا بكم في Classify (\"كلاسيفاي\")، المنصة التعليمية والترفيهية المخصصة للأطفال والعائلات. نحن نقدّر خصوصيتكم ونلتزم بحماية بياناتكم الشخصية وبيانات أطفالكم. تمّ إعداد سياسة الخصوصية هذه لتوضيح كيفية جمعنا واستخدامنا وتخزيننا وحمايتنا ومشاركتنا لمعلوماتكم الشخصية. نرجو منكم قراءتها بعناية لفهم ممارساتنا المتعلقة ببياناتكم الشخصية.",
  sections: [
    {
      id: "scope",
      icon: <Globe className="w-5 h-5" />,
      title: "نطاق سياسة الخصوصية",
      paragraphs: [
        "تنطبق سياسة الخصوصية هذه على جميع المعلومات الشخصية التي يتم جمعها من خلال منصة Classify، بما في ذلك تطبيق الويب المتاح على الموقع الإلكتروني classi-fy.com، وتطبيق الهاتف المحمول المتاح على متجر Google Play ومتجر Apple App Store، وأي خدمات أو ميزات أو أدوات مرتبطة بالمنصة.",
        "تسري هذه السياسة على جميع المستخدمين، بما في ذلك الآباء والأمهات والأوصياء القانونيين والأطفال والمعلمين والمكتبات والمؤسسات التعليمية وأي أشخاص آخرين يتفاعلون مع المنصة بأي شكل من الأشكال. باستخدامك لأي من خدماتنا، فإنك توافق على الجمع والاستخدام والكشف عن معلوماتك وفقًا لهذه السياسة.",
        "إذا كنت لا توافق على أي من شروط هذه السياسة، يُرجى عدم استخدام خدماتنا أو تقديم أي معلومات شخصية لنا. استمرارك في استخدام المنصة يعني موافقتك الصريحة على هذه السياسة بالكامل.",
      ],
    },
    {
      id: "definitions",
      icon: <FileText className="w-5 h-5" />,
      title: "التعريفات والمصطلحات",
      paragraphs: [
        "لأغراض هذه السياسة، تُستخدم المصطلحات التالية بالمعاني المحددة أدناه:",
      ],
      items: [
        "\"المنصة\" أو \"الخدمة\": تشير إلى جميع الخدمات والتطبيقات والمواقع الإلكترونية التي تقدمها Classify، بما في ذلك تطبيق الويب وتطبيقات الهاتف المحمول وأي واجهات برمجة تطبيقات (API) مرتبطة بها.",
        "\"البيانات الشخصية\": أي معلومات يمكن أن تُحدد هوية شخص طبيعي بشكل مباشر أو غير مباشر، بما في ذلك الاسم وعنوان البريد الإلكتروني ورقم الهاتف وعنوان IP ومعرّفات الجهاز وغيرها.",
        "\"الطفل\" أو \"القاصر\": أي شخص يقل عمره عن 16 عامًا، أو أي عمر آخر يحدده القانون المحلي المعمول به بشأن الموافقة الرقمية.",
        "\"الولي\" أو \"ولي الأمر\": الأب أو الأم أو الوصي القانوني المسؤول عن الطفل المسجل في المنصة.",
        "\"المعالجة\": أي عملية يتم إجراؤها على البيانات الشخصية، سواء كانت آلية أو يدوية، بما في ذلك الجمع والتسجيل والتنظيم والتخزين والتعديل والاسترجاع والمسح والتدمير.",
        "\"الطرف الثالث\": أي شخص طبيعي أو اعتباري غير المستخدم أو Classify يتلقى أو يعالج البيانات الشخصية.",
        "\"ملف تعريف الارتباط\": ملفات نصية صغيرة يتم تخزينها على جهاز المستخدم عند زيارة المنصة لتحسين تجربة الاستخدام.",
        "\"المسؤول عن المعالجة\": الشخص الطبيعي أو الاعتباري الذي يحدد أغراض ووسائل معالجة البيانات الشخصية.",
      ],
    },
    {
      id: "controller",
      icon: <Building2 className="w-5 h-5" />,
      title: "المسؤول عن معالجة البيانات",
      paragraphs: [
        "شركة Proomnes (المشار إليها بـ \"نحن\" أو \"لنا\" أو \"Classify\") هي المسؤولة عن معالجة بياناتكم الشخصية وفقًا لهذه السياسة. نحن نعمل كمسؤول عن معالجة البيانات (Data Controller) بموجب اللائحة العامة لحماية البيانات (GDPR) والقوانين المحلية المعمول بها.",
        "للتواصل معنا بشأن أي استفسارات تتعلق بالخصوصية أو حماية البيانات:",
      ],
      items: [
        "البريد الإلكتروني: support@classi-fy.com",
        "الموقع الإلكتروني: https://classi-fy.com",
        "مسؤول حماية البيانات (DPO): privacy@classi-fy.com",
      ],
    },
    {
      id: "data-collected",
      icon: <Database className="w-5 h-5" />,
      title: "البيانات التي نجمعها",
      paragraphs: [
        "نجمع أنواعًا مختلفة من المعلومات لتقديم خدماتنا وتحسينها. فيما يلي وصف تفصيلي لكل نوع من البيانات التي نجمعها:",
      ],
      subsections: [
        {
          title: "أ. بيانات التسجيل والحساب",
          paragraphs: [
            "عند إنشاء حساب على المنصة بصفتك وليّ أمر، نقوم بجمع المعلومات التالية:",
          ],
          items: [
            "الاسم الكامل لولي الأمر كما يظهر في الهوية الرسمية",
            "عنوان البريد الإلكتروني الذي سيُستخدم لتسجيل الدخول وإرسال الإشعارات",
            "رقم الهاتف المحمول (اختياري) لتفعيل المصادقة الثنائية عبر الرسائل النصية",
            "كلمة المرور المشفرة (نحتفظ فقط بالنسخة المشفرة ولا يمكننا قراءة كلمة المرور الأصلية)",
            "تاريخ إنشاء الحساب وعنوان IP المستخدم عند التسجيل",
            "إعدادات اللغة والمنطقة الزمنية المفضلة",
            "حالة التحقق من الهوية (البريد الإلكتروني والهاتف)",
          ],
        },
        {
          title: "ب. بيانات الأطفال",
          paragraphs: [
            "عندما يقوم ولي الأمر بإضافة طفل إلى حسابه، نجمع المعلومات التالية عن الطفل بعد موافقة ولي الأمر:",
          ],
          items: [
            "الاسم الأول للطفل (أو اسم مستعار يختاره ولي الأمر)",
            "تاريخ الميلاد أو الفئة العمرية (لتخصيص المحتوى التعليمي المناسب)",
            "الجنس (اختياري - يُستخدم لتخصيص واجهة المستخدم فقط)",
            "الصورة الرمزية (Avatar) التي يختارها الطفل أو ولي الأمر",
            "المستوى الدراسي والمرحلة التعليمية",
            "الشخصيات المفضلة وموضوعات الاهتمام (لتحسين تجربة الألعاب التعليمية)",
            "بيانات التقدم التعليمي والنقاط والإنجازات المحققة في المنصة",
          ],
        },
        {
          title: "ج. بيانات الاستخدام والتفاعل",
          paragraphs: [
            "أثناء استخدام المنصة، نقوم تلقائيًا بجمع معلومات حول كيفية تفاعلكم مع خدماتنا:",
          ],
          items: [
            "سجلات النشاط: الصفحات التي تمت زيارتها، والألعاب التي تم لعبها، والمهام التي تمت تأديتها",
            "مدة الجلسات وأوقات تسجيل الدخول والخروج",
            "التفاعلات مع المحتوى التعليمي: الإجابات الصحيحة والخاطئة، ومعدلات الإتمام",
            "تفاعلات واجهة المستخدم: النقرات، والتمرير، وأنماط التنقل",
            "بيانات أداء الألعاب: النتائج، والمستويات المحققة، والتقارير المعرفية",
            "سجلات الأخطاء والمشكلات التقنية لأغراض تحسين الأداء",
          ],
        },
        {
          title: "د. بيانات الجهاز والمعلومات التقنية",
          paragraphs: [
            "نجمع تلقائيًا معلومات تقنية عن الأجهزة المستخدمة للوصول إلى المنصة:",
          ],
          items: [
            "نوع الجهاز والشركة المصنعة والطراز",
            "نظام التشغيل ونسخته (مثل Android 14, iOS 17, Windows 11)",
            "نوع المتصفح ونسخته (مثل Chrome, Safari, Firefox)",
            "دقة الشاشة واتجاهها (عمودي/أفقي)",
            "عنوان بروتوكول الإنترنت (IP Address) والموقع الجغرافي التقريبي (على مستوى الدولة/المدينة)",
            "معرّفات الجهاز الفريدة (Device ID) لأغراض الأمان فقط",
            "معلومات الاتصال بالشبكة (WiFi / بيانات الجوال)",
            "إعدادات اللغة والمنطقة في الجهاز",
          ],
        },
        {
          title: "هـ. بيانات الدفع والمعاملات المالية",
          paragraphs: [
            "إذا قمت بأي عمليات شراء من خلال المنصة، فإننا لا نقوم بتخزين معلومات بطاقة الائتمان أو الخصم لديك مباشرة. يتم التعامل مع جميع عمليات الدفع عبر معالج دفع خارجي معتمد (Stripe) يلتزم بمعايير أمان بيانات صناعة بطاقات الدفع (PCI DSS).",
          ],
          items: [
            "نحتفظ بمعرّف العميل في Stripe (لا يحتوي على معلومات بطاقة الائتمان)",
            "سجل المعاملات: التاريخ والمبلغ ونوع الاشتراك وحالة الدفع",
            "سجلات الاسترداد والمبالغ المستردة إن وجدت",
            "لا نخزن أبدًا: أرقام البطاقات، أو رموز CVV، أو تواريخ انتهاء الصلاحية",
          ],
        },
      ],
    },
    {
      id: "collection-methods",
      icon: <Fingerprint className="w-5 h-5" />,
      title: "كيفية جمع البيانات",
      paragraphs: [
        "نقوم بجمع البيانات الشخصية من خلال الطرق التالية:",
      ],
      items: [
        "الجمع المباشر: المعلومات التي تقدمونها لنا طوعًا عند إنشاء حساب، أو تعبئة نموذج، أو التواصل مع فريق الدعم، أو إجراء عملية شراء، أو المشاركة في استطلاعات الرأي.",
        "الجمع التلقائي: المعلومات التي يتم جمعها تلقائيًا من خلال ملفات تعريف الارتباط (Cookies) وملفات بكسل التتبع والتقنيات المشابهة عند استخدامكم لمنصتنا.",
        "الجمع من الأطفال: يتم جمع بيانات الأطفال فقط بعد الحصول على موافقة ولي الأمر الصريحة والمتحققة. لا يُسمح للأطفال بتقديم بيانات شخصية دون إذن ولي الأمر.",
        "من أطراف ثالثة: قد نتلقى معلومات من مزودي خدمة المصادقة الاجتماعية (مثل Google Sign-In) إذا اخترتم تسجيل الدخول عبر هذه الخدمات، وتقتصر هذه المعلومات على الاسم والبريد الإلكتروني.",
      ],
    },
    {
      id: "data-usage",
      icon: <BarChart3 className="w-5 h-5" />,
      title: "أغراض استخدام البيانات",
      paragraphs: [
        "نستخدم البيانات الشخصية التي نجمعها للأغراض التالية فقط:",
      ],
      items: [
        "تقديم الخدمة الأساسية: إنشاء الحسابات وإدارتها، وتمكين ولي الأمر من إدارة حسابات أطفاله، وتوفير المحتوى التعليمي والألعاب المناسبة لعمر كل طفل.",
        "تخصيص التجربة التعليمية: تحليل بيانات التقدم لتكييف صعوبة المحتوى ونوعه مع مستوى كل طفل، وتقديم توصيات تعليمية مخصصة.",
        "إعداد التقارير للآباء: توفير تقارير مفصلة عن أداء الطفل التعليمي والمعرفي لولي الأمر، بما في ذلك مؤشرات الذاكرة والتركيز والمهارات الحسابية.",
        "التواصل والإشعارات: إرسال إشعارات مهمة حول الحساب، وتحديثات الأمان، وإشعارات النشاط التعليمي، ورسائل التحقق (OTP).",
        "الأمان وحماية الحساب: الكشف عن الأنشطة المشبوهة ومحاولات الاختراق، وتأمين الحسابات عبر المصادقة الثنائية (2FA).",
        "تحسين الخدمة: تحليل أنماط الاستخدام المجمعة (غير المحددة للهوية) لتحسين أداء المنصة ومحتواها وميزاتها.",
        "الامتثال القانوني: الوفاء بالالتزامات القانونية والتنظيمية، بما في ذلك الاحتفاظ بالسجلات المطلوبة قانونيًا.",
        "المعاملات المالية: معالجة عمليات الدفع والاشتراكات وطلبات الاسترداد.",
        "الدعم الفني: الرد على الاستفسارات وحل المشكلات التقنية التي يواجهها المستخدمون.",
        "الإشراف العائلي: تمكين ولي الأمر من الاطلاع على نشاط أطفاله وتنظيم إعدادات الخصوصية والأمان.",
      ],
    },
    {
      id: "legal-basis",
      icon: <Scale className="w-5 h-5" />,
      title: "الأساس القانوني لمعالجة البيانات",
      paragraphs: [
        "نعالج بياناتكم الشخصية بناءً على واحد أو أكثر من الأسس القانونية التالية وفقًا للائحة العامة لحماية البيانات (GDPR) والتشريعات المحلية المعمول بها:",
      ],
      items: [
        "الموافقة (المادة 6(1)(أ) من GDPR): نعتمد على موافقتكم الصريحة لمعالجة البيانات الشخصية للأطفال، وإرسال الاتصالات التسويقية، واستخدام ملفات تعريف الارتباط غير الضرورية. يمكنكم سحب موافقتكم في أي وقت.",
        "تنفيذ العقد (المادة 6(1)(ب) من GDPR): نعالج البيانات اللازمة لتقديم الخدمة التي طلبتموها، بما في ذلك إنشاء الحسابات وتوفير المحتوى التعليمي ومعالجة المدفوعات.",
        "المصالح المشروعة (المادة 6(1)(و) من GDPR): نعالج البيانات لأغراض مشروعة مثل تحسين الأمان، ومنع الاحتيال، وتحليل الأداء، وتطوير الخدمة، شريطة ألا تتغلب مصالحكم أو حقوقكم الأساسية على هذه المصالح.",
        "الالتزام القانوني (المادة 6(1)(ج) من GDPR): نعالج البيانات عندما يكون ذلك ضروريًا للوفاء بالتزام قانوني، مثل قوانين حماية الأطفال والإبلاغ الضريبي.",
        "حماية المصالح الحيوية (المادة 6(1)(د) من GDPR): في الحالات الاستثنائية، قد نعالج البيانات لحماية المصالح الحيوية للمستخدم أو أي شخص آخر.",
      ],
    },
    {
      id: "children-privacy",
      icon: <Baby className="w-5 h-5" />,
      title: "خصوصية الأطفال وقانون حماية خصوصية الأطفال على الإنترنت (COPPA)",
      paragraphs: [
        "تُولي Classify أهمية قصوى لحماية خصوصية الأطفال. نحن ندرك المسؤولية الكبيرة الملقاة على عاتقنا في حماية بيانات القُصّر، ونلتزم التزامًا صارمًا بقانون حماية خصوصية الأطفال على الإنترنت (COPPA) الصادر عن لجنة التجارة الفيدرالية الأمريكية (FTC)، واللائحة العامة لحماية البيانات (GDPR) الخاصة بالاتحاد الأوروبي فيما يتعلق بالأطفال (المادة 8)، وجميع القوانين المحلية المعمول بها لحماية خصوصية القُصّر.",
        "التزاماتنا تجاه بيانات الأطفال تشمل:",
      ],
      items: [
        "الموافقة الأبوية المتحققة: لا يتم جمع أي بيانات شخصية من طفل دون الحصول أولاً على موافقة ولي الأمر القابلة للتحقق. يتم التحقق من هوية ولي الأمر من خلال عنوان البريد الإلكتروني والمصادقة الثنائية.",
        "الحد الأدنى من البيانات: نجمع فقط البيانات الضرورية لتقديم الخدمة التعليمية. لا نطلب من الأطفال تقديم معلومات شخصية تزيد عن الحد المطلوب.",
        "عدم استهداف الأطفال بالإعلانات: لا نعرض أي إعلانات موجهة سلوكيًا أو مخصصة للأطفال. أي محتوى ترويجي يظهر على المنصة يكون تعليميًا بالكامل وغير مبني على بيانات الطفل الشخصية.",
        "عدم مشاركة بيانات الأطفال: لا نبيع أو نؤجر أو نشارك بيانات الأطفال الشخصية مع أي طرف ثالث لأغراض تسويقية أو تجارية على الإطلاق.",
        "صلاحيات ولي الأمر الكاملة: يحق لولي الأمر في أي وقت مراجعة بيانات طفله، وطلب تعديلها أو حذفها بالكامل، وسحب موافقته على جمع البيانات.",
        "الحذف الفوري: عند طلب ولي الأمر حذف حساب طفله، يتم حذف جميع البيانات الشخصية للطفل خلال 30 يومًا وفقًا لمتطلبات COPPA.",
        "بيئة آمنة: يعمل حساب الطفل في بيئة مقيدة لا تتضمن أي رسائل مباشرة، أو دردشة مع الغرباء، أو مشاركة موقع جغرافي، أو أي ميزة تعرض الطفل لمخاطر التواصل غير الآمن.",
        "تشفير بيانات الأطفال: يتم تشفير جميع بيانات الأطفال أثناء النقل (TLS 1.3) وأثناء التخزين (AES-256) باستخدام أحدث معايير التشفير.",
        "صلاحيات محدودة للطفل: حساب الطفل يملك صلاحيات القراءة فقط. لا يستطيع الطفل تعديل إعداداته الشخصية أو مشاركة أي محتوى خارج المنصة دون موافقة ولي الأمر.",
      ],
    },
    {
      id: "parental-consent",
      icon: <Users className="w-5 h-5" />,
      title: "موافقة الوالدين وآلية التحقق",
      paragraphs: [
        "نحن نتبع إجراءات صارمة للحصول على موافقة ولي الأمر والتحقق منها قبل السماح بجمع أي بيانات من الأطفال أو معالجتها:",
      ],
      items: [
        "عند إنشاء حساب جديد، يجب على ولي الأمر تأكيد أنه الوالد أو الوصي القانوني للطفل.",
        "يجب على ولي الأمر قراءة سياسة الخصوصية هذه والموافقة عليها صراحةً قبل إضافة أي طفل.",
        "يتم التحقق من هوية ولي الأمر من خلال البريد الإلكتروني ورمز التحقق لمرة واحدة (OTP).",
        "يمكن لولي الأمر تفعيل المصادقة الثنائية (2FA) كطبقة أمان إضافية لحساب العائلة.",
        "يتم تسجيل موافقة ولي الأمر بالتاريخ والوقت وعنوان IP كدليل قابل للتدقيق.",
        "يمكن لولي الأمر سحب موافقته في أي وقت عبر حذف حساب الطفل، مما يؤدي إلى حذف جميع بيانات الطفل.",
        "نراجع آليات التحقق من الموافقة بشكل دوري لضمان تماشيها مع أفضل الممارسات والمتطلبات القانونية.",
      ],
    },
    {
      id: "data-sharing",
      icon: <Shield className="w-5 h-5" />,
      title: "مشاركة البيانات والكشف عنها",
      paragraphs: [
        "نحن لا نبيع بياناتكم الشخصية أو بيانات أطفالكم لأي طرف ثالث. نحن لا نشارك البيانات الشخصية إلا في الحالات المحدودة التالية:",
      ],
      items: [
        "مقدمو الخدمات الأساسيون: نشارك الحد الأدنى من البيانات اللازمة مع مقدمي خدمات موثوقين يساعدوننا في تشغيل المنصة (مثل Stripe لمعالجة المدفوعات، وخدمات البريد الإلكتروني لإرسال الإشعارات). هؤلاء المقدمون ملتزمون تعاقديًا بحماية بياناتكم وعدم استخدامها لأي غرض آخر.",
        "الامتثال القانوني: قد نكشف عن البيانات إذا كنا ملزمين بذلك بموجب قانون أو أمر قضائي أو إجراء حكومي، أو للامتثال لاستدعاء قانوني سارٍ.",
        "حماية الحقوق: قد نكشف عن البيانات إذا كان ذلك ضروريًا لحماية حقوقنا أو ملكيتنا أو سلامتنا أو سلامة مستخدمينا أو الجمهور.",
        "موافقتكم: قد نشارك البيانات مع أطراف أخرى إذا حصلنا على موافقتكم الصريحة والمسبقة.",
        "عمليات الدمج والاستحواذ: في حالة اندماج أو استحواذ أو بيع أصول، قد يتم نقل البيانات الشخصية كجزء من الصفقة، مع إخطاركم مسبقًا وإتاحة الفرصة لكم لاتخاذ إجراء.",
      ],
    },
    {
      id: "third-parties",
      icon: <Link2 className="w-5 h-5" />,
      title: "مقدمو الخدمات الخارجيون",
      paragraphs: [
        "نتعامل مع مقدمي خدمات خارجيين موثوقين لتشغيل بعض جوانب منصتنا. فيما يلي قائمة بالمقدمين الرئيسيين وأنواع البيانات التي يعالجونها:",
      ],
      items: [
        "Stripe (معالجة المدفوعات): يعالج بيانات الدفع وبطاقات الائتمان وفقًا لمعايير PCI DSS. سياسة الخصوصية: https://stripe.com/privacy",
        "خدمات البريد الإلكتروني (SMTP): تُستخدم لإرسال رسائل التحقق والإشعارات. يتم مشاركة عنوان البريد الإلكتروني فقط.",
        "خدمات الاستضافة السحابية: نستخدم خوادم آمنة لتخزين البيانات مع تشفير كامل وحماية DDoS.",
        "خدمة CDN: لتسريع تحميل المحتوى الثابت (الصور، الملفات). لا يتم مشاركة بيانات شخصية.",
      ],
      subsections: [
        {
          title: "التزامات مقدمي الخدمات",
          paragraphs: [
            "جميع مقدمي الخدمات الخارجيين ملتزمون بما يلي:",
          ],
          items: [
            "توقيع اتفاقيات معالجة بيانات (DPA) تتوافق مع GDPR",
            "معالجة البيانات فقط وفقًا لتعليماتنا وللأغراض المحددة",
            "تطبيق تدابير أمنية تقنية وتنظيمية مناسبة",
            "إخطارنا فورًا بأي خرق للبيانات",
            "حذف البيانات عند انتهاء الغرض من المعالجة",
          ],
        },
      ],
    },
    {
      id: "international-transfers",
      icon: <Globe className="w-5 h-5" />,
      title: "النقل الدولي للبيانات",
      paragraphs: [
        "قد يتم نقل بياناتكم الشخصية ومعالجتها وتخزينها في دول خارج بلد إقامتكم، بما في ذلك دول قد لا تتمتع بنفس مستوى حماية البيانات في بلدكم. عند نقل البيانات دوليًا، نتخذ الإجراءات التالية لحماية بياناتكم:",
      ],
      items: [
        "نستخدم البنود التعاقدية النموذجية (SCCs) المعتمدة من المفوضية الأوروبية لنقل البيانات خارج المنطقة الاقتصادية الأوروبية.",
        "نتأكد من أن مقدمي الخدمات في الدول المستقبلة يطبقون تدابير حماية مناسبة.",
        "نقوم بتقييم تأثير النقل على حقوق الخصوصية (Transfer Impact Assessment) بشكل دوري.",
        "يتم تشفير جميع البيانات أثناء النقل باستخدام بروتوكول TLS 1.3 على الأقل.",
      ],
    },
    {
      id: "data-security",
      icon: <Lock className="w-5 h-5" />,
      title: "تدابير أمن البيانات",
      paragraphs: [
        "نطبق مجموعة شاملة من التدابير الأمنية التقنية والتنظيمية لحماية بياناتكم الشخصية من الفقدان والسرقة والوصول غير المصرح به والكشف والتعديل والتدمير. تشمل هذه التدابير:",
      ],
      items: [
        "تشفير البيانات أثناء النقل: جميع الاتصالات بين أجهزتكم وخوادمنا مشفرة باستخدام TLS 1.3 مع شهادات SSL/TLS صادرة عن سلطات شهادات معتمدة.",
        "تشفير البيانات أثناء التخزين: كلمات المرور مشفرة باستخدام خوارزمية bcrypt مع عامل تكلفة عالٍ. البيانات الحساسة الأخرى مشفرة باستخدام AES-256.",
        "المصادقة الثنائية (2FA): متاحة لجميع حسابات أولياء الأمور عبر رمز التحقق لمرة واحدة (OTP) عبر البريد الإلكتروني أو الرسائل النصية.",
        "تقييد معدل الطلبات (Rate Limiting): حماية من هجمات القوة الغاشمة على نقاط المصادقة (تسجيل الدخول، طلبات OTP).",
        "رؤوس الأمان (Security Headers): استخدام Helmet.js لتطبيق رؤوس HTTP الأمنية بما في ذلك CSP و X-Frame-Options و HSTS.",
        "جدار الحماية وحماية DDoS: حماية متعددة الطبقات ضد هجمات حجب الخدمة الموزعة.",
        "مراقبة أمنية مستمرة: نراقب أنظمتنا على مدار الساعة للكشف عن أي نشاط مشبوه أو محاولات اختراق.",
        "النسخ الاحتياطي المشفر: نسخ احتياطية مشفرة يومية للبيانات مع اختبار استعادة دوري.",
        "التحكم في الوصول: مبدأ الحد الأدنى من الصلاحيات (Principle of Least Privilege) لجميع الموظفين والأنظمة.",
        "التحديثات الأمنية: تطبيق تحديثات الأمان والتصحيحات على الفور عند صدورها.",
      ],
    },
    {
      id: "data-retention",
      icon: <Clock className="w-5 h-5" />,
      title: "فترات الاحتفاظ بالبيانات",
      paragraphs: [
        "نحتفظ ببياناتكم الشخصية فقط طوال الفترة اللازمة لتحقيق الأغراض التي جُمعت من أجلها، أو وفقًا لما يقتضيه القانون. فيما يلي سياسة الاحتفاظ التفصيلية:",
      ],
      items: [
        "بيانات الحساب النشط: يتم الاحتفاظ بها طوال مدة وجود الحساب النشط. يمكنكم طلب الحذف في أي وقت.",
        "بيانات الطفل: يتم حذفها خلال 30 يومًا من طلب ولي الأمر أو حذف حساب الطفل.",
        "سجلات الاستخدام: يتم الاحتفاظ بها لمدة 12 شهرًا ثم يتم إخفاء هويتها (Anonymization) للتحليل الإحصائي.",
        "بيانات الدفع: يتم الاحتفاظ بسجلات المعاملات لمدة 7 سنوات وفقًا للمتطلبات المحاسبية والضريبية.",
        "سجلات الأمان: يتم الاحتفاظ بها لمدة 24 شهرًا لأغراض الأمان والتحقيق في الحوادث.",
        "سجلات موافقة الخصوصية: يتم الاحتفاظ بها لمدة 5 سنوات كدليل على الامتثال.",
        "بيانات الحسابات المحذوفة: تبدأ عملية الحذف فور تقديم الطلب. يتم حذف البيانات الشخصية خلال 30 يومًا. قد تُحتفظ بعض السجلات المجهولة لأغراض إحصائية.",
        "النسخ الاحتياطية: يتم حذف البيانات من النسخ الاحتياطية خلال 90 يومًا من حذفها من الأنظمة الرئيسية.",
      ],
    },
    {
      id: "user-rights",
      icon: <FileText className="w-5 h-5" />,
      title: "حقوق المستخدمين",
      paragraphs: [
        "نحترم حقوقكم في التحكم ببياناتكم الشخصية. لديكم الحقوق التالية بغض النظر عن موقعكم الجغرافي:",
      ],
      items: [
        "حق الوصول: يحق لكم طلب نسخة من جميع البيانات الشخصية التي نحتفظ بها عنكم وعن أطفالكم. سنقدم لكم هذه البيانات بصيغة إلكترونية قابلة للقراءة خلال 30 يومًا.",
        "حق التصحيح: يحق لكم طلب تصحيح أي بيانات غير دقيقة أو غير مكتملة نحتفظ بها عنكم.",
        "حق الحذف (حق النسيان): يحق لكم طلب حذف بياناتكم الشخصية وبيانات أطفالكم بالكامل. سنقوم بالحذف خلال 30 يومًا ما لم يكن هناك التزام قانوني بالاحتفاظ بها.",
        "حق تقييد المعالجة: يحق لكم طلب تقييد معالجة بياناتكم في ظروف معينة، مثل التشكيك في دقة البيانات.",
        "حق نقل البيانات: يحق لكم طلب تصدير بياناتكم بصيغة منظمة وقابلة للقراءة آليًا (JSON أو CSV) لنقلها إلى مزود خدمة آخر.",
        "حق الاعتراض: يحق لكم الاعتراض على معالجة بياناتكم لأغراض معينة، مثل التسويق المباشر.",
        "حق سحب الموافقة: يحق لكم سحب موافقتكم على معالجة البيانات في أي وقت، دون أن يؤثر ذلك على قانونية المعالجة التي تمت قبل سحب الموافقة.",
        "حق تقديم شكوى: يحق لكم تقديم شكوى إلى السلطة الرقابية المختصة في بلد إقامتكم.",
      ],
    },
    {
      id: "gdpr-rights",
      icon: <Globe className="w-5 h-5" />,
      title: "حقوق المقيمين في الاتحاد الأوروبي (GDPR)",
      paragraphs: [
        "إذا كنتم مقيمين في المنطقة الاقتصادية الأوروبية (EEA) أو المملكة المتحدة أو سويسرا، فإنكم تتمتعون بحقوق إضافية بموجب اللائحة العامة لحماية البيانات (GDPR) والتشريعات المحلية المعادلة:",
      ],
      items: [
        "حق الحصول على معلومات واضحة حول كيفية معالجة بياناتكم (المواد 13 و14 من GDPR).",
        "حق الوصول إلى بياناتكم (المادة 15 من GDPR).",
        "حق التصحيح (المادة 16 من GDPR).",
        "حق المحو / حق النسيان (المادة 17 من GDPR).",
        "حق تقييد المعالجة (المادة 18 من GDPR).",
        "حق نقل البيانات (المادة 20 من GDPR).",
        "حق الاعتراض على المعالجة (المادة 21 من GDPR).",
        "الحق في عدم الخضوع لقرار مبني حصريًا على المعالجة الآلية (المادة 22 من GDPR).",
        "حق تقديم شكوى إلى سلطة الإشراف على حماية البيانات في بلد إقامتكم.",
      ],
    },
    {
      id: "ccpa-rights",
      icon: <Scale className="w-5 h-5" />,
      title: "حقوق المقيمين في كاليفورنيا (CCPA/CPRA)",
      paragraphs: [
        "إذا كنتم مقيمين في ولاية كاليفورنيا بالولايات المتحدة الأمريكية، فإنكم تتمتعون بحقوق إضافية بموجب قانون خصوصية المستهلك في كاليفورنيا (CCPA) وتعديلاته (CPRA):",
      ],
      items: [
        "حق المعرفة: يحق لكم معرفة فئات وأنواع البيانات الشخصية التي نجمعها ونستخدمها ونشاركها.",
        "حق الحذف: يحق لكم طلب حذف بياناتكم الشخصية.",
        "حق إلغاء الاشتراك في البيع: لا نبيع بياناتكم الشخصية. إذا تغير ذلك مستقبلاً، ستتاح لكم إمكانية إلغاء الاشتراك.",
        "حق عدم التمييز: لن نمارس أي تمييز ضدكم بسبب ممارستكم لحقوق الخصوصية.",
        "حق التصحيح: يحق لكم طلب تصحيح بياناتكم غير الدقيقة.",
        "حق تقييد استخدام المعلومات الحساسة: يحق لكم تقييد كيفية استخدامنا لمعلوماتكم الشخصية الحساسة.",
      ],
      subsections: [
        {
          title: "إفصاحات CCPA",
          paragraphs: [],
          items: [
            "فئات المعلومات الشخصية المجموعة: المعرّفات (الاسم، البريد الإلكتروني)، معلومات الإنترنت (سجلات التصفح)، بيانات تعليمية.",
            "مصادر المعلومات: مباشرة من المستخدم، تلقائيًا من الأجهزة.",
            "أغراض الجمع: تقديم الخدمة، وتحسينها، والأمان.",
            "لا نبيع المعلومات الشخصية لأي طرف.",
            "لا نشارك المعلومات الشخصية للأطفال مع أي طرف لأغراض تجارية.",
          ],
        },
      ],
    },
    {
      id: "cookies",
      icon: <Cookie className="w-5 h-5" />,
      title: "ملفات تعريف الارتباط (Cookies) والتقنيات المشابهة",
      paragraphs: [
        "نستخدم ملفات تعريف الارتباط وتقنيات التخزين المحلي لتشغيل منصتنا بشكل صحيح وتحسين تجربتكم. لمزيد من التفاصيل، يُرجى الاطلاع على سياسة ملفات تعريف الارتباط الخاصة بنا.",
      ],
      items: [
        "ملفات تعريف الارتباط الضرورية: مطلوبة لتشغيل المنصة (مثل ملفات جلسة المصادقة). لا يمكن تعطيلها.",
        "ملفات تعريف الارتباط الوظيفية: تُستخدم لتذكر تفضيلاتكم (اللغة، الوضع المظلم/المضيء).",
        "ملفات تعريف الارتباط التحليلية: تُستخدم لفهم كيفية استخدام المنصة وتحسينها. تُجمع البيانات بشكل مجمع ومجهول الهوية.",
        "يمكنكم إدارة تفضيلات ملفات تعريف الارتباط من خلال إعدادات المتصفح. يُرجى ملاحظة أن تعطيل بعض أنواع ملفات تعريف الارتباط قد يؤثر على تجربتكم في استخدام المنصة.",
      ],
    },
    {
      id: "external-links",
      icon: <Link2 className="w-5 h-5" />,
      title: "الروابط الخارجية",
      paragraphs: [
        "قد تحتوي منصتنا على روابط لمواقع إلكترونية أو خدمات تابعة لأطراف ثالثة. نحن غير مسؤولين عن ممارسات الخصوصية أو محتوى هذه المواقع الخارجية. ننصحكم بقراءة سياسات الخصوصية الخاصة بكل موقع تزورونه.",
        "الروابط الخارجية المتاحة على المنصة مقدمة للراحة فقط ولا تعني تأييدنا لمحتوى هذه المواقع أو ممارساتها.",
      ],
    },
    {
      id: "policy-updates",
      icon: <RefreshCw className="w-5 h-5" />,
      title: "التحديثات على سياسة الخصوصية",
      paragraphs: [
        "نحتفظ بالحق في تحديث سياسة الخصوصية هذه من وقت لآخر لتعكس التغييرات في ممارساتنا أو التقنيات أو المتطلبات القانونية. عند إجراء أي تعديلات جوهرية:",
      ],
      items: [
        "سنقوم بإخطاركم عبر البريد الإلكتروني المسجل بحسابكم قبل 30 يومًا من سريان التغيير.",
        "سنعرض إشعارًا بارزًا على المنصة يشير إلى التغييرات.",
        "سنحدّث تاريخ \"آخر تحديث\" في أعلى هذه السياسة.",
        "في حالة التغييرات الجوهرية التي تؤثر على بيانات الأطفال، قد نطلب موافقة جديدة من ولي الأمر.",
        "استمراركم في استخدام المنصة بعد تاريخ سريان التغييرات يعني موافقتكم على السياسة المحدثة.",
      ],
    },
    {
      id: "contact",
      icon: <Mail className="w-5 h-5" />,
      title: "طريقة التواصل معنا",
      paragraphs: [
        "إذا كانت لديكم أي أسئلة أو استفسارات أو مخاوف بشأن سياسة الخصوصية هذه أو ممارساتنا في حماية البيانات، أو إذا كنتم ترغبون في ممارسة أيٍّ من حقوقكم المذكورة أعلاه، يُرجى التواصل معنا عبر:",
      ],
      items: [
        "البريد الإلكتروني العام: support@classi-fy.com",
        "مسؤول حماية البيانات (DPO): privacy@classi-fy.com",
        "الموقع الإلكتروني: https://classi-fy.com/contact",
        "نلتزم بالرد على جميع الاستفسارات المتعلقة بالخصوصية خلال 30 يومًا كحد أقصى وفقًا لمتطلبات GDPR.",
      ],
    },
    {
      id: "complaints",
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "الشكاوى والجهات الرقابية",
      paragraphs: [
        "إذا كنتم غير راضين عن كيفية تعاملنا مع بياناتكم الشخصية أو استجابتنا لطلباتكم، يحق لكم:",
      ],
      items: [
        "التواصل معنا أولاً عبر support@classi-fy.com وسنبذل قصارى جهدنا لحل المشكلة.",
        "تقديم شكوى إلى السلطة الرقابية لحماية البيانات في بلد إقامتكم.",
        "للمقيمين في الاتحاد الأوروبي: يمكنكم تقديم شكوى إلى سلطة حماية البيانات المحلية (DPA) وفقًا للمادة 77 من GDPR.",
        "للمقيمين في الولايات المتحدة: يمكنكم التواصل مع لجنة التجارة الفيدرالية (FTC) بخصوص أي مخاوف تتعلق بخصوصية الأطفال بموجب COPPA.",
        "للمقيمين في كاليفورنيا: يمكنكم التواصل مع المدعي العام لولاية كاليفورنيا بخصوص حقوق CCPA.",
      ],
    },
  ],
};

const contentEn: typeof contentAr = {
  title: "Privacy Policy",
  subtitle: "Privacy Policy and Personal Data Protection",
  lastUpdated: "February 21, 2026",
  version: "Version 3.0",
  intro: "Welcome to Classify, the educational and entertainment platform designed for children and families. We value your privacy and are committed to protecting your personal data and your children's data. This Privacy Policy has been prepared to explain how we collect, use, store, protect, and share your personal information. Please read it carefully to understand our practices regarding your personal data.",
  sections: [
    {
      id: "scope",
      icon: <Globe className="w-5 h-5" />,
      title: "Scope of This Privacy Policy",
      paragraphs: [
        "This Privacy Policy applies to all personal information collected through the Classify platform, including the web application available at classi-fy.com, the mobile application available on Google Play Store and Apple App Store, and any related services, features, or tools associated with the platform.",
        "This Policy applies to all users, including parents, legal guardians, children, teachers, libraries, educational institutions, and any other individuals who interact with the platform in any way. By using any of our services, you consent to the collection, use, and disclosure of your information in accordance with this Policy.",
        "If you do not agree to any of the terms of this Policy, please do not use our services or provide any personal information to us. Your continued use of the platform constitutes your express consent to this Policy in its entirety.",
      ],
    },
    {
      id: "definitions",
      icon: <FileText className="w-5 h-5" />,
      title: "Definitions and Terminology",
      paragraphs: [
        "For the purposes of this Policy, the following terms shall have the meanings defined below:",
      ],
      items: [
        "\"Platform\" or \"Service\": Refers to all services, applications, and websites provided by Classify, including the web application, mobile applications, and any associated APIs.",
        "\"Personal Data\": Any information that can identify a natural person directly or indirectly, including name, email address, phone number, IP address, device identifiers, and others.",
        "\"Child\" or \"Minor\": Any person under the age of 16, or any other age determined by applicable local law regarding digital consent.",
        "\"Parent\" or \"Guardian\": The father, mother, or legal guardian responsible for the child registered on the platform.",
        "\"Processing\": Any operation performed on personal data, whether automated or manual, including collection, recording, organization, storage, modification, retrieval, erasure, and destruction.",
        "\"Third Party\": Any natural or legal person other than the user or Classify that receives or processes personal data.",
        "\"Cookie\": Small text files stored on the user's device when visiting the platform to improve the user experience.",
        "\"Data Controller\": The natural or legal person who determines the purposes and means of processing personal data.",
      ],
    },
    {
      id: "controller",
      icon: <Building2 className="w-5 h-5" />,
      title: "Data Controller Information",
      paragraphs: [
        "Proomnes (referred to as \"we\", \"us\", or \"Classify\") is responsible for processing your personal data in accordance with this Policy. We act as the Data Controller under the General Data Protection Regulation (GDPR) and applicable local laws.",
        "To contact us regarding any privacy or data protection inquiries:",
      ],
      items: [
        "Email: support@classi-fy.com",
        "Website: https://classi-fy.com",
        "Data Protection Officer (DPO): privacy@classi-fy.com",
      ],
    },
    {
      id: "data-collected",
      icon: <Database className="w-5 h-5" />,
      title: "Information We Collect",
      paragraphs: [
        "We collect different types of information to provide and improve our services. Below is a detailed description of each type of data we collect:",
      ],
      subsections: [
        {
          title: "a. Registration and Account Data",
          paragraphs: ["When creating an account on the platform as a parent, we collect the following information:"],
          items: [
            "Full name of the parent as it appears on official identification",
            "Email address used for login and notification delivery",
            "Mobile phone number (optional) for two-factor authentication via SMS",
            "Encrypted password (we only retain the encrypted version and cannot read the original password)",
            "Account creation date and IP address used during registration",
            "Preferred language and timezone settings",
            "Identity verification status (email and phone)",
          ],
        },
        {
          title: "b. Children's Data",
          paragraphs: ["When a parent adds a child to their account, we collect the following information about the child with parental consent:"],
          items: [
            "Child's first name (or a nickname chosen by the parent)",
            "Date of birth or age group (to customize appropriate educational content)",
            "Gender (optional — used only for UI customization)",
            "Avatar chosen by the child or parent",
            "Educational level and grade",
            "Favorite characters and topics of interest (to enhance educational game experiences)",
            "Educational progress data, points, and achievements earned on the platform",
          ],
        },
        {
          title: "c. Usage and Interaction Data",
          paragraphs: ["While using the platform, we automatically collect information about how you interact with our services:"],
          items: [
            "Activity logs: pages visited, games played, tasks completed",
            "Session duration and login/logout times",
            "Interactions with educational content: correct and incorrect answers, completion rates",
            "UI interactions: clicks, scrolling, navigation patterns",
            "Game performance data: scores, levels achieved, cognitive reports",
            "Error logs and technical issues for performance improvement purposes",
          ],
        },
        {
          title: "d. Device and Technical Information",
          paragraphs: ["We automatically collect technical information about devices used to access the platform:"],
          items: [
            "Device type, manufacturer, and model",
            "Operating system and version (e.g., Android 14, iOS 17, Windows 11)",
            "Browser type and version (e.g., Chrome, Safari, Firefox)",
            "Screen resolution and orientation (portrait/landscape)",
            "IP address and approximate geographic location (country/city level)",
            "Unique device identifiers (Device ID) for security purposes only",
            "Network connection information (WiFi / cellular data)",
            "Device language and region settings",
          ],
        },
        {
          title: "e. Payment and Financial Transaction Data",
          paragraphs: ["If you make any purchases through the platform, we do not directly store your credit or debit card information. All payment processing is handled through a certified external payment processor (Stripe) that complies with Payment Card Industry Data Security Standards (PCI DSS)."],
          items: [
            "We retain the Stripe Customer ID (does not contain credit card information)",
            "Transaction records: date, amount, subscription type, and payment status",
            "Refund records and refunded amounts if applicable",
            "We never store: card numbers, CVV codes, or expiration dates",
          ],
        },
      ],
    },
    {
      id: "collection-methods",
      icon: <Fingerprint className="w-5 h-5" />,
      title: "How We Collect Data",
      paragraphs: ["We collect personal data through the following methods:"],
      items: [
        "Direct Collection: Information you voluntarily provide when creating an account, filling out a form, contacting support, making a purchase, or participating in surveys.",
        "Automatic Collection: Information collected automatically through cookies, tracking pixels, and similar technologies when you use our platform.",
        "Collection from Children: Children's data is collected only after obtaining express and verified parental consent. Children are not permitted to provide personal data without parental permission.",
        "From Third Parties: We may receive information from social authentication service providers (such as Google Sign-In) if you choose to log in through these services, limited to name and email address.",
      ],
    },
    {
      id: "data-usage",
      icon: <BarChart3 className="w-5 h-5" />,
      title: "How We Use Your Information",
      paragraphs: ["We use the personal data we collect for the following purposes only:"],
      items: [
        "Core Service Delivery: Creating and managing accounts, enabling parents to manage children's accounts, and providing age-appropriate educational content and games.",
        "Personalizing Educational Experience: Analyzing progress data to adapt content difficulty and type to each child's level, and providing personalized educational recommendations.",
        "Parent Reports: Providing detailed reports on the child's educational and cognitive performance to parents, including memory, concentration, and mathematical skills indicators.",
        "Communication and Notifications: Sending important account notifications, security updates, educational activity notifications, and verification messages (OTP).",
        "Security and Account Protection: Detecting suspicious activities and hacking attempts, securing accounts through two-factor authentication (2FA).",
        "Service Improvement: Analyzing aggregated (non-identifying) usage patterns to improve platform performance, content, and features.",
        "Legal Compliance: Fulfilling legal and regulatory obligations, including maintaining legally required records.",
        "Financial Transactions: Processing payments, subscriptions, and refund requests.",
        "Technical Support: Responding to inquiries and resolving technical issues encountered by users.",
        "Family Guidance: Enabling parents to review children's activities and manage privacy and security settings.",
      ],
    },
    {
      id: "legal-basis",
      icon: <Scale className="w-5 h-5" />,
      title: "Legal Basis for Data Processing",
      paragraphs: ["We process your personal data based on one or more of the following legal bases under the GDPR and applicable local legislation:"],
      items: [
        "Consent (Article 6(1)(a) GDPR): We rely on your express consent for processing children's personal data, sending marketing communications, and using non-essential cookies. You may withdraw your consent at any time.",
        "Performance of Contract (Article 6(1)(b) GDPR): We process data necessary to provide the service you requested, including account creation, educational content provision, and payment processing.",
        "Legitimate Interests (Article 6(1)(f) GDPR): We process data for legitimate purposes such as improving security, preventing fraud, analyzing performance, and developing the service, provided your interests or fundamental rights do not override these interests.",
        "Legal Obligation (Article 6(1)(c) GDPR): We process data when necessary to comply with a legal obligation, such as child protection laws and tax reporting.",
        "Vital Interests (Article 6(1)(d) GDPR): In exceptional cases, we may process data to protect the vital interests of the user or another person.",
      ],
    },
    {
      id: "children-privacy",
      icon: <Baby className="w-5 h-5" />,
      title: "Children's Privacy and COPPA Compliance",
      paragraphs: [
        "Classify places the utmost importance on protecting children's privacy. We recognize the significant responsibility we bear in protecting minors' data, and we strictly comply with the Children's Online Privacy Protection Act (COPPA) issued by the U.S. Federal Trade Commission (FTC), the EU GDPR regarding children (Article 8), and all applicable local laws for protecting minors' privacy.",
        "Our commitments regarding children's data include:",
      ],
      items: [
        "Verified Parental Consent: No personal data is collected from a child without first obtaining verifiable parental consent. Parent identity is verified through email address and two-factor authentication.",
        "Data Minimization: We collect only the data necessary to provide the educational service. We do not ask children to provide personal information beyond what is required.",
        "No Behavioral Advertising to Children: We do not display any behaviorally targeted or personalized advertising to children. Any promotional content on the platform is entirely educational and not based on the child's personal data.",
        "No Sharing of Children's Data: We do not sell, rent, or share children's personal data with any third party for marketing or commercial purposes whatsoever.",
        "Family Guidance Access: Parents have the right at any time to review their child's data, request its modification or complete deletion, and withdraw consent for data collection.",
        "Immediate Deletion: When a parent requests deletion of their child's account, all personal data of the child is deleted within 30 days in accordance with COPPA requirements.",
        "Safe Environment: The child's account operates in a restricted environment that does not include direct messages, chat with strangers, location sharing, or any feature that exposes the child to unsafe communication risks.",
        "Encryption of Children's Data: All children's data is encrypted in transit (TLS 1.3) and at rest (AES-256) using the latest encryption standards.",
        "Limited Child Permissions: The child's account has read-only permissions. The child cannot modify personal settings or share any content outside the platform without parental consent.",
      ],
    },
    {
      id: "parental-consent",
      icon: <Users className="w-5 h-5" />,
      title: "Parental Consent and Verification",
      paragraphs: ["We follow strict procedures to obtain and verify parental consent before allowing any collection or processing of children's data:"],
      items: [
        "When creating a new account, the parent must confirm they are the parent or legal guardian of the child.",
        "The parent must read and expressly agree to this Privacy Policy before adding any child.",
        "Parent identity is verified through email and one-time verification code (OTP).",
        "Parents can enable two-factor authentication (2FA) as an additional security layer for the family account.",
        "Parental consent is recorded with date, time, and IP address as auditable evidence.",
        "Parents can withdraw consent at any time by deleting the child's account, resulting in deletion of all child data.",
        "We periodically review consent verification mechanisms to ensure alignment with best practices and legal requirements.",
      ],
    },
    {
      id: "data-sharing",
      icon: <Shield className="w-5 h-5" />,
      title: "Data Sharing and Disclosure",
      paragraphs: ["We do not sell your personal data or your children's data to any third party. We share personal data only in the following limited circumstances:"],
      items: [
        "Essential Service Providers: We share the minimum necessary data with trusted service providers who help us operate the platform (such as Stripe for payment processing, and email services for sending notifications). These providers are contractually bound to protect your data and not use it for any other purpose.",
        "Legal Compliance: We may disclose data if required by law, court order, or governmental proceeding, or to comply with a valid legal subpoena.",
        "Protection of Rights: We may disclose data if necessary to protect our rights, property, or safety, or the safety of our users or the public.",
        "Your Consent: We may share data with other parties if we obtain your express prior consent.",
        "Mergers and Acquisitions: In the event of a merger, acquisition, or asset sale, personal data may be transferred as part of the transaction, with prior notification and opportunity for you to take action.",
      ],
    },
    {
      id: "third-parties",
      icon: <Link2 className="w-5 h-5" />,
      title: "Third-Party Service Providers",
      paragraphs: ["We work with trusted third-party service providers to operate certain aspects of our platform. Below is a list of the main providers and the types of data they process:"],
      items: [
        "Stripe (Payment Processing): Processes payment data and credit cards in accordance with PCI DSS standards. Privacy Policy: https://stripe.com/privacy",
        "Email Services (SMTP): Used to send verification messages and notifications. Only the email address is shared.",
        "Cloud Hosting Services: We use secure servers for data storage with full encryption and DDoS protection.",
        "CDN Service: For accelerating static content loading (images, files). No personal data is shared.",
      ],
      subsections: [
        {
          title: "Service Provider Obligations",
          paragraphs: ["All external service providers are committed to:"],
          items: [
            "Signing Data Processing Agreements (DPA) compliant with GDPR",
            "Processing data only according to our instructions and for specified purposes",
            "Implementing appropriate technical and organizational security measures",
            "Notifying us immediately of any data breach",
            "Deleting data when the purpose of processing has ended",
          ],
        },
      ],
    },
    {
      id: "international-transfers",
      icon: <Globe className="w-5 h-5" />,
      title: "International Data Transfers",
      paragraphs: ["Your personal data may be transferred, processed, and stored in countries outside your country of residence, including countries that may not have the same level of data protection as your country. When transferring data internationally, we take the following measures to protect your data:"],
      items: [
        "We use Standard Contractual Clauses (SCCs) approved by the European Commission for transferring data outside the European Economic Area.",
        "We ensure that service providers in receiving countries implement appropriate protection measures.",
        "We periodically conduct Transfer Impact Assessments on privacy rights.",
        "All data is encrypted during transfer using TLS 1.3 protocol at minimum.",
      ],
    },
    {
      id: "data-security",
      icon: <Lock className="w-5 h-5" />,
      title: "Data Security Measures",
      paragraphs: ["We implement a comprehensive set of technical and organizational security measures to protect your personal data from loss, theft, unauthorized access, disclosure, modification, and destruction. These measures include:"],
      items: [
        "Encryption in Transit: All communications between your devices and our servers are encrypted using TLS 1.3 with SSL/TLS certificates issued by certified certificate authorities.",
        "Encryption at Rest: Passwords are encrypted using the bcrypt algorithm with a high cost factor. Other sensitive data is encrypted using AES-256.",
        "Two-Factor Authentication (2FA): Available for all parent accounts via one-time verification code (OTP) through email or SMS.",
        "Rate Limiting: Protection against brute force attacks on authentication endpoints (login, OTP requests).",
        "Security Headers: Using Helmet.js to implement HTTP security headers including CSP, X-Frame-Options, and HSTS.",
        "Firewall and DDoS Protection: Multi-layered protection against distributed denial-of-service attacks.",
        "Continuous Security Monitoring: We monitor our systems 24/7 to detect any suspicious activity or hacking attempts.",
        "Encrypted Backups: Daily encrypted data backups with periodic restoration testing.",
        "Access Control: Principle of Least Privilege for all employees and systems.",
        "Security Updates: Security updates and patches applied immediately upon release.",
      ],
    },
    {
      id: "data-retention",
      icon: <Clock className="w-5 h-5" />,
      title: "Data Retention Periods",
      paragraphs: ["We retain your personal data only for the period necessary to fulfill the purposes for which it was collected, or as required by law. Below is our detailed retention policy:"],
      items: [
        "Active Account Data: Retained throughout the life of the active account. You may request deletion at any time.",
        "Children's Data: Deleted within 30 days of parent request or child account deletion.",
        "Usage Logs: Retained for 12 months then anonymized for statistical analysis.",
        "Payment Data: Transaction records retained for 7 years in accordance with accounting and tax requirements.",
        "Security Logs: Retained for 24 months for security and incident investigation purposes.",
        "Privacy Consent Records: Retained for 5 years as compliance evidence.",
        "Deleted Account Data: Deletion process begins immediately upon request. Personal data deleted within 30 days. Some anonymized records may be retained for statistical purposes.",
        "Backups: Data deleted from backups within 90 days of deletion from primary systems.",
      ],
    },
    {
      id: "user-rights",
      icon: <FileText className="w-5 h-5" />,
      title: "Your Rights and Choices",
      paragraphs: ["We respect your rights to control your personal data. You have the following rights regardless of your geographic location:"],
      items: [
        "Right of Access: You have the right to request a copy of all personal data we hold about you and your children. We will provide this data in a readable electronic format within 30 days.",
        "Right to Rectification: You have the right to request correction of any inaccurate or incomplete data we hold about you.",
        "Right to Erasure (Right to be Forgotten): You have the right to request complete deletion of your personal data and your children's data. We will complete deletion within 30 days unless there is a legal obligation to retain it.",
        "Right to Restrict Processing: You have the right to request restriction of processing of your data in certain circumstances, such as questioning data accuracy.",
        "Right to Data Portability: You have the right to request export of your data in a structured, machine-readable format (JSON or CSV) for transfer to another service provider.",
        "Right to Object: You have the right to object to processing of your data for certain purposes, such as direct marketing.",
        "Right to Withdraw Consent: You have the right to withdraw your consent to data processing at any time, without affecting the lawfulness of processing conducted before withdrawal.",
        "Right to Lodge a Complaint: You have the right to file a complaint with the competent supervisory authority in your country of residence.",
      ],
    },
    {
      id: "gdpr-rights",
      icon: <Globe className="w-5 h-5" />,
      title: "Rights of EU Residents (GDPR)",
      paragraphs: ["If you are a resident of the European Economic Area (EEA), the United Kingdom, or Switzerland, you have additional rights under the GDPR and equivalent local legislation:"],
      items: [
        "Right to clear information about how your data is processed (Articles 13 and 14 GDPR).",
        "Right of access to your data (Article 15 GDPR).",
        "Right to rectification (Article 16 GDPR).",
        "Right to erasure / Right to be forgotten (Article 17 GDPR).",
        "Right to restriction of processing (Article 18 GDPR).",
        "Right to data portability (Article 20 GDPR).",
        "Right to object to processing (Article 21 GDPR).",
        "Right not to be subject to a decision based solely on automated processing (Article 22 GDPR).",
        "Right to lodge a complaint with the data protection supervisory authority in your country of residence.",
      ],
    },
    {
      id: "ccpa-rights",
      icon: <Scale className="w-5 h-5" />,
      title: "Rights of California Residents (CCPA/CPRA)",
      paragraphs: ["If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA) and its amendments (CPRA):"],
      items: [
        "Right to Know: You have the right to know the categories and types of personal data we collect, use, and share.",
        "Right to Delete: You have the right to request deletion of your personal data.",
        "Right to Opt-Out of Sale: We do not sell your personal data. If this changes in the future, you will have the ability to opt out.",
        "Right to Non-Discrimination: We will not discriminate against you for exercising your privacy rights.",
        "Right to Correction: You have the right to request correction of inaccurate data.",
        "Right to Limit Use of Sensitive Information: You have the right to limit how we use your sensitive personal information.",
      ],
      subsections: [
        {
          title: "CCPA Disclosures",
          paragraphs: [],
          items: [
            "Categories of personal information collected: Identifiers (name, email), Internet information (browsing logs), educational data.",
            "Sources of information: Directly from the user, automatically from devices.",
            "Purposes of collection: Service delivery, improvement, and security.",
            "We do not sell personal information to any party.",
            "We do not share children's personal information with any party for commercial purposes.",
          ],
        },
      ],
    },
    {
      id: "cookies",
      icon: <Cookie className="w-5 h-5" />,
      title: "Cookies and Similar Technologies",
      paragraphs: [
        "We use cookies and local storage technologies to operate our platform properly and improve your experience. For more details, please refer to our Cookie Policy.",
      ],
      items: [
        "Essential Cookies: Required for platform operation (such as authentication session cookies). Cannot be disabled.",
        "Functional Cookies: Used to remember your preferences (language, dark/light mode).",
        "Analytics Cookies: Used to understand how the platform is used and improve it. Data is collected in aggregate and anonymized form.",
        "You can manage cookie preferences through your browser settings. Please note that disabling certain types of cookies may affect your platform experience.",
      ],
    },
    {
      id: "external-links",
      icon: <Link2 className="w-5 h-5" />,
      title: "External Links",
      paragraphs: [
        "Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices or content of these external websites. We recommend reading the privacy policies of each website you visit.",
        "External links available on the platform are provided for convenience only and do not imply our endorsement of the content or practices of these websites.",
      ],
    },
    {
      id: "policy-updates",
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Updates to This Privacy Policy",
      paragraphs: ["We reserve the right to update this Privacy Policy from time to time to reflect changes in our practices, technologies, or legal requirements. When making any material changes:"],
      items: [
        "We will notify you via your registered email address 30 days before the change takes effect.",
        "We will display a prominent notice on the platform indicating the changes.",
        "We will update the \"Last Updated\" date at the top of this Policy.",
        "For material changes affecting children's data, we may request new parental consent.",
        "Your continued use of the platform after the effective date of changes constitutes your acceptance of the updated Policy.",
      ],
    },
    {
      id: "contact",
      icon: <Mail className="w-5 h-5" />,
      title: "How to Contact Us",
      paragraphs: ["If you have any questions, inquiries, or concerns about this Privacy Policy or our data protection practices, or if you wish to exercise any of your rights mentioned above, please contact us via:"],
      items: [
        "General Email: support@classi-fy.com",
        "Data Protection Officer (DPO): privacy@classi-fy.com",
        "Website: https://classi-fy.com/contact",
        "We commit to responding to all privacy-related inquiries within a maximum of 30 days in accordance with GDPR requirements.",
      ],
    },
    {
      id: "complaints",
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "Complaints and Regulatory Bodies",
      paragraphs: ["If you are unsatisfied with how we handle your personal data or our response to your requests, you have the right to:"],
      items: [
        "Contact us first at support@classi-fy.com and we will do our best to resolve the issue.",
        "File a complaint with the data protection supervisory authority in your country of residence.",
        "For EU residents: You may file a complaint with your local Data Protection Authority (DPA) according to Article 77 of GDPR.",
        "For US residents: You may contact the Federal Trade Commission (FTC) regarding any children's privacy concerns under COPPA.",
        "For California residents: You may contact the California Attorney General regarding CCPA rights.",
      ],
    },
  ],
};

export const PrivacyPolicy = (): JSX.Element => {
  const { i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const lang = i18n.language === "ar" ? "ar" : "en";
  const isRTL = lang === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const c = lang === "ar" ? contentAr : contentEn;
  const [openToc, setOpenToc] = useState(false);

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-blue-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <BackArrow className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6" />
              <h1 className="text-xl md:text-2xl font-bold">{c.title}</h1>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Meta Card */}
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className={`px-6 md:px-8 py-5 ${isDark ? "border-b border-gray-700" : "bg-blue-50 border-b border-blue-100"}`}>
            <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Classify — {c.subtitle}
            </p>
            <div className="flex flex-wrap gap-4 mt-2">
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {lang === "ar" ? "آخر تحديث" : "Last Updated"}: {c.lastUpdated}
              </p>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {c.version}
              </p>
            </div>
          </div>

          {/* Introduction */}
          <div className="px-6 md:px-8 py-6">
            <p className={`leading-relaxed text-base ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {c.intro}
            </p>
          </div>
        </div>

        {/* Table of Contents */}
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <button
            onClick={() => setOpenToc(!openToc)}
            className={`w-full px-6 md:px-8 py-4 flex items-center justify-between ${isDark ? "hover:bg-gray-750" : "hover:bg-gray-50"} transition-colors`}
          >
            <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {lang === "ar" ? "📑 جدول المحتويات" : "📑 Table of Contents"}
            </h2>
            <ChevronDown className={`w-5 h-5 transition-transform ${openToc ? "rotate-180" : ""} ${isDark ? "text-gray-400" : "text-gray-500"}`} />
          </button>
          {openToc && (
            <div className={`px-6 md:px-8 pb-5 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
              <ol className="pt-3 space-y-1.5">
                {c.sections.map((section, idx) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={`text-sm hover:underline ${isDark ? "text-blue-400" : "text-blue-600"}`}
                    >
                      {idx + 1}. {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-6 space-y-8">
            {c.sections.map((section, idx) => (
              <section key={section.id} id={section.id}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg shrink-0 ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                    {section.icon}
                  </div>
                  <h2 className={`text-lg md:text-xl font-bold pt-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {idx + 1}. {section.title}
                  </h2>
                </div>
                <div className={`${isRTL ? "pr-12" : "pl-12"}`}>
                  {section.paragraphs.map((p, pi) => (
                    <p key={pi} className={`leading-relaxed mb-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {p}
                    </p>
                  ))}
                  {section.items && (
                    <ul className="space-y-2 mb-4">
                      {section.items.map((item, i) => (
                        <li key={i} className={`flex items-start gap-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          <span className="text-blue-500 mt-1.5 shrink-0">•</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.subsections?.map((sub, si) => (
                    <div key={si} className={`mt-4 p-4 rounded-xl ${isDark ? "bg-gray-750 border border-gray-700" : "bg-gray-50 border border-gray-200"}`}>
                      <h3 className={`font-semibold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                        {sub.title}
                      </h3>
                      {sub.paragraphs.map((p, pi) => (
                        <p key={pi} className={`leading-relaxed mb-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          {p}
                        </p>
                      ))}
                      {sub.items && (
                        <ul className="space-y-1.5">
                          {sub.items.map((item, i) => (
                            <li key={i} className={`flex items-start gap-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                              <span className="text-blue-500 mt-1 shrink-0">‣</span>
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
                {idx < c.sections.length - 1 && (
                  <div className={`mt-6 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`} />
                )}
              </section>
            ))}
          </div>
        </div>

        {/* Related Legal Pages */}
        <div className={`rounded-2xl shadow-lg overflow-hidden mt-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-5">
            <h3 className={`font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
              {lang === "ar" ? "📄 صفحات قانونية ذات صلة" : "📄 Related Legal Pages"}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { href: "/terms", label: lang === "ar" ? "شروط الاستخدام" : "Terms of Service" },
                { href: "/cookie-policy", label: lang === "ar" ? "سياسة ملفات الارتباط" : "Cookie Policy" },
                { href: "/child-safety", label: lang === "ar" ? "سلامة الأطفال" : "Child Safety" },
                { href: "/refund-policy", label: lang === "ar" ? "سياسة الاسترداد" : "Refund Policy" },
                { href: "/acceptable-use", label: lang === "ar" ? "سياسة الاستخدام المقبول" : "Acceptable Use" },
                { href: "/delete-account", label: lang === "ar" ? "حذف الحساب" : "Delete Account" },
              ].map(link => (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href)}
                  className={`text-sm px-3 py-2 rounded-lg text-start transition-colors ${isDark ? "bg-gray-700 hover:bg-gray-600 text-blue-400" : "bg-blue-50 hover:bg-blue-100 text-blue-600"
                    }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            © {new Date().getFullYear()} Classify by Proomnes. {lang === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
          </p>
        </div>
      </main>
    </div>
  );
};
