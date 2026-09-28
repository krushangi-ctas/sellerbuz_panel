import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { OverlayRef } from "@angular/cdk/overlay";
import { MatDrawerToggleResult } from "@angular/material/sidenav";
import { Subject, takeUntil } from "rxjs";
import { MasterCatalogComponent } from "../master-catalog.component";
import { InventoryService } from "app/core/inventory/inventory.service";
import { resolveMediaUrl } from "app/shared/common";
import { environment } from "environments/environment";

@Component({
  standalone: false,
  selector: "product-details",
  templateUrl: "./product-details.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      "flex flex-col flex-auto w-full h-full min-h-full bg-white dark:bg-gray-900",
  },
})
export class ProdcutDetailsComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  productId: string;
  productData: any;

  // Image gallery state
  allImages: string[] = [];
  currentImageIndex: number = 0;

  private _tagsPanelOverlayRef: OverlayRef;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  /**
   * Constructor
   */
  constructor(
    private _SellersListComponent: MasterCatalogComponent,
    private _activatedRoute: ActivatedRoute,
    private _inventoryService: InventoryService,
    private _changeDetectorRef: ChangeDetectorRef,
  ) {}

  get canView(): boolean {
    return this._SellersListComponent?.canView ?? true;
  }
  get canUpdate(): boolean {
    return this._SellersListComponent?.canUpdate ?? true;
  }
  get canDelete(): boolean {
    return this._SellersListComponent?.canDelete ?? true;
  }

  getImageUrl(image: string | string[] | null | undefined): string {
    return resolveMediaUrl(image, {
      basePath: environment.uploadPath,
      folder: "upload-files",
    });
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    this._activatedRoute.paramMap
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((params) => {
        this.productId = params.get("id");
        this.fetchInventory();
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
    return this._SellersListComponent.matDrawer.close();
  }

  fetchInventory(): any {
    this._inventoryService
      .getInventoryById(this.productId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data: any) => {
        if (data && data.data) {
          this.productData = data.data;
          this.buildImageGallery();
          this.isLoading = false;
          this._SellersListComponent.matDrawer.open();
          this._changeDetectorRef.markForCheck();
        }
      });
  }

  /** Build a flat list of all product images: main first, then additional */
  buildImageGallery(): void {
    this.allImages = [];
    this.currentImageIndex = 0;

    const parseImages = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.flatMap((v) => parseImages(v)).filter(Boolean);
      }
      if (typeof val === "string") {
        return val
          .split(/\|\|\||,|\n|\r/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s !== "null" && s !== "undefined");
      }
      return [];
    };

    const mainList = parseImages(this.productData?.main_image_url);
    const extraList = parseImages(this.productData?.images);

    const combined = Array.from(new Set([...mainList, ...extraList]));

    combined.forEach((img: string) => {
      this.allImages.push(this.getImageUrl(img));
    });

    if (this.allImages.length === 0) {
      this.allImages = ["../../../../../assets/images/no-image-icon.png"];
    }
  }

  get currentImage(): string {
    return (
      this.allImages[this.currentImageIndex] ??
      "../../../../../assets/images/no-image-icon.png"
    );
  }

  prevImage(): void {
    this.currentImageIndex =
      (this.currentImageIndex - 1 + this.allImages.length) %
      this.allImages.length;
    this._changeDetectorRef.markForCheck();
  }

  nextImage(): void {
    this.currentImageIndex =
      (this.currentImageIndex + 1) % this.allImages.length;
    this._changeDetectorRef.markForCheck();
  }

  goToImage(index: number): void {
    this.currentImageIndex = index;
    this._changeDetectorRef.markForCheck();
  }

  copyToClipboard(val: string): void {
    if (val) {
      navigator.clipboard.writeText(val);
    }
  }

  copyAll(): void {
    if (this.productData) {
      const info = `ASIN: ${this.productData.asin || "-"}\nSKU: ${this.productData.sku || "-"}\nEAN: ${this.productData.ean || "-"}`;
      navigator.clipboard.writeText(info);
    }
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }
}
