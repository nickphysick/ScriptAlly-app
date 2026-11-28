/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.5 — the panel's source half: the "What's next" ring and its key (Phase 2), the folding sections
 * and "Stage reached" (Phase 3), the two counts around it (Phase 4). The rendered half (hover, focus, the arrow keys
 * in a real browser, the screens) is tests/e2e/qc172.measure.ts L18–L21.
 */
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../../../types";
import { row154 } from "./qc154.fixture";
import type { QcRow } from "../../../lib/qcSummary";
import * as L from "../../../lib/smart172";

const DIR = new URL("./", import.meta.url);
const read = (f: string) => { try { return readFileSync(new URL(f, DIR), "utf8"); } catch { return ""; } };
const load = async <T,>(f: string): Promise<T | null> => { try { return (await import(/* @vite-ignore */ f)) as T; } catch { return null; } };

const DAY = 86_400_000;
const NOW = new Date("2026-11-27T12:00:00Z").getTime();
let n = 0;
const at = (status: QueryStatus, court: string, extra: Record<string, unknown> = {}): QcRow =>
  ({ ...row154(status, court, { stageStartMs: NOW - 5 * DAY, furthest: "queried", ...extra }), id: `r${++n}` } as QcRow);
const req = () => at(QueryStatus.FULL_REQUESTED, "you", { expectedMs: NOW + 6 * DAY });
const nudge = () => at(QueryStatus.QUERIED, "agent", { expectedMs: NOW - 3 * DAY, stageStartMs: NOW - 60 * DAY });
const nodate = () => at(QueryStatus.QUERIED, "agent", { expectedMs: null, stageStartMs: NOW - 5 * DAY });
const close = () => at(QueryStatus.QUERIED, "agent", { expectedMs: null, stageStartMs: NOW - 120 * DAY });
const win = () => at(QueryStatus.QUERIED, "agent", { expectedMs: NOW + 20 * DAY });
const shut = () => at(QueryStatus.REJECTED, "closed", { expectedMs: null });
/* no offer: a part with 0 drops out. 3 requested · 1 nudge · 2 no date · 1 close = 7 need you; 4 in their window; 2 closed */
const ROWS = [req(), req(), req(), nudge(), nodate(), nodate(), close(), win(), win(), win(), win(), shut(), shut()];
const ctx: L.Ctx172 = { nowMs: NOW, pkg: () => "Nothing recorded", stars: () => 0, country: () => "" };

