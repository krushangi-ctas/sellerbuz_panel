import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import {
  switchMap,
  of,
  throwError,
  BehaviorSubject,
  Observable,
  tap,
} from "rxjs";

@Injectable({
  providedIn: "root",
})
export class GeneralSettingService {
  private _sellerSetting: BehaviorSubject<any> = new BehaviorSubject(null);
  constructor(private _httpClient: HttpClient) {}
  get sellerSetting$(): Observable<any> {
    return this._sellerSetting.asObservable();
  }
  getSettingBySellerId(sellerId: string): any {
    return this._httpClient
      .get<any>(environment.apiBaseUrl + "/general-setting/" + sellerId)
      .pipe(
        tap((response) => {
          this._sellerSetting.next(response.data[0]);
        }),
      );
  }

  updateSetting(sellerId: string, formData: any): any {
    return this._httpClient
      .put(
        environment.apiBaseUrl + "/general-setting/update-setting/" + sellerId,
        formData,
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            this._sellerSetting.next(response.data);
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }
}
