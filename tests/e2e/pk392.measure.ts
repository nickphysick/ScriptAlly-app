/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39.2 — the locks on the rendered page. FIXTURE: seedPk40.mjs (pk40-ms in use; every document it
 * writes is cleaned in afterAll by manuscript). L7 re-seeds with `--long-name` (the second letter named in 40
 * characters) and the plain seed puts the short name back. Every population is asserted non-zero before a claim about it
 * is believed.
 *
 *   L1 Pattern: the header card has a ::before whose background is the packages tile, at the Contact list's opacity,
 *      faded in from the left; the sheet has no horizontal overflow at 1280 or 1512; the title's text colour is unchanged
 *   L2 Type (rewrites v39.1's L2): exactly three headings compute the typewriter — the h1's highlight, "Your packages"
 *      and the open package's name. The materials tab's label is the one named exception (a label on a tab, not a
 *      heading). "Your packages" is 30px over its 15px italic line, with the art centred on the pair.
 *   L7 Materials (rewrites v39.1's L7): the tab is #5e2f3a and 40 (±1) tall, and its top is the package card's top (±1);
 *      at 1280 a 40-character name shows in full (scrollWidth ≤ clientWidth, no ellipsis); the in-package row is the only
 *      row with the berry edge and has no Add; Add is hidden until hover or focus; every row has its meta line.
 *
 * Breaks: `PK392_MUTATE=<name>` applies that break in the page.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v39-2";
const MUT = process.env.PK392_MUTATE ?? "";
const SIZES = [{ width: 1280, height: 832 }, { width: 1512, height: 982 }] as const;
const seed = (...args: string[]) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...args], { stdio: "pipe" }).toString();
const LONG_NAME = "Comps-forward, for agents who ask for it";
const INK = "rgb(28, 19, 15)";
const BERRY_EDGE = "rgb(155, 74, 87) 3px 0px 0px 0px inset";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const MUTATIONS: Record<string, string> = {
  /* L1: the header loses its pattern */
  L1: `.pk39-hd .pk39-card.phc.phc.phc::before { content: none !important; }`,
  /* L2: the label names go back to the typewriter */
  L2: `[data-pk26="page"].p6.p6.p6 .p9-pkl .p9-pkl-b.p9-pkl-b b { font-family: var(--sp-type) !important; }`,
  /* L7: names are cut off again */
  L7: `[data-pk26="page"] .p9-pb-grid.p9-v39 .p9-lib-list .p9-lr.p9-lr b { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }`,
  /* L7b: Add shows at rest */
  L7b: `[data-pk26="page"] .p9-pb-grid.p9-v39 .p9-lib-list .p9-lr.p9-lr .p9-lr-add { opacity: 1 !important; }`,
};

async function open(page: Page, size: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "pk40-ms"); } catch { /* */ } });
  const css = MUTATIONS[MUT];
  if (css) await page.addInitScript((c) => document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = c; document.head.appendChild(st); }), css);
  await openRoute(page, "/queries/packages", size);
  await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}
const pg = `[data-pk26="page"]`;
const near = (a: number | undefined | null, b: number | undefined | null, t: number) => a != null && b != null && Math.abs(a - b) <= t;

test.describe.configure({ mode: "default" });
test.beforeAll(() => { console.log(seed()); });
test.afterAll(() => { console.log(seed("--clean")); });

