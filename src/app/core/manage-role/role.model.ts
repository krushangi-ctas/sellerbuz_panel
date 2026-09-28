type aggegateFeature = { name: string; _id?: string }[];
export interface Role {
  _id: string;
  role_name: string;
  status: number;
  sections: string[];
  createdAt: string;
  updatedAt: string;
}
export interface CreateRole {
  role_name: string;
  permissions: SectionPermission[];
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
export interface ResponseRoleObject {
  data: Role[];
  message: string;
  status: number;
}
export type SectionPermission = {
  view: boolean;
  add: boolean;
  delete: boolean;
  update: boolean;
  feature_id?: string;
  section_id?: string;
};
