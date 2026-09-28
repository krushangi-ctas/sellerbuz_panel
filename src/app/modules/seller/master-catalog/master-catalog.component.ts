import { takeUntil, finalize } from "rxjs";
import { AmazonService } from "../../../core/amazon/amazon.service";
import { GeneralSettingService } from "../../../core/general-setting/general-setting.service";

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Router } from "@angular/router";
import { FuseUtilsService } from "@fuse/services/utils";
import { Inventory } from "app/core/inventory/inventory.model";
import { InventoryService } from "app/core/inventory/inventory.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import {
  Observable,
  Subject,
  debounceTime,
  map,
  merge,
  switchMap,
  forkJoin,
} from "rxjs";
import * as XLSX from "xlsx";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { MatDrawer } from "@angular/material/sidenav";
import { TagService } from "app/core/tag-setting/tag-setting.service";
import { fuseAnimations } from "@fuse/animations";
import * as Excel from "exceljs/dist/exceljs.min";
import * as fs from "file-saver";

import {
  ImageItem,
  ImageSize,
  ThumbnailsPosition,
  Gallery,
  VideoItem,
} from "ng-gallery";
import { Lightbox } from "ng-gallery/lightbox";
import { getFileType, resolveMediaUrl } from "app/shared/common";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { FileProgressService } from "app/core/file-progress/file-progress.service";
import { environment } from "environments/environment";
@Component({
  standalone: false,
  selector: "app-inventory",
  templateUrl: "./master-catalog.component.html",
  styleUrls: ["./master-catalog.component.scss"],
  animations: fuseAnimations,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MasterCatalogComponent implements OnInit, AfterViewInit {
  @ViewChild("bulletPoint") bulletPoint: TemplateRef<any>;
  @ViewChild("keywords") keywords: TemplateRef<any>;
  @ViewChild("matDrawer", { static: true }) matDrawer: MatDrawer;
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;
  _matDialogRef: MatDialogRef<any>;
  drawerMode: "side" | "over";
  headers: { key: string; label: string; sortKey?: string }[] = [
    { key: "createdAt", label: "Created", sortKey: "createdAt" },
    { key: "main_image_url", label: "Image" },
    { key: "title", label: "Title", sortKey: "title" },
    { key: "brand", label: "Brand", sortKey: "brand" },
    { key: "description", label: "Desc.", sortKey: "description" },
    { key: "sku", label: "Sku", sortKey: "sku" },
    { key: "ean", label: "EAN", sortKey: "ean" },
    { key: "tags", label: "Tags" },
    { key: "master_stock", label: "Stock", sortKey: "master_stock" },
    { key: "master_price", label: "Price", sortKey: "master_price" },
    {
      key: "bullet_points",
      label: "Bullet#",
      sortKey: "bullet_points",
    },
    { key: "contry_of_origin", label: "Origin", sortKey: "contry_of_origin" },
    // {
    //     key: 'is_product_stopped',
    //     label: 'Status',
    //     sortKey: 'is_product_stopped',
    // },
    { key: "updatedAt", label: "Updated", sortKey: "updatedAt" },
  ];
  selectedItems: Set<string> = new Set<string>();
  inventoryFormInput: Observable<Inventory[]>;
  pagination: Pagination;
  bulletPoints: string[] = [];
  expandedCatalogId: string | null = null;
  tooltip = Constants.catalogDetails;
  updateStatusConfirm: FormGroup;
  searchInputControl: FormControl = new FormControl();
  tag: FormControl = new FormControl();
  startDate: FormControl = new FormControl("");
  endDate: FormControl = new FormControl("");
  maxDate = new Date();
  isResetDate: boolean = false;
  searchValue: any = "";
  pageLimit: number = Constants.pageLimit;
  tmpQry: object = {};
  isLoading: boolean = true;
  selectedFile: File;
  fileNM: string;
  fileControl = new FormControl("", Validators.required);
  isDisableFlow: boolean = false;
  tagList: any[] = [];
  selectedMarketplace: any;
  selectedValue: any;
  selectedSeller: any;
  allMarketplaces = Constants.amazonMarketplaces;
  selectedMarketplaceValue: string;
  userInfo: any;
  inventoryId: any;
  btnDisable: boolean = false;
  id: any = "";
  sellerSetting: any;
  disableDownload: boolean = false;
  tagId: string = "";
  unpublishForm: FormGroup;
  selectedKeywords: string[] = [];
  taglistLoader: boolean;
  filterTagList: any[];
  selectedMarketplaceId: string | null = null;
  authorizedMarketplaces: any[] = [];
  filteredMarketplaces: any[] = [];
  getFileType = getFileType;

  // Sync Dialog Controls & Properties
  syncProductType: FormControl = new FormControl("retail");
  syncWlProductType: FormControl = new FormControl("");
  syncMargin: FormControl = new FormControl(0);
  syncMarginMode: FormControl = new FormControl("PERCENTAGE");
  syncFulfillment: FormControl = new FormControl("FBM");

  wlProductTypes: any[] = [];
  filteredWlProductTypes: any[] = [];
  wlProductTypeFilterCtrl: FormControl = new FormControl("");
  isWlProductTypesLoading: boolean = false;

  syncValidationResults: any = null;
  isSyncValidating: boolean = false;
  syncAsinConflict: boolean = false;
  isRetailDisabled: boolean = false;
  isWhiteLabelDisabled: boolean = false;

  getImageUrl(image: string | string[] | null | undefined): any {
    return resolveMediaUrl(image, {
      basePath: environment.uploadPath,
      folder: "upload-files",
    });
  }

  imporsonatePageId: any;
  rolePermission: any = {};
  isSuperAdmin: boolean = false;
  // Manual Add / Edit Form Properties
  manualAddForm: FormGroup;
  isAddingProduct: boolean = false;
  editingProductId: string | null = null;
  manualBulletPoints: string[] = [""];
  manualImages: string[] = [""];
  countryFilterCtrl: FormControl = new FormControl("");
  countryList: { code: string; label: string }[] = Constants.countryList;
  filteredCountryList: { code: string; label: string }[] = [
    ...this.countryList,
  ];
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _inventoryService: InventoryService,
    private _amazonService: AmazonService,
    private _tagService: TagService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _matDialog: MatDialog,
    private _router: Router,
    private _utilService: FuseUtilsService,
    private _confirmationService: FuseConfirmationService,
    private unpublisfb: FormBuilder,
    private _generalSettingService: GeneralSettingService,
    public gallery: Gallery,
    public lightbox: Lightbox,
    private _userSessionService: UserSessionsService,
    private _navigationService: NavigationService,
    private _fileProgressService: FileProgressService,
  ) {
    // Initialize manual add form
    this.manualAddForm = this.unpublisfb.group({
      title: ["", [Validators.required, Validators.maxLength(200)]],
      brand: ["", [Validators.required, Validators.maxLength(40)]],
      sku: ["", [Validators.required, Validators.maxLength(10)]],
      asin: [
        "",
        [
          Validators.maxLength(10),
          Validators.pattern("^$|^[a-zA-Z0-9]{10}$"), // Allows empty string or exactly 10 alphanumeric characters/digits
        ],
      ],
      description: ["", [Validators.required, Validators.maxLength(800)]],
      main_image_url: ["", Validators.pattern("https?://.+")],
      ean: [""],
      contry_of_origin: [""],
      master_stock: [
        0,
        [
          Validators.min(0),
          this.maxDigitsValidator(10), // Restricts input to maximum 10 digits total
        ],
      ],
      master_price: [
        0,
        [
          Validators.min(0),
          this.maxDigitsValidator(10), // Limits whole numbers to 10 digits max
        ],
      ],
    });
  }
  maxDigitsValidator(maxDigits: number = 10) {
    return (control: any) => {
      const value =
        control.value !== null && control.value !== undefined
          ? String(control.value)
          : "";

      // Extract only the integer digits before any decimal point
      const integerPart = value.split(".")[0];
      const digitsOnly = integerPart.replace(/\D/g, "");

      if (digitsOnly.length > maxDigits) {
        // Cleanly slice down to allowed digits and re-attach decimal part if it exists
        const decimalPart = value.split(".")[1];
        const truncatedValue =
          digitsOnly.slice(0, maxDigits) +
          (decimalPart !== undefined ? "." + decimalPart : "");

        // Update form state silently to prevent loop issues
        control.setValue(truncatedValue, { emitEvent: false });

        return {
          maxDigits: { required: maxDigits, actual: digitsOnly.length },
        };
      }
      return null;
    };
  }
  permissionGuard: any = {};

  private extractPermission(data: any): any {
    if (!data) return {};
    if (Array.isArray(data?.permissions)) {
      const found = data.permissions.find(
        (item: any) =>
          item?.section_name?.trim()?.toLowerCase() === "my catalog" ||
          item?.section_name?.trim()?.toLowerCase() === "catalog",
      );
      if (found) return found;
    }
    return (
      this._navigationService.getPermissionByRoute(data, this._router.url) || {}
    );
  }

  private checkPermission(action: string): boolean {
    if (this.isSuperAdmin) {
      return true;
    }
    const guard =
      this.permissionGuard && Object.keys(this.permissionGuard).length
        ? this.permissionGuard
        : this.rolePermission;
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
        this.rolePermission = this.permissionGuard;
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
          this.rolePermission = this.permissionGuard;
          this._changeDetectorRef.markForCheck();
        }
      });
    this.getTheActiveTagList();
    const user = this._userSessionService.getCurrentUser();
    if (!user) return;
    const activeSellerId =
      this._userSessionService.getSellerIdFromUrl() ||
      this._userSessionService.getCurrentSellerId() ||
      user?.id ||
      user?._id ||
      user?.seller_id;

    this.userInfo = {
      ...user,
      id: activeSellerId || user?.id || user?._id,
    };

    if (this.userInfo?.id) {
      this._fileProgressService.connect(this.userInfo.id);
      this._fileProgressService.fileProgress$
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((event) => {
          if (event.type === "completed" || event.type === "progress") {
            this.getUserData();
          }
        });
    }
    this._changeDetectorRef.markForCheck();
    this._userSessionService.currentSellerId$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.imporsonatePageId = data;
      });

    if (this.userInfo?.id) {
      this._generalSettingService.getSettingBySellerId(this.userInfo.id);
    }
    this._generalSettingService.sellerSetting$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((setting) => {
        this.sellerSetting = setting;
        this._changeDetectorRef.markForCheck();
      });

    this.wlProductTypeFilterCtrl.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((value) => {
        this.filterWlProductTypes(value);
      });
    this.unpublishForm = this.unpublisfb.group({
      checkboxes: this.unpublisfb.array([]),
    });
    this.updateStatusConfirm = this._utilService.confirmMessage(
      "Update Status",
      "Are you sure you want to update status?",
      "Yes",
    );
    this._changeDetectorRef.markForCheck();
    this.getUserData();
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
          return this._inventoryService.getAllInventoryByseller(
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
    // this.updateInventoryProductTagBySeller()
  }

  ngAfterViewInit(): void {
    // this.OpenAddProductPopup(this.addProductTemplate, 'add');
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
              if (this._paginators.first) {
                this._paginators.first.pageIndex = 0;
              }
            });

          // Get user if sort or page changes
          merge(this._sort.sortChange, this._paginators.first.page)
            .pipe(
              switchMap(() => {
                this.isLoading = true;
                return this._inventoryService.getAllInventoryByseller(
                  this.userInfo.id,
                  (this._paginators.first?.pageIndex || 0) + 1,
                  getPageSize(this._paginators?.first),
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
  }

  getMarketplaces(marketplaceIds: string[]): any {
    return this.allMarketplaces.filter((marketplace) =>
      marketplaceIds.includes(marketplace.id),
    );
  }

  unpublishSelected(): void {
    const selectedIds = Array.from(this.selectedItems); // Convert Set to Array
    this._inventoryService
      .updateProductListing(this.userInfo.id, selectedIds)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: () => {
          this._utilService.onSuccess(
            "Unpublish the selected items successfully",
          );
          // Reset selection after successful unpublish
          this.selectedItems.clear();
          this.fetchInventoryBySeller(this.userInfo.id);
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
  // Handle checkbox changes and maintain a list of selected IDs
  onCheckboxChange(event: any, id: string): void {
    if (event.checked) {
      this.selectedItems.add(id); // Add item to the selection set
    } else {
      this.selectedItems.delete(id); // Remove item from the selection set
    }
  }

  isAllSelected = this._inventoryService.inventorySetting$.pipe(
    map(
      (inventories) =>
        (inventories?.length ?? 0) > 0 &&
        this.selectedItems.size === (inventories?.length ?? 0),
    ),
  );

  // Toggle Select All
  toggleSelectAll(event: any): void {
    this._inventoryService.inventorySetting$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((inventories) => {
        if (event.checked) {
          this.selectedItems = new Set(inventories.map((item) => item._id));
        } else {
          this.selectedItems.clear();
        }
      });
  }

  // Check if any checkbox is selected
  anySelected(): boolean {
    return this.selectedItems.size > 0;
  }
  getUserData(): void {
    const id =
      this.userInfo?.id ||
      this._userSessionService.getSellerIdFromUrl() ||
      this._userSessionService.getCurrentSellerId();
    if (id) {
      this.fetchInventoryBySeller(id);
    }
  }

  fetchInventoryBySeller(id: string): void {
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();

    this.pageLimit = getPageSize(this._paginators?.first);
    this._inventoryService
      .getAllInventoryByseller(
        id,
        1,
        this.pageLimit,
        "createdAt",
        "desc",
        this.searchValue,
        this.tmpQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.inventoryFormInput = this._inventoryService.inventorySetting$;

          const checkboxesArray = this.unpublishForm.get(
            "checkboxes",
          ) as FormArray;
          checkboxesArray.clear(); // Clear previous controls

          if (response?.data && Array.isArray(response.data)) {
            response.data.forEach(() => {
              checkboxesArray.push(new FormControl(false)); // Add a FormControl for each item
            });
          }

          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }
  updateInventoryProductTagBySeller(): void {
    this.tmpQry["masterIds"] = [...this.selectedItems];
    this._inventoryService
      .updateTagsOfAllInventoryProductByseller(
        this.searchValue,
        this.tmpQry,
        Array.isArray(this.tagId) ? this.tagId.join(",") : this.tagId,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        () => {
          this.selectedItems.clear();
          this._utilService.onSuccess("Tags has been added successfully");
          this._changeDetectorRef.markForCheck();
          this.fetchInventoryBySeller(this.userInfo.id); // Refresh inventory
          this.closeUpdateDialog(); // Close the dialog
        },
        ({ error }) => {
          this._utilService.onError(error.message);
          this._changeDetectorRef.markForCheck();
        },
      );
  }

  onSearchSeller(): any {
    this.searchValue = this.searchValue ? this.searchValue.trim() : "";
    return this._inventoryService
      .getAllInventoryByseller(
        this.userInfo.id,
        1,
        getPageSize(this._paginators?.first),
        "createdAt",
        "desc",
        this.searchValue,
        this.tmpQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this._changeDetectorRef.markForCheck();
      });
  }

  getTheActiveTagList() {
    this.taglistLoader = true;
    this._tagService
      .getAllTagListWithoutPagenation()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (data) => {
          this.taglistLoader = false;
          if (data?.data && Array.isArray(data?.data)) {
            this.tagList = data?.data;
          }
        },
        error: (error) => {
          this.taglistLoader = false;
          console.error("Error fetching tag list:", error);
        },
      });
  }

  onChangeSellerReference(seller: any): void {
    if (seller) {
      this.tmpQry["seller_id"] = seller;
    } else {
      delete this.tmpQry["seller_id"];
    }
    this.onSearchSeller();
  }

  goBack(): void {
    window.history.back();
  }

  refresh() {
    const fieldsToReset = [
      "tag",
      "status",
      "masterIds",
      "startDate",
      "endDate",
    ];
    this.searchInputControl.setValue("");
    this.tag.setValue("");
    this.startDate.setValue("");
    this.endDate.setValue("");
    this.isResetDate = false;
    fieldsToReset.forEach((field) => delete this.tmpQry[field]);
    this.fetchInventoryBySeller(this.userInfo.id);
  }

  clearDate(): void {
    this.startDate.setValue("");
    this.endDate.setValue("");
    delete this.tmpQry["startDate"];
    delete this.tmpQry["endDate"];
    this.isResetDate = false;
    this.fetchInventoryBySeller(this.userInfo.id);
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
    this.fetchInventoryBySeller(this.userInfo.id);
  }

  /**
   * Save and close
   */
  saveAndClose(): void {
    this.fileNM = "";
    this.selectedFile = null;
    this.fileControl.reset();
    this._matDialogRef?.close();
  }

  closeDialog(): void {
    this.fileNM = ""; // Clear the file name
    this.selectedValue = null; // Clear selected portal
    this.selectedMarketplaceValue = null;
    this._matDialogRef?.close();
    this.disableDownload = false;
  }

  onFileUpload(event): any {
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
        "Please select an Excel or CSV file (.xlsx, .xls, .csv).",
      );
      this.fileNM = "";
      this._changeDetectorRef.markForCheck();
      return;
    }
  }

  parseExcel(binaryData: string): void {
    const workbook = XLSX.read(binaryData, { type: "binary" });
    const sheetNames = workbook.SheetNames;
  }

  OpenImportPopup(importFormTemplate: TemplateRef<any>): any {
    this.fileNM = "";
    this.selectedFile = null;
    this.fileControl.reset();
    this._matDialogRef = this._matDialog.open(importFormTemplate, {
      hasBackdrop: true,
    });
  }

  /**
   * Open manual add/edit product popup
   */
  OpenManualAddPopup(manualAddTemplate: TemplateRef<any>, product?: any): any {
    this.isAddingProduct = false;

    if (product) {
      this.editingProductId = product._id || product.id || null;

      // Extract and split all image URLs (handles arrays, comma-separated strings, |||-separated strings)
      const parseImages = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val.flatMap((v) => parseImages(v)).filter(Boolean);
        }
        if (typeof val === "string") {
          return val
            .split(/\|\|\||,|\n|\r/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && s !== "null" && s !== "undefined");
        }
        return [];
      };

      const mainImgs = parseImages(product.main_image_url);
      const extraImgs = parseImages(product.images);

      // Combine main and extra images into one ordered, deduplicated list
      const combined = Array.from(new Set([...mainImgs, ...extraImgs]));

      const mainImageUrl = combined.length > 0 ? combined[0] : "";
      const additionalImages = combined.length > 1 ? combined.slice(1) : [""];

      this.manualAddForm.patchValue({
        title: product.title || "",
        brand: product.brand || "",
        sku: product.sku || "",
        asin: product.asin || "",
        description: product.description || "",
        main_image_url: mainImageUrl,
        ean: product.ean || "",
        contry_of_origin: product.contry_of_origin || "",
        master_stock: product.master_stock ?? 0,
        master_price: product.master_price ?? 0,
      });

      // Disable SKU so it cannot be edited, keep ASIN editable
      this.manualAddForm.get("sku")?.disable();
      this.manualAddForm.get("asin")?.enable();

      // Pre-fill bullet points
      if (
        product.bullet_points &&
        Array.isArray(product.bullet_points) &&
        product.bullet_points.length > 0
      ) {
        this.manualBulletPoints = [...product.bullet_points];
      } else {
        this.manualBulletPoints = [""];
      }

      // Pre-fill images
      this.manualImages = additionalImages;
    } else {
      this.editingProductId = null;
      this.manualAddForm.reset();
      // Enable SKU and ASIN for new product creation
      this.manualAddForm.get("sku")?.enable();
      this.manualAddForm.get("asin")?.enable();
      this.manualBulletPoints = [""];
      this.manualImages = [""];
    }

    this.triggerCountryEvent();

    this._matDialogRef = this._matDialog.open(manualAddTemplate, {
      hasBackdrop: true,
    });
  }

  // ---- Bullet Points helpers ----
  addBulletPoint(): void {
    this.manualBulletPoints.push("");
  }

  removeBulletPoint(index: number): void {
    if (this.manualBulletPoints.length > 1) {
      this.manualBulletPoints.splice(index, 1);
    }
  }

  trackBulletPoint(index: number): number {
    return index;
  }

  // ---- Additional Images helpers ----
  addImageEntry(): void {
    this.manualImages.push("");
  }

  removeImageEntry(index: number): void {
    if (this.manualImages.length > 1) {
      this.manualImages.splice(index, 1);
    }
  }

  trackImageEntry(index: number): number {
    return index;
  }

  /**
   * Add or Update product manually
   */
  addProductManually(): void {
    if (this.manualAddForm.invalid || this.isAddingProduct) {
      return;
    }

    this.isAddingProduct = true;

    // Use getRawValue() so disabled values (sku, asin) are included
    const formValue = this.manualAddForm.getRawValue();

    // Process the form data to match the expected format
    const productData = {
      title: formValue.title,
      brand: formValue.brand,
      sku: formValue.sku,
      asin: formValue.asin,
      description: formValue.description,
      main_image_url: formValue.main_image_url,
      images: this.manualImages
        .map((u) => u.trim())
        .filter((u) => u.length > 0),
      bullet_points: this.manualBulletPoints
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
      ean: formValue.ean,
      contry_of_origin: formValue.contry_of_origin,
      master_stock: formValue.master_stock || 0,
      master_price: formValue.master_price || 0,
      seller_id: this.userInfo.id,
      import_from: "manual",
    };

    if (this.editingProductId) {
      // UPDATE FLOW
      this._inventoryService
        .updateProductManually(this.editingProductId, productData)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.isAddingProduct = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: (response) => {
            this.closeDialog();
            this.fetchInventoryBySeller(this.userInfo.id);
            this._utilService.onSuccess("Product updated successfully.");
          },
          error: (err) => {
            this._utilService.onError(
              err?.error?.message ||
                "Something went wrong while updating the product. Please try again.",
            );
          },
        });
    } else {
      // ADD FLOW
      this._inventoryService
        .addProductManually(productData)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.isAddingProduct = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: (response) => {
            this.closeDialog();
            this.fetchInventoryBySeller(this.userInfo.id);
            this._utilService.onSuccess("Product added successfully.");
          },
          error: (err) => {
            this._utilService.onError(
              err?.error?.message ||
                "Something went wrong while adding the product. Please try again.",
            );
          },
        });
    }
  }

  importInventoryFile(): void {
    if (!this.selectedFile) {
      this._utilService.onError("Please select a file to import.");
      return;
    }
    this.isDisableFlow = true;

    const uploadFormData = new FormData();
    uploadFormData.append("file", this.selectedFile);
    uploadFormData.append("seller_id", this.userInfo.id);

    this._inventoryService
      .saveCatalogDataWithFile(uploadFormData)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.isDisableFlow = false;
          this.fileNM = "";
          this.selectedFile = null;
          this.closeDialog();
          this.fetchInventoryBySeller(this.userInfo.id);
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
        },
      });
  }

  downloadSampleFile() {
    this.triggerFileDownload(
      "assets/sample-file/sample_product_catalog_data.xlsx",
    );
  }

  onClickFilter(field: string, value: any): void {
    if (value === null) {
      value = "";
    }
    this.tmpQry[field] = value;
    this.fetchInventoryBySeller(this.userInfo.id);
  }

  onSubmitTagForm() {
    if (this.tagId) {
      this.updateInventoryProductTagBySeller();
    } else {
      this._utilService.onError("Please select at least one Tag");
    }
  }

  bulkUpdateTagsOnProductList(): void {
    this.onSubmitTagForm();
  }

  toggleExpandCatalog(id: string): void {
    this.expandedCatalogId = this.expandedCatalogId === id ? null : id;
  }

  getBulletPointsList(bulletPoints: any): string[] {
    if (!bulletPoints) return [];
    if (Array.isArray(bulletPoints)) {
      return bulletPoints
        .flat()
        .filter((b: any) => typeof b === "string" && b.trim() !== "");
    }
    if (typeof bulletPoints === "string") {
      return bulletPoints
        .split("|||")
        .map((b: string) => b.trim())
        .filter((b: string) => b !== "");
    }
    return [];
  }

  openBulletPointsPopup(bulletPoints: string[]) {
    this.bulletPoints = bulletPoints?.flat() || [];
  }
  openKeywordsPopup(keywords: { tag: string; _id: string }[]) {
    this._matDialog.open(this.keywords);
    this.selectedKeywords = keywords.map((i) => i.tag);
  }

  flateAndFetchBulletsPoints = (bulletPoints: string[], index: number) =>
    bulletPoints.flat()[index];

  closePopup() {
    this._matDialog.closeAll();
    this.bulletPoints = [];
  }

  filterTagData(searchTerm: string): void {
    if (!this.tagList || !Array.isArray(this.tagList)) {
      return;
    }

    if (searchTerm && searchTerm.trim() !== "") {
      this.filterTagList = this.tagList.filter(
        (item) =>
          item.status === 1 &&
          item.tag.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    } else {
      this.filterTagList = [
        ...this.tagList.filter((item) => item.status === 1),
      ]; // Reset list
    }
  }

  triggerEvent(): void {
    this.filterTagList = [...this.tagList.filter((item) => item.status === 1)];
  }

  addUpdateSelectedMasterInventory(id: any, flag: string): any {
    this.updateStatusConfirm = this._utilService.confirmMessage(
      flag === "master_stock" ? "Sync stock in Amazon" : "Sync price in Amazon",
      flag === "master_stock"
        ? "Are you sure you want to sync this stock in Amazon marketplaces?"
        : "Are you sure you want to sync this price in the Amazon source marketplace?",
      "Yes",
    );
    const dialogRef = this._confirmationService.open(
      this.updateStatusConfirm.value,
    );
    let stock: any = document.getElementById(`stock_${id}`);
    stock = stock ? stock.value : 0;

    let price: any = document.getElementById(`price_${id}`);
    price = price ? price.value : 0;
    const updateData = { stock, price, flag };

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          updateData["sync_amz"] = true;
        }
        if (id) {
          // Update existing inventory item
          this._inventoryService
            .updateMasterInventoryData(id, updateData)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.btnDisable = false;
                this.isLoading = false;
                this._utilService.onSuccess(
                  "Inventory has been updated successfully.",
                );
                this.fetchInventoryBySeller(this.userInfo.id); // Refresh inventory
              },
              ({ error }) => {
                this.btnDisable = false;
                this.isLoading = false;
                this._utilService.onError(error.message);
              },
            );
        }
        this._changeDetectorRef.markForCheck();
      });
  }

  closeUpdateDialog(): void {
    this._matDialog.closeAll();
    this.fileControl.reset();
    this.tagId = null;
  }

  stopScrollingWheel(e): any {
    return e.target.blur();
  }

  getStatus(is_product_stopped: any): boolean {
    if (is_product_stopped) {
      return false;
    } else {
      return true;
    }
  }

  // navigateToSettings(): void {
  //     // Close the popup
  //     this.closeDialog();
  //     // Navigate to Amazon settings
  //     this._router.navigate(['/master/general-setting']);
  // }
  // productStop(event, id: string): void {
  //     const dialogRef = this._confirmationService.open(
  //         this.updateStatusConfirm.value
  //     );
  //     dialogRef.afterClosed().pipe(takeUntil(this._unsubscribeAll)).subscribe((result) => {
  //         if (result === 'confirmed') {
  //             this._inventoryService
  //                 .changeProductStopStatus(id, {
  //                     is_product_stopped: event.source.checked ? false : true,
  //                     flag: 'master',
  //                 })
  //                 .pipe(takeUntil(this._unsubscribeAll)).subscribe(
  //                     () => {
  //                         this._changeDetectorRef.markForCheck();
  //                         this._utilService.onSuccess(
  //                             'Product enable/disable successfully!'
  //                         );
  //                         // this.fetchInventoryBySeller(this.userInfo.id);
  //                     },
  //                     (error) => {
  //                         this._utilService.onError(error.message);
  //                         this._changeDetectorRef.markForCheck();
  //                     }
  //                 );
  //         } else {
  //             event.source.checked = !event.source.checked;
  //             this._changeDetectorRef.markForCheck();
  //         }
  //     });
  // }

  OpenConfirmationPopup(template: TemplateRef<any>): any {
    this.selectedMarketplaceId = null;
    this.loadSellerMarketplaces();
    this.syncProductType.setValue("retail");
    this.syncWlProductType.setValue("");
    this.syncMargin.setValue(0);
    this.syncMarginMode.setValue("PERCENTAGE");
    this.syncFulfillment.setValue("FBM");
    this.syncValidationResults = null;
    this.syncAsinConflict = false;
    this.isRetailDisabled = false;
    this.isWhiteLabelDisabled = false;
    this.wlProductTypes = [];
    this.filteredWlProductTypes = [];

    // Pre-populate defaults from seller general settings
    if (this.userInfo?.id) {
      this._generalSettingService
        .getSettingBySellerId(this.userInfo.id)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((res: any) => {
          const setting = res?.data?.[0] || res?.data;
          if (setting) {
            if (
              setting.amz_margin !== undefined &&
              setting.amz_margin !== null
            ) {
              this.syncMargin.setValue(Number(setting.amz_margin) || 0);
            }
            if (setting.amz_margin_mode) {
              this.syncMarginMode.setValue(setting.amz_margin_mode);
            }
            if (setting.amz_fullfillment_by) {
              this.syncFulfillment.setValue(setting.amz_fullfillment_by);
            }
            this._changeDetectorRef.markForCheck();
          }
        });
    }

    // Validate ASIN rules for selected items
    const selectedIds = Array.from(this.selectedItems);
    if (selectedIds.length > 0) {
      this.isSyncValidating = true;
      this._inventoryService
        .validateCatalogSyncType(selectedIds as string[])
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(
          (res: any) => {
            this.isSyncValidating = false;
            if (res?.status === 200 && res?.data) {
              this.syncValidationResults = res.data;
              if (res.data.allowedType === "retail") {
                this.syncProductType.setValue("retail");
                this.isRetailDisabled = false;
                this.isWhiteLabelDisabled = true;
              } else if (res.data.allowedType === "white_label") {
                this.syncProductType.setValue("white_label");
                this.isRetailDisabled = true;
                this.isWhiteLabelDisabled = false;
                if (this.selectedMarketplaceId) {
                  this.loadWlProductTypes();
                }
              } else if (res.data.allowedType === "mixed") {
                this.syncProductType.setValue("mixed");
                this.isRetailDisabled = true;
                this.isWhiteLabelDisabled = true;
                if (this.selectedMarketplaceId) {
                  this.loadWlProductTypes();
                }
              } else {
                this.syncProductType.setValue("retail");
                this.isRetailDisabled = false;
                this.isWhiteLabelDisabled = false;
              }
            }
            this._changeDetectorRef.markForCheck();
          },
          () => {
            this.isSyncValidating = false;
            this._changeDetectorRef.markForCheck();
          },
        );
    }

    this._matDialogRef = this._matDialog.open(template, {
      hasBackdrop: true,
    });
  }
  OpenAddTagConfirmationPopup(updateProductTemplate: TemplateRef<any>): any {
    this.tagId = null;
    // Open the dialog
    this._matDialogRef = this._matDialog.open(updateProductTemplate, {
      hasBackdrop: true,
    });
  }
  onBackdropClicked(): void {
    // Go back to the list
    // this._router.navigate(['./'], { relativeTo: this._activatedRoute });

    // Mark for check
    this._changeDetectorRef.markForCheck();
  }

  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent the default form submission behavior
    }
  }

  removeTagsFromPerticularProducts(id: string) {
    this._inventoryService
      .removeTagsFromProduct(id)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        (t: any) => {
          if (t.status === 200) {
            this._utilService.onSuccess(
              t?.message || "Tag removed Successfully",
            );
            this.fetchInventoryBySeller(this.userInfo.id);
          } else {
            this._utilService.onError(t?.message || "Something went wrong");
          }
        },
        ({ error }) => {
          this._utilService.onError("Error Occuring while the Removing Tag ");
          console.error("Error ", error);
        },
      );
  }
  /* 24.01 */
  commonMapAndConcate(item: any[]) {
    return item.map((i) => i.tag).join(",");
  }

  exportexcel(): void {
    this.isLoading = true;
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet();
    const header = [
      "Sku",
      "EAN",
      "ASIN",
      "Price",
      "Stock",
      "Image",
      "Title",
      "Brand",
      "Bullet point",
      "Country Of Origin",
      "Description",
      "Color",
      "Tag",
    ];

    const headerRow = worksheet.addRow(header);
    headerRow.height = 45;

    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "C5E5FB" },
        width: "4.22 cm",
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin", innerWidth: 2 },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.font = {
        family: 2,
        bold: true,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
    });

    this._inventoryService
      .getAllInventoryByseller(
        this.userInfo.id,
        1,
        getPageSize(this._paginators?.first),
        "createdAt",
        "desc",
        this.searchValue,
        this.tmpQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        (response) => {
          const catalogData = response.data;
          catalogData.forEach((item) => {
            worksheet.addRow([
              item.sku,
              item.ean,
              item.asin,
              item.master_price,
              item.master_stock,
              item.main_image_url,
              item.title,
              item.brand,
              item.bullet_points && Array.isArray(item.bullet_points)
                ? item.bullet_points.join(" ||| ")
                : "",
              item.contry_of_origin,
              item.description,
              item.color,
              item.tags ? this.commonMapAndConcate(item.tags) : "",
            ]);
          });
          workbook.xlsx.writeBuffer().then((data) => {
            const blob = new Blob([data], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            fs.saveAs(blob, "catalogData" + ".xlsx");
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
          });
        },
        ({ error }) => {
          this.isLoading = false;
          this._utilService.onError(
            error?.message || "Failed to export report",
          );
          this._changeDetectorRef.markForCheck();
        },
      );
  }

  getTagsTooltip(tags: any): string {
    if (!Array.isArray(tags)) {
      return ""; // Return empty string if tags is not an array
    }
    return tags
      .map((tag) => (typeof tag === "object" && tag?.tag ? tag.tag : tag))
      .join(",");
  }

  stripHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }

  loadSellerMarketplaces(): void {
    this.authorizedMarketplaces = [];
    this.filteredMarketplaces = [];
    this._amazonService
      .getMarketplaceBaseOnSeller()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any) => {
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
          const matched = this.allMarketplaces.filter((m) => ids.has(m.id));
          this.authorizedMarketplaces = matched;
          this.filteredMarketplaces = [...this.authorizedMarketplaces];
          if (
            this.authorizedMarketplaces.length > 0 &&
            (!this.selectedMarketplaceId ||
              this.authorizedMarketplaces.length === 1 ||
              !this.authorizedMarketplaces.some(
                (m) => m.id === this.selectedMarketplaceId,
              ))
          ) {
            this.selectedMarketplaceId = this.authorizedMarketplaces[0].id;
          }
          this._changeDetectorRef.markForCheck();
        } else {
          this.authorizedMarketplaces = [];
          this.filteredMarketplaces = [];
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  filterMarketplaceData(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === "") {
      this.filteredMarketplaces = [...this.authorizedMarketplaces];
    } else {
      const lower = searchTerm.toLowerCase();
      this.filteredMarketplaces = this.authorizedMarketplaces.filter(
        (m) =>
          m.countryName.toLowerCase().includes(lower) ||
          m.countryCode.toLowerCase().includes(lower) ||
          m.id.toLowerCase().includes(lower),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  triggerMarketplaceEvent(): void {
    this.filteredMarketplaces = [...this.authorizedMarketplaces];
  }

  filterCountryData(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === "") {
      this.filteredCountryList = [...this.countryList];
    } else {
      const lower = searchTerm.toLowerCase();
      this.filteredCountryList = this.countryList.filter(
        (c) =>
          c.label.toLowerCase().includes(lower) ||
          c.code.toLowerCase().includes(lower),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  triggerCountryEvent(): void {
    this.filteredCountryList = [...this.countryList];
    this.countryFilterCtrl.setValue("");
  }

  getProductTypeLabel(pt: any): string {
    if (!pt) return "";
    if (typeof pt === "string") return pt;
    const name = pt.productType || pt.product_type || pt.name || "";
    const display = pt.displayName || pt.display_name || "";
    if (display && display !== name) {
      return `${name} (${display})`;
    }
    return name || "";
  }

  getProductTypeValue(pt: any): string {
    if (!pt) return "";
    if (typeof pt === "string") return pt;
    return pt.productType || pt.product_type || pt.name || "";
  }

  onMarketplaceSelectionChange(): void {
    if (
      this.syncProductType.value === "white_label" ||
      this.syncValidationResults?.allowedType === "mixed"
    ) {
      this.loadWlProductTypes();
    }
    this._changeDetectorRef.markForCheck();
  }

  triggerWlProductTypeEvent(opened?: boolean): void {
    if (opened) {
      this.wlProductTypeFilterCtrl.setValue("", { emitEvent: false });
      this.filteredWlProductTypes = [...this.wlProductTypes];
      this._changeDetectorRef.markForCheck();
    }
  }

  onSyncProductTypeChange(type: string): void {
    this.syncProductType.setValue(type);
    if (
      type === "white_label" ||
      this.syncValidationResults?.allowedType === "mixed"
    ) {
      this.loadWlProductTypes();
    }
    this._changeDetectorRef.markForCheck();
  }

  loadWlProductTypes(): void {
    const marketplaceId =
      this.selectedMarketplaceId || this.authorizedMarketplaces?.[0]?.id || "";
    if (!marketplaceId) return;
    this.isWlProductTypesLoading = true;
    this._amazonService
      .getAllProductTypeBaseOnMarketplace(marketplaceId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.isWlProductTypesLoading = false;
          if (res?.status === 200 && Array.isArray(res?.data)) {
            this.wlProductTypes = res.data;
          } else if (Array.isArray(res)) {
            this.wlProductTypes = res;
          } else {
            this.wlProductTypes = [];
          }
          this.filteredWlProductTypes = [...this.wlProductTypes];
          this.wlProductTypeFilterCtrl.setValue("", { emitEvent: false });
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isWlProductTypesLoading = false;
          this.wlProductTypes = [];
          this.filteredWlProductTypes = [];
          this.wlProductTypeFilterCtrl.setValue("", { emitEvent: false });
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  filterWlProductTypes(event: any): void {
    if (!this.wlProductTypes) return;
    const value =
      typeof event === "string" ? event : event?.target?.value || "";
    if (!value || !value.trim()) {
      this.filteredWlProductTypes = [...this.wlProductTypes];
    } else {
      const searchQuery = value.toLowerCase().trim();
      const regexPattern = searchQuery.replace(/\s+/g, ".*");
      const regex = new RegExp(regexPattern, "i");
      this.filteredWlProductTypes = this.wlProductTypes.filter((pt: any) => {
        const pType = this.getProductTypeValue(pt);
        const dName = typeof pt === "object" ? pt?.displayName || "" : "";
        return (
          pType.toLowerCase().indexOf(searchQuery) > -1 ||
          dName.toLowerCase().indexOf(searchQuery) > -1 ||
          regex.test(pType.toLowerCase().replace(/_/g, " "))
        );
      });
    }
    this._changeDetectorRef.markForCheck();
  }

  confirmSyncInAmazon(): void {
    if (!this.selectedMarketplaceId) {
      this._utilService.onError("Please select a marketplace");
      return;
    }
    if (
      (this.syncProductType.value === "white_label" ||
        this.syncValidationResults?.allowedType === "mixed") &&
      !this.syncWlProductType.value
    ) {
      this._utilService.onError(
        "Please select White Label Product Type for non-ASIN items",
      );
      return;
    }

    const marketplaceId = this.selectedMarketplaceId;
    const syncOptions = {
      amz_product_type: this.syncProductType.value,
      wl_product_type:
        typeof this.syncWlProductType.value === "object"
          ? this.getProductTypeValue(this.syncWlProductType.value)
          : this.syncWlProductType.value,
      amz_margin:
        this.syncMargin.value !== undefined && this.syncMargin.value !== null
          ? Number(this.syncMargin.value)
          : 0,
      amz_margin_mode: this.syncMarginMode.value || "PERCENTAGE",
      amz_fullfillment_by: this.syncFulfillment.value || "FBM",
    };
    this._matDialogRef.close();
    this.moveAndSyncInAmazon(marketplaceId, syncOptions);
  }

  moveAndSyncInAmazon(marketplaceId: string, syncOptions?: any): void {
    const selectedIds = Array.from(this.selectedItems);

    if (this.syncValidationResults?.allowedType === "mixed") {
      const items = this.syncValidationResults.items || [];
      const asinIds = items
        .filter((i: any) => i.hasAsin && selectedIds.includes(i.id))
        .map((i: any) => i.id);
      const nonAsinIds = items
        .filter((i: any) => !i.hasAsin && selectedIds.includes(i.id))
        .map((i: any) => i.id);

      const retailOptions = {
        ...syncOptions,
        amz_product_type: "retail",
      };
      const wlOptions = {
        ...syncOptions,
        amz_product_type: "white_label",
      };

      const syncRequests: Observable<any>[] = [];
      if (asinIds.length > 0) {
        syncRequests.push(
          this._inventoryService.moveAndSyncInAmazon(
            asinIds,
            marketplaceId,
            retailOptions,
          ),
        );
      }
      if (nonAsinIds.length > 0) {
        syncRequests.push(
          this._inventoryService.moveAndSyncInAmazon(
            nonAsinIds,
            marketplaceId,
            wlOptions,
          ),
        );
      }

      if (syncRequests.length === 0) return;

      forkJoin(syncRequests)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(
          () => {
            this._utilService.onSuccess("Processing for amazon");
            this._changeDetectorRef.markForCheck();
            this.fetchInventoryBySeller(this.userInfo.id);
            this.selectedItems.clear();
          },
          ({ error }) => {
            this._utilService.onError(
              error?.message || "Failed to sync in Amazon",
            );
            this._changeDetectorRef.markForCheck();
          },
        );
    } else {
      this._inventoryService
        .moveAndSyncInAmazon(selectedIds, marketplaceId, syncOptions)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(
          () => {
            this._utilService.onSuccess("Processing for amazon");
            this._changeDetectorRef.markForCheck();
            this.fetchInventoryBySeller(this.userInfo.id);
            this.selectedItems.clear();
          },
          ({ error }) => {
            this._utilService.onError(
              error?.message || "Failed to sync in Amazon",
            );
            this._changeDetectorRef.markForCheck();
          },
        );
    }
  }

  handleLightBoxProduct(images: string[] | string): void {
    const galleryItems: ImageItem[] = [];
    const pushResolved = (item: string | string[]) => {
      const src = resolveMediaUrl(item, {
        basePath: environment.uploadPath,
        folder: "upload-files",
      });
      const filetypes = this.getFileType(src);
      if (filetypes === "image") {
        galleryItems.push(
          new ImageItem({
            src,
            thumb: src,
          }),
        );
      } else if (filetypes === "video") {
        galleryItems.push(
          new VideoItem({
            src,
            thumb: src,
            autoplay: true,
            loop: true,
          }),
        );
      }
    };

    if (Array.isArray(images)) {
      images.forEach((item) => pushResolved(item));
    } else if (typeof images === "string") {
      pushResolved(images);
    }

    // ✅ Load images into the gallery
    const lightboxRef = this.gallery.ref("lightbox");

    lightboxRef.setConfig({
      imageSize: ImageSize.Contain,
      thumbPosition: ThumbnailsPosition.Bottom,
    });

    lightboxRef.load(galleryItems);
    this.lightbox.open(0);
  }

  private triggerFileDownload(filePath: string) {
    const link = document.createElement("a");
    link.href = filePath;
    link.download = filePath.split("/").pop() || "default-filename";
    link.click();
  }
  /**
   * Delete catalog product with Amazon inventory check
   */
  deleteCatalogProduct(inventory: any): void {
    const productId = inventory?._id || inventory?.id;
    if (!productId) {
      this._utilService.onError("Invalid product selected.");
      return;
    }

    this._inventoryService
      .checkCatalogProductInAmazon(productId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          if (res?.data?.inAmazonInventory) {
            const warningDialog = this._utilService.confirmMessage(
              "Cannot Delete Product",
              "Please remove this product from Amazon inventory first. After that, it can be deleted from here.",
              "OK",
            );
            const dialogRef = this._confirmationService.open(
              warningDialog.value,
            );
            dialogRef
              .afterClosed()
              .pipe(takeUntil(this._unsubscribeAll))
              .subscribe(() => {
                this._changeDetectorRef.markForCheck();
              });
          } else {
            const confirmDialog = this._utilService.confirmMessage(
              "Delete Catalog Product",
              "Are you sure you want to delete this product from catalog?",
              "Yes, Delete",
            );
            const dialogRef = this._confirmationService.open(
              confirmDialog.value,
            );
            dialogRef
              .afterClosed()
              .pipe(takeUntil(this._unsubscribeAll))
              .subscribe((result) => {
                if (result === "confirmed") {
                  this.isLoading = true;
                  this._changeDetectorRef.markForCheck();
                  this._inventoryService
                    .deleteMasterCatalogProduct(productId)
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe({
                      next: (delRes: any) => {
                        this.isLoading = false;
                        if (delRes?.status === 200) {
                          this._utilService.onSuccess(
                            delRes?.message ||
                              "Product deleted successfully from catalog.",
                          );
                          this.fetchInventoryBySeller(this.userInfo.id);
                        } else {
                          this._utilService.onError(
                            delRes?.message || "Failed to delete product.",
                          );
                          this._changeDetectorRef.markForCheck();
                        }
                      },
                      error: (err: any) => {
                        this.isLoading = false;
                        this._utilService.onError(
                          err?.error?.message ||
                            err?.message ||
                            "Failed to delete product.",
                        );
                        this._changeDetectorRef.markForCheck();
                      },
                    });
                } else {
                  this.isLoading = false;
                  this._changeDetectorRef.markForCheck();
                }
              });
          }
        },
        error: (err: any) => {
          this._utilService.onError(
            err?.error?.message ||
              err?.message ||
              "Unable to check Amazon inventory status.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  /**
   * trackBy function
   */
  trackByFn(index: number, item: any): any {
    return item && item._id ? item._id : index;
  }
}
