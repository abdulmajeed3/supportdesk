import { Routes } from '@angular/router';
import { AppLayoutComponent } from '../../shared/components/layout/app-layout.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('../agent/pages/tickets/agent-tickets.component').then(
            (m) => m.AgentTicketsComponent,
          ),
      },
      {
        path: 'tickets/:id',
        loadComponent: () =>
          import('../agent/pages/ticket-detail/agent-ticket-detail.component').then(
            (m) => m.AgentTicketDetailComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/users/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/categories/admin-categories.component').then(
            (m) => m.AdminCategoriesComponent,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
