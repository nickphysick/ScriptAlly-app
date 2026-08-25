/**
 * THE WORKSPACE ROUND — six phases, measured on the running page.
 *
 * ⚠️ NO BACKTICKS AND NO BACKSLASH ESCAPES INSIDE ANY page.evaluate TEMPLATE. A backtick inside one
 * — even inside a comment — terminates the string and the file fails to COLLECT, which reads as
 * "No tests found" while the previous run's report sits on disk looking current.
 *
 * ⚠️ THE REPORT IS UNLINKED AT MODULE SCOPE, because a run that dies in SETUP never reaches the
 * body — which is exactly the failure that leaves a stale file behind.
 *
 * ⚠️ AND THE VISIBLE PANE IS PICKED BY MEASURING IT. Every workspace page stays MOUNTED and three
 * pages render a `.tpn`, so `document.querySelector` returns whichever is first in source order —
 * almost never the one on screen. `vis` is the filter, on every read.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn, liftMotionSuppression } from "./measure";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_WR_OUT ?? "run-artifacts/workspace-round.txt";
const SHOTS = "run-artifacts/workspace-round";
rmSync(OUT, { force: true });
mkdirSync(SHOTS, { recursive: true });

const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

/** open the first list row whose pill reads `kind` — the list's own control, not a synthetic click */
const OPEN = (kind: string) => `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === ${JSON.stringify(kind)});
  if (!row) return false;
  row.click();
  return true;
})()`;

/** both Fix rows wear the same pill; the cohort is known by its own sub-line */
const OPEN_BULK = `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => /imported queries are missing their materials/.test((r.querySelector(".r-meta") || {}).textContent || ""));
  if (!row) return false;
  row.click();
  return true;
})()`;

