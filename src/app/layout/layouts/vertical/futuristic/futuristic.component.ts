import { Component, OnDestroy, OnInit, ViewEncapsulation } from "@angular/core";
import { Subject, takeUntil } from "rxjs";
import { FuseMediaWatcherService } from "@fuse/services/media-watcher";
import {
  FuseNavigationService,
  FuseVerticalNavigationComponent,
} from "@fuse/components/navigation";
import { Navigation } from "app/core/navigation/navigation.types";
import { NavigationService } from "app/core/navigation/navigation.service";
import { User } from "app/core/user/user.types";
import { UserService } from "app/core/user/user.service";
import { AlertService } from "app/core/alert/alert.service";

@Component({
  standalone: false,
  selector: "futuristic-layout",
  templateUrl: "./futuristic.component.html",
  encapsulation: ViewEncapsulation.None,
})
export class FuturisticLayoutComponent implements OnInit, OnDestroy {
  isScreenSmall: boolean;
  navigation: Navigation;
  user: User;
  alertMessage: string;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  /**
   * Constructor
   */
  constructor(
    private _alertService: AlertService,
    private _navigationService: NavigationService,
    private _userService: UserService,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private _fuseNavigationService: FuseNavigationService,
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter for current year
   */
  get currentYear(): number {
    return new Date().getFullYear();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Subscribe to navigation data
    this._navigationService.navigation$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((navigation: Navigation) => {
        this.navigation = navigation;
      });

    // Subscribe to the user service
    this._userService.user$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((user: User) => {
        this.user = user;
      });

    this._alertService.message$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((message: string) => {
        this.alertMessage = message;
      });

    // Subscribe to media changes
    this._fuseMediaWatcherService.onMediaChange$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(({ matchingAliases }) => {
        // Check if the screen is small
        this.isScreenSmall = !matchingAliases.includes("md");
      });
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Toggle navigation
   *
   * @param name
   */

  toggleNavigation(name: string): void {
    // Get the navigation
    const navigation =
      this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(
        name,
      );

    if (navigation) {
      // Toggle the opened status
      navigation.toggle();
    }
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
