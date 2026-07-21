import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Transaction } from '../../models';
import { inr, fmtDate } from '../../util/format';

interface DayCell {
  date: Date | null;
  key: string;
  day: number;
  total: number;
  count: number;
  isToday: boolean;
}

function keyOf(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'tl-calendar',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class CalendarPage {
  private api = inject(ApiService);
  private ui = inject(UiService);

  inr = inr;
  fmtDate = fmtDate;

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  transactions = signal<Transaction[]>([]);
  cursor = signal(new Date());
  selected = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.api.version();
      this.load();
    });
  }

  private load() {
    this.api.getTransactions().subscribe((list) => this.transactions.set(list));
  }

  /** Map of dateKey -> transactions for that day. */
  private byDay = computed(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of this.transactions()) {
      const k = keyOf(new Date(t.datetime));
      const arr = map.get(k);
      if (arr) arr.push(t);
      else map.set(k, [t]);
    }
    return map;
  });

  monthLabel = computed(() =>
    this.cursor().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  );

  cells = computed<DayCell[]>(() => {
    const c = this.cursor();
    const year = c.getFullYear();
    const month = c.getMonth();
    const todayKey = keyOf(new Date());
    const byDay = this.byDay();

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const result: DayCell[] = [];
    // Leading blanks
    for (let i = 0; i < firstWeekday; i++) {
      result.push({ date: null, key: `blank-lead-${i}`, day: 0, total: 0, count: 0, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = keyOf(date);
      const txns = byDay.get(key) ?? [];
      const total = txns.reduce((s, t) => s + (t.total || 0), 0);
      result.push({
        date,
        key,
        day: d,
        total,
        count: txns.length,
        isToday: key === todayKey,
      });
    }
    // Trailing blanks to complete the last week
    while (result.length % 7 !== 0) {
      result.push({
        date: null,
        key: `blank-trail-${result.length}`,
        day: 0,
        total: 0,
        count: 0,
        isToday: false,
      });
    }
    return result;
  });

  selectedEntries = computed<Transaction[]>(() => {
    const k = this.selected();
    if (!k) return [];
    return [...(this.byDay().get(k) ?? [])].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
    );
  });

  selectedTotal = computed(() =>
    this.selectedEntries().reduce((s, t) => s + (t.total || 0), 0),
  );

  selectedLabel = computed(() => {
    const k = this.selected();
    return k ? fmtDate(k) : '';
  });

  time(dt: string): string {
    return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  prevMonth() {
    const c = this.cursor();
    this.cursor.set(new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }

  nextMonth() {
    const c = this.cursor();
    this.cursor.set(new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }

  goToday() {
    const now = new Date();
    this.cursor.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.selected.set(keyOf(now));
  }

  select(cell: DayCell) {
    if (!cell.date) return;
    this.selected.set(this.selected() === cell.key ? null : cell.key);
  }

  isSelected(cell: DayCell): boolean {
    return !!cell.date && this.selected() === cell.key;
  }

  edit(tx: Transaction) {
    this.ui.openEntry(tx);
  }

  addForSelected() {
    this.ui.openEntry();
  }
}
