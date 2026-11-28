/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone query sheet v1 — THE LOCKS AND THE SHOTS (design-refs/phone-query-sheet-v1), measured on the rendered page at
 * 390 × 784 (the desktop side of PQS-4 and PQS-5 at 1440 × 900, the Query Centre's own card and journeys).
 *
 *   PQS-1 gone quiet is for agents only · PQS-2 every door opens the one sheet at half height over its screen ·
 *   PQS-3 the handle and the dim · PQS-4 the footer button matches the desktop's · PQS-5 every journey saves what the
 *   desktop journey saves · PQS-6 the hand-overs · PQS-7 dates are a slider, never a calendar · PQS-8 the sheet stands
 *   back behind a journey · PQS-9 after a save: the new bubble, the strip, and Undo · PQS-10 no text under 12px, never
 *   "overdue" or "late"
 *
 * RED FIRST: `PQS_MUTATE=all` runs the green pass, then each lock under its own deliberate breakage; each must turn its
 * own lock red. Ledgers go to reports/phone-query-sheet-v1/ledger. `PQS_SHOTS=1` writes the build's shots beside the
 * ref's 01–23. ⚠️ PQS-4, PQS-5 and PQS-9 WRITE TO THE EMULATOR and undo every save they make (each e2e:emu run imports
 * a fresh snapshot and exports nothing).
 *
 * Run (through the slot): npm run e2e:emu -- tests/e2e/phoneQuerySheet.measure.ts --project pixel
 */
import { expect, test, type Page } from "@playwright/test";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/phone-query-sheet-v1";
const PHONE = { width: 390, height: 784 } as const;
const DESK = { width: 1440, height: 900 } as const;
const EMU = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
const HARNESS = JSON.parse(readFileSync("tests/emulator-seed/harness.json", "utf8")) as { docs: Record<string, Record<string, unknown>> };
const UID = Object.keys(HARNESS.docs).find((k) => /^users\/[^/]+$/.test(k))!.split("/")[1];
const frame = (page: Page, ms = 450) => page.waitForTimeout(ms);

const MUTS = ["gq", "half", "grab", "foot", "write", "hand", "cal", "back", "undo", "tiny"] as const;
type Mut = (typeof MUTS)[number] | "";
const MUT_LOCK: Record<Exclude<Mut, "">, string> = { gq: "PQS-1", half: "PQS-2", grab: "PQS-3", foot: "PQS-4", write: "PQS-5", hand: "PQS-6", cal: "PQS-7", back: "PQS-8", undo: "PQS-9", tiny: "PQS-10" };
const CSS_MUT: Partial<Record<Exclude<Mut, "">, string>> = {
  /* PQS-2: the sheet opens at full height */
  half: ".pqs-sheet.half { height: calc(100dvh - 52px) !important; }",
  /* PQS-3: the handle takes no finger */
  grab: ".pqs-grab { pointer-events: none !important; }",
  /* PQS-4: the footer's button gone */
  foot: ".pqs-ft .pri { display: none !important; }",
  /* PQS-8: the sheet does not stand back */
  back: ".pqs-sheet.back { transform: none !important; filter: none !important; }",
  /* PQS-9: the toast's Undo hidden */
  undo: '.pqs-toast [data-pqs="undo"] { display: none !important; }',
  /* PQS-10: a line under 12px */
  tiny: ".pqs-hd .dayn { font-size: 10px !important; }",
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public mut: Mut, public part: string) {}
  check(lock: string, where: string, ok: boolean, detail = "") { this.rows.push({ lock, where, ok: !!ok, detail: String(detail).slice(0, 700) }); }
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

/* ── the harness's data, through the emulator ── */
type Fields = Record<string, unknown>;
async function getDoc(path: string): Promise<Fields | null> {
  const r = await fetch(`${EMU}/${path}`, { headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(60_000) });
  if (!r.ok) return null;
  return ((await r.json()) as { fields?: Fields }).fields ?? {};
}
async function listDocs(path: string): Promise<{ id: string; f: Fields }[]> {
  const out: { id: string; f: Fields }[] = [];
  let token = "";
  for (let i = 0; i < 30; i++) {
    const r = await fetch(`${EMU}/${path}?pageSize=300${token ? `&pageToken=${token}` : ""}`, { headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(60_000) });
    const j = (await r.json()) as { documents?: { name: string; fields?: Fields }[]; nextPageToken?: string };
    for (const d of j.documents ?? []) out.push({ id: d.name.split("/").pop()!, f: d.fields ?? {} });
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return out;
}
/** a query's record: its doc, its log (queries/{id}/activity) and its feed rows (activities where queryId) */
async function record(id: string) {
  const [q, log, feed] = await Promise.all([getDoc(`users/${UID}/queries/${id}`), listDocs(`users/${UID}/queries/${id}/activity`),
    listDocs(`users/${UID}/activities`).then((xs) => xs.filter((x) => (x.f.queryId as { stringValue?: string } | undefined)?.stringValue === id))]);
  return { q, log, feed };
}
/** the record with the moment of writing taken out: write times and set-at stamps; dates to their day */
const VOLATILE = /^(createdAt|updatedAt|lastUpdated|.+SetAt|savedAt|writtenAt)$/;
function norm(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("timestampValue" in o) return String(o.timestampValue).slice(0, 10);
    /* a generated id (the new step's own: "act-…") differs on every save by design */
    if ("stringValue" in o) { const s = String(o.stringValue); return /^\d{4}-\d\d-\d\dT/.test(s) ? s.slice(0, 10) : /^act-[a-z0-9]+$/i.test(s) ? "<new id>" : s; }
    if ("mapValue" in o) return norm((o.mapValue as { fields?: Fields }).fields ?? {});
    if ("arrayValue" in o) return norm((o.arrayValue as { values?: unknown[] }).values ?? []);
    if ("integerValue" in o) return Number(o.integerValue);
    if ("doubleValue" in o) return o.doubleValue;
    if ("booleanValue" in o) return o.booleanValue;
    if ("nullValue" in o) return null;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) if (!VOLATILE.test(k)) out[k] = norm(o[k]);
    return out;
  }
  return v;
}
const normRec = (r: Awaited<ReturnType<typeof record>>) => ({
  q: norm(r.q),
  log: r.log.map((x) => JSON.stringify(norm(x.f))).sort(),
  feed: r.feed.map((x) => JSON.stringify(norm(x.f))).sort(),
});
/** what differs between two records, key by key (the query's fields; the log and feed rows only one side has) */
function diff(a: ReturnType<typeof normRec>, b: ReturnType<typeof normRec>): string[] {
  const out: string[] = [];
  const qa = (a.q ?? {}) as Record<string, unknown>, qb = (b.q ?? {}) as Record<string, unknown>;
  for (const k of new Set([...Object.keys(qa), ...Object.keys(qb)])) if (JSON.stringify(qa[k]) !== JSON.stringify(qb[k])) out.push(`q.${k}: ${JSON.stringify(qa[k])} | ${JSON.stringify(qb[k])}`);
  for (const [n, xa, xb] of [["log", a.log, b.log], ["feed", a.feed, b.feed]] as const) {
    for (const x of xa) if (!xb.includes(x)) out.push(`${n} only phone: ${x}`);
    for (const x of xb) if (!xa.includes(x)) out.push(`${n} only desk: ${x}`);
  }
  return out;
}
async function untilSame(id: string, want: string, ms = 15_000): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (JSON.stringify(normRec(await record(id))) === want) return true; await new Promise((r) => setTimeout(r, 500)); }
  return false;
}

