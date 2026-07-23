import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ThemeService } from '../services/theme.service';
import { UiService } from '../services/ui.service';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { Contact } from '../models';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  admin?: boolean;
}

@Component({
  selector: 'tl-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private theme = inject(ThemeService);
  private ui = inject(UiService);
  private auth = inject(AuthService);
  private api = inject(ApiService);

  contacts = signal<Contact[]>([]);
  isDark = this.theme.isDark;
  user = this.auth.currentUser;
  isAdmin = this.auth.isAdmin;
  canChangePassword = this.auth.canChangeOwnPassword;

  private nav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/entries', label: 'Entries', icon: 'receipt_long' },
    { path: '/payments', label: 'Payments', icon: 'payments' },
    { path: '/reports', label: 'Reports', icon: 'bar_chart' },
    { path: '/calendar', label: 'Calendar', icon: 'calendar_month' },
    { path: '/users', label: 'Users', icon: 'group', admin: true },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  visibleNav = computed(() => this.nav.filter((i) => !i.admin || this.isAdmin()));

  initials = computed(() => {
    const name = this.user()?.name?.trim() || '';
    if (!name) return '?';
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  constructor() {
    // Keep the quick-contact menu in sync with Settings changes.
    effect(() => {
      this.api.version();
      this.api.getContacts().subscribe({
        next: (list) => this.contacts.set(list),
        error: () => this.contacts.set([]),
      });
    });
  }

  toggleTheme() {
    this.theme.toggle();
  }

  addEntry() {
    this.ui.openEntry();
  }

  changePassword() {
    this.ui.openChangePassword();
  }

  logout() {
    this.auth.logout();
  }
}
