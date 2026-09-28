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
import { LocalStorageService } from "app/core/local/local-storage.service";
import { UserService } from "app/core/user/user.service";
import { PlanService } from "app/core/manage-plan/plan.service";
import { environment } from "environments/environment";
import { Subject, takeUntil, finalize } from "rxjs";

@Component({
  standalone: false,
  selector: "profile",
  templateUrl: "./profile.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: fuseAnimations,
})
export class ProfileComponent implements OnInit, OnDestroy {
  userId = "";
  isLoading: boolean = false;
  selectedFile: File;
  userProfileFormGroup: FormGroup;
  selectedImage: string = "";
  imgPath = environment.uploadPath;
  roles: ["a", "b"];
  isSuperAdmin: boolean = true;
  imageError = false;
  countries: any[] = [];
  countriesLoading = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _formBuilder: FormBuilder,
    private _localService: LocalStorageService,
    private _userService: UserService,
    private _utilService: FuseUtilsService,
    private _planService: PlanService,
  ) {}

  ngOnInit(): void {
    // user profile form
    this.userProfileFormGroup = this._formBuilder.group({
      avatar: [""],
      first_name: ["", Validators.required],
      last_name: ["", Validators.required],
      email: [
        { value: "", disabled: true },
        [Validators.required, Validators.email],
      ],
      contact_no: ["", Validators.pattern("^[0-9]{10}$")],
      role_id: [null],
      business_address: [""],
      country_name: [""],
    });

    this.getUserData();

    // Get the Role list
    // this._masterService.getRoles().pipe(takeUntil(this._unsubscribeAll)).subscribe((data: any) => {
    //     this.roles = data.roles;
    //     this._changeDetectorRef.markForCheck();
    // });
    this.loadCountries();
  }

  loadCountries(): void {
    this.countriesLoading = true;
    this._planService.getCurrencies().subscribe({
      next: (res: any) => {
        this.countriesLoading = false;
        if (
          (res?.status === 1 || res?.status === 200) &&
          Array.isArray(res.data)
        ) {
          this.countries = res.data.map((c: any) => ({
            ...c,
            id: c.id || c._id,
          }));
        }
        this._changeDetectorRef.markForCheck();
      },
      error: () => {
        this.countriesLoading = false;
        this._changeDetectorRef.markForCheck();
      },
    });
  }

  getUserData(): void {
    const userInfo: any = this._localService.getItem("user");
    if (!userInfo) {
      return;
    }
    this.userProfileFormGroup.patchValue(userInfo);
    if (!this.userProfileFormGroup.get("country_name")?.value) {
      this.userProfileFormGroup.get("country_name")?.setValue("");
    }
    this.selectedImage =
      userInfo.profileImgUrl?.length > 0
        ? userInfo.profileImgUrl.startsWith("http")
          ? userInfo.profileImgUrl
          : this.imgPath + userInfo.profileImgUrl
        : userInfo.avatar?.length > 0
          ? userInfo.avatar.startsWith("http")
            ? userInfo.avatar
            : this.imgPath + "profile/" + userInfo.avatar
          : "";
    if (userInfo.role_id) {
      this.isSuperAdmin = false;
    }
    this._changeDetectorRef.markForCheck();
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  onFileUpload(event): void {
    this.selectedFile = event?.target?.files?.[0];
    if (!this.selectedFile) {
      return;
    }
    const imageSize = this.selectedFile.size;
    if (imageSize > 1024000) {
    }

    const allowedExtension = ["jpeg", "jpg", "png"];
    const mimeType = this.selectedFile.type.split("/")[1];
    if (!allowedExtension.includes(mimeType)) {
      this._utilService.onError("Please select only JPEG/JPG/PNG file");
      this._changeDetectorRef.markForCheck();
      return;
    }

    const readers = new FileReader();
    readers.readAsDataURL(this.selectedFile);
    this.OnUploadFile();
  }

  OnUploadFile(): void {
    const uploadFormData = new FormData();
    uploadFormData.append("file", this.selectedFile);
    this._userService
      .uploadImage(uploadFormData)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        this.selectedImage = data?.profileImgUrl || "";
        // Get existing user from localStorage
        const user = this._localService.getItem("user") || {};
        // Update profileImgUrl and avatar
        if (data?.profileImgUrl) {
          user.profileImgUrl = data.profileImgUrl;
          user.avatar = data.profileImgUrl.startsWith("http")
            ? data.profileImgUrl
            : this.imgPath + data.profileImgUrl;
        }
        // Save back to localStorage and update user stream
        this._localService.setItem("user", user);
        this._userService.user = user;
        this._changeDetectorRef.markForCheck();
      });
  }

  deleteImage(): void {
    this._userService
      .deleteImage({ fileName: this.selectedImage })
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        const user = this._localService.getItem("user");
        user.profileImgUrl = "";
        user.avatar = "";
        this._localService.setItem("user", user);
        this._userService.user = user;
        this._changeDetectorRef.markForCheck();
      });
    this.selectedImage = "";
  }

  updateProfile(): void {
    if (this.userProfileFormGroup.invalid || this.isLoading) {
      return;
    }
    // Get the user form data
    const formData = this.userProfileFormGroup.getRawValue();
    this.isLoading = true;
    formData.avatar = this.selectedImage;
    this._userService
      .update(formData)
      .pipe(
        takeUntil(this._unsubscribeAll),
        finalize(() => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        }),
      )
      .subscribe((data: any) => {
        if (data.status === 200) {
          if (data.data && !data.data.avatar && data.data.profileImgUrl) {
            data.data.avatar = data.data.profileImgUrl.startsWith("http")
              ? data.data.profileImgUrl
              : this.imgPath + data.data.profileImgUrl;
          }
          this._localService.setItem("user", data.data);
          this._userService.user = data.data;
          this._utilService.onSuccess("Profile updated successfully.");
        } else {
          this._utilService.onError(data.message);
        }
      });
  }

  onPhoneNumberInput(event: any): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length > 10) {
      input.value = input.value.slice(0, 10);
      this.userProfileFormGroup.get("contact_no")?.setValue(input.value);
    }
  }

  stopScrollingWheel(e): any {
    return e.target.blur();
  }
  getInitials(): string {
    const first =
      this.userProfileFormGroup.get("first_name")?.value?.charAt(0) || "";

    const last =
      this.userProfileFormGroup.get("last_name")?.value?.charAt(0) || "";

    return (first + last).toUpperCase();
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
