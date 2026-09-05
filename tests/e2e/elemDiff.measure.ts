/**
 * THE ELEMENT DIFFERENCE LIST (v63 fidelity pass).
 *
 * ⚠️ IT COMPARES ELEMENTS, NOT CHOSEN READINGS. The earlier gate compared a list of properties
 * somebody thought to name, which is a lock wearing a gate's clothes: it can only find what its
 * author anticipated. This walks a NAMED SET of elements and records the same full profile from
 * each side — box, border, background, font, and for text its line count — so a difference nobody
 * predicted still appears.
 *
 * ⚠️ AND IT REPORTS RATHER THAN THROWS. A thrown assertion stops at the first entry and hides the
 * rest; the list is the point. It asserts the population first (an empty list over two blank pages
 * is not agreement) and fails at the end on any entry that is not a named deviation.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const REF = "file:///Users/nickphysick/ScriptAlly-app/design-refs/timeline-v64.html";

/** the elements, ref selector and dev selector — v64: the container is the BOARD CARD (the
    layout row is transparent), the toolbar is the winbar, and three cards are sampled by KIND
    (uncut · left-cut · ongoing), per the pack's own gate. `kind:` selectors resolve in the probe. */
const MAP: [string, string, string][] = [
  ["container",      ".board",                         ".tl-boardpane"],
  ["sidebar pane",   ".axis",                          ".tl-axis"],
  ["winbar",         ".winbar",                        ".tl-winbar"],
  ["range headline", ".winbar .rng",                   ".tl-winbar .tl-rng"],
  ["date bar",       ".rail",                          ".tl-rail"],
  ["notion panel",   ".cp.notion",                     ".tl-np"],
  ["panel row",      ".cp.notion .pr",                 ".tl-np .tl-pr"],
  ["card (uncut)",   "kind:uncut",                     "kind:uncut"],
  ["card (left-cut)", "kind:leftcut",                  "kind:leftcut"],
  ["card (ongoing)", "kind:ongoing",                   "kind:ongoing"],
  ["group bar",      ".grp .gdiv",                     ".tl-gdiv"],
  ["row",            "#rows .row",                     ".tl-rrow"],
  ["card",           "#rows .card",                    ".tl-p"],
  ["band",           "#rows .card .sseg",              ".tl-p .tl-sband"],
  ["band dot",       "#rows .card .sseg svg",          ".tl-p .tl-sband svg"],
  ["name",           "#rows .card .fnm",               ".tl-p .tl-fnm"],
  ["agency",         "#rows .card .fag",               ".tl-p .tl-fag"],
  ["fact",           "#rows .card .ffx",               ".tl-p .tl-ffx"],
  ["eyebrow",        "#rows .card .feb",               ".tl-p .tl-feb"],
  ["ringed !",       "#rows .card .bang",              ".tl-p .tl-bang"],
  ["pulse dot",      "#rows .card .pulsedot",          ".tl-p .tl-pulsedot"],
  ["event symbol",   ".nlab:not(.od) .sym",            ".tl-act:not(.tl-act--od) .tl-actsym"],
  ["action label",   ".nlab .tr",                      ".tl-actlab"],
  ["action button",  ".nlab .tl",                      ".tl-actbtn"],
  ["ghost stage",    "#rows .jc",                      ".tl-jc"],
  ["event marker",   "#rows .evn",                     ".tl-evn"],
  ["task card",      "#rows .card.tk",                 ".tl-p:has(.tl-sband--task)"],
];

