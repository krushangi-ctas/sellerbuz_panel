import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { MatRippleModule } from "@angular/material/core";
import { MasterRoutingModule } from "./master.routing";
import { FuseConfirmationModule } from "@fuse/services/confirmation";
import { FuseAlertModule } from "@fuse/components/alert";
import { SharedModule } from "app/shared/shared.module";
import { CommonModule } from "@angular/common";

@NgModule({
  declarations: [],
  imports: [
    FuseAlertModule,
    HttpClientModule,
    MatRippleModule,
    SharedModule,
    FuseConfirmationModule,
    FuseAlertModule,
    CommonModule,
    MasterRoutingModule,
  ],
  providers: [],
})
export class MasterModule {}
