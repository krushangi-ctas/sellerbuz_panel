import { Location } from "@angular/common";
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { fuseAnimations } from "@fuse/animations";
import { FuseUtilsService } from "@fuse/services/utils";
import { Observable, Subject, takeUntil, finalize } from "rxjs";
import {
  SellerFeature,
  SellerRole,
  SellerSectionPermission,
} from "app/core/seller-role/seller-role.model";
import { SellerRoleService } from "app/core/seller-role/seller-role.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";

@Component({
  standalone: false,
  selector: "app-manage-seller-role",
  templateUrl: "./manage-seller-role.component.html",
  styleUrls: ["./manage-seller-role.component.scss"],
  animations: fuseAnimations,
})
export class ManageSellerRoleComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  btnDisable: boolean = false;
  roleFormGroup: FormGroup;
  roleId = "";
  sections: any[];
  displaySections: SellerFeature[] = [];
  selectedSection = [];
  roleFormInput: Observable<SellerRole[]>;
  featurList: Observable<SellerFeature[] | null>;
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
  readonly permissionKeys: Array<"view" | "update" | "delete" | "add"> = [
    "view",
    "update",
    "delete",
    "add",
  ];
  private _unsubscribeAll: Subject<any> = new Subject<void>();

  constructor(
    private _sellerRoleService: SellerRoleService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _route: ActivatedRoute,
    private _location: Location,
    private _formBuilder: FormBuilder,
    private _utilService: FuseUtilsService,
    private _userSessionService: UserSessionsService,
  ) {
    this.featurList = this._sellerRoleService.features$;
  }

  ngOnInit(): void {
    this.roleFormGroup = this._formBuilder.group({
      role_name: ["", [Validators.required, Validators.maxLength(20)]],
    });

    this.isLoading = true;
    this._sellerRoleService
      .getActiveFeaturesAndSectionsList()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response) => {
          this.displaySections = this.normalizeSections(response?.data);
          if (!this.roleId) {
            this.isLoading = false;
          }
          this._changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
      });

    if (this._route.snapshot.paramMap.get("id")) {
      this.roleId = this._route.snapshot.paramMap.get("id") || "";
      this._sellerRoleService
        .getSections()
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((res) => {
          this.sections = res.data;
          this._sellerRoleService
            .getSellerRoleById(this.roleId)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
              next: (data: any) => {
                this.isLoading = false;
                if (data.status === 200 && "data" in data) {
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
                      this.featureIds[section_id] =
                        this.featureIds[section_id] || [];
                      if (
                        feature_id &&
                        !this.featureIds[section_id].includes(feature_id)
                      ) {
                        this.featureIds[section_id].push(feature_id);
                      }
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

  ngOnDestroy(): void {
    this._unsubscribeAll.next(0);
    this._unsubscribeAll.complete();
  }

  getSections(): any {
    return this._sellerRoleService
      .getSections()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(async (res) => {
        this.sections = await res.data;
        if (!this.displaySections.length) {
          this.displaySections = this.normalizeSections(res.data);
        }
        this._changeDetectorRef.markForCheck();
      });
  }

  private normalizeSections(data: any): SellerFeature[] {
    if (Array.isArray(data)) {
      return data;
    }

    if (!data || typeof data !== "object") {
      return [];
    }

    if (Array.isArray(data.data)) {
      return data.data;
    }

    return Object.values(data).filter(
      (item: any) => item && typeof item === "object",
    ) as SellerFeature[];
  }

  addRole(): void {
    if (this.roleFormGroup.invalid || this.btnDisable) {
      return;
    }

    this.btnDisable = true;
    const roleName = this.roleFormGroup.getRawValue();
    Object.keys(roleName).forEach((key) => {
      if (typeof roleName[key] === "string") {
        roleName[key] = roleName[key].trim();
      }
    });

    const sellerId =
      this._userSessionService.getCurrentSellerId() ||
      this._userSessionService.getLocalUser();
    const formData = {
      seller_id: sellerId,
      permissions: this.mapPermissionsFeatureWise(),
      role_name: roleName.role_name,
    };

    if (!this.roleId) {
      this._sellerRoleService
        .addSellerRole(formData)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisable = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe(
          (data) => {
            if (data?.status === 200) {
              this._utilService.onSuccess(
                "Seller role has been added successfully.",
              );
              this._location.back();
            }
          },
          ({ error }: { error: { [key: string]: any } }) => {
            this._utilService.onError(error.message);
          },
        );
    } else {
      const removedFormData = this.mapPermissionsFeatureWise(true);
      this._sellerRoleService
        .updateSellerRole(
          {
            ...formData,
            seller_id: sellerId,
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
        .subscribe(
          (data: any) => {
            if (data?.status === 200) {
              this._utilService.onSuccess(
                "Seller role has been updated successfully.",
              );
              this._location.back();
            }
          },
          ({ error }: { error: { [key: string]: any } }) => {
            this._utilService.onError(error.message);
          },
        );
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
      event.preventDefault();
    }
  }

  isSectionSelected(section: any): boolean {
    return section?._id in this.featureIds;
  }

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
    const nextValue = !event;
    const sectionId = section?._id;

    if (!this.sectionPermissions[sectionId]) {
      return;
    }

    this.sectionPermissions[sectionId][key] = nextValue;

    if (["update", "delete", "add"].includes(key) && nextValue) {
      this.sectionPermissions[sectionId].view = true;
    }

    if (["update"].includes(key) && !nextValue) {
      this.sectionPermissions[sectionId].delete = false;
    }

    if (["view"].includes(key) && !nextValue) {
      ["update", "delete", "add"].forEach(
        (item) => (this.sectionPermissions[sectionId][item] = false),
      );
    }

    const allFalse = Object.values(this.sectionPermissions[sectionId]).every(
      (permission) => !permission,
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

  mapPermissionsFeatureWise(forUpdates = false): SellerSectionPermission[] {
    const permMap: SellerSectionPermission[] = [];
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
