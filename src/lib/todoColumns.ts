/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoColumns — the board's four columns (workspace pack, Phase 4).
 *
 * ⚠️ EVERY COLUMN IS A STATE THE APP ALREADY OWNS. There is NO stored placement — no
 * board-position field, no column id on a card, nothing written when a card moves. A card is in
 * "Today" because its `committedDate` is today, in "Snoozed" because a flag says so, in "Done"
 * because it was completed today. Move it and you change that fact; the column follows.
 *
 * This matters more than it sounds. The moment a board stores where a card sits, it becomes a
 * SECOND system that has to agree with the first, and the first thing that happens is a card
 * completed from the Queries Hub stays sitting in "To do" because nothing told the board. The
 * "Doing" column from the earlier explorations is dead for exactly this reason: it was the only
 * one that could not be derived from anything.
 *
 * ⚠️ THE INVARIANTS ARE THE POINT (audit item 10). Today column == the Today page == the sidebar
 * count's Today component; Snoozed column == the Snoozed list; Done column == today's log. These
 * are the same derivations rendered twice over, and the tests assert the equality so the board
 * cannot quietly drift into a second answer.
 */

import { BoardCard, AssembledBoard, derivedCopy, assembleBoard, BoardInput } from "./todoBoard";
import { groupHousekeeping, HkGroup } from "./todoHousekeeping";
import { TaskFlag, Query, Agent, Manuscript, UserTask, Task } from "../types";
import { flagSleeps, flagReturnedToday, flagMatchesTask } from "./taskFlags";
import { USER_TASK_FLAG_TYPE } from "./todoBoard";
import { agentPrimary, agentInitials } from "./agentDisplay";
import { cardFamily } from "./todoFamily";
import { TODO_PREFS_DEFAULT } from "./todoPrefs";

export type TodoColumnId = "todo" | "today" | "snoozed" | "done";

/**
 * ⚠️ THE BAND'S FAMILY — colour says WHAT KIND OF THING this is, and it is the same vocabulary
 * the lanes, the FILTERS rows and the group swatches use.
 *
 * THE CAUSE OF THE REGRESSION, named: the family map was never lost — it was never CARRIED. The
 * old card grammar has it (`.tdb-band.do/.hk/.nt` in todo.css). When the board was built in Phase
 * 4 its band rule was written FRESH from the one card the ref happened to draw, which was an
 * urgent one, so one family's tint was encoded as the band's only tint. Nothing overwrote
 * anything; a distinction simply never made the journey. Hence the lock below is on the MAP
 * rather than on any single colour: a map cannot be half-copied without failing.
 */
/* ⚠️ SUPERSEDED IN PLACE (board fixes II, P4): the classification moved to src/lib/todoFamily.ts
   — this file's copy keyed on `c.hk`, the housekeeping GLYPH flag, which derivedCopy sets FALSE
   for STALE cards, so STALE rendered urgent pink while the counting law filed it under
   housekeeping. `bandFamily` survives as a delegating re-export because half the board's
   consumers and locks reach it by this name; the map itself now has one home. */
export { cardFamily as bandFamily } from "./todoFamily";
export type { BandFamily } from "./todoFamily";

export interface TodoColumnDef {
  id: TodoColumnId;
  label: string;
  /** What a drop onto this column MEANS — the existing verb, named. */
  dropVerb: string;
  /** The label the drop zone wears while a card is over it (the copy register). */
  dropLabel: string;
}

export const TODO_COLUMNS: TodoColumnDef[] = [
  { id: "todo", label: "To do", dropVerb: "return", dropLabel: "DROP TO PUT IT BACK" },
  { id: "today", label: "Today", dropVerb: "commit", dropLabel: "DROP TO ADD TO TODAY'S LIST" },
  { id: "snoozed", label: "Snoozed", dropVerb: "snooze", dropLabel: "DROP TO CHOOSE A RETURN DATE" },
  { id: "done", label: "Done", dropVerb: "complete", dropLabel: "DROP TO MARK IT DONE" },
];

