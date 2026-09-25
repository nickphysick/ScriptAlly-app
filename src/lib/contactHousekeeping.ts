/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactHousekeeping — the rail's gap model (v11 §9.3). A gap is listed only if filling it in
 * changes what QueryHawk can do, and every predicate here is either the app's own instrument or
 * a fact of the record:
 *
 * ⚠️ THE REPLY-TIME GAP IS RULING (c), NOT THE TABLE'S LETTER. Absent is the writer's "Unknown"
 * — a valid answer, never a gap. Only the quick-add stub (`0`) is flagged, and it is flagged
 * THROUGH `agentDataQualityNeeds`, the same instrument the To-do's data-quality task reads, so
 * this rail and To-do cannot disagree about who needs a window. Materials go through the same
 * instrument for the same reason.
 *
 * ⚠️ NULL NEVER COUNTS AS STALE. `mswlCheckedAt` starts null everywhere (the field arrived with
 * v11 P4 and there is no backfill); a wishlist nobody has stamped is UNKNOWN-age, not old, and
 * calling it stale would open the rail with thirty false chores on day one.
 *
 * ⚠️ THE REOPEN GAP IS RULING (b): a closed door with NO undone dated task carrying this
 * agent's id. The reminder IS a `UserTask` — no schema, no second store — so completing or
 * deleting it in To-do reopens the gap here, which is the two surfaces agreeing by construction.
 */
import type { Agent } from "../types";
import { agentDataQualityNeeds } from "./agentDataQuality";
import { isDoorOpen } from "./agentList";

const DAY = 86_400_000;
export const STALE_DAYS = 180;

export type GapKey = "reply" | "genres" | "wishlist" | "materials" | "recheck" | "reopen";

/** The table's order (§9.3) — sections render in it, and the by-agent chips follow it. */
export const GAP_ORDER: readonly GapKey[] = ["reply", "genres", "wishlist", "materials", "recheck", "reopen"];

export const GAP_META: Record<GapKey, { heading: string; why: string }> = {
  reply: { heading: "Reply time", why: "Sets each query's expected-reply date, and when to nudge." },
  genres: { heading: "Genres sought", why: "Drives the genre match and who to query next." },
  wishlist: { heading: "Manuscript wishlist", why: "Sharpens the match beyond genre." },
  materials: { heading: "Materials requested", why: "Lets QueryHawk check your submission package before you query." },
  recheck: { heading: "Wishlist not checked in six months", why: "Wishlists change. Recheck before you query or nudge." },
  reopen: { heading: "Closed to queries", why: "Get a reminder when their list reopens." },
};

export interface HkAgentCtx {
  /** any LIVE query, whatever the manuscript — the fan-out reason is scope-independent */
  hasLiveQuery: boolean;
  /** an undone, dated UserTask carrying this agent's id (ruling b) */
  hasReopenTask: boolean;
  nowMs: number;
}

const hasWishlist = (a: Agent) => (a.mswlNotes ?? "").trim().length > 0;

export function agentGaps(a: Agent, ctx: HkAgentCtx): GapKey[] {
  const dq = agentDataQualityNeeds(a);
  const gaps: GapKey[] = [];
  if (dq.includes("responseTime")) gaps.push("reply");
  if ((a.genres ?? []).length === 0) gaps.push("genres");
  if (!hasWishlist(a)) gaps.push("wishlist");
  if (dq.includes("materials")) gaps.push("materials");
  if (
    hasWishlist(a) && a.mswlCheckedAt
    && ctx.nowMs - Date.parse(a.mswlCheckedAt) >= STALE_DAYS * DAY
    && isDoorOpen(a)
  ) gaps.push("recheck");
  if (!isDoorOpen(a) && !ctx.hasReopenTask) gaps.push("reopen");
  return gaps;
}

/**
 * "Complete" (§9.3): location, reply time, genres, wishlist and materials in place, and the
 * wishlist not stale — six checks, and the by-agent ring fills by their share.
 *
 * ⚠️ ONE DELIBERATE DEVIATION FROM THE LETTER, carried over from ruling (c): the reply check
 * passes on ABSENT as well as on a number, because absent is the writer's recorded "Unknown".
 * Read literally ("reply time present"), an agent whose honest answer is Unknown could never
 * complete, with no gap row offering a way out — a ring that can never fill is a chore that
 * cannot be done. Only the stub `0` blocks it, the same value that raises the gap.
 */