/* ── pages ── */
async function signIn(page: Page) {
  await openRoute(page, "/dashboard", DESK); /* the harness's shell check is the desktop's */
  await page.evaluate(() => { try { localStorage.setItem("bw1.hint.seen", "1"); } catch { /* */ } });
}
async function phoneQueries(page: Page) {
  await page.setViewportSize(PHONE);
  await page.goto("/queries/all");
  await page.locator('[data-pa4="qrow"]:visible').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await frame(page, 700);
}
/** the phone's Queries row for `id`, opened */
async function openOnPhone(page: Page, id: string) {
  await phoneQueries(page);
  const row = page.locator(`[data-pa4="qrow"][data-id="${id}"]:visible`).first();
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await row.click();
  await page.locator('[data-pqs="sheet"]').waitFor({ timeout: 15_000 });
  await frame(page, 600);
}
const visibleIds = (page: Page) => page.locator('[data-pa4="qrow"]:visible').evaluateAll((els) => els.map((e) => e.getAttribute("data-id") ?? ""));
/** the first query (by the harness) whose status is one of `statuses` and that the phone list shows */
async function pick(page: Page, statuses: string[], not: string[] = []): Promise<string | null> {
  await phoneQueries(page);
  const shown = new Set(await visibleIds(page));
  for (const [k, v] of Object.entries(HARNESS.docs)) {
    const m = /^users\/[^/]+\/queries\/([^/]+)$/.exec(k);
    if (m && statuses.includes(String(v.status)) && shown.has(m[1]) && !not.includes(m[1]) && !m[1].startsWith("practice")) return m[1];
  }
  return null;
}
async function mutate(page: Page, mut: Mut) { const css = mut ? CSS_MUT[mut] : undefined; if (css) { await page.addStyleTag({ content: css }); await frame(page, 200); } }

/** walks the open journey (phone or desktop) to its review, answering with `prefs` where they are offered */
async function walk(page: Page, scope: string, prefs: string[], dayKey = "today"): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < 14; i++) {
    const root = page.locator(scope).first();
    if (await root.locator('[data-cj="save"]:visible, [data-rar="record"]:visible').count()) break;
    const step = (await root.locator('[data-cj="root"], [data-rar="root"]').first().getAttribute("data-step").catch(() => "")) ?? "";
    seen.push(step);
    const when = root.locator(`[data-k="${dayKey}"]:visible`).first();
    const exact = root.locator('[data-cj="went-ask"] button:visible, [data-rar="went-ask"] button:visible').first();
    let pref = null as null | ReturnType<typeof root.locator>;
    for (const k of prefs) { const b = root.locator(`.laq-big > button[data-k="${k}"]:visible, [data-rar="kind"][data-k="${k}"]:visible`).first(); if (await b.count()) { pref = b; break; } }
    const go = root.locator('[data-cj="go"]:visible, [data-rar="next"]:visible:not([disabled]), [data-rar="words-skip"]:visible').first();
    if (pref) await pref.click();
    else if (await when.count()) await when.click();
    else if (await exact.count()) await exact.click();
    else if (await go.count()) await go.click();
    else { const b = root.locator(".laq-big > button:visible").first(); if (!(await b.count())) break; await b.click(); }
    await frame(page, 650);
  }
  return seen;
}
/** the open journey's step (its shell's own `data-step`) */
const stepOf = (page: Page, scope: string) => page.locator(`${scope} [data-cj="root"], ${scope} [data-rar="root"]`).first().getAttribute("data-step").catch(() => "");
/** walks until the journey shows step `k` (by its own data-step), answering with `prefs`; true when it got there */
async function walkTo(page: Page, scope: string, k: string, prefs: string[] = []): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    if ((await stepOf(page, scope)) === k) return true;
    const root = page.locator(scope).first();
    let pref = null as null | ReturnType<typeof root.locator>;
    for (const p of prefs) { const b = root.locator(`.laq-big > button[data-k="${p}"]:visible, [data-rar="kind"][data-k="${p}"]:visible`).first(); if (await b.count()) { pref = b; break; } }
    const when = root.locator('[data-k="today"]:visible').first();
    const go = root.locator('[data-cj="go"]:visible, [data-rar="next"]:visible:not([disabled]), [data-rar="words-skip"]:visible').first();
    if (pref) await pref.click();
    else if (await when.count()) await when.click();
    else if (await go.count()) await go.click();
    else { const b = root.locator(".laq-big > button:visible").first(); if (!(await b.count())) return false; await b.click(); }
    await frame(page, 700);
  }
  return (await stepOf(page, scope)) === k;
}
const discard = async (page: Page, scope: string) => {
  await page.locator(`${scope} [data-cj="close"], ${scope} [data-rar="close"]`).first().click().catch(() => {}); await frame(page, 300);
  await page.locator(`${scope} [data-cj="leave-discard"], ${scope} [data-rar="leave-discard"]`).first().click({ timeout: 1500 }).catch(() => {}); await frame(page, 600);
};

