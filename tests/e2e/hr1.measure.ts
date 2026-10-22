/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Header rules v1.1 — the HR1 locks on the rendered app, at 1280 × 800, 1440 × 900, 1512 × 900 and 1920 × 1080.
 *
 * HR1-1 oracle · HR1-2 top · HR1-3 column · HR1-4 art · HR1-5 right · HR1-6 gap · HR1-7 pairs · HR1-8 untouched.
 * (HR1-9 is the other suites, run beside this file.)
 *
 * ⚠️ ONE COLLECT PASS: every in-scope page at every width is opened once, its hero measured sheet-relative, and HR1-1
 *    to HR1-7 asserted against that one reading, each into its own ledger. Seven pages × four widths opened once
 *    each, not once per lock.
 * ⚠️ EVERY LOCK PROVES ITS POPULATION FIRST: it found the page's hero, and the parts it asserts, before it asserts.
 * ⚠️ THE ORACLE IS THE CONTACT LIST AS BUILT ON DEV (header rules v1.1), never the v19.2 mock.
 * ⚠️ HR1-8 COMPARES AGAINST A REFERENCE CAPTURED FROM THE BASE BUILD IN THE SAME SESSION (`HR1_CAPTURE=1` against the
 *    base preview writes it), never a carried one — the pages' content is the shared account's and moves day to day.
 * Page-side breaks through `HR1_MUTATE=<lock>`; the source break (HR1-2: the stage tabs back) through hr1Mutate.sh.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const DIR = "reports/header-rules-v1";
const SIZES = [{ width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1512, height: 900 }, { width: 1920, height: 1080 }] as const;
const MUT = process.env.HR1_MUTATE ?? "";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  write() {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
  }
  bad() { return this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`); }
}

const flags = (a: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${a}`, { encoding: "utf8" }).trim().split("\n").pop()!;
let original = "null";
test.beforeAll(() => { original = flags(""); });
test.afterAll(() => { flags(`--restore '${original}'`); });

/* the oracle: the Contact list as built on dev (header rules v1.1), sheet-relative */
const ORACLE: Record<number, { ey: [number, number]; title: [number, number]; acts: [number, number]; art: [number, number, number, number]; ri: number; content: number }> = {
  1280: { ey: [243, 36], title: [63, 44], acts: [169, 215], art: [14, 36, 201, 179], ri: 64, content: 259 },
  1440: { ey: [243, 36], title: [63, 44], acts: [169, 215], art: [14, 36, 201, 179], ri: 142, content: 259 },
  1512: { ey: [243, 36], title: [63, 44], acts: [169, 215], art: [14, 36, 201, 179], ri: 178, content: 259 },
  1920: { ey: [267.7, 36], title: [63, 50], acts: [191, 237], art: [14, 36, 225.8, 201], ri: 292, content: 281 },
};
const TEXT_X = (w: number) => (w === 1920 ? 267.7 : 243);
const RIGHT_W = (w: number) => (w === 1920 ? 370 : 332);

