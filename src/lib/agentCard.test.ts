/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card's quick view, as derivations (Agent card v1 §3).
 *
 * ⚠️ EVERY INPUT IS DERIVED THROUGH THE ENGINE THAT REALLY BUILDS IT — the fixture's queries go
 * through `buildQcRows` and `agentFacts`, exactly as the card's host feeds them, so a test cannot
 * hand a function a standing or a court no real record could produce (the house rule: a test calls
 * the function with an input the system can actually produce).
 */
import { describe, it, expect } from "vitest";
import { QueryStatus, SubmissionMethod, type Agent, type Query } from "../types";
import { buildQcRows } from "./qcSummary";
import { agentFacts } from "./contactList";
import { buildAgentMaterials } from "./agentMaterials";
import { CONTACT_FIXTURE_AGENTS as A, CONTACT_FIXTURE_QUERIES as Q } from "../components/agents/contactFixture";
import {
  alsoQueried, cardQuery, cardRows, howLine, materialChips, methodPhrase, mswlLinkOf, nextLine, nowLine,
  primaryFor, queryTone, reopenReminder, seqPosition, stepTarget, trailOf, whereLine, wishStamp,
} from "./agentCard";

const NOW = Date.parse("2026-10-05T12:00:00.000Z");
const ROWS = buildQcRows(Q, A, [], NOW);
const agent = (id: string) => A.find((a) => a.id === id)!;
/** what the host computes for one agent: the facts, and the card's query */
const card = (id: string, rows = ROWS) => {
  const x = agentFacts(agent(id), rows, null);
  const q = cardQuery(cardRows(rows, id, null));
  return { x, q, tone: queryTone(x, q), primary: primaryFor(x, q) };
};

describe("the query section's tone (decision 2) — one per standing, from the engine", () => {
  it("your move: a partial asked for", () => {
    expect(card("fx-none").tone).toEqual({ tone: "you", label: "Your move" });
  });
  it("with the agent: queried, and no date has gone by (a stub window promises none)", () => {
    expect(card("fx-stub0-live").tone).toEqual({ tone: "agent", label: "With the agent" });
  });
  it("offer: read off the QUERY — the row folds an offer into Your move, the card does not", () => {
    const c = card("fx-bare");
    expect(c.x.stand, "the precondition: the Contact list calls this agent Your move").toBe("you");
    expect(c.tone).toEqual({ tone: "offer", label: "Offer on the table" });
  });
  it("closed: the latest close names how it ended", () => {
    expect(card("fx-shut").tone).toEqual({ tone: "closed", label: "Closed · passed" });
  });
  it("not yet queried behind an open door: white", () => {
    expect(card("fx-fresh").tone).toEqual({ tone: "none", label: "Not yet queried" });
  });
  it("not yet queried behind a SHUT door: stone, as the mock draws it", () => {
    expect(card("fx-reopen").tone).toEqual({ tone: "closed", label: "Closed to submissions" });
  });
  it("a live query OUTRANKS the shut door — a closed agency holding your full is still your move", () => {
    const c = card("fx-shut-live");
    expect(c.x.door).toBe("closed");
    expect(c.tone.tone).toBe("you");
  });
  it("covers all five tones across the fixture — the lock below has every branch to stand on", () => {
    const tones = new Set(A.map((a) => card(a.id).tone.tone));
    expect([...tones].sort()).toEqual(["agent", "closed", "none", "offer", "you"]);
  });
});

describe("the primary button by stage (§3's table)", () => {
  it("offer → Answer the offer (offer)", () => {
    expect(card("fx-bare").primary).toEqual({ label: "Answer the offer", act: "offer" });
  });
  it("partial requested → Send the partial; full requested → Send the full (sent)", () => {
    expect(card("fx-none").primary).toEqual({ label: "Send the partial", act: "sent" });
    expect(card("fx-shut-live").primary).toEqual({ label: "Send the full", act: "sent" });
  });
  it("R&R → Send the new version (sent)", () => {
    const qs = Q.map((q) => (q.id === "fq-4" ? ({ ...q, status: QueryStatus.REVISE_RESUBMIT } as Query) : q));
    expect(card("fx-none", buildQcRows(qs, A, [], NOW)).primary).toEqual({ label: "Send the new version", act: "sent" });
  });
  it("queried and past the expected date → Send a nudge, with Record a response beside it", () => {
    const c = card("fx-long");
    expect(c.q?.pastExpected, "the precondition: 10 Aug + 6 weeks is gone by on 5 Oct").toBe(true);
    expect(c.primary).toEqual({ label: "Send a nudge", act: "nudge", secondary: { label: "Record a response", act: "resp" } });
  });
  it("a FULL gone quiet is the same moment — the nudge is offered at any stage on the agent's side", () => {
    const c = card("fx-two");
    expect(c.q?.status).toBe(QueryStatus.FULL_SENT);
    expect(c.q?.pastExpected).toBe(true);
    expect(c.primary.act).toBe("nudge");
  });
  it("with the agent, no date gone by → Record a response (resp)", () => {
    expect(card("fx-stub0-live").primary).toEqual({ label: "Record a response", act: "resp" });
  });
  it("never queried, door open → Log a query; door shut → Remind me when they reopen", () => {
    expect(card("fx-fresh").primary).toEqual({ label: "Log a query", act: "log" });
    expect(card("fx-reopen").primary).toEqual({ label: "Remind me when they reopen", act: "remind" });
  });
  it("closed → Open in Query Centre, outlined — a way out, not a next step", () => {
    expect(card("fx-shut").primary).toEqual({ label: "Open in Query Centre", act: "qc", ghost: true });
  });
});

