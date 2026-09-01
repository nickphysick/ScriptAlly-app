import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * THE GHOST RING — the writer's next available move, standing just past the card's end.
 *
 * ⚠️ EVERY CASE HERE ASSERTS ITS POPULATION BEFORE IT ASSERTS ITS CLAIM, and says how many
 * subjects it found. Two rounds of this project were lost to filtered checks that ran on nothing:
 * a radius lock that passed for months because a fade bug left its filter empty, and a rail probe
 * that reported "unfounded" because at scroll-top no row can cross the rail. A filtered claim that
 * does not count its subjects is one upstream change away from proving nothing at all.
 */
const census = (page: import("@playwright/test").Page) => page.evaluate(`(() => {
  const vis = (e) => e.getBoundingClientRect().width > 0;
  const cards = [...document.querySelectorAll(".tl-p")].filter(vis);
  const ghosts = [...document.querySelectorAll(".tl-ghost")].filter(vis);
  const byRel = {};
  for (const c of cards) byRel[c.dataset.rel] = c;
  const rows = ghosts.map((g) => {
    const rel = g.dataset.ghostrel;
    const c = byRel[rel];
    const gb = g.getBoundingClientRect();
    const cb = c ? c.getBoundingClientRect() : null;
    return {
      rel: rel, kind: g.dataset.ghost || "",
      due: g.classList.contains("due"), yours: g.classList.contains("yours"),
      hasGlyph: !!g.querySelector("svg"), hasBadge: !!g.querySelector(".tl-ghostbang"),
      borderStyle: getComputedStyle(g).borderTopStyle,
      gap: cb ? Math.round((gb.left - cb.right) * 10) / 10 : null,
      hasCard: !!c,
      w: Math.round(gb.width), h: Math.round(gb.height),
    };
  });
  /* every writer-owed card that draws no ring, by the move its own pill names */
  const noRing = {};
  for (const c of cards) {
    if (ghosts.some((g) => g.dataset.ghostrel === c.dataset.rel)) continue;
    const p = c.querySelector(".tl-pill");
    const w = p ? p.textContent.trim() : "(no pill)";
    noRing[w] = (noRing[w] || 0) + 1;
  }
  return { cards: cards.length, rows: rows, noRing: noRing };
})()`) as Promise<{ cards: number; rows: any[]; noRing: Record<string, number> }>;

test("a ghost stands past its card's end, carries a glyph, and is 24px round", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  let seen = 0;
  const perRange: string[] = [];
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    await page.waitForTimeout(400);
    const c = await census(page);
    perRange.push(`${RANGE_LABELS[i]}: ${c.rows.length}`);
    seen += c.rows.length;

    /* ⚠️ POPULATION FIRST. "no ghost is misplaced" is satisfied by there being no ghosts, which is
       precisely the state this board was in before this round — zero at Month, one at 3 months. */
    expect(c.rows.length, `[${RANGE_LABELS[i]}] no ghost renders, so nothing was tested`)
      .toBeGreaterThan(0);
    expect(c.rows.filter((r) => !r.hasCard).map((r) => r.rel),
      `[${RANGE_LABELS[i]}] a ghost with no card of its own`).toEqual([]);
    expect(c.rows.filter((r) => (r.gap ?? -1) < 1).map((r) => `${r.rel} gap ${r.gap}`),
      `[${RANGE_LABELS[i]}] a ghost is not clear of its card's right edge`).toEqual([]);
    expect(c.rows.filter((r) => !r.hasGlyph).map((r) => r.rel),
      `[${RANGE_LABELS[i]}] a ghost carries no glyph — an empty ring names no move`).toEqual([]);
    expect(c.rows.filter((r) => r.w !== 24 || r.h !== 24).map((r) => `${r.rel} ${r.w}x${r.h}`),
      `[${RANGE_LABELS[i]}] a ghost is not 24px round`).toEqual([]);
  }
  console.log(`ghosts per range — ${perRange.join(" · ")} (total ${seen})`);
});

