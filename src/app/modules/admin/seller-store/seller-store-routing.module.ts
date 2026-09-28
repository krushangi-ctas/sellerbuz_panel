import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { SellerStoreComponent } from "./seller-store.component";

const routes: Routes = [
  {
    path: "",
    component: SellerStoreComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SellerStoreRoutingModule {}
