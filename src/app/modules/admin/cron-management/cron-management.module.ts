import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatTabsModule } from "@angular/material/tabs";
import { MatTooltipModule } from "@angular/material/tooltip";

import { MatDatepickerModule } from "@angular/material/datepicker";
import { MAT_DATE_LOCALE, MatNativeDateModule } from "@angular/material/core";
import { MatMenuModule } from "@angular/material/menu";
import { MatSortModule } from "@angular/material/sort";
import { DatePipe } from "@angular/common";

import { CronManagementComponent } from "./cron-management.component";
import { cronManagementRoutes } from "./cron-management.routing";

@NgModule({
  declarations: [CronManagementComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(cronManagementRoutes),

    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatMenuModule,
    MatSortModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: "en-GB" }, DatePipe],
})
export class CronManagementModule {}
