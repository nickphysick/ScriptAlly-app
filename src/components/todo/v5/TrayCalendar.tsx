/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list — the date helpers the slide-out calendar and the page share.
 *
 * ⚠️ v5.2's CALENDAR CARD (the day panel beside the month, in the header) IS RETIRED BY v7 S1 (29 Oct). Its today figures
 *    became the Today card below; the month lives only in the slide-out drawer (TrayCalDrawer), which reads the
 *    helpers here.
 * ⚠️ v7's TODAY CARD IS RETIRED BY v12 (29 Oct): the page's urgent figures are the Needs you now summary
 *    (lib/todoUrgent), and the month opens from its "Calendar" button.
 */
import { MONTHS_SHORT } from "../../../lib/dates";

export const WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const ymdParts = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return { y, m: m - 1, d }; };
export const ymdOf = (y: number, m: number, d: number) => { const x = new Date(Date.UTC(y, m, d)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`; };
export const plusDays = (ymd: string, n: number) => { const p = ymdParts(ymd); return ymdOf(p.y, p.m, p.d + n); };
export const weekdayOf = (ymd: string) => { const p = ymdParts(ymd); return new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay(); };
/** "15 Oct" */
export const shortDay = (ymd: string) => { const p = ymdParts(ymd); return `${p.d} ${MONTHS_SHORT[p.m]}`; };
/** "Thu 15 Oct" */
export const dayChip = (ymd: string) => `${WD_LONG[weekdayOf(ymd)].slice(0, 3)} ${shortDay(ymd)}`;
/** the six (or five) weeks the month draws, Monday first */
export function monthDays(y: number, m: number): string[] {
  const first = ymdOf(y, m, 1);
  let d = plusDays(first, -((weekdayOf(first) + 6) % 7));
  const out: string[] = [];
  for (let i = 0; i < 42; i++) {
    if (i === 35 && ymdParts(d).m !== m) break;
    out.push(d);
    d = plusDays(d, 1);
  }
  return out;
}
