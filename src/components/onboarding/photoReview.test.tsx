/**
 * Smart Import from photos, phase 3 — the writer's own writing on the review cards
 * (smart-import-photos-v1; ref #agents, #queries).
 *
 * Locks: each new code renders its question and its answers resolve it; the crossed-out tick answers
 * every open crossed-out line and drops the count; "I never sent it" imports the agent and not the
 * query; a card shows the cut-out with a src, the line quoted without one, nothing with neither; the
 * committed documents carry no src / lineRaw / readings / markRaw; the photos' URLs are revoked when
 * the flow ends.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// commitSmartImport writes through Firestore; every write is captured here instead.
const writes = vi.hoisted(() => [] as unknown[]);
vi.mock("../../lib/firebase", () => ({ db: {}, handleFirestoreError: () => {}, OperationType: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (..._a: unknown[]) => ({ id: `d${Math.random()}` }),
  collection: () => ({}),
  setDoc: async (_ref: unknown, data: unknown) => { writes.push(data); },
  updateDoc: async (_ref: unknown, data: unknown) => { writes.push(data); },
  getDocs: async () => ({ docs: [] }),
  deleteDoc: async () => {},
  deleteField: () => null,
  Timestamp: { fromMillis: (ms: number) => ({ ms }), now: () => ({ ms: 0 }) },
}));

import { QueryStatus } from "../../types";
import type { SmartImportResult } from "../../types/smartImport";
import { parseModel, modelToResult, applyCrossedAnswer, settleAgentReason, openCrossedOthers } from "../../lib/smartImportReviewModel";
import { agentAsk, openAgentQuestions, openQueryQuestions, AGENT_ASK_CHIP, queriesAnswerLine, comingUpQueries } from "../../lib/reviewGate";
import { focusReasonMeta } from "../../lib/smartImportReviewModel";
import { ReadingQuestion, IllegibleAgencyQuestion, QueryQuestion, crossedAllLabel, markWording, splitReading } from "./v9/DeckQuestions";
import { PhotoLead } from "./v9/PhotoSnip";
import { snipRect } from "../../lib/photoImport";
import { commitSmartImport } from "../../lib/smartImportCommit";

const noop = () => {};
const html = (n: React.ReactElement) => renderToStaticMarkup(n).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
/** The question's and its reason's own sentences, as a reader sees them (no space at a tag edge). */
const para = (cls: string) => (h: string) => (h.match(new RegExp(`<p class="${cls}"[^>]*>([\\s\\S]*?)</p>`))?.[1] ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
const ask = para("o9-ask"), why = para("o9-why");

/** A photo read: Hannah's name reads two ways, Imogen's agency can't be made out, two lines are
 *  crossed out, one has a ✗. */
const PHOTO: SmartImportResult = {
  agents: [
    { ref: "a1", name: "Hannah Biddle", agency: "Greaves", readings: ["Hannah Biddle, Greaves", "Hannah Riddle, Greaves"] },
    { ref: "a2", name: "Imogen Price", agency: "Price & P" },
    { ref: "a3", name: "Rhys Hale", agency: "Hale Agency" },
    { ref: "a4", name: "Tom Rafferty", agency: "" },
    { ref: "a5", name: "Leo Marchetti", agency: "Marchetti Lit" },
    { ref: "a6", name: "Cordelia Vane", agency: "Vane & Hart" },
  ],
  queries: [
    { agentRef: "a1", status: QueryStatus.QUERIED, sentDate: "2026-04-03", sentDateRaw: "3/4", reasons: ["check-reading"], src: { p: 1, y: [0.2, 0.25] }, lineRaw: "Hannah Biddle – Greaves – 3/4" },
    { agentRef: "a2", status: QueryStatus.QUERIED, sentDate: "2026-08-19", reasons: ["illegible-agency"], lineRaw: "Imogen Price – Price & P.. – 19/8" },
    { agentRef: "a3", status: QueryStatus.REJECTED, sentDate: "2026-08-08", reasons: ["crossed-out"], src: { p: 1, y: [0.3, 0.35] } },
    { agentRef: "a4", status: QueryStatus.REJECTED, sentDate: "2026-07-14", reasons: ["crossed-out"], src: { p: 2, y: [0.1, 0.15] } },
    { agentRef: "a5", status: QueryStatus.PARTIAL_SENT, sentDate: "2026-09-11", reasons: ["mark-unclear"], markRaw: "✗", lineRaw: "Leo Marchetti – sent partial 11/9 ✗" },
    { agentRef: "a6", status: QueryStatus.QUERIED, sentDate: "2026-08-12" },
  ],
};
const PHOTOS = [{ shown: 1, url: "blob:p1", width: 1176, height: 1568 }, { shown: 2, url: "blob:p2", width: 1176, height: 1568 }];

describe("the model: agent questions move onto the agent", () => {
  const m = parseModel(PHOTO);
  const ag = (id: string) => m.agents.find((a) => a.id === id)!;
  it("a name to check and an agency to check are asked on the Agents step", () => {
    expect(agentAsk(ag("a1"))).toBe("reading");
    expect(agentAsk(ag("a2"))).toBe("illegible");
    expect(ag("a1").readings).toEqual(["Hannah Biddle, Greaves", "Hannah Riddle, Greaves"]);
    expect(m.queries[0].reasons.map((r) => r.code)).toEqual([]);
    expect(openAgentQuestions(m.agents).map((q) => [q.id, q.ask])).toEqual([["a1", "reading"], ["a2", "illegible"], ["a4", "no-agency"]]);
    expect([AGENT_ASK_CHIP.reading, AGENT_ASK_CHIP.illegible]).toEqual(["Name to check", "Agency to check"]);
  });
  it("a crossed-out line and a mark are asked on the Queries step, each a question the gate counts", () => {
    expect(openQueryQuestions(m.queries.filter((q) => !q.removed)).map((q) => q.code)).toEqual(["crossed-out", "crossed-out", "mark-unclear"]);
    expect([focusReasonMeta("crossed-out").pill, focusReasonMeta("mark-unclear").pill]).toEqual(["Crossed out", "Mark to explain"]);
    expect(queriesAnswerLine(openQueryQuestions(m.queries))).toBe("2 crossed-out lines, 1 mark to explain. One pick each.");
    expect(comingUpQueries(openQueryQuestions(m.queries).slice(1))).toEqual(["1 more crossed-out line", "1 more mark to explain"]);
  });
  it("src, lineRaw and markRaw ride the review's query", () => {
    expect(m.queries[0].src).toEqual({ p: 1, y: [0.2, 0.25] });
    expect(m.queries[4].markRaw).toBe("✗");
  });
});

describe("Name to check", () => {
  const a = parseModel(PHOTO).agents[0];
  const h = html(<ReadingQuestion agent={a} onSave={noop} />);
  it("asks with the reading quoted, and never a he or she", () => {
    expect(ask(h)).toBe("We read this as “Hannah Biddle” at “Greaves”. Is that right?");
    expect(why(h)).toBe("Handwriting can read more than one way. Get the name right now and they're easy to find later.");
    expect(text(h)).not.toMatch(/\b(she|he|her|him|his|hers)\b/i);
  });
  it("offers each reading as a pick, then Neither · type it", () => {
    expect([...h.matchAll(/data-reading="([^"]+)"/g)].map((x) => x[1])).toEqual(["Hannah Biddle, Greaves", "Hannah Riddle, Greaves"]);
    expect(text(h)).toContain("Neither · type it");
  });
  it("drops ' at …' when there is no agency", () => {
    expect(ask(html(<ReadingQuestion agent={{ ...a, agency: "" }} onSave={noop} />))).toBe("We read this as “Hannah Biddle”. Is that right?");
  });
  it("a pick answers it: the name is set and the question is gone", () => {
    const m = parseModel(PHOTO);
    const next = settleAgentReason(m.agents, "a1", "reading", splitReading("Hannah Riddle, Greaves", "Greaves"));
    expect(next[0].name).toBe("Hannah Riddle");
    expect(agentAsk(next[0])).toBeNull();
    expect(openAgentQuestions(next)).toHaveLength(openAgentQuestions(m.agents).length - 1);
  });
});

describe("Agency to check", () => {
  const a = parseModel(PHOTO).agents[1];
  const h = html(<IllegibleAgencyQuestion agent={a} onSave={noop} onCarryOn={noop} />);
  it("asks, quotes the legible start, and pre-fills the field with it", () => {
    expect(ask(h)).toBe("We couldn't make out the agency next to Imogen Price.");
    expect(why(h)).toBe("It looks like it starts “Price & P”. Add it if you know it, or carry on without one.");
    expect(h).toMatch(/<input[^>]*value="Price &amp; P"/);
    expect(text(h)).toContain("Save agency");
    expect(text(h)).toContain('Carry on without an agency Kept as "No agency". You can add it any time.');
  });
  it("with nothing legible, the second sentence has no quote", () => {
    const t = text(html(<IllegibleAgencyQuestion agent={{ ...a, agency: "" }} onSave={noop} onCarryOn={noop} />));
    expect(t).toContain("Add it if you know it, or carry on without one.");
    expect(t).not.toContain("It looks like it starts");
  });
  it("Save agency, or carrying on without one, answers it — and the plain no-agency question does not follow", () => {
    const m = parseModel(PHOTO);
    expect(agentAsk(settleAgentReason(m.agents, "a2", "illegible", { agency: "Price & Partners" })[1])).toBeNull();
    expect(agentAsk(settleAgentReason(m.agents, "a2", "illegible", { agency: "", agencyWaived: true })[1])).toBeNull();
  });
});

describe("Crossed out", () => {
  const m = parseModel(PHOTO);
  const q = m.queries[2];
  const others = openCrossedOthers(m.queries, q.id).map(() => "Tom Rafferty");
  const h = html(<QueryQuestion query={q} code="crossed-out" onPatch={noop} onResolveReason={noop} onSwapDates={noop} agentName="Rhys Hale" crossedOthers={others} onCrossed={noop} />);
  it("asks, and offers Passed, No response and I never sent it", () => {
    expect(text(h)).toContain("This line is crossed out. What does that mean for Rhys Hale?");
    expect(text(h)).toContain("People cross lines out for different reasons. Tell us once and the query is tracked the right way.");
    expect([...h.matchAll(/data-crossed="([^"]+)"/g)].map((x) => x[1])).toEqual(["rejected", "no-response", "never"]);
  });
  it("with other crossed-out lines, a tick (on by default) answers them all", () => {
    expect(h).toMatch(/<input type="checkbox" checked=""\/>/);
    expect(text(h)).toContain("Use the same answer for the other crossed-out line (Tom Rafferty)");
    expect(crossedAllLabel(["A", "B", "C", "D"])).toBe("Use the same answer for the other crossed-out lines (A, B, C, …)");
    const alone = html(<QueryQuestion query={q} code="crossed-out" onPatch={noop} onResolveReason={noop} onSwapDates={noop} agentName="Rhys Hale" crossedOthers={[]} onCrossed={noop} />);
    expect(alone).not.toContain("checkbox");
  });
  it("applied to all, every crossed-out card is answered and the count drops by both", () => {
    const before = openQueryQuestions(m.queries).length;
    const ids = [q.id, ...openCrossedOthers(m.queries, q.id).map((x) => x.id)];
    const after = applyCrossedAnswer(m.queries, ids, "no-response");
    expect(openQueryQuestions(after).length).toBe(before - 2);
    expect(after.filter((x) => ids.includes(x.id)).map((x) => x.status)).toEqual([QueryStatus.NO_RESPONSE, QueryStatus.NO_RESPONSE]);
  });
  it("one at a time answers only that one", () => {
    expect(openQueryQuestions(applyCrossedAnswer(m.queries, [q.id], "rejected")).length).toBe(openQueryQuestions(m.queries).length - 1);
  });
  it("I never sent it: the agent is imported, the query is not", () => {
    const qs = applyCrossedAnswer(m.queries, [q.id], "never");
    const out = modelToResult(PHOTO, m.agents, qs);
    expect(out.agents.map((a) => a.ref)).toContain("a3");
    expect(out.queries.map((x) => x.agentRef)).not.toContain("a3");
  });
});

describe("Mark to explain", () => {
  const q = parseModel(PHOTO).queries[4];
  const h = html(<QueryQuestion query={q} code="mark-unclear" onPatch={noop} onResolveReason={noop} onSwapDates={noop} agentName="Leo Marchetti" agentAgency="Marchetti Lit" />);
  it("quotes the mark and the words it follows, and offers the status set", () => {
    expect(ask(h)).toBe("There's a “✗” after “sent partial 11/9”. Where does this one stand?");
    expect(markWording({ lineRaw: "Callum Thorne – Fairbairn Associates – 13/4 – R&R ✗", markRaw: "✗" }, { name: "Callum Thorne", agency: "Fairbairn Associates" })).toBe("13/4 – R&R");
    expect(why(h)).toBe("Statuses are picked, never guessed.");
    expect((h.match(/data-status="/g) ?? []).length).toBe(10);
    expect(markWording({ notes: "sent partial 11/9", markRaw: "✗" })).toBe("sent partial 11/9");
  });
});

describe("the writer's own line above the question", () => {
  it("with a src: the cut-out, its page, and See the whole page", () => {
    const h = html(<PhotoLead src={{ p: 2, y: [0.1, 0.15] }} lineRaw="x" photos={PHOTOS} onSeePage={noop} />);
    expect(h).toMatch(/<figure class="o9-snip" data-im="deck-snip" data-page="2"><canvas width="640" height="\d+"/);
    expect(text(h)).toContain("Your page 2. See the whole page");
  });
  it("without one (or one pointing at no page): the line quoted in the mono pill", () => {
    for (const src of [undefined, { p: 5, y: [0.1, 0.2] as [number, number] }]) {
      expect(html(<PhotoLead src={src} lineRaw="Imogen Price – Price & P.. – 19/8" photos={PHOTOS} onSeePage={noop} />))
        .toBe('<p class="o9-snipline" data-im="deck-line"><span class="o9-raw">“Imogen Price – Price &amp; P.. – 19/8”</span></p>');
    }
  });
  it("with neither: nothing", () => {
    expect(html(<PhotoLead photos={PHOTOS} onSeePage={noop} />)).toBe("");
  });
  it("the band is padded by 4% of the page height, the page's full width, at most 640 wide", () => {
    expect(snipRect({ y: [0.2, 0.25] }, 1176, 1568)).toEqual({ sx: 0, sy: Math.round(0.16 * 1568), sw: 1176, sh: Math.round(0.13 * 1568), dw: 640, dh: Math.round((Math.round(0.13 * 1568) * 640) / 1176) });
    expect(snipRect({ y: [0.01, 0.99] }, 400, 1000)).toMatchObject({ sy: 0, sh: 1000, dw: 400 });
  });
  it("the review hands each card the lead (agents from their first query with a line)", () => {
    const src = readFileSync(join("src", "components", "onboarding", "SmartImportReview.tsx"), "utf8");
    expect(src).toMatch(/const lead = q\.src \|\| q\.lineRaw \? <PhotoLead src=\{q\.src\} lineRaw=\{q\.lineRaw\} photos=\{photos\}/);
    expect(src).toMatch(/const mine = queries\.find\(\(q\) => q\.agentRef === a\.id && \(q\.src \|\| q\.lineRaw\)\)/);
    expect(readFileSync(join("src", "components", "onboarding", "v9", "ReviewDeck.tsx"), "utf8")).toMatch(/\{card\.lead\}\s*\{card\.body\}/);
  });
});

describe("nothing of the photo read is written (locked)", () => {
  beforeEach(() => { writes.length = 0; });
  it("the committed agent, query and history documents carry no src, lineRaw, readings or markRaw", async () => {
    const m = parseModel(PHOTO);
    const out = modelToResult(PHOTO, m.agents, m.queries);
    for (const a of out.agents) expect(Object.keys(a)).not.toContain("readings");
    const added: unknown[] = [];
    const deps = {
      userId: "u1", existingAgents: [], existingQueries: [], manuscriptTitle: "The October Test",
      addAgent: async (a: unknown) => { added.push(a); return { success: true, id: `ag${added.length}` }; },
      addQuery: async (q: unknown) => { added.push(q); return { success: true, id: `q${added.length}` }; },
    };
    /* Feed it the read itself, not just the review's output: whatever reaches the commit, it writes none of it. */
    for (const res of [out, PHOTO]) {
      await commitSmartImport(deps, res, "ms1");
    }
    const all = JSON.stringify([...added, ...writes]);
    expect(added.length).toBeGreaterThan(6);
    expect(writes.length).toBeGreaterThan(0);
    for (const k of ['"src"', '"lineRaw"', '"readings"', '"markRaw"', "Hannah Riddle", "Price & P..", "✗"]) expect(all, k).not.toContain(k);
  });
});

describe("the photos' URLs end with the flow (locked)", () => {
  const f = readFileSync(join("src", "components", "import", "ImportFlow.tsx"), "utf8");
  it("revoked going back to the start, on reset, on handing over, and on unmount", () => {
    expect(f).toMatch(/const endPhotos = \(\) => \{ urls\.current\.revokeAll\(\);/);
    expect(f).toMatch(/const toStart = \(\) => \{ endPhotos\(\);/);
    expect(f).toMatch(/reset: \(\) => \{\s*endPhotos\(\);/);
    expect(f).toMatch(/onProceed=\{\(\) => \{ if \(outcome\) \{ endPhotos\(\); onImportComplete/);
    expect(f).toMatch(/useEffect\(\(\) => \(\) => urls\.current\.revokeAll\(\), \[\]\);/);
  });
  it("every object URL goes through the registry", () => {
    expect(f.match(/URL\.createObjectURL/g) ?? []).toHaveLength(0);
    expect(f).toContain("urls.current.make(pp.blob)");
  });
});
