/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ VERSIONS IN THE QUERY CENTRE (Part E) ═════════════════════════════════════════════════════
 *
 * ⚠️ THE UNRECORDED CASE IS THE ORDINARY ONE (D9), NOT THE EDGE — every send made before this
 * feature carries no version. Fixtures here lead with it rather than treating it as an afterthought,
 * because two faults in two days were rules applied to the known half and not the unknown one.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  openingRead, manuscriptHeld, versionMatch, MATCH_NOTE, listVersion, sendVersionDefault,
  VERSIONED_SENDS, versionsActive,
} from "./queryVersions";
import { ActivityType, ComponentType, QueryStatus } from "../types";
import type { Activity, BookVersion, ManuscriptVersion, Query, SubmissionPackage } from "../types";

const root = join(__dirname, "..", "..");
const BV: BookVersion[] = [
  { id: "bv-a", name: "Prologue-first", kind: "initial", createdDate: "2026-03-01" },
  { id: "bv-b", name: "Worldbuilding-first", kind: "reordering", createdDate: "2026-05-01" },
];
const sample = (id: string, bookVersionId?: string): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u", componentType: ComponentType.SAMPLE_PAGES,
     versionName: id, fileAttached: false, createdDate: "", bookVersionId } as ManuscriptVersion);
const MATS = [sample("pag-a", "bv-a"), sample("pag-b", "bv-b"), sample("pag-none")];
const pkg = (id: string, samplePagesVersionId: string): SubmissionPackage =>
  ({ id, userId: "u", manuscriptId: "m1", packageName: id, queryLetterVersionId: "ql",
     synopsisVersionId: "", samplePagesVersionId, createdDate: "" } as SubmissionPackage);
const PKGS = [pkg("p-a", "pag-a"), pkg("p-b", "pag-b"), pkg("p-none", "pag-none"), pkg("p-empty", "")];
const q = (packageId?: string): Pick<Query, "id" | "packageId"> => ({ id: "q1", packageId } as never);
const send = (bookVersionId: string | undefined, date: string, s = QueryStatus.FULL_SENT): Activity =>
  ({ id: `a-${date}`, userId: "u", queryId: "q1", manuscriptId: "m1", activityType: "Materials Sent",
     description: "", date, details: "", resultingStatus: s, bookVersionId } as unknown as Activity);

