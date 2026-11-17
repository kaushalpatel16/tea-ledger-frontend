import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Payment, PaymentMethod, VendorSummary } from '../../models';
import { inr, fmtDate, fmtDateTime } from '../../util/format';

interface MethodMeta {
  label: string;
  emoji: string;
}

@Component({
  selector: 'tl-payments',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
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
  /** Per-chai wala billed / paid / pending. */
  vendors = signal<VendorSummary[]>([]);
  /** 'all' or a chai wala id — filters the payment history. */
  vendorFilter = signal<string>('all');

  /** Only real vendors (not the synthetic "Unassigned" bucket) can receive payments. */
  payableVendors = computed(() => this.vendors().filter((v) => v.vendorId !== 'unassigned'));

  filteredPayments = computed(() => {
    const v = this.vendorFilter();
    return v === 'all' ? this.payments() : this.payments().filter((p) => p.vendor?.id === v);
  });

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
        this.vendors.set(dashboard.vendors);
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

  private vendorPending(): Record<string, number> {
    return Object.fromEntries(this.vendors().map((v) => [v.vendorId, v.pending]));
  }

  /** Record a payment, optionally pre-selecting a chai wala (e.g. from the chai wala table). */
  recordPayment(vendorId?: string): void {
    const filtered = this.vendorFilter();
    this.ui.openPayment({
      vendorPending: this.vendorPending(),
      vendorId: vendorId ?? (filtered !== 'all' ? filtered : undefined),
    });
  }

  edit(p: Payment): void {
    this.ui.openPayment({ payment: p, vendorPending: this.vendorPending() });
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
