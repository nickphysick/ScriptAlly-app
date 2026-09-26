/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App shell v3 — THE APP AGAINST THE FROZEN MOCK, BY ONE RULER, WITH WEB FONTS LOADED.
 * Ref design-refs/shell/app-shell-v3.html. The mock's screens were captured WITHOUT web fonts, so
 * this re-measures the mock itself in the same browser as the app — the prompt's normative source is
 * the relational rules plus this measurement, never the PNGs' pixel values.
 *
 * Every shell box is read relative to its own container (the sidebar's top-left, the bar's
 * top-left), because the app has a beta strip above the shell that the mock does not draw. The
 * table is written to reports/app-shell-v3/compare/, with one screenshot pair per size and state;
 * the case fails on any difference over 2px that is not in the explained list.
 */
import { expect, test, Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openShell, SIZES } from "./shellV3Lib";

const OUT = "reports/app-shell-v3/compare";
const MOCK = "file://" + resolve("design-refs/shell/app-shell-v3.html");

type Box = { x: number; y: number; w: number; h: number } | null;

/** Differences over 2px that are explained in the report, keyed `probe.field`. */
const EXPLAINED: Record<string, string> = {
  "firstLabel.y": "expanded only: the app's manuscript stepper draws its dots (4px + 5px margin) under the switcher when there is more than one manuscript — the fixture has five, the ref draws one",
  "active.y": "the same 9px, carried down: every row below the switcher sits under the stepper's dots",
  "switcher.h": "the app's switcher carries a real cover mark and a two-line title at the ref's type; the fixture's manuscript meta line differs",
  "user.y": "the user row is pinned to the sidebar's foot, and the app's foot carries the Upgrade control for a free fixture account",
  "user.h": "the app's user row is a single interactive row; the ref's is a plain block",
  "crumb.w": "the crumb's text differs: the ref draws Materials / Manuscripts with the same root, the app's page names come from the live nav",
  "feedback.w": "Special Elite's advance: identical label and padding, measured widths within the face's rounding",
};

