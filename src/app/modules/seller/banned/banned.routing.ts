import { Route, Routes } from "@angular/router";
import { BannedComponent } from "./banned.component";
import { BannedItemsComponent } from "./banned-items/banned-items.component";

export const bannedRoute: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: BannedComponent,
  },
  {
    path: "banned-items",
    component: BannedItemsComponent,
  },
];
