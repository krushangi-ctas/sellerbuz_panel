import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  NgForm,
  Validators,
  FormControl,
} from "@angular/forms";
import { Router } from "@angular/router";
import { fuseAnimations } from "@fuse/animations";
import { FuseAlertType } from "@fuse/components/alert";
import { AuthService } from "app/core/auth/auth.service";
import { PasswordValidation } from "app/core/helpers/password-validator";
import { finalize } from "rxjs";

@Component({
  standalone: false,
  selector: "auth-sign-up",
  templateUrl: "./sign-up.component.html",
  styleUrls: ["./sign-up.component.scss"],
  encapsulation: ViewEncapsulation.None,
  animations: fuseAnimations,
})
export class AuthSignUpComponent implements OnInit {
  @ViewChild("signUpNgForm") signUpNgForm: NgForm;

  alert: { type: FuseAlertType; message: string } = {
    type: "success",
    message: "",
  };
  signUpForm: UntypedFormGroup;
  showAlert = false;

  /**
   * Constructor
   */
  constructor(
    private _authService: AuthService,
    private _formBuilder: UntypedFormBuilder,
    private _router: Router,
    private _changeDetectorRef: ChangeDetectorRef,
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    this.signUpForm = this._formBuilder.group(
      {
        first_name: new FormControl("", Validators.required),
        last_name: new FormControl("", Validators.required),
        contact_no: new FormControl("", [
          Validators.required,
          Validators.pattern("^[0-9]{10}$"),
        ]),
        email: new FormControl("", [Validators.required, Validators.email]),
        business_address: new FormControl(""),
        password: new FormControl("", [PasswordValidation.PasswordPattern]),
        confirm_password: new FormControl(""),
      },
      {
        validators: PasswordValidation.PasswordMatch,
      },
    );
  }

  onContactInput(): void {
    const control = this.signUpForm.get("contact_no");
    if (!control) return;
    control.setValue(control.value.replace(/\D/g, "").slice(0, 10), {
      emitEvent: false,
    });
  }
  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Sign up
   */
  signUp(): void {
    if (this.signUpForm.invalid || this.signUpForm.disabled) {
      this.signUpForm.markAllAsTouched();
      this.signUpForm.updateValueAndValidity();
      return;
    }

    // Disable the form
    this.signUpForm.disable();

    // Hide the alert initially
    this.showAlert = false;

    this._authService
      .signUp(this.signUpForm.value)
      .pipe(
        finalize(() => {
          this.signUpForm.enable();
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          this.alert = {
            type: "success",
            message: response.message || "You have signed up successfully!",
          };
          // Navigate to the confirmation required page
          // Show the alert
          this.showAlert = true;
          // Optionally, reset the form if needed
          this.signUpNgForm.resetForm();

          setTimeout(() => {
            this.showAlert = false;
            this._changeDetectorRef.markForCheck();
            this._router.navigateByUrl("/sign-in");
          }, 3000);
        },
        error: (error) => {
          this.alert = {
            type: "error",
            message:
              error.error?.message || "Something went wrong, please try again.",
          };
          this.showAlert = true;
          setTimeout(() => {
            this.showAlert = false;
            this._changeDetectorRef.markForCheck();
          }, 4000);
        },
      });
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
