import { ChangeDetectorRef, Component, OnDestroy, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { FuseUtilsService } from "@fuse/services/utils";
import { CouponService } from "app/core/coupon/coupon.service";
import { PlanService } from "app/core/manage-plan/plan.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { Subject, takeUntil, finalize } from "rxjs";

@Component({
  standalone: false,
  selector: "app-coupon-manage",
  templateUrl: "./manage.component.html",
  styleUrls: ["./manage.component.scss"],
})
export class CouponManageComponent implements OnInit, OnDestroy {
  couponForm: FormGroup;
  couponId: string | null = null;
  isEditMode: boolean = false;
  isLoading: boolean = false;
  impersonatePageId: string | null = null;

  discountTypes = [
    { value: "percentage", label: "Percentage (%)" },
    { value: "fixed_amount", label: "Fixed Amount" },
  ];

  currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
  plans: any[] = [];
  planFilterCtrl: FormControl = new FormControl("");
  filteredPlans: any[] = [];

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _formBuilder: FormBuilder,
    private _couponService: CouponService,
    private _planService: PlanService,
    private _userSessionService: UserSessionsService,
    private _router: Router,
    private _route: ActivatedRoute,
    private _changeDetectorRef: ChangeDetectorRef,
    private _utilService: FuseUtilsService,
  ) {}

  ngOnInit(): void {
    this._userSessionService.currentSellerId$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((sellerId) => {
        this.impersonatePageId = sellerId;
      });

    this.initForm();
    this.loadPlans();

    // Check if edit mode
    const id = this._route.snapshot.paramMap.get("id");
    if (id) {
      this.couponId = id;
      this.isEditMode = true;
      this.loadCoupon(id);
    }
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  initForm(): void {
    this.couponForm = this._formBuilder.group({
      code: [
        "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
        ],
      ],
      type: ["public", Validators.required],
      discount_type: ["percentage", Validators.required],
      discount_value: ["", [Validators.required, Validators.min(0)]],
      currency: ["USD"],
      valid_from: ["", Validators.required],
      valid_until: ["", Validators.required],
      duration_months: [null],
      applicable_plans: [[]],
      max_redemptions: [null],
      max_redemptions_per_user: [1],
      description: [""],
    });

    // Update validators based on discount type
    this.couponForm
      .get("discount_type")
      ?.valueChanges.pipe(takeUntil(this._unsubscribeAll))
      .subscribe((type) => {
        const valueControl = this.couponForm.get("discount_value");
        if (type === "percentage") {
          valueControl?.setValidators([
            Validators.required,
            Validators.min(0),
            Validators.max(100),
          ]);
        } else {
          valueControl?.setValidators([Validators.required, Validators.min(0)]);
        }
        valueControl?.updateValueAndValidity();
      });
  }

  loadPlans(): void {
    this._planService
      .getPlans(1, 100, "name", "asc", "", {})
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response) => {
        if (response.data) {
          // Filter out plans with null or undefined _id
          this.plans = (response.data || []).filter(
            (plan: any) => plan && plan._id,
          );
          this.filteredPlans = [...this.plans];
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  filterPlans(query: string): void {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      this.filteredPlans = [...this.plans];
    } else {
      this.filteredPlans = this.plans.filter(
        (p: any) => p?.name && p.name.toLowerCase().includes(q),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  triggerPlanEvent(): void {
    this.filteredPlans = [...this.plans];
    this.planFilterCtrl.setValue("", { emitEvent: false });
  }

  loadCoupon(id: string): void {
    this.isLoading = true;
    this._couponService
      .getCouponById(id)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        (response) => {
          this.isLoading = false;
          if (response.status === 200 && response.data) {
            const coupon = response.data;
            this.couponForm.patchValue({
              code: coupon.code,
              type: coupon.type || "public",
              discount_type: coupon.discount_type,
              discount_value: coupon.discount_value,
              currency: coupon.currency,
              valid_from: this.formatDateForInput(coupon.valid_from),
              valid_until: this.formatDateForInput(coupon.valid_until),
              duration_months: coupon.duration_months,
              applicable_plans: Array.isArray(coupon.applicable_plans)
                ? coupon.applicable_plans.map((p: any) =>
                    typeof p === "object" ? p._id || p.id : p,
                  )
                : [],
              max_redemptions: coupon.max_redemptions,
              max_redemptions_per_user: coupon.max_redemptions_per_user,

              description: coupon.description,
            });
            this._changeDetectorRef.markForCheck();
          }
        },
        () => {
          this.isLoading = false;
          this._utilService.onError("Failed to load coupon details");
        },
      );
  }

  formatDateForInput(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  isSubmitting: boolean = false;

  onSubmit(): void {
    if (this.couponForm.invalid || this.isSubmitting) {
      this.couponForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.couponForm.getRawValue();

    const applicablePlans = (formValue.applicable_plans || []).filter(
      (id: any) => id != null,
    );

    const payload = {
      ...formValue,
      code: formValue?.code ? formValue.code.toUpperCase() : "",
      applicable_plans: applicablePlans,
    };

    if (this.isEditMode && this.couponId) {
      this._couponService
        .updateCoupon(this.couponId, payload)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.isSubmitting = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: (response) => {
            if (response.status === 200) {
              this._utilService.onSuccess("Coupon updated successfully");
              this.goBack();
            } else {
              this._utilService.onError(
                response.message || "Failed to update coupon",
              );
            }
          },
          error: ({ error }) => {
            this._utilService.onError(
              error?.message || "Failed to update coupon",
            );
          },
        });
    } else {
      this._couponService
        .createCoupon(payload)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.isSubmitting = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: (response) => {
            if (response.status === 200) {
              this._utilService.onSuccess("Coupon created successfully");
              this.goBack();
            } else {
              this._utilService.onError(
                response.message || "Failed to create coupon",
              );
            }
          },
          error: ({ error }) => {
            this._utilService.onError(
              error?.message || "Failed to create coupon",
            );
          },
        });
    }
  }

  goBack(): void {
    this._router.navigate(
      this.impersonatePageId
        ? [`/${this.impersonatePageId}/master/coupon`]
        : ["/master/coupon"],
    );
  }

  // Helper getters for template
  get isPercentage(): boolean {
    return this.couponForm.get("discount_type")?.value === "percentage";
  }

  get title(): string {
    return this.isEditMode ? "Edit Coupon" : "Create Coupon";
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
