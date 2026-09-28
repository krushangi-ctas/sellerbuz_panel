import { FuseUtilsService } from "@fuse/services/utils";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { OverlayRef } from "@angular/cdk/overlay";
import { MatDrawerToggleResult } from "@angular/material/sidenav";
import { Subject, takeUntil, finalize } from "rxjs";
import { SellerUserListComponent } from "../list/list.component";
import { User } from "app/core/user/user.types";
import { environment } from "environments/environment";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { SellerUserService } from "app/core/user/seller-user.service";
import { UserService } from "app/core/user/user.service";
import { SellerRoleService } from "app/core/seller-role/seller-role.service";
import { resolveMediaUrl } from "app/shared/common";

@Component({
  standalone: false,
  selector: "seller-user-details",
  templateUrl: "./details.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      "flex flex-col flex-auto w-full h-full min-h-full bg-white dark:bg-gray-800",
  },
})
export class SellerUserDetailsComponent implements OnInit, OnDestroy {
  @ViewChild("avatarFileInput") avatarFileInput: ElementRef<HTMLInputElement>;
  editMode: boolean = false;
  tagsEditMode: boolean = false;
  sellerForm: FormGroup;
  seller: any;
  imgPath = environment.uploadPath;
  btnDisable: boolean;
  isLoading: boolean;
  isAdd: boolean = false;
  userId: any;
  rolesList: any[] = [];
  roleFilterCtrl: FormControl = new FormControl("");
  filteredRolesList: any[] = [];
  selectedAvatar: string = "";
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  private _tagsPanelOverlayRef: OverlayRef;

  /**
   * Constructor
   */
  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _sellerUserListComponent: SellerUserListComponent,
    private _activatedRoute: ActivatedRoute,
    private _sellerUserService: SellerUserService,
    private _utilService: FuseUtilsService,
    private _router: Router,
    private _formBuilder: FormBuilder,
    private _confirmationService: FuseConfirmationService,
    private _userSessionService: UserSessionsService,
    private _userService: UserService,
    private _sellerRoleService: SellerRoleService,
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Open the drawer
    this._sellerUserListComponent.matDrawer.open();

    // Create the contact form
    this.sellerForm = this._formBuilder.group({
      _id: [""],
      first_name: ["", [Validators.required, Validators.maxLength(20)]],
      last_name: ["", [Validators.required, Validators.maxLength(20)]],
      email: ["", [Validators.required, Validators.email]],
      contact_no: ["", [this.maxDigitsValidator(10)]],
      role_id: ["", Validators.required],
      avatar: [""],
      status: ["active"],
    });

    // Get roles
    this.getAllRoles();

    // Get the contacts
    this._sellerUserService.seller$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((contact: User) => {
        // Open the drawer in case it is closed
        this._sellerUserListComponent.matDrawer.open();
        // Get the contact
        this.seller = contact;
        this.selectedAvatar = contact?.profileImgUrl
          ? resolveMediaUrl(contact.profileImgUrl, { basePath: this.imgPath })
          : contact?.avatar
            ? resolveMediaUrl(contact.avatar, { basePath: this.imgPath })
            : "";

        // Toggle the edit mode off
        this.toggleEditMode(false);

        // Mark for check
        this._changeDetectorRef.markForCheck();
      });

