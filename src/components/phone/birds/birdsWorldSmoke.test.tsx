/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — Phone Birds-eye world v1 (BirdsWorld + drawWorld). See `src/test/pageSmoke.tsx` for why these exist.
 * The node environment has no layout, so the shell is rendered statically and each level's frame is drawn by calling
 * `drawWorld` directly at the row heights the measurement uses (30, 56, 84, 100). The rendered checks (fit, layers,
 * anchoring, the line off screen) are Phase 4's measurement, tests/e2e/phoneBirdsWorld.measure.ts.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { SMOKE_USER, renderPageSeededWith } from "../../../test/pageSmoke";
import { QueryStatus, SubmissionMethod } from "../../../types";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { V3Provider } from "../v3/V3Provider";
import { BirdsWorld } from "./BirdsWorld";
import { drawWorld, drawMini, esc } from "./drawWorldV1";
import { axisExt, bwGroups, bwRow, makeWorld, zoomForRows, type BwRow } from "../../../lib/birdsWorldV1";
import type { EyeRow } from "../../../lib/qcBirdsEye";
import type { QcRow } from "../../../lib/qcSummary";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const DAY = 86_400_000;
const iso = (d: number) => new Date(NOW + d * DAY).toISOString();
const P = (n: React.ReactNode) => <V3Provider on now={NOW}>{n}</V3Provider>;
const QS = (n: number) => ({
  agents: Array.from({ length: n }, (_, i) => ({ id: `ag${i}`, userId: SMOKE_USER.id, name: `Agent Number${i}`, agency: `Agency ${i}`, email: "", status: "Active", responseTimeWeeks: 1 + (i % 6) })),
  queries: Array.from({ length: n }, (_, i) => ({
    id: `qq${i}`, userId: SMOKE_USER.id, manuscriptId: "m1", agentId: `ag${i}`, packageId: "", personalisationNotes: "",
    status: i % 4 === 1 ? QueryStatus.PARTIAL_REQUESTED : QueryStatus.QUERIED, dateSent: iso(-10 - i * 9),
    sendMethod: SubmissionMethod.EMAIL, expectedSendDate: iso(-2 + i), materialsWanted: ["Query Letter"],
  })),
});
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

/* engine rows for the frame: a three-stage query, a short stage, one past its date, one undated */
const T0 = new Date(new Date(NOW).setHours(0, 0, 0, 0)).getTime();
function eye(id: string, spans: [QueryStatus, number][], due: number | null): EyeRow {
  const status = spans[spans.length - 1][0];
  const row = {
    id, agentName: `Agent <${id}>`, agency: "Hale & Finch", status, expectedMs: due == null ? null : T0 + due * DAY, expectedKind: due == null ? null : "reply",
    stageStartMs: T0 + spans[spans.length - 1][1] * DAY, sentMs: T0 + spans[0][1] * DAY,
    history: { spans: spans.map(([s, d], i) => ({ status: s, startMs: T0 + d * DAY, endMs: null, current: i === spans.length - 1 })), currentStartMs: 0, dated: true },
  } as unknown as QcRow;
  return { id, row, court: "agent" } as unknown as EyeRow;
}
const Q = QueryStatus;
const ROWS: BwRow[] = [
  eye("three", [[Q.QUERIED, -90], [Q.PARTIAL_REQUESTED, -60], [Q.PARTIAL_SENT, -57], [Q.FULL_SENT, -30]], 40),
  eye("past", [[Q.QUERIED, -80]], -20),
  eye("nodate", [[Q.QUERIED, -15]], null),
  /* enough rows that the fitted overview is under 22px a row, as a real campaign's is */
  ...Array.from({ length: 30 }, (_, i) => eye(`f${i}`, [[Q.QUERIED, -10 - i * 4]], -10 - i * 4 + 42)),
].map((e) => bwRow(e, NOW));
const world = (axis: "reply" | "calendar" = "reply") => makeWorld({ groups: bwGroups(ROWS), ext: axisExt(ROWS, axis), vpW: 390, vpH: 784, bot: 88 });
/** zoomed to `rp` px rows, the line at 74% across (ref `zoomToRows`), scrolled so the first fixture rows are on screen */
const frameAt = (rp: number, axis: "reply" | "calendar" = "reply", id = "three") => {
  const w = world(axis), z = zoomForRows(w, rp);
  const y = w.G.flatMap((g) => g.rows).find((p) => p.r.id === id)!.y;
  const S = w.clamp({ z, ox: 390 * 0.74 - w.LINE * w.SX(z), oy: 300 - w.yOff(y, z) });
  return { w, S, f: drawWorld(w, S, { axis, nowMs: NOW, clip: null, sel: null }) };
};
const count = (html: string, re: RegExp) => html.match(re)?.length ?? 0;

