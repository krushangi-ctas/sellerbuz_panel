import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSelectModule } from "@angular/material/select";
import { MatSortModule } from "@angular/material/sort";
import { MatTabsModule } from "@angular/material/tabs";
import { MatTooltipModule } from "@angular/material/tooltip";
import { CommonModule } from "@angular/common";
import { SharedModule } from "app/shared/shared.module";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { AdminRouteAclListComponent } from "./admin-route-acl.component";
import { ManageAdminRouteAclComponent } from "./manage-admin-route-acl/manage-admin-route-acl.component";
import { adminRouteAclRoutes } from "./admin-route-acl.routing";

@NgModule({
  declarations: [AdminRouteAclListComponent, ManageAdminRouteAclComponent],
  imports: [
    RouterModule.forChild(adminRouteAclRoutes),
    CommonModule,
    SharedModule,
    NgxMatSelectSearchModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSortModule,
    MatTabsModule,
    MatTooltipModule,
  ],
})
export class AdminRouteAclModule {}
