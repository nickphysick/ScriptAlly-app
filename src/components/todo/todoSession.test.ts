/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOCUSED SESSION — source/rule-text locks (jsdom mounts nothing; the stage maths is
 * REAL-unit-tested in sessionStage.test.ts). The engine invariant: the queue is the board's
 * own boardCards order; the container is presentation + session bookkeeping only.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const ss = readFileSync(join(here, "FocusedSession.tsx"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("session P1 — the opening", () => {
  it("Begin launches the SESSION with the engine's own queue (boardCards order, captured at launch)", () => {
    expect(page).toContain('onClick={() => setSession({ queue: boardCards })}>');
    expect(page).toContain("const [session, setSession] = useState<{ queue: BoardCard[] } | null>(null);");
    expect(page).toContain("queue={session.queue}");
    expect(page).not.toContain("setFlow({ items: boardCards.map"); // the old whole-board walk entry is superseded
  });
  it("the sequence: darken → fly (nearest edges, staggered) → the three ritual lines → the reveal → the pair", () => {
    expect(ss).toContain("setDimOn(true); // 1 — the slow darken (1.1s wash)");
    expect(ss).toContain("at(OPENING.flyDelayMs, flyOut); // 2 — the desk clears via nearest edges");
    expect(ss).toContain("RITUAL_LINES.forEach((_, i) => at(OPENING.linesDelayMs + i * OPENING.lineMs, () => setLine(i)));");
    expect(ss).toContain("at(i * OPENING.flyStaggerMs, () => {"); // the stagger
    expect(ss).toContain("nearestEdgeFly(r.left + r.width / 2, r.top + r.height / 2, r.width, r.height, W, H)");
    expect(ss).toContain("at(OPENING.spotDelayMs, wander);");
    expect(ss).toContain("at(OPENING.pairDelayMs, () => setPairOn(1));");
    expect(ss).toContain("at(OPENING.pairDelayMs + OPENING.pairGapMs, () => setPairOn(2));");
    expect(rule(".tdb-ssdim")).toContain("transition: background 1100ms ease");
    expect(rule(".tdb-ssdim.on")).toContain("rgba(26, 13, 9, 0.74)");
  });
  it("the lines: the three ritual strings verbatim from the lib, italic Playfair 34, cream", () => {
    expect(ss).toContain("{RITUAL_LINES.map((l, i) => (");
    const l = rule(".tdb-sslines span");
    expect(l).toContain("font-style: italic");
    expect(l).toContain("font-size: 34px");
    expect(l).toContain("color: #f3e7da");
  });
  it("THE REVEAL INVARIANT: the card mounts BENEATH the veil (z 2 < 3) inside the overlay — visible only in the beam", () => {
    expect(rule(".tdb-ssfirst")).toContain("z-index: 2");
    expect(rule(".tdb-ssveil")).toContain("z-index: 3");
    expect(ss).toContain('ctx.fillStyle = `rgba(26,13,9,${OPENING.veilTo})`;'); // the 0.9 full dark
    expect(ss).toContain('ctx.globalCompositeOperation = "destination-out";'); // the punched beam
    expect(ss).toContain("draw(-999, -999, 1);"); // mounts unseen — the light must FIND it
    expect(ss).toContain("setFirstOn(true);");
  });
  it("skip: ANY click or keypress during the sequence jumps to the final composition", () => {
    expect(ss).toContain('onPointerDown={phase === "opening" && !openingFinal ? jumpToFinal : undefined}');
    expect(ss).toContain('onKeyDown={phase === "opening" && !openingFinal ? jumpToFinal : undefined}');
    expect(ss).toContain("if (finalRef.current || phase !== \"opening\") return;");
    expect(ss).toContain("timers.current.forEach((t) => window.clearTimeout(t));");
  });
  it("reduced motion starts at the final composition; the css transitions go quiet with it", () => {
    expect(ss).toContain('window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;');
    expect(ss).toContain("const [openingFinal, setOpeningFinal] = useState(reduce);");
    expect(css).toContain(".tdb-ssdim, .tdb-ssveil, .tdb-sslines span, .tdb-ssb, .tdb-ssfirst { transition: none; }");
  });
  it("Back to desk reverses compressed (~600ms) and STRIPS every inline style it added — from any exit path", () => {
    expect(ss).toContain("restoreDesk(OPENING.reverseMs);");
    expect(ss).toContain("window.setTimeout(onClose, OPENING.reverseMs + 40);");
    expect((ss.match(/el\.style\.cssText = el\.style\.cssText\.replace\(/g) ?? []).length).toBe(2); // the reverse + the unmount guard
  });
  it("the fly targets the board wrap's CONTENTS only — never the app chrome (the wrap-scoped query)", () => {
    expect(ss).toContain("wrapEl.querySelectorAll<HTMLElement>(FLY_SELECTOR)");
    expect(page).toContain("wrapEl={wrapRef.current}");
  });
  it("the overlay's z law: 48 — beneath the journey flow (50), the toast (60) and the ask (90)", () => {
    expect(rule(".tdb-ss")).toContain("z-index: 48");
  });
});
