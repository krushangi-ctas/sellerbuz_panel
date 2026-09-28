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
  FeatureMeterMapping,
  MeterFeature,
  ResourceFieldInfo,
  ResourceModuleInfo,
  UsageWindowSetting,
} from "./feature-meter.types";

@Injectable({
  providedIn: "root",
})
export class FeatureMeterService {
  pageSize: any = Constants.pageLimit;

  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _mappings: BehaviorSubject<FeatureMeterMapping[] | null> =
    new BehaviorSubject(null);

  constructor(private _httpClient: HttpClient) {}

  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  get mappings$(): Observable<FeatureMeterMapping[]> {
    return this._mappings.asObservable();
  }

  getMappings(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: FeatureMeterMapping[] }> {
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
      .get<{ pagination: Pagination; data: FeatureMeterMapping[] }>(
        environment.apiBaseUrl + "/feature-meter",
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
      environment.apiBaseUrl + "/feature-meter/discovered-routes",
    );
  }

  getMappingById(id: string): Observable<{
    status: number;
    data: FeatureMeterMapping;
  }> {
    return this._httpClient.get<{ status: number; data: FeatureMeterMapping }>(
      environment.apiBaseUrl + "/feature-meter/" + id,
    );
  }

  getFeatures(): Observable<{ status: number; data: MeterFeature[] }> {
    return this._httpClient.get<{ status: number; data: MeterFeature[] }>(
      environment.apiBaseUrl + "/feature-meter/features",
    );
  }

  getResourceModules(): Observable<{
    status: number;
    data: ResourceModuleInfo[];
  }> {
    return this._httpClient.get<{
      status: number;
      data: ResourceModuleInfo[];
    }>(environment.apiBaseUrl + "/feature-meter/resource-modules");
  }

  getResourceModuleFields(
    modelName: string,
  ): Observable<{ status: number; data: ResourceFieldInfo[] }> {
    return this._httpClient.get<{
      status: number;
      data: ResourceFieldInfo[];
    }>(
      environment.apiBaseUrl +
        "/feature-meter/resource-modules/" +
        encodeURIComponent(modelName) +
        "/fields",
    );
  }

  getUsageWindowSettings(): Observable<{
    status: number;
    data: UsageWindowSetting | null;
  }> {
    return this._httpClient.get<{
      status: number;
      data: UsageWindowSetting | null;
    }>(environment.apiBaseUrl + "/usage-window-setting");
  }

  updateUsageWindowSettings(
    body: Partial<UsageWindowSetting>,
  ): Observable<any> {
    return this._httpClient
      .patch(environment.apiBaseUrl + "/usage-window-setting", body)
      .pipe(
        switchMap((response: any) =>
          response?.status === 200 ? of(response) : throwError(() => response),
        ),
      );
  }

  createMapping(body: Partial<FeatureMeterMapping>): Observable<any> {
    return this._httpClient
      .post(environment.apiBaseUrl + "/feature-meter", body)
      .pipe(
        switchMap((response: any) =>
          response?.status === 200 ? of(response) : throwError(() => response),
        ),
      );
  }

  updateMapping(
    id: string,
    body: Partial<FeatureMeterMapping>,
  ): Observable<any> {
    return this._httpClient
      .patch(environment.apiBaseUrl + "/feature-meter/" + id, body)
      .pipe(
        switchMap((response: any) =>
          response?.status === 200 ? of(response) : throwError(() => response),
        ),
      );
  }

  deleteMapping(id: string): Observable<any> {
    return this._httpClient
      .delete(environment.apiBaseUrl + "/feature-meter/" + id)
      .pipe(
        switchMap((response: any) =>
          response?.status === 200 ? of(response) : throwError(() => response),
        ),
      );
  }
}
