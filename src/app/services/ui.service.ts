import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { EntryDialog, EntryDialogData } from '../dialogs/entry-dialog';
import { PaymentDialog } from '../dialogs/payment-dialog';
import { ConfirmDialog, ConfirmData } from '../dialogs/confirm-dialog';
import { ChangePasswordDialog } from '../dialogs/change-password-dialog';
import { ContactDialog } from '../dialogs/contact-dialog';
import { VendorDialog } from '../dialogs/vendor-dialog';
import { PaymentDialogData } from '../dialogs/payment-dialog';
import { Contact, Payment, Transaction, Vendor } from '../models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UiService {
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private api = inject(ApiService);
  private auth = inject(AuthService);

  toast(message: string, icon = '✓') {
    this.snack.open(`${icon}  ${message}`, '', {
      duration: 2600,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: 'tl-snack',
    });
  }

  /**
   * Open the Add/Edit entry dialog. Loads current settings for price prefill.
   * `defaultDate` pre-selects the day for a new entry (e.g. the day picked in
   * the calendar); the time defaults to now.
   */
  async openEntry(
    transaction?: Transaction,
    defaultDate?: Date,
  ): Promise<'created' | 'updated' | null> {
    const [settings, vendors] = await Promise.all([
      firstValueFrom(this.api.getSettings()),
      firstValueFrom(this.api.getVendors()),
    ]);
    // Entries can't exist without a chai wala, so block creation until one has been added.
    if (!transaction && !this.ensureVendors(vendors)) return null;
    const ref = this.dialog.open(EntryDialog, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: 'input',
      data: { transaction, settings, defaultDate, vendors } as EntryDialogData,
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (result === 'created') this.toast('Entry added');
    if (result === 'updated') this.toast('Entry updated');
    return result ?? null;
  }

  async openPayment(
    opts: { vendorPending?: Record<string, number>; vendorId?: string; payment?: Payment } = {},
  ): Promise<'created' | 'updated' | null> {
    const vendors = await firstValueFrom(this.api.getVendors());
    if (!opts.payment && !this.ensureVendors(vendors)) return null;
    const ref = this.dialog.open(PaymentDialog, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: 'input',
      data: { ...opts, vendors } as PaymentDialogData,
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (result === 'created') this.toast('Payment recorded');
    if (result === 'updated') this.toast('Payment updated');
    return result ?? null;
  }

  async openVendor(vendor?: Vendor): Promise<'created' | 'updated' | null> {
    const ref = this.dialog.open(VendorDialog, {
      width: '440px',
      maxWidth: '94vw',
      autoFocus: 'input',
      data: { vendor },
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (result === 'created') this.toast('Chai Wala added');
    if (result === 'updated') this.toast('Chai Wala updated');
    return result ?? null;
  }

  /** True if at least one vendor exists; otherwise tells the user how to add one. */
  private ensureVendors(vendors: Vendor[]): boolean {
    if (vendors.length > 0) return true;
    this.toast(
      this.auth.isAdmin()
        ? 'Add a chai wala first (Chai Walas page) before creating entries'
        : 'No chai walas yet — ask an admin to add one',
      '⚠',
    );
    return false;
  }

  async openChangePassword(): Promise<'changed' | null> {
    const ref = this.dialog.open(ChangePasswordDialog, {
      width: '440px',
      maxWidth: '94vw',
      autoFocus: 'input',
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (result === 'changed') this.toast('Password updated');
    return result ?? null;
  }

  async openContact(contact?: Contact): Promise<'created' | 'updated' | null> {
    const ref = this.dialog.open(ContactDialog, {
      width: '440px',
      maxWidth: '94vw',
      autoFocus: 'input',
      data: { contact },
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (result === 'created') this.toast('Contact added');
    if (result === 'updated') this.toast('Contact updated');
    return result ?? null;
  }

  async confirm(data: ConfirmData): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialog, {
      width: '420px',
      maxWidth: '92vw',
      data,
    });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }
}
