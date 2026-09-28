import { takeUntil } from "rxjs";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import {
  FormGroup,
  FormControl,
  Validators,
  FormArray,
  AbstractControl,
} from "@angular/forms";
import { MatDialogRef, MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";

import { MatSort } from "@angular/material/sort";
import { Router } from "@angular/router";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { FuseUtilsService } from "@fuse/services/utils";
import { AmazonService } from "app/core/amazon/amazon.service";
import { GeneralSettingService } from "app/core/general-setting/general-setting.service";
import { AmzInventoryService } from "app/core/inventory/amz-inventory.service";
import { Inventory } from "app/core/inventory/inventory.model";
import { InventoryService } from "app/core/inventory/inventory.service";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { NotificationService } from "app/core/notification/notification.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { UserService } from "app/core/user/user.service";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import { environment } from "environments/environment";
import {
  Observable,
  BehaviorSubject,
  Subject,
  debounceTime,
  switchMap,
  map,
  merge,
  tap,
  combineLatest,
} from "rxjs";

import {
  GalleryItem,
  ImageItem,
  ImageSize,
  ThumbnailsPosition,
  VideoItem,
  Gallery,
} from "ng-gallery";
import { Lightbox } from "ng-gallery/lightbox";
import { getFileType, resolveMediaUrl } from "app/shared/common";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { FileProgressService } from "app/core/file-progress/file-progress.service";

@Component({
  standalone: false,
  selector: "app-amazon-inventory",
  templateUrl: "./amazon-inventory.component.html",
  styleUrls: ["./amazon-inventory.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmazonInventoryComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild("inventoryUploadDialog")
  inventoryUploadTemplate: TemplateRef<any>;
  @ViewChild("moveInventoryTemplate") moveInventoryTemplate: TemplateRef<any>;
  @ViewChild("issueTemplate") issueTemplate: TemplateRef<any>;
  @ViewChild("deleteListingTemplate") deleteListingTemplate: TemplateRef<any>;
  @ViewChild("selectFile") selectFile!: ElementRef<HTMLInputElement>;
  @ViewChild("addProductTemplate") addProductTemplate: TemplateRef<any>;
  _matDialogRef: MatDialogRef<any>;
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;
  imgPath = environment.uploadPath;

  /* 28.01 */

  headers: { key: string; label: string; sortKey?: string }[] = [
    { key: "createdAt", label: "Created", sortKey: "createdAt" },
    { key: "main_image_url", label: "Image" },
    { key: "title", label: "Title", sortKey: "title" },
    { key: "asin", label: "ASIN", sortKey: "asin" },
    { key: "sku", label: "Sku/EAN", sortKey: "sku" },
    { key: "margin", label: "Margin(Fix)", sortKey: "margin" },
    { key: "stock", label: "Stock", sortKey: "stock" },
    { key: "price", label: "Price", sortKey: "price" },
    {
      key: "amz_product_type",
      label: "Product Type",
      sortKey: "master_data.amz_product_type",
    },
    {
      key: "amz_fullfillment_by",
      label: "Fullfillment",
      sortKey: "master_data.amz_fullfillment_by",
    },
    {
      key: "description",
      label: "Description",
      sortKey: "master_data.description",
    },
    {
      key: "is_inventory_updated",
      label: "Update",
      sortKey: "is_inventory_updated",
    },
    { key: "is_offer_added", label: "Offer", sortKey: "is_offer_added" },
    {
      key: "is_product_stopped",
      label: "Status",
      sortKey: "is_product_stopped",
    },
    { key: "-", label: "Varient Details", sortKey: "-" },
    { key: "updatedAt", label: "Updated", sortKey: "updatedAt" },
  ];
  asinDropdownOptions: { product_id: string; displayText: string }[] = [];
  isAsinDropdown: boolean = false;
  productTypeList: any;
  updateMoveRetailStatusConfirm: FormGroup;
  amzInventoryFormInput: Observable<Inventory[]>;
  pagination: Pagination;
  tooltip = Constants.inventoryDetails;
  updateStatusConfirm: FormGroup;
  searchInputControl: FormControl = new FormControl();
  startDate: FormControl = new FormControl("");
  endDate: FormControl = new FormControl("");
  maxDate = new Date();
  isResetDate: boolean = false;
  searchValue: any = "";
  pageLimit: number = Constants.pageLimit;
  tmpQry: object = {};
  isLoading: boolean = false;
  sellerNameList: any;
  isProductType: any;
  isProductStopped: any;
  allMarketplaces = Constants.amazonMarketplaces;
  sellerMarketplaces: any[] = [];
  storeDetails: any[] = [];
  storeNameList: any;
  userInfo: any;
  showFilter: boolean = false;
  filterForm: FormGroup;
  inventoryFormGroup: FormGroup;
  inventoryFormGroupWL: FormGroup;
  inventoryId: any;
  btnDisable: boolean = false;
  id: any = "";
  isFullfillmentBy: any;
  items: GalleryItem[] = [];
  sellerSetting: any;
  permission: any = {};
  /* 23-01 */
  selectedItems: Set<string> = new Set<string>();
  selectedFile: any;
  fileNM: any;
  fileFormatControl = new FormControl("csv");
  isDisableFlow: boolean;
  selectedMarketplaceId: string;
  marketplaceData: any;
  /* 28.01 */
  selectedTabIndex: number = 0;
  productTypeControl = new FormControl("");
  fileControl = new FormControl("", Validators.required);
  singleFulfillmentControl = new FormControl("");
  singleProductTypeControl = new FormControl("");
  fulfillmentControl = new FormControl("");
  amzMarginModeControl = new FormControl("FIX");
  amzMarginControl = new FormControl(0);
  isGtinExemptionApproved: boolean = false;
  currentSelectedMarketplaceShippingCharge: number = 0;
  productTypes: any;
  singleProductsVars: {
    selectProductType: any;
    filteredProductTypeList: any;
    productTypes: any;
  } = {
    selectProductType: "",
    filteredProductTypeList: "",
    productTypes: "",
  };
  disableSecondTab = true;
  disableThird = true;
  disableSubmitButton = true;
  AiAttemptsEnable: boolean = false;
  totalTabs: number = 2;
  objectKeys = Object.keys;
  disableDownload: boolean = false;
  selectedCategory: string = "retail"; // Default category
  selectedFileType: string = "csv";
  selectProductType: any;
  selectedDeleteFile: File;
  deletefileNM: string;
  isAsinList: boolean;
  asinList: any;
  /* 29.01 */
  isLoader: boolean = false;
  skuData: { [key: string]: string | number | string[] } = {};
  warningMessage: string;
  /* 30.01 */
  isDisplayNote: boolean;
  selectedUpadteTabIndex: any = 0;
  editProductId: string;
  amzProductType: string;
  masterCatalog = {};
  selectSearchProducType: FormControl<string> = new FormControl<string>("");
  asinListForMoveToRetail: any[];
  selectedImages: { file: File; preview: string }[] = [];
  matDataDialog: { [key: string]: any } = {};
  mainImageFile: File | null = null;
  mainImagePreview: string | null = null;
  mainImageId: string = "";
  event: any;
  /* 17.02 */
  browserNodes: string[] = [];
  selectedAsins: { [key: string]: string } = {};
  isActionCompleted: { [productId: string]: boolean } = {};
  selectedProductId: any;
  missingAttributesSet: Set<string> = new Set<string>(); //for missing attrinbutes
  highlightAttributeKey: string[] = [];
  /* 04.02 */
  isFirstTabDisable = false;
  updateFormProductType: string = "";
  selectedInventoryStatus: number = 0;
  getFileType = getFileType;
  imporsonatePageId: string | null = null;
  routeSellerId: string | null = null;
  /* 25.03 */
  selectedProduct: string;
  private _idSubject = new BehaviorSubject<string | null>(null);
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  constructor(
    private _inventoryService: InventoryService,
    private _amzInventoryService: AmzInventoryService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _localService: LocalStorageService,
    private _amazonService: AmazonService,
    private _userService: UserService,
    private _generalSettingService: GeneralSettingService,
    private _confirmationService: FuseConfirmationService,
    private _matDialog: MatDialog,
    private _utilService: FuseUtilsService,
    private _router: Router,
    public gallery: Gallery,
    public lightbox: Lightbox,
    private _notificationService: NotificationService,
    private _userSessionService: UserSessionsService,
    private _navigationService: NavigationService,
    private _fileProgressService: FileProgressService,
  ) {}
  @HostListener("window:beforeunload", ["$event"])
  unloadHandler(event: Event): any {
    this._localService.removeItem("masterIds");
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
  permissionGuard: any = {};
  isSuperAdmin: boolean = false;

  private extractPermission(data: any): any {
    if (!data) return {};
    if (Array.isArray(data?.permissions)) {
      const found = data.permissions.find(
        (item: any) =>
          item?.section_name?.trim()?.toLowerCase() === "amazon inventory" ||
          item?.section_name?.trim()?.toLowerCase() === "inventory",
      );
      if (found) return found;
    }
    return (
      this._navigationService.getPermissionByRoute(
        data,
        "/master/amazon-inventory",
      ) || {}
    );
  }

  private checkPermission(action: string): boolean {
    if (this.isSuperAdmin) {
      return true;
    }
    const guard =
      this.permissionGuard && Object.keys(this.permissionGuard).length
        ? this.permissionGuard
        : this.permission;
    if (!guard || (typeof guard === "object" && !Object.keys(guard).length)) {
      return true;
    }
    if (guard && action in guard) {
      return Boolean(guard[action]);
    }
    return true;
  }

  get canView(): boolean {
    return this.checkPermission("view");
  }
  get canAdd(): boolean {
    return this.checkPermission("add");
  }
  get canUpdate(): boolean {
    return this.checkPermission("update");
  }
  get canDelete(): boolean {
    return this.checkPermission("delete");
  }
  get canImport(): boolean {
    return this.canAdd && this.canUpdate;
  }

  ngOnInit(): void {
    this.isSuperAdmin = this._navigationService.isSuperAdmin;
    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.permissionGuard = this.extractPermission(data);
        this.permission = this.permissionGuard;
        this._changeDetectorRef.markForCheck();
      });
    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (
          !this.permissionGuard ||
          !Object.keys(this.permissionGuard).length
        ) {
          this.permissionGuard = this.extractPermission(data);
          this.permission = this.permissionGuard;
          this._changeDetectorRef.markForCheck();
        }
      });
    const ids = this._localService.getItem("masterIds");
    if (ids) {
      this.tmpQry["masterIds"] = ids;
    }
    // this._activeRoute.paramMap.pipe(takeUntil(this._unsubscribeAll)).subscribe((params: any): void => {
    //     this.imporsonatePageId = params.get('id') || '';
    // })
    const segments = this._router.url.split("/");
    this.routeSellerId =
      segments[1] && /^[a-f\d]{24}$/i.test(segments[1]) ? segments[1] : null;

    const user = this._userSessionService.getCurrentUser();
    this.userInfo = user || {};
    if (this.routeSellerId) {
      this.userInfo = { ...this.userInfo, id: this.routeSellerId };
    }
    if (!this.userInfo || !this.userInfo.id) return;

    this._changeDetectorRef.markForCheck();
    this._userSessionService.currentSellerId$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.imporsonatePageId = this.routeSellerId || data;
        const currentUser = this._userSessionService.getCurrentUser();
        if (currentUser) {
          // Always prefer the routeSellerId extracted from the URL over the session value
          const effectiveSellerId =
            this.routeSellerId || data || currentUser.id;
          this.userInfo = { ...currentUser, id: effectiveSellerId };
          this._changeDetectorRef.markForCheck();
        }
      });
    this._generalSettingService.getSettingBySellerId(this.userInfo.id);
    this._generalSettingService.sellerSetting$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((setting) => {
        this.sellerSetting = setting;
      });

    if (this.userInfo?.id) {
      this._fileProgressService.connect(this.userInfo.id);
      this._fileProgressService.fileProgress$
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((event) => {
          if (event.type === "completed") {
            const idToFetch = this.routeSellerId || this.userInfo?.id;
            if (idToFetch) {
              this.fetchAmazonInventoryBySeller(idToFetch);
            }
          }
        });
    }
    this.filterForm = new FormGroup({
      status: new FormControl(""),
      wlStatus: new FormControl(""),
      stock: new FormControl(""),
      error: new FormControl(""),
      price_min: new FormControl(""),
      price_max: new FormControl(""),
      stock_min: new FormControl(""),
      stock_max: new FormControl(""),
      amz_fullfillment_by: new FormControl(""),
      product_type: new FormControl(""),
    });
    // this.fomGroupTabOne = this.fbTab1.group({});
    // this.fomGroupTabTwo = this.fbTab2.group({});
    // this.updateFomGroupTabOne = this.updateFbTab1.group({});
    // this.updateFomGroupTabTwo = this.updateFbTab2.group({});
    //

    this.inventoryFormGroup = new FormGroup({
      product_id: new FormControl("", [Validators.required]),
      price: new FormControl(0, [Validators.required, Validators.min(0)]),
      stock: new FormControl(0, [Validators.required, Validators.min(0)]),
    });
    this.inventoryFormGroupWL = new FormGroup({
      product_id: new FormControl("", [
        Validators.required,
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{10}$/),
      ]),
      price: new FormControl(0, [Validators.required, Validators.min(1)]),
      stock: new FormControl(0, [Validators.required, Validators.min(0)]),
      amz_fullfillment_by: new FormControl(
        this.sellerSetting?.amz_fullfillment_by || "",
      ),
      amz_product_type: new FormControl(
        this.sellerSetting?.amz_product_type || "",
      ),
      sku: new FormControl(""),
    });
    this.updateStatusConfirm = this._utilService.confirmMessage(
      "Confirmation",
      "Are you sure you want to enable/disable product?",
      "Yes",
    );
    this.getSettingBySeller();
    this.getSellerMarketplaces();
    this._amazonService.selectedMarketplaceId$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((id) => {
        this.selectedMarketplaceId = id;
        this.tmpQry["marketplaceId"] = this.selectedMarketplaceId || "";
        this.getMarketplaceById(this.selectedMarketplaceId);
        if (this.selectedMarketplaceId) {
          this.fetchAmazonInventoryBySeller(
            this.routeSellerId || this.userInfo.id,
          );
          this.getAllProductTypeList();
        }
      });
    this._changeDetectorRef.markForCheck();

    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.isLoading = true;
          this.searchValue = query.trim();
          return this._amzInventoryService.getAmazonInventoryByseller(
            this.userInfo.id,
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
  }
  setProductId = (id: string) => (this.selectedProduct = id);
  downloadInventory(): void {
    const id = this.userInfo ? this.userInfo.id : null;
    this._amzInventoryService
      .getAmazonInventoryBysellerReport(
        id,
        "createdAt",
        "desc",
        this.searchValue,
        this.tmpQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response) => {
        if (response?.data?.fileName) {
          const downloadUrl = `${environment.uploadPath.replace(/\/$/, "")}/reports/${response.data.fileName}`;
          const anchor = document.createElement("a");
          anchor.href = downloadUrl;
          anchor.download = downloadUrl.split("/").pop() || "report.xlsx";
          anchor.target = "_blank";
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
        } else {
          if (response.status && response.status === 201) {
            this._utilService.onError("No white label product found");
          } else {
            this._utilService.onError(response.message);
          }
          console.error("File name is missing in the API response");
        }
      });
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
        }
      });
    this.onMarketplaceSelect(this.selectedMarketplaceId);
  }

  fetchAmazonInventoryBySeller(id: string): void {
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();
    this._amzInventoryService
      .getAmazonInventoryByseller(
        id,
        1,
        (this.pageLimit = this._paginators?.first?.pageSize),
        "createdAt",
        "desc",
        this.searchValue,
        this.tmpQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (data: any) => {
          this.amzInventoryFormInput =
            this._amzInventoryService.amzInventories$;
          this._amzInventoryService.pagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: Pagination) => {
              // Update the pagination
              this.pagination = pagination;
              this._changeDetectorRef.markForCheck();
            });
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          console.error("Error fetching Amazon inventory by seller:", err);
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
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

  getSettingBySeller(): void {
    this._generalSettingService
      .getSettingBySellerId(this.userInfo.id)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        if (data?.status === 200) {
          if (data?.data?.length > 0) {
            this.sellerSetting = data.data[0];
            this.fulfillmentControl.setValue(
              this.sellerSetting.amz_fullfillment_by,
            );
            this.singleFulfillmentControl.setValue(
              this.sellerSetting.amz_fullfillment_by,
            );
            this.productTypeControl.setValue(
              this.sellerSetting.amz_product_type,
            );
            this.singleProductTypeControl.setValue(
              this.sellerSetting.amz_product_type,
            );
            this.amzMarginControl.setValue(this.sellerSetting.amz_margin);

            this.amzMarginModeControl.setValue(
              this.sellerSetting.amz_margin_mode,
            );

            const currentSelectedMarketplace =
              this.sellerSetting?.marketplaces?.find(
                (marketplace: any) =>
                  marketplace.marketplace_name === this.selectedMarketplaceId,
              );
            if (currentSelectedMarketplace) {
              this.currentSelectedMarketplaceShippingCharge =
                currentSelectedMarketplace.shipping_rate;
            }
          }
        }
      });
  }

  getSellerMarketplaces(): void {
    this._amazonService
      .getMarketplaceBaseOnSeller()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        if (data?.status === 200 && data?.data?.length > 0) {
          this.storeDetails = data.data;
          const marketplaceList: any[] = [];
          const addedIds = new Set<string>();

          data.data.forEach((store: any) => {
            const storeMarketplaces = this.getMarketplaces(
              store.marketplace_ids || [],
            );
            storeMarketplaces.forEach((m: any) => {
              if (!addedIds.has(m.id)) {
                addedIds.add(m.id);
                marketplaceList.push(m);
              }
            });
          });

          this.sellerMarketplaces = marketplaceList;
        } else {
          this.sellerMarketplaces = [];
        }
        if (
          this.sellerMarketplaces.length > 0 &&
          (!this.selectedMarketplaceId ||
            this.sellerMarketplaces.length === 1 ||
            !this.sellerMarketplaces.some(
              (m: any) => m.id === this.selectedMarketplaceId,
            ))
        ) {
          this.onMarketplaceTabSelect(this.sellerMarketplaces[0].id);
        }
        this._changeDetectorRef.markForCheck();
      });
  }

  onMarketplaceTabSelect(marketplaceId: string): void {
    this.selectedMarketplaceId = marketplaceId;
    this._amazonService.setSelectedMarketplace(marketplaceId);
    this._changeDetectorRef.markForCheck();
  }

  shouldDisplayImportButton(): boolean {
    return this.storeNameList?.every(
      (store) =>
        store.is_amazon_authorized === true ||
        store.seller_id === this.userInfo?.id,
    );
  }

  goBack(): void {
    window.history.back();
  }

  refresh(): void {
    this._localService.removeItem("masterIds");
    this.searchInputControl.setValue("");
    this.startDate.setValue("");
    this.endDate.setValue("");
    this.isResetDate = false;
    this.isProductType = null;
    this.isProductStopped = null;
    this.isFullfillmentBy = null;
    this.filterForm.reset();
    this.tmpQry = { marketplaceId: this.selectedMarketplaceId };
    this.fetchAmazonInventoryBySeller(this.userInfo.id);
  }

  clearDate(): void {
    this.startDate.setValue("");
    this.endDate.setValue("");
    delete this.tmpQry["startDate"];
    delete this.tmpQry["endDate"];
    this.isResetDate = false;
    this.fetchAmazonInventoryBySeller(this.userInfo.id);
  }

  onDateClickFilter(): void {
    if (
      this.startDate.value &&
      this.startDate.value !== "" &&
      this.endDate.value &&
      this.endDate.value !== ""
    ) {
      const tmpStart = new Date(this.startDate.value);
      tmpStart.setHours(0, 0, 0, 0);
      const tmpEnd = new Date(this.endDate.value);
      tmpEnd.setHours(23, 59, 59, 999);
      this.tmpQry["startDate"] = new Date(tmpStart);
      this.tmpQry["endDate"] = new Date(tmpEnd);
      this.isResetDate = true;
    }
    this.fetchAmazonInventoryBySeller(this.userInfo.id);
  }

  onClickFilter(field: string, value: any): void {
    if (value === null) {
      value = "";
    }
    this.tmpQry[field] = value;
    this.fetchAmazonInventoryBySeller(this.userInfo.id);
  }
  getMarketplaceById(marketplaceId: string): any {
    this.marketplaceData =
      this.allMarketplaces.find((m) => m.id === marketplaceId) || {};
    return this.marketplaceData;
  }

  getProductTypeName(productType: string): string {
    switch (productType) {
      case "retail":
        return "Retail";
      case "white_label":
        return "WL";
      default:
        return productType || "-"; // Default to the original value or "-" if undefined
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  addUpdateSelectedAmzInventory(_id: any, flag: any, sku: string = null): void {
    if (_id !== "" && _id && sku === null) {
      let amz_stock: any = document.getElementById(`amz_stock_${_id}`);
      amz_stock = amz_stock ? parseFloat(amz_stock.value) : 0;

      let amz_price: any = document.getElementById(`amz_price_${_id}`);
      amz_price = amz_price ? parseFloat(amz_price.value) : 0;

      let amz_margin: any = document.getElementById(`amz_margin_${_id}`);
      amz_margin = amz_margin ? parseFloat(amz_margin.value) : 0;
      // Assuming inventoryId corresponds to productId and userInfo.id to sellerId
      this._inventoryService
        .updateMasterInventory(_id, {
          amz_stock,
          amz_margin,
          amz_price,
          flag,
        })
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(
          (newData: any) => {
            this.btnDisable = false;
            this.isLoading = false;
            this._utilService.onSuccess(
              "Inventory has been updated successfully.",
            );
            this._changeDetectorRef.markForCheck();
            this.fetchAmazonInventoryBySeller(
              this.routeSellerId || this.userInfo.id,
            ); // Refresh inventory
            this.closeUpdateDialog(); // Close the dialog
          },
          ({ error }) => {
            this.btnDisable = false;
            this.isLoading = false;
            this._utilService.onError(error.message);
            this._changeDetectorRef.markForCheck();
          },
        );
    } else if (sku && _id !== "" && _id) {
      let amz_stock: any = document.getElementById(`amz_stock_${_id}_${sku}`);
      amz_stock = amz_stock ? parseFloat(amz_stock.value) : 0;

      let amz_price: any = document.getElementById(`amz_price_${_id}_${sku}`);
      amz_price = amz_price ? parseFloat(amz_price.value) : 0;

      let amz_margin: any = document.getElementById(`amz_margin_${_id}_${sku}`);
      amz_margin = amz_margin ? parseFloat(amz_margin.value) : 0;
      // Assuming inventoryId corresponds to productId and userInfo.id to sellerId
      this._inventoryService
        .updateMasterInventory(_id, {
          amz_stock,
          amz_margin,
          amz_price,
          flag,
          sku,
        })
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(
          (newData: any) => {
            this.btnDisable = false;
            this.isLoading = false;
            this._utilService.onSuccess(
              "Inventory has been updated successfully.",
            );
            this._changeDetectorRef.markForCheck();
            this.fetchAmazonInventoryBySeller(
              this.routeSellerId || this.userInfo.id,
            ); // Refresh inventory
            this.closeUpdateDialog(); // Close the dialog
          },
          ({ error }) => {
            this.btnDisable = false;
            this.isLoading = false;
            this._utilService.onError(error.message);
            this._changeDetectorRef.markForCheck();
          },
        );
    }
  }

  addInventoryDialog(): void {
    this._matDialog.open(this.addProductTemplate);
  }

  getStatus(is_product_stopped: any): boolean {
    if (is_product_stopped) {
      return false;
    } else {
      return true;
    }
  }

  closeUpdateDialog(): void {
    this._matDialog?.closeAll();
    this.inventoryFormGroup?.reset();
    this.inventoryFormGroupWL?.reset();
    this.fileNM = ""; // Clear the file name
    this.fileFormatControl?.reset(); // Reset file format control
    // this.selectedValue = null; // Clear selected portal
    // this.selectedMarketplaceValue = null;
    this._matDialogRef?.close();
    this.selectedFileType = "csv";
    this.disableDownload = false;
    this.selectedCategory = "retail";
    this.fulfillmentControl.setValue(
      this.sellerSetting?.amz_fullfillment_by || "",
    );
    this.singleFulfillmentControl.setValue(
      this.sellerSetting?.amz_fullfillment_by || "",
    );
    this.productTypeControl.setValue(
      this.sellerSetting?.amz_product_type || "",
    );
    this.singleProductTypeControl.setValue(
      this.sellerSetting?.amz_product_type || "",
    );
    this.amzMarginControl.setValue(this.sellerSetting?.amz_margin || 0);
    this.amzMarginModeControl.setValue(
      this.sellerSetting?.amz_margin_mode || "",
    );
    // this.updateFomGroupTabOne.reset();
    // this.updateFomGroupTabTwo.reset();
    this.isDisplayNote = false;
    this.selectedUpadteTabIndex = 0;
    if (this.selectFile) {
      this.selectFile.nativeElement.value = "";
    }
  }

  getVarientTitle(inventory: any, varient: any = null): string {
    return (
      varient?.attributes?.item_name?.[0]?.value ||
      inventory?.white_label_products?.item_name?.[0]?.value ||
      inventory?.title ||
      ""
    );
  }
  getVarientDescription(inventory: any, varient: any = null): string {
    return (
      varient?.attributes?.product_description?.[0]?.value ||
      inventory?.white_label_products?.product_description?.[0]?.value ||
      inventory?.description ||
      ""
    );
  }

  closeMoveRetailDialog(): void {
    this._matDialog?.closeAll();
    this.selectedItems.clear();
    if (
      this.asinListForMoveToRetail &&
      this.asinListForMoveToRetail.length > 0
    ) {
      this.fetchAmazonInventoryBySeller(this.userInfo.id);
    }
    this._changeDetectorRef.detectChanges();
  }

  onStockInput(event: any): void {
    const input = event.target as HTMLInputElement;

    // Remove any non-numeric characters
    let value = input.value.replace(/[^0-9]/g, "");

    // Limit the value to a maximum of 5 characters
    if (value.length > 5) {
      value = value.slice(0, 5);
    }

    // Update the input field with the sanitized value
    input.value = value;

    // Update the form control value
    this.inventoryFormGroup.get("stock")?.setValue(value);
  }

  stopScrollingWheel(e): any {
    return e.target.blur();
  }

  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent): any {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent the default form submission behavior
      // this.addUpdateSelectedInventory();
    }
  }

  productStopInAmz(event, id: string): void {
    const dialogRef = this._confirmationService.open(
      this.updateStatusConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._inventoryService
            .changeProductStopStatus(id, {
              is_product_stopped: event.source.checked ? false : true,
              flag: "amazon",
            })
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this._changeDetectorRef.markForCheck();
                this._utilService.onSuccess(
                  "Product enable/disable successfully!",
                );
                // this.fetchInventoryBySeller(this.userInfo.id);
              },
              (error) => {
                this._utilService.onError(error.message);
                this._changeDetectorRef.markForCheck();
              },
            );
        } else {
          event.source.checked = !event.source.checked;
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  /* 23-01 checkbox part*/
  onCheckboxChange(event: any, id: string): void {
    if (event.checked) {
      this.selectedItems.add(id); // Add item to the selection set
    } else {
      this.selectedItems.delete(id); // Remove item from the selection set
    }
  }
  isAllSelected = this._amzInventoryService.amzInventories$.pipe(
    map(
      (inventories) =>
        inventories?.length > 0 &&
        this.selectedItems.size === inventories.length,
    ),
  );

  // Toggle Select All
  toggleSelectAll(event: any): void {
    this._amzInventoryService.amzInventories$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((inventories) => {
        if (event.checked) {
          // Select only items that are not banned
          this.selectedItems = new Set(
            inventories
              .filter((item) => !item.is_banned)
              .map((item) => item._id),
          );
        } else {
          this.selectedItems.clear(); // Deselect all
        }
      });
  }

  OpenMoveConfirmationPopup(): void {
    combineLatest([this.amzInventoryFormInput])
      .pipe(
        map(([inventoryList]) =>
          Array.from(this.selectedItems).map((id) => {
            // Find product by _id
            const product = inventoryList.find(
              (item) => item._id === id && item.is_move_to_retail === "PENDING",
            );

            // Return the required structure
            return product
              ? {
                  _id: product._id,
                  sku: product.sku,
                  tmp_product_ids: product.tmp_product_ids,
                  amz_product_type: product.amz_product_type,
                }
              : null;
          }),
        ),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((selectedProducts) => {
        this.asinListForMoveToRetail = selectedProducts.filter(
          (p) => p !== null,
        );
      });

    this._matDialog.open(this.moveInventoryTemplate);
  }

  OpenConfirmationPopup(): void {
    this.updateStatusConfirm = this._utilService.confirmMessage(
      "Active/Deactive selected products",
      "Are you sure you want to activate/deactivate these products?",
      "Yes",
    );

    const dialogRef = this._confirmationService.open(
      this.updateStatusConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this.unpublishSelected();
        } else {
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  openDeleteConfirmationPopup(id: string, sku: string = ""): void {
    if (id) {
      this.selectedItems.add(id);
    }
    this.matDataDialog = {
      sku: sku ?? null,
    };
    this._matDialog.open(this.deleteListingTemplate);
  }

  deleteFromAmazon(sku: string = ""): void {
    const selectedIds = Array.from(this.selectedItems); // Convert Set to Array
    this._amzInventoryService
      .deleteListingFromAmazon(selectedIds, sku)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response) => {
          this._utilService.onSuccess(response.message);
          this.fetchAmazonInventoryBySeller(this.userInfo.id);
          this._changeDetectorRef.markForCheck();
          this._matDialog.closeAll();
          this.selectedProductId = "";
        },
        error: (err) => {
          this._utilService.onError(
            "Something went wrong please try again  later",
          );
          this._matDialog.closeAll();
          this.selectedProductId = "";
        },
      });
  }

  // mass Unpublish Inventories
  unpublishSelected(): void {
    const selectedIds = Array.from(this.selectedItems); // Convert Set to Array
    this._amzInventoryService
      .updateProductListing(this.userInfo.id, selectedIds)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response) => {
          this._utilService.onSuccess(
            "Unpublish the selected items successfully.",
          );
          // Reset selection after successful unpublish
          this.selectedItems.clear();
          this.fetchAmazonInventoryBySeller(
            this.routeSellerId || this.userInfo.id,
          );
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this._utilService.onError(
            "Something went wrong please try again  later",
          );
          console.error("Error unpublishing:", err);
        },
      });
  }

  /* 26-01 */
  openDialog(): void {
    const dialog = this._matDialog.open(this.inventoryUploadTemplate);
    dialog
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        this.closeUpdateDialog();
        this._changeDetectorRef.markForCheck();
      });
    // this._matDialog.afterAllClosed()
  }
  onFileUpload(event: InputEvent | any): any {
    this.selectedFile = event?.target?.files?.[0];
    if (!this.selectedFile) {
      return;
    }
    this.fileNM = this.selectedFile.name;

    const fileExtension = (
      this.selectedFile.name.split(".").pop() || ""
    ).toLowerCase();

    if (!["xlsx", "xls", "csv"].includes(fileExtension)) {
      this._utilService.onError(
        "Please upload an Excel or CSV file (.xlsx, .xls, .csv).",
      );
      this.fileNM = "";
      this._changeDetectorRef.markForCheck();
      return;
    }
  }

  uploadInventoryFile(): void {
    const uploadFormData = new FormData();
    uploadFormData.append("file", this.selectedFile);
    uploadFormData.append("marketplaceId", this.selectedMarketplaceId);

    // // Call the service to upload the file with seller_id
    this._inventoryService
      .uploadFileAndSyncInventory(uploadFormData)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: () => {
          this.isDisableFlow = false;
          this.fileNM = "";
          this._matDialog.closeAll();
          this.fetchAmazonInventoryBySeller(
            this.routeSellerId || this.userInfo.id,
          );
          this._utilService.onSuccess("File uploaded successfully.");
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.fileNM = "";
          this.selectedFile = null;
          this.isDisableFlow = false;
          this._matDialog.closeAll();
          this._changeDetectorRef.markForCheck();
          this._utilService.onError(
            err.error.message || "Something went wrong. Please try again.",
          );
        },
      });
  }
  /* 28.01 */
  navigateToSettings(): void {
    // Close the popup
    this.closeUpdateDialog();
    // Navigate to Amazon settings
    this._router.navigate(["/master/general-setting"]);
  }

  onMarketplaceSelect(selectedMarketplaceId: string): any {
    if (
      !selectedMarketplaceId ||
      selectedMarketplaceId === "undefined" ||
      selectedMarketplaceId === "null"
    ) {
      return;
    }
    this._amazonService
      .getAllProductTypeBaseOnMarketplace(selectedMarketplaceId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (data: any) => {
          if (data.status === 200) {
            if (data.data) {
              this.productTypes = data.data;
              this.singleProductsVars.filteredProductTypeList = data.data;
              this._changeDetectorRef.detectChanges();
            }
          }
        },
        error: ({ error }) => {
          console.error("Failed to load product types:", error);
        },
      });
  }
  getMarketplaces(marketplaceIds: any): any {
    if (!marketplaceIds) return [];
    if (typeof marketplaceIds === "string") {
      return this.allMarketplaces.filter(
        (marketplace) => marketplace.id === marketplaceIds,
      );
    }
    if (Array.isArray(marketplaceIds)) {
      return this.allMarketplaces.filter((marketplace) =>
        marketplaceIds.includes(marketplace.id),
      );
    }
    return [];
  }

  filterProductTypeDataForSingleProducts(event: any): any {
    if (!this.productTypes) {
      return;
    } //updateProductTypeSelect
    if (event && event !== "") {
      const searchQuery = event.toLowerCase().trim();
      const regexPattern = searchQuery.replace(/\s+/g, ".*"); // Convert spaces to regex wildcard
      const regex = new RegExp(regexPattern, "i"); // Case-insensitive regex

      this.singleProductsVars.filteredProductTypeList =
        this.productTypes.filter(
          (item: { [key: string]: any; productType: string }) =>
            item.productType.toLowerCase().indexOf(event.toLowerCase()) > -1 || //search productType
            item.displayName.toLowerCase().indexOf(event.toLowerCase()) > -1 || // search diaplay name
            regex.test(item.productType.toLowerCase().replace(/_/g, " ")), //search in between words
        );
    } else {
      this.singleProductsVars.filteredProductTypeList = this.productTypes;
    }
  }

  onPriceInputWL(event: any): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Remove negative sign if it exists at the start of the value
    if (value.startsWith("-")) {
      value = value.substring(1); // Removes the negative sign
    }

    // Ensure the value doesn't exceed 10 characters in length
    if (value.length > 10) {
      value = value.slice(0, 10);
    }

    // Update the form control value
    this.inventoryFormGroupWL.get("price")?.setValue(value);

    // Optionally, you can manually set the input value if you need immediate feedback
    input.value = value;
  }
  onStockInputWL(event: any): void {
    const input = event.target as HTMLInputElement;

    // Remove any non-numeric characters
    let value = input.value.replace(/[^0-9]/g, "");

    // Limit the value to a maximum of 5 characters
    if (value.length > 5) {
      value = value.slice(0, 5);
    }
    // Update the input field with the sanitized value
    input.value = value;

    // Update the form control value
    this.inventoryFormGroupWL.get("stock")?.setValue(value);
  }

  ngOnDestroy(): void {
    this._localService.removeItem("masterIds");
    // this._sessionService.removeItem('user');
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  // comment
  async OpenAddProductPopup(product: any): Promise<void> {
    if (product.id && product.sku) {
      this.closeUpdateDialog();
      if (this.imporsonatePageId) {
        this._router.navigate(
          [`${this.imporsonatePageId}/master/amazon-inventory/add`],
          {
            queryParams: {
              sku: product?.sku || "",
              product_id: product?.id || "",
            },
          },
        );
      } else {
        this._router.navigate(["master/amazon-inventory/add"], {
          queryParams: {
            sku: product?.sku || "",
            product_id: product?.id || "",
          },
        });
      }
    } else {
      if (this.imporsonatePageId) {
        this._router.navigate([
          `${this.imporsonatePageId}/master/amazon-inventory/add`,
        ]);
      } else {
        this._router.navigate(["master/amazon-inventory/add"]);
      }
    }
  }
  // For getting the form array controls
  getFormArrayControls(key: string, formGroup: FormGroup): AbstractControl[] {
    const control = formGroup.get(key);
    return control instanceof FormArray ? control.controls : [];
  }

  triggerEvent(): any {
    this.singleProductsVars.filteredProductTypeList = [];
    if (this.productTypes && Array.isArray(this.productTypes)) {
      this.singleProductsVars.filteredProductTypeList.push(
        ...this.productTypes,
      );
    }
  }
  async downloadFile(): Promise<any> {
    this.disableDownload = true; // Disable the button

    try {
      let filePath: string | null = null;

      if (this.selectedCategory === "retail") {
        // Determine file path for retail category
        filePath = `assets/sample-file/retail-product.${
          this.selectedFileType === "csv" ? "csv" : "xlsx"
        }`;
      } else if (
        this.selectedCategory === "whitelabel" &&
        this.selectProductType
      ) {
        // Handle whitelabel category with selected product type
        await this._amazonService
          .retrieveTemplateFileBaseOnProductType(
            this.selectProductType,
            this.selectedMarketplaceId,
          )
          .pipe(
            tap((response: any) => {
              if (response?.data) {
                //a1
                this.downloadFileFromUrl(response.data); // Trigger file download
                this.closeUpdateDialog(); // Close dialog after download
              } else {
                console.error(
                  "Error: File URL not found in the response",
                  response,
                );
              }
            }),
          )
          .toPromise(); // Use toPromise to handle observable as a promise
        return;
      } else {
        console.error("Invalid category or product type not selected");
      }

      if (filePath) {
        this.triggerFileDownload(filePath); // Trigger file download for retail
        this.closeUpdateDialog(); // Close dialog after successful download
      }
    } catch (err) {
      console.error("Error while downloading file:", err);
    } finally {
      this.disableDownload = false; // Re-enable the button in all cases
    }
  }

  OpenSampleFilePopup(sampleFileTemplate: TemplateRef<any>, flag: string): any {
    // this.singleProductsVars.filteredProductTypeList =
    //     this.productTypes;
    this.singleProductsVars.filteredProductTypeList = this.productTypes;
    this.selectedCategory = "retail";
    this.selectedFileType = "csv";
    this.selectProductType = "";
    if (flag === "sample") {
      this.fileNM = "";
      this.selectedFile = null;
    } else {
      this.selectedDeleteFile = null;
      this.deletefileNM = "";
    }
    this.fileControl.reset();
    this._matDialogRef = this._matDialog.open(sampleFileTemplate, {
      hasBackdrop: true,
    });
    this._matDialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        this.closeUpdateDialog();
        this._changeDetectorRef.markForCheck();
      });
  }

  onFileUploadWL(event): any {
    this.selectedFile = event?.target?.files?.[0];
    if (!this.selectedFile) {
      return;
    }
    this.fileNM = this.selectedFile.name;

    const fileExtension = (
      this.selectedFile.name.split(".").pop() || ""
    ).toLowerCase();
    const selectedFileFormat = this.fileFormatControl?.value; // Get the selected file format

    if (this.productTypeControl.value !== "white_label") {
      // Validate based on file format selection
      if (selectedFileFormat === "csv" && fileExtension !== "csv") {
        this._utilService.onError("Please select a .csv file.");
        this.fileNM = "";
        this._changeDetectorRef.markForCheck();
        return;
      }

      if (selectedFileFormat === "excel" && fileExtension !== "xlsx") {
        this._utilService.onError(
          "Please select an Excel file (.xlsx or .xls).",
        );
        this.fileNM = "";
        this._changeDetectorRef.markForCheck();
        return;
      }
    } else {
      if (!this.isProductType) {
        this._utilService.onError("Please select product type.");
        this.fileNM = "";
        this._changeDetectorRef.markForCheck();
        return;
      }
    }
  }
  importInventoryFile(sellerSetting: any, marketplaceId: string): void {
    if (this.sellerSetting) {
      if (!this.selectedFile) {
        this._utilService.onError("Please select a file to import.");
        return;
      }
      this.isDisableFlow = true;

      const uploadFormData = new FormData();
      uploadFormData.append("file", this.selectedFile);
      uploadFormData.append("amz_product_type", this.productTypeControl.value);
      uploadFormData.append(
        "amz_margin",
        this.amzMarginControl.value.toString(),
      );
      uploadFormData.append("amz_margin_mode", this.amzMarginModeControl.value);
      uploadFormData.append("amz_status", sellerSetting.amz_status);
      uploadFormData.append(
        "amz_fullfillment_by",
        this.fulfillmentControl.value,
      );
      uploadFormData.append(
        "shipping_charge",
        `${this.currentSelectedMarketplaceShippingCharge || 0}`,
      );
      // Retrieve user info from localStorage
      uploadFormData.append("seller_id", this.userInfo.id);
      uploadFormData.append("product_type", this.isProductType);
      uploadFormData.append("marketplace_id", marketplaceId);
      uploadFormData.append(
        "amz_handling_time",
        this.sellerSetting.amz_handling_time,
      );
      // Call the service to upload the file with seller_id
      this._inventoryService
        .saveDataWithFile(uploadFormData)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (res: any) => {
            this.isDisableFlow = false;
            this.fileNM = "";
            this.selectedFile = null;
            this.closeUpdateDialog();

            // Fetch and display inventory after the upload
            const updatedUserInfo: any = this._localService.getItem("user");
            this.fetchAmazonInventoryBySeller(
              this.routeSellerId || updatedUserInfo.id,
            );
            this._utilService.onSuccess(
              res?.message ||
                "File processing has started. Go to Dashboard to track the progress.",
            );
            this._changeDetectorRef.markForCheck();
          },
          error: (err) => {
            this.fileNM = "";
            this.selectedFile = null;
            this.isDisableFlow = false;
            this._changeDetectorRef.markForCheck();
            this._utilService.onError(
              err?.error?.message || "Something went wrong. Please try again.",
            );
            this.closeUpdateDialog();
          },
        });
    }
  }
  async OpenImportPopup(
    importFormTemplate: TemplateRef<any>,
    flag: string,
  ): Promise<any> {
    this.productTypeControl;
    this.selectedCategory = "retail";
    this.selectedFileType = "csv";
    this.selectProductType = "";
    this.isProductType = "";
    if (flag === "import") {
      this.fileNM = "";
      this.selectedFile = null;
    } else {
      this.selectedDeleteFile = null;
      this.deletefileNM = "";
    }
    this.fileControl.reset();
    this.singleProductsVars.filteredProductTypeList = this.productTypes;
    this.fulfillmentControl.setValue(
      this.sellerSetting?.amz_fullfillment_by || "",
    );
    this.singleFulfillmentControl.setValue(
      this.sellerSetting?.amz_fullfillment_by || "",
    );
    this.productTypeControl.setValue(
      this.sellerSetting?.amz_product_type || "",
    );
    this.singleProductTypeControl.setValue(
      this.sellerSetting?.amz_product_type || "",
    );

    this.amzMarginControl.setValue(this.sellerSetting?.amz_margin || 0);

    this.amzMarginModeControl.setValue(
      this.sellerSetting?.amz_margin_mode || "",
    );

    this.singleProductsVars.filteredProductTypeList = this.productTypes;
    this._matDialogRef = this._matDialog.open(importFormTemplate, {
      hasBackdrop: true,
    });
    this._matDialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        this.closeUpdateDialog();
        this._changeDetectorRef.markForCheck();
      });
  }

  /**
   * Trigger file download from the provided URL.
   *
   * @param fileUrl - URL of the file to download.
   */
  private downloadFileFromUrl(fileUrl: string): void {
    const link = document.createElement("a");
    link.href = `${environment.uploadPath}product-listing-templates/${fileUrl}`; // The file URL returned from the server
    link.download =
      this.selectProductType + fileUrl.split("/").pop() || "download.xlsx"; // Extract file name from URL or fallback
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); // Clean up the DOM
  }

  private triggerFileDownload(filePath: string): void {
    const link = document.createElement("a");
    link.href = filePath;
    link.download = filePath.split("/").pop() || "default-filename";
    link.click();
  }

  /* 29.01 */

  getAllProductTypeList(): void {
    this._inventoryService
      .getProdcutTypeBaseONSeller(this.selectedMarketplaceId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (data) => {
          this.productTypeList = data.data;
        },
        error: (error) => {
          console.error("Error fetching product type list:", error);
        },
      });
  }

  /* 30.01 */
  // For removing an array item
  removeArrayItem(key: string, formGroup: FormGroup): void {
    const control = formGroup.get(key) as FormArray;
    control.removeAt(control.length - 1); // Remove last control from FormArray
  }
  // For adding an array item
  addArrayItem(key: string, formGroup: FormGroup, tab: string): void {
    const control = formGroup.get(key) as FormArray;
    control.push(this[tab].control(""));
  }
  OpenUpdateProductPopup(
    updateProductTemplate: TemplateRef<any>,
    id: string,
    product_type: string,
    invetory: any,
    sku = null,
  ): any {
    if (sku) {
      if (this.imporsonatePageId) {
        this._router.navigate(
          [`${this.imporsonatePageId}/master/amazon-inventory/edit/${id}/`],
          {
            queryParams: { varient: sku },
          },
        );
      } else {
        this._router.navigate([`master/amazon-inventory/edit/${id}`], {
          queryParams: { varient: sku },
        });
      }
    } else {
      if (this.imporsonatePageId) {
        this._router.navigate([
          `${this.imporsonatePageId}/master/amazon-inventory/edit/${id}/`,
        ]);
      } else {
        this._router.navigate([`master/amazon-inventory/edit/${id}`]);
      }
    }
  }

  OpenMoveProductConfirmationPopup(key: string, id: any): any {
    if (key === "Approve") {
      this.updateMoveRetailStatusConfirm = this._utilService.confirmMessage(
        "Confirm Move to Retail",
        "Are you sure you want to move these products to the Retail category?",
        "Yes, Move to Retail",
      );
    } else if (key === "Reject") {
      this.updateMoveRetailStatusConfirm = this._utilService.confirmMessage(
        "Reject Move to Retail",
        "Are you sure you want to reject moving these products to the Retail category?",
        "Yes, Reject",
      );
    } else if (key === "Submit") {
      return this.moveProductsToRetail(key, id);
    }

    const dialogRef = this._confirmationService.open(
      this.updateMoveRetailStatusConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this.moveProductsToRetail(key, id);
        } else {
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  moveProductsToRetail(key: string, id: any): void {
    const selectedAsin = this.selectedAsins[id];

    if (key === "Approve" && !selectedAsin) {
      this._utilService.onError("please select ASIN first!");
      return;
    }
    this._notificationService
      .updateNotification({ id: id, asin: selectedAsin, key })
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: () => {
          this._utilService.onSuccess("product updated successfully.");
          this.isActionCompleted[id] = true;
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this._utilService.onError(
            "Something went wrong please try again later",
          );
          console.error("Error unpublishing:", err);
        },
      });
  }

  dispalyFilter() {
    this.showFilter = !this.showFilter;
  }
  stripHtml(html: string = ""): string {
    if (!html) {
      return "-";
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "-";
  }

  /* 31.01 */
  //for auto select retails and navigate back to retails popup
  navigateThePopupToRetails(
    payload: { product_id?: string; price?: number; stock?: number } = {},
  ): void {
    this.singleProductTypeControl.setValue("retail");
    Object.entries(payload).forEach(([key, value]) => {
      this.inventoryFormGroupWL.get(key)?.setValue(value);
    });
    this._changeDetectorRef.detectChanges();
  }

  // common confirmation service
  async _commonConfirmationDialog(
    {
      title = "",
      message = "",
      confirmText = "",
    }: {
      title: string;
      message: string;
      confirmText: string;
    },
    func = () => {},
  ): Promise<void> {
    const VarConfirm: FormGroup = this._utilService.confirmMessage(
      ` ${title}`,
      `${message}`,
      `${confirmText}`,
    );
    const dialogRef = this._confirmationService.open(VarConfirm.value);
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          func();
        } else {
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }
  isObject(value: any): boolean {
    return typeof value === "object" && !Array.isArray(value) && value !== null;
  }
  openIssuesPopup(issues: string[], product_type: string): void {
    this._matDialog.open(this.issueTemplate, {
      data: { issues, product_type }, // Pass both issues and product_type
    });
  }

  OpenAddImagePopup(
    AddImages: TemplateRef<any>,
    image: string,
    id: string,
    whiteLabelProducts: any,
    sku: string,
  ): any {
    if (whiteLabelProducts) {
      this.selectedImages = [];
      if (Array.isArray(whiteLabelProducts)) {
        whiteLabelProducts =
          whiteLabelProducts.find(
            (attr) => attr.other_product_image_locator_1,
          ) || {};
      } else if (
        typeof whiteLabelProducts !== "object" ||
        whiteLabelProducts === null
      ) {
        whiteLabelProducts = {};
      }

      for (let i = 1; i <= 8; i++) {
        const key = `other_product_image_locator_${i}`;
        const mediaLocation = whiteLabelProducts[key]?.[0]?.media_location;
        if (whiteLabelProducts[key] && mediaLocation) {
          this.selectedImages.push({
            file: null, // No actual file available initially
            preview: this.getImageUrl(mediaLocation),
          });
        }
      }
    }

    this.matDataDialog = {
      image: this.getImageUrl(image),
      sku: sku ?? null,
    };
    this.mainImageId = id;
    this._matDialogRef = this._matDialog.open(AddImages, {
      hasBackdrop: true,
    });
    this._matDialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this.closeUpdateDialog();
          this.matDataDialog = {};
        } else {
          this.matDataDialog = {};
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  onFileSelected(event: Event, index?: number) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const newFiles = Array.from(input.files);
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
    ];

    newFiles.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        console.warn("Unsupported file type:", file.type);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const previewUrl = reader.result as string;
        if (index !== undefined) {
          this.selectedImages[index] = { file, preview: previewUrl };
        } else {
          this.selectedImages.push({ file, preview: previewUrl });
        }
        this._changeDetectorRef.markForCheck();
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number) {
    const image = this.selectedImages[index];

    if (image?.file) {
      this.selectedImages.splice(index, 1);
      this._changeDetectorRef.markForCheck();
      return;
    }

    this._inventoryService
      .deleteWlImage(this.mainImageId, index)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        (data) => {
          this.selectedImages.splice(index, 1);
          this._changeDetectorRef.markForCheck();
        },
        (error) => {
          console.error("API Delete Failed:", error);
        },
      );
  }

  submitImages(sku: string = "") {
    const formData = new FormData();
    this.selectedImages.forEach((img, index) => {
      if (img.file) {
        formData.append(`file[${index}]`, img.file);
      }
    });
    formData.append("main_image_url", this.mainImageFile);
    formData.append("marketplace_id", this.selectedMarketplaceId);
    this._inventoryService
      .UpdateWhiteLableImage(formData, this.mainImageId, sku)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.selectedImages = [];
        this.closeUpdateDialog();
        this.fetchAmazonInventoryBySeller(this.userInfo.id);
        this._changeDetectorRef.markForCheck();
      });
  }
  onMainImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/webm",
      ]; // Allowed image types

      // Validate file types (only images allowed)
      if (!allowedTypes.includes(file.type)) {
        this._utilService.onError(
          "Only image files (JPEG, PNG, GIF, WebP) and videos (MP4,WEBM) are allowed.",
        );
        return;
      }
      this.mainImageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.matDataDialog = { file, image: e.target.result };
      };
      reader.readAsDataURL(file);
    }
  }

  sortData(event): void {
    this.loadData(
      this.event ? this.event.pageIndex + 1 : 1,
      this.event ? this.event.pageSize : getPageSize(this._paginators?.first),
      event.active,
      event.direction,
    );
  }

  pageChangeEvent(event): void {
    this.event = event;
    this.loadData(event.pageIndex + 1, event.pageSize, "createdAt", "desc");
  }

  loadData(
    pageIndex: number,
    pageSize: number,
    sortBy: string,
    sortOrder: any,
  ): void {
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();
    this._amzInventoryService
      .getAmazonInventoryByseller(
        this.userInfo.id,
        pageIndex,
        pageSize,
        sortBy,
        sortOrder,
        this.searchValue,
        this.tmpQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: () => {
          this.amzInventoryFormInput =
            this._amzInventoryService.amzInventories$;
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          console.error("Error in loadData (getAmazonInventoryByseller):", err);
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  handleLightBoxProduct(whiteLabelProducts: any, mainImageUrl: string): any {
    const galleryItems: ImageItem[] = [];

    //  If whiteLabelProducts is an array, take the first item
    if (Array.isArray(whiteLabelProducts) && whiteLabelProducts.length > 0) {
      whiteLabelProducts = whiteLabelProducts[0];
    }
    //  Handle if whiteLabelProducts is an object
    if (whiteLabelProducts && typeof whiteLabelProducts === "object") {
      Object.keys(whiteLabelProducts).forEach((key) => {
        if (key?.startsWith("other_product_image_locator_")) {
          const images = !key.endsWith("media_location")
            ? whiteLabelProducts[key]
            : [{ media_location: whiteLabelProducts[key] }];

          //  If it's an array, loop through its items
          if (Array.isArray(images)) {
            images.forEach((item) => {
              if (item?.media_location) {
                const mediaSrc = resolveMediaUrl(item.media_location, {
                  basePath: this.imgPath,
                  folder: "upload-files",
                });
                const fileType = this.getFileType(mediaSrc);
                if (fileType === "image") {
                  galleryItems.push(
                    new ImageItem({
                      src: mediaSrc,
                      thumb: mediaSrc,
                    }),
                  );
                } else if (fileType === "video") {
                  galleryItems.push(
                    new VideoItem({
                      src: mediaSrc,
                      thumb: mediaSrc,
                      autoplay: true,
                      loop: true,
                    }),
                  );
                }
              }
            });
          }
          //  If it's an object, check for a single media_location
          else if (typeof images === "object" && images?.media_location) {
            const mediaSrc = resolveMediaUrl(images.media_location, {
              basePath: this.imgPath,
              folder: "upload-files",
            });
            const fileType = this.getFileType(mediaSrc);
            if (fileType === "image") {
              galleryItems.push(
                new ImageItem({
                  src: mediaSrc,
                  thumb: mediaSrc,
                }),
              );
            } else if (fileType === "video") {
              galleryItems.push(
                new VideoItem({
                  src: mediaSrc,
                  thumb: mediaSrc,
                  autoplay: true,
                  loop: true,
                }),
              );
            }
          }
        }
      });
    }

    //  Always push the main image (if it exists)
    if (mainImageUrl) {
      const resolvedMain = resolveMediaUrl(mainImageUrl, {
        basePath: this.imgPath,
        folder: "upload-files",
      });
      const fileType = this.getFileType(resolvedMain);
      if (fileType === "image") {
        galleryItems.unshift(
          new ImageItem({
            src: resolvedMain,
            thumb: resolvedMain,
          }),
        );
      } else if (fileType === "video") {
        galleryItems.unshift(
          new VideoItem({
            src: resolvedMain,
            thumb: resolvedMain,
            autoplay: true,
            loop: true,
          }),
        );
      }
    }

    //  Load images into the gallery
    const lightboxRef = this.gallery.ref("lightbox");

    lightboxRef.setConfig({
      imageSize: ImageSize.Contain,
      thumbPosition: ThumbnailsPosition.Bottom,
    });

    lightboxRef.load(galleryItems);
    this.lightbox.open(0);
  }

  onUpdatePopupOpen(issue: string[] = []): void {
    this.missingAttributesSet.clear();
    issue.forEach((items: string) => {
      this.missingAttributesSet.add(items);
    });
  }

  getVarientImageCount(varient: any): number {
    let count = 0;
    if (varient && varient?.main_product_image_locator___media_location) {
      count += 1;
    }
    varient &&
      varient.attributes &&
      Object.entries(varient.attributes).forEach(([k, v]: [string, any]) => {
        if (k && k.startsWith("other_product_image_locator")) {
          // v is typically an array like [{media_location: "url", marketplace_id: "..."}]
          if (Array.isArray(v)) {
            const hasMedia = v.some(
              (item: any) => item?.media_location && item.media_location !== "",
            );
            if (hasMedia) {
              count += 1;
            }
          } else if (typeof v === "string" && v !== "" && v !== "null") {
            count += 1;
          }
        }
      });
    return count;
  }
  validateInput(event: any) {
    const value = event.target.value;

    // Allow empty input while typing (so users can delete and re-enter)
    if (value === "") {
      return;
    }

    // Ensure the value is a number, within range, and has max 7 digits
    let numValue = parseInt(value, 10);

    if (isNaN(numValue)) {
      event.target.value = ""; // Allow empty value temporarily
      event.target.value = "0";
      return;
    }

    numValue = Math.max(0, Math.min(9999999, numValue)); // Keep within range
    if (event.target.value.trim() === "") {
      event.target.value = "0";
    }
    event.target.value = numValue.toString();
  }

  resetIfEmpty(event: any) {
    // If the input is empty when the user leaves, reset to 0
    if (event.target.value.trim() === "") {
      event.target.value = "0";
    }
  }
  getImageUrl(image: any): string {
    return resolveMediaUrl(image, {
      basePath: this.imgPath,
      folder: "upload-files",
    });
  }

  onImageError(event: any): void {
    const img = event.target as HTMLImageElement;

    // Prevent infinite loop
    img.onerror = null;

    img.src = "assets/images/no-image-icon.png";
  }
}
