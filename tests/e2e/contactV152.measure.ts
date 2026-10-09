/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15.2 (design-refs/contact-list-v15-2.html) — the rendered locks, §6 of the pack, at 1512 × 900 and
 * 1280 × 800. Each was proved red on the pre-v15.2 build (92b0b33b) and by its named mutation before its green was
 * believed (reports/contact-list-v15-2/).
 *
 * K1–K4 the desk · K5 the tuck · K6 the ghost Add card · K7 Discover, coming soon · K8 the banner · K9 the copy.
 * K3's three branches are a unit lock too (src/lib/contactDesk.test.ts, src/components/shell/desk/deskCard.test.tsx):
 * on today's data neither count can fall, so the page can never show the down branch.
 *
 * ⚠️ RUN AT ONE WORKER (`--workers=1`): the all-queried cases write a fixture to the shared harness account and remove
 * it in the same run.
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { LOADED_ROW, checkOverflow, near, openContacts, pixel, sameRgb } from "./cl15Lib";

const DIR = "reports/contact-list-v15-2";
const WIDTHS = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  write() {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
  }
  /** A run that writes fewer readings than it claims is red, whatever its cases say. */
  done(floor: number) {
    this.write();
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
/** Screenshots for the report, only when asked (`CL152_SHOTS=1`): a routine run must not dirty tracked images. */
const shot = async (page: Page, name: string, vp: { width: number }) => {
  if (!process.env.CL152_SHOTS) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}-${vp.width}.png`, animations: "disabled" });
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* private mode */ } });
});

const MS = "aqfx-ms";
/** open the page on the all-queried fixture's manuscript */
async function openDone(page: Page, vp: { width: number; height: number }) {
  await openContacts(page, vp);
  await page.evaluate((id) => localStorage.setItem("scriptally_active_manuscript_id", id), MS);
  await page.reload();
  await page.locator(`.aglist ${LOADED_ROW}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  await page.waitForTimeout(1200);
}
const scrollTo = (page: Page, sel: string, off: number) => page.evaluate(([s, o]) => {
  const e = [...document.querySelectorAll<HTMLElement>(s as string)].find((x) => x.getBoundingClientRect().height > 0);
  const sc = e?.closest<HTMLElement>(".wpg-scroll");
  if (e && sc) sc.scrollTop += e.getBoundingClientRect().top - sc.getBoundingClientRect().top - (o as number);
}, [sel, off] as const);