/* ── L1 · the header's pattern ── */
for (const size of SIZES) {
  test(`L1 the header card carries the packages pattern; nothing overflows; the title is unchanged, at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L1-${size.width}`);
    await open(page, size);
    const r = await page.evaluate((p) => {
      const card = document.querySelector(`${p} .pk39-card`) as HTMLElement | null;
      if (!card) return null;
      const b = getComputedStyle(card, "::before"), c = getComputedStyle(card);
      const sc = card.closest(".wpg-scroll") as HTMLElement | null, win = card.closest(".ws-window") as HTMLElement | null;
      const h1 = card.querySelector("h1")!, hl = card.querySelector(".hl")!;
      return {
        content: b.content, bg: b.backgroundImage, size: b.backgroundSize, opacity: b.opacity, mask: b.maskImage || b.webkitMaskImage,
        pos: b.position, z: b.zIndex, cardOverflow: c.overflow, cardIso: c.isolation, cardPos: c.position,
        scroll: sc ? { sw: sc.scrollWidth, cw: sc.clientWidth } : null, win: win ? { sw: win.scrollWidth, cw: win.clientWidth } : null,
        doc: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth },
        h1: getComputedStyle(h1).color, hl: getComputedStyle(hl).color,
      };
    }, pg);
    L.check("the header card was measured", !!r, String(r));
    L.check("it has a ::before", !!r && r.content !== "none" && r.content !== "normal", String(r?.content));
    L.check("its background is the packages tile", /\/images\/packages\/packages-pattern\.svg/.test(r?.bg ?? ""), String(r?.bg));
    L.check("the tile is 240 × 240", r?.size === "240px 240px", String(r?.size));
    L.check("at the Contact list's opacity, 0.085 (±0.001)", near(Number(r?.opacity), 0.085, 0.001), String(r?.opacity));
    L.check("faded in from the left (transparent at 0, full from 55%)", /linear-gradient\(90deg, rgba\(0, 0, 0, 0\) 0px, rgb\(0, 0, 0\) 55%/.test(r?.mask ?? ""), String(r?.mask));
    L.check("behind the content (absolute, z-index -1, in an isolated card)", r?.pos === "absolute" && r?.z === "-1" && r?.cardIso === "isolate", `${r?.pos} ${r?.z} ${r?.cardIso}`);
    L.check("inside the card's clip", r?.cardOverflow === "hidden", String(r?.cardOverflow));
    L.check("the sheet's scroller has no horizontal overflow", !!r?.scroll && r.scroll.sw <= r.scroll.cw, JSON.stringify(r?.scroll));
    L.check("the window has no horizontal overflow", !!r?.win && r.win.sw <= r.win.cw, JSON.stringify(r?.win));
    L.check("the document has no horizontal overflow", !!r && r.doc.sw <= r.doc.cw, JSON.stringify(r?.doc));
    L.check("the title's colour is unchanged (#1c130f)", r?.h1 === INK && r?.hl === INK, `${r?.h1} / ${r?.hl}`);
    L.done(12);
  });
}

