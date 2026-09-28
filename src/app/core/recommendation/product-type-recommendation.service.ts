import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { MasterService } from "app/core/master.service";
import {
  RecommendedProductType,
  RecommendedBrowseNode,
  RecommendationFullResult,
  RecommendApiPayload,
  ProductTypeGroup,
  buildGroupedProductTypes,
} from "./product-type-recommendation.types";

@Injectable({
  providedIn: "root",
})
export class ProductTypeRecommendationService {
  private fullRecommendationCache = new Map<string, RecommendationFullResult>();

  constructor(private _masterService: MasterService) {}

  /**
   * Call backend proxy endpoint /inventory/recommend-product-types
   * to get full AI recommendations including product_types and browser_nodes
   * @param title Product title
   * @param marketplaceId Dynamic active marketplace ID
   */
  getRecommendationsFull(
    title: string,
    marketplaceId: string,
  ): Observable<RecommendationFullResult> {
    if (!title || !title.trim() || !marketplaceId) {
      return of({ product_types: [], browser_nodes: [] });
    }

    const cleanTitle = title.trim();
    const cacheKey = `${cleanTitle}_${marketplaceId}`;

    if (this.fullRecommendationCache.has(cacheKey)) {
      return of(this.fullRecommendationCache.get(cacheKey)!);
    }

    const payload: RecommendApiPayload = {
      text: cleanTitle,
      marketplace_id: marketplaceId,
      top_product_types: 5,
      top_browser_nodes: 10,
      use_embeddings: true,
    };

    return this._masterService
      .post("/inventory/recommend-product-types", payload)
      .pipe(
        map((res: any) => {
          const data = res?.data || res;
          return {
            product_types: data?.product_types || [],
            browser_nodes: data?.browser_nodes || [],
          };
        }),
        tap((results: RecommendationFullResult) => {
          this.fullRecommendationCache.set(cacheKey, results);
        }),
        catchError((error) => {
          console.error("AI Recommendation API error:", error);
          return of({ product_types: [], browser_nodes: [] });
        }),
      );
  }

  /**
   * Backward compatible helper to get product types only
   */
  getRecommendations(
    title: string,
    marketplaceId: string,
  ): Observable<RecommendedProductType[]> {
    return this.getRecommendationsFull(title, marketplaceId).pipe(
      map((res) => res.product_types || []),
    );
  }

  /**
   * Helper to build 2-group ProductTypeGroup structure from master list & API recommendations
   */
  getGroupedProductTypes(
    masterList: any[],
    recommendedTypes: RecommendedProductType[],
  ): ProductTypeGroup[] {
    return buildGroupedProductTypes(masterList, recommendedTypes);
  }
}
