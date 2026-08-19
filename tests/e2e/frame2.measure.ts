/**
 * FRAME PARITY, COUNTS, PANE PRESENCE, COPY, TYPE SCALE.
 *
 * ⚠️ CROSS-PAGE ASSERTIONS ASK BOTH PAGES IN ONE RUN. A remembered figure for `/queries` goes stale
 * the day its gutters move; asking both in the same session cannot.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

const FRAME = (cardSel: string) => `(() => {
  const vis = ${VIS};
  const one = (s) => [...document.querySelectorAll(s)].find(vis);
  const scroll = one(".wpg-scroll"), card = one(${JSON.stringify(cardSel)});
  if (!scroll || !card) return null;
  const sc = getComputedStyle(scroll);
  const r = card.getBoundingClientRect();
  const title = one(".wsh-title");
  return {
    scrollPad: [sc.paddingTop, sc.paddingRight, sc.paddingBottom, sc.paddingLeft]
      .map((p) => Math.round(parseFloat(p))).join("/"),
    cardLeft: Math.round(r.left),
    fromBottom: Math.round(window.innerHeight - r.bottom),
    titleSize: title ? parseFloat(getComputedStyle(title).fontSize) : -1,
  };
})()`;

test("frame2", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  await ensureSignedIn(page);

  /* ══ PHASE 1 · frame parity ══════════════════════════════════════════════════════════════ */
  for (const [w, h] of [[1440, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/queries"); await page.waitForTimeout(6500);
    const q = await page.evaluate(FRAME(".f12-list")) as any;
    await page.goto("/todo"); await page.waitForTimeout(6500);
    const t = await page.evaluate(FRAME(".tlc")) as any;
    if (!q || !t) { add(`P1 ${w} · both pages measurable`, false, `queries=${!!q} todo=${!!t}`); continue; }

    add(`P1.1 ${w} · equal scroll-row padding, all four sides`,
        q.scrollPad === t.scrollPad, `queries=${q.scrollPad} todo=${t.scrollPad}`);
    add(`P1.2 ${w} · the list cards start at the same x`,
        Math.abs(q.cardLeft - t.cardLeft) <= 2, `queries=${q.cardLeft} todo=${t.cardLeft}`);
    add(`P1.3 ${w} · the cards sit the same distance off the viewport bottom`,
        Math.abs(q.fromBottom - t.fromBottom) <= 2, `queries=${q.fromBottom} todo=${t.fromBottom}`);
    add(`P1.4 ${w} · /todo's page title is no larger than the Query Centre's`,
        t.titleSize > 0 && q.titleSize > 0 && t.titleSize <= q.titleSize,
        `queries=${q.titleSize}px todo=${t.titleSize}px`);
  }

  /* ══ PHASE 2 · one count, four places ════════════════════════════════════════════════════ */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo"); await page.waitForTimeout(6500);
  const readCounts = `(() => {
    const vis = ${VIS};
    const txt = (s) => { const e = [...document.querySelectorAll(s)].find(vis); return e ? (e.textContent||"").replace(/\\s+/g," ").trim() : ""; };
    const num = (s, re) => { const m = re.exec(txt(s)); return m ? Number(m[1]) : -1; };
    const rail = [...document.querySelectorAll("a,button,li")].filter(vis)
      .find((e) => /to-?do list/i.test((e.textContent||"")) && /\\d/.test(e.textContent||""));
    const railN = rail ? Number((/(\\d+)/.exec(rail.textContent||"")||[])[1] ?? -1) : -1;
    const legend = [...document.querySelectorAll(".meter .legend b")].filter(vis)
      .reduce((n, b) => n + Number(b.textContent||0), 0);
    return {
      rail: railN,
      meter: legend,
      footer: num(".tlc .l-foot .c", /(\\d+)\\s+tasks/i),
      pane: num(".tpn-navk", /of\\s+(\\d+)/i),
      rows: [...document.querySelectorAll(".tlc .row")].filter(vis).length,
    };
  })()`;
  const c0 = await page.evaluate(readCounts) as any;
  add("P2.1 · with no filters the four numbers agree",
      c0.rail === c0.meter && c0.meter === c0.footer && c0.footer === c0.pane && c0.rail > 0,
      `rail=${c0.rail} meter=${c0.meter} footer=${c0.footer} pane=${c0.pane} rows=${c0.rows}`);

  /* ══ PHASE 3 · pane presence on a note ═══════════════════════════════════════════════════ */
  const note = await page.evaluate(`(() => {
    const vis = ${VIS};
    const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
      .find((r) => (r.querySelector(".pill")||{}).textContent === "Note");
    if (!row) return { found: false };
    row.click();
    return { found: true };
  })()`) as any;
  await page.waitForTimeout(1500);
  const pane = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const labels = all(".tpn .tile .k").map((e) => (e.textContent||"").trim());
    return {
      tiles: all(".tpn .tiles").length,
      tileLabels: labels,
      dupLabels: labels.filter((l, i) => labels.indexOf(l) !== i),
      timeline: all(".tpn .tl-head").length,
      bandBtns: all(".tpn .bandbtns button").map((b) => (b.textContent||"").trim()),
      barBtns: all(".cmdbar button").map((b) => (b.textContent||"").trim()),
      emptyLabels: all(".tpn .f-lbl").filter((l) => {
        let n = l.nextElementSibling;
        return !n || !(n.textContent||"").trim();
      }).map((l) => (l.textContent||"").trim()),
      formHeading: (all(".tpn .act h3")[0]||{}).textContent || "",
      primary: (all(".tpn .b-primary")[0]||{}).textContent || "",
    };
  })()`) as any;
  add("P3.1 · a note renders no tiles", note.found && pane.tiles === 0,
      note.found ? `tiles=${pane.tiles} labels=${JSON.stringify(pane.tileLabels)}` : "no Note row on this account");
  add("P3.2 · a note renders no timeline", note.found && pane.timeline === 0, `tl-head=${pane.timeline}`);
  add("P3.3 · no label repeats inside one tile row", pane.dupLabels.length === 0,
      pane.dupLabels.length ? `duplicated: ${JSON.stringify(pane.dupLabels)}` : "none");
  add("P3.4 · Snooze appears once on the page, in the command bar",
      pane.bandBtns.filter((b: string) => /snooze/i.test(b)).length === 0
      && pane.barBtns.filter((b: string) => /snooze/i.test(b)).length === 1,
      `band=${JSON.stringify(pane.bandBtns)} bar=${JSON.stringify(pane.barBtns)}`);

  /* ══ PHASE 4 · pane copy ═════════════════════════════════════════════════════════════════ */
  add("P4.1 · the note journey's form heading is 'Your note'",
      /Your note/i.test(pane.formHeading), `heading="${pane.formHeading.trim()}"`);
  add("P4.2 · the note journey's primary is 'Tick it off'",
      /Tick it off/i.test(pane.primary), `primary="${pane.primary.trim()}"`);
  add("P4.3 · a field label with nothing beneath it does not render",
      pane.emptyLabels.length === 0,
      pane.emptyLabels.length ? `empty: ${JSON.stringify(pane.emptyLabels)}` : "none");
  const paneText = await page.evaluate(`(() => {
    const vis = ${VIS};
    const p = [...document.querySelectorAll(".tpn")].find(vis);
    return p ? (p.innerText||"").toLowerCase() : "";
  })()`) as string;
  /* ⚠️ THE ESCAPING WAS THE WHOLE FAULT. This read `new RegExp(`\\\\b${v}\\\\b`)`, which compiles to
     `\\b` in the pattern — a literal backslash followed by `b`, not a word boundary — so it matched
     NOTHING and reported "none" while P4.1, three lines up, showed the heading was "Complete". Two
     assertions contradicting each other in one run is the tell; the regex could not fail. */
  const RETIRED = ["complete", "mark", "chase"];
  const found = RETIRED.filter((v) => new RegExp("\\b" + v + "\\b").test(paneText));
  add("P4.4 · no retired verb appears in the pane",
      paneText.length > 40 && found.length === 0,
      paneText.length <= 40
        ? `NOT PROVEN — the pane read as ${paneText.length} chars; nothing was searched`
        : found.length ? `found: ${found.join(" ")} (in ${paneText.length} chars)`
                       : `none, in ${paneText.length} chars`);

  /* ══ PHASE 6 · type scale ════════════════════════════════════════════════════════════════ */
  /* ⚠️ MEASURED ON A JOURNEY THAT HAS A TIMELINE. The note above has none by design, so the two
     timeline sizes came back -1 — a missing element reported as a wrong size, which would have read
     as a failure to fix rather than a probe pointed at the wrong row. */
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
      .find((r) => ["Decide", "Send", "Close"].includes(((r.querySelector(".pill")||{}).textContent||"").trim()));
    row?.click();
  })()`);
  await page.waitForTimeout(1500);
  const scale = await page.evaluate(`(() => {
    const vis = ${VIS};
    const sz = (s) => { const e = [...document.querySelectorAll(s)].find(vis); return e ? Math.round(parseFloat(getComputedStyle(e).fontSize) * 10) / 10 : -1; };
    return { deed: sz(".tpn .deed"), label: sz(".tpn .f-lbl"), seg: sz(".tpn .seg button"),
             tlName: sz(".tpn .tl-e .t"), tlDate: sz(".tpn .tl-e .d") };
  })()`) as any;
  const WANT = { deed: 27, label: 9.5, seg: 12, tlName: 12, tlDate: 8.5 };
  for (const k of Object.keys(WANT) as (keyof typeof WANT)[]) {
    const got = scale[k];
    add(`P6 · ${k} is the contract's ${WANT[k]}px`,
        got > 0 && Math.abs(got - WANT[k]) <= 0.6, `got=${got}px want=${WANT[k]}px`);
  }

  const red = out.filter((r) => !r.ok);
  const lines = [`── frame2 · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(process.env.SA_F2_OUT ?? "run-artifacts/frame2.txt", report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
