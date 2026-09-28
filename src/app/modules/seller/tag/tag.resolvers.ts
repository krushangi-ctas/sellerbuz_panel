import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  Router,
  RouterStateSnapshot,
} from "@angular/router";
import { Pagination } from "app/core/pagination/pagination.types";
import { TagSettings } from "app/core/tag-setting/tag-setting.model";
import { PortalService } from "app/core/portal/portal.service";
import { Observable } from "rxjs";
import { TagService } from "app/core/tag-setting/tag-setting.service";
import { LocalStorageService } from "app/core/local/local-storage.service";

@Injectable({
  providedIn: "root",
})
export class TagResolver implements Resolve<any> {
  /**
   * Constructor
   */
  userInfo: any;
  constructor(private _tagService: TagService) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Resolver
   *
   * @param route
   * @param state
   */
  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<{ pagination: Pagination; data: TagSettings[] }> {
    return this._tagService.getAllTagList();
  }
}
