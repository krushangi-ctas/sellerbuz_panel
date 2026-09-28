import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatListModule } from "@angular/material/list";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatRadioModule } from "@angular/material/radio";
import { QuillModule } from "ngx-quill";
import { SharedModule } from "app/shared/shared.module";
import { GuideDocumentsViewerComponent } from "./viewer/guide-documents-viewer.component";
import { GuideDocumentsAdminComponent } from "./admin/guide-documents-admin.component";
import { GuideDocumentsRoutingModule } from "./guide-documents.routing";

@NgModule({
  declarations: [GuideDocumentsViewerComponent, GuideDocumentsAdminComponent],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatRadioModule,
    QuillModule.forRoot(),
    GuideDocumentsRoutingModule,
  ],
})
export class GuideDocumentsModule {}
