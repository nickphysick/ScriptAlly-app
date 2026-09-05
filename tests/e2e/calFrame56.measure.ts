import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * THE TWO REF VIOLATIONS: a dashed border outside the closed state, and a container around a board
 * the ref says has none.
 */
test("⚠️ dashed is the closed state's alone", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const seen: Record<string, number> = {};
  let closed = 0, open = 0;
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    await page.waitForTimeout(400);
    const rows = await page.evaluate(`(() => {
      const vis = (e) => e.getBoundingClientRect().width > 0;
      return [...document.querySelectorAll(".tl-p")].filter(vis).map((c) => ({
        fam: [...c.classList].filter((x) => x !== "tl-p" && x.indexOf("tl-at") !== 0).join(" "),
        closed: c.classList.contains("closedp"),
        style: getComputedStyle(c.querySelector(".tl-frame") || c).borderTopStyle,
      }));
    })()`) as unknown as { fam: string; closed: boolean; style: string }[];
    for (const r of rows) {
      seen[`${r.style} :: ${r.fam || "(none)"}`] = (seen[`${r.style} :: ${r.fam || "(none)"}`] ?? 0) + 1;
      if (r.closed) closed += 1; else open += 1;
      /* the claim, per card */
      if (!r.closed) expect(r.style, `a card that is not closed paints ${r.style} (${r.fam})`).not.toBe("dashed");
    }
  }
  console.log(`border styles by family: ${JSON.stringify(seen, null, 0)}`);
  console.log(`cards — closed ${closed} · not closed ${open}`);
  /* ⚠️ BOTH POPULATIONS. "no open card is dashed" is satisfied by a board with no open cards, and
     the closed half of the claim is untested on a board with no closed ones. */
  expect(open, "no open card on the board, so the rule was not tested").toBeGreaterThan(3);
});

test("⚠️ nothing between the panel and the rows draws a box", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const r = await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().height > 0;
    const row = [...document.querySelectorAll(".tl-rrow")].filter(vis)[0];
    const panel = document.querySelector(".ws-window");
    if (!row || !panel) return null;
    const chain = []; let n = row.parentElement;
    while (n && n !== panel && chain.length < 20) {
      const cs = getComputedStyle(n);
      chain.push({
        cls: String(n.className).slice(0, 34),
        bw: cs.borderTopWidth, bs: cs.borderTopStyle, r: cs.borderTopLeftRadius,
        sh: cs.boxShadow === "none" ? "none" : "shadow",
      });
      n = n.parentElement;
    }
    const rb = row.getBoundingClientRect(), pb = panel.getBoundingClientRect();
    return { chain: chain, reachedPanel: n === panel,
      row: { x: Math.round(rb.left), w: Math.round(rb.width) },
      panel: { x: Math.round(pb.left), w: Math.round(pb.width) } };
  })()`) as unknown as any;
  expect(r, "no row or no panel on the page").not.toBeNull();
  /* ⚠️ THE WALK MUST HAVE REACHED THE PANEL, or "nothing between them draws a box" is a statement
     about however far the loop happened to get. */
  expect(r.reachedPanel, "the walk never reached the panel, so the chain is not the chain").toBe(true);
  expect(r.chain.length, "no element between the row and the panel, so nothing was inspected")
    .toBeGreaterThan(0);
  console.log(`between the row and the panel: ${r.chain.length} elements`);
  for (const c of r.chain) console.log(`  ${c.cls.padEnd(34)} bd ${c.bw} ${c.bs} · radius ${c.r} · ${c.sh}`);
  console.log(`row x${r.row.x} w${r.row.w} · panel x${r.panel.x} w${r.panel.w}`);
  /* ⚠️ RETARGETED BY v64 §A: the BOARDPANE is a box BY DESIGN — the page's one rounded card —
     so "nothing draws a box" became "exactly ONE thing does, and it is the boardpane". A second
     box in the chain is still the fault this case has always guarded. */
  const boxes = r.chain.filter((c: any) =>
    (c.bw !== "0px" && c.bs !== "none") || (c.r !== "0px" && c.r !== ""));
  expect(boxes.map((c: any) => String(c.cls)),
    "the chain's one box is the boardpane, and nothing else draws one")
    .toEqual(boxes.length ? ["tl-boardpane"] : []);
  expect(boxes.length, "the boardpane lost its own frame").toBe(1);
});
