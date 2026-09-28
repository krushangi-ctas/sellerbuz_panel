import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTableModule } from "@angular/material/table";
import { RouterModule } from "@angular/router";
import { FuseScrollbarModule } from "@fuse/directives/scrollbar";
import { SharedModule } from "app/shared/shared.module";
import { generalSettingRoutes } from "./general-setting.routing";
import { MatStepperModule } from "@angular/material/stepper";
import { MatButtonModule } from "@angular/material/button";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTooltipModule } from "@angular/material/tooltip";
import { GeneralSettingComponent } from "./general-setting.component";
import { MatRadioModule } from "@angular/material/radio";
import { MatCheckboxModule } from "@angular/material/checkbox";

@NgModule({
  declarations: [GeneralSettingComponent],
  imports: [
    CommonModule,
    SharedModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    FuseScrollbarModule,
    MatStepperModule,
    MatButtonModule,
    MatTooltipModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    RouterModule.forChild(generalSettingRoutes),
  ],
})
export class GeneralSettingsModule {}
