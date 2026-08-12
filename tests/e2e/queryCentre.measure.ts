/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre — the four figures §5 demands BEFORE converting, at both viewports.
 *
 * ⚠️ THE THRESHOLD IS WORKING AREA, NOT TIDINESS. Converting swaps a compact header block for the
 * grid's 96px plate + 20px gap. If that costs the panes materially more height than it returns, the
 * conversion is wrong for this page and the spec says stop and report rather than proceed.
 */
import { test } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";

for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  test(`Query Centre · ${vp.width}x${vp.height}`, async ({ page }) => {
    await openRoute(page, "/queries", vp);
    const sbw = await scrollbarWidth(page);
    const m = await page.evaluate(() => {
      const r = (n: number) => Math.round(n * 10) / 10;
      const box = (sel: string) => {
        const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { h: r(b.height), w: r(b.width), top: r(b.top), left: r(b.left) };
      };
      const cs = getComputedStyle(document.documentElement);
      return {
        viewportH: document.documentElement.clientHeight,
        headerBlock: box(".f12-hd2"),        // the header seat as it stands today
        chips: box(".f12-chips"),            // the active-filter row under it
        toolbar: box(".f12-ctl"),            // the pane's own control row
        listPane: box(".f12-list"),          // the two panes — the working area at stake
        detailPane: box(".f12-detail"),
        body: box(".f12-body"),
        plateH: parseFloat(cs.getPropertyValue("--wsh-plate-h")) || 0,
        gap: parseFloat(cs.getPropertyValue("--wsh-plate-gap")) || 0,
        topGap: parseFloat(cs.getPropertyValue("--content-top-gap")) || 0,
      };
    });
    /* ⚠️ MEASURE THE WHOLE STACK, NOT ONE ELEMENT AGAINST THREE TOKENS. The first version compared
       `.f12-hd2`'s 81px against plate+gap+topGap and reported a 53px loss — but the page also has a
       control row and padding between that header and the panes, and the honest comparison is
       header-top to pane-top: everything the conversion actually replaces. */
    const chromeNow = (m.listPane?.top ?? 0) - (m.headerBlock?.top ?? 0);
    const chromeAfter = m.plateH + m.gap + m.topGap;
    console.log(`\n══ Query Centre ${vp.width}x${vp.height}  scrollbar ${sbw}px — ${sbw >= 10 ? "CLASSIC" : "OVERLAY ⚠️"}`);
    console.log(`  viewport height        ${m.viewportH}`);
    console.log(`  1 · header block NOW   ${JSON.stringify(m.headerBlock)}`);
    console.log(`  2 · chips row          ${JSON.stringify(m.chips)}`);
    console.log(`  3 · list pane          ${JSON.stringify(m.listPane)}`);
    console.log(`  4 · detail pane        ${JSON.stringify(m.detailPane)}`);
    console.log(`      body / toolbar     ${JSON.stringify(m.body)} / ${JSON.stringify(m.toolbar)}`);
    console.log(`  toolbar row            ${JSON.stringify(m.toolbar)}`);
    console.log(`  chrome now (hdr-top→pane-top) ${Math.round(chromeNow*10)/10}   chrome after conversion ${chromeAfter} (plate ${m.plateH} + gap ${m.gap} + topGap ${m.topGap})`);
    console.log(`  ⇒ working area change ${chromeNow - chromeAfter > 0 ? "+" : ""}${Math.round((chromeNow - chromeAfter) * 10) / 10}px`);
  });
}