export interface ColumnInput {
  board: AssembledBoard;
  /** The FULL flags — the Snoozed column is built from them, so it needs their shape. */
  flags: TaskFlag[];
  /* ⚠️ FULL queries now (tasks-pages P2): the Snoozed rebuild speaks the card's ORIGINAL title
     through derivedCopy, which reads the query's status and dates — a Pick could not carry them
     and the column was reduced to the "{name} — put away" template this widening retires. */
  queries: Query[];
  agents: Agent[];
  manuscripts?: Manuscript[];
  /** The raw user-task collection — a SNOOZED user task is filtered out of the board before
   *  assembly, so its text can only come from here. */
  userTasks?: UserTask[];
  /** The housekeeping rule groups, already built by the page, as sweep cards. */
  sweeps: { card: SweepCard; memberKeys: string[] }[];
  today: string;
  nowMs: number;
}

/**
 * ⚠️ NOTES NEVER RENDER ON THE BOARD (audit item 2). A note has no date, so it cannot be
 * snoozed; it has no tick, so it cannot be done. Three of the four columns are meaningless for
 * it, and a card that can only ever sit in one column is not a board citizen — it is a note, and
 * the Noteboard is where it belongs. My own mock once put one in Snoozed, which is how the rule
 * got written.
 */
export function boardEligible(cards: BoardCard[]): BoardCard[] {
  return cards.filter((c) => c.nature !== "note");
}

/**
 * ⚠️ THE SNOOZED COLUMN IS BUILT FROM THE FLAGS, NOT FROM THE LANES — and this is the whole fix.
 *
 * THE BUG: the column used to look for lane cards whose record matched a sleeping flag. It could
 * never find one. The task engine (db.tsx) filters a snoozed derived task OUT of `tasks` BEFORE
 * the board is assembled, and `assembleBoard` does the same for snoozed user cards. By the time
 * a column sees the board, everything snoozed has already gone. So the column rendered 0 while
 * the LISTS row and the chip strip — which count the FLAGS — said 1.
 *
 * Two sources for one fact, and the one the column used was structurally incapable of answering.
 *
 * THE FIX: the flags are the source, for the count AND the column. A sleeping flag names its own
 * record (`queryId`/`agentId`) and its `taskType`, which is enough to rebuild the card it is
 * hiding. Nothing here is stored; it is the same read, projected for display.
 */
export interface SnoozedInput {
  flags: TaskFlag[];
  queries: Query[];
  agents: Agent[];
  manuscripts?: Manuscript[];
  userTasks?: UserTask[];
  nowMs: number;
}

/* (SNOOZED_KIND is RETIRED — tasks-pages P2, walk fix 3. It restated each card's facet on a
   sleeping card whose band now says what matters while it sleeps: SNOOZED · BACK {date}. The
   TITLE carries the work's identity, rebuilt through derivedCopy — never a template.) */

/** "Back 12 Aug" — a snoozed card's right-hand slot states when it returns, which is the only
 *  fact about it that matters while it is asleep. */
export function backOnLabel(snoozedUntilIso: string): string {
  const d = new Date(snoozedUntilIso);
  if (Number.isNaN(d.getTime())) return "ASLEEP";
  return `BACK ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}`;
}

