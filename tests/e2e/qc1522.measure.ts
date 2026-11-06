/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.2 — the QC1522 locks (design-refs/query-centre-v152-2/), on the rendered page at 1280 × 800 and
 * 1512 × 900, over the q152- fixtures (tests/e2e/seedQc152.mjs, seeded fresh for each lock and removed after). Each lock
 * asserts its population first and was red first against its named mutation (QC1522_MUTATE=L<n>: a page break here, or
 * a source break in tests/e2e/qc1522Mutate.sh).
 *
 *   bash tests/e2e/qc152Run.sh "node scripts/emu-e2e-inner.mjs tests/e2e/qc1522.measure.ts --project=measure --workers=1"
 *   QC1522_ONLY=L1,L5   QC1522_MUTATE=L4
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { openRoute } from "./measure";

test.setTimeout(Number(process.env.QC1522_TIMEOUT ?? 600_000));
const DIR = "reports/qc-v152-2";
const MUT = process.env.QC1522_MUTATE ?? "";
const ONLY = process.env.QC1522_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = ([{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const).filter((v) => !process.env.QC1522_W || String(v.width) === process.env.QC1522_W);
type VP = { width: number; height: number };
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (sel: string) => `${CARD} ${sel}`;

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** the named page breaks (source breaks live in qc1522Mutate.sh) */
const PAGE_MUT: Record<string, string> = {
  L2: `.qc151 .qc1522-t[data-k="offer"] .qc1522-gh td::before { background: #2a3a52 !important; } .qc151 .qc1522-t[data-k="offer"] .qc1511-gn { color: #fff !important; }`,
  L3: `.qc151 .qc1511-sum-art { background: #f7e3da !important; }`,
  L4: `.qc151 .qc1511-cl { border-bottom: 1px solid #e2d9cc !important; }`,
  L5: `.qc151 .qc1522-t .qc1522-gh td { background: transparent !important; }`,
  L8: `.qc152 .qc152-band { background: #e3dbcf !important; color: #1c130f !important; }`,
};
async function mutate(page: Page) {
  const css = PAGE_MUT[MUT];
  if (css) await page.addStyleTag({ content: css });
}

const seed = () => execSync("node tests/e2e/seedQc152.mjs", { encoding: "utf8", stdio: "pipe" });
const dump = (key: string) => JSON.parse(execSync(`node tests/e2e/seedQc152.mjs --dump ${key}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop()!);
test.beforeEach(() => { seed(); });
test.afterAll(() => { execSync("node tests/e2e/seedQc152.mjs --clean", { encoding: "utf8", stdio: "pipe" }); });

async function open(page: Page, vp: VP, o: { group?: string; plan?: "free" | "pro" } = {}) {
  await page.addInitScript(([g, p]) => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511"); sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: g, sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); localStorage.removeItem("sa.pinList.queries");
      if (p) (window as unknown as { __SA_QC_PLAN?: string }).__SA_QC_PLAN = p;
    } catch { /* private mode */ }
  }, [o.group ?? "attention", o.plan ?? null] as const);
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'][data-id^='q152-']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await mutate(page);
  await page.waitForTimeout(800);
}
async function openCard(page: Page, key: string) {
  await page.evaluate((id) => {
    const r = document.querySelector<HTMLElement>(`[data-qc151='row'][data-id='${id}']`);
    r?.scrollIntoView({ block: "center" });
    (r?.querySelector<HTMLElement>("td") ?? r)?.click();
  }, `q152-${key}`);
  await page.locator(`${CARD}[data-id='q152-${key}']`).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
}
const click = async (page: Page, sel: string, wait = 350) => { await page.locator(sel).first().click({ timeout: 8000 }); await page.waitForTimeout(wait); };
const has = (page: Page, sel: string) => page.locator(sel).count();
const text = (page: Page, sel: string) => page.locator(sel).first().innerText({ timeout: 5000 }).catch(() => "");
const toast = (page: Page) => page.locator(C("[data-qc1522='toast']")).waitFor({ timeout: 15_000 }).then(() => true, () => false);
/** the colour a CSS value computes to, by a probe element (so color-mix and gradients compare as the browser writes them) */
const probe = (page: Page, value: string) => page.evaluate((v) => {
  const d = document.createElement("div"); d.style.background = v; document.body.appendChild(d);
  const cs = getComputedStyle(d); const out = `${cs.backgroundColor}|${cs.backgroundImage}`; d.remove(); return out;
}, value);
const nums = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
const near = (a: string, b: string, tol = 2) => { const x = nums(a), y = nums(b); return x.length === y.length && x.every((v, i) => Math.abs(v - y[i]) <= tol); };

/* a PNG reader for one pixel (8-bit RGB/RGBA, not interlaced: what Playwright writes) */
function pixel(png: Buffer, x: number, y: number): [number, number, number] {
  let o = 8; const idat: Buffer[] = []; let w = 0, ct = 6;
  while (o < png.length) {
    const len = png.readUInt32BE(o), type = png.toString("ascii", o + 4, o + 8), data = png.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); ct = data[9]; }
    if (type === "IDAT") idat.push(data);
    o += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp, raw = inflateSync(Buffer.concat(idat));
  const rows: Buffer[] = [];
  for (let r = 0; r <= y; r++) {
    const f = raw[r * (stride + 1)], line = Buffer.from(raw.subarray(r * (stride + 1) + 1, (r + 1) * (stride + 1)));
    const prev = r ? rows[r - 1] : Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      line[i] = (line[i] + (f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0)) & 255;
    }
    rows.push(line);
  }
  const L = rows[y]; return [L[x * bpp], L[x * bpp + 1], L[x * bpp + 2]];
}

for (const vp of SIZES) {
  test.describe(`QC1522 @ ${vp.width}`, () => {
    test.use({ viewport: vp });

    /* ── §1 the list page ── */
    if (run("L1")) test("L1 · Group menu: Status, Action, Package; Action by default; Package locked on Free; a plain heading", async ({ page }) => {
      const L = new Ledger(`L1-${vp.width}`);
      for (const plan of ["pro", "free"] as const) {
        await open(page, vp, { plan });
        await click(page, "[data-qc151='group']");
        const opts = await page.locator("[data-qc151='menu'][data-k='group'] [data-qc151='menu-opt']").evaluateAll((els) => els.map((e) => ({ v: e.getAttribute("data-v"), label: e.querySelector("b")?.firstChild?.textContent?.trim(), on: e.getAttribute("aria-checked"), locked: e.hasAttribute("data-locked"), pro: !!e.querySelector("[data-qc1522='pro']") })));
        L.check(`${plan}: population`, opts.length > 0, JSON.stringify(opts));
        L.check(`${plan}: exactly Status, Action, Package`, JSON.stringify(opts.map((o) => o.label)) === JSON.stringify(["Status", "Action", "Package"]), JSON.stringify(opts.map((o) => o.label)));
        L.check(`${plan}: Action chosen by default`, opts.find((o) => o.on === "true")?.label === "Action", JSON.stringify(opts));
        L.check(`${plan}: Package carries the Pro tag`, opts.find((o) => o.label === "Package")?.pro === true, "");
        L.check(`${plan}: Package ${plan === "free" ? "locked" : "open"}`, (opts.find((o) => o.label === "Package")?.locked ?? null) === (plan === "free"), JSON.stringify(opts));
        const head = await page.locator("[data-qc151='menu'][data-k='group'] [data-qc1522='menu-head']").evaluate((e) => { const cs = getComputedStyle(e); return { t: e.textContent, tt: cs.textTransform, ff: cs.fontFamily }; });
        L.check(`${plan}: the heading is not uppercase`, head.tt !== "uppercase", JSON.stringify(head));
        L.check(`${plan}: the heading is not mono`, !/mono/i.test(head.ff), head.ff);
        if (plan === "free") {
          await page.locator("[data-qc151='menu'] [data-v='package']").evaluate((b) => (b as HTMLElement).click());
          await page.waitForTimeout(400);
          const g = await page.locator("[data-qc1511='group']").evaluateAll((els) => els.map((e) => e.getAttribute("data-k")));
          L.check("free: choosing Package changes nothing", !g.some((k) => (k ?? "").startsWith("pkg:")), JSON.stringify(g));
        }
        await page.keyboard.press("Escape");
      }
      L.done(14);
    });

    if (run("L2")) test("L2 · headers: §1.2's fill per grouping, ink titles, Harbour package labels, no white text", async ({ page }) => {
      const L = new Ledger(`L2-${vp.width}`);
      const ACTION: Record<string, string> = {
        offer: "color-mix(in srgb, #2a3a52 18%, #fff)", materials: "color-mix(in srgb, #2a3a52 18%, #fff)", nudge: "color-mix(in srgb, #c5d0dd 32%, #fff)",
        agent: "color-mix(in srgb, #e3dbcf 32%, #fff)", quiet: "linear-gradient(90deg, color-mix(in srgb, #e3dbcf 32%, #fff), #fff 60%)", closed: "#f8f7f5",
      };
      for (const group of ["attention", "status", "package"]) {
        await open(page, vp, { group, plan: "pro" });
        const heads = await page.locator("[data-qc1511='group']").evaluateAll((els) => els.map((t) => {
          const td = t.querySelector<HTMLElement>(".qc1511-gt");
          const be = td ? getComputedStyle(td, "::before") : null;
          const lbl = t.querySelector<HTMLElement>("[data-qc1522='pkg-label']");
          const texts = [...t.querySelectorAll<HTMLElement>(".qc1522-gh .qc1511-gn, .qc1522-gh small, .qc1522-gh .qc1511-lbl button")].filter((e) => !e.closest("[data-qc1522='pkg-label']")).map((e) => getComputedStyle(e).color);
          return { k: t.getAttribute("data-k"), kind: t.getAttribute("data-kind"), bg: be ? `${be.backgroundColor}|${be.backgroundImage}` : "", title: getComputedStyle(t.querySelector(".qc1511-gn") ?? t).color, lbl: lbl ? getComputedStyle(lbl).backgroundColor : null, texts };
        }));
        L.check(`${group}: population`, heads.length >= 2, String(heads.length));
        for (const h of heads) {
          let want: string | null = null;
          if (group === "attention") want = ACTION[h.k ?? ""] ?? null;
          else if (group === "status") want = h.k === "closed" ? "#f8f7f5" : null;
          else want = h.k === "pkg:none" ? "#f6f3ee" : "#ffffff";
          if (want) {
            const w = await probe(page, want);
            const [wc, wi] = w.split("|"), [hc, hi] = h.bg.split("|");
            L.check(`${group} ${h.k}: fill`, wi !== "none" ? hi === wi : near(hc, wc), `${h.bg} vs ${w}`);
          }
          if (h.kind !== "pkg") L.check(`${group} ${h.k}: title ink`, near(h.title, "rgb(28, 19, 15)", 1), h.title);
          else L.check(`${group} ${h.k}: Harbour label`, near(h.lbl ?? "", "rgb(46, 74, 94)", 1), String(h.lbl));
          L.check(`${group} ${h.k}: no white text`, !h.texts.some((c) => near(c, "rgb(255, 255, 255)", 1)), JSON.stringify(h.texts));
        }
      }
      L.done(20);
    });

    if (run("L3")) test("L3 · banner: at most four to-do rows and no chips; a row opens its card; no pink", async ({ page }) => {
      const L = new Ledger(`L3-${vp.width}`);
      await open(page, vp);
      const rows = await page.locator("[data-qc1522='todo-row']").evaluateAll((els) => els.map((e) => e.getAttribute("data-id")));
      L.check("population: rows", rows.length >= 1, String(rows.length));
      L.check("at most four", rows.length <= 4, String(rows.length));
      L.check("no chips", (await has(page, "[data-qc1511='summary-pill']")) === 0, "");
      const pink = await page.locator("[data-qc1511='summary']").evaluate((s) => [s, ...s.querySelectorAll("*")].filter((e) => getComputedStyle(e).backgroundColor === "rgb(247, 227, 218)").length);
      L.check("no old pink in the banner", pink === 0, String(pink));
      await page.locator("[data-qc1522='todo-row']").first().click();
      await page.locator(`${CARD}[data-id='${rows[0]}']`).waitFor({ timeout: 15_000 }).catch(() => {});
      L.check("the row opens that query's card", (await has(page, `${CARD}[data-id='${rows[0]}']`)) === 1, String(rows[0]));
      L.done(5);
    });

    if (run("L4")) test("L4 · one divider between the banner and the tabs; none under Showing", async ({ page }) => {
      const L = new Ledger(`L4-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => {
        const sum = document.querySelector("[data-qc1511='summary']")!.getBoundingClientRect(), tabs = document.querySelector("[data-qc1511='quick-row']")!.getBoundingClientRect();
        const hrs = [...document.querySelectorAll<HTMLElement>("[data-qc151='page'] hr, [data-qc151='page'] [data-qc1522='divider']")].filter((h) => { const b = h.getBoundingClientRect(); return b.top >= sum.bottom - 1 && b.bottom <= tabs.top + 1; });
        const cl = getComputedStyle(document.querySelector("[data-qc1511='control-line']")!);
        return { n: hrs.length, gapAbove: hrs[0] ? hrs[0].getBoundingClientRect().top - sum.bottom : null, gapBelow: hrs[0] ? tabs.top - hrs[0].getBoundingClientRect().bottom : null, border: cl.borderBottomWidth, style: cl.borderBottomStyle };
      });
      L.check("exactly one hairline between", r.n === 1, JSON.stringify(r));
      L.check("30px above, 22px below", Math.abs((r.gapAbove ?? 0) - 30) <= 1 && Math.abs((r.gapBelow ?? 0) - 22) <= 1, JSON.stringify(r));
      L.check("no border under Showing", r.border === "0px" || r.style === "none", JSON.stringify(r));
      L.done(3);
    });

    if (run("L5")) test("L5 · sticky corner: the page colour outside the arc; a header leaves with its group", async ({ page }) => {
      const L = new Ledger(`L5-${vp.width}`);
      await open(page, vp);
      /* scroll until the second group's header is stuck with its rows under it */
      const at = await page.evaluate(() => {
        const t = [...document.querySelectorAll<HTMLElement>("[data-qc1511='group']")].find((x) => x.querySelectorAll("[data-qc151='row']").length >= 4) ?? null;
        if (!t) return null;
        let sc: HTMLElement | null = t.parentElement;
        while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
        if (!sc) return null;
        const rows = t.querySelectorAll<HTMLElement>("[data-qc151='row']");
        sc.scrollTop += rows[2].getBoundingClientRect().top - sc.getBoundingClientRect().top - 40;
        return t.getAttribute("data-k");
      });
      L.check("population: a group with rows to scroll under its header", at != null, String(at));
      await page.waitForTimeout(500);
      const box = await page.evaluate((k) => {
        const t = document.querySelector<HTMLElement>(`[data-qc1511='group'][data-k='${k}']`)!;
        const td = t.querySelector<HTMLElement>(".qc1522-gh td")!, last = t.querySelector<HTMLElement>(".qc1522-gh td:last-child")!;
        const a = td.getBoundingClientRect(), b = last.getBoundingClientRect(), tb = t.getBoundingClientRect();
        return { x0: a.left, y0: a.top, x1: b.right, stuck: a.top - tb.top > 1, dpr: devicePixelRatio };
      }, at);
      L.check("the header is stuck", box.stuck, JSON.stringify(box));
      const png = await page.screenshot();
      const s = box.dpr;
      const tl = pixel(png, Math.round((box.x0 + 2) * s), Math.round((box.y0 + 2) * s));
      const tr = pixel(png, Math.round((box.x1 - 3) * s), Math.round((box.y0 + 2) * s));
      const page_ = [244, 240, 234];
      const isPage = (p: number[]) => p.every((v, i) => Math.abs(v - page_[i]) <= 3);
      L.check("top-left corner outside the arc is the page colour", isPage(tl), JSON.stringify(tl));
      L.check("top-right corner outside the arc is the page colour", isPage(tr), JSON.stringify(tr));
      /* scroll past the group: its header goes with it */
      const left = await page.evaluate((k) => {
        const t = document.querySelector<HTMLElement>(`[data-qc1511='group'][data-k='${k}']`)!;
        let sc: HTMLElement | null = t.parentElement;
        while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
        sc!.scrollTop += t.getBoundingClientRect().bottom - sc!.getBoundingClientRect().top + 30;
        return new Promise<{ hb: number; tb: number }>((res) => requestAnimationFrame(() => {
          const hd = t.querySelector<HTMLElement>(".qc1522-gh td")!.getBoundingClientRect(); res({ hb: hd.bottom, tb: t.getBoundingClientRect().bottom });
        }));
      }, at);
      L.check("a header never outlives its group", left.hb <= left.tb + 0.5, JSON.stringify(left));
      L.done(5);
    });

    if (run("L6")) test("L6 · rows: no tags; a gone-quiet row's button follows the footer rule", async ({ page }) => {
      const L = new Ledger(`L6-${vp.width}`);
      await open(page, vp);
      const t = await page.locator("[data-qc151='table']").innerText();
      for (const w of ["Your move", "Nudge due", "Gone quiet"]) {
        const inRows = await page.locator("[data-qc151='row']").evaluateAll((els, word) => els.filter((e) => (e.textContent ?? "").includes(word as string)).length, w);
        L.check(`no "${w}" in any row`, inRows === 0, String(inRows));
      }
      L.check("population: rows", t.length > 100, String(t.length));
      for (const key of ["quiet", "nrmn", "nudgedquiet"]) {
        const rowBtn = await page.locator(`[data-qc151='row'][data-id='q152-${key}'] [data-qc151='move']`).innerText().catch(() => "");
        await openCard(page, key);
        const footBtn = await text(page, C("[data-qc152='reply-btn']"));
        L.check(`${key}: row "${rowBtn.replace(/\s*→/, "")}" = footer "${footBtn}"`, rowBtn.replace(/\s*→/, "").trim() === footBtn.trim() && !!footBtn, `${rowBtn} | ${footBtn}`);
      }
      L.done(7);
    });

    if (run("L7")) test("L7 · zero: no wait, figure or footer reads '0 days'", async ({ page }) => {
      const L = new Ledger(`L7-${vp.width}`);
      await open(page, vp);
      const list = await page.locator("[data-qc151='page']").innerText();
      L.check("population: the list", list.length > 500, String(list.length));
      L.check("the list never says 0 days", !/\b0\s*days?\b/i.test(list), (list.match(/.{20}\b0\s*days?\b.{20}/i) ?? [""])[0]);
      for (const key of ["nudge", "agent", "nudgedwait", "undated", "seven", "materials", "offer"]) {
        await openCard(page, key);
        const c = await page.locator(CARD).innerText();
        L.check(`${key}: the card never says 0 days`, !/\b0\s*days?\b/i.test(c), (c.match(/.{20}\b0\s*days?\b.{20}/i) ?? [""])[0]);
      }
      L.done(9);
    });

    /* ── §2 the card's look ── */
    if (run("L8")) test("L8 · bands: navy with white text, except Gone quiet and Closed", async ({ page }) => {
      const L = new Ledger(`L8-${vp.width}`);
      await open(page, vp);
      for (const key of ["offer", "materials", "nudge", "agent", "quiet", "closed", "rr"]) {
        await openCard(page, key);
        const b = await page.locator(C("[data-qc152='band']")).evaluate((e) => { const cs = getComputedStyle(e); return { bg: cs.backgroundColor, img: cs.backgroundImage, fg: cs.color, state: e.closest("[data-qc152='card']")?.getAttribute("data-state") }; });
        if (b.state === "quiet" || b.state === "closed") L.check(`${key} (${b.state}): not navy`, b.bg !== "rgb(42, 58, 82)", JSON.stringify(b));
        else {
          L.check(`${key} (${b.state}): navy`, b.bg === "rgb(42, 58, 82)" && b.img === "none", JSON.stringify(b));
          L.check(`${key} (${b.state}): white text`, b.fg === "rgb(255, 255, 255)", b.fg);
        }
      }
      L.done(9);
    });

    if (run("L9")) test("L9 · waits: an italic line on the next message's side; no pill; none beside an undated step", async ({ page }) => {
      const L = new Ledger(`L9-${vp.width}`);
      await open(page, vp);
      for (const key of ["seven", "undated", "passed", "rr"]) {
        await openCard(page, key);
        if (key === "seven") await page.locator(C("[data-qc152='fold']")).click().catch(() => {});
        const r = await page.locator(C("[data-qc152='thread']")).evaluate((th) => {
          const kids = [...th.children] as HTMLElement[];
          const waits = kids.filter((k) => k.matches("[data-qc1522='wait']"));
          const pills = th.querySelectorAll(".qc152-w").length;
          const sides = waits.map((w) => { const n = w.nextElementSibling as HTMLElement | null; return { w: w.getAttribute("data-side"), next: n?.getAttribute("data-side"), italic: getComputedStyle(w).fontStyle, label: w.textContent }; });
          const undatedNext = kids.filter((k, i) => k.matches("[data-qc152='msg']") && k.querySelector("[data-qc152='msg-date']")?.textContent === "No date" && ((kids[i - 1]?.matches("[data-qc1522='wait']")) || (kids[i + 1]?.matches("[data-qc1522='wait']")))).length;
          const undated = kids.filter((k) => k.querySelector("[data-qc152='msg-date']")?.textContent === "No date").length;
          return { n: waits.length, pills, sides, undatedNext, undated };
        });
        /* the undated fixture's population is its undated step (both its waits touch it, so it draws none) */
        L.check(`${key}: population`, key === "undated" ? r.undated >= 1 : r.n >= 1, JSON.stringify(r));
        L.check(`${key}: no pill or hairline wait`, r.pills === 0, String(r.pills));
        L.check(`${key}: each on the next message's side, italic`, r.sides.every((s) => s.w === s.next && s.italic === "italic"), JSON.stringify(r.sides));
        L.check(`${key}: no wait beside an undated step`, r.undatedNext === 0, String(r.undatedNext));
      }
      L.done(16);
    });

    /* ── §3 the composer ── */
    if (run("L10")) test("L10 · composer: each footer action opens its titled composer over the thread; one tap saves; Undo restores exactly", async ({ page }) => {
      const L = new Ledger(`L10-${vp.width}`);
      await open(page, vp);
      const TITLES: [string, string, RegExp][] = [
        ["materials", "[data-qc152='reply-btn']", /^Mark the partial sent$/], ["nudge", "[data-qc152='reply-btn']", /^Nudge Priya$/],
        ["agent", "[data-qc152='reply-btn']", /^What did Rufus say\?$/], ["nudgedquiet", "[data-qc152='reply-btn']", /^Close Nell’s query$/],
        ["closed", "[data-qc152='reply-btn']", /^Reopen Clara’s query$/], ["offer", "[data-qc152='reply-btn']", /^Olive’s offer$/], ["agent", "[data-qc152='pencil']", /^Query details$/],
      ];
      for (const [key, sel, want] of TITLES) {
        await openCard(page, key);
        await click(page, C(sel));
        const t = await text(page, C("[data-qc1522='composer-title']"));
        L.check(`${key}: "${t}"`, want.test(t), t);
        const th = await page.locator(C("[data-qc152='thread']")).evaluate((e) => e.getBoundingClientRect().height).catch(() => 0);
        L.check(`${key}: the thread stays visible above`, th > 20, String(th));
        const card = await page.locator(CARD).innerText();
        L.check(`${key}: no "See what changes"`, !/See what changes|What needs changing|Something changed since|Log a nudge/.test(card), "");
        await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      }
      /* save, toast, Undo restores the query exactly */
      await openCard(page, "materials");
      const before = dump("materials");
      await click(page, C("[data-qc152='reply-btn']"));
      await click(page, C("[data-qc1522='save']"), 100);
      L.check("the toast shows", await toast(page), "");
      const tt = await text(page, C("[data-qc1522='toast']"));
      L.check(`toast reads "Partial sent · Undo"`, /^Partial sent\s*Undo$/.test(tt.replace(/\s+/g, " ").trim()), tt);
      const mid = dump("materials");
      L.check("the save wrote a step", mid.log.length === before.log.length + 1, `${before.log.length} → ${mid.log.length}`);
      await click(page, C("[data-qc1522='undo']"), 300);
      let after = dump("materials");
      for (let i = 0; i < 15 && JSON.stringify(after) !== JSON.stringify(before); i++) { await page.waitForTimeout(1000); after = dump("materials"); }
      L.check("Undo restores the query, its log and its feed byte for byte", JSON.stringify(after) === JSON.stringify(before), "");
      L.done(25);
    });

    if (run("L11")) test("L11 · Escape: back to the card; with something entered, the discard strip; Discard saves nothing", async ({ page }) => {
      const L = new Ledger(`L11-${vp.width}`);
      await open(page, vp);
      await openCard(page, "nudge");
      const before = dump("nudge");
      await click(page, C("[data-qc152='reply-btn']"));
      L.check("population: the composer", (await has(page, C("[data-qc1522='composer']"))) === 1, "");
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      L.check("Escape with nothing entered: back to the card", (await has(page, C("[data-qc1522='composer']"))) === 0, "");
      await click(page, C("[data-qc152='reply-btn']"));
      await click(page, C("[data-qc1522='sent-by'] [data-v='QueryManager']"));
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      L.check("Escape with something entered: the discard strip", (await has(page, C("[data-qc1522='discard-strip']"))) === 1, "");
      L.check("the composer is still open", (await has(page, C("[data-qc1522='composer']"))) === 1, "");
      await click(page, C("[data-qc1522='discard']"));
      L.check("Discard closes it", (await has(page, C("[data-qc1522='composer']"))) === 0, "");
      await page.waitForTimeout(800);
      L.check("nothing was saved", JSON.stringify(dump("nudge")) === JSON.stringify(before), "");
      L.done(6);
    });

    if (run("L12")) test("L12 · never writes: no prefilled prose, a mailto with the address only, no letter words in the Query Centre", async ({ page }) => {
      const L = new Ledger(`L12-${vp.width}`);
      await open(page, vp);
      const OPEN: [string, string, string | null][] = [
        ["nudge", "[data-qc152='reply-btn']", null], ["agent", "[data-qc152='reply-btn']", "[data-qc1522='reply-types'] [data-v='req']"],
        ["agent", "[data-qc152='reply-btn']", "[data-qc1522='reply-types'] [data-v='more']"], ["offer", "[data-qc152='reply-btn']", "[data-qc1522='offer-choices'] [data-v='decline']"],
        ["agent", "[data-qc152='pencil']", null],
      ];
      let fields = 0;
      for (const [key, sel, then] of OPEN) {
        await openCard(page, key);
        await click(page, C(sel));
        if (then) await click(page, C(then));
        const vals = await page.locator(C("[data-qc1522='composer'] textarea, [data-qc1522='composer'] input[type='text']")).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
        fields += vals.length;
        L.check(`${key}: no field starts with prose`, vals.every((v) => v === ""), JSON.stringify(vals));
        const hrefs = await page.locator(C("[data-qc1522='composer'] a[href^='mailto:']")).evaluateAll((els) => els.map((e) => e.getAttribute("href")));
        L.check(`${key}: mailto carries the address only`, hrefs.every((h) => !/[?&](subject|body)=/i.test(h ?? "") && !(h ?? "").includes("?")), JSON.stringify(hrefs));
        await page.keyboard.press("Escape"); await page.waitForTimeout(250);
        if (await has(page, C("[data-qc1522='discard']"))) await click(page, C("[data-qc1522='discard']"));
      }
      L.check("population: fields read", fields >= 4, String(fields));
      /* ⚠️ "Dear" is in the bundle legitimately: Submission packages' query-letter preview (the writer's own letter). So
         "Dear" is checked over the Query Centre's own source; the other two over the whole bundle. */
      const qcSrc = ["src/components/queries/centre", "src/lib"].flatMap((d) => readdirSync(d).filter((f) => /^(Qc|qc)/.test(f) && /\.(tsx?|css)$/.test(f) && !/\.test\./.test(f)).map((f) => readFileSync(`${d}/${f}`, "utf8"))).join("\n");
      L.check("no 'Dear' in the Query Centre's source", !/\bDear\b/.test(qcSrc), "");
      const js = readdirSync("dist-emu/assets").filter((f) => f.endsWith(".js")).map((f) => readFileSync(`dist-emu/assets/${f}`, "utf8")).join("\n");
      L.check("population: the bundle", js.length > 100_000, String(js.length));
      L.check("no 'I hope' in the bundle", !/I hope/.test(js), "");
      L.check("no 'following up on my query' in the bundle", !/following up on my query/i.test(js), "");
      L.done(15);
    });

    /* ── §5 What did they say? ── */
    if (run("L13")) test("L13 · replies: the five chips, no step of yours; each reply's fields; a pass saves its kind and open-to-more", async ({ page }) => {
      const L = new Ledger(`L13-${vp.width}`);
      await open(page, vp);
      await openCard(page, "agent");
      await click(page, C("[data-qc152='reply-btn']"));
      const chips = await page.locator(C("[data-qc1522='reply-types'] button")).allInnerTexts();
      L.check("exactly the five replies", JSON.stringify(chips.map((c) => c.trim())) === JSON.stringify(["Asked for the partial", "Passed", "Revise & resubmit", "Made an offer", "Something else"]), JSON.stringify(chips));
      L.check("no step of yours offered", !chips.some((c) => /nudg|sent|closed|told/i.test(c)), JSON.stringify(chips));
      L.check("the button waits for a choice", await page.locator(C("[data-qc1522='save']")).isDisabled(), "");
      const FIELDS: Record<string, string[]> = { req: ["When", "Their deadline", "Their words"], passed: ["When", "What kind of no", "Their words"], rr: ["When", "Resubmit by", "Their words"], offer: ["When", "Answer by", "Their words"], more: ["When", "What they asked for", "Their words"] };
      for (const [k, want] of Object.entries(FIELDS)) {
        await click(page, C(`[data-qc1522='reply-types'] [data-v='${k}']`));
        const labels = (await page.locator(C("[data-qc1522='composer'] .qc1522-fl > label")).allInnerTexts()).map((x) => x.trim()).filter(Boolean);
        L.check(`${k}: ${want.join(", ")}`, JSON.stringify(labels) === JSON.stringify(want), JSON.stringify(labels));
      }
      /* a pass: personal, open to more work, kept off the Wall */
      await click(page, C("[data-qc1522='reply-types'] [data-v='passed']"));
      await click(page, C("[data-qc1522='pass-kind'] [data-v='personal']"));
      await page.locator(C("[data-qc1522='open-to-more']")).check();
      await page.locator(C("[data-qc1522='wall']")).uncheck();
      await click(page, C("[data-qc1522='save']"), 100);
      L.check("the toast shows", await toast(page), "");
      const d = dump("agent");
      const pass = d.log.map((x: [string, Record<string, unknown>]) => x[1]).find((x: Record<string, unknown>) => x.resultingStatus === "Rejected");
      L.check("population: the pass step", !!pass, "");
      L.check("its kind is personal", pass?.feedbackType === "Yes" || pass?.feedbackType === "detailed", String(pass?.feedbackType));
      L.check("open to more work is saved", pass?.openToMore === true, String(pass?.openToMore));
      L.check("kept off the Wall of no", pass?.offWall === true, String(pass?.offWall));
      L.done(13);
    });

    /* ── §6 the offer ── */
    if (run("L14")) test("L14 · offer: every open query listed; Done waits for all; Do the rest later → one to-do and Deciding; Tell them keeps ticks; Accept undoes in one", async ({ page }) => {
      const L = new Ledger(`L14-${vp.width}`);
      await open(page, vp);
      await openCard(page, "offer2");
      await click(page, C("[data-qc152='reply-btn']"));
      await click(page, C("[data-qc1522='offer-choices'] [data-v='time']"));
      const ids = await page.locator(C("[data-qc1522='tell-row']")).evaluateAll((els) => els.map((e) => e.getAttribute("data-id")));
      L.check("population: the other open queries", ids.length >= 1, JSON.stringify(ids));
      L.check("the fixture's live sibling is listed", ids.includes("q152-sib2"), JSON.stringify(ids));
      L.check("Done waits for every agent", await page.locator(C("[data-qc1522='done']")).isDisabled(), "");
      await page.locator(C("[data-qc1522='tell-row'][data-id='q152-sib2'] [data-qc1522='told']")).click();
      if (ids.length > 1) L.check("Done still waits with one left", await page.locator(C("[data-qc1522='done']")).isDisabled(), "");
      await click(page, C("[data-qc1522='later']"), 100);
      L.check("the toast shows", await toast(page), "");
      const band = await text(page, C("[data-qc152='band-word']"));
      L.check(`the card moves to Deciding ("${band}")`, /DECIDING/.test(band), band);
      const offer = dump("offer2");
      const flagged = offer.log.map((x: [string, Record<string, unknown>]) => x[1]).filter((x: Record<string, unknown>) => x.resultingStatus === "Offer" && x.tellLater === true).length;
      const feedFlag = offer.feed.map((x: [string, Record<string, unknown>]) => x[1]).filter((x: Record<string, unknown>) => x.resultingStatus === "Offer" && x.tellLater === true).length;
      L.check(ids.length > 1 ? "the offer step carries tellLater (both stores)" : "all told: no tellLater", ids.length > 1 ? flagged === 1 && feedFlag === 1 : flagged === 0, `${flagged}/${feedFlag}`);
      const sub = await text(page, C("[data-qc152='reply-sub']"));
      L.check(`the footer counts who's left ("${sub}")`, ids.length > 1 ? new RegExp(`${ids.length - 1} to tell`).test(sub) : /all agents told/.test(sub), sub);
      if (ids.length > 1) {
        await page.waitForTimeout(5600);
        await click(page, C("[data-qc1522='foot-link'][data-act='tell']"));
        const ticked = await page.locator(C("[data-qc1522='tell-row'][data-id='q152-sib2'] [data-qc1522='told']")).getAttribute("aria-pressed");
        L.check("Tell them reopens the list with the ticks kept", ticked === "true", String(ticked));
        await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      }
      /* accept: the others close as withdrawn in one write; one Undo reverts both */
      const b1 = dump("offer2"), b2 = dump("sib2");
      await page.waitForTimeout(400);
      await click(page, C("[data-qc152='reply-btn']"));
      await click(page, C("[data-qc1522='offer-choices'] [data-v='accept']"));
      await click(page, C("[data-qc1522='save']"), 100);
      L.check("the toast shows", await toast(page), "");
      L.check("the sibling closed as withdrawn", dump("sib2").q?.status === "Withdrawn", String(dump("sib2").q?.status));
      L.check("the offer is signed", dump("offer2").q?.status === "Signed", String(dump("offer2").q?.status));
      await click(page, C("[data-qc1522='undo']"), 300);
      let a1 = dump("offer2"), a2 = dump("sib2");
      for (let i = 0; i < 30 && JSON.stringify([a1, a2]) !== JSON.stringify([b1, b2]); i++) { await page.waitForTimeout(1000); a1 = dump("offer2"); a2 = dump("sib2"); }
      const diff = (x: Record<string, unknown>, y: Record<string, unknown>) => JSON.stringify({ q: Object.keys({ ...(x.q as object), ...(y.q as object) }).filter((k) => JSON.stringify((x.q as Record<string, unknown>)?.[k]) !== JSON.stringify((y.q as Record<string, unknown>)?.[k])),
        log: [(x.log as unknown[])?.length, (y.log as unknown[])?.length], feed: [(x.feed as unknown[])?.length, (y.feed as unknown[])?.length] });
      L.check("one Undo reverts the offer", JSON.stringify(a1) === JSON.stringify(b1), diff(b1, a1));
      L.check("…and the sibling", JSON.stringify(a2) === JSON.stringify(b2), diff(b2, a2));
      L.done(13);
    });

    /* ── §7 reopen ── */
    if (run("L15")) test("L15 · reopen: a mistake takes the pass off and adds nothing; got back in touch adds an R&R after the pass", async ({ page }) => {
      const L = new Ledger(`L15-${vp.width}`);
      await open(page, vp);
      await openCard(page, "passed");
      const before = dump("passed");
      await click(page, C("[data-qc152='reply-btn']"));
      await click(page, C("[data-qc1522='reopen-why'] [data-v='mistake']"));
      await click(page, C("[data-qc1522='save']"), 100);
      L.check("the toast shows", await toast(page), "");
      const m = dump("passed");
      const st = (d: { log: [string, Record<string, unknown>][] }) => d.log.map((x) => x[1].resultingStatus ?? x[1].type);
      L.check("population: the pass was there", st(before).includes("Rejected"), JSON.stringify(st(before)));
      L.check("the pass is gone", !st(m).includes("Rejected"), JSON.stringify(st(m)));
      L.check("nothing new on the thread", m.log.length === before.log.length - 1, `${before.log.length} → ${m.log.length}`);
      L.check("the reply date restarts from today", typeof m.q?.replyRestartedOn === "string", String(m.q?.replyRestartedOn));
      seed();
      await open(page, vp);
      await openCard(page, "passed");
      await click(page, C("[data-qc152='reply-btn']"));
      await click(page, C("[data-qc1522='reopen-why'] [data-v='back']"));
      const pre = await page.locator(C("[data-qc1522='reply-types'] [data-v='rr']")).getAttribute("class");
      L.check("Revise & resubmit is chosen", /\bon\b/.test(pre ?? ""), String(pre));
      await click(page, C("[data-qc1522='save']"), 100);
      L.check("the toast shows (2)", await toast(page), "");
      /* createdAt is a Timestamp ({ seconds }) on new steps and an ISO string on seeded ones: compare as times */
      const tOf = (c: unknown) => (c && typeof c === "object" && "seconds" in (c as object) ? Number((c as { seconds: number }).seconds) * 1000 : Date.parse(String(c)));
      const g = dump("passed").log.map((x: [string, Record<string, unknown>]) => x[1]).sort((a: Record<string, unknown>, b: Record<string, unknown>) => tOf(a.createdAt) - tOf(b.createdAt));
      const kinds = g.map((x: Record<string, unknown>) => x.resultingStatus ?? x.type);
      L.check("an R&R step after the pass", kinds.lastIndexOf("Revise & Resubmit") > kinds.lastIndexOf("Rejected") && kinds.includes("Rejected"), JSON.stringify(kinds));
      L.check("the query is reopened", dump("passed").q?.status === "Revise & Resubmit", String(dump("passed").q?.status));
      L.done(9);
    });

    /* ── §2.4 edit in place ── */
    if (run("L16")) test("L16 · edit in place: only that bubble becomes a form; no type control; Delete names what goes with it", async ({ page }) => {
      const L = new Ledger(`L16-${vp.width}`);
      await open(page, vp);
      await openCard(page, "rr");
      const n0 = await has(page, C("[data-qc152='msg']"));
      const target = page.locator(C("[data-qc152='msg'][data-status='Full Requested']")).first();
      L.check("population: the full request", (await target.count()) === 1, "");
      const scroll0 = await page.locator(C("[data-qc152='body']")).evaluate((e) => e.scrollTop);
      await target.locator("[data-qc152='edit-step']").evaluate((b) => (b as HTMLElement).click());
      await page.waitForTimeout(400);
      const n1 = await has(page, C("[data-qc152='msg']"));
      L.check("one form, in place", (await has(page, C("[data-qc1522='step-edit']"))) === 1, "");
      L.check("only that bubble is replaced", n1 === n0 - 1, `${n0} → ${n1}`);
      const scroll1 = await page.locator(C("[data-qc152='body']")).evaluate((e) => e.scrollTop);
      L.check("the scroll does not jump", Math.abs(scroll1 - scroll0) <= 40, `${scroll0} → ${scroll1}`);
      L.check("no control changes the step's type", (await has(page, C("[data-qc1522='step-edit'] select"))) === 0, "");
      L.check("no whole-history form", !(await page.locator(CARD).innerText()).includes("Fix a mistake"), "");
      await click(page, C("[data-qc1522='delete-step']"));
      const conf = await text(page, C("[data-qc1522='delete-confirm']"));
      L.check(`Delete names its dependants ("${conf}")`, /Sent the full depends on it, so it goes too/.test(conf) && /goes back to Revise & resubmit/i.test(conf), conf);
      L.done(7);
    });

    /* ── §3.2 the close rule ── */
    if (run("L17")) test("L17 · close rule: never nudged and under 8 weeks → Nudge leads; nudged → Close it leads; on the row and the footer", async ({ page }) => {
      const L = new Ledger(`L17-${vp.width}`);
      await open(page, vp);
      const WANT: [string, string, string][] = [["quiet", "Nudge", "Close it"], ["nudgedquiet", "Close it", "Nudge again"]];
      for (const [key, lead, link] of WANT) {
        const row = (await page.locator(`[data-qc151='row'][data-id='q152-${key}'] [data-qc151='move']`).innerText().catch(() => "")).replace(/\s*→/, "").trim();
        L.check(`${key}: the row leads with ${lead}`, row === lead, row);
        await openCard(page, key);
        L.check(`${key}: the footer leads with ${lead}`, (await text(page, C("[data-qc152='reply-btn']"))).trim() === lead, await text(page, C("[data-qc152='reply-btn']")));
        L.check(`${key}: the link is ${link}`, (await text(page, C("[data-qc1522='foot-link']"))).trim() === link, await text(page, C("[data-qc1522='foot-link']")));
      }
      /* 8+ weeks quiet and never nudged: Close it leads (any such row on the page, read with its own Next figure) */
      const long = await page.locator("[data-qc151='row'][data-state='quiet']").evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-id"), n: Number(e.querySelector("[data-qc1512='next-n']")?.textContent ?? "NaN"), lbl: e.querySelector("[data-qc1512='next-l']")?.textContent ?? "", btn: (e.querySelector("[data-qc151='move']")?.textContent ?? "").replace(/\s*→/, "").trim() })).filter((r) => /quiet/.test(r.lbl) && r.n >= 56));
      L.check("population: a row 8+ weeks quiet", long.length >= 1, String(long.length));
      L.check("8+ weeks quiet leads with Close it", long.every((r) => r.btn === "Close it"), JSON.stringify(long.slice(0, 4)));
      L.done(8);
    });
  });
}
