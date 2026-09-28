import { Component, Input } from "@angular/core";
import { TICKET_STATUS_LABEL } from "app/core/support/support-ticket.model";

/**
 * TicketStatusBadgeComponent — displays a colored chip for a given status number.
 * Maps 1–7 to labels via TICKET_STATUS_LABEL constant.
 */
@Component({
  standalone: false,
  selector: "app-ticket-status-badge",
  template: `
    <span [class]="badgeClasses">
      <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
      {{ label }}
    </span>
  `,
})
export class TicketStatusBadgeComponent {
  @Input() status: number | undefined | null;

  get label(): string {
    return this.status ? TICKET_STATUS_LABEL[this.status] || "Unknown" : "—";
  }

  get badgeClasses(): string {
    const base =
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-2xs transition-all select-none";
    switch (this.status) {
      case 1: // Open
        return `${base} bg-blue-50 text-blue-700 border-blue-200`;
      case 2: // Assigned
        return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
      case 3: // Pending Customer
        return `${base} bg-amber-50 text-amber-700 border-amber-200`;
      case 4: // Pending Support
        return `${base} bg-orange-50 text-orange-700 border-orange-200`;
      case 5: // Resolved
        return `${base} bg-teal-50 text-teal-700 border-teal-200`;
      case 6: // Closed
        return `${base} bg-slate-100 text-slate-600 border-slate-200`;
      case 7: // Reopened
        return `${base} bg-pink-50 text-pink-700 border-pink-200`;
      default:
        return `${base} bg-slate-100 text-slate-500 border-slate-200`;
    }
  }
}
