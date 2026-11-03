// src/services/oldPayments.service.ts
import { apiRequest } from "./api.service";

export interface OldPayment {
  id: string;
  /** Business-local calendar day the money arrived, "YYYY-MM-DD" */
  payment_date: string;
  payer_name: string;
  amount: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayOldPayments {
  date: string;
  total: number;
  old_payments: OldPayment[];
}

export interface CreateOldPaymentPayload {
  payer_name: string;
  amount: number;
  note?: string;
  /** Optional — backend defaults to today (business timezone) */
  date?: string;
}

export const oldPaymentsService = {
  /** GET /api/v1/old-payments?date=YYYY-MM-DD — one day's entries + total */
  listByDay: (date: string) => apiRequest<DayOldPayments>(`/api/v1/old-payments?date=${date}`),

  /** POST /api/v1/old-payments — record one old-payment entry */
  create: (payload: CreateOldPaymentPayload) =>
    apiRequest<OldPayment>("/api/v1/old-payments", { method: "POST", body: payload }),

  /** DELETE /api/v1/old-payments/:id — remove a mistyped entry */
  remove: (id: string) => apiRequest<{ id: string }>(`/api/v1/old-payments/${id}`, { method: "DELETE" }),
};
