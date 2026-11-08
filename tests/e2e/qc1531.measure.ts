/**
 * Query Centre v153.1 — the rendered page against design-refs/query-centre-v153-1.html, at 1440 and 1920.
 *
 *   H1  the header: the hawk, the title, the "for" line, the buttons and the ring card on one row; no navy banner,
 *       no "This week" line; the title's count is the sent figure.
 *   H2  the ring adds up: its legend's counts sum to the "sent" figure in the title and in the card's header.
 *   H3  hover a legend row: its segment stays, the others fade to 30%, the tooltip names it.
 *   H4  a ring click turns the rail's stage rows on and narrows the list; a second click clears it.
 *   P1  the doodle tile is still visible at the bottom of the list (pixel read against the plain ground).
 *   P2  the rail's header band is white with a 2px navy rule.
 *   S1  slips: compact header (40px seal, 34px current step), four fact boxes, Their policy, no Sent with box.
 *   S2  the materials strip: chips, a dashed "asked" chip where one is owed, "Sent with …" at the right.
 *   S3  at 1200 the facts are 2 × 2.
 *   Screens to reports/qc-v153-1/.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(600_000);
const DIR = "reports/qc-v153-1";
const SIZES = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }] as const;

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

const PAGE = ".qc151.qc153";
async function ready(page: Page) {
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
  await expect(page.locator(`${PAGE} [data-qc153="slip"]`).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(`${PAGE} [data-qc1531="legend-row"]:not([disabled])`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
}

for (const vp of SIZES) {
  test(`v153.1 header · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`header-${vp.width}`);
    mkdirSync(DIR, { recursive: true });
    await openRoute(page, "/queries", vp);
    await ready(page);
    await page.screenshot({ path: `${DIR}/list-top-${vp.width}.png` });

    const h = await page.evaluate((sel) => {
      const root = document.querySelector(sel)!;
      const hd = root.querySelector<HTMLElement>("[data-qc1531='header']")!;
      const r = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      const rows = [...root.querySelectorAll<HTMLElement>("[data-qc1531='legend-row']")].map((b) => ({ k: b.dataset.k, n: Number(b.querySelector("b")?.textContent || 0), label: b.getAttribute("aria-label") }));
      return {
        title: hd.querySelector("h1")?.textContent ?? "", forLine: hd.querySelector("[data-qc1531='for']")?.textContent ?? null,
        sum: hd.querySelector("[data-qc1531='ring-sum']")?.textContent ?? "",
        banner: !!root.querySelector("[data-qc1512='banner']"), slim: !!root.querySelector(".qc153-slim, [data-qc1511='summary']"),
        art: r(hd.querySelector(".qc1531-art img")), main: r(hd.querySelector(".qc1531-main")), card: r(hd.querySelector("[data-qc1531='ring-card']")),
        cols: getComputedStyle(hd).gridTemplateColumns, rows, quiet: !!hd.querySelector("[data-qc152='quiet-setting']"),
        hdBg: getComputedStyle(hd).backgroundColor,
      };
    }, PAGE);
    const sent = Number(/^(\d+)/.exec(h.title)?.[1] ?? NaN);
    L.check("H1 no navy banner, no This week line", !h.banner && !h.slim, `banner ${h.banner} · slim ${h.slim}`);
    L.check("H1 three columns, the ring card on the right", !!h.art && !!h.main && !!h.card && h.art.x < h.main.x && h.main.x < h.card.x, `cols ${h.cols}`);
    L.check("H1 the hawk is 190 wide", h.art && Math.round(h.art.w) === 190, `${h.art?.w}`);
    L.check("H1 the header has no ground of its own", h.hdBg === "rgba(0, 0, 0, 0)", h.hdBg);
    L.check("H1 the quiet-window setting survives", h.quiet, `${h.quiet}`);
    L.check("H1 title reads N queries sent", /^\d+ quer(y|ies) sent$/.test(h.title), h.title);
    console.log(`for line: ${h.forLine}`);
    /* H2 */
    const total = h.rows.reduce((n, r) => n + r.n, 0);
    L.check("H2 the legend sums to the sent figure", total === sent, `${total} vs ${sent}`);
    L.check("H2 the card's header agrees", h.sum.endsWith(`${sent} sent`), h.sum);
    L.check("H2 five rows, each named 'label, n of total'", h.rows.length === 5 && h.rows.every((r) => r.label?.endsWith(`of ${sent}`)), h.rows.map((r) => r.label).join(" | "));

    /* H3 — hover the busiest bucket's legend row */
    const busiest = [...h.rows].sort((a, b) => b.n - a.n)[0];
    await page.locator(`${PAGE} [data-qc1531="legend-row"][data-k="${busiest.k}"]`).hover();
    await page.waitForTimeout(250);
    const hv = await page.evaluate(({ sel, k }) => {
      const segs = [...document.querySelectorAll<SVGElement>(`${sel} [data-qc1531='seg']`)].map((s) => ({ k: s.getAttribute("data-k"), o: Number(getComputedStyle(s).opacity) }));
      return { segs, tip: document.querySelector(`${sel} [data-qc1531='tip']`)?.textContent ?? null, k };
    }, { sel: PAGE, k: busiest.k });
    L.check("H3 the hovered segment stays, the others fade to 30%", hv.segs.length > 1 && hv.segs.every((s) => (s.k === busiest.k ? s.o === 1 : Math.abs(s.o - 0.3) < 0.01)), JSON.stringify(hv.segs));
    L.check("H3 the tooltip names it", !!hv.tip && hv.tip.includes(` — ${busiest.n} of ${sent} queries`), String(hv.tip));
    await page.screenshot({ path: `${DIR}/ring-hover-${vp.width}.png`, clip: { x: h.card!.x - 20, y: Math.max(0, h.card!.y - 60), width: h.card!.w + 40, height: h.card!.h + 80 } });

    /* H4 — click a ring segment */
    const pick = h.rows.find((r) => r.k === "partial" && r.n > 0) ?? h.rows.find((r) => r.n > 0 && r.k !== busiest.k)!;
    const countSlips = () => page.locator(`${PAGE} [data-qc153="slip"]`).count();
    const before = await countSlips();
    await page.locator(`${PAGE} [data-qc1531="seg"][data-k="${pick.k}"]`).click({ force: false });
    await page.waitForTimeout(400);
    const after = await page.evaluate((sel) => ({
      slips: [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc153="slip"]`)].map((s) => s.dataset.status),
      railOn: [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc153="rail"] [aria-pressed="true"], ${sel} [data-qc153="rail"] [aria-checked="true"]`)].map((e) => e.textContent?.trim().slice(0, 30)),
      rowPressed: document.querySelector(`${sel} [data-qc1531="legend-row"][aria-pressed="true"]`)?.getAttribute("data-k") ?? null,
    }), PAGE);
    L.check("H4 the list narrows to that bucket", after.slips.length > 0 && after.slips.length <= pick.n && after.slips.length < before, `${before} → ${after.slips.length} (${[...new Set(after.slips)].join(", ")})`);
    L.check("H4 the rail shows it on", after.railOn.length > 0, after.railOn.join(" | "));
    L.check("H4 the legend row is pressed", after.rowPressed === pick.k, String(after.rowPressed));
    await page.locator(`${PAGE} [data-qc1531="legend-row"][data-k="${pick.k}"]`).click();
    await page.waitForTimeout(400);
    L.check("H4 a second click clears it", (await countSlips()) === before, `${await countSlips()} vs ${before}`);
    L.done(14);
  });
}

