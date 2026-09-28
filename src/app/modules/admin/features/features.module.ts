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
import { FeaturesListComponent } from "./features.component";
import { FeatureDialogComponent } from "./feature-dialog/feature-dialog.component";
import { featuresRoutes } from "./features.routing";

@NgModule({
  declarations: [FeaturesListComponent, FeatureDialogComponent],
  imports: [
    RouterModule.forChild(featuresRoutes),
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
export class FeaturesModule {}
