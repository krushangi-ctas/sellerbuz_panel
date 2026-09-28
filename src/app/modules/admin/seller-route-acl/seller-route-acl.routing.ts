import { Route } from "@angular/router";
import { SellerRouteAclListComponent } from "./seller-route-acl.component";
import { ManageSellerRouteAclComponent } from "./manage-seller-route-acl/manage-seller-route-acl.component";

export const sellerRouteAclRoutes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: SellerRouteAclListComponent,
  },
  {
    path: "add",
    component: ManageSellerRouteAclComponent,
  },
  {
    path: "edit/:id",
    component: ManageSellerRouteAclComponent,
  },
];
