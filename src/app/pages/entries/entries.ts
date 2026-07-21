import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule, MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Transaction } from '../../models';
import { fmtDateTime, inr, toDateInput } from '../../util/format';

type RangeKey = 'all' | 'today' | 'week' | 'month' | 'custom';
type BeverageKey = 'all' | 'tea' | 'coffee';
type SortKey = 'datetime' | 'quantity' | 'total';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'tl-entries',
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatTooltipModule,
  ],
  templateUrl: './entries.html',
  styleUrl: './entries.css',
})
export class Entries {
  private api = inject(ApiService);
  private ui = inject(UiService);

  inr = inr;
  fmtDateTime = fmtDateTime;

  transactions = signal<Transaction[]>([]);
  loading = signal(true);

  // Filters
  search = signal('');
  range = signal<RangeKey>('all');
  fromDate = signal('');
  toDate = signal('');
  beverage = signal<BeverageKey>('all');

  // Sorting
  sortKey = signal<SortKey>('datetime');
  sortDir = signal<SortDir>('desc');

  // Pagination
  pageIndex = signal(0);
  pageSize = signal(10);

  constructor() {
    effect(() => {
      this.api.version();
      this.load();
    });
  }

  private load() {
    this.api.getTransactions().subscribe({
      next: (list) => {
        this.transactions.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ---- Filtering ----
  filtered = computed<Transaction[]>(() => {
    const q = this.search().trim().toLowerCase();
    const range = this.range();
    const bev = this.beverage();
    const bounds = this.rangeBounds(range);

    return this.transactions().filter((t) => {
      if (bev !== 'all' && t.beverageType !== bev) return false;

      if (bounds) {
        const d = new Date(t.datetime).getTime();
        if (bounds.from != null && d < bounds.from) return false;
        if (bounds.to != null && d > bounds.to) return false;
      }

      if (q) {
        const hay = `${t.notes} ${t.beverageType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  sorted = computed<Transaction[]>(() => {
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...this.filtered()].sort((a, b) => {
      let av: number;
      let bv: number;
      if (key === 'datetime') {
        av = new Date(a.datetime).getTime();
        bv = new Date(b.datetime).getTime();
      } else {
        av = a[key];
        bv = b[key];
      }
      return (av - bv) * dir;
    });
  });

  filteredCount = computed(() => this.sorted().length);

  paged = computed<Transaction[]>(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });

  private rangeBounds(range: RangeKey): { from: number | null; to: number | null } | null {
    if (range === 'all') return null;
    const now = new Date();

    if (range === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { from: start.getTime(), to: end.getTime() - 1 };
    }
    if (range === 'week') {
      const day = now.getDay(); // 0 Sun .. 6 Sat
      const diffToMonday = (day + 6) % 7;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { from: start.getTime(), to: end.getTime() - 1 };
    }
    if (range === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { from: start.getTime(), to: end.getTime() - 1 };
    }
    // custom
    const f = this.fromDate();
    const t = this.toDate();
    const from = f ? new Date(f + 'T00:00:00').getTime() : null;
    const to = t ? new Date(t + 'T23:59:59.999').getTime() : null;
    return { from, to };
  }

  // ---- Filter change handlers (reset to first page) ----
  private resetPage() {
    this.pageIndex.set(0);
  }
  onSearch(v: string) {
    this.search.set(v);
    this.resetPage();
  }
  setRange(e: MatButtonToggleChange) {
    this.range.set(e.value as RangeKey);
    if (e.value === 'custom' && !this.fromDate() && !this.toDate()) {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      this.fromDate.set(toDateInput(first));
      this.toDate.set(toDateInput(now));
    }
    this.resetPage();
  }
  setBeverage(e: MatButtonToggleChange) {
    this.beverage.set(e.value as BeverageKey);
    this.resetPage();
  }
  onFromDate(v: string) {
    this.fromDate.set(v);
    this.resetPage();
  }
  onToDate(v: string) {
    this.toDate.set(v);
    this.resetPage();
  }

  clearFilters() {
    this.search.set('');
    this.range.set('all');
    this.beverage.set('all');
    this.fromDate.set('');
    this.toDate.set('');
    this.resetPage();
  }

  // ---- Sorting ----
  sortBy(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'datetime' ? 'desc' : 'desc');
    }
  }
  sortArrow(key: SortKey): string {
    if (this.sortKey() !== key) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  // ---- Pagination ----
  onPage(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  // ---- Actions ----
  async edit(t: Transaction) {
    await this.ui.openEntry(t);
  }

  async remove(t: Transaction) {
    const ok = await this.ui.confirm({
      title: 'Delete entry',
      message: 'This will permanently remove this entry.',
      confirmText: 'Delete',
      danger: true,
    });
    if (ok) {
      this.api.deleteTransaction(t.id).subscribe(() => this.ui.toast('Entry deleted'));
    }
  }
}
