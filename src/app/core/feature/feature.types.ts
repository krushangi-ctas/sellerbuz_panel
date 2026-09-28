export interface FeatureItem {
  _id: string;
  name: string;
  desc?: string;
  section_id: string;
  sectionName?: string;
  status: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActiveSellerSection {
  _id: string;
  name: string;
  route_path?: string;
  status?: number;
  is_seller_section?: boolean;
}
