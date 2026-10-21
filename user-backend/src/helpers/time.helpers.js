// src/helpers/time.helpers.js
// The single source of truth for UTC time across the app. Every date/day
// computation must go through here so windows are consistent everywhere.

/** Current moment in UTC. */
export const nowUTC = () => new Date();

/** Today's date as "YYYY-MM-DD" in UTC. */
export const todayUTC = () => nowUTC().toISOString().slice(0, 10);

/** True when the string is a valid "YYYY-MM-DD" calendar date. */
export const isValidDateString = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value)) &&
  !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());

/**
 * UTC day window for a "YYYY-MM-DD" date:
 * { start, end } where end is exclusive (next midnight).
 */
export const dayRangeUTC = (date) => {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};
