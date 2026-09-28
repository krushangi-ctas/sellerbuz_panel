export interface User {
  _id: string;
  name?: string;
  status?: string | number;
  first_name: string;
  last_name: string;
  contact_no?: number;
  role_id?: string;
  role?: string;
  conatact_no?: number;
  email: string;
  isSuperAdmin?: boolean;
  isPremisesUser?: boolean;
  isDeveloper?: boolean;

  is_seller_user?: boolean;
  seller_id?: string;

  avatar?: string;
  token?: string;
  password?: string;
  dob?: string;
  bank_name?: string;
  bank_account_no?: any;
  business_address?: string;
  country?: string;
  currency_id?: string;
  country_name?: string;
  profileImgUrl?: string;
  roleName?: string;
  createdAt?: string;
  updatedAt?: string;
  last_login?: string;
  expiration?: string;
  reset_id?: string;
  seller_users?: SellerUser[];
  portal_id?: string;
  plan_id?: string;
  subscriptions?: Subscription[];
}
export interface Subscription {
  plan_id?: string;
  payment_id?: string;
  billing_cycle?: string;
  started_at?: string;
  expired_at?: string;
  status?: string;
  is_plan_cancel?: boolean;
  created_at?: string;
  plan_name?: string;
  plan_price?: number;
  currency_code?: string;
  plan_interval?: string;
  trial_days?: number;
  features?: { feature_id?: string; usage_count?: number }[];
  marketing_features?: string[];
}
export interface SellerUser {
  _id: string;
  first_name: string;
  last_name: string;
  email?: string;
  role?: string;
  contact_no?: number;
  status?: number;
  is_seller_user?: boolean;
}
