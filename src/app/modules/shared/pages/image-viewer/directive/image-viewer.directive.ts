import { Directive, ElementRef, HostListener, Input } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ImageViewerComponent } from "../component/image-viewer.component";

@Directive({
  standalone: false,
  selector: "[imageViewer]",
})
export class ImageViewerDirective {
  /**
   * @description Image source URL
   */
  @Input() src: string;

  /**
   * @description Alnernate text for image
   */
  @Input() alt: string;

  private _disabled: boolean;

  private _customSrc: string;

  constructor(
    private _elRef: ElementRef,
    private _dialog: MatDialog,
  ) {}

  @Input("imageViewer")
  set customSrc(v: string) {
    if (!v) {
      return;
    }
    this._customSrc = v;
  }

  @HostListener("click")
  public viewImage(): void {
    if (this._disabled) {
      return;
    }

    this._dialog.open(ImageViewerComponent, {
      autoFocus: false,
      data: {
        src: this._customSrc || this.src,
        alt: this.alt,
      },
      panelClass: "ctas-image-viewer",
      backdropClass: "ctas-image-viewer-backdrop",
    });
  }
}