// ─────────────────────────────────────────────────────────────────────────────
describe("D5 — opening read, through the sample and never through the package", () => {
  it("names the version on the package's sample", () => {
    expect(openingRead(q("p-a"), PKGS, MATS, BV)?.name).toBe("Prologue-first");
    expect(openingRead(q("p-b"), PKGS, MATS, BV)?.name).toBe("Worldbuilding-first");
  });

  it("is null where the sample carries no version, the slot is empty, or there is no package", () => {
    expect(openingRead(q("p-none"), PKGS, MATS, BV)).toBeNull();
    expect(openingRead(q("p-empty"), PKGS, MATS, BV)).toBeNull();
    expect(openingRead(q(), PKGS, MATS, BV)).toBeNull();
    expect(openingRead(q("gone"), PKGS, MATS, BV)).toBeNull();
  });

  it("⚠️ reads no version field off a package — there is none, and there must not be", () => {
    const src = readFileSync(join(__dirname, "queryVersions.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).toContain("pkg?.samplePagesVersionId");
    expect(src).not.toMatch(/\bpkg\??\.bookVersionId\b/);
  });
});

describe("D7 — manuscript held, from the last send", () => {
  it("is null until something has been sent — no send, no line", () => {
    expect(manuscriptHeld("q1", [], BV)).toBeNull();
    expect(manuscriptHeld("q1", [send("bv-a", "2026-06-01", QueryStatus.QUERIED)], BV)).toBeNull();
  });

  it("⚠️ takes the LATEST send — a partial then a full means they hold the full's version", () => {
    const acts = [send("bv-a", "2026-05-01", QueryStatus.PARTIAL_SENT), send("bv-b", "2026-07-01")];
    expect(manuscriptHeld("q1", acts, BV)?.version?.name).toBe("Worldbuilding-first");
  });

  it("⚠️ SENT-BUT-UNRECORDED IS ITS OWN ANSWER, distinct from not sent at all", () => {
    /* The ordinary case: every send made before this feature. `{sent:true, version:null}` renders a
       line that says the version is unrecorded; `null` renders no line. Collapsing the two would
       either hide a real send or claim a version nobody recorded. */
    const out = manuscriptHeld("q1", [send(undefined, "2026-06-01")], BV);
    expect(out).not.toBeNull();
    expect(out!.sent).toBe(true);
    expect(out!.version).toBeNull();
  });

  it("ignores other queries' sends", () => {
    const other = { ...send("bv-a", "2026-06-01"), queryId: "q2" } as Activity;
    expect(manuscriptHeld("q1", [other], BV)).toBeNull();
  });
});

describe("⚠️ D9 — an unknown is never folded into a known", () => {
  it("three outcomes, and unknown is neither a match nor a difference", () => {
    expect(versionMatch(BV[0], BV[0])).toBe("match");
    expect(versionMatch(BV[0], BV[1])).toBe("differs");
    expect(versionMatch(BV[0], null)).toBe("unknown");
    expect(versionMatch(null, BV[0])).toBe("unknown");
    expect(versionMatch(null, null)).toBe("unknown");
  });

  it("⚠️ and the unknown case SAYS SO — silence would read as agreement", () => {
    expect(MATCH_NOTE.unknown).toBe("Version not recorded");
    expect(MATCH_NOTE.unknown).not.toBeNull();
  });

  it("⚠️ the difference carries no verdict and no prompt (D7)", () => {
    const all = Object.values(MATCH_NOTE).join(" ").toLowerCase();
    for (const w of ["should", "check", "make sure", "consider", "wrong", "mistake", "fix", "resend"]) {
      expect(all, `the notes urge: "${w}"`).not.toContain(w);
    }
  });
});

describe("D8 — the list chip", () => {
  const full = q("p-a") as Query;
  it("⚠️ HELD wins over READ — the more recent fact answers 'what have they got'", () => {
    expect(listVersion(full, PKGS, MATS, [send("bv-b", "2026-07-01")], BV)?.name).toBe("Worldbuilding-first");
  });
  it("falls back to what they read when nothing has been sent", () => {
    expect(listVersion(full, PKGS, MATS, [], BV)?.name).toBe("Prologue-first");
  });
  it("⚠️ and a send with no version falls back too, rather than reading as nothing", () => {
    /* They were sent something; the app does not know which. What it DOES know is what they read. */
    expect(listVersion(full, PKGS, MATS, [send(undefined, "2026-07-01")], BV)?.name).toBe("Prologue-first");
  });
  it("is null when neither is known", () => {
    expect(listVersion(q("p-none") as Query, PKGS, MATS, [], BV)).toBeNull();
  });
});

describe("D6 — the send flow's default", () => {
  it("pre-fills what they read", () => {
    expect(sendVersionDefault(BV[0])).toBe("bv-a");
  });
  it("⚠️ SEEDS NOTHING where nothing is known — a value invented to fill a hole reads as a choice", () => {
    expect(sendVersionDefault(null)).toBe("");
  });
  it("touches two activity types and no others", () => {
    expect([...VERSIONED_SENDS].sort()).toEqual([QueryStatus.FULL_SENT, QueryStatus.PARTIAL_SENT].sort());
    expect(VERSIONED_SENDS).not.toContain(QueryStatus.QUERIED);
    expect(VERSIONED_SENDS).not.toContain(QueryStatus.REVISE_RESUBMIT);
  });
});

describe("D12 — the gate is the shared one", () => {
  it("is off below two versions and on at two", () => {
    expect(versionsActive({ bookVersions: [] })).toBe(false);
    expect(versionsActive({ bookVersions: [BV[0]] })).toBe(false);
    expect(versionsActive({ bookVersions: BV })).toBe(true);
  });
  it("⚠️ is re-exported, not restated — a second threshold is how surfaces disagree", () => {
    const src = readFileSync(join(__dirname, "queryVersions.ts"), "utf8");
    expect(src).toContain("export { versionsActive }");
    expect(src.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/length\s*>=\s*2/);
  });
});

describe("⚠️ D10 — recomputeQuery is untouched, and this is the load-bearing claim", () => {
  it("the derivation names no version, and does not import this module", () => {
    for (const f of ["src/lib/recomputeQuery.ts", "src/lib/queryDerivation.ts"]) {
      const src = readFileSync(join(root, f), "utf8");
      expect(src, `${f} reads a version`).not.toContain("bookVersion");
      expect(src, `${f} imports the Centre's version module`).not.toContain("queryVersions");
    }
  });

  it("⚠️ and nothing in this module reads a status-bearing field to decide anything", () => {
    /* It READS `resultingStatus` to find the sends — that is payload selection, not derivation. What
       it must never do is WRITE one, or hand one back for something else to store. */
    const src = readFileSync(join(__dirname, "queryVersions.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).not.toMatch(/resultingStatus\s*[:=][^=]/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D1 — editActivity accepts the version, and clears by DELETING", () => {
  const db = readFileSync(join(root, "src/lib/db.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("takes it in the patch type, as string | null", () => {
    expect(db).toContain("{ bookVersionId?: string | null }");
  });

  it("⚠️ CLEARS BY `deleteField()`, NEVER BY STORING `\"\"`", () => {
    /**
     * Checked rather than assumed (D1). `""` is a FORM-level value in this feature — the material
     * modal's select uses it for "none" and the write path turns it into an omitted key. Package
     * SLOTS are the opposite: `isValidPackage` requires all three keys present, so `UNFILLED_SLOT`
     * is a stored `""`. Two conventions in one feature area, and copying the wrong one would store a
     * version id of the empty string that every reader would then special-case.
     */
    expect(db).toMatch(/patch\.bookVersionId === null \|\| patch\.bookVersionId === ""/);
    expect(db).toMatch(/\?\s*deleteField\(\)/);
  });

  it("maps onto the subcollection doc, like every other patched field", () => {
    expect(db).toContain("subPatch.bookVersionId =");
  });

  it("⚠️ and the rules already permit it — the allowlist was the half that shipped first", () => {
    const rules = readFileSync(join(root, "firestore.rules"), "utf8");
    const i = rules.indexOf("'activityType', 'description', 'date', 'details'");
    expect(i, "the activity update allowlist has moved").toBeGreaterThan(-1);
    expect(rules.slice(i, rules.indexOf("])", i))).toContain("'bookVersionId'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D4 — the field reaches exactly two activity types, enumerated", () => {
  const db = readFileSync(join(root, "src/lib/db.tsx"), "utf8");
  const pop = readFileSync(join(root, "src/components/MarkSentPopover.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  /**
   * ⚠️ ENUMERATED AGAINST THE REAL ENUM, not a hand-written pair. A literal list on both sides
   * would go green the day a status was added — the standing rule that a test must be handed what
   * the app can actually produce.
   */
  it("every ActivityType other than a materials send has no version path", () => {
    const types = Object.values(ActivityType);
    expect(types.length, "ActivityType is empty — has it moved?").toBeGreaterThan(8);
    /* the ONE writer that attaches a version is `recordMaterialsSent`, whose `targetStatus` is
       typed `PARTIAL_SENT | FULL_SENT` — so the restriction is the type system's, not a check. */
    expect(db).toContain("targetStatus: QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT");
    const writers = [...db.matchAll(/\.\.\.\(bookVersionId \? \{ bookVersionId \} : \{\}\)/g)];
    expect(writers.length, "more than one place attaches a version to an activity").toBe(1);
  });

  it("⚠️ and no OTHER status can reach that seam", () => {
    /* Named individually so the failure says which one leaked. */
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED,
                     QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED,
                     QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(VERSIONED_SENDS, `${s} can carry a version`).not.toContain(s);
    }
    expect(VERSIONED_SENDS).toHaveLength(2);
  });

  it("D8 — the field is gated on two versions, once, in the form", () => {
    expect(pop).toContain("const showVersionField = bookVersions.length >= 2");
    expect(pop).toContain("{showVersionField && (");
  });

  it("⚠️ D7 — an unrecorded default sends `undefined`, never `\"\"`", () => {
    /* The fault this forecloses: an empty select silently becoming a recorded value on save. */
    expect(pop).toContain("bookVersionId: bookVersionId || undefined");
    expect(db).toContain("...(bookVersionId ? { bookVersionId } : {})");
  });

  it("D5 — the pre-fill is the shared derivation, not a local fallback", () => {
    expect(pop).toContain("useState(sendVersionDefault(readVersion))");
    expect(pop).not.toMatch(/useState\(readVersion\?\.id/);
  });

  it("⚠️ D6 — no warning, no confirmation, no verdict on changing it", () => {
    const i = pop.indexOf("showVersionField && (");
    expect(i, "the version block has moved").toBeGreaterThan(-1);
    const block = pop.slice(i, pop.indexOf("{requestedMaterial", i));
    expect(block.length, "the slice found no block").toBeGreaterThan(200);
    for (const w of ["confirm", "are you sure", "warning", "careful", "check that", "double-check"]) {
      expect(block.toLowerCase(), `the field warns: "${w}"`).not.toContain(w);
    }
    /**
     * ⚠️ "MISTAKE" IS NOT IN THAT LIST, AND THE FIRST DRAFT PUT IT THERE — where it caught the ref's
     * own sentence, "that's a fact worth recording, not a mistake". That clause is the OPPOSITE of a
     * warning: it is the app saying the unusual answer is legitimate. Banning the token rather than
     * the act is the same shape as a rule naming one hue.
     *
     * So the copy is asserted POSITIVELY instead. It is normative from the ref, and locking it here
     * is stronger than guessing at what its absence would look like.
     */
    expect(block).toContain("fact worth recording, not a mistake");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("⚠️ the held line states an absence ONCE", () => {
  const tsx = readFileSync(join(root, "src/components/reading-pane/VersionLines.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  /**
   * It rendered `MANUSCRIPT HELD · NOT RECORDED · VERSION NOT RECORDED` — the same fact twice,
   * reading as a stutter. Every assertion passed, because each half was individually correct: the
   * value slot honestly said the version was not recorded, and the note honestly said the match
   * state was unknown. **The fault only exists in the composed line**, which is why it took reading
   * it aloud rather than checking it.
   */
  it("the note renders only when there is a version to compare", () => {
    expect(tsx).toContain("{held.version && (");
  });

  it("⚠️ and the unknown note SURVIVES for the case it was written for", () => {
    /* Silence beside a KNOWN version would read as agreement; that case still gets its note. The
       thing dropped is the second telling of an absence already stated in the value position. */
    expect(MATCH_NOTE.unknown).toBe("Version not recorded");
    expect(tsx).toContain("MATCH_NOTE[state]");
  });
});
