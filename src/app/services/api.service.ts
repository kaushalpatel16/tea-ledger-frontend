import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  DashboardData,
  Payment,
  PaymentMethod,
  ReportData,
  Role,
  Settings,
  Transaction,
  User,
} from '../models';
import { environment } from '../../environments/environment';

const BASE = environment.apiBase;

export type TransactionInput = Partial<
  Pick<Transaction, 'datetime' | 'beverageType' | 'quantity' | 'unitPrice' | 'notes'>
>;

export interface PaymentInput {
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  notes?: string;
}

export interface UserInput {
  name: string;
  email: string;
  password?: string;
  role: Role;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  /** Bumped after any mutation so pages/components can react and refetch. */
  readonly version = signal(0);
  private bump() {
    this.version.update((v) => v + 1);
  }

  // ---- Settings ----
  getSettings(): Observable<Settings> {
    return this.http.get<Settings>(`${BASE}/settings`);
  }
  updateSettings(body: Partial<Settings>): Observable<Settings> {
    return this.http.put<Settings>(`${BASE}/settings`, body).pipe(tap(() => this.bump()));
  }

  // ---- Transactions ----
  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${BASE}/transactions`);
  }
  createTransaction(body: TransactionInput): Observable<Transaction> {
    return this.http.post<Transaction>(`${BASE}/transactions`, body).pipe(tap(() => this.bump()));
  }
  updateTransaction(id: string, body: TransactionInput): Observable<Transaction> {
    return this.http
      .put<Transaction>(`${BASE}/transactions/${id}`, body)
      .pipe(tap(() => this.bump()));
  }
  deleteTransaction(id: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(`${BASE}/transactions/${id}`)
      .pipe(tap(() => this.bump()));
  }

  // ---- Payments ----
  getPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${BASE}/payments`);
  }
  createPayment(body: PaymentInput): Observable<Payment> {
    return this.http.post<Payment>(`${BASE}/payments`, body).pipe(tap(() => this.bump()));
  }
  updatePayment(id: string, body: PaymentInput): Observable<Payment> {
    return this.http.put<Payment>(`${BASE}/payments/${id}`, body).pipe(tap(() => this.bump()));
  }
  deletePayment(id: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(`${BASE}/payments/${id}`)
      .pipe(tap(() => this.bump()));
  }

  // ---- Users (admin) ----
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${BASE}/users`);
  }
  createUser(body: UserInput): Observable<User> {
    return this.http.post<User>(`${BASE}/users`, body).pipe(tap(() => this.bump()));
  }
  updateUser(id: string, body: Partial<UserInput>): Observable<User> {
    return this.http.put<User>(`${BASE}/users/${id}`, body).pipe(tap(() => this.bump()));
  }
  deleteUser(id: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(`${BASE}/users/${id}`)
      .pipe(tap(() => this.bump()));
  }

  // ---- Analytics ----
  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${BASE}/dashboard`);
  }
  getReport(from: string, to: string): Observable<ReportData> {
    return this.http.get<ReportData>(`${BASE}/reports`, { params: { from, to } });
  }
}
