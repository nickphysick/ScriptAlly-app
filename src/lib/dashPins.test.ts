/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashPins — which events are pinned, how they crowd, and what they say (v33, 18 Sep).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Activity, type Agent, type Manuscript, type Query } from "../types";
import {
  flipWithin, layoutPins, PIN_CLEAR, PIN_KIND, PIN_STATUSES, pinCopy, pinEvents, sinceQueried, STEM_LONG, STEM_SHORT,
  type PlacedEvent,
} from "./dashPins";
import { CLOSED_STATUSES } from "./dashClosed";

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const DAY = 86400000;
const ago = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();
let seq = 0;
const q = (id: string, over: Record<string, unknown> = {}): Query =>
  ({ id, userId: "u", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: ago(100), ...over } as unknown as Query);
const act = (queryId: string, resultingStatus: QueryStatus | undefined, n: number, over: Record<string, unknown> = {}): Activity =>
  ({ id: `v${++seq}`, queryId, resultingStatus, date: ago(n), description: "", ...over } as unknown as Activity);

describe("which events are pinned", () => {
  it("a partial or full request, an offer, and a close — a pass or a silence", () => {
    expect([...PIN_STATUSES].sort()).toEqual([
      QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.NO_RESPONSE,
    ].sort());
    /* "closed" is the closed tile's own set — two derivations against each other */
    for (const s of CLOSED_STATUSES) expect(PIN_STATUSES).toContain(s);
    expect(PIN_STATUSES).not.toContain(QueryStatus.WITHDRAWN);
  });
  const events = pinEvents(
    [q("a"), q("b"), q("draft", { dateSent: undefined })],
    [
      act("a", QueryStatus.PARTIAL_REQUESTED, 40), act("a", QueryStatus.PARTIAL_SENT, 38), act("a", QueryStatus.REJECTED, 10),
      act("b", QueryStatus.FULL_REQUESTED, 20, { dateProvisional: true }),
      act("b", QueryStatus.WITHDRAWN, 5), act("b", undefined, 4),
      act("draft", QueryStatus.OFFER, 3), act("ghost", QueryStatus.OFFER, 3),
    ],
  );
  it("⚠️ a provisional rung is never pinned; nor a withdrawal, a send, a non-status event, an off-board query", () => {
    expect(events.map((e) => `${e.queryId}:${e.status}`)).toEqual([`a:${QueryStatus.PARTIAL_REQUESTED}`, `a:${QueryStatus.REJECTED}`]);
  });
  it("oldest first", () => { expect(events[0].timeMs).toBeLessThan(events[1].timeMs); });
});

const ev = (id: string, x: number, y: number, queryId = id): PlacedEvent =>
  ({ id, queryId, status: QueryStatus.PARTIAL_REQUESTED, timeMs: x, x, y });
const centres = (pins: ReturnType<typeof layoutPins>) => pins.map((p) => [p.x, p.gy] as const);

