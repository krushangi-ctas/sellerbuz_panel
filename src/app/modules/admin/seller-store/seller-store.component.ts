import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatSort, Sort } from "@angular/material/sort";
import { MatDialog } from "@angular/material/dialog";
import { Subject, debounceTime, takeUntil } from "rxjs";
import { Constants } from "app/shared/constants";
import { SellerStoreService } from "app/core/seller-store/seller-store.service";
import { FuseUtilsService } from "@fuse/services/utils";
import { MarketplaceDialogComponent } from "./dialogs/marketplace-dialog/marketplace-dialog.component";

@Component({
  standalone: false,
  selector: "app-seller-store",
  templateUrl: "./seller-store.component.html",
  styleUrls: ["./seller-store.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerStoreComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  isLoading: boolean = true;
  stores: any[] = [];
  totalCount: number = 0;
  page: number = 1;
  limit: number = 100;
  sortBy: string = "createdAt";
  sortOrder: string = "desc";
  searchInputControl = new FormControl("");
  tooltip: string = Constants.sellerStoreDetails;

  allMarketplaces = Constants.amazonMarketplaces;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _sellerStoreService: SellerStoreService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _utilService: FuseUtilsService,
    private _matDialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.getSellerStores();

    this.searchInputControl.valueChanges
      .pipe(debounceTime(500), takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.page = 1;
        this.getSellerStores();
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  getSellerStores(): void {
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();

    const params: any = {
      page: this.page,
      limit: this.limit,
      search: (this.searchInputControl.value || "").trim(),
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };

    this._sellerStoreService
      .getSellerStoreList(params)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res?.status === 200) {
            this.stores = res.data || [];
            this.totalCount = res.totalCount || 0;
          } else {
            this.stores = [];
            this.totalCount = 0;
          }
          this._changeDetectorRef.markForCheck();
        },
        error: (err: any) => {
          this.isLoading = false;
          this.stores = [];
          this.totalCount = 0;
          this._utilService.onError(
            err?.error?.message || "Failed to load seller stores",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  refresh(): void {
    this.searchInputControl.setValue("", { emitEvent: false });
    this.page = 1;
    this.limit = 100;
    this.sortBy = "createdAt";
    this.sortOrder = "desc";
    this.getSellerStores();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.getSellerStores();
  }

  onSortChange(sort: Sort): void {
    this.sortBy = sort.active || "createdAt";
    this.sortOrder = sort.direction ? sort.direction : "desc";
    this.page = 1;
    this.getSellerStores();
  }

  getMarketplaceBadges(element: any): {
    name: string;
    code: string;
    id: string;
    total: number;
    retail: number;
    whiteLabel: number;
  }[] {
    let ids: string[] = [];
    if (
      Array.isArray(element?.marketplace_ids) &&
      element.marketplace_ids.length > 0
    ) {
      ids = element.marketplace_ids;
    } else if (element?.marketplace_id) {
      ids = [element.marketplace_id];
    } else if (element?.marketplace) {
      ids = [element.marketplace];
    }

    const countsArr: any[] = element?.marketplace_inventory_counts || [];

    if (ids.length === 0 && countsArr.length > 0) {
      ids = countsArr.map((c) => c.marketplace_id).filter(Boolean);
    }

    return ids.map((id) => {
      const match = this.allMarketplaces.find(
        (m) =>
          m.id === id ||
          m.countryCode === id ||
          m.countryName.toLowerCase() === id.toLowerCase(),
      );

      const name = match ? match.countryName : id;
      const code = match ? match.countryCode : id;
      const mId = match ? match.id : id;

      const countObj = countsArr.find((c: any) => {
        const cId = c.marketplace_id || c._id;
        return (
          cId === mId ||
          cId === code ||
          (match && cId === match.id) ||
          (match && cId === match.countryCode) ||
          (cId && String(cId).toLowerCase() === name.toLowerCase())
        );
      });

      return {
        name,
        code,
        id: mId,
        total: countObj?.total || 0,
        retail: countObj?.retail || 0,
        whiteLabel: countObj?.white_label || countObj?.whiteLabel || 0,
      };
    });
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }

  openMarketplacesDialog(store: any): void {
    const marketplaces = this.getMarketplaceBadges(store);
    this._matDialog.open(MarketplaceDialogComponent, {
      width: "600px",
      maxWidth: "95vw",
      maxHeight: "90vh",
      autoFocus: false,
      data: {
        storeName: store?.store_name || "",
        totalInventory: store?.total_inventory || 0,
        totalRetail: store?.total_retail || 0,
        totalWhitelabel: store?.total_whitelabel || 0,
        marketplaces,
      },
    });
  }
}
