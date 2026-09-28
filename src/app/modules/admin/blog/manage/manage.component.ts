import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { FuseUtilsService } from "@fuse/services/utils";
import { BlogService } from "app/core/blog/blog.service";
import { Blog } from "app/core/blog/blog.model";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-blog-manage",
  templateUrl: "./manage.component.html",
  styleUrls: ["./manage.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class BlogManageComponent implements OnInit, OnDestroy {
  @ViewChildren("fileInput") fileInputs!: QueryList<
    ElementRef<HTMLInputElement>
  >;

  blogForm!: FormGroup;
  isEditMode: boolean = false;
  blogId: string | null = null;
  title: string = "Create Blog";
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  uploadingSlotIndex: number | null = null;
  previewModalImage: { url: string; index: number } | null = null;

  // Quill configuration
  quillModules = {
    toolbar: [
      ["bold", "italic", "underline", "strike"],
      ["blockquote", "code-block"],
      [{ header: 1 }, { header: 2 }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "sub" }, { script: "super" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ direction: "rtl" }],
      [{ size: ["small", false, "large", "huge"] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ["clean"],
      ["link"],
    ],
  };

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _fb: FormBuilder,
    private _route: ActivatedRoute,
    private _router: Router,
    private _blogService: BlogService,
    private _utilService: FuseUtilsService,
    private _cdr: ChangeDetectorRef,
  ) {
    this._initForm();
  }

  private _initForm(): void {
    this.blogForm = this._fb.group({
      blog_title: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(250),
        ],
      ],
      short_description: ["", [Validators.maxLength(500)]],
      description: [""],
      description_images: this._fb.array([]),
      status: [1, [Validators.required]],
    });
  }

  get descriptionImages(): FormArray {
    return this.blogForm.get("description_images") as FormArray;
  }

  ngOnInit(): void {
    this.blogId = this._route.snapshot.paramMap.get("id");
    this.isEditMode = !!this.blogId;
    this.title = this.isEditMode ? "Edit Blog" : "Create Blog";

    if (this.isEditMode && this.blogId) {
      this.loadBlogData(this.blogId);
    } else {
      // Add one empty image slot by default for convenience
      this.addImageSlot();
    }
  }

  loadBlogData(id: string): void {
    this.isLoading = true;
    this._cdr.markForCheck();

    this._blogService
      .getBlogById(id)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (resp: any) => {
          this.isLoading = false;
          const blog: Blog = resp.data || resp;
          if (blog) {
            this.blogForm.patchValue({
              blog_title: blog.blog_title || "",
              short_description: blog.short_description || "",
              description: blog.description || "",
              status: blog.status !== undefined ? blog.status : 1,
            });

            // Populate images FormArray
            this.descriptionImages.clear();
            if (
              blog.description_images &&
              Array.isArray(blog.description_images) &&
              blog.description_images.length > 0
            ) {
              blog.description_images.forEach((imgUrl: string) => {
                this.addImageSlot(imgUrl);
              });
            } else {
              this.addImageSlot();
            }
          }
          this._cdr.markForCheck();
        },
        error: (err: any) => {
          this.isLoading = false;
          this._utilService.onError(
            err?.error?.message || err?.message || "Failed to load blog data",
          );
          this._router.navigate(["/master/blogs"]);
          this._cdr.markForCheck();
        },
      });
  }

  addImageSlot(initialValue: string = ""): void {
    this.descriptionImages.push(new FormControl(initialValue));
    this._cdr.markForCheck();
  }

  removeImageSlot(index: number): void {
    this.descriptionImages.removeAt(index);
    if (this.descriptionImages.length === 0) {
      this.addImageSlot();
    }
    this._cdr.markForCheck();
  }

  triggerFileInput(index: number): void {
    const inputs = this.fileInputs.toArray();
    if (inputs[index]) {
      inputs[index].nativeElement.click();
    }
  }

  onImagePicked(event: any, index: number): void {
    const file: File = event?.target?.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      this._utilService.onError(
        "Please select a valid image (PNG, JPG, or WEBP)",
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this._utilService.onError("Image size must be less than 5MB");
      return;
    }

    this.uploadingSlotIndex = index;
    this._cdr.markForCheck();

    this._blogService
      .uploadImage(file)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (resp: any) => {
          this.uploadingSlotIndex = null;
          const url = resp.data?.imageUrl || resp.imageUrl;
          if (url) {
            this.descriptionImages.at(index).setValue(url);
            this._utilService.onSuccess("Image uploaded successfully");
          }
          this._cdr.markForCheck();
        },
        error: (err: any) => {
          this.uploadingSlotIndex = null;
          this._utilService.onError(
            err?.error?.message || err?.message || "Failed to upload image",
          );
          this._cdr.markForCheck();
        },
      });
  }

  saveBlog(): void {
    if (this.blogForm.invalid || this.isSubmitting) {
      this.blogForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this._cdr.markForCheck();

    const rawValues = this.blogForm.getRawValue();

    // Clean image array (filter out empty strings)
    const cleanedImages = (rawValues.description_images || []).filter(
      (img: string) => img && typeof img === "string" && img.trim() !== "",
    );

    const payload = {
      blog_title: rawValues.blog_title.trim(),
      short_description: (rawValues.short_description || "").trim(),
      description: rawValues.description || null,
      description_images: cleanedImages,
      status: Number(rawValues.status),
    };

    const request$ =
      this.isEditMode && this.blogId
        ? this._blogService.updateBlog(this.blogId, payload)
        : this._blogService.createBlog(payload);

    request$.pipe(takeUntil(this._unsubscribeAll)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this._utilService.onSuccess(
          this.isEditMode
            ? "Blog updated successfully!"
            : "Blog created successfully!",
        );
        this._router.navigate(["/master/blogs"]);
        this._cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this._utilService.onError(
          err?.error?.message || err?.message || "Failed to save blog",
        );
        this._cdr.markForCheck();
      },
    });
  }

  onThumbnailClick(
    index: number,
    url: string | null | undefined,
    event: MouseEvent,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    if (url && url.trim()) {
      this.openImagePreview(url.trim(), index);
    } else {
      this.triggerFileInput(index);
    }
  }

  openImagePreview(url: string, index: number, event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!url) return;
    this.previewModalImage = { url, index };
    this._cdr.markForCheck();
  }

  closeImagePreview(): void {
    this.previewModalImage = null;
    this._cdr.markForCheck();
  }

  @HostListener("document:keydown.escape", ["$event"])
  onKeydownHandler(event: KeyboardEvent): void {
    if (this.previewModalImage) {
      this.closeImagePreview();
    }
  }

  goBack(): void {
    this._router.navigate(["/master/blogs"]);
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
