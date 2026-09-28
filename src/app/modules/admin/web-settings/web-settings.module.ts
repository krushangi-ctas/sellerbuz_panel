import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatDividerModule } from "@angular/material/divider";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTooltipModule } from "@angular/material/tooltip";
import { SharedModule } from "app/shared/shared.module";
import { WebSettingsRoutes } from "./web-settings.routing";
import { WebSettingsComponent } from "./web-settings.component";

@NgModule({
  declarations: [WebSettingsComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
    RouterModule.forChild(WebSettingsRoutes),
  ],
})
export class WebSettingsModule {}
