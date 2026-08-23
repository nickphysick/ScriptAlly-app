/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — the Examples drawer (build Phase 7).
 *
 * ⚠️ "PORTED VERBATIM" IS PROVEN, NOT ASSERTED BY SOMEBODY WHO CHECKED ONCE. This re-parses the
 * `EXAMPLES` array straight out of design-refs/noteboard-mockup.html and compares it to the
 * module, so the ref stays the authority for the words. Exactly one difference is permitted, and
 * the module has to declare it and say why.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NOTE_EXAMPLES, NOTE_EXAMPLE_DIVERGENCES } from "./noteboardExamples";
import { draftFromExample } from "../../lib/noteboard";

const here = __dirname;
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));
const css = decls(readFileSync(join(here, "todoNoteboard.css"), "utf8"));

/** The ref's own array, evaluated out of the file it lives in. */
const fromRef = (): Array<{ group: string; items: Array<{ c: string; tag: string; body: string }> }> => {
  const html = readFileSync(join(here, "../../../design-refs/noteboard-mockup.html"), "utf8");
  const start = html.indexOf("var EXAMPLES=");
  expect(start, "the ref no longer declares EXAMPLES").toBeGreaterThan(-1);   // the anchor
  const end = html.indexOf("];", start);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-eval
  return eval(html.slice(start + "var EXAMPLES=".length, end + 2));
};

/** The ref's body with the declared divergences applied — what the module SHOULD say. */
const expected = (body: string) =>
  NOTE_EXAMPLE_DIVERGENCES.reduce((s, d) => s.split(d.ref).join(d.here), body);

describe("⚠️ the content is the ref's, group for group and word for word", () => {
  it("six groups, nine notes, the same names in the same order", () => {
    const ref = fromRef();
    expect(ref.length).toBe(6);                                    // the population, first
    expect(NOTE_EXAMPLES.map((g) => g.group)).toEqual(ref.map((g) => g.group));
    expect(NOTE_EXAMPLES.reduce((n, g) => n + g.items.length, 0)).toBe(9);
  });

  it("every colour, tag and body matches — with exactly the declared divergences and no others", () => {
    const ref = fromRef();
    for (const [gi, g] of ref.entries()) {
      for (const [ii, item] of g.items.entries()) {
        const mine = NOTE_EXAMPLES[gi].items[ii];
        expect(mine, `${g.group}[${ii}]`).toBeDefined();
        expect(mine.colour).toBe(item.c);
        expect(mine.tag).toBe(item.tag);
        expect(mine.body, `${g.group}[${ii}] body`).toBe(expected(item.body));
      }
    }
  });

  it("⚠️ and the ONE divergence is the pronoun rule, not a typo somebody let through", () => {
    expect(NOTE_EXAMPLE_DIVERGENCES).toHaveLength(1);
    const [d] = NOTE_EXAMPLE_DIVERGENCES;
    expect(d.why).toContain("pronouns");
    /* no agent-referring gendered pronoun survives anywhere in the module… */
    const bodies = NOTE_EXAMPLES.flatMap((g) => g.items.map((i) => i.body));
    for (const b of bodies) expect(b, b.slice(0, 40)).not.toMatch(/\b(she|he)\b|\bshe’s\b|\bhe’s\b/);
    /* …and the one that remains is a NOVEL'S LOGLINE, which is the documented carve-out: those
       pronouns belong to a CHARACTER and are the writer's own words about their book. */
    const withHer = bodies.filter((b) => /\bher\b|\bhis\b/.test(b));
    expect(withHer).toHaveLength(1);
    expect(withHer[0]).toContain("One-line pitch");
  });
});

describe("⚠️ REVERSED: using one CREATES a note — the draft door is retired", () => {
  /* ⚠️ THIS BLOCK ASSERTED THE OPPOSITE (workflow run, Phase 1). "Use as a starting point →"
     seeded the composer with an editable copy and wrote NOTHING — the right call while the BOARD
     carried example papers with their own immediate "Keep this". v2 moves the examples to the
     drawer entirely, so the drawer inherits that action: Keep this commits, closes the drawer and
     posts the receipt. One example, one door. */
  it("the draft is still derivable — the pure helper stays, unused by the drawer", () => {
    /* `draftFromExample` is not deleted: it is total, tested, and the shape any future
       seed-a-draft surface would want. Nothing renders it today, and that is the record. */
    for (const g of NOTE_EXAMPLES) {
      for (const ex of g.items) {
        const d = draftFromExample(ex);
        expect(d.body).toBe(ex.body);
        expect(d.colour).toBe(ex.colour);
        expect(d.tag).toBe(ex.tag);
      }
    }
    expect(new Set(NOTE_EXAMPLES.flatMap((g) => g.items.map((i) => i.body))).size).toBe(9);
  });

  it("the drawer's action WRITES now, and the old link is gone rather than relabelled", () => {
    expect(page).toContain("keepFromDrawer");
    expect(page).toContain("Keep this");
    expect(page).not.toContain("Use as a starting point");
    expect(page).not.toContain("draftFromExample");
    /* the write is the normal create path, and the drawer closes behind it */
    const fn = page.slice(page.indexOf("const keepFromDrawer"));
    expect(page.indexOf("const keepFromDrawer")).toBeGreaterThan(-1);
    const handler = fn.slice(0, fn.indexOf("\n  };"));
    expect(handler).toContain("addUserTask(");
    expect(handler).toContain("setExamples(false)");
  });
});

describe("⚠️ the drawer is a sheet with a scrim, and it comes from the right", () => {
  it("the sheet, its scrim and its close are all present and dismissible", () => {
    for (const bit of ["nb-drawer", "nb-scrim", "What writers keep here"]) {
      expect(page, bit).toContain(bit);
    }
    expect(css).toMatch(/\.nb-drawer\s*\{[^}]*position:\s*fixed/);
    expect(css).toMatch(/\.nb-drawer\s*\{[^}]*right:\s*0/);
    /* the scrim dismisses, and so does Escape — a sheet with one way out is a trap on a page
       whose whole promise is that nothing is final */
    expect(page).toContain("setExamples(false)");
    expect(page).toMatch(/key === "Escape"/);
  });
});
