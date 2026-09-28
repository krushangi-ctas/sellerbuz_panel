import { NgModule } from "@angular/core";
import { SharedModule } from "app/shared/shared.module";
import { SellerStoreComponent } from "./seller-store.component";
import { SellerStoreRoutingModule } from "./seller-store-routing.module";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSortModule } from "@angular/material/sort";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MarketplaceDialogComponent } from "./dialogs/marketplace-dialog/marketplace-dialog.component";

@NgModule({
  declarations: [SellerStoreComponent, MarketplaceDialogComponent],
  imports: [
    SharedModule,
    SellerStoreRoutingModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatDialogModule,
  ],
})
export class SellerStoreModule {}
