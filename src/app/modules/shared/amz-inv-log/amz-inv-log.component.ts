import { finalize, takeUntil } from "rxjs";
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
import { FormControl } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { getPageSize, Pagination } from "app/core/pagination/pagination.types";
import { amzInvLogModel } from "app/core/amz-inv-log/amz-inv-log.model";
import { AmzInvLogService } from "app/core/amz-inv-log/amz-inv-log.service";
import { UserService } from "app/core/user/user.service";
import { Constants } from "app/shared/constants";
import { Router } from "@angular/router";
import { Observable, Subject, debounceTime, merge, switchMap } from "rxjs";
import * as Excel from "exceljs/dist/exceljs.min";
import * as fs from "file-saver";
import { FuseUtilsService } from "@fuse/services/utils";
import { NavigationService } from "app/core/navigation/navigation.service";

@Component({
  standalone: false,
  selector: "app-amz-inv-log",
  templateUrl: "./amz-inv-log.component.html",
  styleUrls: ["./amz-inv-log.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmzInvLogComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("viewDataTemplate") viewDataTemplate: TemplateRef<any>;
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;
  tooltip = "Amazon Inventory Action & Compliance System Logs";
  isLoading: boolean = false;
  pagination: Pagination;
  amzInvLogFormInput: Observable<amzInvLogModel[]>;
  searchInputControl: FormControl = new FormControl();
  isSuperAdmin: boolean;
  permission: any;
  tmpQry: any = "";
  filterQry: any = {};
  searchValue: any = "";
  data: any;
  startDate: FormControl = new FormControl("");
  endDate: FormControl = new FormControl("");
  users: any;
  selectedOperation: any;
  selectedOperationBy: any;
  operationList: any;
  updateData: any;
  oldData: any;
  maxDate = new Date();
  isLoadingData: boolean = false;
  selectedRow: any;
  isResetDate: boolean = false;
  sellerInfo: any;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _amzInvLogService: AmzInvLogService,
    private _matDialog: MatDialog,
    private _userService: UserService,
    private _utilsService: FuseUtilsService,
    private _localService: LocalStorageService,
    private _navigationService: NavigationService,
    private _router: Router,
  ) {
    this.sellerInfo = this._localService.getItem("user");
    this.isSuperAdmin = this.sellerInfo?.isSuperAdmin;
  }

  ngOnInit(): void {
    const segments = this._router.url.split("/");
    const routeId =
      segments[1] && /^[a-f\d]{24}$/i.test(segments[1]) ? segments[1] : null;

    if (routeId) {
      this._userService
        .getUserById(routeId)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((response: any) => {
          if (response && response.status === 200) {
            const routeUser = response.data;
            this.setupUserContext(routeUser, routeId);
          } else {
            this.setupUserContext(this.sellerInfo, null);
          }
        });
    } else {
      this.setupUserContext(this.sellerInfo, null);
    }
    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        this.permission = this._navigationService.getPermissionByRoute(
          data,
          "/master/amazon/amz-inv-logs",
        );
      });
    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (!this.permission || !Object.keys(this.permission).length) {
          this.permission = this._navigationService.getPermissionByRoute(
            data,
            "/master/amazon/amz-inv-logs",
          );
        }
      });
    this.startDate.setValue(new Date());
    this.endDate.setValue(new Date());
    this._amzInvLogService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });

    this.amzInvLogFormInput = this._amzInvLogService.amzInvLogs$;
    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.tmpQry = query ? query.trim() : "";
          this.isLoading = true;
          return this._amzInvLogService
            .getAmzInvSystemLogList(
              1,
              getPageSize(this._paginators?.first),
              "createdAt",
              "desc",
              this.tmpQry,
              this.filterQry,
            )
            .pipe(
              finalize(() => {
                this.isLoading = false;
              }),
            );
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    this.getOperationListInAmzInvSystemLog();
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
            return this._amzInvLogService
              .getAmzInvSystemLogList(
                page,
                size,
                this._sort?.active || "createdAt",
                this._sort?.direction || "desc",
                this.tmpQry,
                this.filterQry,
              )
              .pipe(
                finalize(() => {
                  this.isLoading = false;
                  this._changeDetectorRef.markForCheck();
                }),
              );
          }),
        )
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe();
    }
  }

  getAmzInvSystemLogList(): any {
    this.tmpQry = this.tmpQry ? this.tmpQry.trim() : "";
    return this._amzInvLogService
      .getAmzInvSystemLogList(
        1,
        getPageSize(this._paginators?.first),
        "createdAt",
        "desc",
        this.tmpQry,
        this.filterQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  getUsers(): any {
    const typeVal = this.filterQry["type"];
    this._userService
      .sallerNameList(typeVal)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any) => {
        if (response.status === 200) {
          this.users = response.data;
        }
      });
  }

  openDialog(id: any, key: any, operation: any): void {
    this.selectedRow = id;
    this.isLoadingData = false;

    const dialogRef = this._matDialog.open(this.viewDataTemplate);

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        setTimeout(() => {
          this.isLoadingData = false;
          this.selectedRow = "";
          this.data = null;
          this.oldData = null;
          this.updateData = null;
          this._changeDetectorRef.detectChanges();
        });
      });

    if (id) {
      setTimeout(() => {
        if (operation === "UPDATE" || operation === "BULK_UPDATE") {
          this._amzInvLogService
            .getAmzInvSystemLogById(id, key, operation, 1)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => {
              this.oldData =
                data?.resultData?.[0]?.operation_data?.[0]?.oldData;
              this.data = data?.resultData?.[0];
              this.isLoadingData = true;
              this._changeDetectorRef.detectChanges();
            });
          this._amzInvLogService
            .getAmzInvSystemLogById(id, key, operation, 2)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => {
              this.updateData =
                data?.resultData?.[0]?.operation_data?.[0]?.updatedData;
              this._changeDetectorRef.detectChanges();
            });
        } else {
          this._amzInvLogService
            .getAmzInvSystemLogById(id, key, operation, 3)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => {
              this.isLoadingData = true;
              this.data = data?.resultData?.[0];
              this._changeDetectorRef.detectChanges();
            });
        }
      });
    }
  }

  closeDialog(): void {
    this._matDialog.closeAll();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  isObject(value: any): boolean {
    return typeof value === "object" && value !== null;
  }

  getNestedKeyValuePairs(obj: any, key?: string): string {
    if (obj === null || obj === undefined || obj === "") {
      return "";
    }

    const keyLower = key ? String(key).toLowerCase() : "";
    const isBulletKey =
      keyLower.includes("bullet") || keyLower.includes("point");

    // Case 1: String
    if (typeof obj === "string") {
      const trimmed = obj.trim();

      // Check for indexed pattern like "0: ...,1: ..." or "0: ..."
      const hasIndexedBullets = /(?:^|,\s*)\d+:\s*/.test(trimmed);

      if (isBulletKey || hasIndexedBullets) {
        let items: string[] = [];

        if (hasIndexedBullets) {
          const regex = /(?:^|,\s*)(?:\d+:\s*)(.*?)(?=(?:,\s*\d+:|$))/gs;
          let match;
          while ((match = regex.exec(trimmed)) !== null) {
            if (match[1] && match[1].trim()) {
              items.push(match[1].trim());
            }
          }
        }

        if (items.length === 0) {
          if (trimmed.includes("\n")) {
            items = trimmed
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
          } else if (trimmed.includes("||")) {
            items = trimmed
              .split("||")
              .map((s) => s.trim())
              .filter(Boolean);
          } else if (isBulletKey && trimmed.includes(",")) {
            items = trimmed
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }

        if (items.length > 0) {
          return (
            `<div class="space-y-1.5 my-1">` +
            items
              .map((item) => {
                const cleanItem = item.replace(/^\d+:\s*/, "").trim();
                return `<div class="flex items-start gap-1.5 text-xs text-slate-800"><span class="inline-block text-blue-600 font-bold shrink-0 mt-0.5">•</span><span class="leading-relaxed break-words">${cleanItem}</span></div>`;
              })
              .join("") +
            `</div>`
          );
        }
      }

      return trimmed;
    }

    // Case 2: Array
    if (Array.isArray(obj)) {
      if (obj.length === 0) return "";

      const formattedItems: string[] = obj
        .map((item) => {
          if (typeof item === "string") {
            return item.replace(/^\d+:\s*/, "").trim();
          } else if (this.isObject(item)) {
            return this.getNestedKeyValuePairs(item);
          }
          return `${item}`;
        })
        .filter(Boolean);

      if (isBulletKey || formattedItems.length > 0) {
        return (
          `<div class="space-y-1.5 my-1">` +
          formattedItems
            .map(
              (item) =>
                `<div class="flex items-start gap-1.5 text-xs text-slate-800"><span class="inline-block text-blue-600 font-bold shrink-0 mt-0.5">•</span><span class="leading-relaxed break-words">${item}</span></div>`,
            )
            .join("") +
          `</div>`
        );
      }
      return formattedItems.join(", ");
    }

    // Case 3: Object (including indexed objects { "0": "...", "1": "..." })
    if (typeof obj === "object") {
      const entries = Object.entries(obj).filter(
        ([k, v]) =>
          k !== "_id" &&
          k !== "__v" &&
          k !== "password" &&
          v !== null &&
          v !== undefined &&
          v !== "",
      );

      if (entries.length === 0) return "";

      const isNumericIndexedObj = entries.every(([k]) => /^\d+$/.test(k));

      if (isBulletKey || isNumericIndexedObj) {
        return (
          `<div class="space-y-1.5 my-1">` +
          entries
            .map(([_, value]) => {
              const valStr =
                typeof value === "string"
                  ? value.replace(/^\d+:\s*/, "").trim()
                  : this.getNestedKeyValuePairs(value);
              return `<div class="flex items-start gap-1.5 text-xs text-slate-800"><span class="inline-block text-blue-600 font-bold shrink-0 mt-0.5">•</span><span class="leading-relaxed break-words">${valStr}</span></div>`;
            })
            .join("") +
          `</div>`
        );
      }

      return (
        `<div class="space-y-1 my-0.5">` +
        entries
          .map(([k, v]) => {
            const formattedVal =
              this.isObject(v) || Array.isArray(v)
                ? this.getNestedKeyValuePairs(v, k)
                : `${v}`;
            return `<div class="text-xs"><span class="font-semibold text-slate-500 mr-1">${k}:</span><span class="text-slate-800">${formattedVal}</span></div>`;
          })
          .join("") +
        `</div>`
      );
    }

    return `${obj}`;
  }

  getNestedKeyValuePairRole(obj: any): string {
    return Object.entries(obj)
      .map(([key, value]) => {
        if (key !== "_id" && key !== "__v" && key !== "password") {
          return `<div><span class="font-bold">${key}:</span> ${
            this.isObject(value)
              ? `{ ${this.getNestedKeyValuePairRole(value)} }`
              : value
          }</div>`;
        }
        return null;
      })
      .filter((entry) => entry !== null)
      .join("");
  }

  onChangeFilter(value: any, filterType: string): any {
    if (value) {
      this.filterQry[filterType] = value;
    } else {
      delete this.filterQry[filterType];
    }
    this.getAmzInvSystemLogList();
  }

  setupUserContext(user: any, routeId: string | null): void {
    const isSuperAdminOrPremises =
      user?.isSuperAdmin === true || user?.isPremisesUser === true;
    this.isSuperAdmin = user?.isSuperAdmin === true;
    this.filterQry["type"] = isSuperAdminOrPremises ? "admin" : "seller";

    if (!this.isSuperAdmin) {
      this.filterQry["operation_by"] = routeId || user?.id || user?._id;
    } else {
      delete this.filterQry["operation_by"];
    }

    this.getUsers();
    this.getAmzInvSystemLogList();
  }

  refresh(): void {
    const currentDate = new Date();
    const segments = this._router.url.split("/");
    const routeId =
      segments[1] && /^[a-f\d]{24}$/i.test(segments[1]) ? segments[1] : null;

    if (routeId) {
      this._userService
        .getUserById(routeId)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((response: any) => {
          if (response && response.status === 200) {
            const routeUser = response.data;
            this.resetFilters(routeUser, routeId, currentDate);
          } else {
            this.resetFilters(this.sellerInfo, null, currentDate);
          }
        });
    } else {
      this.resetFilters(this.sellerInfo, null, currentDate);
    }
  }

  resetFilters(user: any, routeId: string | null, currentDate: Date): void {
    const isSuperAdminOrPremises =
      user?.isSuperAdmin === true || user?.isPremisesUser === true;
    const isSuperAdmin = user?.isSuperAdmin === true;
    const typeVal = isSuperAdminOrPremises ? "admin" : "seller";

    Object.assign(this, {
      searchValue: "",
      selectedOperation: "",
      selectedOperationBy: "",
      tmpQry: "",
      filterQry: isSuperAdmin
        ? { type: typeVal }
        : { operation_by: routeId || user?.id || user?._id, type: typeVal },
    });

    if (this._paginators?.first) {
      this._paginators.first.pageIndex = 0;
    }
    this.searchInputControl.reset();
    this.startDate.setValue(currentDate);
    this.endDate.setValue(currentDate);

    this.getAmzInvSystemLogList();
  }

  clearDate(): void {
    this.startDate.setValue(new Date());
    this.endDate.setValue(new Date());
    this.filterQry["startDate"] = "";
    this.filterQry["endDate"] = "";
    this.isResetDate = false;
    this.getAmzInvSystemLogList();
  }

  onDateClickFilter(): any {
    if (
      this.startDate.value &&
      this.startDate.value !== "" &&
      this.endDate.value &&
      this.endDate.value !== ""
    ) {
      const tmpStart = new Date(this.startDate.value);
      tmpStart.setDate(tmpStart.getDate());
      const tmpEnd = new Date(this.endDate.value);
      tmpEnd.setDate(tmpEnd.getDate() + 1);
      this.filterQry["startDate"] = new Date(tmpStart);
      this.filterQry["endDate"] = new Date(tmpEnd);
      this.isResetDate = true;
    }
    this.getAmzInvSystemLogList();
  }

  getOperationListInAmzInvSystemLog(): any {
    this._amzInvLogService
      .getOperationListInAmzInvSystemLog()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        this.operationList = data.data;
      });
  }

  formatDate(date: Date): any {
    const year = date.getFullYear().toString().slice(-2);
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);
    const hours = ("0" + date.getHours()).slice(-2);
    const minutes = ("0" + date.getMinutes()).slice(-2);
    const seconds = ("0" + date.getSeconds()).slice(-2);

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }

  exportexcel(): void {
    this.isLoading = true;
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet();
    const header = [
      "Operation",
      "Performed By",
      "Operation Key",
      "Created Date",
    ];

    const headerRow = worksheet.addRow(header);
    let lastRow = worksheet.lastRow.number + 1;
    headerRow.height = 45;

    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "C5E5FB" },
        width: "4.22 cm",
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin", innerWidth: 2 },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.font = {
        family: 2,
        bold: true,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
    });

    worksheet.columns[0].width = 15;
    worksheet.columns[1].width = 15;
    worksheet.columns[2].width = 30;
    worksheet.columns[3].width = 25;

    this._amzInvLogService
      .getAmzInvSystemLogList(
        this._paginators?.first?.pageIndex ?? 0,
        this.pagination?.length || 0,
        "createdAt",
        "desc",
        this.tmpQry,
        this.filterQry,
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        (response) => {
          const amzInvLogData = response.data;
          amzInvLogData.forEach((element) => {
            const row = [
              element.operation,
              `${element.first_name} ${element.last_name}`,
              element.key,
              this.formatDate(new Date(element.createdAt)),
            ];
            lastRow = worksheet.lastRow.number + 1;
            worksheet.addRow(row);
          });
          workbook.xlsx.writeBuffer().then((data) => {
            const blob = new Blob([data], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            fs.saveAs(blob, "AmazonInventoryLogData" + ".xlsx");
          });
          this.refresh();
        },
        ({ error }) => this._utilsService.onError(error.message),
      );
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
