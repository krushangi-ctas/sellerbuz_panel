import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { environment } from "environments/environment";
import {
  SupportTicket,
  TicketSummary,
  TicketMessage,
} from "./support-ticket.model";

/**
 * SupportTicketService — Angular HTTP service for all support ticket API calls.
 * Maintains BehaviorSubject streams so components can reactively update.
 */
@Injectable({
  providedIn: "root",
})
export class SupportTicketService {
  private readonly baseUrl = `${environment.apiBaseUrl}/support/tickets`;

  // ── Reactive state streams ──────────────────────────────────────────────────

  /** Current ticket list */
  private _tickets$ = new BehaviorSubject<SupportTicket[]>([]);
  get tickets$(): Observable<SupportTicket[]> {
    return this._tickets$.asObservable();
  }

  /** Currently open ticket (detail view) */
  private _selectedTicket$ = new BehaviorSubject<SupportTicket | null>(null);
  get selectedTicket$(): Observable<SupportTicket | null> {
    return this._selectedTicket$.asObservable();
  }

  /** Dashboard summary counts */
  private _summary$ = new BehaviorSubject<TicketSummary | null>(null);
  get summary$(): Observable<TicketSummary | null> {
    return this._summary$.asObservable();
  }

  /**
   * Total unread count for the current user (admin → unreadAdminCount sum, seller → unreadSellerCount sum).
   * Fed into the existing messages bell badge.
   */
  private _totalUnread$ = new BehaviorSubject<number>(0);
  get totalUnread$(): Observable<number> {
    return this._totalUnread$.asObservable();
  }

  /** Pagination metadata */
  private _pagination$ = new BehaviorSubject<any>(null);
  get pagination$(): Observable<any> {
    return this._pagination$.asObservable();
  }

  constructor(private readonly _http: HttpClient) {}

  // ── API methods ─────────────────────────────────────────────────────────────

  /**
   * POST /support/tickets
   * Create a new ticket (seller/seller_user can call this).
   */
  createTicket(payload: {
    subject: string;
    category: string;
    message: string;
    attachments?: any[];
    sellerId?: string;
    createdBy?: string;
  }): Observable<any> {
    return this._http.post(this.baseUrl, payload);
  }

  /**
   * GET /support/tickets
   * Paginated list with optional filters.
   */
  getTickets(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    search?: string;
    status?: number | string;
    category?: string;
    assignedToUserId?: string;
    startDate?: string;
    endDate?: string;
    sellerId?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        httpParams = httpParams.set(key, String(val));
      }
    });

    return this._http.get<any>(this.baseUrl, { params: httpParams }).pipe(
      tap((res) => {
        if (res.data) this._tickets$.next(res.data);
        if (res.pagination) this._pagination$.next(res.pagination);
      }),
    );
  }

  /**
   * GET /support/tickets/summary
   * Dashboard cards: all/open/pending/resolved/closed/unassigned/unread.
   */
  getSummary(params?: {
    sellerId?: string;
    search?: string;
    status?: number | string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          httpParams = httpParams.set(key, String(val));
        }
      });
    }
    return this._http
      .get<any>(`${this.baseUrl}/summary`, { params: httpParams })
      .pipe(
        tap((res) => {
          if (res.data) {
            this._summary$.next(res.data);
            this._totalUnread$.next(res.data.unread || 0);
          }
        }),
      );
  }

  /**
   * GET /support/tickets/:id
   * Full ticket detail including message thread.
   */
  getTicketById(id: string, sellerId?: string): Observable<any> {
    const options: any = {};
    if (sellerId) {
      options.params = { sellerId };
    }
    return this._http.get<any>(`${this.baseUrl}/${id}`, options).pipe(
      tap((res) => {
        if (res.data) this._selectedTicket$.next(res.data);
      }),
    );
  }

  /**
   * PUT /support/tickets/:id
   * Update subject and/or category.
   */
  updateTicket(
    id: string,
    payload: { subject?: string; category?: string },
  ): Observable<any> {
    return this._http.put(`${this.baseUrl}/${id}`, payload);
  }

  /**
   * POST /support/tickets/:id/message
   * Send a reply or internal note.
   */
  addMessage(
    id: string,
    payload: {
      message: string;
      attachments?: any[];
      senderId?: string;
      senderRole?: string;
      sellerId?: string;
    },
  ): Observable<any> {
    return this._http.post(`${this.baseUrl}/${id}/message`, payload);
  }

  /**
   * POST /support/tickets/:id/assign
   * Assign ticket to admin/support user (admin only).
   */
  assignTicket(id: string, assignedToUserId: string): Observable<any> {
    return this._http.post(`${this.baseUrl}/${id}/assign`, {
      assignedToUserId,
    });
  }

  /**
   * POST /support/tickets/:id/status
   * Change ticket status (with server-side transition validation).
   */
  changeStatus(id: string, status: number): Observable<any> {
    return this._http.post(`${this.baseUrl}/${id}/status`, { status });
  }

  /**
   * POST /support/tickets/:id/read
   * Mark ticket as read — resets the caller's unread counter.
   */
  markRead(id: string, sellerId?: string): Observable<any> {
    const payload: any = {};
    if (sellerId) payload.sellerId = sellerId;
    return this._http.post(`${this.baseUrl}/${id}/read`, payload);
  }

  /**
   * POST /support/tickets/:id/upload
   * Upload a file attachment; returns { url, fileName, mimeType, size }.
   */
  uploadFile(id: string, file: File): Observable<any> {
    const fd = new FormData();
    fd.append("file", file, file.name);
    return this._http.post(`${this.baseUrl}/${id}/upload`, fd);
  }

  // ── Local state helpers (called from socket event handlers in components) ───

  /** Push a new message received via socket into the selected ticket */
  appendMessageLocally(message: TicketMessage): void {
    const ticket = this._selectedTicket$.getValue();
    if (ticket) {
      this._selectedTicket$.next({
        ...ticket,
        messages: [...ticket.messages, message],
        lastMessage: message.message.slice(0, 200),
        lastMessageAt: message.createdAt,
      });
    }
  }

  /** Update status of the selected ticket locally (optimistic) */
  updateStatusLocally(status: number): void {
    const ticket = this._selectedTicket$.getValue();
    if (ticket) {
      this._selectedTicket$.next({ ...ticket, status });
    }
  }

  /** Increment totalUnread (called when new_message socket event arrives) */
  incrementUnread(): void {
    this._totalUnread$.next(this._totalUnread$.getValue() + 1);
  }

  /** Reset unread for UI refresh after markRead */
  resetUnread(): void {
    this._totalUnread$.next(0);
    this.getSummary().subscribe(); // re-fetch real counts
  }
}
