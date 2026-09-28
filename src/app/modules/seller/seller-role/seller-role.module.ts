import { CommonModule, DatePipe } from "@angular/common";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import {
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  MatRippleModule,
} from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatDialogModule } from "@angular/material/dialog";
import { MatDividerModule } from "@angular/material/divider";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatRadioModule } from "@angular/material/radio";
import { MatSelectModule } from "@angular/material/select";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSortModule } from "@angular/material/sort";
import { MatTooltipModule } from "@angular/material/tooltip";
import { AngularEditorModule } from "@kolkov/angular-editor";
import { FuseFindByKeyPipeModule } from "@fuse/pipes/find-by-key";
import { SharedModule } from "app/shared/shared.module";
import { ManageSellerRoleComponent } from "./manage-seller-role/manage-seller-role.component";
import { SellerRoleListComponent } from "./seller-role.component";
import { sellerRoleRoutes } from "./seller-role.routing";

@NgModule({
  declarations: [SellerRoleListComponent, ManageSellerRoleComponent],
  imports: [
    RouterModule.forChild(sellerRoleRoutes),
    DragDropModule,
    MatAutocompleteModule,
    AngularEditorModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatSlideToggleModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatRadioModule,
    MatRippleModule,
    MatSelectModule,
    MatSidenavModule,
    MatTooltipModule,
    FuseFindByKeyPipeModule,
    MatPaginatorModule,
    MatSortModule,
    ClipboardModule,
    CommonModule,
    SharedModule,
    MatDialogModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: "en-GB" }, DatePipe],
})
export class SellerRoleModule {}
