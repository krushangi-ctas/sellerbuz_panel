export interface Blog {
  _id: string;
  id?: string;
  slug?: string;
  blog_title: string;
  short_description: string;
  description: any;
  description_images: string[];
  status: number; // 0 = Inactive, 1 = Active, 2 = Deleted
  created_by?: any;
  updated_by?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBlogDto {
  blog_title: string;
  short_description?: string;
  description?: any;
  description_images?: string[];
  status?: number;
}

export interface UpdateBlogDto {
  blog_title?: string;
  short_description?: string;
  description?: any;
  description_images?: string[];
  status?: number;
}

export interface BlogFilter {
  search?: string;
  status?: number | string;
}

export interface BlogResponse {
  status: number;
  message: string;
  data: Blog;
}

export interface BlogsListResponse {
  status: number;
  message: string;
  data: Blog[];
  pagination?: {
    page: number;
    size: number;
    lastPage: number;
    length: number;
  };
}
