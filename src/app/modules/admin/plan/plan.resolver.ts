import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from "@angular/router";
import { Plan } from "app/core/manage-plan/plan.model";
import { PlanService } from "app/core/manage-plan/plan.service";
import { Role } from "app/core/manage-role/role.model";
import { RoleService } from "app/core/manage-role/role.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { Observable } from "rxjs";

@Injectable({ providedIn: "root" })
export class PlanResolver implements Resolve<any> {
  constructor(private _planService: PlanService) {}

  /**
   * Resolver
   *
   * @param route
   * @param state
   */
  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<{ pagination: Pagination; data: Plan[] }> {
    return this._planService.getPlans();
  }
}
