import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from "@angular/router";
import { ContactService } from "app/core/manage-contact/contact.service";
import { ContactListResponse } from "app/core/manage-contact/contact.model";
import { Observable } from "rxjs";

@Injectable({ providedIn: "root" })
export class ContactResolver implements Resolve<any> {
  constructor(private _contactService: ContactService) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<ContactListResponse> {
    return this._contactService.getContacts();
  }
}
