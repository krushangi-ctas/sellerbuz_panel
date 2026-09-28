import { map, switchMap, takeUntil } from "rxjs";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MatDrawer } from "@angular/material/sidenav";
import { FuseMediaWatcherService } from "@fuse/services/media-watcher";
import { FuseUtilsService } from "@fuse/services/utils";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { Pagination } from "app/core/pagination/pagination.types";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import { NavigationService } from "app/core/navigation/navigation.service";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import {
  debounceTime,
  fromEvent,
  filter,
  merge,
  Observable,
  of,
  Subject,
} from "rxjs";
import { environment } from "environments/environment";
import { TagService } from "app/core/tag-setting/tag-setting.service";
import { TagSettings } from "app/core/tag-setting/tag-setting.model";

@Component({
  standalone: false,
  selector: "marketplace-list",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.scss"],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("matDrawer", { static: true }) matDrawer: MatDrawer; //matDrawer
  @ViewChild(MatPaginator) private _paginator: MatPaginator;
  @ViewChild(MatSort) private _sort: MatSort;

  headers: { key: string; label: string; sortKey?: string }[] = [
    { key: "createdAt", label: "Created", sortKey: "createdAt" },
    { key: "tag", label: "Tag" },
    { key: "description", label: "Description", sortKey: "description" },
    { key: "updatedAt", label: "Updated", sortKey: "updatedAt" },
    { key: "status", label: "Status" },
  ];
  drawerMode: "side" | "over";
  selectedMarketplace: any;
  toggleMarketplaceStatusConfirm: FormGroup;
  deleteMarketplaceConfirm: FormGroup;
  tooltip = Constants.tagDetails;
  pagination: Pagination;
  imgPath = environment.uploadPath;
  removeTagConfirm: FormGroup;
  tagFormInput: Observable<TagSettings[]>;
  updateStatusConfirm: FormGroup;
  searchInputControl: FormControl = new FormControl();
  statusInputControl: FormControl = new FormControl();
  tagStatusfromGroup: FormGroup;
  searchValue: any = "";
  pageLimit: number = Constants.pageLimit;
  startDate: FormControl = new FormControl("");
  endDate: FormControl = new FormControl("");
  maxDate: Date = new Date();
  isResetDate: boolean = false;
  tmpQry: any = {};
  filterQry: any = {};
  isLoading: boolean = false;
  isSuperAdmin: boolean;
  rolePermission: any = {};
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  /**
   * Constructor
   */
  constructor(
    private _activatedRoute: ActivatedRoute,
    private _changeDetectorRef: ChangeDetectorRef,
    private _tagService: TagService,
    private _utilService: FuseUtilsService,
    @Inject(DOCUMENT) private _document: any,
    private _router: Router,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private _confirmationService: FuseConfirmationService,
    private _formBuilder: FormBuilder,
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
        this.rolePermission = this._navigationService.getPermissionByRoute(
          data,
          this._router.url,
        );
        this._changeDetectorRef.markForCheck();
      });

    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (!this.rolePermission || !Object.keys(this.rolePermission).length) {
          this.rolePermission = this._navigationService.getPermissionByRoute(
            data,
            this._router.url,
          );
          this._changeDetectorRef.markForCheck();
        }
      });

    this.tagStatusfromGroup = this._formBuilder.group({
      status: [""],
    });
    this.removeTagConfirm = this._utilService.confirmMessage(
      "Remove Portal",
      "Are you sure you want to remove Tag details permanently?",
      "Remove",
    );
    this.updateStatusConfirm = this._utilService.confirmMessage(
      "Update Status",
      "Are you sure you want to update Tag status?",
      "Confirm",
    );
    this._changeDetectorRef.markForCheck();

    this._tagService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });
    this.tagFormInput = this._tagService.TagSettings$;
    this._tagService
      .getAllTagList()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.isLoading = true;
          this.searchValue = (query && query.trim()) || "";
          return this._tagService.getAllTagList(
            1,
            (this.pageLimit = this._paginator?.pageSize || 100),
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

    this.tagStatusfromGroup.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          if (typeof this.tmpQry !== "object" || this.tmpQry === null) {
            this.tmpQry = {};
          }
          this.tmpQry = { ...this.tmpQry, ...query };
          if (
            this.startDate.value &&
            this.startDate.value !== "" &&
            this.endDate.value &&
            this.endDate.value !== ""
          ) {
            const tmpStart = new Date(this.startDate.value);
            tmpStart.setHours(0, 0, 0, 0);
            const tmpEnd = new Date(this.endDate.value);
            tmpEnd.setHours(23, 59, 59, 999);
            this.tmpQry["startDate"] = tmpStart;
            this.tmpQry["endDate"] = tmpEnd;
          }
          this.isLoading = true;
          return this._tagService.getAllTagList(
            1,
            (this.pageLimit = this._paginator?.pageSize || 100),
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

    // Get the contact

    // Subscribe to MatDrawer opened change
    this.matDrawer.openedChange
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((opened) => {
        if (!opened) {
          // Remove the selected contact when drawer closed
          this.selectedMarketplace = null;
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
      .subscribe(() => {});
  }

  ngAfterViewInit(): void {
    if (this._sort && this._paginator) {
      // Mark for check
      // this._changeDetectorRef.markForCheck();

      // If the user changes the sort order...
      this._sort.sortChange
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          // Reset back to the first page
          this._paginator.pageIndex = 0;
        });
      // Get order if sort or page changes
      merge(this._sort.sortChange, this._paginator.page)
        .pipe(
          switchMap(() =>
            this._tagService.getAllTagList(
              this._paginator.pageIndex + 1,
              this._paginator.pageSize,
              this._sort.active,
              this._sort.direction,
              this.searchValue,
              this.tmpQry,
            ),
          ),
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

  getTagSettings(): void {
    const filterObj =
      typeof this.tmpQry === "object" && this.tmpQry !== null
        ? { ...this.tmpQry }
        : {};
    if (
      this.startDate.value &&
      this.startDate.value !== "" &&
      this.endDate.value &&
      this.endDate.value !== ""
    ) {
      const tmpStart = new Date(this.startDate.value);
      tmpStart.setHours(0, 0, 0, 0);
      const tmpEnd = new Date(this.endDate.value);
      tmpEnd.setHours(23, 59, 59, 999);
      filterObj["startDate"] = new Date(tmpStart);
      filterObj["endDate"] = new Date(tmpEnd);
    }
    this._tagService
      .getAllTagList(
        1,
        getPageSize(this._paginator),
        "createdAt",
        "desc",
        this.searchValue,
        filterObj,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        this.tagFormInput = this._tagService.TagSettings$;
        this._changeDetectorRef.markForCheck();
      });
  }

  toggleCompleted(event, id): void {
    const dialogRef = this._confirmationService.open(
      this.updateStatusConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        (result) => {
          if (result === "confirmed") {
            this._tagService
              .updateStatus(id, event)
              .pipe(takeUntil(this._unsubscribeAll))
              .subscribe(
                () => {
                  this._changeDetectorRef.markForCheck();
                  this._utilService.onSuccess(
                    "Status has been updated successfully!",
                  );
                },
                (error) => {
                  this._utilService.onError(error.message);
                  this._changeDetectorRef.markForCheck();
                },
              );
          } else {
            event.source.checked = !event.source.checked;
            this._changeDetectorRef.markForCheck();
          }
        },
        (errr) => {
          console.error(errr);
        },
      );
  }

  getStatus(status): boolean {
    if (status === 0) {
      return false;
    } else {
      return true;
    }
  }

  refresh(): void {
    this.tmpQry = {};
    this.startDate.setValue("");
    this.endDate.setValue("");
    this.isResetDate = false;
    this.tagStatusfromGroup.get("status").setValue("");
    this.searchInputControl.setValue(null);
    this.getTagSettings();
  }

  clearDate(): void {
    this.startDate.setValue("");
    this.endDate.setValue("");
    delete this.tmpQry["startDate"];
    delete this.tmpQry["endDate"];
    this.isResetDate = false;
    this.getTagSettings();
  }

  onDateClickFilter(): void {
    if (
      this.startDate.value &&
      this.startDate.value !== "" &&
      this.endDate.value &&
      this.endDate.value !== ""
    ) {
      const tmpStart = new Date(this.startDate.value);
      tmpStart.setHours(0, 0, 0, 0);
      const tmpEnd = new Date(this.endDate.value);
      tmpEnd.setHours(23, 59, 59, 999);
      this.tmpQry["startDate"] = new Date(tmpStart);
      this.tmpQry["endDate"] = new Date(tmpEnd);
      this.isResetDate = true;
    }
    this.getTagSettings();
  }

  deleteSelectedTag(id: string): void {
    const dialogRef = this._confirmationService.open(
      this.removeTagConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._tagService
            .deleteTag(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.getTagSettings();
                this._changeDetectorRef.markForCheck();
                this._utilService.onSuccess(
                  "Portal details has been deleted successfully.",
                );
              },
              ({ error }) => {
                this._utilService.onError(error.message);
                this._changeDetectorRef.markForCheck();
              },
            );
        }
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

  openDrawer(portalID): void {
    if (portalID !== "") {
      this._router.navigate(["./", portalID], {
        relativeTo: this._activatedRoute,
      });
    } else {
      this._router.navigate(["./", "add"], {
        relativeTo: this._activatedRoute,
      });
    }
    this._changeDetectorRef.markForCheck();
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
}
