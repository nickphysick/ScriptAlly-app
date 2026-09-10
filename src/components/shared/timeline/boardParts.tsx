/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The timeline board's presentational leaves — the card, the markers and the action mark.
 *
 * ⚠️ MOVED VERBATIM FROM `TodoCalendarPage.tsx`, AND THE VERBATIM IS THE POINT. This is an
 * extraction, not a redesign: the board renders in Query Centre exactly as it renders in To-do, so
 * every line below is the line that was there, and the proof is a byte-identical `outerHTML` diff
 * of the `.tl` subtree at 1280/1440/1920 (`reports/calendar-extract-dom/`). Anything that renders
 * differently is a regression to fix, never a design decision taken in passing.
 *
 * ⚠️ WHAT DELIBERATELY DID NOT COME WITH IT: seven dead geometry constants that sat beside this
 * block in the page — `TEXT_INSET`, `MARK_W`, `PILL_INSET`, `CONTENT_MARGIN_R`, `ROW_DOT`,
 * `CARD_BADGE_PX`, `MONTH_SHELF_FROM`. Each has exactly one reference in the whole repo, its own
 * declaration, and two of them assert a lock that does not exist against a token that has since
 * drifted (`TEXT_INSET` 14 against `--tl-text-inset: 13px`; `MARK_W` 22 against `--mk: 16px`).
 * Carrying them into a fresh shared module would give a false contract a second life with more
 * authority than it had. They are left exactly where they are, and recorded as a To-do follow-up
 * in `reports/calendar-extract.md`.
 *
 * The board's geometry is the STYLESHEET's: the page supplies a day index and a lane index — data
 * — and every position resolves in `cqw` against `--tl-days`. That is why this file carries no
 * pixel of its own.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import type { Segment, BarNode } from "../../../lib/journeyBars";
import { barLines, familyOf, holderOf } from "../../../lib/journeyBars";
import { pillText, type CapKind } from "../../../lib/calendarPill";
import { fadesFor, cardBounds } from "../../../lib/calendarFade";
import { stateFor, turnWordFor } from "../../../lib/queryCardFacts";
import { shortCalDate } from "../../../lib/todoCalendar";
import { taskHolder } from "../../../lib/taskBars";
import type { CalSection } from "../../../lib/calendarSections";
import type { BoardRow } from "./types";

/** ⚠️ 14px — THE REF'S `.sseg svg`, AND IT SUPERSEDES §D's 20. That pass argued a glyph's legible
    size is part of the glyph and took the pack's 20; rendered, a 20px disc in a 26px band leaves
    three pixels of air and reads as an inset MEDALLION laid in the band rather than as the band's
    own leading mark. The type carries the line; the dot identifies it. Recorded rather than quietly
    changed, because the earlier reasoning is in the commit history and reads as settled. */
const STAGE_BAND_DOT_PX = 14;


/**
 * Where the crosshair stands, and what date it names — from a pointer position over a lane.
 *
 * ⚠️ SHARED BECAUSE BOTH BOARDS DRAW IT, and because the alternative is two pages computing a
 * date from an x and disagreeing by a day at the edges. Returns `null` for a pointer that is not
 * over a row's lane, which is the same answer as "no crosshair".
 */
export function crossAt(
  wrap: HTMLElement | null,
  target: EventTarget | null,
  clientX: number,
  visible: readonly string[],
  days: number,
  label: (ymd: string) => string,
): { x: number; label: string } | null {
  const lane = (target as HTMLElement | null)?.closest?.(".tl-c-tl") as HTMLElement | null;
  if (!wrap || !lane || !lane.closest(".tl-rrow")) return null;
  const wr = wrap.getBoundingClientRect();
  const lr = lane.getBoundingClientRect();
  const f = (clientX - lr.left) / lr.width;
  if (f < 0 || f > 1) return null;
  const idx = Math.min(visible.length - 1, Math.max(0, Math.round(f * days)));
  const ymd = visible[idx];
  if (!ymd) return null;
  return { x: (lr.left - wr.left) + f * lr.width, label: label(ymd) };
}

/**
 * ⚠️ ONE DATE→X MAPPING, AND IT IS THIS FRACTION. Everything on the board that stands on a date —
 * a tick numeral, the today dot, the today line, a card's left edge, a card's width — converts the
 * same way: the day index over the window's span. Two mappings is what this replaced, and the fault
 * it produced is the reason to keep them together.
 *
 * ⚠️ TWO UNIT RENDERINGS, BECAUSE ONE ELEMENT SITS OUTSIDE THE LANE'S CONTAINER — and that is a
 * constraint, not a second mapping. `.tl-c-tl` is the size container, so `100cqw` is the lane's
 * width for anything INSIDE it. The today line is a child of `.tl-rowsin`, which is an ANCESTOR of
 * the lanes rather than a descendant, so `cqw` there would find no container and silently resolve
 * against the small viewport — a third origin, and a worse one. It takes `%` instead.
 *
 * ⚠️ THE TWO ARE EQUAL, AND IT IS MEASURED RATHER THAN ASSUMED: `.tl-rowsin` and a row's lane are
 * the same box — x 551, width 1082 at 1710, `originDx: 0`. `qcCalToday.measure.ts` asserts the two
 * renderings land on the same pixel, so the day they stop being one box the lock says so.
 */
export const dayFraction = (day: number, days = 90) => day / days;

/** the lane's own children — `100cqw` is the lane's width at any depth inside it */
export const pct = (n: number) => `calc(${n} / var(--tl-days) * 100cqw)`;

/**
 * `.tl-rowsin`'s children — the today line alone. Same mapping, expressed as a percentage of the
 * box that element is actually positioned against.
 */
export const pctOfRows = (n: number, days: number) => `${(dayFraction(n, days) * 100).toFixed(4)}%`;

