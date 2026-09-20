// src/lib/format.ts
// Plain, locale-aware formatting helpers. Numbers use latin digits in both
// languages — the operators read them faster than devanagari numerals.
import type { Language } from "@/lib/i18n";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 123456 -> "₹1,23,456" */
export function formatINR(amount: number): string {
  return `₹${inr.format(Math.round(amount))}`;
}

/** "2026-09" -> "सितंबर 2026" / "September 2026" */
export function monthLabel(month: string, lang: Language): string {
  const [year, mon] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, mon - 1, 1));
}

/** "2026-09-12T07:10:58.819Z" -> "12 सितं 2026" / "12 Sep 2026" */
export function dateLabel(iso: string, lang: Language): string {
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** Current month as "YYYY-MM" (local time). */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Shift a "YYYY-MM" month by the given number of months. */
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(year, mon - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
