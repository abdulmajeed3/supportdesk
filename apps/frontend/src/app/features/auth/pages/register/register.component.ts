import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#\-_.])[A-Za-z\d@$!%*?&^#\-_.]{8,}$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  template: `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--color-bg);padding:1.5rem">
      <div style="width:100%;max-width:440px">
        <div style="text-align:center;margin-bottom:2rem">
          <div style="width:52px;height:52px;background:var(--color-primary);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:1.25rem;margin-bottom:1rem">SD</div>
          <h1 style="font-size:1.625rem;font-weight:700">Create your account</h1>
          <p style="margin-top:.5rem;color:var(--color-text-secondary)">Get started with SupportDesk today.</p>
        </div>

        <div class="card">
          @if (errorMessage()) {
            <div class="alert alert-error" style="margin-bottom:1.25rem" role="alert">{{ errorMessage() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
              <div class="form-group">
                <label class="form-label" for="firstName">First name</label>
                <input id="firstName" type="text" class="form-control" formControlName="firstName"
                  [class.is-invalid]="f['firstName'].invalid && f['firstName'].touched"
                  autocomplete="given-name" />
                @if (f['firstName'].invalid && f['firstName'].touched) {
                  <span class="form-error">First name is required</span>
                }
              </div>
              <div class="form-group">
                <label class="form-label" for="lastName">Last name</label>
                <input id="lastName" type="text" class="form-control" formControlName="lastName"
                  [class.is-invalid]="f['lastName'].invalid && f['lastName'].touched"
                  autocomplete="family-name" />
                @if (f['lastName'].invalid && f['lastName'].touched) {
                  <span class="form-error">Last name is required</span>
                }
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="email">Email address</label>
              <input id="email" type="email" class="form-control" formControlName="email"
                [class.is-invalid]="f['email'].invalid && f['email'].touched"
                autocomplete="email" placeholder="you@example.com" />
              @if (f['email'].invalid && f['email'].touched) {
                <span class="form-error">Please enter a valid email address</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="password">Password</label>
              <input id="password" type="password" class="form-control" formControlName="password"
                [class.is-invalid]="f['password'].invalid && f['password'].touched"
                autocomplete="new-password" />
              <span class="form-hint">Min 8 chars with uppercase, lowercase, number and special character</span>
              @if (f['password'].invalid && f['password'].touched) {
                <span class="form-error">Password must meet the requirements above</span>
              }
            </div>

            <button type="submit" class="btn btn-primary btn-full" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> Registering... }
              @if (!loading()) { Create account }
            </button>
          </form>
        </div>

        <p style="text-align:center;margin-top:1.25rem;color:var(--color-text-secondary);font-size:.875rem">
          Already have an account? <a routerLink="/auth/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  loading = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(passwordPattern)]],
  });

  get f(): Record<string, AbstractControl> {
    return this.form.controls;
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password, firstName, lastName } = this.form.value;
    this.auth.register({ email: email!, password: password!, firstName: firstName!, lastName: lastName! }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/customer/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Registration failed. Please try again.');
      },
    });
  }
}
