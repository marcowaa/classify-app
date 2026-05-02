import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  FileText, ArrowLeft, ArrowRight, CheckCircle, Users, Shield, Copyright,
  AlertTriangle, XCircle, RefreshCw, Mail, Scale, Gavel, UserCheck,
  Ban, CreditCard, Globe, Clock, BookOpen, ChevronDown, Settings
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

interface Content {
  title: string;
  subtitle: string;
  lastUpdated: string;
  version: string;
  intro: string;
  sections: Section[];
}

const contentAr: Content = {
  title: "شروط الاستخدام",
  subtitle: "شروط وأحكام استخدام منصة Classify",
  lastUpdated: "21 فبراير 2026",
  version: "الإصدار 3.0",
  intro: "مرحبًا بكم في Classify (\"كلاسيفاي\"). يُرجى قراءة هذه الشروط والأحكام بعناية قبل استخدام منصتنا. تُشكّل هذه الشروط اتفاقية قانونية ملزمة بينكم وبين شركة Proomnes (\"الشركة\" أو \"نحن\") المالكة والمشغلة لمنصة Classify. باستخدامكم لأي من خدماتنا، فإنكم توافقون على الالتزام بهذه الشروط. إذا كنتم لا توافقون على هذه الشروط، يُرجى عدم استخدام المنصة.",
  sections: [
    {
      id: "acceptance",
      icon: <CheckCircle className="w-5 h-5" />,
      title: "قبول الشروط والأحكام",
      paragraphs: [
        "بالوصول إلى منصة Classify أو استخدامها بأي شكل من الأشكال — بما في ذلك تصفح المحتوى أو إنشاء حساب أو تسجيل طفل أو استخدام أي ميزة — فإنكم تقرّون بأنكم قد قرأتم هذه الشروط وفهمتموها وتوافقون على الالتزام بها.",
        "إذا كنتم تستخدمون المنصة نيابة عن مؤسسة تعليمية أو كيان قانوني، فإنكم تمثلون وتضمنون أن لديكم الصلاحية اللازمة لربط ذلك الكيان بهذه الشروط.",
        "تشمل هذه الشروط بالإشارة: سياسة الخصوصية، وسياسة ملفات تعريف الارتباط، وسياسة الاستخدام المقبول، وسياسة الاسترداد، وسياسة سلامة الأطفال، وأي سياسات إضافية قد نصدرها من وقت لآخر.",
      ],
    },
    {
      id: "definitions",
      icon: <BookOpen className="w-5 h-5" />,
      title: "التعريفات",
      paragraphs: ["في هذه الشروط، تحمل المصطلحات التالية المعاني المبينة أدناه:"],
      items: [
        "\"المنصة\": موقع classi-fy.com وتطبيقات الجوال وأي برامج أو واجهات أو خدمات مملوكة أو مدارة بواسطة الشركة.",
        "\"الحساب\": حساب المستخدم المسجل الذي يتيح الوصول إلى ميزات المنصة.",
        "\"المحتوى\": جميع النصوص والصور والفيديوهات والألعاب والتصاميم والبرمجيات والبيانات التعليمية المتاحة عبر المنصة.",
        "\"المستخدم\": أي شخص يصل إلى المنصة أو يستخدمها، بما في ذلك أولياء الأمور والأطفال والمعلمين والمؤسسات.",
        "\"ولي الأمر\": أي شخص بالغ مسؤول يُنشئ حسابًا ويُدير حسابات أطفاله على المنصة.",
        "\"الطفل\": أي مستخدم دون سن 16 عامًا يستخدم المنصة تحت إشراف ولي الأمر.",
        "\"الاشتراك\": أي خطة مدفوعة توفر ميزات إضافية أو محتوى متقدم.",
        "\"المحتوى الذي ينشئه المستخدم\": أي محتوى يرفعه أو يُنشئه المستخدمون على المنصة.",
      ],
    },
    {
      id: "service-description",
      icon: <Settings className="w-5 h-5" />,
      title: "وصف الخدمة",
      paragraphs: [
        "Classify هي منصة تعليمية وترفيهية مصممة خصيصًا للأطفال وعائلاتهم. توفر المنصة مجموعة من الخدمات تشمل:",
      ],
      items: [
        "ألعاب تعليمية تفاعلية مصممة لتنمية المهارات المعرفية والحسابية والذاكرة.",
        "نظام دعم عائلي شامل يتيح لأولياء الأمور تنظيم محتوى ونشاط أطفالهم بثقة.",
        "تقارير أداء تعليمية مفصلة تتبع تقدم الطفل في مختلف المجالات المعرفية.",
        "نظام نقاط ومكافآت يحفز الأطفال على التعلم والاستمرار.",
        "نظام مهام تعليمية قابلة للتخصيص من قبل ولي الأمر.",
        "نظام هدايا ومكافآت رقمية بين أفراد العائلة.",
        "دعم متعدد اللغات (العربية والإنجليزية والبرتغالية).",
        "توافق مع أجهزة متعددة (ويب، أندرويد، iOS).",
      ],
      subsections: [
        {
          title: "طبيعة الخدمة",
          paragraphs: [],
          items: [
            "الخدمة تعليمية ترفيهية وليست بديلاً عن التعليم الرسمي أو الاستشارات التربوية المتخصصة.",
            "نسعى لتوفير خدمة متاحة على مدار الساعة، لكننا لا نضمن عدم حدوث انقطاعات مؤقتة للصيانة أو التحديث.",
            "نحتفظ بالحق في تعديل أو إيقاف أو إضافة ميزات دون إشعار مسبق.",
          ],
        },
      ],
    },
    {
      id: "eligibility",
      icon: <UserCheck className="w-5 h-5" />,
      title: "الأهلية ومتطلبات العمر",
      paragraphs: [
        "لاستخدام منصة Classify كوليّ أمر أو مستخدم بالغ، يجب أن يكون عمركم 18 عامًا على الأقل أو أن تكونوا بالغين قانونيًا في بلد إقامتكم، أيهما أعلى.",
        "الأطفال دون سن 16 عامًا لا يُسمح لهم باستخدام المنصة إلا من خلال حساب يُديره ويشرف عليه وليّ أمرهم. يتحمل ولي الأمر المسؤولية الكاملة عن جميع أنشطة أطفاله على المنصة.",
      ],
      items: [
        "يجب أن يكون ولي الأمر أبًا أو أمًا أو وصيًا قانونيًا للطفل المسجل.",
        "ولي الأمر مسؤول عن التحقق من مناسبة المحتوى لعمر طفله وقدراته.",
        "في حالة المؤسسات التعليمية، يجب أن يكون الحساب مُنشأ بواسطة شخص مخوّل من المؤسسة.",
        "يحق لنا طلب إثبات العمر أو الصفة القانونية في أي وقت.",
      ],
    },
    {
      id: "account-registration",
      icon: <Users className="w-5 h-5" />,
      title: "تسجيل الحساب وأمان الحساب",
      paragraphs: [
        "لاستخدام معظم ميزات المنصة، يتعين عليكم إنشاء حساب وتقديم معلومات دقيقة وحديثة وكاملة أثناء عملية التسجيل. بإنشائكم لحساب، فإنكم:",
      ],
      items: [
        "تتعهدون بأن جميع المعلومات المقدمة دقيقة وصحيحة، وأنكم ستقومون بتحديثها عند تغيّرها.",
        "تتعهدون بالحفاظ على سرية بيانات تسجيل الدخول (البريد الإلكتروني وكلمة المرور) وعدم مشاركتها مع أي شخص آخر.",
        "تتحملون المسؤولية الكاملة عن جميع الأنشطة التي تتم من خلال حسابكم.",
        "تتعهدون بإخطارنا فورًا في حالة أي وصول غير مصرّح به أو انتهاك أمني لحسابكم.",
        "توافقون على عدم إنشاء أكثر من حساب واحد لنفس الشخص.",
        "توافقون على عدم استخدام أسماء مضللة أو كاذبة أو انتحال هوية شخص آخر.",
        "توافقون على تفعيل المصادقة الثنائية (2FA) لتعزيز أمان حسابكم عندما تكون متاحة.",
      ],
      subsections: [
        {
          title: "حسابات الأطفال",
          paragraphs: [],
          items: [
            "يتم إنشاء حسابات الأطفال حصريًا من قبل ولي الأمر.",
            "يتحكم ولي الأمر في جميع إعدادات حساب الطفل بما في ذلك الخصوصية والوصول والمحتوى.",
            "لا يملك الطفل صلاحية تعديل إعداداته أو مشاركة بياناته خارج المنصة.",
            "حسابات الأطفال مقيدة بصلاحيات القراءة فقط لأغراض الأمان.",
          ],
        },
      ],
    },
    {
      id: "parental-consent",
      icon: <Shield className="w-5 h-5" />,
      title: "موافقة ولي الأمر على استخدام الأطفال",
      paragraphs: [
        "بتسجيل طفل على منصة Classify، فإن ولي الأمر:",
      ],
      items: [
        "يُقرّ بأنه الوالد أو الوصي القانوني للطفل المسجل.",
        "يمنح Classify الإذن بجمع واستخدام بيانات الطفل وفقًا لسياسة الخصوصية.",
        "يتحمل المسؤولية الكاملة عن متابعة نشاط الطفل التعليمي على المنصة.",
        "يُقرّ بأنه قد قرأ وفهم ووافق على سياسة الخصوصية وسياسة سلامة الأطفال.",
        "يحتفظ بالحق الكامل في مراجعة بيانات طفله أو تعديلها أو حذفها في أي وقت.",
        "يوافق على أن يتلقى إشعارات تتعلق بنشاط طفله التعليمي وأمان حسابه.",
        "يمكنه سحب موافقته في أي وقت عن طريق حذف حساب الطفل.",
      ],
    },
    {
      id: "user-responsibilities",
      icon: <UserCheck className="w-5 h-5" />,
      title: "مسؤوليات المستخدم",
      paragraphs: [
        "كمستخدم لمنصة Classify، فإنكم تتعهدون بالالتزام بما يلي:",
      ],
      items: [
        "استخدام المنصة للأغراض التعليمية والترفيهية المشروعة فقط وفقًا لهذه الشروط.",
        "عدم استخدام المنصة لأي أغراض غير قانونية أو محظورة بموجب هذه الشروط أو القوانين المعمول بها.",
        "عدم محاولة الوصول غير المصرّح به إلى أي جزء من المنصة أو أنظمتها أو خوادمها.",
        "عدم إرسال أو تحميل أي محتوى مسيء أو ضار أو تمييزي أو غير قانوني.",
        "عدم استخدام أي روبوتات أو برامج زحف أو أدوات آلية للوصول إلى المنصة.",
        "عدم محاولة إجراء هندسة عكسية أو فك تشفير أو تفكيك أي جزء من المنصة.",
        "عدم التدخل في عمل المنصة أو الإضرار بتجربة المستخدمين الآخرين.",
        "الإبلاغ فورًا عن أي محتوى مسيء أو ثغرة أمنية أو سوء استخدام تكتشفونه.",
        "احترام حقوق الملكية الفكرية لـ Classify والمستخدمين الآخرين.",
      ],
    },
    {
      id: "prohibited-conduct",
      icon: <Ban className="w-5 h-5" />,
      title: "السلوكيات المحظورة",
      paragraphs: [
        "يُحظر تمامًا على المستخدمين القيام بأي من الأفعال التالية، ويُعد ارتكابها سببًا لتعليق أو إنهاء الحساب فورًا:",
      ],
      items: [
        "انتحال هوية شخص آخر أو تقديم معلومات كاذبة أو مضللة عند التسجيل.",
        "استخدام المنصة للتواصل مع الأطفال بشكل غير لائق أو مشبوه.",
        "تحميل أو مشاركة أي محتوى إباحي أو عنيف أو يحرض على الكراهية.",
        "محاولة اختراق أو تعطيل خوادم المنصة أو بنيتها التحتية.",
        "استخراج البيانات (Data Scraping) أو جمع بيانات المستخدمين الآخرين دون إذن.",
        "بيع أو نقل أو تأجير حسابكم أو أي بيانات مرتبطة به لأي طرف.",
        "استخدام المنصة لأغراض تجارية أو إعلانية دون إذننا الكتابي المسبق.",
        "التحايل على أي تدابير أمنية أو قيود مفروضة على المنصة.",
        "إنشاء حسابات متعددة لنفس الشخص لأغراض التلاعب.",
        "أي فعل ينتهك القوانين المحلية أو الدولية المعمول بها.",
      ],
    },
    {
      id: "intellectual-property",
      icon: <Copyright className="w-5 h-5" />,
      title: "حقوق الملكية الفكرية",
      paragraphs: [
        "جميع حقوق الملكية الفكرية للمنصة ومحتوياتها مملوكة لشركة Proomnes أو مرخصة لها. يشمل ذلك على سبيل المثال لا الحصر:",
      ],
      items: [
        "العلامة التجارية \"Classify\" وشعارها وتصميماتها.",
        "جميع الألعاب التعليمية وتصميماتها وشخصياتها ومؤثراتها الصوتية والبصرية.",
        "الكود المصدري للمنصة وواجهات برمجة التطبيقات (APIs) والخوارزميات.",
        "تصميم واجهة المستخدم وتجربة المستخدم (UI/UX).",
        "المحتوى التعليمي والنصوص والصور والرسومات والأيقونات.",
        "قواعد البيانات وهيكلها ومحتواها الخاص بالمنصة.",
      ],
      subsections: [
        {
          title: "الاستخدام المسموح",
          paragraphs: ["نمنحكم ترخيصًا محدودًا وغير حصري وغير قابل للتحويل وقابلاً للإلغاء لاستخدام المنصة لأغراضكم الشخصية والتعليمية وفقًا لهذه الشروط. لا يجوز لكم:"],
          items: [
            "نسخ أو تعديل أو توزيع أو إعادة إنتاج أي جزء من المنصة أو محتواها.",
            "إزالة أو تعديل أي إشعارات حقوق ملكية أو علامات تجارية.",
            "استخدام المحتوى لأغراض تجارية دون إذن كتابي مسبق.",
            "إنشاء أعمال مشتقة بناءً على محتوى المنصة.",
          ],
        },
      ],
    },
    {
      id: "user-content",
      icon: <FileText className="w-5 h-5" />,
      title: "المحتوى الذي ينشئه المستخدم",
      paragraphs: [
        "في حالة إتاحة ميزات تسمح للمستخدمين بإنشاء أو تحميل محتوى (مثل الصور الرمزية أو الأسماء المستعارة):",
      ],
      items: [
        "تحتفظون بحقوق الملكية على المحتوى الذي تنشئونه.",
        "تمنحون Classify ترخيصًا عالميًا غير حصري وبدون حقوق ملكية لاستخدام هذا المحتوى وعرضه وتخزينه بالقدر اللازم لتشغيل المنصة.",
        "تضمنون أن المحتوى الذي تقدمونه لا ينتهك حقوق أي طرف ثالث.",
        "نحتفظ بالحق في إزالة أي محتوى نراه غير مناسب أو مخالفًا لشروطنا دون إشعار مسبق.",
        "ولي الأمر مسؤول عن مراجعة أي محتوى ينشئه طفله على المنصة.",
      ],
    },
    {
      id: "payments",
      icon: <CreditCard className="w-5 h-5" />,
      title: "المدفوعات والاشتراكات",
      paragraphs: [
        "قد نوفر خدمات أو محتوى مدفوع على المنصة. بإجراء أي عملية شراء، فإنكم توافقون على ما يلي:",
      ],
      items: [
        "جميع الأسعار معروضة بالعملة المحددة وتشمل أو لا تشمل الضرائب وفقًا للقوانين المحلية.",
        "يتم تجديد الاشتراكات تلقائيًا ما لم يتم إلغاؤها قبل تاريخ التجديد.",
        "يتم معالجة جميع المدفوعات بشكل آمن عبر Stripe ولا نقوم بتخزين معلومات بطاقات الائتمان.",
        "أنتم مسؤولون عن جميع الرسوم المتكبدة من خلال حسابكم.",
        "في حالة فشل الدفع، قد يتم تعليق الوصول إلى الميزات المدفوعة حتى تسوية المبلغ.",
        "يحق لنا تغيير الأسعار من وقت لآخر مع إشعاركم مسبقًا بـ 30 يومًا على الأقل.",
        "سياسة الاسترداد مفصلة في صفحة سياسة الاسترداد الخاصة بنا.",
      ],
    },
    {
      id: "disclaimers",
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "إخلاء المسؤولية والضمانات",
      paragraphs: [
        "تُقدَّم المنصة وخدماتها \"كما هي\" و\"حسب التوفر\" دون أي ضمانات صريحة أو ضمنية من أي نوع. على وجه الخصوص:",
      ],
      items: [
        "لا نضمن أن المنصة ستكون متاحة دون انقطاع أو أخطاء أو عيوب في جميع الأوقات.",
        "لا نضمن دقة أو اكتمال أو حداثة أي محتوى تعليمي مقدم عبر المنصة.",
        "لا نضمن أن المنصة ستلبي جميع متطلباتكم أو توقعاتكم.",
        "لا نتحمل مسؤولية أي قرارات تعليمية أو تربوية مبنية على تقارير أو بيانات المنصة.",
        "المحتوى التعليمي مكمّل وليس بديلاً عن المناهج الدراسية الرسمية أو الاستشارات المتخصصة.",
        "لا نضمن توافق المنصة مع جميع الأجهزة أو المتصفحات أو أنظمة التشغيل.",
        "نخلي مسؤوليتنا عن أي ضمانات ضمنية تتعلق بالتسويق أو الملاءمة لغرض معين أو عدم الانتهاك.",
      ],
    },
    {
      id: "liability",
      icon: <Scale className="w-5 h-5" />,
      title: "تحديد المسؤولية",
      paragraphs: [
        "إلى أقصى حد يسمح به القانون المعمول به، لا تتحمل Classify أو شركة Proomnes أو مدراؤها أو موظفوها أو وكلاؤها أو مقاولوها أو مقدمو خدماتها المسؤولية عن:",
      ],
      items: [
        "أي أضرار مباشرة أو غير مباشرة أو عرضية أو خاصة أو تبعية أو تأديبية ناتجة عن استخدام المنصة أو عدم القدرة على استخدامها.",
        "أي خسارة في البيانات أو الأرباح أو السمعة أو الفرص التجارية.",
        "أي أضرار ناتجة عن الوصول غير المصرح به إلى بياناتكم أو تعديلها.",
        "أي أضرار ناتجة عن محتوى أو سلوك أي طرف ثالث على المنصة.",
        "أي انقطاع أو تأخير أو عطل في الخدمة.",
      ],
      subsections: [
        {
          title: "سقف المسؤولية",
          paragraphs: [
            "في جميع الحالات، يكون إجمالي مسؤولية Classify عن أي مطالبة ناشئة عن أو متعلقة بهذه الشروط أو استخدام المنصة محدودًا بالمبلغ الأقل من: (أ) المبالغ التي دفعها المستخدم لـ Classify خلال الـ 12 شهرًا السابقة للمطالبة، أو (ب) مبلغ 100 دولار أمريكي.",
          ],
        },
      ],
    },
    {
      id: "indemnification",
      icon: <Shield className="w-5 h-5" />,
      title: "التعويض والتكفل",
      paragraphs: [
        "توافقون على تعويض وحماية وإبراء ذمة Classify وشركة Proomnes ومسؤوليها ومدرائها وموظفيها ووكلائها من وضد أي مطالبات أو أضرار أو التزامات أو خسائر أو تكاليف (بما في ذلك أتعاب المحاماة المعقولة) الناشئة عن أو المتعلقة بـ:",
      ],
      items: [
        "استخدامكم للمنصة أو أي انتهاك لهذه الشروط.",
        "المحتوى الذي تقدمونه أو تنشرونه على المنصة.",
        "انتهاككم لحقوق أي طرف ثالث.",
        "أي سوء استخدام من قبلكم أو من قبل أطفالكم المسجلين تحت حسابكم.",
        "أي انتهاك للقوانين أو اللوائح المعمول بها.",
      ],
    },
    {
      id: "termination",
      icon: <XCircle className="w-5 h-5" />,
      title: "إنهاء وتعليق الحساب",
      paragraphs: [
        "يمكن لأي من الطرفين إنهاء هذه الاتفاقية في أي وقت:",
      ],
      items: [
        "من قبل المستخدم: يمكنكم حذف حسابكم في أي وقت من خلال إعدادات الحساب أو عبر صفحة حذف الحساب أو التواصل مع الدعم. سيؤدي الحذف إلى إزالة جميع بياناتكم وبيانات أطفالكم المسجلين بشكل نهائي خلال 30 يومًا.",
        "من قبل Classify: نحتفظ بالحق في تعليق أو إنهاء حسابكم — فورًا ودون إشعار مسبق — في حالة: انتهاك هذه الشروط، أو الاستخدام الاحتيالي، أو السلوك الذي يُعرّض سلامة الأطفال أو المستخدمين الآخرين للخطر، أو عدم الدفع.",
        "لا يؤثر إنهاء الحساب على أي حقوق أو التزامات نشأت قبل الإنهاء.",
        "تظل البنود التالية سارية بعد إنهاء الحساب: حقوق الملكية الفكرية، تحديد المسؤولية، التعويض، القانون الحاكم.",
      ],
    },
    {
      id: "governing-law",
      icon: <Gavel className="w-5 h-5" />,
      title: "القانون الحاكم والاختصاص القضائي",
      paragraphs: [
        "تخضع هذه الشروط وتُفسَّر وفقًا لقوانين جمهورية مصر العربية، دون الأخذ بمبادئ تنازع القوانين. في حالة نشوب أي نزاع يتعلق بهذه الشروط أو استخدام المنصة:",
      ],
      items: [
        "يتعهد الطرفان ببذل محاولة حسن النية لحل النزاع وديًا خلال 30 يومًا من تاريخ الإخطار.",
        "إذا لم يُحل النزاع وديًا، يُحال إلى التحكيم الملزم وفقًا لقواعد مركز التحكيم المختص.",
        "يكون مقر التحكيم في القاهرة، جمهورية مصر العربية.",
        "تكون لغة إجراءات التحكيم العربية أو الإنجليزية حسب اتفاق الطرفين.",
        "لا يجوز رفع دعاوى جماعية (Class Action) ضد Classify. تُعالج جميع النزاعات على أساس فردي.",
      ],
    },
    {
      id: "dispute-resolution",
      icon: <Scale className="w-5 h-5" />,
      title: "آلية حل النزاعات",
      paragraphs: [
        "نؤمن بأن معظم النزاعات يمكن حلها من خلال التواصل المباشر. إليكم خطوات حل النزاعات:",
      ],
      items: [
        "الخطوة 1 — التواصل المباشر: تواصلوا مع فريق الدعم عبر support@classi-fy.com مع وصف تفصيلي للمشكلة. سنرد خلال 7 أيام عمل.",
        "الخطوة 2 — التصعيد الداخلي: إذا لم يُحل النزاع، يتم تصعيده إلى الإدارة العليا التي ستراجعه خلال 14 يومًا.",
        "الخطوة 3 — الوساطة: إذا استمر الخلاف، يمكن للطرفين الاتفاق على وسيط محايد.",
        "الخطوة 4 — التحكيم الملزم: كملاذ أخير، يُحال النزاع إلى التحكيم وفقًا للبند أعلاه.",
      ],
    },
    {
      id: "severability",
      icon: <FileText className="w-5 h-5" />,
      title: "قابلية الفصل والاتفاقية الكاملة",
      paragraphs: [
        "إذا تم اعتبار أي بند من هذه الشروط غير صالح أو غير قابل للتنفيذ بموجب القانون المعمول به، فإن بقية الشروط تظل سارية وملزمة بالكامل. يُستبدل البند غير الصالح ببند صالح يُحقق الغرض الأصلي بأقرب ما يمكن.",
        "تُشكّل هذه الشروط، مع سياسة الخصوصية والسياسات المرتبطة بها، الاتفاقية الكاملة بينكم وبين Classify فيما يتعلق بموضوعها، وتحل محل جميع الاتفاقيات أو التفاهمات السابقة سواء كانت مكتوبة أو شفوية.",
        "أي تنازل من أي طرف عن حق من حقوقه بموجب هذه الشروط لا يُعد تنازلاً عن أي حق آخر أو عن نفس الحق في المستقبل.",
      ],
    },
    {
      id: "changes",
      icon: <RefreshCw className="w-5 h-5" />,
      title: "التعديلات على الشروط",
      paragraphs: [
        "نحتفظ بالحق في تعديل هذه الشروط والأحكام في أي وقت. عند إجراء تعديلات جوهرية:",
      ],
      items: [
        "سنخطركم عبر البريد الإلكتروني و/أو إشعار بارز على المنصة قبل 30 يومًا من سريان التعديلات.",
        "سنحدّث تاريخ \"آخر تحديث\" في أعلى هذه الصفحة.",
        "قد نطلب منكم مراجعة الشروط الجديدة والموافقة عليها صراحةً.",
        "إذا كنتم لا تتفقون مع التعديلات، يمكنكم إنهاء حسابكم قبل تاريخ سريان التغييرات.",
        "استمراركم في استخدام المنصة بعد سريان التعديلات يُعد قبولاً ضمنيًا بالشروط المحدثة.",
      ],
    },
    {
      id: "contact",
      icon: <Mail className="w-5 h-5" />,
      title: "التواصل معنا",
      paragraphs: [
        "لأي أسئلة أو استفسارات حول هذه الشروط والأحكام:",
      ],
      items: [
        "البريد الإلكتروني: support@classi-fy.com",
        "الشؤون القانونية: legal@classi-fy.com",
        "الموقع الإلكتروني: https://classi-fy.com/contact",
        "يسرّنا مساعدتكم في أي وقت. نسعى للرد على جميع الاستفسارات خلال 7 أيام عمل.",
      ],
    },
  ],
};