describe("the card presents the query whose move it is", () => {
  it("two live queries: the writer's move outranks a further-along one with the agent", () => {
    const qs: Query[] = [
      ...Q,
      { ...Q.find((q) => q.id === "fq-4")!, id: "fq-4b", status: QueryStatus.FULL_SENT, dateSent: "2026-09-30T00:00:00.000Z" } as Query,
    ];
    const rows = buildQcRows(qs, A, [], NOW);
    const q = cardQuery(cardRows(rows, "fx-none", null));
    expect(q?.status, "the card must act on the partial the writer owes, not the full with the agent").toBe(QueryStatus.PARTIAL_REQUESTED);
  });
});

describe("the section's lines", () => {
  it("now: the stage and the day it began; next: the row's own date line", () => {
    const { q } = card("fx-long");
    const n = nowLine(q!);
    expect(n.label).toBe("Queried");
    expect(n.when).toBe("10 Aug");
    const next = nextLine(q!, NOW)!;
    expect(next.text).toMatch(/^Expected 21 Sep · \d+d over$/);
    expect(next.over).toBe(true);
  });
  it("closed: nothing more to do, and the now line names how it ended", () => {
    const { q } = card("fx-shut");
    expect(nextLine(q!, NOW)).toEqual({ text: "Nothing more to do here.", over: false });
    expect(nowLine(q!).label).toBe("Passed");
  });
  it("the trail lists every step once, the last one current", () => {
    const t = trailOf(card("fx-two").q!);
    expect(t.length).toBeGreaterThan(0);
    expect(t.filter((s) => s.current)).toHaveLength(1);
    expect(t[t.length - 1].current).toBe(true);
  });
  it("⚠️ an UNDATED current stage is one step reading 'not dated' — never the stage twice", () => {
    const q = card("fx-none").q!;
    expect(q.history.dated, "the precondition: the fixture dates nothing past the send").toBe(false);
    const t = trailOf(q);
    const partial = t.filter((s) => s.status === QueryStatus.PARTIAL_REQUESTED);
    expect(partial, `the stage is listed ${partial.length} times: ${JSON.stringify(t)}`).toHaveLength(1);
    expect(partial[0]).toMatchObject({ when: "not dated", current: true });
    expect(nowLine(q).when).toBe("not dated");
  });
  it("also queried: the other manuscripts' queries, one line each — nothing without a scope", () => {
    const qs: Query[] = [...Q, { ...Q[1], id: "fq-other", manuscriptId: "fix-ms2", status: QueryStatus.REJECTED } as Query];
    const rows = buildQcRows(qs, A, [], NOW);
    const titles = (id: string) => (id === "fix-ms2" ? "The Glass Orchard" : "Murphy's Day Out");
    const lines = alsoQueried(rows, "fx-long", "fix-ms1", titles);
    expect(lines).toHaveLength(1);
    expect(lines[0].title).toBe("The Glass Orchard");
    expect(lines[0].status).toBe("Passed");
    expect(alsoQueried(rows, "fx-long", null, titles), "with no manuscript in scope every query is the card's").toEqual([]);
  });
});

