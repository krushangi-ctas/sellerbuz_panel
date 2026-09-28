import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from "@angular/core";
import { FormControl, FormGroup, FormBuilder } from "@angular/forms";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  takeUntil,
  finalize,
  switchMap,
} from "rxjs";

import { SupportTicketService } from "app/core/support/support-ticket.service";
import { SupportSocketService } from "app/core/support/support-socket.service";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import {
  SupportTicket,
  TicketSummary,
  TICKET_STATUS,
  TICKET_STATUS_LABEL,
} from "app/core/support/support-ticket.model";
import { Constants } from "app/shared/constants";
import { CreateTicketDialogComponent } from "../create-ticket-dialog/create-ticket-dialog.component";

@Component({
  standalone: false,
  selector: "app-ticket-listing",
  templateUrl: "./ticket-listing.component.html",
  styleUrls: ["../support-tickets.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketListingComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) private _paginator: MatPaginator;
  @ViewChild(MatSort) private _sort: MatSort;

  // ── State ───────────────────────────────────────────────────────────────────
  tickets: SupportTicket[] = [];
  summary: TicketSummary | null = null;
  isLoading = false;
  showSummaryMobile = false;
  pagination: any = { page: 1, size: 100, hasNextPage: false };

  // ── Filters ─────────────────────────────────────────────────────────────────
  searchCtrl = new FormControl("");
  statusCtrl = new FormControl<any>("");
  categoryCtrl = new FormControl("");
  startDateCtrl = new FormControl("");
  endDateCtrl = new FormControl("");

  filterByStatus(status: any = ""): void {
    this.statusCtrl.setValue(status);
    this.onStatusChange();
  }

  readonly TICKET_STATUS = TICKET_STATUS;
  readonly TICKET_STATUS_LABEL = TICKET_STATUS_LABEL;

  /** Table columns — order matters for display */
  displayedColumns = [
    "ticketNo",
    "subject",
    "createdByName",
    "category",
    "status",
    "assignedToName",
    "lastMessage",
    "updatedAt",
    "actions",
  ];

  /** Status filter options */
  statusOptions = Object.entries(TICKET_STATUS_LABEL).map(([value, label]) => ({
    value: Number(value),
    label,
  }));

  /** Category filter options */
  categoryOptions: { value: string; label: string }[] = [];

  /** Current user flags — drive admin vs seller UI differences */
  currentUser: any;
  get isAdmin(): boolean {
    const routeSellerId = this._userSessionService.getSellerIdFromUrl();
    if (routeSellerId) {
      return false;
    }
    const localUser = this._localStorage.getItem("user");
    return !!(
      localUser?.isSuperAdmin ||
      localUser?.isPremisesUser ||
      this.currentUser?.isSuperAdmin ||
      this.currentUser?.isPremisesUser
    );
  }

  tooltip = Constants.supportTicketDetails;

  pageLimit = 100;
  pageOptions = Constants.pageOptions;

  private _destroy$ = new Subject<void>();
  private _socketUnsubs: Array<() => void> = [];

  permissionGuard: any = {};
  isSuperAdmin: boolean = false;

  private extractPermission(data: any): any {
    if (!data) return {};
    if (Array.isArray(data?.permissions)) {
      const found = data.permissions.find((item: any) => {
        if (!item?.section_name) return false;
        const name = item.section_name.trim().toLowerCase();
        return (
          name === "support tickets" ||
          name === "support ticket" ||
          name === "tickets" ||
          name === "ticket" ||
          name === "support"
        );
      });
      if (found) return found;
    }
    return (
      this._navigationService.getPermissionByRoute(
        data,
        "/master/support/tickets",
      ) || {}
    );
  }

  private checkPermission(action: string): boolean {
    if (this.isSuperAdmin) {
      return true;
    }
    if (
      !this.permissionGuard ||
      (typeof this.permissionGuard === "object" &&
        !Object.keys(this.permissionGuard).length)
    ) {
      return true;
    }
    if (this.permissionGuard && action in this.permissionGuard) {
      return Boolean(this.permissionGuard[action]);
    }
    return true;
  }

  get canView(): boolean {
    return this.checkPermission("view");
  }
  get canAdd(): boolean {
    return this.checkPermission("add");
  }
  get canUpdate(): boolean {
    return this.checkPermission("update");
  }
  get canDelete(): boolean {
    return this.checkPermission("delete");
  }

  constructor(
    private readonly _supportService: SupportTicketService,
    private readonly _socketService: SupportSocketService,
    private readonly _localStorage: LocalStorageService,
    private readonly _dialog: MatDialog,

    private readonly _router: Router,
    private readonly _cdr: ChangeDetectorRef,
    private readonly _userSessionService: UserSessionsService,
    private readonly _navigationService: NavigationService,
  ) {
    this.currentUser =
      this._userSessionService.getCurrentUser() ||
      this._localStorage.getItem("user");
    this.categoryOptions = this.isAdmin
      ? Constants.adminSupportCategories
      : Constants.sellerSupportCategories;
  }

  ngOnInit(): void {
    this.isSuperAdmin = this._navigationService.isSuperAdmin;
    this._navigationService.userRoleData
      .pipe(takeUntil(this._destroy$))
      .subscribe((data) => {
        this.permissionGuard = this.extractPermission(data);
        this._cdr.markForCheck();
      });
    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._destroy$))
      .subscribe((data) => {
        if (
          !this.permissionGuard ||
          !Object.keys(this.permissionGuard).length
        ) {
          this.permissionGuard = this.extractPermission(data);
          this._cdr.markForCheck();
        }
      });
    this._supportService.summary$
      .pipe(takeUntil(this._destroy$))
      .subscribe((s) => {
        if (s) {
          this.summary = s;
          this._cdr.markForCheck();
        }
      });
    this._loadSummary();
    this._loadTickets();
    this._setupSearchDebounce();
    this._setupSocketListeners();
  }

  ngOnDestroy(): void {
    this._socketUnsubs.forEach((u) => u());
    this._socketUnsubs = [];
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  private _loadSummary(): void {
    const summaryParams: any = {};
    const routeSellerId = this._userSessionService.getSellerIdFromUrl();
    if (routeSellerId) {
      summaryParams.sellerId = routeSellerId;
    }

    const search = this.searchCtrl.value?.trim();
    if (search) summaryParams.search = search;
    if (
      this.statusCtrl.value !== undefined &&
      this.statusCtrl.value !== null &&
      this.statusCtrl.value !== ""
    ) {
      summaryParams.status = this.statusCtrl.value;
    }
    if (this.categoryCtrl.value)
      summaryParams.category = this.categoryCtrl.value;
    if (this.startDateCtrl.value)
      summaryParams.startDate = this.startDateCtrl.value;
    if (this.endDateCtrl.value) summaryParams.endDate = this.endDateCtrl.value;

    this._supportService
      .getSummary(summaryParams)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (res) => {
          if (res?.data) {
            this.summary = res.data;
          } else if (res && typeof res === "object") {
            this.summary = res;
          }
          this._cdr.markForCheck();
        },
      });
  }

  private _loadTickets(page = 1): void {
    this.isLoading = true;
    this._cdr.markForCheck();

    const params: any = {
      page,
      limit: this.pageLimit,
      sortBy: "lastMessageAt:desc",
    };

    const routeSellerId = this._userSessionService.getSellerIdFromUrl();
    if (routeSellerId) {
      params.sellerId = routeSellerId;
    }

    const search = this.searchCtrl.value?.trim();
    if (search) params.search = search;
    if (this.statusCtrl.value) params.status = this.statusCtrl.value;
    if (this.categoryCtrl.value) params.category = this.categoryCtrl.value;
    if (this.startDateCtrl.value) params.startDate = this.startDateCtrl.value;
    if (this.endDateCtrl.value) params.endDate = this.endDateCtrl.value;

    this._supportService
      .getTickets(params)
      .pipe(
        takeUntil(this._destroy$),
        finalize(() => {
          this.isLoading = false;
          this._cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.tickets = res.data || [];
          this.pagination = res.pagination || this.pagination;
          this._loadSummary();
          this._cdr.markForCheck();
        },
      });
  }

  private _setupSearchDebounce(): void {
    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this._destroy$),
      )
      .subscribe(() => this._loadTickets());
  }

  private _setupSocketListeners(): void {
    this._socketService.connect();

    if (this.isAdmin) {
      this._socketService.joinAdminRoom();
    }

    // When a new ticket is created — refresh list and summary
    const offCreated = this._socketService.on("ticket_created", () => {
      this._loadSummary();
      this._loadTickets();
    });

    // When a new message arrives on any ticket visible to this user — update listing state
    const offMessage = this._socketService.on("new_message", (payload: any) => {
      const idx = this.tickets.findIndex((t) => t._id === payload.ticketId);
      if (idx > -1) {
        this.tickets[idx] = {
          ...this.tickets[idx],
          lastMessage:
            payload.message?.message?.slice(0, 200) ||
            this.tickets[idx].lastMessage,
          lastMessageAt: payload.message?.createdAt,
          unreadAdminCount:
            payload.unreadAdminCount ?? this.tickets[idx].unreadAdminCount,
          unreadSellerCount:
            payload.unreadSellerCount ?? this.tickets[idx].unreadSellerCount,
        };
        this.tickets = [...this.tickets];
      }
      this._loadSummary();
      this._loadTickets();
      this._cdr.markForCheck();
    });

    // Status change — update status badge in list
    const offStatus = this._socketService.on(
      "status_changed",
      (payload: any) => {
        const idx = this.tickets.findIndex((t) => t._id === payload.ticketId);
        if (idx > -1) {
          this.tickets[idx] = { ...this.tickets[idx], status: payload.status };
          this.tickets = [...this.tickets];
          this._cdr.markForCheck();
        }
      },
    );

    this._socketUnsubs = [offCreated, offMessage, offStatus];
  }

  // ── Filter actions ──────────────────────────────────────────────────────────

  refresh(): void {
    this.searchCtrl.setValue("", { emitEvent: false });
    this.statusCtrl.setValue("", { emitEvent: false });
    this.categoryCtrl.setValue("", { emitEvent: false });
    this.startDateCtrl.setValue("", { emitEvent: false });
    this.endDateCtrl.setValue("", { emitEvent: false });
    this._loadSummary();
    this._loadTickets(1);
  }

  onStatusChange(): void {
    this._loadTickets();
  }
  onCategoryChange(): void {
    this._loadTickets();
  }
  onDateChange(): void {
    this._loadTickets();
  }

  onPage(event: PageEvent): void {
    this.pageLimit = event.pageSize;
    this._loadTickets(event.pageIndex + 1);
  }

  clearFilters(): void {
    this.searchCtrl.reset("");
    this.statusCtrl.reset("");
    this.categoryCtrl.reset("");
    this.startDateCtrl.reset("");
    this.endDateCtrl.reset("");
    this._loadTickets();
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  openCreateDialog(): void {
    const routeSellerId = this._userSessionService.getSellerIdFromUrl();
    const ref = this._dialog.open(CreateTicketDialogComponent, {
      width: "600px",
      disableClose: true,
      data: { sellerId: routeSellerId },
    });
    ref.afterClosed().subscribe((created) => {
      if (created) {
        this._loadSummary();
        this._loadTickets();
      }
    });
  }

  openTicket(ticket: SupportTicket): void {
    const sellerId = this._userSessionService.getSellerIdFromUrl();
    if (sellerId) {
      this._router.navigate([
        `/${sellerId}/master/support/tickets`,
        ticket._id,
      ]);
    } else {
      this._router.navigate(["/master/support/tickets", ticket._id]);
    }
  }

  /** Unread count for the current side */
  getUnreadCount(ticket: SupportTicket): number {
    return this.isAdmin ? ticket.unreadAdminCount : ticket.unreadSellerCount;
  }

  trackByFn(index: number, item: SupportTicket): string {
    return item._id || index.toString();
  }
}
