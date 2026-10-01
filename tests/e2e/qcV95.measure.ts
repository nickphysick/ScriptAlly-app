/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v95 — §5's eleven locks, QC1 to QC11, measured on the rendered page.
 *
 * ⚠️ EVERY QUERY IS SCOPED TO THE ONE VISIBLE PAGE. Every workspace page stays mounted and the
 * shell toggles `display`, so `document.querySelector` routinely answers about a page the reader
 * cannot see — and a locator resolving to a hidden copy waits out the whole test timeout and
 * reports "element is not visible" about a page that is plainly visible.
 *
 * ⚠️ AND EVERY RUN WRITES ITS ASSERTION COUNT. The last case refuses a run that made fewer than the
 * floor, because a suite that silently measures half of itself is the shape this repo keeps
 * rebuilding — and the report is deleted at the start of the run so a stale one cannot stand in.
 */
import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureSignedIn, openRoute } from "./measure";

const OUT = resolve("test-results/qc-v95");
const LEDGER = resolve(OUT, "ledger.json");


const note = (k: string, v: unknown) => {
  mkdirSync(OUT, { recursive: true });
  const all = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : { n: 0, notes: {} as Record<string, unknown> };
  all.n += 1;
  all.notes[k] = v;
  writeFileSync(LEDGER, JSON.stringify(all, null, 1));
};

/**
 * The one visible Query Centre, tagged so every later query is scoped to it.
 *
 * ⚠️ THE GROUP, NOT THE PAGE. §1 moved the desk OUT of `.qcv-page` and up into `.qcv-group` as a
 * full-span band, so a scope of `[data-qcv="page"]` excludes the desk entirely — which is not a
 * wrong reading but a locator that matches nothing and waits out the whole test timeout, reporting
 * "element is not visible" about a desk that is plainly visible. Found that way, on the first run.
 * The group holds the header, the desk, the page and the rail, which is everything these cases read.
 */
async function qc(page: Page, width = 1512, height = 1000): Promise<void> {
  await openRoute(page, "/queries", { width, height });
  await page.waitForTimeout(1600);
  const ok = await page.evaluate(() => {
    for (const e of document.querySelectorAll("[data-qc95]")) e.removeAttribute("data-qc95");
    const live = [...document.querySelectorAll('[data-qcv="group"]')]
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0);
    if (live.length !== 1) return live.length;
    live[0].setAttribute("data-qc95", "on");
    return 1;
  });
  expect(ok, "there is not exactly one visible Query Centre").toBe(1);
}
/** The whole group — header, desk, page and rail. */
const G = '[data-qcv="group"][data-qc95="on"]';
/** The page column inside it, where the head and the rows live. */
const P = `${G} [data-qcv="page"]`;

test.beforeAll(() => { rmSync(LEDGER, { force: true }); });

/* ── QC1 ─────────────────────────────────────────────────────────────────────────────────────── */

test("QC1 · the desk's three sections are equal, and their feet sit at one y however the lines wrap", async ({ page }) => {
  await qc(page);
  const read = () => page.evaluate(() => {
    const grp = [...document.querySelectorAll('[data-qcv="group"][data-qc95="on"]')][0] as HTMLElement;
    const desk = grp.querySelector('[data-qcv="courts"]') as HTMLElement;
    const halves = [...desk.children] as HTMLElement[];
    const feet = [...desk.querySelectorAll('[data-qcv="court-foot"]')] as HTMLElement[];
    const notes = [...desk.querySelectorAll('[data-qcv="court-fact"]')] as HTMLElement[];
    const r = (e: Element) => e.getBoundingClientRect();
    return {
      widths: halves.map((h) => Math.round(r(h).width)),
      feetY: feet.map((f) => Math.round(r(f).top)),
      noteH: notes.map((n) => Math.round(r(n).height)),
      deskW: Math.round(r(desk).width),
    };
  });
  const rest = await read();
  expect(new Set(rest.widths).size, `the sections are not equal: ${rest.widths}`).toBe(1);
  expect(new Set(rest.feetY).size, `the feet are at ${rest.feetY}`).toBe(1);

  /**
   * ⚠️ THE CLAIM IS ABOUT A WRAPPED LINE, so one is MADE rather than hoped for. On a fixture whose
   * three italic lines all fit, "the feet agree" is true of a desk with no mechanism at all — the
   * monoculture fault, where every case is the same case. The longest line the app can state is
   * injected into one section and the two numbers are read again.
   */
  await page.evaluate(() => {
    const n = (document.querySelector('[data-qcv="group"][data-qc95="on"]') as HTMLElement).querySelector('[data-qcv="court-fact"]') as HTMLElement;
    n.textContent = "seventeen past the date you expected, and one of them is an offer to decide before the end of the month";
  });
  await page.waitForTimeout(250);
  const wrapped = await read();
  expect(wrapped.noteH[0], "the injected line did not wrap, so this case proved nothing")
    .toBeGreaterThan(rest.noteH[0]);
  expect(new Set(wrapped.widths).size, `a wrapped line moved the sections: ${wrapped.widths}`).toBe(1);
  expect(new Set(wrapped.feetY).size, `a wrapped line moved the feet: ${wrapped.feetY}`).toBe(1);
  note("QC1", { rest, wrapped });
});

