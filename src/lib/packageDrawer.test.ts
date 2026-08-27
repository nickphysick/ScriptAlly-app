/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE PACKAGE DRAWER (packages Part 3) ══════════════════════════════════════════════════════
 *
 * Derivation and construction checks. The rendered claims — four dismissal routes, the two-line
 * clamp, the version chip on the page — are measured in `tests/e2e/packageDrawer.measure.ts`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drawerSlots, drawerHolders, drawerReturns, returnsLine, LOCK_FOOTNOTE } from "./packageDrawer";
import { wordsPhrase, sourceLabel } from "./materialDraft";
import { ComponentType, QueryStatus } from "../types";
import type { Agent, BookVersion, ManuscriptVersion, Query, SubmissionPackage } from "../types";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const decls = (x: string) => x.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const pkg = (over: Partial<SubmissionPackage> = {}): SubmissionPackage =>
  ({ id: "p1", userId: "u", manuscriptId: "m1", packageName: "Standard UK",
     queryLetterVersionId: "ql1", synopsisVersionId: "syn1",
     /* ⚠️ THE SAMPLE SLOT STAYS STORED — no package is rewritten by the retirement (D10) — and
        nothing reads it. The version is the package's own field now (D1). */
     samplePagesVersionId: "pag1", bookVersionId: "bv-a",
     createdDate: "2026-01-01", ...over } as SubmissionPackage);

const mat = (id: string, type: ComponentType, over: Partial<ManuscriptVersion> = {}): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u", componentType: type, versionName: id,
     fileAttached: false, createdDate: "", ...over } as ManuscriptVersion);

const MATS = [
  mat("ql1", ComponentType.QUERY_LETTER, { versionName: "Hook-first", wordCount: 412, contentDraft: "When the tide went out…" }),
  mat("syn1", ComponentType.SYNOPSIS, { versionName: "One-page", wordCount: 638, contentDraft: "MURPHY, a retired harbourmaster…" }),
  mat("pag1", ComponentType.SAMPLE_PAGES, { versionName: "Chapters 1–3", wordCount: 7412,
      contentDraft: "The bell had been ringing…", bookVersionId: "bv-a" }),
];
const BV: BookVersion[] = [
  { id: "bv-a", name: "Prologue-first", kind: "initial", createdDate: "2026-03-01" },
  { id: "bv-b", name: "Worldbuilding-first", kind: "reordering", createdDate: "2026-05-01" },
];

const q = (id: string, status: QueryStatus, agentId = "a1", dateSent = "2026-06-01"): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId, status, packageId: "p1", dateSent } as unknown as Query);

const AGENTS = [{ id: "a1", name: "T. Marsh", agency: "The Marsh Agency" }] as unknown as Agent[];

