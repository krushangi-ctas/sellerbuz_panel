import { MatPaginator } from "@angular/material/paginator";
import { Constants } from "./constants";

/** Resolves API page size from mat-paginator, or the app default. */
export function getPageSize(paginator?: MatPaginator | null): number {
  return paginator?.pageSize ?? Constants.pageLimit;
}
