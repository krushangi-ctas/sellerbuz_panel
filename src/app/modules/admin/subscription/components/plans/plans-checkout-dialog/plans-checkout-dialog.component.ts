import { ChangeDetectorRef, Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FuseUtilsService } from "@fuse/services/utils";
import { PlanService } from "app/core/manage-plan/plan.service";
import { Currency, PublicPlan } from "app/core/manage-plan/plan.model";
import {
  BillingCycle,
  CreateLeadResponse,
  PublicCheckoutService,
} from "app/core/public-checkout/public-checkout.service";

export interface PlansCheckoutDialogData {
  plan: PublicPlan;
  sellerDetails?: any;
  billingCycle: BillingCycle;
}

export type CheckoutStep = "form" | "summary" | "success";

/**
 * PlansCheckoutDialogComponent — Seller-side checkout dialog.
 *
 * Mirrors the public website checkout (ps_sass checkoutModal.tsx):
 *  Step 1: contact form prefilled with the seller's profile data
 *  Step 2: confirmation summary — "Our team will contact you within 24 hours"
 *
 * Payment is intentionally NOT wired here (no Razorpay/Stripe buttons),
 * matching the website's current flow — a guest lead (tbl_guest_leads) is
 * created via POST /v1/public-checkout/lead and the team follows up.
 */
@Component({
  standalone: false,
  selector: "app-plans-checkout-dialog",
  templateUrl: "./plans-checkout-dialog.component.html",
})
export class PlansCheckoutDialogComponent implements OnInit {
  form!: FormGroup;
  currencies: Currency[] = [];
  step: CheckoutStep = "form";
  isSubmitting = false;
  currenciesLoading = false;
  leadResponse: CreateLeadResponse | null = null;

  constructor(
    private readonly _fb: FormBuilder,
    private readonly _dialogRef: MatDialogRef<PlansCheckoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PlansCheckoutDialogData,
    private readonly _planService: PlanService,
    private readonly _checkoutService: PublicCheckoutService,
    private readonly _utilService: FuseUtilsService,
    private readonly _cdr: ChangeDetectorRef,
  ) {}

  get plan(): PublicPlan {
    return this.data.plan;
  }

  get billingCycle(): BillingCycle {
    return this.data.billingCycle;
  }

  get planPrice(): number {
    if (this.billingCycle === "quarterly" && this.plan.price_quarterly) {
      return this.plan.price_quarterly;
    }
    return this.plan.price;
  }

  get selectedCurrency(): Currency | undefined {
    const currencyId = this.form?.get("currency_id")?.value;
    return this.currencies.find(
      (c) => (c as any)._id === currencyId || c.id === currencyId,
    );
  }

  get currentSubscription(): any {
    return this.leadResponse?.data?.active_subscription || null;
  }

  get isFormInvalid(): boolean {
    return !this.form || this.form.invalid;
  }

  ngOnInit(): void {
    this.form = this._fb.group({
      first_name: [
        this.data.sellerDetails?.first_name || "",
        [Validators.required, Validators.minLength(1)],
      ],
      last_name: [
        this.data.sellerDetails?.last_name || "",
        [Validators.required, Validators.minLength(1)],
      ],
      // Email is read-only — pre-filled from profile, not editable
      email: [
        { value: this.data.sellerDetails?.email || "", disabled: true },
        [Validators.required, Validators.email],
      ],
      // Company name is optional
      company_name: [this.data.sellerDetails?.company_name || ""],
      contact_number: [
        this.data.sellerDetails?.contact_no || "",
        [Validators.required, Validators.minLength(4)],
      ],
      currency_id: [
        this.data.sellerDetails?.currency_id || "",
        [Validators.required],
      ],
      country_name: [
        this.data.sellerDetails?.country_name || "",
        [Validators.required],
      ],
    });

    this._loadCurrencies();
    this._cdr.detectChanges();
  }

  private _loadCurrencies(): void {
    this.currenciesLoading = true;
    this._planService.getCurrencies().subscribe({
      next: (res) => {
        this.currenciesLoading = false;
        if (res.status === 200 && Array.isArray(res.data)) {
          this.currencies = res.data.map((c: any) => ({
            ...c,
            id: c.id || c._id,
          }));

          const sellerCurrencyId = this.data.sellerDetails?.currency_id || "";
          const sellerCountryName = this.data.sellerDetails?.country_name || "";

          // Try to find the seller's stored currency in the loaded list
          let matched = sellerCurrencyId
            ? this.currencies.find(
                (c) =>
                  (c as any)._id === sellerCurrencyId ||
                  c.id === sellerCurrencyId,
              )
            : undefined;

          // Seller schema has no currency_id — fall back to matching by
          // country_name so the dropdown auto-fills the seller's country.
          if (!matched && sellerCountryName) {
            const name = sellerCountryName.trim().toLowerCase();
            matched = this.currencies.find(
              (c) =>
                String(c.country || "")
                  .trim()
                  .toLowerCase() === name ||
                String(c.currency || "")
                  .trim()
                  .toLowerCase() === name,
            );
          }

          if (matched) {
            // Always patch both fields so the mat-select shows the correct country
            this.form.patchValue({
              currency_id: matched.id || (matched as any)._id,
              country_name:
                sellerCountryName ||
                (matched as any)?.country ||
                (matched as any)?.currency ||
                "",
            });
          } else if (!sellerCountryName) {
            // Seller has no country set — default to the first option from API
            const fallback = this.currencies[0];
            if (fallback) {
              this.form.patchValue({
                currency_id: fallback.id || (fallback as any)._id || "",
                country_name:
                  (fallback as any)?.country ||
                  (fallback as any)?.currency ||
                  "",
              });
            }
          }
        }
        this._cdr.markForCheck();
      },
      error: () => {
        this.currenciesLoading = false;
        this._cdr.markForCheck();
      },
    });
  }

  onCurrencyChange(): void {
    const currency = this.selectedCurrency;
    if (currency) {
      this.form.patchValue({
        country_name:
          (currency as any).country || (currency as any).currency || "",
      });
    }
  }

  /**
   * Clicking "Checkout" validates the form and immediately shows the summary
   * page as a preview — no API call yet.
   */
  submit(): void {
    if (this.isFormInvalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }
    // Go directly to summary (lead is created on confirmLead())
    this.step = "summary";
    this._cdr.markForCheck();
  }

  /**
   * Called from the summary page to actually create the lead entry.
   */
  confirmLead(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this._cdr.markForCheck();

    // getRawValue() includes disabled controls (email)
    const formValue = this.form.getRawValue();

    this._checkoutService
      .createLead({
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        email: formValue.email,
        company_name: formValue.company_name,
        contact_number: formValue.contact_number,
        currency_id: formValue.currency_id,
        country_name:
          formValue.country_name || this.selectedCurrency?.currency || "",
        plan_id: this.plan._id || this.plan.id || "",
        billing_cycle: this.billingCycle,
      })
      .subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.leadResponse = res;
          this._cdr.markForCheck();
          if (res.status === 200 || res.status === 201) {
            // Lead created successfully — show the confirmation popup
            this.step = "success";
          } else {
            setTimeout(() => {
              this._utilService.onError(res.message || "Checkout failed");
            }, 0);
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this._cdr.markForCheck();
          setTimeout(() => {
            this._utilService.onError(
              err?.error?.message || "Something went wrong. Please try again.",
            );
          }, 0);
        },
      });
  }

  close(): void {
    this._dialogRef.close(true);
  }
}
