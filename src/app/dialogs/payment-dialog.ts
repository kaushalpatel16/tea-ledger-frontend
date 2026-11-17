import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
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
import { Payment, Vendor } from '../models';
import { inr } from '../util/format';

export interface PaymentDialogData {
  /** Vendors to choose from — a payment always belongs to one. */
  vendors: Vendor[];
  /** Pending balance per vendor id, used for the hint and to prefill the amount. */
  vendorPending?: Record<string, number>;
  /** Pre-selected vendor for a new payment. */
  vendorId?: string;
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
      .full {
        grid-column: 1 / -1;
      }
      .hint {
        color: var(--tl-text-muted);
        font-size: 0.85rem;
        margin: 0 0 18px;
        padding: 10px 12px;
        background: var(--tl-surface-2);
        border: 1px solid var(--tl-border);
        border-radius: 10px;
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
        <div class="row">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Vendor</mat-label>
            <mat-icon matIconPrefix>storefront</mat-icon>
            <mat-select formControlName="vendor" required>
              @for (v of data.vendors; track v.id) {
                <mat-option [value]="v.id">{{ v.name }} · {{ v.mobile }}</mat-option>
              }
            </mat-select>
            @if (form.controls.vendor.touched && form.controls.vendor.invalid) {
              <mat-error>Please select a vendor</mat-error>
            }
          </mat-form-field>

          @if (!isEdit && pendingLabel()) {
            <p class="hint full">
              Pending balance for this vendor: <strong>{{ pendingLabel() }}</strong>
            </p>
          }

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

  private initialVendor =
    this.data.payment?.vendor?.id ??
    this.data.vendorId ??
    (this.data.vendors.length === 1 ? this.data.vendors[0].id : '');

  form = this.fb.nonNullable.group({
    vendor: [this.initialVendor as string, Validators.required],
    amount: [this.pendingFor(this.initialVendor), [Validators.required, Validators.min(0.01)]],
    when: [new Date() as Date, Validators.required],
    paymentMethod: ['cash' as 'cash' | 'upi' | 'bank', Validators.required],
    notes: [''],
  });

  private vendorValue = toSignal(
    this.form.controls.vendor.valueChanges.pipe(startWith(this.form.controls.vendor.value)),
    { initialValue: this.form.controls.vendor.value },
  );

  /** Pending balance of the selected vendor, formatted; empty when unknown. */
  pendingLabel = computed(() => {
    const id = this.vendorValue();
    const pending = id ? this.data.vendorPending?.[id] : undefined;
    return pending == null ? '' : inr(pending);
  });

  private pendingFor(vendorId: string): number {
    const pending = vendorId ? this.data.vendorPending?.[vendorId] : undefined;
    return pending && pending > 0 ? Number(pending.toFixed(2)) : 0;
  }

  constructor() {
    // New payments: prefill the amount with the chosen vendor's pending balance.
    this.form.controls.vendor.valueChanges.subscribe((id) => {
      if (!this.isEdit) this.form.controls.amount.setValue(this.pendingFor(id));
    });

    const p = this.data.payment;
    if (p) {
      this.form.patchValue({
        vendor: p.vendor?.id ?? '',
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
      vendor: v.vendor,
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
