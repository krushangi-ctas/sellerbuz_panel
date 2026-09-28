import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import {
  BehaviorSubject,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from "rxjs";

export interface CompanyInfo {
  name: string;
  website?: string;
  tagline?: string;
  about?: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code: string;
  working_hours?: string;
  timezone?: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
}

export interface FooterSettings {
  about?: string;
  copyright_text?: string;
  show_social?: boolean;
  show_contact?: boolean;
  show_address?: boolean;
  show_working_hours?: boolean;
}

export interface WebSettings {
  company: CompanyInfo;
  contact: ContactInfo;
  social?: SocialLinks;
  footer?: FooterSettings;
}

@Injectable({
  providedIn: "root",
})
export class WebSettingsService {
  private _settings: BehaviorSubject<WebSettings | null> = new BehaviorSubject(
    null,
  );

  constructor(private _httpClient: HttpClient) {}

  get settings$(): Observable<WebSettings | null> {
    return this._settings.asObservable();
  }

  getWebSettings(): Observable<any> {
    return this._httpClient
      .get<any>(environment.apiBaseUrl + "/web-settings")
      .pipe(
        tap((response) => {
          const settings = response?.data || response;
          this._settings.next(settings);
        }),
      );
  }

  updateWebSettings(dto: WebSettings): Observable<any> {
    return this._httpClient
      .put<any>(environment.apiBaseUrl + "/web-settings", dto)
      .pipe(
        switchMap((response: any) => {
          if (response) {
            this._settings.next(response);
            return of(response);
          }
          return throwError(() => new Error("Update failed"));
        }),
      );
  }
}
