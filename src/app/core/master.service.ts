import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { Observable } from "rxjs";
import { LocalStorageService } from "./local/local-storage.service";
import { SessionStorageService } from "./local/session-storage.service";
import { UserSessionsService } from "./session/user-sessions.service";

@Injectable({
  providedIn: "root",
})
export class MasterService {
  userId: string;
  /**
   * Constructor
   */
  constructor(
    private _httpClient: HttpClient,
    private _localService: LocalStorageService,
    private _sessionSerice: SessionStorageService,
    private _userSessionService: UserSessionsService,
  ) {}

  /**
   * Get userId dynamically from local storage
   */

  // 👉 Dynamically use current seller id or fallback
  private getUserId(): string {
    const currentUser = this._userSessionService.getCurrentUser();
    if (currentUser?.id) {
      return currentUser.id;
    }

    const localUser = this._localService.getItem("user");
    return localUser?.id || "";
  }

  // 👉 Premises user always comes from LOCAL storage
  private getPremisesUserId(): string {
    const localUser = this._localService.getItem("user");
    return localUser?.id || "";
  }
  post(url: string, data: object | FormData): Observable<any> {
    return this._httpClient.post<any>(
      environment.apiBaseUrl + url + "/" + this.getUserId(),
      data,
      {
        headers: {
          premisesUser: this.getPremisesUserId(),
        },
      },
    );
  }

  put(url: string, data: any): Observable<any> {
    return this._httpClient.put<any>(
      environment.apiBaseUrl + url + "/" + this.getUserId(),
      data,
      {
        headers: {
          premisesUser: this.getPremisesUserId(),
        },
      },
    );
  }

  delete(url): Observable<any> {
    return this._httpClient.delete<any>(
      environment.apiBaseUrl + url + "/" + this.getUserId(),
      {
        headers: {
          premisesUser: this.getPremisesUserId(),
        },
      },
    );
  }

  get(
    url: string,
    params?: { [key: string]: any },
    noUserId: boolean = false,
  ): Observable<any> {
    if (noUserId) {
      if (params && Object.keys(params).length > 0) {
        if (this.getPremisesUserId()) {
          params["headers"] = { premisesUser: this.getPremisesUserId() };
        }
        return this._httpClient.get<any>(environment.apiBaseUrl + url, {
          ...params,
        });
      }
      return this._httpClient.get<any>(environment.apiBaseUrl + url, {
        headers: { premisesUser: this.getPremisesUserId() },
      });
    }
    if (params && Object.keys(params).length > 0) {
      if (this.getPremisesUserId()) {
        params["headers"] = { premisesUser: this.getPremisesUserId() };
      }
      return this._httpClient.get<any>(
        environment.apiBaseUrl + url + "/" + this.getUserId(),
        { ...params },
      );
    }
    return this._httpClient.get<any>(
      environment.apiBaseUrl + url + "/" + this.getUserId(),
      { headers: { premisesUser: this.getPremisesUserId() } },
    );
  }

  patch(url, data): Observable<any> {
    return this._httpClient.patch<any>(
      environment.apiBaseUrl + url + "/" + this.getUserId(),
      data,
      { headers: { premisesUser: this.getPremisesUserId() } },
    );
  }

  getSessionUserId(): string {
    const user = this._sessionSerice.getItem("user");
    return user?.id || null;
  }
  usePremisesUserId(): string {
    return this.getPremisesUserId();
  }
}
