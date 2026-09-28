/** Attachment on a ticket message */
export interface TicketAttachment {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/** A single message embedded inside a SupportTicket */
export interface TicketMessage {
  _id: string;
  senderId: string;
  senderName?: string;
  senderRole: "seller" | "seller_user" | "admin" | "support";
  message: string;
  attachments: TicketAttachment[];
  isInternal?: boolean;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

/** Main support ticket document */
export interface SupportTicket {
  _id: string;
  ticketNo: string;
  sellerId: string;
  sellerUserId: string | null;
  createdBy: string;
  subject: string;
  category: string;
  /** 1=Open, 2=Assigned, 3=Pending Customer, 4=Pending Support, 5=Resolved, 6=Closed, 7=Reopened */
  status: number;
  assignedToUserId: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadSellerCount: number;
  unreadAdminCount: number;
  messages: TicketMessage[];
  // Joined fields from aggregate (list view)
  sellerName?: string;
  createdByName?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
}

/** Summary counts for dashboard cards */
export interface TicketSummary {
  all: number;
  open: number;
  assigned: number;
  pending: number;
  pendingCustomer: number;
  pendingSupport: number;
  resolved: number;
  closed: number;
  reopened: number;
  unassigned: number;
  unread: number;
}

/** Status number → label mapping (mirrors backend constants) */
export const TICKET_STATUS_LABEL: Record<number, string> = {
  1: "Open",
  2: "Assigned",
  3: "Pending Customer",
  4: "Pending Support",
  5: "Resolved",
  6: "Closed",
  7: "Reopened",
};

/** Status number → CSS color class */
export const TICKET_STATUS_COLOR: Record<number, string> = {
  1: "status-open",
  2: "status-assigned",
  3: "status-pending-customer",
  4: "status-pending-support",
  5: "status-resolved",
  6: "status-closed",
  7: "status-reopened",
};

export const TICKET_STATUS = {
  OPEN: 1,
  ASSIGNED: 2,
  PENDING_CUSTOMER: 3,
  PENDING_SUPPORT: 4,
  RESOLVED: 5,
  CLOSED: 6,
  REOPENED: 7,
} as const;
