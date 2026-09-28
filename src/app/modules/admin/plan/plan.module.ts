import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import {
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  MatRippleModule,
} from "@angular/material/core";
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
import { MatTooltipModule } from "@angular/material/tooltip";
import { FuseFindByKeyPipeModule } from "@fuse/pipes/find-by-key";
import { SharedModule } from "app/shared/shared.module";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSortModule } from "@angular/material/sort";
import { CommonModule, DatePipe } from "@angular/common";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { MatDialogModule } from "@angular/material/dialog";
import { AngularEditorModule } from "@kolkov/angular-editor";
import { PlanListComponent } from "./plan.component";
import { ManagePlanRoutes } from "./plan.routing";
import { ManagePlanComponent } from "./manage-plan/manage-plan.component";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

@NgModule({
  declarations: [PlanListComponent, ManagePlanComponent],
  imports: [
    RouterModule.forChild(ManagePlanRoutes),
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
    NgxMatSelectSearchModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: "en-GB" }, DatePipe],
})
export class PlanModule {}
