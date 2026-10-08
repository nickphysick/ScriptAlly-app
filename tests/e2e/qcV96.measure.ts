/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v96 — §5's thirteen locks, QC1 to QC13, measured on the rendered page.
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
import { retiredV131 } from "./inkRetired";

const OUT = resolve("test-results/qc-v96");
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
    for (const e of document.querySelectorAll("[data-qc96]")) e.removeAttribute("data-qc96");
    const live = [...document.querySelectorAll('[data-qcv="group"]')]
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0);
    if (live.length !== 1) return live.length;
    live[0].setAttribute("data-qc96", "on");
    return 1;
  });
  expect(ok, "there is not exactly one visible Query Centre").toBe(1);
}
/** The whole group — header, desk, page and rail. */
const G = '[data-qcv="group"][data-qc96="on"]';
/** The page column inside it, where the head and the rows live. */
const P = `${G} [data-qcv="page"]`;

test.beforeAll(() => { rmSync(LEDGER, { force: true }); });

/* ── QC1 ─────────────────────────────────────────────────────────────────────────────────────── */

test("QC1 · the desk's three sections are equal, and their feet sit at one y however the lines wrap", async ({ page }) => {
  test.skip(true, retiredV131("the v96 desk's halves and their feet; v131's desk is three equal sections whose two facts never wrap", "QC3"));
  await qc(page);
  const read = () => page.evaluate(() => {
    const grp = [...document.querySelectorAll('[data-qcv="group"][data-qc96="on"]')][0] as HTMLElement;
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
    const n = (document.querySelector('[data-qcv="group"][data-qc96="on"]') as HTMLElement).querySelector('[data-qcv="court-fact"]') as HTMLElement;
    n.textContent = "seventeen past the date you expected, and one of them is an offer to decide before the end of the month";
  });
  await page.waitForTimeout(250);
  const wrapped = await read();
  expect(wrapped.noteH[0], "the injected line did not wrap, so this case proved nothing")
    .toBeGreaterThan(rest.noteH[0]);
  expect(new Set(wrapped.widths).size, `a wrapped line moved the sections: ${wrapped.widths}`).toBe(1);
  expect(new Set(wrapped.feetY).size, `a wrapped line moved the feet: ${wrapped.feetY}`).toBe(1);
  /**
   * §5 (v96.1) · EACH SECTION'S FOOT CARRIES A DATE, OR THE WORDS AND AN EM DASH. The discs say
   * who; the date says when, and a foot with discs alone is half a sentence. Where the app has no
   * date for a section the phrase still renders — "next due —" — because the absence of a date is
   * itself worth stating, and a vanishing clause makes three sections three different shapes.
   */
  const feet = await page.evaluate((sel) => [...(document.querySelector(sel) as HTMLElement)
    .querySelectorAll('[data-qcv="court-foot"]')]
    .map((e) => ({ text: (e as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
                   when: ((e as HTMLElement).querySelector('[data-qcv="court-when"]') as HTMLElement | null)?.innerText.replace(/\s+/g, " ").trim() ?? null })), G);
  expect(feet.length, "the desk does not have three feet").toBe(3);
  for (const f of feet) {
    expect(f.when, `a foot states no date clause at all: "${f.text}"`).toBeTruthy();
    expect(f.when, `"${f.when}" names no date and no em dash`).toMatch(/\d|—/);
  }
  note("QC1", { rest, wrapped, feet });
});

/* ── QC4 ───────────────────────────────────────────────────────────────────────────────────── */

const WIDTHS = [1280, 1440, 1512, 1920];

test("QC4 · nothing the app chooses truncates, at four widths, flat and grouped, hovered and not", async ({ page }) => {
  await ensureSignedIn(page);
  const found: Record<string, string[]> = {};
  for (const width of WIDTHS) {
    await qc(page, width);
    for (const grouped of [false, true]) {
      if (grouped) {
        /* v131: the section header does not stick, so bring it on screen first — a menu scrolled to closes */
        await page.locator(`${P} [data-qcv="ws-head"]`).first().evaluate((e) => e.scrollIntoView({ block: "start" }));
        await page.waitForTimeout(200);
        await page.locator(`${P} [data-qcv="ws-group"]`).first().click();
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
          /* v132 §2 — RE-POINTED: the workspace head's title, controls, pills and chips */
          for (const s of ['[data-qcv="ws-title"]', ".qcw-ctl", ".qcw-pill", ".qcw-chip", '[data-qcv="grp"]']) {
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
        /* v131: the section header does not stick, so bring it on screen first — a menu scrolled to closes */
        await page.locator(`${P} [data-qcv="ws-head"]`).first().evaluate((e) => e.scrollIntoView({ block: "start" }));
        await page.waitForTimeout(200);
        await page.locator(`${P} [data-qcv="ws-group"]`).first().click();
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

test("QC6 · the tray appears on hover AND focus, says the Coming-up verb, and moves nothing", async ({ page }) => {
  await qc(page);
  /**
   * ⚠️ A ROW WITH AN ACTION, NOT MERELY WITH A TRAY. §3 (v96) puts the tray on EVERY row, so
   * "the first row that has one" is now the first row full stop — and the cross-fade and the pill's
   * verb are claims about a row that HAS something coming up. The probe asks for `row-act`.
   */
  const idx = await page.evaluate((sel) => {
    const rows = [...(document.querySelector(sel) as HTMLElement).querySelectorAll('[data-qcv="row"]')];
    return rows.findIndex((r) => r.querySelector('[data-qcv="row-act"]'));
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
      /* v131 hides the chip with `visibility` rather than fading it — either way the line is not seen */
      verbOpacity: verb ? (getComputedStyle(verb).visibility === "hidden" ? "0" : getComputedStyle(verb).opacity) : "absent",
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
  /**
   * ⚠️ THE SECOND CLAIM CHANGED ITS SHAPE IN v96, BECAUSE ITS CONTROL GROUP STOPPED EXISTING. In v95
   * the tray was drawn only where there was an action, so "a row with a tray is exactly as tall as
   * one without" was a comparison the page itself supplied. §3 puts the tray on EVERY row, so there
   * is no row without one and that comparison has nothing to say — its own guard said so on the
   * first run, which is the guard working.
   *
   * What still bites is the sheet's stated floor: the row states `min-height: 80px` and nothing
   * else gives it height, so a tray in the FLOW grows it. Measured when `position: static` was
   * mutated in last night's run: 97px against 80, in BOTH states, which is why the rest-against-
   * hover comparison above cannot see it and this one can.
   */
  const stated = await page.evaluate((sel) => {
    const r = (document.querySelector(sel) as HTMLElement).querySelector('[data-qcv="row"]') as HTMLElement;
    return Math.round(parseFloat(getComputedStyle(r).minHeight));
  }, P);
  expect(stated, "the row states no minimum height, so this claim has no floor to check").toBeGreaterThan(0);
  expect(rest.h, `the row is ${rest.h}px against its stated ${stated}px — something in it is taking space`)
    .toBe(stated);
  /**
   * §1 (v96.1) · THE ROWS ARE FLOATING CARDS, AND THE AIR BETWEEN THEM IS MEASURED. v96 drew them
   * butted together — gap 0 against the reference's 10 — because the 10px lived as a `gap` on the
   * rows' container and §2's bands made that container's children SECTIONS rather than rows. The
   * unit lock stayed green throughout, asserting the declaration where the claim was the distance,
   * which is why this one measures the pixels between two cards instead.
   */
  const cards = await page.evaluate((sel) => {
    const rows = [...(document.querySelector(sel) as HTMLElement).querySelectorAll('[data-qcv="row"]')] as HTMLElement[];
    if (rows.length < 3) return null;
    const cs = getComputedStyle(rows[0]);
    const edge = getComputedStyle(rows[0], "::before");
    const gaps = rows.slice(1, 6).map((r, n) => +(r.getBoundingClientRect().top - rows[n].getBoundingClientRect().bottom).toFixed(1));
    return { gaps, radius: cs.borderRadius, border: cs.borderStyle, shadow: cs.boxShadow,
             overflow: cs.overflow, bg: cs.backgroundColor, edge: edge.backgroundImage };
  }, P);
  expect(cards, "fewer than three rows — the gap between cards is untested").not.toBeNull();
  /* ⚠️ v131 retires the floating cards on desktop: rows are 64px lines in one white group body (QC9, QC10).
     The card treatment below is v96's and is asserted only where v96 rows render. */
  const v131 = await page.locator(`${P} .qc13-list`).count() > 0;
  if (v131) {
    expect([...new Set(cards!.gaps)], `v131 rows touch: ${cards!.gaps}`).toEqual([0]);
  } else {
  expect([...new Set(cards!.gaps)], `the cards are ${cards!.gaps} apart`).toEqual([10]);
  expect(cards!.border, "a stroke on a floating card").toMatch(/^(none|solid)$/);
  expect(cards!.radius).toBe("12px");
  expect(cards!.shadow, "the card has no shadow, so it is not floating").toMatch(/rgba\(28, 19, 15/);
  expect(cards!.overflow, "the 6px edge escapes the radius without this").toBe("hidden");
  expect(cards!.bg).toBe("rgb(255, 255, 255)");
  expect(cards!.edge, "the 6px status edge is not painted").toMatch(/linear-gradient\(90deg[^)]*\)?.*6px/);
  }
  note("QC6", { rest, hovered, focused, cards });
});

/* ── QC8 ────────────────────────────────────────────────────────────────────────────────────── */

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

test("QC12 · a your-move row's tray is action · Edit · Close; a waiting row's is Edit · Close", async ({ page }) => {
  await qc(page);
  const seen = await page.evaluate((sel) => {
    const pg = document.querySelector(sel) as HTMLElement;
    const rows = [...pg.querySelectorAll('[data-qcv="row"]')] as HTMLElement[];
    const read = (r: HTMLElement) => [...r.querySelectorAll('[data-qcv="row-tray"] button')]
      .map((b) => ((b as HTMLElement).textContent ?? "").trim());
    const withAction = rows.filter((r) => r.querySelector('[data-qcv="row-act"]'));
    const without = rows.filter((r) => !r.querySelector('[data-qcv="row-act"]'));
    return {
      rows: rows.length,
      trays: rows.filter((r) => r.querySelector('[data-qcv="row-tray"]')).length,
      withAction: withAction.length, without: without.length,
      /* every DISTINCT shape the two kinds produce, so one odd row cannot hide behind a sample */
      shapesWithAction: [...new Set(withAction.map((r) => read(r).slice(1).join(" · ")))],
      shapesWithout: [...new Set(without.map((r) => read(r).join(" · ")))],
      counts: [...new Set(rows.map((r) => read(r).length))].sort(),
      anySnooze: pg.innerText.includes("Snooze"),
      anyMore: !!pg.querySelector('[data-qcv="row-more"]'),
    };
  }, P);
  note("QC12", seen);
  /* ⚠️ BOTH KINDS MUST BE PRESENT, or the case proves one third of itself */
  expect(seen.withAction, "no row has an action, so the three-button tray is untested").toBeGreaterThan(0);
  expect(seen.without, "every row has an action, so the two-button tray is untested").toBeGreaterThan(0);
  expect(seen.trays, "a row without a tray").toBe(seen.rows);
  /* the action's own words vary by bucket; what is fixed is what FOLLOWS it */
  expect(seen.shapesWithAction, "a your-move tray is not action · Edit · Close").toEqual(["Edit · Close"]);
  expect(seen.shapesWithout, "a waiting tray is not Edit · Close").toEqual(["Edit · Close"]);
  expect(seen.counts, "a tray with a fourth control, or a missing one").toEqual([2, 3]);
  expect(seen.anySnooze, "Snooze is back on the page").toBe(false);
  expect(seen.anyMore, "the ⋯ is back").toBe(false);
});

test("QC13 · the guide shows on first visit, not after ×, and comes back from the help menu", async ({ page }) => {
  const KEY = "sa.guide.queries";
  /**
   * ⚠️ THE KEY IS CLEARED ONCE, ON THE FIRST DOCUMENT ONLY. An init script runs on EVERY navigation,
   * so clearing it unconditionally would clear it on the reload too — and "it does not come back"
   * would then be a statement about an empty store rather than about the flag the × just wrote. It
   * went red exactly that way on its first run. `sessionStorage` remembers that the first document
   * has been and gone.
   */
  await page.addInitScript((k) => {
    try {
      if (!sessionStorage.getItem("__qc13")) { localStorage.removeItem(k as string); sessionStorage.setItem("__qc13", "1"); }
    } catch { /* a private window: the guide simply shows, which is the harmless direction */ }
  }, KEY);
  await qc(page);
  const shown = () => page.evaluate(() => !!document.querySelector('[data-qcv="guide"]'));
  const first = await shown();
  const title = await page.locator('[data-qcv="guide-title"]').innerText();
  const n = await page.locator('[data-qcv="guide-n"]').innerText();

  /* × dismisses it for good */
  await page.locator('[data-qcv="guide-x"]').click();
  await page.waitForTimeout(250);
  const afterX = await shown();
  const stored = await page.evaluate((k) => { try { return localStorage.getItem(k as string); } catch { return "err"; } }, KEY);

  await page.reload();
  await page.waitForTimeout(1900);
  const afterReload = await shown();

  /* …and the help menu is the way back */
  await page.locator('button[data-shell="help"]').first().click();
  await page.waitForTimeout(250);
  const item = page.locator('[data-shell="guide-again"]');
  const offered = await item.count();
  if (offered) { await item.click(); await page.waitForTimeout(400); }
  const afterMenu = await shown();
  const backAt = offered ? await page.locator('[data-qcv="guide-n"]').innerText() : null;

  /**
   * §3 (v96.1) · THE CARD IS ANCHORED TO THE VIEWPORT AND NEVER TOUCHES THE DESK. v96 lifted it
   * clear of the rail's header, and at 860 tall that lift put it **over the desk's third section** —
   * the one thing §4b's "never covers" was about. Checked at three heights, because the fault
   * existed at one of them and not at the one it was written against.
   */
  const places: Record<string, unknown> = {};
  for (const h of [860, 1000, 1200]) {
    await page.evaluate((k) => { try { localStorage.removeItem(k as string); } catch { /* ignore */ } }, KEY);
    await qc(page, 1512, h);
    places[String(h)] = await page.evaluate((sel) => {
      const g = document.querySelector('[data-qcv="guide"]') as HTMLElement | null;
      const desk = (document.querySelector(sel) as HTMLElement).closest('[data-qcv="group"]')!
        .querySelector('[data-qcv="courts"]') as HTMLElement;
      if (!g) return null;
      const c = getComputedStyle(g), r = g.getBoundingClientRect(), d = desk.getBoundingClientRect();
      return { position: c.position, right: c.right, bottom: c.bottom,
               overDesk: r.top < d.bottom && r.bottom > d.top && r.left < d.right && r.right > d.left,
               fromFoot: Math.round(window.innerHeight - r.bottom) };
    }, P);
  }
  note("QC13place", places);
  for (const [h, p] of Object.entries(places)) {
    const q = p as { position: string; right: string; bottom: string; overDesk: boolean; fromFoot: number } | null;
    expect(q, `${h}: the guide did not show`).not.toBeNull();
    expect(q!.position, `${h}: the card is not fixed to the viewport`).toBe("fixed");
    expect(q!.right, `${h}: right`).toBe("28px");
    expect(q!.bottom, `${h}: the card moved off the window's foot`).toBe("28px");
    expect(q!.fromFoot, `${h}: the card is ${q!.fromFoot}px off the foot`).toBe(28);
    expect(q!.overDesk, `${h}: the card is sitting on the desk`).toBe(false);
  }

  note("QC13", { first, title, n, afterX, stored, afterReload, offered, afterMenu, backAt });
  expect(first, "the guide did not show on a first visit").toBe(true);
  expect(title, "the first step is not the reference's").toBe("Your desk, in three bands");
  expect(n.replace(/\s+/g, " ").toUpperCase()).toBe("1 OF 3");
  expect(afterX, "× did not dismiss it").toBe(false);
  expect(stored, "× did not record that it has been seen").toBe("1");
  expect(afterReload, "it came back on the next visit").toBe(false);
  expect(offered, "the help menu does not offer the guide").toBeGreaterThan(0);
  expect(afterMenu, "the help menu did not bring it back").toBe(true);
  expect(backAt?.replace(/\s+/g, " ").toUpperCase(), "it came back part-way through").toBe("1 OF 3");
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
    ["QC12", "QC13", "QC13place", "QC4", "QC6", "QC8"] /* QC1 retired by v131 (QC3) */,
  );
  expect(all.n, `only ${all.n} readings were written`).toBeGreaterThanOrEqual(6);
});
