/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * plateHeader — PH1–PH6 of the plate header (ref design-refs/page-header/qc-plate-header-v1.html).
 * Rendered, fonts loaded, at 1280 and 1440. Ledgers land in reports/qc-plate/.
 *
 * ⚠️ PH5's REFERENCE IS CAPTURED PER RUN, NEVER CARRIED. The other pages' headers are living, so their
 * height follows their own counts; a reference kept between runs reads a changed count as damage.
 * `PH5_CAPTURE=1` against the build BEFORE the change writes it; the comparison refuses one older than
 * twelve hours.
 *
 * ⚠️ PH3 GIVES THE FIGURE `pointer-events: auto` FOR ONE READ. It is `none` by design, and
 * `elementFromPoint` skips anything that takes no pointer events — so without that the probe would
 * answer "the plate" whether the figure is above it or not.
 */
import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { BAR_ROUTES, LIVING_ROUTES, openApp } from "./pageHeaderV2Lib";
import { readBar, scrollTo, suppressMotion, tagScroller } from "./quietBarLib";

test.describe.configure({ timeout: Number(process.env.PH_TIMEOUT ?? 900_000) });
const SIZES = [{ width: 1280, height: 800 }, { width: 1440, height: 900 }] as const;
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const DIR = "reports/qc-plate";
const REF = `${DIR}/ph5-reference.json`;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  write() {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(`${DIR}/ledger-${this.name}.json`, JSON.stringify(this.rows, null, 1));
    const by: Record<string, string> = {};
    for (const r of this.rows) { const [p, f] = (by[r.lock] ?? "0/0").split("/").map(Number); by[r.lock] = `${p + (r.ok ? 1 : 0)}/${f + (r.ok ? 0 : 1)}`; }
    console.log(`LEDGER ${this.name} (pass/fail): ${JSON.stringify(by)}`);
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
  }
}

/** The Query Centre's plate and everything PH1–PH4 measure, from boxes and computed styles. */
async function readPlate(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().height > 0;
    const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
    const head = [...document.querySelectorAll('[data-probe="page-header"]')].find(vis) ?? null;
    const plate = head && head.hasAttribute("data-plate") ? head.querySelector('[data-probe="hero-frame"]') : null;
    /* THE COLUMN IS THE GROUP'S CONTENT BOX — its border box includes the page gutter */
    const groupEl = head?.closest(".qcv-group") as HTMLElement | null;
    const group = groupEl ? (() => { const r = groupEl.getBoundingClientRect(); const cs = getComputedStyle(groupEl); const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight); return { l: r.left + pl, r: r.right - pr, t: r.top, b: r.bottom, w: r.width - pl - pr, h: r.height }; })() : null;
    const desk = [...document.querySelectorAll(".qcv-desk")].find(vis) ?? null;
    const bar = [...document.querySelectorAll('[data-probe="navrow"]')].find(vis) ?? null;
    /* the layers are wrappers holding an <img>: the box is the wrapper's, the source the image's */
    const under = plate?.querySelector('[data-probe="art-under"]') ?? null;
    const figure = plate?.querySelector('[data-probe="art-figure"]') ?? null;
    const img = (e: Element | null) => (e ? (e.tagName === "IMG" ? e : e.querySelector("img")) as HTMLImageElement | null : null);
    let clip: Element | null = null;
    for (let p = under?.parentElement ?? null; p; p = p.parentElement) { if (getComputedStyle(p).overflow !== "visible") { clip = p; break; } }
    const probe = document.createElement("div");
    probe.style.background = "var(--fc-card)";
    document.body.appendChild(probe);
    const token = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const ink = (e: Element | null) => {
      if (!e) return null;
      const rg = document.createRange(); rg.selectNodeContents(e);
      const rs = [...rg.getClientRects()].filter((r) => r.width > 0.5);
      return rs.length ? Math.max(...rs.map((r) => r.right)) : null;
    };
    const acts = head?.querySelector(".ph-acts") ?? null;
    const actsRight = acts ? Math.max(...[...acts.querySelectorAll("*")].filter(vis).map((e) => e.getBoundingClientRect().right), -Infinity) : null;
    const ps = plate ? getComputedStyle(plate) : null;
    return {
      head: box(head), plate: box(plate), group, desk: box(desk), bar: box(bar),
      under: box(under), figure: box(figure), clip: box(clip),
      clipOverflow: clip ? getComputedStyle(clip).overflow : null, clipIsPlate: !!clip && clip === plate,
      plateBg: ps?.backgroundColor ?? null, plateRadius: ps?.borderTopLeftRadius ?? null, token,
      /* the intro is read by its BOX — its measure — not its ink, so the claim holds for any copy that fills
         the measure rather than only for today's sentence (a one-line intro clears the art whatever its cap) */
      titleInk: ink(head?.querySelector("h1") ?? null), introInk: (head?.querySelector(".ph-intro") as HTMLElement | null)?.getBoundingClientRect().right ?? null, actsRight,
      underSrc: img(under)?.currentSrc ?? null, figureSrc: img(figure)?.currentSrc ?? null,
    };
  });
}

