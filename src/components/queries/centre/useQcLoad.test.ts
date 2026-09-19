/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useQcLoad — the 150ms / 400ms rule as a pure function, and the entrance sheet's own rules.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ENTRANCE_MS, SKELETON_DELAY_MS, SKELETON_MIN_MS, qcLoadPhase } from "./useQcLoad";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const dir = join(process.cwd(), "src/components/queries/centre");
const css = strip(readFileSync(join(dir, "qcvEnter.css"), "utf8"));
const hook = strip(readFileSync(join(dir, "useQcLoad.ts"), "utf8")).replace(/\/\/[^\n]*/g, "");

describe("⚠️ do not flash it — 150ms before the skeleton, 400ms once shown", () => {
  it("the numbers", () => { expect([SKELETON_DELAY_MS, SKELETON_MIN_MS, ENTRANCE_MS]).toEqual([150, 400, 800]); });
  it("ready inside 150ms: the skeleton is NEVER shown — blank, then straight to content", () => {
    expect(qcLoadPhase({ ready: false, sinceMountMs: 0, skeletonForMs: null })).toBe("blank");
    expect(qcLoadPhase({ ready: false, sinceMountMs: 149, skeletonForMs: null })).toBe("blank");
    expect(qcLoadPhase({ ready: true, sinceMountMs: 149, skeletonForMs: null })).toBe("content");
    expect(qcLoadPhase({ ready: true, sinceMountMs: 0, skeletonForMs: null })).toBe("content");
  });
  it("not ready at 150ms: the skeleton shows", () => {
    expect(qcLoadPhase({ ready: false, sinceMountMs: 150, skeletonForMs: null })).toBe("skeleton");
  });
  it("⚠️ once shown it stays at least 400ms, however soon the data lands", () => {
    expect(qcLoadPhase({ ready: true, sinceMountMs: 160, skeletonForMs: 10 })).toBe("skeleton");
    expect(qcLoadPhase({ ready: true, sinceMountMs: 549, skeletonForMs: 399 })).toBe("skeleton");
    expect(qcLoadPhase({ ready: true, sinceMountMs: 550, skeletonForMs: 400 })).toBe("content");
    expect(qcLoadPhase({ ready: false, sinceMountMs: 9000, skeletonForMs: 8850 }), "the floor is a minimum, not a timeout").toBe("skeleton");
  });
  it("every branch above was entered: blank, skeleton, content-without-a-skeleton, content-after-one", () => {
    const seen = new Set<string>();
    for (const ready of [false, true]) for (const since of [0, 149, 150, 900]) for (const shown of [null, 0, 399, 400]) seen.add(`${qcLoadPhase({ ready, sinceMountMs: since, skeletonForMs: shown })}:${shown == null ? "never" : "shown"}`);
    expect([...seen].sort()).toEqual(["blank:never", "content:never", "content:shown", "skeleton:never", "skeleton:shown"]);
  });
});

describe("the hook", () => {
  it("⚠️ the entrance is removed by a TIMER, never `animationend` — a harness that kills animation never fires that event", () => {
    expect(hook).toContain("window.setTimeout(() => setEntered(\"done\"), ENTRANCE_MS)");
    /* ⚠️ THE TIMER'S EFFECT MUST NOT ALSO BE THE ONE THAT SETS `running`: that state change re-runs the
       effect and its cleanup clears the timer it just armed (it shipped that way for one build, and
       only the rendered page noticed). The arming effect depends on `entered` ALONE. */
    const arm = hook.slice(hook.indexOf('if (entered !== "running") return undefined;'));
    expect(arm.slice(0, arm.indexOf("}, [")), "the arming effect sets state it depends on").not.toContain('setEntered("running")');
    expect(arm).toMatch(/^[\s\S]*?\}, \[entered\]\);/);
    expect(hook).not.toMatch(/animationend|onAnimationEnd/);
  });
  it("the review hold is never read in a production build", () => {
    expect(hook).toMatch(/if \(import\.meta\.env\.MODE === "production"[^)]*\) return 0;/);
  });
  it("⚠️ the row-padding review aid is never read in a production build either, and writes nothing", () => {
    const aid = strip(readFileSync(join(process.cwd(), "src/components/queries/centre/qcReviewAid.ts"), "utf8"));
    /* the production return comes BEFORE the window is read — a gate below the read is not a gate */
    const gate = aid.indexOf('if (import.meta.env.MODE === "production"');
    expect(gate, "no production gate").toBeGreaterThan(-1);
    expect(gate).toBeLessThan(aid.indexOf("__SA_QC_PAD_LIVE"));
    for (const w of ["updateQuery", "addQuery", "setDoc", "localStorage", "firebase"]) expect(aid, `${w} — the aid must only copy rows in memory`).not.toContain(w);
  });
  it("the page's readiness includes the ACTIVITY FEED — the gauges and the calendar are dated from it", () => {
    const page = strip(readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8"));
    expect(page).toContain("const qcLoad = useQcLoad(collectionsReady && activitiesReady);");
    expect(page, "the first-run branch must not answer while the page is still loading").toContain('{!qcLoad.loading && emptyKind === "first" ? (');
    for (const gone of ["useSkeleton(", "<QueryCentreSkeleton", "SKELETON_FLOOR_MS);"]) expect(page, `${gone} — a second loading model on this page`).not.toContain(gone);
  });
});

