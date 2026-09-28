import { Injectable } from "@angular/core";
import { Observable, ReplaySubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ClassyService {
  private _user: ReplaySubject<any> = new ReplaySubject<any>(1);
  /**
   * Constructor
   */
  constructor() {}
  get user$(): Observable<any> {
    return this._user.asObservable();
  }
  updateObserver() {
    this._user.next(Math.random());
  }
}
