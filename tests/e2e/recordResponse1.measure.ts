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

test.describe.configure({ mode: "serial" });
const DIR = "reports/record-a-response-v1";
const MUT = process.env.RR_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
const PRIYA = { q: "cv25-q-03", agent: "cv25-agent-03", name: "Priya Raman", first: "Priya" };
const GEORGE = { q: "cv25-q-12", name: "George Ashworth", first: "George" };

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
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

for (const vp of SIZES) {
  test.describe(`${vp.width}×${vp.height}`, () => {
    test.beforeEach(async ({ page }) => { await page.setViewportSize(vp); });

    test(`R1 · every door leaves one dialog, the card frame · ${vp.width}`, async ({ page }) => {
      const L = new Ledger(`R1-${vp.width}`);
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
        L.check(`${d.door}: the door is on the page`, found, d.sel);
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
        L.check(`${d.door}: one dialog`, oneDialog, `${JSON.stringify(before.which)} → ${JSON.stringify(c.which)}`);
        L.check(`${d.door}: the card frame`, c.panel && c.frame && (c.picker || !!c.composer), JSON.stringify(c));
        L.check(`${d.door}: no old drawer, no v149 list`, c.qad === 0 && c.who149 === 0, JSON.stringify(c));
        if (d.door === "agent card") {
          L.check("agent card: the composer opens on the agent's query", c.composer === `What did ${PRIYA.first} say?`, String(c.composer));
          const back = await page.locator("[data-qp='panel']").getByText(`Back to ${PRIYA.first}`).count();
          L.check("agent card: ← Back to {first}", back > 0, String(back));
          await shot(page, `agent-card-route-${vp.width}`);
        }
        await closeAll(page);
      }
      L.done(doors.length * 4);
    });

    test(`R2–R4 · the picker whole, a pick, closed only by searching · ${vp.width}`, async ({ page }) => {
      const L = new Ledger(`R2-R4-${vp.width}`);
      await openPicker(page, vp);
      if (MUT === "R2") await page.addStyleTag({ content: ".qc152.qcrr .qc152-in > .qcrr-body { flex: 0 1 auto !important; max-height: 60px; overflow: hidden !important; }" });
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
      L.check("R4 under its own heading", c4.label === "Closed · a reply after closing reopens it", String(c4.label));
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

    test(`R8–R9 · the dim, and leaving · ${vp.width}`, async ({ page }) => {
      const L = new Ledger(`R8-R9-${vp.width}`);
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
      await page.locator("[data-qp='panel'] [data-qc1522='discard']").click();
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

    test(`R10–R11 · a save stays open; the band's arrows · ${vp.width}`, async ({ page }) => {
      const L = new Ledger(`R10-R11-${vp.width}`);
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

test("R12 · at 390 the phone keeps its own flow", async ({ page }) => {
  /* OPEN (16 Nov): the probe has not yet found a phone door on the harness account (the phone list is long and the
     query's row did not take the tap). R12 is held by recordResponse1.test.tsx: with nothing subscribed (the phone page),
     openResponse is the drawer's own journey, and the phone page never subscribes. */
  test.fixme(true, "R12 measured: no phone door reached yet — see recordResponse1.test.tsx R12");
  const L = new Ledger("R12-390");
  const vp = { width: 390, height: 844 };
  /* not openApp: it waits for the desktop shell, which the phone never draws */
  /* signed in at a desktop width (the harness's sign-in waits for the desktop shell), then the phone. The phone's door:
     its query card's "{first} replied" (QcQueryCard149's next block, phone only) */
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/queries?q=${PRIYA.q}`);
  await ensureSignedIn(page);
  await page.setViewportSize(vp);
  await page.goto(`/queries?q=${PRIYA.q}`);
  await settle(page, 5000);
  /* the phone list: open Priya's card from her row */
  await page.getByText(PRIYA.name, { exact: true }).filter({ visible: true }).first().click({ timeout: 8000 }).catch(() => {});
  await settle(page, 2500);
  const btn = page.locator("button").filter({ hasText: new RegExp(`^(${PRIYA.first} replied|They replied|Record a response)`) }).filter({ visible: true }).first();
  const found = (await btn.count()) > 0;
  L.check("population: a Record a response door at 390", found, "");
  if (found) {
    await btn.click().catch(() => {});
    await settle(page, 1500);
    const c = await page.evaluate(() => ({
      picker: !!document.querySelector("[data-qcrr='picker']"),
      phoneFlow: !!document.querySelector(".qad-root.is-open, [data-pfs], .pfs, [data-qad-qpick]"),
    }));
    L.check("no card-frame picker on the phone", !c.picker, JSON.stringify(c));
    L.check("the phone's own response flow", c.phoneFlow, JSON.stringify(c));
    await shot(page, "phone-390");
  }
  L.done(3);
});
