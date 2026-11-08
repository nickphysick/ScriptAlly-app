import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { emptyQc138Filters, type Qc138Filters } from "./qc138";
import { clearFacet, pickQuick, railCounts } from "./qc153Rail";

/* a small population and a matcher over the two facets it exercises: the stages and `past` */
interface R { status: QueryStatus; past: boolean; pkg: string }
const ROWS: R[] = [
  { status: QueryStatus.QUERIED, past: true, pkg: "a" },
  { status: QueryStatus.QUERIED, past: false, pkg: "a" },
  { status: QueryStatus.QUERIED, past: true, pkg: "b" },
  { status: QueryStatus.PARTIAL_SENT, past: true, pkg: "a" },
  { status: QueryStatus.PARTIAL_SENT, past: false, pkg: "b" },
  { status: QueryStatus.FULL_SENT, past: false, pkg: "a" },
];
const match = (r: R, g: Qc138Filters): boolean =>
  (!g.stages.length || g.stages.includes(r.status)) && (!g.past || r.past) && (!g.sent.length || g.sent.includes(r.pkg));

describe("the rail's counts are faceted", () => {
  it("an option's count applies every other section and ignores its own", () => {
    expect(ROWS.length).toBeGreaterThan(0);
    const f: Qc138Filters = { ...emptyQc138Filters(), stages: [QueryStatus.QUERIED], past: true };
    const c = railCounts(ROWS, f, ["a", "b"], match);
    /* the stage rows ignore the stage choice but keep `past`: three past rows, two queried and one partial sent */
    expect(c.stand.q).toBe(2);
    expect(c.stand.ps).toBe(1);
    expect(c.stand.fs).toBe(0);
    /* More's past switch ignores More but keeps the stage: three queried, two of them past */
    expect(c.more.past).toBe(2);
    /* the package options keep both: queried AND past, by package */
    expect(c.sent.a).toBe(1);
    expect(c.sent.b).toBe(1);
  });
  it("with nothing on, every count is the plain count", () => {
    const c = railCounts(ROWS, emptyQc138Filters(), ["a"], match);
    expect(c.stand.q).toBe(3);
    expect(c.more.past).toBe(3);
    expect(c.sent.a).toBe(4);
  });
  it("clearing a facet touches only that facet's fields", () => {
    const f: Qc138Filters = { ...emptyQc138Filters(), stages: [QueryStatus.QUERIED], sent: ["a"], missing: true };
    expect(clearFacet(f, "stages")).toEqual({ ...f, stages: [] });
    expect(clearFacet(f, "more")).toEqual({ ...f, missing: false });
  });
});

describe("Most used is a radio", () => {
  it("picking one clears the others, and pressing the active one turns it off", () => {
    const a = pickQuick(emptyQc138Filters(), "you");
    expect(a.you).toBe(true);
    const b = pickQuick(a, "wait");
    expect([b.you, b.waiting]).toEqual([false, true]);
    expect(pickQuick(b, "wait").waiting).toBe(false);
  });
});
