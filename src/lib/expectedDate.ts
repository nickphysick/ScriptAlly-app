/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ WHOSE EXPECTED DATE IS IT — provenance made structural ═══════════════════════════════════
 *
 * ⚠️ TWO FACTS, TWO SHAPES, AND NEITHER OF THEM IS A FLAG.
 *
 *   the agency's window  → DERIVED AT READ TIME from their current stated weeks
 *   the writer's date    → STORED, in its own field, written only by the writer's control
 *
 * Provenance then needs no recording. A value in `writerExpectedDate` is the writer's because
 * nothing else can write there; an agency-derived date comes from the window they state TODAY, so
 * it moves when they change it and disappears when they clear it. The history that could not be
 * resolved — an agency who stated weeks, later cleared them, leaving a stored date that read as the
 * writer's — stops existing rather than being detected.
 *
 * ⚠️ A BOOLEAN BESIDE `responseDeadline` WOULD HAVE BEEN THE WRONG SHAPE. A flag can drift from the
 * value it describes: any write path that sets one without the other produces a date attributed to
 * the wrong person, with nothing failing. Two fields cannot disagree, because there is only ever
 * one of them holding a given fact.
 *
 * ⚠️ AND IT FIXES A DERIVED-OVER-STORED VIOLATION UNDERNEATH THE BUG. `addQuery` seeded
 * `responseDeadline` from the agent's window at creation — a stored copy of a derivable fact, which
 * is exactly why clearing the window left debris. `recomputeQuery` remains the single writer for
 * anything that stays stored.
 *
 * ⚠️ THE FIELD IS NOT IN `src/types.ts`, WHICH BELONGS TO ANOTHER STREAM. `closureOfferDismissed`
 * is the standing precedent: a live query field validated and allowlisted in `firestore.rules` and
 * reached through a local cast. The cast lives HERE, once, rather than at every call site.
 */
import type { Query } from "../types";

/** The stored field's name, in one place — the rules, the writer and the readers all quote it. */
export const WRITER_EXPECTED_FIELD = "writerExpectedDate";

const DAY = 86400000;
const ms = (iso?: string): number => (iso ? new Date(iso).getTime() : NaN);

/** The writer's own expected date, or undefined. The one cast, and the one place it lives. */
export function writerExpectedIso(query: Pick<Query, "id">): string | undefined {
  const v = (query as unknown as Record<string, unknown>)[WRITER_EXPECTED_FIELD];
  return typeof v === "string" && v.trim() ? v : undefined;
}

/** The same, as an instant — `null` when absent or unparseable. */
export function writerExpectedMs(query: Pick<Query, "id">): number | null {
  const iso = writerExpectedIso(query);
  if (!iso) return null;
  const t = ms(iso);
  return Number.isNaN(t) ? null : t;
}

/**
 * The AGENCY's window, derived: their current stated weeks from the send anchor.
 *
 * ⚠️ `null` WHEN THEY STATE NOTHING, and that is the whole point of deriving it. There is no stored
 * copy to go stale, so an agency that clears its window stops having one everywhere at once.
 */
export function agentWindowMs(sentMs: number | null, weeks?: number | null): number | null {
  if (sentMs == null || Number.isNaN(sentMs)) return null;
  if (!weeks || weeks <= 0) return null;
  return sentMs + weeks * 7 * DAY;
}

/* ══ THE RESOLVER — one place the expected date is composed ═══════════════════════════════════ */

/** Whose the resolved date is. `null` when nobody has stated one. */
export type ExpectedSource = "writer" | "agent" | null;

export interface ResolvedExpected {
  /** The expected date, or `null` when nobody has stated one. */
  ms: number | null;
  /** Whose it is — `null` exactly when `ms` is. */
  source: ExpectedSource;
}

