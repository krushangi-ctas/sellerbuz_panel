import { Injectable } from "@angular/core";
import { Observable, ReplaySubject } from "rxjs";

@Injectable({ providedIn: "root" })
export class AlertService {
  private _message: ReplaySubject<string> = new ReplaySubject<string>(1);
  public redirectUrl: string | null = null;

  constructor() {}
  get message$(): Observable<string> {
    return this._message.asObservable();
  }

  set message(value: string) {
    this._message.next(value);
  }
}