    this._activatedRoute.paramMap
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((params) => {
        const userId = params.get("id");
        const isAddRoute =
          this._activatedRoute.snapshot.url[0]?.path === "add" ||
          userId === "add";

        this._sellerUserListComponent.matDrawer.open();

        if (isAddRoute) {
          this.isAdd = true;
          this.editMode = true;
          this.seller = null;
          this.sellerForm.reset({
            status: "active",
          });
          this._changeDetectorRef.markForCheck();
        } else if (userId) {
          this.isAdd = false;
          this.editMode = this.shouldOpenEditMode();
          this.getSellerUserById(userId);
        }
      });
  }
  maxDigitsValidator(maxDigits: number = 10) {
    return (control: any) => {
      const value =
        control.value !== null && control.value !== undefined
          ? String(control.value)
          : "";
      const digitsOnly = value.replace(/\D/g, "");

      if (digitsOnly.length > maxDigits) {
        const truncatedValue = digitsOnly.slice(0, maxDigits);

        // Update form control state silently to block extra inputs instantly
        control.setValue(truncatedValue, { emitEvent: false });

        return {
          maxDigits: { required: maxDigits, actual: digitsOnly.length },
        };
      }
      return null;
    };
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();

    // Dispose the overlays if they are still on the DOM
    if (this._tagsPanelOverlayRef) {
      this._tagsPanelOverlayRef.dispose();
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get all roles
   */
  getAllRoles(): void {
    const sellerId = this.getSellerId();
    this._sellerRoleService
      .getAllRoles(sellerId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response) => {
          this.rolesList = response.data || [];
          this.filteredRolesList = [...this.rolesList];
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          console.error("Error loading roles:", err);
          this.rolesList = [];
          this.filteredRolesList = [];
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  /**
   * Get seller user by id
   */
  getSellerUserById(userId: string): void {
    this.isLoading = true;
    this._sellerUserService
      .getSellerUserById(userId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.status === 200) {
            this.seller = response.data;
            this.patchFormData(response.data);
            this.toggleEditMode(this.shouldOpenEditMode());
          }
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  /**
   * Patch form data
   */
  patchFormData(data: any): void {
    this.sellerForm.patchValue({
      _id: data._id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      contact_no: data.contact_no,
      role_id: data.role_id || data.role,
      avatar: data.avatar,
      status: this.normalizeStatus(data.status),
    });
    this.selectedAvatar = data.profileImgUrl
      ? resolveMediaUrl(data.profileImgUrl, { basePath: this.imgPath })
      : data.avatar
        ? resolveMediaUrl(data.avatar, { basePath: this.imgPath })
        : "";
  }

  /**
   * Close the drawer
   */
  closeDrawer(): Promise<MatDrawerToggleResult> {
    return this._sellerUserListComponent.matDrawer.close();
  }

  /**
   * Toggle edit mode
   *
   * @param editMode
   */
  toggleEditMode(editMode: boolean | null = null): void {
    if (editMode === null) {
      this.editMode = !this.editMode;
    } else {
      this.editMode = editMode;
    }

    // Mark for check
    this._changeDetectorRef.markForCheck();
  }

  triggerAvatarUpload(): void {
    this.avatarFileInput?.nativeElement?.click();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const allowedExtension = ["jpeg", "jpg", "png"];
    const mimeType = file.type.split("/")[1]?.toLowerCase();
    if (!allowedExtension.includes(mimeType)) {
      this._utilService.onError("Please select only JPEG/JPG/PNG file");
      input.value = "";
      this._changeDetectorRef.markForCheck();
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    this._userService
      .uploadImage(uploadFormData)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response: any) => {
          const avatar = response?.picture || "";
          this.sellerForm.get("avatar")?.setValue(avatar);
          this.selectedAvatar = avatar
            ? resolveMediaUrl(avatar, { basePath: this.imgPath })
            : "";
          if (this.seller) {
            this.seller.avatar = avatar;
            this.seller.profileImgUrl = this.selectedAvatar;
          }
          input.value = "";
          this._utilService.onSuccess("Image uploaded successfully");
          this._changeDetectorRef.markForCheck();
        },
        error: ({ error }) => {
          input.value = "";
          this._utilService.onError(error?.message || "Failed to upload image");
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  /**
   * Update the contact
   */
  updateSellerUser(): void {
    if (this.sellerForm.invalid || this.btnDisable) {
      return;
    }

    this.btnDisable = true;
    // Get the contact object
    const userData = this.sellerForm.getRawValue();
    // Map role_id to role for API compatibility
    const apiData: any = {
      ...userData,
      role: userData.role_id,
    };

    const targetId = userData._id || this.seller?._id || this.seller?.id;

    if (targetId || !this.isAdd) {
      // Update existing user
      this._sellerUserService
        .updateSellerUser(targetId, apiData, targetId)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisable = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: () => {
            this._utilService.onSuccess("User updated successfully");
            this.closeDrawer().then(() => {
              this.clearEditQueryParams();

              this._router.navigate(["../"], {
                relativeTo: this._activatedRoute,
              });
            });
            this._sellerUserService
              .getSellerUsers(this.getSellerId())
              .pipe(takeUntil(this._unsubscribeAll))
              .subscribe();
          },
          error: (err) => {
            this._utilService.onError(
              err?.error?.message || "Failed to update user",
            );
          },
        });
    } else {
      // Create new user
      this._sellerUserService
        .createSellerUser(apiData, this.getSellerId(), this.getActorId())
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisable = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: () => {
            this._utilService.onSuccess("User created successfully");
            this.closeDrawer().then(() => {
              this._router.navigate(["../"], {
                relativeTo: this._activatedRoute,
              });
            });
            this._sellerUserService
              .getSellerUsers(this.getSellerId())
              .pipe(takeUntil(this._unsubscribeAll))
              .subscribe();
          },
          error: (err) => {
            this._utilService.onError(
              err?.error?.message || "Failed to create user",
            );
          },
        });
    }
  }

  /**
   * Handle back navigation
   */
  onBack(): void {
    this.closeDrawer().then(() => {
      this.clearEditQueryParams();
      this._router.navigate(["../"], { relativeTo: this._activatedRoute });
    });
  }

  /**
   * Handle cancel button click
   */
  onCancel(): void {
    this.onBack();
  }

  /**
   * Delete the contact
   */
  deleteSellerUser(): void {
    // Create confirmation config
    const confirmationConfig = {
      title: "Remove user",
      message: "Are you sure you want to remove this user?",
      icon: {
        show: true,
        name: "heroicons_outline:exclamation",
        color: "warn" as const,
      },
      actions: {
        confirm: {
          show: true,
          label: "Remove",
          color: "warn" as const,
        },
        cancel: {
          show: true,
          label: "Cancel",
        },
      },
      dismissible: true,
    };

    const dialogRef = this._confirmationService.open(confirmationConfig);
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((result) => {
        if (result === "confirmed") {
          const userId = this.sellerForm.get("_id")?.value;
          this._sellerUserService
            .deleteSellerUser(userId, this.getActorId())
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
              next: () => {
                this._utilService.onSuccess("User deleted successfully");
                this.closeDrawer().then(() => {
                  this._router.navigate(["../"], {
                    relativeTo: this._activatedRoute,
                  });
                });
                this._sellerUserService
                  .getSellerUsers(this.getSellerId())
                  .pipe(takeUntil(this._unsubscribeAll))
                  .subscribe();
              },
              error: (err) => {
                this._utilService.onError(
                  err?.error?.message || "Failed to delete user",
                );
              },
            });
        }
      });
  }

  /**
   * Track by function for ngFor loops
   *
   * @param index
   * @param item
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  private getSellerId(): string {
    return (
      this._userSessionService.getCurrentUser()?.id ||
      this._userSessionService.getLocalUser() ||
      ""
    );
  }

  private getActorId(): string {
    return this._userSessionService.getLocalUser() || "admin";
  }

  private normalizeStatus(
    status: string | number | boolean,
  ): "active" | "inactive" {
    return status === "active" ||
      status === 1 ||
      status === "1" ||
      status === true
      ? "active"
      : "inactive";
  }

  private shouldOpenEditMode(): boolean {
    return this._activatedRoute.snapshot.queryParamMap.get("edit") === "true";
  }

  private clearEditQueryParams(): void {
    this._router.navigate([], {
      relativeTo: this._activatedRoute,
      queryParams: { edit: null },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  filterRoles(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === "") {
      this.filteredRolesList = [...this.rolesList];
    } else {
      const lower = searchTerm.toLowerCase();
      this.filteredRolesList = this.rolesList.filter(
        (role: any) =>
          role?.role_name && role.role_name.toLowerCase().includes(lower),
      );
    }
    this._changeDetectorRef.markForCheck();
  }

  triggerRoleEvent(): void {
    this.filteredRolesList = [...this.rolesList];
    this.roleFilterCtrl.setValue("");
  }
}
