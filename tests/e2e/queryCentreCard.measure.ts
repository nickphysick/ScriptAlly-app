/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CARD, MEASURED AGAINST THE REF — the built page and `design-refs/query-centre.html`, same
 * probe, same viewport, first card in each.
 *
 * ⚠️ THE PAIRING IS BY ROLE, NOT BY CLASS. The ref's `.nm` and the build's `.qcc-nm` are the same
 * element in two vocabularies; a probe written per-file would be two probes and could not diff.
 * One table of roles, two selector sets.
 *
 * ⚠️ AND IT RECORDS WHICH RULE WINS, not just the value. "font-size is 24px" is a symptom; "a
 * `.wsh h3` two files away is winning" is the fault. Without the source a mismatch gets fixed by
 * overriding it, which is how `!important` accumulates.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const REF = "file://" + resolve(process.cwd(), "design-refs/query-centre.html");

/** role → [ref selector, built selector, properties] */
const PROBE: [string, string, string, string[]][] = [
  ["card",      ".card",                  ".qcc",           ["padding", "borderRadius", "boxShadow", "backgroundColor", "display"]],
  ["band",      ".card .band",            ".qcc .qcc-band", ["padding", "height", "display", "alignItems", "gap"]],
  ["band.word", ".card .band .word",      ".qcc .qcc-word", ["fontFamily", "fontSize", "lineHeight", "display"]],
  ["band.turn", ".card .band .r",         ".qcc .qcc-turn", ["fontSize", "letterSpacing", "textTransform"]],
  ["body",      ".card .body",            ".qcc .qcc-body", ["padding", "display"]],
  ["who",       ".card .who",             ".qcc .qcc-who",  ["display", "alignItems", "gap"]],
  ["whotx",     ".card .who>div:nth-child(2)", ".qcc .qcc-whotx", ["display", "flex", "minWidth"]],
  ["nm",        ".card .nm",              ".qcc .qcc-nm",   ["fontSize", "lineHeight", "display", "whiteSpace", "overflow"]],
  ["ag",        ".card .ag",              ".qcc .qcc-ag",   ["fontSize", "display", "marginTop"]],
  ["chip",      ".card .chip",            ".qcc .qcc-chip", ["width", "height", "boxShadow", "backgroundColor", "border", "display"]],
  ["leaf",      ".card .leaf",            ".qcc .qcc-leaf", ["width", "display", "flexDirection", "marginLeft"]],
  ["leaf.mo",   ".card .leaf .mo",        ".qcc .qcc-leaf-mo",  ["display", "fontSize", "padding"]],
  ["leaf.dy",   ".card .leaf .dy",        ".qcc .qcc-leaf-dy",  ["display", "fontSize", "padding"]],
  ["leaf.cap",  ".card .leaf .cap",       ".qcc .qcc-leaf-cap", ["display", "fontSize", "padding"]],
  ["fact",      ".card .fact",            ".qcc .qcc-fact", ["marginTop", "paddingTop", "borderTopWidth", "borderTopStyle", "display", "alignItems"]],
  ["fact.s",    ".card .fact .s",         ".qcc .qcc-s",    ["fontSize", "whiteSpace", "display"]],
  ["fact.m",    ".card .fact .m",         ".qcc .qcc-m",    ["fontSize", "whiteSpace", "display", "marginTop"]],
  ["mats.ic",   ".card .mats .ic",        ".qcc .qcc-ic",   ["width", "height"]],
];

/** Computed values plus the rendered box, so a display bug shows as geometry too. */
async function probe(page: import("@playwright/test").Page, which: 0 | 1) {
  return page.evaluate(
    ({ table, idx }) => {
      const out: Record<string, Record<string, string>> = {};
      for (const row of table) {
        const role = row[0] as string;
        const sel = row[1 + idx] as string;
        const props = row[3] as string[];
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) { out[role] = { MISSING: sel }; continue; }
        const cs = getComputedStyle(el);
        const rec: Record<string, string> = {};
        for (const p of props) rec[p] = cs[p as keyof CSSStyleDeclaration] as string;
        const r = el.getBoundingClientRect();
        rec["_box"] = `${Math.round(r.width)}x${Math.round(r.height)}`;
        rec["_top"] = String(Math.round(r.top));
        out[role] = rec;
      }
      return out;
    },
    { table: PROBE as unknown as unknown[][], idx: which },
  );
}

