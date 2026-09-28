import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "environments/environment";

export type BillingCycle = "monthly" | "quarterly";

export interface CreateLeadPayload {
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  contact_number: string;
  currency_id: string;
  country_name: string;
  plan_id: string;
  billing_cycle: BillingCycle;
}

export interface CreateLeadData {
  lead_id: string;
  payment_allowed?: boolean;
  seller_id?: string;
  active_subscription?: {
    plan_name: string;
    billing_cycle: string;
    expired_at: string;
  };
}

export interface CreateLeadResponse {
  status: number;
  message: string;
  data: CreateLeadData;
}

/**
 * Public checkout flow — mirrors the website checkout.
 * Creates a guest lead (tbl_guest_leads) used by the existing
 * backend subscription / payment process.
 */
@Injectable({
  providedIn: "root",
})
export class PublicCheckoutService {
  constructor(private _httpClient: HttpClient) {}

  /**
   * POST /v1/public-checkout/lead
   * Stores who wants to buy which plan. No payment here.
   */
  createLead(payload: CreateLeadPayload): Observable<CreateLeadResponse> {
    return this._httpClient.post<CreateLeadResponse>(
      environment.apiBaseUrl + "/public-checkout/lead",
      payload,
    );
  }
}
