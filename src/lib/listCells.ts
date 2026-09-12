/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LIST ROW'S DATE CELLS — ported from `design-refs/todo-list-view-contract.html` (list round,
 * Phase 2; that contract supersedes the list in every earlier one).
 *
 * The row is Task · Agent · Due · Overdue by · ⋯, and two of those cells need a derivation of their
 * own: the Due chip's month, day and year, and the Overdue-by figure. Both are PRESENTATIONS of one
 * fact — `taskDue`'s day — so the chip and the figure beside it cannot come to name different days.
 *
 * ⚠️ THE UNIT FUNCTION IS THE CONTRACT'S, LINE FOR LINE, AND ITS TEST RUNS THE CONTRACT'S OWN COPY.
 * It is deliberately NOT `elapsedParts`, which is the app's duration formatter everywhere else and
 * scales on different boundaries (weeks until 91 days, months until 730) — at 60 days one says
 * "9 weeks" and the other "2 months". The contract states the list's figure as its own function, so
 * the list's figure is that function; reusing the neighbour would have been a translation.
 *
 * ⚠️ AND THE RETIRED CELLS WENT WITH THEIR COLUMNS. `listStands`, `listSub`, `dateChip` and the row's
 * verb table rendered only the "Where it stands" and "Actions" cells, which this contract does not
 * draw. Deleted rather than left unmounted — a derivation with no reader is the next surface's
 * accidental source, and the grid card's verb (Phase 4) is its own derivation over its own words.
 */
import { overdueDays, type DueFact } from "./taskDue";

/** the contract's own month table — the chip's CSS uppercases it, so the DOM holds "Sep" */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface OverdueFigure {
  /** "13" · "7" · "1½" — never contains a space */
  figure: string;
  /** "days" · "weeks" · "months" · "years" — already agreed with the figure */
  unit: string;
}

/**
 * The contract's `unit(d)`, ported by value.
 *
 * Days under 14; then weeks while the ROUNDED week count is under 9; then months (a 30.4-day month)
 * while the rounded month count is under 18; then years to the nearest quarter. The rounding is the
 * contract's and it is the whole of where the boundaries fall — 59 days is "8 weeks" and 60 is
 * "2 months"; 531 is "17 months" and 532 is "1½ years".
 *
 * ⚠️ NO SUB-WORDS. The contract's `.ov .w` is `display: none` — a word it stopped drawing — so no
 * third element exists here to hide.
 */
export function overdueUnit(days: number): OverdueFigure {
  const d = Math.abs(days);
  if (d < 14) return { figure: String(d), unit: d === 1 ? "day" : "days" };
  const w = Math.round(d / 7);
  if (w < 9) return { figure: String(w), unit: w === 1 ? "week" : "weeks" };
  const mo = Math.round(d / 30.4);
  if (mo < 18) return { figure: String(mo), unit: mo === 1 ? "month" : "months" };
  const q = Math.round((d / 365.25) * 4) / 4;
  const quarter: Record<string, string> = { "0": "", "0.25": "¼", "0.5": "½", "0.75": "¾" };
  return { figure: `${Math.floor(q)}${quarter[String(q % 1)]}`, unit: "years" };
}

/**
 * The Overdue-by cell — four states, and the burgundy belongs to exactly one of them.
 *
 * ⚠️ COLOUR IS OWNERSHIP, NEVER MAGNITUDE. An overdue figure is burgundy because the WRITER owes the
 * date, and ink because the date is the agent's window — whatever the number says. A silence that has
 * run two years is a fact about the agency, not a debt, and painting it burgundy for being large
 * would tell the writer off for somebody else's inaction. So the state carries `owner` and nothing
 * about the size of the figure.
 *
 * `today` has no owner colour at all (the contract draws it plain), `ahead` is muted whoever owns it,
 * and `none` is the dateless row — no numeral, the words "no date".
 */
export type OverdueCell =
  | { kind: "none" }
  | { kind: "today" }
  | { kind: "ahead"; figure: string; unit: string }
  | { kind: "over"; figure: string; unit: string; owner: "owed" | "theirs" };

export function overdueCell(due: DueFact, todayYmd: string): OverdueCell {
  if (!due.ymd) return { kind: "none" };
  const n = overdueDays(due.ymd, todayYmd);
  if (n === 0) return { kind: "today" };
  const u = overdueUnit(n);
  if (n < 0) return { kind: "ahead", figure: u.figure, unit: `${u.unit} to go` };
  /* a dated fact is never `none` — `dueOwner` answers none only for a null day — so anything that is
     not the writer's clock is painted as the agent's, never as the dateless row */
  return { kind: "over", figure: u.figure, unit: u.unit, owner: due.owner === "owed" ? "owed" : "theirs" };
}

/**
 * The Query Centre's calendar chip — month over day, and the year only when it is not this year.
 *
 * ⚠️ A NULL DAY IS ITS OWN CHIP, NOT AN EMPTY ONE. The contract draws a dashed chip reading "none",
 * which says the record holds no date; a blank chip would say the app failed to show one.
 */
export type DueChip =
  | { kind: "none" }
  | { kind: "date"; mon: string; day: string; year: string | null };

export function dueChip(ymd: string | null, todayYmd: string): DueChip {
  if (!ymd) return { kind: "none" };
  const [y, m, d] = ymd.split("-").map(Number);
  const year = String(y);
  return { kind: "date", mon: MON[m - 1], day: String(d), year: year === todayYmd.slice(0, 4) ? null : year };
}
