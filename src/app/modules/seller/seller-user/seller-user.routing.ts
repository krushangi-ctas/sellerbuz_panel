import { Route } from "@angular/router";
import { SellerUserListComponent } from "./list/list.component";

import { SellerUserDetailsComponent } from "./details/details.component";
import { SellerUsersComponent } from "./seller-user.component";
import {
  SellerUserDetailResolver,
  SellerUserResolver,
} from "./seller-user.resolvers";

export const sellerUserRoutes: Route[] = [
  {
    path: "",
    component: SellerUsersComponent,
    children: [
      {
        path: "",
        component: SellerUserListComponent,
        children: [
          {
            path: "add",
            component: SellerUserDetailsComponent,
          },
          {
            path: ":id",
            component: SellerUserDetailsComponent,
          },
        ],
      },
    ],
  },
];
