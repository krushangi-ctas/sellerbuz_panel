import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { FuseLoadingBarModule } from "@fuse/components/loading-bar";
import { SharedModule } from "app/shared/shared.module";
import { EmptyLayoutComponent } from "app/layout/layouts/empty/empty.component";
import { FuseAlertModule } from "@fuse/components/alert";

@NgModule({
  declarations: [EmptyLayoutComponent],
  imports: [RouterModule, FuseLoadingBarModule, SharedModule, FuseAlertModule],
  exports: [EmptyLayoutComponent],
})
export class EmptyLayoutModule {}
