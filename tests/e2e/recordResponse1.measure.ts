/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v1 (design-refs/record-a-response-v1/record-a-response-v1.html) — the locks on the rendered page,
 * over the emulator's harness account, at 1512×900 and 1280×800 (the phone lock at 390). The source and server-render
 * locks (R1's census, R4–R7, R12's store fallback) are src/components/queries/recordResponse1.test.tsx.
 *
 *   R1  each door leaves one dialog: the card frame; no .qad-drawer, no [data-qc149f="who"]
 *   R2  from the dashboard: every live query's row is reachable inside the panel's box; the footer at the panel's foot
 *   R3  a pick: that query's card, its composer "What did {first} say?", in the same panel
 *   R4  closed: none with nothing typed; typing finds one; its pick opens Reopen
 *   R8  the card and the agent card: a scrim at .45 over the sidebar and the bar; gone on close
 *   R9  leaving with something entered: the discard strip and the panel stays; with nothing, it closes and focus is home
 *   R10 a save: the card stays open on the new status with Undo; the Undo restores it (this run writes nothing it keeps)
 *   R11 the band's ‹ ›: present for the list's set and stepping it; absent for a set of one
 *   R12 at 390: Record a response is still the phone's own flow
 *
 * ⚠️ EMULATOR ONLY (`npm run e2e:emu -- tests/e2e/recordResponse1.measure.ts --project=measure`). `RR_MUTATE=<lock>`
 *    applies that lock's break in the page, for its red-first reading.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";
import { ensureSignedIn } from "./measure";

/* red mode: each break is its own pass, so one red must not skip the rest */
test.describe.configure({ mode: process.env.RR_RED === "1" ? "default" : "serial" });
const DIR = "reports/record-a-response-v1";
/* Record a response v1.1, Phase 2 — RR_RED=1 runs every desk lock under its own break, at 1512 only, in one emulator
   session; each such run passes only when that lock's OWN readings go red (Ledger.done). RR_MUTATE=<lock> runs one. */
