import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";
import { FuseUtilsService } from "@fuse/services/utils";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { QuickReplyService } from "app/core/support/quick-reply.service";
import { QuickReply } from "app/core/support/quick-reply.model";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { QuickReplyDialogComponent } from "./quick-reply-dialog/quick-reply-dialog.component";

/**
 * QuickReplyComponent — Support Quick Replies view.
 * Allows Admin to manage tag-based response suggestions.
 * Status logic: 1 = Active, 0 = Inactive, 2 = Soft Deleted.
 */
@Component({
  standalone: false,
  selector: "app-quick-reply",
  templateUrl: "./quick-reply.component.html",
  styleUrls: ["../support-tickets.scss"],
})
export class QuickReplyComponent implements OnInit, OnDestroy {
  // ── State ───────────────────────────────────────────────────────────────────
  quickReplies: QuickReply[] = [];
  tags: string[] = [];
  selectedTag: string = "";
  isLoading = false;

  // Track expanded item IDs for details view
  expandedIds = new Set<string>();

  // Confirmation dialog FormGroup
  removeConfirm!: FormGroup;

  // Search filter control
  searchCtrl = new FormControl("");

  // Current User & Role detection
  currentUser: any;
  get isAdmin(): boolean {
    return !!(
      this.currentUser?.isSuperAdmin || this.currentUser?.isPremisesUser
    );
  }

  tooltipText =
    "Quick Replies module for configuring tag-based chat response suggestions.";

  private _destroy$ = new Subject<void>();

  permissionGuard: any = {};
  isSuperAdmin: boolean = false;

  private extractPermission(data: any): any {
    if (!data) return {};
    if (Array.isArray(data?.permissions)) {
      const found = data.permissions.find((item: any) => {
        if (!item?.section_name) return false;
        const name = item.section_name.trim().toLowerCase();
        return (
          name === "quick replies" ||
          name === "quick reply" ||
          name === "support tickets" ||
          name === "support"
        );
      });
      if (found) return found;
    }
    return (
      this._navigationService.getPermissionByRoute(
        data,
        "/master/support/quick-replies",
      ) || {}
    );
  }

