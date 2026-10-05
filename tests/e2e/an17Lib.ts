/**
 * an17Lib — the shared readings for analyticsV17.measure.ts (ref design-refs/analytics-v17.html).
 *
 * ⚠️ PROBES ARE THE `data-a17` CONTRACT the v17 components carry, read off the VISIBLE page root only
 * (every workspace page stays mounted, so `document` reaches every other page too). A probe that cannot
 * find its subject returns null and the lock that asked FAILS on it — it never skips.
 *
 * ⚠️ ONE LEDGER FILE PER LOCK, written by the lock's own case, so a worker restart after a failure
 * cannot overwrite another lock's rows (the v2a/v13 mutation runs found that the hard way).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const ROUTE = "/queries/analytics";
export const DIR = "reports/analytics-v17";
export const DESKTOP = [
  { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1512, height: 900 }, { width: 1920, height: 1080 },
] as const;
export const PHONE = [{ width: 390, height: 844 }, { width: 414, height: 896 }, { width: 760, height: 1024 }] as const;
export const AT_1512 = { width: 1512, height: 900 } as const;
export const ANTH = "rgb(42, 58, 82)";

/** The five locked state fills, as computed colours (f12.css :root). */
export const STATE_RGB: Record<string, string> = {
  queried: "rgb(247, 239, 227)",
  requested: "rgb(245, 230, 223)",
  sent: "rgb(224, 229, 221)",
  offer: "rgb(215, 224, 232)",
  closed: "rgb(228, 225, 219)",
};
export const FILLS = new Set(Object.values(STATE_RGB));
/** The rust the page draws with: `--o-ms` (#8a4a3c) — the ref's #b4553f has no token. */
export const RUST = "rgb(138, 74, 60)";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  write() {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`LEDGER ${this.name}: ${this.rows.length} readings, ${this.rows.filter((r) => !r.ok).length} failed`);
  }
  done(floor: number) {
    this.write();
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

export const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

/** Open the page and wait for its skeleton to go; reveal every scroll-in block (transitions are off). */
export async function openAn(page: Page, vp: { width: number; height: number }, route = ROUTE) {
  if (vp.width <= 760) {
    /* ⚠️ THE SHARED `openRoute` CANNOT OPEN A PHONE WIDTH: it waits for the first `.ws-panel, …` to be
       visible, and below 768px that first match is the sidebar, hidden by the mobile chrome (measured: 30s
       of "unexpected value hidden" at 390). Sign in at a desktop size, then resize and reload — the session
       lives in IndexedDB, so it survives the reload. */
    await openRoute(page, route, { width: 1440, height: 900 });
    await page.setViewportSize(vp);
    await page.reload();
    await page.waitForFunction(() => [...document.querySelectorAll<HTMLElement>('[data-a17="page"], .wpg-scroll')].some((e) => e.getBoundingClientRect().height > 0), null, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2000);
  } else {
    await openRoute(page, route, vp);
  }
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForFunction(() => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    return !!p && !p.querySelector('[data-a17="skeleton"]');
  }, null, { timeout: 20_000 }).catch(() => {});
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  await page.evaluate(() => document.querySelectorAll(".a17-rv").forEach((e) => e.classList.add("in")));
  await page.waitForTimeout(400);
}

/** The scroller's horizontal overflow (the visible page's `.wpg-scroll`). */
export async function overflowX(page: Page) {
  return page.evaluate(() => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    const sc = (p?.closest(".wpg-scroll") as HTMLElement | null) ?? null;
    if (!sc) return { found: false, over: NaN };
    return { found: true, over: sc.scrollWidth - sc.clientWidth };
  });
}
export async function checkOverflow(page: Page, L: Ledger, where: string) {
  const o = await overflowX(page);
  L.check("no horizontal overflow of the scroller", where, o.found && o.over <= 0, `found ${o.found} over ${o.over}`);
}

export async function pixel(page: Page, x: number, y: number) {
  const buf = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 }, animations: "disabled" });
  return page.evaluate(async (b64) => {
    const i = new Image(); i.src = `data:image/png;base64,${b64}`; await i.decode();
    const c = document.createElement("canvas"); c.width = 1; c.height = 1; const x = c.getContext("2d")!; x.drawImage(i, 0, 0);
    return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }, buf.toString("base64"));
}
export const sameRgb = (p: number[], q: number[], t: number) => p.length === 3 && q.length === 3 && p.every((v, i) => Math.abs(v - q[i]) <= t);