/** count the pixels in a screenshot that are not the plain ground — the doodle's strokes — decoded in the page's canvas */
async function inkPixels(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  const png = (await page.screenshot({ clip })).toString("base64");
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0, ground = 0;
    for (let i = 0; i < d.length; i += 4) {
      const off = Math.max(Math.abs(d[i] - 242), Math.abs(d[i + 1] - 238), Math.abs(d[i + 2] - 232));
      if (off >= 2) n++; else ground++;
    }
    return { n, ground, total: d.length / 4 };
  }, png);
}

/* at 2560: the workspace column caps at 1660 (workspace width v2), so only a wide window leaves plain ground beside it */
test("v153.1 pattern and rail header · 2560", async ({ page }) => {
  const L = new Ledger("pattern-2560");
  await openRoute(page, "/queries", { width: 2560, height: 1200 });
  await ready(page);
  const rh = await page.evaluate((sel) => {
    const e = document.querySelector<HTMLElement>(`${sel} [data-qc153="rail-head"]`)!; const cs = getComputedStyle(e);
    return { bg: cs.backgroundColor, sh: cs.boxShadow };
  }, PAGE);
  L.check("P2 the rail's header is white", rh.bg === "rgb(255, 255, 255)", rh.bg);
  L.check("P2 with a 2px navy rule at its foot", /rgb\(42, 58, 82\) 0px -2px 0px 0px inset/.test(rh.sh), rh.sh);

  /* P1 — a strip of the page's own ground beside the columns, at the top and at the foot of the list */
  const geo = async () => page.evaluate((sel) => {
    const cl = document.querySelector<HTMLElement>(`${sel} [data-qc153="columns"]`)!; const sc = cl.closest<HTMLElement>(".wpg-scroll")!;
    const a = cl.getBoundingClientRect(), s = sc.getBoundingClientRect();
    /* clear of the sheet's own edge shading on the left and the rail's shadow on the right */
    return { x: s.left + 30, w: Math.max(0, a.left - s.left - 70), top: s.top, h: s.height, max: sc.scrollHeight - sc.clientHeight, sTop: sc.scrollTop };
  }, PAGE);
  const g0 = await geo();
  L.check("P1 precondition: a margin of ground beside the columns", g0.w >= 80, `${g0.w}px`);
  L.check("P1 precondition: the list is long", g0.max > 1500, `max scroll ${g0.max}`);
  const top = await inkPixels(page, { x: g0.x, y: g0.top + 100, width: g0.w, height: 300 });
  await page.evaluate((sel) => { const sc = document.querySelector(`${sel}`)!.closest<HTMLElement>(".wpg-scroll")!; sc.scrollTop = sc.scrollHeight; }, PAGE);
  await page.waitForTimeout(400);
  const g1 = await geo();
  L.check("P1 precondition: scrolled to the foot", g1.sTop >= g1.max - 2 && g1.sTop > 1500, `${g1.sTop} of ${g1.max}`);
  const foot = await inkPixels(page, { x: g1.x, y: g1.top + g1.h - 340, width: g1.w, height: 300 });
  L.check("P1 the tile is visible at the foot of the list", foot.n > 40, `${foot.n} stroke pixels of ${foot.total} (top ${top.n})`);
  await page.screenshot({ path: `${DIR}/list-foot-2560.png` });
  L.done(6);
});