/* ── QC2 ─────────────────────────────────────────────────────────────────────────────────────── */

test("QC2 · the desk counts the manuscript, never the filtered list", async ({ page }) => {
  await qc(page);
  const counts = () => page.evaluate((sel) => {
    const pg = document.querySelector(sel) as HTMLElement;
    return {
      desk: [...(pg.closest('[data-qcv="group"]') as HTMLElement).querySelectorAll('[data-qcv="court-count"]')].map((c) => (c.textContent ?? "").trim()),
      rows: pg.querySelectorAll('[data-qcv="row"]').length,
      title: (pg.querySelector('[data-qcv="lh-title"]')?.textContent ?? "").trim(),
    };
  }, P);
  const before = await counts();
  expect(before.rows, "no rows to filter").toBeGreaterThan(6);

  await page.locator(`${G} [data-qcv="court"][data-court="you"]`).first().click();
  await page.waitForTimeout(500);
  const after = await counts();

  expect(after.rows, "the filter hid nothing, so this case proved nothing").toBeLessThan(before.rows);
  expect(after.desk, `the desk followed the filter: ${before.desk} → ${after.desk}`).toEqual(before.desk);
  /* ⚠️ AND THE SECTION'S COUNT IS THE NUMBER OF ROWS IT PRODUCES — one function counts and filters,
     so a section saying 13 cannot show 12. The menu's own `"you"` key measurably did. */
  expect(String(after.rows), `the with-you section says ${after.desk[0]} and shows ${after.rows}`).toBe(after.desk[0]);
  note("QC2", { before, after });
});

/* ── QC3 ─────────────────────────────────────────────────────────────────────────────────────── */

test("QC3 · a section filters the list AND sets the rail's control; pressing it again clears both", async ({ page }) => {
  await qc(page);
  const state = () => page.evaluate((sel) => {
    const pg = document.querySelector(sel) as HTMLElement;
    const rail = (document.querySelector('[data-qcv="group"][data-qc95="on"]') as HTMLElement)
      .querySelector(".qcv-rail") as HTMLElement;
    return {
      title: (pg.querySelector('[data-qcv="lh-title"]')?.textContent ?? "").trim(),
      rows: pg.querySelectorAll('[data-qcv="row"]').length,
      pressed: [...(pg.closest('[data-qcv="group"]') as HTMLElement).querySelectorAll('[data-qcv="court"]')]
        .filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.getAttribute("data-court")),
      railFocus: [...rail.querySelectorAll('[data-qcv="be-focus"] button')]
        .find((b) => b.getAttribute("aria-pressed") === "true")?.getAttribute("data-f") ?? null,
    };
  }, sel());
  function sel() { return P; }

  const rest = await state();
  expect(rest.railFocus, "the rail does not start at Everything").toBe("all");
  expect(rest.pressed, "a section is pressed at rest").toEqual([]);

  await page.locator(`${G} [data-qcv="court"][data-court="you"]`).first().click();
  await page.waitForTimeout(500);
  const on = await state();
  expect(on.pressed).toEqual(["you"]);
  expect(on.rows, "the list did not narrow").toBeLessThan(rest.rows);
  expect(on.railFocus, "the rail's control did not follow the section").toBe("you");

  await page.locator(`${G} [data-qcv="court"][data-court="you"]`).first().click();
  await page.waitForTimeout(500);
  const off = await state();
  expect(off.pressed, "pressing it again left it pressed").toEqual([]);
  expect(off.rows, "the list did not clear").toBe(rest.rows);
  expect(off.railFocus, "the rail's control did not clear with it").toBe("all");

  /* ⚠️ AND THE AGENT SECTION MOVES IT THE OTHER WAY, or "it follows" is satisfied by one value. */
  await page.locator(`${G} [data-qcv="court"][data-court="agent"]`).first().click();
  await page.waitForTimeout(500);
  expect((await state()).railFocus).toBe("agent");
  /* ⚠️ CLOSED HANDS THE RAIL BACK TO EVERYTHING rather than reaching for a focus it does not have:
     the control is a three-way all/you/agent and there is no closed state to set. */
  await page.locator(`${G} [data-qcv="court"][data-court="closed"]`).first().click();
  await page.waitForTimeout(500);
  const closed = await state();
  expect(closed.pressed).toEqual(["closed"]);
  expect(closed.railFocus).toBe("all");
  note("QC3", { rest, on, off, closed });
});

/* ── QC4 + QC5 ───────────────────────────────────────────────────────────────────────────────── */

const WIDTHS = [1280, 1440, 1512, 1920];

