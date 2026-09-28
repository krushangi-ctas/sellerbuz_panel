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
  Coupon,
  CouponFilters,
  CouponResponse,
  CouponsListResponse,
  CouponStatsResponse,
  CreateCoupon,
  UpdateCoupon,
  ValidateCouponRequest,
  RedeemCouponRequest,
  CouponValidationResponse,
  SellersListResponse,
} from "./coupon.model";
import { MasterService } from "../master.service";

@Injectable({
  providedIn: "root",
})
export class CouponService {
  pageSize: any = Constants.pageLimit;
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _coupons: BehaviorSubject<Coupon[] | null> = new BehaviorSubject(
    null,
  );
  private _stats: BehaviorSubject<any | null> = new BehaviorSubject(null);

  constructor(
    private _httpClient: HttpClient,
    private _masterService: MasterService,
  ) {}

  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  get coupons$(): Observable<Coupon[]> {
    return this._coupons.asObservable();
  }

  get stats$(): Observable<any> {
    return this._stats.asObservable();
  }

  /**
   * Get all coupons with filters and pagination
   */
  getCoupons(
    page: number = 1,
    size: number = 100,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filters: CouponFilters = {},
  ): Observable<CouponsListResponse> {
    const params: any = {
      page,
      limit: size,
      sortBy: `${sort}:${order || "desc"}`,
    };

    if (search) {
      params.search = search;
    }

    if (filters.type) {
      params.type = filters.type;
    }

    if (
      filters.status !== undefined &&
      filters.status !== null &&
      filters.status !== ""
    ) {
      params.status = filters.status;
    }

    if (filters.valid_from) {
      params.valid_from = filters.valid_from;
    }

    if (filters.valid_until) {
      params.valid_until = filters.valid_until;
    }

    return this._httpClient
      .get<CouponsListResponse>(`${environment.apiBaseUrl}/coupons/get-all`, {
        params,
      })
      .pipe(
        tap((response: any) => {
          // Handle pagination from response.pagination
          const paginationData =
            response.pagination || response.data?.pagination;
          if (paginationData) {
            this._pagination.next(paginationData);
          }
          // Handle results from response.data
          const results = response.data || [];
          this._coupons.next(results);
        }),
      );
  }

  /**
   * Get coupon by ID
   */
  getCouponById(couponId: string): Observable<CouponResponse> {
    return this._httpClient.get<CouponResponse>(
      `${environment.apiBaseUrl}/coupons/get/${couponId}`,
    );
  }

  /**
   * Create new coupon
   */
  createCoupon(formData: CreateCoupon): Observable<CouponResponse> {
    return this._masterService.post("/coupons/create", formData).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        }
        return throwError(response);
      }),
    );
  }

  /**
   * Update coupon
   */
  updateCoupon(
    couponId: string,
    formData: UpdateCoupon,
  ): Observable<CouponResponse> {
    return this._masterService
      .patch(`/coupons/update/${couponId}`, formData)
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          }
          return throwError(response);
        }),
      );
  }

  /**
   * Delete coupon (soft delete)
   */
  deleteCoupon(couponId: string): Observable<CouponResponse> {
    return this._masterService.delete(`/coupons/delete/${couponId}`).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        }
        return throwError(response);
      }),
    );
  }

  /**
   * Revoke coupon
   */
  revokeCoupon(couponId: string): Observable<CouponResponse> {
    return this._masterService.post(`/coupons/revoke/${couponId}`, {}).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        }
        return throwError(response);
      }),
    );
  }

  /**
   * Activate coupon
   */
  activateCoupon(couponId: string): Observable<CouponResponse> {
    return this._masterService.post(`/coupons/activate/${couponId}`, {}).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        }
        return throwError(response);
      }),
    );
  }

  /**
   * Get all sellers for coupon assignment
   */
  getAllSellersForCoupon(): Observable<SellersListResponse> {
    return this._httpClient.get<SellersListResponse>(
      `${environment.apiBaseUrl}/coupons/all-sellers-list`,
    );
  }

  /**
   * Get active public coupons
   */
  getActivePublicCoupons(): Observable<CouponResponse> {
    return this._httpClient.get<CouponResponse>(
      `${environment.apiBaseUrl}/coupons/public/active`,
    );
  }

  /**
   * Get coupons assigned to a specific seller
   */
  getSellerCoupons(sellerId: string): Observable<CouponResponse> {
    return this._httpClient.get<CouponResponse>(
      `${environment.apiBaseUrl}/coupons/seller/${sellerId}`,
    );
  }

  /**
   * Validate coupon
   */
  validateCoupon(
    data: ValidateCouponRequest,
  ): Observable<CouponValidationResponse> {
    return this._httpClient.post<CouponValidationResponse>(
      `${environment.apiBaseUrl}/coupons/validate`,
      data,
    );
  }

  /**
   * Redeem coupon
   */
  redeemCoupon(data: RedeemCouponRequest): Observable<CouponResponse> {
    return this._httpClient.post<CouponResponse>(
      `${environment.apiBaseUrl}/coupons/redeem`,
      data,
    );
  }

  /**
   * Get coupon statistics
   */
  getCouponStats(): Observable<CouponStatsResponse> {
    return this._httpClient
      .get<CouponStatsResponse>(`${environment.apiBaseUrl}/coupons/stats`)
      .pipe(
        tap((response) => {
          if (response.data) {
            this._stats.next(response.data);
          }
        }),
      );
  }

  /**
   * Update coupon status
   */
  updateCouponStatus(
    couponId: string,
    status: number,
  ): Observable<CouponResponse> {
    if (status === 1) {
      return this.activateCoupon(couponId);
    } else if (status === 3) {
      return this.revokeCoupon(couponId);
    }
    return this.updateCoupon(couponId, { status });
  }
}