type PageMap = { key: string; route: string; header: string; eyebrow: string; title: string; byline: string; acts: string; art?: string; right?: string; rightTokenW?: boolean; content: string; init?: string };
const PAGES: PageMap[] = [
  { key: "contacts", route: "/agents", header: "[data-cl17='header']", eyebrow: "[data-cl17='eyebrow']", title: "[data-cl17='title']", byline: "[data-cl17='byline']", acts: "[data-cl17='acts']", art: "[data-cl182='archivist']", right: "[data-cl17='card']", content: "[data-cl20='title-row']" },
  /* RE-POINTED (Contact list v20 §A): the Contact list's content now opens on its title row (the count, the Cards / List
     pill, Full screen), which sits where the toolbar did; the toolbar follows 54 lower */
  { key: "queries", route: "/queries", header: "[data-qc138='header']", eyebrow: "[data-qc138='eyebrow']", title: "[data-qc138='title']", byline: "[data-qc138='byline']", acts: "[data-qc138='acts']", art: "[data-qc138='hawk']", right: "[data-qc138='chart-col']", rightTokenW: true, content: ".qcv-group > .qcv-page" },
  { key: "analytics", route: "/queries/analytics", header: "[data-a21='header']", eyebrow: "[data-a21='eyebrow']", title: "[data-a21='title']", byline: "[data-a21='byline']", acts: "[data-a21='acts']", right: "[data-a21='card']", rightTokenW: true, content: ".a21-desk" },
  { key: "responses", route: "/queries/responses", header: "[data-rsp='header']", eyebrow: "[data-rsp='eyebrow']", title: ".rsp-hd h1", byline: "[data-rsp='byline']", acts: "[data-rsp='acts']", right: "[data-rsp='card']", content: ".rsp-pos" },
  { key: "discover", route: "/agents/discover", header: "[data-dv1='header']", eyebrow: "[data-dv1='header'] [data-dv1='eyebrow']", title: ".dv1-hd h1", byline: "[data-dv1='byline']", acts: "[data-dv1='header'] [data-dv1='acts']", right: "[data-dv1='header'] .dv1-card", rightTokenW: true, content: ".dv1-hd + *", init: "live" },
  { key: "packages", route: "/manuscripts/packages", header: "[data-pk4='header']", eyebrow: ".pk4-hd .pk4-ey", title: ".pk4-hd h1", byline: ".pk4-hd .pk4-by", acts: ".pk4-hd .pk4-acts", right: "[data-pk4='summary']", content: ".pk4-hd .pk4-fr" },
  { key: "todo", route: "/todo", header: "[data-td5='header']", eyebrow: ".td5-hd .td5-ey", title: ".td5-hd h1", byline: ".td5-hd .td5-by", acts: ".td5-hd .td5-acts", right: "[data-td5='card']", content: ".td5-hd .td5-fr" },
];

const MUTATIONS: Record<string, string> = {
  "HR1-1": `:root, .ws-app, .ws-app.sheet-wide { --hero-top: 42px !important; }`,
  "HR1-3": `.rsp-hd .rsp-left { margin-left: 0 !important; }`,
  "HR1-4": `.qc138-hd .qc138-hawk { height: calc(var(--hero-art-h) + 20px) !important; }`,
  "HR1-5": `.pk4-hd .pk4-tr { margin-right: 0 !important; }`,
  "HR1-6": `.a21-desk { margin-top: 54px !important; }`,
  "HR1-7": `.dv1-hd h1.dv1-title { margin-left: 4px !important; }`,
  "HR1-8": `.ms21-hd3, [data-slh='header'] { margin-top: 6px !important; }`,
};

async function open(page: Page, route: string, vp: { width: number; height: number }, init?: string, pinned?: string) {
  await page.addInitScript(([init, pinned]) => {
    try {
      for (const k of ["contacts", "queries", "manuscripts", "todo", "analytics", "responses", "discover", "packages", "dashboard"]) localStorage.setItem(`sa.guide.${k}`, "1");
      for (const k of ["agents", "queries", "todo", "packages", "responses"]) localStorage.removeItem(`sa.pinList.${k}`);
      if (init === "live") (window as unknown as { __SA_DV_STATE?: string }).__SA_DV_STATE = "live";
    } catch { /* */ }
  }, [init ?? "", pinned ?? ""] as const);
  await openRoute(page, route, vp);
  await page.waitForTimeout(3500);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(5, 5);
  /* pinned: F, as a writer pins (each page remembers its pin in its own key; F works on both) */
  if (pinned) { await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); await page.keyboard.press("f"); await page.waitForTimeout(1200); }
  if (MUTATIONS[MUT]) await page.addStyleTag({ content: MUTATIONS[MUT] });
  await page.waitForTimeout(400);
}

type Box = { l: number; t: number; w: number; h: number; b: number; ri: number; cy: number };
type Reading = { found: Record<string, boolean>; ey?: Box; title?: Box; byline?: Box; acts?: Box; art?: Box; right?: Box; content?: Box; titleFs?: number; stackB?: number; above: string[] };

