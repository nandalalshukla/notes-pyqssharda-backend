export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T | null;
  meta?: PaginationMeta;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  code: string;
  errors?: Record<string, string[]> | string[];
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
