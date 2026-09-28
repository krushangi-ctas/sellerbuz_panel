import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  NgForm,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import { fuseAnimations } from "@fuse/animations";
import { FuseAlertType } from "@fuse/components/alert";
import { FuseUtilsService } from "@fuse/services/utils";
import { AuthService } from "app/core/auth/auth.service";

@Component({
  standalone: false,
  selector: "auth-sign-in",
  templateUrl: "./sign-in.component.html",
  styleUrls: ["./sign-in.component.scss"],
  encapsulation: ViewEncapsulation.None,
  animations: fuseAnimations,
})
export class AuthSignInComponent implements OnInit, OnDestroy {
  @ViewChild("signInNgForm") signInNgForm: NgForm;

  alert: { type: FuseAlertType; message: string } = {
    type: "success",
    message: "",
  };
  signInForm: UntypedFormGroup;
  showAlert = false;

  step: "email" | "otp" | "password" = "email";
  isSendingOtp = false;
  isVerifying = false;
  showPassword = false;
  resendCountdown = 0;
  otpDigits: string[] = ["", "", "", "", "", ""];
  private resendTimerInterval: any;
  private alertTimeout: any;

  constructor(
    private _authService: AuthService,
    private _formBuilder: UntypedFormBuilder,
    private _router: Router,
    private _utilService: FuseUtilsService,
    private _changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.signInForm = this._formBuilder.group({
      email: ["", [Validators.required, this.emailOrUniversalLoginValidator]],
      password: [""],
      otp: [
        "",
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(6),
          Validators.pattern("^[0-9]{6}$"),
        ],
      ],
    });
  }

  ngOnDestroy(): void {
    if (this.resendTimerInterval) {
      clearInterval(this.resendTimerInterval);
    }
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
  }

  /**
   * Designated support format: user@domain.com@123456
   * (email + "@" + 6-digit universal OTP)
   */
  private parseUniversalLogin(
    raw: string,
  ): { email: string; otp: string } | null {
    const value = (raw || "").trim();
    const match = value.match(/^(.+)@(\d{6})$/);
    if (!match) return null;

    const email = match[1].trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

    return { email, otp: match[2] };
  }

  private emailOrUniversalLoginValidator = (
    control: import("@angular/forms").AbstractControl,
  ): import("@angular/forms").ValidationErrors | null => {
    const value = (control.value || "").trim();
    if (!value) return null;
    if (this.parseUniversalLogin(value)) return null;
    return Validators.email(control);
  };

  sendOtp(): void {
    const emailControl = this.signInForm.get("email");
    if (!emailControl || emailControl.invalid) {
      emailControl?.markAsTouched();
      emailControl?.updateValueAndValidity();
      return;
    }

    const universal = this.parseUniversalLogin(emailControl.value);
    if (universal) {
      this.loginWithUniversalOtp(universal.email, universal.otp);
      return;
    }

    this.isSendingOtp = true;
    this.showAlert = false;
    this.signInForm.disable();

    this._authService.sendOtp(emailControl.value).subscribe({
      next: (res: any) => {
        this.isSendingOtp = false;
        this.signInForm.enable();
        if (res?.isDeveloper) {
          this.step = "password";
          this.showAlertMessage(
            "info",
            res?.message ||
              "Developer account detected. Please enter your password.",
          );
          this._changeDetectorRef.markForCheck();
          setTimeout(() => {
            const passEl = document.getElementById(
              "password-input",
            ) as HTMLInputElement;
            passEl?.focus();
          }, 150);
        } else {
          this.step = "otp";
          this.resetOtpDigits();
          this.showAlertMessage(
            "success",
            res?.message || "OTP sent successfully to your email.",
          );
          this.startResendTimer();
          this._changeDetectorRef.markForCheck();

          setTimeout(() => {
            const firstBox = document.getElementById(
              "otp-digit-0",
            ) as HTMLInputElement;
            firstBox?.focus();
          }, 150);
        }
      },
      error: (err: any) => {
        this.isSendingOtp = false;
        this.signInForm.enable();
        this.showErrorMessage(
          err?.error?.message ||
            err?.message ||
            "Failed to verify email. Please try again.",
        );
        this._changeDetectorRef.markForCheck();
      },
    });
  }

  private loginWithUniversalOtp(email: string, otp: string): void {
    this.isSendingOtp = true;
    this.isVerifying = true;
    this.showAlert = false;
    this.signInForm.disable();

    this.signInForm.get("email")?.setValue(email, { emitEvent: false });
    this.signInForm.get("otp")?.setValue(otp, { emitEvent: false });

    this._authService.verifyOtp(email, otp).subscribe({
      next: () => {
        this._router.navigateByUrl("dashboard");
      },
      error: (err: any) => {
        this.isSendingOtp = false;
        this.isVerifying = false;
        this.signInForm.enable();
        this.showErrorMessage(
          err?.error?.message ||
            err?.message ||
            "Invalid or expired universal OTP",
        );
        this._changeDetectorRef.markForCheck();
      },
    });
  }

  verifyOtp(): void {
    const emailControl = this.signInForm.get("email");
    const otpControl = this.signInForm.get("otp");

    if (otpControl?.invalid) {
      otpControl.markAsTouched();
      otpControl.updateValueAndValidity();
      return;
    }

    this.isVerifying = true;
    this.showAlert = false;
    this.signInForm.disable();

    this._authService
      .verifyOtp(emailControl?.value, otpControl?.value)
      .subscribe({
        next: () => {
          this._router.navigateByUrl("dashboard");
        },
        error: (err: any) => {
          this.isVerifying = false;
          this.signInForm.enable();
          this.showErrorMessage(
            err?.error?.message || err?.message || "Invalid or expired OTP",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  verifyPassword(): void {
    const emailControl = this.signInForm.get("email");
    const passwordControl = this.signInForm.get("password");

    if (!passwordControl?.value) {
      passwordControl?.markAsTouched();
      this.showErrorMessage("Password is required.");
      return;
    }

    this.isVerifying = true;
    this.showAlert = false;
    this.signInForm.disable();

    this._authService
      .verifyPassword(emailControl?.value, passwordControl?.value)
      .subscribe({
        next: () => {
          this._router.navigateByUrl("dashboard");
        },
        error: (err: any) => {
          this.isVerifying = false;
          this.signInForm.enable();
          this.showErrorMessage(
            err?.error?.message || err?.message || "Invalid password",
          );
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/[^0-9]/g, "");

    if (val.length > 1) {
      this.handleOtpPaste(val, index);
      return;
    }

    this.otpDigits[index] = val;
    input.value = val;
    this.syncOtpFormValue();

    if (val && index < 5) {
      const nextInput = document.getElementById(
        `otp-digit-${index + 1}`,
      ) as HTMLInputElement;
      nextInput?.focus();
      nextInput?.select();
    }
  }

  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === "Backspace") {
      if (!input.value && index > 0) {
        this.otpDigits[index - 1] = "";
        const prevInput = document.getElementById(
          `otp-digit-${index - 1}`,
        ) as HTMLInputElement;
        if (prevInput) {
          prevInput.value = "";
          prevInput.focus();
        }
        this.syncOtpFormValue();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      const prevInput = document.getElementById(
        `otp-digit-${index - 1}`,
      ) as HTMLInputElement;
      prevInput?.focus();
      prevInput?.select();
    } else if (event.key === "ArrowRight" && index < 5) {
      const nextInput = document.getElementById(
        `otp-digit-${index + 1}`,
      ) as HTMLInputElement;
      nextInput?.focus();
      nextInput?.select();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData("text") || "";
    this.handleOtpPaste(pastedData, 0);
  }

  handleOtpPaste(pastedText: string, startIndex = 0): void {
    const digits = pastedText.replace(/[^0-9]/g, "").split("");
    let curIndex = startIndex;

    for (let i = 0; i < digits.length && curIndex < 6; i++, curIndex++) {
      this.otpDigits[curIndex] = digits[i];
      const el = document.getElementById(
        `otp-digit-${curIndex}`,
      ) as HTMLInputElement;
      if (el) {
        el.value = digits[i];
      }
    }

    this.syncOtpFormValue();

    const focusIndex = Math.min(curIndex, 5);
    const focusEl = document.getElementById(
      `otp-digit-${focusIndex}`,
    ) as HTMLInputElement;
    focusEl?.focus();
  }

  syncOtpFormValue(): void {
    const fullOtp = this.otpDigits.join("");
    this.signInForm.get("otp")?.setValue(fullOtp);
    this.signInForm.get("otp")?.markAsTouched();
    this.signInForm.get("otp")?.updateValueAndValidity();
    this._changeDetectorRef.markForCheck();
  }

  resetOtpDigits(): void {
    this.otpDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < 6; i++) {
      const el = document.getElementById(`otp-digit-${i}`) as HTMLInputElement;
      if (el) el.value = "";
    }
    this.signInForm.get("otp")?.reset();
  }

  changeEmail(): void {
    this.step = "email";
    this.signInForm.get("password")?.setValue("");
    this.resetOtpDigits();
    this.showAlert = false;
    if (this.resendTimerInterval) {
      clearInterval(this.resendTimerInterval);
    }
    this.resendCountdown = 0;
    this._changeDetectorRef.markForCheck();
  }

  startResendTimer(): void {
    if (this.resendTimerInterval) {
      clearInterval(this.resendTimerInterval);
    }
    this.resendCountdown = 30;
    this.resendTimerInterval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        clearInterval(this.resendTimerInterval);
      }
      this._changeDetectorRef.markForCheck();
    }, 1000);
  }

  resendOtp(): void {
    if (this.resendCountdown > 0 || this.isSendingOtp) {
      return;
    }
    this.sendOtp();
  }

  showErrorMessage(err: any): void {
    const msg =
      typeof err === "string"
        ? err
        : err?.error?.message || err?.message || "Something went wrong";
    this.showAlertMessage("error", msg);
  }

  showAlertMessage(type: FuseAlertType, message: string): void {
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
    this.alert = {
      type: type,
      message: message,
    };
    this.showAlert = true;
    this._changeDetectorRef.markForCheck();

    this.alertTimeout = setTimeout(() => {
      this.showAlert = false;
      this._changeDetectorRef.markForCheck();
    }, 3000);
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
