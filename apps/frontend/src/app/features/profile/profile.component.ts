import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div style="max-width:520px">
      <div class="page-header">
        <div><h1>Profile Settings</h1><p>Update your personal information.</p></div>
      </div>

      <div class="card">
        @if (successMsg()) {
          <div class="alert alert-success" style="margin-bottom:1.25rem">{{ successMsg() }}</div>
        }
        @if (errorMsg()) {
          <div class="alert alert-error" style="margin-bottom:1.25rem">{{ errorMsg() }}</div>
        }

        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--color-primary);color:white;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:600">
            {{ initials() }}
          </div>
          <div>
            <div style="font-weight:600;font-size:1.125rem">{{ fullName() }}</div>
            <div style="font-size:.875rem;color:var(--color-text-secondary)">{{ auth.currentUser()?.email }}</div>
            <span style="font-size:.75rem;background:var(--color-surface-2);padding:2px 8px;border-radius:100px">
              {{ auth.currentUser()?.role }}
            </span>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div class="form-group">
              <label class="form-label">First Name</label>
              <input type="text" class="form-control" formControlName="firstName" />
            </div>
            <div class="form-group">
              <label class="form-label">Last Name</label>
              <input type="text" class="form-control" formControlName="lastName" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" [value]="auth.currentUser()?.email || ''" disabled style="opacity:.6" />
            <span class="form-hint">Email cannot be changed.</span>
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) { <span class="spinner"></span> Saving... }
            @if (!saving()) { Save Changes }
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  saving = signal(false);
  successMsg = signal('');
  errorMsg = signal('');

  form = this.fb.group({
    firstName: [this.auth.currentUser()?.firstName || '', Validators.required],
    lastName: [this.auth.currentUser()?.lastName || '', Validators.required],
  });

  initials() {
    const u = this.auth.currentUser();
    return u ? `${u.firstName[0]}${u.lastName[0]}`.toUpperCase() : '?';
  }

  fullName() {
    const u = this.auth.currentUser();
    return u ? `${u.firstName} ${u.lastName}` : '';
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    this.api.updateMe(this.form.value as { firstName: string; lastName: string }).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set('Profile updated successfully.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to update profile.');
      },
    });
  }
}
