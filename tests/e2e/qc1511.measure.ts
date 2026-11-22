/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151.1 — the QC1511 locks (design-refs/query-centre-v151-1/), on the rendered page at 1280 × 800 and
 * 1512 × 900. Each asserts its population first and was red first: against the v151 build it replaces (QC1511_BASE=1)
 * and against its named mutation (QC1511_MUTATE=L<n>, applied in the page).
 *
 *   L1 removed · L2 summary card · L3 quick filters · L4 control line · L5 pill row · L6 group headers · L7 mini cards
 *   L8 agent cell · L9 next + action · L10 background. (L11 is QC151 L14/L15; L12 is the QC151 locks that still apply.)
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { openRoute } from "./measure";

test.setTimeout(420_000);
const DIR = "reports/qc-v151-1";
const MUT = process.env.QC1511_MUTATE ?? "";
const BASE = process.env.QC1511_BASE === "1";
const ONLY = process.env.QC1511_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
type VP = { width: number; height: number };
const NAVY = "rgb(42, 58, 82)", PINK = "rgb(243, 200, 186)", INK = "rgb(28, 19, 15)", LATE = "rgb(138, 58, 40)";
const TINT: Record<string, string> = { you: "rgb(243, 227, 220)", agent: "rgb(227, 232, 238)", quiet: "rgb(239, 233, 223)", closed: "rgb(235, 231, 225)" };

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** the named breaks, expressed in the page */
const PAGE_MUT: Record<string, { css?: string; js?: string }> = {
  /* the info banner restored */
  L1: { js: `(() => { const go = () => { const h = document.querySelector('[data-qc151="header"]'); if (h && !document.querySelector('[data-qc151="banner"]')) { const b = document.createElement('section'); b.setAttribute('data-qc151', 'banner'); b.textContent = 'Each row is one query to one agent'; h.after(b); } }; go(); new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); })()` },
  /* the summary pills dropped */
  L2: { css: `.qc1511-sum-ps.qc1511-sum-ps { display: none !important; }` },
  /* the default is Your move */
  L3: { js: `(() => { const b = [...document.querySelectorAll('[data-qc1511="quick"] [data-k="you"]')].find((e) => e.getBoundingClientRect().height > 0); if (b) b.click(); })()` },
  /* the control line wrapped in a card */
  L4: { css: `.qc1511-cl.qc1511-cl { background: #fff !important; border-radius: 14px !important; box-shadow: 0 0 0 1px #e6dfd5 !important; padding: 10px 14px !important; }` },
  /* the pill row rendered at the defaults */
  L5: { js: `(() => { const go = () => { const c = document.querySelector('[data-qc1511="control-line"]'); if (c && !document.querySelector('[data-qc1511="pills"]')) { const d = document.createElement('div'); d.setAttribute('data-qc1511', 'pills'); d.className = 'qc1511-pr'; d.innerHTML = '<button class="qc1511-fadd">+ Filter</button>'; c.after(d); } }; go(); new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); })()` },
  /* the group header not sticky */
  L6: { css: `.qc1511-gh.qc1511-gh td { position: static !important; }` },
  /* (re-pointed to v151.2) the rows' 8px spacing restored */
  L7: { css: `.qc151-tbl.qc1511-tbl.qc1511-tbl { border-spacing: 0 8px !important; }` },
  /* the Agency column restored */
  L8: { js: `(() => { const go = () => { for (const r of document.querySelectorAll('[data-qc151="row"]:not([data-m8])')) { r.setAttribute('data-m8', ''); const td = document.createElement('td'); td.setAttribute('data-qc151', 'agency-col'); td.textContent = r.querySelector('[data-qc151="agency"]')?.textContent ?? ''; r.children[1].after(td); } for (const h of document.querySelectorAll('[data-qc1511="group-header"]:not([data-m8])')) { h.setAttribute('data-m8', ''); const td = document.createElement('td'); td.className = 'qc1511-lbl'; td.setAttribute('data-qc1511', 'label'); td.setAttribute('data-k', 'agency'); td.innerHTML = '<button>Agency</button>'; h.children[0].after(td); } }; go(); new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); })()` },
  /* the button in the Next column */
  L9: { js: `(() => { const go = () => { for (const r of document.querySelectorAll('[data-qc151="row"]')) { const b = r.querySelector('[data-qc1511="action"] [data-qc151="move"]'); const nx = r.querySelector('[data-qc151="next"]'); if (b && nx) nx.append(b); } }; go(); new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); })()` },
  /* the doodles tiled down the whole sheet */
  L10: { css: `.qc-wpg.qc-wpg--v11 > .wpg-scroll.wpg-scroll { background-image: url("/images/qc/doodle-tile.svg") !important; background-size: 340px 360px !important; background-repeat: repeat !important; }` },
};
async function mutate(page: Page) {
  const m = PAGE_MUT[MUT];
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) { await page.evaluate(m.js); await page.waitForTimeout(400); }
}

