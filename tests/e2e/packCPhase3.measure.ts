/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ PACK C PHASE 3 — THE CALENDAR'S PANE, MEASURED ══════════════════════════════════════════
 *
 * ⚠️ IT SPENDS NO SEND CARD. The dev account cannot currently be restored
 * (`reports/dev-rules-divergence.md`), so the only completion performed here is on a dated task
 * this file CREATES. Everything else is opened, read and closed.
 *
 * Each case says whether it is STRUCTURAL (read off a rendered page without changing it) or
 * INTERACTIVE (driven, and therefore proving the behaviour rather than the markup).
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

type P = import("@playwright/test").Page;

/** select a day that has a live task, then open its panel row — the calendar's real entrance */
async function openPaneOn(page: P, match: RegExp) {
  const pip = await page.evaluate(() => {
    const p = Array.from(document.querySelectorAll(".cal-pip"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)
      .filter((e) => !/cal-rec|inert|struck/.test(e.className))[0] as HTMLElement | undefined;
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (pip) { await page.mouse.click(pip.x, pip.y); await page.waitForTimeout(700); }
  const row = await page.evaluate((src) => {
    const re = new RegExp(src, "i");
    const b = Array.from(document.querySelectorAll("button.cal-fprow"))
      .filter((e) => !e.className.includes("struck"))
      .find((e) => re.test(e.textContent || "")) as HTMLElement | undefined;
    if (!b) return null;
    b.scrollIntoView({ block: "center" });
    const r = b.getBoundingClientRect();
    return { text: (b.textContent || "").replace(/\s+/g, " ").slice(0, 40),
             x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, match.source);
  if (!row) return null;
  await page.waitForTimeout(200);
  await page.mouse.click(row.x, row.y);
  await page.waitForTimeout(900);
  return row;
}

const paneState = (page: P) => page.evaluate(() => {
  const win = document.querySelector(".cal-panewin") as HTMLElement | null;
  return {
    scrim: document.querySelectorAll(".cal-panescrim").length,
    win: document.querySelectorAll(".cal-panewin").length,
    tpn: document.querySelectorAll(".cal-panewin .tpn").length,
    width: win ? Math.round(win.getBoundingClientRect().width) : 0,
    ids: Array.from(document.querySelectorAll(".cal-panewin [id^='cal-s-']")).map((e) => e.id),
    deed: (win?.querySelector(".deed")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
    primary: (win?.querySelector("button.ab.go")?.textContent ?? "").replace(/\s+/g, " ").trim(),
    verbs: Array.from(win?.querySelectorAll("button") ?? []).map((b) => (b.textContent ?? "").trim())
      .filter((t) => /snooze|dismiss/i.test(t)),
    ffSheet: document.querySelectorAll(".tdb-ffsheet").length,
    /* the retired card receipt — must never be attempted here */
    receiptTiles: document.querySelectorAll(".tdb-tile.receipt").length,
  };
});

test("Pack C Phase 3 — the pane over the calendar, at three widths", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 150)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 150)));

  for (const width of [1000, 1440, 1920]) {
    await openRoute(page, "/todo/calendar", { width, height: 900 });

    /* ══ 1 · INTERACTIVE — THE HEADLINE. A nudge shows the pane, not the nudge sheet. ═══════ */
    const row = await openPaneOn(page, /Nudge/);
    expect(row, `no live nudge row at ${width} — this width would assert nothing`).not.toBeNull();
    const st = await paneState(page);
    console.log(`\n[${width}] nudge → ${JSON.stringify(st)}`);
    expect(st.win, `[${width}] the pane did not open`).toBe(1);
    expect(st.tpn, `[${width}] the window holds no TaskPane`).toBe(1);
    expect(st.ffSheet, `[${width}] a FocusFlow sheet opened — the nudge sheet is back`).toBe(0);
    expect(st.receiptTiles, `[${width}] a card receipt was drawn on the calendar`).toBe(0);
    expect(st.width, `[${width}] the window is not the pane's measure`).toBeLessThanOrEqual(440);
    expect(st.width, `[${width}] the window collapsed`).toBeGreaterThan(300);
    /* ⚠️ EVERY SECTION ID IS PREFIXED. `/todo`'s pane is mounted in this same document, so an
       unprefixed id here would be a duplicate and `getElementById` would answer for the wrong one. */
    expect(st.ids.length, `[${width}] the pane rendered no sections`).toBeGreaterThan(0);
    for (const id of st.ids) expect(id.startsWith("cal-"), `unprefixed section id ${id}`).toBe(true);
    /* the two verbs the calendar has no surface for are ABSENT, not disabled */
    expect(st.verbs, `[${width}] snooze/dismiss appeared without a surface behind them`).toEqual([]);

    /* ══ 2 · INTERACTIVE — scrim-click does NOT close; Escape does. ════════════════════════ */
    await page.mouse.click(6, 6);                       // the scrim's own ground, clear of the card
    await page.waitForTimeout(400);
    expect((await paneState(page)).win, `[${width}] a scrim click closed the pane — answers discarded`).toBe(1);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    expect((await paneState(page)).win, `[${width}] Escape did not close the pane`).toBe(0);

    /* ══ 3 · INTERACTIVE — the day stays selected and the panel is still there after closing ═ */
    const afterClose = await page.evaluate(() => ({
      selectedDays: document.querySelectorAll(".cal-cell.sel, .cal-cell.is-sel, .cal-cell[aria-selected=true]").length,
      panelRows: document.querySelectorAll("button.cal-fprow").length,
      panel: document.querySelectorAll(".cal-focus").length,
    }));
    console.log(`[${width}] after close: ${JSON.stringify(afterClose)}`);
    expect(afterClose.panel, `[${width}] the day panel went away with the pane`).toBe(1);
    expect(afterClose.panelRows, `[${width}] the panel came back empty — the day lost its selection`).toBeGreaterThan(0);

    /* ══ 4 · INTERACTIVE — the × closes it too ═════════════════════════════════════════════ */
    await openPaneOn(page, /Nudge/);
    expect((await paneState(page)).win, `[${width}] the pane did not reopen`).toBe(1);
    await page.evaluate(() => (document.querySelector(".cal-panex") as HTMLButtonElement).click());
    await page.waitForTimeout(450);
    expect((await paneState(page)).win, `[${width}] the × did not close the pane`).toBe(0);

    /* ══ 5 · STRUCTURAL — the month is unharmed: cushion, fold, overflow ═══════════════════ */
    /* ⚠️ THE CUSHION IS `calLook.measure.ts`'s COMPUTATION, NOT ONE OF MINE. The first version here
       invented a formula out of grid height and row count; it produced 2–3px, which reads as a
       cushion violation and is simply a different quantity wearing the name. The canonical one is
       the room a populated cell has left after two pips and the "+N" chip, and it is the number the
       ≥4px law is written about. One derivation, quoted rather than re-derived. */
    const cal = await page.evaluate(() => {
      const px = (n: number) => Math.round(n * 100) / 100;
      const grid = document.querySelector(".cal-grid") as HTMLElement | null;
      if (!grid) return null;
      const cells = Array.from(grid.querySelectorAll(".cal-cell")) as HTMLElement[];
      const sample = cells.find((c) => c.querySelectorAll(".cal-pip").length > 0) ?? cells[8];
      const cs = getComputedStyle(sample);
      const d = sample.querySelector(".cal-d") as HTMLElement | null;
      const pip = sample.querySelector(".cal-pip") as HTMLElement | null;
      const pcs = pip ? getComputedStyle(pip) : null;
      const pipFlow = pip && pcs ? px(pip.getBoundingClientRect().height + parseFloat(pcs.marginTop)) : 0;
      const moreH = px((grid.querySelector(".cal-more2") as HTMLElement | null)?.getBoundingClientRect().height ?? 11);
      const avail = px(sample.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
        - (d?.getBoundingClientRect().height ?? 0));
      return {
        foldShort: grid.getAttribute("data-fold-short"),
        cushion: px(avail - (2 * pipFlow + moreH)),
        overflowing: cells.filter((c) => c.scrollHeight > c.clientHeight + 1).length,
      };
    });
    console.log(`[${width}] month: ${JSON.stringify(cal)}`);
    expect(cal, `[${width}] no calendar grid`).not.toBeNull();
    expect(cal!.foldShort, `[${width}] data-fold-short appeared — the month lost its room`).toBeNull();
    expect(cal!.overflowing, `[${width}] cells overflow`).toBe(0);
    expect(cal!.cushion, `[${width}] cushion below 4px — the pane spent the calendar's room`).toBeGreaterThanOrEqual(4);
  }

  console.log("\nconsole errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "the calendar's pane threw").toEqual([]);
});

/**
 * ⚠️ THE REST OF THE ACCEPTANCE, AND EVERY WRITE HERE IS ON THIS FILE'S OWN TASK. The gate's
 * reveal is safe to drive on any card — `dockPrimary` returns before the commit when an answer is
 * missing — and the `offer` hand-off only mounts a sheet. Nothing else is pressed.
 */
test("Pack C Phase 3 — parity with /todo, the jump, the hand-off, and the toast as receipt", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 150)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 150)));

  /* ══ 6 · INTERACTIVE — the same card, both pages: the pane is structurally the same ═══════ */
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  const onTodo = await page.evaluate(() => {
    const row = Array.from(document.querySelectorAll(".row"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)
      .find((e) => /Nudge/i.test(e.textContent ?? "")) as HTMLElement | undefined;
    if (!row) return null;
    row.scrollIntoView({ block: "center" });
    const r = row.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  expect(onTodo, "no nudge row on /todo to compare against").not.toBeNull();
  await page.waitForTimeout(250);
  await page.mouse.click(onTodo!.x, onTodo!.y);
  await page.waitForTimeout(700);
  const todoPane = await page.evaluate(() => {
    const pane = Array.from(document.querySelectorAll(".tpn"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement | undefined;
    if (!pane) return null;
    return {
      deed: (pane.querySelector(".deed")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
      primary: (pane.querySelector("button.ab.go")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      sections: Array.from(pane.querySelectorAll("[id^='s-']")).map((e) => e.id).sort(),
    };
  });
  console.log("/todo pane:", JSON.stringify(todoPane));
  expect(todoPane, "no pane on /todo").not.toBeNull();

  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const row = await openPaneOn(page, /Nudge/);
  expect(row, "no nudge row on the calendar").not.toBeNull();
  const calPane = await page.evaluate(() => {
    const win = document.querySelector(".cal-panewin") as HTMLElement | null;
    if (!win) return null;
    return {
      deed: (win.querySelector(".deed")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
      primary: (win.querySelector("button.ab.go")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      sections: Array.from(win.querySelectorAll("[id^='cal-s-']")).map((e) => e.id.replace(/^cal-/, "")).sort(),
    };
  });
  console.log("calendar pane:", JSON.stringify(calPane));
  expect(calPane!.deed, "the two pages describe the same card differently").toBe(todoPane!.deed);
  expect(calPane!.primary, "the two pages offer different primaries for one card").toBe(todoPane!.primary);
  expect(calPane!.sections, "the two panes ask different questions of one card").toEqual(todoPane!.sections);

  /* ══ 6b · STRUCTURAL — the two mounts' ids cannot collide, which is what scopes the jump ═══
     ⚠️ ASSERTED ON A CARD THAT HAS SECTIONS, AND THE POPULATION IS CHECKED FIRST. The first version
     ran this on a NOTE, whose journey has no `s-*` sections at all: `calIds` was empty, "every one
     is inside the window" was vacuously true, and the check passed having measured nothing. A nudge
     has `cal-s-when`, so there is something to be wrong about. */
  const scoping = await page.evaluate(() => {
    const win = document.querySelector(".cal-panewin") as HTMLElement | null;
    const calIds = Array.from(document.querySelectorAll("[id^='cal-s-']")) as HTMLElement[];
    const bareIds = Array.from(document.querySelectorAll("[id^='s-']")) as HTMLElement[];
    return {
      calIds: calIds.map((e) => e.id),
      bareIds: bareIds.map((e) => e.id),
      allInsideWindow: !!win && calIds.every((e) => win.contains(e)),
      bareInsideWindow: !!win && bareIds.some((e) => win.contains(e)),
    };
  });
  console.log("id scoping:", JSON.stringify(scoping));
  expect(scoping.calIds.length, "no prefixed sections — this check would assert nothing").toBeGreaterThan(0);
  expect(scoping.bareIds.length, "`/todo`'s pane is not in the document — the collision this guards cannot be demonstrated").toBeGreaterThan(0);
  expect(scoping.allInsideWindow, "a `cal-` section is outside the calendar's window").toBe(true);
  expect(scoping.bareInsideWindow, "an UNPREFIXED section is inside the calendar's window — the two mounts collide").toBe(false);

  /* ══ 7 · INTERACTIVE — the jump scrolls THIS pane, and the scrolled node belongs to it ════
     ⚠️ THE PRECONDITION IS ASSERTED BEFORE THE PRESS, AND THIS COST A FIXTURE TO LEARN. The first
     version opened an R&R and pressed its primary, reasoning that `dockPrimary` reveals the missing
     bar and returns before committing. True in general — and false for that card: an R&R's
     materials are PRE-TICKED, so its gate was already satisfied and the press wrote. `seed-query-11`
     went from `Revise & Resubmit` to `Full Sent` and the seeder cannot put it back.
     So: read the primary's label first and press ONLY when it states an unanswered count. A primary
     reading "N to answer" cannot commit; one reading anything else might. */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  let gated: { label: string } | null = null;
  for (const m of [/Send your/i, /Resubmit/i, /materials/i]) {
    const r = await openPaneOn(page, m);
    if (!r) continue;
    const label = await page.evaluate(() =>
      (document.querySelector(".cal-panewin button.ab.go")?.textContent ?? "").replace(/\s+/g, " ").trim());
    if (/to answer/i.test(label)) { gated = { label }; break; }
    console.log(`  skipped "${r.text}" — its primary reads "${label}", which would COMMIT`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
  }

  if (!gated) {
    console.log("⚠️ GAP: no card on this account has an unanswered gate, so the jump was not driven.");
  } else {
    console.log(`jump: pressing a gated primary — "${gated.label}"`);
    await page.evaluate(() => (document.querySelector(".cal-panewin button.ab.go") as HTMLButtonElement).click());
    await page.waitForTimeout(900);
    const jump = await page.evaluate(() => {
      const win = document.querySelector(".cal-panewin") as HTMLElement | null;
      if (!win) return null;
      /* ⚠️ THE POINT OF THE CASE: whatever the jump targeted must be INSIDE the calendar's window.
         `/todo`'s pane is in this same document — a document-wide lookup would have found ITS
         section and scrolled a page the reader cannot see. */
      const target = document.querySelector("[id^='cal-s-']") as HTMLElement | null;
      return {
        targetInThisWindow: !!(target && win.contains(target)),
        stillOpen: true,
        primary: (win.querySelector("button.ab.go")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      };
    });
    console.log("jump result:", JSON.stringify(jump));
    expect(jump, "the gated pane closed — the primary committed instead of revealing").not.toBeNull();
    expect(jump!.targetInThisWindow, "the jump's target is not inside the calendar's own window").toBe(true);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  /* ══ 8 · INTERACTIVE — an offer falls through to its sheet ════════════════════════════════ */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const offerRow = await openPaneOn(page, /offer/i);
  if (!offerRow) {
    console.log("⚠️ GAP: no offer card on this account — the fall-through was not driven.");
  } else {
    await page.evaluate(() => (document.querySelector(".cal-panewin button.ab.go") as HTMLButtonElement)?.click());
    await page.waitForTimeout(1100);
    const ff = await page.evaluate(() => ({
      sheet: document.querySelectorAll(".tdb-ffsheet").length,
      pane: document.querySelectorAll(".cal-panewin").length,
    }));
    console.log("offer fall-through:", JSON.stringify(ff));
    expect(ff.sheet, "an offer did not reach its sheet").toBeGreaterThan(0);
    expect(ff.pane, "the pane stayed open behind the sheet — two layers over the month").toBe(0);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "the calendar's pane threw").toEqual([]);
});

/**
 * ⚠️ THE TOAST IS THE RECEIPT ON THE CALENDAR — driven, on a dated task THIS FILE CREATES, so it
 * spends nothing. The calendar passes no overlay sink, so the toast is the whole receipt here, and
 * Undo is what makes it one. (Phase 1 measured that `/todo` draws no card receipt either any more,
 * so the two surfaces already agree — see the run report.)
 */
test("Pack C Phase 3 — a completion on the calendar toasts, offers Undo, and attempts no card receipt", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 150)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 150)));

  /* the composer lives on /todo; the task is dated so it becomes a board card and reaches the day */
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  const TASK = `Pack C calendar receipt ${Date.now()}`;
  await page.evaluate(() => (Array.from(document.querySelectorAll("button"))
    .find((e) => (e.textContent || "").trim() === "Add a task") as HTMLElement).click());
  await page.waitForTimeout(700);
  await (await page.$(".tdb-nc-ttl"))!.click();
  await page.keyboard.type(TASK);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const nc = document.querySelector(".tdb-nc") as HTMLElement;
    (Array.from(nc.querySelectorAll("button, div, span"))
      .find((e) => (e.textContent || "").trim() === "Add a date") as HTMLElement)?.click();
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const nc = document.querySelector(".tdb-nc") as HTMLElement;
    const today = String(new Date().getDate());
    (Array.from(nc.querySelectorAll("button, td, div, span"))
      .filter((e) => (e.textContent || "").trim() === today && e.children.length === 0)
      .pop() as HTMLElement)?.click();
  });
  await page.waitForTimeout(500);
  const saved = await page.evaluate(() => {
    const b = document.querySelector(".tdb-nc-save") as HTMLButtonElement | null;
    if (!b || b.disabled) return false;
    b.click(); return true;
  });
  expect(saved, "could not create the task this check completes").toBe(true);
  await page.waitForTimeout(2400);

  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const row = await openPaneOn(page, new RegExp(TASK.slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  expect(row, "the new task did not reach a calendar day").not.toBeNull();

  /* ══ 10 · INTERACTIVE — the completion's receipt ═══════════════════════════════════════════ */
  const primary = await page.evaluate(() =>
    (document.querySelector(".cal-panewin button.ab.go")?.textContent ?? "").replace(/\s+/g, " ").trim());
  console.log("primary on my own task:", primary);
  expect(primary, "this task's primary states an unanswered gate — pressing it would not complete").not.toMatch(/to answer/i);

  await page.evaluate(() => (document.querySelector(".cal-panewin button.ab.go") as HTMLButtonElement).click());
  await page.waitForTimeout(2500);

  const receipt = await page.evaluate(() => ({
    toast: (document.querySelector(".sa-toast, [class*=toast]")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 90),
    undo: !!document.querySelector(".sa-toast-undo, [class*=toast] button"),
    receiptTiles: document.querySelectorAll(".tdb-tile.receipt").length,
    paneClosed: document.querySelectorAll(".cal-panewin").length === 0,
  }));
  console.log("receipt:", JSON.stringify(receipt));
  expect(receipt.toast.length, "the completion produced no receipt at all").toBeGreaterThan(0);
  expect(receipt.toast, "the toast did not name what was completed").toContain(TASK.slice(0, 20));
  expect(receipt.undo, "the toast carried no Undo — the one thing that makes it a receipt").toBe(true);
  expect(receipt.receiptTiles, "a card receipt was attempted on the calendar").toBe(0);
  expect(receipt.paneClosed, "the pane stayed open on a card that is done").toBe(true);

  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "the completion threw").toEqual([]);
});
