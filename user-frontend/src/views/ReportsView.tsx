"use client";

// src/views/ReportsView.tsx
// Reports dashboard: month P&L (sale, received, expense, in hand, pending),
// a month-by-month table for the last year, and a separate udhaar tab with
// every customer that owes money and how long the oldest due has been open.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "@/lib/i18n";
import {
  currentDay,
  currentMonth,
  formatINR,
  monthLabel,
  shiftMonth,
} from "@/lib/format";
import {
  reportsService,
  type MonthlyReport,
  type MonthSummary,
  type PendingCustomersReport,
} from "@/services/reports.service";

type Tab = "month" | "pending";

// Series palette — validated (CVD-safe, ordered) orange/aqua/blue. Sale keeps
// the brand orange; received reads "good"; expense is a cool contrast. Pending
// is NOT a bar series — it is money not in hand, shown as red numbers in the
// table and in its own udhaar tab instead.
const SERIES = [
  { key: "total_sale", color: "#eb6834" },
  { key: "total_received", color: "#1baf7a" },
  { key: "total_expense", color: "#2a78d6" },
] as const;

// In-hand trend line (received − expense per month): the "where do we stand"
// curve. Blue — distinct from every bar series.
const IN_HAND_COLOR = "#6250d6";

/** Whole days between two "YYYY-MM-DD" dates (b − a). */
const daysBetween = (a: string, b: string): number => {
  const start = Date.parse(`${a}T00:00:00.000Z`);
  const end = Date.parse(`${b}T00:00:00.000Z`);
  return Math.round((end - start) / 86_400_000);
};

/** "2026-09" -> "Sep" — compact tick label so 12 months fit a phone. */
const shortMonth = (month: string): string =>
  new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00.000Z`)
  );

/** Compact axis money: ₹4.5L / ₹45k — full formatINR ticks don't fit a phone chart. */
const compactINR = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 100_000_00) return `₹${(v / 100_000_00).toFixed(1)}Cr`;
  if (abs >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${Math.round(v / 1_000)}k`;
  return `₹${v}`;
};

/** Phone-width flag — chart axes use compact ₹ ticks and smaller type there. */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

/** Compact tooltip: month + one ₹ line per series, in text ink. */
function MonthTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
}) {
  const { t, lang } = useLanguage();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border-2 border-stone-200 bg-white p-3 shadow-lg">
      <p className="text-base font-bold text-stone-900">{monthLabel(String(label), lang)}</p>
      {SERIES.map(({ key, color }) => {
        const item = payload.find((p) => p.dataKey === key);
        if (!item) return null;
        return (
          <p key={key} className="flex items-center gap-2 text-base text-stone-700">
            <span className="inline-block size-3 rounded-sm" style={{ backgroundColor: color }} />
            {key === "total_sale"
              ? t("reports.totalSale")
              : key === "total_received"
                ? t("reports.received")
                : t("reports.expense")}
            <span className="ml-auto pl-3 font-bold text-stone-900">{formatINR(item.value)}</span>
          </p>
        );
      })}
    </div>
  );
}

/** Line-chart tooltip: month + the in-hand number. */
function InHandTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  const { t, lang } = useLanguage();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border-2 border-stone-200 bg-white p-3 shadow-lg">
      <p className="text-base font-bold text-stone-900">{monthLabel(String(label), lang)}</p>
      <p className="text-base text-stone-700">
        {t("reports.inHandShort")}
        <span
          className={`ml-3 font-bold ${
            (payload[0]?.value ?? 0) >= 0 ? "text-green-700" : "text-red-600"
          }`}
        >
          {formatINR(payload[0]?.value ?? 0)}
        </span>
      </p>
    </div>
  );
}

