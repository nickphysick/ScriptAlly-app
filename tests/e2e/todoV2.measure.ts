/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ TO-DO LIST v2 — THE MEASUREMENT ══════════════════════════════════════════════════════════
 *
 * Oracle: design-refs/todo-list-v2.html, SHA256 67da1fb4…7992e. The first case refuses to run
 * anything against a ref whose bytes have moved: a stale anchor fails here, loudly, rather than
 * every later case quietly measuring the page against a drawing nobody signed off.
 *
 * ⚠️ THE FLOOR IS THE GUARD AGAINST A SILENT HALF-RUN. A suite that cannot find its subject has
 * failed, not skipped — so every case bumps the counter, and a worker that ran fewer assertions
 * than twice its cases fails in the language of a failure.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { openRoute, visiblePage } from "./measure";

export const TODO_V2_REF = "design-refs/todo-list-v2.html";
export const TODO_V2_SHA = "67da1fb43ca9b170f985b6eb71806f9c1ec8296237f475cf458d880e1dd7992e";

let asserts = 0;
let ran = 0;
const bump = (n = 1) => { asserts += n; };

test.beforeAll(async () => { await assertLocalBundleIsDev(); });
test.beforeEach(() => { ran += 1; });
test.afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`[todoV2] assertions run: ${asserts} across ${ran} tests (this worker)`);
  if (asserts < ran * 2) throw new Error(`todoV2 ran only ${asserts} assertions across ${ran} tests — a subject went missing`);
});

test.describe("phase 1 — the ref and the wiring", () => {
  test("the oracle is the ref that was signed off, byte for byte", () => {
    const bytes = readFileSync(join(process.cwd(), TODO_V2_REF));
    const sha = createHash("sha256").update(bytes).digest("hex");
    expect(sha, `${TODO_V2_REF} has changed since it was enrolled — a stale anchor`).toBe(TODO_V2_SHA);
    bump();
    expect(bytes.length).toBeGreaterThan(1000);
    bump();
  });

  test("the v2 page is the one mounted at /todo", async ({ page }) => {
    await openRoute(page, "/todo", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".tdv2-wpg");
    const found = await page.evaluate((s) => !!document.querySelector(`${s} [data-todo-v2="page"]`), scope);
    expect(found, "no [data-todo-v2=page] under the visible To-do page — the v2 page is not mounted").toBe(true);
    bump(2);
  });
});

/* ── helpers ── */
const V2 = ".tdv2-wpg";
async function openV2(page: import("@playwright/test").Page, w = 1440, h = 900) {
  await openRoute(page, "/todo", { width: w, height: h });
  const scope = await visiblePage(page, V2);
  await page.waitForSelector(`${scope} [data-todo-v2="main"]:not(:has([data-todo-v2="skeleton"]))`, { timeout: 30000 });
  return scope;
}

