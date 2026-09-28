import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  BehaviorSubject,
  map,
  Observable,
  of,
  ReplaySubject,
  switchMap,
  take,
  tap,
  throwError,
} from "rxjs";
import { User } from "app/core/user/user.types";
import { Router } from "@angular/router";
import { environment } from "environments/environment";
import { Constants } from "app/shared/constants";
import { Pagination } from "../pagination/pagination.types";
import { LocalStorageService } from "../local/local-storage.service";
import { MasterService } from "../master.service";

@Injectable({
  providedIn: "root",
})
export class UserService {
  pageSize: any = Constants.pageLimit;
  timezone: BehaviorSubject<string> = new BehaviorSubject("");
  private _user: ReplaySubject<User> = new ReplaySubject<User>(1);
  private _seller: ReplaySubject<User> = new ReplaySubject<User>(1);

  // Private
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _users: BehaviorSubject<User[] | null> = new BehaviorSubject(null);
  private userD;
  /**
   * Constructor
   */
  constructor(
    private _httpClient: HttpClient,
    private _localService: LocalStorageService,
    private _router: Router,
    private _masterService: MasterService,
  ) {
    this.user$.subscribe((user: any) => {
      this.userD = user;
    });
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter for pagination
   */
  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }

  /**
   * Getter for customers
   */
  get users$(): Observable<User[]> {
    return this._users.asObservable();
  }

  get user$(): Observable<User> {
    return this._user.asObservable();
  }

  get seller$(): Observable<User> {
    return this._seller.asObservable();
  }

  /**
   * Setter & getter for user
   *
   * @param value
   */
  set user(value: User) {
    // Store the value
    this._user.next(value);
    this._localService.setItem("user", value);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get the current logged in user data
   */
  get(): Observable<User> {
    this.user = this._localService.getItem("user");
    this._user.next(this._localService.getItem("user"));
    if (!this._localService.getItem("user")) {
      this._router.navigate(["/sign-in"]);
    }
    return of(this._localService.getItem("user"));
  }

  /**
   * Update the user
   *
   * @param user
   */

  update(formData: User): Observable<any> {
    const userId =
      this.userD?.id ||
      this.userD?._id ||
      this._localService.getItem("user")?.id ||
      this._localService.getItem("user")?._id ||
      "";
    const obj = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      contact_no: formData.contact_no,
      business_address: formData.business_address,
      country_name: formData.country_name,
      avatar: formData.avatar,
    };
    return this._masterService.patch("/users/update-user/" + userId, obj).pipe(
      map((response: any) => {
        this._user.next(response.data);
        return response;
      }),
    );
  }

  /**
   * Update user profile image
   *
   * @param obj
   */
  uploadImage(obj): Observable<any> {
    return this._httpClient.post(
      environment.apiBaseUrl + "/users/profile/upload-image",
      obj,
    );
  }

  deleteImage(obj): Observable<any> {
    return this._httpClient.post(
      environment.apiBaseUrl + "/users/profile/delete-image",
      obj,
    );
  }

  /**
   * Update user password
   *
   * @param obj
   */