type Open = { group?: string; view?: "list" | "birds" };
async function open(page: Page, vp: VP, o: Open = {}) {
  await page.addInitScript((x: Open) => {
    try {
      sessionStorage.removeItem("qh.qc.filters");
      sessionStorage.removeItem("qh.qc.collapsed1511");
      sessionStorage.setItem("qh.qc.view150", x.view ?? "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: x.group ?? "attention", sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1");
      localStorage.setItem("sa.guide.queries-explainer", "1");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  }, o);
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'], [data-qc151='birds-card']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
  await mutate(page);
}
const click = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
const fill = (page: Page, sel: string, v: string) => page.evaluate(([s0, v0]) => {
  const el = [...document.querySelectorAll<HTMLInputElement>(s0)].find((e) => e.getBoundingClientRect().height > 0);
  if (!el) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, v0);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}, [sel, v] as const);
const scrollTop = (page: Page, y: number) => page.evaluate((yy) => { const sc = document.querySelector<HTMLElement>(".qc151")?.closest<HTMLElement>(".wpg-scroll"); if (sc) sc.scrollTop = yy; }, y);

/** a PNG from Playwright (8-bit RGB or RGBA, not interlaced), decoded with node's zlib */
function decodePng(buf: Buffer): { w: number; h: number; px: (x: number, y: number) => [number, number, number] } {
  let o = 8; let w = 0, h = 0, ct = 0; const idat: Buffer[] = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o); const type = buf.toString("ascii", o + 4, o + 8); const data = buf.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    if (type === "IDAT") idat.push(data);
    o += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3; const stride = w * bpp; const raw = inflateSync(Buffer.concat(idat)); const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pr = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      out[y * stride + x] = (line[x] + pr) & 255;
    }
  }
  return { w, h, px: (x, y) => { const i = y * stride + x * bpp; return [out[i], out[i + 1], out[i + 2]]; } };
}