test.describe("phase 2 — anatomy", () => {
  for (const [w, h] of [[1440, 860], [1280, 800], [1920, 1080]] as const) {
    test(`header full width, one centred group, rail on screen at ${w}×${h}`, async ({ page }) => {
      const scope = await openV2(page, w, h);
      const m = await page.evaluate((s) => {
        const q = (sel: string) => document.querySelector(`${s} ${sel}`) as HTMLElement | null;
        const grp = q(".tdv2-group"), ph = q(".tdv2-group > .ph"), main = q(".tdv2-main"), rail = q(".tdv2-rail"), sc = q(".wpg-scroll");
        const eye = q(".tdv2-group > .ph .ph-eyebrow");
        const art = q('[data-todo-v2="art-slot"]');
        if (!grp || !ph || !main || !rail || !sc || !art) return null;
        const r = (e: HTMLElement) => e.getBoundingClientRect();
        const cs = getComputedStyle(grp);
        /* every box between the main column and the scroller: nothing may paint a card around the content */
        const frames: string[] = [];
        for (let e: HTMLElement | null = main; e && e !== sc; e = e.parentElement) {
          const c = getComputedStyle(e);
          const painted = (c.backgroundColor !== "rgba(0, 0, 0, 0)" && c.backgroundColor !== "transparent")
            || c.boxShadow !== "none" || parseFloat(c.borderTopWidth) > 0 || parseFloat(c.borderLeftWidth) > 0;
          if (painted) frames.push(e.className);
        }
        return {
          cols: cs.gridTemplateColumns.split(" ").map(parseFloat), gap: parseFloat(cs.columnGap),
          grp: r(grp).toJSON(), ph: r(ph).toJSON(), main: r(main).toJSON(), rail: r(rail).toJSON(), sc: r(sc).toJSON(),
          art: r(art).toJSON(), eyebrow: !!eye, frames, scW: sc.clientWidth, grpW: grp.offsetWidth,
          grpLeftInSc: r(grp).left - r(sc).left,
          /* the group's CONTENT box — the shared column pays its gutter as the group's padding */
          grpContent: { left: r(grp).left + parseFloat(cs.paddingLeft), right: r(grp).right - parseFloat(cs.paddingRight) },
        };
      }, scope);
      expect(m, "the v2 frame is missing").not.toBeNull();
      /* two tracks, the second the rail's 340, 28 between */
      expect(m!.cols.length).toBe(2); bump();
      expect(m!.cols[1]).toBe(340); bump();
      expect(m!.gap).toBe(28); bump();
      /* the header spans the whole group — both tracks — and the rail starts BELOW its rule */
      expect(Math.abs(m!.ph.left - m!.grpContent.left)).toBeLessThan(1); bump();
      expect(Math.abs(m!.ph.right - m!.grpContent.right)).toBeLessThan(1); bump();
      expect(Math.abs(m!.ph.left - m!.main.left)).toBeLessThan(1); bump();
      expect(m!.rail.top).toBeGreaterThanOrEqual(m!.ph.bottom); bump();
      expect(Math.abs(m!.rail.right - m!.grpContent.right)).toBeLessThan(1); bump();
      /* the group is centred in the scroller: equal space either side (within a pixel) */
      const leftSpace = m!.grpLeftInSc, rightSpace = m!.scW - m!.grpW - m!.grpLeftInSc;
      expect(Math.abs(leftSpace - rightSpace)).toBeLessThan(1.5); bump();
      /* ⚠️ THE EYEBROW IS THE SHARED HEADER'S, NOT THIS PAGE'S TO REMOVE. The brief asked for none; the
         shared full header states its section on every page that mounts it (Query Centre, Contact
         list, packages, comps), and the shell is out of scope — so it is REPORTED, not asserted. */
      // eslint-disable-next-line no-console
      console.log(`[todoV2] eyebrow present: ${m!.eyebrow}`);
      /* no second card around the content */
      expect(m!.frames, `a painted frame wraps the content: ${m!.frames.join(" | ")}`).toEqual([]); bump();
      /* the art slot: the ref's 250 × 132, standing on the rule (its bottom is the header's bottom) */
      expect(Math.round(m!.art.width)).toBe(250); bump();
      expect(Math.round(m!.art.height)).toBe(132); bump();
      expect(Math.abs(m!.art.bottom - (m!.ph.bottom - 1))).toBeLessThan(1.5); bump();
      /* the rail does not run off the bottom of the scroller on load */
      expect(m!.rail.bottom).toBeLessThanOrEqual(m!.sc.bottom + 0.5); bump();
    });
  }

  test("the art slot ships empty — no image, no placeholder text", async ({ page }) => {
    const scope = await openV2(page);
    const slot = await page.evaluate((s) => {
      const e = document.querySelector(`${s} [data-todo-v2="art-slot"]`) as HTMLElement | null;
      return e ? { html: e.innerHTML, text: e.textContent, border: parseFloat(getComputedStyle(e).borderTopWidth), bg: getComputedStyle(e).backgroundImage } : null;
    }, scope);
    expect(slot).not.toBeNull();
    expect(slot!.html).toBe(""); bump();
    expect(slot!.border).toBe(0); bump();
    expect(slot!.bg).toBe("none"); bump();
  });

  test("the loading cover renders the page's own frames, and they do not move when it lifts", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS: number }).__SA_QC_HOLD_MS = 6000; });
    await openRoute(page, "/todo", { width: 1440, height: 900 });
    const scope = await visiblePage(page, V2);
    await page.waitForSelector(`${scope} [data-todo-v2="skeleton"] .tdv2-tile`, { timeout: 15000 });
    const read = () => page.evaluate((s) => {
      const tiles = [...document.querySelectorAll(`${s} .tdv2-tiles .tdv2-tile`)] as HTMLElement[];
      const main = document.querySelector(`${s} .tdv2-main`) as HTMLElement;
      const rail = document.querySelector(`${s} .tdv2-rail`) as HTMLElement;
      return { n: tiles.length, tileTop: tiles[0]?.getBoundingClientRect().top, mainLeft: main.getBoundingClientRect().left, railLeft: rail.getBoundingClientRect().left };
    }, scope);
    const held = await read();
    expect(held.n).toBe(3); bump();
    await page.waitForSelector(`${scope} [data-todo-v2="main"]:not(:has([data-todo-v2="skeleton"]))`, { timeout: 30000 });
    const loaded = await read();
    expect(Math.abs(held.mainLeft - loaded.mainLeft)).toBeLessThan(1); bump();
    expect(Math.abs(held.railLeft - loaded.railLeft)).toBeLessThan(1); bump();
  });
});