type Panel = typeof import("./QcSmart172");
const render = async (s: L.Smart172 = L.EMPTY172) => {
  const m = await load<Panel>("./QcSmart172");
  expect(m).toBeTruthy();
  const showing = ROWS.filter((r) => L.pass172(r, s, ctx)).length;
  const P = m!.QcSmart172;
  return renderToStaticMarkup(<P rows={ROWS} ctx={ctx} showing={showing} total={ROWS.length} s={s} onChange={() => {}} onClear={() => {}} />);
};
const keyRows = (html: string) => [...html.matchAll(/<button type="button" class="qs172-rb"[^>]*data-k="([a-z]+)"[^>]*>.*?<em>(\d+)<\/em><\/button>/g)].map((m) => [m[1], +m[2]] as const);
const arcs = (html: string) => [...html.matchAll(/<circle[^>]*class="arc[^"]*"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);
const centre = (html: string) => { const m = html.match(/class="big"[^>]*>([^<]*)<\/text><text[^>]*class="sub"[^>]*>([^<]*)<\/text>/); return m ? `${m[1]} / ${m[2]}` : ""; };

describe("v172.5 · 2 the ring replaces the three counts and the Include closed tick", () => {
  it("“What’s next” is the panel's top block; no three-count control, no Include closed tick", async () => {
    const html = await render();
    expect(html).toMatch(/<section class="qs172-s qs172-ring"[^>]*>.*What’s next/);
    expect(html).not.toMatch(/qs172-seg|Include closed/);
  });
  it("the key: Action needed (its parts indented), No action needed, Closed — the parts' counts sum to the total", async () => {
    const k = keyRows(await render());
    expect(k).toEqual([["act", 7], ["req", 3], ["nudge", 1], ["nodate", 2], ["close", 1], ["wait", 4], ["closed", 2]]);
    const parts = k.filter(([key]) => key !== "act");
    expect(parts.reduce((t, [, c]) => t + c, 0)).toBe(ROWS.length);
  });
  it("a part with 0 is absent from the key and the ring", async () => {
    const html = await render();
    expect(html).not.toMatch(/Offer to answer/);
    expect(arcs(html)).toEqual(["Materials requested: 3", "Nudge due: 1", "Reply date needed: 2", "Consider closing: 1", "No action needed: 4", "Closed: 2"]);
  });
  it("each ring segment is a focusable button with its name and count", async () => {
    const html = await render();
    const seg = html.match(/<circle[^>]*class="arc[^"]*"[^>]*aria-label="Materials requested: 3"[^>]*>/)?.[0] ?? "";
    expect(seg).toMatch(/tabindex="0"/);
    expect(seg).toMatch(/role="button"/);
    expect(seg).toMatch(/aria-pressed="false"/);
  });
  it("at rest the centre reads the Action needed count over “need you”", async () => {
    expect(centre(await render())).toBe("7 / need you");
  });
  it("picking “Materials requested” from rest leaves only its rows, the centre reads “3 / of 13”; picking it again shows everything", async () => {
    const s = { ...L.EMPTY172, ...L.pickPart172(L.EMPTY172, "req") };
    expect(ROWS.filter((r) => L.pass172(r, s, ctx)).every((r) => L.stand172(r, NOW) === "req")).toBe(true);
    expect(ROWS.filter((r) => L.pass172(r, s, ctx))).toHaveLength(3);
    const html = await render(s);
    expect(centre(html)).toBe("3 / of 13");
    expect(html).toMatch(/aria-label="Materials requested: 3" aria-pressed="true"|aria-pressed="true"[^>]*aria-label="Materials requested: 3"/);
    expect({ ...s, ...L.pickPart172(s, "req") }).toEqual(L.EMPTY172);
  });
  it("after the first pick, each pick adds or takes away; a group heading picks its parts", () => {
    const a = { ...L.EMPTY172, ...L.pickPart172(L.EMPTY172, "req") };
    const b = { ...a, ...L.pickPart172(a, "closed") };
    expect(b.closed).toBe(true);
    expect(b.hide).not.toContain("req");
    expect({ ...b, ...L.pickPart172(b, "req") }.hide).toContain("req");
    expect(L.pickPart172(L.EMPTY172, "act")).toEqual({ hide: ["window"], closed: false });
  });
  it("the arrow keys move between segments (wrapping); Enter and Space pick", async () => {
    const m = await load<Panel>("./QcSmart172");
    const key = m?.ringKey172;
    expect(typeof key).toBe("function");
    expect(key!("ArrowRight", 0, 6)).toBe(1);
    expect(key!("ArrowDown", 5, 6)).toBe(0);
    expect(key!("ArrowLeft", 0, 6)).toBe(5);
    expect(key!("ArrowUp", 3, 6)).toBe(2);
    expect(key!("Enter", 2, 6)).toBe("pick");
    expect(key!(" ", 2, 6)).toBe("pick");
    expect(key!("a", 2, 6)).toBeNull();
  });
  it("the ring's geometry and colours: r 40, stroke 14, 132px, navy family light to dark", () => {
    const css = read("qcv172.css"), src = read("QcSmart172.tsx");
    expect(src).toMatch(/const R = 40/);
    expect(src).toMatch(/GAP = [^;]*2\.2/);
    expect(css).toMatch(/\.qs172-rsvg \{[^}]*width: 132px; height: 132px/);
    expect(css).toMatch(/\.qs172-rsvg \.arc \{[^}]*stroke-width: 14/);
    for (const c of ["#1c130f", "#2a3a52", "#5c6d88", "#7d8aa0", "#a3adbf", "#dce1e8", "#efeae3"]) expect(src).toContain(c);
  });
});
