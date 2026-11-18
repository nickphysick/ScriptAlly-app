import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import {
  VERDICT_MIN_REPLIES, WORKING_SHARE, askedOf, changesFrom, contentsLine, copyNameOf, countsOf, goingLine, headerTitle,
  needsOf, repliedOf, resultLine, sentIn, tableOrder, tellsYou, totalsLine, verdictOf, waitingOf, whoGotLine, type Counts,
} from "./packagesV62";

const S = QueryStatus;
const q = (status: string) => ({ status: status as QueryStatus });
const none = () => undefined;
const c = (o: Partial<Counts>): Counts => ({ sent: 0, replied: 0, asked: 0, askedThenPassed: 0, openRequests: 0, waiting: 0, ...o });

describe("v62 · the three counts (§6.2)", () => {
  it("replied: any request, any offer, any rejection; never waiting, no response or withdrawn", () => {
    const yes = [S.PARTIAL_REQUESTED, S.PARTIAL_SENT, S.FULL_REQUESTED, S.FULL_SENT, S.REVISE_RESUBMIT, S.RESUBMITTED, S.OFFER, S.SIGNED, S.REJECTED];
    const no = [S.QUERIED, S.NO_RESPONSE, S.WITHDRAWN];
    for (const s of yes) expect(repliedOf(q(s), undefined), s).toBe(true);
    for (const s of no) expect(repliedOf(q(s), undefined), s).toBe(false);
  });
  it("asked reads history: a partial later rejected still counts, and so does a withdrawn one that was asked", () => {
    const row = { reachedRequest: true, reachedOffer: false, stageMs: {} };
    expect(askedOf(q(S.REJECTED), row)).toBe(true);
    expect(askedOf(q(S.WITHDRAWN), row)).toBe(true);
    expect(askedOf(q(S.REJECTED), undefined)).toBe(false);
  });
  it("a rejection in history counts as a reply even when the status has moved on", () => {
    expect(repliedOf(q(S.NO_RESPONSE), { reachedRequest: false, reachedOffer: false, stageMs: { [S.REJECTED]: 1 } })).toBe(true);
  });
  it("still to reply is waiting only — closed and withdrawn are not", () => {
    expect(waitingOf(q(S.QUERIED), undefined)).toBe(true);
    expect(waitingOf(q(S.NO_RESPONSE), undefined)).toBe(false);
    expect(waitingOf(q(S.WITHDRAWN), undefined)).toBe(false);
  });
  it("countsOf tallies a mixed set", () => {
    const qs = [q(S.QUERIED), q(S.REJECTED), q(S.PARTIAL_SENT), q(S.FULL_REQUESTED), q(S.WITHDRAWN), q(S.NO_RESPONSE)];
    expect(countsOf(qs, none)).toEqual({ sent: 6, replied: 3, asked: 2, askedThenPassed: 0, openRequests: 2, waiting: 1 });
  });
});

describe("v62 · the verdict (§6.3)", () => {
  it("the thresholds are 4 and a half", () => { expect(VERDICT_MIN_REPLIES).toBe(4); expect(WORKING_SHARE).toBe(0.5); });
  it("nothing sent: no verdict", () => { expect(verdictOf(c({}), false)).toBeNull(); });
  it("rule 1, with and without replies, live and retired", () => {
    expect(verdictOf(c({ sent: 3, replied: 1 }), false)).toMatchObject({ rule: 1, heading: "Too early to say", sentence: "1 of 3 have replied. Wait for 3 more before you change anything." });
    expect(verdictOf(c({ sent: 3 }), false)!.sentence).toBe("No one has replied yet. Wait for 4 more before you change anything.");
    expect(verdictOf(c({ sent: 3, replied: 2 }), true)!.sentence).toBe("2 of 3 have replied.");
  });
  it("rule 2: four replies, no requests", () => {
    expect(verdictOf(c({ sent: 6, replied: 4 }), false)).toMatchObject({ rule: 2, kind: "fix", heading: "No one has asked to read more",
      sentence: "4 agents replied and none asked for pages. Look at your letter and your opening before you send again." });
  });
  it("rule 3 needs two asked-then-passed and nothing still open", () => {
    expect(verdictOf(c({ sent: 6, replied: 5, asked: 3, askedThenPassed: 2 }), false)).toMatchObject({ rule: 3, kind: "fix", heading: "Agents ask for more, then pass" });
    expect(verdictOf(c({ sent: 6, replied: 5, asked: 3, askedThenPassed: 2, openRequests: 1 }), false)).toMatchObject({ rule: 4 });
  });
  it("rule 4 at half or more; retired drops 'Keep sending it.'", () => {
    expect(verdictOf(c({ sent: 5, replied: 4, asked: 2 }), false)).toMatchObject({ rule: 4, kind: "good", sentence: "2 of 4 agents who replied asked to read more. Keep sending it." });
    expect(verdictOf(c({ sent: 5, replied: 4, asked: 2 }), true)!.sentence).toBe("2 of 4 agents who replied asked to read more.");
  });
  it("rule 5 under half", () => {
    expect(verdictOf(c({ sent: 7, replied: 4, asked: 1 }), false)).toMatchObject({ rule: 5, kind: "some", heading: "Some interest", sentence: "1 of 4 agents who replied asked to read more." });
  });
});