const RED = process.env.RR_RED === "1";
const ONE = process.env.RR_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
const GROUPS: Record<string, string[]> = { R1: ["R1"], "R2-R4": ["R2", "R3", "R4"], "R8-R9": ["R8", "R9"], "R10-R11": ["R10", "R11"] };
const PRIYA = { q: "cv25-q-03", agent: "cv25-agent-03", name: "Priya Raman", first: "Priya" };
const GEORGE = { q: "cv25-q-12", name: "George Ashworth", first: "George" };

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string, public mut = "") {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.mut ? `mut-${this.mut}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name}${this.mut ? ` [${this.mut}]` : ""} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}${this.mut ? ` under ${this.mut}` : ""}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    if (this.mut) {
      /* the red reading: the break must turn THIS lock's own readings red; anything else red is noise, reported above */
      const own = this.rows.filter((r) => !r.ok && r.where.startsWith(`${this.mut} `));
      expect(own.length, `${this.mut} stayed green under its own break: the lock is broken`).toBeGreaterThan(0);
      return;
    }
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}
const shot = async (page: Page, name: string) => { mkdirSync(`${DIR}/shots`, { recursive: true }); await page.screenshot({ path: `${DIR}/shots/${name}.png` }); };
const settle = (page: Page, ms = 700) => page.waitForTimeout(ms);
/** what is on screen now: dialogs (no closing copies), the panel, the old containers */
const census = (page: Page) => page.evaluate(() => {
  const shown = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== "hidden"; };
  const dialogs = [...document.querySelectorAll("[role='dialog']")].filter((e) => !e.closest("[data-ghost]") && shown(e));
  return {
    dialogs: dialogs.length,
    which: dialogs.map((e) => `${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0]}[${e.getAttribute("aria-label") ?? ""}]${e.getAttribute("data-qp") ? " qp" : ""}`),
    panel: !!document.querySelector("[data-qp='panel']"),
    frame: !!document.querySelector("[data-qp='panel'] [data-qc152='card']"),
    picker: !!document.querySelector("[data-qp='panel'] [data-qcrr='picker']"),
    composer: document.querySelector("[data-qp='panel'] [data-qc1522='composer-title']")?.textContent ?? null,
    qad: [...document.querySelectorAll(".qad-drawer")].filter(shown).length,
    who149: document.querySelectorAll("[data-qc149f='who']").length,
  };
});
const closeAll = async (page: Page) => { for (let i = 0; i < 4; i++) { if (!(await page.locator("[data-qp='panel'], [data-cl262='panel']").count())) break; await page.keyboard.press("Escape"); await settle(page, 350); } };
async function pressVisible(page: Page, sel: string) {
  const ok = await page.evaluate((s) => {
    const el = [...document.querySelectorAll<HTMLElement>(s)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
    if (!el) return false;
    el.focus(); el.click(); return true;
  }, sel);
  await settle(page);
  return ok;
}
async function openPicker(page: Page, vp: { width: number; height: number }) {
  await openApp(page, "/dashboard", vp);
  await pressVisible(page, "[data-d2='record']");
  await page.locator("[data-qp='panel'] [data-qcrr='picker']").waitFor({ timeout: 10_000 });
  await settle(page, 400);
}

/** the desk locks at one size, under one break (MUT) or none; `want` says whether a group runs in this pass */
function deskLocks(vp: { width: number; height: number }, MUT: string) {
  const want = (g: string) => !MUT || GROUPS[g].includes(MUT);
  test.describe(`${vp.width}×${vp.height}${MUT ? ` · red ${MUT}` : ""}`, () => {
    test.beforeEach(async ({ page }) => { await page.setViewportSize(vp); });

    if (want("R1")) test(`R1 · every door leaves one dialog, the card frame · ${vp.width}`, async ({ page }) => {
      const L = new Ledger(`R1-${vp.width}`, MUT);
      const doors = [
        { door: "dashboard header", route: "/dashboard", sel: "[data-d2='record']" },
        { door: "Analytics header", route: "/queries/analytics", sel: "button:has-text('Record a response')" },
        { door: "Responses header", route: "/queries/responses", sel: "button:has-text('Record a response')" },
        { door: "Query Centre header", route: "/queries", sel: "button:has-text('Record a response')" },
        { door: "agent card", route: `/agents?agent=${PRIYA.agent}`, sel: "[data-cl262='panel'] button:has-text('Record a response')" },
      ];
      L.check("the door list is not empty", doors.length >= 5, String(doors.length));
      for (const d of doors) {
        await openApp(page, d.route, vp);
        if (d.door === "agent card") await page.locator("[data-cl262='panel']").waitFor({ timeout: 20_000 }).catch(() => {});
        const btn = page.locator(d.sel).filter({ visible: true }).first();
        const found = (await btn.count()) > 0;
        L.check(`R1 ${d.door}: the door is on the page`, found, d.sel);
        if (!found) continue;
        const before = await census(page);
        await btn.click({ timeout: 5000 }).catch(() => {});
        await settle(page, 1000);
        /* the red reading: the old drawer journey, as the door used to open it */
        if (MUT === "R1") await page.evaluate(() => document.querySelector("[data-qp='panel']")?.setAttribute("data-qp", "x"));
        const c = await census(page);
        /* what the door adds: one dialog, and it is the panel (the page's own open boxes, e.g. the dashboard's "How it works",
           were there before the press) */
        /* the agent card's door: the query card takes the agent card's place, so the count holds and the agent card is gone */
        const added = c.which.filter((w) => !before.which.includes(w));
        const oneDialog = d.door === "agent card"
          ? c.dialogs === before.dialogs && added.length === 1 && added[0].endsWith(" qp") && !c.which.some((w) => w.startsWith("div.cl262-panel"))
          : c.dialogs - before.dialogs === 1 && added.every((w) => w.endsWith(" qp"));
        L.check(`R1 ${d.door}: one dialog`, oneDialog, `${JSON.stringify(before.which)} → ${JSON.stringify(c.which)}`);
        L.check(`R1 ${d.door}: the card frame`, c.panel && c.frame && (c.picker || !!c.composer), JSON.stringify(c));
        L.check(`R1 ${d.door}: no old drawer, no v149 list`, c.qad === 0 && c.who149 === 0, JSON.stringify(c));
        if (d.door === "agent card") {
          L.check("R1 agent card: the composer opens on the agent's query", c.composer === `What did ${PRIYA.first} say?`, String(c.composer));
          const back = await page.locator("[data-qp='panel']").getByText(`Back to ${PRIYA.first}`).count();
          L.check("R1 agent card: ← Back to {first}", back > 0, String(back));
          await shot(page, `agent-card-route-${vp.width}`);
        }
        await closeAll(page);
      }
      L.done(doors.length * 4);
    });

    if (want("R2-R4")) test(`R2–R4 · the picker whole, a pick, closed only by searching · ${vp.width}`, async ({ page }) => {
      const L = new Ledger(`R2-R4-${vp.width}`, MUT);
      await openPicker(page, vp);
      if (MUT === "R2") await page.addStyleTag({ content: ".qc152.qcrr .qc152-in > .qcrr-body { flex: 0 1 auto !important; max-height: 60px; overflow: hidden !important; }" });
      if (MUT === "R4") await page.evaluate(() => document.querySelector("[data-qcrr='row']")?.setAttribute("data-group", "closed"));
      await shot(page, `picker-${vp.width}`);
      const m = await page.evaluate(() => {
        const panel = document.querySelector("[data-qp='panel']")!.getBoundingClientRect();
        const list = document.querySelector<HTMLElement>("[data-qcrr='list']")!;
        const foot = document.querySelector("[data-qcrr='foot']")!.getBoundingClientRect();
        const rows = [...document.querySelectorAll<HTMLElement>("[data-qcrr='row']")];
        const out: { id: string; inside: boolean }[] = [];
        for (const r of rows) {
          r.scrollIntoView({ block: "nearest" });
          const b = r.getBoundingClientRect(), l = list.getBoundingClientRect();
          out.push({ id: r.dataset.id ?? "", inside: b.top >= l.top - 1 && b.bottom <= l.bottom + 1 && l.top >= panel.top && l.bottom <= panel.bottom && b.left >= panel.left && b.right <= panel.right && b.height > 30 });
        }
        list.scrollTop = 0;
        return { n: rows.length, outside: out.filter((x) => !x.inside).map((x) => x.id), closed: rows.filter((r) => r.dataset.group === "closed").length,
          footGap: Math.round(panel.bottom - foot.bottom), listH: Math.round(list.getBoundingClientRect().height),
          groups: [...document.querySelectorAll("[data-qcrr='group-label']")].map((e) => e.textContent), focus: document.activeElement?.getAttribute("data-qcrr") };
      });
      L.check("R2 population: rows", m.n >= 20, String(m.n));
      L.check("R2 every row reachable inside the panel's box", m.outside.length === 0, `outside: ${m.outside.slice(0, 5).join(",")}`);
      L.check("R2 the list has height (not a clipped pop-down)", m.listH > 200, `${m.listH}px`);
      L.check("R2 the footer at the panel's foot", m.footGap >= 0 && m.footGap <= 16, `${m.footGap}px from the panel's bottom`);
      L.check("R2 the groups, in order", m.groups[0]?.startsWith("Waiting to hear back · ") && m.groups[1]?.startsWith("Already with you · ") && m.groups.length === 2, JSON.stringify(m.groups));
      L.check("R2 the search field has focus on open", m.focus === "search", String(m.focus));
      L.check("R4 nothing typed: no closed query listed", m.closed === 0, String(m.closed));

      /* R4 — a closed agent, by name */
      await page.keyboard.type("Ashworth");
      await settle(page, 400);
      const c4 = await page.evaluate(() => ({ rows: [...document.querySelectorAll<HTMLElement>("[data-qcrr='row']")].map((r) => ({ id: r.dataset.id, g: r.dataset.group })),
        label: document.querySelector("[data-qcrr='group-label']")?.textContent }));
      L.check("R4 typing finds the closed query", c4.rows.some((r) => r.g === "closed"), JSON.stringify(c4));
      L.check("R4 under its own heading", c4.label === "Closed · a late reply reopens it", String(c4.label));
      await shot(page, `picker-closed-search-${vp.width}`);
      await page.keyboard.press("Enter");
      await settle(page, 1200);
      const r4 = await census(page);
      L.check("R4 its pick opens Reopen", r4.composer === `Reopen ${GEORGE.first}’s query`, String(r4.composer));
      await page.keyboard.press("Escape"); await settle(page, 400);

      /* R3 — a live query: its card and composer in the same panel */
      await closeAll(page);
      await openPicker(page, vp);
      const panelBefore = await page.locator("[data-qp='panel']").elementHandle();
      await page.keyboard.type(PRIYA.name);
      await settle(page, 300);
      await page.keyboard.press("Enter");
      await settle(page, 1200);
      if (MUT === "R3") await page.evaluate(() => document.querySelector("[data-qp='panel'] [data-qc1522='composer-title']")?.remove());
      const r3 = await census(page);
      const same = await page.evaluate((el) => !!el && el.isConnected && el === document.querySelector("[data-qp='panel']"), panelBefore);
      L.check("R3 the composer, titled for the agent", r3.composer === `What did ${PRIYA.first} say?`, String(r3.composer));
      L.check("R3 in the same panel (the frame stayed)", same && r3.which.filter((w) => w.endsWith(" qp")).length === 1, `same ${same}, ${JSON.stringify(r3.which)}`);
      const qid = await page.locator("[data-qp='panel']").getAttribute("data-qp-id");
      L.check("R3 the panel is that query's", qid === PRIYA.q, String(qid));
      const cancel = await page.locator("[data-qp='panel'] [data-qc1522='cancel']").textContent();
      L.check("R3 Cancel reads ← Someone else", cancel?.trim() === "← Someone else", String(cancel));
      await shot(page, `pick-mid-flow-${vp.width}`);
      /* one level up: back to the list, in the same frame */
      await page.locator("[data-qp='panel'] [data-qc1522='cancel']").click();
      await settle(page, 900);
      const back = await census(page);
      L.check("R3 ← Someone else goes back to the list", back.picker && back.which.filter((w) => w.endsWith(" qp")).length === 1, JSON.stringify(back));
      await closeAll(page);
      L.done(13);
    });

    if (want("R8-R9")) test(`R8–R9 · the dim, and leaving · ${vp.width}`, async ({ page }) => {
      const L = new Ledger(`R8-R9-${vp.width}`, MUT);
      const dimAt = () => page.evaluate(() => {
        const sc = [...document.querySelectorAll<HTMLElement>("[data-side-scrim]")].find((e) => !e.closest("[data-ghost]") && e.dataset.on === "true");
        if (!sc) return null;
        const bg = getComputedStyle(sc).backgroundColor, a = Number(bg.match(/rgba?\([^)]*,\s*([\d.]+)\)/)?.[1] ?? 1) * Number(getComputedStyle(sc).opacity);
        const hit = (el: Element | null) => { if (!el) return "none"; const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 20)); return t === sc ? "scrim" : (t?.className?.toString().slice(0, 40) ?? "none"); };
        const side = document.getElementById("ws-sidebar"), bar = [...document.querySelectorAll(".ws-pagebar")].find((b) => b.getBoundingClientRect().height > 0) ?? null;
        return { a: Math.round(a * 100) / 100, side: hit(side), bar: hit(bar), inert: !!document.getElementById("root")?.inert };
      });
      /* the query card */
      await openPicker(page, vp);
      if (MUT === "R8") await page.addStyleTag({ content: ".spanel-scrim[data-on='true'] { opacity: 0 !important; }" });
      await page.keyboard.type(PRIYA.name); await page.keyboard.press("Enter"); await settle(page, 1200);
      await page.waitForTimeout(300);
      const d1 = await dimAt();
      L.check("R8 query card: scrim at .45", !!d1 && Math.abs(d1.a - 0.45) <= 0.02, JSON.stringify(d1));
      L.check("R8 query card: over the sidebar and the bar", d1?.side === "scrim" && d1?.bar === "scrim", JSON.stringify(d1));
      L.check("R8 query card: the page is inert", !!d1?.inert, JSON.stringify(d1));
      await shot(page, `dim-query-card-${vp.width}`);

      /* R9 — something entered: the scrim asks first, and the panel stays */
      await page.locator("[data-qp='panel'] [data-qc1522='reply-types'] [data-v='passed']").click();
      await settle(page, 300);
      if (MUT === "R9") await page.evaluate(() => document.querySelector("[data-qc1522='composer']")?.removeAttribute("data-dirty"));
      await page.mouse.click(30, vp.height - 40);
      await settle(page, 500);
      const strip = await page.locator("[data-qp='panel'] [data-qc1522='discard-strip']").count();
      const still = await page.locator("[data-qp='panel']").count();
      L.check("R9 with an answer: the discard strip shows", strip === 1, String(strip));
      L.check("R9 with an answer: the panel stays", still === 1, String(still));
      await page.locator("[data-qp='panel'] [data-qc1522='discard']").click({ timeout: 6000 }).catch(() => {});
      await settle(page, 600);
      /* nothing entered: the scrim closes, and focus is back on the opener */
      await page.mouse.click(30, vp.height - 40);
      await settle(page, 700);
      const gone = await census(page);
      const focus = await page.evaluate(() => document.activeElement?.getAttribute("data-d2") ?? document.activeElement?.tagName ?? null);
      L.check("R9 with nothing entered: it closes", !gone.panel && !gone.which.some((w) => w.endsWith(" qp")), JSON.stringify(gone));
      L.check("R9 focus is back on the opener", focus === "record", String(focus));
      const d0 = await dimAt();
      L.check("R8 closing removes the scrim", d0 === null, JSON.stringify(d0));

      /* the agent card */
      await openApp(page, `/agents?agent=${PRIYA.agent}`, vp);
      await page.locator("[data-cl262='panel']").waitFor({ timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(300);
      const d2 = await dimAt();
      L.check("R8 agent card: scrim at .45", !!d2 && Math.abs(d2.a - 0.45) <= 0.02, JSON.stringify(d2));
      L.check("R8 agent card: over the sidebar and the bar", d2?.side === "scrim" && d2?.bar === "scrim", JSON.stringify(d2));
      await shot(page, `dim-agent-card-${vp.width}`);
      await closeAll(page);
      await page.waitForTimeout(500);
      L.check("R8 agent card: closing removes the scrim", (await dimAt()) === null, "");
      L.done(11);
    });

    if (want("R10-R11")) test(`R10–R11 · a save stays open; the band's arrows · ${vp.width}`, async ({ page }) => {
      const L = new Ledger(`R10-R11-${vp.width}`, MUT);
      await openPicker(page, vp);
      const r11one = await page.locator("[data-qp='panel'] [data-qc152='next']").count();
      L.check("R11 no arrows on the picker", r11one === 0, String(r11one));
      await page.keyboard.type(PRIYA.name); await page.keyboard.press("Enter"); await settle(page, 1200);
      L.check("R11 a set of one (opened from the dashboard): no arrows", (await page.locator("[data-qp='panel'] [data-qc152='next']").count()) === 0, "");
      /* R10 — Asked for the partial, saved; then its Undo */
      await page.locator("[data-qp='panel'] [data-qc1522='reply-types'] [data-v='req']").click();
      await settle(page, 300);
      await page.locator("[data-qp='panel'] [data-qc1522='save']").click();
      await settle(page, 2500);
      if (MUT === "R10") await page.evaluate(() => { const p = document.querySelector("[data-qp='panel'] [data-qc152='pill']"); if (p) p.textContent = "Queried"; });
      const after = await page.evaluate(() => ({
        panel: document.querySelector("[data-qp='panel']")?.getAttribute("data-qp-id") ?? null,
        pill: document.querySelector("[data-qp='panel'] [data-qc152='pill']")?.textContent ?? null,
        undo: !!document.querySelector("[data-qp='panel'] [data-qc1522='undo']"),
        composer: !!document.querySelector("[data-qp='panel'] [data-qc1522='composer']"),
      }));
      L.check("R10 the card is still open, on that query", after.panel === PRIYA.q, JSON.stringify(after));
      L.check("R10 on the new status", /Partial requested/i.test(after.pill ?? ""), String(after.pill));
      L.check("R10 Undo is showing", after.undo, JSON.stringify(after));
      L.check("R10 the composer has closed", !after.composer, JSON.stringify(after));
      await shot(page, `saved-${vp.width}`);
      await page.locator("[data-qp='panel'] [data-qc1522='undo']").click().catch(() => {});
      await settle(page, 2500);
      const undone = await page.locator("[data-qp='panel'] [data-qc152='pill']").textContent().catch(() => null);
      L.check("R10 the Undo restores Queried (nothing kept)", /Queried/i.test(undone ?? ""), String(undone));
      await closeAll(page);

      /* R11 — from the Query Centre's list: the list's set */
      await openApp(page, "/queries", vp);
      const row = page.locator("[data-qcv='row'], [data-qc151='row'], [data-qc154='card']").filter({ visible: true }).first();
      await row.click({ timeout: 5000 }).catch(() => {});
      await settle(page, 1200);
      const id0 = await page.locator("[data-qp='panel']").getAttribute("data-qp-id").catch(() => null);
      if (MUT === "R11") await page.addStyleTag({ content: "[data-qc152='next'], [data-qc152='prev'] { display: none !important; }" });
      const next = page.locator("[data-qp='panel'] [data-qc152='next']").filter({ visible: true });
      L.check("R11 the list's set: arrows on the band", (await next.count()) === 1, `${await next.count()} · opened ${id0}`);
      if (await next.count()) {
        await next.click(); await settle(page, 1200);
        const id1 = await page.locator("[data-qp='panel']").getAttribute("data-qp-id").catch(() => null);
        L.check("R11 › steps to the next query", !!id1 && id1 !== id0, `${id0} → ${id1}`);
      }
      await closeAll(page);
      L.done(8);
    });
  });
}
/* green: both sizes, no break · red (RR_RED=1): 1512 only, one pass per lock, each under its own break */
const DESK_MUTS = Object.values(GROUPS).flat();
if (RED) for (const m of DESK_MUTS) deskLocks(SIZES[0], m);
else if (ONE) deskLocks(SIZES[0], ONE);
else for (const vp of SIZES) deskLocks(vp, "");