/**
 * ⚠️ A CARD SPANS EXACTLY ITS OWN DATES — NO CLEARANCE AT EITHER END, AND THE REMOVAL IS THE
 * POINT RATHER THAN A TIDY-UP.
 *
 * The clearance existed because pieces NEIGHBOURED each other: a run cut at a status change put
 * two pieces either side of one marker, and `--tl-gap` / `--tl-gap-mk` kept them off it. With one
 * card per relationship there is no neighbour to stand off from, and the 2px it still subtracted
 * was doing active harm: the closing mark sits at the end date, so a card inset 2px inside its own
 * end painted its terminal mark OUTSIDE itself. Measured, twice, before the lock's tolerance was
 * blamed — mark centre 889.4 against a card ending 887.4.
 *
 * `abutL`/`abutR` go with it. They answered "does this piece touch a marker", which is a question
 * only a cut model can ask.
 */
export const barLeft = (sg: Segment) => pct(sg.from);
/* the tint is positioned inside the frame, whose origin is the card's own left edge */
const barLeftPad = (_sg: Segment) => "0px";
export const barWidth = (sg: Segment) => pct(sg.to - sg.from);
/**
 * ⚠️ THE PAGE DECLARES WHICH LANE; THE STYLESHEET DECIDES WHERE THAT IS.
 *
 * `LANE_STEP = 52` and `laneTop(lane) = lane * 52` are retired, and so is `minHeight: lanes * 52
 * + 28`. Both read 52 and neither was the other's: the row's height was one expression and the
 * bar's offset was another, so the bar sat at the TOP of its row — measured, a 36px bar at `top:
 * 0` in a 132px row with 96px of empty ground beneath it. It is the shape `--tl-head-h` had, where
 * one element's position was written as a number a different element owns.
 *
 * A lane index is DATA — which line of this row does this belong to. Where that line is, and how
 * tall it is, are geometry, and geometry belongs where the tokens are. The page hands down
 * `--lane` and `--lanes`; every offset in the sheet is a `calc()` over `--lane-h`.
 */
export const laneVar = (lane: number): React.CSSProperties =>
  ({ ["--lane" as string]: String(lane) } as React.CSSProperties);

/* ⚠️ THE PAGE NO LONGER OWNS A FAMILY MAP. `familyOf` in `journeyBars` is the one source — the
   page had a second table keyed on the same `BarState`, which is two answers to one question
   waiting to disagree. Deleted rather than left as a pass-through. */

/**
 * One piece of a bar — a white track, a tinted fill, and the label riding on top.
 *
 * ⚠️ THE FILL IS AN ELEMENT WITH A WIDTH, NOT A GRADIENT STOP. A percentage written into a
 * background is a number no probe can read back and no reader can be sure of; a child with
 * `width: N%` is measurable, and `fillFor` is the only thing that decides N.
 *
 * ⚠️ AND A BAR WITH NO NAMED END RENDERS NO FILL ELEMENT AT ALL — not a fill of zero. Zero is a
 * claim that no time has passed; absence is the claim that nobody named a date, which is the true
 * one and the one the emptiness is there to make.
 */