export function snoozedCards(input: SnoozedInput): BoardCard[] {
  return input.flags
    /* ⚠️ SLEEPING ONLY — the return boundary's choke (tasks-audit P1): a flag due back today is
       RETURNED and renders in the lanes, never here. AND NEVER OFFERS: an offer cannot be put
       away (the standing law offerGuard already enforces on drag) — its snooze flag is the
       "I need time" QUIET reminder, and the engine deliberately keeps the card on the board.
       This column picking those flags up is exactly how one offer rendered in two columns. */
    .filter((f) => flagSleeps(f, input.nowMs) && f.taskType !== "offer_received")
    .map((f) => {
      const q = f.queryId ? input.queries.find((x) => x.id === f.queryId) : undefined;
      const ag = input.agents.find((a) => a.id === (f.agentId ?? q?.agentId));
      const ms = q ? input.manuscripts?.find((m) => m.id === q.manuscriptId) : undefined;
      const who = ag ? agentPrimary(ag) : "";
      /* ⚠️ THE ORIGINAL TITLE, KEPT (tasks-pages P2, walk fix 3). "Tom Ellery — put away" told
         you who, not WHAT — the work's identity vanished the moment it slept. A user task keeps
         its own text; a derived card rebuilds its title through derivedCopy — THE title source,
         never a second template. The band carries the sleeping state: SNOOZED · BACK {date}. */
      const userTask = f.taskType === "user_task" && f.queryId
        ? input.userTasks?.find((t) => t.id === f.queryId)
        : undefined;
      /* ⚠️ THE KIND SURVIVES SNOOZING (tasks-audit P2). A bare "SNOOZED" band told you the
         card's state twice (the column already says it) and its nature never — the grammar is
         "{KIND} · 🕐 | BACK {date}": what it is, that it sleeps, when it returns. The kind comes
         from the SAME derivedCopy rebuild the title does — never a second map. */
      const copy = f.taskType === "user_task"
        ? { title: userTask?.text ?? "Task", kind: "YOUR TASK" }
        : (() => {
            const c = derivedCopy({ taskType: f.taskType, title: "", context: "" } as unknown as Task, q, ag, ms, input.nowMs);
            return { title: c.title, kind: c.kind || "SNOOZED" };
          })();
      return {
        key: `snz-${f.id}`,
        stream: "hk" as const,
        title: copy.title || (who ? who : "Snoozed"),
        who,
        subtitle: "",
        due: f.snoozedUntil ? backOnLabel(f.snoozedUntil) : "ASLEEP",
        kind: `${copy.kind} · 🕐`,
        warn: false,
        snoozes: f.snoozeCount ?? 0,
        hk: true,
        initials: ag ? agentInitials(ag) : "•",
        record: ag ? [agentPrimary(ag), ag.agency].filter(Boolean).join(" · ") : "",
        committed: false,
        done: false,
        taskType: f.taskType,
        relatedRecordId: f.queryId ?? f.agentId,
        ...(f.taskType === "user_task" && f.queryId ? { userTaskId: f.queryId } : {}),
      };
    });
}

/**
 * ⚠️ THE PARTITION MUST SUM, AND BATCH WORK IS WHY IT DID NOT.
 *
 * Housekeeping is COUNTED by gaps (`hkGapCount` = the number of members across the rule groups —
 * forty-one fixable things) but RENDERED as one card per rule group. So the badge said 42 while
 * the columns drew 27: fifteen members existed in the count and had no card. They were not
 * hidden behind a fold — there was nothing to unfold.
 *
 * The resolution is not to render fifteen more cards. A data-quality gap is not a task you do one
 * at a time; it is a sweep. So a group renders as ONE SWEEP CARD carrying its own n-of-m, and the
 * card ACCOUNTS FOR all of its members — which is what makes the sum work again. The card is the
 * unit on the board; the members are the unit in the count; the sweep card carries the bridge.
 */
export interface SweepCard extends BoardCard {
  /** How many members this one card stands for. The sum reads this, not 1. */
  sweepOf: number;
  /** The rule key, so the card can open the existing Batch-fix sheet. */
  sweepRule: string;
}

export function isSweepCard(c: BoardCard): c is SweepCard {
  return typeof (c as SweepCard).sweepOf === "number";
}

/** What one card ACCOUNTS FOR — 1 for an ordinary card, its member count for a sweep. */
export function cardWeight(c: BoardCard): number {
  return isSweepCard(c) ? c.sweepOf : 1;
}

/** The rendered weight of a column — the figure that must reconcile with the badge. */
export function columnWeight(cards: BoardCard[]): number {
  return cards.reduce((n, c) => n + cardWeight(c), 0);
}

/** Build the one card that stands for a whole rule group. */
export function sweepCardFor(
  rule: string,
  label: string,
  memberCount: number,
  memberKeys: string[]
): { card: SweepCard; memberKeys: string[] } {
  return {
    memberKeys,
    card: {
      key: `sweep-${rule}`,
      stream: "hk",
      title: `${memberCount} ${label.toLowerCase()}`,
      who: "",
      subtitle: "",
      due: `${memberCount} TO FIX`,
      kind: label.toUpperCase(),
      warn: false,
      snoozes: 0,
      hk: true,
      initials: "•",
      record: "Housekeeping",
      committed: false,
      done: false,
      taskType: "data_quality_poor",
      sweepOf: memberCount,
      sweepRule: rule,
    },
  };
}

