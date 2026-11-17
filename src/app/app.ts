import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ThemeService } from './services/theme.service';
import { LoaderService } from './services/loader.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatProgressBarModule, MatProgressSpinnerModule],
  styles: [
    `
      .tl-loader {
        position: fixed;
        inset: 0;
        z-index: 2000; /* above dialogs (cdk overlay ~1000) */
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, 0.28);
        backdrop-filter: blur(1px);
      }
      .tl-loader-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 2001;
      }
      .tl-loader-box {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px 22px;
        border-radius: 14px;
        background: var(--tl-surface, #fff);
        color: var(--tl-text, inherit);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        font-weight: 600;
      }
    `,
  ],
  template: `
    <router-outlet />
    @if (loader.visible()) {
      <mat-progress-bar class="tl-loader-bar" mode="indeterminate" />
      <div class="tl-loader" role="status" aria-live="polite" aria-label="Loading">
        <div class="tl-loader-box">
          <mat-progress-spinner mode="indeterminate" diameter="30" />
          <span>Loading…</span>
        </div>
      </div>
    }
  `,
})
export class App {
  private theme = inject(ThemeService);
  loader = inject(LoaderService);

  constructor() {
    // Apply the saved/system theme globally (covers the login page too).
    this.theme.init();
  }
}