/**
 * ⚠️ F2/D4 · THE COMPOSITION LIVES HERE, ONCE. It was inlined in `queryAmbientStatus`, which meant
 * every other surface wanting an expected date either re-derived it or — as Fortnight did — read a
 * stored field instead and quietly disagreed. The precedence is the pack's:
 *
 *     the writer's own date  →  the agency's current window  →  nothing
 *
 * ⚠️ `null` IS AN ANSWER, AND IT IS THE ONE THAT STOPS THE APP INVENTING A DATE. The house
 * 8/12/12-week assumption is NOT in here: it belongs to nobody, so it can anchor a progress bar
 * (the tracker adds it on top of this) but must never put a date in front of a writer as though
 * someone had said it. A caller that wants the house figure has to ask for it in as many words.
 *
 * ⚠️ AND `responseDeadline` IS DELIBERATELY NOT READ. That is provenance-pack §1 and reversing it
 * here would undo the whole point: `addQuery` used to seed that field from the AGENCY's window, so
 * a value in it is not evidence the writer stated anything. It still has two live writers
 * (MarkSentPopover's opt-in reminder, EditQueryDrawer) — see the report; that is a decision about
 * which control writes which field, not something to paper over inside the resolver.
 *
 * ⚠️ D4's RECENCY CLAUSE CANNOT BE IMPLEMENTED YET, AND THE REASON IS A SCHEMA GAP RATHER THAN A
 * MISSING BRANCH. "The most recent of { reply-stated, writer's date }" needs to know WHEN each was
 * stated. A reply event carries its own date; `writerExpectedDate` stores only the date expected,
 * never the moment it was set — so with two human statements in play there is nothing to compare.
 * With one, recency is trivially that one, which is why this reads correctly today and is
 * incomplete tomorrow. Recording when the writer's date was set is a Phase-1 schema question.
 */
export function resolveExpectedDate(
  query: Pick<Query, "id">,
  sentMs: number | null,
  agencyWeeks?: number | null,
): ResolvedExpected {
  const mine = writerExpectedMs(query);
  if (mine != null) return { ms: mine, source: "writer" };
  const theirs = agentWindowMs(sentMs, agencyWeeks);
  if (theirs != null) return { ms: theirs, source: "agent" };
  return { ms: null, source: null };
}

/* ══ THE ONE-TIME MIGRATION ═══════════════════════════════════════════════════════════════════ */

export interface MigrationQuery {
  id: string;
  agentId?: string;
  dateSent?: string;
  responseDeadline?: string;
  /** present on real queries; read through the accessor above in production */
  writerExpectedDate?: string;
}

export interface MigrationPlan {
  /** stored dates that are just the agency's window written down — they re-derive, so they go */
  drop: string[];
  /** dates the agency's window cannot explain — the writer's, as far as anything can tell */
  adopt: { id: string; iso: string }[];
  /**
   * ⚠️ THE BRANCH THAT IS KNOWINGLY WRONG, COUNTED SEPARATELY. A query whose agent states nothing
   * NOW but carries a stored deadline is either the writer's date or debris from a window that was
   * cleared. The information to tell them apart was never recorded, so this is unresolvable — and
   * adopting it is the conservative direction: it claims the writer set a date they may not have,
   * rather than putting words in an agency's mouth.
   */
  unresolvable: string[];
}

/** How close a stored date must be to the derived one to count as the same fact. */
export const MIGRATION_TOLERANCE_MS = DAY;

/**
 * ⚠️ PURE, AND IT TAKES THE AGENT'S WEEKS RATHER THAN THE AGENT. The caller resolves the agent; this
 * decides. A planner that looked records up could not be run over a fixture.
 *
 * ⚠️ A QUERY THAT ALREADY HAS A WRITER'S DATE IS LEFT ALONE — the migration is one-time, but nothing
 * guarantees it runs once, so it has to be safe to run twice.
 */
export function planExpectedDateMigration(
  queries: readonly MigrationQuery[],
  weeksFor: (agentId?: string) => number | undefined,
): MigrationPlan {
  const plan: MigrationPlan = { drop: [], adopt: [], unresolvable: [] };
  for (const q of queries) {
    if (!q.responseDeadline) continue;
    if (q.writerExpectedDate) { plan.drop.push(q.id); continue; }
    const stored = ms(q.responseDeadline);
    if (Number.isNaN(stored)) { plan.drop.push(q.id); continue; }
    const weeks = weeksFor(q.agentId);
    const derived = agentWindowMs(ms(q.dateSent), weeks);
    if (derived != null && Math.abs(derived - stored) <= MIGRATION_TOLERANCE_MS) {
      plan.drop.push(q.id);            // the agency's window, written down — it re-derives
    } else {
      plan.adopt.push({ id: q.id, iso: q.responseDeadline });
      if (!weeks) plan.unresolvable.push(q.id);
    }
  }
  return plan;
}
