export interface Pagination {
  length: number;
  size: number;
  page: number;
  lastPage: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  totalItems?: number;
}

export const PaginationData: Pagination = {
  length: 0,
  size: 0,
  page: 1,
  lastPage: 1,
};

export { getPageSize } from "app/shared/pagination.util";
