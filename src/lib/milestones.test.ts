import { describe, expect, it } from "vitest";
import { milestones, weekStreak } from "./milestones";
import { QueryStatus } from "../types";

const D = (iso: string) => Date.parse(`${iso}T10:00:00Z`);
const row = (sent: string | null, stage: Partial<Record<QueryStatus, string>> = {}, reached: { req?: boolean; full?: boolean; offer?: boolean } = {}) => ({
  sentMs: sent ? D(sent) : null,
  stageMs: Object.fromEntries(Object.entries(stage).map(([k, v]) => [k, D(v as string)])) as Partial<Record<QueryStatus, number>>,
  reachedRequest: !!reached.req, reachedFull: !!reached.full, reachedOffer: !!reached.offer,
});

describe("milestones: the writer's own first events", () => {
  it("dates each first from the rows, and earns nothing it has not seen", () => {
    const rows = [
      row("2026-07-05"),
      row("2026-07-10", { [QueryStatus.PARTIAL_REQUESTED]: "2026-09-18" }, { req: true }),
      row("2026-07-12", { [QueryStatus.FULL_REQUESTED]: "2026-09-19" }, { req: true, full: true }),
    ];
    const m = Object.fromEntries(milestones(rows).map((x) => [x.key, x]));
    expect(m.first.atMs).toBe(D("2026-07-05"));
    expect(m.request.atMs).toBe(D("2026-09-18"));
    expect(m.full.atMs).toBe(D("2026-09-19"));
    expect(m.ten).toMatchObject({ earned: false, progress: "3 of 10" });
    expect(m.twentyfive.progress).toBe("3 of 25");
    expect(m.offer).toMatchObject({ earned: false, progress: "Ahead", atMs: null });
  });
  it("the tenth query out is the tenth send, oldest first", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(`2026-08-${String(i + 1).padStart(2, "0")}`));
    const ten = milestones(rows).find((x) => x.key === "ten")!;
    expect(ten.atMs).toBe(D("2026-08-10"));
  });
  it("a request reached with no date is earned, undated — never a guessed date", () => {
    const r = milestones([row("2026-07-05", {}, { req: true })]).find((x) => x.key === "request")!;
    expect(r).toMatchObject({ earned: true, atMs: null, progress: null });
  });
  it("nothing sent: every milestone is ahead", () => {
    expect(milestones([]).every((x) => !x.earned)).toBe(true);
  });
});

describe("weekStreak: Monday weeks against the goal in force", () => {
  const now = D("2026-10-29"); // a Thursday; the week began Monday 26 Oct
  it("counts consecutive met weeks, and a week in progress is never a miss", () => {
    const sent = [D("2026-10-06"), D("2026-10-13"), D("2026-10-20")]; // three weeks with one each; none yet this week
    const s = weekStreak(sent, undefined, now);
    expect(s.weeks[s.weeks.length - 1]).toMatchObject({ start: "2026-10-26", current: true, met: false });
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
  });
  it("measures a week against the weekly target in force that week", () => {
    const entries = [{ target: 2, cadence: "week" as const, effectiveFrom: "2026-10-12" }];
    const sent = [D("2026-10-06"), D("2026-10-13"), D("2026-10-20"), D("2026-10-21")];
    const s = weekStreak(sent, entries, now);
    const by = Object.fromEntries(s.weeks.map((w) => [w.start, w]));
    expect(by["2026-10-05"]).toMatchObject({ target: null, met: true });
    expect(by["2026-10-12"]).toMatchObject({ target: 2, met: false });
    expect(by["2026-10-19"]).toMatchObject({ target: 2, met: true });
    expect(s.current).toBe(1);
  });
  it("never reads a week after today, and ignores a send dated in the future", () => {
    const s = weekStreak([D("2026-10-27"), D("2026-11-20")], undefined, now);
    expect(s.weeks.map((w) => w.start)).toEqual(["2026-10-26"]);
    expect(s.weeks[0]).toMatchObject({ count: 1, met: true });
    expect(s.current).toBe(1);
  });
});

import { inWindow, packageHeading } from "./phonePages";
describe("the phone pages' small rules", () => {
  it("a package heading states only what it drew", () => {
    expect(packageHeading({ sent: 0, more: 0, replies: 0 })).toBe("Not sent yet");
    expect(packageHeading({ sent: 11, more: 2, replies: 5 })).toBe("2 requests from 11");
    expect(packageHeading({ sent: 4, more: 1, replies: 1 })).toBe("1 request from 4");
    expect(packageHeading({ sent: 4, more: 0, replies: 2 })).toBe("No requests from 4");
    expect(packageHeading({ sent: 4, more: 0, replies: 0 })).toBe("No replies yet");
  });
  it("the last 90 days is (now − 90 days, now], by send date", () => {
    const now = Date.parse("2026-10-29T12:00:00Z"), d = 86_400_000;
    expect(inWindow(now - 90 * d, "d90", now)).toBe(false);
    expect(inWindow(now - 90 * d + 1, "d90", now)).toBe(true);
    expect(inWindow(null, "d90", now)).toBe(false);
    expect(inWindow(null, "all", now)).toBe(true);
  });
});
