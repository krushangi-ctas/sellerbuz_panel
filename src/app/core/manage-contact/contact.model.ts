export type InquiryType = "sales" | "support" | "partnership" | "general";
export type ContactStatus = 0 | 1 | 2; // 0 = new, 1 = read, 2 = replied

export interface ContactReply {
  message: string;
  sentBy: string;
  sentAt: string;
}

export interface Contact {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  inquiry_type: InquiryType;
  message: string;
  status: ContactStatus;
  replies: ContactReply[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactPagination {
  length: number;
  size: number;
  page: number;
  lastPage: number;
  startIndex: number;
  endIndex: number;
}

export interface ContactListResponse {
  data: Contact[];
  pagination: ContactPagination;
}

export interface ContactResponse {
  status: number;
  data: Contact;
  message: string;
}

export interface ContactFilter {
  status?: ContactStatus | "";
  inquiry_type?: InquiryType | "";
  search?: string;
}
