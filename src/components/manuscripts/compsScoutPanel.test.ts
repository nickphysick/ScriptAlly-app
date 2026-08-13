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

  it("is 26px · 1fr · 104px with a 12px column gap", () => {
    const cols = row.match(/grid-template-columns\s*:([^;]*);/)![1].trim();
    expect(cols).toBe("26px minmax(0, 1fr) 104px");
    expect(row).toMatch(/column-gap\s*:\s*12px/);
  });

  it("aligns to start, never centre", () => {
    expect(row.match(/align-items\s*:([^;]*);/)![1].trim()).toBe("start");
  });

  /**
   * ⚠️ THE FIXED ACTION COLUMN IS WHAT KEEPS THE RIGHT EDGES FLUSH. Sizing it to content is the one
   * change that silently reverts the fix — a long title would push its own ADD leftwards while its
   * neighbours' stayed put.
   */
  it("never lets the action column size to its contents", () => {
    const last = row.match(/grid-template-columns\s*:([^;]*);/)![1].trim().split(/\s+/).pop()!;
    expect(["auto", "min-content", "max-content", "fit-content"]).not.toContain(last);
    expect(last).toBe("104px");
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
    const ghost = src.slice(src.indexOf('className="ghost"'), src.indexOf("lockwrap"));
    expect(ghost).toContain('className="bar');
    /* nothing quoted in the ghost may be prose — only class names and the index numerals */
    expect(ghost).not.toMatch(/\bs\.title\b|\bs\.author\b|suggestions/);
  });

  it("offers the upgrade in pink and routes it at the existing CTA", () => {
    expect(src).toContain("See Pro plans");
    expect(src).toContain("onClick={onUpgrade}");
  });

  /** ⚠️ A FREE USER NEVER DISPATCHES — the panel returns before any send control exists. */
  it("gives a free user no send control at all", () => {
    const free = src.slice(src.indexOf("if (!isPro) {"), src.indexOf("const sent = run"));
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
  it("the row's verified chip is the shared one, naming its catalogue", () => {
    const row = src.slice(src.indexOf("const ScoutRow"), src.indexOf("type ScoutPhase"));
    expect(row).toContain('className="ct-chip verified"');
    expect(row).toContain("s.verification.catalogue");
  });

  /** links and agentMatch are CARRIED but not rendered — Amendment 3 keeps the fields, defers the UI */
  it("carries links and agentMatch without rendering them yet", () => {
    expect(src).not.toContain("s.links");
    expect(src).not.toContain("s.agentMatch");
  });
});