const measure = (page: Page, m: PageMap) => page.evaluate((m) => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && b.width > 0; }) ?? null;
  const sheetEl = vis(".ws-window")!;
  const sh = sheetEl.getBoundingClientRect();
  const box = (e: Element | null) => { if (!e) return undefined; const b = e.getBoundingClientRect(); return { l: +(b.left - sh.left).toFixed(2), t: +(b.top - sh.top).toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2), b: +(b.bottom - sh.top).toFixed(2), ri: +(sh.right - b.right).toFixed(2), cy: +((b.top + b.bottom) / 2 - sh.top).toFixed(2) }; };
  const hd = vis(m.header);
  const q = (s?: string) => (s ? vis(s) : null);
  const els = { ey: q(m.eyebrow), title: q(m.title), byline: q(m.byline), acts: q(m.acts), art: q(m.art), right: q(m.right), content: q(m.content) };
  const r: Record<string, unknown> = { found: { header: !!hd, ...Object.fromEntries(Object.entries(els).map(([k, e]) => [k, !!e])) } };
  for (const [k, e] of Object.entries(els)) r[k] = box(e);
  r.titleFs = els.title ? parseFloat(getComputedStyle(els.title).fontSize) : undefined;
  const parts = [els.ey, els.title, els.byline, els.acts].filter(Boolean) as HTMLElement[];
  r.stackB = parts.length ? Math.max(...parts.map((p) => p.getBoundingClientRect().bottom - sh.top)) : undefined;
  /* HR1-2: anything visible in the sheet whose top is above 34 and that is not the header's own art, shadow or right
     item (or an ancestor of the header): the stage tabs, a toolbar, a banner */
  const above: string[] = [];
  const scroller = sheetEl.querySelector<HTMLElement>(".wpg-scroll") ?? sheetEl;
  const right = els.right;
  for (const e of scroller.querySelectorAll<HTMLElement>("*")) {
    const b = e.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) continue;
    const t = b.top - sh.top;
    if (t >= 34 || b.bottom - sh.top <= 0 || b.left >= sh.right || b.right <= sh.left) continue;
    if (hd && (e.contains(hd))) continue; /* the header's ancestors */
    if (right && (right === e || right.contains(e))) continue;
    if (e.closest("[aria-hidden='true']") || e.tagName === "IMG") continue; /* the art and the shadows */
    const cs = getComputedStyle(e);
    if (cs.visibility === "hidden" || cs.opacity === "0") continue;
    if (cs.position === "fixed") continue; /* floating tabs over the sheet */
    above.push(`${e.tagName.toLowerCase()}.${(e.className || "").toString().slice(0, 30)} @${t.toFixed(1)}`);
  }
  r.above = above.slice(0, 6);
  return r;
}, m) as Promise<Reading>;

const near = (a: number | undefined, b: number, t: number) => typeof a === "number" && Math.abs(a - b) <= t;

