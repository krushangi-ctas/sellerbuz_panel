import { map, switchMap, takeUntil } from "rxjs";
import {
  AfterViewInit,
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
import { Portal } from "app/core/portal/portal.model";
import { PortalService } from "app/core/portal/portal.service";
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
import {
  ImageItem,
  ImageSize,
  ThumbnailsPosition,
  Gallery,
  VideoItem,
} from "ng-gallery";
import { Lightbox } from "ng-gallery/lightbox";
import { getFileType } from "app/shared/common";

@Component({
  standalone: false,
  selector: "marketplace-list",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.scss"],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class portalListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("matDrawer", { static: true }) matDrawer: MatDrawer; //matDrawer
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;

  headers: { key: string; label: string; sortKey?: string }[] = [
    { key: "createdAt", label: "Created", sortKey: "createdAt" },
    { key: "image", label: "Image" },
    { key: "portal_name", label: "Shop Name", sortKey: "portal_name" },
    { key: "portal_number", label: "Shop Number", sortKey: "portal_number" },
    { key: "updatedAt", label: "Updated", sortKey: "updatedAt" },
    { key: "status", label: "Status", sortKey: "status" },
  ];
  drawerMode: "side" | "over";
  selectedMarketplace: any;
  toggleMarketplaceStatusConfirm: FormGroup;
  deleteMarketplaceConfirm: FormGroup;
  tooltip = Constants.portalDetails;
  pagination: Pagination;
  imgPath = environment.uploadPath;
  removePortalConfirm: FormGroup;
  portalFormInput: Observable<Portal[]>;
  updateStatusConfirm: FormGroup;
  searchInputControl: FormControl = new FormControl();
  statusInputControl: FormControl = new FormControl();
  protalStatusfromGroup: FormGroup;
  searchValue: any = "";
  pageLimit: number = Constants.pageLimit;
  tmpQry: any = "";
  filterQry: any = {};
  isLoading: boolean = false;
  isSuperAdmin: boolean;
  permission: any;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  /**
   * Constructor
   */
  constructor(
    private _activatedRoute: ActivatedRoute,
    private _changeDetectorRef: ChangeDetectorRef,
    private _portalService: PortalService,
    private _utilService: FuseUtilsService,
    @Inject(DOCUMENT) private _document: any,
    private _router: Router,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private _confirmationService: FuseConfirmationService,
    private _formBuilder: FormBuilder,
    private _navigationService: NavigationService,
    public gallery: Gallery,
    private lightbox: Lightbox,
  ) {
    this._navigationService.userData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (data) {
          if (data.isSuperAdmin) {
            this.isSuperAdmin = true;
          } else {
            const tmpUrl = this._router.url;
            if (data.pageLavel.includes(tmpUrl)) {
              const dataPer = data.permissionLevel.filter(
                (obj) => obj.route_path === tmpUrl,
              );
              this.permission = dataPer?.[0]?.permissions || {};
            } else {
              this._router.navigate(["/error-page"]);
            }
          }
        }
      });
  }
  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    this.protalStatusfromGroup = this._formBuilder.group({
      status: [""],
    });
    this.removePortalConfirm = this._utilService.confirmMessage(
      "Remove Shop",
      "Are you sure you want to remove Shop details permanently?",
      "Remove",
    );
    this.updateStatusConfirm = this._utilService.confirmMessage(
      "Update Status",
      "Are you sure you want to update Shop status?",
      "Confirm",
    );
    this._changeDetectorRef.markForCheck();

    this._portalService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });
    this.portalFormInput = this._portalService.portal$;
    this._portalService
      .getAllPOrtalList()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.isLoading = true;
          this.searchValue = (query && query.trim()) || "";
          return this._portalService.getAllPOrtalList(
            1,
            (this.pageLimit = getPageSize(this._paginators?.first)),
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

    this.protalStatusfromGroup.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.tmpQry = query;
          this.isLoading = true;
          return this._portalService.getAllPOrtalList(
            1,
            (this.pageLimit = getPageSize(this._paginators?.first)),
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
          this.getPortalSettings();
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

      // If the user changes the sort order...
      this._sort.sortChange
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          if (this._paginators?.first) {
            this._paginators.first.pageIndex = 0;
          }
        });

      // Get order if sort or page changes
      merge(this._sort.sortChange, this._paginators.first.page)
        .pipe(
          switchMap(() => {
            this.isLoading = true;
            const page = (this._paginators?.first?.pageIndex ?? 0) + 1;
            const size = getPageSize(this._paginators?.first);
            return this._portalService.getAllPOrtalList(
              page,
              size,
              this._sort?.active || "createdAt",
              this._sort?.direction || "desc",
              this.searchValue,
              this.tmpQry,
            );
          }),
          map(() => {
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
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

  getPortalSettings(): void {
    this.isLoading = true;
    this._portalService
      .getAllPOrtalList(
        1,
        getPageSize(this._paginators?.first),
        "createdAt",
        "desc",
        this.searchValue,
        this.tmpQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        this.portalFormInput = this._portalService.portal$;
        this.isLoading = false;
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
      .subscribe((result) => {
        if (result === "confirmed") {
          this._portalService
            .changePortalStatus(id, event)
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
      });
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
    this.protalStatusfromGroup.get("status").setValue("");
    this.searchInputControl.setValue(null);
  }

  /**
   * Deletes a selected portal (shop) by its unique ID.
   * Prompts the user with a confirmation dialog before initiating soft delete.
   *
   * @param id The unique identifier of the portal to be deleted.
   * @returns void
   */
  deleteSelectedPortal(id: string): void {
    const dialogRef = this._confirmationService.open(
      this.removePortalConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._portalService
            .deletePortal(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                // Refresh portal list and trigger change detection
                this.getPortalSettings();
                this._changeDetectorRef.markForCheck();
                this._utilService.onSuccess(
                  "Portal details has been deleted successfully.",
                );
              },
              ({ error }) => {
                // Display API error message and trigger change detection
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
   * Opens the image preview lightbox for a shop portal
   *
   * @param images The image URL or list of image URLs to preview
   */
  handleLightBoxProduct(images: string[] | string): void {
    const galleryItems: ImageItem[] = [];
    if (Array.isArray(images)) {
      images.forEach((item) => {
        const filetypes = getFileType(item);
        if (filetypes === "image") {
          galleryItems.push(
            new ImageItem({
              src: item,
              thumb: item,
            }),
          );
        } else if (filetypes === "video") {
          galleryItems.push(
            new VideoItem({
              src: item,
              thumb: item,
              autoplay: true,
              loop: true,
            }),
          );
        }
      });
    } else if (typeof images === "string") {
      const filetypes = getFileType(images);
      if (filetypes === "image") {
        galleryItems.push(
          new ImageItem({
            src: images,
            thumb: images,
          }),
        );
      } else if (filetypes === "video") {
        galleryItems.push(
          new VideoItem({
            src: images,
            thumb: images,
            autoplay: true,
            loop: true,
          }),
        );
      }
    }

    const lightboxRef = this.gallery.ref("lightbox");
    lightboxRef.setConfig({
      imageSize: ImageSize.Contain,
      thumb: false,
      counter: false,
    });
    lightboxRef.load(galleryItems);
    this.lightbox.open(0, "lightbox", {
      panelClass: "shop-lightbox-panel",
    });
  }

  /**
   * Track by function for ngFor loops
   *
   * @param index
   * @param item
   */
  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
