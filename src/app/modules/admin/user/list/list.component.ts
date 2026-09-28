import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  ViewEncapsulation,
  AfterViewInit,
} from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MatDrawer } from "@angular/material/sidenav";
import { Observable, Subject, fromEvent, merge, takeUntil } from "rxjs";
import { debounceTime, filter, map, switchMap } from "rxjs/operators";
import { FuseMediaWatcherService } from "@fuse/services/media-watcher";
import { UserService } from "app/core/user/user.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { User } from "app/core/user/user.types";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import { FuseConfirmationService } from "@fuse/services/confirmation/confirmation.service";
import { FuseUtilsService } from "@fuse/services/utils";
import { environment } from "environments/environment";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { NavigationService } from "app/core/navigation/navigation.service";

@Component({
  standalone: false,
  selector: "contacts-list",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.scss"],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("matDrawer", { static: true }) matDrawer: MatDrawer;
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;
  sellersCount: number = 0;
  contactsTableColumns: string[] = ["name", "email", "phoneNumber", "job"];
  drawerMode: "side" | "over";
  searchInputControl: FormControl = new FormControl();
  tooltip = Constants.userDetails;
  pagination: Pagination;
  sellerFormInput: Observable<User[]>;
  pageLimit: number = Constants.pageLimit;
  pageOptions: number[] = Constants.pageOptions;
  selectedSeller: any;
  removeSellerConfirm: FormGroup;
  toggleSellerStatusConfirm: FormGroup;
  tmpQry: any;
  isLoading: boolean;
  sellerStatusfromGroup: FormGroup;
  imgPath = environment.uploadPath;
  searchValue: any = "";
  imageErrors: Record<string, boolean> = {};
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  p: (...data: any[]) => void = console.log;
  readonly headers: Record<string, string>[] = [
    { key: "Name", sortBy: "first_name" },
    { key: "Email", sortBy: "email" },
    { key: "Contact", sortBy: "contact_no" },
    { key: "Role" },
    { key: "Status" },
    { key: "Actions" },
  ];
  permissionGuard: any = {};
  /**
   * Constructor
   */
  constructor(
    private _activatedRoute: ActivatedRoute,
    private _changeDetectorRef: ChangeDetectorRef,
    private _userService: UserService,
    private _confirmationService: FuseConfirmationService,
    private _utilService: FuseUtilsService,
    @Inject(DOCUMENT) private _document: any,
    private _router: Router,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private _formBuilder: FormBuilder,
    private _userSessionService: UserSessionsService,
    private _navigationService: NavigationService,
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (
          data &&
          data?.permissions &&
          Array.isArray(data?.permissions) &&
          data?.permissions.find((item: any) => item?.section_name === "User")
        ) {
          this.permissionGuard = data?.permissions.find(
            (item) => item?.section_name === "User",
          );
        }
      });
    this.sellerStatusfromGroup = this._formBuilder.group({
      status: [""],
    });
    // Get the contacts
    this._userService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        // Update the pagination
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });
    this._userService.users$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((user: User[]) => {
        this.sellersCount = user?.length || 0;
        this._changeDetectorRef.markForCheck();
      });
    this.removeSellerConfirm = this._utilService.confirmMessage(
      "Confirmation",
      "Are you sure you want to delete seller?",
      "Yes",
    );

    this.toggleSellerStatusConfirm = this._utilService.confirmMessage(
      "Confirmation",
      "Are you sure you want to update seller status?",
      "Yes",
    );

    this._userService.seller$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((user: User) => {
        // Update the pagination
        this.selectedSeller = user;
        this._changeDetectorRef.markForCheck();
      });

    this.sellerFormInput = this._userService.users$;
    this._userService
      .getPremisesUsers()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    // Subscribe to search input field value changes
    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.searchValue = query ? query.trim() : "";
          this.isLoading = true;
          if (this.pagination) {
            this.pagination.page = 1;
          }
          return this._userService.getPremisesUsers(
            this.pagination?.page || 1,
            getPageSize(this._paginators?.first),
            "createdAt",
            "desc",
            this.searchValue,
            this.tmpQry,
          );
        }),
        map(() => {
          this.isLoading = false;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    this.sellerStatusfromGroup.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.tmpQry = query;
          this.isLoading = true;
          return this._userService.getPremisesUsers(
            1,
            getPageSize(this._paginators?.first),
            "createdAt",
            "desc",
            this.searchValue,
            this.tmpQry,
          );
        }),
        map(() => {
          this.isLoading = false;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    // Subscribe to MatDrawer opened change
    this.matDrawer.openedChange
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((opened) => {
        if (!opened) {
          // Remove the selected contact when drawer closed
          // this.selectedContact = null;
          this.fetchUsers();

          // Mark for check
          this._changeDetectorRef.markForCheck();
        }
      });

    // Subscribe to media changes
    this._fuseMediaWatcherService.onMediaChange$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(({ matchingAliases }) => {
        // Set the drawerMode if the given breakpoint is active
        if (matchingAliases.includes("lg")) {
          this.drawerMode = "side";
        } else {
          this.drawerMode = "over";
        }

        // Mark for check
        this._changeDetectorRef.markForCheck();
      });

    // Listen for shortcuts
    fromEvent(this._document, "keydown")
      .pipe(
        takeUntil(this._unsubscribeAll),
        filter<KeyboardEvent>(
          (event) =>
            (event.ctrlKey === true || event.metaKey) && // Ctrl or Cmd
            event.key === "/", // '/'
        ),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        // this.createContact();
      });
  }
  // filterQry(arg0: number, pageLimit: number, arg2: string, arg3: string, tmpQry: any, filterQry: any): Observable<{ pagination: Pagination; data: User[] }> {
  //     throw new Error('Method not implemented.');
  // }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  ngAfterViewInit(): void {
    // this.OpenAddProductPopup(this.addProductTemplate, 'add');
    this._paginators.changes
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.setupSortAndPagination();
      });
    // Initial setup in case paginators are already available
    this.setupSortAndPagination();
  }

  setupSortAndPagination(): void {
    if (this._sort && this._paginators.first) {
      // Mark for check
      this._changeDetectorRef.markForCheck();

      // If the user changes the sort order...
      this._sort.sortChange
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          // Reset back to the first page
          this._paginators.first.pageIndex = 0;
        });

      // Get user if sort or page changes
      merge(this._sort.sortChange, this._paginators.first.page)
        .pipe(
          switchMap(() => {
            this.isLoading = true;
            const page = this._paginators.first.pageIndex + 1;
            return this._userService.getPremisesUsers(
              page,
              getPageSize(this._paginators.first),
              this._sort.active,
              this._sort.direction,
              this.searchValue,
              this.tmpQry,
            );
          }),
          map(() => {
            this.isLoading = false;
          }),
        )
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe();
    }
  }
  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------
  private checkPermission(action: string): boolean {
    if (this._navigationService.isSuperAdmin) {
      return true;
    }
    if (
      !this.permissionGuard ||
      (typeof this.permissionGuard === "object" &&
        !Object.keys(this.permissionGuard).length)
    ) {
      return true;
    }
    if (this.permissionGuard && action in this.permissionGuard) {
      return Boolean(this.permissionGuard[action]);
    }
    return true;
  }

  get canView(): boolean {
    return this.checkPermission("view");
  }
  get canUpdate(): boolean {
    return this.checkPermission("update");
  }
  get canDelete(): boolean {
    return this.checkPermission("delete");
  }
  get canAdd(): boolean {
    return this.checkPermission("add");
  }

  /**
   * On backdrop clicked
   */
  onBackdropClicked(): void {
    this._userService.clearSeller();
    // Go back to the list
    this._router.navigate(["./"], { relativeTo: this._activatedRoute });

    // Mark for check
    this._changeDetectorRef.markForCheck();
  }

  getStatus(status): boolean {
    if (status === 0) {
      return false;
    } else {
      return true;
    }
  }

  toggleSellerStatus(seller: any, event: any): any {
    const dialogRef = this._confirmationService.open(
      this.toggleSellerStatusConfirm.value,
    );
    // Subscribe to afterClosed from the dialog reference
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._userService
            .changeSellerStatus(seller._id, "change-seller-status")
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this._utilService.onSuccess(
                  "Seller status has been changed successfully.",
                );
              },
              ({ error }) => {
                this._utilService.onError(error.message);
                this._changeDetectorRef.markForCheck();
              },
            );
        } else {
          event.source.checked = !event.source.checked;
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  fetchUsers(): void {
    const page = this._paginators.first?.pageIndex + 1 || 1;
    this._userService
      .getPremisesUsers(
        page,
        getPageSize(this._paginators.first),
        this._sort?.active || "createdAt",
        this._sort?.direction || "desc",
        this.searchValue,
        this.tmpQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  deleteSelectedseller(id: string): void {
    const dialogRef = this._confirmationService.open(
      this.removeSellerConfirm.value,
    );
    // Subscribe to afterClosed from the dialog reference
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          // Delete the user on the server
          this._userService
            .deleteSeller(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this._utilService.onSuccess(
                  "Seller has been deleted successfully.",
                );
                this.fetchUsers();
              },
              ({ error }) => {
                this._utilService.onError(
                  error?.message ||
                    (typeof error === "string"
                      ? error
                      : "Failed to delete seller"),
                );
                this._changeDetectorRef.markForCheck();
              },
            );
        }
      });
  }
  async openInNewTab(contactId: string) {
    if (!(await this._userSessionService.IsUserExistInSession(contactId))) {
      await this._userSessionService.fetchAndAddImpersonatedUser(contactId);
    }

    const route = `/${contactId}/master/master-catalog?impersonate=1`;
    window.open(route, "_blank");
  }

  refresh(): void {
    this.tmpQry = {};
    this.sellerStatusfromGroup.get("status")?.setValue("");
    this.searchInputControl.setValue(null);
  }

  /**
   * Track by function for ngFor loops
   *
   * @param index
   * @param item
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  /**
   * Transform avatar URL to use primary color
   */
  transformAvatarUrl(profileImgUrl: string): string {
    return this._userService.transformAvatarUrl(profileImgUrl);
  }
  onImageError(contactId: string): void {
    this.imageErrors[contactId] = true;
  }

  getInitials(contact: any): string {
    const first = contact?.first_name?.charAt(0) || "";
    const last = contact?.last_name?.charAt(0) || "";
    return (first + last).toUpperCase();
  }
}
