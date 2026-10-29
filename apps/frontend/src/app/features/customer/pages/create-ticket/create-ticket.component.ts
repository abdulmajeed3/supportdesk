import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { TicketCategory } from '../../../../core/models/ticket.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-create-ticket',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  template: `
    <div style="max-width:720px">
      <div class="page-header">
        <div>
          <h1>Create Support Ticket</h1>
          <p>Describe your issue and our team will help you as soon as possible.</p>
        </div>
        <a routerLink="/customer/tickets" class="btn btn-secondary">← Back</a>
      </div>

      <div class="card">
        @if (errorMessage()) {
          <div class="alert alert-error" style="margin-bottom:1.25rem" role="alert">{{ errorMessage() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <div class="form-group">
            <label class="form-label" for="subject">Subject *</label>
            <input id="subject" type="text" class="form-control" formControlName="subject"
              placeholder="Brief description of the issue"
              [class.is-invalid]="f['subject'].invalid && f['subject'].touched" />
            @if (f['subject'].invalid && f['subject'].touched) {
              <span class="form-error">Subject must be at least 5 characters</span>
            }
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div class="form-group">
              <label class="form-label" for="category">Category</label>
              <select id="category" class="form-control" formControlName="categoryId">
                <option value="">Select a category</option>
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="priority">Priority</label>
              <select id="priority" class="form-control" formControlName="priority">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="description">Description *</label>
            <textarea id="description" class="form-control" formControlName="description"
              rows="6" placeholder="Please describe your issue in detail..."
              [class.is-invalid]="f['description'].invalid && f['description'].touched">
            </textarea>
            <span class="form-hint">{{ form.get('description')?.value?.length || 0 }}/10000 characters</span>
            @if (f['description'].invalid && f['description'].touched) {
              <span class="form-error">Description must be at least 10 characters</span>
            }
          </div>

          <div style="display:flex;gap:.75rem;justify-content:flex-end">
            <a routerLink="/customer/tickets" class="btn btn-secondary">Cancel</a>
            <button type="submit" class="btn btn-primary" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> Submitting... }
              @if (!loading()) { Submit Ticket }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class CreateTicketComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  loading = signal(false);
  errorMessage = signal('');
  categories = signal<TicketCategory[]>([]);

  form = this.fb.group({
    subject: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10000)]],
    priority: ['MEDIUM'],
    categoryId: [''],
  });

  get f() { return this.form.controls; }

  ngOnInit() {
    this.api.getCategories(true).subscribe({ next: (cats) => this.categories.set(cats), error: () => {} });
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const v = this.form.value;
    this.api.createTicket({
      subject: v.subject!,
      description: v.description!,
      priority: v.priority || undefined,
      categoryId: v.categoryId || undefined,
    }).subscribe({
      next: (ticket) => {
        this.loading.set(false);
        this.router.navigate(['/customer/tickets', ticket.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to create ticket. Please try again.');
      },
    });
  }
}