  private checkPermission(action: string): boolean {
    if (this.isSuperAdmin) {
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

  get canView(): boolean {
    return this.checkPermission("view");
  }
  get canAdd(): boolean {
    return this.checkPermission("add");
  }
  get canUpdate(): boolean {
    return this.checkPermission("update");
  }
  get canDelete(): boolean {
    return this.checkPermission("delete");
  }

  constructor(
    private readonly _quickReplyService: QuickReplyService,
    private readonly _localStorage: LocalStorageService,
    private readonly _dialog: MatDialog,
    private readonly _utilService: FuseUtilsService,
    private readonly _confirmationService: FuseConfirmationService,
    private readonly _cdr: ChangeDetectorRef,
    private readonly _userSessionService: UserSessionsService,
    private readonly _navigationService: NavigationService,
  ) {
    this.currentUser =
      this._userSessionService.getCurrentUser() ||
      this._localStorage.getItem("user");
  }

  ngOnInit(): void {
    this.isSuperAdmin = this._navigationService.isSuperAdmin;
    this._navigationService.userRoleData
      .pipe(takeUntil(this._destroy$))
      .subscribe((data) => {
        this.permissionGuard = this.extractPermission(data);
        this._cdr.markForCheck();
      });
    this._navigationService.sellerRoleData$
      .pipe(takeUntil(this._destroy$))
      .subscribe((data) => {
        if (
          !this.permissionGuard ||
          !Object.keys(this.permissionGuard).length
        ) {
          this.permissionGuard = this.extractPermission(data);
          this._cdr.markForCheck();
        }
      });
    this.removeConfirm = this._utilService.confirmMessage(
      "Remove Quick Reply",
      "Are you sure you want to remove Quick Reply details permanently?",
      "Remove",
    );
    this.loadTags();
    this.loadQuickReplies();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ── Data Loading ────────────────────────────────────────────────────────────

  loadTags(): void {
    this._quickReplyService.getTags().subscribe({
      next: (res) => {
        if (res?.data && res.data.length > 0) {
          this.tags = res.data;
          this._cdr.markForCheck();
        }
      },
      error: () => {},
    });
  }

  loadQuickReplies(): void {
    this.isLoading = true;
    this._cdr.markForCheck();

    const filter: any = {
      search: this.searchCtrl.value || "",
      tag: this.selectedTag || "",
      limit: 100,
    };

    if (this.isAdmin) {
      filter.status = ""; // Backend returns non-deleted items (status != 2)
    } else {
      filter.status = 1;
    }

    this._quickReplyService.getQuickReplies(filter).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.data?.results) {
          this.quickReplies = res.data.results;
        } else {
          this.quickReplies = [];
        }
        this._cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.quickReplies = [];
        this._cdr.markForCheck();
        setTimeout(() => {
          this._utilService.onError(
            err?.error?.message || "Failed to load Quick Replies",
          );
        }, 0);
      },
    });
  }

  refresh(): void {
    this.loadTags();
    this.loadQuickReplies();
  }

  private setupSearchSubscription(): void {
    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this._destroy$),
      )
      .subscribe(() => {
        this.loadQuickReplies();
      });
  }

  // ── Expand / Collapse ──────────────────────────────────────────────────────

  toggleExpand(id: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
    this._cdr.markForCheck();
  }

  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }

  toggleExpandAll(): void {
    if (this.expandedIds.size === this.quickReplies.length) {
      this.expandedIds.clear();
    } else {
      this.quickReplies.forEach((item) => this.expandedIds.add(item._id));
    }
    this._cdr.markForCheck();
  }

  // ── Filters & Interactions ─────────────────────────────────────────────────

  selectTag(tag: string): void {
    this.selectedTag = tag;
    this.loadQuickReplies();
  }

  copySuggestion(text: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    navigator.clipboard.writeText(text).then(() => {
      setTimeout(() => {
        this._utilService.onSuccess(
          "Quick Reply suggestion copied to clipboard!",
        );
      }, 0);
    });
  }

  // ── Admin Actions ──────────────────────────────────────────────────────────

  openAddQuickReplyDialog(): void {
    const dialogRef = this._dialog.open(QuickReplyDialogComponent, {
      width: "600px",
      data: {},
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadTags();
        this.loadQuickReplies();
      }
    });
  }

  openEditQuickReplyDialog(quickReply: QuickReply, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    const dialogRef = this._dialog.open(QuickReplyDialogComponent, {
      width: "600px",
      data: { quickReply },
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadTags();
        this.loadQuickReplies();
      }
    });
  }

  toggleQuickReplyStatus(quickReply: QuickReply, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    const updatedStatus = quickReply.status === 1 ? 0 : 1;
    this._quickReplyService
      .updateQuickReplyStatus(quickReply._id, updatedStatus)
      .subscribe({
        next: (res) => {
          if (res.status === 200) {
            quickReply.status = updatedStatus;
            this._cdr.markForCheck();
            setTimeout(() => {
              this._utilService.onSuccess(
                `Quick Reply status updated to ${updatedStatus === 1 ? "Active" : "Inactive"}`,
              );
            }, 0);
          }
        },
        error: (err) => {
          this._cdr.markForCheck();
          setTimeout(() => {
            this._utilService.onError(
              err?.error?.message || "Failed to update status",
            );
          }, 0);
        },
      });
  }

  deleteQuickReply(quickReply: QuickReply, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    const dialogRef = this._confirmationService.open(this.removeConfirm.value);

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._quickReplyService.deleteQuickReply(quickReply._id).subscribe({
            next: (res) => {
              if (res.status === 200) {
                setTimeout(() => {
                  this._utilService.onSuccess(
                    "Quick Reply has been deleted successfully.",
                  );
                }, 0);
                this.loadQuickReplies();
              }
            },
            error: (err) => {
              setTimeout(() => {
                this._utilService.onError(
                  err?.error?.message || "Failed to delete Quick Reply",
                );
              }, 0);
            },
          });
        }
      });
  }
}