describe("v62 · words", () => {
  const full = { queryLetterVersionId: "l", bookVersionId: "v" };
  it("what an unfinished package needs", () => {
    expect(needsOf({ queryLetterVersionId: "", bookVersionId: undefined })).toBe("Needs a version and a letter");
    expect(needsOf({ queryLetterVersionId: "", bookVersionId: "v" })).toBe("Needs a query letter");
    expect(needsOf({ queryLetterVersionId: "l", bookVersionId: "" })).toBe("Needs a manuscript version");
    expect(needsOf(full)).toBeNull();
  });
  it("the contents line", () => {
    expect(contentsLine("Hook-first", "Prologue cut")).toBe("Hook-first · sample from Prologue cut");
    expect(contentsLine(null, null)).toBe("No letter yet · no sample yet");
  });
  it("the list's result line", () => {
    expect(resultLine(c({ sent: 4, replied: 4, asked: 2 }), true, full)).toEqual({ lead: "2 of 4", text: "asked to read more" });
    expect(resultLine(c({ sent: 1 }), true, full)).toEqual({ lead: null, text: "Sent to 1 agent, no replies yet" });
    expect(resultLine(c({}), false, full).text).toBe("Ready to send");
    expect(resultLine(c({}), false, { queryLetterVersionId: "", bookVersionId: "v" }).text).toBe("Needs a query letter");
  });
  it("the header", () => {
    expect(headerTitle(0)).toBe("No packages yet");
    expect(headerTitle(1)).toBe("1 package");
    expect(goingLine(c({ sent: 5, asked: 2 }), true, "V", "L")).toBe("Sent to 5 agents, 2 asked to read more");
    expect(goingLine(c({}), false, "Prologue cut", "Hook-first")).toBe("Prologue cut · Hook-first, not sent yet");
  });
  it("Sent in, with the year only when it is not this year", () => {
    const now = Date.UTC(2026, 10, 18);
    expect(sentIn(Date.UTC(2026, 8, 12), now)).toBe("Sent in September");
    expect(sentIn(Date.UTC(2025, 5, 2), now)).toBe("Sent in June 2025");
    expect(sentIn(null, now)).toBeNull();
  });
  it("who got it and the totals", () => {
    expect(whoGotLine({ sent: 5, waiting: 1 })).toBe("5 agents, 1 still to reply");
    expect(whoGotLine({ sent: 5, waiting: 0 })).toBe("5 agents");
    expect(totalsLine({ sent: 15, replied: 9, asked: 3 })).toBe("15 queries have gone out with a package. 9 agents have replied and 3 asked to read more.");
    expect(totalsLine({ sent: 0, replied: 0, asked: 0 })).toBeNull();
  });
  it("what it tells you", () => {
    expect(tellsYou(null, full)).toBe("Not sent yet");
    expect(tellsYou(null, { queryLetterVersionId: "", bookVersionId: "v" })).toBe("Needs a query letter");
  });
  it("the copy's name", () => {
    expect(copyNameOf("Standard UK", ["Standard UK"])).toBe("Standard UK copy");
    expect(copyNameOf("Standard UK", ["Standard UK", "standard uk copy"])).toBe("Standard UK copy 2");
  });
});

describe("v62 · what changed (§6.5)", () => {
  const names: Record<string, string> = { v1: "Prologue cut", v2: "Flashback first", l1: "Hook-first", s1: "One-page", e1: "Author bio", e2: "Pitch sheet" };
  const nameOf = (_k: string, id: string) => names[id] ?? null;
  const ex = (id: string) => names[id] ?? null;
  it("added, taken out, swapped, and extras in lower case", () => {
    const parent = { bookVersionId: "v1", queryLetterVersionId: "l1", synopsisVersionId: "", extraIds: ["e2"] };
    const child = { bookVersionId: "v2", queryLetterVersionId: "", synopsisVersionId: "s1", extraIds: ["e1"] };
    expect(changesFrom(parent, child, nameOf, ex)).toEqual([
      "Swapped the manuscript version: Prologue cut to Flashback first",
      "Took out the query letter",
      "Added a synopsis (One-page)",
      "Added the author bio",
      "Took out the pitch sheet",
    ]);
  });
  it("no difference, no chips", () => {
    const p = { bookVersionId: "v1", queryLetterVersionId: "l1", synopsisVersionId: "", extraIds: [] };
    expect(changesFrom(p, { ...p }, nameOf, ex)).toEqual([]);
  });
});

describe("v62 · the table's order", () => {
  it("sent by first query oldest first, then unsent", () => {
    const pk = (id: string, createdDate: string) => ({ id, createdDate });
    const first: Record<string, number | null> = { a: 300, b: 100, c: null, d: null };
    const out = tableOrder([pk("c", "2026-03"), pk("a", "2026-01"), pk("d", "2026-02"), pk("b", "2026-04")], (p) => first[p.id]);
    expect(out.map((p) => p.id)).toEqual(["b", "a", "d", "c"]);
  });
});
