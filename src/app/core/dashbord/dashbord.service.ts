import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "environments/environment";
import {
  BehaviorSubject,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from "rxjs";

@Injectable({
  providedIn: "root",
})
export class DashbordService {
  private _data: BehaviorSubject<any> = new BehaviorSubject(null);
  constructor(private _httpClient: HttpClient) {}

  get data$(): Observable<any> {
    return this._data.asObservable();
  }

  dashboardDetails(): Observable<any> {
    return this._httpClient.get<any>(
      environment.apiBaseUrl + "/dashboard/get-dashboard-statistics-count",
    );
  }

  getDashboardStatistics(): any {
    return this._httpClient
      .get(environment.apiBaseUrl + "/dashboard/get-statistics")
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }

  getAllStoreDetailsBySeller(sellerId: any): Observable<any> {
    return this._httpClient
      .get(
        environment.apiBaseUrl +
          "/dashboard/get-store-detail-by-seller/" +
          sellerId,
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }

  getAuthorizedStoreCounts(): any {
    return this._httpClient
      .get(environment.apiBaseUrl + "/dashboard/get-authorized-store-counts")
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }

  getSellerInventoryDashboardData(sellerId: any): Observable<any> {
    return this._httpClient
      .get(
        environment.apiBaseUrl +
          "/dashboard/get-inventory-count-by-seller/" +
          sellerId,
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }

  getFullfillmentData(sellerId: any): Observable<any> {
    return this._httpClient
      .get<any>(
        environment.apiBaseUrl +
          "/dashboard/get-fullfillment-count-by-seller/" +
          sellerId,
      )
      .pipe(
        tap((response: any) => {
          this._data.next(response.data);
        }),
      );
  }

  getProductTypeData(sellerId: any): Observable<any> {
    return this._httpClient
      .get<any>(
        environment.apiBaseUrl +
          "/dashboard/get-product-type-count-by-seller/" +
          sellerId,
      )
      .pipe(
        tap((response: any) => {
          this._data.next(response.data);
        }),
      );
  }

  getSellerInventoryData(sellerId: any): Observable<any> {
    return this._httpClient
      .get<any>(
        environment.apiBaseUrl +
          "/dashboard/get-seller-inventory-data/" +
          sellerId,
      )
      .pipe(
        tap((response: any) => {
          this._data.next(response.data);
        }),
      );
  }

  getWeeklySellerInventoryData(search: any, sellerId: any): Observable<any> {
    return this._httpClient
      .post<any>(
        environment.apiBaseUrl +
          "/dashboard/get-weekly-inventory-data/" +
          sellerId,
        { search },
      )
      .pipe(
        tap((response: any) => {
          this._data.next(response.data);
        }),
      );
  }
  getSellerBaseInventoryCount(): any {
    return this._httpClient
      .get(
        environment.apiBaseUrl + "/dashboard/get-seller-base-inventory-count",
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }
  getSellerAndDateBaseInventoryCount(): any {
    return this._httpClient
      .get(
        environment.apiBaseUrl +
          "/dashboard/get-seller-and-date-base-inventory-count",
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }

  getSellerInventoryStatisticForBrandsStock(sellerId: string): Observable<any> {
    return this._httpClient
      .get<any>(
        environment.apiBaseUrl +
          "/dashboard/get-top-brands-stock-count-by-seller/" +
          sellerId,
      )
      .pipe(
        tap((response: any) => {
          this._data.next(response.data);
        }),
      );
  }

  getSellerInventoryStatisticForBrandsStockWithLeastStock(
    sellerId: string,
  ): Observable<any> {
    return this._httpClient
      .get<any>(
        environment.apiBaseUrl +
          "/dashboard/get-least-stock-brands-stock-count-by-seller/" +
          sellerId,
      )
      .pipe(
        tap((response: any) => {
          this._data.next(response.data);
        }),
      );
  }

  getSellerInventoryStatisticforProductType(sellerId: string): Observable<any> {
    return this._httpClient
      .get<any>(
        environment.apiBaseUrl +
          "/dashboard/get-inventory-product-type-statics-by-seller/" +
          sellerId,
      )
      .pipe(
        tap((response: any) => {
          this._data.next(response.data);
        }),
      );
  }

  getCronLogs(params: any): Observable<any> {
    return this._httpClient
      .get(environment.apiBaseUrl + "/dashboard/get-cron-logs", { params })
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }
}
