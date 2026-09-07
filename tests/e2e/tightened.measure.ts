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
/* ⚠️ THE EXPECTED SIDE COMES FROM THE APP'S OWN DERIVATIONS, NEVER FROM A LITERAL HERE — the
   Query Centre's ladder key and the app's one status-word function. A hex typed into this file
   would be a second copy of the mapping under test, which is the circular-assertion family. */
import { stageFor } from "../../src/lib/queryCardFacts";
import { QueryStatus } from "../../src/types";
/* ⚠️ `getStatusLabel` IS NOT IMPORTED, AND THE REASON IS MECHANICAL RATHER THAN A PREFERENCE:
   it lives in `StatusPill.tsx`, which imports a stylesheet, and a CSS import in this runner
   makes the FILE FAIL TO COLLECT — reported as "No tests found", which greps as zero reds. So
   the one clause of it that matters here is restated, with the source named: every status'
   label is its own enum string, except REJECTED. Restating a two-line function is the lesser
   evil against a suite that silently does not run — and `statusLabelsMatch` below asserts the
   restatement against the real function's ONE exception, so a change there fails here. */
const labelOf = (st: QueryStatus): string =>
  st === QueryStatus.REJECTED ? "Rejected" : String(st);
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
/* ⚠️ THE REMOVAL IS INSIDE THE TEST, NOT AT MODULE SCOPE — and this file had it the other way for
   three phases. Playwright imports the file once PER WORKER, so with four tests spread across
   workers a later import deleted the report an earlier worker had already written: Phase 1's
   output went missing on run after run while its assertions were all green. A vanished report
   reads exactly like a test that did not run, which is the stale-report fault wearing its own
   clothes. */
const OUT = process.env.SA_TI_OUT ?? "run-artifacts/tightened.txt";

