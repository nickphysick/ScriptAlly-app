/**
 * ⚠️ THE LIST AT FULL WIDTH — drawer round, Phase 1.
 *
 * The claims a stylesheet cannot make: what the browser did with two track lists, what the action
 * control is filled with at rest and under the pointer, and whether the page ARRIVES at rest at
 * all. The rule and the wiring are locked in `src/components/todo/taskListWide.test.tsx`; this
 * file is link 3 of the three, and it says so there.
 *
 * ⚠️ IT ASSERTS ITS PRECONDITION FIRST, AND THE PRECONDITION IS THE PHASE. Every claim below is
 * about the RESTING page, and until this round the page auto-docked its first card — so a run that
 * did not check would have measured the folded row and reported the resting one. An empty board
 * would satisfy the same claims while measuring nothing, so the row count is asserted too.
 *
 * ⚠️ NO BACKTICKS INSIDE ANY page.evaluate TEMPLATE, comments included — one terminates the string
 * and the file fails to COLLECT, which reads as "No tests found". No regex literals in one either:
 * the template eats the escape before the browser sees it.
 *
 * Read-only: it clicks a row and presses Escape. It presses no primary and writes nothing.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn, liftMotionSuppression } from "./measure";
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_LW_OUT ?? "run-artifacts/list-wide.txt";
rmSync(OUT, { force: true });

const WIDTHS = [1440, 1920];

test("the list at full width, the columns, and the action control", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  await ensureSignedIn(page);

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/todo");
    await page.waitForFunction(
      "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
    await liftMotionSuppression(page);

    /* ── the precondition: the page ARRIVES at rest ──────────────────────────────────────── */
    const rest = await page.evaluate(`(() => {
      const split = document.querySelector(".tdw-split");
      const card = document.querySelector(".tlc");
      return {
        rows: document.querySelectorAll(".tlc .row").length,
        open: !!(split && split.classList.contains("open")),
        folded: !!(card && card.classList.contains("folded")),
        sel: document.querySelectorAll(".tlc .row.sel").length,
      };
    })()`) as { rows: number; open: boolean; folded: boolean; sel: number };

    add("P1.0 @" + w + " · the board rendered, so there is something to measure",
        rest.rows > 0, "rows = " + rest.rows);
    add("P1.1 @" + w + " · the page ARRIVES at rest — nothing docked, nothing folded",
        !rest.open && !rest.folded && rest.sel === 0,
        "split.open=" + rest.open + " card.folded=" + rest.folded + " selected rows=" + rest.sel);

    /* ── the card fills the content area ────────────────────────────────────────────────── */
    const fill = await page.evaluate(`(() => {
      const card = document.querySelector(".tlc");
      const split = document.querySelector(".tdw-split");
      if (!card || !split) return null;
      const c = card.getBoundingClientRect(), s = split.getBoundingClientRect();
      const cs = getComputedStyle(split);
      return {
        card: Math.round(c.width * 10) / 10, split: Math.round(s.width * 10) / 10,
        left: Math.round((c.left - s.left) * 10) / 10,
        right: Math.round((s.right - c.right) * 10) / 10,
        tracks: cs.gridTemplateColumns,
      };
    })()`) as { card: number; split: number; left: number; right: number; tracks: string } | null;

    /* ⚠️ THE CONTENT AREA IS THE SPLIT, NOT THE VIEWPORT. The split IS the page's body inside the
       grid's scroll row; measuring against the window would fold in the sidebar, the gutter and
       the shell's own padding, and would pass on a card that was 200px short in a 200px-narrower
       column. Equality to a tenth of a pixel, both edges, because "roughly full width" is what a
       one-track grid gives you anyway and would pass on a two-track one at a wide viewport. */
    add("P1.2 @" + w + " · the list card's width IS the content area's",
        !!fill && Math.abs(fill.card - fill.split) < 0.5 && Math.abs(fill.left) < 0.5 && Math.abs(fill.right) < 0.5,
        fill ? "card " + fill.card + " / area " + fill.split + " · gaps L" + fill.left + " R" + fill.right : "not found");
    add("P1.3 @" + w + " · the resting split resolves to ONE track",
        !!fill && fill.tracks.trim().split(/\s+/).length === 1,
        fill ? "grid-template-columns = " + fill.tracks : "not found");

    /* ── the row's seven columns ─────────────────────────────────────────────────────────── */
    const row = await page.evaluate(`(() => {
      const r = document.querySelector(".tlc .row");
      const card = document.querySelector(".tlc");
      if (!r || !card) return null;
      const tracks = getComputedStyle(r).gridTemplateColumns.trim().split(/[ ]+/).map(Number);
      const cellW = (sel) => { const e = r.querySelector(sel); if (!e) return null;
        const b = e.getBoundingClientRect(); return Math.round(b.width * 10) / 10; };
      const vis = (sel) => { const e = r.querySelector(sel); return e ? getComputedStyle(e).visibility : "absent"; };
      const meta = r.querySelector(".r-meta");
      return {
        hasms: card.classList.contains("hasms"),
        tracks, ms: cellW(".r-ms"), msVis: vis(".r-ms"),
        ag: cellW(".r-ag"), agc: cellW(".r-agc"), fig: cellW(".r-fig"),
        msText: ((r.querySelector(".r-ms") || {}).textContent || "").trim(),
        avatar: (() => { const a = r.querySelector(".av.s"); if (!a) return null;
          const b = a.getBoundingClientRect(); const s = getComputedStyle(a);
          return { w: Math.round(b.width), h: Math.round(b.height), bg: s.backgroundColor, bd: s.borderTopColor,
                   bw: s.borderTopWidth, txt: (a.textContent || "").trim() }; })(),
        metaShown: meta ? getComputedStyle(meta).display : "absent",
      };
    })()`) as any;

    add("P1.4 @" + w + " · the wide row is a SEVEN-track grid",
        !!row && row.tracks.length === 7, row ? "tracks = [" + row.tracks.join(", ") + "]" : "no row");
    /* the harness account holds four manuscripts, so this is the PRESENT half of the brief's pair */
    add("P1.5 @" + w + " · the manuscript column is present and carries ink (4 manuscripts)",
        !!row && row.hasms && (row.ms ?? 0) > 0 && row.msVis === "visible",
        row ? "hasms=" + row.hasms + " width=" + row.ms + " visibility=" + row.msVis + " text=" + JSON.stringify(row.msText) : "no row");

    /* ⚠️ THE ABSENT HALF, MEASURED BY THE CLASS RATHER THAN BY A SECOND ACCOUNT. The harness
       account has four manuscripts and a one-manuscript fixture would mean deleting three, which
       cascades their queries. The RULE (showsManuscriptColumn) and the WIRING (the flag reaching
       this class) are locked in the unit spec; what only a browser can answer is what the class
       does to the track, and that is what this measures. Stated as the split it is. */
    const off = await page.evaluate(`(() => {
      const card = document.querySelector(".tlc");
      if (!card) return null;
      card.classList.remove("hasms");
      const r = card.querySelector(".row");
      const tracks = getComputedStyle(r).gridTemplateColumns.trim().split(/[ ]+/).map(Number);
      const ms = r.querySelector(".r-ms");
      const res = { tracks, w: Math.round(ms.getBoundingClientRect().width * 10) / 10,
                    vis: getComputedStyle(ms).visibility,
                    deed: Math.round(r.querySelector(".r-said").getBoundingClientRect().width * 10) / 10 };
      card.classList.add("hasms");
      return res;
    })()`) as any;

    add("P1.6 @" + w + " · without the class the manuscript track is ZERO and its ink is hidden",
        !!off && off.w === 0 && off.vis === "hidden",
        off ? "track = " + off.tracks[4] + " · cell width " + off.w + " · visibility " + off.vis : "not found");

    /* ── the action control ──────────────────────────────────────────────────────────────── */
    const act = await page.evaluate(`(() => {
      const r = document.querySelector(".tlc .row");
      const a = r && r.querySelector(".actb");
      if (!a) return null;
      const s = getComputedStyle(a);
      const word = a.querySelector(".w");
      return { tag: a.tagName, bg: s.backgroundColor, bd: s.borderTopColor, colour: s.color,
               wordShown: word ? getComputedStyle(word).display : "absent",
               tabbable: !!r.querySelector("button, a[href], input, [tabindex]:not([tabindex='-1'])") };
    })()`) as any;

    await page.locator(".tlc .row").first().hover();
    await page.waitForTimeout(220);

    const actHover = await page.evaluate(`(() => {
      const a = document.querySelector(".tlc .row .actb");
      if (!a) return null;
      const s = getComputedStyle(a);
      const word = a.querySelector(".w");
      return { bg: s.backgroundColor, bd: s.borderTopColor, colour: s.color,
               wordShown: word ? getComputedStyle(word).display : "absent" };
    })()`) as any;

    /* --pink is #f5e2da = rgb(245, 226, 218); at rest the fill must be fully transparent */
    add("P1.7 @" + w + " · the action control is transparent at rest",
        !!act && act.bg === "rgba(0, 0, 0, 0)" && act.bd === "rgba(0, 0, 0, 0)" && act.wordShown === "none",
        act ? "background " + act.bg + " · border " + act.bd + " · the word is " + act.wordShown : "not found");
    /* ⚠️ THE WORD'S COMPUTED DISPLAY IS `block`, NOT THE `inline` THE RULE STATES — `.actb` is an
       inline-flex container and a direct child is blockified before anything can read it. So the
       claim is "shown", not a spelling; asserting `inline` failed on a perfectly working control. */
    add("P1.8 @" + w + " · under the row's hover it is --pink and says the word",
        !!actHover && actHover.bg === "rgb(245, 226, 218)" && actHover.wordShown !== "none",
        actHover ? "background " + actHover.bg + " · border " + actHover.bd + " · colour " + actHover.colour + " · the word is " + actHover.wordShown : "not found");
    /* ⚠️ THE ROW IS THE ONLY CONTROL IN THE ROW — no second tab stop per row */
    add("P1.9 @" + w + " · the row holds no focusable child",
        !!act && act.tag === "SPAN" && act.tabbable === false,
        act ? "the control is a <" + act.tag.toLowerCase() + "> · focusable children = " + act.tabbable : "not found");

    /* ── the avatar ──────────────────────────────────────────────────────────────────────── */
    add("P1.10 @" + w + " · the agent's disc is 22px, blush, with a burgundy hairline",
        !!row && !!row.avatar && row.avatar.w === 22 && row.avatar.h === 22
          && row.avatar.bg === "rgb(239, 228, 220)" && row.avatar.bw === "1px"
          && row.avatar.bd.indexOf("124, 58, 42") > -1 && row.avatar.txt.length > 0,
        row && row.avatar
          ? row.avatar.w + "x" + row.avatar.h + " · " + row.avatar.bg + " · " + row.avatar.bw + " " + row.avatar.bd + " · " + JSON.stringify(row.avatar.txt)
          : "no avatar on the first row");

    /* ⚠️ THE META LINE AND THE COLUMNS ARE THE SAME FACTS, so exactly one of them shows. Wide, the
       sentence is redundant and hidden; folded (below) it is the only place those facts survive. */
    add("P1.11 @" + w + " · the meta sentence is hidden while the columns carry its facts",
        !!row && row.metaShown === "none", row ? "display = " + row.metaShown : "no row");

    /* ── the folded geometry, which Phase 2 will animate ─────────────────────────────────── */
    await page.locator(".tlc .row").first().click();
    await page.waitForTimeout(320);
    const folded = await page.evaluate(`(() => {
      const card = document.querySelector(".tlc");
      const split = document.querySelector(".tdw-split");
      const r = card && card.querySelector(".row");
      if (!card || !split || !r) return null;
      const meta = r.querySelector(".r-meta");
      return {
        open: split.classList.contains("open"), folded: card.classList.contains("folded"),
        cardW: Math.round(card.getBoundingClientRect().width),
        tracks: getComputedStyle(r).gridTemplateColumns.trim().split(/[ ]+/).length,
        metaShown: meta ? getComputedStyle(meta).display : "absent",
        actShown: getComputedStyle(r.querySelector(".actb")).display,
      };
    })()`) as any;

    add("P1.12 @" + w + " · opening a task folds the card to 520 and the row to three tracks",
        !!folded && folded.open && folded.folded && folded.cardW === 520 && folded.tracks === 3,
        folded ? "open=" + folded.open + " folded=" + folded.folded + " card=" + folded.cardW + "px tracks=" + folded.tracks : "not found");
    add("P1.13 @" + w + " · folded, the meta sentence comes back and the action control goes",
        !!folded && folded.metaShown === "block" && folded.actShown === "none",
        folded ? "meta " + folded.metaShown + " · action " + folded.actShown : "not found");

    /* ⚠️ THE CLOSE IS PHASE 2's, AND PHASE 1 FOUND THE CAUSE RATHER THAN BUILDING IT. There is no
       way to close the pane today by ANY route: `closeDock` has no caller (defined in
       `ToDoPage.tsx`, referenced nowhere), `TaskPane` renders no Close, and no Escape handler
       reaches the dock. That is the second reason the resting state was unreachable — the
       auto-dock stopped you arriving at it, and this stops you returning to it — and it is why
       the held-card fallback could keep a card on screen after a close for as long as it did
       without anybody noticing. The contract puts Close and Escape in the sheet's band, which
       Phase 2 builds; a Close button added here would sit in a band Phase 3 replaces. Reported,
       deliberately not built, and Phase 2 now has a cause rather than a symptom. */
  }

  writeFileSync(OUT, out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n") + "\n");
  // eslint-disable-next-line no-console
  console.log("\n" + out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n"));
  const bad = out.filter((r) => !r.ok);
  expect(bad.map((r) => r.id + " — " + r.note).join("\n"), "listWide").toEqual("");
});
