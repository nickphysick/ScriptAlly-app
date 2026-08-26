/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ SEMANTIC 3 — UNRECORDED IS NEVER FOLDED INTO A KNOWN ══════════════════════════════════════
 *
 * A sample sent before the versions feature existed, or sent without choosing an opening, carries
 * no `bookVersionId`. It must get its OWN row and must never be added to a named version's count,
 * on any of the three surfaces that state one: the versions list's held-by counts, "Requests by
 * opening", and "Who holds which version".
 *
 * ⚠️ THIS FEATURE HAS ALREADY PRODUCED THREE FAULTS OF EXACTLY THIS SHAPE, and the most instructive
 * is recorded in `earlierLine`'s own docstring: the numerator excluded unrecorded holders and the
 * DENOMINATOR did not, so the panel read "2 of 4 hold a version earlier than your latest" when only
 * two of the four had any version recorded at all. Arithmetically true; read as "the other two hold
 * the latest", which is false. The other two are unknown.
 *
 * ⚠️ AND THE FAILURE IS ALWAYS SILENT AND ALWAYS FLATTERING. Folding an unrecorded sample into a
 * named version makes that version look busier than it is; dropping it makes the page state fewer
 * samples than exist. Both keep every total looking sane, which is why the check has to name the
 * unrecorded ones rather than merely check that the numbers add up.
 */
import { describe, it, expect } from "vitest";
import {
  unattributedOpening, unrecordedHolders, openingRows, samplesOfVersion, holdingRows,
} from "./bookVersions";
import { isRequest } from "./packageMetrics";
import {
  Query, QueryStatus, Activity, ManuscriptVersion, ComponentType, BookVersion, SubmissionPackage,
} from "../types";

const bv = (id: string, name: string): BookVersion =>
  ({ id, name, kind: "revision", createdAt: "2026-01-01" } as unknown as BookVersion);

/** A sample material. `bookVersionId` omitted → the unrecorded case this file is about. */
const sample = (id: string, bookVersionId?: string): ManuscriptVersion =>
  ({ id, userId: "u", manuscriptId: "m1", componentType: ComponentType.SAMPLE_PAGES,
     versionName: id, createdDate: "2026-01-01", status: "Final", wordCount: 500,
     ...(bookVersionId ? { bookVersionId } : {}) } as unknown as ManuscriptVersion);

const pkg = (id: string, samplePagesVersionId: string): SubmissionPackage =>
  ({ id, userId: "u", manuscriptId: "m1", packageName: id, createdDate: "2026-01-01",
     queryLetterVersionId: "l1", synopsisVersionId: "s1", samplePagesVersionId } as unknown as SubmissionPackage);

const q = (id: string, status: QueryStatus, packageId = "", agentId = "a1"): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId, packageId, status,
     dateSent: "2026-02-01", materialsWanted: [] } as unknown as Query);

const send = (queryId: string, date: string, status: QueryStatus, bookVersionId?: string): Activity =>
  ({ id: `${queryId}-${date}`, userId: "u", queryId, manuscriptId: "m1", date, description: "sent",
     resultingStatus: status, ...(bookVersionId ? { bookVersionId } : {}) } as unknown as Activity);

/* ── The fixture, and it is the whole point of the file ───────────────────────────────────────
   Two named versions with a sample each, and ONE sample carrying no version at all. Three
   packages, three sends, one of them of the unrecorded sample. */
const VERSIONS = [bv("bv1", "Initial"), bv("bv2", "Prologue-first")];
const MATERIALS = [sample("s-init", "bv1"), sample("s-pro", "bv2"), sample("s-unrec")];
const PACKAGES = [pkg("p1", "s-init"), pkg("p2", "s-pro"), pkg("p3", "s-unrec")];
const QUERIES = [
  q("q1", QueryStatus.FULL_REQUESTED, "p1"),
  q("q2", QueryStatus.FULL_SENT, "p2", "a2"),
  q("q3", QueryStatus.PARTIAL_SENT, "p3", "a3"),
];
const ACTS = [
  send("q2", "2026-05-01", QueryStatus.FULL_SENT, "bv2"),
  /* ⚠️ NO `bookVersionId` — the send that predates the feature. This is the holder the page must
     name rather than attribute. */
  send("q3", "2026-06-01", QueryStatus.PARTIAL_SENT),
];

