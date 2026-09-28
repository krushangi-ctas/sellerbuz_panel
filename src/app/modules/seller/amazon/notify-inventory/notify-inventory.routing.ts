import { Route } from "@angular/router";
import { NotifyInventoryComponent } from "./notify-inventory.component";

export const AmazonInventoryRoutes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: NotifyInventoryComponent,
  },
];
