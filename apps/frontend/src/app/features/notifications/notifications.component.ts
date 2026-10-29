import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Notification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <div class="page-header">
        <div><h1>Notifications</h1><p>Stay updated on your support activity.</p></div>
        @if (unread() > 0) {
          <button class="btn btn-secondary" (click)="markAllRead()">Mark all as read</button>
        }
      </div>

      @if (loading()) {
        <div class="loading-overlay"><div class="spinner"></div></div>
      }

      @if (!loading()) {
        @if (notifications().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">🔔</div>
            <h3>No notifications</h3>
            <p>You're all caught up! Nothing new to show.</p>
          </div>
        } @else {
          <div class="card" style="padding:0">
            @for (n of notifications(); track n.id) {
              <div
                (click)="markRead(n)"
                style="display:flex;gap:1rem;padding:1rem 1.25rem;border-bottom:1px solid var(--color-border);cursor:pointer;transition:background .1s"
                [style.background]="n.isRead ? 'transparent' : 'var(--color-primary-light)'"
                [class.last]="$last"
              >
                <div style="font-size:1.5rem;flex-shrink:0">{{ typeIcon(n.type) }}</div>
                <div style="flex:1">
                  <div style="font-weight:600;font-size:.875rem;margin-bottom:.25rem;color:var(--color-text)">{{ n.title }}</div>
                  <div style="font-size:.8125rem;color:var(--color-text-secondary);margin-bottom:.25rem">{{ n.body }}</div>
                  <div style="font-size:.75rem;color:var(--color-text-muted)">{{ formatTime(n.createdAt) }}</div>
                </div>
                @if (!n.isRead) {
                  <div style="width:8px;height:8px;background:var(--color-primary);border-radius:50%;flex-shrink:0;margin-top:.5rem"></div>
                }
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  private readonly api = inject(ApiService);

  loading = signal(true);
  notifications = signal<Notification[]>([]);
  unread = signal(0);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getNotifications().subscribe({
      next: (ns) => {
        this.notifications.set(ns);
        this.unread.set(ns.filter((n) => !n.isRead).length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  markRead(n: Notification) {
    if (!n.isRead) {
      this.api.markNotificationRead(n.id).subscribe();
      this.notifications.update((list) => list.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
      this.unread.update((c) => Math.max(0, c - 1));
    }
  }

  markAllRead() {
    this.api.markAllNotificationsRead().subscribe();
    this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.unread.set(0);
  }

  typeIcon(type: string) {
    const icons: Record<string, string> = {
      TICKET_ASSIGNED: '📋',
      TICKET_STATUS_CHANGED: '🔄',
      TICKET_REPLY: '💬',
      TICKET_CREATED: '🎫',
    };
    return icons[type] || '🔔';
  }

  formatTime(d: string) {
    const now = Date.now();
    const then = new Date(d).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(d).toLocaleDateString();
  }
}
