/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Agents-page derivations: filtering, sort orders, tier grouping (pinned top,
 * set-aside bottom, 1★ folds into Long shots), Up next selection, activity-derived last status,
 * and the per-agent timeline build. Plus rule-text locks for the new `pinned` field (the repo's
 * no-emulator pattern — assert the real firestore.rules artefact).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  filterAgents,
  sortAgents,
  groupAgents,
  flattenGroups,
  upNextCandidate,
  lastStatusForAgent,
  buildAgentTimeline,
  agentQueryHistory,
  formatTimelineDate,
  agentsCountLabel,
  agentIdleCount,
  agentsPulse,
  upNextMeta,
  filterSentence,
  agentTerritory,
  agentsSummary,
} from "./agentsPage";
import { Agent, Query, Manuscript, Activity, ActivityType, QueryStatus, SubmissionStatus, SubmissionMethod } from "../types";

const mkAgent = (over: Partial<Agent>): Agent => ({
  id: "a1",
  userId: "u1",
  name: "Rosalind Achebe",
  agency: "Hartley & Co",
  email: "",
  website: "",
  genres: [],
  mswlNotes: "",
  starRating: 3,
  submissionStatus: SubmissionStatus.OPEN,
  responseTimeWeeks: 6,
  noResponseMeansNo: false,
  submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: [],
  dateAdded: "2026-01-01T00:00:00.000Z",
  lastCheckedDate: "2026-01-01T00:00:00.000Z",
  notes: "",
  ...over,
});

const mkQuery = (over: Partial<Query>): Query =>
  ({
    id: "q1",
    userId: "u1",
    manuscriptId: "m1",
    agentId: "a1",
    packageId: "",
    status: QueryStatus.QUERIED,
    dateSent: "2026-04-03T00:00:00.000Z",
    ...over,
  }) as Query;

const mkActivity = (over: Partial<Activity>): Activity => ({
  id: "act1",
  userId: "u1",
  queryId: "q1",
  manuscriptId: "m1",
  activityType: ActivityType.STATUS_CHANGED,
  description: "",
  date: "2026-04-03T00:00:00.000Z",
  details: "",
  ...over,
});

describe("agentsPage · filterAgents", () => {
  const open = mkAgent({ id: "a1", name: "Open Agent" });
  const closed = mkAgent({ id: "a2", name: "Closed Agent", submissionStatus: SubmissionStatus.CLOSED });
  const unknown = mkAgent({ id: "a3", name: "Unknown Agent", agency: "Foxglove", submissionStatus: SubmissionStatus.UNKNOWN });
  const queries = [mkQuery({ agentId: "a1" })];

  it("availability chips: open keeps only OPEN; closed keeps everything not open", () => {
    expect(filterAgents([open, closed, unknown], queries, "open", "all", "").map((a) => a.id)).toEqual(["a1"]);
    expect(filterAgents([open, closed, unknown], queries, "closed", "all", "").map((a) => a.id)).toEqual(["a2", "a3"]);
  });

  it("queried chips split on any query on record", () => {
    expect(filterAgents([open, closed], queries, "all", "yes", "").map((a) => a.id)).toEqual(["a1"]);
    expect(filterAgents([open, closed], queries, "all", "no", "").map((a) => a.id)).toEqual(["a2"]);
  });

  it("search matches name OR agency, case-insensitively", () => {
    expect(filterAgents([open, unknown], queries, "all", "all", "foxglove").map((a) => a.id)).toEqual(["a3"]);
    expect(filterAgents([open, unknown], queries, "all", "all", "OPEN AG").map((a) => a.id)).toEqual(["a1"]);
  });
});