test.use({ viewport: PHONE, deviceScaleFactor: 2 });
/* Phone Birds-eye first look v1: the day's first open of Birds-eye plays a two-second grow-in that holds the world's
   frame; these readings are of the world at rest, so today's first look is marked as already seen (the app's own
   day stamp, lib/phoneV41 `dayStamp`). The grow-in's own locks are phoneBirdsFirstLook.measure.ts. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { const d = new Date(); localStorage.setItem("bw1.firstLook.day", `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`); } catch { /* */ } });
});
const runs: Mut[] = process.env.PQS_MUTATE === "all" ? ["", ...MUTS] : process.env.PQS_MUTATE ? (process.env.PQS_MUTATE.split(",") as Mut[]) : [""];
const ONLY = (process.env.PQS_ONLY ?? "").split(",").filter(Boolean);
const on = (k: string) => !ONLY.length || ONLY.includes(k);

for (const mut of runs) {
  test(`Phone query sheet v1 — the locks${mut ? ` · mutation ${mut}` : ""}`, async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "Chromium phone only");
    test.setTimeout(1_500_000);
    page.setDefaultTimeout(20_000);
    const L = new Ledger(mut, "locks");
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`pageerror: ${String(e).slice(0, 300)}`));
    await signIn(page);
    const used: string[] = [];

    /* ── PQS-1 · gone quiet is for agents only ── */
    if (on("PQS-1")) {
      await page.setViewportSize(PHONE);
      await page.goto("/queries/all?view=birds");
      await page.locator('[data-bw="world"]').first().waitFor({ timeout: 30_000 }); await frame(page, 1200);
      if (mut === "gq") await page.evaluate(() => { const qd = Number(document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset.quietdays); const h = [...document.querySelectorAll<HTMLElement>('[data-bw="row"][data-you="1"]')].find((x) => x.dataset.dueday !== "" && -Number(x.dataset.dueday) > qd); if (h) { const b = document.createElement("i"); b.dataset.bw = "bar"; b.dataset.k = "quiet"; b.dataset.row = h.dataset.id!; document.querySelector('[data-bw="layer"]')!.appendChild(b); } });
      const r = await page.evaluate(() => {
        const qd = Number(document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset.quietdays);
        const quietIds = new Set([...document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="quiet"]')].map((b) => b.dataset.row!));
        const heads = [...document.querySelectorAll<HTMLElement>('[data-bw="group"]')].map((g) => ({ g: g.dataset.g!, top: g.getBoundingClientRect().top })).sort((a, b) => a.top - b.top);
        const i = heads.findIndex((h) => h.g === "Needs action"), lo = heads[i]?.top ?? 0, hi = heads[i + 1]?.top ?? Infinity;
        const rows = [...document.querySelectorAll<HTMLElement>('[data-bw="row"]')].map((h) => ({ id: h.dataset.id!, top: h.getBoundingClientRect().top, you: h.dataset.you === "1", due: h.dataset.dueday === "" ? null : Number(h.dataset.dueday) }))
          .filter((x) => x.top > lo && x.top < hi).sort((a, b) => a.top - b.top);
        const past = (x: { due: number | null }) => x.due != null && x.due < 0 && -x.due > qd;
        /* a tail that went quiet a day or two ago is too thin to draw at the fitted view: judge the fade on rows well past */
        const well = (x: { due: number | null }) => x.due != null && -x.due > qd + 3;
        const youPast = rows.filter((x) => x.you && past(x)), waitPast = rows.filter((x) => !x.you && well(x));
        const lastOther = Math.max(-1, ...rows.map((x, k) => (x.you || !past(x) ? k : -1)));
        const firstQuiet = rows.findIndex((x) => !x.you && past(x));
        return { qd, youPast: youPast.map((x) => ({ id: x.id, fade: quietIds.has(x.id) })), waitPast: waitPast.map((x) => ({ id: x.id, fade: quietIds.has(x.id) })), lastOther, firstQuiet };
      });
      L.check("PQS-1", `with-you queries past their send-by by more than ${r.qd} days (population ${r.youPast.length}): no fade`, r.youPast.length > 0 && r.youPast.every((x) => !x.fade), JSON.stringify(r.youPast.filter((x) => x.fade).slice(0, 4)));
      L.check("PQS-1", `waiting queries that far past (population ${r.waitPast.length}): faded`, r.waitPast.length > 0 && r.waitPast.every((x) => x.fade), JSON.stringify(r.waitPast.filter((x) => !x.fade).slice(0, 4)));
      L.check("PQS-1", "Needs action: every gone-quiet (waiting) row below every other, with-you ones among the rest", r.firstQuiet > r.lastOther, JSON.stringify({ firstQuiet: r.firstQuiet, lastOther: r.lastOther }));
    }

    /* ── PQS-2 · each door opens the same sheet, at half height, over the screen it came from ── */
    const sheetRead = () => page.evaluate(() => {
      const s = document.querySelector<HTMLElement>('[data-pqs="sheet"]'), root = document.querySelector<HTMLElement>('[data-pqs="root"]');
      const r = s?.getBoundingClientRect();
      return { open: !!s, id: root?.dataset.id ?? "", h: s?.dataset.h ?? "", height: r ? Math.round(r.height) : 0, top: r ? Math.round(r.top) : 0, path: location.pathname + location.search, comp: document.querySelectorAll('[data-pqs="root"]').length };
    });
    const half = Math.round(PHONE.height * 430 / 784);
    if (on("PQS-2")) {
      const door = async (name: string, path: string, open: () => Promise<boolean>) => {
        await page.setViewportSize(PHONE);
        await page.goto(path); await frame(page, 1800);
        await mutate(page, mut === "half" ? "half" : "");
        const ok = await open().catch((e) => { console.log(`  door ${name}: ${String(e).slice(0, 300)}`); return false; });
        await frame(page, 800);
        const s = await sheetRead();
        const behind = path.split("?")[0];
        L.check("PQS-2", `${name}: the one sheet (${s.comp}), at half height (${s.height}px of ${half}), over ${behind}`, ok && s.open && s.comp === 1 && s.h === "half" && Math.abs(s.height - half) <= 2 && s.path.startsWith(behind), JSON.stringify({ ok, ...s }));
        await page.locator('[data-pqs="close"]').click({ timeout: 3000 }).catch(() => {}); await frame(page, 500);
      };
      await door("a Queries row", "/queries/all", async () => { await page.locator('[data-pa4="qrow"]:visible').first().click(); return true; });
      await door("a Today card", "/dashboard", async () => {
        const c = page.locator('[data-ps="move-row"]:visible, [data-pa4="feed-row"]:visible').first();
        if (!(await c.count())) return false;
        await c.click(); return true;
      });
      await door("a search result", "/queries/all", async () => {
        await page.locator('[data-pa4="search"]:visible').first().click(); await frame(page, 600);
        await page.locator('[data-pa4="sterm"]').fill("a"); await frame(page, 600);
        await page.locator('[data-pa4="search-page"] [data-pa4="qrow"]:visible').first().click(); return true;
      });
      const noHits = ".bw-hsw, .bw-gh0, .bw-fline, .bw-ruler, .bw-inm, .bw-ovd { pointer-events: none !important; }";
      await door("a Birds-eye bar", "/queries/all?view=birds", async () => {
        await page.addStyleTag({ content: noHits });
        const y = await page.evaluate(() => { const h = document.querySelector<HTMLElement>('[data-bw="row"][data-nodate="0"][data-closed="0"]'); const r = h?.getBoundingClientRect(); return r ? r.top + r.height / 2 : null; });
        if (y == null) return false;
        await page.mouse.click(200, y); return true;
      });
      await door("Birds-eye's long-press Open query", "/queries/all?view=birds", async () => {
        await page.addStyleTag({ content: noHits });
        await page.locator('[data-bw="level-chip"]').click(); await frame(page, 250);
        await page.locator('[data-bw="level"][data-t="Weeks"]').click(); await frame(page, 800);
        const find = () => page.evaluate(() => { for (const h of document.querySelectorAll<HTMLElement>('[data-bw="row"]')) { const r = h.getBoundingClientRect(); if (r.top < 250 || r.bottom > innerHeight - 160) continue; const b = [...document.querySelectorAll<HTMLElement>(`[data-bw="bar"][data-row="${CSS.escape(h.dataset.id!)}"]`)].map((x) => x.getBoundingClientRect()).find((x) => x.width > 40 && x.left > 20 && x.right < innerWidth - 20); if (b) return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; } return null; });
        /* the order puts long bars off the first screen: scroll on until one fits (as Birds-eye's BW-23 does) */
        let pt = await find();
        for (let i = 0; i < 12 && !pt; i++) { await page.mouse.move(200, 450); await page.mouse.wheel(0, 300); await frame(page, 300); pt = await find(); }
        if (!pt) return false;
        await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.waitForTimeout(520); await page.mouse.up(); await frame(page, 400);
        await page.locator('[data-bw="menu-act"][data-act="open"]').click(); return true;
      });
    }

    /* ── PQS-3 · the handle drags to full and back to half; far down closes; the dim closes ── */
    if (on("PQS-3")) {
      const id = (await pick(page, ["Queried", "Partial Requested"]))!;
      await openOnPhone(page, id);
      await mutate(page, mut === "grab" ? "grab" : "");
      const drag = async (dy: number) => { const g = await page.locator('[data-pqs="grab"]').boundingBox(); if (!g) return; const x = g.x + g.width / 2, y = g.y + g.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(x, y + (dy * i) / 8); await page.waitForTimeout(16); } await page.mouse.up(); await frame(page, 700); };
      await drag(-320); const full = await sheetRead();
      await drag(200); const back = await sheetRead();
      L.check("PQS-3", `dragged up: full (${full.height}px, top ${full.top})`, full.h === "full" && Math.abs(full.top - 52) <= 2, JSON.stringify(full));
      L.check("PQS-3", `dragged down: back to half (${back.height}px)`, back.h === "half" && Math.abs(back.height - half) <= 2, JSON.stringify(back));
      await drag(330); const gone = await sheetRead();
      L.check("PQS-3", "dragged far down: closed", !gone.open, JSON.stringify(gone));
      await openOnPhone(page, id);
      await mutate(page, mut === "grab" ? "grab" : "");
      await page.mouse.click(195, 120); await frame(page, 700);
      const dimmed = await sheetRead();
      L.check("PQS-3", "a tap on the dim closes it", !dimmed.open, JSON.stringify(dimmed));
    }

    /* ── PQS-4 · the footer button's label and tone match the desktop's, state by state ── */
    if (on("PQS-4")) {
      const readPhone = async (id: string) => {
        await openOnPhone(page, id);
        await mutate(page, mut === "foot" ? "foot" : "");
        return page.evaluate(() => { const b = document.querySelector<HTMLElement>('[data-pqs="primary"]'); return b && getComputedStyle(b).display !== "none" ? { label: (b.textContent ?? "").replace(/\s+/g, " ").trim(), tone: b.dataset.tone ?? "" } : { label: "", tone: "none" }; });
      };
      const readDesk = async (id: string) => {
        await page.setViewportSize(DESK);
        await page.goto(`/queries?q=${encodeURIComponent(id)}`);
        const panel = page.locator(`[data-qp="panel"][data-qp-id="${id}"]`);
        await panel.waitFor({ timeout: 20_000 }).catch(() => {}); await frame(page, 900);
        const r = await panel.evaluate((p) => { const b = p.querySelector<HTMLElement>('[data-qc152="reply-btn"]'); return b ? { label: (b.textContent ?? "").replace(/\s+/g, " ").trim(), tone: b.dataset.tone ?? "" } : { label: "", tone: "none" }; }).catch(() => ({ label: "?", tone: "?" }));
        await page.setViewportSize(PHONE);
        return r;
      };
      for (const [name, st] of [["partial requested", ["Partial Requested"]], ["waiting", ["Queried"]], ["offer", ["Offer"]], ["closed", ["Rejected", "No Response"]]] as [string, string[]][]) {
        const id = await pick(page, st);
        if (!id) { L.check("PQS-4", `${name}: a query to read (population: none)`, false, ""); continue; }
        const ph = await readPhone(id), dk = await readDesk(id);
        L.check("PQS-4", `${name}: "${ph.label}" (${ph.tone}) on the phone, "${dk.label}" (${dk.tone}) on the desktop`, !!dk.label && ph.label === dk.label && ph.tone === dk.tone, JSON.stringify({ ph, dk }));
      }
      /* signed (the harness has none): accept an offer on the phone, read both sides, then Undo it on the phone */
      const oid = await pick(page, ["Offer"]);
      if (oid) {
        const base = JSON.stringify(normRec(await record(oid)));
        await openOnPhone(page, oid);
        await page.locator('[data-pqs="primary"]').click(); await frame(page, 900);
        await walk(page, '[data-pqj="journey"]', ["yes", "no"]);
        await page.locator('[data-pqj="journey"] [data-cj="save"]').click().catch(() => {}); await frame(page, 2000);
        await mutate(page, mut === "foot" ? "foot" : "");
        const ph = await page.evaluate(() => { const b = document.querySelector<HTMLElement>('[data-pqs="primary"]'); return { tone: b ? b.dataset.tone ?? "" : "none", lead: document.querySelector('[data-pqs="lead"]')?.textContent ?? "" }; });
        await page.locator('[data-pqs="toast"] [data-pqs="undo"]').click({ timeout: 3000 }).catch(() => {});
        await untilSame(oid, base);
        L.check("PQS-4", `signed ("${ph.lead}"): no button on the phone (desktop footer1522: none on Offer accepted)`, ph.tone === "none" && !!ph.lead, JSON.stringify(ph));
      }
    }

    /* ── PQS-5 · every journey walks to its save on the phone and writes exactly what the desktop journey writes ── */
    if (on("PQS-5")) {
      const journeys: { k: string; st: string[]; prefs: string[] }[] = [
        { k: "send", st: ["Partial Requested", "Full Requested"], prefs: [] },
        { k: "close", st: ["Queried"], prefs: ["noreply"] },
        { k: "reopen", st: ["Rejected", "No Response"], prefs: ["soon"] },
        { k: "offer", st: ["Offer"], prefs: ["no"] },
        { k: "resp", st: ["Queried"], prefs: ["no"] },
      ];
      for (const jy of journeys) {
        const id = await pick(page, jy.st, used);
        if (!id) { L.check("PQS-5", `${jy.k}: a query to walk (population: none)`, false, ""); continue; }
        used.push(id);
        const base = JSON.stringify(normRec(await record(id)));
        /* the phone */
        await openOnPhone(page, id);
        if (jy.k === "close") { await page.locator('[data-pqs="more"]').click(); await frame(page, 300); await page.locator('[data-pqs="menu"] [data-act="close"]').click(); }
        else if (jy.k === "resp" && await page.locator('[data-pqs="foot-replied"]').count()) await page.locator('[data-pqs="foot-replied"]').click();
        else await page.locator('[data-pqs="primary"]').click();
        await frame(page, 900);
        const kind = await page.locator('[data-pqj="journey"]').getAttribute("data-kind").catch(() => null);
        await walk(page, '[data-pqj="journey"]', jy.prefs, mut === "write" ? "yesterday" : "today");
        await page.locator('[data-pqj="journey"] [data-cj="save"], [data-pqj="journey"] [data-rar="record"]').first().click().catch(() => {}); await frame(page, 2400);
        const ph = normRec(await record(id));
        await page.locator('[data-pqs="toast"] [data-pqs="undo"]').click({ timeout: 4000 }).catch(() => {});
        const back0 = await untilSame(id, base);
        /* the desktop: the Query Centre's own card and journey */
        await page.setViewportSize(DESK);
        await page.goto(`/queries?q=${encodeURIComponent(id)}`);
        const panel = page.locator(`[data-qp="panel"][data-qp-id="${id}"]`);
        await panel.waitFor({ timeout: 20_000 }).catch(() => {}); await frame(page, 900);
        if (jy.k === "close") await panel.locator('[data-qc1522="footer"] button').filter({ hasText: /^Close/ }).first().click().catch(() => {});
        else if (jy.k === "resp" && await panel.locator('[data-qc1522="foot-replied"]').count()) await panel.locator('[data-qc1522="foot-replied"]').click().catch(() => {});
        else await panel.locator('[data-qc152="reply-btn"]').click().catch(() => {});
        await frame(page, 900);
        await walk(page, '[data-side-panel][data-rar="panel"]', jy.prefs, "today");
        await page.locator('[data-side-panel][data-rar="panel"] [data-cj="save"], [data-side-panel][data-rar="panel"] [data-rar="record"]').first().click().catch(() => {}); await frame(page, 2800);
        const dk = normRec(await record(id));
        await page.locator('[data-side-panel][data-rar="panel"] [data-cj="undo"], [data-side-panel][data-rar="panel"] [data-rar="undo"]').first().click({ timeout: 4000 }).catch(() => {});
        const back1 = await untilSame(id, base);
        const same = JSON.stringify(ph) === JSON.stringify(dk), changed = JSON.stringify(ph) !== base;
        L.check("PQS-5", `${jy.k} (${kind}) on ${id}: the phone's save writes what the desktop's writes (query, log, feed)`, changed && same, same ? (changed ? "" : "nothing was written") : diff(ph, dk).join(" ‖ ").slice(0, 700));
        L.check("PQS-5", `${jy.k}: both saves undone (the record back as it was)`, back0 && back1, JSON.stringify({ back0, back1 }));
        await page.setViewportSize(PHONE);
      }
    }

    /* ── PQS-6 · the hand-overs land in Record a response at the right step; no Carry on on the way ── */
    if (on("PQS-6")) {
      const cid = (await pick(page, ["Queried"], used))!;
      await openOnPhone(page, cid);
      await page.locator('[data-pqs="more"]').click(); await frame(page, 300);
      await page.locator('[data-pqs="menu"] [data-act="close"]').click(); await frame(page, 900);
      await page.locator('[data-pqj="journey"] .laq-big > button[data-k="passed"]').click().catch(() => {}); await frame(page, 900);
      if (mut === "hand") await page.evaluate(() => { const f = document.querySelector('[data-pqj="journey"] [data-rar="foot"], [data-pqj="journey"] [data-cj="foot"]'); if (f) { const b = document.createElement("button"); b.dataset.cj = "go"; b.textContent = "Carry on"; f.appendChild(b); } });
      const at = await page.evaluate(() => { const j = document.querySelector<HTMLElement>('[data-pqj="journey"]'); const r = j?.querySelector<HTMLElement>('[data-rar="root"]'); return { kind: j?.dataset.kind ?? "", step: r?.dataset.step ?? "", go: j?.querySelectorAll('[data-cj="go"]').length ?? -1, passed: r?.dataset.kind === "no" }; });
      L.check("PQS-6", `Close → passed: Record a response at "${at.step}", Passed chosen, no Carry on on the hand-over (${at.go})`, at.kind === "resp" && at.step === "when" && at.passed && at.go === 0, JSON.stringify(at));
      await discard(page, '[data-pqj="journey"]');
      const rid = (await pick(page, ["Rejected", "No Response"], used))!;
      await openOnPhone(page, rid);
      await page.locator('[data-pqs="primary"]').click(); await frame(page, 900);
      await page.locator('[data-pqj="journey"] .laq-big > button[data-k="replied"]').click().catch(() => {}); await frame(page, 900);
      if (mut === "hand") await page.evaluate(() => { const f = document.querySelector('[data-pqj="journey"] [data-rar="foot"]'); if (f) { const b = document.createElement("button"); b.dataset.cj = "go"; b.textContent = "Carry on"; f.appendChild(b); } });
      const at2 = await page.evaluate(() => { const j = document.querySelector<HTMLElement>('[data-pqj="journey"]'); const r = j?.querySelector<HTMLElement>('[data-rar="root"]'); return { kind: j?.dataset.kind ?? "", step: r?.dataset.step ?? "", go: j?.querySelectorAll('[data-cj="go"]').length ?? -1 }; });
      L.check("PQS-6", `Reopen → replied: Record a response at "${at2.step}" ("What did … say?"), no Carry on (${at2.go})`, at2.kind === "resp" && at2.step === "reply" && at2.go === 0, JSON.stringify(at2));
      await discard(page, '[data-pqj="journey"]');
    }

    /* ── PQS-7 · "An earlier date" is a slider and cannot go before the last event; no calendar or date pills ── */
    if (on("PQS-7")) {
      const id = (await pick(page, ["Partial Requested", "Full Requested"], used))!;
      await openOnPhone(page, id);
      await page.locator('[data-pqs="primary"]').click(); await frame(page, 900);
      const calSeen: string[] = [];
      let slider = null as null | { min: number; max: number };
      for (let i = 0; i < 8; i++) {
        if (mut === "cal") await page.evaluate(() => { const j = document.querySelector('[data-pqj="journey"] [data-cj="body"], [data-pqj="journey"] [data-rar="body"]'); if (j && !j.querySelector('[data-cj="calendar"]')) { const c = document.createElement("div"); c.dataset.cj = "calendar"; j.appendChild(c); } });
        calSeen.push(...await page.evaluate(() => [...document.querySelectorAll('[data-pqj="journey"] [data-cj="calendar"], [data-pqj="journey"] [data-rar="calendar"], [data-pqj="journey"] [data-cj="cal-day"], [data-pqj="journey"] [data-rar="cal-day"], [data-pqj="journey"] .laq-cal')].map((e) => (e as HTMLElement).dataset.cj ?? (e as HTMLElement).dataset.rar ?? "cal")));
        const early = page.locator('[data-pqj="journey"] .laq-big > button[data-k="earlier"]:visible').first();
        if (await early.count()) {
          await early.click(); await frame(page, 600);
          calSeen.push(...await page.evaluate(() => [...document.querySelectorAll('[data-pqj="journey"] [data-cj="calendar"], [data-pqj="journey"] .laq-cal')].map(() => "cal")));
          const box = await page.locator('[data-pqj="journey"] .pqj-days').first().evaluate((e) => ({ min: Number((e as HTMLElement).dataset.min), max: Number((e as HTMLElement).dataset.max), range: !!e.querySelector('input[type="range"]') })).catch(() => null);
          if (box?.range) slider = { min: box.min, max: box.max };
          break;
        }
        const ex = page.locator('[data-pqj="journey"] [data-cj="went-ask"] button:visible').first();
        if (await ex.count()) await ex.click(); else await page.locator('[data-pqj="journey"] [data-cj="go"]:visible, [data-pqj="journey"] .laq-big > button:visible').first().click().catch(() => {});
        await frame(page, 600);
      }
      const r = await record(id);
      /* the last event: the log's and the feed's dates, and the query's own last status change */
      const days = [...r.log, ...r.feed].map((x) => norm((x.f as Fields).date ?? (x.f as Fields).createdAt)).concat([norm((r.q ?? {}).lastStatusChange)]).filter((s): s is string => typeof s === "string").map((s) => new Date(`${s}T00:00:00`).getTime()).filter(Number.isFinite);
      const last = days.length ? Math.max(...days) : NaN;
      L.check("PQS-7", `"An earlier date" is a slider (${slider ? `${new Date(slider.min).toDateString()} to ${new Date(slider.max).toDateString()}` : "none"})`, !!slider, JSON.stringify(slider));
      L.check("PQS-7", `it cannot go before the last event (${Number.isFinite(last) ? new Date(last).toDateString() : "—"})`, !!slider && Number.isFinite(last) && slider.min >= last, JSON.stringify({ slider, last }));
      L.check("PQS-7", "no calendar and no date pills anywhere in the journey", calSeen.length === 0, JSON.stringify(calSeen.slice(0, 6)));
      await discard(page, '[data-pqj="journey"]');
    }

    /* ── PQS-8 · a journey open: the sheet behind it (scaled 0.94, dimmed 0.72), its strip above; Cancel restores ── */
    if (on("PQS-8")) {
      const id = (await pick(page, ["Queried"], used))!;
      await openOnPhone(page, id);
      await mutate(page, mut === "back" ? "back" : "");
      await page.locator('[data-pqs="primary"]').click(); await frame(page, 1100);
      const behind = await page.evaluate(() => {
        const s = document.querySelector<HTMLElement>('[data-pqs="sheet"]')!, j = document.querySelector<HTMLElement>('[data-pqj="journey"]')!;
        const cs = getComputedStyle(s), m = new DOMMatrixReadOnly(cs.transform === "none" ? undefined : cs.transform);
        const strip = s.querySelector<HTMLElement>('[data-pqs="strip"]')!.getBoundingClientRect(), jt = j.getBoundingClientRect().top;
        return { back: s.classList.contains("back"), scale: Math.round(m.a * 1000) / 1000, filter: cs.filter, stripTop: Math.round(strip.top), journeyTop: Math.round(jt) };
      });
      L.check("PQS-8", `behind the journey: scaled ${behind.scale}, ${behind.filter}, its strip at ${behind.stripTop} above the journey at ${behind.journeyTop}`, behind.back && Math.abs(behind.scale - 0.94) < 0.01 && /brightness\(0\.72\)/.test(behind.filter) && behind.stripTop < behind.journeyTop, JSON.stringify(behind));
      await page.locator('[data-pqj="journey"] [data-rar="cancel"], [data-pqj="journey"] [data-cj="cancel"]').first().click().catch(() => {}); await frame(page, 400);
      await page.locator('[data-pqj="journey"] [data-cj="leave-discard"], [data-pqj="journey"] [data-rar="leave-discard"]').first().click({ timeout: 1500 }).catch(() => {}); await frame(page, 800);
      const after = await page.evaluate(() => { const s = document.querySelector<HTMLElement>('[data-pqs="sheet"]')!; const cs = getComputedStyle(s); return { back: s.classList.contains("back"), filter: cs.filter, journey: !!document.querySelector('[data-pqj="journey"]'), h: s.dataset.h }; });
      L.check("PQS-8", "Cancel brings it forward (no scale, no dim, no journey), at the height it was", !after.back && !after.journey && after.filter === "none" && after.h === "half", JSON.stringify(after));
    }

    /* ── PQS-9 · after a save: the new bubble last in Tracking, the strip's new stage, Undo restores exactly ── */
    if (on("PQS-9")) {
      const id = (await pick(page, ["Partial Requested", "Full Requested"], used))!;
      used.push(id);
      const base = JSON.stringify(normRec(await record(id)));
      await openOnPhone(page, id);
      await mutate(page, mut === "undo" ? "undo" : "");
      const n0 = await page.locator('[data-pqs="bubble"]').count();
      await page.locator('[data-pqs="primary"]').click(); await frame(page, 900);
      await walk(page, '[data-pqj="journey"]', []);
      await page.locator('[data-pqj="journey"] [data-cj="save"]').click().catch(() => {}); await frame(page, 2400);
      const after = await page.evaluate(() => {
        const bs = [...document.querySelectorAll<HTMLElement>('[data-pqs="bubble"]')];
        const last = bs[bs.length - 1];
        return { n: bs.length, last: last?.querySelector("b")?.textContent ?? "", strip: document.querySelector('[data-pqs="stage"]')?.textContent ?? "", status: document.querySelector<HTMLElement>('[data-pqs="strip"]')?.dataset.status ?? "" };
      });
      L.check("PQS-9", `the new bubble ("${after.last}") is the last in Tracking (${n0} → ${after.n})`, after.n === n0 + 1 && /sent/i.test(after.last), JSON.stringify(after));
      L.check("PQS-9", `the strip shows the new stage (${after.strip})`, /sent/i.test(after.strip) && /Sent/.test(after.status), JSON.stringify(after));
      await page.locator('[data-pqs="toast"] [data-pqs="undo"]').click({ timeout: 3000 }).catch(() => {});
      const restored = await untilSame(id, base, 12_000);
      L.check("PQS-9", "Undo restores the query exactly (its doc, log and feed)", restored, "");
    }

    /* ── PQS-10 · no text under 12px in the sheet or a journey; never "overdue" or "late" ── */
    if (on("PQS-10")) {
      const id = (await pick(page, ["Partial Requested"], used))!;
      await openOnPhone(page, id);
      await mutate(page, mut === "tiny" ? "tiny" : "");
      const small: string[] = [], words: string[] = [];
      const sweep = async (where: string) => {
        const r = await page.evaluate((w) => {
          const out: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>(`${w} *`)) {
            if (!el.getClientRects().length || getComputedStyle(el).visibility === "hidden") continue;
            const own = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
            if (own && parseFloat(getComputedStyle(el).fontSize) < 11.95) out.push(`${el.className} ${getComputedStyle(el).fontSize} "${(el.textContent ?? "").trim().slice(0, 20)}"`);
          }
          return { small: out, text: document.querySelector<HTMLElement>(w)?.innerText ?? "" };
        }, where);
        small.push(...r.small.map((x) => `${where}: ${x}`));
        const m = /.{0,30}(overdue|\blate\b).{0,30}/i.exec(r.text); if (m) words.push(`${where}: ${m[0]}`);
      };
      for (const k of ["tracking", "agent", "materials", "notes"]) { await page.locator(`[data-pqs="tab"][data-k="${k}"]`).click(); await frame(page, 300); await sweep('[data-pqs="root"]'); }
      await page.locator('[data-pqs="tab"][data-k="tracking"]').click();
      await page.locator('[data-pqs="primary"]').click(); await frame(page, 900);
      for (let i = 0; i < 6; i++) { await sweep('[data-pqj="journey"]'); const go = page.locator('[data-pqj="journey"] [data-cj="went-ask"] button:visible, [data-pqj="journey"] [data-k="today"]:visible, [data-pqj="journey"] [data-cj="go"]:visible').first(); if (!(await go.count())) break; await go.click(); await frame(page, 600); }
      L.check("PQS-10", "no text under 12px (the sheet's four tabs, the journey's steps)", small.length === 0, small.slice(0, 5).join(" | "));
      L.check("PQS-10", 'never "overdue" or "late"', words.length === 0, words.join(" | "));
      await discard(page, '[data-pqj="journey"]');
    }

    const ours = errs.filter((e) => /QuerySheet|QueryJourney|StepEditSheet|PhoneDaySlider|PhonePreviewCard/.test(e));
    L.check("PQS-10", `no error from the sheet or the journeys (population ${errs.length} page errors in all)`, ours.length === 0, ours.slice(0, 3).join(" | "));
    L.done(ONLY.length ? 1 : 30);
  });
}