export const Piece: React.FC<{
  sg: Segment; days: number; lastMarkAt: number | null; selected: boolean;
  /* v58: the identity travels with the card, so the row hands its name down */
  name: string;
  onPick: (el?: HTMLElement) => void; onOpen?: () => void; agency?: string;
}> = ({ sg, days, lastMarkAt, selected, onPick, onOpen, name, agency }) => {
  const lines = barLines(sg.label);
  /* ⚠️ THE PILL IS THE APP'S OWN VOCABULARY — see `calendarPill`. The status while the agency
     holds the move, the deed while the writer does, and nothing else is reachable. */
  /* ⚠️ v60 SPLITS THE TWO SILENCES, AND v58 HAD FOLDED THEM. `quiet` is a stated reply date that
     has passed on a running wait — the ref's Priya case, which v60 says PROMPTS — and `ghost` is
     the same absence past `GHOST_AFTER_DAYS`, which does not. Measured before the change: seven
     Urgent rows wore the sand `No Response` chip and offered no move at all, because both states
     reached one flag. `barState` decides which is which; nothing here re-derives a threshold. */
  const estLate = sg.state === "quiet";
  const silent = sg.state === "ghost";
  const pill = pillText(sg.status, holderOf(sg), sg.nudgeDue, !!sg.owed, silent, estLate);
  /**
   * ⚠️ FIVE CHIP KINDS, FROM THE REF, AND THE CLOSED ONE OUTRANKS THE REST. A closed relationship
   * is closed whoever last held it, so `shut` is tested first — reading the holder first would
   * paint a finished row in the writer's tone and invite an action that is over.
   */
  /**
   * ⚠️ THE CHIP'S TONE IS THE PILL'S OWN, NEVER A SECOND DERIVATION.
   *
   * This used to decide the tone itself, from the bar's state, while `pillText` decided the WORDS
   * from the status and the holder — two answers to one question, and they came apart the moment
   * v60 gave the passed-estimate case a deed. Measured: seven Urgent rows reading the imperative
   * `Nudge them` in the sand `quiet` tone, because the word came from the pill and the colour came
   * from here. A chip that says "do this" in the colour reserved for "nothing is happening" is the
   * two-surfaces-disagreeing fault this repo keeps recording, inside one element.
   *
   * ⚠️ `closed` AND `nudged` STAY HERE because they are facts about the BAR rather than about the
   * status — `pillText` is not told which stretch it is describing, so it cannot know them. They
   * are checked first, and everything else takes the pill's word for it.
   */
  const chipKind = sg.state === "closed" ? "shut"
    : sg.state === "nudged" ? "rem"
    : pill.tone === "wait" ? "you"
    : pill.tone;
  /* the hover record: the whole line, where the card can only show what fits */
  const record = [lines.t1, lines.t2].filter(Boolean).join(" · ");
  const facts = { trueFrom: sg.trueFrom, trueTo: sg.trueTo, from: sg.from, to: sg.to, days,
    live: sg.live, namedEnd: sg.namedEndAt };
  const fade = fadesFor(facts);
  const bounds = cardBounds(facts);
  /**
   * ⚠️ THE CONTENT BEGINS AFTER THE LAST MARK, and that is what makes one card possible.
   *
   * Marks used to BREAK the bar, so text never met one: the pieces were cut around them. With the
   * bar unbroken they ride on it, and words under a 22px disc are words nobody can read — measured
   * on the first render, a clock sitting across "FULL SENT" and "Quiet for 35 days".
   *
   * The offset is expressed in the lane's own mapping so it needs no measurement: the mark's
   * distance from the card's start, plus its own radius, plus the pinned 14px of air. `max()`
   * keeps the pinned left where a card has no mark, and a fadeL card takes its own inset — its
   * first 38px are dissolving, so text there would fade out mid-word.
   */
  /**
   * ⚠️ THE FADE INSET IS A FLOOR, NOT A CEILING — and the brief's two clauses meet here.
   *
   * "…or 44px on a fadeL card" is written for the ordinary left-clipped card, whose marks are off
   * the left edge with nothing in view to clear. A relationship that began before the window and
   * changed status INSIDE it has both: a dissolving left edge AND a mark to get past. Measured on
   * the first build, with the inset taken as a fixed value: content pinned at 623 with marks
   * painted at 682 and 903 — the clock sitting across "FULL SENT" and "Quiet for 35 days", which
   * is the exact fault this rule exists to remove. Both clauses are floors, so both are honoured
   * by taking the larger.
   */
  const inset = fade.left ? "var(--card-fade-inset)" : "var(--tl-text-inset)";
  /**
   * ⚠️ THE INSET IS FIXED, AND THE MARKS NO LONGER MOVE IT (v54, Phase 3).
   *
   * It was `max(inset, lastMark + mk/2 + 14px)` — text placed after whichever mark happened to
   * ride on the card. Measured across the board that produced TWELVE distinct insets (15, 46, 101,
   * 118, 119, 145, 172, 190, 216, 224, 376 and one card with none), so no two rows started their
   * sentence in the same place and the eye had nothing to run down.
   *
   * v54 removes the cause rather than the symptom: status changes earlier than the card are a
   * LEAD-IN drawn before its leading edge, so nothing rides on the card and nothing has to be got
   * past. `fadeL` still takes a wider inset because that card's first pixels are dissolving.
   */
  const contentLeft = inset;
  /* ⚠️ `clipR` IS ADDITIVE TO `fadeR`, NOT AN ALTERNATIVE TO IT (v63, §D). Both share the squared
     corner and the missing right border — the frame stops the same way — and they differ only in
     what is drawn past it: nothing on an ongoing card, a dissolve on a clipped one. Making them
     exclusive would mean restating the frame's treatment twice.

     ⚠️ AND THE NOTE IS OUT HERE RATHER THAN INSIDE THE `className` EXPRESSION. `calendarStyleReach`
     matches at most 900 characters of one, and two comments pushed this one past the bound — so the
     sweep stopped seeing `tl-p` and reported the whole card as unstyled. It fails by ABSENCE, which
     is why that file carries floor cases; they are what caught this. Keep prose out of a class list.
     Two older notes were hoisted here for the same reason; they follow.

     ⚠️ THE FADES ARE THE SEGMENT'S OWN FACTS. `openLeft` means the stretch began before the window
     and `openRight` that it runs past it — both already derived, both already the reason the old
     renderer squared its ends.

     ⚠️ THE PREDICATES ARE THE ONLY SOURCE — see `calendarFade`. This read `openLeft` and
     `openRight || live`, which is nearly the same and nearly is the problem: `openRight` is a
     compound that also asks whether the journey is terminal, whether it closes, whether it is
     open-ended and whether a reply window was given, so a card's edge dissolved because of a
     decision about reply windows. */
  return (
    <div
      /* ⚠️ THE CLASS LIST IS WRITTEN IN THE JSX, not built into a `const` above it. The style-reach
         sweep reads `className=` expressions out of this file, so a list assembled into a variable
         is invisible to it — and its report would be "this class has no rule", about a class it
         never saw. An absence that reads as a finding. */
      /* ⚠️ `cutR` IS GEOMETRY, `clipR` IS KNOWLEDGE — and v64 §F needed them apart. `clipR` says
         the EXPECTATION is named beyond the window, and an overdue wait carries it while its bar
         stops at today; `cutR` says the DRAWN box reaches the window's edge (journeyBars clamps
         `liveStop` at `span`, so a calm wait expecting a reply beyond the board draws to the
         edge). The window treatment — whole corners, 6px short of the lane — belongs to the
         geometry; treating `clipR` as the cut shortened a today-terminating bar by 6px. */
      className={`tl-at2 tl-p ${familyOf(sg.state)}${sg.hollow ? " hollow" : ""}${sg.owed ? " owed" : ""}`
        + `${fade.left ? " fadeL" : ""}${fade.right ? " fadeR" : ""}${fade.clipped ? " clipR" : ""}`
        + `${sg.to >= facts.days - 0.1 ? " cutR" : ""}`
        + `${selected ? " sel" : ""}`}
      /**
       * ⚠️ THE GEOMETRY IS CUSTOM PROPERTIES, NOT `left` AND `width` (v54, Phase 4).
       *
       * An inline `width` beats any stylesheet rule, so a hover rule could never open a card: the
       * declaration it would have to override is on the element itself. `--l` and `--w` are the
       * card's resting geometry from the date arithmetic; `--exp` and `--hx` are what an opened
       * card becomes, written by the fit pass. The rule reads whichever pair applies, and the
       * transition is on `width` and `left`, which are now stylesheet properties.
       */
      /* v65 §B — the bar names its segment so the hover pairing and the locks can follow it */
      data-seg={sg.key}
      style={{ ...laneVar(sg.lane),
        ["--l" as string]: barLeft(sg),
        ["--w" as string]: barWidth(sg),
        ["--content-left" as string]: contentLeft }}
      /* ⚠️ THE RELATIONSHIP'S OWN IDENTITY, ON THE ELEMENT, so a lock can count cards PER
         RELATIONSHIP rather than per row. A row holds one card per drawn query, and a writer with
         two books at one agency has two — counting per row would call that correct state a
         failure, and counting per row on the OLD model would have called a fragmented bar a pass
         wherever it happened to hold one relationship. */
      data-rel={`${sg.rowKey}::${sg.lane}`}
      data-state={sg.state}
      /* ⚠️ WHOSE MOVE IT IS, FROM THE APP'S OWN DERIVATION — `holderOf`, the same call the pill
         already makes. It is published because a lock that re-derives it from the card's family
         classes gets it wrong: `decide` (an offer) is the writer's move and does not carry `owed`
         or `req`, so a hand-written pair reads the most writer-owed card on the board as the
         agency's. A reader asking whose move it is must ask the function that decides it. */
      data-holder={holderOf(sg)}
      /* the agency's own stated date — a lock's independent source for "is this late at all" */
      data-expected={sg.expectedYmdRaw ?? undefined}
      /* ⚠️ WHICH QUERY THIS BAR IS, so a lock can ask whether the row's WORDS are about a query the
         row actually draws. Three variants of that bug shipped, each one a true sentence about a
         query the reader could not see, and none of them was catchable from appearance alone. */
      data-qid={sg.queryId}
      /* ⚠️ THE STRETCH'S OWN DATES, so the fade audit can assert the classes against the NUMBERS
         rather than asking a class about itself. The page published only the clipped coordinates
         before, so every leading piece reported a start of 0 — which is where a clipped card
         starts, not where its stretch began, and the audit could not be written at all. */
      /* ⚠️ WHERE LATENESS BEGINS, IN DAY UNITS, so a lock can assert the tint's painted left edge
         against the DATE rather than against the tint's own style. A probe that reads the tint's
         `left` and compares it with the tint's `left` is one reading of one number: proved, by a
         mutation that made every tint run its whole card and passed. */
      data-latefrom={sg.lateFrom != null ? sg.lateFrom.toFixed(3) : undefined}
      data-dueat={sg.dueAt != null ? sg.dueAt.toFixed(3) : undefined}
      /* ⚠️ THE NAMED END, PUBLISHED, so the fade audit asserts the classes from the DATES rather
         than from the classes themselves. A probe that reads `fadeR` and checks `fadeR` is one
         reading of one fact; the claim is that the class follows the date. */
      data-namedend={sg.namedEndAt != null ? sg.namedEndAt.toFixed(3) : "none"}
      data-from={sg.from.toFixed(3)}
      data-truefrom={bounds.start.toFixed(3)}
      data-trueto={bounds.end.toFixed(3)}
      data-days={String(days)}
      data-live={sg.live ? "1" : undefined}
      onClick={(e) => onPick(e.currentTarget as HTMLElement)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(); } }}
    >
      {/**
        * ⚠️ THE FRAME AND THE CONTENT ARE SIBLINGS, AND THE MASK IS THE FRAME'S ALONE (v54).
        *
        * A mask erases everything inside the element it is set on. It was set on the CARD, which
        * is the element containing the words — so a clipped card dissolved its own text along with
        * its fill. Measured before this change: 22 of 23 cards masked, and 14 rows with text
        * inside a dissolving zone, 26px of ink on thirteen of them. The rule's own comment reasons
        * about dissolving the card, which is exactly right for a background and takes the sentence
        * with it.
        *
        * The frame is the card's appearance — background, border, radius — and it is what
        * dissolves. The content is a sibling of it, unmasked, at full opacity, and clipped by its
        * own wrapper when it will not fit. Nothing about the card's box moves: the frame is
        * `position: absolute; inset: 0`, so the date arithmetic still owns the geometry.
        */}
      <div className="tl-frame" aria-hidden>
              {/**
        * ⚠️ v58 REMOVES THE OVERDUE TINT ENTIRELY — no fill, no pattern, nothing on the card face.
        *
        * Lateness is said twice now, both from the ref and both OUTSIDE the face: the card wobbles
        * occasionally, and the row carries a strip down its left edge. The tint was a third
        * statement of one fact, and the only one that had to know where the card's masks and
        * radius were.
        *
        * `lateFrom` and `dueAt` survive on the segment because a lock reads `dueAt` as its
        * independent source for "is this actually late" — the check the tint and the words could
        * never do for each other, being computed from the same number.
        */}
      </div>
      {/* ⚠️ THE PILL IS NOT INSIDE THE LABEL'S CONDITIONAL, and it used to be. A segment with an
          empty label rendered a card with NO pill and NO text — a blank white box with a border and
          a shadow, eight of them on a 32-card board. The pill never depended on the label: a card
          always knows whose move it is, which is the one thing it is for. */}
      {/**
        * ⚠️ THE CONTENT IS A COLUMN INSIDE A POSITIONED CLIP (v55, Phase 5; the ref's own shape).
        *
        * It was a flex ROW — pill, then line — so the headline began after the pill and the pill's
        * width is its text: "Queried" against "Send the revision". Measured on the board, the pill
        * sat at two correct insets and the headline at NINE x values, and no two rows started
        * their sentence in the same place. Nothing was centred; the eye simply had nothing to run
        * down.
        *
        * The ref stacks them: `.bodyclip` is absolute at `left: 13px` (42 on a fadeL card),
        * `right: 12px`, `overflow: hidden`; `.body` is `flex-direction: column` with the pill
        * `align-self: flex-start`. Both lines then begin at the clip's own left edge, which is one
        * number for the whole board.
        */}
      {/**
        * ⚠️ v58: THE IDENTITY LIVES IN THE CARD. The agent column is gone (`--agent-w: 0`), so the
        * dot, the name and the role-worded fact travel with the bar — the ref's
        * `.body > .bwrap > dot + .gstack(name, fact) + .chip`.
        *
        * ⚠️ THE FRAME IS EMPTY AND THE BODY IS ITS SIBLING. The frame carries the background, the
        * border, the radius and the fade masks; a mask must never be applied to an element holding
        * text, so the words sit outside it entirely.
        *
        * ⚠️ AND THE BODY'S LEFT INSET IS FIXED — 11px, or 34 on a card whose left edge dissolves.
        * It does not depend on what else the card carries: an inset computed from the marks riding
        * on a bar produced twelve distinct starts across one board, and the eye had nothing to run
        * down.
        */}
      {/* ══ THE BADGE (v60) ═════════════════════════════════════════════════════════════════
          ⚠️ IT IS THE APP'S `StatusDot`, AT THE REF'S SIZE, AND IT IS NEVER REDRAWN FROM THE REF.
          The ref's `dot()` builds its own SVGs and maps a coarse `dk` — one `partial` glyph for
          both "partial requested" and "partial sent". The app knows the real status, so it draws
          the real dot: the locked component, its soft fills, its inline glyphs and its pulse on the
          four states that ask something of the writer.

          ⚠️ IT BURSTS PAST THE CARD'S LEFT EDGE BY 35% OF ITSELF, and every ancestor between it
          and the section edge is `overflow: visible` — a clipping ancestor beats any z-index.
          What stops it escaping the SECTION is that `.tl-glanes` reserves exactly the overhang as
          padding, so the badge is drawn into room already held for it.

          ⚠️ AND ITS SIZE IS `width`/`height`, NEVER A CSS `transform` (Law 8). Some engines ignore
          a transform on an SVG element, so a scaled badge is the right size in one browser and the
          wrong size in another; the ref states `transform: none` on it for the same reason. */}
      {/* ══ THE STATUS BAND (v63, section D) ══════════════════════════════════════════════════
          ⚠️ IT IS QUERY CENTRE'S LANGUAGE, READ FROM QUERY CENTRE'S OWN FUNCTIONS. `stateFor` gives
          the fill's state and `turnWordFor` gives the holder's words — the same two the cards on
          that page draw from. A second mapping here is how two surfaces come to disagree about
          whose court a query is in, which is the fault this board has already paid for twice.

          ⚠️ IT IS `stateFor`, NOT `stageFor`, AND THAT IS THE WHOLE OF THIS CHANGE. The board used
          to paint an eight-rung ramp — three deepening sages out, three pinks in — which was its
          own answer to depth before `StatusDot` took that job. The app has five flat states locked
          across seven surfaces, so a Queried query read sand on Grid, List and Board and sage here.
          `stateFor` is the mapping those three already use; the board is now its fourth caller
          rather than the owner of a second ladder. `stageFor` is untouched — the task pane still
          reads it for its own column tint, which is a different claim about a different surface.

          ⚠️ THE BAND REPLACES THE FREE-STANDING BADGE. v61's disc burst past the card's left edge
          and every ancestor was held `overflow: visible` for it; the mark is inside the band now,
          so that overhang, its reserved padding and the whole escape route go with it. */}
      <span className={sg.isTask ? "tl-sband tl-sband--task" : `tl-sband tl-st-${stateFor(sg.status)}`}>
        {/* ⚠️ THE APP'S OWN `StatusDot`, AT 20px — the pack's value, and a deliberate departure
            from the ref's 14px `.sseg svg`. The ref sizes a flat glyph of its own making; this
            app's dot carries DIRECTION AND STAGE in its shape, and 14px loses that. A glyph's
            legible size is part of the glyph, which is the app's half of the authority split. */}
        {/* ⚠️ A TASK'S BAND CARRIES A CHECKBOX AND THE WORD "Task", NOT A `StatusDot`. A task has no
            query status; drawing one would put a pipeline stage on something that has never been
            sent anywhere. The ref draws the same checkbox for the same reason. */}
        {sg.isTask
          ? <><span className="tl-tbox" aria-hidden /><span className="tl-sw">Task</span></>
          : <><StatusDot status={sg.status} overrideSize={STAGE_BAND_DOT_PX} />
              <span className="tl-sw">{sg.status}</span></>}
        {/* ⚠️ THE NUDGE NOTE JOINS THE STATUS RATHER THAN REPLACING IT (v63, §D). The ref swaps its
            headline to `Nudged 26 Aug`, which on THIS board would leave the band saying "Nudged"
            while its own tint says "Queried" — the rung is named for the status, so removing the
            status makes the colour unattributable. A note beside it states both.

            ⚠️ AND IT IS A DATE, NOT "once/twice". A nudge count lives in the query's activity
            subcollection and this page does not load per-query events — the same limit
            `resolveExpectedDate` is handed `null` for. `lastNudgeSentDate` is what the data holds,
            and a count composed from what is here would be a fabricated figure wearing a real
            one's clothes. */}
        {sg.nudgedOn && <span className="tl-snote">Nudged {shortCalDate(sg.nudgedOn)}</span>}
        {/* the holder, at the band's right end — `turnWordFor`, never a second reading */}
        <span className="tl-sh">{sg.isTask ? taskHolder(!!sg.owed) : turnWordFor(sg.status)}</span>
      </span>
      <div className="tl-cardbody">
        {/* the glider: the ONLY thing that moves when clipped text glides on hover */}
        <div className="tl-bwrap">
          <span className="tl-gstack">
            {/* ⚠️ LINE ONE IS NAME + CHIP, LINE TWO IS AGENCY · FACT — the ref's `.trow` over
                `.ffx`. The chip rode BESIDE the stack before, which made it a third column and
                pushed the fact off the end of every narrow card. */}
            <span className="tl-trow">
              {/* ⚠️ THE NAME OPENS THE RELATIONSHIP, AND THE CARD KEEPS ITS OWN JOB.
                  The pack offers "the name inside a card, or the card". The card's click already
                  does something the calendar cannot otherwise do: where the writer owes materials
                  it opens the WORK flow, one press from the board. Handing the whole card to
                  navigation would delete that — a working affordance traded for a second route to
                  a page the row already reaches from its detail panel. So the name is the link and
                  the card is unchanged: additive, and the name is the conventional target anyway.
                  ⚠️ `stopPropagation`, or the card's own handler fires behind it and the reader
                  gets the work flow AND a navigation from one press. */}
              {/* a task's name is its own text; an agent's is a link to the relationship */}
              {onOpen ? (
                <button type="button" className="tl-fnm tl-fnmlink"
                  onClick={(e) => { e.stopPropagation(); onOpen(); }}
                  title={`Open ${name}`}>{name}</button>
              ) : (
                <span className="tl-fnm">{name}</span>
              )}
              {/* ⚠️ THE AGENCY JOINS THE NAME AND THE CHIP IS DELETED (v63, section D). The chip
                  restated the status the band above it now says in full, at the moment the band
                  arrived — two answers to one question, three inches apart. The agency moves up
                  beside the name in Playfair italic, which is what frees line two to be the FACT
                  alone rather than `agency · fact`. */}
              {agency && <span className="tl-fag">{agency}</span>}
            </span>
            {/* ⚠️ LINE TWO IS AGENCY · FACT (v61, Section B). It was PREFIX · fact, where the
                prefix is the status word or "Out since 19 Jul" — so the line repeated the status
                the chip beside it already states, or led with a date that is not the fact. The
                agency is the one thing about this row that appears nowhere else on the card, and
                the fact is what changes. Where a row has no agency the prefix stands in rather
                than the line opening with a bare middot. */}
            {/* ⚠️ LINE TWO IS THE FACT, ALONE. The agency moved to line one with the name, so the
                `agcy` and `sepd` spans the ref hides under `data-bar="qc"` have nothing left to
                hide — they are DELETED rather than rendered and hidden, which is what stops a
                third pass finding two agencies on one card and wondering which is live. */}
            {/* ══ LINE TWO — A FACT AND A TAIL, ALWAYS BOTH (v63, §D formatting) ═══════════════
                ⚠️ TWO SPANS, AND THEY COME FROM `barFactLine` RATHER THAN FROM SPLITTING THE
                LABEL. The fact is sentence case in the card's own ink; the tail is mono caps, a
                shade back — the register a measured span belongs in. Splitting the joined label on
                a middot would make the typography depend on a punctuation mark inside a string.

                ⚠️ AND NO DEED WORDS. `nudge due`, `send by 29 Sept` and `next 8 Sept` used to reach
                this line as the label's PREFIX, because the render fell back to it wherever there
                was no second clause. A deed is what the action column says. */}
            <span className="tl-ffx">
              {/* the ringed `!` — QC's own urgent mark, on the fact rather than beside the name */}
              {(sg.owed || sg.state === "quiet") && <span className="tl-bang" aria-hidden>!</span>}
              {sg.fact}
              {/* ⚠️ INSIDE THE FACT, NOT BESIDE IT — which is where the ref puts it, and the only
                  place `display: inline` survives. As a SIBLING inside the flex column `.tl-gstack`
                  it was a flex item, and a flex item is BLOCKIFIED: `display: inline` computed to
                  `block` and the eyebrow stayed on a third line while the rule read correctly. */}
              <span className="tl-feb">{sg.tail}</span>
            </span>
            {/* ⚠️ NO MONO EYEBROW, AND TWO SEPARATE REASONS — both recorded because each alone
                would look like an omission.

                The first: the ref's `.feb` is not an eyebrow at all. Its own card builder puts it
                INSIDE `.ffx` holding the relative clause — `Due 15 Apr <span class="feb">29 months
                overdue</span>` — and `body[data-seg="band"]` makes it `display: inline; margin: 0`,
                overriding the `display: block` under `data-bar="qc"` that I read first. It is a
                mono tail on line two, not a third line.

                The second: our `latenessLine` emits ONE locked sentence with one vocabulary, so
                splitting it on a middot to restyle half would make the typography depend on a
                punctuation mark inside a string — silently wrong the first time the wording moves.
                Line two therefore stays one sentence in Inter. If the two-register line is wanted,
                the fix is for `latenessLine` to return its parts, which is a change to a locked
                derivation and belongs in its own pass.

                And the pill's words needed no home: the ACTION COLUMN beside the card already says
                "Send the full" in Caveat with the same dates under it. */}
          </span>
        </div>
      </div>
      {/* the full record, on hover — the ref's `.tip` */}
      <span className="tl-tip"><span className="tl-tipdt">{record}</span></span>
      {/* ⚠️ THE GHOST IS A CHILD OF THE CARD, AND THAT IS THE WHOLE PLACEMENT RULE. As a sibling it
          carried its own copy of `--l + --w`, which is the card's RESTING width — so the moment a
          clipped card opened (`width: var(--exp)`) it grew straight through the ring, measured at
          294.5px of overlap. A child at `left: calc(100% + gap)` follows whatever the card is
          actually painted at, open or shut, because there is no second copy of the arithmetic to
          fall out of step. Structural, not maintained. */}
      {/* ⚠️ THE TERMINAL MARK SITS ON THE CARD'S END EDGE, so it is a CHILD of the card — the ref's
          own `right: -4px`. As a sibling it would carry a second copy of the card's geometry and
          come apart from it the moment a clipped card opens, which is exactly what happened to the
          ring this replaces. */}
      {sg.capSource && (
        <span aria-hidden
          className={`tl-tmark ${sg.capMine ? "you" : "est"}`}
          data-tmark={sg.capSource}
          data-caprel={`${sg.rowKey}::${sg.lane}`} />
      )}
      {/* ══ NO DISSOLVE, NO SHADOW — BOTH RETIRED (v60 Law 2, closed by §D) ═══════════════
          ⚠️ THE MASK WENT FIRST because a mask clips a `box-shadow` along with the paint, and it
          deleted the whole lift the moment the frame gained a second layer. Then the shadow went
          (§D: a lift under a tinted band is two treatments arguing). Then the gradient overlay went
          (§D correction 1: it dimmed the card's own band, dot and words to state a fact about the
          window). Nothing is painted over a card now; a cut edge is the board's clip and the
          frame's own dropped border.

          ⚠️ AND THIS PASS ONCE WROTE THE CSS FOR TWO ELEMENTS AND RENDERED NEITHER: the rules
          matched nothing, faded cards were flat and unfaded at once, and only the surface lock said
          so. A class the sheet selects on and the component never emits is a rule with no subject. */}
      {/* ⚠️ NO TRAIL (v63, section D). The selected design is `data-trail="off"`, which the ref
          states as `.ctrack, .ctrail { display: none }` — so the gauge along the card's foot is a
          REJECTED alternative, not a suppressed feature. It measured elapsed time against the
          card's own span; the card's LENGTH already says that, and the band above it now says
          whose move it is, so the bar was stating the same thing three ways. Retired with its
          arithmetic rather than hidden — `F`, the track clamp and the end-gap all go, because a
          derivation kept alive for a rule that draws nothing is exactly what a later reader
          resurrects by accident. */}
      {/* ⚠️ NO SHADOW (v63, section D). `body[data-bar="qc"] .shd { display: none }` — the QC card
          is a flat object on a flat ground, and a lift under a bar that already carries a tinted
          band reads as two treatments arguing. The rule goes with the element rather than being
          left as a `display: none` nobody can trace. */}
      {/* ⚠️ NO CHEVRON TAIL (v63, section D). The selected design is `data-end="open"`, not
          `data-end="tail"` — and the ref states `body:not([data-end="tail"]) .tailsvg { display:
          none !important }`, so the shape it draws is a REJECTED alternative. An open end is the
          frame's own right border removed and its corners squared, which `.tl-p.fadeR .tl-frame`
          already does; the arrow was a second statement of the same fact, in ink. */}
      {/* ⚠️ THE NUDGE MARKER SITS AT THE DATE IT HAPPENED, ON THE BAR (v63, §D — the ref's `.evn`).
          A band note says a nudge HAPPENED; the marker says WHEN, against the same axis every
          other date on this board is read on. Both, because the band is scanned and the bar is
          measured, and neither answers the other's question.

          ⚠️ ITS POSITION IS A FRACTION OF THE CARD'S OWN SPAN, so it moves with the card when a
          clipped card opens on hover — the same reason the terminal mark is a CHILD rather than a
          sibling. A second copy of the card's geometry is what came apart last time. */}
      {sg.nudgedAt != null && sg.to > sg.from && (
        <span className="tl-evn" aria-hidden
          style={{ left: `${(((sg.nudgedAt - sg.from) / (sg.to - sg.from)) * 100).toFixed(3)}%` }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="8.5" />
          </svg>
        </span>
      )}
      {/* ⚠️ THE PULSE DOT SITS ON AN OPEN END AND ONLY WHERE SOMETHING IS LATE (v63, §D). The ref
          draws `.pulsedot` inside its open-end branch and shows it on `.card.alert`; ours reads the
          app's own urgency — `owed || quiet`, `calSectionOf`'s `isUrgent` — the same expression the
          band's rose holder and the ringed `!` already read. Three marks, one definition.

          ⚠️ AND IT IS ON THE OPEN END, NOT THE CLIPPED ONE. A clipped card's edge dissolves because
          the wait continues past the window; a dot there would mark the window rather than the
          work. The open end is where a wait with no named end is still running, which is what makes
          the lateness worth a mark. */}
      {/* ⚠️ AN OVERDUE TASK IS AN OPEN END TOO. Its bar runs to today and keeps running, which is
          the same statement a wait with no named end makes — so it takes the same pulse. The
          segment carries `openRight`, and reading THAT rather than the query-shaped `fade` is what
          lets one expression serve both kinds. */}
      {((fade.right && !fade.clipped) || (sg.isTask && sg.openRight))
        && (sg.owed || sg.state === "quiet") && (
        <span className="tl-pulsedot" aria-hidden />
      )}
{/* ⚠️ NO DISSOLVE ON EITHER EDGE (v63, §D correction 1). Both overlays are deleted: a
          gradient over a cut edge dimmed the card's OWN band, dot and words to make a statement
          about the window. The board's clip is what cuts a card; the frame drops its border and its
          radius on the cut side and nothing is painted over the top. */}
    </div>
  );
};

