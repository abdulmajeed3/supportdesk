import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { Ticket, PaginatedTickets, STATUS_LABELS, PRIORITY_LABELS } from '../../../../core/models/ticket.model';

@Component({
  selector: 'app-agent-tickets',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div>
      <div class="page-header">
        <div><h1>Ticket Queue</h1><p>All tickets you have access to manage.</p></div>
      </div>

      <div class="filters-bar">
        <div class="search-input">
          <span class="search-icon">🔍</span>
          <input [(ngModel)]="search" (ngModelChange)="onFilter()" placeholder="Search by ticket # or subject..." />
        </div>
        <select class="form-control" style="width:auto" [(ngModel)]="statusFilter" (ngModelChange)="onFilter()">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select class="form-control" style="width:auto" [(ngModel)]="priorityFilter" (ngModelChange)="onFilter()">
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      @if (loading()) {
        <div class="loading-overlay"><div class="spinner"></div></div>
      }

      @if (!loading()) {
        <div class="card" style="padding:0">
          @if (tickets().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">🎫</div>
              <h3>No tickets found</h3>
              <p>{{ search() || statusFilter() || priorityFilter() ? 'Try adjusting your filters.' : 'No tickets available.' }}</p>
            </div>
          } @else {
            <div class="table-container" style="border:none">
              <table>
                <thead><tr>
                  <th>Ticket #</th><th>Subject</th><th>Customer</th>
                  <th>Status</th><th>Priority</th><th>Assigned To</th><th>Created</th>
                </tr></thead>
                <tbody>
                  @for (t of tickets(); track t.id) {
                    <tr (click)="router.navigate(['/agent/tickets', t.id])">
                      <td><code style="font-size:.8125rem;color:var(--color-primary)">{{ t.ticketNumber }}</code></td>
                      <td style="max-width:200px" class="truncate font-medium">{{ t.subject }}</td>
                      <td style="color:var(--color-text-secondary)">{{ t.customer.firstName }} {{ t.customer.lastName }}</td>
                      <td><span [class]="statusBadge(t.status)">{{ statusLabel(t.status) }}</span></td>
                      <td><span [class]="priorityBadge(t.priority)">{{ priorityLabel(t.priority) }}</span></td>
                      <td style="color:var(--color-text-secondary)">{{ getAssignee(t) }}</td>
                      <td style="color:var(--color-text-secondary)">{{ formatDate(t.createdAt) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        @if ((meta()?.totalPages ?? 0) > 1) {
          <div class="pagination">
            <span>{{ (page()-1)*20+1 }}–{{ Math.min(page()*20, meta()!.total) }} of {{ meta()!.total }}</span>
            <div class="pagination-controls">
              <button (click)="goPage(page()-1)" [disabled]="!meta()!.hasPreviousPage">‹</button>
              @for (p of pages(); track p) {
                <button [class.active]="p === page()" (click)="goPage(p)">{{ p }}</button>
              }
              <button (click)="goPage(page()+1)" [disabled]="!meta()!.hasNextPage">›</button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class AgentTicketsComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly router = inject(Router);
  Math = Math;

  loading = signal(true);
  tickets = signal<Ticket[]>([]);
  meta = signal<PaginatedTickets['meta'] | null>(null);
  page = signal(1);
  search = signal('');
  statusFilter = signal('');
  priorityFilter = signal('');

  private searchTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit() { this.load(); }

  onFilter() {
    this.page.set(1);
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.load(), 300);
  }

  goPage(p: number) { this.page.set(p); this.load(); }

  load() {
    this.loading.set(true);
    this.api.getTickets({
      page: this.page(), limit: 20,
      search: this.search() || undefined,
      status: this.statusFilter() || undefined,
      priority: this.priorityFilter() || undefined,
    }).subscribe({
      next: (r) => { this.tickets.set(r.data); this.meta.set(r.meta); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getAssignee(t: Ticket) {
    const a = t.assignments?.[0];
    return a ? `${a.agent.firstName} ${a.agent.lastName}` : '—';
  }

  pages(): number[] {
    const total = this.meta()?.totalPages || 0;
    return Array.from({ length: Math.min(total, 7) }, (_, i) => i + 1);
  }

  statusBadge(s: string) { return `badge badge-${s.toLowerCase().replace(/_/g, '-')}`; }
  priorityBadge(p: string) { return `badge badge-${p.toLowerCase()}`; }
  statusLabel(s: string) { return STATUS_LABELS[s as keyof typeof STATUS_LABELS] || s; }
  priorityLabel(p: string) { return PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS] || p; }
  formatDate(d: string) { return new Date(d).toLocaleDateString(); }
}
