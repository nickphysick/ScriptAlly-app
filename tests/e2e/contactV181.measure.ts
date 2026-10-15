/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.1 — locks CL181 A1 to B5, on the rendered page at 1512 × 900 and 1280 × 800 with the shell.
 *
 * Each lock was run against the build before the pack (`CL181_BASE=1`, ledger `base-<lock>.json`) and with its named
 * mutation (`CL181_MUTATE=<lock>`, ledger `mut-<lock>.json`) before its green was believed. A `src` mutation is a
 * source edit made and undone in the measurement worktree; the rest are applied in the page.
 *
 * ⚠️ B5 COMPARES WITH A CAPTURE TAKEN FROM UNMODIFIED HEAD AT THE START OF THE RUN (`CL181_CAPTURE=1`), never one
 *    carried between runs: the Queries tab's dates are relative to today.
 * ⚠️ A2 WRITES TO THE HARNESS ACCOUNT AND PUTS IT BACK THROUGH THE DRAWER'S OWN UNDO, then checks the document.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read starts from the visible Contact list.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { doc, getDoc } from "firebase/firestore";
import { openContacts16 } from "./cl16Lib";
import { harnessDb } from "./harnessDocs";
import { materialRowsFromAgent, summaryFromRows } from "../../src/lib/agentMaterials";
import { encodeMats, matsOf } from "../../src/lib/cardDraft";

