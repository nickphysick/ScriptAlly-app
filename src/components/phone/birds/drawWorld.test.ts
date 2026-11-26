/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v2, phase 2 — the frame (drawWorld), drawn in node from the engine. The rendered checks are
 * phase 4's measurement (tests/e2e/phoneBirdsWorld.measure.ts).
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../../../types";
import type { EyeRow } from "../../../lib/qcBirdsEye";
import type { QcRow } from "../../../lib/qcSummary";
import { DAY, RH, bwRow, fadedBand, makeWorld, rowSegs, sampleRows, zoomForRows, type BwFilter, type BwRow, type BwView } from "../../../lib/birdsWorld";
import { drawMini, drawWorld, esc, segBg } from "./drawWorld";

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
const world = (f: BwFilter = "all", rows = ROWS) => makeWorld({ rows, filter: f, vpW: 390, vpH: 784, bot: 88 });
/** zoomed to `rp` px rows, the line at 74% across, with row `id` at y 300 */
function at(rp: number, id = "three", f: BwFilter = "all") {
  const w = world(f), z = zoomForRows(w, rp), y = w.G.flatMap((g) => g.rows).find((p) => p.r.id === id)!.y;
  const S: BwView = w.clamp({ z, ox: 390 * 0.74 - w.LINE * w.SX(z), oy: 300 - w.yOff(y, z) });
  return { w, S, f: drawWorld(w, S, O()) };
}
const tags = (html: string, bw: string) => [...html.matchAll(new RegExp(`<[^>]*data-bw="${bw}"[^>]*>`, "g"))].map((m) => m[0]);
const num = (tag: string, prop: string) => Number(new RegExp(`${prop}:(-?[\\d.]+)px`).exec(tag)?.[1] ?? NaN);

