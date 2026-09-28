import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Constants } from "app/shared/constants";
import { environment } from "environments/environment";
import {
  BehaviorSubject,
  Observable,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from "rxjs";
import { Pagination } from "../pagination/pagination.types";
import {
  CreatePlan,
  Currency,
  Feature,
  Plan,
  ResponseCurrncyObject,
  ResponseFeatureObject,
  ResponsePublicPlanObject,
} from "./plan.model";
import { MasterService } from "../master.service";

@Injectable({
  providedIn: "root",
})
export class PlanService {
  pageSize: any = Constants.pageLimit;

  // Private
  private _pagination: BehaviorSubject<Pagination | null> = new BehaviorSubject(
    null,
  );
  private _plans: BehaviorSubject<Plan[] | null> = new BehaviorSubject(null);
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
  // Getter for Plans
  get plans$(): Observable<Plan[]> {
    return this._plans.asObservable();
  }

  // Getter for Features
  get features$(): Observable<Feature[] | null> {
    return this._features.asObservable();
  }
  /**
   * Get plan
   * @param page
   * @param size
   * @param sort
   * @param order
   * @param search
   */
  getPlans(
    page: number = 1,
    size: number = this.pageSize,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: Plan[] }> {
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

    return this._httpClient
      .get<{ pagination: Pagination; data: Plan[] }>(
        environment.apiBaseUrl + "/manage-plan",
        {
          params: {
            page: page,
            limit: size,
            sortBy: `${sort}:${order || "desc"}`,
            search,
            ...cleanFilters, // Safely spreads filtered keys without sending bad parameters
          },
        },
      )
      .pipe(
        tap((response) => {
          this._pagination.next(response.pagination);
          this._plans.next(response.data);
        }),
      );
  }

  /**
   * Get plan by id
   */
  getPlanById(
    id: string,
  ): Observable<{ status: number; data: Plan; message: string }> {
    return this._httpClient.get<{
      status: number;
      data: Plan;
      message: string;
    }>(environment.apiBaseUrl + "/manage-plan/" + id);
  }

  /**
   * Add Update plan
   */
  addPlan(
    formData: CreatePlan,
  ): Observable<{ status: number; data: CreatePlan; message: string }> {
    return this._masterService.post("/manage-plan/create-plan", formData).pipe(
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
   *  Update plan
   */
  updatePlan(formData: CreatePlan, planId: string): Observable<Plan> {
    return this._masterService.patch("/manage-plan/" + planId, formData).pipe(
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
   * Delete the plan
   *
   * @param planId
   */
  deletePlan(planId: string): Observable<any> {
    return this._masterService
      .delete(`/manage-plan/delete-plan/${planId}`)
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
  updatePlanStatus(id: string, data): Observable<Plan> {
    return this._masterService.put(
      `/manage-plan/update-plan-status/${id}`,
      data,
    );
  }
  getSections(): Observable<any> {
    return this._httpClient.get<[]>(
      environment.apiBaseUrl + "/sections/section-list",
    );
  }
  /**
   * Get all plan for user
   */
  getAllPlan(): Observable<any> {
    return this._httpClient.get<[]>(
      environment.apiBaseUrl + "/manage-plan/plan-list",
    );
  }

  /**
   * Get all currently active plans for the public / seller-facing pricing.
   * Public - no auth required.
   * Endpoint: GET /v1/manage-plan/public/plans
   */
  getPublicPlans(): Observable<ResponsePublicPlanObject> {
    return this._httpClient.get<ResponsePublicPlanObject>(
      environment.apiBaseUrl + "/manage-plan/public/plans",
    );
  }

  /**
   * Get all active currencies / countries for the checkout country dropdown.
   * Public - no auth required.
   * Endpoint: GET /v1/manage-plan/get-currencies
   */
  getCurrencies(): Observable<ResponseCurrncyObject> {
    return this._httpClient.get<ResponseCurrncyObject>(
      environment.apiBaseUrl + "/manage-plan/get-currencies",
    );
  }

  /**
   * Get all features for user
   **/
  getActiveFeaturesAndSectionsList(): Observable<ResponseFeatureObject> {
    return this._httpClient
      .get<ResponseFeatureObject>(
        environment.apiBaseUrl + "/manage-plan/active/features",
      )
      .pipe(tap((res) => this._features.next(res.data)));
  }
}
