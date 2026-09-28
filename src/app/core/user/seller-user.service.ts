import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  BehaviorSubject,
  Observable,
  of,
  ReplaySubject,
  switchMap,
  tap,
  throwError,
} from "rxjs";
import { environment } from "environments/environment";
import { Constants } from "app/shared/constants";
import { Pagination } from "../pagination/pagination.types";
import { User } from "./user.types";

@Injectable({
  providedIn: "root",
})
export class SellerUserService {
  pageSize: any = Constants.pageLimit;
  private _sellerUser: ReplaySubject<User> = new ReplaySubject<User>(1);
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _users: BehaviorSubject<User[] | null> = new BehaviorSubject(null);

  constructor(private _httpClient: HttpClient) {}

  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  get users$(): Observable<User[]> {
    return this._users.asObservable();
  }

  get seller$(): Observable<User> {
    return this._sellerUser.asObservable();
  }

  set seller(value: User) {
    this._sellerUser.next(value);
  }

  getSellerUsers(
    sellerId: string,
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: User[] }> {
    return this._httpClient
      .get<{ pagination: Pagination; data: User[] }>(
        environment.apiBaseUrl +
          "/seller-user/get-all-seller-users/" +
          sellerId,
        {
          params: {
            page: page,
            limit: size,
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...filterQuery,
          },
        },
      )
      .pipe(
        tap((response) => {
          this._pagination.next(response.pagination);
          this._users.next(response.data);
        }),
      );
  }

  getSellerUserById(userId: string): Observable<User> {
    return this._httpClient.get<User>(
      environment.apiBaseUrl + "/seller-user/get-seller-user/" + userId,
    );
  }

  createSellerUser(
    formData: any,
    sellerId: string,
    createdBy: string,
  ): Observable<any> {
    return this._httpClient
      .post(
        environment.apiBaseUrl +
          "/seller-user/create-seller-user/" +
          sellerId +
          "/" +
          createdBy,
        formData,
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }

  updateSellerUser(
    userId: string,
    formData: any,
    updatedBy: string,
  ): Observable<any> {
    return this._httpClient
      .put(
        environment.apiBaseUrl +
          "/seller-user/update-seller-user/" +
          userId +
          "/" +
          updatedBy,
        formData,
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }

  deleteSellerUser(userId: string, deletedBy: string): Observable<any> {
    return this._httpClient
      .delete(
        environment.apiBaseUrl +
          "/seller-user/delete-seller-user/" +
          userId +
          "/" +
          deletedBy,
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }

  updateSellerUserStatus(userId: string, status: string): Observable<any> {
    return this._httpClient
      .post(
        environment.apiBaseUrl +
          "/seller-user/update-seller-user-status/" +
          userId,
        { status },
      )
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }
}
