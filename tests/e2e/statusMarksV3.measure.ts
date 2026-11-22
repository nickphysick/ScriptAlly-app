/**
 * Status marks v3 — the fixture Query Centre grid, before and after the track draws with StatusDot.
 *
 *   SM3_PHASE=before  reads every card's track (each node's box, each link's box, each node's svg box, all relative
 *                     to the card) at three card widths and writes reports/status-marks-v3/nodes-before.json; crops
 *                     one Offer, one Revise & Resubmit and one Queried card at 1512 × 982 (before-*.png).
 *   SM3_PHASE=after   the same readings, compared with the before file (SM3-7's geometry half: every node, link and
 *                     svg within 0.5px), SM3-7's structure (four StatusDot svgs per track, no TrackNode svg, the Offer
 *                     card's fourth step solid, a Full Sent card's fourth step the outline), the after-*.png crops,
 *                     SM3-5's computed half (tone="inherit" under rgb(47, 74, 105); the default ink), and the contact
 *                     sheet (reports/status-marks-v3/sheet.html, made by statusMarksV3Sheet.tsx) beside the reference.
 *
 *   SM3_10=today|fixed  (with SM3_PHASE=after) SM3-10: every card's current step's markup is read. `today` writes it to
 *                     sm3-10-today.json; `fixed` compares every card that is not Revise & Resubmit with that file (byte for
 *                     byte), and on both a Revise & Resubmit card's current step must hold one circle and the four RR_INNER
 *                     paths (read from the reference). The R&R crop is retaken as after-rr.png.
 *
 * Readings to reports/status-marks-v3/. Run through `npm run e2e:emu -- tests/e2e/statusMarksV3.measure.ts`.
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const PHASE = process.env.SM3_PHASE === "after" ? "after" : "before";
const SM3_10 = process.env.SM3_10 === "today" || process.env.SM3_10 === "fixed" ? process.env.SM3_10 : null;
const REF_PATHS = JSON.parse(/<pre id="paths">([\s\S]*?)<\/pre>/.exec(readFileSync("design-refs/status-marks-v3.html", "utf8"))?.[1] ?? "{}") as Record<string, unknown>;
const RR_INNER = REF_PATHS[Object.keys(REF_PATHS).find((k) => k.startsWith("RR_INNER "))!] as string[];
const DIR = "reports/status-marks-v3";
const PAGE = ".qc151.qc153";
const SIZES = [{ width: 1280, height: 900 }, { width: 1512, height: 982 }, { width: 1920, height: 1080 }];
/* the reference's seal and outline, matched on their opening move (the full strings are locked in statusMarksV3.test.tsx) */
const SEAL_SOLID_HEAD = "M12.00 2.40A2.78";
const SEAL_OUTLINE_HEAD = "M12.00 3.20A2.55";

test.setTimeout(600_000);

async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
  await openRoute(page, "/queries", vp);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
  await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}

type R = [number, number, number, number];
interface CardReading { id: string; status: string; nodes: { state: string; box: R; svg: R | null }[]; links: R[] }

