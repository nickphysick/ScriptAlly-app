import { describe, it, expect } from "vitest";
import { bestFit, byCloseness, closeWords, closestOpen, dayN, nextReply, repliesAhead, type Closeness } from "./phoneV4";
import { todayState } from "../components/phone/v4/todayState";
import type { V3Query } from "./phoneV3";
import { QueryStatus, type Agent, type Query } from "../types";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-11T12:00:00Z");
const vq = (id: string, court: V3Query["court"], o: { start?: number; exp?: number | null; reply?: number | null; name?: string; state?: V3Query["state"] } = {}): V3Query => ({
  id, court, state: o.state ?? (court === "you" ? "materials" : court === "agent" ? "agent" : court === "quiet" ? "quiet" : "closed"),
  row: { id, agentName: o.name ?? id, status: QueryStatus.QUERIED, stageStartMs: o.start ?? NOW - 10 * DAY, sentMs: o.start ?? NOW - 10 * DAY, expectedMs: o.exp === undefined ? NOW + 10 * DAY : o.exp, query: {} } as never,
  status: "", short: "", task: null, verb: null, taskTitle: null, step: null, day: null, queriedMs: null, replyMs: o.reply ?? null, gone: null,
});

describe("phone v4 figures", () => {
  it("closest first, undated last; a passed date says how far past, never overdue", () => {
    const a = vq("a", "agent", { exp: NOW + 10 * DAY }), b = vq("b", "you", { exp: NOW - 15 * DAY }), u = vq("u", "agent", { exp: null });
    const top = closestOpen([a, b, u, vq("c", "closed")], NOW, 3);
    expect(top.map((x) => x.q.id)).toEqual(["b", "a"]);
    expect(closeWords(top[0], NOW)).toBe("2 wks past its date");
    expect(closeWords(top[0], NOW)).not.toMatch(/overdue|late/i);
    expect(closeWords(top[1], NOW)).toBe("Reply in 10 days");
    const xs: Closeness[] = [{ q: u, f: null, fromMs: null, toMs: null, past: false }, top[1]];
    expect(xs.sort(byCloseness)[0].q.id).toBe("a");
  });
  it("the next reply is the soonest with-the-agent date still ahead", () => {
    const qs = [vq("p", "agent", { reply: NOW - DAY }), vq("x", "agent", { reply: NOW + 9 * DAY }), vq("y", "agent", { reply: NOW + 3 * DAY }), vq("z", "you", { reply: NOW + DAY })];
    expect(nextReply(qs, NOW)?.id).toBe("y");
    expect(repliesAhead(qs, NOW).map((q) => q.id)).toEqual(["y", "x"]);
    expect(nextReply([], NOW)).toBeNull();
  });
  it("best fit: not yet queried, the writer's stars first, then the shorter reply time", () => {
    const ag = (id: string, s: number | null, w: number | null) => ({ id, name: id, starRating: s, responseTimeWeeks: w }) as unknown as Agent;
    const out = bestFit([ag("a", 3, 4), ag("b", 5, 12), ag("c", 5, 6), ag("q", 5, 1)], [{ agentId: "q", status: QueryStatus.QUERIED } as Query]);
    expect(out.map((a) => a.id)).toEqual(["c", "b", "a"]);
  });
  it("day N counts the first day as day 1", () => {
    expect(dayN(NOW, NOW)).toBe(1);
    expect(dayN(NOW - 2 * DAY, NOW)).toBe(3);
  });
  it("Today's four states come from data alone", () => {
    expect(todayState(0, 0, false)).toBe("dayone");
    expect(todayState(5, 0, false)).toBe("quiet");
    expect(todayState(5, 3, false)).toBe("everyday");
    expect(todayState(5, 3, true)).toBe("after");
  });
});
