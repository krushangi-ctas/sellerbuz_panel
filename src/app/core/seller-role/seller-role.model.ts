type AggregateFeature = { name: string; _id?: string; description?: string }[];

export interface SellerRole {
  _id: string;
  seller_id: string; // Reference to seller
  role_name: string;
  status: number;
  sections: string[];
  permissions?: SellerSectionPermission[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSellerRole {
  seller_id: string; // Reference to seller
  role_name: string;
  permissions: SellerSectionPermission[];
}

export interface SellerFeature {
  _id: string;
  name: string;
  status?: number;
  features: AggregateFeature;
}

export interface ResponseSellerFeatureObject {
  data: SellerFeature[];
  message: string;
  status: number;
}

export interface ResponseSellerRoleObject {
  data: SellerRole[];
  message: string;
  status: number;
}

export type SellerSectionPermission = {
  view: boolean;
  add: boolean;
  delete: boolean;
  update: boolean;
  feature_id?: string;
  section_id?: string;
  section_name?: string;
};
