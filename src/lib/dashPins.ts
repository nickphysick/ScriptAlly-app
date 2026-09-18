/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashPins — the response events pinned to the active-queries line, and what happens when they
 * crowd (v33, 18 Sep).
 *
 * A pin is one dated act by an agent — a partial or full request, an offer — or a query closing, by a
 * pass or by silence. Its glyph is the status the query moved TO, and the glyph is `StatusDot`.
 *
 * ⚠️ A PROVISIONAL RUNG IS NEVER PINNED. An imported rung whose date is an ordering key
 * (`dateProvisional`) did happen and did not happen THEN; a pin on that date would put a fact on a
 * day nobody recorded.
 *
 * ⚠️ AND A WITHDRAWAL IS NOT PINNED, for the reason the closed tile leaves it out: it is the writer's
 * decision, not something that came back. "Closed" here is exactly `dashClosed.CLOSED_STATUSES`.
 *
 * ⚠️ THE CROWDING RULES ARE PURE AND LIVE HERE, so they are lockable without a browser:
 *   1 · two pins whose glyphs would touch — the later takes the long stem
 *   2 · three or more inside one `PIN_NEAR` run — one pin, carrying a count
 *   3 · one query twice in a cluster — only its latest event is kept (one query never reads as two)
 *   4 · the flip below the line is decided AFTER the stem length, against the stem actually used, and
 *       overlap is tested between GLYPH CENTRES — see `layoutPins`
 */
import { Activity, Agent, Manuscript, Query, QueryStatus } from "../types";
import { sentAt } from "./oneScreen";
import { DerivableActivity, getActivityTime, normalizeResultingStatus } from "./queryDerivation";
import { CLOSED_STATUSES } from "./dashClosed";

export const PIN_STATUSES: readonly QueryStatus[] = [
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.OFFER, ...CLOSED_STATUSES,
];

export interface PinEvent {
  /** the activity's id — stable across redraws */
  id: string;
  queryId: string;
  status: QueryStatus;
  timeMs: number;
}

/** Every pinnable event on the board, oldest first. Windowing is the caller's. */
export const pinEvents = (queries: readonly Query[], activities: readonly Activity[]): PinEvent[] => {
  const onBoard = new Set(queries.filter((q) => sentAt(q) !== null).map((q) => q.id));
  const out: PinEvent[] = [];
  activities.forEach((a, i) => {
    if (!a.queryId || !onBoard.has(a.queryId)) return;
    if ((a as DerivableActivity).dateProvisional === true) return;
    const status = normalizeResultingStatus(a.resultingStatus);
    if (!status || !PIN_STATUSES.includes(status)) return;
    const timeMs = getActivityTime(a.date);
    if (!(timeMs > 0)) return;
    out.push({ id: a.id || `${a.queryId}:${i}`, queryId: a.queryId, status, timeMs });
  });
  return out.sort((x, y) => x.timeMs - y.timeMs || x.id.localeCompare(y.id));
};

/* ── geometry of one pin — the numbers are the ref's ── */
export const PIN_NEAR = 22;
export const STEM_SHORT = 27;
export const STEM_LONG = 45;
/** the white disc's radius; a glyph whose disc would leave the plot flips below the line */
export const PIN_DISC_R = 9.5;
/** the ref flips at 38px from the top with a 27px stem: the stem, the disc, and a hair of air */
export const flipWithin = (stem: number): number => stem + PIN_DISC_R + 1.5;

export interface PlacedEvent extends PinEvent { x: number; y: number }

export interface ChartPin {
  /** the newest member's id — what a pinned popup remembers */
  id: string;
  /** where the pin meets the line: its newest member's point */
  x: number;
  y: number;
  /** the glyph's centre */
  gy: number;
  stem: number;
  below: boolean;
  /** one member → a status glyph; several → a count */
  members: PlacedEvent[];
}

/**
 * Two glyph discs closer than this (centre to centre) overlap: two radii.
 * ⚠️ NOT "two radii and some air". The agreed stagger is 27/45 — 18px apart — so two pins a few pixels
 * apart in x clear each other by their x distance alone (√(18² + 7²) ≈ 19.3). Any air added here
 * makes the long stem fail for every pair under ~11px apart and sends the second pin below the line,
 * which is the rarer, louder answer to a case the stagger was chosen for.
 */
export const PIN_CLEAR = PIN_DISC_R * 2;

/**
 * Turn placed events into drawn pins. `events` must be in x order (time order is x order).
 *
 * ⚠️ RULE 4 IS A COLLISION PASS OVER GLYPH CENTRES, NOT AN X-DISTANCE TEST. Two pins 4px apart in x
 * with stems of 27 and 45 put their discs 18px apart — overlapping — and an x-only rule calls that
 * fine. So each pin, in order, tries its candidates until one clears every glyph already placed:
 * the short stem on its natural side, the long stem on that side, then the same two on the other side
 * where the plot has room. "The later takes the long stem" falls out of that order. A pin with no
 * clear candidate JOINS the pin before it — a count is honest where two overlapping glyphs are not.
 */
