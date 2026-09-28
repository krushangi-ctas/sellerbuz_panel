import { Injectable, NgZone, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { io, Socket } from "socket.io-client";
import { environment } from "environments/environment";
import { Subject } from "rxjs";
import { FuseUtilsService } from "@fuse/services/utils/utils.service";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { NotificationsService } from "app/layout/common/notifications/notifications.service";

/**
 * SupportSocketService — Socket.IO client wrapper for support ticket module.
 * Connects to /support namespace and handles real-time chat notifications globally.
 */
@Injectable({
  providedIn: "root",
})
export class SupportSocketService implements OnDestroy {
  private socket: Socket | null = null;
  private _destroy$ = new Subject<void>();
  private _globalInitialized = false;
  private _activeTicketId: string | null = null;
  private _activeTicketUserId: string | null = null;

  private readonly _globalMessageHandler = (payload: any) => {
    this._ngZone.run(() => this._handleGlobalNewMessage(payload));
  };

  constructor(
    private _router: Router,
    private _fuseUtilsService: FuseUtilsService,
    private _localStorageService: LocalStorageService,
    private _notificationsService: NotificationsService,
    private _ngZone: NgZone,
    private _userSessionService: UserSessionsService,
  ) {}

  /** Connect to the /support Socket.IO namespace */
  connect(): void {
    if (this.socket?.connected) return;

    // Dispose a stale disconnected instance before creating a new one
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const token = this._localStorageService.getItem("accessToken") || "";
    let baseUrl = environment.apiBaseUrl;
    try {
      const urlObj = new URL(baseUrl);
      baseUrl = urlObj.origin;
    } catch {
      baseUrl = baseUrl.replace(/\/(v\d+|api).*$/, "").replace(/\/$/, "");
    }

    // Start with polling (works behind Apache). Upgrade to websocket when
    // the proxy supports it. websocket-first does NOT fall back and fails
    // with "Unexpected response code: 400" on this VPS.
    this.socket = io(`${baseUrl}/support`, {
      transports: ["polling", "websocket"],
      upgrade: true,
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on("connect", () => {
      console.info(
        "[SupportSocket] Connected:",
        this.socket?.id,
        "transport=",
        this.socket?.io?.engine?.transport?.name,
      );
      this._joinRoomsForCurrentUser();
      this._rejoinActiveTicketRoom();
    });

    this.socket.on("connect_error", (err) => {
      console.error("[SupportSocket] connect_error:", err?.message || err);
    });

    this.socket.on("disconnect", (reason) => {
      console.info("[SupportSocket] Disconnected:", reason);
    });

    if (this._globalInitialized) {
      this._attachGlobalMessageListener();
    }
  }

  /** Initialize global socket listening across all pages in the app */
  initGlobalListener(): void {
    this.connect();
    this._joinRoomsForCurrentUser();

    if (this._globalInitialized) return;
    this._globalInitialized = true;
    this._attachGlobalMessageListener();
  }

  private _attachGlobalMessageListener(): void {
    if (!this.socket) return;
    this.socket.off("new_message", this._globalMessageHandler);
    this.socket.on("new_message", this._globalMessageHandler);
  }

  /** Track the open ticket so it can be rejoined after reconnect */
  setActiveTicket(ticketId: string, userId: string): void {
    this._activeTicketId = ticketId || null;
    this._activeTicketUserId = userId || null;
    if (this._activeTicketId && this._activeTicketUserId) {
      this.joinTicketRoom(this._activeTicketId, this._activeTicketUserId);
    }
  }

  /** Clear active ticket tracking (e.g. leaving detail view) */
  clearActiveTicket(ticketId?: string): void {
    const id = ticketId || this._activeTicketId;
    if (id) {
      this.leaveTicketRoom(id);
    }
    this._activeTicketId = null;
    this._activeTicketUserId = null;
  }

  /** Helper to safely retrieve decrypted current user object */
  private _getUser(): any {
    return (
      this._userSessionService?.getCurrentUser() ||
      this._localStorageService.getItem("user")
    );
  }

  private _rejoinActiveTicketRoom(): void {
    if (this._activeTicketId && this._activeTicketUserId) {
      this.joinTicketRoom(this._activeTicketId, this._activeTicketUserId);
    }
  }

  /** Automatically join user/admin rooms based on logged-in user credentials */
  private _joinRoomsForCurrentUser(): void {
    const user = this._getUser();
    if (!user) return;

    try {
      const userId = user?.id || user?._id || user?.userId;
      const sellerId = user?.seller_id || user?.sellerId;
      const isAdmin = user?.isSuperAdmin || user?.isPremisesUser;

      if (userId) {
        this.joinUserRoom(userId);
      }
      if (sellerId && sellerId !== userId) {
        this.joinUserRoom(sellerId);
      }
      if (isAdmin) {
        this.joinAdminRoom();
      }
    } catch (e) {
      console.error("[SupportSocket] Error reading user rooms:", e);
    }
  }

  /** Global message handler for Fuse util success popup */
  private _handleGlobalNewMessage(payload: any): void {
    if (!payload || !payload.message) return;

    const currentUser = this._getUser();
    if (!currentUser) return;

    try {
      const isAdmin = currentUser?.isSuperAdmin || currentUser?.isPremisesUser;
      const currentUserId =
        currentUser.id || currentUser._id || currentUser.userId;

      const msg = payload.message;
      const senderId = msg?.senderId?._id || msg?.senderId?.id || msg?.senderId;

      // Do NOT trigger popup if the current user is the sender
      if (senderId && String(senderId) === String(currentUserId)) {
        return;
      }

      const ticketId = payload.ticketId || msg.ticketId;
      if (!ticketId) return;

      // Real-time refresh of header bell notifications list and badge count
      try {
        this._notificationsService.getAll().subscribe();
      } catch (err) {
        console.error(
          "[SupportSocket] Error refreshing notifications count:",
          err,
        );
      }

      const currentUrl = this._router.url;

      // If user is ALREADY viewing this exact ticket's detail page, suppress popup
      if (currentUrl.includes(`/support/tickets/${ticketId}`)) {
        return;
      }

      // Format ticket message snippet
      const ticketNoStr = payload.ticketNo ? `#${payload.ticketNo}` : "";
      const subjectStr = payload.subject ? ` (${payload.subject})` : "";
      const messageText = msg.message
        ? String(msg.message).trim()
        : "New message received";
      const textSnippet =
        messageText.length > 50
          ? messageText.slice(0, 50) + "..."
          : messageText;

      const displayMessage = `New Ticket Message ${ticketNoStr}${subjectStr}: "${textSnippet}"`;

      // Build target redirection route
      let redirectPath = `/master/support/tickets/${ticketId}`;
      const urlSegments = currentUrl.split("/").filter(Boolean);
      if (urlSegments.length > 0 && /^[a-f\d]{24}$/i.test(urlSegments[0])) {
        redirectPath = `/${urlSegments[0]}/master/support/tickets/${ticketId}`;
      }

      // Display Fuse util success popup message with redirection link on click
      this._fuseUtilsService.onSuccess(displayMessage, redirectPath);
    } catch (e) {
      console.error("[SupportSocket] Error handling global new message:", e);
    }
  }

  /** Disconnect and clean up the socket */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this._globalInitialized = false;
    this._activeTicketId = null;
    this._activeTicketUserId = null;
  }

  /** Emit an event to the server */
  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  /**
   * Listen for a server event; callbacks run inside NgZone so OnPush views update.
   * Returns an unsubscribe function.
   */
  on(event: string, callback: (data: any) => void): () => void {
    const wrapped = (data: any) => {
      this._ngZone.run(() => callback(data));
    };
    this.socket?.on(event, wrapped);
    return () => this.socket?.off(event, wrapped);
  }

  /** Join a ticket room for real-time updates */
  joinTicketRoom(ticketId: string, userId: string): void {
    this.emit("join_ticket_room", { ticketId, userId });
  }

  /** Join personal user room globally */
  joinUserRoom(userId: string): void {
    this.emit("join_user_room", { userId });
  }

  /** Leave a ticket room */
  leaveTicketRoom(ticketId: string): void {
    this.emit("leave_ticket_room", { ticketId });
  }

  /** Join the admin broadcast room (admin/support users only) */
  joinAdminRoom(): void {
    this.emit("join_admin_room");
  }

  /** Emit typing indicator */
  emitTyping(ticketId: string, userId: string, isTyping: boolean): void {
    this.emit("typing", { ticketId, userId, isTyping });
  }

  ngOnDestroy(): void {
    this.disconnect();
    this._destroy$.next();
    this._destroy$.complete();
  }
}
