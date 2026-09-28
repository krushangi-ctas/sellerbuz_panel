import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from "@angular/router";
import { Observable } from "rxjs";
import { GeneralSettingService } from "app/core/general-setting/general-setting.service";
import { LocalStorageService } from "app/core/local/local-storage.service";

@Injectable({ providedIn: "root" })
export class SellerSettingResolver implements Resolve<any> {
  seller: any;
  constructor(
    private _generalSettingService: GeneralSettingService,
    private _localStorageService: LocalStorageService,
  ) {
    this.seller = this._localStorageService.getItem("user");
  }

  /**
   * Resolver
   *
   * @param _route
   * @param _state
   */
  resolve(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<any> {
    return this._generalSettingService.getSettingBySellerId(this.seller.id);
  }
}