/* Record a response v1.1, Phase 3 — R12 MEASURED. v1's probe went to /queries?q=… and tapped a name; at 390 the phone
   app opens on its own hub, so the probe never reached a door. The phone's two doors, as a writer meets them: the dock's
   + sheet, "An agent replied" (ReplyFlowV3, saving through lib/queryActions/respondSave), and the To-do deck's
   gone-quiet task, "They did reply" (wsFlows' tiles, saving through recordQueryResponse). Each must open its own flow
   (no card-frame picker, no composer), save (the query reads Rejected), and its Undo put it back; then every document
   is restored. RR_MUTATE=R12 strips the flow's marker after it opens: the red. */
test("R12 · at 390 the phone keeps its own flow, and saves as before", async ({ page }) => {
  test.setTimeout(420_000);
  const MUT = ONE === "R12" || RED ? "R12" : "";
  const L = new Ledger("R12-390", MUT);
  const vp = { width: 390, height: 844 };
  /* signed in at a desktop width (the harness's sign-in waits for the desktop shell), then the phone */
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard");
  await ensureSignedIn(page);
  await page.setViewportSize(vp);
  const status = async (qid: string) => sv((await fsGet(`users/${HARNESS_UID}/queries/${qid}`))?.fields?.status);
  const noDesk = () => page.evaluate(() => ({ picker: document.querySelectorAll("[data-qcrr='picker']").length, composer: document.querySelectorAll("[data-qc1522='composer']").length }));

  /* A · the + sheet: An agent replied → Priya → Passed → Today → Log this reply */
  await page.goto("/dashboard");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Log a query" }).waitFor({ timeout: 30_000 });
  await settle(page, 1500);
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Log a query" }).click();
  await settle(page, 900);
  await page.locator("[data-pa4='plus-reply']").click({ timeout: 8000 });
  await settle(page, 900);
  if (MUT) await page.evaluate(() => document.querySelector("[data-pa3='reply-flow']")?.setAttribute("data-pa3", "x"));
  const a0 = await page.evaluate(() => ({ flow: [...document.querySelectorAll("[data-pa3='reply-flow']")].some((e) => e.getBoundingClientRect().height > 0) }));
  const d0 = await noDesk();
  L.check("R12 + sheet: An agent replied opens the phone's own flow", a0.flow, JSON.stringify(a0));
  L.check("R12 + sheet: no card-frame picker, no composer", d0.picker === 0 && d0.composer === 0, JSON.stringify(d0));
  await shot(page, `${MUT ? "mut-R12-" : ""}phone-plus-reply-390`);
  /* the red reading is taken: a red pass writes nothing */
  if (MUT) { L.done(2); return; }
  const step = (t: string) => console.log(`  R12 · ${t}`);
  const preA = await preImage(PRIYA.q, PRIYA.agent);
  step("search"); await page.locator("[data-pa3='fterm']").fill(PRIYA.name, { timeout: 6000 }).catch(() => {});
  await settle(page, 400);
  await page.locator(`[data-pa3='reply-opt'][data-id='${PRIYA.q}']`).click({ timeout: 8000 }).catch(() => {});
  await page.locator("[data-pa3='fnext']").click({ timeout: 6000 }).catch(() => {});
  await settle(page, 500);
  await page.locator("[data-pa3='outcome'][data-k='pass']").click({ timeout: 8000 }).catch(() => {});
  await page.locator("[data-pa3='fnext']").click({ timeout: 6000 }).catch(() => {});
  await settle(page, 500);
  step("save"); const wA = await docWritesDuring(page, async () => { await page.locator("[data-pa3='fnext']").click({ timeout: 8000 }).catch(() => {}); }, 3500);
  const stA = await status(PRIYA.q);
  L.check("R12 + sheet: it saves through the phone's writer (the query reads Rejected)", stA === "Rejected" && wA.some((w) => w.path.endsWith(`/queries/${PRIYA.q}`)), `${stA} · ${wA.length} writes`);
  const undoA = page.locator("[data-pa='snack-undo'], button:has-text('Undo')").filter({ visible: true }).first();
  const wUA = await docWritesDuring(page, async () => { await undoA.click({ timeout: 6000 }).catch(() => {}); }, 3000);
  L.check("R12 + sheet: its Undo puts it back", (await status(PRIYA.q)) === "Queried", String(await status(PRIYA.q)));
  const leftA = await restore(preA, [...wA, ...wUA]);
  L.check("R12 + sheet: restored", leftA.length === 0 && (await status(PRIYA.q)) === "Queried", leftA.join(","));

  step("To do");
  /* B · To do: a gone-quiet task → They did reply → Passed → the date → save */
  await page.goto("/dashboard");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: /^To do/ }).click({ timeout: 30_000 });
  await settle(page, 2500);
  const quiet = page.locator("[data-pa5='todo-card'][data-kind='quiet'], [data-pa5='todo-then-row'][data-kind='quiet']").first();
  L.check("population: a gone-quiet task on the phone's To do", (await quiet.count()) > 0, String(await quiet.count()));
  if (await quiet.count()) {
    const isCard = (await quiet.getAttribute("data-pa5", { timeout: 5000 }).catch(() => null)) === "todo-card";
    step(`quiet task (${isCard ? "the card" : "a Then row"})`);
    if (isCard) await page.locator("[data-pa5='todo-verb']").first().click({ timeout: 8000 }).catch(() => {});
    else await quiet.click({ timeout: 8000 }).catch(() => {});
    await settle(page, 1500);
    await page.locator("[data-tws-opt='replied']").filter({ visible: true }).first().click({ timeout: 8000 }).catch(() => {});
    await settle(page, 500);
    /* the phone asks one question a step ("1 of 2", Next) */
    await page.locator("[data-tdp='primary']").filter({ visible: true }).first().click({ timeout: 6000 }).catch(() => {});
    await settle(page, 700);
    const t0 = await page.evaluate(() => ({ tiles: [...document.querySelectorAll<HTMLElement>("[data-tws-opt]")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.dataset.twsOpt) }));
    const dB = await noDesk();
    L.check("R12 To do: They did reply keeps the phone's tiles", t0.tiles.includes("pass") && t0.tiles.includes("full"), JSON.stringify(t0));
    L.check("R12 To do: no card-frame picker, no composer", dB.picker === 0 && dB.composer === 0, JSON.stringify(dB));
    await shot(page, `${MUT ? "mut-R12-" : ""}phone-todo-replied-390`);
    await page.locator("[data-tws-opt='pass']").filter({ visible: true }).first().click({ timeout: 8000 }).catch(() => {});
    await settle(page, 600);
    step("tiles answered; saving"); const pre = await preImage("", "");
    let wB: DocWrite[] = [];
    for (let i = 0; i < 6 && !wB.some((w) => /\/queries\/[^/]+$/.test(w.path)); i++) {
      const today = page.locator("[data-tws-opt='today']").filter({ visible: true }).first();
      if (await today.count()) await today.click({ timeout: 5000 }).catch(() => {});
      wB = [...wB, ...(await docWritesDuring(page, async () => { await page.locator("[data-tdp='primary']").filter({ visible: true }).first().click({ timeout: 6000 }).catch(() => {}); }, 2500))];
    }
    const qB = wB.find((w) => /\/queries\/[^/]+$/.test(w.path))?.path.split("/").pop() ?? "";
    const stB = qB ? await status(qB) : null;
    L.check("R12 To do: it saves through the tiles' writer (the query reads Rejected)", stB === "Rejected", `${qB} · ${stB} · ${wB.length} writes`);
    const wUB = await docWritesDuring(page, async () => { await page.locator("[data-pa='snack-undo']").filter({ visible: true }).first().click({ timeout: 6000 }).catch(() => {}); }, 3000);
    L.check("R12 To do: its Undo puts it back", !!qB && (await status(qB)) !== "Rejected", String(qB ? await status(qB) : null));
    const leftB = await restore(pre, [...wB, ...wUB]);
    L.check("R12 To do: restored", leftB.length === 0, leftB.join(","));
  }
  L.done(11);
});

