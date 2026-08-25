/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE TWO TRACKING PANELS (Part D) ══════════════════════════════════════════════════════════
 *
 * Design authority: design-refs/manuscript-loop-design.html §4 and §5.
 *
 * ⚠️ THE INPUTS ARE BUILT THE WAY THE APP BUILDS THEM. `isRequest` is the app's own predicate, not a
 * hand-written status list — a test that hands a function an argument its callers cannot produce is
 * exercising a function nobody runs.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openingRows, holdingRows, earlierLine } from "./bookVersions";
import { isRequest } from "./packageMetrics";
import { ComponentType, QueryStatus } from "../types";
import type { Activity, BookVersion, ManuscriptVersion, Query } from "../types";

const bv = (id: string, name: string, createdDate = "2026-05-01"): BookVersion =>
  ({ id, name, kind: "reordering", createdDate });

const sample = (id: string, bookVersionId?: string, type = ComponentType.SAMPLE_PAGES): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u", componentType: type, versionName: id,
     fileAttached: false, createdDate: "", bookVersionId } as ManuscriptVersion);

const q = (id: string, status: QueryStatus, packageId?: string, agentId = "ag1"): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId, status, packageId } as unknown as Query);

const send = (queryId: string, bookVersionId: string, date: string,
              resultingStatus = QueryStatus.FULL_SENT): Activity =>
  ({ id: `act-${queryId}-${date}`, userId: "u", queryId, manuscriptId: "m1",
     activityType: "Materials Sent", description: "", date, details: "",
     resultingStatus, bookVersionId } as unknown as Activity);

const NAMES: Record<string, string> = { ag1: "T. Marsh", ag2: "R. Osei", ag3: "A. Whitmore" };
const nameOf = (id: string) => NAMES[id] ?? "Agent not recorded";
const day = (iso: string) => iso.slice(8, 10) + " " + iso.slice(5, 7);