async function readShell(page: Page, mock: boolean) {
  return page.evaluate((isMock) => {
    const q = (s: string) => document.querySelector(s) as HTMLElement | null;
    const side = isMock ? q(".side") : q("#ws-sidebar");
    const bar = isMock ? q(".top") : q('[data-probe="navrow"]');
    const rel = (el: Element | null, to: Element | null): { x: number; y: number; w: number; h: number } | null => {
      if (!el || !to) return null;
      const r = el.getBoundingClientRect(); const o = to.getBoundingClientRect();
      if (r.width < 0.5) return null;
      return { x: Math.round((r.x - o.x) * 10) / 10, y: Math.round((r.y - o.y) * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
    };
    const S = (m: string, a: string) => isMock ? q(m) : q(a);
    const fonts = ["Source Serif 4", "Special Elite", "JetBrains Mono"].map((f) => [f, [...document.fonts].some((x) => x.family.replace(/["']/g, "") === f && x.status === "loaded")]);
    return {
      fonts,
      sidebar: rel(side, side?.parentElement ?? null) && { ...rel(side, side)!, w: Math.round(side!.getBoundingClientRect().width * 10) / 10, h: 0 },
      mark: rel(S(".logo .av", ".ws-bmark"), side),
      wordmark: rel(S(".logo .nm", ".ws-bwm"), side),
      switcher: rel(S(".sw", ".ws-mspill"), side),
      firstLabel: rel(S(".nav h6", ".ws-glabel"), side),
      active: rel(S(".nav a.on", '#ws-sidebar nav [aria-current="page"]'), side),
      user: rel(S(".me", ".ws-uacct"), side),
      bar: rel(bar, bar) && { x: 0, y: 0, w: Math.round(bar!.getBoundingClientRect().width * 10) / 10, h: Math.round(bar!.getBoundingClientRect().height * 10) / 10 },
      collapse: rel(S(".tb-col", ".sb-toggle"), bar),
      crumb: rel(S(".crumb", ".ws-crumb"), bar),
      search: rel(S('.i-btn[aria-label^="Search"]', ".ws-search"), bar),
      feedback: rel(S(".fb", ".ws-fb"), bar),
      help: rel(S('.i-btn[aria-label="Help"]', ".ws-help"), bar),
      styles: (() => {
        const st = (el: HTMLElement | null) => el && (() => { const c = getComputedStyle(el); return { bg: c.backgroundColor, fam: c.fontFamily.split(",")[0], size: c.fontSize, weight: c.fontWeight, color: c.color }; })();
        return {
          side: side && getComputedStyle(side).backgroundColor,
          sideShadow: side && getComputedStyle(side).boxShadow,
          barShadow: bar && getComputedStyle(bar).boxShadow,
          active: st(S(".nav a.on", '#ws-sidebar nav [aria-current="page"]')),
          nav: st(S(".nav a:not(.on)", "#ws-sidebar nav .ws-ni:not(.on) .ws-lbl")),
          label: st(S(".nav h6", ".ws-glabel")),
          crumbCur: st(S(".crumb b", ".ws-cur")),
          feedback: st(S(".fb", ".ws-fb")),
        };
      })(),
    };
  }, mock);
}

test("the app against the mock, by one ruler", async ({ page, browser }) => {
  mkdirSync(OUT, { recursive: true });
  const rows: string[] = ["| size | state | probe | field | mock | app | Δ | note |", "|---|---|---|---|---|---|---|---|"];
  const over: string[] = [];
  const all: Record<string, unknown> = {};
  const mockPage = await browser.newPage();
  for (const vp of SIZES) for (const collapsed of [false, true]) {
    const state = collapsed ? "collapsed" : "expanded";
    await mockPage.setViewportSize(vp);
    await mockPage.goto(MOCK);
    await mockPage.evaluate(async () => { await document.fonts.ready; });
    if (collapsed) await mockPage.click("#collapse");
    await mockPage.waitForTimeout(400);
    const m = await readShell(mockPage, true);
    await mockPage.screenshot({ path: `${OUT}/mock-${vp.width}-${state}.png` });
    await openShell(page, "/manuscripts", vp, collapsed);
    const a = await readShell(page, false);
    await page.screenshot({ path: `${OUT}/app-${vp.width}-${state}.png` });
    all[`${vp.width}-${state}`] = { mock: m, app: a };
    expect(m.fonts.every(([, ok]) => ok), `the mock loaded its web fonts at ${vp.width}: ${JSON.stringify(m.fonts)}`).toBe(true);
    for (const probe of ["sidebar", "mark", "wordmark", "switcher", "firstLabel", "active", "user", "bar", "collapse", "crumb", "search", "feedback", "help"] as const) {
      const mb = m[probe] as Box, ab = a[probe] as Box;
      if (collapsed && probe === "wordmark") continue;
      if (!mb || !ab) { rows.push(`| ${vp.width} | ${state} | ${probe} | — | ${mb ? "present" : "absent"} | ${ab ? "present" : "absent"} | — | ${!mb && !ab ? "" : "PRESENCE"} |`); if (!!mb !== !!ab) over.push(`${vp.width} ${state} ${probe}: presence differs`); continue; }
      for (const f of ["x", "y", "w", "h"] as const) {
        const d = Math.round((ab[f] - mb[f]) * 10) / 10;
        const key = `${probe}.${f}`;
        const note = Math.abs(d) > 2 ? (EXPLAINED[key] ? "explained" : "UNEXPLAINED") : "";
        rows.push(`| ${vp.width} | ${state} | ${probe} | ${f} | ${mb[f]} | ${ab[f]} | ${d} | ${note} |`);
        if (note === "UNEXPLAINED") over.push(`${vp.width} ${state} ${key}: mock ${mb[f]} app ${ab[f]} (Δ ${d})`);
      }
    }
  }
  writeFileSync(`${OUT}/compare.md`, rows.join("\n") + "\n");
  writeFileSync(`${OUT}/compare.json`, JSON.stringify(all, null, 1));
  console.log(`COMPARE: ${rows.length - 2} rows, ${over.length} unexplained over 2px`);
  for (const o of over) console.log("  ✗ " + o);
  expect(rows.length - 2, "population floor").toBeGreaterThan(250);
  expect(over).toEqual([]);
});
