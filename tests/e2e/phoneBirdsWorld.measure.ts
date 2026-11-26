/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v2, phase 4 — THE LOCKS, measured on the rendered page (design-refs/phone-birds-eye-world-v2).
 * 390 × 784 at 2× (the ref's screen); 740 × 360 for landscape (844 × 390 is the desktop here).
 *
 *   BW-1 fitted is bars only · BW-2 every pill keeps All's scale · BW-3 a short pill opens zoomed in, fitting ·
 *   BW-4 stages on their dates at 48px · BW-5 no name under a figure or an "!" · BW-6 day numbers clear of each other
 *   and the pills · BW-7 the current stage runs on with no gap; earlier stages faded · BW-8 gone quiet at the setting ·
 *   BW-9 the pills add up · BW-10 seventy queries · BW-11 empty states · BW-12 replay · BW-13 copy ·
 *   kept from v1: BW-14 layers · BW-15 the line off screen · BW-16 anchoring · BW-17 reduced motion · BW-18 landscape
 *
 * RED FIRST: `BW_MUTATE=all` runs the green pass, then each lock under its own mutation — the smallest change on the
 * rendered page that undoes the lock's fix — and each must turn its own lock red. Ledgers and proofs go to
 * reports/phone-birds-eye-world-v2/ledger/. `BW_SHOTS=1` writes the build's shots for the ref's 01–14 beside the ref's.
 * ⚠️ BW-8 AND THE EMPTY STATES WRITE TO THE EMULATOR (REST, owner): BW-8 sets the quiet setting and puts it back in the
 *    same test; the empty states change and finally delete the harness's queries, so they run LAST, in their own test —
 *    every e2e:emu run imports a fresh snapshot and exports nothing.
 *
 * Run (through the slot): npm run e2e:emu -- tests/e2e/phoneBirdsWorld.measure.ts --project pixel
 */
import { expect, test, type Page, type CDPSession } from "@playwright/test";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { statusBand } from "../../src/lib/stageColours";

const DIR = "reports/phone-birds-eye-world-v2";
const PHONE = { width: 390, height: 784 } as const;
const LAND = { width: 740, height: 360 } as const;
const WORLD = "/queries/all?view=birds";
const EMU = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
const HARNESS = JSON.parse(readFileSync("tests/emulator-seed/harness.json", "utf8")) as { docs: Record<string, Record<string, unknown>> };
const UID = Object.keys(HARNESS.docs).find((k) => /^users\/[^/]+$/.test(k))!.split("/")[1];
const H_QUERIES = Object.entries(HARNESS.docs).filter(([k]) => /^users\/[^/]+\/queries\/[^/]+$/.test(k)).map(([k, v]) => ({ id: k.split("/").pop()!, status: String(v.status) }));

const MUTS = ["fitted", "scale", "short", "dates", "names", "days", "cont", "quiet", "counts", "seventy", "copy", "layers", "offline", "anchor", "calm", "land", "replay", "empty"] as const;
type Mut = (typeof MUTS)[number] | "";
const MUT_LOCK: Record<Exclude<Mut, "">, string> = {
  fitted: "BW-1", scale: "BW-2", short: "BW-3", dates: "BW-4", names: "BW-5", days: "BW-6", cont: "BW-7", quiet: "BW-8", counts: "BW-9", seventy: "BW-10",
  empty: "BW-11", replay: "BW-12", copy: "BW-13", layers: "BW-14", offline: "BW-15", anchor: "BW-16", calm: "BW-17", land: "BW-18",
};
/* each mutation: CSS that undoes the fix, or a script at the moment named in the test */
const CSS_MUT: Partial<Record<Exclude<Mut, "">, string>> = {
  /* BW-3 (a script, in the test): the pill's opening undone — zoomed one step in as soon as it opens */
  /* BW-4: each stage drawn 6px off its date */
  dates: '.bw-bar[data-k="stage"] { margin-left: 6px !important; }',
  /* BW-5: the names pushed 60px on, past where they were stopped short of the figure */
  names: ".bw-inm { margin-left: 60px !important; max-width: none !important; }",
  /* BW-6: the day numbers spread into each other */
  days: '.bw-rm[data-day="1"] { letter-spacing: 9px !important; }',
  /* BW-7: a gap opened between the current stage and its tail */
  cont: '.bw-bar[data-k="stage"][data-cont="1"] { margin-left: -4px !important; }',
  /* BW-8: the fade drawn 30px off where the setting puts it */
  quiet: '.bw-bar[data-k="quiet"] { margin-left: 30px !important; }',
  /* BW-10: the world 30% narrower than the screen */
  seventy: ".bw-vp { right: 120px !important; }",
  /* BW-11: the card never shows */
  empty: ".bw-card { display: none !important; }",
  /* BW-14: the hawk under the headings */
  layers: ".bw-hsw { z-index: 3 !important; }",
  /* BW-15: the edge-pinned pill not outlined */
  offline: ".bw .bw-flab.off { background: var(--pa-navy) !important; color: #fff !important; border: 0 !important; }",
  /* BW-17: the drift kept under reduced motion */
  calm: ".bw-hsw { animation: bw-hsdrift 14s ease-in-out infinite alternate !important; }",
  /* BW-18: landscape keeps the dock */
  land: "body.pa41-land .pa4-tb { display: flex !important; }",
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public mut: Mut, public part: string) {}
  check(lock: string, where: string, ok: boolean, detail = "") { this.rows.push({ lock, where, ok: !!ok, detail: String(detail).slice(0, 600) }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    const name = `${this.part}${this.mut ? `.mut-${this.mut}` : ""}`;
    writeFileSync(`${DIR}/ledger/${name}.json`, JSON.stringify(this.rows, null, 1));
    const red = this.rows.filter((r) => !r.ok);
    for (const r of red.slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail.slice(0, 300)}`);
    console.log(`  ${this.part}${this.mut ? ` [mut ${this.mut}]` : " [green]"}: ${this.rows.length} readings, ${red.length} red`);
    if (this.mut) {
      const lock = MUT_LOCK[this.mut as Exclude<Mut, "">], own = red.filter((r) => r.lock === lock).length;
      console.log(`  MUTATION ${this.mut} → ${lock}: ${own} red (${red.length - own} elsewhere)`);
      writeFileSync(`${DIR}/ledger/mut-${this.mut}.summary.json`, JSON.stringify({ mut: this.mut, lock, own, other: red.length - own, readings: this.rows.length }, null, 1));
      expect(own, `mutation ${this.mut} must turn ${lock} red`).toBeGreaterThan(0);
      return;
    }
    expect(this.rows.length, "fewer readings than the locks need").toBeGreaterThanOrEqual(floor);
    expect(red.map((r) => `${r.lock} · ${r.where} — ${r.detail.slice(0, 300)}`)).toEqual([]);
  }
}

/* ── reading the world ── */
interface Root { n: number; z: number; fz: number; rp: number; off: number; ox: number; oy: number; sx: number; d0: number; d1: number; ppd: number; top: number; lx: number; maxz: number; zoomed: boolean; replay: string; filter: string; card: string; demo: boolean }
const root = (page: Page): Promise<Root> => page.evaluate(() => {
  const r = document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset;
  return { n: +r.n!, z: +r.z!, fz: +r.fz!, rp: +r.rp!, off: +r.off!, ox: +r.ox!, oy: +r.oy!, sx: +r.sx!, d0: +r.d0!, d1: +r.d1!, ppd: +r.ppd!, top: +r.top!, lx: +r.lx!, maxz: +r.maxz!, zoomed: r.zoomed === "1", replay: r.replay!, filter: r.filter!, card: r.card ?? "", demo: r.demo === "1" };
});
type Box = { l: number; r: number; t: number; b: number; w: number; h: number; d: Record<string, string>; text: string; style: string };
const box = (page: Page, sel: string): Promise<Box[]> => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getClientRects().length).map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height, d: { ...e.dataset } as Record<string, string>, text: e.textContent ?? "", style: e.getAttribute("style") ?? "" }; }), sel);
const frame = (page: Page, ms = 450) => page.waitForTimeout(ms);
const offPE = (page: Page) => page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler, .bw-inm, .bw-fig, .bw-ovd { pointer-events: none !important; }" });
/** zoom so rows are `rp` px about (x, y): Ctrl+wheel steps (Chromium delivers only part of a large delta) */
async function zoomRows(page: Page, rp: number, x = PHONE.width * 0.6, y = 430) {
  await offPE(page);
  await page.mouse.move(x, y);
  for (let i = 0; i < 50; i++) {
    const r = await root(page);
    if (Math.abs(r.rp - rp) < 0.3) break;
    const target = rp >= 48 && r.rp >= 47.99 ? null : rp;
    if (target == null) break;
    await page.keyboard.down("Control");
    /* Chromium drops a very small delta, so each step is at least 1.5 */
    const dy = -Math.log(rp / Math.max(0.5, r.rp)) / 0.012;
    await page.mouse.wheel(0, Math.sign(dy) * Math.max(1.5, Math.min(100, Math.abs(dy))));
    await page.keyboard.up("Control");
    await page.waitForTimeout(60);
    if (i > 2 && Math.abs((await root(page)).rp - r.rp) < 0.01) break;
  }
  await frame(page);
}
/** zoom to the ceiling (time keeps opening out after rows stop at 48px) */
async function zoomMax(page: Page) {
  for (let i = 0; i < 16; i++) { const zin = page.locator('[data-bw="zin"]'); if (await zin.isDisabled()) break; await zin.click({ timeout: 1500 }).catch(() => {}); await frame(page, 380); }
}
/** pan by (dx, dy): wheel steps until it has moved or stops at the edge */
async function pan(page: Page, dx: number, dy: number, x = 200, y = 430) {
  await offPE(page);
  await page.mouse.move(x, y);
  const r0 = await root(page);
  for (let i = 0; i < 40; i++) {
    const r = await root(page);
    const lx = dx - (r.ox - r0.ox), ly = dy - (r.oy - r0.oy);
    if (Math.abs(lx) < 0.5 && Math.abs(ly) < 0.5) break;
    await page.mouse.wheel(-Math.max(-120, Math.min(120, lx)), -Math.max(-120, Math.min(120, ly)));
    await page.waitForTimeout(50);
    const n = await root(page);
    if (i > 0 && Math.abs(n.ox - r.ox) < 0.01 && Math.abs(n.oy - r.oy) < 0.01) break;
  }
  await frame(page);
}
async function lineTo(page: Page, frac: number) { const r = await root(page); await pan(page, PHONE.width * frac - r.lx, 0); }
async function fitted(page: Page) { const fit = page.locator('[data-bw="fit"]:not(.hide)'); if (await fit.count()) { await fit.click(); await frame(page, 700); } }
async function pill(page: Page, k: string) { await page.locator(`[data-bw="chip"][data-k="${k}"]`).click(); await frame(page, 700); }
async function openWorld(page: Page, path = WORLD, vp: { width: number; height: number } = PHONE) {
  await page.setViewportSize(vp);
  await page.goto(path);
  await page.locator('[data-bw="world"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await frame(page, 1400);
}
async function mutate(page: Page, mut: Mut) { const css = mut ? CSS_MUT[mut] : undefined; if (css) { await page.addStyleTag({ content: css }); await frame(page, 300); } }
async function signIn(page: Page) {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 }); /* the harness's shell check is the desktop's */
  await page.evaluate(() => { try { localStorage.removeItem("bw1.hint.seen"); } catch { /* */ } });
}
/* the emulator, as the owner (no rules): read, set, put back */
async function emuPatch(path: string, fields: Record<string, unknown>, mask: string[]) {
  const q = mask.map((m) => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join("&");
  const r = await fetch(`${EMU}/${path}?${q}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields }), signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`PATCH ${path}: ${r.status} ${await r.text()}`);
}
const setQuietWeeks = (w: number | null) => w == null
  ? emuPatch(`users/${UID}`, {}, ["workspacePrefs.clock.quietWeeks"])
  : emuPatch(`users/${UID}`, { workspacePrefs: { mapValue: { fields: { clock: { mapValue: { fields: { quietWeeks: { integerValue: String(w) } } } } } } } }, ["workspacePrefs.clock.quietWeeks"]);
