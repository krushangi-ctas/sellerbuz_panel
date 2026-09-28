import { FuseUtilsService } from "@fuse/services/utils";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { OverlayRef } from "@angular/cdk/overlay";
import { MatDrawerToggleResult } from "@angular/material/sidenav";
import { Subject, takeUntil, finalize } from "rxjs";
import * as moment from "moment";
import { SellersListComponent } from "../list/list.component";
import { UserService } from "app/core/user/user.service";
import { User } from "app/core/user/user.types";
import { environment } from "environments/environment";
import { NavigationService } from "app/core/navigation/navigation.service";
import { PortalService } from "app/core/portal/portal.service";
import { PlanService } from "app/core/manage-plan/plan.service";
import { Currency } from "app/core/manage-plan/plan.model";

@Component({
  standalone: false,
  selector: "contacts-details",
  templateUrl: "./details.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      "flex flex-col flex-auto w-full h-full min-h-full bg-white dark:bg-gray-900",
  },
})
export class SellerDetailsComponent implements OnInit, OnDestroy {
  editMode: boolean = false;
  tagsEditMode: boolean = false;
  sellerForm: FormGroup;
  seller: any;
  imgPath = environment.uploadPath;
  btnDisable: boolean;
  isLoading: boolean;
  isAdd: boolean = false;
  userId: any;
  permissionGuard: any = {};
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  private _tagsPanelOverlayRef: OverlayRef;
  planList: any[] = [];
  shopList: any[] = [];
  selectedPlan: any;
  selectedShop: any;
  shopDynamicFields: any[] = [];
  dynamicFieldsForm: FormGroup;
  portalList: any[] = [];
  countries: Currency[] = [];
  countriesLoading = true;
  countryFilterCtrl: FormControl = new FormControl("");
  filteredCountries: Currency[] = [];

  shopFilterCtrl: FormControl = new FormControl("");
  filteredPortalList: any[] = [];

  planFilterCtrl: FormControl = new FormControl("");
  filteredPlanList: any[] = [];

  private _leadData: any = null;

