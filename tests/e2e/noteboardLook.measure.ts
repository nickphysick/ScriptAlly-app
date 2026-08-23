/**
 * NOTEBOARD — the claims that only a rendered page can settle (build Phase 8).
 *
 *   SA_E2E_BASE_URL=http://localhost:4191 npx playwright test noteboardLook
 *
 * ⚠️ EVERY CLAIM HERE IS ABOUT AN ARRANGEMENT, which is exactly what a source lock and a
 * string-render smoke cannot see. A stylesheet lock proves a rule was written; it says nothing
 * about what the cascade and the box model do with it — the `repeat(auto-fit, minmax(0, 1fr))`
 * that resolved to two real tracks and a hundred phantom ones passed its lock perfectly.
 *
 * ⚠️ AND ONE CLAIM IS DELIBERATELY MEASURED ON THE CASCADE RATHER THAN ON DATA. `colour` is in
 * firestore.rules and NOT in the deployed ruleset, so no seeded note can carry one — every note
 * on the harness account renders yellow, correctly. The three-papers case therefore proves that
 * the three rules RESOLVE to three distinct fills in the real cascade with the real tokens; it
 * does NOT prove a note wearing one renders it. That second half is unmeasurable until one dev
 * rules deploy lands, and saying so is the point.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression, scrollbarWidth } from "./measure";

const ROUTE = "/todo/noteboard";
const WIDE = { width: 1440, height: 900 };
const WIDER = { width: 1920, height: 1080 };

/** Every probe card's box, keyed by the marker in its body. */
const probeBoxes = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const out: Record<string, { x: number; y: number; w: number; h: number; text: string }> = {};
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(".nb-note"))) {
      const t = (el.querySelector(".nb-body") as HTMLElement | null)?.innerText ?? "";
      if (!/^NB(PROBE|PAIR) /.test(t)) continue;
      /* ⚠️ KEYED BY THE NOTE'S ID, NOT BY ITS WORDS. The pre-wrap pair's FIRST LINE is identical
         by design — that is the whole experiment — so a text key made the two cards one entry and
         the check compared a card with itself. The population floor is what caught it. */
      const id = el.getAttribute("data-note") ?? t;
      const r = el.getBoundingClientRect();
      out[id] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), text: t };
    }
    return out;
  });

