import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from "@angular/router";
import { Observable, of, switchMap } from "rxjs";
import { CouponService } from "app/core/coupon/coupon.service";
import { CouponStats } from "app/core/coupon/coupon.model";

@Injectable({
  providedIn: "root",
})
export class CouponsResolver implements Resolve<any> {
  constructor(private _couponService: CouponService) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<any> {
    return this._couponService.getCoupons(1, 100, "createdAt", "desc", "", {});
  }
}

@Injectable({
  providedIn: "root",
})
export class CouponResolver implements Resolve<any> {
  constructor(private _couponService: CouponService) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<any> {
    const couponId = route.paramMap.get("id");
    if (!couponId) {
      return of(null);
    }
    return this._couponService.getCouponById(couponId);
  }
}

@Injectable({
  providedIn: "root",
})
export class CouponStatsResolver implements Resolve<CouponStats | null> {
  constructor(private _couponService: CouponService) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<CouponStats | null> {
    return this._couponService.getCouponStats().pipe(
      switchMap((response) => {
        if (response && response.data) {
          return of(response.data);
        }
        return of(null);
      }),
    );
  }
}
