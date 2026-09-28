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
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { OverlayRef } from "@angular/cdk/overlay";
import { MatDrawerToggleResult } from "@angular/material/sidenav";
import { Subject, Subscription, takeUntil, finalize } from "rxjs";
import { FuseUtilsService } from "@fuse/services/utils";
import { environment } from "environments/environment";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import { TagListComponent } from "../list/list.component";
import { TagService } from "app/core/tag-setting/tag-setting.service";

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
export class TagDetailsComponent implements OnInit, OnDestroy {
  editMode: boolean = false;
  tags: any[];
  tagsEditMode: boolean = false;
  contact: any;
  pageLimit: number = Constants.pageLimit;
  tagId: string;
  selectedFileForUpload: any;
  importFileConfirm: FormGroup;
  btnDisable: boolean;
  isLoading: boolean;
  selectedFileName: any;
  data: { original_file_name: any; file_name: any; file_headers: string[] };
  selectedMarketplaceData: any;
  validExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
  tagFormGroup: FormGroup;
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

  /**
   * Constructor
   */
  constructor(
    private _activatedRoute: ActivatedRoute,
    private _tagListComponent: TagListComponent,
    private _tagService: TagService,
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
    this._tagListComponent.matDrawer.open();

    // Subscribe to the route parameters to get the tagId
    this.routeSubscription = this._activatedRoute.paramMap
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((params) => {
        this.tagId = params.get("id");

        // Check if the tagId is 'add' to reset the form
        if (this.tagId === "add") {
          this.tagFormGroup?.reset(); // Reset the form for 'add' mode
        } else {
          this.initializeForm(); // Initialize the form with data for 'edit' mode
        }
      });

    // Initialize the form group with the necessary fields
    this.tagFormGroup = new FormGroup({
      tag: new FormControl("", [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
      ]),
      description: new FormControl("", [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(255),
      ]),
    });
  }

  initializeForm(): void {
    if (this.tagId && this.tagId !== "add") {
      this.isLoading = true;
      this._tagService
        .getTagById(this.tagId)
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
          next: (res: any) => {
            this.isLoading = false;
            if (res?.data) {
              this.tagFormGroup.patchValue(res.data);
            }
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
    this.routeSubscription.unsubscribe();
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
    return this._tagListComponent.matDrawer.close();
  }

  getTag(): void {
    this._tagListComponent.getTagSettings();
  }

  addUpdatePortal(): void {
    if (!this.tagFormGroup.valid || this.btnDisabled) {
      return;
    }
    // const formData = new FormData();
    // formData.append('image_url', this.tagFormGroup.get('image_url')?.value || '');
    // formData.append('portal_name', this.tagFormGroup.get('portal_name')?.value || '');
    // formData.append('portal_number', this.tagFormGroup.get('portal_number')?.value || '');
    this.btnDisabled = true;
    if (this.tagId !== "" && this.tagId !== "add") {
      this._tagService
        .updateTag(this.tagId, this.tagFormGroup.value)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisabled = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe(
          (newData: any) => {
            this._utilService.onSuccess("Tag has been updated successfully.");
            this.closeDrawer();
            this._tagListComponent.getTagSettings();
            this._router.navigate(["../"], {
              relativeTo: this._activatedRoute,
            });
          },
          (error) => {
            this._utilService.onError(
              error?.error?.message || error?.message || "Failed to update tag",
            );
          },
        );
    } else {
      this._tagService
        .addTag(this.tagFormGroup.value)
        .pipe(
          takeUntil(this._unsubscribeAll),
          finalize(() => {
            this.btnDisabled = false;
            this._changeDetectorRef.markForCheck();
          }),
        )
        .subscribe(
          () => {
            this._utilService.onSuccess("Tag has been added successfully.");
            this.closeDrawer();
            this._tagListComponent.getTagSettings();
            this._router.navigate(["../"], {
              relativeTo: this._activatedRoute,
            });
          },
          (error) => {
            this._utilService.onError(
              error?.error?.message || error?.message || "Failed to add tag",
            );
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
      this.tagFormGroup.get("portal_number")?.setValue(input.value);
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