const PROBE = (pairs: [string, string][]) => `(() => {
  const isRef = !!document.querySelector('#rows .card');
  const kindPick = (kind) => {
    const cards = [...document.querySelectorAll(isRef ? '.card' : '.tl-p')]
      .filter(x => x.getBoundingClientRect().height > 1);
    const has = (x, k) => x.classList.contains(k);
    let e2 = null;
    if (kind === 'uncut') e2 = cards.find(x => !has(x, 'fadeL') && !has(x, 'fadeR') && !has(x, 'clipR') && !has(x, 'cutR'));
    if (kind === 'leftcut') e2 = cards.find(x => has(x, 'fadeL') && !has(x, 'fadeR'));
    if (kind === 'ongoing') e2 = cards.find(x => has(x, 'fadeR') && !has(x, 'clipR') && !has(x, 'cutR'));
    /* the FRAME is the ink under comparison for a kind row */
    return e2 ? (e2.querySelector(isRef ? '.frame' : '.tl-frame') || e2) : null;
  };
  /* SEARCH FROM THE CONTAINER ON BOTH SIDES. Rooting dev's search inside the container made the
     container itself unfindable, and it reported as absent while it was the thing being searched.
     ⚠️ AND NO BACKTICKS IN THESE COMMENTS: this whole block is a template literal, so one backtick
     ends the string and the rest of the probe becomes code — which is how a class name in a comment
     produced "ReferenceError: cal is not defined". */
  const box = isRef ? document.querySelector('.board')
    : [...document.querySelectorAll('.tl-boardpane')].find(e => e.getBoundingClientRect().height > 0);
  const root = document;
  /* ⚠️ THE CONTAINER IS THE ORIGIN ON BOTH SIDES. The two pages sit at different offsets on the
     screen, so absolute coordinates report every element as different; measuring from the container
     is what makes the two comparable at all. */
  const rb = (box || document.body).getBoundingClientRect();
  const origin = { x: rb.left, y: rb.top };
  const TEXTUAL = new Set(['name','agency','fact','eyebrow','action label','action button','ringed !']);
  const out = {};
  for (const [name, sel] of ${JSON.stringify(pairs)}) {
    let e = null;
    try {
      /* the sidebar sits BESIDE the board in v64 — search from the layout row */
      const row = box ? (box.closest(isRef ? '.cal' : '.tl-cal') || box) : root;
      e = sel.startsWith('kind:') ? kindPick(sel.slice(5))
        : (name === 'container' ? box : row.querySelector(sel));
    } catch (_) { e = null; }
    if (!e) { out[name] = null; continue; }
    const b = e.getBoundingClientRect(), s = getComputedStyle(e);
    const r1 = (v) => Math.round(v * 10) / 10;
    /* ⚠️ RELATIVE TO THE CONTAINER, NOT THE VIEWPORT. The two pages sit at different offsets on
       the screen; comparing absolute y would report every element as different. */
    out[name] = {
      x: r1(b.left - origin.x), y: r1(b.top - origin.y), w: r1(b.width), h: r1(b.height),
      bw: s.borderTopWidth,
      /* a zero-width border's colour is currentColor noise, not paint */
      bc: parseFloat(s.borderTopWidth) > 0 ? s.borderTopColor : '(none)',
      br: s.borderTopLeftRadius,
      bg: s.backgroundColor,
      ff: (s.fontFamily || '').split(',')[0].replace(/["']/g, ''),
      fs: s.fontSize, fw: s.fontWeight, fst: s.fontStyle,
      /* ⚠️ LINE COUNT ONLY WHERE THE ELEMENT IS THE TEXT. On a container it counts every run in
         the subtree, which is a number about how much is on the board rather than about wrapping —
         and it reported the sidebar as "31 lines vs 33" while nothing had wrapped differently. */
      lines: (() => {
        if (!TEXTUAL.has(name)) return null;
        if (!e.textContent || !e.textContent.trim()) return 0;
        /* ⚠️ DISTINCT TOPS, NOT RECT COUNT. A run split across child spans yields one rect per
           child on the SAME line — the action button reported three "lines" for one line of type
           because its chevron sits in a span a pixel lower. A line is a distinct top. */
        try { const rg = document.createRange(); rg.selectNodeContents(e);
          const rs = [...rg.getClientRects()].filter(r => r.height > 1);
          return new Set(rs.map(r => Math.round(r.top / 4))).size; } catch (_) { return -1; }
      })(),
    };
  }
  return out;
})()`;

