import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../services/api.service';
import { Contact } from '../models';

export interface ContactDialogData {
  contact?: Contact;
}

@Component({
  selector: 'tl-contact-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  styles: [
    `
      mat-form-field {
        width: 100%;
      }
      .err {
        color: var(--tl-negative);
        font-size: 0.85rem;
        margin: 2px 0 6px;
      }
    `,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="color:var(--tl-accent)">{{ isEdit ? 'edit' : 'person_add_alt' }}</mat-icon>
      {{ isEdit ? 'Edit Contact' : 'Add Contact' }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        @if (error()) {
          <div class="err">{{ error() }}</div>
        }
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <mat-icon matIconPrefix>person</mat-icon>
          <input matInput formControlName="name" placeholder="e.g. Tea vendor" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Phone number</mat-label>
          <mat-icon matIconPrefix>call</mat-icon>
          <input matInput formControlName="phone" placeholder="e.g. +91 98765 43210" />
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="null">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
          <mat-icon>{{ isEdit ? 'save' : 'add' }}</mat-icon>
          {{ isEdit ? 'Save Changes' : 'Add Contact' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class ContactDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<ContactDialog>);
  data = inject<ContactDialogData>(MAT_DIALOG_DATA);

  isEdit = !!this.data.contact;
  saving = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', [Validators.required, Validators.minLength(4)]],
  });

  constructor() {
    const c = this.data.contact;
    if (c) this.form.patchValue({ name: c.name, phone: c.phone });
  }

  submit() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    const payload = { name: v.name.trim(), phone: v.phone.trim() };
    const obs = this.isEdit
      ? this.api.updateContact(this.data.contact!.id, payload)
      : this.api.createContact(payload);
    obs.subscribe({
      next: () => this.ref.close(this.isEdit ? 'updated' : 'created'),
      error: (err) => {
        this.error.set(err?.error?.error || 'Could not save contact');
        this.saving.set(false);
      },
    });
  }
}
