/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Scout panel — Prompt 2 locks.
 *
 * ⚠️ THE PACK'S FIRST VERIFY ITEM IS A MEASUREMENT THIS SUITE CANNOT TAKE: "every ADD button's right
 * edge is flush across six suggestions with titles of wildly different lengths". There is no jsdom
 * here and the page is auth-gated, so what is locked instead is the MECHANISM that makes it true —
 * a fixed action column and `align-items: start`. The measurement itself is a browser check, and the
 * report says so rather than implying it was done.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "comps.css"), "utf8");
const tsx = readFileSync(join(here, "ComparableTitlesPage.tsx"), "utf8");
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const src = tsx.replace(/\/\*[\s\S]*?\*\//g, "");

function rule(selector: string): string {
  const out: string[] = [];
  const needle = `${selector} {`;
  let i = css.indexOf(needle);
  expect(i, `no rule found for "${selector}" — the lock is reading nothing`).toBeGreaterThan(-1);
  while (i > -1) {
    const end = css.indexOf("}", i);
    out.push(css.slice(i + needle.length, end));
    i = css.indexOf(needle, end);
  }
  return out.join("\n");
}

describe("the suggestion row — the pack's alignment spec, exactly", () => {
  const row = rule(".ct-srow");

  /**
   * ⚠️ RETARGETED (v2 §4), AND THE CLAIM IS NOW THAT THE TWO CARDS SHARE ONE GRID. The old spec was
   * `26px minmax(0,1fr) 104px` with the numeral in column one; the suggestion now takes the comp
   * card's shape — 44px spine · flexible main · fixed aside — because "Add to comps" turns a
   * suggestion INTO a comp, and a card that changes shape when it is accepted makes the writer
   * re-find the thing they just added.
   *
   * ⚠️ SO THE SPINE WIDTH IS ASSERTED AGAINST `.ct-crow`'S, not against a literal. Two derivations
   * against each other: a `toBe("44px")` on both sides would go green the day someone changed both
   * in the same wrong direction, which is the whole failure mode this file exists to catch.
   */
  it("shares the comp card's grid, so a suggestion and a comp are the same object", () => {
    const sugg = row.match(/grid-template-columns\s*:([^;]*);/)![1].trim();
    const comp = rule(".ct-crow").match(/grid-template-columns\s*:([^;]*);/)![1].trim();
    /* ⚠️ THE SPINE IS THE CLAIM NOW, NOT THE WHOLE TRACK LIST (v3 §4). The Scout moved into a 340px
       panel, so it cannot carry the comp card's aside and its row is two tracks to the card's three
       — asserting equal LENGTH would now be asserting that the redesign did not happen.

       ⚠️ WHAT STILL HAS TO HOLD IS THE SPINE WIDTH, and it is compared between the two rules rather
       than against a literal: two derivations against each other, so changing both in the same wrong
       direction still fails. The spine is what makes a suggestion and a recorded comp read as one
       object, which matters because "Add to comps" turns one into the other. */
    expect(sugg.split(/\s+/)[0], "the spine widths have drifted apart").toBe(comp.split(/\s+/)[0]);
    /* and both keep a `minmax(0, …)` main track — a bare `1fr` takes min-content as its automatic
       minimum, so one long unbroken title would push the row wider than its panel */
    expect(sugg, "the suggestion's main track lost its zero minimum").toContain("minmax(0,");
    expect(comp, "the comp card's main track lost its zero minimum").toContain("minmax(0,");
  });

  /**
   * ⚠️ `stretch`, NOT `start` — and the value had to change. The spine is a full-height coloured
   * edge; `start` collapses it to the height of its own rotated text and leaves the card's left edge
   * part-painted. The old lock guarded a five-cell row sharing one line box, where content really
   * could drag its neighbours' controls; independent grid cells cannot do that.
   */
  it("stretches, so the spine fills the card", () => {
    expect(row.match(/align-items\s*:([^;]*);/)![1].trim()).toBe("stretch");
  });

  /**
   * ⚠️ THE FIXED ACTION COLUMN IS WHAT KEEPS THE RIGHT EDGES FLUSH. Sizing it to content is the one
   * change that silently reverts the fix — a long title would push its own ADD leftwards while its
   * neighbours' stayed put.
   */
  it("never lets the spine size to its contents", () => {
    const tracks = row.match(/grid-template-columns\s*:([^;]*);/)![1].trim();
    /* ⚠️ EXTRACTED AND COMPARED, never pattern-excluded — a `(?!auto)` lookahead after `\s*`
       backtracks to zero width and matches `auto`, which this repo has been bitten by twice.
       ⚠️ AND THE SUBJECT IS THE SPINE NOW: the aside is no longer a track of this grid (v3 §4), so
       the thing that must not size to content is the fixed column that remains. */
    const first = tracks.split(/\s+/)[0];
    expect(["auto", "min-content", "max-content", "fit-content"]).not.toContain(first);
    expect(first).toMatch(/^\d+px$/);
  });

  /**
   * ⚠️ THE WHY-LINE LIVES INSIDE COLUMN TWO, never spanning the grid — spanning is what made the
   * previous version's rows ragged, running the text underneath the buttons.
   */
  it("keeps the why-line inside the middle column", () => {
    expect(rules).toContain(".ct-srow .why");
    expect(rule(".ct-srow .why")).not.toMatch(/grid-column/);
  });
});

describe("the Scout's states", () => {
  it("says whether it has been out, and when only if it knows", () => {
    expect(src).toContain("Not sent out yet");
    expect(src).toContain("Sent out this session");
    expect(src).toContain("Last sent out —");
  });

  /** ⚠️ A FLOOR, NOT A DELAY — a fast run must not flash three steps and vanish. */
  it("holds the running state visible for a minimum", () => {
    expect(src).toContain("RUN_FLOOR_MS = 450");
    expect(src).toMatch(/Promise\.all\(\[fetchCompRun\(input, isPro\), sleepMs\(RUN_FLOOR_MS\)\]\)/);
  });

  it("narrates the three things the function actually does", () => {
    expect(src).toContain('"Reading your manuscript", "Searching recent titles", "Verifying against a catalogue"');
  });

  /** ⚠️ THE PIP STOPS PULSING; THE STEPS STILL ADVANCE. The narration is the state, not the motion. */
  it("reduced motion drops the pulse and keeps the progression", () => {
    const rm = rules.slice(rules.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(rm).toContain(".ct-runstep.on .pip { animation: none; }");
    expect(rm).not.toMatch(/\.ct-runstep\s*\{[^}]*display\s*:\s*none/);
  });

  /** states what happened and what to do — no apology, no red, no stack detail */
  it("fails plainly", () => {
    expect(src).toContain("The Scout couldn&rsquo;t complete this run. Try sending it out again.");
    const fail = src.slice(src.indexOf('phase === "error"'), src.indexOf('phase === "error"') + 300);
    expect(fail).not.toMatch(/sorry|apolog|unfortunately|error code|stack/i);
    expect(fail).not.toContain("--ct-warn");
  });
});

describe("the free state shows the shape, never invented books", () => {
  /**
   * ⚠️ THE DEVIATION, AND WHY IT IS THE RIGHT ONE. The pack asks for the three most recent REAL
   * suggestions, blurred. A free user has never run the Scout — they cannot — so there are none, and
   * the only way to fill that space is to make some up. Blurring a fabricated title does not stop it
   * being one, and this is the card whose footer promises nothing is invented. The veil sits over
   * empty row skeletons instead: the shape, the density and the fixed action column, and no title
   * anyone could mistake for a book.
   */
  it("renders skeleton bars, and no title text, behind the veil", () => {
    const ghost = sliceBetween(src, 'className="ghost"', "lockwrap");
    expect(ghost).toContain('className="bar');
    /* nothing quoted in the ghost may be prose — only class names and the index numerals */
    expect(ghost).not.toMatch(/\bs\.title\b|\bs\.author\b|suggestions/);
  });

  /**
   * ⚠️ THE UPGRADE IS SLATE NOW, NOT PINK (v2 §4) — and the two are different jobs, which is why the
   * change is not a drift. Pink is the WRITER'S verb (Add to comps): a thing they do inside a
   * feature they already have. The upgrade is the TIER, and the tier is slate everywhere in this
   * app. `.ct-btn-slate` reads the app's own `--slate` rather than a page copy, so comps' Pro action
   * cannot drift from the Package Builder's or the manuscript plate's.
   *
   * ⚠️ AND NO COUNT OR QUOTA MAY APPEAR IN THIS COPY. Free comps are unlimited and the Pro boundary
   * is the Scout itself, so "up to N" would state a limit that does not exist, and a library total
   * would state a library this Scout does not have.
   */
  it("offers the upgrade in slate, routed at the existing CTA, with no quota language", () => {
    expect(src).toContain("ct-btn-slate");
    expect(src).toContain("onClick={onUpgrade}");
    const free = sliceBetween(src, "if (!isPro) {", "const sent = run");
    expect(free).not.toMatch(/up to \d|\bquota\b|\bremaining\b|\d[\d,]* verified titles/i);
    /* the pink verb must not have followed it in — that would make one colour mean two things */
    expect(free).not.toContain("ct-btn-pink");
  });

  /** ⚠️ A FREE USER NEVER DISPATCHES — the panel returns before any send control exists. */
  it("gives a free user no send control at all", () => {
    const free = sliceBetween(src, "if (!isPro) {", "const sent = run");
    expect(free).not.toContain("Send the Scout out");
    expect(free).not.toContain("fetchCompRun");
  });
});

describe("the footer claim, and what stands behind it", () => {
  it("states the claim the verification model exists to earn", () => {
    expect(src).toContain("Every title checked against a real catalogue — nothing invented");
  });

  /**
   * ⚠️ THE CHIP NAMES ITS CATALOGUE AND IS THE SAME COMPONENT AS THE COMP ROW'S. One claim, one
   * treatment, both cards — a chip that meant sage in the list and blue in the panel would read as
   * two different claims.
   */
  /**
   * ⚠️ RETARGETED TO ITS NEW MODULE (v3.1 §7). `ScoutRow` moved out of the page into
   * `compsScoutRow.tsx` so a spec could render it without the page's Firebase import chain dragging
   * `auth/invalid-api-key` into collection. `sliceBetween` failed LOUDLY naming the missing anchor
   * rather than widening to the rest of the file, which is the whole reason it exists.
   *
   * ⚠️ AND THE SLICE IS GONE WITH THE MOVE. The row is now the whole module, so there is nothing to
   * bound — and a whole-file assertion is strictly stronger than the bounded one it replaces.
   */
  it("the row's verified chip is the shared one, naming its catalogue", () => {
    const row = readFileSync(join(here, "compsScoutRow.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(row, "the suggestion card is not in its own module any more").toContain("ScoutRow");
    expect(row).toContain('className="ct-chip verified"');
    expect(row).toContain("s.verification.catalogue");
    /* and the page no longer defines it — two copies would drift */
    expect(src, "ScoutRow is defined in the page again").not.toContain("const ScoutRow");
  });

  /** links and agentMatch are CARRIED but not rendered — Amendment 3 keeps the fields, defers the UI */
  it("carries links and agentMatch without rendering them yet", () => {
    expect(src).not.toContain("s.links");
    expect(src).not.toContain("s.agentMatch");
  });
});