describe("the crowding rules", () => {
  it("alone: the short stem, up", () => {
    const [p] = layoutPins([ev("a", 100, 120)], 236);
    expect(p).toMatchObject({ stem: STEM_SHORT, below: false, gy: 120 - STEM_SHORT });
  });
  it("rule 1 · two whose glyphs would touch: the LATER takes the long stem", () => {
    const pins = layoutPins([ev("a", 100, 120), ev("b", 110, 120)], 236);
    expect(pins.map((p) => p.stem)).toEqual([STEM_SHORT, STEM_LONG]);
  });
  it("rule 2 · three or more in one run: one pin, carrying them all", () => {
    const pins = layoutPins([ev("a", 100, 120), ev("b", 110, 118), ev("c", 120, 116), ev("d", 300, 100)], 236);
    expect(pins.map((p) => p.members.length)).toEqual([3, 1]);
    expect(pins[0].id, "a merged pin is known by its newest member").toBe("c");
    expect([pins[0].x, pins[0].y]).toEqual([120, 116]);
  });
  it("rule 3 · one query twice in a cluster reads once — its latest event", () => {
    const pins = layoutPins([ev("a1", 100, 120, "A"), ev("a2", 108, 120, "A")], 236);
    expect(pins.length).toBe(1);
    expect(pins[0].members.map((m) => m.id)).toEqual(["a2"]);
    /* …and it does not count towards a merge: A, A, B is two queries, so two pins */
    const two = layoutPins([ev("a1", 100, 120, "A"), ev("a2", 108, 120, "A"), ev("b", 116, 120, "B")], 236);
    expect(two.map((p) => p.members.length)).toEqual([1, 1]);
  });
  it("rule 4 · the flip is decided against the stem actually used", () => {
    expect(flipWithin(STEM_SHORT)).toBe(38);
    /* 40px from the top: the short stem fits above… */
    expect(layoutPins([ev("a", 100, 40)], 236)[0].below).toBe(false);
    /* …the LONG one does not, so a second pin there goes below rather than off the top */
    const pins = layoutPins([ev("a", 100, 40), ev("b", 108, 40)], 236);
    expect(pins[1]).toMatchObject({ below: true });
    expect(pins[1].gy).toBeGreaterThan(40);
  });
  it("⚠️ NO TWO GLYPHS TOUCH — as a property, over many arrangements, not the ones drawn above", () => {
    let arrangements = 0, merged = 0, flipped = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      let s = seed * 2654435761 % 4294967296;
      const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
      const n = 2 + Math.floor(rnd() * 9);
      const xs = Array.from({ length: n }, () => Math.round(rnd() * 380)).sort((a, b) => a - b);
      const events = xs.map((x, i) => ev(`e${i}`, x, 30 + Math.round(rnd() * 160), `q${Math.floor(rnd() * 6)}`));
      const pins = layoutPins(events, 236);
      const c = centres(pins);
      for (let i = 0; i < c.length; i += 1) for (let j = i + 1; j < c.length; j += 1) {
        expect(Math.hypot(c[i][0] - c[j][0], c[i][1] - c[j][1]), `seed ${seed}: pins ${i} and ${j}`).toBeGreaterThanOrEqual(PIN_CLEAR - 1e-9);
      }
      /* every glyph is inside the plot */
      for (const p of pins) { expect(p.gy - 9.5).toBeGreaterThanOrEqual(-1e-9); expect(p.gy + 9.5).toBeLessThanOrEqual(236 + 1e-9); }
      /* nothing is lost: every QUERY with an event in is still represented */
      expect(new Set(pins.flatMap((p) => p.members.map((m) => m.queryId)))).toEqual(new Set(events.map((e) => e.queryId)));
      arrangements += 1; merged += pins.filter((p) => p.members.length > 1).length; flipped += pins.filter((p) => p.below).length;
    }
    /* the sweep entered the branches it claims to cover */
    expect(arrangements).toBe(400);
    expect(merged).toBeGreaterThan(20);
    expect(flipped).toBeGreaterThan(20);
  });
});

describe("what a pin says", () => {
  const agents = [{ id: "a1", name: "Jonathan Marsh", agency: "The Marsh Agency" }, { id: "a2", name: "", agency: "Tan & Hollis" }] as unknown as Agent[];
  const mss = [{ id: "m1", title: "Murphy's Day Out" }] as unknown as Manuscript[];
  const queries = [q("x", { dateSent: new Date(2026, 7, 19, 13, 3).toISOString() }), q("y", { agentId: "a2" })];
  it("the day, the kind, who, what happened with the title as its own run, and how long after the query", () => {
    const c = pinCopy({ id: "e", queryId: "x", status: QueryStatus.PARTIAL_REQUESTED, timeMs: new Date(2026, 7, 19, 13, 5).getTime() }, queries, agents, mss);
    expect(c).toEqual({
      eyebrow: "Wed 19 Aug · Partial requested",
      who: "Jonathan Marsh",
      say: { before: "Asked to read part of ", title: "Murphy's Day Out", after: "" },
      where: "The Marsh Agency · 2 minutes after you queried",
    });
  });
  it("an agency-less or nameless agent still has a name to lead with, and the agency is not said twice", () => {
    const c = pinCopy({ id: "e", queryId: "y", status: QueryStatus.NO_RESPONSE, timeMs: NOW.getTime() }, queries, agents, mss);
    expect(c.who).toBe("Tan & Hollis");
    expect(c.where).toBe("100 days after you queried");
    expect(c.say.before).toBe("Closed with no reply to your query for ");
  });
  it("⚠️ the words report and never appraise — and never say what the code does not do", () => {
    const all = [...Object.values(PIN_KIND), ...[QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.OFFER].map((s) =>
      Object.values(pinCopy({ id: "e", queryId: "x", status: s, timeMs: NOW.getTime() }, queries, agents, mss).say).join(""))].join(" | ");
    expect(all).not.toMatch(/reject|overdue|late|only|still|already|sadly|unfortunately|automatic|days without/i);
    expect(all).not.toMatch(/\b(he|she|his|her|him)\b/i);
  });
  it("the interval is a computed fact, in the unit that fits it", () => {
    expect(sinceQueried(0, 30_000)).toBe("under a minute after you queried");
    expect(sinceQueried(0, 60_000)).toBe("1 minute after you queried");
    expect(sinceQueried(0, 5 * 3600_000)).toBe("5 hours after you queried");
    expect(sinceQueried(0, 90 * DAY)).toBe("90 days after you queried");
    expect(sinceQueried(null, 5)).toBeNull();
    expect(sinceQueried(10, 5), "an event before its own send states no interval").toBeNull();
  });
});
