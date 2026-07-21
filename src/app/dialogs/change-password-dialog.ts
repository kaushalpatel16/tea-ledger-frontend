import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const next = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return next && confirm && next !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'tl-change-password-dialog',
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
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(229, 72, 77, 0.12);
        color: var(--tl-negative);
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 0.86rem;
        margin-bottom: 10px;
      }
      .err mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    `,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;color:var(--tl-accent)">lock_reset</mat-icon>
      Change my password
    </h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        @if (error()) {
          <div class="err"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div>
        }
        <mat-form-field appearance="outline">
          <mat-label>Current password</mat-label>
          <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>New password</mat-label>
          <input matInput type="password" formControlName="newPassword" autocomplete="new-password" />
          @if (form.controls.newPassword.touched && form.controls.newPassword.hasError('minlength')) {
            <mat-error>At least 6 characters</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Confirm new password</mat-label>
          <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" />
          @if (form.hasError('mismatch') && form.controls.confirmPassword.touched) {
            <mat-error>Passwords don’t match</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="null">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
          <mat-icon>check</mat-icon> Update Password
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class ChangePasswordDialog {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private ref = inject(MatDialogRef<ChangePasswordDialog>);

  saving = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchPasswords },
  );

  submit() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => this.ref.close('changed'),
      error: (err) => {
        this.error.set(err?.error?.error || 'Could not change password');
        this.saving.set(false);
      },
    });
  }
}