/**
 * ⚠️ FOUR MARKERS AND NO NOTCH. The notch marked "somebody named this date"; the fill now carries
 * that distinction on its own — a filling bar means a date exists, an empty one means nobody set
 * it — and the bar terminates on the date either way. Three statements of one fact, so the
 * drawing goes and its caption moves onto the bar's tooltip, where it survives the long ranges at
 * which labels drop out.
 */
const GLYPH_IN = (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
    <path d="M8 5 H2.6 M4.6 2.8 L2.4 5 L4.6 7.2" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </svg>
);
const GLYPH_OUT = (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
    <path d="M2 5 H7.4 M5.4 2.8 L7.6 5 L5.4 7.2" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </svg>
);
const GLYPH_CLOCK = (
  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
    <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6 3.6 V6 L7.8 7.2" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </svg>
);

export const Marker: React.FC<{ n: BarNode; selected: boolean; onPick: () => void }> = ({ n, selected, onPick }) => (
  <button
    type="button"
    className={`tl-at2 tl-mk2 ${n.mark}${selected ? " sel" : ""}`}
    style={{ left: pct(n.at), ...laneVar(n.lane) }}
    aria-label={n.caption}
    onClick={onPick}
  >
    {n.mark === "in" ? GLYPH_IN : n.mark === "outk" ? GLYPH_OUT : n.mark === "clock" ? GLYPH_CLOCK : "!"}
  </button>
);

