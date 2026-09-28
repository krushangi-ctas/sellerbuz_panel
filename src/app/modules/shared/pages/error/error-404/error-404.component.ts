import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  standalone: false,
  selector: "error-404",
  templateUrl: "./error-404.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Error404Component {
  /**
   * Constructor
   */
  constructor() {}

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