export interface BoardColumns {
  todo: BoardCard[];
  today: BoardCard[];
  snoozed: BoardCard[];
  done: BoardCard[];
}

export function boardColumns(input: ColumnInput): BoardColumns {
  /* The SWEEP CARDS stand in for their groups' members. The grouped hk cards are removed from
     the flat lane set first, so a member is never both inside a sweep and loose on the board —
     that would double-count it and break the sum in the other direction. */
  const grouped = new Set(input.sweeps.flatMap((g) => g.memberKeys));
  const lanes = boardEligible(
    [...input.board.do, ...input.board.hk, ...input.board.nt].filter((c) => !grouped.has(c.key))
  );

  const today: BoardCard[] = [];
  const todo: BoardCard[] = [];

  /* ⚠️ THE RETURN CHIP (tasks-audit P1): a lane card whose flag came back TODAY says so, for
     this one day — a row that reappears with no explanation reads as a bug in a list you
     thought you had cleared. Derived from the flag's own expiry against the same clock. */
  const withReturn = (c: BoardCard): BoardCard => {
    const flag = input.flags.find((f) =>
      (c.userTaskId && flagMatchesTask(f, USER_TASK_FLAG_TYPE, c.userTaskId))
      || (!c.userTaskId && c.taskType && c.relatedRecordId && flagMatchesTask(f, c.taskType, c.relatedRecordId)));
    return flag && flagReturnedToday(flag, input.nowMs) ? { ...c, returnedToday: true } : c;
  };

  for (const raw of lanes) {
    const c = withReturn(raw);
    if (c.committedDate === input.today || c.surfaced) { today.push(c); continue; }
    todo.push(c);
  }
  // A sweep is never "today" or "done" — it is a standing pile, so it sits in To do.
  todo.push(...input.sweeps.map((g) => g.card));

  // ⚠️ Snoozed comes from the FLAGS (see snoozedCards) — the lanes cannot supply it, because
  // everything asleep has already been filtered out of them. This is the ONE source the LISTS
  // row and the chip strip also count.
  const snoozed = boardEligible(snoozedCards({
    flags: input.flags, queries: input.queries, agents: input.agents,
    manuscripts: input.manuscripts, userTasks: input.userTasks, nowMs: input.nowMs,
  }));

  // Done is today's log, projected — the SAME `cleared` union the Today page reads.
  return { todo, today, snoozed, done: boardEligible(input.board.cleared) };
}

/* ── the editorial board's pure fittings (board fixes II, P6) ─────────────────────────────── */

/** Today's WIP line — ADVICE, NEVER A BLOCK. Present from the first committed card; past five it
 *  changes tone rather than tightening a gate (the cap itself lives in the commit primitive). */
export function wipLine(committedCount: number, goodDay = TODO_PREFS_DEFAULT.goodDay): string | null {
  /* ⚠️ THE LINE READS THE WRITER'S OWN NUMBER (board-optimise P5). It was hardcoded 3–5, which
     made the Task-settings row a control over nothing. The default is the same 5 it always was,
     so nobody who never opens the sheet sees a change. Advice, never a block — past the number
     it changes TONE, and the commit primitive's cap is a separate thing entirely. */
  if (committedCount === 0) return null;
  return committedCount > goodDay ? "THAT'S A FULL DAY" : `A GOOD DAY IS ${goodDay}`;
}

/** A column shows this many cards before the fade hem and "+ N MORE" take over. */
export const BOARD_COL_CAP = 8;

/** The visible slice — pure, so the cap arithmetic is testable without a DOM. */
export function columnSlice(cards: BoardCard[], expanded: boolean): { visible: BoardCard[]; more: number } {
  if (expanded || cards.length <= BOARD_COL_CAP) return { visible: cards, more: 0 };
  return { visible: cards.slice(0, BOARD_COL_CAP), more: cards.length - BOARD_COL_CAP };
}

