import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { User } from '../../../../core/models/user.model';
import { HttpErrorResponse } from '@angular/common/http';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#\-_.])[A-Za-z\d@$!%*?&^#\-_.]{8,}$/;

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  template: `
    <div>
      <div class="page-header">
        <div><h1>User Management</h1><p>Manage customers and agent accounts.</p></div>
        <button class="btn btn-primary" (click)="showCreateModal = true">+ Add Agent</button>
      </div>

      <!-- Create Agent Modal -->
      @if (showCreateModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 style="font-size:1.125rem">Create Agent Account</h2>
              <button class="btn btn-ghost btn-icon" (click)="closeModal()">✕</button>
            </div>
            @if (createError()) {
              <div class="alert alert-error" style="margin-bottom:1rem">{{ createError() }}</div>
            }
            <form [formGroup]="agentForm" (ngSubmit)="createAgent()" novalidate>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
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
                <input type="email" class="form-control" formControlName="email" />
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" class="form-control" formControlName="password" />
                <span class="form-hint">Min 8 chars: uppercase, lowercase, number, special character</span>
              </div>
              <div style="display:flex;gap:.75rem;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="creating()">
                  @if (creating()) { <span class="spinner"></span> } Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Filter tabs -->
      <div style="display:flex;gap:.5rem;margin-bottom:1rem">
        @for (tab of ['ALL','CUSTOMER','AGENT','ADMIN']; track tab) {
          <button [class]="'btn btn-sm ' + (roleFilter() === tab ? 'btn-primary' : 'btn-secondary')" (click)="roleFilter.set(tab); load()">
            {{ tab === 'ALL' ? 'All Users' : tab.charAt(0) + tab.slice(1).toLowerCase() + 's' }}
          </button>
        }
      </div>

      @if (loading()) {
        <div class="loading-overlay"><div class="spinner"></div></div>
      }

      @if (!loading()) {
        <div class="card" style="padding:0">
          <div class="table-container" style="border:none">
            <table>
              <thead><tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
              </tr></thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr>
                    <td class="font-medium">{{ user.firstName }} {{ user.lastName }}</td>
                    <td style="color:var(--color-text-secondary)">{{ user.email }}</td>
                    <td>
                      <span [class]="'badge badge-' + user.role.toLowerCase()">{{ user.role }}</span>
                    </td>
                    <td>
                      <span [style.color]="user.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)'">
                        {{ user.status }}
                      </span>
                    </td>
                    <td style="color:var(--color-text-secondary)">{{ formatDate(user.createdAt) }}</td>
                    <td>
                      @if (user.role !== 'ADMIN') {
                        @if (user.status === 'ACTIVE') {
                          <button class="btn btn-sm btn-danger" (click)="toggleStatus(user, 'SUSPENDED')">Suspend</button>
                        } @else {
                          <button class="btn btn-sm btn-secondary" (click)="toggleStatus(user, 'ACTIVE')">Activate</button>
                        }
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  loading = signal(true);
  creating = signal(false);
  createError = signal('');
  users = signal<User[]>([]);
  showCreateModal = false;
  roleFilter = signal('ALL');

  agentForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(passwordPattern)]],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const role = this.roleFilter() === 'ALL' ? undefined : this.roleFilter();
    this.api.getUsers({ limit: 100, role }).subscribe({
      next: (r) => { this.users.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createAgent() {
    this.agentForm.markAllAsTouched();
    if (this.agentForm.invalid) return;
    this.creating.set(true);
    this.createError.set('');
    const v = this.agentForm.value;
    this.api.createAgent({ email: v.email!, firstName: v.firstName!, lastName: v.lastName!, password: v.password! }).subscribe({
      next: (u) => {
        this.users.update((list) => [u, ...list]);
        this.creating.set(false);
        this.showCreateModal = false;
        this.agentForm.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.creating.set(false);
        this.createError.set(err.error?.message || 'Failed to create agent.');
      },
    });
  }

  toggleStatus(user: User, status: string) {
    this.api.updateUserStatus(user.id, status).subscribe({
      next: (updated) => this.users.update((list) => list.map((u) => u.id === updated.id ? updated : u)),
      error: () => {},
    });
  }

  closeModal() { this.showCreateModal = false; this.agentForm.reset(); this.createError.set(''); }
  formatDate(d: string) { return new Date(d).toLocaleDateString(); }
}
