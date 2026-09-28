import { Route } from "@angular/router";
import { TagListComponent } from "./list/list.component";
import { TagDetailsComponent } from "./details/details.component";
import { TagResolver } from "./tag.resolvers";

export const portalRoutes: Route[] = [
  {
    path: "",
    component: TagListComponent,
    children: [
      {
        path: ":id",
        component: TagDetailsComponent,
      },
    ],
  },
];
