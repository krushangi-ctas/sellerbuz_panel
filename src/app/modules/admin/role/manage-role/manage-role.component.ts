import { Location } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { fuseAnimations } from "@fuse/animations";
import { FuseUtilsService } from "@fuse/services/utils";
import {
  Feature,
  Role,
  SectionPermission,
} from "app/core/manage-role/role.model";
import { RoleService } from "app/core/manage-role/role.service";
import { Observable, Subject, takeUntil, finalize } from "rxjs";

@Component({
  standalone: false,
  selector: "app-manage-role",
  templateUrl: "./manage-role.component.html",
  animations: fuseAnimations,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageRoleComponent implements OnInit, OnDestroy {
  btnDisable: boolean = false;
  roleFormGroup: FormGroup;
  isLoading: boolean = false;
  roleId = "";
  selectedRole: Role | null = null;
  sections: any[];
  selectedSection = [];
  roleFormInput: Observable<Role[]>;
  featurList: Observable<Feature[]>;
  featureIds: { [key: string]: string[] } = {};
  sectionPermissions: Record<
    string,
    Record<"view" | "delete" | "update" | "add", boolean>
  > = {};
  removeFeatureIds: { [key: string]: string[] } = {};
  removeSectionPermissions: Record<
    string,
    Record<"view" | "delete" | "update" | "add", boolean>
  > = {};

  private _unsubscribeAll: Subject<any> = new Subject<void>();

  constructor(
    private _roleService: RoleService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _route: ActivatedRoute,
    private _location: Location,
    private _formBuilder: FormBuilder,
    private _router: Router,
    private _utilService: FuseUtilsService,
  ) {
    this.featurList = this._roleService.features$;
  }

  ngOnInit(): void {
    // Create the selected role form
    this.roleFormGroup = this._formBuilder.group({
      role_name: ["", [Validators.required, Validators.maxLength(20)]],
    });

    // Update Mode
    if (this._route.snapshot.paramMap.get("id")) {
      this.roleId = this._route.snapshot.paramMap.get("id") || "";
      this.isLoading = true;
      this._roleService
        .getSections()
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(async (res) => {
          this.sections = res.data;
          this._roleService
            .getRoleById(this.roleId)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
              next: (data: any) => {
                this.isLoading = false;
                if (data.status === 200) {
                  if ("data" in data) {
                    const typeD = data.data;

                    this.roleFormGroup
                      .get("role_name")
                      ?.setValue(typeD?.role_name || "");
                    if (
                      typeD.permissions &&
                      Array.isArray(typeD.permissions) &&
                      typeD.permissions.length
                    ) {
                      typeD.permissions.forEach((item) => {
                        const { feature_id, section_id, ...permission } = item;
                        this.featureIds[section_id] = feature_id;
                        this.sectionPermissions[section_id] = {
                          add: permission?.add,
                          delete: permission?.delete,
                          update: permission?.update,
                          view: permission?.view,
                        };
                      });
                    }
                  }

                  this._changeDetectorRef.markForCheck();
                }
              },
              error: () => {
                this.isLoading = false;
                this._changeDetectorRef.markForCheck();
              },
            });
        });
    } else {
      this.getSections();
    }
  }

  addSelectedSection(section, change, permission): void {
    this.sections.forEach((element: any) => {
      if (element._id === section._id) {
        element.permissions[permission.key] = change.checked;
      }
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  getSections(): any {
    this.isLoading = true;
    // Get the section list
    return this._roleService
      .getSections()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.sections = res?.data || [];
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  addRole(): void {
    if (this.roleFormGroup.invalid || this.btnDisable) {
      return;
    }

    this.btnDisable = true;
    const roleName = this.roleFormGroup.getRawValue();

    // Trim all string values in formData
    Object.keys(roleName).forEach((key) => {
      if (typeof roleName[key] === "string") {
        roleName[key] = roleName[key].trim();
      }
    });

    const formData = {
      permissions: this.mapPermissionsFeatureWise(),
      role_name: roleName["role_name"],
    };

    if (!this.roleId) {
      // add new role
      this._roleService
        .addRole(formData)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisable = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: (data) => {
            if (data && data?.status === 200) {
              this._utilService.onSuccess("Role has been added successfully.");
              this._router.navigate(["master/manage-role"]);
            }
          },
          error: ({ error }: { error: { [key: string]: any } }) => {
            this._utilService.onError(error?.message || "Failed to add role");
          },
        });
    } else {
      // update existing one role
      const removedFormData = this.mapPermissionsFeatureWise(true);
      this._roleService
        .updateRole(
          {
            ...formData,
            permissions: [...removedFormData, ...formData.permissions],
          },
          this.roleId,
        )
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisable = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe({
          next: (data) => {
            if (data && data?.status === 200) {
              this._utilService.onSuccess(
                "Role has been updated successfully.",
              );
              this._router.navigate(["master/manage-role"]);
            }
          },
          error: ({ error }: { error: { [key: string]: any } }) => {
            this._utilService.onError(
              error?.message || "Failed to update role",
            );
          },
        });
    }
  }

  goBack(): void {
    this._location.back();
  }

  trackByFn(index: number, item: any): any {
    return item._id || index;
  }

  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent the default form submission behavior
      // this.addUpdateSelectedVAT();
    }
  }
  // Add to your ManageRoleComponent class
  /**
   * Check if a section has all features selected
   */
  isSectionSelected(section: any): boolean {
    return section?._id in this.featureIds;
  }
  /**
   * Check if a specific feature is selected
   */
  isFeatureSelected(section: any, feature: any): boolean {
    if (!section || !feature) {
      return false;
    }
    return this.selectedSection.includes(section?._id);
  }
  /**
   * Toggle all permissions in a section
   */
  toggleSection(event: any, section: any): void {
    const checked = event.checked;
    if (!section?.features) {
      return;
    }
    const sectionId = section._id;

    if (checked) {
      this.sectionPermissions[sectionId] = {
        view: true,
        add: true,
        delete: true,
        update: true,
      };
      this.featureIds[sectionId] = section.features.map((f: any) => f._id);
      delete this.removeFeatureIds[sectionId];
      delete this.removeSectionPermissions[sectionId];
    } else {
      this.removeFeatureIds[sectionId] = this.featureIds[sectionId];
      this.removeSectionPermissions[sectionId] = {
        ...this.sectionPermissions[sectionId],
        add: false,
        update: false,
        delete: false,
        view: false,
      };
      delete this.sectionPermissions[sectionId];
      delete this.featureIds[sectionId];
    }

    this._changeDetectorRef.markForCheck();
  }
  togglePermissionMatrix(
    event: any,
    section: any,
    key: "view" | "update" | "delete" | "add",
  ): void {
    event = !event;
    const sectionId = section?._id;

    if (!this.sectionPermissions[sectionId]) {
      return;
    }
    this.sectionPermissions[sectionId][key] = !!event;

    if (["update", "delete", "add"].includes(key) && !!event) {
      this.sectionPermissions[sectionId]["view"] = true;
    }

    if (["update"].includes(key) && !event) {
      this.sectionPermissions[sectionId]["delete"] = false;
    }

    if (["view"].includes(key) && !event.checked) {
      ["update", "delete", "add"].forEach(
        (i) => (this.sectionPermissions[sectionId][i] = false),
      );
    }
    const allFalse = Object.values(this.sectionPermissions[sectionId]).every(
      (p) => !p,
    );

    if (allFalse) {
      this.removeFeatureIds[sectionId] = this.featureIds[sectionId];
      this.removeSectionPermissions[sectionId] = {
        ...this.sectionPermissions[sectionId],
        add: false,
        update: false,
        delete: false,
        view: false,
      };
      delete this.sectionPermissions[sectionId];
      delete this.featureIds[sectionId];
    } else {
      delete this.removeFeatureIds[sectionId];
      delete this.removeSectionPermissions[sectionId];
    }
    this._changeDetectorRef.markForCheck();
  }
  isPermissionMatrixSelected(section: any, key: string): boolean {
    key = key.toLowerCase();
    const permissions = this.sectionPermissions?.[section?._id];
    return permissions ? permissions[key] : false;
  }
  isSectionHavePermision(section: any): boolean {
    return !!this.sectionPermissions?.[section?._id];
  }
  isFormValid(): boolean {
    return Object.keys(this.sectionPermissions).length > 0;
  }
  mapPermissionsFeatureWise(forUpdates = false): SectionPermission[] {
    const permMap: SectionPermission[] = [];
    Object.entries(
      !forUpdates ? this.featureIds : this.removeFeatureIds,
    ).forEach(([sectionId, featureList]) => {
      const perms = !forUpdates
        ? this.sectionPermissions[sectionId]
        : this.removeSectionPermissions[sectionId];
      if (perms) {
        featureList.forEach((featureId) => {
          permMap.push({
            section_id: sectionId,
            feature_id: featureId,
            ...perms,
          });
        });
      }
    });

    return permMap;
  }
}
