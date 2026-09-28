import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "environments/environment";
import {
  BehaviorSubject,
  Observable,
  catchError,
  map,
  tap,
  throwError,
} from "rxjs";
import { Asin, Keyword, Brand } from "./banned.types";
import { Constants } from "app/shared/constants";
import { Pagination, PaginationData } from "../pagination/pagination.types";
import { MasterService } from "../master.service";
import { LocalStorageService } from "../local/local-storage.service";
import { Router } from "@angular/router";

@Injectable({
  providedIn: "root",
})
export class BannedService {
  pageSize: any = Constants.pageLimit;
  sellerId: any;
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    PaginationData,
  );
  private _key_pagination: BehaviorSubject<Pagination | null> =
    new BehaviorSubject(PaginationData);
  private _brand_pagination: BehaviorSubject<Pagination | null> =
    new BehaviorSubject(PaginationData);
  private _asin: BehaviorSubject<Asin[] | null> = new BehaviorSubject(null);
  private _keyword: BehaviorSubject<Keyword[] | null> = new BehaviorSubject(
    null,
  );
  private _brand: BehaviorSubject<Brand[] | null> = new BehaviorSubject(null);
  constructor(
    private _httpClient: HttpClient,
    private _masterService: MasterService,
    private _localService: LocalStorageService,
    private _router: Router,
  ) {
    const user = this._localService.getItem("user");
    this.sellerId = user?.id || "";
  }

  get activeSellerId(): string {
    const segments = this._router.url.split("/");
    const routeSellerId =
      segments[1] && /^[a-f\d]{24}$/i.test(segments[1]) ? segments[1] : null;
    return routeSellerId || this.sellerId;
  }
  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }
  get key_pagination$(): Observable<Pagination> {
    return this._key_pagination.asObservable();
  }

  get brand_pagination$(): Observable<Pagination> {
    return this._brand_pagination.asObservable();
  }

  get asin$(): Observable<Asin[]> {
    return this._asin.asObservable();
  }

  get keyword$(): Observable<Keyword[]> {
    return this._keyword.asObservable();
  }

  get brand$(): Observable<Brand[]> {
    return this._brand.asObservable();
  }

  createAsin(asin: Asin): Observable<Asin> {
    return this._httpClient.post<Asin>(
      environment.apiBaseUrl + "/banned/add-asin",
      asin,
    );
  }

  bannedAsin(payload: any): Observable<Asin> {
    const sellerId = this.activeSellerId;
    const body = { ...payload, sellerId, seller_id: sellerId };
    return this._masterService.post("/banned/multiple-asin", body);
  }

  importAsin(asin: any): Observable<Asin> {
    const sellerId = this.activeSellerId;
    const url = sellerId
      ? `${environment.apiBaseUrl}/banned/import-asin/${sellerId}`
      : `${environment.apiBaseUrl}/banned/import-asin`;
    return this._httpClient.post<Asin>(url, asin);
  }

  importBrand(brand: any): Observable<Asin> {
    return this._httpClient.post<Asin>(
      environment.apiBaseUrl + "/banned/import-brand",
      brand,
    );
  }

  importKeyword(keyword: any): Observable<Asin> {
    const sellerId = this.activeSellerId;
    const url = sellerId
      ? `${environment.apiBaseUrl}/banned/import-keyword/${sellerId}`
      : `${environment.apiBaseUrl}/banned/import-keyword`;
    return this._httpClient.post<Asin>(url, keyword);
  }

  getAsinById(id: string): Observable<Asin> {
    return this._httpClient.get<Asin>(
      environment.apiBaseUrl + "/banned/get-single-asin/" + id,
    );
  }

  updateAsinById(id: string, data: any): Observable<Asin> {
    return this._masterService.put("/banned/update-asin/" + id, data);
  }

  deleteAsinById(id: string): Observable<Asin | { error: any }> {
    return this._httpClient
      .delete<Asin>(environment.apiBaseUrl + "/banned/delete-asin/" + id)
      .pipe(catchError((err) => throwError(() => err)));
  }

  asinList(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "_id",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: Asin[] }> {
    return this._httpClient
      .get<{ pagination: Pagination; data: Asin[] }>(
        environment.apiBaseUrl + `/banned/get-all-asin/${this.activeSellerId}`,
        {
          params: {
            page: page,
            limit: size,
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...filterQuery,
          },
        },
      )
      .pipe(
        tap((response) => {
          this._pagination.next(response.pagination);
          this._asin.next(response.data);
        }),
        catchError((err) => throwError(() => err)),
      );
  }

  createKeyword(data: any): Observable<Keyword> {
    const sellerId = this.activeSellerId;
    const body = { ...data, sellerId, seller_id: sellerId };
    return this._masterService.post("/banned/add-keyword", body);
  }

  getKeywordById(id: string): Observable<Keyword> {
    return this._httpClient.get<Keyword>(
      environment.apiBaseUrl + "/banned/get-single-keyword/" + id,
    );
  }

  updateKeywordById(id: string, data: any): Observable<Keyword> {
    return this._httpClient.put<Keyword>(
      environment.apiBaseUrl + "/banned/update-keyword/" + id,
      data,
    );
  }

  keywordList(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "_id",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: Keyword[] }> {
    return this._httpClient
      .get<{ pagination: Pagination; data: Keyword[] }>(
        environment.apiBaseUrl +
          `/banned/get-all-keyword/${this.activeSellerId}`,
        {
          params: {
            page: page,
            limit: size,
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...filterQuery,
          },
        },
      )
      .pipe(
        tap((response) => {
          this._key_pagination.next(response.pagination);
          this._keyword.next(response.data);
        }),
        catchError((err) => throwError(() => err)),
      );
  }

  deleteKeywordById(id: string): Observable<Keyword> {
    return this._httpClient
      .delete<Keyword>(environment.apiBaseUrl + "/banned/delete-keyword/" + id)
      .pipe(catchError((err) => throwError(() => err)));
  }

  createBrand(data: any): Observable<Brand> {
    const sellerId = this.activeSellerId;
    const body = { ...data, sellerId, seller_id: sellerId };
    return this._masterService.post("/banned/add-brand", body);
  }

  getBrandById(id: string): Observable<Brand> {
    return this._httpClient.get<Brand>(
      environment.apiBaseUrl + "/banned/get-single-brand/" + id,
    );
  }

  updateBrandById(id: string, data: any): Observable<Brand> {
    return this._httpClient.put<Brand>(
      environment.apiBaseUrl + "/banned/update-brand/" + id,
      data,
    );
  }

  brandList(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "_id",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: Brand[] }> {
    return this._httpClient
      .get<{ pagination: Pagination; data: Brand[] }>(
        environment.apiBaseUrl + `/banned/get-all-brand/${this.activeSellerId}`,
        {
          params: {
            page: page,
            limit: size,
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...filterQuery,
          },
        },
      )
      .pipe(
        tap((response) => {
          this._brand_pagination.next(response.pagination);
          this._brand.next(response.data);
        }),
        catchError((err) => throwError(() => err)),
      );
  }

  deleteBrandById(id: string): Observable<Brand> {
    return this._httpClient
      .delete<Brand>(environment.apiBaseUrl + "/banned/delete-brand/" + id)
      .pipe(catchError((err) => throwError(() => err)));
  }

  bannedItemList(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: any[] }> {
    return this._httpClient
      .get<any>(
        environment.apiBaseUrl +
          `/banned-items/get-all-banned-items/${this.activeSellerId}`,
        {
          params: {
            page: page,
            limit: size,
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...filterQuery,
          },
        },
      )
      .pipe(
        map((response: any) => {
          const pagination: Pagination = {
            length: response?.data?.totalResults || 0,
            size: response?.data?.limit || size,
            page: response?.data?.page ? response.data.page - 1 : 0,
            lastPage: response?.data?.totalPages || 1,
          };
          return {
            pagination,
            data: response?.data?.results || [],
          };
        }),
        catchError((err) => throwError(() => err)),
      );
  }

  releaseBannedItem(id: string): Observable<any> {
    return this._masterService.post(
      `/banned-items/release-banned-item/${id}`,
      {},
    );
  }
}