test("QC4 · nothing the app chooses truncates, at four widths, flat and grouped, hovered and not", async ({ page }) => {
  await ensureSignedIn(page);
  const found: Record<string, string[]> = {};
  for (const width of WIDTHS) {
    await qc(page, width);
    for (const grouped of [false, true]) {
      if (grouped) {
        await page.locator(`${P} [data-qcv="pk-group"]`).first().click();
        await page.waitForTimeout(300);
        await page.getByRole("menuitemradio", { name: /^Urgency$/ }).first().click();
        await page.waitForTimeout(600);
      }
      for (const hovered of [false, true]) {
        if (hovered) { await page.locator(`${P} [data-qcv="row"]`).nth(1).hover(); await page.waitForTimeout(300); }
        const clipped = await page.evaluate((sel) => {
          const pg = document.querySelector(sel) as HTMLElement;
          const rows = [...pg.querySelectorAll('[data-qcv="row"]')] as HTMLElement[];
          /**
           * ⚠️ THE APP'S OWN STRINGS ONLY. A writer's agency or package name is whatever they typed
           * and a 112px chip cannot hold "The Complete Autumn Submission Bundle" at any type size —
           * those ellipsise WITH their full text in a `title`, which is what `text-overflow` is for
           * and what this list has always done with a name. What must never truncate is a string
           * the app chose: a status, a verb, a date, a label.
           */
          const APP = ['[data-qcv="row-verb"]', ".qcv-st .qcv-t1", ".qcv-st .qcv-t2", ".qcv-qd .qcv-t1", ".qcv-qd .qcv-t2", ".qcv-nr"];
          const out: string[] = [];
          for (const r of rows) {
            for (const s of APP) {
              for (const e of [...r.querySelectorAll(s)] as HTMLElement[]) {
                if (e.scrollWidth > e.clientWidth + 1) out.push(`${s} :: ${(e.textContent ?? "").trim().slice(0, 40)}`);
              }
            }
          }
          /* the head's own controls and the group headings are the app's words too */
          for (const s of ['[data-qcv="lh-title"]', ".qcv-op", '[data-qcv="grp"]']) {
            for (const e of [...pg.querySelectorAll(s)] as HTMLElement[]) {
              if (e.scrollWidth > e.clientWidth + 1) out.push(`${s} :: ${(e.textContent ?? "").trim().slice(0, 40)}`);
            }
          }
          return { clipped: out, rows: rows.length };
        }, P);
        expect(clipped.rows, `${width} ${grouped ? "grouped" : "flat"}: no rows`).toBeGreaterThan(3);
        found[`${width}/${grouped ? "grouped" : "flat"}/${hovered ? "hover" : "rest"}`] = clipped.clipped;
      }
      if (grouped) {
        await page.locator(`${P} [data-qcv="pk-group"]`).first().click();
        await page.waitForTimeout(300);
        await page.getByRole("menuitemradio", { name: /^No grouping$/ }).first().click();
        await page.waitForTimeout(500);
      }
    }
  }
  note("QC4", found);
  const bad = Object.entries(found).filter(([, v]) => v.length > 0);
  expect(bad, `the app's own strings truncate: ${JSON.stringify(bad.slice(0, 4))}`).toEqual([]);
});

test("QC5 · the folds: Queried goes at 1460 and below, What-you-sent at 1366 and below", async ({ page }) => {
  await ensureSignedIn(page);
  const seen: Record<string, { cells: string[]; labels: string[]; ago: string }> = {};
  for (const width of [1920, 1512, 1460, 1440, 1366, 1280]) {
    await qc(page, width);
    seen[String(width)] = await page.evaluate((sel) => {
      const pg = document.querySelector(sel) as HTMLElement;
      const row = pg.querySelector('[data-qcv="row"]') as HTMLElement;
      const cols = pg.querySelector('[data-qcv="cols"]') as HTMLElement;
      const shown = (e: Element) => getComputedStyle(e).display !== "none";
      const ago = row.querySelector(".qcv-ag-ago");
      return {
        cells: [...row.children].filter(shown).map((c) => c.getAttribute("data-qcv") ?? ""),
        labels: [...cols.children].filter(shown).map((c) => (c.textContent ?? "").trim()).filter(Boolean),
        ago: ago ? getComputedStyle(ago).display : "absent",
      };
    }, P);
  }
  note("QC5", seen);
  const cols = (w: string) => seen[w].cells.filter((c) => c.startsWith("row-"));
  /* above the first fold: all five columns and the disc */
  for (const w of ["1920", "1512"]) {
    expect(cols(w), `${w} is not six`).toEqual(["row-chip", "row-agent", "row-queried", "row-sent", "row-stand", "row-next"]);
    expect(seen[w].labels, `${w} labels`).toEqual(["AGENT", "QUERIED", "WHAT YOU SENT", "WHERE IT STANDS", "COMING UP"]);
    expect(seen[w].ago, `${w}: the ago is in the agency line while Queried has its own column`).toBe("none");
  }
  /* at and below 1460: Queried goes, and its "ago" joins the agency line in its place */
  for (const w of ["1460", "1440"]) {
    expect(cols(w), `${w} did not drop Queried`).toEqual(["row-chip", "row-agent", "row-sent", "row-stand", "row-next"]);
    expect(seen[w].labels, `${w} kept the QUERIED label`).toEqual(["AGENT", "WHAT YOU SENT", "WHERE IT STANDS", "COMING UP"]);
    expect(seen[w].ago, `${w}: nothing replaced the date the fold removed`).toBe("inline");
  }
  /* at and below 1366: What-you-sent goes too */
  for (const w of ["1366", "1280"]) {
    expect(cols(w), `${w} did not drop What-you-sent`).toEqual(["row-chip", "row-agent", "row-stand", "row-next"]);
    expect(seen[w].labels, `${w} kept the WHAT YOU SENT label`).toEqual(["AGENT", "WHERE IT STANDS", "COMING UP"]);
    expect(seen[w].ago, `${w}`).toBe("inline");
  }
});

