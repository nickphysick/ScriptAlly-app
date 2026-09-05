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
