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
import { FormControl, FormGroup, FormBuilder } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import {
  Observable,
  Subject,
  takeUntil,
  debounceTime,
  merge,
  switchMap,
  map,
} from "rxjs";
import { fuseAnimations } from "@fuse/animations";
import { FuseUtilsService } from "@fuse/services/utils";
import { UserService } from "app/core/user/user.service";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";

@Component({
  standalone: false,
  selector: "app-subscription-users",
  templateUrl: "./subscription-users.component.html",
  styleUrls: ["./subscription-users.component.scss"],
  animations: fuseAnimations,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionUsersComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild(MatSort) private _sort: MatSort;
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild("viewDataTemplate") viewDataTemplate: TemplateRef<any>;

  isLoading = false;
  subscriptions: any[] = [];
  totalCount = 0;
  selectedSub: any = null;

  page = 1;
  pageSize = Constants.pageLimit;
  pageSizeOptions = Constants.pageOptions;
  tooltip: string = Constants.subscriptionUsersDetails;

  searchControl = new FormControl("");
  filterForm: FormGroup;

  readonly headers: Record<string, string>[] = [
    { key: "Name", sortBy: "first_name" },
    { key: "Email", sortBy: "email" },
    { key: "Phone", sortBy: "contact_no" },
    { key: "Company", sortBy: "company_name" },
    { key: "Plan", sortBy: "plan_name" },
    { key: "Billing Cycle", sortBy: "billing_cycle" },
    { key: "Gateway", sortBy: "gateway" },
    { key: "Amount", sortBy: "amount" },
    { key: "Started", sortBy: "started_at" },
    { key: "Expiry", sortBy: "expired_at" },
    { key: "Status", sortBy: "status" },
    { key: "Actions" },
  ];

  private _unsubscribeAll: Subject<any> = new Subject<void>();

  constructor(
    private _userService: UserService,
    private _utilService: FuseUtilsService,
    private _fb: FormBuilder,
    private _cdr: ChangeDetectorRef,
    private _matDialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.filterForm = this._fb.group({
      status: [""],
      billing_cycle: [""],
      gateway: [""],
    });

    // Load initial data
    this._load();

    // React to search
    this.searchControl.valueChanges
      .pipe(debounceTime(350), takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this._resetToFirstPage();
        this._load();
      });

    // React to filter changes
    this.filterForm.valueChanges
      .pipe(debounceTime(200), takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this._resetToFirstPage();
        this._load();
      });
  }

  ngAfterViewInit(): void {
    this._paginators.changes
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.setupSortAndPagination();
      });
    // Initial setup in case paginator is already available
    this.setupSortAndPagination();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  setupSortAndPagination(): void {
    if (this._sort && this._paginators.first) {
      // If the user changes the sort order, reset back to the first page
      this._sort.sortChange
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          this._paginators.first.pageIndex = 0;
        });

      // Get data if sort or page changes
      merge(this._sort.sortChange, this._paginators.first.page)
        .pipe(
          takeUntil(this._unsubscribeAll),
          switchMap(() => {
            this.isLoading = true;
            this._cdr.markForCheck();
            return this._query();
          }),
          map((res: any) => {
            this._applyResult(res);
            this.isLoading = false;
            this._cdr.markForCheck();
          }),
        )
        .subscribe();
    }
  }

  private _resetToFirstPage(): void {
    this.page = 1;
    if (this._paginators?.first) {
      this._paginators.first.pageIndex = 0;
    }
  }

  private _buildFilters(): Record<string, string> {
    const filters: Record<string, string> = {};
    const fv = this.filterForm.value;
    if (fv.status) {
      filters["status"] = fv.status;
    }
    if (fv.billing_cycle) {
      filters["billing_cycle"] = fv.billing_cycle;
    }
    if (fv.gateway) {
      filters["gateway"] = fv.gateway;
    }
    return filters;
  }

  private _query(): Observable<any> {
    const page = this._paginators?.first?.pageIndex + 1 || this.page;
    const size = getPageSize(this._paginators?.first);
    const search = (this.searchControl.value || "").trim();
    const sort = this._sort?.active || "started_at";
    const order = this._sort?.direction || "desc";
    return this._userService.getSubscriptionUsers(
      page,
      size,
      search,
      this._buildFilters(),
      sort,
      order as "asc" | "desc",
    );
  }

  private _applyResult(res: any): void {
    const data = res?.data || [];
    const pagination = res?.pagination || res?.meta || {};
    this.subscriptions = Array.isArray(data) ? data : [];
    this.totalCount = pagination?.length || this.subscriptions.length;
    this.pageSize = pagination?.size || this.pageSize;
    this.page = pagination?.page || this.page;
  }

  private _load(): void {
    this.isLoading = true;
    this._cdr.markForCheck();

    this._query()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this._applyResult(res);
          this.isLoading = false;
          this._cdr.markForCheck();
        },
        error: (err) => {
          this.isLoading = false;
          this._utilService.onError(
            err?.error?.message || "Failed to load subscription users",
          );
          this._cdr.markForCheck();
        },
      });
  }

  refresh(): void {
    this.searchControl.setValue("");
    this.filterForm.reset({ status: "", billing_cycle: "", gateway: "" });
  }

  fromCent(amount: any): string {
    return typeof amount === "number"
      ? (amount / 100).toFixed(2)
      : String(amount ?? "-");
  }

  openDetails(sub: any): void {
    this.selectedSub = sub;
    this._matDialog.open(this.viewDataTemplate);
  }

  get fullName(): string {
    return (
      (this.selectedSub?.first_name || "") +
      " " +
      (this.selectedSub?.last_name || "")
    ).trim();
  }

  closeDialog(): void {
    this._matDialog.closeAll();
  }

  trackByFn(index: number, item: any): any {
    return `${item?.subscription_id || item?.stripe_subscription_id || item?.id || item?._id || "sub"}_${index}`;
  }
}
