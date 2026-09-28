import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from "@angular/router";
import { Observable } from "rxjs";
import { LocalStorageService } from "app/core/local/local-storage.service";

@Injectable({
  providedIn: "root",
})
export class PermissionAuthGuard implements CanActivate {
  isSuperAdmin: boolean = false;
  /**
   * Constructor
   */
  constructor(
    private _localStorageService: LocalStorageService,
    private _router: Router,
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Can activate
   *
   * @param route
   * @param state
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean> | Promise<boolean> | boolean {
    const currentUser = this._localStorageService.getItem("user");
    const isDeveloper = currentUser?.isDeveloper ?? false;

    this.isSuperAdmin =
      currentUser?.isPremisesUser || currentUser?.isSuperAdmin || false;

    if (
      isDeveloper &&
      (state.url.includes("/admin-route-acl") ||
        state.url.includes("/seller-route-acl") ||
        state.url.includes("/route-acl") ||
        state.url.includes("/features") ||
        state.url.includes("/feature-meter") ||
        state.url.includes("/cron-management") ||
        state.url.includes("/cron-logs"))
    ) {
      return true;
    }

    if (this.isSuperAdmin && state.url !== "/authorization-workflow") {
      return true;
    } else if (!this.isSuperAdmin && state.url === "/authorization-workflow") {
      return true;
    } else if (
      state.url.includes("/amazon-inventory") ||
      state.url.includes("/uploaded-files") ||
      state.url.includes("/support") ||
      state.url.includes("/cron-management") ||
      state.url.includes("/cron-logs")
    ) {
      return true;
    } else if (state.url.includes("/subscription")) {
      return true;
    } else if (this.isSuperAdmin && state.url.includes("/manage-role")) {
      return true;
    } else if (this.isSuperAdmin && state.url.includes("/manage-plan")) {
      return true;
    } else if (this.isSuperAdmin && state.url.includes("/master/contact")) {
      return true;
    } else if (
      state.url.includes("/features") ||
      state.url.includes("/feature-meter") ||
      state.url.includes("/blogs") ||
      state.url.includes("/guide-documents") ||
      state.url.includes("/technical-doc")
    ) {
      return true;
    } else {
      this._router.navigate(["/dashboard"]);
      return false;
    }
  }
}
