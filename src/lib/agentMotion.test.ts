/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the motion timings. jsdom cannot run an animation or lay out a grid, so what is
 * testable is the STAGGER ARITHMETIC and the timing relationships — and those are the parts that
 * would rot silently. The motion itself is on the browser-check list.
 */
import { describe, it, expect } from "vitest";
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

describe("the load sequence is armed ONCE, on route entry", () => {
  it("the state class rides the CONTAINER, not the cards", () => {
    expect(page).toMatch(/className=\{`aglist\$\{loadAnim \? " agl-anim" : ""\}`\}/);
  });

  it("the sequence DISARMS itself — otherwise filled animations outrank the FLIP transforms", () => {
    expect(
      page,
      "the load class is never cleared; cards keep a filled animation, which outranks an inline transform, and every later bump silently does nothing",
    ).toContain("setLoadAnim(false)");
  });

  it("it is not reactive to filters, sort or grouping — a tick must not re-run the page's entrance", () => {
    const armBlock = page.slice(page.indexOf("if (!loadAnim) return;"), page.indexOf("}, []);", page.indexOf("if (!loadAnim) return;")) + 8);
    expect(armBlock, "the arming effect gained dependencies — it now re-fires on state changes and the page re-animates as you filter").toMatch(/\}, \[\]\);\s*$/);
  });

  it("reduced motion never arms it at all — no timer, no measurement, nothing to undo", () => {
    expect(page).toContain("useState(!prefersReducedMotion())");
  });
});

describe("the save is THREE BEATS, never one", () => {
  const list = readFileSync(new URL("../components/agents/AgentList.tsx", import.meta.url), "utf8");

  it("crossfade → breath → travel, in that order, each with its own phase", () => {
    // anchor on the CALLS, not the state type annotation that also names the phases
    const fadeout = list.indexOf('setSaveState({ id: saved.id, phase: "fadeout" })');
    const fadein = list.indexOf('setSaveState({ id: saved.id, phase: "fadein" })');
    const breath = list.indexOf('setSaveState({ id: saved.id, phase: "breath" })');
    expect(
      fadeout > -1 && fadein > fadeout && breath > fadein,
      "the save's beats collapsed into one motion — a card flung across the grid the instant you press Done is unreadable, and you cannot tell whether it saved or simply went away",
    ).toBe(true);
  });

  it("the BREATH is real — the travel does not begin the moment the crossfade ends", () => {
    expect(
      list,
      "the breath was removed; the transformation and the journey now run together, so neither registers",
    ).toContain("SAVE_BREATH_MS");
  });

  it("the crossfade suppresses the rotor — a save is a transformation, not a flip back", () => {
    const css = readFileSync(new URL("../components/agents/agentList.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.sv-fadeout \.agl-rotor,[\s\S]*?transition: none/);
  });

  it("the outcome is computed BEFORE the motion, so the notice and the choreography agree", () => {
    const outcomeAt = list.indexOf("saveOutcome(saved");
    const firstPhase = list.indexOf('setSaveState({ id: saved.id, phase: "fadeout" })');
    expect(
      outcomeAt > -1 && outcomeAt < firstPhase,
      "the outcome is worked out after the motion starts — the card can then travel one way while the sentence describes another",
    ).toBe(true);
  });
});

describe("id adoption happens ONLY on a confirmed create", () => {
  const list = readFileSync(new URL("../components/agents/AgentList.tsx", import.meta.url), "utf8");

  it("the real id is adopted onto the draft node after success", () => {
    expect(
      list,
      "id adoption was removed — React will destroy the draft node and build a fresh card, and FLIP cannot animate an element that no longer exists, so the save can never travel",
    ).toMatch(/if \(created\.id\) setNewAgent/);
  });

  it("a FAILED create adopts nothing and leaves the draft a draft", () => {
    const failBlock = list.slice(list.indexOf("if (!created?.success)"), list.indexOf("ID ADOPTION"));
    expect(
      failBlock,
      "the failure path now adopts an id — a node would claim an id that does not exist in the database",
    ).not.toMatch(/setNewAgent\([^)]*created\.id/);
    expect(failBlock).toContain("return;");
  });
});
