import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Ticket, TicketMessage, STATUS_LABELS, PRIORITY_LABELS } from '../../../../core/models/ticket.model';
import { User } from '../../../../core/models/user.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-agent-ticket-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  template: `
    <div style="max-width:1000px">
      <div style="margin-bottom:1.5rem">
        <a routerLink="/agent/tickets" class="btn btn-ghost btn-sm">← Back to Queue</a>
      </div>

      @if (loading()) {
        <div class="loading-overlay"><div class="spinner"></div></div>
      }

      @if (!loading() && ticket()) {
        <div style="display:grid;grid-template-columns:1fr 300px;gap:1.5rem;align-items:start">
          <!-- Main -->
          <div>
            <div class="card" style="margin-bottom:1.5rem">
              <div style="font-size:.8125rem;color:var(--color-text-muted);margin-bottom:.5rem">
                <code>{{ ticket()!.ticketNumber }}</code> · {{ formatDate(ticket()!.createdAt) }}
              </div>
              <h1 style="font-size:1.375rem;margin-bottom:.75rem">{{ ticket()!.subject }}</h1>
              <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem">
                <span [class]="statusBadge(ticket()!.status)">{{ statusLabel(ticket()!.status) }}</span>
                <span [class]="priorityBadge(ticket()!.priority)">{{ priorityLabel(ticket()!.priority) }}</span>
                @if (ticket()!.category) {
                  <span style="font-size:.8125rem;background:var(--color-surface-2);padding:2px 8px;border-radius:100px">🏷️ {{ ticket()!.category!.name }}</span>
                }
              </div>
              <div style="background:var(--color-surface-2);padding:1rem;border-radius:var(--border-radius);white-space:pre-wrap;line-height:1.6;font-size:.9375rem">{{ ticket()!.description }}</div>
            </div>

            <!-- Conversation -->
            <div class="card" style="margin-bottom:1.5rem">
              <h2 class="card-title" style="margin-bottom:1.25rem">Conversation ({{ messages().length }})</h2>
              <div class="message-thread">
                @for (msg of messages(); track msg.id) {
                  <div [class]="'message-bubble ' + messageClass(msg)">
                    <div class="avatar" [style.background]="msg.isInternal ? '#64748b' : ''">{{ initials(msg) }}</div>
                    <div style="flex:1">
                      <div class="message-body" [style.background]="msg.isInternal ? '#f1f5f9' : ''">
                        @if (msg.isInternal) { <span style="font-size:.75rem;background:#e2e8f0;padding:1px 6px;border-radius:4px;margin-bottom:.25rem;display:inline-block">Internal Note</span> }
                        <div class="message-author">{{ authorName(msg) }}</div>
                        <div class="message-text">{{ msg.body }}</div>
                        <div class="message-meta">{{ formatDateTime(msg.createdAt) }}</div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Reply -->
            <div class="card">
              <h3 class="card-title" style="margin-bottom:1rem">Add Reply</h3>
              @if (replyError()) {
                <div class="alert alert-error" style="margin-bottom:1rem">{{ replyError() }}</div>
              }
              <div class="form-group">
                <textarea class="form-control" [(ngModel)]="replyBody" rows="4" placeholder="Write your reply..." [disabled]="sending()"></textarea>
              </div>
              <div style="display:flex;align-items:center;gap:.75rem;justify-content:space-between">
                <label style="display:flex;align-items:center;gap:.5rem;font-size:.875rem;cursor:pointer">
                  <input type="checkbox" [(ngModel)]="isInternal" />
                  Internal note (not visible to customer)
                </label>
                <button class="btn btn-primary" (click)="sendReply()" [disabled]="!replyBody.trim() || sending()">
                  @if (sending()) { <span class="spinner"></span> } Send Reply
                </button>
              </div>
            </div>
          </div>

          <!-- Sidebar controls -->
          <div style="display:flex;flex-direction:column;gap:1rem">
            <!-- Status -->
            <div class="card">
              <h3 class="card-title" style="margin-bottom:.75rem">Status</h3>
              <select class="form-control" [(ngModel)]="selectedStatus" (ngModelChange)="updateStatus()" [disabled]="updating()">
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              @if (updateError()) {
                <div class="form-error" style="margin-top:.5rem">{{ updateError() }}</div>
              }
            </div>

            <!-- Priority -->
            <div class="card">
              <h3 class="card-title" style="margin-bottom:.75rem">Priority</h3>
              <select class="form-control" [(ngModel)]="selectedPriority" (ngModelChange)="updatePriority()">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <!-- Assignment -->
            <div class="card">
              <h3 class="card-title" style="margin-bottom:.75rem">Assigned To</h3>
              @if (agents().length > 0) {
                <select class="form-control" [(ngModel)]="selectedAgent" (ngModelChange)="assignTicket()" [disabled]="assigning()">
                  <option value="">Unassigned</option>
                  @for (agent of agents(); track agent.id) {
                    <option [value]="agent.id">{{ agent.firstName }} {{ agent.lastName }}</option>
                  }
                </select>
              } @else {
                <div style="font-size:.875rem;color:var(--color-text-muted)">Loading agents...</div>
              }
            </div>

            <!-- Customer info -->
            <div class="card">
              <h3 class="card-title" style="margin-bottom:.75rem">Customer</h3>
              <div style="font-weight:500">{{ ticket()!.customer.firstName }} {{ ticket()!.customer.lastName }}</div>
              <div style="font-size:.875rem;color:var(--color-text-secondary)">{{ ticket()!.customer.email }}</div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AgentTicketDetailComponent implements OnInit {
  @Input() id!: string;

  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  loading = signal(true);
  updating = signal(false);
  sending = signal(false);
  assigning = signal(false);
  ticket = signal<Ticket | null>(null);
  messages = signal<TicketMessage[]>([]);
  agents = signal<User[]>([]);

  replyBody = '';
  isInternal = false;
  replyError = signal('');
  updateError = signal('');
  selectedStatus = signal('OPEN');
  selectedPriority = signal('MEDIUM');
  selectedAgent = signal('');

  ngOnInit() {
    this.load();
    this.api.getAgents().subscribe({ next: (a) => this.agents.set(a), error: () => {} });
  }

  load() {
    this.loading.set(true);
    this.api.getTicket(this.id).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.messages.set(t.messages || []);
        this.selectedStatus.set(t.status);
        this.selectedPriority.set(t.priority);
        const assigned = t.assignments?.[0]?.agent?.id || '';
        this.selectedAgent.set(assigned);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  sendReply() {
    if (!this.replyBody.trim()) return;
    this.sending.set(true);
    this.replyError.set('');
    this.api.addMessage(this.id, this.replyBody, this.isInternal).subscribe({
      next: (msg) => {
        this.messages.update((m) => [...m, msg]);
        this.replyBody = '';
        this.isInternal = false;
        this.sending.set(false);
        this.api.getTicket(this.id).subscribe({ next: (t) => { this.ticket.set(t); this.selectedStatus.set(t.status); }, error: () => {} });
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.replyError.set(err.error?.message || 'Failed to send reply.');
      },
    });
  }

  updateStatus() {
    this.updating.set(true);
    this.updateError.set('');
    this.api.updateTicket(this.id, { status: this.selectedStatus() }).subscribe({
      next: (t) => { this.ticket.set(t); this.updating.set(false); },
      error: (err: HttpErrorResponse) => {
        this.updating.set(false);
        this.updateError.set(err.error?.message || 'Invalid status transition.');
        this.selectedStatus.set(this.ticket()!.status);
      },
    });
  }

  updatePriority() {
    this.api.updateTicket(this.id, { priority: this.selectedPriority() }).subscribe({
      next: (t) => this.ticket.set(t),
      error: () => this.selectedPriority.set(this.ticket()!.priority),
    });
  }

  assignTicket() {
    if (!this.selectedAgent()) return;
    this.assigning.set(true);
    this.api.assignTicket(this.id, this.selectedAgent()).subscribe({
      next: () => { this.assigning.set(false); this.load(); },
      error: () => this.assigning.set(false),
    });
  }

  messageClass(msg: TicketMessage) {
    return msg.author.role === 'CUSTOMER' ? 'customer-message' : 'agent-message';
  }
  initials(msg: TicketMessage) { return `${msg.author.firstName[0]}${msg.author.lastName[0]}`.toUpperCase(); }
  authorName(msg: TicketMessage) { return `${msg.author.firstName} ${msg.author.lastName}`; }
  statusBadge(s: string) { return `badge badge-${s.toLowerCase().replace(/_/g, '-')}`; }
  priorityBadge(p: string) { return `badge badge-${p.toLowerCase()}`; }
  statusLabel(s: string) { return STATUS_LABELS[s as keyof typeof STATUS_LABELS] || s; }
  priorityLabel(p: string) { return PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS] || p; }
  formatDate(d: string) { return new Date(d).toLocaleDateString(); }
  formatDateTime(d: string) { return new Date(d).toLocaleString(); }
}
