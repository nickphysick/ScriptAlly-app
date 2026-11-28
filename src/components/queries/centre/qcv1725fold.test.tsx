/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.5 — Phase 3: every section under the ring folds (Stage reached, Sent, Agent's reply date, Your
 * send-by date, More filters). Stage reached opens on a fresh visit, the rest start shut; a section with a filter set
 * opens itself on arrival; a shut body is inert. The animation is measured in tests/e2e/qc172.measure.ts L20.
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
const ROWS = [0, 30, 60, 90, 120].map((d, i) => ({ ...row154(QueryStatus.QUERIED, "agent", { sentMs: NOW - d * DAY, expectedMs: NOW + 20 * DAY }), id: `f${i}` } as QcRow));
const ctx: L.Ctx172 = { nowMs: NOW, pkg: () => "Nothing recorded", stars: () => 0, country: () => "" };
const render = async (s: L.Smart172 = L.EMPTY172) => {
  const m = await load<typeof import("./QcSmart172")>("./QcSmart172");
  expect(m).toBeTruthy();
  const P = m!.QcSmart172;
  return renderToStaticMarkup(<P rows={ROWS} ctx={ctx} showing={ROWS.length} total={ROWS.length} s={s} onChange={() => {}} onClear={() => {}} />);
};
/** a folding section's open state, its title and its value, by its data-fold id */
const sec = (html: string, id: string) => {
  const m = html.match(new RegExp(`<section class="qs172-s qs172-fold( is-shut)?" data-fold="${id}">(.*?)</section>`));
  if (!m) return null;
  const head = m[2].match(/<button type="button" class="qs172-ft" aria-expanded="(true|false)"><b>(?:<i[^>]*><\/i>)?([^<]+)<\/b><span class="qs172-fv">([^<]*)<\/span>/);
  return { shut: !!m[1], expanded: head?.[1], title: head?.[2], value: head?.[3], inert: /<div class="qs172-fb" inert=""/.test(m[2]) };
};

describe("v172.5 · 3 folding sections", () => {
  it("every section under the ring folds, in order: Stage reached, Sent, both dates, More filters", async () => {
    const html = await render();
    expect([...html.matchAll(/data-fold="([a-z]+)"/g)].map((m) => m[1])).toEqual(["stage", "sent", "date", "sendby", "more"]);
    expect(html).not.toMatch(/class="qs172-more/);
  });
  it("a fresh visit: Stage reached open; Sent shut with “any time” in its title", async () => {
    const html = await render();
    expect(sec(html, "stage")).toMatchObject({ shut: false, expanded: "true", title: "Stage reached", value: "any", inert: false });
    expect(sec(html, "sent")).toMatchObject({ shut: true, expanded: "false", title: "Sent", value: "any time" });
    expect(sec(html, "more")).toMatchObject({ shut: true, value: "none set" });
  });
  it("the shut body is inert", async () => {
    expect(sec(await render(), "sent")?.inert).toBe(true);
  });
  it("with the Sent range set, a fresh mount opens Sent, its value upright in the title", async () => {
    const html = await render({ ...L.EMPTY172, sent: [NOW - 70 * DAY, NOW] });
    expect(sec(html, "sent")).toMatchObject({ shut: false, expanded: "true", inert: false });
    expect(html).toMatch(/<div class="qs172-fh is-on"><button type="button" class="qs172-ft" aria-expanded="true"><b><i class="qs172-dot"[^>]*><\/i>Sent<\/b>/);
    expect(html).toMatch(/data-fold="sent">.*?<\/button><button type="button" class="qs172-rs">Reset<\/button>/);
  });
  it("open and shut animate 220ms; reduced motion is instant", () => {
    const css = read("qcv172.css");
    expect(css).toMatch(/\.qs172-fb \{[^}]*grid-template-rows: 1fr;[^}]*transition: grid-template-rows \.22s/);
    expect(css).toMatch(/\.qs172-fold\.is-shut \.qs172-fb \{[^}]*grid-template-rows: 0fr/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.qs172-fb, \.qs172-cv \{ transition: none; \} \}/);
  });
});
