/**
 * PANE ROUND — phases 1, 2, 5, 7, 8.
 *
 * ⚠️ FIVE PREMISES FELL AT RECON. `StatusCircle` does not exist (StatusDot is the law);
 * `PaneJourney`/`PaneRecordSweep` are dead; `dismissedTasks` is the retired store; the band already
 * reads `rowDeed`; and Phase 4's footing is real. Each is in `run-artifacts/pane-recon.md`.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

/** open the first row whose pill reads `kind`; returns false when the account has none */
const OPEN = (kind: string) => `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => ((r.querySelector(".pill")||{}).textContent||"").trim() === ${JSON.stringify(kind)});
  if (!row) return false;
  row.click();
  return true;
})()`;

test("pane round", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(7000);

  /* ══ PHASE 1 · the frame ═════════════════════════════════════════════════════════════════ */
  const frame = await page.evaluate(`(() => {
    const vis = ${VIS};
    const one = (s) => [...document.querySelectorAll(s)].find(vis);
    const list = one(".tlc"), pane = one(".tpn");
    const bar = [...document.querySelectorAll(".cmdbar button")].filter(vis)
      .map((b) => (b.textContent||"").trim());
    const work = one(".tdw-work");
    return {
      listTop: list ? Math.round(list.getBoundingClientRect().top) : -1,
      paneTop: pane ? Math.round(pane.getBoundingClientRect().top) : -1,
      counter: (work?.innerText||"").match(/TASK\\s+\\d+\\s+OF\\s+\\d+/i)?.[0] ?? null,
      bar,
    };
  })()`) as any;
  add("P1.1 · the pane's top edge aligns with the list card's",
      frame.paneTop > 0 && Math.abs(frame.paneTop - frame.listTop) <= 2,
      `list=${frame.listTop} pane=${frame.paneTop}`);
  add("P1.2 · no TASK n OF m counter anywhere", frame.counter === null,
      frame.counter ? `found "${frame.counter}"` : "none");
  add("P1.3 · the bar carries no Snooze and no Dismiss",
      !frame.bar.some((b: string) => /snooze|dismiss/i.test(b)), JSON.stringify(frame.bar));
  add("P1.4 · the bar carries Go to calendar",
      frame.bar.some((b: string) => /calendar/i.test(b)), JSON.stringify(frame.bar));

  /* ══ PHASE 2 · the chassis ═══════════════════════════════════════════════════════════════ */
  const chassis = await page.evaluate(`(() => {
    const vis = ${VIS};
    const one = (s) => [...document.querySelectorAll(s)].find(vis);
    const pane = one(".tpn");
    if (!pane) return null;
    const band = one(".tpn .band"), mid = one(".tpn .mid"), bar = one(".tpn .actbar");
    /* A form control scrolls its own content, and that is not a second scroller in the pane: a
       textarea computes overflow-y auto by default, so the first form of this counted the notes
       field as a rival to the middle. The claim is about LAYOUT boxes; controls go by tag.
       (No backticks in here — this comment lives inside a template literal, and a backtick would
       end the string. Fourth variant this session of a comment breaking its own container.) */
    const scrollers = [...pane.querySelectorAll("*")].filter(vis).filter((e) => {
      if (/^(TEXTAREA|INPUT|SELECT)$/.test(e.tagName)) return false;
      const c = getComputedStyle(e);
      return /(auto|scroll)/.test(c.overflowY);
    }).map((e) => String(e.className).split(" ")[0]);
    const nav = [...pane.querySelectorAll(".band button")].filter(vis).length;
    return {
      bandH: band ? Math.round(band.getBoundingClientRect().height) : -1,
      hasMid: !!mid, hasBar: !!bar,
      barBottom: bar ? Math.round(bar.getBoundingClientRect().bottom) : -1,
      paneBottom: Math.round(pane.getBoundingClientRect().bottom),
      scrollers, navBtns: nav,
    };
  })()`) as any;
  add("P2.1 · the band is 68px or less",
      !!chassis && chassis.bandH > 0 && chassis.bandH <= 68,
      chassis ? `band=${chassis.bandH}px` : "no pane");
  add("P2.2 · the middle is the only scrolling element in the pane",
      !!chassis && chassis.scrollers.length === 1 && chassis.scrollers[0] === "mid",
      chassis ? JSON.stringify(chassis.scrollers) : "-");
  add("P2.3 · the action bar is fixed at the pane's foot",
      !!chassis && chassis.hasBar && Math.abs(chassis.barBottom - chassis.paneBottom) <= 2,
      chassis ? `bar=${chassis.barBottom} pane=${chassis.paneBottom}` : "-");
  add("P2.4 · the prev/next arrows live in the band",
      !!chassis && chassis.navBtns >= 2, chassis ? `${chassis.navBtns} buttons in the band` : "-");

  /* ══ PHASE 5 · the close journey ═════════════════════════════════════════════════════════ */
  const openedClose = await page.evaluate(OPEN("Close")) as boolean;
  await page.waitForTimeout(1400);
  const close = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const t = (s) => { const e = all(s)[0]; return e ? (e.textContent||"").replace(/\\s+/g," ").trim() : ""; };
    return {
      deed: t(".tpn .deed"),
      tiles: all(".tpn .tile .k").map((e) => (e.textContent||"").trim()),
      heading: t(".tpn .act h3, .tpn .mid h3"),
      primary: t(".tpn .b-primary, .tpn .actbar .b-primary"),
      rate: (all(".tpn")[0]?.innerText||"").includes("response rate stays honest"),
    };
  })()`) as any;
  add("P5.1 · the close band reads the row's own deed",
      openedClose && /^Consider closing/.test(close.deed), `deed="${close.deed}"`);
  add("P5.2 · its tiles are the three the contract names",
      openedClose && close.tiles.length === 3
        && /waited/i.test(close.tiles[0]) && /most recent interaction/i.test(close.tiles[1])
        && /sent previously/i.test(close.tiles[2]),
      JSON.stringify(close.tiles));
  add("P5.3 · the form asks 'Ready to close this one?'",
      /Ready to close this one\\?/.test(close.heading), `heading="${close.heading}"`);
  add("P5.4 · the response-rate line is kept verbatim", close.rate === true,
      close.rate ? "present" : "missing");
  /* ⚠️ "Close this query", NOT the contract's "Log the close" — corrected at review. "log" is on
     the retired-verbs list and the settled primary grammar is first-person or plain-consequence.
     Newest-wins is the tiebreak, but the newer wording was the regression, so it loses. */
  add("P5.5 · the primary is the reviewed wording, not a retired verb",
      /Close this query/.test(close.primary) && !/\blog\b/i.test(close.primary),
      `primary="${close.primary}"`);

  /* ══ PHASE 7 · dismiss ═══════════════════════════════════════════════════════════════════ */
  const dlg = await page.evaluate(`(() => {
    const vis = ${VIS};
    const b = [...document.querySelectorAll(".tpn .actbar button")].filter(vis)
      .find((x) => /dismiss/i.test(x.textContent||""));
    if (!b) return { found: false };
    b.click();
    return { found: true };
  })()`) as any;
  await page.waitForTimeout(800);
  const dialog = await page.evaluate(`(() => {
    const vis = ${VIS};
    const d = [...document.querySelectorAll(".dlg, [role=alertdialog]")].find(vis);
    if (!d) return null;
    const txt = (d.textContent||"").replace(/\\s+/g," ");
    return {
      title: /Dismiss this task\\?/.test(txt),
      body: /won't come back on its own/.test(txt) && /the query itself doesn't change/.test(txt),
      where: /Include dismissed/.test(txt) && /Query Centre/.test(txt) && /fresh task/.test(txt),
      buttons: [...d.querySelectorAll("button")].map((b) => (b.textContent||"").trim()),
    };
  })()`) as any;
  add("P7.1 · Dismiss opens the confirm dialog with the contract's copy",
      dlg.found && !!dialog && dialog.title && dialog.body,
      dialog ? `title=${dialog.title} body=${dialog.body}` : `no dialog (dismissBtn=${dlg.found})`);
  add("P7.2 · the where-it-goes box makes all three promises",
      !!dialog && dialog.where, dialog ? `where=${dialog.where}` : "-");
  add("P7.3 · its buttons are Keep it and Dismiss it",
      !!dialog && dialog.buttons.some((b: string) => /Keep it/i.test(b))
        && dialog.buttons.some((b: string) => /Dismiss it/i.test(b)),
      dialog ? JSON.stringify(dialog.buttons) : "-");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  const incl = await page.evaluate(`(() => {
    const vis = ${VIS};
    ([...document.querySelectorAll('.tlc .l-icon[aria-label="Filter"]')].find(vis))?.click();
    return true;
  })()`);
  await page.waitForTimeout(700);
  const filterItems = await page.evaluate(`(() => {
    const vis = ${VIS};
    return [...document.querySelectorAll(".menu .m-i")].filter(vis).map((i) => (i.textContent||"").trim());
  })()`) as string[];
  add("P7.4 · the filter offers 'Include dismissed' beside 'Include snoozed'",
      filterItems.some((i) => /include dismissed/i.test(i)) && filterItems.some((i) => /include snoozed/i.test(i)),
      JSON.stringify(filterItems.filter((i) => /include/i.test(i))));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  /* ══ PHASE 8 · the story's dots ══════════════════════════════════════════════════════════ */
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1400);
  const dots = await page.evaluate(`(() => {
    const vis = ${VIS};
    const story = [...document.querySelectorAll(".tpn .tl, .tpn .story")].find(vis);
    if (!story) return null;
    const marks = [...story.querySelectorAll(".sa-statusdot, [data-statusdot]")].filter(vis).length;
    const plain = [...story.querySelectorAll("span.dot")].filter(vis).length;
    return { marks, plain };
  })()`) as any;
  add("P8.1 · the story renders the real StatusDot, not redrawn spans",
      !!dots && dots.marks > 0 && dots.plain === 0,
      dots ? `statusDots=${dots.marks} plainSpans=${dots.plain}` : "no story column on this journey");

  const red = out.filter((r) => !r.ok);
  const lines = [`── pane round · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(process.env.SA_PR_OUT ?? "run-artifacts/pane-round.txt", report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
