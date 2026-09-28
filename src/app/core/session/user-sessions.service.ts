import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, filter, firstValueFrom } from "rxjs";
import { NavigationEnd, Router } from "@angular/router";
import { SessionStorageService } from "../local/session-storage.service";
import { LocalStorageService } from "../local/local-storage.service";
import { HttpClient } from "@angular/common/http";
import { Pagination } from "../pagination/pagination.types";
import { Inventory } from "../inventory/inventory.model";
import { environment } from "environments/environment";

@Injectable({
  providedIn: "root",
})
export class UserSessionsService {
  private SELLER_KEY = "active_seller_id";
  private _currentSellerId$ = new BehaviorSubject<string | null>(null);
  constructor(
    private _router: Router,
    private _sessionService: SessionStorageService,
    private _localService: LocalStorageService,
    private _httpClient: HttpClient,
  ) {
    this._listenToRouteChanges();
  }

  // Listen to URL changes and update currentSellerId
  private _listenToRouteChanges(): void {
    this._router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const segments = this._router.url.split("/");
        const sellerId = segments[1];

        if (sellerId && /^[a-f\d]{24}$/i.test(sellerId)) {
          const currentStoredSeller = this.getCurrentSellerId();

          if (currentStoredSeller !== sellerId) {
            this.syncSellerState(sellerId);
          }
        } else {
          const isImpersonate = this._router.url.includes("impersonate=1");

          if (!isImpersonate) {
            this.syncSellerState(null);
          }
        }
      });
  }
  get currentSellerId$(): Observable<string | null> {
    return this._currentSellerId$.asObservable();
  }

  // Return sellerId from current route URL if present (e.g. /6a635d5935f75fa5f8cdeb0e/master/...)
  getSellerIdFromUrl(): string | null {
    const url =
      this._router?.url ||
      (typeof window !== "undefined" ? window.location.pathname : "") ||
      "";
    const segments = url.split("/").filter(Boolean);
    const firstSegment = segments[0];
    if (firstSegment && /^[a-f\d]{24}$/i.test(firstSegment)) {
      return firstSegment;
    }
    return null;
  }

  // Return current sellerId directly
  getCurrentSellerId(): string | null {
    return (
      this.getSellerIdFromUrl() || this._sessionService.getItem(this.SELLER_KEY)
    );
  }

  // Check if impersonating
  isImpersonating(): boolean {
    return !!this.getCurrentSellerId();
  }

  // Return correct user based on session context
  getCurrentUser(): any {
    const sellerId = this.getCurrentSellerId();
    if (sellerId) {
      const sessionUsers = this._sessionService.getItem("userArray") || [];
      const matchedUser = sessionUsers.find(
        (u: any) => (u.id || u._id) === sellerId,
      );
      if (matchedUser) {
        if (matchedUser._id && !matchedUser.id) {
          matchedUser.id = matchedUser._id;
        }
        return matchedUser;
      }

      void this.fetchAndAddImpersonatedUser(sellerId);
      const updatedUsers = this._sessionService.getItem("userArray") || [];
      const updatedMatchedUser = updatedUsers.find(
        (u: any) => (u.id || u._id) === sellerId,
      );
      if (updatedMatchedUser) {
        if (updatedMatchedUser._id && !updatedMatchedUser.id) {
          updatedMatchedUser.id = updatedMatchedUser._id;
        }
        return updatedMatchedUser;
      }

      const localUser = this._localService.getItem("user");
      return {
        ...(localUser || {}),
        id: sellerId,
        _id: sellerId,
      };
    }

    return this._localService.getItem("user");
  }
  // Return correct user based on session context
  setCurrentUser(userData: any): any {
    const sellerId = this.getCurrentSellerId();
    if (sellerId) {
      const sessionUsers = this._sessionService.getItem("userArray") || [];
      const matchedUser = sessionUsers.findIndex((u: any) => u.id === sellerId);
      if (matchedUser !== -1) {
        sessionUsers[matchedUser] = userData;
        this._sessionService.setItem("userArray", sessionUsers);
        return true;
      }
    } else {
      this._localService.setItem("user", userData);
    }
  }
  async IsUserExistInSession(sellerId: string) {
    if (sellerId) {
      const sessionUsers = this._sessionService.getItem("userArray") || [];
      const matchedUser = sessionUsers.find((u: any) => u.id === sellerId);
      if (matchedUser) {
        return matchedUser;
      } else {
        return null;
      }
    }
    return null;
  }
  // Fetch and append impersonated seller to session

  async fetchAndAddImpersonatedUser(sellerId: string): Promise<void> {
    const query = { seller_id: sellerId };

    try {
      const res: any = await firstValueFrom(
        this.getAllInventoryForAdmin(1, 1, "createdAt", "desc", "", query),
      );

      if (res?.data) {
        const userArray = this._sessionService.getItem("userArray") || [];
        const userObj = { ...res.data };
        if (userObj._id && !userObj.id) {
          userObj.id = userObj._id;
        }
        userArray.push(userObj);

        this._sessionService.setItem("userArray", userArray);

        const id = userObj.id || userObj._id;
        if (id) {
          this._currentSellerId$.next(id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch impersonated user:", err);
    }
  }

  getActiveSellerId(): string | null {
    return this._sessionService.getItem(this.SELLER_KEY);
  }

  setActiveSellerId(sellerId: string | null): void {
    if (sellerId) {
      this._sessionService.setItem(this.SELLER_KEY, sellerId);
    } else {
      this._sessionService.removeItem(this.SELLER_KEY);
    }
  }
  private syncSellerState(sellerId: string | null): void {
    if (sellerId) {
      this._sessionService.setItem(this.SELLER_KEY, sellerId);
    } else {
      this._sessionService.removeItem(this.SELLER_KEY);
    }
    this._currentSellerId$.next(sellerId);
  }

  getLocalUser() {
    return this._localService.getItem("user")?.id || "";
  }

  getPermissionSellerId(): string {
    const currentUser = this.getCurrentUser();
    return (
      currentUser?.seller_id || currentUser?.id || this.getLocalUser() || ""
    );
  }

  getAllInventoryForAdmin(
    page: number = 1,
    size: number = 100,
    sort: string = "createdAt",
    order: "asc" | "desc" | "" = "desc",
    search: string = "",
    filterQuery: any = {},
  ): Observable<{ pagination: Pagination; data: Inventory[] }> {
    return this._httpClient.get<{ pagination: Pagination; data: Inventory[] }>(
      `${environment.apiBaseUrl}/inventory/get-all-inventory-list-for-admin`,
      {
        params: {
          page: page,
          limit: size,
          sortBy: `${sort}:${order || "desc"}`,
          search,
          ...filterQuery,
        },
        headers: {
          premisesUser: this.getLocalUser(),
        },
      },
    );
  }
}
