import { Route } from "@angular/router";
import { FeatureMeterListComponent } from "./feature-meter.component";
import { ManageFeatureMeterComponent } from "./manage-feature-meter/manage-feature-meter.component";

export const featureMeterRoutes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: FeatureMeterListComponent,
  },
  {
    path: "add",
    component: ManageFeatureMeterComponent,
  },
  {
    path: "edit/:id",
    component: ManageFeatureMeterComponent,
  },
];
