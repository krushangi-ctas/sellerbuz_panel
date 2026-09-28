export interface Notification {
  _id: string;
  product_id: string;
  status?: string;
  price: number;
  stock: number;
  seller_id: string;
  marketplace_id: any;
  product_type: string;
  import_from: string;
}
