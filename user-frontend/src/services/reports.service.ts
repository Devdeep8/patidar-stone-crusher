// src/services/reports.service.ts
import { apiRequest } from "./api.service";
import type { ExpenseCategory } from "./expenses.service";

/** One month's P&L totals. */
export interface MonthlyReport {
  /** "YYYY-MM" business month */
  month: string;
  orders_count: number;
  total_sale: number;
  total_received: number;
  total_expense: number;
  /** Received − expense: real cash generated this month (udhaar excluded) */
  in_hand: number;
  /** This month's billed money not yet collected */
  pending: number;
  expenses_by_category: Partial<Record<ExpenseCategory, number>>;
}

/** One row of the month-by-month table. */
export interface MonthSummary {
  month: string;
  orders_count: number;
  total_sale: number;
  total_received: number;
  total_expense: number;
  in_hand: number;
  pending: number;
}

/** A customer with outstanding udhaar. */
export interface PendingCustomer {
  customer: {
    id: string;
    name: string;
    phone: string;
    preferred_language: "hi" | "en";
  };
  pending: number;
  orders_count: number;
  /** Ledger day (YYYY-MM-DD) of the customer's oldest still-pending order */
  oldest_pending_date: string;
  latest_order_date: string;
}

export interface PendingCustomersReport {
  items: PendingCustomer[];
  total_pending: number;
  oldest_pending_date: string | null;
}

export const reportsService = {
  /** GET /api/v1/reports/monthly?month=YYYY-MM — one month's totals */
  monthly: (month: string) => apiRequest<MonthlyReport>(`/api/v1/reports/monthly?month=${month}`),

  /** GET /api/v1/reports/months — last 12 months, newest first */
  months: () => apiRequest<{ months: MonthSummary[] }>("/api/v1/reports/months"),

  /** GET /api/v1/reports/pending-customers — udhaar index with ageing */
  pendingCustomers: () => apiRequest<PendingCustomersReport>("/api/v1/reports/pending-customers"),
};
