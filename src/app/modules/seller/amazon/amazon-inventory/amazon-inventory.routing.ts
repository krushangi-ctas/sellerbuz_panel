import { Route } from "@angular/router";
import { AmazonInventoryComponent } from "./amazon-inventory.component";
import { ManageProductComponent } from "./manage-products/manage-product.component";

export const AmazonInventoryRoutes: Route[] = [
  {
    path: "",
    pathMatch: "full",
    component: AmazonInventoryComponent,
  },
  {
    path: "add",
    component: ManageProductComponent,
  },
  {
    path: "add/",
    component: ManageProductComponent,
  },
  {
    path: "edit/:id",
    component: ManageProductComponent,
  },
  {
    path: "edit/:id",
    component: ManageProductComponent,
  },
  {
    path: ":id",
    pathMatch: "full",
    component: AmazonInventoryComponent,
  },
];
