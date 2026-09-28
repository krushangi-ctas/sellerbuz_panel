import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { SharedModule } from "app/shared/shared.module";
import { bannedRoute } from "./banned.routing";
import { BannedComponent } from "./banned.component";
import { BannedItemsComponent } from "./banned-items/banned-items.component";
import { MatTabsModule } from "@angular/material/tabs";
import { CommonModule } from "@angular/common";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatSortModule } from "@angular/material/sort";
import { MatButtonModule } from "@angular/material/button";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatDialogModule } from "@angular/material/dialog";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

@NgModule({
  declarations: [BannedComponent, BannedItemsComponent],
  imports: [
    RouterModule.forChild(bannedRoute),
    SharedModule,
    CommonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatIconModule,
    MatSortModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatPaginatorModule,
    MatTooltipModule,
    ClipboardModule,
    NgxMatSelectSearchModule,
  ],
})
export class BannedModule {}
