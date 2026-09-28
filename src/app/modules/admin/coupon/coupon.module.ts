import { NgModule } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { RouterModule } from "@angular/router";
import { ReactiveFormsModule, FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MAT_DATE_LOCALE, MatNativeDateModule } from "@angular/material/core";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSortModule } from "@angular/material/sort";
import { MatTableModule } from "@angular/material/table";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatChipsModule } from "@angular/material/chips";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { FuseConfirmationModule } from "@fuse/services/confirmation";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { SharedModule } from "app/shared/shared.module";
import { couponRoutes } from "./coupon.routing";
import { CouponListComponent } from "./list/list.component";
import { CouponManageComponent } from "./manage/manage.component";
import { CouponResolver, CouponsResolver } from "./coupon.resolvers";

import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

@NgModule({
  declarations: [CouponListComponent, CouponManageComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(couponRoutes),
    ClipboardModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    MatChipsModule,
    MatAutocompleteModule,
    FuseConfirmationModule,
    SharedModule,
    NgxMatSelectSearchModule,
  ],
  providers: [
    CouponResolver,
    CouponsResolver,
    { provide: MAT_DATE_LOCALE, useValue: "en-GB" },
    DatePipe,
  ],
})
export class CouponModule {}