const DIR = "reports/contact-list-v18-1";
const MUT = process.env.CL181_MUTATE ?? "";
const BASE = process.env.CL181_BASE === "1";
const CAPTURE = process.env.CL181_CAPTURE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
/** a document as text with its keys sorted, at every depth: Firestore does not promise an order */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]])) : x));
const diffKeys = (a: Record<string, unknown> | null, b: Record<string, unknown> | null) => [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].filter((k) => canon((a ?? {})[k]) !== canon((b ?? {})[k]));
const flags = (clear = false) => execSync(`node tests/e2e/hkFlags.mjs${clear ? " --clear" : ""}`, { encoding: "utf8" });

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, in the page; `src` locks are broken in the source (see the header) */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* the wrapper class dropped: the field falls back to whatever dress reaches it */
  A1: { js: `(() => { const fix = () => { for (const w of document.querySelectorAll(".hk81-mats")) w.classList.remove("hk81-mats"); }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] }); fix(); })()` },
  /* the band coloured by status only: a request (your move) reads as a live query, ink */
  B1: { css: `[data-apc="band"][data-kind="you"] { background: #2d3a50 !important; }` },
  /* the primary left in the footer as well */
  B2: { js: `(() => { const fix = () => { const s = document.querySelector('[data-ap="slip"] [data-ap="slip-go"]'); const f = document.querySelector('[data-ap="foot"]'); if (s && f && !f.querySelector('[data-ap="primary"]')) { const b = document.createElement("button"); b.setAttribute("data-ap", "primary"); b.textContent = s.textContent; f.appendChild(b); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
  /* the "+ Add" pills restored in place of the quiet text */
  B3: { js: `(() => { const fix = () => { for (const m of document.querySelectorAll('[data-ap="card"] [data-apc="missing"]')) { if (m.dataset.done) continue; m.dataset.done = "1"; const b = document.createElement("button"); b.className = "apc-add"; b.setAttribute("data-apc", "add"); b.textContent = "+ Add"; m.after(b); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(200);
};
const open = async (page: Page, vp: { width: number; height: number }, lock: string) => {
  await openContacts16(page, vp);
  await mutate(page, lock);
};

/** opens an agent's panel by id from the visible list, and waits for it */
const openAgent = async (page: Page, id: string) => {
  const row = page.locator(`.aglist [data-agent-card="${id}"]`).filter({ visible: true }).first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await expect(page.locator(`[data-ap="panel"][data-ap-id="${id}"]`)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
};
const closePanel = async (page: Page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(600); };
const tabBody = (page: Page, tab: "queries" | "notes") => page.evaluate(async (t) => {
  const b = document.querySelector<HTMLElement>(`[data-ap="card"] [data-ap-tab="${t}"]`);
  b?.click();
  await new Promise((r) => setTimeout(r, 500));
  return document.querySelector('[data-ap="card"] [data-ap="body"]')?.innerHTML ?? null;
}, tab);

/** the agents B5 reads: every row with a query (live or closed) and the first never-queried one, by id */
const b5Agents = (page: Page) => page.evaluate(() => {
  const rows = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0);
  const id = (e: HTMLElement) => e.getAttribute("data-agent-card") ?? "";
  const q = rows.filter((e) => e.dataset.disc === "live" || e.dataset.disc === "closed").slice(0, 4).map(id);
  const none = rows.find((e) => e.dataset.disc === "none");
  return [...q, ...(none ? [id(none)] : [])];
});

/* ───────────────────────── B5 · the capture (CL181_CAPTURE=1, unmodified HEAD only) ───────────────────────── */
test("B5 capture · the Queries and Notes bodies from unmodified HEAD", async ({ page }) => {
  test.skip(!CAPTURE, "CL181_CAPTURE=1 captures from unmodified HEAD");
  test.setTimeout(240_000);
  await open(page, SIZES[0], "");
  const ids = await b5Agents(page);
  const out: Record<string, { queries: string | null; notes: string | null }> = {};
  for (const id of ids) {
    await openAgent(page, id);
    out[id] = { queries: await tabBody(page, "queries"), notes: await tabBody(page, "notes") };
    await closePanel(page);
  }
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/b5-capture.json`, JSON.stringify({ at: new Date().toISOString(), ids, out }, null, 1));
  expect(ids.length).toBeGreaterThanOrEqual(3);
});

/** Housekeeping, in focus on the first "What to send" task; returns that task's agent id */
const openMaterialsTask = async (page: Page): Promise<string> => {
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(500); await page.keyboard.press("h"); await page.waitForTimeout(900); }
  await page.locator('[data-hk8="detail"][data-gap="materials"] [data-hk8="fill-detail"]').click(); await page.waitForTimeout(700);
  const key = (await page.locator('[data-hk8="card"]').getAttribute("data-key")) ?? "";
  return key.split(":")[0];
};
const shot = async (page: Page, name: string) => {
  if (process.env.CL181_SHOTS !== "1") return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}.png` });
};

/* ───────────────────────── A1 · the field ───────────────────────── */
test("A1 · field: MaterialsField in the focus card, four rows in order, dressed, nothing outside the card", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "A1");
    await openMaterialsTask(page);
    await shot(page, vp.width === 1512 ? "01-send-empty-1512" : "04-send-empty-1280");
    const field = page.locator('[data-hk8="card"] [data-ae="materials"]');
    L.check(`${w} the focus card holds [data-ae="materials"]`, (await field.count()) === 1, `${await field.count()}`);
    const order = await field.evaluate((f) => [...f.querySelectorAll<HTMLElement>("[data-mt-row]")].map((r) => r.dataset.mtRow).join(","));
    L.check(`${w} four rows in order`, order === "ql,syn,smp,oth", order);
    const smpH0 = await page.locator('[data-mt-row="smp"]').evaluate((e) => e.getBoundingClientRect().height, undefined, { timeout: 4000 }).catch(() => NaN);
    const tick = await page.locator('[data-mt="ql"]').evaluate((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }, undefined, { timeout: 4000 }).catch(() => [0, 0]);
    L.check(`${w} each tick is drawn, 22 × 22 (±1)`, near(tick[0], 22, 1) && near(tick[1], 22, 1), tick.map((n) => Number(n).toFixed(1)).join(" × "));
    L.check(`${w} unticked, Opening sample is one line (≤ 47 tall)`, smpH0 <= 47, `${smpH0.toFixed(1)}`);
    /* tick Synopsis and Opening sample so their controls are drawn */
    await page.locator('[data-mt="syn"]').click({ timeout: 4000 }).catch(() => {}); await page.locator('[data-mt="smp"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(300);
    await shot(page, vp.width === 1512 ? "02-send-ticked-1512" : "05-send-ticked-1280");
    const r = await page.evaluate(() => {
      const card = document.querySelector('[data-hk8="card"]')!.getBoundingClientRect();
      const inside = (e: Element) => { const b = e.getBoundingClientRect(); return b.left >= card.left - 0.5 && b.right <= card.right + 0.5 && b.top >= card.top - 0.5 && b.bottom <= card.bottom + 0.5; };
      const ctrls = [...document.querySelectorAll('[data-hk8="card"] [data-ae="materials"] :is([data-mt-row], .ae-step, .ae-seg button, .ae-mto)')];
      const out = ctrls.filter((e) => !inside(e)).map((e) => (e as HTMLElement).dataset.mtRow ?? e.className);
      const steps = [...document.querySelectorAll('[data-hk8="card"] .ae-step')].map((e) => e.getBoundingClientRect().height);
      const segBtns = [...document.querySelectorAll<HTMLElement>('[data-hk8="card"] [data-ae="unit"] button')];
      const on = segBtns.find((b) => b.classList.contains("on"));
      const cs = on ? getComputedStyle(on) : null;
      const boxes = segBtns.map((b) => b.getBoundingClientRect());
      const textIn = segBtns.every((b) => { const rg = document.createRange(); rg.selectNodeContents(b); const t = rg.getBoundingClientRect(); const bb = b.getBoundingClientRect(); return t.left >= bb.left - 0.5 && t.right <= bb.right + 0.5; });
      const overlap = boxes.some((a, i) => boxes.some((b, j) => j > i && a.left < b.right - 0.5 && b.left < a.right - 0.5));
      return { out, steps, onBg: cs?.backgroundColor ?? null, onFg: cs?.color ?? null, n: ctrls.length, textIn, overlap, segs: segBtns.length };
    });
    L.check(`${w} every row, stepper and segment button is inside the card (${r.n} read)`, r.n >= 10 && r.out.length === 0, r.out.join(",") || "all inside");
    L.check(`${w} the steppers are 34 (±1) tall`, r.steps.length === 2 && r.steps.every((h) => near(h, 34, 1)), r.steps.map((h) => h.toFixed(1)).join(","));
    L.check(`${w} the chosen unit is rgb(45, 58, 80)`, r.onBg === "rgb(45, 58, 80)", `${r.onBg}`);
    L.check(`${w} with cream text`, r.onFg === "rgb(244, 238, 229)", `${r.onFg}`);
    L.check(`${w} each option's text sits inside its own button`, r.segs === 3 && r.textIn, `${r.segs} options`);
    L.check(`${w} no two option buttons overlap`, !r.overlap, `${r.overlap}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  }
  L.done(20);
});

/* ───────────────────────── A2 · the save ───────────────────────── */
test("A2 · save: disabled with no row; the rows store what the agent card's encoder stores; 'On the card:' is its summary; Undo restores", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A2");
  await open(page, SIZES[0], "A2");
  const agentId = await openMaterialsTask(page);
  const { db, uid } = await harnessDb();
  const before = (await getDoc(doc(db, "users", uid, "agents", agentId))).data() ?? null;
  L.check("the task's agent is on the account", !!before, agentId);
  L.check("Save is disabled with no row ticked", await page.locator('[data-hk8="save"]').isDisabled({ timeout: 4000 }).catch(() => false), "disabled");
  /* the validator's refusal: focusing Other ticks it, and an empty Other is refused */
  await page.locator('[data-ae="other"]').focus({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(250);
  const refusal = await page.locator('[data-hk81="refusal"]').textContent({ timeout: 4000 }).catch(() => null);
  L.check("focusing Other ticks it", (await page.locator('[data-mt="oth"]').getAttribute("aria-pressed", { timeout: 4000 }).catch(() => null)) === "true", "ticked");
  L.check("an empty Other is refused in the validator's words, and Save is disabled", !!refusal && /Other/.test(refusal) && (await page.locator('[data-hk8="save"]').isDisabled({ timeout: 4000 }).catch(() => false)), `${refusal}`);
  await shot(page, "x-send-refusal-1512");
  await page.locator('[data-mt="oth"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(150);
  /* Covering letter, Synopsis at 2 pages, 10 pages of sample */
  await page.locator('[data-mt="ql"]').click({ timeout: 4000 }).catch(() => {});
  await page.locator('[data-mt="syn"]').click({ timeout: 4000 }).catch(() => {});
  await page.locator('[data-ae="syn-step"] button[data-d="1"]').click({ timeout: 4000 }).catch(() => {}); await page.locator('[data-ae="syn-step"] button[data-d="1"]').click({ timeout: 4000 }).catch(() => {});
  await page.locator('[data-mt="smp"]').click({ timeout: 4000 }).catch(() => {});
  await page.locator('[data-ae="unit"] button[data-v="Pages"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(200);
  let qty = Number(((await page.locator('[data-ae="smp-step"] b').textContent({ timeout: 4000 }).catch(() => null)) ?? "").replace(/[^0-9]/g, ""));
  for (let i = 0; i < 6 && qty !== 10; i++) { await page.locator(`[data-ae="smp-step"] button[data-d="${qty < 10 ? 1 : -1}"]`).click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(80); qty = Number(((await page.locator('[data-ae="smp-step"] b').textContent({ timeout: 4000 }).catch(() => null)) ?? "").replace(/[^0-9]/g, "")); }
  await page.waitForTimeout(250);
  await shot(page, "03-send-pages-other-1512");
  const mats = { ...matsOf([]), ql: true, syn: { on: true, len: 2 }, smp: { on: true, unit: "Pages" as const, qty: 10 } };
  const want = encodeMats(mats);
  const summary = summaryFromRows(materialRowsFromAgent(want));
  const shown = ((await page.locator('[data-hk81="oncard"] b').textContent({ timeout: 4000 }).catch(() => null)) ?? "").replace(/\s+/g, " ").trim();
  L.check("'On the card:' equals summaryFromRows before saving", !!summary && shown === summary.replace(/\s+/g, " ").trim(), `"${shown}" vs "${summary}"`);
  L.check("Save is enabled once rows are ticked", !(await page.locator('[data-hk8="save"]').isDisabled({ timeout: 4000 }).catch(() => false)), "enabled");
  await page.locator('[data-hk8="save"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(2500);
  const saved = (await getDoc(doc(db, "users", uid, "agents", agentId))).data() ?? {};
  L.check("the stored array is the agent card's encoder's for those rows", canon(saved.materialsWanted) === canon(want), `${JSON.stringify(saved.materialsWanted)} vs ${JSON.stringify(want)}`);
  const undo = page.locator('[data-hkv="undo"]');
  L.check("an Undo is offered", (await undo.count()) === 1, `${await undo.count()}`);
  if (await undo.count()) { await undo.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(3000); }
  const after = (await getDoc(doc(db, "users", uid, "agents", agentId))).data() ?? {};
  L.check("Undo restores the agent exactly", canon(after) === canon(before), diffKeys(before, after).join(",") || "identical");
  L.done(9);
});

/* ───────────────────────── the panel fixtures: one agent per band ───────────────────────── */
type Kind = "you" | "waiting" | "notq" | "closed" | "shut";
/** opens rows (live first, then closed, then never-queried) until each kind has an agent; returns kind → agent id */
const findKinds = async (page: Page, want: readonly Kind[]): Promise<Partial<Record<Kind, string>>> => {
  const ids = await page.evaluate(() => {
    const rows = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0);
    const by = (d: string) => rows.filter((e) => e.dataset.disc === d).map((e) => e.getAttribute("data-agent-card") ?? "");
    return [...by("live"), ...by("closed"), ...by("none")];
  });
  const out: Partial<Record<Kind, string>> = {};
  for (const id of ids) {
    if (want.every((k) => out[k])) break;
    await openAgent(page, id);
    const k = (await page.locator('[data-ap="card"]').getAttribute("data-slip").catch(() => null)) as Kind | null;
    if (k && !out[k]) out[k] = id;
    await closePanel(page);
  }
  return out;
};

/* ───────────────────────── B1 · the shell ───────────────────────── */
test("B1 · shell: one #a5837b frame holds band, head, tabs, body and footer; the band is 50 and says whose move it is", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("B1");
  const COLOUR: Record<string, string> = { you: "rgb(162, 69, 42)", waiting: "rgb(45, 58, 80)", notq: "rgb(94, 113, 137)", closed: "rgb(169, 163, 156)" };
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "B1");
    const kinds = await findKinds(page, ["you", "waiting", "notq", "closed"]);
    for (const k of ["you", "waiting", "notq", "closed"] as const) {
      const id = kinds[k];
      L.check(`${w} a fixture agent for ${k}`, !!id, id ?? "none on the account");
      if (!id) continue;
      await openAgent(page, id);
      await mutate(page, "B1");
      const r = await page.evaluate(() => {
        const card = document.querySelector<HTMLElement>('[data-ap="card"]')!;
        const frames = [...card.querySelectorAll<HTMLElement>("*")].filter((e) => { const c = getComputedStyle(e); return c.borderTopWidth === "1px" && c.borderTopStyle === "solid" && c.borderTopColor === "rgb(165, 131, 123)"; });
        const f = frames[0] ?? null;
        const has = (sel: string) => !!f?.querySelector(sel);
        const band = card.querySelector<HTMLElement>('[data-apc="band"]');
        return {
          frames: frames.length, radius: f ? getComputedStyle(f).borderTopLeftRadius : null,
          holds: { band: has('[data-apc="band"]'), head: has('[data-apc="head"]'), tabs: has('[role="tablist"]'), body: has('[data-ap="body"]'), foot: has('[data-ap="foot"]') },
          bandH: band?.getBoundingClientRect().height ?? null, bandBg: band ? getComputedStyle(band).backgroundColor : null,
          mast: !!card.querySelector(".qcv-open-mast"),
        };
      });
      L.check(`${w} ${k}: one element carries the 1px rgb(165, 131, 123) border`, r.frames === 1, `${r.frames}`);
      L.check(`${w} ${k}: its radius is 13`, r.radius === "13px", `${r.radius}`);
      L.check(`${w} ${k}: it holds the band, head, tabs, body and footer`, Object.values(r.holds).every(Boolean), JSON.stringify(r.holds));
      L.check(`${w} ${k}: the band is 50 (±1) tall`, near(r.bandH, 50, 1), `${r.bandH}`);
      L.check(`${w} ${k}: there is no navy masthead`, !r.mast, `${r.mast}`);
      L.check(`${w} ${k}: the band is ${COLOUR[k]}`, r.bandBg === COLOUR[k], `${r.bandBg}`);
      const NAME: Record<string, Record<number, string>> = { you: { 1512: "06-panel-your-move-1512", 1280: "12-panel-your-move-1280" }, waiting: { 1512: "07-panel-waiting-1512" }, notq: { 1512: "08-panel-not-queried-1512", 1280: "13-panel-not-queried-1280" }, closed: { 1512: "09-panel-closed-1512" } };
      if (NAME[k]?.[vp.width]) await shot(page, NAME[k][vp.width]);
      await closePanel(page);
    }
  }
  L.done(48);
});

/* ───────────────────────── B2 · the stand slip ───────────────────────── */
test("B2 · stand: the slip leads the Profile body, says v16's stand, and its button is the old footer's primary", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("B2");
  await open(page, SIZES[0], "B2");
  const kinds = await findKinds(page, ["you", "waiting", "notq", "closed"]);
  /* the footer's primary by stand (agentPanel.panelFoot): the journey it opens */
  const HEAD: Record<string, RegExp> = {
    you: /^(Send \S+ the (partial|full|new version)|Answer \S+’s offer|\S+ is late)$/,
    waiting: /^Waiting on \S+$/, notq: /^(Not queried yet|A fit for .+)$/, closed: /^(\S+ passed|Closed, no reply|Withdrawn|.+)$/,
  };
  for (const k of ["you", "waiting", "notq", "closed"] as const) {
    const id = kinds[k];
    L.check(`a fixture agent for ${k}`, !!id, id ?? "none");
    if (!id) continue;
    await openAgent(page, id);
    await mutate(page, "B2");
    const r = await page.evaluate(() => {
      const body = document.querySelector('[data-ap="card"] [data-ap="body"]');
      const slip = body?.querySelector<HTMLElement>('[data-ap="slip"]');
      return {
        first: body?.firstElementChild?.getAttribute("data-ap") ?? null,
        head: slip?.querySelector('[data-ap="slip-heading"]')?.textContent ?? null,
        text: slip?.querySelector('[data-ap="slip-text"]')?.textContent ?? null,
        go: slip?.querySelector('[data-ap="slip-go"]')?.textContent ?? null,
        act: slip?.querySelector('[data-ap="slip-go"]')?.getAttribute("data-act") ?? null,
        footPrimary: document.querySelectorAll('[data-ap="card"] [data-ap="foot"] [data-ap="primary"]').length,
      };
    });
    L.check(`${k}: the stand slip is the Profile body's first child`, r.first === "slip", `${r.first}`);
    L.check(`${k}: its headline is v16's stand heading for this state`, !!r.head && HEAD[k].test(r.head), `${r.head}`);
    L.check(`${k}: its text is v16's paragraph (a sentence, ending in a full stop)`, !!r.text && /\.$/.test(r.text.trim()), `${r.text}`);
    L.check(`${k}: the Profile footer has no primary button`, r.footPrimary === 0, `${r.footPrimary}`);
    const WANT: Record<string, string | null> = { you: null, waiting: "resp", notq: "log", closed: null };
    if (k === "closed") L.check(`${k}: a closed agent has no slip button`, r.go === null, `${r.go}`);
    else if (k === "you") L.check(`${k}: the button opens the old primary's journey (sent or offer or resp)`, ["sent", "offer", "resp"].includes(r.act ?? ""), `${r.go} → ${r.act}`);
    else L.check(`${k}: the button opens the old primary's journey (${WANT[k]})`, r.act === WANT[k], `${r.go} → ${r.act}`);
    if (r.act) {
      await page.locator('[data-ap="slip-go"]').click(); await page.waitForTimeout(900);
      const mode = await page.locator('[data-ap="panel"]').getAttribute("data-ap-acting");
      L.check(`${k}: pressing it steps the journey into the panel (drawer request spy: ${r.act})`, mode === r.act, `${mode}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(700);
      if (await page.locator('[data-ap="panel"][data-ap-acting]').count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(700); }
    }
    await closePanel(page);
  }
  L.done(20);
});

/* ───────────────────────── B3 · the sections ───────────────────────── */
test("B3 · sections: in order; an agent with nothing says so quietly, with no dashed pills; a link with no value is not drawn", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("B3");
  execSync("node tests/e2e/seedCl181.mjs");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "B3");
      await openAgent(page, "clv181-bare");
      await mutate(page, "B3");
      const r = await page.evaluate(() => {
        const card = document.querySelector('[data-ap="card"]')!;
        const order = [...card.querySelectorAll<HTMLElement>("[data-ap-sec]")].map((e) => e.dataset.apSec).join(",");
        const words = (sec: string) => [...card.querySelectorAll<HTMLElement>(`[data-ap-sec="${sec}"] [data-apc="missing"]`)].map((e) => e.textContent);
        return {
          order, pills: card.querySelectorAll('[data-apc="add"], .apc-add, .apn-add').length,
          genres: words("genres"), wish: words("wishlist"), send: words("send"), how: words("how"),
          links: [...card.querySelectorAll<HTMLElement>("[data-ap-link]")].map((e) => e.dataset.apLink).join(","),
        };
      });
      L.check(`${w} the sections are Genres sought, Manuscript wishlist, How to query, Send them, Your queries`, r.order === "genres,wishlist,how,send,queries", r.order);
      L.check(`${w} there are no dashed "+ Add" pills in the panel`, r.pills === 0, `${r.pills}`);
      L.check(`${w} no genres reads "Not recorded"`, r.genres.join() === "Not recorded", r.genres.join("|"));
      L.check(`${w} no wishlist reads "Not recorded"`, r.wish.join() === "Not recorded", r.wish.join("|"));
      L.check(`${w} no materials reads "Not recorded"`, r.send.join() === "Not recorded", r.send.join("|"));
      L.check(`${w} no reply time and no silence policy read "Not stated"`, r.how.join() === "Not stated,Not stated", r.how.join("|"));
      L.check(`${w} with no website and no email, no link is drawn`, r.links === "", r.links || "none");
      if (vp.width === 1280) await page.locator('[data-ap="gaps"]').scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {}); await shot(page, "x-panel-every-gap-1280");
      await closePanel(page);
    }
  } finally { execSync("node tests/e2e/seedCl181.mjs --clean"); }
  L.done(14);
});

/* ───────────────────────── B4 · the gap line ───────────────────────── */
test("B4 · gaps: the line's n and words are Housekeeping's items for that agent; absent with none; Fill in runs that agent only", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("B4");
  /* the bare agent, with its wishlist put off: Housekeeping lists three of its four field gaps */
  execSync("node tests/e2e/seedCl181.mjs --later");
  try {
    flags(true);
    await open(page, SIZES[0], "B4");
    /* Housekeeping's own items for the bare agent: its By-agent row's gap chips */
    await page.keyboard.press("h"); await page.waitForTimeout(900);
    if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(500); await page.keyboard.press("h"); await page.waitForTimeout(900); }
    await page.locator('[data-hkv="view"][data-v="agent"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(500);
    const hkKeys = await page.locator('[data-hk8="agent-row"][data-agent="clv181-bare"] [data-hk8="gap-chip"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.key ?? ""));
    L.check("Housekeeping lists the bare agent's gaps, without the one put off (the fixture took)", hkKeys.length === 3 && !hkKeys.includes("clv181-bare:wishlist"), hkKeys.join(","));
    await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    await openAgent(page, "clv181-bare");
    const line = await page.evaluate(() => { const g = document.querySelector<HTMLElement>('[data-ap="gaps"]'); return g ? { n: Number(g.dataset.n), text: g.querySelector('[data-ap="gaps-text"]')?.textContent ?? "" } : null; });
    const WORD: Record<string, string> = { reply: "reply time", materials: "what to send", genres: "genres", wishlist: "wishlist", reopen: "reopening" };
    const want = hkKeys.map((k) => WORD[k.split(":")[1]]);
    L.check("the gap line's n is Housekeeping's count for the agent", !!line && line.n === hkKeys.length, `${line?.n} vs ${hkKeys.length}`);
    L.check("its words are Housekeeping's, in Housekeeping's order", !!line && line.text === `${hkKeys.length} details missing — ${want.join(", ")}`, `${line?.text}`);
    await page.locator('[data-ap="gaps"]').scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {}); await shot(page, "10-panel-gaps-1512");
    await page.locator('[data-ap="gaps-fill"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1200);
    const run = await page.evaluate(() => ({
      panel: !!document.querySelector('[data-ap="panel"]'),
      counter: document.querySelector('[data-hk8="counter"]')?.textContent ?? null,
      card: document.querySelector('[data-hk8="card"]')?.getAttribute("data-key") ?? null,
      coming: [...document.querySelectorAll<HTMLElement>('[data-hk8="coming"] .hk8-li')].map((e) => e.dataset.key ?? ""),
    }));
    L.check("Fill in closes the panel", !run.panel, `${run.panel}`);
    L.check(`Housekeeping opens in focus with a counter "1 of ${hkKeys.length}"`, run.counter === `1 of ${hkKeys.length}`, `${run.counter}`);
    L.check("the run is over that agent only", !!run.card && run.card.startsWith("clv181-bare:") && run.coming.every((k) => k.startsWith("clv181-bare:")), `${run.card} · ${run.coming.join(",")}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    /* an agent with no gap draws no line: the first row Housekeeping does not list */
    await page.keyboard.press("h"); await page.waitForTimeout(900);
    await page.locator('[data-hkv="view"][data-v="agent"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(400);
    const listed = await page.locator('[data-hk8="agent-row"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.agent ?? ""));
    await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    const none = await page.evaluate((l) => [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].map((e) => e.getAttribute("data-agent-card") ?? "").find((id) => !l.includes(id)) ?? null, listed);
    L.check("an agent with no gaps is on the list", !!none, `${none}`);
    if (none) {
      await openAgent(page, none);
      L.check("its panel draws no gap line", (await page.locator('[data-ap="gaps"]').count()) === 0, none);
      await closePanel(page);
    }
  } finally { execSync("node tests/e2e/seedCl181.mjs --clean"); }
  L.done(8);
});

/* ───────────────────────── B5 · unchanged ───────────────────────── */
test("B5 · unchanged: the Queries and Notes bodies match the v18 build's; Escape, ✕, docking and ?agent= behave as before", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("B5");
  const path = `${DIR}/b5-capture.json`;
  L.check("a capture from unmodified HEAD exists (CL181_CAPTURE=1)", existsSync(path), path);
  const cap = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as { at: string; ids: string[]; out: Record<string, { queries: string | null; notes: string | null }> } : null;
  L.check("the capture was taken today", !!cap && cap.at.slice(0, 10) === new Date().toISOString().slice(0, 10), cap?.at ?? "none");
  await open(page, SIZES[0], "B5");
  for (const id of cap?.ids ?? []) {
    await openAgent(page, id);
    const q = await tabBody(page, "queries"), n = await tabBody(page, "notes");
    L.check(`${id}: the Queries body is byte-identical`, q === cap!.out[id].queries, `${q?.length} vs ${cap!.out[id].queries?.length}`);
    L.check(`${id}: the Notes body is byte-identical`, n === cap!.out[id].notes, `${n?.length} vs ${cap!.out[id].notes?.length}`);
    await closePanel(page);
  }
  if (process.env.CL181_SHOTS === "1" && cap?.ids[0]) {
    await openAgent(page, cap.ids[1] ?? cap.ids[0]);
    await tabBody(page, "queries"); await shot(page, "11-panel-queries-1512");
    await tabBody(page, "notes"); await shot(page, "x-panel-notes-1512");
    await closePanel(page);
  }
  const id = cap?.ids[0] ?? "";
  /* Escape closes, ✕ closes */
  await openAgent(page, id); await page.keyboard.press("Escape"); await page.waitForTimeout(700);
  L.check("Escape closes the panel", (await page.locator('[data-ap="panel"]').count()) === 0, "");
  await openAgent(page, id); await page.locator('[data-ap="card"] [data-ap="close"]').click({ timeout: 6000 }).catch(() => {}); await page.waitForTimeout(700);
  L.check("✕ closes the panel", (await page.locator('[data-ap="panel"]').count()) === 0, "");
  /* ?agent= opens it */
  await page.goto(`/agents?agent=${encodeURIComponent(id)}`); await page.waitForTimeout(2500);
  L.check("?agent= opens that agent's panel", (await page.locator(`[data-ap="panel"][data-ap-id="${id}"]`).count()) === 1, id);
  /* docking: Edit profile hosts the agent card's editor in the panel; Escape returns to the card */
  await page.locator('[data-ap="card"] [data-ap="edit"]').first().click({ timeout: 6000 }).catch(() => {}); await page.waitForTimeout(900);
  L.check("Edit profile docks the editor in the panel", (await page.locator('[data-ap="panel"][data-ap-acting="edit"]').count()) === 1, "");
  await page.keyboard.press("Escape"); await page.waitForTimeout(900);
  L.check("Escape from the editor returns to the card", (await page.locator('[data-ap="card"]').count()) === 1, "");
  L.done(2 + 2 * (cap?.ids.length ?? 0) + 5);
});