// ─────────────────────────────────────────────────────────────────────────────
describe("the versions list's per-version counts", () => {
  it("counts only the samples that name each version", () => {
    expect(samplesOfVersion("bv1", MATERIALS).map((m) => m.id)).toEqual(["s-init"]);
    expect(samplesOfVersion("bv2", MATERIALS).map((m) => m.id)).toEqual(["s-pro"]);
    // The unrecorded sample belongs to neither, and to no third version invented for it.
    for (const v of VERSIONS) {
      expect(samplesOfVersion(v.id, MATERIALS).map((m) => m.id)).not.toContain("s-unrec");
    }
  });

  /**
   * ⚠️ THE HOLDER WITH NO RECORDED VERSION IS COUNTED ON ITS OWN LINE. Without this the page states
   * two named versions held by one agent each and says nothing about the third agent at all — the
   * silent-drop half of the fault.
   */
  it("names the holders whose version is unknown rather than dropping them", () => {
    expect(unrecordedHolders(QUERIES, ACTS)).toBe(1);
  });

  it("counts no unrecorded holder against any named version", () => {
    const rows = holdingRows(QUERIES, ACTS, VERSIONS, () => "A", (d) => d);
    const named = rows.filter((r) => r.versionName !== null);
    expect(named.map((r) => r.versionName)).toEqual(["Prologue-first"]);
    // The third agent is still LISTED — what they hold is a fact even when which version is not.
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.versionName === null)).toHaveLength(1);
    expect(unrecordedHolders(QUERIES, ACTS)).toBe(rows.filter((r) => r.versionName === null).length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("requests by opening", () => {
  it("gives every named version its own row, and none of them the unrecorded sample", () => {
    const rows = openingRows(VERSIONS, MATERIALS, PACKAGES, QUERIES, isRequest);
    expect(rows.map((r) => r.name)).toEqual(["Initial", "Prologue-first"]);
    for (const r of rows) expect(r.where).toContain("1 sample");
  });

  /**
   * ⚠️ ITS OWN ROW, AND `Not attributed` RATHER THAN A REQUEST COUNT. A request that arrived on a
   * sample whose opening was never recorded cannot be attributed to an opening — stating a figure
   * would be attributing it to "unknown", which is not an opening a writer can act on.
   */
  it("states the unattributed samples on a row of their own", () => {
    const un = unattributedOpening(MATERIALS, PACKAGES, QUERIES);
    expect(un.samples).toBe(1);
    expect(un.packages).toBe(1);
    expect(un.sent).toBe(1);
  });

  it("the two together account for every sample, with none counted twice", () => {
    const rows = openingRows(VERSIONS, MATERIALS, PACKAGES, QUERIES, isRequest);
    const named = rows.reduce((n, r) => n + Number(/^(\d+) sample/.exec(r.where)![1]), 0);
    const un = unattributedOpening(MATERIALS, PACKAGES, QUERIES);
    const allSamples = MATERIALS.filter((m) => m.componentType === ComponentType.SAMPLE_PAGES).length;
    expect(named + un.samples).toBe(allSamples);
  });

  it("says nothing at all when every sample names a version", () => {
    const tidy = [sample("s-init", "bv1"), sample("s-pro", "bv2")];
    expect(unattributedOpening(tidy, PACKAGES, QUERIES).samples).toBe(0);
  });

  /**
   * ⚠️ A `bookVersionId` ON A LETTER OR A SYNOPSIS IS MEANINGLESS AND MUST NOT MAKE IT ATTRIBUTED.
   * `bookVersionOf` already ignores one; the unattributed count must agree, or a stored id on the
   * wrong component type would quietly remove a sample from both sides of the reconciliation.
   */
  it("counts only sample pages, whatever a letter happens to carry", () => {
    const letter = ({ id: "l9", userId: "u", manuscriptId: "m1",
                      componentType: ComponentType.QUERY_LETTER, versionName: "l9",
                      createdDate: "2026-01-01", status: "Final", wordCount: 400,
                      bookVersionId: "bv1" } as unknown as ManuscriptVersion);
    const un = unattributedOpening([...MATERIALS, letter], PACKAGES, QUERIES);
    expect(un.samples).toBe(1);
  });
});
