/**
 * Query card v160 — source locks for the card's motion (design-refs/query-card-v160/). The motion itself is measured
 * in tests/e2e/qc160.measure.ts; these hold the rules a reading can miss.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { bump, gridEase } from "./qcMotion160";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const MOTION = read("./qcMotion160.ts");
const LANDING = read("./useLanding160.ts");
const CARD = read("./QcCard152.tsx");
const COMPOSER = read("./QcComposer1522.tsx");
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("Query card v160 · Phase 1 — the bump", () => {
  /* rewritten for Query card v161.1: the bump is now the pop after a press — 0.985 → 1.035 at 40% → 1, 520ms */
  it("animates the frame's `scale` (the pop: from the press's 0.985 → 1.035 at 40% → 1, 520ms), never `transform`", () => {
    const fn = code(MOTION).match(/export function bump[\s\S]*?\n}/)?.[0] ?? "";
    expect(fn).toMatch(/frame\.animate\(/);
    expect(fn).toMatch(/scale:/);
    expect(fn).not.toMatch(/transform/);
    expect(MOTION).toMatch(/BUMP = \{ ms: 520, peak: 1\.035, at: 0\.4, ease: "cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)"/);
    expect(fn).toMatch(/const from = p \? PRESS\.to : 1;/);
  });
  it("a new bump ends the running one at once (they never stack), and nothing moves under reduced motion", () => {
    const fn = code(MOTION).match(/export function bump[\s\S]*?\n}/)?.[0] ?? "";
    expect(fn.indexOf("reduced()")).toBeGreaterThan(-1);
    expect(fn.indexOf(".cancel()")).toBeGreaterThan(-1);
    expect(fn.indexOf(".cancel()")).toBeLessThan(fn.indexOf("frame.animate("));
  });
  it("the card bumps only on a landing's first change, on its own frame", () => {
    expect(CARD).toMatch(/useLanding160\(p\.motion, sig160, r\.id/);
    /* v161: the card passes itself as the bump's owner, so the bump is held with the rest of the landing's motion */
    expect(code(CARD)).toMatch(/if \(first\) bump\(root\.closest<HTMLElement>\("\.spanel"\), root\)/);
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

describe("Query card v160 · Phase 4 — the grid card behind", () => {
  const solid = (band: string) => ({ band, grad: false }), grad = (band: string) => ({ band, grad: true });
  it("eases between two single colours", () => {
    expect(gridEase(solid("#efe6d6"), solid("#e4ebf2"))).toEqual({ from: "#efe6d6", to: "#e4ebf2" });
  });
  it("changes at once where either end is a gradient (the offer's sheen, gone quiet's fade), or nothing changed", () => {
    expect(gridEase(grad("#efcdc9"), solid("#eceae6"))).toBeNull();
    expect(gridEase(solid("#b7c9de"), grad("#efcdc9"))).toBeNull();
    expect(gridEase(solid("#efe6d6"), grad("#efe6d6"))).toBeNull();
    expect(gridEase(solid("#efe6d6"), solid("#efe6d6"))).toBeNull();
    expect(gridEase(null, solid("#efe6d6"))).toBeNull();
  });
  it("the grid card animates its band only, 500ms, never under reduced motion", () => {
    const G = read("./QcCard154.tsx");
    expect(G).toMatch(/gridBand\(hdRef\.current, e\)/);
    const fn = code(MOTION).match(/export function gridBand[\s\S]*?\n}/)?.[0] ?? "";
    expect(fn).toMatch(/reduced\(\)/);
    expect(fn).toMatch(/backgroundColor: e\.from \}, \{ backgroundColor: e\.to/);
    expect(MOTION).toMatch(/GRID = \{ ms: 500 \}/);
  });
});

describe("Query card v160 · QC160-4 — bumps never stack (a stub frame: two landings inside 500ms cannot be made through the UI)", () => {
  it("a second bump ends the running one at once, before it starts", () => {
    const log: string[] = [];
    let n = 0;
    const frame = {
      animate: () => {
        const k = ++n;
        log.push(`start ${k}`);
        return { id: "", cancel: () => log.push(`cancel ${k}`), finished: new Promise(() => {}) };
      },
    } as unknown as HTMLElement;
    bump(frame);
    bump(frame);
    expect(log).toEqual(["start 1", "cancel 1", "start 2"]);
  });
});

describe("Query card v161 · Phase 2 — the motion waits for the page", () => {
  it("the landing holds its motion (the bump with it) and nothing is finished out from under the hold", () => {
    const land = code(CARD).slice(code(CARD).indexOf("land: (kind, first) => {"), code(CARD).indexOf("/* the draft is held while"));
    expect(land.indexOf("if (!reduced() && !isHeld(root)) finishAll(root);")).toBeGreaterThan(-1);
    expect(land.indexOf("if (!reduced() && !isHeld(root)) finishAll(root);")).toBeLessThan(land.indexOf("hold(root)"));
    expect(land.indexOf("hold(root)")).toBeLessThan(land.indexOf('bump(root.closest<HTMLElement>(".spanel"), root)'));
  });
  it("the release waits for the page's done and three quick frames, and plays regardless after 4s", () => {
    expect(CARD).toMatch(/if \(quiet >= 3\) release\(root\)/);
    expect(CARD).toMatch(/window\.setTimeout\(\(\) => release\(root\), 4000\)/);
    expect(HOST).toMatch(/if \(bump\) setQcMotion160\(\(m\) => \(m && m\.kind === "save" \? \{ \.\.\.m, done: true \} : m\)\);/);
  });
  it("a held animation is paused when made and played on release", () => {
    expect(code(MOTION)).toMatch(/if \(h\) \{ a\.pause\(\); h\.push\(a\); \}/);
    expect(code(MOTION).match(/export function release[\s\S]*?\n}/)?.[0]).toMatch(/a\.play\(\)/);
  });
});

describe("Query card v161.1 — press in, hold, pop", () => {
  const fnOf = (name: string) => code(MOTION).match(new RegExp(`export function ${name}[\\s\\S]*?\\n}`))?.[0] ?? "";
  it("the press: scale 1 → 0.985 over 120ms, ease-out, held (fill forwards), never under reduced motion, never stacked", () => {
    expect(MOTION).toMatch(/PRESS = \{ to: 0\.985, ms: 120, backMs: 150, net: 4000, yieldMs: 50 \}/);
    const f = fnOf("pressIn");
    expect(f).toMatch(/if \(!frame \|\| reduced\(\) \|\| pressed\.has\(frame\)\) return;/);
    expect(f).toMatch(/\[\{ scale: "1" \}, \{ scale: String\(PRESS\.to\) \}\], \{ duration: PRESS\.ms, easing: "ease-out", fill: "forwards" \}/);
    /* v161.2: the press ends the breath (the rim eases back on its own layer) */
    expect(f).toMatch(/breathEnd\(frame\);/);
    expect(f).toMatch(/window\.setTimeout\(\(\) => pressBack\(frame\), PRESS\.net\)/);
  });
  it("starts at the pointer's press; the click confirms it and saves; Undo yields two painted frames, never over 50ms", () => {
    expect(COMPOSER).toMatch(/onPointerDown=\{\(e\) => \{ if \(p && !busy\) pressAtPointer\(/);
    expect(CARD).toMatch(/data-qc1522="undo" onPointerDown=\{\(e\) => pressAtPointer\(/);
    expect(CARD).toMatch(/if \(u\) pressThen\(e\.currentTarget\.closest<HTMLElement>\("\.spanel"\), u, true\)/);
    expect(fnOf("pressThen")).toMatch(/window\.setTimeout\(go, PRESS\.yieldMs\)/);
  });
  it("nothing landed: eased back with no pop — on a withdrawn motion, a finished save that drew nothing, or the 4s net", () => {
    expect(CARD).toMatch(/if \(!p\.motion\) \{ pressBack\(frame\); return undefined; \}/);
    expect(fnOf("pressBack")).toMatch(/duration: PRESS\.backMs/);
  });
});

describe("Query card v161.2 — the card breathes while the drawer is open", () => {
  const fnOf = (name: string) => code(MOTION).match(new RegExp(`(?:export )?function ${name}\\([\\s\\S]*?\\n}`))?.[0] ?? "";
  it("1 → 1.01 → 1 over 1.9s, eased, repeating; scale only, never transform; no var()", () => {
    expect(MOTION).toMatch(/BREATHE = \{ peak: 1\.01, ms: 1900, ease: "ease-in-out", enterMs: 320, after: 300, restMs: 180, closeMs: 120, idleMs: 2000 \}/);
    const f = fnOf("breathStart");
    expect(f).toMatch(/frame\.animate\(\[k\(1\), k\(BREATHE\.peak, 0\.5\), k\(1\)\], \{ duration: BREATHE\.ms, iterations: Infinity, pseudoElement: RIM \}\)/);
    expect(f).toMatch(/if \(b\.a\) return;/);
    expect(f).not.toMatch(/transform|var\(/);
  });
  it("it is the rim that breathes, never the frame: the frame's ::before draws the rim and shadow, and the frame none", () => {
    expect(MOTION).toMatch(/const RIM = "::before";/);
    expect(fnOf("toRest")).toMatch(/pseudoElement: RIM/);
    expect(fnOf("breathEnd")).toMatch(/toRest\(frame, b, still\(frame, b\), PRESS\.ms\)/);
    const css = read("./qcv152card.css");
    const frame = css.match(/\.spanel\.qsp\.qsp:has\(> \.spanel-own > \[data-qc152\]\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(frame).toMatch(/background: transparent; box-shadow: none;/);
    const rim = css.match(/\.spanel\.qsp\.qsp:has\(> \.spanel-own > \[data-qc152\]\)::before \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(rim).toMatch(/position: absolute; inset: 0; z-index: -1; pointer-events: none;/);
    expect(rim).toMatch(/border-radius: 20px; background: #fff;/);
    expect(rim).toMatch(/box-shadow: 0 1px 2px rgba\(28, 19, 15, 0\.08\), 0 26px 48px -20px rgba\(28, 19, 15, 0\.38\), 0 70px 90px -50px rgba\(28, 19, 15, 0\.3\);/);
  });
  it("never under reduced motion; the press ends it; a press given back lets it return", () => {
    expect(fnOf("breatheOpen")).toMatch(/if \(!frame \|\| reduced\(\)\) return;/);
    expect(fnOf("pressBack")).toMatch(/breathResume\(frame\);/);
  });
  it("the drawer owns it: open at its mount, closed at its unmount, rested on a keystroke in a field", () => {
    expect(COMPOSER).toMatch(/breatheOpen\(frame\);\n\s*return \(\) => breatheClose\(frame\);/);
    expect(COMPOSER).toMatch(/onKeyDownCapture=/);
    expect(COMPOSER).toMatch(/if \(t\.matches\?\.\("input, textarea, \[contenteditable='true'\]"\)\) breatheType\(frameOf\(\)\);/);
    /* order (CLAUDE.md, TDZ): frameOf is declared above the effect and the handler that read it */
    expect(COMPOSER.indexOf("const frameOf = ")).toBeGreaterThan(0);
    expect(COMPOSER.indexOf("const frameOf = ")).toBeLessThan(COMPOSER.indexOf("breatheOpen(frame);"));
  });
  it("a close made in the drawer, or a step to another query, stops it at the press (before the host's swap)", () => {
    expect(COMPOSER).toMatch(/const close = \(\) => \{ breatheClose\(frameOf\(\)\); onClose\(\); \};/);
    expect(COMPOSER).toMatch(/const exit = \(\) => up\(close\);/);
    expect(COMPOSER).toMatch(/data-qc1522="discard" onClick=\{\(\) => \{ setConf\(false\); setDirty\(false\); close\(\); \}\}/);
    expect(COMPOSER.indexOf("const frameOf = ")).toBeLessThan(COMPOSER.indexOf("const close = "));
    expect(CARD.match(/breatheClose\(e\.currentTarget\.closest<HTMLElement>\("\.spanel"\)\); p\.stepCard!\.go\((-1|1)\);/g)?.length).toBe(2);
  });
});