// ─────────────────────────────────────────────────────────────────────────────
describe("D10 — what's in it", () => {
  it("resolves three rows: two materials and the version (D14)", () => {
    const s = drawerSlots(pkg(), MATS, BV);
    expect(s.map((x) => x.label)).toEqual(["Covering letter", "Synopsis", "Version"]);
    expect(s.map((x) => x.name)).toEqual(["Hook-first", "One-page", "Prologue-first"]);
    expect(s[0].words).toBe("412 words");
    expect(s[0].opening).toBe("When the tide went out…");
  });

  it("⚠️ THE VERSION ROW HAS NO CONTENTS PREVIEW, and that is not a missing lookup (D14)", () => {
    /* A version is an ordering of the book — a name and a kind, with no text of its own. A word
       count here would be the manuscript's, which answers a different question; an opening line
       would have to come from some material, and the version does not name one. */
    const v = drawerSlots(pkg(), MATS, BV)[2];
    expect(v.words).toBeNull();
    expect(v.opening).toBeNull();
    expect(v.materialId, "there is no material to open").toBeNull();
    expect(v.type, "a version has no ComponentType").toBeNull();
  });

  it("⚠️ RETURNS THE WHOLE OPENING — the two-line clamp is the stylesheet's job", () => {
    /* Cutting the string here bakes a line count into the data, which is wrong at every width but
       the one it was cut for. Asserted so nobody 'helpfully' truncates it. */
    const long = "x".repeat(600);
    const s = drawerSlots(pkg(), [mat("ql1", ComponentType.QUERY_LETTER, { contentDraft: long }),
                                  ...MATS.slice(1)], BV);
    expect(s[0].opening).toHaveLength(600);
    const css = read("src/components/packages/packageDetailDrawer.css");
    expect(css).toContain("-webkit-line-clamp: 2");
  });

  it("an empty slot is a row that says so, not a row that vanishes", () => {
    const s = drawerSlots(pkg({ synopsisVersionId: "" }), MATS, BV);
    expect(s).toHaveLength(3);
    expect(s[1].name).toBeNull();
    expect(s[1].materialId).toBeNull();
  });

  it("⚠️ resolves an ARCHIVED material — the archive model, or archiving would read as deleting", () => {
    const archived = MATS.map((m) => (m.id === "ql1" ? { ...m, status: "Retired" as never } : m));
    expect(drawerSlots(pkg(), archived, BV)[0].name).toBe("Hook-first");
  });

  it("shows no word count where nothing was counted", () => {
    expect(drawerSlots(pkg(), [mat("ql1", ComponentType.QUERY_LETTER), ...MATS.slice(1)], BV)[0].words).toBeNull();
  });
});

describe("⚠️ D11 IS SUPERSEDED — the version is the package's own, not inherited", () => {
  /**
   * ⚠️ RETARGETED. The chip was reached through the SAMPLE material, because a package carried no
   * version field and the sample was the only thing that knew. Both halves have gone (D1, D9), so
   * the inheritance has no source and no destination. What survives is that a version is stated
   * once, from one place.
   */
  it("comes from the package's field, and a stray id on a material reaches nothing", () => {
    /* `pag1` still carries `bookVersionId: "bv-a"` in MATS and is no longer read at all. */
    expect(drawerSlots(pkg(), MATS, BV)[2].name).toBe("Prologue-first");
    expect(drawerSlots(pkg({ bookVersionId: undefined }), MATS, BV)[2].name).toBeNull();
  });

  it("⚠️ `versionName` IS NULL ON EVERY ROW NOW — the inheritance is gone, not relocated", () => {
    /**
     * The field carried the ordering a SAMPLE excerpted, hung off the sample's row. The version is
     * a row of its own with its name in `name`, so nothing needs a second place to put one — and
     * leaving `versionName` populated anywhere would be the two-answers shape all over again.
     *
     * ⚠️ IT IS ASSERTED ACROSS ALL THREE ROWS rather than on the one that used to carry it: an
     * assertion about row 2 alone would pass on a build that had merely moved the inheritance.
     */
    expect(drawerSlots(pkg(), MATS, BV).map((r) => r.versionName)).toEqual([null, null, null]);
  });

  it("⚠️ shows the version however many orderings exist", () => {
    /* It used to appear only above two versions, because below that a chip naming "the version"
       distinguished nothing. A package that STATES its version is stating a fact regardless. */
    expect(drawerSlots(pkg(), MATS, BV.slice(0, 1))[2].name).toBe("Prologue-first");
  });

  it("⚠️ AND THE PACKAGE STATES ITS VERSION ONCE — the field, not a second route", () => {
    /**
     * ⚠️ RETARGETED, AND THE LAW IT NOW ASSERTS: this case forbade a version field on a package
     * because the drawer's chip was INHERITED from the sample, and a stored field would have been a
     * second answer. The settled model retires the sample slot, so the inheritance has no source
     * left and the field IS the answer. What survives is the singularity — one member, one place.
     */
    const types = decls(read("src/types.ts"));
    const i = types.indexOf("export interface SubmissionPackage {");
    const body = types.slice(i, types.indexOf("\n}", i));
    expect(body).toMatch(/\bbookVersionId\?: string;/);
    expect(body.match(/bookVersion/gi) ?? []).toHaveLength(1);
  });});

