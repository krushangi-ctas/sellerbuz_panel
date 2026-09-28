import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";
import { FuseUtilsService } from "@fuse/services/utils";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { FaqService } from "app/core/support/faq.service";
import { Faq } from "app/core/support/faq.model";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Constants } from "app/shared/constants";
import { FaqDialogComponent } from "./faq-dialog/faq-dialog.component";

/**
 * FaqComponent — Support FAQs view.
 * Status logic: 1 = Active, 0 = Inactive, 2 = Soft Deleted.
 * Uses dedicated updateFaqStatus API for status toggle & FuseConfirmationService for delete action.
 */
@Component({
  standalone: false,
  selector: "app-faq",
  templateUrl: "./faq.component.html",
  styleUrls: ["../support-tickets.scss"],
})
export class FaqComponent implements OnInit, OnDestroy {
  // ── State ───────────────────────────────────────────────────────────────────
  faqs: Faq[] = [];
  categories: string[] = Constants.sellerSupportCategories.map((c) => c.value);
  selectedCategory: string = "";
  isLoading = false;

  // Track expanded FAQ IDs for expandable answers
  expandedFaqIds = new Set<string>();

  // Confirmation dialog FormGroup
  removeFaqConfirm!: FormGroup;

  // Search filter control
  searchCtrl = new FormControl("");

  // Current User & Role detection
  currentUser: any;
  permissionGuard: any = {};
  isSuperAdminUser: boolean = false;

  get currentUserInfo(): any {
    return (
      this.currentUser ||
      this._userSessionService.getCurrentUser() ||
      this._localStorage.getItem("user")
    );
  }

  get isSellerUser(): boolean {
    return Boolean(this.currentUserInfo?.is_seller_user);
  }

  get isPremisesUser(): boolean {
    return (
      Boolean(this.currentUserInfo?.isPremisesUser) ||
      Boolean(this._navigationService.isPremisesUser)
    );
  }

  get isSuperAdmin(): boolean {
    return (
      Boolean(this.currentUserInfo?.isSuperAdmin) ||
      Boolean(this._navigationService.isSuperAdmin) ||
      this.isSuperAdminUser
    );
  }

  get isSuperAdminOrPremisesUser(): boolean {
    return (this.isSuperAdmin || this.isPremisesUser) && !this.isSellerUser;
  }

  get isAdmin(): boolean {
    return this.isSuperAdminOrPremisesUser;
  }

  tooltipText =
    Constants.faqDetails || "Frequently Asked Questions (FAQ) support module.";

  private _destroy$ = new Subject<void>();

  private extractPermission(data: any): any {
    if (!data) return {};
    if (Array.isArray(data?.permissions)) {
      const found = data.permissions.find((item: any) => {
        if (!item?.section_name) return false;
        const name = item.section_name.trim().toLowerCase();
        return (
          name === "faqs" ||
          name === "faq" ||
          name === "support faqs" ||
          name === "support"
        );
      });
      if (found) return found;
    }
    return (
      this._navigationService.getPermissionByRoute(
        data,
        "/master/support/faqs",
      ) || {}
    );
  }

