import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from "@angular/core";
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MatSelectChange } from "@angular/material/select";
import { ActivatedRoute } from "@angular/router";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { FuseUtilsService } from "@fuse/services/utils";
import { AmazonService } from "app/core/amazon/amazon.service";
import { GeneralSettingService } from "app/core/general-setting/general-setting.service";
import { InventoryService } from "app/core/inventory/inventory.service";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { Constants } from "app/shared/constants";
import { COMMA, ENTER } from "@angular/cdk/keycodes";
import { Location } from "@angular/common";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { Subject } from "rxjs";
import {
  debounceTime,
  distinctUntilChanged,
  finalize,
  takeUntil,
} from "rxjs/operators";
import { ProductTypeRecommendationService } from "app/core/recommendation/product-type-recommendation.service";
import { CatalogMasterService } from "app/core/inventory/catalog-master.service";
import { ProductTypeGroup } from "app/core/recommendation/product-type-recommendation.types";

type singleProductsVarsType = {
  selectProductType: string;
  filteredProductTypeList: any;
  productTypes: string;
};

type WhiteLabelVersionItem = {
  version_no: number;
  sha256: string;
  original_size: number;
  stored_size: number;
  is_head: boolean;
  created_at: string;
  head_version_no?: number;
  same_content_as_head?: boolean;
  storage_mode?: "full" | "delta";
  patch_stored_size?: number | null;
  head_stored_size?: number | null;
};

type WhiteLabelVersionFieldChange = {
  path: string;
  label: string;
  type: "added" | "removed" | "modified";
  baseline: string | null;
  version: string | null;
};

type WhiteLabelVersionDiff = {
  version_no: number;
  against: "head" | "original" | "previous";
  against_version_no: number | null;
  identical: boolean;
  summary: { added: number; removed: number; modified: number };
  highlights: WhiteLabelVersionFieldChange[];
  changes: WhiteLabelVersionFieldChange[];
  truncated: boolean;
  hint?: string;
};

