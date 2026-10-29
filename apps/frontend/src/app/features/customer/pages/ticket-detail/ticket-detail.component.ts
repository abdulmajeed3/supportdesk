import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Ticket, TicketMessage, STATUS_LABELS, PRIORITY_LABELS } from '../../../../core/models/ticket.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  template: `
    <div style="max-width:900px">
      <!-- Back -->
      <div style="margin-bottom:1.5rem">
        <a routerLink="/customer/tickets" class="btn btn-ghost btn-sm">← Back to Tickets</a>
      </div>

      @if (loading()) {
        <div class="loading-overlay"><div class="spinner"></div><span>Loading ticket...</span></div>
      }

      @if (!loading() && ticket()) {
        <!-- Header -->
        <div class="card" style="margin-bottom:1.5rem">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap">
            <div>
              <div style="font-size:.8125rem;color:var(--color-text-muted);margin-bottom:.5rem">
                <code>{{ ticket()!.ticketNumber }}</code>
                · Opened {{ formatDate(ticket()!.createdAt) }}
              </div>
              <h1 style="font-size:1.375rem;margin-bottom:.75rem">{{ ticket()!.subject }}</h1>
              <div style="display:flex;gap:.75rem;flex-wrap:wrap">
                <span [class]="statusBadge(ticket()!.status)">{{ statusLabel(ticket()!.status) }}</span>
                <span [class]="priorityBadge(ticket()!.priority)">{{ priorityLabel(ticket()!.priority) }}</span>
                @if (ticket()!.category) {
                  <span style="font-size:.8125rem;color:var(--color-text-secondary);background:var(--color-surface-2);padding:2px 8px;border-radius:100px">
                    🏷️ {{ ticket()!.category!.name }}
                  </span>
                }
              </div>
            </div>

            <!-- Actions for resolved tickets -->
            @if (ticket()!.status === 'RESOLVED') {
              <button class="btn btn-secondary btn-sm" (click)="reopenTicket()" [disabled]="updating()">
                🔄 Reopen Ticket
              </button>
            }
          </div>

          <hr class="divider" />
          <div style="white-space:pre-wrap;color:var(--color-text);line-height:1.6;font-size:.9375rem">{{ ticket()!.description }}</div>
        </div>

        <!-- Conversation -->
        <div class="card" style="margin-bottom:1.5rem">
          <h2 class="card-title" style="margin-bottom:1.25rem">Conversation ({{ messages().length }})</h2>

          @if (messages().length === 0) {
            <div style="color:var(--color-text-muted);font-size:.875rem;text-align:center;padding:1.5rem 0">No replies yet.</div>
          }

          <div class="message-thread">
            @for (msg of messages(); track msg.id) {
              <div [class]="'message-bubble ' + messageClass(msg)">
                <div class="avatar">{{ initials(msg) }}</div>
                <div style="flex:1">
                  <div class="message-body">
                    <div class="message-author">{{ authorName(msg) }}</div>
                    <div class="message-text">{{ msg.body }}</div>
                    <div class="message-meta">{{ formatDateTime(msg.createdAt) }}</div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Reply form -->
        @if (canReply()) {
          <div class="card">
            <h3 class="card-title" style="margin-bottom:1rem">Add Reply</h3>
            @if (replyError()) {
              <div class="alert alert-error" style="margin-bottom:1rem">{{ replyError() }}</div>
            }
            <div class="form-group">
              <textarea
                class="form-control"
                [(ngModel)]="replyBody"
                rows="4"
                placeholder="Write your reply here..."
                [disabled]="sendingReply()"
              ></textarea>
            </div>
            <div style="display:flex;justify-content:flex-end">
              <button class="btn btn-primary" (click)="sendReply()" [disabled]="!replyBody.trim() || sendingReply()">
                @if (sendingReply()) { <span class="spinner"></span> Sending... }
                @if (!sendingReply()) { Send Reply }
              </button>
            </div>
          </div>
        }

        @if (ticket()!.status === 'CLOSED') {
          <div class="alert alert-info">This ticket is closed and can no longer receive replies.</div>
        }
      }
    </div>
  `,
})
export class TicketDetailComponent implements OnInit {
  @Input() id!: string;

  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  loading = signal(true);
  updating = signal(false);
  sendingReply = signal(false);
  ticket = signal<Ticket | null>(null);
  messages = signal<TicketMessage[]>([]);
  replyBody = '';
  replyError = signal('');

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getTicket(this.id).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.messages.set(t.messages || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  canReply() {
    const s = this.ticket()?.status;
    return s && s !== 'CLOSED';
  }

  sendReply() {
    if (!this.replyBody.trim()) return;
    this.sendingReply.set(true);
    this.replyError.set('');
    this.api.addMessage(this.id, this.replyBody).subscribe({
      next: (msg) => {
        this.messages.update((msgs) => [...msgs, msg]);
        this.replyBody = '';
        this.sendingReply.set(false);
        // Reload to get updated status
        this.api.getTicket(this.id).subscribe({ next: (t) => this.ticket.set(t), error: () => {} });
      },
      error: (err: HttpErrorResponse) => {
        this.sendingReply.set(false);
        this.replyError.set(err.error?.message || 'Failed to send reply. Please try again.');
      },
    });
  }

  reopenTicket() {
    this.updating.set(true);
    this.api.updateTicket(this.id, { status: 'OPEN' }).subscribe({
      next: (t) => { this.ticket.set(t); this.updating.set(false); },
      error: () => this.updating.set(false),
    });
  }

  messageClass(msg: TicketMessage) {
    const r = msg.author.role.toLowerCase();
    return r === 'customer' ? 'customer-message' : 'agent-message';
  }

  initials(msg: TicketMessage) {
    return `${msg.author.firstName[0]}${msg.author.lastName[0]}`.toUpperCase();
  }

  authorName(msg: TicketMessage) {
    const role = msg.author.role;
    const name = `${msg.author.firstName} ${msg.author.lastName}`;
    return role === 'CUSTOMER' ? name : `${name} (Support)`;
  }

  statusBadge(s: string) { return `badge badge-${s.toLowerCase().replace(/_/g, '-')}`; }
  priorityBadge(p: string) { return `badge badge-${p.toLowerCase()}`; }
  statusLabel(s: string) { return STATUS_LABELS[s as keyof typeof STATUS_LABELS] || s; }
  priorityLabel(p: string) { return PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS] || p; }
  formatDate(d: string) { return new Date(d).toLocaleDateString(); }
  formatDateTime(d: string) { return new Date(d).toLocaleString(); }
}
