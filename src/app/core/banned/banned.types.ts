export interface Asin {
  _id: string;
  asin: string;
  comment: string;
}

export interface Keyword {
  _id: string;
  keyword: string;
  comment: string;
  marketplace_id: string;
}

export interface Brand {
  _id: string;
  brand_name: string;
  comment: string;
  marketplace_id: string;
  createdAt?: string;
  updatedAt?: string;
}
