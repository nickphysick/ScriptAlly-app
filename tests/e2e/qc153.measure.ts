/**
 * Query Centre v153 — the rendered page against design-refs/query-centre-v153.html, at 1440 and 1920.
 *
 *   S1  the slim bar sticks: after a scroll its top sits on the sheet's lip (`--pin-cover`), not where it started;
 *       the rail sticks beside it. Precondition asserted first: the page really scrolled.
 *   S2  slips: there are some, each is one control named "agent, agency, status", the header's tint is the stage's.
 *   S3  the hover CTA: hidden at rest, shown on hover, 8px slide.
 *   S4  a slip opens the card; Escape closes it and focus comes back to that slip.
 *   S5  no rust or late colour in any text on the page (List and Birds-eye).
 *   S6  Birds-eye renders inside the framed card, its trailing labels in sentence case.
 *   Screens to reports/qc-v153/: list-top, list-hover, card-open, birds, and the ref's list and Birds-eye.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";

test.setTimeout(600_000);
const DIR = "reports/qc-v153";
const SIZES = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }] as const;
const RUST = ["162, 69, 42", "138, 58, 40", "180, 85, 63", "154, 74, 50"];

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const PAGE = ".qc151.qc153";
async function visible(page: Page) {
  await expect(page.locator(`${PAGE} [data-qc153="slip"]`).first()).toBeVisible({ timeout: 60_000 });
}
async function toList(page: Page) {
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
}

for (const vp of SIZES) {
  test(`v153 list · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`list-${vp.width}`);
    mkdirSync(DIR, { recursive: true });
    await openRoute(page, "/queries", vp);
    await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
    await toList(page);
    await visible(page);
    await page.screenshot({ path: `${DIR}/list-top-${vp.width}.png` });

    /* S2 */
    const slips = await page.$$eval(`${PAGE} [data-qc153="slip"]`, (els) => els.map((e) => ({
      role: e.getAttribute("role"), label: e.getAttribute("aria-label") ?? "", tone: e.getAttribute("data-tone"), status: e.getAttribute("data-status"),
      band: getComputedStyle(e.querySelector("[data-qc153='head']")!).backgroundColor, facts: e.querySelectorAll("[data-qc153='fact']").length,
    })));
    L.check("S2 population", slips.length > 0, `${slips.length} slips`);
    const TONE: Record<string, string> = { sand: "rgb(239, 231, 218)", rose: "rgb(236, 214, 210)", blue: "rgb(217, 225, 234)", heather: "rgb(231, 214, 220)" };
    const tones = new Set<string>();
    for (const s of slips) {
      tones.add(s.tone ?? "");
      L.check(`S2 ${s.label}`, s.role === "button" && s.label.split(", ").length >= 3 && s.band === TONE[s.tone ?? ""] && s.facts === 4, `${s.role} · ${s.tone} ${s.band} · ${s.facts} facts`);
    }
    console.log(`tones seen: ${[...tones].join(", ")}`);

    /* S1 — sticky, measured: precondition first */
    const before = await page.evaluate((sel) => {
      const bar = document.querySelector<HTMLElement>(`${sel} [data-qc153="bar"]`)!, rail = document.querySelector<HTMLElement>(`${sel} [data-qc153="rail"]`)!;
      const sc = bar.closest<HTMLElement>(".wpg-scroll")!;
      return { barTop: bar.getBoundingClientRect().top, railTop: rail.getBoundingClientRect().top, scTop: sc.getBoundingClientRect().top, max: sc.scrollHeight - sc.clientHeight };
    }, PAGE);
    L.check("S1 the page can scroll", before.max > 400, `max scroll ${before.max}`);
    /* the bar is the list column's full width and its search takes the rest: a sticky check alone passed over a 34px bar */
    const span = await page.evaluate((sel) => {
      const bar = document.querySelector<HTMLElement>(`${sel} [data-qc153="bar"]`)!, col = bar.parentElement!, find = bar.querySelector<HTMLElement>(".qc153-find")!;
      return { bar: bar.getBoundingClientRect().width, col: col.getBoundingClientRect().width, find: find.getBoundingClientRect().width, h: bar.getBoundingClientRect().height };
    }, PAGE);
    L.check("S1 the bar spans the list column", Math.abs(span.bar - span.col) < 1 && span.h > 45, `bar ${span.bar.toFixed(1)}×${span.h.toFixed(1)} · column ${span.col.toFixed(1)}`);
    L.check("S1 the search takes the remaining width", span.find > 250, `search ${span.find.toFixed(1)}`);
    const after = await page.evaluate((sel) => {
      const bar = document.querySelector<HTMLElement>(`${sel} [data-qc153="bar"]`)!, rail = document.querySelector<HTMLElement>(`${sel} [data-qc153="rail"]`)!;
      const sc = bar.closest<HTMLElement>(".wpg-scroll")!;
      sc.scrollTop = Math.min(sc.scrollHeight - sc.clientHeight, 900);
      const pin = parseFloat(getComputedStyle(bar).top);
      return { scrolled: sc.scrollTop, barTop: bar.getBoundingClientRect().top, railTop: rail.getBoundingClientRect().top, scTop: sc.getBoundingClientRect().top, pin };
    }, PAGE);
    L.check("S1 it scrolled", after.scrolled > 300, `scrollTop ${after.scrolled}`);
    L.check("S1 the bar sits on the lip", Math.abs(after.barTop - (after.scTop + after.pin)) < 1.5, `bar ${after.barTop.toFixed(1)} vs ${(after.scTop + after.pin).toFixed(1)} (was ${before.barTop.toFixed(1)})`);
    L.check("S1 the rail stays on screen", after.railTop >= after.scTop && after.railTop < after.scTop + 60, `rail ${after.railTop.toFixed(1)} (was ${before.railTop.toFixed(1)})`);
    await page.screenshot({ path: `${DIR}/list-scrolled-${vp.width}.png` });
    await page.evaluate((sel) => { document.querySelector<HTMLElement>(`${sel} [data-qc153="bar"]`)!.closest<HTMLElement>(".wpg-scroll")!.scrollTop = 0; }, PAGE);

    /* S3 — the CTA appears on hover */
    const first = page.locator(`${PAGE} [data-qc153="slip"]`).first();
    const rest = await first.locator("[data-qc153='cta']").evaluate((e) => getComputedStyle(e).opacity);
    await first.hover();
    await page.waitForTimeout(400);
    const hov = await first.locator("[data-qc153='cta']").evaluate((e) => getComputedStyle(e).opacity);
    L.check("S3 CTA hidden at rest, shown on hover", rest === "0" && hov === "1", `rest ${rest} · hover ${hov}`);
    await page.screenshot({ path: `${DIR}/list-hover-${vp.width}.png` });

    /* S4 — open the card, Escape, focus back on the slip */
    const id = await first.getAttribute("data-id");
    await first.focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector("[data-qp='panel']", { timeout: 20_000 });
    await page.waitForTimeout(800);
    const sel = await first.evaluate((e) => e.classList.contains("is-sel"));
    L.check("S4 the open slip carries the ring", sel, `is-sel ${sel}`);
    await page.screenshot({ path: `${DIR}/card-open-${vp.width}.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    const back = await page.evaluate(() => document.activeElement?.id ?? "");
    L.check("S4 focus returns to the slip", back === `query-row-${id}`, `active ${back}`);

    /* S5 — no rust anywhere in the page's text */
    const rusty = await page.evaluate(([sel, rust]) => {
      const out: string[] = [];
      document.querySelectorAll<HTMLElement>(`${sel} *`).forEach((e) => {
        if (!e.offsetParent) return;
        const c = getComputedStyle(e).color;
        if ((rust as string[]).some((r) => c.includes(r))) out.push(`${e.className} ${c}`);
      });
      return out;
    }, [PAGE, RUST] as const);
    L.check("S5 no rust text in List", rusty.length === 0, rusty.slice(0, 5).join(" | "));
    L.done(8);
  });

  test(`v153 birds-eye · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`birds-${vp.width}`);
    await openRoute(page, "/queries", vp);
    await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
    await page.locator(`${PAGE} [data-qc153="bar"] button[data-v="birds"]`).click();
    await page.waitForSelector(`${PAGE} [data-qc150="be-row"]`, { timeout: 30_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${DIR}/birds-${vp.width}.png` });
    const r = await page.evaluate(([sel, rust]) => {
      const card = document.querySelector(`${sel} .qc151-be`);
      const marks = [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc150="be-mark"]`)].map((e) => ({ t: e.textContent ?? "", tt: getComputedStyle(e).textTransform, ls: getComputedStyle(e).letterSpacing }));
      const rusty: string[] = [];
      document.querySelectorAll<HTMLElement>(`${sel} .qc151-be *`).forEach((e) => {
        const cs = getComputedStyle(e);
        for (const v of [cs.color, cs.backgroundColor, cs.borderLeftColor]) if ((rust as string[]).some((x) => v.includes(x))) rusty.push(`${e.className} ${v}`);
      });
      return { framed: !!card?.classList.contains("sa-slip") && !!card.querySelector(":scope > .sa-slip-in"), marks, rusty };
    }, [PAGE, RUST] as const);
    L.check("S6 Birds-eye is in the framed card", r.framed, `${r.framed}`);
    L.check("S6 there are trailing labels", r.marks.length > 0, `${r.marks.length}`);
    for (const m of r.marks) L.check(`S6 "${m.t}"`, m.t === m.t.toLowerCase().replace(/^./, (c) => m.t[0]) && m.tt === "none" && (m.ls === "normal" || m.ls === "0px"), `${m.tt} ${m.ls}`);
    L.check("S5 no rust in Birds-eye", r.rusty.length === 0, r.rusty.slice(0, 5).join(" | "));
    L.done(4);
  });
}

test("the ref, for the side-by-side", async ({ page }) => {
  const ref = `file://${resolve("design-refs/query-centre-v153.html")}`;
  for (const vp of SIZES) {
    await page.setViewportSize(vp);
    await page.goto(ref);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${DIR}/ref-birds-${vp.width}.png` });
    await page.click('#lh [data-vw="list"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/ref-list-${vp.width}.png` });
    await page.hover(".slip >> nth=0");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${DIR}/ref-hover-${vp.width}.png` });
  }
});
