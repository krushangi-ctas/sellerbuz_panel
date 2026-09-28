import { AbstractControl, ValidatorFn } from "@angular/forms";

export function urlValidator(): ValidatorFn {
  const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
  return (control: AbstractControl): { [key: string]: any } | null => {
    const isValid = urlPattern.test(control.value);
    return isValid ? null : { invalidUrl: true };
  };
}
