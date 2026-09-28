import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Constants } from "app/shared/constants";
import { environment } from "environments/environment";
import {
  BehaviorSubject,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from "rxjs";
import { Pagination } from "../pagination/pagination.types";
import {
  DiscoveredRoute,
  RouteAclMapping,
  RouteAclScope,
  RouteAclSection,
} from "./route-acl.types";

@Injectable({
  providedIn: "root",
})
export class RouteAclService {
  pageSize: any = Constants.pageLimit;

  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _mappings: BehaviorSubject<RouteAclMapping[] | null> =
    new BehaviorSubject(null);

  constructor(private _httpClient: HttpClient) {}

  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  get mappings$(): Observable<RouteAclMapping[]> {
    return this._mappings.asObservable();
  }

  getMappings(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: RouteAclMapping[] }> {
    const cleanObject = (obj: any) => {
      const cleanObj: any = {};
      if (obj) {
        Object.keys(obj).forEach((key) => {
          const val = obj[key];
          if (
            val !== undefined &&
            val !== null &&
            val !== "" &&
            !(Array.isArray(val) && val.length === 0)
          ) {
            cleanObj[key] = val;
          }
        });
      }
      return cleanObj;
    };

    const cleanFilters = cleanObject(filterQuery);

    return this._httpClient
      .get<{ pagination: Pagination; data: RouteAclMapping[] }>(
        environment.apiBaseUrl + "/route-acl",
        {
          params: {
            page: String(page),
            limit: String(size),
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...cleanFilters,
          },
        },
      )
      .pipe(
        tap((response: any) => {
          this._pagination.next(response.pagination);
          this._mappings.next(response.data || []);
        }),
      );
  }

  getDiscoveredRoutes(): Observable<{
    status: number;
    data: DiscoveredRoute[];
  }> {
    return this._httpClient.get<{ status: number; data: DiscoveredRoute[] }>(
      environment.apiBaseUrl + "/route-acl/discovered-routes",
    );
  }

  getMappingById(id: string): Observable<{
    status: number;
    data: RouteAclMapping;
  }> {
    return this._httpClient.get<{ status: number; data: RouteAclMapping }>(
      environment.apiBaseUrl + "/route-acl/" + id,
    );
  }

  getSections(scope: RouteAclScope): Observable<{
    status: number;
    data: RouteAclSection[];
  }> {
    return this._httpClient.get<{ status: number; data: RouteAclSection[] }>(
      environment.apiBaseUrl + "/route-acl/sections",
      { params: { scope } },
    );
  }

  createMapping(body: Partial<RouteAclMapping>): Observable<any> {
    return this._httpClient
      .post(environment.apiBaseUrl + "/route-acl", body)
      .pipe(
        switchMap((response: any) =>
          response?.status === 200 ? of(response) : throwError(() => response),
        ),
      );
  }

  updateMapping(id: string, body: Partial<RouteAclMapping>): Observable<any> {
    return this._httpClient
      .patch(environment.apiBaseUrl + "/route-acl/" + id, body)
      .pipe(
        switchMap((response: any) =>
          response?.status === 200 ? of(response) : throwError(() => response),
        ),
      );
  }

  deleteMapping(id: string): Observable<any> {
    return this._httpClient
      .delete(environment.apiBaseUrl + "/route-acl/" + id)
      .pipe(
        switchMap((response: any) =>
          response?.status === 200 ? of(response) : throwError(() => response),
        ),
      );
  }
}
