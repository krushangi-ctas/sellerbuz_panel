import { NgModule } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import {
  MatRippleModule,
  MatNativeDateModule,
  MAT_DATE_LOCALE,
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
import { FuseFindByKeyPipeModule } from "@fuse/pipes/find-by-key";
import { DynamicGridModule } from "app/shared/dynamic-grid/dynamic-grid.module";
import { SharedModule } from "app/shared/shared.module";
import { NotifyInventoryComponent } from "./notify-inventory.component";
import { RouterModule } from "@angular/router";
import { AmazonInventoryRoutes } from "./notify-inventory.routing";
import { ImageViewerModule } from "app/modules/shared/pages/image-viewer/image-viewer.module";
import { MatTabsModule } from "@angular/material/tabs";

@NgModule({
  declarations: [NotifyInventoryComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(AmazonInventoryRoutes),
    DragDropModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
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
    SharedModule,
    MatPaginatorModule,
    MatTabsModule,
    MatSortModule,
    ClipboardModule,
    MatDialogModule,
    MatNativeDateModule,
    DynamicGridModule,
    ImageViewerModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: "en-GB" }, DatePipe],
})
export class NotifyInventoryModule {}