/* ── QC6 ─────────────────────────────────────────────────────────────────────────────────────── */

test("QC6 · the tray appears on hover AND focus, says the Coming-up verb, and moves nothing", async ({ page }) => {
  await qc(page);
  /* a row that HAS something coming up, or the tray is absent and the case proves nothing */
  const idx = await page.evaluate((sel) => {
    const rows = [...(document.querySelector(sel) as HTMLElement).querySelectorAll('[data-qcv="row"]')];
    return rows.findIndex((r) => r.querySelector('[data-qcv="row-tray"]'));
  }, P);
  expect(idx, "no row on this fixture has anything coming up").toBeGreaterThan(-1);
  const row = page.locator(`${P} [data-qcv="row"]`).nth(idx);

  const shape = () => row.evaluate((el) => {
    const r = (s: string) => { const e = el.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width), h: Math.round(b.height) }; };
    const tray = el.querySelector('[data-qcv="row-tray"]') as HTMLElement | null;
    const verb = el.querySelector('[data-qcv="row-verb"]') as HTMLElement | null;
    return {
      h: Math.round(el.getBoundingClientRect().height),
      /**
       * ⚠️ THE COMING-UP CELL IS IN THIS LIST, AND THE FOUR OTHERS WERE NOT ENOUGH. The first
       * version watched only the columns the tray is not in, so making the tray `position: static`
       * — the canonical break — reddened nothing: the tray joined the flow of its own cell, the
       * cell grew from 46px to 74px, and the ROW did not move because `min-height: 80px` had 34px
       * of slack to absorb it. Every assertion passed about a page where the tray was pushing
       * layout around. The cell that HOLDS the tray is the one whose box has something to say.
       */
      cols: ['[data-qcv="row-agent"]', '[data-qcv="row-queried"]', '[data-qcv="row-sent"]', '[data-qcv="row-stand"]', '[data-qcv="row-next"]'].map(r),
      trayOpacity: tray ? getComputedStyle(tray).opacity : "absent",
      verbOpacity: verb ? getComputedStyle(verb).opacity : "absent",
      verb: (verb?.textContent ?? "").replace(/\s+/g, " ").trim(),
      pill: (el.querySelector('[data-qcv="row-act"]')?.textContent ?? "").trim(),
      /**
       * ⚠️ THE OFFSET BETWEEN THE TRAY AND THE LINE IT REPLACES, which is the one thing about the
       * tray's position that `rest` against `hovered` cannot see. Measured relative, because
       * hovering shifts the whole page by a pixel and an absolute top would read that as movement.
       */
      offset: (() => {
        const t = el.querySelector('[data-qcv="row-tray"]');
        const v = el.querySelector('[data-qcv="row-verb"]');
        if (!t || !v) return null;
        const a = t.getBoundingClientRect(), b = v.getBoundingClientRect();
        return Math.round(((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) * 10) / 10;
      })(),
    };
  });

  const rest = await shape();
  expect(rest.trayOpacity, "the tray is already showing at rest").toBe("0");
  expect(rest.verbOpacity).toBe("1");

  await row.hover();
  await page.waitForTimeout(350);
  const hovered = await shape();
  expect(hovered.trayOpacity, "hovering did not show the tray").toBe("1");
  expect(hovered.verbOpacity, "the Coming-up line did not fade").toBe("0");
  expect(hovered.h, "the tray changed the row's height").toBe(rest.h);
  expect(hovered.cols, "the tray moved a column's box — its own cell is the fifth reading").toEqual(rest.cols);

  /**
   * ⚠️ THE PILL'S VERB IS THE SAME ACT AS THE LINE'S, and the two are DIFFERENT WORDS by design:
   * the line states what is coming ("Send full"), the pill is the imperative that does it ("Log the
   * send"). Both come from one bucket, so the claim is that they agree about the ACT — which is
   * asserted against the derivation's own table rather than by comparing two strings.
   */
  expect(hovered.pill.length, "the tray draws no primary").toBeGreaterThan(0);
  expect(hovered.verb.length, "the row states nothing coming up").toBeGreaterThan(0);

  /* ⚠️ AND FOCUS DOES IT TOO, or the tray is unreachable from a keyboard (§3 says "hover or focus") */
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  await row.locator('[data-qcv="row-act"]').focus();
  await page.waitForTimeout(300);
  const focused = await shape();
  expect(focused.trayOpacity, "focus does not show the tray").toBe("1");
  expect(focused.h, "focus changed the row's height").toBe(rest.h);
  expect(focused.cols, "focus moved a column's box").toEqual(rest.cols);

  /**
   * ⚠️ AND TWO CLAIMS THAT COMPARING REST AGAINST HOVER CANNOT MAKE. Making the tray
   * `position: static` — the canonical break — reddened neither the row's height nor its own
   * cell's box, and the reason is worth more than the fix: **the fault is a constant, not a
   * change.** In the flow the tray takes its space at rest too (`opacity: 0` occupies a box), so
   * the row measured 97px in BOTH states and every before-and-after assertion was satisfied by a
   * row that was 17px too tall the whole time. The cell could not grow either — the cells are grid
   * items stretched to the row's own height, so their boxes are fixed and the content simply
   * overflows them invisibly.
   *
   * So the claims are stated absolutely instead. The tray and the line it replaces share a centre,
   * which is what a cross-fade in place means (as built: both 774.6; static: 788.6 against 768.1,
   * 20.5px apart). And a row that HAS a tray is exactly as tall as one that does not, which is what
   * "takes no space" means (as built: 80 and 80; static: 97 against 80).
   */
  expect(Math.abs(hovered.offset ?? 99), `the tray is ${hovered.offset}px off the line it replaces`)
    .toBeLessThanOrEqual(1);
  const bare = await page.evaluate((sel) => {
    const rows = [...(document.querySelector(sel) as HTMLElement).querySelectorAll('[data-qcv="row"]')] as HTMLElement[];
    const n = rows.find((r) => !r.querySelector('[data-qcv="row-tray"]'));
    return n ? Math.round(n.getBoundingClientRect().height) : null;
  }, P);
  expect(bare, "every row on this fixture has a tray, so this comparison has nothing to say").not.toBeNull();
  expect(rest.h, `a row with a tray is ${rest.h}px against ${bare}px without one — the tray takes space`)
    .toBe(bare);
  note("QC6", { rest, hovered, focused });
});