describe("Phone Birds-eye world v2 — the frame", () => {
  it("fitted is bars only: no names, figures, gridlines or ticks; the pill reads Today", () => {
    const w = world(), f = drawWorld(w, w.fitView(), O());
    expect(f.zoomed).toBe(false);
    expect(tags(f.html, "bar").length).toBeGreaterThan(0);
    for (const k of ["name", "fig", "grid", "tick"]) expect(tags(f.html, k)).toEqual([]);
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
  it("earlier stages are faded; the current stage runs straight on into its tail with no gap", () => {
    const { f } = at(48);
    const bars = tags(f.html, "bar").filter((t) => t.includes('data-row="three"'));
    const early = bars.find((t) => t.includes('data-cur="0"'))!;
    expect(early).toContain(`background:${fadedBand(Q.QUERIED)}`);
    const cur = bars.find((t) => t.includes('data-k="stage"') && t.includes('data-cur="1"'))!, tail = bars.find((t) => t.includes('data-k="ahead"'))!;
    expect(Math.abs(num(cur, "left") + num(cur, "width") - num(tail, "left"))).toBeLessThan(0.02);
    expect(cur).toContain('data-cont="1"');
    expect(segBg(rowSegs(ROWS[0], 42)[3])).not.toContain("inset 0 0 0 1px");
    /* not yet due: a navy tick on the reply date, "Reply by …" at the bar's end */
    expect(tags(f.html, "tick").length).toBeGreaterThan(0);
  });
  it("past its date: hatched from an \"!\" marker at the reply date; gone quiet fades out to today", () => {
    const { f } = at(48, "quiet");
    const q = tags(f.html, "bar").filter((t) => t.includes('data-row="quiet"'));
    expect(q.map((t) => /data-k="(\w+)"/.exec(t)![1])).toEqual(["stage", "past", "quiet"]);
    expect(q[1]).toContain("repeating-linear-gradient(135deg");
    expect(q[2]).toContain("linear-gradient(90deg");
    /* the marker is drawn straight after its hatching */
    const mark = (/<i class="bw-ovd[^"]*" data-bw="mark"[^>]*>/.exec(f.html.slice(f.html.indexOf(q[1]) + q[1].length)) ?? [""])[0];
    expect(mark).toBeTruthy();
    expect(Math.abs(num(mark, "left") - num(q[1], "left"))).toBeLessThan(0.02);
    expect(f.html).toMatch(/data-bw="mark"[^>]*>!<\/i>/);
    /* fitted, a plain dot with no glyph */
    const w = world();
    expect(drawWorld(w, w.fitView(), O()).html).toMatch(/class="bw-ovd dot" data-bw="mark"[^>]*><\/i>/);
  });
  it("figures only where they belong: past its date and the closed outcome — never time still to run", () => {
    const { f } = at(48, "past");
    const figs = tags(f.html, "fig").map((t) => t);
    expect(f.html).toMatch(/data-bw="fig"[^>]*><b>\d+<\/b> (days|wks) past<\/span>/);
    expect(f.html).not.toMatch(/to go/);
    const c = at(48, "closed").f.html;
    expect(c).toMatch(/data-bw="fig"[^>]*>Passed<\/span>/);
    expect(figs.length).toBeGreaterThan(0);
  });
  it("the name never runs under a figure (its box ends before the figure's)", () => {
    const { f } = at(48, "past");
    let pairs = 0;
    for (const g of tags(f.html, "fig")) {
      /* the same row's name: the one whose top is within the bar's height of the figure's */
      const n = tags(f.html, "name").find((t) => /left:/.test(t) && Math.abs(num(t, "top") - num(g, "top")) < 20);
      if (!n) continue;
      pairs++;
      /* the figure's own text gives its width (number 9px a character, unit 6.4, padding 22: the ref's estimate) */
      const inner = f.html.slice(f.html.indexOf(g) + g.length, f.html.indexOf("</span>", f.html.indexOf(g) + g.length));
      const nm = /<b>(\d+)<\/b>/.exec(inner)?.[1] ?? "", unit = inner.replace(/<b>\d+<\/b>\s*/, "");
      const figLeft = 390 - num(g, "right") - (nm.length * 9 + unit.length * 6.4 + 22);
      expect(num(n, "left") + num(n, "max-width")).toBeLessThanOrEqual(figLeft - 8 + 0.01);
    }
    expect(pairs).toBeGreaterThan(0);
  });
  it("the ruler: every day once a day is 24px wide, the month in a pill at the left; the replay's pill shows its date", () => {
    const w = world(), z = w.maxZ, S = w.clamp({ z, ox: 390 * 0.6 - w.LINE * w.SX(z), oy: 200 });
    const f = drawWorld(w, S, O());
    expect(f.html).toMatch(/data-tier="days"/);
    expect(f.html).toMatch(/data-bw="mon"[^>]*>(Nov|Dec|Oct)</);
    expect(tags(f.html, "grid").length).toBeGreaterThan(5);
    const days = tags(f.html, "rm").filter((t) => t.includes('data-day="1"')).map((t) => num(t, "left")).sort((a, b) => a - b);
    for (let i = 1; i < days.length; i++) expect(days[i] - days[i - 1]).toBeGreaterThanOrEqual(22);
    const r = drawWorld(w, w.fitView(), O({ rt: -40 }));
    expect(r.label).toBe("16 Oct");
    expect(r.html).toMatch(/data-bw="pill"[^>]*>16 Oct</);
    expect(tags(r.html, "fig")).toEqual([]);
  });
  it("no-date queries are footed, not drawn; Closed is drawn last under All", () => {
    const f = at(48, "three").f.html;
    expect(f).toContain('data-id="three"');
    expect(drawWorld(world(), world().fitView(), O()).html).toMatch(/data-bw="nodate"[^>]*>1 query has no reply date<b>Add dates<\/b>/);
    expect(world().G.map((g) => g.t).pop()).toBe("Closed");
    expect(drawWorld(world("chase"), world("chase").fitView(), O()).html).not.toContain('data-bw="nodate"');
  });
  it("the mini map and the sample campaign draw; esc escapes", () => {
    const { w, S } = at(48);
    expect(drawMini(w, S, 42)).toMatch(/<b style=/);
    const s = sampleRows(), sw = makeWorld({ rows: s, filter: "all", vpW: 390, vpH: 784, bot: 88 });
    expect(drawWorld(sw, sw.fitView(), { nowMs: NOW, quietDays: 42, rt: null, rows: s }).html).toContain('data-bw="bar"');
    expect(esc(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
    expect(RH).toBe(30);
  });
});
