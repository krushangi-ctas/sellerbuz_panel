import { Component, OnDestroy, ViewEncapsulation } from "@angular/core";
import { AlertService } from "app/core/alert/alert.service";
import { Subject, takeUntil } from "rxjs";

@Component({
  standalone: false,
  selector: "empty-layout",
  templateUrl: "./empty.component.html",
  encapsulation: ViewEncapsulation.None,
})
export class EmptyLayoutComponent implements OnDestroy {
  alertMessage: string;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  /**
   * Constructor
   */
  constructor(private _alertService: AlertService) {
    this._alertService.message$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((message: string) => {
        this.alertMessage = message;
      });
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
