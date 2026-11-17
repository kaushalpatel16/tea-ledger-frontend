import { Component, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Vendor } from '../../models';
import { fmtDate, inr } from '../../util/format';

@Component({
  selector: 'tl-vendors',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './vendors.html',
  styleUrl: './vendors.css',
})
export class Vendors {
  private api = inject(ApiService);
  private ui = inject(UiService);

  readonly fmtDate = fmtDate;
  readonly inr = inr;

  vendors = signal<Vendor[]>([]);
  loading = signal(true);

  constructor() {
    effect(() => {
      this.api.version();
      this.load();
    });
  }

  private load(): void {
    this.api.getVendors().subscribe({
      next: (list) => {
        this.vendors.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  add(): void {
    this.ui.openVendor();
  }

  edit(v: Vendor): void {
    this.ui.openVendor(v);
  }

  async remove(v: Vendor): Promise<void> {
    const ok = await this.ui.confirm({
      title: 'Delete chai wala',
      message: `Remove ${v.name}? Chai Walas that already have entries or payments cannot be deleted.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteVendor(v.id).subscribe({
      next: () => this.ui.toast('Chai Wala deleted'),
      error: (e) => this.ui.toast(e?.error?.error || 'Could not delete chai wala', '⚠'),
    });
  }
}