/**
 * ⚠️ THE ONE DERIVATION, ASSEMBLED ONCE (tasks-pages P2, walk fix 1). The sidebar badge said 42
 * while the page said 15 cards, and Today's FILTERS said 27/24 against the list's 15/12 — four
 * surfaces, three hand-assembled pipelines, two units. The badge was still on the member-unit
 * law; Today still fed its FILTERS the raw lanes. EVERY consumer now walks through here:
 * assemble → group housekeeping → sweeps → columns, identically scoped, and counts come off the
 * result (boardFigures / facetCounts over liveBoardCards). A count that wants to differ now has
 * to fork this function in plain sight.
 */
export interface AssembleColumnsInput extends Omit<BoardInput, "userTasks"> {
  userTasks: BoardInput["userTasks"];
  /** The composer's in-flight create — hidden until the write resolves (save-and-today P1). */
  hiddenUserTaskId?: string | null;
}

export function assembleBoardColumns(input: AssembleColumnsInput): {
  board: AssembledBoard; hkGroups: HkGroup[]; cols: BoardColumns;
} {
  const userTasks = input.hiddenUserTaskId
    ? input.userTasks.filter((t) => t.id !== input.hiddenUserTaskId)
    : input.userTasks;
  const board = assembleBoard({ ...input, userTasks });
  const hkGroups = groupHousekeeping(board.hk, input.agents, input.mutedTaskRules, input.queries);
  const sweeps = hkGroups.map((g) => sweepCardFor(g.rule, g.meta.label, g.members.length, g.members.map((m) => m.card.key)));
  const cols = boardColumns({
    board, flags: input.taskFlags, queries: input.queries, agents: input.agents,
    manuscripts: input.manuscripts, userTasks: input.userTasks, sweeps,
    today: input.today, nowMs: input.now,
  });
  return { board, hkGroups, cols };
}

/**
 * ⚠️ CARDS ARE THE UNIT (board fixes II, P5). The page's three figures — the subtitle, the
 * FILTERS' Everything, the column counts — used to come from THREE derivations in TWO units:
 * the subtitle and the facet counts tallied MEMBERS (every agent inside a sweep, counted loose),
 * while the columns drew collapsed sweep cards, so the header said 42, the panel said 27 and the
 * columns showed fourteen. One derivation now: whatever boardColumns renders is what everything
 * counts. A sweep is ONE card; its member figure appears only INSIDE the card, as n-of-m.
 *
 * Done stays OUTSIDE the live figures — it is the day's record, not work waiting on you.
 */
export function liveBoardCards(cols: BoardColumns): BoardCard[] {
  return [...cols.todo, ...cols.today, ...cols.snoozed];
}

export function boardFigures(cols: BoardColumns): { cards: number; urgent: number } {
  const live = liveBoardCards(cols);
  return { cards: live.length, urgent: live.filter((c) => cardFamily(c) === "urgent").length };
}

/** The header's one line, from the SAME figures. Numbers ≤ twelve read as words (the dashboard
 *  eyebrow's convention); the noun is CARDS, because that is what the columns show. */
/** Numbers ≤ twelve read as words (the dashboard eyebrow's convention) — exported so page copy
 *  never grows a second spelling table (tasks-pages P4: the Noteboard's subtitle reuses it). */
export function spellNumber(n: number): string {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  return n <= 12 ? words[n] : String(n);
}

export function boardSubtitleCopy(f: { cards: number; urgent: number }): string {
  if (f.cards === 0) return "Nothing waiting on you.";
  const urgent = f.urgent > 0 ? `, ${spellNumber(f.urgent)} urgent` : "";
  return `Everything waiting on you — ${spellNumber(f.cards)} card${f.cards === 1 ? "" : "s"}${urgent}.`;
}

/**
 * ⚠️ AN OFFER CANNOT BE PUT AWAY (the confirmed-consistent list). It has a reply-by window that
 * is not yours to move: it cannot be dismissed anywhere, and it cannot be snoozed beyond
 * tomorrow. The board honours the same guard the rows do rather than inventing its own.
 */
export function offerGuard(card: BoardCard, target: TodoColumnId): { allowed: boolean; why?: string } {
  if (card.taskType !== "offer_received") return { allowed: true };
  if (target === "snoozed") {
    return { allowed: false, why: "An offer has a reply-by date — it can wait until tomorrow, but not be put away." };
  }
  return { allowed: true };
}