for (const vp of SIZES) {
  test.describe(`QC1511 @ ${vp.width}`, () => {
    test("L1 · removed: no info banner, no hover timeline, no master header row, no tab heading, no Day counter in the control line", async ({ page }) => {
      test.skip(!run("L1"));
      const L = new Ledger(`L1-${vp.width}`);
      await open(page, vp);
      const r0 = await page.evaluate(() => ({
        page: !!document.querySelector("[data-qc151='page']"),
        rows: document.querySelectorAll("[data-qc151='row']").length,
        banner: document.querySelectorAll("[data-qc151='banner']").length,
        bannerText: /Each row is one query/.test(document.querySelector("[data-qc151='page']")?.textContent ?? ""),
        thead: document.querySelectorAll("[data-qc151='table'] thead, [data-qc151='table'] th").length,
        clDay: /\bDay\s+\d+/.test(document.querySelector("[data-qc1511='control-line']")?.textContent ?? "(no control line)"),
        cl: !!document.querySelector("[data-qc1511='control-line']"),
      }));
      L.check("population", r0.page && r0.rows > 3 && r0.cl, JSON.stringify(r0));
      L.check("no info banner", r0.banner === 0 && !r0.bannerText, JSON.stringify(r0));
      L.check("no master header row", r0.thead === 0, `${r0.thead}`);
      L.check("no Day counter in the control line", !r0.clDay, "");
      const row = page.locator("[data-qc151='row']").nth(1);
      const box = await row.boundingBox();
      if (box) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(1600); }
      const t = await page.evaluate(() => ({ tl: document.querySelectorAll("[data-qc151='timeline'], .qc151-pk, .qc151-tlr").length }));
      L.check("no hover timeline after 1.5s", !!box && t.tl === 0, JSON.stringify(t));
      await page.mouse.move(5, 5);
      for (const k of ["you", "agent", "quiet", "closed"]) {
        await click(page, `[data-qc151='tabs'] [data-k='${k}']`); await page.waitForTimeout(400);
        const h = await page.evaluate(() => /These are the queries|These queries are with agents|These agents have gone quiet|Closed queries|Every query you/.test(document.querySelector("[data-qc151='page']")?.textContent ?? ""));
        L.check(`no tab heading on ${k}`, !h, "");
      }
      L.done(9);
    });

    test("L2 · summary card: the drawing panel, the heading, pills with StatusDots; its edges are the content's", async ({ page }) => {
      test.skip(!run("L2"));
      const L = new Ledger(`L2-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => {
        const c = document.querySelector<HTMLElement>("[data-qc1511='summary']");
        const root = document.querySelector<HTMLElement>("[data-qc151='page']");
        const art = c?.querySelector<HTMLElement>(".qc1511-sum-art");
        const img = art?.querySelector("img");
        const pills = [...(c?.querySelectorAll<HTMLElement>("[data-qc1511='summary-pill']") ?? [])].filter((p) => p.getBoundingClientRect().height > 0);
        const cr = c?.getBoundingClientRect(), rr = root?.getBoundingClientRect();
        return {
          card: !!c, artBg: art ? getComputedStyle(art).backgroundColor : null, artW: art?.getBoundingClientRect().width ?? 0, img: !!img && img.naturalWidth > 0,
          heading: c?.querySelector("h2")?.textContent?.trim() ?? "", pills: pills.length, pillDots: pills.filter((p) => !!p.querySelector("svg")).length,
          late: pills.filter((p) => p.hasAttribute("data-late")).map((p) => getComputedStyle(p).backgroundColor),
          ok: pills.filter((p) => !p.hasAttribute("data-late")).map((p) => getComputedStyle(p).backgroundColor),
          l: cr ? cr.left - (rr?.left ?? 0) : null, r: cr && rr ? rr.right - cr.right : null,
          you: Number(document.querySelector("[data-qc1511='quick'] [data-k='you'] b")?.textContent ?? "NaN"),
        };
      });
      L.check("population", r.card && r.heading.length > 0, JSON.stringify(r));
      L.check("drawing panel", r.artBg === "rgb(247, 227, 218)" && r.img && Math.abs(r.artW - (vp.width < 1400 ? 130 : 170)) <= 1, `${r.artBg} ${r.artW} img ${r.img}`);
      const m = /^(\d+) quer(y|ies) needs? you this week$/.exec(r.heading);
      L.check("heading", !!m || r.heading === "Nothing needs you this week", r.heading);
      L.check("N is the Your move set", m ? Number(m[1]) === r.you : r.you === 0, `${r.heading} · you ${r.you}`);
      L.check("pills, each with a StatusDot", m ? r.pills > 0 && r.pillDots === r.pills : r.pills === 0, `${r.pillDots}/${r.pills}`);
      L.check("pill fills", r.ok.every((b) => b === "rgb(243, 239, 232)") && r.late.every((b) => b === "rgb(248, 227, 219)"), JSON.stringify([r.ok, r.late]));
      L.check("edges are the content's ±1", r.l != null && r.r != null && Math.abs(r.l) <= 1 && Math.abs(r.r) <= 1, `${r.l} ${r.r}`);
      L.done(7);
    });

    test("L3 · quick filters: All, Your move, With the agent, Gone quiet, Closed; All on a fresh load; navy when chosen; the switch on the row, right", async ({ page }) => {
      test.skip(!run("L3"));
      const L = new Ledger(`L3-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => {
        const q = document.querySelector<HTMLElement>("[data-qc1511='quick']");
        const opts = [...(q?.querySelectorAll<HTMLElement>("button") ?? [])];
        const sw = document.querySelector<HTMLElement>("[data-qc151='switch']");
        const root = document.querySelector<HTMLElement>("[data-qc151='page']")!.getBoundingClientRect();
        const qr = q?.getBoundingClientRect(), sr = sw?.getBoundingClientRect();
        const on = opts.find((o) => o.getAttribute("aria-pressed") === "true");
        return {
          words: opts.map((o) => (o.childNodes[0]?.textContent ?? "").trim()), on: on?.dataset.k ?? null,
          onBg: on ? getComputedStyle(on).backgroundColor : null, onColor: on ? getComputedStyle(on).color : null,
          offBg: opts.filter((o) => o !== on).map((o) => getComputedStyle(o).backgroundColor),
          row: qr && sr ? Math.abs((qr.top + qr.height / 2) - (sr.top + sr.height / 2)) : null, right: sr ? root.right - sr.right : null, swLeftOfQuick: qr && sr ? sr.left > qr.right : false,
        };
      });
      L.check("population", r.words.length === 5, JSON.stringify(r.words));
      L.check("order", JSON.stringify(r.words) === JSON.stringify(["All", "Your move", "With the agent", "Gone quiet", "Closed"]), JSON.stringify(r.words));
      L.check("All on a fresh load", r.on === "all", `${r.on}`);
      L.check("chosen is navy, white", r.onBg === NAVY && r.onColor === "rgb(255, 255, 255)", `${r.onBg} ${r.onColor}`);
      L.check("the others are not filled", r.offBg.every((b) => b === "rgba(0, 0, 0, 0)"), JSON.stringify(r.offBg));
      L.check("the switch on the same row, at the right", r.row != null && r.row <= 2 && r.swLeftOfQuick && r.right != null && Math.abs(r.right) <= 1, `${r.row} ${r.right}`);
      await click(page, "[data-qc1511='quick'] [data-k='agent']"); await page.waitForTimeout(400);
      const on2 = await page.evaluate(() => { const b = document.querySelector<HTMLElement>("[data-qc1511='quick'] [data-k='agent']"); return b ? [b.getAttribute("aria-pressed"), getComputedStyle(b).backgroundColor] : null; });
      L.check("pressing one makes it navy", !!on2 && on2[0] === "true" && on2[1] === NAVY, JSON.stringify(on2));
      L.done(7);
    });

    test("L4 · control line: Showing N of M at 20px, N the rows shown under every filter; the tools flush right; no container", async ({ page }) => {
      test.skip(!run("L4"));
      const L = new Ledger(`L4-${vp.width}`);
      await open(page, vp);
      const read = () => page.evaluate(() => {
        const cl = document.querySelector<HTMLElement>("[data-qc1511='control-line']");
        const sh = cl?.querySelector<HTMLElement>("[data-qc1511='showing']");
        const nums = [...(sh?.querySelectorAll("b") ?? [])].map((b) => Number(b.textContent));
        const root = document.querySelector<HTMLElement>("[data-qc151='page']")!.getBoundingClientRect();
        const tools = cl?.querySelector<HTMLElement>("[data-qc151='controls']")?.getBoundingClientRect();
        const cs = cl ? getComputedStyle(cl) : null;
        return {
          fs: sh ? getComputedStyle(sh).fontSize : null, n: nums[0], m: nums[1],
          rows: document.querySelectorAll("[data-qc151='row']").length,
          right: tools ? root.right - tools.right : null,
          bg: cs?.backgroundColor, shadow: cs?.boxShadow, radius: cs?.borderTopLeftRadius, bt: cs?.borderTopWidth,
          bb: cs ? `${cs.borderBottomWidth} ${cs.borderBottomColor}` : null,
          oneLine: tools && sh ? Math.abs((tools.top + tools.height / 2) - (sh.getBoundingClientRect().top + sh.getBoundingClientRect().height / 2)) <= 3 : false,
        };
      });
      const a = await read();
      L.check("population", a.n > 0 && a.m > 0 && a.rows > 0, JSON.stringify(a));
      L.check("20px", a.fs === "20px", `${a.fs}`);
      L.check("N = rows shown (All)", a.n === a.rows, `${a.n} vs ${a.rows}`);
      L.check("tools flush right ±1", a.right != null && Math.abs(a.right) <= 1, `${a.right}`);
      L.check("one line", a.oneLine, "");
      L.check("no container", a.bg === "rgba(0, 0, 0, 0)" && a.shadow === "none" && a.radius === "0px" && a.bt === "0px", `${a.bg} ${a.shadow} ${a.radius}`);
      L.check("a hairline under it", a.bb === "1px rgb(226, 217, 204)", `${a.bb}`);
      for (const k of ["you", "agent", "closed"]) {
        await click(page, `[data-qc1511='quick'] [data-k='${k}']`); await page.waitForTimeout(400);
        const b = await read();
        L.check(`N = rows on ${k}`, b.n === b.rows && b.m === a.m, `${b.n} vs ${b.rows}, M ${b.m}`);
      }
      await click(page, "[data-qc1511='quick'] [data-k='all']");
      await fill(page, "[data-qc151='find'] input", "a"); await page.waitForTimeout(500);
      const c = await read();
      L.check("N = rows under a search", c.n === c.rows && c.n <= a.n, `${c.n} vs ${c.rows}`);
      L.done(11);
    });

    test("L5 · pill row: absent at the defaults; Overdue alone; Status is any of …; × removes the group; Group and Sort pills; Clear all keeps the quick filter", async ({ page }) => {
      test.skip(!run("L5"));
      const L = new Ledger(`L5-${vp.width}`);
      await open(page, vp);
      const pills = () => page.evaluate(() => ({
        row: !!document.querySelector("[data-qc1511='pills']"),
        p: [...document.querySelectorAll<HTMLElement>("[data-qc1511='pill']")].map((e) => ({ k: e.dataset.k, t: ((e.querySelector(".qc1511-fpb") as HTMLElement | null)?.innerText ?? "").replace(/\s+/g, " ").trim() })),
        over: (() => { const r = document.querySelector<HTMLElement>("[data-qc1511='pills']"); const pg = document.querySelector<HTMLElement>("[data-qc151='page']"); return r && pg ? r.scrollWidth - r.clientWidth + Math.max(0, r.getBoundingClientRect().right - pg.getBoundingClientRect().right) : 0; })(),
      }));
      const p0 = await pills();
      L.check("not in the DOM at the defaults", !p0.row, JSON.stringify(p0));
      await click(page, "[data-qc1511='quick'] [data-k='quiet']"); await page.waitForTimeout(300);
      await click(page, "[data-qc151='filters']"); await page.waitForTimeout(400);
      const opened = await page.evaluate(() => !!document.querySelector("[data-qc151='panel']"));
      L.check("population: the panel opens", opened, "");
      await click(page, "[data-qc140='quick'][data-qp='over']"); await page.waitForTimeout(250);
      await click(page, "[data-qc140='stand'][data-k='pr']"); await page.waitForTimeout(250);
      await click(page, "[data-qc140='stand'][data-k='ps']"); await page.waitForTimeout(400);
      const p1 = await pills();
      const over = p1.p.find((x) => /Overdue/.test(x.t));
      const st = p1.p.find((x) => /^Status/.test(x.t));
      L.check("Overdue reads alone, no \"is\"", !!over && over.t === "Overdue", JSON.stringify(over));
      L.check("Status is any of Partial requested, Partial sent", st?.t === "Status is any of Partial requested, Partial sent", JSON.stringify(st));
      L.check("never overflows", p1.over <= 1, `${p1.over}`);
      await page.evaluate((k) => { const x = document.querySelector<HTMLElement>(`[data-qc1511='pill'][data-k='${k}'] [data-qc1511='pill-x']`); x?.click(); }, st?.k ?? "");
      await page.waitForTimeout(400);
      const p2 = await pills();
      const stAfter = await page.evaluate(() => ["pr", "ps"].map((k) => document.querySelector(`[data-qc140='stand'][data-k='${k}']`)?.getAttribute("aria-pressed") ?? document.querySelector(`[data-qc140='stand'][data-k='${k}']`)?.className ?? "gone"));
      L.check("× on Status removes both", !p2.p.some((x) => /^Status/.test(x.t)) && p2.p.some((x) => x.t === "Overdue"), JSON.stringify(p2.p) + " " + JSON.stringify(stAfter));
      await click(page, "[data-qc140='filter-close']"); await page.waitForTimeout(250);
      const g1 = await click(page, "[data-qc151='group']"); await page.waitForTimeout(300);
      const g2 = await click(page, "[data-qc151='menu'][data-k='group'] [data-qc151='menu-opt'][data-v='status']"); await page.waitForTimeout(400);
      const g3 = await click(page, "[data-qc1511='label'][data-k='queried'] button"); await page.waitForTimeout(400);
      L.check("population: Group, its Status option and the Queried label were pressed", g1 && g2 && g3, JSON.stringify([g1, g2, g3]));
      const p3 = await pills();
      L.check("Group pill", p3.p.some((x) => x.t === "Group Status"), JSON.stringify(p3.p));
      L.check("Sort pill", p3.p.some((x) => /^Sort Queried [↓↑]$/.test(x.t)), JSON.stringify(p3.p));
      await click(page, "[data-qc1511='clear-all']"); await page.waitForTimeout(500);
      const p4 = await pills();
      const after = await page.evaluate(() => ({
        quick: document.querySelector<HTMLElement>("[data-qc1511='quick'] [aria-pressed='true']")?.dataset.k,
        group: getComputedStyle(document.querySelector<HTMLElement>("[data-qc151='group']")!).backgroundColor,
      }));
      L.check("Clear all: the row goes", !p4.row, JSON.stringify(p4));
      L.check("Clear all keeps the quick filter", after.quick === "quiet", `${after.quick}`);
      L.check("Clear all: grouping back to who it's with", after.group === "rgb(255, 255, 255)", after.group);
      L.done(11);
    });

    test("L6 · group headers: one row each, title, count, four labels over their columns; sticky at the lip; the chevron folds", async ({ page }) => {
      test.skip(!run("L6"));
      const L = new Ledger(`L6-${vp.width}`);
      await open(page, vp);
      const g = await page.evaluate(() => {
        const groups = [...document.querySelectorAll<HTMLElement>("[data-qc1511='group']")];
        return groups.map((gr) => {
          const hs = gr.querySelectorAll("[data-qc1511='group-header']");
          const h = hs[0] as HTMLElement | undefined;
          const r = gr.querySelector<HTMLElement>("[data-qc151='row']");
          const lab = (k: string) => h?.querySelector<HTMLElement>(`[data-qc1511='label'][data-k='${k}'] button`)?.getBoundingClientRect().left ?? null;
          const text = (sel: string) => { const c = r?.querySelector<HTMLElement>(sel); if (!c) return null; const rg = document.createRange(); rg.selectNodeContents(c); const rs = [...rg.getClientRects()].filter((x) => x.width > 0); return rs.length ? Math.min(...rs.map((x) => x.left)) : null; };
          return {
            k: gr.dataset.k, headers: hs.length, title: h?.querySelector("[data-qc151='section']")?.textContent ?? null, count: h?.querySelector("small")?.textContent ?? null,
            labels: [...(h?.querySelectorAll<HTMLElement>("[data-qc1511='label']") ?? [])].map((x) => x.dataset.k),
            d: r ? [
              [lab("stage"), r.querySelector<HTMLElement>("[data-qc1511='stand-pill']")?.getBoundingClientRect().left ?? null],
              [lab("queried"), text("[data-qc151='queried']")], [lab("heard"), text("[data-qc151='heard']")], [lab("due"), text("[data-qc151='next']")],
            ] : [],
          };
        });
      });
      L.check("population", g.length >= 2, JSON.stringify(g.map((x) => x.k)));
      for (const x of g) {
        L.check(`${x.k}: one header row`, x.headers === 1, `${x.headers}`);
        L.check(`${x.k}: title and count`, !!x.title && /^\d+$/.test(x.count ?? ""), `${x.title} ${x.count}`);
        L.check(`${x.k}: four labels`, JSON.stringify(x.labels) === JSON.stringify(["stage", "queried", "heard", "due"]), JSON.stringify(x.labels));
        L.check(`${x.k}: labels over their columns ±2`, x.d.length === 4 && x.d.every(([a, b]) => a != null && b != null && Math.abs(a - b) <= 2), JSON.stringify(x.d));
      }
      /* sticky: scroll into the middle of the second group */
      const k2 = g[1]?.k;
      await page.evaluate((k) => {
        const gr = document.querySelector<HTMLElement>(`[data-qc1511='group'][data-k='${k}']`);
        const rows = gr ? [...gr.querySelectorAll<HTMLElement>("[data-qc151='row']")] : [];
        const t = rows[Math.min(1, rows.length - 1)];
        const sc = gr?.closest<HTMLElement>(".wpg-scroll");
        if (t && sc) sc.scrollTop += t.getBoundingClientRect().top - sc.getBoundingClientRect().top - 40;
      }, k2);
      await page.waitForTimeout(500);
      const s = await page.evaluate((k) => {
        const gr = document.querySelector<HTMLElement>(`[data-qc1511='group'][data-k='${k}']`);
        const h = gr?.querySelector<HTMLElement>("[data-qc1511='group-header'] td");
        const sc = gr?.closest<HTMLElement>(".wpg-scroll");
        const cover = sc ? parseFloat(getComputedStyle(h!).top) : 0;
        const rows = gr ? [...gr.querySelectorAll<HTMLElement>("[data-qc151='row']")] : [];
        return { top: h && sc ? h.getBoundingClientRect().top - sc.getBoundingClientRect().top : null, cover, lastBelow: rows.length ? rows[rows.length - 1].getBoundingClientRect().bottom > (h?.getBoundingClientRect().bottom ?? 0) : false, scrolled: sc?.scrollTop ?? 0 };
      }, k2);
      L.check("its header sticks at the lip ±1 while the group passes", s.top != null && s.lastBelow && s.scrolled > 0 && Math.abs(s.top - s.cover) <= 1, JSON.stringify(s));
      await scrollTop(page, 0); await page.waitForTimeout(300);
      const k1 = g[0]?.k;
      await click(page, `[data-qc1511='group'][data-k='${k1}'] [data-qc1511='fold']`); await page.waitForTimeout(400);
      const f = await page.evaluate((k) => {
        const gr = document.querySelector<HTMLElement>(`[data-qc1511='group'][data-k='${k}']`);
        const svg = gr?.querySelector<SVGElement>("[data-qc1511='fold'] svg");
        return { rows: gr?.querySelectorAll("[data-qc151='row']").length ?? -1, header: !!gr?.querySelector("[data-qc1511='group-header']"), rot: svg ? getComputedStyle(svg).transform : null };
      }, k1);
      L.check("the chevron hides the rows and keeps the header", f.rows === 0 && f.header, JSON.stringify(f));
      const mx = /matrix\(([^)]+)\)/.exec(f.rot ?? "")?.[1].split(",").map(Number) ?? [];
      L.check("the chevron turns −90°", mx.length === 6 && Math.abs(mx[0]) < 0.01 && Math.abs(mx[1] + 1) < 0.01, `${f.rot}`);
      await click(page, `[data-qc1511='group'][data-k='${k1}'] [data-qc1511='fold']`);
      /* one quick filter: one label row with Agent */
      await click(page, "[data-qc1511='quick'] [data-k='agent']"); await page.waitForTimeout(400);
      const one = await page.evaluate(() => ({ groups: document.querySelectorAll("[data-qc1511='group']").length, labels: [...document.querySelectorAll<HTMLElement>("[data-qc1511='group-header'] [data-qc1511='label']")].map((x) => x.textContent?.replace(/[↕↓↑]/g, "").trim()) }));
      L.check("one quick filter: one label row, Agent first", one.groups === 1 && JSON.stringify(one.labels) === JSON.stringify(["Agent", "Where it stands", "Queried", "Last heard", "Next"]), JSON.stringify(one));
      L.done(12);
    });

    /* RE-POINTED to v151.2 §3/§4 (design-refs/query-centre-v151-2/): the rows of a group are ONE card — 0 apart, 18px
       outer corners, one height of 68, a plain white start — and a closed row still has no Day line */
    test("L7 · rows (re-pointed to v151.2): one card per group, 0 apart, 18px corners, 68 tall, no tinted end, no Day on closed", async ({ page }) => {
      test.skip(!run("L7"));
      const L = new Ledger(`L7-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => {
        const out: { gaps: number[]; h: number[]; rad: string[]; start: string[]; closedDay: number; closed: number } = { gaps: [], h: [], rad: [], start: [], closedDay: 0, closed: 0 };
        for (const gr of document.querySelectorAll<HTMLElement>("[data-qc1511='group']")) {
          const rows = [...gr.querySelectorAll<HTMLElement>("[data-qc151='row']")];
          rows.forEach((row, i) => {
            const b = row.getBoundingClientRect();
            out.h.push(b.height);
            if (i) out.gaps.push(b.top - rows[i - 1].getBoundingClientRect().bottom);
            out.start.push(getComputedStyle(row.firstElementChild as HTMLElement).backgroundColor);
            if (row.dataset.where === "closed") { out.closed++; if (row.querySelector("[data-qc1511='day']")) out.closedDay++; }
          });
          const last = rows[rows.length - 1];
          if (last) out.rad.push(`${getComputedStyle(last.firstElementChild as HTMLElement).borderBottomLeftRadius}/${getComputedStyle(last.lastElementChild as HTMLElement).borderBottomRightRadius}`);
        }
        return out;
      });
      L.check("population", r.h.length > 5 && r.gaps.length > 3, `${r.h.length} rows`);
      L.check("0 apart", r.gaps.every((g) => Math.abs(g) <= 0.5), JSON.stringify([...new Set(r.gaps.map((g) => Math.round(g * 10) / 10))]));
      L.check("the card's bottom corners 18 ±1", r.rad.every((s) => s.split("/").every((v) => Math.abs(parseFloat(v) - 18) <= 1)), [...new Set(r.rad)].join(" "));
      const h0 = Math.min(...r.h), h1 = Math.max(...r.h);
      L.check("one height ±1", h1 - h0 <= 1, `${h0}–${h1}`);
      L.check("68", Math.abs(h0 - 68) <= 1, `${h0}`);
      L.check("no tinted end", r.start.every((b) => b === "rgb(255, 255, 255)"), JSON.stringify([...new Set(r.start)]));
      L.check("closed: no Day", r.closed > 0 && r.closedDay === 0, `${r.closedDay}/${r.closed}`);
      L.done(7);
    });

    test("L8 · agent cell: the agency under the name, uppercase mono; no Agency column; names never truncate", async ({ page }) => {
      test.skip(!run("L8"));
      const L = new Ledger(`L8-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => {
        const rows = [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")];
        const res = rows.map((row) => {
          const nm = row.querySelector<HTMLElement>("[data-qc151='agent'] b"), ag = row.querySelector<HTMLElement>("[data-qc151='agency']");
          const cs = ag ? getComputedStyle(ag) : null;
          return {
            under: nm && ag ? ag.getBoundingClientRect().top >= nm.getBoundingClientRect().bottom - 1 && ag.closest("td") === nm.closest("td") : false,
            upper: cs?.textTransform === "uppercase", mono: /JetBrains Mono/.test(cs?.fontFamily ?? ""),
            whole: nm ? nm.scrollWidth <= nm.clientWidth + 1 && getComputedStyle(nm).textOverflow !== "ellipsis" : false,
            cells: row.children.length,
          };
        });
        const labels = [...document.querySelectorAll<HTMLElement>("[data-qc1511='label']")].filter((l) => l.getBoundingClientRect().height > 0).map((l) => l.textContent ?? "");
        return { n: rows.length, res, agencyLabel: labels.some((t) => /^Agency/.test(t.trim())), agencyCol: document.querySelectorAll("[data-qc151='agency-col'], td[data-qc151='agency']").length };
      });
      L.check("population", r.n > 5, `${r.n}`);
      L.check("agency under the name, same cell", r.res.every((x) => x.under), `${r.res.filter((x) => !x.under).length} not`);
      L.check("uppercase mono", r.res.every((x) => x.upper && x.mono), "");
      L.check("no Agency column", !r.agencyLabel && r.agencyCol === 0 && r.res.every((x) => x.cells === 7), `${r.agencyLabel} ${r.agencyCol} ${[...new Set(r.res.map((x) => x.cells))]}`);
      L.check("agent names never truncate", r.res.every((x) => x.whole), `${r.res.filter((x) => !x.whole).length} cut`);
      L.done(5);
    });

    /* RE-POINTED to v151.2 §4: the Next column is a big number and a two-line label (the same date rules); the button is
       navy for a move of the writer's, an outlined Nudge past the reply date, and none on With the agent or Closed */
    test("L9 · next + action (re-pointed to v151.2): no Due column; Next's number and label by group; navy or Nudge, right, last", async ({ page }) => {
      test.skip(!run("L9"));
      const L = new Ledger(`L9-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => {
        const rows = [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")];
        const labels = [...document.querySelectorAll<HTMLElement>("[data-qc1511='label']")].map((l) => (l.textContent ?? "").replace(/[↕↓↑]/g, "").trim());
        return {
          labels, dueCol: document.querySelectorAll("[data-qc151='due']").length,
          rows: rows.map((row) => {
            const nx = row.querySelector<HTMLElement>("[data-qc151='next']");
            const lab = nx?.querySelector<HTMLElement>("[data-qc1512='next-l']");
            const btn = row.querySelector<HTMLElement>("[data-qc151='move']");
            const last = row.lastElementChild as HTMLElement;
            const rr = row.getBoundingClientRect();
            return {
              w: row.dataset.where ?? "", t: lab ? `${nx?.querySelector("[data-qc1512='next-n']")?.textContent} ${lab.innerText.replace(/\n/g, " ")}` : (nx?.textContent ?? "").trim(),
              c: nx ? getComputedStyle(nx.querySelector<HTMLElement>("[data-qc1512='next-n']") ?? nx).color : "",
              btn: !!btn, tone: btn?.dataset.tone ?? null, inLast: btn ? last.contains(btn) : null, bg: btn ? getComputedStyle(btn).backgroundColor : null,
              right: btn ? rr.right - btn.getBoundingClientRect().right : null,
            };
          }),
        };
      });
      const RULE: Record<string, RegExp> = {
        you: /^(\d+ days? (late|left|overdue)|No date yet)$/,
        agent: /^(\d+ days? to reply|No reply date)$/,
        quiet: /^\d+ days? (overdue|no reply)$/,
        closed: /^—$/,
      };
      const by = (w: string) => r.rows.filter((x) => x.w === w);
      L.check("population: every group drawn", ["you", "agent", "quiet", "closed"].every((w) => by(w).length > 0), JSON.stringify(["you", "agent", "quiet", "closed"].map((w) => by(w).length)));
      L.check("no Due column", !r.labels.includes("Due") && r.dueCol === 0, JSON.stringify([...new Set(r.labels)]));
      for (const w of ["you", "agent", "quiet", "closed"]) {
        const bad = by(w).filter((x) => !RULE[w].test(x.t));
        L.check(`Next words: ${w}`, bad.length === 0, JSON.stringify(bad.slice(0, 4).map((x) => x.t)));
      }
      const lateRows = r.rows.filter((x) => /late$|overdue$|no reply$/.test(x.t));
      L.check("late and overdue in rust", lateRows.length > 0 && lateRows.every((x) => x.c === "rgb(138, 58, 40)"), `${lateRows.length}`);
      const btns = r.rows.filter((x) => x.btn);
      L.check("buttons: last column, right", btns.length > 0 && btns.every((x) => x.inLast && x.right != null && x.right <= 14), JSON.stringify(btns.slice(0, 3)));
      L.check("buttons: navy, or white Nudge", btns.every((x) => (x.tone === "navy" && x.bg === "rgb(42, 58, 82)") || (x.tone === "nudge" && x.bg === "rgb(255, 255, 255)")), JSON.stringify([...new Set(btns.map((x) => `${x.tone} ${x.bg}`))]));
      L.check("Your move and Gone quiet rows have a button", [...by("you"), ...by("quiet")].every((x) => x.btn), "");
      L.check("With the agent and Closed: no button", [...by("agent"), ...by("closed")].every((x) => !x.btn), "");
      L.done(11);
    });

    /* RE-POINTED to v151.2 §3: the rows of a group now touch, so the gaps photographed are the 22px gaps BETWEEN the
       group cards (the .qc1512-gap rows), wherever one is on screen below the band */
    test("L10 · background (re-pointed to v151.2): the doodles stay in the header band; the gaps between the group cards sit on plain ground", async ({ page }) => {
      test.skip(!run("L10"));
      const L = new Ledger(`L10-${vp.width}`);
      await open(page, vp);
      /* two views of rows well below the 280px band; each gap between two cards photographed edge to edge */
      const GROUND: [number, number, number] = [242, 238, 232];
      const gaps: { y: number; off: number; n: number; spread: number; mid: string }[] = [];
      let scrolled = 0;
      for (const startAt of [0, 1, 2]) {
        await page.evaluate((k) => {
          const rows = [...document.querySelectorAll<HTMLElement>(".qc1512-gap")];
          const t = rows[Math.min(k, rows.length - 1)];
          const sc = t?.closest<HTMLElement>(".wpg-scroll");
          if (t && sc) sc.scrollTop += t.getBoundingClientRect().top - sc.getBoundingClientRect().top - 140;
        }, startAt);
        await page.waitForTimeout(500);
        const geo = await page.evaluate(() => {
          const sc = document.querySelector<HTMLElement>(".qc151")!.closest<HTMLElement>(".wpg-scroll")!;
          const top = sc.getBoundingClientRect().top;
          const rows = [...document.querySelectorAll<HTMLElement>(".qc1512-gap td")].map((r) => r.getBoundingClientRect()).filter((b) => b.top > top + 80 && b.bottom < innerHeight - 4);
          const out: { y: number; x0: number; x1: number }[] = [];
          for (const b of rows) out.push({ y: Math.round(b.top + b.height / 2), x0: Math.ceil(b.left) + 24, x1: Math.floor(b.right) - 24 });
          return { out, scrolled: sc.scrollTop };
        });
        scrolled = Math.max(scrolled, geo.scrolled);
        const png = decodePng(await page.screenshot());
        for (const g of geo.out) {
          /* the cards' soft drop darkens a gap evenly; a doodle is a stroke, so it shows as a pixel off the line's own colour */
          const line: [number, number, number][] = [];
          for (let x = g.x0; x <= g.x1; x++) line.push(png.px(x, g.y));
          const sum = (k: number) => line.map((p) => p[k]).sort((a, b) => a - b)[Math.floor(line.length / 2)];
          const med: [number, number, number] = [sum(0), sum(1), sum(2)];
          const off = line.filter((p) => Math.max(Math.abs(p[0] - med[0]), Math.abs(p[1] - med[1]), Math.abs(p[2] - med[2])) > 3).length;
          const spread = Math.max(...[0, 1, 2].map((k) => Math.abs(med[k] - GROUND[k])));
          gaps.push({ y: g.y, off, n: line.length, spread, mid: med.join(",") });
        }
      }
      L.check("population: three gaps below the band", gaps.length >= 3 && scrolled > 280, JSON.stringify({ gaps: gaps.length, scrolled }));
      for (const g of gaps.slice(0, 10)) L.check(`gap at y ${g.y}: one even colour, the ground under the cards' shadow`, g.n > 100 && g.off === 0 && g.spread <= 12, `${g.off}/${g.n} off · ${g.mid}`);
      L.done(4);
    });
  });
}