/**
 * One drawn group on the board.
 *
 * ⚠️ `tone`, `label`, `purpose` AND `status` ARE FOUR FIELDS BECAUSE THE FOUR GROUPINGS DISAGREE
 * ABOUT WHICH OF THEM THEY CAN HONESTLY FILL. A section group has all four but the status; a
 * status group has only a status and a name; `No grouping` has a key and rows and nothing else.
 * Deriving any of them from another — a tone from a label, a mark from a tone — is what would let
 * a group state something about its rows that is not true of them.
 */
export type DrawnGroup = {
  key: string;
  /** the urgency class this group IS, or `null` where the grouping has no urgency claim to make */
  tone: CalSection | null;
  /** the divider's name; `""` draws no divider at all */
  label: string;
  purpose: string | null;
  status?: QueryStatus;
  rows: BoardRow[];
};

/**
 * ══ AN ACTION ON THE BOARD (v63, §E) ════════════════════════════════════════════════════════
 *
 * Two shapes, one component, because they answer the same question at two volumes.
 *
 * **Urgent** — a Caveat label in rose and an outlined button, both hidden at rest. The pulse dot is
 * the only thing an urgent row states until you hover it: a label and a button on every late row at
 * once is a dozen instructions on one screen, and the board's job is to say which one thing is next.
 *
 * **Everything else** — a 22px ring at the action's date, sand-on-nothing at rest, and the same
 * label and button slide out beside it when the row is hovered. The ring is a WAYPOINT: it says
 * something happens here without saying what until asked.
 *
 * ⚠️ THE SIDE-STRIP FLAG IS RETIRED ENTIRELY. It was a tile the width of a card standing in the
 * lane, so a board with a dozen live rows carried a dozen paragraphs down its right-hand side.
 *
 * ⚠️ AND NO ANIMATION ON A LABEL. The ring's own colours transition; the label and button appear.
 * A label that slides or fades on every pointer move is motion in the reader's peripheral vision
 * for something they have not asked about yet.
 */
