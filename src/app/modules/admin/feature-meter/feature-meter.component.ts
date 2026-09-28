import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Router } from "@angular/router";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { FuseAlertService } from "@fuse/components/alert";
import { AlertService } from "app/core/alert/alert.service";
import { FeatureMeterService } from "app/core/feature-meter/feature-meter.service";
import {
  FeatureMeterMapping,
  UsageWindowSetting,
} from "app/core/feature-meter/feature-meter.types";
import { UserService } from "app/core/user/user.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Pagination } from "app/core/pagination/pagination.types";
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
  selector: "app-feature-meter",
  templateUrl: "./feature-meter.component.html",
  styleUrls: ["./feature-meter.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureMeterListComponent implements OnInit, OnDestroy {
  private _metersSort: MatSort;
  private _metersPaginator: MatPaginator;
  private _metersSortSub = new Subject<void>();

  @ViewChild("metersSort") set metersSort(sort: MatSort) {
    if (sort && sort !== this._metersSort) {
      this._metersSort = sort;
      this.setupMetersSortAndPaginator();
    }
  }

  @ViewChild("metersPaginator") set metersPaginator(paginator: MatPaginator) {
    if (paginator && paginator !== this._metersPaginator) {
      this._metersPaginator = paginator;
      this.setupMetersSortAndPaginator();
    }
  }

  userId = "";

  // Meter State
  isLoading = false;
  pagination: Pagination;
  searchInputControl: FormControl = new FormControl("");
  mappings$: Observable<FeatureMeterMapping[]>;
  filterForm: FormGroup;
  removeConfirm: FormGroup;
  windowSettingsForm: FormGroup;
  showWindowSettings = false;
  windowSettingsLoading = false;
  windowSettingsSaving = false;

  pageLimit = Constants.pageLimit;
  pageOptions = Constants.pageOptions;
  tooltip: string = Constants.featureMeterDetails;
  private _unsubscribeAll = new Subject<void>();

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _featureMeterService: FeatureMeterService,
    private _userService: UserService,
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
    // Current User ID
    this._userService.user$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((user: any) => {
        if (user?._id || user?.id) {
          this.userId = user._id || user.id;
        }
      });

    // Feature Meters setup
    this.filterForm = this._formBuilder.group({
      status: [""],
      count_mode: [""],
    });

    this.windowSettingsForm = this._formBuilder.group({
      enabled: [true],
      window_hours: [24],
      alert_threshold_percent: [90],
    });

    this.loadWindowSettings();

    this.removeConfirm = this._formBuilder.group({
      title: "Remove meter",
      message: "Remove this feature usage meter mapping permanently?",
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

    // Feature Meters Observables & Init
    this.mappings$ = this._featureMeterService.mappings$;
    this._featureMeterService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination) => {
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });

    this.reload();

    this.searchInputControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        if (this._metersPaginator) {
          this._metersPaginator.pageIndex = 0;
        }
        this.reload();
      });

    this.filterForm.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        if (this._metersPaginator) {
          this._metersPaginator.pageIndex = 0;
        }
        this.reload();
      });
  }

  setupMetersSortAndPaginator(): void {
    if (!this._metersSort || !this._metersPaginator) {
      return;
    }
    this._metersSortSub.next();

    this._metersSort.sortChange
      .pipe(takeUntil(this._metersSortSub), takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        if (this._metersPaginator) {
          this._metersPaginator.pageIndex = 0;
        }
      });

    merge(this._metersSort.sortChange, this._metersPaginator.page)
      .pipe(
        switchMap(() => {
          this.isLoading = true;
          this._changeDetectorRef.markForCheck();
          return this._featureMeterService.getMappings(
            (this._metersPaginator?.pageIndex || 0) + 1,
            getPageSize(this._metersPaginator),
            this._metersSort?.active || "createdAt",
            (this._metersSort?.direction as "asc" | "desc") || "desc",
            this.searchInputControl.value || "",
            this.filterForm.value,
          );
        }),
        map(() => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        }),
        takeUntil(this._metersSortSub),
        takeUntil(this._unsubscribeAll),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this._metersSortSub.next();
    this._metersSortSub.complete();
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  // --- Feature Usage Meters Methods ---
  toggleWindowSettings(): void {
    this.showWindowSettings = !this.showWindowSettings;
    if (this.showWindowSettings && !this.windowSettingsForm.dirty) {
      this.loadWindowSettings();
    }
  }

  loadWindowSettings(): void {
    this.windowSettingsLoading = true;
    this._changeDetectorRef.markForCheck();
    this._featureMeterService
      .getUsageWindowSettings()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          const s = (res?.data || {}) as Partial<UsageWindowSetting>;
          if (s.window_hours != null) {
            this.windowSettingsForm.patchValue({
              enabled: s.enabled,
              window_hours: s.window_hours,
              alert_threshold_percent: s.alert_threshold_percent,
            });
          }
          this.windowSettingsLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.windowSettingsLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  saveWindowSettings(): void {
    if (this.windowSettingsForm.invalid) {
      return;
    }
    this.windowSettingsSaving = true;
    this._changeDetectorRef.markForCheck();
    this._featureMeterService
      .updateUsageWindowSettings(this.windowSettingsForm.value)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: () => {
          this.windowSettingsSaving = false;
          this.windowSettingsForm.markAsPristine();
          this._alertService.message = "Window settings saved";
          this._fuseAlertService.show("alert_success");
          setTimeout(
            () => this._fuseAlertService.dismiss("alert_success"),
            2500,
          );
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.windowSettingsSaving = false;
          this._alertService.message = err?.message || "Save failed";
          this._fuseAlertService.show("alert_error");
          setTimeout(() => this._fuseAlertService.dismiss("alert_error"), 2500);
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  reload(): void {
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();
    this._featureMeterService
      .getMappings(
        (this._metersPaginator?.pageIndex || 0) + 1,
        getPageSize(this._metersPaginator) || this.pageLimit,
        this._metersSort?.active || "createdAt",
        (this._metersSort?.direction as "asc" | "desc") || "desc",
        this.searchInputControl.value || "",
        this.filterForm.value,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.isLoading = false;
        this._changeDetectorRef.markForCheck();
      });
  }

  refresh(): void {
    if (this._metersPaginator) {
      this._metersPaginator.pageIndex = 0;
    }
    this.searchInputControl.setValue("", { emitEvent: false });
    this.filterForm.patchValue(
      {
        status: "",
        count_mode: "",
      },
      { emitEvent: false },
    );
    this._changeDetectorRef.markForCheck();
    this.reload();
  }

  addMapping(): void {
    this._router.navigate(["/master/feature-meter/add"]);
    this._changeDetectorRef.markForCheck();
  }

  editMapping(row: FeatureMeterMapping): void {
    const id = row.id || row._id;
    this._router.navigate(["/master/feature-meter/edit", id]);
    this._changeDetectorRef.markForCheck();
  }

  deleteMapping(row: FeatureMeterMapping): void {
    const dialogRef = this._confirmationService.open(this.removeConfirm.value);
    dialogRef.afterClosed().subscribe((result) => {
      if (result !== "confirmed") {
        return;
      }
      const id = row.id || row._id;
      this._featureMeterService.deleteMapping(String(id)).subscribe({
        next: () => {
          this._alertService.message = "Meter removed";
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

  trackByFn(index: number, item: FeatureMeterMapping): any {
    return item.id || item._id || index;
  }
}