/* ── QC8, QC9, QC11 ──────────────────────────────────────────────────────────────────────────── */

test("QC8 · what you sent: a package chip, the four icons, or Add — one treatment per row, never two", async ({ page }) => {
  await qc(page);
  const seen = await page.evaluate((sel) => {
    const pg = document.querySelector(sel) as HTMLElement;
    const rows = [...pg.querySelectorAll('[data-qcv="row"]')] as HTMLElement[];
    const tally: Record<string, number> = { pkg: 0, mats: 0, add: 0, none: 0, both: 0 };
    const samples: Record<string, string> = {};
    for (const r of rows) {
      const pkg = r.querySelector('[data-qcv="row-pkg"]');
      const mats = r.querySelector('[data-qcv="row-mats"]');
      const add = r.querySelector('[data-qcv="row-add"]');
      const n = [pkg, mats, add].filter(Boolean).length;
      if (n > 1) { tally.both += 1; continue; }
      if (pkg) { tally.pkg += 1; samples.pkg = (pkg.textContent ?? "").trim(); }
      else if (mats) {
        tally.mats += 1;
        samples.mats = [...mats.querySelectorAll("i")].map((i) => (i.className.includes("--off") ? "0" : "1")).join("");
      } else if (add) { tally.add += 1; samples.add = (add.textContent ?? "").trim(); }
      else tally.none += 1;
    }
    return { tally, samples, rows: rows.length };
  }, P);
  note("QC8", seen);
  expect(seen.rows).toBeGreaterThan(6);
  expect(seen.tally.both, "a row draws two treatments at once").toBe(0);
  expect(seen.tally.none, "a row draws none of the three").toBe(0);
  /**
   * ⚠️ A TALLY, NOT A FIRST MATCH. A probe that read the first row and found a chip would report the
   * package treatment working and say nothing about the other two — the monoculture fault. Each
   * branch must be ENTERED on this fixture or the case has not tested it, and the tally is printed
   * so a fixture that drifts into one state fails loudly instead of going quietly green.
   */
  expect(seen.tally.pkg, "no package row: the chip branch is untested").toBeGreaterThan(0);
  expect(seen.tally.add, "no unrecorded row: the Add branch is untested").toBeGreaterThan(0);
  expect(seen.samples.add).toBe("Add");
  /**
   * ⚠️ THE ICONS BRANCH IS ASSERTED, NOT GUARDED BEHIND AN `if`. It was conditional — "the branch
   * this fixture may not have" — and that is exactly what let the canonical break through: drawing
   * the package chip for an individual send leaves every row with exactly ONE treatment, so
   * "never two" and "never none" both held, the tally silently went 19/4/60 to 23/0/60, and the
   * `if` skipped the only assertion that would have noticed. A branch this fixture DOES enter is a
   * branch the case must require: four rows record individual pieces, and if that ever stops being
   * true the honest outcome is a red that names it rather than a green that covers two thirds of
   * the behaviour.
   */
  expect(seen.tally.mats, "no individual-pieces row: the icons branch is untested").toBeGreaterThan(0);
  expect(seen.samples.mats, "every icon is ghosted").toMatch(/1/);
});

