/**
 * THE FINISHING ROUND — phases 1–6, measured on the page.
 *
 * ⚠️ NO BACKTICKS AND NO BACKSLASH ESCAPES INSIDE ANY `page.evaluate` TEMPLATE BELOW. A backtick
 * inside one — even inside a comment — terminates the string, and the file then fails to COLLECT
 * rather than failing loudly: Playwright says "No tests found" and the PREVIOUS run's report is
 * still on disk looking current. That has produced confident reports of results nobody measured
 * three times in this sequence. A backslash escape does not survive either: a diagnostic slice came
 * back with every "s" replaced by a space because /\s+/g reached the browser as /s+/g.
 *
 * ⚠️ AND THE REPORT IS UNLINKED AT MODULE SCOPE. A run that dies in SETUP never reaches the test
 * body, which is precisely the failure that leaves a stale file behind.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_FR_OUT ?? "run-artifacts/finish-round.txt";
rmSync(OUT, { force: true });

const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

/** open the first row whose pill reads `kind`; false when the account has none */
const OPEN = (kind: string) => `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === ${JSON.stringify(kind)});
  if (!row) return false;
  row.click();
  return true;
})()`;

/**
 * ⚠️ BOTH FIX VARIANTS WEAR THE SAME PILL, so a probe that opens "the Fix row" opens whichever
 * comes first — and on the harness account that is the SINGLE fill-in, which has a query behind it
 * and therefore a story card. Reading it as the bulk journey made a correct three-card pane look
 * like a bulk pane with a card too many. The bulk one is identified by its own sub-line.
 */
const OPEN_BULK = `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => /imported queries are missing their materials/.test((r.querySelector(".r-meta") || {}).textContent || ""));
  if (!row) return false;
  row.click();
  return true;
})()`;

