import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from "@angular/router";
import { Observable } from "rxjs";
import { Pagination } from "app/core/pagination/pagination.types";
import { SellerRole } from "app/core/seller-role/seller-role.model";
import { SellerRoleService } from "app/core/seller-role/seller-role.service";

@Injectable({ providedIn: "root" })
export class SellerRolesResolver implements Resolve<any> {
  constructor(private _sellerRoleService: SellerRoleService) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<{ pagination: Pagination; data: SellerRole[] }> {
    return this._sellerRoleService.getSellerRoles();
  }
}
