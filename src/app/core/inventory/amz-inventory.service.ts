import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Constants } from "app/shared/constants";
import { environment } from "environments/environment";
import {
  BehaviorSubject,
  Observable,
  of,
  switchMap,
  tap,
  catchError,
  throwError,
} from "rxjs";
import { Pagination } from "../pagination/pagination.types";
import { Inventory, InventoryDownloadFile } from "./inventory.model";
import { MasterService } from "../master.service";

@Injectable({
  providedIn: "root",
})
export class AmzInventoryService {
  pageSize: any = Constants.pageLimit;
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _amzInventories: BehaviorSubject<Inventory[] | null> =
    new BehaviorSubject(null);

  /**   * Constructor
   */
  constructor(
    private _httpClient: HttpClient,
    private _masterService: MasterService,
  ) {}

  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  get amzInventories$(): Observable<Inventory[]> {
    return this._amzInventories.asObservable();
  }

  getAmazonInventoryByseller(
    seller_id: string,
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: Inventory[] }> {
    return this._httpClient
      .get<{ pagination: Pagination; data: Inventory[] }>(
        `${environment.apiBaseUrl}/inventory/get-amazon-inventory-by-seller/${seller_id}`,
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
          this._amzInventories.next(response.data);
          this._pagination.next(response.pagination);
        }),
        catchError((error) => {
          console.error("Error in getAmazonInventoryByseller API:", error);
          return throwError(() => error);
        }),
      );
  }

  getAmazonInventoryBysellerReport(
    seller_id: string,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{
    data: InventoryDownloadFile;
    message: string;
    status: number;
  }> {
    return this._httpClient
      .get<{ data: InventoryDownloadFile }>(
        `${environment.apiBaseUrl}/inventory/get-amazon-inventory-by-seller-report/${seller_id}`,
        {
          params: {
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...filterQuery,
          },
        },
      )
      .pipe(
        tap((response: any) => {
          // this._amzInventories.next(response.data);
        }),
      );
  }
  /* 23/01 */
  updateProductListing(sellerId: string, fromData: string[]): Observable<any> {
    return this._masterService
      .post(`/inventory/update-amz-inventory-products/${sellerId}`, fromData)
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

  deleteListingFromAmazon(
    data: any,
    sku: string | null = null,
  ): Observable<any> {
    return this._masterService
      .put("/inventory/delete-amazon-listing", { data, sku })
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
}