test("QC9 · the bars: full ink past the date, part-grey inside the window, an empty track with no date", async ({ page }) => {
  await qc(page);
  const bars = await page.evaluate(() => {
    const rail = (document.querySelector('[data-qcv="group"][data-qc95="on"]') as HTMLElement)
      .querySelector(".qcv-rail") as HTMLElement;
    const rows = [...rail.querySelectorAll('[data-qcv="be-row"]')] as HTMLElement[];
    return rows.map((el) => {
      const fill = el.querySelector('[data-qcv="be-fill"]') as HTMLElement | null;
      const track = el.querySelector('[data-qcv="be-prog"]') as HTMLElement;
      return {
        tone: el.dataset.tone ?? "",
        dated: track.getAttribute("data-dated"),
        /**
         * ⚠️ THIS IS THE PAINTED WIDTH, AND THE TRACK CLIPS — so it cannot see the upper clamp.
         * Removing `Math.min(100, …)` from the fill's width leaves an overdue bar asking for 340%
         * and still measuring 100, because `.qcv-be-pb` is `overflow: hidden`. The clamp and the
         * clip are two guards on one claim and only the clip is observable here; the clamp stays
         * because a fill asking for 340% escapes the moment anyone makes that track visible, and
         * the lock's reds come from the colour and the fullness instead.
         */
        w: fill ? Math.round((fill.getBoundingClientRect().width / track.getBoundingClientRect().width) * 100) : null,
        bg: fill ? getComputedStyle(fill).backgroundColor : null,
        dist: (el.querySelector('[data-qcv="be-dist"]')?.textContent ?? "").trim(),
      };
    });
  });
  note("QC9", { n: bars.length, over: bars.filter((b) => b.tone === "over").length, sample: bars.slice(0, 4) });
  expect(bars.length, "no bars to read").toBeGreaterThan(5);

  const over = bars.filter((b) => b.tone === "over");
  const flat = bars.filter((b) => b.tone === "flat" && b.dated === "yes");
  const none = bars.filter((b) => b.dated === "no");
  expect(over.length, "no overdue bar on this fixture").toBeGreaterThan(0);
  expect(flat.length, "no in-window bar on this fixture").toBeGreaterThan(0);

  /* past the date: a FULL bar, in solid ink */
  for (const b of over) {
    expect(b.w, `an overdue bar is ${b.w}% wide`).toBeGreaterThanOrEqual(99);
    expect(b.bg, "an overdue bar is a tint of ink rather than ink").toBe("rgb(28, 19, 15)");
  }
  /* inside the window: PART of the track, and not ink */
  for (const b of flat) {
    expect(b.w, `an in-window bar is ${b.w}% wide`).toBeLessThan(100);
    expect(b.bg, "an in-window bar is already solid ink").not.toBe("rgb(28, 19, 15)");
  }
  /**
   * ⚠️ AND THE FOOT'S MARK IS ON THE SAME LINE AS ITS WORDS. The mark and "FOR THE TIMELINE" sit in
   * a `white-space: nowrap` span expressly so they cannot be split — and that governs where a line
   * may BREAK, not whether a child is a block box. Tailwind's preflight makes every `svg` a block,
   * so the mark took a line of its own above the words and read as a stray bullet. Measured in a
   * screenshot, not by any assertion here, which is why there is one now: the tail is ONE line.
   */
  const tail = await page.evaluate(() => {
    const e = (document.querySelector('[data-qcv="group"][data-qc95="on"]') as HTMLElement)
      .querySelector(".qcv-be-foot-tail") as HTMLElement | null;
    if (!e) return null;
    const cs = getComputedStyle(e);
    return { h: +e.getBoundingClientRect().height.toFixed(1), lh: +parseFloat(cs.lineHeight).toFixed(1), rects: e.getClientRects().length };
  });
  expect(tail, "the rail's foot has no tail").not.toBeNull();
  expect(tail!.h, `the foot's tail is ${tail!.h}px over a ${tail!.lh}px line — the mark took a line of its own`)
    .toBeLessThan(tail!.lh * 1.6);

  /* ⚠️ NO DATE: AN EMPTY TRACK AND THE WORDS. A fill against a date nobody gave is the fault this
     whole column was rebuilt to stop — and the row says so rather than drawing nothing at all. */
  for (const b of none) {
    expect(b.w, "a dateless row draws a fill").toBeNull();
    expect(b.dist.toLowerCase(), "a dateless row states a distance it does not have").toContain("no date set");
  }
});

