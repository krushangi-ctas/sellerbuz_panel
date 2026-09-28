import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  Router,
  RouterStateSnapshot,
} from "@angular/router";
import { Pagination } from "app/core/pagination/pagination.types";
import { Portal } from "app/core/portal/portal.model";
import { PortalService } from "app/core/portal/portal.service";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class portalResolver implements Resolve<any> {
  /**
   * Constructor
   */
  constructor(private _portalService: PortalService) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Resolver
   *
   * @param route
   * @param state
   */
  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<{ pagination: Pagination; data: Portal[] }> {
    return this._portalService.getAllPOrtalList();
  }
}
