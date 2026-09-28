import { takeUntil } from "rxjs";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Router } from "@angular/router";
import { FuseAlertService } from "@fuse/components/alert";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { AlertService } from "app/core/alert/alert.service";
import { Plan } from "app/core/manage-plan/plan.model";
import { PlanService } from "app/core/manage-plan/plan.service";
import { Role } from "app/core/manage-role/role.model";
import { RoleService } from "app/core/manage-role/role.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Pagination } from "app/core/pagination/pagination.types";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import { PortalService } from "app/core/portal/portal.service";
import { Observable, Subject, debounceTime, map, merge, switchMap } from "rxjs";

@Component({
  standalone: false,
  selector: "app-plan",
  templateUrl: "./plan.component.html",
  styleUrls: ["./plan.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;
  @ViewChild("marketingFeaturePopup")
  marketingFeaturePopup: TemplateRef<any>;
  @ViewChild("featurePopup")
  featurePopup: TemplateRef<any>;
  btnDisable: boolean = false;

  tooltip = Constants.planDetails;
  isLoading: boolean = false;
  pagination: Pagination;
  searchInputControl: FormControl = new FormControl();
  planFormInput: Observable<Plan[]>;
  isSuperAdmin: boolean;
  permission: any;
  startDate: FormControl = new FormControl("");
  endDate: FormControl = new FormControl("");
  maxDate: Date = new Date();
  isResetDate: boolean = false;
  tmpQry: any = "";
  filterQry: any = {};
  searchValue: any = "";
  planSearchFromGroup: FormGroup;
  removePlanConfirm: FormGroup;
  togglePlanStatusConfirm: FormGroup;
  pageLimit: number = Constants.pageLimit;
  pageOptions: number[] = Constants.pageOptions;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  premisesUser: boolean = false;
  popupFeatureList: any = [];
  permissionGuard: any = {};
  shopList: any[] = [];
  selectedShop: string = "";
  showShopFilter: boolean = false;
  selectedFeatures: any[] = [];
  allFeatures: any[] = [];
  plans: any[] = [];
  marketingFeatures: string[] = [];

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _planService: PlanService,
    private _router: Router,
    private _fuseAlertService: FuseAlertService,
    private _confirmationService: FuseConfirmationService,
    private _formBuilder: FormBuilder,
    private _alertService: AlertService,
    private _navigationService: NavigationService,
    private _matDialog: MatDialog,
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
            (item) => item?.section_name === "Plan",
          );
        }
      });
    this._planService.features$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((features: any[]) => {
        if (features) {
          this.allFeatures = features;
        }
      });
    this._planService.plans$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((plans: any[]) => {
        this.plans = plans || [];
      });
    this._planService
      .getPlans()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
    this.removePlanConfirm = this._formBuilder.group({
      title: "Remove Plan",
      message: "Are you sure you want to remove Plan permission permanently?",
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

    this.planSearchFromGroup = this._formBuilder.group({
      status: [""],
      shop: [""],
    });

    this.togglePlanStatusConfirm = this._formBuilder.group({
      title: "Change Plan Status",
      message: "Are you sure you want to change status of Plan?",
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
    this._planService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        // Update the pagination
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });

    // Get the roles
    this.planFormInput = this._planService.plans$;

    // Subscribe to search input field value changes
    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.tmpQry = query ? query.trim() : "";
          this.isLoading = true;
          return this._planService.getPlans(
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

    this.planSearchFromGroup.valueChanges
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
          return this._planService.getPlans(
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

  getPlanes(): any {
    this.tmpQry = this.searchInputControl.value || "";
    this.filterQry = this.planSearchFromGroup.value || {};
    return this._planService
      .getPlans(
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
          this.planFormInput = this._planService.plans$;
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
            return this._planService.getPlans(
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
  closeDialog(): void {
    this._matDialog.closeAll();
    this.popupFeatureList = [];
  }

  CategoryDialogOpen(planId: string): void {
    const plan = this.plans.find((p) => p._id === planId);

    if (!plan) {
      return;
    }

    this.selectedFeatures = (plan.features || []).map((planFeature) => {
      const feature = this.allFeatures.find(
        (f) => String(f._id) === String(planFeature.feature_id),
      );

      return {
        feature_name: feature?.name || "Unknown Feature",
        usage_count: planFeature.usage_count,
      };
    });

    this._matDialog.open(this.featurePopup, {
      width: "800px",
      maxWidth: "95vw",
      panelClass: "feature-dialog",
    });
  }

  openMarketingFeatures(features: string[]): void {
    this.marketingFeatures = features;
    this._matDialog.open(this.marketingFeaturePopup, {
      width: "600px",
      maxWidth: "95vw",
      panelClass: "marketing-feature-dialog",
    });
  }

  refresh(): void {
    this.searchInputControl.setValue("");
    this.planSearchFromGroup.get("status")?.setValue("");
    this.planSearchFromGroup.get("shop")?.setValue("");
    this.startDate.setValue("");
    this.endDate.setValue("");
    delete this.filterQry["startDate"];
    delete this.filterQry["endDate"];
    this.isResetDate = false;
    this.getPlanes();
  }

  clearDate(): void {
    this.startDate.setValue("");
    this.endDate.setValue("");
    delete this.filterQry["startDate"];
    delete this.filterQry["endDate"];
    this.isResetDate = false;
    this.getPlanes();
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
    this.getPlanes();
  }

  addPlan(): void {
    this._router.navigate(["master/manage-plan/add"]);
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

  deleteSelectedPlan(id: string): void {
    const dialogRef = this._confirmationService.open(
      this.removePlanConfirm.value,
    );
    // Subscribe to afterClosed from the dialog reference
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          // Delete the role from the DB
          this._planService
            .deletePlan(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.getPlanes();
                this._alertService.message =
                  "Plan has been deleted successfully!";
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
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  togglePlanStatus(id: string, event: Record<string, any>): void {
    const dialogRef = this._confirmationService.open(
      this.togglePlanStatusConfirm.value,
    );
    // Subscribe to afterClosed from the dialog reference
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._planService
            .updatePlanStatus(id, { status: event.checked ? 1 : 0 })
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
              () => {
                this.getPlanes();
                this._alertService.message =
                  "Plan status has been changed successfully!";
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
    return item?._id || item?.id || index;
  }
}
