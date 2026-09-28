import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  standalone: false,
  selector: "app-portal",
  templateUrl: "./portal.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalComponent {
  /**
   * Constructor
   */
  constructor() {}

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
