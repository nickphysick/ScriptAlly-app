/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v15 Phase A — the new figures in lib/responses, over the reference's own example book
 * (tests/e2e/rs15Data.mjs, the same data the seed writes). Each expected value is the reference's own number, computed
 * from its own `FULL` by its own formulas (reports/responses-v15/REPORT.md, Phase A), not by this code.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import {
  collFirstDir, collMonth, collShown, collectionOf, factsLine, firstReplyAvg, headerTally, listCollection, longestWait,
  monthCount, noteStage, noteSwitch, notesFor, pageCounts, respItems, tallyClasses, tallyMarks, tookBar, tookWords,
  type RespRowInput,
} from "./responses";
import { FULL, EARLY, WAITING } from "../../tests/e2e/rs15Data.mjs";

type RefItem = { n: string; a: string; k: string; far: number; sent: number[]; at: number[]; fr?: number; note?: string; part?: number; mine?: number[] };
const DAY = 86_400_000;
const D = (md: number[]) => new Date(2026, md[0] - 1, md[1], 12).getTime();
const NOW = D([11, 17]);
const Q = QueryStatus;
const FINAL: Record<string, QueryStatus> = {
  offer: Q.OFFER, fullReq: Q.FULL_REQUESTED, partReq: Q.PARTIAL_REQUESTED, rr: Q.REVISE_RESUBMIT,
  fullSent: Q.FULL_SENT, partSent: Q.PARTIAL_SENT, passed: Q.REJECTED, noReply: Q.NO_RESPONSE,
};
/** the stage history a reference item implies: the query, a first request `fr` days in where it has one, the answer */
export function spansOf(i: RefItem): [QueryStatus, number][] {
  const sent = D(i.sent), at = D(i.at), out: [QueryStatus, number][] = [[Q.QUERIED, sent]];
  if (i.fr) {
    /* the first request: the full for a revision and a pass after the full; a partial for everything else */
    const req = i.k === "rr" || (i.far >= 2 && i.k === "passed") ? Q.FULL_REQUESTED : Q.PARTIAL_REQUESTED;
    out.push([req, sent + i.fr * DAY], [req === Q.FULL_REQUESTED ? Q.FULL_SENT : Q.PARTIAL_SENT, sent + (i.fr + 2) * DAY]);
  }
  const fin = FINAL[i.k];
  if (fin === Q.FULL_SENT || fin === Q.PARTIAL_SENT) {
    out.push([fin === Q.FULL_SENT ? Q.FULL_REQUESTED : Q.PARTIAL_REQUESTED, at], [fin, D(i.mine!)]);
  } else out.push([fin, at]);
  return out;
}
let seq = 0;
export function rowOf(i: RefItem): RespRowInput {
  const sp = spansOf(i).map(([s, t], k, a) => ({ status: s, startMs: t, endMs: a[k + 1]?.[1] ?? null, current: k === a.length - 1 }));
  const passed = i.k === "passed";
  return {
    id: `r${++seq}`, status: FINAL[i.k], agentName: i.n, agency: i.a, initials: i.n.split(" ").map((w) => w[0]).join("").slice(0, 2),
    sentMs: D(i.sent), history: { spans: sp, currentStartMs: sp[sp.length - 1].startMs, dated: true },
    query: passed ? { rejectionFeedbackType: i.note ? "detailed" : "form", rejectionFeedbackText: i.note ?? null } : i.k === "rr" ? { rrNotes: i.note ?? null } : {},
    expectedMs: null, expectedKind: null, dayN: null, furthest: i.far >= 2 ? "full" : i.far === 1 ? "partial" : "query",
  } as RespRowInput;
}
const waitingRow = (w: (string | number | number[])[]): RespRowInput => ({
  id: `w${++seq}`, status: Q.QUERIED, agentName: w[0] as string, agency: w[1] as string, initials: "WW", sentMs: D(w[2] as number[]),
  history: { spans: [{ status: Q.QUERIED, startMs: D(w[2] as number[]), endMs: null, current: true }], currentStartMs: D(w[2] as number[]), dated: true },
  query: {}, expectedMs: null, expectedKind: null, dayN: null, furthest: "query",
} as RespRowInput);

const fullRows = [...(FULL as RefItem[]).map(rowOf), ...WAITING.map(waitingRow)];
const items = respItems(fullRows);
const page = pageCounts(items, fullRows);