/** Columns (in natural pixels) where one image is opaque at a natural row and the other is clear. */
async function scanColumns(page: Page, a: string, b: string, y: number, minA: number, maxB: number, fromX: number) {
  return page.evaluate(async ({ a, b, y, minA, maxB, fromX }) => {
    const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const px = (img: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext("2d")!; x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
    const da = px(ia), db = px(ib);
    const al = (d: ImageData, x: number, yy: number) => d.data[(Math.round(yy) * d.width + x) * 4 + 3];
    const out: number[] = [];
    for (let x = Math.ceil(fromX); x < da.width - 2; x++) {
      let ok = true;
      for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) {
        if (al(da, x + dx, y + dy) < minA || al(db, x + dx, y + dy) > maxB) ok = false;
      }
      if (ok) out.push(x);
    }
    return { cols: out, nw: da.width, nh: da.height };
  }, { a, b, y, minA, maxB, fromX });
}

async function pixel(page: Page, x: number, y: number) {
  const buf = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 }, animations: "disabled" });
  /* a 1×1 PNG: decode the single pixel in the page rather than ship a decoder */
  return page.evaluate(async (b64) => {
    const i = new Image(); i.src = `data:image/png;base64,${b64}`; await i.decode();
    const c = document.createElement("canvas"); c.width = 1; c.height = 1; const x = c.getContext("2d")!; x.drawImage(i, 0, 0);
    return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }, buf.toString("base64"));
}
const sameRgb = (p: number[], q: number[], t: number) => p.length === 3 && q.length === 3 && p.every((v, i) => Math.abs(v - q[i]) <= t);

