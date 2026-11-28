/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v3, phase 4 — THE LOCKS, measured on the rendered page (design-refs/phone-birds-eye-world-v3).
 * 390 × 784 at 2× (the ref's screen); 740 × 360 for landscape (844 × 390 is the desktop here).
 *
 * v3 zooms by LEVELS (All / Months / Weeks): pinch and Ctrl+wheel snap to the nearest, so the locks zoom with the level
 * control. v2's BW-3 (a short pill's closer opening, FZ) and BW-16 (Ctrl+wheel and pinch anchoring) are retired: v3
 * keeps a pill fitted (BW-19) and every zoom ends on a level.
 *
 *   kept from v2: BW-1 fitted is bars only · BW-4 stages on their dates at Weeks · BW-5 no name under an "!" ·
 *   BW-6 ruler marks clear of each other and the pills · BW-7 no gap, earlier stages faded · BW-8 gone quiet at the
 *   setting · BW-9 the pills add up · BW-10 seventy queries · BW-11 empty states · BW-12 replay (ending on the recap) ·
 *   BW-13 copy and console · BW-14 layers · BW-15 the line off screen · BW-17 reduced motion · BW-18 landscape
 *   v3: BW-19 a pill stays fitted · BW-20 folded headings never touch · BW-21 calm zoom (no edge chips, no figures,
 *   gridlines at Weeks only) · BW-22 the levels land · BW-23 long press: menu or scrubber · BW-24 search flies ·
 *   BW-25 the hawk's news · BW-26 no reply date yet · BW-27 pull to refresh
 *
 * RED FIRST: `BW_MUTATE=all` runs the green pass, then each lock under its own mutation, and each must turn its own lock
 * red. Ledgers go to reports/phone-birds-eye-world-v3/ledger/. `BW_SHOTS=1` writes the build's shots for the ref's 01–20.
 * ⚠️ BW-8, BW-26 and the empty states WRITE TO THE EMULATOR: BW-8 puts the setting back; BW-26's saved date stays for
 *    the rest of that run (it runs last in the locks); the empty states run last of all, in their own test. Every
 *    e2e:emu run imports a fresh snapshot and exports nothing.
 *
 * Run (through the slot): npm run e2e:emu -- tests/e2e/phoneBirdsWorld.measure.ts --project pixel
 */
import { expect, test, type Page } from "@playwright/test";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { statusBand } from "../../src/lib/stageColours";

const DIR = "reports/phone-birds-eye-world-v3";
const PHONE = { width: 390, height: 784 } as const;
const LAND = { width: 740, height: 360 } as const;
const WORLD = "/queries/all?view=birds";
const EMU = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
const HARNESS = JSON.parse(readFileSync("tests/emulator-seed/harness.json", "utf8")) as { docs: Record<string, Record<string, unknown>> };
const UID = Object.keys(HARNESS.docs).find((k) => /^users\/[^/]+$/.test(k))!.split("/")[1];

const MUTS = ["fitted", "dates", "names", "days", "cont", "quiet", "counts", "seventy", "copy", "layers", "offline", "calm", "land", "replay",
  "pillfit", "heads", "calmzoom", "levels", "press", "search", "news", "nodate", "pull", "empty",
  "reopen", "titles", "passed", "sendby",
  "groups", "pillhead", "order", "switch", "cutoff",
  "solidquiet", "quietfirst", "chipgone"] as const;
type Mut = (typeof MUTS)[number] | "";
const MUT_LOCK: Record<Exclude<Mut, "">, string> = {
  fitted: "BW-1", dates: "BW-4", names: "BW-5", days: "BW-6", cont: "BW-7", quiet: "BW-8", counts: "BW-9", seventy: "BW-10", empty: "BW-11",
  replay: "BW-12", copy: "BW-13", layers: "BW-14", offline: "BW-15", calm: "BW-17", land: "BW-18",
  pillfit: "BW-19", heads: "BW-20", calmzoom: "BW-21", levels: "BW-22", press: "BW-23", search: "BW-24", news: "BW-25", nodate: "BW-26", pull: "BW-27",
  reopen: "BW-28", titles: "BW-29", passed: "BW-30", sendby: "BW-31",
  groups: "BW-32", pillhead: "BW-33", order: "BW-34", switch: "BW-35", cutoff: "BW-36",
  solidquiet: "BW-37", quietfirst: "BW-38", chipgone: "BW-39",
};
const CSS_MUT: Partial<Record<Exclude<Mut, "">, string>> = {
  dates: '.bw-bar[data-k="stage"] { margin-left: 6px !important; }',
  /* the names pulled 30px left, back over the "!" they are set clear of */
  names: ".bw-inm { margin-left: -30px !important; }",
  /* each ruler mark 140px wider, so neighbours (about 120px apart at Weeks) run into each other */
  days: '.bw-rm { padding-right: 140px !important; }',
  cont: '.bw-bar[data-k="stage"][data-cont="1"] { margin-left: -4px !important; }',
  quiet: '.bw-bar[data-k="quiet"] { margin-left: 30px !important; }',
  seventy: ".bw-vp { right: 120px !important; }",
  empty: ".bw-card { display: none !important; }",
  layers: ".bw-hsw { z-index: 3 !important; }",
  offline: ".bw .bw-flab.off { background: var(--pa-navy) !important; color: #fff !important; border: 0 !important; }",
  calm: ".bw-hsw { animation: bw-hsdrift 14s ease-in-out infinite alternate !important; }",
  land: "body.pa41-land .pa4-tb { display: flex !important; }",
  /* BW-20: every other heading pulled 30px up into the one above */
  heads: ".bw-gh0:nth-of-type(2n) { margin-top: -30px !important; }",
  /* BW-23: bars that the finger can no longer find, so a hold on a bar scrubs */
  press: ".bw-bar { pointer-events: none !important; }",
  /* BW-24: the glow hidden */
  search: ".bw-glw { display: none !important; }",
  /* BW-25: the badge's count hidden */
  news: ".bw-bedot { display: none !important; }",
  /* BW-27: the pull's pill never shows */
  pull: ".bw-ptr { display: none !important; }",
  /* BW-30: the "already passed" line hidden */
  passed: ".bw-ndp { display: none !important; }",
  /* BW-31: "Add send-by date" gone from the menu */
  sendby: '[data-bw="menu-act"][data-act="sendby"] { display: none !important; }',
  /* BW-35: the chip gone, so the switch at rest shows no button */
  switch: ".bw-zc.lvl .bw-lvchip { display: none !important; }",
  /* BW-37: gone quiet back to a solid fill */
  solidquiet: '.bw-bar[data-k="quiet"] { background: #ead9bd !important; -webkit-mask-image: none !important; mask-image: none !important; }',
  /* BW-39: the chip hidden while the switch is open */
  chipgone: ".bw-zc.lvl.open .bw-lvchip { display: none !important; }",
  /* BW-36: the switch placed the old way's worst case, under the dock */
  cutoff: ".bw .bw-zc { bottom: 8px !important; }",
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public mut: Mut, public part: string) {}
  check(lock: string, where: string, ok: boolean, detail = "") { this.rows.push({ lock, where, ok: !!ok, detail: String(detail).slice(0, 600) }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.part}${this.mut ? `.mut-${this.mut}` : ""}.json`, JSON.stringify(this.rows, null, 1));
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
interface Root { n: number; z: number; rp: number; off: number; ox: number; oy: number; sx: number; d0: number; d1: number; ppd: number; top: number; lx: number; maxz: number; zoomed: boolean; replay: string; filter: string; card: string; level: string; levels: string; refreshes: number; news: number; step: number; recap: string; flown: string }
const root = (page: Page): Promise<Root> => page.evaluate(() => {
  const r = document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset;
  return { n: +r.n!, z: +r.z!, rp: +r.rp!, off: +r.off!, ox: +r.ox!, oy: +r.oy!, sx: +r.sx!, d0: +r.d0!, d1: +r.d1!, ppd: +r.ppd!, top: +r.top!, lx: +r.lx!, maxz: +r.maxz!, zoomed: r.zoomed === "1", replay: r.replay!, filter: r.filter!, card: r.card ?? "", level: r.level ?? "", levels: r.levels ?? "", refreshes: +(r.refreshes ?? 0), news: +(r.news ?? 0), step: +(r.step ?? -1), recap: r.recap ?? "", flown: r.flown ?? "" };
});
type Box = { l: number; r: number; t: number; b: number; w: number; h: number; d: Record<string, string>; text: string };
const box = (page: Page, sel: string): Promise<Box[]> => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getClientRects().length).map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height, d: { ...e.dataset } as Record<string, string>, text: e.textContent ?? "" }; }), sel);
const frame = (page: Page, ms = 450) => page.waitForTimeout(ms);
const offPE = (page: Page) => page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler, .bw-inm, .bw-ovd { pointer-events: none !important; }" });
/** a level by its button (v3 snaps every zoom to a level) */
async function level(page: Page, t: "All" | "Months" | "Weeks") {
  /* v3.2: the switch rests as one chip; open it first */
  const chip = page.locator('[data-bw="level-chip"]');
  if ((await chip.count()) && (await chip.getAttribute("aria-expanded")) !== "true") { await chip.click({ timeout: 3000 }).catch(() => {}); await frame(page, 250); }
  const b = page.locator(`[data-bw="level"][data-t="${t}"]`);
  if (!(await b.count())) return false;
  await b.click({ timeout: 3000 }).catch(() => {}); await frame(page, 700);
  return true;
}
const fitted = (page: Page) => level(page, "All");
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
/* Birds-eye polish v1: the pill row is retired. A "pill" is the filter menu's pick; picking the filter that is on shows
   All again, as a second tap on its pill did. The counts are the menu's rows, read with it open, then closed by its veil. */
async function pill(page: Page, k: string) {
  const cur = await page.locator('[data-bw="filter"]').getAttribute("data-f").catch(() => "all");
  await page.locator('[data-bw="filter"]').click({ timeout: 3000 }); await frame(page, 250);
  await page.locator(`[data-bw="fpick"][data-k="${cur === k ? "all" : k}"]`).click({ timeout: 3000 }); await frame(page, 700);
}
async function chipBoxes(page: Page, before?: (p: Page) => Promise<void>): Promise<Box[]> {
  await page.locator('[data-bw="filter"]').click({ timeout: 3000 }); await frame(page, 250);
  if (before) await before(page);
  const b = await box(page, '[data-bw="fpick"]');
  await page.locator('[data-bw="fmenu-veil"]').click({ position: { x: 20, y: 400 }, timeout: 3000 }).catch(() => {}); await frame(page, 250);
  return b;
}
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
  await page.evaluate(() => { try { localStorage.removeItem("bw1.hint.seen"); localStorage.removeItem("bw3.folded"); localStorage.removeItem("bw3.lastOpened"); } catch { /* */ } });
}
/** a hold of `ms` at (x, y), then up */
async function hold(page: Page, x: number, y: number, ms = 520, moveTo?: number) {
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(ms);
  if (moveTo != null) { for (let i = 1; i <= 6; i++) { await page.mouse.move(x + ((moveTo - x) * i) / 6, y); await page.waitForTimeout(30); } }
}
/** "last opened" N ms ago, as of the next load: the world records a visit when the page goes, so it is set before the app runs */
async function seenAgo(page: Page, ago: number | null) {
  await page.addInitScript(() => { try { const v = sessionStorage.getItem("bwT.seen"); if (v != null) { sessionStorage.removeItem("bwT.seen"); if (v === "") localStorage.removeItem("bw3.lastOpened"); else localStorage.setItem("bw3.lastOpened", v); } } catch { /* */ } });
  await page.evaluate((v) => { try { sessionStorage.setItem("bwT.seen", v); } catch { /* */ } }, ago == null ? "" : String(Date.now() - ago));
}
async function emuPatch(path: string, fields: Record<string, unknown>, mask: string[]) {
  const q = mask.map((m) => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join("&");
  /* three tries: after an hour of runs the emulator can answer a write with 500 UNKNOWN once */
  for (let i = 0; ; i++) {
    const r = await fetch(`${EMU}/${path}?${q}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields }), signal: AbortSignal.timeout(60_000) });
    if (r.ok) return;
    if (i >= 2) throw new Error(`PATCH ${path}: ${r.status} ${await r.text()}`);
    await new Promise((res) => setTimeout(res, 1500));
  }
}
const setQuietWeeks = (w: number | null) => w == null
  ? emuPatch(`users/${UID}`, {}, ["workspacePrefs.clock.quietWeeks"])
  : emuPatch(`users/${UID}`, { workspacePrefs: { mapValue: { fields: { clock: { mapValue: { fields: { quietWeeks: { integerValue: String(w) } } } } } } } }, ["workspacePrefs.clock.quietWeeks"]);
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
const dayX = (r: Root, day: number) => r.ox + (Math.max(r.d0, Math.min(r.d1, day)) - r.d0) * r.ppd * r.sx;
const lvlZ = (r: Root, t: string) => Number((r.levels.split(",").find((x) => x.startsWith(`${t}:`)) ?? ":NaN").split(":")[1]);

