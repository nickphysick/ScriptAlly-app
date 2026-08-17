/**
 * §6 — the timeline's rhythm, measured on the running page.
 *
 * ⚠️ THIS IS THE ONE ASSERTION A UNIT LOCK CANNOT MAKE, and the before-numbers are MEASURED on the
 * deployed build rather than reasoned: **24px** between events, **26px** into the today marker
 * (its own `margin-top: 2` on top of the gap), **13px** out of it (`margin-bottom: 13`), and 16px
 * into the writer's-turn block. Four spacings from ONE correct constant — `TL_EVENT_GAP = 24`,
 * written once and right — because the two blocks that sit BETWEEN events carried margins of their
 * own. There is nothing in the source to grep for: every number involved was intended.
 *
 * ⚠️ AND MY FIRST DRAFT OF THIS PARAGRAPH WAS ARITHMETIC WEARING A MEASUREMENT'S CLOTHES. It said
 * the gap came out 24, 37 or 50 with the event's content — derived from font sizes and line
 * heights I had reasoned about — and the page says otherwise: event-to-event was a steady 24, and
 * `.tl-rowbody` STRETCHED to the row, so a tall body never moved the gap at all. It was replaced
 * by opening the deployed build and reading it. A measure file is the last place a guess belongs.
 *
 * ⚠️ SO IT SWEEPS EVERY QUERY RATHER THAN ONE. "A query with mixed content types" is not something
 * the harness can conjure — which events carry captions, chips or a boxed waiting state depends on
 * real records — so the run walks the whole list and reports what each query's timeline actually
 * held. A pass over a single query proves the geometry for whatever that query happened to be.
 *
 *   SA_E2E_BASE_URL=http://localhost:3000 npx playwright test --project=measure qcTimeline
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";

interface Ev { i: number; mark: number; gapBelow: number | null; body: number; kind: string; lineTop: number | null; lineBottom: number | null }
interface Read { n: number; evs: Ev[]; titleRow: { h: number; markH: number } | null }

const read = (page: Page): Promise<Read> => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  /**
   * ⚠️ THE LINE IS A SEQUENCE OF NODES, AND `.tl-ev` WAS NOT ALL OF THEM. The first run of this
   * measure walked only the events and reported a 62.8px gap on eight queries — a real reading of
   * the wrong thing: the TODAY marker sat between the history and the projections, so what the
   * measure called a gap was a gap, a node and another gap added together.
   *
   * ⚠️ THAT MARKER IS GONE (pairing pack §2) and the selector KEEPS it, deliberately. If one is
   * ever drawn again this walks it and holds it to the events' rhythm, which is exactly the state
   * it had been brought to before it was removed. A selector matching nothing costs nothing; a
   * measure that silently stops seeing a node costs a session.
   */
  const nodes = [...document.querySelectorAll(".tl-ev, .tl-today")] as HTMLElement[];
  const evs = nodes;
  const box = (e: Element) => e.getBoundingClientRect();
  /* every node puts its marker at its own top — an event's `.tl-evmark` at `top: 0`, the today
     dot at `top: 3`. So the next node's top IS where the next mark begins, and a marker that
     drifted back into the flow would show up here as the reading it used to give. */
  const markTop = (e: HTMLElement) => { const m = e.querySelector(".tl-evmark"); return m ? box(m).top : box(e).top; };
  /* ⚠️ THE CONTENT BOX, NOT THE TALLEST CHILD. Summing children under-read the today marker by
     2.8px and reported a 24.8px gap there: its label is INLINE, so the line box is taller than the
     element's own rect, and one of its two children is floated and contributes no height at all.
     The content box is what the padding is measured from, so it is what the gap is measured to. */
  const contentBottom = (e: HTMLElement) => box(e).bottom - parseFloat(getComputedStyle(e).paddingBottom);

  const out = evs.map((ev, i) => {
    const today = ev.classList.contains("tl-today");
    const mark = ev.querySelector(".tl-evmark") as HTMLElement | null;
    const lineEl = ev.querySelector(".tl-evline") as HTMLElement | null;
    /* ⚠️ A `display: none` ELEMENT RETURNS A ZERO RECT, NOT A NULL ONE — and this cost a run. The
       last event hides its connector, so `box(line).top` came back as 0 and the reading became
       `0 - markTop`, i.e. minus the event's distance down the page: a plausible-looking -521.4
       that says nothing about any connector. Hidden is read as ABSENT here, which is what it is. */
    const line = lineEl && getComputedStyle(lineEl).display !== "none" ? lineEl : null;
    /* ⚠️ THE GAP IS CONTENT-BOTTOM → NEXT MARKER-TOP, which is the distance a reader sees. It is
       NOT the elements' rects, which are flush by construction and would make every run green. */
    const kids = [...ev.children].filter((c) => !c.classList.contains("tl-evmark") && !c.classList.contains("tl-evline"));
    const next = evs[i + 1];
    const body = r(kids.length ? Math.max(...kids.map((k) => box(k).height)) : box(ev).height - parseFloat(getComputedStyle(ev).paddingBottom));
    return {
      i,
      mark: mark ? r(box(mark).height) : 27,
      gapBelow: next ? r(markTop(next) - contentBottom(ev)) : null,
      body,
      /* ⚠️ CLASSIFIED BY WHAT IT MEASURES, NOT BY WHAT IT LOOKS LIKE. A first pass tested every
         descendant for a border and called all four kinds "box", because a StatusDot's own rings
         are borders — a classifier that returns one value cannot show mixed content. Height bands
         and the chip class are things the page can actually be asked. */
      kind: today ? "today" : ev.querySelector(".tl-pills") ? "chips" : body > 60 ? "block" : body > 30 ? "text" : "bare",
      lineTop: line && mark ? r(box(line).top - box(mark).top) : null,
      lineBottom: line && next ? r(markTop(next) - box(line).bottom) : null,
    };
  });

  const first = evs.find((e) => !e.classList.contains("tl-today"))!;
  const t = first?.querySelector(".tl-evtitle") as HTMLElement | null;
  const m = first?.querySelector(".tl-evmark") as HTMLElement | null;
  return { n: evs.length, evs: out, titleRow: t && m ? { h: r(box(t).height), markH: r(box(m).height) } : null };
});

