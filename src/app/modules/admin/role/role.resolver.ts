import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from "@angular/router";
import { Role } from "app/core/manage-role/role.model";
import { RoleService } from "app/core/manage-role/role.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { Observable } from "rxjs";

@Injectable({ providedIn: "root" })
export class RolesResolver implements Resolve<any> {
  constructor(private _roleService: RoleService) {}

  /**
   * Resolver
   *
   * @param route
   * @param state
   */
  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<{ pagination: Pagination; data: Role[] }> {
    return this._roleService.getRoles();
  }
}
