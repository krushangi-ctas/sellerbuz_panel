import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ImageViewerComponent } from "./component/image-viewer.component";
import { ImageViewerDirective } from "./directive/image-viewer.directive";
import { MatDialogModule } from "@angular/material/dialog";

@NgModule({
  declarations: [ImageViewerDirective, ImageViewerComponent],
  imports: [CommonModule, MatDialogModule],
  exports: [ImageViewerDirective],
})
export class ImageViewerModule {}
