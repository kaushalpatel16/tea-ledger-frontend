import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, UserInput } from '../services/api.service';
import { Role, User } from '../models';

export interface UserDialogData {
  user?: User;
}

@Component({
  selector: 'tl-user-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
  ],
  styles: [
    `
      mat-form-field {
        width: 100%;
      }
      .row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 16px;
      }
      .full {
        grid-column: 1 / -1;
      }
      .toggle {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 2px 2px;
      }
      .toggle span {
        color: var(--tl-text-muted);
        font-size: 0.9rem;
      }
      .error {
        grid-column: 1 / -1;
        color: var(--tl-negative, #dc2626);
        font-size: 0.85rem;
        margin: 2px 0 -4px;
      }
      @media (max-width: 480px) {
        .row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;color:var(--tl-accent)">
        {{ isEdit ? 'manage_accounts' : 'person_add' }}
      </mat-icon>
      {{ isEdit ? 'Edit User' : 'Add User' }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <div class="row">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Name</mat-label>
            <input matInput #firstField formControlName="name" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
            @if (form.controls.email.hasError('email')) {
              <mat-error>Enter a valid email address</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" />
            @if (isEdit) {
              <mat-hint>Leave blank to keep the current password</mat-hint>
            }
            @if (form.controls.password.hasError('minlength')) {
              <mat-error>At least 6 characters</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Role</mat-label>
            <mat-select formControlName="role">
              <mat-option value="admin">Admin</mat-option>
              <mat-option value="member">Member</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="toggle">
            <span>Active account</span>
            <mat-slide-toggle formControlName="active" />
          </div>

          <div class="toggle">
            <span>Allow changing own password</span>
            <mat-slide-toggle formControlName="canChangePassword" />
          </div>

          @if (errorMsg()) {
            <div class="error">{{ errorMsg() }}</div>
          }
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="null">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
          <mat-icon>{{ isEdit ? 'save' : 'person_add' }}</mat-icon>
          {{ isEdit ? 'Save Changes' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class UserDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<UserDialog>);
  data = inject<UserDialogData>(MAT_DIALOG_DATA);

  isEdit = !!this.data.user;
  saving = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      this.data.user
        ? [Validators.minLength(6)]
        : [Validators.required, Validators.minLength(6)],
    ],
    role: ['member' as Role, Validators.required],
    active: [true],
    canChangePassword: [true],
  });

  constructor() {
    const u = this.data.user;
    if (u) {
      this.form.patchValue({
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        canChangePassword: u.canChangePassword,
      });
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.errorMsg.set('');
    const v = this.form.getRawValue();

    const payload: UserInput = {
      name: v.name.trim(),
      email: v.email.trim(),
      role: v.role,
      active: v.active,
      canChangePassword: v.canChangePassword,
    };
    if (v.password) payload.password = v.password;

    const obs = this.isEdit
      ? this.api.updateUser(this.data.user!.id, payload)
      : this.api.createUser(payload);

    obs.subscribe({
      next: () => this.ref.close(this.isEdit ? 'updated' : 'created'),
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.error || 'Something went wrong');
      },
    });
  }
}
