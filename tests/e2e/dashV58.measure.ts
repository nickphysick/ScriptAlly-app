/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — the DB58 locks, measured on the rendered page.
 *
 * F1 one screen · F2 never clipped · F3 the chart gives way · H1 the header is the book ·
 * C1 closed queries · R1 the right column has no container · R2 the fixed order ·
 * R3 no action writes · A1 the feed drawer · A2 feed rows · L1 loading does not jump.
 *
 * Every lock states its population first: a probe that finds nothing is a red, never a pass.
 * `DB58_MUTATE=<name>` applies a lock's named break in the page (the in-page ones); the rest are
 * code mutations, run in the measurement worktree and recorded in the report.
 *
 * The states (housekeeping only, ready to query, coming up, none closed) are reached on the shared
 * account with the dev-only review aid in `lib/dashReviewAid`, which LEAVES GROUPS OUT above the
 * plan — it never invents an item — and is absent from a production build.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/dashboard-v58";
const SIZES = [
  { width: 1512, height: 900 }, { width: 1440, height: 760 }, { width: 1280, height: 800 },
  { width: 1280, height: 680 }, { width: 1366, height: 650 },
] as const;
type VP = { width: number; height: number };
const tag = (v: VP) => `${v.width}x${v.height}`;
const MUT = process.env.DB58_MUTATE ?? "";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** The in-page breaks. Each is the lock's own named mutation. */
const MUTATIONS: Record<string, string> = {
  "F1-header-pad": `[data-d58="header"] { padding-top: 146px !important; }`,
  "F2-closed-flex": `[data-d58="closed"] { flex: 1 1 0 !important; min-height: 0 !important; }`,
  "F3-chart-fixed": `[data-d58="active"] { flex: none !important; height: 402px !important; } [data-d58="active"] .os-acplot { flex: none !important; height: 340px !important; }`,
  "R1-white-frame": `[data-d58="right"] { background: #fff !important; box-shadow: 0 0 0 1px rgba(0,0,0,.2) !important; }`,
  "A1-dark-dim": `[data-d58="wash"] { background: rgba(28, 19, 15, 0.28) !important; }`,
  "L1-no-closed-skeleton": `[data-d58="closed"][data-loading="1"] [data-d58="closed-body"] { display: none !important; }`,
};

async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}) {
  /* the seeded manuscript: it has queries at every stage, inside and past their windows */
  await page.addInitScript((f) => {
    Object.assign(window, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* private mode */ }
  }, flags);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"]').first().waitFor({ timeout: 12_000 }).catch(() => {});
  if (!("__SA_DASH_HOLD_MS" in flags)) {
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 }).catch(() => {});
  }
  await page.evaluate(() => document.fonts.ready);
  if (MUT === "H1-stats-line") {
    await page.evaluate(() => {
      const by = document.querySelector('[data-d58="byline"]');
      by?.insertAdjacentHTML("afterend", '<p data-mut="stats"><b>19</b> out with agents · <b>3</b> waiting on you</p>');
    });
  } else if (MUTATIONS[MUT]) {
    await page.addStyleTag({ content: MUTATIONS[MUT] });
  }
  await page.waitForTimeout(700);
}

