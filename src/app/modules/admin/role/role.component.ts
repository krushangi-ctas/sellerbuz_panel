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
import { Role } from "app/core/manage-role/role.model";
import { RoleService } from "app/core/manage-role/role.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import { Observable, Subject, debounceTime, map, merge, switchMap } from "rxjs";

@Component({
  standalone: false,
  selector: "app-role",
  templateUrl: "./role.component.html",
  styleUrls: ["./role.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;
  btnDisable: boolean = false;

  tooltip = Constants.roleDetails;
  isLoading: boolean = false;
  pagination: Pagination;
  searchInputControl: FormControl = new FormControl();
  roleFormInput: Observable<Role[]>;
  isSuperAdmin: boolean;
  permission: any;
  tmpQry: any = "";
  filterQry: any = {};
  searchValue: any = "";
  roleSearchFromGroup: FormGroup;
  removeRoleConfirm: FormGroup;
  toggleRoleStatusConfirm: FormGroup;
  pageLimit: number = Constants.pageLimit;
  pageOptions: number[] = Constants.pageOptions;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  premisesUser: boolean = false;

  permissionGuard: any = {};
  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _roleService: RoleService,
    private _router: Router,
    private _fuseAlertService: FuseAlertService,
    private _confirmationService: FuseConfirmationService,
    private _formBuilder: FormBuilder,
    private _alertService: AlertService,
    private _navigationService: NavigationService,
  ) {
    if (
      this._navigationService.isSuperAdmin ||
      this._navigationService.isPremisesUser
    ) {
      this.isSuperAdmin = this._navigationService.isSuperAdmin;
      this.premisesUser = this._navigationService.isPremisesUser;
      this;
    } else {
      this._router.navigate(["/404-not-found"]);
    }
  }

  ngOnInit(): void {
    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (
          data &&
          data?.permissions &&
          Array.isArray(data?.permissions) &&
          data?.permissions.find((item: any) => item?.section_name === "Role")
        ) {
          this.permissionGuard = data?.permissions.find(
            (item) => item?.section_name === "Role",
          );
        }
      });
    this.removeRoleConfirm = this._formBuilder.group({
      title: "Remove Role",
      message: "Are you sure you want to remove Role permission permanently?",
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
      title: "Change Role Status",
      message: "Are you sure you want to change status of Role?",
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

    // Get the pagination
    this._roleService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        // Update the pagination
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });

    // Get the roles
    this.roleFormInput = this._roleService.roles$;
    this._roleService
      .getRoles()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    // Subscribe to search input field value changes
    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.tmpQry = query ? query.trim() : "";
          this.isLoading = true;
          return this._roleService.getRoles(
            1,
            getPageSize(this._paginators?.first),
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
          return this._roleService.getRoles(
            1,
            getPageSize(this._paginators?.first),
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
    return this._roleService
      .getRoles(
        1,
        getPageSize(this._paginators?.first),
        "createdAt",
        "desc",
        this.tmpQry,
        this.filterQry,
      )
      .pipe(
        takeUntil(this._unsubscribeAll),
        map(() => {
          this.roleFormInput = this._roleService.roles$;
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
          takeUntil(this._unsubscribeAll),
          switchMap(() => {
            this.isLoading = true;
            this._changeDetectorRef.markForCheck();
            const page = (this._paginators?.first?.pageIndex ?? 0) + 1;
            const size = getPageSize(this._paginators?.first);
            return this._roleService.getRoles(
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
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  addRole(): void {
    this._router.navigate(["master/manage-role/add"]);
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
    // Subscribe to afterClosed from the dialog reference
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          // Delete the role from the DB
          this._roleService
            .deleteRole(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.getRoles();
                this._alertService.message =
                  "Role has been deleted successfully!";
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
          this.getRoles();
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  toggleRoleStatus(id, event): void {
    const dialogRef = this._confirmationService.open(
      this.toggleRoleStatusConfirm.value,
    );
    // Subscribe to afterClosed from the dialog reference
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._roleService
            .updateRoleStatus(id, { status: event.checked ? 1 : 0 })
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.getRoles();
                this._alertService.message =
                  "Role status has been changed successfully!";
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

  refresh() {
    this.searchInputControl.setValue("");
    this.roleSearchFromGroup.get("status")?.setValue("");
  }
}