/** the writer's queries as the emulator holds them (the snapshot carries more than harness.json: the seeded fixtures) */
async function listQueries(): Promise<{ id: string; status: string }[]> {
  const out: { id: string; status: string }[] = [];
  let token = "";
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${EMU}/users/${UID}/queries?pageSize=300${token ? `&pageToken=${token}` : ""}`, { headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(60_000) });
    const j = (await r.json()) as { documents?: { name: string; fields?: { status?: { stringValue?: string } } }[]; nextPageToken?: string };
    for (const d of j.documents ?? []) out.push({ id: d.name.split("/").pop()!, status: d.fields?.status?.stringValue ?? "" });
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return out;
}
const setStatus = (id: string, status: string) => emuPatch(`users/${UID}/queries/${id}`, { status: { stringValue: status } }, ["status"]);

/** each stage bar's expected left: the engine's own mapping, read off the root */
const dayX = (r: Root, day: number) => r.ox + (Math.max(r.d0, Math.min(r.d1, day)) - r.d0) * r.ppd * r.sx;

test.use({ viewport: PHONE, deviceScaleFactor: 2 });
const runs: Mut[] = process.env.BW_MUTATE === "all" ? ["", ...MUTS.filter((m) => m !== "empty")] : process.env.BW_MUTATE ? (process.env.BW_MUTATE.split(",") as Mut[]).filter((m) => m !== "empty") : [""];
const emptyRuns: Mut[] = process.env.BW_MUTATE === "all" || (process.env.BW_MUTATE ?? "").split(",").includes("empty") ? ["empty"] : [""];

for (const mut of runs) {
  test(`Phone Birds-eye world v2 — the locks${mut ? ` · mutation ${mut}` : ""}`, async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "Chromium phone only (CDP touch for the pinch)");
    test.setTimeout(900_000);
    const L = new Ledger(mut, "locks");
    /* every console error and page error from here on, recorded (an error thrown in the world is a red) */
    const errs: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(`console: ${m.text().slice(0, 200)}`); });
    page.on("pageerror", (e) => errs.push(`pageerror: ${String(e).slice(0, 200)}`));
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    await signIn(page);
    await openWorld(page);
    if (mut !== "short" && mut !== "seventy") await mutate(page, mut);

    /* ── BW-1 · fitted is bars only ── */
    {
      if (mut === "fitted") await page.evaluate(() => { const l = document.querySelector('[data-bw="layer"]')!; const s = document.createElement("span"); s.className = "bw-inm"; s.dataset.bw = "name"; s.textContent = "A name"; s.style.cssText = "left:40px;top:300px"; l.appendChild(s); });
      const r = await root(page);
      const n = (sel: string) => page.locator(`[data-bw="layer"] ${sel}`).count();
      const [names, figs, grids, bars] = await Promise.all([n('[data-bw="name"]'), n('[data-bw="fig"]'), n('[data-bw="grid"]'), n('[data-bw="bar"]')]);
      L.check("BW-1", `fitted (z ${r.z}, rows ${r.rp.toFixed(1)}px): bars drawn (population ${bars})`, !r.zoomed && bars > 0, "");
      L.check("BW-1", "fitted: no names, no figures, no gridlines", names + figs + grids === 0, JSON.stringify({ names, figs, grids }));
      L.check("BW-1", "fitted: the pill reads Today, the header is unfolded (140px)", (await box(page, '[data-bw="pill"]'))[0]?.text.trim() === "Today" && (await box(page, '[data-bw="head"]'))[0]?.h === 140, "");
    }

    /* ── BW-9 · the pills add up ── */
    {
      if (mut === "counts") await page.evaluate(() => { const c = document.querySelector<HTMLElement>('[data-bw="chip"][data-k="wait"]')!; c.dataset.n = String(+c.dataset.n! + 1); c.querySelector("b")!.textContent = c.dataset.n!; });
      const chips = await box(page, '[data-bw="chip"]');
      const n = Object.fromEntries(chips.map((c) => [c.d.k, Number(/(\d+)\s*$/.exec(c.text.trim())?.[1])]));
      L.check("BW-9", `All ${n.all} = With you ${n.you} + Needs chasing ${n.chase} + Waiting ${n.wait} (the labels' own counts)`, n.all > 0 && n.all === n.you + n.chase + n.wait, JSON.stringify(n));
      L.check("BW-9", "the pills read All, With you, Needs chasing, Waiting, counts after the label", chips.map((c) => c.text.replace(/\s*\d+\s*$/, "").trim()).join("|") === "All|With you|Needs chasing|Waiting", chips.map((c) => c.text).join("|"));
    }

    /* ── BW-10 · seventy queries (the harness's own campaign) ── */
    {
      if (mut === "seventy") { await mutate(page, "seventy"); await page.setViewportSize({ width: PHONE.width, height: PHONE.height - 1 }); await frame(page, 500); await page.setViewportSize(PHONE); await frame(page, 700); }
      const r = await root(page);
      const all = Number((await box(page, '[data-bw="chip"][data-k="all"]'))[0]?.d.n);
      const span = 600 * r.sx;
      L.check("BW-10", `fitted with ${all} open queries: time spans at least 90% of the width`, all >= 60 && span >= 0.9 * PHONE.width, `${span.toFixed(1)}px of ${PHONE.width}`);
      await zoomRows(page, 48);
      const r2 = await root(page);
      L.check("BW-10", "48px rows are reachable", Math.abs(r2.rp - 48) < 0.05, `rows ${r2.rp} at z ${r2.z} (ceiling ${r2.maxz})`);
      await fitted(page);
    }

    /* ── BW-2 · every pill keeps All's horizontal scale; the line at the same x ── */
    {
      /* the button can turn disabled between the check and the click: a short click timeout, never a wait */
      const at1 = async () => { for (let i = 0; i < 12; i++) { const zo = page.locator('[data-bw="zout"]'); if (await zo.isDisabled()) break; await zo.click({ timeout: 1500 }).catch(() => {}); await frame(page, 380); } return root(page); };
      const all = await at1();
      if (mut === "scale") { await page.addStyleTag({ content: ".bw-vp { right: 40px !important; }" }); }
      for (const k of ["you", "chase", "wait"]) {
        await pill(page, k);
        const r = await at1();
        L.check("BW-2", `${k}: All's horizontal scale (sx ${r.sx} vs ${all.sx})`, Math.abs(r.sx - all.sx) < 1e-4, "");
        L.check("BW-2", `${k}: the line at All's x (${r.lx} vs ${all.lx})`, Math.abs(r.lx - all.lx) < 0.5, "");
        await pill(page, k);
      }
      if (mut === "scale") { await page.addStyleTag({ content: ".bw-vp { right: 0 !important; }" }); await frame(page, 500); }
    }

    /* ── BW-3 · a short pill opens zoomed in, every row fitting, the header unfolded ── */
    {
      if (mut === "short") await mutate(page, "short");
      const counts = Object.fromEntries((await box(page, '[data-bw="chip"]')).map((c) => [c.d.k, Number(c.d.n)]));
      const k = (["you", "chase", "wait"] as const).filter((x) => counts[x] > 0).sort((a, b) => counts[a] - counts[b])[0];
      await pill(page, k);
      if (mut === "short") { await page.locator('[data-bw="zin"]').click({ timeout: 1500 }).catch(() => {}); await frame(page, 600); }
      const r = await root(page);
      const rows = await box(page, '[data-bw="row"]');
      const dock = (await box(page, '[data-pa5="dock"]'))[0];
      const fits = rows.every((x) => x.t >= r.top - 0.5 && x.b <= (dock?.t ?? PHONE.height) + 0.5);
      L.check("BW-3", `the shortest pill (${k}, ${counts[k]}) opens closer in (FZ ${r.fz})`, r.z > 1.04 && Math.abs(r.z - r.fz) < 0.03, `z ${r.z}`);
      L.check("BW-3", `${k}: every drawn row (${r.n}) on screen, between the ruler and the dock`, r.n > 0 && rows.length === r.n && fits, `${rows.length} of ${r.n}; last ${JSON.stringify(rows.slice(-1).map((x) => x.b))} vs dock ${dock?.t}`);
      L.check("BW-3", `${k}: the header is unfolded (140px)`, (await box(page, '[data-bw="head"]'))[0]?.h === 140, String((await box(page, '[data-bw="head"]'))[0]?.h));
      await fitted(page); /* folded, the pills are hidden: back to the pill's opening first */
      await pill(page, k);
      if (mut === "short") { await page.addStyleTag({ content: ".bw-vp { bottom: 0 !important; }" }); await frame(page, 500); }
    }

    /* ── BW-4 · at 48px rows, each multi-stage row's stage bars on their dates; BW-7 · no gap, earlier stages faded ── */
    {
      await fitted(page);
      const many = await page.evaluate(() => {
        const n = new Map<string, number>();
        for (const b of document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="stage"]')) n.set(b.dataset.row!, (n.get(b.dataset.row!) ?? 0) + 1);
        const id = [...n].sort((a, b) => b[1] - a[1])[0]?.[0];
        const r = id ? document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect() : null;
        return { id, y: r ? r.top + r.height / 2 : 430 };
      });
      await zoomRows(page, 48, PHONE.width * 0.6, many.y);
      const first = (await box(page, `[data-bw="bar"][data-row="${many.id}"]`)).sort((a, b) => a.l - b.l)[0];
      if (first) await pan(page, 24 - first.l, 0);
      const r = await root(page);
      const bars = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="stage"]')].map((b) => { const bb = b.getBoundingClientRect(); return { row: b.dataset.row!, day: +b.dataset.day!, st: b.dataset.st!, cur: b.dataset.cur === "1", cont: b.dataset.cont === "1", l: bb.left, r: bb.right, t: bb.top, bg: getComputedStyle(b).backgroundColor }; }));
      const byRow = new Map<string, typeof bars>();
      for (const b of bars) byRow.set(b.row, [...(byRow.get(b.row) ?? []), b]);
      const multi = [...byRow].filter(([, l]) => l.length >= 2 && l.some((b) => b.l > 0 && b.l < PHONE.width)).flatMap(([, l]) => l).filter((b) => b.l > 0 && b.l < PHONE.width);
      const off = multi.filter((b) => Math.abs(b.l - dayX(r, b.day)) > 2);
      L.check("BW-4", `48px rows (${r.rp}): multi-stage rows on screen (population ${new Set(multi.map((b) => b.row)).size} rows, ${multi.length} bars)`, multi.length >= 2 && Math.abs(r.rp - 48) < 0.05, "");
      L.check("BW-4", "each stage bar sits within 2px of its date's x", off.length === 0, JSON.stringify(off.slice(0, 4).map((b) => [b.row, b.l, dayX(r, b.day)])));
      /* BW-7: the current stage and its tail share an edge (today brought on screen, where the joins are) */
      await lineTo(page, 0.6);
      const bars2 = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="stage"]')].map((b) => { const bb = b.getBoundingClientRect(); return { row: b.dataset.row!, cur: b.dataset.cur === "1", cont: b.dataset.cont === "1", r: bb.right }; }));
      const tails = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="ahead"], [data-bw="bar"][data-k="past"]')].map((b) => ({ row: b.dataset.row!, l: b.getBoundingClientRect().left })));
      const joins = bars2.filter((b) => b.cur && b.cont).map((b) => ({ b, t: tails.find((t) => t.row === b.row) })).filter((x) => x.t && x.b.r > 0 && x.b.r < PHONE.width);
      const gaps = joins.filter((x) => Math.abs(x.b.r - x.t!.l) > 0.6);
      L.check("BW-7", `the current stage and its tail share an edge (population ${joins.length})`, joins.length > 0 && gaps.length === 0, JSON.stringify(gaps.slice(0, 3).map((x) => [x.b.row, x.b.r, x.t!.l])));
      /* an earlier stage's fill is the faded colour: color-mix(BAND 45%, #fff), computed by the browser itself */
      const early = bars.filter((b) => !b.cur).slice(0, 12);
      const want = await page.evaluate((list) => list.map(([st, band]) => { const d = document.createElement("i"); d.style.background = `color-mix(in srgb,${band} 45%,#fff)`; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return [st, c]; }), early.map((b) => [b.st, statusBand(b.st)] as [string, string]));
      const unfaded = early.filter((b, i) => b.bg !== want[i][1]);
      L.check("BW-7", `earlier stages are the faded colour (population ${early.length})`, early.length > 0 && unfaded.length === 0, JSON.stringify(unfaded.slice(0, 3).map((b, i) => [b.st, b.bg, want[i]?.[1]])));
      const curFull = bars.filter((b) => b.cur).slice(0, 8).filter((b) => b.bg !== `rgb(${[1, 3, 5].map((i) => parseInt(statusBand(b.st).slice(i, i + 2), 16)).join(", ")})`);
      L.check("BW-7", "the current stage keeps its full colour", curFull.length === 0, JSON.stringify(curFull.slice(0, 3)));

      /* ── BW-5 · no name overlaps a figure or an "!", across the rows on screen and two pans ── */
      for (const step of [0, 1, 2]) {
        if (step) await pan(page, 0, -260);
        const ov = await page.evaluate(() => {
          const rect = (e: Element) => e.getBoundingClientRect();
          const names = [...document.querySelectorAll('[data-bw="name"]')].map(rect), figs = [...document.querySelectorAll('[data-bw="fig"], [data-bw="mark"]')].map(rect);
          const hit = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
          const out: string[] = [];
          for (const n of names) for (const f of figs) if (hit(n, f)) out.push(`${Math.round(n.left)}-${Math.round(n.right)}@${Math.round(n.top)} × ${Math.round(f.left)}-${Math.round(f.right)}@${Math.round(f.top)}`);
          return { names: names.length, figs: figs.length, out };
        });
        L.check("BW-5", `screen ${step + 1}: no name over a figure or an "!" (population ${ov.names} names, ${ov.figs} figures and marks)`, ov.names > 0 && ov.figs > 0 && ov.out.length === 0, ov.out.slice(0, 4).join(" | "));
      }
    }

    /* ── BW-6 · at the closest zoom, the ruler's marks clear of each other and of both pills. On the harness (a year-long,
       70-query campaign) the closest zoom at 390 reaches weekly marks (days need 24px each); the day tier is read in
       landscape (740 × 360), where it is reached — both are recorded. ── */
    const rulerRead = async (where: string, wantDays: boolean) => {
      await zoomMax(page);
      await lineTo(page, 0.62);
      const rm = (await box(page, '[data-bw="rm"]')).sort((a, b) => a.l - b.l);
      const days = rm.filter((m) => m.d.day === "1");
      const pills = [...(await box(page, '[data-bw="pill"]')), ...(await box(page, '[data-bw="mon"]'))];
      const clash: string[] = [];
      for (let i = 1; i < rm.length; i++) if (rm[i].l < rm[i - 1].r) clash.push(`${rm[i - 1].text}|${rm[i].text}`);
      for (const d of rm) for (const p of pills) if (d.l < p.r && p.l < d.r) clash.push(`${d.text} under ${p.text}`);
      const tier = (await page.locator('[data-bw="ruler"]').getAttribute("data-tier")) ?? "";
      if (wantDays) L.check("BW-6", `${where}: the closest zoom marks every day, with the month pill (tier ${tier}, ${days.length} day numbers)`, tier === "days" && days.length >= 5 && pills.length === 2, "");
      else L.check("BW-6", `${where}: the closest zoom on this campaign (tier ${tier}, ${rm.length} marks; recorded)`, rm.length >= 2, "");
      L.check("BW-6", `${where}: marks overlap neither each other nor the Today or month pill`, clash.length === 0, clash.slice(0, 5).join(", "));
      const grid = await page.locator('[data-bw="grid"]').count();
      L.check("BW-6", `${where}: zoomed in, gridlines down from the marks (population ${grid})`, grid >= 2, "");
    };
    {
      await rulerRead("390x784", false);
      await openWorld(page, WORLD, LAND);
      await mutate(page, mut);
      await rulerRead("740x360", true);
      await openWorld(page);
      await mutate(page, mut);
    }

    /* ── BW-8 · gone quiet starts at the setting's N weeks (two settings) ── */
    {
      for (const weeks of [6, 3]) {
        /* the harness has no setting of its own, so the app's default (4 weeks, queryClock) applies until each is set */
        await setQuietWeeks(weeks); await openWorld(page); await mutate(page, mut === "quiet" ? "quiet" : "");
        const r = await root(page);
        const q = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="quiet"]')].map((b) => {
          const row = document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(b.dataset.row!)}"]`)!;
          return { row: b.dataset.row!, l: b.getBoundingClientRect().left, due: Number(row.dataset.due), start: Number(row.dataset.start), day: Number(b.dataset.day), dueDay: Number(row.dataset.dueday) };
        }));
        const t0 = new Date(); t0.setHours(0, 0, 0, 0);
        /* the engine's rule: N weeks after the reply date, or the stage's own start if it was reached later than that */
        void t0;
        const want = (x: (typeof q)[number]) => Math.max(x.dueDay + weeks * 7, x.start);
        const bad = q.filter((x) => Math.abs(x.l - dayX(r, want(x))) > 1.5).map((x) => ({ ...x, want: want(x), x: dayX(r, want(x)) }));
        const atSetting = q.filter((x) => want(x) > x.start).length;
        L.check("BW-8", `quietWeeks ${weeks}: the fade starts ${weeks} weeks after each reply date (population ${q.length}, ${atSetting} at the setting itself)`, q.length > 0 && atSetting > 0 && bad.length === 0, JSON.stringify(bad.slice(0, 3)));
      }
      await setQuietWeeks(null);
      await openWorld(page);
      await mutate(page, mut);
    }

    /* ── BW-12 · replay: the line from the first date to today; a touch stops it; (reduced motion: BW-17) ── */
    {
      await fitted(page);
      const r0 = await root(page);
      if (mut === "replay") await page.evaluate(() => { (window as unknown as { requestAnimationFrame: (f: FrameRequestCallback) => number }).requestAnimationFrame = () => 0; });
      await page.locator('[data-bw="replay"]').click();
      const reads: { lx: number; label: string; replay: string; figs: number }[] = [];
      for (let i = 0; i < 6; i++) { await page.waitForTimeout(650); const r = await root(page); reads.push({ lx: r.lx, label: (await box(page, '[data-bw="pill"]'))[0]?.text.trim() ?? "", replay: r.replay, figs: await page.locator('[data-bw="fig"]').count() }); }
      const first = await page.evaluate(() => { const bars = [...document.querySelectorAll<HTMLElement>('[data-bw="bar"]')].map((b) => b.getBoundingClientRect().left); return Math.min(...bars); });
      const rising = reads.every((x, i) => !i || x.lx >= reads[i - 1].lx - 0.5) && reads[reads.length - 1].lx > reads[0].lx + 20;
      L.check("BW-12", "replay runs: the line moves forwards, its pill showing the date, no figures", reads[0].replay === "running" && rising && /^\d+ \w+$/.test(reads[0].label) && reads.every((x) => x.figs === 0), JSON.stringify(reads.slice(0, 3)));
      L.check("BW-12", "it starts near the first date (the line at the left of the bars)", reads[0].lx < r0.lx - 60 && reads[0].lx <= first + 140, `${reads[0].lx} vs first bar ${first}, today ${r0.lx}`);
      await page.mouse.move(200, 500); await page.mouse.down(); await page.mouse.up();
      await frame(page, 500);
      const after = await root(page);
      L.check("BW-12", "a touch stops it at today", after.replay === "done" && Math.abs(after.lx - r0.lx) < 1 && (await box(page, '[data-bw="pill"]'))[0]?.text.trim() === "Today", JSON.stringify({ replay: after.replay, lx: after.lx, today: r0.lx }));
      if (mut === "replay") await openWorld(page);
    }

    /* ── BW-14 · layers (v1's, kept) ── */
    {
      await fitted(page);
      await page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler { pointer-events: auto !important; }" });
      const layers = await page.evaluate(() => {
        const hs = document.querySelector<HTMLElement>(".bw-hs")?.getBoundingClientRect();
        const heads = [...document.querySelectorAll<HTMLElement>(".bw-gh0")].map((h) => h.getBoundingClientRect());
        const line = document.querySelector<HTMLElement>(".bw-fline")?.getBoundingClientRect();
        const at = (x: number, y: number) => document.elementsFromPoint(x, y).map((e) => (e as HTMLElement).className?.toString?.() ?? e.tagName);
        const rank = (list: string[], cls: string) => list.findIndex((c) => c.split(" ").includes(cls));
        let headPt: [number, number] | null = null;
        if (hs) for (const h of heads) { const l = Math.max(h.left + 4, hs.left + hs.width * 0.25), r = Math.min(h.right, hs.right - hs.width * 0.25), t = Math.max(h.top + 2, hs.top), b = Math.min(h.bottom - 2, hs.bottom); if (r > l && b > t) { headPt = [(l + r) / 2, (t + b) / 2]; break; } }
        const A = headPt ? at(...headPt) : [];
        const B = hs && line ? at(line.left + line.width / 2, Math.max(hs.top + 10, line.top + 10)) : [];
        return { headPt, hawkOverHead: headPt ? rank(A, "bw-hs") >= 0 && rank(A, "bw-hs") < rank(A, "bw-gh0") : null, A: A.slice(0, 6), lineOverHawk: rank(B, "bw-fline") >= 0 && (rank(B, "bw-hs") < 0 || rank(B, "bw-fline") < rank(B, "bw-hs")), B: B.slice(0, 6) };
      });
      L.check("BW-14", "the hawk's shadow paints above a group heading", layers.hawkOverHead === true, JSON.stringify(layers.A));
      L.check("BW-14", "the line paints above the hawk", layers.lineOverHawk === true, JSON.stringify(layers.B));
      await page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler { pointer-events: none !important; }" });
    }

    /* ── BW-15 · the line off screen (v1's, now "Today") ── */
    {
      await zoomRows(page, 40);
      const zr = await root(page);
      let reached = 0;
      for (const [dir, want] of [[1, "← Today"], [-1, "Today →"]] as const) {
        await pan(page, dir * -6000, 0);
        const p = (await box(page, '[data-bw="pill"]'))[0];
        if (p.d.off === "0") { L.check("BW-15", `"${want}": the line cannot leave by this side at this zoom (recorded)`, true, ""); continue; }
        reached++;
        const look = await page.evaluate(() => { const e = document.querySelector<HTMLElement>('[data-bw="pill"]')!; const cs = getComputedStyle(e); return { bg: cs.backgroundColor, border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}` }; });
        L.check("BW-15", `panned past the line: "${want}" at the edge, outlined`, p.text.trim() === want && look.bg === "rgb(255, 255, 255)" && /^1(\.5)?px solid rgb\(42, 58, 82\)$/.test(look.border), `${p.text} ${JSON.stringify(look)}`);
        await page.locator('[data-bw="pill"]').click(); await frame(page, 700);
        const r = await root(page);
        L.check("BW-15", `a tap on "${want}" brings the line back on screen`, r.lx > 44 && r.lx < PHONE.width - 44, String(r.lx));
      }
      L.check("BW-15", `the line was taken off screen (population ${reached} sides)`, reached >= 1, `at z ${zr.z}, rows ${zr.rp}, sx ${zr.sx}`);
      await fitted(page);
    }

    /* ── BW-16 · anchoring (v1's) ── */
    {
      const under = (y: number) => page.evaluate((yy) => { const r = [...document.querySelectorAll<HTMLElement>('[data-bw="row"]')].find((e) => { const b = e.getBoundingClientRect(); return b.top <= yy && b.bottom > yy; }); if (!r) return null; const b = r.getBoundingClientRect(); return { id: r.dataset.id!, t: b.top, h: b.height }; }, y);
      const rowAt = (id: string) => page.evaluate((i) => { const r = document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(i)}"]`); if (!r) return null; const b = r.getBoundingClientRect(); return { t: b.top, h: b.height }; }, id);
      await offPE(page);
      /* a row's middle, mid-screen */
      const y = await page.evaluate(() => { const r = [...document.querySelectorAll<HTMLElement>('[data-bw="row"]')].map((e) => e.getBoundingClientRect()).find((b) => b.top + b.height / 2 > 320 && b.top + b.height / 2 < 600); return r ? r.top + r.height / 2 : 430; }), x = 200;
      const a = await under(y);
      if (mut === "anchor") await page.addStyleTag({ content: ".bw-w { transform: translateY(14px) !important; }" });
      await page.mouse.move(x, y); await page.keyboard.down("Control"); await page.mouse.wheel(0, -90); await page.keyboard.up("Control"); await frame(page);
      const b = a ? await rowAt(a.id) : null;
      const drift = a && b ? Math.abs(b.t + ((y - a.t) / a.h) * b.h - y) : NaN;
      L.check("BW-16", "Ctrl+wheel keeps the row under the pointer within 4px", drift <= 4, `${a?.id} ${drift}`);
      const cdp: CDPSession = await page.context().newCDPSession(page);
      const c = await under(y);
      const tp = (d: number) => [{ x: x - d, y, id: 1 }, { x: x + d, y, id: 2 }];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp(30) });
      for (let i = 1; i <= 10; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: tp(30 + i * 6) }); await page.waitForTimeout(16); }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await frame(page);
      const d2 = c ? await rowAt(c.id) : null;
      const pd = c && d2 ? Math.abs(d2.t + ((y - c.t) / c.h) * d2.h - y) : NaN;
      L.check("BW-16", "a pinch keeps the row under the fingers within 4px", pd <= 4, `${c?.id} ${pd}`);
      if (mut === "anchor") await page.addStyleTag({ content: ".bw-w { transform: none !important; }" });
      await fitted(page);
    }

    /* ── BW-13 · copy, across the states read so far ── */
    {
      if (mut === "copy") await page.evaluate(() => { const g = document.querySelector('[data-bw="group"]'); if (g) g.textContent = "Overdue"; });
      const words = await page.evaluate(() => document.querySelector<HTMLElement>('[data-bw="world"]')!.innerText);
      L.check("BW-13", 'never "overdue" or "late"', !/overdue|\blate\b/i.test(words), (/.{0,30}(overdue|\blate\b).{0,30}/i.exec(words) ?? [""])[0]);
    }

    /* ── BW-17 · reduced motion: no drift, no glide, no replay ── */
    {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openWorld(page);
      await mutate(page, mut === "calm" ? "calm" : "");
      const drift = await page.evaluate(() => getComputedStyle(document.querySelector(".bw-hsw")!).animationName);
      await zoomRows(page, 40);
      const r0 = await root(page);
      await offPE(page);
      await page.mouse.move(150, 450); await page.mouse.down(); for (let i = 1; i <= 6; i++) { await page.mouse.move(150 + i * 25, 450 + i * 10); await page.waitForTimeout(8); } await page.mouse.up();
      const r1 = await root(page); await page.waitForTimeout(600); const r2 = await root(page);
      await fitted(page);
      await page.locator('[data-bw="replay"]').click(); await page.waitForTimeout(400);
      const rep = (await root(page)).replay;
      L.check("BW-17", "reduced motion: the hawk does not drift", drift === "none", drift);
      L.check("BW-17", "reduced motion: a drag stops where it is let go", Math.hypot(r1.ox - r0.ox, r1.oy - r0.oy) > 20 && Math.hypot(r2.ox - r1.ox, r2.oy - r1.oy) < 0.5, JSON.stringify({ r0: r0.ox, r1: r1.ox, r2: r2.ox }));
      L.check("BW-12", "reduced motion: replay never runs", rep !== "running", rep);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }

    /* ── BW-18 · landscape (740 × 360) ── */
    {
      await openWorld(page, WORLD, LAND);
      await mutate(page, mut === "land" ? "land" : "");
      const head = (await box(page, '[data-bw="head"]'))[0];
      const dock = await page.evaluate(() => { const d = document.querySelector<HTMLElement>('[data-pa5="dock"]'); return d ? getComputedStyle(d).display : "absent"; });
      L.check("BW-18", "740x360: the header folded (96px), no dock", !!head && head.h === 96 && (dock === "none" || dock === "absent"), JSON.stringify({ h: head?.h, dock }));
      await page.setViewportSize(PHONE);
    }
    /* the world's own errors: a stack frame in one of its files. (Phone pages that throw "no V3Provider" while the viewport
       crosses 768px — TodayV5, TodoV5, QueriesV4, caught by their page boundaries — are the app's, named in the report.) */
    const ours = errs.filter((e) => /at (BirdsWorld|drawWorld|drawMini|inRow|wireMotion|makeWorld|bwRow|rowSegs)\b/.test(e));
    writeFileSync(`${DIR}/ledger/console${mut ? `.mut-${mut}` : ""}.json`, JSON.stringify(errs, null, 1));
    L.check("BW-13", `no error from the world in the console (population ${errs.length} console errors in all)`, ours.length === 0, ours.slice(0, 3).join(" | "));
    L.done(40);
  });
}

