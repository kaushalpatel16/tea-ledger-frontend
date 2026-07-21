import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { UiService } from '../../services/ui.service';
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
