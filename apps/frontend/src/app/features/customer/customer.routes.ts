import { Routes } from '@angular/router';
import { AppLayoutComponent } from '../../shared/components/layout/app-layout.component';

export const customerRoutes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/customer-dashboard.component').then(
            (m) => m.CustomerDashboardComponent,
          ),
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./pages/tickets/customer-tickets.component').then(
            (m) => m.CustomerTicketsComponent,
          ),
      },
      {
        path: 'tickets/new',
        loadComponent: () =>
          import('./pages/create-ticket/create-ticket.component').then(
            (m) => m.CreateTicketComponent,
          ),
      },
      {
        path: 'tickets/:id',
        loadComponent: () =>
          import('./pages/ticket-detail/ticket-detail.component').then(
            (m) => m.TicketDetailComponent,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