/* ══ the shots: the build's 01–08 and 12–14 beside the ref's (09–11 are the empty-state test's) ══ */
test("Phone Birds-eye world v2 — the shots beside the ref's", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel" || !process.env.BW_SHOTS, "BW_SHOTS=1, Chromium phone");
  test.setTimeout(600_000);
  const out = `${DIR}/shots`; mkdirSync(out, { recursive: true });
  const shot = (n: string) => page.screenshot({ path: `${out}/${n}-build.png` });
  await signIn(page);
  await page.evaluate(() => { try { localStorage.setItem("bw1.hint.seen", "1"); } catch { /* */ } });
  await openWorld(page);
  await shot("01-overview"); await shot("12-seventy-overview");
  await zoomRows(page, 27); await lineTo(page, 0.74); await shot("02-names-in-bar");
  await zoomRows(page, 48); await lineTo(page, 0.74); await shot("03-stages-in-bar"); await shot("13-seventy-zoomed");
  await zoomMax(page); await lineTo(page, 0.62); await shot("04-closest-daily-dates");
  await fitted(page);
  for (const [k, n] of [["you", "05-pill-with-you"], ["chase", "06-pill-needs-chasing"], ["wait", "07-pill-waiting"]] as const) { await pill(page, k); await shot(n); if (k === "chase") { await zoomRows(page, 48); await shot("08-pill-folded-header"); await fitted(page); } await pill(page, k); }
  await page.locator('[data-bw="replay"]').click(); await page.waitForTimeout(3000); await shot("14-replay-midway");
  const names = ["01-overview", "02-names-in-bar", "03-stages-in-bar", "04-closest-daily-dates", "05-pill-with-you", "06-pill-needs-chasing", "07-pill-waiting", "08-pill-folded-header", "09-new-writer", "10-only-closed", "11-nothing-with-you", "12-seventy-overview", "13-seventy-zoomed", "14-replay-midway"];
  for (const n of names) copyFileSync(`design-refs/phone-birds-eye-world-v2/shots/${n}.png`, `${out}/${n}-ref.png`);
  writeFileSync(`${out}/index.html`, `<!doctype html><meta charset="utf-8"><title>Birds-eye world v2 — build beside ref</title><style>body{font:14px system-ui;background:#f2eee8;margin:24px}figure{display:inline-block;margin:0 24px 32px 0;vertical-align:top}img{width:390px;border-radius:24px;box-shadow:0 4px 16px #0002}h2{margin:24px 0 8px}</style>${names.map((n) => `<h2>${n}</h2><figure><img src="${n}-build.png"><figcaption>build</figcaption></figure><figure><img src="${n}-ref.png"><figcaption>ref</figcaption></figure>`).join("")}`);
});

