import { LocalStorageService } from "./../local/local-storage.service";
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Constants } from "app/shared/constants";
import { environment } from "environments/environment";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { Pagination } from "../pagination/pagination.types";
import { Notification } from "./notification.model";

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  pageSize: any = Constants.pageLimit;
  sellerInfo: any;

  // Private
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _notifications: BehaviorSubject<Notification[] | null> =
    new BehaviorSubject(null);
  /**
   * Constructor
   */
  constructor(
    private _httpClient: HttpClient,
    private _localStorageService: LocalStorageService,
  ) {
    this.sellerInfo = this._localStorageService.getItem("user");
  }

  get sellerId(): string {
    const user = this._localStorageService.getItem("user") || this.sellerInfo;
    return user?.id || "";
  }
  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter for pagination
   */
  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  /**
   * Getter for roles
   */
  get notification$(): Observable<Notification[]> {
    return this._notifications.asObservable();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get role
   *
   *
   * @param page
   * @param size
   * @param sort
   * @param order
   * @param search
   */
  getNotifications(
    type: any,
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: Notification[] }> {
    return this._httpClient
      .get<{ pagination: Pagination; data: Notification[] }>(
        environment.apiBaseUrl +
          "/notification/get-list/" +
          this.sellerId +
          "/" +
          type,
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
          this._notifications.next(response.data);
        }),
      );
  }

  /**
   * Get Notification by id
   */
  getNotificationById(id: string): Observable<Notification> {
    return this._httpClient.get<Notification>(
      environment.apiBaseUrl + "/notification/" + id,
    );
  }

  /**
   * Get all Notification for user
   */
  getAllNotification(): Observable<any> {
    return this._httpClient.get<[]>(
      environment.apiBaseUrl +
        "/notification/notification-list" +
        "/" +
        this.sellerId,
    );
  }

  updateNotification(formData: any): any {
    return this._httpClient.put(
      environment.apiBaseUrl +
        "/notification/update-notification/" +
        this.sellerId,
      formData,
    );
  }

  /**
   * Get seller-wise Amazon Orders with search, date filter, sorting, and pagination
   */
  getAmazonOrders(
    sellerId: string,
    page: number = 1,
    size: number = 10,
    sort: string = "purchaseDate",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    startDate: string = "",
    endDate: string = "",
    fulfillmentChannel: string = "",
    marketplaceId: string = "",
  ): Observable<{ pagination: Pagination; data: any[] }> {
    const targetSellerId = sellerId || this.sellerId;
    const params: any = {
      page,
      limit: size,
      sortBy: `${sort}:${order || "desc"}`,
    };

    if (search && search.trim()) {
      params.search = search.trim();
    }
    if (startDate) {
      params.startDate = startDate;
    }
    if (endDate) {
      params.endDate = endDate;
    }
    if (fulfillmentChannel && fulfillmentChannel.trim()) {
      params.fulfillmentChannel = fulfillmentChannel.trim();
    }
    if (marketplaceId && marketplaceId.trim()) {
      params.marketplaceId = marketplaceId.trim();
    }

    return this._httpClient.get<{ pagination: Pagination; data: any[] }>(
      environment.apiBaseUrl + "/notification/amazon-orders/" + targetSellerId,
      { params },
    );
  }
}
