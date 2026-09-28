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
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { Router } from "@angular/router";
import * as ExcelJS from "exceljs";
import * as fs from "file-saver";
import {
  Observable,
  Subject,
  debounceTime,
  finalize,
  merge,
  switchMap,
  takeUntil,
  tap,
} from "rxjs";
import { environment } from "environments/environment";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import {
  UploadedFileItem,
  UploadedFilesService,
} from "app/core/uploaded-files/uploaded-files.service";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { InventoryService } from "app/core/inventory/inventory.service";
import { GeneralSettingService } from "app/core/general-setting/general-setting.service";
import { AmazonService } from "app/core/amazon/amazon.service";
import { FuseUtilsService } from "@fuse/services/utils";
import { FileProgressService } from "app/core/file-progress/file-progress.service";

@Component({
  standalone: false,
  selector: "app-uploaded-files",
  templateUrl: "./uploaded-files.component.html",
  styleUrls: ["./uploaded-files.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadedFilesComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;

  isLoading: boolean = false;
  pagination: Pagination;
  uploadedFilesInput$: Observable<UploadedFileItem[] | null>;

  searchInputControl: FormControl = new FormControl("");
  startDate: FormControl = new FormControl("");
  endDate: FormControl = new FormControl("");
  maxDate: Date = new Date();
  isResetDate: boolean = false;

  filterFormGroup: FormGroup;
  pageLimit: number = Constants.pageLimit || 10;
  pageOptions: number[] = Constants.pageOptions || [5, 25, 50, 100];
  tooltip: string = Constants.uploadedFilesDetails;

  sellerInfo: any;
  isSuperAdmin: boolean = false;
  permission: any = {};

  selectedFileHistory: any = null;
  private _historyDialogRef: MatDialogRef<any> | null = null;

  // Import Dialog state & controls
  private _importDialogRef: MatDialogRef<any> | null = null;
  selectedImportFile: File | null = null;
  fileNM: string = "";
  isDisableFlow: boolean = false;

  fulfillmentControl: FormControl = new FormControl("FBM");
  productTypeControl: FormControl = new FormControl("retail");
  amzMarginControl: FormControl = new FormControl(0);
  amzMarginModeControl: FormControl = new FormControl("FIX");
  marketplaceControl: FormControl = new FormControl("ATVPDKIKX0DER");

  sellerSetting: any = null;
  allMarketplaces = Constants.amazonMarketplaces;
  sellerMarketplaces: any[] = Constants.amazonMarketplaces;
  selectedMarketplaceId: string = "ATVPDKIKX0DER";

  isProductType: string = "";
  productTypes: any[] = [];
  singleProductsVars: any = {
    filteredProductTypeList: [],
  };

  disableDownload: boolean = false;
  selectedCategory: string = "retail";
  selectedFileType: string = "csv";
  selectProductType: string = "";
  private _sampleFileDialogRef: MatDialogRef<any> | null = null;

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _uploadedFilesService: UploadedFilesService,
    private _formBuilder: FormBuilder,
    private _navigationService: NavigationService,
    private _localStorageService: LocalStorageService,
    private _router: Router,
    private _matDialog: MatDialog,
    private _inventoryService: InventoryService,
    private _generalSettingService: GeneralSettingService,
    private _amazonService: AmazonService,
    private _utilService: FuseUtilsService,
    private _fileProgressService: FileProgressService,
  ) {
    this.sellerInfo = this._localStorageService.getItem("user");
    this.isSuperAdmin =
      this.sellerInfo?.isSuperAdmin || this.sellerInfo?.isPremisesUser || false;

    this.filterFormGroup = this._formBuilder.group({
      status: [""],
      process_status: [""],
      is_catalog_file: [""],
    });
  }

  permissionGuard: any = {};
  catalogPermission: any = {};
  inventoryPermission: any = {};

  private extractPermission(
    data: any,
    sectionName: string,
    defaultRoute: string,
  ): any {
    if (!data) return {};
    if (Array.isArray(data?.permissions)) {
      const found = data.permissions.find(
        (item: any) =>
          item?.section_name?.trim()?.toLowerCase() ===
          sectionName.toLowerCase(),
      );
      if (found) return found;
    }
    return (
      this._navigationService.getPermissionByRoute(data, defaultRoute) || {}
    );
  }

  private checkPermission(action: string, guardObj?: any): boolean {
    if (this.isSuperAdmin) {
      return true;
    }
    const guard =
      guardObj ||
      (this.permissionGuard && Object.keys(this.permissionGuard).length
        ? this.permissionGuard
        : this.permission);
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
  get canImportCatalog(): boolean {
    const catalogAdd = this.checkPermission("add", this.catalogPermission);
    const catalogUpdate = this.checkPermission(
      "update",
      this.catalogPermission,
    );
    return this.canAdd && this.canUpdate && catalogAdd && catalogUpdate;
  }
  get canImportInventory(): boolean {
    const invAdd = this.checkPermission("add", this.inventoryPermission);
    const invUpdate = this.checkPermission("update", this.inventoryPermission);
    return this.canAdd && this.canUpdate && invAdd && invUpdate;
  }

  ngOnInit(): void {
    this.isSuperAdmin =
      this.sellerInfo?.isSuperAdmin || this.sellerInfo?.isPremisesUser || false;

    this.marketplaceControl.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((marketplaceId) => {
        if (marketplaceId) {
          this.loadAmazonProductTypes(marketplaceId);
        }
      });

    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.permissionGuard = this.extractPermission(
          data,
          "uploaded files",
          "/master/uploaded-files",
        );
        this.permission = this.permissionGuard;
        this.catalogPermission = this.extractPermission(
          data,
          "my catalog",
          "/master/master-catalog",
        );
        this.inventoryPermission = this.extractPermission(
          data,
          "amazon inventory",
          "/master/amazon-inventory",
        );
        this._changeDetectorRef.markForCheck();
      });

    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (
          !this.permissionGuard ||
          !Object.keys(this.permissionGuard).length
        ) {
          this.permissionGuard = this.extractPermission(
            data,
            "uploaded files",
            "/master/uploaded-files",
          );
          this.permission = this.permissionGuard;
          this.catalogPermission = this.extractPermission(
            data,
            "my catalog",
            "/master/master-catalog",
          );
          this.inventoryPermission = this.extractPermission(
            data,
            "amazon inventory",
            "/master/amazon-inventory",
          );
          this._changeDetectorRef.markForCheck();
        }
      });

    this._uploadedFilesService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });

    this.uploadedFilesInput$ = this._uploadedFilesService.uploadedFiles$;

    const activeSellerId = this.getActiveSellerId();
    if (activeSellerId) {
      this._fileProgressService.connect(activeSellerId);
    }
    this._fileProgressService.fileProgress$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((event) => {
        if (event.type === "progress") {
          this._uploadedFilesService.updateFileStatus(event.fileId, {
            process_status: "PROCESSING",
            total_record: event.total,
            processed_records: event.processed,
          });
        } else if (event.type === "completed") {
          this._uploadedFilesService.updateFileStatus(event.fileId, {
            process_status: "COMPLETED",
            total_record: event.total,
            processed_records: event.total,
            total_success: event.totalSuccess,
            total_fail: event.totalFail,
            file_imported: true,
          });
        } else if (event.type === "failed") {
          this._uploadedFilesService.updateFileStatus(event.fileId, {
            process_status: "FAILED",
            error_message: event.error,
          });
        }
        this._changeDetectorRef.markForCheck();
      });

    // Handle search bar input debounce
    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.isLoading = true;
          if (this._paginators?.first) {
            this._paginators.first.pageIndex = 0;
          }
          return this.fetchData(1);
        }),
      )
      .subscribe();

    // Handle filter form dropdown changes
    this.filterFormGroup.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        if (this._paginators?.first) {
          this._paginators.first.pageIndex = 0;
        }
        this.loadData();
      });

    // Initial fetch
    this.loadData();
  }

  ngAfterViewInit(): void {
    this._paginators.changes
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.setupSortAndPagination();
      });
    this.setupSortAndPagination();
  }

  setupSortAndPagination(): void {
    if (this._sort && this._paginators?.first) {
      this._changeDetectorRef.markForCheck();

      this._sort.sortChange
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          if (this._paginators?.first) {
            this._paginators.first.pageIndex = 0;
          }
        });

      merge(this._sort.sortChange, this._paginators.first.page)
        .pipe(
          switchMap(() => {
            const page = (this._paginators?.first?.pageIndex ?? 0) + 1;
            return this.fetchData(page);
          }),
          takeUntil(this._unsubscribeAll),
        )
        .subscribe();
    }
  }

  filterQry: any = {};

  fetchData(page: number = 1): Observable<any> {
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();

    const limit = getPageSize(this._paginators?.first) || this.pageLimit;
    const sortBy = this._sort?.active || "createdAt";
    const sortOrder = this._sort?.direction || "desc";
    const search = (this.searchInputControl.value || "").trim();

    const activeSellerId = this.getActiveSellerId();

    const filterVal = {
      status: this.filterFormGroup.get("status")?.value,
      process_status: this.filterFormGroup.get("process_status")?.value,
      is_catalog_file: this.filterFormGroup.get("is_catalog_file")?.value,
      startDate: this.filterQry["startDate"] || "",
      endDate: this.filterQry["endDate"] || "",
      seller_id: activeSellerId,
    };

    return this._uploadedFilesService
      .getUploadedFiles(page, limit, sortBy, sortOrder, search, filterVal)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        }),
      );
  }

  loadData(): void {
    const page = (this._paginators?.first?.pageIndex ?? 0) + 1;
    this.fetchData(page).subscribe();
  }

  onDateClickFilter(): void {
    if (
      this.startDate.value &&
      this.startDate.value !== "" &&
      this.endDate.value &&
      this.endDate.value !== ""
    ) {
      const tmpStart = new Date(this.startDate.value);
      tmpStart.setDate(tmpStart.getDate());
      const tmpEnd = new Date(this.endDate.value);
      tmpEnd.setDate(tmpEnd.getDate() + 1);
      this.filterQry["startDate"] = new Date(tmpStart);
      this.filterQry["endDate"] = new Date(tmpEnd);
      this.isResetDate = true;
    } else {
      delete this.filterQry["startDate"];
      delete this.filterQry["endDate"];
      this.isResetDate = false;
    }
    if (this._paginators?.first) {
      this._paginators.first.pageIndex = 0;
    }
    this.loadData();
  }

  clearDate(): void {
    this.startDate.setValue("");
    this.endDate.setValue("");
    delete this.filterQry["startDate"];
    delete this.filterQry["endDate"];
    this.isResetDate = false;
    if (this._paginators?.first) {
      this._paginators.first.pageIndex = 0;
    }
    this.loadData();
  }

  refresh(): void {
    this.searchInputControl.setValue("", { emitEvent: false });
    this.filterFormGroup.reset(
      { status: "", process_status: "" },
      { emitEvent: false },
    );
    this.startDate.setValue("");
    this.endDate.setValue("");
    delete this.filterQry["startDate"];
    delete this.filterQry["endDate"];
    this.isResetDate = false;
    if (this._paginators?.first) {
      this._paginators.first.pageIndex = 0;
    }
    this.loadData();
  }

  openHistoryDialog(file: any, templateRef: TemplateRef<any>): void {
    this.selectedFileHistory = file;
    this._changeDetectorRef.markForCheck();
    this._historyDialogRef = this._matDialog.open(templateRef, {
      autoFocus: false,
      hasBackdrop: true,
      panelClass: "fail-history-dialog-panel",
    });
  }

  closeHistoryDialog(): void {
    if (this._historyDialogRef) {
      this._historyDialogRef.close();
      this._historyDialogRef = null;
    }
    this.selectedFileHistory = null;
    this._changeDetectorRef.markForCheck();
  }

  downloadFailHistoryExcel(file: any): void {
    const historyList = file?.history || [];
    if (!historyList || historyList.length === 0) {
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Failed Records");

    worksheet.columns = [
      { header: "#", key: "rowNum", width: 8 },
      { header: "SKU", key: "sku", width: 28 },
      { header: "Error Message", key: "error", width: 75 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E293B" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    historyList.forEach((item: any, index: number) => {
      const row = worksheet.addRow({
        rowNum: index + 1,
        sku: item.sku || "-",
        error: item.error || "-",
      });

      const errorCell = row.getCell("error");
      errorCell.font = { color: { argb: "991B1B" } };
    });

    workbook.xlsx.writeBuffer().then((data) => {
      const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const fileName =
        file.file_name_original || file.file_name || "failed_records";
      const cleanName = fileName.replace(/\.[^/.]+$/, "");
      fs.saveAs(blob, `${cleanName}_fail_history.xlsx`);
    });
  }

  // Catalog Import Dialog
  openCatalogImportPopup(template: TemplateRef<any>): void {
    this.selectedImportFile = null;
    this.fileNM = "";
    this.isDisableFlow = false;
    this._importDialogRef = this._matDialog.open(template, {
      hasBackdrop: true,
      autoFocus: false,
    });
  }

  // Inventory Import Dialog
  openInventoryImportPopup(template: TemplateRef<any>): void {
    this.selectedImportFile = null;
    this.fileNM = "";
    this.isDisableFlow = false;

    const activeSellerId = this.getActiveSellerId();
    if (activeSellerId) {
      this._generalSettingService
        .getSettingBySellerId(activeSellerId)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((res: any) => {
          const setting = res?.data?.[0] || res?.data || res;
          if (setting) {
            this.sellerSetting = setting;
            if (this.sellerSetting?.amz_fullfillment_by) {
              this.fulfillmentControl.setValue(
                this.sellerSetting.amz_fullfillment_by,
              );
            }
            if (this.sellerSetting?.amz_product_type) {
              this.productTypeControl.setValue(
                this.sellerSetting.amz_product_type,
              );
            }
            if (this.sellerSetting?.amz_margin !== undefined) {
              this.amzMarginControl.setValue(this.sellerSetting.amz_margin);
            }
            if (this.sellerSetting?.amz_margin_mode) {
              this.amzMarginModeControl.setValue(
                this.sellerSetting.amz_margin_mode,
              );
            }
          }
          this._changeDetectorRef.markForCheck();
        });
    }

    this._amazonService
      .getMarketplaceBaseOnSeller()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        if (data?.status === 200 && data?.data?.length > 0) {
          const marketplaceList: any[] = [];
          const addedIds = new Set<string>();
          data.data.forEach((store: any) => {
            const storeMarketplaces = this.allMarketplaces.filter((m: any) =>
              (store.marketplace_ids || []).includes(m.id),
            );
            storeMarketplaces.forEach((m: any) => {
              if (!addedIds.has(m.id)) {
                addedIds.add(m.id);
                marketplaceList.push(m);
              }
            });
          });
          this.sellerMarketplaces =
            marketplaceList.length > 0 ? marketplaceList : this.allMarketplaces;
        } else {
          this.sellerMarketplaces = this.allMarketplaces;
        }
        if (
          this.sellerMarketplaces.length > 0 &&
          !this.marketplaceControl.value
        ) {
          this.marketplaceControl.setValue(this.sellerMarketplaces[0].id);
        }
        this.loadAmazonProductTypes(
          this.marketplaceControl.value || this.selectedMarketplaceId,
        );
        this._changeDetectorRef.markForCheck();
      });

    this.isProductType = "";
    this._importDialogRef = this._matDialog.open(template, {
      hasBackdrop: true,
      autoFocus: false,
    });
  }

  closeImportPopup(): void {
    if (this._importDialogRef) {
      this._importDialogRef.close();
      this._importDialogRef = null;
    }
  }

  onFileUpload(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedImportFile = file;
      this.fileNM = file.name;
    } else {
      this.selectedImportFile = null;
      this.fileNM = "";
    }
    this._changeDetectorRef.markForCheck();
  }

  importCatalogFileSubmit(): void {
    if (!this.selectedImportFile) {
      this._utilService.onError("Please select a file to import.");
      return;
    }
    const activeSellerId = this.getActiveSellerId();
    if (!activeSellerId) {
      this._utilService.onError("Seller info missing.");
      return;
    }

    this.isDisableFlow = true;
    this._changeDetectorRef.markForCheck();

    const uploadFormData = new FormData();
    uploadFormData.append("file", this.selectedImportFile);
    uploadFormData.append("seller_id", activeSellerId);

    this._inventoryService
      .saveCatalogDataWithFile(uploadFormData)
      .pipe(
        takeUntil(this._unsubscribeAll),
        finalize(() => {
          this.isDisableFlow = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status === 200 || res?.status === 201) {
            this._utilService.onSuccess(
              res?.message ||
                "File processing has started. Go to Dashboard to track the progress.",
            );
            this.closeImportPopup();
            this.loadData();
          } else {
            this._utilService.onError(
              res?.message || "Failed to import catalog file.",
            );
          }
        },
        error: (err: any) => {
          this._utilService.onError(
            err?.error?.message || "Error importing catalog file.",
          );
        },
      });
  }

  importInventoryFileSubmit(): void {
    if (!this.selectedImportFile) {
      this._utilService.onError("Please select a file to import.");
      return;
    }
    const activeSellerId = this.getActiveSellerId();
    if (!activeSellerId) {
      this._utilService.onError("Seller info missing.");
      return;
    }

    if (this.productTypeControl.value === "white_label") {
      if (!this.isProductType) {
        this._utilService.onError("Please select Amazon Product Type.");
        return;
      }
    }

    const selectedProductType =
      this.productTypeControl.value === "white_label"
        ? this.isProductType
        : this.productTypeControl.value || "retail";

    this.isDisableFlow = true;
    this._changeDetectorRef.markForCheck();

    const uploadFormData = new FormData();
    uploadFormData.append("file", this.selectedImportFile);
    uploadFormData.append(
      "amz_product_type",
      this.productTypeControl.value || "retail",
    );
    uploadFormData.append(
      "amz_margin",
      (this.amzMarginControl.value ?? 0).toString(),
    );
    uploadFormData.append(
      "amz_margin_mode",
      this.amzMarginModeControl.value || "FIX",
    );
    uploadFormData.append("amz_status", this.sellerSetting?.amz_status ?? 1);
    uploadFormData.append(
      "amz_fullfillment_by",
      this.fulfillmentControl.value || "FBM",
    );
    uploadFormData.append("seller_id", activeSellerId);
    uploadFormData.append("product_type", selectedProductType);
    uploadFormData.append(
      "marketplace_id",
      this.marketplaceControl.value ||
        this.selectedMarketplaceId ||
        "ATVPDKIKX0DER",
    );

    this._inventoryService
      .saveDataWithFile(uploadFormData)
      .pipe(
        takeUntil(this._unsubscribeAll),
        finalize(() => {
          this.isDisableFlow = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: (res: any) => {
          if (res?.status === 200 || res?.status === 201) {
            this._utilService.onSuccess(
              res?.message ||
                "File processing has started. Go to Dashboard to track the progress.",
            );
            this.closeImportPopup();
            this.loadData();
          } else {
            this._utilService.onError(
              res?.message || "Failed to import inventory file.",
            );
          }
        },
        error: (err: any) => {
          this._utilService.onError(
            err?.error?.message || "Error importing inventory file.",
          );
        },
      });
  }

  loadAmazonProductTypes(marketplaceId: string): void {
    if (!marketplaceId) return;
    this._amazonService
      .getAllProductTypeBaseOnMarketplace(marketplaceId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (data: any) => {
          if (data?.status === 200 && data?.data) {
            this.productTypes = data.data;
            this.singleProductsVars.filteredProductTypeList = data.data;
            this._changeDetectorRef.markForCheck();
          }
        },
        error: (err) => {
          console.error("Failed to load product types:", err);
        },
      });
  }

  filterProductTypeData(event: any): void {
    if (!this.productTypes) return;
    const value =
      typeof event === "string" ? event : event?.target?.value || "";
    if (value && value !== "") {
      const searchQuery = value.toLowerCase().trim();
      const regexPattern = searchQuery.replace(/\s+/g, ".*");
      const regex = new RegExp(regexPattern, "i");

      this.singleProductsVars.filteredProductTypeList =
        this.productTypes.filter(
          (item: any) =>
            item.productType.toLowerCase().indexOf(searchQuery) > -1 ||
            item.displayName.toLowerCase().indexOf(searchQuery) > -1 ||
            regex.test(item.productType.toLowerCase().replace(/_/g, " ")),
        );
    } else {
      this.singleProductsVars.filteredProductTypeList = this.productTypes;
    }
    this._changeDetectorRef.markForCheck();
  }

  getActiveSellerId(): string {
    const urlSegments = this._router.url.split("/");
    const urlSellerId =
      urlSegments[1] && /^[a-f\d]{24}$/i.test(urlSegments[1])
        ? urlSegments[1]
        : null;

    return (
      urlSellerId ||
      this.sellerInfo?.id ||
      this.sellerInfo?._id ||
      this.sellerInfo?.userId ||
      ""
    );
  }

  OpenSampleFilePopup(template: TemplateRef<any>): void {
    this.singleProductsVars.filteredProductTypeList = this.productTypes;
    this.selectedCategory =
      this.productTypeControl.value === "white_label" ? "whitelabel" : "retail";
    this.selectedFileType = "csv";
    this.selectProductType = this.isProductType || "";

    this._sampleFileDialogRef = this._matDialog.open(template, {
      hasBackdrop: true,
    });
  }

  closeSampleFileDialog(): void {
    if (this._sampleFileDialogRef) {
      this._sampleFileDialogRef.close();
      this._sampleFileDialogRef = null;
    }
  }

  async downloadFile(): Promise<any> {
    this.disableDownload = true;
    this._changeDetectorRef.markForCheck();

    try {
      let filePath: string | null = null;

      if (this.selectedCategory === "retail") {
        filePath = `assets/sample-file/retail-product.${
          this.selectedFileType === "csv" ? "csv" : "xlsx"
        }`;
      } else if (
        this.selectedCategory === "whitelabel" &&
        this.selectProductType
      ) {
        const marketplaceId =
          this.marketplaceControl.value ||
          this.selectedMarketplaceId ||
          "ATVPDKIKX0DER";

        await this._amazonService
          .retrieveTemplateFileBaseOnProductType(
            this.selectProductType,
            marketplaceId,
          )
          .pipe(
            takeUntil(this._unsubscribeAll),
            tap((response: any) => {
              if (response?.data) {
                this.downloadFileFromUrl(response.data);
                this.closeSampleFileDialog();
              } else {
                this._utilService.onError(
                  "Error: File URL not found in response.",
                );
              }
            }),
          )
          .toPromise();
        return;
      } else {
        if (this.selectedCategory === "whitelabel" && !this.selectProductType) {
          this._utilService.onError("Please select Amazon Product Type.");
        }
        return;
      }

      if (filePath) {
        this.triggerFileDownload(filePath);
        this.closeSampleFileDialog();
      }
    } catch (err: any) {
      this._utilService.onError(
        err?.error?.message || "Error while downloading file.",
      );
    } finally {
      this.disableDownload = false;
      this._changeDetectorRef.markForCheck();
    }
  }

  async downloadSampleInventoryFile(): Promise<any> {
    const isWhiteLabel = this.productTypeControl.value === "white_label";

    if (isWhiteLabel) {
      const prodType = this.isProductType || this.selectProductType;
      if (!prodType) {
        this._utilService.onError(
          "Please select Amazon Product Type to download White Label sample file.",
        );
        return;
      }

      const marketplaceId =
        this.marketplaceControl.value ||
        this.selectedMarketplaceId ||
        "ATVPDKIKX0DER";

      this.disableDownload = true;
      this._changeDetectorRef.markForCheck();

      try {
        await this._amazonService
          .retrieveTemplateFileBaseOnProductType(prodType, marketplaceId)
          .pipe(
            takeUntil(this._unsubscribeAll),
            tap((response: any) => {
              if (response?.data) {
                this.downloadFileFromUrl(response.data);
              } else {
                this._utilService.onError(
                  "File template not found for the selected Product Type.",
                );
              }
            }),
          )
          .toPromise();
      } catch (err: any) {
        this._utilService.onError(
          err?.error?.message || "Error fetching template file.",
        );
      } finally {
        this.disableDownload = false;
        this._changeDetectorRef.markForCheck();
      }
    } else {
      // Retail category - use exact same Retail sample file as Amazon Inventory section
      const fileType = this.selectedFileType || "xlsx";
      const filePath = `assets/sample-file/retail-product.${fileType === "csv" ? "csv" : "xlsx"}`;
      this.triggerFileDownload(filePath);
    }
  }

  private downloadFileFromUrl(fileUrl: string): void {
    const link = document.createElement("a");
    link.href = `${environment.uploadPath}product-listing-templates/${fileUrl}`;
    const prodType = this.selectProductType || this.isProductType || "";
    link.download = prodType + (fileUrl.split("/").pop() || "download.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private triggerFileDownload(filePath: string): void {
    const link = document.createElement("a");
    link.href = filePath;
    link.download = filePath.split("/").pop() || "default-filename";
    link.click();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
