import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { STATUS_LABELS, PRIORITY_LABELS, Ticket } from '../../../../core/models/ticket.model';

interface AdminDashData {
  totalTickets: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  totalCustomers: number;
  totalAgents: number;
  recentActivity: Ticket[];
  categoryWorkload: { id: string; name: string; ticketCount: number }[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
    <div>
      <div class="page-header">
        <div><h1>Administrator Dashboard</h1><p>System-wide overview and operational metrics.</p></div>
        <a routerLink="/admin/tickets" class="btn btn-primary">Manage Tickets</a>
      </div>

      @if (loading()) {
        <div class="loading-overlay"><div class="spinner"></div></div>
      }

      @if (!loading() && data()) {
        <!-- Top Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🎫</div>
            <div class="stat-value">{{ data()!.totalTickets }}</div>
            <div class="stat-label">Total Tickets</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔵</div>
            <div class="stat-value">{{ (data()!.byStatus['OPEN'] || 0) + (data()!.byStatus['IN_PROGRESS'] || 0) }}</div>
            <div class="stat-label">Open / Active</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-value">{{ data()!.totalCustomers }}</div>
            <div class="stat-label">Customers</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🛠️</div>
            <div class="stat-value">{{ data()!.totalAgents }}</div>
            <div class="stat-label">Agents</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
          <!-- Status breakdown -->
          <div class="card">
            <h2 class="card-title" style="margin-bottom:1rem">Tickets by Status</h2>
            @for (entry of statusEntries(); track entry.key) {
              <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.625rem">
                <span style="width:120px;font-size:.8125rem;color:var(--color-text-secondary)">{{ statusLabel(entry.key) }}</span>
                <div style="flex:1;height:6px;background:var(--color-surface-2);border-radius:100px;overflow:hidden">
                  <div [style.width]="barWidth(entry.count)" style="height:100%;background:var(--color-primary);border-radius:100px"></div>
                </div>
                <span style="font-weight:600;font-size:.875rem;min-width:24px;text-align:right">{{ entry.count }}</span>
              </div>
            }
          </div>

          <!-- Category workload -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Category Workload</h2>
              <a routerLink="/admin/categories" style="font-size:.875rem;color:var(--color-primary)">Manage →</a>
            </div>
            @for (cat of data()!.categoryWorkload; track cat.id) {
              <div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--color-border)">
                <span style="font-size:.875rem">{{ cat.name }}</span>
                <span style="font-weight:600;font-size:.875rem">{{ cat.ticketCount }}</span>
              </div>
            }
            @if (data()!.categoryWorkload.length === 0) {
              <p style="color:var(--color-text-muted);font-size:.875rem">No active categories.</p>
            }
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Recent Activity</h2>
            <a routerLink="/admin/tickets" style="font-size:.875rem;color:var(--color-primary)">View all →</a>
          </div>
          <div class="table-container" style="border:none">
            <table>
              <thead><tr>
                <th>Ticket #</th><th>Subject</th><th>Customer</th>
                <th>Status</th><th>Priority</th><th>Category</th><th>Updated</th>
              </tr></thead>
              <tbody>
                @for (t of data()!.recentActivity; track t.id) {
                  <tr (click)="router.navigate(['/admin/tickets', t.id])">
                    <td><code style="font-size:.8125rem;color:var(--color-primary)">{{ t.ticketNumber }}</code></td>
                    <td style="max-width:180px" class="truncate font-medium">{{ t.subject }}</td>
                    <td>{{ t.customer.firstName }} {{ t.customer.lastName }}</td>
                    <td><span [class]="statusBadge(t.status)">{{ statusLabel(t.status) }}</span></td>
                    <td><span [class]="priorityBadge(t.priority)">{{ priorityLabel(t.priority) }}</span></td>
                    <td style="color:var(--color-text-secondary)">{{ t.category?.name || '—' }}</td>
                    <td style="color:var(--color-text-secondary)">{{ formatDate(t.updatedAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly router = inject(Router);

  loading = signal(true);
  data = signal<AdminDashData | null>(null);

  ngOnInit() {
    this.api.getAdminDashboard().subscribe({
      next: (d) => { this.data.set(d as AdminDashData); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusEntries() {
    if (!this.data()) return [];
    const total = this.data()!.totalTickets || 1;
    return Object.entries(this.data()!.byStatus).map(([key, count]) => ({ key, count }));
  }

  barWidth(count: number) {
    const total = this.data()!.totalTickets || 1;
    return `${Math.round((count / total) * 100)}%`;
  }

  statusBadge(s: string) { return `badge badge-${s.toLowerCase().replace(/_/g, '-')}`; }
  priorityBadge(p: string) { return `badge badge-${p.toLowerCase()}`; }
  statusLabel(s: string) { return STATUS_LABELS[s as keyof typeof STATUS_LABELS] || s; }
  priorityLabel(p: string) { return PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS] || p; }
  formatDate(d: string) { return new Date(d).toLocaleDateString(); }
}
