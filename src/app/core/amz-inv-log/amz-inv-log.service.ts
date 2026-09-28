import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Constants } from "app/shared/constants";
import { environment } from "environments/environment";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { Pagination } from "../pagination/pagination.types";
import { amzInvLogModel } from "./amz-inv-log.model";

@Injectable({
  providedIn: "root",
})
export class AmzInvLogService {
  pageLimit: number = Constants.pageLimit;
  private _amzInvLogs: BehaviorSubject<amzInvLogModel[] | null> =
    new BehaviorSubject(null);
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );

  constructor(private _httpClient: HttpClient) {}

  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  get amzInvLogs$(): Observable<amzInvLogModel[]> {
    return this._amzInvLogs.asObservable();
  }

  getAmzInvSystemLogList(
    page = 0,
    size: number = this.pageLimit,
    sort = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search = "",
    filterQry = {},
  ): Observable<{
    pagination: Pagination;
    data: amzInvLogModel[];
  }> {
    return this._httpClient
      .get<{
        pagination: Pagination;
        data: amzInvLogModel[];
      }>(environment.apiBaseUrl + "/amz-inv-log/get-system-log", {
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
          this._amzInvLogs.next(response.data);
        }),
      );
  }

  getOperationListInAmzInvSystemLog(): any {
    return this._httpClient.get(
      environment.apiBaseUrl + "/amz-inv-log/get-all-operation-list",
    );
  }

  getAmzInvSystemLogById(
    id: string,
    key: string,
    operation: string,
    type: any,
  ): Observable<amzInvLogModel> {
    return this._httpClient.get<amzInvLogModel>(
      environment.apiBaseUrl +
        "/amz-inv-log/get-by-id/" +
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