/* ══ Record a response v1.1, Phase 3 — R5: nothing live, on an account that has none ══════════════════════════════
   A second account, made for this run on the emulator only: the Auth emulator's own sign-up, then the harness's user
   document, one book and one CLOSED query (George's pass) copied under the new uid. So the picker has nothing live and
   one closed query a search could find. RR_MUTATE=R5 reads the harness instead (it has live queries): the red. */
const EMU_FS = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
const EMU_AUTH = "http://127.0.0.1:9095/identitytoolkit.googleapis.com/v1";
const HARNESS_UID = "LS4ymFFCEvhN82advZQJ5zkr7sv2";
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };
type FsFields = Record<string, unknown>;
async function fsGet(path: string): Promise<{ name: string; fields?: FsFields } | null> {
  const r = await fetch(`${EMU_FS}/${path}`, { headers: OWNER, signal: AbortSignal.timeout(15_000) });
  return r.ok ? ((await r.json()) as { name: string; fields?: FsFields }) : null;
}
async function fsPut(path: string, fields: FsFields) {
  const r = await fetch(`${EMU_FS}/${path}`, { method: "PATCH", headers: OWNER, body: JSON.stringify({ fields }), signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`emulator PATCH ${path}: ${r.status} ${await r.text()}`);
}
/** a harness document under another uid: every string that names the harness uid names the new one */
const reUid = (f: FsFields | undefined, uid: string): FsFields => JSON.parse(JSON.stringify(f ?? {}).split(HARNESS_UID).join(uid));
async function emptyAccount(): Promise<{ email: string; password: string; uid: string }> {
  const email = `rr11-empty-${Date.now()}@scriptally.test`;
  const password = `emu-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const r = await fetch(`${EMU_AUTH}/accounts:signUp?key=emulator`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }), signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`auth emulator sign-up: ${r.status} ${await r.text()}`);
  const uid = ((await r.json()) as { localId: string }).localId;
  const user = await fsGet(`users/${HARNESS_UID}`);
  const ms = await fsGet(`users/${HARNESS_UID}/manuscripts/cv25-ms`);
  const q = await fsGet(`users/${HARNESS_UID}/queries/${GEORGE.q}`);
  const agentId = (q?.fields?.agentId as { stringValue?: string } | undefined)?.stringValue ?? "";
  const ag = agentId ? await fsGet(`users/${HARNESS_UID}/agents/${agentId}`) : null;
  if (!user || !ms || !q || !ag) throw new Error("emptyAccount: a harness document is missing");
  const uf = reUid(user.fields, uid);
  uf.email = { stringValue: email };
  await fsPut(`users/${uid}`, uf);
  await fsPut(`users/${uid}/manuscripts/cv25-ms`, reUid(ms.fields, uid));
  await fsPut(`users/${uid}/agents/${agentId}`, reUid(ag.fields, uid));
  await fsPut(`users/${uid}/queries/${GEORGE.q}`, reUid(q.fields, uid));
  return { email, password, uid };
}

test("R5 · nothing live: the picker says so, offers Log a query, and has no search", async ({ browser }) => {
  test.setTimeout(240_000);
  const MUT = ONE === "R5" || RED ? "R5" : "";
  const L = new Ledger("R5-1512", MUT);
  const vp = SIZES[0];
  const ctx = MUT ? await browser.newContext({ viewport: vp }) : await browser.newContext({ viewport: vp, storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  try {
    if (MUT) {
      await page.goto("/dashboard");
      await ensureSignedIn(page);
    } else {
      const acc = await emptyAccount();
      L.check("population: the second account exists, with one closed query", !!acc.uid, acc.email);
      await page.goto("/#/signin");
      await page.locator("#au-email").waitFor({ timeout: 30_000 });
      await page.locator("#au-email").fill(acc.email);
      await page.locator("#au-pw").fill(acc.password);
      await page.getByRole("button", { name: /^Sign in$/ }).last().click();
      await page.locator("#ws-sidebar").waitFor({ timeout: 45_000 });
    }
    await openApp(page, "/dashboard", vp);
    const door = page.locator("[data-d2='record']").filter({ visible: true }).first();
    L.check("population: the dashboard's Record a response", (await door.count()) > 0, "");
    await door.click({ timeout: 8000 }).catch(() => {});
    await page.locator("[data-qp='panel'] [data-qcrr='picker']").waitFor({ timeout: 10_000 }).catch(() => {});
    await settle(page, 500);
    const m = await page.evaluate(() => {
      const p = document.querySelector("[data-qp='panel']");
      return {
        picker: !!p?.querySelector("[data-qcrr='picker']"),
        none: p?.querySelector("[data-qcrr='none'] b")?.textContent ?? null,
        log: p?.querySelector("[data-qcrr='none'] [data-qcrr='log']")?.textContent?.trim() ?? null,
        search: p?.querySelectorAll("[data-qcrr='search']").length ?? -1,
        rows: p?.querySelectorAll("[data-qcrr='row']").length ?? -1,
      };
    });
    await page.screenshot({ path: `${DIR}/shots/${MUT ? "mut-R5-" : ""}r5-nothing-live-1512.png` }).catch(() => {});
    L.check("R5 the picker opens", m.picker, JSON.stringify(m));
    L.check("R5 “Nothing’s out with agents yet.”", m.none === "Nothing’s out with agents yet.", String(m.none));
    L.check("R5 Log a query", /^Log a query/.test(m.log ?? ""), String(m.log));
    L.check("R5 no search field", m.search === 0, String(m.search));
    L.check("R5 no rows (the closed one only by searching, and there is no search)", m.rows === 0, String(m.rows));
  } finally { await ctx.close(); }
  L.done(6);
});

/* ── the write capture (To-do v52's, tests/e2e/todoV53.measure.ts): every document write on Firestore's channel while
   `fn` runs, with its values and mask; deletes too ── */
interface DocWrite { path: string; op: "update" | "delete"; mask: string[] | null; values: Record<string, unknown> }
async function docWritesDuring(page: Page, fn: () => Promise<void>, settleMs = 2500): Promise<DocWrite[]> {
  const out: DocWrite[] = [];
  const on = (req: import("@playwright/test").Request) => {
    if (req.method() !== "POST" || !/\/Write\/channel/.test(req.url())) return;
    const body = new URLSearchParams(req.postData() ?? "");
    for (const [k, v] of body) {
      if (!/^req\d+___data__$/.test(k)) continue;
      let j: { writes?: { update?: { name: string; fields?: Record<string, unknown> }; delete?: string; updateMask?: { fieldPaths?: string[] } }[] };
      try { j = JSON.parse(v); } catch { continue; }
      for (const w of j.writes ?? []) {
        if (w.delete) { out.push({ path: w.delete.split("/documents/")[1] ?? w.delete, op: "delete", mask: null, values: {} }); continue; }
        if (!w.update) continue;
        out.push({ path: w.update.name.split("/documents/")[1] ?? w.update.name, op: "update", mask: w.updateMask?.fieldPaths?.slice().sort() ?? null, values: w.update.fields ?? {} });
      }
    }
  };
  page.on("request", on);
  try { await fn(); await page.waitForTimeout(settleMs); } finally { page.off("request", on); }
  return out;
}

/* ══ Record a response v1.1, Phase 3 — R6: ONE WRITER, BY DOCUMENTS ═══════════════════════════════════════════════
   The same two replies from four doors, each on a like-for-like query (Partial Sent, the writer's partial with the
   agent): "Asked for the full", today, no deadline; then, after the card's own Undo, a personal pass. Every write on
   Firestore's channel is captured; the query document is read back; the doors are compared field by field with ids,
   names and times taken out. RR_MUTATE=R6 gives the second door a 2-week deadline: the red. Restores in the same run:
   every document a door wrote goes back to what it was (or is deleted, if it was new). */
/* the agent card first, on a fresh page: run third, after the Responses door, its link opened no card (16 Nov) */
/* Two like-for-like sets, because no one status is behind all four doors (16 Nov): the agent card has no reply door for a
   query whose partial is out (Sophie Dunn's card: "Close query" only), and the Responses page's door is on its requests
   strip, which holds only queries that asked for more. So: PARTIAL SENT through the card, the To-do desk and a Responses
   row ("Asked for the full"); QUERIED through the card and the agent card ("Asked for the partial"). The agent card's
   missing door is reported, not added (not a re-point). */
const R6_DOORS = [
  { door: "the agent card", q: "cv25-q-03", set: "Queried" },
  { door: "the card on Queries", q: "cv25-q-04", set: "Queried" },
  { door: "the card on Queries", q: "seed-query-8", set: "Partial Sent" },
  { door: "the To-do desk", q: "seed-query-23", set: "Partial Sent" },
  { door: "a Responses row", q: "cv25-q-11", set: "Partial Sent" },
];
const sv = (v: unknown): string | null => { const o = v as { stringValue?: string } | undefined; return o?.stringValue ?? null; };
async function fsList(col: string): Promise<{ name: string; fields?: FsFields }[]> {
  const out: { name: string; fields?: FsFields }[] = [];
  let tok = "";
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${EMU_FS}/${col}?pageSize=1000${tok ? `&pageToken=${tok}` : ""}`, { headers: OWNER, signal: AbortSignal.timeout(20_000) });
    const j = (await r.json()) as { documents?: { name: string; fields?: FsFields }[]; nextPageToken?: string };
    out.push(...(j.documents ?? []));
    if (!j.nextPageToken) break;
    tok = j.nextPageToken;
  }
  return out;
}
/** every document a reply can touch, before the door: the path → its fields */
async function preImage(qid: string, agentId: string): Promise<Map<string, FsFields>> {
  const m = new Map<string, FsFields>();
  const u = `users/${HARNESS_UID}`;
  const cols = [`${u}/queries`, `${u}/activities`, `${u}/tasks`, `${u}/taskFlags`, `${u}/agents`, ...(qid ? [`${u}/queries/${qid}/activity`] : []), ...(agentId ? [`${u}/agents/${agentId}/notes`] : [])];
  for (const col of cols) {
    for (const d of await fsList(col)) m.set(d.name.split("/documents/")[1], d.fields ?? {});
  }
  return m;
}
async function restore(pre: Map<string, FsFields>, written: DocWrite[]): Promise<string[]> {
  const left: string[] = [];
  for (const path of [...new Set(written.map((w) => w.path))]) {
    const was = pre.get(path);
    if (was) { await fsPut(path, was); continue; }
    const r = await fetch(`${EMU_FS}/${path}`, { method: "DELETE", headers: OWNER, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) left.push(path);
  }
  return left;
}
/** a write with the door's own particulars taken out: ids, names, times */
function normal(ws: DocWrite[], ctx: { uid: string; qid: string; agentId: string; msId: string; names: string[] }, skipQuery = true): string[] {
  const swap = (s: string) => {
    let t = s.split(ctx.uid).join("{uid}").split(ctx.qid).join("{q}").split(ctx.agentId).join("{agent}");
    if (ctx.msId) t = t.split(ctx.msId).join("{ms}");
    for (const n of ctx.names.filter(Boolean).sort((a, b) => b.length - a.length)) t = t.split(n).join("{name}");
    /* a day (what the agent's usual window or the query's history makes it) is the query's, not the door's */
    return t.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, "{time}").replace(/\b\d{4}-\d{2}-\d{2}\b/g, "{day}").replace(/\b\d{1,2} [A-Z][a-z]{2} \d{4}\b/g, "{day}");
  };
  const DROP = /^(id|.*Id|createdAt|updatedAt|lastModified|.*At|.*Ms)$/;
  const val = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    const o = v as Record<string, unknown>;
    if ("timestampValue" in o) return "{time}";
    if ("stringValue" in o) return { s: swap(String(o.stringValue)) };
    if ("mapValue" in o) {
      const f = ((o.mapValue as { fields?: Record<string, unknown> }).fields) ?? {};
      return Object.fromEntries(Object.keys(f).sort().filter((k) => !DROP.test(k)).map((k) => [k, val(f[k])]));
    }
    if ("arrayValue" in o) return ((o.arrayValue as { values?: unknown[] }).values ?? []).map(val);
    return o;
  };
  /* the query document itself is compared as read back (queryState), since what a recompute writes depends on what the
     query already held */
  return ws.filter((w) => !skipQuery || !/\/queries\/[^/]+$/.test(w.path)).map((w) => {
    const path = swap(w.path).replace(/\/(activity|activities|tasks|taskFlags|notes)\/[^/]+$/, "/$1/*");
    const keys = (w.mask ?? Object.keys(w.values)).filter((k) => !DROP.test(k.split(".").pop() ?? k)).sort();
    const fields = Object.fromEntries(keys.map((k) => [k, val(k.split(".").reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p] ?? (((a as { mapValue?: { fields?: Record<string, unknown> } })?.mapValue?.fields ?? {})[p]), w.values))]));
    return `${w.op} ${path} ${JSON.stringify(fields)}`;
  }).sort();
}

