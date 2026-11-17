import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../services/api.service';
import { Vendor } from '../models';

export interface VendorDialogData {
  vendor?: Vendor;
}

/** 10–15 digits; spaces, dashes and a leading + are allowed. */
export const MOBILE_PATTERN = /^\+?[0-9\s-]{10,20}$/;

@Component({
  selector: 'tl-vendor-dialog',
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
      .prices {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0 16px;
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
      <mat-icon style="color:var(--tl-accent)">{{ isEdit ? 'edit' : 'storefront' }}</mat-icon>
      {{ isEdit ? 'Edit Chai Wala' : 'Add Chai Wala' }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        @if (error()) {
          <div class="err">{{ error() }}</div>
        }
        <mat-form-field appearance="outline">
          <mat-label>Chai Wala name</mat-label>
          <mat-icon matIconPrefix>storefront</mat-icon>
          <input matInput formControlName="name" placeholder="e.g. Ramesh Tea Stall" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Mobile number</mat-label>
          <mat-icon matIconPrefix>call</mat-icon>
          <input
            matInput
            type="tel"
            formControlName="mobile"
            placeholder="e.g. 98765 43210"
            inputmode="tel"
          />
          @if (form.controls.mobile.touched && form.controls.mobile.invalid) {
            <mat-error>Enter a valid mobile number (10–15 digits)</mat-error>
          }
        </mat-form-field>

        <div class="prices">
          <mat-form-field appearance="outline">
            <mat-label>Tea price</mat-label>
            <span matTextPrefix>₹&nbsp;</span>
            <input matInput type="number" min="0" step="0.5" formControlName="teaPrice" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Coffee price</mat-label>
            <span matTextPrefix>₹&nbsp;</span>
            <input matInput type="number" min="0" step="0.5" formControlName="coffeePrice" />
          </mat-form-field>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="null">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
          <mat-icon>{{ isEdit ? 'save' : 'add' }}</mat-icon>
          {{ isEdit ? 'Save Changes' : 'Add Chai Wala' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class VendorDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<VendorDialog>);
  data = inject<VendorDialogData>(MAT_DIALOG_DATA);

  isEdit = !!this.data.vendor;
  saving = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    mobile: ['', [Validators.required, Validators.pattern(MOBILE_PATTERN)]],
    teaPrice: [10 as number | null, [Validators.required, Validators.min(0)]],
    coffeePrice: [15 as number | null, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    const v = this.data.vendor;
    if (v) {
      this.form.patchValue({
        name: v.name,
        mobile: v.mobile,
        // Legacy vendors without prices start blank so the admin sets them deliberately.
        teaPrice: v.teaPrice ?? null,
        coffeePrice: v.coffeePrice ?? null,
      });
    }
  }

  submit() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    const payload = {
      name: v.name.trim(),
      mobile: v.mobile.trim(),
      teaPrice: Number(v.teaPrice),
      coffeePrice: Number(v.coffeePrice),
    };
    const obs = this.isEdit
      ? this.api.updateVendor(this.data.vendor!.id, payload)
      : this.api.createVendor(payload);
    obs.subscribe({
      next: () => this.ref.close(this.isEdit ? 'updated' : 'created'),
      error: (err) => {
        this.error.set(err?.error?.error || 'Could not save chai wala');
        this.saving.set(false);
      },
    });
  }
}
