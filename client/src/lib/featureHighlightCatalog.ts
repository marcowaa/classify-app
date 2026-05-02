export type FeatureHighlight = {
  id: string;
  emoji: string;
  title: string;
  message: string;
  cta: string;
  route: string;
};

export const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    id: "teacher-marketplace-income",
    emoji: "💼",
    title: "كن معلمًا وابدأ الربح",
    message: "أنشئ مهام تعليمية وابدأ بيعها داخل السوق للآباء الباحثين عن محتوى جاهز.",
    cta: "ابدأ من سوق المهام",
    route: "/task-marketplace",
  },
  {
    id: "wallet-control",
    emoji: "💳",
    title: "تحكم مالي كامل للأسرة",
    message: "تابع الرصيد والإيداعات وادفع بسهولة من مكان واحد دون تعقيد.",
    cta: "افتح المحفظة",
    route: "/wallet",
  },
  {
    id: "task-engine",
    emoji: "📝",
    title: "نظام مهام يحفّز الانضباط",
    message: "حوّل المذاكرة اليومية إلى مهام واضحة مع نقاط ومتابعة دقيقة.",
    cta: "إدارة المهام الآن",
    route: "/parent-tasks",
  },
  {
    id: "child-progress",
    emoji: "📈",
    title: "تقدم الطفل أمامك لحظة بلحظة",
    message: "اعرف إنجازات طفلك ونسبة الالتزام بنظرة واحدة.",
    cta: "شاهد لوحة الأب",
    route: "/parent-dashboard",
  },
  {
    id: "rewards-loop",
    emoji: "🎁",
    title: "كافئ الإنجاز بدل العقاب",
    message: "اربط الإنجاز بمكافآت ذكية ترفع الدافعية بشكل طبيعي.",
    cta: "ادخل متجر ولي الأمر",
    route: "/parent-store",
  },
  {
    id: "notifications-center",
    emoji: "🔔",
    title: "لا تفوّت أي تحديث مهم",
    message: "إشعارات فورية للمهام، الطلبات، وتحديثات الأطفال في الوقت الحقيقي.",
    cta: "فتح الإشعارات",
    route: "/notifications",
  },
  {
    id: "subject-planning",
    emoji: "📚",
    title: "تنظيم المواد بدون فوضى",
    message: "قسّم رحلة الطفل حسب المادة وركّز على نقاط التحسين الحقيقية.",
    cta: "إدارة المواد",
    route: "/subjects",
  },
  {
    id: "child-link-fast",
    emoji: "🔗",
    title: "ربط الطفل في ثواني",
    message: "QR أو كود ربط مباشر لبدء المتابعة فورًا من هاتفك.",
    cta: "ربط طفل جديد",
    route: "/child-link",
  },
  {
    id: "store-orders",
    emoji: "🛍️",
    title: "طلبات ومتجر في نفس النظام",
    message: "تابع الطلبات والمشتريات والمخزون بدون الخروج من التطبيق.",
    cta: "اذهب للمتجر",
    route: "/parent-store",
  },
  {
    id: "profile-presence",
    emoji: "👤",
    title: "ملف ولي الأمر باحتراف",
    message: "عزز حضورك بمعلوماتك وروابطك وإدارة سريعة لحسابك.",
    cta: "فتح الملف الشخصي",
    route: "/parent-profile",
  },
  {
    id: "school-partnership",
    emoji: "🏫",
    title: "تعاون مع المدارس بسهولة",
    message: "اربط بيتك بالمنظومة التعليمية لنتائج أفضل للطفل.",
    cta: "استكشف نظام المدارس",
    route: "/school/login",
  },
  {
    id: "library-partnership",
    emoji: "📚",
    title: "فرص أكبر عبر المكتبات",
    message: "استفد من منتجات ومحتوى المكتبات داخل نفس التجربة.",
    cta: "دخول المكتبات",
    route: "/library/login",
  },
  {
    id: "teacher-network",
    emoji: "🧑‍🏫",
    title: "شبكة معلمين جاهزة",
    message: "تواصل مع معلمين ومهام جاهزة لدعم خطة طفلك التعليمية.",
    cta: "دخول المعلمين",
    route: "/teacher/login",
  },
  {
    id: "family-settings",
    emoji: "⚙️",
    title: "إعدادات مرنة للأسرة",
    message: "تحكم في الخصوصية، الأمان، وتفاصيل الحساب من مكان واحد.",
    cta: "الذهاب للإعدادات",
    route: "/settings",
  },
  {
    id: "growth-gamification",
    emoji: "🌱",
    title: "التعلم باللعب الحقيقي",
    message: "شجرة النمو والمكافآت تجعل الإنجاز عادة يومية ممتعة.",
    cta: "ابدأ تجربة الألعاب",
    route: "/child-games",
  },
];