describe("Phone Birds-eye world v1 renders", () => {
  it("the shell: the navy header, Birds-eye, the four count chips, the world's layer", () => {
    const html = renderPageSeededWith(P(<BirdsWorld onBack={() => {}} onList={() => {}} />), "/queries/all?view=birds", QS(12));
    expect(html).toContain('data-bw="world"');
    expect(html).toContain('data-bw="layer"');
    expect(html).toContain(">Birds-eye</h1>");
    for (const k of ["all", "past", "week", "you"]) expect(html).toMatch(new RegExp(`data-bw="chip" data-k="${k}" data-n="\\d+"`));
    expect(text(html)).toMatch(/\d+ out \d+ past its date \d+ this week \d+ with you/);
    expect(html).toContain('aria-label="Replay"');
    expect(html).toContain('aria-label="Search"');
    expect(html).toContain('data-axis="reply"');
    expect(text(html)).not.toMatch(/overdue|\blate\b/i);
  });
  it("arriving with &court= applies the nearest chip; ?be=calendar lines up on today", () => {
    const you = renderPageSeededWith(P(<BirdsWorld court="you" onBack={() => {}} onList={() => {}} />), "/queries/all?view=birds&court=you", QS(12));
    expect(you).toContain('data-filter="you"');
    expect(you).toMatch(/class="bw-c2 on" aria-pressed="true" data-bw="chip" data-k="you"/);
    expect(you).toContain('data-bw="fon"');
    const agent = renderPageSeededWith(P(<BirdsWorld court="agent" onBack={() => {}} onList={() => {}} />), "/queries/all?view=birds&court=agent", QS(12));
    expect(agent).toContain('data-filter="all"');
    const cal = renderPageSeededWith(P(<BirdsWorld onBack={() => {}} onList={() => {}} />), "/queries/all?view=birds&be=calendar", QS(12));
    expect(cal).toContain('data-axis="calendar"');
  });
  it("Overview (fitted): bars only, the line and its pill, the ruler — no names, no figures", () => {
    const w = world(), f = drawWorld(w, w.fitView(), { axis: "reply", nowMs: NOW, clip: null, sel: null });
    expect(w.rowPx(1)).toBeLessThan(22);
    expect(f.html).toContain('data-bw="bar"');
    expect(f.html).toContain('data-bw="line"');
    expect(f.html).toMatch(/data-bw="pill"[^>]*>Reply due</);
    expect(f.html).toContain('data-bw="ruler"');
    expect(f.html).not.toContain('data-bw="name"');
    expect(f.html).not.toContain('data-bw="fig"');
    expect(count(f.html, /data-bw="group"/g)).toBeGreaterThanOrEqual(3);
    expect(f.zoomed).toBe(false);
  });
  it("each level adds its parts and keeps the earlier ones (30 · 56 · 84 · 100); never a stage chip", () => {
    const parts = (rp: number) => { const { f } = frameAt(rp); return { name: f.html.includes('data-bw="name"'), fig: f.html.includes('data-bw="fig"'), sub: f.html.includes('data-bw="sub"'), words: /class="bw-bar[^"]* tx"[^>]*>(?:<span[^>]*><\/span>)?<(b|small)>/.test(f.html), html: f.html }; };
    const a = parts(30), b = parts(56), c = parts(84), d = parts(100);
    expect([a.name, a.fig, a.sub, a.words]).toEqual([true, false, false, false]);
    expect([b.name, b.fig, b.sub, b.words]).toEqual([true, true, false, false]);
    expect([c.name, c.fig, c.sub, c.words]).toEqual([true, true, true, false]);
    expect([d.name, d.fig, d.sub, d.words]).toEqual([true, true, true, true]);
    for (const p of [a, b, c, d]) expect(p.html).not.toMatch(/chip|bw-pill|stage-pill/);
    /* the figure's number in the typewriter face, the unit in body text */
    expect(b.html).toMatch(/data-bw="fig"[^>]*><b>\d+<\/b> (wks|days?) (past|to go)<\/span>/);
    expect(frameAt(56, "reply", "nodate").f.html).toContain(">No date</span>");
    /* the sub line: "Reply by 21 Dec · agency"; user text escaped */
    expect(c.html).toMatch(/Reply by \d+ \w{3} · Hale &amp; Finch/);
    expect(c.html).toContain("Agent &lt;three&gt;");
    expect(c.html).not.toContain("Agent <three>");
  });
  it("Timeline: each stage carries its own words; the dashed part reads Reply by …; past its date is hatched", () => {
    const { f } = frameAt(100);
    expect(f.html).toMatch(/data-bw="bar" data-k="stage" data-st="Queried"[^>]*>(?:<span[^>]*><\/span>)?<b>Queried<\/b>/);
    expect(f.html).toMatch(/data-k="ahead"[^>]*><small>(Reply by )?\d+ \w{3}<\/small>/);
    expect(frameAt(100, "reply", "past").f.html).toMatch(/data-k="past"[^>]*background:repeating-linear-gradient\(135deg,#efe6d6 0 4px,#fff 4px 7px\)/);
    expect(f.html).not.toMatch(/data-k="(stage|past)"[^>]*background:[^;]*#(?!efe6d6|f1d9cf|e8c0af|b9c9da|d3deea|c5e0d8|eceae6|fff)[0-9a-f]{6}/i);
    expect(text(f.html)).not.toMatch(/overdue|\blate\b/i);
  });
  it("the calendar: the pill reads Today, months on the ruler, a tick on each reply date", () => {
    const { f } = frameAt(56, "calendar");
    expect(f.html).toMatch(/data-bw="pill"[^>]*>(← )?Today( →)?</);
    expect(f.html).toContain('class="bw-tick"');
    expect(f.html).toMatch(/class="bw-rm"[^>]*>(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)</);
  });
  it("panned past the line, the pill pins to the edge, outlined, with its arrow", () => {
    const w = world(), z = zoomForRows(w, 100);
    /* panned towards the past: the line is off to the right (the future side is shorter than a screen at this zoom) */
    const left = drawWorld(w, w.clamp({ z, ox: 99999, oy: 0 }), { axis: "reply", nowMs: NOW, clip: null, sel: null });
    expect(left.off).toBe(1);
    expect(left.html).toMatch(/class="bw-flab off"[^>]*>Reply due →</);
    expect(left.html).not.toContain('data-bw="line"');
  });
  it("the mini map draws the bars and a frame", () => {
    const { w, S } = frameAt(56);
    expect(drawMini(w, S, "reply")).toMatch(/<i style="left:[\d.]+px;width:[\d.]+px;top:[\d.]+px;background:#[0-9a-f]{6}"><\/i>[\s\S]*<b style=/);
    expect(esc(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
  it("source: the view redraws one layer per frame, never a CSS scale on the content", () => {
    const src = readFileSync("src/components/phone/birds/BirdsWorld.tsx", "utf8") + readFileSync("src/components/phone/birds/drawWorldV1.ts", "utf8");
    expect(src).toContain("requestAnimationFrame");
    expect(src).toContain("el.innerHTML = f.html");
    expect(src).not.toMatch(/scale\(\$\{[^}]*\}\)[^;]*bw-w|\.bw-w[^}]*transform/);
    const css = readFileSync("src/components/phone/birds/birdsWorld.css", "utf8");
    expect(css).toMatch(/\.bw-vp \{[^}]*touch-action: none/);
    expect(css).not.toMatch(/\.bw-w \{[^}]*transform/);
  });
});

describe("Phone Birds-eye world v1, phase 3 — movement, controls, the hawk", () => {
  const src = () => readFileSync("src/components/phone/birds/worldMotion.ts", "utf8");
  const view = () => readFileSync("src/components/phone/birds/BirdsWorld.tsx", "utf8");
  it("the shell carries the controls, the hint, the mini map and the hawk's shadow (and ?hawk=0 drops it)", () => {
    const html = renderPageSeededWith(P(<BirdsWorld onBack={() => {}} onList={() => {}} />), "/queries/all?view=birds", QS(12));
    for (const k of ["zin", "zout", "fit", "mini", "hint", "hawk"]) expect(html).toContain(`data-bw="${k}"`);
    expect(html).toContain("Pinch to zoom · drag to explore");
    expect(html).toContain(">See it all</button>");
    expect(html).toContain('src="/images/hawk-shadow.png?v=1"');
    expect(html).toContain('data-hawk="1"');
    const off = renderPageSeededWith(P(<BirdsWorld onBack={() => {}} onList={() => {}} />), "/queries/all?view=birds&hawk=0", QS(12));
    expect(off).not.toContain('data-bw="hawk"');
    expect(off).toContain('data-hawk="0"');
  });
  it("the hawk: .10 over the overview, gone by z 1.6, grows and softens, slides at 0.35x the pan, mirrored and turned -8deg", async () => {
    const { shadowStyle } = await import("./worldMotion");
    const fit = { z: 1, ox: 10, oy: 200 };
    expect(shadowStyle(1, 10, 200, fit)).toEqual({ opacity: "0.100", filter: "blur(1.5px)", transform: "translate(0.0px,0.0px) scale(1.000) rotate(-8deg) scaleX(-1)" });
    expect(shadowStyle(1.6, 10, 200, fit).opacity).toBe("0.000");
    expect(shadowStyle(1.3, 110, 100, fit).transform).toBe("translate(35.0px,-35.0px) scale(1.270) rotate(-8deg) scaleX(-1)");
    const css = readFileSync("src/components/phone/birds/birdsWorld.css", "utf8");
    expect(css).toMatch(/\.bw-hsw \{[^}]*z-index: 8;[^}]*width: 300px;[^}]*pointer-events: none;[^}]*animation: bw-hsdrift 14s ease-in-out infinite alternate/);
    expect(css).toMatch(/\.bw-hs \{[^}]*mix-blend-mode: multiply/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.bw-hsw \{ animation: none; \}/);
    /* the layers: hawk (8) over the header (7), the line (9), its pill (10) and the controls (11) over the hawk */
    const z = (sel: string) => Number(new RegExp(`${sel.replace(/\./g, "\\.")} \\{[^}]*z-index: (\\d+)`).exec(css)?.[1]);
    expect([z(".bw-gh0"), z(".bw-ruler"), z(".bw-hd"), z(".bw-hsw"), z(".bw-fline"), z(".bw .bw-flab"), z(".bw-zc")]).toEqual([4, 6, 7, 8, 9, 10, 11]);
  });
  it("movement is the ref's: pointer capture, pinch anchored on the row under the fingers, glide ×0.92, double tap ×2.2, Ctrl+wheel", () => {
    const m = src();
    expect(m).toContain("setPointerCapture");
    expect(m).toContain("pinch.wx * W.SX(z)");
    expect(m).toContain("W.yOff(pinch.wy, z)");
    expect(m).toContain("v.x * 0.92");
    expect(m).toContain("zoomAt(px, py, 2.2)");
    expect(m).toContain("Math.exp(-e.deltaY * 0.012)");
    expect(m).toMatch(/else if \(pan && pan\.moved && !c\.calm\(\)/);
    expect(m).toMatch(/if \(c\.calm\(\)\) \{ assign\(t\); c\.draw\(\); return; \}/);
  });
  it("a tap opens the Queries list's own query sheet; replay never runs with reduced motion; the hint has its own key", () => {
    const v = view();
    expect(v).toContain("openRow: (id) => openV3Query(id)");
    expect(v).toMatch(/if \(!w \|\| calm\(\)\) return;/);
    expect(v).toContain('BW_HINT_KEY = "bw1.hint.seen"');
    expect(v).not.toContain("firstTimeToday");
    expect(v).toContain("w.vpW * 0.62 - w.LINE * w.SX(Sv.z)");
  });
  it("the replay clips each row's stages at its front, in date order, and draws nothing past it", async () => {
    const { clipSegs } = await import("./drawWorldV1");
    const { rowSegs } = await import("../../../lib/birdsWorldV1");
    const segs = rowSegs(ROWS[0], "reply");
    const mid = clipSegs(segs, -58);
    expect(mid.every((s) => s.ca < -58 && s.cb <= -58)).toBe(true);
    expect(mid.length).toBe(2);
    expect(clipSegs(segs, -100)).toEqual([]);
    expect(clipSegs(segs, null)).toBe(segs);
  });
});
