/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Calendar — a rolling WEEK TIMELINE (calendar timeline pack, Phase 3; structure from
 * design-refs/timeline-week-ref.html, grammar from design-refs/timeline-event-catalogue.html).
 *
 * ⚠️ ROWS ARE RELATIONSHIPS, COLUMNS ARE DAYS — and the reason is the data, not the drawing. A
 * query's silence is a SPAN, and a grid of day cells has nowhere to draw one; the month could
 * therefore never answer "how long has this been quiet", which is the question a querying writer
 * actually has. One row per agent, plus a permanent "Your tasks" row pinned above them.
 *
 * ⚠️ NOTHING BELOW THE VIEW CHANGED. `assembleBoardColumns`, `calendarDays`, `recordDays`,
 * `dedupeAgainstRecord`, `ghostsFor`, `pillLabel`, `draggableTask`, `useTaskPaneSession`,
 * `quickDone` and the toast-as-receipt are the same functions the month grid read. The rows are
 * derived on top of them by `todoTimeline`, which is pure and locked.
 *
 * ⚠️ WHAT WENT WITH THE MONTH, because every one of them answered to a day CELL: the fold and its
 * `+N MORE`, the density floor and `data-fold-short`, the hover peek, the day panel and its
 * collapse chevron, the month jump, the `Upcoming only` mode and the event-kind vocabulary that
 * served it. A row grows to hold what it holds — there is nothing left to overflow.
 */
import React, { useLayoutEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TasksPageLayout, TplGrow, TplZone } from "./TasksPageLayout";
import { useTodoToast } from "./useTodoToast";
import { FocusFlow } from "./FocusFlow";
import { TaskPane } from "./TaskPane";
import { useTaskPaneSession, type TaskPaneHost } from "./useTaskPaneSession";
import { useTaskCommit } from "./useTaskCommit";
import { TIMELINE_RANGES, DEFAULT_RANGE_INDEX, pastDaysOf } from "../../lib/timelineRanges";
import {
  GROUP_ORDER, GROUP_LABEL, COLLAPSED_BY_DEFAULT, groupSentence, TASKS_HEADING, TASKS_SENTENCE,
  asksOfYou,
  type RowGroup,
} from "../../lib/timelineGroups";
import { pillText } from "../../lib/calendarPill";
import { stageSentence, type StageEnd } from "../../lib/stageSentence";
import { QueryStatus } from "../../types";
import {
  calSectionOf, CAL_SECTION_DRAW, CAL_SECTION_LABEL, CAL_SECTION_PURPOSE, CAL_SECTION_VIEW,
} from "../../lib/calendarSections";
import {
  GROUP_BY_ORDER, GROUP_BY_LABEL, ACTION_ORDER, ACTION_LABEL, actionBucketOf,
  SORT_BY_ORDER, SORT_BY_LABEL, STATUS_LADDER, statusRank, matchesStatus, anythingApplied,
  type GroupBy, type SortBy, type ActionBucket,
} from "../../lib/calendarToolbar";
import type { CalSection, CalSectionFacts } from "../../lib/calendarSections";
/* ⚠️ THE QUERY CENTRE'S OWN TWO DERIVATIONS, IMPORTED RATHER THAN RESTATED (v63, section D).
   `stageFor` gives the tint ladder's rung and `turnWordFor` gives the holder's words; the cards on
   that page read the same two. A calendar-local mapping is how two surfaces come to disagree about
   whose court a query is in — which is a fault this board has already paid for. */
import { stageFor, turnWordFor } from "../../lib/queryCardFacts";
import { fadesFor, cardBounds } from "../../lib/calendarFade";
import {
  TAB_ORDER, TAB_LABEL, rowInTab, tabOf, type TimelineTab,
  GROUP_MODES, GROUP_MODE_LABEL, groupKeyOf, type GroupMode,
} from "../../lib/timelineViews";
import { useConfirmAsk } from "./ConfirmAsk";
/** this mount's pane section-id prefix — every workspace page stays mounted, so ids must not collide */
const CAL_PANE_PREFIX = "cal-";
import { useScriptAllyDb } from "../../lib/db";
import { localYMD } from "../../lib/shellSidebar";
import { TODO_OPEN_COMPOSER } from "../../lib/todoRoutes";
import { assembleBoardColumns } from "../../lib/todoColumns";
import { BoardCard } from "../../lib/todoBoard";
import {
  calendarDays, recordDays, dedupeAgainstRecord, ghostsFor,
  shortCalDate, carriedLine, expectedLine, REC_TONE,
  CalendarItem, RecordItem, GhostItem,
} from "../../lib/todoCalendar";
import {
  windowDays, shiftWindow, timelineWeek, defaultView,
  FILTER_LABEL,
  YOU_ROW,
  type TimelineItem, type TimelineRow, type TimelineView,
  type RowSort, type TimelineFilter,
} from "../../lib/todoTimeline";
import {
  durationCount, barLines, familyOf, holderOf, sideOf,
  type Segment, type BarNode,
} from "../../lib/journeyBars";
import { classifyWriteError, saveErrorCopy } from "../../lib/todoWrite";
import { useDockActivity } from "./useDockActivity";
/* ⚠️ THE QUERY CENTRE'S OWN ROWS, NOT A SECOND READING PANE. `FocusFlow` already mounts these two
   from the To-do world (`FocusFlow.tsx:33`), so the precedent and the shape are both established;
   building a calendar-local conversation would be the second implementation this repo forbids. */
import { TimelineRows, buildTimelineRows } from "../reading-pane/QueryTimeline";
import { StatusDot } from "../StatusDot";
import { formatQueryMaterial } from "../../lib/materials";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import "./tasksLayout.css";
import "./taskChrome.css";
import "./todoCalendar.css";

/**
 * The badge's drawn size — the ref's `--badge`, restated in the page because `StatusDot` takes a
 * number rather than reading CSS.
 *
 * ⚠️ TWO STATEMENTS OF ONE VALUE, AND THE LOCK IS WHAT KEEPS THEM TOGETHER. The CSS token
 * positions the badge and insets the words; this number draws it. They cannot be one declaration
 * — the component's prop is a `number` — so `calSurface60.measure.ts` asserts the rendered SVG's
 * box against the token's computed value rather than against either literal. That is the shape
 * this repo already uses for `READING_PANE_FLOOR_PX` ≡ `--ag-pane-floor`.
 */
/** ⚠️ THE BAND'S DOT — the pack's 20px, NOT the ref's 14px `.sseg svg`. The ref sizes a flat glyph
    of its own making; this app's `StatusDot` carries direction and stage in its SHAPE, and 14px
    loses it. A glyph's legible size is part of the glyph, which is the app's half of the split. */
const STAGE_BAND_DOT_PX = 20;
const CARD_BADGE_PX = 20;
/**
 * A past stage's badge — the ref's `.jc .jmed`, at 54 against the live card's 58.
 *
 * ⚠️ SMALLER, AND THE OPACITY IS THE SHEET'S. A past stage is settled: the ref drains its
 * medallion to 0.22 rather than shrinking it away, so the glyph still says which status the stage
 * WAS while reading as history. Size here, opacity there — the sheet owns anything a theme might
 * want to retune.
 */
const STAGE_BADGE_PX = 16;
/** the shortest stage that can hold a card — see the gate at its use site for the arithmetic */
/**
 * ⚠️ THE REF'S TWO GATES, IN DAYS. It states them as lane fractions — skip under 3.5%, drop the
 * badge under 8% — and the standing rule is that a stage gate is a day count, never a lane
 * fraction. The window is fixed at 90 days, so the two are the same number in different units and
 * converting costs nothing: 3.5% is 3.15 days and 8% is 7.2. Rounded up to whole days, because a
 * stage is measured in days and half of one is not a boundary anybody set.
 */
const STAGE_MIN_DAYS = 4;
const STAGE_NARROW_DAYS = 8;


export interface TodoCalendarPageProps {
  onNavigate: (tab: string, sub?: string) => void;
  onNavigatePath?: (path: string) => void;
}

/** Seven days. The window is rolling, so there is no month to be a subset of. */
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * ⚠️ POSITION IS A PERCENTAGE OF THE SEVEN COLUMNS, NEVER A PIXEL. The lane spans the day columns
 * of a grid whose tracks are `minmax(0, 1fr)`, so a percentage inside it lands on the same
 * boundaries the cells do at every width — which is what makes "seven columns fill, no horizontal
 * scroll" survive a resize with nothing to recompute.
 */
/**
 * ⚠️ A POSITION IS A FRACTION OF THE WINDOW, AND THE WINDOW'S LENGTH IS THE BOARD'S FACT.
 *
 * `pct` was `n / TL_DAYS` against a module constant of 7, so every position on the board was
 * computed against a number that could only ever be one range. It is now `calc()` against
 * `--tl-days`, declared once on `.tl` and inherited by everything inside it: the page supplies
 * only the day INDEX — data — exactly as it supplies the spine's fraction, and the geometry is the
 * stylesheet's. That is the pack's standing rule, and it is also what makes the range cost no
 * second derivation: change one custom property and every bar, marker and chip reprices itself.
 *
 * The columns change what a reader SEES. They are not what anything is positioned by.
 */
/**
 * How many calendar months a window must touch before the rail draws its month shelf.
 *
 * ⚠️ A NUMBER WITH A NAME, because the alternative is a bare `>= 3` in the JSX that reads as an
 * accident. Two months is not a shelf: it is one divider, and one divider on a long rule is a mark
 * rather than a boundary.
 */
const MONTH_SHELF_FROM = 3;

/**
 * How far in from a card's left edge its contents begin.
 *
 * ⚠️ IT IS HERE AND IN THE SHEET, AND THE FIT PASS IS WHY. The stylesheet places the text; the fit
 * pass has to subtract the same distance to know what room the text actually has, and a pass
 * measuring against the whole bar would let a line run past the right-hand end by exactly this.
 * The lock asserts the two agree, because two numbers that must match and live apart is the shape
 * this pack keeps finding.
 */
const TEXT_INSET = 14;

/**
 * ⚠️ `cqw`, NOT `%` — AND THE UNIT IS THE WHOLE POINT.
 *
 * A percentage means "of my parent", so this expression meant "of the lane" only for a DIRECT
 * child of the lane. The ticks, the chips and the bars are direct children and were right; the
 * FILL is a grandchild, so the identical arithmetic inside a bar silently measured the bar. That
 * is how the board came to have two date→x mappings while every rule read correctly.
 *
 * `.tl-c-tl` is a size container (see the stylesheet), so `100cqw` is the lane's width at any
 * depth. One expression, one width, for the rail's ticks and the bars and the fills alike.
 */
/** the card's pinned left, matching `--tl-text-inset` in the stylesheet */
/**
 * ⚠️ THE ROW HEAD'S DOT, AND IT IS THE SAME BOX FOR BOTH KINDS. `StatusDot` draws a real journey;
 * the pinned row holds no query, so it keeps a square rather than a dot invented for it. Both take
 * this size, because if they did not the names beside them would start at two different x's and
 * the column would read as two columns.
 */
const ROW_DOT = 18;

const PILL_INSET = 13;

/** the flex gap between the pill and the line it sits beside, matching `.tl-p`'s own */

/** the mark's own width, matching `--mk` in the stylesheet */
const MARK_W = 22;

/** the right margin `.tl-p > *` pays, which the content needs as surely as it needs its own width */
const CONTENT_MARGIN_R = 12;

/**
 * ⚠️ THE WINDOW STEPS BY A WEEK (v58). The ref moves its own `SH` by seven days a click, so the
 * board slides rather than jumping — a whole-window step leaves no overlap for the eye to carry
 * across, which is what the ‹ WEEK / WEEK › labels promise and a page-jump does not deliver.
 */
const WEEK_STEP = 7;

