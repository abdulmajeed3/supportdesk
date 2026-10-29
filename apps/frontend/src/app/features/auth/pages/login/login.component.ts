import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  template: `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--color-bg);padding:1.5rem">
      <div style="width:100%;max-width:420px">
        <!-- Logo -->
        <div style="text-align:center;margin-bottom:2rem">
          <div style="width:52px;height:52px;background:var(--color-primary);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:1.25rem;margin-bottom:1rem">SD</div>
          <h1 style="font-size:1.625rem;font-weight:700">Sign in to SupportDesk</h1>
          <p style="margin-top:.5rem;color:var(--color-text-secondary)">Welcome back! Please enter your details.</p>
        </div>

        <div class="card">
          @if (errorMessage()) {
            <div class="alert alert-error" style="margin-bottom:1.25rem" role="alert">{{ errorMessage() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
            <div class="form-group">
              <label class="form-label" for="email">Email address</label>
              <input
                id="email"
                type="email"
                class="form-control"
                formControlName="email"
                placeholder="you@example.com"
                autocomplete="email"
                [class.is-invalid]="form.get('email')?.invalid && form.get('email')?.touched"
                aria-describedby="email-error"
              />
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <span id="email-error" class="form-error">Please enter a valid email address</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="password">Password</label>
              <input
                id="password"
                type="password"
                class="form-control"
                formControlName="password"
                placeholder="••••••••"
                autocomplete="current-password"
                [class.is-invalid]="form.get('password')?.invalid && form.get('password')?.touched"
                aria-describedby="password-error"
              />
              @if (form.get('password')?.invalid && form.get('password')?.touched) {
                <span id="password-error" class="form-error">Password is required</span>
              }
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-full"
              [disabled]="loading()"
            >
              @if (loading()) { <span class="spinner"></span> } Signing in...
              @if (!loading()) { Sign in }
            </button>
          </form>
        </div>

        <p style="text-align:center;margin-top:1.25rem;color:var(--color-text-secondary);font-size:.875rem">
          Don't have an account? <a routerLink="/auth/register">Create one</a>
        </p>

        <div style="margin-top:2rem;padding:1rem;background:var(--color-surface-2);border-radius:var(--border-radius);font-size:.8125rem">
          <p style="font-weight:600;margin-bottom:.5rem;color:var(--color-text)">Demo credentials:</p>
          <p>Admin: <code>admin&#64;supportdesk.local</code> / <code>Admin&#64;123456</code></p>
          <p>Agent: <code>agent.sarah&#64;supportdesk.local</code> / <code>Agent&#64;123456</code></p>
          <p>Customer: <code>alice&#64;example.com</code> / <code>Customer&#64;123456</code></p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  loading = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.auth.getDashboardRoute()]);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Invalid email or password. Please try again.');
      },
    });
  }
}
