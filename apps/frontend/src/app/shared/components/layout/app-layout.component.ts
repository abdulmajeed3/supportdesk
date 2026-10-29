import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { fullName } from '../../../core/models/user.model';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, CommonModule],
  template: `
    <div class="page-layout">
      <!-- Mobile overlay -->
      @if (sidebarOpen()) {
        <div
          style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99"
          (click)="closeSidebar()"
        ></div>
      }

      <!-- Sidebar -->
      <nav class="sidebar" [class.open]="sidebarOpen()" aria-label="Main navigation">
        <!-- Logo -->
        <div style="padding:1.25rem 1rem;border-bottom:1px solid var(--color-border)">
          <div style="display:flex;align-items:center;gap:.75rem">
            <div style="width:32px;height:32px;background:var(--color-primary);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:.875rem">SD</div>
            <div>
              <div style="font-weight:700;font-size:.9375rem;color:var(--color-text)">SupportDesk</div>
              <div style="font-size:.6875rem;color:var(--color-text-muted)">{{ roleLabel() }}</div>
            </div>
          </div>
        </div>

        <!-- Nav Items -->
        <div style="flex:1;padding:.75rem 0;overflow-y:auto">
          @for (item of navItems(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              class="nav-item"
              (click)="closeSidebar()"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              {{ item.label }}
              @if (item.label === 'Notifications' && unreadCount() > 0) {
                <span class="nav-badge">{{ unreadCount() }}</span>
              }
            </a>
          }
        </div>

        <!-- User section -->
        <div style="padding:1rem;border-top:1px solid var(--color-border)">
          <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--color-primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:.8125rem;flex-shrink:0">
              {{ initials() }}
            </div>
            <div style="overflow:hidden">
              <div style="font-weight:500;font-size:.875rem;color:var(--color-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ userName() }}</div>
              <div style="font-size:.75rem;color:var(--color-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ userEmail() }}</div>
            </div>
          </div>
          <a routerLink="/profile" class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start" (click)="closeSidebar()">⚙️ Settings</a>
          <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:.25rem;justify-content:flex-start;color:var(--color-danger)" (click)="logout()">🚪 Sign Out</button>
        </div>
      </nav>

      <!-- Main content -->
      <div class="main-content">
        <!-- Top bar -->
        <header class="top-bar">
          <button
            class="btn btn-ghost btn-icon"
            style="display:none"
            (click)="toggleSidebar()"
            aria-label="Toggle navigation"
            id="menu-toggle"
          >☰</button>
          <div style="flex:1"></div>
          <div style="display:flex;align-items:center;gap:1rem">
            <a routerLink="/notifications" class="btn btn-ghost btn-icon" style="position:relative" aria-label="Notifications">
              🔔
              @if (unreadCount() > 0) {
                <span style="position:absolute;top:2px;right:2px;width:8px;height:8px;background:var(--color-danger);border-radius:50%;border:2px solid white"></span>
              }
            </a>
          </div>
        </header>

        <main class="page-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    @media (max-width: 768px) {
      #menu-toggle { display: flex !important; }
    }
  `],
})
export class AppLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  sidebarOpen = signal(false);
  unreadCount = signal(0);

  userName = computed(() => {
    const u = this.auth.currentUser();
    return u ? fullName(u) : '';
  });
  userEmail = computed(() => this.auth.currentUser()?.email || '');
  initials = computed(() => {
    const u = this.auth.currentUser();
    return u ? `${u.firstName[0]}${u.lastName[0]}`.toUpperCase() : '?';
  });
  roleLabel = computed(() => {
    const r = this.auth.currentUser()?.role;
    return r === 'ADMIN' ? 'Administrator' : r === 'AGENT' ? 'Support Agent' : 'Customer';
  });

  navItems = computed<NavItem[]>(() => {
    const role = this.auth.currentUser()?.role;
    if (role === 'ADMIN') return [
      { label: 'Dashboard', icon: '📊', route: '/admin/dashboard' },
      { label: 'All Tickets', icon: '🎫', route: '/admin/tickets' },
      { label: 'Users', icon: '👥', route: '/admin/users' },
      { label: 'Categories', icon: '🏷️', route: '/admin/categories' },
      { label: 'Notifications', icon: '🔔', route: '/notifications' },
    ];
    if (role === 'AGENT') return [
      { label: 'Dashboard', icon: '📊', route: '/agent/dashboard' },
      { label: 'Ticket Queue', icon: '🎫', route: '/agent/tickets' },
      { label: 'Notifications', icon: '🔔', route: '/notifications' },
    ];
    return [
      { label: 'Dashboard', icon: '📊', route: '/customer/dashboard' },
      { label: 'My Tickets', icon: '🎫', route: '/customer/tickets' },
      { label: 'New Ticket', icon: '➕', route: '/customer/tickets/new' },
      { label: 'Notifications', icon: '🔔', route: '/notifications' },
    ];
  });

  constructor() {
    this.loadUnreadCount();
  }

  private loadUnreadCount() {
    this.api.getUnreadCount().subscribe({ next: (n) => this.unreadCount.set(n), error: () => {} });
  }

  toggleSidebar() { this.sidebarOpen.update((v) => !v); }
  closeSidebar() { this.sidebarOpen.set(false); }

  logout() {
    this.auth.logout();
  }
}
