/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 — the PK43 locks on the rendered page, at 1440 × 900 and 1717 × 1000 (P11 at 1280, 1024 and
 * 820), with the e2e user on the emulator. FIXTURE: seedPk40.mjs (pk40-ms: Standard and Standard 2 out with agents,
 * Ready one, Draft one, the retired Old one; Standard goes out with new queries) and pk41Fixture.mjs, re-seeded per case
 * and cleaned in afterAll.
 *
 * EVERY LOCK PROVES ITSELF IN THE SAME RUN: it reads the page (green), then applies its break in that page and reads
 * again — the second reading must be red, and a break that changes nothing fails the lock. Both readings go to
 * reports/submission-packages-v43/ledger/<lock>.json. `PK43_BEFORE=write` records P2's before.json instead.
 *
 *   P1  the header is the Query Centre's: OpenHeader's markup, and its height, radius, ground, title size, button height
 *       and left/right edges equal the Query Centre's (before.json) ±1                        break: v41's own header
 *   P2  the Query Centre, Contact list, To-do and Query letters headers and bars equal before.json  break: navy +1
 *   P3  list left = header left; workspace left = headline left; workspace right, Results left/right = the header's
 *                                                                                              break: one column
 *   P4  header → desk 48 ±1; desk → Results 48 ±1                                             break: 26
 *   P5  at 600 the bar is shown, 60 tall, title 24px, button 40, its ground the sheet's width, each the Query Centre's;
 *       at rest hidden, inert and aria-hidden                    break: this page's root out of qcv156 §3's lists
 *   P6  one drawing in the header, the standing hawk; no `.p41-perch`                          break: the pinned hawk
 *   P7  one row per live package (≥ 3); one aria-current; one berry flag, on the going-out row; the third row opens the
 *       third package; Retired (n) adds n rows and Hide retired removes them; no `.p42-tile`  break: the tiles
 *   P8  Change lists only packages with a version and a letter (not the draft); choosing moves the flag, the header and
 *       the bar; Undo restores all three                                                      break: the draft listed
 *   P9  every done disc navy (rgb(45, 58, 80)); nothing under the page root green (population > 0)
 *                                                                                              break: v42's tick
 *   P10 day one: "No packages yet", no buttons, no right block, three steps, one filled button, P3's edges and P4's 48
 *                                                                                              break: v26's hero
 *   P11 no sideways overflow at 1280, 1024, 820; at 1280 the right block shows and clears the title  break: wide desk
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { MS, OTHERS, PK, SIZES, W1440, headerSnap, openPage, scrollPage, slimSnap, stable } from "./pk43Probe";

const DIR = "reports/submission-packages-v43";
const BEFORE = `${DIR}/before.json`;
const node = (file: string, ...args: string[]) => execFileSync("node", [`tests/e2e/${file}`, ...args], { stdio: "pipe" }).toString();
const seed = (...a: string[]) => node("seedPk40.mjs", ...a);
const fix = (...a: string[]) => node("pk41Fixture.mjs", ...a);
const NAVY = "rgb(45, 58, 80)";
const near = (a: number | null | undefined, b: number | null | undefined, t = 1) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= t;
const before = () => JSON.parse(readFileSync(BEFORE, "utf8")) as Record<string, { header: NonNullable<Awaited<ReturnType<typeof headerSnap>>>; slim600: NonNullable<Awaited<ReturnType<typeof slimSnap>>> }>;