const readCards = (page: Page) => page.evaluate((sel) => {
  const rel = (e: Element, o: DOMRect): [number, number, number, number] => { const r = e.getBoundingClientRect(); return [r.x - o.x, r.y - o.y, r.width, r.height].map((n) => Math.round(n * 100) / 100) as [number, number, number, number]; };
  return [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc154="card"]`)].map((c) => {
    const o = c.getBoundingClientRect();
    const trk = c.querySelector('[data-qc153="track"]')!;
    return {
      id: c.dataset.id ?? "", status: c.dataset.status ?? "",
      nodes: [...trk.querySelectorAll<HTMLElement>('.qc153-nd[data-qc153="node"]')].map((n) => { const s = n.querySelector("svg"); return { state: n.dataset.state ?? "", box: rel(n, o), svg: s ? rel(s, o) : null }; }),
      links: [...trk.querySelectorAll('[data-qc153="link"]')].map((l) => rel(l, o)),
    };
  });
}, PAGE);

const crop = async (page: Page, status: string, name: string) => {
  const card = page.locator(`${PAGE} [data-qc154="card"][data-status="${status}"]`).first();
  if (!(await card.count())) { console.log(`✗ no ${status} card to crop`); return false; }
  await card.scrollIntoViewIfNeeded();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(300);
  await card.screenshot({ path: `${DIR}/${PHASE}-${name}.png` });
  return true;
};

test(`status marks v3 — the fixture grid (${PHASE})`, async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  const readings: Record<string, CardReading[]> = {};
  for (const vp of SIZES) {
    await openQc(page, vp);
    readings[`${vp.width}`] = await readCards(page);
    console.log(`· ${vp.width}: ${readings[`${vp.width}`].length} cards`);
    if (vp.width === 1512) {
      for (const [s, n] of [["Offer", "offer"], ["Revise & Resubmit", "rr"], ["Queried", "queried"]] as const) expect(await crop(page, s, n), `a ${s} card`).toBe(true);
    }
  }
  writeFileSync(`${DIR}/nodes-${PHASE}.json`, JSON.stringify(readings, null, 1) + "\n");
  if (PHASE === "before") return;

  /* ── SM3-7 geometry: every node, link and svg within 0.5px of the before reading ─────────────────────── */
  const before = JSON.parse(readFileSync(`${DIR}/nodes-before.json`, "utf8")) as Record<string, CardReading[]>;
  const rows: string[] = [];
  let worst = 0;
  let compared = 0;
  for (const w of Object.keys(before)) {
    const now = new Map(readings[w].map((c) => [c.id, c]));
    expect(readings[w].length, `${w}: the same cards`).toBe(before[w].length);
    for (const b of before[w]) {
      const a = now.get(b.id);
      expect(a, `${w}: card ${b.id} is still drawn`).toBeTruthy();
      if (!a) continue;
      const pairs: [string, R | null, R | null][] = [
        ...b.nodes.map((n, i) => [`node ${i}`, n.box, a.nodes[i]?.box ?? null] as [string, R, R | null]),
        ...b.nodes.map((n, i) => [`svg ${i}`, n.svg, a.nodes[i]?.svg ?? null] as [string, R | null, R | null]),
        ...b.links.map((l, i) => [`link ${i}`, l, a.links[i] ?? null] as [string, R, R | null]),
      ];
      for (const [what, x, y] of pairs) {
        if (!x || !y) { rows.push(`${w} ${b.id} ${what}: missing`); worst = Infinity; continue; }
        const d = Math.max(...x.map((v, i) => Math.abs(v - y[i])));
        compared++;
        if (d > worst) worst = d;
        if (d > 0.5) rows.push(`${w} ${b.id} (${b.status}) ${what}: ${x.join(",")} → ${y.join(",")}`);
      }
    }
  }
  console.log(`${worst <= 0.5 ? "✓" : "✗"} SM3-7 geometry — ${compared} boxes compared, worst Δ ${worst}px`);
  for (const r of rows.slice(0, 20)) console.log(`   ${r}`);

  /* ── SM3-7 structure, on the 1512 grid as it now stands ─────────────────────────────────────────────── */
  await openQc(page, { width: 1512, height: 982 });
  const st = await page.evaluate(({ sel, solid, outline }) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc154="card"]`)].map((c) => {
    const nodes = [...c.querySelectorAll<HTMLElement>('[data-qc153="track"] .qc153-nd[data-qc153="node"]')];
    const sd = nodes.map((n) => n.querySelector(':scope > span[aria-hidden="true"] > svg[viewBox="0 0 24 24"]'));
    const fourth = sd[3]?.innerHTML ?? "";
    return {
      id: c.dataset.id, status: c.dataset.status, nodes: nodes.length, statusDots: sd.filter(Boolean).length,
      trackNodes: c.querySelectorAll('svg[data-qc153="node"]').length,
      fourth: fourth.includes(solid) ? "solid" : fourth.includes(outline) ? "outline" : "other",
    };
  }), { sel: PAGE, solid: SEAL_SOLID_HEAD, outline: SEAL_OUTLINE_HEAD });
  /* ── SM3-10: the current step's markup on every card ───────────────────────────────────────────────────── */
  let sm310: { rrOk: boolean; rr: unknown[]; changed: string[]; compared: number } | null = null;
  if (SM3_10) {
    const cur = await page.evaluate((sel) => Object.fromEntries([...document.querySelectorAll<HTMLElement>(`${sel} [data-qc154="card"]`)].map((c) => {
      const n = c.querySelector<HTMLElement>('[data-qc153="track"] .qc153-nd--cur')!;
      const svg = n.querySelector(":scope > span > svg")!;
      return [c.dataset.id, { status: c.dataset.status, html: n.innerHTML, circles: svg.querySelectorAll("circle").length, paths: [...svg.querySelectorAll("path")].map((p) => p.getAttribute("d")) }];
    })), PAGE) as Record<string, { status: string; html: string; circles: number; paths: string[] }>;
    const rr = Object.values(cur).filter((c) => c.status === "Revise & Resubmit");
    const rrOk = rr.length > 0 && rr.every((c) => c.circles === 1 && JSON.stringify(c.paths) === JSON.stringify(RR_INNER));
    const changed: string[] = [];
    let compared = 0;
    if (SM3_10 === "today") writeFileSync(`${DIR}/sm3-10-today.json`, JSON.stringify(cur, null, 1) + "\n");
    else {
      const was = JSON.parse(readFileSync(`${DIR}/sm3-10-today.json`, "utf8")) as typeof cur;
      for (const [id, c] of Object.entries(was)) {
        if (c.status === "Revise & Resubmit") continue;
        compared++;
        if (cur[id]?.html !== c.html) changed.push(`${id} (${c.status})`);
      }
    }
    sm310 = { rrOk, rr: rr.map((c) => ({ circles: c.circles, paths: c.paths.length })), changed, compared };
    console.log(`${rrOk ? "✓" : "✗"} SM3-10 R&R current step — ${JSON.stringify(sm310.rr)}`);
    if (SM3_10 === "fixed") console.log(`${changed.length ? "✗" : "✓"} SM3-10 every other card's current step unchanged — ${compared} compared, ${changed.length} changed ${changed.join(", ")}`);
    await crop(page, "Revise & Resubmit", "rr");
  }
  const bad = st.filter((c) => c.nodes !== 4 || c.statusDots !== 4 || c.trackNodes !== 0);
  console.log(`${bad.length ? "✗" : "✓"} SM3-7 structure — ${st.length} cards, four StatusDot svgs and no TrackNode svg on each (${bad.length} not)`);
  const offer = st.filter((c) => c.status === "Offer" || c.status === "Signed");
  const fullSent = st.filter((c) => c.status === "Full Sent");
  console.log(`· Offer cards' fourth step: ${offer.map((c) => c.fourth).join(", ")} · Full Sent cards' fourth step: ${fullSent.map((c) => c.fourth).join(", ")}`);
  writeFileSync(`${DIR}/sm3-7.json`, JSON.stringify({ worst, compared, over: rows, structure: st }, null, 1) + "\n");

  /* ── SM3-5 computed half ─────────────────────────────────────────────────────────────────────────────── */
  const sheetPath = `${DIR}/sheet.html`;
  expect(existsSync(sheetPath), "the contact sheet was made (npx tsx tests/e2e/statusMarksV3Sheet.tsx)").toBe(true);
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.setContent(readFileSync(sheetPath, "utf8"));
  const inherit = await page.evaluate(() => {
    /* every stroked shape's stroke and every filled shape's fill (the seal is one filled path with stroke="none") */
    const read = (id: string) => [...document.querySelectorAll(`#${id} svg`)].map((s) => {
      const shapes = [...s.querySelectorAll("circle, path")];
      const strokes = [...new Set(shapes.filter((e) => e.getAttribute("stroke") !== "none").map((e) => getComputedStyle(e).stroke))];
      const fills = [...new Set(shapes.filter((e) => e.getAttribute("fill") === "currentColor").map((e) => getComputedStyle(e).fill))];
      return { strokes, fills };
    });
    return { inherit: read("sm3-inherit"), ink: read("sm3-ink") };
  });
  const navy = "rgb(47, 74, 105)";
  const ink = "rgb(28, 19, 15)";
  const all = (rows: { strokes: string[]; fills: string[] }[], c: string) => rows.length === 12
    && rows.every((r) => r.strokes.length + r.fills.length > 0 && [...r.strokes, ...r.fills].every((v) => v === c));
  const inhOk = all(inherit.inherit, navy);
  const inkOk = all(inherit.ink, ink);
  console.log(`${inhOk ? "✓" : "✗"} SM3-5 inherit — under ${navy}: ${JSON.stringify(inherit.inherit[6])} (Offer) · ${inherit.inherit.length} marks`);
  console.log(`${inkOk ? "✓" : "✗"} SM3-5 default — ${JSON.stringify(inherit.ink[6])} (Offer) · ${inherit.ink.length} marks`);
  await page.locator("#sm3-sheet").screenshot({ path: `${DIR}/contact-sheet.png` });
  await page.setContent(readFileSync("design-refs/status-marks-v3.html", "utf8"));
  await page.locator("table").first().screenshot({ path: `${DIR}/reference-table.png` });

  if (sm310) {
    expect(sm310.rrOk, "SM3-10: the R&R card's current step is the arrows in a ring").toBe(true);
    expect(sm310.changed, "SM3-10: another card's current step changed").toEqual([]);
  }
  expect(worst, "SM3-7: a node, link or svg moved or resized").toBeLessThanOrEqual(0.5);
  expect(bad, "SM3-7: a track not drawn with four StatusDots").toEqual([]);
  expect(offer.length, "an Offer card on the grid").toBeGreaterThan(0);
  expect(offer.every((c) => c.fourth === "solid"), "SM3-7: the Offer card's fourth step is solid").toBe(true);
  expect(fullSent.length, "a Full Sent card on the grid").toBeGreaterThan(0);
  expect(fullSent.every((c) => c.fourth === "outline"), "SM3-7: a Full Sent card's fourth step is the outline").toBe(true);
  expect(inhOk, "SM3-5: inherit takes the parent's colour").toBe(true);
  expect(inkOk, "SM3-5: the default is still the ink").toBe(true);
});
