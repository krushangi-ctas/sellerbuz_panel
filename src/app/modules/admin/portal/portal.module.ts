import { portalRoutes } from "./portal.routing";
import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import {
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  MatRippleModule,
} from "@angular/material/core";
import { DatePipe } from "@angular/common";
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
import { MatTableModule } from "@angular/material/table";
import { MatTooltipModule } from "@angular/material/tooltip";
import { FuseFindByKeyPipeModule } from "@fuse/pipes/find-by-key";
import { SharedModule } from "app/shared/shared.module";
import { portalListComponent } from "./list/list.component";
import { portalDetailsComponent } from "./details/details.component";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSortModule } from "@angular/material/sort";
import { MatPaginatorModule } from "@angular/material/paginator";
import { PortalComponent } from "./portal.component";
import { ImageViewerModule } from "app/modules/shared/pages/image-viewer/image-viewer.module";

@NgModule({
  declarations: [portalListComponent, portalDetailsComponent, PortalComponent],
  imports: [
    RouterModule.forChild(portalRoutes),
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatRadioModule,
    MatRippleModule,
    MatSelectModule,
    MatSidenavModule,
    MatTableModule,
    MatTooltipModule,
    FuseFindByKeyPipeModule,
    MatSlideToggleModule,
    SharedModule,
    MatSortModule,
    MatPaginatorModule,
    ImageViewerModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: "en-GB" }, DatePipe],
})
export class portalModule {}
