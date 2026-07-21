import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { ReportData } from '../../models';
import { fmtDate, fmtDateTime, inr, toDateInput } from '../../util/format';

type Mode = 'daily' | 'monthly' | 'custom';

@Component({
  selector: 'tl-reports',
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports {
  private api = inject(ApiService);
  private ui = inject(UiService);

  inr = inr;
  fmtDate = fmtDate;
  fmtDateTime = fmtDateTime;

  mode = signal<Mode>('monthly');
  from = signal(toDateInput(new Date()));
  to = signal(toDateInput(new Date()));
  month = signal(monthInput(new Date()));

  report = signal<ReportData | null>(null);
  loading = signal(false);

  rangeLabel = computed(() => {
    const r = this.report();
    if (!r) return '';
    return `${fmtDate(r.range.from)} – ${fmtDate(r.range.to)}`;
  });

  tiles = computed(() => {
    const r = this.report();
    if (!r) return [];
    return [
      { label: 'Total Tea', value: `${r.totalTea}`, sub: 'cups', tint: 'tea' },
      { label: 'Total Coffee', value: `${r.totalCoffee}`, sub: 'cups', tint: 'coffee' },
      { label: 'Total Quantity', value: `${r.totalQuantity}`, sub: 'cups', tint: 'accent' },
      { label: 'Tea Cost', value: inr(r.teaCost), sub: '', tint: 'tea' },
      { label: 'Coffee Cost', value: inr(r.coffeeCost), sub: '', tint: 'coffee' },
      { label: 'Grand Total', value: inr(r.grandTotal), sub: '', tint: 'accent' },
      { label: 'Paid Amount', value: inr(r.paidAmount), sub: '', tint: 'paid' },
      { label: 'Pending', value: inr(r.pending), sub: '', tint: 'pending' },
    ];
  });

  constructor() {
    effect(() => {
      // Track everything that affects the range + data.
      this.mode();
      this.from();
      this.to();
      this.month();
      this.api.version();
      this.load();
    });
  }

  private isoRange(): { from: string; to: string } | null {
    const start = (s: string) => {
      const d = new Date(s + 'T00:00:00');
      if (isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const end = (s: string) => {
      const d = new Date(s + 'T00:00:00');
      if (isNaN(d.getTime())) return null;
      d.setHours(23, 59, 59, 999);
      return d;
    };

    if (this.mode() === 'daily') {
      const f = start(this.from());
      const t = end(this.from());
      if (!f || !t) return null;
      return { from: f.toISOString(), to: t.toISOString() };
    }
    if (this.mode() === 'monthly') {
      const [y, m] = this.month().split('-').map(Number);
      if (!y || !m) return null;
      const f = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const t = new Date(y, m, 0, 23, 59, 59, 999);
      return { from: f.toISOString(), to: t.toISOString() };
    }
    const f = start(this.from());
    const t = end(this.to());
    if (!f || !t) return null;
    return { from: f.toISOString(), to: t.toISOString() };
  }

  private load() {
    const range = this.isoRange();
    if (!range) return;
    this.loading.set(true);
    this.api.getReport(range.from, range.to).subscribe({
      next: (r) => {
        this.report.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ---- Exports ----
  private baseName() {
    return 'tea-ledger-report';
  }

  private rows() {
    const r = this.report();
    return (r?.transactions ?? []).map((t) => ({
      Date: fmtDateTime(t.datetime),
      Drink: t.beverageType,
      Quantity: t.quantity,
      'Unit Price': t.unitPrice,
      Total: t.total,
      Notes: t.notes || '',
    }));
  }

  private summaryRows() {
    const r = this.report();
    if (!r) return [];
    return [
      ['Total Tea (cups)', r.totalTea],
      ['Total Coffee (cups)', r.totalCoffee],
      ['Total Quantity', r.totalQuantity],
      ['Tea Cost', r.teaCost],
      ['Coffee Cost', r.coffeeCost],
      ['Grand Total', r.grandTotal],
      ['Paid Amount', r.paidAmount],
      ['Pending', r.pending],
    ];
  }

  exportCsv() {
    const rows = this.rows();
    if (!this.report()) return;
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = Object.keys(rows[0] ?? {
      Date: '', Drink: '', Quantity: '', 'Unit Price': '', Total: '', Notes: '',
    });
    const lines: string[] = [];
    lines.push(`Tea Mitra Report,${this.rangeLabel()}`);
    lines.push('');
    lines.push('Summary');
    for (const [k, v] of this.summaryRows()) lines.push(`${esc(k)},${esc(v)}`);
    lines.push('');
    lines.push('Transactions');
    lines.push(headers.map(esc).join(','));
    for (const row of rows) lines.push(headers.map((h) => esc((row as any)[h])).join(','));
    this.download(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), `${this.baseName()}.csv`);
    this.ui.toast('CSV exported');
  }

  exportExcel() {
    if (!this.report()) return;
    const wb = XLSX.utils.book_new();
    const summaryWs = XLSX.utils.aoa_to_sheet([
      ['Tea Mitra Report', this.rangeLabel()],
      [],
      ...this.summaryRows(),
    ]);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    const txWs = XLSX.utils.json_to_sheet(this.rows());
    XLSX.utils.book_append_sheet(wb, txWs, 'Transactions');
    XLSX.writeFile(wb, `${this.baseName()}.xlsx`);
    this.ui.toast('Excel exported');
  }

  exportPdf() {
    const r = this.report();
    if (!r) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Tea Mitra Report', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(this.rangeLabel(), 14, 25);
    doc.setTextColor(30);

    autoTable(doc, {
      startY: 32,
      head: [['Summary', 'Value']],
      body: this.summaryRows().map(([k, v]) => [
        String(k),
        typeof v === 'number' && String(k).match(/Cost|Total|Paid|Pending/) ? inr(v as number) : String(v),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [34, 160, 107] },
      styles: { fontSize: 9 },
    });

    const rows = this.rows();
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['Date', 'Drink', 'Qty', 'Unit', 'Total', 'Notes']],
      body: rows.map((row) => [
        row.Date, row.Drink, row.Quantity, row['Unit Price'], row.Total, row.Notes,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [34, 160, 107] },
      styles: { fontSize: 8 },
    });

    doc.save(`${this.baseName()}.pdf`);
    this.ui.toast('PDF exported');
  }

  print() {
    window.print();
  }

  private download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function monthInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
