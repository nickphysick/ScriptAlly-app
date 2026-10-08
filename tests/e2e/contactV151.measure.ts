/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15.1 (design-refs/contact-list-v15-1.html) — the rendered locks, §6 of the pack, at 1512 × 900,
 * 1280 × 800 and 1920 × 1080. Each was proved red on the pre-v15.1 build (0e9c98ef) and by its named mutation before
 * its green was believed (reports/contact-list-v15-1/).
 *
 * H1–H5 the hawk · D1–D2 the desk · B1–B2 the band · F1 the footer.
 *
 * ⚠️ RUN AT ONE WORKER (`--workers=1`): B2's all-queried half writes a fixture to the shared harness account and
 * removes it in the same run.
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { expect } from "@playwright/test";
import { LOADED_ROW, checkOverflow, near, openContacts, pixel, sameRgb } from "./cl15Lib";
import { openApp } from "./pageHeaderV2Lib";

const DIR = "reports/contact-list-v15-1";
const WIDTHS = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }] as const;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  write() {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
  }
  /** A run that writes fewer readings than it claims is red, whatever its cases say. */
  done(floor: number) {
    this.write();
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* private mode */ } });
});

/* ── H1–H5 and D1–D2 · the header and the desk, at rest ── */
test("CL15.1-HD · hawk and desk", async ({ page }) => {
  const L = new Ledger("cl151-hd");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const narrow = vp.width < 1440;
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const q = <T extends HTMLElement>(s: string) => root?.querySelector<T>(s) ?? null;
      const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
      const hd = q('[data-cl15="header"]'), txt = q('[data-cl15="header-text"]'), img = q<HTMLImageElement>('[data-cl15="header-art"] img'), desk = q('[data-cl15="desk"]');
      const sc = hd?.closest<HTMLElement>(".wpg-scroll") ?? null;
      const ics = img ? getComputedStyle(img) : null;
      const hb = b(hd), ib = b(img);
      /* the rule is the header's own bottom border: its top edge is the border box's bottom less its width */
      const bw = hd ? parseFloat(getComputedStyle(hd).borderBottomWidth) : 0;
      const ruleTop = hb ? hb.b - bw : null;
      /* what is painted 4px below the rule, inside the drawing's box, and on the rule itself */
      const at = (y: number | null) => { if (!ib || y === null) return null; const e = document.elementFromPoint(ib.l + ib.w / 2, y); return e ? `${e.tagName}${e === img ? "*" : ""}` : "none"; };
      const cards = [...(desk?.querySelectorAll<HTMLElement>(".dsk-card") ?? [])].map((c) => {
        const t = c.querySelector<HTMLElement>(".dsk-title"), h = c.querySelector<HTMLElement>(".dsk-hd"), body = c.querySelector<HTMLElement>(".dsk-body");
        return { h: c.getBoundingClientRect().height, size: t ? getComputedStyle(t).fontSize : null, face: t ? getComputedStyle(t).fontFamily : null,
          gap: h && body ? body.getBoundingClientRect().top - h.getBoundingClientRect().bottom : null };
      });
      return {
        found: !!hd && !!img && !!desk, scrollTop: sc?.scrollTop ?? null, sheetTop: sc ? sc.getBoundingClientRect().top : null, vh: window.innerHeight,
        hd: hb, txt: b(txt), img: ib, desk: b(desk), bw, ruleTop,
        drop: ics && ics.position === "relative" ? parseFloat(ics.top) || 0 : 0, pos: ics?.position ?? null,
        line: hd ? `${getComputedStyle(hd).borderBottomWidth} ${getComputedStyle(hd).borderBottomStyle} ${getComputedStyle(hd).borderBottomColor}` : null,
        below: at(ruleTop === null ? null : ruleTop + bw + 4), onRule: at(ruleTop === null ? null : ruleTop + bw / 2),
        natural: img ? img.naturalWidth : 0, cards,
      };
    });
    if (!r.found || !r.hd || !r.img || !r.txt || !r.desk || r.ruleTop === null || r.sheetTop === null) { L.check("CL15.1 population: header, drawing and desk render", w, false, JSON.stringify({ found: r.found })); continue; }
    L.check("CL15.1 population: header, drawing and desk render, the page at rest, the drawing loaded", w, r.scrollTop === 0 && r.natural > 0 && r.cards.length === 3, `scrollTop ${r.scrollTop} natural ${r.natural} cards ${r.cards.length}`);

    /* H1 */
    L.check(`H1 the drawing is ${narrow ? 380 : 490} wide (±1)`, w, near(r.img.w, narrow ? 380 : 490, 1), `${r.img.w.toFixed(1)}`);
    /* H2 */
    L.check("H2 the drawing's right edge is the desk's right edge (±2)", w, near(r.img.r, r.desk.r, 2), `img ${r.img.r.toFixed(1)} desk ${r.desk.r.toFixed(1)}`);
    /* H3 — precondition first: the rule and the point under it are on screen, or elementFromPoint answers nothing */
    const under = r.img.b - (r.ruleTop + r.bw);
    L.check("H3 precondition: the rule is on screen", w, r.ruleTop > 0 && r.ruleTop + r.bw + 4 < r.vh, `rule ${r.ruleTop} vh ${r.vh}`);
    L.check("H3 the drawing's bottom is 12–24 below the header's hairline", w, under >= 12 && under <= 24, `${under.toFixed(1)}`);
    L.check("H3 4px below the rule, inside the drawing's box, the drawing is what is painted; and on the rule too", w, r.below === "IMG*" && r.onRule === "IMG*", `below ${r.below} on rule ${r.onRule}`);
    L.check("H3 the hairline is 1px ink at 12–14%", w, /^1px solid rgba\(28, 19, 15, 0\.1[234]\)$/.test(r.line ?? ""), `${r.line}`);
    /* H4 — the LAYOUT box is the painted rect less the drop */
    const layoutC = r.img.t - r.drop + r.img.h / 2, textC = (r.txt.t + r.txt.b) / 2;
    L.check("H4 the text block's centre is within 4px of the drawing's LAYOUT box centre (its rect less the drop)", w, Math.abs(textC - layoutC) <= 4, `text ${textC.toFixed(1)} layout ${layoutC.toFixed(1)} drop ${r.drop} (${r.pos})`);
    L.check("H4 the drop is visual only: the header is no taller than the drawing's layout box plus 14", w, r.hd.h <= r.img.h + 14, `header ${r.hd.h.toFixed(1)} drawing ${r.img.h.toFixed(1)}`);
    /* H5 */
    const head = r.img.t - r.sheetTop;
    L.check(`H5 the drawing's top is ${narrow ? 24 : 30} (±3) below the page sheet's top`, w, near(head, narrow ? 24 : 30, 3), `${head.toFixed(1)}`);

    /* D1 */
    const gap = r.desk.t - r.hd.b;
    L.check(`D1 the header's hairline to the desk's top is ${narrow ? 60 : 72} (±2)`, w, near(gap, narrow ? 60 : 72, 2), `${gap.toFixed(1)}`);
    /* D2 */
    L.check(`D2 card titles are Special Elite at ${narrow ? 14 : 16}px`, w, r.cards.every((c) => c.size === (narrow ? "14px" : "16px") && /Special Elite/.test(c.face ?? "")), r.cards.map((c) => `${c.size}`).join(" "));
    L.check(`D2 the header row to the body row is ${narrow ? 12 : 16} (±1)`, w, r.cards.every((c) => c.gap !== null && near(c.gap, narrow ? 12 : 16, 1)), r.cards.map((c) => c.gap?.toFixed(1)).join(" "));
    L.check(`D2 every card is ${narrow ? 194 : 212}px tall or less`, w, r.cards.every((c) => c.h <= (narrow ? 194 : 212)), r.cards.map((c) => c.h.toFixed(1)).join(" "));
    await checkOverflow(page, L, w);
    await shot(page, "header-desk", vp);
  }
  L.done(42);
});

