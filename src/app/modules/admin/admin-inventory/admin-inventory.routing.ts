import { Route } from "@angular/router";
import { AdminInventoryComponent } from "./admin-inventory.component";

export const AdminInventoryRoutes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: AdminInventoryComponent,
  },
];
