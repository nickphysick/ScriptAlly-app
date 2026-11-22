/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v38 (27 Oct; ref design-refs/submission-packages-v38/) — the labels row, the package drawer and
 * the results section, as pure derivations. Pure and unit-locked (packagesV38.test.ts).
 *
 * ⚠️ EVERY FIGURE IS packageReplies'. A query counts by its FIRST answer (`firstAnswer`, Analytics' rows), a material
 *    is credited edition-true (`materialSplit`), and nothing is ranked before MIN_SENDS_FOR_CLAIM answers
 *    (`qualifies`). "Asked for more" is a first answer that was a request (a partial or full), over everything sent.
 *    This replaces v40's `factsOf` (≥5 sent, any request ever) on this page only; Versions still reads factsOf.
 * ⚠️ A SHOWCASE NEVER PADS. A slot with no candidate is left out, and no package fills two Packages slots.
 */
import type { AnalyticsRow } from "./analytics";
import { firstAnswer } from "./packageResults";
import { MIN_SENDS_FOR_CLAIM, qualifies, type Split } from "./packageReplies";
import type { Query } from "../types";

export { MIN_SENDS_FOR_CLAIM };

/** One package's or piece's figures. */
export interface Fig {
  sent: number;
  replies: number;
  /** first answer a request (partial or full) */
  more: number;
  /** of those, a full request */
  full: number;
  answered: number;
  /** average days to a first reply, or null when none is dated */
  days: number | null;
  /** more ÷ sent, 0–100 rounded; null when nothing is sent */
  pct: number | null;
  /** answered ≥ MIN_SENDS_FOR_CLAIM */
  ranked: boolean;
}

export const EMPTY_FIG: Fig = { sent: 0, replies: 0, more: 0, full: 0, answered: 0, days: null, pct: null, ranked: false };

/** A split plus the queries behind it (for full requests and reply days). */
/**
 * ⚠️ "SENT" LEAVES OUT A QUERY WITHDRAWN BEFORE ANY ANSWER — packageReplies keeps it out of every segment and rate
 *    (`withdrawnEarly`), so it cannot be in the denominator of "asked for more" either.
 */
const sentOf = (s: Split): number => s.sent - s.withdrawnEarly;

export function figOf(s: Split, qs: readonly Query[], rows: Map<string, AnalyticsRow>): Fig {
  let full = 0;
  const days: number[] = [];
  for (const q of qs) {
    const row = rows.get(q.id);
    const a = firstAnswer(q, row);
    if (a === "request" && row?.reachedFull) full++;
    if ((a === "request" || a === "pass") && typeof row?.replyDays === "number" && row.replyDays >= 0) days.push(row.replyDays);
  }
  const sent = sentOf(s);
  return {
    sent, replies: s.replies, more: s.requests, full, answered: s.answered,
    days: days.length ? Math.round(days.reduce((x, y) => x + y, 0) / days.length) : null,
    pct: sent ? Math.round((s.requests / sent) * 100) : null,
    ranked: qualifies(s),
  };
}

/** The label's status line, in the ref's words. */
export function labelStatus(f: Fig, retired: boolean): string {
  if (retired) return "Retired";
  if (!f.sent) return "Not sent yet";
  if (!f.ranked) return "Too early";
  return `${f.pct}% asked for more`;
}

/** The ring: filled share once ranked, dashed while too early, empty when not sent. */
export type Ring = { k: "none" } | { k: "early" } | { k: "rate"; pct: number };
export const ringOf = (f: Fig): Ring => (!f.sent ? { k: "none" } : !f.ranked ? { k: "early" } : { k: "rate", pct: f.pct ?? 0 });

/** The drawer's one-line status (ref `pkDrawer`'s `d-sum`). */
export function drawerStatus(p: { retired: boolean; sent: boolean; ready: boolean }): string {
  const body = p.sent ? "Out with agents since its first query. Locked, so what each agent got stays true."
    : p.ready ? "Ready to send. Pick it when you log a query."
      : "Draft. It needs a letter and pages.";
  return `${p.retired ? "Retired. " : ""}${body}`;
}

/** "{q} of {s} agents asked for more · you average {avg}%" (the average only once ranked, as the ref). */
export function drawerLine(f: Fig, avg: number | null): string {
  return `${f.more} of ${f.sent} agent${f.sent === 1 ? "" : "s"} asked for more${f.ranked && avg != null ? ` · you average ${avg}%` : ""}`;
}

/** "{r} answered so far. Give it {n} more before reading much into this." */
export const earlyWarning = (f: Fig): string => `${f.answered} answered so far. Give it ${MIN_SENDS_FOR_CLAIM - f.answered} more before reading much into this.`;

