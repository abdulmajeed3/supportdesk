import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AppLayoutComponent } from './shared/components/layout/app-layout.component';

export const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  // Auth routes (accessible only when NOT logged in)
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

  // Shared authenticated routes (accessible to all roles)
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },

  // Customer routes
  {
    path: 'customer',
    canActivate: [authGuard, roleGuard('CUSTOMER')],
    loadChildren: () =>
      import('./features/customer/customer.routes').then((m) => m.customerRoutes),
  },

  // Agent routes
  {
    path: 'agent',
    canActivate: [authGuard, roleGuard('AGENT')],
    loadChildren: () => import('./features/agent/agent.routes').then((m) => m.agentRoutes),
  },

  // Admin routes
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('ADMIN')],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },

  // Catch-all
  {
    path: '**',
    loadComponent: () =>
      import('./shared/pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
