import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { Ticket, PaginatedTickets, STATUS_LABELS, PRIORITY_LABELS } from '../../../../core/models/ticket.model';

@Component({
  selector: 'app-customer-tickets',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  template: `
    <div>
      <div class="page-header">
        <div><h1>My Tickets</h1><p>Track and manage your support requests</p></div>
        <a routerLink="/customer/tickets/new" class="btn btn-primary">+ New Ticket</a>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-input">
          <span class="search-icon">🔍</span>
          <input [(ngModel)]="search" (ngModelChange)="onFilter()" placeholder="Search tickets..." />
        </div>
        <select class="form-control" style="width:auto" [(ngModel)]="statusFilter" (ngModelChange)="onFilter()">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_FOR_CUSTOMER">Waiting for Me</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select class="form-control" style="width:auto" [(ngModel)]="priorityFilter" (ngModelChange)="onFilter()">
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
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
              <p>{{ search() || statusFilter() || priorityFilter() ? 'Try adjusting your filters.' : "You haven't submitted any tickets yet." }}</p>
              @if (!search() && !statusFilter() && !priorityFilter()) {
                <a routerLink="/customer/tickets/new" class="btn btn-primary" style="margin-top:1rem">Create Ticket</a>
              }
            </div>
          } @else {
            <div class="table-container" style="border:none">
              <table>
                <thead><tr>
                  <th>Ticket #</th><th>Subject</th><th>Category</th>
                  <th>Status</th><th>Priority</th><th>Created</th>
                </tr></thead>
                <tbody>
                  @for (t of tickets(); track t.id) {
                    <tr (click)="router.navigate(['/customer/tickets', t.id])">
                      <td><code style="font-size:.8125rem;color:var(--color-primary)">{{ t.ticketNumber }}</code></td>
                      <td style="max-width:250px" class="truncate font-medium">{{ t.subject }}</td>
                      <td style="color:var(--color-text-secondary)">{{ t.category?.name || '—' }}</td>
                      <td><span [class]="statusBadge(t.status)">{{ statusLabel(t.status) }}</span></td>
                      <td><span [class]="priorityBadge(t.priority)">{{ priorityLabel(t.priority) }}</span></td>
                      <td style="color:var(--color-text-secondary)">{{ formatDate(t.createdAt) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if ((meta()?.totalPages ?? 0) > 1) {
          <div class="pagination">
            <span>Showing {{ (page()-1)*limit()+1 }}–{{ Math.min(page()*limit(), meta()!.total) }} of {{ meta()!.total }}</span>
            <div class="pagination-controls">
              <button (click)="goPage(page()-1)" [disabled]="!meta()!.hasPreviousPage">‹ Prev</button>
              @for (p of pages(); track p) {
                <button [class.active]="p === page()" (click)="goPage(p)">{{ p }}</button>
              }
              <button (click)="goPage(page()+1)" [disabled]="!meta()!.hasNextPage">Next ›</button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class CustomerTicketsComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly router = inject(Router);
  Math = Math;

  loading = signal(true);
  tickets = signal<Ticket[]>([]);
  meta = signal<PaginatedTickets['meta'] | null>(null);
  page = signal(1);
  limit = signal(20);
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
      page: this.page(), limit: this.limit(),
      search: this.search() || undefined,
      status: this.statusFilter() || undefined,
      priority: this.priorityFilter() || undefined,
    }).subscribe({
      next: (r) => { this.tickets.set(r.data); this.meta.set(r.meta); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  pages(): number[] {
    const total = this.meta()?.totalPages || 0;
    return Array.from({ length: total }, (_, i) => i + 1).slice(
      Math.max(0, this.page() - 3),
      this.page() + 2,
    );
  }

  statusBadge(s: string) { return `badge badge-${s.toLowerCase().replace('_', '')} badge-${s.toLowerCase().replace(/_/g, '-')}`; }
  priorityBadge(p: string) { return `badge badge-${p.toLowerCase()}`; }
  statusLabel(s: string) { return STATUS_LABELS[s as keyof typeof STATUS_LABELS] || s; }
  priorityLabel(p: string) { return PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS] || p; }
  formatDate(d: string) { return new Date(d).toLocaleDateString(); }
}
