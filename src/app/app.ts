import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from './services/theme.service';
import { UiService } from './services/ui.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private theme = inject(ThemeService);
  private ui = inject(UiService);

  isDark = this.theme.isDark;

  nav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/entries', label: 'Entries', icon: 'receipt_long' },
    { path: '/payments', label: 'Payments', icon: 'payments' },
    { path: '/reports', label: 'Reports', icon: 'bar_chart' },
    { path: '/calendar', label: 'Calendar', icon: 'calendar_month' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  constructor() {
    this.theme.init();
  }

  toggleTheme() {
    this.theme.toggle();
  }

  addEntry() {
    this.ui.openEntry();
  }
}
