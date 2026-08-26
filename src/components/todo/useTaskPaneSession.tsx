/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE TASK PANE'S SESSION, OWNED IN ONE PLACE (tasks-workflow, Pack B Phase 2) ═════════════
 *
 * ⚠️ THIS IS THE SEAM, AND ITS SHAPE CAME FROM GETTING IT WRONG TWICE. `TaskPane` is not a
 * mountable component — it is a VIEW over state its host owns — so "gathering inputs" was never
 * the abstraction. What moves is the SESSION: the four states behind the form, everything derived
 * from them, the gate, and the journey they build.
 *
 * ⚠️ IT BUILDS THE JOURNEY FROM `(card, data)` ALONE. Nothing here receives `boardCols`, `facts`,
 * `events` or `primaryLabel`. Pack A lifted the three shared derivations into `taskCardFacts`, and
 * Pack A2 finished the job by letting `figureFor` answer "is this card asleep?" itself, which is
 * what freed it from `pendingSaveId`. If a future change needs one of those passed in, a
 * derivation has drifted back onto the page — fix that rather than widening this signature.
 *
 * ⚠️ THE HOST KEEPS SEVEN CALLBACKS, EACH FOR A REASON A HOOK CANNOT ARGUE WITH: three open
 * surfaces the PAGE renders (`onSnooze`'s `AnchoredPanel`, `onDismiss`'s dialog, `openQuery`'s
 * navigation), one reaches the DOM (`jumpToSection`), one is the `offer`/`fix` hand-off to
 * `FocusFlow`, one is the commit family that writes and toasts, and one moves the dock cursor. A
 * hook cannot own a node it does not render, and it must not own navigation.
 *
 * ⚠️ THE BODIES BELOW MOVED VERBATIM from `ToDoPage`. Every comment came with its code, because the
 * reasoning is the expensive part — the ref-based seed reset, the zero-lead stutter, the gate's
 * revealed-but-empty date. Only the references changed: captured page scope became hook state, the
 * three lifted derivations became lib calls, and seven became host callbacks.
 */
import React from "react";
import { useScriptAllyDb } from "../../lib/db";
import { BoardCard } from "../../lib/todoBoard";
import { buildJourney } from "../../lib/taskPaneJourney";
import type { TaskPaneJourney } from "./TaskPane";
import { Agent, QueryStatus } from "../../types";
import { DockTimelineEvent } from "./timelineEvent";
import { useDockActivity } from "./useDockActivity";
import { dropSupersededProvisional, normalizeResultingStatus } from "../../lib/queryDerivation";
import { activityEventLabel } from "../../lib/activityEvent";
import { AgentDataNeed, agentDataQualityNeeds } from "../../lib/agentDataQuality";
import { JourneyKind } from "../../lib/paneJourney";
import {
  figureFor as libFigureFor,
  listRowInputs as libListRowInputs,
  recordSweepFor as libRecordSweepFor,
  isoOf,
} from "../../lib/taskCardFacts";
import { TaskPaneBody, SendBodyValues } from "./TaskPaneBody";
import { BulkFillTable } from "./BulkFillTable";
import { rowHasAnswer, type RecordSweepRow } from "../../lib/materialsSweep";
/* (`formatSampleSpecs` left with the strip's first sentence — the LEDGER states the parcel
   now, in the writer's own words, and the strip stating it too was the same fact twice.) */
import { materialRowsFromAgent, type MaterialRow } from "../../lib/agentMaterials";
import { formatQueryMaterials } from "../../lib/materials";
import { journeyKind, isBulkCard, anchorFor, requirementsOf, unansweredOf, firstMissingOf, type GateAnswers } from "../../lib/paneGate";
import {
  JOURNEYS, JOURNEY_DEED_BUCKET, journeyIdFor, flowFor, intentOf, crossoverOf, CROSSOVERS, crossoverReason,
  type JourneyId, type JourneyFlow,
} from "../../lib/journeys";
import { paneCommits, paneCommitValues } from "../../lib/paneCommit";
import { sendSpecFor, collapseTimelineDuplicates } from "../../lib/todoDock";
import { cardBucket, waitAnchorMs } from "../../lib/todoBuckets";
import { anchorNoun, bandForward, materialRows, materialName } from "../../lib/todoHandoff";
import { groupColumn } from "../../lib/todoGroups";
import { cardMenu } from "../../lib/todoMenu";
import { rowPrimaryLabel } from "../../lib/taskRow";
import { paneCopy } from "../../lib/taskListRow";
import { getStatusLabel } from "../StatusPill";
import { agentWindowMs } from "../../lib/expectedDate";
import { elapsedParts } from "../../lib/elapsed";
import { localYMD } from "../../lib/shellSidebar";

/**
 * ⚠️ MODULE-LEVEL AND TAKING `agents`, BECAUSE IT HAS TWO CONSUMERS AND MUST STAY ONE TABLE. The
 * pane's primary reads it here; `commitFromPane` reads it on the page, to decide whether a commit
 * belongs to an in-pane journey at all. A copy on each side is how the two would come to disagree
 * about which buckets have a journey — so it is one exported function and `agents` is an argument
 * rather than a closure. Bodies are otherwise verbatim from `ToDoPage`.
 */
/**
 * ⚠️ WHICH BUCKETS HAVE AN IN-PANE JOURNEY — declared here, one line each, and `undefined` for the
 * rest. A bucket without an entry keeps the takeover through `onPrimary`, which is what lets them
 * move one at a time rather than all at once on a surface nobody has walked.
 */
export function paneJourneyKind(card: BoardCard, agents: Agent[]): JourneyKind | undefined {
  /* ⚠️ THE `decide` BUCKET SPLITS BY TASK TYPE, and forcing one shape on both would be wrong in
     whichever direction it went. An OFFER is a branch — three different acts. An R&R is a SEND:
     `sendSpecFor` returns a spec for it, `recordMaterialsSent` performs it, and the only thing
     distinguishing it is a second pre-ticked row. One bucket, two journeys, because the bucket
     answers "how urgent" and the task type answers "what is this". */
  if (card.userTaskId) return "note";
  if (card.taskType === "offer_received") return "offer";
  if (card.taskType === "revise_resubmit") return "send";
  /* ⚠️ THE SINGLE RECORD GAP ONLY. The bulk card stands for a set and has no query behind it, so
     it has no band subject, no send date and no agent requirements to start from — a one-query
     form pointed at it would state facts about a record that does not exist. It keeps the
     hand-off until its own table lands. */
  if (card.taskType === "materials_unrecorded") return "materials";
  switch (cardBucket(card)) {
    case "send": return "send";
    case "chase": return "chase";
    case "close": return "close";
    /* ⚠️ `fix` EARNS THE PANE ONLY IF THERE IS SOMETHING TO ASK. Its stack is its gaps, so a card
       whose agent has since been filled in — or one with no agent to resolve — would render a
       journey of zero steps and a footer offering to save nothing. It falls back to the takeover,
       which is where grouped housekeeping still lives. */
    case "fix": return cardGaps(card, agents).length > 0 ? "fix" : undefined;
    /* note still opens the takeover for a grouped card */
    default: return undefined;
  }
}

/**
 * ⚠️ THE GAPS ARE THE CARD'S, NOT THE JOURNEY'S — read from the agent the card points at, through
 * the SAME `agentDataQualityNeeds` that raised it. A second derivation here is how the journey
 * would come to ask about a field the card was not raised for.
 */
export function cardGaps(card: BoardCard, agents: Agent[]): AgentDataNeed[] {
  const ag = card.relatedRecordId ? agents.find((a) => a.id === card.relatedRecordId) : undefined;
  return ag ? agentDataQualityNeeds(ag) : [];
}