async function openQc(page: Page, vp: { width: number; height: number }) {
  await openApp(page, "/queries", vp);
  await page.locator('[data-probe="page-header"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await suppressMotion(page);
  await page.waitForTimeout(300);
}

for (const vp of SIZES) {
  test(`PH1–PH4 · the Query Centre's plate at ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`ph1-4-${vp.width}`);
    const w = `/queries · ${vp.width}`;
    await openQc(page, vp);
    const p = await readPlate(page);
    writeFileSync(`${DIR}/plate-read-${vp.width}.json`, JSON.stringify(p, null, 1));

    /* PH1 · the plate */
    L.check("PH1 · the header is a plate", w, !!p.plate, `plate ${JSON.stringify(p.plate)}`);
    L.check("PH1 · the plate spans the column (±1)", w, !!p.plate && !!p.group && near(p.plate.l, p.group.l, 1) && near(p.plate.w, p.group.w, 1), `plate ${p.plate?.l}/${p.plate?.w} column ${p.group?.l}/${p.group?.w}`);
    L.check("PH1 · 220 tall", w, near(p.plate?.h, 220, 1), `h ${p.plate?.h}`);
    L.check("PH1 · 16 radius", w, p.plateRadius === "16px", `${p.plateRadius}`);
    L.check("PH1 · the token's white", w, !!p.plate && p.plateBg === p.token, `bg ${p.plateBg} token ${p.token}`);
    L.check("PH1 · 74 between the bar and the plate's top", w, !!p.plate && !!p.bar && near(p.plate.t - p.bar.b, 74, 1), `${p.plate && p.bar ? (p.plate.t - p.bar.b).toFixed(1) : "—"}`);
    L.check("PH1 · the desk starts 26 below the plate", w, !!p.plate && !!p.desk && near(p.desk.t - p.plate.b, 26, 1), `${p.plate && p.desk ? (p.desk.t - p.plate.b).toFixed(1) : "—"}`);

    /* PH2 · the full drawing is clipped by the plate */
    L.check("PH2 · the drawing's clipping ancestor is the plate's box (±1)", w, !!p.clip && !!p.plate && (["l", "t", "w", "h"] as const).every((k) => near(p.clip![k], p.plate![k], 1)), `clip ${JSON.stringify(p.clip)}`);
    L.check("PH2 · and it is overflow hidden", w, p.clipOverflow === "hidden", `${p.clipOverflow}`);
    if (p.plate && p.under && p.figure && p.underSrc && p.figureSrc) {
      const scale = p.under.h / 375;
      const yNat = (p.plate.t - 10 - p.under.t) / scale;
      /* the brush is a see-through layer (alpha ≤ ~176 at this row), so the floor is 60 over a 3×3 patch: unclipped, that is
         still ~18 levels of colour over the ground against a 3-level tolerance */
      const s = await scanColumns(page, p.underSrc, p.figureSrc, yNat, 60, 0, 484 * 0.35);
      L.check("PH2 · precondition: a brush-only column exists 10px above the plate", w, s.cols.length > 0, `${s.cols.length} columns at natural y ${yNat.toFixed(1)}`);
      if (s.cols.length) {
        const x = p.under.l + s.cols[Math.floor(s.cols.length / 2)] * scale;
        const y = p.plate.t - 10;
        const at = await pixel(page, x, y);
        const ground = await pixel(page, p.plate.l + 12, y);
        L.check("PH2 · there, the pixel is the page ground", w, sameRgb(at, ground, 3), `at ${at} ground ${ground} (x ${x.toFixed(1)})`);
      }
    } else L.check("PH2 · both art layers are present", w, false, `under ${!!p.under} figure ${!!p.figure}`);

    /* PH3 · the figure stands above the plate's edge */
    if (p.plate && p.under && p.figure && p.figureSrc && p.underSrc) {
      const scale = p.figure.h / 375;
      const yNat = (p.plate.t - p.figure.t) / scale;
      const s = await scanColumns(page, p.figureSrc, p.underSrc, yNat, 230, 255, 0);
      L.check("PH3 · precondition: the figure crosses the plate's top edge", w, s.cols.length > 0, `${s.cols.length} columns at natural y ${yNat.toFixed(1)}`);
      if (s.cols.length) {
        const x = p.figure.l + s.cols[Math.floor(s.cols.length / 2)] * scale;
        const y = p.plate.t + 0.5;
        const hit = await page.evaluate(({ x, y }) => {
          const f = [...document.querySelectorAll<HTMLElement>('[data-probe="art-figure"]')].find((e) => e.getBoundingClientRect().height > 0)!;
          const els = [f, ...f.querySelectorAll<HTMLElement>("*")];
          const was = els.map((n) => n.style.pointerEvents); els.forEach((n) => { n.style.pointerEvents = "auto"; });
          const e = document.elementFromPoint(x, y); els.forEach((n, i) => { n.style.pointerEvents = was[i]; });
          return e ? (e.closest('[data-probe="art-figure"]') ? "art-figure" : (e.getAttribute("data-probe") ?? e.className.toString())) : null;
        }, { x, y });
        L.check("PH3 · elementFromPoint on the crossing is the figure", w, hit === "art-figure", `${hit}`);
        const shots = async () => Promise.all([-1, 0, 1, 2].map((dy) => pixel(page, x, p.plate!.t + dy)));
        const withEdge = await shots();
        const tag = await page.addStyleTag({ content: '[data-plate] [data-probe="hero-frame"], [data-plate] [data-probe="hero-frame"]::before, [data-plate] [data-probe="hero-frame"]::after { box-shadow: none !important; border-color: transparent !important; outline: none !important; }' });
        const noEdge = await shots();
        await tag.evaluate((n) => (n as Element).remove());
        L.check("PH3 · no hairline or shadow drawn through the figure", w, withEdge.every((c, i) => sameRgb(c, noEdge[i], 3)), `with ${JSON.stringify(withEdge)} without ${JSON.stringify(noEdge)}`);
      }
    }

    /* PH4 · the text clears the art */
    const artLeft = Math.min(p.under?.l ?? Infinity, p.figure?.l ?? Infinity);
    for (const [k, v] of [["title", p.titleInk], ["intro", p.introInk], ["actions", p.actsRight]] as const) {
      L.check(`PH4 · the ${k}'s right edge is left of the art`, w, typeof v === "number" && Number.isFinite(artLeft) && v < artLeft, `${k} ${v} art ${artLeft}`);
    }
    L.write();
    expect(L.rows.length, "PH1–PH4 measured fewer checks than they claim").toBeGreaterThanOrEqual(16);
    expect(L.rows.filter((r) => !r.ok).map((r) => `${r.lock} — ${r.detail}`)).toEqual([]);
  });
}

