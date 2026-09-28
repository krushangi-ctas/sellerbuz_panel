import { Component, Inject, OnInit, ChangeDetectorRef } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FuseUtilsService } from "@fuse/services/utils";
import { FaqService } from "app/core/support/faq.service";
import { Faq } from "app/core/support/faq.model";
import { Constants } from "app/shared/constants";

export interface FaqDialogData {
  faq?: Faq;
  categoryOptions?: string[];
}

/**
 * FaqDialogComponent — Dialog for creating or updating a FAQ entry.
 * Uses status field: 1 = Active, 0 = Inactive. Default status on create: 1.
 */
@Component({
  standalone: false,
  selector: "app-faq-dialog",
  templateUrl: "./faq-dialog.component.html",
})
export class FaqDialogComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  isSubmitting = false;

  sellerCategories: string[] = Constants.sellerSupportCategories.map(
    (c) => c.value,
  );
  categoryFilterCtrl = new FormControl("");
  filteredSellerCategories: string[] = [];

  constructor(
    private readonly _fb: FormBuilder,
    private readonly _dialogRef: MatDialogRef<FaqDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FaqDialogData,
    private readonly _faqService: FaqService,
    private readonly _utilService: FuseUtilsService,
    private readonly _cdr: ChangeDetectorRef,
  ) {}

  get isFormInvalid(): boolean {
    return !this.form || this.form.invalid;
  }

  ngOnInit(): void {
    this.isEditMode = !!this.data?.faq;

    const defaultCategory =
      this.sellerCategories.length > 0
        ? this.sellerCategories[0]
        : "General Settings";

    const defaultStatus =
      this.data?.faq?.status !== undefined
        ? this.data.faq.status === 1
          ? 1
          : 0
        : 1;

    this.form = this._fb.group({
      question: [
        this.data?.faq?.question || "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(1000),
        ],
      ],
      answer: [
        this.data?.faq?.answer || "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(10000),
        ],
      ],
      category: [
        this.data?.faq?.category || defaultCategory,
        [Validators.required, Validators.maxLength(100)],
      ],
      status: [defaultStatus],
    });

    this.filteredSellerCategories = [...this.sellerCategories];
    this._cdr.detectChanges();
  }

  filterCategories(query: string): void {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      this.filteredSellerCategories = [...this.sellerCategories];
    } else {
      this.filteredSellerCategories = this.sellerCategories.filter((c) =>
        c.toLowerCase().includes(q),
      );
    }
    this._cdr.markForCheck();
  }

  triggerCategoryEvent(): void {
    this.filteredSellerCategories = [...this.sellerCategories];
    this.categoryFilterCtrl.setValue("", { emitEvent: false });
  }

  save(): void {
    if (this.isFormInvalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this._cdr.markForCheck();
    const formValue = this.form.value;

    if (this.isEditMode && this.data.faq?._id) {
      this._faqService.updateFaq(this.data.faq._id, formValue).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this._cdr.markForCheck();
          if (res.status === 200 || res.status === 201) {
            setTimeout(() => {
              this._utilService.onSuccess("FAQ updated successfully!");
            }, 0);
            this._dialogRef.close(true);
          } else {
            setTimeout(() => {
              this._utilService.onError(res.message || "Failed to update FAQ");
            }, 0);
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this._cdr.markForCheck();
          setTimeout(() => {
            this._utilService.onError(
              err?.error?.message || "Error updating FAQ",
            );
          }, 0);
        },
      });
    } else {
      this._faqService.createFaq(formValue).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this._cdr.markForCheck();
          if (res.status === 200 || res.status === 201) {
            setTimeout(() => {
              this._utilService.onSuccess("FAQ created successfully!");
            }, 0);
            this._dialogRef.close(true);
          } else {
            setTimeout(() => {
              this._utilService.onError(res.message || "Failed to create FAQ");
            }, 0);
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this._cdr.markForCheck();
          setTimeout(() => {
            this._utilService.onError(
              err?.error?.message || "Error creating FAQ",
            );
          }, 0);
        },
      });
    }
  }

  cancel(): void {
    this._dialogRef.close(false);
  }
}
