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
import { SellerUserService } from "app/core/user/seller-user.service";

@Component({
  standalone: false,
  selector: "seller-user-list",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.scss"],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerUserListComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild("matDrawer", { static: true }) matDrawer: MatDrawer;
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;
  sellersCount: number = 0;
  contactsTableColumns: string[] = ["name", "email", "phoneNumber", "job"];
  drawerMode: "side" | "over";
  searchInputControl: FormControl = new FormControl();
  tooltip = Constants.sellerUserDetails;
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
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  p: (...data: any[]) => void = console.log;
  readonly headers: Record<string, string>[] = [
    { key: "User", sortBy: "first_name" },
    { key: "Email", sortBy: "email" },
    { key: "Contact", sortBy: "contact_no" },
    { key: "Role" },
    { key: "Status" },
    { key: "Actions" },
  ];
  rolePermission: any = {};
  isSuperAdmin: boolean = false;

  /**
   * Constructor
   */
  constructor(
    private _activatedRoute: ActivatedRoute,
    private _changeDetectorRef: ChangeDetectorRef,
    private _sellerUserService: SellerUserService,
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
    this.isSuperAdmin = this._navigationService.isSuperAdmin;
    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.rolePermission = this.getSellerUserPermission(data);
        this._changeDetectorRef.markForCheck();
      });

    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (!this.rolePermission || !Object.keys(this.rolePermission).length) {
          this.rolePermission = this.getSellerUserPermission(data);
          this._changeDetectorRef.markForCheck();
        }
      });
    this.sellerStatusfromGroup = this._formBuilder.group({
      status: [""],
    });
    // Get the contacts
    this._sellerUserService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        // Update the pagination
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });
    this._sellerUserService.users$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((contacts: User[]) => {
        // Update the contacts
        this.sellersCount = contacts?.length;
        this.sellerFormInput = this._sellerUserService.users$;
        // Mark for check
        this._changeDetectorRef.markForCheck();
      });

    this._sellerUserService
      .getSellerUsers(this.getSellerId())
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.searchValue = query;
          return this._sellerUserService.getSellerUsers(
            this.getSellerId(),
            1,
            getPageSize(this._paginators?.first),
            "createdAt",
            "desc",
            query,
          );
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
    this.removeSellerConfirm = this._formBuilder.group({
      title: "Remove seller user",
      message: "Are you sure you want to remove this seller user?",
      icon: this._formBuilder.group({
        show: true,
        name: "heroicons_outline:exclamation",
        color: "warn",
      }),
      actions: this._formBuilder.group({
        confirm: this._formBuilder.group({
          show: true,
          label: "Remove",
          color: "warn",
        }),
        cancel: this._formBuilder.group({
          show: true,
          label: "Cancel",
        }),
      }),
      dismissible: true,
    });
    this.toggleSellerStatusConfirm = this._formBuilder.group({
      title: "Change status",
      message: "Are you sure you want to change this user status?",
      icon: this._formBuilder.group({
        show: true,
        name: "heroicons_outline:exclamation",
        color: "warn",
      }),
      actions: this._formBuilder.group({
        confirm: this._formBuilder.group({
          show: true,
          label: "Change",
          color: "warn",
        }),
        cancel: this._formBuilder.group({
          show: true,
          label: "Cancel",
        }),
      }),
      dismissible: true,
    });

    this.matDrawer.openedChange
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((opened) => {
        if (!opened) {
          this.fetchUsers();
        }
        this._changeDetectorRef.markForCheck();
      });

    this._fuseMediaWatcherService.onMediaChange$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(({ matchingAliases }) => {
        if (matchingAliases.includes("lg")) {
          this.drawerMode = "side";
        } else {
          this.drawerMode = "over";
        }

        this._changeDetectorRef.markForCheck();
      });

    fromEvent(this._document, "keydown")
      .pipe(
        takeUntil(this._unsubscribeAll),
        filter<KeyboardEvent>(
          (event) =>
            (event.ctrlKey === true || event.metaKey) && event.key === "/",
        ),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        // Reserved for keyboard shortcut actions
      });
  }

  /**
   * After view init
   */
  ngAfterViewInit(): void {
    this._paginators.changes
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.setupSortAndPagination();
      });
    this.setupSortAndPagination();
  }

  setupSortAndPagination(): void {
    if (this._sort && this._paginators?.first) {
      this._changeDetectorRef.markForCheck();
      this._sort.sortChange
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          if (this._paginators?.first) {
            this._paginators.first.pageIndex = 0;
          }
        });
      merge(this._sort.sortChange, this._paginators.first.page)
        .pipe(
          switchMap(() => {
            this.isLoading = true;
            const page = (this._paginators?.first?.pageIndex ?? 0) + 1;
            return this._sellerUserService.getSellerUsers(
              this.getSellerId(),
              page,
              getPageSize(this._paginators?.first),
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

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  /**
   * Toggle seller status
   */
  toggleSellerStatus(contact: any, event: any): void {
    const dialogRef = this._confirmationService.open(
      this.toggleSellerStatusConfirm.value,
    );
    const previousStatus = this.getStatus(contact.status);

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          const newStatus = event.checked ? "active" : "inactive";
          this._sellerUserService
            .updateSellerUserStatus(contact._id, newStatus)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
              next: () => {
                contact.status = event.checked ? 1 : 0;
                this._utilService.onSuccess("Status updated successfully");
                this._changeDetectorRef.markForCheck();
              },
              error: (err) => {
                event.source.checked = previousStatus;
                this._utilService.onError(
                  err?.error?.message || "Failed to update status",
                );
                this._changeDetectorRef.markForCheck();
              },
            });
        } else {
          event.source.checked = previousStatus;
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Get status
   */
  getStatus(status: string | number | boolean): boolean {
    return (
      status === "active" || status === 1 || status === "1" || status === true
    );
  }

  getInitials(firstName: string, lastName: string): string {
    const firstInitial = firstName?.trim()?.charAt(0) || "";
    const lastInitial = lastName?.trim()?.charAt(0) || "";
    const initials = `${firstInitial}${lastInitial}`.trim();

    return initials ? initials.toUpperCase() : "U";
  }

  /**
   * Delete seller user
   */
  deleteSellerUser(userId: string): void {
    const dialogRef = this._confirmationService.open(
      this.removeSellerConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          const currentUser = this._userSessionService.getCurrentUser();
          this._sellerUserService
            .deleteSellerUser(userId, currentUser?.id || "admin")
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
              next: () => {
                this._utilService.onSuccess("User deleted successfully");
                this.fetchUsers();
              },
              error: (err) => {
                this._utilService.onError(
                  err?.error?.message || "Failed to delete user",
                );
              },
            });
        }
      });
  }

  openEditSellerUser(userId: string): void {
    this._router.navigate(["./", userId], {
      relativeTo: this._activatedRoute,
      queryParams: { edit: true },
    });
  }

  /**
   * Track by function for ngFor
   */
  trackByFn(index: number, item: any): any {
    return item._id || index;
  }

  onBackdropClicked(): void {
    this.matDrawer.close().then(() => {
      this._router.navigate(["./"], { relativeTo: this._activatedRoute });
      this._changeDetectorRef.markForCheck();
    });
  }

  private getSellerId(): string {
    return this._userSessionService.getPermissionSellerId();
  }

  private getSellerUserPermission(data: any): any {
    return this._navigationService.getPermissionByRoute(data, this._router.url);
  }

  get canView(): boolean {
    if (this.isSuperAdmin) {
      return true;
    }

    if (!this.rolePermission || !Object.keys(this.rolePermission).length) {
      return true;
    }

    return Boolean(this.rolePermission?.view);
  }

  get canAdd(): boolean {
    if (this.isSuperAdmin) {
      return true;
    }

    if (!this.rolePermission || !Object.keys(this.rolePermission).length) {
      return true;
    }

    return Boolean(this.rolePermission?.add);
  }

  get canUpdate(): boolean {
    if (this.isSuperAdmin) {
      return true;
    }

    if (!this.rolePermission || !Object.keys(this.rolePermission).length) {
      return true;
    }

    return Boolean(this.rolePermission?.update);
  }

  get canDelete(): boolean {
    if (this.isSuperAdmin) {
      return true;
    }

    if (!this.rolePermission || !Object.keys(this.rolePermission).length) {
      return true;
    }

    return Boolean(this.rolePermission?.delete);
  }

  refresh(): void {
    this.searchInputControl.setValue("");
  }

  fetchUsers(): void {
    const page = this._paginators?.first?.pageIndex + 1 || 1;
    this._sellerUserService
      .getSellerUsers(
        this.getSellerId(),
        page,
        getPageSize(this._paginators?.first),
        this._sort?.active || "first_name",
        this._sort?.direction || "asc",
        this.searchValue,
        this.tmpQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }
}
