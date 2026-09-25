/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the motion timings. jsdom cannot run an animation or lay out a grid, so what is
 * testable is the STAGGER ARITHMETIC and the timing relationships — and those are the parts that
 * would rot silently. The motion itself is on the browser-check list.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../test/sliceBetween";
import {
  ARRIVE_MS,
  BUMP_MS,
  CARDS_START_MS,
  EXIT_MS,
  LOAD_MS,
  MAX_STAGGER_ROWS,
  ROW_STEP_MS,
  parseColumnCount,
  rowDelayMs,
} from "./agentMotion";

describe("agentMotion · the stagger is by ROW and capped", () => {
  it("every card in a row shares one delay — three columns, three cards, one delay", () => {
    expect([0, 1, 2].map((i) => rowDelayMs(i, 3))).toEqual([120, 120, 120]);
  });

  it("rows step 40ms apart", () => {
    expect(rowDelayMs(0, 3)).toBe(120);
    expect(rowDelayMs(3, 3)).toBe(160);
    expect(rowDelayMs(6, 3)).toBe(200);
    expect(rowDelayMs(9, 3)).toBe(240);
  });

  it("THE CAP: every row past the fourth shares the fourth delay, so a long list never gets slower", () => {
    const last4th = rowDelayMs(9, 3);
    expect(
      rowDelayMs(15, 3),
      "the stagger uncapped — the sixteenth card now waits longer than the tenth, and a two-hundred-agent list would take seconds to finish arriving",
    ).toBe(last4th);
    expect(rowDelayMs(600, 3)).toBe(last4th);
    // the whole sequence is bounded no matter the list length
    expect(rowDelayMs(600, 3)).toBe(CARDS_START_MS + (MAX_STAGGER_ROWS - 1) * ROW_STEP_MS);
  });

  it("a SIXTEEN-card three-column grid finishes staggering in 240ms, not 400", () => {
    const delays = Array.from({ length: 16 }, (_, i) => rowDelayMs(i, 3));
    expect(Math.max(...delays)).toBe(240);
    // what per-card 25ms staggering would have cost, and why the row rule exists
    expect(16 * 25).toBeGreaterThan(Math.max(...delays));
  });

  it("adapts to the live column count — the same card is on a different row at a different width", () => {
    expect(rowDelayMs(3, 3)).toBe(160); // three columns: second row
    expect(rowDelayMs(3, 4)).toBe(120); // four columns: still the first row
    expect(rowDelayMs(3, 1)).toBe(240); // single column: fourth row, and capped from here on
  });

  it("survives a column count of zero rather than dividing by it", () => {
    expect(rowDelayMs(5, 0)).toBe(rowDelayMs(5, 1));
    expect(Number.isFinite(rowDelayMs(5, 0))).toBe(true);
  });
});

describe("agentMotion · the timing RELATIONSHIPS, which are the point", () => {
  it("an arrival is SLOWER than the load — it must read as its own event, not another card loading", () => {
    expect(
      ARRIVE_MS,
      "the arrival dropped to the load's speed — a card you asked for now appears exactly like sixteen you didn't, and the add reads as a page refresh",
    ).toBeGreaterThan(LOAD_MS);
  });

  it("the exit is FASTER than both — a quick exit against a considered entrance", () => {
    expect(EXIT_MS).toBeLessThan(LOAD_MS);
    expect(EXIT_MS).toBeLessThan(ARRIVE_MS);
  });

  it("the bump MATCHES the arrival — the card appearing and its neighbours moving are one event", () => {
    expect(
      BUMP_MS,
      "the bump drifted off the arrival duration — the new card and the cards making room for it now finish at different moments, which reads as two separate things happening",
    ).toBe(ARRIVE_MS);
  });
});

describe("agentMotion · parseColumnCount reads the RESOLVED track list", () => {
  it("counts used tracks — auto-fill's real column count is only knowable after layout", () => {
    expect(parseColumnCount("268px 268px 268px")).toBe(3);
    expect(parseColumnCount("300.5px 300.5px")).toBe(2);
  });

  it("falls back to a single column when there is nothing laid out to measure", () => {
    expect(parseColumnCount("none")).toBe(1);
    expect(parseColumnCount("")).toBe(1);
    expect(parseColumnCount(null)).toBe(1);
    expect(parseColumnCount(undefined)).toBe(1);
  });

  it("tolerates the whitespace a computed value can carry", () => {
    expect(parseColumnCount("  268px   268px  ")).toBe(2);
  });
});

/* ── artefact locks: the shared home, and the wiring that can't be seen in jsdom ────────────── */
import { readFileSync } from "fs";
const motionCss = readFileSync(new URL("../styles/motion.css", import.meta.url), "utf8");
const listCss = readFileSync(new URL("../components/agents/agentList.css", import.meta.url), "utf8");
const page = readFileSync(new URL("../components/agents/AgentList.tsx", import.meta.url), "utf8");

