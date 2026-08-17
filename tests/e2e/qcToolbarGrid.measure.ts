/**
 * §3 — the toolbar shares the content's grid, measured on the running page.
 *
 * ⚠️ THE CLAIM IS "THE SAME GRID, NOT A MATCHING PAIR OF NUMBERS", and a source lock cannot tell
 * those apart: a duplicated `320px` in the toolbar reads identically to a shared track until the
 * list width is retuned. What CAN be told apart is the rendered boundary — so the run compares the
 * toolbar cell's edges to the content cell's at three widths. Two numbers that agree at 1024, 1440
 * AND 1920 while the columns are elastic (`--listw` plus a reclaim that varies with the panel) are
 * not a coincidence; a hard-coded copy drifts at the first width where the reclaim differs.
 *
 *   SA_E2E_BASE_URL=http://localhost:3000 npx playwright test --project=measure qcToolbarGrid
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

for (const width of [1024, 1440, 1920]) {
  test(`§3c — the toolbar's column boundary equals the content's @${width}`, async ({ page }) => {
    await openRoute(page, "/queries", { width, height: 900 });
    await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(200);

    const m = await page.evaluate(() => {
      const r = (n: number) => Math.round(n * 10) / 10;
      const q = (s: string) => document.querySelector(s) as HTMLElement | null;
      const box = (e: Element | null) => e ? e.getBoundingClientRect() : null;
      const body = q(".f12-body")!;
      const cells = { lhead: box(q(".qc-lhead")), phead: box(q(".qc-phead")), list: box(q(".f12-list")), pane: box(q(".qp-pane")) };
      /* ⚠️ THE GRID ITSELF, read once — if the four cells are placed in it, they cannot disagree */
      const tracks = getComputedStyle(body).gridTemplateColumns;
      const btns = [...document.querySelectorAll(".qc-phead .qc-btn")].map((b) => {
        const cs = getComputedStyle(b as HTMLElement);
        return { label: (b.textContent || "").trim() || (b.getAttribute("aria-label") ?? "icon"), bg: cs.backgroundColor, bw: cs.borderTopWidth, x: r(b.getBoundingClientRect().left) };
      });
      const lhead = [...document.querySelectorAll(".f12-lhead > *")].map((e) => ({
        cls: (e as HTMLElement).className.split(" ")[0], h: r(e.getBoundingClientRect().height), top: r(e.getBoundingClientRect().top),
      }));
      return {
        tracks,
        left: { toolbar: r(cells.lhead!.left), content: r(cells.list!.left) },
        boundary: { toolbar: r(cells.phead!.left), content: r(cells.pane!.left) },
        right: { toolbar: r(cells.phead!.right), content: r(cells.pane!.right) },
        btns, lhead,
        seps: document.querySelectorAll(".qc-phead .qc-sep").length,
        /* ⚠️ THE STRUCTURAL PROOF, which no pair of numbers can give. Equal edges at three widths
           is strong evidence; four children of ONE element placed in ONE `grid-template-columns`
           is the claim itself. A duplicated track in a second container would show up here as a
           different parent even while every number still matched. */
        sameParent: [q(".qc-lhead"), q(".qc-phead"), q(".f12-list"), q(".qp-pane")].every((e) => e?.parentElement === body),
        placed: [q(".qc-lhead"), q(".qc-phead"), q(".f12-list"), q(".qp-pane")].map((e) => e ? `${getComputedStyle(e).gridColumnStart}/${getComputedStyle(e).gridRowStart}` : "—"),
      };
    });
    console.log(`@${width} tracks=${m.tracks}\n  left ${m.left.toolbar}/${m.left.content} · boundary ${m.boundary.toolbar}/${m.boundary.content} · right ${m.right.toolbar}/${m.right.content}`);
    console.log(`  verbs: ${m.btns.map((b) => `${b.label}@${b.x} ${b.bg} ${b.bw}`).join(" | ")}`);
    console.log(`  search row: ${m.lhead.map((e) => `${e.cls} h${e.h} top${e.top}`).join(" | ")}`);

    /* ⚠️ ONE GRID, ASSERTED STRUCTURALLY FIRST. The edge comparisons below are the symptom; this
       is the cause, and it is what survives a retune of the list's width. */
    expect(m.sameParent, `a cell left .f12-body — the toolbar would be aligning by coincidence: ${m.placed.join(" ")}`).toBe(true);
    expect(m.placed, `the four cells are not placed in the two columns: ${m.placed.join(" ")}`).toEqual(["1/1", "2/1", "1/2", "2/2"]);

    /* the three edges the two rows share */
    expect(m.left.toolbar, "the toolbar's left edge left the list's").toBe(m.left.content);
    expect(m.boundary.toolbar, "the toolbar's column boundary left the content's").toBe(m.boundary.content);
    expect(m.right.toolbar, "the toolbar's right edge left the pane's").toBe(m.right.content);

    /* §3b — no filled ground on any verb; the primary is a thicker rim and nothing else */
    const grounds = new Set(m.btns.map((b) => b.bg));
    expect([...grounds], `a toolbar button has a ground of its own: ${[...grounds].join(", ")}`).toHaveLength(1);
    const widths = m.btns.map((b) => parseFloat(b.bw));
    expect(Math.max(...widths), "the primary's rim is not thicker than the rest").toBeGreaterThan(Math.min(...widths));

    /* §3c — Delete is furthest right, the gap carries the division */
    const del = m.btns.find((b) => b.label === "Delete")!;
    expect(del.x, "Delete is not the rightmost verb").toBe(Math.max(...m.btns.map((b) => b.x)));
    expect(m.seps, "a divider came back between the verb groups").toBe(0);

    /* §3a — the three controls in the search row share a height and a top */
    expect(m.lhead.length, "the search row does not hold three controls").toBe(3);
    expect(new Set(m.lhead.map((e) => e.h)).size, `the search row's controls differ in height: ${m.lhead.map((e) => e.h).join(", ")}`).toBe(1);
    expect(new Set(m.lhead.map((e) => e.top)).size, "the search row's controls do not share a baseline").toBe(1);
  });
}
