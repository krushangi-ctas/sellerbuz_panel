import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Constants } from "app/shared/constants";
import { environment } from "environments/environment";
import {
  BehaviorSubject,
  Observable,
  catchError,
  of,
  switchMap,
  tap,
  throwError,
} from "rxjs";
import { Pagination } from "../pagination/pagination.types";
import { MasterService } from "../master.service";
import { Portal } from "./portal.model";

@Injectable({
  providedIn: "root",
})
export class PortalService {
  private setting = {
    element: {
      dynamicDownload: null as HTMLElement,
    },
  };
  pageSize: any = Constants.pageLimit;
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _portal: BehaviorSubject<Portal[] | null> = new BehaviorSubject(null);
  private _portals: BehaviorSubject<Portal | null> = new BehaviorSubject(null);

  /**   * Constructor
   */
  constructor(
    private _httpClient: HttpClient,
    private _masterService: MasterService,
  ) {}

  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  get portal$(): Observable<Portal[]> {
    return this._portal.asObservable();
  }

  getAllPOrtalList(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: Portal[] }> {
    // Create a clean filter object by removing empty/undefined keys
    const cleanFilters: any = {};
    if (filterQuery) {
      Object.keys(filterQuery).forEach((key) => {
        const val = filterQuery[key];
        if (val !== undefined && val !== null && val !== "") {
          cleanFilters[key] = val;
        }
      });
    }

    const sortField = sort && sort !== "undefined" ? sort : "createdAt";
    const sortOrder = order || "desc";

    return this._httpClient
      .get<{ pagination: Pagination; data: Portal[] }>(
        environment.apiBaseUrl + "/portal/get-all-portal-list",
        {
          params: {
            page: page,
            limit: size,
            sortBy: `${sortField}:${sortOrder}`,
            search,
            ...cleanFilters, // Spread the cleaned filter instead
          },
        },
      )
      .pipe(
        tap((response) => {
          this._portal.next(response.data);
          this._pagination.next(response.pagination);
        }),
      );
  }

  //add portal
  addPortal(formData: any): Observable<Portal> {
    return this._masterService.post("/portal/add-portal", formData).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        } else {
          return throwError(response);
        }
      }),
    );
  }

  /**
   * Update portal
   */

  updatePortal(portalId, formData: any): Observable<Portal> {
    return this._masterService
      .put("/portal/update-portal/" + portalId, formData)
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }

  changePortalStatus(id: string, status: any): Observable<any> {
    const isChecked =
      typeof status === "object" && status !== null ? status.checked : status;
    const obj = {
      status: isChecked,
    };
    return this._httpClient
      .put(
        environment.apiBaseUrl + "/portal/update-portal-status/status/" + id,
        obj,
      )
      .pipe(
        catchError((err) =>
          throwError(
            () => new Error(err?.message || "Unable to update status!"),
          ),
        ),
      );
  }

  getPortalById(id): Observable<Portal> {
    return this._httpClient
      .get(environment.apiBaseUrl + "/portal/get-portal-by-id/" + id)
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }

  deletePortal(id: string) {
    return this._masterService.put(`/portal/delete-portal/${id}`, "");
  }

  portalNameList(): any {
    return this._httpClient.get(
      environment.apiBaseUrl + "/portal/get-all-portal-name",
    );
  }
}
