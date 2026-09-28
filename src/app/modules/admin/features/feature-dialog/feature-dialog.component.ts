import { ChangeDetectorRef, Component, Inject, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { FuseAlertService } from "@fuse/components/alert";
import { AlertService } from "app/core/alert/alert.service";
import { FeatureService } from "app/core/feature/feature.service";
import {
  ActiveSellerSection,
  FeatureItem,
} from "app/core/feature/feature.types";
import { UserService } from "app/core/user/user.service";
import { finalize } from "rxjs";

export interface FeatureDialogData {
  feature?: FeatureItem;
}

@Component({
  standalone: false,
  selector: "app-feature-dialog",
  templateUrl: "./feature-dialog.component.html",
})
export class FeatureDialogComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  isLoadingSections = false;
  sellerSections: ActiveSellerSection[] = [];
  filteredSellerSections: ActiveSellerSection[] = [];
  sectionSearchControl = new FormControl<string>("");
  userId = "";

  constructor(
    private readonly _fb: FormBuilder,
    private readonly _dialogRef: MatDialogRef<FeatureDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FeatureDialogData,
    private readonly _featureService: FeatureService,
    private readonly _userService: UserService,
    private readonly _alertService: AlertService,
    private readonly _fuseAlertService: FuseAlertService,
    private readonly _cdr: ChangeDetectorRef,
  ) {}

  get isFormInvalid(): boolean {
    return !this.form || this.form.invalid;
  }

  ngOnInit(): void {
    this.isEditMode = !!this.data?.feature;

    this.form = this._fb.group({
      name: [
        this.data?.feature?.name || "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(150),
        ],
      ],
      desc: [
        this.data?.feature?.desc || "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(1000),
        ],
      ],
      section_id: [this.data?.feature?.section_id || "", [Validators.required]],
      status: [
        this.data?.feature?.status !== undefined ? this.data.feature.status : 1,
      ],
    });

    this._userService.user$.subscribe((user: any) => {
      if (user?._id || user?.id) {
        this.userId = user._id || user.id;
      }
    });

    this.loadSellerSections();
  }

  loadSellerSections(): void {
    this.isLoadingSections = true;
    this._cdr.markForCheck();

    this._featureService.getSellerSections().subscribe({
      next: (res: any) => {
        this.isLoadingSections = false;
        if (res?.data) {
          this.sellerSections = res.data;
          this.filteredSellerSections = [...this.sellerSections];
        }
        this._cdr.markForCheck();
      },
      error: () => {
        this.isLoadingSections = false;
        this.showAlert("Failed to load seller sections.", "alert_error");
        this._cdr.markForCheck();
      },
    });
  }

  filterSections(query: string): void {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      this.filteredSellerSections = [...this.sellerSections];
    } else {
      this.filteredSellerSections = this.sellerSections.filter(
        (sec) => sec.name && sec.name.toLowerCase().includes(q),
      );
    }
    this._cdr.markForCheck();
  }

  onSectionSelectOpened(opened: boolean): void {
    this.filteredSellerSections = [...this.sellerSections];
    this.sectionSearchControl.setValue("", { emitEvent: false });
  }

  private showAlert(
    message: string,
    type: "alert_success" | "alert_error",
  ): void {
    this._alertService.message = message;
    this._fuseAlertService.show(type);
    setTimeout(() => this._fuseAlertService.dismiss(type), 2500);
  }

  save(): void {
    if (this.isFormInvalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this._cdr.markForCheck();
    const formValue = this.form.value;

    const payload = {
      name: formValue.name?.trim(),
      desc: formValue.desc?.trim(),
      section_id: formValue.section_id,
      status: Number(formValue.status),
    };

    if (this.isEditMode && this.data.feature?._id) {
      this._featureService
        .updateFeature(this.data.feature._id, this.userId, payload)
        .pipe(
          finalize(() => {
            this.isSubmitting = false;
            this._cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (res: any) => {
            if (res?.status === 200 || res?.status === 201) {
              this.showAlert(
                res.message || "Feature updated successfully.",
                "alert_success",
              );
              this._dialogRef.close(true);
            } else {
              this.showAlert(
                res?.message || "Failed to update feature.",
                "alert_error",
              );
            }
          },
          error: (err: any) => {
            this.showAlert(
              err?.error?.message || "Error updating feature.",
              "alert_error",
            );
          },
        });
    } else {
      this._featureService
        .createFeature(this.userId, payload)
        .pipe(
          finalize(() => {
            this.isSubmitting = false;
            this._cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (res: any) => {
            if (res?.status === 200 || res?.status === 201) {
              this.showAlert(
                res.message || "Feature created successfully.",
                "alert_success",
              );
              this._dialogRef.close(true);
            } else {
              this.showAlert(
                res?.message || "Failed to create feature.",
                "alert_error",
              );
            }
          },
          error: (err: any) => {
            this.showAlert(
              err?.error?.message || "Error creating feature.",
              "alert_error",
            );
          },
        });
    }
  }

  cancel(): void {
    this._dialogRef.close(false);
  }
}
