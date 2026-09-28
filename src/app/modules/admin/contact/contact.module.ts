import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatRippleModule } from "@angular/material/core";
import { MatDividerModule } from "@angular/material/divider";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSelectModule } from "@angular/material/select";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSortModule } from "@angular/material/sort";
import { MatDialogModule } from "@angular/material/dialog";
import { CommonModule, DatePipe, TitleCasePipe } from "@angular/common";
import { SharedModule } from "app/shared/shared.module";
import { FuseAlertModule } from "@fuse/components/alert";
import { ContactListComponent } from "./contact.component";
import { ContactRoutes } from "./contact.routing";

@NgModule({
  declarations: [ContactListComponent],
  imports: [
    RouterModule.forChild(ContactRoutes),
    CommonModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatRippleModule,
    MatSelectModule,
    MatSidenavModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    SharedModule,
    FuseAlertModule,
  ],
  providers: [DatePipe, TitleCasePipe],
})
export class ContactModule {}