const contentEn: Content = {
  title: "Terms of Service",
  subtitle: "Terms and Conditions for Using the Classify Platform",
  lastUpdated: "February 21, 2026",
  version: "Version 3.0",
  intro: "Welcome to Classify. Please read these Terms and Conditions carefully before using our platform. These Terms constitute a legally binding agreement between you and Proomnes (\"the Company\" or \"we\"), the owner and operator of the Classify platform. By using any of our services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use the platform.",
  sections: [
    {
      id: "acceptance", icon: <CheckCircle className="w-5 h-5" />, title: "Acceptance of Terms",
      paragraphs: [
        "By accessing or using the Classify platform in any way — including browsing content, creating an account, registering a child, or using any feature — you acknowledge that you have read, understood, and agree to be bound by these Terms.",
        "If you are using the platform on behalf of an educational institution or legal entity, you represent and warrant that you have the authority to bind that entity to these Terms.",
        "These Terms incorporate by reference: the Privacy Policy, Cookie Policy, Acceptable Use Policy, Refund Policy, Child Safety Policy, and any additional policies we may issue from time to time.",
      ],
    },
    {
      id: "definitions", icon: <BookOpen className="w-5 h-5" />, title: "Definitions",
      paragraphs: ["In these Terms, the following terms shall have the meanings set forth below:"],
      items: [
        "\"Platform\": The classi-fy.com website, mobile applications, and any software, interfaces, or services owned or operated by the Company.",
        "\"Account\": A registered user account that provides access to platform features.",
        "\"Content\": All text, images, videos, games, designs, software, and educational data available through the platform.",
        "\"User\": Any person who accesses or uses the platform, including parents, children, teachers, and institutions.",
        "\"Parent\": Any responsible adult who creates an account and manages their children's accounts on the platform.",
        "\"Child\": Any user under the age of 16 who uses the platform under parental supervision.",
        "\"Subscription\": Any paid plan that provides additional features or advanced content.",
        "\"User-Generated Content\": Any content uploaded or created by users on the platform.",
      ],
    },
    {
      id: "service-description", icon: <Settings className="w-5 h-5" />, title: "Description of Service",
      paragraphs: ["Classify is an educational and entertainment platform specifically designed for children and their families. The platform offers a range of services including:"],
      items: [
        "Interactive educational games designed to develop cognitive, mathematical, and memory skills.",
        "Comprehensive family guidance system that helps parents shape their children's content and activity with confidence.",
        "Detailed educational performance reports tracking children's progress across various cognitive domains.",
        "Points and rewards system that motivates children to learn and continue.",
        "Customizable educational task system configurable by parents.",
        "Digital gifts and rewards system between family members.",
        "Multi-language support (Arabic, English, and Portuguese).",
        "Multi-device compatibility (web, Android, iOS).",
      ],
      subsections: [{
        title: "Nature of Service", paragraphs: [],
        items: [
          "The service is educational and recreational, not a substitute for formal education or specialized educational consultations.",
          "We strive to provide 24/7 availability but do not guarantee uninterrupted service.",
          "We reserve the right to modify, discontinue, or add features without prior notice.",
        ],
      }],
    },
    {
      id: "eligibility", icon: <UserCheck className="w-5 h-5" />, title: "Eligibility and Age Requirements",
      paragraphs: [
        "To use Classify as a parent or adult user, you must be at least 18 years old or the legal age of majority in your country of residence, whichever is higher.",
        "Children under 16 are only permitted to use the platform through an account managed and supervised by their parent. The parent assumes full responsibility for all of their children's activities on the platform.",
      ],
      items: [
        "The parent must be the father, mother, or legal guardian of the registered child.",
        "The parent is responsible for verifying the suitability of content for their child's age and abilities.",
        "For educational institutions, the account must be created by an authorized person from the institution.",
        "We reserve the right to request proof of age or legal status at any time.",
      ],
    },
    {
      id: "account-registration", icon: <Users className="w-5 h-5" />, title: "Account Registration and Security",
      paragraphs: ["To use most platform features, you must create an account and provide accurate, current, and complete information during registration. By creating an account, you:"],
      items: [
        "Warrant that all information provided is accurate and truthful, and that you will update it when changed.",
        "Agree to maintain the confidentiality of your login credentials and not share them with anyone.",
        "Accept full responsibility for all activities conducted through your account.",
        "Agree to notify us immediately of any unauthorized access or security breach to your account.",
        "Agree not to create more than one account for the same person.",
        "Agree not to use misleading names or impersonate another person.",
        "Agree to enable two-factor authentication (2FA) when available to enhance account security.",
      ],
      subsections: [{
        title: "Children's Accounts", paragraphs: [],
        items: [
          "Children's accounts are created exclusively by parents.", "Parents control all child account settings including privacy, access, and content.",
          "Children cannot modify their settings or share data outside the platform.", "Children's accounts are restricted to read-only permissions for safety purposes.",
        ],
      }],
    },
    {
      id: "parental-consent", icon: <Shield className="w-5 h-5" />, title: "Parental Consent for Children's Use",
      paragraphs: ["By registering a child on Classify, the parent:"],
      items: [
        "Confirms they are the parent or legal guardian of the registered child.",
        "Grants Classify permission to collect and use the child's data in accordance with the Privacy Policy.",
        "Assumes full responsibility for reviewing the child's learning activity on the platform.",
        "Acknowledges having read, understood, and agreed to the Privacy Policy and Child Safety Policy.",
        "Retains full right to review, modify, or delete their child's data at any time.",
        "Agrees to receive notifications regarding the child's educational activity and account security.",
        "May withdraw consent at any time by deleting the child's account.",
      ],
    },
    {
      id: "user-responsibilities", icon: <UserCheck className="w-5 h-5" />, title: "User Responsibilities",
      paragraphs: ["As a user of the Classify platform, you agree to:"],
      items: [
        "Use the platform only for legitimate educational and entertainment purposes in accordance with these Terms.",
        "Not use the platform for any illegal or prohibited purposes under these Terms or applicable laws.",
        "Not attempt unauthorized access to any part of the platform, its systems, or servers.",
        "Not send or upload any offensive, harmful, discriminatory, or illegal content.",
        "Not use any bots, crawlers, or automated tools to access the platform.",
        "Not attempt to reverse engineer, decrypt, or disassemble any part of the platform.",
        "Not interfere with platform operation or harm the experience of other users.",
        "Immediately report any offensive content, security vulnerabilities, or misuse you discover.",
        "Respect the intellectual property rights of Classify and other users.",
      ],
    },
    {
      id: "prohibited-conduct", icon: <Ban className="w-5 h-5" />, title: "Prohibited Conduct",
      paragraphs: ["The following actions are strictly prohibited and constitute grounds for immediate account suspension or termination:"],
      items: [
        "Impersonating another person or providing false or misleading registration information.",
        "Using the platform to communicate with children in an inappropriate or suspicious manner.",
        "Uploading or sharing pornographic, violent, or hate-inciting content.",
        "Attempting to hack or disable platform servers or infrastructure.",
        "Data scraping or collecting other users' data without permission.",
        "Selling, transferring, or renting your account or any associated data to any party.",
        "Using the platform for commercial or advertising purposes without our prior written consent.",
        "Circumventing any security measures or restrictions imposed on the platform.",
        "Creating multiple accounts for the same person for manipulation purposes.",
        "Any action that violates applicable local or international laws.",
      ],
    },
    {
      id: "intellectual-property", icon: <Copyright className="w-5 h-5" />, title: "Intellectual Property Rights",
      paragraphs: ["All intellectual property rights in the platform and its contents are owned by or licensed to Proomnes. This includes but is not limited to:"],
      items: [
        "The \"Classify\" trademark, logo, and designs.", "All educational games and their designs, characters, and audio-visual effects.",
        "The platform's source code, APIs, and algorithms.", "User interface and user experience design (UI/UX).",
        "Educational content, text, images, graphics, and icons.", "Databases and their structure and proprietary content.",
      ],
      subsections: [{
        title: "Permitted Use", paragraphs: ["We grant you a limited, non-exclusive, non-transferable, revocable license to use the platform for your personal and educational purposes under these Terms. You may not:"],
        items: ["Copy, modify, distribute, or reproduce any part of the platform.", "Remove or modify any proprietary notices or trademarks.", "Use content for commercial purposes without prior written permission.", "Create derivative works based on platform content."],
      }],
    },
    {
      id: "user-content", icon: <FileText className="w-5 h-5" />, title: "User-Generated Content",
      paragraphs: ["Where features allow users to create or upload content (such as avatars or nicknames):"],
      items: [
        "You retain ownership rights to content you create.",
        "You grant Classify a worldwide, non-exclusive, royalty-free license to use, display, and store this content as necessary to operate the platform.",
        "You warrant that content you provide does not infringe any third-party rights.",
        "We reserve the right to remove any content we deem inappropriate or in violation of our terms without prior notice.",
        "Parents are responsible for reviewing any content their children create on the platform.",
      ],
    },
    {
      id: "payments", icon: <CreditCard className="w-5 h-5" />, title: "Payments and Subscriptions",
      paragraphs: ["We may offer paid services or content on the platform. By making any purchase, you agree to:"],
      items: [
        "All prices are displayed in the specified currency and may or may not include taxes per local laws.",
        "Subscriptions auto-renew unless cancelled before the renewal date.",
        "All payments are securely processed through Stripe; we do not store credit card information.",
        "You are responsible for all charges incurred through your account.",
        "In case of payment failure, access to paid features may be suspended until the amount is settled.",
        "We may change prices with at least 30 days' prior notice.",
        "Our Refund Policy is detailed on our dedicated Refund Policy page.",
      ],
    },
    {
      id: "disclaimers", icon: <AlertTriangle className="w-5 h-5" />, title: "Disclaimers and Warranties",
      paragraphs: ["The platform and its services are provided \"as is\" and \"as available\" without any express or implied warranties of any kind. In particular:"],
      items: [
        "We do not guarantee uninterrupted, error-free, or defect-free availability.", "We do not guarantee the accuracy, completeness, or currency of any educational content.",
        "We do not guarantee the platform will meet all your requirements or expectations.", "We are not responsible for educational or parenting decisions based on platform reports or data.",
        "Educational content is supplementary, not a replacement for formal curricula or specialized consultations.", "We do not guarantee compatibility with all devices, browsers, or operating systems.",
        "We disclaim all implied warranties of merchantability, fitness for a particular purpose, and non-infringement.",
      ],
    },
    {
      id: "liability", icon: <Scale className="w-5 h-5" />, title: "Limitation of Liability",
      paragraphs: ["To the maximum extent permitted by applicable law, Classify, Proomnes, their directors, employees, agents, contractors, and service providers shall not be liable for:"],
      items: [
        "Any direct, indirect, incidental, special, consequential, or punitive damages arising from use of or inability to use the platform.",
        "Any loss of data, profits, reputation, or business opportunities.", "Any damages resulting from unauthorized access to or alteration of your data.",
        "Any damages resulting from content or conduct of any third party on the platform.", "Any service interruptions, delays, or outages.",
      ],
      subsections: [{
        title: "Liability Cap", paragraphs: ["In all cases, Classify's total liability for any claim arising out of or relating to these Terms or use of the platform shall be limited to the lesser of: (a) amounts paid by the user to Classify during the 12 months preceding the claim, or (b) USD $100."],
      }],
    },
    {
      id: "indemnification", icon: <Shield className="w-5 h-5" />, title: "Indemnification",
      paragraphs: ["You agree to indemnify, defend, and hold harmless Classify, Proomnes, and their officers, directors, employees, and agents from any claims, damages, liabilities, losses, or costs (including reasonable attorney's fees) arising from or related to:"],
      items: ["Your use of the platform or any breach of these Terms.", "Content you provide or post on the platform.", "Your violation of any third-party rights.", "Any misuse by you or your registered children.", "Any violation of applicable laws or regulations."],
    },
    {
      id: "termination", icon: <XCircle className="w-5 h-5" />, title: "Termination and Suspension",
      paragraphs: ["Either party may terminate this agreement at any time:"],
      items: [
        "By User: You may delete your account at any time through account settings, the account deletion page, or by contacting support. Deletion will permanently remove all your data and your registered children's data within 30 days.",
        "By Classify: We reserve the right to suspend or terminate your account — immediately and without prior notice — in case of: violation of these Terms, fraudulent use, conduct endangering children or other users, or non-payment.",
        "Termination does not affect any rights or obligations that arose before termination.",
        "The following provisions survive termination: intellectual property rights, limitation of liability, indemnification, governing law.",
      ],
    },
    {
      id: "governing-law", icon: <Gavel className="w-5 h-5" />, title: "Governing Law and Jurisdiction",
      paragraphs: ["These Terms shall be governed by and construed in accordance with the laws of the Arab Republic of Egypt, without regard to conflict of law principles. In the event of any dispute relating to these Terms or use of the platform:"],
      items: [
        "Both parties shall make a good faith attempt to resolve the dispute amicably within 30 days of notification.",
        "If the dispute is not resolved amicably, it shall be referred to binding arbitration.", "The seat of arbitration shall be Cairo, Arab Republic of Egypt.",
        "The language of arbitration proceedings shall be Arabic or English as agreed by the parties.",
        "No class actions may be brought against Classify. All disputes shall be handled on an individual basis.",
      ],
    },
    {
      id: "dispute-resolution", icon: <Scale className="w-5 h-5" />, title: "Dispute Resolution Process",
      paragraphs: ["We believe most disputes can be resolved through direct communication. Here are the dispute resolution steps:"],
      items: [
        "Step 1 — Direct Communication: Contact our support team at support@classi-fy.com with a detailed description. We will respond within 7 business days.",
        "Step 2 — Internal Escalation: If unresolved, the dispute is escalated to senior management for review within 14 days.",
        "Step 3 — Mediation: If the disagreement persists, both parties may agree on a neutral mediator.",
        "Step 4 — Binding Arbitration: As a last resort, the dispute is referred to arbitration per the above clause.",
      ],
    },
    {
      id: "severability", icon: <FileText className="w-5 h-5" />, title: "Severability and Entire Agreement",
      paragraphs: [
        "If any provision of these Terms is found invalid or unenforceable, the remaining provisions remain in full force and effect. The invalid provision shall be replaced with a valid provision that achieves the original purpose as closely as possible.",
        "These Terms, together with the Privacy Policy and related policies, constitute the entire agreement between you and Classify regarding its subject matter, and supersede all prior agreements or understandings, whether written or oral.",
        "Any waiver by either party of any right under these Terms shall not constitute a waiver of any other right or of the same right in the future.",
      ],
    },
    {
      id: "changes", icon: <RefreshCw className="w-5 h-5" />, title: "Changes to These Terms",
      paragraphs: ["We reserve the right to modify these Terms and Conditions at any time. When making material changes:"],
      items: [
        "We will notify you via email and/or a prominent notice on the platform at least 30 days before changes take effect.",
        "We will update the \"Last Updated\" date at the top of this page.", "We may require you to review and expressly agree to the new Terms.",
        "If you disagree with the changes, you may terminate your account before the effective date.",
        "Your continued use of the platform after changes take effect constitutes implicit acceptance of the updated Terms.",
      ],
    },
    {
      id: "contact", icon: <Mail className="w-5 h-5" />, title: "Contact Us",
      paragraphs: ["For any questions or inquiries about these Terms and Conditions:"],
      items: ["Email: support@classi-fy.com", "Legal Affairs: legal@classi-fy.com", "Website: https://classi-fy.com/contact", "We are happy to help at any time. We strive to respond to all inquiries within 7 business days."],
    },
  ],
};

