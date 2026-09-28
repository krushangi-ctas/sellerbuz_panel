import { Component, Inject, OnInit, ChangeDetectorRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FuseUtilsService } from "@fuse/services/utils";
import { QuickReplyService } from "app/core/support/quick-reply.service";
import { QuickReply } from "app/core/support/quick-reply.model";

export interface QuickReplyDialogData {
  quickReply?: QuickReply;
}

/**
 * QuickReplyDialogComponent — Dialog for creating or updating a Quick Reply entry.
 * Fields: tag (e.g. product, billing), suggestion (reply content), status (1 = Active, 0 = Inactive).
 */
@Component({
  standalone: false,
  selector: "app-quick-reply-dialog",
  templateUrl: "./quick-reply-dialog.component.html",
})
export class QuickReplyDialogComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  isSubmitting = false;

  constructor(
    private readonly _fb: FormBuilder,
    private readonly _dialogRef: MatDialogRef<QuickReplyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QuickReplyDialogData,
    private readonly _quickReplyService: QuickReplyService,
    private readonly _utilService: FuseUtilsService,
    private readonly _cdr: ChangeDetectorRef,
  ) {}

  get isFormInvalid(): boolean {
    return !this.form || this.form.invalid;
  }

  ngOnInit(): void {
    this.isEditMode = !!this.data?.quickReply;

    const defaultStatus =
      this.data?.quickReply?.status !== undefined
        ? this.data.quickReply.status === 1
          ? 1
          : 0
        : 1;

    this.form = this._fb.group({
      tag: [
        this.data?.quickReply?.tag || "",
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(100),
        ],
      ],
      suggestion: [
        this.data?.quickReply?.suggestion || "",
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(10000),
        ],
      ],
      status: [defaultStatus],
    });

    this._cdr.detectChanges();
  }

  save(): void {
    if (this.isFormInvalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this._cdr.markForCheck();
    const formValue = { ...this.form.value };
    // Strip leading # from tag
    if (formValue.tag) {
      formValue.tag = formValue.tag.replace(/^#/, "").trim().toLowerCase();
    }

    if (this.isEditMode && this.data.quickReply?._id) {
      this._quickReplyService
        .updateQuickReply(this.data.quickReply._id, formValue)
        .subscribe({
          next: (res) => {
            this.isSubmitting = false;
            this._cdr.markForCheck();
            if (res.status === 200 || res.status === 201) {
              setTimeout(() => {
                this._utilService.onSuccess(
                  "Quick Reply updated successfully!",
                );
              }, 0);
              this._dialogRef.close(true);
            } else {
              setTimeout(() => {
                this._utilService.onError(
                  res.message || "Failed to update Quick Reply",
                );
              }, 0);
            }
          },
          error: (err) => {
            this.isSubmitting = false;
            this._cdr.markForCheck();
            setTimeout(() => {
              this._utilService.onError(
                err?.error?.message || "Error updating Quick Reply",
              );
            }, 0);
          },
        });
    } else {
      this._quickReplyService.createQuickReply(formValue).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this._cdr.markForCheck();
          if (res.status === 200 || res.status === 201) {
            setTimeout(() => {
              this._utilService.onSuccess("Quick Reply created successfully!");
            }, 0);
            this._dialogRef.close(true);
          } else {
            setTimeout(() => {
              this._utilService.onError(
                res.message || "Failed to create Quick Reply",
              );
            }, 0);
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this._cdr.markForCheck();
          setTimeout(() => {
            this._utilService.onError(
              err?.error?.message || "Error creating Quick Reply",
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
