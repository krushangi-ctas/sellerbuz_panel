import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "environments/environment";
import { Faq, FaqFilter, FaqResponse } from "./faq.model";

/**
 * FaqService — Angular HTTP Service for FAQ operations.
 * Communicates with backend endpoints at /support/faqs.
 */
@Injectable({
  providedIn: "root",
})
export class FaqService {
  private readonly baseUrl = `${environment.apiBaseUrl}/support/faqs`;

  constructor(private readonly _http: HttpClient) {}

  /**
   * Fetch FAQs with query parameters.
   */
  getFaqs(filter?: FaqFilter): Observable<FaqResponse> {
    let params = new HttpParams();

    if (filter) {
      if (filter.search) {
        params = params.set("search", filter.search);
      }
      if (filter.category) {
        params = params.set("category", filter.category);
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

    return this._http.get<FaqResponse>(this.baseUrl, { params });
  }

  /**
   * Fetch distinct active category names.
   */
  getCategories(): Observable<{
    status: number;
    message: string;
    data: string[];
  }> {
    return this._http.get<{ status: number; message: string; data: string[] }>(
      `${this.baseUrl}/categories`,
    );
  }

  /**
   * Fetch FAQ details by ID.
   */
  getFaqById(
    id: string,
  ): Observable<{ status: number; message: string; data: Faq }> {
    return this._http.get<{ status: number; message: string; data: Faq }>(
      `${this.baseUrl}/${id}`,
    );
  }

  /**
   * Create a new FAQ entry (Admin only).
   */
  createFaq(
    faqData: Partial<Faq>,
  ): Observable<{ status: number; message: string; data: Faq }> {
    return this._http.post<{ status: number; message: string; data: Faq }>(
      this.baseUrl,
      faqData,
    );
  }

  /**
   * Update an existing FAQ entry (Admin only).
   */
  updateFaq(
    id: string,
    faqData: Partial<Faq>,
  ): Observable<{ status: number; message: string; data: Faq }> {
    return this._http.put<{ status: number; message: string; data: Faq }>(
      `${this.baseUrl}/${id}`,
      faqData,
    );
  }

  /**
   * Update FAQ status by ID using dedicated status endpoint (Admin only).
   */
  updateFaqStatus(
    id: string,
    status: number,
  ): Observable<{ status: number; message: string; data: Faq }> {
    return this._http.patch<{ status: number; message: string; data: Faq }>(
      `${this.baseUrl}/${id}/status`,
      { status },
    );
  }

  /**
   * Soft Delete a FAQ entry (Admin only).
   */
  deleteFaq(
    id: string,
  ): Observable<{ status: number; message: string; data: Faq }> {
    return this._http.delete<{ status: number; message: string; data: Faq }>(
      `${this.baseUrl}/${id}`,
    );
  }
}