test.use({ viewport: PHONE, deviceScaleFactor: 2 });
/* Phone Birds-eye first look v1: the day's first open of Birds-eye plays a two-second grow-in that holds the world's
   frame; these readings are of the world at rest, so today's first look is marked as already seen (the app's own
   day stamp, lib/phoneV41 `dayStamp`). The grow-in's own locks are phoneBirdsFirstLook.measure.ts. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { const d = new Date(); localStorage.setItem("bw1.firstLook.day", `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`); } catch { /* */ } });
});
/** BW_ONLY=BW-23,BW-24 runs just those sections (debugging only; the floor then fails by design) */
const ONLY = (process.env.BW_ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const on = (lock: string) => !ONLY.length || ONLY.includes(lock);
const want = (process.env.BW_MUTATE ?? "").split(",").map((s) => s.trim());
const runs: Mut[] = process.env.BW_MUTATE === "all" ? ["", ...MUTS.filter((m) => m !== "empty")] : process.env.BW_MUTATE ? (want.filter((m) => m !== "empty") as Mut[]) : [""];
const emptyRuns: Mut[] = process.env.BW_MUTATE === "all" || want.includes("empty") ? ["empty"] : [""];

for (const mut of runs) {
  test(`Phone Birds-eye world v3 — the locks${mut ? ` · mutation ${mut}` : ""}`, async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "Chromium phone only");
    test.setTimeout(900_000);
    const L = new Ledger(mut, "locks");
    page.setDefaultTimeout(20_000);
    const T0 = Date.now(), stamp = (t: string) => console.log(`  ⏱ ${t} at ${((Date.now() - T0) / 1000).toFixed(0)}s`);
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    const errs: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(`console: ${m.text().slice(0, 400)}`); });
    page.on("pageerror", (e) => errs.push(`pageerror: ${String(e).slice(0, 400)} ${(e.stack ?? "").slice(0, 300)}`));
    await signIn(page);
    await openWorld(page);
    if (mut !== "seventy") await mutate(page, mut);

    /* ── BW-1 · fitted is bars only ── */
    if (on("BW-1")) { stamp("BW-1");
      if (mut === "fitted") await page.evaluate(() => { const l = document.querySelector('[data-bw="layer"]')!; const s = document.createElement("span"); s.className = "bw-inm"; s.dataset.bw = "name"; s.textContent = "A name"; s.style.cssText = "left:40px;top:300px"; l.appendChild(s); });
      const r = await root(page);
      const n = (sel: string) => page.locator(`[data-bw="layer"] ${sel}`).count();
      const [names, figs, grids, bars] = await Promise.all([n('[data-bw="name"]'), n('[data-bw="fig"]'), n('[data-bw="grid"]'), n('[data-bw="bar"]')]);
      L.check("BW-1", `fitted (z ${r.z}, rows ${r.rp.toFixed(1)}px): bars drawn (population ${bars})`, !r.zoomed && bars > 0, "");
      L.check("BW-1", "fitted: no names, no figures, no gridlines", names + figs + grids === 0, JSON.stringify({ names, figs, grids }));
      L.check("BW-1", "fitted: the pill reads Today, the header is the slim one row (96px, polish v1)", (await box(page, '[data-bw="pill"]'))[0]?.text.trim() === "Today" && (await box(page, '[data-bw="head"]'))[0]?.h === 96, "");
    }

    /* ── BW-32 · under All the headings are exactly Needs action, Within their window, No reply date yet, Closed (those
          present), never "Nearly there" or "Plenty of time" ── */
    const headText = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bw="group"] .ghu')].map((g) => [...g.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim()));
    if (on("BW-32")) { stamp("BW-32");
      await fitted(page);
      if (mut === "groups") await page.evaluate(() => { const g = document.querySelectorAll<HTMLElement>('[data-bw="group"] .ghu')[1]; const t = g && [...g.childNodes].find((n) => n.nodeType === 3); if (t) t.textContent = "Nearly there"; });
      const heads = await headText();
      const want = ["Needs action", "Within their window", "No reply date yet", "Closed"];
      L.check("BW-32", `under All the headings read ${heads.join(" · ")}`, heads.length >= 3 && heads.join("|") === want.filter((t) => heads.includes(t)).join("|") && heads.every((h) => want.includes(h)), JSON.stringify(heads));
      L.check("BW-32", "no heading reads Nearly there or Plenty of time", !heads.some((h) => /Nearly there|Plenty of time/.test(h)), JSON.stringify(heads));
    }

    /* ── BW-33 · the heading follows the pill: With you → "With you", Needs chasing → "Needs chasing"; the pills add up ── */
    if (on("BW-33")) { stamp("BW-33");
      const got: Record<string, string[]> = {};
      for (const k of ["you", "chase"]) {
        await pill(page, k);
        if (mut === "pillhead") await page.evaluate(() => { const g = document.querySelector<HTMLElement>('[data-bw="group"] .ghu'); const t = g && [...g.childNodes].find((n) => n.nodeType === 3); if (t) t.textContent = "Needs action"; });
        got[k] = await headText();
        await pill(page, k);
      }
      L.check("BW-33", "under With you the one group is headed \"With you\"", got.you.join("|") === "With you", JSON.stringify(got.you));
      L.check("BW-33", "under Needs chasing the one group is headed \"Needs chasing\"", got.chase.join("|") === "Needs chasing", JSON.stringify(got.chase));
      const chips = await chipBoxes(page);
      const n = Object.fromEntries(chips.map((c) => [c.d.k, Number(c.d.n)]));
      L.check("BW-33", `the pills: All ${n.all} = With you ${n.you} + Needs chasing ${n.chase} + Waiting ${n.wait}`, n.all > 0 && n.all === n.you + n.chase + n.wait && chips.map((c) => c.text.replace(/\s*\d+\s*$/, "").trim()).join("|") === "All|With you|Needs chasing|Waiting", JSON.stringify(n));
    }

    /* ── BW-34 · Needs action holds every chasing and every with-you query, ordered by share of window used, most first ── */
    if (on("BW-34") || on("BW-38")) { stamp("BW-34/38");
      await fitted(page);
      if (mut === "order") await page.evaluate(() => { const g = [...document.querySelectorAll<HTMLElement>('[data-bw="row"]')].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top); const [a, b] = [g[0], g[3]]; if (a && b) { const t = a.style.top; a.style.top = b.style.top; b.style.top = t; } });
      const r = await page.evaluate(() => {
        const heads = [...document.querySelectorAll<HTMLElement>('[data-bw="group"]')].map((g) => ({ g: g.dataset.g!, n: Number(g.dataset.n), top: g.getBoundingClientRect().top })).sort((a, b) => a.top - b.top);
        const i = heads.findIndex((h) => h.g === "Needs action"), lo = heads[i]?.top ?? 0, hi = heads[i + 1]?.top ?? Infinity;
        /* gone quiet: more than the setting's days past its date (the world publishes the setting); a tail that went quiet a
           day ago is too thin to draw at the fitted view, so it is read from the dates, not the bars */
        const qd = Number(document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset.quietdays);
        const rows = [...document.querySelectorAll<HTMLElement>('[data-bw="row"]')].map((h) => ({ id: h.dataset.id!, top: h.getBoundingClientRect().top, quiet: h.dataset.you !== "1" && h.dataset.dueday !== "" && Number(h.dataset.dueday) < 0 && -Number(h.dataset.dueday) > qd, /* Phone query sheet v1 §A: agents only */ you: h.dataset.you === "1", past: h.dataset.past === "1", closed: h.dataset.closed === "1", start: Number(h.dataset.start), due: h.dataset.dueday === "" ? null : Number(h.dataset.dueday) }))
          .filter((x) => x.top > lo && x.top < hi).sort((a, b) => a.top - b.top);
        return { n: heads[i]?.n ?? 0, rows };
      });
      const chips = Object.fromEntries((await chipBoxes(page)).map((c) => [c.d.k, Number(c.d.n)]));
      const share = (x: { start: number; due: number | null }) => (x.due == null ? -x.start / 60 : -x.start / Math.max(7, x.due - x.start));
      /* v3.3: gone-quiet rows last; within each part, most of the window used first */
      const bad = r.rows.slice(1).map((x, i) => ({ a: r.rows[i], b: x })).filter(({ a, b }) => a.quiet === b.quiet && share(b) > share(a) + 1e-9);
      const mixed = r.rows.some((x, i) => i > 0 && x.you !== r.rows[i - 1].you);
      L.check("BW-34", `Needs action holds every with-you (${chips.you}) and chasing (${chips.chase}) query: ${r.rows.length} rows`, r.rows.length === chips.you + chips.chase && r.n === r.rows.length && r.rows.every((x) => x.you || x.past), JSON.stringify({ n: r.n, rows: r.rows.length }));
      L.check("BW-34", "ordered by share of window used, most first, within the not-quiet and the gone-quiet parts (with-you and chasing mixed)", bad.length === 0 && mixed, JSON.stringify(bad.slice(0, 3).map(({ a, b }) => [a.id, share(a).toFixed(3), b.id, share(b).toFixed(3)])));
      /* ── BW-38 · in Needs action, every gone-quiet row sits below every other row ── */
      if (on("BW-38")) {
        const rows = r.rows.slice();
        if (mut === "quietfirst") { const qi = rows.findIndex((x) => x.quiet); if (qi > 0) { const [q] = rows.splice(qi, 1); rows.unshift(q); } }
        const quiet = rows.filter((x) => x.quiet), other = rows.filter((x) => !x.quiet);
        const firstQuiet = rows.findIndex((x) => x.quiet), lastOther = rows.map((x) => x.quiet).lastIndexOf(false);
        L.check("BW-38", `gone-quiet rows (population ${quiet.length}) all below the others (${other.length})`, quiet.length > 0 && other.length > 0 && firstQuiet > lastOther, JSON.stringify({ firstQuiet, lastOther }));
      }
    }

    /* ── BW-35 · the switch: one button at rest; tap it, three; pick one, it snaps and folds; a tap on the world folds it
          with no level change ── */
    if (on("BW-35")) { stamp("BW-35");
      await fitted(page);
      const sw = () => page.evaluate(() => { const c = document.querySelector<HTMLElement>('[data-bw="levels"]')!; const bs = [...c.querySelectorAll<HTMLElement>("button")].filter((b) => b.getClientRects().length && getComputedStyle(b).display !== "none"); return { n: bs.length, texts: bs.map((b) => b.textContent?.trim()), chip: c.querySelector<HTMLElement>('[data-bw="level-chip"]')?.getAttribute("aria-label") ?? null, expanded: c.querySelector<HTMLElement>('[data-bw="level-chip"]')?.getAttribute("aria-expanded") ?? null, pressed: bs.map((b) => b.getAttribute("aria-pressed")), h: bs[0]?.getBoundingClientRect().height ?? 0, bg: bs[0] ? getComputedStyle(bs[0]).backgroundColor : "" }; });
      const rest = await sw();
      L.check("BW-35", `at rest one button, "${rest.chip}", aria-expanded false, 40px, navy`, rest.n === 1 && rest.chip === "Zoom level: All" && rest.expanded === "false" && Math.abs(rest.h - 40) < 0.5 && rest.bg === "rgb(42, 58, 82)", JSON.stringify(rest));
      await page.locator('[data-bw="level-chip"]').click({ timeout: 3000 }).catch(() => {}); await frame(page, 300);
      const open = await sw();
      L.check("BW-35", "tapped, three levels (Weeks, Months, All, the current pressed) above the chip (v3.3)", open.n === 4 && open.texts.join("|") === "Weeks|Months|All|All" && open.pressed.join("|") === "false|false|true|", JSON.stringify(open));
      await page.locator('[data-bw="level"][data-t="Months"]').click({ timeout: 3000 }).catch(() => {}); await frame(page, 700);
      const picked = await sw(), rp = await root(page);
      L.check("BW-35", "picking Months snaps there and folds to one chip reading Months", rp.level === "Months" && picked.n === 1 && picked.chip === "Zoom level: Months", JSON.stringify({ level: rp.level, ...picked }));
      await page.locator('[data-bw="level-chip"]').click({ timeout: 3000 }).catch(() => {}); await frame(page, 300);
      const z0 = (await root(page)).z;
      await offPE(page); await page.mouse.click(120, 420); await frame(page, 500);
      const tapped = await sw(), z1 = (await root(page)).z, sheet = await page.locator('[data-bw="sheet"]').count();
      L.check("BW-35", "a tap on the world folds it, with no level change (and opens nothing)", tapped.n === 1 && Math.abs(z1 - z0) < 1e-6 && sheet === 0, JSON.stringify({ ...tapped, z0, z1, sheet }));
      /* when the switch was not open (a broken run), that tap opened a row's sheet: close it so later sections can run */
      if (sheet) { await page.locator('[data-bw="veil"]').click({ position: { x: 10, y: 10 }, timeout: 2000 }).catch(() => {}); await frame(page, 300); }
      await fitted(page);
    }

    /* ── BW-39 · open, the chip stays: in the DOM, visible, aria-expanded true, directly below the three levels; closing
          sets it false ── */
    if (on("BW-39")) { stamp("BW-39");
      await fitted(page);
      const read = () => page.evaluate(() => {
        const c = document.querySelector<HTMLElement>('[data-bw="level-chip"]'), cr = c?.getBoundingClientRect();
        const lv = [...document.querySelectorAll<HTMLElement>('[data-bw="level"]')].map((b) => b.getBoundingClientRect());
        const vis = !!c && !!cr && cr.height > 0 && getComputedStyle(c).display !== "none" && getComputedStyle(c).visibility !== "hidden";
        const at = cr ? document.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2) : null;
        return { inDom: !!c, vis, top: !!c && !!at && (at === c || c.contains(at)), expanded: c?.getAttribute("aria-expanded") ?? null, label: c?.getAttribute("aria-label") ?? null, levels: lv.length, gap: cr && lv.length ? cr.top - Math.max(...lv.map((r) => r.bottom)) : null, under: cr && lv.length ? lv.every((r) => r.bottom <= cr.top + 0.5) : false, rot: c ? getComputedStyle(c.querySelector("svg")!).transform : "" };
      });
      await page.locator('[data-bw="level-chip"]').click({ timeout: 3000 }).catch(() => {}); await frame(page, 400);
      if (mut === "chipgone") await mutate(page, "chipgone");
      const open = await read();
      L.check("BW-39", `open: the chip is in the DOM, visible and uncovered, aria-expanded true, ${open.label}`, open.inDom && open.vis && open.top && open.expanded === "true" && open.label === "Zoom level: All", JSON.stringify(open));
      L.check("BW-39", `open: directly below the three levels (gap ${open.gap?.toFixed(1)}px), its chevron turned down`, open.levels === 3 && open.under && open.gap != null && open.gap >= 0 && open.gap <= 1.5 && open.rot !== "none", JSON.stringify(open));
      await page.locator('[data-bw="level-chip"]').click({ timeout: 3000 }).catch(() => {}); await frame(page, 300);
      const shut = await read();
      L.check("BW-39", "tapping the chip again closes it: aria-expanded false, no levels", shut.expanded === "false" && shut.levels === 0 && shut.vis, JSON.stringify(shut));
    }

    /* ── BW-37 · a gone-quiet bar has no solid stretch between its "!" and today: every pixel column there is hatched or
          faded, and the fade is 10% or less at today (read from a screenshot at Months: at Weeks no bar has its "!" and a
          long quiet stretch on screen at once) ── */
    if (on("BW-37")) { stamp("BW-37");
      await level(page, "Months"); await lineTo(page, 0.9);
      /* gridlines, names, the hawk and the edge fades are not what is measured: held out of the picture */
      await page.addStyleTag({ content: '[data-bw="grid"], .bw-inm, .bw-hsw, .bw-efd, .bw-glw { visibility: hidden !important; }' });
      const find = () => page.evaluate(() => {
        const lxs = document.querySelector<HTMLElement>('[data-bw="world"]')?.dataset.lx, lx = lxs ? Number(lxs) : null;
        for (const q of document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="quiet"]')) {
          const qr = q.getBoundingClientRect(), id = q.dataset.row!;
          const marks = [...document.querySelectorAll<HTMLElement>('[data-bw="mark"]')].map((m) => m.getBoundingClientRect()).filter((m) => m.top < qr.bottom && m.bottom > qr.top);
          const bars = [...document.querySelectorAll<HTMLElement>(`[data-bw="bar"][data-row="${CSS.escape(id)}"]`)].filter((b) => b.dataset.k === "past" || b.dataset.k === "quiet").map((b) => b.getBoundingClientRect());
          const m = marks[0];
          if (!m || lx == null || qr.top < 150 || qr.bottom > innerHeight - 140) continue;
          if (m.left < 4 || qr.right < lx - 3 || qr.right - Math.max(qr.left, 0) < 120) continue;
          return { id, lx, x0: Math.ceil(m.right + 2), x1: Math.floor(lx - 5), y0: Math.ceil(qr.top + 3), y1: Math.floor(qr.bottom - 3), qx: qr.left, bars: bars.map((b) => [b.left, b.right]) };
        }
        return null;
      });
      let t = await find();
      for (let i = 0; i < 25 && !t; i++) { await pan(page, 0, -300); await page.addStyleTag({ content: '[data-bw="grid"], .bw-inm, .bw-hsw, .bw-efd, .bw-glw { visibility: hidden !important; }' }); t = await find(); }
      L.check("BW-37", `a gone-quiet bar with its "!" and today on screen (population: ${t ? t.id : "none"})`, !!t, "");
      if (t) {
        if (mut === "solidquiet") await mutate(page, "solidquiet");
        await frame(page, 200);
        const png = await page.screenshot({ clip: { x: t.x0, y: t.y0, width: t.x1 - t.x0, height: t.y1 - t.y0 } });
        const cols = await page.evaluate(async (b64) => {
          const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
          const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d")!; g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data, out: { range: number; dev: number }[] = [];
          for (let x = 0; x < c.width; x++) { let mn = 255, mx = 0, sum = 0; for (let y = 0; y < c.height; y++) { const i = (y * c.width + x) * 4, l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; mn = Math.min(mn, l); mx = Math.max(mx, l); sum += 255 - l; } out.push({ range: mx - mn, dev: sum / c.height }); }
          return out;
        }, png.toString("base64"));
        /* solid: a column with no stripe in it (range under 6) that is still coloured (more than 12 off white) */
        const solid = cols.map((c, i) => ({ i, ...c })).filter((c) => c.range < 6 && c.dev > 12);
        /* the fade: the mask is linear, so fit a line to the quiet stretch's second half (averaging over the stripes) and read
           it at today's x; compare with the hatching in full where the quiet stretch starts (its first two stripe periods) */
        const sc = cols.length / (t.x1 - t.x0), qs = Math.max(0, Math.round((Math.max(t.qx, t.x0) - t.x0) * sc));
        const ref = cols.slice(qs, qs + Math.round(20 * sc)), full = ref.reduce((a, c) => a + c.dev, 0) / Math.max(1, ref.length);
        const fit = cols.map((c, i) => [i, c.dev] as const).slice(Math.round(qs + (cols.length - qs) / 2));
        const n = fit.length, mx = fit.reduce((a, [x]) => a + x, 0) / n, my = fit.reduce((a, [, y]) => a + y, 0) / n;
        const slope = fit.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0) / Math.max(1e-9, fit.reduce((a, [x]) => a + (x - mx) ** 2, 0));
        const end = my + slope * ((t.lx - t.x0) * sc - mx);
        L.check("BW-37", `every pixel column from the "!" to today is hatched or faded: ${cols.length} columns, ${solid.length} solid`, cols.length > 100 && solid.length === 0, JSON.stringify(solid.slice(0, 5)));
        L.check("BW-37", `the fade, read at today's x, is 10% or less of the full hatching (${(100 * end / full).toFixed(1)}%)`, full > 8 && end / full <= 0.1, JSON.stringify({ full: full.toFixed(1), end: end.toFixed(1), slope: slope.toFixed(4) }));
      }
      await openWorld(page); await mutate(page, mut === "solidquiet" ? "" : mut);
    }

    /* ── BW-9 · the pills add up ── */
    if (on("BW-9")) { stamp("BW-9");
      const chips = await chipBoxes(page, mut === "counts" ? (p) => p.evaluate(() => { const c = document.querySelector<HTMLElement>('[data-bw="fpick"][data-k="wait"]')!; c.dataset.n = String(+c.dataset.n! + 1); c.querySelector("b")!.textContent = c.dataset.n!; }).then(() => {}) : undefined);
      const n = Object.fromEntries(chips.map((c) => [c.d.k, Number(/(\d+)\s*$/.exec(c.text.trim())?.[1])]));
      L.check("BW-9", `All ${n.all} = With you ${n.you} + Needs chasing ${n.chase} + Waiting ${n.wait}`, n.all > 0 && n.all === n.you + n.chase + n.wait, JSON.stringify(n));
    }

    /* ── BW-10 · seventy queries (the harness's campaign) ── */
    if (on("BW-10")) { stamp("BW-10");
      if (mut === "seventy") { await mutate(page, "seventy"); await page.setViewportSize({ width: PHONE.width, height: PHONE.height - 1 }); await frame(page, 500); await page.setViewportSize(PHONE); await frame(page, 700); }
      const r = await root(page);
      const all = Number((await chipBoxes(page)).find((c) => c.d.k === "all")?.d.n);
      L.check("BW-10", `fitted with ${all} open queries: time spans at least 90% of the width`, all >= 60 && 600 * r.sx >= 0.9 * PHONE.width, `${(600 * r.sx).toFixed(1)}px`);
      await level(page, "Weeks");
      const r2 = await root(page);
      L.check("BW-10", "48px rows are reachable (the Weeks level)", Math.abs(r2.rp - 48) < 0.05, `rows ${r2.rp} at z ${r2.z}`);
      await fitted(page);
    }

    /* ── BW-19 · a filter pill leaves the view fitted (z = 1) ── */
    if (on("BW-19")) { stamp("BW-19");
      for (const k of ["you", "chase", "wait"]) {
        await pill(page, k);
        if (mut === "pillfit") await level(page, "Months");
        const r = await root(page);
        L.check("BW-19", `${k}: the view stays fitted (z ${r.z})`, Math.abs(r.z - 1) < 1e-3 && !r.zoomed, "");
        await fitted(page);
        await pill(page, k);
      }
    }

    /* ── BW-20 · with every group folded on the fitted view, no two headings overlap; each gap at least 12px ── */
    if (on("BW-20")) { stamp("BW-20");
      const titles = (await box(page, '[data-bw="group"]')).map((g) => g.d.g);
      for (const t of titles) { await page.locator(`[data-bw="fold"][data-g="${t}"]`).click({ timeout: 3000 }).catch(() => {}); await frame(page, 300); }
      const heads = (await box(page, '[data-bw="group"]')).sort((a, b) => a.t - b.t);
      const folded = heads.filter((h) => h.d.folded === "1").length;
      const bad: string[] = [];
      for (let i = 1; i < heads.length; i++) { const gap = heads[i].t - heads[i - 1].b; if (gap < 12 - 0.5) bad.push(`${heads[i - 1].d.t}→${heads[i].d.t} ${gap.toFixed(1)}px`); }
      L.check("BW-20", `all ${titles.length} groups folded (population ${folded})`, folded === titles.length && titles.length >= 4, "");
      L.check("BW-20", "no two headings overlap, and each gap is at least 12px", bad.length === 0, bad.join(", "));
      for (const t of titles) { await page.locator(`[data-bw="fold"][data-g="${t}"]`).click({ timeout: 3000 }).catch(() => {}); await frame(page, 200); }
      await openWorld(page); await mutate(page, mut === "heads" ? "" : mut);
    }

    /* ── BW-22 · the level control lands on 120 days across (Months) and on the Weeks rule ── */
    if (on("BW-22")) { stamp("BW-22");
      const r0 = await root(page);
      await page.locator('[data-bw="level-chip"]').click({ timeout: 3000 }).catch(() => {}); await frame(page, 300);
      const tags = (await box(page, '[data-bw="level"]')).map((b) => b.d.t);
      L.check("BW-22", `the level control, open, reads ${tags.join(" / ")} (Weeks on top)`, tags.join("|") === "Weeks|Months|All", "");
      await page.locator('[data-bw="level"][data-t="All"]').click({ timeout: 3000 }).catch(() => {}); await frame(page, 300);
      await level(page, "Months");
      if (mut === "levels") { await page.mouse.move(200, 430); await page.mouse.wheel(-300, 0); await frame(page, 300); await page.evaluate(() => { const r = document.querySelector<HTMLElement>('[data-bw="world"]')!; r.dataset.z = String(+r.dataset.z! * 1.2); r.dataset.sx = String(+r.dataset.sx! * 1.15); }); }
      const m = await root(page);
      const across = (PHONE.width - 32) / (m.ppd * m.sx);
      L.check("BW-22", `Months: ${across.toFixed(1)} days across (120)`, Math.abs(across - 120) < 1.5 && m.level === "Months", `z ${m.z} vs ${lvlZ(r0, "Months")}`);
      await level(page, "Weeks");
      const w = await root(page);
      const acrossW = (PHONE.width - 32) / (w.ppd * w.sx);
      L.check("BW-22", `Weeks: the closer of 42 days across and 48px rows ×1.02 (${acrossW.toFixed(1)} days, rows ${w.rp}px)`, Math.abs(w.z - lvlZ(w, "Weeks")) < 1e-2 && acrossW <= 42.5 && w.rp >= 47.9, "");
      const a = await level(page, "All"), f = await root(page);
      L.check("BW-22", "All: fitted (z = 1)", a && Math.abs(f.z - 1) < 1e-3, String(f.z));
    }

    /* ── BW-21 · calm zoom: no edge chips, no figure pills; gridlines at Weeks, not at Months ── */
    if (on("BW-21")) { stamp("BW-21");
      const read = async () => page.evaluate(() => ({ figs: document.querySelectorAll('[data-bw="fig"], .bw-fig, .bw-edg, .edg').length, grids: document.querySelectorAll('[data-bw="grid"]').length, fades: document.querySelectorAll('[data-bw="fade"]').length }));
      await level(page, "Months"); await lineTo(page, 0.7);
      if (mut === "calmzoom") await page.evaluate(() => { const l = document.querySelector('[data-bw="layer"]')!; const s = document.createElement("span"); s.className = "bw-fig"; s.dataset.bw = "fig"; s.textContent = "3 wks past"; l.appendChild(s); });
      const mo = await read();
      await level(page, "Weeks"); await lineTo(page, 0.7);
      const wk = await read();
      L.check("BW-21", "zoomed in: no edge chips and no figure pills (Months and Weeks)", mo.figs === 0 && wk.figs === 0, JSON.stringify({ mo, wk }));
      L.check("BW-21", "gridlines show at Weeks and not at Months", mo.grids === 0 && wk.grids > 0, JSON.stringify({ mo, wk }));
      L.check("BW-21", "a soft white fade at each side when zoomed in", mo.fades === 2 && wk.fades === 2, JSON.stringify({ mo, wk }));
    }

    /* ── BW-4 / BW-7 · at Weeks (48px rows): stages on their dates; no gap; earlier stages faded; BW-5 names vs "!" ── */
    if (on("BW-4")) { stamp("BW-4");
      await fitted(page);
      const many = await page.evaluate(() => {
        const n = new Map<string, number>();
        for (const b of document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="stage"]')) n.set(b.dataset.row!, (n.get(b.dataset.row!) ?? 0) + 1);
        const id = [...n].sort((a, b) => b[1] - a[1])[0]?.[0];
        const r = id ? document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect() : null;
        return { id, y: r ? r.top + r.height / 2 : 430 };
      });
      /* Weeks, keeping that row: a double tap there steps up a level at a time */
      await level(page, "Weeks");
      const rowY = (id?: string) => page.evaluate((id) => { const r = id ? document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect() : null; return r ? r.top + r.height / 2 : null; }, id);
      /* rows off screen are not drawn, so scroll towards it (it was in the lower half when fitted) until it is */
      let yNow = await rowY(many.id);
      for (let i = 0; i < 30 && yNow == null; i++) { await pan(page, 0, many.y > 430 ? -300 : 300); yNow = await rowY(many.id); }
      if (yNow != null) await pan(page, 0, 420 - yNow);
      const first = (await box(page, `[data-bw="bar"][data-row="${many.id}"]`)).sort((a, b) => a.l - b.l)[0];
      if (first) await pan(page, 24 - first.l, 0);
      const r = await root(page);
      const bars = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="stage"]')].map((b) => { const bb = b.getBoundingClientRect(); return { row: b.dataset.row!, day: +b.dataset.day!, st: b.dataset.st!, cur: b.dataset.cur === "1", cont: b.dataset.cont === "1", l: bb.left, r: bb.right, bg: getComputedStyle(b).backgroundColor }; }));
      const byRow = new Map<string, typeof bars>();
      for (const b of bars) byRow.set(b.row, [...(byRow.get(b.row) ?? []), b]);
      const multi = [...byRow].filter(([, l]) => l.length >= 2).flatMap(([, l]) => l).filter((b) => b.l > 0 && b.l < PHONE.width);
      const off = multi.filter((b) => Math.abs(b.l - dayX(r, b.day)) > 2);
      L.check("BW-4", `Weeks (${r.rp}px rows): multi-stage rows on screen (population ${multi.length} bars)`, multi.length >= 2 && Math.abs(r.rp - 48) < 0.05, "");
      L.check("BW-4", "each stage bar sits within 2px of its date's x", off.length === 0, JSON.stringify(off.slice(0, 4).map((b) => [b.row, b.l, dayX(r, b.day)])));
      const early = bars.filter((b) => !b.cur).slice(0, 12);
      const wantBg = await page.evaluate((list) => list.map(([st, band]) => { const d = document.createElement("i"); d.style.background = `color-mix(in srgb,${band} 45%,#fff)`; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return [st, c]; }), early.map((b) => [b.st, statusBand(b.st)] as [string, string]));
      L.check("BW-7", `earlier stages are the faded colour (population ${early.length})`, early.length > 0 && early.every((b, i) => b.bg === wantBg[i][1]), "");
      await lineTo(page, 0.6);
      const readJoins = () => page.evaluate(() => {
        const tails = [...document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="ahead"], [data-bw="bar"][data-k="past"]')].map((b) => ({ row: b.dataset.row!, l: b.getBoundingClientRect().left }));
        return [...document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="stage"][data-cur="1"][data-cont="1"]')].map((b) => ({ row: b.dataset.row!, r: b.getBoundingClientRect().right, t: tails.find((x) => x.row === b.dataset.row)?.l })).filter((x) => x.t != null && x.r > 0 && x.r < innerWidth);
      });
      /* v3.2: the regroup moves rows, so scroll on (up to eight screens) until some current stages meet their tails */
      let joins = await readJoins();
      for (let i = 0; i < 8 && joins.length === 0; i++) { await pan(page, 0, -300); joins = await readJoins(); }
      const gaps = joins.filter((x) => Math.abs(x.r - x.t!) > 0.6);
      L.check("BW-7", `the current stage and its tail share an edge (population ${joins.length})`, joins.length > 0 && gaps.length === 0, JSON.stringify(gaps.slice(0, 3)));
      /* BW-5 reads the top of Needs chasing at Weeks, where the "!" marks are */
      await fitted(page); await level(page, "Weeks"); await lineTo(page, 0.7);
      for (const step of [0, 1]) {
        if (step) await pan(page, 0, -260);
        const ov = await page.evaluate(() => {
          const names = [...document.querySelectorAll('[data-bw="name"]')].map((e) => e.getBoundingClientRect()), marks = [...document.querySelectorAll('[data-bw="mark"]')].map((e) => e.getBoundingClientRect());
          const hit = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
          const out: string[] = []; for (const n of names) for (const f of marks) if (hit(n, f)) out.push(`${Math.round(n.left)}-${Math.round(n.right)}@${Math.round(n.top)}`);
          return { names: names.length, marks: marks.length, out };
        });
        L.check("BW-5", `screen ${step + 1}: no name over an "!" (population ${ov.names} names, ${ov.marks} marks)`, ov.names > 0 && (step > 0 || ov.marks > 0) && ov.out.length === 0, ov.out.slice(0, 4).join(" | "));
      }
      /* ── BW-6 · at the closest level, the ruler's marks clear of each other and of the Today pill ── */
      await lineTo(page, 0.62);
      const rm = (await box(page, '[data-bw="rm"]')).sort((a, b) => a.l - b.l);
      const pills = [...(await box(page, '[data-bw="pill"]')), ...(await box(page, '[data-bw="mon"]'))];
      const clash: string[] = [];
      for (let i = 1; i < rm.length; i++) if (rm[i].l < rm[i - 1].r) clash.push(`${rm[i - 1].text}|${rm[i].text}`);
      for (const d of rm) for (const p of pills) if (d.l < p.r && p.l < d.r) clash.push(`${d.text} under ${p.text}`);
      L.check("BW-6", `Weeks: the ruler's marks (population ${rm.length}) clear of each other and of the pills`, rm.length >= 2 && clash.length === 0, clash.slice(0, 5).join(", "));
      await fitted(page);
    }

    /* ── BW-23 · long press: the menu on a zoomed-in bar, with its state's actions; scrubbing anywhere else ── */
    if (on("BW-23")) { stamp("BW-23");
      await level(page, "Weeks"); await lineTo(page, 0.62);
      const targets = () => page.evaluate(() => {
        const out: { id: string; you: boolean; closed: boolean; x: number; y: number; white: { x: number; y: number } | null }[] = [];
        for (const h of document.querySelectorAll<HTMLElement>('[data-bw="row"]')) {
          const hr = h.getBoundingClientRect(); if (hr.top < 200 || hr.bottom > innerHeight - 140) continue;
          const bar = [...document.querySelectorAll<HTMLElement>(`[data-bw="bar"][data-row="${CSS.escape(h.dataset.id!)}"]`)].map((b) => b.getBoundingClientRect()).find((b) => b.width > 40 && b.left > 20 && b.right < innerWidth - 20);
          if (!bar) continue;
          const allBars = [...document.querySelectorAll<HTMLElement>(`[data-bw="bar"][data-row="${CSS.escape(h.dataset.id!)}"]`)].map((b) => b.getBoundingClientRect());
          const minL = Math.min(...allBars.map((b) => b.left)), maxR = Math.max(...allBars.map((b) => b.right));
          const white = minL > 60 ? { x: minL - 30, y: hr.top + hr.height / 2 } : maxR < innerWidth - 60 ? { x: maxR + 30, y: hr.top + hr.height / 2 } : null;
          out.push({ id: h.dataset.id!, you: h.dataset.you === "1", closed: h.dataset.closed === "1", x: bar.left + bar.width / 2, y: bar.top + bar.height / 2, white });
        }
        return out;
      });
      /* v3.3: the order puts long bars off the first screen, so scroll on (up to eight screens) until one fits */
      let target = await targets();
      for (let i = 0; i < 8 && !target.some((t) => !t.you && !t.closed && t.white); i++) { await pan(page, 0, -300); target = await targets(); }
      const pickT = target.find((t) => !t.you && !t.closed && t.white) ?? target[0];
      L.check("BW-23", `a zoomed-in bar to hold (population ${target.length})`, !!pickT, "");
      if (pickT) {
        await offPE(page);
        await hold(page, pickT.x, pickT.y);
        await page.mouse.up(); await frame(page, 400);
        const menu = await page.evaluate(() => ({ open: !!document.querySelector('[data-bw="menu"]'), id: document.querySelector<HTMLElement>('[data-bw="menu"]')?.dataset.id ?? "", acts: [...document.querySelectorAll<HTMLElement>('[data-bw="menu-act"]')].map((b) => b.textContent ?? "") }));
        const wantActs = pickT.closed ? ["Open query"] : pickT.you ? ["I’ve sent it", "Open query", "Edit dates"] : ["They replied", "Send a nudge", "Open query", "Edit dates"];
        L.check("BW-23", "a hold on a zoomed-in bar opens the menu, with its state's actions", menu.open && menu.id === pickT.id && menu.acts.join("|") === wantActs.join("|"), JSON.stringify(menu));
        if (menu.open) { await page.locator('[data-bw="menu-veil"]').click({ position: { x: 10, y: 10 } }).catch(() => {}); await frame(page, 300); }
        if (pickT.white) {
          await hold(page, pickT.white.x, pickT.white.y, 520, pickT.white.x + 40);
          const sc = await page.evaluate(() => ({ line: !!document.querySelector('[data-bw="scrub"]'), pill: document.querySelector('[data-bw="scrub-pill"]')?.textContent ?? "", menu: !!document.querySelector('[data-bw="menu"]') }));
          await page.mouse.up(); await frame(page, 300);
          L.check("BW-23", "a hold on the white beside a bar scrubs (no menu)", sc.line && !!sc.pill && !sc.menu, JSON.stringify(sc));
        }
      }
      await fitted(page);
      await hold(page, 200, 420, 520, 240);
      const fsc = await page.evaluate(() => ({ line: !!document.querySelector('[data-bw="scrub"]'), pill: document.querySelector('[data-bw="scrub-pill"]')?.textContent ?? "", menu: !!document.querySelector('[data-bw="menu"]') }));
      await page.mouse.up(); await frame(page, 300);
      L.check("BW-23", `on the fitted view a hold scrubs ("${fsc.pill}")`, fsc.line && / out$/.test(fsc.pill) && !fsc.menu, JSON.stringify(fsc));
    }

    /* ── BW-24 · search flies to the row: on screen and glowing ── */
    if (on("BW-24")) { stamp("BW-24");
      await openWorld(page); await mutate(page, mut);
      const name = await page.evaluate(() => { const ids = [...document.querySelectorAll<HTMLElement>('[data-bw="row"][data-closed="0"][data-nodate="0"]')].map((e) => e.dataset.id!); return ids[Math.floor(ids.length / 2)] ?? ""; });
      await page.locator('[data-bw="search"]').click(); await frame(page, 500);
      const firstHit = await page.locator('[data-bw="search-hit"]').count();
      const label = await page.locator(`[data-bw="search-hit"][data-id="${name}"] b`).first().textContent().catch(() => null);
      const typed = (label ?? "").split(" ")[0] || "a";
      await page.locator('[data-bw="search-input"]').fill(typed); await frame(page, 300);
      const hits = await page.locator('[data-bw="search-hit"]').count();
      const target = (await page.locator(`[data-bw="search-hit"][data-id="${name}"]`).count()) ? name : (await page.locator('[data-bw="search-hit"]').first().getAttribute("data-id")) ?? "";
      await page.locator(`[data-bw="search-hit"][data-id="${target}"]`).click(); await frame(page, 1100);
      const flown = await page.evaluate((id) => { const r = document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect(); const g = [...document.querySelectorAll<HTMLElement>('[data-bw="glow"]')].filter((e) => getComputedStyle(e).display !== "none").map((e) => e.getBoundingClientRect()); return { on: !!r && r.top > 140 && r.bottom < innerHeight - 80, glow: !!r && g.some((x) => Math.abs(x.top - r.top) < 1) }; }, target);
      const r = await root(page);
      L.check("BW-24", `search lists matches (${firstHit} before typing, ${hits} for "${typed}")`, firstHit > 0 && firstHit <= 6 && hits > 0 && hits <= 6, "");
      L.check("BW-24", "picking one flies to it: Weeks, the row on screen and glowing", r.level === "Weeks" && flown.on && flown.glow, JSON.stringify({ ...flown, level: r.level }));
      await fitted(page);
    }

    /* ── BW-25 · the hawk's news: a "last opened" before N ≥ 2 changes shows N; Show me visits each; Done clears it.
       The harness's changes fall on whole days and jump (1 → 4 on 26 Nov), so N is the first day with two or more. ── */
    if (on("BW-25")) { stamp("BW-25");
      const DAY = 86_400_000;
      let lo = 1, hi = 120;
      const badgeAt = async (days: number) => { await seenAgo(page, days * DAY); await page.reload(); await page.locator('[data-bw="world"]').first().waitFor(); await frame(page, 1200); return (await root(page)).news; };
      while (lo < hi) { const mid = Math.floor((lo + hi) / 2), n = await badgeAt(mid); console.log(`  news probe ${mid}d → ${n}`); if (n >= 2) hi = mid; else lo = mid + 1; }
      const found = lo, n0 = await badgeAt(found);
      await mutate(page, mut);
      const shown = await page.evaluate(() => { const b = document.querySelector<HTMLElement>('[data-bw="news-count"]'); return b && getComputedStyle(b).display !== "none" ? b.textContent : null; });
      L.check("BW-25", `with "last opened" ${found} days ago (the first day with two or more changes) the badge shows ${n0}`, n0 >= 2 && shown === String(n0), String(shown));
      await page.locator('[data-bw="hawk-btn"]').click(); await frame(page, 400);
      const banner = (await box(page, '[data-bw="news"]'))[0]?.text ?? "";
      L.check("BW-25", `tapping the hawk drops the banner ("${banner.slice(0, 60)}…")`, new RegExp(`^${n0} things changed since \\w+`).test(banner) && /Show me/.test(banner), banner);
      await page.locator('[data-bw="show-me"]').click({ timeout: 4000 }).catch(() => {}); await frame(page, 900);
      const seen: { step: string; glow: boolean; btn: string }[] = [];
      const lines: { id: string; l: string }[] = [];
      for (let i = 0; i <= n0; i++) {
        if (mut === "titles") await page.evaluate(() => { const sp = document.querySelector('[data-bw="news-step"] span'); const t = [...(sp?.childNodes ?? [])].find((n) => n.nodeType === 3); if (t) t.textContent = (t.textContent ?? "").replace(/ \([^)]*\)/, ""); });
        lines.push(await page.evaluate(() => { const el = document.querySelector<HTMLElement>('[data-bw="news-step"]'), sp = el?.querySelector("span"); return { id: el?.dataset.id ?? "", l: [...(sp?.childNodes ?? [])].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim() }; }));
        const st = await page.evaluate(() => ({ step: document.querySelector('[data-bw="news-step"] em')?.textContent ?? "", glow: [...document.querySelectorAll<HTMLElement>('[data-bw="glow"]')].some((e) => getComputedStyle(e).display !== "none"), btn: document.querySelector('[data-bw="news-next"]')?.textContent ?? "" }));
        if (!st.step) break;
        seen.push(st);
        await page.locator('[data-bw="news-next"]').click(); await frame(page, 900);
      }
      const after = await page.evaluate(() => ({ count: document.querySelector('[data-bw="news-count"]')?.textContent ?? null, step: !!document.querySelector('[data-bw="news-step"]'), stored: Number(localStorage.getItem("bw3.lastOpened")) }));
      /* ── BW-29 · two news lines that would start with the same agent's name both carry the manuscript title; single ones don't ── */
      {
        /* whether each line's query has a manuscript at all (a probe query in the harness is saved with none) */
        const msOf = async (id: string) => { const j = await fetch(`${EMU}/users/${UID}/queries/${encodeURIComponent(id)}`, { headers: { Authorization: "Bearer owner" } }).then((x) => x.json()) as { fields?: { manuscriptId?: { stringValue?: string } } }; return !!j.fields?.manuscriptId?.stringValue; };
        const parsed = await Promise.all(lines.filter((x) => x.l).map(async ({ id, l }) => { const m = /^(.*?)(?: \((.+)\))? (asked for a partial|asked for the full|made an offer|passed|reached the reply date)$/.exec(l); return { l, id, hasMs: await msOf(id), name: m?.[1] ?? l, title: m?.[2] ?? null }; }));
        const per = new Map<string, number>(); for (const x of parsed) per.set(x.name, (per.get(x.name) ?? 0) + 1);
        const all2 = parsed.filter((x) => per.get(x.name)! > 1), singles = parsed.filter((x) => per.get(x.name) === 1);
        const twins = all2.filter((x) => x.hasMs), bare = all2.filter((x) => !x.hasMs);
        L.check("BW-29", `a same-agent line whose query has no manuscript stays bare (population ${bare.length})`, bare.every((x) => !x.title), JSON.stringify(bare.map((x) => x.l)));
        L.check("BW-29", `same-agent lines with a manuscript in the news (population ${twins.length} of ${parsed.length})`, twins.length >= 2, JSON.stringify(parsed.map((x) => x.l)));
        L.check("BW-29", "each same-agent line whose query has a manuscript carries its title", twins.length > 0 && twins.every((x) => !!x.title), JSON.stringify(twins.map((x) => x.l)));
        L.check("BW-29", `a single agent's line carries no title (population ${singles.length})`, singles.every((x) => !x.title), JSON.stringify(singles.map((x) => x.l)));
      }
      const each = seen.length === n0 && seen.every((x, i) => x.step === `${i + 1} of ${n0}` && x.glow && x.btn === (i + 1 < n0 ? "Next" : "Done"));
      L.check("BW-25", `Show me visits each of the ${n0}, glowing, Next then Done`, each, JSON.stringify(seen));
      L.check("BW-25", "Done clears the count and records this visit", after.count == null && !after.step && Date.now() - after.stored < 60_000, JSON.stringify(after));
      await seenAgo(page, null);
      await openWorld(page); await mutate(page, mut);
    }

    /* ── BW-27 · pull to refresh: only on the fitted view, and one refetch ── */
    if (on("BW-27")) { stamp("BW-27");
      await fitted(page);
      const r0 = await root(page);
      await page.mouse.move(200, 300); await page.mouse.down();
      for (let i = 1; i <= 14; i++) { await page.mouse.move(200, 300 + i * 12); await page.waitForTimeout(16); }
      const during = await page.evaluate(() => { const p = document.querySelector<HTMLElement>('[data-bw="pull"]'); return p && getComputedStyle(p).display !== "none" && +getComputedStyle(p).opacity > 0.5 ? p.textContent : null; });
      await page.mouse.up(); await frame(page, 300);
      const checking = await page.evaluate(() => document.querySelector('[data-bw="pull"]')?.textContent ?? null);
      await frame(page, 1600);
      const r1 = await root(page);
      const toast = (await box(page, '[data-bw="toast"]'))[0]?.text ?? "";
      L.check("BW-27", `fitted: the pull shows the hawk ("${during}"), then "${checking}"`, during === "Let go to refresh" && checking === "Checking for news…", "");
      L.check("BW-27", "letting go triggers exactly one refetch, then \"You’re up to date.\"", r1.refreshes - r0.refreshes === 1 && /You’re up to date\./.test(toast), `${r0.refreshes} → ${r1.refreshes} · ${toast}`);
      await level(page, "Months");
      const z0 = await root(page);
      await pan(page, 0, 4000);
      await page.mouse.move(200, 300); await page.mouse.down();
      for (let i = 1; i <= 14; i++) { await page.mouse.move(200, 300 + i * 12); await page.waitForTimeout(16); }
      const zoomedPull = await page.evaluate(() => !!document.querySelector('[data-bw="pull"]'));
      await page.mouse.up(); await frame(page, 1500);
      const z1 = await root(page);
      L.check("BW-27", "zoomed in: no pull and no refetch", !zoomedPull && z1.refreshes === z0.refreshes, JSON.stringify({ zoomedPull, before: z0.refreshes, after: z1.refreshes }));
      await fitted(page);
    }

    /* ── BW-8 · gone quiet starts at the setting's N weeks (two settings) ── */
    if (on("BW-8")) { stamp("BW-8");
      for (const weeks of [6, 3]) {
        await setQuietWeeks(weeks); await openWorld(page); await mutate(page, mut === "quiet" ? "quiet" : "");
        const r = await root(page);
        const q = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="quiet"]')].map((b) => {
          const row = document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(b.dataset.row!)}"]`)!;
          return { row: b.dataset.row!, l: b.getBoundingClientRect().left, start: Number(row.dataset.start), dueDay: Number(row.dataset.dueday) };
        }));
        const wantD = (x: (typeof q)[number]) => Math.max(x.dueDay + weeks * 7, x.start);
        const bad = q.filter((x) => Math.abs(x.l - dayX(r, wantD(x))) > 1.5);
        L.check("BW-8", `quietWeeks ${weeks}: the fade starts ${weeks} weeks after each reply date (population ${q.length})`, q.length > 0 && q.some((x) => wantD(x) > x.start) && bad.length === 0, JSON.stringify(bad.slice(0, 3)));
      }
      await setQuietWeeks(null);
      await openWorld(page); await mutate(page, mut);
    }

    /* ── BW-12 · replay: the line from the first date to today; a touch stops it; it ends on the recap ── */
    if (on("BW-12")) { stamp("BW-12");
      await fitted(page);
      const r0 = await root(page);
      if (mut === "replay") await page.evaluate(() => { (window as unknown as { requestAnimationFrame: (f: FrameRequestCallback) => number }).requestAnimationFrame = () => 0; });
      await page.locator('[data-bw="replay"]').click();
      const reads: { lx: number; label: string; replay: string }[] = [];
      for (let i = 0; i < 5; i++) { await page.waitForTimeout(650); const r = await root(page); reads.push({ lx: r.lx, label: (await box(page, '[data-bw="pill"]'))[0]?.text.trim() ?? "", replay: r.replay }); }
      const rising = reads.every((x, i) => !i || x.lx >= reads[i - 1].lx - 0.5) && reads[reads.length - 1].lx > reads[0].lx + 20;
      L.check("BW-12", "replay runs: the line moves forwards, its pill showing the date", reads[0].replay === "running" && rising && /^\d+ \w+$/.test(reads[0].label), JSON.stringify(reads.slice(0, 3)));
      await offPE(page);
      await page.mouse.move(200, 500); await page.mouse.down(); await page.mouse.up(); await frame(page, 500);
      const after = await root(page);
      L.check("BW-12", "a touch stops it at today (no recap)", after.replay === "done" && Math.abs(after.lx - r0.lx) < 1 && after.recap === "0", JSON.stringify(after.replay));
      if (mut !== "replay") {
        await page.locator('[data-bw="replay"]').click(); await page.waitForTimeout(6800);
        const rc = await page.evaluate(() => ({ card: !!document.querySelector('[data-bw="recap"]'), days: document.querySelector('[data-bw="recap-days"]')?.textContent ?? "", btns: [...document.querySelectorAll('[data-bw="recap"] button')].map((b) => b.textContent) }));
        L.check("BW-12", `played through, it ends on the recap (${rc.days} days)`, rc.card && +rc.days > 0 && rc.btns.join("|") === "Share|Done", JSON.stringify(rc));
        await page.locator('[data-bw="recap-done"]').click().catch(() => {}); await frame(page, 300);
      }
      if (mut === "replay") await openWorld(page);
    }

    /* ── BW-14 · layers ── */
    if (on("BW-14")) { stamp("BW-14");
      await fitted(page);
      await page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler { pointer-events: auto !important; }" });
      /* v3.2: four groups leave no heading under the hawk's middle on the fitted view, so at Months a heading is panned
         under it. The point is read inside the middle half of the hawk's own box (its edges are soft and may not hit). */
      /* the hawk drifts (14s); held still for this reading, which is about stacking, not motion */
      await page.addStyleTag({ content: ".bw-hsw { animation: none !important; }" });
      const band = () => page.evaluate(() => { const w = document.querySelector<HTMLElement>(".bw-hsw")!.getBoundingClientRect(); const t = w.top + w.height * 0.25, b = w.bottom - w.height * 0.25; const hs = [...document.querySelectorAll<HTMLElement>(".bw-gh0")].map((h) => h.getBoundingClientRect()); return { mid: (t + b) / 2, hit: hs.some((h) => h.top + 2 < b && h.bottom - 2 > t), next: [...document.querySelectorAll<HTMLElement>(".bw-gh0:not(.pinned)")].map((h) => h.getBoundingClientRect().top).filter((y) => y > 200).sort((p, q) => Math.abs(p + 13 - (t + b) / 2) - Math.abs(q + 13 - (t + b) / 2))[0] ?? null }; });
      let bd = await band();
      if (!bd.hit) {
        await level(page, "Months"); bd = await band();
        for (let i = 0; i < 30 && !bd.hit && bd.next == null; i++) { await pan(page, 0, -300); bd = await band(); }
        for (let i = 0; i < 4 && !bd.hit && bd.next != null; i++) { await pan(page, 0, bd.mid - (bd.next + 13)); bd = await band(); }
      }
      await page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler { pointer-events: auto !important; }" });
      const layers = await page.evaluate(() => {
        const hs = document.querySelector<HTMLElement>(".bw-hsw")?.getBoundingClientRect();
        const heads = [...document.querySelectorAll<HTMLElement>(".bw-gh0")].map((h) => h.getBoundingClientRect());
        const line = document.querySelector<HTMLElement>(".bw-fline")?.getBoundingClientRect();
        const at = (x: number, y: number) => document.elementsFromPoint(x, y).map((e) => (e as HTMLElement).className?.toString?.() ?? e.tagName);
        const rank = (list: string[], cls: string) => list.findIndex((c) => c.split(" ").includes(cls));
        let headPt: [number, number] | null = null;
        if (hs) for (const h of heads) { const l = Math.max(h.left + 4, hs.left + hs.width * 0.25), r = Math.min(h.right, hs.right - hs.width * 0.25), t = Math.max(h.top + 2, hs.top + hs.height * 0.25), b = Math.min(h.bottom - 2, hs.bottom - hs.height * 0.25); if (r > l && b > t) { headPt = [(l + r) / 2, (t + b) / 2]; break; } }
        const A = headPt ? at(...headPt) : [];
        const B = hs && line ? at(line.left + line.width / 2, Math.max(hs.top + 10, line.top + 10)) : [];
        /* the hawk's layer is its wrapper (z 8) or its image inside it: the image moves with the view (shadowStyle), so at a
           point inside the wrapper the topmost hawk element may be the wrapper (polish v1's 96 top put the headings there) */
        const hawk = (list: string[]) => { const r = [rank(list, "bw-hs"), rank(list, "bw-hsw")].filter((i) => i >= 0); return r.length ? Math.min(...r) : -1; };
        return { hawkOverHead: headPt ? hawk(A) >= 0 && hawk(A) < rank(A, "bw-gh0") : null, A: A.slice(0, 6), lineOverHawk: rank(B, "bw-fline") >= 0 && (rank(B, "bw-hs") < 0 || rank(B, "bw-fline") < rank(B, "bw-hs")), B: B.slice(0, 6) };
      });
      L.check("BW-14", "the hawk's shadow paints above a group heading", layers.hawkOverHead === true, JSON.stringify(layers.A));
      L.check("BW-14", "the line paints above the hawk", layers.lineOverHawk === true, JSON.stringify(layers.B));
      await page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler { pointer-events: none !important; }" });
      await fitted(page);
    }

    /* ── BW-15 · the line off screen (at Weeks) ── */
    if (on("BW-15")) { stamp("BW-15");
      await level(page, "Weeks");
      let reached = 0;
      for (const [dir, wantT] of [[1, "← Today"], [-1, "Today →"]] as const) {
        await pan(page, dir * -6000, 0);
        const p = (await box(page, '[data-bw="pill"]'))[0];
        if (p.d.off === "0") { L.check("BW-15", `"${wantT}": the line cannot leave by this side at this zoom (recorded)`, true, ""); continue; }
        reached++;
        const look = await page.evaluate(() => { const e = document.querySelector<HTMLElement>('[data-bw="pill"]')!; const cs = getComputedStyle(e); return { bg: cs.backgroundColor, border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}` }; });
        L.check("BW-15", `panned past the line: "${wantT}" at the edge, outlined`, p.text.trim() === wantT && look.bg === "rgb(255, 255, 255)" && /^1(\.5)?px solid rgb\(42, 58, 82\)$/.test(look.border), `${p.text} ${JSON.stringify(look)}`);
        await page.locator('[data-bw="pill"]').click(); await frame(page, 700);
        const r = await root(page);
        L.check("BW-15", `a tap on "${wantT}" brings the line back on screen`, r.lx > 44 && r.lx < PHONE.width - 44, String(r.lx));
      }
      L.check("BW-15", `the line was taken off screen (population ${reached} sides)`, reached >= 1, "");
      await fitted(page);
    }

    /* ── BW-13 · copy and console ── */
    if (on("BW-13")) { stamp("BW-13");
      if (mut === "copy") await page.evaluate(() => { const g = document.querySelector('[data-bw="group"]'); if (g) g.textContent = "Overdue"; });
      const words = await page.evaluate(() => document.querySelector<HTMLElement>('[data-bw="world"]')!.innerText);
      L.check("BW-13", 'never "overdue" or "late"', !/overdue|\blate\b/i.test(words), (/.{0,30}(overdue|\blate\b).{0,30}/i.exec(words) ?? [""])[0]);
    }

    /* ── BW-17 · reduced motion: no drift, no glide, no replay ── */
    if (on("BW-17")) { stamp("BW-17");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openWorld(page);
      await mutate(page, mut === "calm" ? "calm" : "");
      const drift = await page.evaluate(() => getComputedStyle(document.querySelector(".bw-hsw")!).animationName);
      await level(page, "Months");
      const r0 = await root(page);
      await offPE(page);
      await page.mouse.move(150, 450); await page.mouse.down(); for (let i = 1; i <= 6; i++) { await page.mouse.move(150 + i * 25, 450 + i * 10); await page.waitForTimeout(8); } await page.mouse.up();
      const r1 = await root(page); await page.waitForTimeout(600); const r2 = await root(page);
      await fitted(page);
      await page.locator('[data-bw="replay"]').click(); await page.waitForTimeout(400);
      const rep = (await root(page)).replay;
      L.check("BW-17", "reduced motion: the hawk does not drift", drift === "none", drift);
      L.check("BW-17", "reduced motion: a drag stops where it is let go", Math.hypot(r1.ox - r0.ox, r1.oy - r0.oy) > 20 && Math.hypot(r2.ox - r1.ox, r2.oy - r1.oy) < 0.5, "");
      L.check("BW-12", "reduced motion: replay never runs", rep !== "running", rep);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }

    /* ── BW-18 · landscape (740 × 360) ── */
    if (on("BW-18")) { stamp("BW-18");
      await openWorld(page, WORLD, LAND);
      await mutate(page, mut === "land" ? "land" : "");
      const head = (await box(page, '[data-bw="head"]'))[0];
      const dock = await page.evaluate(() => { const d = document.querySelector<HTMLElement>('[data-pa5="dock"]'); return d ? getComputedStyle(d).display : "absent"; });
      L.check("BW-18", "740x360: the header folded (96px), no dock", !!head && head.h === 96 && (dock === "none" || dock === "absent"), JSON.stringify({ h: head?.h, dock }));
      await page.setViewportSize(PHONE);
    }

    /* ── BW-28 · a closed query's menu is just "Open query" (no Reopen on the phone, v3.1) ──
       ── BW-31 · an undated with-you query: no chip on its bar; "Add send-by date" after "I've sent it" in its menu;
          saving puts the date on the bar (v3.1) ── */
    if (on("BW-28") || on("BW-31")) { stamp("BW-28/31");
      await openWorld(page); await mutate(page, mut);
      /* rows off screen aren't drawn: find one at the fitted view, then scroll to it at Weeks */
      const findAtWeeks = async (sel: string) => {
        await fitted(page);
        const id = await page.evaluate((q) => document.querySelector<HTMLElement>(q)?.dataset.id ?? "", sel);
        if (!id) return { id, bar: null as null | { x: number; y: number } };
        const fy = await page.evaluate((i) => document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(i)}"]`)!.getBoundingClientRect().top, id);
        await level(page, "Weeks");
        const rowAt = () => page.evaluate((i) => { const r = document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(i)}"]`)?.getBoundingClientRect(); return r ? r.top + r.height / 2 : null; }, id);
        let y = await rowAt();
        for (let k = 0; k < 40 && y == null; k++) { await pan(page, 0, fy > 430 ? -300 : 300); y = await rowAt(); }
        if (y != null) await pan(page, 0, 430 - y);
        const barOf = () => page.evaluate((i) => { const bs = [...document.querySelectorAll<HTMLElement>(`[data-bw="bar"][data-row="${CSS.escape(i)}"]`)].map((b) => b.getBoundingClientRect()).filter((b) => b.width > 2); if (!bs.length) return null; const l = Math.min(...bs.map((b) => b.left)), r = Math.max(...bs.map((b) => b.right)); return { l, r, y: bs[0].top + bs[0].height / 2 }; }, id);
        let b = await barOf();
        if (b && (b.r < 40 || b.l > innerW() - 40)) { await pan(page, 200 - (Math.max(b.l, Math.min(b.r, 200))), 0); b = await barOf(); }
        if (b && b.r - Math.max(b.l, 20) < 30) { await pan(page, 200 - (b.r - 20), 0); b = await barOf(); }
        return { id, bar: b ? { x: Math.max(b.l + 12, Math.min(b.r - 12, (Math.max(b.l, 24) + Math.min(b.r, 366)) / 2)), y: b.y } : null };
      };
      const innerW = () => PHONE.width;
      const openMenu = async (pt: { x: number; y: number }) => {
        await offPE(page); await hold(page, pt.x, pt.y); await page.mouse.up(); await frame(page, 400);
        if (mut === "reopen") await page.evaluate(() => { const m = document.querySelector('[data-bw="menu"]'); if (m) { const b = document.createElement("button"); b.dataset.bw = "menu-act"; b.dataset.act = "reopen"; b.textContent = "Reopen"; m.appendChild(b); } });
        return page.evaluate(() => ({ open: !!document.querySelector('[data-bw="menu"]'), id: document.querySelector<HTMLElement>('[data-bw="menu"]')?.dataset.id ?? "", acts: [...document.querySelectorAll<HTMLElement>('[data-bw="menu-act"]')].filter((b) => getComputedStyle(b).display !== "none").map((b) => b.textContent ?? "") }));
      };
      const closeMenu = () => page.locator('[data-bw="menu-veil"]').click({ position: { x: 10, y: 10 }, timeout: 2000 }).catch(() => {});

      if (on("BW-28")) {
        const c = await findAtWeeks('[data-bw="row"][data-closed="1"]');
        L.check("BW-28", `a closed query's bar to hold (population: ${c.id || "none"})`, !!c.bar, "");
        if (c.bar) {
          const m = await openMenu(c.bar);
          L.check("BW-28", "a closed query's menu is just \"Open query\"", m.open && m.id === c.id && m.acts.join("|") === "Open query", JSON.stringify(m));
          await closeMenu();
        }
      }
      if (on("BW-31")) {
        const u = await findAtWeeks('[data-bw="row"][data-you="1"][data-dueday=""]');
        L.check("BW-31", `an undated with-you query to hold (population: ${u.id || "none"})`, !!u.bar, "");
        if (u.bar) {
          const chips = await page.evaluate((i) => document.querySelectorAll(`[data-bw="ndset"][data-id="${CSS.escape(i)}"], [data-bw="ndt"][data-row="${CSS.escape(i)}"]`).length, u.id);
          L.check("BW-31", "no chip (and no no-date fade) on its bar", chips === 0, String(chips));
          const m = await openMenu(u.bar);
          L.check("BW-31", "its menu: I’ve sent it · Add send-by date · Open query · Edit dates", m.open && m.id === u.id && m.acts.join("|") === "I’ve sent it|Add send-by date|Open query|Edit dates", JSON.stringify(m));
          /* Phone query sheet v1 §D: Add send-by date opens the one query sheet, then the desktop's Edit journey over it
             (its save is sendByFields, measured with the desktop's journeys); v3.1's own send-by sheet is retired */
          await page.locator('[data-bw="menu-act"][data-act="sendby"]').click({ timeout: 4000 }).catch(() => {}); await frame(page, 1200);
          const sh = await page.evaluate((qid) => ({ sheet: document.querySelector<HTMLElement>('[data-pqs="root"]')?.dataset.id ?? "", edit: document.querySelector<HTMLElement>('[data-pf="edit"]') ? "edit" : "", old: !!document.querySelector('[data-bw="sheet"][data-k="sendby"]'), qid }), u.id);
          L.check("BW-31", `"Add send-by date" opens the query sheet (${sh.sheet}) with the desktop's Edit journey over it (${sh.edit || "none"})`, sh.sheet === u.id && sh.edit === "edit" && !sh.old, JSON.stringify(sh));
          await page.locator('[data-pf="edit"] [aria-label="Close"], [data-pf="edit"] button[data-qad="close"]').first().click({ timeout: 2000 }).catch(() => {}); await frame(page, 400);
          await page.keyboard.press("Escape").catch(() => {}); await frame(page, 300);
          await page.locator('[data-pqs="close"]').click({ timeout: 2000 }).catch(() => {}); await frame(page, 500);
        }
      }
      await fitted(page);
    }

    /* ── BW-26 · no reply date yet: in its group under All and Waiting only; saving a date moves the query out ── */
    if (on("BW-26")) { stamp("BW-26");
      await openWorld(page); await mutate(page, mut);
      const inGroup = async () => page.evaluate(() => [...document.querySelectorAll('[data-bw="group"]')].map((g) => (g as HTMLElement).dataset.t).includes("No reply date yet"));
      const seen: Record<string, boolean> = { all: await inGroup() };
      for (const k of ["you", "chase", "wait"]) { await pill(page, k); seen[k] = await inGroup(); await pill(page, k); }
      L.check("BW-26", "No reply date yet: under All and Waiting only", seen.all && seen.wait && !seen.you && !seen.chase, JSON.stringify(seen));
      const nd = await page.evaluate(() => document.querySelector<HTMLElement>('[data-bw="row"][data-nodate="1"]')?.dataset.id ?? "");
      L.check("BW-26", `a no-date query to date (population: ${nd || "none"})`, !!nd, "");
      if (nd) {
        const r = await page.evaluate((id) => { const e = document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(id)}"]`)!.getBoundingClientRect(); return { x: 200, y: e.top + e.height / 2 }; }, nd);
        await offPE(page);
        await page.mouse.click(r.x, r.y); await frame(page, 700);
        const sheet = await page.evaluate(() => ({ open: !!document.querySelector('[data-bw="sheet"][data-k="nodate"]'), slider: !!document.querySelector('[data-bw="sheet"][data-k="nodate"] input[type="range"]'), date: document.querySelector('[data-bw="nd-date"]')?.textContent ?? "" }));
        L.check("BW-26", `a tap on its bar opens the sheet with the app's slider ("${sheet.date}")`, sheet.open && sheet.slider && /Reply by \d+ \w+/.test(sheet.date), JSON.stringify(sheet));
        /* ── BW-30 · a start date that has passed shows the one line; a future one doesn't ── */
        {
          const slider = page.locator('[data-bw="sheet"][data-k="nodate"] input[type="range"]');
          const read = () => page.evaluate(() => {
            const t = document.querySelector('[data-bw="nd-date"] b')?.textContent ?? "", now = new Date(), d = new Date(`${t} ${now.getFullYear()} 12:00`);
            if (d.getTime() - now.getTime() > 182 * 86_400_000) d.setFullYear(d.getFullYear() - 1);
            if (now.getTime() - d.getTime() > 182 * 86_400_000) d.setFullYear(d.getFullYear() + 1);
            const p = document.querySelector<HTMLElement>('[data-bw="nd-passed"]');
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            return { date: t, past: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() < today, line: p && getComputedStyle(p).display !== "none" ? p.textContent : null, font: p ? getComputedStyle(p).fontSize : "" };
          });
          const out: Record<string, unknown>[] = [];
          for (const w of ["1", "26"]) { await slider.fill(w); await frame(page, 250); out.push({ w, ...(await read()) }); }
          const pastOnes = out.filter((x) => x.past), future = out.filter((x) => !x.past);
          L.check("BW-30", `a passed date (population ${pastOnes.length}) shows "That’s already passed, so it’ll go into Needs chasing."`, pastOnes.length > 0 && pastOnes.every((x) => x.line === "That’s already passed, so it’ll go into Needs chasing."), JSON.stringify(out));
          L.check("BW-30", `a date still to come (population ${future.length}) shows no such line`, future.length > 0 && future.every((x) => x.line == null), JSON.stringify(out));
        }
        if (mut === "nodate") await page.evaluate(() => { const b = document.querySelector('[data-bw="nd-save"]'); b?.replaceWith(b.cloneNode(true)); });
        /* every button in the sheet is the topmost thing where a finger lands (the dock once sat over Save) */
        const under = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bw="sheet"] button, [data-bw="sheet"] input')].map((b) => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === b || b.contains(t)) ? "" : `${b.dataset.bw ?? b.tagName} under ${(t as HTMLElement | null)?.dataset?.pa5 ?? t?.tagName}`; }).filter(Boolean));
        L.check("BW-26", "nothing sits over the sheet's controls (the dock included)", under.length === 0, under.join(", "));
        await page.locator('[data-bw="nd-save"]').click({ timeout: 5000 }).catch(() => {}); await frame(page, 2500);
        await page.locator('[data-bw="sheet-close"]').click({ timeout: 1500 }).catch(() => {}); await frame(page, 400);
        const moved = await page.evaluate((id) => { const h = document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(id)}"]`); return h ? h.dataset.nodate : "gone"; }, nd);
        /* the page moves the row from its local cache at once; the emulator's copy can lag under load, so poll it (10s) */
        let wrote = "";
        for (let t = 0; t < 20 && !wrote; t++) {
          const doc = await fetch(`${EMU}/users/${UID}/queries/${encodeURIComponent(nd)}`, { headers: { Authorization: "Bearer owner" } }).then((x) => x.json()) as { fields?: Record<string, { stringValue?: string }> };
          wrote = doc.fields?.writerExpectedDate?.stringValue ?? "";
          if (!wrote) await page.waitForTimeout(500);
        }
        L.check("BW-26", `the save wrote the writer's reply date (${wrote})`, !!wrote, "");
        L.check("BW-26", "saving a date moves the query out of the group", moved === "0", String(moved));
      }
    }

    /* ── BW-36 · the first-load cut-off: load at 784px tall, shrink to 700 within 300ms (an address bar settling); the
          switch stays inside the viewport and above the dock, on load and after, with no refresh ── */
    if (on("BW-36")) { stamp("BW-36");
      await page.setViewportSize(PHONE);
      const read = () => page.evaluate(() => {
        const z = document.querySelector<HTMLElement>('[data-bw="levels"]')?.getBoundingClientRect(), d = document.querySelector<HTMLElement>('[data-pa5="dock"]');
        const dr = d && getComputedStyle(d).display !== "none" ? d.getBoundingClientRect() : null;
        return z ? { top: z.top, bottom: z.bottom, vh: innerHeight, vv: window.visualViewport?.height ?? innerHeight, dockTop: dr ? dr.top : null } : null;
      });
      await page.goto(WORLD);
      if (mut === "cutoff") await mutate(page, "cutoff");
      await page.locator('[data-bw="levels"]').first().waitFor({ timeout: 30_000 });
      const onLoad = await read();
      await page.setViewportSize({ width: PHONE.width, height: 700 });
      await frame(page, 700);
      if (mut === "cutoff") await mutate(page, "cutoff");
      const after = await read();
      const ok = (x: typeof onLoad) => !!x && x.top >= 0 && x.bottom <= Math.min(x.vh, x.vv) && (x.dockTop == null || x.bottom <= x.dockTop - 11.5);
      L.check("BW-36", `on load (784 tall): inside the viewport and above the dock ${JSON.stringify(onLoad)}`, ok(onLoad), "");
      L.check("BW-36", `after the shrink to 700: inside the viewport and above the dock ${JSON.stringify(after)}`, ok(after), "");
      L.check("BW-36", "pinned 12px above the dock both times", !!onLoad && !!after && onLoad.dockTop != null && after.dockTop != null && Math.abs(onLoad.dockTop - onLoad.bottom - 12) < 1 && Math.abs(after.dockTop - after.bottom - 12) < 1, JSON.stringify({ onLoad, after }));
      /* the cause, reproduced: the dock still sliding in (tucked by its transform) until 300ms after the world first lays out, as it
         is when the app opens straight onto Birds-eye. v3 read the dock as innerHeight − its top at that moment (0px)
         and put the switch 24px from the bottom, under the dock, until a refresh. */
      await page.addInitScript(() => { try { if (sessionStorage.getItem("bwT.tuck") !== "1") return; sessionStorage.removeItem("bwT.tuck"); const st = document.createElement("style"); st.textContent = '[data-pa5="dock"] { transform: translateY(100%) !important; transition: none !important; }'; document.documentElement.appendChild(st); const mo = new MutationObserver(() => { if (document.querySelector('[data-bw="world"]')) { mo.disconnect(); setTimeout(() => st.remove(), 300); } }); mo.observe(document.documentElement, { childList: true, subtree: true }); } catch { /* */ } });
      await page.setViewportSize(PHONE);
      await page.evaluate(() => { try { sessionStorage.setItem("bwT.tuck", "1"); } catch { /* */ } });
      await page.goto(WORLD);
      await page.locator('[data-bw="levels"]').first().waitFor({ timeout: 30_000 });
      await frame(page, 900);
      if (mut === "cutoff") await mutate(page, "cutoff");
      const settled = await read();
      L.check("BW-36", `the dock still sliding in on load: once it settles, the switch is above it ${JSON.stringify(settled)}`, ok(settled) && settled!.dockTop != null && Math.abs(settled!.dockTop - settled!.bottom - 12) < 1, "");
      await page.setViewportSize(PHONE);
    }

    const ours = errs.filter((e) => /BirdsWorld|BirdsSheets|drawWorld|wireMotion|makeWorld|bwRow|rowSegs/.test(e));
    writeFileSync(`${DIR}/ledger/console${mut ? `.mut-${mut}` : ""}.json`, JSON.stringify(errs, null, 1));
    L.check("BW-13", `no error from the world in the console (population ${errs.length} console errors in all)`, ours.length === 0, ours.slice(0, 3).join(" | "));
    L.done(45);
  });
}

