import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "environments/environment";

export interface PlanShopData {
  planId: string;
  selectedShops: string[];
  shopDynamicFields: { [shopId: string]: any[] };
  selectedCustomFields: { [shopId: string]: string[] };
}

@Injectable({
  providedIn: "root",
})
export class PlanShopService {
  private readonly apiUrl = environment.apiBaseUrl;

  constructor(private _httpClient: HttpClient) {}

  /**
   * Save plan shop data to database
   */
  savePlanShopData(data: PlanShopData): Observable<any> {
    return this._httpClient.post(
      `${this.apiUrl}/manage-plan/save-plan-shop-data`,
      data,
    );
  }

  /**
   * Get plan shop data from database
   */
  getPlanShopData(planId: string): Observable<PlanShopData> {
    return this._httpClient.get<PlanShopData>(
      `${this.apiUrl}/manage-plan/get-plan-shop-data/${planId}`,
    );
  }

  /**
   * Update plan shop data
   */
  updatePlanShopData(
    planId: string,
    data: Partial<PlanShopData>,
  ): Observable<any> {
    return this._httpClient.put(
      `${this.apiUrl}/manage-plan/update-plan-shop-data/${planId}`,
      data,
    );
  }

  /**
   * Delete plan shop data
   */
  deletePlanShopData(planId: string): Observable<any> {
    return this._httpClient.delete(
      `${this.apiUrl}/manage-plan/delete-plan-shop-data/${planId}`,
    );
  }
}
