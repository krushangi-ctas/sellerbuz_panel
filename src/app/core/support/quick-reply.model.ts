/**
 * QuickReply interface representing a tag-based Quick Reply suggestion.
 * Status: 1 = Active, 0 = Inactive, 2 = Soft Deleted.
 */
export interface QuickReply {
  _id: string;
  tag: string;
  suggestion: string;
  status: number;
  createdBy?: any;
  updatedBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Filter parameters for fetching Quick Replies.
 */
export interface QuickReplyFilter {
  search?: string;
  tag?: string;
  status?: number | string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

/**
 * API response structure for paginated Quick Replies.
 */
export interface QuickReplyResponse {
  status: number;
  message: string;
  data: {
    results: QuickReply[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
}
