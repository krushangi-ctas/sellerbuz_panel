import { takeUntil } from "rxjs";
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
import { FuseAlertService } from "@fuse/components/alert";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { AlertService } from "app/core/alert/alert.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { SellerRole } from "app/core/seller-role/seller-role.model";
import { SellerRoleService } from "app/core/seller-role/seller-role.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import { Observable, Subject, debounceTime, map, merge, switchMap } from "rxjs";

@Component({
  standalone: false,
  selector: "app-seller-role",
  templateUrl: "./seller-role.component.html",
  styleUrls: ["./seller-role.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerRoleListComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;

  get _paginator(): MatPaginator {
    return this._paginators?.first;
  }

  tooltip = Constants.sellerRoleDetails;
  isLoading: boolean = false;
  pagination: Pagination;
  searchInputControl: FormControl = new FormControl();
  roleFormInput: Observable<SellerRole[]>;
  tmpQry: any = "";
  filterQry: any = {};
  roleSearchFromGroup: FormGroup;
  removeRoleConfirm: FormGroup;
  toggleRoleStatusConfirm: FormGroup;
  pageLimit: number = Constants.pageLimit;
  permissionGuard: any = {};
  isSuperAdmin: boolean = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _sellerRoleService: SellerRoleService,
    private _router: Router,
    private _fuseAlertService: FuseAlertService,
    private _confirmationService: FuseConfirmationService,
    private _formBuilder: FormBuilder,
    private _alertService: AlertService,
    private _navigationService: NavigationService,
    private _userSessionService: UserSessionsService,
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this._navigationService.isSuperAdmin;
    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.permissionGuard = this._navigationService.getPermissionByRoute(
          data,
          this._router.url,
        );
      });

    this.removeRoleConfirm = this._formBuilder.group({
      title: "Remove Seller Role",
      message:
        "Are you sure you want to remove seller role permission permanently?",
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

    this.roleSearchFromGroup = this._formBuilder.group({
      status: [""],
    });

    this.toggleRoleStatusConfirm = this._formBuilder.group({
      title: "Change Seller Role Status",
      message: "Are you sure you want to change status of seller role?",
      icon: this._formBuilder.group({
        show: true,
        name: "heroicons_outline:exclamation",
        color: "warn",
      }),
      actions: this._formBuilder.group({
        confirm: this._formBuilder.group({
          show: true,
          label: "Change Status",
          color: "warn",
        }),
        cancel: this._formBuilder.group({
          show: true,
          label: "Cancel",
        }),
      }),
      dismissible: true,
    });

    this._sellerRoleService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });

    this.roleFormInput = this._sellerRoleService.roles$;
    this._sellerRoleService
      .getSellerRoles()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.tmpQry = query?.trim?.() || "";
          this.isLoading = true;
          return this._sellerRoleService.getSellerRoles(
            1,
            getPageSize(this._paginator),
            "createdAt",
            "desc",
            this.tmpQry,
            this.filterQry,
          );
        }),
        map(() => {
          this.isLoading = false;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    this.roleSearchFromGroup.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.filterQry = query;
          this.isLoading = true;
          return this._sellerRoleService.getSellerRoles(
            1,
            getPageSize(this._paginator),
            "createdAt",
            "desc",
            this.tmpQry,
            this.filterQry,
          );
        }),
        map(() => {
          this.isLoading = false;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  getRoles(): any {
    this.tmpQry = this.searchInputControl.value || "";
    this.filterQry = this.roleSearchFromGroup.value || {};
    return this._sellerRoleService
      .getSellerRoles(
        1,
        getPageSize(this._paginator),
        "createdAt",
        "desc",
        this.tmpQry,
        this.filterQry,
      )
      .pipe(
        takeUntil(this._unsubscribeAll),
        map(() => {
          this.roleFormInput = this._sellerRoleService.roles$;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
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
            const page = (this._paginators?.first?.pageIndex ?? 0) + 1;
            const size = getPageSize(this._paginators?.first);
            return this._sellerRoleService.getSellerRoles(
              page,
              size,
              this._sort?.active || "createdAt",
              this._sort?.direction || "desc",
              this.tmpQry,
              this.filterQry,
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

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  addRole(): void {
    const sellerId = this._userSessionService.getCurrentSellerId();
    if (sellerId) {
      // Seller login
      this._router.navigate(["/", sellerId, "master", "seller-role", "add"]);
    } else {
      // Admin login
      this._router.navigate(["/master", "seller-role", "add"]);
    }
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

  get canUpdate(): boolean {
    return this.checkPermission("update");
  }

  get canDelete(): boolean {
    return this.checkPermission("delete");
  }

  get canAdd(): boolean {
    return this.checkPermission("add");
  }

  deleteSelectedRole(id: string): void {
    const dialogRef = this._confirmationService.open(
      this.removeRoleConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._sellerRoleService
            .deleteSellerRole(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.getRoles();
                this._alertService.message =
                  "Seller role has been deleted successfully!";
                this._fuseAlertService.show("alert_success");
                setTimeout(() => {
                  this._fuseAlertService.dismiss("alert_success");
                }, 2500);
                this._changeDetectorRef.markForCheck();
              },
              ({ error }) => {
                this._alertService.message = error.message;
                this._fuseAlertService.show("alert_error");
                setTimeout(() => {
                  this._fuseAlertService.dismiss("alert_error");
                }, 2500);
                this._changeDetectorRef.markForCheck();
              },
            );
        }
      });
  }

  toggleRoleStatus(id: string, event: any): void {
    const dialogRef = this._confirmationService.open(
      this.toggleRoleStatusConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._sellerRoleService
            .updateSellerRoleStatus(id, { status: event.checked ? 1 : 0 })
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.getRoles();
                this._alertService.message =
                  "Seller role status has been changed successfully!";
                this._fuseAlertService.show("alert_success");
                setTimeout(() => {
                  this._fuseAlertService.dismiss("alert_success");
                }, 2500);
                this._changeDetectorRef.markForCheck();
              },
              ({ error }) => {
                this._alertService.message = error.message;
                this._fuseAlertService.show("alert_error");
                setTimeout(() => {
                  this._fuseAlertService.dismiss("alert_error");
                }, 2500);
                event.source.checked = !event.source.checked;
                this._changeDetectorRef.markForCheck();
              },
            );
        } else {
          event.source.checked = !event.source.checked;
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  trackByFn(index: number, item: any): any {
    return item._id || index;
  }

  refresh(): void {
    this.searchInputControl.setValue("");
    this.roleSearchFromGroup.get("status")?.setValue("");
  }
}
