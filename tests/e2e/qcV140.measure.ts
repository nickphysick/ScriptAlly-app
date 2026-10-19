/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 — the QC140 locks on the rendered Query Centre, at 1512 × 900 and 1280 × 800 with the shell.
 *
 * A1 one row · A2 jump labels · A3 fold · A4 jump · B1 unpinned bar · C1 pinned scheme · C2 no repeats · C3 figures ·
 * C4 illustration · D1 one state · D2 escape · E1 columns · F1 memory · G1 guide.
 *
 * Page-side breaks through `QC140_MUTATE=<lock>`; the source breaks through tests/e2e/qcV140Mutate.sh.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: each query starts from the Query Centre's visible group.
 * ⚠️ THE GUIDE IS MARKED SEEN for every case (its first-visit open covers the list) and put back after; G1 sets its own.
 * ⚠️ C3 RECOMPUTES THE BAND'S FIGURES IN NODE FROM THE ACCOUNT ITSELF (tests/e2e/qc140Figures.mjs reads Firestore and
 *    applies lib/responses' placement and the reply-date rule the filter uses), never from the page.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const DIR = "reports/qc-v140";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const MUT = process.env.QC140_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const flags = (a: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${a}`, { encoding: "utf8" }).trim().split("\n").pop()!;
let original = "null";
test.beforeAll(() => { original = flags(""); });
test.afterAll(() => { flags(`--restore '${original}'`); });

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  A1: { css: `.qc140-tb, [data-qc140='toolbar'] { flex-wrap: wrap !important; } [data-qc140='jump'] { flex: 0 0 100% !important; }` },
  B1: { css: `.qcv-group[data-v138] [data-qc140='toolbar'] { background: #ffffff !important; }` },
  C1: { css: `html[data-qc140-pinned] .qcv-group[data-v138] .qc138-sheet { margin-left: 24px !important; margin-top: 24px !important; }` },
  C2: { js: `(() => { const b = [...document.querySelectorAll("[data-qc140='band']")].find((e) => e.getBoundingClientRect().height > 0); if (b) { const s = document.createElement("span"); s.textContent = "Your move 52 · Waiting 18 · Closed 17"; b.appendChild(s); } })()` },
  C4: { css: `[data-qc140='band'] { overflow: hidden !important; } html[data-qc140-pinned] .qc140-stk { overflow: hidden !important; }` },
};

type Opt = { pinned?: boolean; group?: string; density?: "comfortable" | "compact"; keepStorage?: boolean };
async function open(page: Page, vp: { width: number; height: number }, lock: string, o: Opt = {}) {
  flags(`--restore '${JSON.stringify({ seen: true, done: { log: true, find: true, open: true, pin: true, resp: true, birds: true } })}'`);
  await page.addInitScript((x: Opt) => {
    try {
      /* F1 sets this before its reload, so the reload keeps what the case set */
      if (!x.keepStorage && sessionStorage.getItem("qc140-keep") !== "1") {
        sessionStorage.removeItem("qh.qc.filters");
        localStorage.removeItem("qh.qc.view");
        localStorage.setItem("sa.guide.queries", "1");
        if (x.pinned) localStorage.setItem("sa.pinList.queries", "1"); else localStorage.removeItem("sa.pinList.queries");
      }
    } catch { /* */ }
  }, o);
  await openRoute(page, "/queries", vp);
  await page.locator(".qcv-group[data-v138]").first().waitFor({ timeout: 30_000 });
  await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.mouse.move(5, 5);
  if (o.group && o.group !== (await currentGroup(page))) await pickGroup(page, o.group);
  if (!!o.pinned !== (await isPinned(page))) { await press(page, "[data-qc140='pin']"); await page.waitForTimeout(900); }
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.css) await page.addStyleTag({ content: m.css });
  if (m?.js) await page.evaluate(m.js);
  await page.waitForTimeout(300);
}
const G = ".qcv-group[data-v138]";
const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
const isPinned = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='pin']")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-pressed") === "true");
const currentGroup = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='group-opt']")].find((e) => e.getAttribute("aria-checked") === "true")?.dataset.g ?? null);
async function pickGroup(page: Page, g: string) {
  await press(page, `${G} [data-qc140='group']`);
  await page.waitForTimeout(400);
  await press(page, `[data-qc140='group-opt'][data-g='${g}']`);
  await page.waitForTimeout(900);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}
const scrollTo = (page: Page, y: number) => page.evaluate((top) => { const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!; const sc = g.closest<HTMLElement>(".wpg-scroll")!; sc.style.scrollBehavior = "auto"; sc.scrollTop = top; return sc.scrollTop; }, y);
const box = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; }, sel);
const bg = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); return e ? getComputedStyle(e).backgroundColor : null; }, sel);