/* the band's boxes, with the band scrolled into the middle of the scroller so its pixels can be sampled */
async function readBand(page: Page) {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const q = <T extends HTMLElement>(s: string) => root?.querySelector<T>(s) ?? null;
    const band = q('[data-cl14="next"]'), fs = q(".fs"), panel = q('[data-fs-part="panel"]'), desk = q('[data-cl15="desk"]'), bar = q('[data-cl14="bar"]');
    const card = (q('[data-fs-part="card"]')?.firstElementChild ?? null) as HTMLElement | null;
    const sc = band?.closest<HTMLElement>(".wpg-scroll") ?? null;
    if (band && sc) sc.scrollTop += band.getBoundingClientRect().top - sc.getBoundingClientRect().top - 120;
    const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
    const cs = band ? getComputedStyle(band) : null;
    const sr = sc ? sc.getBoundingClientRect() : null;
    return {
      state: fs?.getAttribute("data-state") ?? null,
      band: b(band), fs: b(fs), panel: b(panel), desk: b(desk), bar: b(bar),
      bg: cs?.backgroundColor ?? null, border: cs ? `${cs.borderTopWidth} ${cs.borderBottomWidth} ${cs.borderLeftWidth}` : null, radius: cs?.borderTopLeftRadius ?? null,
      /* the sheet's content edges: the scroller's client box (its scrollbar, where one is drawn, is outside it) */
      sheet: sc && sr ? { l: sr.left + sc.clientLeft, r: sr.left + sc.clientLeft + sc.clientWidth, t: sr.top, b: sr.bottom } : null,
      ring: card ? getComputedStyle(card).boxShadow : null,
      over: sc ? sc.scrollWidth - sc.clientWidth : NaN,
    };
  });
}
/** Screenshots for the report, only when asked (`CL151_SHOTS=1`): a routine run must not dirty tracked images. */
const shot = async (page: Page, name: string, vp: { width: number }) => {
  if (!process.env.CL151_SHOTS || vp.width > 1512) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}-${vp.width}.png`, animations: "disabled" });
};
const BAND = [233, 230, 224];
const PAGE = [243, 242, 240];

async function bandChecks(page: Page, L: Ledger, w: string, narrow: boolean, state: string) {
  const r = await readBand(page);
  const where = `${w} · ${state}`;
  if (!r.band || !r.fs || !r.panel || !r.desk || !r.bar || !r.sheet || r.state !== state) { L.check("CL15.1 population: the band, the stage, the desk and the workspace bar render in this state", where, false, JSON.stringify({ state: r.state, band: !!r.band, bar: !!r.bar })); return; }
  L.check("CL15.1 population: the band, the stage, the desk and the workspace bar render in this state", where, true, "");
  /* B1 — the tint itself, and where it is PAINTED (a box-shadow has no box to read: the pixels are the evidence) */
  L.check("B1 the band's background is rgb(233, 230, 224), with no border and no radius", where, r.bg === "rgb(233, 230, 224)" && r.border === "0px 0px 0px" && r.radius === "0px", `${r.bg} · ${r.border} · ${r.radius}`);
  const y = Math.min(r.band.t + 20, r.sheet.b - 4);
  L.check("B1 precondition: the sampled line is inside the band and on screen", where, y > r.band.t && y < r.band.b && y > r.sheet.t && y < r.sheet.b, `y ${y} band ${r.band.t}–${r.band.b} sheet ${r.sheet.t}–${r.sheet.b}`);
  /* ⚠️ THE SHEET SHADES ITS OWN LAST 10px (measured: the page ground reads 240,239,237 at the edge against 243,242,240
     inside). So an edge pixel is compared with the band's colour UNDER THE SAME SHADE: the page ground is sampled at
     the same x, in the gap above the band, and its offset from the page colour is applied to the band's. */
  const yp = r.band.t - 20;
  L.check("B1 precondition: the reference line above the band is page ground, on screen", where, yp > r.sheet.t && yp > r.desk.b && yp < r.band.t, `yp ${yp} desk ${r.desk.b} sheet ${r.sheet.t}`);
  const shaded = async (x: number) => { const page0 = await pixel(page, x, yp); return { got: await pixel(page, x, y), want: BAND.map((v, i) => v + (page0[i] - PAGE[i])), page0 }; };
  const pl = await shaded(r.sheet.l + 1), pr = await shaded(r.sheet.r - 2), pm = await shaded(r.band.l + 4);
  L.check("B1 the tint is painted to the page sheet's left and right content edges (±1)", where,
    sameRgb(pl.got, pl.want, 2) && sameRgb(pr.got, pr.want, 2) && sameRgb(pm.got, BAND, 2) && [pl, pr].every((p) => !sameRgb(p.got, p.page0, 2)),
    `left ${pl.got} (want ${pl.want}) right ${pr.got} (want ${pr.want}) inside ${pm.got}; sheet ${r.sheet.l}–${r.sheet.r}; box ${r.band.l.toFixed(0)}–${r.band.r.toFixed(0)}`);
  L.check("B1 the band's box is narrower than the sheet where the column is (the tint is painted past the box, not laid out past it)", where, r.over <= 0, `over ${r.over}`);
  /* B2 */
  const g1 = r.band.t - r.desk.b, g2 = r.fs.t - r.band.t, g3 = r.band.b - r.fs.b, g4 = r.bar.t - r.band.b;
  L.check(`B2 the desk's bottom to the band's top is ${narrow ? 52 : 64} (±2)`, where, near(g1, narrow ? 52 : 64, 2), `${g1.toFixed(1)}`);
  L.check(`B2 the band's top to the section grid is ${narrow ? 64 : 72} (±2)`, where, near(g2, narrow ? 64 : 72, 2), `${g2.toFixed(1)}`);
  L.check(`B2 the section grid to the band's bottom is ${narrow ? 64 : 72} (±2)`, where, near(g3, narrow ? 64 : 72, 2), `${g3.toFixed(1)}`);
  L.check("B2 the band's bottom to the workspace bar is 56 (±2)", where, near(g4, 56, 2), `${g4.toFixed(1)}`);
  L.check(`B2 the panel sits ${narrow ? 31 : 39} (±2) inside the band's top edge`, where, near(r.panel.t - r.band.t, narrow ? 31 : 39, 2), `${(r.panel.t - r.band.t).toFixed(1)}`);
  if (state === "ready") L.check("B2 the floating card's ring is 1px ink at 10%, its drop shadow unchanged", where, /rgba\(28, 19, 15, 0\.1\) 0px 0px 0px 1px/.test(r.ring ?? "") && /rgba\(28, 19, 15, 0\.45\) 0px 24px 46px -24px/.test(r.ring ?? ""), `${r.ring}`);
  await checkOverflow(page, L, where);
}

