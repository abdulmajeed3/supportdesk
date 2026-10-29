import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Ticket, STATUS_LABELS, PRIORITY_LABELS } from '../../../../core/models/ticket.model';
import { fullName } from '../../../../core/models/user.model';

interface DashboardData {
  total: number;
  open: number;
  waitingForCustomer: number;
  resolved: number;
  recent: Ticket[];
}

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <h1>Welcome back, {{ firstName() }}!</h1>
          <p>Here's an overview of your support tickets.</p>
        </div>
        <a routerLink="/customer/tickets/new" class="btn btn-primary">+ New Ticket</a>
      </div>

      @if (loading()) {
        <div class="loading-overlay"><div class="spinner"></div><span>Loading dashboard...</span></div>
      }

      @if (!loading() && data()) {
        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🎫</div>
            <div class="stat-value">{{ data()!.total }}</div>
            <div class="stat-label">Total Tickets</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔵</div>
            <div class="stat-value">{{ data()!.open }}</div>
            <div class="stat-label">Open</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-value">{{ data()!.waitingForCustomer }}</div>
            <div class="stat-label">Awaiting Your Reply</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-value">{{ data()!.resolved }}</div>
            <div class="stat-label">Resolved</div>
          </div>
        </div>

        <!-- Recent Tickets -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Recent Tickets</h2>
            <a routerLink="/customer/tickets" style="font-size:.875rem;color:var(--color-primary)">View all →</a>
          </div>

          @if (data()!.recent.length === 0) {
            <div class="empty-state">
              <div class="empty-icon">🎫</div>
              <h3>No tickets yet</h3>
              <p>Submit your first support request to get started.</p>
              <a routerLink="/customer/tickets/new" class="btn btn-primary" style="margin-top:1rem">Create Ticket</a>
            </div>
          } @else {
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  @for (ticket of data()!.recent; track ticket.id) {
                    <tr (click)="goToTicket(ticket.id)" style="cursor:pointer">
                      <td><code style="font-size:.8125rem">{{ ticket.ticketNumber }}</code></td>
                      <td style="max-width:250px" class="truncate">{{ ticket.subject }}</td>
                      <td><span [class]="'badge badge-' + ticket.status.toLowerCase().replace('_', '')">{{ statusLabel(ticket.status) }}</span></td>
                      <td><span [class]="'badge badge-' + ticket.priority.toLowerCase()">{{ priorityLabel(ticket.priority) }}</span></td>
                      <td style="color:var(--color-text-secondary)">{{ formatDate(ticket.updatedAt) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class CustomerDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  loading = signal(true);
  data = signal<DashboardData | null>(null);

  firstName = () => this.auth.currentUser()?.firstName || 'there';

  ngOnInit() {
    this.api.getCustomerDashboard().subscribe({
      next: (d) => { this.data.set(d as DashboardData); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  goToTicket(id: string) {
    window.location.href = `/customer/tickets/${id}`;
  }

  statusLabel(s: string) { return STATUS_LABELS[s as keyof typeof STATUS_LABELS] || s; }
  priorityLabel(p: string) { return PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS] || p; }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