test("a due ghost is solid with a badge; one still ahead is dotted with none", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const all: any[] = [];
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    await page.waitForTimeout(400);
    all.push(...(await census(page)).rows);
  }
  const due = all.filter((r) => r.due), ahead = all.filter((r) => !r.due);
  console.log(`ghosts ${all.length} — due ${due.length} · still ahead ${ahead.length}`);
  /* ⚠️ BOTH BRANCHES, OR THE DISTINCTION IS UNTESTED. A board holding only one kind proves the
     kind it holds and says nothing about the treatment that separates them. */
  expect(due.length, "no due ghost on the board, so the solid variant is untested").toBeGreaterThan(0);
  expect(ahead.length, "no future ghost on the board, so the dotted variant is untested")
    .toBeGreaterThan(0);
  expect(due.filter((r) => r.borderStyle !== "solid" || !r.hasBadge).map((r) => r.rel),
    "a due ghost is not solid-with-badge").toEqual([]);
  expect(ahead.filter((r) => r.borderStyle !== "dotted" || r.hasBadge).map((r) => r.rel),
    "a ghost still ahead is not dotted-without-badge").toEqual([]);
});

test("⚠️ a ghost stays clear of its card even when that card is opened", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  /* the widest range gives the most tight cards, so the opened extent is largest here */
  await setRangeTo(page, RANGE_LABELS.length - 1);
  await page.waitForTimeout(500);
  const before = await census(page);
  const tightWithGhost = await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().width > 0;
    const ghosts = [...document.querySelectorAll(".tl-ghost")].filter(vis).map((g) => g.dataset.ghostrel);
    return [...document.querySelectorAll(".tl-p")].filter(vis)
      .filter((c) => c.hasAttribute("data-tight") && ghosts.indexOf(c.dataset.rel) >= 0)
      .map((c) => c.dataset.rel);
  })()`) as unknown as string[];
  console.log(`ghosts ${before.rows.length} · of those, on a TIGHT card: ${tightWithGhost.length}`
    + (tightWithGhost.length ? ` (${tightWithGhost.join(", ")})` : ""));
  /* ⚠️ THE POPULATION IS THE WHOLE POINT OF THIS CASE. A board with no card that is both clipped
     and ghosted cannot test what opening does, and a green here would mean only that. */
  expect(tightWithGhost.length,
    "no card is both clipped and ghosted, so opening was never tested").toBeGreaterThan(0);

  for (const rel of tightWithGhost) {
    await page.hover(`.tl-p[data-rel="${rel}"]`);
    await page.waitForTimeout(320);
    const gap = await page.evaluate(`(() => {
      const rel = ${JSON.stringify(rel)};
      const vis = (e) => e.getBoundingClientRect().width > 0;
      const c = [...document.querySelectorAll(".tl-p")].filter(vis).find((e) => e.dataset.rel === rel);
      const g = [...document.querySelectorAll(".tl-ghost")].filter(vis)
        .find((e) => e.dataset.ghostrel === rel);
      if (!c || !g) return null;
      return Math.round((g.getBoundingClientRect().left - c.getBoundingClientRect().right) * 10) / 10;
    })()`) as unknown as number | null;
    console.log(`  opened ${rel}: gap ${gap}`);
    expect(gap, `${rel}: the ghost is not clear of the opened card`).not.toBeNull();
    expect(gap as number, `${rel}: the ghost overlaps the opened card`).toBeGreaterThanOrEqual(1);
  }
});

test("⚠️ no ghost where the move has no named date, and none for an agency's own move", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const c = await census(page);
  console.log(`cards ${c.cards} · ghosts ${c.rows.length} · no ring: ${JSON.stringify(c.noRing)}`);
  expect(c.cards, "no card on the board").toBeGreaterThan(5);
  expect(c.rows.length, "no ghost renders, so the exclusions prove nothing").toBeGreaterThan(0);
  /* ⚠️ THE EXCLUSION THAT MATTERS: a ring is the WRITER'S next move, never a forecast of the
     agency's. An agent-held row whose pill is a status rather than a deed must draw none. */
  const agentHeld = ["Queried", "Partial Sent", "Full Sent"];
  const wrongly = c.rows.filter((r) => r.kind !== "nudge" && r.kind !== "close" && !r.yours);
  expect(wrongly.map((r) => `${r.rel} [${r.kind}]`),
    "a deed ghost on a row that is not the writer's").toEqual([]);
  /* and the population for that exclusion: agent-held rows exist and none of them drew a deed */
  const agentRows = agentHeld.reduce((n, w) => n + (c.noRing[w] ?? 0), 0);
  expect(agentRows, "no agent-held row on the board, so the exclusion is untested").toBeGreaterThan(0);
});