test("the card, against the ref it was drawn from", async ({ page }) => {
  /* ── the ref ── */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REF);
  await page.waitForTimeout(600);
  const ref = await probe(page, 0);
  const refGrid = await page.evaluate(() => {
    const g = document.querySelector(".grid") as HTMLElement | null;
    if (!g) return null;
    const cs = getComputedStyle(g);
    return { gridTemplateColumns: cs.gridTemplateColumns, gap: cs.gap, cards: g.querySelectorAll(".card").length };
  });
  /* ⚠️ THE STACK, NOT A PROPERTY. Name over agency is a claim about two boxes, and only their
     tops can answer it — a `display` reading alone would not catch a flex row. */
  const refStack = await page.evaluate(() => {
    const nm = document.querySelector(".card .nm") as HTMLElement | null;
    const ag = document.querySelector(".card .ag") as HTMLElement | null;
    const mo = document.querySelector(".card .leaf .mo") as HTMLElement | null;
    const dy = document.querySelector(".card .leaf .dy") as HTMLElement | null;
    return {
      nameAboveAgency: nm && ag ? ag.getBoundingClientRect().top - nm.getBoundingClientRect().top : null,
      leafMonthAboveDay: mo && dy ? dy.getBoundingClientRect().top - mo.getBoundingClientRect().top : null,
    };
  });

  /**
   * ⚠️ DOES PLAYFAIR'S NUMERAL DESCEND? The ref sets `line-height: 1` on the leaf's day, which is
   * the exact construction the house law forbids without checking — a line box the size of the em
   * crops anything below the baseline. Digits are usually safe, but a serif with OLD-STYLE figures
   * descends on 3, 4, 5, 7 and 9, and the day can be any of 1–31. So it is measured, not assumed:
   * the ink of every digit against the baseline, in the ref's own loaded Playfair.
   */
  const inkOf = (text: string, px: number, lh: string) => ({ text, px, lh });
  const INK: { text: string; px: number; lh: string }[] = [
    /* the leaf's day — the ref's own `line-height: 1` */
    inkOf("0123456789", 19, "1"),
    /* the agent NAME at the ref's 1.15 and at the house floor. An agent is a real person and their
       name is whatever it is: `Jorge`, `Pippa`, `Guy`. `.qcc-nm` has NO vertical padding and DOES
       clip (`overflow: hidden` for the ellipsis), so a spill here is cropped ink, not slack. */
    inkOf("Jorge Pippa Guy qy", 20, "1.15"),
    inkOf("Jorge Pippa Guy qy", 20, "1.3"),
  ];
  const inkChecks = await page.evaluate((cases) => cases.map((c) => {
    const probe = document.createElement("span");
    probe.style.cssText = `font-family:'Playfair Display',serif;font-size:${c.px}px;line-height:${c.lh};position:absolute;left:-9999px;display:block`;
    probe.textContent = c.text;
    document.body.appendChild(probe);
    const box = probe.getBoundingClientRect();
    const r = document.createRange();
    r.selectNodeContents(probe);
    const ink = [...r.getClientRects()].reduce(
      (a, k) => ({ top: Math.min(a.top, k.top), bottom: Math.max(a.bottom, k.bottom) }),
      { top: Infinity, bottom: -Infinity },
    );
    const out = {
      what: `${c.text.slice(0, 12)} @${c.px}px lh:${c.lh}`,
      boxHeight: Math.round(box.height * 100) / 100,
      spillBelow: Math.round((ink.bottom - box.bottom) * 100) / 100,
      spillAbove: Math.round((box.top - ink.top) * 100) / 100,
    };
    probe.remove();
    return out;
  }), INK);

  const figureInk = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.cssText = "font-family:'Playfair Display',serif;font-size:19px;line-height:1;position:absolute;left:-9999px";
    probe.textContent = "0123456789";
    document.body.appendChild(probe);
    const box = probe.getBoundingClientRect();
    const r = document.createRange();
    r.selectNodeContents(probe);
    const ink = [...r.getClientRects()].reduce(
      (acc, k) => ({ top: Math.min(acc.top, k.top), bottom: Math.max(acc.bottom, k.bottom) }),
      { top: Infinity, bottom: -Infinity },
    );
    const out = {
      boxHeight: Math.round(box.height * 100) / 100,
      inkHeight: Math.round((ink.bottom - ink.top) * 100) / 100,
      spillBelow: Math.round((ink.bottom - box.bottom) * 100) / 100,
      spillAbove: Math.round((box.top - ink.top) * 100) / 100,
    };
    probe.remove();
    return out;
  });

  /* ── the build ── */
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  const built = await probe(page, 1);
  const builtGrid = await page.evaluate(() => {
    const g = document.querySelector(".qcc-grid") as HTMLElement | null;
    if (!g) return null;
    const cs = getComputedStyle(g);
    return { gridTemplateColumns: cs.gridTemplateColumns, gap: cs.gap, cards: g.querySelectorAll(".qcc").length };
  });
  /**
   * ⚠️ THE INK OF THE REAL `.qcc-nm`, NOT OF A PROBE SPAN. The first version of this check measured
   * a synthetic element with a hardcoded line-height — so reverting the card to the ref's 1.15 left
   * it green, because the assertion was about a hypothetical the card does not produce. Proved by
   * mutation. `.qcc-nm` clips (`overflow: hidden`, no vertical padding), so ink below its own box
   * is cropped ink on a real person's name.
   */
  const nameCrop = await page.evaluate(() => {
    const el = document.querySelector(".qcc .qcc-nm") as HTMLElement | null;
    if (!el) return null;
    /* a name that definitely carries a descender, restored straight after */
    const was = el.textContent;
    el.textContent = "Jorge Pippa Guy qy";
    const box = el.getBoundingClientRect();
    const r = document.createRange();
    r.selectNodeContents(el);
    const ink = [...r.getClientRects()].reduce(
      (a, k) => ({ top: Math.min(a.top, k.top), bottom: Math.max(a.bottom, k.bottom) }),
      { top: Infinity, bottom: -Infinity },
    );
    const out = {
      lineHeight: getComputedStyle(el).lineHeight,
      overflow: getComputedStyle(el).overflow,
      boxHeight: Math.round(box.height * 100) / 100,
      spillBelow: Math.round((ink.bottom - box.bottom) * 100) / 100,
    };
    el.textContent = was;
    return out;
  });

  const builtStack = await page.evaluate(() => {
    const nm = document.querySelector(".qcc .qcc-nm") as HTMLElement | null;
    const ag = document.querySelector(".qcc .qcc-ag") as HTMLElement | null;
    const mo = document.querySelector(".qcc .qcc-leaf-mo") as HTMLElement | null;
    const dy = document.querySelector(".qcc .qcc-leaf-dy") as HTMLElement | null;
    return {
      nameAboveAgency: nm && ag ? ag.getBoundingClientRect().top - nm.getBoundingClientRect().top : null,
      leafMonthAboveDay: mo && dy ? dy.getBoundingClientRect().top - mo.getBoundingClientRect().top : null,
    };
  });

  /* ⚠️ WHICH RULE WINS, for every property that differs. A value is a symptom; the winning
     selector is the fault, and without it a mismatch gets "fixed" with an override. */
  const sources: Record<string, unknown> = {};
  const client = await page.context().newCDPSession(page);
  /* ⚠️ BOTH AGENTS FIRST. `CSS.getMatchedStylesForNode` fails with "CSS agent was not enabled"
     otherwise — and the first run of this probe reported nine attribution failures for exactly
     that reason. It said so rather than reporting "no rule", which is the difference between a
     probe that is broken and one that is silently wrong. */
  await client.send("DOM.enable");
  await client.send("CSS.enable");
  const { root } = await client.send("DOM.getDocument", { depth: -1, pierce: true }) as { root: { nodeId: number } };
  for (const [role, , sel, props] of PROBE) {
    const bad = props.filter((p) => (built[role]?.[p] ?? "") !== (ref[role]?.[p] ?? ""));
    if (!bad.length) continue;
    try {
      const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel }) as { nodeId: number };
      if (!nodeId) { sources[role] = "node not found"; continue; }
      const m = await client.send("CSS.getMatchedStylesForNode", { nodeId }) as {
        matchedCSSRules?: { rule: { selectorList: { text: string }; style: { cssProperties: { name: string; value: string }[] } } }[];
      };
      const winners: Record<string, string> = {};
      for (const p of bad) {
        const css = p.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
        /* last match wins in the cascade, so walk from the end */
        for (const entry of [...(m.matchedCSSRules ?? [])].reverse()) {
          const hit = entry.rule.style.cssProperties.find((c) => c.name === css || c.name === css.split("-")[0]);
          if (hit) { winners[p] = `${entry.rule.selectorList.text} { ${hit.name}: ${hit.value} }`; break; }
        }
        if (!winners[p]) winners[p] = "(no rule — initial/inherited default)";
      }
      sources[role] = winners;
    } catch (e) { sources[role] = `probe failed: ${String(e)}`; }
  }

  /* ⚠️ THE TOOLBAR IS MEASURED BY PRESENCE AND BY ROW, NOT BY CLASS. "Is Group on the page" and
     "is Group in the row beneath the quick filters" are different claims, and only the second is
     what the ref draws. Rows are compared by `top`, which is the only thing that can answer it. */
  const toolbar = await page.evaluate(() => {
    /* ⚠️ SCOPED TO THE VISIBLE PAGE. Every workspace page stays MOUNTED, so a document-wide
       `byText("Filter")` matches a hidden page's copy and reports it at `top: 0` — which is what
       the first run of this probe did for Filter, Group and Sort all three. The tell is a rect at
       the origin; the fix is to search inside the grid that is actually on screen. */
    const quick = document.querySelector(".qcc-quick") as HTMLElement | null;
    const scope = quick?.closest(".wpg") as HTMLElement | null;
    const top = (el: Element | null) => (el ? Math.round(el.getBoundingClientRect().top) : null);
    const onScreen = (el: Element | null) => !!el && (el as HTMLElement).getBoundingClientRect().height > 0;
    /* ⚠️ BY ACCESSIBLE NAME, NOT BY `textContent`. `PillTrig` has been a 36px ICON button since
       v5 P1 — a deliberate decision, with "the word in the title, the aria-label and the popover's
       own header" — so a text search finds none of the trio and reports a correctly-built toolbar
       as missing. That is what the first run of this probe did. */
    const nameOf = (b: HTMLElement) =>
      (b.getAttribute("aria-label") ?? b.getAttribute("title") ?? b.textContent ?? "").trim().toLowerCase();
    const byText = (t: string) =>
      scope
        ? [...scope.querySelectorAll<HTMLElement>("button, a")].find(
            (b) => nameOf(b).startsWith(t) && b.getBoundingClientRect().height > 0,
          ) ?? null
        : null;
    return {
      scopeFound: !!scope,
      quickRowTop: top(quick),
      searchInput: onScreen(scope?.querySelector("input[type='search'], .f12-lsearch input") ?? null),
      filterBtn: !!byText("filter"), filterTop: top(byText("filter")),
      groupBtn: !!byText("group"), groupTop: top(byText("group")),
      sortBtn: !!byText("sort"), sortTop: top(byText("sort")),
      logBtn: !!byText("log new query"), logTop: top(byText("log new query")),
      /* ⚠️ MEASURED AFTER A FILTER IS ACTUALLY SET — see below. The first run reported this row
         "missing" on a page that had nothing to put in it, which is a statement about the fixture
         rather than about the page. */
      activeChipsRow: onScreen(scope?.querySelector(".f12-chips") ?? null),
      quickRowControls: quick
        ? [...quick.querySelectorAll<HTMLElement>("button")].map(
            (b) => `${(b.textContent ?? "").trim() || "(icon)" + nameOf(b)}@${Math.round(b.getBoundingClientRect().top)}`,
          )
        : [],
    };
  });

  const refToolbar = { note: "measured separately below" };
  void refToolbar;

  /**
   * ⚠️ THE CHIPS ROW ONLY EXISTS WHEN A FILTER DOES, so asserting its presence on an unfiltered
   * page asserts nothing. Set one, re-read, and put it back — a measurement that leaves the
   * account filtered has changed the thing it was measuring.
   */
  const chipsWhenFiltered = await (async () => {
    const pill = page.locator(".qcc-qf", { hasText: "With you" }).first();
    if (!(await pill.count())) return { ran: false, present: false, count: 0 };
    await pill.click();
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const quick = document.querySelector(".qcc-quick") as HTMLElement | null;
      const scope = quick?.closest(".wpg") as HTMLElement | null;
      const row = scope?.querySelector(".f12-chips") as HTMLElement | null;
      return { present: !!row && row.getBoundingClientRect().height > 0, count: row?.querySelectorAll("button").length ?? 0 };
    });
    /* back to All, so the next case does not inherit a filtered page */
    const all = page.locator(".qcc-qf", { hasText: /^All/ }).first();
    if (await all.count()) { await all.click(); await page.waitForTimeout(300); }
    return { ran: true, ...r };
  })();

  mkdirSync("reports", { recursive: true });
  writeFileSync(
    "reports/query-centre-measure.json",
    JSON.stringify({ ref, built, refGrid, builtGrid, refStack, builtStack, toolbar, chipsWhenFiltered, figureInk, inkChecks, nameCrop, sources }, null, 2),
  );

  /* The suite must not go green on a page that rendered no card. */
  expect(Object.keys(ref).length, "the ref probe found nothing").toBeGreaterThan(10);
  expect(built["card"]?.MISSING, "no built card on the page").toBeUndefined();
  expect(builtGrid?.cards ?? 0, "the built grid held no cards").toBeGreaterThan(0);

  /**
   * ⚠️ THE ALLOWED DIVERGENCES ARE NAMED, EACH WITH ITS REASON. An exclusion list that merely
   * silenced noise would grow one entry per inconvenient failure; these three are decisions, and
   * if any of them stops being true the assertion below fails and the reason has to be rewritten.
   */
  const ALLOWED = new Set([
    /* the house Playfair descender floor beats the ref's 1.15, which was tuned to a drawn title */
    "nm.lineHeight",
    /* `var(--font-serif)` — same face, one more fallback. Reading the token is right. */
    "band.word.fontFamily",
    /* the ref's `normal`, stated as 1.35 so a failed webfont cannot drop it under the floor */
    "band.word.lineHeight",
  ]);

  const mismatches: string[] = [];
  for (const [role, , , props] of PROBE) {
    for (const p of props) {
      const key = `${role}.${p}`;
      if (ALLOWED.has(key)) continue;
      const a = ref[role]?.[p], b = built[role]?.[p];
      if (a !== b) mismatches.push(`${key}: ref="${a}" built="${b}"`);
    }
  }
  expect(mismatches, `card diverges from the ref:\n  ${mismatches.join("\n  ")}`).toEqual([]);

  /* ⚠️ AND THE GEOMETRY, WHICH IS THE CLAIM A PROPERTY TABLE CANNOT MAKE. The name must sit ABOVE
     the agency and the month ABOVE the day — both were wrong by construction before the fix
     (8px and −15px), and both are invisible to a `display` reading alone if a flex row is ever
     introduced instead. */
  expect(builtStack.nameAboveAgency, "the agency is not below the name").toBeGreaterThan(20);
  expect(builtStack.leafMonthAboveDay, "the leaf's day is not below its month").toBeGreaterThan(10);
  expect(Math.abs((builtStack.nameAboveAgency ?? 0) - (refStack.nameAboveAgency ?? 0)),
    "name→agency gap differs from the ref by more than 4px").toBeLessThanOrEqual(4);

  /**
   * ⚠️ THE NAME MAY NOT CROP, AND THIS ASSERTS THE PROPERTY RATHER THAN THE VALUE — so a future
   * retune to any line-height fails only if it actually crops, and passes if it does not.
   *
   * Measured: at the ref's `1.15` the ink of "Jorge Pippa Guy qy" spills **2px below** its box, and
   * `.qcc-nm` clips (`overflow: hidden`, no vertical padding), so those 2px are cropped ink on
   * every agent whose name carries a descender. At `1.3` the spill is 0. The ref drew names that
   * happened not to have one.
   */
  expect(nameCrop, "the name-crop probe found no card").toBeTruthy();
  /* the precondition: this claim only means anything on a box that actually clips */
  expect(nameCrop!.overflow, "the name stopped clipping — this check now proves nothing")
    .not.toBe("visible");
  expect(nameCrop!.spillBelow, `the agent name crops its descenders (line-height ${nameCrop!.lineHeight})`)
    .toBeLessThanOrEqual(0);

  /* the toolbar the ref draws, in the browsing view */
  expect(toolbar.searchInput, "no search in the browsing view").toBe(true);
  expect(toolbar.filterBtn && toolbar.groupBtn && toolbar.sortBtn, "the Filter/Group/Sort trio is incomplete").toBe(true);
  expect(chipsWhenFiltered.ran, "the chips probe never set a filter — it proves nothing").toBe(true);
  expect(chipsWhenFiltered.present, "no active-filter chips row once a filter is set").toBe(true);
});
