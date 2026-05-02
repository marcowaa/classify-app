export const APP_CONFIG = {
  name: "Classify",
  version: "1.0.0",
  defaultLanguage: "ar",
  supportedLanguages: ["ar", "en", "pt"] as const,
} as const;

export const AUTH_CONFIG = {
  jwtExpiresIn: "30d",
  otpExpiresMinutes: 5,
  otpLength: 6,
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
  maxTrustedDevices: 5,
  trustedDeviceExpiryDays: 45,
  passwordMinLength: 8,
} as const;

export const PAGINATION_CONFIG = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const POINTS_CONFIG = {
  referralBonus: 100,
  minTaskPoints: 1,
  maxTaskPoints: 1000,
  commissionRate: 0.10,
} as const;

export const GROWTH_TREE_STAGES = [
  { level: 1, name: "seed", nameAr: "بذرة", minPoints: 0 },
  { level: 2, name: "sprout", nameAr: "برعم", minPoints: 50 },
  { level: 3, name: "sapling", nameAr: "شتلة", minPoints: 150 },
  { level: 4, name: "youngPlant", nameAr: "نبتة صغيرة", minPoints: 350 },
  { level: 5, name: "bush", nameAr: "شجيرة", minPoints: 600 },
  { level: 6, name: "smallTree", nameAr: "شجرة صغيرة", minPoints: 1000 },
  { level: 7, name: "growingTree", nameAr: "شجرة نامية", minPoints: 1600 },
  { level: 8, name: "mediumTree", nameAr: "شجرة متوسطة", minPoints: 2500 },
  { level: 9, name: "tallTree", nameAr: "شجرة طويلة", minPoints: 3500 },
  { level: 10, name: "strongTree", nameAr: "شجرة قوية", minPoints: 5000 },
  { level: 11, name: "largeTree", nameAr: "شجرة كبيرة", minPoints: 7000 },
  { level: 12, name: "matureTree", nameAr: "شجرة ناضجة", minPoints: 10000 },
  { level: 13, name: "fruitTree", nameAr: "شجرة مثمرة", minPoints: 14000 },
  { level: 14, name: "grandTree", nameAr: "شجرة عريقة", minPoints: 19000 },
  { level: 15, name: "ancientTree", nameAr: "شجرة عتيقة", minPoints: 25000 },
  { level: 16, name: "goldenTree", nameAr: "شجرة ذهبية", minPoints: 33000 },
  { level: 17, name: "crystalTree", nameAr: "شجرة كريستالية", minPoints: 42000 },
  { level: 18, name: "diamondTree", nameAr: "شجرة ماسية", minPoints: 55000 },
  { level: 19, name: "legendaryTree", nameAr: "شجرة أسطورية", minPoints: 70000 },
  { level: 20, name: "cosmicTree", nameAr: "شجرة كونية", minPoints: 100000 },
] as const;

export const NOTIFICATION_TYPES = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
  task: "task",
  reward: "reward",
  system: "system",
} as const;

export const API_ROUTES = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    verifyOtp: "/api/auth/verify-otp",
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: "/api/auth/reset-password",
  },
  parent: {
    info: "/api/parent/info",
    children: "/api/parent/children",
    tasks: "/api/parent/tasks",
    notifications: "/api/parent/notifications",
  },
  child: {
    info: "/api/child/info",
    tasks: "/api/child/tasks",
    games: "/api/child/games",
    progress: "/api/child/progress",
  },
  admin: {
    login: "/api/admin/login",
    dashboard: "/api/admin/dashboard",
    users: "/api/admin/users",
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

// ===== قائمة المحافظات المصرية =====
export const EGYPT_GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الدقهلية",
  "البحر الأحمر",
  "البحيرة",
  "الفيوم",
  "الغربية",
  "الإسماعيلية",
  "المنوفية",
  "المنيا",
  "القليوبية",
  "الوادي الجديد",
  "السويس",
  "أسوان",
  "أسيوط",
  "بني سويف",
  "بورسعيد",
  "دمياط",
  "الشرقية",
  "جنوب سيناء",
  "كفر الشيخ",
  "مطروح",
  "الأقصر",
  "قنا",
  "شمال سيناء",
  "سوهاج",
] as const;

export type Governorate = (typeof EGYPT_GOVERNORATES)[number];

// ===== السنوات الدراسية =====
export const ACADEMIC_GRADES = [
  { value: "kg1", label: "روضة 1 (KG1)" },
  { value: "kg2", label: "روضة 2 (KG2)" },
  { value: "grade1", label: "الصف الأول الابتدائي" },
  { value: "grade2", label: "الصف الثاني الابتدائي" },
  { value: "grade3", label: "الصف الثالث الابتدائي" },
  { value: "grade4", label: "الصف الرابع الابتدائي" },
  { value: "grade5", label: "الصف الخامس الابتدائي" },
  { value: "grade6", label: "الصف السادس الابتدائي" },
  { value: "grade7", label: "الصف الأول الإعدادي" },
  { value: "grade8", label: "الصف الثاني الإعدادي" },
  { value: "grade9", label: "الصف الثالث الإعدادي" },
  { value: "grade10", label: "الصف الأول الثانوي" },
  { value: "grade11", label: "الصف الثاني الثانوي" },
  { value: "grade12", label: "الصف الثالث الثانوي" },
] as const;

export type AcademicGrade = (typeof ACADEMIC_GRADES)[number]["value"];

// ===== أنواع الكيانات القابلة للمتابعة =====
export const FOLLOWABLE_ENTITY_TYPES = ["school", "teacher", "library"] as const;
export type FollowableEntityType = (typeof FOLLOWABLE_ENTITY_TYPES)[number];

// ===== روابط التواصل الاجتماعي =====
export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}