/* ══ the empty states: they change the harness's data, so they run last, in their own test ══ */
for (const mut of emptyRuns) {
  test(`Phone Birds-eye world v2 — empty states, then the shots of them${mut ? ` · mutation ${mut}` : ""}`, async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "Chromium phone only");
    test.setTimeout(600_000);
    const L = new Ledger(mut, "empty");
    const out = `${DIR}/shots`; mkdirSync(out, { recursive: true });
    const shot = (n: string) => (process.env.BW_SHOTS ? page.screenshot({ path: `${out}/${n}-build.png` }) : Promise.resolve(Buffer.from("")));
    await signIn(page);
    const card = async (k: string) => { const r = await root(page); const c = (await box(page, '[data-bw="card"]'))[0]; return { k: r.card, shown: !!c && c.d.k === k && c.w > 200, text: c?.text ?? "" }; };
    /* 1 · nothing with you: every query the writer owes is set back to Queried */
    const ALL_Q = await listQueries();
    const owed = ALL_Q.filter((q) => ["Partial Requested", "Full Requested", "Revise & Resubmit", "Offer"].includes(q.status));
    for (const q of owed) await setStatus(q.id, "Queried");
    await openWorld(page, `${WORLD}&court=you`);
    await mutate(page, mut);
    const you = await card("you");
    L.check("BW-11", `nothing with you: "Nothing’s with you" (population ${owed.length} set back)`, you.shown && /Nothing’s with you/.test(you.text) && /See all queries/.test(you.text), you.text);
    await shot("11-nothing-with-you");
    /* 2 · only closed queries */
    for (const q of ALL_Q) await setStatus(q.id, "Rejected");
    await openWorld(page);
    await mutate(page, mut);
    const closed = await card("closed");
    const below = await page.evaluate(() => { const c = document.querySelector('[data-bw="card"]')?.getBoundingClientRect(); const g = [...document.querySelectorAll<HTMLElement>('[data-bw="group"]')].find((e) => e.dataset.t === "Closed")?.getBoundingClientRect(); return c && g ? g.top - c.bottom : null; });
    L.check("BW-11", "only closed: the card at the top, the Closed section below it", closed.shown && /No open queries/.test(closed.text) && below != null && below > 0, `${closed.text} · gap ${below}`);
    await shot("10-only-closed");
    for (const k of ["chase", "wait"] as const) {
      await page.locator(`[data-bw="chip"][data-k="${k}"]`).click(); await frame(page, 700);
      const c = await card(k);
      L.check("BW-11", `an empty ${k} pill shows its card`, c.shown && /See all queries/.test(c.text), c.text);
      await page.locator(`[data-bw="chip"][data-k="${k}"]`).click(); await frame(page, 500);
    }
    /* 3 · no queries at all: the card over the blurred sample; no pills, no gestures, no controls */
    /* the writer's own queries deleted (emulator only); the writer's user document stays, as a new writer's would */
    let gone = 0, left: { id: string }[] = ALL_Q;
    for (let pass = 0; pass < 3 && left.length; pass++) {
      for (const q of left) { const d = await fetch(`${EMU}/users/${UID}/queries/${encodeURIComponent(q.id)}`, { method: "DELETE", headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(60_000) }); if (d.ok) gone++; }
      left = await listQueries();
    }
    L.check("BW-11", `the harness's queries deleted, emulator only (population ${gone}; ${left.length} left)`, gone > 0 && left.length === 0, JSON.stringify(left.slice(0, 5)));
    /* the app's persistent Firestore cache (IndexedDB) would serve the deleted rows back: drop it (never the sign-in's) */
    await page.evaluate(async () => { for (const d of await indexedDB.databases()) if (d.name && /firestore/i.test(d.name)) await new Promise((r) => { const q = indexedDB.deleteDatabase(d.name!); q.onsuccess = q.onerror = q.onblocked = () => r(null); }); });
    await page.goto("about:blank");
    await openWorld(page);
    await mutate(page, mut);
    const none = await card("none");
    const look = await page.evaluate(() => { const l = document.querySelector<HTMLElement>('[data-bw="layer"]')!; const cs = getComputedStyle(l); return { filter: cs.filter, opacity: cs.opacity, chips: document.querySelectorAll('[data-bw="chip"]').length, zoom: getComputedStyle(document.querySelector('[data-bw="zoom"]')!).display, bars: l.querySelectorAll('[data-bw="bar"]').length, ids: [...l.querySelectorAll<HTMLElement>('[data-bw="row"]')].map((e) => e.dataset.id).slice(0, 8) }; });
    L.check("BW-11", "no queries: \"No queries out yet\" over the sample, blurred 3px at 55%", none.shown && /No queries out yet/.test(none.text) && look.filter === "blur(3px)" && look.opacity === "0.55" && look.bars > 0, JSON.stringify({ text: none.text, ...look }));
    L.check("BW-11", "no queries: no pills and no zoom controls", look.chips === 0 && look.zoom === "none", JSON.stringify(look));
    const z0 = (await root(page)).z;
    await page.mouse.move(200, 500); await page.keyboard.down("Control"); await page.mouse.wheel(0, -200); await page.keyboard.up("Control"); await frame(page);
    L.check("BW-11", "no queries: no gestures (Ctrl+wheel leaves it where it was)", (await root(page)).z === z0, "");
    await shot("09-new-writer");
    if (process.env.BW_SHOTS) for (const n of ["09-new-writer", "10-only-closed", "11-nothing-with-you"]) copyFileSync(`design-refs/phone-birds-eye-world-v2/shots/${n}.png`, `${out}/${n}-ref.png`);
    L.done(8);
  });
}