// ─────────────────────────────────────────────────────────────────────────────
describe("D15 — requests by opening", () => {
  const versions = [bv("va", "Prologue-first"), bv("vb", "Worldbuilding-first")];
  const materials = [sample("s1", "va"), sample("s2", "va"), sample("s3", "vb"),
                     sample("s4", "va", ComponentType.QUERY_LETTER)];
  const packages = [{ id: "p1", samplePagesVersionId: "s1" }, { id: "p2", samplePagesVersionId: "s2" },
                    { id: "p3", samplePagesVersionId: "s3" }];
  const queries = [q("q1", QueryStatus.FULL_REQUESTED, "p1"), q("q2", QueryStatus.QUERIED, "p1"),
                   q("q3", QueryStatus.QUERIED, "p2"), q("q4", QueryStatus.QUERIED, "p3")];

  it("counts samples, packages and sends per opening", () => {
    const [a, b] = openingRows(versions, materials, packages, queries, isRequest);
    expect(a.where).toBe("2 samples · 2 packages");
    expect(a.meta).toBe("1 request from 3 sent");
    expect(b.where).toBe("1 sample · 1 package");
    expect(b.meta).toBe("0 requests from 1 sent");
  });

  it("⚠️ LISTS AN OPENING NOTHING HAS GONE OUT WITH — a row that vanishes says nothing", () => {
    /* `requestsByMaterial` one level down DROPS its empty rows. This must not: "nothing has been
       sent with this opening yet" is the most useful thing the panel can tell somebody who has
       just made one. */
    const rows = openingRows([...versions, bv("vz", "Untested")], materials, packages, queries, isRequest);
    expect(rows.map((r) => r.name)).toContain("Untested");
    expect(rows.find((r) => r.name === "Untested")?.meta).toBe("0 requests from 0 sent");
  });

  it("⚠️ STATES NO RATE ANYWHERE (D15) — 2-from-18 against 0-from-6 is not a result", () => {
    for (const r of openingRows(versions, materials, packages, queries, isRequest)) {
      expect(r.meta).not.toContain("%");
      expect(r.where).not.toContain("%");
    }
  });

  it("bars a share of the busiest row, so the eye can rank without a rate", () => {
    const [a, b] = openingRows(versions, materials, packages, queries, isRequest);
    expect(a.sentPct).toBe(100);          // 3 of the busiest 3
    expect(b.sentPct).toBe(33);           // 1 of 3
    expect(a.inPct).toBe(33);             // 1 request in 3 sends
  });

  it("agrees its verbs at one", () => {
    const rows = openingRows([bv("va", "A")], [sample("s1", "va")], [{ id: "p1", samplePagesVersionId: "s1" }],
                             [q("q1", QueryStatus.FULL_REQUESTED, "p1")], isRequest);
    expect(rows[0].where).toBe("1 sample · 1 package");
    expect(rows[0].meta).toBe("1 request from 1 sent");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D16 — who holds what", () => {
  const versions = [bv("va", "Prologue-first", "2026-03-01"), bv("vb", "Post-R&R", "2026-07-01")];
  const acts = [send("q1", "va", "2026-05-30"), send("q2", "vb", "2026-08-02"),
                send("q3", "va", "2026-06-11", QueryStatus.PARTIAL_SENT)];
  const queries = [q("q1", QueryStatus.FULL_SENT, undefined, "ag2"),
                   q("q2", QueryStatus.FULL_SENT, undefined, "ag1"),
                   q("q3", QueryStatus.PARTIAL_SENT, undefined, "ag3"),
                   q("q4", QueryStatus.QUERIED), q("q5", QueryStatus.REJECTED)];

  it("lists only who is currently holding something, with what and when", () => {
    const rows = holdingRows(queries, acts, versions, nameOf, day);
    expect(rows.map((r) => r.queryId)).toEqual(["q2", "q3", "q1"]);   // newest send first
    expect(rows[0]).toEqual({ queryId: "q2", agent: "T. Marsh", what: "FULL · sent 02 08", versionName: "Post-R&R" });
    expect(rows[1].what).toBe("PARTIAL · sent 11 06");
  });

  it("⚠️ NEWEST FIRST, and an undated send sorts LAST rather than reading as 'just now'", () => {
    const rows = holdingRows([...queries, q("q9", QueryStatus.FULL_SENT, undefined, "ag1")],
                             acts, versions, nameOf, day);
    expect(rows[rows.length - 1].queryId).toBe("q9");
  });

  it("says nothing rather than guessing where the send predates the feature", () => {
    const rows = holdingRows([q("q9", QueryStatus.FULL_SENT)], [], versions, nameOf, day);
    expect(rows[0].versionName).toBeNull();
    /* and the row still renders — what they hold is a fact even when which version is not */
    expect(rows[0].what).toBe("FULL");
  });

  it("names an unresolvable agent through the app's own label", () => {
    const rows = holdingRows([q("q1", QueryStatus.FULL_SENT, undefined, "nobody")], acts, versions, nameOf, day);
    expect(rows[0].agent).toBe("Agent not recorded");
  });

  it("stores nothing — the whole panel is a derivation", () => {
    const types = readFileSync(join(__dirname, "..", "types.ts"), "utf8");
    const i = types.indexOf("export interface Query {");
    expect(types.slice(i, types.indexOf("\n}", i))).not.toMatch(/holds|holding/i);
  });
});

describe("D17 — earlier is a count, and nothing more", () => {
  const versions = [bv("va", "Prologue-first", "2026-03-01"), bv("vb", "Post-R&R", "2026-07-01")];
  const acts = [send("q1", "va", "2026-05-30"), send("q2", "vb", "2026-08-02"),
                send("q3", "va", "2026-06-11", QueryStatus.PARTIAL_SENT)];
  const queries = [q("q1", QueryStatus.FULL_SENT), q("q2", QueryStatus.FULL_SENT),
                   q("q3", QueryStatus.PARTIAL_SENT)];

  it("states the count against the total", () => {
    expect(earlierLine(queries, acts, versions)).toBe("2 of 3 hold a version earlier than your latest.");
  });

  it("says NOTHING when everybody holds the latest", () => {
    /* a line reading "0 of 3" would be a reassurance nobody asked for, on every page load */
    expect(earlierLine([q("q2", QueryStatus.FULL_SENT)], acts, versions)).toBeNull();
  });

  it("⚠️ CARRIES NO VERB — whether to send an update is a judgement the app does not make", () => {
    const line = earlierLine(queries, acts, versions) ?? "";
    for (const w of ["should", "consider", "send them", "update them", "chase", "worth", "recommend"]) {
      expect(line.toLowerCase(), `the line urges: "${w}"`).not.toContain(w);
    }
  });

  it("⚠️ COMPARES IDS, NOT NAMES — two versions may share a label, and labels are renameable", () => {
    const twins = [bv("va", "Draft", "2026-03-01"), bv("vb", "Draft", "2026-07-01")];
    /* q1 holds `va`, which IS earlier than `vb` despite the identical name */
    expect(earlierLine([q("q1", QueryStatus.FULL_SENT)], acts, twins))
      .toBe("1 of 1 hold a version earlier than your latest.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D18 — both panels are gated, once", () => {
  const band = readFileSync(join(__dirname, "..", "components", "packages", "TrackingBand.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("reads the shared gate rather than counting versions itself", () => {
    expect(band).toContain("versionsActive(");
    /* a second surface inventing its own threshold is how two surfaces come to disagree */
    expect(band).not.toMatch(/bookVersions\.length\s*[><]=?\s*\d/);
  });

  it("gates BOTH panels on it", () => {
    expect((band.match(/\{showVersions &&/g) ?? []).length).toBe(2);
  });

  it("⚠️ the holders panel also needs somebody holding something", () => {
    /* an empty "Manuscripts out with agents · 0 held" is a heading with nothing under it */
    expect(band).toContain("showVersions && holders.length > 0");
  });
});
