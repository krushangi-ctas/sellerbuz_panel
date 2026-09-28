export type FeatureMeterCountMode =
  | "per_request"
  | "file_rows"
  | "body_array"
  | "response_field"
  | "resource_count";

export type FeatureMeterMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "*";

export interface FeatureMeterMapping {
  id?: string;
  _id?: string;
  method: FeatureMeterMethod;
  path_pattern: string;
  feature_id: string;
  feature_name?: string;
  count_mode: FeatureMeterCountMode;
  count_config?: Record<string, any>;
  status: number;
  enforce_window?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiscoveredRoute {
  method: string;
  path: string;
  controller: string;
  handler: string;
}

export interface MeterFeature {
  id?: string;
  _id?: string;
  name: string;
  sectionName?: string;
}

export interface UsageWindowSetting {
  _id?: string;
  id?: string;
  enabled: boolean;
  window_hours: number;
  alert_threshold_percent: number;
}

export interface ResourceModuleInfo {
  name: string;
}

export interface ResourceFieldInfo {
  path: string;
  type: string;
}

export interface ResourceCountConfig {
  target_module?: string;
  target_field?: string;
  status?: number;
  count_field?: string;
}
