/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v2 and v3, phase 2 — the frame (drawWorld), drawn in node from the engine. The rendered checks
 * are phase 4's measurement (tests/e2e/phoneBirdsWorld.measure.ts).
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../../../types";
import type { EyeRow } from "../../../lib/qcBirdsEye";
import type { QcRow } from "../../../lib/qcSummary";
import { DAY, bwRow, fadedBand, makeWorld, rowSegs, sampleRows, zoomForRows, type BwFilter, type BwRow, type BwView } from "../../../lib/birdsWorld";
import { QUIET_FADE, drawWorld, hatchAt, esc, segBg } from "./drawWorld";

const NOW = new Date(2026, 10, 25, 12).getTime();
const T0 = new Date(2026, 10, 25).getTime();
const Q = QueryStatus;
function eye(id: string, spans: [QueryStatus, number][], due: number | null, name = `Agent ${id}`): EyeRow {
  const status = spans[spans.length - 1][0];
  const row = {
    id, agentName: name, agency: "Hale & Finch", status, expectedMs: due == null ? null : T0 + due * DAY, expectedKind: due == null ? null : "reply",
    stageStartMs: T0 + spans[spans.length - 1][1] * DAY, sentMs: T0 + spans[0][1] * DAY, lastMs: T0,
    history: { spans: spans.map(([s, d], i) => ({ status: s, startMs: T0 + d * DAY, endMs: null, current: i === spans.length - 1 })), currentStartMs: 0, dated: true },
  } as unknown as QcRow;
  return { id, row, court: "agent" } as unknown as EyeRow;
}
const ROWS: BwRow[] = [
  bwRow(eye("three", [[Q.QUERIED, -90], [Q.PARTIAL_REQUESTED, -60], [Q.PARTIAL_SENT, -57], [Q.FULL_SENT, -30]], 40, "Eleanor <Voss>"), NOW),
  bwRow(eye("past", [[Q.QUERIED, -80]], -20), NOW),
  bwRow(eye("quiet", [[Q.QUERIED, -120]], -70), NOW),
  bwRow(eye("nodate", [[Q.QUERIED, -15]], null), NOW),
  bwRow(eye("closed", [[Q.QUERIED, -100], [Q.REJECTED, -50]], null), NOW, true),
  /* enough rows that the fitted overview's rows are thin, as a real campaign's are */
  ...Array.from({ length: 30 }, (_, i) => bwRow(eye(`f${i}`, [[Q.QUERIED, -10 - i * 4]], -10 - i * 4 + 42), NOW)),
];
const O = (o: Partial<Parameters<typeof drawWorld>[2]> = {}) => ({ nowMs: NOW, quietDays: 42, rt: null, rows: ROWS, ...o });
const world = (f: BwFilter = "all", rows = ROWS, folded?: Set<string>) => makeWorld({ rows, filter: f, vpW: 390, vpH: 784, bot: 88, folded });
/** zoomed to `rp` px rows, the line at 74% across, with row `id` at y 300 */
function at(rp: number, id = "three", f: BwFilter = "all", o: Partial<Parameters<typeof drawWorld>[2]> = {}) {
  const w = world(f), z = zoomForRows(w, rp), y = w.G.flatMap((g) => g.rows).find((p) => p.r.id === id)!.y;
  const S: BwView = w.clamp({ z, ox: 390 * 0.74 - w.LINE * w.SX(z), oy: 300 - w.yOff(y, z) });
  return { w, S, f: drawWorld(w, S, O(o)) };
}
const tags = (html: string, bw: string) => [...html.matchAll(new RegExp(`<[^>]*data-bw="${bw}"[^>]*>`, "g"))].map((m) => m[0]);
const num = (tag: string, prop: string) => Number(new RegExp(`${prop}:(-?[\\d.]+)px`).exec(tag)?.[1] ?? NaN);