/* ── L2 · three typewriter headings ── */
test("L2 exactly three headings are set in the typewriter; the materials tab's label is the one exception", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L2");
  await open(page, SIZES[1]);
  const tw = await page.evaluate((p) => {
    const root = document.querySelector(p)!; const out: { tag: string; cls: string; head: boolean; text: string }[] = []; let texts = 0;
    for (const e of root.querySelectorAll("*")) {
      if (!(e as HTMLElement).offsetParent) continue;
      if (![...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) continue;
      texts++;
      if (/special elite/i.test(getComputedStyle(e).fontFamily)) out.push({ tag: e.tagName, cls: String((e as HTMLElement).className), head: !!e.closest("h1, h2, h3, h4"), text: (e.textContent ?? "").trim().slice(0, 40) });
    }
    const h = root.querySelector(".p9-pkl-h") as HTMLElement | null, sub = root.querySelector(".p9-pkl-sub") as HTMLElement | null, ill = root.querySelector(".p9-pkl-k .p9-ill") as HTMLElement | null;
    const hs = h ? getComputedStyle(h) : null, ss = sub ? getComputedStyle(sub) : null;
    const hr = h?.getBoundingClientRect(), sr = sub?.getBoundingClientRect(), ir = ill?.getBoundingClientRect();
    return {
      out, texts,
      h: hs ? { tag: h!.tagName, ff: hs.fontFamily, fs: hs.fontSize, lh: hs.lineHeight, col: hs.color, tt: hs.textTransform, txt: h!.textContent } : null,
      sub: ss ? { ff: ss.fontFamily, fs: ss.fontSize, st: ss.fontStyle, col: ss.color, txt: sub!.textContent, gap: sr && hr ? sr.top - hr.bottom : null } : null,
      art: ir && hr && sr ? { mid: ir.top + ir.height / 2, pair: (hr.top + sr.bottom) / 2, right: ir.right, left: hr.left } : null,
    };
  }, pg);
  const ex = tw.out.filter((x) => /p9-id-libT/.test(x.cls)), rest = tw.out.filter((x) => !/p9-id-libT/.test(x.cls));
  L.check("the census read the page (over 60 text elements)", tw.texts > 60, String(tw.texts));
  L.check("exactly three typewriter headings, besides the tab", rest.length === 3 && rest.every((x) => x.head), JSON.stringify(rest));
  L.check("…the title's", rest.some((x) => /\bhl\b/.test(x.cls)), JSON.stringify(rest));
  L.check("…Your packages", rest.some((x) => /p9-pkl-h/.test(x.cls) && x.tag === "H2"), JSON.stringify(rest));
  L.check("…and the open package's name", rest.some((x) => /p9-po-nm/.test(x.cls)), JSON.stringify(rest));
  L.check("the one exception is the materials tab's label", ex.length === 1 && ex[0].text === "Your materials", JSON.stringify(ex));
  L.check("Your packages: Special Elite 30px/1.1 ink, no capitals", !!tw.h && /special elite/i.test(tw.h.ff) && tw.h.fs === "30px" && tw.h.lh === "33px" && tw.h.col === INK && tw.h.tt === "none", JSON.stringify(tw.h));
  L.check("under it: 'Open one to change it below', serif italic 15px at ink 60%", !!tw.sub && tw.sub.txt === "Open one to change it below" && /source serif/i.test(tw.sub.ff) && tw.sub.fs === "15px" && tw.sub.st === "italic" && tw.sub.col === "rgba(28, 19, 15, 0.6)", JSON.stringify(tw.sub));
  L.check("…4px down (±1)", near(tw.sub?.gap, 4, 1), String(tw.sub?.gap));
  L.check("the art sits to the left, centred on the pair (±1)", !!tw.art && tw.art.right < tw.art.left && near(tw.art.mid, tw.art.pair, 1), JSON.stringify(tw.art));
  L.done(10);
});

