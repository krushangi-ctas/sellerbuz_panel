import { Component, OnDestroy, OnInit, ViewEncapsulation } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
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
import { environment } from "environments/environment";
import { AmazonService } from "app/core/amazon/amazon.service";
import { Constants } from "app/shared/constants";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { ClassyService } from "../../vertical/classy/classy.service";

@Component({
  standalone: false,
  selector: "modern-layout",
  templateUrl: "./modern.component.html",
  styleUrls: ["./modern.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class ModernLayoutComponent implements OnInit, OnDestroy {
  isScreenSmall: boolean;
  navigation: Navigation;
  userNavigation: Navigation;
  user: User;
  sellerDetails: User;
  alertMessage: string;
  imgPath = environment.uploadPath;
  filteredNavigation: Navigation;
  filteredUserNavigation: Navigation;
  searchTerm: string = "";
  noResults: boolean = false;
  allMarketplaces = Constants.amazonMarketplaces;
  storeDetails: any;
  selectedMarketplace: any;
  currentUrl: string = "";
  showDropdown: boolean = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  /**
   * Constructor
   */
  constructor(
    private _alertService: AlertService,
    private _navigationService: NavigationService,
    private _userService: UserService,
    private _amazonService: AmazonService,
    private router: Router,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private _fuseNavigationService: FuseNavigationService,
    private _classyService: ClassyService,
    private _userSessionService: UserSessionsService,
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
    this.router.events.pipe(takeUntil(this._unsubscribeAll)).subscribe(() => {
      this.currentUrl = this.router.url; // Gets the full URL
    });

    // Subscribe to navigation data
    this._navigationService.navigation$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((navigation: Navigation) => {
        this.navigation = navigation;
        this.filteredNavigation = navigation;
      });
    // this._navigationService.userNavigation$
    //     .pipe(takeUntil(this._unsubscribeAll))
    //     .subscribe((navigation: Navigation) => {
    //         this.userNavigation = navigation;
    //         this.filteredUserNavigation = navigation;
    //     });

    // Subscribe to the user service
    this._userService.user$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((user: User) => {
        this.user = user;
        this._userSessionService.currentSellerId$
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((data) => {
            if (data) {
              this.user = this._userSessionService.getCurrentUser();
            }
          });
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

    this._amazonService.marketplace$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((r) => {
        if (r && r.length) {
          this.storeDetails[0].marketplace_ids = r.map(
            (m) => m.marketplace_name,
          );
        }
      });
    this.getSellerMarketplacesById();
    this._classyService.user$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.getSellerMarketplacesById();
      });
  }

  getMarketplaces(marketplaceIds: string[]): any {
    return this.allMarketplaces.filter((marketplace) =>
      marketplaceIds.includes(marketplace.id),
    );
  }

  onMarketplaceSelect(selectedMarketplaceId: string): any {
    this._amazonService.setSelectedMarketplace(selectedMarketplaceId);
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  /**
   * Filters the navigation based on the search term
   */
  filterNavigation(): void {
    const trimmedSearchTerm = this.searchTerm?.trim();

    if (!trimmedSearchTerm) {
      this.filteredNavigation = this.navigation;
      this.noResults = false;
      return;
    }

    const filterItems = (items: any[]): any[] =>
      items
        .map((item) => {
          const matchesTitle = item.title
            .toLowerCase()
            .includes(trimmedSearchTerm.toLowerCase());
          const filteredChildren = item.children
            ? filterItems(item.children)
            : [];
          if (matchesTitle || filteredChildren.length > 0) {
            return {
              ...item,
              children: filteredChildren, // Keep only matching children
            };
          }
          return null; // Exclude items that don't match and have no matching children
        })
        .filter(Boolean); // Remove null values
    this.filteredNavigation = {
      ...this.navigation,
      compact: filterItems(this.navigation.compact),
      default: filterItems(this.navigation.default),
      futuristic: filterItems(this.navigation.futuristic),
      horizontal: filterItems(this.navigation.horizontal),
    };

    // Check if all sections have no results
    this.noResults =
      this.filteredNavigation.compact.length === 0 &&
      this.filteredNavigation.default.length === 0 &&
      this.filteredNavigation.futuristic.length === 0 &&
      this.filteredNavigation.horizontal.length === 0;
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

  // Method to clear the search input
  clearSearch(): void {
    this.searchTerm = "";
    this.filterNavigation();
    this.noResults = false;
  }

  getSellerMarketplacesById(): any {
    this._amazonService
      .getMarketplaceBaseOnSeller()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        if (data.status === 200) {
          if (data.data.length > 0) {
            this.storeDetails = data.data;
            this.selectedMarketplace =
              localStorage.getItem("selectedMarketplaceId") ||
              this.storeDetails[0].marketplace_ids[0];
            this._amazonService.setSelectedMarketplace(
              this.selectedMarketplace,
            );
          }
        }
      });
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