export function ReportsView() {
  const { t, lang } = useLanguage();
  const isMobile = useIsMobile();

  const [tab, setTab] = useState<Tab>("month");

  // --- Month tab -----------------------------------------------------------
  // The browsed month lives in component state (the dashboard keeps the day
  // in the URL; a month is coarse enough that state is fine).
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [months, setMonths] = useState<MonthSummary[] | null>(null);
  const [monthLoading, setMonthLoading] = useState(true);
  const [monthFailed, setMonthFailed] = useState(false);

  const loadMonth = useCallback(async (target: string) => {
    setMonthLoading(true);
    setMonthFailed(false);
    try {
      // Month detail + the 12-month table together — both shape one screen
      const [monthlyResult, monthsResult] = await Promise.all([
        reportsService.monthly(target),
        reportsService.months(),
      ]);
      setReport(monthlyResult);
      setMonths(monthsResult.months);
    } catch {
      setReport(null);
      setMonths(null);
      setMonthFailed(true);
    } finally {
      setMonthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonth(month);
  }, [month, loadMonth]);

  const isCurrentMonth = month === currentMonth();

  // --- Pending (udhaar) tab -------------------------------------------------
  const [pending, setPending] = useState<PendingCustomersReport | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingFailed, setPendingFailed] = useState(false);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    setPendingFailed(false);
    try {
      setPending(await reportsService.pendingCustomers());
    } catch {
      setPending(null);
      setPendingFailed(true);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const today = currentDay();

  // Udhaar data loads on the tab tap (not in an effect) — first open or retry
  const openPendingTab = () => {
    setTab("pending");
    if (!pending && !pendingLoading) loadPending();
  };

  const cards = useMemo(() => {
    if (!report) return [];
    return [
      { label: t("reports.totalSale"), value: formatINR(report.total_sale), tone: "text-stone-900" },
      { label: t("reports.received"), value: formatINR(report.total_received), tone: "text-green-700" },
      { label: t("reports.expense"), value: formatINR(report.total_expense), tone: "text-stone-900" },
      { label: t("reports.pending"), value: formatINR(report.pending), tone: "text-red-600" },
    ];
  }, [report, t]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 lg:max-w-6xl">
      {/* Tab switch: month report vs udhaar index */}
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border-2 border-stone-200 bg-white p-2">
        <button
          type="button"
          onClick={() => setTab("month")}
          className={`min-h-12 rounded-lg text-lg font-bold ${
            tab === "month"
              ? "bg-orange-600 text-white"
              : "text-stone-700 hover:bg-stone-100 active:bg-stone-200"
          }`}
        >
          {t("reports.tabMonth")}
        </button>
        <button
          type="button"
          onClick={openPendingTab}
          className={`min-h-12 rounded-lg text-lg font-bold ${
            tab === "pending"
              ? "bg-orange-600 text-white"
              : "text-stone-700 hover:bg-stone-100 active:bg-stone-200"
          }`}
        >
          {t("reports.tabPending")}
        </button>
      </div>

      {tab === "month" ? (
        <>
          {/* Month stepper — same shape as the dashboard's day stepper */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, -1))}
              aria-label="Previous month"
              className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 border-stone-300 bg-white text-stone-700 hover:bg-stone-50 active:bg-stone-100"
            >
              <ChevronLeft className="size-8" />
            </button>
            <div className="flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-stone-200 bg-white px-2 text-xl font-extrabold text-stone-900">
              {monthLabel(month, lang)}
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={() => setMonth(currentMonth())}
                  className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border-2 border-orange-600 px-2 text-base font-bold text-orange-700 hover:bg-orange-50 active:bg-orange-100"
                >
                  <CalendarClock className="size-5" />
                  {t("reports.thisMonth")}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={isCurrentMonth}
              aria-label="Next month"
              className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 border-stone-300 bg-white text-stone-700 hover:bg-stone-50 active:bg-stone-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-300 disabled:hover:bg-white"
            >
              <ChevronRight className="size-8" />
            </button>
          </div>

          {monthLoading ? (
            <div className="mt-4 flex min-h-40 items-center justify-center rounded-xl border-2 border-stone-200 bg-white">
              <Loader2 className="size-10 animate-spin text-stone-400" />
            </div>
          ) : monthFailed || !report ? (
            <div className="mt-4 rounded-xl border-2 border-stone-200 bg-white p-6 text-center">
              <p className="text-lg font-semibold text-stone-700">{t("reports.loadFailed")}</p>
              <button
                type="button"
                onClick={() => loadMonth(month)}
                className="mt-4 min-h-12 rounded-xl border-2 border-orange-600 px-6 text-lg font-bold text-orange-700 hover:bg-orange-50"
              >
                {t("common.retry")}
              </button>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {cards.map((card) => (
                  <div key={card.label} className="min-w-0 rounded-xl border-2 border-stone-200 bg-white p-4">
                    <p className="text-base font-semibold text-stone-500">{card.label}</p>
                    <p className={`mt-1 wrap-break-word text-2xl font-extrabold tracking-tight sm:text-3xl ${card.tone}`}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* In hand — the number that says where we actually stand */}
              <div className="mt-3 rounded-xl border-2 border-stone-200 bg-white p-4">
                <p className="text-base font-semibold text-stone-500">{t("reports.inHand")}</p>
                <p
                  className={`mt-1 wrap-break-word text-3xl font-extrabold tracking-tight sm:text-4xl ${
                    report.in_hand >= 0 ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {formatINR(report.in_hand)}
                </p>
                <p className="mt-1 text-base font-semibold text-stone-500">
                  {t("reports.inHandBreakdown", {
                    received: formatINR(report.total_received),
                    expense: formatINR(report.total_expense),
                  })}
                </p>
                <p className="mt-1 text-base text-stone-500">
                  {t("reports.ordersCount", { count: String(report.orders_count) })}
                </p>
              </div>

              {/* Expense breakdown by category — only categories with entries */}
              {Object.keys(report.expenses_by_category).length > 0 ? (
                <div className="mt-3 rounded-xl border-2 border-stone-200 bg-white p-4">
                  <p className="text-base font-semibold text-stone-500">
                    {t("reports.expenseBreakdown")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(report.expenses_by_category)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, total]) => (
                        <li key={category} className="flex items-center justify-between text-lg">
                          <span className="text-stone-700">{t(`expenseCategory.${category}`)}</span>
                          <span className="font-bold text-stone-900">{formatINR(total)}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}

              {/* 12-month picture — sale vs received vs expense bars on top,
                  the in-hand (received − expense) trend line below. Tap a
                  month row in the table for its detail. */}
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <div>
                  <h2 className="mb-2 text-xl font-bold text-stone-800">{t("reports.yearChart")}</h2>
                  <div className="rounded-xl border-2 border-stone-200 bg-white p-2 pt-3">
                    <div className="h-64 w-full sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...(months ?? [])].reverse()} barCategoryGap="25%">
                          <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="month"
                            tickFormatter={shortMonth}
                            tick={{ fill: "#78716c", fontSize: isMobile ? 10 : 12 }}
                            axisLine={{ stroke: "#e7e5e4" }}
                            tickLine={false}
                            interval="preserveStartEnd"
                            minTickGap={4}
                          />
                          <YAxis
                            tickFormatter={isMobile ? compactINR : formatINR}
                            tick={{ fill: "#78716c", fontSize: isMobile ? 10 : 12 }}
                            axisLine={false}
                            tickLine={false}
                            width={isMobile ? 44 : 72}
                          />
                          <Tooltip content={<MonthTooltip />} cursor={{ fill: "#fafaf9" }} />
                          <Legend
                            formatter={(value: string) => (
                              <span className="text-base text-stone-700">
                                {value === "total_sale"
                                  ? t("reports.totalSale")
                                  : value === "total_received"
                                    ? t("reports.received")
                                    : t("reports.expense")}
                              </span>
                            )}
                          />
                          {SERIES.map(({ key, color }) => (
                            <Bar
                              key={key}
                              dataKey={key}
                              fill={color}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={20}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* In-hand trend — are we making or burning money each month */}
                <div>
                  <h2 className="mb-2 text-xl font-bold text-stone-800">{t("reports.inHandTrend")}</h2>
                  <div className="rounded-xl border-2 border-stone-200 bg-white p-2 pt-3">
                    <div className="h-64 w-full sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...(months ?? [])].reverse()}>
                          <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="month"
                            tickFormatter={shortMonth}
                            tick={{ fill: "#78716c", fontSize: isMobile ? 10 : 12 }}
                            axisLine={{ stroke: "#e7e5e4" }}
                            tickLine={false}
                            interval="preserveStartEnd"
                            minTickGap={4}
                          />
                          <YAxis
                            tickFormatter={isMobile ? compactINR : formatINR}
                            tick={{ fill: "#78716c", fontSize: isMobile ? 10 : 12 }}
                            axisLine={false}
                            tickLine={false}
                            width={isMobile ? 44 : 72}
                          />
                          <Tooltip content={<InHandTooltip />} cursor={{ stroke: "#d6d3d1" }} />
                          <Line
                            type="monotone"
                            dataKey="in_hand"
                            stroke={IN_HAND_COLOR}
                            strokeWidth={2}
                            dot={{ r: 3, fill: IN_HAND_COLOR, strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* Month-by-month table — a row tap jumps to that month */}
              <div className="mt-6">
                <h2 className="mb-2 text-xl font-bold text-stone-800">{t("reports.monthWise")}</h2>
                <div className="overflow-x-auto rounded-xl border-2 border-stone-200 bg-white">
                  <table className="w-full min-w-[36rem] border-collapse text-left">
                    <thead>
                      <tr className="border-b-2 border-stone-200 text-sm font-semibold uppercase tracking-wide text-stone-500">
                        <th className="px-3 py-2">{t("reports.month")}</th>
                        <th className="px-3 py-2 text-right">{t("reports.colOrders")}</th>
                        <th className="px-3 py-2 text-right">{t("reports.totalSale")}</th>
                        <th className="px-3 py-2 text-right">{t("reports.received")}</th>
                        <th className="px-3 py-2 text-right">{t("reports.expense")}</th>
                        <th className="px-3 py-2 text-right">{t("reports.inHandShort")}</th>
                        <th className="px-3 py-2 text-right">{t("reports.pending")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(months ?? []).map((row) => (
                        <tr
                          key={row.month}
                          onClick={() => setMonth(row.month)}
                          className={`cursor-pointer border-b border-stone-100 last:border-b-0 hover:bg-orange-50 active:bg-orange-100 ${
                            row.month === month ? "bg-orange-50" : ""
                          }`}
                        >
                          <td className="px-3 py-2 text-base font-semibold text-stone-900">
                            {monthLabel(row.month, lang)}
                          </td>
                          <td className="px-3 py-2 text-right text-base text-stone-600">
                            {row.orders_count}
                          </td>
                          <td className="px-3 py-2 text-right text-base font-semibold text-stone-900">
                            {formatINR(row.total_sale)}
                          </td>
                          <td className="px-3 py-2 text-right text-base text-green-700">
                            {formatINR(row.total_received)}
                          </td>
                          <td className="px-3 py-2 text-right text-base text-stone-900">
                            {formatINR(row.total_expense)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right text-base font-bold ${
                              row.in_hand >= 0 ? "text-green-700" : "text-red-600"
                            }`}
                          >
                            {formatINR(row.in_hand)}
                          </td>
                          <td className="px-3 py-2 text-right text-base font-semibold text-red-600">
                            {row.pending > 0 ? formatINR(row.pending) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      ) : pendingLoading ? (
        <div className="mt-4 flex min-h-40 items-center justify-center rounded-xl border-2 border-stone-200 bg-white">
          <Loader2 className="size-10 animate-spin text-stone-400" />
        </div>
      ) : pendingFailed ? (
        <div className="mt-4 rounded-xl border-2 border-stone-200 bg-white p-6 text-center">
          <p className="text-lg font-semibold text-stone-700">{t("reports.loadFailed")}</p>
          <button
            type="button"
            onClick={loadPending}
            className="mt-4 min-h-12 rounded-xl border-2 border-orange-600 px-6 text-lg font-bold text-orange-700 hover:bg-orange-50"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : !pending || pending.items.length === 0 ? (
        <div className="mt-4 rounded-xl border-2 border-stone-200 bg-white p-6 text-center">
          <p className="text-lg font-semibold text-stone-700">{t("reports.noPending")}</p>
        </div>
      ) : (
        <>
          {/* Grand total to recover + how long the oldest due has waited */}
          <div className="mt-4 rounded-xl border-2 border-stone-200 bg-white p-4">
            <p className="text-base font-semibold text-stone-500">{t("reports.totalToRecover")}</p>
            <p className="mt-1 wrap-break-word text-3xl font-extrabold tracking-tight text-red-600 sm:text-4xl">
              {formatINR(pending.total_pending)}
            </p>
            {pending.oldest_pending_date ? (
              <p className="mt-1 text-base font-semibold text-stone-500">
                {t("reports.oldestDue", {
                  days: String(Math.max(1, daysBetween(pending.oldest_pending_date, today))),
                })}
              </p>
            ) : null}
          </div>

          <ul className="mt-4 space-y-3">
            {pending.items.map((item) => {
              const ageDays = Math.max(1, daysBetween(item.oldest_pending_date, today));
              return (
                <li key={item.customer.id}>
                  <Link
                    href={`/customers/${item.customer.id}`}
                    className="flex items-center gap-3 rounded-xl border-2 border-stone-200 bg-white p-4 hover:border-orange-300 active:bg-orange-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold text-stone-900 sm:text-xl">{item.customer.name}</p>
                      <p className="truncate text-base text-stone-600 sm:text-lg">{item.customer.phone}</p>
                      <p className="mt-1 text-base text-stone-500">
                        {t("reports.pendingSince", {
                          date: monthLabel(item.oldest_pending_date.slice(0, 7), lang),
                        })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-extrabold text-red-600 sm:text-2xl">{formatINR(item.pending)}</p>
                      <p
                        className={`mt-1 inline-block rounded-lg px-2 py-1 text-sm font-bold ${
                          ageDays > 30
                            ? "bg-red-100 text-red-700"
                            : ageDays > 7
                              ? "bg-orange-100 text-orange-700"
                              : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {t("reports.daysPending", { days: String(ageDays) })}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
