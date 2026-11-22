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
  it("animates the frame's `scale` (v163: the pop from the press's 0.985 → 1.03 at 42% → 1, 620ms; the sink → 0.975 at 30%), never `transform`", () => {
    const fn = code(MOTION).match(/export function bump[\s\S]*?\n}/)?.[0] ?? "";
    expect(fn).toMatch(/frame\.animate\(/);
    expect(fn).toMatch(/scale:/);
    expect(fn).not.toMatch(/transform/);
    expect(MOTION).toMatch(/BUMP = \{ ms: 620, peak: 1\.03, at: 0\.42, ease: "cubic-bezier\(0\.25, 0\.8, 0\.25, 1\)" \}/);
    expect(MOTION).toMatch(/SINK = \{ low: 0\.975, at: 0\.3 \}/);
    expect(fn).toMatch(/const mid = kind === "undo" \? \{ scale: String\(SINK\.low\), offset: SINK\.at \} : \{ scale: String\(BUMP\.peak\), offset: BUMP\.at \};/);
    expect(fn).toMatch(/frame\.animate\(\[\{ scale: String\(from\) \}, mid, \{ scale: "1" \}\], \{ duration: BUMP\.ms, easing: BUMP\.ease \}\)/);
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
    expect(code(CARD)).toMatch(/if \(first\) bump\(root\.closest<HTMLElement>\("\.spanel"\), root, kind\)/);
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
    const el = (tag: string) => ({
      style: {} as Record<string, string>,
      animate: () => {
        const k = ++n;
        log.push(`start ${tag} ${k}`);
        return { id: "", cancel: () => log.push(`cancel ${tag} ${k}`), finished: new Promise(() => {}) };
      },
    });
    /* v163: the frame carries its rim layer (light and tint), and the landing's light never stacks either */
    const light = el("light"), tint = el("tint");
    const ring = { querySelector: (q: string) => (q.includes("> i") ? light : tint) };
    const frame = { ...el("frame"), querySelector: (q: string) => (q.includes("qc163-rim") ? ring : null) } as unknown as HTMLElement;
    bump(frame);
    bump(frame);
    expect(log).toEqual(["start frame 1", "start light 2", "cancel frame 1", "cancel light 2", "start frame 3", "start light 4"]);
  });
});

