import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { Subject, forkJoin, of, takeUntil } from "rxjs";
import { catchError } from "rxjs/operators";
import { NavigationService } from "app/core/navigation/navigation.service";
import { PlanService } from "app/core/manage-plan/plan.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { UserService } from "app/core/user/user.service";
import { AuthService } from "app/core/auth/auth.service";
import { environment } from "environments/environment";
import { Constants } from "app/shared/constants";

@Component({
  standalone: false,
  selector: "app-subscription",
  templateUrl: "./subscription.component.html",
  styleUrls: ["./subscription.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionComponent implements OnInit, OnDestroy {
  isLoading = false;
  isSuperAdmin: boolean = false;
  loadError: string = "";
  tooltip: string = Constants.subscriptionDetails;

  // Subscription data
  currentPlan: any = null;
  allSubscriptions: any[] = [];
  usages: any[] = [];
  usageQueues: any[] = [];
  sellerDetails: any = null;
  availablePlans: any[] = [];

  // Tab views
  selectedBillingCycle: "monthly" | "quarterly" = "monthly";
  activeTab: "overview" | "subscription" | "plans" = "overview";

  // Apex chart for trend
  public usageTrendChartOptions: any = {
    series: [
      {
        name: "Usage Count",
        data: [],
      },
    ],
    chart: {
      type: "area",
      height: 280,
      fontFamily: "inherit",
      foreColor: "inherit",
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    colors: ["#6366f1"],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
      },
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 4,
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
      },
    },
    xaxis: {
      type: "category",
      categories: [],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: "#64748b",
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#64748b",
        },
        formatter: (value: number): string => `${value}`,
      },
    },
    tooltip: {
      theme: "light",
    },
  };

  seller: any;
  rolePermission: any = {};

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _userSessionService: UserSessionsService,
    private _navigationService: NavigationService,
    private _userService: UserService,
    private _planService: PlanService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _ngZone: NgZone,
    private _authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this._navigationService.isSuperAdmin;

    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this._ngZone.run(() => {
          this.rolePermission = this._navigationService.getPermissionByRoute(
            data,
            "/master/subscription",
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
              "/master/subscription",
            );
            this._changeDetectorRef.markForCheck();
          }
        });
      });

    this._userSessionService.currentSellerId$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this._ngZone.run(() => {
          this.seller = this._userSessionService.getCurrentUser();
          if (this.seller) {
            this.loadAll();
          }
          this._changeDetectorRef.markForCheck();
        });
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  setTab(tab: "overview" | "subscription" | "plans"): void {
    this.activeTab = tab;
    this._changeDetectorRef.markForCheck();
  }

  loadAll(): void {
    const sellerId = this.getSellerId();
    if (!sellerId) return;
    this.isLoading = true;

    forkJoin({
      active: this._userService
        .getMyActiveSubscription(sellerId)
        .pipe(catchError(() => of(null))),
      all: this._userService
        .getAllMySubscriptions(sellerId)
        .pipe(catchError(() => of(null))),
      usages: this._userService
        .getUserUsages(sellerId)
        .pipe(catchError(() => of(null))),
      sellerDetails: this._userService
        .getSellerDetailsById(sellerId)
        .pipe(catchError(() => of(null))),
      plans: this._planService
        .getPublicPlans()
        .pipe(catchError(() => of(null))),
    })
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (results: any) => {
          this.isLoading = false;

          const failed: string[] = [];

          // Active subscription
          if (results.active?.status === 200) {
            this.currentPlan = results.active.data || null;
          } else if (results.active === null) {
            failed.push("active subscription");
          }

          // All subscriptions
          if (results.all?.status === 200) {
            this.allSubscriptions = Array.isArray(results.all.data)
              ? results.all.data
              : [];
          } else if (results.all === null) {
            failed.push("subscriptions");
          }

          // Usages
          if (results.usages?.status === 200) {
            this.applyUsageQueues(results.usages.data);
          } else if (results.usages === null) {
            failed.push("usage");
          }

          // Seller Details
          if (results.sellerDetails?.status === 200) {
            this.sellerDetails =
              results.sellerDetails.seller ||
              results.sellerDetails.data ||
              results.sellerDetails;
          } else {
            this.sellerDetails = this.seller || {};
          }

          // Plans — active plans only, straight from the API (no hardcoded data)
          if (
            results.plans?.status === 200 &&
            Array.isArray(results.plans.data)
          ) {
            this.availablePlans = results.plans.data;
          } else if (results.plans === null) {
            failed.push("plans");
          }

          this.loadError = failed.length
            ? `Failed to load: ${failed.join(", ")}`
            : "";
          if (this.loadError) {
            console.error(
              `[Subscription] ${this.loadError} for seller ${sellerId}`,
            );
          }

          this._changeDetectorRef.markForCheck();
        },
        error: (err: any) => {
          this.isLoading = false;
          this.loadError = "Failed to load subscription data";
          console.error("[Subscription] loadAll failed", err);
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  /**
   * Backend returns a per-subscription structure:
   * { queues: [{ subscription_id, status, activePlanName, usages[] … }] }
   * Charts/scores describe the ACTIVE instance (matches metering D1);
   * the full queue list is kept for queued-instance display.
   */
  private applyUsageQueues(data: any): void {
    const queues = data?.queues || [];
    const activeQ = queues.find((q: any) => q.status === "active") || null;
    this.usages = (activeQ?.usages || []).map((u: any) => ({
      ...u,
      feature_name: u.feature_id?.name || u.feature_name || "Usage",
    }));
    this.usageQueues = queues;
  }

  /** Lightweight refetch of usage + window data only (no full page skeleton). */
  loadUsagesOnly(): void {
    const sellerId = this.getSellerId();
    if (!sellerId) return;

    this._userService
      .getUserUsages(sellerId)
      .pipe(
        takeUntil(this._unsubscribeAll),
        catchError(() => of(null)),
      )
      .subscribe((res: any) => {
        if (res?.status === 200) {
          this.applyUsageQueues(res.data);
        } else {
          console.error("[Subscription] usage refetch failed", res);
        }
        this._changeDetectorRef.markForCheck();
      });
  }

  /** Called when the plans component successfully saves the seller profile */
  onProfileUpdated(updatedDetails: any): void {
    this.sellerDetails = { ...this.sellerDetails, ...updatedDetails };
    this._changeDetectorRef.markForCheck();
  }

  downloadInvoice(invoice: any): void {
    const paymentId = invoice.payment_id || invoice._id;
    if (!paymentId) return;
    const url = `${environment.apiBaseUrl}/payments/invoices/${paymentId}/download`;
    fetch(url, {
      headers: { Authorization: `Bearer ${this._authService.accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Download failed");
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const issuedAt =
          invoice.issued_at || invoice.paid_at || invoice.createdAt;
        const filename = invoice.invoice_number
          ? `Invoice_${invoice.invoice_number}_${this.formatDate(issuedAt).replace(/\s+/g, "-")}.pdf`
          : `invoice-${paymentId}.pdf`;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => console.error("Invoice download failed", err));
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

  getSellerId(): string {
    const impersonatedSellerId = this._userSessionService.getCurrentSellerId();
    if (impersonatedSellerId) {
      return impersonatedSellerId;
    }
    const seller = this.seller || this._userSessionService.getCurrentUser();
    return seller?.id || seller?._id || "";
  }

  // ─── Plan helpers ────────────────────────────────────────────────────────────

  hasActivePlan(): boolean {
    if (!this.currentPlan) return false;
    if (this.currentPlan.status === "active") {
      const expiredAt =
        this.currentPlan.expired_at || this.currentPlan.expiredAt;
      return !expiredAt || new Date(expiredAt) > new Date();
    }
    return false;
  }

  getPlanName(): string {
    return (
      this.currentPlan?.plan_name ||
      this.currentPlan?.name ||
      "No Plan Assigned"
    );
  }

  getBillingCycle(): string {
    const cycle =
      this.currentPlan?.billing_cycle || this.currentPlan?.billingCycle || "";
    return cycle ? cycle.charAt(0).toUpperCase() + cycle.slice(1) : "—";
  }

  getDaysLeft(): number {
    const expiredAt =
      this.currentPlan?.expired_at || this.currentPlan?.expiredAt;
    if (!expiredAt) return 0;
    const diff = new Date(expiredAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  getDaysLeftPercent(): number {
    const startedAt =
      this.currentPlan?.started_at || this.currentPlan?.startedAt;
    const expiredAt =
      this.currentPlan?.expired_at || this.currentPlan?.expiredAt;
    if (!startedAt || !expiredAt) return 0;
    const total = new Date(expiredAt).getTime() - new Date(startedAt).getTime();
    const remaining = new Date(expiredAt).getTime() - Date.now();
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, (remaining / total) * 100));
  }

  // ─── Usage helpers ────────────────────────────────────────────────────────────

  usagePercent(usage: any): number {
    const limit = usage?.limit ?? usage?.usage_count ?? 0;
    const used = usage?.usage ?? usage?.current ?? 0;
    if (!limit) return 0;
    return Math.min(100, (used / limit) * 100);
  }

  getUsageIcon(featureName: string): string {
    const name = (featureName || "").toLowerCase();
    if (name.includes("product")) return "heroicons_outline:shopping-bag";
    if (name.includes("order")) return "heroicons_outline:shopping-cart";
    if (name.includes("api")) return "heroicons_outline:code";
    if (name.includes("barcode") || name.includes("scan"))
      return "heroicons_outline:qrcode";
    if (
      name.includes("user") ||
      name.includes("team") ||
      name.includes("member")
    )
      return "heroicons_outline:users";
    if (name.includes("email")) return "heroicons_outline:mail";
    return "heroicons_outline:chart-bar";
  }

  getUsageColor(percent: number): string {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-amber-500";
    return "bg-primary";
  }

  getUsageTextColor(percent: number): string {
    if (percent >= 90) return "text-red-600 dark:text-red-400";
    if (percent >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-primary";
  }

  // ─── Features helpers ─────────────────────────────────────────────────────────

  getPlanFeatures(): string[] {
    return this.currentPlan?.marketing_features || [];
  }

  // ─── Notification helpers ─────────────────────────────────────────────────────

  getNotificationIcon(type: string, daysBefore: number): string {
    if (type === "expired") return "heroicons_outline:bell";
    if (daysBefore <= 1) return "heroicons_outline:exclamation-circle";
    if (daysBefore <= 3) return "heroicons_outline:clock";
    return "heroicons_outline:information-circle";
  }

  getNotificationColor(status: string): string {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "pending":
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
    }
  }

  getNotificationIconBg(daysBefore: number, type: string): string {
    if (type === "expired") return "bg-red-100 dark:bg-red-900/30";
    if (daysBefore <= 1) return "bg-orange-100 dark:bg-orange-900/30";
    if (daysBefore <= 3) return "bg-amber-100 dark:bg-amber-900/30";
    return "bg-blue-100 dark:bg-blue-900/30";
  }

  getNotificationIconColor(daysBefore: number, type: string): string {
    if (type === "expired") return "text-red-500 dark:text-red-400";
    if (daysBefore <= 1) return "text-orange-500 dark:text-orange-400";
    if (daysBefore <= 3) return "text-amber-500 dark:text-amber-400";
    return "text-blue-500 dark:text-blue-400";
  }

  getNotificationTitle(n: any): string {
    if (n.type === "expired") return "Subscription Expired";
    if (n.days_before === 7) return "7 Days Reminder";
    if (n.days_before === 3) return "3 Days Reminder";
    if (n.days_before === 1) return "1 Day Reminder";
    return n.subject || "Subscription Reminder";
  }

  // ─── Subscription status helpers ──────────────────────────────────────────────

  getSubStatusClass(status: string): string {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "expired":
        return "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
      case "cancelled":
        return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
    }
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      case "failed":
        return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
      case "refunded":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
    }
  }

  getPaymentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      success: "Paid",
      pending: "Pending",
      failed: "Failed",
      cancelled: "Cancelled",
      refunded: "Refunded",
      created: "Created",
    };
    return labels[status] || status || "—";
  }

  // ─── Formatting ───────────────────────────────────────────────────────────────

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

  formatDateTime(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";
    return (
      date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    );
  }

  formatAmount(value: any, currency?: string): string {
    if (value === null || value === undefined || value === "") return "—";
    const num = Number(value);
    if (isNaN(num)) return "—";
    const curr =
      currency ||
      this.currentPlan?.currency_code ||
      this.currentPlan?.currency ||
      "INR";
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

  getGatewayLabel(gateway: string): string {
    if (!gateway) return "—";
    const labels: Record<string, string> = {
      razorpay: "Razorpay",
      stripe: "Stripe",
    };
    return labels[gateway.toLowerCase()] || gateway;
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
