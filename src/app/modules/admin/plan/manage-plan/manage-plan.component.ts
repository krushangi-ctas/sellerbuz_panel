import { takeUntil } from "rxjs";
import { Location } from "@angular/common";
import {
  ChangeDetectorRef,
  Component,
  HostListener,
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
import { ActivatedRoute, Router } from "@angular/router";
import { fuseAnimations } from "@fuse/animations";
import { FuseUtilsService } from "@fuse/services/utils";
import {
  CreatePlan,
  Currency,
  Feature,
  Plan,
} from "app/core/manage-plan/plan.model";
import { PlanService } from "app/core/manage-plan/plan.service";
import _ from "lodash";
import {
  combineLatest,
  map,
  Observable,
  startWith,
  Subject,
  finalize,
} from "rxjs";

@Component({
  standalone: false,
  selector: "app-manage-plan",
  templateUrl: "./manage-plan.component.html",
  animations: fuseAnimations,
})
export class ManagePlanComponent implements OnInit, OnDestroy {
  btnDisable: boolean = false;
  planFormGroup: FormGroup = null;
  isLoading: boolean = false;
  planId = "";
  sections: any[];
  selectedSection = [];
  planFormInput: Observable<Plan[]>;
  featurList: Observable<Feature[]>;
  currencyList: Currency[] = [{ code: "usd", currency: "USD" }];
  featureIds: { [key: string]: string[] } = {};
  featureSearchCtrl: FormControl = new FormControl("");
  filteredFeatures$: Observable<Feature[]>;
  allFeatures: Feature[] = [];
  planData: any = null;

  private _unsubscribeAll: Subject<any> = new Subject<void>();

  constructor(
    private _planService: PlanService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _route: ActivatedRoute,
    private _location: Location,
    private _router: Router,
    private _utilSevice: FuseUtilsService,
    private fb: FormBuilder,
  ) {
    this.featurList = this._planService.features$;
    this._planService.features$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  ngOnInit(): void {
    this.planFormGroup = this.fb.group({
      name: ["", [Validators.required, Validators.maxLength(20)]],
      desc: ["", [Validators.maxLength(300)]],
      price: [
        0,
        [
          Validators.required,
          Validators.min(1),
          Validators.pattern("^[0-9]{1,10}(\\.[0-9]{1,2})?$"), // Limits whole number up to 10 digits
        ],
      ],
      currency: ["usd", Validators.required],
      interval: ["month", Validators.required],
      trial_days: [14, [Validators.required, Validators.min(0)]],
      is_custom_plan: [false],
      is_popular: [false],
      discount: [0, [Validators.min(0), Validators.max(100)]],
      price_yearly: [{ value: 0, disabled: true }],
      quarterly_price: [{ value: 0, disabled: true }],
      marketing_features: this.fb.array([]),
      features: this.fb.array([]),
    });

    // Calculate prices when price, discount or interval changes
    this.planFormGroup
      .get("price")
      .valueChanges.pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.calculatePrices();
      });

    this.planFormGroup
      .get("discount")
      .valueChanges.pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.calculatePrices();
      });

    this.planFormGroup
      .get("interval")
      .valueChanges.pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.calculatePrices();
      });

    this.featurList
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((features) => {
        if (!features) return;
        this.allFeatures = features;
        this.buildFeatureFormArray();
      });

    if (this._route.snapshot.paramMap.get("id")) {
      this.planId = this._route.snapshot.paramMap.get("id") || "";
      this.isLoading = true;

      this._planService
        .getPlanById(this.planId)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (res: any) => {
            this.isLoading = false;
            if (res.status === 200) {
              this.planData = res.data;
              this.patchPlan(res.data);
              this.buildFeatureFormArray(true);
            }
            this._changeDetectorRef.markForCheck();
          },
          error: () => {
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
          },
        });
    } else {
      this.isLoading = false;
      this.buildFeatureFormArray();
    }
  }
  get marketingFeatures(): FormArray {
    return this.planFormGroup.get("marketing_features") as FormArray;
  }

  get featureList(): FormArray {
    return this.planFormGroup.get("features") as FormArray;
  }

  addMarketingFeature(): void {
    this.marketingFeatures.push(this.fb.control("", Validators.required));
  }

  removeMarketingFeature(index: number): void {
    this.marketingFeatures.removeAt(index);
  }

  // Feature rows managed via checkbox list

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  fillDataForEdit(data: Plan) {
    this.planFormGroup.patchValue({
      price_cents: _.get(data, "price_cents", ""),
      currency: `${_.get(data, "currency")}|${_.get(data, "currency_id")}`,
      interval: _.get(data, "interval", ""),
      interval_count: _.get(data, "interval_count", ""),
      name: _.get(data, "name", ""),
      is_custom_plan: _.get(data, "is_custom_plan", false),
      is_popular: _.get(data, "is_popular", false),
    });

    // Load shop data from database with proper plan ID
    console.log("Loading shop data for plan:", this.planId);
  }
  addPlan(): void {
    if (this.planFormGroup.invalid || this.btnDisable) {
      this.planFormGroup.markAllAsTouched();
      return;
    }

    this.btnDisable = true;
    const rawValue = this.planFormGroup.getRawValue();
    const payload: CreatePlan = {
      ...rawValue,
      price_quarterly: rawValue.price_quarterly || 0,
      features: (rawValue.features || [])
        .filter((f: any) => f.checked)
        .map((f: any) => ({
          feature_id: f.feature_id,
          usage_count: f.usage_count,
        })),
    };
    if (!this.planId) {
      payload.trial_days = 0;
    }

    if (!this.planId) {
      this._planService
        .addPlan(payload)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisable = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: (res: any) => {
            this._utilSevice.onSuccess(res.message);
            this._router.navigate(["master/manage-plan"]);
          },
          error: (err) => {
            this._utilSevice.onError(
              err?.error?.message || "Something went wrong",
            );
          },
        });
    } else {
      this._planService
        .updatePlan(payload, this.planId)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisable = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: (res: any) => {
            this._utilSevice.onSuccess(res.message);
            this._router.navigate(["master/manage-plan"]);
          },
          error: (err) => {
            this._utilSevice.onError(
              err?.error?.message || "Something went wrong",
            );
          },
        });
    }
  }

  stopScrollingWheel(e: any): void {
    return e.target.blur();
  }

  goBack(): void {
    this._location.back();
  }
  patchPlan(plan: any): void {
    this.planFormGroup.patchValue({
      name: plan.name,
      desc: plan.desc,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      trial_days: plan.trial_days,
      is_custom_plan: plan.is_custom_plan,
      is_popular: plan.is_popular,
      discount: plan.discount || 0,
      price_yearly: plan.price_yearly || 0,
      quarterly_price: plan.price_quarterly || 0,
    });
    this.calculatePrices();

    if (plan.marketing_features?.length) {
      plan.marketing_features.forEach((feature: string) => {
        this.marketingFeatures.push(this.fb.control(feature));
      });
    }
  }

  buildFeatureFormArray(force: boolean = false): void {
    if (!this.allFeatures || this.allFeatures.length === 0) return;

    // If already built and not forced, don't rebuild
    if (this.featureList.length > 0 && !force) return;

    // Clear existing controls in features form array
    while (this.featureList.length !== 0) {
      this.featureList.removeAt(0);
    }

    this.allFeatures.forEach((feature) => {
      let isChecked = false;
      let usageCount = 0;

      if (this.planData && this.planData.features) {
        const found = this.planData.features.find(
          (f: any) => f.feature_id === feature._id,
        );
        if (found) {
          isChecked = true;
          usageCount = found.usage_count;
        }
      }

      const group = this.fb.group({
        checked: [isChecked],
        feature_id: [feature._id],
        name: [feature.name],
        usage_count: [
          usageCount,
          isChecked ? [Validators.required, Validators.min(1)] : [],
        ],
      });

      // Listen to changes to toggle validators and disable/enable the control
      if (!isChecked) {
        group.get("usage_count").disable({ emitEvent: false });
      }

      group
        .get("checked")
        .valueChanges.pipe(takeUntil(this._unsubscribeAll))
        .subscribe((checked) => {
          const usageControl = group.get("usage_count");
          if (checked) {
            usageControl.enable({ emitEvent: false });
            usageControl.setValidators([
              Validators.required,
              Validators.min(1),
            ]);
            if (usageControl.value <= 0) {
              usageControl.setValue(1);
            }
          } else {
            usageControl.disable({ emitEvent: false });
            usageControl.clearValidators();
          }
          usageControl.updateValueAndValidity();
        });

      this.featureList.push(group);
    });

    this._changeDetectorRef.markForCheck();
  }

  getSearchQuery(): string {
    return (this.featureSearchCtrl.value || "").toLowerCase().trim();
  }

  trackByFn(index: number, item: any): any {
    return item._id || index;
  }

  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  isFormValid(): boolean {
    return Object.keys(this.selectedSection).length > 0;
  }

  /**
   * Get if current plan is custom plan
   */
  get is_custom_plan(): boolean {
    return this.planFormGroup.get("is_custom_plan")?.value as boolean;
  }
  get is_popular(): boolean {
    return this.planFormGroup.get("is_popular")?.value as boolean;
  }

  calculatePrices(): void {
    const price = this.planFormGroup.get("price")?.value || 0;
    const discount = this.planFormGroup.get("discount")?.value || 0;
    const interval = this.planFormGroup.get("interval")?.value;

    // Quarterly calculation
    if (interval === "quarterly" || interval === "both") {
      const quarterlyBasePrice = price * 3;
      const quarterlyPrice =
        quarterlyBasePrice - (quarterlyBasePrice * discount) / 100;
      this.planFormGroup
        .get("quarterly_price")
        .setValue(quarterlyPrice, { emitEvent: false });
    } else {
      this.planFormGroup
        .get("quarterly_price")
        .setValue(0, { emitEvent: false });
    }

    // Backward compatibility for Yearly (if still needed)
    if (interval === "year") {
      const yearlyBasePrice = price * 12;
      const priceYearly = yearlyBasePrice - (yearlyBasePrice * discount) / 100;
      this.planFormGroup
        .get("price_yearly")
        .setValue(priceYearly, { emitEvent: false });
    } else {
      this.planFormGroup.get("price_yearly").setValue(0, { emitEvent: false });
    }
  }
}
