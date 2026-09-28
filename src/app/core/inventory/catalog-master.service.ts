import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { InventoryService } from "./inventory.service";

@Injectable({
  providedIn: "root",
})
export class CatalogMasterService {
  constructor(private inventoryService: InventoryService) {}

  /**
   * Search tbl_catalog_masters by SKU to fetch catalog product details (including title)
   * @param sku The product SKU
   * @param marketplaceId Dynamic active marketplace ID
   */
  getProductBySku(sku: string, marketplaceId: string): Observable<any> {
    if (!sku || !sku.trim()) {
      return of(null);
    }
    return this.inventoryService
      .getProductDetailsBySku(sku.trim(), marketplaceId)
      .pipe(
        map((res: any) => {
          if (res && res.status === 200 && res.data) {
            return res.data;
          }
          return null;
        }),
        catchError(() => of(null)),
      );
  }
}