describe("RS15 A · the header's tally", () => {
  it("34 queried: 7 asked for more, 11 passed, 16 no answer yet; 18 replied, 53%", () => {
    const t = headerTally(page);
    expect(t).toEqual({ queried: 34, replies: 18, more: 7, passed: 11, unanswered: 16, pct: 53 });
    const cls = tallyClasses(t);
    expect(cls.length).toBe(34);
    expect(cls.indexOf("p")).toBe(7);
    expect(cls.indexOf("w")).toBe(18);
  });
  it("one mark per class, a fifth stroke across every four, and the ref's seeded path for the first mark", () => {
    const { paths, width } = tallyMarks(tallyClasses(headerTally(page)), 58);
    expect(paths.length).toBe(34);
    expect(paths.filter((p) => p.d.includes("L")).length).toBe(6);
    expect(paths[0].d).toMatch(/^M\d+\.\d \d+\.\dQ\d+\.\d 29 \d+\.\d \d+\.\d$/);
    expect(width).toBe(4 + 6 * 62 + 4 * 11 + 6);
    expect(tallyMarks(tallyClasses(headerTally(page)), 58).paths[3].d).toBe(paths[3].d);
  });
  it("nothing back yet: every mark is no answer yet, and there is no rate to divide", () => {
    const rows = WAITING.map(waitingRow);
    const t = headerTally(pageCounts(respItems(rows), rows));
    expect(t).toMatchObject({ queried: 12, replies: 0, unanswered: 12 });
    expect(tallyClasses(t).every((c) => c === "w")).toBe(true);
  });
});

describe("RS15 A · the line of facts", () => {
  it("the reference's figures: a first reply in 36 days on average, 6 with a note, 9 read past the query", () => {
    expect(factsLine(items)).toEqual({ avg: 36, notes: 6, past: 9 });
  });
  it("a no reply is not a reply: it moves none of the three", () => {
    const nr = items.filter((i) => i.group === "noReply");
    expect(nr.length).toBe(4);
    expect(factsLine(items.filter((i) => i.group !== "noReply"))).toEqual(factsLine(items));
  });
  it("an undated first answer drops out of the average rather than counting as zero", () => {
    const r = rowOf((FULL as RefItem[])[9]);
    const undated = { ...r, id: "u1", sentMs: null, history: { ...r.history, spans: [] } } as RespRowInput;
    expect(firstReplyAvg(respItems([undated]))).toBe(null);
    expect(firstReplyAvg(respItems([...fullRows, undated]))).toBe(36);
  });
});

describe("RS15 A · In their words", () => {
  it("six notes, newest first: five from passes and the revise and resubmit's", () => {
    const all = notesFor(items, "all");
    expect(all.map((i) => i.row.agentName)).toEqual(["Eleanor Whitlock", "Ben Okafor", "Daniel O’Rourke", "Hugo Lindqvist", "Rafael Costa", "Imogen Hale"]);
    expect(notesFor(items, "pass").length).toBe(5);
    expect(notesFor(items, "req").map((i) => i.answer)).toEqual(["rr"]);
    expect(noteSwitch(items)).toEqual({ all: 6, pass: 5, req: 1 });
  });
  it("the switch hides with two notes or fewer, or one kind only", () => {
    const passes = items.filter((i) => i.group === "passed");
    expect(noteSwitch(passes)).toBe(null);
    expect(noteSwitch(notesFor(items, "all").slice(0, 2))).toBe(null);
  });
  it("the stage line: days after the query, and how far it got", () => {
    const ben = items.find((i) => i.row.agentName === "Ben Okafor")!;
    expect(noteStage(ben)).toBe("157 days after you queried · after the full");
    const rafael = items.find((i) => i.row.agentName === "Rafael Costa")!;
    expect(noteStage(rafael)).toBe("86 days after you queried · after the partial");
    const hugo = items.find((i) => i.row.agentName === "Hugo Lindqvist")!;
    expect(noteStage(hugo)).toBe("16 days after you queried · on the query");
  });
});

