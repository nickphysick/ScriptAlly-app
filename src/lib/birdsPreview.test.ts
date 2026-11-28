/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye first look v1 §B — Today's preview: Birds-eye's own order, in the window, the first four.
 */
import { describe, expect, it } from "vitest";
import { bwGroups, type BwRow } from "./birdsWorld";
import { inPreviewWindow, previewPick, pvPieces, pvSay, pvX, PV_W } from "./birdsPreview";

const R = (id: string, o: Partial<BwRow>): BwRow => ({
  id, name: id, agency: "", status: "Queried", you: false, sendBy: false, closed: false, outcome: "",
  ev: [{ d: -20, status: "Queried" }], due: 10, fromMs: null, toMs: null, pasts: "", dueMs: null, ...o,
} as BwRow);
const QUIET = 28;

describe("Today's preview — which rows, and in what order", () => {
  const rows: BwRow[] = [
    R("wait-soon", { due: 3 }),
    R("wait-far", { due: 40, ev: [{ d: -60, status: "Queried" }] }),          /* out of the window: date 40 ahead, sent 60 ago */
    R("chase", { due: -5 }),
    R("quiet", { due: -40, ev: [{ d: -90, status: "Queried" }] }),            /* gone quiet: last in Needs action, out of the window */
    R("you", { you: true, sendBy: true, status: "Partial Requested", due: 6, ev: [{ d: -30, status: "Queried" }, { d: -4, status: "Partial Requested" }] }),
    R("nodate", { due: null, ev: [{ d: -3, status: "Queried" }] }),
    R("wait-2", { due: 15 }),
    R("closed", { closed: true, due: null, ev: [{ d: -5, status: "Rejected" }] }),
  ];
  it("the window: a reply date or an event between a fortnight ago and three weeks ahead", () => {
    expect(inPreviewWindow(rows[0])).toBe(true);
    expect(inPreviewWindow(rows[1])).toBe(false);
    expect(inPreviewWindow(R("x", { due: -14, ev: [{ d: -40, status: "Queried" }] }))).toBe(true);
    expect(inPreviewWindow(R("x", { due: -15, ev: [{ d: -40, status: "Queried" }] }))).toBe(false);
  });
  it("the first four of Birds-eye's own order (Needs action, Within their window, No reply date yet), in the window", () => {
    const order = bwGroups(rows, "all", QUIET).filter((g) => g.t !== "Closed").flatMap((g) => g.rows.map((r) => r.id));
    const pv = previewPick(rows, QUIET);
    expect(pv.rows.map((r) => r.id)).toEqual(order.filter((id) => inPreviewWindow(rows.find((r) => r.id === id)!)).slice(0, 4));
    /* Needs action leads, so the preview leads with what is most urgent */
    expect(["chase", "you"]).toContain(pv.rows[0].id);
    expect(pv.rows.map((r) => r.id)).not.toContain("closed");
  });
  it("+ N more: every open query Birds-eye holds, less the rows shown", () => {
    const pv = previewPick(rows, QUIET);
    expect(pv.open).toBe(7);
    expect(pv.more).toBe(7 - pv.rows.length);
  });
  it("nothing in the window: no rows, and every open query is more", () => {
    const pv = previewPick([R("far", { due: 60, ev: [{ d: -80, status: "Queried" }] })], QUIET);
    expect(pv.rows).toEqual([]);
    expect(pv.more).toBe(1);
  });
});

describe("Today's preview — a row's bar and words", () => {
  it("the axis: a fortnight ago at 0, today at 72, three weeks ahead at 180, held to the bar", () => {
    expect(pvX(-14)).toBe(0);
    expect(pvX(0)).toBe(72);
    expect(pvX(21)).toBe(PV_W);
    expect(pvX(-90)).toBe(0);
    expect(pvX(90)).toBe(PV_W);
  });
  it("the full view's pieces, clipped to the window; a no-date query its Queried bar to today", () => {
    const p = pvPieces(R("a", { ev: [{ d: -30, status: "Queried" }, { d: -5, status: "Partial Requested" }], due: 9 }), QUIET);
    expect(p.map((x) => x.st)).toEqual(["Queried", "Partial Requested", "Partial Requested"]);
    expect(p[0].l).toBe(0);
    expect(p.every((x) => x.l >= 0 && x.l + x.w <= PV_W + 3)).toBe(true);
    expect(pvPieces(R("n", { due: null, ev: [{ d: -3, status: "Queried" }] }), QUIET)).toEqual([{ l: pvX(-3), w: pvX(0) - pvX(-3), st: "Queried" }]);
  });
  it("the words: your move, n days past, or the reply date; never overdue or late", () => {
    const dm = (d: number) => `day ${d}`;
    expect(pvSay(R("y", { you: true, due: -3 }), dm)).toBe("your move");
    expect(pvSay(R("p", { due: -9 }), dm)).toBe("9d past");
    expect(pvSay(R("f", { due: 13 }), dm)).toBe("day 13");
    expect(pvSay(R("n", { due: null }), dm)).toBe("");
  });
});
