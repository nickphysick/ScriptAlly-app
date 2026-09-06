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
        tracks: cs.gridTemplateColumns, gap: cs.columnGap,
      };
    })()`) as { card: number; split: number; left: number; right: number; tracks: string; gap: string } | null;

    /* ⚠️ THE CONTENT AREA IS THE SPLIT, NOT THE VIEWPORT. The split IS the page's body inside the
       grid's scroll row; measuring against the window would fold in the sidebar, the gutter and
       the shell's own padding, and would pass on a card that was 200px short in a 200px-narrower
       column. Equality to a tenth of a pixel, both edges, because "roughly full width" is what a
       one-track grid gives you anyway and would pass on a two-track one at a wide viewport. */
    add("P1.2 @" + w + " · the list card's width IS the content area's",
        !!fill && Math.abs(fill.card - fill.split) < 0.5 && Math.abs(fill.left) < 0.5 && Math.abs(fill.right) < 0.5,
        fill ? "card " + fill.card + " / area " + fill.split + " · gaps L" + fill.left + " R" + fill.right : "not found");
    /* ⚠️ RE-POINTED WITH THE MOTION (Phase 2). The resting split is TWO tracks now — the drawer's
       is zero — because `grid-template-columns` only interpolates between lists of the same
       length, so a one-track rest state would have made opening a snap rather than a move. The
       claim is unchanged and is stated directly: the list gets the whole width, which means the
       second track is zero AND the gap is zero. A zero track with a standing 18px gap would leave
       the list 18px short at rest, forever, and P1.2 above is what would catch it. */
    const restTracks = (fill?.tracks ?? "").trim().split(/\s+/);
    add("P1.3 @" + w + " · at rest the drawer's track is zero and so is the gap",
        !!fill && restTracks.length === 2 && parseFloat(restTracks[1]) === 0 && parseFloat(fill.gap) === 0,
        fill ? "grid-template-columns = " + fill.tracks + " · gap " + fill.gap : "not found");

    /* ── the row's four columns (tightened round, Phase 2: pill · deed · agent · wait) ──── */
    const row = await page.evaluate(`(() => {
      const r = document.querySelector(".tlc .row");
      const card = document.querySelector(".tlc");
      if (!r || !card) return null;
      const tracks = getComputedStyle(r).gridTemplateColumns.trim().split(/[ ]+/).map(Number);
      const cellW = (sel) => { const e = r.querySelector(sel); if (!e) return null;
        const b = e.getBoundingClientRect(); return Math.round(b.width * 10) / 10; };
      const vis = (sel) => { const e = r.querySelector(sel); return e ? getComputedStyle(e).visibility : "absent"; };
      return {
        tracks, ag: cellW(".r-ag"), fig: cellW(".r-fig"),
        who: !!r.querySelector(".r-deed .r-who"),
        avatar: (() => { const a = r.querySelector(".av.s"); if (!a) return null;
          const b = a.getBoundingClientRect(); const s = getComputedStyle(a);
          return { w: Math.round(b.width), h: Math.round(b.height), bg: s.backgroundColor, bd: s.borderTopColor,
                   bw: s.borderTopWidth, txt: (a.textContent || "").trim() }; })(),
      };
    })()`) as any;

    add("P1.4 @" + w + " · the wide row is a FOUR-track grid",
        !!row && row.tracks.length === 4, row ? "tracks = [" + row.tracks.join(", ") + "]" : "no row");
    /* the harness account holds four manuscripts, so this is the PRESENT half of the brief's pair */
    /* (P1.5 is DELETED — the manuscript COLUMN is retired with the 44px row; the name rides the action strip's meta, measured in tightened.measure.ts P2.3) */

    /* (the `hasms` probe went with P1.5 and P1.6 — there is no manuscript track to switch, and
       `showsManuscriptColumn` governs the SORT MENU's grouping option now rather than a column.) */
    /* (P1.6 is DELETED — same retirement — there is no manuscript track to be zero) */

    /* (the `.actb` probes and the row hover went with P1.7 and P1.8 — the action strip is a
       SIBLING beneath the row, so there is no control inside the row to measure at rest or under
       the pointer. What replaced them is measured in `tightened.measure.ts` P2.2–P2.4, which
       checks the strip's POSITION rather than a chip's fill: below the row, covering nothing. */
    /* ⚠️ THE LAW SURVIVES ITS OLD SUBJECT (tightened round, Phase 5). It used to be stated about
       `.actb` — "the action chip is a span, not a second tab stop" — and the chip is gone. The
       claim underneath it is about the ROW: the row IS the control, and a focusable child would
       put a second tab stop on every row for something the row already does. The strip is a
       SIBLING, so it is legitimately focusable and legitimately not inside the row. */
    const focusable = await page.evaluate(`(() => {
      const r = document.querySelector(".tlc .row");
      if (!r) return null;
      return { role: r.getAttribute("role"),
        kids: r.querySelectorAll("button, a[href], input, [tabindex]:not([tabindex='-1'])").length };
    })()`) as { role: string; kids: number } | null;
    add("P1.9 @" + w + " · the row IS the control, and holds no focusable child",
        !!focusable && focusable.role === "button" && focusable.kids === 0,
        focusable ? "role=" + focusable.role + " · focusable children = " + focusable.kids : "no row");

    /* ── the avatar ──────────────────────────────────────────────────────────────────────── */
    add("P1.10 @" + w + " · the agent's disc is 22px, blush, with a burgundy hairline",
        !!row && !!row.avatar && row.avatar.w === 22 && row.avatar.h === 22
          && row.avatar.bg === "rgb(239, 228, 220)" && row.avatar.bw === "1px"
          && row.avatar.bd.indexOf("124, 58, 42") > -1 && row.avatar.txt.length > 0,
        row && row.avatar
          ? row.avatar.w + "x" + row.avatar.h + " · " + row.avatar.bg + " · " + row.avatar.bw + " " + row.avatar.bd + " · " + JSON.stringify(row.avatar.txt)
          : "no avatar on the first row");

    /* (P1.11 is DELETED — the two-line meta is retired with the 44px row; the agent rides the deed inline, asserted in taskListWide.test.tsx and tightened P2.5) */

    /* ── the folded geometry, which Phase 2 will animate ─────────────────────────────────── */
    /* two clicks a render apart — the contract's click grammar (focus, then open) */
    await page.locator(".tlc .row").first().click();
    await page.waitForFunction("!!document.querySelector('.tlc .actrow.show')", null, { timeout: 5_000 }).catch(() => {});
    await page.locator(".tlc .row.focus").first().click();
    /* ⚠️ WAIT FOR THE MOTION, NEVER FOR A NUMBER OF MILLISECONDS. A fixed 320ms against a 380ms
       transition read the card at 523px and 525px — a true measurement of a box still moving,
       reported as a 3px design error. `getAnimations()` includes CSS transitions, so an empty list
       is the browser saying the interpolation is over; the timeout is a bound, not a guess. */
    await page.waitForFunction(
      "document.querySelector('.tdw-split').getAnimations().length === 0", null, { timeout: 5_000 })
      .catch(() => {});
    const folded = await page.evaluate(`(() => {
      const card = document.querySelector(".tlc");
      const split = document.querySelector(".tdw-split");
      const r = card && card.querySelector(".row");
      if (!card || !split || !r) return null;
      return {
        open: split.classList.contains("open"), folded: card.classList.contains("folded"),
        cardW: Math.round(card.getBoundingClientRect().width),
        tracks: getComputedStyle(r).gridTemplateColumns.trim().split(/[ ]+/).length,
        h: Math.round(r.getBoundingClientRect().height),
        agShown: getComputedStyle(r.querySelector(".r-ag")).display,
      };
    })()`) as any;

    add("P1.12 @" + w + " · opening a task folds the card to 520 and the row to three tracks",
        !!folded && folded.open && folded.folded && folded.cardW === 520 && folded.tracks === 3,
        folded ? "open=" + folded.open + " folded=" + folded.folded + " card=" + folded.cardW + "px tracks=" + folded.tracks : "not found");
    /* ⚠️ AND THE ROW IS STILL 44 — the fold drops the agent CELL and changes nothing else, which
       is the density claim's other half: before this round the folded row wrapped to ~58px, so
       every scroll position in the list moved when the drawer opened. */
    add("P1.13 @" + w + " · folded, the agent cell goes and the row is still 44px",
        !!folded && folded.agShown === "none" && Math.abs(folded.h - 44) <= 0.5,
        folded ? "agent cell " + folded.agShown + " · row " + folded.h + "px" : "not found");

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
