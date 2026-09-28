import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { Pagination } from "../pagination/pagination.types";
import { ActiveSellerSection, FeatureItem } from "./feature.types";
import { Constants } from "app/shared/constants";

@Injectable({
  providedIn: "root",
})
export class FeatureService {
  pageSize: number = Constants.pageLimit;

  private _pagination: BehaviorSubject<Pagination | null> =
    new BehaviorSubject<Pagination | null>(null);
  private _features: BehaviorSubject<FeatureItem[] | null> =
    new BehaviorSubject<FeatureItem[] | null>(null);

  constructor(private _httpClient: HttpClient) {}

  get pagination$(): Observable<Pagination | null> {
    return this._pagination.asObservable();
  }

  get features$(): Observable<FeatureItem[] | null> {
    return this._features.asObservable();
  }

  getSellerSections(): Observable<{
    status: number;
    data: ActiveSellerSection[];
    message?: string;
  }> {
    return this._httpClient.get<{
      status: number;
      data: ActiveSellerSection[];
      message?: string;
    }>(environment.apiBaseUrl + "/seller-sections/section-list");
  }

  getFeatures(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    status: string | number = "",
  ): Observable<{
    status: number;
    data: FeatureItem[];
    pagination: Pagination;
    message?: string;
  }> {
    const params: any = {
      page: String(page),
      limit: String(size),
      sortBy: `${sort}:${order || "desc"}`,
    };

    if (search) {
      params.search = search;
    }
    if (status !== null && status !== undefined && status !== "") {
      params.status = String(status);
    }

    return this._httpClient
      .get<{
        status: number;
        data: FeatureItem[];
        pagination: Pagination;
        message?: string;
      }>(environment.apiBaseUrl + "/features", { params })
      .pipe(
        tap((response: any) => {
          if (response?.pagination) {
            this._pagination.next(response.pagination);
          }
          this._features.next(response?.data || []);
        }),
      );
  }

  createFeature(
    userId: string,
    body: { name: string; desc: string; section_id: string; status?: number },
  ): Observable<any> {
    return this._httpClient.post(
      `${environment.apiBaseUrl}/features/create/${userId}`,
      body,
    );
  }

  updateFeature(
    featureId: string,
    userId: string,
    body: {
      name?: string;
      desc?: string;
      section_id?: string;
      status?: number;
    },
  ): Observable<any> {
    return this._httpClient.put(
      `${environment.apiBaseUrl}/features/update/${featureId}/${userId}`,
      body,
    );
  }

  deleteFeature(featureId: string, userId: string): Observable<any> {
    return this._httpClient.delete(
      `${environment.apiBaseUrl}/features/delete/${featureId}/${userId}`,
    );
  }
}
