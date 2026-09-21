/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's feature-led empty state (empty-states pack, Phase 2).
 *
 * ⚠️ THE WORDS ARE READ BACK FROM THE ARTEFACT, NEVER RETYPED HERE. The ref is normative and its
 * punctuation is part of it, so every sentence is asserted to appear in
 * `scriptally-empty-states-v3-feature-led.html` — which means a paraphrase fails even when it reads
 * better, and the build and the ref cannot drift apart in silence.
 *
 * ⚠️ AND IT CARRIES THE FIVE CLAIMS THAT MIGRATED OFF `QueryEmptyCard`'s RETIRED `first` VARIANT,
 * named in that file's header so neither side can quietly drop one.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { cssRule } from "../../test/cssRule";
import { sliceBetween } from "../../test/sliceBetween";
import { QueryEmptyFeatures } from "./QueryEmptyFeatures";
import { QueryStatus } from "../../types";
import { STATE_TOKEN } from "../../lib/queryCardFacts";
import { SD_RETIRED, SD_RING, SD_VIEWBOX } from "../../test/statusDotSignature";
import {
  QCF_BOARD, QCF_CARD, QCF_CLOSING, QCF_DEPTH, QCF_EXAMPLE_TAG, QCF_HERO, QCF_HERO_NOTES, QCF_LIST,
  QCF_MOVES, QCF_ROWS, QCF_SWATCHES, QCF_VIEWS, heroBookTitle,
} from "./queryEmptyCopy";

/* ⚠️ THE REF PREDATES THE RENAME, AND IT IS DELIBERATELY NOT EDITED TO CATCH UP. This artefact was
   signed off saying "ScriptAlly", its hash is pinned in design-refs/.refhashes.json, and
   `check-design-refs` runs on every build — rewriting a word inside it would falsify the record of
   what was actually approved, which is the whole reason the hashes exist.
   The product name is the ONE deliberate divergence between this copy and the artefact (16 Sep), so
   it is normalised HERE, at the read, and every other claim this file makes still has to match the
   ref verbatim: the wording, the sentence split, and the straight apostrophes asserted below. */
const REF = readFileSync(join(process.cwd(), "design-refs/scriptally-empty-states-v3-feature-led.html"), "utf8")
  .replace(/ScriptAlly/g, "QueryHawk");
