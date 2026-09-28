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
  ViewEncapsulation,
} from "@angular/core";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Router } from "@angular/router";
import {
  Observable,
  Subject,
  debounceTime,
  map,
  merge,
  switchMap,
  takeUntil,
} from "rxjs";
import { FuseUtilsService } from "@fuse/services/utils";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import {
  CronItem,
  CronManagementService,
} from "app/core/cron-management/cron-management.service";
import { DashbordService } from "app/core/dashbord/dashbord.service";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { NavigationService } from "app/core/navigation/navigation.service";

@Component({
  standalone: false,
  selector: "app-cron-management",
  templateUrl: "./cron-management.component.html",
  styleUrls: ["./cron-management.component.scss"],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CronManagementComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChildren(MatPaginator) private _paginators!: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort!: MatSort;

  tooltip: string = Constants.cronManagementDetails;

  isDeveloper: boolean = false;
  isSuperAdmin: boolean = false;
  isLogsMode: boolean = false;
  isLoading: boolean = false;

  // Developer Cron List state
  crons: CronItem[] = [];
  filteredCrons: CronItem[] = [];
  isLoadingCrons = false;

  // Search & Filters
  searchControl = new FormControl("");
  domainControl = new FormControl("all");
  domains: string[] = ["all", "Amazon", "Assets", "Subscription"];

  // Action Loading states per cron
  actionLoadingMap: { [cronName: string]: boolean } = {};

  // Delay Run Modal state
  delayModalCron: CronItem | null = null;
  delaySecondsControl = new FormControl<number | null>(null);
  delayErrorMessage: string = "";
  isSubmittingDelay: boolean = false;

  // Cron Logs state (Standard Role List pattern)
  cronLogs: any[] = [];
  cronTotalResults: number = 0;
  cronTotalPages: number = 1;
  cronMaxDate = new Date();

  searchInputControl: FormControl = new FormControl("");
  cronSearchFormGroup!: FormGroup;
  tmpQry: any = "";
  filterQry: any = {};

  private readonly _unsubscribeAll = new Subject<any>();

  constructor(
    private readonly _cronService: CronManagementService,
    private readonly _dashboardService: DashbordService,
    private readonly _utilService: FuseUtilsService,
    private readonly _changeDetectorRef: ChangeDetectorRef,
    private readonly _localStorageService: LocalStorageService,
    private readonly _navigationService: NavigationService,
    private readonly _router: Router,
    private readonly _formBuilder: FormBuilder,
  ) {
    const currentUser = this._localStorageService.getItem("user");
    this.isDeveloper = !!(
      currentUser?.isDeveloper ?? this._navigationService.isDeveloper
    );
    this.isSuperAdmin = !!(
      currentUser?.isSuperAdmin ||
      currentUser?.isPremisesUser ||
      this._navigationService.isSuperAdmin
    );

    const currentUrl = this._router.url;
    if (currentUrl.includes("/cron-logs")) {
      this.isLogsMode = true;
    } else if (currentUrl.includes("/cron-management")) {
      this.isLogsMode = false;
    } else {
      this.isLogsMode = !this.isDeveloper;
    }

    this.tooltip = this.isLogsMode
      ? Constants.cronLogsDetails
      : Constants.cronManagementDetails;
  }

  ngOnInit(): void {
    if (!this.isLogsMode) {
      this.loadCrons();

      this.searchControl.valueChanges
        .pipe(debounceTime(200), takeUntil(this._unsubscribeAll))
        .subscribe(() => this.filterCrons());

      this.domainControl.valueChanges
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => this.filterCrons());
    } else {
      this.cronSearchFormGroup = this._formBuilder.group({
        status: [""],
        cronTime: [""],
        startDate: [""],
        endDate: [""],
      });

      // Initial fetch
      this.getCronLogs().pipe(takeUntil(this._unsubscribeAll)).subscribe();

      // Subscribe to search input field value changes (Role List pattern)
      this.searchInputControl.valueChanges
        .pipe(
          takeUntil(this._unsubscribeAll),
          debounceTime(300),
          switchMap((query) => {
            this.tmpQry = query ? query.trim() : "";
            if (this._paginators?.first) {
              this._paginators.first.pageIndex = 0;
            }
            return this.getCronLogs(
              1,
              getPageSize(this._paginators?.first),
              this._sort?.active || "startTime",
              this._sort?.direction || "desc",
              this.tmpQry,
              this.filterQry,
            );
          }),
        )
        .subscribe();

      // Subscribe to filter form changes (Role List pattern)
      this.cronSearchFormGroup.valueChanges
        .pipe(
          takeUntil(this._unsubscribeAll),
          debounceTime(300),
          switchMap((query) => {
            this.filterQry = query || {};
            if (this._paginators?.first) {
              this._paginators.first.pageIndex = 0;
            }
            return this.getCronLogs(
              1,
              getPageSize(this._paginators?.first),
              this._sort?.active || "startTime",
              this._sort?.direction || "desc",
              this.tmpQry,
              this.filterQry,
            );
          }),
        )
        .subscribe();
    }
  }

  ngAfterViewInit(): void {
    if (this.isLogsMode && this._paginators) {
      this._paginators.changes
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          this.setupSortAndPagination();
        });
      this.setupSortAndPagination();
    }
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
            const page = (this._paginators?.first?.pageIndex ?? 0) + 1;
            const size = getPageSize(this._paginators?.first);
            return this.getCronLogs(
              page,
              size,
              this._sort?.active || "startTime",
              this._sort?.direction || "desc",
              this.tmpQry,
              this.filterQry,
            );
          }),
        )
        .subscribe();
    }
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  /**
   * Fetch Cron Execution Logs (Role List getRoles pattern)
   */
  getCronLogs(
    page: number = (this._paginators?.first?.pageIndex ?? 0) + 1,
    limit: number = getPageSize(this._paginators?.first),
    sort: string = this._sort?.active || "startTime",
    order: string = this._sort?.direction || "desc",
    search: string = this.tmpQry,
    filter: any = this.filterQry,
  ): Observable<any> {
    this.isLoading = true;
    this._changeDetectorRef.markForCheck();

    const params: any = {
      page: page.toString(),
      limit: limit.toString(),
      sortBy: `${sort}:${order}`,
    };

    if (search && search.trim()) {
      params.search = search.trim();
    }
    if (filter?.status && filter.status !== "all" && filter.status !== "") {
      params.status = filter.status;
    }
    if (
      filter?.cronTime &&
      filter.cronTime !== "all" &&
      filter.cronTime !== ""
    ) {
      params.cronTime = filter.cronTime;
    }
    if (filter?.startDate && filter?.endDate) {
      const tmpStart = new Date(filter.startDate);
      tmpStart.setHours(0, 0, 0, 0);
      const tmpEnd = new Date(filter.endDate);
      tmpEnd.setHours(23, 59, 59, 999);
      params.startDate = tmpStart.toISOString();
      params.endDate = tmpEnd.toISOString();
    }

    return this._dashboardService.getCronLogs(params).pipe(
      takeUntil(this._unsubscribeAll),
      map((response: any) => {
        this.isLoading = false;
        if (response.status === 200 && response.data) {
          this.cronLogs = response.data.results || [];
          this.cronTotalResults = response.data.totalResults || 0;
          this.cronTotalPages =
            response.data.totalPages ||
            Math.ceil(this.cronTotalResults / limit) ||
            1;
        } else {
          this.cronLogs = [];
          this.cronTotalResults = 0;
          this.cronTotalPages = 1;
        }
        this._changeDetectorRef.markForCheck();
      }),
    );
  }

  /**
   * Refresh all filters and reload (Role List refresh pattern)
   */
  refresh(): void {
    if (this.isLogsMode) {
      this.searchInputControl.setValue("");
      this.cronSearchFormGroup.reset({
        status: "",
        cronTime: "",
        startDate: "",
        endDate: "",
      });
      if (this._paginators?.first) {
        this._paginators.first.pageIndex = 0;
      }
      if (this._sort) {
        this._sort.active = "startTime";
        this._sort.direction = "desc";
      }
    } else {
      this.searchControl.setValue("", { emitEvent: false });
      this.domainControl.setValue("all", { emitEvent: false });
      this.loadCrons();
    }
  }

  clearCronDate(): void {
    this.cronSearchFormGroup.patchValue({
      startDate: "",
      endDate: "",
    });
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Developer Crons Methods
  // -----------------------------------------------------------------------------------------------------

  loadCrons(): void {
    this.isLoadingCrons = true;
    this._changeDetectorRef.markForCheck();

    this._cronService
      .getCronsList()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          this.crons = res?.data || [];
          this.filterCrons();
          this.isLoadingCrons = false;
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.isLoadingCrons = false;
          this._utilService.onError(
            err?.error?.message || "Failed to load crons.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  filterCrons(): void {
    const search = (this.searchControl.value || "").toLowerCase().trim();
    const selectedDomain = this.domainControl.value || "all";

    this.filteredCrons = this.crons.filter((cron) => {
      const matchesSearch =
        !search ||
        cron.display_name.toLowerCase().includes(search) ||
        cron.cron_name.toLowerCase().includes(search) ||
        cron.schedule.toLowerCase().includes(search);

      const matchesDomain =
        selectedDomain === "all" || cron.domain === selectedDomain;

      return matchesSearch && matchesDomain;
    });
    this._changeDetectorRef.markForCheck();
  }

  startCron(cron: CronItem): void {
    this.actionLoadingMap[cron.cron_name] = true;
    this._changeDetectorRef.markForCheck();

    this._cronService
      .startCron(cron.cron_name)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          this.actionLoadingMap[cron.cron_name] = false;
          this._utilService.onSuccess(
            res?.message || `${cron.display_name} started.`,
          );
          cron.enabled = true;
          this.loadCrons();
        },
        error: (err) => {
          this.actionLoadingMap[cron.cron_name] = false;
          this._utilService.onError(
            err?.error?.message || "Failed to start cron.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  stopCron(cron: CronItem): void {
    this.actionLoadingMap[cron.cron_name] = true;
    this._changeDetectorRef.markForCheck();

    this._cronService
      .stopCron(cron.cron_name)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          this.actionLoadingMap[cron.cron_name] = false;
          this._utilService.onSuccess(
            res?.message || `${cron.display_name} stopped.`,
          );
          cron.enabled = false;
          cron.running = false;
          this.loadCrons();
        },
        error: (err) => {
          this.actionLoadingMap[cron.cron_name] = false;
          this._utilService.onError(
            err?.error?.message || "Failed to stop cron.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  runCron(cron: CronItem): void {
    this.actionLoadingMap[cron.cron_name] = true;
    this._changeDetectorRef.markForCheck();

    this._cronService
      .runCron(cron.cron_name)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          this.actionLoadingMap[cron.cron_name] = false;
          this._utilService.onSuccess(
            res?.message || `${cron.display_name} triggered.`,
          );
          this.loadCrons();
        },
        error: (err) => {
          this.actionLoadingMap[cron.cron_name] = false;
          this._utilService.onError(
            err?.error?.message || "Failed to run cron.",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  openDelayModal(cron: CronItem): void {
    this.delayModalCron = cron;
    this.delaySecondsControl.setValue(null);
    this.delayErrorMessage = "";
    this.isSubmittingDelay = false;
    this._changeDetectorRef.markForCheck();
  }

  closeDelayModal(): void {
    this.delayModalCron = null;
    this.delaySecondsControl.setValue(null);
    this.delayErrorMessage = "";
    this.isSubmittingDelay = false;
    this._changeDetectorRef.markForCheck();
  }

  setQuickPreset(seconds: number): void {
    this.delaySecondsControl.setValue(seconds);
    this.delayErrorMessage = "";
    this._changeDetectorRef.markForCheck();
  }

  submitDelayedRun(): void {
    if (!this.delayModalCron) return;

    const rawValue = this.delaySecondsControl.value;
    const seconds =
      rawValue !== null && rawValue !== undefined ? Number(rawValue) : 0;

    if (!seconds || isNaN(seconds) || seconds <= 0) {
      this.delayErrorMessage =
        "Validation Error: Please enter a duration in seconds greater than 0.";
      this._changeDetectorRef.markForCheck();
      return;
    }

    this.delayErrorMessage = "";
    this.isSubmittingDelay = true;
    const cronName = this.delayModalCron.cron_name;
    const displayName = this.delayModalCron.display_name;
    this.actionLoadingMap[cronName] = true;
    this._changeDetectorRef.markForCheck();

    this._cronService
      .runCronAfterDelay(cronName, seconds)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          this.isSubmittingDelay = false;
          this.actionLoadingMap[cronName] = false;
          this._utilService.onSuccess(
            res?.message ||
              `${displayName} scheduled to run once in ${seconds} seconds.`,
          );
          this.closeDelayModal();
          this.loadCrons();
        },
        error: (err) => {
          this.isSubmittingDelay = false;
          this.actionLoadingMap[cronName] = false;
          const errMsg =
            err?.error?.message || "Failed to schedule delayed cron.";
          this.delayErrorMessage = errMsg;
          this._utilService.onError(errMsg);
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  getStatusBadgeClass(cron: CronItem): string {
    if (!cron.enabled)
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    if (cron.running)
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse";
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
  }

  getStatusText(cron: CronItem): string {
    if (!cron.enabled) return "Stopped / Disabled";
    if (cron.running) return "Running...";
    return "Active / Scheduled";
  }

  stopScrollingWheel(e: any): void {
    return e.target.blur();
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onDelayInputPaste(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData;
    const pastedText = clipboardData?.getData("text") || "";
    if (!/^\d+$/.test(pastedText)) {
      event.preventDefault();
    }
  }

  getRelativeTime(dateInput: any): string {
    if (!dateInput || dateInput === "-") return "-";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "-";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) {
      const futureMs = Math.abs(diffMs);
      const seconds = Math.floor(futureMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 60) return `in ${seconds}s`;
      if (minutes < 60) return `in ${minutes} min`;
      if (hours < 24) return `in ${hours} hr`;
      if (days === 1) return "Tomorrow";
      return `in ${days} days`;
    }

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }

  formatCronDate(dateInput: any): string {
    if (!dateInput) return "-";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || item?.title || index;
  }
}