export function hkChecks(a: Agent, ctx: HkAgentCtx): boolean[] {
  const staleFree = !(hasWishlist(a) && a.mswlCheckedAt && ctx.nowMs - Date.parse(a.mswlCheckedAt) >= STALE_DAYS * DAY);
  return [
    Boolean((a.city ?? "").trim() || (a.country ?? "").trim()),
    a.responseTimeWeeks !== 0,
    (a.genres ?? []).length > 0,
    hasWishlist(a),
    !agentDataQualityNeeds(a).includes("materials"),
    staleFree,
  ];
}

export const isHkComplete = (a: Agent, ctx: HkAgentCtx): boolean => hkChecks(a, ctx).every(Boolean);

/** live query first, then not yet queried, then closed (§9.3's agent order, standing-based) */
export type HkBand = "live" | "never" | "closed";

export interface HkAgentRow {
  agent: Agent;
  gaps: GapKey[];
  band: HkBand;
  /** filled checks of the six, for the by-agent ring */
  ring: number;
}

export interface HkSection {
  key: GapKey;
  heading: string;
  why: string;
  members: HkAgentRow[];
}

export interface HkModel {
  sections: HkSection[];
  byAgent: HkAgentRow[];
  gapsById: Map<string, GapKey[]>;
  counts: { gaps: number; agents: number; complete: number; total: number };
  countsLine: { gaps: string; rest: string };
}

const BAND_ORDER: Record<HkBand, number> = { live: 0, never: 1, closed: 2 };

export function hkModel(
  agents: readonly Agent[],
  ctxOf: (a: Agent) => HkAgentCtx,
  bandOf: (a: Agent) => HkBand,
): HkModel {
  const rows: HkAgentRow[] = agents.map((a) => {
    const ctx = ctxOf(a);
    return {
      agent: a,
      gaps: agentGaps(a, ctx),
      band: bandOf(a),
      ring: hkChecks(a, ctx).filter(Boolean).length,
    };
  });
  const order = (x: HkAgentRow, y: HkAgentRow) =>
    BAND_ORDER[x.band] - BAND_ORDER[y.band]
    || (x.agent.name.trim() || x.agent.agency).toLowerCase().localeCompare((y.agent.name.trim() || y.agent.agency).toLowerCase());

  const sections: HkSection[] = GAP_ORDER
    .map((key) => ({
      key,
      heading: GAP_META[key].heading,
      why: GAP_META[key].why,
      members: rows.filter((r) => r.gaps.includes(key)).sort(order),
    }))
    .filter((s) => s.members.length > 0);

  const withGaps = rows.filter((r) => r.gaps.length > 0).sort(order);
  const complete = rows.filter((r) => r.ring === 6).length;
  const gaps = rows.reduce((n, r) => n + r.gaps.length, 0);
  return {
    sections,
    byAgent: withGaps,
    gapsById: new Map(rows.map((r) => [r.agent.id, r.gaps])),
    counts: { gaps, agents: withGaps.length, complete, total: rows.length },
    /* the gap count renders bold (ink 700) — split so the component need not re-parse */
    countsLine: {
      gaps: `${gaps} GAP${gaps === 1 ? "" : "S"}`,
      rest: ` · ${withGaps.length} AGENT${withGaps.length === 1 ? "" : "S"} · ${complete} OF ${rows.length} COMPLETE`,
    },
  };
}

/** The by-agent chips, in the table's order (reply's fix is the inline box, so no chip for it). */
export const gapChipLabel: Record<Exclude<GapKey, "reply">, string> = {
  genres: "+ Genres",
  wishlist: "+ Wishlist",
  materials: "+ Materials",
  recheck: "+ Recheck wishlist",
  reopen: "+ Reopen reminder",
};

/** The reopen reminder's task, ruling (b): a dated UserTask, nothing else. */
export const reopenTaskFields = (a: Agent): { agentId: string; dueDate: string; text: string } => ({
  agentId: a.id,
  dueDate: (a.reopensOn ?? "").trim(),
  text: `${(a.name ?? "").trim() || a.agency}'s list reopens — check it and query`,
});

/** "REMIND ME 1 NOV" — the button carries the date it will set (en-GB, short month). */
export const remindLabel = (a: Agent): string => {
  const d = (a.reopensOn ?? "").trim();
  if (!d) return "REMIND ME";
  const ms = Date.parse(d);
  if (Number.isNaN(ms)) return "REMIND ME";
  return `REMIND ME ${new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}`;
};
