/**
 * Query Centre v153.3 §3 — the paperclip tab's pop-up groups the materials by when they went (with the query, asked
 * [date], sent [date] / sent later), leaves empty groups out, and the tab takes its stage's accent.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { materialGroups, TAB_ACCENT, tabAccent } from "./qc1533";

const NOW = Date.UTC(2026, 10, 8, 12);
const STAGE = Date.UTC(2026, 9, 20, 12); // 20 Oct

describe("the materials, grouped by when they went", () => {
  it("with the query: the pieces, then the package", () => {
    const g = materialGroups({ materialsWanted: ["Query letter", "Synopsis"] }, QueryStatus.QUERIED, "Spring round", null, NOW)!;
    expect(g.count).toBe(2);
    expect(g.groups).toEqual([{ kind: "query", label: "With the query", chips: [{ name: "Covering letter", asked: false }, { name: "Synopsis", asked: false }], pkg: "Spring round" }]);
  });

  it("asked: what the agent asked for and has not had, dated by its request", () => {
    const g = materialGroups({ materialsWanted: ["Query letter"], materialsRequestedType: "pages", materialsRequestedQuantity: 50, partialRequestedDate: "2026-10-03T10:00:00.000Z" }, QueryStatus.PARTIAL_REQUESTED, null, STAGE, NOW)!;
    expect(g.groups.map((x) => x.label)).toEqual(["With the query", "Asked 3 Oct"]);
    expect(g.groups[1].chips).toEqual([{ name: "First 50 pages", asked: true }]);
    expect(g.count).toBe(2);
  });

  it("an asked piece with no request date falls back to the day the stage began", () => {
    const g = materialGroups({}, QueryStatus.FULL_REQUESTED, null, STAGE, NOW)!;
    expect(g.groups).toEqual([{ kind: "asked", label: "Asked 20 Oct", chips: [{ name: "Full manuscript", asked: true }], pkg: null }]);
  });

  it("sent: later pieces that have gone, one group per day, oldest first; 'Sent later' with no date", () => {
    const g = materialGroups({ materialsWanted: ["Query letter"], materialsRequestedType: "pages", materialsRequestedQuantity: 50, partialSentDate: "2026-09-01T09:00:00.000Z", fullSentDate: "2026-10-12T09:00:00.000Z" }, QueryStatus.FULL_SENT, null, STAGE, NOW)!;
    expect(g.groups.map((x) => [x.kind, x.label, x.chips.map((c) => c.name)])).toEqual([
      ["query", "With the query", ["Covering letter"]],
      ["sent", "Sent 1 Sep", ["First 50 pages"]],
      ["sent", "Sent 12 Oct", ["Full manuscript"]],
    ]);
    const undated = materialGroups({ materialsRequestedType: "pages", materialsRequestedQuantity: 50 }, QueryStatus.PARTIAL_SENT, null, null, NOW)!;
    expect(undated.groups).toEqual([{ kind: "sent", label: "Sent later", chips: [{ name: "First 50 pages", asked: false }], pkg: null }]);
  });

  it("a full asked after a partial went: Asked comes before Sent", () => {
    const g = materialGroups({ materialsRequestedType: "pages", materialsRequestedQuantity: 50, partialSentDate: "2026-09-01T09:00:00.000Z", fullRequestedDate: "2026-10-20T09:00:00.000Z" }, QueryStatus.FULL_REQUESTED, null, STAGE, NOW)!;
    expect(g.groups.map((x) => x.label)).toEqual(["Asked 20 Oct", "Sent 1 Sep"]);
  });

  it("empty groups are left out, and with no material data there is no tab", () => {
    const g = materialGroups({ materialsWanted: [] }, QueryStatus.FULL_REQUESTED, null, STAGE, NOW)!;
    expect(g.groups.map((x) => x.kind)).toEqual(["asked"]);
    expect(materialGroups({}, QueryStatus.QUERIED, null, null, NOW)).toBeNull();
    expect(materialGroups({ materialsWanted: [] }, QueryStatus.REJECTED, "  ", null, NOW)).toBeNull();
  });

  it("a package with no recorded pieces still has its With the query group, counted as one", () => {
    const g = materialGroups({}, QueryStatus.QUERIED, "Spring round", null, NOW)!;
    expect(g.count).toBe(1);
    expect(g.groups).toEqual([{ kind: "query", label: "With the query", chips: [], pkg: "Spring round" }]);
  });
});

describe("the tab's accent follows the slip's stage", () => {
  it("maps each header colour to its deeper accent and ink", () => {
    expect(TAB_ACCENT).toEqual({
      sand: { accent: "#e0d2bb", ink: "#5e4c36", rest: "#7b6c5a" },
      rose: { accent: "#ddb9b1", ink: "#5f433d", rest: "#7c6560" },
      blue: { accent: "#bccbdc", ink: "#2e4864", rest: "#546980" },
      heather: { accent: "#d4b7c2", ink: "#653f56", rest: "#816274" },
    });
  });
  it("the resting ink is the ink 82% over white", () => {
    const mix = (h: string) => [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * 0.82 + 255 * 0.18));
    for (const a of Object.values(TAB_ACCENT)) expect(mix(a.ink)).toEqual([1, 3, 5].map((i) => parseInt(a.rest.slice(i, i + 2), 16)));
  });
  it("by status: an offer heather, a partial rose, a full blue, waiting sand", () => {
    expect(tabAccent(QueryStatus.OFFER)).toBe(TAB_ACCENT.heather);
    expect(tabAccent(QueryStatus.PARTIAL_REQUESTED)).toBe(TAB_ACCENT.rose);
    expect(tabAccent(QueryStatus.FULL_REQUESTED)).toBe(TAB_ACCENT.blue);
    expect(tabAccent(QueryStatus.QUERIED)).toBe(TAB_ACCENT.sand);
  });
  it("no red or rust ink", () => {
    for (const a of Object.values(TAB_ACCENT)) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(a.ink.slice(i, i + 2), 16));
      expect(r - Math.max(g, b), a.ink).toBeLessThan(40);
    }
  });
});