/* ══ the shots: the build in the ref's states 01–08 and 11–20 (09 and 10 are the long-press and scrub of 06/07) ══ */
test("Phone Birds-eye world v3 — the shots beside the ref's", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel" || !process.env.BW_SHOTS, "BW_SHOTS=1, Chromium phone");
  test.setTimeout(600_000);
  const out = `${DIR}/shots`; mkdirSync(out, { recursive: true });
  page.setDefaultTimeout(15_000);
  const shot = (n: string) => page.screenshot({ path: `${out}/${n}-build.png` });
  await signIn(page);
  await page.evaluate(() => { try { localStorage.setItem("bw1.hint.seen", "1"); } catch { /* */ } });
  await openWorld(page);
  await shot("01-overview");
  const titles = (await box(page, '[data-bw="group"]')).map((g) => g.d.g);
  for (const t of titles.slice(0, -1)) { await page.locator(`[data-bw="fold"][data-g="${t}"]`).click().catch(() => {}); await frame(page, 250); }
  await shot("02-folded-groups");
  for (const t of titles.slice(0, -1)) { await page.locator(`[data-bw="fold"][data-g="${t}"]`).click().catch(() => {}); await frame(page, 200); }
  await pill(page, "chase"); await shot("03-pill-needs-chasing"); await pill(page, "chase");
  await level(page, "Months"); await lineTo(page, 0.7); await shot("04-months");
  await level(page, "Weeks"); await lineTo(page, 0.7); await shot("05-weeks");
  const bar = await page.evaluate(() => { for (const h of document.querySelectorAll<HTMLElement>('[data-bw="row"][data-closed="0"]')) { const r = h.getBoundingClientRect(); if (r.top < 260 || r.bottom > innerHeight - 160) continue; const b = [...document.querySelectorAll<HTMLElement>(`[data-bw="bar"][data-row="${CSS.escape(h.dataset.id!)}"]`)].map((x) => x.getBoundingClientRect()).find((x) => x.width > 40 && x.left > 20 && x.right < innerWidth - 20); if (b) return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; } return null; });
  await offPE(page);
  if (bar) { await hold(page, bar.x, bar.y); await page.mouse.up(); await frame(page, 300); await shot("06-long-press-menu"); await page.locator('[data-bw="menu-veil"]').click({ position: { x: 10, y: 10 } }).catch(() => {}); await frame(page, 300); }
  await fitted(page);
  await hold(page, 230, 430, 520, 260); await shot("07-scrubbing"); await page.mouse.up(); await frame(page, 300);
  await seenAgo(page, 15 * 86_400_000); /* the harness's changes: 5 since 15 days ago */
  await openWorld(page);
  await page.locator('[data-bw="hawk-btn"]').click(); await frame(page, 500); await shot("08-hawk-things-changed");
  if (await page.locator('[data-bw="show-me"]').count()) { await page.locator('[data-bw="show-me"]').click(); await frame(page, 900); await shot("09-change-step"); }
  await seenAgo(page, null);
  await openWorld(page);
  await page.locator('[data-bw="hawk-btn"]').click(); await frame(page, 500); await shot("10-hawk-one-liner"); await page.locator('[data-bw="hawk-btn"]').click(); await frame(page, 200);
  for (let i = 0; i < 6; i++) { if (!(await page.locator('[data-bw="tip"]').count())) break; await page.locator('[data-bw="hawk-btn"]').click(); await frame(page, 200); }
  const row = await page.evaluate(() => { const h = document.querySelector<HTMLElement>('[data-bw="row"][data-closed="0"][data-nodate="0"]'); const r = h?.getBoundingClientRect(); return r ? { y: r.top + r.height / 2 } : null; });
  if (row) { await offPE(page); await page.mouse.click(200, row.y); await frame(page, 700); await shot("11-timeline-sheet"); await page.locator('[data-bw="sheet-close"]').click().catch(() => {}); await frame(page, 300); }
  await page.locator('[data-bw="key-btn"]').click(); await frame(page, 500); await shot("12-colour-key"); await page.locator('[data-bw="sheet-close"]').click().catch(() => {}); await frame(page, 300);
  await page.locator('[data-bw="search"]').click(); await frame(page, 500); await page.locator('[data-bw="search-input"]').fill("a"); await frame(page, 300); await shot("13-search");
  await page.locator('[data-bw="search-hit"]').nth(2).click().catch(() => {}); await frame(page, 1000); await shot("14-search-flown");
  await openWorld(page);
  await page.mouse.move(200, 300); await page.mouse.down(); for (let i = 1; i <= 14; i++) { await page.mouse.move(200, 300 + i * 12); await page.waitForTimeout(16); }
  await shot("15-pull-to-refresh"); await page.mouse.up(); await frame(page, 250); await shot("16-refreshing"); await frame(page, 1600);
  await level(page, "Weeks");
  const ndy = async () => page.evaluate(() => { const h = document.querySelector<HTMLElement>('[data-bw="row"][data-nodate="1"]'); return h ? h.getBoundingClientRect().top : null; });
  for (let i = 0; i < 40 && (await ndy()) == null; i++) await pan(page, 0, -300);
  const y17 = await ndy(); if (y17 != null) await pan(page, 0, 360 - y17);
  await lineTo(page, 0.55); await shot("17-no-date-rows");
  const chip = page.locator('[data-bw="ndset"]').first();
  if (await chip.count()) await chip.click().catch(() => {});
  else { const y = await ndy(); if (y != null) { await offPE(page); await page.mouse.click(200, y + 20); } }
  await frame(page, 600);
  if (await page.locator('[data-bw="sheet"][data-k="nodate"]').count()) { await shot("18-no-date-sheet"); await page.locator('[data-bw="veil"]').click({ position: { x: 10, y: 10 } }).catch(() => {}); await frame(page, 300); }
  await fitted(page);
  await page.locator('[data-bw="replay"]').click(); await page.waitForTimeout(3000); await shot("19-replay-midway");
  await page.waitForTimeout(3800); await shot("20-recap");
  const names = ["01-overview", "02-folded-groups", "03-pill-needs-chasing", "04-months", "05-weeks", "06-long-press-menu", "07-scrubbing", "08-hawk-things-changed", "09-change-step", "10-hawk-one-liner", "11-timeline-sheet", "12-colour-key", "13-search", "14-search-flown", "15-pull-to-refresh", "16-refreshing", "17-no-date-rows", "18-no-date-sheet", "19-replay-midway", "20-recap"];
  for (const n of names) copyFileSync(`design-refs/phone-birds-eye-world-v3/shots/${n}.png`, `${out}/${n}-ref.png`);
  writeFileSync(`${out}/index.html`, `<!doctype html><meta charset="utf-8"><title>Birds-eye world v3 — build beside ref</title><style>body{font:14px system-ui;background:#f2eee8;margin:24px}figure{display:inline-block;margin:0 24px 32px 0;vertical-align:top}img{width:390px;border-radius:24px;box-shadow:0 4px 16px #0002}h2{margin:24px 0 8px}</style>${names.map((n) => `<h2>${n}</h2><figure>${existsSync(`${out}/${n}-build.png`) ? `<img src="${n}-build.png">` : "<p>(not reached on this data)</p>"}<figcaption>build</figcaption></figure><figure><img src="${n}-ref.png"><figcaption>ref</figcaption></figure>`).join("")}`);
});