test.describe("Header rules v1.1", () => {
  test("HR1-1…7 · one collect pass: the oracle, the top, the column, the art, the right item, the gap and the pairs", async ({ page }) => {
    test.setTimeout(1_500_000);
    flags(`--restore '${JSON.stringify({ seen: true, done: { log: true, find: true, open: true, pin: true, resp: true, birds: true } })}'`);
    const L = Object.fromEntries(["HR1-1", "HR1-2", "HR1-3", "HR1-4", "HR1-5", "HR1-6", "HR1-7"].map((k) => [k, new Ledger(k)])) as Record<string, Ledger>;
    const all: Record<string, Record<number, Reading>> = {};
    for (const vp of SIZES) {
      for (const m of PAGES) {
        await open(page, m.route, vp, m.init);
        const r = await measure(page, m);
        (all[m.key] ??= {})[vp.width] = r;
        const w = `${m.key} ${vp.width}`;
        const o = ORACLE[vp.width];
        /* population, for every lock that reads this page */
        const pop = r.found.header && r.found.ey && r.found.title && r.found.acts;
        for (const k of ["HR1-2", "HR1-3", "HR1-6"]) L[k].check(`${w} found the hero (header, eyebrow, title, actions)`, pop, JSON.stringify(r.found));
        if (!pop) continue;
        /* HR1-1 — the Contact list against the oracle */
        if (m.key === "contacts") {
          const c = L["HR1-1"];
          c.check(`${w} found the art and the card`, r.found.art && r.found.right, JSON.stringify(r.found));
          c.check(`${w} eyebrow (l, t)`, near(r.ey!.l, o.ey[0], 1) && near(r.ey!.t, o.ey[1], 1), `${r.ey!.l},${r.ey!.t} vs ${o.ey}`);
          c.check(`${w} title (t, size)`, near(r.title!.t, o.title[0], 1) && near(r.titleFs, o.title[1], 0.5), `${r.title!.t},${r.titleFs} vs ${o.title}`);
          c.check(`${w} actions (t, b)`, near(r.acts!.t, o.acts[0], 1) && near(r.acts!.b, o.acts[1], 1), `${r.acts!.t},${r.acts!.b} vs ${o.acts}`);
          c.check(`${w} art (l, t, w, h)`, !!r.art && near(r.art.l, o.art[0], 1) && near(r.art.t, o.art[1], 1) && near(r.art.w, o.art[2], 1) && near(r.art.h, o.art[3], 1), `${r.art && [r.art.l, r.art.t, r.art.w, r.art.h]} vs ${o.art}`);
          c.check(`${w} right inset`, !!r.right && near(r.right.ri, o.ri, 1), `${r.right?.ri} vs ${o.ri}`);
          c.check(`${w} content top`, !!r.content && near(r.content.t, o.content, 1), `${r.content?.t} vs ${o.content}`);
        }
        /* HR1-2 — the eyebrow is 36 under the sheet's top, and nothing outside the hero's own parts is above 34 */
        L["HR1-2"].check(`${w} eyebrow top 36`, near(r.ey!.t, 36, 1), `${r.ey!.t}`);
        L["HR1-2"].check(`${w} nothing else above 34`, r.above.length === 0, r.above.join(" | "));
        /* HR1-3 — the eyebrow and title on the shared text column */
        L["HR1-3"].check(`${w} eyebrow left on H5`, near(r.ey!.l, TEXT_X(vp.width), 1), `${r.ey!.l} vs ${TEXT_X(vp.width)}`);
        L["HR1-3"].check(`${w} title left on H5`, near(r.title!.l, TEXT_X(vp.width), 1), `${r.title!.l} vs ${TEXT_X(vp.width)}`);
        /* HR1-4 — the illustration: left 14, top on the eyebrow's, bottom on the stack's */
        if (m.art) {
          const a = L["HR1-4"];
          a.check(`${w} found the art`, !!r.art, "");
          if (r.art) {
            a.check(`${w} art left 14`, near(r.art.l, 14, 1), `${r.art.l}`);
            a.check(`${w} art top = eyebrow top`, near(r.art.t, r.ey!.t, 1), `${r.art.t} vs ${r.ey!.t}`);
            a.check(`${w} art bottom = stack bottom`, near(r.art.b, r.stackB!, 1), `${r.art.b} vs ${r.stackB}`);
          }
        }
        /* HR1-5 — the right item: the shared inset, the token width where the page has none of its own, centred on the stack */
        if (m.right) {
          const rr = L["HR1-5"];
          rr.check(`${w} found the right item`, !!r.right, "");
          if (r.right) {
            rr.check(`${w} right inset on H6`, near(r.right.ri, o.ri, 1), `${r.right.ri} vs ${o.ri}`);
            if (m.rightTokenW) rr.check(`${w} width is --hero-right-w`, near(r.right.w, RIGHT_W(vp.width), 1), `${r.right.w} vs ${RIGHT_W(vp.width)}`);
            const stackCy = (r.ey!.t + r.stackB!) / 2;
            rr.check(`${w} centred on the stack`, near(r.right.cy, stackCy, 2), `${r.right.cy} vs ${stackCy}`);
          }
        }
        /* HR1-6 — the content starts 44 under the stack */
        L["HR1-6"].check(`${w} found the content`, !!r.content, m.content);
        if (r.content) L["HR1-6"].check(`${w} content − stack bottom = 44`, near(r.content.t - r.stackB!, 44, 1), `${(r.content.t - r.stackB!).toFixed(2)} (content ${r.content.t}, stack ${r.stackB})`);
      }
      /* HR1-7 — the pairs under one folder tab: Contact list / Discover, Query Centre / Analytics */
      for (const [a, b] of [["contacts", "discover"], ["queries", "analytics"]] as const) {
        const A = all[a]?.[vp.width], B = all[b]?.[vp.width];
        const p = L["HR1-7"];
        const w = `${a}/${b} ${vp.width}`;
        p.check(`${w} both found`, !!A?.ey && !!B?.ey, "");
        if (!A?.ey || !B?.ey) continue;
        p.check(`${w} eyebrow identical`, near(A.ey.l, B.ey.l, 1) && near(A.ey.t, B.ey.t, 1), `${A.ey.l},${A.ey.t} vs ${B.ey.l},${B.ey.t}`);
        p.check(`${w} title identical`, near(A.title!.l, B.title!.l, 1) && near(A.title!.t, B.title!.t, 1), `${A.title!.l},${A.title!.t} vs ${B.title!.l},${B.title!.t}`);
        /* the content top is identical where both stacks are the oracle's height; where a title wraps (decision 5) the
           stack grows and the content follows it — recorded, with its numbers, never asserted equal */
        const same = near(A.stackB, B.stackB!, 1);
        if (same) p.check(`${w} content top identical`, !!A.content && !!B.content && near(A.content.t, B.content.t, 1), `${A.content?.t} vs ${B.content?.t}`);
        else p.check(`${w} content top: ${b}'s title wraps (decision 5), stack ${B.stackB} against ${A.stackB}`, true, `content ${A.content?.t} vs ${B.content?.t}`);
      }
    }
    mkdirSync(DIR, { recursive: true });
    writeFileSync(`${DIR}/readings${MUT ? `-mut-${MUT}` : ""}.json`, JSON.stringify(all, null, 1));
    const bad: string[] = [];
    for (const l of Object.values(L)) { l.write(); bad.push(...l.bad()); }
    for (const x of bad.slice(0, 60)) console.log(`  ✗ ${x}`);
    expect(L["HR1-1"].rows.length, "HR1-1: fewer readings than it claims").toBeGreaterThanOrEqual(28);
    expect(L["HR1-3"].rows.length, "HR1-3: fewer readings than it claims").toBeGreaterThanOrEqual(56);
    expect(bad).toEqual([]);
  });

  test("HR1-8 · untouched: the pinned layouts, the phone, the out-of-scope and report-only pages measure as on the base", async ({ page }) => {
    test.setTimeout(900_000);
    flags(`--restore '${JSON.stringify({ seen: true, done: { log: true, find: true, open: true, pin: true, resp: true, birds: true } })}'`);
    const L = new Ledger("HR1-8");
    const cases: { name: string; route: string; vp: { width: number; height: number }; sel: string[]; pinned?: string; init?: string }[] = [];
    for (const vp of [SIZES[0], SIZES[2]]) {
      /* Manuscripts v27 retired the manuscripts case: the v21 header it held is gone (RETIRED-manuscripts-v27.md) */
      cases.push({ name: `comps ${vp.width}`, route: "/manuscripts/comps", vp, sel: ["[data-slh='header']", "[data-slh='eyebrow']", "[data-slh='header'] h1", "[data-slh='card']"] });
      cases.push({ name: `dashboard ${vp.width}`, route: "/dashboard", vp, sel: ["[data-d58='header']", "[data-d58='eyebrow']", "[data-d58='title']", "[data-d58='buttons']"] });
      cases.push({ name: `calendar ${vp.width}`, route: "/todo/calendar", vp, sel: ["header[data-probe='page-header']", "header[data-probe='page-header'] h1"] });
      cases.push({ name: `corkboard ${vp.width}`, route: "/todo/corkboard", vp, sel: ["header.hp3", "header.hp3 h1"] });
      cases.push({ name: `discover coming soon ${vp.width}`, route: "/agents/discover", vp, sel: ["[data-dv1='coming-soon']", "[data-dv1='coming-soon'] h1"] });
      cases.push({ name: `queries pinned ${vp.width}`, route: "/queries", vp, pinned: "queries", sel: ["[data-qc140='band']", "[data-qc140='toolbar']", "[data-qc138='headings']"] });
      cases.push({ name: `contacts pinned ${vp.width}`, route: "/agents", vp, pinned: "agents", sel: ["[data-cl19='head']", "[data-cl19='toolbar']"] });
    }
    for (const route of ["/queries", "/agents", "/queries/analytics"]) cases.push({ name: `phone ${route}`, route, vp: { width: 390, height: 844 }, sel: ["h1"] });
    const got: Record<string, (number[] | null)[]> = {};
    for (const c of cases) {
      /* the phone: opened at a desktop size (openRoute waits for the desktop shell) and resized in place */
      if (c.vp.width < 768) { await open(page, c.route, SIZES[0], c.init, c.pinned); await page.setViewportSize(c.vp); await page.waitForTimeout(2500); }
      else await open(page, c.route, c.vp, c.init, c.pinned);
      got[c.name] = await page.evaluate((sels) => {
        const sh = ([...document.querySelectorAll<HTMLElement>(".ws-window, main, body")].find((e) => e.getBoundingClientRect().width > 0) ?? document.body).getBoundingClientRect();
        return sels.map((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => { const b = x.getBoundingClientRect(); return b.width > 0 && b.height > 0; }); if (!e) return null; const b = e.getBoundingClientRect(); return [+(b.left - sh.left).toFixed(1), +(b.top - sh.top).toFixed(1), +b.width.toFixed(1), +b.height.toFixed(1)]; });
      }, c.sel);
      /* unpin again, so the next case opens unpinned (the pin is remembered per device) */
      if (c.pinned) { await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); await page.keyboard.press("f"); await page.waitForTimeout(800); }
    }
    const REF = `${DIR}/ref-untouched.json`;
    if (process.env.HR1_CAPTURE) { mkdirSync(DIR, { recursive: true }); writeFileSync(REF, JSON.stringify({ capturedAt: Date.now(), got }, null, 1)); return; }
    expect(existsSync(REF), "HR1-8: capture the base reference first (HR1_CAPTURE=1 against the base preview)").toBe(true);
    const ref = JSON.parse(readFileSync(REF, "utf8")) as { capturedAt: number; got: Record<string, (number[] | null)[]> };
    expect(Date.now() - ref.capturedAt, "HR1-8: the reference is older than twelve hours; capture it again").toBeLessThan(12 * 3600_000);
    for (const c of cases) {
      const a = ref.got[c.name], b = got[c.name];
      L.check(`${c.name} found on the base and here`, !!a && !!b && a.every(Boolean) && b.every(Boolean), JSON.stringify({ a, b }));
      if (!a || !b) continue;
      a.forEach((x, i) => { const y = b[i]; if (!x || !y) return; L.check(`${c.name} ${c.sel[i]}`, x.every((v, j) => Math.abs(v - y[j]) <= 1), `${x} vs ${y}`); });
    }
    L.write();
    for (const x of L.bad().slice(0, 40)) console.log(`  ✗ ${x}`);
    expect(L.rows.length, "HR1-8: fewer readings than it claims").toBeGreaterThanOrEqual(40);
    expect(L.bad()).toEqual([]);
  });
});
