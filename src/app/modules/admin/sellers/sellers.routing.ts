import { Route } from "@angular/router";
import { SellersComponent } from "./sellers.component";
import { SellersListComponent } from "./list/list.component";
import { SellerResolver, SellersSellerResolver } from "./sellers.resolvers";
import { SellerDetailsComponent } from "./details/details.component";
import { SubscriptionUsersComponent } from "./subscription-users/subscription-users.component";
import { LeadsComponent } from "./leads/leads.component";

export const sellersRoutes: Route[] = [
  {
    path: "",
    component: SellersComponent,
    children: [
      // ----------------------------------------------------------------
      // Tab 2: Subscription Users — MUST be before path:"" to avoid
      // Angular's first-match-wins capturing it with the :id wildcard
      // ----------------------------------------------------------------
      {
        path: "subscriptions",
        component: SubscriptionUsersComponent,
      },

      // ----------------------------------------------------------------
      // Tab 3: Leads — same reason, static paths before wildcards
      // ----------------------------------------------------------------
      {
        path: "leads",
        component: LeadsComponent,
      },

      // ----------------------------------------------------------------
      // Tab 1: Sellers (default / existing — untouched)
      // Declared LAST so its :id child doesn't swallow static siblings
      // ----------------------------------------------------------------
      {
        path: "",
        component: SellersListComponent,
        children: [
          {
            path: "add",
            component: SellerDetailsComponent,
          },
          {
            path: "edit/:id",
            component: SellerDetailsComponent,
          },
          {
            path: ":id",
            component: SellerDetailsComponent,
          },
        ],
      },
    ],
  },
];
