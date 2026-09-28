import { GeneralSettingService } from "../../../core/general-setting/general-setting.service";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { FuseUtilsService } from "@fuse/services/utils";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { Constants } from "app/shared/constants";
import { Subject, takeUntil, finalize } from "rxjs";
import { NavigationService } from "app/core/navigation/navigation.service";

@Component({
  standalone: false,
  selector: "app-general-setting",
  templateUrl: "./general-setting.component.html",
  styleUrls: ["./general-setting.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettingComponent implements OnInit, OnDestroy {
  marketPlaceFormGroup: FormGroup;
  isLoading = false;
  isSuperAdmin: boolean = false;
  marketPlaceId = "";
  repricerMode: boolean;
  amzStatus: number;
  tooltip = Constants.generalSettingDetails;
  rolePermission: any = {};
  updateStatusConfirm: FormGroup;
  isFormVisible = false;
  marketplaceData: any[] = [];
  seller: any;
  marketplaceConstants = Constants.amazonMarketplaces;
  private _marketplaceMap: Map<string, any> = new Map(
    Constants.amazonMarketplaces.map((m) => [m.id, m]),
  );
  imporsonatePageId: any;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _formBuilder: FormBuilder,
    private _generalSettingService: GeneralSettingService,
    private _utilService: FuseUtilsService,
    private _confirmationService: FuseConfirmationService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _activeRoute: ActivatedRoute,
    private _userSessionService: UserSessionsService,
    private _navigationService: NavigationService,
    private _ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this._navigationService.isSuperAdmin;
    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this._ngZone.run(() => {
          this.rolePermission = this._navigationService.getPermissionByRoute(
            data,
            "/master/general-setting",
          );
          this._changeDetectorRef.markForCheck();
        });
      });
    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this._ngZone.run(() => {
          if (
            !this.rolePermission ||
            !Object.keys(this.rolePermission).length
          ) {
            this.rolePermission = this._navigationService.getPermissionByRoute(
              data,
              "/master/general-setting",
            );
            this._changeDetectorRef.markForCheck();
          }
        });
      });
    this._activeRoute.params
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this._ngZone.run(() => {
          this.seller = this._userSessionService.getCurrentUser();
          this._changeDetectorRef.markForCheck();
        });
      });
    this._userSessionService.currentSellerId$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this._ngZone.run(() => {
          if (data) {
            this.imporsonatePageId = data;
          } else {
            this.imporsonatePageId = null;
          }
          this.seller = this._userSessionService.getCurrentUser();
          if (this.seller) {
            this.getMarketplaceById();
          }
          this._changeDetectorRef.markForCheck();
        });
      });
    this.marketPlaceFormGroup = this._formBuilder.group({
      amz_margin_mode: new FormControl("FIX", Validators.required),
      amz_product_type: new FormControl("retail", Validators.required),
      amz_fullfillment_by: new FormControl("FBM", Validators.required),
      amz_margin: new FormControl(0, Validators.required),
      amz_handling_time: new FormControl(1, [
        Validators.required,
        Validators.min(1),
        Validators.max(50),
      ]),
      marketplaces: this._formBuilder.array([]),
    });
    this.updateStatusConfirm = this._utilService.confirmMessage(
      "Confirmation",
      "Are you sure you want to enable/disable amazon marketplace?",
      "Yes",
    );
  }

  ngOnDestroy(): void {
    this.isFormVisible = false;
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  updateSettingBySeller(): void {
    if (this.marketPlaceFormGroup.invalid || this.isLoading) {
      return;
    }

    const sellerId = this.seller?.id || this.seller?._id;
    if (!sellerId) {
      return;
    }

    // Get the marketPlace object
    const formData = this.marketPlaceFormGroup.getRawValue();
    formData.marketplaces = this.marketplaces.value.map((marketplace) => ({
      marketplace_name: marketplace.marketplace_name,
      shipping_config: marketplace.shipping_config,
      shipping_rate: marketplace.shipping_rate ?? 0,
    }));

    this.isLoading = true;
    this._generalSettingService
      .updateSetting(sellerId, formData)
      .pipe(
        takeUntil(this._unsubscribeAll),
        finalize(() => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe(
        () => {
          this._utilService.onSuccess("Setting has been updated successfully.");
          this.getMarketplaceById();
        },
        ({ error }) => {
          this._utilService.onError(
            error?.message ||
              (typeof error === "string" ? error : "An error occurred"),
          );
        },
      );
  }

  getMarketplaceById(): void {
    const sellerId = this.seller?.id || this.seller?._id;
    if (!sellerId) {
      return;
    }
    this.isLoading = true;
    this._generalSettingService
      .getSettingBySellerId(sellerId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (data: any) => {
          this.isLoading = false;
          if (data?.status === 200) {
            if (data?.data?.length > 0) {
              this.isFormVisible = true;
              this.amzStatus = data.data[0].amz_status;

              // Adjust validation constraints depending on database value before patching
              const marginControl = this.marketPlaceFormGroup.get("amz_margin");
              if (marginControl && data.data[0].amz_margin_mode) {
                marginControl.clearValidators();
                if (data.data[0].amz_margin_mode === "PERCENTAGE") {
                  marginControl.setValidators([
                    Validators.required,
                    Validators.min(0),
                    Validators.max(100),
                  ]);
                } else {
                  marginControl.setValidators([
                    Validators.required,
                    Validators.min(0),
                    Validators.max(1000),
                  ]);
                }
                marginControl.updateValueAndValidity();
              }

              this.marketPlaceFormGroup.patchValue(data.data[0]);
              this.manageMarketplaces(data.data[0].marketplaces);
            } else {
              this.isFormVisible = false;
            }
          }
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  // Getter for marketplaces FormArray
  get marketplaces(): FormArray {
    return this.marketPlaceFormGroup.get("marketplaces") as FormArray;
  }

  // Method to add a new marketplace
  manageMarketplaces(marketPlaceList) {
    // first clear the marketplaces
    this.marketplaces.clear();
    for (let i = 0; i < marketPlaceList.length; i++) {
      const marketplaceGroup = this._formBuilder.group({
        marketplace_name: new FormControl(
          marketPlaceList[i].marketplace_name,
          Validators.required,
        ),
        shipping_config: new FormControl(
          marketPlaceList[i].shipping_config,
          Validators.required,
        ),
        shipping_rate: new FormControl(marketPlaceList[i].shipping_rate),
      });

      this.marketplaces.push(marketplaceGroup);
    }
  }

  // Submit the form (just for testing, can be linked to API)
  stopScrollingWheel(e): void {
    return e.target.blur();
  }

  getStatus(status): any {
    if (status === 1) {
      return true;
    } else {
      return false;
    }
  }

  toggleCompleted(event): void {
    const sellerId = this.seller?.id || this.seller?._id;
    if (!sellerId) {
      return;
    }
    const dialogRef = this._confirmationService.open(
      this.updateStatusConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._generalSettingService
            .updateSetting(sellerId, {
              amz_status: event.source.checked ? 1 : 0,
            })
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.amzStatus = event.source.checked ? 1 : 0;
                this._changeDetectorRef.markForCheck();
                this._utilService.onSuccess(
                  "Status has been updated successfully!",
                );
              },
              (error) => {
                this._utilService.onError(
                  error?.message ||
                    (typeof error === "string"
                      ? error
                      : "Unable to update status"),
                );
                this._changeDetectorRef.markForCheck();
              },
            );
        } else {
          event.source.checked = !event.source.checked;
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  onMarginInput(event: any, type: any): void {
    const input = event.target as HTMLInputElement;

    // Ensure the value is not negative
    let value = input.value;

    if (value.startsWith("-")) {
      value = value.replace("-", ""); // Remove the negative sign
    }

    // Ensure the value doesn't exceed 4 characters
    if (value.length > 4) {
      value = value.slice(0, 4);
    }

    // Update the input and form control value
    input.value = value;
    this.marketPlaceFormGroup.get(type)?.setValue(value);
  }

  getOriginalCountyNameAndCurrency(marketplaceID: string): string {
    if (marketplaceID) {
      const marketplace = this._marketplaceMap.get(marketplaceID);
      return marketplace
        ? ` ${marketplace.countryName}(${marketplace.currency})`
        : "-";
    }
    return "-";
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