describe("motion vocabulary lives in ONE shared place", () => {
  it("rise and fall are defined in the shared stylesheet, with the stated geometry", () => {
    expect(motionCss).toMatch(/@keyframes rise[\s\S]*?translateY\(7px\)/);
    expect(motionCss).toMatch(/@keyframes fall[\s\S]*?translateY\(-5px\)/);
  });

  it("NO second copy — the agent list consumes them, it never redefines them", () => {
    expect(
      listCss,
      "the agent list defined its own rise/fall — that is the second keyframe the whole shared home exists to prevent; a page-local copy drifts the moment either is tuned",
    ).not.toMatch(/@keyframes\s+(rise|fall)\b/);
  });

  it("the shared sheet says out loud that it is shared, so it isn't scoped back into a component", () => {
    expect(motionCss).toMatch(/APP-WIDE|app-wide/);
    expect(motionCss).toMatch(/queries-hub-v4/);
  });

  it("the settled class carries !important — it has to beat the animation that set it running", () => {
    expect(
      motionCss,
      "`.sa-settled` lost its !important, so it no longer outranks the running animation shorthand and FLIP transforms will be silently ignored",
    ).toMatch(/\.sa-settled\s*\{\s*animation:\s*none\s*!important/);
  });
});

/* ⚠️ THE LOAD SEQUENCE IS RETIRED WITH THE CARD GRID (v11 P3). The staggered entrance introduced
   a WALL OF CARDS; the v11 rows arrive as a list and the mock draws no entrance for them, so
   `loadAnim`, the column count and the row stagger left the page with the renderer. The stagger
   MATHS above stay locked — `rowDelayMs`/`gridColumnCount` are pure and would be the first thing
   a future entrance reaches for — and the FLIP's own laws live on: the rows carry
   `data-agent-card`, flip.ts's default selector, asserted below. */
describe("the FLIP survived the renderer swap", () => {
  const list = readFileSync(new URL("../components/agents/AgentList.tsx", import.meta.url), "utf8");
  const rows = readFileSync(new URL("../components/agents/contact/ContactRows.tsx", import.meta.url), "utf8");
  it("rows carry flip.ts's own selector, and the page still measures before a reflow", () => {
    expect(rows).toContain("data-agent-card={a.id}");
    expect(list).toContain("flipBefore.current = measureFlip(gridRef.current)");
    expect(list).toContain("playFlip(gridRef.current, before, { durationMs: BUMP_MS })");
  });
});

/* ⚠️ THE THREE-BEAT SAVE IS RETIRED WITH THE FLIP CARD (v11 P4, 25 Sep). Crossfade → breath →
   travel animated a FACE SWAP — the editor face becoming the card face in place, holding still,
   then journeying to its sorted position. A v11 save closes a pop-up and reflows ROWS: there is
   no face to swap, so the fadeout/fadein/breath phases, `SAVE_*_MS` and the `.sv-*` rules left
   together (recoverable at 2d160183's parent). What SURVIVES is the ordering law the beats were
   built on, asserted below against the v11 anchors. The id-adoption and scroll-fully-into-view
   describes went the same way: their subject was the in-grid draft card (an editor taller than
   the viewport, landed with block:"start"), and the v11 page has no in-grid editor — the two
   surviving scrolls target a normal-height ROW and centre it, which is the right block for that
   subject, so the block:"start" law does not transfer. */

describe("the save notice and the FLIP still agree (the surviving law)", () => {
  const list = readFileSync(new URL("../components/agents/AgentList.tsx", import.meta.url), "utf8");

  it("the outcome is computed BEFORE the motion is measured, so the sentence and the travel agree", () => {
    /* the outcome derives against the v11 pipeline; the anchor is its own first line, and the
       "motion" is now the FLIP measurement the reflow plays from */
    const outcomeAt = list.indexOf("const savedFacts = agentFacts(saved");
    const measureAt = list.indexOf("flipBefore.current = measureFlip(gridRef.current)");
    expect(
      outcomeAt > -1 && measureAt > -1 && outcomeAt < measureAt,
      "the outcome is worked out after the FLIP measurement — the row can then travel one way while the notice describes another",
    ).toBe(true);
  });

  it("the notice knows where the row LANDED, not where it was — the sort runs before the sentence", () => {
    const block = sliceBetween(list, "const savedFacts = agentFacts(saved", "flipBefore.current = measureFlip");
    expect(block, "the landing position is no longer derived through the page's own sort").toContain("sortFacts(");
    expect(block).toContain("setNotice({");
  });
});