@Component({
  standalone: false,
  selector: "app-manage-product",
  templateUrl: "./manage-product.component.html",
  styleUrls: ["./manage-product.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageProductComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  _matDialogRef: MatDialogRef<any>;
  readonly updateTabCount = 3;
  versionHistoryLoaded = false;
  whiteLabelVersions: WhiteLabelVersionItem[] = [];
  updateAttrVersions: WhiteLabelVersionItem[] = [];
  versionsLoading = false;
  versionDiffLoading = false;
  versionDiff: WhiteLabelVersionDiff | null = null;
  versionDiffKind: "amz_white_label" | "amz_wl_update_attrs" =
    "amz_white_label";
  versionDiffAgainst: "head" | "original" | "previous" = "head";
  selectedVersionNo: number | null = null;
  isVersionTableCollapsed = false;
  productData: any;
  pageId: string | null = null;
  userId: string | null = null;
  hasVariations: boolean = false;
  product_type: string | null = null;
  pageQueries: Record<string, string> = {};
  marketplace_id: string | null = null;
  selectProductType: string | null = null;
  renderForm: "addProductTemplate" | "editForm" = "addProductTemplate";
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  isRouteImpornated: boolean = false;

  // Form groups and controls
  updatedEnums: string[];
  productForm: FormGroup;
  temporaryFG: FormGroup;
  variationForm: FormGroup;
  formGroupTabOne: FormGroup;
  formGroupTabTwo: FormGroup;
  variationControls: FormGroup;
  updateStatusConfirm: FormGroup;
  inventoryFormGroupWL: FormGroup;
  isGtinExemptionApproved: boolean = false;
  isHasVarients = new FormControl<boolean>(false);
  selectSearchProducType: FormControl<string> = new FormControl<string>("");
  selectedVariations: { [key: string]: string[] } = {}; // Store  variation
  isShowVarientsControl: boolean = true;

  // Common component variables
  userInfo: Record<string, Record<string, string | number> | number | string>;
  currentSelectedMarketplaceShippingCharge: number = 0;
  highlightAttributeKey: string[] = [];
  selectedMarketplaceId: string;
  marketplaceData: any;
  productTypeList: any;
  isAsinList: boolean;
  masterCatalog = {};
  sellerSetting: any;
  asinList: any;

  // form stats and error messages
  disableThird = true;
  disableSecondTab = true;
  isFirstTabDisable = false;
  isLoader: boolean = false;
  btnDisable: boolean = true;
  isLoading: boolean = false;
  warningMessage: string = "";
  browserNodes: string[] = [];
  AiAttemptsEnable: boolean = false;
  disableSubmitButton: boolean = false;
  isSubmittingListing = false;
  skuData: Record<string, string | number | string[]> = {};
  requiredFormFields: Record<string, Record<string, any>> = {};
  nonRequiredFormFields: Record<string, Record<string, any>> = {};

  //
  productTypes: any;
  totalTabs: number = 2;
  isDisplayNote: boolean;
  inventoryId: string = "";
  isArray = Array.isArray;
  objectKeys = Object.keys;
  objectValues = Object.values;
  objectEntries = Object.entries;
  selectedTabIndex: number = 0;
  selectedProductId: string = "";
  selectedUpadteTabIndex: number = 1;
  selectedFileType: string = "csv";
  disableDownload: boolean = false;
  selectedInventoryStatus: number = 0;
  selectedCategory: string = "retail"; // Default category
  missingAttributesSet: Set<string> = new Set<string>(); //for missing attrinbutes
  singleProductsVars: singleProductsVarsType = {
    selectProductType: "",
    filteredProductTypeList: "",
    productTypes: "",
  };

  // Constants
  allMarketplaces = Constants.amazonMarketplaces;

  // grid variables and utils
  variantFormGroups: FormArray; // Separate FormArray for managing input fields
  variantUpdateFormGroups: FormArray;
  varientsFormFields: Record<string, any> = {};
  varientsValus: Array<Record<string, string>> = [];
  existingVarientsValus: Array<Record<string, string | number>> = [];
  imageCache: { [key: string]: string } = {};
  private removedExternalControls: { [key: string]: any } = {};

  // SKU Product Type Recommendation properties
  groupedProductTypeList: ProductTypeGroup[] = [];
  filteredGroupedProductTypeList: ProductTypeGroup[] = [];
  isLoadingRecommendations: boolean = false;

  // Browse Node AI Recommendation properties
  isLoadingBrowseNodes: boolean = false;
  aiRecommendedBrowseNodes: { id: string; name: string; score?: number }[] = [];

  private _destroy$ = new Subject<void>();

  constructor(
    private _generalSettingService: GeneralSettingService,
    private _confirmationService: FuseConfirmationService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _inventoryService: InventoryService,
    private _localService: LocalStorageService,
    private _utilService: FuseUtilsService,
    private _amazonService: AmazonService,
    private _activeRoute: ActivatedRoute,
    private _location: Location,
    private fb: FormBuilder,
    private _userSessionService: UserSessionsService,
    private _matDialog: MatDialog,
    private _recommendationService: ProductTypeRecommendationService,
    private _catalogMasterService: CatalogMasterService,
  ) {
    // Initialize form group
    this.productForm = new FormGroup({
      singleFulfillment: new FormControl(""),
      singleProductType: new FormControl(""),
      fulfillment: new FormControl(""),
      amzMarginMode: new FormControl("FIX"),
      amzMargin: new FormControl(0),
      productType: new FormControl(""),
      productId: new FormControl(""),
    });

    this.variationForm = this.fb.group({});
    this.variationControls = new FormGroup({});
    this.variantFormGroups = this.fb.array([]);
  }

  ngOnInit(): void {
    // // Get the ID from the route
    this._activeRoute.paramMap.subscribe((params: any): void => {
      this.pageId = params.get("id");
      this.versionHistoryLoaded = false;
      this.isSubmittingListing = false;
      this.whiteLabelVersions = [];
      this.updateAttrVersions = [];
      this.clearVersionDiff();

      this.isShowVarientsControl = this.pageQueries["varient"] ? false : true;
      if (this.pageId) {
        this.isLoading = true;
        this._inventoryService
          .getWhiteLabelByIdForUpdate(
            this.pageId,
            this.pageQueries["varient"] ? this.pageQueries["varient"] : null,
          )
          .subscribe(
            (data: Record<string, any>): void => {
              const payload = data?.data || {};
              this.productData = payload;
              const {
                product_type,
                marketplace_id,
                issues,
                amazon_script_status,
                sku,
                varients,
                varientType,
              } = {
                ...payload,
                ...data,
              };

              this.product_type = product_type;
              this.marketplace_id = marketplace_id;
              if (marketplace_id) {
                this.selectedMarketplaceId = marketplace_id;
              }
              if (this.productData.brand___value === "GENERIC") {
                this.isDisplayNote = true;
              }
              this.selectProductType = product_type;
              const safeVarientType =
                varientType &&
                String(varientType) !== "undefined" &&
                String(varientType) !== "null"
                  ? String(varientType)
                  : null;
              const safeVarients = Array.isArray(varients)
                ? varients.filter((v) => v && v.status !== 2)
                : [];

              // Show variation UI when product already has variants
              if (safeVarients.length > 0 || safeVarientType) {
                this.isHasVarients.setValue(true);
              }

              this.variantUpdateFormGroups = this.fb.array([]);
              this.onUpdateForm(payload, safeVarientType, safeVarients);
              if (safeVarients.length > 0 && safeVarientType) {
                this.existingVarientsValus = safeVarients.map(
                  (row: Record<string, string | number>) => {
                    // Remove the specified keys from each row
                    const {
                      sku,
                      externally_assigned_product_identifier___value,
                      externally_assigned_product_identifier___type,
                      condition_type___value,
                      purchasable_offer___our_price___schedule___value_with_tax,
                      fulfillment_availability___quantity,
                      main_product_image_locator___media_location,
                      ...filteredRow
                    } = row;
                    Object.keys(filteredRow).forEach((items) => {
                      if (items !== items.toUpperCase()) {
                        delete filteredRow[items];
                      }
                    });
                    return filteredRow as Record<string, string | number>;
                  },
                );
              }

              this.renderForm = "editForm";
              if (Array.isArray(issues)) {
                this.onUpdatePopupOpen(issues);
              }
              if (amazon_script_status || amazon_script_status === 0) {
                this.selectedInventoryStatus = amazon_script_status || 0;
              }
              if (sku && sku.toString().trim().length > 0) {
                this.productForm.get("productId").setValue(sku);
              }
              this._changeDetectorRef.markForCheck();
            },
            ({ error }) => {
              this.isLoading = false;
              this._utilService.onError(
                error?.message || error?.error?.message || "No Product Found",
              );
            },
          );
      }
    });

    this._userSessionService.currentSellerId$.subscribe((data) => {
      this.isRouteImpornated = !!data;
      this.userInfo = this._userSessionService.getCurrentUser();
    });
    this._activeRoute.queryParamMap.subscribe((params) => {
      this.pageQueries["sku"] = params.get("sku");
      this.pageQueries["product_id"] = params.get("product_id");
      this.pageQueries["varient"] = params.get("varient");

      if (
        this.pageQueries["sku"] &&
        this.pageQueries["sku"].trim() !== "undefined" &&
        Boolean(this.pageQueries["sku"].trim())
      ) {
        this.getProductDetailsById(this.pageQueries["sku"]);
      }

      if (
        this.pageQueries["product_id"] &&
        this.pageQueries["product_id"].trim() !== "undefined" &&
        Boolean(this.pageQueries["product_id"].trim())
      ) {
        this.selectedProductId = this.pageQueries["product_id"];
      }

      if (
        this.pageQueries["varient"] &&
        this.pageQueries["varient"].trim() !== "undefined" &&
        Boolean(this.pageQueries["varient"].trim())
      ) {
        this.isShowVarientsControl = this.pageQueries["varient"] ? false : true;
        this.isFirstTabDisable = true;
      }
      //product_id
    });

    this.formGroupTabOne = this.fb.group({});
    this.formGroupTabTwo = this.fb.group({});
    // this.getAllProductTypeList();
    this.getSettingBySeller();
    this.inventoryFormGroupWL = new FormGroup({
      product_id: new FormControl("", [
        Validators.required,
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{10}$/),
      ]),
      price: new FormControl(0, [Validators.required, Validators.min(1)]),
      stock: new FormControl(0, [Validators.required, Validators.min(0)]),
      amz_fullfillment_by: this.sellerSetting?.amz_fullfillment_by || "",
      amz_product_type: this.sellerSetting?.amz_product_type || "",
      sku: new FormControl(this.pageQueries["sku"] ?? ""),
    });

    // SKU-based Product Type Recommendation reactive debounce listener
    this.inventoryFormGroupWL
      .get("sku")
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this._destroy$),
      )
      .subscribe((skuVal: string) => {
        if (skuVal && skuVal.trim()) {
          this.fetchRecommendationsForSku(skuVal, this.selectedMarketplaceId);
        } else {
          this.resetGroupedProductTypes();
        }
      });

    this.updateStatusConfirm = this._utilService.confirmMessage(
      "Confirmation",
      "Are you sure you want to enable/disable product?",
      "Yes",
    );
    this._amazonService.selectedMarketplaceId$.subscribe((id: string): void => {
      this.selectedMarketplaceId = id;
      this.getMarketplaceById(this.selectedMarketplaceId);
      this.onMarketplaceSelect(this.selectedMarketplaceId);
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
    this.renderForm = "addProductTemplate";
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
      .subscribe({
        next: (data: any) => {
          if (data.status === 200) {
            if (data.data) {
              this.productTypes = data.data;
              this.singleProductsVars.filteredProductTypeList = data.data;
              this.resetGroupedProductTypes();
              this._changeDetectorRef.detectChanges();
            }
          }
        },
        error: ({ error }) => {
          console.error("Failed to load product types:", error);
        },
      });
  }

  getMarketplaceById(marketplaceId: string): any {
    this.marketplaceData =
      this.allMarketplaces.find((m) => m.id === marketplaceId) || {};
    return this.marketplaceData;
  }

  getSettingBySeller(): void {
    this._generalSettingService
      .getSettingBySellerId(String(this.userInfo.id))
      .subscribe((data: any) => {
        if (data.status === 200 && data.data.length > 0) {
          this.sellerSetting = data.data[0];
          this.productForm.patchValue({
            fulfillment: this.sellerSetting.amz_fullfillment_by,
            singleFulfillment: this.sellerSetting.amz_fullfillment_by,
            productType: this.sellerSetting.amz_product_type,
            singleProductType: this.sellerSetting.amz_product_type,
            amzMargin: this.sellerSetting.amz_margin,
            amzMarginMode: this.sellerSetting.amz_margin_mode,
          });

          const currentSelectedMarketplace =
            this.sellerSetting?.marketplaces?.find(
              (marketplace: any) =>
                marketplace.marketplace_name === this.selectedMarketplaceId,
            );
          this._changeDetectorRef.markForCheck();
          if (currentSelectedMarketplace) {
            this.currentSelectedMarketplaceShippingCharge =
              currentSelectedMarketplace.shipping_rate;
          }
        }
      });
  }

  onGtinExamptionChange(event: { [key: string]: any; checked: boolean }): any {
    this.isGtinExemptionApproved = event.checked;

    if (this.isGtinExemptionApproved) {
      const brandControl = this.formGroupTabOne.get("brand___value");

      if (brandControl) {
        brandControl.disable(); // Disable the control
        brandControl.setValue("GENERIC");

        // Store and remove external controls
        [
          "externally_assigned_product_identifier___type",
          "externally_assigned_product_identifier___value",
        ].forEach((key) => {
          if (this.formGroupTabOne.get(key)) {
            this.removedExternalControls[key] = this.formGroupTabOne.get(key);
            this.formGroupTabOne.removeControl(key);
          }
          if (this.formGroupTabTwo.get(key)) {
            this.formGroupTabTwo.removeControl(key);
          }
        });
      }
    } else {
      // Restore external controls
      Object.keys(this.removedExternalControls).forEach((key) => {
        this.formGroupTabOne.addControl(key, this.removedExternalControls[key]);
      });
      this.removedExternalControls = {}; // Clear storage after restoration

      const brandControl = this.formGroupTabOne.get("brand___value");
      if (brandControl) {
        brandControl.setValue(""); // Reset value
        brandControl.enable(); // Enable the control
      }
    }
  }

  async onBlurSKUEvent(marketplaceId: string): Promise<void> {
    this.warningMessage = "";
    this.inventoryFormGroupWL.get("price")?.reset();
    this.inventoryFormGroupWL.get("stock")?.reset();
    this.inventoryFormGroupWL.get("product_id")?.reset();
    const sku = this.inventoryFormGroupWL.get("sku")?.value || "";
    this.isLoader = true;

    if (sku && sku.trim()) {
      this.fetchRecommendationsForSku(sku, marketplaceId);
    }

    if (this.productForm?.get("singleProductType")?.value !== "retail") {
      this.getProductDetailsById(sku);
    } else {
      this.getPriceAndStockById(sku, marketplaceId);
    }
  }

  async getPriceAndStockById(
    id: string = "",
    marketplaceId: string,
  ): Promise<any> {
    id = id.trim();
    if (id === "") {
      this.isLoader = false;
      return;
    }
    return await this._inventoryService
      .getPiceAndStockBySku(id, marketplaceId)
      .subscribe(
        (data: any) => {
          if (data) {
            this.isLoader = false;
            if (data.status === 200) {
              const { master_price, master_stock, asin, asinList } = data.data;
              this.masterCatalog = data.data || {};
              this.inventoryFormGroupWL.get("price")?.setValue(master_price);
              this.inventoryFormGroupWL.get("stock")?.setValue(master_stock);
              if (asinList && asinList.length > 0) {
                this.asinList = asinList;
                this.isAsinList = true;
                this.inventoryFormGroupWL
                  .get("product_id")
                  ?.setValue(this.asinList[0].asin);
              } else {
                this.isAsinList = false;
                this.inventoryFormGroupWL.get("product_id")?.setValue(asin);
              }
            } else {
            }
          }
          this._changeDetectorRef.markForCheck();
        },
        ({ error }) => {
          this.isLoader = false;
          if (error.status === 400) {
            this.warningMessage = error.message;
          }
          this._utilService.onError(
            error.message || "Error Occuring while the submition ",
          );
          console.error("Error fetching template:", error);
        },
      );
  }

  async getProductDetailsById(id: string = ""): Promise<any> {
    if (id) {
      id = id.toString().trim();
    }
    if (id === "") {
      this.isLoader = false;
      return;
    }

    return await this._inventoryService
      .getProductDetailsBySku(id, this.selectedMarketplaceId)
      .subscribe(
        (data: any) => {
          if (data) {
            if (data.status === 200) {
              this.isLoader = false;
              this.skuData = data.data;
              if (this.skuData?.asin) {
                this._commonConfirmationDialog(
                  {
                    title: `The ASIN Found For SKU ${id}`,
                    message: `The SKU you entered (${id}) already have ASIN .
                                 Would you like to add this product to your retail listings? If yes, it will be available for sale under your retail catalog.
                                Please confirm your action.`,
                    confirmText: "yes",
                  },
                  () => {
                    this.navigateThePopupToRetails({
                      product_id: `${this.skuData?.asin || ""}`,
                      price: Number(this.skuData.master_price) || 1,
                      stock: Number(this.skuData.master_stock) || 0,
                    });
                  },
                );
              }
            }
          }
          this._changeDetectorRef.markForCheck();
        },
        ({ error }) => {
          this.isLoader = false;
          if (error.status === 400) {
            this.warningMessage = error.message;
          }
          this._utilService.onError(
            error.message || "Error Occuring while the submition ",
          );
        },
      );
  }

  //for auto select retails and navigate back to retails popup
  navigateThePopupToRetails(
    payload: { product_id?: string; price?: number; stock?: number } = {},
  ): void {
    this.productForm?.get("singleProductType")?.setValue("retail");
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
    dialogRef.afterClosed().subscribe((result) => {
      if (result === "confirmed") {
        func();
      } else {
        this._changeDetectorRef.markForCheck();
      }
    });
  }

  stopScrollingWheel(e: Event): void {
    (e.target as HTMLElement).blur();
  }

  /**
   * SKU-based Product Type Recommendation Flow
   * Step 1 - Lookup SKU against tbl_catalog_masters to get product title
   * Step 2 & 3 - Call /recommend API with product title & active marketplace_id
   * Step 4 & 5 - Build grouped Product Types (Recommendation / Other)
   */
  fetchRecommendationsForSku(sku: string, marketplaceId: string): void {
    if (!sku || !sku.trim() || !marketplaceId) {
      this.resetGroupedProductTypes();
      return;
    }

    const cleanSku = sku.trim();
    this.isLoadingRecommendations = true;
    this._changeDetectorRef.markForCheck();

    // Step 1: SKU lookup against tbl_catalog_masters via CatalogMasterService
    this._catalogMasterService
      .getProductBySku(cleanSku, marketplaceId)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (catalogProduct: any) => {
          const productTitle =
            catalogProduct?.title ||
            catalogProduct?.item_name ||
            catalogProduct?.master_title;

          if (!productTitle) {
            // If SKU not found or no title, fallback to full list under Other group
            this.isLoadingRecommendations = false;
            this.resetGroupedProductTypes();
            this._changeDetectorRef.markForCheck();
            return;
          }

          // Step 2 & 3: Call recommendation API & parse response
          this._recommendationService
            .getRecommendations(productTitle, marketplaceId)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
              next: (recommendations) => {
                this.isLoadingRecommendations = false;
                // Step 4: Build grouped Product Type dropdown (Recommendation / Other)
                this.groupedProductTypeList =
                  this._recommendationService.getGroupedProductTypes(
                    this.productTypes || [],
                    recommendations || [],
                  );
                this.filterProductTypeDataForSingleProducts(
                  this.selectSearchProducType?.value || "",
                );
                this._changeDetectorRef.markForCheck();
              },
              error: (err) => {
                console.error("Product Type Recommendation API error:", err);
                this.isLoadingRecommendations = false;
                this.resetGroupedProductTypes();
                this._changeDetectorRef.markForCheck();
              },
            });
        },
        error: () => {
          this.isLoadingRecommendations = false;
          this.resetGroupedProductTypes();
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  /**
   * Reset Product Type dropdown to single 'Other' group with full master list
   */
  resetGroupedProductTypes(): void {
    this.groupedProductTypeList =
      this._recommendationService.getGroupedProductTypes(
        this.productTypes || [],
        [],
      );
    this.filterProductTypeDataForSingleProducts(
      this.selectSearchProducType?.value || "",
    );
    this._changeDetectorRef.markForCheck();
  }

  filterProductTypeDataForSingleProducts(event: any): void {
    const searchQuery =
      typeof event === "string" ? event : event?.target?.value || "";
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredGroupedProductTypeList = this.groupedProductTypeList;
      if (this.productTypes) {
        this.singleProductsVars.filteredProductTypeList = this.productTypes;
      }
      this._changeDetectorRef.markForCheck();
      return;
    }

    const regexPattern = query.replace(/\s+/g, ".*");
    const regex = new RegExp(regexPattern, "i");

    // Filter options inside each group (Recommendation & Other)
    this.filteredGroupedProductTypeList = (this.groupedProductTypeList || [])
      .map((group) => {
        const filteredOptions = (group.productTypes || []).filter((item) => {
          const val = (item.value || "").toLowerCase();
          const viewVal = (item.viewValue || "").toLowerCase();
          const normVal = val.replace(/_/g, " ");
          return (
            viewVal.includes(query) ||
            val.includes(query) ||
            regex.test(normVal)
          );
        });
        return {
          ...group,
          productTypes: filteredOptions,
        };
      })
      .filter((group) => group.productTypes && group.productTypes.length > 0);

    if (this.productTypes) {
      this.singleProductsVars.filteredProductTypeList =
        this.productTypes.filter((item: { [key: string]: any }) => {
          const pType = (
            item.productType ||
            item.product_type ||
            ""
          ).toLowerCase();
          const dName = (
            item.displayName ||
            item.display_name ||
            ""
          ).toLowerCase();
          return (
            pType.indexOf(query) > -1 ||
            dName.indexOf(query) > -1 ||
            regex.test(pType.replace(/_/g, " "))
          );
        });
    }
    this._changeDetectorRef.markForCheck();
  }

  /**
   * AI-based Browse Node Recommendation Flow triggered by "Find with AI" button
   */
  fetchAiBrowseNodes(): void {
    const title =
      this.formGroupTabOne?.get("item_name___value")?.value ||
      this.formGroupTabOne?.get("item_name")?.value ||
      this.productForm?.get("title")?.value ||
      "";

    const sku = this.inventoryFormGroupWL?.get("sku")?.value || "";

    if (!this.selectedMarketplaceId) {
      this._utilService.onError("Please select a marketplace first");
      return;
    }

    this.isLoadingBrowseNodes = true;
    this._changeDetectorRef.markForCheck();

    const executeAiFetch = (productTitle: string) => {
      if (!productTitle || !productTitle.trim()) {
        this.isLoadingBrowseNodes = false;
        this._utilService.onError(
          "Please enter item name or SKU first to get AI browse node recommendations.",
        );
        this._changeDetectorRef.markForCheck();
        return;
      }

      this._recommendationService
        .getRecommendationsFull(productTitle, this.selectedMarketplaceId)
        .pipe(takeUntil(this._destroy$))
        .subscribe({
          next: (res) => {
            this.isLoadingBrowseNodes = false;
            const nodes = res?.browser_nodes || [];
            if (nodes.length > 0) {
              this.applyAiBrowseNodes(nodes);
              this._utilService.onSuccess(
                `Found ${nodes.length} AI recommended browse nodes!`,
              );
            } else {
              this._utilService.onError(
                "No AI browse node recommendations found for this product.",
              );
            }
            this._changeDetectorRef.markForCheck();
          },
          error: (err) => {
            console.error("Browse Node AI recommendation error:", err);
            this.isLoadingBrowseNodes = false;
            this._utilService.onError(
              "Failed to fetch AI browse node recommendations.",
            );
            this._changeDetectorRef.markForCheck();
          },
        });
    };

    if (title && title.trim()) {
      executeAiFetch(title);
    } else if (sku && sku.trim()) {
      this._catalogMasterService
        .getProductBySku(sku.trim(), this.selectedMarketplaceId)
        .pipe(takeUntil(this._destroy$))
        .subscribe({
          next: (catalogProduct: any) => {
            const productTitle =
              catalogProduct?.title ||
              catalogProduct?.item_name ||
              catalogProduct?.master_title ||
              sku;
            executeAiFetch(productTitle);
          },
          error: () => {
            executeAiFetch(sku);
          },
        });
    } else {
      this.isLoadingBrowseNodes = false;
      this._utilService.onError(
        "Please enter item name or SKU to get AI browse node recommendations.",
      );
      this._changeDetectorRef.markForCheck();
    }
  }

  /**
   * Apply AI recommended browse nodes to the required form fields
   */
  applyAiBrowseNodes(nodes: any[]): void {
    if (!nodes || nodes.length === 0) return;

    this.aiRecommendedBrowseNodes = nodes
      .map((n) => ({
        id: String(n.id || n.browse_node_id || ""),
        name: String(n.name || n.browse_node_name || ""),
        score: n.score,
      }))
      .filter((n) => n.id && n.name);

    const fieldKey = "recommended_browse_nodes___value";
    if (this.requiredFormFields && this.requiredFormFields[fieldKey]) {
      const existingEnum: string[] =
        this.requiredFormFields[fieldKey].enum || [];
      const existingEnumNames: string[] =
        this.requiredFormFields[fieldKey].enumNames || [];

      const newEnum = [...existingEnum];
      const newEnumNames = [...existingEnumNames];

      for (const aiNode of this.aiRecommendedBrowseNodes) {
        const idx = newEnum.indexOf(aiNode.id);
        const aiLabel = `✨ ${aiNode.name}`;
        if (idx === -1) {
          // Prepend new AI node
          newEnum.unshift(aiNode.id);
          newEnumNames.unshift(aiLabel);
        } else {
          // Update existing node label with AI star
          newEnumNames[idx] = aiLabel;
        }
      }

      this.requiredFormFields[fieldKey].enum = newEnum;
      this.requiredFormFields[fieldKey].enumNames = newEnumNames;
      this.requiredFormFields[fieldKey]._originalEnum = [...newEnum];
      this.requiredFormFields[fieldKey]._originalEnumNames = [...newEnumNames];
      this.browserNodes = newEnumNames;

      // Auto select top AI recommendation if field value is empty
      if (this.aiRecommendedBrowseNodes.length > 0) {
        const topNodeId = String(this.aiRecommendedBrowseNodes[0].id);
        const ctrl = this.formGroupTabOne.get(fieldKey);
        if (ctrl && (!ctrl.value || ctrl.value === "")) {
          ctrl.setValue(topNodeId);
          ctrl.markAsDirty();
        }
      }
    }
    this._changeDetectorRef.markForCheck();
  }

  //for auto select retails and navigate back to retails popup
  createNewListing(): void {
    this.productForm?.get("singleProductType")?.setValue("white_label");
    const sku = this.inventoryFormGroupWL.get("sku")?.value || "";
    this.getProductDetailsById(sku);
    this._changeDetectorRef.detectChanges();
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

  onBrowserNodeSearch(event: string): void {
    this.browserNodeSearch = event;
  }

  filterFieldOptions(key: string, query: string, isRequired: boolean): void {
    if (key === "recommended_browse_nodes___value") {
      this.onBrowserNodeSearch(query);
      return;
    }

    const targetMap = isRequired
      ? this.requiredFormFields
      : this.nonRequiredFormFields;
    if (!targetMap || !targetMap[key]) return;

    const field = targetMap[key];
    if (
      !field._originalEnum ||
      field._originalEnum.length < (field.enum || []).length
    ) {
      field._originalEnum = [...(field.enum || [])];
      field._originalEnumNames = [...(field.enumNames || [])];
    }

    const q = (query || "").toLowerCase().trim();
    if (!q) {
      field.enum = [...field._originalEnum];
      field.enumNames = [...field._originalEnumNames];
    } else {
      const filteredEnum: any[] = [];
      const filteredEnumNames: string[] = [];

      field._originalEnumNames.forEach((name: string, idx: number) => {
        const val = field._originalEnum[idx];
        const matchName = name ? String(name).toLowerCase().includes(q) : false;
        const matchVal = val ? String(val).toLowerCase().includes(q) : false;

        if (matchName || matchVal) {
          filteredEnum.push(val);
          filteredEnumNames.push(name || String(val));
        }
      });

      field.enum = filteredEnum;
      field.enumNames = filteredEnumNames;
    }
  }

  filterVariantFieldOptions(controlKey: string, query: string): void {
    if (!this.varientsFormFields?.["controls"]?.[controlKey]) return;
    const ctrl = this.varientsFormFields["controls"][controlKey];
    if (!ctrl._originalEnum) {
      ctrl._originalEnum = [...(ctrl.enum || [])];
      ctrl._originalEnumNames = [...(ctrl.enumNames || [])];
    }
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      ctrl.enum = [...ctrl._originalEnum];
      ctrl.enumNames = [...ctrl._originalEnumNames];
    } else {
      const filteredEnum: any[] = [];
      const filteredEnumNames: string[] = [];
      ctrl._originalEnumNames.forEach((name: string, idx: number) => {
        const val = ctrl._originalEnum[idx];
        if (
          (name && String(name).toLowerCase().includes(q)) ||
          (val && String(val).toLowerCase().includes(q))
        ) {
          filteredEnum.push(val);
          filteredEnumNames.push(name || String(val));
        }
      });
      ctrl.enum = filteredEnum;
      ctrl.enumNames = filteredEnumNames;
    }
  }

  fieldSearchControls: { [key: string]: FormControl } = {};
  variantSearchControls: { [key: string]: FormControl } = {};

  getFieldSearchControl(key: string, isRequired: boolean = true): FormControl {
    if (!this.fieldSearchControls[key]) {
      const ctrl = new FormControl("");
      ctrl.valueChanges.pipe(takeUntil(this._destroy$)).subscribe((val) => {
        this.filterFieldOptions(key, val, isRequired);
      });
      this.fieldSearchControls[key] = ctrl;
    }
    return this.fieldSearchControls[key];
  }

  getVariantSearchControl(controlKey: string): FormControl {
    if (!this.variantSearchControls[controlKey]) {
      const ctrl = new FormControl("");
      ctrl.valueChanges.pipe(takeUntil(this._destroy$)).subscribe((val) => {
        this.filterVariantFieldOptions(controlKey, val);
      });
      this.variantSearchControls[controlKey] = ctrl;
    }
    return this.variantSearchControls[controlKey];
  }

  onVariantDropdownOpenedChange(opened: boolean, controlKey: string): void {
    if (this.variantSearchControls[controlKey]) {
      this.variantSearchControls[controlKey].setValue("", { emitEvent: false });
    }
    this.filterVariantFieldOptions(controlKey, "");
  }

  onDropdownOpenedChange(
    opened: boolean,
    key: string,
    isRequired: boolean,
  ): void {
    if (this.fieldSearchControls[key]) {
      this.fieldSearchControls[key].setValue("", { emitEvent: false });
    }
    this.filterFieldOptions(key, "", isRequired);
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

  addUpdateSelectedMasterInventory(flag: string): void {
    if (this.inventoryFormGroupWL.invalid) {
      return;
    }
    if (this.variantFormGroups.invalid) {
      return;
    }
    this.btnDisable = true;
    const formData = this.inventoryFormGroupWL.getRawValue();

    // Add the flag to the formData before sending
    formData.flag = flag;

    // If the inventoryId is 'add', add a new inventory item (if applicable)
    const formGroupPayLoad = {
      amz_product_type: "singleProductType",
      amz_fulfillment_by: "singleFulfillment",
      amz_margin: "amzMargin",
      amz_margin_mode: "amzMarginMode",
    };
    Object.entries(formGroupPayLoad).forEach(
      ([key, value]: [string, string]) => {
        formGroupPayLoad[key] = this.productForm?.get(value)?.value;
      },
    );

    this._inventoryService
      .addInventory(this.selectedMarketplaceId, {
        ...formData,
        shipping_charge: this.currentSelectedMarketplaceShippingCharge || 0,
        ...formGroupPayLoad,
        amz_handling_time: this.sellerSetting?.amz_handling_time || 0,
      })
      .subscribe(
        (t) => {
          this.btnDisable = false;
          this.isLoading = false;
          this._utilService.onSuccess("Inventory has been added successfully.");
          this._changeDetectorRef.markForCheck();
          // this.fetchAmazonInventoryBySeller(this.userInfo.id); // Refresh inventory
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
  CheckForAiCalls(): boolean {
    const trials = this._localService.getItem("Wl_products_types") || {};

    // Ensure `trials` is an object and relevant to the selected product type
    if (
      trials &&
      trials.product_type === this.singleProductsVars.productTypes
    ) {
      // Increment the attempt count or initialize it
      trials["attempt"] =
        trials["attempt"] && !isNaN(Number(trials["attempt"]))
          ? trials["attempt"] + 1
          : 1;

      // Save updated attempts back to localStorage
      this._localService.setItem("Wl_products_types", trials);

      // Enable or disable AI attempts based on the number of attempts
      if (trials["attempt"] <= 2) {
        this.AiAttemptsEnable = true;
        return true;
      } else {
        this.AiAttemptsEnable = false;
        return false;
      }
    } else {
      // Initialize the trial object for a new product type
      trials.product_type = this.singleProductsVars.productTypes;
      trials["attempt"] = 1;

      // Save the new product type data to localStorage
      this._localService.setItem("Wl_products_types", trials);
      this.AiAttemptsEnable = true;
      return true;
    }
  }

  closeUpdateDialog(): void {
    this.inventoryFormGroupWL?.reset();
    this._matDialogRef?.close();
    this.disableDownload = false;
    this.selectedCategory = "retail";
    this.productForm.patchValue({
      singleFulfillment: this.sellerSetting.amz_fullfillment_by,
      singleProductType: this.sellerSetting.amz_product_type,
      fulfillment: this.sellerSetting.amz_fullfillment_by,
      amzMarginMode: this.sellerSetting.amz_margin_mode,
      amzMargin: this.sellerSetting.amz_margin,
      productType: this.sellerSetting.amz_product_type,
    });
    this.formGroupTabOne.reset();
    this.formGroupTabTwo.reset();
    this.isDisplayNote = false;
    this.selectedUpadteTabIndex = 0;
  }

  // generateTheContentWithAi
  async onGenrateContentWithAi(listingContent: string): Promise<void> {
    const productName = listingContent;
    if (productName) {
      const fieldsToGenerateContent = [
        "item_name___value",
        "bullet_point___value",
        "product_description___value",
        "item_type_keyword___value",
      ];
      await this.generateTheContentWithAi(productName, fieldsToGenerateContent);
    }
  }
  async generateTheContentWithAi(
    productName: string,
    fields: (string | number)[],
    enums?: { [key: string]: string[] },
  ): Promise<void> {
    this._inventoryService
      .generateTheContentWithAi({ productName, fields, enums })
      .subscribe(
        (data) => {
          if (data?.status === 200 && data?.data) {
            const {
              bullet_point___value,
              product_description___value,
              item_name___value,
            } = data.data;

            // Handle `bullet_point___value` as a FormArray
            const bulletPointsArray = this.formGroupTabOne.get(
              "bullet_point___value",
            ) as FormArray;
            if (bulletPointsArray) {
              // Clear the form array
              // bulletPointsArray.clear();

              // Add new bullet points to the form array
              bullet_point___value.forEach((bullet: string) => {
                bulletPointsArray.push(this.fb.control(bullet));
              });
            }

            // Update `product_description___value` as a regular form control
            this.formGroupTabOne.patchValue({
              product_description___value,
              item_name___value,
            });
          } else {
            this._utilService.onError(data?.message || "Invalid response");
            console.error("Invalid response structure or status:", data);
          }
        },
        ({ error }) => {
          this._utilService.onError(error?.message || "Invalid response");
          console.error("Error fetching content:", error);
        },
      );
  }
  resetField(fieldKey: string): void {
    // Set the form field to null or default value
    this.formGroupTabOne.get(fieldKey)?.reset("");
    this.formGroupTabTwo.get(fieldKey)?.reset("");
  }
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

  goToPreviousTab(): any {
    if (this.selectedTabIndex - 1 >= 0) {
      this.selectedTabIndex -= 1;
    } else {
      this.selectedTabIndex = this.totalTabs - 1;
    }
  }

  async hanldeSubmitWL(): Promise<void> {
    if (this.isHasVarients.value && this.variantFormGroups.invalid) {
      this._utilService.onError("Please fill the varient data properly");
    } else if (this.isHasVarients.value) {
      // child_parent_sku_relationship
      let formControl = this.formGroupTabTwo?.get(
        "child_parent_sku_relationship___child_relationship_type",
      );
      if (formControl) {
        formControl?.setValue("variation");
      }

      // parentage_level
      formControl = this.formGroupTabTwo?.get("parentage_level___value");
      if (formControl) {
        formControl?.setValue("parent");
      }
    }
    if (this.formGroupTabOne && this.formGroupTabTwo) {
      // Retrieve the form data as key-value pairs
      const formData = {
        ...this.formGroupTabOne.value,
        ...this.formGroupTabTwo.value,
      };
      // const formData = { ...this.formGroupTabOne.value };
      const newO = {};
      Object.entries(formData).forEach(([e, k]) => {
        newO[e.replaceAll("___", "FEILD_DOTS")] = k;
      });
      const feedType = {
        amz_product_type: this.productForm?.get("singleProductType")?.value,
        ...this.inventoryFormGroupWL.value,
        product_id:
          this.formGroupTabOne.value[
            "externally_assigned_product_identifier.value"
          ],
        seller_id: this.userInfo.id,
        product_type: this.singleProductsVars.productTypes,
        shipping_charge: this.currentSelectedMarketplaceShippingCharge || 0,
        amz_margin_mode: this.productForm?.get("amzMarginMode")?.value,
        amz_margin: this.productForm?.get("amzMargin")?.value,
        amz_fullfillment_by: this.productForm?.get("singleFulfillment")?.value,
        amz_handling_time: this.sellerSetting.amz_handling_time,
        amz_status: this.sellerSetting.amz_status,
        marketplace_id: this.selectedMarketplaceId,
        price: this.formGroupTabTwo.value["list_price.value_with_tax"],
        sku: this.inventoryFormGroupWL.get("sku").value,
        move_product_id: this.selectedProductId,
      };
      if (this.isGtinExemptionApproved) {
        newO["brandFEILD_DOTSvalue"] = "GENERIC";
      }

      const formGroupPayLoad = this.variantFormGroups.value.map(
        (item: any, index: number) => ({ ...item }),
      );
      const selectedVarientType = this.varientsFormFields["selectedItem"];
      const payload = this.objectToFormData({
        item: newO,
        feedType,
        varients: formGroupPayLoad,
        ...(selectedVarientType ? { varientType: selectedVarientType } : {}),
      });
      this._inventoryService.singleProductListWithoutFile(payload).subscribe(
        (t: any) => {
          if (t.status === 200) {
            this._utilService.onSuccess(
              "Inventory has been added successfully.",
            );
            this.goBack();
          } else {
            this._utilService.onError(
              t?.message || "Error occurring while the submission",
            );
          }
          this.variantFormGroups.value.map((_: any, i: number) => {
            this.variantFormGroups.controls[i]
              ?.get("main_product_image_locator___media_location")
              ?.setValue(null);
          });
        },
        ({ error }) => {
          this._utilService.onError(
            error?.message || "Error occurring while the submission",
          );
          this.variantFormGroups.value.map((_: any, i: number) => {
            this.variantFormGroups.controls[i]
              ?.get("main_product_image_locator___media_location")
              ?.setValue(null);
          });
        },
      );
    } else {
      console.error("Form is invalid");
    }
  }

  onProductTypeChange(event: MatSelectChange): void {
    const selectedProductType = event.value; // Get the selected product type value
    if (selectedProductType) {
      this.isLoading = true;
      // Call the service method to fetch templates based on the selected product type
      Object.keys(this.requiredFormFields).forEach((i) => {
        this.formGroupTabOne.removeControl(i);
      });
      Object.keys(this.nonRequiredFormFields).forEach((i) => {
        this.formGroupTabTwo.removeControl(i);
      });
      this._amazonService
        .retrieveTemplateBaseOnProductType(
          selectedProductType,
          this.selectedMarketplaceId,
        )
        .subscribe(
          (t) => {
            this.requiredFormFields = {};
            this.nonRequiredFormFields = {};
            const rootFeilds =
              t?.data?.item && Object.keys(t?.data?.item).length > 0
                ? t.data.item
                : {};
            const rootKeys = this.extractRootKeys(rootFeilds);
            const flatSchema = this.traverseSchema(
              rootFeilds,
              [],
              "",
              false,
              rootKeys,
            );
            const fieldHeaders = flatSchema.filter(
              (item: any) => item.required,
            );
            const externalModifiedKeys = [
              "externally_assigned_product_identifier.value",
              "externally_assigned_product_identifier.type",
            ];
            if (fieldHeaders && !!fieldHeaders.length) {
              // Dynamically build the form controls
              fieldHeaders.forEach((item: any) => {
                if (item.title === "bullet_point.value") {
                  const arrayControl = this.fb.array([
                    this.fb.control("", Validators.required),
                  ]);

                  this.formGroupTabOne.addControl(
                    item.title.toString().replaceAll(".", "___"),
                    arrayControl,
                  );
                  // set up for make things non required
                } else {
                  if (item.title !== "product_description.value") {
                    const control = this.fb.control("", Validators.required);

                    this.formGroupTabOne.addControl(
                      item.title.toString().replaceAll(".", "___"),
                      control,
                    );
                  }
                }
                if (
                  ["product_description.value", "bullet_point.value"].includes(
                    item.title,
                  )
                ) {
                  item["input_type"] = "textarea";
                  item["row"] = "2";
                  item["fullWidth"] = true;
                }

                this.requiredFormFields[
                  item.title.toString().replaceAll(".", "___")
                ] = item;
              });

              const additionalFields = flatSchema.filter((item: any) =>
                externalModifiedKeys.includes(item.title),
              );
              if (additionalFields) {
                additionalFields.forEach((item: any) => {
                  const control = this.fb.control({
                    value: "",
                    disabled: false,
                  });
                  this.formGroupTabOne.addControl(
                    item.title.toString().replaceAll(".", "___"),
                    control,
                  );
                  this.requiredFormFields[
                    item.title.toString().replaceAll(".", "___")
                  ] = item;
                });
              }
              if ("product_description___value" in this.requiredFormFields) {
                this.formGroupTabOne.addControl(
                  "product_description___value",
                  this.fb.control("", [Validators.required]),
                );
              }
            }
            this.browserNodes = [];
            const flateHeadrsNonRequired = flatSchema
              .filter((item: any) => !item?.required)
              .filter(
                (item: any) => !externalModifiedKeys.includes(item.title),
              );
            if (flateHeadrsNonRequired && !!flateHeadrsNonRequired.length) {
              flateHeadrsNonRequired.forEach((item: any) => {
                const control = this.fb.control("");
                this.formGroupTabTwo.addControl(
                  item.title.toString().replaceAll(".", "___"),
                  control,
                );
                this.nonRequiredFormFields[
                  item.title.toString().replaceAll(".", "___")
                ] = item;
              });
            }
            this.browserNodes = [];
            if (
              "recommended_browse_nodes___value" in this.requiredFormFields &&
              t.browserNodes &&
              t.browserNodes.length > 0
            ) {
              const [first] = t.browserNodes;
              if (first?.nodes) {
                this.requiredFormFields[
                  "recommended_browse_nodes___value"
                ].enum = first.nodes.map(
                  (item: { id: string; name: string }) => item.id,
                );
              }
              this.requiredFormFields[
                "recommended_browse_nodes___value"
              ].enumNames = first.nodes.map(
                (item: { id: string; name: string }) => item.name,
              );
              this.requiredFormFields[
                "recommended_browse_nodes___value"
              ]._originalEnum = [
                ...this.requiredFormFields["recommended_browse_nodes___value"]
                  .enum,
              ];
              this.requiredFormFields[
                "recommended_browse_nodes___value"
              ]._originalEnumNames = [
                ...this.requiredFormFields["recommended_browse_nodes___value"]
                  .enumNames,
              ];
              this.browserNodes =
                this.requiredFormFields[
                  "recommended_browse_nodes___value"
                ].enumNames;

              if (
                this.requiredFormFields["recommended_browse_nodes___value"].enum
                  .length === 1
              ) {
                this.formGroupTabOne
                  .get("recommended_browse_nodes___value")
                  .setValue(
                    this.requiredFormFields["recommended_browse_nodes___value"]
                      .enum[0],
                  );
                this.formGroupTabOne.get("recommended_browse_nodes___value")
                  ?.disabled;
              }
            }
            if (
              this.requiredFormFields[
                "supplier_declared_dg_hz_regulation___value"
              ]?.enum
            ) {
              this.formGroupTabOne
                .get("supplier_declared_dg_hz_regulation___value")
                ?.setValue("not_applicable");
            }
            this.disableSecondTab = false;
            this.onGtinExamptionManual();
            this.formGroupTabOne.statusChanges.subscribe((status: string) => {
              if (status === "VALID") {
                this.disableThird = false;
              } else {
                this.disableThird = true;
              }
            });
            this.SKUWisePreFilledValues(
              this.formGroupTabOne,
              this.formGroupTabTwo,
            );
            this.warningMessage = "";
            this.handleVariationFields();
            this.isLoading = false;

            this._changeDetectorRef.detectChanges();
          },
          ({ error }) => {
            this.isLoading = false;
            console.error("Error fetching template:", error);
          },
        );
    }
    this.UpdateAiButtonState();
  }

  traverseSchema(
    schema: any,
    flatSchema = [],
    parentPath = "",
    isParentRequired = false,
    rootKeys,
  ): any {
    for (const key in schema) {
      const property = schema[key];
      const currentPath = parentPath ? `${parentPath}.${key}` : key; // Build the current path

      // Determine if the current property is required
      let isRequired: any;
      // Check if the current key is in the root keys array
      if (rootKeys.includes(key)) {
        isRequired = !!property.required; // Take its own required status
      } else {
        isRequired = isParentRequired; // Inherit from parent
      }
      // Check if the property is an object or an array
      if (property.property_type === "object") {
        // Traverse its children
        this.traverseSchema(
          property,
          flatSchema,
          currentPath,
          isRequired,
          rootKeys,
        );
      } else if (property.property_type === "array") {
        // Traverse the items in the array
        if (property.items) {
          // For arrays, we need to pass the current required status
          this.traverseSchema(
            property.items,
            flatSchema,
            currentPath,
            isRequired,
            rootKeys,
          );
        }
      } else {
        // Only include properties that are necessary
        if (property.title) {
          // Ensure the property has a title
          flatSchema.push({
            mainTitle: property.title,
            type: property.title.startsWith("bullet") ? "array" : "string",
            title: currentPath, // Use the full path as the title
            required: isRequired, // Use the determined required status
            enumNames: property.enumNames, // Store enumNames for dropdowns
            enum: property.enum,
            ...(property?.validators
              ? { validators: property.validators }
              : {}),
          });
        }
      }
    }
    return flatSchema;
  }

  UpdateAiButtonState(): void {
    const trials = this._localService.getItem("Wl_products_types") || {};

    if (
      trials &&
      trials.product_type === this.singleProductsVars.productTypes
    ) {
      this.AiAttemptsEnable = trials["attempt"] <= 2;
    } else {
      this.AiAttemptsEnable = true;
    }
  }

  extractRootKeys(schema: { [key: string]: any }): string[] {
    return Object.keys(schema); // Get the keys at the root level
  }
  // For getting the form array controls
  getFormArrayControls(key: string, formGroup: FormGroup): AbstractControl[] {
    const control = formGroup.get(key);
    return control instanceof FormArray ? (control as FormArray).controls : [];
  }

  onGtinExamptionManual(): any {
    if (this.isGtinExemptionApproved) {
      const brandControl = this.formGroupTabOne.get("brand___value");

      if (brandControl) {
        brandControl.setValue("GENERIC");
        brandControl.disable(); // Disable the control

        // Store and remove external controls
        [
          "externally_assigned_product_identifier___type",
          "externally_assigned_product_identifier___value",
        ].forEach((key) => {
          if (this.formGroupTabOne.get(key)) {
            this.removedExternalControls[key] = this.formGroupTabOne.get(key);
            this.formGroupTabOne.removeControl(key);
          }
        });
      }
    } else {
      // Restore external controls
      Object.keys(this.removedExternalControls).forEach((key) => {
        this.formGroupTabOne.addControl(key, this.removedExternalControls[key]);
      });
      this.removedExternalControls = {}; // Clear storage after restoration

      const brandControl = this.formGroupTabOne.get("brand___value");
      if (brandControl) {
        brandControl.setValue(""); // Reset value
        brandControl.enable(); // Enable the control
      }
    }
  }
  SKUWisePreFilledValues(
    formGroupTabOne: FormGroup = this.formGroupTabOne,
    formGroupTabTwo: FormGroup = this.formGroupTabTwo,
  ): void {
    const selectedMarkeplaceDats = this.allMarketplaces
      .filter((i) => i.id === this.selectedMarketplaceId)
      .map((i) => i.currencyCode)[0];
    if (this.skuData && Object.keys(this.skuData).length > 0) {
      formGroupTabOne
        .get("item_name___value")
        ?.setValue(this.skuData?.title || "");
      formGroupTabOne
        .get("brand___value")
        ?.setValue(this.skuData?.brand || "GENERIC");
      if (formGroupTabOne.get("brand___value")?.value === "GENERIC") {
        //supplier_declared_has_product_identifier_exemption
        formGroupTabTwo
          ?.get("supplier_declared_has_product_identifier_exemption")
          ?.setValue(true);
        this.onGtinExamptionChange({ checked: true });
      }
      formGroupTabOne
        .get("product_description___value")
        ?.setValue(this.skuData?.description || "");
      const bulletPointsArray = formGroupTabOne.get(
        "bullet_point___value",
      ) as FormArray;
      if (bulletPointsArray && Array.isArray(this.skuData["bullet_points"])) {
        bulletPointsArray.clear();
        const bulletPoints = Array.isArray(this.skuData["bullet_points"])
          ? this.skuData["bullet_points"].flat() // Flatten any nested arrays
          : [];

        Array.isArray(bulletPoints) &&
          bulletPoints.forEach((bullet: string) => {
            bulletPointsArray.push(this.fb.control(bullet));
          });
      }
      formGroupTabOne
        .get("main_product_image_locator___media_location")
        ?.setValue(
          Array.isArray(this.skuData?.main_image_url)
            ? this.skuData?.main_image_url[0]
            : this.skuData?.main_image_url || "",
        );
      formGroupTabTwo
        .get("list_price___value_with_tax")
        ?.setValue(this.skuData?.master_price || "");
      formGroupTabTwo
        .get("purchasable_offer___our_price___schedule___value_with_tax")
        ?.setValue(this.skuData?.master_price || "");
      formGroupTabTwo
        .get("fulfillment_availability___quantity")
        ?.setValue(this.skuData?.master_stock || 0);
      formGroupTabTwo
        .get("purchasable_offer___currency")
        ?.setValue(selectedMarkeplaceDats || "");
      formGroupTabTwo.get("condition_type___value")?.setValue("new_new");
      formGroupTabOne
        .get("country_of_origin___value")
        ?.setValue(
          this.skuData?.contry_of_origin ? this.skuData?.contry_of_origin : "",
        );
      formGroupTabOne
        .get("externally_assigned_product_identifier___type")
        ?.setValue(this.skuData.ean ? "ean" : "");
      formGroupTabOne
        .get("externally_assigned_product_identifier___value")
        ?.setValue(this.skuData.ean ? this.skuData.ean : "");
      if (
        this.skuData &&
        Array.isArray(this.skuData?.main_image_url) &&
        this.skuData.main_image_url.length > 0
      ) {
        this.skuData.main_image_url
          .slice(1, 8)
          .forEach((imgUrl: string, idx: number) => {
            imgUrl
              ? formGroupTabTwo
                  .get(
                    `other_product_image_locator_${idx + 1}___media_location`,
                  )
                  .setValue(imgUrl || "")
              : "";
          });
      }
      formGroupTabTwo.get("color___value")?.setValue(this.skuData?.color || "");
      formGroupTabTwo.get("batteries_required___value")?.setValue(false);
      formGroupTabTwo.get("batteries_included___value")?.setValue(false);
      formGroupTabTwo.get("batteries_included___value")?.setValue(false);
    }
  }
  IssueWiseHighLightedFields(
    formGroupTabOne: FormGroup = this.formGroupTabOne,
    formGroupTabTwo: FormGroup = this.formGroupTabTwo,
  ): void {
    const valueArray = Array.from(this.missingAttributesSet);
    this.highlightAttributeKey = [];
    valueArray.forEach((prefix) => {
      Object.keys(formGroupTabOne.controls).forEach((key) => {
        if (key.startsWith(prefix)) {
          this.highlightAttributeKey.push(key);
        }
      });
      Object.keys(formGroupTabTwo.controls).forEach((key) => {
        if (key.startsWith(prefix)) {
          this.highlightAttributeKey.push(key);
        }
      });
    });
  }

  goToNextTabInUpate(): void {
    if (this.selectedUpadteTabIndex === 0) {
      this.selectedUpadteTabIndex = 1;
    }
  }
  goToNextTab() {
    const isSecondTabValid = this.formGroupTabOne.valid;
    const isThirdTabValid = this.formGroupTabTwo.valid;

    // Move to the next tab when "Next" button is clicked
    if (this.selectedTabIndex + 1 <= this.totalTabs) {
      if (this.selectedTabIndex === 1) {
        if (isSecondTabValid) {
          this.selectedTabIndex += 1;
          this.disableThird = true;
          this.disableSubmitButton = false;
        } else {
          this._utilService.onError(
            "Please Fill The all the Madnatory fields first ",
          );
        }
      } else if (this.selectedTabIndex === 2) {
        if (isThirdTabValid) {
          this.disableThird = false;
          this.disableSubmitButton = false;
        } else {
          this._utilService.onError(
            "Please Fill The all the Madnatory fields first ",
          );
        }
      } else if (this.selectedTabIndex === 0) {
        if (Object.keys(this.requiredFormFields).length > 0) {
          this.disableSecondTab = false;
        }
        if (Object.keys(this.requiredFormFields).length > 0) {
          this.selectedTabIndex += 1;
        }
      } else {
        if (Object.keys(this.formGroupTabOne.controls).length > 0) {
          this.selectedTabIndex += 1;
        } else {
          this._utilService.onError("Please select product type first");
        }
      }
    } else {
      this.selectedTabIndex = 0;
    }
  }
  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent): any {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent the default form submission behavior
      // this.addUpdateSelectedInventory();
    }
  }
  goBack(): void {
    window.history.back();
  }
  set browserNodeSearch(event: string) {
    this.filterFieldOptions("recommended_browse_nodes___value", event, true);
  }
  // Update Product Type changes
  onUpdatePopupOpen(issue: string[] = []): void {
    this.missingAttributesSet.clear();
    issue.forEach((items: any) => {
      if (items?.attributeNames?.[0]) {
        this.missingAttributesSet.add(items.attributeNames[0]);
      }
    });
  }
  onUpdateForm(
    updateData: any,
    varientType: string,
    varients: Record<string, string | number>[] = [{}],
  ): void {
    this.varientsFormFields["currentVarietionType"] = varientType;
    const selectedProductType = this.product_type; // Get the selected product type value
    // Ensure that a valid product type has been selected
    if (selectedProductType) {
      this.isLoading = true;
      Object.keys(this.requiredFormFields).forEach((i) => {
        this.formGroupTabOne.removeControl(i);
      });
      Object.keys(this.nonRequiredFormFields).forEach((i) => {
        this.formGroupTabTwo.removeControl(i);
      });
      this.requiredFormFields = {};
      this.nonRequiredFormFields = {};

      // Call the service method to fetch templates based on the selected product type
      this._amazonService
        .retrieveTemplateBaseOnProductType(
          selectedProductType,
          this.selectedMarketplaceId,
        )
        .subscribe(
          (t) => {
            this.disableSecondTab = false;
            this.disableThird = true;
            this.disableSubmitButton = true;
            this.requiredFormFields = {};
            this.nonRequiredFormFields = {};
            const rootFeilds =
              t?.data?.item && Object.keys(t?.data?.item).length > 0
                ? t.data.item
                : {};
            const rootKeys = this.extractRootKeys(rootFeilds);
            const flatSchema = this.traverseSchema(
              rootFeilds,
              [],
              "",
              false,
              rootKeys,
            );
            const fieldHeaders = flatSchema.filter(
              (item: any) => item.required,
            );
            const externalModifiedKeys = [
              "externally_assigned_product_identifier.value",
              "externally_assigned_product_identifier.type",
            ];
            if (fieldHeaders && !!fieldHeaders.length) {
              // Dynamically build the form controls
              fieldHeaders.forEach((item: any) => {
                if (item.title === "bullet_point.value") {
                  const arrayControl = this.fb.array([
                    this.fb.control("", Validators.required),
                  ]);

                  this.formGroupTabOne.addControl(
                    item.title.toString().replaceAll(".", "___"),
                    arrayControl,
                  );
                  // set up for make things non required
                } else if (externalModifiedKeys.includes(item.title)) {
                  return;
                } else if (item.title !== "product_description.value") {
                  const control = this.fb.control("", Validators.required);

                  this.formGroupTabOne.addControl(
                    item.title.toString().replaceAll(".", "___"),
                    control,
                  );
                }
                if (
                  ["product_description.value", "bullet_point.value"].includes(
                    item.title,
                  )
                ) {
                  item["input_type"] = "textarea";
                  item["row"] = "2";
                  item["fullWidth"] = true;
                }
                this.requiredFormFields[
                  item.title.toString().replaceAll(".", "___")
                ] = item;
              });
            }
            const flateHeadrsNonRequired = flatSchema.filter(
              (item: any) => !item?.required,
            );
            if (flateHeadrsNonRequired && !!flateHeadrsNonRequired.length) {
              const additionalFields = flatSchema.filter((item: any) =>
                externalModifiedKeys.includes(item.title),
              );
              if (additionalFields) {
                additionalFields.forEach((item: any) => {
                  const control = this.fb.control("");
                  this.formGroupTabTwo.addControl(
                    item.title.toString().replaceAll(".", "___"),
                    control,
                  );
                  this.nonRequiredFormFields[
                    item.title.toString().replaceAll(".", "___")
                  ] = item;
                });
              }
              if ("product_description___value" in this.requiredFormFields) {
                this.formGroupTabOne.addControl(
                  "product_description___value",
                  this.fb.control("", [Validators.required]),
                );
              }

              flateHeadrsNonRequired.forEach((item: any) => {
                const control = this.fb.control("");
                this.formGroupTabTwo.addControl(
                  item.title.toString().replaceAll(".", "___"),
                  control,
                );
                this.nonRequiredFormFields[
                  item.title.toString().replaceAll(".", "___")
                ] = item;
              });
            }
            /* browser Nodes */
            this.browserNodes = [];
            if (
              "recommended_browse_nodes___value" in this.requiredFormFields &&
              t.browserNodes &&
              t.browserNodes.length > 0
            ) {
              const [first] = t.browserNodes;
              this.requiredFormFields["recommended_browse_nodes___value"].enum =
                first.nodes.map(
                  (item: { id: string; name: string }) => item.id,
                );
              this.requiredFormFields[
                "recommended_browse_nodes___value"
              ].enumNames = first.nodes.map(
                (item: { id: string; name: string }) => item.name,
              );
              this.requiredFormFields[
                "recommended_browse_nodes___value"
              ]._originalEnum = [
                ...this.requiredFormFields["recommended_browse_nodes___value"]
                  .enum,
              ];
              this.requiredFormFields[
                "recommended_browse_nodes___value"
              ]._originalEnumNames = [
                ...this.requiredFormFields["recommended_browse_nodes___value"]
                  .enumNames,
              ];
              this.browserNodes =
                this.requiredFormFields[
                  "recommended_browse_nodes___value"
                ].enumNames;
              if (
                this.requiredFormFields["recommended_browse_nodes___value"].enum
                  .length === 1
              ) {
                this.formGroupTabOne
                  .get("recommended_browse_nodes___value")
                  .setValue(
                    this.requiredFormFields["recommended_browse_nodes___value"]
                      .enum[0],
                  );
                this.formGroupTabOne.get("recommended_browse_nodes___value")
                  ?.disabled;
              }
            }
            // browser nodes
            if (updateData) {
              Object.keys(updateData).forEach((key) => {
                if (key === "recommended_browse_nodes___value") {
                  updateData[key] = this.ensureBrowseNodeInEnum(
                    updateData[key],
                  );
                }
                if (this.formGroupTabOne.contains(key)) {
                  if (key === "bullet_point___value") {
                    const bulletPointsArray = this.formGroupTabOne.get(
                      "bullet_point___value",
                    ) as FormArray;
                    if (bulletPointsArray) {
                      bulletPointsArray.clear();
                      if (typeof updateData[key] === "string") {
                        updateData[key] = [updateData[key]];
                      }
                      updateData[key].forEach((bullet: string) => {
                        bulletPointsArray.push(this.fb.control(bullet));
                      });
                    }
                  }
                  this.formGroupTabOne.patchValue({
                    [key]: updateData[key],
                  });
                  if (key === "brand___value") {
                    const brandControl =
                      this.formGroupTabOne.get("brand___value");
                    if (brandControl) {
                      const brandValue = brandControl.value; // Get the current value of the control

                      // Check if the value is 'generic' and disable the control
                      if (brandValue === "GENERIC") {
                        brandControl.disable(); // Make the field read-only
                      }
                    }
                    return; // Skip further updates for brand___value
                  }
                } else if (this.formGroupTabTwo.contains(key)) {
                  this.formGroupTabTwo.patchValue({
                    [key]: updateData[key],
                  });
                  if (key === "brand___value") {
                    const brandControl =
                      this.formGroupTabTwo.get("brand___value");
                    if (brandControl) {
                      const brandValue = brandControl.value; // Get the current value of the control

                      // Check if the value is 'generic' and disable the control
                      if (brandValue === "GENERIC") {
                        brandControl.disable(); // Make the field read-only
                      }
                    }
                    return; // Skip further updates for brand___value
                  }
                }
                this.IssueWiseHighLightedFields(
                  this.formGroupTabOne,
                  this.formGroupTabTwo,
                );
                this.formGroupTabOne.statusChanges.subscribe((status) => {
                  if (status === "VALID") {
                    this.disableThird = false;
                    this.disableSubmitButton = false;
                  } else {
                    this.disableThird = true;
                    this.disableSubmitButton = false;
                  }
                });
              });
            }
            this.handleVariationFields();
            if (varientType) {
              this.variationControls?.get(varientType)?.setValue(true);
              this.varientsFormFields["selectedItem"] = varientType;
              this.varientsFormFields["currentVarietionType"] = varientType;
              this.toggleVariation(varientType, true);
            }
            const keysOfVarients = new Set<string>();
            Array.isArray(varients) &&
              varients?.forEach((items) => {
                const valueRow: Record<string, any> = {};
                Object.entries(items).forEach(([k, v]: [string, string]) => {
                  if (
                    [
                      "sku",
                      "externally_assigned_product_identifier___value",
                      "externally_assigned_product_identifier___type",
                      "condition_type___value",
                      "purchasable_offer___our_price___schedule___value_with_tax",
                      "fulfillment_availability___quantity",
                      "main_product_image_locator___media_location",
                    ].includes(k)
                  ) {
                    valueRow[k] = [v];
                  } else if (k === k.toUpperCase()) {
                    valueRow[k] = [v];
                  }
                  if (
                    !(k.split("___").length > 1) &&
                    k !== "sku" &&
                    k === k.toUpperCase()
                  ) {
                    keysOfVarients.add(k);
                  }
                });
                const formGroup = this.fb.group({
                  ...valueRow,
                  sku: [items["sku"] ?? "", [Validators.required]],
                  externally_assigned_product_identifier___value: [
                    items["externally_assigned_product_identifier___value"] ??
                      "",
                  ],
                  externally_assigned_product_identifier___type: [
                    items["externally_assigned_product_identifier___type"] ??
                      "",
                  ],
                  purchasable_offer___our_price___schedule___value_with_tax: [
                    items[
                      "purchasable_offer___our_price___schedule___value_with_tax"
                    ] ?? "",
                    [Validators.required],
                  ],
                  fulfillment_availability___quantity: [
                    items["fulfillment_availability___quantity"] ?? 0,
                    [Validators.required],
                  ],
                  main_product_image_locator___media_location: [
                    items["main_product_image_locator___media_location"] ?? "",
                    [Validators.required],
                  ],
                });
                Object.keys(formGroup.controls).forEach((elme) => {
                  formGroup?.get(elme)?.disable();
                });
                this.variantUpdateFormGroups.push(formGroup);
              });
            if (Array.isArray(varients) && varients.length > 0) {
              this.isHasVarients.setValue(true);
            }
            this.variantFormGroups.clear();

            this.varientsFormFields["headers"] = [...keysOfVarients];
            this.varientsFormFields["controls"] = {};

            if (
              this.nonRequiredFormFields &&
              this.objectKeys(this.nonRequiredFormFields).length > 0
            ) {
              [
                "externally_assigned_product_identifier___type",
                "condition_type___value",
                "main_product_image_locator___media_location",
              ].forEach((elem) => {
                if (this.nonRequiredFormFields[elem]) {
                  this.varientsFormFields["controls"][elem] =
                    this.nonRequiredFormFields[elem];
                } else if (this.requiredFormFields[elem]) {
                  this.varientsFormFields["controls"][elem] =
                    this.requiredFormFields[elem];
                }
              });
            }
            if (varientType) {
              this.formGroupTabTwo
                ?.get("variation_theme___name")
                ?.setValue(varientType);
              this.formGroupTabTwo?.get("parentage_level___value")?.disable();
              this.formGroupTabTwo
                ?.get("child_parent_sku_relationship___child_relationship_type")
                ?.disable();
              this.formGroupTabTwo?.get("variation_theme___name")?.disable();
            }
            this.isLoading = false;
            this._changeDetectorRef.detectChanges();
          },
          ({ error }) => {
            this.isLoading = false;
            console.error("Error fetching template:", error);
          },
        );
    }
  }
  async updateProductTypeSelect(productType: MatSelectChange): Promise<void> {
    const prefilledValues = {};
    this.singleProductsVars.filteredProductTypeList = this.productTypes;
    Object.keys(this.formGroupTabOne?.controls).forEach((i) => {
      const control = this.formGroupTabOne.get(i);

      if (
        [
          "item_name___value",
          "item_type_keyword___value",
          "product_description___value",
          "bullet_point___value",
          "country_of_origin___value",
          "supplier_declared_dg_hz_regulation___value",
          "main_product_image_locator___media_location",
          "externally_assigned_product_identifier___type",
          "externally_assigned_product_identifier___value",
          "brand___value",
        ].includes(i)
      ) {
        // Store value in temporaryFG only if it's not already stored
        if (!this.temporaryFG.get(i)) {
          this.temporaryFG.addControl(i, control);
        }

        // If formGroupTabOne is empty, use temporaryFG value
        prefilledValues[i] =
          this.formGroupTabOne.get(i)?.value ?? this.temporaryFG.get(i)?.value;
      }

      this.formGroupTabOne.removeControl(i);
    });

    // Preserve formGroupTabTwo values
    Object.keys(this.formGroupTabTwo?.controls).forEach((i) => {
      if (
        i.startsWith("fulfillment_availability") ||
        i.startsWith("purchasable_offer") ||
        i.startsWith("other_product_image_locator")
      ) {
        const control = this.formGroupTabTwo.get(i);
        // Preserve only if formGroupTabTwo has a value
        if (this.formGroupTabTwo.get(i)?.value !== undefined) {
          // Store value in temporaryFG only if it's not already stored
          if (!this.temporaryFG.get(i)) {
            this.temporaryFG.addControl(i, control);
          }
          prefilledValues[i] =
            this.formGroupTabTwo.controls[i]?.value ??
            this.temporaryFG.controls[i]?.value;
        }
      }
      this.formGroupTabTwo.removeControl(i);
    });

    this.isLoading = true;
    this._amazonService
      .retrieveTemplateBaseOnProductType(
        productType?.value,
        this.selectedMarketplaceId,
      )
      .subscribe(
        (t: any) => {
          this.requiredFormFields = {};
          this.nonRequiredFormFields = {};
          const rootFeilds =
            t?.data?.item && Object.keys(t?.data?.item).length > 0
              ? t.data.item
              : {};
          const rootKeys = this.extractRootKeys(rootFeilds);
          const flatSchema = this.traverseSchema(
            rootFeilds,
            [],
            "",
            false,
            rootKeys,
          );
          const fieldHeaders = flatSchema.filter((item: any) => item.required);
          const externalModifiedKeys = [
            "externally_assigned_product_identifier.value",
            "externally_assigned_product_identifier.type",
          ];
          if (fieldHeaders && !!fieldHeaders.length) {
            // Dynamically build the form controls
            fieldHeaders.forEach((item: any) => {
              if (item.title === "bullet_point.value") {
                const arrayControl = this.fb.array([
                  this.fb.control("", Validators.required),
                ]);

                this.formGroupTabOne.addControl(
                  item.title.toString().replaceAll(".", "___"),
                  arrayControl,
                );
                // set up for make things non required
              } else {
                const control = this.fb.control("", Validators.required);

                this.formGroupTabOne.addControl(
                  item.title.toString().replaceAll(".", "___"),
                  control,
                );
              }
              this.requiredFormFields[
                item.title.toString().replaceAll(".", "___")
              ] = item;
            });
            const additionalFields = flatSchema.filter((item: any) =>
              externalModifiedKeys.includes(item.title),
            );
            if (additionalFields) {
              additionalFields.forEach((item: any) => {
                const control = this.fb.control({
                  value: "",
                  disabled: false,
                });
                this.formGroupTabOne.addControl(
                  item.title.toString().replaceAll(".", "___"),
                  control,
                );
                this.requiredFormFields[
                  item.title.toString().replaceAll(".", "___")
                ] = item;
              });
            }
          }
          this.browserNodes = [];
          const flateHeadrsNonRequired = flatSchema
            .filter((item: any) => !item?.required)
            .filter((item: any) => !externalModifiedKeys.includes(item.title));
          if (flateHeadrsNonRequired && !!flateHeadrsNonRequired.length) {
            flateHeadrsNonRequired.forEach((item: any) => {
              const control = this.fb.control("");
              this.formGroupTabTwo.addControl(
                item.title.toString().replaceAll(".", "___"),
                control,
              );
              this.nonRequiredFormFields[
                item.title.toString().replaceAll(".", "___")
              ] = item;
            });
          }
          this.browserNodes = [];
          if (
            "recommended_browse_nodes___value" in this.requiredFormFields &&
            t.browserNodes &&
            t.browserNodes.length > 0
          ) {
            const [first] = t.browserNodes;
            this.requiredFormFields["recommended_browse_nodes___value"].enum =
              first.nodes.map((item: { id: string; name: string }) => item.id);
            this.requiredFormFields[
              "recommended_browse_nodes___value"
            ].enumNames = first.nodes.map(
              (item: { id: string; name: string }) => item.name,
            );
            this.requiredFormFields[
              "recommended_browse_nodes___value"
            ]._originalEnum = [
              ...this.requiredFormFields["recommended_browse_nodes___value"]
                .enum,
            ];
            this.requiredFormFields[
              "recommended_browse_nodes___value"
            ]._originalEnumNames = [
              ...this.requiredFormFields["recommended_browse_nodes___value"]
                .enumNames,
            ];
            this.browserNodes =
              this.requiredFormFields[
                "recommended_browse_nodes___value"
              ].enumNames;

            if (
              this.requiredFormFields["recommended_browse_nodes___value"].enum
                .length === 1
            ) {
              this.formGroupTabOne
                .get("recommended_browse_nodes___value")
                .setValue(
                  this.requiredFormFields["recommended_browse_nodes___value"]
                    .enum[0],
                );
              this.formGroupTabOne.get("recommended_browse_nodes___value")
                ?.disabled;
            }
          }
          if (
            this.requiredFormFields[
              "supplier_declared_dg_hz_regulation___value"
            ]?.enum
          ) {
            this.formGroupTabOne
              .get("supplier_declared_dg_hz_regulation___value")
              ?.setValue("not_applicable");
          }
          this.disableSecondTab = false;
          this.onGtinExamptionManual();
          this.formGroupTabOne.statusChanges.subscribe((status) => {
            if (status === "VALID") {
              this.disableThird = false;
            } else {
              this.disableThird = true;
            }
          });
          this.warningMessage = "";
          this.isLoading = false;
          this._changeDetectorRef.detectChanges();
        },
        ({ error }) => {
          this.isLoading = false;
          console.error("Error fetching template:", error);
        },
      );

    this.assignValuesToFormGroup(prefilledValues, this.formGroupTabOne);
    this.assignValuesToFormGroup(prefilledValues, this.formGroupTabTwo);

    await this.delay(100);
    if (this.formGroupTabOne?.get("brand___value")?.value === "GENERIC") {
      // Get the controls from TabOne
      const identifierTypeControl = this.formGroupTabOne.get(
        "externally_assigned_product_identifier___type",
      );
      const identifierValueControl = this.formGroupTabOne.get(
        "externally_assigned_product_identifier___value",
      );

      if (identifierTypeControl && identifierValueControl) {
        // Remove from TabOne
        this.formGroupTabOne.removeControl(
          "externally_assigned_product_identifier___type",
        );
        this.formGroupTabOne.removeControl(
          "externally_assigned_product_identifier___value",
        );

        // Add to TabTwo
        this.formGroupTabTwo.addControl(
          "externally_assigned_product_identifier___type",
          identifierTypeControl,
        );
        this.formGroupTabTwo.addControl(
          "externally_assigned_product_identifier___value",
          identifierValueControl,
        );
      }
      // Disable brand field in TabOne
      this.formGroupTabOne.get("brand___value")?.disable();
    }
  }
  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async assignValuesToFormGroup(valueItems: object, formGroup: FormGroup) {
    await this.delay(100); // Wait for 100ms before executing further
    Object.keys(valueItems).forEach((i) => {
      if (formGroup?.get(i)) {
        if (Array.isArray(valueItems[i])) {
          const ArrayValue = formGroup.get(i) as FormArray;
          if (ArrayValue) {
            ArrayValue.clear();
            if (typeof valueItems[i] === "string") {
              valueItems[i] = [valueItems[i]];
            }
            valueItems[i].forEach((bullet: string) => {
              ArrayValue.push(this.fb.control(bullet));
            });
          }
        } else {
          if (valueItems[i] !== undefined) {
            formGroup.get(i).setValue(valueItems[i]);
          }
        }
      }
    });
  }

  isHaveTokeepDiable(issue: any): void {
    this.isFirstTabDisable = true;
    if (issue && Array.isArray(issue)) {
      const isNeedForAttributeModification = issue.some(
        (i: { code: string; [key: string]: any }) => i.code === "4000003",
      );
      if (isNeedForAttributeModification) {
        this.isFirstTabDisable = false;
      }
    }
  }
  confirmAlterVarients(): void {
    if (!this.validateUpdateForms()) {
      return;
    }

    if (
      this.isHasVarients.value &&
      this.variantFormGroups.length > 0 &&
      this.varientsFormFields["currentVarietionType"] !==
        this.varientsFormFields["selectedItem"]
    ) {
      this._commonConfirmationDialog(
        {
          title: "Create New Variant",
          message:
            "Are you sure you want to Create New variants? Once you create new varients the older once will be removed permenetly. This action cannot be undone.",
          confirmText: "Yes Proceed",
        },
        () => {
          this.updateListing();
        },
      );
    } else {
      this.updateListing();
    }
  }
  updateListing(): any {
    if (!this.validateUpdateForms() || this.isSubmittingListing) {
      return;
    }

    const additionalChanges = {};

    if (!this.isFirstTabDisable) {
      additionalChanges["new_product_type"] = this.selectProductType;
    }
    if (
      this.isHasVarients.value &&
      (this.variantFormGroups.invalid || this.variantUpdateFormGroups.invalid)
    ) {
      this._utilService.onError("Please fill the varient data properly");
      return;
    }
    if (this.formGroupTabOne && this.formGroupTabTwo) {
      const formData = this.getUpdateFormData();
      const varinetLength = this.variantUpdateFormGroups?.controls?.length;
      // return this.variantFormGroups.value
      const formGroupPayLoad = this.variantUpdateFormGroups.controls.map(
        (control: FormControl, index: number) => {
          const item = control.getRawValue(); // Gets all values including disabled fields
          return { ...item };
        },
      );
      const isAddVarinetAction =
        this.varientsFormFields["currentVarietionType"] ===
        this.varientsFormFields["selectedItem"];

      const formGroup = this.variantFormGroups.controls.map(
        (control: FormControl) => {
          const item = control.getRawValue(); // Gets all values including disabled fields
          return { ...item };
        },
      );
      const selectedVarientType = this.varientsFormFields["selectedItem"];
      const payload = this.objectToFormData({
        product_type: this.product_type,
        marketplace_id: this.selectedMarketplaceId,
        formData,
        ...additionalChanges,
        ...(this.isShowVarientsControl
          ? {
              ...(formGroup.length > 0 && !isAddVarinetAction
                ? { newVarients: formGroup }
                : {
                    varients: isAddVarinetAction
                      ? [...formGroupPayLoad, ...formGroup]
                      : formGroupPayLoad,
                  }),
              ...(selectedVarientType
                ? { varientType: selectedVarientType }
                : {}),
            }
          : {
              child_sku: this.pageQueries["varient"],
            }),
      });

      this.isSubmittingListing = true;
      this._changeDetectorRef.markForCheck();

      this._inventoryService
        .editProductListing(String(this.userInfo.id), this.pageId, payload)
        .pipe(
          finalize(() => {
            this.isSubmittingListing = false;
            this._changeDetectorRef.markForCheck();
          }),
          takeUntil(this._destroy$),
        )
        .subscribe({
          next: (t: any) => {
            if (t.status === 200) {
              this._utilService.onSuccess(
                "Inventory has been updated successfully.",
              );
              this.versionHistoryLoaded = false;
              this.selectedUpadteTabIndex = 2;
              this.loadVersionHistory();
            } else {
              this._utilService.onError("Error Occuring while the submition ");
            }
          },
          error: ({ error }) => {
            this._utilService.onError(error?.message);
            console.error("Error fetching template:", error);
          },
        });
    } else {
      this._utilService.onError("Form is not ready. Please try again.");
    }
  }

  goToUpdatePreviousTab(): void {
    if (this.selectedUpadteTabIndex > 0) {
      this.selectedUpadteTabIndex -= 1;
    }
  }

  validateUpdateForms(): boolean {
    if (!this.formGroupTabOne || !this.formGroupTabTwo) {
      this._utilService.onError("Form is not ready. Please try again.");
      return false;
    }

    this.formGroupTabOne.markAllAsTouched();
    this.formGroupTabTwo.markAllAsTouched();

    const invalidLabels: string[] = [];

    Object.keys(this.formGroupTabOne.controls).forEach((key) => {
      const ctrl = this.formGroupTabOne.get(key);
      if (ctrl?.invalid) {
        invalidLabels.push(this.requiredFormFields[key]?.mainTitle || key);
      }
    });

    Object.keys(this.formGroupTabTwo.controls).forEach((key) => {
      const ctrl = this.formGroupTabTwo.get(key);
      if (ctrl?.hasValidator(Validators.required) && ctrl.invalid) {
        invalidLabels.push(this.nonRequiredFormFields[key]?.mainTitle || key);
      }
    });

    if (invalidLabels.length > 0) {
      this.selectedUpadteTabIndex = 1;
      const preview = invalidLabels.slice(0, 4).join(", ");
      const suffix = invalidLabels.length > 4 ? ", …" : "";
      this._utilService.onError(
        `Please fill required fields: ${preview}${suffix}`,
      );
      this._changeDetectorRef.markForCheck();
      return false;
    }

    return true;
  }

  private normalizeBrowseNodeValue(raw: unknown): string {
    if (raw == null || raw === "") return "";
    if (Array.isArray(raw)) {
      const first = raw[0];
      if (first == null) return "";
      if (typeof first === "object" && "value" in (first as object)) {
        return String((first as { value: unknown }).value);
      }
      return String(first);
    }
    if (typeof raw === "object" && raw !== null && "value" in raw) {
      return String((raw as { value: unknown }).value);
    }
    return String(raw);
  }

  private ensureBrowseNodeInEnum(rawValue: unknown): string {
    const fieldKey = "recommended_browse_nodes___value";
    const value = this.normalizeBrowseNodeValue(rawValue);
    if (!value) return "";

    const field = this.requiredFormFields[fieldKey];
    if (!field) return value;

    const enumArr: string[] = field.enum || [];
    const enumNames: string[] = field.enumNames || [];
    if (!enumArr.map(String).includes(value)) {
      field.enum = [value, ...enumArr];
      field.enumNames = [value, ...enumNames];
      field._originalEnum = [...field.enum];
      field._originalEnumNames = [...field.enumNames];
    }

    return value;
  }

  private getUpdateFormData(): Record<string, unknown> {
    const tabOne = this.formGroupTabOne.getRawValue() as Record<
      string,
      unknown
    >;
    const tabTwo = this.formGroupTabTwo.getRawValue() as Record<
      string,
      unknown
    >;
    const formData: Record<string, unknown> = { ...tabOne, ...tabTwo };

    if (formData["recommended_browse_nodes___value"] != null) {
      formData["recommended_browse_nodes___value"] =
        this.normalizeBrowseNodeValue(
          formData["recommended_browse_nodes___value"],
        );
    }

    if (Array.isArray(formData["bullet_point___value"])) {
      formData["bullet_point___value"] = (
        formData["bullet_point___value"] as string[]
      ).filter((b) => b != null && String(b).trim() !== "");
    }

    const brandCtrl = this.formGroupTabOne.controls["brand___value"];
    formData["brand___value"] =
      brandCtrl?.value ?? formData["brand___value"] ?? "GENERIC";
    if (formData["brand___value"] === undefined) {
      formData["brand___value"] = "GENERIC";
    }

    return formData;
  }
  handleVariationFields(fields = this.nonRequiredFormFields): void {
    if (!("variation_theme___name" in fields)) {
      return;
    }

    this.hasVariations = true;
    const variationGroup = fields["variation_theme___name"];

    if (
      !("validators" in variationGroup) ||
      !Array.isArray(variationGroup["validators"])
    ) {
      return;
    }

    this.variationControls = new FormGroup({});

    const lifecycleValidator: Record<string, any> = variationGroup[
      "validators"
    ].find((validator) => "$lifecycle" in validator);
    if (
      !lifecycleValidator ||
      !("$lifecycle" in lifecycleValidator) ||
      !("enumDeprecated" in lifecycleValidator["$lifecycle"])
    ) {
      return;
    }

    // Remove deprecated enums
    const deprecatedEnums = new Set(
      lifecycleValidator["$lifecycle"]["enumDeprecated"],
    );
    const availableEnums: Set<string> = new Set(variationGroup["enum"]);
    const updatedEnums: string[] = [...availableEnums].filter(
      (value: string) => !deprecatedEnums.has(value),
    );

    this.updatedEnums = updatedEnums;
    this.varientsFormFields["enums"] = updatedEnums; // Directly use updated enums

    // Initialize form controls for variations
    updatedEnums.forEach((variant: string) => {
      variant.split("/").forEach((part: string) => {
        if (!this.variationControls.get(part)) {
        }
      });
      this.variationControls.addControl(variant, new FormControl(false));
    });
  }

  toggleVariation(variant: string, isChecked: boolean) {
    // Clear previous selections
    this.selectedVariations = {};

    if (isChecked) {
      variant.split("/").forEach((part) => {
        this.selectedVariations[part] = [];
      });
    }

    this.updateCheckboxStates();
  }

  updateCheckboxStates(): void {
    const selectedKeys = Object.keys(this.selectedVariations);

    // Check if nothing is selected → Enable all
    if (selectedKeys.length === 0) {
      this.varientsFormFields["enums"].forEach((variant: string) => {
        const control = this.variationControls.get(variant);
        if (control) {
          control.enable();
        }
      });
      return;
    }

    // Enable only selected ones, disable others
    this.varientsFormFields["enums"].forEach((variant: string) => {
      const control = this.variationControls.get(variant);
      if (control) {
        if (control?.value) {
          this.varientsFormFields["selectedItem"] = variant;
          control.enable(); // Enable selected
        } else {
          control.disable(); // Disable everything else
        }
      }
    });
  }

  addChip(variant: string, value: string, rowValue = {}) {
    value = value?.toString()?.trim();
    if (value && this.selectedVariations[variant]) {
      this.selectedVariations[variant].push(value);
    }
    this.unwind(this.selectedVariations, rowValue);
  }

  removeChip(variant: string, chip: string) {
    this.selectedVariations[variant] = this.selectedVariations[variant].filter(
      (v: string) => v !== chip,
    );
    this.unwind(this.selectedVariations);
  }

  /**
   * grid UTILS
   *
   * @param obj
   * @returns
   * @example
   * {
   * "TEAM_NAME": ["1"],"COLOR_NAME": ["1", "2"]
   * }
   * to  [
   *  { "TEAM_NAME": "1", "COLOR_NAME": "1" },
   *  { "TEAM_NAME": "1", "COLOR_NAME": "2" }
   *  ]
   *
   */
  unwind<T extends Record<string, string[]>>(
    obj: T,
    rowData = {},
  ): Array<Record<string, string>> {
    const keys = Object.keys(obj) as (keyof T)[];
    this.varientsFormFields["headers"] = keys;
    this.varientsFormFields["controls"] = {};

    if (
      this.nonRequiredFormFields &&
      this.objectKeys(this.nonRequiredFormFields).length > 0
    ) {
      [
        "externally_assigned_product_identifier___type",
        // 'condition_type___value',
        "main_product_image_locator___media_location",
      ].forEach((elem) => {
        if (this.nonRequiredFormFields[elem]) {
          this.varientsFormFields["controls"][elem] =
            this.nonRequiredFormFields[elem];
        } else if (this.requiredFormFields[elem]) {
          this.varientsFormFields["controls"][elem] =
            this.requiredFormFields[elem];
        }
      });
    }
    // If there are no keys, return an empty row with the headers
    if (keys.length === 0) {
      return [{}]; // At least one empty row
    }

    // Generate Cartesian Product
    const cartesianProduct = keys.reduce<Array<Record<string, string>>>(
      (acc, key) => {
        const values = obj[key];

        if (acc.length === 0) {
          return values.map((value) => ({ [key]: value }));
        }

        const newAcc: Array<Record<string, string>> = [];
        for (const existing of acc) {
          for (const value of values) {
            newAcc.push({ ...existing, [key]: value });
          }
        }

        return newAcc;
      },
      [],
    );
    // Reset and populate FormArray
    this.variantFormGroups.clear();
    const valueRow: Record<string, string[]> = {};
    cartesianProduct.map((row) => {
      Object.entries(row).forEach(([k, v]: [string, string]) => {
        valueRow[k] = [v];
      });
      const formGroup = this.fb.group({
        ...valueRow,
        sku: [rowData["sku"] ?? "", Validators.required],
        externally_assigned_product_identifier___value: [
          rowData["externally_assigned_product_identifier___value"] ?? "",
        ],
        externally_assigned_product_identifier___type: [
          rowData["externally_assigned_product_identifier___type"] ?? "",
        ],
        // condition_type___value: [rowData['condition_type___value'] ?? ''],
        purchasable_offer___our_price___schedule___value_with_tax: [
          rowData[
            "purchasable_offer___our_price___schedule___value_with_tax"
          ] ??
            this.formGroupTabTwo.get(
              "purchasable_offer___our_price___schedule___value_with_tax",
            )?.value ??
            "",
          Validators.required,
        ],
        fulfillment_availability___quantity: [
          rowData["fulfillment_availability___quantity"] ?? 0,
          Validators.required,
        ],
        main_product_image_locator___media_location: [
          rowData["main_product_image_locator___media_location"] ?? "",
          [Validators.required],
        ],
      });
      this.variantFormGroups.push(formGroup);
    });
    this.varientsValus = cartesianProduct;
    return cartesianProduct;
  }
  handleFileInputChange(
    files: FileList | null,
    formControlName: string,
    index: number,
  ): void {
    if (files && files.length > 0) {
      const file = files[0];
      // Store the actual file object in the form control
      const formGroup = this.variantFormGroups.at(index);
      if (formGroup) {
        formGroup.get(formControlName)?.setValue(file as File);
      }
    }
  }
  getFileName(formControlName: string, index: number): string {
    const formGroup = this.variantFormGroups.at(index);
    const file = formGroup?.get(formControlName)?.value;

    return typeof file === "string" ? file : file?.name || "";
  }

  getUpdateFromFileName(formControlName: string, index: number): string {
    const formGroup = this.variantUpdateFormGroups.at(index);
    const file = formGroup?.get(formControlName)?.value;
    return typeof file === "string" ? file : file?.name || "";
  }
  hasError = (
    formControlName: string,
    index: number,
    errorName: string,
  ): boolean =>
    !!this.variantFormGroups
      ?.at(index)
      ?.get(formControlName)
      ?.hasError(errorName);
  objectToFormData(
    obj: any,
    formData: FormData = new FormData(),
    parentKey: string = "",
  ): FormData {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (value === undefined || value === null) {
          continue;
        }
        const fullKey = parentKey ? `${parentKey}[${key}]` : key;

        if (value instanceof File) {
          formData.append(fullKey, value);
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            continue;
          }
          this.objectToFormData(value, formData, fullKey);
        } else if (typeof value === "object") {
          this.objectToFormData(value, formData, fullKey);
        } else {
          formData.append(fullKey, value);
        }
      }
    }
    return formData;
  }

  appendVarients(
    cartesianProductAndPreLIstValues: Record<string, string>[],
    valueRow: Record<string, string[]> = {},
  ): void {
    const preSetValues = {
      sku: cartesianProductAndPreLIstValues["sku"] ?? "",
      externally_assigned_product_identifier___value:
        cartesianProductAndPreLIstValues[
          "externally_assigned_product_identifier___value"
        ] ?? "",
      externally_assigned_product_identifier___type:
        cartesianProductAndPreLIstValues[
          "externally_assigned_product_identifier___type"
        ] ?? "",
      // condition_type___value: cartesianProductAndPreLIstValues['condition_type___value'] ?? 'new_new',
      purchasable_offer___our_price___schedule___value_with_tax:
        cartesianProductAndPreLIstValues[
          "purchasable_offer___our_price___schedule___value_with_tax"
        ] ??
        this.formGroupTabTwo.get(
          "purchasable_offer___our_price___schedule___value_with_tax",
        )?.value ??
        "",
      fulfillment_availability___quantity:
        cartesianProductAndPreLIstValues[
          "fulfillment_availability___quantity"
        ] ?? 0,
      main_product_image_locator___media_location:
        cartesianProductAndPreLIstValues[
          "main_product_image_locator___media_location"
        ] ?? "",
    };
    cartesianProductAndPreLIstValues.map((row) => {
      Object.entries(row).forEach(([k, v]: [string, string]) => {
        valueRow[k] = [v];
      });
      const formGroup = this.fb.group({
        ...valueRow,
        sku: [preSetValues["sku"], Validators.required],
        externally_assigned_product_identifier___value: [
          preSetValues["externally_assigned_product_identifier___value"],
        ],
        externally_assigned_product_identifier___type: [
          preSetValues["externally_assigned_product_identifier___type"],
        ],
        // condition_type___value: [
        // preSetValues['condition_type___value']
        // ],
        purchasable_offer___our_price___schedule___value_with_tax: [
          // preSetValues['purchasable_offer___our_price___schedule___value_with_tax'],
          "",
          Validators.required,
        ],
        fulfillment_availability___quantity: [
          preSetValues["fulfillment_availability___quantity"],
          Validators.required,
        ],
        main_product_image_locator___media_location: [
          preSetValues["main_product_image_locator___media_location"],
          Validators.required,
        ],
      });
      this.variantFormGroups.push(formGroup);
    });
    this.varientsValus = cartesianProductAndPreLIstValues.map((row) => {
      // Remove the specified keys from each row
      const {
        sku,
        externally_assigned_product_identifier___value,
        externally_assigned_product_identifier___type,
        condition_type___value,
        purchasable_offer___our_price___schedule___value_with_tax,
        fulfillment_availability___quantity,
        main_product_image_locator___media_location,
        ...filteredRow
      } = row;

      return filteredRow; // Only keep the remaining properties
    });
  }
  extractPredefinedValues(
    cartesianProducts: Record<string, string>[],
  ): Record<string, string[]> {
    const predefValues: Record<string, Set<string>> = {};

    cartesianProducts.forEach((product) => {
      Object.entries(product).forEach(([key, value]) => {
        if (!predefValues[key]) {
          predefValues[key] = new Set();
        }
        predefValues[key].add(value);
      });
    });

    // Convert Sets to Arrays for final output
    return Object.fromEntries(
      Object.entries(predefValues).map(([key, valueSet]) => [
        key,
        Array.from(valueSet),
      ]),
    );
  }

  getImageSrc(index: number): string {
    const control = this.variantUpdateFormGroups.controls[index]?.get(
      "main_product_image_locator___media_location",
    );
    if (!control) {
      return "";
    }

    const value = control.value;

    // If it's already a URL, return it
    if (
      typeof value === "string" &&
      (value.startsWith("http://") || value.startsWith("https://"))
    ) {
      return value;
    }

    // If it's a File, convert it to Base64
    if (value instanceof File) {
      const fileName = value.name;

      // Return from cache if already converted
      if (this.imageCache[fileName]) {
        return this.imageCache[fileName];
      }
    }

    return "";
  }

  // Helper function to convert file to base64
  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
  handleUploadFileInputChange(
    files: FileList | null,
    formControlName: string,
    index: number,
  ): void {
    if (files && files.length > 0) {
      const file = files[0];
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.imageCache[file?.name] = reader.result as string;
          resolve(this.imageCache[file?.name]);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
      // Store the actual file object in the form control
      const formGroup = this.variantUpdateFormGroups.at(index);
      if (formGroup) {
        formGroup.get(formControlName)?.setValue(file as File);
      }
    }
  }

  editVariant(index: number): void {
    const formGroup = this.variantUpdateFormGroups.at(index) as FormGroup;
    if (formGroup && formGroup.controls) {
      const brand = this.formGroupTabOne.get("brand___value")?.value;
      if (brand && brand === "GENERIC") {
        Object.keys(formGroup.controls).forEach((item) => {
          if (
            [
              "externally_assigned_product_identifier___value",
              "externally_assigned_product_identifier___type",
            ].includes(item)
          ) {
            formGroup.get(item)?.disable();
          } else {
            formGroup.get(item)?.enable();
          }
        });
      } else {
        Object.keys(formGroup.controls).forEach((item) => {
          formGroup.get(item)?.enable();
        });
      }
    }
  }

  deleteVariant(index: number): void {
    this._commonConfirmationDialog(
      {
        title: "Delete Variant",
        message:
          "Are you sure you want to delete this variant? This action cannot be undone.",
        confirmText: "Delete",
      },
      () => {
        this.variantUpdateFormGroups.removeAt(index); // Remove from FormArray
        this.existingVarientsValus.splice(index, 1);
        this._changeDetectorRef.markForCheck(); // Trigger UI update
      },
    );
  }

  get isVariantEditMode(): boolean {
    const v = this.pageQueries["varient"];
    return !!(v && String(v).trim() && String(v).trim() !== "undefined");
  }

  get editContextLabel(): string {
    return this.isVariantEditMode
      ? `Variant · ${this.pageQueries["varient"]}`
      : "White Label Product";
  }

  onUpdateTabIndexChange(index: number): void {
    if (index === 2 && this.pageId) {
      this.clearVersionDiff();
      if (!this.versionHistoryLoaded && !this.versionsLoading) {
        this.loadVersionHistory();
      }
    }
  }

  clearVersionDiff(): void {
    this.versionDiff = null;
    this.selectedVersionNo = null;
    this.versionDiffLoading = false;
    this.isVersionTableCollapsed = false;
  }

  toggleVersionTable(): void {
    this.isVersionTableCollapsed = !this.isVersionTableCollapsed;
  }

  previewVersionDiff(
    versionNo: number,
    kind: "amz_white_label" | "amz_wl_update_attrs",
    against: "head" | "original" | "previous" = this.versionDiffAgainst,
  ): void {
    if (!this.pageId || !this.userInfo?.id) return;

    this.selectedVersionNo = versionNo;
    this.versionDiffKind = kind;
    this.versionDiffAgainst = against;
    this.versionDiffLoading = true;
    this.versionDiff = null;
    this.isVersionTableCollapsed = true;
    this._changeDetectorRef.markForCheck();

    this._inventoryService
      .getWhiteLabelVersionDiff(
        this.pageId,
        String(this.userInfo.id),
        versionNo,
        kind,
        against,
      )
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (res: any) => {
          this.versionDiffLoading = false;
          this.versionDiff = res?.data ?? null;
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.versionDiffLoading = false;
          this._utilService.onError("Could not load version diff.");
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  setVersionDiffAgainst(against: "head" | "original" | "previous"): void {
    if (this.selectedVersionNo == null) return;
    this.previewVersionDiff(
      this.selectedVersionNo,
      this.versionDiffKind,
      against,
    );
  }

  versionDiffRows(): WhiteLabelVersionFieldChange[] {
    return this.versionDiff?.changes ?? [];
  }

  versionDiffBaselineLabel(): string {
    if (!this.versionDiff) return "Current";
    if (this.versionDiff.against === "original") {
      return `Original (v${this.versionDiff.against_version_no ?? 1})`;
    }
    if (this.versionDiff.against === "previous") {
      return `Previous (v${this.versionDiff.against_version_no ?? "?"})`;
    }
    return `Current (v${this.versionDiff.against_version_no ?? "?"})`;
  }

  changeTypeLabel(type: string): string {
    if (type === "added") return "Added in version";
    if (type === "removed") return "Removed in version";
    return "Modified";
  }

  loadVersionHistory(): void {
    if (!this.pageId || !this.userInfo?.id) return;

    this.versionsLoading = true;
    const sellerId = String(this.userInfo.id);

    const loadKind = (kind: "amz_white_label" | "amz_wl_update_attrs") =>
      this._inventoryService
        .getWhiteLabelVersions(this.pageId, sellerId, kind)
        .toPromise()
        .then((res) => res?.data ?? [])
        .catch(() => [] as WhiteLabelVersionItem[]);

    Promise.all([loadKind("amz_white_label"), loadKind("amz_wl_update_attrs")])
      .then(([wlVersions, updVersions]) => {
        this.whiteLabelVersions = wlVersions;
        this.updateAttrVersions = updVersions;
        this.versionsLoading = false;
        this.versionHistoryLoaded = true;
        this._changeDetectorRef.markForCheck();
      })
      .catch(() => {
        this.whiteLabelVersions = [];
        this.updateAttrVersions = [];
        this.versionsLoading = false;
        this.versionHistoryLoaded = true;
        this._changeDetectorRef.markForCheck();
      });
  }

  formatBlobSize(bytes: number): string {
    if (!bytes || bytes <= 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  shortSha256(hash: string): string {
    if (!hash || hash.length < 12) return hash || "—";
    return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
  }

  goBackPage(): void {
    this._location.back();
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
