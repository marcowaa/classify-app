import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const paginationSchema = z.object({
  page: z.string().optional().transform((val) => {
    const num = parseInt(val || "1", 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().transform((val) => {
    const num = parseInt(val || "20", 10);
    return isNaN(num) || num < 1 ? 20 : Math.min(num, 100);
  }),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export function getPaginationMeta(
  page: number,
  limit: number,
  total: number
) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
