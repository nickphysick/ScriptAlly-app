/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v16 §B — "AT A GLANCE": the four cells' figures, lines, bars and faces.
 *
 * ⚠️ THE THREE GROUPS ARE THE LIST'S OWN STANDING (`AgentFacts.standing`, the "Query status" column): none · open ·
 *    closed. So a cell's figure, the rows its press leaves, and the status each of those rows prints are one
 *    derivation, and cell 1 is the three added up by construction.
 * ⚠️ WEEKS AND THE MONTH ARE LONDON'S (lib/qcDeskWeeks): a week runs Monday to Sunday by the London calendar, and
 *    "this month" starts at London midnight on the 1st. An unreadable or future `dateAdded` falls in no week.
 * ⚠️ "READY" IS THE PAGE'S ONE RULE (`isReady`, through the next step's own set): open, not queried, and a genre
 *    fit or no genres on file. It is handed in, never restated here.
 */
import type { Agent } from "../types";
import { agentInitials } from "./agentDisplay";
import { agentRows, surnameOf, type AgentFacts } from "./contactList";
import type { QcRow } from "./qcSummary";
import { deskWeeks, monthStart, weekLabel } from "./qcDeskWeeks";

export const GLANCE_WEEKS = 20;
export type GlanceKey = "none" | "live" | "closed";
export const GLANCE_KEYS: readonly GlanceKey[] = ["none", "live", "closed"];
export const GLANCE_LABEL: Record<"all" | GlanceKey, string> = { all: "On file", none: "Not queried", live: "Querying", closed: "Closed" };
/** the full-screen chips' words (Part E): "{n} not queried" */
export const GLANCE_CHIP: Record<GlanceKey, string> = { none: "not queried", live: "querying", closed: "closed" };

export interface GlanceFace { id: string; initials: string; name: string }
export interface GlancePart { n: number; text: string; hot?: boolean }
export interface GlanceWeek { start: number; n: number; tip: string }
export interface GlanceCell { key: GlanceKey; n: number; parts: [GlancePart, GlancePart]; faces: GlanceFace[] }
export interface GlanceModel {
  total: number;
  week: number;
  month: number;
  weeks: GlanceWeek[];
  cells: [GlanceCell, GlanceCell, GlanceCell];
}

/** which of the three groups an agent is in: the list's own standing */
export const glanceOf = (x: Pick<AgentFacts, "standing">): GlanceKey =>
  x.standing.kind === "none" ? "none" : x.standing.kind === "closed" ? "closed" : "live";

const at = (iso: string | null | undefined): number | null => {
  const t = Date.parse(String(iso ?? ""));
  return Number.isFinite(t) ? t : null;
};
const face = (a: Agent): GlanceFace => ({ id: a.id, initials: agentInitials(a).slice(0, 2), name: (a.name ?? "").trim() || (a.agency ?? "").trim() });
const bySurname = (a: AgentFacts, b: AgentFacts) => surnameOf(a.agent).localeCompare(surnameOf(b.agent));

export interface GlanceInput {
  facts: readonly AgentFacts[];
  rows: readonly QcRow[];
  msId: string | null;
  /** the agents who are ready to query, in the next step's own order */
  readyIds: readonly string[];
  nowMs: number;
}

export function glanceModel({ facts, rows, msId, readyIds, nowMs }: GlanceInput): GlanceModel {
  /* ── On file: added this week, this month, and per London week for twenty weeks ── */
  const starts = deskWeeks(nowMs, GLANCE_WEEKS);
  const counts = starts.map(() => 0);
  const month0 = monthStart(nowMs);
  let month = 0;
  for (const x of facts) {
    const t = at(x.agent.dateAdded);
    if (t === null || t > nowMs) continue;
    if (t >= month0) month += 1;
    if (t < starts[0]) continue;
    let i = starts.length - 1;
    while (i > 0 && t < starts[i]) i -= 1;
    counts[i] += 1;
  }
  const weeks = starts.map((start, i) => ({ start, n: counts[i], tip: `${weekLabel(start)} · ${counts[i]} added` }));

  const of = (k: GlanceKey) => facts.filter((x) => glanceOf(x) === k);
  const none = of("none"), live = of("live"), closed = of("closed");

  /* ── Not queried: ready ones first (the next step's order), then the rest by surname ── */
  const readyRank = new Map(readyIds.map((id, i) => [id, i]));
  const ready = none.filter((x) => readyRank.has(x.agent.id)).sort((a, b) => readyRank.get(a.agent.id)! - readyRank.get(b.agent.id)!);
  const notReady = none.filter((x) => !readyRank.has(x.agent.id)).sort(bySurname);
  const shut = none.filter((x) => x.openKey === "closed").length;

  /* ── Querying: waiting on you (a request to send, or an offer to answer), and past their reply time ── */
  const liveRows = (x: AgentFacts) => agentRows(rows, x.agent.id, msId).filter((r) => r.court !== "closed");
  const isYou = (x: AgentFacts) => liveRows(x).some((r) => r.court === "you" || r.court === "offer");
  const you = live.filter(isYou), late = live.filter((x) => x.pastExpected);
  const youIds = new Set(you.map((x) => x.agent.id)), lateIds = new Set(late.map((x) => x.agent.id));
  const rank = (x: AgentFacts) => (youIds.has(x.agent.id) ? 0 : lateIds.has(x.agent.id) ? 1 : 2);
  const liveOrder = [...live].sort((a, b) => rank(a) - rank(b) || bySurname(a, b));

  /* ── Closed: passed, and closed with no reply (a withdrawn query is in the figure and in neither) ── */
  const passed = closed.filter((x) => x.q?.closedHow === "passed").length;
  const noReply = closed.filter((x) => x.q?.closedHow === "noReply").length;
  const closedOrder = [...closed].sort((a, b) => (b.lastMs ?? 0) - (a.lastMs ?? 0) || bySurname(a, b));

  return {
    total: facts.length,
    week: counts[counts.length - 1],
    month,
    weeks,
    cells: [
      { key: "none", n: none.length, parts: [{ n: ready.length, text: "ready to query" }, { n: shut, text: "closed to submissions" }], faces: [...ready, ...notReady].map((x) => face(x.agent)) },
      { key: "live", n: live.length, parts: [{ n: you.length, text: "waiting on you", hot: you.length > 0 }, { n: late.length, text: "past their reply time" }], faces: liveOrder.map((x) => face(x.agent)) },
      { key: "closed", n: closed.length, parts: [{ n: passed, text: "passed" }, { n: noReply, text: "no reply" }], faces: closedOrder.map((x) => face(x.agent)) },
    ],
  };
}
