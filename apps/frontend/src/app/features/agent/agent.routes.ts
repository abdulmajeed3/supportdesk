import { Routes } from '@angular/router';
import { AppLayoutComponent } from '../../shared/components/layout/app-layout.component';

export const agentRoutes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/agent-dashboard.component').then(
            (m) => m.AgentDashboardComponent,
          ),
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./pages/tickets/agent-tickets.component').then((m) => m.AgentTicketsComponent),
      },
      {
        path: 'tickets/:id',
        loadComponent: () =>
          import('./pages/ticket-detail/agent-ticket-detail.component').then(
            (m) => m.AgentTicketDetailComponent,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
