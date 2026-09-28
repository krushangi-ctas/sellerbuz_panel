import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AuthorizationWorkflowComponent } from "./authorization-workflow.component";
import { AuthorizationWorkflowRoutingModule } from "./authorization-workflow-routing.module";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTableModule } from "@angular/material/table";
import { FuseScrollbarModule } from "@fuse/directives/scrollbar";
import { MatButtonModule } from "@angular/material/button";
import { MatStepperModule } from "@angular/material/stepper";
import { SharedModule } from "app/shared/shared.module";
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";

@NgModule({
  declarations: [AuthorizationWorkflowComponent],
  imports: [
    CommonModule,
    AuthorizationWorkflowRoutingModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    FuseScrollbarModule,
    MatStepperModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    SharedModule,
  ],
})
export class AuthorizationWorkflowModule {}
