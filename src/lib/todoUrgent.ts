/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v12 — "NEEDS YOU NOW": which of the tray's tasks lead the page, in what order, and the one-line summary
 * over them. Pure. It reads the tray's own items (lib/todoTray: their group and their date, both already derived from
 * the board) and computes nothing a second time from raw queries.
 *
 * ⚠️ THE RULE (Nick's, v12 Phase 1 §2): Your move tasks that are an offer, or due today or earlier; Worth a nudge tasks
 *    that are overdue (strictly past); your own tasks due today or earlier. Gone quiet and Housekeeping never lead.
 * ⚠️ THE ORDER: Your move first (an offer leads it), then your own tasks, then nudges; within a group, most overdue
 *    first (the earliest date first), an undated task last.
 * ⚠️ A TASK THAT LEADS IS NOT ALSO IN THE TRAY: the page draws the tray from everything `isUrgent` refuses, so the
 *    carousel and the tray's bands always add up to the sidebar's count.
 */
import type { TrayItem } from "./todoTray";

type Urgentable = Pick<TrayItem, "group" | "dial" | "card">;

/** an offer to answer (the `decide` bucket's offer, never an R&R) */
export const isOffer = (i: Pick<TrayItem, "card">): boolean => i.card.taskType === "offer_received";

/** due on or before `today` (YYYY-MM-DD, the tray's own local day) */
const dueBy = (i: Urgentable, today: string): boolean => !!i.dial.ymd && i.dial.ymd <= today;

export function isUrgent(i: Urgentable, today: string): boolean {
  switch (i.group.id) {
    case "you": return isOffer(i) || dueBy(i, today);
    case "chase": return !!i.dial.ymd && i.dial.ymd < today;
    case "mine": return dueBy(i, today);
    default: return false;
  }
}

const GROUP_RANK: Record<string, number> = { you: 0, mine: 1, chase: 2 };

/** the carousel's order (stable for ties) */
export function urgentOrder<T extends Urgentable>(items: readonly T[]): T[] {
  return items
    .map((i, at) => ({ i, at }))
    .sort((a, b) => {
      const g = (GROUP_RANK[a.i.group.id] ?? 3) - (GROUP_RANK[b.i.group.id] ?? 3);
      if (g) return g;
      const o = Number(isOffer(b.i)) - Number(isOffer(a.i));
      if (o) return o;
      const ya = a.i.dial.ymd ?? "9999-99-99", yb = b.i.dial.ymd ?? "9999-99-99";
      return ya < yb ? -1 : ya > yb ? 1 : a.at - b.at;
    })
    .map((x) => x.i);
}

export interface UrgentFigures { total: number; overdue: number; today: number; offers: number }

/** the figures the summary line states: overdue is strictly past; an offer counts as an offer whatever its date */
export function urgentFigures(list: readonly Urgentable[], today: string): UrgentFigures {
  return {
    total: list.length,
    overdue: list.filter((i) => !!i.dial.ymd && i.dial.ymd < today).length,
    today: list.filter((i) => i.dial.ymd === today).length,
    offers: list.filter(isOffer).length,
  };
}

export interface SummaryPart { text: string; overdue?: boolean }

/**
 * "{N} things to do first: {o} overdue, {t} due today and an offer to answer." — a part with a zero count is left out,
 * "One thing to do first: …" for one, the last two parts joined by "and". Null when nothing leads.
 */
export function urgentSummary(f: UrgentFigures): { lead: string; parts: SummaryPart[] } | null {
  if (!f.total) return null;
  const parts: SummaryPart[] = [];
  if (f.overdue) parts.push({ text: `${f.overdue} overdue`, overdue: true });
  if (f.today) parts.push({ text: `${f.today} due today` });
  if (f.offers) parts.push({ text: f.offers === 1 ? "an offer to answer" : `${f.offers} offers to answer` });
  return { lead: `${f.total === 1 ? "One thing" : `${f.total} things`} to do first: `, parts };
}

/** the summary as plain text (the accessible label and the unit tests) */
export function urgentSummaryText(f: UrgentFigures): string {
  const s = urgentSummary(f);
  if (!s) return "";
  const p = s.parts.map((x) => x.text);
  const body = p.length > 1 ? `${p.slice(0, -1).join(", ")} and ${p[p.length - 1]}` : p.join("");
  return `${s.lead}${body}.`;
}
