/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add an agent v2, Phase B9 (design-refs/add-agent-v2) — THE JOURNEY'S LOCKS, on the rendered page over the emulator's
 * harness account:
 *
 *   AB1  from each door the journey opens, the route unchanged and the desk dimmed
 *   AB2  the panel's box, header height and track geometry match Log a query's to the pixel, at 1280 and 1512
 *   AB3  a name, with "Agency unknown", is added in two actions from the first screen ("Add now, finish later", "Add to
 *        your list") once the agency ask has been answered
 *   AB4  a name already on the list cannot be added
 *   AB5  everything filled shows 6 of 6 and no "Finish profile" block; a name and agency only, 2 of 6 (the card's own
 *        count is over six details — the brief's "of 9" is a count the app does not keep)
 *   AB6  from inside Log a query: once added, Log a query has the new agent chosen and nothing else lost
 *   AB7  the saved record for a fully filled agent equals, field for field, the old journey's for the same answers
 *   AB8  the whole card preview is visible on the review screen at 1280 × 800, with no scroll inside the preview
 *
 * Design v15 (the revised brief, 24 Nov):
 *   AB9  the sample is typed: 7500 as words shows "7,500"; 35 as pages saves 35; changing unit keeps the number; the
 *        arrow keys step it by one; no − or + button; a common ask is chosen only when it matches exactly
 *   AB10 no label in the journey holds an italic aside; each "i" shows its bubble on hover and on keyboard focus, wholly
 *        inside the panel and clear of its field; Escape closes the bubble first
 *   AB11 the wishlist page link typed on step 2 is on the saved agent where the agent card reads it (socials · MSWL)
 *   AB12 Closed asks when they reopen: a date saves to `reopensOn`; "Not sure" saves none; Open has no such question.
 *        The big number equals the preview ring's own count in each (the brief's "no gap with a date" is read and
 *        reported, not gated: the card's own rule asks for a reopen reminder, not a date — see the report)
 *   AB13 for three agents (everything filled; a name and agency; a name with Agency unknown) the big number equals the
 *        preview ring's own count, and the full one shows 6 of 6 with no Finish block
 *
 * ⚠️ RED FIRST: `AAG_BREAK=ab1|…|ab13` breaks the fix each lock holds, in the page.
 * ⚠️ IT WRITES (agents are added) and RESTORES: every agent it adds is deleted through the emulator's admin REST before the
 *    test ends, and every run starts from the same snapshot anyway (scripts/emu.mjs).
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/addAgentV2.measure.ts --project=measure`.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

const DIR = "reports/add-agent-v2";
const BREAK = process.env.AAG_BREAK ?? "";
const EMU = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
const UID = "LS4ymFFCEvhN82advZQJ5zkr7sv2";
/** an agent the harness account already has */
const ON_LIST = { name: "Priya Raman" };

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${BREAK ? `-break-${BREAK}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}${BREAK ? ` BREAK=${BREAK}` : ""}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}
const settle = (page: Page, ms = 600) => page.waitForTimeout(ms);

/* ── the emulator, read and restored through its admin REST ── */
type FsVal = { stringValue?: string; booleanValue?: boolean; integerValue?: string; doubleValue?: number; nullValue?: null; arrayValue?: { values?: FsVal[] }; mapValue?: { fields?: Record<string, FsVal> } };
type FsDoc = { name: string; fields?: Record<string, FsVal> };
const plain = (v: FsVal): unknown => v.stringValue ?? v.booleanValue ?? (v.integerValue != null ? Number(v.integerValue) : undefined) ?? v.doubleValue
  ?? (v.arrayValue ? (v.arrayValue.values ?? []).map(plain) : v.mapValue ? Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, plain(x)])) : null);
