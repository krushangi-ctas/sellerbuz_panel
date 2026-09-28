import { Component, ViewEncapsulation } from "@angular/core";
import { fuseAnimations } from "@fuse/animations";

@Component({
  standalone: false,
  selector: "auth-confirmation-required",
  templateUrl: "./confirmation-required.component.html",
  encapsulation: ViewEncapsulation.None,
  animations: fuseAnimations,
})
export class AuthConfirmationRequiredComponent {
  /**
   * Constructor
   */
  constructor() {}

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
