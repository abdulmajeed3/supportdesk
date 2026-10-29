export type NotificationType =
  | 'TICKET_ASSIGNED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_REPLY'
  | 'TICKET_CREATED';

export interface Notification {
  id: string;
  recipientId: string;
  actorId?: string;
  ticketId?: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  ticket?: { id: string; ticketNumber: string; subject: string };
  actor?: { id: string; firstName: string; lastName: string };
}
