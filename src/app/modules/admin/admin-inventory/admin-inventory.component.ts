import { takeUntil } from "rxjs";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import { FormControl, Validators } from "@angular/forms";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Router } from "@angular/router";
import { Inventory } from "app/core/inventory/inventory.model";
import { InventoryService } from "app/core/inventory/inventory.service";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { SessionStorageService } from "app/core/local/session-storage.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { UserService } from "app/core/user/user.service";
import { ClassyService } from "app/layout/layouts/vertical/classy/classy.service";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import {
  BehaviorSubject,
  Observable,
  Subject,
  debounceTime,
  map,
  merge,
  switchMap,
} from "rxjs";

@Component({
  standalone: false,
  selector: "app-admin-inventory",
  templateUrl: "./admin-inventory.component.html",
  styleUrls: ["./admin-inventory.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminInventoryComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild("sellerListTemplate") sellerListTemplate: TemplateRef<any>;
  @ViewChild("bulletPoint") bulletPoint: TemplateRef<any>;
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;
  _matDialogRef: MatDialogRef<any>;

  headers: { key: string; label: string; sortKey?: string }[] = [
    { key: "createdAt", label: "Created dt", sortKey: "createdAt" },
    { key: "main_image_url", label: "Image" },
    { key: "asin", label: "ASIN", sortKey: "asin" },
    { key: "sku", label: "Sku/EAN", sortKey: "sku" },
    { key: "title", label: "Title", sortKey: "title" },
    { key: "stock", label: "Stock", sortKey: "stock" },
    { key: "price", label: "Price", sortKey: "price" },
    // { key: 'model_name', label: 'Model', sortKey: 'model_name' },
    // { key: 'amz_product_type', label: 'Product Type', sortKey: 'amz_product_type' },
    { key: "bullet_points", label: "Bullet Point", sortKey: "bullet_points" },
    { key: "description", label: "Description", sortKey: "description" },
    { key: "updatedAt", label: "Updated dt", sortKey: "updatedAt" },
  ];

  inventoryFormInput: Observable<Inventory[]>;
  pagination: Pagination;
  tooltip = Constants.inventoryDetails;
  searchInputControl: FormControl = new FormControl();
  searchValue: any = "";
  pageLimit: number = Constants.pageLimit;
  tmpQry: object = {};
  isLoading: boolean = false;
  sellerNameList: any;

  selectedFile: File;
  fileNM: string;
  selectedDeleteFile: File;
  deletefileNM: string;
  fileControl = new FormControl("", Validators.required);
  isDisableFlow: boolean = false;
  isDisableDeleteFlow: boolean = false;
  fileTypeControl = new FormControl("retail_amazon_inventory");
  fileFormatControl = new FormControl("csv");
  selectedCategory: string = "retail"; // Default category
  selectedFileType: string = "csv";
  isProductType: any;
  selectedValue: any;
  selectedSeller: any;
  allMarketplaces = Constants.amazonMarketplaces;
  isInventoryLoaading: boolean = false;
  bulletPoints: string[];
  private _idSubject = new BehaviorSubject<string | null>(null);
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _inventoryService: InventoryService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _localService: LocalStorageService,
    private _sessionService: SessionStorageService,
    private _userService: UserService,
    private _matDialog: MatDialog,
    private _router: Router,
    private _classyService: ClassyService,
  ) {}

  ngOnInit(): void {
    this.getSellerNameList();
    this.selectedSeller = this._localService.getItem("sellerId") || "";
    this.tmpQry["seller_id"] = this._localService.getItem("sellerId") || "";
    this._changeDetectorRef.markForCheck();
    this._inventoryService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        // Update the pagination
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
          return this._inventoryService.getAllInventoryForAdmin(
            1,
            (this.pageLimit = this._paginators.first.pageSize),
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

          // Get inventory if sort or page changes
          merge(this._sort.sortChange, this._paginators.first.page)
            .pipe(
              switchMap(() => {
                this.isLoading = true;
                return this._inventoryService.getAllInventoryForAdmin(
                  this._paginators.first.pageIndex + 1,
                  this._paginators.first.pageSize,
                  this._sort.active,
                  this._sort.direction,
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
        }
      });
    if (this.sellerListTemplate && !this.selectedSeller) {
      this.OpenSellerListPopup(this.sellerListTemplate, "superAdmin");
    } else {
      this.fetchInventoryAdmin();
    }
  }

  onChangeSellerReference(seller: any): void {
    if (seller) {
      this.tmpQry["seller_id"] = seller;
      this.selectedSeller = seller;
      this.closeSellerDialog();
    } else {
      delete this.tmpQry["seller_id"];
    }
    this.fetchInventoryAdmin();
  }

  closeSellerDialog(): void {
    if (this._matDialogRef) {
      this._matDialogRef.close();
      // this._router.navigate(['/dashboard']);  // Close the dialog
    }
  }

  fetchInventoryAdmin(): void {
    this._inventoryService
      .getAllInventoryForAdmin(
        1,
        getPageSize(this._paginators?.first),
        "createdAt",
        "desc",
        this.searchValue,
        this.tmpQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        if (data && data.data) {
          this._sessionService.setItem("user", data.data);
          this._classyService.updateObserver();
          setTimeout(() => {
            this._router.navigate([`/${data.data.id}/master/amazon-inventory`]);
          }, 200);
        }
        this.isInventoryLoaading = true;
        this.inventoryFormInput = this._inventoryService.adminInventorySetting$;
        this._changeDetectorRef.markForCheck();
      });
  }

  getSellerNameList(): void {
    this._userService
      .sallerNameList()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any) => {
        if (response.status === 200) {
          this.sellerNameList = response.data;
        }
      });
  }

  // Get the selected seller's name (using their id)
  getSelectedSellerName(selectedSellerId: any): string {
    if (this.sellerNameList) {
      const seller = this.sellerNameList.find((s) => s.id === selectedSellerId);
      return seller
        ? `${seller.first_name} ${seller.last_name}`
        : "No seller selected";
    }
  }

  goBack(): void {
    window.history.back();
  }

  refresh() {
    this.searchInputControl.setValue("");
    this.isProductType = null;
    this.tmpQry["product_type"] = "";
    this.selectedSeller = null;
    this.tmpQry["seller_id"] = "";
    this.OpenSellerListPopup(this.sellerListTemplate, "superAdmin");
  }

  /**
   * Save and close
   */
  saveAndClose(): void {
    this.selectedDeleteFile = null;
    this.deletefileNM = "";
    this.fileNM = "";
    this.selectedFile = null;
    this.fileControl.reset();
    this._matDialogRef.close();
  }

  closeDialog(): void {
    this.fileNM = ""; // Clear the file name
    this.fileTypeControl.reset(); // Reset file type control
    this.fileFormatControl.reset(); // Reset file format control
    this.selectedValue = null; // Clear selected portal
    this._matDialogRef.close();
  }

  OpenSellerListPopup(
    sellerListTemplate: TemplateRef<any>,
    flag: string,
  ): void {
    if (sellerListTemplate) {
      this._matDialogRef = this._matDialog.open(sellerListTemplate, {
        // Configure dialog settings here
      });
    }
  }

  onClickLMFilter(field: string, value: any): void {
    this.tmpQry[field] = value;
    this.fetchInventoryAdmin();
  }

  openBulletPointsPopup(bulletPoints: string[]) {
    this._matDialog.open(this.bulletPoint);
    this.bulletPoints = bulletPoints.flat();
  }
  closePopup() {
    this._matDialog.closeAll();
    this.bulletPoints = [];
  }

  flateAndFetchBulletsPoints = (bulletPoints: string[], index: number) =>
    bulletPoints.flat()[index];

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