test("R6 · one writer: the same replies from four doors write the same documents", async ({ page }) => {
  test.setTimeout(600_000);
  const MUT = ONE === "R6" || RED ? "R6" : "";
  const L = new Ledger("R6-1512", MUT);
  const vp = SIZES[0];
  const reports: { door: string; set: string; qid: string; req: string[]; pass: string[]; qReq: FsFields; qPass: FsFields; norm: Parameters<typeof normal>[1]; reqW: DocWrite[]; passW: DocWrite[]; left: string[] }[] = [];
  const panel = page.locator("[data-qp='panel']");
  const composerOpen = async (first: string) => (await panel.locator("[data-qc1522='composer-title']").textContent({ timeout: 8000 }).catch(() => null)) === `What did ${first} say?`;
  /* each door: navigate and press it; returns the query its composer is on */
  const open = async (d: string, q: string, agentId: string): Promise<void> => {
    if (d === "the card on Queries") {
      await openApp(page, `/queries?q=${q}`, vp);
      await panel.locator("[data-act='resp']").filter({ visible: true }).first().click({ timeout: 8000 });
    } else if (d === "the To-do desk") {
      await openApp(page, "/todo", vp);
      await page.locator(`[data-tws-row='task-no-res-close-${q}']`).first().click({ timeout: 8000 });
      await settle(page, 900);
      await page.locator("[data-tws-opt='replied']").filter({ visible: true }).first().click({ timeout: 8000 });
      await settle(page, 600);
      await page.locator("[data-tws='primary']").filter({ visible: true }).first().click({ timeout: 8000 });
    } else if (d === "a Responses row") {
      await openApp(page, "/queries/responses", vp);
      const acts = page.locator("[data-rsp5='req-act'][data-mode='resp']").filter({ visible: true });
      const n = await acts.count();
      for (let i = 0; i < n; i++) {
        const id = await acts.nth(i).evaluate((e) => e.closest("[data-id]")?.getAttribute("data-id") ?? null);
        if (!q || id === q) { await acts.nth(i).click({ timeout: 8000 }); break; }
      }
    } else {
      await openApp(page, `/agents?agent=${agentId}`, vp);
      await page.locator("[data-cl262='panel']").waitFor({ timeout: 12_000 }).catch(() => {});
      /* the link did not open the card on this pass: open it as a writer would, from the agent's row */
      if (!(await page.locator("[data-cl262='panel']").count())) {
        const nm = sv((await fsGet(`users/${HARNESS_UID}/agents/${agentId}`))?.fields?.name) ?? "";
        await page.getByRole("row", { name: new RegExp(`^${nm}`) }).first().click({ timeout: 8000 }).catch(() => {});
        await page.locator("[data-cl262='panel']").waitFor({ timeout: 12_000 }).catch(() => {});
      }
      const btn = page.locator("[data-cl262='panel'] button").filter({ hasText: /^(Record a response|\S+ replied)/ }).filter({ visible: true }).first();
      if (!(await btn.count())) console.log(`  R6 agent card: no door; the card's buttons: ${JSON.stringify(await page.locator("[data-cl262='panel'] button").allInnerTexts().catch(() => []))} · panel ${await page.locator("[data-cl262='panel']").count()}`);
      await btn.click({ timeout: 8000 });
    }
    await settle(page, 1300);
  };
  for (const [ix, d0] of R6_DOORS.entries()) {
    let q = d0.q;
    const qDoc0 = q ? await fsGet(`users/${HARNESS_UID}/queries/${q}`) : null;
    let agentId = sv(qDoc0?.fields?.agentId) ?? "";
    await open(d0.door, q, agentId);
    const qid = (await panel.getAttribute("data-qp-id").catch(() => null)) ?? "";
    const qDoc = await fsGet(`users/${HARNESS_UID}/queries/${qid}`);
    agentId = sv(qDoc?.fields?.agentId) ?? "";
    const ag = agentId ? await fsGet(`users/${HARNESS_UID}/agents/${agentId}`) : null;
    const name = sv(ag?.fields?.name) ?? "";
    const first = name.split(/\s+/)[0] ?? "";
    const msId = sv(qDoc?.fields?.manuscriptId) ?? "";
    L.check(`population: ${d0.door} opens the composer on a ${d0.set} query`, (await composerOpen(first)) && sv(qDoc?.fields?.status) === d0.set, `${qid} · ${sv(qDoc?.fields?.status)} · ${first}`);
    if (!qid || !(await composerOpen(first))) continue;
    const pre = await preImage(qid, agentId);
    const msTitle = msId ? sv((await fsGet(`users/${HARNESS_UID}/manuscripts/${msId}`))?.fields?.title) ?? "" : "";
    const norm = { uid: HARNESS_UID, qid, agentId, msId, names: [name, first, sv(ag?.fields?.agency) ?? "", msTitle] };
    /* 1 · Asked for the full, today, no deadline */
    const reqW = await docWritesDuring(page, async () => {
      await panel.locator("[data-qc1522='reply-types'] [data-v='req']").click();
      await settle(page, 300);
      await panel.locator("[data-qc1522='when'] [data-v='today']").click().catch(() => {});
      await panel.locator(`[data-qc1522='deadline'] [data-v='${MUT && ix === 1 ? "2w" : "none"}']`).click();
      await panel.locator("[data-qc1522='save']").click();
    }, 3000);
    const qAfter = await fsGet(`users/${HARNESS_UID}/queries/${qid}`);
    const qW = reqW.find((w) => w.path.endsWith(`/queries/${qid}`));
    /* read back: every field the write set (not a delete) is on the stored document */
    const persisted = !!qW && Object.keys(qW.values).every((k) => k in (qAfter?.fields ?? {}));
    L.check(`R6 ${d0.door}: the request is read back from the query document`, sv(qAfter?.fields?.status) === (d0.set === "Queried" ? "Partial Requested" : "Full Requested") && persisted, `${sv(qAfter?.fields?.status)} · persisted ${persisted}`);
    await page.screenshot({ path: `${DIR}/shots/${MUT ? "mut-R6-" : ""}r6-${ix + 1}-request-1512.png` }).catch(() => {});
    /* the card's own Undo, then the same door again: a personal pass */
    const undoW = await docWritesDuring(page, async () => { await panel.locator("[data-qc1522='undo']").click({ timeout: 8000 }).catch(() => {}); }, 3000);
    const back = await fsGet(`users/${HARNESS_UID}/queries/${qid}`);
    L.check(`R6 ${d0.door}: the Undo puts it back to ${d0.set}`, sv(back?.fields?.status) === d0.set, String(sv(back?.fields?.status)));
    await closeAll(page);
    await open(d0.door, qid, agentId);
    const passW = await docWritesDuring(page, async () => {
      await panel.locator("[data-qc1522='reply-types'] [data-v='passed']").click();
      await settle(page, 300);
      await panel.locator("[data-qc1522='when'] [data-v='today']").click().catch(() => {});
      await panel.locator("[data-qc1522='pass-kind'] [data-v='personal']").click();
      await panel.locator("[data-qc1522='save']").click();
    }, 3000);
    const qPass = await fsGet(`users/${HARNESS_UID}/queries/${qid}`);
    L.check(`R6 ${d0.door}: the pass is read back from the query document`, sv(qPass?.fields?.status) === "Rejected", String(sv(qPass?.fields?.status)));
    await closeAll(page);
    const left = await restore(pre, [...reqW, ...undoW, ...passW]);
    const qEnd = await fsGet(`users/${HARNESS_UID}/queries/${qid}`);
    L.check(`R6 ${d0.door}: restored (every document it wrote is back)`, left.length === 0 && sv(qEnd?.fields?.status) === d0.set, `${left.join(",")} · ${sv(qEnd?.fields?.status)}`);
    reports.push({ door: d0.door, set: d0.set, qid, req: normal(reqW, norm), pass: normal(passW, norm), qReq: qAfter?.fields ?? {}, qPass: qPass?.fields ?? {}, norm, reqW, passW, left });
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? "mut-R6-" : ""}R6-documents.json`, JSON.stringify(reports.map(({ door, set, qid, req, pass }) => ({ door, set, qid, req, pass })), null, 1));
  }
  mkdirSync(`${DIR}/ledger`, { recursive: true });
  writeFileSync(`${DIR}/ledger/${MUT ? "mut-R6-" : ""}R6-documents.json`, JSON.stringify(reports.map(({ door, set, qid, req, pass }) => ({ door, set, qid, req, pass })), null, 1));
  writeFileSync(`${DIR}/ledger/${MUT ? "mut-R6-" : ""}R6-raw-writes.json`, JSON.stringify(reports.map(({ door, qid, reqW, passW }) => ({ door, qid, reqW, passW })), null, 1));
  L.check("population: five doors compared", reports.length === 5, String(reports.length));
  /* the query document as read back, on the fields EVERY door in its set SET (a delete in the mask is history): a field a recompute fills only on some
     queries (cv25's partials have no partial-request step in their logs, so partialRequestedDate is never derived for
     them) is the query's history, not the door's */
  const touched = (k: "reqW" | "passW", set: string) => {
    const per = reports.filter((r) => r.set === set).map((r) => new Set(r[k].filter((w) => /\/queries\/[^/]+$/.test(w.path)).flatMap((w) => Object.keys(w.values))));
    return per.length ? [...per[0]].filter((x) => per.every((p) => p.has(x))).sort() : [];
  };
  const state = (r: (typeof reports)[number], k: "qReq" | "qPass", keys: string[]) => {
    const f = Object.fromEntries(keys.filter((x) => x in r[k]).map((x) => [x, r[k][x]]));
    return normal([{ path: `users/${HARNESS_UID}/queries/${r.qid}`, op: "update", mask: null, values: f }], r.norm, false);
  };
  /* the query write's MASK is the writer's signature (recompute names every derived field, setting or clearing it) */
  const maskOf = (ws: DocWrite[]) => JSON.stringify(ws.filter((w) => /\/queries\/[^/]+$/.test(w.path)).map((w) => w.mask ?? []));
  for (const r of reports) { r.req.push(`mask ${maskOf(r.reqW)}`); r.pass.push(`mask ${maskOf(r.passW)}`); }
  /* and WHICH fields it set: a door that adds one (a deadline, a reminder) shows here. Excused, by name only: the two
     dates a recompute derives from a partial-request step, which cv25's seeded logs never had (finding 1 in the report) */
  const HISTORY = new Set(["partialRequestedDate", "partialSentDate"]);
  const setKeys = (ws: DocWrite[]) => JSON.stringify(ws.filter((w) => /\/queries\/[^/]+$/.test(w.path)).map((w) => Object.keys(w.values).filter((k) => !HISTORY.has(k)).sort()));
  for (const r of reports) { r.req.push(`sets ${setKeys(r.reqW)}`); r.pass.push(`sets ${setKeys(r.passW)}`); }
  for (const r of reports) { r.req.push(...state(r, "qReq", touched("reqW", r.set)).map((x) => `read back ${x}`)); r.pass.push(...state(r, "qPass", touched("passW", r.set)).map((x) => `read back ${x}`)); }
  writeFileSync(`${DIR}/ledger/${MUT ? "mut-R6-" : ""}R6-documents.json`, JSON.stringify(reports.map(({ door, set, qid, req, pass }) => ({ door, set, qid, req, pass })), null, 1));
  for (const r of reports) {
    const base = reports.find((x) => x.set === r.set);
    if (!base || base === r) continue;
    const diff = (a: string[], b: string[]) => [...a.filter((x) => !b.includes(x)).map((x) => `only ${base.door}: ${x.slice(0, 220)}`), ...b.filter((x) => !a.includes(x)).map((x) => `only ${r.door}: ${x.slice(0, 220)}`)];
    const dr = base ? diff(base.req, r.req) : ["no base"];
    const dp = base ? diff(base.pass, r.pass) : ["no base"];
    L.check(`R6 the request: ${r.door} wrote what ${base?.door} wrote`, dr.length === 0, dr.join(" | ") || `${r.req.length} writes`);
    L.check(`R6 the pass: ${r.door} wrote what ${base?.door} wrote`, dp.length === 0, dp.join(" | ") || `${r.pass.length} writes`);
  }
  L.done(5 * 5 + 1 + 6);
});
