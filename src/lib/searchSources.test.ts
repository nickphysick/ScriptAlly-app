/**
 * Search v1, Part B — what search can find (SV1-B1…B6). The corpus is built from already-loaded state, worded by the
 * owning pages' own helpers.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildCorpus, searchPalette, stateWords, type QueryRowFacts } from "./searchPalette";

const agentLabel = (a: { name?: string; agency?: string }) => ({ primary: a.name ?? "", secondary: a.agency ?? "" });
const facts = (over: Partial<QueryRowFacts>): QueryRowFacts => ({
  sent: "14 Sep", sentLine: "66 days ago", sentMs: Date.parse("2026-09-14T09:00:00Z"),
  next: { label: "Next", value: "Send the full", line: null }, heard: { value: "2 Nov", line: "full requested" },
  quiet: false, court: "you", ...over,
});
const base = {
  agentLabel,
  agents: [
    { id: "a1", name: "Imogen Marsh", agency: "Marsh & Vale Literary", city: "London", submissionStatus: "Open", responseTimeWeeks: 8, materialsWanted: ["Query letter", "Synopsis"] },
    { id: "a2", name: "Daniel Okafor", agency: "Harbour Street Literary", city: "Manchester" },
    { id: "a3", name: "Tobias Wren", agency: "Wren & Calloway", city: "Bristol" },
  ],
  queries: [
    { id: "q1", agentId: "a1", manuscriptId: "m1", status: "Full Requested", packageId: "p2" },
    { id: "q2", agentId: "a2", manuscriptId: "m1", status: "Queried", packageId: "p1" },
    { id: "q3", agentId: "a3", manuscriptId: "m1", status: "Rejected", packageId: "p1" },
  ],
  rows: new Map([
    ["q1", facts({})],
    ["q2", facts({ sent: "1 Sep", sentMs: Date.parse("2026-09-01T09:00:00Z"), quiet: true, court: "agent" })],
    ["q3", facts({ court: "closed" })],
  ]),
  activeManuscriptId: "m1", activeManuscriptTitle: "Murphy’s Day Out",
  packageNames: new Map([["p1", "My first package"], ["p2", "Round two"]]),
  tasks: [{ key: "t1", title: "Send the full manuscript to Imogen Marsh", due: "20 Nov", about: "Imogen Marsh" }, { key: "t2", title: "Cut the synopsis", due: null, about: null }],
  notes: [{ id: "n1", text: "Agents who like Irish settings", colour: "#faf0cf" }],
  letters: [{ id: "l1", name: "Hook-first", line: "saved 2 Sep · sent with 4 queries", facts: [] }],
  packages: [{ id: "p2", name: "Round two", line: "Hook-first · sample from Draft 3", facts: [] }],
  help: [{ slug: "gone-quiet", title: "How Gone quiet works", body: "A query goes quiet when the usual reply time has passed." }],
};
const corpus = buildCorpus(base);
const byId = (id: string) => corpus.find((i) => i.id === id)!;
const found = (term: string, scope: Parameters<typeof searchPalette>[2] = "all") =>
  searchPalette(corpus, term, scope).rows.flatMap((r) => (r.type === "item" ? [r.item.id] : []));

describe("Search v1 — what there is to find", () => {
  it("SV1-B1 · agents: name, agency · city; ⌘↵ opens their query on the active manuscript", () => {
    const a = byId("agent:a1");
    expect([a.title, a.subtitle, a.status]).toEqual(["Imogen Marsh", "Marsh & Vale Literary · London", "Full Requested"]);
    expect(a.second).toEqual({ label: "Open the query", run: { kind: "query", queryId: "q1" } });
    expect(a.run).toEqual({ kind: "agentCard", agentId: "a1" });
    expect(a.peek).toMatchObject({ kind: "agent", queriedLine: "Queried 14 Sep for Murphy’s Day Out" });
  });

  it("SV1-B2 · queries: “Queried {date} · {package}”, “Gone quiet · queried …” when quiet; closed has no second action", () => {
    expect(byId("query:q1").subtitle).toBe("Queried 14 Sep · Round two");
    expect(byId("query:q2").subtitle).toBe("Gone quiet · queried 1 Sep · My first package");
    expect(byId("query:q1").second?.label).toBe("Record a response");
    expect(byId("query:q3").second).toBeUndefined();
  });

  it("SV1-B3 · a query is found by its status, stage, state, month and package — state words from the row only", () => {
    expect(stateWords({ court: "you", quiet: false })).toBe("your move with you needs you");
    expect(stateWords({ court: "agent", quiet: true })).toBe("gone quiet nudge");
    expect(found("gone quiet")).toContain("query:q2");
    expect(found("needs you")).toContain("query:q1");
    expect(found("september round")).toEqual(expect.arrayContaining(["query:q1"]));
    expect(found("closed", "Queries")).toEqual(["query:q3"]);
  });

  it("SV1-B4 · tasks, notes, materials and help are rows of their own", () => {
    expect(byId("task:t1").subtitle).toBe("Due 20 Nov");
    expect(byId("task:t2").subtitle).toBe("No date");
    expect(byId("note:n1")).toMatchObject({ subtitle: "On your Corkboard", colour: "#faf0cf" });
    expect(byId("letter:l1").subtitle).toBe("Query letter · saved 2 Sep · sent with 4 queries");
    expect(byId("package:p2").subtitle).toBe("Package · Hook-first · sample from Draft 3");
    expect(found("irish")).toContain("note:n1");
    expect(found("reply time", "Help")).toEqual(["help:gone-quiet"]);
  });

  it("SV1-B5 · the peek's facts say “Not stated” for an absent value, and never a verdict", () => {
    const p = byId("agent:a2").peek!;
    expect(p.kind === "agent" && p.facts.map((f) => f.value)).toEqual(["Not stated", "Not stated", "Not stated"]);
    const all = JSON.stringify(corpus.map((i) => i.peek));
    expect(all).not.toMatch(/overdue|\bhe\b|\bshe\b|watch(es|ing) for/i);
  });

  it("SV1-B6 · the task chain is the To-do list's own: useWsCore runs the same calls in the same order", () => {
    const order = ["assembleBoardColumns(", "trayItem(", "queriesMissingMaterials(", "wsTasks("];
    const at = (src: string) => order.map((s) => src.indexOf(s));
    const mine = at(readFileSync("src/lib/searchSources.ts", "utf8"));
    const theirs = at(readFileSync("src/components/todo/ws/useWsCore.ts", "utf8"));
    for (const [i, s] of order.entries()) {
      expect(theirs[i], `useWsCore still calls ${s}`).toBeGreaterThan(-1);
      expect(mine[i], `searchSources calls ${s}`).toBeGreaterThan(-1);
    }
    expect([...theirs].sort((a, b) => a - b)).toEqual(theirs);
    expect([...mine].sort((a, b) => a - b)).toEqual(mine);
  });
});
