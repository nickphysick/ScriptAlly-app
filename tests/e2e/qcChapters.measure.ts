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

test("§3 — how many queries render rounds, and where the headings fall", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  /* ⚠️ THE WHOLE LIST, COUNTED — "if it is still zero, the rule is wrong again". A single sampled
     query cannot answer that, and a run that found none would look identical to a run that found
     none because it stopped early. */
  const seen: { row: number; chapters: number; labels: string[]; order: string[] }[] = [];
  for (let i = 0; i < 24; i++) {
    const row = page.locator(".f12-row").nth(i);
    if (!(await row.count())) break;
    await row.scrollIntoViewIfNeeded();
    await row.click({ timeout: 5000 });
    await page.waitForTimeout(280);
    seen.push(await page.evaluate((n) => ({
      row: n,
      chapters: document.querySelectorAll(".tl-chap").length,
      labels: [...document.querySelectorAll(".tl-chaplab")].map((l) => (l.textContent || "").trim()),
      /* the reading order of the whole column: headings and event titles interleaved */
      order: [...document.querySelectorAll<HTMLElement>(".tl-chaplab, .tl-ev .tl-evtitle span:first-child, .tl-minortx")]
        .map((e) => (e.textContent || "").trim()).filter(Boolean),
    }), i));
  }
  for (const s of seen) console.log(`  row ${String(s.row).padStart(2)} · ${s.chapters} chapter${s.chapters === 1 ? " " : "s"} · ${JSON.stringify(s.labels)}`);

  const chaptered = seen.filter((s) => s.chapters > 1);
  console.log(`\n${chaptered.length} of ${seen.length} queries render rounds`);
  expect(seen.length, "no queries to read").toBeGreaterThan(2);
  /* ⚠️ THE PACK'S OWN CHECK: zero means the rule is wrong again. */
  expect(chaptered.length, "no query renders rounds — the rule is wrong again").toBeGreaterThan(0);

  for (const s of chaptered) {
    /* §3b — every chapter labelled, including the first */
    expect(s.labels.length, `row ${s.row}: ${s.chapters} chapters but ${s.labels.length} headings`).toBe(s.chapters);
    for (const l of s.labels) expect(l.length, `row ${s.row} drew a blank heading`).toBeGreaterThan(0);
    expect(new Set(s.labels).size, `row ${s.row}: two rounds share a heading — ${s.labels.join(" / ")}`).toBe(s.labels.length);

    /* §3a — the request opens the round it belongs to, so no heading falls BETWEEN a request and
       the send answering it */
    const req = s.order.findIndex((t) => /requested|Revise/i.test(t));
    const sent = s.order.findIndex((t) => /^(Partial sent|Full sent)/i.test(t));
    if (req >= 0 && sent > req) {
      const between = s.order.slice(req + 1, sent).filter((t) => s.labels.includes(t));
      console.log(`  row ${s.row} order: ${s.order.join(" → ")}`);
      expect(between, `row ${s.row}: a heading fell between the request and its send — ${between.join(", ")}`).toEqual([]);
    }
    /* the request must sit UNDER its own round's heading, not at the end of the one before */
    if (req >= 0) {
      const headingBefore = [...s.order.slice(0, req)].reverse().find((t) => s.labels.includes(t));
      console.log(`  row ${s.row}: "${s.order[req]}" sits under "${headingBefore}"`);
      expect(headingBefore, `row ${s.row}: the request has no heading above it`).toBeTruthy();
      expect(headingBefore, `row ${s.row}: the request sits under "The query" — it should open its own round`).not.toBe("The query");
    }
  }

  /* the threshold still holds: a one-round query shows nothing */
  const single = seen.find((s) => s.chapters === 1);
  expect(single, "no single-round query to check the threshold against").toBeTruthy();
  expect(single!.labels.length, "a one-round query was given a heading").toBe(0);
});

/**
 * ⚠️ MEASURED ACROSS EVERY QUERY, NOT ON ONE. A chapter with a single event has no gap to compare —
 * which is what the first version of this hit once chapters started opening at the request — so the
 * rhythm is read from every event on every query that has a next event to be spaced from.
 */
test("§2 — one gap for every event, and no line after the last", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  const pads = new Set<string>();
  const centres = new Set<number>();
  let events = 0, samples = 0, lastLines: string[] = [];
  for (let i = 0; i < 24; i++) {
    const row = page.locator(".f12-row").nth(i);
    if (!(await row.count())) break;
    await row.scrollIntoViewIfNeeded();
    await row.click({ timeout: 5000 });
    await page.waitForTimeout(260);
    const read = await page.evaluate(() => {
      const evs = [...document.querySelectorAll<HTMLElement>(".tl-ev")];
      /**
       * ⚠️ "FOLLOWED BY ANOTHER EVENT" IS DOCUMENT ORDER, NOT SIBLINGHOOD. Each chapter WRAPS its
       * events, and the waiting projection sits outside every chapter — so `nextElementSibling`
       * found nothing on any query and reported zero samples rather than a wrong figure. It is the
       * vacuous shape: an assertion about a set the probe never built.
       *
       * ⚠️ AND A CHAPTER BOUNDARY IS THE DELIBERATE EXCEPTION — the last event of a round pays no
       * gap because its connector ends there. So the rhythm is every event whose successor is in
       * the SAME round (or is the projection, which continues the last one).
       */
      const chapOf = (e: HTMLElement) => e.closest(".tl-chap");
      const spaced = evs.filter((e, i) => {
        const next = evs[i + 1];
        if (!next) return false;
        const a = chapOf(e), b = chapOf(next);
        return a === b || b === null;
      });
      const line = evs[evs.length - 1]?.querySelector<HTMLElement>(".tl-evline");
      return {
        events: evs.length,
        pads: spaced.map((e) => getComputedStyle(e).paddingBottom),
        centres: evs.map((e) => {
          const m = e.querySelector<HTMLElement>(".tl-evmark")!.getBoundingClientRect();
          return Math.round(m.left + m.width / 2 - e.getBoundingClientRect().left);
        }),
        lastLine: line ? getComputedStyle(line).display : "(no line element)",
      };
    });
    events += read.events;
    samples += read.pads.length;
    read.pads.forEach((p) => pads.add(p));
    read.centres.forEach((c) => centres.add(c));
    lastLines.push(read.lastLine);
  }

  console.log(`\n${events} events across the list · ${samples} of them spaced from a next event`);
  console.log(`  gaps: ${[...pads].join(" / ")}`);
  console.log(`  mark centres: ${[...centres].join(", ")}`);
  console.log(`  connector on each query's final event: ${[...new Set(lastLines)].join(", ")}`);

  expect(samples, "no event anywhere has a next event to be spaced from").toBeGreaterThan(1);
  expect(pads.size, `the gap is not one figure: ${[...pads].join(", ")}`).toBe(1);
  /* ⚠️ THE RAIL IS ONE STRAIGHT LINE across every event on every query, whatever its mark's size. */
  expect(centres.size, `the rail bends: mark centres ${[...centres].join(", ")}`).toBe(1);
  expect(new Set(lastLines), "a connector runs off the end of a timeline").toEqual(new Set(["none"]));
});
