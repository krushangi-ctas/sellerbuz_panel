import { Route } from "@angular/router";
import { portalListComponent } from "./list/list.component";
import { portalResolver } from "./portal.resolvers";
import { portalDetailsComponent } from "./details/details.component";

export const portalRoutes: Route[] = [
  {
    path: "",
    component: portalListComponent,
    children: [
      {
        path: ":id",
        component: portalDetailsComponent,
      },
    ],
  },
];
