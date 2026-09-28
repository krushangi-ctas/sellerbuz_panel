import { Route } from "@angular/router";
import { UsersComponent } from "./user.component";
import { UserListComponent } from "./list/list.component";
import { UserResolver, SellersSellerResolver } from "./user.resolvers";
import { UserDetailsComponent } from "./details/details.component";

export const sellersRoutes: Route[] = [
  {
    path: "",
    component: UsersComponent,
    children: [
      {
        path: "",
        component: UserListComponent,
        children: [
          {
            path: "add",
            component: UserDetailsComponent,
          },
          {
            path: ":id",
            component: UserDetailsComponent,
          },
          {
            path: "edit/:id",
            component: UserDetailsComponent,
          },
        ],
      },
    ],
  },
];
