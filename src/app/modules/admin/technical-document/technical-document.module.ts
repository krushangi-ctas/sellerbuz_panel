import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { TechnicalDocumentComponent } from "./technical-document.component";
import { technicalDocumentRoutes } from "./technical-document.routing";

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule.forChild(technicalDocumentRoutes),
    MatIconModule,
    MatProgressBarModule,
    TechnicalDocumentComponent,
  ],
})
export class TechnicalDocumentModule {}