const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const src = readFileSync(resolve(__dirname, "./QueryEmptyFeatures.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const css = readFileSync(resolve(__dirname, "./queryEmptyFeatures.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string) => cssRule(css, sel, "queryEmptyFeatures.css");

/**
 * ⚠️ THE MOUNT IS MATCHED WITH A BOUNDED PATTERN, NEVER `toContain`. A JSX tag name is a PREFIX of
 * every longer name — `toContain("<QueryEmptyFeatures")` is satisfied by `<QueryEmptyFeaturesX`,
 * which is how a mutation that unmounted the page entirely was recorded as a pass. The repo's own
 * rule for class names ("assert the exact attribute, never a substring") applies to element names
 * for exactly the same reason, and the looseness runs both ways: it hid a real absence here, and it
 * would wave through a rename. A tag is delimited by whitespace, `/` or `>`.
 */
const MOUNTED = /<QueryEmptyFeatures[\s/>]/;

const noop = () => {};
const TEMPLATE = "/QueryHawk-pipeline-import-template.xlsx";
const html = renderToStaticMarkup(
  <QueryEmptyFeatures onLog={noop} onImport={noop} templateHref={TEMPLATE} manuscriptTitle="The Backpack on the Seat" />,
);
const bookless = renderToStaticMarkup(
  <QueryEmptyFeatures onLog={noop} onImport={noop} templateHref={TEMPLATE} manuscriptTitle={null} />,
);
/**
 * What React writes for text.
 *
 * ⚠️ ONLY THE FIVE HTML-SPECIAL CHARACTERS. `renderToStaticMarkup` escapes `& < > " '` and NOTHING
 * else — a curly apostrophe is emitted as itself. The first cut of this helper also escaped `’`,
 * which made every assertion look for an entity the renderer never writes, and reported a correct
 * render as missing its own copy.
 */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ══════════════════════ the copy is the ref's ══════════════════════ */

describe("the copy is the ref's, verbatim", () => {
  it("every heading, subheading and caveat appears in the artefact", () => {
    const words = [
      QCF_HERO.heading, QCF_HERO.cta, QCF_HERO.importLink, QCF_HERO.templateLink, QCF_HERO.caveat,
      QCF_HERO_NOTES.left, QCF_HERO_NOTES.right,
      QCF_CLOSING.heading, QCF_CLOSING.sub, QCF_CLOSING.cta, QCF_CLOSING.importLink,
      ...QCF_ROWS.flatMap((r) => [r.heading, r.sub, r.caveat]),
      ...QCF_SWATCHES.flatMap((s) => [s.name, s.gloss]),
    ];
    for (const w of words) expect(REF, `"${w}" is not the ref's`).toContain(w);
  });

  it("the lede is the ref's sentence, split around the manuscript it emphasises", () => {
    /* the ref writes it as one string with an <em>; the component interpolates the real title, so
       the two halves are checked against the artefact rather than the joined sentence */
    expect(REF).toContain(QCF_HERO.ledeBefore);
    expect(REF).toContain(QCF_HERO.ledeAfter);
  });

  it("⚠️ the punctuation is the artefact's — STRAIGHT apostrophes, and not one curly quote", () => {
    /* ⚠️ THIS ASSERTION IS THE RIGHT WAY ROUND AFTER BEING WRONG. The first cut required CURLY
       apostrophes, on the reasonable-sounding grounds that this repo's marketing copy is full of
       them. This artefact has none: 117 straight, zero curly. A nicer character is a different
       string, and "it reads better" is precisely what the never-re-punctuate rule forbids. */
    expect(REF).not.toMatch(/[’‘“”]/);
    const all = [
      QCF_HERO.heading, QCF_HERO.ledeBefore, QCF_HERO.ledeAfter, QCF_HERO.ledeNoBook, QCF_HERO.caveat,
      QCF_CLOSING.heading, QCF_CLOSING.sub, QCF_CARD.name,
      ...QCF_ROWS.flatMap((r) => [r.heading, r.sub, r.caveat]),
      ...QCF_MOVES.map((m) => m.who),
    ];
    for (const s of all) expect(s, `"${s}" carries a smart quote the artefact does not`).not.toMatch(/[’‘“”]/);
  });
});

/* ══════════════════════ the structure ══════════════════════ */

describe("the six blocks, in the ref's order", () => {
  it("renders the hero, all four feature rows and the closing", () => {
    expect(html).toContain(esc(QCF_HERO.heading));
    for (const r of QCF_ROWS) expect(html).toContain(esc(r.heading));
    expect(html).toContain(esc(QCF_CLOSING.heading));
  });

  it("and in that order on the page, not merely all present", () => {
    const order = [
      QCF_HERO.heading, ...QCF_ROWS.map((r) => r.heading), QCF_CLOSING.heading,
    ].map((h) => html.indexOf(esc(h)));
    for (const i of order) expect(i).toBeGreaterThan(-1);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("bands the rows as the ref does — sage, plain, pink, plain", () => {
    expect(QCF_ROWS.map((r) => r.band)).toEqual(["sage", "plain", "pink", "plain"]);
    expect(rule(".qcf-row--sage")).toContain("var(--qcf-band-sage)");
    expect(rule(".qcf-row--pink")).toContain("var(--qcf-band-pink)");
  });

  it("⚠️ flips by `order` and never by markup order — the reading order must not follow the visual one", () => {
    expect(rule(".qcf-row--flip .qcf-txt")).toContain("order: 2");
    expect(rule(".qcf-row--flip .qcf-ill")).toContain("order: 1");
    /* the text column is FIRST in the DOM on every row, flipped or not */
    for (const r of QCF_ROWS) {
      const row = html.slice(html.indexOf(`qcf-row--${r.band}`));
      expect(row.indexOf("qcf-txt")).toBeLessThan(row.indexOf("qcf-ill"));
    }
  });

  it("⚠️ resets the flip where the rows stack, or the text lands under the picture it introduces", () => {
    const narrow = css.slice(css.indexOf("@media (max-width: 1040px)"));
    expect(narrow).toContain(".qcf-row--flip .qcf-txt, .qcf-row--flip .qcf-ill { order: 0; }");
  });
});

/* ══════════════════════ the examples are examples ══════════════════════ */

describe("every illustration says it is an example", () => {
  it("wears the dashed pill — one per plate, five plates", () => {
    expect((html.match(new RegExp(`>${QCF_EXAMPLE_TAG}<`, "g")) ?? []).length).toBe(5);
    expect(rule(".qcf-tag")).toContain("dashed");
  });

  it("⚠️ the pill cannot be forgotten — it is one component, and the plate count is asserted", () => {
    /* if a future row draws a plate without a Tag, the two counts diverge */
    const plates = (html.match(/class="qcf-ill/g) ?? []).length;
    expect(plates).toBe(5);
    expect((html.match(new RegExp(`>${QCF_EXAMPLE_TAG}<`, "g")) ?? []).length).toBe(plates);
  });

  it("⚠️ draws NO button inside an illustration — the buttons are pictures of buttons", () => {
    /* structural: a `<button>` in a drawing is keyboard focusable and answers nothing */
    for (const cls of ["qcf-b1", "qcf-b2", "qcf-views", "qcf-stub"]) {
      const at = html.indexOf(cls);
      expect(at, `${cls} not rendered`).toBeGreaterThan(-1);
    }
    expect(src).not.toMatch(/className="qcf-b1"[^>]*onClick/);
    /* the only buttons on the page are the two CTAs and the two import links */
    expect((html.match(/<button/g) ?? []).length).toBe(4);
  });

  it("is full opacity — this is NOT the dashboard's faded pattern", () => {
    /* the two patterns are deliberately different and must not be made consistent */
    expect(css).not.toMatch(/\.qcf[^{]*\{[^}]*opacity:\s*0?\.\d/);
    expect(css).not.toContain("pointer-events: none");
  });
});

/* ══════════════════════ reuse, and the tints ══════════════════════ */

describe("the app's own components and tints, never a recreation", () => {
  it("⚠️ draws the real StatusDot — the house law for any dot, and for any legend", () => {
    expect(src).toContain('import { StatusDot } from "../StatusDot"');
    /* the ref's own `.sdot` conic-gradient must not have been ported */
    expect(css).not.toContain("conic-gradient");
    /* ⚠️ `sa-statusdot` WAS THE PULSE ELEMENT'S CLASS, not the component's, and the ring set (v21
       §9) removed the pulse — so this matched a treatment rather than the mark. The shared
       signature is the set's own geometry, which every status carries at every size. */
    expect(html).toContain(SD_VIEWBOX);
    expect(html).toContain(SD_RING);
    for (const gone of SD_RETIRED) expect(html, `${gone} survives the ring set`).not.toContain(gone);
  });

  it("uses the real statuses, so the depth sequence is the app's ladder", () => {
    expect(QCF_DEPTH.map((d) => d.status)).toEqual([
      QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
      QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REJECTED,
    ]);
  });

  it("⚠️ takes every tint from STATE_TOKEN, so the picture cannot drift from the populated page", () => {
    for (const s of QCF_SWATCHES) expect(html).toContain(STATE_TOKEN[s.state]);
    /* and no illustration hardcodes one of the five tint literals */
    for (const lit of ["#f7efe3", "#e0e5dd", "#f5e6df", "#d7e0e8", "#e4e1db"]) {
      expect(src, `${lit} is a literal where a token exists`).not.toContain(lit);
      expect(css, `${lit} is a literal where a token exists`).not.toContain(lit);
    }
  });

  it("⚠️ required NO change to any shared component — the pack's test for reuse", () => {
    /* `StatusDot`'s props are `status`/`overrideSize`/`badge`/`className`/`ghost`/`decorative`;
       the illustrations use only the first, third-from-last and last. A new prop here would mean a
       shared component had learned about empty states. */
    const dot = readFileSync(resolve(__dirname, "../StatusDot.tsx"), "utf8");
    for (const bad of ["sample", "example", "empty", "illustration"]) {
      expect(dot.toLowerCase(), `StatusDot gained an empty-state prop: ${bad}`)
        .not.toMatch(new RegExp(`^\\s*${bad}\\??:`, "m"));
    }
  });
});

/* ══════════════════════ counts in the pictures ══════════════════════ */

describe("a drawn count agrees with what is drawn beneath it", () => {
  it("⚠️ each board column's count IS its stub list's length — never typed beside it", () => {
    for (const col of QCF_BOARD) {
      expect(html).toContain(`${col.name} · ${col.stubs.length}`);
      /* and the stubs are really there */
      for (const s of col.stubs) expect(html).toContain(esc(s.who));
    }
    /* the count is derived in the component, so a stub added or removed moves it */
    expect(src).toContain("col.stubs.length");
  });
});

/* ══════════════════════ the migrated claims ══════════════════════ */

describe("the five claims that came off the retired `first` card", () => {
  it("1 · the hero draws its own moment and never the filtered card's", () => {
    expect(html).toContain(esc(QCF_HERO.heading));
    expect(html).not.toContain("Nothing needs you right now");
    expect(html).not.toContain("See what&#x27;s waiting");
  });

  it("2 · the import template route survives the swap", () => {
    expect(html).toContain(`href="${TEMPLATE}"`);
    expect(html).toContain("download");
  });

  it("3 · the page mounts this in the selector's `first` slot, wired to the real flows", () => {
    const branch = sliceBetween(page, 'emptyKind === "first" ? (', ") : (");
    expect(branch, "the page does not mount it").toMatch(MOUNTED);
    expect(branch).toContain("onLog={() => openCreate()}");
    expect(branch).toContain('onImport={() => onNavigate?.("import")}');
    expect(branch).toContain("templateHref={TEMPLATE_HREF}");
  });

  it("4 · the retired card is not reachable from that branch", () => {
    const branch = sliceBetween(page, 'emptyKind === "first" ? (', ") : (");
    expect(branch).not.toContain("QueryEmptyCard");
  });

  it("5 · and the retired welcome pane is still gone", () => {
    expect(page).not.toContain("Your first query starts here");
    expect(page).not.toMatch(/["\s`]qc-welcome["\s`]/);
  });
});

/* ══════════════════════ the hero's book ══════════════════════ */

describe("which book the hero names", () => {
  it("names the scoped manuscript", () => {
    expect(heroBookTitle({ title: "Scoped Book" }, [{ title: "A" }, { title: "B" }])).toBe("Scoped Book");
  });

  it("names the only manuscript when nothing is scoped — the commonest first-run shape", () => {
    expect(heroBookTitle(null, [{ title: "The Only One" }])).toBe("The Only One");
  });

  it("⚠️ names NOTHING rather than picking one of several unscoped books", () => {
    expect(heroBookTitle(null, [{ title: "A" }, { title: "B" }])).toBeNull();
    expect(heroBookTitle(null, [])).toBeNull();
    /* and an untitled manuscript is not a title */
    expect(heroBookTitle(null, [{ title: "   " }])).toBeNull();
  });

  it("renders the book-less sentence when there is no book to name", () => {
    expect(bookless).toContain(esc(QCF_HERO.ledeNoBook));
    expect(bookless).not.toContain(esc(QCF_HERO.ledeBefore));
  });

  it("emphasises the title where the ref emphasises it", () => {
    expect(html).toContain("<em>The Backpack on the Seat</em>");
  });
});

/* ══════════════════════ the type floor ══════════════════════ */

describe("the house type floor", () => {
  it("⚠️ never sets mixed-case Playfair below 1.3 — the ref draws 1.08 and crops the descenders", () => {
    for (const sel of [".qcf-h2", ".qcf-h3"]) {
      const lh = /line-height:\s*([\d.]+)/.exec(rule(sel))?.[1];
      expect(lh, `${sel} states no line-height`).toBeDefined();
      expect(Number(lh)).toBeGreaterThanOrEqual(1.3);
    }
  });
});

/* ══════════════════════ nothing derived, nothing fetched ══════════════════════ */

describe("the examples are static by construction", () => {
  it("⚠️ nothing here reaches a derivation, a store or a fetch", () => {
    const copy = readFileSync(resolve(__dirname, "./queryEmptyCopy.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const f of ["useScriptAllyDb", "cardFacts", "getPrimaryAction", "fetch(", "useEffect", "useState"]) {
      expect(src, `the component reaches ${f}`).not.toContain(f);
      expect(copy, `the copy module reaches ${f}`).not.toContain(f);
    }
  });

  it("the example data is literals, and the card is not a Query", () => {
    /* a `Query`-shaped example is the fabricated-value fault; the card's fields are its own */
    expect(Object.keys(QCF_CARD)).not.toContain("id");
    expect(Object.keys(QCF_CARD)).not.toContain("manuscriptId");
    expect(QCF_LIST.length).toBeGreaterThan(3);
    expect(QCF_MOVES.length).toBe(4);
    expect(QCF_VIEWS.length).toBe(4);
  });
});
