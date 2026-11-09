/**
 * Query Centre v153.4 — the rendered page against design-refs/query-centre-v153-4.html.
 *
 *   R0  readings only (no assertions about the design): the ground, the header's grid, the title and list edges, the
 *       header's height, the title's face, the rail's frame and sections, the ring's legend. Run before and after.
 * Screens and readings to reports/qc-v153-4/.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

/* copied, not imported: importing another *.measure.ts runs its tests in this file's scope */
export const PAGE = ".qc151.qc153";
export async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
  await openRoute(page, "/queries", vp);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
  await expect(page.locator(`${PAGE} [data-qc153="slip"]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}

test.setTimeout(600_000);
export const DIR = "reports/qc-v153-4";
const SIZES = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }];
const TAG = process.env.QC1534_TAG ?? "after";

export async function readings(page: Page) {
  return page.evaluate((sel) => {
    const q = (s: string) => document.querySelector<HTMLElement>(`${sel} ${s}`);
    const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
    const scroll = document.querySelector<HTMLElement>(".ws-window .qc-wpg.qc-wpg--v11 > .wpg-scroll");
    const sc = scroll ? getComputedStyle(scroll) : null;
    const hd = q("[data-qc1531='header']");
    const hs = hd ? getComputedStyle(hd) : null;
    const t = q("[data-qc151='title']");
    const ts = t ? getComputedStyle(t) : null;
    const rail = q("[data-qc153='rail']");
    const rs = rail ? getComputedStyle(rail) : null;
    const rin = q("[data-qc153='rail'] .qc153-rin");
    const rinS = rin ? getComputedStyle(rin) : null;
    const secs = [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc153='rail-sec']`)].map((s) => {
      const b = s.querySelector<HTMLElement>(".qc153-rbody"); const bs = b ? getComputedStyle(b) : null;
      const h = s.querySelector<HTMLElement>(".qc153-rh5 button"); const h5 = h ? getComputedStyle(h) : null;
      return { k: s.dataset.k, mt: getComputedStyle(s).marginTop, bt: getComputedStyle(s).borderTopWidth,
        head: h5 ? `${h5.fontWeight} ${h5.fontSize} ${h5.fontFamily.split(",")[0]} ${h5.color} pad ${h5.padding}` : null,
        body: bs ? `${bs.backgroundColor} r${bs.borderRadius} ${bs.boxShadow} pad ${bs.padding}` : null };
    });
    const art = q(".qc1531-art img");
    const list = q("[data-qc153='list-column']");
    return {
      ground: sc ? { color: sc.backgroundColor, image: sc.backgroundImage.slice(0, 160), size: sc.backgroundSize, repeat: sc.backgroundRepeat } : null,
      header: hs ? { cols: hs.gridTemplateColumns, gap: hs.columnGap, box: box(hd) } : null,
      title: t ? { box: box(t), font: `${ts!.fontWeight} ${ts!.fontSize} ${ts!.fontFamily}`, ls: ts!.letterSpacing } : null,
      titleLeft: box(q(".qc1531-main"))?.x ?? null,
      listLeft: box(list)?.x ?? null,
      listRight: list ? +(list.getBoundingClientRect().right).toFixed(2) : null,
      art: box(art), artCol: box(q(".qc1531-art")),
      rail: rs ? { bg: rs.backgroundColor, shadow: rs.boxShadow, radius: rs.borderRadius, pad: rs.padding, rinBg: rinS?.backgroundColor, box: box(rail) } : null,
      railHead: (() => { const h = q("[data-qc153='rail-head']"); if (!h) return null; const s = getComputedStyle(h); return `${s.backgroundColor} pad ${s.padding} ${s.boxShadow}`; })(),
      secs,
      legend: !!q("[data-qc1531='legend']"), legendHead: !!q("[data-qc1531='lg-head']"),
      ringSvg: box(q("[data-qc1531='ring'] svg")),
      ringRight: (() => { const s = q("[data-qc1531='ring'] svg"); return s ? +s.getBoundingClientRect().right.toFixed(2) : null; })(),
      segN: document.querySelectorAll(`${sel} [data-qc1531='seg-n']`).length,
      ann: document.querySelectorAll(`${sel} [data-qc1534='ann']`).length,
    };
  }, PAGE);
}

