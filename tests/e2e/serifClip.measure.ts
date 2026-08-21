/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PLAYFAIR DESCENDERS MUST NOT BE CLIPPED (masthead measure pack, §4).
 *
 * ⚠️ THE ORIGIN, BECAUSE THE MISTAKE WAS A CORRECT RULE APPLIED TO THE WRONG TYPE. `line-height: 1`
 * was right for the retired mono-uppercase band label: uppercase mono has no descenders, so a line
 * box the size of the em is exactly the ink. Playfair rendering mixed case does have them — the `y`
 * in "ScriptAlly", the `y` in "Query Centre" — and the same declaration cuts them off. The rule is
 * therefore narrow and absolute: **`line-height: 1` is only ever safe on uppercase-only text.**
 *
 * ⚠️ AND A FIXED HEIGHT WITH `overflow: hidden` DOES THE SAME THING BY A DIFFERENT ROUTE. A text
 * container is sized BY its line box, never by a number that happens to fit most glyphs.
 *
 * THE CHECK: `scrollHeight === clientHeight`. If a container is cropping its own content the
 * scrollable extent exceeds the visible box, whatever the cause — line-height, a fixed height, a
 * clamp. It asks the browser what is actually cut rather than reading declarations back.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

interface Probe { sel: string; what: string }

/** every Playfair element in chrome, and the box that could crop it */
const CHROME: Probe[] = [
  /* ⚠️ THE BRAND WAS FOUND BY SCANNING, NOT BY GUESSING A CLASS NAME. The pack reported "the top
     breadcrumb bar — ScriptAlly and the breadcrumb's page name, both clipped". Half of that was
     right: the BREADCRUMB runs at 1.5× and is whole, and the clipped "ScriptAlly" is the SIDEBAR's
     wordmark (`.ws-bwm`) sitting in the same top band. A probe list written from the description
     would have fixed a page that was not broken and left the real one alone. */
  { sel: ".ws-bwm", what: "the sidebar brand — “ScriptAlly”" },
  { sel: ".ws-croot", what: "the breadcrumb's root" },
  { sel: ".ws-seg", what: "a breadcrumb section segment" },
  { sel: ".ws-cur", what: "the breadcrumb's current page" },
  { sel: ".ws-sep", what: "the breadcrumb separator" },
  { sel: ".wsh-title", what: "the masthead title" },
];

