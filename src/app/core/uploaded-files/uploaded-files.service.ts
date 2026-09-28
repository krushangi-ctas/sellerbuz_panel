import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { Pagination } from "../pagination/pagination.types";

export interface UploadedFileItem {
  _id: string;
  file_name: string;
  file_name_original?: string;
  file_size?: string;
  file_mime_type?: string;
  total_record?: number;
  processed_records?: number;
  total_success?: number;
  total_fail?: number;
  error_message?: string;
  amz_product_type?: string;
  amz_fullfillment_by?: string;
  amz_margin?: number;
  amz_margin_mode?: string;
  amz_status?: number;
  marketplace_id?: string;
  process_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
  file_imported?: boolean;
  is_catalog_file?: boolean;
  file_processed_for_listing?: boolean;
  status: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: "root",
})
export class UploadedFilesService {
  private _pagination: BehaviorSubject<Pagination | null> =
    new BehaviorSubject<Pagination | null>(null);
  private _uploadedFiles: BehaviorSubject<UploadedFileItem[] | null> =
    new BehaviorSubject<UploadedFileItem[] | null>(null);

  constructor(private _httpClient: HttpClient) {}

  get pagination$(): Observable<Pagination | null> {
    return this._pagination.asObservable();
  }

  get uploadedFiles$(): Observable<UploadedFileItem[] | null> {
    return this._uploadedFiles.asObservable();
  }

  getUploadedFiles(
    page: number = 1,
    limit: number = 10,
    sortBy: string = "createdAt",
    sortOrder: string = "desc",
    search: string = "",
    filter: any = {},
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("limit", limit.toString())
      .set("sortBy", `${sortBy}:${sortOrder}`);

    if (search) {
      params = params.set("search", search);
    }
    if (
      filter.status !== undefined &&
      filter.status !== null &&
      filter.status !== ""
    ) {
      params = params.set("status", filter.status.toString());
    }
    if (filter.process_status) {
      params = params.set("process_status", filter.process_status);
    }
    if (filter.startDate) {
      params = params.set("startDate", filter.startDate);
    }
    if (filter.endDate) {
      params = params.set("endDate", filter.endDate);
    }
    if (filter.seller_id) {
      params = params.set("seller_id", filter.seller_id);
    }
    if (
      filter.is_catalog_file !== undefined &&
      filter.is_catalog_file !== null &&
      filter.is_catalog_file !== ""
    ) {
      params = params.set("is_catalog_file", filter.is_catalog_file.toString());
    }

    return this._httpClient
      .get<any>(`${environment.apiBaseUrl}/feed/uploaded-files`, { params })
      .pipe(
        tap((response: any) => {
          if (
            response &&
            (response.status === 200 || response.status === 201)
          ) {
            const dataObj = response.data || response;
            const results = dataObj.results || response.results || [];
            const paginationData = dataObj.pagination || response.pagination;

            if (paginationData) {
              this._pagination.next({
                length: paginationData?.length || 0,
                size: paginationData?.size || limit,
                page: (paginationData?.page || 1) - 1, // 0-based index for Angular MatPaginator
                lastPage: paginationData?.lastPage || 1,
                startIndex:
                  ((paginationData?.page || 1) - 1) *
                  (paginationData?.size || limit),
                endIndex: Math.min(
                  (paginationData?.page || 1) * (paginationData?.size || limit),
                  paginationData?.length || 0,
                ),
              } as any);
            }
            this._uploadedFiles.next(results);
          } else {
            this._uploadedFiles.next([]);
            this._pagination.next(null);
          }
        }),
      );
  }

  updateFileStatus(fileId: string, update: Partial<UploadedFileItem>): void {
    const currentFiles = this._uploadedFiles.getValue();
    if (!currentFiles) return;

    const index = currentFiles.findIndex((f) => f._id === fileId);
    if (index !== -1) {
      const updatedFiles = [...currentFiles];
      updatedFiles[index] = {
        ...updatedFiles[index],
        ...update,
      };
      this._uploadedFiles.next(updatedFiles);
    }
  }
}