export const layoutPins = (events: readonly PlacedEvent[], plotH: number): ChartPin[] => {
  /* runs: a chain of events each within PIN_NEAR of the one before it */
  const runs: PlacedEvent[][] = [];
  for (const e of events) {
    const run = runs[runs.length - 1];
    if (run && e.x - run[run.length - 1].x < PIN_NEAR) run.push(e); else runs.push([e]);
  }
  /* rules 3 and 2: within a run one event per query (its latest); three or more become one pin */
  const groups: PlacedEvent[][] = [];
  for (const run of runs) {
    const latest = new Map<string, PlacedEvent>();
    for (const e of run) latest.set(e.queryId, e);
    const kept = run.filter((e) => latest.get(e.queryId) === e);
    if (kept.length >= 3) groups.push(kept); else kept.forEach((e) => groups.push([e]));
  }

  const pins: ChartPin[] = [];
  const candidates = (at: PlacedEvent): { stem: number; below: boolean }[] => {
    const out: { stem: number; below: boolean }[] = [];
    for (const side of [false, true]) for (const stem of [STEM_SHORT, STEM_LONG]) {
      /* the natural side is UP unless the glyph would leave the top of the plot */
      const natural = at.y < flipWithin(stem);
      const below = side ? !natural : natural;
      const fits = below ? at.y + stem + PIN_DISC_R <= plotH : at.y - stem - PIN_DISC_R >= 0;
      if (fits || !side) out.push({ stem, below });
    }
    return out;
  };
  const clear = (x: number, gy: number): boolean =>
    pins.every((p) => Math.hypot(p.x - x, p.gy - gy) >= PIN_CLEAR);

  for (const members of groups) {
    const at = members[members.length - 1];
    const pick = candidates(at).find((c) => clear(at.x, c.below ? at.y + c.stem : at.y - c.stem));
    if (!pick) {
      /* nowhere clear: join the previous pin rather than draw over it (one query still reads once) */
      const prev = pins[pins.length - 1];
      if (prev) {
        const ids = new Set(members.map((m) => m.queryId));
        prev.members = [...prev.members.filter((m) => !ids.has(m.queryId)), ...members];
        prev.id = prev.members[prev.members.length - 1].id;
        continue;
      }
    }
    const c = pick ?? candidates(at)[0];
    pins.push({ id: at.id, x: at.x, y: at.y, gy: c.below ? at.y + c.stem : at.y - c.stem, stem: c.stem, below: c.below, members });
  }
  return pins;
};

/* ── what a pin says ── */

export interface PinCopy {
  /** "WED 19 AUG · PARTIAL REQUESTED" */
  eyebrow: string;
  who: string;
  /** the sentence, with the manuscript title as its own run so the renderer can italicise it */
  say: { before: string; title: string; after: string };
  /** "The Marsh Agency · 2 days after you queried" */
  where: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const pinDate = (ms: number): string => { const d = new Date(ms); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };

/**
 * ⚠️ THE WORDS SAY WHAT HAPPENED AND NOTHING ABOUT IT. No "rejected", no "overdue", no "only" — and
 * nothing the code does not do: a silence is "closed with no reply", because the app closes nothing
 * on its own and the writer closed it.
 */
export const PIN_KIND: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "Partial requested",
  [QueryStatus.FULL_REQUESTED]: "Full requested",
  [QueryStatus.OFFER]: "Offer",
  [QueryStatus.REJECTED]: "Passed",
  [QueryStatus.NO_RESPONSE]: "Closed · no reply",
};
const PIN_SAY: Partial<Record<QueryStatus, [string, string]>> = {
  [QueryStatus.PARTIAL_REQUESTED]: ["Asked to read part of ", ""],
  [QueryStatus.FULL_REQUESTED]: ["Asked to read the full manuscript of ", ""],
  [QueryStatus.OFFER]: ["Offered representation for ", ""],
  [QueryStatus.REJECTED]: ["Passed on ", ""],
  [QueryStatus.NO_RESPONSE]: ["Closed with no reply to your query for ", ""],
};

/** "2 minutes" · "5 hours" · "90 days" — a computed fact, from the send to the event. */
export const sinceQueried = (sentMs: number | null, eventMs: number): string | null => {
  if (sentMs === null || eventMs < sentMs) return null;
  const mins = Math.floor((eventMs - sentMs) / 60000);
  const n = (v: number, unit: string) => `${v.toLocaleString("en-GB")} ${unit}${v === 1 ? "" : "s"} after you queried`;
  if (mins < 1) return "under a minute after you queried";
  if (mins < 60) return n(mins, "minute");
  if (mins < 1440) return n(Math.floor(mins / 60), "hour");
  return n(Math.floor(mins / 1440), "day");
};

export const pinCopy = (
  e: PinEvent,
  queries: readonly Query[],
  agents: readonly Agent[],
  manuscripts: readonly Manuscript[],
): PinCopy => {
  const q = queries.find((x) => x.id === e.queryId);
  const agent = q ? agents.find((a) => a.id === q.agentId) : undefined;
  const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
  const name = (agent?.name ?? "").trim();
  const agency = (agent?.agency ?? "").trim();
  const [before, after] = PIN_SAY[e.status] ?? ["", ""];
  const since = sinceQueried(q ? sentAt(q) : null, e.timeMs);
  return {
    eyebrow: `${pinDate(e.timeMs)} · ${PIN_KIND[e.status] ?? e.status}`,
    /* an agency-less agent is valid, and so is a nameless one — whichever is on file leads */
    who: name || agency || "An agent",
    say: { before, title: (ms?.title ?? "").trim() || "your manuscript", after },
    where: [name ? agency : "", since].filter(Boolean).join(" · "),
  };
};
