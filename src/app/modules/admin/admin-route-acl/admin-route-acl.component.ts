import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Router } from "@angular/router";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { FuseAlertService } from "@fuse/components/alert";
import { AlertService } from "app/core/alert/alert.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { RouteAclService } from "app/core/route-acl/route-acl.service";
import {
  RouteAclMapping,
  RouteAclScope,
} from "app/core/route-acl/route-acl.types";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import {
  Observable,
  Subject,
  debounceTime,
  map,
  merge,
  switchMap,
  takeUntil,
} from "rxjs";

@Component({
  standalone: false,
  selector: "app-admin-route-acl",
  templateUrl: "./admin-route-acl.component.html",
  styleUrls: ["./admin-route-acl.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRouteAclListComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;

  isLoading = false;
  pagination: Pagination;
  searchInputControl: FormControl = new FormControl();
  mappings$: Observable<RouteAclMapping[]>;
  removeConfirm: FormGroup;
  tmpQry = "";
  pageLimit = Constants.pageLimit;
  pageOptions = Constants.pageOptions;
  tooltip: string = Constants.adminApiAccessDetails;
  activeScope: RouteAclScope = "admin";
  private _unsubscribeAll = new Subject<void>();

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _routeAclService: RouteAclService,
    private _router: Router,
    private _confirmationService: FuseConfirmationService,
    private _formBuilder: FormBuilder,
    private _alertService: AlertService,
    private _fuseAlertService: FuseAlertService,
    private _navigationService: NavigationService,
  ) {
    if (
      !this._navigationService.isSuperAdmin &&
      !this._navigationService.isDeveloper
    ) {
      this._router.navigate(["/404-not-found"]);
    }
  }

  ngOnInit(): void {
    this.removeConfirm = this._formBuilder.group({
      title: "Remove admin mapping",
      message: "Remove this admin API route ACL mapping permanently?",
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

    this.mappings$ = this._routeAclService.mappings$;
    this._routeAclService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination) => {
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });

    this.isLoading = true;
    this._routeAclService
      .getMappings(1, this.pageLimit, "createdAt", "desc", "", {
        scope: this.activeScope,
      })
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.isLoading = false;
        this._changeDetectorRef.markForCheck();
      });

    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.tmpQry = (query || "").trim();
          this.isLoading = true;
          this._changeDetectorRef.markForCheck();
          return this._routeAclService.getMappings(
            1,
            getPageSize(this._paginators?.first),
            this._sort?.active || "createdAt",
            (this._sort?.direction as "asc" | "desc") || "desc",
            this.tmpQry,
            {
              scope: this.activeScope,
            },
          );
        }),
        map(() => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe();
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
            this._changeDetectorRef.markForCheck();
            const page = (this._paginators?.first?.pageIndex ?? 0) + 1;
            const size = getPageSize(this._paginators?.first);
            return this._routeAclService.getMappings(
              page,
              size,
              this._sort?.active || "createdAt",
              (this._sort?.direction as "asc" | "desc") || "desc",
              this.tmpQry,
              {
                scope: this.activeScope,
              },
            );
          }),
          map(() => {
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
          }),
          takeUntil(this._unsubscribeAll),
        )
        .subscribe();
    }
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  reload(): void {
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();
    this._routeAclService
      .getMappings(
        (this._paginators?.first?.pageIndex || 0) + 1,
        getPageSize(this._paginators?.first),
        this._sort?.active || "createdAt",
        (this._sort?.direction as "asc" | "desc") || "desc",
        this.tmpQry,
        {
          scope: this.activeScope,
        },
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.isLoading = false;
        this._changeDetectorRef.markForCheck();
      });
  }

  refresh(): void {
    this.searchInputControl.setValue("");
    this.reload();
  }

  addMapping(): void {
    this._router.navigate(["/master/admin-route-acl/add"]);
  }

  editMapping(row: RouteAclMapping): void {
    const id = row.id || row._id;
    this._router.navigate(["/master/admin-route-acl/edit", id]);
  }

  deleteMapping(row: RouteAclMapping): void {
    const dialogRef = this._confirmationService.open(this.removeConfirm.value);
    dialogRef.afterClosed().subscribe((result) => {
      if (result !== "confirmed") {
        return;
      }
      const id = row.id || row._id;
      this._routeAclService.deleteMapping(String(id)).subscribe({
        next: () => {
          this._alertService.message = "Mapping removed successfully.";
          this._fuseAlertService.show("alert_success");
          setTimeout(
            () => this._fuseAlertService.dismiss("alert_success"),
            2500,
          );
          this.reload();
        },
        error: (err) => {
          this._alertService.message = err?.message || "Delete failed";
          this._fuseAlertService.show("alert_error");
          setTimeout(() => this._fuseAlertService.dismiss("alert_error"), 2500);
        },
      });
    });
  }

  trackByFn(index: number, item: RouteAclMapping): any {
    return item.id || item._id || index;
  }
}
