/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DASHBOARD HEADER (stage 1, 17 Sep) — the greeting, the counts line and the hawk, measured on
 * a rendered page at the three widths the brief names.
 *
 * ⚠️ THE CLAIMS HERE ARE ABOUT BOXES, SO THEY CANNOT LIVE IN A SOURCE LOCK. "The illustration sits
 * whole" is a fact about the image's box against every ancestor that clips; "nothing below the
 * header moved sideways" is a comparison of two builds. The unit suite proves the markup and the
 * rules were written; this proves the page laid them out.
 *
 * ⚠️ TWO PHASES, ONE FILE. `SA_DASH_HEADER_PHASE=before` records the page as it stood (no header
 * assertions — the old header fails every one of them by design) and writes the column boxes to
 * `before-<width>.json`. The default phase asserts the new header and, when
 * `SA_DASH_HEADER_BASELINE` names a directory holding a `before` file for the same width, requires
 * every column below the header to keep its x and its width. The comparison is OPT-IN because a
 * baseline describes one change: left lying in the output directory it would be read against every
 * later build, including ones that move columns on purpose. Not requested is REPORTED, never
 * silently treated as agreement.
 *
 * ⚠️ READ AFTER THE COVER LEAVES. Since v33.2 the page stands down to `display: none` while the
 * loading cover is up, so a read on a fixed timer can land on a page with no boxes at all.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/dashHeader.measure.ts
 *   optional: SA_DASH_HEADER_OUT=<dir>  SA_DASH_HEADER_WIDTHS=1440,1200,768,375
 *             SA_DASH_HEADER_BASELINE=<dir holding before-<width>.json from a `before` run>
 */
import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { KILL_MOTION, KILL_MOTION_ID, openRoute } from "./measure";

const OUT = resolve(process.env.SA_DASH_HEADER_OUT ?? "test-results/dash-header");
const PHASE: "before" | "after" = process.env.SA_DASH_HEADER_PHASE === "before" ? "before" : "after";
const BASELINE = process.env.SA_DASH_HEADER_BASELINE ? resolve(process.env.SA_DASH_HEADER_BASELINE) : null;
const ALL = [
  { w: 1440, h: 900 },
  { w: 1200, h: 900 },
  { w: 768, h: 1024 },
  { w: 375, h: 812 },
];
const PICK = (process.env.SA_DASH_HEADER_WIDTHS ?? "").split(",").map((s) => Number(s.trim())).filter(Boolean);
const WIDTHS = PICK.length ? ALL.filter((v) => PICK.includes(v.w)) : ALL;

/** Everything below the header whose horizontal geometry must not move. */
/* ⚠️ RETARGETED (v16, 18 Sep): the breakdown, the goals grid and its two columns are retired with the
   sections they named. The page is two rows and five cards, and those are what sit below the header. */
const BELOW = [".os-row1", ".os-row2", ".os-qa", ".os-lead", ".os-cl", ".os-feed", ".os-todo"];

type Box = { x: number; y: number; w: number; h: number; r: number; b: number };

/* ⚠️ A RECORDER FROM THE FIRST FRAME — the loading cover holds for ~half a second, so polling after
   `goto` returns can miss it entirely. Every distinct (text, under-the-cover) state of the counts
   line is kept, which is what lets the report say what a reader saw while the data was out. */