async function slipReading(page: Page) {
  return page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc153="slip"]`)].map((s) => {
    const r = (e: Element | null) => (e ? e.getBoundingClientRect() : null);
    const facts = s.querySelector<HTMLElement>("[data-qc153='facts']")!;
    const boxes = [...facts.querySelectorAll<HTMLElement>("[data-qc153='fact']")];
    const pol = s.querySelector<HTMLElement>("[data-k='policy'] b");
    return {
      id: s.dataset.id, status: s.dataset.status, w: s.getBoundingClientRect().width,
      seal: r(s.querySelector(".qc153-seal"))?.width, cur: r(s.querySelector(".qc153-nd--cur"))?.width,
      headH: r(s.querySelector("[data-qc153='head']"))?.height,
      keys: boxes.map((b) => b.dataset.k), cols: getComputedStyle(facts).gridTemplateColumns.split(" ").length,
      rows: new Set(boxes.map((b) => Math.round(b.getBoundingClientRect().top))).size,
      nameX: r(s.querySelector(".qc153-who"))?.left, factX: r(boxes[0])?.left,
      pol: pol?.textContent ?? null, polClipped: pol ? pol.scrollWidth > pol.clientWidth + 1 : null,
      mats: s.querySelector("[data-qc1531='materials']") ? [...s.querySelectorAll<HTMLElement>("[data-qc1531='mat']")].map((m) => ({ t: m.textContent, ask: m.hasAttribute("data-asked"), border: getComputedStyle(m).borderTopStyle })) : null,
      pkg: s.querySelector("[data-qc1531='mat-pkg']")?.textContent ?? null,
    };
  }), PAGE);
}

for (const vp of SIZES) {
  test(`v153.1 slips · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`slips-${vp.width}`);
    await openRoute(page, "/queries", vp);
    await ready(page);
    const s = await slipReading(page);
    L.check("S1 population", s.length > 5, `${s.length} slips`);
    L.check("S1 every seal is 40px", s.every((x) => Math.round(x.seal ?? 0) === 40), [...new Set(s.map((x) => x.seal))].join(","));
    L.check("S1 every current step is 34px", s.every((x) => Math.round(x.cur ?? 0) === 34), [...new Set(s.map((x) => x.cur))].join(","));
    L.check("S1 four boxes: Queried, Last heard, Next, Their policy", s.every((x) => x.keys.join() === "queried,heard,next,policy"), [...new Set(s.map((x) => x.keys.join()))].join(" | "));
    L.check("S1 the boxes are one row of four", s.every((x) => x.cols === 4 && x.rows === 1), `${s[0].cols} cols · ${s[0].rows} rows · slip ${Math.round(s[0].w)}px`);
    L.check("S1 the first box lines up under the name", s.every((x) => Math.abs((x.nameX ?? 0) - (x.factX ?? 0)) <= 1), `${s[0].nameX} vs ${s[0].factX}`);
    const pols = s.map((x) => x.pol);
    console.log(`policies seen: ${JSON.stringify([...new Set(pols)])}`);
    L.check("S1 policy words are the four forms", pols.every((p) => p === "Replies to everyone" || p === "No reply means no" || p === "—"), [...new Set(pols)].join(" | "));
    L.check("S1 no policy value is cut off", s.every((x) => !x.polClipped), s.filter((x) => x.polClipped).map((x) => x.id).join(","));
    const withMats = s.filter((x) => x.mats);
    const asked = s.filter((x) => x.mats?.some((m) => m.ask));
    console.log(`strips: ${withMats.length}/${s.length}; with an asked chip: ${asked.length}; with a package: ${s.filter((x) => x.pkg).length}`);
    L.check("S2 some slips carry a materials strip", withMats.length > 0, `${withMats.length}`);
    L.check("S2 an asked chip is dashed, the others are not", asked.length > 0 && asked.every((x) => x.mats!.every((m) => (m.ask ? m.border === "dashed" : m.border !== "dashed"))), JSON.stringify(asked[0]?.mats));
    L.check("S2 the package reads 'Sent with …'", s.filter((x) => x.pkg).every((x) => /^Sent with \S/.test(x.pkg!)), [...new Set(s.map((x) => x.pkg))].slice(0, 4).join(" | "));
    /* screens: a hovered slip, and a slip with a dashed chip */
    const first = page.locator(`${PAGE} [data-qc153="slip"]`).first();
    await first.hover(); await page.waitForTimeout(300);
    const b1 = (await first.boundingBox())!;
    await page.screenshot({ path: `${DIR}/slip-hover-${vp.width}.png`, clip: { x: b1.x - 20, y: b1.y - 20, width: b1.width + 40, height: b1.height + 50 } });
    if (asked.length) {
      const el = page.locator(`${PAGE} [data-qc153="slip"][data-id="${asked[0].id}"]`);
      await el.scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(300);
      const b2 = (await el.boundingBox())!;
      await page.screenshot({ path: `${DIR}/slip-asked-${vp.width}.png`, clip: { x: b2.x - 20, y: b2.y - 20, width: b2.width + 40, height: b2.height + 50 } });
    }
    L.done(11);
  });
}

