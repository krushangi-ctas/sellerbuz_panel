import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { fuseAnimations } from "@fuse/animations";
import { FuseUtilsService } from "@fuse/services/utils";
import {
  WebSettingsService,
  WebSettings,
} from "app/core/web-settings/web-settings.service";
import { Constants } from "app/shared/constants";
import { Subject, takeUntil, finalize } from "rxjs";

export type WebSettingsTab = "company" | "contact" | "social" | "footer";

@Component({
  standalone: false,
  selector: "app-web-settings",
  templateUrl: "./web-settings.component.html",
  styleUrls: ["./web-settings.component.scss"],
  animations: fuseAnimations,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebSettingsComponent implements OnInit, OnDestroy {
  settingsForm: FormGroup;
  isLoading = false;
  tooltip = Constants.webSettingDetails;

  /** Which tab is currently active */
  activeTab: WebSettingsTab = "company";

  /** Per-tab saving state */
  isSaving: Record<WebSettingsTab, boolean> = {
    company: false,
    contact: false,
    social: false,
    footer: false,
  };

  /** Snapshot of values loaded from server – used for per-tab reset */
  private _loadedData: any = null;

  private _unsubscribeAll: Subject<any> = new Subject<void>();

  constructor(
    private _fb: FormBuilder,
    private _webSettingsService: WebSettingsService,
    private _utilService: FuseUtilsService,
    private _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._buildForm();
    this._loadSettings();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  // ---------------------------------------------------------------------------
  // @ Private helpers
  // ---------------------------------------------------------------------------

  private _buildForm(): void {
    this.settingsForm = this._fb.group({
      company: this._fb.group({
        name: ["", [Validators.required, Validators.maxLength(250)]],
        website: ["", [Validators.maxLength(500)]],
        tagline: ["", [Validators.maxLength(500)]],
        about: ["", [Validators.maxLength(1000)]],
      }),
      contact: this._fb.group({
        email: [
          "",
          [Validators.required, Validators.email, Validators.maxLength(150)],
        ],
        phone: [
          "",
          [Validators.required, Validators.pattern(/^[+]?[0-9\s-]{7,30}$/)],
        ],
        address: ["", [Validators.required, Validators.maxLength(1000)]],
        city: ["", [Validators.maxLength(150)]],
        state: ["", [Validators.maxLength(150)]],
        country: ["", [Validators.maxLength(150)]],
        postal_code: ["", [Validators.required, Validators.maxLength(30)]],
        working_hours: ["", [Validators.maxLength(250)]],
        timezone: ["Asia/Kolkata", [Validators.maxLength(150)]],
      }),
      social: this._fb.group({
        facebook: ["", [Validators.maxLength(500)]],
        instagram: ["", [Validators.maxLength(500)]],
        linkedin: ["", [Validators.maxLength(500)]],
        youtube: ["", [Validators.maxLength(500)]],
        twitter: ["", [Validators.maxLength(500)]],
      }),
      footer: this._fb.group({
        about: ["", [Validators.maxLength(1000)]],
        copyright_text: ["", [Validators.maxLength(1000)]],
        show_social: [true],
        show_contact: [true],
        show_address: [true],
        show_working_hours: [true],
      }),
    });
  }

  private _loadSettings(): void {
    this.isLoading = true;
    this._webSettingsService
      .getWebSettings()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          const data = res?.data || res;
          if (data) {
            this._loadedData = data;
            this.settingsForm.patchValue({
              company: data.company || {},
              contact: data.contact || {},
              social: data.social || {},
              footer: data.footer || {},
            });
          }
          this._cdr.markForCheck();
        },
        error: (err) => {
          this.isLoading = false;
          this._utilService.onError(
            err?.error?.message || "Failed to load settings",
          );
          this._cdr.markForCheck();
        },
      });
  }

  // ---------------------------------------------------------------------------
  // @ Public methods
  // ---------------------------------------------------------------------------

  /** Set active tab */
  setTab(tab: WebSettingsTab): void {
    this.activeTab = tab;
  }

  /** Save only the active tab's data */
  saveTab(): void {
    if (this.isSaving[this.activeTab]) {
      return;
    }

    const group = this.settingsForm.get(this.activeTab) as FormGroup;
    if (group.invalid) {
      group.markAllAsTouched();
      return;
    }

    this.isSaving[this.activeTab] = true;

    // Build payload: current loaded data + active tab overrides
    const currentValues = this.settingsForm.getRawValue();
    const payload: WebSettings = {
      company: currentValues.company,
      contact: currentValues.contact,
      social: currentValues.social,
      footer: currentValues.footer,
    };

    this._webSettingsService
      .updateWebSettings(payload)
      .pipe(
        takeUntil(this._unsubscribeAll),
        finalize(() => {
          this.isSaving[this.activeTab] = false;
          this._cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res: any) => {
          // Update snapshot for the active tab
          if (this._loadedData) {
            this._loadedData[this.activeTab] = currentValues[this.activeTab];
          }
          this._utilService.onSuccess(
            `${this._tabLabel(this.activeTab)} saved successfully.`,
          );
        },
        error: (err) => {
          this._utilService.onError(
            err?.error?.message || "Failed to save settings",
          );
        },
      });
  }

  /** Reset only the active tab's fields to last loaded values */
  resetTab(): void {
    if (this._loadedData) {
      const group = this.settingsForm.get(this.activeTab) as FormGroup;
      group.patchValue(this._loadedData[this.activeTab] || {});
      group.markAsPristine();
      group.markAsUntouched();
    } else {
      this._loadSettings();
    }
  }

  /** Check if the current tab is saving */
  get isCurrentTabSaving(): boolean {
    return this.isSaving[this.activeTab];
  }

  /** Check if the current tab group is invalid */
  get isCurrentTabInvalid(): boolean {
    return (
      (this.settingsForm.get(this.activeTab) as FormGroup)?.invalid ?? false
    );
  }

  // Convenience form-group getters
  get companyGroup(): FormGroup {
    return this.settingsForm.get("company") as FormGroup;
  }
  get contactGroup(): FormGroup {
    return this.settingsForm.get("contact") as FormGroup;
  }
  get socialGroup(): FormGroup {
    return this.settingsForm.get("social") as FormGroup;
  }
  get footerGroup(): FormGroup {
    return this.settingsForm.get("footer") as FormGroup;
  }

  private _tabLabel(tab: WebSettingsTab): string {
    const labels: Record<WebSettingsTab, string> = {
      company: "Company Identity & Branding",
      contact: "Contact Information",
      social: "Social Media Links",
      footer: "Footer Settings & Visibility",
    };
    return labels[tab];
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
