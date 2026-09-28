import {
  Component,
  Input,
  Output,
  ChangeDetectionStrategy,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from "@angular/core";

@Component({
  standalone: false,
  selector: "app-subscription-overview",
  templateUrl: "./overview.html",
  styleUrls: ["./overview.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isLoading: boolean = false;
  @Input() currentPlan: any = null;
  @Input() allSubscriptions: any[] = [];
  @Input() usages: any[] = [];
  @Input() usageTrendChartOptions: any;

  @Output() requestReload = new EventEmitter<void>();

  resetTimer: any;
  windowResetText: string = "—";
  private lastReloadAt = 0;
  private readonly RELOAD_THROTTLE_MS = 30 * 1000;

  selectedFeatureId: string | null = null;
  trendChartOptions: any = {};

  constructor(private _changeDetectorRef: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.startResetTimer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["usages"]) {
      this.syncSelectedFeature();
      this.buildTrendChart();
    }
  }

  ngOnDestroy(): void {
    if (this.resetTimer) {
      clearInterval(this.resetTimer);
    }
  }

  startResetTimer() {
    this.updateResetText();
    this.resetTimer = setInterval(() => {
      this.updateResetText();
    }, 1000);
  }

  updateResetText() {
    const now = Date.now();

    // Count down to the EARLIEST expiring window across all usages, so the
    // header tracks the next actual reset regardless of feature ordering.
    const endTime = (this.usages || []).reduce<number | null>((min, u) => {
      const raw = u.window_end_at || u.windowEndAt;
      if (!raw) return min;
      const t = new Date(raw).getTime();
      if (!isFinite(t)) return min;
      return min === null || t < min ? t : min;
    }, null);

    if (endTime === null) {
      this.windowResetText = "—";
      this.lastReloadAt = 0;
      this._changeDetectorRef.markForCheck();
      return;
    }

    const diff = endTime - now;
    if (diff <= 0) {
      this.windowResetText = "Resets in 00:00:00";
      // Throttled retry: if the refetch is slow, errors out, or returns no
      // window yet, keep polling so the reset is reflected once it lands
      // instead of freezing on 00:00:00 forever.
      if (now - this.lastReloadAt >= this.RELOAD_THROTTLE_MS) {
        this.lastReloadAt = now;
        this.requestReload.emit();
      }
      this._changeDetectorRef.markForCheck();
      return;
    }

    // A live window is showing — arm the next expiry to fire immediately.
    this.lastReloadAt = 0;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    this.windowResetText = `Resets in ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    this._changeDetectorRef.markForCheck();
  }

  getFeatureColor(featureName: string): string {
    const name = (featureName || "").toLowerCase();
    if (name.includes("import") || name.includes("product"))
      return "bg-[#8b5cf6]"; // Purple
    if (name.includes("ai") || name.includes("description"))
      return "bg-[#10b981]"; // Green
    if (name.includes("image") || name.includes("process"))
      return "bg-[#3b82f6]"; // Blue
    if (name.includes("order") || name.includes("sync")) return "bg-[#f97316]"; // Orange
    if (
      name.includes("price") ||
      name.includes("update") ||
      name.includes("role")
    )
      return "bg-[#ec4899]"; // Pink
    if (
      name.includes("report") ||
      name.includes("api") ||
      name.includes("seller")
    )
      return "bg-[#06b6d4]"; // Cyan
    return "bg-primary";
  }

  /**
   * Single-active model: the lowest-queue_priority future is the next one that
   * will activate automatically when the current plan expires.
   */
  getNextUpSub(): any | null {
    const futures = (this.allSubscriptions || [])
      .filter((s: any) => s.status === "future")
      .sort(
        (a: any, b: any) =>
          (a.queue_priority ?? Infinity) - (b.queue_priority ?? Infinity),
      );
    return futures[0] || null;
  }

  getNotificationSteps(): any[] {
    if (!this.currentPlan) return [];

    const expiredAtVal =
      this.currentPlan.expired_at || this.currentPlan.expiredAt;
    const startedAtVal =
      this.currentPlan.started_at || this.currentPlan.startedAt;
    if (!expiredAtVal) {
      // A seller with only QUEUED plans gets a future sub without expiry.
      // Show an explicit queued state instead of a silently empty timeline.
      return [
        {
          days: 0,
          label: "No Active Subscription",
          sublabel: "A queued plan will start automatically",
          status: "upcoming",
          badgeText: "Queued",
          text: "—",
        },
      ];
    }

    const now = new Date();
    const expiredAt = new Date(expiredAtVal);
    const startedAt = startedAtVal ? new Date(startedAtVal) : null;

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(
      1,
      Math.ceil(
        (expiredAt.getTime() - (startedAt?.getTime() || now.getTime())) /
          msPerDay,
      ),
    );
    const daysLeft = Math.max(
      0,
      Math.ceil((expiredAt.getTime() - now.getTime()) / msPerDay),
    );
    const daysIn = startedAt
      ? Math.max(
          0,
          Math.min(
            totalDays,
            Math.floor((now.getTime() - startedAt.getTime()) / msPerDay) + 1,
          ),
        )
      : 0;

    const isExpired = now.getTime() >= expiredAt.getTime();
    const isLastDay = !isExpired && daysLeft <= 1;
    const isLast7 = !isExpired && daysLeft <= 7 && !isLastDay;
    const isNormalActive = !isExpired && !isLast7 && !isLastDay;

    return [
      {
        days: totalDays,
        label: "Subscription Started",
        sublabel: startedAt
          ? this.formatDate(startedAtVal)
          : "(Start date not recorded)",
        status: "done",
        color: "green",
        badgeText: "Activated",
        text: startedAt ? `Active since ${this.formatDate(startedAtVal)}` : "—",
      },
      {
        days: daysLeft,
        label: "Current Subscription",
        sublabel: isExpired
          ? "Subscription has ended"
          : `${daysIn} days in · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`,
        status: isExpired ? "done" : isNormalActive ? "active" : "done",
        color: "green",
        badgeText: isExpired ? "Completed" : "Active",
        text: isExpired
          ? `Ended on ${this.formatDate(expiredAtVal)}`
          : `Renews on ${this.formatDate(expiredAtVal)}`,
      },
      {
        days: Math.max(0, daysLeft - 7),
        label: "Last 7 Days",
        sublabel: "(7 Days Before Expiry)",
        status:
          isExpired || isLastDay ? "done" : isLast7 ? "active" : "upcoming",
        color: isExpired || isLastDay || isLast7 ? "amber" : "gray",
        badgeText:
          isExpired || isLastDay ? "Passed" : isLast7 ? "Now" : "Upcoming",
        text: `From ${this.formatDate(new Date(expiredAt.getTime() - 7 * msPerDay).toISOString())}`,
      },
      {
        days: Math.max(0, daysLeft - 1),
        label: "Last Day",
        sublabel: "(1 Day Before Expiry)",
        status: isExpired ? "done" : isLastDay ? "active" : "upcoming",
        color: isExpired || isLastDay ? "orange" : "gray",
        badgeText: isExpired ? "Passed" : isLastDay ? "Today" : "Upcoming",
        text: `From ${this.formatDate(new Date(expiredAt.getTime() - 1 * msPerDay).toISOString())}`,
      },
      {
        days: 0,
        label: "Expired",
        sublabel: "(Subscription Expired)",
        status: isExpired ? "expired" : "upcoming",
        color: isExpired ? "red" : "gray",
        badgeText: isExpired ? "Reached" : "Upcoming",
        text: `On ${this.formatDate(expiredAtVal)}`,
      },
    ];
  }

  getStepLineClass(index: number): string {
    const steps = this.getNotificationSteps();
    const nextStep = steps[index + 1];
    if (!nextStep || nextStep.status === "upcoming") {
      return "border-slate-200 dark:border-slate-700";
    }
    switch (nextStep.color) {
      case "amber":
        return "border-amber-500 dark:border-amber-400";
      case "orange":
        return "border-orange-500 dark:border-orange-400";
      case "red":
        return "border-red-500 dark:border-red-400";
      case "green":
      default:
        return "border-emerald-500 dark:border-emerald-400";
    }
  }

  getFeatureRadarChartOptions(): any {
    const width = window.innerWidth;
    let radarSize = 110;
    let labelFontSize = "9.5px";

    if (width < 380) {
      radarSize = 52;
      labelFontSize = "7.5px";
    } else if (width < 480) {
      radarSize = 75;
      labelFontSize = "8.5px";
    } else if (width < 640) {
      radarSize = 90;
      labelFontSize = "9px";
    } else if (width < 1024) {
      radarSize = 100;
      labelFontSize = "9px";
    } else if (width < 1280) {
      radarSize = 75;
      labelFontSize = "8.5px";
    }

    const categories = (this.usages || []).map((u) => {
      let name = u.feature_name || "";
      // Map long names to shorter radar-friendly, compact labels
      name = name.replace(/Active\/Deactive/i, "Toggle");
      name = name.replace(/Upload inventory and sync file/i, "Upload & Sync");
      name = name.replace(/Edit Inventory Details/i, "Edit Details");
      name = name.replace(/Import Inventory File/i, "Import File");
      name = name.replace(/Import Amazon Inventory File/i, "Import Amazon");
      name = name.replace(/Update Amazon Item By File/i, "Update Amazon");
      name = name.replace(/Add Manually Product/i, "Add Product");
      name = name.replace(/Import Catalog File/i, "Import Catalog");
      name = name.replace(/delete/i, "Del");
      name = name.replace(/update/i, "Upd");
      name = name.replace(/add/i, "Add");
      name = name.replace(/Seller Role/i, "Role");
      return name;
    });
    const data = (this.usages || []).map((u) =>
      Math.round(this.usagePercent(u)),
    );

    return {
      series: [
        {
          name: "Usage %",
          data: data.length ? data : [0],
        },
      ],
      chart: {
        type: "radar",
        height: 340,
        parentHeightOffset: 0,
        fontFamily: "inherit",
        toolbar: { show: false },
      },
      colors: ["#6366f1"],
      xaxis: {
        categories: categories.length ? categories : ["No Data"],
        labels: {
          style: {
            colors: "#64748b",
            fontSize: labelFontSize,
            fontWeight: "600",
          },
        },
      },
      yaxis: {
        show: false,
        tickAmount: 4,
        min: 0,
        max: 100,
      },
      fill: {
        opacity: 0.2,
        colors: ["#6366f1"],
      },
      stroke: {
        show: true,
        width: 2,
        colors: ["#6366f1"],
      },
      markers: {
        size: 4,
        colors: ["#fff"],
        strokeColors: ["#6366f1"],
        strokeWidth: 2,
      },
      plotOptions: {
        radar: {
          size: radarSize,
          polygons: {
            strokeColors: "#e2e8f0",
            connectorColors: "#e2e8f0",
            fill: {
              colors: ["#faf5ff", "#fff"],
            },
          },
        },
      },
      tooltip: {
        y: {
          formatter: (value: number, { dataPointIndex }: any) => {
            const usage = this.usages?.[dataPointIndex];
            if (!usage) return `${value}%`;
            const used = usage.usage ?? usage.current ?? 0;
            const limit =
              usage.limit === 0 || usage.limit === null
                ? "∞"
                : (usage.limit ?? usage.usage_count ?? "∞");
            return `${used} / ${limit} (${value}%)`;
          },
        },
      },
    };
  }

  /**
   * Single-feature trend: a 2-point line from cycle_started_at (usage 0) to
   * today (current usage). Only the ACTIVE queue's usages are ever shown. No
   * per-day data is invented — only the two real anchors exist.
   */
  getSelectedFeature(): any | null {
    if (!this.usages || this.usages.length === 0) return null;
    return (
      this.usages.find(
        (u: any) => this.getFeatureKey(u) === this.selectedFeatureId,
      ) || this.usages[0]
    );
  }

  getFeatureKey(u: any): string {
    return String(u.feature_id?._id || u.feature_id || u._id || u?.id || "");
  }

  getCycleStart(u: any): Date | null {
    const raw = u?.cycle_started_at || u?.cycleStartedAt;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    const planStart =
      this.currentPlan?.started_at || this.currentPlan?.startedAt;
    if (planStart) {
      const d = new Date(planStart);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  getCycleSpanDays(u: any): number | null {
    const start = this.getCycleStart(u);
    if (!start) return null;
    return Math.max(
      0,
      Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)),
    );
  }

  /** Honest dynamic period label: never hardcodes "Last 30 Days". */
  getTrendPeriodLabel(u: any): string {
    if (!u) return "This Billing Cycle";
    const days = this.getCycleSpanDays(u);
    if (days === null) return "This Billing Cycle";
    if (days >= 30) return "This Billing Cycle";
    return `Since ${this.formatDate(u.cycle_started_at || u.cycleStartedAt || this.currentPlan?.started_at || this.currentPlan?.startedAt)}`;
  }

  getTrendXCategories(u: any): string[] {
    const start = this.getCycleStart(u);
    const first = start
      ? start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      : "Cycle Start";
    return [first, "Today"];
  }

  getTrendColor(u: any): string {
    if (!u) return "#6366f1";
    const name = (u.feature_name || "").toLowerCase();
    if (name.includes("import") || name.includes("product")) return "#8b5cf6";
    if (name.includes("ai") || name.includes("description")) return "#10b981";
    if (name.includes("image") || name.includes("process")) return "#3b82f6";
    if (name.includes("order") || name.includes("sync")) return "#f97316";
    if (
      name.includes("price") ||
      name.includes("update") ||
      name.includes("role")
    )
      return "#ec4899";
    if (
      name.includes("report") ||
      name.includes("api") ||
      name.includes("seller")
    )
      return "#06b6d4";
    return "#6366f1";
  }

  syncSelectedFeature(): void {
    if (!this.usages || this.usages.length === 0) {
      this.selectedFeatureId = null;
      return;
    }
    const current = this.usages.find(
      (u: any) => this.getFeatureKey(u) === this.selectedFeatureId,
    );
    if (!current) {
      this.selectedFeatureId = this.getFeatureKey(this.usages[0]);
    }
  }

  selectFeature(feature: any): void {
    const key = this.getFeatureKey(feature);
    if (key === this.selectedFeatureId) return;
    this.selectedFeatureId = key;
    this.buildTrendChart();
    this._changeDetectorRef.markForCheck();
  }

  buildTrendChart(): void {
    const feature = this.getSelectedFeature();
    const base =
      this.usageTrendChartOptions &&
      typeof this.usageTrendChartOptions === "object"
        ? this.usageTrendChartOptions
        : {};

    if (!feature) {
      this.trendChartOptions = { ...base };
      return;
    }

    const used = Number(feature.usage ?? feature.current ?? 0);
    const limitRaw = feature.limit ?? feature.usage_count ?? null;
    const finiteLimit =
      limitRaw !== null && !(limitRaw === 0) ? Number(limitRaw) : null;
    const yMax = finiteLimit
      ? Math.max(used, finiteLimit) * 1.1
      : Math.max(used, 10) * 1.2;

    this.trendChartOptions = {
      ...base,
      chart: {
        ...(base.chart || {}),
        type: "line",
      },
      series: [
        {
          name: feature.feature_name || "Usage",
          data: [0, used],
        },
      ],
      colors: [this.getTrendColor(feature)],
      xaxis: {
        ...(base.xaxis || {}),
        categories: this.getTrendXCategories(feature),
      },
      yaxis: {
        ...(base.yaxis || {}),
        min: 0,
        max: Math.ceil(yMax),
        labels: {
          style: { colors: "#64748b" },
          formatter: (value: number): string => `${Math.round(value)}`,
        },
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (value: number): string =>
            `${value} / ${finiteLimit === null ? "∞" : finiteLimit}`,
        },
      },
    };
  }

  getPlanName(): string {
    return (
      this.currentPlan?.plan_name ||
      this.currentPlan?.name ||
      "No Plan Assigned"
    );
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

  formatAmount(value: any): string {
    if (value === null || value === undefined || value === "") return "—";
    const num = Number(value);
    if (isNaN(num)) return "—";
    const curr =
      this.currentPlan?.currency_code || this.currentPlan?.currency || "INR";
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

  formatDate(value: any): string {
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

  getPlanFeatures(): string[] {
    return this.currentPlan?.marketing_features || [];
  }

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

  getUsageStatusLabel(percent: number): string {
    if (percent >= 100) return "Exceeded";
    if (percent >= 90) return "Critical";
    if (percent >= 70) return "High Usage";
    if (percent >= 40) return "Normal Usage";
    return "Low Usage";
  }

  getUsageStatusBadgeClass(percent: number): string {
    if (percent >= 100)
      return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-350 dark:border-rose-900/30";
    if (percent >= 90)
      return "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-350 dark:border-red-900/30";
    if (percent >= 70)
      return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-350 dark:border-amber-900/30";
    if (percent >= 40)
      return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-350 dark:border-blue-900/30";
    return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-350 dark:border-emerald-900/30";
  }

  getUsageStatusDotClass(percent: number): string {
    if (percent >= 100) return "bg-rose-500";
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-amber-500";
    if (percent >= 40) return "bg-blue-500";
    return "bg-emerald-500";
  }

  getUsageStatusStrokeColor(percent: number): string {
    if (percent >= 100) return "#f43f5e";
    if (percent >= 90) return "#ef4444";
    if (percent >= 70) return "#f59e0b";
    if (percent >= 40) return "#3b82f6";
    return "#10b981";
  }

  getUsageIconBg(featureName: string): string {
    const name = (featureName || "").toLowerCase();
    if (name.includes("product")) return "bg-blue-50 dark:bg-blue-950/30";
    if (name.includes("order")) return "bg-emerald-50 dark:bg-emerald-950/30";
    if (name.includes("api")) return "bg-amber-50 dark:bg-amber-950/30";
    if (name.includes("barcode") || name.includes("scan"))
      return "bg-purple-50 dark:bg-purple-950/30";
    if (
      name.includes("user") ||
      name.includes("team") ||
      name.includes("member")
    )
      return "bg-indigo-50 dark:bg-indigo-950/30";
    if (name.includes("email")) return "bg-pink-50 dark:bg-pink-950/30";
    return "bg-slate-50 dark:bg-slate-800/30";
  }

  getUsageIconColor(featureName: string): string {
    const name = (featureName || "").toLowerCase();
    if (name.includes("product")) return "text-blue-600 dark:text-blue-400";
    if (name.includes("order")) return "text-emerald-600 dark:text-emerald-400";
    if (name.includes("api")) return "text-amber-600 dark:text-amber-400";
    if (name.includes("barcode") || name.includes("scan"))
      return "text-purple-600 dark:text-purple-400";
    if (
      name.includes("user") ||
      name.includes("team") ||
      name.includes("member")
    )
      return "text-indigo-600 dark:text-indigo-400";
    if (name.includes("email")) return "text-pink-600 dark:text-pink-400";
    return "text-slate-600 dark:text-slate-400";
  }

  getUsageBarColor(percent: number): string {
    return this.getUsageColor(percent);
  }

  hasWindow(usage: any): boolean {
    return !!usage && Number(usage.window_limit) > 0;
  }

  windowUsagePercent(usage: any): number {
    const limit = Number(usage?.window_limit) || 0;
    const used = Number(usage?.window_usage) || 0;
    if (!limit) return 0;
    return Math.min(100, (used / limit) * 100);
  }

  getWindowStatusColor(status: string): string {
    switch (status) {
      case "blocked":
        return "bg-red-500";
      case "warning":
        return "bg-amber-500";
      default:
        return "bg-green-500";
    }
  }

  getWindowStatusBadgeClass(status: string): string {
    switch (status) {
      case "blocked":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
      case "warning":
        return "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30";
      default:
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
    }
  }

  getWindowStatusLabel(status: string): string {
    switch (status) {
      case "blocked":
        return "Reached";
      case "warning":
        return "Near Limit";
      default:
        return "OK";
    }
  }

  getWindowLabel(usage: any): string {
    const start = usage?.window_start_at || usage?.windowStartAt;
    const end = usage?.window_end_at || usage?.windowEndAt;
    if (start && end) {
      const hours =
        (new Date(end).getTime() - new Date(start).getTime()) /
        (1000 * 60 * 60);
      if (isFinite(hours) && hours > 0) {
        const rounded = Math.round(hours);
        if (rounded === 24) return "Daily";
        if (rounded % 24 === 0) return `Every ${rounded / 24}d`;
        return rounded === 1 ? "Every 1h" : `Every ${rounded}h`;
      }
    }
    return "Window";
  }

  getWindowCardTitle(): string {
    const u = (this.usages || []).find((x) => this.hasWindow(x));
    if (!u) return "Window Usage";
    const label = this.getWindowLabel(u);
    return label === "Window" ? "Window Usage" : `${label} Window Usage`;
  }

  isPaymentUpToDate(): boolean {
    if (!this.currentPlan) return false;
    const status = (this.currentPlan.status || "").toLowerCase();
    if (status === "active") {
      const expiredAt =
        this.currentPlan.expired_at || this.currentPlan.expiredAt;
      return !expiredAt || new Date(expiredAt) > new Date();
    }
    return status === "paid" || status === "active";
  }

  hasUsageViolation(): boolean {
    if (!this.usages || this.usages.length === 0) return false;
    return this.usages.some((u) => {
      const limit = u.limit ?? u.usage_count ?? 0;
      const used = u.usage ?? u.current ?? 0;
      if (limit === 0 || limit === null) return false;
      return used > limit;
    });
  }

  getHealthScore(): number {
    let score = 100;
    if (!this.isPaymentUpToDate()) {
      score -= 40;
    }
    if (this.hasUsageViolation()) {
      score -= 30;
    }
    const daysLeft = this.getDaysLeft();
    if (daysLeft <= 0) {
      score -= 30;
    } else if (daysLeft <= 7) {
      score -= 15;
    }
    return Math.max(0, score);
  }

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

  getWindowLimitVal(u: any): number {
    if (u.window_limit !== null && u.window_limit !== undefined) {
      return Number(u.window_limit);
    }
    return 0;
  }

  getWindowUsageVal(u: any): number {
    return Number(u.window_usage) || 0;
  }

  getWindowUsagePercent(u: any): number {
    const limit = this.getWindowLimitVal(u);
    if (!limit) return 0;
    const usage = this.getWindowUsageVal(u);
    return Math.min(100, Math.round((usage / limit) * 100));
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
