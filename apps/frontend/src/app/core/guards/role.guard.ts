import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export function roleGuard(...allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login']);
    }

    const role = auth.currentUser()?.role;
    if (role && allowedRoles.includes(role)) {
      return true;
    }

    return router.createUrlTree([auth.getDashboardRoute()]);
  };
}
