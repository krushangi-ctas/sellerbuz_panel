import { Route } from "@angular/router";
import { ManageSellerRoleComponent } from "./manage-seller-role/manage-seller-role.component";
import { SellerRoleListComponent } from "./seller-role.component";
import { SellerRolesResolver } from "./seller-role.resolver";

export const sellerRoleRoutes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: SellerRoleListComponent,
  },
  {
    path: "add",
    component: ManageSellerRoleComponent,
  },
  {
    path: "edit/:id",
    component: ManageSellerRoleComponent,
  },
];