function installRecorder(page: Page) {
  return page.addInitScript(() => {
    const w = window as unknown as { __saHdr: Array<{ t: string; cover: boolean; shimmer: number; at: number }> };
    w.__saHdr = [];
    const tick = () => {
      const cover = document.querySelector(".os-skelpage");
      const el = (cover && cover.querySelector(".os-hdcounts")) || document.querySelector(".os-hdcounts");
      if (el) {
        /* raw text — normalised in Node, never by a regex in the page (CLAUDE.md) */
        const t = el.textContent || "";
        const inCover = !!el.closest(".os-skelpage");
        const hdr = el.closest(".os-greet");
        const shimmer = hdr ? hdr.querySelectorAll(".os-sk, .os-skel").length : -1;
        const last = w.__saHdr[w.__saHdr.length - 1];
        if (!last || last.t !== t || last.cover !== inCover) w.__saHdr.push({ t, cover: inCover, shimmer, at: Math.round(performance.now()) });
      }
      if (performance.now() < 30000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function openDash(page: Page, w: number, h: number) {
  await installRecorder(page);
  /* ⚠️ SIGN IN AT DESKTOP WIDTH, THEN MOVE. The shared helper waits for the FIRST shell element to
     be visible, and at phone width that is the hidden sidebar — so a 375 open times out after a
     sign-in that worked. The narrow read reloads at its own width instead, which is also what a
     phone does: it never saw the desktop layout. */
  const narrow = w < 1025;
  await openRoute(page, "/dashboard", narrow ? { width: 1440, height: 900 } : { width: w, height: h });
  if (narrow) {
    await page.setViewportSize({ width: w, height: h });
    await page.reload();
    await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` });
  }
  await expect(page.locator(".os-skelpage"), "the loading cover must leave before anything is read").toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator(".os-root .os-content").first()).toBeVisible({ timeout: 30_000 });
  /* the entrance stagger is a transform that removes itself at 900ms; KILL_MOTION stills it, and
     this settles anything a late render moved */
  await page.waitForTimeout(600);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** The whole reading, taken in one evaluate so every number describes the same frame. */
function readPage(page: Page, below: string[]) {
  return page.evaluate((below) => {
    const round = (n: number) => Math.round(n * 10) / 10;
    const box = (el: Element | null): Box | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height), r: round(r.right), b: round(r.bottom) };
    };
    const root = document.querySelector(".os-root");
    const q = (s: string) => (root ? root.querySelector(s) : null);
    const hdr = q(".os-content .os-greet");
    const h1 = hdr ? hdr.querySelector("h1") : null;
    const counts = hdr ? hdr.querySelector(".os-hdcounts") : null;
    /* ⚠️ THE HEADER'S ILLUSTRATION IS RETIRED (v16) — this reads null now, and the ABSENCE is the
       claim: the hawk came off with the stat cards' marks, and the page carries no picture outside
       the quick-action tiles. A probe kept pointing at it would report `null` for ever and prove
       nothing, so what it feeds is an assertion that nothing is there. */
    const img = hdr ? (hdr.querySelector(".os-hdart, .os-greet img") as HTMLImageElement | null) : null;
    /* the dot carries the margins and the ink; its wrapper is a zero-size span holding the spaces */
    const sep = counts ? counts.querySelector(".os-hddot") : null;
    const nums = counts ? [...counts.querySelectorAll("b")] : [];
    const style = (el: Element | null) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        family: s.fontFamily, size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing, color: s.color, marginTop: s.marginTop, marginLeft: s.marginLeft,
        marginRight: s.marginRight, display: s.display, whiteSpace: s.whiteSpace,
      };
    };

    /* ⚠️ INK AGAINST EVERY CLIPPING ANCESTOR — the only instrument that is right for a line-height
       below the family's own ascent+descent (CLAUDE.md). The text's range rects, walked up to the
       first ancestor whose overflow is not visible. */
    const clipped = (el: Element | null, rects: DOMRect[]) => {
      const out: string[] = [];
      let a = el ? el.parentElement : null;
      while (a && a !== document.documentElement) {
        const s = getComputedStyle(a);
        if (s.overflowX !== "visible" || s.overflowY !== "visible") {
          const ab = a.getBoundingClientRect();
          for (const r of rects) {
            if (r.width === 0 && r.height === 0) continue;
            if (r.left < ab.left - 0.5 || r.right > ab.right + 0.5 || r.top < ab.top - 0.5 || r.bottom > ab.bottom + 0.5) {
              out.push(`${a.className || a.tagName} clips [${round(r.left)},${round(r.top)} → ${round(r.right)},${round(r.bottom)}] against [${round(ab.left)},${round(ab.top)} → ${round(ab.right)},${round(ab.bottom)}]`);
            }
          }
        }
        a = a.parentElement;
      }
      return out;
    };
    const textRects = (el: Element | null) => {
      if (!el) return [] as DOMRect[];
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()];
    };

    const imgStyle = img ? getComputedStyle(img) : null;
    const colL = q(".os-row1");
    const rootText = root ? (root.textContent || "") : "";
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      header: box(hdr),
      headerStyle: hdr ? (() => { const s = getComputedStyle(hdr); return { display: s.display, flexDirection: s.flexDirection, alignItems: s.alignItems, justifyContent: s.justifyContent, gap: s.columnGap, marginBottom: s.marginBottom }; })() : null,
      h1: { box: box(h1), text: h1 ? (h1.textContent || "").trim() : null, style: style(h1), clip: clipped(h1, textRects(h1)), lines: textRects(h1).length },
      counts: {
        box: box(counts), text: counts ? (counts.textContent || "") : null,
        style: style(counts), clip: clipped(counts, textRects(counts)),
        nums: nums.map((b) => ({ t: b.textContent, weight: getComputedStyle(b).fontWeight })),
        sep: style(sep), sepText: sep ? sep.textContent : null,
      },
      img: img ? {
        box: box(img), complete: img.complete, natural: { w: img.naturalWidth, h: img.naturalHeight },
        src: img.currentSrc.split("/").pop(), alt: img.getAttribute("alt"),
        style: imgStyle ? {
          display: imgStyle.display, objectFit: imgStyle.objectFit, height: imgStyle.height, width: imgStyle.width,
          border: imgStyle.borderTopWidth + " " + imgStyle.borderTopStyle, radius: imgStyle.borderTopLeftRadius,
          background: imgStyle.backgroundColor + " " + imgStyle.backgroundImage, shadow: imgStyle.boxShadow,
          blend: imgStyle.mixBlendMode,
        } : null,
        clip: clipped(img, [img.getBoundingClientRect()]),
      } : null,
      colL: box(colL),
      /* how many tracks the page's bottom row resolves to — two beside each other, or one stack */
      gridTracks: (() => {
        const g = q(".os-content > .os-row2");
        return g ? getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length : null;
      })(),
      below: Object.fromEntries(below.map((s) => [s, box(q(s))])),
      /* how far the stage runs past the window — the shell's own width, not the page's */
      stageOverflow: (() => {
        const st = document.getElementById("app-stage-scroll");
        return st ? Math.round(st.getBoundingClientRect().right - window.innerWidth) : null;
      })(),
      tourChip: box(q(".os-tourchip")),
      old: {
        counters: root ? root.querySelectorAll(".os-counters, .os-counter, [data-probe='stats'], [data-probe='stat-card'], .os-cic").length : -1,
        subtitle: rootText.includes("on your desk today"),
        oldMarks: document.querySelectorAll("img[src*='active-query-image'], img[src*='response-rate-icon']").length,
        headerShimmer: hdr ? hdr.querySelectorAll(".os-sk, .os-skel").length : -1,
      },
      /* ⚠️ THE CHIP STATES "All N" NOW, AND THE FIGURE IS PULLED OUT RATHER THAN READ WHOLE — a probe
         comparing "All 23" against "23" fails on a page that is perfectly correct. */
      todoBadge: (() => {
        const b = q("[data-probe='todo-badge']");
        return b ? ((b.textContent ?? "").match(/[\d,]+/)?.[0] ?? null) : null;
      })(),
      /* the chart states its figure in its eyebrow: "N out with agents · …" */
      chartActive: (() => {
        const n = q("[data-probe-text='chart-eyebrow']");
        return n ? ((n.textContent ?? "").match(/[\d,]+/)?.[0] ?? null) : null;
      })(),
      emptyPage: !!q("[data-probe='chart-empty']"),
      seen: (window as unknown as { __saHdr?: unknown[] }).__saHdr ?? [],
    };
  }, below);
}

/** What was actually DRAWN — a computed family says what was asked for, not what painted. */
async function drawnFonts(page: Page, selector: string) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    if (!nodeId) return null;
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    return fonts.map((f: { familyName: string; glyphCount: number }) => `${f.familyName} ×${f.glyphCount}`);
  } finally {
    await cdp.detach();
  }
}

test.describe("the dashboard header", () => {
  test.describe.configure({ mode: "serial" });
  mkdirSync(OUT, { recursive: true });

  for (const { w, h } of WIDTHS) {
    test(`${PHASE} · ${w}×${h}`, async ({ page }) => {
      await openDash(page, w, h);
      const r = await readPage(page, BELOW);
      /* whitespace normalised HERE, in Node — a regex inside a browser-side function is the house trap */
      const norm = (s: string | null) => (s === null ? null : s.replace(/\s+/g, " ").trim());
      r.counts.text = norm(r.counts.text);
      r.seen = (r.seen as Array<{ t: string }>).map((s) => ({ ...s, t: norm(s.t) }));
      const fonts = r.h1.box ? await drawnFonts(page, ".os-root .os-content .os-greet h1") : null;
      await page.screenshot({ path: resolve(OUT, `${PHASE}-${w}.png`) });
      if (r.header) {
        const pad = 16;
        await page.screenshot({
          path: resolve(OUT, `${PHASE}-${w}-header.png`),
          clip: {
            x: Math.max(0, r.header.x - pad), y: Math.max(0, r.header.y - pad),
            width: Math.min(r.viewport.w - Math.max(0, r.header.x - pad), r.header.w + pad * 2),
            height: r.header.h + pad * 2 + 40,
          },
        });
      }
      writeFileSync(resolve(OUT, `${PHASE}-${w}.json`), JSON.stringify({ ...r, fonts }, null, 2));
      // eslint-disable-next-line no-console
      console.log(`[${PHASE} ${w}] header ${JSON.stringify(r.header)} · h1 "${r.h1.text}" · counts "${r.counts.text}" · img ${JSON.stringify(r.img?.box ?? null)} · fonts ${JSON.stringify(fonts)}`);
      // eslint-disable-next-line no-console
      console.log(`[${PHASE} ${w}] cover states seen: ${JSON.stringify(r.seen)}`);

      if (PHASE === "before") return;

      /* ── the loading cover: the words, never a figure, never a shimmer — for its WHOLE life ── */
      const coverStates = (r.seen as Array<{ t: string | null; cover: boolean; shimmer: number }>).filter((s) => s.cover);
      expect(coverStates.length, "the cover was never caught — this case would be vacuous").toBeGreaterThan(0);
      for (const s of coverStates) {
        /* ⚠️ TWO CLAUSES, NOT THREE, AND THE MISSING ONE IS THE POINT. The day clause is "Day 1,018" —
           its figure is INSIDE the words rather than before them, so there is no version of it with
           the number taken out. It is omitted entirely while the data is out rather than rendered as
           a bare "Day", which would be a sentence with a hole in it. */
        expect(s.t, "the cover's header states no figure").toBe("queries out · waiting on you");
        expect(s.shimmer, "the cover's header carries no shimmer").toBe(0);
      }

      /* ── the old header is gone ── */
      expect(r.old.counters, "no stat card, stat row or stat slot may render").toBe(0);
      expect(r.old.subtitle, "the sub-line is removed").toBe(false);
      expect(r.old.oldMarks, "the counters' illustrations are not on the page").toBe(0);
      expect(r.old.headerShimmer, "the header carries no skeleton").toBe(0);

      /* ══ WHAT THE HEADER ITSELF CONTROLS — asserted at every width ══ */

      /* ── the greeting ── */
      expect(r.header, "the header must render").not.toBeNull();
      expect(r.h1.text).toMatch(/^Hello, \S.*\.$/);
      expect(r.h1.style!.family.startsWith('"Special Elite"'), `family: ${r.h1.style!.family}`).toBe(true);
      expect(fonts?.join(" ") ?? "", "Special Elite is what actually painted").toContain("Special Elite");
      expect(r.h1.style!.weight).toBe("400");
      /* ⚠️ THE v16 SCALE AND ITS TWO STEPS — 56 at full width, 40 below 1000, 32 below 640. The ref
         draws one width; the two steps are Nick's prose and are the authority there. */
      const h1Size = w <= 640 ? 32 : w <= 999 ? 40 : 56;
      expect(r.h1.style!.size).toBe(`${h1Size}px`);
      expect(parseFloat(r.h1.style!.lineHeight)).toBeCloseTo(h1Size * 1.02, 1);
      expect(parseFloat(r.h1.style!.letterSpacing)).toBeCloseTo(0.005 * h1Size, 2);

      /* ── the counts line: the serif, not the page's sans, and 17px stepping to 15 on a phone ── */
      const cSize = w <= 640 ? 15 : 17;
      expect(r.counts.style!.size).toBe(`${cSize}px`);
      expect(parseFloat(r.counts.style!.lineHeight)).toBeCloseTo(cSize * 1.45, 1);
      expect(r.counts.style!.marginTop).toBe("10px");
      expect(r.counts.style!.color, "the line is ink").toBe(r.h1.style!.color);
      /* the normal line, or a new account's (no queries on this manuscript) — never both, never neither */
      const starting = r.counts.text?.startsWith("No queries out yet") ?? false;
      expect(r.counts.text).toMatch(starting
        ? /^No queries out yet · \d[\d,]* steps? to get started$/
        /* ⚠️ THREE CLAUSES SINCE v16, AND THE THIRD IS OPTIONAL — "Day N" is absent until this
           manuscript has a first send to count from, which is a real state on a fresh book. */
        : /^\d[\d,]* quer(y|ies) out · \d[\d,]* waiting on you( · Day \d[\d,]*)?$/);
      expect(r.counts.nums.map((n) => n.weight)).toEqual(starting ? ["600"] : ["600", "600"]);
      expect((r.counts.sepText ?? "").trim()).toBe("·");
      /* 8px either side, tightening to 6 on a phone with the type — the dot's air is the line's */
      const sepGap = w <= 640 ? "6px" : "8px";
      expect(r.counts.sep!.marginLeft).toBe(sepGap);
      expect(r.counts.sep!.marginRight).toBe(sepGap);
      expect(r.counts.sep!.color, "the dot is muted, not ink").not.toBe(r.counts.style!.color);

      /* the two figures are the page's own: the chart's headline and the to-do card's badge */
      const [queriesOut, tasksWaiting] = r.counts.nums.map((n) => Number((n.t ?? "").replace(/,/g, "")));
      if (starting) {
        expect(r.emptyPage, "the Getting Started line appears exactly when the page is in its empty moment").toBe(true);
        expect(String(queriesOut), "N steps === the Getting Started badge").toBe((r.todoBadge ?? "").replace(/,/g, ""));
      } else {
        expect(r.emptyPage, "the counts line never sits over the Getting Started list").toBe(false);
        expect(String(queriesOut), "queries out === the chart's Active queries").toBe((r.chartActive ?? "").replace(/,/g, ""));
        expect(String(tasksWaiting), "waiting on you === the to-do card's chip").toBe((r.todoBadge ?? "").replace(/,/g, ""));
      }

      /**
       * ── the illustration is RETIRED (v16), and the claim is inverted rather than dropped ──
       *
       * ⚠️ THE HEADER IS A GREETING AND ONE LINE OF FIGURES, at every width. The hawk went with the
       * stat cards' marks; the page's only pictures are the three quick-action tiles. Asserting the
       * absence is what stops it coming back without the decision being taken again — and the
       * header's own column claim goes with it, since a stacked header was only ever about making
       * room for a picture.
       */
      expect(r.img, "the header's illustration is back").toBeNull();
      expect(r.headerStyle!.flexDirection, "the header is a column at every width now").toBe("column");

      /* ── nothing below moved sideways — valid at every width, because it compares two builds ── */
      const beforeFile = BASELINE ? resolve(BASELINE, `before-${w}.json`) : null;
      if (!beforeFile || !existsSync(beforeFile)) {
        // eslint-disable-next-line no-console
        console.log(`[after ${w}] horizontal comparison NOT made — ${beforeFile ? `no baseline at ${beforeFile}` : "SA_DASH_HEADER_BASELINE not set"}`);
      } else {
        const before = JSON.parse(readFileSync(beforeFile, "utf8")) as { below: Record<string, Box | null> };
        const moved: string[] = [];
        for (const sel of BELOW) {
          const a = before.below[sel], b = r.below[sel];
          if (!a && !b) continue;
          if (!a || !b) { moved.push(`${sel}: ${a ? "present" : "absent"} → ${b ? "present" : "absent"}`); continue; }
          if (Math.abs(a.x - b.x) > 0.5 || Math.abs(a.w - b.w) > 0.5) moved.push(`${sel}: x ${a.x}→${b.x} w ${a.w}→${b.w}`);
        }
        // eslint-disable-next-line no-console
        console.log(`[after ${w}] horizontal shifts: ${moved.length ? moved.join(" · ") : "none"} · vertical: ${BELOW.map((s) => `${s} ${before.below[s]?.y ?? "-"}→${r.below[s]?.y ?? "-"}`).join(", ")}`);
        expect(moved, "nothing below the header may move sideways").toEqual([]);
      }

      /* ══ BELOW 1025 THE PAGE IS ONE STACK (phone fix, 17 Sep) ══
         It kept two tracks until then — the release was written for `.os-content` before `.os-grid`
         existed — so on a phone the left column resolved to ~0px and the activity column lay over it.
         Stacked: the header first, then the main content, then the activity column, which has a
         height of its own (it declared 0 for the side-by-side layout and was invisible when stacked).
         ⚠️ RETARGETED (stages 2–3): the header is the page's first row now, above the breakdown and the
         three-card row, rather than the left column's first child. */
      /* ⚠️ RETARGETED (v16): the page is a header and two rows, and below 1000 both rows are one
         track. The fault this guards is the one the phone fix found — a release written for the old
         wrapper left a stacked column resolving to ~0px with the next card lying over it. */
      if (w < 1000) {
        expect(r.gridTracks, "one track below 1000").toBe(1);
        const row1 = r.below[".os-row1"]!, row2 = r.below[".os-row2"]!;
        const feed = r.below[".os-feed"]!, todo = r.below[".os-todo"]!;
        expect(r.header!.b, "the header is the first thing in the stack").toBeLessThanOrEqual(row1.y + 0.5);
        expect(row1.b, "then the three cards").toBeLessThanOrEqual(row2.y + 0.5);
        expect(todo.y, "the to-do card comes after the feed").toBeGreaterThanOrEqual(feed.b - 0.5);
        expect(todo.x, "and shares its left edge").toBeCloseTo(feed.x, 0);
        expect(todo.w, "and its width").toBeCloseTo(feed.w, 0);
        expect(feed.h, "a stacked card is not collapsed").toBeGreaterThan(200);
        expect(todo.h, "nor is the one beneath it").toBeGreaterThan(200);
      }
      /* ⚠️ KNOWN, AND THE SHELL'S: the desktop shell will not shrink below its widest rigid row (its
         columns are `min-width: auto`), and that row is the TOP BAR, not the page — measured 17 Sep by
         hiding each in turn: hiding the dashboard changes nothing, hiding `.ws-pagebar` fits the
         window. The bar was 913px at 768 before stages 2–3 and is 632px since, so from 900px up
         nothing overflows. Recorded, not asserted, and the annotation disappears when nothing does. */
      if ((r.stageOverflow ?? 0) > 0) {
        test.info().annotations.push({ type: "known-issue", description: `the stage runs ${r.stageOverflow}px past a ${w}px window (the shell does not shrink)` });
        // eslint-disable-next-line no-console
        console.log(`[after ${w}] KNOWN ISSUE — the stage runs ${r.stageOverflow}px past the window; the shell does not shrink below the page's natural width`);
      }

      /* ══ WHAT NEEDS THE PAGE'S OWN LAYOUT TO BE RIGHT ══ */

      /**
       * ⚠️ ONE LINE, ASSERTED AS "FEWER THAN TWO" RATHER THAN AS A FIGURE. Pinning it to
       * `size × line-height` fails on a correct page: the separator is `font-size: 0` and the dot
       * inside it is full size, so the dot's inline box is aligned to a zero-size parent's baseline
       * and extends the line box past the strut — measured 26.6 against a 24.65 strut at 1440. The
       * claim was never the number; it is that the line has not wrapped.
       *
       * (Distinct text-rect tops cannot answer this either: the zero-size spaces around the dot sit
       * at a top of their own on a line that has NOT wrapped.)
       */
      expect(r.counts.box!.h, "the counts line wrapped").toBeLessThan(cSize * 1.45 * 1.9);
      expect(r.counts.box!.h, "…or collapsed").toBeGreaterThanOrEqual(cSize * 1.45 - 0.5);
      expect(r.counts.clip).toEqual([]);
      expect(r.h1.clip, "no ancestor clips the greeting's ink").toEqual([]);
      /* ⚠️ RETARGETED (v16): the header spans the page's centred block — the first row's edges — and
         the next section is that row. The air between them is the header's own bottom padding; the
         old ~34px was the picture's, and the picture is gone. */
      const next = r.below[".os-row1"]!;
      expect(r.header!.x, "the header starts at the block's left edge").toBeCloseTo(next.x, 0);
      expect(r.header!.r, "and ends at its right edge").toBeCloseTo(next.r, 0);
      expect(next.y - r.header!.b, "the row begins where the header ends").toBeCloseTo(0, 0);
      expect(r.docOverflowX, "nothing overflows the page sideways").toBeLessThanOrEqual(0);
    });
  }
});
