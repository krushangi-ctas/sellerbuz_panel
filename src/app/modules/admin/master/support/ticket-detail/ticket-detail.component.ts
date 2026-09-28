import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormControl } from "@angular/forms";
import { MatSelect } from "@angular/material/select";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from "rxjs";

import { SupportTicketService } from "app/core/support/support-ticket.service";
import { SupportSocketService } from "app/core/support/support-socket.service";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { SessionStorageService } from "app/core/local/session-storage.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { RoleService } from "app/core/manage-role/role.service";
import { SellerRoleService } from "app/core/seller-role/seller-role.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { QuickReplyService } from "app/core/support/quick-reply.service";
import { QuickReply } from "app/core/support/quick-reply.model";
import { environment } from "environments/environment";
import {
  SupportTicket,
  TicketMessage,
  TicketAttachment,
  TICKET_STATUS,
  TICKET_STATUS_LABEL,
} from "app/core/support/support-ticket.model";

export interface MessageGroup {
  dateLabel: string;
  messages: TicketMessage[];
}

@Component({
  standalone: false,
  selector: "app-ticket-detail",
  templateUrl: "./ticket-detail.component.html",
  styleUrls: ["../support-tickets.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  @ViewChild("messageContainer") private _msgContainer: ElementRef;

  ticket: SupportTicket | null = null;
  groupedMessages: MessageGroup[] = [];
  isLoading = false;
  isSending = false;

  // Composer state
  messageCtrl = new FormControl("");
  pendingAttachments: any[] = [];
  isUploading = false;
  isTyping = false; // someone else is typing
  typingTimeout: any;

  // Quick Reply Autocomplete State (Admin only)
  allQuickReplies: QuickReply[] = [];
  filteredQuickReplies: QuickReply[] = [];
  showQuickReplyMenu = false;
  quickReplyTagMatch = "";

  // Right panel
  statusCtrl = new FormControl<number | null>(null);
  statusFilterCtrl = new FormControl("");
  filteredStatusOptions: { value: number; label: string }[] = [];

  assigneeCtrl = new FormControl<string | null>(null);
  assigneeFilterCtrl = new FormControl("");
  roleOptions: { _id: string; role_name: string }[] = [];
  filteredRoleOptions: { _id: string; role_name: string }[] = [];

  readonly TICKET_STATUS = TICKET_STATUS;
  readonly TICKET_STATUS_LABEL = TICKET_STATUS_LABEL;

  readonly statusOptions = Object.entries(TICKET_STATUS_LABEL).map(
    ([v, l]) => ({
      value: Number(v),
      label: l,
    }),
  );

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

  private _ticketId: string;
  private _destroy$ = new Subject<void>();
  private _socketUnsubs: Array<() => void> = [];

  permissionGuard: any = {};
  quickReplyPermissionGuard: any = {};
  isSuperAdmin: boolean = false;

  private extractPermission(
    data: any,
    sectionNames: string[],
    defaultRoute: string,
  ): any {
    if (!data) return {};
    if (Array.isArray(data?.permissions)) {
      const found = data.permissions.find((item: any) => {
        if (!item?.section_name) return false;
        const name = item.section_name.trim().toLowerCase();
        return sectionNames.some((s) => s.toLowerCase() === name);
      });
      if (found) return found;
    }
    return (
      this._navigationService.getPermissionByRoute(data, defaultRoute) || {}
    );
  }

  private checkPermission(action: string, guardObj?: any): boolean {
    if (this.isSuperAdmin) {
      return true;
    }
    const guard =
      guardObj ||
      (this.permissionGuard && Object.keys(this.permissionGuard).length
        ? this.permissionGuard
        : {});
    if (!guard || (typeof guard === "object" && !Object.keys(guard).length)) {
      return true;
    }
    if (guard && action in guard) {
      return Boolean(guard[action]);
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
  get canViewQuickReply(): boolean {
    return this.checkPermission("view", this.quickReplyPermissionGuard);
  }

  constructor(
    private readonly _route: ActivatedRoute,
    private readonly _router: Router,
    private readonly _supportService: SupportTicketService,
    private readonly _socketService: SupportSocketService,
    private readonly _quickReplyService: QuickReplyService,
    private readonly _localStorage: LocalStorageService,
    private readonly _sessionStorage: SessionStorageService,
    private readonly _roleService: RoleService,
    private readonly _sellerRoleService: SellerRoleService,
    private readonly _snackBar: MatSnackBar,
    private readonly _cdr: ChangeDetectorRef,
    private readonly _userSessionService: UserSessionsService,
    private readonly _navigationService: NavigationService,
  ) {
    this._initUserContext();
  }

  private _initUserContext(): void {
    const routeUserId = this._userSessionService.getSellerIdFromUrl();
    const sessionUser =
      this._userSessionService.getCurrentUser() ||
      this._sessionStorage.getItem("user");

    if (routeUserId) {
      // URL 1: Seller mode (/6a9683f9e830af030ec4418a/master/support/tickets/:id)
      // Consider routeUserId as the active seller user context (like catalog module)
      const sessionUsers = this._sessionStorage.getItem("userArray") || [];
      const matchedUser = sessionUsers.find(
        (u: any) => (u.id || u._id || u.user_id) === routeUserId,
      );

      const baseUser = matchedUser || sessionUser || {};
      this.currentUser = {
        ...baseUser,
        id: routeUserId,
        _id: routeUserId,
        seller_id: routeUserId,
      };
    } else {
      // URL 2: Standard Admin Route (/master/support/tickets/:id)
      this.currentUser = sessionUser || this._localStorage.getItem("user");
    }
  }

  ngOnInit(): void {
    this.isSuperAdmin = this._navigationService.isSuperAdmin;
    this._navigationService.userRoleData
      .pipe(takeUntil(this._destroy$))
      .subscribe((data) => {
        this.permissionGuard = this.extractPermission(
          data,
          ["support tickets", "support ticket", "tickets", "ticket", "support"],
          "/master/support/tickets",
        );
        this.quickReplyPermissionGuard = this.extractPermission(
          data,
          ["quick replies", "quick reply"],
          "/master/support/quick-replies",
        );
        this._cdr.markForCheck();
      });
    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._destroy$))
      .subscribe((data) => {
        if (
          !this.permissionGuard ||
          !Object.keys(this.permissionGuard).length
        ) {
          this.permissionGuard = this.extractPermission(
            data,
            [
              "support tickets",
              "support ticket",
              "tickets",
              "ticket",
              "support",
            ],
            "/master/support/tickets",
          );
          this.quickReplyPermissionGuard = this.extractPermission(
            data,
            ["quick replies", "quick reply"],
            "/master/support/quick-replies",
          );
          this._cdr.markForCheck();
        }
      });
    this.filteredStatusOptions = [...this.statusOptions];
    this._ticketId = this._route.snapshot.paramMap.get("id")!;
    this._loadRoles();
    this._loadTicket();
    this._connectSocket();
    this._setupTypingEmit();
    if (this.isAdmin) {
      this._loadQuickReplies();
      this._setupQuickReplyListener();
    }
  }

  filterStatuses(query: string): void {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      this.filteredStatusOptions = [...this.statusOptions];
    } else {
      this.filteredStatusOptions = this.statusOptions.filter((opt) =>
        opt.label.toLowerCase().includes(q),
      );
    }
    this._cdr.markForCheck();
  }

  triggerStatusEvent(): void {
    this.filteredStatusOptions = [...this.statusOptions];
    this.statusFilterCtrl.setValue("", { emitEvent: false });
  }

  filterRoles(query: string): void {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      this.filteredRoleOptions = [...this.roleOptions];
    } else {
      this.filteredRoleOptions = this.roleOptions.filter(
        (r) => r.role_name && r.role_name.toLowerCase().includes(q),
      );
    }
    this._cdr.markForCheck();
  }

  triggerRoleEvent(): void {
    this.filteredRoleOptions = [...this.roleOptions];
    this.assigneeFilterCtrl.setValue("", { emitEvent: false });
  }

  /**
   * Load active Quick Replies for admin autocomplete suggestions
   */
  private _loadQuickReplies(): void {
    this._quickReplyService
      .getQuickReplies({ status: 1, limit: 500 })
      .subscribe({
        next: (res) => {
          if (res?.data?.results) {
            this.allQuickReplies = res.data.results;
          }
        },
        error: () => {},
      });
  }

  /**
   * Setup reactive listener for #tag trigger in message textarea
   */
  private _setupQuickReplyListener(): void {
    this.messageCtrl.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe((val) => {
        if (!this.isAdmin || !val) {
          this.showQuickReplyMenu = false;
          this.filteredQuickReplies = [];
          this._cdr.markForCheck();
          return;
        }

        // Match trailing #tag string pattern (e.g. "#product")
        const match = val.match(/#([a-zA-Z0-9_-]*)$/);
        if (match) {
          const query = match[1].toLowerCase();
          this.quickReplyTagMatch = match[0];
          this.filteredQuickReplies = this.allQuickReplies.filter(
            (qr) =>
              qr.status === 1 &&
              (qr.tag.toLowerCase().includes(query) ||
                qr.suggestion.toLowerCase().includes(query)),
          );
          this.showQuickReplyMenu = this.filteredQuickReplies.length > 0;
        } else {
          this.showQuickReplyMenu = false;
          this.filteredQuickReplies = [];
        }
        this._cdr.markForCheck();
      });
  }

  /**
   * Insert selected Quick Reply suggestion into reply text input
   */
  selectQuickReply(qr: QuickReply): void {
    const currentVal = this.messageCtrl.value || "";
    if (this.quickReplyTagMatch) {
      const lastIndex = currentVal.lastIndexOf(this.quickReplyTagMatch);
      if (lastIndex !== -1) {
        const newVal =
          currentVal.substring(0, lastIndex) +
          qr.suggestion +
          currentVal.substring(lastIndex + this.quickReplyTagMatch.length);
        this.messageCtrl.setValue(newVal);
      } else {
        this.messageCtrl.setValue(currentVal + qr.suggestion);
      }
    } else {
      this.messageCtrl.setValue(currentVal + qr.suggestion);
    }
    this.showQuickReplyMenu = false;
    this.filteredQuickReplies = [];
    this._cdr.markForCheck();
  }

  getFileUrl(url?: string): string {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const apiOrigin = environment.apiBaseUrl.replace(/\/v1\/?$/, "");
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${apiOrigin}${cleanPath}`;
  }

  isImage(att: any): boolean {
    if (!att) return false;
    if (att.mimeType?.startsWith("image/")) return true;
    const name = att.fileName || att.url || "";
    return /\.(png|jpe?g|gif|webp|svg|bmp|avif|heic)$/i.test(name);
  }

  isVideo(att: any): boolean {
    if (!att) return false;
    if (att.mimeType?.startsWith("video/")) return true;
    const name = att.fileName || att.url || "";
    return /\.(mp4|webm|ogg|mov|m4v|mkv|avi)$/i.test(name);
  }

  ngOnDestroy(): void {
    this._socketService.clearActiveTicket(this._ticketId);
    this._socketUnsubs.forEach((u) => u());
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ── Data ────────────────────────────────────────────────────────────────────

  private _loadTicket(): void {
    this.isLoading = true;
    const routeSellerId = this._userSessionService.getSellerIdFromUrl();
    this._supportService
      .getTicketById(this._ticketId, routeSellerId || undefined)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (res) => {
          this.ticket = res.data
            ? {
                ...res.data,
                messages: this._dedupeMessages(res.data.messages || []),
              }
            : res.data;
          this._updateGroupedMessages();
          this.statusCtrl.setValue(this.ticket?.status ?? null, {
            emitEvent: false,
          });
          this.assigneeCtrl.setValue(this.ticket?.assignedToUserId ?? null, {
            emitEvent: false,
          });
          this.isLoading = false;
          // Mark conversation as read
          this._supportService
            .markRead(this._ticketId, routeSellerId || undefined)
            .subscribe();
          this._cdr.markForCheck();
          setTimeout(() => this._scrollToBottom(), 100);
        },
        error: () => {
          this.isLoading = false;
          this._cdr.markForCheck();
        },
      });
  }

  // ── Socket ──────────────────────────────────────────────────────────────────

  private _connectSocket(): void {
    this._socketService.connect();
    const userId =
      this.currentUser?.id ||
      this.currentUser?._id ||
      this.currentUser?.userId ||
      "";
    this._socketService.setActiveTicket(this._ticketId, userId);

    // New message received
    const offNew = this._socketService.on("new_message", (payload: any) => {
      if (payload.ticketId !== this._ticketId) return;
      // Only append if it's not a message we sent (avoid duplicate from optimistic)
      const exists = this.ticket?.messages.some(
        (m) => m._id === payload.message._id,
      );
      if (!exists) {
        this._supportService.appendMessageLocally(payload.message);
        this.ticket = {
          ...this.ticket!,
          messages: this._dedupeMessages([
            ...(this.ticket?.messages || []),
            payload.message,
          ]),
        };
        this._updateGroupedMessages();
        this._cdr.markForCheck();
        setTimeout(() => this._scrollToBottom(), 80);
      }
    });

    // Typing indicator
    const offTyping = this._socketService.on("typing", (payload: any) => {
      const selfId =
        this.currentUser?.id ||
        this.currentUser?._id ||
        this.currentUser?.userId;
      if (payload.ticketId !== this._ticketId || payload.userId === selfId)
        return;
      this.isTyping = payload.isTyping;
      this._cdr.markForCheck();
    });

    // Status changed
    const offStatus = this._socketService.on(
      "status_changed",
      (payload: any) => {
        if (payload.ticketId !== this._ticketId) return;
        if (this.ticket) {
          this.ticket = { ...this.ticket, status: payload.status };
          this.statusCtrl.setValue(payload.status, { emitEvent: false });
          this._cdr.markForCheck();
        }
      },
    );

    // Seen
    const offSeen = this._socketService.on("seen", (payload: any) => {
      if (payload.ticketId !== this._ticketId) return;
      this._cdr.markForCheck();
    });

    // Assigned
    const offAssigned = this._socketService.on(
      "ticket_assigned",
      (payload: any) => {
        if (payload.ticketId !== this._ticketId) return;
        if (this.ticket) {
          this.ticket = {
            ...this.ticket,
            assignedToUserId: payload.assignedToUserId,
          };
          this.assigneeCtrl.setValue(payload.assignedToUserId, {
            emitEvent: false,
          });
          this._cdr.markForCheck();
        }
      },
    );

    this._socketUnsubs = [offNew, offTyping, offStatus, offSeen, offAssigned];
  }

  private _setupTypingEmit(): void {
    const userId =
      this.currentUser?.id || this.currentUser?._id || this.currentUser?.userId;
    this.messageCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this._destroy$),
      )
      .subscribe(() => {
        this._socketService.emitTyping(this._ticketId, userId, true);
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
          this._socketService.emitTyping(this._ticketId, userId, false);
        }, 2000);
      });
  }

  private _loadRoles(): void {
    if (this.isAdmin) {
      this._roleService
        .getRoles(1, 100)
        .pipe(takeUntil(this._destroy$))
        .subscribe({
          next: (res: any) => {
            this.roleOptions = (res.data || []).map((r: any) => ({
              _id: r._id,
              role_name: r.role_name || r.name,
            }));
            this.filteredRoleOptions = [...this.roleOptions];
            this._cdr.markForCheck();
          },
        });
    } else {
      this._sellerRoleService
        .getSellerRoles(1, 100)
        .pipe(takeUntil(this._destroy$))
        .subscribe({
          next: (res: any) => {
            this.roleOptions = (res.data || []).map((r: any) => ({
              _id: r._id,
              role_name: r.role_name || r.name,
            }));
            this.filteredRoleOptions = [...this.roleOptions];
            this._cdr.markForCheck();
          },
        });
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  onAssigneeChange(roleId: string): void {
    if (!this.ticket) return;
    this._supportService
      .assignTicket(this._ticketId, roleId)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (res) => {
          const selectedRole = this.roleOptions.find((r) => r._id === roleId);
          const roleName = selectedRole ? selectedRole.role_name : "Unassigned";
          const newStatus =
            this.ticket!.status === TICKET_STATUS.OPEN && roleId
              ? TICKET_STATUS.ASSIGNED
              : this.ticket!.status;

          this.ticket = {
            ...this.ticket!,
            assignedToUserId: roleId || null,
            assignedToName: roleName,
            status: newStatus,
          };

          this.assigneeCtrl.setValue(roleId || null, { emitEvent: false });
          if (newStatus !== this.ticket.status) {
            this.statusCtrl.setValue(newStatus, { emitEvent: false });
          }
          this._cdr.markForCheck();
        },
      });
  }

  onKeydownEnter(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    if (kbEvent.shiftKey) return;
    kbEvent.preventDefault();
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.messageCtrl.value?.trim();
    if (!text || this.isSending) return;

    const routeSellerId = this._userSessionService.getSellerIdFromUrl();
    const senderId =
      routeSellerId || this.currentUser?.id || this.currentUser?._id;
    const senderRole = routeSellerId
      ? "seller"
      : this.isAdmin
        ? "admin"
        : this.currentUser?.is_seller_user
          ? "seller_user"
          : "seller";

    // Optimistic UI — add message locally immediately
    const optimisticMsg: TicketMessage = {
      _id: `tmp-${Date.now()}`,
      senderId: senderId,
      senderRole: senderRole,
      senderName: this.currentUser?.first_name
        ? `${this.currentUser.first_name} ${this.currentUser.last_name || ""}`.trim()
        : this.currentUser?.name || (routeSellerId ? "Seller" : "Support"),
      message: text,
      attachments: this.pendingAttachments,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    this.ticket = {
      ...this.ticket!,
      messages: [...(this.ticket?.messages || []), optimisticMsg],
    };
    this._updateGroupedMessages();
    this.messageCtrl.reset("");
    this.pendingAttachments = [];
    this.isSending = true;
    this._cdr.markForCheck();
    setTimeout(() => this._scrollToBottom(), 80);

    const payload: any = {
      message: text,
      attachments: optimisticMsg.attachments,
    };
    if (routeSellerId) {
      payload.senderId = routeSellerId;
      payload.senderRole = "seller";
      payload.sellerId = routeSellerId;
    }

    this._supportService
      .addMessage(this._ticketId, payload)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (res) => {
          // Replace optimistic message with real one from server
          if (this.ticket && res.data) {
            const alreadyHasReal = this.ticket.messages.some(
              (m) => m._id === res.data._id,
            );
            const idx = this.ticket.messages.findIndex(
              (m) => m._id === optimisticMsg._id,
            );
            const msgs = [...this.ticket.messages];
            if (alreadyHasReal && idx > -1) {
              msgs.splice(idx, 1);
            } else if (idx > -1) {
              msgs[idx] = res.data;
            } else if (!alreadyHasReal) {
              msgs.push(res.data);
            }
            this.ticket = {
              ...this.ticket,
              messages: this._dedupeMessages(msgs),
            };
            this._updateGroupedMessages();
          }
          this.isSending = false;
          this._cdr.markForCheck();
        },
        error: () => {
          // Remove optimistic message on failure
          this.ticket = {
            ...this.ticket!,
            messages: this.ticket!.messages.filter(
              (m) => m._id !== optimisticMsg._id,
            ),
          };
          this._updateGroupedMessages();
          this.messageCtrl.setValue(text); // restore text
          this.isSending = false;
          this._cdr.markForCheck();
        },
      });
  }

  private _updateGroupedMessages(): void {
    if (!this.ticket?.messages || !this.ticket.messages.length) {
      this.groupedMessages = [];
      return;
    }

    const groupsMap = new Map<string, TicketMessage[]>();

    for (const msg of this.ticket.messages) {
      if (!msg || !msg.createdAt) continue;
      const msgDate = new Date(msg.createdAt);
      if (isNaN(msgDate.getTime())) continue;
      const dateKey = `${msgDate.getFullYear()}-${String(msgDate.getMonth() + 1).padStart(2, "0")}-${String(msgDate.getDate()).padStart(2, "0")}`;

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey)!.push(msg);
    }

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yesterdayKey = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;

    const result: MessageGroup[] = [];

    groupsMap.forEach((msgs, dateKey) => {
      let label = "";
      if (dateKey === todayKey) {
        label = "Today";
      } else if (dateKey === yesterdayKey) {
        label = "Yesterday";
      } else {
        const d = new Date(msgs[0].createdAt);
        label = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
      result.push({ dateLabel: label, messages: msgs });
    });

    this.groupedMessages = result;
  }

  private _dedupeMessages(messages: TicketMessage[]): TicketMessage[] {
    if (!messages) return [];
    const seen = new Set<string>();
    return messages.filter((m) => {
      if (!m || !m._id) return true;
      if (seen.has(m._id)) return false;
      seen.add(m._id);
      return true;
    });
  }

  onStatusChange(newStatus: number): void {
    if (!this.ticket || newStatus === this.ticket.status) return;
    this._supportService
      .changeStatus(this._ticketId, newStatus)
      .pipe(takeUntil(this._destroy$))
      .subscribe({ next: () => this._loadTicket() });
  }

  onFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.isUploading = true;
    this._supportService
      .uploadFile(this._ticketId, file)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (res) => {
          if (res.data)
            this.pendingAttachments = [...this.pendingAttachments, res.data];
          this.isUploading = false;
          this._cdr.markForCheck();
        },
        error: () => {
          this.isUploading = false;
          this._cdr.markForCheck();
        },
      });
  }

  removeAttachment(index: number): void {
    this.pendingAttachments = this.pendingAttachments.filter(
      (_, i) => i !== index,
    );
  }

  goBack(): void {
    const sellerId = this._userSessionService.getSellerIdFromUrl();
    if (sellerId) {
      this._router.navigate([`/${sellerId}/master/support/tickets`]);
    } else {
      this._router.navigate(["/master/support/tickets"]);
    }
  }

  isOutgoingMessage(msg: TicketMessage): boolean {
    if (!msg) return false;

    const routeSellerId = this._userSessionService.getSellerIdFromUrl();
    const isMsgFromAdmin =
      msg.senderRole === "admin" || msg.senderRole === "support";
    const isMsgFromSeller =
      msg.senderRole === "seller" || msg.senderRole === "seller_user";

    // 1. If route contains sellerId (URL 1: e.g. /6a9683f9e830af030ec4418a/master/support/tickets/:id):
    // We are viewing from Seller perspective -> Seller messages are OUTGOING (RIGHT), Admin messages are INCOMING (LEFT)
    if (routeSellerId) {
      const senderIdStr = String(
        (msg.senderId as any)?._id ||
          (msg.senderId as any)?.id ||
          msg.senderId ||
          "",
      );
      if (senderIdStr && senderIdStr === routeSellerId) return true;
      if (isMsgFromSeller) return true;
      if (isMsgFromAdmin) return false;
      return false;
    }

    // 2. Standard Admin Route (URL 2: /master/support/tickets/:id):
    // We are viewing from Admin perspective -> Admin messages are OUTGOING (RIGHT), Seller messages are INCOMING (LEFT)
    if (this.isAdmin) {
      if (isMsgFromAdmin) return true;
      if (isMsgFromSeller) return false;
      const currentUserId =
        this.currentUser?.id ||
        this.currentUser?._id ||
        this.currentUser?.user_id;
      const senderIdStr = String(
        (msg.senderId as any)?._id ||
          (msg.senderId as any)?.id ||
          msg.senderId ||
          "",
      );
      return !!(currentUserId && senderIdStr === String(currentUserId));
    }

    // 3. Fallback for pure seller panel
    return isMsgFromSeller;
  }

  getSenderLabel(msg: TicketMessage): string {
    if (this.isOutgoingMessage(msg)) {
      return "YOU";
    }
    if (msg.senderName && msg.senderName.trim()) {
      return msg.senderName.trim();
    }
    const isMsgFromAdmin =
      msg.senderRole === "admin" || msg.senderRole === "support";
    return isMsgFromAdmin ? "SUPPORT" : "CUSTOMER";
  }

  getAvatarInitial(msg: TicketMessage): string {
    if (msg.senderName && msg.senderName.trim()) {
      return msg.senderName.trim().charAt(0).toUpperCase();
    }
    const isMsgFromAdmin =
      msg.senderRole === "admin" || msg.senderRole === "support";
    return isMsgFromAdmin ? "A" : "C";
  }

  getSellerDisplayName(): string {
    if (!this.ticket) return "—";
    if (this.ticket.sellerName?.trim()) return this.ticket.sellerName.trim();
    const info = (this.ticket as any).sellerInfo?.[0];
    if (info) {
      const name = `${info.first_name || ""} ${info.last_name || ""}`.trim();
      if (name) return name;
    }
    return "-";
  }

  getCreatedByDisplayName(): string {
    if (!this.ticket) return "—";
    if (this.ticket.createdByName?.trim())
      return this.ticket.createdByName.trim();
    const info = (this.ticket as any).createdByInfo?.[0];
    if (info) {
      const name = `${info.first_name || ""} ${info.last_name || ""}`.trim();
      if (name) return name;
    }
    return "-";
  }

  private _scrollToBottom(): void {
    try {
      const el = this._msgContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  previewModalAtt: TicketAttachment | null = null;

  openImagePreview(att: TicketAttachment, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.previewModalAtt = att;
  }

  closeImagePreview(): void {
    this.previewModalAtt = null;
  }

  activeTab: "conversation" | "attachments" | "history" = "conversation";

  getAssigneeDisplayName(): string {
    if (!this.ticket || !this.ticket.assignedToUserId) return "Unassigned";
    const role = this.roleOptions.find(
      (r) => r._id === this.ticket?.assignedToUserId,
    );
    if (role) return role.role_name;
    return this.ticket.assignedToName || "Assigned";
  }

  getRoleBadgeLabel(msg: TicketMessage): string {
    if (this.isOutgoingMessage(msg)) {
      return this.isAdmin ? "Agent" : "Seller";
    }
    const isMsgFromAdmin =
      msg.senderRole === "admin" || msg.senderRole === "support";
    return isMsgFromAdmin ? "Agent" : "Customer";
  }

  getAllTicketAttachments(): TicketAttachment[] {
    if (!this.ticket?.messages) return [];
    const list: TicketAttachment[] = [];
    for (const msg of this.ticket.messages) {
      if (msg.attachments && msg.attachments.length) {
        list.push(...msg.attachments);
      }
    }
    return list;
  }

  closeTicket(): void {
    if (this.TICKET_STATUS.CLOSED) {
      this.onStatusChange(this.TICKET_STATUS.CLOSED);
    }
  }

  addInternalNote(): void {
    const current = this.messageCtrl.value || "";
    if (!current.startsWith("[INTERNAL NOTE] ")) {
      this.messageCtrl.setValue(`[INTERNAL NOTE] ${current}`);
    }
  }

  trackByMsgId(index: number, msg: TicketMessage): string {
    return msg?._id ? `${msg._id}_${index}` : `${index}`;
  }
}
