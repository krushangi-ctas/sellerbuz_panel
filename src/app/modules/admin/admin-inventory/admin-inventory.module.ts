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
import { AdminInventoryComponent } from "./admin-inventory.component";
import { AdminInventoryRoutes } from "./admin-inventory.routing";
import { DynamicGridModule } from "app/shared/dynamic-grid/dynamic-grid.module";
import { ImageViewerModule } from "app/modules/shared/pages/image-viewer/image-viewer.module";

@NgModule({
  declarations: [AdminInventoryComponent],
  imports: [
    RouterModule.forChild(AdminInventoryRoutes),
    DragDropModule,
    MatAutocompleteModule,
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
    SharedModule,
    MatPaginatorModule,
    MatSortModule,
    ClipboardModule,
    CommonModule,
    MatDialogModule,
    DynamicGridModule,
    ImageViewerModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: "en-GB" }, DatePipe],
})
export class AdminInventoryModule {}
