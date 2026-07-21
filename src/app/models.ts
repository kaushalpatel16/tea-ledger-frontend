export type Beverage = 'tea' | 'coffee';
export type PaymentMethod = 'cash' | 'upi' | 'bank';

export interface Transaction {
  id: string;
  datetime: string;
  beverageType: Beverage;
  quantity: number;
  unitPrice: number;
  total: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  notes: string;
  createdAt: string;
}

export interface Settings {
  teaPrice: number;
  coffeePrice: number;
  updatedAt: string | null;
}

export interface DashboardCards {
  todayTea: number;
  todayCoffee: number;
  todayAmount: number;
  monthAmount: number;
  amountPaid: number;
  pending: number;
  totalOrders: number;
}

export interface DashboardStats {
  avgTeaPerDay: number;
  avgCoffeePerDay: number;
  highestExpenseDay: { date: string; amount: number } | null;
  currentMonthSpend: number;
  lastPaymentDate: string | null;
  nextEstimatedPayment: number;
  activeDays: number;
}

export interface DashboardData {
  cards: DashboardCards;
  stats: DashboardStats;
  charts: {
    beveragePie: { name: string; value: number }[];
    daily: { date: string; amount: number }[];
    monthly: { month: string; label: string; amount: number }[];
  };
  recent: Transaction[];
}

export interface ReportData {
  range: { from: string; to: string };
  totalTea: number;
  totalCoffee: number;
  totalQuantity: number;
  teaCost: number;
  coffeeCost: number;
  grandTotal: number;
  orders: number;
  paidAmount: number;
  pending: number;
  transactions: Transaction[];
  payments: Payment[];
}