/* ── K1–K4 · the desk ── */
async function readDesk(page: Page) {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const q = <T extends HTMLElement>(s: string) => root?.querySelector<T>(s) ?? null;
    const desk = q('[data-cl15="desk"]'), hd = q('[data-cl15="header"]');
    const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
    const cards = [...(desk?.querySelectorAll<HTMLElement>("[data-dk]") ?? [])].map((c) => {
      const disc = c.querySelector<HTMLElement>('[data-dk-part="disc"]'), line = c.querySelector<HTMLElement>('[data-dk-part="line"]');
      const mom = c.querySelector<HTMLElement>('[data-dk-part="mom"]'), chart = c.querySelector<HTMLElement>("[data-dk-chart]");
      const lineEl = chart?.querySelector<SVGPathElement>("[data-dk-line]") ?? null;
      const arcs = [...(chart?.querySelectorAll<SVGCircleElement>("[data-dk-arc]") ?? [])].map((a) => ({ part: a.getAttribute("data-dk-arc"), share: Number(a.getAttribute("data-dk-share")), dash: a.getAttribute("stroke-dasharray") }));
      const pg = chart?.querySelector<HTMLElement>(".dsk-pg") ?? null, fill = pg?.querySelector<HTMLElement>("i") ?? null;
      return {
        key: c.getAttribute("data-dk"), box: b(c), label: c.getAttribute("aria-label"),
        disc: b(disc), discBg: disc ? getComputedStyle(disc).backgroundColor : null, halo: disc ? getComputedStyle(disc).boxShadow : null,
        line: (line?.textContent ?? "").replace(/\s+/g, " ").trim(), figure: c.querySelector('[data-dk-part="figure"]')?.textContent ?? null,
        lineOver: line ? line.scrollWidth - line.clientWidth : null, lineH: line ? line.getBoundingClientRect().height : null,
        lineSize: line ? getComputedStyle(line).fontSize : null, lineFace: line ? getComputedStyle(line).fontFamily : null,
        mom: mom ? { dir: mom.getAttribute("data-dir"), text: (mom.textContent ?? "").trim(), colour: getComputedStyle(mom).color, arrow: mom.querySelector("svg path")?.getAttribute("d") ?? null } : null,
        chart: chart?.getAttribute("data-dk-chart") ?? null, chartHidden: chart?.getAttribute("aria-hidden") ?? null,
        caption: chart?.querySelector("small")?.textContent ?? null,
        linePaths: chart?.querySelectorAll("[data-dk-line]").length ?? 0, lineValues: lineEl?.getAttribute("data-dk-line") ?? null, lineD: lineEl?.getAttribute("d") ?? null,
        arcs, pgW: pg ? pg.getBoundingClientRect().width : null, fillW: fill ? fill.getBoundingClientRect().width : null,
        pressable: !!c.querySelector("[data-dk-press]"),
      };
    });
    const hb = b(hd);
    return {
      found: !!desk, cards, ruleBottom: hb ? hb.b : null,
      stamps: desk ? desk.querySelectorAll('[class*="stamp"]').length : -1, text: (desk?.textContent ?? "").replace(/\s+/g, " "),
      headerCount: Number((q("h1")?.textContent ?? "").match(/^(\d+)/)?.[1] ?? NaN),
      page: (() => { for (let e: HTMLElement | null = desk; e; e = e.parentElement) { const bg = getComputedStyle(e).backgroundColor; if (bg !== "rgba(0, 0, 0, 0)") return bg; } return null; })(),
    };
  });
}

