import { NgModule } from "@angular/core";
import { DynamicGridComponent } from "./dynamic-grid.component";
import { MatSortModule } from "@angular/material/sort";
import { MatPaginatorModule } from "@angular/material/paginator";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ClipboardModule } from "@angular/cdk/clipboard";
@NgModule({
  declarations: [DynamicGridComponent],
  imports: [
    CommonModule,
    MatIconModule,
    MatSortModule,
    MatPaginatorModule,
    MatTooltipModule,
    ClipboardModule,
  ],
  exports: [DynamicGridComponent],
})
export class DynamicGridModule {}
