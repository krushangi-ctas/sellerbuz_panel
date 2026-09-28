/**
 * Faq interface representing a Frequently Asked Question item.
 * Status: 1 = Active, 0 = Inactive, 2 = Soft Deleted.
 */
export interface Faq {
  _id: string;
  question: string;
  answer: string;
  category: string;
  status: number;
  createdBy?: any;
  updatedBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Filter parameters for fetching FAQs.
 */
export interface FaqFilter {
  search?: string;
  category?: string;
  status?: number | string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

/**
 * API response structure for paginated FAQs.
 */
export interface FaqResponse {
  status: number;
  message: string;
  data: {
    results: Faq[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
}
