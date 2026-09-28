import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
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
import { SellerUsersComponent } from "./seller-user.component";
import { sellerUserRoutes } from "./seller-user.routing";
import { SellerUserListComponent } from "./list/list.component";
import { SellerUserDetailsComponent } from "./details/details.component";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSortModule } from "@angular/material/sort";

import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

@NgModule({
  declarations: [
    SellerUsersComponent,
    SellerUserListComponent,
    SellerUserDetailsComponent,
  ],
  imports: [
    RouterModule.forChild(sellerUserRoutes),
    ClipboardModule,
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
    NgxMatSelectSearchModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: "en-GB" }, DatePipe],
})
export class SellerUsersModule {}