const shot = async (page: Page, name: string, vp: VP) => {
  if (!process.env.DB58_SHOTS) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}-${tag(vp)}.png`, animations: "disabled" });
};

/** One read of the page's frame: every box the fit locks ask about. */
const readFrame = (page: Page) => page.evaluate(() => {
  const q = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
  const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  const scroller = document.querySelector<HTMLElement>(".ws-wbody");
  const clip = (sel: string) => { const e = q(sel); return e ? { sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth } : null; };
  /* every descendant's box against its card's frame — collected, never thrown at the first */
  const escapes = (sel: string, allow: string[] = []) => {
    const host = q(sel);
    if (!host) return null;
    const hb = host.getBoundingClientRect();
    const out: string[] = [];
    let n = 0;
    for (const el of host.querySelectorAll<HTMLElement>("*")) {
      if (el.closest("svg") || allow.some((a) => el.closest(a))) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      n += 1;
      if (r.bottom > hb.bottom + 1 || r.top < hb.top - 1 || r.right > hb.right + 1 || r.left < hb.left - 1) {
        out.push(`${el.className || el.tagName} ${Math.round(r.left)},${Math.round(r.top)}→${Math.round(r.right)},${Math.round(r.bottom)}`);
      }
    }
    return { n, out: out.slice(0, 5) };
  };
  return {
    page: !!q('[data-d58="page"]'),
    scroller: scroller ? { sh: scroller.scrollHeight, ch: scroller.clientHeight, sw: scroller.scrollWidth, cw: scroller.clientWidth } : null,
    doc: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth },
    header: box(q('[data-d58="header"]')),
    active: box(q('[data-d58="active"]')),
    plot: box(q('[data-d58="active"] .os-acplot')),
    closed: box(q('[data-d58="closed"]')),
    focus: box(q('[data-d58="focus"]')),
    tab: box(q('[data-d58="tab"]')),
    listTitle: box(q('[data-d58="list-title"]')),
    clips: {
      activeFrame: clip('[data-d58="active"] .os-frame'),
      closedFrame: clip('[data-d58="closed"] .os-frame'),
      closedBody: clip('[data-d58="closed-body"]'),
      tiles: clip('[data-d58="tiles"]'),
      focus: clip('[data-d58="focus"]'),
    },
    escapes: {
      active: escapes('[data-d58="active"]', [".os-mentor"]),
      closed: escapes('[data-d58="closed"]'),
      focus: escapes('[data-d58="focus"]'),
    },
    /* the only things that may scroll: the list and the drawer body */
    scrollers: [...document.querySelectorAll<HTMLElement>('[data-d58="page"] *')]
      .filter((e) => e.getBoundingClientRect().height > 0 && e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY))
      .map((e) => e.getAttribute("data-d58") ?? e.className),
  };
});

/* ── F1 · F2 · F3 ──────────────────────────────────────────────────────────────────────────── */

test("DB58 F1–F3 — one screen, never clipped, and the chart gives way", async ({ page }) => {
  const L = new Ledger("fit");
  const seen: Record<string, { closed: number; plot: number }> = {};
  for (const vp of SIZES) {
    await openDash(page, vp);
    const f = await readFrame(page);
    const w = tag(vp);
    L.check("F0", w, f.page, "the v58 page is on screen");
    L.check("F1", w, !!f.scroller && f.scroller.sh <= f.scroller.ch + 1, `scroll ${f.scroller?.sh} against client ${f.scroller?.ch}`);
    L.check("F1", `${w} sideways`, f.doc.sw <= f.doc.cw && !!f.scroller && f.scroller.sw <= f.scroller.cw + 1, `document ${f.doc.sw}/${f.doc.cw} · scroller ${f.scroller?.sw}/${f.scroller?.cw}`);
    for (const [name, c] of Object.entries(f.clips)) {
      L.check("F2", `${w} ${name}`, !!c && c.sh <= c.ch + 1, c ? `scrollHeight ${c.sh} against ${c.ch}` : "absent");
    }
    for (const [name, e] of Object.entries(f.escapes)) {
      L.check("F2", `${w} ${name} population`, !!e && e.n > 3, e ? `${e.n} boxes` : "absent");
      L.check("F2", `${w} ${name} inside its card`, !!e && e.out.length === 0, e ? e.out.join(" | ") || "all inside" : "absent");
    }
    L.check("F2", `${w} scrolling regions`, f.page && f.scrollers.every((s) => s === "list"), `scrolls: ${f.scrollers.join(", ") || "none"}`);
    L.check("F2", `${w} closed inside the window`, !!f.closed && f.closed.b <= vp.height, `closed card bottom ${f.closed?.b} in ${vp.height}`);
    L.check("F3", `${w} chart floor`, !!f.plot && f.plot.h >= 120, `chart ${f.plot?.h}`);
    L.check("F2", `${w} tab clear of the title`, !!f.tab && !!f.listTitle && f.tab.y > f.listTitle.b, `tab top ${f.tab?.y} · title bottom ${f.listTitle?.b}`);
    if (f.closed && f.plot) seen[w] = { closed: f.closed.h, plot: f.plot.h };
    await shot(page, "page", vp);
  }
  const a = seen["1512x900"], b = seen["1280x680"];
  /* ⚠️ THE CLOSED CARD'S HEIGHT IS NOT ONE NUMBER ACROSS THE SIZES, AND THE REFERENCE'S IS NOT EITHER
     (227 at 1512, 235 at 1280: the ring is `15vh` and the tiles go two by two below 1440). What the
     pack means is that it never GIVES height to the chart, so that is what is measured: at each size
     the card is exactly the height its content asks for when the column has room to spare. */
  L.check("F3", "the chart changes", !!a && !!b && Math.abs(a.plot - b.plot) > 20, `chart ${a?.plot} → ${b?.plot}`);
  for (const vp of [SIZES[0], SIZES[3]]) {
    await openDash(page, vp);
    const free = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>('[data-d58="closed"]');
      if (!card) return null;
      const before = card.getBoundingClientRect().height;
      const left = card.parentElement as HTMLElement;
      const keep = left.style.cssText;
      left.style.height = "2400px"; left.style.flex = "none";
      const roomy = card.getBoundingClientRect().height;
      left.style.cssText = keep;
      return { before, roomy };
    });
    L.check("F3", `${tag(vp)} closed is its content's height`, !!free && Math.abs(free.before - free.roomy) <= 1, `in the page ${free?.before} · given 2400px of room ${free?.roomy}`);
  }
  L.done(60);
});

/* ── H1 ────────────────────────────────────────────────────────────────────────────────────── */

