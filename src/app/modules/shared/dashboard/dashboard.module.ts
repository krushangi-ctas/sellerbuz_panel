import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { dashboardRoutes } from "./dashboard.routing";
import { SharedModule } from "app/shared/shared.module";
import { DashboardComponent } from "./dashboard.component";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FuseScrollbarModule } from "@fuse/directives/scrollbar";
import { MatTableModule } from "@angular/material/table";
import { MatSortModule } from "@angular/material/sort";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatTabsModule } from "@angular/material/tabs"; // Import MatTabsModule
import { ClipboardModule } from "@angular/cdk/clipboard";
import { MAT_DATE_LOCALE, MatNativeDateModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatSelectModule } from "@angular/material/select";
import { NgApexchartsModule } from "ng-apexcharts";
import { DatePipe } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatProgressBarModule } from "@angular/material/progress-bar";

@NgModule({
  declarations: [DashboardComponent],
  imports: [
    SharedModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatTooltipModule,
    MatTabsModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    FuseScrollbarModule,
    NgApexchartsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ClipboardModule,
    MatMenuModule,
    MatProgressBarModule,
    RouterModule.forChild(dashboardRoutes),
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: "en-GB" }, DatePipe],
})
export class DashboardModule {}