type ActionGlyph = CapKind | "quiet";

/** the four glyphs, each drawn at an explicit size because a positioned SVG has no intrinsic one */
function ActionSym({ kind }: { kind: ActionGlyph }) {
  const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <span className="tl-actsym" aria-hidden>
      <svg viewBox="0 0 24 24" width="11" height="11" {...P}>
        {kind === "window" && (
          /* hourglass — waiting on the agent */
          <><path d="M7 3h10M7 21h10M8 3v3.5L12 11l4-4.5V3M8 21v-3.5L12 13l4 4.5V21" /></>
        )}
        {kind === "sendBy" && (
          /* flag — your own deadline, ahead */
          <><path d="M6 21V4M6 4h11l-2.5 4L17 12H6" /></>
        )}
        {kind === "reminder" && (
          /* bell — a reminder you set */
          <><path d="M18 15V10a6 6 0 1 0-12 0v5l-2 3h16zM10 21h4" /></>
        )}
        {kind === "quiet" && (
          /* a crossed ring — an offer to close a silence that has run out */
          <><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></>
        )}
      </svg>
    </span>
  );
}

export function ActionMark({ urgent, kind, label, deed, style, onPress, on, forSeg }: {
  urgent?: boolean; kind: ActionGlyph; label: string; deed: string;
  lane: number; style: React.CSSProperties;
  /* ⚠️ THE PRESS GOES THROUGH THE PAGE'S ONE DOOR (v65 §E ruling). What the deed DOES belongs to
     the desk it opens; this component decides nothing about it and performs no write. */
  onPress?: () => void;
  /** v65 §B — the reveal follows the BAR's hover, not the row's: the page pairs bar and action by
   *  segment key and hands the pairing down, because CSS cannot match one sibling's attribute to
   *  another's. `forSeg` is published for the locks, which assert the pairing from outside. */
  on?: boolean; forSeg?: string;
}) {
  return (
    <div className={`tl-act${urgent ? " tl-act--od" : ""}${on ? " on" : ""}`} style={style}
      data-act={kind} data-for={forSeg}>
      {/* ⚠️ THE RING IS THE NON-URGENT SHAPE'S WHOLE RESTING STATE. An urgent row shows nothing at
          rest but its pulse dot, so it draws no ring — the ref's `.nlab.od .sym { display: none }`. */}
      {!urgent && <ActionSym kind={kind} />}
      <span className="tl-actlab">{label}</span>
      {/* ⚠️ A BUTTON, NOT A TILE. It is the one thing on this row you can press, so it is an element
          the keyboard can reach and assistive tech can announce. */}
      <button type="button" className="tl-actbtn"
        onClick={(e) => { e.stopPropagation(); onPress?.(); }}>
        {deed}<span aria-hidden>&nbsp;›</span>
      </button>
    </div>
  );
}
