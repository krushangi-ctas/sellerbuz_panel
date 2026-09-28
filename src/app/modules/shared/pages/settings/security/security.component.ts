import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { UntypedFormBuilder, UntypedFormGroup } from "@angular/forms";

@Component({
  standalone: false,
  selector: "settings-security",
  templateUrl: "./security.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSecurityComponent implements OnInit {
  securityForm: UntypedFormGroup;

  /**
   * Constructor
   */
  constructor(private _formBuilder: UntypedFormBuilder) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Create the form
    this.securityForm = this._formBuilder.group({
      currentPassword: [""],
      newPassword: [""],
      twoStep: [true],
      askPasswordChange: [false],
    });
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