/* ══ the empty states: they change the harness's data, so they run last, in their own test ══ */
for (const mut of emptyRuns) {
  test(`Phone Birds-eye world v3 — empty states${mut ? ` · mutation ${mut}` : ""}`, async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "Chromium phone only");
    test.setTimeout(600_000);
    const L = new Ledger(mut, "empty");
    await signIn(page);
    /* waits for the card first: after the locks test, the emulator's writes can reach the page a few seconds late */
    const card = async (k: string) => { await page.locator(`[data-bw="card"][data-k="${k}"]`).waitFor({ timeout: 15_000 }).catch(() => {}); const r = await root(page); const c = (await box(page, '[data-bw="card"]'))[0]; return { k: r.card, shown: !!c && c.d.k === k && c.w > 200, text: c?.text ?? "" }; };
    const ALL_Q = await listQueries();
    const owed = ALL_Q.filter((q) => ["Partial Requested", "Full Requested", "Revise & Resubmit", "Offer"].includes(q.status));
    for (const q of owed) await setStatus(q.id, "Queried");
    await openWorld(page, `${WORLD}&court=you`);
    await mutate(page, mut);
    const you = await card("you");
    L.check("BW-11", `nothing with you: "Nothing’s with you" (population ${owed.length} set back)`, you.shown && /Nothing’s with you/.test(you.text) && /See all queries/.test(you.text), you.text);
    for (const q of ALL_Q) await setStatus(q.id, "Rejected");
    await openWorld(page);
    await mutate(page, mut);
    const closed = await card("closed");
    const below = await page.evaluate(() => { const c = document.querySelector('[data-bw="card"]')?.getBoundingClientRect(); const g = [...document.querySelectorAll<HTMLElement>('[data-bw="group"]')].find((e) => e.dataset.t === "Closed")?.getBoundingClientRect(); return c && g ? g.top - c.bottom : null; });
    L.check("BW-11", "only closed: the card at the top, the Closed section below it", closed.shown && /No open queries/.test(closed.text) && below != null && below > 0, `${closed.text} · gap ${below}`);
    let gone = 0, left: { id: string }[] = ALL_Q;
    for (let pass = 0; pass < 3 && left.length; pass++) {
      for (const q of left) { const d = await fetch(`${EMU}/users/${UID}/queries/${encodeURIComponent(q.id)}`, { method: "DELETE", headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(60_000) }); if (d.ok) gone++; }
      left = await listQueries();
    }
    L.check("BW-11", `the harness's queries deleted, emulator only (population ${gone}; ${left.length} left)`, gone > 0 && left.length === 0, "");
    await page.evaluate(async () => { for (const d of await indexedDB.databases()) if (d.name && /firestore/i.test(d.name)) await new Promise((r) => { const q = indexedDB.deleteDatabase(d.name!); q.onsuccess = q.onerror = q.onblocked = () => r(null); }); });
    await page.goto("about:blank");
    await openWorld(page);
    await mutate(page, mut);
    const none = await card("none");
    const look = await page.evaluate(() => { const l = document.querySelector<HTMLElement>('[data-bw="layer"]')!; const cs = getComputedStyle(l); return { filter: cs.filter, opacity: cs.opacity, chips: document.querySelectorAll('[data-bw="chip"], [data-bw="filter"]').length, /* polish v1: nor the filter button */ levels: getComputedStyle(document.querySelector('[data-bw="levels"]')!).display, bars: l.querySelectorAll('[data-bw="bar"]').length }; });
    L.check("BW-11", "no queries: \"No queries out yet\" over the sample, blurred 3px at 55%", none.shown && /No queries out yet/.test(none.text) && look.filter === "blur(3px)" && look.opacity === "0.55" && look.bars > 0, JSON.stringify({ text: none.text, ...look }));
    L.check("BW-11", "no queries: no pills or filter, and no level control", look.chips === 0 && look.levels === "none", JSON.stringify(look));
    L.done(5);
  });
}

