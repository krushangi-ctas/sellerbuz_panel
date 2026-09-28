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
import _, { sortBy } from "lodash";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { PortalService } from "app/core/portal/portal.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { MatDialog } from "@angular/material/dialog";
import { PlanService } from "app/core/manage-plan/plan.service";
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { SellerDialogComponent } from "../list/dialogs/seller-dialog/seller-dialog.component";

@Component({
  standalone: false,
  selector: "contacts-list",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.scss"],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellersListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("matDrawer", { static: true }) matDrawer: MatDrawer;
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;

  removeSellerConfirm: FormGroup;
  sellerStatusfromGroup: FormGroup;
  toggleSellerStatusConfirm: FormGroup;
  searchInputControl: FormControl = new FormControl();
  tooltip = Constants.sellerDetails;

  sellerFormInput: Observable<User[]>;

  pagination: Pagination;
  sellersCount: number = 0;
  drawerMode: "side" | "over";

  plans: any[] = [];
  sellerPlanDetails: Record<string, any> = {};

  imgPath = environment.uploadPath;

  pageLimit: number = Constants.pageLimit;
  pageOptions: number[] = Constants.pageOptions;
  contactsTableColumns: string[] = ["name", "email", "phoneNumber", "job"];
  portalList: Record<string, string>[] = [];

  tmpQry: any;
  selectedSeller: any;
  searchValue: any = "";
  showFilter: boolean = false;
  isLoading: boolean;
  isAllPortalSelect: boolean = false;
  expandedSeller: string | null = null;
  countBasedFilter: Record<string, string> = {};
  permissionGuard: any = {};
  portalMap: Record<string, string> = {};
  imageErrors: { [key: string]: boolean } = {};

  private _unsubscribeAll: Subject<any> = new Subject<any>();
  p: (...data: any[]) => void = console.log;

  readonly headers: Record<string, string>[] = [
    { key: "" },
    { key: "Seller", sortBy: "first_name" },
    { key: "Email", sortBy: "email" },
    { key: "Contact", sortBy: "contact_no" },
    // { key: "Orders" },
    { key: "Products", sortBy: "product_count" },
    { key: "Shops" },
    { key: "Status" },
    { key: "Actions" },
  ];
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
    private _portalService: PortalService,
    private _navigationService: NavigationService,
    private _dialog: MatDialog,
    private _planService: PlanService,
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
          data?.permissions.find(
            (item: any) => item?.section_name === "Sellers",
          )
        ) {
          this.permissionGuard = data?.permissions.find(
            (item) => item?.section_name === "Sellers",
          );
        }
      });
    this.sellerStatusfromGroup = this._formBuilder.group({
      status: [""],
      minProduct: [""],
      maxProduct: [""],
      eqProduct: [""],
      maxOrder: [""],
      minOrder: [""],
      eqOrder: [""],
      shops: [""],
    });
    // this.sellerStatusfromGroup.valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(data => {
    //     this.countBasedFilter = Object.fromEntries(Object.entries(data).filter(([_, v]: [string, string]) => !!v || parseInt(v) === 0)) as Record<string, string>
    // })
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

    this._userService
      .getUsers()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
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
          return this._userService.getUsers(
            this.pagination?.page || 1,
            getPageSize(this._paginators?.first),
            "createdAt",
            "desc",
            this.searchValue,
            this.tmpQry,
            this.countBasedFilter,
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
          // Changed from query["shops"].join("|") to query["shops"].join(",")
          if (Array.isArray(query["shops"])) {
            query["shops"] = query["shops"].join(",");
          }
          this.isLoading = true;
          this.countBasedFilter = Object.fromEntries(
            Object.entries(query).filter(
              ([_, v]: [string, string]) => !!v || parseInt(v) === 0,
            ),
          ) as Record<string, string>;
          return this._userService.getUsers(
            1,
            getPageSize(this._paginators?.first),
            "createdAt",
            "desc",
            this.searchValue,
            {},
            this.countBasedFilter,
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
          this.fetchSellersList();
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
    this.getPortalList();

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

    this._planService
      .getAllPlan()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((res: any) => {
        if (res?.status === 200 || Array.isArray(res)) {
          this.plans = res.data || res || [];
          this._changeDetectorRef.markForCheck();
        }
      });
  }
  // filterQry(arg0: number, pageLimit: number, arg2: string, arg3: string, tmpQry: any, filterQry: any): Observable<{ pagination: Pagination; data: User[] }> {
  //     throw new Error('Method not implemented.');
  // }
  getPortalList(): void {
    this._portalService
      .portalNameList()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (data?.status === 200) {
          this.portalList = data.data || [];

          this.portalMap = {};
          this.portalList.forEach((portal: any) => {
            this.portalMap[portal.id || portal._id] =
              portal.portal_name || portal.name;
          });

          this._changeDetectorRef.markForCheck();
        }
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
            return this._userService.getUsers(
              page,
              getPageSize(this._paginators.first),
              this._sort.active,
              this._sort.direction,
              this.searchValue,
              this.tmpQry,
              this.countBasedFilter,
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

  fetchSellersList(): void {
    this.isLoading = true;
    const page = this.pagination?.page || 1;
    const pageSize = getPageSize(this._paginators?.first);
    const sortActive = this._sort?.active || "createdAt";
    const sortDirection = this._sort?.direction || "desc";

    this._userService
      .getUsers(
        page,
        pageSize,
        sortActive,
        sortDirection,
        this.searchValue,
        this.tmpQry,
        this.countBasedFilter,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * On backdrop clicked
   */
  onBackdropClicked(): void {
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
  get shopControl(): FormControl {
    return this.sellerStatusfromGroup.get("shops") as FormControl;
  }

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

  toggleSellerStatus(seller: any, event: any): void {
    const sellerId = seller?.id || seller?._id;

    const dialogRef = this._confirmationService.open(
      this.toggleSellerStatusConfirm.value,
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._userService
            .changeSellerStatus(sellerId, "change-seller-status")
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

                this._userService
                  .getUsers(
                    (this._paginators?.first?.pageIndex ?? 0) + 1,
                    getPageSize(this._paginators?.first),
                    this._sort?.active || "createdAt",
                    this._sort?.direction || "desc",
                    this.searchValue,
                    this.tmpQry,
                    this.countBasedFilter,
                  )
                  .pipe(takeUntil(this._unsubscribeAll))
                  .subscribe();

                this._changeDetectorRef.markForCheck();
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
    this.countBasedFilter = {};
    this.searchValue = "";
    this.sellerStatusfromGroup.get("status")?.setValue("");
    this.searchInputControl.setValue(null);
    this.sellerStatusfromGroup.get("shops")?.setValue([]);
    this.sellerStatusfromGroup.get("minProduct")?.setValue("");
    this.sellerStatusfromGroup.get("maxProduct")?.setValue("");
    this.sellerStatusfromGroup.get("eqProduct")?.setValue("");
    this.sellerStatusfromGroup.get("minOrder")?.setValue("");
    this.sellerStatusfromGroup.get("maxOrder")?.setValue("");
    this.sellerStatusfromGroup.get("eqOrder")?.setValue("");
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
  transformAvatarUrl(profileImgUrl: string): string {
    if (!profileImgUrl) {
      return profileImgUrl;
    }
    // Replace green background color with primary color
    return profileImgUrl.replace(/background=084f08/gi, "background=1e3a8a");
  }

  onImageError(contact: any): void {
    this.imageErrors[contact._id] = true;
  }

  getInitials(contact: any): string {
    const first = contact?.first_name?.charAt(0)?.toUpperCase() || "";
    const last = contact?.last_name?.charAt(0)?.toUpperCase() || "";
    return first + last;
  }
  getContactId(contact: any): string {
    return contact?._id || contact?.id || "";
  }

  toggleExpand(id: string): void {
    const sellerId = id || "";
    this.expandedSeller = this.expandedSeller === sellerId ? null : sellerId;
    if (this.expandedSeller === sellerId) {
      this.loadSellerUsages(sellerId, true);
    }
  }

  loadSellerUsages(sellerId: string, force = false): void {
    if (!sellerId) {
      return;
    }

    if (!force && this.sellerPlanDetails[sellerId]?.loading) {
      return;
    }

    const previous = this.sellerPlanDetails[sellerId];

    this.sellerPlanDetails[sellerId] = {
      ...previous,
      loading: true,
      loadError: "",
      activePlanName: previous?.activePlanName || "Loading...",
      usages: previous?.usages || [],
    };
    this._changeDetectorRef.markForCheck();

    this._userService
      .getUserUsages(sellerId, force)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          if (res?.status === 200 && res?.data) {
            // Backend returns a per-subscription structure:
            // { queues: [{ subscription_id, status, activePlanName, billingCycle,
            //              expiredAt, isPlanCancel, usages[] }] }
            // Derive summary fields from the ACTIVE queue (fallback: first)
            // so all existing helpers/template bindings keep working.
            const queues = res.data.queues || [];
            const activeQ =
              queues.find((q: any) => q.status === "active") || null;
            const originalFutureQueueIds = queues
              .filter((q: any) => q.status === "future")
              .map((q: any) => q.subscription_id);
            this.sellerPlanDetails[sellerId] = {
              loading: false,
              queues,
              activeSubscriptionId: activeQ?.subscription_id ?? null,
              activePlanName:
                activeQ?.activePlanName ||
                queues[0]?.activePlanName ||
                "No Plan",
              billingCycle: activeQ?.billingCycle,
              expiredAt: activeQ?.expiredAt ?? null,
              isPlanCancel: !!activeQ?.isPlanCancel,
              usages: activeQ?.usages || [],
              originalFutureQueueIds,
              isOrderModified: false,
            };
          } else {
            this.sellerPlanDetails[sellerId] = {
              loading: false,
              loadError: res?.message || "Failed to load usage limits",
              activePlanName: previous?.activePlanName || "No Plan",
              billingCycle: previous?.billingCycle,
              expiredAt: previous?.expiredAt,
              usages: previous?.usages || [],
              refreshedAt: previous?.refreshedAt,
            };
          }
          this._changeDetectorRef.markForCheck();
        },
        error: (err: any) => {
          this.sellerPlanDetails[sellerId] = {
            loading: false,
            loadError:
              err?.error?.message ||
              err?.message ||
              "Failed to refresh usage limits",
            activePlanName: previous?.activePlanName || "Active Plan",
            billingCycle: previous?.billingCycle,
            expiredAt: previous?.expiredAt,
            usages: previous?.usages || [],
            refreshedAt: previous?.refreshedAt,
          };
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  refreshSellerUsages(sellerId: string): void {
    this.loadSellerUsages(sellerId, true);
  }

  hasActivePlan(contact: any): boolean {
    if (!contact?.subscriptions?.length) return false;
    const now = new Date();
    return contact.subscriptions.some(
      (sub: any) => sub.status === "active" && new Date(sub.expired_at) > now,
    );
  }

  /**
   * Latest subscription (active first, else most recent) for display in the
   * renewal dialog.
   */
  getLatestSubscription(seller: any): any {
    const subs = seller?.subscriptions || [];
    if (!subs.length) return null;
    const now = new Date();
    return (
      subs.find(
        (sub: any) => sub.status === "active" && new Date(sub.expired_at) > now,
      ) ||
      subs[subs.length - 1] ||
      null
    );
  }

  isPlanCancelled(contact: any): boolean {
    const details = this.sellerPlanDetails[contact?._id || contact?.id];
    if (
      details &&
      !details.loading &&
      typeof details.isPlanCancel === "boolean"
    ) {
      return details.isPlanCancel;
    }
    const latest = this.getLatestSubscription(contact);
    return !!latest?.is_plan_cancel;
  }

  getActivePlanName(contact: any): string {
    const details = this.sellerPlanDetails[contact._id];
    if (details && !details.loading) {
      if (details.isPlanCancel) {
        return `${details.activePlanName} (Cancelled)`;
      }
      return details.activePlanName;
    }
    if (!contact?.subscriptions?.length) return "No Plan";
    const now = new Date();
    const activeSub = contact.subscriptions.find(
      (sub: any) => sub.status === "active" && new Date(sub.expired_at) > now,
    );
    if (!activeSub) return "No Plan";
    if (activeSub.is_plan_cancel) {
      return `${activeSub.plan_name || "Active Plan"} (Cancelled)`;
    }
    return activeSub.plan_name || "Active Plan";
  }

  openRenewSubscriptionDialog(seller: any): void {
    const dialogRef = this._dialog.open(SellerDialogComponent, {
      width: "480px",
      data: { type: "renew", seller, plans: this.plans },
      autoFocus: false,
    });
    this.handleDialogRefresh(dialogRef);
  }

  openRenewContinueDialog(seller: any): void {
    this.openRenewSubscriptionDialog(seller);
  }

  /** Lowest-queue_priority future = the one that activates on current expiry. */
  isNextUp(seller: any, subscriptionId: string): boolean {
    const sellerId = seller?._id;
    const details = sellerId ? this.sellerPlanDetails[sellerId] : null;
    if (details && details.queues && details.queues.length) {
      const futureQueues = details.queues.filter(
        (q: any) => q.status === "future",
      );
      if (futureQueues.length > 0) {
        const firstId = String(
          futureQueues[0].subscription_id || futureQueues[0]._id,
        );
        return firstId === String(subscriptionId);
      }
    }

    const futures = (seller?.subscriptions || [])
      .filter((sub: any) => sub.status === "future")
      .sort(
        (a: any, b: any) =>
          (a.queue_priority ?? Infinity) - (b.queue_priority ?? Infinity),
      );
    return (
      futures.length > 0 &&
      String(futures[0]._id || futures[0].subscription_id) ===
        String(subscriptionId)
    );
  }

  /**
   * Drag-and-drop reorder among future queues.
   * Only future queues are draggable. Stored locally; requires manual "Save Order" click to persist.
   */
  onQueueDrop(event: CdkDragDrop<any[]>, sellerId: string, seller: any): void {
    const details = this.sellerPlanDetails[sellerId];
    if (!details || !details.queues) return;

    const queues = details.queues;
    const activeQueues = queues.filter((q: any) => q.status !== "future");
    const futureQueues = queues.filter((q: any) => q.status === "future");

    if (futureQueues.length === 0) return;

    // Drop index is relative to futureQueues list container
    moveItemInArray(futureQueues, event.previousIndex, event.currentIndex);

    // Rebuild the final array locally
    details.queues = [...activeQueues, ...futureQueues];

    // Detect if order has changed from the original loaded order
    const currentFutureIds = futureQueues.map((q: any) => q.subscription_id);
    const originalFutureIds = details.originalFutureQueueIds || [];

    let isDifferent = currentFutureIds.length !== originalFutureIds.length;
    if (!isDifferent) {
      for (let i = 0; i < currentFutureIds.length; i++) {
        if (currentFutureIds[i] !== originalFutureIds[i]) {
          isDifferent = true;
          break;
        }
      }
    }

    details.isOrderModified = isDifferent;
    this._changeDetectorRef.markForCheck();
  }

  saveQueueOrder(sellerId: string): void {
    const details = this.sellerPlanDetails[sellerId];
    if (!details || !details.queues) return;

    this.isLoading = true;
    const futureQueues = details.queues.filter(
      (q: any) => q.status === "future",
    );
    const orderedSubscriptionIds = futureQueues.map(
      (q: any) => q.subscription_id,
    );

    this._userService
      .reorderQueues(sellerId, orderedSubscriptionIds)
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this._utilService.onSuccess("Queue order saved successfully");
          this.loadSellerUsages(sellerId);
        },
        error: (err: any) => {
          this.isLoading = false;
          this.loadSellerUsages(sellerId);
          this._utilService.onError(
            err?.error?.message || "Failed to save queue order",
          );
        },
      });
  }

  cancelQueueOrder(sellerId: string): void {
    this.loadSellerUsages(sellerId);
  }

  getActiveQueue(sellerId: string): any {
    const queues = this.sellerPlanDetails[sellerId]?.queues || [];
    return queues.find((q: any) => q.status === "active") || null;
  }

  getFutureQueues(sellerId: string): any[] {
    const queues = this.sellerPlanDetails[sellerId]?.queues || [];
    return queues.filter((q: any) => q.status === "future");
  }

  openSwitchPlanDialog(seller: any, subscriptionId: string): void {
    const latest = this.getLatestSubscription(seller);
    const dialogRef = this._dialog.open(SellerDialogComponent, {
      width: "480px",
      data: {
        type: "switch",
        seller,
        subscriptionId,
        fromPlanName: latest?.plan_name || "current plan",
        plans: this.plans,
      },
      autoFocus: false,
    });
    this.handleDialogRefresh(dialogRef);
  }

  /**
   * Queued ('future') instances are the only cancellable subscriptions —
   * active ones run until their period ends (backend-enforced).
   */
  getQueuedSubscriptions(seller: any): any[] {
    return (seller?.subscriptions || []).filter(
      (sub: any) => sub.status === "future",
    );
  }

  /** Cancel one specific queued instance from its subscription block. */
  cancelQueuedInstance(seller: any, subscriptionId: string): void {
    const sellerId = seller?._id || seller?.id;
    if (!sellerId || !subscriptionId) return;

    const currentDetails = this.sellerPlanDetails[sellerId];
    const targetSub =
      (currentDetails?.queues || []).find(
        (q: any) => String(q.subscription_id) === String(subscriptionId),
      ) ||
      (seller?.subscriptions || []).find(
        (sub: any) => String(sub._id) === String(subscriptionId),
      );

    const planLabel = targetSub
      ? `${targetSub.activePlanName || targetSub.plan_name || "plan"} (${String(
          subscriptionId,
        ).slice(-6)})`
      : `subscription ${String(subscriptionId).slice(-6)}`;

    const dialogRef = this._confirmationService.open({
      title: "Cancel Queued Plan",
      message: `Are you sure you want to cancel the queued subscription plan (${planLabel})? Its usage limits will be removed.`,
      icon: {
        show: true,
        name: "heroicons_outline:exclamation",
        color: "warn",
      },
      actions: {
        confirm: { show: true, label: "Yes, Cancel", color: "warn" },
        cancel: { show: true, label: "Keep" },
      },
      dismissible: true,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this.cancelQueuesInternal(sellerId, [subscriptionId]);
        }
      });
  }

  // -----------------------------------------------------------------------
  // Admin Cancel Active
  // -----------------------------------------------------------------------

  openAdminCancelActiveDialog(seller: any): void {
    const dialogRef = this._dialog.open(SellerDialogComponent, {
      width: "480px",
      data: { type: "cancel-active", seller },
      autoFocus: false,
    });
    this.handleDialogRefresh(dialogRef);
  }

  openBulkAdjustLimitDialog(seller: any, subscriptionId: string): void {
    const queues = this.sellerPlanDetails[seller._id]?.queues || [];
    const queue = queues.find(
      (q: any) => String(q.subscription_id) === String(subscriptionId),
    );
    if (!queue || !queue.usages?.length) return;

    const dialogRef = this._dialog.open(SellerDialogComponent, {
      width: "600px",
      maxWidth: "95vw",
      data: { type: "bulk", seller, subscriptionId, queue },
      autoFocus: false,
    });
    this.handleDialogRefresh(dialogRef);
  }

  /**
   * Shared post-dialog-success refresh: invalidate cached plan details,
   * reload usages if the seller is currently expanded, and refresh the list.
   */
  private handleDialogRefresh(dialogRef: any): void {
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((sellerId: string) => {
        if (!sellerId) return;
        delete this.sellerPlanDetails[sellerId];
        if (this.expandedSeller === sellerId) {
          this.loadSellerUsages(sellerId);
        }
        this.fetchSellersList();
      });
  }

  private cancelQueuesInternal(
    sellerId: string,
    subscriptionIds: string[],
  ): void {
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();

    this._userService
      .cancelSubscription(sellerId, { subscription_ids: subscriptionIds })
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this._utilService.onSuccess(
            res?.message || "Queued plan(s) cancelled successfully.",
          );
          delete this.sellerPlanDetails[sellerId];
          if (this.expandedSeller === sellerId) {
            this.loadSellerUsages(sellerId, true);
          }
          this.fetchSellersList();
          this._changeDetectorRef.markForCheck();
        },
        error: (err: any) => {
          this.isLoading = false;
          this._utilService.onError(
            err?.error?.message || "Failed to cancel plan.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }
}
