import { ChangeDetectorRef, Component, OnInit, OnDestroy } from "@angular/core";
import { FormControl } from "@angular/forms";
import { Sort } from "@angular/material/sort";
import { Subject, takeUntil, debounceTime } from "rxjs";
import { NotificationService } from "app/core/notification/notification.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { Constants } from "app/shared/constants";

@Component({
  standalone: false,
  selector: "app-orders",
  templateUrl: "./orders.component.html",
  styleUrls: ["./orders.component.scss"],
})
export class OrdersComponent implements OnInit, OnDestroy {
  amazonOrders: any[] = [];
  ordersPagination: Pagination | null = null;
  ordersPageIndex: number = 0;
  ordersPageSize: number = 100;
  ordersSortBy: string = "purchaseDate";
  ordersSortOrder: "asc" | "desc" = "desc";
  ordersSearchControl: FormControl = new FormControl("");
  ordersSearchValue: string = "";
  ordersStartDateControl: FormControl = new FormControl("");
  ordersEndDateControl: FormControl = new FormControl("");
  fulfillmentChannelControl: FormControl = new FormControl("");
  marketplaceControl: FormControl = new FormControl("");
  allMarketplaces: any[] = Constants.amazonMarketplaces;
  maxDate = new Date();
  ordersStartDate: string = "";
  ordersEndDate: string = "";
  tooltip = Constants.orderDetails;
  ordersLoading: boolean = false;
  expandedOrderId: string | null = null;

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _notificationService: NotificationService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _userSessionService: UserSessionsService,
  ) {}

  ngOnInit(): void {
    this.fetchAmazonOrders();

    this.ordersSearchControl.valueChanges
      .pipe(takeUntil(this._unsubscribeAll), debounceTime(300))
      .subscribe((query: string) => {
        this.ordersSearchValue = (query || "").trim();
        this.ordersPageIndex = 0;
        this.fetchAmazonOrders();
      });

    this.fulfillmentChannelControl.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.ordersPageIndex = 0;
        this.fetchAmazonOrders();
      });

    this.marketplaceControl.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.ordersPageIndex = 0;
        this.fetchAmazonOrders();
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  getCurrencySign(marketplaceId?: string): string {
    if (!marketplaceId) return "$";
    const found = Constants.amazonMarketplaces.find(
      (m: any) => m.id === marketplaceId,
    );
    return found?.currency || "$";
  }

  getMarketplaceName(marketplaceId?: string): string {
    if (!marketplaceId) return "-";
    const found = Constants.amazonMarketplaces.find(
      (m: any) => m.id === marketplaceId,
    );
    return found
      ? `${found.countryName} (${found.countryCode})`
      : marketplaceId;
  }

  getActiveSellerId(): string {
    const sellerId = this._userSessionService.getCurrentSellerId();
    const currentUser = this._userSessionService.getCurrentUser();
    return (
      sellerId ||
      (currentUser?.id &&
      !currentUser?.isSuperAdmin &&
      !currentUser?.isPremisesUser
        ? currentUser.id
        : "")
    );
  }

  fetchAmazonOrders(
    page: number = this.ordersPageIndex + 1,
    size: number = this.ordersPageSize,
  ): void {
    this.ordersLoading = true;
    const sellerId = this.getActiveSellerId();
    this._notificationService
      .getAmazonOrders(
        sellerId,
        page,
        size,
        this.ordersSortBy,
        this.ordersSortOrder,
        this.ordersSearchValue,
        this.ordersStartDate,
        this.ordersEndDate,
        this.fulfillmentChannelControl.value || "",
        this.marketplaceControl.value || "",
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.amazonOrders = res?.data || [];
          this.ordersPagination = res?.pagination || null;
          this.ordersLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          console.error("Error fetching amazon orders:", err);
          this.amazonOrders = [];
          this.ordersLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  onOrdersPageChange(event: any): void {
    this.ordersPageIndex = event.pageIndex;
    this.ordersPageSize = event.pageSize;
    this.fetchAmazonOrders(this.ordersPageIndex + 1, this.ordersPageSize);
  }

  onOrdersSortChange(sort: Sort): void {
    this.ordersSortBy = sort.active || "purchaseDate";
    this.ordersSortOrder = (sort.direction as "asc" | "desc") || "desc";
    this.ordersPageIndex = 0;
    this.fetchAmazonOrders();
  }

  onOrdersSort(field: string): void {
    if (this.ordersSortBy === field) {
      this.ordersSortOrder = this.ordersSortOrder === "asc" ? "desc" : "asc";
    } else {
      this.ordersSortBy = field;
      this.ordersSortOrder = "desc";
    }
    this.ordersPageIndex = 0;
    this.fetchAmazonOrders();
  }

  toggleOrderExpand(orderId: string): void {
    this.expandedOrderId = this.expandedOrderId === orderId ? null : orderId;
    this._changeDetectorRef.markForCheck();
  }

  onOrderDateClickFilter(): void {
    if (this.ordersStartDateControl.value && this.ordersEndDateControl.value) {
      const start = new Date(this.ordersStartDateControl.value);
      start.setHours(0, 0, 0, 0);
      const end = new Date(this.ordersEndDateControl.value);
      end.setHours(23, 59, 59, 999);

      this.ordersStartDate = start.toISOString();
      this.ordersEndDate = end.toISOString();
      this.ordersPageIndex = 0;
      this.fetchAmazonOrders();
    }
  }

  resetOrderFilters(): void {
    this.ordersSearchControl.setValue("", { emitEvent: false });
    this.ordersSearchValue = "";
    this.ordersStartDateControl.setValue(null, { emitEvent: false });
    this.ordersEndDateControl.setValue(null, { emitEvent: false });
    this.fulfillmentChannelControl.setValue("", { emitEvent: false });
    this.marketplaceControl.setValue("", { emitEvent: false });
    this.ordersStartDate = "";
    this.ordersEndDate = "";
    this.ordersPageIndex = 0;
    this.fetchAmazonOrders();
  }
}