// ─────────────────────────────────────────────────────────────────────────────
describe("D12 / D17 — who has it, and what it will not guess", () => {
  const qs = [q("q1", QueryStatus.FULL_SENT, "a1", "2026-06-01"),
              q("q2", QueryStatus.QUERIED, "a1", "2026-08-01"),
              { ...q("q3", QueryStatus.QUERIED, "ghost", "2026-05-01") }];

  it("lists every query carrying the package, newest send first", () => {
    expect(drawerHolders("p1", qs, AGENTS).map((h) => h.queryId)).toEqual(["q2", "q1", "q3"]);
  });

  it("names the agent and the agency", () => {
    const h = drawerHolders("p1", qs, AGENTS)[0];
    expect(h.agent).toBe("T. Marsh");
    expect(h.agency).toBe("The Marsh Agency");
  });

  it("⚠️ AN UNRESOLVABLE AGENT IS NAMED, NEVER DROPPED (D17)", () => {
    /* Dropping the row would make the list disagree with the scorecard's "3 sent" — three counted,
       two shown, and nothing saying why. An unknown is reported, not folded into the known. */
    const rows = drawerHolders("p1", qs, AGENTS);
    expect(rows).toHaveLength(3);
    const ghost = rows.find((r) => r.queryId === "q3")!;
    expect(ghost.agent).toBe("Agent not recorded");
    expect(ghost.agency).toBeNull();
  });

  it("says so when a send has no date, rather than inventing one", () => {
    const undated = [{ ...q("q9", QueryStatus.FULL_SENT), dateSent: undefined } as unknown as Query];
    expect(drawerHolders("p1", undated, AGENTS)[0].sentDate).toBeNull();
    expect(read("src/components/packages/PackageDetailDrawer.tsx")).toContain("Date not recorded");
  });

  it("ignores queries carrying another package", () => {
    const other = [{ ...q("qX", QueryStatus.QUERIED), packageId: "p2" } as unknown as Query];
    expect(drawerHolders("p1", other, AGENTS)).toEqual([]);
  });
});

describe("D13 — returns are one line", () => {
  /**
   * ⚠️ `hasAgentResponded` IS SET ON THE REJECTED ROW, BECAUSE `recomputeQuery` SETS IT.
   *
   * The first draft of this fixture left it off and expected `replied: 2`; the derivation returned
   * 1, and the fixture was wrong rather than the code. `isResponse` is `hasAgentResponded === true
   * || isRequest`, and a bare `Rejected` satisfies neither — so a hand-built query that skips the
   * flag is an input the app cannot produce, which is the standing rule about test arguments.
   *
   * ⚠️ It also surfaces the known global under-count this repo already records: any real record
   * whose flag never got written reads as unreplied here. That is a standing fix elsewhere and not
   * this drawer's to make — the drawer reports what the derivation says.
   */
  const qs = [q("q1", QueryStatus.FULL_REQUESTED),
              { ...q("q2", QueryStatus.REJECTED), hasAgentResponded: true } as unknown as Query,
              q("q3", QueryStatus.QUERIED)];

  it("counts sends, replies and requests for the package", () => {
    expect(drawerReturns("p1", qs)).toEqual({ sent: 3, replied: 2, requests: 1 });
  });

  it("⚠️ a query whose response flag was never written reads as unreplied — the known under-count", () => {
    const bare = [q("q1", QueryStatus.REJECTED)];
    expect(drawerReturns("p1", bare)).toEqual({ sent: 1, replied: 0, requests: 0 });
  });

  it("reads as one sentence, agreeing its verbs", () => {
    expect(returnsLine({ sent: 6, replied: 3, requests: 2 })).toBe("6 sent · 3 replied · 2 requests");
    expect(returnsLine({ sent: 1, replied: 1, requests: 1 })).toBe("1 sent · 1 replied · 1 request");
  });

  it("⚠️ AND THE DRAWER DRAWS NO PER-MATERIAL BARS — the ref does, and they read identically", () => {
    /* Every material in a package rides the same sends, so three rows saying "2 requests from 6
       sent" are true, look broken, and invite a hunt for a difference that cannot exist. */
    const tsx = decls(read("src/components/packages/PackageDetailDrawer.tsx"));
    expect(tsx).toContain("returnsLine(returns)");
    expect(tsx).not.toContain("pkgb-bar");
    expect(tsx).not.toContain("requestsByMaterial");
  });
});

