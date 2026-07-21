import { Component, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Payment, PaymentMethod } from '../../models';
import { inr, fmtDate, fmtDateTime } from '../../util/format';

interface MethodMeta {
  label: string;
  emoji: string;
}

@Component({
  selector: 'tl-payments',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './payments.html',
  styleUrl: './payments.css',
})
export class Payments {
  private api = inject(ApiService);
  private ui = inject(UiService);

  payments = signal<Payment[]>([]);
  pending = signal(0);
  paid = signal(0);
  lastPaymentDate = signal<string | null>(null);
  loading = signal(true);

  readonly inr = inr;
  readonly fmtDate = fmtDate;
  readonly fmtDateTime = fmtDateTime;

  private readonly methodMeta: Record<PaymentMethod, MethodMeta> = {
    cash: { label: 'Cash', emoji: '💵' },
    upi: { label: 'UPI', emoji: '📱' },
    bank: { label: 'Bank', emoji: '🏦' },
  };

  constructor() {
    effect(() => {
      this.api.version();
      this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      payments: this.api.getPayments(),
      dashboard: this.api.getDashboard(),
    }).subscribe({
      next: ({ payments, dashboard }) => {
        this.payments.set(payments);
        this.pending.set(dashboard.cards.pending);
        this.paid.set(dashboard.cards.amountPaid);
        this.lastPaymentDate.set(dashboard.stats.lastPaymentDate);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  grandTotal(): number {
    return this.pending() + this.paid();
  }

  method(m: PaymentMethod): MethodMeta {
    return this.methodMeta[m] ?? { label: m, emoji: '💰' };
  }

  recordPayment(): void {
    this.ui.openPayment(this.pending());
  }

  edit(p: Payment): void {
    this.ui.openPayment(undefined, p);
  }

  async remove(p: Payment): Promise<void> {
    const ok = await this.ui.confirm({
      title: 'Delete payment',
      message: 'This will remove the payment record and increase the pending balance.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.api.deletePayment(p.id).subscribe(() => this.ui.toast('Payment deleted'));
  }
}
