import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from "@angular/core";

@Component({
  standalone: false,
  selector: "app-subscription-history",
  templateUrl: "./history.html",
  styleUrls: ["./history.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent {
  @Input() isLoading: boolean = false;
  @Input() allSubscriptions: any[] = [];

  @Input() subscriptionPage: number = 1;
  @Input() subscriptionLimit: number = 10;

  @Output() downloadInvoice = new EventEmitter<any>();

  // ─── Pagination ────────────────────────────────────────────────────────────

  get totalLength(): number {
    return this.allSubscriptions?.length || 0;
  }

  get paginatedSubscriptions(): any[] {
    if (!this.allSubscriptions) return [];
    const startIndex = (this.subscriptionPage - 1) * this.subscriptionLimit;
    const endIndex = startIndex + this.subscriptionLimit;
    return this.allSubscriptions.slice(startIndex, endIndex);
  }

  onPageChange(event: any): void {
    this.subscriptionPage = event.pageIndex + 1;
    this.subscriptionLimit = event.pageSize;
  }

  // ─── Formatting ──────────────────────────────────────────────────────────

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
    const curr = currency || "INR";
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: curr.toUpperCase(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      return `${curr} ${num.toFixed(0)}`;
    }
  }

  getBillingCycleLabel(cycle: string): string {
    if (!cycle) return "—";
    const labels: Record<string, string> = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      yearly: "Yearly",
      annual: "Annual",
    };
    return labels[cycle.toLowerCase()] || cycle;
  }

  getGatewayLabel(gateway: string): string {
    if (!gateway) return "—";
    const labels: Record<string, string> = {
      razorpay: "Razorpay",
      stripe: "Stripe",
      manual: "Manual",
      offline: "Offline",
    };
    return labels[gateway.toLowerCase()] || gateway;
  }

  getPaymentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      success: "Paid",
      paid: "Paid",
      pending: "Pending",
      failed: "Failed",
      cancelled: "Cancelled",
      refunded: "Refunded",
      created: "Created",
    };
    return labels[status] || status || "—";
  }

  isPaymentSuccess(status: string): boolean {
    return status === "success" || status === "paid";
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