export const Terms = (): JSX.Element => {
  const { i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const lang = i18n.language === "ar" ? "ar" : "en";
  const isRTL = lang === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const c = lang === "ar" ? contentAr : contentEn;
  const [openToc, setOpenToc] = useState(false);

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-purple-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <BackArrow className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              <h1 className="text-xl md:text-2xl font-bold">{c.title}</h1>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className={`px-6 md:px-8 py-5 ${isDark ? "border-b border-gray-700" : "bg-purple-50 border-b border-purple-100"}`}>
            <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Classify — {c.subtitle}</p>
            <div className="flex flex-wrap gap-4 mt-2">
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{lang === "ar" ? "آخر تحديث" : "Last Updated"}: {c.lastUpdated}</p>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{c.version}</p>
            </div>
          </div>
          <div className="px-6 md:px-8 py-6">
            <p className={`leading-relaxed text-base ${isDark ? "text-gray-300" : "text-gray-600"}`}>{c.intro}</p>
          </div>
        </div>

        {/* Table of Contents */}
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <button onClick={() => setOpenToc(!openToc)} className={`w-full px-6 md:px-8 py-4 flex items-center justify-between ${isDark ? "hover:bg-gray-750" : "hover:bg-gray-50"} transition-colors`}>
            <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{lang === "ar" ? "📑 جدول المحتويات" : "📑 Table of Contents"}</h2>
            <ChevronDown className={`w-5 h-5 transition-transform ${openToc ? "rotate-180" : ""} ${isDark ? "text-gray-400" : "text-gray-500"}`} />
          </button>
          {openToc && (
            <div className={`px-6 md:px-8 pb-5 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
              <ol className="pt-3 space-y-1.5">
                {c.sections.map((s, i) => (
                  <li key={s.id}><a href={`#${s.id}`} className={`text-sm hover:underline ${isDark ? "text-purple-400" : "text-purple-600"}`}>{i + 1}. {s.title}</a></li>
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
                  <div className={`p-2 rounded-lg shrink-0 ${isDark ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-600"}`}>{section.icon}</div>
                  <h2 className={`text-lg md:text-xl font-bold pt-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>{idx + 1}. {section.title}</h2>
                </div>
                <div className={`${isRTL ? "pr-12" : "pl-12"}`}>
                  {section.paragraphs.map((p, pi) => (
                    <p key={pi} className={`leading-relaxed mb-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{p}</p>
                  ))}
                  {section.items && (
                    <ul className="space-y-2 mb-4">
                      {section.items.map((item, i) => (
                        <li key={i} className={`flex items-start gap-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          <span className="text-purple-500 mt-1.5 shrink-0">•</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.subsections?.map((sub, si) => (
                    <div key={si} className={`mt-4 p-4 rounded-xl ${isDark ? "bg-gray-750 border border-gray-700" : "bg-gray-50 border border-gray-200"}`}>
                      <h3 className={`font-semibold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>{sub.title}</h3>
                      {sub.paragraphs.map((p, pi) => (<p key={pi} className={`leading-relaxed mb-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{p}</p>))}
                      {sub.items && (<ul className="space-y-1.5">{sub.items.map((item, i) => (<li key={i} className={`flex items-start gap-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}><span className="text-purple-500 mt-1 shrink-0">‣</span><span className="leading-relaxed">{item}</span></li>))}</ul>)}
                    </div>
                  ))}
                </div>
                {idx < c.sections.length - 1 && <div className={`mt-6 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`} />}
              </section>
            ))}
          </div>
        </div>

        {/* Related Legal Pages */}
        <div className={`rounded-2xl shadow-lg overflow-hidden mt-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-5">
            <h3 className={`font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>{lang === "ar" ? "📄 صفحات قانونية ذات صلة" : "📄 Related Legal Pages"}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { href: "/privacy-policy", label: lang === "ar" ? "سياسة الخصوصية" : "Privacy Policy" },
                { href: "/cookie-policy", label: lang === "ar" ? "سياسة ملفات الارتباط" : "Cookie Policy" },
                { href: "/child-safety", label: lang === "ar" ? "سلامة الأطفال" : "Child Safety" },
                { href: "/refund-policy", label: lang === "ar" ? "سياسة الاسترداد" : "Refund Policy" },
                { href: "/acceptable-use", label: lang === "ar" ? "سياسة الاستخدام المقبول" : "Acceptable Use" },
                { href: "/delete-account", label: lang === "ar" ? "حذف الحساب" : "Delete Account" },
              ].map(link => (
                <button key={link.href} onClick={() => navigate(link.href)} className={`text-sm px-3 py-2 rounded-lg text-start transition-colors ${isDark ? "bg-gray-700 hover:bg-gray-600 text-purple-400" : "bg-purple-50 hover:bg-purple-100 text-purple-600"}`}>
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center py-6">
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>© {new Date().getFullYear()} Classify by Proomnes. {lang === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
        </div>
      </main>
    </div>
  );
};
