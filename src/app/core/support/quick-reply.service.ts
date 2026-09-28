import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "environments/environment";
import {
  QuickReply,
  QuickReplyFilter,
  QuickReplyResponse,
} from "./quick-reply.model";

/**
 * QuickReplyService — Angular HTTP Service for Quick Reply operations.
 * Communicates with backend endpoints at /support/quick-replies.
 */
@Injectable({
  providedIn: "root",
})
export class QuickReplyService {
  private readonly baseUrl = `${environment.apiBaseUrl}/support/quick-replies`;

  constructor(private readonly _http: HttpClient) {}

  /**
   * Fetch Quick Replies with query parameters.
   */
  getQuickReplies(filter?: QuickReplyFilter): Observable<QuickReplyResponse> {
    let params = new HttpParams();

    if (filter) {
      if (filter.search) {
        params = params.set("search", filter.search);
      }
      if (filter.tag) {
        params = params.set("tag", filter.tag);
      }
      if (
        filter.status !== undefined &&
        filter.status !== null &&
        filter.status !== ""
      ) {
        params = params.set("status", String(filter.status));
      }
      if (filter.page) {
        params = params.set("page", String(filter.page));
      }
      if (filter.limit) {
        params = params.set("limit", String(filter.limit));
      }
      if (filter.sortBy) {
        params = params.set("sortBy", filter.sortBy);
      }
    }

    return this._http.get<QuickReplyResponse>(this.baseUrl, { params });
  }

  /**
   * Fetch distinct active Quick Reply tags.
   */
  getTags(): Observable<{
    status: number;
    message: string;
    data: string[];
  }> {
    return this._http.get<{ status: number; message: string; data: string[] }>(
      `${this.baseUrl}/tags`,
    );
  }

  /**
   * Fetch Quick Reply details by ID.
   */
  getQuickReplyById(
    id: string,
  ): Observable<{ status: number; message: string; data: QuickReply }> {
    return this._http.get<{
      status: number;
      message: string;
      data: QuickReply;
    }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new Quick Reply entry (Admin only).
   */
  createQuickReply(
    data: Partial<QuickReply>,
  ): Observable<{ status: number; message: string; data: QuickReply }> {
    return this._http.post<{
      status: number;
      message: string;
      data: QuickReply;
    }>(this.baseUrl, data);
  }

  /**
   * Update an existing Quick Reply entry (Admin only).
   */
  updateQuickReply(
    id: string,
    data: Partial<QuickReply>,
  ): Observable<{ status: number; message: string; data: QuickReply }> {
    return this._http.put<{
      status: number;
      message: string;
      data: QuickReply;
    }>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Update Quick Reply status by ID using dedicated status endpoint (Admin only).
   */
  updateQuickReplyStatus(
    id: string,
    status: number,
  ): Observable<{ status: number; message: string; data: QuickReply }> {
    return this._http.patch<{
      status: number;
      message: string;
      data: QuickReply;
    }>(`${this.baseUrl}/${id}/status`, { status });
  }

  /**
   * Soft Delete a Quick Reply entry (Admin only).
   */
  deleteQuickReply(
    id: string,
  ): Observable<{ status: number; message: string; data: QuickReply }> {
    return this._http.delete<{
      status: number;
      message: string;
      data: QuickReply;
    }>(`${this.baseUrl}/${id}`);
  }
}
