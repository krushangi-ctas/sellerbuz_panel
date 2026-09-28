import { takeUntil } from "rxjs";
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnInit,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import { FormGroup, FormControl } from "@angular/forms";
import { MatDialogRef } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Router } from "@angular/router";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { NotificationService } from "app/core/notification/notification.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { Constants } from "app/shared/constants";
import {
  Observable,
  BehaviorSubject,
  Subject,
  debounceTime,
  switchMap,
  map,
  merge,
} from "rxjs";

@Component({
  standalone: false,
  selector: "app-notify-inventory",
  templateUrl: "./notify-inventory.component.html",
  styleUrls: ["./notify-inventory.component.scss"],
})
export class NotifyInventoryComponent implements OnInit, AfterViewInit {
  @ViewChild("inventoryTemplate") inventoryTemplate: TemplateRef<any>;
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;
  _matDialogRef: MatDialogRef<any>;

  headers: { key: string; label: string; sortKey?: string }[] = [
    { key: "createdAt", label: "Created", sortKey: "createdAt" },
    {
      key: "file_name_original",
      label: "File Name",
      sortKey: "file_name_original",
    },
    { key: "file_mime_type", label: "File Type", sortKey: "file_mime_type" },
    // { key: 'sku', label: 'Sku', sortKey: 'sku' },
    // { key: 'stock', label: 'Stock', sortKey: 'stock' },
    // { key: 'price', label: 'Price', sortKey: 'price' },
    { key: "titleCount", label: "Records", sortKey: "titleCount" },
    { key: "updatedAt", label: "Updated", sortKey: "updatedAt" },
  ];

  amzInventoryFormInput: Observable<any[]>;
  pagination: Pagination;
  tooltip = Constants.inventoryDetails;
  updateStatusConfirm: FormGroup;
  searchInputControl: FormControl = new FormControl();
  searchValue: any = "";
  pageLimit: number = Constants.pageLimit;
  tmpQry: object = {};
  selectedIndex = 0;
  isLoading: boolean = false;
  sellerNameList: any;
  isProductType: any;
  isProductStopped: any;
  allMarketplaces = Constants.amazonMarketplaces;
  storeNameList: any;
  inventoryId: any;
  btnDisable: boolean = false;
  id: any = "";
  isFullfillmentBy: any;
  sellerSetting: any;
  panels: any[] = [];
  type: string = "SUCCESS";
  displayMessage: any;
  private _idSubject = new BehaviorSubject<string | null>(null);
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  amazonOrders: any[] = [];
  ordersPagination: Pagination | null = null;
  ordersPageIndex: number = 0;
  ordersPageSize: number = 10;
  ordersSortBy: string = "purchaseDate";
  ordersSortOrder: "asc" | "desc" = "desc";
  ordersSearchControl: FormControl = new FormControl("");
  ordersSearchValue: string = "";
  ordersStartDateControl: FormControl = new FormControl("");
  ordersEndDateControl: FormControl = new FormControl("");
  maxDate = new Date();
  ordersStartDate: string = "";
  ordersEndDate: string = "";
  ordersLoading: boolean = false;
  expandedOrderId: string | null = null;

  orderHeaders = [
    {
      key: "amazonOrderId",
      label: "Amazon Order ID",
      sortKey: "amazonOrderId",
    },
    { key: "purchaseDate", label: "Purchase Date", sortKey: "purchaseDate" },
    { key: "orderStatus", label: "Status", sortKey: "orderStatus" },
    {
      key: "fulfillmentChannel",
      label: "Fulfillment",
      sortKey: "fulfillmentChannel",
    },
    { key: "orderItemsCount", label: "Items Count" },
    { key: "totalAmount", label: "Total Amount", sortKey: "totalAmount" },
    {
      key: "promotionalTotal",
      label: "Promotional Total",
      sortKey: "promotionalTotal",
    },
    { key: "actions", label: "Actions" },
  ];

  constructor(
    private _notificationService: NotificationService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _localService: LocalStorageService,
    private _userSessionService: UserSessionsService,
    private _router: Router,
  ) {}