test("Phase 1 — one toolbar: the row, the title census, the meter's figures", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  rmSync(OUT, { force: true });
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction(
    "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);

  const r = await page.evaluate(`(() => {
    const vis = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const card = document.querySelector(".tlc");
    /* THE TOOLBAR MOVED OUT OF THE CARD AND ONTO THE PAGE (QC-chassis round, Phase 1).
       .tlc .l-toolbar was this round's own row; the page's .tdb-qtool replaced it, and
       TodoToolbar.tsx was deleted rather than left unmounted. The geometry claims below follow
       the row to its new home; the ones about the meter and the three actions are RETIRED, each
       naming where its claim now lives. (No backticks in here — see the file header.) */
    const tb = document.querySelector(".tdb-qtool");
    const deadToolbar = document.querySelectorAll(".tlc .l-toolbar, .tlc .meterMini, .tlc .cb, .tlc .l-search").length;
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
    return {
      hasCard: !!card, hasToolbar: !!tb, deadToolbar: deadToolbar,
      cmdbar: !!document.querySelector(".cmdbar"), ladd: !!document.querySelector(".l-add"),
      cardTop: card ? card.getBoundingClientRect().top : -1,
      tbBottom: tb ? tb.getBoundingClientRect().bottom : -1,
      tbTop: tb ? tb.getBoundingClientRect().top : -1,
      holders: holders,
      barTop: bar ? bar.getBoundingClientRect().top : -1,
    };
  })()`) as {
    hasCard: boolean; hasToolbar: boolean; deadToolbar: number; cmdbar: boolean; ladd: boolean;
    cardTop: number; tbBottom: number; tbTop: number; holders: string[]; barTop: number;
  };

  add("P1.0 · the card and the page's toolbar rendered", r.hasCard && r.hasToolbar, "");

  /* ⚠️ AND THE CARD'S OWN TOOLBAR IS GONE — the claim that replaces P1.4-P1.8 below. A round that
     retires a surface owns saying so in the lock that measured it, or the next reader cannot tell
     a supersession from a regression. `TodoToolbar.tsx` and its rules were DELETED, not unmounted:
     a replacement that is added leaves the original reachable. */
  add("P1.0b · the card's own toolbar, meter, actions and search are retired, not merely hidden",
      r.deadToolbar === 0, "surviving .l-toolbar/.meterMini/.cb/.l-search in the card: " + r.deadToolbar);

  /* the brief's own geometry, FOLLOWED TO THE NEW ROW: the card's top edge within 60px of the
     toolbar's bottom — i.e. no pile of chrome between the two. The claim is unchanged and still
     worth making; only which element is "the toolbar" moved. */
  add("P1.1 · the list card's top edge is within 60px of the page toolbar's bottom (1440)",
      r.hasToolbar && Math.abs(r.tbBottom - r.cardTop) <= 60,
      "card top " + r.cardTop + " · toolbar bottom " + r.tbBottom);

  add("P1.2 · exactly one element carries the page title",
      r.holders.length === 1, "holders: " + JSON.stringify(r.holders));

  add("P1.3 · the separate command bar row is gone, and so is the old add button",
      !r.cmdbar && !r.ladd, "cmdbar=" + r.cmdbar + " l-add=" + r.ladd);

  /* ⚠️ P1.4-P1.8 ARE RETIRED, and each names where its claim went (QC-chassis round, Phase 1).
     They measured `TodoToolbar` — a component this round deleted — so retargeting them would be
     asserting the new surface twice while pretending to be about the old one.
       P1.4 (32px action controls) and P1.5 (three actions in order) → the page's three toolbar
         controls, `qcChassis.measure.ts` P1.7, plus the header's one primary at P1.4.
       P1.6 (one filled control) → the header's single primary, qcChassis P1.4.
       P1.7 (the 150px meter track) → the meter is GONE. The seven tiles are the same fact told
         better, and their geometry is the contract's, not this one's.
       P1.8 (the legend's figures ARE the group heads') → the counting law moved to a STRONGER
         pair: qcChassis P1.2 (the five categories partition All) and P1.2b (the tile total IS the
         card footer's total) — the second of which caught the page stating 29 beside 27.
     P1.0b above asserts the retirement itself, so this is not a silent shrinking of coverage. */

  /* one line: the toolbar is a single row of controls, not a stack. The claim survived the move —
     what changed is that the row now holds the search, Filter, Group, Sort and the view switch
     rather than the meter and three actions. A stacked toolbar is the fault either way. */
  add("P1.9 · the toolbar is one row — its controls share a line",
      r.tbBottom - r.tbTop <= 48, "row height " + (r.tbBottom - r.tbTop));

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT, "── tightened · Phase 1 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(6);
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
  /* ⚠️ THIS PHASE MEASURES THE LIST, SO IT SELECTS THE LIST (QC-chassis round, Phase 7). The
     To-do page gained a view switch and GRID is now the default, so every probe here — which
     reads `.tlc .row`, its 44px height, its action strip and its keys — was measuring a page
     showing tickets. Twelve assertions went red at once, none of them because anything about the
     list had changed. A phase that names a body must put that body on screen. */
  await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().height > 0;
    const w = [...document.querySelectorAll(".tdb-wrap")].find(vis);
    if (!w) return;
    const b = [...w.querySelectorAll(".qvs button")].find((x) => (x.textContent || "").trim() === "List");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(800);

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
  await page.evaluate(`(() => { const i = document.querySelector(".tdb-qtool .qcc-tb-search input"); if (i) { i.focus(); } })()`);
  await page.keyboard.type("j");
  await page.waitForTimeout(200);
  /* ⚠️ the typed j NARROWS THE LIST — it is a search letter, so the focused row may legitimately
     leave the RENDER while the query stands. The claim is that no list ACTION fired (nothing
     opened, no door), and that focus was never moved: when the query clears, the same row wears
     it again. Asserting the row visible mid-query was the first form, and it was wrong about
     what typing does. */
  const whileTyped = await page.evaluate(`(() => ({
    q: (document.querySelector(".tdb-qtool .qcc-tb-search input") || {}).value || "",
    open: !!(document.querySelector(".tdw-split") || { classList: { contains: () => false } }).classList.contains("open"),
    door: !!document.querySelector(".tdf .panel"),
  }))()`) as { q: string; open: boolean; door: boolean };
  await page.evaluate(`(() => { const i = document.querySelector(".tdb-qtool .qcc-tb-search input");
    if (i) { const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      set.call(i, ""); i.dispatchEvent(new Event("input", { bubbles: true })); i.blur(); } })()`);
  await page.waitForTimeout(250);
  const afterCleared = await page.evaluate(`(() =>
    (document.querySelector(".tlc .row.focus") || { getAttribute: () => null }).getAttribute("data-rowkey"))()`) as string | null;
  /* ⚠️ RETARGETED, NOT RETIRED — the SEARCH moved to the page toolbar (QC-chassis Phase 1) and the
     claim did not. "A letter typed into a search box is a letter, not a shortcut" is the whole
     reason the list's single-key grammar is safe to have, and it is MORE at risk now that the box
     lives outside the card the keys act on: the handler and the field no longer share a parent. */
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
  const foldedFoot = await page.evaluate(`(() => {
    const c = document.querySelector(".tlc .l-foot .c");
    return { keys: !!document.querySelector(".tlc .l-foot .keys") && getComputedStyle(document.querySelector(".tlc .l-foot .keys")).display !== "none",
      count: c ? Math.round(c.getBoundingClientRect().height) : -1 };
  })()`) as { keys: boolean; count: number };
  add("P2.17 · folded, the hints stand down and the count stays on one line",
      !foldedFoot.keys && foldedFoot.count > 0 && foldedFoot.count <= 20, JSON.stringify(foldedFoot));

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
  /* ⚠️ THE FOOTER'S KEY HINTS ARE CHROME, NOT COPY — they shipped with no rule for one commit
     and rendered at the page's inherited size, the largest thing in the row. Every assertion
     about the footer was about its TEXT, and the text was right; only the screenshot showed it.
     So: the hints are mono, small, and no taller than the count they sit beside. */
  const foot = await page.evaluate(`(() => {
    const keys = document.querySelector(".tlc .l-foot .keys");
    const count = document.querySelector(".tlc .l-foot .c");
    if (!keys || !count) return null;
    const cs = getComputedStyle(keys);
    return { fs: parseFloat(cs.fontSize), fam: cs.fontFamily.split(",")[0].replace(/"/g, ""),
      h: Math.round(keys.getBoundingClientRect().height),
      countH: Math.round(count.getBoundingClientRect().height),
      kbds: document.querySelectorAll(".tlc .l-foot .keys kbd").length };
  })()`) as { fs: number; fam: string; h: number; countH: number; kbds: number } | null;
  /* and the footer stays ONE line in both states — at 520 the hints stand down rather than
     wrapping the count and the export onto second lines */
  const footLines = await page.evaluate(`(() => {
    const f = document.querySelector(".tlc .l-foot");
    const c = document.querySelector(".tlc .l-foot .c");
    return f && c ? { foot: Math.round(f.getBoundingClientRect().height),
      count: Math.round(c.getBoundingClientRect().height) } : null;
  })()`) as { foot: number; count: number } | null;
  add("P2.16 · the footer is one line at rest",
      !!footLines && footLines.count <= 20, JSON.stringify(footLines));

  add("P2.15 · the footer's key hints are mono chrome, not body copy",
      /* FIVE caps for FOUR actions — j and k are one deed with two keys, which is the contract's
         own line and the reason this is not `=== 4` */
      !!foot && foot.fam === "JetBrains Mono" && foot.fs <= 9 && foot.kbds === 5
        && foot.h <= foot.countH + 6,
      JSON.stringify(foot));

  add("P2.14 · d opens the dismiss confirm, and Keep leaves the row standing",
      confirmUp && stillThere, "confirm=" + confirmUp + " row still there=" + stillThere);

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT2, "── tightened · Phase 2 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(17);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});

test("Phase 3 — the sheet is a document: the header, the title, the measures, the hug", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT3 = process.env.SA_TI_OUT3 ?? "run-artifacts/tightened-p3.txt";
  rmSync(OUT3, { force: true });
  const branches: string[] = [];

  await ensureSignedIn(page);

  /* ⚠️ TWO WIDTHS, AND THEY MEASURE DIFFERENT HALVES OF ONE LAW. The document column is what the
     split leaves after the reference column: 268 at 1440, 748 at 1920. So the 620 measure is
     SLACK at 1440 and BINDS at 1920 — asserting it at one width only would be a pass about
     nothing at the narrow end (the precondition rule). The height law splits the same way: the
     sheet is at its CAP at 1440 and HUGS at 1920. Both are asserted, and the branches are
     tallied at the foot, so a run where one never happened cannot report itself as covering it. */
  /* ⚠️ THE 1920 BRANCH RUNS AT 1050 TALL, AND THE REASON IS A FINDING RATHER THAN A CONVENIENCE
     (QC-chassis round, Phase 1). That round added two rows of page chrome above the drawer — the
     seven stat tiles and the toolbar — which lowered the sheet's cap by roughly the same amount.
     Measured on the same build: the sheet's content wants 461px, and the cap is 404 at a 900px
     viewport and comfortably above 461 from 1050 up. So at 1920x900 the sheet is CAPPED, exactly
     as it is at 1440, and the hug branch became unreachable at the harness's default height.

     Raising the height keeps the LAW under test rather than deleting it, and the branch tally at
     the foot still proves both states ran. What it must not be read as is "the hug is fine": on a
     1440x900 laptop the task drawer now scrolls internally where it used to hug, and that is a
     design consequence for Nick to rule on, recorded in the round report. */
  for (const [w, vh] of [[1440, 900], [1920, 1050]] as const) {
    await page.setViewportSize({ width: w, height: vh });
    await page.goto("/todo");
    await page.waitForFunction(
      "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
    await liftMotionSuppression(page);
  /* ⚠️ THIS PHASE MEASURES THE LIST, SO IT SELECTS THE LIST (QC-chassis round, Phase 7). The
     To-do page gained a view switch and GRID is now the default, so every probe here — which
     reads `.tlc .row`, its 44px height, its action strip and its keys — was measuring a page
     showing tickets. Twelve assertions went red at once, none of them because anything about the
     list had changed. A phase that names a body must put that body on screen. */
  await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().height > 0;
    const w = [...document.querySelectorAll(".tdb-wrap")].find(vis);
    if (!w) return;
    const b = [...w.querySelectorAll(".qvs button")].find((x) => (x.textContent || "").trim() === "List");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(800);

    /* ⚠️ SEEK A ROW WITH A FORK rather than assuming one — the first row's journey is "Reply to
       the offer", which has neither fork nor ledger, so a probe that took row 1 measured an
       empty form and reported [] for both. The index it lands on is REPORTED, so a fixture that
       drifts is visible rather than silently changing what was measured. */
    const forkRow = await page.evaluate(`(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const rows = [...document.querySelectorAll(".tlc .row")];
      for (let i = 0; i < Math.min(rows.length, 8); i++) {
        rows[i].click(); await sleep(140);
        const f = document.querySelector(".tlc .row.focus"); if (f) f.click();
        await sleep(750);
        if (document.querySelectorAll(".tpn .fk").length > 0) return i;
      }
      return -1;
    })()`) as number;
    add("P3.0 @" + w + " · a journey with a fork was found to measure",
        forkRow >= 0, "row index " + forkRow);
    if (forkRow < 0) continue;

    const h = await page.evaluate(`(() => {
      const head = document.querySelector(".tpn .dhead");
      const fam = document.querySelector(".tpn .dhead .fam");
      const title = document.querySelector(".tpn .title");
      const form = document.querySelector(".tpn .form");
      const sheet = document.querySelector(".tpn .sheet");
      const wcol = document.querySelector(".tpn .wcol");
      const scroller = document.querySelector(".tpn .workscroll");
      /* ⚠️ TINTED MEANS "A FILL THAT IS NOT THE HEADER'S OWN" — comparing against transparency
         alone counted the three white controls, which sit on white and tint nothing. Asked of
         the browser, not by class name, so a new element cannot slip past the census. */
      const hb = head ? getComputedStyle(head).backgroundColor : "";
      const tinted = [];
      if (head) for (const el of head.querySelectorAll("*")) {
        const cs = getComputedStyle(el);
        const bg = cs.backgroundColor;
        const opaque = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== hb;
        if (opaque || cs.backgroundImage !== "none") tinted.push(String(el.className) || el.tagName);
      }
      const kids = title ? [title, ...title.querySelectorAll("*")] : [];
      const cs = title ? getComputedStyle(title) : null;
      const R = (e) => e ? e.getBoundingClientRect() : null;
      return {
        band: !!document.querySelector(".tpn .band"),
        hasHead: !!head, fam: fam ? (fam.textContent || "").trim() : null,
        pos: ((document.querySelector(".tpn .pos") || {}).textContent || "").trim(),
        tinted: tinted,
        ctrls: head ? [...head.querySelectorAll(".dnav button")].map((b) => Math.round(b.getBoundingClientRect().height)) : [],
        headRule: head ? getComputedStyle(head).borderBottomWidth : "",
        titleFont: cs ? cs.fontFamily.split(",")[0].replace(/"/g, "") : "",
        titleSize: cs ? cs.fontSize : "", titleWeight: cs ? cs.fontWeight : "",
        inks: [...new Set(kids.map((el) => getComputedStyle(el).color))],
        titleW: title ? Math.round(R(title).width) : -1,
        titleH: title ? Math.round(R(title).height) : -1,
        docW: form ? Math.round(R(form).width) : -1,
        forks: [...document.querySelectorAll(".tpn .fk")].map((f) => Math.round(R(f).height * 10) / 10),
        sheetH: sheet ? Math.round(R(sheet).height * 10) / 10 : -1,
        capH: wcol ? Math.round(R(wcol).height * 10) / 10 : -1,
        scrollerH: scroller ? Math.round(R(scroller).height) : -1,
      };
    })()`) as any;

    if (w === 1440) {
      add("P3.1 · no .band renders", !h.band, "");
      add("P3.2 · the header carries the family pill and the position",
          h.hasHead && !!h.fam && /^Task \d+ of \d+$/.test(h.pos),
          "pill " + JSON.stringify(h.fam) + " · " + JSON.stringify(h.pos));
      add("P3.3 · exactly ONE tinted element in the header — the pill",
          h.tinted.length === 1 && String(h.tinted[0]).includes("fam"),
          "tinted: " + JSON.stringify(h.tinted));
      add("P3.4 · the header's controls are 26px, on one row with a hairline beneath",
          h.ctrls.length >= 2 && h.ctrls.every((x: number) => x === 26) && h.headRule === "1px",
          "controls " + JSON.stringify(h.ctrls) + " · rule " + h.headRule);
      add("P3.5 · the title is Playfair 21/400",
          h.titleFont === "Playfair Display" && h.titleSize === "21px" && h.titleWeight === "400",
          h.titleFont + " " + h.titleSize + "/" + h.titleWeight);
      /* ⚠️ ONE INK, over EVERY descendant rather than the first level — nobody puts the offending
         span at the top, which is how the deed's burgundy `em` survived three rounds. */
      add("P3.6 · the title and every descendant render ONE ink",
          h.inks.length === 1, "inks " + JSON.stringify(h.inks));
      /* ⚠️ 56 IS A MINIMUM, AND AT THE NARROW COLUMN IT IS THE FLOOR RATHER THAN THE HEIGHT —
         the contract draws these rows in a 620px column where every subtitle is one line. At
         268 they wrap and the option GROWS, which is the right behaviour (`min-height`, never
         `height`: a fixed row would crop the subtitle). What is asserted here is the floor and
         that nothing runs away: the crossover tag drops below the pair under 420 of container,
         after it left ~120px for the text and grew one option to 265px. */
      add("P3.7a · at 1440 no fork row is under 56, and none runs away",
          h.forks.length > 0 && h.forks.every((x: number) => x >= 55.5)
            && Math.max(...(h.forks as number[])) <= 120,
          JSON.stringify(h.forks));
      /* ⚠️ THE NARROW END'S REAL RISK, MEASURED RATHER THAN ASSUMED. The drawer round cut this
         sentence from 19px to 16.5 because at ~280px it wrapped to eight lines and starved the
         work to 122px. At 21px in the 268px column it takes four lines and 109px, and the work
         still gets ~468 — so the contract's size survives the narrow column. This assertion is
         what stops the next size change re-creating that fault silently. */
      add("P3.8a · at 1440 the title leaves the work the greater share",
          h.titleH > 0 && h.scrollerH > h.titleH * 2,
          "title " + h.titleH + " · scroller " + h.scrollerH + " · doc column " + h.docW);
      branches.push("1440");
    }

    if (w === 1920) {
      /* the 620 measure, at the width where it BINDS: the column is wider and the text stops */
      add("P3.8b · at 1920 the 620px measure binds — the column is wider and the title stops at 620",
          h.docW > 700 && h.titleW === 620,
          "doc column " + h.docW + " · title " + h.titleW);
      /* where the contract's own measure holds, its row height holds with it */
      /* ⚠️ THIS MEASURES THE CONTENT, NOT THE FLOOR, AND THE DIFFERENCE WAS FOUND BY MUTATION.
         Dropping `min-height` 56 → 20 in the served CSS reddened NOTHING: at the contract's own
         type (13/10.5, padding 11) the option's content is 57.8, so the minimum never binds and
         this assertion is about the row the type produces. The floor still guards the case the
         fixture has not got — an option with NO subtitle, which would be ~40 — so it stays, and
         the report says it is unexercised rather than pretending otherwise. What this forbids is
         the state that started this: 67.2, where the number was in the stylesheet and the type
         above it made the row half again as tall. */
      add("P3.7b · at 1920 the fork row is the contract's height — 56, within 2px",
          h.forks.length > 0 && h.forks.every((x: number) => x >= 55.5 && x <= 58),
          JSON.stringify(h.forks));
      branches.push("1920");
    }

    /* ── the height law, both halves ──
       ⚠️ THE REFERENCE COLUMN IS COLLAPSED FIRST AT 1920, AND THAT IS A PRECONDITION RATHER THAN
       A CONVENIENCE. Phase 4 put the reference INSIDE the sheet, so "the sheet hugs its content"
       now means it hugs the TALLER OF ITS TWO COLUMNS — and the reference is taller than a fork
       or a short ledger, so both states measured an identical 598.5 and the hug looked like a
       stretch. Measuring the document's own hug means measuring it where the document governs. */
    if (w === 1920) {
      await page.evaluate(`(() => { const b = document.querySelector(".tpn .qhead .cl"); if (b) b.click(); })()`);
      await page.waitForTimeout(450);
    }
    const forkH = await page.evaluate(
      `(() => { const s = document.querySelector(".tpn .sheet"); return s ? Math.round(s.getBoundingClientRect().height * 10) / 10 : -1; })()`) as number;
    const forkN = h.forks.length;
    await page.evaluate(`(() => { const b = document.querySelector(".tpn .fk"); if (b) b.click(); })()`);
    await page.waitForTimeout(800);
    const led = await page.evaluate(`(() => {
      const s = document.querySelector(".tpn .sheet");
      const wcol = document.querySelector(".tpn .wcol");
      return {
        h: s ? Math.round(s.getBoundingClientRect().height * 10) / 10 : -1,
        cap: wcol ? Math.round(wcol.getBoundingClientRect().height * 10) / 10 : -1,
        heads: [...document.querySelectorAll(".tpn .q .head")].map((f) => Math.round(f.getBoundingClientRect().height * 10) / 10),
      };
    })()`) as { h: number; cap: number; heads: number[] };

    if (w === 1440) {
      /* same law as the fork's: 42 is the floor, and a label that wraps grows its row rather
         than cropping. One row measured 45.5 at this column — a wrap, not a drift. */
      add("P3.9a · at 1440 no ledger row is under the contract's 42px floor",
          led.heads.length >= 3 && led.heads.every((x) => x >= 41.5) && Math.max(...led.heads) <= 60,
          JSON.stringify(led.heads));
      /* CAPPED: at this width the content exceeds the drawer, so the sheet sits ON the cap */
      add("P3.10a · at 1440 the content exceeds the drawer, and the sheet stops AT the cap",
          Math.abs(led.h - led.cap) <= 1, "sheet " + led.h + " · cap " + led.cap);
    }
    if (w === 1920) {
      add("P3.9b · at 1920 the ledger's rows ARE the contract's 42px",
          led.heads.length >= 3 && led.heads.every((x) => x >= 41.5 && x <= 43.5),
          JSON.stringify(led.heads));
      /* HUGGING: the fork and a four-question ledger hold different amounts, so a hugging sheet
         is two different heights — a stretched one is a single height whatever it holds. */
      add("P3.10b · at 1920, with the reference put aside, the sheet HUGS its document — the fork and the ledger are different heights, both under the cap",
          forkH > 0 && led.h > 0 && Math.abs(forkH - led.h) > 2 && led.h < led.cap - 1 && forkH < led.cap - 1,
          "fork (" + forkN + " options) " + forkH + " · ledger (" + led.heads.length + " rows) " + led.h
            + " · cap " + led.cap);
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  /* ⚠️ THE BRANCH TALLY — a run that measured one width would otherwise report itself as having
     covered a law whose two halves live at two widths. */
  add("P3.11 · both widths were measured", branches.length === 2, "branches " + JSON.stringify(branches));

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT3, "── tightened · Phase 3 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(17);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});

test("Phase 4 — the Quick Look column: the ladder tint, the facts, the collapse", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT4 = process.env.SA_TI_OUT4 ?? "run-artifacts/tightened-p4.txt";
  rmSync(OUT4, { force: true });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction(
    "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);
  /* ⚠️ THIS PHASE MEASURES THE LIST, SO IT SELECTS THE LIST (QC-chassis round, Phase 7). The
     To-do page gained a view switch and GRID is now the default, so every probe here — which
     reads `.tlc .row`, its 44px height, its action strip and its keys — was measuring a page
     showing tickets. Twelve assertions went red at once, none of them because anything about the
     list had changed. A phase that names a body must put that body on screen. */
  await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().height > 0;
    const w = [...document.querySelectorAll(".tdb-wrap")].find(vis);
    if (!w) return;
    const b = [...w.querySelectorAll(".qvs button")].find((x) => (x.textContent || "").trim() === "List");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(800);

  /* ⚠️ SWEEP SEVERAL CARDS RATHER THAN ONE, and TALLY what was seen. One card is a monoculture:
     the first row's query is an Offer with no anchor date, so a probe that stopped there would
     have reported the "since" line as absent and called the branch covered. */
  const seen = await page.evaluate(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const rows = [...document.querySelectorAll(".tlc .row")];
    const acc = [];
    for (let i = 0; i < Math.min(rows.length, 7); i++) {
      rows[i].click(); await sleep(140);
      const f = document.querySelector(".tlc .row.focus"); if (f) f.click();
      await sleep(700);
      const ref = document.querySelector(".tpn .rail");
      if (!ref) continue;
      const qh = document.querySelector(".tpn .qhead");
      const cs = getComputedStyle(ref);
      const probe = document.querySelector(".tpn");
      const ladder = {};
      for (const k of ["out-1","out-2","out-3","in-1","in-2","in-3","offer","closed"])
        ladder[k] = getComputedStyle(probe).getPropertyValue("--stage-" + k).trim();
      /* ⚠️ A TINTED REGION SPANS THE COLUMN — asked of the browser, and the width is what makes
         it a REGION rather than a mark. The first form counted the chevron and the agent's
         initials disc: both carry a fill, neither is an area of the column, and requiring them
         to be colourless would have meant a colourless avatar to satisfy a claim about bands. */
      const tinted = [];
      const base = cs.backgroundColor;
      const colW = ref.getBoundingClientRect().width;
      for (const el of ref.querySelectorAll("*")) {
        const s2 = getComputedStyle(el);
        const bg = s2.backgroundColor;
        const filled = (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== base)
          || s2.backgroundImage !== "none";
        if (filled && el.getBoundingClientRect().width >= colW * 0.8) tinted.push(String(el.className));
      }
      acc.push({
        i: i,
        radius: cs.borderRadius, bl: cs.borderLeftWidth, bt: cs.borderTopWidth,
        br: cs.borderRightWidth, bb: cs.borderBottomWidth,
        headBg: qh ? getComputedStyle(qh).backgroundColor : "",
        tinted: tinted,
        word: ((document.querySelector(".tpn .qhead .st") || {}).textContent || "").trim(),
        dot: !!document.querySelector(".tpn .qhead .st svg"),
        since: ((document.querySelector(".tpn .qhead .since") || {}).textContent || "").trim(),
        who: !!document.querySelector(".tpn .who .av"),
        factCols: [...document.querySelectorAll(".tpn .fact")].map((f) => getComputedStyle(f).gridTemplateColumns),
        absents: [...document.querySelectorAll(".tpn .fact .v.absent")].map((v) => (v.textContent || "").trim()),
        story: !!document.querySelector(".tpn .rail .rtl .tl"),
        link: !!document.querySelector(".tpn .qbtn"),
        linkIsAnchor: (document.querySelector(".tpn .qbtn") || {}).tagName,
        /* the control census — every input or button in the column, at any depth */
        controls: [...ref.querySelectorAll("input, textarea, select, button")].map((c) => String(c.className) || c.tagName),
        ladder: ladder,
      });
    }
    return acc;
  })()`) as any[];

  add("P4.0 · the column was measured on more than one card",
      seen.length >= 2, "cards with a reference: " + seen.length + " (rows " + seen.map((x) => x.i).join(",") + ")");
  if (!seen.length) {
    writeFileSync(OUT4, "── tightened · Phase 4 · no reference column found\n");
    expect(seen.length, "no card rendered a reference column").toBeGreaterThan(0);
  }
  const first = seen[0];

  add("P4.1 · the column is a COLUMN — no radius, one hairline on its left and nowhere else",
      seen.every((s) => s.radius === "0px" && s.bl === "1px" && s.bt === "0px" && s.br === "0px" && s.bb === "0px"),
      JSON.stringify({ radius: first.radius, l: first.bl, t: first.bt, r: first.br, b: first.bb }));

  add("P4.2 · exactly ONE tinted region in the column — its header",
      seen.every((s) => s.tinted.length === 1 && String(s.tinted[0]).includes("qhead")),
      JSON.stringify(seen.map((s) => s.tinted)));

  /* ⚠️ THE TINT IS THE QUERY CENTRE'S LADDER VALUE FOR THIS QUERY'S STATUS — and BOTH SIDES are
     derived: the status comes off the page as a word, `getStatusLabel` maps the enum to that word
     so the word maps back to a status, `stageFor` gives the rung, and the expected colour is the
     PAGE'S OWN `--stage-*` token. No hex is typed here; a literal would be a second copy of the
     mapping under test. */
  const rgb = (hex: string) => {
    const h = hex.trim().replace("#", "");
    if (h.length !== 6) return hex.trim();
    return "rgb(" + parseInt(h.slice(0, 2), 16) + ", " + parseInt(h.slice(2, 4), 16) + ", " + parseInt(h.slice(4, 6), 16) + ")";
  };
  const statusOf = (word: string): QueryStatus | null =>
    (Object.values(QueryStatus) as QueryStatus[]).find((st) => labelOf(st) === word) ?? null;
  const tintChecks = seen.map((s) => {
    const st = statusOf(s.word);
    if (!st) return { word: s.word, ok: false, why: "no status carries this word" };
    const want = rgb(s.ladder[stageFor(st)] || "");
    return { word: s.word, stage: stageFor(st), ok: s.headBg === want, got: s.headBg, want: want };
  });
  add("P4.3 · the header's fill IS the ladder's value for the query's own status",
      tintChecks.every((c) => c.ok), JSON.stringify(tintChecks));

  add("P4.4 · the status word is the app's own — and the real StatusDot is beside it",
      seen.every((s) => !!statusOf(s.word) && s.dot),
      JSON.stringify(seen.map((s) => [s.word, s.dot])));

  /* ⚠️ THE "SINCE" LINE IS CHECKED FOR INTERNAL TRUTH, not for a string: the elapsed it states
     must be the elapsed between the date it states and today. A line reading a real date beside
     a wrong age would satisfy any format check and is exactly the failure worth catching. And
     BOTH BRANCHES ARE TALLIED — an Offer with no anchor renders no line at all, which is the
     absent-rather-than-guessed rule, and a sweep that saw only those would prove nothing. */
  const withSince = seen.filter((s) => s.since);
  const sinceChecks = withSince.map((s) => {
    /* ⚠️ THE YEAR IS OPTIONAL IN THE LINE AND NOT OPTIONAL IN THE CHECK — a date over a year old
       MUST carry it, or the sentence cannot be resolved by a reader or by this. Found here:
       "since 12 June · 15 months" reconstructed to the nearest June and computed 3. */
    const m = /^since (\d+) ([A-Za-z]+)( \d{4})? · (\d+) (day|days|weeks|week|months|month)$/.exec(s.since);
    if (!m) return { line: s.since, ok: false, why: "shape" };
    const now = new Date();
    const month = ["January","February","March","April","May","June","July","August","September","October","November","December"]
      .indexOf(m[2]);
    let d = m[3] ? new Date(Number(m[3]), month, Number(m[1])) : new Date(now.getFullYear(), month, Number(m[1]));
    if (!m[3] && d.getTime() > now.getTime()) d = new Date(now.getFullYear() - 1, month, Number(m[1]));
    /* and an undated line more than a year back is itself the fault */
    if (!m[3] && now.getTime() - d.getTime() > 360 * 86400000)
      return { line: s.since, ok: false, why: "over a year old and states no year" };
    const days = Math.round((now.getTime() - d.getTime()) / 86400000);
    const stated = Number(m[4]);
    const unit = m[5];
    const expect2 = unit.startsWith("day") ? days
      : unit.startsWith("week") ? Math.round(days / 7) : Math.round(days / 30.44);
    return { line: s.since, ok: Math.abs(expect2 - stated) <= 1, stated: stated, computed: expect2 };
  });
  add("P4.5 · every 'since' line states the elapsed its OWN date implies",
      withSince.length > 0 && sinceChecks.every((c) => c.ok),
      "with a line: " + withSince.length + " of " + seen.length + " · " + JSON.stringify(sinceChecks));
  add("P4.5b · and a query with no anchor renders NO line rather than a guess",
      seen.some((s) => !s.since) || withSince.length === seen.length,
      "without a line: " + (seen.length - withSince.length));

  add("P4.6 · the facts are a definition list with the contract's 78px label column",
      first.factCols.length > 0 && first.factCols.every((c: string) => c.startsWith("78px")),
      JSON.stringify([...new Set(seen.flatMap((s) => s.factCols))]));

  add("P4.7 · the agent row, the story and the query link are all there",
      seen.some((s) => s.who) && seen.some((s) => s.story) && seen.every((s) => s.link),
      "who " + seen.filter((s) => s.who).length + " · story " + seen.filter((s) => s.story).length
        + " · link " + seen.filter((s) => s.link).length);

  add("P4.8 · 'Open the full query' is a LINK, not a button",
      seen.every((s) => s.linkIsAnchor === "A"), first.linkIsAnchor);

  /* ⚠️ THE CONTROL CENSUS SWEEPS EVERY DESCENDANT, not the first level. A reference you can
     change is not a reference: the chevron and the link are the two things a reader may do. */
  add("P4.9 · nothing in the column is editable — one button (the chevron) and no fields",
      seen.every((s) => s.controls.length === 1 && String(s.controls[0]).includes("cl")),
      JSON.stringify(seen.map((s) => s.controls)));

  /* ── the collapse: the spine, and the document standing still ── */
  const before = await page.evaluate(
    `Math.round(document.querySelector(".tpn .form").getBoundingClientRect().width)`) as number;
  await page.evaluate(`(() => { const b = document.querySelector(".tpn .qhead .cl"); if (b) b.click(); })()`);
  await page.waitForTimeout(500);
  const after = await page.evaluate(`(() => {
    const form = document.querySelector(".tpn .form");
    const spine = document.querySelector(".tpn .rh");
    const ref = document.querySelector(".tpn .rail");
    return { doc: form ? Math.round(form.getBoundingClientRect().width) : -1,
      spine: !!spine, refW: ref ? Math.round(ref.getBoundingClientRect().width) : -1,
      vertical: spine ? getComputedStyle(spine.querySelector(".t")).writingMode : "",
      head: !!document.querySelector(".tpn .qhead") };
  })()`) as { doc: number; spine: boolean; refW: number; vertical: string; head: boolean };

  add("P4.10 · collapsed, the column is a 30px spine with its label vertical",
      after.spine && after.refW === 30 && after.vertical.startsWith("vertical") && !after.head,
      JSON.stringify(after));
  /* ⚠️ THE DOCUMENT DOES NOT MOVE — the wrap law, inside the sheet. The ref hands the freed space
     back to the document, which re-wraps the sentence being read; here the sheet gives up
     exactly what the column gave up. */
  add("P4.11 · the document keeps its width, open or collapsed",
      before > 0 && Math.abs(before - after.doc) <= 1, "open " + before + " · collapsed " + after.doc);

  /* and it comes back, and the state survives walking to another task (session-remembered) */
  await page.evaluate(`(() => { const b = document.querySelector(".tpn .rh"); if (b) b.click(); })()`);
  await page.waitForTimeout(400);
  const back = await page.evaluate(`!!document.querySelector(".tpn .qhead")`) as boolean;
  add("P4.12 · and the spine opens it again", back, "");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT4, "── tightened · Phase 4 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(12);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});