test("§6 — one rhythm, whatever the events carry", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  const rows = page.locator(".f12-row");
  const total = await rows.count();
  expect(total, "no queries in the list — nothing to measure").toBeGreaterThan(0);

  /* ⚠️ READ EVERYTHING FIRST, THEN ASSERT. A `for` loop that asserts as it goes stops at the first
     query and reports one number with no idea whether it is the exception or the rule — which is
     the difference between "the gap is wrong" and "the gap is wrong on the projections only". */
  const all: { q: number; s: Read }[] = [];
  /* ⚠️ CAPPED AND SCROLLED, because the list is a scroller inside a folded group list: a bare
     `.nth(q).click()` on a row below the fold waits for an element that is never brought into
     view, and the run dies on a timeout that reads like a page fault. The cap is stated rather
     than silent — a sweep that quietly stops short reports as if it covered everything. */
  const CAP = 14;
  const n = Math.min(total, CAP);
  for (let q = 0; q < n; q++) {
    const row = rows.nth(q);
    /* ⚠️ BOTH WAITS BOUNDED. A bare `scrollIntoViewIfNeeded()` on a row that never becomes
       actionable retries for the DEFAULT 30s, so fourteen unreachable rows come to exactly the
       420s test timeout — which is how this run first failed, looking like a page fault. */
    await row.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    await row.click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(140);
    const s = await read(page);
    if (s.n > 0) all.push({ q, s });
  }
  if (total > CAP) console.log(`⚠️ swept ${CAP} of ${total} queries`);

  const seen: string[] = [];
  const gaps = new Set<number>();
  let mixed = 0;

  for (const { q, s } of all) {
    const kinds = new Set(s.evs.map((e) => e.kind));
    if (kinds.size > 1) mixed++;
    seen.push(`q${q}: ${s.n} events [${s.evs.map((e) => `${e.kind} m${e.mark} b${e.body}${e.gapBelow != null ? ` ↓${e.gapBelow}` : " ↓last"} line(${e.lineTop},${e.lineBottom})`).join(", ")}]`);
  }
  console.log(seen.join("\n"));

  for (const { q, s } of all) {
    for (const e of s.evs) {
      /* the marker is one size, and it is the token's. The today marker is deliberately a smaller
         dot — a position on the line, not an event — so it is not held to this. */
      if (e.kind !== "today") expect(e.mark, `q${q} event ${e.i}: marker is ${e.mark}px, not 27`).toBe(27);
      /* ⚠️ THE INVARIANT. Every non-last event leaves the same distance below its content,
         whatever that content was. */
      if (e.gapBelow != null) gaps.add(e.gapBelow);
      /* the connector starts at the marker's bottom and ends at the next marker's top —
         "floating between them" is exactly what a non-zero reading here means */
      if (e.lineTop != null) expect(e.lineTop, `q${q} event ${e.i}: connector starts ${e.lineTop}px from the marker's top, not 27`).toBe(27);
      if (e.lineBottom != null) expect(e.lineBottom, `q${q} event ${e.i}: connector stops ${e.lineBottom}px short of the next marker`).toBe(0);
    }
    /* no connector after the last event */
    const last = s.evs[s.evs.length - 1];
    expect(last.lineTop, `q${q}: the last event still draws a connector into nothing`).toBeNull();
    /* the title row takes the marker's height, so the title and its mark sit on one line */
    if (s.titleRow) expect(s.titleRow.h, `q${q}: the title row is ${s.titleRow.h}px against a ${s.titleRow.markH}px marker`).toBeGreaterThanOrEqual(s.titleRow.markH);
  }

  console.log(`distinct gaps across ${seen.length} queries: ${[...gaps].join(", ")} · queries with mixed content: ${mixed}`);

  expect(mixed, "no query held more than one kind of event — the case did not exercise mixed content").toBeGreaterThan(0);
  expect([...gaps], `the gap varies with content: ${[...gaps].join(", ")}`).toEqual([22]);
});