  private checkPermission(action: string): boolean {
    // Priority 1: is_seller_user === true -> VIEW ONLY (No ADD, UPDATE, DELETE allowed)
    if (this.isSellerUser) {
      return action === "view";
    }

    // Priority 2: Super Admin or Premises User -> FULL ACCESS (VIEW, ADD, UPDATE, DELETE)
    if (this.isSuperAdminOrPremisesUser) {
      return true;
    }

    // Priority 3: When isSuperAdmin and isPremisesUser are false -> VIEW ONLY (No ADD, UPDATE, DELETE allowed)
    return action === "view";
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
    private readonly _faqService: FaqService,
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
    this.currentUser =
      this._userSessionService.getCurrentUser() ||
      this._localStorage.getItem("user");
    this.isSuperAdminUser =
      Boolean(this.currentUser?.isSuperAdmin) ||
      Boolean(this._navigationService.isSuperAdmin);

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
    this.removeFaqConfirm = this._utilService.confirmMessage(
      "Remove FAQ",
      "Are you sure you want to remove FAQ details permanently?",
      "Remove",
    );
    this.loadCategories();
    this.loadFaqs();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ── Data Loading ────────────────────────────────────────────────────────────

  loadCategories(): void {
    this._faqService.getCategories().subscribe({
      next: (res) => {
        if (res?.data && res.data.length > 0) {
          const combined = Array.from(
            new Set([...this.categories, ...res.data]),
          );
          this.categories = combined;
          this._cdr.markForCheck();
        }
      },
      error: () => {},
    });
  }

  loadFaqs(): void {
    if (!this.canView) {
      this.faqs = [];
      this.isLoading = false;
      this._cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this._cdr.markForCheck();

    const filter: any = {
      search: this.searchCtrl.value || "",
      category: this.selectedCategory || "",
      limit: 100,
    };

    if (this.isSuperAdminOrPremisesUser) {
      filter.status = ""; // Super Admins & Premises users see all non-deleted FAQs (status != 2)
    } else {
      filter.status = 1; // Sellers and non-admin users only see Active FAQs (status = 1)
    }

    this._faqService.getFaqs(filter).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.data?.results) {
          this.faqs = res.data.results;
        } else {
          this.faqs = [];
        }
        this._cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.faqs = [];
        this._cdr.markForCheck();
        setTimeout(() => {
          this._utilService.onError(
            err?.error?.message || "Failed to load FAQs",
          );
        }, 0);
      },
    });
  }

  refresh(): void {
    this.loadCategories();
    this.loadFaqs();
  }

  private setupSearchSubscription(): void {
    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this._destroy$),
      )
      .subscribe(() => {
        this.loadFaqs();
      });
  }

  // ── Expand / Collapse Answers ─────────────────────────────────────────────

  toggleExpand(faqId: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.expandedFaqIds.has(faqId)) {
      this.expandedFaqIds.delete(faqId);
    } else {
      this.expandedFaqIds.add(faqId);
    }
    this._cdr.markForCheck();
  }

  isExpanded(faqId: string): boolean {
    return this.expandedFaqIds.has(faqId);
  }

  toggleExpandAll(): void {
    if (this.expandedFaqIds.size === this.faqs.length) {
      this.expandedFaqIds.clear();
    } else {
      this.faqs.forEach((faq) => this.expandedFaqIds.add(faq._id));
    }
    this._cdr.markForCheck();
  }

  // ── Filters & Interactions ─────────────────────────────────────────────────

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.loadFaqs();
  }

  copyAnswer(answerText: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    navigator.clipboard.writeText(answerText).then(() => {
      setTimeout(() => {
        this._utilService.onSuccess("Answer copied to clipboard!");
      }, 0);
    });
  }

  // ── Admin Actions ──────────────────────────────────────────────────────────

  openAddFaqDialog(): void {
    if (!this.canAdd) {
      return;
    }
    const dialogRef = this._dialog.open(FaqDialogComponent, {
      width: "600px",
      data: { categoryOptions: this.categories },
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadCategories();
        this.loadFaqs();
      }
    });
  }

  openEditFaqDialog(faq: Faq, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.canUpdate) {
      return;
    }
    const dialogRef = this._dialog.open(FaqDialogComponent, {
      width: "600px",
      data: { faq, categoryOptions: this.categories },
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadCategories();
        this.loadFaqs();
      }
    });
  }

  toggleFaqStatus(faq: Faq, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.canUpdate) {
      return;
    }
    const updatedStatus = faq.status === 1 ? 0 : 1;
    this._faqService.updateFaqStatus(faq._id, updatedStatus).subscribe({
      next: (res) => {
        if (res.status === 200) {
          faq.status = updatedStatus;
          this._cdr.markForCheck();
          setTimeout(() => {
            this._utilService.onSuccess(
              `FAQ status updated to ${updatedStatus === 1 ? "Active" : "Inactive"}`,
            );
          }, 0);
        }
      },
      error: (err) => {
        this._cdr.markForCheck();
        setTimeout(() => {
          this._utilService.onError(
            err?.error?.message || "Failed to update FAQ status",
          );
        }, 0);
      },
    });
  }

  deleteFaq(faq: Faq, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.canDelete) {
      return;
    }

    const dialogRef = this._confirmationService.open(
      this.removeFaqConfirm.value,
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe((result) => {
        if (result === "confirmed") {
          this._faqService.deleteFaq(faq._id).subscribe({
            next: (res) => {
              if (res.status === 200) {
                setTimeout(() => {
                  this._utilService.onSuccess(
                    "FAQ details has been deleted successfully.",
                  );
                }, 0);
                this.loadFaqs();
              }
            },
            error: (err) => {
              setTimeout(() => {
                this._utilService.onError(
                  err?.error?.message || "Failed to delete FAQ",
                );
              }, 0);
            },
          });
        }
      });
  }
}
