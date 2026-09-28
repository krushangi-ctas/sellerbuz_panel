import { Route } from "@angular/router";
import { CouponListComponent } from "./list/list.component";
import { CouponManageComponent } from "./manage/manage.component";
import { CouponResolver, CouponsResolver } from "./coupon.resolvers";

export const couponRoutes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: CouponListComponent,
  },
  {
    path: "add",
    component: CouponManageComponent,
  },
  {
    path: "edit/:id",
    component: CouponManageComponent,
  },
];