type Row = { where: string; ok: boolean; detail: string };
/** One lock: its green readings, then its readings under its break. */
class Lock {
  green: Row[] = []; red: Row[] = []; private cur: Row[] = this.green;
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: unknown) { this.cur.push({ where, ok: !!ok, detail: typeof detail === "string" ? detail : JSON.stringify(detail) }); }
  broken() { this.cur = this.red; }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify({ green: this.green, red: this.red }, null, 1));
    const gOk = this.green.filter((r) => r.ok).length, rBad = this.red.filter((r) => !r.ok);
    for (const r of this.green.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] green ${gOk}/${this.green.length} · under its break ${rBad.length} red of ${this.red.length}: ${rBad.slice(0, 4).map((r) => r.where).join("; ")}`);
    expect(this.green.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.green.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
    expect(rBad.length, `${this.name}: its break changed nothing — the lock cannot see its subject`).toBeGreaterThan(0);
  }
}

const css = (page: Page, text: string) => page.addStyleTag({ content: text }).then(() => page.waitForTimeout(350));
const open = async (page: Page, size: { width: number; height: number }) => { await openPage(page, PK.route, PK.root, size); await scrollPage(page, PK.root, 0); };
/** the visible packages page, for in-page probes */
const ROOT = `([...document.querySelectorAll('[data-pk41="page"]')].find((e) => e.getBoundingClientRect().width > 0))`;
const boxes = (page: Page) => page.evaluate((ROOT) => {
  const r = (0, eval)(ROOT) as HTMLElement;
  const b = (s: string) => { const e = r.querySelector(s); if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, r: x.right, t: x.top, b: x.bottom, h: x.height }; };
  return { hd: b(".qc1531-hd"), title: b("h1.qc1531-t"), rows: b('[data-pk43="rows"]'), steps: b('[data-pk43="day-one-steps"]'), work: b('[data-pk43="work"]'), desk: b('[data-pk43="desk"]'), res: b('[data-pk41="results"]') };
}, ROOT);

test.describe.configure({ mode: "default" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

/* ── P2 · the other four pages (and before.json) ─────────────────────────────────────────────────────────────── */
test("P2 the other four pages' headers and collapsed bars are unchanged", async ({ page }) => {
  test.setTimeout(500_000);
  const now: Record<string, unknown> = {};
  for (const size of SIZES) {
    for (const p of OTHERS) {
      await openPage(page, p.route, p.root, size);
      await scrollPage(page, p.root, 0);
      const header = await headerSnap(page, p.root), slimRest = await slimSnap(page, p.root);
      await scrollPage(page, p.root, 600);
      now[`${p.name} @${size.width}`] = { header, slimRest, slim600: await slimSnap(page, p.root) };
    }
  }
  mkdirSync(DIR, { recursive: true });
  if (process.env.PK43_BEFORE === "write") { writeFileSync(BEFORE, JSON.stringify(now, null, 1)); console.log(`[P2] wrote ${BEFORE}`); return; }
  writeFileSync(`${DIR}/after.json`, JSON.stringify(now, null, 1));
  const L = new Lock("P2");
  expect(existsSync(BEFORE), "before.json is missing").toBe(true);
  const b = before();
  L.check("population: four pages at two sizes", Object.keys(b).length === 8, Object.keys(b).length);
  for (const k of Object.keys(b)) {
    L.check(`${k}: a header found`, !!b[k].header, "none");
    L.check(`${k}: header and bars equal before.json`, JSON.stringify(stable(now[k])) === JSON.stringify(stable(b[k])), "differs (after.json)");
  }
  /* the break: qcv156's navy shifted by one channel, read on the Query Centre */
  L.broken();
  await openPage(page, OTHERS[0].route, OTHERS[0].root, W1440);
  await scrollPage(page, OTHERS[0].root, 0);
  await css(page, `:is(.qc151.qc153, .cl27, .tws56-hdw) > .qc1531-hd.qc1531-hd { background-color: rgb(42, 58, 83) !important; }`);
  const k = `${OTHERS[0].name} @1440`;
  L.check(`${k}: header equals before.json`, JSON.stringify(stable(await headerSnap(page, OTHERS[0].root))) === JSON.stringify(stable(b[k].header)), "differs");
  L.done(17);
});

for (const size of SIZES) {
  const at = `${size.width}`;
  const qcKey = `Query Centre @${at}`;

  /* ── P1 · the header is the Query Centre's ── */
  test(`P1 header · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    seed();
    const qc = before()[qcKey].header;
    const L = new Lock(`P1-${at}`);
    await open(page, size);
    const read = async () => {
      const h = await headerSnap(page, PK.root);
      const markup = await page.evaluate((ROOT) => { const r = (0, eval)(ROOT) as HTMLElement; const hd = r.querySelector(".qc151.qc153 > header.qc1531-hd"); return hd ? [...hd.children].map((c) => c.className.split(" ")[0]) : null; }, ROOT);
      L.check("OpenHeader's frame: art, main, ring in a .qc151.qc153 wrapper", JSON.stringify(markup) === JSON.stringify(["qc1531-art", "qc1531-main", "qc1531-rc"]), markup);
      L.check("height", near(h?.box?.height, qc.box!.height), `${h?.box?.height} vs ${qc.box!.height}`);
      L.check("left", near(h?.box?.left, qc.box!.left), `${h?.box?.left} vs ${qc.box!.left}`);
      L.check("right", near(h?.box?.right, qc.box!.right), `${h?.box?.right} vs ${qc.box!.right}`);
      L.check("top", near(h?.box?.top, qc.box!.top), `${h?.box?.top} vs ${qc.box!.top}`);
      L.check("radius", h?.radius === qc.radius, `${h?.radius} vs ${qc.radius}`);
      L.check("ground", h?.bg === qc.bg, `${h?.bg} vs ${qc.bg}`);
      L.check("title size", h?.title.size === qc.title.size, `${h?.title.size} vs ${qc.title.size}`);
      L.check("title left", near(h?.title.left, qc.title.left), `${h?.title.left} vs ${qc.title.left}`);
      L.check("two buttons, each the Query Centre's height", h?.buttons.length === 2 && h.buttons.every((x) => near(x, qc.buttons[0])), `${JSON.stringify(h?.buttons)} vs ${qc.buttons[0]}`);
      L.check("headline", h?.title.text === "4 packages", `${h?.title.text}`);
    };
    await read();
    /* the break: v41's own header in its place (a thin #2d3a50 panel, radius 20, 100 tall, its title at 34) */
    L.broken();
    await page.evaluate((ROOT) => {
      const r = (0, eval)(ROOT) as HTMLElement; const w = r.querySelector(".pk43-hdw") as HTMLElement;
      w.className = "pk41-mut"; w.innerHTML = `<header class="qc1531-hd" style="display:flex;align-items:center;margin:4px 0 28px;padding:18px 22px 18px 30px;border-radius:20px;background:#2d3a50;height:100px;box-sizing:border-box"><div class="qc1531-main"><h1 class="qc1531-t" style="font-size:34px;margin:0;color:#fffaf3">Your packages</h1></div><div class="qc1531-acts"><button class="qc1531-b" style="height:40px">How it works</button><button class="qc1531-b" style="height:40px">+ New package</button></div></header>`;
    }, ROOT);
    await page.waitForTimeout(300);
    await read();
    L.done(11);
  });

  /* ── P3 + P4 · alignment and the 48s ── */
  test(`P3 P4 alignment and rhythm · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    seed();
    const L3 = new Lock(`P3-${at}`), L4 = new Lock(`P4-${at}`);
    await open(page, size);
    const read = async () => {
      const x = await boxes(page);
      L3.check("population: header, rows, workspace, Results", !!(x.hd && x.rows && x.work && x.res && x.title), x);
      L3.check("list left = header left", near(x.rows?.l, x.hd?.l), `${x.rows?.l} vs ${x.hd?.l}`);
      L3.check("workspace left = headline left", near(x.work?.l, x.title?.l), `${x.work?.l} vs ${x.title?.l}`);
      L3.check("workspace right = header right", near(x.work?.r, x.hd?.r), `${x.work?.r} vs ${x.hd?.r}`);
      L3.check("Results left = header left", near(x.res?.l, x.hd?.l), `${x.res?.l} vs ${x.hd?.l}`);
      L3.check("Results right = header right", near(x.res?.r, x.hd?.r), `${x.res?.r} vs ${x.hd?.r}`);
      L4.check("header bottom → desk top 48", near((x.desk?.t ?? 0) - (x.hd?.b ?? 0), 48), `${(x.desk?.t ?? 0) - (x.hd?.b ?? 0)}`);
      L4.check("desk bottom → Results top 48", near((x.res?.t ?? 0) - (x.desk?.b ?? 0), 48), `${(x.res?.t ?? 0) - (x.desk?.b ?? 0)}`);
    };
    await read();
    L3.broken(); L4.broken();
    await css(page, `.pk43 .pk43-desk { grid-template-columns: minmax(0, 1fr) !important; } .pk43 .pk43-list, .pk43 .pk43-work { grid-column: 1 !important; }
      .pk43 .qc151.qc153 > .qc1531-hd.pk43-hd.pk43-hd { margin-bottom: 26px !important; } .pk43 .pk43-desk + .p41-res { margin-top: 26px !important; }`);
    await read();
    L3.done(6); L4.done(2);
  });

  /* ── P5 · the collapsed bar ── */
  test(`P5 collapsed bar · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    seed();
    const qc = before()[qcKey].slim600;
    const L = new Lock(`P5-${at}`);
    await open(page, size);
    const read = async () => {
      await scrollPage(page, PK.root, 0);
      const rest = await slimSnap(page, PK.root);
      L.check("present", !!rest, "no bar");
      L.check("at rest: hidden, inert, aria-hidden", rest && !rest.shown && rest.inert && rest.ariaHidden === "true", rest && { shown: rest.shown, inert: rest.inert, ah: rest.ariaHidden });
      /* part-way (the header half gone): wherever the bar shows, it is already at its place under the lip */
      for (const y of [200, 260, 320]) {
        await scrollPage(page, PK.root, y);
        const m = await slimSnap(page, PK.root);
        L.check(`at ${y}: shown only at the Query Centre's top`, !m?.shown || near(m.box.top, qc.box.top), m && { shown: m.shown, top: m.box.top });
      }
      await scrollPage(page, PK.root, 600);
      const s = await slimSnap(page, PK.root);
      L.check("at 600: shown", s?.shown && !s.inert, s && { shown: s.shown, inert: s.inert });
      L.check("height 60 = the Query Centre's", near(s?.box.height, 60) && near(s?.box.height, qc.box.height), `${s?.box.height}`);
      L.check("top = the Query Centre's", near(s?.box.top, qc.box.top), `${s?.box.top} vs ${qc.box.top}`);
      L.check("title 24px", s?.title?.size === "24px" && s.title.size === qc.title?.size, `${s?.title?.size}`);
      L.check("button 40 = the Query Centre's", near(s?.button?.height, 40) && near(s?.button?.height, qc.button?.height), `${s?.button?.height}`);
      L.check("ground from the sheet's left edge", near(s?.ground.left, s?.ground.sheetLeft) && near(s?.ground.left, qc.ground.left), s?.ground);
      L.check("…to its right edge", near(s?.ground.right, s?.ground.sheetRight) && near(s?.ground.right, qc.ground.right), s?.ground);
      L.check("content inset to the header's edges", near(s?.box.left, qc.box.left) && near(s?.box.right, qc.box.right), s?.box);
      L.check("headline", s?.title?.text === "4 packages", `${s?.title?.text}`);
      const right = await page.evaluate((ROOT) => ((0, eval)(ROOT) as HTMLElement).querySelector('[data-pk43="slim-going"]')?.textContent ?? null, ROOT);
      L.check("the package going out", right === "Standardgoes out with new queries", `${right}`);
    };
    await read();
    /* the break: this page's root taken out of qcv156 §3's lists (rewritten in the live stylesheet) */
    L.broken();
    await page.evaluate(() => {
      const walk = (rules: CSSRuleList) => { for (const r of [...rules]) { if (r instanceof CSSStyleRule && r.selectorText.includes(".pk43)")) r.selectorText = r.selectorText.replace(/, \.pk43\)/g, ")"); else if ("cssRules" in r) walk((r as CSSGroupingRule).cssRules); } };
      for (const s of [...document.styleSheets]) { try { walk(s.cssRules); } catch { /* cross-origin */ } }
    });
    await page.waitForTimeout(300);
    await read();
    L.done(15);
  });

  /* ── P6 · the Archivist in the header, nothing pinned ── */
  test(`P6 the hawk · ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    seed();
    const L = new Lock(`P6-${at}`);
    await open(page, size);
    const read = async () => {
      const r = await page.evaluate((ROOT) => { const root = (0, eval)(ROOT) as HTMLElement; const imgs = [...root.querySelectorAll(".qc1531-hd img")] as HTMLImageElement[];
        return { n: imgs.length, src: imgs[0]?.getAttribute("src") ?? null, hidden: imgs[0]?.closest("[aria-hidden='true']") !== null, perch: document.querySelectorAll(".p41-perch").length, fixed: [...document.querySelectorAll("img")].filter((i) => getComputedStyle(i).position === "fixed" && i.getBoundingClientRect().height > 100).length }; }, ROOT);
      L.check("one drawing in the header", r.n === 1, `${r.n}`);
      L.check("…the standing hawk", r.src === "/images/packages/packages-hawk-standing.png", `${r.src}`);
      L.check("…decorative (aria-hidden)", r.hidden, `${r.hidden}`);
      L.check("no .p41-perch", r.perch === 0, `${r.perch}`);
      L.check("no drawing pinned to the window", r.fixed === 0, `${r.fixed}`);
    };
    await read();
    L.broken();
    await page.evaluate(() => { const i = document.createElement("img"); i.className = "p41-perch"; i.src = "/images/packages/packages-hawk-standing.png"; i.style.cssText = "position:fixed;right:-14px;bottom:0;height:212px;z-index:40"; document.body.appendChild(i); });
    await page.waitForTimeout(300);
    await read();
    L.done(5);
  });

  /* ── P7 · the list ── */
  test(`P7 the list · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    seed();
    const L = new Lock(`P7-${at}`);
    await open(page, size);
    const rows = () => page.evaluate((ROOT) => { const r = (0, eval)(ROOT) as HTMLElement;
      return { ids: [...r.querySelectorAll("[data-pk43-row]")].map((e) => e.getAttribute("data-pk43-row")), cur: [...r.querySelectorAll('[data-pk43-row][aria-current="true"]')].map((e) => e.getAttribute("data-pk43-row")),
        flags: [...r.querySelectorAll('[data-pk43="flag"]')].map((e) => e.closest("[data-pk43-row]")?.getAttribute("data-pk43-row")), tiles: r.querySelectorAll(".p42-tile, [data-pk42-tile]").length,
        open: r.querySelector("[data-pkg]")?.getAttribute("data-pkg") ?? null, toggle: r.querySelector('[data-pk43="retired-toggle"]')?.textContent ?? null }; }, ROOT);
    const read = async (clicks: boolean) => {
      const a = await rows();
      L.check("population: at least three live rows", a.ids.length >= 3, `${a.ids.length}`);
      L.check("one row per live package, in the tiles' order", JSON.stringify(a.ids) === JSON.stringify(["pk40-draft", "pk40-ready", "pk40-std2", "pk40-std"]), a.ids);
      L.check("exactly one aria-current", a.cur.length === 1, a.cur);
      L.check("exactly one berry flag, on the going-out row", a.flags.length === 1 && a.flags[0] === "pk40-std", a.flags);
      L.check("no stat tiles", a.tiles === 0, `${a.tiles}`);
      if (!clicks) return;
      const third = a.ids[2];
      await page.locator(`${PK.root} [data-pk43-row="${third}"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(600);
      const b = await rows();
      L.check("the third row opens the third package in the builder", b.open === third && b.cur[0] === third, b);
      L.check("Retired (1)", a.toggle === "Retired (1)", `${a.toggle}`);
      await page.locator(`${PK.root} [data-pk43="retired-toggle"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(400);
      const c = await rows();
      L.check("Retired (n) adds n rows", c.ids.length === a.ids.length + 1 && c.ids.includes("pk40-old"), c.ids);
      L.check("…and says Hide retired", c.toggle === "Hide retired", `${c.toggle}`);
      await page.locator(`${PK.root} [data-pk43="retired-toggle"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(400);
      const d = await rows();
      L.check("Hide retired removes them", d.ids.length === a.ids.length, d.ids);
      const bg = await page.evaluate((ROOT) => { const e = ((0, eval)(ROOT) as HTMLElement).querySelector('[data-pk43-row][aria-current="true"]') as HTMLElement; return getComputedStyle(e).boxShadow; }, ROOT);
      L.check("the open row: the 2px navy ring", /rgb\(42, 58, 82\) 0px 0px 0px 2px/.test(bg), bg);
    };
    await read(true);
    /* the break: the stat tiles back in the list's place */
    L.broken();
    await page.evaluate((ROOT) => { const r = (0, eval)(ROOT) as HTMLElement; const l = r.querySelector('[data-pk43="list"]') as HTMLElement;
      l.outerHTML = `<div class="p42-tiles" data-pk42="tiles">${["pk40-draft", "pk40-ready", "pk40-std2", "pk40-std"].map((id) => `<button class="p42-tile" data-pk42-tile="${id}">${id}</button>`).join("")}</div>`; }, ROOT);
    await page.waitForTimeout(300);
    await read(false);
    L.done(11);
  });

  /* ── P9 · no green ── */
  test(`P9 no green · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    seed();
    const L = new Lock(`P9-${at}`);
    await open(page, size);
    /* a draft with its steps open (the open step and a chosen piece), then the sent one (every disc done) */
    const read = async () => {
      for (const id of ["pk40-ready", "pk40-std"]) {
        await page.locator(`${PK.root} [data-pk43-row="${id}"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(600);
        const r = await page.evaluate((ROOT) => {
          const root = (0, eval)(ROOT) as HTMLElement;
          const rgba = (c: string) => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b, a = "1"] = m; return [+r, +g, +b, +a] as const; };
          const green = (c: string) => { const v = rgba(c); if (!v || v[3] < 0.1) return false; const [r, g, b] = [v[0] / 255, v[1] / 255, v[2] / 255];
            const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m; if (!d) return false; let h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360;
            const l = (M + m) / 2, s = d / (1 - Math.abs(2 * l - 1)); return h >= 75 && h <= 170 && s >= 0.25; };
          const all = [...root.querySelectorAll("*")].filter((e) => (e as HTMLElement).getBoundingClientRect().width > 0);
          const hits: string[] = [];
          for (const e of all) { const c = getComputedStyle(e);
            for (const p of ["background-color", "border-top-color", "border-left-color", "fill", "stroke", "outline-color"]) { const v = c.getPropertyValue(p); if (green(v) && !(p.startsWith("border") && c.getPropertyValue(p.replace("color", "width")) === "0px") && !(p === "outline-color" && c.outlineStyle === "none")) hits.push(`${e.tagName}.${(e.getAttribute("class") ?? "").split(" ")[0]} ${p} ${v}`); }
            for (const m of c.boxShadow.matchAll(/rgba?\([^)]*\)/g)) if (green(m[0])) hits.push(`${e.tagName}.${(e.getAttribute("class") ?? "").split(" ")[0]} box-shadow ${m[0]}`); }
          const discs = [...root.querySelectorAll(".p93-done .p93-sn")].map((e) => getComputedStyle(e).backgroundColor);
          return { n: all.length, hits: [...new Set(hits)].slice(0, 12), discs };
        }, ROOT);
        L.check(`${id}: population`, r.n > 200, `${r.n} elements`);
        L.check(`${id}: done discs found`, r.discs.length > 0, `${r.discs.length}`);
        L.check(`${id}: every done disc navy`, r.discs.every((c) => c === NAVY || c === "rgba(0, 0, 0, 0)"), r.discs);
        L.check(`${id}: nothing green`, r.hits.length === 0, r.hits);
      }
    };
    await read();
    L.broken();
    await css(page, `.p41 .p41-bld .p93-done .p93-sn { background: #3e7d5a !important; }`);
    await read();
    L.done(8);
  });

  /* ── P10 · day one ── */
  test(`P10 day one · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    seed(); fix("--no-packages");
    const L = new Lock(`P10-${at}`);
    await open(page, size);
    const read = async () => {
      const r = await page.evaluate((ROOT) => { const root = (0, eval)(ROOT) as HTMLElement;
        const filled = [...root.querySelectorAll("button")].filter((x) => { const t = (x.textContent ?? "").trim(); if (!t || !x.getBoundingClientRect().width) return false; const v = getComputedStyle(x).backgroundColor.match(/[\d.]+/g)?.map(Number) ?? []; const a = v.length > 3 ? v[3] : 1; return a >= 0.5 && (v[0] + v[1] + v[2]) / 3 < 120; }).map((x) => (x.textContent ?? "").trim());
        return { title: root.querySelector("h1.qc1531-t")?.textContent ?? null, btns: root.querySelectorAll(".qc1531-hd .qc1531-acts button").length, right: root.querySelector(".qc1531-hd .qc1531-rc")?.children.length ?? -1,
          steps: [...root.querySelectorAll('[data-pk43="day-one-step"] b')].map((b) => b.textContent), filled, hero: root.querySelectorAll('[data-pk26="hero"]').length }; }, ROOT);
      const x = await boxes(page);
      L.check("headline", r.title === "No packages yet", `${r.title}`);
      L.check("no header buttons", r.btns === 0, `${r.btns}`);
      L.check("no right block", r.right === 0, `${r.right}`);
      L.check("three steps", JSON.stringify(r.steps) === JSON.stringify(["Pick the pieces.", "Send it with your queries.", "See what gets replies."]), r.steps);
      L.check("exactly one filled button", r.filled.length === 1, r.filled);
      L.check("no hero", r.hero === 0, `${r.hero}`);
      L.check("steps left = header left", near(x.steps?.l, x.hd?.l), `${x.steps?.l} vs ${x.hd?.l}`);
      L.check("workspace left = headline left", near(x.work?.l, x.title?.l), `${x.work?.l} vs ${x.title?.l}`);
      L.check("workspace right = header right", near(x.work?.r, x.hd?.r), `${x.work?.r} vs ${x.hd?.r}`);
      L.check("header → desk 48", near((x.desk?.t ?? 0) - (x.hd?.b ?? 0), 48), `${(x.desk?.t ?? 0) - (x.hd?.b ?? 0)}`);
      L.check("Results left/right = the header's", near(x.res?.l, x.hd?.l) && near(x.res?.r, x.hd?.r), x.res);
    };
    await read();
    /* the break: v26's hero in the header's place */
    L.broken();
    await page.evaluate((ROOT) => { const r = (0, eval)(ROOT) as HTMLElement; const w = r.querySelector(".pk43-hdw") as HTMLElement;
      w.outerHTML = `<section class="p6-pb-hero" data-pk26="hero" style="height:420px"><h1>Build your first package</h1><button style="background:#2d3a50;color:#fff">Build my first package</button><button>How it works</button></section>`; }, ROOT);
    await page.waitForTimeout(300);
    await read();
    seed();
    L.done(11);
  });
}

/* ── P8 · Change ── */
test("P8 Change · 1440", async ({ page }) => {
  test.setTimeout(240_000);
  seed();
  const L = new Lock("P8-1440");
  await open(page, W1440);
  const state = () => page.evaluate((ROOT) => { const r = (0, eval)(ROOT) as HTMLElement;
    return { flag: r.querySelector('[data-pk43="flag"]')?.closest("[data-pk43-row]")?.getAttribute("data-pk43-row") ?? null, header: r.querySelector('[data-pk43="going-name"]')?.textContent ?? null,
      bar: r.querySelector('[data-pk43="slim-going"] b')?.textContent ?? null, opts: [...r.querySelectorAll("[data-pk43-option]")].map((o) => o.getAttribute("data-pk43-option")) }; }, ROOT);
  const read = async (choose: boolean) => {
    await page.locator(`${PK.root} [data-pk43="change"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(400);
    const a = await state();
    L.check("population: the fixture has a draft", true, "pk40-draft");
    L.check("the draft is not offered", !a.opts.includes("pk40-draft"), a.opts);
    L.check("every package with a version and a letter is", ["pk40-ready", "pk40-std2", "pk40-std"].every((id) => a.opts.includes(id)) && a.opts.length === 3, a.opts);
    const sel = await page.evaluate((ROOT) => [...((0, eval)(ROOT) as HTMLElement).querySelectorAll('[data-pk43-option][aria-selected="true"]')].map((e) => e.getAttribute("data-pk43-option")), ROOT);
    L.check("the current one is marked", JSON.stringify(sel) === '["pk40-std"]', sel);
    L.check("the rule beneath", (await page.locator(`${PK.root} [data-pk43="change-menu"] p`).first().textContent()) === "A package needs a version and a letter before it can go out.", "");
    if (!choose) return;
    await page.locator(`${PK.root} [data-pk43-option="pk40-std2"]`).first().click(); await page.waitForTimeout(1200);
    const b = await state();
    L.check("choosing moves the flag", b.flag === "pk40-std2", `${b.flag}`);
    L.check("…the header block", b.header === "Standard 2", `${b.header}`);
    L.check("…and the bar", b.bar === "Standard 2", `${b.bar}`);
    L.check("the menu closed, focus on Change", (await page.locator(`${PK.root} [data-pk43="change-menu"]`).count()) === 0 && (await page.evaluate(() => document.activeElement?.getAttribute("data-pk43"))) === "change", "");
    await page.getByRole("button", { name: /^undo$/i }).first().click(); await page.waitForTimeout(1500);
    const c = await state();
    L.check("Undo restores the flag", c.flag === "pk40-std", `${c.flag}`);
    L.check("…the header block", c.header === "Standard", `${c.header}`);
    L.check("…and the bar", c.bar === "Standard", `${c.bar}`);
    await page.locator(`${PK.root} [data-pk43="change"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(300);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    L.check("Esc closes it; focus returns to Change", (await page.locator(`${PK.root} [data-pk43="change-menu"]`).count()) === 0 && (await page.evaluate(() => document.activeElement?.getAttribute("data-pk43"))) === "change", "");
  };
  await read(true);
  /* the break: every live package listed (the draft among them) */
  L.broken();
  await page.addScriptTag({ content: `new MutationObserver(() => { const m = document.querySelector('[data-pk43="change-menu"]'); if (m && !m.querySelector('[data-pk43-option="pk40-draft"]')) { const b = document.createElement("button"); b.setAttribute("role", "option"); b.setAttribute("data-pk43-option", "pk40-draft"); b.textContent = "Draft one"; m.prepend(b); } }).observe(document.body, { subtree: true, childList: true });` });
  await read(false);
  await page.keyboard.press("Escape");
  seed();
  L.done(13);
});

/* ── P11 · no sideways overflow ── */
test("P11 no sideways overflow at 1280, 1024, 820", async ({ page }) => {
  test.setTimeout(300_000);
  seed();
  const L = new Lock("P11");
  const read = async (w: number) => {
    const r = await page.evaluate((ROOT) => { const root = (0, eval)(ROOT) as HTMLElement; const sc = root.closest(".wpg-scroll") as HTMLElement;
      const go = root.querySelector('[data-pk43="going-out"]') as HTMLElement | null, gb = go?.getBoundingClientRect(), main = root.querySelector(".qc1531-hd .qc1531-main")!.getBoundingClientRect(), t = root.querySelector("h1.qc1531-t") as HTMLElement;
      return { sw: sc.scrollWidth, cw: sc.clientWidth, dw: document.documentElement.scrollWidth, ww: innerWidth, go: gb && gb.width > 0 ? { l: gb.left, r: gb.right } : null, mainR: main.right, tClip: t.scrollWidth > t.clientWidth }; }, ROOT);
    L.check(`${w}: the scroller does not scroll sideways`, r.sw <= r.cw, `${r.sw} > ${r.cw}`);
    L.check(`${w}: the document does not`, r.dw <= r.ww, `${r.dw} > ${r.ww}`);
    if (w === 1280) {
      L.check("1280: the right block shows", !!r.go, r);
      L.check("1280: …clear of the title block", !!r.go && r.go.l >= r.mainR - 1, r);
      L.check("1280: the title is not clipped", !r.tClip, `${r.tClip}`);
    }
    if (w < 1100) L.check(`${w}: the right block hides under 1100`, !r.go, r);
  };
  for (const w of [1280, 1024, 820]) { await open(page, { width: w, height: 900 }); await read(w); }
  L.broken();
  await css(page, `.pk43 .pk43-desk { min-width: 1500px !important; } .pk43 .pk43-go { display: grid !important; }`);
  await read(820);
  L.done(10);
});

/* ── the report's screenshots: 1440 and 1717 — at rest, 600 scrolled, a draft with a step open, the Change menu, day
   one; the Query Centre's header beside them ── */
test("shots", async ({ page }) => {
  test.setTimeout(400_000);
  seed();
  const D = `${DIR}/shots`; mkdirSync(D, { recursive: true });
  for (const size of SIZES) {
    const w = size.width;
    await open(page, size); await page.screenshot({ path: `${D}/01-rest-${w}.png` });
    await scrollPage(page, PK.root, 600); await page.screenshot({ path: `${D}/02-scrolled-600-${w}.png` });
    await scrollPage(page, PK.root, 0);
    await page.locator(`${PK.root} [data-pk43-row="pk40-draft"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(700);
    await page.evaluate((ROOT) => { const r = (0, eval)(ROOT) as HTMLElement; const sc = r.closest(".wpg-scroll") as HTMLElement; const b = r.querySelector('[data-pk43="desk"]') as HTMLElement; sc.scrollTop = b.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 84; }, ROOT);
    await page.waitForTimeout(500); await page.screenshot({ path: `${D}/03-draft-${w}.png` });
    await scrollPage(page, PK.root, 0);
    await page.locator(`${PK.root} [data-pk43="change"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(500);
    await page.screenshot({ path: `${D}/04-change-menu-${w}.png` }); await page.keyboard.press("Escape");
    fix("--no-packages"); await open(page, size); await page.screenshot({ path: `${D}/05-day-one-${w}.png` }); seed();
    await openPage(page, OTHERS[0].route, OTHERS[0].root, size); await scrollPage(page, OTHERS[0].root, 0);
    await page.screenshot({ path: `${D}/qc-header-${w}.png`, clip: { x: 0, y: 0, width: w, height: 420 } });
  }
  void MS;
});
