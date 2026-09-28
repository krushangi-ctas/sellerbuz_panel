import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import {
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  MatRippleModule,
} from "@angular/material/core";
import { DatePipe } from "@angular/common";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatDividerModule } from "@angular/material/divider";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatRadioModule } from "@angular/material/radio";
import { MatSelectModule } from "@angular/material/select";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatTableModule } from "@angular/material/table";
import { MatTooltipModule } from "@angular/material/tooltip";
import { FuseFindByKeyPipeModule } from "@fuse/pipes/find-by-key";
import { SharedModule } from "app/shared/shared.module";
import { SellersComponent } from "./sellers.component";
import { sellersRoutes } from "./sellers.routing";
import { SellersListComponent } from "./list/list.component";
import { SellerDetailsComponent } from "./details/details.component";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSortModule } from "@angular/material/sort";
import { MatDialogModule } from "@angular/material/dialog";
import { SubscriptionUsersComponent } from "./subscription-users/subscription-users.component";
import { LeadsComponent } from "./leads/leads.component";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { SellerDialogComponent } from "./list/dialogs/seller-dialog/seller-dialog.component";

@NgModule({
  declarations: [
    SellersComponent,
    SellersListComponent,
    SellerDetailsComponent,
    SubscriptionUsersComponent,
    LeadsComponent,
    SellerDialogComponent,
  ],
  imports: [
    NgxMatSelectSearchModule,
    RouterModule.forChild(sellersRoutes),
    ReactiveFormsModule,
    ClipboardModule,
    DragDropModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatRadioModule,
    MatRippleModule,
    MatSelectModule,
    MatSidenavModule,
    MatTableModule,
    MatSlideToggleModule,
    MatTooltipModule,
    FuseFindByKeyPipeModule,
    SharedModule,
    MatPaginatorModule,
    MatSortModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: "en-GB" }, DatePipe],
})
export class SellersModule {}
