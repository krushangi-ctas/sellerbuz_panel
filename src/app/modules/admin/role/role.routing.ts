import { Route } from "@angular/router";
import { RoleListComponent } from "./role.component";
import { ManageRoleComponent } from "./manage-role/manage-role.component";
import { RolesResolver } from "./role.resolver";

export const manageRoleRoutes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: RoleListComponent,
  },
  {
    path: "add",
    component: ManageRoleComponent,
  },
  {
    path: "edit/:id",
    component: ManageRoleComponent,
  },
];