/**
 * What a drag from one column to another MEANS. The board performs no writes of its own: every
 * move resolves to a verb the app already has, and the component calls that verb.
 *
 * ⚠️ SNOOZE IS POPOVER-GATED. Dropping on Snoozed does not snooze anything — it opens the date
 * popover, and the card moves only once a date is chosen. A drag that silently picked a date
 * would be the app deciding when you want to see something again.
 */
/**
 * ⚠️ THE VERB THAT ACTUALLY COMPLETES A DERIVED CARD.
 *
 * A derived task is not finished by being ticked — it is finished by the ACT it stands for. The
 * card is a reminder that the act is outstanding; ticking it would clear the reminder and leave
 * the work undone, and the query would still be sitting there waiting for a full nobody sent.
 * So a Done-drop on a derived card bounces, and the toast names the act rather than scolding.
 */
export function completionVerbPhrase(card: BoardCard): string {
  switch (card.taskType) {
    case "full_requested": return "Sending the full is what completes this — open the action";
    case "partial_requested": return "Sending the partial is what completes this — open the action";
    case "revise_resubmit": return "Resubmitting is what completes this — open the action";
    case "offer_received": return "Answering the offer is what completes this — open the action";
    case "nudge_overdue": return "Nudging them is what completes this — open the action";
    case "no_response_close": return "Closing the query is what completes this — open the action";
    case "data_quality_poor": return "Filling in the gap is what completes this — open the action";
    default: return "Doing the work is what completes this — open the action";
  }
}

export type DropPlan =
  | { kind: "commit" }            // → Today: the ＋Today verb
  | { kind: "uncommit" }          // out of Today: the same verb, reversed
  | { kind: "snooze-popover" }    // → Snoozed: OPENS the popover; the move waits for a date
  | { kind: "unsnooze" }          // out of Snoozed: return now
  | { kind: "complete" }          // → Done: the completion primitive + undo toast
  | { kind: "uncomplete" }        // out of Done: un-tick
  /** → Done on a DERIVED card: refuse, return it, and name the act that would finish it. */
  | { kind: "bounce"; why: string }
  | { kind: "none"; why?: string };

/**
 * ⚠️ THE ⋯ MENU SPEAKS VERBS, NEVER "MOVE TO X".
 *
 * "Move to Done" describes what happens to the CARD; it says nothing about what happens to the
 * query, the agent or the writer's afternoon. Worse, on a derived card it is a lie — the card
 * cannot move to Done, and offering the move only to bounce it is a menu that wastes your click
 * to teach you a rule. Each line names the act, and the ones that do not apply say why.
 */
/* ⚠️ `cardVerbs` / `CardVerb` ARE RETIRED (board fixes II, P1 — 6 Aug). The flat five-verb list
   became the grouped, per-kind, per-column `cardMenu` model in src/lib/todoMenu.ts: three intent
   groups (DO IT · PUT IT OFF · GO ELSEWHERE), tier submenus that reuse the fork's and the Later
   menu's own copy, and the whole-menu collapses (Done; sweeps lose GO ELSEWHERE). The one rule
   carried over verbatim: AN OFFER HAS NO DISMISS, ANYWHERE — the line renders disabled and says
   why, because its absence would read as an oversight. */

export function dropPlan(
  card: BoardCard,
  from: TodoColumnId,
  to: TodoColumnId
): DropPlan {
  if (from === to) return { kind: "none" };
  const guard = offerGuard(card, to);
  if (!guard.allowed) return { kind: "none", why: guard.why };

  switch (to) {
    case "today": return { kind: "commit" };
    case "snoozed": return { kind: "snooze-popover" };
    /* ⚠️ DONE ACCEPTS USER-TASK TICKS ONLY. A user task is a thing you wrote down, so ticking it
       IS the completion. A derived card stands for an act on a real record — sending, closing,
       replying — and ticking it would clear the reminder while leaving the work undone. */
    case "done":
      return card.userTaskId
        ? { kind: "complete" }
        : { kind: "bounce", why: completionVerbPhrase(card) };
    case "todo":
      // Leaving a column is that column's verb reversed — never a separate "move to backlog".
      if (from === "today") return { kind: "uncommit" };
      if (from === "snoozed") return { kind: "unsnooze" };
      if (from === "done") return { kind: "uncomplete" };
      return { kind: "none" };
  }
}