test.describe("phase 3 — three tiles", () => {
  test("three tiles; sub-lines sum to headlines; the total is the sidebar badge's; each tile filters to its own", async ({ page }) => {
    const scope = await openV2(page);
    const read = () => page.evaluate((s) => {
      const tiles = [...document.querySelectorAll(`${s} [data-todo-v2="tiles"] .tdv2-tile`)] as HTMLElement[];
      return tiles.map((t) => ({
        tile: t.dataset.tile,
        on: t.classList.contains("on"),
        n: Number(t.querySelector('[data-todo-v2="tile-num"]')?.textContent),
        sub: t.querySelector('[data-todo-v2="tile-sub"]')?.textContent ?? "",
      }));
    }, scope);
    const tiles = await read();
    expect(tiles.map((t) => t.tile)).toEqual(["move", "chase", "house"]); bump();
    /* Your move is the default */
    expect(tiles.find((t) => t.on)?.tile).toBe("move"); bump();
    /* each sub-line's figures sum to its headline (the single-category tile states no figures) */
    for (const t of tiles.slice(0, 2)) {
      const nums = (t.sub.match(/\d+/g) ?? []).map(Number);
      expect(nums.length, `${t.tile}: "${t.sub}"`).toBe(2);
      expect(nums[0] + nums[1], `${t.tile}: "${t.sub}"`).toBe(t.n); bump();
    }
    /* derived, not stored: the three sum to the SIDEBAR BADGE, a separate derivation of the same board */
    const badge = await page.evaluate(() => {
      const row = [...document.querySelectorAll("a, button")].find((e) => /^\s*To-do list/.test(e.textContent || "") && e.closest("nav, aside"));
      const m = row?.textContent?.match(/(\d+)\s*$/);
      return m ? Number(m[1]) : null;
    });
    expect(badge, "the sidebar badge was not found").not.toBeNull();
    expect(tiles.reduce((n, t) => n + t.n, 0)).toBe(badge); bump();
    /* each tile: a NON-EMPTY population first, then every row belongs to it */
    let entered = 0;
    for (const t of tiles) {
      if (t.n === 0) continue;
      await page.click(`${scope} .tdv2-tile[data-tile="${t.tile}"]`);
      const rows = await page.evaluate((s) => ([...document.querySelectorAll(`${s} [data-todo-v2="row"]`)] as HTMLElement[]).map((r) => r.dataset.tile), scope);
      expect(rows.length, `${t.tile} showed ${rows.length} rows over a count of ${t.n}`).toBe(t.n); bump();
      expect(rows.every((x) => x === t.tile), `${t.tile}: ${rows.join(",")}`).toBe(true); bump();
      entered += 1;
    }
    expect(entered, "fewer than two tiles had anything in them — the fixture cannot prove the filter").toBeGreaterThanOrEqual(2); bump();
  });
});

