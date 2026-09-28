import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  Optional,
} from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { SupportTicketService } from "app/core/support/support-ticket.service";
import { LocalStorageService } from "app/core/local/local-storage.service";
import { SessionStorageService } from "app/core/local/session-storage.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { Constants } from "app/shared/constants";

/**
 * CreateTicketDialogComponent — MatDialog form for creating a new support ticket.
 * Exactly matches manualAddTemplate / Add Product dialog in master-catalog.component.html.
 * Uses separate category dropdown options from Constants for Admin vs Seller.
 */
@Component({
  standalone: false,
  selector: "app-create-ticket-dialog",
  template: `
    <div
      class="flex flex-col -m-6 rounded-xl shadow-2xl min-w-140 max-w-180 bg-white overflow-hidden"
    >
      <!-- Header -->
      <div
        class="sticky top-0 z-10 flex items-center justify-between bg-slate-800 text-white px-4 py-3 rounded-t-xl"
      >
        <div class="flex items-center gap-2">
          <mat-icon
            class="icon-size-5 text-white"
            svgIcon="heroicons_outline:ticket"
          ></mat-icon>
          <span class="text-lg font-semibold text-white"
            >Create Support Ticket</span
          >
        </div>
        <button
          mat-icon-button
          (click)="cancel()"
          [tabIndex]="-1"
          class="text-white"
        >
          <mat-icon [svgIcon]="'heroicons_outline:x'"></mat-icon>
        </button>
      </div>

      <!-- Form Content -->
      <div class="p-6 max-h-[70vh] overflow-y-auto">
        <form [formGroup]="form" class="space-y-4">
          <!-- Subject -->
          <mat-form-field class="w-full">
            <mat-label>Subject</mat-label>
            <input
              matInput
              formControlName="subject"
              placeholder="Enter subject"
              id="create-ticket-subject"
              maxlength="200"
            />
            @if (form.get("subject")?.hasError("required")) {
              <mat-error>Subject is required</mat-error>
            }
            @if (form.get("subject")?.hasError("minlength")) {
              <mat-error>Subject must be at least 3 characters</mat-error>
            }
          </mat-form-field>

          <!-- Category Dropdown -->
          <mat-form-field class="w-full">
            <mat-label>Category</mat-label>
            <mat-select
              formControlName="category"
              placeholder="Select Category"
              id="create-ticket-category"
              (openedChange)="triggerCategoryEvent()"
            >
              <mat-option>
                <ngx-mat-select-search
                  [formControl]="categoryFilterCtrl"
                  placeholderLabel="Search category..."
                  (keyup)="filterCategories($event.target.value)"
                  noEntriesFoundLabel="'No category found'"
                >
                </ngx-mat-select-search>
              </mat-option>
              <mat-option value="">Select Category</mat-option>
              @for (cat of filteredCategoryOptions; track cat.value) {
                <mat-option [value]="cat.value">{{ cat.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <!-- Message -->
          <mat-form-field class="w-full">
            <mat-label>Message</mat-label>
            <textarea
              matInput
              formControlName="message"
              placeholder="Enter ticket message details"
              id="create-ticket-message"
              rows="5"
              maxlength="5000"
            ></textarea>
            @if (form.get("message")?.hasError("required")) {
              <mat-error>Message is required</mat-error>
            }
          </mat-form-field>
        </form>
      </div>

      <!-- Footer Actions -->
      <div
        class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl"
      >
        <button
          type="button"
          class="btn-cancel"
          (click)="cancel()"
          [disabled]="isSubmitting"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn-primary"
          (click)="submit()"
          [disabled]="form.invalid || isSubmitting"
          id="create-ticket-submit-btn"
        >
          {{ isSubmitting ? "Creating..." : "Create Ticket" }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class CreateTicketDialogComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  categoryOptions: { value: string; label: string }[] = [];
  categoryFilterCtrl = new FormControl("");
  filteredCategoryOptions: { value: string; label: string }[] = [];

  constructor(
    private readonly _fb: FormBuilder,
    private readonly _dialogRef: MatDialogRef<CreateTicketDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly _supportService: SupportTicketService,
    private readonly _localStorage: LocalStorageService,
    private readonly _sessionStorage: SessionStorageService,
    private readonly _userSessionService: UserSessionsService,
    private readonly _cdr: ChangeDetectorRef,
  ) {
    this.form = this._fb.group({
      subject: [
        "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(200),
        ],
      ],
      category: ["", [Validators.maxLength(100)]],
      message: ["", [Validators.required, Validators.maxLength(5000)]],
    });
  }

  ngOnInit(): void {
    const currentUser =
      this._userSessionService.getCurrentUser() ||
      this._localStorage.getItem("user") ||
      this._sessionStorage.getItem("user");
    const isAdmin = currentUser?.isSuperAdmin || currentUser?.isPremisesUser;

    this.categoryOptions = isAdmin
      ? Constants.adminSupportCategories
      : Constants.sellerSupportCategories;
    this.filteredCategoryOptions = [...this.categoryOptions];

    this._cdr.detectChanges();
  }

  filterCategories(value: string): void {
    const filter = value.toLowerCase();
    this.filteredCategoryOptions = this.categoryOptions.filter((cat) =>
      cat.label.toLowerCase().includes(filter),
    );
  }

  triggerCategoryEvent(): void {
    this.categoryFilterCtrl.setValue("");
    this.filteredCategoryOptions = [...this.categoryOptions];
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    const { subject, category, message } = this.form.value;

    // 1. Route-based seller ID
    const routeSellerId =
      this.data?.sellerId || this._userSessionService.getSellerIdFromUrl();

    let targetSellerId: string | null = null;
    let targetCreatedBy: string | null = null;

    if (routeSellerId && /^[a-f\d]{24}$/i.test(routeSellerId)) {
      targetSellerId = routeSellerId;
      targetCreatedBy = routeSellerId;
    } else {
      // 2. Fallback if no seller ID in route: get logged in user ID from localStorage / sessionStorage / currentUser
      const currentUser =
        this._userSessionService.getCurrentUser() ||
        this._localStorage.getItem("user") ||
        this._sessionStorage.getItem("user");

      const loggedInUserId =
        currentUser?.id || currentUser?._id || currentUser?.user_id;

      if (loggedInUserId) {
        targetSellerId = currentUser?.seller_id || loggedInUserId;
        targetCreatedBy = loggedInUserId;
      }
    }

    const payload: any = {
      subject,
      category,
      message,
    };

    if (targetSellerId) {
      payload.sellerId = targetSellerId;
    }
    if (targetCreatedBy) {
      payload.createdBy = targetCreatedBy;
    }

    this._supportService.createTicket(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.status === 200) {
          this._dialogRef.close(res.data);
        }
      },
      error: () => {
        this.isSubmitting = false;
      },
    });
  }

  cancel(): void {
    this._dialogRef.close(null);
  }
}