  ngOnInit(): void {
    this.panels = [
      {
        id: "SUCCESS",
        icon: "heroicons_outline:cog",
        title: "SUCCESS",
      },
      {
        id: "ACTION_REQUIRED",
        icon: "heroicons_outline:credit-card",
        title: "ACTION REQUIRED",
      },
      {
        id: "ERROR",
        icon: "heroicons_outline:trash",
        title: "WARNING / ERROR",
      },
    ];
    this.displayMsg(this.type);
    this._changeDetectorRef.markForCheck();
    this.fetchAmazonInventoryBySeller();

    this._notificationService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });

    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.isLoading = true;
          this.searchValue = query.trim();
          return this._notificationService.getNotifications(
            this.type,
            1,
            (this.pageLimit = this._paginators?.first?.pageSize || 100),
            "createdAt",
            "desc",
            this.searchValue,
            this.tmpQry,
          );
        }),
        map(() => {
          this.isLoading = false;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    this.fetchNotificationBySeller();
  }

  getCurrencySign(marketplaceId?: string): string {
    if (!marketplaceId) return "$";
    const found = Constants.amazonMarketplaces.find(
      (m: any) => m.id === marketplaceId,
    );
    return found?.currency || "$";
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

  goToPanel(panel: string): void {
    this.type = panel;
    this.displayMsg(this.type);
    this.fetchAmazonInventoryBySeller();
  }

  onTabChange(index: number): void {
    const panel = this.panels[index];
    this.goToPanel(panel.id);
  }

  ngAfterViewInit(): void {
    this._paginators.changes
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        if (this._sort && this._paginators.first) {
          // Mark for check
          this._changeDetectorRef.markForCheck();

          // If the user changes the sort order...
          this._sort.sortChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
              // Reset back to the first page
              this._paginators.first.pageIndex = 0;
            });

          // Get user if sort or page changes
          merge(this._sort.sortChange, this._paginators.first.page)
            .pipe(
              switchMap(() => {
                this.isLoading = true;
                return this._idSubject
                  .asObservable()
                  .pipe(
                    switchMap(() =>
                      this._notificationService.getNotifications(
                        this.type,
                        this._paginators.first.pageIndex + 1,
                        this._paginators.first.pageSize,
                        this._sort.active,
                        this._sort.direction,
                        this.searchValue,
                        this.tmpQry,
                      ),
                    ),
                  );
              }),
              map(() => {
                this.isLoading = false;
              }),
            )
            .pipe(takeUntil(this._unsubscribeAll));
        }
      });
  }

  displayMsg(type: string): void {
    if (type === "ACTION_REQUIRED") {
      this.displayMessage =
        "Action is required. Would you like to move this product to the Retail category? Please confirm.";
    } else if (type === "SUCCESS") {
      this.displayMessage =
        "The product has been successfully listed on Amazon.";
    } else if (type === "ERROR") {
      this.displayMessage =
        "An issue was found while uploading White Label products.";
    } else {
      this.displayMessage = "Unknown status. Please check and try again.";
    }
  }

  fetchAmazonInventoryBySeller(): void {
    this._notificationService
      .getNotifications(
        this.type,
        1,
        (this.pageLimit = this._paginators?.first?.pageSize || 100),
        "createdAt",
        "desc",
        this.searchValue,
        this.tmpQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.amzInventoryFormInput = this._notificationService.notification$;
        this._changeDetectorRef.markForCheck();
      });
  }

  goBack(): void {
    window.history.back();
  }

  onRedirectByClick(masterIds: any): void {
    if (masterIds) {
      this._localService.setItem("masterIds", masterIds);
    }
    const sellerId = this._userSessionService.getCurrentSellerId();
    const currentUser = this._userSessionService.getCurrentUser();
    const activeSellerId =
      sellerId ||
      (currentUser?.id &&
      !currentUser?.isSuperAdmin &&
      !currentUser?.isPremisesUser
        ? currentUser.id
        : null);

    if (activeSellerId) {
      this._router.navigate([`/${activeSellerId}/master/amazon-inventory`]);
    } else {
      this._router.navigate(["/master/amazon-inventory"]);
    }
  }

  refresh(): void {
    this.searchInputControl.setValue("");
    this.isProductType = null;
    this.isProductStopped = null;
    this.isFullfillmentBy = null;
    this.tmpQry = {};
  }

  closeDialog(): void {
    this._matDialogRef?.close();
  }

  onClickFilter(field: string, value: any): void {
    this.tmpQry[field] = value;
    this.fetchAmazonInventoryBySeller();
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  getTabLabel(panel: any): string {
    return panel.title + (panel.dataLength ? ` (${panel.dataLength})` : "(0)");
  }

  fetchNotificationBySeller(): void {
    const pageSize = this._paginators?.first?.pageSize || Constants.pageLimit;

    this.panels.forEach((panel) => {
      this._notificationService
        .getNotifications(
          panel.id,
          1,
          pageSize,
          "createdAt",
          "desc",
          this.searchValue,
          this.tmpQry,
        )
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (response: any) => {
            panel.dataLength =
              response?.pagination?.length ||
              response?.pagination?.totalItems ||
              response?.data?.length ||
              0;

            this._changeDetectorRef.markForCheck();
          },
          error: (err) => {
            console.error(err);
            panel.dataLength = 0;
          },
        });
    });
  }
}
