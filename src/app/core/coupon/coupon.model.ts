import { Pagination } from "../pagination/pagination.types";

export interface Coupon {
  _id: string;
  code: string;
  type: "public" | "private";
  discount_type: "fixed_amount" | "percentage";
  discount_value: number;
  currency: string;
  valid_from: Date | string;
  valid_until: Date | string;
  duration_months?: number;
  applicable_plans: string[] | PlanInfo[];
  max_redemptions: number | null;
  max_redemptions_per_user: number;
  current_redemptions: number;
  assigned_sellers: string[] | SellerInfo[];
  status: number; // 0- inactive, 1- active, 2- expired, 3- revoked
  description?: string;
  created_by?: string;
  updated_by?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanInfo {
  _id: string;
  name: string;
  price: number;
}

export interface SellerInfo {
  _id: string;
  name: string;
  email: string;
}

export interface CreateCoupon {
  code: string;
  type: "public" | "private";
  discount_type: "fixed_amount" | "percentage";
  discount_value: number;
  currency: string;
  valid_from: Date | string;
  valid_until: Date | string;
  duration_months?: number;
  applicable_plans?: string[];
  max_redemptions?: number | null;
  max_redemptions_per_user?: number;
  assigned_sellers?: string[];
  description?: string;
  status?: number;
}

export interface UpdateCoupon extends Partial<CreateCoupon> {}

export interface CouponFilters {
  type?: "public" | "private";
  status?: string | number;
  search?: string;
  valid_from?: Date | string;
  valid_until?: Date | string;
}

export interface CouponQueryOptions {
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface CouponResponse {
  status: number;
  message: string;
  data?: Coupon;
}

export interface CouponsListResponse {
  status: number;
  message: string;
  data?: {
    results: Coupon[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
}

export interface CouponStats {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  revoked: number;
  public: number;
  private: number;
  totalRedemptions: number;
}

export interface CouponStatsResponse {
  status: number;
  message: string;
  data?: CouponStats;
}

export interface ValidateCouponRequest {
  code: string;
  sellerId: string;
}

export interface RedeemCouponRequest {
  couponId: string;
  sellerId: string;
}

export interface CouponValidationResponse {
  status: number;
  message: string;
  data?: Coupon;
}

export interface SellerForCoupon {
  seller_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface SellersListResponse {
  status: number;
  message: string;
  data?: SellerForCoupon[];
}
