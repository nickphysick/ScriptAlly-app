/**
 * §1 + §2 — chapters and the one rhythm, measured on the deployed page.
 *
 * ⚠️ THE UNIT LOCKS PROVE THE GROUPING, NOT THE COLUMN. `chapterise` can be right in every case and
 * still render a heading nobody can read or a rail that bends at a minor event — the two faults this
 * file exists for. Everything below is a rect or a computed style from the running app.
 *
 *   npx playwright test --project=measure qcChapters
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";

/** Walk every query until one is found whose timeline has more than one round. */
/**
 * ⚠️ THE COUNT IS RE-READ EVERY STEP. Selecting a row collapses the header and can fold a group, so
 * a length taken once goes stale and `nth(i)` waits five seconds for a row that is no longer there —
 * which is a timeout reported as a failure of the thing being measured.
 */
async function pick(page: Page, want: (chapters: number) => boolean): Promise<number> {
  for (let i = 0; i < 24; i++) {
    const row = page.locator(".f12-row").nth(i);
    if (!(await row.count())) break;
    await row.scrollIntoViewIfNeeded();
    await row.click({ timeout: 5000 });
    await page.waitForTimeout(280);
    if (want(await page.locator(".tl-chap").count())) return i;
  }
  return -1;
}
const findChaptered = (page: Page) => pick(page, (c) => c > 1);

test("§1 — a long query reads as rounds, a fresh one carries no heading", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  const rows = await page.locator(".f12-row").count();
  expect(rows, "no queries on the page — nothing to read").toBeGreaterThan(2);

  const idx = await findChaptered(page);
  console.log(`\nfirst multi-round query: row ${idx} of ${rows}`);

  if (idx >= 0) {
    const chapters = await page.locator(".tl-chap").count();
    const labels = await page.locator(".tl-chaplab").allInnerTexts();
    console.log(`  ${chapters} chapters · labels ${JSON.stringify(labels)}`);
    expect(chapters, "more than one round and no chapter boxes").toBeGreaterThan(1);
    expect(labels.length, "a multi-round query drew no headings").toBe(chapters);
    /* ⚠️ NO TWO ROUNDS SHARE A HEADING — the ordinal rule, on the page rather than in a fixture. */
    expect(new Set(labels).size, `two rounds share a heading: ${labels.join(" / ")}`).toBe(labels.length);
    for (const l of labels) expect(l.trim().length, "a blank heading was drawn").toBeGreaterThan(0);

    /* the rule that separates rounds, and the label's own trailing rule */
    const sep = await page.locator(".tl-chap").nth(1).evaluate((el) => {
      const c = getComputedStyle(el);
      return { shadow: c.boxShadow, padTop: c.paddingTop, marginTop: c.marginTop };
    });
    console.log(`  boundary: margin ${sep.marginTop} + padding ${sep.padTop}, rule ${sep.shadow}`);
    expect(sep.shadow, "no rule between rounds").not.toBe("none");
  } else {
    console.log("  (no multi-round query in this account — the threshold half is still asserted below)");
  }

  /* ⚠️ THE THRESHOLD, ON THE PAGE. A query with one round must show no heading at all — the case
     the derivation calls `labelled: false`, which is worthless if the renderer draws one anyway. */
  const single = await pick(page, (c) => c === 1);
  const checked = single >= 0 ? 1 : 0;
  if (single >= 0) {
    const labels = await page.locator(".tl-chaplab").count();
    console.log(`\nsingle-round query at row ${single}: 1 chapter · ${labels} headings`);
    expect(labels, "a one-round query was given a heading").toBe(0);
  }
  expect(checked, "no single-round query to check the threshold against").toBe(1);
});

test("§2 — one gap for every event, a small mark for the minor ones, no line after the last", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const idx = await findChaptered(page);
  if (idx < 0) test.skip(true, "no multi-round query in this account");

  const geo = await page.evaluate(() => {
    const chaps = [...document.querySelectorAll<HTMLElement>(".tl-chap")];
    const out: any = { chapters: [], minor: [], lastLine: null, marks: [] };
    for (const chap of chaps) {
      const evs = [...chap.querySelectorAll<HTMLElement>(":scope > .tl-ev")];
      const gaps: number[] = [];
      for (let i = 1; i < evs.length; i++) {
        const a = evs[i - 1].getBoundingClientRect();
        const b = evs[i].getBoundingClientRect();
        gaps.push(Math.round((b.top - a.bottom) * 10) / 10);
      }
      /* the distance the eye reads is mark-top to mark-top minus the previous event's own content */
      const pads = evs.map((e) => getComputedStyle(e).paddingBottom);
      out.chapters.push({ events: evs.length, gaps, pads });
    }
    for (const m of [...document.querySelectorAll<HTMLElement>(".tl-ev--minor")]) {
      const mark = m.querySelector<HTMLElement>(".tl-evmark")!.getBoundingClientRect();
      out.minor.push({
        markW: Math.round(mark.width), markH: Math.round(mark.height),
        centreX: Math.round(mark.left + mark.width / 2 - m.getBoundingClientRect().left),
        titles: m.querySelectorAll(".tl-evtitle").length,
        text: (m.textContent || "").trim().slice(0, 44),
      });
    }
    const bigMarks = [...document.querySelectorAll<HTMLElement>(".tl-ev:not(.tl-ev--minor) .tl-evmark")];
    out.marks = bigMarks.slice(0, 3).map((k) => {
      const r = k.getBoundingClientRect();
      return { w: Math.round(r.width), centreX: Math.round(r.left + r.width / 2 - (k.closest(".tl-ev") as HTMLElement).getBoundingClientRect().left) };
    });
    const all = [...document.querySelectorAll<HTMLElement>(".tl-ev")];
    const last = all[all.length - 1];
    const line = last?.querySelector<HTMLElement>(".tl-evline");
    out.lastLine = line ? getComputedStyle(line).display : "(no line element)";
    return out;
  });

  console.log(`\nper chapter: ${JSON.stringify(geo.chapters)}`);
  console.log(`minor events: ${JSON.stringify(geo.minor)}`);
  console.log(`substantive marks: ${JSON.stringify(geo.marks)}`);
  console.log(`connector on the final event: ${geo.lastLine}`);

  /* ⚠️ ONE GAP. Every event's own `padding-bottom` is the rhythm — measured as the computed value
     rather than as a rect difference, because a rect gap is 0 for adjacent blocks whose spacing is
     padding rather than margin, and 0 === 0 would pass while saying nothing. */
  const pads = geo.chapters.flatMap((c: any) => c.pads.slice(0, -1));
  expect(pads.length, "not enough events to compare a rhythm").toBeGreaterThan(1);
  expect(new Set(pads).size, `the gap is not one figure: ${[...new Set(pads)].join(", ")}`).toBe(1);

  /* the minor treatment */
  expect(geo.minor.length, "no minor events on this query to check").toBeGreaterThan(0);
  for (const m of geo.minor) {
    expect(m.markW, `a minor mark is ${m.markW}px, not the small one`).toBeLessThanOrEqual(12);
    expect(m.titles, `a minor event drew a title row: "${m.text}"`).toBe(0);
  }
  /* ⚠️ THE RAIL STAYS STRAIGHT — the small mark's centre must sit on the big one's centre, which is
     the thing a hand-written offset gets wrong and nothing else notices. */
  const centres = [...geo.minor.map((m: any) => m.centreX), ...geo.marks.map((m: any) => m.centreX)];
  expect(new Set(centres).size, `the rail bends: mark centres ${centres.join(", ")}`).toBe(1);

  expect(geo.lastLine, "a connector runs off the end of the timeline").toBe("none");
});
