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
  formatTimelineDate,
  agentsCountLabel,
  upNextMeta,
  filterSentence,
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

describe("agentsPage · groupAgents", () => {
  const pin = mkAgent({ id: "p", name: "Pinned Pat", starRating: 2, pinned: true });
  const five = mkAgent({ id: "f5", name: "Five Star", starRating: 5 });
  const one = mkAgent({ id: "f1", name: "One Star", starRating: 1 as 1 });
  const aside = mkAgent({ id: "sa", name: "Aside Al", starRating: 5, setAside: true });

  it("rating sort: Pinned on top, tiers with labels, 1★ folds into Long shots, set-aside sinks", () => {
    const groups = groupAgents([five, one, pin, aside], "rating");
    expect(groups.map((g) => g.key)).toEqual(["pinned", "tier-5", "tier-2", "aside"]);
    expect(groups[0].rows.map((a) => a.id)).toEqual(["p"]);
    expect(groups[1].label).toBe("Top picks");
    expect(groups[1].stars).toBe("★★★★★");
    expect(groups[2].label).toBe("Long shots");
    expect(groups[2].rows.map((a) => a.id)).toEqual(["f1"]); // 1★ retained
    expect(groups[3].rows.map((a) => a.id)).toEqual(["sa"]);
  });

  it("az / resp sorts render flat (no tier headers) but keep Pinned + set-aside groups", () => {
    const groups = groupAgents([five, one, pin, aside], "az");
    expect(groups.map((g) => g.key)).toEqual(["pinned", "flat", "aside"]);
    expect(groups[1].label).toBeNull();
    expect(flattenGroups(groups).map((a) => a.id)).toEqual(["p", "f5", "f1", "sa"]);
  });

  it("a pinned agent that is also set aside sinks (set-aside wins)", () => {
    const both = mkAgent({ id: "b", pinned: true, setAside: true });
    const groups = groupAgents([both, five], "rating");
    expect(groups.map((g) => g.key)).toEqual(["tier-5", "aside"]);
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
    expect(agents.includes("ag-listfoot")).toBe(true);
    expect(agents.includes("ag-panefoot")).toBe(true);
  });
});
