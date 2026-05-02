import type { parents, children, tasks, products, notifications, orders, flashGames } from "./schema";

export type Parent = typeof parents.$inferSelect;
export type ParentInsert = typeof parents.$inferInsert;

export type Child = typeof children.$inferSelect;
export type ChildInsert = typeof children.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;

export type Product = typeof products.$inferSelect;
export type ProductInsert = typeof products.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type OrderInsert = typeof orders.$inferInsert;

export type Game = typeof flashGames.$inferSelect;
export type GameInsert = typeof flashGames.$inferInsert;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type UserRole = "parent" | "child" | "admin" | "library";

export interface JWTPayload {
  userId: string;
  type: UserRole;
  iat?: number;
  exp?: number;
}

export interface OTPRequest {
  destination: string;
  method: "email" | "sms";
  purpose: "login" | "register" | "reset_password";
}

export interface LoginResult {
  token?: string;
  userId?: string;
  requiresOtp?: boolean;
  email?: string;
}