describe("the head", () => {
  it("where: the city, else the country's name; the reply time, a stub 0 reading as unknown", () => {
    expect(whereLine(agent("fx-long")).reply).toMatch(/^Replies in about 6 weeks$/);
    expect(whereLine({ city: "", country: "IE", responseTimeWeeks: 1 })).toEqual({ flag: "fi fi-ie", place: "Ireland", reply: "Replies in about 1 week" });
    expect(whereLine({ city: "", country: "", responseTimeWeeks: 0 }).reply, "the quick-add stub is not 'replies at once'").toBe("Reply time unknown");
    expect(whereLine({ city: "", country: "", responseTimeWeeks: undefined }).reply).toBe("Reply time unknown");
  });
  it("how: the enum's four, the two legacy spellings (ruling 2), and nothing for Other", () => {
    expect(methodPhrase(SubmissionMethod.EMAIL)).toBe("By email");
    expect(methodPhrase(SubmissionMethod.QUERY_MANAGER)).toBe("Via QueryManager");
    expect(methodPhrase(SubmissionMethod.ONLINE_FORM)).toBe("Via their form");
    expect(methodPhrase(SubmissionMethod.POST)).toBe("By post");
    expect(methodPhrase("QueryManager")).toBe("Via QueryManager");
    expect(methodPhrase("Agency form")).toBe("Via their form");
    expect(methodPhrase("Other")).toBeNull();
    expect(howLine({ submissionMethod: SubmissionMethod.EMAIL, noResponseMeansNo: true })).toBe("By email · Silence means no");
    expect(howLine({ submissionMethod: "Other" as SubmissionMethod, noResponseMeansNo: undefined })).toBeNull();
  });
  it("the MSWL link lives in socials and goes through the shared href builder", () => {
    expect(mswlLinkOf({ socials: [{ platform: "X / Twitter", handle: "@x" }, { platform: "MSWL", handle: "manuscriptwishlist.com/mswl-post/ada" }] }))
      .toBe("https://manuscriptwishlist.com/mswl-post/ada");
    expect(mswlLinkOf({ socials: [] })).toBeNull();
    expect(mswlLinkOf({ socials: undefined })).toBeNull();
  });
});

describe("what they want", () => {
  /* the stored strings come from the ENCODER, never typed here — a guessed format is a test of a
     function nobody calls */
  const stored = (selected: string[], counts: Record<string, string> = {}, otherText = "") =>
    buildAgentMaterials({ selected, counts, otherText });
  it("materials as chips, decoded by the one parser — the query letter in the house's UK words", () => {
    expect(materialChips(stored(["Query letter", "Synopsis", "Sample chapters"], { Synopsis: "2", "Sample chapters": "3" })).map((c) => c.label))
      .toEqual(["Covering letter", "Synopsis 2pp", "First 3 chapters"]);
    expect(materialChips(stored(["Sample words"], { "Sample words": "5000" })).map((c) => c.label)).toEqual(["First 5,000 words"]);
    expect(materialChips(stored(["Sample chapters"], { "Sample chapters": "1" })).map((c) => c.label), "one chapter is singular").toEqual(["First 1 chapter"]);
    expect(materialChips(stored(["Other"], {}, "Author photo")).map((c) => c.label)).toEqual(["Author photo"]);
    expect(materialChips([])).toEqual([]);
  });
  it("the wishlist stamp reads mswlCheckedAt only — today, a month, or not yet", () => {
    expect(wishStamp(undefined, NOW)).toBe("not checked yet");
    expect(wishStamp("", NOW)).toBe("not checked yet");
    expect(wishStamp("2026-10-05T08:00:00.000Z", NOW)).toBe("checked today");
    expect(wishStamp("2026-08-20T00:00:00.000Z", NOW)).toBe("checked Aug 2026");
  });
});

describe("moving through the list", () => {
  const seq = ["a", "b", "c"];
  it("'8 of 41' — and nothing without an order, or for an agent outside it", () => {
    expect(seqPosition(seq, "b")).toEqual({ index: 1, total: 3 });
    expect(seqPosition(undefined, "b")).toBeNull();
    expect(seqPosition(seq, "z")).toBeNull();
  });
  it("steps within the order and stops at either end", () => {
    expect(stepTarget(seq, "b", 1)).toBe("c");
    expect(stepTarget(seq, "b", -1)).toBe("a");
    expect(stepTarget(seq, "c", 1)).toBeNull();
    expect(stepTarget(seq, "a", -1)).toBeNull();
  });
});

describe("the reopen reminder (ruling b) — Housekeeping's words, and nothing without a date", () => {
  it("adds a dated task for the recorded date", () => {
    expect(reopenReminder(agent("fx-reopen"))).toEqual({
      agentId: "fx-reopen", dueDate: "2026-11-01", text: "Tomas Keller's list reopens — check it and query",
    });
  });
  it("no date, no task — the card opens the editor at the door instead", () => {
    expect(reopenReminder(agent("fx-shut") as Agent)).toBeNull();
  });
});
