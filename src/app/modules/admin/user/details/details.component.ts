import { FuseUtilsService } from "@fuse/services/utils";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
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
import { UserListComponent } from "../list/list.component";
import { UserService } from "app/core/user/user.service";
import { User } from "app/core/user/user.types";
import { environment } from "environments/environment";
import { RoleService } from "app/core/manage-role/role.service";
import { createDragRef } from "@angular/cdk/drag-drop";

@Component({
  standalone: false,
  selector: "contacts-details",
  templateUrl: "./details.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      "flex flex-col flex-auto w-full h-full min-h-full bg-white dark:bg-gray-900",
  },
})
export class UserDetailsComponent implements OnInit, OnDestroy {
  editMode: boolean = false;
  tagsEditMode: boolean = false;
  sellerForm: FormGroup;
  seller: any;
  imgPath = environment.uploadPath;
  btnDisable: boolean;
  isLoading: boolean;
  isAdd: boolean = false;
  userId: any;
  rolesList: Record<string, string | number>[] = [];
  roleFilterCtrl: FormControl = new FormControl("");
  filteredRolesList: Record<string, string | number>[] = [];
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  private _tagsPanelOverlayRef: OverlayRef;

  /**
   * Constructor
   */
  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _UserListComponent: UserListComponent,
    private _activatedRoute: ActivatedRoute,
    private _userService: UserService,
    private _utilService: FuseUtilsService,
    private _router: Router,
    private _formBuilder: FormBuilder,
    private _roleService: RoleService,
  ) {}
  //getAllRole

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    this._userService.clearSeller();

    this._roleService
      .getAllRole()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (data && data?.status === 200) {
          this.rolesList = data.data || [];
          this.filteredRolesList = [...this.rolesList];
          this._changeDetectorRef.markForCheck();
        }
      });
    // Open the drawer
    this._UserListComponent.matDrawer.open();

    // Create the contact form
    this.sellerForm = this._formBuilder.group({
      first_name: new FormControl("", [
        Validators.required,
        Validators.maxLength(20),
      ]),
      last_name: new FormControl("", [
        Validators.required,
        Validators.maxLength(20),
      ]),
      contact_no: new FormControl("", [
        Validators.required,
        Validators.pattern("^[0-9]{10}$"), // validate 10 digit number
      ]),
      email: new FormControl("", [Validators.required, Validators.email]),
      business_address: new FormControl(""), // Business Address
      role: new FormControl("", [Validators.required]),
    });

    this._activatedRoute.paramMap
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((params) => {
        const id = params.get("id");
        const isEditUrl =
          this._router.url.includes("/edit/") ||
          this._activatedRoute.snapshot.url.some(
            (segment) => segment.path === "edit",
          ) ||
          this._activatedRoute.snapshot.pathFromRoot.some((r) =>
            r.url.some((s) => s.path === "edit"),
          );

        this._UserListComponent.matDrawer.open();

        if (!id || id === "add") {
          this.isAdd = true;
          this.editMode = true;
          this.seller = null;
          this.sellerForm.reset({
            first_name: "",
            last_name: "",
            contact_no: "",
            email: "",
            business_address: "",
            role: "",
          });
          this._changeDetectorRef.detectChanges();
        } else {
          this.isAdd = false;
          this.userId = id;
          this.getUserById(id, isEditUrl);
        }
      });
  }

  getUserById(userId: string, isEditUrl: boolean = false): void {
    this.isLoading = true;
    this._userService
      .getUserById(userId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          const user = res?.data || res;
          if (user) {
            this.seller = user;
            this.sellerForm.patchValue({
              first_name: user.first_name || "",
              last_name: user.last_name || "",
              contact_no: user.contact_no || "",
              email: user.email || "",
              business_address: user.business_address || "",
              role: user.roleId || user.role || "",
            });
            this.toggleEditMode(isEditUrl);
            this._changeDetectorRef.detectChanges();
          }
        },
        error: (err) => {
          this.isLoading = false;
          this._utilService.onError(
            err?.error?.message || "Failed to load user details",
          );
          this._changeDetectorRef.detectChanges();
        },
      });
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
   * Close the drawer
   */
  closeDrawer(): Promise<MatDrawerToggleResult> {
    return this._UserListComponent.matDrawer.close();
  }

  /**
   * Handle close or cancel navigation
   */
  onClose(): void {
    this.closeDrawer().then(() => {
      this._router.navigate(["./"], {
        relativeTo: this._activatedRoute.parent,
      });
    });
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

    this._changeDetectorRef.markForCheck();
  }

  /**
   * Update the contact
   */
  addUpdateSelectedUser(id: string): void {
    if (this.sellerForm.invalid || this.btnDisable) {
      return;
    }
    this.btnDisable = true;
    const formData = this.sellerForm.getRawValue();
    const targetId = id || this.userId || this.seller?._id || this.seller?.id;

    if (!this.isAdd && targetId) {
      Object.assign(formData, { isPremisesUser: true });
      this._userService
        .updateUser(targetId, formData)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisable = false;
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: (newData: any) => {
            this._utilService.onSuccess("User has been updated successfully.");
            this._UserListComponent.fetchUsers();
            this._router.navigate(["./"], {
              relativeTo: this._activatedRoute.parent,
            });
            this.closeDrawer();
          },
          error: ({ error }) => {
            this._utilService.onError(
              error?.message ||
                error?.error?.message ||
                "Failed to update user",
            );
          },
        });
    } else {
      Object.assign(formData, { isPremisesUser: true });
      this._userService
        .addUser(formData)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisable = false;
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: (t) => {
            this._utilService.onSuccess("User has been added successfully.");
            this.sellerForm.reset();
            this._UserListComponent.fetchUsers();
            this._router.navigate(["./"], {
              relativeTo: this._activatedRoute.parent,
            });
            this.closeDrawer();
          },
          error: ({ error }) => {
            this._utilService.onError(
              error?.message || error?.error?.message || "Failed to add user",
            );
          },
        });
    }
  }

  /**
   * Toggle the tags edit mode
   */
  toggleTagsEditMode(): void {
    this.tagsEditMode = !this.tagsEditMode;
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

  /**
   * Transform avatar URL to use primary color
   */
  transformAvatarUrl(profileImgUrl: string): string {
    return this._userService.transformAvatarUrl(profileImgUrl);
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

  compareFn(o1: any, o2: any): boolean {
    if (o1 === o2) return true;
    if (!o1 || !o2) return false;
    const id1 = typeof o1 === "object" ? o1.id || o1._id : o1;
    const id2 = typeof o2 === "object" ? o2.id || o2._id : o2;
    return id1 === id2;
  }
}
