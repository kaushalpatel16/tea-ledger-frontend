import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { ApiService } from '../services/api.service';
import { Payment } from '../models';
import { inr } from '../util/format';

export interface PaymentDialogData {
  pending?: number;
  payment?: Payment;
}

@Component({
  selector: 'tl-payment-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatTimepickerModule,
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
      .hint {
        grid-column: 1 / -1;
        color: var(--tl-text-muted);
        font-size: 0.85rem;
        margin: -4px 0 4px;
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
      <mat-icon style="vertical-align:middle;color:var(--tl-accent)">payments</mat-icon>
      {{ isEdit ? 'Edit Payment' : 'Record Payment' }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        @if (!isEdit && data.pending != null) {
          <p class="hint">Current pending balance: <strong>{{ pendingLabel }}</strong></p>
        }
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Amount Paid</mat-label>
            <span matTextPrefix>₹&nbsp;</span>
            <input matInput #firstField type="number" min="0" step="1" formControlName="amount" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Date</mat-label>
            <input
              matInput
              [matDatepicker]="datePicker"
              formControlName="when"
              readonly
              (click)="datePicker.open()"
            />
            <mat-datepicker-toggle matIconSuffix [for]="datePicker" />
            <mat-datepicker #datePicker />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Time</mat-label>
            <input
              matInput
              [matTimepicker]="timePicker"
              formControlName="when"
              readonly
              (click)="timePicker.open()"
            />
            <mat-timepicker-toggle matIconSuffix [for]="timePicker" />
            <mat-timepicker #timePicker interval="15min" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Payment Method</mat-label>
            <mat-select formControlName="paymentMethod">
              <mat-option value="cash">💵 Cash</mat-option>
              <mat-option value="upi">📱 UPI</mat-option>
              <mat-option value="bank">🏦 Bank</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Notes (optional)</mat-label>
            <input matInput formControlName="notes" />
          </mat-form-field>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="null">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
          <mat-icon>{{ isEdit ? 'save' : 'check' }}</mat-icon>
          {{ isEdit ? 'Save Changes' : 'Record Payment' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class PaymentDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<PaymentDialog>);
  data = inject<PaymentDialogData>(MAT_DIALOG_DATA);

  isEdit = !!this.data.payment;
  saving = signal(false);
  pendingLabel = inr(this.data.pending ?? 0);

  form = this.fb.nonNullable.group({
    amount: [
      this.data.pending && this.data.pending > 0 ? Number(this.data.pending.toFixed(2)) : 0,
      [Validators.required, Validators.min(0.01)],
    ],
    when: [new Date() as Date, Validators.required],
    paymentMethod: ['cash' as 'cash' | 'upi' | 'bank', Validators.required],
    notes: [''],
  });

  constructor() {
    const p = this.data.payment;
    if (p) {
      this.form.patchValue({
        amount: p.amount,
        when: new Date(p.date),
        paymentMethod: p.paymentMethod,
        notes: p.notes,
      });
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const payload = {
      amount: Number(v.amount),
      paymentMethod: v.paymentMethod,
      date: v.when.toISOString(),
      notes: v.notes,
    };
    const obs = this.isEdit
      ? this.api.updatePayment(this.data.payment!.id, payload)
      : this.api.createPayment(payload);
    obs.subscribe({
      next: () => this.ref.close(this.isEdit ? 'updated' : 'created'),
      error: () => this.saving.set(false),
    });
  }
}