/* ── L7 · Your materials as a folder tab ── */
for (const size of SIZES) {
  test(`L7 the materials folder tab, and rows that never cut a name off, at ${size.width}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`L7-${size.width}`);
    console.log(seed("--long-name"));
    try {
      await open(page, size);
      /* an unsent package, so rows offer Add: "Ready one" holds the first letter */
      await page.locator(`${pg} [data-pk39="labels"] [data-pkid="pk40-ready"]`).first().click();
      await page.waitForTimeout(900);
      await page.mouse.move(2, 2);
      const r = await page.evaluate(({ p, long }) => {
        const root = document.querySelector(p)!;
        const tab = root.querySelector('[data-pk39="lib-head"]') as HTMLElement, card = root.querySelector('[data-pk40="open"]') as HTMLElement;
        const lib = root.querySelector('[data-pk39="lib"]') as HTMLElement;
        const rows = [...root.querySelectorAll('[data-pk26="lib-list"] .p9-lr:not(.p9-lr--away)')] as HTMLElement[];
        const rd = rows.map((row) => {
          const b = row.querySelector("b") as HTMLElement, add = row.querySelector(".p9-lr-add") as HTMLElement | null, m = row.querySelector(".p9-lr-m") as HTMLElement | null;
          const bs = getComputedStyle(b), mi = m?.querySelector(".p9-lr-in") as HTMLElement | null;
          /* the "·" after "✓ In this package" is a decorative ::after, as in the ref: read it from the pseudo-element */
          const lead = mi && m!.firstChild === mi ? `${(mi.textContent ?? "").trim()} ${getComputedStyle(mi, "::after").content.replace(/"/g, "")} ` : "";
          return { name: b.textContent, sw: b.scrollWidth, cw: b.clientWidth, to: bs.textOverflow, ws: bs.whiteSpace, edge: getComputedStyle(row).boxShadow,
            add: add ? { vis: getComputedStyle(add).display !== "none", op: getComputedStyle(add).opacity } : null, meta: m ? `${lead}${(m.textContent ?? "").slice(mi && lead ? (mi.textContent ?? "").length : 0)}`.replace(/\s+/g, " ").trim() : null };
        });
        return {
          tab: tab ? { bg: getComputedStyle(tab).backgroundColor, h: tab.getBoundingClientRect().height, top: tab.getBoundingClientRect().top } : null,
          card: card ? card.getBoundingClientRect().top : null, lib: lib ? lib.getBoundingClientRect().top : null,
          rows: rd, long: rd.find((x) => x.name === long) ?? null,
        };
      }, { p: pg, long: LONG_NAME });
      L.check("the tab and the package card were measured", !!r.tab && r.card != null, JSON.stringify({ tab: r.tab, card: r.card }));
      L.check("the tab is #5e2f3a", r.tab?.bg === "rgb(94, 47, 58)", String(r.tab?.bg));
      L.check("the tab is 40 tall (±1)", near(r.tab?.h, 40, 1), String(r.tab?.h));
      L.check("the tab's top is the package card's top (±1)", near(r.tab?.top, r.card, 1), `${r.tab?.top} vs ${r.card}`);
      L.check("the materials card starts 40 under the tab's top (±1)", near(r.lib != null && r.tab ? r.lib - r.tab.top : null, 40, 1), `${r.lib} vs ${r.tab?.top}`);
      L.check("the rows were read (two letters at least)", r.rows.length >= 2, String(r.rows.length));
      if (size.width === 1280) {
        L.check("the 40-character name is on the page", !!r.long, JSON.stringify(r.rows.map((x) => x.name)));
        L.check("…in full: scrollWidth ≤ clientWidth", !!r.long && r.long.sw <= r.long.cw, JSON.stringify(r.long));
        L.check("…and never ellipsised", !!r.long && r.long.to !== "ellipsis" && r.long.ws !== "nowrap", JSON.stringify(r.long));
      }
      const inpk = r.rows.filter((x) => x.edge.includes(BERRY_EDGE)), others = r.rows.filter((x) => !x.edge.includes(BERRY_EDGE));
      L.check("exactly one row has the berry edge", inpk.length === 1, JSON.stringify(r.rows.map((x) => [x.name, x.edge])));
      L.check("…it is the row in this package, and says so first", /^✓ In this package · /.test(inpk[0]?.meta ?? ""), String(inpk[0]?.meta));
      L.check("…and it has no Add", !!inpk[0] && (!inpk[0].add || !inpk[0].add.vis), JSON.stringify(inpk[0]?.add));
      L.check("every row has its meta line (Sent n / Not sent yet)", r.rows.every((x) => /(Sent \d+|Not sent yet)/.test(x.meta ?? "")), JSON.stringify(r.rows.map((x) => x.meta)));
      const withAdd = others.filter((x) => x.add?.vis);
      L.check("the other rows offer Add", withAdd.length >= 1, JSON.stringify(others.map((x) => x.add)));
      L.check("Add is hidden at rest", withAdd.length >= 1 && withAdd.every((x) => x.add!.op === "0"), JSON.stringify(withAdd.map((x) => x.add)));
      /* hover, then focus: Add appears */
      const row = page.locator(`${pg} [data-pk26="lib-list"] .p9-lr:not(.p9-lr--away)`).filter({ has: page.locator(".p9-lr-add:not([disabled])") }).first();
      await row.hover(); await page.waitForTimeout(400);
      const hov = await row.locator(".p9-lr-add").evaluate((e) => getComputedStyle(e).opacity);
      L.check("Add shows on hover", hov === "1", hov);
      await page.mouse.move(2, 2); await page.waitForTimeout(400);
      await row.locator(".p9-lr-add").focus(); await page.waitForTimeout(400);
      const foc = await row.locator(".p9-lr-add").evaluate((e) => getComputedStyle(e).opacity);
      L.check("Add shows on focus", foc === "1", foc);
      L.done(size.width === 1280 ? 16 : 13);
    } finally { console.log(seed()); }
  });
}
