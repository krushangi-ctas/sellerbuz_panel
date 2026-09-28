import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Constants } from "app/shared/constants";
import { environment } from "environments/environment";
import {
  BehaviorSubject,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from "rxjs";
import { Pagination } from "../pagination/pagination.types";
import {
  Blog,
  BlogFilter,
  BlogResponse,
  BlogsListResponse,
  CreateBlogDto,
  UpdateBlogDto,
} from "./blog.model";
import { MasterService } from "../master.service";

@Injectable({
  providedIn: "root",
})
export class BlogService {
  pageSize: any = Constants.pageLimit;
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _blogs: BehaviorSubject<Blog[] | null> = new BehaviorSubject(null);
  private _isLoading: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor(
    private _httpClient: HttpClient,
    private _masterService: MasterService,
  ) {}

  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  get blogs$(): Observable<Blog[]> {
    return this._blogs.asObservable();
  }

  get isLoading$(): Observable<boolean> {
    return this._isLoading.asObservable();
  }

  /**
   * Get all blogs with filters and pagination
   */
  getBlogs(
    page: number = 1,
    size: number = 100,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filters: BlogFilter = {},
  ): Observable<BlogsListResponse> {
    this._isLoading.next(true);

    const params: any = {
      page,
      limit: size,
      sortBy: `${sort}:${order || "desc"}`,
    };

    if (search && search.trim()) {
      params.search = search.trim();
    }

    if (
      filters.status !== undefined &&
      filters.status !== null &&
      filters.status !== ""
    ) {
      params.status = filters.status;
    }

    return this._httpClient
      .get<BlogsListResponse>(`${environment.apiBaseUrl}/blogs/get-all`, {
        params,
      })
      .pipe(
        tap((response: any) => {
          this._isLoading.next(false);
          const paginationData =
            response.pagination || response.data?.pagination;
          if (paginationData) {
            this._pagination.next(paginationData);
          }
          const results = response.data || [];
          this._blogs.next(results);
        }),
        tap({
          error: () => {
            this._isLoading.next(false);
          },
        }),
      );
  }

  /**
   * Get blog by ID
   */
  getBlogById(blogId: string): Observable<BlogResponse> {
    return this._httpClient.get<BlogResponse>(
      `${environment.apiBaseUrl}/blogs/get/${blogId}`,
    );
  }

  /**
   * Create new blog
   */
  createBlog(formData: CreateBlogDto): Observable<BlogResponse> {
    return this._masterService.post("/blogs/create", formData).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        }
        return throwError(() => response);
      }),
    );
  }

  /**
   * Update blog
   */
  updateBlog(
    blogId: string,
    formData: UpdateBlogDto,
  ): Observable<BlogResponse> {
    return this._masterService.patch(`/blogs/update/${blogId}`, formData).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        }
        return throwError(() => response);
      }),
    );
  }

  /**
   * Update blog status
   */
  updateStatus(blogId: string, status: number): Observable<BlogResponse> {
    return this._masterService
      .patch(`/blogs/update-status/${blogId}`, { status })
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          }
          return throwError(() => response);
        }),
      );
  }

  /**
   * Delete blog (soft delete)
   */
  deleteBlog(blogId: string): Observable<BlogResponse> {
    return this._masterService.delete(`/blogs/delete/${blogId}`).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        }
        return throwError(() => response);
      }),
    );
  }

  /**
   * Upload image file
   */
  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append("image", file);
    return this._masterService.post("/blogs/upload-image", formData).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        }
        return throwError(() => response);
      }),
    );
  }
}
