import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { FormControl } from "@angular/forms";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Router } from "@angular/router";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { FuseUtilsService } from "@fuse/services/utils";
import { NavigationService } from "app/core/navigation/navigation.service";
import { UserSessionsService } from "app/core/session/user-sessions.service";
import { BlogService } from "app/core/blog/blog.service";
import { Blog } from "app/core/blog/blog.model";
import { Pagination } from "app/core/pagination/pagination.types";
import { Constants } from "app/shared/constants";
import { getPageSize } from "app/shared/pagination.util";
import {
  Observable,
  Subject,
  debounceTime,
  map,
  merge,
  switchMap,
  takeUntil,
} from "rxjs";

@Component({
  selector: "app-blog-list",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class BlogListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren(MatPaginator) private _paginators: QueryList<MatPaginator>;
  @ViewChild(MatSort) private _sort: MatSort;

  isLoading: boolean = false;
  pagination: Pagination | null = null;
  searchInputControl: FormControl = new FormControl();
  statusFilterControl: FormControl = new FormControl("");
  blogs$: Observable<Blog[]>;

  // Sorting & Pagination state
  pageLimit: number = Constants.pageLimit;
  pageOptions: number[] = Constants.pageOptions;
  searchValue: string = "";

  // Preview State
  selectedPreviewBlog: Blog | null = null;
  activePreviewImageIndex: number = 0;
  previewDialogRef: MatDialogRef<any> | null = null;

  isSuperAdmin: boolean = false;
  permissionGuard: any = {};
  canAdd: boolean = true;
  canUpdate: boolean = true;
  canDelete: boolean = true;

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _blogService: BlogService,
    private _router: Router,
    private _confirmationService: FuseConfirmationService,
    private _utilService: FuseUtilsService,
    private _navigationService: NavigationService,
    private _userSessionService: UserSessionsService,
    private _matDialog: MatDialog,
    private _sanitizer: DomSanitizer,
  ) {
    this.isSuperAdmin =
      this._navigationService.isSuperAdmin ||
      this._navigationService.isPremisesUser ||
      false;
    this.blogs$ = this._blogService.blogs$;
  }

  ngOnInit(): void {
    this._navigationService.userRoleData
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        if (data && data?.permissions && Array.isArray(data?.permissions)) {
          const blogPerm = data?.permissions.find(
            (item: any) =>
              item?.section_name === "Blogs" || item?.section_name === "Blog",
          );
          if (blogPerm) {
            this.permissionGuard = blogPerm;
            this.canAdd = this.isSuperAdmin || !!blogPerm.add;
            this.canUpdate = this.isSuperAdmin || !!blogPerm.update;
            this.canDelete = this.isSuperAdmin || !!blogPerm.delete;
          }
        }
      });

    this._blogService.pagination$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((pagination: Pagination) => {
        this.pagination = pagination;
        this._changeDetectorRef.markForCheck();
      });

    this._blogService.isLoading$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((loading: boolean) => {
        this.isLoading = loading;
        this._changeDetectorRef.markForCheck();
      });

    // Initial fetch
    this._blogService
      .getBlogs()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    // Search filter with debounce
    this.searchInputControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((query) => {
          this.searchValue = query ? query.trim() : "";
          this.isLoading = true;
          if (this.pagination) {
            this.pagination.page = 1;
          }
          return this._blogService.getBlogs(
            this.pagination?.page || 1,
            getPageSize(this._paginators?.first),
            this._sort?.active || "createdAt",
            this._sort?.direction || "desc",
            this.searchValue,
            { status: this.statusFilterControl.value },
          );
        }),
        map(() => {
          this.isLoading = false;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();

    // Status filter dropdown
    this.statusFilterControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        switchMap((status) => {
          this.isLoading = true;
          if (this.pagination) {
            this.pagination.page = 1;
          }
          return this._blogService.getBlogs(
            1,
            getPageSize(this._paginators?.first),
            this._sort?.active || "createdAt",
            this._sort?.direction || "desc",
            this.searchValue,
            { status },
          );
        }),
        map(() => {
          this.isLoading = false;
        }),
      )
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe();
  }

  ngAfterViewInit(): void {
    this._paginators.changes
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.setupSortAndPagination();
      });
    this.setupSortAndPagination();
  }

  setupSortAndPagination(): void {
    if (this._sort && this._paginators?.first) {
      this._changeDetectorRef.markForCheck();

      // If the user changes the sort order...
      this._sort.sortChange
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
          if (this._paginators.first) {
            this._paginators.first.pageIndex = 0;
          }
        });

      // Get blogs if sort or page changes
      merge(this._sort.sortChange, this._paginators.first.page)
        .pipe(
          switchMap(() => {
            this.isLoading = true;
            const page = this._paginators.first.pageIndex + 1;
            return this._blogService.getBlogs(
              page,
              getPageSize(this._paginators.first),
              this._sort.active,
              this._sort.direction,
              this.searchValue,
              { status: this.statusFilterControl.value },
            );
          }),
          map(() => {
            this.isLoading = false;
          }),
        )
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe();
    }
  }

  fetchBlogsList(): void {
    this.isLoading = true;
    const page = this.pagination?.page || 1;
    const pageSize = getPageSize(this._paginators?.first);
    const sortActive = this._sort?.active || "createdAt";
    const sortDirection = this._sort?.direction || "desc";

    this._blogService
      .getBlogs(page, pageSize, sortActive, sortDirection, this.searchValue, {
        status: this.statusFilterControl.value,
      })
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this._changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.isLoading = false;
          this._utilService.onError(err?.message || "Failed to fetch blogs");
          this._changeDetectorRef.markForCheck();
        },
      });
  }

  refresh(): void {
    this.searchValue = "";
    this.statusFilterControl.setValue("");
    this.searchInputControl.setValue(null);
  }

  addBlog(): void {
    this._router.navigate(["/master/blogs/create"]);
  }

  editBlog(blog: Blog): void {
    const id = blog._id || blog.id;
    this._router.navigate([`/master/blogs/edit/${id}`]);
  }

  toggleStatus(blog: Blog, event: any): void {
    const currentStatus = blog.status;
    const newStatus = event.checked ? 1 : 0;
    const blogId = blog._id || blog.id;

    const confirmConfig = this._utilService.confirmMessage(
      "Change Blog Status",
      `Are you sure you want to ${newStatus === 1 ? "activate" : "deactivate"} "${blog.blog_title}"?`,
      newStatus === 1 ? "Activate" : "Deactivate",
    );

    const dialogRef = this._confirmationService.open(confirmConfig.value);

    dialogRef.afterClosed().subscribe((result) => {
      if (result === "confirmed") {
        this._blogService.updateStatus(blogId, newStatus).subscribe({
          next: () => {
            blog.status = newStatus;
            this._utilService.onSuccess(
              `Blog ${newStatus === 1 ? "activated" : "deactivated"} successfully!`,
            );
            this._changeDetectorRef.markForCheck();
          },
          error: (err) => {
            event.source.checked = currentStatus === 1;
            this._utilService.onError(
              err?.error?.message || err?.message || "Failed to change status",
            );
            this._changeDetectorRef.markForCheck();
          },
        });
      } else {
        event.source.checked = currentStatus === 1;
        this._changeDetectorRef.markForCheck();
      }
    });
  }

  deleteBlog(blog: Blog): void {
    const blogId = blog._id || blog.id;
    const confirmConfig = this._utilService.confirmMessage(
      "Delete Blog",
      `Are you sure you want to delete "${blog.blog_title}"? This action cannot be undone.`,
      "Delete",
    );

    const dialogRef = this._confirmationService.open(confirmConfig.value);

    dialogRef.afterClosed().subscribe((result) => {
      if (result === "confirmed") {
        this.isLoading = true;
        this._changeDetectorRef.markForCheck();
        this._blogService.deleteBlog(blogId).subscribe({
          next: () => {
            this._utilService.onSuccess("Blog deleted successfully");
            this._blogService
              .getBlogs(
                (this._paginators?.first?.pageIndex ?? 0) + 1,
                getPageSize(this._paginators?.first),
                this._sort?.active || "createdAt",
                this._sort?.direction || "desc",
                this.searchValue,
                { status: this.statusFilterControl.value },
              )
              .pipe(takeUntil(this._unsubscribeAll))
              .subscribe();
            this._changeDetectorRef.markForCheck();
          },
          error: (err) => {
            this.isLoading = false;
            this._utilService.onError(
              err?.error?.message || err?.message || "Failed to delete blog",
            );
            this._changeDetectorRef.markForCheck();
          },
        });
      }
    });
  }

  openPreview(blog: Blog, templateRef: any): void {
    this.selectedPreviewBlog = blog;
    this.activePreviewImageIndex = 0;
    this.previewDialogRef = this._matDialog.open(templateRef, {
      width: "1280px",
      maxWidth: "96vw",
      maxHeight: "92vh",
      panelClass: "blog-preview-custom-dialog",
      autoFocus: false,
    });

    this.previewDialogRef.afterClosed().subscribe(() => {
      this.selectedPreviewBlog = null;
      this.activePreviewImageIndex = 0;
      this._changeDetectorRef.markForCheck();
    });
  }

  closePreview(): void {
    if (this.previewDialogRef) {
      this.previewDialogRef.close();
    }
  }

  prevPreviewImage(): void {
    if (
      this.selectedPreviewBlog?.description_images &&
      this.selectedPreviewBlog.description_images.length > 0
    ) {
      const len = this.selectedPreviewBlog.description_images.length;
      this.activePreviewImageIndex =
        this.activePreviewImageIndex === 0
          ? len - 1
          : this.activePreviewImageIndex - 1;
      this._changeDetectorRef.markForCheck();
    }
  }

  nextPreviewImage(): void {
    if (
      this.selectedPreviewBlog?.description_images &&
      this.selectedPreviewBlog.description_images.length > 0
    ) {
      const len = this.selectedPreviewBlog.description_images.length;
      this.activePreviewImageIndex =
        this.activePreviewImageIndex === len - 1
          ? 0
          : this.activePreviewImageIndex + 1;
      this._changeDetectorRef.markForCheck();
    }
  }

  setPreviewImageIndex(index: number): void {
    this.activePreviewImageIndex = index;
    this._changeDetectorRef.markForCheck();
  }

  getSafeHtml(html?: string): SafeHtml {
    if (!html) return "";
    const cleanHtml = html.replace(/&nbsp;/g, " ");
    return this._sanitizer.bypassSecurityTrustHtml(cleanHtml);
  }

  calculateReadTime(content?: string, shortDesc?: string): string {
    const text = (content || "") + " " + (shortDesc || "");
    const wordCount = text.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const minutes = Math.max(2, Math.ceil(wordCount / 180));
    return `${minutes} min read`;
  }

  getRelatedBlogs(currentBlog: Blog | null, allBlogs: Blog[] | null): Blog[] {
    if (!allBlogs || !currentBlog) return [];
    const currentId = currentBlog._id || currentBlog.id;
    return allBlogs.filter((b) => (b._id || b.id) !== currentId).slice(0, 3);
  }

  selectPreviewBlog(blog: Blog): void {
    this.selectedPreviewBlog = blog;
    this.activePreviewImageIndex = 0;
    this._changeDetectorRef.markForCheck();
  }

  getFirstImage(blog: Blog): string | null {
    if (blog.description_images && blog.description_images.length > 0) {
      return blog.description_images[0];
    }
    return null;
  }

  trackByFn(index: number, item: Blog): string {
    return item._id || item.id || index.toString();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
