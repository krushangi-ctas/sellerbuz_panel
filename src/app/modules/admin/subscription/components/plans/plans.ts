import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { UserService } from "app/core/user/user.service";
import { PlansCheckoutDialogComponent } from "./plans-checkout-dialog/plans-checkout-dialog.component";

@Component({
  standalone: false,
  selector: "app-subscription-plans",
  templateUrl: "./plans.html",
  styleUrls: ["./plans.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlansComponent {
  @Input() isLoading: boolean = false;
  @Input() currentPlan: any = null;
  @Input() availablePlans: any[] = [];
  @Input() sellerDetails: any = null;
  @Input() selectedBillingCycle: "monthly" | "quarterly" = "monthly";

  @Output() billingCycleChange = new EventEmitter<"monthly" | "quarterly">();
  @Output() profileUpdated = new EventEmitter<any>();

  // ── Inline Edit State ──────────────────────────────────────────────
  isEditing = false;
  isSaving = false;
  saveError = "";
  saveSuccess = false;
  editForm = {
    first_name: "",
    last_name: "",
    email: "",
    contact_no: "",
    business_address: "",
  };

  constructor(
    private _userService: UserService,
    private _cdr: ChangeDetectorRef,
    private _matDialog: MatDialog,
    private _confirmationService: FuseConfirmationService,
  ) {}

  startEdit(): void {
    this.editForm = {
      first_name: this.sellerDetails?.first_name || "",
      last_name: this.sellerDetails?.last_name || "",
      email: this.sellerDetails?.email || "",
      contact_no:
        this.sellerDetails?.contact_no || this.sellerDetails?.conatact_no || "",
      business_address: this.sellerDetails?.business_address || "",
    };
    this.saveError = "";
    this.saveSuccess = false;
    this.isEditing = true;
    this._cdr.markForCheck();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.saveError = "";
    this.saveSuccess = false;
    this._cdr.markForCheck();
  }

  saveProfile(): void {
    if (this.isSaving) return;
    this.isSaving = true;
    this.saveError = "";
    this.saveSuccess = false;
    this._cdr.markForCheck();

    this._userService.update(this.editForm as any).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.saveSuccess = true;
        // Merge updated fields back into sellerDetails so view refreshes
        if (this.sellerDetails) {
          Object.assign(this.sellerDetails, this.editForm);
        }
        this.profileUpdated.emit(this.sellerDetails);
        // Auto-close edit mode after 1.5s
        setTimeout(() => {
          this.isEditing = false;
          this.saveSuccess = false;
          this._cdr.markForCheck();
        }, 1500);
        this._cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.saveError =
          err?.error?.message ||
          err?.message ||
          "Failed to update profile. Please try again.";
        this._cdr.markForCheck();
      },
    });
  }

  // ── Plan helpers ──────────────────────────────────────────────────
  hasActivePlan(): boolean {
    if (!this.currentPlan) return false;
    if (this.currentPlan.status === "active") {
      const expiredAt =
        this.currentPlan.expired_at || this.currentPlan.expiredAt;
      return !expiredAt || new Date(expiredAt) > new Date();
    }
    return false;
  }

  isCurrentPlan(plan: any): boolean {
    if (!this.currentPlan) return false;
    const planId = plan._id || plan.id;
    const currentPlanId =
      this.currentPlan.plan_id ||
      this.currentPlan.plan?._id ||
      this.currentPlan.plan?.id;
    return planId === currentPlanId;
  }

  /**
   * Single-active model: a truthy currentPlan means the seller has an ACTIVE
   * subscription right now — so any OTHER plan's CTA becomes an immediate
   * switch (force-activate) instead of a parallel purchase.
   */
  isPopularPlan(plan: any): boolean {
    return !!plan?.is_popular;
  }

  isCustomPlan(plan: any): boolean {
    return !!plan?.is_custom_plan;
  }

  isIncludedInBillingCycle(plan: any): boolean {
    const interval = (plan?.interval || "month").toLowerCase();
    if (this.selectedBillingCycle === "quarterly") {
      return interval === "quarterly" || interval === "both";
    }
    return interval === "month" || interval === "both";
  }

  get filteredPlans(): any[] {
    return this.availablePlans.filter((plan) =>
      this.isIncludedInBillingCycle(plan),
    );
  }

  getPlanIcon(plan: any): string {
    if (this.isCustomPlan(plan)) return "heroicons_outline:template";
    if (this.isPopularPlan(plan)) return "heroicons_outline:star";
    return "heroicons_outline:lightning-bolt";
  }

  getPlanTypeLabel(plan: any): string {
    if (this.isCustomPlan(plan)) return "Custom";
    if (this.isPopularPlan(plan)) return "Popular";
    return "Standard";
  }

  getFeatures(plan: any): string[] {
    if (Array.isArray(plan?.marketing_features)) {
      return plan.marketing_features;
    }
    return [];
  }

  getCtaLabel(plan: any): string {
    if (this.isCustomPlan(plan)) return "Contact Sales";
    if (this.isCurrentPlan(plan)) return "Active Package";
    if (this.hasActivePlan()) return "Switch Plan";
    if (plan?.trial_days > 0) return `Start ${plan.trial_days}-Day Free Trial`;
    return "Get Started";
  }

  hasDiscount(plan: any): boolean {
    return !!(plan?.discount && Number(plan.discount) > 0);
  }

  getDiscountPercent(plan: any): number {
    return Number(plan?.discount || 0);
  }

  getFinalPrice(plan: any): number {
    if (this.selectedBillingCycle === "quarterly") {
      if (plan?.price_quarterly) return Number(plan.price_quarterly);
      const base = (Number(plan?.price) || 0) * 3;
      const discount = (base * (Number(plan?.discount) || 0)) / 100;
      return base - discount;
    }
    return Number(plan?.price || 0);
  }

  getOriginalPrice(plan: any): number | null {
    if (!this.hasDiscount(plan)) return null;
    if (this.selectedBillingCycle === "quarterly") {
      return (Number(plan?.price) || 0) * 3;
    }
    const price = Number(plan?.price || 0);
    const disc = Number(plan?.discount || 0);
    if (disc > 0 && disc < 100) {
      return Math.round((price * 100) / (100 - disc));
    }
    return null;
  }

  getSavingsAmount(plan: any): number | null {
    const orig = this.getOriginalPrice(plan);
    const final = this.getFinalPrice(plan);
    if (orig && orig > final) {
      return orig - final;
    }
    return null;
  }

  /**
   * "Renew Now" — opens the same checkout with the seller's CURRENT active
   * plan pre-selected. The active subscription is returned as an enriched
   * object (plan_id / plan_name / plan_price …), so we resolve the matching
   * flat PublicPlan for the checkout modal display.
   */
  renewNow(): void {
    if (!this.currentPlan) return;

    const currentPlanId =
      this.currentPlan.plan_id ||
      this.currentPlan.plan?._id ||
      this.currentPlan.plan?.id;

    let plan = this.availablePlans.find(
      (p) => (p._id || p.id) === currentPlanId,
    );

    if (!plan) {
      const cycle =
        this.currentPlan.billing_cycle === "quarterly"
          ? "quarterly"
          : "monthly";
      const price =
        (cycle === "quarterly"
          ? (this.currentPlan.plan_price ?? this.currentPlan.price_quarterly)
          : (this.currentPlan.plan_price ?? this.currentPlan.price)) ?? 0;
      plan = {
        _id: currentPlanId || this.currentPlan.subscription_id || "",
        name:
          this.currentPlan.plan_name || this.currentPlan.name || "Current Plan",
        price,
        discount: this.currentPlan.discount ?? 0,
        currency: (
          this.currentPlan.currency_code ||
          this.currentPlan.currency ||
          "USD"
        ).toLowerCase(),
        interval:
          this.currentPlan.plan_interval ||
          (cycle === "quarterly" ? "quarterly" : "month"),
        trial_days: this.currentPlan.trial_days || 0,
        marketing_features: this.currentPlan.marketing_features || [],
        is_custom_plan: false,
        is_popular: false,
      } as any;
    }

    const billingCycle =
      this.currentPlan.billing_cycle === "quarterly" ||
      this.currentPlan.plan_interval === "quarterly"
        ? "quarterly"
        : "monthly";

    this.openCheckout(plan, billingCycle);
  }

  openCheckout(plan: any, billingCycle?: "monthly" | "quarterly"): void {
    if (this.isCustomPlan(plan)) {
      this._confirmationService.open({
        title: "Contact Sales",
        message:
          "This plan requires contacting our sales team for a custom setup. Please reach out to us and our team will assist you with the next steps.",
        icon: {
          show: true,
          name: "heroicons_outline:chat",
          color: "primary",
        },
        actions: {
          confirm: {
            show: true,
            label: "Got it",
            color: "primary",
          },
          cancel: {
            show: false,
          },
        },
        dismissible: true,
      });
      return;
    }

    // Every plan opens the same Checkout Modal with the selected plan's
    // details — mirrors the public website flow (lead capture; payment is
    // intentionally not wired). An active plan does not change this.
    this._matDialog.open(PlansCheckoutDialogComponent, {
      data: {
        plan,
        sellerDetails: this.sellerDetails,
        billingCycle: billingCycle || this.selectedBillingCycle,
      },
      width: "560px",
      maxWidth: "95vw",
      autoFocus: false,
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  formatAmount(value: any, currency?: string): string {
    if (value === null || value === undefined || value === "") return "—";
    const num = Number(value);
    if (isNaN(num)) return "—";
    const curr =
      currency ||
      this.currentPlan?.currency_code ||
      this.currentPlan?.currency ||
      "USD";
    const amount = num;
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: curr.toUpperCase(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${curr} ${amount.toFixed(0)}`;
    }
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