export interface Item { id: string; name: string; f: Fig; retired?: boolean }

/** The house order for "asked for more": ranked first, then share, then sent, then A–Z. Unsent items are dropped. */
export function rankByMore<T extends Item>(items: readonly T[]): T[] {
  return items.filter((x) => x.f.sent > 0).sort((a, b) =>
    Number(b.f.ranked) - Number(a.f.ranked)
    || (b.f.pct ?? -1) - (a.f.pct ?? -1)
    || b.f.sent - a.f.sent
    || a.name.localeCompare(b.name, "en-GB"));
}

/** A bar on a stats card: `null` value draws hatched with "–". */
export interface Bar { id: string; name: string; on: boolean; w: number | null; v: string }

/** "Asked for more" bars: the top three by rank, width twice the share (capped), too-early hatched. */
export function moreBars<T extends Item>(ranked: readonly T[], winner: T): Bar[] {
  return ranked.slice(0, 3).map((m) => ({
    id: m.id, name: m.name, on: m.id === winner.id,
    w: m.f.ranked ? Math.max(4, Math.min(100, (m.f.pct ?? 0) * 2)) : null,
    v: m.f.ranked ? `${m.f.pct}%` : "–",
  }));
}

export type Showcase<T extends Item> =
  | { k: "best"; item: T; bars: Bar[] }
  | { k: "most"; item: T; bars: Bar[] }
  | { k: "prove"; item: T; got: number; need: number };

/**
 * Row 1 — the three Packages showcases. Each package appears at most once:
 *   best  — the highest "asked for more" among RANKED packages;
 *   most  — the most-sent package, excluding best (retired ones may win);
 *   prove — the most-sent LIVE package not already shown (may be unsent).
 */
export function packageShowcases<T extends Item>(pkgs: readonly T[]): Showcase<T>[] {
  const out: Showcase<T>[] = [];
  const used = new Set<string>();
  const r = rankByMore(pkgs);
  const best = r.find((p) => p.f.ranked);
  if (best) { used.add(best.id); out.push({ k: "best", item: best, bars: moreBars(r, best) }); }
  const bySent = pkgs.filter((p) => p.f.sent > 0).sort((a, b) => b.f.sent - a.f.sent || a.name.localeCompare(b.name, "en-GB"));
  const most = bySent.find((p) => !used.has(p.id));
  if (most) {
    used.add(most.id);
    const mx = bySent[0]!.f.sent;
    out.push({ k: "most", item: most, bars: bySent.slice(0, 3).map((m) => ({ id: m.id, name: m.name, on: m.id === most.id, w: (m.f.sent / mx) * 100, v: String(m.f.sent) })) });
  }
  const prove = pkgs.filter((p) => !used.has(p.id) && !p.retired).sort((a, b) => b.f.sent - a.f.sent || a.name.localeCompare(b.name, "en-GB"))[0];
  if (prove) out.push({ k: "prove", item: prove, got: Math.min(prove.f.answered, MIN_SENDS_FOR_CLAIM), need: MIN_SENDS_FOR_CLAIM });
  return out;
}

/** Row 2 — the top-ranked piece of one kind, or null when nothing has had MIN_SENDS_FOR_CLAIM answers. */
export function bestPiece<T extends Item>(items: readonly T[]): { item: T; bars: Bar[] } | null {
  const r = rankByMore(items);
  const m = r.find((x) => x.f.ranked);
  return m ? { item: m, bars: moreBars(r, m) } : null;
}

/** The band's three totals: queries sent with a package, % that got a reply, % that asked for more. */
export function bandTotals(s: Split): { sent: number; replied: number; more: number } | null {
  const sent = sentOf(s);
  if (!sent) return null;
  return { sent, replied: Math.round((s.replies / sent) * 100), more: Math.round((s.requests / sent) * 100) };
}

/** Threshold in words, for "How it's counted" and the placeholders ("four"). */
export const thresholdWords = (n: number = MIN_SENDS_FOR_CLAIM): string =>
  ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);

/** Deep links: `?tab=let|syn|ver` (and v26's long forms) open Your materials on that list. */
export function libTabFromParam(v: string | null): "let" | "syn" | "ver" | null {
  if (!v) return null;
  const t = v.toLowerCase();
  if (t === "let" || t === "letters" || t === "letter" || t === "query-letters") return "let";
  if (t === "syn" || t === "synopses" || t === "synopsis") return "syn";
  if (t === "ver" || t === "versions") return "ver";
  return null;
}
