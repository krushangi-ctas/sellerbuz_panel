import { Route } from "@angular/router";
import { MasterCatalogComponent } from "./master-catalog.component";
import { ProdcutDetailsComponent } from "./product-details/product-details.component";

export const InventoryRoutes: Route[] = [
  {
    path: "",
    component: MasterCatalogComponent,
    children: [
      {
        path: ":id",
        component: ProdcutDetailsComponent,
      },
    ],
  },
];