test("DB58 H1 — the header is the book", async ({ page }) => {
  const L = new Ledger("header");
  for (const vp of [SIZES[0], SIZES[2]]) {
    await openDash(page, vp);
    const h = await page.evaluate(() => {
      const q = (s: string) => document.querySelector<HTMLElement>(s);
      const vis = (e: HTMLElement | null) => !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none";
      const head = q('[data-d58="header"]');
      const book = q('[data-d58="book"]');
      const btns = q('[data-d58="buttons"]');
      const mid = (e: HTMLElement | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return r.top + r.height / 2; };
      const stored = localStorage.getItem("scriptally_active_manuscript_id");
      const side = document.querySelector<HTMLElement>(".ws-side [data-bsw-title], .ws-panel [data-bsw-title]");
      return {
        h1s: document.querySelectorAll('[data-d58="page"] h1').length,
        title: q('[data-d58="title"]')?.textContent?.trim() ?? null,
        titleTag: q('[data-d58="title"]')?.tagName ?? null,
        eyebrow: q('[data-d58="eyebrow"]')?.textContent?.trim() ?? null,
        byline: q('[data-d58="byline"]')?.textContent?.trim() ?? null,
        expectTitle: head?.getAttribute("data-ms-title") ?? null,
        expectAuthor: head?.getAttribute("data-author") ?? null,
        stored, sideTitle: side?.textContent?.trim() ?? null,
        /* nothing under the byline states a count */
        underByline: book ? [...book.children].map((c) => (c as HTMLElement).innerText.trim()).filter((t) => /\d/.test(t)) : null,
        headerDigits: head ? (head.innerText.match(/\b\d+\b/g) ?? []) : null,
        addAgent: vis(q('[data-d58="btn-agent"]')),
        log: vis(q('[data-d58="btn-log"]')), record: vis(q('[data-d58="btn-record"]')),
        centres: { book: mid(book), btns: mid(btns) },
        bg: head ? getComputedStyle(head).backgroundColor : null,
        shadow: head ? getComputedStyle(head).boxShadow : null,
        titleFace: q('[data-d58="title"]') ? getComputedStyle(q('[data-d58="title"]')!).fontFamily : null,
        titleLines: (() => { const t = q('[data-d58="title"]'); if (!t) return null; const r = document.createRange(); r.selectNodeContents(t); return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; })(),
      };
    });
    const w = tag(vp);
    L.check("H1", `${w} one h1`, h.h1s === 1 && h.titleTag === "H1", `${h.h1s} h1 · title is ${h.titleTag}`);
    L.check("H1", `${w} title`, !!h.title && !!h.expectTitle && h.title === h.expectTitle, `"${h.title}" against the active manuscript "${h.expectTitle}"`);
    L.check("H1", `${w} byline`, !!h.expectAuthor && h.byline === `by ${h.expectAuthor}`, `"${h.byline}" against "by ${h.expectAuthor}"`);
    L.check("H1", `${w} eyebrow`, h.eyebrow === "— NOW QUERYING —", `"${h.eyebrow}"`);
    L.check("H1", `${w} no counts`, !!h.headerDigits && h.headerDigits.length === 0 && (h.underByline?.length ?? 1) === 0, `digits in the header: ${h.headerDigits?.join(",") || "none"}`);
    L.check("H1", `${w} Add an agent`, h.addAgent === (vp.width >= 1440) && h.log && h.record, `add an agent visible: ${h.addAgent} at ${vp.width}`);
    L.check("H1", `${w} centred`, h.centres.book != null && h.centres.btns != null && Math.abs(h.centres.book - h.centres.btns) <= 4, `book ${h.centres.book} · buttons ${h.centres.btns}`);
    L.check("H1", `${w} no raised ground`, h.bg === "rgba(0, 0, 0, 0)" && h.shadow === "none", `${h.bg} · ${h.shadow}`);
    L.check("H1", `${w} typewriter, one line`, /Special Elite/.test(h.titleFace ?? "") && h.titleLines === 1, `${h.titleFace} · ${h.titleLines} line(s)`);
  }
  L.done(16);
});

/* ── C1 ────────────────────────────────────────────────────────────────────────────────────── */

const readClosed = (page: Page) => page.evaluate(() => {
  const q = (s: string) => document.querySelector<HTMLElement>(s);
  const card = q('[data-d58="closed"]');
  const tiles = [...document.querySelectorAll<HTMLElement>('[data-d58="tile"]')];
  return {
    card: !!card,
    title: q('[data-d58="closed-title"]')?.textContent?.trim() ?? null,
    bandBg: q('[data-d58="closed-band"]') ? getComputedStyle(q('[data-d58="closed-band"]')!).backgroundColor : null,
    bandInk: q('[data-d58="closed-title"]') ? getComputedStyle(q('[data-d58="closed-title"]')!).color : null,
    tiles: tiles.map((t) => ({ key: t.getAttribute("data-bucket"), n: Number(t.querySelector('[data-d58="tile-n"]')?.textContent ?? NaN), label: t.querySelector('[data-d58="tile-label"]')?.textContent?.trim(), zero: t.classList.contains("is-zero") })),
    derived: card?.getAttribute("data-derived") ?? null,
    none: q('[data-d58="closed-none"]')?.innerText ?? null,
    latest: q('[data-d58="latest"]')?.innerText ?? null,
    arc: q('[data-d58="arc"]')?.getAttribute("stroke-dasharray") ?? null,
  };
});

