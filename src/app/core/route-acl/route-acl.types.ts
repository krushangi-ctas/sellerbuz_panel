export type RouteAclAction = "view" | "add" | "update" | "delete";
export type RouteAclScope = "admin" | "seller";
export type RouteAclMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "*";

export interface RouteAclMapping {
  id?: string;
  _id?: string;
  method: RouteAclMethod;
  path_pattern: string;
  section_id: string;
  section_name?: string;
  action: RouteAclAction;
  scope: RouteAclScope;
  status: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiscoveredRoute {
  method: string;
  path: string;
  controller: string;
  handler: string;
}

export interface RouteAclSection {
  id?: string;
  _id?: string;
  name: string;
  is_seller_section?: boolean;
}