describe("agentsPage · sortAgents", () => {
  const a = mkAgent({ id: "a", name: "Zed", starRating: 5, responseTimeWeeks: 8 });
  const b = mkAgent({ id: "b", name: "Anna", starRating: 4, responseTimeWeeks: 4 });
  const c = mkAgent({ id: "c", name: "Mia", starRating: 5, responseTimeWeeks: 0 }); // 0 = unknown → last

  it("rating: stars desc, name asc within a tier", () => {
    expect(sortAgents([b, a, c], "rating").map((x) => x.id)).toEqual(["c", "a", "b"]); // Mia before Zed (5★ A–Z)
  });
  it("az: alphabetical", () => {
    expect(sortAgents([a, b, c], "az").map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
  it("resp: fastest first, unknown (0) pushed to the end", () => {
    expect(sortAgents([a, b, c], "resp").map((x) => x.id)).toEqual(["b", "a", "c"]);
  });
});

describe("agentsPage · groupAgents (grouping driven by groupBy, not the sort)", () => {
  const pin = mkAgent({ id: "p", name: "Pinned Pat", starRating: 2, pinned: true });
  const five = mkAgent({ id: "f5", name: "Five Star", starRating: 5 });
  const one = mkAgent({ id: "f1", name: "One Star", starRating: 1 as 1 });
  const aside = mkAgent({ id: "sa", name: "Aside Al", starRating: 5, setAside: true });

  it("groupBy none: ONE flat run even under the rating sort; Pinned + set-aside groups kept", () => {
    const groups = groupAgents([five, one, pin, aside], "rating", "none", [], "");
    expect(groups.map((g) => g.key)).toEqual(["pinned", "flat", "aside"]);
    expect(groups[1].label).toBeNull();
    expect(flattenGroups(groups).map((a) => a.id)).toEqual(["p", "f5", "f1", "sa"]);
  });

  it("groupBy rating: star tiers with labels, 1★ folds into Long shots, set-aside sinks", () => {
    const groups = groupAgents([five, one, pin, aside], "rating", "rating", [], "");
    expect(groups.map((g) => g.key)).toEqual(["pinned", "tier-5", "tier-2", "aside"]);
    expect(groups[1].label).toBe("Top picks");
    expect(groups[1].stars).toBe("★★★★★");
    expect(groups[2].label).toBe("Long shots");
    expect(groups[2].rows.map((a) => a.id)).toEqual(["f1"]); // 1★ retained
  });

  it("groupBy location: Domestic / International / No location vs the home market", () => {
    const gb = mkAgent({ id: "gb", country: "GB" });
    const us = mkAgent({ id: "us", country: "US" });
    const none = mkAgent({ id: "nn" });
    const groups = groupAgents([gb, us, none], "az", "location", [], "GB");
    expect(groups.map((g) => g.label)).toEqual(["Domestic", "International", "No location"]);
    expect(groups[0].rows.map((a) => a.id)).toEqual(["gb"]);
    expect(groups[1].rows.map((a) => a.id)).toEqual(["us"]);
    expect(groups[2].rows.map((a) => a.id)).toEqual(["nn"]);
  });

  it("groupBy queried: Queried / Not queried sections", () => {
    const q = mkAgent({ id: "q" });
    const nq = mkAgent({ id: "nq" });
    const groups = groupAgents([q, nq], "az", "queried", [mkQuery({ agentId: "q" })], "");
    expect(groups.map((g) => g.label)).toEqual(["Queried", "Not queried"]);
    expect(groups[0].rows.map((a) => a.id)).toEqual(["q"]);
  });

  it("a pinned agent that is also set aside sinks (set-aside wins)", () => {
    const both = mkAgent({ id: "b", pinned: true, setAside: true });
    const groups = groupAgents([both, five], "rating", "rating", [], "");
    expect(groups.map((g) => g.key)).toEqual(["tier-5", "aside"]);
  });
});

describe("agentsPage · agentTerritory + location filter (deployed location foundation)", () => {
  it("classifies domestic / international / none vs the home market (legacy names resolve)", () => {
    expect(agentTerritory({ country: "GB" }, "GB")).toBe("domestic");
    expect(agentTerritory({ country: "US" }, "GB")).toBe("international");
    expect(agentTerritory({ country: "United Kingdom" }, "GB")).toBe("domestic");
    expect(agentTerritory({ country: undefined }, "GB")).toBe("none");
    expect(agentTerritory({ country: "" }, "GB")).toBe("none");
  });
  it("location filter keeps only the matching territory; no-country agents match neither", () => {
    const gb = mkAgent({ id: "gb", country: "GB" });
    const us = mkAgent({ id: "us", country: "US" });
    const none = mkAgent({ id: "nn" });
    const all = [gb, us, none];
    expect(filterAgents(all, [], "all", "all", "", "domestic", "GB").map((a) => a.id)).toEqual(["gb"]);
    expect(filterAgents(all, [], "all", "all", "", "international", "GB").map((a) => a.id)).toEqual(["us"]);
    expect(filterAgents(all, [], "all", "all", "", "all", "GB").map((a) => a.id)).toEqual(["gb", "us", "nn"]);
  });
});

describe("agentsPage · agentsSummary (only the clauses that apply)", () => {
  it("no filters, no group → count + sorted-by only", () => {
    const s = agentsSummary(12, "all", "all", "all", "rating", "none");
    expect(s.count).toBe("12 agents");
    expect(s.clauses).toEqual([{ label: "sorted by", value: "star rating" }]);
  });
  it("singular count", () => {
    expect(agentsSummary(1, "all", "all", "all", "az", "none").count).toBe("1 agent");
  });
  it("active filters join; grouped-by appears only when not None", () => {
    const s = agentsSummary(4, "open", "no", "international", "resp", "location");
    expect(s.clauses).toEqual([
      { label: "filtered by", value: "open, not queried, international" },
      { label: "sorted by", value: "response time" },
      { label: "grouped by", value: "location" },
    ]);
  });
});

describe("agentsPage · upNextCandidate", () => {
  const queries = [mkQuery({ agentId: "queried" })];
  const best = mkAgent({ id: "best", starRating: 5, responseTimeWeeks: 6 });
  const faster = mkAgent({ id: "faster", starRating: 5, responseTimeWeeks: 3 });
  const lower = mkAgent({ id: "lower", starRating: 4, responseTimeWeeks: 1 });
  const closed = mkAgent({ id: "closed", starRating: 5, submissionStatus: SubmissionStatus.CLOSED });
  const queried = mkAgent({ id: "queried", starRating: 5 });
  const aside = mkAgent({ id: "aside", starRating: 5, setAside: true });

  it("picks open ∧ not queried, highest rating, tie-break fastest response", () => {
    expect(upNextCandidate([best, faster, lower, closed, queried, aside], queries)?.id).toBe("faster");
  });

  it("returns null when nothing matches (card hides)", () => {
    expect(upNextCandidate([closed, queried, aside], queries)).toBeNull();
  });
});

describe("agentsPage · lastStatusForAgent (derived from activity history)", () => {
  const queries = [mkQuery({ id: "q1", agentId: "a1" }), mkQuery({ id: "q2", agentId: "a1", dateSent: "2026-06-09T00:00:00.000Z", status: QueryStatus.FULL_REQUESTED })];

  it("uses the newest status-bearing activity across the agent's queries", () => {
    const acts = [
      mkActivity({ id: "1", queryId: "q1", date: "2026-04-03T00:00:00.000Z", resultingStatus: QueryStatus.QUERIED }),
      mkActivity({ id: "2", queryId: "q2", date: "2026-06-10T00:00:00.000Z", resultingStatus: QueryStatus.FULL_REQUESTED }),
      mkActivity({ id: "3", queryId: "other", date: "2026-07-01T00:00:00.000Z", resultingStatus: QueryStatus.OFFER }), // other agent
      mkActivity({ id: "4", queryId: "q1", date: "2026-07-02T00:00:00.000Z" }), // non-status (nudge) — ignored
    ];
    expect(lastStatusForAgent("a1", queries, acts)).toBe(QueryStatus.FULL_REQUESTED);
  });

  it("falls back to the newest query's stored status when no status-bearing activity exists", () => {
    expect(lastStatusForAgent("a1", queries, [])).toBe(QueryStatus.FULL_REQUESTED);
  });

  it("null for a never-queried agent", () => {
    expect(lastStatusForAgent("nobody", queries, [])).toBeNull();
  });
});

describe("agentsPage · buildAgentTimeline", () => {
  const queries = [mkQuery({ id: "q1", agentId: "a1", manuscriptId: "m1" })];
  const manuscripts = [{ id: "m1", title: "Murphy's Day Out" } as Manuscript];

  it("status-bearing entries only, oldest first, titles resolved, details as the note", () => {
    const acts = [
      mkActivity({ id: "2", queryId: "q1", date: "2026-05-19T00:00:00.000Z", resultingStatus: QueryStatus.FULL_REQUESTED, details: "Requested full within six weeks." }),
      mkActivity({ id: "1", queryId: "q1", date: "2026-04-03T00:00:00.000Z", resultingStatus: QueryStatus.QUERIED }),
      mkActivity({ id: "3", queryId: "q1", date: "2026-06-01T00:00:00.000Z" }), // nudge — excluded
    ];
    const tl = buildAgentTimeline("a1", queries, manuscripts, acts);
    expect(tl.map((e) => e.label)).toEqual(["Queried", "Full Requested"]);
    expect(tl[0].manuscriptTitle).toBe("Murphy's Day Out");
    expect(tl[0].dateLabel).toBe("03 Apr 2026");
    expect(tl[0].note).toBeUndefined();
    expect(tl[1].note).toBe("Requested full within six weeks.");
  });

  it("empty for a never-queried agent", () => {
    expect(buildAgentTimeline("nobody", queries, manuscripts, [])).toEqual([]);
  });
});

describe("agentsPage · agentQueryHistory (6e — one row per query, routes to the Hub)", () => {
  const ms = [
    { id: "m1", title: "Murphy's Day Out" } as Manuscript,
    { id: "m2", title: "The Salt Houses" } as Manuscript,
  ];
  const NOW = new Date("2026-07-13T00:00:00.000Z").getTime();

  it("one row per query for THIS agent, newest first, ids routable to the Hub", () => {
    const qs = [
      mkQuery({ id: "q1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: "2026-04-03T00:00:00.000Z" }),
      mkQuery({ id: "q2", manuscriptId: "m2", status: QueryStatus.REJECTED, dateSent: "2026-01-12T00:00:00.000Z" }),
      mkQuery({ id: "q3", agentId: "OTHER", manuscriptId: "m1", status: QueryStatus.QUERIED }),
    ];
    const rows = agentQueryHistory("a1", qs, ms, NOW);
    expect(rows.map((r) => r.queryId)).toEqual(["q1", "q2"]); // q3 (other agent) excluded; newest first
    expect(rows[0].manuscriptTitle).toBe("Murphy's Day Out");
  });

  it("status line follows the CTA buckets, not raw status", () => {
    const qs = [
      mkQuery({ id: "q1", status: QueryStatus.QUERIED, dateSent: "2026-04-03T00:00:00.000Z" }),
      mkQuery({ id: "q2", status: QueryStatus.PARTIAL_REQUESTED, dateSent: "2026-04-03T00:00:00.000Z" }),
      mkQuery({ id: "q3", status: QueryStatus.REJECTED, dateSent: "2026-01-12T00:00:00.000Z" }),
    ];
    const byId = Object.fromEntries(agentQueryHistory("a1", qs, ms, NOW).map((r) => [r.queryId, r.statusLine]));
    expect(byId.q1).toBe("Waiting · 101 days");
    expect(byId.q2).toBe("Your move");
    expect(byId.q3).toBe(QueryStatus.REJECTED);
  });

  it("an undated query renders (no days), sorts last, blank date label", () => {
    const qs = [
      mkQuery({ id: "q1", status: QueryStatus.QUERIED, dateSent: "2026-04-03T00:00:00.000Z" }),
      mkQuery({ id: "q2", status: QueryStatus.QUERIED, dateSent: undefined }),
    ];
    const rows = agentQueryHistory("a1", qs, ms, NOW);
    expect(rows.map((r) => r.queryId)).toEqual(["q1", "q2"]);
    expect(rows[1].statusLine).toBe("Waiting");
    expect(rows[1].dateLabel).toBe("");
  });
});

describe("agentsPage · labels", () => {
  it("count is singular-safe", () => {
    expect(agentsCountLabel(1)).toBe("1 agent on file");
    expect(agentsCountLabel(12)).toBe("12 agents on file");
  });
  it("up-next meta line", () => {
    expect(upNextMeta(mkAgent({ starRating: 5 }))).toBe("5★ fit · open · not yet queried");
  });
  it("timeline date format", () => {
    expect(formatTimelineDate("2026-04-03T00:00:00.000Z")).toBe("03 Apr 2026");
  });
});

describe("firestore.rules · agent pinned flag (rule-text lock, no emulator)", () => {
  const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
  const start = rules.indexOf("function isValidAgent");
  const body = rules.slice(start, rules.indexOf("\n    }", start)).replace(/\s+/g, " ");
  const agentsMatch = rules.indexOf("match /agents/{agentId}");
  const updateBlock = rules.slice(agentsMatch, rules.indexOf("match /agents/{agentId}", agentsMatch + 1) === -1 ? undefined : rules.length);
  const allowlist = (updateBlock.match(/affectedKeys\(\)\.hasOnly\(\[([^\]]*)\]\)/) || [])[1] || "";

  it("isValidAgent admits an optional boolean pinned (absent-or-bool, rejects null)", () => {
    expect(body).toMatch(/!data\.keys\(\)\.hasAll\(\['pinned'\]\) \|\| data\.pinned is bool/);
  });

  it("the agent-update allowlist permits pinned", () => {
    expect(allowlist).toContain("'pinned'");
  });
});

describe("agentsPage · filterSentence (contextual list sentence)", () => {
  it("narrates the default lens", () => {
    expect(filterSentence("all", "all", "rating")).toBe("All agents, both queried and unqueried, sorted by star rating.");
  });
  it("narrates a narrowed lens (the spec example)", () => {
    expect(filterSentence("open", "no", "resp")).toBe("Agents open to submissions you haven't queried yet, sorted by response time.");
  });
  it("covers the remaining phrases", () => {
    expect(filterSentence("closed", "yes", "az")).toBe("Agents closed to submissions you've already queried, sorted A to Z.");
  });
});

/* ── Desk rule locks (ref pane-height-rules-v1.html, Rule 3) ──────────────────────────── */

import { READING_PANE_FLOOR_PX, clampPaneHeight, paneProvenance } from "./agentsPage";
import { readFileSync as readCss } from "node:fs";
import { resolve as resolvePath } from "node:path";

describe("desk rule — the document clamp", () => {
  it("sparse content renders at the floor (never stunted)", () => {
    expect(clampPaneHeight(220, 800)).toBe(READING_PANE_FLOOR_PX);
  });

  it("medium content hugs exactly", () => {
    expect(clampPaneHeight(521, 800)).toBe(521);
  });

  it("rich content caps at the viewport line (internal scroll past it)", () => {
    expect(clampPaneHeight(1400, 800)).toBe(800);
  });

  it("the floor constant matches the applied CSS variable (one source, two forms)", () => {
    const css = readCss(resolvePath(__dirname, "../components/agents/agentsV2.css"), "utf8");
    expect(css).toContain(`--ag-pane-floor: ${READING_PANE_FLOOR_PX}px`);
  });
});

describe("desk rule — provenance footer", () => {
  it("renders Added {date} · {n} queries from real fields", () => {
    expect(paneProvenance({ dateAdded: "2026-03-14" }, 3)).toBe("Added 14 Mar 2026 · 3 queries");
  });

  it("is singular-safe and omits a zero count", () => {
    expect(paneProvenance({ dateAdded: "2026-03-14" }, 1)).toBe("Added 14 Mar 2026 · 1 query");
    expect(paneProvenance({ dateAdded: "2026-03-14" }, 0)).toBe("Added 14 Mar 2026");
  });

  it("never renders an invalid date (guarded, per the row-date lesson)", () => {
    expect(paneProvenance({ dateAdded: "not-a-date" }, 2)).toBe("2 queries");
    expect(paneProvenance({ dateAdded: "" }, 0)).toBe("");
  });
});

describe("desk rule — compact emptiness artefacts", () => {
  it("the community skeleton tiles are gone (compact strip only)", () => {
    const agents = readCss(resolvePath(__dirname, "../components/Agents.tsx"), "utf8");
    expect(agents.includes("ag-ph-tile")).toBe(false);
    expect(agents.includes("ag-commstrip")).toBe(true);
    expect(agents.includes("ag-colophon")).toBe(true);
    expect(agents.includes("f12-lfoot")).toBe(true); // the F12 list footer replaced ag-listfoot
    // The pane-foot command bar is retired (F12): the slim meta footer carries the provenance.
    expect(agents.includes("ag-cmdbar")).toBe(false);
    expect(agents.includes("f12-panefoot")).toBe(true);
  });
});

describe("masthead pulse line — Your database · N on file · I idle", () => {
  it("idle = agents with no query (the Not-queried set), derived not stored", () => {
    const agents = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const queries = [{ agentId: "a" }, { agentId: "a" }]; // a queried twice, b & c idle
    expect(agentIdleCount(agents, queries)).toBe(2);
  });

  it("counts every agent idle when nothing has been queried", () => {
    expect(agentIdleCount([{ id: "a" }, { id: "b" }], [])).toBe(2);
    expect(agentIdleCount([], [])).toBe(0);
  });

  it("formats singular-safe: Your database · {label} · {i} idle", () => {
    expect(agentsPulse(9, 4)).toBe("Your database · 9 agents on file · 4 not queried");
    expect(agentsPulse(1, 0)).toBe("Your database · 1 agent on file · 0 not queried");
  });
});