describe("Phone Birds-eye world — the frame", () => {
  it("fitted is bars only: no names, figures, gridlines, ticks or edge fades; the pill reads Today", () => {
    const w = world(), f = drawWorld(w, w.fitView(), O());
    expect(f.zoomed).toBe(false);
    expect(tags(f.html, "bar").length).toBeGreaterThan(0);
    for (const k of ["name", "fig", "grid", "tick", "fade", "ndset"]) expect(tags(f.html, k)).toEqual([]);
    expect(f.html).toMatch(/data-bw="pill"[^>]*>Today</);
    expect(f.html).toMatch(/data-bw="ruler" data-tier="months"/);
  });
  it("names in the bar from 18px; agency and each stage's words from 34px; user text escaped", () => {
    const one = at(27).f.html, two = at(48).f.html;
    expect(tags(one, "name").length).toBeGreaterThan(0);
    expect(one).not.toMatch(/class="bw-bar[^"]*tx2/);
    expect(two).toMatch(/class="bw-bar[^"]*tx tx2"[^>]*>(<span[^>]*><\/span>)?<b>(Queried|Partial asked|Partial sent|Full sent)<\/b>/);
    expect(two).toContain("Eleanor &lt;Voss&gt;");
    expect(two).toMatch(/<small>Hale &amp; Finch<\/small>/);
    expect(two).not.toContain("Eleanor <Voss>");
  });
  it("earlier stages are faded; the current stage runs straight on into its tail with no gap; a tick on the reply date", () => {
    const { f } = at(48);
    const bars = tags(f.html, "bar").filter((t) => t.includes('data-row="three"'));
    expect(bars.find((t) => t.includes('data-cur="0"'))!).toContain(`background:${fadedBand(Q.QUERIED)}`);
    const cur = bars.find((t) => t.includes('data-k="stage"') && t.includes('data-cur="1"'))!, tail = bars.find((t) => t.includes('data-k="ahead"'))!;
    expect(Math.abs(num(cur, "left") + num(cur, "width") - num(tail, "left"))).toBeLessThan(0.02);
    expect(segBg(rowSegs(ROWS[0], 42)[3])).not.toContain("inset 0 0 0 1px");
    expect(tags(f.html, "tick").length).toBeGreaterThan(0);
  });
  it("past its date: hatched from an \"!\" at the reply date; gone quiet fades out; a plain dot on thin rows", () => {
    const { f } = at(48, "quiet");
    const q = tags(f.html, "bar").filter((t) => t.includes('data-row="quiet"'));
    expect(q.map((t) => /data-k="(\w+)"/.exec(t)![1])).toEqual(["stage", "past", "quiet"]);
    expect(q[1]).toContain("repeating-linear-gradient(135deg");
    /* v3.3 (Nick): gone quiet stays hatched — the same hatching and edge lines, under a mask from full to 8% at today;
       no solid fill after the "!", and only one "!" (on the past stretch) */
    expect(q[2]).toContain("repeating-linear-gradient(135deg");
    expect(q[2]).toContain("mask-image:linear-gradient(90deg,#000,rgba(0,0,0,0.08))");
    expect(q[2]).toMatch(/box-shadow:inset 0 1px 0 [^,]+,inset 0 -1px 0 /);
    expect(q[2]).not.toMatch(/background:(linear-gradient\(90deg|color-mix|#)/);
    expect(QUIET_FADE).toBe("linear-gradient(90deg,#000,rgba(0,0,0,0.08))");
    /* the stripes continue across the hatched and quiet stretches: each is phased by its own left / √2 (mod 7px) */
    const stop0 = (h: string) => Number(/135deg,[^ ]+ (-?[\d.]+)px/.exec(h)![1]);
    expect(stop0(hatchAt("Queried", 0))).toBe(0);
    for (const a of [10, 37.5, 200]) expect(stop0(hatchAt("Queried", a))).toBeCloseTo(-(((a / Math.SQRT2) % 7) + 7) % 7, 3);
    expect(q[1]).toContain(hatchAt(String(/data-st="([^"]+)"/.exec(q[1])?.[1] ?? "Queried"), num(q[1], "left")).split(" ")[0]);
    const mark = (/<i class="bw-ovd[^"]*" data-bw="mark"[^>]*>/.exec(f.html.slice(f.html.indexOf(q[1]) + q[1].length)) ?? [""])[0];
    expect(Math.abs(num(mark, "left") - num(q[1], "left"))).toBeLessThan(0.02);
    const w = world();
    /* fitted, the mark is a plain dot only where it is under 11px; polish v1's thicker bars make most fitted marks "!" */
    const fm = /class="bw-ovd( dot)?" data-bw="mark"[^>]*--s:([\d.]+)px">(!?)<\/i>/.exec(drawWorld(w, w.fitView(), O()).html)!;
    expect(fm).not.toBeNull();
    expect([!!fm[1], fm[3]]).toEqual(Number(fm[2]) < 11 ? [true, ""] : [false, "!"]);
  });
  it("v3 calmer: no figure pills at any zoom; edge fades when zoomed in; gridlines only at rows of 44px or more", () => {
    for (const rp of [27, 40, 48]) for (const id of ["past", "closed", "three"]) expect(tags(at(rp, id).f.html, "fig")).toEqual([]);
    const months = at(40).f, weeks = at(48).f;
    expect(tags(months.html, "fade").length).toBe(2);
    expect(tags(months.html, "grid")).toEqual([]);
    expect(tags(weeks.html, "grid").length).toBeGreaterThan(0);
    expect(drawWorld(world(), world().fitView(), O({ rt: -40 })).html).not.toContain('data-bw="fade"');
  });
  it("v3 headings: chevron, bold title and count, each a fold target; folded, the count stays and the rows go", () => {
    const w = world(), html = drawWorld(w, w.fitView(), O()).html;
    expect(html).toMatch(/<span class="bw-gh0 u[^"]*" data-bw="group" data-t="Needs action" data-g="Needs action" data-n="\d+" data-folded="0"[^>]*><span class="ghu tapf" data-a="fold" data-g="Needs action" data-bw="fold" role="button" aria-expanded="true"><svg class="chev"/);
    const f = world("all", ROWS, new Set(["Needs action"])), fh = drawWorld(f, f.fitView(), O()).html;
    expect(fh).toMatch(/data-t="Needs action" data-g="Needs action" data-n="(\d+)" data-folded="1"[\s\S]*?<svg class="chev shut"/);
    expect(fh).not.toContain('data-id="past"');
    expect(Number(/data-t="Needs action" data-g="Needs action" data-n="(\d+)"/.exec(fh)![1])).toBe(Number(/data-t="Needs action" data-g="Needs action" data-n="(\d+)"/.exec(html)![1]));
  });
  it("v3 headings never touch: with every group folded, each heading sits its height + 12px below the one above", () => {
    const all = new Set(["Needs action", "Within their window", "No reply date yet", "Closed"]);
    for (const rows of [ROWS, sampleRows()]) {
      const w = world("all", rows, all), html = drawWorld(w, w.fitView(), O({ rows })).html;
      const tops = tags(html, "group").map((t) => ({ top: num(t, "top"), small: /bw-gh0 u sm/.test(t) }));
      expect(tops.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < tops.length; i++) expect(tops[i].top - tops[i - 1].top).toBeGreaterThanOrEqual((tops[i - 1].small ? 22 : 28) + 12 - 0.01);
    }
  });
  it("v3 no reply date yet: its own group; the bar to today, then the dashed fade; zoomed in, the name and the chip", () => {
    const w = world(), html = drawWorld(w, w.fitView(), O()).html;
    expect(html).toMatch(/data-t="No reply date yet" data-g="No reply date yet" data-n="1"/);
    expect(html).toMatch(/data-bw="bar" data-k="nodate"[^>]*data-row="nodate"/);
    expect(html).toMatch(/data-bw="ndt" data-row="nodate"/);
    expect(world("chase").G.some((g) => g.t === "No reply date yet")).toBe(false);
    const z = at(48, "nodate").f.html;
    expect(z).toMatch(/data-bw="ndset" data-a="ndset" data-id="nodate"[^>]*>\+ Add reply date</);
    const chip = tags(z, "ndset")[0];
    expect(num(chip, "left")).toBeLessThanOrEqual(390 - 150 + 0.01);
  });
  it("v3 the scrubber: its line, its day on the ruler, and what each named row was doing then", () => {
    const { w, S } = at(48, "three");
    const x = S.ox + (-58 - w.ext.D0) * w.PPD * w.SX(S.z);
    const f = drawWorld(w, S, O({ scrub: x }));
    expect(f.scrubDay).toBe(-58);
    expect(f.html).toContain('data-bw="scrub"');
    expect(f.html).toMatch(/data-bw="scrub-pill"[^>]*><b>28 Sep<\/b><\/div>/);
    expect(f.html).toMatch(/data-bw="scrub-label"[^>]*>Partial asked<\/span>/);
    const fit = drawWorld(w, w.fitView(), O({ scrub: 200 }));
    expect(fit.html).toMatch(/data-bw="scrub-pill"[^>]*><b>[^<]+<\/b> · \d+ out<\/div>/);
  });
  it("v3 the glow and the change's day", () => {
    const f = at(48, "three", "all", { glow: { id: "three", d: -30 } }).f.html;
    expect(f).toContain('data-bw="glow"');
    expect(f).toContain('data-bw="change"');
  });
  it("the ruler at the closest level (v3: Weeks, 42 days across — a date each Monday, 64px apart); the replay's pill shows its date", () => {
    const w = world(), z = w.maxZ, S = w.clamp({ z, ox: 390 * 0.6 - w.LINE * w.SX(z), oy: 200 });
    const f = drawWorld(w, S, O());
    expect(f.html).toMatch(/data-tier="1w"/);
    const marks = tags(f.html, "rm").map((t) => num(t, "left")).sort((a, b) => a - b);
    for (let i = 1; i < marks.length; i++) expect(marks[i] - marks[i - 1]).toBeGreaterThanOrEqual(64);
    const r = drawWorld(w, w.fitView(), O({ rt: -40 }));
    expect(r.label).toBe("16 Oct");
    expect(r.html).toMatch(/data-bw="pill"[^>]*>16 Oct</);
  });
  it("the sample campaign draws; esc escapes", () => {
    const s = sampleRows(), sw = makeWorld({ rows: s, filter: "all", vpW: 390, vpH: 784, bot: 88 });
    expect(drawWorld(sw, sw.fitView(), { nowMs: NOW, quietDays: 42, rt: null, rows: s }).html).toContain('data-bw="bar"');
    expect(esc(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("Birds-eye polish v1 §C — marks on the bars", () => {
  it("each partial or full request and each pass draws its mark at its date, at every zoom; none in the replay", () => {
    for (const rp of [0, 27, 40, 48]) {
      const { w, S, f } = rp ? at(rp, "three") : { w: world(), S: world().fitView(), f: drawWorld(world(), world().fitView(), O()) };
      const named = rp >= 24;
      const marks = tags(f.html, "evmark");
      /* "three" asked for a partial 60 days ago; "closed" passed 50 days ago */
      const p = marks.find((m) => /data-k="partial"/.test(m) && /data-row="three"/.test(m));
      const x = (d: number) => S.ox + w.wxd(d) * w.SX(S.z);
      if (p) {
        expect(num(p, "left")).toBeCloseTo(x(-60), 1);
        const s = num(p, "--s");
        expect(named ? s >= 16 && s <= 20 : s >= 11 && s <= 14).toBe(true);
        expect(p).toContain(named ? 'class="bw-evmk mat"' : 'class="bw-evmk mat sm"');
      }
      if (!rp) {
        expect(marks.some((m) => /data-k="partial"/.test(m))).toBe(true);
        expect(marks.some((m) => /data-k="pass"/.test(m) && /data-row="closed"/.test(m))).toBe(true);
        expect(marks.every((m) => { const s = num(m, "--s"); return s >= 11 && s <= 14; })).toBe(true);
      }
    }
    /* sizes: named max(16, min(20, bar + 2)); fitted max(11, min(14, bar + 3)) */
    const w48 = at(48, "three");
    for (const m of tags(w48.f.html, "evmark")) { const s = num(m, "--s"); expect(s >= 16 && s <= 20).toBe(true); }
    /* never during the replay */
    const w = world();
    expect(tags(drawWorld(w, w.fitView(), O({ rt: -20 })).html, "evmark")).toEqual([]);
  });
  it("materials are navy, a pass grey; the partial is the app's sample-pages icon, the pass a thumbs-down", () => {
    const html = drawWorld(world(), world().fitView(), O()).html;
    expect(html).toMatch(/class="bw-evmk mat sm"[^>]*data-k="partial"[^>]*><svg[^>]*><rect x="7\.5" y="5\.5" width="12" height="15\.5" rx="2"\/>/);
    expect(html).toMatch(/class="bw-evmk pass sm"[^>]*data-k="pass"[^>]*><svg[^>]*><path d="M17 14V2"\/>/);
  });
  it("a name never runs under a mark: it stops before the first, or sits after it and stops before the next", () => {
    let seen = 0;
    for (const rp of [27, 30, 34, 40, 48]) {
      const f = at(rp, "three").f.html;
      const marks = tags(f, "evmark").filter((m) => /data-row="three"/.test(m)).map((m) => ({ x: num(m, "left"), s: num(m, "--s") }));
      const nm = tags(f, "name").find((t) => /data-row="three"/.test(t) && /left:/.test(t));
      if (!nm) continue;
      const l = num(nm, "left"), r = l + num(nm, "max-width");
      if (marks.length) seen++;
      for (const m of marks) expect(r <= m.x - m.s / 2 || l >= m.x + m.s / 2).toBe(true);
    }
    expect(seen).toBeGreaterThan(0);
  });
});
