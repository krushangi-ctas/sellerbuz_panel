import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { Subject, takeUntil } from "rxjs";
import { UserService } from "app/core/user/user.service";
import { FuseUtilsService } from "@fuse/services/utils";
import { FuseConfirmationService } from "@fuse/services/confirmation";

export type SellerDialogType = "switch" | "bulk" | "renew" | "cancel-active";

export interface SellerDialogData {
  type: SellerDialogType;
  seller: any;
  plans?: any[];
  subscriptionId?: string;
  queue?: any;
  fromPlanName?: string;
}

@Component({
  standalone: false,
  selector: "seller-dialog",
  templateUrl: "./seller-dialog.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerDialogComponent implements OnInit, OnDestroy {
  // Switch Plan
  switchPlanForm: FormGroup;
  switchSubscriptionId: string | null = null;
  switchFromPlanName = "";
  switchQueueNo: number = 1;

  // Selected plan (resolved from the plan dropdown) — drives the read-only
  // details card and the billing-cycle options, shared by Switch and Renew.
  selectedPlan: any;

  // Bulk Adjust
  bulkAdjustLimitForm: FormGroup;
  resetLimitsConfirm: FormGroup;
  selectedAdjustQueue: any;
  selectedAdjustSubscriptionId: string | null = null;

  isLoading: boolean = false;
  dialogError: string | null = null;

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  get type(): SellerDialogType {
    return this.data?.type;
  }

  get seller(): any {
    return this.data?.seller;
  }

  get plans(): any[] {
    return this.data?.plans || [];
  }

  get bulkAdjustmentsControls(): any[] {
    return (
      (this.bulkAdjustLimitForm?.get("adjustments") as any)?.controls || []
    );
  }

  /** True when at least one feature has been over-adjusted (limit > default). */
  get canResetLimits(): boolean {
    if (!this.bulkAdjustmentsControls.length) return false;
    return this.bulkAdjustmentsControls.some((ctrl: any) => {
      const current = Number(ctrl.get("current_limit")?.value) || 0;
      const def = Number(ctrl.get("default_limit")?.value);
      return def != null && current > def;
    });
  }

  /**
   * Constructor
   */
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SellerDialogData,
    private _dialogRef: MatDialogRef<SellerDialogComponent>,
    private _formBuilder: FormBuilder,
    private _userService: UserService,
    private _utilService: FuseUtilsService,
    private _confirmationService: FuseConfirmationService,
    private _changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.switchSubscriptionId = this.data?.subscriptionId || null;
    this.switchFromPlanName = this.data?.fromPlanName || "current plan";
    const latest = this.getLatestSubscription(this.seller);
    this.switchPlanForm = this._formBuilder.group({
      planId: [latest?.plan_id || "", Validators.required],
      billingCycle: [latest?.billing_cycle || "monthly", Validators.required],
    });

    this.bulkAdjustLimitForm = this._formBuilder.group({
      adjustments: this._formBuilder.array([]),
    });
    this.resetLimitsConfirm = this._formBuilder.group({
      title: "Reset Limits to Default",
      message:
        "Reset ALL feature limits back to their plan defaults? Any manually added limits will be removed.",
      icon: this._formBuilder.group({
        show: true,
        name: "heroicons_outline:arrow-path",
        color: "warn",
      }),
      actions: this._formBuilder.group({
        confirm: this._formBuilder.group({
          show: true,
          label: "Reset",
          color: "primary",
        }),
        cancel: this._formBuilder.group({
          show: true,
          label: "Cancel",
        }),
      }),
      dismissible: true,
    });
    this.selectedAdjustQueue = this.data?.queue;
    this.selectedAdjustSubscriptionId = this.data?.subscriptionId || null;
    this.buildAdjustments();

    // Shared plan → selectedPlan + billing-cycle sync for both plan forms.
    this.setupPlanCycleSync("planId");
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  buildAdjustments(): void {
    const queue = this.selectedAdjustQueue;
    if (!queue || !queue.usages?.length) return;

    // Build form array with one entry per feature
    const adjustmentsArray = this.bulkAdjustLimitForm.get("adjustments") as any;
    adjustmentsArray.clear();
    queue.usages.forEach((usage: any) => {
      const featureId = usage.feature_id?._id || usage.feature_id;
      const featureName =
        usage.feature_id?.name || usage.feature_name || "Feature";
      const currentLimit = usage.limit || 0;
      const defaultLimit =
        usage.default_limit != null ? Number(usage.default_limit) : null;
      adjustmentsArray.push(
        this._formBuilder.group({
          feature_id: [featureId],
          feature_name: [featureName],
          current_limit: [currentLimit],
          default_limit: [defaultLimit],
          delta: [null, [Validators.pattern(/^\d*$/)]],
        }),
      );
    });
  }

  /**
   * Latest subscription (active first, else most recent) for display in the
   * renewal dialog.
   */
  getLatestSubscription(seller: any): any {
    const subs = seller?.subscriptions || [];
    if (!subs.length) return null;
    const now = new Date();
    return (
      subs.find(
        (sub: any) => sub.status === "active" && new Date(sub.expired_at) > now,
      ) ||
      subs[subs.length - 1] ||
      null
    );
  }

  fromCent(amount: any): number | any {
    return typeof amount === "number" ? (amount / 100).toFixed(2) : amount;
  }

  /**
   * Reusable plan-selection + billing-cycle sync shared by the Switch and
   * Renew forms. Resolves `selectedPlan` from the chosen plan (for the
   * read-only details card) and, when the plan supports only one billing
   * cycle, forces the billing-cycle control to it so the form never gets
   * stuck on an unsupported combination.
   */
  setupPlanCycleSync(planControlName: string): void {
    const planCtrl = this.switchPlanForm?.get(planControlName);
    if (!planCtrl) return;

    planCtrl.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((planId) => {
        this._resolveSelectedPlan(planId);
      });

    // Resolve the initial value (e.g. renew pre-fills planId) so the
    // selected-plan card and cycle options are correct on dialog open.
    this._resolveSelectedPlan(planCtrl.value);
  }

  private _resolveSelectedPlan(planId: any): void {
    this.selectedPlan =
      planId && this.plans.length
        ? this.plans.find(
            (plan) => String(plan._id || plan.id) === String(planId),
          ) || null
        : null;

    const allowed = this.billingCycleOptions;
    if (allowed.length === 1) {
      this.switchPlanForm?.get("billingCycle")?.setValue(allowed[0]);
    }

    this._changeDetectorRef.markForCheck();
  }

  /**
   * Billing cycles a plan supports, derived from its API-provided interval.
   */
  get billingCycleOptions(): string[] {
    const interval = (this.selectedPlan?.interval || "")
      .toString()
      .toLowerCase();
    if (interval === "month") {
      return ["monthly"];
    }
    if (interval === "quarterly") {
      return ["quarterly"];
    }
    return ["monthly", "quarterly"];
  }

  /**
   * Price of the selected plan formatted for the current billing cycle.
   */
  getSelectedPlanPrice(): string {
    const plan = this.selectedPlan;
    if (!plan) return "";

    const cycle = this.switchPlanForm?.get("billingCycle")?.value || "monthly";
    const price = cycle === "quarterly" ? plan.price_quarterly : plan.price;
    const currency = (plan.currency || "inr").toUpperCase();
    const period = cycle === "quarterly" ? "quarter" : "month";

    return `${this.fromCent(price)} ${currency} / ${period}`;
  }

  getSelectedPlanFeatures(): string[] {
    return this.selectedPlan?.marketing_features || [];
  }

  // -----------------------------------------------------------------------
  // Switch Plan
  // -----------------------------------------------------------------------

  switchPlan(): void {
    if (this.switchPlanForm.invalid) {
      this.switchPlanForm.markAllAsTouched();
      return;
    }
    const sellerId = this.seller?._id || this.seller?.id;
    if (!sellerId || !this.switchSubscriptionId) return;

    const { planId, billingCycle } = this.switchPlanForm.value;
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();

    this._userService
      .forceActivatePlan(sellerId, {
        subscription_id: this.switchSubscriptionId,
        plan_id: planId,
        billing_cycle: billingCycle,
      })
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this._utilService.onSuccess(
            res?.message || "Active plan replaced successfully.",
          );
          this._dialogRef.close(sellerId);
          this._changeDetectorRef.markForCheck();
        },
        error: (err: any) => {
          this.isLoading = false;
          this._utilService.onError(
            err?.error?.message || "Failed to replace the active plan.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  // -----------------------------------------------------------------------
  // Renew & Continue
  // -----------------------------------------------------------------------

  confirmRenewAndContinue(): void {
    const sellerId = this.seller?._id || this.seller?.id;
    if (!sellerId) return;

    this.isLoading = true;
    this._changeDetectorRef.markForCheck();

    this._userService
      .renewAndContinue(sellerId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this._utilService.onSuccess(
            res?.message || "Subscription extended successfully.",
          );
          this._dialogRef.close(sellerId);
          this._changeDetectorRef.markForCheck();
        },
        error: (err: any) => {
          this.isLoading = false;
          this._utilService.onError(
            err?.error?.message || "Failed to extend subscription.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  // -----------------------------------------------------------------------
  // Cancel Active Plan
  // -----------------------------------------------------------------------

  confirmAdminCancelActive(): void {
    const sellerId = this.seller?._id || this.seller?.id;
    if (!sellerId) return;

    this.isLoading = true;
    this.dialogError = null;
    this._changeDetectorRef.markForCheck();

    this._userService
      .adminCancelActiveSubscription(sellerId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res?.status !== 200) {
            this.dialogError =
              res?.message || "Failed to cancel active subscription.";
            this._changeDetectorRef.markForCheck();
            return;
          }
          this._utilService.onSuccess(
            res?.message || "Active subscription cancelled.",
          );
          this._dialogRef.close(sellerId);
          this._changeDetectorRef.markForCheck();
        },
        error: (err: any) => {
          this.isLoading = false;
          this.dialogError =
            err?.error?.message || "Failed to cancel active subscription.";
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  // -----------------------------------------------------------------------
  // Bulk Adjust
  // -----------------------------------------------------------------------

  incrementDelta(index: number): void {
    const adjustmentsArray = this.bulkAdjustLimitForm.get("adjustments") as any;
    if (!adjustmentsArray) return;
    const ctrl = adjustmentsArray.at(index);
    if (!ctrl) return;
    const val = Number(ctrl.get("delta").value || 0);
    ctrl.get("delta").setValue(val + 1);
  }

  decrementDelta(index: number): void {
    const adjustmentsArray = this.bulkAdjustLimitForm.get("adjustments") as any;
    if (!adjustmentsArray) return;
    const ctrl = adjustmentsArray.at(index);
    if (!ctrl) return;
    const val = Number(ctrl.get("delta").value || 0);
    if (val > 0) {
      ctrl.get("delta").setValue(val - 1);
    } else {
      ctrl.get("delta").setValue(0);
    }
  }

  confirmBulkAdjustLimit(): void {
    const adjustmentsArray = this.bulkAdjustLimitForm.get("adjustments") as any;
    if (adjustmentsArray.invalid) {
      adjustmentsArray.markAllAsTouched();
      return;
    }
    const sellerId = this.seller?._id || this.seller?.id;
    if (!sellerId || !this.selectedAdjustSubscriptionId) return;

    const adjustments = adjustmentsArray.value
      .filter(
        (a: any) =>
          a.delta !== null &&
          a.delta !== undefined &&
          a.delta !== "" &&
          Number(a.delta) !== 0,
      )
      .map((a: any) => {
        const val = Number(a.delta);
        const signedDelta = Math.abs(val);
        return { feature_id: a.feature_id, delta: signedDelta };
      });

    if (!adjustments.length) {
      this._utilService.onError("No changes to apply.");
      return;
    }

    this.isLoading = true;
    this._changeDetectorRef.markForCheck();

    this._userService
      .adjustEffectiveLimitBulk(
        sellerId,
        this.selectedAdjustSubscriptionId,
        adjustments,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this._utilService.onSuccess(
            res?.message || `Adjusted ${adjustments.length} feature limit(s).`,
          );
          this._dialogRef.close(sellerId);
          this._changeDetectorRef.markForCheck();
        },
        error: (err: any) => {
          this.isLoading = false;
          this._utilService.onError(
            err?.error?.message || "Failed to adjust limits.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  confirmResetLimits(): void {
    const sellerId = this.seller?._id || this.seller?.id;
    if (!sellerId || !this.selectedAdjustSubscriptionId) return;
    if (!this.canResetLimits) return;

    const featureIds = this.bulkAdjustmentsControls.map(
      (ctrl: any) => ctrl.get("feature_id")?.value,
    );
    if (!featureIds.length) return;

    this._confirmationService
      .open(this.resetLimitsConfirm.value)
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result !== "confirmed") return;

        this.isLoading = true;
        this._changeDetectorRef.markForCheck();

        this._userService
          .resetEffectiveLimits(
            sellerId,
            this.selectedAdjustSubscriptionId!,
            featureIds,
          )
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe({
            next: (res: any) => {
              this.isLoading = false;
              this._utilService.onSuccess(
                res?.message || "Limits reset to defaults.",
              );
              this._dialogRef.close(sellerId);
              this._changeDetectorRef.markForCheck();
            },
            error: (err: any) => {
              this.isLoading = false;
              this._utilService.onError(
                err?.error?.message || "Failed to reset limits.",
              );
              this._changeDetectorRef.markForCheck();
            },
          });
      });
  }
}
