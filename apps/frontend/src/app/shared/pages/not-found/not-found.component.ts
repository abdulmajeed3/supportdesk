import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem">
      <div style="font-size:6rem;margin-bottom:1rem">🔍</div>
      <h1 style="font-size:3rem;font-weight:700;color:#0f172a;margin-bottom:0.5rem">404</h1>
      <h2 style="font-size:1.5rem;margin-bottom:1rem;color:#0f172a">Page Not Found</h2>
      <p style="color:#64748b;max-width:400px;margin-bottom:2rem">
        The page you're looking for doesn't exist or you don't have permission to access it.
      </p>
      <a routerLink="/" class="btn btn-primary">Go Home</a>
    </div>
  `,
})
export class NotFoundComponent {}