const pct = (n: number) => `calc(${n} / var(--tl-days) * 100cqw)`;

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
const barLeft = (sg: Segment) => pct(sg.from);
/* the tint is positioned inside the frame, whose origin is the card's own left edge */
const barLeftPad = (_sg: Segment) => "0px";
const barWidth = (sg: Segment) => pct(sg.to - sg.from);
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
const laneVar = (lane: number): React.CSSProperties =>
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
const Piece: React.FC<{
  sg: Segment; days: number; lastMarkAt: number | null; selected: boolean;
  /* v58: the identity travels with the card, so the row hands its name down */
  name: string;
  stirIndex: number; onPick: () => void; onOpen?: () => void; agency?: string;
}> = ({ sg, days, lastMarkAt, selected, stirIndex, onPick, onOpen, name, agency }) => {
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
  return (
    <div
      /* ⚠️ THE CLASS LIST IS WRITTEN IN THE JSX, not built into a `const` above it. The style-reach
         sweep reads `className=` expressions out of this file, so a list assembled into a variable
         is invisible to it — and its report would be "this class has no rule", about a class it
         never saw. An absence that reads as a finding. */
      className={`tl-at2 tl-p ${familyOf(sg.state)}${sg.hollow ? " hollow" : ""}${sg.owed ? " owed" : ""}`
        /* ⚠️ THE FADES ARE THE SEGMENT'S OWN FACTS. `openLeft` means the stretch began before the
           window and `openRight` that it runs past it — both already derived, both already the
           reason the old renderer squared its ends. */
        /* ⚠️ THE PREDICATES ARE THE ONLY SOURCE — see `calendarFade`. This read `openLeft` and
           `openRight || live`, which is nearly the same and nearly is the problem: `openRight` is a
           compound that also asks whether the journey is terminal, whether it closes, whether it is
           open-ended and whether a reply window was given, so a card's edge dissolved because of a
           decision about reply windows. */
        + `${fade.left ? " fadeL" : ""}${fade.right ? " fadeR" : ""}`
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
      /* ⚠️ THE STAGGER INDEX IS DATA, NOT A `var()` INSIDE THE KEYFRAMES. A custom property read
         from a keyframe block fails silently here; read from the RULE it resolves normally, which
         is why the delay is a `calc()` on the animation and the frames carry only literals. */
      style={{ ...laneVar(sg.lane),
        ["--stir-i" as string]: String(stirIndex),
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
      data-tip={sg.tip || undefined}
      onClick={onPick}
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
          ⚠️ IT IS QUERY CENTRE'S LANGUAGE, READ FROM QUERY CENTRE'S OWN FUNCTIONS. `stageFor` gives
          the tint ladder's rung and `turnWordFor` gives the holder's words — the same two the cards
          on that page draw from. A second mapping here is how two surfaces come to disagree about
          whose court a query is in, which is the fault this board has already paid for twice.

          ⚠️ AND THE TINT COMES FROM THE CALENDAR'S OWN COPY OF THE LADDER, not from a `var()` on
          `--stage-*`: those are declared on `.t-f12`, which is not an ancestor here, so a direct
          read paints nothing at all through a clean build. See the note at the tokens.

          ⚠️ THE BAND REPLACES THE FREE-STANDING BADGE. v61's disc burst past the card's left edge
          and every ancestor was held `overflow: visible` for it; the mark is inside the band now,
          so that overhang, its reserved padding and the whole escape route go with it. */}
      <span className={`tl-sband tl-st-${stageFor(sg.status)}`}>
        {/* ⚠️ THE APP'S OWN `StatusDot`, AT 20px — the pack's value, and a deliberate departure
            from the ref's 14px `.sseg svg`. The ref sizes a flat glyph of its own making; this
            app's dot carries DIRECTION AND STAGE in its shape, and 14px loses that. A glyph's
            legible size is part of the glyph, which is the app's half of the authority split. */}
        <StatusDot status={sg.status} overrideSize={STAGE_BAND_DOT_PX} />
        <span className="tl-sw">{sg.status}</span>
        {/* the holder, at the band's right end — `turnWordFor`, never a second reading */}
        <span className="tl-sh">{turnWordFor(sg.status)}</span>
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
            <span className="tl-ffx">
              {/* ⚠️ THE RINGED `!` FOLLOWS THE APP'S OWN DEFINITION OF LATE, WHICH IS `owed` OR
                  `quiet` — `calSectionOf`'s `isUrgent`, the same expression that files a row under
                  Urgent and the same one the holder's rose ink reads. It was gated on `owed` alone
                  for one build: the holder went rose on a gone-quiet card and the ring beside it
                  did not, so one card carried two definitions of late three inches apart. Found by
                  widening the LOCK to the app's definition, not by reading the render. */}
              {(sg.owed || sg.state === "quiet") && <span className="tl-bang" aria-hidden>!</span>}
              {lines.t2 || lines.t1}
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
      {/* ══ THE DISSOLVE (v60, Law 2 — the shadow half is retired with §D) ═══════════════
          ⚠️ THE MASK WENT BECAUSE A MASK CLIPS A `box-shadow` ALONG WITH THE PAINT — costless while
          the frame had one faint contact shadow, and it deleted the whole lift the moment the frame
          gained a second layer. There is no shadow at all now, so `.tl-fov` is the whole mechanism:
          the gradient that dissolves a clipped card into the section's surface.

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
      {fade.left && <span className="tl-fov l" aria-hidden />}
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

const Marker: React.FC<{ n: BarNode; selected: boolean; onPick: () => void }> = ({ n, selected, onPick }) => (
  <button
    type="button"
    className={`tl-at2 tl-mk2 ${n.mark}${selected ? " sel" : ""}`}
    style={{ left: pct(n.at), ...laneVar(n.lane) }}
    data-tip={n.caption}
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
type DrawnGroup = {
  key: string;
  /** the urgency class this group IS, or `null` where the grouping has no urgency claim to make */
  tone: CalSection | null;
  /** the divider's name; `""` draws no divider at all */
  label: string;
  purpose: string | null;
  status?: QueryStatus;
  rows: TimelineRow[];
};

/**
 * ══ ONE TOOLBAR CONTROL (v63, section C) ═══════════════════════════════════════════════════
 *
 * A trigger that names its own value, and a panel beneath it. The three controls differ only in
 * what goes IN the panel — a radio list, a radio list with a checkbox and a reset, a checkbox
 * list with a clear — so the shell is one component and the body is `children`. Configuring one
 * generic list component to express all three would need three flags and a slot, which is a
 * config soup that reads worse than the three bodies it replaces.
 *
 * ⚠️ IT REPLACES `Menu`, `Popover` AND `PopRow`, WHICH ARE DELETED IN THE SAME EDIT. All three
 * had ZERO render sites — a dropdown cluster left standing after the controls that used it were
 * retired. A replacement that is ADDED leaves the original reachable, and this repo has paid for
 * that three times in one build; shipping a fourth dropdown beside three dead ones is the same
 * fault with a bigger denominator.
 *
 * ⚠️ THE DISMISSAL IDIOM IS THE HOUSE ONE, and Escape is consumed on the CAPTURE phase with
 * `stopImmediatePropagation`: this panel sits inside a page that owns its own Escape, so a press
 * that dismissed the panel AND reached past it would close the board behind the thing the reader
 * was actually dismissing.
 */
function TbMenu({ open, onOpen, trigger, label, children }: {
  open: boolean;
  /** `true` to open this one, `false` to close it — the page holds which, so only one is ever open */
  onOpen: (v: boolean) => void;
  trigger: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  const wrap = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onOpen(false);
    };
    /* ⚠️ THE TRIGGER COUNTS AS INSIDE. Without it the pointerdown closes the panel and the click
       that follows reopens it, so the control reads as inert on every second press. */
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) onOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, onOpen]);
  return (
    /* ⚠️ NO `--open` MODIFIER. The panel is rendered conditionally rather than shown by a class, and
       the trigger's own open treatment hangs off `aria-expanded`, which is on the element anyway
       and cannot fall out of step with the state the way a second class can. A modifier emitted
       with no rule behind it is invisible chrome the stylesheet does not know exists — the reach
       sweep is what caught it, which is the whole reason that sweep runs. */
    <span className="tl-tb" ref={wrap}>
      <button type="button" className="tl-tbtrig" aria-expanded={open} aria-label={label}
        onClick={() => onOpen(!open)}>
        {trigger}
        <span className="tl-tbchev" aria-hidden>▾</span>
      </button>
      {open && <div className="tl-dd" role="group" aria-label={label}>{children}</div>}
    </span>
  );
}

/** one option in a toolbar panel — a name, and a tick or a box that says whether it is on */
function TbOpt({ on, mark, onClick, children }: {
  on: boolean; mark: "tick" | "box"; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" className="tl-ddopt" data-on={on || undefined}
      role={mark === "box" ? "checkbox" : "radio"} aria-checked={on} onClick={onClick}>
      {mark === "box" && <span className="tl-ddbox" aria-hidden />}
      {/* ⚠️ THE LABEL IS ITS OWN NAMED SPAN. The tick is always laid out (only its opacity moves,
          so labels do not shift as the selection does), which means the button's `textContent`
          reads `Urgency✓` — a probe taking the button's text is reading the mark as part of the
          name. Naming the span is what lets a lock assert the option list exactly. */}
      <span className="tl-ddname">{children}</span>
      {mark === "tick" && <span className="tl-ddck" aria-hidden>✓</span>}
    </button>
  );
}

export const TodoCalendarPage: React.FC<TodoCalendarPageProps> = ({ onNavigate, onNavigatePath = () => {} }) => {
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser,
    updateUserTask,
  } = useScriptAllyDb();
  const now = Date.now();
  const today = localYMD(now);
  const { toast, flash, dismiss, pause, resume, remember } = useTodoToast();
  /* the duplicate-send guard is part of the WRITE path, not decoration — declining writes nothing */
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();

  /* ⚠️ THE WINDOW IS ROLLING AND SESSION-LOCAL. It starts at today rather than at a month's first
     Monday, so there is no anchor to keep in step with a title and no other-month days to dim. */
  const [winStart, setWinStart] = useState(today);
  const [view, setView] = useState<TimelineView>(defaultView);
  /* ⚠️ SELECTING IS FREE — nothing is written, nothing opens. It rings the chip and fills the band
     below, and that is the whole of it. */
  const [sel, setSel] = useState<string | null>(null);
  /**
   * ⚠️ ACTING IS A DIFFERENT GESTURE FROM SELECTING, and the workspace is a STATE OF THE PAGE
   * rather than a thing that floats over it. The board collapses to one day's column, every agent
   * still listed and every row but this one dimmed, and the rest of the page becomes the work.
   *
   * ⚠️ THE DAY FOLLOWS THE ITEM RATHER THAN PINNING TO TODAY (one of Nick's open questions;
   * `follows` is the stated default). Opening a Friday task and being shown Wednesday would be the
   * page answering a question the writer did not ask.
   */
  const [work, setWork] = useState<{ rowKey: string; ymd: string; itemKey: string | null } | null>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);


  const assembled = useMemo(
    () => assembleBoardColumns({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now,
      mutedTaskRules: currentUser?.mutedTaskRules,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser?.mutedTaskRules],
  );

  /**
   * ⚠️ THE RANGE IS THE STOP, NOT A DAY COUNT SOMEONE DERIVED. `TIMELINE_RANGES` carries the days,
   * the column grain and the density tier together, so the columns, the `dense` class and the
   * readout all read one row of one table and cannot drift apart.
   */
  const [rangeIdx, setRangeIdx] = useState(DEFAULT_RANGE_INDEX);
  /**
   * ⚠️ WHICH GROUPS ARE OPEN, AND SNOOZED IS THE ONLY ONE THAT IS NOT. A snoozed row vanishes from
   * the board entirely today; a collapsed group with its count on the header is honest about what
   * is being held back, which disappearance never is. State is session-only and deliberately not
   * persisted — a group that stays shut across visits is a group a writer forgets they closed.
   */
  const [shut, setShut] = useState<readonly RowGroup[]>(COLLAPSED_BY_DEFAULT);
  const range = TIMELINE_RANGES[Math.min(Math.max(rangeIdx, 0), TIMELINE_RANGES.length - 1)];
  /**
   * ⚠️ `winStart` IS THE ANCHOR DAY, AND THE WINDOW OPENS BEFORE IT (grouped pack, Phase 6).
   *
   * Every range now shows a slice of the past — roughly a fifth at the short ranges and a quarter
   * at three and six months. Keeping the ANCHOR as the state rather than the window's first day is
   * what makes that free: the pager moves the anchor, `Today` resets it to today, and changing the
   * range recomputes the slice without any of them knowing the slice exists. Storing the first day
   * instead would have put the same arithmetic in the pager, the Today button and the range
   * handler, three places to keep in step.
   *
   * ⚠️ AND IT IS WHAT MAKES THE LONG RANGES WORTH HAVING. Markers are RECORDS, which are in the
   * past; a forward-only six-month board is 182 days of forecast with nothing that happened on it.
   * Measured before this: 16 rows, 18 bar segments, one waypoint and ZERO markers at rest.
   */
  /**
   * ⚠️ THE FIT PASS: LONG, THEN SHORT, THEN BARE — measured, never estimated.
   *
   * A bar's width is DATA: the same stretch is a third of the board at one week and four pixels at
   * six months. So the label cannot be chosen at derivation time, and a character-count guess
   * would be wrong the moment a font loads differently or a date is two digits instead of one.
   * The browser is asked instead, exactly as the ref does it: set the long form, compare
   * `scrollWidth` against the bar's `clientWidth`, fall back to the short form, then hide.
   *
   * ⚠️ AN ELLIPSIS IS NOT AN OPTION, which is why the last step is bare rather than truncated. An
   * ellipsis is a promise that the rest is somewhere; on a bar it is not, and the row head's
   * sentence is where the writer actually reads what is happening.
   *
   * ⚠️ IT MUTATES `textContent` OUTSIDE REACT, and that is safe here BECAUSE React rewrites the
   * label from `sg.label` on every render and this effect runs after every one of them. The two
   * cannot drift: React always sets the long form, and this always re-decides.
   */
  /* ⚠️ THE MARKS BELONGING TO ONE CARD, READ OFF THE PAGE. The render knows which marks ride on
     which card and hands the LAST one's date to `Piece`; the fit pass needs their PIXELS, which
     only the browser has. Same set, two questions — the row is the lane, and a mark is on this
     card when its centre lies within the card's box, which is exactly what the lock asserts. */
  const markLefts = (seg: HTMLElement): number[] => {
    const lane = seg.parentElement;
    if (!lane) return [];
    const cb = seg.getBoundingClientRect();
    return Array.from(lane.querySelectorAll<HTMLElement>(".tl-mk2"))
      .map((m) => m.getBoundingClientRect())
      .filter((r) => r.top + r.height / 2 > cb.top - 4 && r.top + r.height / 2 < cb.bottom + 4
        && r.left + r.width / 2 > cb.left - 1 && r.left + r.width / 2 < cb.right + 1)
      .map((r) => r.left);
  };

  useLayoutEffect(() => {
    const fit = () => {
      const root = pageRef.current;
      if (!root) return;
      for (const seg of Array.from(root.querySelectorAll<HTMLElement>(".tl-p"))) {
        /**
         * ⚠️ A PIECE WITH NO ROOM TO DRAW IS NOT DRAWN, and `border-box` is why this is needed.
         *
         * A bar stands 12px off each marker it abuts. Where the stretch between two markers is
         * only a day or so, those two standoffs consume the whole span — and a width calc that
         * resolves NEGATIVE is not clamped to nothing: with `box-sizing: border-box` the used
         * width is clamped UP to the borders, so the piece paints a 2px sliver. Measured
         * box-to-box, that sliver overlapped its own marker by exactly 2px on four rows, which is
         * the whole of the residual clearance fault after the drawn markers became breaks.
         *
         * A sliver says nothing that its run's neighbouring pieces do not, and it cannot be drawn
         * without overlapping the marker it abuts — so it is hidden rather than shrunk. The same
         * judgement as a label going bare: where there is no room, the honest thing is absence.
         */
        /* ⚠️ RESET BEFORE MEASURING, or the hide LATCHES: a `display: none` element reports
           `clientWidth` 0 for ever, so a piece hidden once at six months would stay hidden when
           the reader came back to one month. The same shape as the label's own reset above.
           ⚠️ AND IT IS `display`, NOT `visibility` — a hidden element still HAS a box, so the
           sliver would go on overlapping its marker where it counts, in the geometry. */
        seg.style.display = "";
        if (seg.clientWidth <= 0) { seg.style.display = "none"; continue; }
        const line = seg.querySelector<HTMLElement>(".tl-line");
        const track = seg.querySelector<HTMLElement>(".tl-track");
        const pillEl = seg.querySelector<HTMLElement>(".tl-pill");

        /**
         * ⚠️ THE LADDER IS MEASURED AGAINST THE ROOM AFTER THE MARKS, NOT AGAINST THE CARD.
         *
         * v40's cards are wide — a relationship spans months, not the stretch between two status
         * changes — so card width stopped predicting whether the words fit. What decides it is the
         * room LEFT: a 400px card whose last mark sits at 380 has twenty pixels for its sentence.
         * Measured on the first one-card render, before this existed: one card drew nothing at all
         * and its neighbour's text ran off its own right edge, both of them comfortably over 300px
         * wide. Reading `clientWidth` would have called both of them roomy.
         *
         * Four rungs, and each is the previous one less the part that can be spared: full (pill ·
         * headline · detail) → headline (the detail goes) → pill (the words go, and whose move it
         * is survives, because that is the one thing a card is for) → stub.
         */
        /**
         * ⚠️ RESET EVERY OUTPUT OF THIS PASS BEFORE READING ANYTHING — the tier included.
         *
         * `data-tier` selects which rule places the content, so measuring with last pass's tier
         * still on asks the browser where the pill sits under a decision that has not been made
         * yet. Measured on the six-month board before this: pills clipped at the card's right
         * edge, because the tier was chosen against the after-marks offset and the pill was then
         * placed at the pinned one — two offsets, one comparison, and the comparison used the
         * wrong one. Cleared, the card is in its `full` layout, which is the state every rung is
         * a reduction OF.
         */
        /**
         * ⚠️ CLIP AND OPEN, NOT DROP (v54, Phase 4) — and this replaces the four-rung ladder.
         *
         * v40 answered "the words do not fit" by removing some: the detail went, then the words,
         * then the card became a disc. That is a decision made FOR the reader, and it is made on
         * every card whose dates happen to be close together — on the six-month board sixteen of
         * twenty-three cards had lost their sentence. v54 keeps the words and clips them with a
         * soft edge; the card opens on hover to exactly what they need.
         *
         * The detail drops in ONE case only: where even the opened card would be wider than the
         * lane, so there is nowhere for it to open TO. The headline and the pill never drop —
         * whose move it is and what this is are the two things a card exists to say.
         */
        seg.style.removeProperty("--exp");
        seg.style.removeProperty("--hx");
        seg.removeAttribute("data-tight");
        seg.removeAttribute("data-nodetail");
        delete seg.dataset.tier;
        if (!line || !track || !pillEl) continue;

        const lane = seg.parentElement?.getBoundingClientRect();
        const cb = seg.getBoundingClientRect();
        const inset = parseFloat(getComputedStyle(seg).getPropertyValue(
          seg.classList.contains("fadeL") ? "--card-fade-inset" : "--tl-text-inset")) || 0;
        const detail = track.querySelector<HTMLElement>(".tl-cdt");

        /* what the content needs: the inset, the WIDER of the pill and the track, and the air the
           content pays on its right — plus the fade's own width where the card's right edge is
           dissolving, or the last word opens straight into the dissolve */
        /* ⚠️ THE WIDER OF THE TWO, NEVER THEIR SUM — the pill sits ABOVE the headline now, so they
           do not share a line and their widths do not add. The sum is what v54 needed when the two
           sat side by side, and carrying it into a column layout overstated every card by roughly
           a pill: measured, a tight card opened 142px past its own words, and cards whose words
           fitted were being clipped and having their detail dropped to make room for space nothing
           occupies. The ref computes exactly this — `Math.max(pill.scrollWidth, line.scrollWidth)`.
           If the pill and the headline are ever put back on one line, this goes back to a sum. */
        const fadePad = seg.classList.contains("fadeR")
          ? parseFloat(getComputedStyle(seg).getPropertyValue("--card-fade")) || 0 : 0;
        const needed = () => inset
          + Math.max(pillEl.getBoundingClientRect().width, track.scrollWidth)
          + CONTENT_MARGIN_R + fadePad;

        const laneW = lane ? lane.width : Infinity;
        let want = needed();

        /* ⚠️ THE DETAIL DROPS ONLY WHERE THERE IS NOWHERE TO OPEN TO. Measured against the LANE,
           not against the card: a narrow card with a wide lane beside it can open. */
        /* ⚠️ THE PRE-DROP NEED IS PUBLISHED TOO, because that is the number the decision was
           made on. After the detail goes the track is narrower, so a lock reading only the final
           `data-need` sees a card that "needed 271 in a 434px lane" and reports a justified drop
           as unjustified — 27 of them. The justification is the width WITH the detail. */
        seg.dataset.needfull = String(Math.ceil(want));
        if (want > laneW && detail) {
          seg.setAttribute("data-nodetail", "1");
          want = needed();
        }

        /* ⚠️ THE PASS PUBLISHES ITS OWN NUMBERS, so a lock reads what the decision was made from
           rather than recomputing it. A probe that re-derives `needed` is a second implementation
           of this arithmetic, and the two disagreeing is indistinguishable from the feature being
           broken — which cost a round here: the probe said a card needed 398px in a 250px lane
           while the pass had decided otherwise, and only publishing both settled which was wrong. */
        seg.dataset.need = String(Math.ceil(want));
        seg.dataset.lane = String(Math.round(laneW));
        seg.dataset.hasdetail = detail ? "1" : "0";

        if (want <= cb.width + 1) continue;   /* it fits — no clip, no open, no mask */

        seg.setAttribute("data-tight", "1");
        seg.style.setProperty("--exp", `${Math.ceil(want)}px`);
        /* ⚠️ RIGHTWARDS FROM ITS START, and left only by the minimum needed. The start date is what
           the card's position states, so it moves last and least. */
        const restLeft = cb.left - (lane ? lane.left : 0);
        const over = restLeft + want - laneW;
        seg.style.setProperty("--hx", over > 0 ? `${Math.max(0, restLeft - over)}px` : `${restLeft}px`);

        /* ⚠️ THE OVERFLOW BOOKKEEPING WENT WITH THE MARQUEE. `fits` and `data-over` existed to
           tell the hover animation how far to slide; the ladder never leaves a line overflowing,
           so both were describing a state the board can no longer be in. */
      }
    };
    fit();

    /**
     * ⚠️ THE MARQUEE IS RETIRED, AND THE LADDER IS WHAT RETIRED IT (v40, Phase 4/6).
     *
     * It existed to answer "what happens when the words do not fit" with `Measured, then marked —
     * the words are never removed`: the line was masked and the track slid on hover. The content
     * ladder answers the SAME question by dropping the detail, and two answers to one question is
     * how they come to disagree. The brief asked for the marquee to be narrowed to the `full`
     * rung; measured, that narrowing RETIRES it, because `full` is chosen precisely when the
     * content fits — pill, gap, track and the right margin against the room after the marks — so
     * `scrollWidth - clientWidth` cannot exceed zero there. Unreachable by construction, not by
     * fixture, which is why it goes rather than staying as a mechanism nothing can enter.
     *
     * `cycleFor` and `src/lib/calendarMarquee.ts` go with it. FLAGGED FOR NICK in the run report:
     * the brief said narrow, and narrowing turned out to mean retire.
     */
    const board = pageRef.current?.querySelector(".tl-board");
    const ro = new ResizeObserver(fit);
    if (board) ro.observe(board);
    /* ⚠️ THE HOVER LISTENERS WENT WITH THE MARQUEE; the observer is what is left, and it is
       conditional, so the teardown must run whether or not a board was found. */
    return () => { ro.disconnect(); };
  });

  const pastDays = useMemo(() => pastDaysOf(range), [range]);
  const winFrom = useMemo(
    () => (pastDays > 0 ? shiftWindow(winStart, pastDays, -1) : winStart),
    [winStart, pastDays],
  );
  const visible = useMemo(() => windowDays(winFrom, range.days), [winFrom, range.days]);
  /**
   * ⚠️ THE COLUMNS ARE WHAT IS DRAWN; `visible` IS WHAT IS TRUE. Every derivation below reads the
   * DAYS — a bar's span, a marker's date, the record — and nothing is positioned by a column. At
   * week and month grain the columns are a coarser ruler laid over the same window, stepping 7 and
   * 30 as the ref does, so a 182-day board draws six columns and still places a marker on its own
   * day.
   */
  const columns = useMemo(() => {
    const step = range.grain === "day" ? 1 : range.grain === "week" ? 7 : 30;
    const out: { ymd: string; from: number; now: boolean }[] = [];
    for (let i = 0; i < range.days; i += step) {
      const ymd = visible[i] ?? visible[visible.length - 1];
      /**
       * ⚠️ THE COLUMN THAT CONTAINS TODAY, NOT THE ONE THAT STARTS ON IT. At day grain those are
       * the same and the difference is invisible; at week and month grain no column starts on
       * today, so `ymd === today` marked nothing at all and today fell off the board entirely at
       * two ranges out of five. The past slice is what exposed it — before it, today was always
       * column zero.
       */
      const span = visible.slice(i, i + step);
      out.push({ ymd, from: i, now: span.includes(today) });
    }
    return out;
  }, [visible, range.grain, range.days, today]);
  /**
   * ⚠️ WHERE ONE PERIOD ENDS AND THE NEXT BEGINS — the rhythm a weekend tint would have given, and
   * the reason it is not one. Shading Saturday and Sunday states that a reply window pauses at the
   * weekend; the month grid made that ruling already and dropped its own tint for it. At day grain
   * the boundary is a Monday. (Week and month grain arrive with the range control in Phase 3, and
   * this is the one function that will answer for all three.)
   */
  const startsPeriod = (ymd: string) => {
    const d = new Date(`${ymd}T12:00:00`);
    if (range.grain === "day") return d.getDay() === 1;      // a week begins
    if (range.grain === "week") return d.getDate() <= 7;     // the week that opens a month
    return true;                                             // every month column is a boundary
  };
  /* ⚠️ `rowSay` IS GONE (Phase 5). It lifted the live segment's own LABEL into the head at three
     months and above, where a bar is too small to carry words. The head has its own sentence now,
     at every range, so the relocation has nothing left to relocate — and leaving the helper would
     have left a second, quieter source of head text for someone to reach for. */
  /** the column's own label: a date at day grain, a date and month at week, a month name at month */
  const colLabel = (ymd: string, grain: "day" | "week" | "month") => {
    const d = new Date(`${ymd}T12:00:00`);
    if (grain === "day") return String(d.getDate());
    if (grain === "week") return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
    return d.toLocaleDateString("en-GB", { month: "short" });
  };
  /* ⚠️ A PAST WEEK IS A PROPERTY OF THE WINDOW, not of a row — nothing in it is provisional any
     more, so the dashes go solid, the waypoints render as passed, and the pulse stops. */
  const pastWeek = visible[visible.length - 1] < today;

  /* ⚠️ THE PAGER MOVES BY WHOLE WINDOWS, and the arrow keys move it too. They were moving a day
     SELECTION when a day was the unit; the unit is now the week, so the same keys move the week.
     Inert while typing, like every other Tasks shortcut — a bare `T` reaching the page from inside
     the search field would jump the window mid-word. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (el?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      /* ⚠️ A STEP IS A WEEK (v58), not a window. The ref shifts `SH` by seven and redraws; a
         whole-window jump lands the reader somewhere with no overlap to orient by. */
      if (e.key === "ArrowLeft") { e.preventDefault(); setWinStart((s) => shiftWindow(s, WEEK_STEP, -1)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setWinStart((s) => shiftWindow(s, WEEK_STEP, 1)); }
      else if (e.key === "t" || e.key === "T") { e.preventDefault(); setWinStart(today); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [today]);

  /* ⚠️ THE CALENDAR SHOWS NO DISMISSED CARDS, DELIBERATELY. A dismissed task has no action date —
     that is what dismissing it removed — so it has no day to sit on. */
  const byDay = useMemo(
    () => calendarDays({
      cols: {
        todo: assembled.cols.todo, today: assembled.cols.today, snoozed: assembled.cols.snoozed,
        dismissed: [], done: assembled.cols.done,
      },
      flags: taskFlags, queries, agents, userTasks, activities, today, nowMs: now,
    }, visible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assembled, taskFlags, queries, agents, userTasks, activities, today, visible],
  );

  /* the record — a second derivation over the same visible days, one pass over an array already
     in memory: no new query, no new hook, no stored field */
  const recByDay = useMemo(
    () => recordDays(activities, queries, agents, visible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, queries, agents, visible],
  );

  /* ⚠️ ONE READING OF A DAY, so the rows, the bands and the count cannot disagree about what is on
     it. The dedupe takes the day's record as an ARGUMENT rather than a flag, which is what makes
     "one fact, one chip" hold structurally: a completed card and a record entry that are two
     readings of ONE activity collapse before anything downstream sees them. */
  const recordFor = React.useCallback(
    (ymd: string): RecordItem[] => recByDay.get(ymd) ?? [], [recByDay],
  );
  const itemsFor = React.useCallback(
    (ymd: string): CalendarItem[] => dedupeAgainstRecord(byDay.get(ymd)?.items ?? [], recByDay.get(ymd) ?? []),
    [byDay, recByDay],
  );
  /* ghosts derive from TODAY's items, never the day's own — carried work renders on today, so that
     is the only list its origin can be read from */
  const ghostsOn = React.useCallback(
    (ymd: string): GhostItem[] => (ymd === today ? [] : ghostsFor(ymd, itemsFor(today))),
    [itemsFor, today],
  );

  const { rows, segments, nodes } = useMemo(
    () => timelineWeek(
      { queries, agents, activities, manuscripts, taskFlags, today, itemsFor, recordFor, ghostsOn },
      winFrom, range.days, view,
    ),
    [queries, agents, activities, manuscripts, taskFlags, today, itemsFor, recordFor, ghostsOn, winFrom, view],
  );
  /** the bar's three parts, grouped by the row they belong to — one pass, read three times */
  const barsByRow = useMemo(() => {
    const m = new Map<string, { segs: Segment[]; nodes: BarNode[] }>();
    const get = (k: string) => {
      let v = m.get(k);
      if (!v) { v = { segs: [], nodes: [] }; m.set(k, v); }
      return v;
    };
    for (const sg of segments) get(sg.rowKey).segs.push(sg);
    for (const n of nodes) get(n.rowKey).nodes.push(n);
    return m;
  }, [segments, nodes]);

  /* ⚠️ THE COUNT STATES WHAT IS ON SCREEN, never a total the filters have stopped describing. */
  const shown = rows.reduce((n, r) => n + r.items.length, 0) + segments.length;
  /* ⚠️ RELATIONSHIPS ONLY. This counted everything that was not the pinned row, which since tasks
     became rows meant it counted those too — a noun describing something other than its own set. */
  const agentRows = rows.filter((r) => r.key !== YOU_ROW && r.group !== null).length;

  /* ══ WHAT IS SELECTED, AND WHAT IS BEING WORKED ══════════════════════════════════════════ */
  const allItems = useMemo(() => rows.flatMap((r) => r.items.map((it) => ({ it, row: r }))), [rows]);
  const selItem = allItems.find((x) => x.it.key === sel) ?? null;
  const selSeg = segments.find((sg) => sg.key === sel) ?? null;
  const selNode = nodes.find((n) => n.key === sel) ?? null;
  /* a selection the filters have taken off the board is no longer a selection */
  React.useEffect(() => {
    if (sel && !selItem && !selSeg) setSel(null);
  }, [sel, selItem, selSeg]);

  const workRow = work ? rows.find((r) => r.key === work.rowKey) ?? null : null;
  /* the workspace lost its row — a filter, a page, or the card completing and evaporating */
  React.useEffect(() => {
    if (work && !workRow) { setWork(null); setPaneCard(null); }
  }, [work, workRow]);

  /**
   * ⚠️ THE QUERY THE WORKSPACE IS ABOUT — the worked item's, falling back to whatever else in the
   * row names one. A row is a RELATIONSHIP and can hold several queries; the item decides, and the
   * fallback is only for a row head opened with nothing selected.
   */
  const workQueryId = useMemo(() => {
    if (!workRow) return undefined;
    const picked = work?.itemKey ? workRow.items.find((i) => i.key === work.itemKey) : undefined;
    return picked?.queryId
      ?? barsByRow.get(workRow.key)?.segs[0]?.queryId
      ?? workRow.items.find((i) => i.queryId)?.queryId;
  }, [workRow, work, barsByRow]);
  const workQuery = workQueryId ? queries.find((q) => q.id === workQueryId) ?? null : null;
  const workAgent = workRow?.agentId ? agents.find((a) => a.id === workRow.agentId) ?? null : null;
  const workSeg = workRow ? (barsByRow.get(workRow.key)?.segs ?? []).find((sg) => sg.side === "theirs") ?? null : null;

  /**
   * ⚠️ THE AUTHORITATIVE ROWS, from the query's own subcollection — the store the Query Centre
   * reads. The global `activities` feed this page holds is a best-effort projection twin, and
   * reading the conversation out of it is how the dock came to say "Nothing logged yet." about a
   * query with history.
   *
   * ⚠️ AND IT IS A SECOND LISTENER ON THE SAME SUBCOLLECTION while a card is docked, because
   * `useTaskPaneSession` opens its own and exposes only `{ journey, onPrimary }`. Wasteful, not
   * wrong — one query, one document each — and the fix is to surface `dockRows` from the session,
   * which is a file this session does not own. Flagged in the report.
   */
  const convo = useDockActivity(currentUser?.id, workQueryId);
  const convoRows = useMemo(
    () => (workQuery ? buildTimelineRows(convo, workQuery, workAgent) : []),
    [convo, workQuery, workAgent],
  );

  /* ══ THE TASK PANE, OVER THE TIMELINE ═══════════════════════════════════════════════════ */
  /* `offer` and `fix` still reach `FocusFlow` — but the way `/todo` reaches it, through the pane's
     own primary, past `paneCommits`. It is never a second entrance. */
  const [flowCard, setFlowCard] = useState<BoardCard | null>(null);
  const [paneCard, setPaneCard] = useState<BoardCard | null>(null);
  const { commit, quickDone } = useTaskCommit({
    flash, rememberUndo: remember, confirmAsk,
    openFlow: (c) => setFlowCard(c),
  });
  const paneRef = React.useRef<HTMLDivElement | null>(null);
  const paneHost: TaskPaneHost = {
    /**
     * ⚠️ SCOPED TO THIS MOUNT'S OWN PANE, which is why Pack B built `idPrefix`. Every workspace
     * page stays MOUNTED, so `/todo`'s pane is in the document too — a bare `document.querySelector`
     * would find ITS section and scroll a page the reader cannot see.
     */
    /* ⚠️ FOCUS, NOT SCROLL — the same change `/todo` made in the workspace round, for the same
       reason: the session has already opened the row, and focusing brings it into its scrollport
       without a second mechanism deciding where to put it. Scoped to `paneRef` because every
       workspace page stays mounted and `/todo`'s pane is in the document too. */
    jumpToSection: (id) => {
      const root = paneRef.current;
      const sect = root?.querySelector<HTMLElement>(`#${CAL_PANE_PREFIX}${id}`);
      if (!sect) return;
      (sect.querySelector<HTMLElement>("button, input, textarea, [tabindex]") ?? sect).focus?.();
    },
    /* the `offer`/`fix` hand-off — parity with `/todo`, which is why the sheet stays mounted */
    openFlow: (c) => { setPaneCard(null); setFlowCard(c); },
    commit,
    /* ⚠️ NO DOCK CURSOR HERE. `/todo` advances to the next card in its dock; a week is not a queue,
       so a completed card leaves the board and the workspace closes with it — which is the
       catalogue's "settle" step: the card evaporates from every surface at once, because the
       condition that derived it stopped holding. */
    advance: () => { setPaneCard(null); setWork(null); },
    openQuery: (c) => { if (c.relatedRecordId) onNavigate("queries", c.relatedRecordId); },
    /* ⚠️ THE CALENDAR SUPPLIES NEITHER `snooze` NOR `mute`, AND ABSENCE IS NOT DISABLED. Its snooze
       is DRAG — on the surface where days are the subject — and it shows no dismissed cards at all,
       which is the same reason it passes no `onSnooze` and no `onDismiss`. A delay intent there
       therefore writes nothing rather than writing through a surface that has no place for it; the
       fork's delay options are the journey's, and whether this host can honour them is the host's
       business. Flagged in the run report as the one journey the calendar cannot complete. */
    /* the deed's two links — the same one-shot reveal keys `/todo` and the ⋯ menu use */
    openAgent: (agentId) => {
      try { sessionStorage.setItem("sa.agentReveal", agentId); } catch { /* private mode */ }
      onNavigate("agents");
    },
    openManuscript: (manuscriptId) => {
      try { sessionStorage.setItem("sa.manuscriptReveal", manuscriptId); } catch { /* private mode */ }
      onNavigate("manuscripts");
    },
    /* onSnooze / onDismiss are deliberately ABSENT — see `TaskPaneHost`. The calendar's snooze is
       drag, and it shows no dismissed cards at all. */
  };
  const paneSession = useTaskPaneSession(paneCard, paneHost, CAL_PANE_PREFIX);

  /**
   * ⚠️ ESCAPE RETURNS TO THE WEEK, and only while the workspace is open. It is captured so it does
   * not also reach the page beneath — a menu and the workspace would otherwise close on one press.
   * `FocusFlow` keeps its own handler; the two are mutually exclusive, since the pane closes itself
   * before handing a card over.
   *
   * ⚠️ IT ALWAYS DID CLOSE THE PANE, so nothing about typed answers changed here. What the retired
   * scrim carried — "a stray click on the ground is not a decision to discard them" — is vacuous
   * now rather than lost: there is no ground to click.
   */
  React.useEffect(() => {
    if (!work) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setWork(null);
      setPaneCard(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [work]);


  /* ══ DRAG A TASK TO A NEW DAY ════════════════════════════════════════════════════════════
     ⚠️ THE DROP WRITES THROUGH `updateUserTask` — the existing writer — and writes `dueDate`
     ALONE. Dates are input, not derived state: the writer moves the date and nothing auto-fires.
     ⚠️ THE ORIGIN DAY IS NOT A VALID TARGET, which makes dropping there a no-op by construction:
     `dragover` only calls `preventDefault` on a DIFFERENT day, so the browser never permits the
     drop and no write can fire. A no-op enforced at the gesture beats one checked at the write.
     ⚠️ FAILURE IS VISIBLE — the write's catch flashes this page's own toast, in `todoWrite`'s
     copy, never a literal authored here and never a raw Firebase message. */
  const [dragTask, setDragTask] = useState<{ id: string; from: string } | null>(null);
  const [dropYmd, setDropYmd] = useState<string | null>(null);
  const endDrag = () => { setDragTask(null); setDropYmd(null); };
  const dropOn = (ymd: string) => {
    if (!dragTask || ymd === dragTask.from) { endDrag(); return; }
    updateUserTask(dragTask.id, { dueDate: ymd }).catch((e) => {
      flash(saveErrorCopy(classifyWriteError(e)));
    });
    endDrag();
  };

  /**
   * ⚠️ TWO GESTURES, TWO OUTCOMES. A chip that carries a CARD is work, so it opens the workspace;
   * anything else — a record entry, a ghost, a band — is a fact, so it selects and fills the band
   * below. The brief names a your-turn chip; a writer's own task carries a card too, and refusing
   * it would be a regression against the month, where every carded pip opened the pane.
   */
  const openWork = (rowKey: string, ymd: string, itemKey: string | null, card?: BoardCard) => {
    setSel(itemKey);
    setWork({ rowKey, ymd, itemKey });
    setPaneCard(card ?? null);
  };
  /**
   * ⚠️ A YOUR-MOVE STRETCH IS WORK, SO IT OPENS THE WORKSPACE — the same gesture a your-turn chip
   * had before the chip became part of the bar. The card is found by the query the stretch belongs
   * to, which is the join the page already makes for everything else.
   */
  const cardForQuery = (queryId: string): BoardCard | undefined =>
    visible.flatMap((ymd) => itemsFor(ymd)).find((it) => it.card?.relatedRecordId === queryId)?.card;
  const pickSeg = (rowKey: string, sg: Segment) => {
    const card = sg.side === "yours" ? cardForQuery(sg.queryId) : undefined;
    if (card) { openWork(rowKey, visible[Math.floor(sg.from)] ?? today, sg.key, card); return; }
    setSel((c) => (c === sg.key ? null : sg.key));
  };
  const pick = (rowKey: string, it: TimelineItem) => {
    if (it.card) { openWork(rowKey, it.ymd, it.key, it.card); return; }
    setSel((c) => (c === it.key ? null : it.key));
  };

  /**
   * ⚠️ THE MASTHEAD STATES NO SUBTITLE, AND THAT IS WHERE ITS HEIGHT WENT. It read
   * "26 Aug – 1 Sept — every relationship, and the time between." Both halves are already on
   * screen: the day header names all seven dates in the writer's own week, and the pager beside
   * the title offers `‹ Today ›`. A masthead line restating the row beneath it is a line spent
   * saying nothing, and on a page whose whole difficulty is vertical room it is the cheapest thing
   * to give back.
   */

  const setView1 = <K extends keyof TimelineView>(k: K, v: TimelineView[K]) =>
    setView((cur) => ({ ...cur, [k]: v }));

  /**
   * ⚠️ CUT BY MANUSCRIPT IS GATED ON THERE BEING MORE THAN ONE, and the gate reads the
   * MANUSCRIPTS THE BOARD ACTUALLY DRAWS rather than the writer's shelf. A writer with three
   * books, two of them shelved with no live queries, has one manuscript on this board — offering
   * to cut it by book would offer two cuts that produce the same page and one that produces an
   * empty one.
   */
  const boardManuscripts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) for (const m of r.manuscripts) if (m.id) seen.set(m.id, m.title);
    return [...seen].map(([id, title]) => ({ id, title }));
  }, [rows]);
  /* ⚠️ `groupMode` IS A DEAD KNOB AND IS FLAGGED RATHER THAN QUIETLY LEFT (v63). `setGroupMode`
     has no caller anywhere, so the state is permanently `"list"` — which makes `cutNow` constantly
     `"needs"` and the builder's `groupMode === "move"` branch unreachable. It is NOT retired here
     because those readers are inside the board builder and pulling them out mid-toolbar is how a
     phase about arrangement silently changes what the board contains. Named, so the sweep has a
     target rather than a suspicion. */
  const [groupMode, setGroupMode] = useState<GroupMode>("list");
  /* ══ THE BOARD'S VIEW OPTIONS (v63, section C) ═══════════════════════════════════════════
     ⚠️ FOUR PIECES OF STATE, AND THEY ANSWER A DIFFERENT QUESTION FROM THE SIDEBAR'S VIEWS.
     The sidebar asks WHICH rows (one class of work); the toolbar asks how the rows that survive
     are arranged and narrowed. Keeping them apart is why both can be on screen at once without
     either being a second copy of the other — and why the toolbar states its own row count.

     ⚠️ AND THE SORT REPLACES `view.sort` RATHER THAN JOINING IT. That knob's only comparison was
     `=== DEFAULT_SORT` and no control on the page could set it anything else, so the builder's
     order was discarded on every render; it is gone, not pinned, because a knob nothing can turn
     left beside one that works is how a board comes to have two sorts that disagree. The OTHER
     dead knob, `groupMode`, still has readers inside the board builder and is flagged at its
     declaration for the sweep — stated plainly, because a comment claiming a retirement that did
     not happen is worse than no comment. */
  const [groupBy, setGroupBy] = useState<GroupBy>("urgency");
  const [sortBy, setSortBy] = useState<SortBy>("urgency");
  const [sortRev, setSortRev] = useState(false);
  const [statusPick, setStatusPick] = useState<QueryStatus[]>([]);
  /* which toolbar menu is open — one at a time, and `null` is closed */
  const [tbOpen, setTbOpen] = useState<null | "group" | "sort" | "status">(null);

  const cutByAvailable = boardManuscripts.length > 1;
  const [cutBy, setCutBy] = useState<"needs" | "ms">("needs");
  /* ⚠️ A CUT THE BOARD CAN NO LONGER OFFER MUST NOT SURVIVE AS STATE. Deleting the last book that
     made the control available while it is selected would otherwise leave the board grouped by a
     control that is no longer on screen — a filter nothing can reach and nothing can clear. */
  /* ⚠️ THE MANUSCRIPT CUT IS A GROUP MODE NOW (v54, Phase 6), not a control of its own. It was a
     two-state segment answering "how is this board arranged" beside another two-state segment
     answering the same question; four modes in one row is the same set of choices stated once.
     `cutNow` survives as the derived reading the board's own branch already reads. */
  const cutNow: "needs" | "ms" = cutByAvailable && groupMode === "manuscript" ? "ms" : "needs";

  /* ══ THE CROSSHAIR, THE ONE TOOLTIP, AND `RIGHT NOW` ═══════════════════════════════════ */

  /**
   * ⚠️ `RIGHT NOW` IS A VIEW STATE AND NOTHING ELSE — no route, no persistence, no second
   * derivation. It survives nothing, deliberately: a reader who has filtered the board down to
   * what is being asked of them should find the whole board again when they come back to it,
   * because the full board is what the page is for.
   */
  const [tab, setTab] = useState<TimelineTab>("all");
  /* ⚠️ `RIGHT NOW` IS RETIRED INTO `Needs me`, WHICH IS THE SAME FILTER WITH A HOME. It was a
     two-state segment stating a thing the tab strip now says among its peers, and a reader could
     not see from it what the other cuts of the board even were. `onlyAsks` survives as a derived
     reading for the count line and the sparse copy, both of which ask one question: is the board
     showing only what is being asked of you. */
  const onlyAsks = tab === "needs";
  /**
   * ⚠️ ONE LIST IS THE DEFAULT AND GROUPED IS THE MODE, which is the way round v37 turns it.
   *
   * The six groups answer "what kind of thing is this" — a question a reader asks once and then
   * stops asking. What they want next is what is nearest, and headings put six walls between them
   * and that. So the flat list orders every row, relationships and tasks together, by the one key
   * both now carry.
   *
   * ⚠️ SESSION-HELD, NOT PERSISTED. A reader who went looking at the groups once should not meet
   * them again next week having forgotten they asked; the page opens on the list every time.
   */

  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const tipRef = React.useRef<HTMLDivElement | null>(null);
  const [cross, setCross] = useState<{ x: number; label: string } | null>(null);
  /**
   * Which group the sidebar is showing, or `null` for all.
   *
   * ⚠️ IT FILTERS THE DRAWN GROUPS, NEVER THE ROW SET THE COUNTS COME FROM. A sidebar whose numbers
   * changed as you clicked them could not be added up — which is precisely the fault the retired tab
   * strip had, where every tab but the current one reported its own view's total.
   */
  const [secFilter, setSecFilter] = useState<CalSection | null>(null);

  /**
   * The crosshair — pure geometry, and it reads the DAY rather than remembering one.
   *
   * ⚠️ IT IS COMPUTED FROM THE POINTER'S FRACTION OF THE LANE, never from a column the reader is
   * over: there are no columns any more. The lane is the ruler, `--tl-days` is its scale, and the
   * date falls out of the arithmetic — so it cannot drift out of step with where the bars are
   * drawn, which are placed by the identical expression.
   */
  const onLaneMove = (e: React.MouseEvent) => {
    const wrap = wrapRef.current;
    const lane = (e.target as HTMLElement | null)?.closest?.(".tl-c-tl") as HTMLElement | null;
    if (!wrap || !lane || !lane.closest(".tl-rrow")) { setCross(null); return; }
    const wr = wrap.getBoundingClientRect();
    const lr = lane.getBoundingClientRect();
    const f = (e.clientX - lr.left) / lr.width;
    if (f < 0 || f > 1) { setCross(null); return; }
    const idx = Math.min(visible.length - 1, Math.max(0, Math.round(f * range.days)));
    const ymd = visible[idx];
    if (!ymd) { setCross(null); return; }
    setCross({ x: (lr.left - wr.left) + f * lr.width, label: shortCalDate(ymd) });
  };
  const clearCross = () => setCross(null);

  /**
   * ONE tooltip, portalled to the board wrap.
   *
   * ⚠️ `.tl-c-tl` CLIPS (`overflow: hidden`), SO NO DESCENDANT TOOLTIP CAN ESCAPE IT — a clipping
   * ancestor beats any `z-index` a child can declare. That is why this is a single element at
   * board level rather than one per bar, and why it is positioned against the wrap and clamped
   * inside it: a tip on the last row or at the right-hand edge would otherwise be cut in half by
   * the very box it belongs to.
   *
   * ⚠️ AND IT NEVER INTERCEPTS CLICKS. `pointer-events: none` in the sheet, so a marker under it
   * stays clickable — a tooltip that swallowed the click on the thing it describes would be a
   * control that looks live and is not.
   */
  React.useEffect(() => {
    const wrap = wrapRef.current;
    const tip = tipRef.current;
    if (!wrap || !tip) return;
    const show = (ev: MouseEvent) => {
      const t = (ev.target as HTMLElement | null)?.closest?.("[data-tip]") as HTMLElement | null;
      if (!t) { tip.classList.remove("on"); return; }
      const text = t.getAttribute("data-tip") ?? "";
      if (!text) { tip.classList.remove("on"); return; }
      tip.textContent = text;
      tip.classList.add("on");
      const wr = wrap.getBoundingClientRect();
      const tr = t.getBoundingClientRect();
      tip.style.top = `${(tr.top - wr.top) - tip.offsetHeight - 7}px`;
      const half = tip.offsetWidth / 2;
      const want = (tr.left - wr.left) + Math.min(tr.width / 2, 90);
      const x = Math.max(half + 2, Math.min(wr.width - half - 2, want));
      tip.style.left = `${x - half}px`;
    };
    const hide = (ev: MouseEvent) => {
      const to = ev.relatedTarget as HTMLElement | null;
      if (!to || !to.closest?.("[data-tip]")) tip.classList.remove("on");
    };
    wrap.addEventListener("mouseover", show);
    wrap.addEventListener("mouseout", hide);
    return () => {
      wrap.removeEventListener("mouseover", show);
      wrap.removeEventListener("mouseout", hide);
    };
  }, []);

  /* ⚠️ THESE TWO ARE DECLARED ABOVE THE BOARD DERIVATION, AND THE ORDER IS LOAD-BEARING.
     `board` is a `useMemo` that RUNS DURING RENDER and called `asksOfYou` → `actionFor`; a `const`
     arrow declared below it is in its temporal dead zone at that moment, so the page threw
     "Cannot access 'actionFor' before initialization" and fell into its error boundary — with a
     clean `tsc`, because TypeScript cannot see through a helper the render happens to call. The
     render smoke is what caught it, which is the reason that smoke exists. */
  /* ══ WHAT A ROW ASKS OF YOU, AND WHAT IT SCRAWLS ═══════════════════════════════════════ */

  /**
   * The one deed this row offers, or `null`.
   *
   * ⚠️ THE DEED HAS ONE SOURCE. `rowNote` derives it from the query's status (and, for a reminder
   * fallen due, from a date) and the button uppercases it — one rendering of one fact. It used to
   * have two, the button and a handwritten copy beside the bar; v37 deleted the second, and the
   * rule it was there to keep is now trivially true rather than maintained.
   *
   * ⚠️ AND A DEED WITHOUT A CARD IS NOT AN ACTION. The button's only job is to open the task pane,
   * so a row whose work has no `BoardCard` behind it has no door to offer — it shows the em-dash.
   * A button that opened nothing would be the dead-control fault this repo already records
   * against an Undo that restored nothing.
   */
  /**
   * ⚠️ THE CARD IS FOUND BY QUERY, ACROSS THE WHOLE BOARD — never by looking for a chip inside the
   * visible window. That was the first shape and it left the action column EMPTY ON EVERY ROW: a
   * card sits on the day it landed on the desk, which for a full requested three weeks ago is
   * outside a one-month window that opens eight days back. The row was asking for something and
   * the button beside it was an em-dash — measured, 14 dashes and 0 buttons.
   *
   * ⚠️ AND IT READS `assembled`, WHICH IS `assembleBoardColumns` — the same derivation the To-do
   * board and the badge count through. A second scan for "the card for this query" is how two
   * surfaces come to disagree about whether there is one.
   */
  const cardsByQuery = useMemo(() => {
    const m = new Map<string, BoardCard>();
    const cols = assembled.cols;
    for (const c of [...cols.todo, ...cols.today, ...cols.snoozed, ...cols.done]) {
      const id = c.relatedRecordId;
      if (id && !m.has(id)) m.set(id, c);
    }
    return m;
  }, [assembled]);



  /* ══ THE BOARD'S OWN DERIVATIONS ═══════════════════════════════════════════════════════ */

  /**
   * The date labels along the one column header.
   *
   * ⚠️ ROUGHLY NINE ACROSS THE WINDOW, AT EVERY RANGE — the ref's own `nDays / 9`. It is not a
   * day grain, a week grain or a month grain: those were properties of a grid that had to put a
   * cell somewhere, and there is no grid. Nine labels is what a reader can scan without counting.
   */

  /**
   * The months the window spans, for the rail's shelf.
   *
   * ⚠️ THE CURRENT MONTH'S LABEL IS PLACED IN ITS POST-TODAY HALF so it can never be split by the
   * today stem — the one position on the shelf where a label and a rule compete for the same
   * pixels. Every other month centres in its own span.
   */
  const months = useMemo(() => {
    const out: { key: string; label: string; at: number; labelAt: number; current: boolean; past: boolean }[] = [];
    const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    let i = 0;
    while (i < visible.length) {
      const d = new Date(`${visible[i]}T12:00:00`);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let j = i;
      while (j + 1 < visible.length) {
        const n = new Date(`${visible[j + 1]}T12:00:00`);
        if (`${n.getFullYear()}-${n.getMonth()}` !== key) break;
        j += 1;
      }
      const nowM = new Date(`${today}T12:00:00`);
      const current = `${nowM.getFullYear()}-${nowM.getMonth()}` === key;
      const tAt = visible.indexOf(today);
      /* the current month labels in the half AFTER today; every other centres in its own span */
      const labelAt = current && tAt >= i && tAt <= j ? (tAt + j + 1) / 2 : (i + j + 1) / 2;
      out.push({
        key, label: SHORT[d.getMonth()], at: i, labelAt, current,
        past: !current && visible[j] < today,
      });
      i = j + 1;
    }
    return out;
  }, [visible, today]);

  /** where today sits in the window, or `null` when the window does not contain it */
  const todayAt = useMemo(() => {
    const i = visible.indexOf(today);
    return i < 0 ? null : i + 0.5;
  }, [visible, today]);

  /* ⚠️ THE TILES ARE DECLARED BELOW `todayAt` BECAUSE THEY READ IT, and that ORDER is the fix —
     not the shuffle that silenced TS2448. This repo has shipped the same fault twice in shapes
     the compiler cannot see: a `const` read from a hoisted helper, and one read through an
     IIFE, both of which typecheck clean and throw on the first render. Being caught by TS2448
     is a reason to check every render-time read in the function, never a sign it is handled. */
  /**
   * The rail's week tiles (v60).
   *
   * ⚠️ WEEKLY, ANCHORED ON TODAY — not `days / 9`. The old step divided the window into nine
   * arbitrary slices, so a label's date meant nothing beyond "a ninth of the way along"; the board
   * steps by a week and the ref's rail steps by a week, so the tiles and the navigation now agree
   * about what a stride is. Anchoring on today rather than on the window's left edge is what keeps
   * a tile ON today: `‹ WEEK` shifts the window by seven days and every tile moves with it, so the
   * rail reads the same at every step instead of re-slicing itself.
   *
   * ⚠️ AND A TILE IS DROPPED AT EITHER EXTREME RATHER THAN CLAMPED. A tile is centred on its date
   * (`translateX(-50%)`), so one within half a tile of the edge would hang outside the lane; the
   * ref skips anything below 1.5% or above 98.5%.
   */
  const dateLabels = useMemo(() => {
    const out: { ymd: string; at: number; text: string; day: string; mon: string; now: boolean }[] = [];
    const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    if (todayAt == null) return out;
    /* ⚠️ `todayAt` IS FRACTIONAL — it is the MIDPOINT of today's day cell (`index + 0.5`), which is
       what puts today's line half a day into the day rather than on its boundary. An array index
       has to be a whole number, so anchoring the stride on it directly asked `visible[2.5]` and got
       `undefined` every time: no tiles, no error, and a green build. The rail simply emptied, and
       only the screenshot said so. `calSurface60.measure.ts` asserts the tile COUNT for exactly
       this reason — a probe that finds no element otherwise reports no offence. */
    const todayIdx = Math.floor(todayAt);
    const first = todayIdx % 7;
    for (let d = first; d < range.days; d += 7) {
      const ymd = visible[d];
      if (!ymd) continue;
      const frac = d / Math.max(1, range.days - 1);
      if (frac < 0.015 || frac > 0.985) continue;
      const dt = new Date(`${ymd}T12:00:00`);
      out.push({
        ymd, at: d, text: shortCalDate(ymd),
        day: String(dt.getDate()),
        mon: (SHORT[dt.getMonth()] ?? "").toUpperCase(),
        /* the tile whose week contains today — the ref's `now = (k <= 0 && 0 < k + 7)` */
        now: d <= todayIdx && todayIdx < d + 7,
      });
    }
    return out;
  }, [range.days, visible, todayAt]);
  /**
   * ⚠️ THE TODAY LINE IS POSITIONED IN PIXELS FROM A LANE'S OWN RECT, NEVER AS A PERCENTAGE.
   *
   * It was `pct(todayAt)` — a fraction of the WRAP — while every bar, chip and marker is a
   * fraction of the LANE, and the lane begins 460px in behind the name and action columns.
   * Measured at 1440: the line sat at x=557 while today, per the past wash, was at x=903. It has
   * been pointing 346px away from today, inside the name column, since the board was rebuilt —
   * and the acceptance could not see it, because it only asked whether the FLAG was centred on the
   * LINE. Both were wrong together, so the lock passed.
   *
   * The wrap is the only ancestor that spans every row and clips nothing, so the line must live
   * there; a percentage of the wrap is therefore meaningless and the position has to be measured.
   */
  const [todayX, setTodayX] = useState<number | null>(null);
  /**
   * ⚠️ THE ACTION CAP CLAMPS INSIDE ITS LANE — the ref's `placeText`, and it must run after layout.
   *
   * A cap is centred on its own date, so one near either edge of the window hangs half its width
   * outside the lane and paints over the row's furniture — measured before this ran, at the Month
   * range where the window is tightest. Clamping is the ref's answer rather than hiding it: the
   * date is still in view, so the deed should still be named; what moves is the pill, by the
   * minimum needed to keep it whole.
   *
   * ⚠️ IT READS `offsetLeft`, NOT `getBoundingClientRect`. The cap carries `translateX(-50%)`, and
   * a rect is the TRANSFORMED box — so measuring that and then writing `left` applies the shift
   * twice. `offsetLeft` is the layout position the transform is applied to.
   */
  /**
   * ⚠️ CLIPPED TEXT GLIDES ON HOVER — A TRANSITION ON THE INNER GLIDER, AND NOTHING ELSE MOVES.
   *
   * The ref arms this per card: on enter, if the words overflow their clip, translate the wrapper
   * by exactly the overflow with a duration scaled to the distance; on leave, back to zero. It is
   * a TRANSITION rather than a keyframe because a keyframe would run whether or not there is
   * anything to reveal, and because the distance is different on every card.
   *
   * The frame and the clip never move: the card must stay on its own dates while its words travel.
   */
  React.useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const offs: (() => void)[] = [];
    for (const card of Array.from(root.querySelectorAll<HTMLElement>(".tl-p"))) {
      const clip = card.querySelector<HTMLElement>(".tl-cardbody");
      const glider = card.querySelector<HTMLElement>(".tl-bwrap");
      if (!clip || !glider) continue;
      const enter = () => {
        const d = glider.scrollWidth - clip.clientWidth;
        if (d > 6) {
          glider.style.transition = `transform ${(0.5 + d / 80).toFixed(2)}s ease`;
          glider.style.transform = `translateX(-${d}px)`;
        }
      };
      const leave = () => { glider.style.transform = "translateX(0)"; };
      card.addEventListener("mouseenter", enter);
      card.addEventListener("mouseleave", leave);
      offs.push(() => {
        card.removeEventListener("mouseenter", enter);
        card.removeEventListener("mouseleave", leave);
      });
    }
    return () => { for (const off of offs) off(); };
  });

  React.useLayoutEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const clamp = () => {
      for (const cap of Array.from(root.querySelectorAll<HTMLElement>(".tl-cap"))) {
        const lane = cap.parentElement;
        if (!lane) continue;
        const laneW = lane.clientWidth;
        if (!laneW) continue;
        /**
         * ⚠️ RECORD THE POSITION, THEN RESTORE IT — IN THAT ORDER.
         *
         * This read `left = capleft ?? ""` and only THEN recorded `capleft`. On the first pass
         * `capleft` is undefined, so the line cleared the inline `left` — the percentage the cap
         * is positioned by — and then stored the empty string as the "original". From that moment
         * every cap had no position at all: `offsetLeft` read ~0 and the clamp below pinned it to
         * the lane's left edge. Measured on the deployed board: six caps, all at x 23–37 of a
         * 1100px lane, every one of them flush left regardless of its date.
         *
         * The clearing itself is right — a re-run must not clamp an already-clamped value — it was
         * only ever in the wrong order.
         */
        if (cap.dataset.capleft === undefined) cap.dataset.capleft = cap.style.left;
        cap.style.left = cap.dataset.capleft;
        const half = cap.offsetWidth / 2;
        const left = cap.offsetLeft;
        if (left - half < 2) cap.style.left = `${half + 2}px`;
        else if (left + half > laneW - 2) cap.style.left = `${laneW - half - 2}px`;
      }
    };
    clamp();
    const ro = new ResizeObserver(clamp);
    ro.observe(root);
    return () => ro.disconnect();
  });

  React.useLayoutEffect(() => {
    const place = () => {
      const root = pageRef.current;
      if (!root || todayAt == null) { setTodayX(null); return; }
      const wrap = wrapRef.current;
      const lane = Array.from(root.querySelectorAll<HTMLElement>(".tl-rrow .tl-c-tl"))
        .find((e) => e.getBoundingClientRect().width > 0);
      if (!wrap || !lane) { setTodayX(null); return; }
      const wr = wrap.getBoundingClientRect();
      const lr = lane.getBoundingClientRect();
      setTodayX((lr.left - wr.left) + lr.width * (todayAt / range.days));
    };
    place();
    /* ⚠️ AND IT IS RE-PLACED ON RESIZE, because the lane's width is what it is measured from. A
       value taken once is correct until the first time anything moves. */
    const ro = new ResizeObserver(place);
    const board = pageRef.current?.querySelector(".tl-board");
    if (board) ro.observe(board);
    return () => ro.disconnect();
  });
  const todayLeft = todayX == null ? undefined : `${todayX}px`;

  /**
   * ⚠️ `RIGHT NOW` IS A FILTER OF THE ONE DERIVATION, NEVER A SECOND ONE. It shows every row that
   * asks something of you and nothing else — the same rows, the same bars, the same deeds, in the
   * same groups. Deriving the short board separately is how two surfaces come to disagree about
   * what is being asked; the round-trip identity check in `calOrder56.measure.ts` asserts that
   * toggling out and back returns the identical set, by row key.
   */
  /* ⚠️ THE ROW ASKS BECAUSE ITS GROUP SAYS SO — never because a button happened to be buildable.
     This read the action lookup, so `RIGHT NOW` showed the rows that had a CARD rather than
     the rows that were asking, and a row under "Needs you now" whose card the board had not
     raised vanished from the very view built to find it. */
  const rowAsks = (r: TimelineRow) =>
    /* ⚠️ A TASK ROW ASKS BY EXISTING, and it is keyed by its own task rather than by `YOU_ROW` —
       which the first version of this tested for, so every per-task row answered false and the
       whole `Your tasks` group came out with dashes. `group === null` is what identifies one. */
    asksOfYou(r.group, r.group === null && r.items.some((i) => i.card));

  /**
   * The board, as groups.
   *
   * ⚠️ "Your tasks" IS A HEADING, NOT A SEVENTH `RowGroup`. A task belongs to no query, so
   * `rowGroupOf` returns `null` for it and that null is DATA. Widening the classification so the
   * view could have its heading would put a view decision inside a function every other reader
   * shares.
   */
  const board = useMemo(() => {
    /* ⚠️ ONE PREDICATE, AND IT READS THE ROW'S OWN GROUP — the same field the headings draw, so a
       tab and a heading cannot disagree about where a row stands. */
    const live = rows.filter((r) =>
      rowInTab(tab, r.group, r.group === null && r.items.some((i) => i.card)));
    const out: {
      key: string; title: string; sentence: string; count: number;
      rows: TimelineRow[]; group: RowGroup | null; collapsible: boolean; open: boolean;
    }[] = [];
    const pinned = live.filter((r) => r.group === null);
    if (pinned.length) {
      out.push({
        key: "tasks", title: TASKS_HEADING, sentence: TASKS_SENTENCE, count: pinned.length,
        rows: pinned, group: null, collapsible: false, open: true,
      });
    }
    /* ⚠️ CUT BY MANUSCRIPT REPLACES THE GROUPS, IT DOES NOT NEST INSIDE THEM. A board grouped by
       book and then by urgency is a board with fourteen headings; the cut is a different question
       ("what is happening with this book"), and answering both at once answers neither. Tasks keep
       their own heading either way — they belong to no book by construction. */
    if (cutNow === "ms") {
      for (const m of boardManuscripts) {
        const mine = live.filter((r) => r.group !== null && r.manuscripts.some((x) => x.id === m.id));
        if (!mine.length) continue;
        out.push({
          key: `ms-${m.id}`, title: m.title, sentence: "", count: mine.length,
          rows: mine, group: null, collapsible: false, open: true,
        });
      }
      return out;
    }
    /* ⚠️ `Whose move` READS `tabOf`, THE TABS' OWN ANSWER. Two derivations of "whose move is
       this" is how a heading and a tab come to disagree about one row — which is the fault
       `ASKING_GROUPS` was written to end. One function, two readers. */
    if (groupMode === "move") {
      for (const t of TAB_ORDER.filter((x) => x !== "all")) {
        const mine = live.filter((r) => r.group !== null
          && tabOf(r.group, false) === t);
        if (!mine.length) continue;
        out.push({
          key: `move-${t}`, title: TAB_LABEL[t], sentence: "", count: mine.length,
          rows: mine, group: null, collapsible: false, open: true,
        });
      }
      return out;
    }
    for (const g of GROUP_ORDER) {
      /* ⚠️ IN `RIGHT NOW` ONLY THE THREE ASKING GROUPS CAN SURVIVE, and that falls out of the
         filter rather than being listed: a watching, snoozed or closed row asks nothing, so it
         has no action and is already gone. A hard-coded list of three would be a second statement
         of the same rule, free to drift. */
      const mine = live.filter((r) => r.group === g);
      /* ⚠️ AN EMPTY GROUP IS OMITTED ENTIRELY, HEADER AND ALL. A header reading "0" is a heading
         for nothing — it teaches the shape of a board the writer does not have. */
      if (!mine.length) continue;
      out.push({
        key: g, title: GROUP_LABEL[g], sentence: groupSentence(g, mine.length), count: mine.length,
        /* ⚠️ COLLAPSIBLE IS WHATEVER OPENS COLLAPSED, read from the one list rather than named
           again here — two lists of the same groups is one edit from disagreeing about which of
           them a reader can reopen. */
        rows: mine, group: g,
        collapsible: COLLAPSED_BY_DEFAULT.includes(g), open: !shut.includes(g),
      });
    }
    return out;
  /**
   * ⚠️ `tab` AND `groupMode` ARE IN THIS LIST, AND THEIR ABSENCE WAS INVISIBLE FOR TWO TABS.
   *
   * The filter reads `tab` and the arrangement reads `groupMode`; neither was a dependency, so the
   * board never recomputed when either changed. It LOOKED right for `Needs me` and `With agents`
   * because `onlyAsks` is derived as `tab === "needs"` and happens to change in step with those
   * two — so switching between them busted the memo for an unrelated reason. `Tasks` and `Closed`
   * change nothing else, and selecting `Tasks` left all 23 rows on the board with the tab lit.
   * Two of five views working by coincidence is the shape a dependency list gets wrong in.
   */
  }, [rows, shut, onlyAsks, tab, groupMode, cutNow, boardManuscripts]);

  /**
   * Every row on one list, in the order the board was built in.
   *
   * ⚠️ IT FLATTENS AND DOES NOT RE-SORT, AND THAT IS THE FIX. It used to sort by `pressingAt`
   * here — which is `cmp.soonest`, so at the default it looked right and WAS right. What it also
   * did was overwrite the order for the other two: `view.sort` is applied by the board builder
   * (`todoTimeline`'s `cmp` table), and this re-sort threw that away. Measured: selecting
   * "Longest waiting" set `aria-pressed` on the control and repainted **the identical order**,
   * every row in the same place. A control that reports success and changes nothing is worse than
   * one that is missing — the reader believes the board is now ordered the way they asked.
   *
   * ⚠️ IT ALSO THREW AWAY THE CLOSED RULE. The builder sinks a closed row below every live one in
   * EVERY sort, before any key is consulted; a re-sort on `pressingAt` alone knows nothing about
   * that, and only got away with it because a closed row happens to carry a null key today.
   *
   * ⚠️ SO IT RE-SORTS IN SOONEST AND ONLY IN SOONEST. The builder interleaves the pinned row and
   * the task rows ABOVE the agent rows, each ordered among themselves — correct for a grouped
   * board, and not a single ascending list. One list at SOONEST is exactly the claim that the top
   * is what needs you next, so it is flattened and ordered on the one key; the other two orders
   * are the builder's and are passed through untouched, because re-sorting them on `pressingAt`
   * is what made the control inert.
   *
   * ⚠️ AND A ROW WITH NO KEY SINKS RATHER THAN LEADS. `null` means nothing is pressing — a closed
   * relationship, or one with no dated work — and `null` sorted as zero would put the quietest
   * rows at the top of a list whose whole claim is that the top is what needs you.
   */
  /**
   * ══ THE ROW ORDER — ONE COMPARATOR PER SORT KEY (v63, section C) ═══════════════════════════
   *
   * ⚠️ THE TOOLBAR'S SORT IS THE ONLY ONE. `view.sort` used to sit here as a ternary, and its only
   * comparison was `=== DEFAULT_SORT` — no control on the page could set it anything else, so the
   * builder's own order was discarded on every single render and the branch beside it was dead
   * code wearing a condition. It is gone rather than pinned: a knob nothing can turn, left in
   * place beside a knob that works, is how a board comes to have two sorts that disagree.
   *
   * ⚠️ AND EVERY KEY IS READ FROM WHAT THE ROW ALREADY HOLDS — `status`, `pressingAt`, `items`,
   * and the `owed` flag from the bar pass. Nothing here re-derives a date or a lateness; a second
   * opinion about whether a row is late is exactly how the board came to say a thing was urgent in
   * one place and file it under "with agents" in another.
   */
  const oneList = useMemo(() => {
    const rowsAll = board.flatMap((g) => g.rows);
    /**
     * ⚠️ THE DATES COME FROM THE ROW, AND THE FIRST CUT DERIVED THEM FROM `items` AND WAS WRONG.
     *
     * `items` holds only what falls inside the DRAWN WINDOW. On a board where nothing did, every
     * comparison returned 0, `Array.sort` is stable, and the two opposite-direction date sorts
     * produced one identical sequence — a control that ticked, named its value and did nothing.
     * `queriedAt` and `lastActiveAt` are the builder's own, in milliseconds, window-independent,
     * and they are the same two figures its `waiting` and `active` orders read; so the Calendar
     * and the builder cannot disagree about when a relationship started.
     *
     * ⚠️ AND A ROW WITH NO DATE SINKS IN BOTH ORDERS, which the sentinels do arithmetically:
     * `Infinity` for never sent, `-Infinity` for nothing recorded. It is not the oldest and it is
     * not the newest — floating it to either end would state one of those.
     */
    const byDate = (a: TimelineRow, b: TimelineRow, pick: "queriedAt" | "lastActiveAt") => {
      const x = a[pick], y = b[pick];
      if (x === y) return 0;
      /* the sentinel sinks whichever way the key runs */
      if (!Number.isFinite(x) || !Number.isFinite(y)) return Number.isFinite(x) ? -1 : 1;
      return pick === "queriedAt" ? x - y : y - x;
    };
    const cmp: Record<SortBy, (a: TimelineRow, b: TimelineRow) => number> = {
      /**
       * ⚠️ OWED WORK IS A TIER, AND A TASK IS NOT IN IT (v58e).
       *
       * The order is: owed → dated waits AND TASKS by date → reminders → silences → closed.
       * Sorting on the date alone interleaved them: a task due tomorrow sat between two
       * relationships that are already late, so the run of overdue work at the top — the whole
       * claim the board's first screen makes — was broken by something that is not late at all.
       *
       * ⚠️ IT READS THE SAME FLAG THE CHIP, THE WOBBLE AND THE STRIP READ. "Owed" is decided
       * once, in the bar pass; a row is owed when any card on it is. A second definition here is
       * how a board comes to say a thing is late in four places and order it as though it were not.
       */
      urgency: (a, b) => {
        const oa = (barsByRow.get(a.key)?.segs ?? []).some((sg) => sg.owed);
        const ob = (barsByRow.get(b.key)?.segs ?? []).some((sg) => sg.owed);
        if (oa !== ob) return oa ? -1 : 1;
        /* ⚠️ THE GROUP, NOT THE `closed` FLAG. `closed` means every query on the row is terminal
           by STATUS; the board's own closed rule is wider — an agency that states silence means
           no, with its window passed, closes a query that is still `Queried`. Sorting on the flag
           left exactly that row above four silences. The group is what the Closed section is
           built from, so this and the section cannot disagree. */
        const ca = a.group === "closed", cb = b.group === "closed";
        if (ca !== cb) return ca ? 1 : -1;
        return (a.pressingAt ?? Infinity) - (b.pressingAt ?? Infinity);
      },
      /* the pipeline's own ladder — see `STATUS_LADDER`; ties by name so the order is stable */
      status: (a, b) =>
        statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name),
      /* oldest query first, which is what a date read ascending means */
      sent: (a, b) => byDate(a, b, "queriedAt"),
      /* ⚠️ THE LABEL IS THE BASE ORDER. "Most recent activity" puts the most recent at the top;
         building it ascending and telling the reader to reverse it would make the control's own
         name describe what it does only half the time. */
      recent: (a, b) => byDate(a, b, "lastActiveAt"),
    };
    const out = rowsAll.slice().sort(cmp[sortBy]);
    return sortRev ? out.reverse() : out;
  }, [board, barsByRow, sortBy, sortRev]);


  /**
   * ══ THE SIX SECTIONS (v60) ═══════════════════════════════════════════════════════════════
   *
   * ⚠️ THE FACTS ARE READ FROM THE BAR PASS, NEVER RE-DERIVED. Every one of them is a flag the
   * chip, the wobble, the flag and the sort already read; a second opinion about whether a row is
   * late is how a board comes to say a thing is urgent in one place and file it under "with
   * agents" in another. `calSectionOf` is a pure cascade over these and nothing else.
   *
   * ⚠️ AND v60 AMENDS THE APP'S OWN LAW ABOUT WHOSE DATES CAN BE LATE. `journeyBars` states "the
   * writer's own dates only — an agency's expected date that has passed is a silence rather than a
   * deadline", and filed it as `state: "quiet"`: drawn, counted, and prompting nothing. The pack
   * says both prompt (Law 9), and the ref's Priya row is exactly that case — a stated reply date
   * five days gone, chip reading `Nudge them`, an urgent flag at today. So `quiet` is URGENT here.
   *
   * ⚠️ `ghost` IS THE GONE-QUIET SECTION, AND THE THRESHOLD DID NOT NEED CHOOSING. `barState`
   * separates the two at `GHOST_AFTER_DAYS = 180`; the ref draws its `Close query?` flag at
   * `(0 - r.from) >= 180`. The app and the design already agreed on the number — the app had
   * simply never used it to file a row.
   */
  const sectioned = React.useMemo(() => {
    const factsFor = (r: TimelineRow): CalSectionFacts => {
      const segs = barsByRow.get(r.key)?.segs ?? [];
      return {
        isTask: r.group === null,
        isClosed: r.group === "closed",
        /* a silence long enough that the relationship has in practice ended */
        isQuiet: segs.some((sg) => sg.state === "ghost"),
        /* the writer's own passed date, OR an agency estimate that passed on a running wait */
        isUrgent: segs.some((sg) => sg.owed) || segs.some((sg) => sg.state === "quiet"),
        writerHolds: segs.some((sg) => sideOf(sg.status) === "yours"),
        nextDatedIn: r.pressingAt ?? null,
      };
    };
    const bySec = new Map<CalSection, TimelineRow[]>();
    for (const r of oneList) {
      const sec = calSectionOf(factsFor(r));
      const list = bySec.get(sec);
      if (list) list.push(r); else bySec.set(sec, [r]);
    }
    /* ⚠️ AN EMPTY SECTION IS OMITTED ENTIRELY, HEADER AND ALL — the ref's `if(!items.length)return`.
       A heading over nothing teaches the shape of a board the writer does not have. */
    return CAL_SECTION_DRAW
      .map((sec) => ({ sec, rows: bySec.get(sec) ?? [] }))
      .filter((g) => g.rows.length > 0);
  }, [oneList, barsByRow]);

  /* ⚠️ WHICH SECTION EACH ROW FELL IN, DERIVED FROM `sectioned` RATHER THAN RE-CASCADED. The
     action grouping needs a row's urgency class, and asking `calSectionOf` a second time would be
     a second opinion about it — the exact shape that let the board once call a row urgent in one
     place and file it under "with agents" in another. One partition, read two ways. */
  const secOfRow = React.useMemo(() => {
    const m = new Map<string, CalSection>();
    for (const g of sectioned) for (const r of g.rows) m.set(r.key, g.sec);
    return m;
  }, [sectioned]);

  /* ⚠️ THE FILTER IS APPLIED TO THE DRAWN GROUPS AND NOWHERE ELSE. `sectioned` stays the whole
     board, so the sidebar's counts are a census however many groups are on screen — a tally that
     changed as you filtered it could not be added up. */
  const shownSections = React.useMemo(
    () => (secFilter === null ? sectioned : sectioned.filter((g) => g.sec === secFilter)),
    [sectioned, secFilter],
  );

  /**
   * ══ THE DRAWN GROUPS (v63, section C) ══════════════════════════════════════════════════════
   *
   * The rows that survive the view and the status filter, arranged by whichever of the four
   * groupings is on. A group is `{ key, tone, label, purpose, rows }` — and every field is
   * separate BECAUSE the four groupings answer different questions:
   *
   * ⚠️ THE TONE IS A CLAIM, SO A GROUPING WITH NOTHING TRUE TO SAY LEAVES IT NULL. The tint means
   * "this is that urgency class". Under `status` there is no urgency class — an Offer group tinted
   * rose would state the offer is late — so those groups are neutral. `action` maps honestly, one
   * bucket to one section's tone, because it IS an urgency-family question asked differently.
   *
   * ⚠️ AND THE PURPOSE LINE IS OMITTED RATHER THAN INVENTED. `CAL_SECTION_PURPOSE` says what a
   * section is FOR; a status group is not for anything, it just holds the rows at that stage. The
   * eyebrow is absent there, which is the same silence-wins rule the empty sections follow.
   */
  const drawnGroups = React.useMemo<DrawnGroup[]>(() => {
    /* ⚠️ THE STATUS FILTER NARROWS WHAT IS DRAWN AND NOT WHAT IS COUNTED. `sectioned` stays the
       whole board, so the sidebar's census still adds up; the toolbar states its own row count for
       exactly this reason — two numbers answering two questions, with the second one named. */
    const keep = (r: TimelineRow) => matchesStatus(statusPick, r.status);

    if (groupBy === "urgency") {
      return shownSections
        .map((g): DrawnGroup => ({
          key: g.sec, tone: g.sec, label: CAL_SECTION_LABEL[g.sec],
          purpose: CAL_SECTION_PURPOSE[g.sec], rows: g.rows.filter(keep),
        }))
        .filter((g) => g.rows.length > 0);
    }

    /**
     * ⚠️ THE OTHER THREE TAKE THEIR ROWS FROM `oneList`, NEVER BY FLATTENING `sectioned` — AND
     * FLATTENING IS WHAT THEY DID UNTIL THE MEASUREMENT CAUGHT IT.
     *
     * `sectioned` BUCKETS the sorted list into six sections in `CAL_SECTION_DRAW` order, so
     * flattening it hands back a sequence ordered by SECTION first and by the chosen key only
     * within each one. Under `No grouping` that is not a subtlety: the sort key's order across
     * section boundaries is simply gone, so three of the four keys produced the same three
     * sequences and `Reverse order` inverted something that was not what the reader had asked for.
     *
     * Every part was correct — the comparator ordered, the partition partitioned, the flatten
     * flattened — and the composition was wrong, which is why no unit lock could see it. Reading
     * `oneList` and filtering by the row's own section preserves the sort exactly.
     */
    const flat = oneList.filter((r) => (secFilter === null || secOfRow.get(r.key) === secFilter))
      .filter(keep);

    if (groupBy === "none") {
      /* ⚠️ ONE GROUP, NOT ZERO. The rows still need the container that carries the number column
         and the lane inset; drawing them loose would put them on a different grid from every other
         grouping, which is the misalignment v60d spent a whole phase measuring. The divider is
         what goes — a heading over "everything" says nothing. */
      return flat.length ? [{ key: "all", tone: null, label: "", purpose: null, rows: flat }] : [];
    }

    if (groupBy === "status") {
      const by = new Map<QueryStatus, TimelineRow[]>();
      const noStatus: TimelineRow[] = [];
      for (const r of flat) {
        if (r.status == null) { noStatus.push(r); continue; }
        const l = by.get(r.status); if (l) l.push(r); else by.set(r.status, [r]);
      }
      const out: DrawnGroup[] = STATUS_LADDER
        .filter((st) => by.has(st))
        .map((st) => ({
          key: `st:${st}`, tone: null, label: st, purpose: null, status: st,
          rows: by.get(st) ?? [],
        }));
      /* ⚠️ A ROW WITH NO STATUS GETS ITS OWN GROUP AND IS NEVER FOLDED INTO ONE. Tasks have no
         query status; filing them under `Queried` would state something about them that is not
         true, and dropping them would make the groups stop summing to the board. */
      if (noStatus.length) {
        out.push({ key: "st:none", tone: "task", label: "Tasks and notes", purpose: null, rows: noStatus });
      }
      return out;
    }

    const byAct = new Map<ActionBucket, TimelineRow[]>();
    for (const r of flat) {
      const b = actionBucketOf(secOfRow.get(r.key) ?? "with");
      const l = byAct.get(b); if (l) l.push(r); else byAct.set(b, [r]);
    }
    /* one bucket to one section's tone, so the tint keeps meaning what it means elsewhere */
    const ACT_TONE: Record<ActionBucket, CalSection> = {
      required: "over", upcoming: "need", nothing: "with", closed: "shut",
    };
    const ACT_PURPOSE: Record<ActionBucket, string> = {
      required: "waiting on you",
      upcoming: "coming up",
      nothing: "nothing to do yet",
      closed: "no longer running",
    };
    return ACTION_ORDER
      .filter((b) => byAct.has(b))
      .map((b) => ({
        key: `ac:${b}`, tone: ACT_TONE[b], label: ACTION_LABEL[b], purpose: ACT_PURPOSE[b],
        rows: byAct.get(b) ?? [],
      }));
  }, [shownSections, oneList, secFilter, groupBy, statusPick, secOfRow]);

  /** how many rows are actually on the board — the toolbar's own count, and the ref's `N rows` */
  const drawnCount = React.useMemo(
    () => drawnGroups.reduce((n, g) => n + g.rows.length, 0),
    [drawnGroups],
  );

  /**
   * ⚠️ THE ROW NUMBERS RUN CONTINUOUSLY ACROSS SECTIONS, so the column is a census of the board
   * rather than six restarts — `01` at the top of Urgent through to `nn` at the foot of Closed.
   * Derived here rather than counted during the render, because a render-time counter is a
   * side effect inside a map and reorders the moment React re-runs it.
   */
  const rowNumber = React.useMemo(() => {
    const n = new Map<string, number>();
    let i = 0;
    for (const g of sectioned) for (const r of g.rows) n.set(r.key, ++i);
    return n;
  }, [sectioned]);

  /* ⚠️ DECLARED ABOVE `sidebar`, WHICH READS IT. A `const` whose initialiser is JSX runs at its
     DECLARATION, so a component referenced from it must already exist — and `tsc` passed this
     one clean while the whole page threw on load and the harness could not find the shell. That
     is the third shape of the TDZ this repo records: not a same-scope read TS2448 catches, but
     a component read from an eagerly-evaluated element tree. The fix is the ORDER. */
  /**
   * The six section marks — the ref's `ICO` table, one glyph per section.
   *
   * ⚠️ THESE ARE SECTION MARKS, NOT STATUS GLYPHS, and the distinction is why they may be drawn
   * here at all. Every STATUS badge on this board is the app's `StatusDot` and is never redrawn
   * from a ref's SVG; a section heading is chrome naming a group, which `StatusDot` has no
   * vocabulary for. `currentColor` so each takes its own section's ink from `--gico`.
   */
  const SectionIcon = ({ sec }: { sec: CalSection }) => {
    const common = {
      className: "gico", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
      strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
      "aria-hidden": true,
    };
    switch (sec) {
      case "over": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.3" /></svg>;
      case "need": return <svg {...common}><path d="M4 12h14M13 7l5 5-5 5" /></svg>;
      case "with": return <svg {...common}><path d="M21 3 3 10.5l6.4 2.6L12 20l3-5.6L21 3z" /></svg>;
      case "quiet": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3.2 2" /></svg>;
      case "task": return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 12.5l2.3 2.3L15.5 10" /></svg>;
      case "shut": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></svg>;
    }
  };


  const firstOpen = board.findIndex((g) => g.open && g.rows.length > 0);
  const asking = rows.filter(rowAsks).length;
  /* ⚠️ THE TAB COUNTS ARE TAKEN OVER THE UNFILTERED ROWS, or every tab but the current one would
     report zero — a tab strip whose numbers depend on which tab you are in cannot be added up. */
  const tabCounts = React.useMemo(() => {
    /* ⚠️ SEEDED FROM `TAB_ORDER`, NEVER FROM A HAND-WRITTEN LITERAL. It was
       `{ all, needs, agents, closed }` and v54's fifth tab was simply missing from it — so `Tasks`
       rendered with no count at all and its rows were still counted, invisibly, under a key
       nothing displayed. A tally that lists its own keys goes stale the first time the set grows. */
    const t: Record<string, number> = Object.fromEntries(TAB_ORDER.map((k) => [k, 0]));
    t.all = rows.length;
    for (const r of rows) t[tabOf(r.group, r.group === null && r.items.some((i) => i.card))] += 1;
    return t;
  }, [rows]);
  /* ⚠️ THE TRIGGER NAMES ONLY WHAT IS NOT THE DEFAULT. A summary restating every setting says the
     same thing on a board nobody has touched as on one somebody has, which is no signal at all. */
  const displaySummary = [
    /* ⚠️ IT NAMES THE TOOLBAR'S SETTINGS, NOT THE TWO DEAD KNOBS IT USED TO. `groupMode` and
       `view.sort` were both stuck at their defaults with no control on the page, so two of the
       four clauses could never fire — a summary of settings nobody could change. */
    groupBy === "urgency" ? "" : GROUP_BY_LABEL[groupBy],
    sortBy === "urgency" ? "" : SORT_BY_LABEL[sortBy],
    sortRev ? "Reversed" : "",
    cutNow === "ms" ? "By book" : "",
    rangeIdx === DEFAULT_RANGE_INDEX ? "" : TIMELINE_RANGES[rangeIdx].label,
  ].filter(Boolean).join(" · ");
  /* the two nouns the count uses — a task row belongs to no agent and is not a relationship */
  const taskRows = rows.filter((r) => r.group === null && r.key !== YOU_ROW).length;

  /* ⚠️ DECLARED BELOW EVERY FIGURE IT READS — `agentRows`, `taskRows`, `asking`,
     `displaySummary`, `onlyAsks`. A `const` whose initialiser is JSX is evaluated AT its
     declaration, so each of those must already exist. TS2448 named four; the audit is the point
     rather than the fix, because this repo has shipped the same shape twice in forms the
     compiler cannot see. Everything the sidebar reads is above it now. */
  /**
   * ══ THE SIDEBAR (v61) ══════════════════════════════════════════════════════════════════════
   *
   * ⚠️ THE GROUP LIST IS THE FILTER, AND THE TAB STRIP IS RETIRED. The tabs named four cuts of the
   * board — All, Needs me, With agents, Tasks, Closed — while the board itself was divided into SIX
   * groups with different names. Two vocabularies for one question, and a reader adding up the tab
   * counts got a different answer from the one the dividers gave. The list names the groups that
   * exist, in the order they are drawn, with their own counts.
   *
   * ⚠️ AND IT LISTS ONLY NON-EMPTY GROUPS, PLUS ALL. A row offering a group with nothing in it
   * teaches the shape of a board the writer does not have — the same rule the dividers follow.
   */
  /**
   * The window's own dates, and whether it has moved off today.
   *
   * ⚠️ THE LABEL IS THE WINDOW'S FIRST AND LAST DAY, derived from the same `visible` array every
   * bar is placed against — so the pill cannot come to state a range the board is not drawing.
   * `movedOffToday` asks whether today is still at the window's centre rather than comparing the
   * start to a remembered value: the centre is what "today's window" MEANS, and a start-based
   * check would call a window that had moved and come back a different one.
   */
  const windowRangeLabel = React.useMemo(() => {
    const a = visible[0], b = visible[visible.length - 1];
    return a && b ? `${shortCalDate(a)} – ${shortCalDate(b)}` : "";
  }, [visible]);
  const movedOffToday = todayAt == null
    || Math.abs(todayAt - (range.days - 1) / 2) > 0.51;

  /**
   * ⚠️ THE FOUR FIGURES COME FROM THE SECTIONS, NOT FROM A SECOND PASS OVER THE DATA. The views
   * list above states the same counts; deriving these separately is how a sidebar comes to hold two
   * descriptions of one board — the fault this file has already recorded against tabs and dividers.
   */
  const glance = React.useMemo(() => {
    const n = (sec: CalSection) => sectioned.find((g) => g.sec === sec)?.rows.length ?? 0;
    return {
      open: n("over") + n("need") + n("with") + n("quiet"),
      urgent: n("over"),
      withAgents: n("with"),
      tasks: n("task"),
    };
  }, [sectioned]);

  const sidebar = (
    <>
      {/* ══ 1 · SEARCH ══════════════════════════════════════════════════════════════════════ */}
      <div className="abl">
        <input className="tl-search" type="search" value={view.search}
          aria-label="Search agents or agencies"
          placeholder="Search agents or agencies"
          onChange={(e) => setView1("search", e.target.value)} />
      </div>

      {/* ══ 2 · WINDOW ══════════════════════════════════════════════════════════════════════
          ⚠️ THE PILL'S CENTRE IS THE LIVE RANGE, NOT THE WORD "WINDOW". Three buttons labelled
          ‹ TODAY › say what they do and never say where you are; the dates say both — and once
          they stop reading as today's window, the way back has to be offered rather than
          remembered, which is what the link below is for.
          ⚠️ AND IT APPEARS ONLY WHEN IT HAS SOMETHING TO UNDO. A permanent "Back to today" on a
          board already showing today is a control that does nothing, which teaches a reader to
          ignore it for the one moment it matters. */}
      <div className="abl">
        <div className="railnav">
          <button type="button" className="tl-btn" aria-label="Previous window"
            onClick={() => setWinStart((w) => shiftWindow(w, WEEK_STEP, -1))}>‹</button>
          <span className="wl">{windowRangeLabel}</span>
          <button type="button" className="tl-btn" aria-label="Next window"
            onClick={() => setWinStart((w) => shiftWindow(w, WEEK_STEP, 1))}>›</button>
        </div>
        {movedOffToday && (
          <button type="button" className="backtoday" onClick={() => setWinStart(today)}>
            Back to today
          </button>
        )}
      </div>

      {/* ══ 3 · VIEWS ═══════════════════════════════════════════════════════════════════════
          ⚠️ ONE LIST, SINGLE-SELECT, AND ITS COUNTS ARE A CENSUS. Every row states how many rows
          that class holds over the WHOLE board, so the numbers can be added up — a tally that
          changed as you clicked it is the fault the retired tab strip had. */}
      <div className="abl grow">
        <span className="slbl">Views</span>
        <button type="button" className={`gpill${secFilter === null ? " on" : ""}`}
          aria-pressed={secFilter === null} onClick={() => setSecFilter(null)}>
          <span>All</span>
          <b>{String(sectioned.reduce((n, g) => n + g.rows.length, 0)).padStart(2, "0")}</b>
        </button>
        {CAL_SECTION_DRAW.map((sec) => {
          const g = sectioned.find((x) => x.sec === sec);
          if (!g) return null;
          return (
            <button key={sec} type="button" className={`gpill${secFilter === sec ? " on" : ""}`}
              data-sec={sec} aria-pressed={secFilter === sec}
              onClick={() => setSecFilter((c) => (c === sec ? null : sec))}>
              <SectionIcon sec={sec} />
              {/* the VIEW's name — see `CAL_SECTION_VIEW`; the group bar uses `CAL_SECTION_LABEL` */}
              <span>{CAL_SECTION_VIEW[sec]}</span>
              <b>{String(g.rows.length).padStart(2, "0")}</b>
            </button>
          );
        })}
      </div>

      {/* ══ 4 · AT A GLANCE ═════════════════════════════════════════════════════════════════
          ⚠️ FOUR FIGURES, AND ONE OF THEM IS ROSE. They are derived from the same row set the
          views count, so the sidebar cannot state two different boards; "need you now" takes the
          rose because it is the only one of the four that is asking for something. */}
      <div className="sbx stats">
        <div className="sbh"><span className="t">At a glance</span></div>
        <div className="st">
          <div><b>{glance.open}</b><small>Open queries</small></div>
          <div className="r"><b>{glance.urgent}</b><small>Need you now</small></div>
          <div><b>{glance.withAgents}</b><small>With agents</small></div>
          <div><b>{glance.tasks}</b><small>Tasks</small></div>
        </div>
      </div>
    </>
  );

  /**
   * ⚠️ THE EMPTY STATES ARE TWO DIFFERENT FACTS AND MUST NOT SHARE COPY. "Nothing is asking for
   * you" is good news about a board full of live queries; "nothing here yet" is a board with no
   * queries at all. One sentence for both would tell a writer with twelve live submissions that
   * they have none.
   */
  const sparse = onlyAsks ? (
    <div className="tl-sparse">
      <h4>Nothing is asking for you</h4>
      <p>Every query is with an agent and no reminder has fallen due. The full board shows what is
        out and how far through each wait you are.</p>
    </div>
  ) : (
    <div className="tl-sparse">
      <h4>Nothing in this window</h4>
      <p>Queries you send, replies you log and dates you set will line up here.</p>
    </div>
  );

  /**
   * A row: name · action · timeline.
   *
   * ⚠️ THREE FLEX COLUMNS, NOT A GRID OF DAYS. The grid is what forced a 1-week range to exist,
   * and it is what could silently grow the board sideways when anything was auto-placed. Here the
   * timeline column is simply a positioning context and every piece is a percentage of it — so
   * gridlines, the weekend question and the phantom-column hazard all cease to exist rather than
   * being suppressed one rule at a time.
   */


  const row = (r: TimelineRow) => {
    const bar = barsByRow.get(r.key) ?? { segs: [], nodes: [] };
    /* ⚠️ THE ROW'S URGENCY, READ FROM THE SAME FLAGS THE SECTION FILED IT BY — never a second
       opinion. `owed` is a writer-owed date that has passed and `quiet` is an agency estimate that
       has, which are exactly the two arms of `calSectionOf`'s `isUrgent`. A row that is Urgent
       states one instruction, so its future flags are suppressed while it is. */
    const rowUrgent = bar.segs.some((sg) => sg.owed || sg.state === "quiet");
    const lanes = Math.max(1, r.lanes);
    return (
      <div
        key={r.key}
        className={`tl-rrow${r.closed ? " closed" : ""}`
          /* ⚠️ THE ROW IS OWED WHEN ANY CARD ON IT IS. A row can hold two relationships; the strip
             is a property of the ROW, so it asks whether the row has overdue work at all. */
          + ((barsByRow.get(r.key)?.segs ?? []).some((sg) => sg.owed) ? " owes" : "")}
        /* ⚠️ THE ROW PUBLISHES ITS OWN KEY AND ITS OWN IDENTITY, so a lock can assert the PAINTED
    order against the key the board actually sorted by, and can follow the same row across a
    mode change. Reading the order alone says the rows are in some order; reading the key
    alone says a key exists. */
data-rowkey={r.key}
/* the row's subject, per derivation — see `TimelineRow.subjects` */
        data-subj-deed={r.subjects.deed ?? undefined}
        data-subj-caption={r.subjects.caption ?? undefined}
        data-subj-sort={r.subjects.sort ?? undefined}
        /* ⚠️ THE SORT KEY, ON THE ROW. The lock asserts the PAINTED order against it — a seeded
           ordering case can pass while the live board is visibly out of order, and only comparing
           the two on one page can tell those apart. */
        data-pressing={r.pressingAt == null ? "none" : String(r.pressingAt)}
        /* ⚠️ THE TIER, FROM THE BOARD'S OWN GROUPING — so an ordering lock reads the tier the page
           sorted by rather than deriving a second opinion about what "closed" or "silent" means.
           Two derivations of a tier is how a painted order and a check about it come apart. */
        data-group={r.group ?? "none"}
        /* ⚠️ THE PAST'S WIDTH IS A ROW TOKEN, so the wash is one declaration in the sheet rather
           than an element per row. `null` where the window does not contain today — a window
           wholly ahead has no past to set back, and one wholly behind is all past, which
           `todayAt` already expresses as 0 or the full span. */
        style={{
          ["--lanes" as string]: String(lanes),
        } as React.CSSProperties}
      >
        {/**
          * ⚠️ v58: THE AGENT COLUMN IS GONE. The ref sets `--agent-w: 0` and hides `.ag` outright;
          * the identity moved INSIDE the card, where it travels with the wait it belongs to.
          *
          * ⚠️ AND ITS CONTROL WENT WITH IT, WHICH IS A REAL LOSS TO REPLACE. The name was a button
          * opening the relationship's workspace with nothing selected — the only route to a query
          * that has no card raised against it. The card itself is still clickable (`onPick`), so a
          * relationship WITH a card is still reachable; one with none is not. Flagged in the
          * report rather than papered over with a control the ref does not draw.
          */}
        <div className="tl-c-tl">
          {bar.segs.map((sg) => (
            <Piece key={sg.key} sg={sg} days={range.days} selected={sel === sg.key} name={r.name}
              /* ⚠️ FOUR PHASES, so no two cards on screen move together and the row does not read
                 as a wave. The index is the card's position in its row's own list. */
              stirIndex={bar.segs.indexOf(sg) % 4}
              /* ⚠️ THE LAST MARK ON THIS CARD, never the row's last. A row can hold two
                 relationships — two books with one agency — and each card must clear its own
                 marks and no others. */
              lastMarkAt={(() => {
                const on = bar.nodes.filter((n) => n.rowKey === sg.rowKey && n.lane === sg.lane
                  && n.at >= sg.from - 0.001 && n.at <= sg.to + 0.001);
                return on.length ? Math.max(...on.map((n) => n.at)) : null;
              })()}
              onPick={() => pickSeg(r.key, sg)}
              agency={r.agency}
              onOpen={sg.queryId
                ? () => onNavigatePath(`/queries?q=${encodeURIComponent(sg.queryId)}`)
                : undefined} />
          ))}
          {/**
            * ⚠️ THE ACTION CAP IS A LANE CHILD, CENTRED ON ITS OWN DATE — not a child of the card.
            *
            * It names the deed that becomes available ON that day, so it belongs at the date
            * rather than at the card's edge: the two coincide today and would part the moment a
            * card is clipped. The card's own end carries the terminal MARK instead, which is a
            * child of the card for exactly the opposite reason — it is about the edge.
            *
            * The pair is emitted from one test in `journeyBars`, so a cap can never appear without
            * its mark.
            */}
          {/* ⚠️ ONE INSTRUCTION PER ROW (v60c, standing). An Urgent row shows its urgent flag and
              nothing else: a row reading "6 weeks overdue" beside "Nudge · from 19 Sept" states
              two moves at once, and the reader has to work out which is being asked of them —
              which is the opposite of what a flag is for. Measured before the ruling: two rows
              carried both. Both facts survive in the hover record, which is where a row's whole
              story belongs; what the board states is the one thing to do next. */}
          {bar.segs.filter((sg) => sg.capWord && !rowUrgent).map((sg) => (
            <div key={`cap-${sg.key}`}
              className={`tl-cap${sg.capMine ? " mine" : ""}`}
              data-cap={sg.capSource}
              data-caprel={`${sg.rowKey}::${sg.lane}`}
              /* ⚠️ THE CAP IS PLACED FROM THE CARD'S OWN GEOMETRY, NOT FROM A SECOND SUM.
                 It read `pct(sg.to)` while the card is drawn at `--l` wide `--w` — the same date
                 by two routes, and they disagreed by a constant 362.6px (thirty days) on every cap
                 on the board. `calc(var(--l) + var(--w))` IS the card's right edge, so the cap
                 stands on the day the card ends however that end is computed. */
              style={{ ...laneVar(sg.lane),
                ["--l" as string]: barLeft(sg),
                ["--w" as string]: barWidth(sg),
                /* ⚠️ `min()` AND NOTHING ELSE (Law 6). The flag stands to the RIGHT of the bar's
                   end, and clamps so one near the lane's edge folds inward rather than leaving it.
                   No element is measured: a wrong lane width once piled every flag at one x. */
                left: "min(calc(var(--l) + var(--w) + 16px), calc(100% - 206px))" }}>
              <span className="g" aria-hidden />
              <span className="w">{sg.capWord}</span>
              <span className="d">{sg.capOn}</span>
            </div>
          ))}
          {/**
            * ⚠️ THE URGENT FLAG STANDS AT TODAY, NOT AT THE DATE THAT PASSED.
            *
            * The date is behind the reader; what the flag says is that the debt is live NOW, so it
            * belongs on the day being looked at. The card's own second line still carries the date
            * and the span, so nothing is lost by moving the flag off it.
            *
            * ⚠️ AND IT IS ONE PER ROW, NOT ONE PER SEGMENT. A row can hold several late stretches;
            * three identical pink flags stacked on one column would say the same thing three times.
            * The first owed segment carries it and the rest are silent.
            */}
          {(() => {
            const late = bar.segs.find((sg) => sg.owed || sg.state === "quiet");
            if (!late || todayAt == null) return null;
            const p = pillText(late.status, holderOf(late), late.nudgeDue, !!late.owed,
              late.state === "ghost", late.state === "quiet");
            const parts = barLines(late.label);
            /* ⚠️ THE MONO LINE MUST NOT RESTATE THE DEED. A reminder that has come round carries no
               date of its own, so its fact is the words "nudge due" — and the flag then read
               "Nudge due" over "NUDGE DUE", the same sentence twice in two typefaces. Where the
               lateness clause says nothing the deed has not already said, the flag falls back to
               the row's own opening clause, which is a date. */
            const same = (a: string, b: string) =>
              a.trim().toLowerCase() === b.trim().toLowerCase();
            const l2 = parts.t2 && !same(parts.t2, p.text) ? parts.t2 : parts.t1;
            if (!l2) return null;
            return (
              <div className="tl-cap mine od" key={`od-${late.key}`} data-odflag={p.text}
                style={{ ...laneVar(late.lane),
                  left: `min(calc(${pct(todayAt)} + 18px), calc(100% - 236px))` }}>
                <span className="fh" aria-hidden />
                <span className="fb">
                  <span className="w">{p.text}</span>
                  <span className="d">{l2}</span>
                </span>
              </div>
            );
          })()}
          {/**
            * ⚠️ THE LEAD-IN: MARKS BEFORE THE CARD, NEVER ON IT (v54, Phase 3).
            *
            * A card is the current wait, so every earlier status change is history — and history
            * drawn ON the card is what forced the text to dodge it. Twelve distinct text insets
            * across the board came from exactly that, and no two rows started their sentence in
            * the same place.
            *
            * A mark whose date falls inside a card is dropped rather than moved. It is not lost:
            * a clock inside the current wait IS "quiet for N days" and a bang IS the deed, both of
            * which the card already states. Drawing it as well says one thing twice and puts it
            * where the words are.
            */}
          {/**
            * ⚠️ THE GHOST RINGS: a named date past the card's end, drawn as a place rather than a
            * thing. Dotted while it is still ahead; solid with a badge once it has arrived, which
            * is the one moment it stops being a forecast and starts being a deed.
            *
            * ⚠️ IT CLEARS THE CARD BY CONSTRUCTION, not by a tuned offset: it is only emitted for
            * a date PAST the card's end, and it is centred on that date, so the gap is whatever
            * the dates are. A ring nudged clear of a card it overlaps would be stating a day it is
            * not drawn on.
            */}
          {(() => {
            const cardStart = new Map<string, number>();
            for (const sg of bar.segs) {
              const k = `${sg.rowKey}::${sg.lane}`;
              cardStart.set(k, Math.min(cardStart.get(k) ?? Infinity, sg.from));
            }
            const lead = bar.nodes.filter((n) => {
              const st = cardStart.get(`${n.rowKey}::${n.lane}`);
              return st == null || n.at < st - 0.001;
            });
            const byLane = new Map<number, { first: number; to: number }>();
            for (const n of lead) {
              const st = cardStart.get(`${n.rowKey}::${n.lane}`);
              if (st == null) continue;
              const cur = byLane.get(n.lane);
              byLane.set(n.lane, { first: Math.min(cur?.first ?? Infinity, n.at), to: st });
            }
            return (
              <>
                {/* the dotted run from the first mark to the card's leading edge */}
                {[...byLane.entries()].map(([lane, r2]) => (
                  <div key={`li-${lane}`} className="tl-leadin" aria-hidden
                    style={{ left: pct(r2.first), width: pct(Math.max(0, r2.to - r2.first)),
                      ...laneVar(lane) }} />
                ))}
                {/* ══ PAST STAGES (v60, Phase 4) ═══════════════════════════════════════════
                    ⚠️ ONE CARD PER PRIOR WAIT, AND A STAGE IS THE GAP BETWEEN TWO EVENTS. A node
                    records the moment a query MOVED; what the reader wants is the stretch between
                    two of them, and what happened at its end. So the stages are the consecutive
                    pairs, with the last running to the current card's own start.

                    ⚠️ THE ANATOMY IS THE CURRENT CARD'S, AT REDUCED SCALE AND SETTLED — a dotted
                    outline, no lift, its own StatusDot at very low opacity. Not the live card
                    faded: a past stage is a different KIND of thing, and drawing it as a dimmed
                    present tense is what makes a board's history read as unfinished work.

                    ⚠️ AND THE GAP AT EACH END CLEARS THE BADGE. A stage card is inset by the
                    badge's own overhang plus a gap, so consecutive stages do not run their
                    medallions into each other's words — the ref's `G + MED`. */}
                {(() => {
                  const byL = new Map<number, BarNode[]>();
                  for (const n of lead) {
                    const l = byL.get(n.lane);
                    if (l) l.push(n); else byL.set(n.lane, [n]);
                  }
                  const out: React.ReactNode[] = [];
                  for (const [lane, ns] of byL) {
                    const sorted = [...ns].sort((a, b) => a.at - b.at);
                    const stop = cardStart.get(`${sorted[0].rowKey}::${lane}`);
                    if (stop == null) continue;
                    for (let i = 0; i < sorted.length; i++) {
                      const a = sorted[i];
                      const b = sorted[i + 1];
                      const from = a.at;
                      const to = b ? b.at : stop;
                      /* ⚠️ TOO NARROW TO HOLD A CARD IS NOT DRAWN, AND THE REF'S OWN THRESHOLD IS
                         TOO LOW. It skips a stage under 1.5% of the lane — 1.35 days at this
                         window — while subtracting a gap of `badge + clearance` from the width. A
                         two-day stage therefore rendered as a 2px dotted sliver with a 54px badge
                         hanging off it: measured, two of the three stages on this board.

                         ⚠️ THE GATE IS IN DAYS, NOT PIXELS, BECAUSE NOTHING HERE MAY MEASURE THE
                         LANE (Law 6). The arithmetic: the gap is `--badge * 0.79 + 12px` ≈ 58px,
                         and at the narrowest width this board supports (1280, lane ≈ 930px over a
                         90-day window) a day is ≈ 10.3px — so the gap alone is ≈ 5.6 days and a
                         card needs roughly that again for its words. `STAGE_MIN_DAYS` is 12.

                         ⚠️ NOTHING IS LOST BY SKIPPING ONE. The node's own marker still stands on
                         its date and its caption still reaches the hover record; what is dropped is
                         a CARD too small to carry either. */
                      if (to - from < STAGE_MIN_DAYS) continue;
                      /* ⚠️ A NARROW STAGE DROPS ITS BADGE RATHER THAN BEING DROPPED (v61). v60c
                         skipped everything under twelve days because a 54px medallion could not fit
                         beside words in a short card; the badge is 30px and INSIDE the card now, and
                         the ref gives a second threshold below which it comes off entirely and the
                         text starts at the card's own inset. So the gate comes down and two stages
                         this account holds are drawn where v60c dropped them. */
                      const narrow = to - from < STAGE_NARROW_DAYS;
                      const stage = a.status ? String(a.status) : a.caption;
                      const end: StageEnd = !b
                        ? "out"
                        : b.dir === "in" ? "in" : b.dir === "close" ? "none" : "out";
                      out.push(
                        <div key={`js-${a.key}`} className={`tl-jc${narrow ? " narrow" : ""}`} style={{
                          left: pct(from),
                          width: `max(0px, calc(${pct(to - from)} - var(--tl-jc-gap)))`,
                          ...laneVar(lane),
                        }}>
                          <span className="tl-jmed" aria-hidden>
                            <StatusDot status={a.status ?? QueryStatus.QUERIED}
                              overrideSize={STAGE_BADGE_PX} />
                          </span>
                          <span className="tl-jbody">
                            <span className="tl-js">{stage}</span>
                            <span className="tl-jd">{stageSentence({
                              stage, end, next: b?.status ? String(b.status) : undefined,
                              days: Math.round(to - from),
                            })}</span>
                          </span>
                        </div>,
                      );
                    }
                  }
                  return out;
                })()}
                {lead.map((n) => (
                  <Marker key={n.key} n={n} selected={sel === n.key}
                    onPick={() => setSel((c) => (c === n.key ? null : n.key))} />
                ))}
              </>
            );
          })()}
          {r.items.map((it) => (
            <button
              key={it.key}
              type="button"
              /* ⚠️ A GHOST SAYS ITS OWN NAME. It is the ORIGIN mark — "this fell due here and is
                 still outstanding" — and it was rendering identically to the live chip beside it:
                 same solid border, same white ground, same opacity, same text. A correct pair of
                 marks read as one task drawn twice. The grid era distinguished them and the
                 Porcelain rebuild dropped the treatment without replacing it. */
              className={`tl-at2 tl-tchip${it.kind === "ghost" ? " ghost" : ""}${it.struck ? " struck" : ""}${it.draggable && it.card?.userTaskId ? " grab" : ""}${sel === it.key ? " sel" : ""}`}
              style={{ left: `calc(${pct(it.idx)} + var(--tl-gap))`, ...laneVar(it.lane) }}
              data-tip={it.label}
              draggable={!!(it.draggable && it.card?.userTaskId)}
              onDragStart={it.draggable && it.card?.userTaskId ? (e) => {
                /* the payload rides the event for protocol correctness — the STATE is what the
                   drop reads; dataTransfer is write-only in dragover */
                e.dataTransfer.setData("text/plain", it.card!.userTaskId!);
                e.dataTransfer.effectAllowed = "move";
                setDragTask({ id: it.card!.userTaskId!, from: it.ymd });
              } : undefined}
              onDragEnd={endDrag}
              onClick={() => pick(r.key, it)}
            >
              {/**
                * ⚠️ A TASK IS A POINT, NOT A PILL (v54, Phase 7). A pill is the shape this board
                * uses for whose-move-it-is on a CARD — a state that persists over a span. A task
                * happens on a day: an outlined mark at that day, its name beside it, and the day
                * itself in mono underneath. Wearing the pill's shape made a task look like a
                * fifth kind of card, and it carried no duration to justify one.
                */}
              <span className="tl-tmk" aria-hidden />
              {/**
                * ⚠️ A ROLLED TASK'S GHOST IS A BOX AND NOTHING ELSE (v58, per the ref's `taskHTML`).
                *
                * It marks the date the task was ORIGINALLY due; the live mark at its current date
                * is where the words belong. Rendering the label on both put two copies of the same
                * sentence a few pixels apart — measured on the deployed board as
                * "Reread the O'Rourk|ages before Thursday", which reads as garbled text rather than
                * as two elements, and was reported as a data-mapping bug for that reason.
                *
                * ⚠️ THE MECHANISM WAS OVERLAP, NOT ENCODING. Both labels are correct strings; the
                * ghost's simply sat under the live one. Nothing is wrong with the data.
                */}
              {it.kind !== "ghost" && (
              <span className="tl-twords">
                <span className="tl-tname">{it.label}</span>
                {/* ⚠️ THE DAY IT FALLS ON, FROM THE ITEM'S OWN DATE — never a duration. A task
                    happens on a day; "3 days" would be a span, which is what a card states and a
                    task does not have. */}
                <span className="tl-tdue">{shortCalDate(it.ymd)}</span>
              </span>
              )}
              {/* the forward mark: this is where it fell due, and the live one is over there */}
              {/* ⚠️ A GHOST IS A BOX AND NOTHING ELSE (v58, the ref's `taskHTML`). The arrow said
                  "this moved" a second time — the dashed box already says it, and the live mark at
                  the current date says where it moved TO. A third statement of one fact, and the
                  one that made a bare ghost read as a tiny piece of text. */}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const workRowNameFor = (rowKey: string) => rows.find((r) => r.key === rowKey)?.name ?? "";

  /* ── the focus band: what a selection says, full width and nothing truncated ─────────────── */
  const facts: { k: string; v: string }[] = [];
  let head: React.ReactNode = null;
  let ctx = "";
  let acts: React.ReactNode = null;
  if (selSeg) {
    const sg = selSeg;
    const who = workRowNameFor(sg.rowKey);
    /* ⚠️ "Your move" / "Their move" ARE THE CODE'S WORDS. `sideOf` is what the app calls whose
       turn it is; a writer calls it being asked for something, or waiting to hear.
       ⚠️ AND IT IS NOT THE OBVIOUS REWORD EITHER. That phrase is a RETIRED To-do family name,
       renamed to AGENT WAITING, and `todoWorkbench.test.ts` greps every file under `src/` for it —
       so the rename is app-wide rather than To-do-local, and a calendar drawer is inside `src/`
       like anything else. It caught the reword within one run, and then caught the COMMENT that
       explained the catch: that lock reads raw file contents and does not strip comments, which
       is why this note describes the phrase instead of quoting it. (Its own needle is split in
       two "so this lock never matches itself" — the author knew.) */
    head = <>{sg.side === "yours" ? "With you" : "Waiting to hear"}{who && <> — <em>{who}</em></>}</>;
    /* ⚠️ THE HOLLOW STRETCH IS WHAT THE HATCH USED TO SAY. A piece past its named end is time the
       writer has held past the date somebody stated — drawn as an outline, and named here only
       because a focus band is prose rather than drawing. */
    ctx = sg.hollow ? "This has run past the date that was named for it." : sg.label;
    if (sg.count) facts.push({ k: "Duration", v: sg.count });
    facts.push({ k: "With", v: sg.side === "yours" ? "You" : "The agent" });
    acts = <button type="button" className="tl-btn" onClick={() => onNavigatePath(`/queries?q=${encodeURIComponent(sg.queryId)}`)}>Open query ›</button>;
  } else if (selNode) {
    const n = selNode;
    const who = workRowNameFor(n.rowKey);
    head = <>{n.caption}{who && <> — <em>{who}</em></>}</>;
    ctx = "";
    acts = <button type="button" className="tl-btn" onClick={() => onNavigatePath(`/queries?q=${encodeURIComponent(n.queryId)}`)}>Open query ›</button>;
  } else if (selItem) {
    const { it, row } = selItem;
    head = <>{it.label}{row.key !== YOU_ROW && <> — <em>{row.name}</em></>}</>;
    ctx = it.kind === "ghost"
      ? "Fell due here · the live item is on today."
      : it.rolledFrom ? carriedLine(it.rolledFrom, today) : "";
    if (it.rolledFrom) facts.push({ k: "Since", v: shortCalDate(it.rolledFrom) });
    facts.push({ k: "Kind", v: FILTER_LABEL[it.kind] });
    acts = (
      <>
        {it.card && (
          <button type="button" className="tl-btn primary"
            onClick={() => openWork(row.key, it.ymd, it.key, it.card)}>Open the task</button>
        )}
        {it.kind === "ghost" && (
          <button type="button" className="tl-btn" onClick={() => setSel(null)}>Go to the task</button>
        )}
        {it.queryId && (
          <button type="button" className="tl-btn"
            onClick={() => onNavigatePath(`/queries?q=${encodeURIComponent(it.queryId!)}`)}>Open query ›</button>
        )}
      </>
    );
  }

  const focusBand = (selSeg || selNode || selItem) && (
    <div className="tl-below">
      <div className="tl-fx">
        <div className="tl-fxmain">
          <span className="tl-lbl2">In focus</span>
          <h3 className="tl-fxh">{head}</h3>
          {ctx && <p className="tl-fxctx">{ctx}</p>}
          {facts.length > 0 && (
            <div className="tl-facts">
              {facts.map((f) => (
                <div key={f.k} className="tl-fact"><div className="k">{f.k}</div><div className="v">{f.v}</div></div>
              ))}
            </div>
          )}
        </div>
        <div className="tl-acts">{acts}</div>
      </div>
    </div>
  );

  /* ── the collapsed day column: the week's whole cast, all but one dimmed ─────────────────── */
  const collapsed = work && (
    <div className="tl-col">
      <div className="tl-colhd">
        <span className="tl-lbl2">Everyone</span>
        <span className="tl-coldt">
          {DOW[new Date(`${work.ymd}T12:00:00`).getDay()]} {Number(work.ymd.slice(8))}
        </span>
      </div>
      <div className="tl-colbd">
        {rows.map((r) => {
          const its = r.items.filter((i) => i.ymd === work.ymd);
          const i = visible.indexOf(work.ymd);
          const bs = (barsByRow.get(r.key)?.segs ?? []).filter((sg) => i + 0.5 >= sg.from && i + 0.5 <= sg.to);
          const on = r.key === work.rowKey;
          return (
            <button key={r.key} type="button" className={`tl-crow${on ? " on" : " off"}`}
              aria-current={on || undefined}
              onClick={() => openWork(r.key, work.ymd, null)}>
              <span className="tl-cwho">
                <span className="tl-cn">
                  <i className="tl-sd" data-dot={r.dot} aria-hidden />
                  <span className="tl-nmtxt">{r.name}</span>
                </span>
                {r.agency && <span className="tl-ag">{r.agency}</span>}
                {its.length + bs.length === 0 ? (
                  <span className="tl-cempty">nothing today</span>
                ) : (
                  <span className="tl-cits">
                    {bs.map((sg) => <span key={sg.key} className="tl-mini" data-kind={sg.side === "yours" ? "turn" : "wait"}>{sg.label || sg.count}</span>)}
                    {its.map((i) => <span key={i.key} className="tl-mini" data-kind={i.kind}>{i.label}</span>)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ── the workspace: do, read, know ───────────────────────────────────────────────────────── */
  const know: { k: string; v: string }[] = [];
  if (workQuery) {
    know.push({ k: "Status", v: workQuery.status });
    /* ⚠️ "Reply window" WAS THE KEY HERE and it is the code's phrase, not a writer's. The bar's
       own words are what this row shows, so it names them rather than a derivation. */
    know.push({
      k: "Waiting until",
      v: workSeg ? workSeg.label || "No date resolvable" : "No date resolvable",
    });
    const mats = (workQuery.materialsWanted ?? []).map(formatQueryMaterial).filter(Boolean);
    if (mats.length) know.push({ k: "Materials", v: mats.join(", ") });
    if (workQuery.personalisationNotes) know.push({ k: "Your note", v: workQuery.personalisationNotes });
  }
  if (workAgent) know.push({ k: "Agency", v: agentSecondary(workAgent) || agentPrimary(workAgent) });

  const workspace = work && workRow && (
    <div className="tl-ws">
      <div className="tl-wshd">
        <span className="tl-lbl2">
          {workQuery ? `${getPrimaryAction(workQuery.status).ballHolder === "writer" ? "With you" : "Waiting to hear"} · ` : ""}
          {workRow.name}
        </span>
        <button type="button" className="tl-btn" onClick={() => { setWork(null); setPaneCard(null); }}>
          Esc · back to the week
        </button>
      </div>
      <div className="tl-wsbd">
        <div className="tl-two">
          {/* DO — the same pane `/todo` draws, driven by the same session hook and writing through
              the same committer. It is the point of the whole stream: one task workflow, wherever
              you meet a task. */}
          <div className="tl-do" ref={paneRef}>
            {paneSession.journey
              ? <TaskPane journey={paneSession.journey} onPrimary={paneSession.onPrimary} />
              : <div className="tl-readbd">Nothing to do on this relationship just now.</div>}
          </div>
          {/* READ — the Query Centre's OWN rows, off the authoritative subcollection */}
          <div className="tl-read">
            <div className="tl-readhd">
              <span className="tl-lbl2">The whole conversation</span>
              {workQueryId && (
                <button type="button" className="tl-btn"
                  onClick={() => onNavigatePath(`/queries?q=${encodeURIComponent(workQueryId)}`)}>
                  Open in Query Centre →
                </button>
              )}
            </div>
            <div className="tl-readbd">
              {convoRows.length > 0
                ? <TimelineRows rows={convoRows} />
                : <span className="tl-cempty">Nothing logged yet</span>}
            </div>
          </div>
          {/* KNOW — facts, each omitting itself when there is nothing to state */}
          <div className="tl-know">
            {know.map((b) => (
              <div key={b.k} className="tl-box"><div className="k">{b.k}</div><div className="v">{b.v}</div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="t-f12 spine-root cal-timeline" ref={pageRef}>
      <div className="tdb-wrap today-off">
        <TasksPageLayout
          title="Calendar"
          mark="calendar"
          tools={
            /* ⚠️ EMPTY (v61). Every control that lived here — the tabs, the pager, Display,
               search, the count and Add — is in the sidebar now. A tools row above a board that
               needs all its width was five controls competing with the thing they control, and
               the page read as a strip of chrome over a stack of panels. `TplTools` still
               renders the row's structure; what it holds is nothing, deliberately, rather than
               the prop being dropped and the page's header losing its slot. */
            <></>
          }
        >
          {/* ⚠️ ONE STATE OR THE OTHER, NEVER BOTH ON SCREEN. Acting collapses the board to a day's
              column and gives the rest of the page to the work; the full board and its focus band
              are what the week looks like when nothing is being worked. */}
          {work ? (
            <div className="tl-split">
              {collapsed}
              {workspace}
            </div>
          ) : (
          <>
          {/* ══ ONE CALENDAR (v61) ═══════════════════════════════════════════════════════════
              ⚠️ THE CONTROLS SIT BESIDE THE BOARD, NOT ABOVE IT. v60's tools row put the tabs, the
              pager, Display, search and the count on one line above six framed sections — five
              controls competing for width with a board that needed all of it, and a page that read
              as a stack of panels sharing a date scale. A sidebar gives the controls a column of
              their own and lets the calendar be one object.

              ⚠️ AND THE GROUP LIST IS THE FILTER. The tab strip is gone: it named four cuts of the
              board while the board itself was divided into six groups, so a reader had two
              vocabularies for one question. The list names the groups that exist, with their
              counts, and All. */}
          {/* ══ ONE CONTAINER, TWO PANES (v63) ═══════════════════════════════════════════════
              ⚠️ THE SIDEBAR MOVES INSIDE THE FRAME. v61 put it beside the container as a separate
              column on the page ground; v63 makes it the container's left PANE — the vertical axis
              of one instrument rather than a control strip standing next to one. The chrome then
              has something to be: the pane, the date bar and the group bars share a tone, and the
              ground below the date bar is one surface behind everything. */}
          <div className="tl-page">
          {/* ⚠️ `tl-board` STAYS ON THE CONTAINER, AND IT IS NOT DECORATION. Every token this board
              reads — `--row-h`, `--badge`, the six section tones, every colour — is declared on
              `.tl-board`, scoped there deliberately so a shell refactor cannot inherit a calendar
              colour. Replacing the element with `.tl-cal` took all of them with it: `calc()` on an
              undefined custom property yields nothing and the whole declaration is dropped, so the
              rows collapsed to fifteen pixels and the cards piled on each other, silently, through
              a clean build and a clean typecheck. The container is BOTH — `tl-cal` frames it,
              `tl-board` declares what is inside it. */}
          <div className="tl-cal tl-board">
            <aside className="tl-axis" aria-label="Calendar controls">{sidebar}</aside>
            <div className="tl-boardpane">
            {/* ══ THE BOARD TOOLBAR (v63, section C) ═══════════════════════════════════════════
                ⚠️ IT ASKS A DIFFERENT QUESTION FROM THE SIDEBAR AND SITS IN A DIFFERENT PANE.
                The sidebar's views choose WHICH rows; this chooses how the survivors are grouped,
                ordered and narrowed. Both can be set at once without either being a second copy of
                the other — which is why this row states its OWN count: the sidebar's numbers are a
                census of the whole board and this one is how many are actually drawn. Two numbers,
                two questions, and the second one is named so they cannot be confused. */}
            {board.length > 0 && (
              <div className="tl-vtool">
                <TbMenu label="Group rows by" open={tbOpen === "group"}
                  onOpen={(v) => setTbOpen(v ? "group" : null)}
                  trigger={<><span className="tl-tbk">Group</span>{GROUP_BY_LABEL[groupBy]}</>}>
                  {GROUP_BY_ORDER.map((g) => (
                    <TbOpt key={g} mark="tick" on={g === groupBy}
                      onClick={() => { setGroupBy(g); setTbOpen(null); }}>{GROUP_BY_LABEL[g]}</TbOpt>
                  ))}
                </TbMenu>

                <TbMenu label="Sort rows by" open={tbOpen === "sort"}
                  onOpen={(v) => setTbOpen(v ? "sort" : null)}
                  trigger={<><span className="tl-tbk">Sort</span>{SORT_BY_LABEL[sortBy]}</>}>
                  {SORT_BY_ORDER.map((k) => (
                    <TbOpt key={k} mark="tick" on={k === sortBy}
                      onClick={() => { setSortBy(k); setTbOpen(null); }}>{SORT_BY_LABEL[k]}</TbOpt>
                  ))}
                  {/* ⚠️ THE DIRECTION IS A CHECKBOX BESIDE THE KEYS, NOT A FIFTH KEY. It applies to
                      whichever key is on, so listing it as an option would make it exclusive with
                      the thing it modifies. */}
                  <div className="tl-ddfoot">
                    <TbOpt mark="box" on={sortRev} onClick={() => setSortRev((v) => !v)}>
                      Reverse order
                    </TbOpt>
                  </div>
                  <div className="tl-ddfoot">
                    <button type="button" className="tl-ddlink"
                      onClick={() => { setSortBy("urgency"); setSortRev(false); setTbOpen(null); }}>
                      Reset sort
                    </button>
                  </div>
                </TbMenu>

                <TbMenu label="Filter by status" open={tbOpen === "status"}
                  onOpen={(v) => setTbOpen(v ? "status" : null)}
                  trigger={<>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                    Status
                    {/* the badge counts what is TICKED, and is absent at zero rather than reading 0 */}
                    {statusPick.length > 0 && <span className="tl-tbbadge">{statusPick.length}</span>}
                  </>}>
                  {/* ⚠️ TEN OPTIONS, IN THE APP'S OWN NAMES — a deviation from the ref, recorded.
                      The ref lists nine: it abbreviates `Revise & Resubmit` to `R&R` and folds
                      `Rejected` and `Withdrawn` into one `Closed`. Both are a mockup's convenience.
                      Folding two statuses into one option makes them unfilterable apart, and this
                      app's own law is that a `QueryStatus` is written and read as its exact enum
                      string — a filter naming `R&R` names a status the data does not contain. */}
                  {STATUS_LADDER.map((st) => (
                    <TbOpt key={st} mark="box" on={statusPick.includes(st)}
                      onClick={() => setStatusPick((cur) =>
                        cur.includes(st) ? cur.filter((x) => x !== st) : [...cur, st])}>
                      {st}
                    </TbOpt>
                  ))}
                  {statusPick.length > 0 && (
                    <div className="tl-ddfoot">
                      <button type="button" className="tl-ddlink" onClick={() => setStatusPick([])}>
                        Clear all
                      </button>
                    </div>
                  )}
                </TbMenu>

                {/* ⚠️ `Clear all` IS PRESENT ONLY WHEN IT HAS SOMETHING TO CLEAR — the same rule
                    `Back to today` follows. A control that is always there and usually does nothing
                    teaches a reader to ignore it for the one moment it matters. */}
                {anythingApplied({ view: secFilter, statuses: statusPick }) && (
                  <button type="button" className="tl-tbclear"
                    onClick={() => { setSecFilter(null); setStatusPick([]); }}>
                    Clear all
                  </button>
                )}
                <span className="tl-tbcnt">{drawnCount} {drawnCount === 1 ? "row" : "rows"}</span>
              </div>
            )}
            <TplZone className="tl-zone" hem={false} label={range.label}>
              <div
                className="tl tl-wrap"
                ref={wrapRef}
                style={{ "--tl-days": range.days } as React.CSSProperties}
                onMouseMove={onLaneMove}
                onMouseLeave={clearCross}
              >
                {/* ══ THE RAIL ═══════════════════════════════════════════════════════════════
                    ⚠️ IT USES THE SAME THREE COLUMNS AS EVERY ROW, and that is the whole of the
                    alignment guarantee. `.tl-c-nm` takes the same width token
                    a row does, so the rail's timeline column BEGINS where every lane begins — and
                    a tick placed at `pct(d)` of it lands on the same pixel as a bar placed at
                    `pct(d)` of a lane. One column source, one expression, no second arithmetic to
                    drift. The today line's own 346px error came from having a second one. */}
                {board.length > 0 && (
                  <div className="tl-rail">
                    {/* ⚠️ v58: NO AGENT CELL IN THE RAIL EITHER. It was the only thing still
                        holding the column open — the rows had already lost theirs, so the lane sat
                        293px in from the board's edge with nothing beside it. */}
                                       <div className="tl-c-tl tl-railtl">
                      {/* ══ THE MONTH SHELF, WHICH ONLY APPEARS WHERE IT SAYS SOMETHING ══════
                          ⚠️ THREE MONTHS IS THE THRESHOLD, AND IT IS COUNTED FROM THE WINDOW
                          RATHER THAN THE RANGE. At one month the window straddles two calendar
                          months, so the shelf drew two labels and a single divider over a span
                          that is almost entirely one month — and that lone divider reads as a
                          stray mark on the rule rather than as a boundary between two things. The
                          nine date labels already carry that range. `months` IS the list of
                          calendar months the window touches, so its own length is the span: no
                          second derivation, and it stays right if the ranges are ever retuned. */}
                      {/* ⚠️ THE MONTH TIER IS UNCONDITIONAL NOW. It was gated at three months
                          because a lone divider on a one-month window reads as a stray mark; the
                          window is fixed at ninety days, so it always spans three or four and the
                          gate can never fire. A condition that cannot be false is a claim nobody
                          can check — the label is the rail's top tier and it is always drawn.
                          ⚠️ AND THE DIVIDER ELEMENT IS GONE: the separator is a `border-left` on
                          the LABEL, so it exists only in the rail and cannot run down through the
                          rows. v62 states that twice — `.col.m { display: none }` as well. */}
                      {months.map((m) => (
                        <React.Fragment key={m.key}>
                          <span
                            className={`tl-mlab${m.current ? " now" : ""}${m.past ? " gone" : ""}`}
                            style={{ left: pct(m.labelAt) }}
                          >{m.label}</span>
                        </React.Fragment>
                      ))}
                      {/* the ticks and their days */}
                      {/* ══ WEEK TILES (v60's `data-rail="tiles"`) ═════════════════════════════
                          ⚠️ THE TICK IS GONE WITH THEM. v60 sets `.wktick { display: none }` under
                          tiles: a tile is already a mark standing on its own date, and a tick
                          beneath it is a second, thinner claim about the same pixel. The date is
                          `data-at` on the tile itself so the alignment lock still has something to
                          read. */}
                      {dateLabels.map((d) => (
                        /* ⚠️ A PLAIN DAY NUMERAL, AND TODAY IS A FILLED CIRCLE (v62). The tile —
                           a bordered card on every week — put thirteen objects on a scale that only
                           needs to be legible, competing with the cards beneath them. The numeral
                           carries the date and the circle carries today, which is the only colour
                           the rail is allowed. */
                        <span key={d.ymd}
                          className={`tl-dt${d.now ? " now" : ""}`}
                          style={{ left: pct(d.at) }} data-at={d.at}>
                          {d.day}
                        </span>
                      ))}
                      {todayAt != null && (
                        <>
                          {/* ⚠️ THE STEM UNDER THE TODAY CIRCLE IS GONE (v63). It was a tick
                              rising from the rail's baseline to meet a today CAP that no longer
                              exists — the filled circle IS the mark now, and a tick beneath a
                              numeral inside its own disc is a second pointer at a date the disc
                              already names. */}
                          <span className="tl-todaychip" style={{ left: pct(todayAt) }}>{shortCalDate(today)}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {/* ══ THE ROWS REGION — THE ONE THING ON THIS BOARD THAT SCROLLS (v60, Law 4) ══
                    ⚠️ THE RAIL IS ITS SIBLING, NOT ITS ANCESTOR, and that is the whole of the law.
                    v58 pinned the rail with `position: sticky` INSIDE the scroller, which pins by
                    clamping — so on a board with nothing to scroll the clamp is the only behaviour
                    left, and anything that changed the rail's height moved the rows under it. Here
                    the rail is outside the scrolling box and cannot be reached by it at all. */}
                <div className="tl-rows">
                {board.length === 0 ? sparse : (
                  /* ══ SIX SECTIONS, EACH A CONTAINER (v60) ═══════════════════════════════════
                     ⚠️ THE SECTION REPLACES BOTH EARLIER SHAPES — v58's single bare list and the
                     grouped heading-over-loose-rows before it. A heading on the ground above its
                     rows cannot tell a reader four rows down which section they are in; a tinted
                     container running the height of the section answers it without a word. */
                  drawnGroups.map((g) => (
                    <div className="tl-grp" key={g.key} data-sec={g.tone ?? undefined}>
                      {/* ⚠️ A DIVIDER, NOT A HEADER (v61). A hairline across the container with a
                          tinted pill sitting ON it — icon, name and a zero-padded count. The count
                          is here because a pill is small enough to hold one; the v60 header spanned
                          the width and could not state a number without competing with the row it
                          introduced.
                          ⚠️ AND UNDER `No grouping` THERE IS NO DIVIDER AT ALL (v63). A heading
                          reading "everything" over every row on the board is a line of chrome that
                          states nothing — the same silence-wins rule an empty section follows. */}
                      {g.label !== "" && (
                        <div className="tl-gdiv">
                          <span className="gp">
                            {/* ⚠️ THE MARK COMES FROM WHAT THE GROUP IS. A section group draws its
                                own icon; a status group draws the app's own `StatusDot`, which is
                                the one way a status is ever drawn here; a group that is neither
                                draws nothing rather than borrowing a mark that would claim it. */}
                            {g.status != null
                              ? <StatusDot status={g.status} overrideSize={13} />
                              : g.tone != null ? <SectionIcon sec={g.tone} /> : null}
                            <span>{g.label}</span>
                            <b>{String(g.rows.length).padStart(2, "0")}</b>
                          </span>
                          {/* what the group is FOR — absent where there is nothing true to say */}
                          {g.purpose && <span className="geb">{g.purpose}</span>}
                        </div>
                      )}
                      <div className="tl-gwrap">
                        {/* ⚠️ THE NUMBER COLUMN IS A SIBLING OF THE LANES, NOT A CELL IN EACH ROW.
                            One element per row, at exactly `--row-h`, so the numbers line up with
                            the rows by sharing the row token rather than by being inside them —
                            which is what lets a two-lane row grow without the number drifting. */}
                        <div className="tl-gnums" aria-hidden>
                          {g.rows.map((r) => (
                            <div className="tl-gnum" key={r.key}
                              style={{ ["--lanes" as string]: String(Math.max(1, r.lanes)) } as React.CSSProperties}>
                              <span>{String(rowNumber.get(r.key) ?? 0).padStart(2, "0")}</span>
                            </div>
                          ))}
                        </div>
                        <div className="tl-glanes">{g.rows.map(row)}</div>
                      </div>
                    </div>
                  ))
                )}
                </div>
                {/* ⚠️ THE OLD GROUPED BLOCK AND THE BARE ONE LIST ARE BOTH DELETED, NOT LEFT
                    BEHIND A FALSE GUARD. v60's sections replace them; a replacement that is
                    ADDED leaves the original reachable, and this repo has paid for that three
                    times in one build. `board` still feeds the tab counts and the manuscript
                    cut, which is why the derivation survives and only its render is gone. */}
                {/* ⚠️ TODAY, THE CROSSHAIR AND THE ONE TOOLTIP ARE ALL CHILDREN OF THE WRAP, never
                    of a lane — a lane clips, and a clipping ancestor beats any z-index. */}
                {todayAt != null && (
                  <>
                    <div className="tl-todayline" style={{ left: todayLeft }} aria-hidden />
                    <div className="tl-todayflag" style={{ left: todayLeft }} aria-hidden>
                      {shortCalDate(today)}
                    </div>
                  </>
                )}
                {cross && (
                  <>
                    <div className="tl-xh" style={{ left: `${cross.x}px` }} aria-hidden />
                    <div className="tl-xhlab" style={{ left: `${cross.x}px` }} aria-hidden>{cross.label}</div>
                  </>
                )}
                <div ref={tipRef} className="tl-tipp" role="tooltip" aria-hidden />
              </div>
            </TplZone>
            </div>
          </div>
          </div>
          {focusBand}
          </>
          )}
        </TasksPageLayout>
      </div>

      {toast && (
        <div className="tdb-toast" role="status" onMouseEnter={pause} onMouseLeave={resume}>
          {toast.msg}
          {toast.action && (
            <button type="button" className="tdb-toast-act" onClick={() => { void toast.action!.fn(); dismiss(); }}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}

      {confirmAskNode}

      {flowCard && (
        <div className="cal-flow">
        <FocusFlow
          items={[{ kind: "card", card: flowCard }]}
          onClose={() => setFlowCard(null)}
          /* the receipts and their Undo are whatever the shared hook already produces, which is the
             only way this page and `/todo` can be relied on to say the same thing */
          onNavigate={onNavigate}
          onToast={flash}
          quickDone={quickDone}
        />
        </div>
      )}
    </div>
  );
};
