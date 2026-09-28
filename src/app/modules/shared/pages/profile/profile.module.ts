import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatDividerModule } from "@angular/material/divider";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { MatTooltipModule } from "@angular/material/tooltip";
import { FuseCardModule } from "@fuse/components/card";
import { SharedModule } from "app/shared/shared.module";
import { ProfileComponent } from "app/modules/shared/pages/profile/profile.component";
import { profileRoutes } from "app/modules/shared/pages/profile/profile.routing";
import { MatSelectModule } from "@angular/material/select";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatRippleModule } from "@angular/material/core";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";

@NgModule({
  declarations: [ProfileComponent],
  imports: [
    RouterModule.forChild(profileRoutes),
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatTooltipModule,
    FuseCardModule,
    SharedModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatRippleModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
})
export class ProfileModule {}