/** The seven the page keeps — see the head note for why each one cannot be the hook's. */
export interface TaskPaneHost {
  jumpToSection: (id: string) => void;
  openFlow: (card: BoardCard) => void;
  commit: (card: BoardCard, values: ReturnType<typeof paneCommitValues>, bulkRows: RecordSweepRow[]) => Promise<boolean>;
  advance: (card: BoardCard) => void;
  /**
   * ⚠️ OPTIONAL, AND ABSENCE IS NOT THE SAME AS DISABLED. `TaskPane` renders these verbs only when
   * the callback is present — `{d.onSnooze && …}` — which is the grammar its own type states. A
   * host with no surface for them passes neither and the pane shows neither, rather than drawing a
   * dead control. The calendar is exactly that host: its snooze is DRAG, on the surface where days
   * are the subject, and it deliberately shows no dismissed cards at all.
   */
  onSnooze?: (el: HTMLElement) => void;
  onDismiss?: () => void;
  openQuery: (card: BoardCard) => void;
  /**
   * ⚠️ THE DEED'S TWO LINKS, AND THEY ARE THE HOST'S BECAUSE THEY ARE NAVIGATION (workspace round,
   * Phase 5). This hook's own head note already says it: a hook must not own navigation. Optional
   * for the same reason `onSnooze` is — a host with no route to a manuscript passes nothing and the
   * span renders as weight rather than as an anchor that goes nowhere.
   *
   * ⚠️ THEY TAKE AN ID, NOT A CARD. The card carries `msTitle` and no manuscript id, so resolving
   * which record the deed names is a lookup over `queries` — which is the SESSION's data, not the
   * page's. Handing the card over would put that lookup in every host.
   */
  openManuscript?: (manuscriptId: string) => void;
  openAgent?: (agentId: string) => void;
  /**
   * ⚠️ THE EXISTING SNOOZE PRIMITIVE, CALLED FROM THE FORK (journey round, Phase 3). Every "not yet"
   * intent — Send's *hold me to it*, Nudge's *give it longer*, Close's *leave it open*, a note's
   * *give it a date* — is this, not a new dated-task path. Storage, ceilings, chips, the slider's
   * own readout and the undo arm are all unchanged; only the WORDING is the journey's, which is why
   * it takes a label.
   *
   * It is the HOST's because it toasts and it owns the board cursor — the same reason `commit` is.
   */
  snooze?: (card: BoardCard, days: number, label: string) => void;
  /**
   * ⚠️ THE EXISTING PER-QUERY MUTE. Close's "Stop asking about this one" and the fill-in's "I can't
   * remember" both land here: it mutes THIS suggestion for THIS query, deletes nothing, and leaves
   * every other task on the query alone. `dismissTask(…, "permanent")` is the live writer.
   */
  mute?: (card: BoardCard) => void;
}

export interface TaskPaneSession {
  journey: TaskPaneJourney | null;
  onPrimary: () => void;
}

