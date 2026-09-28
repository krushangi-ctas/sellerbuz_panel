import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  Router,
  RouterStateSnapshot,
} from "@angular/router";
import { Pagination } from "app/core/pagination/pagination.types";
import { User } from "app/core/user/user.types";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { SellerUserService } from "app/core/user/seller-user.service";
import { Observable, catchError, throwError } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class SellerUserResolver implements Resolve<any> {
  /**
   * Constructor
   */
  constructor(
    private _sellerUserService: SellerUserService,
    private _userSessionService: UserSessionsService,
  ) {}

  resolve(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<{ pagination: Pagination; data: User[] }> {
    const sellerId =
      this._userSessionService.getCurrentUser()?.id ||
      this._userSessionService.getLocalUser() ||
      "";
    return this._sellerUserService.getSellerUsers(sellerId);
  }
}

@Injectable({
  providedIn: "root",
})
export class SellerUserDetailResolver implements Resolve<any> {
  /**
   * Constructor
   */
  constructor(
    private _sellerUserService: SellerUserService,
    private _router: Router,
  ) {}

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
  ): Observable<User> {
    return this._sellerUserService
      .getSellerUserById(route.paramMap.get("id"))
      .pipe(
        // Error here means the requested contact is not available
        catchError((error) => {
          // Log the error
          console.error(error);

          // Get the parent url
          const parentUrl = state.url.split("/").slice(0, -1).join("/");

          // Navigate to there
          this._router.navigateByUrl(parentUrl);

          // Throw an error
          return throwError(error);
        }),
      );
  }
}