test("v153.1 the facts wrap 2 × 2 · 1200", async ({ page }) => {
  const L = new Ledger("wrap-1200");
  await openRoute(page, "/queries", { width: 1200, height: 900 });
  await ready(page);
  const s = await slipReading(page);
  L.check("S3 population", s.length > 5, `${s.length}`);
  L.check("S3 two columns, two rows", s.every((x) => x.cols === 2 && x.rows === 2), `${s[0].cols} cols · ${s[0].rows} rows · slip ${Math.round(s[0].w)}px`);
  L.check("S3 no policy value cut off", s.every((x) => !x.polClipped), "");
  const el = page.locator(`${PAGE} [data-qc153="slip"]`).first(); const b = (await el.boundingBox())!;
  await page.screenshot({ path: `${DIR}/slip-1200.png`, clip: { x: b.x - 10, y: b.y - 10, width: b.width + 20, height: b.height + 20 } });
  L.done(3);
});

test("v153.1 where the facts wrap", async ({ page }) => {
  for (const w of [1440, 1366, 1300, 1280, 1240, 1200]) {
    await openRoute(page, "/queries", { width: w, height: 900 });
    await ready(page);
    const s = await slipReading(page);
    const box = await page.evaluate((sel) => document.querySelector<HTMLElement>(`${sel} [data-qc153="fact"]`)!.getBoundingClientRect().width, PAGE);
    console.log(`viewport ${w}: slip ${Math.round(s[0].w)}px · ${s[0].cols} cols · box ${Math.round(box)}px · policy clipped ${s.filter((x) => x.polClipped).length}`);
  }
});
