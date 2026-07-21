import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { EntryDialog, EntryDialogData } from '../dialogs/entry-dialog';
import { PaymentDialog } from '../dialogs/payment-dialog';
import { ConfirmDialog, ConfirmData } from '../dialogs/confirm-dialog';
import { ChangePasswordDialog } from '../dialogs/change-password-dialog';
import { Payment, Transaction } from '../models';

@Injectable({ providedIn: 'root' })
export class UiService {
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private api = inject(ApiService);

  toast(message: string, icon = '✓') {
    this.snack.open(`${icon}  ${message}`, '', {
      duration: 2600,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: 'tl-snack',
    });
  }

  /** Open the Add/Edit entry dialog. Loads current settings for price prefill. */
  async openEntry(transaction?: Transaction): Promise<'created' | 'updated' | null> {
    const settings = await firstValueFrom(this.api.getSettings());
    const ref = this.dialog.open(EntryDialog, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: 'input',
      data: { transaction, settings } as EntryDialogData,
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (result === 'created') this.toast('Entry added');
    if (result === 'updated') this.toast('Entry updated');
    return result ?? null;
  }

  async openPayment(pending?: number, payment?: Payment): Promise<'created' | 'updated' | null> {
    const ref = this.dialog.open(PaymentDialog, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: 'input',
      data: { pending, payment },
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (result === 'created') this.toast('Payment recorded');
    if (result === 'updated') this.toast('Payment updated');
    return result ?? null;
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

  async confirm(data: ConfirmData): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialog, {
      width: '420px',
      maxWidth: '92vw',
      data,
    });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }
}