const measure = (page: Page, sels: string[]) => page.evaluate((list) => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const out: Record<string, unknown>[] = [];
  for (const sel of list) {
    /* ⚠️ THE DISPLAYED ONE. The workspace keeps every page mounted and toggles `display`, so "the
       first match" is routinely an off-screen page's element with a zero box — which reports
       scrollHeight === clientHeight === 0 and passes while measuring nothing. */
    const el = [...document.querySelectorAll(sel)].find((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement | undefined;
    if (!el) { out.push({ sel, present: false }); continue; }
    const cs = getComputedStyle(el);
    out.push({
      sel,
      present: true,
      text: (el.textContent ?? "").trim().slice(0, 24),
      font: cs.fontFamily.split(",")[0].replace(/["']/g, ""),
      size: cs.fontSize,
      lineHeight: cs.lineHeight,
      /* the ratio, so a failure says WHY rather than only that something is short */
      ratio: r(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)),
      clientH: el.clientHeight,
      scrollH: el.scrollHeight,
      overflow: cs.overflow,
      /**
       * ⚠️ AN ANCESTOR CAN CROP TEXT THE ELEMENT ITSELF REPORTS AS WHOLE, and that is the half a
       * `scrollHeight === clientHeight` check cannot see. The element's own box is fine; the pixels
       * are still gone, because something above it clips. Every ancestor with a non-visible
       * overflow is compared against the element's rect, and the first one that cuts it is named.
       */
      croppedBy: (() => {
        const b = el.getBoundingClientRect();
        let a = el.parentElement;
        while (a && a !== document.body) {
          const acs = getComputedStyle(a);
          if (acs.overflowY !== "visible") {
            const ab = a.getBoundingClientRect();
            /* the ancestor's PADDING box is what clips — borders do not scroll away */
            const top = ab.top + a.clientTop;
            const bottom = top + a.clientHeight;
            if (b.bottom > bottom + 0.5 || b.top < top - 0.5) {
              return `${(a.className || a.tagName).toString().split(" ")[0]} (cuts ${r(Math.max(0, b.bottom - bottom))}px below, ${r(Math.max(0, top - b.top))}px above)`;
            }
          }
          a = a.parentElement;
        }
        return "";
      })(),
    });
  }
  return out;
}, sels);

/**
 * ⚠️ IT COLLECTS EVERY OFFENDER RATHER THAN THROWING AT THE FIRST. A clipping bug of this kind is
 * rarely in one place — the same declaration gets copied — and a lock that stops at the first makes
 * you fix, re-run, fix, re-run. One run should name all of them. Proven immediately: the pack named
 * two sites and the first run found a third.
 */
const faults: string[] = [];

const check = (rows: Record<string, unknown>[], probes: Probe[], lines: string[]) => {
  for (const p of probes) {
    const row = rows.find((x) => x.sel === p.sel);
    if (!row || !row.present) { lines.push(`   ${p.sel.padEnd(16)} — not rendered here`); continue; }
    /**
     * ⚠️ A BOX THAT DOES NOT CLIP CANNOT CROP, and `scrollHeight` reports overflow either way. The
     * settled masthead title measured 37px of scroll in a 29px box and nothing was cut: its
     * `overflow` is `visible`, and what overflowed was the `PRO` pill — an ornament positioned
     * ABSOLUTELY for the express purpose of staying out of the title's line box.
     *
     * ⚠️ THIS DOES NOT WEAKEN THE THREE REAL CASES. Every one of them clips: `.ws-bwm` and
     * `.wpg-mini-name` carry `overflow: hidden` for their ellipsis truncation, and an ancestor cut
     * is a separate reading with its own branch. What is removed is a flag on a box that paints
     * every pixel it reports.
     *
     * ⚠️ AND THE RATIO CHECK IS UNTOUCHED, which is the half that matters most here: a Playfair box
     * under 1.3× is reported whether or not today's string happens to have a descender in it.
     */
    const clips = String(row.overflow) !== "visible";
    const clipped = row.scrollH !== row.clientH && clips;
    const cropped = !!row.croppedBy;
    const serif = String(row.font).toLowerCase().includes("playfair");
    const tight = serif && Number(row.ratio) < 1.3;
    lines.push(
      `   ${p.sel.padEnd(16)} "${row.text}" ${row.font} ${row.size}/${row.lineHeight} (${row.ratio}×) ` +
      `client ${row.clientH} scroll ${row.scrollH}${clipped ? "  ⚠ CLIPPED" : ""}${row.scrollH !== row.clientH && !clips ? "  (overflows, not clipped)" : ""}${tight ? "  ⚠ TIGHT" : ""}` +
      `${cropped ? `  ⚠ CROPPED BY ${row.croppedBy}` : ""}`);
    if (cropped) {
      faults.push(`${p.what} (${p.sel}) is CROPPED BY AN ANCESTOR — ${row.croppedBy}. Its own box is whole; something above it is cutting the pixels.`);
    }
    if (clipped) {
      faults.push(`${p.what} (${p.sel}) is CLIPPED — ${row.scrollH}px of text in a ${row.clientH}px box, at line-height ${row.lineHeight} (${row.ratio}×)`);
    }
    /* ⚠️ TIGHTNESS IS A SEPARATE FAULT FROM CLIPPING, and it is the one that hides. A box can happen
       not to clip at 1.02 because the STRING has no descender — "Dashboard" survives where "Query
       Centre" does not — so a ratio check catches the page that has not been visited yet. */
    if (tight) {
      faults.push(`${p.what} (${p.sel}) is Playfair at ${row.ratio}× — mixed case needs 1.3 or more, or the next descender is cut`);
    }
  }
};

test("no Playfair in the shell's chrome is cropped by its own box", async ({ page }) => {
  const lines: string[] = [];

  /* ⚠️ A ROUTE WHOSE NAME ACTUALLY HAS A DESCENDER. "Dashboard" has none, so it would pass on a
     clipped box and prove nothing — the precondition this pack keeps re-learning. "Query Centre"
     carries a `y`, and its breadcrumb reads "ScriptAlly / Queries / Query Centre": descenders in
     the root, the section and the page at once. */
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  lines.push("\n══ /queries — the top bar and the masthead");
  const withDescender = await page.evaluate(() =>
    [...document.querySelectorAll(".ws-croot, .ws-cur, .wsh-title")]
      .map((e) => (e.textContent ?? "")).join(" "));
  expect(/[gjpqy]/.test(withDescender), `the sampled chrome carries no descender at all ("${withDescender}") — this case would pass on a clipped box`).toBe(true);
  check(await measure(page, CHROME.map((c) => c.sel)), CHROME, lines);

  /**
   * ⚠️ THE SETTLED POSTURE TOO (pinned chrome, §2). The settled title is 22px Playfair rendering the
   * same mixed-case page name, so the rule that made `line-height: 1` a bug at 30 makes it a bug
   * here — and a title checked only at rest is checked in the posture the reader spends least time
   * in. Measured on a SCROLLING page, because a fill page cannot pin and so has no settled posture.
   *
   * ⚠️ AND ON SUBMISSION PACKAGES SPECIFICALLY, BECAUSE ITS NAME HAS A DESCENDER IN IT. My first
   * version used Contact list — five scrolling pages and only one of their titles carries a `g`.
   * The precondition caught it immediately, which is the whole reason it is written before the
   * claim: "Contact list" would have passed on a box clipping every descender it never renders.
   */
  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(700);
  const settled = await page.evaluate(() => {
    const g = [...document.querySelectorAll(".wpg.pkgw-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const t = g.querySelector(".wsh-title") as HTMLElement | null;
    return { size: t ? getComputedStyle(t).fontSize : "-", text: t?.textContent ?? "" };
  });
  /* the precondition: it actually settled, and the sample actually has a descender in it */
  expect(settled.size, "the chrome did not settle — the check below would be about the resting title").toBe("22px");
  expect(/[gjpqy]/.test(settled.text), `the settled title ("${settled.text}") carries no descender — this would pass on a clipped box`).toBe(true);
  lines.push("\n══ /manuscripts/packages — settled");
  check(await measure(page, [".wsh-title"]), [{ sel: ".wsh-title", what: "the settled masthead title" }], lines);

  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  /* the folded bar — only exists once a fill page's masthead is hidden */
  const pt = await page.evaluate(() => {
    const g = [...document.querySelectorAll(".wpg.qc-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const b = (g.querySelector(".wpg-mast-hide") as HTMLElement).getBoundingClientRect();
    return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2), ok: b.height > 0 && b.bottom < window.innerHeight };
  });
  expect(pt.ok, "Hide is not on screen — the folded bar cannot be reached").toBe(true);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(600);
  lines.push("\n══ /queries — folded");
  check(await measure(page, [".wpg-mini-name"]), [{ sel: ".wpg-mini-name", what: "the folded bar's page name" }], lines);

  console.log(lines.join("\n"));
  expect(faults, `${faults.length} Playfair box(es) in chrome crop their own text:\n  · ${faults.join("\n  · ")}`).toEqual([]);
});