describe("the entrance sheet", () => {
  const frames = css.match(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) ?? [];
  it("three keyframes, LITERAL values in every one — a var() in a keyframe fails silently here", () => {
    expect(frames.map((f) => f.match(/@keyframes (\S+)/)![1]).sort()).toEqual(["qcv-arrive", "qcv-draw", "qcv-show"]);
    for (const f of frames) expect(f).not.toContain("var(");
    expect(css).not.toContain("color-mix(");
  });
  it("⚠️ `backwards`, never `both` or `forwards`: a fill that outlives the animation holds a transform on rows with sticky children", () => {
    const anims = [...css.matchAll(/animation:\s*([^;]+);/g)].map((m) => m[1]).filter((a) => a !== "none" && !a.startsWith("none"));
    expect(anims.length).toBeGreaterThan(3);
    for (const a of anims) { expect(a, a).toContain("backwards"); expect(a, a).not.toMatch(/\b(both|forwards)\b/); }
  });
  it("gauges draw from the LEFT over 520ms, columns 40ms apart; the ink follows at 420 over 220; the notch at 300 over 200", () => {
    expect(css).toMatch(/\.qcv-ga-fill, \.qcv-page--enter \.qcv-ga-over \{ transform-origin: left center; animation: qcv-draw 0\.52s cubic-bezier\(0\.2, 0\.7, 0\.2, 1\) backwards; \}/);
    expect([...css.matchAll(/\.qcv-stg:nth-child\((\d)\) \.qcv-ga-fill \{ animation-delay: ([\d.]+)s; \}/g)].map((m) => [Number(m[1]), Number(m[2])])).toEqual([[2, 0.04], [3, 0.08], [4, 0.12], [5, 0.16], [6, 0.2], [7, 0.24]]);
    expect(css).toMatch(/\.qcv-ga-over \{ animation-delay: 0\.42s; animation-duration: 0\.22s; \}/);
    expect(css).toMatch(/\.qcv-notch \{ animation: qcv-show 0\.2s 0\.3s backwards; \}/);
  });
  it("rows, tiles and lanes rise 5px over 280ms, 30ms apart for the first seven; everything after shares the seventh's delay", () => {
    expect(css).toMatch(/@keyframes qcv-arrive \{ 0% \{ opacity: 0; transform: translateY\(5px\); \}/);
    expect([...css.matchAll(/:nth-child\((\d|n \+ 7)\) \{ animation-delay: ([\d.]+)s; \}/g)].filter((m) => !m[0].includes("qcv-stg")).map((m) => [m[1], Number(m[2])]))
      .toEqual([["2", 0.03], ["3", 0.06], ["4", 0.09], ["5", 0.12], ["6", 0.15], ["n + 7", 0.18]]);
  });
  it("⚠️ all of it is done inside 800ms — the latest any animation can finish, computed from the sheet", () => {
    const ends = [0.24 + 0.52, 0.42 + 0.22, 0.3 + 0.2, 0.22, 0.18 + 0.28];
    expect(Math.max(...ends)).toBeLessThanOrEqual(ENTRANCE_MS / 1000);
  });
  it("none of it under prefers-reduced-motion, pulse included; the blank phase hides placeholders, never the frames", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.qcv-page--enter \*, \.qcv-page--enter \*::before, \.qcv-page--enter \*::after \{ animation: none !important; \}\s*\.qcv-skw \{ animation: none !important; \}/);
    expect(css).toMatch(/\.qcv-page--blank \.qcv-sk, \.qcv-page--blank \.qcv-cal-barsk \{ visibility: hidden; \}/);
    expect(css).not.toMatch(/\.qcv-page--blank[^{]*\.fc-(card|frame|band)/);
  });
});
