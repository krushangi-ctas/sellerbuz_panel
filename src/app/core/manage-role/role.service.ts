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
import { CreateRole, Feature, ResponseFeatureObject, Role } from "./role.model";
import { MasterService } from "../master.service";

@Injectable({
  providedIn: "root",
})
export class RoleService {
  pageSize: any = Constants.pageLimit;

  // Private
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _roles: BehaviorSubject<Role[] | null> = new BehaviorSubject(null);
  private _features = new BehaviorSubject<Feature[] | null>(null);
  /**
   * Constructor
   */
  constructor(
    private _httpClient: HttpClient,
    private _masterService: MasterService,
  ) {
    this.getActiveFeaturesAndSectionsList().subscribe();
  }
  /**
   * Getter for pagination
   */
  get pagination$(): Observable<Pagination> {
    return this._pagination.asObservable();
  }
  // Getter for Roles
  get roles$(): Observable<Role[]> {
    return this._roles.asObservable();
  }
  // Getter for Features
  get features$(): Observable<Feature[] | null> {
    return this._features.asObservable();
  }
  /**
   * Get role
   *
   *
   * @param page
   * @param size
   * @param sort
   * @param order
   * @param search
   */
  getRoles(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: Role[] }> {
    // Helper function to remove empty, null, or undefined keys
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
      .get<{ pagination: Pagination; data: Role[] }>(
        environment.apiBaseUrl + "/manage-role",
        {
          params: {
            page: page,
            limit: size,
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...cleanFilters, // Safely spreads filtered keys
          },
        },
      )
      .pipe(
        tap((response) => {
          this._pagination.next(response.pagination);
          this._roles.next(response.data);
        }),
      );
  }

  /**
   * Get role by id
   */
  getRoleById(
    id: string,
  ): Observable<{ status: number; data: Role; message: string }> {
    return this._httpClient.get<{
      status: number;
      data: Role;
      message: string;
    }>(environment.apiBaseUrl + "/manage-role/" + id);
  }

  /**
   * Add Update role
   */
  addRole(
    formData: CreateRole,
  ): Observable<{ status: number; data: CreateRole; message: string }> {
    const obj = {
      role: { role_name: formData.role_name },
      permissions: formData?.permissions,
    };
    return this._masterService.post("/manage-role/create-role", obj).pipe(
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
   *  Update role
   */
  updateRole(formData: CreateRole, roleId: string): Observable<Role> {
    const obj = {
      role: { role_name: formData.role_name },
      permissions: formData?.permissions,
    };
    return this._masterService.patch("/manage-role/" + roleId, obj).pipe(
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
   * Delete the role
   *
   * @param roleId
   */
  deleteRole(roleId: string): Observable<any> {
    return this._masterService
      .delete(`/manage-role/delete-role/${roleId}`)
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
  updateRoleStatus(id: string, data): Observable<Role> {
    return this._masterService.put(
      `/manage-role/update-role-status/${id}`,
      data,
    );
  }
  getSections(): Observable<any> {
    return this._httpClient.get<[]>(
      environment.apiBaseUrl + "/sections/section-list",
    );
  }
  /**
   * Get all role for user
   */
  getAllRole(): Observable<any> {
    return this._httpClient.get<[]>(
      environment.apiBaseUrl + "/manage-role/role-list",
    );
  }
  /**
   * Get all features for user
   **/
  getActiveFeaturesAndSectionsList(): Observable<ResponseFeatureObject> {
    return this._httpClient
      .get<ResponseFeatureObject>(
        environment.apiBaseUrl + "/manage-role/active/features",
      )
      .pipe(
        tap((res) => {
          this._features.next(res.data);
        }),
      );
  }
}
