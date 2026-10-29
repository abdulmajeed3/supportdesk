import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Ticket, PaginatedTickets, TicketMessage, TicketCategory, TicketAssignment } from '../models/ticket.model';
import { User } from '../models/user.model';
import { Notification } from '../models/notification.model';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

function unwrap<T>(obs: Observable<ApiSuccess<T>>): Observable<T> {
  return obs.pipe(map((r) => r.data));
}

export interface TicketQuery {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  categoryId?: string;
  agentId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ---- Tickets ----
  getTickets(query: TicketQuery = {}): Observable<PaginatedTickets> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return unwrap(this.http.get<ApiSuccess<PaginatedTickets>>(`${this.base}/tickets`, { params }));
  }

  getTicket(id: string): Observable<Ticket> {
    return unwrap(this.http.get<ApiSuccess<Ticket>>(`${this.base}/tickets/${id}`));
  }

  createTicket(data: { subject: string; description: string; priority?: string; categoryId?: string }): Observable<Ticket> {
    return unwrap(this.http.post<ApiSuccess<Ticket>>(`${this.base}/tickets`, data));
  }

  updateTicket(id: string, data: { status?: string; priority?: string; categoryId?: string }): Observable<Ticket> {
    return unwrap(this.http.patch<ApiSuccess<Ticket>>(`${this.base}/tickets/${id}`, data));
  }

  // ---- Messages ----
  getMessages(ticketId: string): Observable<TicketMessage[]> {
    return unwrap(this.http.get<ApiSuccess<TicketMessage[]>>(`${this.base}/tickets/${ticketId}/messages`));
  }

  addMessage(ticketId: string, body: string, isInternal = false): Observable<TicketMessage> {
    return unwrap(
      this.http.post<ApiSuccess<TicketMessage>>(`${this.base}/tickets/${ticketId}/messages`, { body, isInternal }),
    );
  }

  // ---- Assignments ----
  assignTicket(ticketId: string, agentId: string): Observable<TicketAssignment> {
    return unwrap(
      this.http.post<ApiSuccess<TicketAssignment>>(`${this.base}/tickets/${ticketId}/assignments`, { agentId }),
    );
  }

  getAssignmentHistory(ticketId: string): Observable<TicketAssignment[]> {
    return unwrap(this.http.get<ApiSuccess<TicketAssignment[]>>(`${this.base}/tickets/${ticketId}/assignments`));
  }

  // ---- Categories ----
  getCategories(activeOnly = false): Observable<TicketCategory[]> {
    const params = activeOnly ? new HttpParams().set('activeOnly', 'true') : undefined;
    return unwrap(this.http.get<ApiSuccess<TicketCategory[]>>(`${this.base}/categories`, { params }));
  }

  createCategory(data: { name: string; description?: string; isActive?: boolean }): Observable<TicketCategory> {
    return unwrap(this.http.post<ApiSuccess<TicketCategory>>(`${this.base}/categories`, data));
  }

  updateCategory(id: string, data: Partial<{ name: string; description: string; isActive: boolean }>): Observable<TicketCategory> {
    return unwrap(this.http.patch<ApiSuccess<TicketCategory>>(`${this.base}/categories/${id}`, data));
  }

  // ---- Users ----
  getUsers(query: { page?: number; limit?: number; role?: string } = {}): Observable<{ data: User[]; meta: unknown }> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined) params = params.set(k, String(v));
    });
    return unwrap(this.http.get<ApiSuccess<{ data: User[]; meta: unknown }>>(`${this.base}/users`, { params }));
  }

  getAgents(): Observable<User[]> {
    return unwrap(this.http.get<ApiSuccess<User[]>>(`${this.base}/users/agents`));
  }

  getMe(): Observable<User> {
    return unwrap(this.http.get<ApiSuccess<User>>(`${this.base}/users/me`));
  }

  updateMe(data: { firstName?: string; lastName?: string }): Observable<User> {
    return unwrap(this.http.patch<ApiSuccess<User>>(`${this.base}/users/me`, data));
  }

  createAgent(data: { email: string; firstName: string; lastName: string; password: string }): Observable<User> {
    return unwrap(this.http.post<ApiSuccess<User>>(`${this.base}/users/agents`, data));
  }

  updateUserStatus(id: string, status: string): Observable<User> {
    return unwrap(this.http.patch<ApiSuccess<User>>(`${this.base}/users/${id}/status`, { status }));
  }

  // ---- Dashboard ----
  getCustomerDashboard(): Observable<unknown> {
    return unwrap(this.http.get<ApiSuccess<unknown>>(`${this.base}/dashboard/customer`));
  }

  getAgentDashboard(): Observable<unknown> {
    return unwrap(this.http.get<ApiSuccess<unknown>>(`${this.base}/dashboard/agent`));
  }

  getAdminDashboard(): Observable<unknown> {
    return unwrap(this.http.get<ApiSuccess<unknown>>(`${this.base}/dashboard/admin`));
  }

  // ---- Notifications ----
  getNotifications(): Observable<Notification[]> {
    return unwrap(this.http.get<ApiSuccess<Notification[]>>(`${this.base}/notifications`));
  }

  getUnreadCount(): Observable<number> {
    return unwrap(this.http.get<ApiSuccess<number>>(`${this.base}/notifications/unread-count`));
  }

  markNotificationRead(id: string): Observable<unknown> {
    return unwrap(this.http.patch<ApiSuccess<unknown>>(`${this.base}/notifications/${id}/read`, {}));
  }

  markAllNotificationsRead(): Observable<unknown> {
    return unwrap(this.http.patch<ApiSuccess<unknown>>(`${this.base}/notifications/mark-all-read`, {}));
  }
}
