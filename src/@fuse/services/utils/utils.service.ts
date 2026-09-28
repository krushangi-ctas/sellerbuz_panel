import { Injectable } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { IsActiveMatchOptions } from "@angular/router";
import { FuseAlertService } from "@fuse/components/alert";
import { AlertService } from "app/core/alert/alert.service";

@Injectable({
  providedIn: "root",
})
export class FuseUtilsService {
  /**
   * Constructor
   */
  constructor(
    private _alertService: AlertService,
    private _fuseAlertService: FuseAlertService,
    private _formBuilder: FormBuilder,
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get the equivalent "IsActiveMatchOptions" options for "exact = true".
   */
  get exactMatchOptions(): IsActiveMatchOptions {
    return {
      paths: "exact",
      fragment: "ignored",
      matrixParams: "ignored",
      queryParams: "exact",
    };
  }

  /**
   * Get the equivalent "IsActiveMatchOptions" options for "exact = false".
   */
  get subsetMatchOptions(): IsActiveMatchOptions {
    return {
      paths: "subset",
      fragment: "ignored",
      matrixParams: "ignored",
      queryParams: "subset",
    };
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Generates a random id
   *
   * @param length
   */
  randomId(length = 10): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let name = "";

    for (let i = 0; i < length; i++) {
      name += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return name;
  }

  onSuccess(message: string, redirectUrl?: string): void {
    if (!message) {
      return; // Avoid showing empty or undefined error messages
    }
    this._alertService.message = message;
    this._alertService.redirectUrl = redirectUrl || null;
    this._fuseAlertService.show("alert_success");
    const timeout = redirectUrl ? 6000 : 3000;
    setTimeout(() => {
      this._fuseAlertService.dismiss("alert_success");
      if (redirectUrl && this._alertService.redirectUrl === redirectUrl) {
        this._alertService.redirectUrl = null;
      }
    }, timeout);
  }

  onError(errorMessage: string): void {
    if (!errorMessage) {
      return; // Avoid showing empty or undefined error messages
    }
    this._alertService.message = errorMessage;
    this._fuseAlertService.show("alert_error");
    setTimeout(() => {
      this._alertService.message = "";
      this._fuseAlertService.dismiss("alert_error");
    }, 3000);
  }

  confirmMessage(title: string, message: any, label: string): any {
    return this._formBuilder.group({
      title: title,
      message: message,
      icon: this._formBuilder.group({
        show: true,
        name: "heroicons_outline:exclamation",
        color: "warn",
      }),
      actions: this._formBuilder.group({
        confirm: this._formBuilder.group({
          show: true,
          label: label,
          color: "warn",
        }),
        cancel: this._formBuilder.group({
          show: true,
          label: "Cancel",
        }),
      }),
      dismissible: true,
    });
  }
  downloadCsv(path: string, fileName: string): any {
    const url = path;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    this.onSuccess("File Downloaded successfully!");
  }

  fileConfirmationMessage(
    title: string,
    message: string,
    label: string,
    iconColor: string,
    actionColor: string,
  ): any {
    return this._formBuilder.group({
      title: title,
      message: message,
      icon: this._formBuilder.group({
        show: true,
        name: "heroicons_outline:exclamation",
        color: iconColor,
      }),
      actions: this._formBuilder.group({
        confirm: this._formBuilder.group({
          show: true,
          label: label,
          color: actionColor,
        }),
        cancel: this._formBuilder.group({
          show: true,
          label: "Cancel",
        }),
      }),
      dismissible: true,
    });
  }
}