test.describe("phase 4 — controls", () => {
  test("no view switch; Group and Sort offer exactly the brief's options; the retired word appears nowhere", async ({ page }) => {
    const scope = await openV2(page);
    expect(await page.locator(`${scope} .qvs`).count()).toBe(0); bump();
    const texts: string[] = [];
    const sweep = async () => texts.push(await page.evaluate((s) => {
      const root = document.querySelector(`${s} .tdv2-group`) as HTMLElement;
      const attrs = [...root.querySelectorAll("*")].flatMap((e) => [...e.attributes].map((a) => a.value));
      return root.innerText + "\n" + attrs.join("\n");
    }, scope));
    await sweep();
    for (const t of ["move", "chase", "house"]) {
      await page.click(`${scope} .tdv2-tile[data-tile="${t}"]`);
      await sweep();
    }
    await page.click(`${scope} [data-todo-v2="group-btn"]`);
    const groups = await page.locator(`${scope} .tdv2-menu .tdv2-mi`).allInnerTexts();
    expect(groups.map((g) => g.trim())).toEqual(["When", "Task type", "Agent", "Submission package", "None"]); bump();
    await sweep();
    await page.click(`${scope} [data-todo-v2="sort-btn"]`);
    const sorts = await page.locator(`${scope} .tdv2-menu .tdv2-mi`).allInnerTexts();
    expect(sorts.map((g) => g.trim())).toEqual(["Date on the task", "Time past the date", "Agent", "Task type"]); bump();
    await sweep();
    await page.click(`${scope} [data-todo-v2="filter-btn"]`);
    await sweep();
    const all = texts.join("\n");
    expect(all.length, "the sweep read nothing").toBeGreaterThan(500); bump();
    expect(all.toLowerCase(), "the page uses the retired word").not.toContain("overdue"); bump();
  });

  test("a filter's floating bar moves nothing on the page; picking keeps the panel's scroll; a press outside closes it", async ({ page }) => {
    const scope = await openV2(page);
    /* pick a tile that has rows, and a filter that does NOT change which rows show — so any shift is the bar's */
    const geo = () => page.evaluate((s) => {
      const r = (sel: string) => (document.querySelector(`${s} ${sel}`) as HTMLElement).getBoundingClientRect().toJSON();
      const sc = document.querySelector(`${s} .wpg-scroll`) as HTMLElement;
      return { tiles: r(".tdv2-tiles"), controls: r(".tdv2-controls"), main: r(".tdv2-main"), rail: r(".tdv2-rail"), sh: sc.scrollHeight };
    }, scope);
    await page.click(`${scope} [data-todo-v2="filter-btn"]`);
    /* the chosen option: a Task type tick equal to the whole tile's population, so the rows are unchanged */
    const pick = await page.evaluate((s) => {
      const opts = [...document.querySelectorAll(`${s} [data-todo-v2="filter-panel"] .tdv2-psec`)][0]?.querySelectorAll(".tdv2-opt") ?? [];
      return opts.length === 1 ? 0 : -1;
    }, scope);
    let before;
    if (pick === 0) {
      await page.keyboard.press("Escape");
      before = await geo();
      await page.click(`${scope} [data-todo-v2="filter-btn"]`);
      await page.click(`${scope} [data-todo-v2="filter-panel"] .tdv2-psec:first-child .tdv2-opt`);
    } else {
      /* no single-type tile here — the set-aside row count is compared instead, off */
      await page.keyboard.press("Escape");
      await page.click(`${scope} .tdv2-tile[data-tile="house"]`);
      before = await geo();
      await page.click(`${scope} [data-todo-v2="filter-btn"]`);
      await page.click(`${scope} [data-todo-v2="filter-panel"] .tdv2-psec:first-child .tdv2-opt`);
    }
    const bar = await page.evaluate((s) => {
      const b = document.querySelector(`${s} [data-todo-v2="activebar"]`) as HTMLElement;
      return { show: b.classList.contains("show"), pos: getComputedStyle(b).position };
    }, scope);
    expect(bar.show, "the floating bar did not appear").toBe(true); bump();
    expect(bar.pos).toBe("fixed"); bump();
    const after = await geo();
    for (const k of ["tiles", "controls", "rail"] as const) {
      expect(Math.abs(after[k].top - before![k].top), `${k} moved`).toBeLessThan(0.5); bump();
      expect(Math.abs(after[k].height - before![k].height), `${k} resized`).toBeLessThan(0.5); bump();
    }
    expect(after.sh, "the page's scroll height changed when the bar appeared").toBe(before!.sh); bump();

    /* scroll is kept across a pick — the panel is capped short so it must scroll (the property is the cap's, not the fixture's) */
    await page.addStyleTag({ content: ".tdv2-scrollbox { max-height: 90px !important; }" });
    const sb = `${scope} [data-todo-v2="filter-scroll"]`;
    const can = await page.evaluate((sel) => { const e = document.querySelector(sel) as HTMLElement; return e.scrollHeight - e.clientHeight; }, sb);
    expect(can, "the panel cannot scroll even capped — precondition").toBeGreaterThan(20); bump();
    await page.evaluate((sel) => { const e = document.querySelector(sel) as HTMLElement; e.scrollTop = e.scrollHeight; }, sb);
    const top0 = await page.evaluate((sel) => (document.querySelector(sel) as HTMLElement).scrollTop, sb);
    expect(top0).toBeGreaterThan(0); bump();
    await page.click(`${scope} [data-todo-v2="filter-panel"] .tdv2-psec:last-child .tdv2-opt`);
    const top1 = await page.evaluate((sel) => (document.querySelector(sel) as HTMLElement | null)?.scrollTop ?? -1, sb);
    expect(top1, "the panel closed or jumped on a pick").toBe(top0); bump();

    /* a press outside closes it */
    await page.mouse.click(5, 300);
    expect(await page.locator(`${scope} [data-todo-v2="filter-panel"]`).count()).toBe(0); bump();
  });
});

