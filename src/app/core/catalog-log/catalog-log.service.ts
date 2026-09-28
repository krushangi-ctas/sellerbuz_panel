import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Constants } from "app/shared/constants";
import { environment } from "environments/environment";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { Pagination } from "../pagination/pagination.types";
import { catalogLogModel } from "./catalog-log.model";

@Injectable({
  providedIn: "root",
})
export class CatalogLogService {
  pageLimit: number = Constants.pageLimit;
  private _catalogLogs: BehaviorSubject<catalogLogModel[] | null> =
    new BehaviorSubject(null);
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );

  constructor(private _httpClient: HttpClient) {}

  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  get catalogLogs$(): Observable<catalogLogModel[]> {
    return this._catalogLogs.asObservable();
  }

  getCatalogSystemLogList(
    page = 0,
    size: number = this.pageLimit,
    sort = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search = "",
    filterQry = {},
  ): Observable<{
    pagination: Pagination;
    data: catalogLogModel[];
  }> {
    return this._httpClient
      .get<{
        pagination: Pagination;
        data: catalogLogModel[];
      }>(environment.apiBaseUrl + "/catalog-log/get-system-log", {
        params: {
          page: page,
          limit: size,
          sortBy: `${sort}:${order || "desc"}`,
          search,
          ...filterQry,
        },
      })
      .pipe(
        tap((response: any) => {
          this._pagination.next(response.pagination);
          this._catalogLogs.next(response.data);
        }),
      );
  }

  getOperationListInCatalogSystemLog(): any {
    return this._httpClient.get(
      environment.apiBaseUrl + "/catalog-log/get-all-operation-list",
    );
  }

  getCatalogSystemLogById(
    id: string,
    key: string,
    operation: string,
    type: any,
  ): Observable<catalogLogModel> {
    return this._httpClient.get<catalogLogModel>(
      environment.apiBaseUrl +
        "/catalog-log/get-by-id/" +
        id +
        "/" +
        key +
        "/" +
        operation +
        "/" +
        type,
    );
  }
}