/* ══ v3.2: before-and-after shots at 390 × 784 (BW_SHOTS32=before|after): All fitted, the With you pill, Weeks with the
      switch at rest, and the switch open (before v3.2 the switch is always open, so its "open" shot is the same) ══ */
test("Phone Birds-eye world v3.2 — before and after shots", async ({ page }, info) => {
  const tag = process.env.BW_SHOTS32;
  test.skip(info.project.name !== "pixel" || !tag, "BW_SHOTS32=before|after, Chromium phone");
  test.setTimeout(300_000);
  page.setDefaultTimeout(15_000);
  const out = "reports/phone-birds-eye-world-v3-2/shots"; mkdirSync(out, { recursive: true });
  const shot = (n: string) => page.screenshot({ path: `${out}/${n}-${tag}.png` });
  await signIn(page);
  await page.evaluate(() => { try { localStorage.setItem("bw1.hint.seen", "1"); } catch { /* */ } });
  await openWorld(page);
  await shot("1-all-fitted");
  await pill(page, "you"); await shot("2-with-you"); await pill(page, "you");
  await level(page, "Weeks"); await lineTo(page, 0.7); await shot("3-weeks-switch-at-rest");
  const chip = page.locator('[data-bw="level-chip"]');
  if (await chip.count()) { await chip.click(); await frame(page, 400); }
  await shot("4-switch-open");
});