/* PH5 · every other full header, and QcEmpty, keeps today's geometry */
const PH5_PAGES: { key: string; route: string; empty?: boolean }[] = [
  { key: "contact", route: "/agents" }, { key: "packages", route: "/manuscripts/packages" },
  { key: "comps", route: "/manuscripts/comps" }, { key: "todo", route: "/todo" }, { key: "qc-empty", route: "/queries", empty: true },
];
async function readHeader(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().height > 0;
    const head = [...document.querySelectorAll('[data-probe="page-header"]')].find(vis) ?? null;
    if (!head) return null;
    const box = (e: Element | null) => { if (!e || !vis(e)) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 10) / 10); };
    const pick = (s: string) => box(head.querySelector(s));
    return { plate: head.hasAttribute("data-plate"), header: box(head), frame: pick('[data-probe="hero-frame"]'), title: pick("h1"), intro: pick(".ph-intro"), acts: pick(".ph-acts"), art: pick('[data-probe="art"]'), bg: getComputedStyle(head.querySelector('[data-probe="hero-frame"]') ?? head).backgroundColor };
  });
}
test("PH5 · the plate is the Query Centre's alone", async ({ page }) => {
  const L = new Ledger("ph5");
  const capture = process.env.PH5_CAPTURE === "1";
  const now: Record<string, unknown> = {};
  /* QcEmpty is driven by the dev count override, switched per page load through sessionStorage */
  await page.addInitScript(() => { try { if (sessionStorage.getItem("ph5-empty") === "1") (window as unknown as { __SA_LH_COUNT?: number }).__SA_LH_COUNT = 0; } catch { /* */ } });
  for (const vp of SIZES) for (const pg of PH5_PAGES) {
    await page.goto("/dashboard").catch(() => {});
    await page.evaluate((on) => { try { if (on) sessionStorage.setItem("ph5-empty", "1"); else sessionStorage.removeItem("ph5-empty"); } catch { /* */ } }, !!pg.empty).catch(() => {});
    await openApp(page, pg.route, vp);
    await page.evaluate(() => document.fonts.ready);
    await suppressMotion(page);
    await page.waitForTimeout(300);
    now[`${pg.key}@${vp.width}`] = await readHeader(page);
    if (pg.empty) L.check("PH5 · precondition: the override drew QcEmpty, not the populated page", `${pg.key}@${vp.width}`, await page.evaluate(() => [...document.querySelectorAll('[data-probe="page-header"]')].some((e) => (e as HTMLElement).getBoundingClientRect().height > 0 && !!e.closest("[data-qcv-empty]"))), "the visible header is not inside QcEmpty");
  }
  if (capture) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(REF, JSON.stringify({ at: Date.now(), headers: now }, null, 1));
    console.log(`PH5 reference captured: ${Object.keys(now).length} headers`);
    expect(Object.values(now).every(Boolean), "a header was not found while capturing").toBe(true);
    expect(L.rows.filter((r) => !r.ok).map((r) => `${r.where}: ${r.lock}`), "a precondition failed while capturing").toEqual([]);
    return;
  }
  expect(existsSync(REF), "no PH5 reference — capture one with PH5_CAPTURE=1 against the build before the change").toBe(true);
  const ref = JSON.parse(readFileSync(REF, "utf8")) as { at: number; headers: Record<string, Record<string, unknown> | null> };
  expect(Date.now() - ref.at, "the PH5 reference is older than twelve hours — recapture it").toBeLessThan(12 * 3600_000);
  expect(statSync(REF).size).toBeGreaterThan(100);
  for (const [k, was] of Object.entries(ref.headers)) {
    const is = now[k] as Record<string, unknown> | null;
    L.check("PH5 · the header was found", k, !!was && !!is, "");
    if (!was || !is) continue;
    L.check("PH5 · it carries no plate", k, is.plate === false, `${is.plate}`);
    L.check("PH5 · its frame paints what it painted", k, is.bg === was.bg, `${was.bg} → ${is.bg}`);
    for (const part of ["header", "frame", "title", "intro", "acts", "art"]) {
      const a = was[part] as number[] | null, b = is[part] as number[] | null;
      L.check(`PH5 · ${part} keeps its box (±1)`, k, (a === null && b === null) || (!!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 1)), `${JSON.stringify(a)} → ${JSON.stringify(b)}`);
    }
  }
  L.write();
  expect(L.rows.length, "PH5 measured fewer checks than it claims").toBeGreaterThanOrEqual(80);
  expect(L.rows.filter((r) => !r.ok).map((r) => `${r.where}: ${r.lock} — ${r.detail}`)).toEqual([]);
});

