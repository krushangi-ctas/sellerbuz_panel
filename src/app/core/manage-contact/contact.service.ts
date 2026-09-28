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
import {
  Contact,
  ContactFilter,
  ContactListResponse,
  ContactResponse,
} from "./contact.model";

@Injectable({
  providedIn: "root",
})
export class ContactService {
  pageSize: any = Constants.pageLimit;

  // Private
  private _contacts: BehaviorSubject<Contact[] | null> = new BehaviorSubject(
    null,
  );
  private _pagination: BehaviorSubject<any | null> = new BehaviorSubject(null);

  /**
   * Constructor
   */
  constructor(private _httpClient: HttpClient) {}

  // Getter for contacts
  get contacts$(): Observable<Contact[] | null> {
    return this._contacts.asObservable();
  }

  // Getter for pagination
  get pagination$(): Observable<any> {
    return this._pagination.asObservable();
  }

  /**
   * Get paginated contacts (admin)
   */
  getContacts(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: ContactFilter = {},
  ): Observable<ContactListResponse> {
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

    return this._httpClient
      .get<ContactListResponse>(environment.apiBaseUrl + "/contact", {
        params: {
          page,
          limit: size,
          sortBy: `${sort}:${order || "desc"}`,
          search,
          ...cleanFilters,
        },
      })
      .pipe(
        tap((response) => {
          this._pagination.next(response.pagination);
          this._contacts.next(response.data);
        }),
      );
  }

  /**
   * Update contact status (admin)
   * @param id  Contact document ID
   * @param status  0 = new, 1 = read, 2 = replied
   */
  updateContactStatus(id: string, status: number): Observable<ContactResponse> {
    return this._httpClient
      .patch<ContactResponse>(
        `${environment.apiBaseUrl}/contact/${id}/status`,
        { status },
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(() => response);
          }
        }),
      );
  }

  replyToContact(id: string, message: string): Observable<ContactResponse> {
    return this._httpClient
      .post<ContactResponse>(`${environment.apiBaseUrl}/contact/${id}/reply`, {
        message,
      })
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(() => response);
          }
        }),
      );
  }
}
