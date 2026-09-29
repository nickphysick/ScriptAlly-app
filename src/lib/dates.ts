/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ONE DATE FORMATTER (clean-up pass, item 4, 28 Sep): "28 SEP", never "28 SEPT".
 *
 * `en-GB`'s short month for September is "Sept" in Node and Chromium, and every other short month is
 * three letters, so a page read "28 Sept" beside "3 Aug". Every date in the app that shows a short
 * month goes through `formatDate`, which formats EXACTLY as `toLocaleDateString` / `toLocaleString`
 * would — the same locale, the same options, weekday, year, time and time zone included — and then
 * puts a fixed three-letter month where the short month was. Nothing else about the output moves.
 *
 * ⚠️ A LOCK HOLDS IT (src/lib/dates.test.ts): no other file in src/ asks for `month: "short"`, and a
 * rendered sweep (tests/e2e/noSept.measure.ts) finds "Sept" on no page.
 */
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

type DateLike = Date | number | string | null | undefined;
const toDate = (at: DateLike): Date | null => {
  if (at == null || at === "") return null;
  const d = at instanceof Date ? at : new Date(at);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * `toLocaleDateString(locale, opts)` with a fixed short month. Invalid input gives "", never "Invalid
 * Date". Pass `withTime` for the `toLocaleString` form, whose default includes the time.
 */
export function formatDate(at: DateLike, opts: Intl.DateTimeFormatOptions = {}, locale: string | string[] | undefined = "en-GB", withTime = false): string {
  const d = toDate(at);
  if (!d) return "";
  const o: Intl.DateTimeFormatOptions = withTime && !hasFields(opts)
    ? { ...opts, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }
    : opts;
  const fmt = new Intl.DateTimeFormat(locale, o);
  if (o.month !== "short") return fmt.format(d);
  /* the month's number in the SAME zone the parts were computed in, so a date near midnight in
     another zone never takes the wrong month's name */
  const monthIndex = Number(new Intl.DateTimeFormat("en-GB", { month: "numeric", ...(o.timeZone ? { timeZone: o.timeZone } : {}) }).format(d)) - 1;
  return fmt.formatToParts(d).map((p) => (p.type === "month" ? MONTHS_SHORT[monthIndex] : p.value)).join("");
}

const hasFields = (o: Intl.DateTimeFormatOptions) =>
  ["weekday", "era", "year", "month", "day", "hour", "minute", "second", "dateStyle", "timeStyle"].some((k) => k in o);

/** "2 Sep" — the common short form (was `dayMonth` in packageResults, which re-exports it). */
export function dayMonth(at: DateLike): string {
  const d = toDate(at);
  return d ? `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` : "";
}