/* PH6 · the hairline at rest, everywhere; the name keeps its rule */
for (const vp of SIZES) {
  test(`PH6 · the bar's hairline at rest on every route at ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`ph6-${vp.width}`);
    const tally = { routes: 0, living: 0, scrolled: 0 };
    for (const route of BAR_ROUTES) {
      await openApp(page, route, vp);
      await suppressMotion(page);
      const w = `${route} · ${vp.width}`;
      const sc = await tagScroller(page);
      if (sc) await scrollTo(page, 0);
      const rest = await readBar(page);
      L.check("PH6 · the bar was found", w, !!rest, "");
      if (!rest) continue;
      tally.routes++;
      L.check("PH6 · at scrollTop 0 the hairline is visible, and no shadow", w, rest.hairline === 1 && rest.shadow === "none", `hairline ${rest.hairline} shadow ${rest.shadow}`);
      const living = LIVING_ROUTES.includes(route);
      if (living) tally.living++;
      L.check(living ? "PH6 · (living) at rest the crumb is shown, as before" : "PH6 · at rest the page name is hidden", w,
        !!rest.name && (living ? rest.name.opacity === 1 && rest.name.ariaHidden === null : rest.name.opacity === 0 && rest.name.ariaHidden === "true"), JSON.stringify(rest.name));
      if (sc && sc.max >= 3) {
        tally.scrolled++;
        await scrollTo(page, 3);
        const s3 = await readBar(page);
        L.check("PH6 · scrolled, the hairline is still there and still no shadow", w, !!s3 && s3.hairline === 1 && s3.shadow === "none", `hairline ${s3?.hairline} shadow ${s3?.shadow}`);
      }
    }
    L.check("PH6 · population: every route, every living one, and some scrolled", "all", tally.routes === BAR_ROUTES.length && tally.living === LIVING_ROUTES.length && tally.scrolled >= 5, JSON.stringify(tally));
    L.write();
    expect(L.rows.length).toBeGreaterThanOrEqual(BAR_ROUTES.length * 3);
    expect(L.rows.filter((r) => !r.ok).map((r) => `${r.where}: ${r.lock} — ${r.detail}`)).toEqual([]);
  });
}