test("CL15.2-K1–K4 · desk", async ({ page }) => {
  const L = new Ledger("cl152-desk");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`, narrow = vp.width < 1440;
    const r = await readDesk(page);
    if (!r.found || r.cards.length !== 3 || r.cards.some((c) => !c.box || !c.disc)) { L.check("CL15.2 population: the desk renders three cards, each with a disc", w, false, JSON.stringify({ found: r.found, cards: r.cards.length, discs: r.cards.filter((c) => c.disc).length })); continue; }
    L.check("CL15.2 population: the desk renders three cards, each with a disc", w, true, "");
    const by = Object.fromEntries(r.cards.map((c) => [c.key, c]));
    const N = r.headerCount;

    /* K1 — shape */
    L.check(`K1 each disc's top is ${narrow ? 24 : 28} (±2) above its card's top`, w, r.cards.every((c) => near(c.box!.t - c.disc!.t, narrow ? 24 : 28, 2)), r.cards.map((c) => (c.box!.t - c.disc!.t).toFixed(1)).join(" "));
    L.check("K1 each disc is ink, rgb(42, 58, 82), with a halo in the page's colour", w, r.cards.every((c) => c.discBg === "rgb(42, 58, 82)" && !!r.page && (c.halo ?? "").startsWith(`${r.page} 0px 0px 0px 5px`)), r.cards.map((c) => `${c.discBg} | ${(c.halo ?? "").slice(0, 40)}`).join(" · ") + ` page ${r.page}`);
    L.check(`K1 a disc's top is ${narrow ? 36 : 44} (±2) under the header's hairline`, w, r.ruleBottom !== null && r.cards.every((c) => near(c.disc!.t - r.ruleBottom!, narrow ? 36 : 44, 2)), r.cards.map((c) => (c.disc!.t - (r.ruleBottom ?? 0)).toFixed(1)).join(" "));
    L.check("K1 nothing in the desk is a stamp, and nothing says “this month”", w, r.stamps === 0 && !/this month/i.test(r.text), `stamps ${r.stamps} · ${r.text.slice(0, 80)}`);
    L.check(`K1 every card is ${narrow ? 146 : 170}px tall or less, and the three are one height`, w, r.cards.every((c) => c.box!.h <= (narrow ? 146 : 170)) && near(r.cards[0].box!.h, r.cards[2].box!.h, 0.5), r.cards.map((c) => c.box!.h.toFixed(1)).join(" "));

    /* K2 — lines */
    L.check("K2 the lines: “N agents on file”, “q of N queried”, “p% profiles complete”", w,
      /^\d+ agents? on file$/.test(by.file?.line ?? "") && new RegExp(`^\\d+ of ${N} queried$`).test(by.queried?.line ?? "") && /^\d+% profiles complete$/.test(by.profiles?.line ?? ""), r.cards.map((c) => c.line).join(" | "));
    L.check("K2 On file's figure is the header's count", w, Number(by.file?.figure) === N, `${by.file?.figure} vs ${N}`);
    L.check(`K2 each line is Special Elite ${narrow ? 17 : 21}, on one line, with nothing cut`, w,
      r.cards.every((c) => c.lineSize === (narrow ? "17px" : "21px") && /Special Elite/.test(c.lineFace ?? "") && (c.lineOver ?? 9) <= 1 && (c.lineH ?? 99) < (narrow ? 40 : 48)), r.cards.map((c) => `${c.lineSize} over ${c.lineOver} h ${c.lineH?.toFixed(1)}`).join(" · "));

    /* K3 — month on month, as the page's data has it (the down branch is the unit lock's) */
    const moms = [by.file?.mom, by.queried?.mom].filter(Boolean) as NonNullable<typeof by.file.mom>[];
    L.check("K3 population: On file and Queried each carry a month-on-month line; Profiles carries none (no snapshot exists)", w, moms.length === 2 && by.profiles?.mom === null, `file ${!!by.file?.mom} queried ${!!by.queried?.mom} profiles ${JSON.stringify(by.profiles?.mom)}`);
    const okMom = (m: (typeof moms)[number]) => m.dir === "up" ? m.colour === "rgb(79, 122, 75)" && /^\d+ since last month$/.test(m.text) && m.arrow === "M6 2.2 10 7.4H2z"
      : m.dir === "down" ? m.colour === "rgb(160, 99, 63)" && /^\d+ since last month$/.test(m.text) && m.arrow === "M6 9.8 2 4.6h8z"
      : m.dir === "none" && m.text === "No change since last month" && m.arrow === null && m.colour === "rgba(28, 19, 15, 0.45)";
    L.check("K3 up is ▲ in rgb(79, 122, 75), down ▼ in rust, none “No change since last month” in ink 45%", w, moms.every(okMom), JSON.stringify(moms));
    L.check("K3 (tally) the directions this account shows", w, true, moms.map((m) => m.dir).join(","));

    /* K4 — charts */
    const pts = (by.file?.lineD ?? "").match(/[ML]/g)?.length ?? 0, vals = (by.file?.lineValues ?? "").split(",").map(Number);
    L.check("K4 On file is ONE line path of 6 points whose last value is N", w, by.file?.chart === "line" && by.file.linePaths === 1 && pts === 6 && vals.length === 6 && vals[5] === N, `paths ${by.file?.linePaths} pts ${pts} values ${by.file?.lineValues} N ${N}`);
    const queried = Number(by.queried?.figure), arcSum = (by.queried?.arcs ?? []).reduce((a, x) => a + x.share, 0);
    L.check("K4 Queried is a ring whose arcs (active · closed) sum to queried / N (±0.5%)", w, by.queried?.chart === "ring" && N > 0 && Math.abs(arcSum - (queried / N) * 100) <= 0.5 && (queried === 0 || (by.queried?.arcs.length ?? 0) >= 1), `arcs ${JSON.stringify(by.queried?.arcs)} vs ${queried}/${N}`);
    const m = /^(\d+) of (\d+) agents? queried: (\d+) active, (\d+) closed$/.exec(by.queried?.label ?? "");
    const act = by.queried?.arcs.find((a) => a.part === "active")?.share ?? 0;
    L.check("K4 the ring's active arc is the label's active count, and active + closed = queried", w, !!m && Number(m[1]) === queried && Number(m[3]) + Number(m[4]) === queried && Math.abs(act - (Number(m[3]) / N) * 100) <= 0.5, `${by.queried?.label} · active arc ${act}`);
    const pct = Number((by.profiles?.figure ?? "").replace("%", "")), barPct = by.profiles?.pgW ? ((by.profiles.fillW ?? 0) / by.profiles.pgW) * 100 : NaN;
    L.check("K4 Profiles is a bar whose fill is the percentage (±1%)", w, by.profiles?.chart === "bar" && Math.abs(barPct - pct) <= 1, `fill ${barPct.toFixed(1)}% vs ${pct}%`);
    L.check("K4 every chart is aria-hidden and every card carries its accessible label", w, r.cards.every((c) => c.chartHidden === "true" && (c.label ?? "").length > 8) && /on file$/.test(by.file?.label ?? "") && /profiles complete: \d+ of \d+$/.test(by.profiles?.label ?? ""), r.cards.map((c) => `${c.chartHidden} “${c.label}”`).join(" · "));
    L.check("K4 the captions: “{month} → now”, “active · closed”, “{filled} of {N}”", w, /^[A-Z][a-z]{2,3} → now$/.test(by.file?.caption ?? "") && by.queried?.caption === "active · closed" && new RegExp(`^\\d+ of ${N}$`).test(by.profiles?.caption ?? ""), r.cards.map((c) => c.caption).join(" | "));
    L.check("K4 On file is not pressable; Queried and Profiles are", w, !by.file?.pressable && !!by.queried?.pressable && !!by.profiles?.pressable, r.cards.map((c) => `${c.key}:${c.pressable}`).join(" "));
    await checkOverflow(page, L, w);
    await shot(page, "header-desk", vp);
  }
  L.done(34);
});

/* ── the next-step section's boxes ── */
async function readStage(page: Page) {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const q = <T extends HTMLElement>(s: string) => root?.querySelector<T>(s) ?? null;
    const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
    const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
    const tx = (e: Element | null) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
    const fs = q(".fs"), panel = q('[data-fs-part="panel"]'), card = (q('[data-fs-part="card"]')?.firstElementChild ?? null) as HTMLElement | null;
    const add = q('[data-cl14="addcard"]'), ghost = q('[data-cl15="ghost"]'), head = q('[data-cl15="discover-head"]'), chip = q('[data-cl15="discover-chip"]');
    const bird = q<HTMLImageElement>('[data-cl15="discover-bird"]');
    const addKids = add ? [...add.children].map((c) => c.getAttribute("data-cl15") ?? c.className) : [];
    return {
      state: fs?.getAttribute("data-state") ?? null, card: b(card), panel: b(panel), panelOverflow: cs(panel)?.overflowX ?? null,
      sentence: tx(q('[data-fs-part="sentence"]')), deskQueried: Number(tx(q('[data-dk="queried"] [data-dk-part="figure"]'))),
      ghost: ghost ? { hidden: ghost.getAttribute("aria-hidden"), box: b(ghost), text: tx(ghost), kids: addKids, title: b(add?.querySelector("b") ?? null), focusable: ghost.querySelectorAll("button, a, input, [tabindex]").length } : null,
      plus: root?.querySelectorAll(".cl14-addc-plus").length ?? -1,
      head: b(head), headBg: cs(head)?.backgroundColor ?? null, headTitle: tx(head?.querySelector("h3") ?? null), headTitleSize: cs(head?.querySelector("h3") ?? null)?.fontSize ?? null,
      chip: b(chip), chipText: tx(chip), chipDisplay: cs(chip)?.display ?? null, chipBg: cs(chip)?.backgroundColor ?? null,
      lede: tx(q('[data-cl15="discover-lede"]')),
      features: [...(root?.querySelectorAll('[data-cl15="discover-features"] li') ?? [])].map((li) => ({ t: tx(li.querySelector("b")), s: tx(li.querySelector("small")), iconBg: cs(li.querySelector(".cl15-dt-i"))?.backgroundColor ?? null, iconInk: cs(li.querySelector(".cl15-dt-i"))?.color ?? null })),
      rows: root?.querySelectorAll(".cl15-dt-l li").length ?? -1,
      bird: b(bird), birdNatural: bird?.naturalWidth ?? 0, birdAlt: bird?.getAttribute("alt") ?? null,
      notify: tx(q('[data-cl15="discover-notify"]')),
    };
  });
}

/* ── K5 (ready half) · the tuck in the ready state keeps v15's 150 / 130 ── */
test("CL15.2-K5 · tuck, ready", async ({ page }) => {
  const L = new Ledger("cl152-tuck-ready");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`, narrow = vp.width < 1440;
    const r = await readStage(page);
    if (r.state !== "ready" || !r.card || !r.panel) { L.check("CL15.2 population: the ready state on the stage", w, false, `${r.state}`); continue; }
    L.check("CL15.2 population: the ready state on the stage", w, true, "");
    L.check(`K5 ready: the card overlaps the panel by ${narrow ? 130 : 150} (±4)`, w, near(r.card.r - r.panel.l, narrow ? 130 : 150, 4), `${(r.card.r - r.panel.l).toFixed(1)}`);
    await scrollTo(page, '.aglist [data-cl14="next"]', 40);
    await page.waitForTimeout(300);
    await shot(page, "ready-state", vp);
  }
  L.done(4);
});

