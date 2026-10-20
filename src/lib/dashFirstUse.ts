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
      copy: "Bring in the spreadsheet you've been tracking queries in.",
      /* ⚠️ THE ENTITLEMENT'S OWN ANSWER (`allowed`), never a second reading of plan and usage */
      status: !ent.allowed ? "Used" : ent.reason === "pro_available" ? "One this month" : "One free import",
      done: !ent.allowed, action: "Smart import",
    },
    {
      key: "mats", title: "Add your materials",
      copy: "Your letter, synopsis and opening sample, kept as versions.",
      status: `${mats} of 3 on file`, done: mats >= 3, action: "Add a material",
    },
    {
      key: "comps", title: "Build your comps",
      copy: "Most agents want two comparable titles in a query.",
      status: `${comps} ${comps === 1 ? "comp" : "comps"}`, done: comps >= 2, action: "Add a comp",
    },
    {
      key: "version", title: "Record a version",
      copy: "Save the draft you're sending, so you know which one each agent got.",
      status: bv ? `v${bv} current` : "None yet", done: bv > 0, action: "Add a version",
    },
  ];
}

/** "{done} OF 4 · OPTIONAL" */
export const tilesDone = (tiles: readonly FirstUseTile[]): number => tiles.filter((t) => t.done).length;

/* ── "Where do I start?" (v60.1) ───────────────────────────────────────────────────────────── */

/** What can be lit: the two left cards and the four tiles. */
export type StartTarget = "queries" | "agents" | `tile:${TileKey}`;
export type StartKey = "sent" | "agents" | "materials";
export type LabelTone = "navy" | "slate" | "pale";

export interface StartAnswer {
  key: StartKey;
  /** the disc's colour: the colour of the card the answer points to */
  tone: LabelTone;
  title: string;
  line: string;
  /** the small labels naming what will light up, each in its card's colours */
  labels: readonly { text: string; tone: LabelTone }[];
  /** what lights up, in order — the first carries "START HERE" */
  targets: readonly StartTarget[];
}

/**
 * The three answers and what each lights. Pure, so the table is unit-tested; the page only draws it.
 * ⚠️ IT WRITES NOTHING AND REMEMBERS NOTHING: no "seen" flag, no route, no navigation.
 */
export function startAnswers(hasAgents: boolean): StartAnswer[] {
  return [
    {
      key: "sent", tone: "navy",
      title: "I've already sent some queries",
      line: "Log them one by one, or import your spreadsheet.",
      labels: [{ text: "No queries yet", tone: "navy" }, { text: "Import your journey", tone: "pale" }],
      targets: ["queries", "tile:import"],
    },
    {
      key: "agents", tone: "slate",
      title: "I'm building my agent list first",
      line: hasAgents ? "Add more, and see who you haven't queried." : "Add the agents you want to query.",
      labels: [{ text: "Agents on file", tone: "slate" }],
      targets: ["agents"],
    },
    {
      key: "materials", tone: "pale",
      title: "I'm still getting my materials ready",
      line: "Your letter, synopsis, comps and draft.",
      labels: [{ text: "Materials", tone: "pale" }, { text: "Comps", tone: "pale" }, { text: "Version", tone: "pale" }],
      targets: ["tile:mats", "tile:comps", "tile:version"],
    },
  ];
}

/** Every target the spotlight can ring or dim (the founding panel is never one of them). */
export const START_TARGETS: readonly StartTarget[] = ["queries", "agents", "tile:import", "tile:mats", "tile:comps", "tile:version"];

/** "ring" for the answer's targets, "dim" for every other target, null with no answer chosen. */
export function spotOf(answer: StartKey | null, target: StartTarget, hasAgents: boolean): "ring" | "dim" | null {
  if (!answer) return null;
  const a = startAnswers(hasAgents).find((x) => x.key === answer);
  return a?.targets.includes(target) ? "ring" : "dim";
}