export function useTaskPaneSession(
  card: BoardCard | null,
  host: TaskPaneHost,
  /** this mount's section-id prefix — see `TaskPaneBody`'s `idPrefix` for why it exists */
  idPrefix = "",
): TaskPaneSession {
  const { queries, agents, manuscripts, userTasks, activities, taskFlags, currentUser } = useScriptAllyDb();
  const now = Date.now();
  /* ⚠️ ONE BUNDLE, memoised on the five arrays the lifted derivations read — the same shape the
     page uses, so neither can drift onto different data. */
  const taskData = React.useMemo(
    () => ({ queries, userTasks, activities, agents, manuscripts }),
    [queries, userTasks, activities, agents, manuscripts],
  );
  /* the three lifted derivations, bound to this render — Pack A and A2 made these callable here */
  const figureFor = (c: BoardCard) => libFigureFor(c, taskData, taskFlags, now);
  const listRowInputs = (c: BoardCard) => libListRowInputs(c, taskData);
  const recordSweepFor = (c: BoardCard) => libRecordSweepFor(c, taskData);

  /* ⚠️ THE DOCKED QUERY'S OWN ACTIVITY ROWS — the AUTHORITATIVE subcollection, which is what the
     Query Centre reads. The global `activities` feed the dock used before is a best-effort
     projection twin, and where the twin was never written Tracking rendered "Nothing logged yet."
     on a query with history. One card is docked at a time, so this is one listener. */
  const dockRows = useDockActivity(currentUser?.id, card?.relatedRecordId);

  /* ══ THE SESSION'S OWN STATE ══════════════════════════════════════════════════════════ */
  /**
   * ⚠️ HOW MANY BULK ROWS THE WRITER HAS TOUCHED — ONE SOURCE, three readers (the band's count, the
   * will-record strip and the primary's own label). Declared here in Phase 4 because the GATE needs
   * it; the table that moves it arrives in Phase 6. Zero until then, which is exactly what the
   * gate should say about a table nobody has filled in.
   */
  const [bulkTouched, setBulkTouched] = React.useState(0);
  /* ⚠️ THE BAR STATES WHAT IS OWED ONLY AFTER THE WRITER HAS ASKED. It is the answer to pressing
     the primary, not a standing complaint about an unfinished form — and it clears with the card. */
  const [showMissing, setShowMissing] = React.useState(false);
  /**
   * ⚠️ THE COHORT'S ROWS, HELD BY THE SESSION. Seeded from `recordSweepFor` — the SAME derivation the
   * card was raised by, never a second scan — and reset with the card, exactly as the send form's
   * answers are: a half-filled table carried onto another cohort is answers about other queries.
   */
  const [bulkRows, setBulkRows] = React.useState<RecordSweepRow[]>([]);
  /**
   * ⚠️ WHICH LEDGER ROW IS OPEN, AND `null` MEANS "FOLLOW THE FIRST UNANSWERED" (workspace round,
   * Phase 3). It is a session state rather than the body's for one reason: the GATE has to be able
   * to open a row. Pressing an incomplete primary opens the first unanswered question, and a body
   * that owned this would have to be reached into from here.
   *
   * ⚠️ `null` IS A MODE, NOT AN ABSENCE. Answering a question sets it back to `null`, so the open
   * row RE-DERIVES: the next unanswered, or none at all once the last is answered — which is what
   * "answering the last closes all" is, without a second rule saying so. `Edit` and the gate set an
   * explicit id, which is the only way an ANSWERED row can be the open one.
   */
  const [openId, setOpenId] = React.useState<string | null>(null);
  /**
   * ⚠️ WHICH OPTIONAL FIELDS ARE OPEN — session state for the same reason `openId` is: it resets
   * with the card. A flag left behind would put an empty box on the next task with nothing to
   * explain where it came from.
   */
  const [extras, setExtras] = React.useState({ alongside: false, also: false });
  /**
   * ⚠️ THE FORK'S STATE — WHICH INTENT, AND WHERE THE WRITER CAME FROM (journey round, Phase 2).
   *
   * `intentId` is `null` while the fork is showing: the pane opens on the DECISION, not on the
   * paperwork, and until one is chosen there is no verb to offer. `crossed` is the provenance of a
   * crossover — closing and nudging are each other's second thoughts — and it is what `Go back`
   * restores and what the close's REASON is read from.
   *
   * ⚠️ A SINGLE-OPTION FORK RESOLVES WITHOUT BEING DRAWN. `offer`, `agentgap` and `bulk` each
   * declare one intent, because the declaration must be TOTAL — every journey has a fork. A fork
   * with one option is not a choice, and drawing it would put a click in front of a hand-off and a
   * cohort table purely to honour a shape. The declaration stays whole; the renderer skips it.
   */
  const [intentId, setIntentId] = React.useState<string | null>(null);
  const [crossed, setCrossed] = React.useState<{ from: JourneyId; fromIntent: string; to: JourneyId } | null>(null);
  /* ⚠️ SET ONLY WHEN ANSWERS WERE ACTUALLY DISCARDED. A line saying "your answers were cleared" on a
     fork nobody had answered is the app narrating an event that did not happen. */
  const [clearedNote, setClearedNote] = React.useState(false);

  const seedRows = React.useCallback((card: BoardCard | null): MaterialRow[] => {
    const q = card?.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    const asked = materialRowsFromAgent(q?.materialsWanted as string[] | undefined);
    const ticked = asked.filter((r) => r.kind === "qty" && r.on);
    const keep = ticked.length ? [ticked[0]] : asked.filter((r) => r.kind === "qty").slice(0, 1);
    return keep.length
      ? keep
      : [{ key: "sample", kind: "qty", name: "Opening sample", on: false, unit: "Chapters", amount: "" }];
  }, [queries]);

  /**
   * ⚠️ THE AGENT'S STATED WINDOW IS SHOWN, NOT CHOSEN (finishing round, Phase 3). This used to SEED
   * the expectation — the nearest pill to the agency's own figure — which read as an answer the
   * writer had given and was recorded as one. It is the best information on file and the worst
   * possible default: pre-selecting it puts the agency's answer in the writer's mouth.
   *
   * It is now a quiet line beneath the pills, and this returns the FIGURE rather than a choice.
   * `null` where the record holds none — the line is then absent rather than reading "— weeks".
   */
  const statedWeeks = React.useCallback((card: BoardCard | null): number | null => {
    const q = card?.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    const ag = q ? agents.find((a) => a.id === q.agentId) : undefined;
    const w = ag?.responseTimeWeeks;
    return typeof w === "number" && w > 0 ? w : null;
  }, [queries, agents]);

  /* ⚠️ EVERY CHOICE STARTS UNCHOSEN. The count fields still seed on a unit choice — a starting
     number is not a decision — but nothing here is an answer until the writer gives one. */
  const BLANK: Omit<SendBodyValues, "rows"> =
    { alongside: "", when: null, expect: null, remind: null, also: "",
      hold: null, checkin: null, again: null, unitCommitted: false };
  const [paneBody, setPaneBody] = React.useState<SendBodyValues>(
    { rows: seedRows(null), ...BLANK });
  /* the answers reset with the card — a half-filled form carried onto another task is answers
     about the wrong query, which is the sweep's own rule applied to one card */
  /**
   * ⚠️ THE RESET KEYS ON THE CARD ALONE, AND THE SEEDS ARE READ THROUGH A REF (pane round, found by
   * measurement, not by reading).
   *
   * `seedRows` and `seedExpect` are `useCallback`s over `queries` and `agents` — arrays that arrive
   * new from a Firestore snapshot — so listing them as dependencies re-ran this effect on ordinary
   * re-renders and WIPED THE FORM UNDER THE WRITER. On the page it looked like a click that did
   * nothing: choose a unit, and the row count goes straight back to zero. No test could see it —
   * every unit assertion passes on a component that is re-mounted between them, and `tsc` asks for
   * exactly the dependency list that causes it.
   *
   * The ref keeps the effect honest without lying to the linter about what it reads: the card's key
   * is the only thing that should clear a half-filled form, because a form carried onto another
   * task is answers about the wrong query.
   */
  const seeds = React.useRef({ rows: seedRows, sweep: recordSweepFor });
  seeds.current = { rows: seedRows, sweep: recordSweepFor };
  React.useEffect(() => {
    setPaneBody({ rows: seeds.current.rows(card ?? null), ...BLANK });
    setShowMissing(false);
    const cohort = card ? seeds.current.sweep(card) : undefined;
    setBulkRows(cohort ?? []);
    setBulkTouched(0);
    /* back to following the first unanswered — an id pinned on the last card names a row this one
       may not even have */
    setOpenId(null);
    setExtras({ alongside: false, also: false });
    setIntentId(null);
    setCrossed(null);
    setClearedNote(false);
  }, [card?.key]);

  const paneFacts = React.useMemo(() => {
    if (!card) return [];
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    const ag = card.agentId ? agents.find((a) => a.id === card.agentId) : undefined;
    const f = figureFor(card);
    const anchorMs = waitAnchorMs(cardBucket(card), card.taskType, {
      dateSent: q?.dateSent,
      partialRequestedDate: q?.partialRequestedDate,
      fullRequestedDate: q?.fullRequestedDate,
      partialSentDate: q?.partialSentDate,
      fullSentDate: q?.fullSentDate,
      lastNudgeSentDate: q?.lastNudgeSentDate,
      lastReplyAt: isoOf(q?.responseReceivedAt),
      statusMovedAt: isoOf(q?.lastStatusChange),
      createdAt: card.userTaskId ? userTasks.find((t) => t.id === card.userTaskId)?.createdAt : undefined,
    });
    const longDay = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    const out: { k: string; v: string }[] = [];
    if (f.label && f.value) out.push({ k: f.label, v: `${f.value}${f.unit ? ` ${f.unit}` : ""}` });
    if (Number.isFinite(anchorMs)) out.push({ k: anchorNoun(card), v: longDay(anchorMs) });
    const fwd = bandForward(card, isoOf(q?.responseDeadline) ?? null, ag?.responseTimeWeeks ?? null,
      (iso) => longDay(new Date(iso).getTime()), !!ag);
    if (fwd) out.push({ k: fwd.k, v: fwd.v });
    return out;
  }, [card, queries, agents, userTasks]);

  /**
   * ⚠️ THE FORK'S DERIVATIONS SIT ABOVE `paneWill`, AND THAT IS LOAD-BEARING (journey round, found
   * by MEASUREMENT after `tsc` and 6,995 unit tests were all green).
   *
   * `paneWill` is a `const` whose IIFE runs AT ITS DECLARATION, and Phase 4 made it read
   * `activeFlow` and `closeReason` so the strip could say "Closed as withdrawn" rather than
   * asserting a silence. Those two were declared two hundred lines BELOW it — a temporal dead zone
   * the compiler cannot see through an immediately-invoked arrow, so it compiled clean and threw at
   * runtime: `ReferenceError: Cannot access 'Rr' before initialization`, inside `useTaskPaneSession`,
   * on every render with a docked card. The whole To-do page fell into its error boundary the
   * moment a task was opened.
   *
   * ⚠️ AND THE COMPILER-VISIBLE HALF OF THIS TRAP HAD ALREADY FIRED ONCE THIS ROUND — `closeReason`
   * reading `activeFlow` from the same scope was refused with TS2448, and I moved one declaration
   * and thought the shape was closed. It was not: the same read from inside an IIFE is invisible to
   * `tsc`, which is exactly what CLAUDE.md says about this bug and exactly how it shipped again.
   * The rule that actually holds is the ORDER, not the compiler: anything a render-time expression
   * reads is declared above it.
   */
  /* ══ THE FORK, DERIVED (journey round, Phase 2) ═════════════════════════════════════════════
     Everything below reads the declaration and the two pieces of state above; nothing branches on
     a task type, and nothing is stored. */

  /** which journey the pane is showing — the card's, unless a crossover swapped it */
  const activeId: JourneyId | null = !card ? null : (crossed?.to ?? journeyIdFor(card));

  /** the intent in force: the writer's choice, or the only one there is */
  const effectiveIntent: string | null = (() => {
    if (!activeId) return null;
    if (intentId) return intentId;
    const opts = JOURNEYS[activeId].fork.options;
    return opts.length === 1 ? opts[0].id : null;
  })();

  /** the verb a crossover arrives under, where the contract gives it one */
  const crossedPrimary: string | undefined =
    crossed ? CROSSOVERS[`${crossed.from}:${crossed.fromIntent}`]?.primary : undefined;

  /** the flow that intent opens — `null` while the fork is showing */
  const activeFlow: JourneyFlow | null =
    activeId && effectiveIntent ? flowFor(activeId, effectiveIntent) ?? null : null;

  /**
   * ⚠️ THE REASON THE CLOSE RECORDS, AND THE ORIGIN IS WHAT KNOWS IT. Arriving from the send fork's
   * "I'm not going to send it" is a WITHDRAWAL; arriving from the nudge fork's "time to close" is a
   * silence; arriving at the close task itself is a silence too. The writer is never asked to
   * categorise their own disappointment — the journey they came from already said.
   *
   * ⚠️ DECLARED BELOW `activeFlow`, WHICH IT READS. Written above it, `tsc` refused with TS2448 —
   * "used before its declaration" — because the reference shares the declaration's scope. That is
   * the one shape of this trap the compiler CAN see; the shape it cannot is the same read from a
   * hoisted helper, which is why this repo's rule is that initialisation goes at the end.
   */
  const closeReason: "no_reply" | "off_record" | "withdrawn" =
    (crossed ? crossoverReason(crossed.from, crossed.fromIntent) : undefined)
    ?? (activeFlow?.writes.kind === "close-query" ? activeFlow.writes.reason : "no_reply");


  /* what the primary will write, in the mockup's own `Will record:` grammar */
  /**
   * ⚠️ THE STRIP IS PROSE NOW (deed round, Phase 2). It was a mono field-string —
   * "PARTIAL SENT · FIRST 3 CHAPTERS · TODAY · REPLY EXPECTED ~1 OCT" — which is a database row
   * read aloud. A writer about to commit something wants to hear what they are committing in the
   * language they would use to describe it: "Your full — 3 chapters — sent 13 August. Reply
   * expected around 1 October; a nudge reminder lands here 24 September."
   *
   * ⚠️ EMPHASIS FALLS ON THE TWO FUTURE DATES AND NOTHING ELSE. They are the only parts a writer
   * will want to find again later; the rest is what they have just told the form. Bolding the
   * whole record would be emphasis meaning "this is a record", which every word here already is.
   *
   * ⚠️ AND THE DATES ARE RESOLVED, NOT ECHOED. "6 weeks" is what the writer picked; "1 October" is
   * what will be stored, and the strip's whole job is to say what will be stored. The arithmetic is
   * `agentWindowMs` in `expectedDate.ts` — the one place a window becomes a date — never a local
   * `setDate` loop, so the strip cannot come to disagree with the write.
   */
  const paneWill: React.ReactNode = !card ? "" : (() => {
    if (isBulkCard(card)) {
      return bulkTouched > 0
        ? <>materials on <b>{bulkTouched}</b> {bulkTouched === 1 ? "query" : "queries"}</>
        : "nothing yet";
    }
    if (card.userTaskId) return "Your note, ticked off today.";

    /**
     * ⚠️ A CLOSE IS NOT A SEND, AND THE STRIP WAS SAYING IT WAS (reminder round, found in the first
     * screenshot of this journey anyone has ever taken). Every non-note, non-bulk journey fell
     * through to the send grammar, so closing a query read "This records Sent 21 August." — a
     * sentence about an act that is not the one about to happen. It went unnoticed for four rounds
     * because the Close journey could not be rendered at all: the account had its rule muted.
     *
     * ⚠️ AND IT SAYS WHAT CLOSING MEANS, not just when. "No response" is the distinction the form's
     * own verbatim line spends a sentence on — closing is not a rejection — so the record's summary
     * should not quietly drop it.
     */
    /* ⚠️ THE STRIP SAYS WHICH CLOSE, AND IT READS THE JOURNEY RATHER THAN THE BUCKET (Phase 4).
       It said "Closed as no response" on every close, so a writer crossing from "I'm not going to
       send it" read a sentence about a silence over a withdrawal — the strip stating something the
       write would not do, on the one surface whose whole job is to say what the write will do.
       ⚠️ AND IT IS DRIVEN BY THE ACTIVE FLOW, NOT THE CARD. A crossover's card is still a send. */
    if (activeFlow?.writes.kind === "close-query") {
      const day = dayPartLong(paneBody.when);
      const word = closeReason === "withdrawn" ? "withdrawn"
        : closeReason === "off_record" ? "a pass off the record" : "no response";
      return day ? <>Closed as <b>{word}</b>, {day}.</> : "—";
    }

    const longDay = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    const sentIso = sentDateISO();

    /**
     * ⚠️ THE STRIP CARRIES ONLY THE CONSEQUENCES NOW (workspace round, Phase 6).
     *
     * It used to open with the parcel and the send date — "Your full — 3 chapters — sent 13
     * August." — which was the right sentence when the form showed those answers only as lit pills.
     * The LEDGER states them, three centimetres above, in the writer's own words. A strip that
     * repeats them is the same fact twice on one screen, and the reader has to check the two
     * against each other to find out that they agree.
     *
     * What is left is what the rows CANNOT show: the future. A window is an answer; the date it
     * resolves to is a consequence, and the consequence is what gets written.
     *
     * ⚠️ THE DATES ARE RESOLVED, NOT ECHOED, AND THE BRIEF'S OWN EXAMPLE ECHOES THEM. Its sentence
     * reads "reply expected around 6 weeks from then; a nudge reminder lands here the week before"
     * — which is the two ledger answers read back, and therefore fails the brief's own assertion
     * that no value appears in both places. It also contradicts the standing law that this strip
     * says what will be STORED: "6 weeks" is what the writer picked, "1 October" is what goes in
     * the record. Resolved wins, and the phrase goes rather than the date — the reason the phrase
     * used to travel WITH the date ("the week before, on 11 September") was that nothing else on
     * the page said which lead had been chosen. The ledger says it now.
     *
     * ⚠️ WHERE THE WRITER PICKS A DATE DIRECTLY the answer and the consequence coincide, and the
     * strip states it anyway. That is not a restatement: there is only one form of that fact, and
     * a strip that fell silent about the expected reply because the writer had typed it would be
     * describing a different write from the one about to happen.
     */
    const two: React.ReactNode[] = [];
    const e = paneBody.expect;
    let replyMs: number | null = null;
    if (e?.kind === "date" && e.ymd) replyMs = new Date(`${e.ymd}T12:00:00`).getTime();
    else if (e?.kind === "weeks" && sentIso) {
      replyMs = agentWindowMs(new Date(`${sentIso}T12:00:00`).getTime(), e.weeks);
    }
    if (replyMs != null) two.push(<>reply expected around <b>{longDay(replyMs)}</b></>);
    const r = paneBody.remind;
    if (r?.kind === "none") {
      /* ⚠️ AN EXPLICIT CHOICE READS AS ONE. "No reminder" is an answer the writer gave, so the
         sentence says it — omitting the clause would render the same string as never having asked. */
      two.push(<>no nudge reminder</>);
    } else if (r?.kind === "lead" && replyMs != null) {
      /**
       * ⚠️ A ZERO LEAD READS AS WORDS, NOT AS THE SAME DATE TWICE (write round, Phase 4). It said
       * "reply expected around 18 September; a nudge reminder lands here 18 September" — both
       * correct, and a stutter: the reader checks the two dates against each other, finds them
       * identical, and has to work out whether that is the point or a bug. It is the one case with
       * no date of its own to state, so it states the relation instead.
       */
      two.push(r.days === 0
        ? <>a nudge reminder lands here <b>on the day</b></>
        : <>a nudge reminder lands here <b>on {longDay(replyMs - r.days * 86400000)}</b></>);
    } else if (r?.kind === "date" && r.ymd) {
      /* a date the writer picked is stated as itself — it is not a lead off anything */
      two.push(<>a nudge reminder lands here <b>on {longDay(new Date(`${r.ymd}T12:00:00`).getTime())}</b></>);
    }

    if (!two.length) return "—";
    return <>
      {two.map((n, i) => <React.Fragment key={i}>{i > 0 ? "; " : ""}{n}</React.Fragment>)}
      .
    </>;
  })();

  /* (`leadPhrase` is DELETED with the clause it wrote — workspace round, Phase 6. It read the lead
     back in the writer's own words, which is exactly what the ledger's `Nudge reminder` row does
     three centimetres above the strip. Its only caller was that clause.) */

  /** the chosen day in words, for a strip that reads as a sentence — absent until it is chosen */
  function dayPartLong(w: SendBodyValues["when"]): string | null {
    if (!w) return null;
    if (w.kind === "today") return "today";
    if (w.kind === "yesterday") return "yesterday";
    return w.ymd
      ? `on ${new Date(`${w.ymd}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
      : null;
  }

  /** the day the send is dated from — the writer's own choice, and nothing when they have not said */
  function sentDateISO(): string | null {
    const w = paneBody.when;
    if (!w) return null;
    if (w.kind === "date") return w.ymd || null;
    const d = new Date();
    if (w.kind === "yesterday") d.setDate(d.getDate() - 1);
    return localYMD(d.getTime());
  }

  /** a note's created date, for the form's meta line — "18 Aug" */
  function noteAddedDate(c: BoardCard): string {
    const t = c.userTaskId ? userTasks.find((x) => x.id === c.userTaskId) : undefined;
    const iso = isoOf(t?.createdAt);
    return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
  }

  /* ⚠️ THE DAY, NOT THE INSTANT. Two rungs of one status seconds apart are the duplicate; two on
     different days are a re-request. `createdAt` is a Firestore Timestamp on these rows, not the
     ISO string the global feed carries — reading it as a string yields "Invalid Date" rather than
     an error, the same trap the `when` line below already documents. */
  /** "2 Apr" — the rung's day, for a line that states a fact rather than quotes a person. */
  function dayLabel(raw: any): string {
    const ms = raw?.toMillis ? raw.toMillis() : raw?.seconds ? raw.seconds * 1000 : Date.parse(String(raw ?? ""));
    return Number.isFinite(ms) ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
  }

  function dayKeyOf(raw: any): string {
    const ms = raw?.toMillis ? raw.toMillis() : raw?.seconds ? raw.seconds * 1000 : Date.parse(String(raw ?? ""));
    return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : "";
  }

  /**
   * ⚠️ WHAT THE AGENT ASKED FOR, IN THEIR OWN WORDS — the journey's reference block. It is the
   * newest incoming rung's own note, displayed verbatim and never parsed, with the anchor line the
   * card already derives. Absent where the record is silent: a "no request recorded" panel is a
   * heading over an absence.
   */
  function dockAsk(card: BoardCard): { fact?: string; meta?: string } | undefined {
    if (!card.relatedRecordId) return undefined;
    const rows = dockRows.filter((r) => {
      const st = normalizeResultingStatus(r.resultingStatus);
      return st === QueryStatus.PARTIAL_REQUESTED || st === QueryStatus.FULL_REQUESTED || st === QueryStatus.REVISE_RESUBMIT;
    });
    const last = rows[rows.length - 1];
    /* ⚠️ AND A PROVISIONAL RUNG'S NOTE IS THE IMPORT'S BOOKKEEPING, not the agency's words — the
       same rule Item 5 applied to the timeline's sub-line, for the same reason. */
    const note = last && last.dateProvisional !== true && last.note ? String(last.note) : undefined;
    /* ⚠️ THE DATE JOINS THE LINE, which is what makes it read as a fact rather than a sentence
       somebody uttered. The rung's own `createdAt`, through the same reader the timeline uses —
       a Firestore Timestamp on these rows, not the ISO string the global feed carries. */
    const when = last ? dayLabel(last.createdAt ?? last.date) : "";
    const fact = note ? (when ? `${note} · ${when}` : note) : undefined;
    const meta = card.record || undefined;
    return fact || meta ? { ...(fact ? { fact } : {}), ...(meta ? { meta } : {}) } : undefined;
  }

  /** and its age in words, for the band — the rail's own elapsed formatter, never a second one */
  function noteAgo(c: BoardCard): string {
    const d = listRowInputs(c).days;
    if (typeof d !== "number") return "";
    const p = elapsedParts(d);
    return `${p.figure} ${p.unit} ago`;
  }

  function dockTimeline(card: BoardCard): DockTimelineEvent[] {
    if (!card.relatedRecordId) return [];
    const q = queries.find((x) => x.id === card.relatedRecordId);
    const ag = q ? agents.find((a) => a.id === q.agentId) : undefined;
    /* ⚠️ §7b — THE SUPERSEDED PROVISIONAL RUNG IS DROPPED BEFORE ANYTHING ELSE. This surface is
       where the duplicate was SEEN: it does not dedupe by status, so an import's `OFFER` rung and
       the writer's later real one both drew, one above the other, the first reading
       "(imported — date needed)". Same predicate as the derivation and the Query Centre —
       `dropSupersededProvisional` — so the three cannot come to differ about which rung is real. */
    const live = dropSupersededProvisional(dockRows, (r) => ({
      status: r.resultingStatus ?? r.type,
      provisional: r.dateProvisional === true,
    }));
    /* ⚠️ ITEM 6 — AND THEN THE SAME-DAY PAIR. `dropSupersededProvisional` above handles an import
       rung superseded by a RECORDED one; it leaves a pair that is both provisional (or both real)
       exactly as it found it, which is the `Partial requested · via email` twice on one date.
       Keyed on (status, DAY), so a re-request on a different day survives — that is a real thing an
       agency does. Display only: both documents are still in Firestore. */
    const once = collapseTimelineDuplicates(live, (r) => ({
      status: r.resultingStatus ?? r.type,
      day: dayKeyOf(r.createdAt ?? r.date),
      provisional: r.dateProvisional === true,
    }));
    const kept = once
      /* ⚠️ `includeSend` — THIS SURFACE HAS NO HERO ROW. The Centre suppresses the send because it
         draws one above its timeline; the card does not, so without this the query going out was
         dropped and a full-requested card showed a single rung with no beginning. */
      .map((r, i) => ({ r, i, label: activityEventLabel(r as { activityType?: unknown; resultingStatus?: unknown }, { includeSend: true }) }))
      .filter((x) => x.label !== null);
    return kept
      .map((x) => {
        /* ⚠️ `createdAt` IS A FIRESTORE TIMESTAMP ON THESE ROWS, not the ISO string the global feed
           carries — reading it as a string yields "Invalid Date" rather than an error. */
        const raw: any = x.r.createdAt ?? x.r.date;
        const ms = raw?.toMillis ? raw.toMillis() : raw?.seconds ? raw.seconds * 1000 : Date.parse(String(raw ?? ""));
        return {
          key: x.r.id ?? `ev-${x.i}`,
          label: x.label as string,
          when: Number.isFinite(ms) ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "",
          /* absent where the record is silent — never inferred */
          ...(x.r.via ? { via: String(x.r.via) } : q?.sendMethod ? { via: `via ${String(q.sendMethod).toLowerCase()}` } : {}),
          /* ⚠️ ITEM 5 — A PROVISIONAL RUNG SHOWS THE EVENT AND NOTHING ELSE. The import writes its
             own bookkeeping into `note` — "Full Requested (imported — date needed)" — and the card
             rendered it as the agent's words. It is a message from the importer to itself.
             ⚠️ KEYED ON THE STORED FLAG, NEVER ON THE STRING. Matching "(imported" would be
             deriving state by reading a display string, which is the fault the whole record is
             built to avoid; `dateProvisional` is a real field and says exactly this.
             ⚠️ AND IT SUPPRESSES THE WHOLE SUB-LINE ON A PROVISIONAL RUNG, not just the
             parenthetical — a provisional rung's note is import-written by construction, and
             trimming the brackets off would leave "Full Requested" restating the label above it. */
          ...(x.r.note && x.r.dateProvisional !== true ? { note: String(x.r.note) } : {}),
          /* ⚠️ THE STATUS ITSELF, HANDED TO THE REAL `StatusDot`. It used to be a three-state ring
             derived here and painted by the card's own CSS; `StatusDot` is the app's one drawing of
             a query status and is never recreated locally. `resultingStatus ?? type` is the same
             pair `subcollectionDocToDerivable` reads, so the dot and the derivation agree about
             which field carries the status.
             ⚠️ A NUDGE HAS NO STATUS AND TAKES NO DOT — `NUDGE_SENT` is not a status change. */
          ...((st) => (st ? { status: String(st) } : {}))(x.r.resultingStatus ?? x.r.type),
        } as DockTimelineEvent;
      })
      /* ⚠️ EVERY ENTRY, OLDEST FIRST — the cap is gone. It was `.slice(-6)`, which silently dropped
         the OLDEST rungs, so a long history lost its beginning: precisely the end a reader is
         looking for when they open the record. The body scrolls and the footer is pinned below it,
         so length costs nothing now. Ascending, as `useDockActivity` orders it and as v14 draws it. */
      ;
  }

  /**
   * ⚠️ THE ACTION BUTTON NEVER COMPLETES DIRECTLY. IT OPENS THE JOURNEY, AND THE JOURNEY COMMITS.
   * No exceptions, no card kind carved out — this function's whole body is now one call, and that
   * is the point rather than an accident of refactoring.
   *
   * ⚠️ WHAT THIS REPLACED, SO IT IS NOT REINSTATED AS A "FAST PATH". It called
   * `recordMaterialsSent` inline for any card with a send spec, and `quickDone` for a user task —
   * so the two COMMONEST kinds wrote straight from the bar and the journey never opened, while
   * offer / stale / housekeeping / agent-waiting went the long way. One button, two behaviours,
   * and the split invisible from the label. The materials derivation, the conditional synopsis row,
   * the free-text field and the summary strip were all reachable only on the cards that happened
   * to fall the other way; a send recorded from here logged `sentDate: new Date()` and whatever
   * the spec assumed, with the writer never shown what was about to be written.
   *
   * ⚠️ AND THE INLINE WRITE COULD NOT STATE WHAT IT WROTE. That is the deeper reason it goes
   * rather than being kept behind a preference: a one-press record has nowhere to put the day, the
   * channel, the conditional synopsis or the note, so its speed came from asserting defaults it
   * never showed you. The journey is the only surface that can say what it is about to record.
   *
   * The completion mechanics are unchanged and stay where they always were: the journey's commit
   * runs `recordMaterialsSent` / `updateUserTask` through the same primitives, and the task going
   * away remains DERIVED — the engine stops generating it once the status moves, so nothing ticks
   * it and nothing needs to.
   */
  /**
   * ⚠️ THE PANE'S ANSWERS TRAVEL AS A PREFILL; THEY ARE NOT A SECOND WRITE (pane round, Phases 3
   * and 4).
   *
   * The standing law in this file is that the action button never completes directly — it opens
   * the journey, and the journey commits. The pane contract puts a form and a `Will record:` strip
   * in front of that button, which is easy to read as "this records", and building it that way
   * would give one act two write paths that could disagree. `FocusFlow` already accepts a
   * `prefill`, so the pane's answers ARRIVE at the one commit path as its opening values, and the
   * writer sees them again before anything is written.
   *
   * ⚠️ WHAT DOES NOT TRAVEL YET, STATED PLAINLY: the expectation dates. `recordMaterialsSent`
   * accepts `writerExpectedDate` and `nudgeDate` and the rules allow both, but `markSentWriteArgs`
   * (lib/todoWalk.ts) does not pass them and `FocusFlow`'s prefill has no field for them. The
   * `.expect` block is therefore ASKED and not yet STORED — see the run report; it is the
   * remaining half of Phase 4, and half a write path is worse than none.
   */
  /**
   * ⚠️ THE ANSWERS, AS THE GATE SEES THEM. Read from the form's own state, never from the DOM —
   * a gate that queried the page for what had been chosen would be a second reading of a fact the
   * component already holds, and the two would disagree the first time one of them changed.
   */

  function gateAnswers(card: BoardCard): GateAnswers {
    const spec = sendSpecFor(card);
    /* ⚠️ A FULL MANUSCRIPT HAS NO UNIT TO PICK, so the parcel requirement is met by the material
       itself. Requiring a unit there would ask the writer to measure a whole book in chapters. */
    const wholeThing = spec?.material === "full";
    const picked = paneBody.rows.some((r) => r.kind === "qty" && r.on && String(r.amount).trim() !== "");
    return {
      /* ⚠️ A SEEDED NUMBER IS NOT AN ANSWER (journey round, Phase 4). Choosing a unit fills the
         amount with the app's default so the picker opens on something; `picked` was true the
         instant that happened, so pressing "Chapters" silently accepted 3 and the primary went
         live. The writer has to COMMIT the value — blur, Enter, a stepper, an arrow — and a whole
         manuscript still needs neither, because it has no unit to pick. */
      unit: wholeThing || (picked && paneBody.unitCommitted),
      when: !!paneBody.when && (paneBody.when.kind !== "date" || !!paneBody.when.ymd),
      expect: !!paneBody.expect && (paneBody.expect.kind !== "date" || !!paneBody.expect.ymd),
      /* ⚠️ A REVEALED-BUT-EMPTY DATE IS NOT AN ANSWER (deed round, Phase 4). The predicate read the
         PILL's selection, so choosing "A custom date…" satisfied the gate before a date existed —
         the same class of fault as the pre-filled answers the steer round removed, one layer down:
         a question counted as answered because a control had been touched. */
      remind: !!paneBody.remind && (paneBody.remind.kind !== "date" || !!paneBody.remind.ymd),
      rows: bulkTouched > 0,
      /* ⚠️ THE SAME REVEALED-BUT-EMPTY TEST AS THE OTHERS. A picked preset or an explicit `never` is
         an answer; a date control that has been opened and not filled is not. */
      holdday: answeredDelay(paneBody.hold),
      checkin: answeredDelay(paneBody.checkin),
      again: answeredDelay(paneBody.again),
    };
  }

  /** a delay is answered when it names a day or explicitly ends the asking — never when it is open and blank */
  function answeredDelay(d: SendBodyValues["hold"]): boolean {
    return !!d && (d.kind !== "date" || !!d.ymd);
  }

  /** the delay this flow actually asked for — `null` where it asked for none */
  function delayAnswerOf(field: "holdday" | "again" | "checkin"): SendBodyValues["hold"] {
    if (!activeFlow?.questions.includes(field)) return null;
    return field === "holdday" ? paneBody.hold : field === "again" ? paneBody.again : paneBody.checkin;
  }

  /**
   * ⚠️ A PICKED DATE BECOMES DAYS, BECAUSE THE PRIMITIVE COUNTS IN DAYS. Rounded UP from the start
   * of today, so "tomorrow" is one day rather than nought-point-something — and `null` where the
   * date does not parse, which refuses the write rather than snoozing to an invented day.
   */
  function daysUntil(ymd: string): number | null {
    if (!ymd) return null;
    const then = new Date(`${ymd}T12:00:00`).getTime();
    if (!Number.isFinite(then)) return null;
    const start = new Date(); start.setHours(12, 0, 0, 0);
    return Math.max(1, Math.round((then - start.getTime()) / 86400000));
  }

  /* ⚠️ THE VERBS ARE `cardMenu`'s, NOT A SECOND LIST. The band's Snooze and Dismiss are the same
     entries the ⋯ menu offers, so a card that cannot be snoozed shows no Snooze in either place. */
  const paneVerbs = React.useMemo(() => {
    const none = { disabled: true, onPress: () => {} };
    if (!card) return { snooze: none, openQuery: none, dismiss: none };
    const col = groupColumn(cardBucket(card) === "note" ? "yours" : "urgent");
    const menu = cardMenu(card, col);
    const offers = (id: string) => menu.some((g) => g.entries.some((e) =>
      e.kind === "leaf" ? e.id === id && !e.disabled : e.sub.some((x) => x.id === id && !x.disabled)));
    return {
      /* ⚠️ THE TWO `onPress` CLOSURES HERE ARE DEAD AND WERE DEAD BEFORE THE MOVE — the journey
         reads `.disabled` from snooze and dismiss and supplies its own handlers, so only
         `openQuery.onPress` is ever called. They point at the host rather than at a second
         implementation, so a future caller cannot reach a different surface than the journey. */
      snooze: { disabled: !offers("snooze-1") || !host.onSnooze, onPress: (anchor: HTMLElement) => host.onSnooze?.(anchor) },
      openQuery: { disabled: !card.relatedRecordId, onPress: () => host.openQuery(card) },
      dismiss: { disabled: !offers("dismiss-week") || !host.onDismiss, onPress: () => host.onDismiss?.() },
    };
  }, [card]);

  /**
   * ⚠️ THE PRIMARY IS ALWAYS CLICKABLE, AND AN INCOMPLETE CLICK TEACHES RATHER THAN REFUSING.
   *
   * A disabled button states that something is wrong and declines to say what — the writer is left
   * hunting the form for the thing it will not name. So the click always lands: if a requirement is
   * unmet, nothing is written and the pane SHOWS the first missing answer — scrolls it into view,
   * focuses it, and flashes its label. `firstMissing` returns the field's identity precisely so
   * this is possible; a boolean could not have told the writer where to look.
   *
   * ⚠️ BULK IS THE STATED EXCEPTION and it is inert at zero, because there is no single field to
   * scroll to — the answer is "touch a row", and every row is equally the one meant.
   */
  /**
   * ⚠️ THE GATE OPENS THE QUESTION; IT NO LONGER SCROLLS TO IT (workspace round, Phase 3). With the
   * form a ledger of closed rows, the first unanswered one may not be visible at all — so pointing
   * at it means OPENING it, and the focus that follows brings it into view for free (the browser
   * scrolls a focused element into its scrollport). One route for all three callers: the primary's
   * gate, every link in the missing line, and `Edit`.
   *
   * ⚠️ AND IT OPENS BEFORE IT FOCUSES, ON THE NEXT TICK. The row's control does not exist until the
   * row is open, so focusing in the same statement would target a node React has not rendered —
   * the same flush the missing line already had to wait for.
   */
  const jumpTo = React.useCallback((id: string) => {
    setOpenId(id);
    setTimeout(() => host.jumpToSection(id), 0);
  }, [host.jumpToSection]);

  function dockPrimary(card: BoardCard) {
    /* ⚠️ NO INTENT, NO PRIMARY — so there is nothing to gate. The bar renders no primary while the
       fork is showing, which makes this unreachable rather than merely unnecessary; the guard is
       here because a caller could still reach it. */
    if (!activeFlow) return;
    const kind = journeyKind(card);
    const missing = firstMissingOf(activeFlow.questions, gateAnswers(card));
    if (missing) {
      /* ⚠️ THE BAR NAMES ALL OF THEM AND THE PANE OPENS THE FIRST. Naming only the first would
         make the writer press the button once per missing answer to discover the next. */
      setShowMissing(true);
      /* ⚠️ AFTER THE RENDER, NOT BEFORE IT. `setShowMissing` re-renders the pane, and React had not
         flushed when the jump ran — so focus was placed on a node the very next render replaced,
         and both the caret and the scroll were discarded. Measured: `activeElement` came back BODY
         and `scrollTop` never moved, with the missing line correctly on screen beside them. The
         next tick is after the flush. */
      jumpTo(anchorFor(missing));
      return;
    }
    setShowMissing(false);

    /**
     * ⚠️ THE PRIMARY DOES WHAT THE FLOW DECLARES (journey round, Phase 3), and this branch is why
     * the fork could not ship without it. Phase 2 made "Not yet — hold me to it" reachable; the
     * primary still routed on the CARD's journey, so pressing "Set the reminder" would have run the
     * send committer and RECORDED A SEND. A flow's write is the flow's, and reading it here is what
     * makes that impossible rather than remembered.
     */
    const w = activeFlow.writes;
    if (w.kind === "snooze" || w.kind === "date-note") {
      /* ⚠️ THE SAME WRITER THE ACTION BAR'S SNOOZE USES — no second dated-task path. The days come
         from the answer; the label is the journey's own wording, which is the only thing that
         differs between a send's "hold me to it" and a close's "ask me again". */
      const d = delayAnswerOf("holdday") ?? delayAnswerOf("again");
      if (!d) return;
      if (d.kind === "never") { host.mute?.(card); host.advance(card); return; }
      const days = d.kind === "days" ? d.days : daysUntil(d.ymd);
      if (days == null) return;
      host.snooze?.(card, days, activeFlow.primary);
      host.advance(card);
      return;
    }
    if (w.kind === "mute") { host.mute?.(card); host.advance(card); return; }
    if (w.kind === "hand-off") { host.openFlow(card); return; }

    /**
     * ⚠️ THE PRIMARY COMMITS HERE, AND NOTHING OPENS (popup round, Phase 1).
     *
     * It used to hand off: `setFlowPrefill(...)` then `openFlowCards([card])`, so a pane that had
     * just gated four required answers raised a takeover asking the same questions again — most
     * visibly on the close journey, where the "Stale query" dialog offered to consider closing a
     * record the writer had already answered for. The prefill existed only to carry the pane's
     * answers ACROSS that boundary. With no boundary there is nothing to carry, and the answers go
     * where they were always going: `commitFromPane`, which routes to the bucket's own writer.
     *
     * ⚠️ TWO JOURNEYS STILL HAND OFF, DECLARED RATHER THAN LEFT OVER — `paneCommits` names them and
     * says why. An offer and an agent-record gap ask questions this form does not draw, so
     * committing them here would run a writer with nothing to write, behind a button claiming it
     * had recorded something.
     */
    const jk = paneJourneyKind(card, agents);
    const bulk = isBulkCard(card);
    if (!bulk && !(jk && paneCommits(jk))) {
      host.openFlow(card);
      return;
    }

    /* ⚠️ THE NEXT CARD IS READ BEFORE THE WRITE. The board is derived, so the instant this commits,
       the card being stood on leaves `dockable` and its index is gone — a lookup afterwards would
       find the card that has taken its place, or nothing at all. */
    /* the dock cursor is the page's — see `advance` in `TaskPaneHost` */

    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    void (async () => {
      /* ⚠️ THE ROWS TRAVEL AS AN ARGUMENT, because the table's state is the pane's. On the page
         they were a closure `commitRecordSweep` reached for; a bulk commit driven from the calendar
         would have read the To-do page's rows instead of its own. */
      const wrote = await host.commit(card, paneCommitValues({
        kind: bulk ? "bulk" : jk!,
        body: paneBody,
        /* the fork's own answer — a withdrawal is not a silence, and the origin is what knows */
        closeReason,
        /* ⚠️ THE NUDGE'S OWN CLOCK, FROM THE WRITER (Phase 5). Without this the committer used
           `DEFAULT_CHECKBACK_DAYS` and every nudge set a follow-up nobody chose. */
        ...(() => {
          const c = paneBody.checkin;
          if (!c) return {};
          if (c.kind === "never") return { noCheckIn: true };
          if (c.kind === "days") return { checkBackDays: c.days };
          const d = daysUntil(c.ymd);
          return d == null ? {} : { checkBackDays: d };
        })(),
        ...(q?.sendMethod ? { queryMethod: q.sendMethod } : {}),
        now: new Date(),
      }), bulkRows);
      /* ⚠️ NOTHING WRITTEN, NOTHING ADVANCED. A failed or empty commit leaves the writer where they
         are, beside the toast that says so — moving on would report success by moving. */
      if (!wrote) return;
      /* the card is gone from the derived board; the pane follows to the next, or to the empty
         state when there is none, which is what `card` resolving to nothing already draws */
      host.advance(card);
    })();
  }

  /**
   * ⚠️ CHOOSING AN INTENT IS THE WHOLE OF THIS FUNCTION, INCLUDING THE CROSSOVER. A crossover swaps
   * the JOURNEY — band, deed, flow and primary together — because it is a different act, not a
   * different branch of the same one. Doing it here rather than at the button means the pane cannot
   * end up half-crossed.
   */
  function chooseIntent(id: string) {
    if (!activeId) return;
    const to = crossoverOf(activeId, id);
    if (to) {
      /* ⚠️ THE ORIGIN IS REMEMBERED, NOT DISCARDED. `Go back` restores it, and the close's REASON is
         read from it — arriving from the send fork means a withdrawal, arriving from the nudge fork
         means a silence, and the writer is never asked to categorise their own disappointment. */
      setCrossed({ from: activeId, fromIntent: id, to });
      setIntentId(null);
      setClearedNote(false);
      setPaneBody({ rows: seeds.current.rows(card ?? null), ...BLANK });
      setOpenId(null);
      setExtras({ alongside: false, also: false });
      setShowMissing(false);
      return;
    }
    /* ⚠️ CHANGING INTENT DISCARDS THE ANSWERS GIVEN UNDER THE OLD ONE — they answered a different
       question. Only where some were actually given does the pane say so. */
    const hadAnswers = !!activeFlow && activeFlow.questions.some((f) => gateAnswers(card!)[f]);
    if (effectiveIntent && effectiveIntent !== id && hadAnswers) {
      setPaneBody({ rows: seeds.current.rows(card ?? null), ...BLANK });
      setExtras({ alongside: false, also: false });
      setClearedNote(true);
    } else if (effectiveIntent !== id) {
      setClearedNote(false);
    }
    setIntentId(id);
    setOpenId(null);
    setShowMissing(false);
  }

  /** back to the fork — the receipt's `Change`. Answers under the old intent go with it. */
  function changeIntent() {
    if (!card) return;
    const hadAnswers = !!activeFlow && activeFlow.questions.some((f) => gateAnswers(card)[f]);
    setPaneBody({ rows: seeds.current.rows(card), ...BLANK });
    setExtras({ alongside: false, also: false });
    setOpenId(null);
    setShowMissing(false);
    setIntentId(null);
    setClearedNote(hadAnswers);
  }

  /** the crossover receipt's `Go back` — restores the origin journey and its fork */
  function goBack() {
    setCrossed(null);
    setIntentId(null);
    setClearedNote(false);
    setPaneBody({ rows: seeds.current.rows(card ?? null), ...BLANK });
    setExtras({ alongside: false, also: false });
    setOpenId(null);
    setShowMissing(false);
  }

  const journey: TaskPaneJourney | null = !card ? null : buildJourney({
                    card: card,
                    facts: paneFacts,
                    sentPreviously: (() => {
                      const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
                      return formatQueryMaterials(q?.materialsWanted);
                    })(),
                    events: dockTimeline(card).map((e) => ({
                      key: e.key, label: e.label, when: e.when, via: e.via,
                      /* ⚠️ THE LOG'S OWN STATUS, CARRIED WHOLE (Phase 8). `dockTimeline` already
                         sets it from `resultingStatus ?? type` — the same pair the derivation
                         reads — and a nudge has none. The pane decides what that means; this
                         hands it over without a second opinion. */
                      status: e.status,
                      /* the mockup's `in` rung — an event the AGENT caused */
                      incoming: /requested|offer|rejected|response|reply/i.test(e.label),
                    })),
                    primaryLabel: rowPrimaryLabel(card, groupColumn(cardBucket(card) === "note" ? "yours" : "urgent")),
                    ...(card.userTaskId ? { noteAdded: noteAgo(card) } : {}),
                    /* ⚠️ THROUGH THE APP'S ONE STATUS-WORD FUNCTION. `getStatusLabel` is what the
                       Query Centre's pill reads, so the story header and that pill cannot come to
                       call one status two things — which is the whole reason this is the Query
                       Centre's grammar rather than a lookalike. */
                    ...(() => {
                      const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
                      return q?.status ? { statusWord: getStatusLabel(q.status) } : {};
                    })(),
                    /* ⚠️ THE PRIMARY IS THE FLOW'S — `null` while the fork is showing, which is
                       what removes the button rather than disabling it. */
                    /* ⚠️ THE CROSSOVER'S VERB WHERE IT HAS ONE. Arriving at a close TASK you are
                       recording a state the query has reached — "Log the close"; arriving from a
                       send or a nudge you are ending it now — "Close the query". The contract draws
                       both, and the difference is the act rather than the write. */
                    primary: activeFlow ? (crossedPrimary ?? activeFlow.primary) : null,
                    will: paneWill,
                    body: (
                      isBulkCard(card) ? (
                        <BulkFillTable rows={bulkRows} onChange={(next) => {
                          setBulkRows(next);
                          /* ⚠️ ONE COUNT, FROM THE ARRAY THE TABLE RENDERS — the band, the strip and
                             the primary all read this, so the three cannot disagree about one
                             table. `rowHasAnswer` is the sweep's own test, not a second one. */
                          setBulkTouched(next.filter(rowHasAnswer).length);
                        }} />
                      ) : (
                      <TaskPaneBody
                        /**
                         * ⚠️ THE LEDGER IS THE DECLARATION, RENDERED — the same list the gate
                         * refuses on (steer round's law, now structural rather than aspired to).
                         *
                         * The form used to decide which sections to draw from `sendSpecFor`, which
                         * answers a DIFFERENT question: "what should go now". A materials fill-in
                         * records what ALREADY went, so that was null — and the parcel section
                         * vanished while `requiredFor("fix")` still demanded a parcel. Measured:
                         * the single fill-in's primary read "Log as sent · 1 to answer" with no
                         * unit section anywhere on the page, so it could never be satisfied and the
                         * jump target `#s-unit` did not exist. A permanently inert primary, and the
                         * gate was correct throughout — the form was short a section.
                         *
                         * There is now no second table to be short: the rows ARE
                         * `requirementsFor(kind)`, and each row's `answered` is the gate's own
                         * predicate over the gate's own answers.
                         */
                        questions={requirementsOf(activeFlow?.questions ?? []).map((r) => ({
                          id: r.id, field: r.field, label: r.label,
                          answered: r.isAnswered(gateAnswers(card)),
                          /* ⚠️ THE WHOLE-MANUSCRIPT PARCEL IS ANSWERED BY THE CARD, NOT BY A
                             CONTROL — the one case the form cannot format, because a full
                             manuscript has no unit to pick and the picker holds nothing. Read from
                             `sendSpecFor`, which is the same spec `gateAnswers` reads to decide the
                             requirement is met: one source for "is it answered" and "what is the
                             answer", so the tick and the words cannot disagree. */
                          ...(r.field === "unit" && sendSpecFor(card)?.material === "full"
                            ? { answer: "The full manuscript" } : {}),
                          /* the delay options and hint are the FLOW's — see `JourneyFlow.delays` */
                          ...((activeFlow?.delays as Record<string, unknown> | undefined)?.[r.field]
                            ? { delays: (activeFlow!.delays as any)[r.field] } : {}),
                          ...((activeFlow?.delayHints as Record<string, string> | undefined)?.[r.field]
                            ? { hint: (activeFlow!.delayHints as any)[r.field] } : {}),
                        }))}
                        /* ⚠️ `null` FOLLOWS THE FIRST UNANSWERED — the same array the chip counts
                           and the missing line names, so the open row cannot point somewhere the
                           sentence does not mention. Nothing open once the last is answered, and
                           nothing open on a note, which requires nothing. */
                        openId={openId ?? unansweredOf(activeFlow?.questions ?? [], gateAnswers(card))[0]?.id ?? null}
                        onOpen={jumpTo}
                        onAnswered={() => setOpenId(null)}
                        /* ⚠️ THE FLOW SAYS WHICH OPTIONAL FIELDS IT OFFERS, and `[]` while the fork
                           is showing — a link inviting a note on a decision the writer has not made
                           yet. It is also what makes `JourneyFlow.links` READ rather than declared. */
                        offers={activeFlow?.links ?? []}
                        extras={extras}
                        onOpenExtra={(w) => setExtras((e) => ({ ...e, [w]: true }))}
                        /* ⚠️ THE CLOSE JOURNEY'S REASSURANCE, ON THE ROW WHERE IT IS READ. It was
                           the form's sub-line; the chrome diet retires the sub-line, and this is
                           the one line in it that was content rather than a restatement of the
                           deed. `paneCopy` is the one table it has ever lived in. */
                        whenHint={paneCopy(card).note}
                        statedWeeks={statedWeeks(card)}
                        /* the note's own words and its date — the centrepiece, and the one line
                           beneath. Both derived from the task the writer wrote, never restated. */
                        note={card.userTaskId
                          ? { text: card.title, added: noteAddedDate(card) }
                          : undefined}
                        idPrefix={idPrefix}
                        value={paneBody}
                        onChange={setPaneBody}
                      />
                    )),
                    /* the band's buttons are the mockup's `btns` array — carried behaviour, its markup */
                    /* ⚠️ THE BAND CARRIES NO VERBS (frame2 Phase 3). Snooze and Dismiss both live in the
                       command bar and act on the open task; the band's copies put two of each on one screen,
                       and two controls for one act is how they come to disagree about whether it is available. */
                    btns: [],
                    /* ⚠️ THE FORK, OR THE RECEIPT — never both, and never neither. A journey whose
                       fork has one option resolves without drawing it; every other journey shows
                       the fork until an intent is chosen and the receipt afterwards. */
                    ...(activeId ? {
                      band: JOURNEYS[activeId].band,
                      deedAs: JOURNEY_DEED_BUCKET[activeId],
                      ...(effectiveIntent === null && JOURNEYS[activeId].fork.options.length > 1
                        ? { fork: {
                            label: JOURNEYS[activeId].fork.label,
                            options: JOURNEYS[activeId].fork.options.map((o) => ({
                              id: o.id, title: o.title, subtitle: o.subtitle,
                              crossesTo: crossoverOf(activeId, o.id) ?? undefined,
                            })),
                            onChoose: chooseIntent,
                          } }
                        : {}),
                      ...(effectiveIntent && JOURNEYS[activeId].fork.options.length > 1
                        ? { receipt: crossed
                            ? { kind: "crossed" as const, label: JOURNEYS[crossed.from].fork.label,
                                journey: crossed.from, onBack: goBack }
                            : { kind: "chose" as const,
                                label: intentOf(activeId, effectiveIntent)?.title ?? "",
                                onChange: changeIntent } }
                        : {}),
                      /* a crossover arrived here without choosing THIS journey's intent, so its own
                         fork still has to be answered — the receipt above says where it came from */
                      ...(crossed && effectiveIntent === null
                        ? { receipt: { kind: "crossed" as const, label: JOURNEYS[crossed.from].fork.label,
                                       journey: crossed.from, onBack: goBack } }
                        : {}),
                      ...(clearedNote ? { clearedNote: true } : {}),
                      ...(activeFlow?.info ? { flowInfo: activeFlow.info } : {}),
                    } : {}),
                    onOpenQuery: () => paneVerbs.openQuery.onPress(),
                    /* ⚠️ THE IDS COME FROM THE QUERY, AND ABSENCE IS AN ABSENT LINK. The card holds
                       `msTitle` and an `agentId`; the manuscript's id is the query's. Where either
                       is missing — a card with no query behind it, an unresolvable agent — no
                       handler is passed and the deed's span is bold rather than a dead anchor. */
                    ...(() => {
                      const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
                      const msId = q?.manuscriptId;
                      const agId = card.agentId ?? q?.agentId;
                      return {
                        ...(msId && host.openManuscript ? { onOpenManuscript: () => host.openManuscript!(msId) } : {}),
                        ...(agId && host.openAgent ? { onOpenAgent: () => host.openAgent!(agId) } : {}),
                      };
                    })(),
                    /* ⚠️ SNOOZE ANCHORS TO THE PANE'S OWN BUTTON. `AnchoredPanel` takes any element
                       and places against its rect — recon 6 confirmed it needs nothing else, so the
                       panel moved surface without a line of change inside it. */
                    /* ⚠️ SNOOZE LEAVES THE BAR ONCE AN INTENT IS CHOSEN (Phase 3). The fork has
                       already offered the honest version — with the journey's own wording and its
                       own question — and two doorways to one outcome is the pattern this repo keeps
                       closing. It stays while the fork is showing, because there it is one of the
                       answers to "not now". */
                    ...(effectiveIntent === null && !paneVerbs.snooze.disabled
                      ? { onSnooze: (el: HTMLElement) => host.onSnooze?.(el) } : {}),
                    /* ⚠️ IT OPENS THE QUESTION; IT DOES NOT ACT (Phase 7). This is the one verb on
                       the page whose result cannot be read off the page afterwards, so it is the
                       one that asks — see `TaskDismissDialog` for why that is about WHERE IT GOES
                       rather than about certainty. */
                    onDismiss: paneVerbs.dismiss.disabled ? undefined : () => host.onDismiss?.(),
                    /* the cohort's numbers, where this IS a cohort — absent everywhere else, so a
                       single journey can never accidentally wear a counted primary */
                    /* ⚠️ THE ONE LIST, HANDED OVER ONCE. The chip counts it, the line names it and
                       the square sits on its first entry — so the three cannot come to disagree,
                       because there is one array between them. */
                    /* ⚠️ THE FLOW'S LIST, NOT THE JOURNEY'S. While the fork is showing there is
                       nothing to be missing — no intent means no questions — so this is empty and
                       the primary is absent rather than counting zero. */
                    missing: unansweredOf(activeFlow?.questions ?? [], gateAnswers(card))
                      .map((r) => ({ id: r.id, name: r.name })),
                    showMissing,
                    /* ⚠️ THE MISSING LINE'S LINKS TAKE THE SAME ROUTE AS THE PRIMARY'S GATE —
                       `jumpTo`, which OPENS the row and then focuses it. Handing `host.jumpToSection`
                       over directly would focus a control that is not rendered, because the row it
                       names is closed: the whole point of a ledger. One route, three callers. */
                    onJump: jumpTo,
                    ...(isBulkCard(card)
                      ? { bulk: { count: listRowInputs(card).bulkCount ?? 0, touched: bulkTouched } }
                      : {}),
  });

  return { journey, onPrimary: () => { if (card) dockPrimary(card); } };
}
