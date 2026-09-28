import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MediaUrlPipe } from "./pipes/media-url.pipe";

@NgModule({
  declarations: [MediaUrlPipe],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, MediaUrlPipe],
})
export class SharedModule {}
