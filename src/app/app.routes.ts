import { Routes } from '@angular/router';
import { Shell } from './shell/shell';
import { authGuard, adminGuard } from './services/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · Tea Ledger',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · Tea Ledger',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'entries',
        title: 'Entries · Tea Ledger',
        loadComponent: () => import('./pages/entries/entries').then((m) => m.Entries),
      },
      {
        path: 'payments',
        title: 'Payments · Tea Ledger',
        loadComponent: () => import('./pages/payments/payments').then((m) => m.Payments),
      },
      {
        path: 'reports',
        title: 'Reports · Tea Ledger',
        loadComponent: () => import('./pages/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'calendar',
        title: 'Calendar · Tea Ledger',
        loadComponent: () => import('./pages/calendar/calendar').then((m) => m.CalendarPage),
      },
      {
        path: 'users',
        title: 'Users · Tea Ledger',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/users/users').then((m) => m.Users),
      },
      {
        path: 'settings',
        title: 'Settings · Tea Ledger',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
