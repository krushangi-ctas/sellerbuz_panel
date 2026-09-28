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
  CreateSellerRole,
  ResponseSellerFeatureObject,
  SellerFeature,
  SellerRole,
} from "./seller-role.model";
import { MasterService } from "../master.service";
import { UserSessionsService } from "../session/user-sessions.service";

@Injectable({
  providedIn: "root",
})
export class SellerRoleService {
  pageSize: any = Constants.pageLimit;
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _roles: BehaviorSubject<SellerRole[] | null> = new BehaviorSubject(
    null,
  );
  private _features = new BehaviorSubject<SellerFeature[] | null>(null);

  constructor(
    private _httpClient: HttpClient,
    private _masterService: MasterService,
    private _userSessionService: UserSessionsService,
  ) {}

  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  get roles$(): Observable<SellerRole[]> {
    return this._roles.asObservable();
  }

  get features$(): Observable<SellerFeature[] | null> {
    return this._features.asObservable();
  }

  getSellerRoles(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: SellerRole[] }> {
    const sellerId = this.getSellerId();

    // Helper function to remove empty, null, or undefined keys
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
      .get<{ pagination: Pagination; data: SellerRole[] }>(
        `${environment.apiBaseUrl}/seller-role/${sellerId}`,
        {
          params: {
            page,
            limit: size,
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...cleanFilters, // Safely spreads filtered keys
          },
        },
      )
      .pipe(
        tap((response) => {
          this._pagination.next(response.pagination);
          this._roles.next(response.data);
        }),
      );
  }

  getSellerRoleById(
    roleId: string,
  ): Observable<{ status: number; data: SellerRole; message: string }> {
    const sellerId = this.getSellerId();
    return this._httpClient.get<{
      status: number;
      data: SellerRole;
      message: string;
    }>(`${environment.apiBaseUrl}/seller-role/details/${sellerId}/${roleId}`);
  }

  addSellerRole(
    formData: CreateSellerRole,
  ): Observable<{ status: number; data: CreateSellerRole; message: string }> {
    const sellerId = this.getSellerId();
    const userId = this.getActorId();
    const obj = {
      seller_id: sellerId, // Add seller_id
      role_name: formData.role_name,
      permissions: formData.permissions,
    };

    return this._masterService
      .post(`/seller-role/create-role/${sellerId}`, obj)
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          }
          return throwError(response);
        }),
      );
  }

  updateSellerRole(
    formData: CreateSellerRole,
    roleId: string,
  ): Observable<SellerRole> {
    const sellerId = this.getSellerId();
    const userId = this.getActorId();
    const obj = {
      seller_id: sellerId, // Ensure seller_id is preserved
      role_name: formData.role_name,
      permissions: formData.permissions,
    };

    return this._masterService
      .put(`/seller-role/update-role/${sellerId}/${roleId}`, obj)
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          }
          return throwError(response);
        }),
      );
  }

  deleteSellerRole(roleId: string): Observable<any> {
    const sellerId = this.getSellerId();
    const userId = this.getActorId();
    return this._masterService
      .delete(`/seller-role/delete-role/${sellerId}/${roleId}`)
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          }
          return throwError(response);
        }),
      );
  }

  updateSellerRoleStatus(
    roleId: string,
    data: { status: number },
  ): Observable<SellerRole> {
    const sellerId = this.getSellerId();
    const userId = this.getActorId();
    return this._masterService.put(
      `/seller-role/update-role-status/${sellerId}/${roleId}`,
      data,
    );
  }

  getSections(): Observable<any> {
    const sellerId = this.getSellerId();
    return this._httpClient.get<[]>(
      `${environment.apiBaseUrl}/seller-role/section-list/${sellerId}`,
    );
  }

  getAllRoles(sellerId?: string): Observable<any> {
    const id = sellerId || this.getSellerId();
    return this._httpClient.get<[]>(
      `${environment.apiBaseUrl}/seller-role/role-list/${id}`,
    );
  }

  getActiveFeaturesAndSectionsList(): Observable<ResponseSellerFeatureObject> {
    const sellerId = this.getSellerId();
    return this._httpClient
      .get<ResponseSellerFeatureObject>(
        `${environment.apiBaseUrl}/seller-role/active/features/${sellerId}`,
      )
      .pipe(tap((res) => this._features.next(res.data)));
  }

  private getSellerId(): string {
    return this._userSessionService.getPermissionSellerId();
  }

  private getActorId(): string {
    return this._userSessionService.getLocalUser() || this.getSellerId();
  }
}
