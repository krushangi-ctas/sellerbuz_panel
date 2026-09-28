import { takeUntil } from "rxjs";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Router } from "@angular/router";
import { FuseAlertService } from "@fuse/components/alert";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { AlertService } from "app/core/alert/alert.service";
import { Coupon } from "app/core/coupon/coupon.model";
import { CouponService } from "app/core/coupon/coupon.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { Constants } from "app/shared/constants";

import { merge } from "lodash";
import {
  Observable,
  Subject,
  debounceTime,
  finalize,
  map,
  switchMap,
} from "rxjs";

@Component({
  standalone: false,
  selector: "app-coupon-list",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatPaginator) private _paginator: MatPaginator;
  @ViewChild(MatSort) private _sort: MatSort;
  isLoading: boolean = false;
  pagination: Pagination;
  searchInputControl: FormControl = new FormControl();
  coupons$: Observable<Coupon[]>;
  isSuperAdmin: boolean;
  permissionGuard: any = {};
  couponSearchForm: FormGroup;
  removeCouponConfirm: FormGroup;
  revokeCouponConfirm: FormGroup;
  activateCouponConfirm: FormGroup;
  pageLimit: number = Constants.pageLimit;
  pageOptions: number[] = Constants.pageOptions;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  startDate: FormControl = new FormControl("");
  endDate: FormControl = new FormControl("");
  maxDate: Date = new Date();
  isResetDate: boolean = false;
  tmpQry: string = "";
  filterQry: any = {};
  impersonatePageId: string | null = null;

  tooltip = Constants.couponDetails;

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _couponService: CouponService,
    private _router: Router,
    private _fuseAlertService: FuseAlertService,
    private _confirmationService: FuseConfirmationService,
    private _formBuilder: FormBuilder,
    private _alertService: AlertService,
    private _navigationService: NavigationService,
    private _userSessionService: UserSessionsService,
  ) {
    if (
      this._navigationService.isSuperAdmin ||
      this._navigationService.isPremisesUser
    ) {
      this.isSuperAdmin = this._navigationService.isSuperAdmin;
    } else {
      this._router.navigate(["/404-not-found"]);
    }
  }

  ngOnInit(): void {
    this._userSessionService.currentSellerId$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((sellerId) => {
        this.impersonatePageId = sellerId;
      });

    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (
          data &&
          data?.permissions &&
          Array.isArray(data?.permissions) &&
          data?.permissions.find((item: any) => item?.section_name === "Coupon")
        ) {
          this.permissionGuard = data?.permissions.find(
            (item) => item?.section_name === "Coupon",
          );
        }
      });

    // Confirmation dialogs
    this.removeCouponConfirm = this._formBuilder.group({
      title: "Delete Coupon",
      message: "Are you sure you want to delete this coupon permanently?",
      icon: this._formBuilder.group({
        show: true,
        name: "heroicons_outline:exclamation",
        color: "warn",
      }),
      actions: this._formBuilder.group({
        confirm: this._formBuilder.group({
          show: true,
          label: "Delete",
          color: "warn",
        }),
        cancel: this._formBuilder.group({
          show: true,
          label: "Cancel",
        }),
      }),
      dismissible: true,
    });

    this.revokeCouponConfirm = this._formBuilder.group({
      title: "Revoke Coupon",
      message:
        "Are you sure you want to revoke this coupon? This action cannot be undone.",
      icon: this._formBuilder.group({
        show: true,
        name: "heroicons_outline:exclamation",
        color: "warn",
      }),
      actions: this._formBuilder.group({
        confirm: this._formBuilder.group({
          show: true,
          label: "Revoke",
          color: "warn",
        }),
        cancel: this._formBuilder.group({
          show: true,
          label: "Cancel",
        }),
      }),
      dismissible: true,
    });

    this.activateCouponConfirm = this._formBuilder.group({
      title: "Activate Coupon",
      message: "Are you sure you want to activate this coupon?",
      icon: this._formBuilder.group({
        show: true,
        name: "heroicons_outline:check-circle",
        color: "primary",
      }),
      actions: this._formBuilder.group({
        confirm: this._formBuilder.group({
          show: true,
          label: "Activate",
          color: "primary",
        }),
        cancel: this._formBuilder.group({
          show: true,
          label: "Cancel",
        }),
      }),
      dismissible: true,
    });

    this.couponSearchForm = this._formBuilder.group({
      type: [""],
      status: [""],
    });

    // Get the pagination
    this._couponService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });

    // Get the coupons
    this.coupons$ = this._couponService.coupons$;
    this._couponService
      .getCoupons()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    // Subscribe to search input changes
    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.tmpQry = query?.trim() || "";
          this.isLoading = true;
          return this._couponService.getCoupons(
            1,
            this._paginator?.pageSize || this.pageLimit,
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

    // Subscribe to filter changes
    this.couponSearchForm.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.filterQry = { ...this.filterQry, ...query };
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
            this.filterQry["startDate"] = tmpStart;
            this.filterQry["endDate"] = tmpEnd;
          }
          this.isLoading = true;
          return this._couponService.getCoupons(
            1,
            this._paginator?.pageSize || this.pageLimit,
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

  getCoupons(): void {
    this.tmpQry = this.searchInputControl.value || "";
    this.filterQry = {
      ...(this.couponSearchForm.value || {}),
      ...(this.filterQry?.startDate
        ? { startDate: this.filterQry.startDate }
        : {}),
      ...(this.filterQry?.endDate ? { endDate: this.filterQry.endDate } : {}),
    };
    this._couponService
      .getCoupons(
        1,
        this._paginator?.pageSize || this.pageLimit,
        "createdAt",
        "desc",
        this.tmpQry,
        this.filterQry,
      )
      .pipe(
        takeUntil(this._unsubscribeAll),
        map(() => {
          this.coupons$ = this._couponService.coupons$;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  ngAfterViewInit(): void {
    if (this._sort && this._paginator) {
      // Mark for check
      this._changeDetectorRef.markForCheck();

      // Reset paginator when sorting changes
      this._sort.sortChange
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          this._paginator.pageIndex = 0;
        });

      // Reload data when sort or page changes
      merge(this._sort.sortChange, this._paginator.page)
        .pipe(
          takeUntil(this._unsubscribeAll),
          switchMap(() => {
            this.isLoading = true;

            return this._couponService.getCoupons(
              this._paginator.pageIndex + 1,
              this._paginator.pageSize,
              this._sort.active || "createdAt",
              this._sort.direction || "desc",
              this.tmpQry,
              this.filterQry,
            );
          }),
          finalize(() => {
            this.isLoading = false;
          }),
        )
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe();
    }
  }

  onPageChange(event: PageEvent): void {
    this.isLoading = true;
    this._couponService
      .getCoupons(
        event.pageIndex + 1,
        event.pageSize,
        this._sort?.active || "createdAt",
        this._sort?.direction || "desc",
        this.tmpQry,
        this.filterQry,
      )
      .pipe(
        takeUntil(this._unsubscribeAll),
        map(() => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  addCoupon(): void {
    this._router.navigate(["master/coupon/add"]);
  }

  editCoupon(id: string): void {
    this._router.navigate(["/master/coupon/edit", id]);
  }

  deleteCoupon(id: string): void {
    const dialogRef = this._confirmationService.open(
      this.removeCouponConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._couponService
            .deleteCoupon(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.getCoupons();
                this._alertService.message =
                  "Coupon has been deleted successfully!";
                this._fuseAlertService.show("alert_success");
                setTimeout(() => {
                  this._fuseAlertService.dismiss("alert_success");
                }, 2500);
                this._changeDetectorRef.markForCheck();
              },
              ({ error }) => {
                this._alertService.message =
                  error?.message || "Failed to delete coupon";
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

  revokeCoupon(id: string): void {
    const dialogRef = this._confirmationService.open(
      this.revokeCouponConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._couponService
            .revokeCoupon(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.getCoupons();
                this._alertService.message =
                  "Coupon has been revoked successfully!";
                this._fuseAlertService.show("alert_success");
                setTimeout(() => {
                  this._fuseAlertService.dismiss("alert_success");
                }, 2500);
                this._changeDetectorRef.markForCheck();
              },
              ({ error }) => {
                this._alertService.message =
                  error?.message || "Failed to revoke coupon";
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

  activateCoupon(id: string): void {
    const dialogRef = this._confirmationService.open(
      this.activateCouponConfirm.value,
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._couponService
            .activateCoupon(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.getCoupons();
                this._alertService.message =
                  "Coupon has been activated successfully!";
                this._fuseAlertService.show("alert_success");
                setTimeout(() => {
                  this._fuseAlertService.dismiss("alert_success");
                }, 2500);
                this._changeDetectorRef.markForCheck();
              },
              ({ error }) => {
                this._alertService.message =
                  error?.message || "Failed to activate coupon";
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

  get canAdd(): boolean {
    if (this.isSuperAdmin) return true;
    if (this.permissionGuard && "add" in this.permissionGuard) {
      return Boolean(this.permissionGuard?.["add"]);
    }
    return true;
  }

  get canUpdate(): boolean {
    if (this.isSuperAdmin) return true;
    if (this.permissionGuard && "update" in this.permissionGuard) {
      return Boolean(this.permissionGuard?.["update"]);
    }
    return true;
  }

  get canDelete(): boolean {
    if (this.isSuperAdmin) return true;
    if (this.permissionGuard && "delete" in this.permissionGuard) {
      return Boolean(this.permissionGuard?.["delete"]);
    }
    return true;
  }

  getStatusLabel(status: number): string {
    const labels: { [key: number]: string } = {
      0: "Inactive",
      1: "Active",
      2: "Expired",
      3: "Revoked",
    };
    return labels[status] || "Unknown";
  }

  getStatusColor(status: number): string {
    const colors: { [key: number]: string } = {
      0: "gray",
      1: "green",
      2: "orange",
      3: "red",
    };
    return colors[status] || "gray";
  }

  getDiscountDisplay(coupon: Coupon): string {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}%`;
    }
    return `${coupon.currency} ${coupon.discount_value}`;
  }

  getPlansDisplay(plans: any[]): string {
    if (!plans || !Array.isArray(plans) || plans.length === 0) {
      return "-";
    }
    return plans.map((p) => (typeof p === "object" ? p.name : p)).join(", ");
  }

  getSellersDisplay(sellers: any[]): string {
    if (!sellers || !Array.isArray(sellers) || sellers.length === 0) {
      return "-";
    }
    return sellers
      .map((s) => (typeof s === "object" ? s.full_name || s.name : s))
      .join(", ");
  }

  trackByFn(index: number, item: any): any {
    return item._id || index;
  }

  refresh(): void {
    this.searchInputControl.setValue("");
    this.startDate.setValue("");
    this.endDate.setValue("");
    delete this.filterQry["startDate"];
    delete this.filterQry["endDate"];
    this.isResetDate = false;
    this.couponSearchForm.reset({
      type: "",
      status: "",
    });
    this.getCoupons();
  }

  clearDate(): void {
    this.startDate.setValue("");
    this.endDate.setValue("");
    delete this.filterQry["startDate"];
    delete this.filterQry["endDate"];
    this.isResetDate = false;
    this.getCoupons();
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
      this.filterQry["startDate"] = new Date(tmpStart);
      this.filterQry["endDate"] = new Date(tmpEnd);
      this.isResetDate = true;
    }
    this.getCoupons();
  }
}
