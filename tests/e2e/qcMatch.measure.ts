/**
 * MATCH THE QUERY CENTRE — full width, one screen, and its tokens by name.
 *
 * ⚠️ THE WIDTH IS COMPARED BETWEEN TWO LIVE PAGES IN ONE RUN, not against a number. A remembered
 * figure goes stale the day either page's gutters move; asking both in the same session cannot.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { readFileSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

type R = { id: string; ok: boolean; note: string };

/** The content box a reader actually sees: the scroll row minus its own gutters. */
const CONTENT = `(() => {
  const vis = (e) => !!e && e.offsetParent !== null;
  const s = [...document.querySelectorAll('.wpg-scroll')].find(vis);
  if (!s) return { w: -1, pad: '-' };
  const c = getComputedStyle(s);
  return { w: Math.round(s.getBoundingClientRect().width - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight)),
           pad: c.paddingLeft + '/' + c.paddingRight };
})()`;

test("qc match", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  await ensureSignedIn(page);

  /* ── 1 · full width, one screen ─────────────────────────────────────────────────────────── */
  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    const read = async (route: string) => {
      await page.goto(route);
      await page.waitForTimeout(6500);
      return page.evaluate(`(async () => {
        const content = ${CONTENT};
        const doc = document.documentElement;
        const vis = (e) => !!e && e.offsetParent !== null;
        const scrollers = [...document.querySelectorAll('*')].filter((e) => {
          if (!vis(e)) return false;
          const c = getComputedStyle(e);
          return /(auto|scroll)/.test(c.overflowY) && e.scrollHeight > e.clientHeight + 2;
        }).map((e) => String(e.className).split(' ')[0]);
        return { content, docOverflow: doc.scrollHeight - doc.clientHeight, scrollers };
      })()`) as Promise<{ content: { w: number; pad: string }; docOverflow: number; scrollers: string[] }>;
    };
    const qc = await read("/queries");
    const td = await read("/todo");

    add(`W${w} · To-do content width equals the Query Centre's (±2)`,
        Math.abs(td.content.w - qc.content.w) <= 2,
        `todo=${td.content.w} (pad ${td.content.pad})  qc=${qc.content.w} (pad ${qc.content.pad})`);
    add(`W${w} · /todo documentElement has no vertical scrollbar`,
        td.docOverflow <= 0, `overflow=${td.docOverflow}px`);
    /* ⚠️ THE PAGE'S OWN SCROLL ROW MUST NOT BE THE SCROLLER. If `.wpg-scroll` scrolls, the header
       and the cards travel together — the page scrolls as one block, which is the opposite of
       "one screen". The Query Centre's does not; its LIST does. */
    add(`W${w} · the page's scroll row does not scroll on /todo`,
        !td.scrollers.includes("wpg-scroll"),
        `todo scrollers=${JSON.stringify(td.scrollers)}  qc=${JSON.stringify(qc.scrollers)}`);
  }

  /* the list and the pane each own a scroller */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(6500);
  /* ⚠️ "OWNS A SCROLLER" WAS THE WRONG QUESTION AND IT PASSED OVER A REAL FAULT. Counting elements
     with `overflow-y: auto` anywhere inside the column was satisfied by the form card's own
     EdgeFadeScroll while `.tdw-work` clipped 125px of card — the whole Snooze/Dismiss/Complete
     footer — with nothing able to scroll to it. The claim worth making is not that a scroller
     exists but that NOTHING IS STRANDED: no box in the column may hold content taller than itself
     and clip it. That is false when the page scrolls for the column, and false when a scroller is
     merely in the wrong place, so it covers both halves of "the panes scroll, the page does not". */
  const inner = await page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const probe = (sel: string) => {
      const el = [...document.querySelectorAll(sel)].find(vis) as HTMLElement | undefined;
      if (!el) return { found: false, scrollers: 0, stranded: [] as string[] };
      const kids = [el, ...el.querySelectorAll("*")].filter((e) => vis(e)) as HTMLElement[];
      const scrollers = kids.filter((x) => /(auto|scroll)/.test(getComputedStyle(x).overflowY)).length;
      const stranded = kids
        .filter((x) => {
          const c = getComputedStyle(x);
          return /(hidden|clip)/.test(c.overflowY) && x.scrollHeight > x.clientHeight + 2;
        })
        .map((x) => `${String(x.className).split(" ")[0]} ${x.clientHeight}/${x.scrollHeight}`);
      return { found: true, scrollers, stranded };
    };
    return { rail: probe(".tdw-rail"), work: probe(".tdw-work") };
  });
  add("L1 · the list column scrolls, and strands nothing",
      inner.rail.found && inner.rail.scrollers > 0 && inner.rail.stranded.length === 0,
      `scrollers=${inner.rail.scrollers} stranded=${JSON.stringify(inner.rail.stranded)}`);
  add("L2 · the pane column scrolls, and strands nothing",
      inner.work.found && inner.work.scrollers > 0 && inner.work.stranded.length === 0,
      `scrollers=${inner.work.scrollers} stranded=${JSON.stringify(inner.work.stranded)}`);

  /* ── 2 · tokens ─────────────────────────────────────────────────────────────────────────── */
  const sheet = readFileSync(join(process.cwd(), "src/components/todo/todoDock.css"), "utf8");
  const bare = sheet.replace(/\/\*[\s\S]*?\*\//g, "");
  /* :root / theme blocks are where literals are allowed to live */
  const outside = bare.replace(/(:root|\.t-[a-z0-9]+)\s*\{[^}]*\}/g, "");
  const hexes = [...new Set(outside.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [])];
  add("T1 · no raw hex in the to-do pane stylesheet outside :root",
      hexes.length === 0, `${hexes.length} distinct: ${hexes.slice(0, 10).join(" ")}`);

  /* the sage band must BE the Query Centre's panel header */
  /* ⚠️ MEASURE THE LIVE BAND IF ONE IS ON SCREEN, AND OTHERWISE A PROBE IN THE REAL DOCUMENT —
     never `ABSENT`. Which card the pane holds depends on the account's data, so the first form of
     this assertion passed by comparing an empty string with an empty string the moment a
     housekeeping card was not selected. A probe appended to the page is styled by the same
     cascade and the same stylesheet; what it cannot be is silently unmeasured. */
  const todoSage = await page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const live = [...document.querySelectorAll(".tdk-band.g-housekeeping")].find(vis) as HTMLElement | undefined;
    if (live) return getComputedStyle(live).backgroundImage;
    const host = document.querySelector(".tdk") ?? document.body;
    const p = document.createElement("div");
    p.className = "tdk-band g-housekeeping";
    host.appendChild(p);
    const v = getComputedStyle(p).backgroundImage;
    p.remove();
    return v;
  });
  await page.goto("/queries");
  await page.waitForTimeout(6000);
  const qcHead = await page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const h = [...document.querySelectorAll(".f12-chh")].find(vis) as HTMLElement | undefined;
    return h ? getComputedStyle(h).backgroundImage : "ABSENT";
  });
  /* ⚠️ COMPARED AS THE TWO COLOUR STOPS, not the whole string — the QC header states a `180deg`
     that the pane's 135deg band cannot copy without changing its own direction. The instruction is
     that the COLOURS match; the angle is each surface's own. */
  const stops = (s: string) => (s.match(/rgba?\([^)]*\)/g) ?? []).join(" ");
  add("T2 · a sage band on /todo paints the Query Centre panel header's colours",
      stops(todoSage) === stops(qcHead) && stops(qcHead) !== "",
      `todo=${stops(todoSage)}  qc=${stops(qcHead)}`);

  /* ⚠️ THE NARROW CASE IS PROVEN, NOT ASSERTED IN A COMMENT. The track was chosen over
     `minmax(260px, 340px)` because that floor starved the pane to ZERO at 390 — a claim written
     into the stylesheet, so it gets a measurement. Signed in already: signing in AT 390 fails,
     because the sign-in wait keys on `.ws-panel`, which is hidden below the mobile breakpoint. */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/todo");
  await page.waitForTimeout(6500);
  const narrow = await page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const w = (sel: string) => {
      const el = [...document.querySelectorAll(sel)].find(vis) as HTMLElement | undefined;
      return el ? Math.round(el.getBoundingClientRect().width) : -1;
    };
    return { rail: w(".tdw-rail"), work: w(".tdw-work") };
  });
  add("N1 · at 390 the pane keeps a real width — no starved track",
      narrow.work > 100 || narrow.work === -1,
      `rail=${narrow.rail} work=${narrow.work}` + (narrow.work === -1 ? " (mobile shell — split not mounted)" : ""));
  await page.setViewportSize({ width: 1440, height: 900 });

  /* ── 3 · still fluid, still three rimmed cards ──────────────────────────────────────────── */
  add("F1 · no container query, no media query, in the pane sheet",
      !/@container/.test(bare) && !/@media[^{]*\{[^}]*tdk-/.test(bare),
      (bare.match(/@(container|media)[^{]*/g) ?? ["none"]).slice(0, 3).join(" | "));

  const red = out.filter((r) => !r.ok);
  const lines = [`── qc match · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(process.env.SA_QC_OUT ?? "run-artifacts/qc-match.txt", report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
