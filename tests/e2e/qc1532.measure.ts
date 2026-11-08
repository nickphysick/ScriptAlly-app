/**
 * Query Centre v153.2 — the rendered page against design-refs/query-centre-v153-2.html.
 *
 *   R0  (recon) what the page measures: the header-to-bar gap, the slip header's height, where the status word sits
 *       against the track, the ring card's parts, the quiet control, the Next box's second line.
 *   O1  the ring is open: no fill, border, shadow, bar or pile; the middle is sent less passed or closed; the legend
 *       heading says "N sent".
 *   O2  hovering a legend row keeps its segment and fades the rest; the tooltip names it.
 *   Q1  the quiet control reads "Gone quiet after N weeks", N the pop-over's checked choice, and opens the pop-over.
 *   G1  the header's content to the slim bar is the ref's 30px (±1).
 *   S1  Tom Ellery's slip (else the first Offer): the word beside the track on one line; the header's height; every
 *       Offer and every Partial requested shows its Next second line.
 *   Screens to reports/qc-v153-2/.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(600_000);
const DIR = "reports/qc-v153-2";
const PAGE = ".qc151.qc153";

export async function ready(page: Page) {
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
  await expect(page.locator(`${PAGE} [data-qc153="slip"]`).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(`${PAGE} [data-qc1531="legend-row"]:not([disabled])`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
}

export async function reading(page: Page) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel)!;
    const hd = root.querySelector<HTMLElement>("[data-qc1531='header']")!;
    const bar = root.querySelector<HTMLElement>("[data-qc153='bar']")!;
    const card = root.querySelector<HTMLElement>("[data-qc1531='ring-card']")!;
    const slip = [...root.querySelectorAll<HTMLElement>("[data-qc153='slip']")].find((s) => s.dataset.status === "Offer") ?? root.querySelector<HTMLElement>("[data-qc153='slip']")!;
    const head = slip.querySelector<HTMLElement>("[data-qc153='head']")!, word = slip.querySelector<HTMLElement>("[data-qc153='word']")!, trk = slip.querySelector<HTMLElement>("[data-qc153='track']")!;
    const w = word.getBoundingClientRect(), t = trk.getBoundingClientRect();
    const cs = getComputedStyle(card);
    const nexts = [...root.querySelectorAll<HTMLElement>("[data-qc153='slip']")].map((s) => {
      const f = s.querySelector<HTMLElement>("[data-k='next']")!;
      return { who: s.getAttribute("aria-label"), value: f.querySelector("b")?.textContent, line: f.querySelector("em")?.textContent ?? null };
    });
    return {
      gap: bar.getBoundingClientRect().top - hd.getBoundingClientRect().bottom,
      visGap: bar.getBoundingClientRect().top - Math.max(...[...hd.children].map((c) => c.getBoundingClientRect().bottom)),
      hdPadB: getComputedStyle(hd).paddingBottom,
      slipWho: slip.getAttribute("aria-label"), headH: head.getBoundingClientRect().height,
      wordVsTrack: { wordLeft: w.left, trackRight: t.right, wordTop: w.top, trackTop: t.top, sameLine: Math.abs((w.top + w.height / 2) - (t.top + t.height / 2)) < 6 && w.left >= t.right - 1 },
      card: { bg: cs.backgroundColor, border: cs.borderTopWidth + " " + cs.borderTopStyle, shadow: cs.boxShadow !== "none", bar: !!card.querySelector(".qc1531-rh"), pile: !!card.querySelector("[data-qc1531='pile']"), mid: card.querySelector("[data-qc1531='mid']")?.textContent ?? null, lgHead: card.querySelector("[data-qc1531='lg-head']")?.textContent ?? null },
      quiet: hd.querySelector("[data-qc152='quiet-setting'] button")?.textContent?.trim() || hd.querySelector("[data-qc152='quiet-setting'] button")?.getAttribute("aria-label") || null,
      nexts,
    };
  }, PAGE);
}

test("v153.2 recon · 1920", async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  await openRoute(page, "/queries", { width: 1920, height: 1080 });
  await ready(page);
  const r = await reading(page);
  writeFileSync(`${DIR}/recon-${process.env.QC1532_TAG ?? "now"}.json`, JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ ...r, nexts: r.nexts.slice(0, 8) }, null, 1));
});

const REF_GAP = 30, REF_HEAD = 66.94;
class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows) console.log(`  ${r.ok ? "✓" : "✗"} ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

for (const vp of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }] as const) {
  test(`v153.2 · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`v1532-${vp.width}`);
    mkdirSync(DIR, { recursive: true });
    await openRoute(page, "/queries", vp);
    await ready(page);
    await page.mouse.move(2, 2);
    await page.screenshot({ path: `${DIR}/header-${vp.width}.png`, clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 520) } });
    const r = await reading(page);

    /* O1 */
    const ring = await page.evaluate((sel) => {
      const c = document.querySelector<HTMLElement>(`${sel} [data-qc1531="ring-card"]`)!;
      const rows = [...c.querySelectorAll<HTMLElement>("[data-qc1531='legend-row']")].map((b) => ({ k: b.dataset.k, n: Number(b.querySelector("b")?.textContent || 0) }));
      return { rows, mid: c.querySelector("[data-qc1531='mid']")?.textContent ?? "", sum: c.querySelector("[data-qc1531='ring-sum']")?.textContent ?? "",
        disc: c.querySelector("svg circle")?.getAttribute("fill"), rule: getComputedStyle(c.querySelector<HTMLElement>("[data-qc1531='lg-head']")!).borderBottom };
    }, PAGE);
    const sent = ring.rows.reduce((n, x) => n + x.n, 0), closed = ring.rows.find((x) => x.k === "closed")?.n ?? 0;
    L.check("O1 no fill, border or shadow", r.card.bg === "rgba(0, 0, 0, 0)" && r.card.border.startsWith("0px") && !r.card.shadow, `${r.card.bg} · ${r.card.border} · shadow ${r.card.shadow}`);
    L.check("O1 no navy bar, no pile", !r.card.bar && !r.card.pile, `bar ${r.card.bar} · pile ${r.card.pile}`);
    L.check("O1 the middle is sent less passed or closed", ring.mid === String(sent - closed), `${ring.mid} = ${sent} − ${closed}`);
    L.check("O1 the middle disc is the soft white", ring.disc === "rgba(255,255,255,.55)", String(ring.disc));
    L.check("O1 the legend heading says N sent", ring.sum === `${sent} sent`, ring.sum);
    L.check("O1 under a 2px navy rule", /^2px solid rgb\(42, 58, 82\)/.test(ring.rule), ring.rule);

    /* O2 */
    const busiest = [...ring.rows].sort((a, b) => b.n - a.n)[0];
    await page.locator(`${PAGE} [data-qc1531="legend-row"][data-k="${busiest.k}"]`).hover();
    await page.waitForTimeout(250);
    const hv = await page.evaluate((sel) => ({
      segs: [...document.querySelectorAll<SVGElement>(`${sel} [data-qc1531='seg']`)].map((s) => ({ k: s.getAttribute("data-k"), o: Number(getComputedStyle(s).opacity) })),
      tip: document.querySelector(`${sel} [data-qc1531='tip']`)?.textContent ?? null,
      fill: getComputedStyle(document.querySelector<HTMLElement>(`${sel} [data-qc1531='legend-row'].is-on`)!).backgroundColor,
    }), PAGE);
    L.check("O2 the hovered segment stays, the rest fade", hv.segs.every((s) => (s.k === busiest.k ? s.o === 1 : Math.abs(s.o - 0.3) < 0.01)), JSON.stringify(hv.segs));
    L.check("O2 the tooltip names it", !!hv.tip && hv.tip.includes(` — ${busiest.n} of ${sent} queries`), String(hv.tip));
    L.check("O2 the linked row takes the soft white fill", hv.fill === "rgba(255, 255, 255, 0.55)", hv.fill);
    const rc = (await page.locator(`${PAGE} [data-qc1531="ring-card"]`).boundingBox())!;
    await page.screenshot({ path: `${DIR}/ring-hover-${vp.width}.png`, clip: { x: rc.x - 20, y: Math.max(0, rc.y - 30), width: rc.width + 40, height: rc.height + 60 } });
    await page.mouse.move(2, 2);

    /* Q1 */
    const q = page.locator(`${PAGE} [data-qc152="quiet-setting"] button`).first();
    const qText = (await q.textContent())?.replace(/\s+/g, " ").trim() ?? "";
    await q.click();
    const pop = page.locator(`${PAGE} [data-qc152="quiet-pop"]`);
    await expect(pop).toBeVisible({ timeout: 5000 });
    const checked = await pop.locator('[role="radio"][aria-checked="true"]').getAttribute("data-weeks");
    L.check("Q1 reads 'Gone quiet after N weeks', N the live setting", qText === `Gone quiet after ${checked} weeks`, `${qText} · checked ${checked}`);
    L.check("Q1 the phrase opens the pop-over", await pop.isVisible(), "open");
    const hb = (await page.locator(`${PAGE} [data-qc1531="header"]`).boundingBox())!;
    await page.screenshot({ path: `${DIR}/quiet-open-${vp.width}.png`, clip: { x: hb.x - 10, y: Math.max(0, hb.y - 10), width: hb.width + 20, height: hb.height + 140 } });
    await page.keyboard.press("Escape");
    await expect(pop).toBeHidden({ timeout: 5000 });
    L.check("Q1 Escape closes it", true, "closed");

    /* G1 */
    L.check("G1 header content to the slim bar is the ref's", Math.abs(r.visGap - REF_GAP) <= 1, `${r.visGap.toFixed(1)}px · ref ${REF_GAP}`);

    /* S1 */
    const tom = await page.evaluate((sel) => {
      const slips = [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc153="slip"]`)];
      const s = slips.find((x) => /^Tom Ellery,/.test(x.getAttribute("aria-label") ?? "")) ?? slips.find((x) => x.dataset.status === "Offer")!;
      const w = s.querySelector<HTMLElement>("[data-qc153='word']")!.getBoundingClientRect(), t = s.querySelector<HTMLElement>("[data-qc153='track']")!.getBoundingClientRect();
      return { id: s.dataset.id, who: s.getAttribute("aria-label"), h: s.querySelector<HTMLElement>("[data-qc153='head']")!.getBoundingClientRect().height,
        same: Math.abs((w.top + w.height / 2) - (t.top + t.height / 2)) < 6, right: w.left >= t.right - 1 };
    }, PAGE);
    L.check("S1 the word sits beside the track, to its right", tom.same && tom.right, `${tom.who}`);
    L.check("S1 the header is two lines tall (within 6px of the ref)", Math.abs(tom.h - REF_HEAD) <= 6, `${tom.h.toFixed(1)}px · ref ${REF_HEAD}`);
    const offers = r.nexts.filter((x) => /, Offer$/.test(x.who ?? "")), partials = r.nexts.filter((x) => /, Partial requested$/.test(x.who ?? ""));
    L.check("S1 every Offer's Next has its second line", offers.length > 0 && offers.every((x) => x.line === "answer the offer"), `${offers.length} offers`);
    L.check("S1 every Partial requested's Next has its second line", partials.length > 0 && partials.every((x) => /^asked (today|\d+ days? ago)$/.test(x.line ?? "")), partials.map((x) => x.line).join(" | "));
    const el = page.locator(`${PAGE} [data-qc153="slip"][data-id="${tom.id}"]`);
    await el.scrollIntoViewIfNeeded(); await el.hover(); await page.waitForTimeout(300);
    const b = (await el.boundingBox())!;
    await page.screenshot({ path: `${DIR}/slip-tom-${vp.width}.png`, clip: { x: b.x - 20, y: b.y - 20, width: b.width + 40, height: b.height + 50 } });
    L.done(17);
  });
}