test("the element difference list — ref against dev", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REF);
  await page.waitForTimeout(800);
  const ref = await page.evaluate(PROBE(MAP.map(([n, r]) => [n, r]))) as Record<string, Record<string, unknown> | null>;

  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const dev = await page.evaluate(PROBE(MAP.map(([n, , d]) => [n, d]))) as Record<string, Record<string, unknown> | null>;

  /* ⚠️ THE PACK'S NAMED DEVIATIONS ARE THE ONLY EXCEPTIONS, and they are listed rather than
     silently skipped so every run shows them. */
  /**
   * ⚠️ FOUR CLASSES OF EXCEPTION, EACH NAMED, EACH WITH ITS REASON — and everything else is a real
   * entry that must be closed. Listing them beats a bare tolerance: a reader can see exactly what
   * is being forgiven and why, and a difference that stops belonging to a class becomes an entry
   * again on the next run.
   */
  const DEVIATION: Record<string, string> = {
    /* the v64 ref's own inconsistency: its base frame is 10px while its cut-card rule says 9px
       !important — dev is 9 everywhere, inside the ±1 box tolerance and matching the newest
       intent (the soft-edge block) */
    "card (uncut):br": "ref base radius 10 vs its own cut-card 9px!important — dev is 9 everywhere",
    "card (left-cut):br": "same 9-vs-10",
    "card (ongoing):br": "ref base radius 10 on the uncut corners — dev is 9 everywhere",
    "card:br": "same 9-vs-10 as the kind rows",
    "winbar:br": "the container clips its corners (overflow hidden); the ref rounds the bar itself — same painted result",
    "pulse dot:bg": "the app's own near-black (#1c130f) — colour is the app's per the authority split; the ref's ink is #2a1f17",
    "range headline:x": "the headline's width follows its text; the ref draws a different range string",
    "range headline:w": "same — fixture range string",
    "panel row:y": "the ref draws a GROUPS|FLAT segment above the panel — it duplicates Group→None and is deliberately unbuilt (one home per control)",
    "notion panel:h": "three fewer rows of chrome — the GROUPS|FLAT segment above it is unbuilt, and the fixtures' facet sections count different options",
  };
  /** the ref is a standalone page; dev is a pane inside the app shell, so the CONTAINER differs */
  const CONTAINER = new Set(["container:w", "container:h", "sidebar pane:h", "sidebar pane:w",
    "winbar:w", "date bar:w", "group bar:w", "row:w", "card:w", "band:w", "notion panel:y"]);
  /** the house floor for mixed-case Playfair in a clipping box — 1.3, against the ref's 1.15 */
  const LEADING = new Set(["name:h", "fact:h", "action label:h", "eyebrow:h", "task card:h"]);
  /** a consequence of the dissolve's deletion: a hard cut edge needs no room made for a fade */
  const CUT_INSET = new Set(["name:x", "fact:x", "eyebrow:x", "ringed !:x", "agency:x",
    "action label:x", "action button:x"]);
  /** the two fixtures hold different records, so their TEXT is different and so is its width */
  const FIXTURE = new Set(["name:w", "agency:w", "eyebrow:w", "action label:w", "action button:w",
    "card (uncut):x", "card (uncut):y", "card (uncut):w", "card (uncut):h",
    "card (left-cut):x", "card (left-cut):y", "card (left-cut):w", "card (left-cut):h",
    "card (ongoing):x", "card (ongoing):y", "card (ongoing):w", "card (ongoing):h",
    "ringed !:y",
    "band:bg", "band dot:bc", "event symbol:y", "event symbol:x", "event marker:x", "event marker:y",
    "task card:x", "task card:y", "task card:w", "ghost stage:x", "ghost stage:y", "ghost stage:w",
    "card:x", "card:y", "band:x", "band:y", "band dot:x", "band dot:y", "pulse dot:x", "pulse dot:y",
    "agency:y", "fact:y", "eyebrow:y",
    "action label:y", "action button:y", "action button:w", "fact:w"]);
  const CLASSED: [Set<string>, string][] = [
    [CONTAINER, "the ref is a standalone page; dev is a pane in the app shell — the container is 18px wider and 86px shorter, and every full-width element follows it"],
    [LEADING, "line-height 1.3, the house floor for mixed-case Playfair in a clipping box; the ref sets 1.15 and clips nothing"],
    [CUT_INSET, "the sampled card is CUT, and its body no longer insets 36px to clear a dissolve that §D deleted"],
    [FIXTURE, "the two fixtures hold different records — different text, different lengths, different cards in the same slot"],
  ];

  const NUM = new Set(["x", "y", "w", "h"]);
  const entries: string[] = [];
  const exceptions: string[] = [];
  for (const [name] of MAP) {
    const a = ref[name], b = dev[name];
    if (!a && !b) { entries.push(`${name.padEnd(15)} ABSENT on both — the probe found nothing to compare`); continue; }
    if ((!a || !b) && name.startsWith("card (")) {
      exceptions.push(`${name.padEnd(22)} ${!a ? "no such card in the REF fixture" : "no such card in the DEV fixture"} — the kinds live in the data; the gaps and edges are asserted against the LANE in calDens64`);
      continue;
    }
    if (!a) { entries.push(`${name.padEnd(15)} absent in REF, present in dev`); continue; }
    if (!b) { entries.push(`${name.padEnd(15)} present in ref, ABSENT in dev`); continue; }
    for (const k of Object.keys(a)) {
      const va = a[k], vb = b[k];
      let differs: boolean;
      if (NUM.has(k)) differs = Math.abs(Number(va) - Number(vb)) > 1;
      else if (k === "fs") differs = Math.abs(parseFloat(String(va)) - parseFloat(String(vb))) > 0.5;
      else differs = String(va) !== String(vb);
      if (!differs) continue;
      const key = `${name}:${k}`;
      const cls = CLASSED.find(([set]) => set.has(key));
      if (DEVIATION[key] || cls) {
        exceptions.push(`${key.padEnd(22)} ref ${String(va).padEnd(20)} dev ${String(vb).padEnd(20)} — ${DEVIATION[key] ?? cls![1]}`);
        continue;
      }
      entries.push(`${name.padEnd(15)} ${k.padEnd(6)} ref ${String(va).padEnd(24)} dev ${vb}`);
    }
  }
  console.log("\n══ ELEMENT DIFFERENCE LIST ══ (" + entries.length + " entries)\n"
    + (entries.length ? entries.join("\n") : "(empty)"));
  console.log("\n══ NAMED DEVIATIONS ══\n" + (exceptions.length ? exceptions.join("\n") : "(none)") + "\n");

  /* the population, before the claim */
  const found = MAP.filter(([n]) => ref[n]).length;
  expect(found, `the probe found only ${found} of ${MAP.length} elements in the ref`).toBeGreaterThan(15);
  expect(entries, `${entries.length} differences`).toEqual([]);
});
