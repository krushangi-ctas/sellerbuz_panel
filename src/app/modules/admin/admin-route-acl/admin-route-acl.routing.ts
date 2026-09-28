import { Route } from "@angular/router";
import { AdminRouteAclListComponent } from "./admin-route-acl.component";
import { ManageAdminRouteAclComponent } from "./manage-admin-route-acl/manage-admin-route-acl.component";

export const adminRouteAclRoutes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: AdminRouteAclListComponent,
  },
  {
    path: "add",
    component: ManageAdminRouteAclComponent,
  },
  {
    path: "edit/:id",
    component: ManageAdminRouteAclComponent,
  },
];
