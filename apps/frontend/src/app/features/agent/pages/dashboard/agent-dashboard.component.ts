import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Ticket, STATUS_LABELS, PRIORITY_LABELS } from '../../../../core/models/ticket.model';

interface AgentDashData {
  assignedTotal: number;
  assignedOpen: number;
  waitingForCustomer: number;
  recent: Ticket[];
}

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
    <div>
      <div class="page-header">
        <div><h1>Agent Dashboard</h1><p>Your current ticket queue and activity.</p></div>
        <a routerLink="/agent/tickets" class="btn btn-primary">View All Tickets</a>
      </div>

      @if (loading()) {
        <div class="loading-overlay"><div class="spinner"></div></div>
      }

      @if (!loading() && data()) {
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🎫</div>
            <div class="stat-value">{{ data()!.assignedTotal }}</div>
            <div class="stat-label">Assigned to Me</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔵</div>
            <div class="stat-value">{{ data()!.assignedOpen }}</div>
            <div class="stat-label">Open / In Progress</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-value">{{ data()!.waitingForCustomer }}</div>
            <div class="stat-label">Waiting for Customer</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Recently Updated</h2>
            <a routerLink="/agent/tickets" style="font-size:.875rem;color:var(--color-primary)">View queue →</a>
          </div>

          @if (data()!.recent.length === 0) {
            <div class="empty-state">
              <div class="empty-icon">🎉</div>
              <h3>No tickets assigned yet</h3>
              <p>Browse the ticket queue to pick up tickets.</p>
            </div>
          } @else {
            <div class="table-container" style="border:none">
              <table>
                <thead><tr>
                  <th>Ticket #</th><th>Subject</th><th>Customer</th>
                  <th>Status</th><th>Priority</th><th>Updated</th>
                </tr></thead>
                <tbody>
                  @for (t of data()!.recent; track t.id) {
                    <tr (click)="router.navigate(['/agent/tickets', t.id])">
                      <td><code style="font-size:.8125rem;color:var(--color-primary)">{{ t.ticketNumber }}</code></td>
                      <td style="max-width:220px" class="truncate font-medium">{{ t.subject }}</td>
                      <td style="color:var(--color-text-secondary)">{{ t.customer.firstName }} {{ t.customer.lastName }}</td>
                      <td><span [class]="statusBadge(t.status)">{{ statusLabel(t.status) }}</span></td>
                      <td><span [class]="priorityBadge(t.priority)">{{ priorityLabel(t.priority) }}</span></td>
                      <td style="color:var(--color-text-secondary)">{{ formatDate(t.updatedAt) }}</td>
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
export class AgentDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly router = inject(Router);

  loading = signal(true);
  data = signal<AgentDashData | null>(null);

  ngOnInit() {
    this.api.getAgentDashboard().subscribe({
      next: (d) => { this.data.set(d as AgentDashData); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusBadge(s: string) { return `badge badge-${s.toLowerCase().replace(/_/g, '-')}`; }
  priorityBadge(p: string) { return `badge badge-${p.toLowerCase()}`; }
  statusLabel(s: string) { return STATUS_LABELS[s as keyof typeof STATUS_LABELS] || s; }
  priorityLabel(p: string) { return PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS] || p; }
  formatDate(d: string) { return new Date(d).toLocaleDateString(); }
}
