import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormControl, FormGroup, Validators, FormArray } from "@angular/forms";
import { OverlayRef } from "@angular/cdk/overlay";
import { MatDrawerToggleResult } from "@angular/material/sidenav";
import { Subject, Subscription, takeUntil } from "rxjs";
import { FuseUtilsService } from "@fuse/services/utils";
import { environment } from "environments/environment";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import { portalListComponent } from "../list/list.component";
import { PortalService } from "app/core/portal/portal.service";
import { urlValidator } from "@fuse/validators/urlValidator";

@Component({
  standalone: false,
  selector: "marketplace-details",
  templateUrl: "./details.component.html",
  styleUrls: ["./details.component.scss"],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      "flex flex-col flex-auto w-full h-full min-h-full bg-white dark:bg-gray-900",
  },
})
export class portalDetailsComponent implements OnInit, OnDestroy {
  editMode: boolean = false;
  tags: any[];
  tagsEditMode: boolean = false;
  contact: any;
  pageLimit: number = Constants.pageLimit;
  portalId: string;
  selectedFileForUpload: any;
  importFileConfirm: FormGroup;
  btnDisable: boolean;
  isLoading: boolean;
  selectedFileName: any;
  data: { original_file_name: any; file_name: any; file_headers: string[] };
  selectedMarketplaceData: any;
  validExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
  portalFormGroup: FormGroup;
  btnDisabled = false;
  bannerImage = "";
  sequences: number[] = Array.from({ length: 15 }, (_, i) => i + 1);
  imagePath: string = environment.uploadPath + "banners/";
  imageUrl: string = "";
  fileToUpload: File = null;
  bannerSize: { type: string; size: string };
  file: any;
  private _tagsPanelOverlayRef: OverlayRef;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  private routeSubscription: Subscription;
  dynamicFields: any[] = [];
  showDynamicFields: boolean = false;

  /**
   * Constructor
   */
  constructor(
    private _activatedRoute: ActivatedRoute,
    private _portalListComponent: portalListComponent,
    private _portalService: PortalService,
    private _utilService: FuseUtilsService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _router: Router,
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Open the drawer when the component is initialized
    this._portalListComponent.matDrawer.open();

    // Subscribe to the route parameters to get the portalId
    this.routeSubscription = this._activatedRoute.paramMap
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((params) => {
        this.portalId = params.get("id");

        // Check if the portalId is 'add' to reset the form
        if (this.portalId === "add") {
          this.portalFormGroup?.reset(); // Reset the form for 'add' mode
        } else {
          this.initializeForm(); // Initialize the form with data for 'edit' mode
        }
      });

    // Initialize the form group with the necessary fields
    this.portalFormGroup = new FormGroup({
      image_url: new FormControl("", [Validators.required, urlValidator()]),
      portal_name: new FormControl("", [
        Validators.required,
        Validators.maxLength(20),
      ]),
      portal_number: new FormControl("", [
        Validators.required,
        Validators.min(0),
        Validators.maxLength(10), // Set maximum numeric digit limit configuration
      ]),
    });
  }

  initializeForm(): void {
    if (this.portalId && this.portalId !== "add") {
      this.isLoading = true;
      this._portalService
        .getPortalById(this.portalId)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (res: any) => {
            this.isLoading = false;
            this.portalFormGroup.patchValue(res.data);
            this._changeDetectorRef.markForCheck();
          },
          error: () => {
            this.isLoading = false;
            this._changeDetectorRef.markForCheck();
          },
        });
    } else {
      this.isLoading = false;
    }
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
    this.routeSubscription?.unsubscribe();
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
    return this._portalListComponent.matDrawer.close();
  }

  getPortalSettings(): void {
    this._portalService
      .getAllPOrtalList(1, getPageSize(), "createdAt", "desc", "", {})
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        this._changeDetectorRef.markForCheck();
      });
  }

  addUpdatePortal(): void {
    if (!this.portalFormGroup.valid) {
      return;
    }

    // Get form values including dynamic fields
    const formData = { ...this.portalFormGroup.value };

    this.btnDisabled = true;
    if (this.portalId !== "" && this.portalId !== "add") {
      this._portalService
        .updatePortal(this.portalId, formData)

        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(
          (newData: any) => {
            this._utilService.onSuccess(
              "portal has been updated successfully.",
            );
            this._portalListComponent.getPortalSettings();
            this.closeDrawer();
            this._router.navigate(["../"], {
              relativeTo: this._activatedRoute,
            });
            this._changeDetectorRef.markForCheck();
            this.btnDisabled = false;
          },
          (error) => {
            this._utilService.onError(
              error?.error?.message ||
                error?.message ||
                "Failed to update portal",
            );
            this.btnDisabled = false;
          },
        );
    } else {
      this._portalService
        .addPortal(formData)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(
          () => {
            this._utilService.onSuccess("portal has been added successfully.");
            this._portalListComponent.getPortalSettings();
            this.closeDrawer();
            this._router.navigate(["../"], {
              relativeTo: this._activatedRoute,
            });
            this._changeDetectorRef.markForCheck();
            this.btnDisabled = false;
          },
          (error) => {
            this._utilService.onError(error.error.message);
            this.btnDisabled = false;
          },
        );
    }
  }

  stopScrollingWheel(e): any {
    return e.target.blur();
  }

  onPortalNumberInput(event: any): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length > 10) {
      input.value = input.value.slice(0, 10);
      this.portalFormGroup.get("portal_number")?.setValue(input.value);
    }
  }

  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent the default form submission behavior
      this.addUpdatePortal();
    }
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