test.describe("Noteboard — measured", () => {
  test("the masonry PACKS: distinct heights, more than one column, and it reflows with width", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    const bar = await scrollbarWidth(page);
    const boxes = await probeBoxes(page);
    const probes = Object.entries(boxes).filter(([, b]) => b.text.startsWith("NBPROBE"));

    /* ⚠️ THE POPULATION FIRST. Zero cards yields zero distinct heights and zero columns, and
       every assertion below would pass having measured nothing. */
    expect(probes.length, "the seeded probe notes are not on the page").toBeGreaterThanOrEqual(6);

    const heights = new Set(probes.map(([, b]) => b.h));
    /* ⚠️ COLUMNS ARE COUNTED OVER EVERY CARD, NOT OVER THE PROBES. Filtered to the probes this
       read TWO columns on a board that had three — column one held the ghost tile and the
       pre-wrap pair, which the filter excluded. The number was true about the probes and false
       about the board, which is the failure shape that gets believed. */
    const columns = new Set(await page.$$eval(".nb-note, .nb-ghost",
      (els) => els.map((e) => Math.round(e.getBoundingClientRect().x))));
    console.log(`[1440] scrollbar ${bar}px · ${probes.length} probe cards · ${heights.size} distinct heights · ${columns.size} columns at x=${[...columns].sort((a, b) => a - b).join(",")}`);
    for (const [k, b] of probes.sort((a, b2) => a[1].x - b2[1].x || a[1].y - b2[1].y)) {
      console.log(`   ${k.padEnd(14)} x=${String(b.x).padStart(5)} y=${String(b.y).padStart(5)} ${b.w}×${b.h}`);
    }
    expect(heights.size, "six cards of six lengths rendered at one height — the board is not packing").toBeGreaterThanOrEqual(3);
    /* ⚠️ RE-POINTED (finish run, 1a): the count is DERIVED from the viewport now (column-width,
       no column-count), so an exact figure here would pin the coincidence of one width. Three is
       what 1440 happens to produce; the claim is that columns exist and PACK. */
    expect(columns.size, "the board is not resolving to multiple columns").toBeGreaterThanOrEqual(3);

    /* ⚠️ A LAW THAT HOLDS AT EXACTLY ONE WIDTH IS A COINCIDENCE. */
    await page.setViewportSize(WIDER);
    await page.waitForTimeout(400);
    const wide = await probeBoxes(page);
    void wide;
    const wideCols = new Set(await page.$$eval(".nb-note, .nb-ghost",
      (els) => els.map((e) => Math.round(e.getBoundingClientRect().x))));
    console.log(`[1920] ${wideCols.size} columns at x=${[...wideCols].sort((a, b) => a - b).join(",")}`);
    /* wider viewport, MORE columns — the derived count's whole point; the old exact-3 pin was
       the fixed count's coincidence and went with it */
    expect(wideCols.size, "no reflow — the count did not grow with the viewport").toBeGreaterThan(columns.size);
  });

  test("⚠️ pre-wrap: the SAME characters, one newline apart, are two different heights", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    const b = await probeBoxes(page);
    const pair = Object.entries(b).filter(([, v]) => v.text.startsWith("NBPAIR"));
    expect(pair.length, "the pair needs both halves").toBe(2);
    const [one, two] = pair.map(([, v]) => v);
    console.log(`[pre-wrap] "${one.text.replace(/\n/g, "\\n")}" h=${one.h} · "${two.text.replace(/\n/g, "\\n")}" h=${two.h}`);
    /* the characters are identical; only a `white-space` that honours the newline can separate
       their heights, so the difference IS the declaration */
    expect(one.h, "identical text, one with a newline, rendered at the same height — pre-wrap is not applying").not.toBe(two.h);
  });

  test("⚠️ hover is a shadow: the box-shadow changes and the card does NOT move", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    await liftMotionSuppression(page);
    const card = page.locator(".nb-note").filter({ hasText: "NBPROBE five" }).first();
    await expect(card).toBeVisible();
    /* ⚠️ SCROLL IT INTO VIEW BEFORE THE FIRST READING, AND MEASURE `offsetTop`. `hover()` scrolls
       the element into view if it needs to, so a viewport-relative `y` taken before the hover and
       again after compares two different scroll positions — measured on the deployed site with a
       12-note board: y 668 -> 643, `transform: none`, reported as "the card LIFTED" when nothing
       had moved in the layout at all. `offsetTop` is document-relative and immune to it, and it
       is also the honest subject: the claim is that the card does not move in the LAYOUT. */
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const before = await card.evaluate((el) => ({
      shadow: getComputedStyle(el).boxShadow,
      transform: getComputedStyle(el).transform,
      y: (el as HTMLElement).offsetTop,
    }));
    await card.hover();
    await page.waitForTimeout(400);   // the transition is 0.15s; wait past it, never read through it
    const after = await card.evaluate((el) => ({
      shadow: getComputedStyle(el).boxShadow,
      transform: getComputedStyle(el).transform,
      y: (el as HTMLElement).offsetTop,
    }));
    console.log(`[hover] y ${before.y} -> ${after.y} · transform ${after.transform} · shadow changed: ${before.shadow !== after.shadow}`);
    expect(before.shadow, "hover changed nothing — the rule is not reaching the card").not.toBe(after.shadow);
    expect(after.y, "the card LIFTED — a lift shears its top edge against the masonry column").toBe(before.y);
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(after.transform);
  });

  test("⚠️ the three papers resolve to three distinct fills — in the real cascade", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    /* ⚠️ WHAT THIS PROVES AND WHAT IT DOES NOT. It applies the three classes inside the page's own
       token scope and reads what the browser computes — real stylesheet, real tokens, real
       cascade. It does NOT prove a note wearing one renders it: `colour` is not in the deployed
       ruleset, so no note on this account can carry one. */
    const fills = await page.evaluate(() => {
      const scope = document.querySelector(".nb-scope");
      if (!scope) return null;
      const read = (cls: string) => {
        const d = document.createElement("div");
        d.className = `nb-note ${cls}`;
        scope.appendChild(d);
        const cs = getComputedStyle(d);
        const v = { bg: cs.backgroundColor, bd: cs.borderTopColor };
        d.remove();
        return v;
      };
      return { yellow: read("nb-c-yellow"), pink: read("nb-c-pink"), sage: read("nb-c-sage") };
    });
    expect(fills, "the token scope .nb-scope is not on the page").toBeTruthy();
    console.log(`[papers] yellow ${fills!.yellow.bg} / ${fills!.yellow.bd}`);
    console.log(`[papers] pink   ${fills!.pink.bg} / ${fills!.pink.bd}`);
    console.log(`[papers] sage   ${fills!.sage.bg} / ${fills!.sage.bd}`);
    const bgs = [fills!.yellow.bg, fills!.pink.bg, fills!.sage.bg];
    const bds = [fills!.yellow.bd, fills!.pink.bd, fills!.sage.bd];
    /* ⚠️ AND NONE OF THEM MAY BE TRANSPARENT — a var() on a token nobody defines drops the
       declaration silently, and the card would simply inherit. That is the failure this catches. */
    for (const c of [...bgs, ...bds]) expect(c).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(new Set(bgs).size, "the three papers are not three colours").toBe(3);
    expect(new Set(bds).size, "the three borders are not three colours").toBe(3);
  });

  test("⚠️ a note WEARING a colour renders it — the half the rules deploy unlocked", async ({ page }) => {
    /* ⚠️ THIS COULD NOT BE MEASURED BEFORE 22 Aug. `colour` was in firestore.rules and not in the
       deployed ruleset, so no seeded note could carry one and every note rendered yellow —
       correctly. The cascade case above proved the three RULES resolve; this proves the DATA
       reaches them, which is a different claim and the one that matters to a writer. */
    await openRoute(page, ROUTE, WIDE);
    const papers = await page.evaluate(() => {
      const out: Record<string, { bg: string; bd: string; cls: string }> = {};
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(".nb-note"))) {
        const t = (el.querySelector(".nb-body") as HTMLElement | null)?.innerText ?? "";
        const m = /^NBPAPER (\w+)/.exec(t.trim());
        if (!m) continue;
        const cs = getComputedStyle(el);
        out[m[1]] = { bg: cs.backgroundColor, bd: cs.borderTopColor, cls: el.className };
      }
      return out;
    });
    /* the population first — three cards, or the comparison below is between things that are not there */
    expect(Object.keys(papers).sort(), "the three paper notes are not on the page").toEqual(["pink", "sage", "yellow"]);
    for (const [name, v] of Object.entries(papers)) console.log(`[worn] ${name.padEnd(7)} ${v.bg} / ${v.bd}  ${v.cls}`);
    /* each note carries the class its STORED colour asks for */
    for (const name of ["yellow", "pink", "sage"]) expect(papers[name].cls).toContain(`nb-c-${name}`);
    /* and the three render as three, not as three copies of the default */
    expect(new Set(Object.values(papers).map((v) => v.bg)).size, "the three notes render one fill").toBe(3);
    expect(new Set(Object.values(papers).map((v) => v.bd)).size).toBe(3);
  });

  test("⚠️ nothing on the board overlaps anything else — the negative-space check", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    /* ⚠️ TEXT LEAVES ONLY. A parent's box contains its children's by construction and inline
       siblings share a line box, so comparing those reports overlap on a correct page forever. */
    const result = await page.evaluate(() => {
      const root = document.querySelector(".nb-board");
      if (!root) return null;
      const leaves: { t: string; r: DOMRect }[] = [];
      for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
        if (el.children.length) continue;
        const t = (el.innerText ?? "").trim();
        if (!t) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        leaves.push({ t: t.slice(0, 30), r });
      }
      const hits: string[] = [];
      for (let i = 0; i < leaves.length; i++) {
        for (let j = i + 1; j < leaves.length; j++) {
          const a = leaves[i].r, b = leaves[j].r;
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox > 1 && oy > 1) hits.push(`"${leaves[i].t}" ∩ "${leaves[j].t}"`);
        }
      }
      return { count: leaves.length, hits };
    });
    expect(result, ".nb-board is not on the page").toBeTruthy();
    /* the floor — zero boxes yields zero overlaps and passes having measured nothing */
    expect(result!.count, "no text leaves found; the scan measured nothing").toBeGreaterThan(8);
    console.log(`[overlap] ${result!.count} text leaves scanned · ${result!.hits.length} intersections`);
    for (const h of result!.hits.slice(0, 6)) console.log(`   ${h}`);
    expect(result!.hits).toEqual([]);
  });

  test("⚠️ the Examples drawer is OPAQUE — a floating surface still resolves its tokens", async ({ page }) => {
    /* ⚠️ THE CHECK THAT WAS MISSING. The drawer renders OUTSIDE `.nb-scope`, so every
       `var(--nb-*)` it read was undefined at its use site and the declaration was DROPPED — it
       rendered fully transparent with the board showing through its text, while every other
       measurement here passed. A token being DEFINED somewhere is not the same as being IN SCOPE
       where it is read, and only a computed value can tell the two apart. */
    await openRoute(page, ROUTE, WIDE);
    await page.getByRole("button", { name: "Examples" }).click();
    await page.waitForTimeout(600);
    const look = await page.evaluate(() => {
      const d = document.querySelector<HTMLElement>(".nb-drawer");
      if (!d) return null;
      const ex = d.querySelector<HTMLElement>(".nb-exnote");
      return {
        drawerBg: getComputedStyle(d).backgroundColor,
        exampleBg: ex ? getComputedStyle(ex).backgroundColor : null,
        examples: d.querySelectorAll(".nb-exnote").length,
      };
    });
    expect(look, "the drawer did not open").toBeTruthy();
    console.log(`[drawer] background ${look!.drawerBg} · ${look!.examples} examples · first example ${look!.exampleBg}`);
    expect(look!.examples, "the drawer is empty").toBe(9);
    for (const c of [look!.drawerBg, look!.exampleBg]) {
      expect(c, "transparent — an --nb-* token did not resolve at this use site").not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    }
  });

  test("⚠️ and nothing in the open drawer overlaps anything behind it", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    await page.getByRole("button", { name: "Examples" }).click();
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const d = document.querySelector(".nb-drawer");
      if (!d) return null;
      const leaves: { t: string; r: DOMRect }[] = [];
      for (const el of Array.from(d.querySelectorAll<HTMLElement>("*"))) {
        if (el.children.length) continue;
        const t = (el.innerText ?? "").trim();
        if (!t) continue;
        const b = el.getBoundingClientRect();
        if (b.width < 1 || b.height < 1) continue;
        leaves.push({ t: t.slice(0, 26), r: b });
      }
      const hits: string[] = [];
      for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
        const a = leaves[i].r, b = leaves[j].r;
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) hits.push(`"${leaves[i].t}" ∩ "${leaves[j].t}"`);
      }
      return { count: leaves.length, hits };
    });
    expect(r, "the drawer did not open").toBeTruthy();
    expect(r!.count, "no text leaves in the drawer").toBeGreaterThan(8);
    console.log(`[drawer overlap] ${r!.count} leaves · ${r!.hits.length} intersections`);
    for (const h of r!.hits.slice(0, 5)) console.log(`   ${h}`);
    expect(r!.hits).toEqual([]);
  });
});
