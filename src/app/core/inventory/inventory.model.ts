export interface Inventory {
  _id: string;
  asin: string;
  status?: string;
  price: number;
  stock: number;
  seller_id: string;
  portal_id: any;
  marketplace_id: any;
  product_type: string;
  amz_stock: number;
  amz_price: string | number;
  amz_product_type: string;
  amz_fullfillment_by?: string;
  main_image_url?: string;
  import_from?: string;
  margin?: string | number;
  title?: string;
  brand?: string;
  description?: string;
  sku?: string;
  createdAt?: string;
  updatedAt?: string;
  is_offer_added?: string | boolean;
  is_inventory_upadated?: string | boolean;
  is_product_stopped?: boolean;
  bullet_points?: string[];
  is_banned: boolean;
  is_move_to_retail: string;
  tmp_product_ids: [];
  image_count?: number;
  images?: string[];
}
export interface InventoryDownloadFile {
  fileName: string;
}
