import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  standalone: false,
  selector: "maintenance",
  templateUrl: "./maintenance.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceComponent {
  /**
   * Constructor
   */
  constructor() {}

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