/**
 * ⚠️ THE OTHER HOST. `TimelineRows` renders in To-do's focus sheet as well, inside `.tdb-ffhubtl`
 * and nowhere near `.t-f12` — so the marker's size and the gap are at `:root` rather than on the
 * page. This case exists because the failure mode is silent: `calc()` reading an undefined custom
 * property yields NaN and the declaration is DROPPED, so a page-scoped token would have left the
 * sheet's markers unsized and its connector unplaced, with a green suite and nothing to point at.
 */
test("§6 — the geometry resolves in the sheet's host too", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  const t = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    /* a probe in the SHEET'S wrapper, so the reading is taken where the rows actually render */
    const host = document.querySelector(".tdb-ffhubtl") ?? document.body;
    const probe = document.createElement("div");
    probe.className = "tl-ev";
    host.appendChild(probe);
    const line = document.createElement("div");
    line.className = "tl-evline";
    probe.appendChild(line);
    const r = { mark: cs.getPropertyValue("--tl-mark").trim(), gap: cs.getPropertyValue("--tl-gap").trim(), pad: getComputedStyle(probe).paddingBottom, lineTop: getComputedStyle(line).top, pos: getComputedStyle(probe).position };
    probe.remove();
    return r;
  });
  console.log(JSON.stringify(t));
  expect(t.mark, "the marker size does not resolve outside .t-f12").toBe("27px");
  expect(t.gap, "the gap does not resolve outside .t-f12").toBe("22px");
  /* ⚠️ THE TOKEN RESOLVING IS NOT THE SAME AS THE RULE LANDING. A `.t-f12`-prefixed rule would
     leave these two readings at their initial values with both tokens defined and correct. */
  expect(t.pad, "the event rule is page-scoped — To-do's rows get no gap").toBe("22px");
  expect(t.lineTop, "the connector rule is page-scoped — To-do's line has no offset").toBe("27px");
  expect(t.pos, "the event is not a containing block here — the marker would escape it").toBe("relative");
});