async function agentsNamed(name: string): Promise<{ id: string; rec: Record<string, unknown> }[]> {
  const out: FsDoc[] = []; let token = "";
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${EMU}/users/${UID}/agents?pageSize=300${token ? `&pageToken=${token}` : ""}`, { headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(15_000) });
    const j = (await r.json()) as { documents?: FsDoc[]; nextPageToken?: string };
    out.push(...(j.documents ?? []));
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return out.filter((d) => d.fields?.name?.stringValue === name).map((d) => ({ id: d.name.split("/").pop()!, rec: Object.fromEntries(Object.entries(d.fields ?? {}).map(([k, v]) => [k, plain(v)])) }));
}
async function removeAgents(name: string) {
  for (const a of await agentsNamed(name)) await fetch(`${EMU}/users/${UID}/agents/${a.id}`, { method: "DELETE", headers: { Authorization: "Bearer owner" } });
}

/* ── the breaks, applied before the app loads ── */
async function breakIt(page: Page, title: string) {
  /* only the breaks the running test's title names: one run proves every lock red on its own (`AAG_BREAK=ab1,…,ab8`) */
  const mine = BREAK.split(",").filter((k) => k && title.includes(k.toUpperCase()));
  for (const one of mine) await page.addInitScript((k: string) => {
    const style = (css: string) => { const s = document.createElement("style"); s.textContent = css; (document.head ?? document.documentElement).appendChild(s); };
    window.addEventListener("DOMContentLoaded", () => {
      if (k === "ab1") document.addEventListener("click", (e) => { if ((e.target as Element | null)?.closest?.("[data-quick='agent'], [data-cl27='add'], [data-qls='new-agent']")) history.pushState(null, "", "/broken"); }, true);
      if (k === "ab2") style(".spanel[data-aag='panel'] .laq-trk { padding-top: 3px !important; }");
      if (k === "ab3") style("[data-aag='add-later'] { display: none !important; }");
      if (k === "ab4") style("[data-aag='dupe'] { display: none !important; }");
      if (k === "ab4") document.addEventListener("click", (e) => { const b = (e.target as Element | null)?.closest?.("[data-aag='next']") as HTMLButtonElement | null; if (b) b.disabled = false; }, true);
      /* ab5: the count says the reference's "of 9" */
      if (k === "ab5") setInterval(() => { const n = document.querySelector("[data-aag='details-n']"); if (n && !/of 9$/.test(n.textContent ?? "")) n.textContent = (n.textContent ?? "").replace(/of 6$/, "of 9"); }, 50);
      if (k === "ab6") document.addEventListener("click", (e) => { if ((e.target as Element | null)?.closest?.("[data-aag='add-now'], [data-aag='back-laq']")) { e.stopImmediatePropagation(); e.preventDefault(); (document.querySelector("[data-aag='close']") as HTMLElement | null)?.click(); } }, true);
      if (k === "ab8") style(".aag-pv { transform: scale(1.8); transform-origin: 0 0; }");
      /* ab9: the amount loses its comma, and a − button appears in the control */
      if (k === "ab9") setInterval(() => {
        const n = document.querySelector<HTMLInputElement>("[data-sx='amt']");
        if (n && n.value.includes(",") && document.activeElement !== n) n.value = n.value.replace(/,/g, "");
        const r = document.querySelector("[data-sx='root']");
        if (r && !r.querySelector(".brk-minus")) { const b = document.createElement("button"); b.className = "brk-minus"; b.textContent = "−"; r.appendChild(b); }
      }, 40);
      /* ab10: the bubble is pushed out of the panel, and a label grows an italic aside */
      if (k === "ab10") {
        style(".laq.aag .aag-ht { left: -420px !important; }");
        setInterval(() => { const l = document.querySelector(".aag-labh label"); if (l && !l.querySelector("i")) { const i = document.createElement("i"); i.textContent = "in their words"; l.appendChild(i); } }, 40);
      }
      /* ab11: the link is emptied as the writer leaves the field */
      if (k === "ab11") document.addEventListener("focusout", (e) => {
        const el = e.target as HTMLInputElement | null;
        if (el?.dataset?.aag === "mswl") { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!; set.call(el, ""); el.dispatchEvent(new Event("input", { bubbles: true })); }
      }, true);
      /* ab12: moving the reopening slider is undone by its own "Not sure" */
      if (k === "ab12") document.addEventListener("input", (e) => {
        if ((e.target as Element | null)?.closest?.("[data-aag='reopen-slider']")) setTimeout(() => (document.querySelector("[data-aag='reopen-slider'] .sa-wk-unkbtn:not(.on)") as HTMLElement | null)?.click(), 30);
      }, true);
      /* ab13: the big number always claims the whole card */
      if (k === "ab13") setInterval(() => { const n = document.querySelector("[data-aag='details-n']"); if (n && n.textContent !== "6 of 6") n.textContent = "6 of 6"; }, 40);
      /* ab7: the add changes an answer on its way out (the fit becomes five stars) */
      if (k === "ab7") document.addEventListener("click", (e) => { if ((e.target as Element | null)?.closest?.("[data-aag='add']")) (document.querySelector("[data-aag='star'][data-n='5']") as HTMLElement | null)?.click(); }, true);
    });
  }, one);
}

const panelGeo = (page: Page, root: string) => page.evaluate((sel) => {
  const r = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().width > 0);
  if (!r) return null;
  const panel = r.closest<HTMLElement>(".spanel")!;
  const top = r.querySelector<HTMLElement>(".laq-top")!;
  const trk = r.querySelector<HTMLElement>(".laq-trk")!;
  const b = (e: Element) => { const x = e.getBoundingClientRect(); return [x.left, x.top, x.width, x.height].map((n) => Math.round(n * 10) / 10); };
  return { panel: b(panel), top: b(top), track: b(trk), steps: [...trk.querySelectorAll(".laq-si")].map((e) => b(e)), nodes: [...trk.querySelectorAll(".laq-nd")].map((e) => b(e)) };
}, root);

const state = (page: Page) => page.evaluate(() => {
  const shown = (e: Element | null) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== "hidden"; };
  const root = [...document.querySelectorAll<HTMLElement>('[data-aag="root"]')].find(shown) ?? null;
  return { path: location.pathname + location.search, journey: !!root, step: root?.dataset.step ?? null, dim: document.body.classList.contains("spanel-dim") };
});

async function openJourney(page: Page, route = "/dashboard") {
  await openApp(page, route, { width: 1280, height: 800 });
  await page.locator("[data-shell=quick-btn]").filter({ visible: true }).first().click();
  await settle(page, 300);
  await page.locator("[data-shell=quick-menu] [data-quick='agent']").click();
  await page.locator('[data-aag="root"]').waitFor({ timeout: 10_000 });
  await settle(page, 400);
}
const typeIn = async (page: Page, k: string, v: string) => { const f = page.locator(`[data-aag="root"] [data-aag="${k}"]`); await f.click({ timeout: 5000 }).catch(() => {}); await f.fill(v, { timeout: 5000 }).catch(() => {}); };
/* a press that cannot happen is a reading, not a hang: five seconds, then the ledger says what did not move */
const press = (page: Page, k: string) => page.locator(`[data-aag="root"] [data-aag="${k}"]`).filter({ visible: true }).first().click({ timeout: 5000 }).catch(() => {});

async function closeAll(page: Page) {
  for (let i = 0; i < 6; i++) {
    if (!(await page.locator("[data-side-panel], [data-cl262='panel']").count())) break;
    await page.keyboard.press("Escape"); await settle(page, 350);
    for (const d of ['[data-aag="leave-discard"]', '[data-qls="leave-discard"]']) {
      const x = page.locator(d).filter({ visible: true });
      if (await x.count()) { await x.first().click(); await settle(page, 350); }
    }
  }
}

/** a fully filled agent, through every step */
async function fillAll(page: Page, name: string) {
  await typeIn(page, "name", name);
  await typeIn(page, "agency", "Fenwick & Rowe");
  await typeIn(page, "city", "London");
  await press(page, "next"); await settle(page);
  /* Wishlist: two genres from the field's own list, and the wishlist */
  const g = page.locator('[data-aag="root"] [data-aag="genres"] input').first();
  for (const t of ["Thriller", "Crime"]) { await g.click(); await g.fill(t); await settle(page, 250); await page.keyboard.press("Enter"); await settle(page, 250); }
  await page.locator('[data-aag="root"] [data-aag="wish"]').fill("Twisty, character-led thrillers.");
  await page.locator('[data-aag="root"] [data-aag="mswl"]').fill("fenwick.example/sarah");
  await press(page, "next"); await settle(page);
  /* Asks for: the letter, a one-page synopsis, the sample */
  await page.locator('[data-aag="tile"][data-k="letter"] > button').click();
  await page.locator('[data-aag="tile"][data-k="syn"] > button').click();
  await page.locator('[data-aag="syn"][data-k="1"]').click();
  await page.locator('[data-aag="tile"][data-k="sample"] > button').click();
  await press(page, "next"); await settle(page);
  /* How: email, both links, open */
  await page.locator('[data-aag="method"][data-k="email"]').click();
  await typeIn(page, "email", "sarah@fenwick.example");
  await typeIn(page, "web", "fenwick.example");
  await page.locator('[data-aag="door"][data-k="open"]').click();
  await press(page, "next"); await settle(page);
  /* Replies: 8 weeks, no response means no */
  const sl = page.locator('[data-aag="weeks"] input[type="range"]');
  await sl.evaluate((e: HTMLInputElement) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!; set.call(e, "8"); e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.locator('[data-aag="policy"][data-k="nrn"]').click();
  await press(page, "next"); await settle(page, 900);
  await page.locator('[data-aag="star"][data-n="4"]').click();
}

test.describe("Add an agent v2 · the journey", () => {
  test.beforeEach(async ({ page }, info) => { await breakIt(page, info.title); });

  test("AB1 · every door opens the journey in place, the desk dimmed", async ({ page }) => {
    const L = new Ledger("AB1-doors");
    const doors: { door: string; route: string; press: () => Promise<boolean> }[] = [
      { door: "Quick actions (Dashboard)", route: "/dashboard", press: async () => { await page.locator("[data-shell=quick-btn]").filter({ visible: true }).first().click(); await settle(page, 300); await page.locator("[data-quick='agent']").click(); return true; } },
      { door: "Quick actions (Queries)", route: "/queries", press: async () => { await page.locator("[data-shell=quick-btn]").filter({ visible: true }).first().click(); await settle(page, 300); await page.locator("[data-quick='agent']").click(); return true; } },
      { door: "Dashboard's Add an agent", route: "/dashboard", press: async () => { const b = page.locator("[data-d2='add-agent'], [data-d58='btn-agent'], [data-d3='agents-add']").filter({ visible: true }).first(); if (!(await b.count())) return false; await b.click(); return true; } },
      { door: "Contact list header", route: "/agents", press: async () => { const b = page.locator("[data-cl27='add']").filter({ visible: true }).first(); if (!(await b.count())) return false; await b.click(); return true; } },
      { door: "Search palette (a typed name)", route: "/dashboard", press: async () => {
        await page.keyboard.press("Meta+k"); await settle(page, 500);
        await page.keyboard.type("Zelda Quint"); await settle(page, 900);
        const row = page.locator(".sp-pal [role='option']").filter({ hasText: /Add .*Zelda Quint|Zelda Quint.*agent/i }).first();
        if (!(await row.count())) return false;
        await row.click(); return true;
      } },
      { door: "Log a query's Add a new agent", route: "/dashboard", press: async () => {
        await page.locator("[data-shell=quick-btn]").filter({ visible: true }).first().click(); await settle(page, 300);
        await page.locator("[data-quick='query']").click(); await settle(page, 900);
        const b = page.locator("[data-qls='new-agent']").filter({ visible: true }).first();
        if (!(await b.count())) return false;
        await b.click(); return true;
      } },
    ];
    for (const d of doors) {
      await openApp(page, d.route, { width: 1440, height: 900 });
      const before = await state(page);
      const pressed = await d.press();
      L.check(`${d.door}: the door is there`, pressed, "not found");
      if (!pressed) continue;
      await settle(page, 900);
      const s = await state(page);
      L.check(`${d.door}: the journey is open`, s.journey, JSON.stringify(s));
      L.check(`${d.door}: the route is unchanged`, s.path === before.path, `${before.path} → ${s.path}`);
      L.check(`${d.door}: the desk is dimmed`, s.dim, JSON.stringify(s));
      L.check(`${d.door}: on Who are you adding?`, s.step === "agent", String(s.step));
      await closeAll(page);
    }
    L.done(28);
  });

  test("AB2 · the panel's box, header and track are Log a query's to the pixel", async ({ page }) => {
    const L = new Ledger("AB2-geometry");
    for (const vp of [{ width: 1280, height: 800 }, { width: 1512, height: 900 }]) {
      await openApp(page, "/dashboard", vp);
      await page.locator("[data-shell=quick-btn]").filter({ visible: true }).first().click(); await settle(page, 300);
      await page.locator("[data-quick='query']").click(); await settle(page, 1000);
      const laq = await panelGeo(page, ".laq:not(.aag):not(.rar)");
      await closeAll(page);
      await page.locator("[data-shell=quick-btn]").filter({ visible: true }).first().click(); await settle(page, 300);
      await page.locator("[data-quick='agent']").click(); await settle(page, 1000);
      const aag = await panelGeo(page, '[data-aag="root"]');
      L.check(`${vp.width}: both drawn`, !!laq && !!aag, `${!!laq} ${!!aag}`);
      if (laq && aag) {
        L.check(`${vp.width}: panel box`, JSON.stringify(aag.panel) === JSON.stringify(laq.panel), `${aag.panel} vs ${laq.panel}`);
        L.check(`${vp.width}: header box`, JSON.stringify(aag.top) === JSON.stringify(laq.top), `${aag.top} vs ${laq.top}`);
        L.check(`${vp.width}: track box`, JSON.stringify(aag.track) === JSON.stringify(laq.track), `${aag.track} vs ${laq.track}`);
        L.check(`${vp.width}: six steps`, aag.steps.length === 6, String(aag.steps.length));
        /* both on their first step, so node for node: the current one, then five to come */
        L.check(`${vp.width}: step nodes, node for node`, JSON.stringify(aag.nodes) === JSON.stringify(laq.nodes), `${JSON.stringify(aag.nodes)} vs ${JSON.stringify(laq.nodes)}`);
        L.check(`${vp.width}: step slots, slot for slot`, JSON.stringify(aag.steps) === JSON.stringify(laq.steps), `${JSON.stringify(aag.steps)} vs ${JSON.stringify(laq.steps)}`);
      }
      await closeAll(page);
    }
    L.done(14);
  });

  test("AB3 + AB4 · a name and Agency unknown in two actions; a name already on the list cannot be added", async ({ page }) => {
    const L = new Ledger("AB3-AB4");
    const NAME = "Quentin Arbuthnot";
    try {
      await openJourney(page);
      /* AB4 — a name on the list */
      await typeIn(page, "name", ON_LIST.name); await settle(page, 300);
      L.check("AB4 the slate box names the agent", (await page.locator('[data-aag="dupe"]').count()) === 1 && (await page.locator('[data-aag="dupe"]').innerText()).includes(ON_LIST.name), "no box");
      L.check("AB4 it offers the card", (await page.locator('[data-aag="open-dupe"]').count()) === 1, "no button");
      L.check("AB4 Carry on is disabled", await page.locator('[data-aag="root"] [data-aag="next"]').isDisabled(), "enabled");
      L.check("AB4 Add now, finish later is disabled", await page.locator('[data-aag="root"] [data-aag="add-later"]').isDisabled(), "enabled");
      await page.locator('[data-aag="root"] [data-aag="next"]').click({ force: true }).catch(() => {});
      await settle(page, 400);
      L.check("AB4 pressing it anyway stays on step one", (await state(page)).step === "agent", String((await state(page)).step));
      await page.keyboard.press("Enter"); await settle(page, 400);
      L.check("AB4 Enter stays on step one", (await state(page)).step === "agent", String((await state(page)).step));
      /* AB3 — a new name, the agency ask answered, then two actions */
      await typeIn(page, "name", NAME); await settle(page, 200);
      await press(page, "add-later"); await settle(page, 400);
      L.check("AB3 the agency is asked for", (await page.locator('[data-aag="agency-ask"]').count()) === 1, "no ask");
      await press(page, "ask-unknown"); await settle(page, 300);
      L.check("AB3 Agency unknown is marked", (await page.locator('[data-aag="agency-unknown"]').count()) === 1, "not marked");
      const before = (await agentsNamed(NAME)).length;
      let actions = 0;
      await press(page, "add-later"); actions++; await settle(page, 800);
      await press(page, "add"); actions++; await settle(page, 1500);
      const s = await state(page);
      L.check("AB3 added: the added screen", s.step === "done", String(s.step));
      L.check("AB3 in two actions", actions === 2, String(actions));
      const saved = await agentsNamed(NAME);
      L.check("AB3 one agent saved", saved.length === before + 1, `${before} → ${saved.length}`);
      L.check("AB3 saved as Agency unknown", saved[0]?.rec.agencyUnknown === true, JSON.stringify(saved[0]?.rec));
    } finally {
      await removeAgents(NAME);
    }
    L.done(11);
  });

  test("AB5 + AB7 + AB8 · the review: whole card, the card's count, and the saved record", async ({ page }) => {
    const L = new Ledger("AB5-AB7-AB8");
    const FULL = "Sarah Jonesworth", LEAN = "Tamsin Ledbury";
    try {
      /* the lean agent: a name and an agency only */
      await openJourney(page);
      await typeIn(page, "name", LEAN); await typeIn(page, "agency", "Fenwick & Rowe");
      await press(page, "add-later"); await settle(page, 1200);
      L.check("AB5 lean: 2 of 6", (await page.locator('[data-aag="details-n"]').innerText()).trim() === "2 of 6", await page.locator('[data-aag="details-n"]').innerText());
      L.check("AB5 lean: the card's Finish block shows", (await page.locator('[data-aag="preview"] [data-acv2="finish-count"]').count()) === 1, "no block");
      await closeAll(page);
      /* the full agent */
      await openJourney(page);
      await fillAll(page, FULL);
      const st = await state(page);
      L.check("on the review", st.step === "add", String(st.step));
      L.check("AB5 full: 6 of 6", (await page.locator('[data-aag="details-n"]').innerText()).trim() === "6 of 6", await page.locator('[data-aag="details-n"]').innerText());
      L.check("AB5 full: no Finish block", (await page.locator('[data-aag="preview"] [data-acv2="finish-count"]').count()) === 0, "a block");
      /* AB8 — the whole card in view, nothing scrolling inside it */
      const fit = await page.evaluate(() => {
        const pv = document.querySelector<HTMLElement>('[data-aag="preview"]')!;
        const sb = document.querySelector<HTMLElement>('[data-aag="root"] [data-aag="body"]')!;
        const p = pv.getBoundingClientRect(), b = sb.getBoundingClientRect();
        const inner = pv.querySelector<HTMLElement>(".aag-pvin")!.getBoundingClientRect();
        const scrollers = [...pv.querySelectorAll<HTMLElement>("*")].filter((e) => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1; }).length;
        return { inBody: p.top >= b.top - 0.5 && p.bottom <= b.bottom + 0.5, card: inner.height <= p.height + 1 && inner.width <= p.width + 1, scrollers, bodyScroll: sb.scrollHeight - sb.clientHeight, p: [p.top, p.bottom, b.top, b.bottom] };
      });
      L.check("AB8 the preview is inside the visible body", fit.inBody, JSON.stringify(fit));
      L.check("AB8 the card fits its frame", fit.card, JSON.stringify(fit));
      L.check("AB8 nothing scrolls inside the preview", fit.scrollers === 0, String(fit.scrollers));
      /* AB7 — add, then read the record back */
      await press(page, "add"); await settle(page, 1500);
      const saved = await agentsNamed(FULL);
      L.check("AB7 saved once", saved.length === 1, String(saved.length));
      const r = saved[0]?.rec ?? {};
      const want: Record<string, unknown> = {
        name: FULL, agency: "Fenwick & Rowe", email: "sarah@fenwick.example", website: "https://fenwick.example", genres: ["Thriller", "Crime"],
        mswlNotes: "Twisty, character-led thrillers.", submissionStatus: "Open", submissionMethod: "Email", starRating: 4,
        materialsWanted: ["Query letter", "Synopsis (1 pages)", "First 3 chapters"], notes: "", city: "London", country: "GB",
        responseTimeWeeks: 8, noResponseMeansNo: true,
        /* design v15 — the wishlist page link, where the card reads it */
        socials: [{ platform: "MSWL", handle: "https://fenwick.example/sarah" }],
      };
      for (const [k, v] of Object.entries(want)) L.check(`AB7 ${k}`, JSON.stringify(r[k]) === JSON.stringify(v), `${JSON.stringify(r[k])} vs ${JSON.stringify(v)}`);
      const extra = Object.keys(r).filter((k) => !(k in want) && !["id", "userId", "dateAdded", "lastCheckedDate", "mswlCheckedAt"].includes(k));
      L.check("AB7 no field the old journey would not have written", extra.length === 0, extra.join(","));
    } finally {
      await removeAgents(FULL); await removeAgents(LEAN);
    }
    L.done(25);
  });

  test("AB6 · from inside Log a query, back with the agent chosen", async ({ page }) => {
    const L = new Ledger("AB6-laq");
    const NAME = "Ottoline Breck";
    try {
      await openApp(page, "/dashboard", { width: 1440, height: 900 });
      await page.locator("[data-shell=quick-btn]").filter({ visible: true }).first().click(); await settle(page, 300);
      await page.locator("[data-quick='query']").click(); await settle(page, 1000);
      await page.locator("[data-qls='find']").fill(NAME); await settle(page, 400);
      await page.locator("[data-qls='new-agent']").filter({ visible: true }).first().click(); await settle(page, 900);
      L.check("the journey opens over Log a query", (await state(page)).journey, "no journey");
      L.check("Log a query steps back", await page.evaluate(() => document.body.classList.contains("aag-over-laq")), "not stepped back");
      const typed = await page.locator('[data-aag="root"] [data-aag="name"]').inputValue({ timeout: 5000 }).catch(() => "");
      L.check("the typed name came with it", typed === NAME, typed);
      L.check("its primary reads Add and go back to your query", /Add and go back to your query/.test(await page.locator('[data-aag="root"] [data-aag="add-now"]').innerText({ timeout: 5000 }).catch(() => "")), "label");
      await typeIn(page, "agency", "Hale & Finch");
      await press(page, "add-now"); await settle(page, 1500);
      L.check("added: the line", /Back to your query\. Ottoline is already chosen\./.test(await page.locator('[data-aag="done-line"]').innerText({ timeout: 5000 }).catch(() => "")), "line");
      await press(page, "back-laq"); await settle(page, 900);
      const after = await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>(".laq:not(.aag):not(.rar)")].find((e) => e.getBoundingClientRect().width > 0);
        const who = root?.querySelector<HTMLElement>('[data-qls="step"][data-k="who"] b, .laq-s[data-k="who"] b');
        return { open: !!root, aag: !!document.querySelector('[data-aag="root"]'), stepped: document.body.classList.contains("aag-over-laq"), who: who?.textContent ?? root?.querySelector(".laq-trk")?.textContent ?? "" };
      });
      L.check("Log a query is open again", after.open && !after.aag, JSON.stringify(after));
      L.check("no longer stepped back", !after.stepped, JSON.stringify(after));
      L.check("the new agent is chosen", after.who.includes("Ottoline"), after.who);
    } finally {
      await closeAll(page);
      await removeAgents(NAME);
    }
    L.done(8);
  });
  test("AB9 · the sample is typed", async ({ page }) => {
    const L = new Ledger("AB9-sample");
    const NAME = "Imogen Thackery";
    try {
      await openJourney(page);
      await typeIn(page, "name", NAME); await typeIn(page, "agency", "Fenwick & Rowe");
      await press(page, "next"); await settle(page);
      await press(page, "next"); await settle(page);
      L.check("on Asks for", (await state(page)).step === "asks", String((await state(page)).step));
      await page.locator('[data-aag="tile"][data-k="sample"] > button').click(); await settle(page, 300);
      const amt = page.locator('[data-aag="root"] [data-sx="amt"]');
      const sub = page.locator('[data-aag="tile"][data-k="sample"] [data-aag="tile-sub"]');
      L.check("the typed control is drawn", (await amt.count()) === 1, String(await amt.count()));
      L.check("it reads as a sentence: The first", (await page.locator('[data-sx="lead"]').innerText()).trim() === "The first", await page.locator('[data-sx="lead"]').innerText());
      L.check("no − or + button in the control", await page.locator('[data-aag="root"] [data-sx="root"]').evaluate((r) => [...r.querySelectorAll("button")].every((b) => !/^\s*[−+-]\s*$/.test(b.textContent ?? ""))), "a stepper button");
      await page.locator('[data-sx="unit"][data-k="words"]').click(); await settle(page, 200);
      await amt.fill("7500"); await settle(page, 200);
      await page.locator('[data-aag="root"] h2').first().click(); await settle(page, 200);
      L.check("7500 as words shows 7,500", (await amt.inputValue()) === "7,500", await amt.inputValue());
      L.check("the tile follows: First 7,500 words", (await sub.innerText()).trim() === "First 7,500 words", await sub.innerText());
      await page.locator('[data-sx="unit"][data-k="pages"]').click(); await settle(page, 200);
      L.check("changing unit keeps the number", (await amt.inputValue()) === "7500", await amt.inputValue());
      await amt.fill("35"); await settle(page, 200);
      await amt.press("ArrowUp"); await settle(page, 100);
      L.check("ArrowUp steps it by one", (await amt.inputValue()) === "36", await amt.inputValue());
      await amt.press("ArrowDown"); await settle(page, 100);
      L.check("ArrowDown steps it back", (await amt.inputValue()) === "35", await amt.inputValue());
      L.check("no common ask matches 35 pages", (await page.locator('[data-sx="ask"].is-on').count()) === 0, String(await page.locator('[data-sx="ask"].is-on').count()));
      await page.locator('[data-sx="ask"][data-k="pages:50"]').click(); await settle(page, 200);
      const on = await page.locator('[data-sx="ask"].is-on').evaluateAll((e) => e.map((x) => (x as HTMLElement).dataset.k));
      L.check("a common ask sets amount and unit, and only it is chosen", JSON.stringify(on) === '["pages:50"]' && (await amt.inputValue()) === "50", `${JSON.stringify(on)} ${await amt.inputValue()}`);
      await amt.fill("35"); await settle(page, 200);
      L.check("no starting point is offered (the record has none)", (await page.locator('[data-sx="to-part"]').count()) === 0, "offered");
      await press(page, "to-end"); await settle(page, 900);
      await press(page, "add"); await settle(page, 1500);
      const saved = await agentsNamed(NAME);
      L.check("35 typed as pages saves 35", JSON.stringify(saved[0]?.rec.materialsWanted ?? null).includes("First 35 pages"), JSON.stringify(saved[0]?.rec.materialsWanted));
    } finally { await removeAgents(NAME); }
    L.done(13);
  });

  test("AB10 · field notes are an i: no italic aside, the bubble inside the panel on hover and on focus", async ({ page }) => {
    const L = new Ledger("AB10-hints");
    await openJourney(page);
    const asides = () => page.evaluate(() => [...document.querySelectorAll('[data-aag="root"] label i, [data-aag="root"] .aag-lab i, [data-aag="root"] .laq-fl > span i')].length);
    L.check("step 1: no italic aside in a label", (await asides()) === 0, String(await asides()));
    await typeIn(page, "name", "Wren Halloway"); await typeIn(page, "agency", "Fenwick & Rowe");
    await press(page, "next"); await settle(page);
    L.check("step 2: no italic aside in a label", (await asides()) === 0, String(await asides()));
    const hints = await page.locator('[data-aag="root"] [data-aag="hint"]').evaluateAll((e) => e.map((x) => (x as HTMLElement).dataset.k));
    L.check("two notes, wishlist and link", JSON.stringify(hints) === '["wish","mswl"]', JSON.stringify(hints));
    const read = (k: string) => page.evaluate((key) => {
      const h = document.querySelector<HTMLElement>(`[data-aag="root"] [data-aag="hint"][data-k="${key}"]`)!;
      const tip = h.querySelector<HTMLElement>('[data-aag="hint-tip"]')!;
      const panel = h.closest<HTMLElement>(".spanel")!.getBoundingClientRect();
      const body = h.closest<HTMLElement>('[data-aag="body"]')!.getBoundingClientRect();
      const lab = h.closest<HTMLElement>(".aag-lab")!.getBoundingClientRect();
      const t = tip.getBoundingClientRect(), cs = getComputedStyle(tip);
      const i = h.querySelector<HTMLElement>('[data-aag="hint-i"]')!.getBoundingClientRect();
      return { shown: cs.visibility === "visible" && Number(cs.opacity) > 0.9, inPanel: t.left >= panel.left - 0.5 && t.right <= panel.right + 0.5 && t.top >= panel.top - 0.5 && t.bottom <= panel.bottom + 0.5,
        inBody: t.top >= body.top - 0.5 && t.bottom <= body.bottom + 0.5, aboveLabel: t.bottom <= lab.top + 0.5, i: [Math.round(i.width), Math.round(i.height)], text: tip.textContent ?? "" };
    }, k);
    for (const k of ["wish", "mswl"]) {
      await page.locator(`[data-aag="root"] [data-aag="hint"][data-k="${k}"] [data-aag="hint-i"]`).hover(); await settle(page, 300);
      const h = await read(k);
      L.check(`${k}: the i is 20px`, h.i[0] === 20 && h.i[1] === 20, JSON.stringify(h.i));
      L.check(`${k}: hover shows the bubble`, h.shown, JSON.stringify(h));
      L.check(`${k}: wholly inside the panel`, h.inPanel && h.inBody, JSON.stringify(h));
      L.check(`${k}: above its label, clear of its field`, h.aboveLabel, JSON.stringify(h));
      await page.mouse.move(5, 5); await settle(page, 300);
      L.check(`${k}: hidden when the pointer leaves`, !(await read(k)).shown, "still shown");
      await page.locator(`[data-aag="root"] [data-aag="hint"][data-k="${k}"] [data-aag="hint-i"]`).focus(); await settle(page, 300);
      const f = await read(k);
      L.check(`${k}: keyboard focus shows the bubble`, f.shown && f.inPanel && f.inBody, JSON.stringify(f));
      await page.keyboard.press("Escape"); await settle(page, 300);
      L.check(`${k}: Escape closes the bubble first`, !(await read(k)).shown && (await state(page)).journey, JSON.stringify(await state(page)));
    }
    L.check("wishlist words", (await read("wish")).text === "Use Wren’s own words, copied from the wishlist or agency page, so the card reads the way Wren wrote it.", (await read("wish")).text);
    L.check("link words", (await read("mswl")).text === "The page where Wren lists what Wren wants to see. Leave it blank if there isn’t one.", (await read("mswl")).text);
    for (const step of ["asks", "how", "reply", "add"]) {
      await press(page, "next"); await settle(page);
      L.check(`${step}: no italic aside in a label`, (await asides()) === 0, String(await asides()));
    }
    await closeAll(page);
    L.done(23);
  });

  test("AB11 · the wishlist page link is saved where the card reads it", async ({ page }) => {
    const L = new Ledger("AB11-mswl");
    const NAME = "Juniper Ashdown";
    try {
      await openJourney(page);
      await typeIn(page, "name", NAME); await typeIn(page, "agency", "Fenwick & Rowe");
      await press(page, "next"); await settle(page);
      await page.locator('[data-aag="root"] [data-aag="mswl"]').fill("agency.co.uk/juniper-ashdown");
      L.check("the step reads Carry on once the link is in", /Carry on/.test(await page.locator('[data-aag="root"] [data-aag="next"]').innerText()), await page.locator('[data-aag="root"] [data-aag="next"]').innerText());
      await press(page, "to-end"); await settle(page, 900);
      await press(page, "add"); await settle(page, 1500);
      const saved = await agentsNamed(NAME);
      const so = (saved[0]?.rec.socials ?? []) as { platform?: string; handle?: string }[];
      L.check("saved once", saved.length === 1, String(saved.length));
      L.check("the MSWL entry carries the link", so.some((x) => x.platform === "MSWL" && x.handle === "https://agency.co.uk/juniper-ashdown"), JSON.stringify(so));
    } finally { await removeAgents(NAME); }
    L.done(3);
  });

  /** the preview ring's own count: six less the card's gaps, read off its ring and its Finish block */
  const ringOf = (page: Page) => page.evaluate(() => {
    const pv = document.querySelector('[data-aag="preview"]');
    const fin = pv?.querySelector<HTMLElement>('[data-acv2="finish"]');
    if (!pv) return null;
    if (!fin) return { n: 6, block: false, adds: [] as string[] };
    const c = fin.querySelectorAll("svg.ring circle")[1];
    const [d, all] = (c?.getAttribute("stroke-dasharray") ?? "0 1").split(" ").map(Number);
    return { n: Math.round((6 * d) / all), block: true, adds: [...fin.querySelectorAll<HTMLElement>('[data-acv2="finish-add"]')].map((b) => b.dataset.k ?? "") };
  });
  const bigN = async (page: Page) => parseInt((await page.locator('[data-aag="details-n"]').innerText({ timeout: 5000 }).catch(() => "")).trim(), 10);

  test("AB12 · a closed agent is asked when they reopen; a date saves, Not sure saves none, Open never asks", async ({ page }) => {
    const L = new Ledger("AB12-reopen");
    const DATED = "Lowri Penhaligon", UNSURE = "Mabli Trevanion";
    const toHow = async (name: string) => {
      await openJourney(page);
      await typeIn(page, "name", name); await typeIn(page, "agency", "Fenwick & Rowe");
      for (let i = 0; i < 3; i++) { await press(page, "next"); await settle(page); }
    };
    const moveTo = (w: number) => page.locator('[data-aag="reopen-slider"] input[type="range"]').evaluate((e: HTMLInputElement, v: number) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!; set.call(e, String(v)); e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); }, w);
    try {
      /* Open: the question is not in the page */
      await toHow(DATED);
      L.check("on How", (await state(page)).step === "how", String((await state(page)).step));
      L.check("before a door is chosen: no reopening question", (await page.locator('[data-aag="reopen"]').count()) === 0, "asked");
      await page.locator('[data-aag="door"][data-k="open"]').click(); await settle(page, 300);
      L.check("Open: the reopening question is not in the page", (await page.locator('[data-aag="reopen"]').count()) === 0, "asked");
      await page.locator('[data-aag="door"][data-k="unsure"]').click(); await settle(page, 300);
      L.check("Not sure: the reopening question is not in the page", (await page.locator('[data-aag="reopen"]').count()) === 0, "asked");
      /* Closed, with a date */
      await page.locator('[data-aag="door"][data-k="closed"]').click(); await settle(page, 300);
      L.check("Closed: When does Lowri reopen to queries?", /When does Lowri reopen to queries\?/.test(await page.locator('[data-aag="reopen"]').innerText({ timeout: 4000 }).catch(() => "")), "no question");
      L.check("it starts as Not sure", (await page.locator('[data-aag="reopen-slider"]').getAttribute("data-unknown")) === "1", "set");
      L.check("labelled Reopens", (await page.locator('[data-aag="reopen-slider"] label').innerText()).trim() === "Reopens", await page.locator('[data-aag="reopen-slider"] label').innerText());
      L.check("Not sure says it stays as something to add", /Not known yet\. It stays on Lowri’s card as something to add\./.test(await page.locator('[data-aag="reopen-note"]').innerText()), await page.locator('[data-aag="reopen-note"]').innerText());
      await moveTo(10); await settle(page, 300);
      const when = new Date(); when.setDate(when.getDate() + 70);
      const iso = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
      const read = await page.locator('[data-aag="reopen-slider"] .sa-wk-read').innerText();
      L.check("the readout names the date and the weeks", /· in 10 weeks$/.test(read.trim()), read);
      L.check("set: This goes on Lowri’s card.", (await page.locator('[data-aag="reopen-note"]').innerText()).trim() === "This goes on Lowri’s card.", await page.locator('[data-aag="reopen-note"]').innerText());
      await press(page, "to-end"); await settle(page, 1000);
      const dated = await ringOf(page), datedN = await bigN(page);
      L.check("dated: the big number equals the ring's own count", dated?.n === datedN, `${datedN} vs ${JSON.stringify(dated)}`);
      L.check("PREMISE (read, not gated) · dated: a Reopening date gap on the preview", true, `gap shown: ${dated?.adds.includes("reopen")} — the card's rule clears it with a reopen reminder, not a date`);
      await press(page, "add"); await settle(page, 1500);
      const s1 = await agentsNamed(DATED);
      L.check("a date saves to reopensOn", s1[0]?.rec.reopensOn === iso, `${JSON.stringify(s1[0]?.rec.reopensOn)} vs ${iso}`);
      L.check("and the door is Closed", s1[0]?.rec.submissionStatus === "Closed", String(s1[0]?.rec.submissionStatus));
      await closeAll(page);
      /* Closed, Not sure */
      await toHow(UNSURE);
      await page.locator('[data-aag="door"][data-k="closed"]').click(); await settle(page, 300);
      await moveTo(4); await settle(page, 200);
      await page.locator('[data-aag="reopen-slider"] .sa-wk-unkbtn').click(); await settle(page, 300);
      L.check("the Not sure pill clears it", (await page.locator('[data-aag="reopen-slider"]').getAttribute("data-unknown")) === "1", "still set");
      await press(page, "to-end"); await settle(page, 1000);
      const unsure = await ringOf(page), unsureN = await bigN(page);
      L.check("Not sure: the Reopening date gap shows", !!unsure?.adds.includes("reopen"), JSON.stringify(unsure));
      L.check("Not sure: the big number equals the ring's own count", unsure?.n === unsureN, `${unsureN} vs ${JSON.stringify(unsure)}`);
      L.check("PREMISE (read, not gated) · Not sure is one lower than dated", true, `dated ${datedN}, not sure ${unsureN}`);
      await press(page, "add"); await settle(page, 1500);
      const s2 = await agentsNamed(UNSURE);
      L.check("Not sure saves no reopensOn", s2.length === 1 && s2[0].rec.reopensOn === undefined, JSON.stringify(s2[0]?.rec.reopensOn));
    } finally { await closeAll(page); await removeAgents(DATED); await removeAgents(UNSURE); }
    L.done(19);
  });

  test("AB13 · the big number is the preview ring's own count, for three agents", async ({ page }) => {
    const L = new Ledger("AB13-count");
    const FULL = "Rosalind Vetch";
    /* everything filled (and Open) */
    await openJourney(page);
    await fillAll(page, FULL);
    const f = await ringOf(page);
    L.check("full: 6 of 6", (await page.locator('[data-aag="details-n"]').innerText()).trim() === "6 of 6", await page.locator('[data-aag="details-n"]').innerText());
    L.check("full: no Finish block", f?.block === false, JSON.stringify(f));
    L.check("full: the number is the ring's", f?.n === (await bigN(page)), JSON.stringify(f));
    await closeAll(page);
    /* a name and an agency */
    await openJourney(page);
    await typeIn(page, "name", "Seren Applewhite"); await typeIn(page, "agency", "Fenwick & Rowe");
    await press(page, "add-later"); await settle(page, 1200);
    const a = await ringOf(page);
    L.check("name and agency: the number is the ring's", a?.n === (await bigN(page)), `${await bigN(page)} vs ${JSON.stringify(a)}`);
    L.check("name and agency: the gaps are the card's buttons", a?.block === true && a.adds.length === 6 - (await bigN(page)), JSON.stringify(a));
    await closeAll(page);
    /* a name alone, Agency unknown */
    await openJourney(page);
    await typeIn(page, "name", "Tegwen Moorcroft");
    await press(page, "add-later"); await settle(page, 400);
    await press(page, "ask-unknown"); await settle(page, 300);
    await press(page, "add-later"); await settle(page, 1200);
    const u = await ringOf(page);
    L.check("Agency unknown: the number is the ring's", u?.n === (await bigN(page)), `${await bigN(page)} vs ${JSON.stringify(u)}`);
    L.check("Agency unknown: the gaps are the card's buttons", u?.block === true && u.adds.length === 6 - (await bigN(page)), JSON.stringify(u));
    await closeAll(page);
    await removeAgents(FULL);
    L.done(7);
  });
});
