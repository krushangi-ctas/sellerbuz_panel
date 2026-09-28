import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from "@angular/router";
import { Observable } from "rxjs";
import { Pagination } from "app/core/pagination/pagination.types";
import { InventoryService } from "app/core/inventory/inventory.service";
import { Inventory } from "app/core/inventory/inventory.model";

@Injectable({ providedIn: "root" })
export class AdminInventoryResolver implements Resolve<any> {
  constructor(private _inventorynventoryService: InventoryService) {}

  /**
   * Resolver
   *
   * @param _route
   * @param _state
   */
  resolve(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<{ pagination: Pagination; data: Inventory[] }> {
    return this._inventorynventoryService.getAllInventoryForAdmin();
  }
}