test("DB58 C1 — closed queries: the grey band, four outcomes that sum, and none closed", async ({ page }) => {
  const L = new Ledger("closed");
  for (const vp of [SIZES[0], SIZES[2]]) {
    await openDash(page, vp);
    const c = await readClosed(page);
    const w = tag(vp);
    const sum = c.tiles.reduce((s, t) => s + t.n, 0);
    const derived = c.derived ? JSON.parse(c.derived) as { total: number; counts: Record<string, number> } : null;
    L.check("C1", `${w} population`, c.card && c.tiles.length === 4 && sum > 0, `${c.tiles.length} tiles summing to ${sum}`);
    L.check("C1", `${w} band`, c.bandBg === "rgb(228, 225, 219)" && c.bandInk === "rgb(28, 19, 15)", `${c.bandBg} · ink ${c.bandInk}`);
    L.check("C1", `${w} title`, !!derived && c.title === (derived.total === 1 ? "1 closed query" : `${derived.total} closed queries`), `"${c.title}" for ${derived?.total}`);
    L.check("C1", `${w} tiles are the derived counts`, !!derived && c.tiles.every((t) => derived.counts[t.key ?? ""] === t.n), JSON.stringify(c.tiles.map((t) => [t.key, t.n])) + " against " + JSON.stringify(derived?.counts));
    L.check("C1", `${w} sum`, !!derived && sum === derived.total, `tiles ${sum} · title ${derived?.total}`);
    L.check("C1", `${w} labels`, c.tiles.map((t) => t.label).join("|") === "No reply|Passed on query|Passed on partial|Passed on full", c.tiles.map((t) => t.label).join("|"));
    L.check("C1", `${w} a zero is muted, never hidden`, c.tiles.every((t) => t.zero === (t.n === 0)), JSON.stringify(c.tiles.map((t) => [t.n, t.zero])));
    L.check("C1", `${w} latest`, !!c.latest && /(passed on your (query|partial|full)|didn't reply)/.test(c.latest) && /See all/.test(c.latest), `"${c.latest?.replace(/\s+/g, " ")}"`);
    await shot(page, "closed-some", vp);
  }
  await openDash(page, SIZES[0]);
  const again = await readClosed(page);
  const total = again.derived ? (JSON.parse(again.derived) as { total: number; qc: number }) : null;
  L.check("C1", "matches the Query Centre's rule", !!total && total.total <= total.qc, `card ${total?.total} · the Query Centre's closed court ${total?.qc}`);

  for (const vp of [SIZES[0], SIZES[2]]) {
    await openDash(page, vp, { __SA_DASH_NO_CLOSED: true });
    const c = await readClosed(page);
    const w = tag(vp);
    L.check("C1", `${w} none: title`, c.title === "Closed queries", `"${c.title}"`);
    L.check("C1", `${w} none: words`, !!c.none && c.none.includes("None closed yet") && c.none.includes("When an agent passes, or you close a query that has gone quiet, it is counted here with how far it got."), `"${c.none?.replace(/\s+/g, " ")}"`);
    L.check("C1", `${w} none: no tiles, track only`, c.tiles.length === 0 && c.arc === null, `${c.tiles.length} tiles · arc ${c.arc}`);
    await shot(page, "closed-none", vp);
  }
  L.done(22);
});

/* ── R1 · R2 · R3 ──────────────────────────────────────────────────────────────────────────── */

const readRight = (page: Page) => page.evaluate(() => {
  const q = (s: string) => document.querySelector<HTMLElement>(s);
  const right = q('[data-d58="right"]');
  const body = q('[data-d58="body"]');
  const painted: string[] = [];
  for (let e: HTMLElement | null = right; e && body && body.contains(e); e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none" || cs.boxShadow !== "none" || parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) > 0) {
      painted.push(`${e.getAttribute("data-d58")}: ${cs.backgroundColor} ${cs.boxShadow}`);
    }
  }
  const title = q('[data-d58="list-title"]');
  const bar = q('[data-d58="list-bar"]');
  const rows = [...document.querySelectorAll<HTMLElement>('[data-d58="row"]')];
  const focus = q('[data-d58="focus"]');
  return {
    right: !!right,
    painted,
    order: right ? [...right.children].map((c) => c.getAttribute("data-d58") ?? [...c.children].map((x) => x.getAttribute("data-d58")).join("+")) : [],
    title: title?.textContent?.trim() ?? null,
    titleFace: title ? getComputedStyle(title).fontFamily : null,
    bar: bar ? { w: bar.getBoundingClientRect().width, h: bar.getBoundingClientRect().height, bg: getComputedStyle(bar).backgroundColor } : null,
    focus: focus ? { group: focus.getAttribute("data-group"), key: focus.getAttribute("data-key"), label: q('[data-d58="focus-label"]')?.textContent?.trim(), pos: q('[data-d58="focus-pos"]')?.textContent?.replace(/[‹›]/g, "").trim() ?? null, act: q('[data-d58="focus-act"]')?.textContent?.trim(), text: q('[data-d58="focus-say"]')?.textContent?.trim() } : null,
    then: q('[data-d58="then"]')?.innerText.replace(/\s+/g, " ").trim() ?? null,
    groups: [...document.querySelectorAll<HTMLElement>('[data-d58="group"]')].map((g) => ({ key: g.getAttribute("data-group"), label: g.querySelector("span")?.textContent?.trim(), n: Number(g.querySelector("b")?.textContent) })),
    rows: rows.map((r) => ({ key: r.getAttribute("data-key"), group: r.getAttribute("data-group") })),
    counts: right ? JSON.parse(right.getAttribute("data-counts") ?? "{}") as Record<string, number> : {},
    extras: [...document.querySelectorAll<HTMLElement>('[data-d58="coming-extra"] button')].map((b) => b.innerText.replace(/\s+/g, " ").trim()),
    list: (() => { const l = q('[data-d58="list"]'); return l ? { pb: getComputedStyle(l).paddingBottom, oy: getComputedStyle(l).overflowY } : null; })(),
  };
});

test("DB58 R1 — the right column has no container", async ({ page }) => {
  const L = new Ledger("right");
  for (const vp of [SIZES[0], SIZES[2]]) {
    await openDash(page, vp);
    const r = await readRight(page);
    const w = tag(vp);
    L.check("R1", `${w} population`, r.right && r.rows.length > 0, `${r.rows.length} rows`);
    L.check("R1", `${w} nothing painted behind it`, r.right && r.painted.length === 0, r.painted.join(" | ") || "nothing");
    L.check("R1", `${w} order`, r.order.join(">") === "list-head>focus>then>list", r.order.join(">"));
    L.check("R1", `${w} title`, r.title === "What's on the list today?" && /Special Elite/.test(r.titleFace ?? ""), `"${r.title}" in ${r.titleFace}`);
    L.check("R1", `${w} the rust bar`, !!r.bar && Math.abs(r.bar.w - 44) <= 0.5 && Math.abs(r.bar.h - 3) <= 0.5 && r.bar.bg === "rgb(176, 96, 62)", JSON.stringify(r.bar));
    L.check("R1", `${w} the list scrolls inside, clear of the tab`, r.list?.pb === "86px" && r.list?.oy === "auto", JSON.stringify(r.list));
  }
  L.done(12);
});

const LABEL: Record<string, string> = { req: "AGENTS ARE WAITING", nudge: "WORTH A NUDGE", quiet: "GONE QUIET", house: "HOUSEKEEPING", ready: "READY TO QUERY", coming: "COMING UP" };
const ORDER = ["req", "nudge", "quiet", "house", "ready", "coming"];

test("DB58 R2 — the fixed order, on the rendered page", async ({ page }) => {
  const L = new Ledger("order");
  const vp = SIZES[0];
  /* each state is the account's own items with the earlier groups left out */
  const states: { name: string; drop: string[] }[] = [
    { name: "A as the account stands", drop: [] },
    { name: "B no agents waiting", drop: ["req"] },
    { name: "C housekeeping only", drop: ["req", "nudge", "quiet"] },
    { name: "D ready to query", drop: ["req", "nudge", "quiet", "house"] },
    { name: "E coming up", drop: ["req", "nudge", "quiet", "house", "ready"] },
  ];
  const tally: Record<string, number> = {};
  for (const s of states) {
    await openDash(page, vp, { __SA_DASH_DROP: s.drop });
    const r = await readRight(page);
    const live = ORDER.filter((k) => !s.drop.includes(k) && (r.counts[k] ?? 0) > 0);
    const work = live.filter((k) => ["req", "nudge", "quiet", "house"].includes(k));
    const expectFirst = work[0] ?? (live.includes("ready") ? "ready" : "coming");
    const expectGroups = work.length ? work : [expectFirst];
    L.check("R2", `${s.name} · population`, !!r.focus || expectFirst === "coming", `counts ${JSON.stringify(r.counts)}`);
    if (r.focus) tally[r.focus.group ?? "?"] = (tally[r.focus.group ?? "?"] ?? 0) + 1;
    L.check("R2", `${s.name} · the focus is the first group`, (r.focus?.group ?? "coming") === expectFirst, `focus ${r.focus?.group} · expected ${expectFirst} from ${JSON.stringify(r.counts)}`);
    L.check("R2", `${s.name} · label`, !r.focus || r.focus.label === LABEL[r.focus.group ?? ""], `"${r.focus?.label}"`);
    const shown = [...new Set([r.focus?.group, ...r.rows.map((x) => x.group)].filter(Boolean))] as string[];
    const owed = expectGroups.filter((g) => (r.counts[g] ?? 0) > 0);
    L.check("R2", `${s.name} · groups in order, none skipped`, shown.join(">") === owed.join(">"), `shown ${shown.join(">")} · expected ${owed.join(">")}`);
    L.check("R2", `${s.name} · the row groups never go backwards`, r.rows.every((x, i) => i === 0 || ORDER.indexOf(x.group ?? "") >= ORDER.indexOf(r.rows[i - 1].group ?? "")), r.rows.map((x) => x.group).join(","));
    const n = r.counts[expectFirst] ?? 0;
    L.check("R2", `${s.name} · the count`, !r.focus || (n > 1 ? r.focus.pos === `1 OF ${n}` : !r.focus.pos), `"${r.focus?.pos}" for ${n}`);
    L.check("R2", `${s.name} · Then or Also`, !r.then || r.then.startsWith(expectFirst === "ready" || expectFirst === "coming" ? "ALSO" : "THEN") || r.then.toUpperCase().startsWith(expectFirst === "ready" || expectFirst === "coming" ? "ALSO" : "THEN"), `"${r.then}"`);
    if (expectFirst === "coming") {
      L.check("R2", `${s.name} · Add an agent and Discover agents`, r.extras.length === 2 && /Add an agent/.test(r.extras[0]) && /Discover agents/.test(r.extras[1]) && /SOON/.test(r.extras[1]), r.extras.join(" | "));
    }
    /* › steps through the first group only */
    if (r.focus && n > 1) {
      const first = r.focus.key;
      await page.locator('[data-d58="focus-next"]').click();
      await page.waitForTimeout(250);
      const r2 = await readRight(page);
      L.check("R2", `${s.name} · › steps to the second`, r2.focus?.pos === `2 OF ${n}` && r2.focus.key !== first && r2.focus.group === expectFirst, `"${r2.focus?.pos}" · ${first} → ${r2.focus?.key}`);
      L.check("R2", `${s.name} · the first goes back into the list, first`, r2.rows[0]?.key === first && r2.rows.filter((x) => x.group === expectFirst).length === n - 1, `list opens on ${r2.rows[0]?.key}; ${r2.rows.filter((x) => x.group === expectFirst).length} of the group listed`);
    }
    const name = s.name[0] === "C" ? "state-housekeeping" : s.name[0] === "D" ? "state-ready" : s.name[0] === "E" ? "state-coming-up" : null;
    if (name) for (const v of [SIZES[0], SIZES[2]]) { await openDash(page, v, { __SA_DASH_DROP: s.drop }); await shot(page, name, v); }
  }
  console.log(`  R2 focus groups seen: ${JSON.stringify(tally)}`);
  L.check("R2", "more than one state was entered", Object.keys(tally).length >= 3, JSON.stringify(tally));
  L.done(28);
});

test("DB58 R3 — an action opens the flow and writes nothing", async ({ page }) => {
  const L = new Ledger("actions");
  const vp = SIZES[0];
  await openDash(page, vp);
  const before = await readRight(page);
  L.check("R3", "population", !!before.focus && before.rows.length > 0, `focus ${before.focus?.key} · ${before.rows.length} rows`);
  const drawerOpen = () => page.locator("[data-qad-drawer]:visible, .agc-frame:visible, [data-agent-card-frame]:visible").count();

  await page.locator('[data-d58="focus-act"]').click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(900);
  L.check("R3", "the focus action opens the flow", (await drawerOpen()) > 0, `${await drawerOpen()} flow surface(s) open`);
  const mid = await readRight(page);
  L.check("R3", "nothing changed on press", mid.focus?.key === before.focus?.key && mid.rows.length === before.rows.length, `${before.focus?.key} → ${mid.focus?.key} · rows ${before.rows.length} → ${mid.rows.length}`);
  await page.keyboard.press("Escape");
  await page.locator("[data-qad-close], .qad-x, [aria-label='Close']").first().click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(600);

  await openDash(page, vp);
  const tick = page.locator('[data-d58="row"] [data-d58="tick"]').first();
  const tickKey = await page.evaluate(() => document.querySelector('[data-d58="row"] [data-d58="tick"]')?.closest('[data-d58="row"]')?.getAttribute("data-key") ?? null);
  L.check("R3", "a row has a tick", !!tickKey, `${tickKey}`);
  await tick.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(900);
  L.check("R3", "the tick opens the flow", (await drawerOpen()) > 0, `${await drawerOpen()} flow surface(s) open`);
  const after = await readRight(page);
  L.check("R3", "the tick wrote nothing", after.rows.some((x) => x.key === tickKey) && after.rows.length === before.rows.length, `row ${tickKey} still listed: ${after.rows.some((x) => x.key === tickKey)}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.reload();
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(800);
  const reloaded = await readRight(page);
  L.check("R3", "the account is as it was after a reload", reloaded.focus?.key === before.focus?.key && reloaded.rows.length === before.rows.length, `${before.focus?.key} · ${before.rows.length} → ${reloaded.focus?.key} · ${reloaded.rows.length}`);
  L.done(7);
});

/* ── A1 · A2 ───────────────────────────────────────────────────────────────────────────────── */

test("DB58 A1–A2 — the activity feed: the tab, the drawer and its rows", async ({ page }) => {
  const L = new Ledger("feed");
  for (const vp of [SIZES[0], SIZES[2]]) {
    await openDash(page, vp);
    const w = tag(vp);
    const tab = page.locator('[data-d58="tab"]');
    const t = await page.evaluate(() => {
      const e = document.querySelector<HTMLElement>('[data-d58="tab"]');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      const win = document.querySelector(".ws-window")!.getBoundingClientRect();
      return { bg: getComputedStyle(e).backgroundColor, right: win.right - r.right, bottom: win.bottom - r.bottom, text: e.innerText.replace(/\s+/g, " ") };
    });
    L.check("A1", `${w} the tab`, !!t && t.bg === "rgb(42, 58, 82)" && /Activity feed/.test(t.text) && /LAST 30 DAYS/.test(t.text), JSON.stringify(t));
    L.check("A1", `${w} the tab's corner`, !!t && Math.abs(t.right - (vp.width >= 1440 ? 28 : 20)) <= 1.5 && Math.abs(t.bottom - (vp.width >= 1440 ? 26 : 20)) <= 1.5, `right ${t?.right} · bottom ${t?.bottom}`);
    L.check("A1", `${w} no feed card on the page`, (await page.locator('[data-d58="page"] .os-feed, [data-d58="page"] [data-probe="feed"]').count()) === 0, "the feed lives in the drawer");
    await tab.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(700);
    /* ⚠️ the population comes first: where the last 30 days hold no reply from an agent, the window
       is widened to everything, and the run says which window it read */
    const in30 = await page.locator('[data-d58="ev"][data-dir="in"]').count();
    if (in30 === 0) { await page.locator('[data-d58="drawer-range"]').selectOption("all", { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(400); }
    console.log(`  A2 ${w}: window read — ${in30 === 0 ? "everything (no replies in the last 30 days)" : "the last 30 days"}`);
    const d = await page.evaluate(() => {
      const q = (s: string) => document.querySelector<HTMLElement>(s);
      const dr = q('[data-d58="drawer"]'), wash = q('[data-d58="wash"]'), main = document.querySelector(".ws-main")?.getBoundingClientRect();
      const evs = [...document.querySelectorAll<HTMLElement>('[data-d58="ev"]')];
      return {
        open: !!dr,
        bodyBg: q('[data-d58="drawer-body"]') ? getComputedStyle(q('[data-d58="drawer-body"]')!).backgroundColor : null,
        drawerBg: dr ? getComputedStyle(dr).backgroundColor : null,
        headBg: q('[data-d58="drawer-head"]') ? getComputedStyle(q('[data-d58="drawer-head"]')!).backgroundColor : null,
        wash: wash ? getComputedStyle(wash).backgroundColor : null,
        blur: wash ? (getComputedStyle(wash).backdropFilter || (getComputedStyle(wash) as unknown as Record<string, string>).webkitBackdropFilter) : null,
        width: dr && main ? { w: dr.getBoundingClientRect().width, cap: Math.min(640, main.width * 0.52) } : null,
        focusInside: !!dr && dr.contains(document.activeElement),
        sub: q('[data-d58="drawer-sub"]')?.textContent?.trim() ?? null,
        sum: [...document.querySelectorAll<HTMLElement>('[data-d58="sum"]')].map((s) => s.innerText.replace(/\s+/g, " ").trim()),
        days: [...document.querySelectorAll<HTMLElement>('[data-d58="day"]')].map((s) => s.innerText.replace(/\s+/g, " ").trim()).slice(0, 3),
        evs: evs.map((e) => ({ dir: e.getAttribute("data-dir"), card: !!e.querySelector(".d58-evcard"), disc: !!e.querySelector(".d58-evdot:not(.is-sm)"), line: !!e.querySelector(".d58-evline"), act: !!e.querySelector('[data-d58="ev-act"]'), done: e.querySelector('[data-d58="ev-done"]')?.textContent?.trim() ?? null, need: e.getAttribute("data-need") === "1", met: e.getAttribute("data-met") === "1" })),
        end: q('[data-d58="drawer-end"]')?.innerText.replace(/\s+/g, " ").trim() ?? null,
      };
    });
    L.check("A1", `${w} opens`, d.open, "the drawer is on screen");
    L.check("A1", `${w} paper white`, d.bodyBg === "rgb(251, 249, 245)" || d.drawerBg === "rgb(251, 249, 245)", `body ${d.bodyBg} · drawer ${d.drawerBg}`);
    L.check("A1", `${w} ink head`, d.headBg === "rgb(42, 58, 82)", `${d.headBg}`);
    L.check("A1", `${w} the oat wash, no dark dim`, d.wash === "rgba(242, 238, 232, 0.55)" && /blur\(2px\)/.test(d.blur ?? ""), `${d.wash} · ${d.blur}`);
    L.check("A1", `${w} width`, !!d.width && Math.abs(d.width.w - d.width.cap) <= 1.5, JSON.stringify(d.width));
    L.check("A1", `${w} focus is inside`, d.focusInside, "focus moved into the drawer");
    L.check("A1", `${w} summary`, d.sum.length === 3 && /repl(y|ies) from/.test(d.sum[0]) && /things? you did/.test(d.sum[1]) && /still needs? you/.test(d.sum[2]), d.sum.join(" | "));
    const ins = d.evs.filter((e) => e.dir === "in"), outs = d.evs.filter((e) => e.dir === "out");
    console.log(`  A2 ${w}: ${ins.length} from agents · ${outs.length} by you · ${d.evs.filter((e) => e.need).length} open · ${d.evs.filter((e) => e.met).length} met`);
    L.check("A2", `${w} population, both kinds`, ins.length > 0 && outs.length > 0, `${ins.length} in · ${outs.length} out`);
    /* RETIRED (feed drawer v2, 10 Oct): "every reply is a card with a state disc" and "yours is a single line". Every
       event is one row now, dressed by its family: FD2 B1–B4 (tests/e2e/feedDrawerV2.measure.ts). */
    L.check("A2", `${w} an open request shows its action`, d.evs.filter((e) => e.need).every((e) => e.act && !e.done), `${d.evs.filter((e) => e.need && e.act).length} of ${d.evs.filter((e) => e.need).length} open`);
    L.check("A2", `${w} a met request shows the day it went`, d.evs.filter((e) => e.met).every((e) => !e.act && /^✓ Sent on \d/.test(e.done ?? "")), `${d.evs.filter((e) => e.met).map((e) => e.done).slice(0, 3).join(" | ") || "none met in this window"}`);
    L.check("A2", `${w} the end`, !!d.end && /That's (the last 30 days|everything since)/.test(d.end), `"${d.end}"`);
    await shot(page, "feed-open", vp);

    for (const [seg, dir] of [["in", "in"], ["out", "out"]] as const) {
      await page.locator(`[data-d58-seg="${seg}"]`).click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(250);
      const dirs = await page.evaluate(() => [...document.querySelectorAll('[data-d58="ev"]')].map((e) => e.getAttribute("data-dir")));
      L.check("A1", `${w} "${seg === "in" ? "From agents" : "By you"}" filters`, dirs.length > 0 && dirs.every((x) => x === dir), `${dirs.length} shown, ${dirs.filter((x) => x !== dir).length} of the other kind`);
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const closed = await page.evaluate(() => ({ gone: !document.querySelector('[data-d58="drawer"]'), back: document.activeElement?.getAttribute("data-d58") }));
    L.check("A1", `${w} Esc closes and focus returns to the tab`, closed.gone && closed.back === "tab", JSON.stringify(closed));
    await tab.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.mouse.click(Math.round(vp.width * 0.3), Math.round(vp.height * 0.5));
    await page.waitForTimeout(500);
    const out = await page.evaluate(() => ({ gone: !document.querySelector('[data-d58="drawer"]'), back: document.activeElement?.getAttribute("data-d58") }));
    L.check("A1", `${w} a press outside closes it`, out.gone && out.back === "tab", JSON.stringify(out));
  }
  /* RE-POINTED (feed drawer v2): two A2 claims are retired, two readings a size */
  L.done(36);
});

/* ── L1 ────────────────────────────────────────────────────────────────────────────────────── */

test("DB58 L1 — loading and loaded boxes are the same boxes", async ({ page }) => {
  const L = new Ledger("loading");
  for (const vp of [SIZES[0], SIZES[2]]) {
    /* a first visit, so the page has remembered this account's shapes */
    await openDash(page, vp);
    await openDash(page, vp, { __SA_DASH_HOLD_MS: 6000 });
    const held = await readFrame(page);
    const isLoading = await page.evaluate(() => document.querySelector('[data-d58="page"]')?.getAttribute("data-loading"));
    await shot(page, "loading", vp);
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(900);
    const loaded = await readFrame(page);
    const w = tag(vp);
    L.check("L1", `${w} the hold is real`, isLoading === "1", `data-loading ${isLoading}`);
    for (const part of ["header", "active", "closed", "focus", "tab"] as const) {
      const a = held[part], b = loaded[part];
      const same = !!a && !!b && Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && Math.abs(a.w - b.w) <= 1 && Math.abs(a.h - b.h) <= 1;
      L.check("L1", `${w} ${part}`, same, a && b ? `loading ${Math.round(a.x)},${Math.round(a.y)} ${Math.round(a.w * 10) / 10}×${Math.round(a.h * 10) / 10} · loaded ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w * 10) / 10}×${Math.round(b.h * 10) / 10}` : `loading ${!!a} · loaded ${!!b}`);
    }
  }
  L.done(12);
});
