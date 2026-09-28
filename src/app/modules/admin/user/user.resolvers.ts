import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  Router,
  RouterStateSnapshot,
} from "@angular/router";
import { Pagination } from "app/core/pagination/pagination.types";
import { UserService } from "app/core/user/user.service";
import { User } from "app/core/user/user.types";
import { Observable, catchError, throwError } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class UserResolver implements Resolve<any> {
  /**
   * Constructor
   */
  constructor(private _usersService: UserService) {}

  resolve(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<{ pagination: Pagination; data: User[] }> {
    return this._usersService.getPremisesUsers();
  }
}

@Injectable({
  providedIn: "root",
})
export class SellersSellerResolver implements Resolve<any> {
  /**
   * Constructor
   */
  constructor(
    private _userService: UserService,
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
    return this._userService.getSellerById(route.paramMap.get("id")).pipe(
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
