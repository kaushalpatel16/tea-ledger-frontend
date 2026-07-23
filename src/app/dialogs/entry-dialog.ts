import { Component, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { FormGroup } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Settings, Transaction } from '../models';
import { inr } from '../util/format';

// Small helper: turn a form control into a signal that tracks its value.
function toSignalFromControl<T>(group: FormGroup, name: string, initial: T) {
  const ctrl = group.get(name)!;
  return toSignal(ctrl.valueChanges.pipe(startWith(ctrl.value)) as any, {
    initialValue: initial,
  });
}

export interface EntryDialogData {
  transaction?: Transaction;
  settings: Settings;
  /** Pre-selected day for a new entry (time defaults to now). */
  defaultDate?: Date;
}

/** Combine a chosen day with the current time of day. */
function dayWithCurrentTime(day: Date): Date {
  const now = new Date();
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    now.getHours(),
    now.getMinutes(),
    0,
    0,
  );
}

@Component({
  selector: 'tl-entry-dialog',
  imports: [
    ReactiveFormsModule,
    FormsModule,
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
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 16px;
      }
      .full {
        grid-column: 1 / -1;
      }
      .summary {
        grid-column: 1 / -1;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        background: var(--tl-surface-2);
        border: 1px solid var(--tl-border);
        border-radius: 12px;
        padding: 12px 16px;
        font-weight: 600;
      }
      .summary .big {
        color: var(--tl-accent-strong);
        font-size: 1.15rem;
      }
      mat-form-field {
        width: 100%;
      }
      @media (max-width: 520px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;color:var(--tl-accent)">
        {{ isEdit ? 'edit' : 'add_circle' }}
      </mat-icon>
      {{ isEdit ? 'Edit Entry' : 'Add Entry' }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <div class="grid">
          <mat-form-field appearance="outline">
            <mat-label>Beverage</mat-label>
            <mat-select formControlName="beverageType">
              <mat-option value="tea">🍵 Tea</mat-option>
              <mat-option value="coffee">☕ Coffee</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Quantity</mat-label>
            <input
              #firstField
              matInput
              type="number"
              min="1"
              step="1"
              formControlName="quantity"
            />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Unit Price</mat-label>
            <span matTextPrefix>₹&nbsp;</span>
            <input matInput type="number" min="0" step="0.5" formControlName="unitPrice" />
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

          <mat-form-field appearance="outline" class="full">
            <mat-label>Notes (optional)</mat-label>
            <input matInput formControlName="notes" placeholder="e.g. extra sugar, guest visit" />
          </mat-form-field>

          <div class="summary">
            <span>Total ({{ form.value.quantity || 0 }} × {{ unitPriceLabel() }})</span>
            <span class="big">{{ total() }}</span>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="null">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
          <mat-icon>{{ isEdit ? 'save' : 'add' }}</mat-icon>
          {{ isEdit ? 'Save Changes' : 'Add Entry' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class EntryDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<EntryDialog>);
  data = inject<EntryDialogData>(MAT_DIALOG_DATA);

  isEdit = !!this.data.transaction;
  saving = signal(false);

  form = this.fb.nonNullable.group({
    beverageType: ['tea' as 'tea' | 'coffee', Validators.required],
    quantity: [1, [Validators.required, Validators.min(0.01)]],
    unitPrice: [this.data.settings.teaPrice, [Validators.required, Validators.min(0)]],
    when: [
      (this.data.defaultDate ? dayWithCurrentTime(this.data.defaultDate) : new Date()) as Date,
      Validators.required,
    ],
    notes: [''],
  });

  // Reactive mirrors of the values used in the computed total.
  private qty = toSignalFromControl(this.form, 'quantity', this.form.value.quantity!);
  private price = toSignalFromControl(this.form, 'unitPrice', this.form.value.unitPrice!);

  totalValue = computed(() => Math.max(0, Number(this.qty()) || 0) * (Number(this.price()) || 0));
  total = computed(() => inr(this.totalValue()));
  unitPriceLabel = computed(() => inr(Number(this.price()) || 0));

  constructor() {
    const tx = this.data.transaction;
    if (tx) {
      this.form.patchValue({
        beverageType: tx.beverageType,
        quantity: tx.quantity,
        unitPrice: tx.unitPrice,
        when: new Date(tx.datetime),
        notes: tx.notes,
      });
    }

    // Auto-fill unit price from settings when beverage changes (new entries only,
    // and only if the user hasn't manually diverged from a settings price).
    this.form.controls.beverageType.valueChanges.subscribe((bev) => {
      if (this.isEdit) return;
      const p = bev === 'coffee' ? this.data.settings.coffeePrice : this.data.settings.teaPrice;
      this.form.controls.unitPrice.setValue(p);
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const payload = {
      beverageType: v.beverageType,
      quantity: Number(v.quantity),
      unitPrice: Number(v.unitPrice),
      datetime: v.when.toISOString(),
      notes: v.notes,
    };
    const obs = this.isEdit
      ? this.api.updateTransaction(this.data.transaction!.id, payload)
      : this.api.createTransaction(payload);
    obs.subscribe({
      next: () => this.ref.close(this.isEdit ? 'updated' : 'created'),
      error: () => this.saving.set(false),
    });
  }
}
