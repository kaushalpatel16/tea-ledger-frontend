import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../services/api.service';
import { DashboardData } from '../../models';
import { fmtDate, fmtDateTime, inr } from '../../util/format';

@Component({
  selector: 'tl-dashboard',
  imports: [RouterLink, MatIconModule, MatButtonModule, MatProgressBarModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private api = inject(ApiService);

  data = signal<DashboardData | null>(null);
  loading = signal(true);
  inr = inr;
  fmtDate = fmtDate;
  fmtDateTime = fmtDateTime;

  constructor() {
    effect(() => {
      this.api.version(); // track mutations → refetch
      this.load();
    });
  }

  private load() {
    this.api.getDashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  cards = computed(() => {
    const d = this.data();
    if (!d) return [];
    const c = d.cards;
    return [
      { label: "Today's Tea", value: `${c.todayTea}`, sub: 'cups', icon: 'emoji_food_beverage', tint: 'tea' },
      { label: "Today's Coffee", value: `${c.todayCoffee}`, sub: 'cups', icon: 'coffee', tint: 'coffee' },
      { label: "Today's Amount", value: inr(c.todayAmount), sub: '', icon: 'today', tint: 'accent' },
      { label: "This Month", value: inr(c.monthAmount), sub: '', icon: 'calendar_month', tint: 'accent' },
      { label: 'Amount Paid', value: inr(c.amountPaid), sub: '', icon: 'check_circle', tint: 'paid' },
      { label: 'Pending', value: inr(c.pending), sub: '', icon: 'schedule', tint: 'pending' },
      { label: 'Total Orders', value: `${c.totalOrders}`, sub: 'entries', icon: 'receipt_long', tint: 'accent' },
      {
        label: 'Total Quantity',
        value: `${c.totalQuantity}`,
        sub: 'cups',
        icon: 'local_cafe',
        tint: 'accent',
        expandable: true,
      },
    ];
  });

  /** Tea/coffee split shown when the Total Quantity card is clicked. */
  showQtyBreakdown = signal(false);

  toggleQtyBreakdown() {
    this.showQtyBreakdown.update((v) => !v);
  }

  qtyBreakdown = computed(() => {
    const s = this.data()?.stats;
    const tea = s?.totalTeaQty ?? 0;
    const coffee = s?.totalCoffeeQty ?? 0;
    const total = tea + coffee;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return [
      { name: 'Tea', qty: tea, pct: pct(tea), tint: 'tea', icon: 'emoji_food_beverage' },
      { name: 'Coffee', qty: coffee, pct: pct(coffee), tint: 'coffee', icon: 'coffee' },
    ];
  });

  quickStats = computed(() => {
    const d = this.data();
    if (!d) return [];
    const s = d.stats;
    return [
      { label: 'Avg tea / day', value: `${s.avgTeaPerDay}`, icon: 'trending_up' },
      { label: 'Avg coffee / day', value: `${s.avgCoffeePerDay}`, icon: 'trending_up' },
      {
        label: 'Highest expense day',
        value: s.highestExpenseDay ? inr(s.highestExpenseDay.amount) : '—',
        icon: 'local_fire_department',
        hint: s.highestExpenseDay ? fmtDate(s.highestExpenseDay.date) : '',
      },
      { label: 'Current month spend', value: inr(s.currentMonthSpend), icon: 'account_balance_wallet' },
      { label: 'Last payment', value: s.lastPaymentDate ? fmtDate(s.lastPaymentDate) : '—', icon: 'event_available' },
      { label: 'Next est. payment', value: inr(s.nextEstimatedPayment), icon: 'request_quote' },
    ];
  });

  // ---- Charts ----
  private tea = '#22a06b';
  private coffee = '#b07a4a';

  pieData = computed<ChartConfiguration<'doughnut'>['data']>(() => {
    const p = this.data()?.charts.beveragePie ?? [];
    return {
      labels: p.map((x) => x.name),
      datasets: [
        {
          data: p.map((x) => x.value),
          backgroundColor: [this.tea, this.coffee],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  });

  pieOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
      tooltip: {
        callbacks: { label: (ctx) => `${ctx.label}: ${inr(Number(ctx.parsed))}` },
      },
    },
  };

  lineData = computed<ChartConfiguration<'line'>['data']>(() => {
    const daily = this.data()?.charts.daily ?? [];
    return {
      labels: daily.map((x) => {
        const d = new Date(x.date);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      }),
      datasets: [
        {
          data: daily.map((x) => x.amount),
          label: 'Daily expense',
          borderColor: this.tea,
          backgroundColor: 'rgba(34,160,107,0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
      ],
    };
  });

  lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => inr(Number(ctx.parsed.y)) } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
      y: { beginAtZero: true, ticks: { callback: (v) => '₹' + v } },
    },
  };

  barData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const monthly = this.data()?.charts.monthly ?? [];
    return {
      labels: monthly.map((x) => x.label),
      datasets: [
        {
          data: monthly.map((x) => x.amount),
          label: 'Monthly expense',
          backgroundColor: this.tea,
          borderRadius: 6,
          maxBarThickness: 34,
        },
      ],
    };
  });

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => inr(Number(ctx.parsed.y)) } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { callback: (v) => '₹' + v } },
    },
  };

  hasData = computed(() => (this.data()?.cards.totalOrders ?? 0) > 0);
}