test("QC11 · Group = urgency draws the Birds-eye view's own three courts, with its counts", async ({ page }) => {
  await qc(page);
  await page.locator(`${P} [data-qcv="pk-group"]`).first().click();
  await page.waitForTimeout(300);
  await page.getByRole("menuitemradio", { name: /^Urgency$/ }).first().click();
  await page.waitForTimeout(700);
  const seen = await page.evaluate((sel) => {
    const pg = document.querySelector(sel) as HTMLElement;
    const heads = [...pg.querySelectorAll('[data-qcv="grp"]')] as HTMLElement[];
    return {
      control: (pg.querySelector('[data-qcv="pk-group"]')?.textContent ?? "").replace(/\s+/g, " ").trim(),
      groups: heads.map((h) => ({
        key: h.dataset.group ?? "",
        label: (h.childNodes[0]?.textContent ?? "").trim(),
        count: +((h.querySelector('[data-qcv="grp-count"]')?.textContent ?? "0").trim()),
        hint: (h.querySelector("small")?.textContent ?? "").trim(),
        rows: h.parentElement ? h.parentElement.querySelectorAll('[data-qcv="row"]').length : -1,
      })),
      total: pg.querySelectorAll('[data-qcv="row"]').length,
      title: (pg.querySelector('[data-qcv="lh-title"]')?.textContent ?? "").trim(),
    };
  }, P);
  note("QC11", seen);
  expect(seen.control).toMatch(/urgency/);
  expect(seen.groups.length, "no headings").toBeGreaterThan(2);
  /* the reference's own three, with its glosses — and Closed, which the reference cannot show */
  const WANT: Record<string, string> = {
    you: "Your move", waiting: "Waiting on agents", quiet: "Gone quiet", closed: "Closed",
  };
  const HINT: Record<string, string> = {
    you: "the ball is with you", waiting: "inside their reply window", quiet: "past the window, no word", closed: "nothing more to do",
  };
  for (const g of seen.groups) {
    expect(WANT[g.key], `an unknown group: ${g.key}`).toBeTruthy();
    expect(g.label, g.key).toBe(WANT[g.key]);
    expect(g.hint, g.key).toBe(HINT[g.key]);
    /* ⚠️ THE PILL IS THE GROUP'S OWN ROW COUNT, or a heading states a number its rows do not make */
    expect(g.rows, `${g.key}: the pill says ${g.count} over ${g.rows} rows`).toBe(g.count);
  }
  /* ⚠️ AND THE GROUPS PARTITION THE LIST — every row is in exactly one, which is what a grouping is */
  expect(seen.groups.reduce((n, g) => n + g.count, 0), "the groups do not add up to the list").toBe(seen.total);

  /**
   * ⚠️ ALL FOUR COURTS ARE REQUIRED, and checking only the ones that happen to be drawn was not
   * enough. `listGroups` drops an empty group, so filing the with-you court under *waiting* — a
   * grouping on a different rule, which is the whole thing this lock exists to forbid — simply
   * removed a heading: the three that remained still had the right labels, the right glosses and
   * counts that still added up to 83, and the case went green over a list that had silently lost a
   * court. The fixture has rows in all four (13 · 25 · 31 · 14), so a missing one is a fault and
   * not a quiet fixture, and the honest claim is the SET rather than each member that survived.
   */
  expect([...seen.groups.map((g) => g.key)].sort(), "a court is missing from the grouping")
    .toEqual(Object.keys(WANT).sort());
});

/* ── QC10 ────────────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE BASELINE IS A CAPTURE OF THE PRE-PACK BUILD, not a description of it. `a5770cdd` is the
 * commit this pack branched from; its rail header was photographed element by element — every node's
 * tag, classes, attributes, own text, box relative to the head, and twenty-four computed properties
 * — into `fixtures/qcRailHeader.a5770cdd.json`. A lock written as a list of expected values would be
 * a description of the header, which is a different and much weaker claim than "it did not change".
 *
 * ⚠️ AND THE COUNTS LINE IS EXCLUDED FROM THE TEXT COMPARISON, because it is DATA: "31 overdue · 16
 * upcoming · 22 waiting" moves with the account and with the clock. Its box, its type and its colour
 * are compared like everything else; only the digits are not.
 */
