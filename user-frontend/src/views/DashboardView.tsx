"use client";

// src/views/DashboardView.tsx
// Daily order book: day stepper, big summary numbers, tappable order list.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { StatusBadge } from "@/components/StatusBadge";
import { currentDay, formatINR, fullDayLabel, shiftDay } from "@/lib/format";
import { ordersService, type Order } from "@/services/orders.service";

export function DashboardView() {
  const { t, lang } = useLanguage();
  const router = useRouter();

  const [day, setDay] = useState(currentDay);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (targetDay: string) => {
    setLoading(true);
    setFailed(false);
    try {
      setOrders(await ordersService.listByDay(targetDay));
    } catch {
      setOrders(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const isToday = day === currentDay();

  useEffect(() => {
    load(day);
  }, [day, load]);

  const summary = useMemo(() => {
    const list = orders ?? [];
    const totalAmount = list.reduce((sum, order) => sum + order.total_amount, 0);
    const totalReceived = list.reduce((sum, order) => sum + order.amount_received, 0);
    return {
      count: list.length,
      totalAmount,
      totalReceived,
      pending: Math.max(0, totalAmount - totalReceived),
    };
  }, [orders]);

  const cards = [
    { label: t("dashboard.totalOrders"), value: String(summary.count), tone: "text-stone-900" },
    { label: t("dashboard.totalAmount"), value: formatINR(summary.totalAmount), tone: "text-stone-900" },
    { label: t("dashboard.totalReceived"), value: formatINR(summary.totalReceived), tone: "text-green-700" },
    { label: t("dashboard.totalPending"), value: formatINR(summary.pending), tone: "text-red-600" },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      {/* Day stepper — arrows plus a "today" shortcut */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDay((d) => shiftDay(d, -1))}
          aria-label="Previous day"
          className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 border-stone-300 bg-white text-stone-700 hover:bg-stone-50 active:bg-stone-100"
        >
          <ChevronLeft className="size-8" />
        </button>
        <div className="flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-stone-200 bg-white px-2 text-xl font-extrabold text-stone-900">
          {fullDayLabel(day, lang)}
          {!isToday && (
            <button
              type="button"
              onClick={() => setDay(currentDay())}
              className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border-2 border-orange-600 px-2 text-base font-bold text-orange-700 hover:bg-orange-50 active:bg-orange-100"
            >
              <CalendarClock className="size-5" />
              {t("dashboard.today")}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDay((d) => shiftDay(d, 1))}
          disabled={isToday}
          aria-label="Next day"
          className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 border-stone-300 bg-white text-stone-700 hover:bg-stone-50 active:bg-stone-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-300 disabled:hover:bg-white"
        >
          <ChevronRight className="size-8" />
        </button>
      </div>

      <Link
        href="/new"
        className="mt-4 flex h-16 items-center justify-center rounded-xl bg-orange-600 text-2xl font-extrabold text-white hover:bg-orange-700 active:bg-orange-800"
      >
        {t("dashboard.newOrder")}
      </Link>

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border-2 border-stone-200 bg-white p-4">
            <p className="text-base font-semibold text-stone-500">{card.label}</p>
            <p className={`mt-1 text-3xl font-extrabold tracking-tight ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Order list */}
      <div className="mt-6">
        <h2 className="mb-2 text-xl font-bold text-stone-800">{t("dashboard.title")}</h2>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border-2 border-stone-200 bg-white">
            <Loader2 className="size-10 animate-spin text-stone-400" />
          </div>
        ) : failed ? (
          <div className="rounded-xl border-2 border-stone-200 bg-white p-6 text-center">
            <p className="text-lg font-semibold text-stone-700">{t("dashboard.loadFailed")}</p>
            <button
              type="button"
              onClick={() => load(day)}
              className="mt-4 min-h-12 rounded-xl border-2 border-orange-600 px-6 text-lg font-bold text-orange-700 hover:bg-orange-50"
            >
              {t("common.retry")}
            </button>
          </div>
        ) : orders && orders.length > 0 ? (
          <ul className="space-y-3">
            {orders.map((order) => {
              const balance = Math.max(0, order.total_amount - order.amount_received);
              // Compact bahi-khata line: "रेत ×2 · जमुनिया" — only what exists
              const details = [
                order.material ? t(`material.${order.material}`) : null,
                order.quantity ? `×${order.quantity}` : null,
                order.village
              ].filter(Boolean).join(" · ");
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-stone-200 bg-white p-4 text-left hover:border-orange-300 active:bg-orange-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xl font-bold text-stone-900">
                        {t("dashboard.orderNo")} #{order.order_no}
                      </p>
                      <p className="truncate text-lg text-stone-600">
                        {order.customer?.name ?? "—"}
                        {order.customer?.phone ? ` · ${order.customer.phone}` : ""}
                      </p>
                      {details ? <p className="truncate text-base text-stone-500">{details}</p> : null}
                      <p className="mt-1 text-2xl font-extrabold text-stone-900">
                        {formatINR(order.total_amount)}
                        {balance > 0 ? (
                          <span className="ml-2 text-base font-semibold text-red-600">
                            {t("dashboard.balance")}: {formatINR(balance)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-8 text-center">
            <p className="text-xl font-bold text-stone-700">{t("dashboard.noOrders")}</p>
            <p className="mt-1 text-lg text-stone-500">{t("dashboard.noOrdersHint")}</p>
          </div>
        )}
      </div>
    </main>
  );
}
