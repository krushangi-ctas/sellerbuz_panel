import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { UserService } from "../user/user.service";
import { LocalStorageService } from "../local/local-storage.service";
import { MasterService } from "../master.service";
import { Router } from "@angular/router";

@Injectable({
  providedIn: "root",
})
export class AmazonService {
  private currentUser;
  private selectedMarketplaceId = new BehaviorSubject<string | null>(
    localStorage.getItem("selectedMarketplaceId"),
  );
  private marketplaceSubject = new BehaviorSubject<any[]>([]); //  Use BehaviorSubject
  public selectedMarketplaceId$ = this.selectedMarketplaceId.asObservable();
  public marketplace$ = this.marketplaceSubject.asObservable();

  constructor(
    private _httpClient: HttpClient,
    private _userService: UserService,
    private _masterService: MasterService,
    private _localService: LocalStorageService,
    private _router: Router,
  ) {
    this._userService.user$.subscribe((r) => {
      this.currentUser = r;
    });
  }

  get currentUserId(): string {
    return (
      this.currentUser?.id ||
      this.currentUser?._id ||
      this._localService.getItem("user")?.id ||
      this._localService.getItem("user")?._id ||
      ""
    );
  }

  get activeSellerId(): string {
    const url = this._router.url || "";
    const path = url.split("?")[0];
    const segments = path.split("/").filter((s) => s.length > 0);
    const routeSellerId = segments.find((s) => /^[a-f\d]{24}$/i.test(s));
    return routeSellerId || this.currentUserId;
  }

  setSelectedMarketplace(id: string | null): any {
    localStorage.setItem("selectedMarketplaceId", id);
    this.selectedMarketplaceId.next(id);
  }

  exchangeLWAAuthorizationCode(
    requestBody: any,
    sellerId?: string,
  ): Observable<any> {
    const targetId = sellerId || this.activeSellerId;
    return this._httpClient.post(
      environment.apiBaseUrl +
        "/amz-auth/exchange-lwa-authorization-code/" +
        targetId +
        "/" +
        this._localService.getItem("marketplace-channel"),
      requestBody,
    );
  }

  storeCustomersSelectedMarketplace(
    requestBody: any,
    sellerId?: string,
  ): Observable<any> {
    const targetId = sellerId || this.activeSellerId;
    return this._httpClient.post(
      environment.apiBaseUrl +
        "/amz-auth/create-marketplace-channel/" +
        targetId,
      requestBody,
    );
  }

  updateSellerCrendetials(
    requestBody: any,
    sellerId?: string,
  ): Observable<any> {
    const targetId = sellerId || this.activeSellerId;
    return this._httpClient
      .post(
        environment.apiBaseUrl + "/amz-auth/update-store-detail/" + targetId,
        requestBody,
      )
      .pipe(
        tap((response) => {
          if (response.status === 200 && response.data?.marketplaces) {
            this.marketplaceSubject.next(response.data.marketplaces);
          }
          return response;
        }),
      );
  }

  getSellerCrendetialsBySellerId(sellerId?: string): any {
    const targetId = sellerId || this.activeSellerId;
    return this._httpClient.get<any>(
      environment.apiBaseUrl + "/amz-auth/get-store-by-id/" + targetId,
    );
  }

  getMarketplaceBaseOnSeller(sellerId?: string): any {
    const targetId = sellerId || this.activeSellerId;
    return this._httpClient
      .get(
        environment.apiBaseUrl +
          "/amz-auth/get-marketplace-base-on-seller/" +
          targetId,
      )
      .pipe(tap((response) => response));
  }

  getAllProductTypeBaseOnMarketplace(marketplaceId: string): Observable<any> {
    return this._httpClient.get(
      environment.apiBaseUrl +
        "/white-label-product/get-amazon-product-type-by-marketplace/" +
        marketplaceId,
    );
  }

  retrieveFileBaseOnProductType(productType: string): Observable<any> {
    return this._httpClient.get(
      environment.apiBaseUrl +
        "/white-label-product/get-file-by-amazon-product-type/" +
        this.currentUserId +
        "/" +
        productType,
    );
  }

  retrieveTemplateFileBaseOnProductType(
    productType: string,
    marketplace_id: string,
  ): Observable<any> {
    return this._httpClient.get(
      environment.apiBaseUrl +
        `/white-label-product/get-template-file-amazon-product-type/${this.currentUserId}/${productType}/${marketplace_id}`,
    );
  }

  retrieveTemplateBaseOnProductType(
    productType: string,
    marketplace_id: string,
  ): Observable<any> {
    return this._httpClient.get(
      environment.apiBaseUrl +
        `/white-label-product/get-amazon-product-type-schema/${this.currentUserId}/${productType}/${marketplace_id}`,
    );
  }
}