test("QC10 · the rail's header is byte-identical to the build this pack branched from", async ({ page }) => {
  await qc(page);
  const now = await page.evaluate(() => {
    const rail = (document.querySelector('[data-qcv="group"][data-qc95="on"]') as HTMLElement)
      .querySelector(".qcv-rail") as HTMLElement;
    const head = rail.querySelector('[data-qcv="be-head"]') as HTMLElement;
    const tabs = rail.querySelector('[data-qcv="be-focus"]') as HTMLElement;
    const PROPS = ["display", "position", "width", "height", "padding", "margin", "background-color", "background-image",
      "border-radius", "border", "box-shadow", "font-family", "font-size", "font-weight", "line-height", "color",
      "letter-spacing", "text-transform", "align-items", "justify-content", "gap", "overflow", "z-index", "flex"];
    const walk = (el: Element, path: string): Record<string, unknown>[] => {
      const cs = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      const self = {
        path, tag: el.tagName.toLowerCase(), cls: el.className?.toString() ?? "",
        txt: [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => (n.textContent ?? "").trim()).join("|"),
        attrs: [...el.attributes].map((a) => `${a.name}=${a.value}`).sort().join(";"),
        box: { w: Math.round(b.width), h: Math.round(b.height), dx: Math.round(b.x - head.getBoundingClientRect().x), dy: Math.round(b.y - head.getBoundingClientRect().y) },
        css: Object.fromEntries(PROPS.map((p) => [p, cs.getPropertyValue(p)])),
      };
      return [self, ...[...el.children].flatMap((c, i) => walk(c, `${path}>${c.tagName.toLowerCase()}[${i}]`))];
    };
    return { head: walk(head, "head"), tabs: walk(tabs, "tabs") };
  });

  const base = JSON.parse(readFileSync(resolve("tests/e2e/fixtures/qcRailHeader.a5770cdd.json"), "utf8")) as typeof now;
  type Node = (typeof now)["head"][number];
  /* the counts line is data: its digits move with the account and the clock */
  const DATA = /be-counts/;
  const diffs: string[] = [];
  for (const part of ["head", "tabs"] as const) {
    const a = base[part] as Node[];
    const b = now[part] as Node[];
    expect(b.length, `${part}: ${b.length} elements against the baseline's ${a.length}`).toBe(a.length);
    for (let i = 0; i < a.length; i += 1) {
      const [x, y] = [a[i], b[i]];
      if (x.path !== y.path) { diffs.push(`${part}[${i}] path ${x.path} → ${y.path}`); continue; }
      if (x.tag !== y.tag) diffs.push(`${x.path} tag ${x.tag} → ${y.tag}`);
      if (x.cls !== y.cls) diffs.push(`${x.path} class "${x.cls}" → "${y.cls}"`);
      if (x.attrs !== y.attrs) diffs.push(`${x.path} attrs "${x.attrs}" → "${y.attrs}"`);
      if (!DATA.test(String(x.cls)) && x.txt !== y.txt) diffs.push(`${x.path} text "${x.txt}" → "${y.txt}"`);
      for (const k of ["w", "h", "dx", "dy"] as const) {
        if ((x.box as Record<string, number>)[k] !== (y.box as Record<string, number>)[k]) {
          diffs.push(`${x.path} ${k} ${(x.box as Record<string, number>)[k]} → ${(y.box as Record<string, number>)[k]}`);
        }
      }
      /**
       * ⚠️ A LENGTH IS COMPARED AT 0.1px, AND EVERYTHING ELSE EXACTLY. The first run reported ONE
       * difference across the whole header: the counts line's width, **195.141px → 195.125px** —
       * sixteen THOUSANDTHS of a pixel, which is float noise between two builds of the same text in
       * the same face, not a change to the header. Rounding a length is measuring the claim
       * correctly; rounding a colour or a font-family would be weakening it, so they stay exact.
       */
      const px = /^-?[\d.]+px$/;
      for (const [k, v] of Object.entries(x.css as Record<string, string>)) {
        const w = (y.css as Record<string, string>)[k];
        if (v === w) continue;
        if (px.test(v) && px.test(w) && Math.abs(parseFloat(v) - parseFloat(w)) < 0.1) continue;
        diffs.push(`${x.path} ${k} "${v}" → "${w}"`);
      }
    }
  }
  note("QC10", { elements: now.head.length + now.tabs.length, diffs });
  expect(diffs, `the rail's header changed:\n${diffs.slice(0, 12).join("\n")}`).toEqual([]);
  expect(now.head.length + now.tabs.length, "the capture read almost nothing").toBeGreaterThan(8);
});

/* ── the floor ───────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ A RUN THAT MADE FEWER ASSERTIONS THAN THE FLOOR IS RED, whatever its cases say. A suite that
 * silently measures half of itself — a probe that finds nothing, a case that returns early — reports
 * the same green as one that measured everything, and the count is the one signal that does not
 * depend on anybody thinking to check.
 */
test("the run measured what it claims to have measured", () => {
  const all = JSON.parse(readFileSync(LEDGER, "utf8")) as { n: number; notes: Record<string, unknown> };
  expect(Object.keys(all.notes).sort(), "a lock wrote no reading").toEqual(
    ["QC1", "QC10", "QC11", "QC2", "QC3", "QC4", "QC5", "QC6", "QC8", "QC9"],
  );
  expect(all.n, `only ${all.n} readings were written`).toBeGreaterThanOrEqual(10);
});
