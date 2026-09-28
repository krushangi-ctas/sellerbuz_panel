import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of, switchMap, throwError } from "rxjs";
import { UserService } from "app/core/user/user.service";
import { environment } from "environments/environment";
import { LocalStorageService } from "../local/local-storage.service";
import { Router } from "@angular/router";
import { DashbordService } from "../dashbord/dashbord.service";
import { SupportSocketService } from "../support/support-socket.service";

@Injectable()
export class AuthService {
  private _authenticated = false;

  /**
   * Constructor
   */
  constructor(
    private _httpClient: HttpClient,
    private _userService: UserService,
    private _localService: LocalStorageService,
    private _router: Router,
    private _dashbordService: DashbordService,
    private _supportSocketService: SupportSocketService,
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------
  /**
   * Setter & getter for access token
   */
  get accessToken(): string {
    return this._localService.getItem("accessToken") ?? "";
  }

  set accessToken(token: string) {
    this._localService.setItem("accessToken", token);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  updatePassword(data): Observable<any> {
    return this._httpClient.post(
      `${environment.apiBaseUrl}/auth/change-password`,
      data,
    );
  }

  /**
   * Send OTP
   *
   * @param email
   */
  sendOtp(email: string): Observable<any> {
    return this._httpClient.post(`${environment.apiBaseUrl}/auth/send-otp`, {
      email,
    });
  }

  /**
   * Verify OTP and Login
   *
   * @param email
   * @param otp
   */
  verifyOtp(email: string, otp: string): Observable<any> {
    if (this.accessToken) {
      return throwError(() => "User is already logged in.");
    }

    return this._httpClient
      .post(`${environment.apiBaseUrl}/auth/verify-otp`, { email, otp })
      .pipe(
        switchMap((response: any) => {
          if (response?.tokens?.access?.token) {
            this.accessToken = response.tokens.access.token;
          }
          this._authenticated = true;
          if (response?.user) {
            this._userService.user = response.user;
          }
          return of(response);
        }),
      );
  }

  /**
   * Verify Password and Login (for Developers)
   *
   * @param email
   * @param password
   */
  verifyPassword(email: string, password: string): Observable<any> {
    if (this.accessToken) {
      return throwError(() => "User is already logged in.");
    }

    return this._httpClient
      .post(`${environment.apiBaseUrl}/auth/verify-password`, {
        email,
        password,
      })
      .pipe(
        switchMap((response: any) => {
          if (response?.tokens?.access?.token) {
            this.accessToken = response.tokens.access.token;
          }
          this._authenticated = true;
          if (response?.user) {
            this._userService.user = response.user;
          }
          return of(response);
        }),
      );
  }

  /**
   * Sign in
   *
   * @param credentials
   */
  signIn(credentials: {
    email: string;
    password?: string;
    otp?: string;
  }): Observable<any> {
    // Throw error, if the user is already logged in
    if (this.accessToken) {
      return throwError(() => "User is already logged in.");
    }

    const endpoint = credentials.otp
      ? `${environment.apiBaseUrl}/auth/verify-otp`
      : `${environment.apiBaseUrl}/auth/login`;

    return this._httpClient.post(endpoint, credentials).pipe(
      switchMap((response: any) => {
        // Store the access token in the local storage
        if (response?.tokens?.access?.token) {
          this.accessToken = response.tokens.access.token;
        }

        // Set the authenticated flag to true
        this._authenticated = true;

        // Store the user on the user service
        if (response?.user) {
          this._userService.user = response.user;
        }

        // Return a new observable with the response
        return of(response);
      }),
    );
  }

  /**
   * Sign out
   */
  signOut(): Observable<any> {
    // Drop support socket before clearing auth so the old token is not reused
    this._supportSocketService.disconnect();
    // Remove the access token and user details from the local storage
    this._localService.removeItems(["accessToken", "user"]);
    localStorage.removeItem("selectedMarketplaceId");
    // Set the authenticated flag to false
    this._authenticated = false;

    // Return the observable
    return of(true);
  }

  /**
   * Sign up
   *
   * @param user
   */
  signUp(user: any): Observable<any> {
    return this._httpClient.post(
      `${environment.apiBaseUrl}/auth/register`,
      user,
    );
  }

  /**
   * Check the authentication status
   */
  check(): Observable<boolean> {
    // Check if the user is logged in
    if (this._authenticated) {
      return of(true);
    }

    // Check the access token availability
    if (!this.accessToken) {
      return of(false);
    }

    if (this.accessToken) {
      return of(true);
    }

    // Check the access token expire date
    // if (AuthUtils.isTokenExpired(this.accessToken)) {
    //     return of(false);
    // }
    // this._userService.user = this._localService.getItem('user') || {};
    // return of(true);
  }

  _checkToken(): Observable<any> {
    // Check the authentication status

    return this.check().pipe(
      switchMap((authenticated) => {
        // If the user is not authenticated...
        if (!authenticated) {
          // Redirect to the sign-in page
          this._router.navigate(["sign-in"]);
          // Prevent the access
          return of(false);
        }
        this._dashbordService.dashboardDetails().subscribe();
        // Allow the access
        return of(true);
      }),
    );
  }
}
