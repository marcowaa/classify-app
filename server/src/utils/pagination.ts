export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  options: PaginationOptions
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / options.limit);
  
  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
      hasNextPage: options.page < totalPages,
      hasPrevPage: options.page > 1,
    },
  };
}

export function parsePaginationFromQuery(query: any): PaginationOptions {
  const page = parseInt(query.page as string) || 1;
  const limit = Math.min(parseInt(query.limit as string) || 20, 100);
  const sortBy = query.sortBy as string;
  const sortOrder = (query.sortOrder as "asc" | "desc") || "desc";

  return {
    page: Math.max(1, page),
    limit: Math.max(1, limit),
    sortBy,
    sortOrder,
  };
}