/* ── B1–B2 · the band, in the Ready state ── */
test("CL15.1-B · band, ready", async ({ page }) => {
  const L = new Ledger("cl151-band-ready");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    await bandChecks(page, L, `${vp.width}`, vp.width < 1440, "ready");
    await shot(page, "band-ready", vp);
  }
  L.done(36);
});

/* ── B1–B2 · the band, in the All-queried state (its own manuscript, seeded and removed in this run) ── */
test("CL15.1-B · band, all queried", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("cl151-band-done");
  const MS = "aqfx-ms";
  execSync("node tests/e2e/seedAllQueried.mjs A", { stdio: "inherit" });
  try {
    for (const vp of WIDTHS) {
      await openContacts(page, vp);
      await page.evaluate((id) => localStorage.setItem("scriptally_active_manuscript_id", id), MS);
      await page.reload();
      await page.locator(`.aglist ${LOADED_ROW}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
      await page.waitForTimeout(1200);
      await bandChecks(page, L, `${vp.width}`, vp.width < 1440, "done");
      await shot(page, "band-all-queried", vp);
    }
    await page.evaluate(() => localStorage.removeItem("scriptally_active_manuscript_id"));
  } finally {
    execSync("node tests/e2e/seedAllQueried.mjs --clean", { stdio: "inherit" });
  }
  L.done(33);
});

/* ── F1 · the footer, on every route that renders it ── */
test("CL15.1-F · footer", async ({ page }) => {
  const L = new Ledger("cl151-footer");
  const ROUTES = ["/agents", "/queries", "/queries/analytics"];
  for (const route of ROUTES) {
    for (const vp of [WIDTHS[0], WIDTHS[1]]) {
      await openApp(page, route, vp);
      await page.waitForFunction(() => [...document.querySelectorAll<HTMLElement>('[data-probe="app-footer"]')].some((e) => e.getBoundingClientRect().height > 0), null, { timeout: 30_000 }).catch(() => {});
      const where = `${route} · ${vp.width}`;
      const r = await page.evaluate(() => {
        const f = [...document.querySelectorAll<HTMLElement>('[data-probe="app-footer"]')].find((e) => e.getBoundingClientRect().height > 0) ?? null;
        if (!f) return null;
        const fin = f.querySelector<HTMLElement>('[data-probe="app-footer-in"]'), base = f.querySelector<HTMLElement>(".af-base");
        /* the page's background: the nearest ancestor that paints one */
        let page: string | null = null;
        for (let e = f.parentElement; e; e = e.parentElement) { const bg = getComputedStyle(e).backgroundColor; if (bg !== "rgba(0, 0, 0, 0)") { page = bg; break; } }
        const cs = getComputedStyle(f), ics = fin ? getComputedStyle(fin) : null, bcs = base ? getComputedStyle(base) : null;
        const sc = f.closest<HTMLElement>(".wpg-scroll");
        return {
          bg: cs.backgroundColor, page, top: cs.borderTopWidth, shadow: cs.boxShadow, clip: cs.clipPath, mt: cs.marginTop,
          inner: ics ? `${ics.borderTopWidth} ${ics.borderTopStyle} ${ics.borderTopColor}` : null, innerPad: ics?.paddingTop ?? null,
          inW: fin ? fin.getBoundingClientRect().width : null, fW: f.getBoundingClientRect().width,
          base: bcs ? `${bcs.borderTopWidth} ${bcs.borderTopStyle} ${bcs.borderTopColor}` : null,
          cols: f.querySelectorAll('[data-probe="app-footer-col"]').length,
          over: sc ? sc.scrollWidth - sc.clientWidth : NaN,
        };
      });
      if (!r) { L.check("CL15.1 population: the footer renders on this route", where, false, "no footer"); continue; }
      L.check("CL15.1 population: the footer renders on this route, with its three columns", where, r.cols === 3, `${r.cols}`);
      L.check("F1 the footer's background is the page's background (and the page paints one)", where, r.page !== null && (r.bg === r.page || r.bg === "rgba(0, 0, 0, 0)") && r.bg !== "rgb(235, 233, 229)", `footer ${r.bg} page ${r.page}`);
      L.check("F1 no top border, no shadow ground, no clip", where, r.top === "0px" && r.shadow === "none" && r.clip === "none", `${r.top} · ${r.shadow} · ${r.clip}`);
      L.check("F1 the inner wrapper carries the one hairline: 1px ink at 14%, 52 of padding under it", where, r.inner === "1px solid rgba(28, 19, 15, 0.14)" && r.innerPad === "52px", `${r.inner} · ${r.innerPad}`);
      L.check("F1 the hairline runs the content column's width (the inner wrapper is the footer's own box)", where, r.inW !== null && near(r.inW, r.fW, 1), `${r.inW} vs ${r.fW}`);
      L.check("F1 40 above the footer; the bottom row's rule is ink at 10%", where, r.mt === "40px" && r.base === "1px solid rgba(28, 19, 15, 0.1)", `${r.mt} · ${r.base}`);
      L.check("no horizontal overflow of the scroller", where, r.over <= 0, `${r.over}`);
      if (route === "/agents") {
        await page.evaluate(() => { const f = [...document.querySelectorAll<HTMLElement>('[data-probe="app-footer"]')].find((e) => e.getBoundingClientRect().height > 0); f?.scrollIntoView({ block: "end" }); });
        await page.waitForTimeout(300);
        await shot(page, "footer", vp);
      }
    }
  }
  L.done(42);
});