test("finishing round", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(7000);

  /* ── a journey's shape, read once per kind ────────────────────────────────────────────── */
  const shapeOf = async (kind: string) => {
    const opened = await page.evaluate(kind === "__bulk" ? OPEN_BULK : OPEN(kind));
    if (!opened) return null;
    await page.waitForTimeout(1200);
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const all = (s) => [...document.querySelectorAll(s)].filter(vis);
      const pane = all(".tpn .pane")[0];
      if (!pane) return null;
      const cs = (e) => getComputedStyle(e);

      /* every scrolling box inside the pane — the mid must be the only one */
      const scrollers = [...pane.querySelectorAll("*")].filter(vis).filter((e) => {
        const o = cs(e).overflowY;
        return (o === "auto" || o === "scroll") && e.scrollHeight > e.clientHeight + 1;
      }).map((e) => e.className.toString().split(" ")[0]);

      const rims = all(".tpn .rim");
      const band = all(".tpn .band")[0];
      const mid = all(".tpn .mid")[0];
      const form = all(".tpn .formcol .fc")[0];
      const story = all(".tpn .storycol .fc")[0];
      const bar = all(".tpn .actbar")[0];

      /* ⚠️ THE TINT IS SAMPLED AT THE BAND'S FOUR CORNERS, INSET, AND THE RECT IS PROVED ON SCREEN
         FIRST. elementsFromPoint outside the viewport returns an EMPTY ARRAY, so a probe that does
         not check would be satisfied by undefined. */
      let corners = null;
      if (band) {
        const r = band.getBoundingClientRect();
        const onScreen = r.top >= 0 && r.left >= 0
          && r.bottom <= innerHeight && r.right <= innerWidth;
        if (onScreen) {
          const pts = [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4],
                       [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4]];
          corners = { onScreen: true, hits: pts.map(([x, y]) =>
            document.elementsFromPoint(x, y).includes(band) ? 1 : 0) };
        } else {
          corners = { onScreen: false, hits: [] };
        }
      }

      const minH = [form, story].filter(Boolean).map((e) => cs(e).minHeight);

      return {
        rims: rims.length,
        scrollers,
        rimOverflow: rims.length ? cs(rims[0]).overflow : "",
        paneBg: cs(pane).backgroundColor,
        paneGap: cs(pane).gap,
        midAlign: mid ? cs(mid).alignItems : "",
        corners,
        minH,
        formH: form ? Math.round(form.getBoundingClientRect().height) : 0,
        midH: mid ? Math.round(mid.getBoundingClientRect().height) : 0,
        barBottom: bar ? Math.round(bar.getBoundingClientRect().bottom) : 0,
        paneBottom: Math.round(pane.getBoundingClientRect().bottom),
        /* every chosen option in the form, at rest */
        onCount: all(".tpn .formcol .on").length,
        will: (all(".tpn .willrec")[0] || {}).textContent || "",
        prim: (all(".tpn .actbar .ab.go")[0] || {}).textContent || "",
        primDisabled: !!(all(".tpn .actbar .ab.go")[0] || {}).disabled,
        optTags: all(".tpn .opttag").length,
        stars: ((all(".tpn .formcol")[0] || {}).textContent || "").indexOf("*"),
        whenSeg: all(".tpn .formcol .seg").length,
        text: ((all(".tpn .formcol")[0] || {}).textContent || "").replace(/[ ]+/g, " "),
        /* the WHOLE pane, for claims about what appears once anywhere in it */
        paneText: (pane.textContent || "").replace(/[ ]+/g, " "),
      };
    })()`) as any;
  };

  const send = await shapeOf("Send");
  const close = await shapeOf("Close");
  const note = await shapeOf("Note");
  const bulk = await shapeOf("__bulk");

  /* ══ PHASE 1 · three cards inside the pane ═══════════════════════════════════════════════ */
  add("P1.1 · a query journey draws three rim cards; bulk and note draw two",
      !!send && send.rims === 3 && !!close && close.rims === 3
        && !!note && note.rims === 2 && !!bulk && bulk.rims === 2,
      `send=${send?.rims} close=${close?.rims} note=${note?.rims} bulk=${bulk?.rims}`);
  add("P1.2 · the pane column is transparent on the ground, gap 12",
      !!send && /rgba\(0, 0, 0, 0\)|transparent/.test(send.paneBg) && send.paneGap === "12px",
      send ? `bg=${send.paneBg} gap=${send.paneGap}` : "-");
  add("P1.3 · the band tint reaches all four corners inside the rim, which clips",
      !!send && !!send.corners && send.corners.onScreen
        && send.corners.hits.length === 4 && send.corners.hits.every((h: number) => h === 1)
        && send.rimOverflow === "hidden",
      send?.corners ? `onScreen=${send.corners.onScreen} hits=${JSON.stringify(send.corners.hits)} rimOverflow=${send.rimOverflow}` : "-");
  /* ⚠️ P1.4, P2.1, P2.4 AND P4.5 ARE GREEN BEFORE, AND DELIBERATELY SO — they are REGRESSION
     GUARDS, not new claims. The previous round established each; this round rebuilds the chassis
     underneath them, and the point is that they survive it. They are recorded as green-before in
     the baseline rather than quietly counted as wins. */
  add("P1.4 · the mid is the only scrolling box in the pane",
      !!send && send.scrollers.length === 1 && send.scrollers[0] === "mid",
      send ? JSON.stringify(send.scrollers) : "-");

  /* ══ PHASE 2 · cards hug their content ═══════════════════════════════════════════════════ */
  add("P2.1 · the mid aligns its cards to the start, so they hug rather than stretch",
      !!send && send.midAlign === "flex-start", send ? `align-items=${send.midAlign}` : "-");
  /* ⚠️ THE CARDS MUST EXIST BEFORE THEIR HEIGHTS MEAN ANYTHING. This read `minH.every(...)` over an
     array that is EMPTY until Phase 1 builds the cards, and `[].every()` is true — so it went green
     before a single card existed. The documented liar, caught in its own baseline. */
  add("P2.2 · no card in the pane declares a minimum height",
      !!send && send.minH.length === 2 && !!note && note.minH.length >= 1
        && [...send.minH, ...note.minH].every((v: string) => v === "0px" || v === "auto"),
      `send=${JSON.stringify(send?.minH)} note=${JSON.stringify(note?.minH)}`);
  add("P2.3 · a note's form card is content-driven; Send's is taller",
      !!note && !!send && note.midH > 0 && note.formH / note.midH < 0.6 && send.formH > note.formH,
      note && send ? `note ${note.formH}/${note.midH} = ${(note.formH / note.midH).toFixed(2)} · send ${send.formH}` : "-");
  add("P2.4 · the action bar stays at the pane's foot on the shortest journey",
      !!note && Math.abs(note.barBottom - note.paneBottom) <= 2,
      note ? `bar=${note.barBottom} pane=${note.paneBottom}` : "-");

  /* ══ PHASE 3 · choices are made, not inherited ═══════════════════════════════════════════ */
  add("P3.1 · no option is pre-selected on first render, on any journey",
      [send, close, note, bulk].every((j) => !!j && j.onCount === 0),
      `send=${send?.onCount} close=${close?.onCount} note=${note?.onCount} bulk=${bulk?.onCount}`);
  add("P3.2 · the strip starts at an em dash and states nothing unchosen",
      !!send && /Will record:\s*—/i.test(send.will)
        && !/today|weeks|chapters|pages|words/i.test(send.will),
      send ? `will="${send.will}"` : "-");
  add("P3.3 · the agent's stated window is shown, not chosen",
      !!send && /their stated window is/i.test(send.text),
      send ? (/their stated window/i.test(send.text) ? "present" : "missing") : "-");
  add("P3.4 · expect-back offers Another date",
      !!send && (send.text.match(/Another date/g) || []).length >= 2,
      send ? `occurrences=${(send.text.match(/Another date/g) || []).length}` : "-");

  /* ⚠️ THE STRIP GROWS WITH CHOICES, MEASURED BY MAKING THEM. "Starts at an em dash" is only half
     the claim; the half that matters is that each answer ARRIVES in the strip and nothing else
     does. Clicked, not simulated. */
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1200);
  const grew = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const strip = () => (all(".tpn .willrec")[0] || {}).textContent || "";
    const before = strip();
    const hit = (sel, label) => {
      const b = all(sel).find((x) => (x.textContent || "").trim() === label);
      if (b) b.click();
      return !!b;
    };
    const okDay = hit(".tpn .formcol .seg button", "Today");
    return { before, okDay };
  })()`) as any;
  await page.waitForTimeout(600);
  const afterDay = await page.evaluate(`(() => {
    const vis = ${VIS};
    const s = ([...document.querySelectorAll(".tpn .willrec")].filter(vis)[0] || {}).textContent || "";
    const another = [...document.querySelectorAll(".tpn .formcol .seg button")].filter(vis)
      .filter((b) => (b.textContent || "").trim() === "Another date…").length;
    return { strip: s, another };
  })()`) as any;
  add("P3.5 · the strip grows with a choice, and only with it",
      !!grew && grew.okDay && !!afterDay && /today/i.test(afterDay.strip)
        && !/reply expected|nudge/i.test(afterDay.strip),
      afterDay ? `"${grew?.before}" → "${afterDay.strip}"` : "-");
  add("P3.6 · Another date is offered on BOTH When and expect-back, one picker between them",
      !!afterDay && afterDay.another === 2,
      afterDay ? `occurrences=${afterDay.another}` : "-");

  /* ══ PHASE 4 · gated primaries ═══════════════════════════════════════════════════════════ */
  add("P4.1 · the primaries are the owner's override wording",
      !!send && /Log as sent/.test(send.prim) && !!close && /Log the close/.test(close.prim)
        && !!note && /Tick it off/.test(note.prim) && !!bulk && /Log \d+ queries/.test(bulk.prim),
      `send="${send?.prim}" close="${close?.prim}" note="${note?.prim}" bulk="${bulk?.prim}"`);
  add("P4.2 · no asterisk marks a required field anywhere in the pane",
      [send, close, note, bulk].every((j) => !!j && j.stars === -1),
      `first * at: send=${send?.stars} close=${close?.stars} note=${note?.stars} bulk=${bulk?.stars}`);
  add("P4.3 · exactly one OPTIONAL tag on each journey that has an optional field",
      !!send && send.optTags === 1 && !!close && close.optTags === 1 && !!note && note.optTags === 1
        && !!bulk && bulk.optTags === 1,
      `send=${send?.optTags} close=${close?.optTags} note=${note?.optTags} bulk=${bulk?.optTags}`);
  add("P4.4 · bulk is the stated exception — inert at zero, with its count showing",
      !!bulk && bulk.primDisabled && /Log 0 queries/.test(bulk.prim),
      bulk ? `disabled=${bulk.primDisabled} prim="${bulk.prim}"` : "-");
  add("P4.5 · every other primary stays clickable while incomplete",
      !!send && !send.primDisabled && !!close && !close.primDisabled && !!note && !note.primDisabled,
      `send=${send?.primDisabled} close=${close?.primDisabled} note=${note?.primDisabled}`);

  /* an incomplete click must WRITE NOTHING and land focus on the first missing field */
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1200);
  const gate = await page.evaluate(`(() => {
    const vis = ${VIS};
    const mid = [...document.querySelectorAll(".tpn .mid")].filter(vis)[0];
    const go = [...document.querySelectorAll(".tpn .actbar .ab.go")].filter(vis)[0];
    if (!mid || !go) return null;
    const before = mid.scrollTop;
    go.click();
    return { before };
  })()`) as any;
  await page.waitForTimeout(900);
  /* ⚠️ THE CLICK MAY NAVIGATE, AND THAT IS THE RED ANSWER RATHER THAN A CRASH. Before the gate
     exists the primary opens the takeover, which tears down the execution context — Playwright
     throws "Execution context was destroyed" and the whole run dies with no report. Catching it
     and recording it as "the click went through" is what lets this assertion be RED before it is
     green, which is the whole point of a baseline. */
  const gated = await page.evaluate(`(() => {
    const vis = ${VIS};
    const mid = [...document.querySelectorAll(".tpn .mid")].filter(vis)[0];
    const a = document.activeElement;
    return {
      after: mid ? mid.scrollTop : -1,
      active: a ? (a.className.toString() || a.tagName) : "none",
      inPane: !!(a && a.closest && a.closest(".tpn .formcol")),
      /* the takeover would have opened if the click had committed */
      tookOver: !!document.querySelector(".ff-wrap, .focusflow, [data-focusflow]"),
    };
  })()`).catch(() => ({ after: -1, active: "context destroyed", inPane: false, tookOver: true })) as any;
  add("P4.6 · an incomplete click writes nothing and lands focus in the form",
      !!gate && !!gated && !gated.tookOver && gated.inPane,
      gated ? `scrollTop ${gate?.before}→${gated.after} · active=${gated.active} inPane=${gated.inPane} tookOver=${gated.tookOver}` : "-");

  /* ══ PHASE 5 · the note journey ══════════════════════════════════════════════════════════ */
  /* ⚠️ COUNTED ACROSS THE WHOLE PANE, NOT THE FORM COLUMN. Scoped to `.formcol` this returned 1 and
     went green while the sentence was ALSO in the band sub-line — the duplicate the brief is about.
     A false green is the direction that costs: it would have passed for the life of the fault. */
  add("P5.1 · the finishing sentence appears exactly once in the pane, total",
      !!note && (note.paneText.match(/ticking it off is what finishes it/gi) || []).length === 1,
      note ? `count=${(note.paneText.match(/ticking it off is what finishes it/gi) || []).length}` : "-");
  add("P5.2 · a note has no When segment",
      !!note && note.whenSeg === 0 && !/\bWhen\b/.test(note.text),
      note ? `segs=${note.whenSeg}` : "-");
  const caveat = await (async () => {
    const opened = await page.evaluate(OPEN("Note"));
    if (!opened) return null;
    await page.waitForTimeout(1000);
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const el = [...document.querySelectorAll(".tpn .formcol .notetext")].filter(vis)[0];
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { size: cs.fontSize, family: cs.fontFamily };
    })()`) as any;
  })();
  add("P5.3 · the note's own words are the centrepiece, Caveat at 26px",
      !!caveat && caveat.size === "26px" && /Caveat/i.test(caveat.family),
      caveat ? `${caveat.size} ${caveat.family}` : "no .notetext on the note journey");

  /* ══ PHASE 6 · the bulk table ════════════════════════════════════════════════════════════ */
  const table = await (async () => {
    const opened = await page.evaluate(OPEN_BULK);
    if (!opened) return null;
    await page.waitForTimeout(1400);
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const all = (s) => [...document.querySelectorAll(s)].filter(vis);
      const rows = all(".tpn .bulkrow");
      const heads = all(".tpn .bulkhead th, .tpn .bulk th").map((e) => (e.textContent || "").trim());
      const sent = rows.map((r) => {
        const c = r.querySelector(".bulk-sent");
        return c ? (c.getAttribute("data-ms") || "") : "";
      });
      return {
        rows: rows.length,
        heads,
        sent,
        showAll: all(".tpn .bulk-showall").length,
        fills: all(".tpn .bulk-fill button").map((b) => (b.textContent || "").trim()),
        caveat: (all(".tpn .formcol")[0] || {}).textContent || "",
        bandSub: ((all(".tpn .b-sub")[0] || {}).textContent || "").trim(),
        dismissAll: all(".tpn .actbar button").map((b) => (b.textContent || "").trim()),
      };
    })()`) as any;
  })();
  add("P6.1 · the bulk table renders one row per query, five visible with the rest folded",
      !!table && table.rows === 5 && table.showAll === 1,
      table ? `rows=${table.rows} showAll=${table.showAll}` : "no bulk table");
  add("P6.2 · its columns are the contract's six",
      !!table && ["Agent", "Sent", "Covering letter", "Synopsis", "Opening sample", "Something else"]
        .every((h) => table.heads.some((x: string) => x.startsWith(h))),
      table ? JSON.stringify(table.heads) : "-");
  add("P6.3 · rows are ordered oldest sent first",
      !!table && table.sent.filter(Boolean).length > 1
        && table.sent.filter(Boolean).every((v: string, i: number, a: string[]) => i === 0 || Number(a[i - 1]) <= Number(v)),
      table ? JSON.stringify(table.sent) : "-");
  add("P6.4 · both fill actions are offered, with the requirements caveat verbatim",
      !!table && table.fills.some((f: string) => /Start from what each agent asks for/.test(f))
        && table.fills.some((f: string) => /Copy the first row down/.test(f))
        && /Requirements are what the agent asks for — not proof of what you sent\./.test(table.caveat),
      table ? JSON.stringify(table.fills) : "-");
  add("P6.5 · the band states the full sub-line, and the truncated one is unreproducible",
      !!table && /imported queries are missing their materials/.test(table.bandSub)
        && /from your import on/.test(table.bandSub)
        && !/^A gap on the record for/.test(table.bandSub),
      table ? `sub="${table.bandSub}"` : "-");
  add("P6.6 · the bar offers Dismiss all beside the counted primary",
      !!table && table.dismissAll.some((b: string) => /Dismiss all/.test(b)),
      table ? JSON.stringify(table.dismissAll) : "-");

  const red = out.filter((r) => !r.ok);
  const lines = [`── finishing round · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(OUT, report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