describe("Query card v161 · Phase 2 — the motion waits for the page", () => {
  it("the landing holds its motion (the bump with it) and nothing is finished out from under the hold", () => {
    const land = code(CARD).slice(code(CARD).indexOf("land: (kind, first) => {"), code(CARD).indexOf("/* the draft is held while"));
    expect(land.indexOf("if (!reduced() && !isHeld(root)) finishAll(root);")).toBeGreaterThan(-1);
    expect(land.indexOf("if (!reduced() && !isHeld(root)) finishAll(root);")).toBeLessThan(land.indexOf("hold(root)"));
    expect(land.indexOf('bump(root.closest<HTMLElement>(".spanel"), root, kind)')).toBeGreaterThan(-1);
    expect(land.indexOf("hold(root)")).toBeLessThan(land.indexOf('bump(root.closest<HTMLElement>(".spanel"), root, kind)'));
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
    /* v161.2: the press ends the breath (the rim eases back on its own layer); v163: the tint is held from where it was */
    /* Agent card v2.1 — re-pointed: the hold is skipped only when a press says `tint: false` (the agent card's star and Add
       note with nothing open); the query card never says it */
    expect(f).toMatch(/const was = breaths\.has\(frame\) \? breathEnd\(frame\) : opacityNow\(rimOf\(frame\)\.tint\);\s*if \(o\.tint !== false\) tintHold\(frame, was\);/);
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
  it("1 → 1.01 → 1 over 3.2s (v163), eased, repeating; scale only, never transform; no var()", () => {
    expect(MOTION).toMatch(/BREATHE = \{ peak: 1\.01, ms: 3200, ease: "cubic-bezier\(0\.37, 0, 0\.63, 1\)", enterMs: 320, after: 300, restMs: 180, closeMs: 120, idleMs: 2000 \}/);
    const f = fnOf("breathStart");
    expect(f).toMatch(/const t = \{ duration: BREATHE\.ms, iterations: Infinity, easing: BREATHE\.ease \};/);
    expect(f).toMatch(/const sk = \[\{ scale: "1" \}, \{ scale: String\(BREATHE\.peak\) \}, \{ scale: "1" \}\];/);
    expect(f).toMatch(/frame\.animate\(sk, \{ \.\.\.t, pseudoElement: RIM \}\)/);
    expect(f).toMatch(/if \(b\.a\) return;/);
    expect(f).not.toMatch(/transform|var\(/);
  });
  it("it is the rim that breathes, never the frame: the frame's ::before draws the rim and shadow, and the frame none", () => {
    expect(MOTION).toMatch(/const RIM = "::before";/);
    expect(fnOf("toRest")).toMatch(/pseudoElement: RIM/);
    expect(fnOf("breathEnd")).toMatch(/const at = still\(frame, b\);\s*toRest\(frame, b, \{ s: at\.s, o: 0 \}, PRESS\.ms\);/);
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

/* Query card v163, Phase 2 — the rim layer and the breath in the stage's colour (source half; the computed half is
   tests/e2e/qc163.measure.ts) */
describe("Query card v163 — the rim layer breathes in the stage's colour", () => {
  const fnOf = (name: string) => code(MOTION).match(new RegExp(`(?:export )?function ${name}\\([\\s\\S]*?\\n}`))?.[0] ?? "";
  const css = read("./qcv152card.css");
  const rule = (sel: string) => css.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&")} \\{[^}]*\\}`))?.[0] ?? "";
  it("the ring: over the 7px border, masked to it in both forms, no pointer events, no layout", () => {
    /* Agent card v2.1 — re-pointed: the rule also covers the agent card's frame, whose width and radius are its own
       variables; the query card's are the defaults (7px, 20px) */
    const r = rule(".spanel > .qc163-rim, .cl262-card.acv2 > .qc163-rim");
    expect(r).toMatch(/position: absolute; inset: 0;/);
    expect(r).toMatch(/padding: var\(--qc163-rim-w, 7px\); border-radius: var\(--qc163-rim-r, 20px\);/);
    expect(css).not.toMatch(/\.spanel[^{]*\{[^}]*--qc163-rim-[wr]:/);
    expect(r).toMatch(/pointer-events: none; overflow: hidden;/);
    expect(r).toMatch(/-webkit-mask: linear-gradient\(#000 0 0\) content-box, linear-gradient\(#000 0 0\);/);
    expect(r).toMatch(/-webkit-mask-composite: xor;/);
    expect(r).toMatch(/mask: linear-gradient\(#000 0 0\) content-box exclude, linear-gradient\(#000 0 0\);/);
    expect(rule(".spanel > .qc163-rim > i, .cl262-card.acv2 > .qc163-rim > i")).toMatch(/width: 920px; height: 920px; translate: -50% -50%; opacity: 0;/);
    expect(rule(".spanel > .qc163-rim > b, .cl262-card.acv2 > .qc163-rim > b")).toMatch(/inset: 0; opacity: 0;/);
    const f = fnOf("rimOf");
    expect(f).toMatch(/ring\.setAttribute\("aria-hidden", "true"\);/);
    expect(f).toMatch(/frame\.append\(ring\);/);
  });
  it("the tint breathes with the paper: same keyframe clock (one startTime), 0 → 0.72 → 0, the current stage's rim", () => {
    expect(MOTION).toMatch(/export const RIM163 = \{ peak: 0\.72, holdMs: 280, fadeMs: 700, backMs: 150 \} as const;/);
    const f = fnOf("breathStart");
    expect(f).toMatch(/tint\.style\.background = rimColours\(frame\)\.rim;/);
    /* Agent card v2.1 — re-pointed: the colour is `rimColours`, which is the stage's `rim` unless the frame names its own */
    expect(fnOf("rimColours")).toMatch(/if \(rim && rimHi\) return \{ rim, rimHi \};\s*return STAGE_COLOURS\[stageAt\(frame\)\];/);
    expect(f).toMatch(/const rim = ring\.animate\(sk, t\);/);
    expect(f).toMatch(/tint\.animate\(\[\{ opacity: 0 \}, \{ opacity: RIM163\.peak \}, \{ opacity: 0 \}\], t\)/);
    expect(f).toMatch(/glow\.id = "qc163-tint";/);
    expect(f).toMatch(/b\.a = \[paper, rim, glow\];\s*sync\(b\.a\);/);
    expect(fnOf("sync")).toMatch(/for \(const a of list\) a\.startTime = t0;/);
    expect(read("./QcCard152.tsx")).toMatch(/data-qc152="card"[^>]*data-qc163-stage=\{stage\}/);
  });
  it("nothing in the breath animates anything but scale and opacity, and no var() or color-mix() in it", () => {
    for (const n of ["breathStart", "toRest", "still", "rimOf"]) {
      const f = fnOf(n);
      expect([n, /transform|box-?[sS]hadow|var\(|color-mix/.test(f)]).toEqual([n, false]);
    }
  });
});

/* Query card v163, Phase 3 — the press holds the tint; the landing fades it and runs the light once round (source half;
   the computed half is tests/e2e/qc163.measure.ts) */
describe("Query card v163 — the press, the landing light, the pop and the sink", () => {
  const fnOf = (name: string) => code(MOTION).match(new RegExp(`(?:export )?function ${name}\\([\\s\\S]*?\\n}`))?.[0] ?? "";
  it("at the press the tint rises to 0.72 over 280ms, ease-out, and holds (fill forwards), in the stage of the press", () => {
    const f = fnOf("tintHold");
    expect(f).toMatch(/tint\.style\.background = rimColours\(frame\)\.rim;/);
    /* Agent card v2.1 — re-pointed: the colour is `rimColours`, which is the stage's `rim` unless the frame names its own */
    expect(fnOf("rimColours")).toMatch(/if \(rim && rimHi\) return \{ rim, rimHi \};\s*return STAGE_COLOURS\[stageAt\(frame\)\];/);
    expect(f).toMatch(/tint\.animate\(\[\{ opacity: from \}, \{ opacity: RIM163\.peak \}\], \{ duration: RIM163\.holdMs, easing: "ease-out", fill: "forwards" \}\)/);
    expect(f).toMatch(/h\.id = "qc163-tint-hold";/);
  });
  it("nothing landed: the tint eases to 0 over 150ms and no light is made", () => {
    expect(fnOf("pressBack")).toMatch(/tintBack\(frame\);/);
    const f = fnOf("tintBack");
    expect(f).toMatch(/tint\.animate\(\[\{ opacity: o \}, \{ opacity: 0 \}\], \{ duration: RIM163\.backMs, easing: "ease-out" \}\)/);
    expect(f).not.toMatch(/light/);
  });
  it("the landing: the tint fades 0.72 → 0 over 700ms; the light runs one lap in the stage the card is in now, mirrored and backwards on an undo; all held with the landing", () => {
    expect(MOTION).toMatch(/LIGHT = \{ ms: 1300, ease: "cubic-bezier\(0\.4, 0\.05, 0\.25, 1\)", from: -40, to: 320, inAt: 0\.14, outAt: 0\.76 \}/);
    const f = fnOf("landRim");
    expect(f).toMatch(/tint\.animate\(\[\{ opacity: RIM163\.peak \}, \{ opacity: 0 \}\], \{ duration: RIM163\.fadeMs, easing: "ease-out", fill: "forwards" \}\)/);
    expect(f).toMatch(/const c = rimColours\(frame\);/);
    expect(f).toMatch(/conic-gradient\(from 0deg, transparent 0 58%, \$\{c\.rim\} 84%, \$\{c\.rimHi\} 93%, transparent 100%\)/);
    expect(f).toMatch(/const back = kind === "undo";/);
    expect(f).toMatch(/light\.style\.scale = back \? "-1 1" : "1 1";/);
    expect(f).toMatch(/const turn = \(d: number\) => `\$\{back \? -d : d\}deg`;/);
    expect(f).toMatch(/\{ rotate: turn\(LIGHT\.from\), opacity: 0 \}/);
    expect(f).toMatch(/\{ rotate: turn\(LIGHT\.to\), opacity: 0 \}/);
    expect(f.match(/made\.push\(park\(owner, /g)?.length).toBe(2);
  });
  it("a second landing ends the light and the tint at once, before anything new is made", () => {
    const f = code(MOTION).match(/export function bump[\s\S]*?\n}/)?.[0] ?? "";
    expect(f.indexOf("for (const x of landings.get(frame) ?? []) x.cancel();")).toBeGreaterThan(-1);
    expect(f.indexOf("for (const x of landings.get(frame) ?? []) x.cancel();")).toBeLessThan(f.indexOf("frame.animate("));
    expect(f).toMatch(/landings\.set\(frame, landRim\(frame, owner, kind, o\.light !== false\)\);/);
  });
  it("the new motion changes only opacity, rotate and scale; no var(), no color-mix(), no transform", () => {
    for (const n of ["tintHold", "tintBack", "landRim"]) {
      const f = fnOf(n);
      const props = [...f.matchAll(/\{ ([a-zA-Z]+): /g)].map((m) => m[1]).filter((k) => !["duration"].includes(k));
      expect([n, props.filter((k) => !["opacity", "rotate", "scale", "offset"].includes(k))]).toEqual([n, []]);
      expect([n, /transform|box-?[sS]hadow|var\(|color-mix/.test(f)]).toEqual([n, false]);
    }
  });
});