describe("RS15 A · the Rejection collection", () => {
  const coll = collectionOf(items, new Set());
  it("every pass and no reply: 15, the longest wait 157 days (Ben Okafor)", () => {
    expect(coll.length).toBe(15);
    expect(longestWait(coll)).toBe(157);
  });
  it("a pass kept off is left out of the collection, and still counted in the header", () => {
    const ben = items.find((i) => i.row.agentName === "Ben Okafor")!;
    const off = collectionOf(items, new Set([ben.id]));
    expect(off.length).toBe(14);
    expect(off.some((i) => i.id === ben.id)).toBe(false);
    expect(headerTally(page).passed).toBe(11);
  });
  it("took: days for a pass, weeks for a no reply; the bar against the whole collection's longest", () => {
    const alice = coll.find((i) => i.row.agentName === "Alice Moreno")!;
    expect(tookWords(alice)).toBe("13 weeks");
    const hugo = coll.find((i) => i.row.agentName === "Hugo Lindqvist")!;
    expect(tookWords(hugo)).toBe("16 days");
    const longest = longestWait(coll);
    expect(tookBar(hugo, longest)).toBe(Math.round((16 / 157) * 100));
    /* the filtered view's longest is not the scale */
    const nr = listCollection(coll, { kind: "noReply", find: "", sort: "date", dir: -1 });
    expect(longestWait(nr)).toBe(118);
    expect(tookBar(alice, longest)).toBe(Math.round((89 / 157) * 100));
  });
  it("the default order is the date, newest first, under month headers counted over the whole collection", () => {
    const l = listCollection(coll, { kind: "all", find: "", sort: "date", dir: -1 });
    expect(l[0].row.agentName).toBe("Eleanor Whitlock");
    expect(l[l.length - 1].row.agentName).toBe("Nadia Petrova");
    const m = collMonth(l[0], NOW);
    expect(m.label).toBe("November");
    expect(monthCount(coll, m.key, NOW)).toBe(3);
    const passedOnly = listCollection(coll, { kind: "passed", find: "", sort: "date", dir: -1 });
    expect(passedOnly.length).toBe(11);
    expect(monthCount(coll, collMonth(passedOnly[0], NOW).key, NOW)).toBe(3);
  });
  it("each heading sorts; pressing again reverses; the first press of a date, wait or depth is descending", () => {
    expect(collFirstDir("date")).toBe(-1);
    expect(collFirstDir("took")).toBe(-1);
    expect(collFirstDir("far")).toBe(-1);
    expect(collFirstDir("agent")).toBe(1);
    const a = listCollection(coll, { kind: "all", find: "", sort: "agent", dir: 1 }).map((i) => i.row.agentName);
    expect(a[0]).toBe("Alice Moreno");
    expect(listCollection(coll, { kind: "all", find: "", sort: "agent", dir: -1 }).map((i) => i.row.agentName)).toEqual(a.slice().reverse());
    expect(listCollection(coll, { kind: "all", find: "", sort: "took", dir: -1 })[0].row.agentName).toBe("Ben Okafor");
    expect(listCollection(coll, { kind: "all", find: "", sort: "far", dir: -1 })[0].row.agentName).toBe("Ben Okafor");
    const note = listCollection(coll, { kind: "all", find: "", sort: "note", dir: 1 });
    expect(note.slice(0, 5).every((i) => !!i.note)).toBe(true);
    expect(listCollection(coll, { kind: "all", find: "", sort: "answer", dir: 1 })[0].group).toBe("noReply");
  });
  it("find narrows by agent, agency and a word of the note; a find shows every match, otherwise the first ten", () => {
    expect(listCollection(coll, { kind: "all", find: "costa", sort: "date", dir: -1 }).map((i) => i.row.agentName)).toEqual(["Rafael Costa"]);
    expect(listCollection(coll, { kind: "all", find: "pacing", sort: "date", dir: -1 }).map((i) => i.row.agentName)).toEqual(["Rafael Costa"]);
    expect(listCollection(coll, { kind: "all", find: "voice", sort: "date", dir: -1 }).length).toBe(2);
    const l = listCollection(coll, { kind: "all", find: "", sort: "date", dir: -1 });
    expect(collShown(l, false, "")).toMatchObject({ cut: true });
    expect(collShown(l, false, "").rows.length).toBe(10);
    expect(collShown(l, true, "").rows.length).toBe(15);
    expect(collShown(l, false, "a").cut).toBe(false);
  });
});

describe("RS15 A · early days", () => {
  it("the reference's early set: 9 queried, 2 replies, 7 still out", () => {
    const rows = [...(EARLY as RefItem[]).map(rowOf), ...WAITING.slice(0, 7).map(waitingRow)];
    const p = pageCounts(respItems(rows), rows);
    expect(headerTally(p)).toMatchObject({ queried: 9, replies: 2, unanswered: 7 });
    expect(p.waiting).toBe(7);
  });
});
