import { Injectable, signal } from '@angular/core';

const KEY = 'tl-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);

  init() {
    const saved = localStorage.getItem(KEY);
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.apply(saved ? saved === 'dark' : prefersDark);
  }

  toggle() {
    this.apply(!this.isDark());
  }

  private apply(dark: boolean) {
    this.isDark.set(dark);
    const html = document.documentElement;
    html.classList.toggle('tl-dark', dark);
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
  }
}
