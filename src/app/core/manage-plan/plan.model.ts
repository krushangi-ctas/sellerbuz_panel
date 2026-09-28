type aggegateFeature = { name: string; _id?: string }[];
export interface Plan {
  _id: string;
  name: string;
  status: number;
  sections: string[];
  createdAt: string;
  updatedAt: string;
  permissions: { section_name: string; feature_name: string }[];
  discount: number;
  price_yearly: number;
  price_quarterly?: number;
}
export interface CreatePlan {
  name: string;
  desc: string;
  price: number;
  currency: string;
  interval: string;
  trial_days: number;
  marketing_features: string[];
  features: FeatureUsage[];
  is_custom_plan: boolean;
  is_popular: boolean;
  discount: number;
  price_yearly: number;
  price_quarterly?: number;
}
export interface FeatureUsage {
  feature_id: string;
  usage_count: number;
}
export interface Feature {
  _id: string;
  name: string;
  status?: number;
  features: aggegateFeature;
}
export interface ResponseFeatureObject {
  data: Feature[];
  message: string;
  status: number;
}
export interface ResponsePlanObject {
  data: Plan[];
  message: string;
  status: number;
}
export interface ResponseCurrncyObject {
  data: Currency[];
  message: string;
  status: number;
}

/**
 * Plan shape returned by the public pricing endpoint
 * (GET /v1/manage-plan/public/plans) — used by the seller-facing
 * Plans & Billing checkout.
 */
export interface PublicPlan {
  _id: string;
  id?: string;
  name: string;
  desc: string;
  price: number;
  price_quarterly?: number;
  discount: number;
  currency: string;
  interval: string;
  trial_days: number;
  marketing_features: string[];
  is_custom_plan: boolean;
  is_popular: boolean;
  status?: number;
}
export interface ResponsePublicPlanObject {
  data: PublicPlan[];
  message: string;
  status: number;
}

export interface SectionPermission {
  limit: number;
  feature_id: string;
  section_id: string;
  view?: boolean;
  add?: boolean;
  delete?: boolean;
  update?: boolean;
}

export interface Currency {
  code: string;
  currency: string;
  country?: string;
  id?: string;
  _id?: string;
}
