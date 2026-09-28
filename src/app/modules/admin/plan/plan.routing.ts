import { Route } from "@angular/router";
import { PlanListComponent } from "./plan.component";
import { ManagePlanComponent } from "./manage-plan/manage-plan.component";
import { PlanResolver } from "./plan.resolver";

export const ManagePlanRoutes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: PlanListComponent,
  },
  {
    path: "add",
    component: ManagePlanComponent,
  },
  {
    path: "edit/:id",
    component: ManagePlanComponent,
  },
];