/* ══ the shots: the build in the states of the ref's 01–23, each beside the ref's ══ */
test("Phone query sheet v1 — the shots beside the ref's", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel" || !process.env.PQS_SHOTS, "PQS_SHOTS=1, Chromium phone");
  test.setTimeout(900_000);
  page.setDefaultTimeout(15_000);
  const out = `${DIR}/shots`; mkdirSync(out, { recursive: true });
  const shot = (n: string) => page.screenshot({ path: `${out}/${n}-build.png` });
  const j = '[data-pqj="journey"]';
  const step = async (sel: string) => { await page.locator(`${j} ${sel}`).first().click().catch(() => {}); await frame(page, 750); };
  await signIn(page);
  const pr = (await pick(page, ["Partial Requested"]))!;
  await openOnPhone(page, pr);
  await shot("01-sheet-half");
  await page.locator('[data-pqs="grab"]').click(); await frame(page, 600); await shot("02-sheet-full");
  await page.locator('[data-pqs="tab"][data-k="agent"]').click(); await frame(page, 300); await shot("03-tab-agent");
  await page.locator('[data-pqs="tab"][data-k="materials"]').click(); await frame(page, 300); await shot("04-tab-materials");
  await page.locator('[data-pqs="tab"][data-k="notes"]').click(); await frame(page, 300); await shot("05-tab-notes");
  await page.locator('[data-pqs="tab"][data-k="tracking"]').click(); await frame(page, 300);
  await page.locator('[data-pqs="more"]').click(); await frame(page, 300); await shot("06-menu");
  await page.locator('[data-pqs="more"]').click(); await frame(page, 200);
  /* Mark sent: each shot when the journey shows that step (its own data-step) */
  await page.locator('[data-pqs="primary"]').click(); await frame(page, 900);
  if (await walkTo(page, j, "went")) await shot("07-sent-what");
  if (await walkTo(page, j, "sent")) await shot("08-sent-when");
  await step('.laq-big > button[data-k="earlier"]'); await shot("09-earlier-date-slider");
  await step('.laq-big > button[data-k="earlier"]');
  if (await walkTo(page, j, "reply")) await shot("10-sent-reply-time");
  if (await walkTo(page, j, "log")) await shot("11-sent-review");
  await step('[data-cj="save"]'); await frame(page, 900); await shot("12-sent-saved");
  await page.locator('[data-pqs="toast"] [data-pqs="undo"]').click().catch(() => {}); await frame(page, 1500);
  await page.locator('[data-pqs="close"]').click().catch(() => {}); await frame(page, 400);
  /* Record a response (a partial asked for) */
  const wq = (await pick(page, ["Queried"]))!;
  await openOnPhone(page, wq);
  if (await page.locator('[data-pqs="foot-replied"]').count()) await page.locator('[data-pqs="foot-replied"]').click(); else await page.locator('[data-pqs="primary"]').click();
  await frame(page, 900);
  if (await walkTo(page, j, "reply")) await shot("13-rar-reply");
  if (await walkTo(page, j, "asked", ["pr"])) await shot("14-rar-asked");
  if (await walkTo(page, j, "sent", ["pr"])) await shot("15-rar-sendby");
  if (await walkTo(page, j, "check", ["pr"])) await shot("16-rar-review");
  await discard(page, j);
  /* Close (the desktop hands "{First} passed" straight to Record a response: its next screen is the shot) */
  await page.locator('[data-pqs="more"]').click(); await frame(page, 300);
  await page.locator('[data-pqs="menu"] [data-act="close"]').click(); await frame(page, 900);
  if (await walkTo(page, j, "why")) await shot("17-close-why");
  await step('.laq-big > button[data-k="passed"]'); await shot("18-close-handover");
  await discard(page, j);
  await page.locator('[data-pqs="close"]').click().catch(() => {}); await frame(page, 400);
  /* Answer an offer (accepted, so "Tell your other agents?") */
  const of = await pick(page, ["Offer"]);
  if (of) {
    await openOnPhone(page, of);
    await page.locator('[data-pqs="primary"]').click(); await frame(page, 900);
    if (await walkTo(page, j, "answer")) await shot("19-offer-answer");
    if (await walkTo(page, j, "others", ["yes"])) await shot("20-offer-others");
    await discard(page, j);
    await page.locator('[data-pqs="close"]').click().catch(() => {}); await frame(page, 400);
  }
  /* closed, Reopen ("I closed it too soon", then the reminder slider) */
  const cq = (await pick(page, ["Rejected"]))!;
  await openOnPhone(page, cq); await shot("21-closed-sheet");
  await page.locator('[data-pqs="primary"]').click(); await frame(page, 900);
  if (await walkTo(page, j, "why")) await shot("22-reopen-why");
  if (await walkTo(page, j, "nudge", ["soon"])) await shot("23-reopen-reminder");
  const names = ["01-sheet-half", "02-sheet-full", "03-tab-agent", "04-tab-materials", "05-tab-notes", "06-menu", "07-sent-what", "08-sent-when", "09-earlier-date-slider", "10-sent-reply-time", "11-sent-review", "12-sent-saved", "13-rar-reply", "14-rar-asked", "15-rar-sendby", "16-rar-review", "17-close-why", "18-close-handover", "19-offer-answer", "20-offer-others", "21-closed-sheet", "22-reopen-why", "23-reopen-reminder"];
  for (const n of names) copyFileSync(`design-refs/phone-query-sheet-v1/shots/${n}.png`, `${out}/${n}-ref.png`);
  writeFileSync(`${out}/index.html`, `<!doctype html><meta charset="utf-8"><title>Phone query sheet v1 — build beside ref</title><style>body{font:14px system-ui;background:#f2eee8;margin:24px}figure{display:inline-block;margin:0 24px 32px 0;vertical-align:top}img{width:390px;border-radius:24px;box-shadow:0 4px 16px #0002}h2{margin:24px 0 8px}</style>${names.map((n) => `<h2>${n}</h2><figure>${existsSync(`${out}/${n}-build.png`) ? `<img src="${n}-build.png">` : "<p>(not reached on this data)</p>"}<figcaption>build</figcaption></figure><figure><img src="${n}-ref.png"><figcaption>ref</figcaption></figure>`).join("")}`);
});
