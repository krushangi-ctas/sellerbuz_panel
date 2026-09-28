export interface RecommendedProductType {
  product_type: string;
  display_name?: string;
  score?: number;
  marketplace_ids?: string[];
  available_in_requested_marketplace?: boolean;
}

export interface RecommendedBrowseNode {
  id: string;
  name: string;
  product_type?: string;
  marketplace_id?: string;
  score?: number;
}

export interface RecommendationFullResult {
  product_types: RecommendedProductType[];
  browser_nodes: RecommendedBrowseNode[];
}

export interface RecommendApiPayload {
  text: string;
  marketplace_id: string;
  top_product_types: number;
  top_browser_nodes: number;
  use_embeddings: boolean;
}

export interface RecommendApiResponse {
  product_types?: RecommendedProductType[];
  browser_nodes?: RecommendedBrowseNode[];
  status?: string | number;
  message?: string;
}

export interface ProductTypeOption {
  value: string;
  viewValue: string;
  score?: number;
  raw?: any;
}

export interface ProductTypeGroup {
  name: "Recommendation" | "Other";
  productTypes: ProductTypeOption[];
}

/**
 * Pure function to build grouped Product Type structure (Recommendation / Other)
 * @param masterList Array of master product types (e.g. [{ productType: 'HOME', displayName: 'Home' }, ...])
 * @param recommendedTypes Array of recommendation results from /recommend API
 * @returns ProductTypeGroup[] containing Recommendation and/or Other option groups
 */
export function buildGroupedProductTypes(
  masterList: any[] = [],
  recommendedTypes: RecommendedProductType[] = [],
): ProductTypeGroup[] {
  if (!Array.isArray(masterList)) {
    masterList = [];
  }
  if (!Array.isArray(recommendedTypes)) {
    recommendedTypes = [];
  }

  // Helper to extract key/code from a master list item (supporting string or object, camelCase & snake_case)
  const getMasterKey = (item: any): string => {
    if (!item) return "";
    if (typeof item === "string") return item.trim();
    return (item.productType || item.product_type || item.type || "")
      .toString()
      .trim();
  };

  // Helper to extract display label from a master list item
  const getMasterViewValue = (item: any): string => {
    if (!item) return "";
    if (typeof item === "string") return item.trim();
    return (
      item.displayName ||
      item.display_name ||
      item.productType ||
      item.product_type ||
      ""
    )
      .toString()
      .trim();
  };

  // Helper to extract key/code from recommendation item
  const getRecKey = (rec: any): string => {
    if (!rec) return "";
    if (typeof rec === "string") return rec.trim();
    return (rec.productType || rec.product_type || rec.type || "")
      .toString()
      .trim();
  };

  // Helper to extract display name from recommendation item
  const getRecDisplayName = (rec: any): string => {
    if (!rec) return "";
    if (typeof rec === "string") return rec.trim();
    return (
      rec.displayName ||
      rec.display_name ||
      rec.productType ||
      rec.product_type ||
      ""
    )
      .toString()
      .trim();
  };

  // Filter available recommendations & sort by score descending
  const validRecommendations = recommendedTypes
    .filter(
      (rec) =>
        rec &&
        getRecKey(rec) &&
        rec.available_in_requested_marketplace !== false,
    )
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const recommendedOptions: ProductTypeOption[] = [];
  const usedMasterKeys = new Set<string>();

  // Build Recommendation group preserving ranking order by score
  for (const rec of validRecommendations) {
    const rawType = getRecKey(rec);
    const recDisplayName = getRecDisplayName(rec);
    const rawTypeNorm = rawType.toLowerCase().replace(/[-_]/g, " ");
    const recDisplayNorm = recDisplayName.toLowerCase().replace(/[-_]/g, " ");

    // Find match in master list
    const matchedMaster = masterList.find((masterItem) => {
      const code = getMasterKey(masterItem);
      const codeNorm = code.toLowerCase().replace(/[-_]/g, " ");
      const disp = getMasterViewValue(masterItem);
      const dispNorm = disp.toLowerCase().replace(/[-_]/g, " ");

      return (
        code.toLowerCase() === rawType.toLowerCase() ||
        codeNorm === rawTypeNorm ||
        dispNorm === rawTypeNorm ||
        (recDisplayNorm &&
          (dispNorm === recDisplayNorm || codeNorm === recDisplayNorm))
      );
    });

    if (matchedMaster) {
      const masterKey = getMasterKey(matchedMaster);
      if (masterKey && !usedMasterKeys.has(masterKey)) {
        usedMasterKeys.add(masterKey);
        recommendedOptions.push({
          value: masterKey,
          viewValue:
            getMasterViewValue(matchedMaster) || recDisplayName || rawType,
          score: rec.score,
          raw: matchedMaster,
        });
      }
    } else {
      // If not present in master list, include recommendation directly
      if (rawType && !usedMasterKeys.has(rawType)) {
        usedMasterKeys.add(rawType);
        recommendedOptions.push({
          value: rawType,
          viewValue: recDisplayName || rawType,
          score: rec.score,
          raw: { productType: rawType, displayName: recDisplayName },
        });
      }
    }
  }

  // Build Other group with all remaining master list items (sorted alphabetically)
  const otherOptions: ProductTypeOption[] = masterList
    .filter((masterItem) => {
      const key = getMasterKey(masterItem);
      return key && !usedMasterKeys.has(key);
    })
    .map((masterItem) => ({
      value: getMasterKey(masterItem),
      viewValue: getMasterViewValue(masterItem),
      raw: masterItem,
    }))
    .sort((a, b) => a.viewValue.localeCompare(b.viewValue));

  const groups: ProductTypeGroup[] = [];

  if (recommendedOptions.length > 0) {
    groups.push({
      name: "Recommendation",
      productTypes: recommendedOptions,
    });
  }

  if (otherOptions.length > 0) {
    groups.push({
      name: "Other",
      productTypes: otherOptions,
    });
  }

  return groups;
}