/** Scroll the visible page's scroller so section `sec` sits at the top; returns false if it is not there. */
export async function scrollToSec(page: Page, sec: number, offset = 0) {
  return page.evaluate(([sec, offset]) => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    const sc = p?.closest(".wpg-scroll") as HTMLElement | null;
    const t = p?.querySelector<HTMLElement>(`[data-a17="sec"][data-sec="${sec}"]`);
    if (!sc || !t) return false;
    sc.scrollTop = t.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop + offset;
    return true;
  }, [sec, offset] as const);
}

/**
 * Every reading the desktop locks need, in one pass. A real function (not a template string), so a
 * regex in here keeps its escapes.
 */
export async function readDesk(page: Page) {
  return page.evaluate(() => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    if (!p) return null;
    const vis = (s: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const all = (s: string, root: ParentNode = p) => [...root.querySelectorAll<HTMLElement>(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 || r.height > 0; });
    const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
    const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
    const ps = cs(p)!;
    const pr = p.getBoundingClientRect();
    const col = { l: pr.left + parseFloat(ps.paddingLeft), r: pr.right - parseFloat(ps.paddingRight) };
    const band = vis('[data-probe="page-header"][data-band]', p);
    const sc = p.closest(".wpg-scroll") as HTMLElement | null;
    const fillOf = (e: Element) => { const s = getComputedStyle(e); return (e instanceof SVGElement ? s.fill : s.backgroundColor) || ""; };
    const secs = all('[data-a17="sec"]').map((s) => {
      const ban = s.querySelector<HTMLElement>('[data-a17="ban"]');
      const perch = s.querySelector<HTMLElement>('[data-a17="perch"]');
      const frame = s.querySelector<HTMLElement>('[data-a17="frame"], [data-a17="ws"]');
      const title = s.querySelector<HTMLElement>('[data-a17="ban-title"]');
      const lh = title ? parseFloat(getComputedStyle(title).lineHeight) : NaN;
      return {
        sec: Number(s.dataset.sec), box: b(s), ban: b(ban), banBg: ban ? getComputedStyle(ban).backgroundColor : null,
        banImg: ban ? getComputedStyle(ban).backgroundImage : null,
        perch: b(perch), perchZ: perch ? Number(getComputedStyle(perch).zIndex) || 0 : null,
        perchParentZ: perch?.parentElement ? Number(getComputedStyle(perch.closest('[data-a17="ban"]') as Element).zIndex) || 0 : null,
        frame: b(frame), frameZ: frame ? Number(getComputedStyle(frame).zIndex) || 0 : null,
        titleText: title?.textContent ?? "", titleH: title?.getBoundingClientRect().height ?? NaN, titleLines: title ? Math.round(title.getBoundingClientRect().height / lh) : NaN,
        frameBg: frame ? getComputedStyle(frame).backgroundColor : null, frameRadius: frame ? getComputedStyle(frame).borderTopLeftRadius : null,
      };
    });
    const glance = vis('[data-a17="glance"]', p);
    const cells = glance ? all('[data-a17="gcell"]', glance).map((c) => ({
      v: c.querySelector('[data-a17="gv"]')?.textContent?.trim() ?? "",
      cmp: c.querySelector('[data-a17="gcmp"]')?.textContent?.trim() ?? "",
      sparkMarks: [...c.querySelectorAll<SVGGraphicsElement>('[data-a17="spark-mark"]')].filter((m) => { const r = m.getBoundingClientRect(); return r.width > 0 || r.height > 0; }).length,
      colours: [...c.querySelectorAll<HTMLElement>("*")].map((e) => [getComputedStyle(e).color, getComputedStyle(e).fill, getComputedStyle(e).stroke]).flat(),
    })) : [];
    const fbars = all('[data-a17="fbar"]').map((e) => ({ w: e.getBoundingClientRect().width, count: Number(e.dataset.count) }));
    const went = all('[data-a17="went"]').map((e) => ({ text: e.textContent ?? "", fill: getComputedStyle(e).fill, color: getComputedStyle(e).color }));
    const logdots = all('[data-a17="logdot"]').map((e) => ({ fill: getComputedStyle(e).fill, bucket: e.dataset.bucket ?? "" }));
    const wkbars = all('[data-a17="wkbar"]').map((e) => ({ count: Number(e.dataset.count), fill: getComputedStyle(e).fill }));
    const shares = all('[data-a17="share"]').map((s) => ({
      total: Number(s.dataset.total),
      segs: [...s.querySelectorAll<HTMLElement>('[data-a17="seg"]')].map((g) => ({ count: Number(g.dataset.count), bucket: g.dataset.bucket ?? "", fill: getComputedStyle(g).fill })),
    }));
    const replyFig = vis('[data-a17="fig"][data-key="reply"]', p);
    const rrows = all('[data-a17="rrow"]').map((r) => ({
      late: r.dataset.late === "true", leaders: r.querySelectorAll('[data-a17="leader"]').length,
      leaderStroke: r.querySelector('[data-a17="leader"]') ? getComputedStyle(r.querySelector('[data-a17="leader"]')!).stroke : null,
      dotFill: r.querySelector('[data-a17="rdot"]') ? getComputedStyle(r.querySelector('[data-a17="rdot"]')!).fill : null,
    }));
    const recs = all('[data-a17="rec"]').map((r) => ({
      key: r.dataset.key ?? "", v: r.querySelector('[data-a17="rec-v"]')?.textContent?.trim() ?? "",
      /* StatusDot's own signature (src/test/statusDotSignature.ts): an img-role span holding the 24-unit
         viewBox with its r=10 ring — a ring recreated in the ref's 20-unit drawing cannot satisfy it */
      statusDot: [...r.querySelectorAll('[data-a17="medal"] span[role="img"] > svg[viewBox="0 0 24 24"]')].filter((s) => s.querySelector('circle[r="10"]')).length,
      svgs: r.querySelectorAll('[data-a17="medal"] svg').length,
    }));
    const lanes = all('[data-a17="lane"]').map((e) => ({ fill: getComputedStyle(e).fill, r: e.getBoundingClientRect().right }));
    const today = vis('[data-a17="today"]', p);
    const plot = vis('[data-a17="lanes-plot"]', p);
    const ws = vis('[data-a17="ws"]', p);
    const wsBand = ws ? ws.querySelector('[data-a17="ws-band"]') : null;
    const foot = vis('[data-probe="app-footer"]', p);
    const footIn = vis('[data-probe="app-footer-in"]', p);
    const main = vis(".ws-main");
    const bar = vis('[data-probe="navrow"]');
    const strip = glance ? glance.querySelector('[data-a17="frame"]') : null;
    return {
      sent: Number(p.dataset.sent ?? "-1"), dated: Number(p.dataset.dated ?? "-1"), col, page: b(p), sc: b(sc), main: b(main), bar: b(bar),
      band: b(band), bandBg: cs(band)?.backgroundColor ?? null,
      bandTitle: band?.querySelector("h1")?.textContent?.trim() ?? null,
      bandText: b(band?.querySelector('[data-probe="band-text"]') ?? null), disc: b(band?.querySelector('[data-probe="band-disc"]') ?? null),
      glance: b(glance), strip: b(strip), cells, secs, fbars, went,
      funnelFig: (() => { const f = vis('[data-a17="fig"][data-key="funnel"]', p); return f ? { counts: f.dataset.counts ?? "" } : null; })(),
      logdots, wkbars, shares, rrows, replyPop: replyFig ? Number(replyFig.dataset.population ?? "-1") : null, recs,
      lanes, lanesPop: (() => { const f = vis('[data-a17="fig"][data-key="lanes"]', p); return f ? Number(f.dataset.population ?? "-1") : null; })(),
      today: b(today), todayStroke: today ? getComputedStyle(today).stroke : null, plot: b(plot),
      ws: b(ws), wsBg: cs(ws)?.backgroundColor ?? null, wsRadius: cs(ws)?.borderTopLeftRadius ?? null,
      wsBandBg: cs(wsBand)?.backgroundColor ?? null, wsCards: ws ? [...ws.querySelectorAll<HTMLElement>('[data-a17="ws-card"]')].map((c) => getComputedStyle(c).backgroundColor) : [],
      foot: b(foot), footIn: b(footIn),
    };
  });
}

export type Desk = NonNullable<Awaited<ReturnType<typeof readDesk>>>;
