/**
 * Query card v160 — source locks for the card's motion (design-refs/query-card-v160/). The motion itself is measured
 * in tests/e2e/qc160.measure.ts; these hold the rules a reading can miss.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const MOTION = read("./qcMotion160.ts");
const LANDING = read("./useLanding160.ts");
const CARD = read("./QcCard152.tsx");
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("Query card v160 · Phase 1 — the bump", () => {
  it("animates the frame's `scale` (1 → 1.022 at 35% → 1, 500ms), never `transform`", () => {
    const fn = code(MOTION).match(/export function bump[\s\S]*?\n}/)?.[0] ?? "";
    expect(fn).toMatch(/frame\.animate\(/);
    expect(fn).toMatch(/scale:/);
    expect(fn).not.toMatch(/transform/);
    expect(MOTION).toMatch(/ms: 500, peak: 1\.022, at: 0\.35, ease: "cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)"/);
  });
  it("a new bump ends the running one at once (they never stack), and nothing moves under reduced motion", () => {
    const fn = code(MOTION).match(/export function bump[\s\S]*?\n}/)?.[0] ?? "";
    expect(fn.indexOf("reduced()")).toBeGreaterThan(-1);
    expect(fn.indexOf(".cancel()")).toBeGreaterThan(-1);
    expect(fn.indexOf(".cancel()")).toBeLessThan(fn.indexOf("frame.animate("));
  });
  it("the card bumps only on a landing's first change, on its own frame", () => {
    expect(CARD).toMatch(/useLanding160\(p\.motion, sig160, r\.id/);
    expect(code(CARD)).toMatch(/if \(first\) bump\(root\.closest<HTMLElement>\("\.spanel"\)\)/);
    expect(LANDING).toMatch(/p\.rId !== rId/);
  });
  it("no var() and no color-mix() in the motion", () => {
    for (const s of [MOTION, LANDING]) { expect(code(s)).not.toMatch(/var\(--/); expect(code(s)).not.toMatch(/color-mix\(/); }
  });
});

const CSS = read("./qcv160.css");
const CARD_MOTION = read("../../../lib/cardMotion.ts");
const HOST = read("../../Queries.tsx");
describe("Query card v160 · Phase 2 — confirm", () => {
  it("the draft and the step that arrives for it share one React key, so the element is kept", () => {
    expect(CARD).toMatch(/<React\.Fragment key=\{draftKey\}><Bubble/);
    expect(CARD).toMatch(/<React\.Fragment key=\{rk\(it\.key\)\}>/);
    expect(CARD).toMatch(/alias\.current\.map\.set\(tgt\.key, draftKey\)/);
    expect(code(CARD)).toMatch(/settle\(root, e, /);
  });
  it("the fill is one background-size run on a single-colour layer; the dashed edge fades by outline-color", () => {
    const fn = code(MOTION).match(/export function settle[\s\S]*?\n}/)?.[0] ?? "";
    expect(fn).toMatch(/backgroundSize: size/);
    expect(fn).toMatch(/linear-gradient\(\$\{c\}, \$\{c\}\)/);
    expect(fn).toMatch(/outlineColor/);
    expect(MOTION).toMatch(/ms: 420, ease: "cubic-bezier\(0\.3, 0\.7, 0\.2, 1\)", lineFrom: 120, lineMs: 300, from: 1\.015/);
  });
  it("Record a response's savedCard is replaced, not kept beside it", () => {
    expect(CARD_MOTION).not.toMatch(/export function savedCard|export function bandColourNow/);
    expect(code(HOST)).not.toMatch(/savedCard\(|bandColourNow\(/);
  });
  it("everything stays still under reduced motion; the leaving toast has no entrance and takes no clicks", () => {
    expect(code(CARD)).toMatch(/if \(reduced\(\)\) \{ snap160\.current = readSnap160\(root\); return; \}/);
    expect(code(MOTION).match(/export function toastOut[\s\S]*?\n}/)?.[0]).toMatch(/if \(reduced\(\)\) \{ done\(\); return; \}/);
    expect(CSS).toMatch(/\.qc1522-toast\.qc160-tout \{ animation: none; pointer-events: none; \}/);
    expect(code(CSS)).not.toMatch(/var\(|color-mix\(/);
  });
});

describe("Query card v160 · Phase 3 — undo", () => {
  it("an undone step folds: opacity over 190ms, then its height and margins over 230ms, then it is dropped", () => {
    const fn = code(MOTION).match(/export function fold[\s\S]*?\n}/)?.[0] ?? "";
    expect(MOTION).toMatch(/fadeMs: 190, closeMs: 230, ease: "cubic-bezier\(0\.4, 0, 0\.2, 1\)"/);
    expect(fn).toMatch(/el\.offsetHeight/);
    expect(fn).toMatch(/height: "0px", marginTop: "0px"/);
    expect(fn).toMatch(/pointerEvents = "none"/);
  });
  it("the steps an undo takes away are found in the render that drops them, and drawn where they stood", () => {
    expect(CARD).toMatch(/const goneNow: Leaving\[\] =/);
    expect(CARD).toMatch(/fold\(root, els, /);
    expect(CARD).toMatch(/data-leaving/);
  });
  it("a new save or undo ends a running motion at once and drops what was still leaving", () => {
    const start = CARD.slice(CARD.indexOf("start: () => {"), CARD.indexOf("land: (kind, first)"));
    expect(start).toMatch(/finishAll\(root\)/);
    expect(start).toMatch(/setLeaving\(\[\]\)/);
  });
  it("the page's undo is untouched: the toast clears and the restore runs at the press", () => {
    const u = HOST.slice(HOST.indexOf("card1522.toast = qc1522Toast ?"), HOST.indexOf("card1522.burst ="));
    expect(u).toMatch(/setQc1522Toast\(null\);\n\s+if \(t\.bump\) setQcMotion160\(\{ kind: "undo", n: Date\.now\(\) \}\);\n[\s\S]*void t\.undo\?\.\(\)/);
    expect(u).not.toMatch(/setTimeout/);
  });
});

