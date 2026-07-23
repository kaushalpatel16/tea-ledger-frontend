import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { UiService } from '../../services/ui.service';
import { Contact } from '../../models';
import { fmtDateTime } from '../../util/format';

@Component({
  selector: 'tl-settings',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class SettingsPage {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  theme = inject(ThemeService);
  private ui = inject(UiService);

  fmtDateTime = fmtDateTime;
  updatedAt = signal<string | null>(null);
  saving = signal(false);
  contacts = signal<Contact[]>([]);

  form = this.fb.nonNullable.group({
    teaPrice: [10, [Validators.required, Validators.min(0)]],
    coffeePrice: [15, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.api.getSettings().subscribe((s) => {
      this.form.patchValue({ teaPrice: s.teaPrice, coffeePrice: s.coffeePrice });
      this.form.markAsPristine();
      this.updatedAt.set(s.updatedAt);
    });

    // Contacts list, refreshed whenever one is added/edited/deleted.
    effect(() => {
      this.api.version();
      this.api.getContacts().subscribe({
        next: (list) => this.contacts.set(list),
        error: () => this.contacts.set([]),
      });
    });
  }

  addContact() {
    this.ui.openContact();
  }

  editContact(c: Contact) {
    this.ui.openContact(c);
  }

  async removeContact(c: Contact) {
    const ok = await this.ui.confirm({
      title: 'Delete contact',
      message: `Remove ${c.name} from the contact list?`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteContact(c.id).subscribe({
      next: () => this.ui.toast('Contact deleted'),
      error: (e) => this.ui.toast(e?.error?.error || 'Could not delete contact'),
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.api
      .updateSettings({ teaPrice: Number(v.teaPrice), coffeePrice: Number(v.coffeePrice) })
      .subscribe({
        next: (s) => {
          this.updatedAt.set(s.updatedAt);
          this.form.markAsPristine();
          this.saving.set(false);
          this.ui.toast('Prices updated');
        },
        error: () => this.saving.set(false),
      });
  }

  toggleTheme() {
    this.theme.toggle();
  }
}