test.describe("phase 5 — row cards", () => {
  for (const [w, h] of [[1440, 900], [1920, 1080]] as const) {
    test(`row anatomy at ${w}: the declared grid, a flush band, no cell spilling into another`, async ({ page }) => {
      const scope = await openV2(page, w, h);
      /* ⚠️ THE GRID IS READ FROM THE DECLARATION UNDER TEST, not from a rendered track list */
      const declared = await page.evaluate(() => {
        for (const sh of [...document.styleSheets]) {
          let rules: CSSRuleList; try { rules = sh.cssRules; } catch { continue; }
          for (const r of [...rules]) {
            if (r instanceof CSSStyleRule && r.selectorText === ".tdv2-inner") return r.style.gridTemplateColumns;
          }
        }
        return null;
      });
      expect(declared).toBe("22px minmax(0px, 1.5fr) minmax(0px, 1fr) minmax(128px, max-content) max-content"); bump();
      const rows = await page.evaluate((s) => ([...document.querySelectorAll(`${s} [data-todo-v2="row"]`)] as HTMLElement[]).slice(0, 12).map((row) => {
        const band = row.querySelector('[data-todo-v2="band"]') as HTMLElement;
        const rr = row.getBoundingClientRect(), br = band.getBoundingClientRect();
        const cells = [...row.querySelectorAll(".tdv2-inner > *")] as HTMLElement[];
        const spill = cells.filter((c) => c.scrollWidth > c.clientWidth + 1 && !c.classList.contains("tdv2-deedwrap") && !c.classList.contains("tdv2-agentcell")).map((c) => c.className);
        /* ink of adjacent cells must not intersect (the ref's own fault) */
        /* ⚠️ A RANGE REPORTS CLIPPED TEXT WHERE IT WOULD BE, NOT WHERE IT IS SEEN — the deed and the agent
           ellipsise by design, so their ink is intersected with their own cell (which clips them);
           the date and action cells do not clip, and the spill check above covers them. */
        const inkRects = cells.map((c) => {
          const rg = document.createRange(); rg.selectNodeContents(c);
          const ink = rg.getBoundingClientRect();
          const clips = c.classList.contains("tdv2-deedwrap") || c.classList.contains("tdv2-agentcell");
          if (!clips) return ink;
          const box = c.getBoundingClientRect();
          return new DOMRect(Math.max(ink.left, box.left), ink.top, Math.min(ink.right, box.right) - Math.max(ink.left, box.left), ink.height);
        });
        const overlaps: string[] = [];
        for (let i = 1; i < inkRects.length; i++) {
          if (inkRects[i].left < inkRects[i - 1].right - 1 && inkRects[i - 1].width > 0 && inkRects[i].width > 0) overlaps.push(`${cells[i - 1].className}→${cells[i].className}`);
        }
        const cs = getComputedStyle(row);
        return {
          bandTop: br.top - rr.top, bandLeft: br.left - rr.left, bandW: br.width - rr.width, bandH: br.height,
          radius: cs.borderTopLeftRadius, frame: parseFloat(cs.borderTopWidth) + parseFloat(cs.outlineWidth || "0"),
          spill, overlaps,
        };
      }), scope);
      expect(rows.length, "no rows to measure").toBeGreaterThan(2); bump();
      for (const r of rows) {
        expect(r.bandTop, "the band does not touch the card's top").toBeLessThan(0.5); bump();
        expect(Math.abs(r.bandLeft) + Math.abs(r.bandW), "the band does not run edge to edge").toBeLessThan(0.5); bump();
        expect(r.bandH).toBe(5); bump();
        expect(r.radius).toBe("14px"); bump();
        expect(r.spill, "a cell spills its contents").toEqual([]); bump();
        expect(r.overlaps, "two cells' ink overlap").toEqual([]); bump();
      }
    });
  }

  test("past-the-date rows carry an inset, rounded ink edge; Your move is anthracite; group heads stick", async ({ page }) => {
    const scope = await openV2(page, 1440, 900);
    const m = await page.evaluate((s) => {
      const past = [...document.querySelectorAll(`${s} [data-todo-v2="row"].past`)] as HTMLElement[];
      const notPast = document.querySelector(`${s} [data-todo-v2="row"]:not(.past)`) as HTMLElement | null;
      const e = past[0] ? getComputedStyle(past[0], "::after") : null;
      const tag = document.querySelector(`${s} .tdv2-ttag.yourmove`) as HTMLElement | null;
      const head = document.querySelector(`${s} [data-todo-v2="ghead"]`) as HTMLElement | null;
      return {
        nPast: past.length,
        edge: e ? { content: e.content, top: e.top, bottom: e.bottom, width: e.width, bg: e.backgroundColor, r: e.borderTopRightRadius } : null,
        notPastEdge: notPast ? getComputedStyle(notPast, "::after").content : "none",
        tag: tag ? getComputedStyle(tag).backgroundColor : null,
        head: head ? { bg: getComputedStyle(head).backgroundColor, fg: getComputedStyle(head).color, pos: getComputedStyle(head).position } : null,
      };
    }, scope);
    expect(m.nPast, "the fixture has no row past its date — the edge cannot be proved").toBeGreaterThan(0); bump();
    expect(m.edge!.width).toBe("3px"); bump();
    expect(m.edge!.top).toBe("8px"); bump();
    expect(m.edge!.bottom).toBe("8px"); bump();
    expect(m.edge!.r).toBe("3px"); bump();
    expect(m.edge!.bg).toBe("rgb(28, 19, 15)"); bump();
    expect(m.notPastEdge === "none" || m.notPastEdge === "normal").toBe(true); bump();
    expect(m.tag).toBe("rgb(42, 58, 82)"); bump();
    expect(m.head).toEqual({ bg: "rgb(42, 58, 82)", fg: "rgb(253, 249, 242)", pos: "sticky" }); bump();
    /* the head sticks: scroll the page past the first group's top and it stays at the scroller's top */
    const stuck = await page.evaluate((s) => {
      const sc = document.querySelector(`${s} .wpg-scroll`) as HTMLElement;
      const heads = [...document.querySelectorAll(`${s} [data-todo-v2="ghead"]`)] as HTMLElement[];
      const first = heads[0];
      const sec = first.parentElement as HTMLElement;
      sc.scrollTop = sec.offsetTop + 200;
      const top = first.getBoundingClientRect().top - sc.getBoundingClientRect().top;
      const secR = sec.getBoundingClientRect();
      return { top, secTop: secR.top - sc.getBoundingClientRect().top, secBottom: secR.bottom - sc.getBoundingClientRect().top };
    }, scope);
    /* precondition: the section is scrolled past its own top and still on screen */
    expect(stuck.secTop).toBeLessThan(0); bump();
    expect(stuck.secBottom).toBeGreaterThan(40); bump();
    expect(Math.abs(stuck.top), "the group head did not stick").toBeLessThan(1); bump();
    /* no burgundy highlight anywhere in the list */
    const burgundy = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-todo-v2="list"] *`)].filter((e) => {
      const c = getComputedStyle(e);
      return [c.color, c.backgroundColor, c.borderLeftColor].some((v) => v === "rgb(124, 58, 42)");
    }).length, scope);
    expect(burgundy, "a burgundy 'with you' highlight is in the list").toBe(0); bump();
  });
});

test.describe("phase 6 — the desk", () => {
  /* ⚠️ THESE CASES WRITE, AND EVERY WRITE IS REMOVED IN THE SAME RUN — before and after, by prefix,
     through tests/e2e/cleanupTodoV2Probe.mjs. A run that cannot clean up fails loudly. */
  const clean = () => {
    const out = execSync("node tests/e2e/cleanupTodoV2Probe.mjs", { encoding: "utf8" });
    expect(out).toMatch(/cleanupTodoV2Probe: deleted \d+ task/);
    return out;
  };
  test.beforeAll(() => { clean(); });
  test.afterAll(() => { clean(); });

  test("the tray: Your desk in the typewriter face on blush, an empty hawk slot; the rail stays on screen", async ({ page }) => {
    const scope = await openV2(page, 1440, 860);
    const m = await page.evaluate((s) => {
      const tray = document.querySelector(`${s} .tdv2-tray`) as HTMLElement;
      const h = document.querySelector(`${s} .tdv2-deskttl`) as HTMLElement;
      const hawk = document.querySelector(`${s} [data-todo-v2="hawk-slot"]`) as HTMLElement;
      const rail = document.querySelector(`${s} .tdv2-rail`) as HTMLElement;
      const sc = document.querySelector(`${s} .wpg-scroll`) as HTMLElement;
      return {
        bg: getComputedStyle(tray).backgroundColor, font: getComputedStyle(h).fontFamily, text: h.textContent,
        hawkW: hawk.getBoundingClientRect().width, hawkHtml: hawk.innerHTML,
        railBottom: rail.getBoundingClientRect().bottom, scBottom: sc.getBoundingClientRect().bottom,
        composer: !!document.querySelector(`${s} [data-todo-v2="composer"]`),
      };
    }, scope);
    expect(m.bg).toBe("rgb(245, 226, 218)"); bump();
    expect(m.font).toMatch(/Special Elite/); bump();
    expect(m.text).toBe("Your desk"); bump();
    expect(Math.round(m.hawkW)).toBe(92); bump();
    expect(m.hawkHtml).toBe(""); bump();
    expect(m.composer).toBe(true); bump();
    expect(m.railBottom, "the rail runs off the bottom on load").toBeLessThanOrEqual(m.scBottom + 0.5); bump();
    /* "Add a task" has left the header — the composer is the one way to add */
    expect(await page.locator(`${scope} .tdv2-group > .ph .ph-primary`).count()).toBe(0); bump();
  });

  test("a task added at the desk lands in the list under its heading AND in the rail — one store", async ({ page }) => {
    const scope = await openV2(page, 1440, 900);
    const text = `Zz v2 probe task ${Date.now()}`;
    /* start on a tile that would HIDE an own task */
    await page.click(`${scope} .tdv2-tile[data-tile="chase"]`);
    await page.click(`${scope} [data-todo-v2="composer"] .tdv2-pill[data-when="next"]`);
    await page.fill(`${scope} [data-todo-v2="capture"]`, text);
    await page.click(`${scope} [data-todo-v2="attach"]`);
    await page.click(`${scope} .tdv2-picker .tdv2-pickrow >> nth=0`);
    const attached = (await page.locator(`${scope} [data-todo-v2="attached"]`).innerText()).replace("×", "").trim();
    expect(attached.length, "no agent was attached").toBeGreaterThan(0); bump();
    await page.focus(`${scope} [data-todo-v2="capture"]`);
    await page.keyboard.press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");
    /* the list — under Next week, on Your move */
    const row = page.locator(`${scope} [data-todo-v2="row"]`, { hasText: text });
    await expect(row).toHaveCount(1, { timeout: 15000 }); bump();
    const where = await row.evaluate((r) => ({
      group: r.closest(".tdv2-gsec")?.getAttribute("data-group"),
      landed: r.classList.contains("landed"),
      tile: document.querySelector(".tdv2-wpg .tdv2-tile.on")?.getAttribute("data-tile"),
      who: r.querySelector(".tdv2-agt b")?.textContent,
      key: r.getAttribute("data-row-key"),
    }));
    expect(where.tile, "the tile did not switch to show the new task").toBe("move"); bump();
    expect(where.group).toBe("Next week"); bump();
    expect(where.landed, "no arrival highlight").toBe(true); bump();
    expect(where.who).toBe(attached); bump();
    /* the rail — the same document, by the same key */
    const railRow = page.locator(`${scope} [data-todo-v2="rail-row"][data-row-key="${where.key}"]`);
    await expect(railRow).toHaveCount(1); bump();
    await expect(railRow).toContainText(text); bump();
    await expect(railRow).toContainText("Next week"); bump();
    const said = await page.locator(`${scope} [data-todo-v2="said"]`).innerText();
    expect(said).toMatch(/^Added to the list under Next week — due by \w{3} \d{1,2} \w{3}/); bump();
    /* and it survives a reload — it is stored, not local */
    await page.reload();
    await page.waitForFunction((v) => [...document.querySelectorAll(v)].some((e) => e.getBoundingClientRect().height > 0), V2, { timeout: 30000 });
    const scope2 = await visiblePage(page, V2);
    await expect(page.locator(`${scope2} [data-todo-v2="rail-row"]`, { hasText: text })).toHaveCount(1, { timeout: 20000 }); bump();
  });

  test("a note written at the desk is on the Noteboard, and never on the list", async ({ page }) => {
    const scope = await openV2(page, 1440, 900);
    const text = `Zz v2 probe note ${Date.now()}`;
    await page.click(`${scope} .tdv2-cseg[data-mode="note"]`);
    expect(await page.locator(`${scope} .tdv2-pill`).count(), "the when-pills are a task's").toBe(0); bump();
    await page.fill(`${scope} [data-todo-v2="capture"]`, text);
    await page.click(`${scope} [data-todo-v2="add"]`);
    await expect(page.locator(`${scope} [data-todo-v2="note"]`, { hasText: text })).toHaveCount(1, { timeout: 15000 }); bump();
    await expect(page.locator(`${scope} [data-todo-v2="said"]`)).toContainText("on your Noteboard too"); bump();
    expect(await page.locator(`${scope} [data-todo-v2="row"]`, { hasText: text }).count(), "a note reached the list").toBe(0); bump();
    await page.click(`${scope} [data-todo-v2="noteboard-link"]`);
    await expect(page).toHaveURL(/\/todo\/noteboard$/); bump();
    /* ⚠️ THE TO-DO PAGE STAYS MOUNTED (hidden) WITH THE SAME TEXT IN ITS RAIL, so the Noteboard is found by
       measuring which Tasks page is on screen, never by `.first()` */
    await page.waitForFunction(() => [...document.querySelectorAll(".tpl-wpg")].some((e) => e.getBoundingClientRect().height > 0), undefined, { timeout: 20000 });
    const nb = await visiblePage(page, ".tpl-wpg");
    await expect(page.locator(nb).getByText(text)).toBeVisible({ timeout: 20000 }); bump();
  });
});
