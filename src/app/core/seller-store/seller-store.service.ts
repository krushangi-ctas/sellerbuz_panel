import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { Observable } from "rxjs";
import { LocalStorageService } from "../local/local-storage.service";

@Injectable({
  providedIn: "root",
})
export class SellerStoreService {
  constructor(
    private _httpClient: HttpClient,
    private _localService: LocalStorageService,
  ) {}

  getSellerStoreList(params?: any): Observable<any> {
    const localUser = this._localService.getItem("user");
    const premisesUser = localUser?.id || "";

    const queryParams: any = {};
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams[key] = params[key];
        }
      });
    }

    return this._httpClient.get<any>(
      environment.apiBaseUrl + "/manage-seller-store/list",
      {
        params: queryParams,
        headers: { premisesUser },
      },
    );
  }
}
