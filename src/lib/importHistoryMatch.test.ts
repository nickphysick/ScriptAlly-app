/**
 * IT1 · H-M1, H-M2, H-M3 (unit half) — which query a matcher history row belongs to.
 * Red on the baseline: the row went to the first query on a manuscript with that title, and the
 * agent was never read.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { matchHistoryRow, historySkipReason, ERR } from "./importMatcher";
import { focusReasonMeta } from "./smartImportReviewModel";
import { NO_AGENT_MATCH_REASON, validateSmartImport } from "./smartImport";
import { QueryStatus } from "../types";

const code = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const manuscripts = [{ id: "ms-pair", title: "The Salt Road" }, { id: "ms-solo", title: "Low Water" }, { id: "ms-none", title: "Unqueried" }];
const agents = [
  { id: "a-alder", name: "Clara Alder", agency: "Pemberton Literary" },
  { id: "a-birch", name: "Owen Birch", agency: "Carter & Vale" },
  { id: "a-cedar", name: "Ines Cedar", agency: "" },
];
/* A's query is listed FIRST for the pair, so "the first query on that title" is A's. */
const queries = [
  { id: "q-pair-a", manuscriptId: "ms-pair", agentId: "a-alder" },
  { id: "q-pair-b", manuscriptId: "ms-pair", agentId: "a-birch" },
  { id: "q-solo-a", manuscriptId: "ms-solo", agentId: "a-alder" },
];
const match = (title: string, agent?: string, qs = queries) => matchHistoryRow({ title, agent }, manuscripts, agents, qs);

describe("M1 · a manuscript with queries to two agents", () => {
  it("a row naming agent B lands on B's query, whichever query is listed first", () => {
    expect(match("The Salt Road", "Owen Birch")).toEqual({ kind: "attach", queryId: "q-pair-b", agentId: "a-birch" });
    expect(match("The Salt Road", "Clara Alder")).toEqual({ kind: "attach", queryId: "q-pair-a", agentId: "a-alder" });
    const reversed = [...queries].reverse();
    expect(match("The Salt Road", "Owen Birch", reversed)).toEqual({ kind: "attach", queryId: "q-pair-b", agentId: "a-birch" });
    expect(match("The Salt Road", "Clara Alder", reversed)).toEqual({ kind: "attach", queryId: "q-pair-a", agentId: "a-alder" });
  });
  it("the agent is matched as every import matches one: case and spaces aside", () => {
    expect(match("the salt road ", "  owen birch")).toEqual({ kind: "attach", queryId: "q-pair-b", agentId: "a-birch" });
  });
  it("an agent who is not on the list, or has no query for that manuscript, gets nothing", () => {
    expect(match("The Salt Road", "Nobody At All")).toEqual({ kind: "skip", why: "agent-unknown" });
    expect(match("The Salt Road", "Ines Cedar")).toEqual({ kind: "skip", why: "agent-no-query" });
    expect(match("Low Water", "Owen Birch"), "B has a query, but not for this manuscript").toEqual({ kind: "skip", why: "agent-no-query" });
  });
  it("two queries to the same agent for the same manuscript: nothing, rather than a guess", () => {
    const twice = [...queries, { id: "q-pair-b2", manuscriptId: "ms-pair", agentId: "a-birch" }];
    expect(match("The Salt Road", "Owen Birch", twice)).toEqual({ kind: "skip", why: "agent-several" });
  });
});

describe("M2 · the same manuscript and a row with no agent", () => {
  it("nothing is attached", () => {
    expect(match("The Salt Road")).toEqual({ kind: "skip", why: "no-agent-several" });
    expect(match("The Salt Road", "   ")).toEqual({ kind: "skip", why: "no-agent-several" });
  });
  it("the row goes to the notice with the review's own wording for a row that names nobody", () => {
    expect(historySkipReason("no-agent-several")).toBe("Who's this for?");
    expect(historySkipReason("no-agent-several")).toBe(focusReasonMeta("needs-identifying").pill);
  });
});

describe("M3 · a manuscript with one query and a row with no agent", () => {
  it("it attaches to that query, as before", () => {
    expect(match("Low Water")).toEqual({ kind: "attach", queryId: "q-solo-a", agentId: "a-alder" });
  });
  it("a manuscript with no query, or a title that is not here: nothing", () => {
    expect(match("Unqueried")).toEqual({ kind: "skip", why: "no-query" });
    expect(match("Not A Book")).toEqual({ kind: "skip", why: "no-query" });
    expect(match("")).toEqual({ kind: "skip", why: "no-query" });
  });
});

describe("the words a skipped row carries", () => {
  it("an agent not on the list takes the import's own reason; where no existing wording fits, none is made up", () => {
    expect(historySkipReason("agent-unknown")).toBe("Row didn't match an agent");
    expect(NO_AGENT_MATCH_REASON).toBe("Row didn't match an agent");
    /* …and it is the reason the import's own validation gives, read from that code's output */
    const v = validateSmartImport({ agents: [], queries: [{ agentRef: "x", status: QueryStatus.QUERIED, sentDate: null }] } as never);
    expect(v.skipped[0].reason).toBe(NO_AGENT_MATCH_REASON);
    expect(historySkipReason("agent-no-query")).toBe("");
    expect(historySkipReason("agent-several")).toBe("");
    expect(historySkipReason("no-query"), "as before: the run's log only").toBeNull();
  });
  it("the run's log lines", () => {
    expect(ERR.eventNoAgentSeveral(2, "The Salt Road")).toBe('Row 2 names no agent, and "The Salt Road" has more than one query, so the event can\'t be placed. Row not imported.');
    expect(ERR.eventAgentSeveral(3, "The Salt Road", "Owen Birch")).toBe('Row 3: there is more than one query to Owen Birch for "The Salt Road", so the event can\'t be placed. Row not imported.');
    expect(ERR.eventNoQuery(4)).toBe("Activity row 4: no query matches this manuscript and agent, so there is nothing to attach the event to. Import the query first, then this row.");
  });
});

describe("the matcher uses it", () => {
  const src = code("src/components/ImportCsv.tsx");
  const history = src.slice(src.indexOf('importType === "activities"'));
  it("a history row is matched by matchHistoryRow, and by nothing else", () => {
    expect(history).toMatch(/matchHistoryRow\(\{ title: msTitleInput, agent: agentNameInput \}, localManuscripts, localAgents, localQueries\)/);
    expect(history, "no match by title alone").not.toMatch(/localQueries\.find\(q => \{/);
    expect(history).toMatch(/const agentNameInput = getMappedValue\("agentId"\);/);
  });
  it("the history sheet has an agent column to match", () => {
    expect(src).toMatch(/activities: \["queryId", "manuscriptId", "agentId", "activityType", "description", "date", "details"\]/);
  });
  it("a skipped row is logged, counted and sent to the notice", () => {
    expect(history).toMatch(/failedCount\+\+;\s*errorsList\.push\(\s*whySkipped === "no-agent-several"/);
    expect(history).toMatch(/const reason = historySkipReason\(whySkipped\);\s*if \(reason !== null\) noticeRows\.push\(/);
  });
});
