/**
 * ⚠️ THE TWO CLAIMS THAT MATTER PULL IN OPPOSITE DIRECTIONS, so a fixture with only one state
 * would pass on half the behaviour: a version chip must state HOLDINGS and must never state a word
 * count, and an unused one must state its absence in words rather than as two zeros.
 */
import { describe, it, expect } from "vitest";
import { builderRail, versionMetaLine, RAIL_KINDS, RAIL_HEADING, VERSIONS_NOTE } from "./builderRail";
import { ComponentType, QueryStatus } from "../types";
import type { Activity, BookVersion, ManuscriptVersion, Query, SubmissionPackage } from "../types";

const mat = (id: string, t: ComponentType, over: Partial<ManuscriptVersion> = {}): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u", componentType: t, versionName: id,
     fileAttached: false, createdDate: "", status: "Active", ...over } as ManuscriptVersion);
const bv = (id: string, name: string): BookVersion =>
  ({ id, name, kind: "reordering", createdDate: "2026-01-01" });
const pkg = (id: string, over: Partial<SubmissionPackage> = {}): SubmissionPackage =>
  ({ id, userId: "u", manuscriptId: "m1", packageName: id, queryLetterVersionId: "",
     synopsisVersionId: "", samplePagesVersionId: "", createdDate: "", ...over } as SubmissionPackage);
const q = (id: string, agentId: string, status: QueryStatus, packageId = ""): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId, packageId, status } as Query);
const act = (queryId: string, bookVersionId: string): Activity =>
  ({ id: `a-${queryId}`, userId: "u", queryId, bookVersionId, date: "2026-02-01",
     resultingStatus: QueryStatus.FULL_SENT } as unknown as Activity);

const MATS = [
  mat("ql1", ComponentType.QUERY_LETTER, { versionName: "Hook-first", contentDraft: "a b c" }),
  mat("ql2", ComponentType.QUERY_LETTER, { versionName: "Voice-led", fileAttached: true, fileName: "v.docx" }),
  mat("syn1", ComponentType.SYNOPSIS, { versionName: "One-page", contentDraft: "x y" }),
];
/* ⚠️ THREE, SO BOTH UNUSED BRANCHES EXIST: bv2 is unused and NOT the newest, bv3 is unused and IS.
   With two versions the only unused one was also the latest, and the `Latest ·` clause could not be
   told apart from the sentence it prefixes. */
const BVS = [bv("bv1", "Prologue-first"), bv("bv2", "Worldbuilding-first"), bv("bv3", "Post-R&R")];
const PKGS = [pkg("p1", { queryLetterVersionId: "ql1", synopsisVersionId: "syn1", bookVersionId: "bv1" })];
const QS = [q("q1", "a1", QueryStatus.FULL_SENT, "p1"), q("q2", "a2", QueryStatus.FULL_SENT, "p1")];
const ACTS = [act("q1", "bv1"), act("q2", "bv1")];

describe("builderRail", () => {
  const rail = () => builderRail(MATS, PKGS, BVS, QS, ACTS);

  it("is three sections, in the rail's order", () => {
    expect(rail().map((s) => s.kind)).toEqual([...RAIL_KINDS]);
    expect(rail().map((s) => s.heading)).toEqual(["Covering letters", "Synopses", "Versions"]);
    expect(RAIL_HEADING.ver).toBe("Versions");
  });

  it("only the versions section carries a note (D11)", () => {
    expect(rail().map((s) => s.note)).toEqual([null, null, VERSIONS_NOTE]);
    expect(VERSIONS_NOTE).toContain("writes it there too");
  });

  it("a letter's meta is its source and how many packages hold it", () => {
    const c = rail()[0].chips.find((x) => x.name === "Hook-first")!;
    expect(c.meta).toMatch(/^Text · 3 words · in 1$/);
    expect(c.unused).toBe(false);
  });

  it("⚠️ a VERSION states holdings and NEVER a word count (D9)", () => {
    const c = rail()[2].chips.find((x) => x.name === "Prologue-first")!;
    expect(c.meta).toBe("1 package · held by 2 agents");
    expect(c.meta).not.toMatch(/word/i);
    expect(c.meta).not.toMatch(/Text|Ref/);
  });

  it("⚠️ agents are counted once each, however many sends they carry", () => {
    /* Two queries, two agents, two send activities — `held by 2 agents`, not 2 sends dressed up. */
    const twice = [...ACTS, act("q1", "bv1")];
    expect(builderRail(MATS, PKGS, BVS, QS, twice)[2].chips[0].meta).toBe("1 package · held by 2 agents");
  });

  it("⚠️ NOT USED is set on both kinds, and only where nothing holds them (D10)", () => {
    const r = rail();
    /* both branches entered — an all-used or all-unused fixture would prove one */
    expect(r[0].chips.map((c) => [c.name, c.unused])).toEqual([["Hook-first", false], ["Voice-led", true]]);
    expect(r[2].chips.map((c) => [c.name, c.unused]))
      .toEqual([["Prologue-first", false], ["Worldbuilding-first", true], ["Post-R&R", true]]);
  });

  it("⚠️ an unused chip states its absence in WORDS, never as a zero (rule 9)", () => {
    const r = rail();
    expect(r[0].chips[1].meta, "a letter drops the `in N` clause rather than reading `in 0`").not.toMatch(/in 0/);
    /* the unused, non-newest one — the bare sentence */
    expect(r[2].chips[1].meta).toBe("not yet in a package");
    /* and the unused NEWEST one — the same sentence with the clause that is true of it */
    expect(r[2].chips[2].meta).toBe("Latest · not yet in a package");
    for (const c of r[2].chips) expect(c.meta).not.toMatch(/\b0\b/);
  });
});

describe("versionMetaLine", () => {
  it("agrees its verbs at one", () => {
    expect(versionMetaLine(1, 1, false)).toBe("1 package · held by 1 agent");
    expect(versionMetaLine(2, 4, false)).toBe("2 packages · held by 4 agents");
  });

  it("⚠️ `Latest` only where it is true", () => {
    expect(versionMetaLine(0, 0, true)).toBe("Latest · not yet in a package");
    expect(versionMetaLine(0, 0, false)).toBe("not yet in a package");
  });

  it("⚠️ a version IN packages is never labelled Latest — the clause belongs to the absence", () => {
    expect(versionMetaLine(2, 1, true)).toBe("2 packages · held by 1 agent");
  });
});