describe("D14 / D15 / D16 — the lock, the two variants, and no editing", () => {
  const tsx = decls(read("src/components/packages/PackageDetailDrawer.tsx"));

  it("⚠️ the lock footnote names what is NOT frozen, not just what is (D27)", () => {
    /**
     * ⚠️ RETARGETED, AND THE CLAIM IS STRONGER THAN THE ONE IT REPLACES. This required the sentence
     * to give its REASON — "that's what keeps every figure above true" — which explains the freeze
     * and stops there. A writer reading it on a package they have just sent has no way to know the
     * NOTE is still theirs, and the natural reading of "contents are fixed" is that the whole
     * record is. Part F puts the exception in the same sentence as the rule, because otherwise the
     * rule is the only thing anybody takes away.
     */
    expect(LOCK_FOOTNOTE).toContain("has been sent");
    expect(LOCK_FOOTNOTE).toContain("Your note isn't");
    expect(LOCK_FOOTNOTE).toContain("you can change it whenever");
    /* ⚠️ THE CLAIM IS "ON A LOCKED PACKAGE ONLY", NOT A SPELLING. The sentence is split so the
       emphasis can sit on the half that is the news, so pinning the one-line JSX would fail on a
       change that altered nothing about when it renders. */
    expect(tsx).toMatch(/\{locked && \(/);
    expect(tsx).toContain("LOCK_FOOTNOTE_EM");
  });

  it("⚠️ D15 — an unsent package loses the sections, it does not grey them", () => {
    /* A "0 sent" section states something about a thing that has never happened. */
    expect(tsx).toContain("{holders.length > 0 && (");
    expect(tsx).toContain("{returns.sent > 0 && (");
  });

  it("⚠️ AND THE SCORECARD GOES WITH THEM — found by looking at the page, not by a check", () => {
    /**
     * The rule was applied to the SECTIONS and not to the head, so an unsent drawer read
     * `0 SENT · 0 REPLIED · 0 REQUESTS` under its own name. Every check passed — the sections were
     * correctly absent, and nothing asked what the head was claiming. Same shape as a rule applied
     * to a numerator and not to its denominator.
     *
     * Counted rather than matched: there must be TWO `returns.sent > 0` gates now, the head's and
     * the returns section's.
     */
    expect((tsx.match(/\{returns\.sent > 0 && \(/g) ?? []).length).toBe(2);
    expect(tsx).toContain('className="pkgdd-score"');
  });

  it("a sent package duplicates; an unsent one edits", () => {
    expect(tsx).toMatch(/locked\s*\?[\s\S]{0,200}Duplicate &amp; edit[\s\S]{0,120}onEdit\(pkg\.id\)/);
  });

  it("⚠️ D16 — the body offers no control that writes", () => {
    const body = tsx.slice(tsx.indexOf('className="pkgdd-body"'));
    for (const w of ["onChange", "<input", "<textarea", "<select", "contentEditable"]) {
      expect(body, `the drawer body can edit (${w})`).not.toContain(w);
    }
  });

  it("imports StatusDot rather than recreating it", () => {
    expect(tsx).toContain('import { StatusDot } from "../StatusDot"');
    expect(tsx).toContain("<StatusDot status={h.status}");
  });

  it("⚠️ reuses Form11Drawer — the same primitive the explainer sits on", () => {
    expect(tsx).toContain("<Form11Drawer");
    expect(tsx).toContain("width={472}");
  });

  it("the head renders the card's own band component", () => {
    expect(tsx).toContain('<CardBand kind="package"');
    expect(tsx).toContain("BAND_CLASS.package");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D1/D2 — one words-phrase, pluralised, absent where nothing is known", () => {
  /**
   * ⚠️ THE FAULT WAS A SECOND COPY, NOT A MISSING RULE. `sourceLabel` in materialDraft.ts had the
   * plural and the zero-guard right from the start; the drawer's band interpolated
   * `${wordCount} words` and rendered "1 WORDS" and "0 WORDS". Both read `wordsPhrase` now.
   */
  const mv = (over: Partial<ManuscriptVersion>): ManuscriptVersion =>
    ({ id: "m", manuscriptId: "m1", userId: "u", componentType: ComponentType.QUERY_LETTER,
       versionName: "n", fileAttached: false, createdDate: "", ...over } as ManuscriptVersion);

  it("agrees its noun at one", () => {
    expect(wordsPhrase(mv({ wordCount: 1 }))).toBe("1 word");
    expect(wordsPhrase(mv({ wordCount: 2 }))).toBe("2 words");
    expect(wordsPhrase(mv({ wordCount: 7412 }))).toBe("7,412 words");
  });

  it("⚠️ SAYS NOTHING AT ZERO — zero is a claim about the text; absence is the truth", () => {
    expect(wordsPhrase(mv({ wordCount: 0 }))).toBeNull();
    expect(wordsPhrase(mv({}))).toBeNull();
    expect(wordsPhrase(mv({ contentType: "ref", fileName: "draft.docx" }))).toBeNull();
  });

  it("the drawer's slot reads the same phrase", () => {
    const s = drawerSlots(pkg(), [mv({ id: "ql1", wordCount: 1 }), ...MATS.slice(1)], BV);
    expect(s[0].words).toBe("1 word");
    const none = drawerSlots(pkg(), [mv({ id: "ql1" }), ...MATS.slice(1)], BV);
    expect(none[0].words).toBeNull();
  });

  it("⚠️ and the source label is built FROM it, so the two cannot drift", () => {
    expect(sourceLabel(mv({ wordCount: 1, contentType: "text" }))).toBe("Text · 1 word");
    expect(sourceLabel(mv({ contentType: "text" }))).toBe("Text");
    const src = readFileSync(join(root, "src/lib/materialDraft.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).toContain("const w = wordsPhrase(v);");
  });

  it("⚠️ no interpolated count in this pack states a bare plural", () => {
    /**
     * The family, not the instance: every `${n} noun` in these modules must be followed by a
     * conditional suffix.
     *
     * ⚠️ THE FIRST VERSION OF THIS CHECK WAS ITSELF THE PROXY FAULT. It matched
     * `/\$\{[^}]+\}\s+(word|sample|…)[a-z]*​/` and then asserted the MATCH contained a ternary — but
     * the match STOPS at the noun, so it never saw the `${n === 1 ? "" : "s"}` immediately after it.
     * It reported correct code as broken. A check that slices its subject and then asks a question
     * about the whole is the same shape as a separator supplied by the probe.
     *
     * It reads the TRAILING CONTEXT now — the 40 characters after the noun — which is where a
     * suffix would be.
     */
    let found = 0;
    for (const f of ["src/lib/packageDrawer.ts", "src/lib/bookVersions.ts"]) {
      const src = readFileSync(join(root, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      for (const m of src.matchAll(/\$\{[^}]+\}\s+(word|sample|package|agent|request|quer)[a-z]*/g)) {
        found += 1;
        const after = src.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 40);
        expect(after, `"${m[0]}" in ${f} states a fixed noun after a count`).toMatch(/^\$\{[^}]*\?/);
      }
    }
    /**
     * ⚠️ THE FLOOR IS ACROSS THE SET, NOT PER FILE — and finding that out was the point of having
     * one. Written per file it went red on `packageDrawer.ts`, correctly: that module's only counted
     * noun was the `${wordCount} words` this pack replaced with `wordsPhrase`, so it legitimately
     * has none now. A file may honestly contain zero; the PACK containing zero would mean the
     * pattern had drifted and the check was passing on an empty set.
     */
    expect(found, "no counted nouns anywhere in the pack — has the pattern drifted?").toBeGreaterThan(0);
  });
});
