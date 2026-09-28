import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from "@angular/router";
import { Pagination } from "app/core/pagination/pagination.types";
import { Observable, switchMap } from "rxjs";
import { AmzInvLogService } from "app/core/amz-inv-log/amz-inv-log.service";
import { amzInvLogModel } from "app/core/amz-inv-log/amz-inv-log.model";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { UserService } from "app/core/user/user.service";

@Injectable({ providedIn: "root" })
export class AmzInvLogResolver implements Resolve<any> {
  constructor(
    private _amzInvLogService: AmzInvLogService,
    private _localService: LocalStorageService,
    private _userService: UserService,
  ) {}

  resolve(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<{ pagination: Pagination; data: amzInvLogModel[] }> {
    const segments = _state.url.split("/");
    const routeId =
      segments[1] && /^[a-f\d]{24}$/i.test(segments[1]) ? segments[1] : null;

    if (routeId) {
      return this._userService.getUserById(routeId).pipe(
        switchMap((response: any) => {
          const user = response?.data;
          const isSuperAdmin = user?.isSuperAdmin;
          const isSuperAdminOrPremises =
            user?.isSuperAdmin === true || user?.isPremisesUser === true;

          const filterQry: any = {};
          filterQry["type"] = isSuperAdminOrPremises ? "admin" : "seller";
          if (!isSuperAdmin) {
            filterQry["operation_by"] = routeId;
          }

          return this._amzInvLogService.getAmzInvSystemLogList(
            0,
            this._amzInvLogService.pageLimit,
            "createdAt",
            "desc",
            "",
            filterQry,
          );
        }),
      );
    } else {
      const sellerInfo = this._localService.getItem("user");
      const isSuperAdmin = sellerInfo?.isSuperAdmin;
      const isSuperAdminOrPremises =
        sellerInfo?.isSuperAdmin === true ||
        sellerInfo?.isPremisesUser === true;

      const filterQry: any = {};
      filterQry["type"] = isSuperAdminOrPremises ? "admin" : "seller";
      if (!isSuperAdmin && sellerInfo?.id) {
        filterQry["operation_by"] = sellerInfo.id;
      }

      return this._amzInvLogService.getAmzInvSystemLogList(
        0,
        this._amzInvLogService.pageLimit,
        "createdAt",
        "desc",
        "",
        filterQry,
      );
    }
  }
}