/* ── K2 (queried), K5, K6, K7 · the all-queried state, on its own manuscript (seeded and removed in this run) ── */
test("CL15.2-K5–K7 · all queried", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("cl152-done");
  execSync("node tests/e2e/seedAllQueried.mjs A", { stdio: "inherit" });
  try {
    for (const vp of WIDTHS) {
      await openDone(page, vp);
      const w = `${vp.width}`, narrow = vp.width < 1440;
      const r = await readStage(page);
      if (r.state !== "done" || !r.card || !r.panel || !r.ghost || !r.head || !r.bird) { L.check("CL15.2 population: the all-queried state, with the Add card's ghost, the Discover header and the bird", w, false, JSON.stringify({ state: r.state, ghost: !!r.ghost, head: !!r.head, bird: !!r.bird })); continue; }
      L.check("CL15.2 population: the all-queried state, with the Add card's ghost, the Discover header and the bird", w, true, "");
      /* K2 — the desk's Queried figure is the section's */
      const sq = /has gone to all (\d+) agents|has gone to the 1 agent|has gone to (\d+) of your/.exec(r.sentence);
      const said = sq ? Number(sq[1] ?? sq[2] ?? 1) : NaN;
      L.check("K2 the desk's Queried figure equals the next-step section's queried count", w, r.deskQueried === said, `desk ${r.deskQueried} · “${r.sentence}”`);
      /* K5 */
      L.check(`K5 all queried: the card overlaps the panel by ${narrow ? 36 : 44} (±2)`, w, near(r.card.r - r.panel.l, narrow ? 36 : 44, 2), `${(r.card.r - r.panel.l).toFixed(1)}`);
      /* K6 */
      L.check("K6 the Add card has a ghost block, aria-hidden, with no words and nothing focusable, above the title", w,
        r.ghost.hidden === "true" && r.ghost.text === "" && r.ghost.focusable === 0 && !!r.ghost.box && !!r.ghost.title && r.ghost.box.b <= r.ghost.title.t + 1 && r.ghost.box.h > 100, JSON.stringify({ ...r.ghost, kids: undefined }));
      L.check("K6 the “+” circle is gone", w, r.plus === 0, `${r.plus}`);
      /* K7 */
      L.check("K7 the Discover header is plum, rgb(90, 61, 85), and spans the panel's width (±1) along its top edge", w,
        r.headBg === "rgb(90, 61, 85)" && near(r.head.l, r.panel.l, 1) && near(r.head.r, r.panel.r, 1) && near(r.head.t, r.panel.t, 1), `${r.headBg} head ${r.head.l.toFixed(1)}–${r.head.r.toFixed(1)} @${r.head.t.toFixed(1)} panel ${r.panel.l.toFixed(1)}–${r.panel.r.toFixed(1)} @${r.panel.t.toFixed(1)}`);
      L.check(`K7 the title reads “Discover agents” at ${narrow ? 18 : 21}px`, w, r.headTitle === "Discover agents" && r.headTitleSize === (narrow ? "18px" : "21px"), `${r.headTitle} ${r.headTitleSize}`);
      L.check("K7 “Coming soon” is VISIBLE: a non-zero box, inside the header", w, !!r.chip && r.chip.w > 20 && r.chip.h > 8 && r.chipText === "Coming soon" && r.chipDisplay !== "none" && r.chip.r <= r.head.r && r.chip.t >= r.head.t, `${JSON.stringify(r.chip)} ${r.chipDisplay} “${r.chipText}”`);
      L.check("K7 the lede, exactly", w, r.lede === "Find new agents and add them to your list in one click.", r.lede);
      L.check("K7 three feature rows with the exact copy, on pale plum circles with plum icons", w,
        JSON.stringify(r.features.map((f) => [f.t, f.s])) === JSON.stringify([["By genre", "Only agents who take what you write."], ["Open now", "See who’s accepting submissions today."], ["Their wishlist", "What they want, and what to send."]])
        && r.features.every((f) => f.iconBg === "rgb(238, 227, 236)" && f.iconInk === "rgb(90, 61, 85)"), JSON.stringify(r.features));
      L.check("K7 the placeholder rows are gone, and the request button is there", w, r.rows === 0 && r.notify === "Tell me when it’s ready", `rows ${r.rows} · ${r.notify}`);
      L.check(`K7 the bird is loaded and ${narrow ? 196 : 250} (±2) tall`, w, r.birdNatural > 0 && near(r.bird.h, narrow ? 196 : 250, 2) && r.birdAlt === "", `${r.bird.h.toFixed(1)} natural ${r.birdNatural} alt “${r.birdAlt}”`);
      L.check("K7 the bird runs past the panel's bottom-right corner, and the panel clips it", w, r.bird.b > r.panel.b + 2 && r.bird.r >= r.panel.r - 1 && (r.panelOverflow === "hidden" || r.panelOverflow === "clip"), `bird b ${r.bird.b.toFixed(1)} r ${r.bird.r.toFixed(1)} panel b ${r.panel.b.toFixed(1)} r ${r.panel.r.toFixed(1)} overflow ${r.panelOverflow}`);
      await checkOverflow(page, L, w);
      await scrollTo(page, '.aglist [data-cl14="next"]', 40);
      await page.waitForTimeout(300);
      await shot(page, "all-queried-discover", vp);
    }
    /* K6 — the button still opens Add an agent (1512) */
    await openDone(page, WIDTHS[0]);
    await page.locator('.aglist [data-cl14="addcard-go"]').filter({ visible: true }).first().evaluate((e: HTMLElement) => { e.scrollIntoView({ block: "center" }); });
    await page.locator('.aglist [data-cl14="addcard-go"]').filter({ visible: true }).first().click({ timeout: 5000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-ac="overlay"]').length > 0, undefined, { timeout: 5000 }).catch(() => {});
    const opened = await page.evaluate(() => ({ overlay: document.querySelectorAll('[data-ac="overlay"]').length, text: (document.querySelector('[data-ac="overlay"]')?.textContent ?? "").replace(/\s+/g, " ").slice(0, 80) }));
    L.check("K6 the card's button still opens Add an agent", "1512", opened.overlay > 0, JSON.stringify(opened));
    await page.keyboard.press("Escape");
    await page.evaluate(() => localStorage.removeItem("scriptally_active_manuscript_id"));
  } finally {
    execSync("node tests/e2e/seedAllQueried.mjs --clean", { stdio: "inherit" });
  }
  L.done(27);
});