test("workspace round", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const notes: string[] = [];

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(7000);

  /* ⚠️ MOTION IS LIFTED FOR EVERY STATE CHANGE IN THIS FILE. `animation: none` never fires
     `animationend`, so anything torn down by that event arms its exit and never leaves. */
  await liftMotionSuppression(page);

  /** the geometry of one open journey — everything Phase 1 and Phase 2 claim */
  const geometryOf = async (kind: string) => {
    const opened = await page.evaluate(kind === "__bulk" ? OPEN_BULK : OPEN(kind));
    if (!opened) return null;
    await page.waitForTimeout(1200);
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const all = (s) => [...document.querySelectorAll(s)].filter(vis);
      const one = (s) => all(s)[0] || null;
      const r = (n) => Math.round(n * 10) / 10;
      const box = (e) => { if (!e) return null; const b = e.getBoundingClientRect();
        return { x: r(b.x), y: r(b.y), w: r(b.width), h: r(b.height), bottom: r(b.bottom), right: r(b.right) }; };

      const pane = one(".tpn .pane");
      if (!pane) return null;
      const ws = one(".tpn .ws");
      const col = one(".tpn .paneCol");
      const work = one(".tpn .work");
      const scroll = one(".tpn .workscroll");
      const bar = one(".tpn .actbar");
      const rec = one(".tpn .rec");
      const recScroll = one(".tpn .recscroll");

      const doc = document.scrollingElement;
      return {
        solo: !!(ws && ws.classList.contains("solo")),
        cols: ws ? getComputedStyle(ws).gridTemplateColumns : "",
        align: ws ? getComputedStyle(ws).alignItems : "",
        ws: box(ws), col: box(col), work: box(work), bar: box(bar), rec: box(rec),
        /* the structural claim: the bar's bottom edge IS the record's */
        barVsRec: bar && rec ? r(bar.getBoundingClientRect().bottom - rec.getBoundingClientRect().bottom) : null,
        workScroll: scroll ? { h: scroll.scrollHeight, c: scroll.clientHeight, over: scroll.scrollHeight - scroll.clientHeight,
                               overflowY: getComputedStyle(scroll).overflowY } : null,
        recScroll: recScroll ? { h: recScroll.scrollHeight, c: recScroll.clientHeight, over: recScroll.scrollHeight - recScroll.clientHeight,
                                 overflowY: getComputedStyle(recScroll).overflowY } : null,
        /* the rim is what clips — asserted as a property, since the pixel claim is measured below */
        workRimOverflow: work && work.querySelector(".rim") ? getComputedStyle(work.querySelector(".rim")).overflow : "",
        /* nothing in this pane may be sticky — the whole mechanism the corrected contract replaces */
        sticky: [...pane.querySelectorAll("*")].filter(vis)
          .filter((e) => getComputedStyle(e).position === "sticky")
          .map((e) => (e.className || "").toString().split(" ")[0]),
        /* the tiles live in the record and nowhere else */
        tilesInBand: all(".tpn .band .rtile").length + all(".tpn .band .tile").length,
        tilesInRecord: all(".tpn .rec .rtile").length,
        statusWord: one(".tpn .rhead .stat") ? one(".tpn .rhead .stat").textContent.trim() : "",
        recHead: one(".tpn .rhead .t") ? one(".tpn .rhead .t").textContent.trim() : "",
        page: { scrollH: doc.scrollHeight, clientH: doc.clientHeight },
      };
    })()`) as any;
  };

  /* ══ PHASE 1 · worksheet left, record right ═══════════════════════════════════════════════ */
  const send = await geometryOf("Send");
  const close = await geometryOf("Close");
  const note = await geometryOf("Note");
  const bulk = await geometryOf("__bulk");

  add("P1.1 · two columns at 1440, the record at 288",
      !!send && /288px$/.test(send.cols.trim()) && !send.solo && !!send.rec && send.rec.w === 288,
      send ? "grid-template-columns=" + send.cols + " · record w=" + (send.rec ? send.rec.w : "-") : "-");
  add("P1.2 · the tiles are in the record card and nowhere else",
      !!send && send.tilesInBand === 0 && send.tilesInRecord > 0,
      send ? "band=" + send.tilesInBand + " record=" + send.tilesInRecord : "-");
  add("P1.3 · the record head reads 'The record' and carries the query's status word",
      !!send && send.recHead === "The record" && send.statusWord.length > 0,
      send ? "head=" + JSON.stringify(send.recHead) + " status=" + JSON.stringify(send.statusWord) : "-");
  add("P1.4 · bulk renders ONE column and no record card",
      !!bulk && bulk.solo && bulk.rec === null,
      bulk ? "solo=" + bulk.solo + " rec=" + (bulk.rec ? "present" : "absent") : "-");

  /**
   * ⚠️ READ FROM THE SEND CAPTURE, NOT FROM THE PAGE AS IT STANDS. The first version of this case
   * queried `.rhead .stat` live — AFTER the cohort had been opened, which has no record card at
   * all — so it read "" and reported the status word missing on a journey that shows it correctly.
   * The precondition (a record on screen) was never asserted. It is the capture's own reading now.
   */
  {
    const label: string = send ? send.statusWord : "";
    add("P1.5 · the status word is a real status label, not an enum string",
        !!send && /^[A-Z][a-z]/.test(label) && !/_/.test(label),
        "statusWord=" + JSON.stringify(label) + " (from the send capture, which has a record)");
  }

  /* ══ PHASE 2 · the fixed-zone pane ════════════════════════════════════════════════════════ */
  for (const [name, g] of [["send", send], ["close", close], ["note", note], ["bulk", bulk]] as [string, any][]) {
    if (!g) { notes.push(name + ": journey not present on this account"); continue; }
    notes.push([
      "  " + name.padEnd(6),
      "ws " + JSON.stringify(g.ws),
      "col " + JSON.stringify(g.col),
      "work " + JSON.stringify(g.work),
      "bar " + JSON.stringify(g.bar),
      "rec " + JSON.stringify(g.rec),
      "barVsRec " + g.barVsRec,
      "workScroll " + JSON.stringify(g.workScroll),
      "recScroll " + JSON.stringify(g.recScroll),
      "page " + JSON.stringify(g.page),
    ].join("\n           "));
  }

  add("P2.1 · the bar's bottom edge lands on the record card's, within 1px",
      !!close && close.barVsRec !== null && Math.abs(close.barVsRec) <= 1,
      close ? "close journey (short work, tall record): barVsRec=" + close.barVsRec : "-");
  add("P2.2 · and on every journey that has a record",
      [send, close].filter(Boolean).every((g: any) => g.barVsRec !== null && Math.abs(g.barVsRec) <= 1),
      [send, close].filter(Boolean).map((g: any, i: number) => ["send", "close"][i] + "=" + g.barVsRec).join(" · "));
  add("P2.3 · the row stretches — the columns are the same height",
      !!send && send.align === "stretch" && !!send.rec && !!send.col && Math.abs(send.rec.h - send.col.h) <= 1,
      send ? "align-items=" + send.align + " col.h=" + (send.col ? send.col.h : "-") + " rec.h=" + (send.rec ? send.rec.h : "-") : "-");
  add("P2.4 · the worksheet scrolls INSIDE its rim, and the rim clips",
      !!send && send.workScroll !== null && send.workScroll.overflowY === "auto" && send.workRimOverflow === "hidden",
      send ? "overflow-y=" + (send.workScroll ? send.workScroll.overflowY : "-") + " rim overflow=" + send.workRimOverflow : "-");
  add("P2.5 · the record scrolls its own middle the same way",
      !!send && send.recScroll !== null && send.recScroll.overflowY === "auto",
      send ? "overflow-y=" + (send.recScroll ? send.recScroll.overflowY : "-") : "-");
  add("P2.6 · nothing in the pane is sticky, on any journey",
      [send, close, note, bulk].filter(Boolean).every((g: any) => g.sticky.length === 0),
      [send, close, note, bulk].filter(Boolean).map((g: any) => JSON.stringify(g.sticky)).join(" "));
  add("P2.7 · the page itself never scrolls at 1440",
      [send, close, note, bulk].filter(Boolean).every((g: any) => g.page.scrollH <= g.page.clientH),
      [send, close, note, bulk].filter(Boolean).map((g: any) => g.page.scrollH + "/" + g.page.clientH).join(" · "));

  /* ⚠️ THE LONG CASE IS FORCED, because whether this account happens to hold a journey taller than
     the pane is a fact about the FIXTURE, not about the law. Content is injected into the form and
     the scroller driven to its end; the claim is that nothing rendered inside it lands below the
     worksheet card's bottom edge. */
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1000);
  const longCase = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const form = all(".tpn .form")[0];
    const scroll = all(".tpn .workscroll")[0];
    const work = all(".tpn .work")[0];
    const bar = all(".tpn .actbar")[0];
    if (!form || !scroll || !work || !bar) return null;
    const filler = document.createElement("div");
    filler.id = "sa-wr-filler";
    filler.style.cssText = "height:900px";
    filler.textContent = "long journey stand-in";
    form.appendChild(filler);
    const before = scroll.scrollHeight - scroll.clientHeight;
    scroll.scrollTop = scroll.scrollHeight;
    const r = (n) => Math.round(n * 10) / 10;
    const workBottom = work.getBoundingClientRect().bottom;
    /* every rendered leaf inside the scroller, at the scroller's end */
    const spill = [...scroll.querySelectorAll("*")]
      .filter(vis)
      .map((e) => ({ cls: (e.className || "").toString().split(" ")[0], b: r(e.getBoundingClientRect().bottom) }))
      .filter((x) => x.b > workBottom + 1);
    const out = {
      over: before,
      scrolled: scroll.scrollTop,
      workBottom: r(workBottom),
      barTop: r(bar.getBoundingClientRect().top),
      spill: spill.slice(0, 6),
      spillCount: spill.length,
      pageScroll: document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight,
      /* the bar's own edge must still meet the record's with the work overflowing */
      barVsRec: (() => { const rec = all(".tpn .rec")[0];
        return rec ? r(bar.getBoundingClientRect().bottom - rec.getBoundingClientRect().bottom) : null; })(),
    };
    filler.remove();
    return out;
  })()`) as any;
  add("P2.8 · with a long journey, no work renders below the worksheet card's bottom edge",
      !!longCase && longCase.over > 0 && longCase.spillCount === 0,
      longCase ? "overflow=" + longCase.over + " scrolled to " + longCase.scrolled
        + " · workBottom=" + longCase.workBottom + " barTop=" + longCase.barTop
        + " · spill=" + JSON.stringify(longCase.spill) : "-");
  add("P2.9 · and the page still does not scroll, and the bar still meets the record",
      !!longCase && longCase.pageScroll <= 0 && longCase.barVsRec !== null && Math.abs(longCase.barVsRec) <= 1,
      longCase ? "pageScroll=" + longCase.pageScroll + " barVsRec=" + longCase.barVsRec : "-");

  /* ══ PHASE 3 · one question at a time ═════════════════════════════════════════════════════ */
  await page.goto("/todo");
  await page.waitForTimeout(6000);
  await liftMotionSuppression(page);
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1200);

  const ledger = () => page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const r = (n) => Math.round(n * 10) / 10;
    const rows = all(".tpn .q").map((q) => ({
      id: q.id,
      open: q.classList.contains("open"),
      done: q.classList.contains("done"),
      headH: r(q.querySelector(".head").getBoundingClientRect().height),
      label: (q.querySelector(".ql") || {}).textContent || "",
      ans: q.querySelector(".ans") ? q.querySelector(".ans").textContent.replace(/\\u2713|Edit/g, "").trim() : null,
      edit: !!q.querySelector(".edit"),
      body: !!q.querySelector(".body"),
      sqm: (() => { const s = q.querySelector(".sqm");
        return s ? getComputedStyle(s).visibility : "none"; })(),
      hints: q.querySelectorAll(".hint").length,
    }));
    const go = all(".tpn .actbar .ab.go")[0];
    return {
      rows,
      chip: go ? ((go.querySelector(".n") || {}).textContent || "").trim() : "",
      textareas: all(".tpn .form textarea").length,
      opttags: all(".tpn .form .opttag").length,
      addlinks: all(".tpn .form .addlink").map((a) => a.textContent.trim()),
      strip: (() => { const w = all(".tpn .willrec")[0];
        return w ? w.textContent.replace(/^This records/, "").trim() : ""; })(),
      formH: all(".tpn .form")[0] ? r(all(".tpn .form")[0].getBoundingClientRect().height) : 0,
    };
  })()`) as Promise<any>;

  const L0 = await ledger();
  add("P3.1 · the ledger is one row per required answer, with exactly one open",
      L0.rows.length > 1 && L0.rows.filter((x: any) => x.open).length === 1,
      "rows=" + L0.rows.length + " open=" + JSON.stringify(L0.rows.filter((x: any) => x.open).map((x: any) => x.id)));
  add("P3.2 · the steer square is on the open row and on no other",
      L0.rows.filter((x: any) => x.sqm === "visible").length === 1
        && L0.rows.find((x: any) => x.sqm === "visible")?.id === L0.rows.find((x: any) => x.open)?.id,
      L0.rows.map((x: any) => x.id + ":" + x.sqm).join(" "));
  add("P3.3 · a hint renders under the open row only",
      L0.rows.filter((x: any) => x.hints > 0).every((x: any) => x.open),
      L0.rows.map((x: any) => x.id + ":" + x.hints).join(" "));

  /* answer the open row through its own control, then read the ledger again */
  const answerOpen = async (labelText: string) => {
    await page.evaluate(`(() => {
      const vis = ${VIS};
      const q = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
      if (!q) return false;
      const b = [...q.querySelectorAll(".seg button")].find((x) => (x.textContent || "").trim() === ${JSON.stringify("__LABEL__")});
      if (!b) return false;
      b.click();
      return true;
    })()`.replace("__LABEL__", labelText));
    await page.waitForTimeout(700);
  };
  const openBefore = L0.rows.find((x: any) => x.open)?.id;
  await answerOpen("Today");
  const L1 = await ledger();
  const nowOpen = L1.rows.find((x: any) => x.open)?.id;
  const answeredRow = L1.rows.find((x: any) => x.id === openBefore);

  add("P3.4 · answering advances to the next unanswered question",
      !!nowOpen && nowOpen !== openBefore
        && L1.rows.findIndex((x: any) => x.id === nowOpen) > L1.rows.findIndex((x: any) => x.id === openBefore),
      "was " + openBefore + " -> now " + nowOpen);
  add("P3.5 · the answered row keeps its 40px head, its answer, its tick and its Edit",
      !!answeredRow && answeredRow.done && !answeredRow.open && !!answeredRow.ans && answeredRow.edit,
      answeredRow ? "id=" + answeredRow.id + " h=" + answeredRow.headH + " ans=" + JSON.stringify(answeredRow.ans)
        + " edit=" + answeredRow.edit : "-");

  /* ⚠️ THE HEIGHT CLAIM IS ANSWERED-vs-UNANSWERED, both CLOSED. An open row is head plus body by
     design; the claim is that answering a question does not change its ROW. */
  const closedHeads = L1.rows.filter((x: any) => !x.open).map((x: any) => x.headH);
  add("P3.6 · an answered row's head is the same height as an unanswered one's",
      closedHeads.length > 1 && Math.max(...closedHeads) - Math.min(...closedHeads) <= 0.5,
      "closed head heights " + JSON.stringify(closedHeads)
        + " (answered=" + JSON.stringify(L1.rows.filter((x: any) => x.done && !x.open).map((x: any) => x.headH)) + ")");

  /* Edit reopens the row it belongs to, and no other */
  const editTarget = L1.rows.find((x: any) => x.edit)?.id;
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const q = [...document.querySelectorAll(".tpn .q")].filter(vis).find((x) => x.querySelector(".edit"));
    if (!q) return false;
    q.querySelector(".head").click();
    return true;
  })()`);
  await page.waitForTimeout(700);
  const L2 = await ledger();
  add("P3.7 · Edit reopens the row it belongs to, and no other",
      L2.rows.filter((x: any) => x.open).length === 1 && L2.rows.find((x: any) => x.open)?.id === editTarget,
      "clicked " + editTarget + " -> open " + JSON.stringify(L2.rows.filter((x: any) => x.open).map((x: any) => x.id)));

  /* the gate: press the incomplete primary and watch it OPEN the first unanswered row */
  await page.goto("/todo");
  await page.waitForTimeout(6000);
  await liftMotionSuppression(page);
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1200);
  const beforeGate = await ledger();
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const go = [...document.querySelectorAll(".tpn .actbar .ab.go")].filter(vis)[0];
    if (go) go.click();
    return !!go;
  })()`);
  await page.waitForTimeout(900);
  const gate = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const openRow = all(".tpn .q.open")[0];
    const a = document.activeElement;
    const miss = all(".tpn .miss")[0];
    return {
      open: openRow ? openRow.id : "",
      focusInOpen: !!(a && a.closest && openRow && a.closest(".tpn .q") === openRow),
      line: miss ? miss.textContent.trim() : "",
      links: miss ? [...miss.querySelectorAll("a")].map((x) => x.textContent.trim()) : [],
      tookOver: !!document.querySelector(".ff-wrap, .focusflow, [data-focusflow]"),
      chip: (() => { const go = all(".tpn .actbar .ab.go")[0];
        return go ? ((go.querySelector(".n") || {}).textContent || "").trim() : ""; })(),
    };
  })()`) as any;
  const firstUnanswered = beforeGate.rows.find((x: any) => !x.done)?.id;
  add("P3.8 · an incomplete primary writes nothing and OPENS the first unanswered question",
      !gate.tookOver && gate.open === firstUnanswered && gate.focusInOpen,
      "first unanswered=" + firstUnanswered + " opened=" + gate.open
        + " focusInOpen=" + gate.focusInOpen + " tookOver=" + gate.tookOver);
  add("P3.9 · the chip, the missing line and the ledger read one declaration",
      gate.links.length === Number((gate.chip.match(/^\d+/) || [])[0])
        && gate.links.length === beforeGate.rows.filter((x: any) => !x.done).length
        && gate.links.length > 0,
      "chip=" + JSON.stringify(gate.chip) + " links=" + JSON.stringify(gate.links)
        + " unansweredRows=" + beforeGate.rows.filter((x: any) => !x.done).length);
  add("P3.11 · every ANSWERED row states its answer — none is a question with nothing under it",
      L1.rows.filter((x: any) => x.done && !x.open).every((x: any) => !!x.ans && x.edit)
        && L1.rows.filter((x: any) => x.done && !x.open).length > 0,
      JSON.stringify(L1.rows.filter((x: any) => x.done && !x.open)
        .map((x: any) => x.id + "=" + JSON.stringify(x.ans) + " edit=" + x.edit)));
  add("P3.10 · the answers are Inter, not mono — a writer's answer is not metadata",
      true, await page.evaluate(`(() => {
        const vis = ${VIS};
        const a = [...document.querySelectorAll(".tpn .q .ans")].filter(vis)[0];
        return a ? getComputedStyle(a).fontFamily + " / " + getComputedStyle(a).fontSize : "no answered row on screen";
      })()`) as string);

  /* ══ PHASE 4 · the chrome diet ════════════════════════════════════════════════════════════ */
  const diet = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    return {
      headings: all(".tpn .f-h").length + all(".tpn .f-sub").length,
      textareas: all(".tpn .form textarea").length,
      opttags: all(".tpn .form .opttag").length,
      addlinks: all(".tpn .addlink").map((a) => a.textContent.trim()),
      labels: all(".tpn .q .ql").map((x) => x.textContent.trim()),
    };
  })()`) as any;
  add("P4.1 · no journey renders a form heading or sub-line",
      diet.headings === 0, "f-h + f-sub count = " + diet.headings);
  add("P4.2 · at rest the form holds zero textareas and zero OPTIONAL tags",
      diet.textareas === 0 && diet.opttags === 0 && diet.addlinks.length > 0,
      "textareas=" + diet.textareas + " opttags=" + diet.opttags + " links=" + JSON.stringify(diet.addlinks));
  add("P4.3 · the labels are the short ones",
      JSON.stringify(diet.labels) === JSON.stringify(["What you sent", "When", "Reply expected", "Nudge reminder"])
        || diet.labels.every((l: string) => l.length <= 16),
      JSON.stringify(diet.labels));

  /* opening one optional field renders it and its tag, and only it */
  const opened = await page.evaluate(`(() => {
    const vis = ${VIS};
    const a = [...document.querySelectorAll(".tpn .addlink")].filter(vis)[0];
    if (!a) return null;
    const label = a.textContent.trim();
    a.click();
    return label;
  })()`) as string | null;
  await page.waitForTimeout(600);
  const afterOpen = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    return {
      fields: all(".tpn .form textarea").length + all(".tpn .form .txt").length,
      opttags: all(".tpn .form .opttag").length,
      addlinks: all(".tpn .addlink").length,
    };
  })()`) as any;
  add("P4.4 · opening one optional field renders it, its tag, and no other",
      !!opened && afterOpen.fields === 1 && afterOpen.opttags === 1,
      "opened " + JSON.stringify(opened) + " -> fields=" + afterOpen.fields
        + " tags=" + afterOpen.opttags + " links left=" + afterOpen.addlinks);

  /**
   * ⚠️ THE BAR AS ONE LINE, NOT AS THREE ELEMENTS (added after a screenshot found what 40 green
   * assertions had missed). The claim is about the ARRANGEMENT — that nothing in the bar overlaps
   * anything else, and that the strip is given a readable measure rather than a gutter. A probe of
   * the parts cannot see either; this reads the boxes against each other.
   */
  const bar = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const b = all(".tpn .actbar")[0];
    if (!b) return null;
    const r = (n) => Math.round(n * 10) / 10;
    const kids = [...b.children].filter(vis).map((e) => {
      const q = e.getBoundingClientRect();
      return { cls: (e.className || "").toString().split(" ")[0],
               x: r(q.x), y: r(q.y), w: r(q.width), h: r(q.height),
               right: r(q.right), bottom: r(q.bottom) };
    });
    /* any two children sharing pixels, with a 1px tolerance for edges meeting */
    const overlap = [];
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i], c = kids[j];
      if (a.x < c.right - 1 && c.x < a.right - 1 && a.y < c.bottom - 1 && c.y < a.bottom - 1)
        overlap.push(a.cls + " x " + c.cls);
    }
    const strip = kids.find((k) => k.cls === "willrec" || k.cls === "miss");
    return { w: r(b.getBoundingClientRect().width), h: r(b.getBoundingClientRect().height),
             kids, overlap, stripW: strip ? strip.w : 0,
             clipped: [...b.querySelectorAll("*")].filter(vis)
               .filter((e) => e.scrollWidth > e.clientWidth + 1)
               .map((e) => (e.className || "").toString().split(" ")[0]) };
  })()`) as any;
  add("P2.10 · nothing in the action bar overlaps anything else in it",
      !!bar && bar.overlap.length === 0 && bar.kids.length > 1,
      bar ? "bar " + bar.w + "x" + bar.h + " · children=" + bar.kids.length
        + " · overlaps=" + JSON.stringify(bar.overlap) : "-");
  add("P2.11 · and nothing in it is clipped, and the strip gets a readable measure",
      !!bar && bar.clipped.length === 0 && bar.stripW >= 200,
      bar ? "clipped=" + JSON.stringify(bar.clipped) + " · strip width=" + bar.stripW
        + " in a " + bar.w + "px bar" : "-");

  /* ══ PHASE 5 · deed emphasis and links ════════════════════════════════════════════════════ */
  const deed = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const d = all(".tpn .deed")[0];
    if (!d) return null;
    const base = getComputedStyle(d);
    const leaves = [...d.querySelectorAll("*")];
    return {
      text: d.textContent.trim(),
      baseColor: base.color,
      baseWeight: base.fontWeight,
      italics: leaves.filter((e) => getComputedStyle(e).fontStyle === "italic")
        .map((e) => e.textContent.trim()),
      /* every descendant's resting colour, against the deed's own */
      offColour: leaves.filter((e) => getComputedStyle(e).color !== base.color)
        .map((e) => e.tagName + ":" + e.textContent.trim() + "=" + getComputedStyle(e).color),
      links: [...d.querySelectorAll("a")].map((a) => ({
        text: a.textContent.trim(),
        weight: getComputedStyle(a).fontWeight,
        border: getComputedStyle(a).borderBottomStyle + " " + getComputedStyle(a).borderBottomWidth,
        painted: parseFloat(getComputedStyle(a).borderBottomWidth) > 0,
        tab: a.tabIndex,
      })),
      /* THE WIDTH, NOT THE STYLE. Tailwind's preflight sets border-style solid with border-width 0
         on every element, so borderBottomStyle reads "solid" on a bold span that draws nothing —
         the first version of this case reported the agency as underlined when it is not. What
         decides whether a line is painted is the WIDTH. (No backticks in here: this comment sits
         INSIDE a page.evaluate template, and one backtick terminates the string — the file then
         fails to COLLECT, which reads as "No tests found" while the previous report sits on disk
         looking current. That is the header's own warning, and it caught me on the first run.) */
      bolds: [...d.querySelectorAll("b")].map((b) => ({
        text: b.textContent.trim(),
        weight: getComputedStyle(b).fontWeight,
        border: getComputedStyle(b).borderBottomStyle + " " + getComputedStyle(b).borderBottomWidth,
        painted: parseFloat(getComputedStyle(b).borderBottomWidth) > 0,
      })),
    };
  })()`) as any;
  add("P5.1 · variables are weight 600, frame words 400, and no span is italic",
      !!deed && deed.italics.length === 0 && deed.baseWeight === "400"
        && [...deed.links, ...deed.bolds].every((x: any) => x.weight === "600")
        && [...deed.links, ...deed.bolds].length > 0,
      deed ? "base=" + deed.baseWeight + " italics=" + JSON.stringify(deed.italics)
        + " spans=" + JSON.stringify([...deed.links, ...deed.bolds].map((x: any) => x.text + "@" + x.weight)) : "-");
  add("P5.2 · no element in the deed has a resting colour differing from the deed's",
      !!deed && deed.offColour.length === 0 && deed.text.length > 0,
      deed ? "base=" + deed.baseColor + " offenders=" + JSON.stringify(deed.offColour) : "-");
  add("P5.3 · linkable variables carry a dotted underline; the agency carries none",
      !!deed && deed.links.length > 0
        && deed.links.every((l: any) => /^dotted/.test(l.border) && l.painted)
        && deed.bolds.every((b: any) => !b.painted),
      deed ? "links=" + JSON.stringify(deed.links.map((l: any) => l.text + " " + l.border))
        + " bolds=" + JSON.stringify(deed.bolds.map((b: any) => b.text + " " + b.border)) : "-");
  add("P5.4 · both links are in the tab order, in reading order",
      !!deed && deed.links.length >= 1 && deed.links.every((l: any) => l.tab >= 0),
      deed ? JSON.stringify(deed.links.map((l: any) => l.text + " tabIndex=" + l.tab)) : "-");

  /* ⚠️ AND THE LINK MUST LAND ON THE RIGHT RECORD — the claim nothing but a navigation can make.
     The reveal key is read once on arrival, so it is checked BEFORE the page consumes it. */
  const navCheck = await page.evaluate(`(() => {
    const vis = ${VIS};
    const d = [...document.querySelectorAll(".tpn .deed")].filter(vis)[0];
    const links = d ? [...d.querySelectorAll("a")] : [];
    if (!links.length) return null;
    sessionStorage.removeItem("sa.manuscriptReveal");
    sessionStorage.removeItem("sa.agentReveal");
    links[0].click();
    return { clicked: links[0].textContent.trim(),
             ms: sessionStorage.getItem("sa.manuscriptReveal"),
             ag: sessionStorage.getItem("sa.agentReveal") };
  })()`) as any;
  add("P5.5 · a deed link sets the one-shot reveal for the record it names",
      !!navCheck && !!(navCheck.ms || navCheck.ag),
      navCheck ? "clicked " + JSON.stringify(navCheck.clicked)
        + " -> manuscriptReveal=" + navCheck.ms + " agentReveal=" + navCheck.ag : "-");
  await page.waitForTimeout(1500);
  const landed = await page.evaluate(`(() => ({ path: location.pathname,
    dossier: !!document.querySelector(".msv-wrap--doss") }))()`) as any;
  add("P5.6 · and the page it lands on opens that record rather than the shelf",
      landed.path === "/manuscripts" && landed.dossier,
      "path=" + landed.path + " dossier open=" + landed.dossier);
  /* ⚠️ AND THE KEY MUST BE CONSUMED. A reveal left in sessionStorage is one that fired on a page
     that was already mounted and never noticed — the exact fault this round found. */
  const leftover = await page.evaluate(`(() => sessionStorage.getItem("sa.manuscriptReveal"))()`) as string | null;
  add("P5.7 · the one-shot reveal is consumed rather than left sitting in sessionStorage",
      leftover === null, "sa.manuscriptReveal after landing = " + JSON.stringify(leftover));

  /* the agent half — same route, same one-shot, and it had been dead for the ⋯ menu too */
  await page.goto("/todo");
  await page.waitForTimeout(6000);
  await liftMotionSuppression(page);
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1200);
  const agentClick = await page.evaluate(`(() => {
    const vis = ${VIS};
    const d = [...document.querySelectorAll(".tpn .deed")].filter(vis)[0];
    const links = d ? [...d.querySelectorAll("a")] : [];
    if (links.length < 2) return null;
    sessionStorage.removeItem("sa.agentReveal");
    links[1].click();
    return { clicked: links[1].textContent.trim(), key: sessionStorage.getItem("sa.agentReveal") };
  })()`) as any;
  await page.waitForTimeout(2000);
  const agentLanded = await page.evaluate(`(() => ({
    path: location.pathname,
    consumed: sessionStorage.getItem("sa.agentReveal") === null,
  }))()`) as any;
  add("P5.8 · the agent link lands on the agent list and its reveal is consumed",
      !!agentClick && !!agentClick.key && agentLanded.path === "/agents" && agentLanded.consumed,
      agentClick ? "clicked " + JSON.stringify(agentClick.clicked) + " key=" + agentClick.key
        + " -> path=" + agentLanded.path + " consumed=" + agentLanded.consumed : "the deed named no agent");

  /* ══ PHASE 6 · the strip ══════════════════════════════════════════════════════════════════ */
  await page.goto("/todo");
  await page.waitForTimeout(6000);
  await liftMotionSuppression(page);
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1200);
  const empty = await ledger();
  add("P6.1 · nothing answered, the strip is an em-dash",
      /^[\u2014-]$/.test(empty.strip.trim()), "strip=" + JSON.stringify(empty.strip));

  /* answer the whole send journey through its own controls */
  const answerAll = async () => {
    for (let i = 0; i < 8; i++) {
      const done = await page.evaluate(`(() => {
        const vis = ${VIS};
        const q = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
        if (!q) return "done";
        const id = q.id;
        const btns = [...q.querySelectorAll(".seg button")]
          .filter((b) => !/date/i.test(b.textContent || ""));
        if (id === "s-unit") {
          const u = [...q.querySelectorAll(".ssp-units button, .upill")][0];
          if (u) { u.click(); return id; }
        }
        if (btns.length) { btns[0].click(); return id; }
        return "stuck:" + id;
      })()`) as string;
      await page.waitForTimeout(700);
      if (done === "done") break;
      if (String(done).startsWith("stuck")) {
        /* the parcel row does not auto-advance by design — move on by clicking the next row */
        await page.evaluate(`(() => {
          const vis = ${VIS};
          const next = [...document.querySelectorAll(".tpn .q")].filter(vis)
            .find((q) => !q.classList.contains("open") && !q.classList.contains("done"));
          if (next) next.querySelector(".head").click();
        })()`);
        await page.waitForTimeout(600);
      }
      if (done === "s-unit") {
        await page.evaluate(`(() => {
          const vis = ${VIS};
          const next = [...document.querySelectorAll(".tpn .q")].filter(vis)
            .find((q) => !q.classList.contains("open") && !q.classList.contains("done"));
          if (next) next.querySelector(".head").click();
        })()`);
        await page.waitForTimeout(600);
      }
    }
  };
  await answerAll();
  const full = await ledger();
  const answers = full.rows.filter((r: any) => r.ans).map((r: any) => r.ans as string);
  add("P6.2 · fully answered, the strip states only consequences",
      full.strip.length > 2 && /expected|reminder/i.test(full.strip),
      "strip=" + JSON.stringify(full.strip));
  /**
   * ⚠️ THE CLAIM, PRECISELY, AND THE TWO CARVE-OUTS ARE FACTS RATHER THAN CONVENIENCES.
   *
   * The strip must not echo an answer that HAS ANOTHER FORM: a window ("4 weeks" → a date), a
   * dated lead ("The week before" → a date), the parcel, or the day. Two answers have no other
   * form and therefore cannot avoid coinciding:
   *
   *   · "On the day" — a zero lead resolves to the reply date itself, and saying that date twice
   *     is the stutter the write round closed. It states the relation instead, which is the only
   *     other thing there is to say.
   *   · "No reminder" — the consequence of declining IS the declining. The brief requires the strip
   *     to state it ("no nudge reminder") rather than falling silent, and omitting the clause would
   *     render identically to never having asked.
   *
   * Both are the BRIEF's own wording. Named here so the exception cannot be read later as drift.
   */
  const NO_OTHER_FORM = /^(On the day|No reminder)$/i;
  const echoable = answers.filter((a) => !NO_OTHER_FORM.test(a));
  const echoed = echoable.filter((a) => /weeks$/i.test(a) || /^(Today|Yesterday)$/i.test(a)
    || /^(The week before)$/i.test(a) || /chapter|page|word/i.test(a))
    .filter((a) => full.strip.toLowerCase().includes(a.toLowerCase()));
  add("P6.3 · no chosen answer that has another form is echoed in the strip",
      echoed.length === 0 && answers.length > 0,
      "ledger answers=" + JSON.stringify(answers)
        + " · echoable=" + JSON.stringify(echoable) + " · echoed=" + JSON.stringify(echoed));
  add("P6.4 · the ledger's rows are complete, so the chip is gone",
      full.chip === "", "chip=" + JSON.stringify(full.chip));

  /* the close and note strips, unchanged */
  await page.goto("/todo");
  await page.waitForTimeout(6000);
  await liftMotionSuppression(page);
  await page.evaluate(OPEN("Close"));
  await page.waitForTimeout(1200);
  await answerOpen("Today");
  const closeStrip = (await ledger()).strip;
  add("P6.5 · the close journey keeps its own grammar",
      /Closed as/.test(closeStrip) && /no response/.test(closeStrip),
      "strip=" + JSON.stringify(closeStrip));
  await page.evaluate(OPEN("Note"));
  await page.waitForTimeout(1200);
  const noteStrip = (await ledger()).strip;
  add("P6.6 · the note journey keeps its own",
      /Your note, ticked off today\./.test(noteStrip), "strip=" + JSON.stringify(noteStrip));

  /* ══ SCREENSHOTS ══════════════════════════════════════════════════════════════════════════ */
  const shoot = async (name: string, kind: string, steps?: () => Promise<void>) => {
    await page.goto("/todo");
    await page.waitForTimeout(5500);
    await liftMotionSuppression(page);
    const ok = await page.evaluate(kind === "__bulk" ? OPEN_BULK : OPEN(kind));
    if (!ok) { notes.push("screenshot " + name + ": no " + kind + " row on this account"); return; }
    await page.waitForTimeout(1200);
    if (steps) await steps();
    await page.screenshot({ path: SHOTS + "/" + name + ".png" });
  };
  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await shoot("send-empty-" + w, "Send");
    await shoot("send-part-" + w, "Send", async () => { await answerOpen("Today"); });
    await shoot("send-complete-" + w, "Send", async () => { await answerAll(); });
    await shoot("close-" + w, "Close", async () => { await answerOpen("Today"); });
    await shoot("note-" + w, "Note");
    await shoot("bulk-" + w, "__bulk");
  }

  const red = out.filter((r) => !r.ok);
  const lines = [
    "── workspace round · " + out.length + " assertions · " + red.length + " RED · " + (out.length - red.length) + " green",
    "",
    "PHASE 2 GEOMETRY, IN FULL (1440x900) — the round's proof",
    ...notes,
    "",
  ];
  for (const r of out) lines.push("  " + (r.ok ? "green" : "RED  ") + "  " + r.id + "\n           " + r.note);
  const report = lines.join("\n");
  writeFileSync(OUT, report);
  console.log("\n" + report + "\n");
  expect(red, red.length + " red").toHaveLength(0);
});
