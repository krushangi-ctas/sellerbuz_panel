import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Constants } from "app/shared/constants";
import { environment } from "environments/environment";
import {
  BehaviorSubject,
  Observable,
  catchError,
  of,
  switchMap,
  tap,
  throwError,
} from "rxjs";
import { Pagination } from "../pagination/pagination.types";
import { MasterService } from "../master.service";
import { TagSettings } from "./tag-setting.model";

@Injectable({
  providedIn: "root",
})
export class TagService {
  private setting = {
    element: {
      dynamicDownload: null as HTMLElement,
    },
  };
  pageSize: any = Constants.pageLimit;
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _TagSettings: BehaviorSubject<TagSettings[] | null> =
    new BehaviorSubject(null);

  /**   * Constructor
   */
  constructor(
    private _httpClient: HttpClient,
    private _masterService: MasterService,
  ) {}

  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  get TagSettings$(): Observable<TagSettings[]> {
    return this._TagSettings.asObservable();
  }

  getAllTagList(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: TagSettings[] }> {
    // Helper function to scrub out empty string, null, or undefined keys
    const cleanObject = (obj: any) => {
      const cleanObj: any = {};
      if (obj) {
        Object.keys(obj).forEach((key) => {
          const val = obj[key];
          if (
            val !== undefined &&
            val !== null &&
            val !== "" &&
            !(Array.isArray(val) && val.length === 0)
          ) {
            cleanObj[key] = val;
          }
        });
      }
      return cleanObj;
    };

    const cleanFilters = cleanObject(filterQuery);

    return this._masterService
      .get("/tags/get-all-tag-list", {
        params: {
          page: page.toString(),
          limit: size.toString(),
          sortBy: `${sort}:${order || "desc"}`,
          search,
          ...cleanFilters, // Safely spreads filtered keys
        },
      })
      .pipe(
        tap((response) => {
          this._TagSettings.next(response.data);
          this._pagination.next(response.pagination);
        }),
        catchError((error) => throwError(error)),
      );
  }

  getAllTagListWithoutPagenation(): Observable<{
    pagination: Pagination;
    data: TagSettings[];
  }> {
    return this._masterService.get("/tags/get-all-tags-only").pipe(
      tap((response) => {
        this._TagSettings.next(response.data);
        this._pagination.next(response.pagination);
      }),
      catchError((error) => throwError(error)),
    );
  }
  // Add tag
  addTag(formData: any): Observable<TagSettings> {
    return this._masterService.post("/tags/add-tag", formData).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        } else {
          return throwError(response);
        }
      }),
      catchError((error) => throwError(error)),
    );
  }

  // Update tag
  updateTag(id: string, formData: any): Observable<TagSettings> {
    return this._masterService.put(`/tags/update-tag/${id}`, formData).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        } else {
          return throwError(response);
        }
      }),
      catchError((error) => throwError(error)),
    );
  }
  // Update tag
  updateStatus(id: string, formData: any): Observable<TagSettings> {
    const obj = {
      status: formData.checked,
    };
    return this._masterService.put(`/tags/update-tag-status/${id}`, obj).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        } else {
          return throwError(response);
        }
      }),
      catchError((error) => throwError(error)),
    );
  }

  // Get tag by ID
  getTagById(id: string): Observable<TagSettings> {
    return this._httpClient
      .get<TagSettings>(`${environment.apiBaseUrl}/tags/get-tag-by-id/${id}`)
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
        catchError((error) => throwError(error)),
      );
  }

  // Delete tag
  deleteTag(id: string): Observable<any> {
    return this._masterService.put(`/tags/delete-tag/${id}`, {}).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        } else {
          return throwError(response);
        }
      }),
      catchError((error) => throwError(error)),
    );
  }
}
