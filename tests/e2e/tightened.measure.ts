/**
 * ⚠️ THE TIGHTENED PAGE — tightened round, one file for the round's geometry claims (Phase 1
 * onward; ref design-refs/todo-belongs.html).
 *
 * Phase 1 — one toolbar. The claims a stylesheet cannot make: how much chrome actually stands
 * between the toolbar and the rows, how many elements CARRY the page title on the rendered page,
 * and whether the meter's figures are the group heads' figures (the counting law, measured at the
 * composed surface rather than at each part).
 *
 * ⚠️ NO BACKTICKS INSIDE ANY page.evaluate TEMPLATE, comments included — one terminates the string
 * and the file fails to COLLECT, which reads as "No tests found". No regex literals in one either:
 * the template eats the escape before the browser sees it.
 *
 * Read-only: it opens the page and measures. It presses nothing and writes nothing.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn, liftMotionSuppression } from "./measure";
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_TI_OUT ?? "run-artifacts/tightened.txt";
rmSync(OUT, { force: true });

test("Phase 1 — one toolbar: the row, the title census, the meter's figures", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction(
    "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);

  const r = await page.evaluate(`(() => {
    const vis = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const card = document.querySelector(".tlc");
    const tb = document.querySelector(".tlc .l-toolbar");
    const bar = document.querySelector(".tlc .l-bar");
    /* the title census: HEADING elements whose text is exactly the page title. The shell's rail
       label and the breadcrumb also carry the page's NAME — that is wayfinding, not a title, and
       counting them would make the claim unpassable on any page the shell can navigate to. What
       the assert forecloses is a SECOND TITLE — the contract's toolbar h1 beside the masthead's. */
    const holders = [];
    for (const el of document.querySelectorAll("h1, h2, h3, h4, [role=heading]")) {
      if (!vis(el)) continue;
      if ((el.textContent || "").trim() === "To-do list")
        holders.push(el.tagName + "." + String(el.className).split(" ")[0]);
    }
    /* the meter against the heads — figures read off the RENDERED page on both sides */
    const legend = tb ? (tb.querySelector(".meterMini .legend") || {}).textContent || "" : "";
    const legendNums = (legend.match(/\\d+/g) || []).map(Number);
    const headNums = [...document.querySelectorAll(".tlc .grp .g-n")].map((el) => Number(el.textContent));
    const track = tb ? tb.querySelector(".meterMini .track") : null;
    const cbs = tb ? [...tb.querySelectorAll(".cb")] : [];
    const cbTexts = cbs.map((b) => (b.textContent || "").trim());
    const fills = tb ? tb.querySelectorAll(".cb.fill").length : 0;
    const cardFills = document.querySelectorAll(".tlc .cb.fill, .tlc .l-add").length;
    return {
      hasCard: !!card, hasToolbar: !!tb,
      cmdbar: !!document.querySelector(".cmdbar"), ladd: !!document.querySelector(".l-add"),
      cardTop: card ? card.getBoundingClientRect().top : -1,
      tbBottom: tb ? tb.getBoundingClientRect().bottom : -1,
      tbTop: tb ? tb.getBoundingClientRect().top : -1,
      cbHeights: cbs.map((b) => Math.round(b.getBoundingClientRect().height * 10) / 10),
      cbTexts: cbTexts, fills: fills, cardFills: cardFills,
      trackW: track ? Math.round(track.getBoundingClientRect().width) : -1,
      legend: legend.trim(), legendNums: legendNums, headNums: headNums,
      holders: holders,
      barTop: bar ? bar.getBoundingClientRect().top : -1,
    };
  })()`) as {
    hasCard: boolean; hasToolbar: boolean; cmdbar: boolean; ladd: boolean;
    cardTop: number; tbBottom: number; tbTop: number; cbHeights: number[]; cbTexts: string[];
    fills: number; cardFills: number; trackW: number; legend: string;
    legendNums: number[]; headNums: number[]; holders: string[]; barTop: number;
  };

  add("P1.0 · the card and its toolbar rendered", r.hasCard && r.hasToolbar, "");

  /* the brief's own geometry: the card's top edge within 60px of the toolbar's bottom — i.e. no
     pile of chrome between the two, whichever side of the card edge the toolbar sits. */
  add("P1.1 · the list card's top edge is within 60px of the toolbar's bottom (1440)",
      r.hasToolbar && Math.abs(r.tbBottom - r.cardTop) <= 60,
      "card top " + r.cardTop + " · toolbar bottom " + r.tbBottom);

  add("P1.2 · exactly one element carries the page title",
      r.holders.length === 1, "holders: " + JSON.stringify(r.holders));

  add("P1.3 · the separate command bar row is gone, and so is the old add button",
      !r.cmdbar && !r.ladd, "cmdbar=" + r.cmdbar + " l-add=" + r.ladd);

  add("P1.4 · one 32px row — every action control measures 32",
      r.cbHeights.length === 3 && r.cbHeights.every((h) => Math.abs(h - 32) <= 0.5),
      JSON.stringify(r.cbHeights));

  add("P1.5 · the three actions, in the contract's order",
      r.cbTexts.length === 3 && r.cbTexts[0] === "Add a task" && r.cbTexts[1] === "Add a note"
        && r.cbTexts[2] === "Calendar",
      JSON.stringify(r.cbTexts));

  add("P1.6 · one filled control in the card — the toolbar's Add a task",
      r.fills === 1 && r.cardFills === 1, "toolbar fills=" + r.fills + " card fills=" + r.cardFills);

  add("P1.7 · the meter's track is the contract's 150px",
      r.trackW === 150, "track " + r.trackW + "px");

  /* ⚠️ THE COUNTING LAW, AT THE COMPOSED SURFACE: the legend's figures and the group heads'
     figures are the same numbers in the same order — both read off the rendered page, neither
     from the store. A page with a collapsed or empty group would legitimately show fewer heads,
     so the claim is set-shaped: every head figure appears in the legend, and the legend's three
     figures sum to the rows the heads sum to. */
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  add("P1.8 · the legend's figures ARE the group heads' figures",
      r.legendNums.length === 3 && sum(r.legendNums) === sum(r.headNums)
        && r.headNums.every((n) => r.legendNums.includes(n)),
      "legend " + JSON.stringify(r.legendNums) + " heads " + JSON.stringify(r.headNums)
        + " · " + r.legend);

  /* one line: the toolbar row is a single line of controls, not a stack */
  add("P1.9 · the toolbar is one row — meter and actions share a line",
      r.tbBottom - r.tbTop <= 48, "row height " + (r.tbBottom - r.tbTop));

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT, "── tightened · Phase 1 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(9);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});

test("Phase 2 — the dense list: 44 both states, the strip, the keys", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT2 = process.env.SA_TI_OUT2 ?? "run-artifacts/tightened-p2.txt";
  rmSync(OUT2, { force: true });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction(
    "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);

  const heights = () => page.evaluate(`[...document.querySelectorAll(".tlc .row")]
    .filter((r) => r.getBoundingClientRect().width > 0)
    .map((r) => Math.round(r.getBoundingClientRect().height * 10) / 10)`) as Promise<number[]>;

  /* ── P2.1a · every row is 44 at rest ── */
  const restH = await heights();
  add("P2.1a · every resting row is 44px",
      restH.length > 5 && restH.every((h) => Math.abs(h - 44) <= 0.5),
      restH.length + " rows · distinct " + JSON.stringify([...new Set(restH)]));

  /* ── the click grammar: first click FOCUSES — split stays shut, the strip drops ── */
  const k1 = await page.evaluate(`(() => {
    const r = document.querySelector(".tlc .row");
    if (!r) return null; r.click(); return r.getAttribute("data-rowkey");
  })()`) as string | null;
  await page.waitForFunction("!!document.querySelector('.tlc .actrow.show')", null, { timeout: 5_000 }).catch(() => {});
  /* the strip's 160ms drop-in is LIVE (this file lifts the suppression); measuring mid-animation
     reads the translateY(-3px) keyframe as an overlap — settle first */
  await page.waitForTimeout(300);
  const afterClick = await page.evaluate(`(() => {
    const split = document.querySelector(".tdw-split");
    const strips = [...document.querySelectorAll(".tlc .actrow.show")];
    const focusRow = document.querySelector(".tlc .row.focus");
    const rows = [...document.querySelectorAll(".tlc .row")].map((r) => {
      const b = r.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right };
    });
    const sb = strips[0] ? strips[0].getBoundingClientRect() : null;
    const fr = focusRow ? focusRow.getBoundingClientRect() : null;
    let covered = 0;
    if (sb) for (const r of rows) {
      const ix = Math.min(sb.right, r.r) - Math.max(sb.left, r.l);
      const iy = Math.min(sb.bottom, r.b) - Math.max(sb.top, r.t);
      if (ix > 1 && iy > 1) covered += 1;
    }
    return { open: !!(split && split.classList.contains("open")), strips: strips.length,
      stripTop: sb ? sb.top : -1, rowBottom: fr ? fr.bottom : -1, covered: covered,
      who: !!(focusRow && focusRow.querySelector(".r-who")) };
  })()`) as { open: boolean; strips: number; stripTop: number; rowBottom: number; covered: number; who: boolean };

  add("P2.2 · one click focuses — the sheet does NOT open", !afterClick.open && !!k1, "");
  add("P2.3 · exactly one strip exists", afterClick.strips === 1, "strips=" + afterClick.strips);
  add("P2.4 · the strip renders BELOW the row and covers no row's content",
      afterClick.stripTop >= afterClick.rowBottom - 0.5 && afterClick.covered === 0,
      "strip top " + afterClick.stripTop + " · row bottom " + afterClick.rowBottom + " · rows intersected " + afterClick.covered);
  add("P2.5 · the deed names the agent inline (r-who)", afterClick.who, "");

  /* ── typing guard: a j typed into search moves nothing ── */
  await page.evaluate(`(() => { const i = document.querySelector(".tlc .l-search input"); if (i) { i.focus(); } })()`);
  await page.keyboard.type("j");
  await page.waitForTimeout(200);
  /* ⚠️ the typed j NARROWS THE LIST — it is a search letter, so the focused row may legitimately
     leave the RENDER while the query stands. The claim is that no list ACTION fired (nothing
     opened, no door), and that focus was never moved: when the query clears, the same row wears
     it again. Asserting the row visible mid-query was the first form, and it was wrong about
     what typing does. */
  const whileTyped = await page.evaluate(`(() => ({
    q: (document.querySelector(".tlc .l-search input") || {}).value || "",
    open: !!(document.querySelector(".tdw-split") || { classList: { contains: () => false } }).classList.contains("open"),
    door: !!document.querySelector(".tdf .panel"),
  }))()`) as { q: string; open: boolean; door: boolean };
  await page.evaluate(`(() => { const i = document.querySelector(".tlc .l-search input");
    if (i) { const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      set.call(i, ""); i.dispatchEvent(new Event("input", { bubbles: true })); i.blur(); } })()`);
  await page.waitForTimeout(250);
  const afterCleared = await page.evaluate(`(() =>
    (document.querySelector(".tlc .row.focus") || { getAttribute: () => null }).getAttribute("data-rowkey"))()`) as string | null;
  add("P2.6 · a j typed into the search is a letter — no action fired, and focus survives the query",
      whileTyped.q.includes("j") && !whileTyped.open && !whileTyped.door && afterCleared === k1,
      "query " + JSON.stringify(whileTyped.q) + " open=" + whileTyped.open + " door=" + whileTyped.door
        + " · focus after clear " + afterCleared + " was " + k1);

  /* ── j moves focus without opening ── */
  await page.keyboard.press("j");
  await page.waitForTimeout(150);
  const afterJ = await page.evaluate(`(() => ({
    open: !!(document.querySelector(".tdw-split") || { classList: { contains: () => false } }).classList.contains("open"),
    focusKey: (document.querySelector(".tlc .row.focus") || { getAttribute: () => null }).getAttribute("data-rowkey"),
  }))()`) as { open: boolean; focusKey: string | null };
  add("P2.7 · j moves focus without opening",
      !afterJ.open && !!afterJ.focusKey && afterJ.focusKey !== k1,
      "focus " + k1 + " -> " + afterJ.focusKey + " open=" + afterJ.open);

  /* ── Enter opens; the rows hold 44 with the drawer open; the strip rides the SELECTED row ── */
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    "(document.querySelector('.tdw-split') || {className:''}).className.includes('open')", null, { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(700);
  const openH = await heights();
  add("P2.1b · every row is 44px with the drawer open",
      openH.length > 5 && openH.every((h) => Math.abs(h - 44) <= 0.5),
      openH.length + " rows · distinct " + JSON.stringify([...new Set(openH)]));
  const openStrip = await page.evaluate(`(() => {
    const strips = [...document.querySelectorAll(".tlc .actrow.show")];
    const sel = document.querySelector(".tlc .row.sel");
    const sb = strips[0] ? strips[0].getBoundingClientRect() : null;
    const sr = sel ? sel.getBoundingClientRect() : null;
    const prev = strips[0] ? strips[0].previousElementSibling : null;
    return { strips: strips.length, under: !!(sb && sr && sb.top >= sr.bottom - 0.5),
      onsel: !!(strips[0] && strips[0].classList.contains("onsel")),
      selKey: sel ? sel.getAttribute("data-rowkey") : null,
      host: prev ? prev.getAttribute("data-rowkey") : null,
      paneClasses: (document.querySelector(".tpn") || { className: "" }).className };
  })()`) as { strips: number; under: boolean; onsel: boolean; selKey: string | null; host: string | null; paneClasses: string };
  add("P2.8 · the strip stays under the SELECTED row while the sheet is open",
      openStrip.strips === 1 && openStrip.under && openStrip.onsel && openStrip.selKey === openStrip.host,
      JSON.stringify(openStrip));

  /* ── the fork's digit keys: 2 picks the second (non-crossover) option, no write ── */
  const forkThere = await page.waitForFunction(
    "document.querySelectorAll('.tpn .fork .fk').length > 0", null, { timeout: 6_000 }).then(() => true).catch(() => false);
  if (forkThere) {
    const before = await page.evaluate(`document.querySelectorAll(".tpn .fork .fk").length`) as number;
    await page.keyboard.press("2");
    await page.waitForTimeout(300);
    const picked = await page.evaluate(`(() => ({
      forks: document.querySelectorAll(".tpn .fork .fk").length,
      chosen: !!document.querySelector(".tpn .receipt"),
    }))()`) as { forks: number; chosen: boolean };
    add("P2.9 · a digit picks the fork option — the fork collapses to its chosen line",
        before >= 2 && picked.forks === 0 && picked.chosen,
        "options " + before + " -> " + picked.forks + " chosen=" + picked.chosen);
  } else {
    const paneText = await page.evaluate(
      `((document.querySelector(".tpn") || {}).textContent || "").slice(0, 160)`) as string;
    add("P2.9 · a digit picks the fork option", false, "no fork gated — pane holds: " + paneText);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);

  /* ── collapse: the head folds its section, the count stays, j skips what is not rendered ── */
  const col = await page.evaluate(`(() => {
    const head = document.querySelector(".tlc .grp");
    if (!head) return null;
    const label = (head.querySelector(".g-lbl") || {}).textContent || "";
    const count = (head.querySelector(".g-n") || {}).textContent || "";
    const rowsBefore = document.querySelectorAll(".tlc .row").length;
    head.click();
    return { label: label, count: count, rowsBefore: rowsBefore };
  })()`) as { label: string; count: string; rowsBefore: number } | null;
  await page.waitForTimeout(250);
  const afterCol = await page.evaluate(`(() => ({
    rows: document.querySelectorAll(".tlc .row").length,
    expanded: (document.querySelector(".tlc .grp") || { getAttribute: () => "" }).getAttribute("aria-expanded"),
    count: ((document.querySelector(".tlc .grp .g-n") || {}).textContent) || "",
  }))()`) as { rows: number; expanded: string; count: string };
  add("P2.10 · a collapsed section renders no rows and keeps its count",
      !!col && afterCol.rows < col.rowsBefore && afterCol.expanded === "false" && afterCol.count === col.count,
      col ? col.rowsBefore + " -> " + afterCol.rows + " rows · count " + JSON.stringify(afterCol.count) + " expanded=" + afterCol.expanded : "no head");
  /* j from the top: the walk must never land on a row of the collapsed group — there are none
     rendered, so the claim is that focus always lands on a RENDERED row */
  await page.keyboard.press("j");
  await page.waitForTimeout(120);
  const focusRendered = await page.evaluate(`(() => {
    const f = document.querySelector(".tlc .row.focus");
    return !!(f && f.getBoundingClientRect().height > 0);
  })()`) as boolean;
  add("P2.11 · j lands only on rendered rows while a section is closed", focusRendered, "");
  await page.evaluate(`(() => { const h = document.querySelector(".tlc .grp"); if (h) h.click(); })()`);
  await page.waitForTimeout(250);

  /* ── s: the snooze door, the WRITER, and the way back — commit and undo IN THIS RUN ── */
  const houseKey = await page.evaluate(`(() => {
    const heads = [...document.querySelectorAll(".tlc .grp")];
    const house = heads.find((h) => ((h.querySelector(".g-lbl") || {}).textContent || "").includes("Housekeeping"));
    if (!house) return null;
    let el = house.nextElementSibling;
    while (el && !el.classList.contains("row")) el = el.nextElementSibling;
    if (!el) return null;
    el.click();
    return el.getAttribute("data-rowkey");
  })()`) as string | null;
  await page.waitForFunction("!!document.querySelector('.tlc .actrow.show')", null, { timeout: 5_000 }).catch(() => {});
  await page.keyboard.press("s");
  const panelUp = await page.waitForFunction(
    "[...document.querySelectorAll('.tdf .panel')].some((p) => (p.textContent || '').includes('Snooze this task'))",
    null, { timeout: 5_000 }).then(() => true).catch(() => false);
  add("P2.12 · s opens the snooze panel for the focused row", !!houseKey && panelUp, "row " + houseKey);
  if (panelUp && houseKey) {
    await page.evaluate(`(() => {
      const btn = [...document.querySelectorAll(".tdf .panel button")].find((b) => (b.textContent || "").includes("Snooze it"));
      if (btn) btn.click();
    })()`);
    const left = await page.waitForFunction(
      "!document.querySelector('.tlc .row[data-rowkey=" + JSON.stringify(houseKey) + "]')",
      null, { timeout: 6_000 }).then(() => true).catch(() => false);
    /* ⚠️ THE ACCOUNT HAS BEEN CHANGED — nothing navigates before the Undo, and the press is
       asserted immediately (the restore-in-run law). */
    const undoPressed = await page.evaluate(`(() => {
      const u = document.querySelector(".tdb-toast-act");
      if (!u) return false; u.click(); return true;
    })()`) as boolean;
    /* ⚠️ THE GUARD FIRES ONLY WHERE A WRITE ACTUALLY LANDED (the restore-in-run law). If the row
       never left, nothing was committed and there is nothing to put back — that is a clean RED
       below, not an account left changed. Asserting unconditionally would turn a no-write
       mutation into a CRASH, which names a line rather than a property (the crashing-lock rule). */
    if (left) {
      expect(undoPressed, "SNOOZE COMMITTED AND UNDO NOT FOUND — the harness account holds a snoozed task: " + houseKey).toBe(true);
    }
    const back = await page.waitForFunction(
      "!!document.querySelector('.tlc .row[data-rowkey=" + JSON.stringify(houseKey) + "]')",
      null, { timeout: 8_000 }).then(() => true).catch(() => false);
    add("P2.13 · s snoozes through the snooze writer — the row left, and Undo brought it back",
        left && undoPressed && back, "left=" + left + " undo=" + undoPressed + " back=" + back);
  } else {
    add("P2.13 · s snoozes through the snooze writer", false, "door never opened");
  }

  /* ── d: the dismiss confirm opens, and Keep writes nothing ── */
  await page.keyboard.press("d");
  const confirmUp = await page.waitForFunction(
    "[...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Keep it'))",
    null, { timeout: 5_000 }).then(() => true).catch(() => false);
  if (confirmUp) {
    await page.evaluate(`(() => {
      const b = [...document.querySelectorAll("button")].find((x) => (x.textContent || "").includes("Keep it"));
      if (b) b.click();
    })()`);
  }
  await page.waitForTimeout(250);
  const stillThere = await page.evaluate(
    "!!document.querySelector('.tlc .row[data-rowkey=" + JSON.stringify(houseKey ?? "") + "]')") as boolean;
  add("P2.14 · d opens the dismiss confirm, and Keep leaves the row standing",
      confirmUp && stillThere, "confirm=" + confirmUp + " row still there=" + stillThere);

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT2, "── tightened · Phase 2 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(14);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});
