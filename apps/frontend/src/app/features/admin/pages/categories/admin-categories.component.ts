import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { TicketCategory } from '../../../../core/models/ticket.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  template: `
    <div>
      <div class="page-header">
        <div><h1>Category Management</h1><p>Manage ticket categories for your support team.</p></div>
        <button class="btn btn-primary" (click)="openCreate()">+ New Category</button>
      </div>

      <!-- Modal -->
      @if (showModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 style="font-size:1.125rem">{{ editing ? 'Edit Category' : 'New Category' }}</h2>
              <button class="btn btn-ghost btn-icon" (click)="closeModal()">✕</button>
            </div>
            @if (modalError()) {
              <div class="alert alert-error" style="margin-bottom:1rem">{{ modalError() }}</div>
            }
            <form [formGroup]="catForm" (ngSubmit)="save()" novalidate>
              <div class="form-group">
                <label class="form-label">Name *</label>
                <input type="text" class="form-control" formControlName="name"
                  [class.is-invalid]="catForm.get('name')?.invalid && catForm.get('name')?.touched" />
                @if (catForm.get('name')?.invalid && catForm.get('name')?.touched) {
                  <span class="form-error">Name is required (2–100 characters)</span>
                }
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea class="form-control" formControlName="description" rows="3"></textarea>
              </div>
              <div class="form-group">
                <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.875rem">
                  <input type="checkbox" formControlName="isActive" />
                  Active (visible for new tickets)
                </label>
              </div>
              <div style="display:flex;gap:.75rem;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="saving()">
                  @if (saving()) { <span class="spinner"></span> } {{ editing ? 'Save Changes' : 'Create Category' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="loading-overlay"><div class="spinner"></div></div>
      }

      @if (!loading()) {
        <div class="card" style="padding:0">
          @if (categories().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">🏷️</div>
              <h3>No categories yet</h3>
              <p>Create categories to help customers classify their tickets.</p>
            </div>
          } @else {
            <div class="table-container" style="border:none">
              <table>
                <thead><tr>
                  <th>Name</th><th>Description</th><th>Status</th><th>Tickets</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  @for (cat of categories(); track cat.id) {
                    <tr>
                      <td class="font-medium">{{ cat.name }}</td>
                      <td style="color:var(--color-text-secondary);max-width:300px" class="truncate">{{ cat.description || '—' }}</td>
                      <td>
                        <span [style.color]="cat.isActive ? 'var(--color-success)' : 'var(--color-text-muted)'">
                          {{ cat.isActive ? '● Active' : '○ Inactive' }}
                        </span>
                      </td>
                      <td>—</td>
                      <td>
                        <button class="btn btn-sm btn-secondary" (click)="openEdit(cat)">Edit</button>
                        <button class="btn btn-sm btn-secondary" style="margin-left:.5rem"
                          (click)="toggleActive(cat)">
                          {{ cat.isActive ? 'Deactivate' : 'Activate' }}
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminCategoriesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  loading = signal(true);
  saving = signal(false);
  modalError = signal('');
  categories = signal<TicketCategory[]>([]);
  showModal = false;
  editing: TicketCategory | null = null;

  catForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    description: [''],
    isActive: [true],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getCategories().subscribe({
      next: (cats) => { this.categories.set(cats); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.editing = null;
    this.catForm.reset({ name: '', description: '', isActive: true });
    this.modalError.set('');
    this.showModal = true;
  }

  openEdit(cat: TicketCategory) {
    this.editing = cat;
    this.catForm.patchValue({ name: cat.name, description: cat.description || '', isActive: cat.isActive });
    this.modalError.set('');
    this.showModal = true;
  }

  save() {
    this.catForm.markAllAsTouched();
    if (this.catForm.invalid) return;
    this.saving.set(true);
    this.modalError.set('');
    const v = this.catForm.value;
    const data = { name: v.name!, description: v.description || undefined, isActive: v.isActive ?? true };

    const req = this.editing
      ? this.api.updateCategory(this.editing.id, data)
      : this.api.createCategory(data);

    req.subscribe({
      next: (cat) => {
        if (this.editing) {
          this.categories.update((list) => list.map((c) => c.id === cat.id ? cat : c));
        } else {
          this.categories.update((list) => [...list, cat]);
        }
        this.saving.set(false);
        this.closeModal();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.modalError.set(err.error?.message || 'Failed to save category.');
      },
    });
  }

  toggleActive(cat: TicketCategory) {
    this.api.updateCategory(cat.id, { isActive: !cat.isActive }).subscribe({
      next: (updated) => this.categories.update((list) => list.map((c) => c.id === updated.id ? updated : c)),
      error: () => {},
    });
  }

  closeModal() { this.showModal = false; this.editing = null; }
}