for (const vp of SIZES) {
  test(`v153.4 R0 readings · ${TAG} · ${vp.width}`, async ({ page }) => {
    mkdirSync(DIR, { recursive: true });
    await openQc(page, vp);
    const r = await readings(page);
    writeFileSync(`${DIR}/R0-${TAG}-${vp.width}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify(r, null, 1));
    expect(r.header).not.toBeNull();
  });
}

export class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, "assertions run").toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => r.name)).toEqual([]);
  }
}
const near = (a: number | null | undefined, b: number, tol = 1) => a != null && Math.abs(a - b) <= tol;

for (const vp of SIZES) {
  /* P1 — the crisp ground and the typewriter title; screens of the page's top and foot */
  test(`v153.4 P1 ground and title · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`P1-${vp.width}`);
    await openQc(page, vp);
    const r = await readings(page);
    L.check("ground #f5f5f3", r.ground?.color === "rgb(245, 245, 243)", String(r.ground?.color));
    L.check("an even .45 wash over the tile (no fade)", !!r.ground && r.ground.image.startsWith("linear-gradient(rgba(245, 245, 243, 0.45), rgba(245, 245, 243, 0.45))") && r.ground.image.includes("doodle-tile.svg"), String(r.ground?.image));
    L.check("both layers repeat, the tile at 340×360", !!r.ground && r.ground.size === "auto, 340px 360px" && r.ground.repeat === "repeat, repeat", `${r.ground?.size} · ${r.ground?.repeat}`);
    L.check("title in Special Elite 400", !!r.title && r.title.font.startsWith("400 54px") && r.title.font.includes("Special Elite"), String(r.title?.font));
    L.check("title tracking -0.01em", r.title?.ls === "-0.54px", String(r.title?.ls));
    await page.screenshot({ path: `${DIR}/page-top-${vp.width}.png` });
    await page.evaluate(() => { const s = document.querySelector<HTMLElement>(".ws-window .qc-wpg.qc-wpg--v11 > .wpg-scroll"); if (s) s.scrollTop = s.scrollHeight; });
    await page.waitForTimeout(400);
    const foot = await page.evaluate(() => { const s = document.querySelector<HTMLElement>(".ws-window .qc-wpg.qc-wpg--v11 > .wpg-scroll")!; return { top: s.scrollTop, max: s.scrollHeight - s.clientHeight, att: getComputedStyle(s).backgroundAttachment }; });
    L.check("scrolled to the foot", foot.max > 0 && Math.abs(foot.top - foot.max) < 2, JSON.stringify(foot));
    L.check("the pattern scrolls with the page (local)", foot.att.startsWith("local"), foot.att);
    await page.screenshot({ path: `${DIR}/page-bottom-${vp.width}.png` });
    L.done(7);
  });

  /* P2 — the header on the list's grid: title edge on the list edge, the hawk over the rail, the height unchanged */
  test(`v153.4 P2 aligned header · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`P2-${vp.width}`);
    await openQc(page, vp);
    const r = await readings(page);
    L.check("header columns 268 · flexible · 400–560", !!r.header && /^268px [\d.]+px (5[0-5]\d|560|4\d\d)(\.\d+)?px$/.test(r.header.cols), String(r.header?.cols));
    L.check("column gap 28", r.header?.gap === "28px", String(r.header?.gap));
    L.check("title block left = list column left (±1)", near(r.titleLeft, r.listLeft!), `title ${r.titleLeft} · list ${r.listLeft}`);
    const railX = r.rail?.box.x ?? 0;
    const artMid = r.art ? r.art.x + r.art.w / 2 : 0;
    L.check("hawk centred over the rail (±1)", near(artMid, railX + 134), `hawk mid ${artMid} · rail mid ${railX + 134}`);
    L.check("header height 218 (unchanged)", near(r.header?.box.h, 218, 0.5), String(r.header?.box.h));
    writeFileSync(`${DIR}/P2-${vp.width}.json`, JSON.stringify({ titleLeft: r.titleLeft, listLeft: r.listLeft, header: r.header }, null, 1));
    L.done(5);
  });

  /* P3 — the rail as a sidebar: no card, a ruled header, labels over white panels; Most used as rows */
  test(`v153.4 P3 sidebar rail · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`P3-${vp.width}`);
    await openQc(page, vp);
    const r = await readings(page);
    L.check("rail: no fill", r.rail?.bg === "rgba(0, 0, 0, 0)" && r.rail?.rinBg === "rgba(0, 0, 0, 0)", `${r.rail?.bg} · ${r.rail?.rinBg}`);
    L.check("rail: no shadow, radius or padding", r.rail?.shadow === "none" && r.rail?.radius === "0px" && r.rail?.pad === "0px", `${r.rail?.shadow} · ${r.rail?.radius} · ${r.rail?.pad}`);
    L.check("header: no fill, 4 4 12, 2px navy rule", r.railHead === "rgba(0, 0, 0, 0) pad 4px 4px 12px rgb(42, 58, 82) 0px -2px 0px 0px inset", String(r.railHead));
    L.check("four sections", r.secs.length === 4, String(r.secs.length));
    for (const s of r.secs) {
      L.check(`${s.k}: 8px between sections, no hairline`, s.mt === "8px" && s.bt === "0px", `${s.mt} · ${s.bt}`);
      L.check(`${s.k}: label Source Serif 600 12.5 #8a8076, 10 4 8`, s.head === "600 12.5px \"Source Serif 4\" rgb(138, 128, 118) pad 10px 4px 8px", String(s.head));
      if (s.k !== "more") L.check(`${s.k}: a white panel, radius 12, a 1px ring, 6px padding`, s.body === "rgb(255, 255, 255) r12px rgb(232, 225, 214) 0px 0px 0px 1px pad 6px", String(s.body));
    }
    /* Most used: rows, not pills */
    const rows = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc153='quick']`)].map((b) => {
      const s = getComputedStyle(b); const n = b.querySelector<HTMLElement>(".qc153-n"); const ns = n ? getComputedStyle(n) : null;
      return { cls: b.className, pad: s.padding, r: s.borderRadius, w: b.getBoundingClientRect().width, pw: b.parentElement!.getBoundingClientRect().width, title: b.title, nf: ns?.fontFamily.split(",")[0], nc: ns?.color };
    }), PAGE);
    L.check("Most used: rows (population)", rows.length >= 4, String(rows.length));
    for (const q of rows.slice(0, 6)) {
      L.check(`${q.title.slice(0, 18)}: a full-width row 8/10, radius 8`, !q.cls.includes("qc1533-pill") && q.pad === "8px 10px" && q.r === "8px" && near(q.w, q.pw - 12), `${q.cls} · ${q.pad} · ${q.r} · ${q.w}/${q.pw}`);
      L.check(`${q.title.slice(0, 18)}: count Special Elite #8a8076`, q.nf === "\"Special Elite\"" && q.nc === "rgb(138, 128, 118)", `${q.nf} ${q.nc}`);
      L.check(`description kept in title`, q.title.length > 0, q.title);
    }
    /* a Most used row toggles the same state as before: on, the bar counts what the row counted, a second press clears */
    const first = page.locator(`${PAGE} [data-qc153='quick']:not([disabled])`).first();
    const n = Number(await first.getAttribute("data-n"));
    await first.click(); await page.waitForTimeout(300);
    const after = await page.evaluate((sel) => ({ on: document.querySelector(`${sel} [data-qc153='quick'][aria-checked='true']`)?.getAttribute("data-k") ?? null, bg: (() => { const e = document.querySelector<HTMLElement>(`${sel} [data-qc153='quick'][aria-checked='true']`); return e ? `${getComputedStyle(e).backgroundColor} ${getComputedStyle(e).color}` : null; })(), cnt: document.querySelector(`${sel} [data-qc153='bar'] .qc153-cnt b`)?.textContent ?? null, ron: document.querySelector(`${sel} [data-qc153='rail-on']`)?.textContent ?? null }), PAGE);
    L.check("pressed row is on", after.on === (await first.getAttribute("data-k")), String(after.on));
    L.check("on: navy fill, cream text", after.bg === "rgb(42, 58, 82) rgb(244, 238, 229)", String(after.bg));
    L.check("the bar shows the row's count", after.cnt === String(n), `${after.cnt} vs ${n}`);
    L.check("\"1 on\"", after.ron === "1 on", String(after.ron));
    await page.locator(`${PAGE} [data-qc153='rail']`).screenshot({ path: `${DIR}/rail-on-${vp.width}.png` });
    await first.click(); await page.waitForTimeout(300);
    L.check("a second press clears", (await page.locator(`${PAGE} [data-qc153='quick'][aria-checked='true']`).count()) === 0, "");
    await page.locator(`${PAGE} [data-qc153='rail']`).screenshot({ path: `${DIR}/rail-${vp.width}.png` });
    L.done(30);
  });

  /* P4 — the ring alone; one annotation on hover or focus */
  test(`v153.4 P4 ring only · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`P4-${vp.width}`);
    await openQc(page, vp);
    const r = await readings(page);
    L.check("no legend and no legend heading", !r.legend && !r.legendHead, `${r.legend} ${r.legendHead}`);
    L.check("no counts drawn on the segments", r.segN === 0, String(r.segN));
    L.check("ring 214 tall", near(r.ringSvg?.h, 214, 0.5), String(r.ringSvg?.h));
    L.check("ring right edge on the list's right edge (±1)", near(r.ringRight, r.listRight!), `${r.ringRight} · ${r.listRight}`);
    L.check("header height 218 (unchanged)", near(r.header?.box.h, 218, 0.5), String(r.header?.box.h));
    const vis = () => page.evaluate((sel) => [...document.querySelectorAll<SVGGElement>(`${sel} [data-qc1534='ann']`)].filter((a) => Number(getComputedStyle(a).opacity) > 0.5).map((a) => a.dataset.k), PAGE);
    L.check("at rest: no annotation shown", (await vis()).length === 0, JSON.stringify(await vis()));
    L.check("no floating tooltip in the page", (await page.locator(`${PAGE} [data-qc1531='tip']`).count()) === 0, "");
    await page.locator(`${PAGE} [data-qc1531='header']`).screenshot({ path: `${DIR}/header-rest-${vp.width}.png` });
    const segs = await page.locator(`${PAGE} [data-qc1531='seg']`).all();
    L.check("segments (population)", segs.length >= 3, String(segs.length));
    for (const s of segs) {
      const k = await s.getAttribute("data-k");
      await s.hover(); await page.waitForTimeout(260);
      const v = await vis();
      L.check(`hover ${k}: exactly its annotation`, v.length === 1 && v[0] === k, JSON.stringify(v));
      const geo = await page.evaluate(([sel, key]) => {
        const a = document.querySelector<SVGGElement>(`${sel} [data-qc1534='ann'][data-k='${key}']`)!; const sv = a.ownerSVGElement!;
        const ar = a.getBoundingClientRect(), sr = sv.getBoundingClientRect();
        const others = [...sv.querySelectorAll<SVGElement>("[data-qc1531='seg']")].filter((x) => x.dataset.k !== key).map((x) => Number(getComputedStyle(x).opacity));
        return { inside: ar.left >= sr.left - 0.5 && ar.right <= sr.right + 0.5 && ar.top >= sr.top - 0.5 && ar.bottom <= sr.bottom + 0.5, ar: [ar.left, ar.right, ar.top, ar.bottom].map((n) => +n.toFixed(1)), sr: [sr.left, sr.right, sr.top, sr.bottom].map((n) => +n.toFixed(1)), others, label: a.querySelector("text")?.textContent ?? "" };
      }, [PAGE, k] as const);
      L.check(`hover ${k}: the annotation inside the svg's box (never clipped)`, geo.inside, JSON.stringify({ a: geo.ar, s: geo.sr }));
      L.check(`hover ${k}: the other segments fade`, geo.others.every((o) => o < 0.5), JSON.stringify(geo.others));
      L.check(`hover ${k}: label carries count and name`, /\d/.test(geo.label) && /[A-Za-z]/.test(geo.label), geo.label);
      await page.locator(`${PAGE} [data-qc1531='header']`).screenshot({ path: `${DIR}/header-hover-${k}-${vp.width}.png` });
    }
    await page.mouse.move(2, 2); await page.waitForTimeout(260);
    L.check("pointer away: none shown", (await vis()).length === 0, JSON.stringify(await vis()));
    /* keyboard: each segment takes focus and names itself; focus shows exactly one annotation */
    const first = segs[0];
    await first.focus(); await page.waitForTimeout(260);
    const fv = await vis();
    L.check("focus a segment: exactly one annotation", fv.length === 1 && fv[0] === (await first.getAttribute("data-k")), JSON.stringify(fv));
    const name = await first.getAttribute("aria-label");
    L.check("segment named \"X, n of N\"", /^[A-Z][a-z ]+, \d+ of \d+$/.test(name ?? ""), String(name));
    L.check("segment is a focusable button", (await first.getAttribute("tabindex")) === "0" && (await first.getAttribute("role")) === "button", "");
    /* a click toggles the stage filter */
    await first.press("Enter"); await page.waitForTimeout(300);
    L.check("Enter on a segment turns its stage on", (await first.getAttribute("aria-pressed")) === "true" && (await page.locator(`${PAGE} [data-qc153='rail-on']`).count()) === 1, String(await first.getAttribute("aria-pressed")));
    await first.click(); await page.waitForTimeout(300);
    L.check("a click toggles it off", (await first.getAttribute("aria-pressed")) === "false", String(await first.getAttribute("aria-pressed")));
    L.done(25);
  });
}
