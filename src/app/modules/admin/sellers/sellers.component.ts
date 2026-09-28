import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { Router, ActivatedRoute, NavigationEnd } from "@angular/router";
import { Subject, takeUntil, filter } from "rxjs";
import { Constants } from "app/shared/constants";

export type SellerTab = "sellers" | "subscriptions" | "leads";

@Component({
  standalone: false,
  selector: "sellers",
  templateUrl: "./sellers.component.html",
  styleUrls: ["./sellers.component.scss"],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellersComponent implements OnInit, OnDestroy {
  activeTab: SellerTab = "sellers";
  tooltip = Constants.sellerDetails;

  private _unsubscribeAll: Subject<any> = new Subject<void>();

  constructor(
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Determine initial active tab from URL
    this._syncTabFromUrl();

    // Keep tab in sync when navigation occurs (e.g. browser back/forward)
    this._router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntil(this._unsubscribeAll),
      )
      .subscribe(() => {
        this._syncTabFromUrl();
        this._cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  private _syncTabFromUrl(): void {
    const url = this._router.url;
    if (url.includes("/leads")) {
      this.activeTab = "leads";
    } else if (url.includes("/subscriptions")) {
      this.activeTab = "subscriptions";
    } else {
      this.activeTab = "sellers";
    }
  }

  setTab(tab: SellerTab): void {
    this.activeTab = tab;
    if (tab === "sellers") {
      this._router.navigate(["./"], { relativeTo: this._activatedRoute });
    } else if (tab === "subscriptions") {
      this._router.navigate(["./subscriptions"], {
        relativeTo: this._activatedRoute,
      });
    } else if (tab === "leads") {
      this._router.navigate(["./leads"], {
        relativeTo: this._activatedRoute,
      });
    }
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
