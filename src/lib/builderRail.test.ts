/**
 * ⚠️ THE TWO CLAIMS THAT MATTER PULL IN OPPOSITE DIRECTIONS, so a fixture with only one state
 * would pass on half the behaviour: a version chip must state HOLDINGS and must never state a word
 * count, and an unused one must state its absence in words rather than as two zeros.
 */
import { describe, it, expect } from "vitest";
import { builderRail, RAIL_KINDS, RAIL_HEADING, VERSIONS_NOTE, RAIL_EMPTY } from "./builderRail";
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
  /* ⚠️ AN ATTACHMENT WITH NO DRAFT — the case Nick asked to be driven rather than reasoned about. */
  mat("ql2", ComponentType.QUERY_LETTER, { versionName: "Voice-led", fileAttached: true, fileName: "v.docx", contentType: "ref" }),
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

  it("a letter's card carries its own body, its word count and its use", () => {
    const c = rail()[0].chips.find((x) => x.name === "Hook-first")!;
    expect(c.body, "the two lines are the material ITSELF (R4)").toEqual({ kind: "text", text: "a b c" });
    expect(c.src).toBe("3 words");
    expect(c.srcIcon).toBe("page");
    expect(c.use).toBe("In 1");
    expect(c.unused).toBe(false);
  });

  it("⚠️ AN ATTACHED FILE SHOWS THE FILE, and its foot says what kind of thing it is (D2/D3)", () => {
    /* The band used to be left blank here, which read as a line that had failed to load. A file is
       not an absence — it is a different kind of content — so the band shows it, and the foot stops
       repeating the filename the plate is already showing. */
    const c = rail()[0].chips.find((x) => x.name === "Voice-led")!;
    expect(c.body).toEqual({ kind: "file", fileName: "v.docx", fileKind: "Word document" });
    expect(c.src).toBe("Attached file");
    expect(c.src, "the plate holds the name; the foot does not restate it").not.toContain("v.docx");
    expect(c.srcIcon, "no clip beside a plate that already carries a document mark").toBeNull();
  });

  it("⚠️ AN UNREADABLE EXTENSION RENDERS THE NAME ALONE rather than a guessed kind", () => {
    /* keyed off the NAME the assertion then looks up, so the fixture's ids cannot drift out from
       under it — a hand-written id is an input the finder below may not be able to produce */
    const odd = MATS.map((m) => (m.versionName === "Voice-led" ? { ...m, fileName: "voice-led.qqq" } : m));
    const c = builderRail(odd, PKGS, BVS, QS, ACTS)[0].chips.find((x) => x.name === "Voice-led")!;
    expect(c.body).toEqual({ kind: "file", fileName: "voice-led.qqq", fileKind: null });
    expect(c.src, "the foot is unchanged — what it IS does not depend on reading the extension").toBe("Attached file");
  });

  it("⚠️ A VERSION WITH NO NOTE SAYS SO, because that is its ORDINARY state (D4)", () => {
    /* Five of the eight cards on the dev fixture are note-less versions. Left blank, the Versions
       section mostly looked broken; this is the case the treatment has to serve first. */
    const c = rail()[2].chips.find((x) => x.name === "Prologue-first")!;
    expect(c.body).toEqual({ kind: "nonote" });
  });

  it("⚠️ A MATERIAL WITH NEITHER TEXT NOR FILE KEEPS `Nothing written yet`, and its source is EMPTY (D5/D9)", () => {
    const bare = [...MATS, { ...MATS[1], id: "ql3", versionName: "Untitled", fileName: undefined }];
    const c = builderRail(bare, PKGS, BVS, QS, ACTS)[0].chips.find((x) => x.name === "Untitled")!;
    expect(c.body).toEqual({ kind: "none" });
    /* `Empty` was a STATE in the slot that states what a material IS. The band says it instead. */
    expect(c.src).toBeNull();
  });

  it("⚠️ a VERSION's source slot is `Latest` or nothing, and NEVER a word count (D7)", () => {
    const r = rail();
    const srcs = r[2].chips.map((c) => [c.name, c.src]);
    /* both branches entered — a fixture where every version were the newest would prove one */
    expect(srcs).toEqual([["Prologue-first", null], ["Worldbuilding-first", null], ["Post-R&R", "Latest"]]);
    for (const c of r[2].chips) {
      expect(c.src ?? "").not.toMatch(/word/i);
      expect(c.srcIcon, "no page glyph — a version is not a document").toBeNull();
    }
  });

  it("⚠️ THE TWO SLOTS HOLD TWO REGISTERS, and no usage phrase appears on the left (D7/D8)", () => {
    const all = rail().flatMap((s) => s.chips);
    expect(all.length).toBeGreaterThan(3);
    for (const c of all) {
      expect(c.src ?? "", `${c.name}'s source slot`).not.toMatch(/package|in \d/i);
      expect(c.use, `${c.name}'s usage slot`).toMatch(/^(In \d+|Not in a package)$/);
    }
    /* and the composed foot, which is what actually wrapped: one short phrase per side */
    const feet = all.map((c) => `${c.src ?? ""}|${c.use}`);
    expect(new Set(feet).size, "a fixture where every foot were identical would prove one").toBeGreaterThan(2);
  });

  it("⚠️ usage is stated on EVERY card, and states absence in words rather than as `In 0` (rule 9)", () => {
    const r = rail();
    expect(r[0].chips.map((c) => [c.name, c.use])).toEqual([["Hook-first", "In 1"], ["Voice-led", "Not in a package"]]);
    expect(r[2].chips.map((c) => [c.name, c.use]))
      .toEqual([["Prologue-first", "In 1"], ["Worldbuilding-first", "Not in a package"], ["Post-R&R", "Not in a package"]]);
    for (const c of r.flatMap((s) => s.chips)) expect(c.use).not.toMatch(/\b0\b/);
  });

  it("⚠️ `unused` survives the tag's retirement, because callers still read it (D8)", () => {
    const r = rail();
    /* both branches entered */
    expect(r[0].chips.map((c) => c.unused)).toEqual([false, true]);
    expect(r[2].chips.map((c) => c.unused)).toEqual([false, true, true]);
  });
});

describe("an empty section invites its first (D4)", () => {
  it("⚠️ ALL THREE sections have an empty state, because all three had the gap", () => {
    /* The brief asked for Versions to match the other two; they rendered a heading, a zero and a
       blank. Fixing the instance that was seen would have left two-thirds of the fault. */
    expect(Object.keys(RAIL_EMPTY).sort()).toEqual(["let", "syn", "ver"]);
  });

  it("⚠️ each names its own noun", () => {
    /* One shared "Add your first" makes the reader look up to the heading to find out what they
       are being offered, in the one state where the section has nothing else to say. */
    expect(RAIL_EMPTY.let).toContain("covering letter");
    expect(RAIL_EMPTY.syn).toContain("synopsis");
    expect(RAIL_EMPTY.ver).toContain("version");
    expect(new Set(Object.values(RAIL_EMPTY)).size, "three distinct sentences").toBe(3);
  });

  it("⚠️ the invitation is not a count — an empty section never states a zero in prose", () => {
    for (const v of Object.values(RAIL_EMPTY)) expect(v).not.toMatch(/\b0\b|\bno\b/i);
  });

  it("the versions note survives the empty state (D5)", () => {
    /* It is what tells a writer what the section is FOR, which matters most when it is empty. */
    const empty = builderRail([], [], [], [], []);
    expect(empty[2].note).toBe(VERSIONS_NOTE);
    expect(empty.map((s) => s.chips.length)).toEqual([0, 0, 0]);
  });
});
