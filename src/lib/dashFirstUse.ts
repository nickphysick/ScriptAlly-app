/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v60 — FIRST USE (ref design-refs/dashboard-v60/dashboard-v60.html).
 *
 * Three pure derivations, so the page computes nothing of its own:
 *
 *   - `isPreQuery` — the ONE predicate. Before the writer's first query on the active manuscript the
 *     dashboard shows its two doors and "Ready for lift off?"; the chart's own empty state is chosen by
 *     the same function (Dash58 hands its result to `OneScreenChart` as `empty`), so the two can never
 *     disagree. ⚠️ IT IS DATA, NEVER A FLAG: nothing about "first use" is stored.
 *   - `agentCoverage` — the "Agents on file" snapshot. Its figures are the Contact list's OWN: the
 *     standing per agent is `agentQueryStates` (via `deskModel`, which also gives "added this week" from
 *     the London Monday–Sunday weeks of `qcDeskWeeks`), and ready is `nextStep(...).ready`, the one ready
 *     rule. Nothing here re-derives either.
 *   - `firstUseTiles` — the four "Ready for lift off?" offers and their done states.
 */
import type { Agent, Manuscript, ManuscriptVersion, Query, SmartImportUsage, UserPlan } from "../types";
import { ComponentType } from "../types";
import { deskModel } from "./contactDesk";
import { nextStep } from "./contactNextStep";
import { bookGenres } from "./genreMatch";
import { getSmartImportEntitlement } from "./smartImportEntitlement";
import { manuscriptComps } from "./comps";
import { bookVersionsOf } from "./bookVersions";

/* ── the one predicate ─────────────────────────────────────────────────────────────────────── */

/** No query on the active manuscript that the chart would draw or count. */
export const isPreQuery = (scopedQueries: readonly Query[]): boolean => scopedQueries.length === 0;

/* ── Agents on file ────────────────────────────────────────────────────────────────────────── */

export interface AgentCoverage {
  total: number;
  /** an active query on this manuscript (its latest is not closed) */
  querying: number;
  /** its latest query on this manuscript is closed */
  closed: number;
  /** no query on this manuscript */
  none: number;
  /** querying + closed */
  queried: number;
  /** `nextStep(...).ready` — open, not queried, takes the book or genres unknown */
  ready: number;
  /** `dateAdded` in this London Monday–Sunday week */
  addedThisWeek: number;
  /** queried as a whole percentage of total (0 with no agents) */
  pct: number;
}

export function agentCoverage(input: {
  agents: readonly Agent[];
  queries: readonly Query[];
  manuscript: Manuscript | null;
  now: Date;
  todayIso: string;
}): AgentCoverage {
  const { agents, queries, manuscript, now, todayIso } = input;
  const msId = manuscript?.id ?? null;
  /* hk is Housekeeping's input to the desk's third card, which this snapshot does not read */
  const desk = deskModel({ agents, queries, msId, now, hk: { complete: 0, total: 0, gaps: 0, gapAgents: 0 } });
  const step = nextStep({ agents, queries, msId, book: bookGenres(manuscript), todayIso });
  const total = agents.length;
  const querying = desk.queried.active;
  const closed = desk.queried.closed;
  const queried = desk.queried.queried;
  return {
    total, querying, closed, none: total - queried, queried,
    ready: step.ready.length,
    addedThisWeek: desk.week.bars[desk.week.bars.length - 1] ?? 0,
    pct: total ? Math.round((queried / total) * 100) : 0,
  };
}

/* ── "Ready for lift off?" ─────────────────────────────────────────────────────────────────── */

export type TileKey = "import" | "mats" | "comps" | "version";

export interface FirstUseTile {
  key: TileKey;
  title: string;
  copy: string;
  /** the mono footer status, as written (the page uppercases it) */
  status: string;
  done: boolean;
  action: string;
}

/** The three materials a query package is made of — the Contact list's and packages' own three. */
export const PACKAGE_MATERIALS: readonly ComponentType[] = [ComponentType.QUERY_LETTER, ComponentType.SYNOPSIS, ComponentType.SAMPLE_PAGES];

export function firstUseTiles(input: {
  plan: UserPlan | undefined;
  usage: SmartImportUsage | null | undefined;
  manuscript: Manuscript | null;
  versions: readonly ManuscriptVersion[];
  now?: Date;
}): FirstUseTile[] {
  const { plan, usage, manuscript, versions } = input;
  const ent = getSmartImportEntitlement(plan, usage, input.now ?? new Date());
  const msId = manuscript?.id ?? null;
  const onFile = new Set(versions.filter((v) => msId && v.manuscriptId === msId).map((v) => v.componentType));
  const mats = PACKAGE_MATERIALS.filter((t) => onFile.has(t)).length;
  const comps = manuscript ? manuscriptComps(manuscript).length : 0;
  const bv = bookVersionsOf(manuscript).length;
  return [
    {
      key: "import", title: "Import your journey",
      copy: "Drop in the spreadsheet you've been tracking queries in. QueryHawk sorts it for you to check.",
      /* ⚠️ THE ENTITLEMENT'S OWN ANSWER (`allowed`), never a second reading of plan and usage */
      status: !ent.allowed ? "Used" : ent.reason === "pro_available" ? "One this month" : "One free import",
      done: !ent.allowed, action: "Smart import",
    },
    {
      key: "mats", title: "Add your materials",
      copy: "Query letter, synopsis and opening sample, kept as versions as you revise them.",
      status: `${mats} of 3 on file`, done: mats >= 3, action: "Add a material",
    },
    {
      key: "comps", title: "Build your comps",
      copy: "Comparable titles shape the pitch and the letter. Two is the usual ask.",
      status: `${comps} ${comps === 1 ? "comp" : "comps"}`, done: comps >= 2, action: "Add a comp",
    },
    {
      key: "version", title: "Record a version",
      copy: "Pin the draft you send, so every query knows which one went.",
      status: bv ? `v${bv} current` : "None yet", done: bv > 0, action: "Add a version",
    },
  ];
}

/** "{done} OF 4 · NOTHING REQUIRED" */
export const tilesDone = (tiles: readonly FirstUseTile[]): number => tiles.filter((t) => t.done).length;
