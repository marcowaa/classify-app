import { z } from "zod";
import { AUTH_CONFIG, PAGINATION_CONFIG } from "../../../../shared/constants";

export const emailSchema = z.string().email("البريد الإلكتروني غير صالح");

export const passwordSchema = z
  .string()
  .min(AUTH_CONFIG.passwordMinLength, `كلمة المرور يجب أن تكون ${AUTH_CONFIG.passwordMinLength} أحرف على الأقل`);

export const phoneSchema = z
  .string()
  .regex(/^\d{10,15}$/, "رقم الهاتف غير صالح");

export const otpSchema = z
  .string()
  .length(AUTH_CONFIG.otpLength, `رمز التحقق يجب أن يكون ${AUTH_CONFIG.otpLength} أرقام`);

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(PAGINATION_CONFIG.defaultPage),
  limit: z.coerce.number().min(1).max(PAGINATION_CONFIG.maxLimit).default(PAGINATION_CONFIG.defaultLimit),
});

export const uuidSchema = z.string().uuid("معرف غير صالح");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100),
});

export const phoneLoginSchema = z.object({
  phoneNumber: phoneSchema,
  password: passwordSchema,
});

export const phoneRegisterSchema = z.object({
  phoneNumber: phoneSchema,
  password: passwordSchema,
  name: z.string().min(2).max(100),
});

export const otpVerifySchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  code: otpSchema,
}).refine(data => data.email || data.phone, {
  message: "يجب تقديم البريد الإلكتروني أو رقم الهاتف",
});

export const childLinkSchema = z.object({
  code: z.string().min(4).max(20),
  childName: z.string().min(2).max(100),
  pin: z.string().min(4).max(6).optional(),
});

export const taskCreateSchema = z.object({
  childId: uuidSchema,
  question: z.string().min(5).max(1000),
  answers: z.array(z.object({
    text: z.string().min(1).max(500),
    isCorrect: z.boolean(),
  })).min(2).max(6),
  pointsReward: z.number().min(1).max(1000),
  imageUrl: z.string().url().optional(),
  subjectId: uuidSchema.optional(),
});

export const productSchema = z.object({
  name: z.string().min(2).max(200),
  nameAr: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  descriptionAr: z.string().max(2000).optional(),
  price: z.number().min(0),
  pointsPrice: z.number().min(0).optional(),
  categoryId: uuidSchema.optional(),
  imageUrl: z.string().url().optional(),
  stock: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(e => e.message),
  };
}