  /**
   * Constructor
   */
  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _SellersListComponent: SellersListComponent,
    private _activatedRoute: ActivatedRoute,
    private _userService: UserService,
    private _utilService: FuseUtilsService,
    private _router: Router,
    private _formBuilder: FormBuilder,
    private _navigationService: NavigationService,
    private _portalService: PortalService,
    private _planService: PlanService,
    private router: Router,
  ) {
    // Detect if we are in "Add" mode immediately to avoid race conditions with seller$
    this.isAdd = this._router.url.includes("/add");

    // Check for lead data from router state (when creating seller from lead)
    const navigation = this._router.getCurrentNavigation();
    this._leadData =
      navigation?.extras?.state?.leadData ||
      window.history.state?.leadData ||
      null;
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (
          data &&
          data?.permissions &&
          Array.isArray(data?.permissions) &&
          data?.permissions.find((item: any) => item.section_name === "Sellers")
        ) {
          this.permissionGuard = data?.permissions.find(
            (item) => item.section_name === "Sellers",
          );
        }
      });
    // Open the drawer
    this._SellersListComponent.matDrawer.open();

    // Create the contact form
    this.sellerForm = this._formBuilder.group({
      first_name: new FormControl("", [
        Validators.required,
        Validators.maxLength(20),
      ]),
      last_name: new FormControl("", [
        Validators.required,
        Validators.maxLength(20),
      ]),
      contact_no: new FormControl("", [
        Validators.required,
        Validators.pattern("^[0-9]{10}$"), // validate 10 digit number
      ]),
      email: new FormControl("", [Validators.required, Validators.email]),
      business_address: new FormControl(""), // Business Address
      currency_id: new FormControl("", Validators.required), // Country from get-currencies API (stores MongoDB ID)
      country_name: new FormControl(""), // Display name for selected country
      portal_id: new FormControl("", Validators.required),
      // Optional subscription (admin managed) — shown via "Assign Plan" checkbox
      assign_plan: new FormControl(false),
      plan_id: new FormControl(""),
      billing_cycle: new FormControl("monthly"),
      payment_method: new FormControl("manual"),
      start_date: new FormControl(moment()),
    });

    // Listen to currency_id changes to keep country_name in sync
    this.sellerForm
      .get("currency_id")
      ?.valueChanges.pipe(takeUntil(this._unsubscribeAll))
      .subscribe((value) => {
        if (value && this.countries.length > 0) {
          const matchedCountry = this.countries.find(
            (c) => String(c.id || c._id) === String(value),
          );
          if (matchedCountry) {
            this.sellerForm.patchValue(
              {
                country_name:
                  matchedCountry.country || matchedCountry.currency || "",
              },
              { emitEvent: false },
            );
          }
        }
      });

    // Pre-clear any stale seller so ReplaySubject has nothing to emit
    // before isAdd is set — prevents the millisecond flash of old data.
    this._userService.clearSeller();

    // Load countries for dropdown first, then handle route params
    this.loadCountries(() => {
      this._activatedRoute.paramMap
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((params) => {
          const id = params.get("id");

          const isEditUrl = this._router.url.includes("/edit/");

          if (id && id !== "add") {
            // EDIT
            this.isAdd = false;
            this.editMode = isEditUrl;
            this.isLoading = true;

            this._userService
              .getSellerById(id)
              .pipe(takeUntil(this._unsubscribeAll))
              .subscribe({
                next: () => {
                  this.isLoading = false;
                  this._changeDetectorRef.markForCheck();
                },
                error: () => {
                  this.isLoading = false;
                  this._changeDetectorRef.markForCheck();
                },
              });
          } else {
            // ADD
            this.isAdd = true;
            this.editMode = true;
            this.isLoading = false;

            this.seller = null;

            // If lead data exists, pre-fill form instead of resetting to empty
            if (this._leadData) {
              this.patchLeadData(this._leadData);
            } else {
              this.sellerForm.reset({
                first_name: "",
                last_name: "",
                email: "",
                contact_no: "",
                business_address: "",
                currency_id: "",
                country_name: "",
                assign_plan: false,
                plan_id: "",
                billing_cycle: "monthly",
                payment_method: "manual",
                start_date: moment(),
              });
            }

            this._changeDetectorRef.markForCheck();
          }
        });

      // Subscribe to seller$ INSIDE loadCountries callback so that isAdd is
      // already correctly set when the ReplaySubject replays its last value.
      // This prevents old seller data from briefly appearing in Add mode.
      this._userService.seller$
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((user: User) => {
          if (!user || this.isAdd) {
            return;
          }

          this.seller = user;
          const latestSub = user.subscriptions?.length
            ? user.subscriptions[user.subscriptions.length - 1]
            : null;

          let currencyId = user.currency_id || "";
          if (currencyId && typeof currencyId === "object") {
            currencyId =
              (currencyId as any)._id || (currencyId as any).id || "";
          }
          if (!currencyId && user.country_name && this.countries.length > 0) {
            const matchedCountry = this.countries.find(
              (c) =>
                String(c.country || "")
                  .trim()
                  .toLowerCase() ===
                  String(user.country_name).trim().toLowerCase() ||
                String(c.currency || "")
                  .trim()
                  .toLowerCase() ===
                  String(user.country_name).trim().toLowerCase(),
            );
            if (matchedCountry) {
              currencyId = matchedCountry.id || matchedCountry._id || "";
            }
          }

          this.sellerForm.patchValue({
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            email: user.email || "",
            contact_no: user.contact_no || "",
            business_address: user.business_address || "",
            currency_id: currencyId,
            country_name: user.country_name || "",
            portal_id: user.portal_id || "",
            assign_plan: false,
            plan_id: "",
            billing_cycle: "monthly",
            payment_method: "manual",
            start_date: moment(),
          });

          this.editMode = this._router.url.includes("/edit/");
          this.isLoading = false;

          this._changeDetectorRef.markForCheck();
        });
    });

    // Load plans for selection
    this.loadPlans();
    this.loadPortals();

    // Conditional validation: subscription fields are required only when
    // "Assign Plan" is checked. When unchecked, the existing seller-only
    // behavior is preserved.
    this.sellerForm
      .get("assign_plan")
      ?.valueChanges.pipe(takeUntil(this._unsubscribeAll))
      .subscribe((checked: boolean) => {
        const planCtrl = this.sellerForm.get("plan_id");
        const cycleCtrl = this.sellerForm.get("billing_cycle");
        const methodCtrl = this.sellerForm.get("payment_method");

        if (checked) {
          planCtrl?.setValidators([Validators.required]);
          cycleCtrl?.setValidators([Validators.required]);
          methodCtrl?.setValidators([Validators.required]);
        } else {
          planCtrl?.clearValidators();
          cycleCtrl?.clearValidators();
          methodCtrl?.clearValidators();
        }

        planCtrl?.updateValueAndValidity();
        cycleCtrl?.updateValueAndValidity();
        methodCtrl?.updateValueAndValidity();
        this._changeDetectorRef.markForCheck();
      });

    // Listen to plan field changes
    this.sellerForm
      .get("plan_id")
      ?.valueChanges.pipe(takeUntil(this._unsubscribeAll))
      .subscribe((value) => {
        if (value && this.planList.length > 0) {
          this.selectedPlan =
            this.planList.find(
              (plan) => String(plan._id || plan.id) === String(value),
            ) || null;

          // Restrict the billing cycle to the plan's available options.
          const allowedCycles = this.billingCycleOptions;
          if (allowedCycles.length === 1) {
            this.sellerForm.get("billing_cycle")?.setValue(allowedCycles[0]);
          }
        } else {
          this.selectedPlan = null;
        }

        this._changeDetectorRef.markForCheck();
      });
  }
  loadPortals(): void {
    this._portalService
      .portalNameList()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          if (res?.status === 200) {
            this.portalList = res.data || [];
            this.filteredPortalList = [...this.portalList];

            // Default Amazon selection while adding seller
            if (this.isAdd) {
              const amazonPortal = this.portalList.find(
                (x: any) => x.portal_name === "Amazon",
              );

              if (amazonPortal) {
                this.sellerForm.patchValue({
                  portal_id: amazonPortal.id,
                });
              }
            }

            this._changeDetectorRef.markForCheck();
          }
        },
        error: (err) => {
          console.error(err);
        },
      });
  }

  loadCountries(callback?: () => void): void {
    this.countriesLoading = true;
    this._planService.getCurrencies().subscribe({
      next: (res: any) => {
        this.countriesLoading = false;
        if (
          (res?.status === 1 || res?.status === 200) &&
          Array.isArray(res.data)
        ) {
          this.countries = res.data.map((c: any) => ({
            ...c,
            id: c.id || c._id,
          }));
          this.filteredCountries = [...this.countries];
        }
        this._changeDetectorRef.markForCheck();
        if (callback) {
          callback();
        }
      },
      error: () => {
        this.countriesLoading = false;
        this._changeDetectorRef.markForCheck();
        if (callback) {
          callback();
        }
      },
    });
  }

  private patchLeadData(leadData: any): void {
    // Find currency by matching country_name with currency.country or currency.currency
    let currencyId = leadData.currency_id || "";
    let countryName = leadData.country_name || "";

    if (!currencyId && leadData.country_name && this.countries.length > 0) {
      const matchedCountry = this.countries.find(
        (c) =>
          c.country?.toLowerCase() === leadData.country_name.toLowerCase() ||
          c.currency?.toLowerCase() === leadData.country_name.toLowerCase(),
      );
      if (matchedCountry) {
        currencyId = matchedCountry.id || matchedCountry._id || "";
        countryName = matchedCountry.country || matchedCountry.currency || "";
      }
    }
    const hasPlan = leadData.plan_id ? true : false;
    this.sellerForm.patchValue({
      first_name: leadData.first_name || "",
      last_name: leadData.last_name || "",
      email: leadData.email || "",
      contact_no: leadData.contact_number || "",
      business_address: leadData.business_address || "",
      currency_id: currencyId,
      country_name: countryName,
      assign_plan: hasPlan,
      plan_id: leadData.plan_id || "",
      billing_cycle: leadData.billing_cycle || "monthly",
      payment_method: "manual",
      start_date: moment(),
    });
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();

    // Dispose the overlays if they are still on the DOM
    if (this._tagsPanelOverlayRef) {
      this._tagsPanelOverlayRef.dispose();
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Close the drawer
   */
  closeDrawer(): Promise<MatDrawerToggleResult> {
    this.router.navigate(["/master/seller"]);
    return this._SellersListComponent.matDrawer.close();
  }

  /**
   * Toggle edit mode
   *
   * @param editMode
   */
  toggleEditMode(editMode: boolean | null = null): void {
    if (editMode === null) {
      this.editMode = !this.editMode;
    } else {
      this._userService.seller$
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((user: User) => {
          if (user) {
            this.seller = user;
            this.sellerForm.patchValue(this.seller);
          }
        });
      this.editMode = editMode;
    }

    // Mark for check
    this._changeDetectorRef.markForCheck();
  }
  get canView(): boolean {
    if (this._navigationService.isSuperAdmin) {
      return true;
    }
    if (
      typeof this.permissionGuard === "object" &&
      Array.isArray(this.permissionGuard) &&
      !Object.keys(this.permissionGuard).length
    ) {
      return true;
    } else if (this.permissionGuard && "view" in this.permissionGuard) {
      return Boolean(this.permissionGuard?.["view"]);
    }
    return true;
  }
  get canUpdate(): boolean {
    if (this._navigationService.isSuperAdmin) {
      return true;
    }
    if (
      typeof this.permissionGuard === "object" &&
      Array.isArray(this.permissionGuard) &&
      !Object.keys(this.permissionGuard).length
    ) {
      return true;
    } else if (this.permissionGuard && "update" in this.permissionGuard) {
      return Boolean(this.permissionGuard?.["update"]);
    }
    return true;
  }
  get canDelete(): boolean {
    if (this._navigationService.isSuperAdmin) {
      return true;
    }
    if (
      typeof this.permissionGuard === "object" &&
      Array.isArray(this.permissionGuard) &&
      !Object.keys(this.permissionGuard).length
    ) {
      return true;
    } else if (this.permissionGuard && "delete" in this.permissionGuard) {
      return Boolean(this.permissionGuard?.["delete"]);
    }
    return true;
  }
  get canAdd(): boolean {
    if (this._navigationService.isSuperAdmin) {
      return true;
    }
    if (
      typeof this.permissionGuard === "object" &&
      Array.isArray(this.permissionGuard) &&
      !Object.keys(this.permissionGuard).length
    ) {
      return true;
    } else if (this.permissionGuard && "add" in this.permissionGuard) {
      return Boolean(this.permissionGuard?.["add"]);
    }
    return true;
  }
  /**
   * Update the contact
   */
  addUpdateSelectedUser(id: string): void {
    if (this.sellerForm.invalid || this.btnDisable) {
      return;
    }

    // Check if dynamic fields form is valid (only for new sellers)
    if (
      this.isAdd &&
      this.dynamicFieldsForm &&
      this.dynamicFieldsForm.invalid
    ) {
      this._utilService.onError(
        "Please fill all required shop-specific fields!",
      );
      return;
    }

    this.btnDisable = true;
    const formData = this.sellerForm.getRawValue();

    // Include dynamic fields data if available
    if (this.dynamicFieldsForm) {
      formData.shop_dynamic_fields = this.dynamicFieldsForm.value;
    }

    // Build the subscription payload — plan fields are only sent when
    // "Assign Plan" is checked and (for edits) the selection actually changed.
    this.buildSubscriptionPayload(formData);
    const targetId = id || this.seller?._id || this.seller?.id;

    if (!this.isAdd && targetId) {
      this._userService
        .updateUser(targetId, formData)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisable = false;
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe(
          (newData: any) => {
            this._utilService.onSuccess(
              "Seller has been updated successfully.",
            );
            this._SellersListComponent.fetchSellersList();
            this.closeDrawer();

            this._router.navigate(["/master/seller"]);
          },
          ({ error }) => {
            this._utilService.onError(
              error?.message ||
                error?.error?.message ||
                "Failed to update seller",
            );
          },
        );
    } else {
      this._userService
        .addUser(formData)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisable = false;
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe(
          (t) => {
            this._utilService.onSuccess("Seller has been added successfully.");
            this._SellersListComponent.fetchSellersList();
            this.sellerForm.reset();
            this.closeDrawer();

            this._router.navigate(["/master/seller"]);
          },
          ({ error }) => {
            this._utilService.onError(
              error?.message || error?.error?.message || "Failed to add seller",
            );
          },
        );
    }
  }

  /**
   * Toggle the tags edit mode
   */
  toggleTagsEditMode(): void {
    this.tagsEditMode = !this.tagsEditMode;
  }
  /**
   * Track by function for ngFor loops
   *
   * @param index
   * @param item
   */
  trackByFn(index: number, item: any): any {
    return item._id || item.id || index;
  }

  loadPlans(): void {
    // Reuse the Plan service — loads via GET /manage-plan/plan-list.
    this._planService
      .getAllPlan()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          if (res?.status === 200 && Array.isArray(res.data)) {
            // Only active plans (status === 1)
            this.planList = res.data.filter(
              (plan: any) => Number(plan.status) === 1,
            );
            this.filteredPlanList = [...this.planList];
            this.syncSelectedPlan();
          } else {
            console.error(
              "Failed to load plans - invalid response structure:",
              res,
            );
          }
          this._changeDetectorRef.markForCheck();
        },
        error: (error) => {
          console.error("HTTP Error loading plans:", error);
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  get activePlanList(): any[] {
    return this.planList;
  }

  get billingCycleOptions(): string[] {
    const interval = (this.selectedPlan?.interval || "")
      .toString()
      .toLowerCase();
    if (interval === "month" || interval === "monthly") {
      return ["monthly"];
    }
    if (interval === "quarterly") {
      return ["quarterly"];
    }
    return ["monthly", "quarterly"];
  }

  /**
   * Re-sync the selected plan card after the plan list loads or an edit
   * prefill sets plan_id before the plans were fetched.
   */
  syncSelectedPlan(): void {
    const planId = this.sellerForm.get("plan_id")?.value;
    this.selectedPlan =
      planId && this.planList.length
        ? this.planList.find(
            (plan) => String(plan._id || plan.id) === String(planId),
          ) || null
        : null;

    // If the plan supports only one cycle, force the form to it (edit prefill).
    const allowedCycles = this.billingCycleOptions;
    if (allowedCycles.length === 1) {
      this.sellerForm.get("billing_cycle")?.setValue(allowedCycles[0]);
    }

    this._changeDetectorRef.markForCheck();
  }

  /**
   * Get the selected plan price formatted for the current billing cycle.
   * Prices/currency come from the Plan API response — never editable.
   */
  getSelectedPlanPrice(): string {
    const plan = this.selectedPlan;
    if (!plan) return "";

    const cycle = this.sellerForm.get("billing_cycle")?.value || "monthly";
    const price = cycle === "quarterly" ? plan.price_quarterly : plan.price;
    const currency = (plan.currency || "inr").toUpperCase();
    const period = cycle === "quarterly" ? "quarter" : "month";

    return `${this.fromCent(price)} ${currency} / ${period}`;
  }

  fromCent(amount: any): number | any {
    return typeof amount === "number" ? (amount / 100).toFixed(2) : amount;
  }

  getSelectedPlanFeatures(): string[] {
    return this.selectedPlan?.marketing_features || [];
  }

  /**
   * Prepare the create/update payload for the optional subscription.
   *
   * Assign Plan OFF → no subscription fields (existing behavior).
   * Assign Plan ON  → plan_id/billing_cycle/payment_method/start_date.
   * On edit, plan fields are omitted when unchanged so saving a seller's
   * basic info never re-grants or renews their subscription.
   */
  private buildSubscriptionPayload(payload: any): void {
    const assignPlan = payload.assign_plan === true;

    delete payload.assign_plan;

    if (!assignPlan || !payload.plan_id) {
      delete payload.plan_id;
      delete payload.billing_cycle;
      delete payload.payment_method;
      delete payload.start_date;
      return;
    }

    payload.billing_cycle = payload.billing_cycle || "monthly";
    payload.payment_method = payload.payment_method || "manual";
    payload.start_date = this.formatDate(payload.start_date) || null;
  }

  private formatDate(value: any): string | null {
    if (!value) return null;
    const date =
      typeof value === "string"
        ? new Date(value)
        : value?.toDate
          ? value.toDate()
          : value;
    if (!date || isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  filterCountries(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === "") {
      this.filteredCountries = [...this.countries];
    } else {
      const lower = searchTerm.toLowerCase();
      this.filteredCountries = this.countries.filter(
        (c) =>
          (c.country && c.country.toLowerCase().includes(lower)) ||
          (c.currency && c.currency.toLowerCase().includes(lower)),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  triggerCountryEvent(): void {
    this.filteredCountries = [...this.countries];
    this.countryFilterCtrl.setValue("");
  }

  filterShops(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === "") {
      this.filteredPortalList = [...this.portalList];
    } else {
      const lower = searchTerm.toLowerCase();
      this.filteredPortalList = this.portalList.filter(
        (p) => p.portal_name && p.portal_name.toLowerCase().includes(lower),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  triggerShopEvent(): void {
    this.filteredPortalList = [...this.portalList];
    this.shopFilterCtrl.setValue("");
  }

  filterPlans(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === "") {
      this.filteredPlanList = [...this.activePlanList];
    } else {
      const lower = searchTerm.toLowerCase();
      this.filteredPlanList = this.activePlanList.filter(
        (p) => p.name && p.name.toLowerCase().includes(lower),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  triggerPlanEvent(): void {
    this.filteredPlanList = [...this.activePlanList];
    this.planFilterCtrl.setValue("");
  }
}
