import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSortModule } from "@angular/material/sort";
import { MatTooltipModule } from "@angular/material/tooltip";
import { CommonModule } from "@angular/common";
import { SharedModule } from "app/shared/shared.module";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { FeatureMeterListComponent } from "./feature-meter.component";
import { ManageFeatureMeterComponent } from "./manage-feature-meter/manage-feature-meter.component";
import { featureMeterRoutes } from "./feature-meter.routing";

@NgModule({
  declarations: [FeatureMeterListComponent, ManageFeatureMeterComponent],
  imports: [
    RouterModule.forChild(featureMeterRoutes),
    CommonModule,
    SharedModule,
    NgxMatSelectSearchModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSortModule,
    MatTooltipModule,
  ],
})
export class FeatureMeterModule {}
