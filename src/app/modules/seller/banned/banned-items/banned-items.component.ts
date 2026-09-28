import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Subject, debounceTime, takeUntil } from "rxjs";
import { BannedService } from "app/core/banned/banned.service";
import { AmazonService } from "app/core/amazon/amazon.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { FuseUtilsService } from "@fuse/services/utils";
import { Pagination } from "app/core/pagination/pagination.types";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";

@Component({
  standalone: false,
  selector: "app-banned-items",
  templateUrl: "./banned-items.component.html",
  styleUrls: ["./banned-items.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannedItemsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) private _paginator: MatPaginator;
  @ViewChild(MatSort) private _sort: MatSort;

  isLoading: boolean = false;
  bannedItems: any[] = [];
  pagination: Pagination;
  pageLimit: number = Constants.pageLimit;
  tooltip: string = Constants.bannedItemDetails;

  searchInputControl: FormControl = new FormControl("");
  sourceControl: FormControl = new FormControl("all");
  reasonControl: FormControl = new FormControl("all");

  selectedMarketplaceId: string = "";
  sellerMarketplaces: any[] = [];
  marketplaceData: any = null;

  isSuperAdmin: boolean = false;
  permission: any = {};

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _bannedService: BannedService,
    private _amazonService: AmazonService,
    private _navigationService: NavigationService,
    private _confirmationService: FuseConfirmationService,
    private _utilService: FuseUtilsService,
    private _changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this._navigationService.isSuperAdmin;
    this.loadSellerMarketplaces();

    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.permission = this._navigationService.getPermissionByRoute(
          data,
          "/master/amazon/compliance/banned-items",
        );
        if (!this.permission || !Object.keys(this.permission).length) {
          this.permission = this._navigationService.getPermissionByRoute(
            data,
            "/master/amazon/compliance",
          );
        }
      });

    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (!this.permission || !Object.keys(this.permission).length) {
          this.permission = this._navigationService.getPermissionByRoute(
            data,
            "/master/amazon/compliance/banned-items",
          );
        }
      });

    this.searchInputControl.valueChanges
      .pipe(debounceTime(400), takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        if (this._paginator) {
          this._paginator.pageIndex = 0;
        }
        this.fetchBannedItems();
      });

    this.sourceControl.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        if (this._paginator) {
          this._paginator.pageIndex = 0;
        }
        this.fetchBannedItems();
      });

    this.reasonControl.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        if (this._paginator) {
          this._paginator.pageIndex = 0;
        }
        this.fetchBannedItems();
      });
  }

  ngAfterViewInit(): void {
    if (this._sort) {
      this._sort.sortChange
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          if (this._paginator) {
            this._paginator.pageIndex = 0;
          }
          this.fetchBannedItems();
        });
    }

    if (this._paginator) {
      this._paginator.page
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          this.fetchBannedItems();
        });
    }

    this.fetchBannedItems();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  loadSellerMarketplaces(): void {
    this._amazonService
      .getMarketplaceBaseOnSeller()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response: any) => {
          if (response?.status === 200 && response?.data) {
            const ids = new Set<string>();
            response.data.forEach((store: any) => {
              if (store.marketplace_ids) {
                if (Array.isArray(store.marketplace_ids)) {
                  store.marketplace_ids.forEach((id: string) => ids.add(id));
                } else if (typeof store.marketplace_ids === "string") {
                  ids.add(store.marketplace_ids);
                }
              }
            });
            const matched = Constants.amazonMarketplaces.filter((m) =>
              ids.has(m.id),
            );
            this.sellerMarketplaces =
              matched.length > 0 ? matched : [...Constants.amazonMarketplaces];
            if (this.sellerMarketplaces.length > 0) {
              this.selectedMarketplaceId = this.sellerMarketplaces[0].id;
              this.marketplaceData = this.sellerMarketplaces[0];
            }
          } else {
            this.sellerMarketplaces = [...Constants.amazonMarketplaces];
            if (this.sellerMarketplaces.length > 0) {
              this.selectedMarketplaceId = this.sellerMarketplaces[0].id;
              this.marketplaceData = this.sellerMarketplaces[0];
            }
          }
          this._changeDetectorRef.markForCheck();
          this.fetchBannedItems();
        },
        error: () => {
          this.sellerMarketplaces = [...Constants.amazonMarketplaces];
          if (this.sellerMarketplaces.length > 0) {
            this.selectedMarketplaceId = this.sellerMarketplaces[0].id;
            this.marketplaceData = this.sellerMarketplaces[0];
          }
          this._changeDetectorRef.markForCheck();
          this.fetchBannedItems();
        },
      });
  }

  onMarketplaceTabSelect(marketplaceId: string): void {
    this.selectedMarketplaceId = marketplaceId;
    this.marketplaceData = this.sellerMarketplaces.find(
      (m) => m.id === marketplaceId,
    );
    if (this._paginator) {
      this._paginator.pageIndex = 0;
    }
    this.fetchBannedItems();
  }

  fetchBannedItems(): void {
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();

    const filterQuery: any = {};
    if (this.selectedMarketplaceId) {
      filterQuery.marketplaceId = this.selectedMarketplaceId;
    }
    if (this.sourceControl.value && this.sourceControl.value !== "all") {
      filterQuery.source = this.sourceControl.value;
    }
    if (this.reasonControl.value && this.reasonControl.value !== "all") {
      filterQuery.banned_reason = this.reasonControl.value;
    }

    const page = this._paginator ? this._paginator.pageIndex + 1 : 1;
    const size = getPageSize(this._paginator);
    const sortActive = this._sort?.active || "createdAt";
    const sortDirection = this._sort?.direction || "desc";

    this._bannedService
      .bannedItemList(
        page,
        size,
        sortActive,
        sortDirection,
        this.searchInputControl.value || "",
        filterQuery,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.bannedItems = res?.data || [];
          this.pagination = res?.pagination || {
            length: 0,
            size: this.pageLimit,
            page: 0,
            lastPage: 1,
          };
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.bannedItems = [];
          this.pagination = {
            length: 0,
            size: this.pageLimit,
            page: 0,
            lastPage: 1,
          };
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  refreshData(): void {
    if (this._paginator) {
      this._paginator.pageIndex = 0;
    }
    this.fetchBannedItems();
  }

  resetFiltersAndRefresh(): void {
    this.searchInputControl.setValue("", { emitEvent: false });
    this.sourceControl.setValue("all", { emitEvent: false });
    this.reasonControl.setValue("all", { emitEvent: false });
    if (this._paginator) {
      this._paginator.pageIndex = 0;
    }
    this.fetchBannedItems();
  }

  copyToClipboard(text: string, label: string): void {
    if (text) {
      this._utilService.onSuccess(`${label} copied to clipboard!`);
    }
  }

  confirmRelease(item: any): void {
    const dialogRef = this._confirmationService.open({
      title: "Release Banned Item",
      message: `Are you sure you want to release "${item.sku}"? The item will be added to Amazon Inventory.`,
      icon: {
        show: true,
        name: "heroicons_outline:exclamation",
        color: "warning",
      },
      actions: {
        confirm: {
          show: true,
          label: "Release Item",
          color: "primary",
        },
        cancel: {
          show: true,
          label: "Cancel",
        },
      },
      dismissible: true,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this.releaseItem(item._id);
        }
      });
  }

  releaseItem(id: string): void {
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();

    this._bannedService
      .releaseBannedItem(id)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this._utilService.onSuccess(
            res?.message || "Item released to Amazon Inventory successfully!",
          );
          this.fetchBannedItems();
        },
        error: (err: any) => {
          this.isLoading = false;
          this._utilService.onError(
            err?.error?.message || err?.message || "Failed to release item.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  trackByFn(index: number, item: any): any {
    return item._id || index;
  }
}