/* ══ v3.3: before-and-after shots at 390 × 784 (BW_SHOTS33=before|after): Months with a gone-quiet row; the switch open ══ */
test("Phone Birds-eye world v3.3 — before and after shots", async ({ page }, info) => {
  const tag = process.env.BW_SHOTS33;
  test.skip(info.project.name !== "pixel" || !tag, "BW_SHOTS33=before|after, Chromium phone");
  test.setTimeout(300_000);
  page.setDefaultTimeout(15_000);
  const out = "reports/phone-birds-eye-world-v3-3/shots"; mkdirSync(out, { recursive: true });
  const shot = (n: string) => page.screenshot({ path: `${out}/${n}-${tag}.png` });
  await signIn(page);
  await page.evaluate(() => { try { localStorage.setItem("bw1.hint.seen", "1"); } catch { /* */ } });
  await openWorld(page);
  await level(page, "Months"); await lineTo(page, 0.8);
  /* the first gone-quiet bar on screen (scroll down to one if needed), held about a third of the way down */
  const qy = () => page.evaluate(() => { const b = document.querySelector<HTMLElement>('[data-bw="bar"][data-k="quiet"]'); return b ? b.getBoundingClientRect().top : null; });
  let y = await qy();
  for (let i = 0; i < 20 && (y == null || y < 260 || y > 700); i++) { await pan(page, 0, y == null ? -300 : 320 - y); y = await qy(); }
  await shot("1-months-gone-quiet");
  await level(page, "Weeks");
  const chip = page.locator('[data-bw="level-chip"]');
  if (await chip.count()) { await chip.click(); await frame(page, 400); }
  await shot("2-switch-open");
});