  changePassword(formData): any {
    const userId =
      this.userD?.id ||
      this.userD?._id ||
      this._localService.getItem("user")?.id ||
      this._localService.getItem("user")?._id ||
      "";
    const obj = {
      userId: userId,
      password: formData.newPassword,
      oldpassword: formData.currentPassword,
    };
    return this._httpClient
      .post(environment.apiBaseUrl + "/auth/change-password", obj)
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

  /**
   * Get customers
   *
   *
   * @param page
   * @param size
   * @param sort
   * @param order
   * @param search
   */
  getUsers(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
    countBasedFilter = {},
  ): Observable<{ pagination: Pagination; data: User[] }> {
    // Helper function to remove empty, null, or undefined keys
    const cleanObject = (obj: any) => {
      const cleanObj: any = {};
      if (obj) {
        Object.keys(obj).forEach((key) => {
          const val = obj[key];
          if (val !== undefined && val !== null && val !== "") {
            cleanObj[key] = val;
          }
        });
      }
      return cleanObj;
    };

    // Clean both dynamic filter inputs
    const cleanFilters = cleanObject(filterQuery);
    const cleanCountFilters = cleanObject(countBasedFilter);

    return this._httpClient
      .get<{ pagination: Pagination; data: User[] }>(
        environment.apiBaseUrl + "/users",
        {
          params: {
            page: page,
            limit: size,
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...cleanFilters, // Spreads only keys with actual valid values
            ...cleanCountFilters, // Spreads only keys with actual valid values
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

  /**
   * Get Premises User
   *
   *
   * @param page
   * @param size
   * @param sort
   * @param order
   * @param search
   */
  getPremisesUsers(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: User[] }> {
    // Helper function to remove empty, null, or undefined keys from parameters
    const cleanObject = (obj: any) => {
      const cleanObj: any = {};
      if (obj) {
        Object.keys(obj).forEach((key) => {
          const val = obj[key];
          // Strip out anything that isn't a valid value
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

    // Clean your dynamic filter inputs (handles status, shops, etc.)
    const cleanFilters = cleanObject(filterQuery);

    return this._httpClient
      .get<{ pagination: Pagination; data: User[] }>(
        environment.apiBaseUrl + "/users",
        {
          params: {
            page: page,
            limit: size,
            sortBy: `${sort}:${order || "desc"}`,
            search,
            isPremisesUser: true, // Kept explicitly true as required
            ...cleanFilters, // Spreads safely without dirtying url strings
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
  /**
   * Activate / deactivate the user
   *
   * @params userId
   */
  changeSellerStatus(id, action_type): any {
    const obj = {
      action_type,
    };
    return this._httpClient
      .post(environment.apiBaseUrl + "/users/" + id, obj)
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

  /**
   * Delete the user
   *
   * @params userId
   */
  deleteSeller(userId): any {
    return this._masterService.delete("/users/delete-user/" + userId).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          return of(response);
        } else {
          return throwError(response);
        }
      }),
    );
  }

  /**
   * Get the user by Id
   */
  getUserById(id: string): any {
    return this._httpClient.get<User>(environment.apiBaseUrl + "/users/" + id);
  }

  getSellerById(id: string): Observable<User> {
    return this._users.pipe(
      take(1),
      map((users) => {
        // Find the contact
        const user =
          users?.find((item: any) => item._id === id || item.id === id) || null;

        // Update the contact
        this._seller.next(user);

        // Return the contact
        return user;
      }),
      switchMap((user) =>
        // if (!user) {
        //     return throwError('Could not found user with id of ' + id + '!');
        // }

        of(user),
      ),
    );
  }
  clearSeller(): void {
    this._seller.next(null);
  }

  /**
   * Add Update role
   */
  addUser(formData: User): Observable<User> {
    return this._masterService.post("/users/create-user", formData).pipe(
      switchMap((response: any) => {
        if (response.status === 200) {
          const users = this._users.getValue() || [];
          this._users.next([response.data, ...users]);
          return of(response);
        } else {
          return throwError(response);
        }
      }),
    );
  }

  /**
   *  Update role
   */
  updateUser(userId: string, formData: User): Observable<User> {
    return this._masterService
      .patch("/users/update-user/" + userId, formData)
      .pipe(
        switchMap((response: any) => {
          if (response.status === 200) {
            const users = this._users.getValue();
            // Find the index of the updated user
            const index = users
              ? users.findIndex(
                  (user: any) => user._id === userId || user.id === userId,
                )
              : -1;

            if (index !== -1 && users) {
              users[index] = { ...users[index], ...response.data };
              this._users.next([...users]);
            }
            return of(response);
          } else {
            return throwError(response);
          }
        }),
      );
  }

  getAllUser(): Observable<User> {
    return this._httpClient
      .get<User>(environment.apiBaseUrl + "/users/get-all/active")
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

  getAllUsers(): any {
    return this._httpClient.get<User>(
      environment.apiBaseUrl + "/users/get-all-user",
    );
  }

  sallerNameList(type?: string): any {
    return this._httpClient.get(
      environment.apiBaseUrl + "/users/get-all-seller-list",
      {
        params: type ? { type } : {},
      },
    );
  }

  /**
   * Get seller details by id
   */
  getSellerDetailsById(sellerId: string): Observable<User> {
    return this._httpClient.get<User>(
      environment.apiBaseUrl + "/users/seller-details/" + sellerId,
    );
  }

  /**
   * Transform avatar URL to use primary color instead of green
   * Converts background color from 084f08 (green) to 1e3a8a (primary blue)
   */
  transformAvatarUrl(profileImgUrl: string): string {
    if (!profileImgUrl) {
      return profileImgUrl;
    }
    // Replace green background color with primary color
    return profileImgUrl.replace(/background=084f08/gi, "background=1e3a8a");
  }

  assignPlan(
    userId: string,
    planId: string,
    billingCycle: string,
  ): Observable<any> {
    return this._httpClient.post(
      environment.apiBaseUrl + `/users/assign-plan`,
      { userId, planId, billingCycle },
    );
  }

  /**
   * Immediately replace a seller's ACTIVE plan with a new plan instance.
   * POST /users/:sellerId/subscription/force-activate
   * The replaced subscription is expired (usage rows age out via TTL) and the new
   * plan becomes the single active subscription.
   */
  forceActivatePlan(
    sellerId: string,
    body: {
      subscription_id: string;
      plan_id: string;
      billing_cycle: "monthly" | "quarterly";
    },
  ): Observable<any> {
    return this._httpClient.post(
      environment.apiBaseUrl + `/users/${sellerId}/subscription/force-activate`,
      body,
    );
  }

  /**
   * Cancel a seller's QUEUED subscription instances by subscription ID.
   * POST /users/:sellerId/subscription/cancel
   * Active instances cannot be cancelled — they run until expiry.
   */
  cancelSubscription(
    sellerId: string,
    body?: { subscription_id?: string; subscription_ids?: string[] },
  ): Observable<any> {
    return this._httpClient.post(
      environment.apiBaseUrl + `/users/${sellerId}/subscription/cancel`,
      body || {},
    );
  }

  /**
   * Reorder future subscriptions by drag-and-drop.
   * POST /users/:sellerId/subscription/reorder-queue
   */
  reorderQueues(
    sellerId: string,
    orderedSubscriptionIds: string[],
  ): Observable<any> {
    return this._httpClient.post(
      environment.apiBaseUrl + `/users/${sellerId}/subscription/reorder-queue`,
      { orderedSubscriptionIds },
    );
  }

  /**
   * Immediately cancel the active subscription and promote the next future.
   * POST /users/:sellerId/subscription/admin-cancel-active
   */
  adminCancelActiveSubscription(sellerId: string): Observable<any> {
    return this._httpClient.post(
      environment.apiBaseUrl +
        `/users/${sellerId}/subscription/admin-cancel-active`,
      {},
    );
  }

  /**
   * Extend the active subscription's period without queuing.
   * POST /users/:sellerId/subscription/renew-and-continue
   */
  renewAndContinue(sellerId: string): Observable<any> {
    return this._httpClient.post(
      environment.apiBaseUrl +
        `/users/${sellerId}/subscription/renew-and-continue`,
      {},
    );
  }

  /**
   * PATCH /users/:sellerId/usages/:subscriptionId/adjust-bulk — multiple features
   */
  adjustEffectiveLimitBulk(
    sellerId: string,
    subscriptionId: string,
    adjustments: { feature_id: string; delta: number }[],
  ): Observable<any> {
    return this._httpClient.patch(
      environment.apiBaseUrl +
        `/users/${sellerId}/usages/${subscriptionId}/adjust-bulk`,
      { adjustments },
    );
  }

  /**
   * POST /users/:sellerId/usages/:subscriptionId/reset — reset limits to
   * snapshot defaults
   */
  resetEffectiveLimits(
    sellerId: string,
    subscriptionId: string,
    featureIds: string[],
  ): Observable<any> {
    return this._httpClient.post(
      environment.apiBaseUrl +
        `/users/${sellerId}/usages/${subscriptionId}/reset`,
      { feature_ids: featureIds },
    );
  }

  getUserUsages(userId: string, bustCache = false): Observable<any> {
    const params = bustCache ? { _t: String(Date.now()) } : undefined;
    return this._httpClient.get(
      environment.apiBaseUrl + `/users/${userId}/usages`,
      params ? { params } : {},
    );
  }

  /**
   * GET /payments/my-subscription — active subscription for the active seller
   */
  getMyActiveSubscription(sellerId?: string): Observable<any> {
    const params: any = sellerId ? { userId: sellerId } : undefined;
    return this._httpClient.get(
      environment.apiBaseUrl + "/payments/my-subscription",
      params ? { params } : undefined,
    );
  }

  /**
   * GET /payments/my-subscriptions — all subscriptions for the active seller
   */
  getAllMySubscriptions(sellerId?: string): Observable<any> {
    const params: any = sellerId ? { userId: sellerId } : undefined;
    return this._httpClient.get(
      environment.apiBaseUrl + "/payments/my-subscriptions",
      params ? { params } : undefined,
    );
  }

  /**
   * GET /payments/my-history — paginated payment history for the active seller
   */
  getMyPaymentHistory(
    page: number = 1,
    limit: number = 10,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    sellerId?: string,
  ): Observable<any> {
    const params: any = {
      page,
      limit,
      sortBy: `${sort}:${order || "desc"}`,
    };
    if (sellerId) {
      params.userId = sellerId;
    }
    return this._httpClient.get(
      environment.apiBaseUrl + "/payments/my-history",
      { params },
    );
  }

  /**
   * GET /subscription-notifications/my — notifications for the active seller
   */
  getMySubscriptionNotifications(
    page: number = 1,
    limit: number = 10,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    sellerId?: string,
  ): Observable<any> {
    const params: any = {
      page,
      limit,
      sortBy: `${sort}:${order || "desc"}`,
    };
    if (sellerId) {
      params.userId = sellerId;
    }
    return this._httpClient.get(
      environment.apiBaseUrl + "/subscription-notifications/my",
      { params },
    );
  }

  /**
   * Get subscription users list with backend pagination/search/filter/sort
   */
  getSubscriptionUsers(
    page: number = 1,
    size: number = 25,
    search: string = "",
    filters: Record<string, string> = {},
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
  ): Observable<any> {
    const params: any = {
      page,
      limit: size,
      sortBy: `${sort}:${order || "desc"}`,
      ...this._buildFilterParams(search, filters),
    };
    return this._httpClient.get(
      environment.apiBaseUrl + "/public-checkout/admin/subscription-users",
      { params },
    );
  }

  /**
   * Get leads list with backend pagination/search/filter/sort
   */
  getLeads(
    page: number = 1,
    size: number = 25,
    search: string = "",
    filters: Record<string, string> = {},
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
  ): Observable<any> {
    const params: any = {
      page,
      limit: size,
      sortBy: `${sort}:${order || "desc"}`,
      ...this._buildFilterParams(search, filters),
    };
    return this._httpClient.get(
      environment.apiBaseUrl + "/public-checkout/admin/leads",
      { params },
    );
  }

  /**
   * Build cleaned query params — strips empty/null/undefined filter keys
   * and only appends the search term when present.
   */
  private _buildFilterParams(
    search: string = "",
    filters: Record<string, string> = {},
  ): Record<string, string> {
    const params: Record<string, string> = {};
    if (search) {
      params["search"] = search;
    }
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        params[k] = v;
      }
    });
    return params;
  }
}
