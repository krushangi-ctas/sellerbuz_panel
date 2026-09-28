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
import { Inventory } from "./inventory.model";

@Injectable({
  providedIn: "root",
})
export class InventoryService {
  pageSize: any = Constants.pageLimit;
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _inventorySetting: BehaviorSubject<Inventory[] | null> =
    new BehaviorSubject(null);
  private _adminInventorySetting: BehaviorSubject<Inventory[] | null> =
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

  get inventorySetting$(): Observable<Inventory[]> {
    return this._inventorySetting.asObservable();
  }

  get adminInventorySetting$(): Observable<Inventory[]> {
    return this._adminInventorySetting.asObservable();
  }

  getAllInventoryByseller(
    seller_id: string,
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: any[] }> {
    return this._httpClient
      .get<{ pagination: Pagination; data: any[] }>(
        `${environment.apiBaseUrl}/inventory/get-inventory-by-seller/${seller_id}`,
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
          this._inventorySetting.next(response.data);
          this._pagination.next(response.pagination);
        }),
      );
  }

  updateTagsOfAllInventoryProductByseller(
    search: string = "",
    filterQuery: any = {},
    tagId: string = "",
  ): Observable<{ pagination: Pagination; data: Inventory[] }> {
    return this._masterService
      .put("/inventory/add-tag-to-inventory-products", {
        search,
        tagId,
        ...filterQuery,
      })
      .pipe(
        tap((response) => {
          this._inventorySetting.next(response.data);
          this._pagination.next(response.pagination);
        }),
      );
  }

  saveDataWithFile(obj): Observable<any> {
    return this._masterService
      .post("/feed/import-file", obj)
      .pipe(catchError((err) => throwError(err)));
  }

  saveCatalogDataWithFile(obj): Observable<any> {
    return this._masterService
      .post("/feed/import-catalog-file", obj)
      .pipe(catchError((err) => throwError(err)));
  }

  singleProductListWithoutFile(obj1: any) {
    return this._masterService
      .post("/feed/import-single-product", obj1)
      .pipe(catchError((err) => throwError(err)));
  }

  addProductManually(productData: any): Observable<any> {
    return this._masterService
      .post(`/feed/add-product-manually`, productData)
      .pipe(catchError((err) => throwError(err)));
  }

  updateProductManually(id: string, productData: any): Observable<any> {
    return this._masterService
      .put(`/feed/update-product-manually/${id}`, productData)
      .pipe(catchError((err) => throwError(err)));
  }

  //add inventory
  addInventory(marketplaceId: string, formData: any): Observable<Inventory> {
    return this._masterService
      .post(`/inventory/add-inventory/${marketplaceId}`, formData)
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

  getInventoryById(id): Observable<Inventory> {
    return this._httpClient
      .get(environment.apiBaseUrl + "/inventory/get-inventory-by-id/" + id)
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
  getAllInventoryForAdmin(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: Inventory[] }> {
    return this._httpClient
      .get<{ pagination: Pagination; data: Inventory[] }>(
        `${environment.apiBaseUrl}/inventory/get-all-inventory-list-for-admin`,
        {
          params: {
            page: page,
            limit: size,
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...filterQuery,
          },
          headers: {
            premisesUser: this._masterService.usePremisesUserId(),
          },
        },
      )
      .pipe(
        tap((response) => {
          this._adminInventorySetting.next(response.data);
          this._pagination.next(response.pagination);
        }),
      );
  }

  storeNameList(): any {
    return this._httpClient.get(
      environment.apiBaseUrl + "/inventory/get-all-store-list",
    );
  }

  updateMasterInventory(
    productId: string,
    formData: any,
  ): Observable<Inventory> {
    return this._masterService
      .put(`/inventory/update-master-inventory/${productId}`, formData)
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

  updateMasterInventoryData(id: string, formData: any): Observable<Inventory> {
    return this._masterService
      .put(`/inventory/update-master-catalog-inventory/${id}`, formData)
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

  changeProductStopStatus(id: string, obj: any): Observable<any> {
    return this._masterService
      .put("/inventory/update-product-stop-status/status/" + id, obj)
      .pipe(
        tap((res: any) => {
          if (res.status === 200) {
          }
        }),
        catchError((err) =>
          throwError({ message: "Unable to update status!" }),
        ),
      );
  }

  getMasterInventoryById(id): Observable<Inventory> {
    return this._httpClient
      .get(
        environment.apiBaseUrl + "/inventory/get-master-inventory-by-id/" + id,
      )
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

  generateTheContentWithAi(formData: {
    productName: string;
    fields: (string | number)[];
    enums?: { [key: string]: string[] };
    [key: string]: any;
  }): Observable<any> {
    return this._httpClient
      .post(
        environment.apiBaseUrl + "/feed/genrate-product-listing-data",
        formData,
      )
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

  getWhiteLabelByIdForUpdate(
    id: string,
    varient: string = null,
  ): Observable<any> {
    const params: any = {};
    if (varient) {
      params.varient = varient;
    }
    return this._httpClient
      .get(
        environment.apiBaseUrl +
          "/feed/get-existing-product-listing-data/" +
          id,
        {
          params,
        },
      )
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

  getWhiteLabelVersions(
    productId: string,
    sellerId: string,
    kind: "amz_white_label" | "amz_wl_update_attrs" = "amz_white_label",
  ): Observable<any> {
    return this._httpClient
      .get(
        `${environment.apiBaseUrl}/inventory/white-label-versions/${productId}/${sellerId}`,
        { params: { kind } },
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          }
          return throwError(response);
        }),
      );
  }

  getWhiteLabelVersionDiff(
    productId: string,
    sellerId: string,
    versionNo: number,
    kind: "amz_white_label" | "amz_wl_update_attrs" = "amz_white_label",
    against: "head" | "original" | "previous" = "head",
  ): Observable<any> {
    return this._httpClient
      .get(
        `${environment.apiBaseUrl}/inventory/white-label-version-diff/${productId}/${sellerId}`,
        {
          params: { kind, version_no: versionNo, against },
        },
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          }
          return throwError(response);
        }),
      );
  }

  removeTagsFromProduct(id: string): Observable<any> {
    return this._masterService
      .delete("/inventory/remove-product-tag/" + id)
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

  editProductListing(
    sellerId: string,
    id: string,
    fromData: any,
  ): Observable<any> {
    return this._httpClient
      .post(
        environment.apiBaseUrl +
          `/feed/add-edited-product-listing-data/${sellerId}/${id}`,
        fromData,
      )
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

  updateProductListing(sellerId: string, fromData: string[]): Observable<any> {
    return this._masterService
      .post(`/inventory/update-master-inventory-products/${sellerId}`, fromData)
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

  getProdcutTypeBaseONSeller(marketplace_id: string): any {
    return this._masterService.get(
      `/inventory/get-product-type/${marketplace_id}`,
    );
  }

  /* 24.01 */

  generateTemplate(
    id: string,
    productType: string,
    marketplace_id: string,
  ): Observable<any> {
    return this._masterService
      .get(
        `/white-label-product/generate-template-file/${productType}/${id}/${marketplace_id}`,
      )
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

  /* 26.01 */
  uploadFileAndSyncInventory(
    payload:
      | {
          file: File;
          marketplaceId: string;
        }
      | FormData,
  ): Observable<any> {
    return this._masterService
      .post("/inventory/update-amazon-items-by-file", payload)
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
  /* 29.01 */
  getPiceAndStockBySku(id: string, marketplaceId: string): Observable<any> {
    return this._masterService
      .get(`/inventory/get-price-stock-by-sku/${id}/${marketplaceId}`)
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
  getProductDetailsBySku(id: string, marketplaceId: string): Observable<any> {
    return this._masterService
      .get(`/inventory/get-product-details-by-sku/${id}/${marketplaceId}`)
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

  validateCatalogSyncType(
    masterIds: string[],
    amz_product_type?: string,
  ): Observable<any> {
    return this._masterService.post("/inventory/validate-catalog-sync-type", {
      masterIds,
      amz_product_type,
    });
  }

  moveAndSyncInAmazon(
    masterIds: any,
    marketplaceId?: string,
    syncOptions?: {
      amz_product_type?: string;
      wl_product_type?: string;
      amz_margin?: number;
      amz_margin_mode?: string;
      amz_fullfillment_by?: string;
    },
  ): Observable<any> {
    return this._masterService.put("/inventory/move-catalog-in-amazon", {
      masterIds,
      marketplaceId,
      ...(syncOptions || {}),
    });
  }

  UpdateWhiteLableImage(
    formData: FormData,
    id: string = "",
    sku: string = "",
  ): Observable<any> {
    if (sku && formData) {
      formData.append("child_sku", sku);
    }
    return this._masterService
      .post(`/feed/update-white-label-images/${id}`, formData)
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

  deleteWlImage(id: string, index: any): Observable<any> {
    return this._masterService
      .put(`/feed/delete-whitelabel-image/${id}`, { index })
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

  checkCatalogProductInAmazon(productId: string): Observable<any> {
    return this._masterService
      .get(`/inventory/check-catalog-product-in-amazon/${productId}`)
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

  deleteMasterCatalogProduct(productId: string): Observable<any> {
    return this._masterService
      .delete(`/inventory/delete-master-catalog-product/${productId}`)
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
