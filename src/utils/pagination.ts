import { query } from 'express-validator';

export type PaginationParams = {
  enabled: boolean;
  page: number;
  limit: number;
  offset: number;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const paginationQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page invalido'),
  query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }).withMessage('limit invalido')
];

export function parsePagination(queryParams: Record<string, unknown>): PaginationParams {
  const enabled = queryParams.page !== undefined || queryParams.limit !== undefined;
  const page = Math.max(Number(queryParams.page || DEFAULT_PAGE), DEFAULT_PAGE);
  const requestedLimit = Number(queryParams.limit || DEFAULT_LIMIT);
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

  return {
    enabled,
    page,
    limit,
    offset: (page - 1) * limit
  };
}

export function buildPaginatedResult<T>(items: T[], total: number, pagination: PaginationParams): PaginatedResult<T> {
  return {
    items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit)
    }
  };
}
