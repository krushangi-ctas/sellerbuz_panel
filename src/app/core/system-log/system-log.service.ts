import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Constants } from "app/shared/constants";
import { environment } from "environments/environment";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { Pagination } from "../pagination/pagination.types";
import { systemLogModel } from "./system-log.model";

@Injectable({
  providedIn: "root",
})
export class SystemLogService {
  pageLimit: number = Constants.pageLimit;
  // Private
  private _systemLogs: BehaviorSubject<systemLogModel[] | null> =
    new BehaviorSubject(null);
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  /**
   * Constructor
   */
  constructor(private _httpClient: HttpClient) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter for pagination
   */
  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  /**
   * Getter for autoComment Records
   */
  get systemLogs$(): Observable<systemLogModel[]> {
    return this._systemLogs.asObservable();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------
  getSystemLogList(
    page = 0,
    size: number = this.pageLimit,
    sort = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search = "",
    filterQry = {},
  ): Observable<{
    pagination: Pagination;
    data: systemLogModel[];
  }> {
    return this._httpClient
      .get<{
        pagination: Pagination;
        data: systemLogModel[];
      }>(environment.apiBaseUrl + "/system-log/get-system-log", {
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
          this._systemLogs.next(response.data);
        }),
      );
  }

  getOperationListInSystemLog(): any {
    return this._httpClient.get(
      environment.apiBaseUrl + "/system-log/get-all-operation-list",
    );
  }

  // getSystemLogById(id: string, key: string, operation: string): Observable<systemLogModel> {
  //   return this._httpClient.get<systemLogModel>(
  //     environment.apiBaseUrl + '/system-log/get-by-id/' + id + '/' + key + '/' + operation,
  //   );
  // }

  getSystemLogById(
    id: string,
    key: string,
    operation: string,
    type: any,
  ): Observable<systemLogModel> {
    return this._httpClient.get<systemLogModel>(
      environment.apiBaseUrl +
        "/system-log/get-by-id/" +
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
