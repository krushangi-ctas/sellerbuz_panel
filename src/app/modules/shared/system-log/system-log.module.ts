import { NgModule } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { SystemLogComponent } from "./system-log.component";
import { RouterModule, Routes } from "@angular/router";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DATE_LOCALE, MatNativeDateModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSortModule } from "@angular/material/sort";
import { MatTooltipModule } from "@angular/material/tooltip";
import { AngularEditorModule } from "@kolkov/angular-editor";
import { DynamicGridModule } from "app/shared/dynamic-grid/dynamic-grid.module";
import { SharedModule } from "app/shared/shared.module";
import { SystemLogResolver } from "./system-log.resolver";
const routes: Routes = [
  {
    path: "",
    component: SystemLogComponent,
    resolve: {
      systemLog: SystemLogResolver,
    },
  },
];

@NgModule({
  declarations: [SystemLogComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    SharedModule,
    DynamicGridModule,
    MatInputModule,
    MatPaginatorModule,
    MatSortModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    AngularEditorModule,
    ReactiveFormsModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: "en-GB" }, DatePipe],
})
export class SystemLogModule {}
