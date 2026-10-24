/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcViewMemory — Query Centre v140 §F: grouping, sort and density per device (`qh.qc.view`, migrating v132's
 * `sa.qcList.v1` once); the filters (quick picks included), the search and the unpinned scroll for the visit
 * (`qh.qc.filters`). Both versioned and validated on read.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { emptyQc138Filters } from "./qc138";
import { QC_LIST_MEMORY_KEY, serialiseQcListMemory } from "./qcListMemory";
import {
  DEFAULT_QC_VIEW, DEFAULT_QC_VISIT, QC_VIEW_KEY, QC_VISIT_KEY, readQcView, readQcVisit, sanitiseQcView, sanitiseQcVisit,
  writeQcView, writeQcVisit,
} from "./qcViewMemory";

function memStore(broken = false): Storage {
  const m = new Map<string, string>();
  const no = () => { throw new Error("blocked"); };
  return {
    get length() { return m.size; },
    clear: () => (broken ? no() : m.clear()),
    getItem: (k: string) => (broken ? no() : m.get(k) ?? null),
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => (broken ? no() : void m.delete(k)),
    setItem: (k: string, v: string) => (broken ? no() : void m.set(k, String(v))),
  } as Storage;
}
const g = globalThis as unknown as { window?: { localStorage: Storage; sessionStorage: Storage } };
beforeEach(() => { g.window = { localStorage: memStore(), sessionStorage: memStore() }; });
afterEach(() => { delete g.window; });

describe("the view — per device (qh.qc.view)", () => {
  it("the keys", () => {
    expect(QC_VIEW_KEY).toBe("qh.qc.view");
    expect(QC_VISIT_KEY).toBe("qh.qc.filters");
  });
  /* v141 §C — the default grouping moved from "Who it's with" (attention) to Status */
  it("a first visit: Status, due first, comfortable, List (v142 §A)", () => {
    expect(readQcView()).toEqual({ group: "status", sort: { key: "due", reversed: false }, density: "comfortable" });
  });
  it("v149 B5 — list only: a record still carrying v142's view keeps its other fields and is never written back", () => {
    g.window!.localStorage.setItem(QC_VIEW_KEY, JSON.stringify({ v: 1, group: "action", sort: { key: "due", reversed: false }, density: "compact", view: "cards" }));
    expect(readQcView()).toEqual({ group: "action", sort: { key: "due", reversed: false }, density: "compact" });
    writeQcView({ density: "comfortable" });
    expect(JSON.parse(g.window!.localStorage.getItem(QC_VIEW_KEY)!)).not.toHaveProperty("view");
  });
  it("round-trips grouping, sort and density", () => {
    /* v141 §C — Status is the default now, so the round trip saves a grouping that is not (a saved choice is honoured) */
    writeQcView({ group: "action" });
    writeQcView({ sort: { key: "agent", reversed: true } });
    writeQcView({ density: "compact" });
    expect(readQcView()).toEqual({ group: "action", sort: { key: "agent", reversed: true }, density: "compact" });
  });
  it("migrates sa.qcList.v1 once: its grouping and density move in, the old key goes", () => {
    g.window!.localStorage.setItem(QC_LIST_MEMORY_KEY, serialiseQcListMemory({ density: "compact", group: "package" }));
    expect(readQcView()).toEqual({ ...DEFAULT_QC_VIEW(), group: "package", density: "compact" });
    expect(g.window!.localStorage.getItem(QC_LIST_MEMORY_KEY)).toBeNull();
    expect(g.window!.localStorage.getItem(QC_VIEW_KEY)).not.toBeNull();
    /* qh.qc.view wins thereafter, even if the old key reappears */
    g.window!.localStorage.setItem(QC_LIST_MEMORY_KEY, serialiseQcListMemory({ density: "comfortable", group: "none" }));
    expect(readQcView().group).toBe("package");
  });
  it("another version, junk, or unknown values read as the defaults", () => {
    expect(sanitiseQcView({ v: 2, group: "status" })).toBeNull();
    expect(sanitiseQcView({ v: 1, group: "colour", sort: { key: "height", reversed: true }, density: "huge" })).toEqual(DEFAULT_QC_VIEW());
    g.window!.localStorage.setItem(QC_VIEW_KEY, "{");
    expect(readQcView()).toEqual(DEFAULT_QC_VIEW());
  });
  it("blocked storage: the defaults, and writes do not throw", () => {
    g.window = { localStorage: memStore(true), sessionStorage: memStore(true) };
    expect(readQcView()).toEqual(DEFAULT_QC_VIEW());
    expect(() => writeQcView({ group: "none" })).not.toThrow();
    expect(readQcVisit()).toBeNull();
    expect(() => writeQcVisit({ search: "x" })).not.toThrow();
  });
});

describe("the visit — for the session (qh.qc.filters)", () => {
  it("nothing stored: null (the page starts unfiltered, at the top)", () => {
    expect(readQcVisit()).toBeNull();
  });
  it("round-trips the filters (quick picks included), the search and the scroll, each write merging", () => {
    const f = { ...emptyQc138Filters(), stages: [QueryStatus.QUERIED], past: true, you: true, sent: ["pkg-1"] };
    writeQcVisit({ filters: f });
    writeQcVisit({ search: "vale" });
    writeQcVisit({ scroll: 812.4 });
    expect(readQcVisit()).toEqual({ filters: f, search: "vale", scroll: 812 });
  });
  it("unknown statuses, wrong types and another version are refused", () => {
    expect(sanitiseQcVisit({ v: 2, search: "x" })).toBeNull();
    const r = sanitiseQcVisit({ v: 1, filters: { stages: ["Queried", "Nonsense", 3], past: "yes", sent: [1, "", "p"] }, search: 7, scroll: -4 });
    expect(r).toEqual({ ...DEFAULT_QC_VISIT(), filters: { ...emptyQc138Filters(), stages: [QueryStatus.QUERIED], sent: ["p"] } });
  });
});
