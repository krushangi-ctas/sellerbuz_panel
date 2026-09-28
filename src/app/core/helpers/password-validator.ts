import { AbstractControl, ValidationErrors } from "@angular/forms";
export class PasswordValidation {
  static MatchPassword(abstract: AbstractControl): any {
    const password = abstract.get("newPassword").value;
    if (
      abstract.get("confirmPassword").touched ||
      abstract.get("confirmPassword").dirty
    ) {
      const confirmPassword = abstract.get("confirmPassword").value;

      if (password !== confirmPassword) {
        abstract.get("confirmPassword").setErrors({ MatchPassword: true });
      } else {
        return null;
      }
    }
  }

  static PasswordMatch(abstract: AbstractControl): any {
    const password = abstract.get("password").value;
    if (
      abstract.get("confirm_password").touched ||
      abstract.get("confirm_password").dirty
    ) {
      const confirmPassword = abstract.get("confirm_password").value;

      if (password !== confirmPassword) {
        abstract.get("confirm_password").setErrors({ MatchPassword: true });
      } else {
        return null;
      }
    }
  }

  static PasswordPattern(control: AbstractControl): ValidationErrors | null {
    const password = control.value;

    // If the password is empty, don't return an error
    if (!password) {
      return null;
    }

    const hasNumber = /[0-9]/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);

    if (!hasNumber || !hasLetter) {
      return { passwordPattern: true };
    }
    return null;
  }
}
