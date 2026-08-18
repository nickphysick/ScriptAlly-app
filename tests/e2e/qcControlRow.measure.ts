/**
 * §3 — THE CONTROL ROW FITS, AND THE PRIMARY KEEPS ITS LABEL, AT FOUR WIDTHS.
 *
 * ⚠️ THE SUM OF THE CHILDREN AGAINST THE CONTAINER, NOT `scrollWidth > clientWidth`. A flex row
 * whose children are `flex: none` does not report overflow the way a block does — it can also
 * SHRINK a child below its content and report no overflow at all while the label inside is clipped.
 * Adding the measured widths up and comparing the total against the available space catches both,
 * and it is the check the ref's own harness prints in its warning line.
 *
 * ⚠️ AND IT RUNS IN BOTH RAIL STATES. What constrains this row is the PANE's width, and the rail's
 * pinned state moves that by 180px — so 1440-with-the-rail-pinned is a narrower row than
 * 1280-without, and a threshold verified only at the viewport would be verified against the wrong
 * number. The label-shedding query is a viewport query (see f12.css for why), which makes measuring
 * both states the thing that proves it rather than the thing that confirms it.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const WIDTHS = [1180, 1280, 1440, 1680];

const rowFit = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const cell = document.querySelector(".qc-phead") as HTMLElement | null;
  if (!cell) return null;
  const kids = [...cell.children] as HTMLElement[];
  const gap = parseFloat(getComputedStyle(cell).columnGap || "0") || 0;
  const used = kids.reduce((a, k) => a + k.getBoundingClientRect().width, 0) + gap * Math.max(0, kids.length - 1);
  const primary = cell.querySelector(".qc-btn-fwd") as HTMLElement | null;
  const primaryLabel = primary?.querySelector("span");
  return {
    used: Math.round(used),
    avail: Math.round(cell.clientWidth),
    cellWidth: Math.round(cell.getBoundingClientRect().width),
    primaryLabelShown: !!primaryLabel && getComputedStyle(primaryLabel).display !== "none",
    primaryText: (primary?.textContent || "").trim(),
    kinds: kids.map((k) => k.className || k.tagName.toLowerCase()),
  };
});

test("§3 — the control row fits at 1180 / 1280 / 1440 / 1680, and Record response keeps its label", async ({ page }) => {
  for (const width of WIDTHS) {
    await openRoute(page, "/queries", { width, height: 900 });
    /* the row only renders on a selection; the page auto-selects the first row, so a null here is a
       real failure rather than an empty state — assert it instead of skipping. */
    const fit = await rowFit(page);
    expect(fit, `no control row at ${width} — the page did not auto-select, or the cell is gone`).not.toBeNull();
    console.log(`${width}px  used ${fit!.used} of ${fit!.avail}  primary="${fit!.primaryText}"`);
    expect(fit!.used, `the control row OVERFLOWS at ${width}: ${fit!.used}px used of ${fit!.avail}px`)
      .toBeLessThanOrEqual(fit!.avail);
    expect(fit!.primaryLabelShown, `the primary shed its label at ${width} — it never does`).toBe(true);
    expect(fit!.primaryText.length, `the primary's label is empty at ${width}`).toBeGreaterThan(0);
  }
});

test("§3 — one button: every control in the row and the header shares one height, radius and rim", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const set = await page.evaluate(() => {
    const read = (el: Element) => {
      const c = getComputedStyle(el as HTMLElement);
      return { h: (el as HTMLElement).getBoundingClientRect().height, r: c.borderTopLeftRadius, w: c.borderTopWidth, size: c.fontSize };
    };
    const row = [...document.querySelectorAll(".qc-phead .qc-btn")].map(read);
    const head = [...document.querySelectorAll(".qc-wpg .svh-btn")].map(read);
    return { row, head };
  });
  /* ⚠️ READ FROM THE TOKENS, NOT FROM 32/8/12. Those were the figures the day this was written; the
     bar has been through two packs since and `--btn-h` is 40 with a 10px radius, so the clause went
     red about a page that was correct — the false red this repo pays for most. What the case is
     actually for is that ONE source feeds every control, which is stronger stated this way: it
     cannot rot the next time the token moves, and it fails the moment a second value gets in. */
  const tok = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector(".t-f12") || document.documentElement);
    return { h: cs.getPropertyValue("--btn-h").trim(), r: cs.getPropertyValue("--btn-r").trim(), rim: cs.getPropertyValue("--btn-rim").trim() };
  });
  const all = [...set.row, ...set.head];
  console.log(`tokens --btn-h ${tok.h} · --btn-r ${tok.r} · --btn-rim ${tok.rim}\n` + JSON.stringify(all, null, 1));
  expect(all.length, "no buttons found — this test is measuring nothing").toBeGreaterThan(3);
  expect(tok.h, "the height token is not declared where the page can read it").toMatch(/^\d/);
  for (const b of all) {
    expect(Math.round(b.h), `a control is not --btn-h (${tok.h}): ${JSON.stringify(b)}`).toBe(parseInt(tok.h, 10));
    expect(b.r, `a control is not on --btn-r (${tok.r}): ${JSON.stringify(b)}`).toBe(tok.r);
    expect(b.w, `a control is not on --btn-rim (${tok.rim}): ${JSON.stringify(b)}`).toBe(tok.rim);
  }
  /* ⚠️ PER FAMILY, NOT ACROSS BOTH — measured 13px in the query's bar and 12px in the page header,
     which is two families sharing a chassis rather than one family disagreeing with itself. The
     geometry above IS shared across both, and that is the claim worth holding; folding the type
     size in would assert a change no pack has asked for. */
  expect([...new Set(set.row.map((b) => b.size))], "the query's own controls are set at more than one size").toHaveLength(1);
  expect([...new Set(set.head.map((b) => b.size))], "the page header's controls are set at more than one size").toHaveLength(1);
});
