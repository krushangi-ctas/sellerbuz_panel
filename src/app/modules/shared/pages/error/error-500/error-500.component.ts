import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  standalone: false,
  selector: "error-500",
  templateUrl: "./error-500.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Error500Component {
  /**
   * Constructor
   */
  constructor() {}

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