/* ── K8 · the banner above the list ── */
const BLUSH = [243, 221, 210], PAGE = [243, 242, 240];
test("CL15.2-K8 · banner", async ({ page }) => {
  const L = new Ledger("cl152-banner");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`, narrow = vp.width < 1440;
    await scrollTo(page, '.aglist [data-cl15="banner"]', 200);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const q = <T extends HTMLElement>(s: string) => root?.querySelector<T>(s) ?? null;
      const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
      const ban = q('[data-cl15="banner"]'), p = ban?.querySelector("p") ?? null, band = q('[data-cl14="next"]'), bar = q('[data-cl14="bar"]');
      const sc = ban?.closest<HTMLElement>(".wpg-scroll") ?? null, sr = sc?.getBoundingClientRect() ?? null;
      const before = ban ? getComputedStyle(ban, "::before") : null, after = ban ? getComputedStyle(ban, "::after") : null;
      const pcs = p ? getComputedStyle(p) : null;
      return {
        ban: b(ban), band: b(band), bar: b(bar), label: ban?.getAttribute("aria-label") ?? null, tag: ban?.tagName ?? null,
        text: (p?.textContent ?? "").trim(), size: pcs?.fontSize ?? null, face: pcs?.fontFamily ?? null, ink: pcs?.color ?? null,
        tint: before?.backgroundColor ?? null,
        arrow: after ? { w: parseFloat(after.width), h: parseFloat(after.height), top: parseFloat(after.top), left: parseFloat(after.left), tf: after.transform, img: after.backgroundImage.slice(0, 60) } : null,
        sheet: sc && sr ? { l: sr.left + sc.clientLeft, r: sr.left + sc.clientLeft + sc.clientWidth, t: sr.top, b: sr.bottom } : null,
      };
    });
    if (!r.ban || !r.band || !r.bar || !r.sheet || !r.arrow) { L.check("CL15.2 population: the banner, the next-step band and the list's bar render", w, false, JSON.stringify({ ban: !!r.ban, band: !!r.band, bar: !!r.bar })); continue; }
    L.check("CL15.2 population: the banner, the next-step band and the list's bar render", w, true, "");
    L.check("K8 it is a section labelled “A note”, and its text is exact", w, r.tag === "SECTION" && r.label === "A note" && r.text === "Your agent will be the one who champions your words.", `${r.tag} “${r.label}” “${r.text}”`);
    L.check(`K8 the text is Special Elite ${narrow ? 29 : 38} in rgb(91, 42, 31)`, w, r.size === (narrow ? "29px" : "38px") && /Special Elite/.test(r.face ?? "") && r.ink === "rgb(91, 42, 31)", `${r.size} ${r.face?.slice(0, 20)} ${r.ink}`);
    L.check(`K8 the band is blush, rgb(243, 221, 210), at least ${narrow ? 112 : 136} tall`, w, r.tint === "rgb(243, 221, 210)" && r.ban.h >= (narrow ? 112 : 136) - 0.5, `${r.tint} h ${r.ban.h.toFixed(1)}`);
    /* painted edges: pixels, because a spread shadow has no box. The sheet shades its own last 10px, so an edge pixel is
       compared with the blush UNDER THE SAME SHADE, taken from the page ground at the same x in the gap above. */
    const y = r.ban.t + 20, yp = r.ban.t - 20;
    L.check("K8 precondition: the sampled lines are on screen — one inside the banner, one in the gap above it", w, y > r.sheet.t && y < r.sheet.b && y < r.ban.b && yp > r.sheet.t && yp > r.band.b, `y ${y.toFixed(0)} yp ${yp.toFixed(0)} sheet ${r.sheet.t}–${r.sheet.b} band b ${r.band.b.toFixed(0)}`);
    const shaded = async (x: number) => { const page0 = await pixel(page, x, yp); return { got: await pixel(page, x, y), want: BLUSH.map((v, i) => v + (page0[i] - PAGE[i])), page0 }; };
    const pl = await shaded(r.sheet.l + 1), pr = await shaded(r.sheet.r - 2);
    L.check("K8 the blush is painted to the sheet's left and right content edges (±1)", w, sameRgb(pl.got, pl.want, 2) && sameRgb(pr.got, pr.want, 2), `left ${pl.got} (want ${pl.want}) right ${pr.got} (want ${pr.want})`);
    L.check(`K8 the gap above it is ${narrow ? 48 : 56} (±2) of PAGE colour, not band and not blush`, w, near(r.ban.t - r.band.b, narrow ? 48 : 56, 2) && sameRgb(await pixel(page, (r.ban.l + r.ban.r) / 2, yp), PAGE, 2), `${(r.ban.t - r.band.b).toFixed(1)}`);
    /* the arrow: centred on the band, flush with its bottom edge (1px inside), 34 (28) tall */
    const tx = /matrix\(1, 0, 0, 1, (-?[\d.]+), 0\)/.exec(r.arrow.tf);
    const arrowL = r.ban.l + r.arrow.left + (tx ? Number(tx[1]) : 0), arrowC = arrowL + r.arrow.w / 2;
    L.check(`K8 the arrow is centred on the band (±1), ${narrow ? 28 : 34} (±1) tall and ${narrow ? 120 : 150} wide`, w, near(arrowC, (r.ban.l + r.ban.r) / 2, 1) && near(r.arrow.h, narrow ? 28 : 34, 1) && near(r.arrow.w, narrow ? 120 : 150, 1) && /^url\("data:image\/svg/.test(r.arrow.img), `centre ${arrowC.toFixed(1)} vs ${((r.ban.l + r.ban.r) / 2).toFixed(1)} · ${r.arrow.w}×${r.arrow.h}`);
    L.check("K8 the arrow starts flush with the band's bottom edge (1px inside it), and its tip is painted blush below the band", w,
      near(r.arrow.top, r.ban.h - 1, 0.6) && sameRgb(await pixel(page, (r.ban.l + r.ban.r) / 2, r.ban.b + (narrow ? 14 : 18)), BLUSH, 3), `top ${r.arrow.top} vs ${r.ban.h - 1}`);
    L.check(`K8 the banner's bottom to the list's bar is ${narrow ? 64 : 76} (±2)`, w, near(r.bar.t - r.ban.b, narrow ? 64 : 76, 2), `${(r.bar.t - r.ban.b).toFixed(1)}`);
    await checkOverflow(page, L, w);
    await shot(page, "banner", vp);
  }
  L.done(22);
});

/* ── K9 · the copy, and View all agents ── */
test("CL15.2-K9 · copy", async ({ page }) => {
  const L = new Ledger("cl152-copy");
  for (const vp of WIDTHS) {
    /* the scroll is measured with motion as the page has it; the wait below lets a smooth scroll finish */
    await openContacts(page, vp, { motion: true });
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const hd = root?.querySelector('[data-cl15="header"]') ?? null;
      return {
        buttons: [...(hd?.querySelectorAll("button") ?? [])].filter((b) => b.getBoundingClientRect().height > 0).map((b) => (b.textContent ?? "").trim()),
        title: (root?.querySelector('[data-cl14="bar"] h2')?.textContent ?? "").trim(), wsLabel: root?.querySelector('[data-cl14="ws"]')?.getAttribute("aria-label") ?? null,
      };
    });
    L.check("K9 the header's buttons are “+ Add an agent” and “View all agents”; none reads “Discover agents”", w, JSON.stringify(r.buttons) === JSON.stringify(["+ Add an agent", "View all agents"]), JSON.stringify(r.buttons));
    L.check("K9 the list's workspace header reads “Agents on file”", w, r.title === "Agents on file" && r.wsLabel === "Agents on file", `${r.title} · ${r.wsLabel}`);
    await page.locator('.aglist [data-cl15="view-all"]').filter({ visible: true }).first().click({ timeout: 5000 });
    /* poll until two reads agree (a smooth scroll reports where it is, not where it will stop) */
    let last = -1, settled = { gap: NaN, focus: false, scrollTop: 0, url: "" };
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(150);
      settled = await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
        const bar = root.querySelector<HTMLElement>('[data-cl14="bar"]')!, sc = bar.closest<HTMLElement>(".wpg-scroll")!;
        const input = root.querySelector<HTMLInputElement>('[data-cl13-find="banner"] input');
        return { gap: bar.getBoundingClientRect().top - sc.getBoundingClientRect().top, focus: !!input && document.activeElement === input, scrollTop: sc.scrollTop, url: location.pathname };
      });
      if (settled.scrollTop === last) break;
      last = settled.scrollTop;
    }
    L.check("K9 precondition: the page really scrolled", w, settled.scrollTop > 200, `${settled.scrollTop}`);
    L.check("K9 View all agents stops with the list's bar 24 (±4) under the scroller's top, on the same route", w, near(settled.gap, 24, 4) && settled.url === "/agents", `${settled.gap.toFixed(1)} · ${settled.url}`);
    L.check("K9 and the caret is in the list's Find field", w, settled.focus, `${settled.focus}`);
    await checkOverflow(page, L, w);
  }
  L.done(12);
});
