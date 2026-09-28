export interface catalogLogModel {
  _id?: string;
  operation: string;
  operation_by: string;
  operation_data: object;
  key: string;
  createdAt: Date;
  first_name: string;
  last_name: string;
  ip_address: string;
  type?: string;
}