test.describe("Query Centre v140", () => {
  test("A1 · one row: the toolbar never wraps; 64 unpinned, 72 pinned; the old header's controls are gone", async ({ page }) => {
    test.setTimeout(400_000);
    const L = new Ledger("A1");
    for (const vp of SIZES) for (const pinned of [false, true]) {
      await open(page, vp, "A1", { pinned });
      const w = `${vp.width} ${pinned ? "pinned" : "unpinned"}`;
      const r = await page.evaluate(() => {
        const tb = [...document.querySelectorAll<HTMLElement>("[data-qc140='toolbar']")].find((e) => e.getBoundingClientRect().height > 0)!;
        const t = tb.getBoundingClientRect();
        const parts = ["[data-qc140='jump']", "[data-qc140='find']", "[data-qc140='group-chip']", "[data-qc140='filters-chip']", "[data-qc140='pin']"]
          .map((s) => tb.querySelector<HTMLElement>(s)?.getBoundingClientRect()).filter(Boolean) as DOMRect[];
        return { h: t.height, tops: parts.map((p) => p.top), hs: parts.map((p) => p.height), n: parts.length };
      });
      L.check("A1", `${w} five controls`, r.n === 5, `${r.n}`);
      L.check("A1", `${w} one line (every top within 2px)`, Math.max(...r.tops) - Math.min(...r.tops) <= 2, r.tops.map((x) => x.toFixed(1)).join(","));
      L.check("A1", `${w} height`, near(r.h, pinned ? 72 : 64, 0.6), `${r.h}`);
      L.check("A1", `${w} controls 40 tall`, r.hs.every((h) => near(h, 40, 0.6)), r.hs.join(","));
      const old = await page.evaluate(() => ({
        title: /Showing all \d+ quer/.test(document.querySelector(".qcv-group[data-v138]")?.textContent ?? ""),
        sort: !!document.querySelector(".qcv-group[data-v138] [data-ltb='sort-name'], .qcv-group[data-v138] [data-qc138='sort']"),
        density: !!document.querySelector(".qcv-group[data-v138] [data-qcv='ws-density']"),
        full: !!document.querySelector(".qcv-group[data-v138] .plb, .qcv-group[data-v138] [data-qc138='full']"),
      }));
      L.check("A1", `${w} no old title, Sort, density toggle or Full screen`, !old.title && !old.sort && !old.density && !old.full, JSON.stringify(old));
    }
    L.done(20);
  });

  test("A2 · jump labels: Next action — every button and menu item has text; no two neighbours share a mark; each mark is its band's", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("A2");
    for (const vp of SIZES) {
      await open(page, vp, "A2", { group: "action" });
      const r = await page.evaluate(() => {
        const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
        const btns = [...g.querySelectorAll<HTMLElement>("[data-qc140='jump-btn']")];
        /* the badge as RENDERED: the jump mark's drawn badge (.qc140-jbd) or the band's [data-qc139='badge'] — never an attribute
           on the mark's box, which survives the badge not being drawn */
        const sig = (e: Element | null) => {
          const m = e?.querySelector<HTMLElement>("[data-qc140='jump-mark'], [data-qc139='band-art']");
          const jb = m?.querySelector<HTMLElement>(".qc140-jbd");
          const bb = e?.querySelector<HTMLElement>("[data-qc139='badge']");
          const badge = jb ? (m?.dataset.badge ?? "?") : bb ? (bb.dataset.badge ?? "?") : "-";
          return `${m?.dataset.glyph ?? m?.dataset.kind ?? "?"}|${badge}`;
        };
        const bands = Object.fromEntries([...g.querySelectorAll<HTMLElement>("[data-qcv='gband']")].map((b) => [b.dataset.group, sig(b)]));
        return btns.map((b) => ({ key: b.dataset.gkey ?? "", text: (b.innerText || b.textContent || "").trim(), sig: sig(b), band: bands[b.dataset.gkey ?? ""] ?? null }));
      });
      L.check("A2", `${vp.width} buttons`, r.length >= 4, `${r.length}`);
      L.check("A2", `${vp.width} every button has visible text`, r.every((b) => /[A-Za-z]/.test(b.text)), JSON.stringify(r.map((b) => b.text)));
      /* the closed bands (Passed, No reply, Withdrawn) carry the one grey closed glyph with no badge, by design (v139 C);
         the rule is about the badged groups, whose badge is what tells two Queried-glyph groups apart */
      const badged = r.filter((b) => !/^(Rejected|No Response|Withdrawn|Signed)$/.test(b.key));
      L.check("A2", `${vp.width} no two neighbouring badged groups share a mark`, badged.every((b, i) => i === 0 || b.sig !== badged[i - 1].sig), badged.map((b) => b.sig).join(" "));
      L.check("A2", `${vp.width} each button's mark is its band's`, r.every((b) => b.band === null || b.band === b.sig), JSON.stringify(r.filter((b) => b.band !== null && b.band !== b.sig)));
      L.check("A2", `${vp.width} the badge is drawn on the badged groups`, r.filter((b) => !/^(Rejected|No Response|Withdrawn|Signed)$/.test(b.key)).every((b) => !b.sig.endsWith("|-")), r.map((b) => `${b.key}:${b.sig}`).join(" "));
      const more = await box(page, `${G} [data-qc140='jump-more']:not([hidden])`);
      if (more) {
        await press(page, `${G} [data-qc140='jump-more']`);
        await page.waitForTimeout(400);
        const items = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='jump-item']")].map((e) => (e.innerText || "").trim()));
        L.check("A2", `${vp.width} every "Jump to" item has text`, items.length > 0 && items.every((t) => /[A-Za-z]/.test(t)), JSON.stringify(items));
        await page.keyboard.press("Escape");
      } else L.check("A2", `${vp.width} nothing folded (no menu to read)`, true, "");
    }
    L.done(12);
  });

  test("A3 · fold: buttons end inside the row; visible + folded = groups; the menu lists the folded; pinned and unpinned fold alike", async ({ page }) => {
    test.setTimeout(400_000);
    const L = new Ledger("A3");
    const readFold = () => page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
      const row = g.querySelector<HTMLElement>("[data-qc140='jump']")!.getBoundingClientRect();
      const btns = [...g.querySelectorAll<HTMLElement>("[data-qc140='jump-btn']")];
      const shown = btns.filter((b) => !b.hasAttribute("data-over") && b.getBoundingClientRect().width > 0);
      const folded = btns.filter((b) => b.hasAttribute("data-over")).map((b) => b.dataset.gkey);
      const bands = g.querySelectorAll("[data-qcv='gband']").length;
      return { rowW: row.width, inside: shown.every((b) => b.getBoundingClientRect().right <= row.right + 0.5), shown: shown.map((b) => b.dataset.gkey), folded, total: btns.length, bands, more: Number(g.querySelector<HTMLElement>("[data-qc140='jump-more']")?.dataset.n ?? 0) };
    });
    for (const vp of SIZES) {
      const by: Record<string, Awaited<ReturnType<typeof readFold>>> = {};
      for (const pinned of [false, true]) {
        await open(page, vp, "A3", { group: "status", pinned });
        const f = await readFold();
        by[pinned ? "p" : "u"] = f;
        const w = `${vp.width} ${pinned ? "pinned" : "unpinned"}`;
        L.check("A3", `${w} every visible button ends inside the row`, f.inside, JSON.stringify(f));
        L.check("A3", `${w} visible + folded = the groups`, f.shown.length + f.folded.length === f.total && f.total === f.bands, `${f.shown.length}+${f.folded.length} / ${f.total} / bands ${f.bands}`);
        L.check("A3", `${w} "+N more" counts the folded`, f.more === f.folded.length, `${f.more} vs ${f.folded.length}`);
        if (f.folded.length) {
          await press(page, `${G} [data-qc140='jump-more']`);
          await page.waitForTimeout(400);
          const items = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='jump-item']")].map((e) => e.dataset.gkey));
          L.check("A3", `${w} the menu lists exactly the folded`, JSON.stringify(items) === JSON.stringify(f.folded), `${items} vs ${f.folded}`);
          await page.keyboard.press("Escape");
        } else L.check("A3", `${w} nothing folded`, true, "");
      }
      /* the same row width folds the same groups: compare by the row's width */
      const same = Math.abs(by.u.rowW - by.p.rowW) <= 2 ? Math.abs(by.u.folded.length - by.p.folded.length) <= 1 : true;
      L.check("A3", `${vp.width} pinned and unpinned fold alike for one row width (±1)`, same, `rows ${by.u.rowW.toFixed(0)}/${by.p.rowW.toFixed(0)} · folded ${by.u.folded.length}/${by.p.folded.length}`);
    }
    /* measured against the row: force a narrow row and check again */
    await open(page, SIZES[1], "A3", { group: "action" });
    const f = await readFold();
    L.check("A3", "1280 Next action: inside the row", f.inside && f.shown.length + f.folded.length === f.total, JSON.stringify({ shown: f.shown.length, folded: f.folded.length, total: f.total }));
    L.done(18);
  });

  test("A4 · jump: a group lands its band, a month its first row, within 2px of the sticky stack's bottom", async ({ page }) => {
    test.setTimeout(400_000);
    const L = new Ledger("A4");
    for (const vp of SIZES) for (const [group, kind] of [["status", "group"], ["none", "month"]] as const) {
      await open(page, vp, "A4", { group });
      const keys = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138] [data-qc140='jump-btn']")].filter((b) => !b.hasAttribute("data-over") && b.getBoundingClientRect().width > 0).map((b) => b.dataset.gkey!));
      L.check("A4", `${vp.width} ${kind}: buttons`, keys.length >= 2, `${keys.length}`);
      for (const k of keys.slice(1, 4)) {
        await scrollTo(page, 0);
        await page.waitForTimeout(200);
        await page.evaluate((key) => { const b = [...document.querySelectorAll<HTMLElement>(`.qcv-group[data-v138] [data-qc140='jump-btn'][data-gkey='${key}']`)].find((x) => x.getBoundingClientRect().width > 0); b?.click(); }, k);
        await page.waitForTimeout(1300);
        const r = await page.evaluate((key) => {
          const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
          const heads = g.querySelector<HTMLElement>(".qc138-heads")!.getBoundingClientRect();
          const target = key.startsWith("m:")
            ? null
            : g.querySelector<HTMLElement>(`[data-qcv='gband'][data-group='${CSS.escape(key)}']`);
          return { stackBottom: heads.bottom, top: target?.getBoundingClientRect().top ?? null, current: g.querySelector<HTMLElement>("[data-qc140='jump-btn'][aria-current='true']")?.dataset.gkey ?? null };
        }, k);
        if (kind === "group") L.check("A4", `${vp.width} ${k} lands under the stack`, r.top != null && Math.abs(r.top - r.stackBottom) <= 2, `${r.top} vs ${r.stackBottom.toFixed(1)}`);
        else {
          const first = await page.evaluate((key) => {
            const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
            const heads = g.querySelector<HTMLElement>(".qc138-heads")!.getBoundingClientRect().bottom;
            const rows = [...g.querySelectorAll<HTMLElement>("[data-qcv='row']")].filter((r) => r.getBoundingClientRect().bottom > heads + 1);
            return { heads, top: rows[0]?.getBoundingClientRect().top ?? null, month: key };
          }, k);
          L.check("A4", `${vp.width} ${k}: its first row lands under the stack`, first.top != null && Math.abs(first.top - first.heads) <= 2, `${first.top} vs ${first.heads.toFixed(1)}`);
        }
      }
    }
    L.done(12);
  });

  test("B1 · unpinned bar: navy toolbar, 18px card corners, cream Pin, no ring on the controls", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("B1");
    for (const vp of SIZES) {
      await open(page, vp, "B1");
      L.check("B1", `${vp.width} toolbar navy`, (await bg(page, `${G} [data-qc140='toolbar']`)) === "rgb(42, 58, 82)", `${await bg(page, `${G} [data-qc140='toolbar']`)}`);
      const r = await page.evaluate(() => {
        const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
        const sheet = g.querySelector<HTMLElement>(".qc138-sheet")!;
        const cs = getComputedStyle(sheet);
        const pin = g.querySelector<HTMLElement>("[data-qc140='pin']")!;
        const ring = (s: string) => { const e = g.querySelector<HTMLElement>(s); if (!e) return "none"; const c = getComputedStyle(e); return `${c.boxShadow}|${c.borderTopWidth}|${c.outlineStyle}`; };
        return { corners: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomLeftRadius, cs.borderBottomRightRadius], pin: getComputedStyle(pin).backgroundColor, pinText: pin.textContent?.trim(), rings: [ring("[data-qc140='find']"), ring("[data-qc140='group']"), ring("[data-qc140='filters']")] };
      });
      L.check("B1", `${vp.width} card corners 18`, r.corners.every((c) => c === "18px"), r.corners.join(","));
      L.check("B1", `${vp.width} Pin cream`, r.pin === "rgb(244, 238, 229)", `${r.pin}`);
      L.check("B1", `${vp.width} Pin reads "Pin list"`, /Pin list/.test(r.pinText ?? "") || vp.width === 1280, `${r.pinText}`);
      L.check("B1", `${vp.width} no ring on the controls`, r.rings.every((x) => /^none\|0px\|none$/.test(x)), r.rings.join(" ‖ "));
    }
    L.done(10);
  });

  test("C1 · pinned scheme: navy band, cream toolbar, white headings, flush to the sheet at the top", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C1");
    for (const vp of SIZES) {
      await open(page, vp, "C1", { pinned: true });
      await scrollTo(page, 0);
      await page.waitForTimeout(300);
      L.check("C1", `${vp.width} band navy`, (await bg(page, "[data-qc140='band']")) === "rgb(42, 58, 82)", `${await bg(page, "[data-qc140='band']")}`);
      L.check("C1", `${vp.width} toolbar cream`, (await bg(page, `${G} [data-qc140='toolbar']`)) === "rgb(244, 240, 233)", `${await bg(page, `${G} [data-qc140='toolbar']`)}`);
      L.check("C1", `${vp.width} headings white`, (await bg(page, `${G} .qc138-heads`)) === "rgb(255, 255, 255)", `${await bg(page, `${G} .qc138-heads`)}`);
      const r = await page.evaluate(() => {
        const sheet = [...document.querySelectorAll<HTMLElement>(".ws-window")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
        const band = [...document.querySelectorAll<HTMLElement>("[data-qc140='band']")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
        const list = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138] .qc138-sheet")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
        return { sheetL: sheet.left, sheetT: sheet.top, listL: list.left, bandT: band.top };
      });
      L.check("C1", `${vp.width} the list's left is the sheet's (±1)`, near(r.listL, r.sheetL, 1), JSON.stringify(r));
      L.check("C1", `${vp.width} the band sits at the sheet's top at scroll 0`, near(r.bandT, r.sheetT, 1.5), JSON.stringify(r));
    }
    L.done(10);
  });

  test("C2 · no repeats: the band names none of Your move, Waiting, Closed", async ({ page }) => {
    test.setTimeout(200_000);
    const L = new Ledger("C2");
    for (const vp of SIZES) {
      await open(page, vp, "C2", { pinned: true });
      const t = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='band']")].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "");
      L.check("C2", `${vp.width} the band is there`, t.length > 10, t.slice(0, 80));
      L.check("C2", `${vp.width} no court words`, !/Your move|Waiting|Closed/.test(t), t.replace(/\s+/g, " ").slice(0, 160));
    }
    L.done(4);
  });

  test("C3 · figures: heard back, asked for more and overdue as lib/responses and the reply-date filter make them", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C3");
    const want = JSON.parse(execSync("node tests/e2e/qc140Figures.mjs", { encoding: "utf8" }).trim().split("\n").pop()!) as { total: number; more: number; passed: number; heard: number };
    for (const vp of SIZES) {
      await open(page, vp, "C3", { pinned: true });
      const r = await page.evaluate(() => {
        const t = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        return { count: t("[data-qc140='band-figure']"), pct: t("[data-qc140='band-heard-pct']"), more: t("[data-qc140='band-more']"), over: [...document.querySelectorAll<HTMLElement>("[data-qc140='band-overdue']")].find((e) => e.getBoundingClientRect().height > 0)?.dataset.n ?? null };
      });
      L.check("C3", `${vp.width} {N} queries`, r.count === String(want.total), `${r.count} vs ${want.total}`);
      L.check("C3", `${vp.width} heard back`, new RegExp(`^${want.heard}%`).test(r.pct), `${r.pct} vs ${want.heard}%`);
      L.check("C3", `${vp.width} asked for more`, new RegExp(`^${want.more}\\b`).test(r.more), `${r.more} vs ${want.more}`);
      /* overdue: the band's count is the "Past their reply date" switch's count, and pressing it shows that many rows */
      /* no Escape here: Escape unpins the list, and the band is the pinned list's */
      const sw = await page.evaluate(async () => {
        const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
        g.querySelector<HTMLElement>("[data-qc140='filters']")?.click();
        await new Promise((r) => setTimeout(r, 500));
        const past = document.querySelector<HTMLElement>("[data-qc140='more'][data-k='past']");
        const n = past?.textContent?.match(/(\d+)\s*$/)?.[1] ?? past?.getAttribute("data-n") ?? null;
        return n;
      });
      await press(page, "[data-qc140='filter-close']");
      await page.waitForTimeout(400);
      L.check("C3", `${vp.width} overdue = the reply-date switch's count`, r.over != null && sw != null && r.over === sw, `${r.over} vs ${sw}`);
      await press(page, "[data-qc140='band-overdue']");
      await page.waitForTimeout(900);
      const shown = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='applied-count']")].find((e) => e.getBoundingClientRect().height > 0)?.textContent?.match(/(\d+)/)?.[1] ?? null);
      if (shown == null) console.log("C3 debug", await page.evaluate(() => JSON.stringify({
        bands: [...document.querySelectorAll<HTMLElement>("[data-qc140='band-overdue']")].map((e) => [e.getBoundingClientRect().height, e.getAttribute("aria-pressed"), e.getAttribute("data-n")]),
        rows: [...document.querySelectorAll<HTMLElement>("[data-qc140='applied']")].map((e) => [e.getBoundingClientRect().height, e.textContent?.slice(0, 60)]),
        menu: !!document.querySelector("[data-qc140='filter-menu']"),
      })));
      L.check("C3", `${vp.width} pressing it shows that many`, shown === r.over, `${shown} vs ${r.over}`);
      await press(page, "[data-qc140='band-overdue']");
      await page.waitForTimeout(500);
    }
    L.done(10);
  });

  test("C4 · illustration: its aspect, nothing clips it, and it covers no control or heading", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C4");
    for (const vp of SIZES) {
      await open(page, vp, "C4", { pinned: true });
      for (const y of [0, 900]) {
        await scrollTo(page, y);
        await page.waitForTimeout(400);
        const r = await page.evaluate(() => {
          const art = [...document.querySelectorAll<HTMLImageElement>("[data-qc140='band-art'] img, img[data-qc140='band-art']")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
          if (!art) return null;
          const a = art.getBoundingClientRect();
          const ratio = a.width / a.height, natural = art.naturalWidth / art.naturalHeight;
          let clip: string | null = null;
          for (let p = art.parentElement; p && p !== document.body; p = p.parentElement) {
            const cs = getComputedStyle(p);
            if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.clipPath !== "none") {
              const b = p.getBoundingClientRect();
              if (a.left < b.left - 0.5 || a.top < b.top - 0.5 || a.right > b.right + 0.5 || a.bottom > b.bottom + 0.5) { clip = `${p.className || p.tagName}`; break; }
            }
          }
          const hit = (r: DOMRect) => !(r.right <= a.left || r.left >= a.right || r.bottom <= a.top || r.top >= a.bottom);
          const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
          const controls = [...g.querySelectorAll<HTMLElement>("button, input, [role='button']"), ...document.querySelectorAll<HTMLElement>("[data-qc140='band'] button")].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest("[data-qcv='row']") && !e.closest("[data-qcv='gband']"));
          const heads = [...g.querySelectorAll<HTMLElement>(".qc138-heads [role='columnheader'] span")];
          return { ratio, natural, clip, over: controls.filter((c) => hit(c.getBoundingClientRect())).map((c) => c.textContent?.trim().slice(0, 20)), heads: heads.filter((h) => hit(h.getBoundingClientRect())).map((h) => h.textContent) };
        });
        const w = `${vp.width} @${y}`;
        L.check("C4", `${w} the drawing is there`, !!r, "");
        if (!r) continue;
        L.check("C4", `${w} its natural aspect (±1%)`, Math.abs(r.ratio / r.natural - 1) <= 0.01, `${r.ratio.toFixed(3)} vs ${r.natural.toFixed(3)}`);
        L.check("C4", `${w} no ancestor clips it`, r.clip === null, `${r.clip}`);
        L.check("C4", `${w} it covers no control`, r.over.length === 0, JSON.stringify(r.over));
        L.check("C4", `${w} it covers no heading text`, r.heads.length === 0, JSON.stringify(r.heads));
      }
    }
    L.done(20);
  });

  test("D1 · one state: the Overdue pick is the reply-date switch; the Offers pick is the Offers toggle; one chip each", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("D1");
    await open(page, SIZES[0], "D1");
    const menu = async () => { if (!(await page.locator("[data-qc140='filter-menu']").count())) await press(page, `${G} [data-qc140='filters']`); await page.waitForTimeout(500); };
    const state = () => page.evaluate(() => ({
      over: document.querySelector<HTMLElement>("[data-qc140='quick'][data-qp='over']")?.getAttribute("aria-pressed"),
      past: document.querySelector<HTMLElement>("[data-qc140='more'][data-k='past']")?.getAttribute("aria-checked"),
      offersQ: document.querySelector<HTMLElement>("[data-qc140='quick'][data-qp='offers']")?.getAttribute("aria-pressed"),
      chips: [...document.querySelectorAll<HTMLElement>("[data-qc140='applied-chip']")].filter((c) => c.getBoundingClientRect().width > 0).map((c) => c.dataset.k),
    }));
    await menu();
    await press(page, "[data-qc140='quick'][data-qp='over']");
    await page.waitForTimeout(500);
    let s = await state();
    L.check("D1", "Overdue pick on → the reply-date switch on", s.over === "true" && s.past === "true", JSON.stringify(s));
    L.check("D1", "one chip for it", s.chips.length === 1, JSON.stringify(s.chips));
    await press(page, "[data-qc140='more'][data-k='past']");
    await page.waitForTimeout(500);
    s = await state();
    L.check("D1", "the switch off → the pick off", s.over === "false" && s.past === "false" && s.chips.length === 0, JSON.stringify(s));
    await press(page, "[data-qc140='quick'][data-qp='offers']");
    await page.waitForTimeout(500);
    s = await state();
    L.check("D1", "Offers pick on → one chip", s.offersQ === "true" && s.chips.length === 1, JSON.stringify(s));
    const offersIsToggle = await page.evaluate(() => document.querySelector<HTMLElement>("[data-qc140='quick'][data-qp='offers']")?.dataset.field ?? null);
    L.check("D1", "the Offers pick writes today's offers toggle", offersIsToggle === "offers", `${offersIsToggle}`);
    const overIsPast = await page.evaluate(() => document.querySelector<HTMLElement>("[data-qc140='quick'][data-qp='over']")?.dataset.field ?? null);
    L.check("D1", "the Overdue pick writes the past switch", overIsPast === "past", `${overIsPast}`);
    await press(page, "[data-qc140='filter-clear']");
    await press(page, "[data-qc140='filter-close']");
    await page.waitForTimeout(400);
    /* pinned: the band's overdue disc is the same state — pressing it sets the switch and lights the disc and the pick */
    await press(page, "[data-qc140='pin']");
    await page.waitForTimeout(1000);
    await press(page, "[data-qc140='band-overdue']");
    await page.waitForTimeout(600);
    const disc = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='band-overdue']")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-pressed") ?? null);
    await menu();
    s = await state();
    L.check("D1", "pinned: the band's disc on → the switch and the pick on, one chip", disc === "true" && s.past === "true" && s.over === "true" && s.chips.length === 1, `disc ${disc} ${JSON.stringify(s)}`);
    await press(page, "[data-qc140='filter-clear']");
    await press(page, "[data-qc140='filter-close']");
    await page.waitForTimeout(400);
    L.done(7);
  });

  test("D2 · escape: pinned with the Filters menu open, Esc closes the menu and the list stays pinned; a second Esc unpins", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("D2");
    for (const vp of SIZES) {
      await open(page, vp, "D2", { pinned: true });
      await press(page, `${G} [data-qc140='filters']`);
      await page.waitForTimeout(600);
      L.check("D2", `${vp.width} the menu opened`, (await page.locator("[data-qc140='filter-menu']").count()) === 1, "");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      L.check("D2", `${vp.width} Esc closed the menu`, (await page.locator("[data-qc140='filter-menu']").count()) === 0, "");
      L.check("D2", `${vp.width} still pinned`, await isPinned(page), "");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(900);
      L.check("D2", `${vp.width} a second Esc unpins`, !(await isPinned(page)), "");
    }
    L.done(8);
  });
  test("E1 · columns: Agent ≤ 264, every column at least its minimum, the gaps ≥ 32 at 1512, the Due dial inside the card at 1280", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("E1");
    const MIN = [190, 92, 160, 150, 150, 64];
    for (const vp of SIZES) for (const pinned of [false, true]) {
      await open(page, vp, "E1", { pinned });
      const w = `${vp.width} ${pinned ? "pinned" : "unpinned"}`;
      const r = await page.evaluate(() => {
        const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
        const hs = [...g.querySelectorAll<HTMLElement>(".qc138-heads [data-qc138='heading']")].map((h) => h.getBoundingClientRect());
        const sheet = g.querySelector<HTMLElement>(".qc138-sheet")!.getBoundingClientRect();
        const dials = [...g.querySelectorAll<HTMLElement>("[data-qcv='row-dial']")].filter((d) => d.getBoundingClientRect().width > 0).map((d) => d.getBoundingClientRect().right);
        const names = [...g.querySelectorAll<HTMLElement>("[data-qcv='row-name']")].slice(0, 30).map((n) => ({ over: n.scrollWidth > n.clientWidth + 1, title: n.getAttribute("title"), text: n.textContent }));
        return { widths: hs.map((h) => h.width), gaps: hs.slice(1).map((h, i) => h.left - hs[i].right), sheetR: sheet.right, dialR: dials.length ? Math.max(...dials) : null, names };
      });
      L.check("E1", `${w} six columns`, r.widths.length === 6, `${r.widths.length}`);
      L.check("E1", `${w} Agent ≤ 264`, r.widths[0] <= 264.5, `${r.widths[0]}`);
      L.check("E1", `${w} every column ≥ its minimum`, r.widths.every((x, i) => x >= MIN[i] - 0.5), r.widths.map((x) => x.toFixed(1)).join(","));
      if (vp.width === 1512) L.check("E1", `${w} gaps between First queried, Where it stands and What you sent ≥ 32`, r.gaps[1] >= 31.5 && r.gaps[2] >= 31.5, r.gaps.map((x) => x.toFixed(1)).join(","));
      if (vp.width === 1280) L.check("E1", `${w} the Due dial ends inside the card`, r.dialR != null && r.dialR <= r.sheetR + 0.5, `${r.dialR} vs ${r.sheetR}`);
      L.check("E1", `${w} a truncated agent name carries its full name in title`, r.names.every((n) => !n.over || n.title === n.text?.trim()), JSON.stringify(r.names.filter((n) => n.over && n.title !== n.text?.trim()).slice(0, 2)));
    }
    L.done(20);
  });

  test("F1 · memory: grouping, density, a status filter and a search survive a reload, already there at the first painted frame", async ({ page }) => {
    test.setTimeout(400_000);
    const L = new Ledger("F1");
    for (const vp of SIZES) {
      await open(page, vp, "F1");
      await pickGroup(page, "status");
      await press(page, `${G} [data-qc140='group']`); await page.waitForTimeout(400);
      await press(page, "[data-qc140='rows-opt'][data-d='compact']"); await page.waitForTimeout(400);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      await press(page, `${G} [data-qc140='filters']`); await page.waitForTimeout(500);
      await press(page, "[data-qc140='stand'][data-k='q']"); await page.waitForTimeout(400);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      await page.locator(`${G} [data-qc140='find'] input`).first().fill("a");
      await page.waitForTimeout(800);
      /* a sampler from the very first frame: what the list shows at its first painted frame, and whether it moves */
      await page.addInitScript(() => {
        const w = window as unknown as { __f1: unknown[] };
        w.__f1 = [];
        const tick = () => {
          const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0);
          const row = g?.querySelector<HTMLElement>("[data-qcv='row']");
          if (row && w.__f1.length < 40) {
            w.__f1.push({
              group: g!.querySelector<HTMLElement>("[data-qc140='group']")?.textContent?.replace(/\s+/g, " ").trim(),
              compact: g!.querySelector<HTMLElement>(".qc138-sheet")?.getAttribute("data-density"),
              chips: [...g!.querySelectorAll<HTMLElement>("[data-qc140='applied-chip']")].map((c) => c.dataset.k),
              find: g!.querySelector<HTMLInputElement>("[data-qc140='find'] input")?.value,
              top: row.offsetTop,
            });
          }
          if (w.__f1.length < 40) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await page.evaluate(() => sessionStorage.setItem("qc140-keep", "1"));
      await page.reload();
      await page.waitForTimeout(4000);
      const f = await page.evaluate(() => (window as unknown as { __f1: { group: string; compact: string; chips: string[]; find: string; top: number }[] }).__f1);
      const first = f[0];
      L.check("F1", `${vp.width} frames were sampled`, f.length > 5, `${f.length}`);
      if (!first) { L.done(1); return; }
      L.check("F1", `${vp.width} grouping restored at the first frame`, /Status/.test(first.group ?? ""), `${first.group}`);
      L.check("F1", `${vp.width} density restored at the first frame`, first.compact === "compact", `${first.compact}`);
      L.check("F1", `${vp.width} the status filter restored at the first frame`, first.chips.some((k) => /^st:q$/.test(k)), JSON.stringify(first.chips));
      L.check("F1", `${vp.width} the search restored at the first frame`, first.find === "a" && first.chips.includes("find"), `${first.find} ${JSON.stringify(first.chips)}`);
      const tops = f.map((x) => x.top);
      L.check("F1", `${vp.width} no layout shift > 2px after the first frame`, Math.max(...tops) - Math.min(...tops) <= 2, tops.slice(0, 12).join(","));
      await page.evaluate(() => { sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qc140-keep"); localStorage.removeItem("qh.qc.view"); });
    }
    L.done(12);
  });

  test("G1 · guide: the pill reads /6; pressing F pins and ticks Pin the list with no walkthrough running", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("G1");
    await open(page, SIZES[0], "G1");
    flags(`--restore '${JSON.stringify({ seen: true, done: { log: true, find: true } })}'`);
    await page.reload();
    await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    const pill = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-pck='pill']")].find((e) => e.getBoundingClientRect().height > 0)?.innerText.replace(/\s+/g, " ") ?? "");
    L.check("G1", "the pill reads /6", /\/6$/.test(pill), pill);
    L.check("G1", "unpinned to start", !(await isPinned(page)), "");
    L.check("G1", "no walkthrough running", (await page.locator("[data-pck='flow'], [data-pck='spot']").count()) === 0, "");
    await page.locator("body").press("f");
    await page.waitForTimeout(2500);
    L.check("G1", "F pinned the list", await isPinned(page), "");
    const g = JSON.parse(flags("")) as { done?: Record<string, boolean> } | null;
    L.check("G1", "Pin the list ticked", g?.done?.pin === true, JSON.stringify(g));
    await page.keyboard.press("Escape");
    L.done(5);
  });
});
