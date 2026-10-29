export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TicketCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketAssignment {
  id: string;
  ticketId: string;
  agentId: string;
  assignedById: string;
  createdAt: string;
  agent: { id: string; firstName: string; lastName: string; email: string };
  assignedBy: { id: string; firstName: string; lastName: string };
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; firstName: string; lastName: string; role: string };
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerId: string;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  customer: { id: string; firstName: string; lastName: string; email: string };
  category?: { id: string; name: string };
  assignments?: TicketAssignment[];
  messages?: TicketMessage[];
}

export interface PaginatedTickets {
  data: Ticket[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_CUSTOMER: 'Waiting for Customer',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};
