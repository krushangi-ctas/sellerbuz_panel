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
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { FuseAlertService } from "@fuse/components/alert";
import { AlertService } from "app/core/alert/alert.service";
import { FeatureService } from "app/core/feature/feature.service";
import { FeatureItem } from "app/core/feature/feature.types";
import { FeatureDialogComponent } from "./feature-dialog/feature-dialog.component";
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
  selector: "app-features",
  templateUrl: "./features.component.html",
  styleUrls: ["./features.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesListComponent implements OnInit, OnDestroy {
  private _featuresSort: MatSort;
  private _featuresPaginator: MatPaginator;
  private _featuresSortSub = new Subject<void>();

  @ViewChild("featuresSort") set featuresSort(sort: MatSort) {
    if (sort && sort !== this._featuresSort) {
      this._featuresSort = sort;
      this.setupFeaturesSortAndPaginator();
    }
  }

  @ViewChild("featuresPaginator") set featuresPaginator(
    paginator: MatPaginator,
  ) {
    if (paginator && paginator !== this._featuresPaginator) {
      this._featuresPaginator = paginator;
      this.setupFeaturesSortAndPaginator();
    }
  }

  userId = "";

  // Features State
  featuresIsLoading = false;
  featuresPagination: Pagination;
  featureSearchInputControl: FormControl = new FormControl("");
  featureStatusControl: FormControl = new FormControl("");
  features$: Observable<FeatureItem[] | null>;
  removeFeatureConfirm: FormGroup;

  pageLimit = Constants.pageLimit;
  pageOptions = Constants.pageOptions;
  tooltip: string = Constants.featureDetails;
  private _unsubscribeAll = new Subject<void>();

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _featureService: FeatureService,
    private _userService: UserService,
    private _matDialog: MatDialog,
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

    // Confirmation dialog form setup
    this.removeFeatureConfirm = this._formBuilder.group({
      title: "Delete Feature",
      message: "Are you sure you want to delete this feature permanently?",
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

    // Features Observables
    this.features$ = this._featureService.features$;
    this._featureService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination) => {
        if (pagination) {
          this.featuresPagination = pagination;
        }
        this._changeDetectorRef.markForCheck();
      });

    // Initial load
    this.loadFeatures();

    // Features Search & Status Filters
    this.featureSearchInputControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        if (this._featuresPaginator) {
          this._featuresPaginator.pageIndex = 0;
        }
        this.loadFeatures();
      });

    this.featureStatusControl.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        if (this._featuresPaginator) {
          this._featuresPaginator.pageIndex = 0;
        }
        this.loadFeatures();
      });
  }

  setupFeaturesSortAndPaginator(): void {
    if (!this._featuresSort || !this._featuresPaginator) {
      return;
    }
    this._featuresSortSub.next();

    this._featuresSort.sortChange
      .pipe(takeUntil(this._featuresSortSub), takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        if (this._featuresPaginator) {
          this._featuresPaginator.pageIndex = 0;
        }
      });

    merge(this._featuresSort.sortChange, this._featuresPaginator.page)
      .pipe(
        switchMap(() => {
          this.featuresIsLoading = true;
          this._changeDetectorRef.markForCheck();
          return this._featureService.getFeatures(
            (this._featuresPaginator?.pageIndex || 0) + 1,
            getPageSize(this._featuresPaginator),
            this._featuresSort?.active || "createdAt",
            (this._featuresSort?.direction as "asc" | "desc") || "desc",
            this.featureSearchInputControl.value || "",
            this.featureStatusControl.value,
          );
        }),
        map(() => {
          this.featuresIsLoading = false;
          this._changeDetectorRef.markForCheck();
        }),
        takeUntil(this._featuresSortSub),
        takeUntil(this._unsubscribeAll),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this._featuresSortSub.next();
    this._featuresSortSub.complete();
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  loadFeatures(): void {
    this.featuresIsLoading = true;
    this._changeDetectorRef.markForCheck();

    const page = (this._featuresPaginator?.pageIndex || 0) + 1;
    const limit = getPageSize(this._featuresPaginator) || this.pageLimit;
    const sort = this._featuresSort?.active || "createdAt";
    const order = (this._featuresSort?.direction as "asc" | "desc") || "desc";
    const search = this.featureSearchInputControl.value || "";
    const status = this.featureStatusControl.value;

    this._featureService
      .getFeatures(page, limit, sort, order, search, status)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: () => {
          this.featuresIsLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.featuresIsLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  refreshFeatures(): void {
    if (this._featuresPaginator) {
      this._featuresPaginator.pageIndex = 0;
    }
    this.featureSearchInputControl.setValue("", { emitEvent: false });
    this.featureStatusControl.setValue("", { emitEvent: false });
    this._changeDetectorRef.markForCheck();
    this.loadFeatures();
  }

  openAddFeatureDialog(): void {
    const dialogRef = this._matDialog.open(FeatureDialogComponent, {
      width: "600px",
      disableClose: true,
      data: {},
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.loadFeatures();
      }
    });
  }

  openEditFeatureDialog(row: FeatureItem): void {
    const dialogRef = this._matDialog.open(FeatureDialogComponent, {
      width: "600px",
      disableClose: true,
      data: { feature: row },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.loadFeatures();
      }
    });
  }

  deleteFeature(row: FeatureItem): void {
    const dialogRef = this._confirmationService.open(
      this.removeFeatureConfirm.value,
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result !== "confirmed") {
        return;
      }
      this._featureService.deleteFeature(row._id, this.userId).subscribe({
        next: (res: any) => {
          if (res?.status === 200) {
            this._alertService.message =
              res?.message || "Feature deleted successfully.";
            this._fuseAlertService.show("alert_success");
            setTimeout(
              () => this._fuseAlertService.dismiss("alert_success"),
              2500,
            );
            this.loadFeatures();
          } else {
            this._alertService.message =
              res?.message || "Failed to delete feature.";
            this._fuseAlertService.show("alert_error");
            setTimeout(
              () => this._fuseAlertService.dismiss("alert_error"),
              2500,
            );
          }
        },
        error: (err: any) => {
          this._alertService.message =
            err?.error?.message || "Error deleting feature.";
          this._fuseAlertService.show("alert_error");
          setTimeout(() => this._fuseAlertService.dismiss("alert_error"), 2500);
        },
      });
    });
  }

  trackByFeatureFn(index: number, item: FeatureItem): any {
    return item._id || index;
  }
}
