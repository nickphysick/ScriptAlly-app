/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoDock — the 30/70 work surface (board+dock pack, Phase 4; ref
 * design-refs/todo-board-dock.html frame 2).
 *
 * ⚠️ THIS IS WHERE WORK GETS FINISHED, and it is the ONLY place. The board says where everything
 * stands; the dock is where you send the full, close the query, answer the offer. That division is
 * the reason a derived card cannot be ticked on the board — ticking would clear the reminder and
 * leave the work undone, so the board bounces it here.
 *
 * ⚠️ THE QUEUE MOVED TO THE RAIL; THE PANE KEEPS THE SELECTION (rail + workspace, Phase 5).
 * This surface used to draw its own card stack down a 30% left column, because it had REPLACED
 * the list and that stack was the only way to see where you were going next. The rail is that
 * stack now, permanently on screen, so the column was a second copy of it — and a copy that
 * could disagree, since it was drawn from a snapshot while the rail was live. One column now.
 * `queue` is still a prop and still drives ↑↓ and the NEXT line; it is simply derived by the
 * page rather than stored, so nothing here can hold a stale list.
 *
 * ⚠️ IT PERFORMS NOTHING ITSELF. Every act is handed up to the page, which runs the EXISTING
 * primitive — `recordMaterialsSent`, `quickDone`, the offer flow, the close dialogue. The dock
 * decides what to OFFER; it never decides what happens.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { MaterialRow as MatEditorRow } from "../../lib/agentMaterials";
import { Clock, MoreHorizontal, X, ChevronLeft, ChevronRight, Mail, Globe, Copy, Check, ExternalLink } from "lucide-react";
import { BoardCard } from "../../lib/todoBoard";
import { StatusDot } from "../StatusDot";
import { EdgeFadeScroll } from "../EdgeFadeScroll";
import { PaneJourney, PaneJourneyFoot } from "./PaneJourney";
import { PaneSweep, PaneSweepFoot, SweepMember } from "./PaneSweep";
import { PaneRecordSweep, PaneRecordSweepFoot } from "./PaneRecordSweep";
import type { RecordSweepRow } from "../../lib/materialsSweep";
import { SWEEP_PRELINE, SweepRow, SweepRule, emptySweepRow, skipTheRest, sweepAnswered } from "../../lib/paneSweep";
import { JOURNEY_ACT, JOURNEY_PRELINE, JourneyKind, JourneySendValues, openSend } from "../../lib/paneJourney";
import { QueryStatus } from "../../types";
import { ArtSlot } from "./ArtSlot";
import { bandVariant, bandMotif, MaterialRow } from "../../lib/todoHandoff";
import { DockMotif } from "./DockMotif";
import { dockFlowKind, sendSpecFor, stepQueue, SendSpec } from "../../lib/todoDock";
import { handoffFor, panePosition, paneSections, bandFacts, trackingStats, bandPreline, bandDeed, bandSubline, bandSubject, bandUnder, HANDOFF_NOTE, BandFact, HolderRow, recordNote } from "../../lib/todoHandoff";
import { liveFamily } from "../../lib/todoFamily";
import { TASK_GROUP_META } from "../../lib/todoGroups";
import "./todoDock.css";

export interface DockTimelineEvent {
  key: string;
  label: string;
  when: string;
  /**
   * ⚠️ EVERYTHING BELOW IS OPTIONAL AND ABSENT WHERE THE RECORD IS SILENT (journeys pack, Phase 2).
   * A row with no channel shows no channel; a row with no materials shows no chips. None of it is
   * inferred — an entry that says "Partial sent" and nothing else renders exactly that.
   */
  /** "via email" — appended in REGULAR weight beside the event's 600. */
  via?: string;
  /** Anything the agent said: the request quote, the R&R notes. */
  note?: string;
  /**
   * ⚠️ MATERIAL CHIPS ARE CUT, NOT DEFERRED, AND THE REASON IS THAT NOTHING CAN FEED THEM.
   * `Activity` carries no package or version reference — only a free-text `details`. The package's
   * filled slots describe the QUERY'S CURRENT package, not what went with a specific entry, so
   * there is no join from an activity to what accompanied it. Structured chips are therefore
   * possible on ZERO historical entries.
   *
   * ⚠️ AND `details` IS DISPLAYED, NEVER PARSED. Splitting "QL v2 + Syn v4" on "+" to fake chips
   * would be deriving state by reading a display string, which is the fault the whole record is
   * built to avoid. The string renders VERBATIM as the sub-line instead: it is what a human wrote
   * for a human to read, and that is all it is.
   *
   * The field returns the day an activity can name what went with it — a data decision, not a
   * display one.
   */
  /** The wait against the agent's STATED window. Absent where they state none. */
  progress?: { pct: number; over: boolean; from: string; to: string };
  /**
   * ⚠️ THE ENTRY'S OWN STATUS, HANDED STRAIGHT TO `StatusDot`. Not a ring state, not a direction,
   * not a colour — the exact `QueryStatus` the rung produced. `StatusDot` is the app's ONE drawing
   * of a query status and it is never recreated locally; anything less than the status itself
   * throws away what the glyph is for.
   *
   * ⚠️ ABSENT ON A NUDGE, and correctly so. `NUDGE_SENT` carries no `resultingStatus` — it is not
   * a status change — so it takes no dot, and the mark track is simply empty on that row while the
   * connector runs past it.
   */
  status?: QueryStatus | string;
}

export interface TodoDockProps {
  /** The queue — the board's current column order, filtered view already respected. */
  queue: BoardCard[];
  /**
   * ⚠️ THE CARD ITSELF, AND THE DOCK NO LONGER LOOKS IT UP. It resolved
   * `queue.find((c) => c.key === activeKey) ?? queue[0]`, and the fallback is the whole fault: the
   * moment the held card leaves `dockable` — a commit removes it, a search narrowing hides it — the
   * find misses and the dock SILENTLY SWAPS TO THE FIRST REMAINING TASK. Meanwhile the page is
   * still holding the original (`heldCard.current`, its documented hold rule) and the activity
   * listener is still keyed on the original's query. Header, materials and verbs from one card;
   * timeline from another, with nothing on screen saying so.
   *
   * ⚠️ MEASURED WITHOUT A WRITE, because it does not need one: dock a card, type a search that
   * matches a different one, and the pane swaps under you. Joan Whitfield → Ana Duarte, no action
   * taken on the pane. The page's own comment says a narrowed rail beside a held card is the
   * CORRECT pair — the dock was overruling it.
   *
   * ⚠️ SO THE PAGE OWNS THE IDENTITY AND THE DOCK RENDERS WHAT IT IS GIVEN. `queue` stays, because
   * prev/next genuinely walk the live list; what it must never do again is decide WHICH card this
   * is. One owner, and a held card that outlives its place in the queue.
   */
  card: BoardCard;
  /** The docked card's key — for the queue walk and the position line, never for resolution. */
  activeKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  /**
   * ⚠️ §4.4 — WHO ELSE HOLDS MATERIAL. `decide` only, and derived by the page because
   * `notifyGroups` needs the whole query set. Empty array = the section does not render.
   */
  holders?: (card: BoardCard) => HolderRow[];
  /** ⚠️ THE MATERIALS ON FILE — a RECORD, not a choice. The page derives them because the package
   *  and its versions live there; the card states what it is handed. */
  materials?: (card: BoardCard) => MaterialRow[];
  /** The timeline, derived by the page from the activity log. */
  timeline: (card: BoardCard) => DockTimelineEvent[];
  /** The flow's ink act. `spec` is present only for the send flow. */
  /** ⚠️ NO `spec` — the primary OPENS THE JOURNEY and the journey commits, so the dock has
   *  nothing to pre-resolve. It used to hand a `SendSpec` straight to an inline write. */
  onPrimary: (card: BoardCard) => void;
  /**
   * ⚠️ THE DEED'S NAME, FROM THE PAGE'S OWN `rowPrimaryLabel` — never a second vocabulary here.
   * The command bar already reads it; the card's footer reads the same one, so the two controls
   * can never come to offer differently-worded versions of one act.
   */
  primaryLabel?: (card: BoardCard) => string;
  /**
   * ⚠️ ITEM 9 — THE JOURNEY RENDERS HERE, and the page performs the write. Present = this card's
   * bucket has an in-pane journey; absent = the card falls back to `onPrimary`, which still opens
   * the takeover. That is what lets the six buckets move ONE AT A TIME rather than all at once on
   * a surface nobody has walked yet.
   */
  onCommitSend?: (card: BoardCard, values: JourneySendValues) => Promise<void> | void;
  /** Which journey this card's bucket runs — declared by the page, never guessed here. */
  journeyKind?: (card: BoardCard) => JourneyKind | undefined;
  /**
   * ⚠️ `fix` ONLY — the gaps the card was raised for. The dock does not derive them: the page owns
   * the agent list, and `agentDataQualityNeeds` is already what raised the card, so re-deriving it
   * here would give one fact two sources.
   */
  journeyGaps?: (card: BoardCard) => readonly ("responseTime" | "materials" | "mswl")[];
  /** materials only — the send these attach to, and what the agency asks for. Page-derived. */
  journeyRecord?: (card: BoardCard) => { sentOn: string; asks: MatEditorRow[]; asksLine: string | null } | undefined;
  /** materials only — suppress this task without writing material data. */
  onLeaveUnrecorded?: (card: BoardCard) => void;
  /**
   * ⚠️ THE BULK RECORD GAP — a cohort of QUERIES, distinct from `sweep`'s cohort of AGENTS. Kept a
   * separate prop rather than widened into `sweep`, because bending `SweepRow` to hold a material
   * set would distort the shape three live housekeeping rules depend on.
   */
  recordSweep?: (card: BoardCard) => RecordSweepRow[] | undefined;
  onCommitRecordSweep?: (card: BoardCard, rows: RecordSweepRow[]) => Promise<void> | void;
  onDismissRecordSweep?: (card: BoardCard, rows: RecordSweepRow[]) => void;
  /**
   * ⚠️ THE GROUP SWEEP — a card that stands for a cohort rather than for one agent. The page
   * supplies the rule and the members because it owns the agent list; the dock only renders and
   * hands the answers back. Absent → the card is an ordinary one and nothing changes.
   */
  sweep?: (card: BoardCard) => { rule: SweepRule; members: SweepMember[] } | undefined;
  onCommitSweep?: (card: BoardCard, rows: SweepRow[]) => Promise<void> | void;
  /** The offer's notify branch — the same set §4.4 shows on the card, split by what they hold. */
  journeyHolders?: (card: BoardCard) => { holding: HolderRow[]; queried: HolderRow[] } | undefined;
  /** The reply-by day, where the record has one — the `time` branch caps its reminder there. */
  replyBy?: (card: BoardCard) => string | undefined;
  /**
   * ⚠️ THIS TASK'S VERBS — REHOMED FROM THE COMMAND BAR, not rebuilt. Every handler behind these
   * already existed and every one is reachable elsewhere (`forkStale` from the ⋯ menu, the dial
   * from the rail's row menu), so nothing here is a new behaviour or a new entrance.
   *
   * ⚠️ THE SNOOZE HANDS BACK ITS OWN ELEMENT, because the dial is a POPOVER the page owns and it
   * needs something to hang off. The card does not mount the dial — it says which button was
   * pressed, exactly as it hands every other act upward.
   */
  verbs?: (card: BoardCard) => {
    snooze: { disabled: boolean; onPress: (anchor: HTMLElement) => void };
    openQuery: { disabled: boolean; onPress: () => void };
    dismiss: { disabled: boolean; onPress: () => void };
  } | undefined;
  /** What the agent asked for, in their words — for the journey's reference block. */
  ask?: (card: BoardCard) => { quote?: string; meta?: string } | undefined;
  /** The query's recorded send method, so the journey opens on it rather than on a default. */
  queryMethod?: (card: BoardCard) => string | undefined;
  /* ⚠️ RETIRED WITH THE FOOT BAR (visual rebuild, Phase 4). The card no longer offers a snooze at
     all — the command bar does, opening the ONE dial. The prop is gone rather than left unused:
     an unused prop is a slot a future surface fills without anyone deciding it should exist. */
  onMore: (card: BoardCard) => void;
  /** The agent's own contact fields and the manuscript's title — the hand-off is built from the
   *  record or is absent; the pane never invents either. */
  handoff?: (card: BoardCard) => {
    /** §5.3 — the anchor's own noun, derived per bucket; absent where the record has no anchor. */
    anchorLabel?: string;
    anchorValue?: string;
    /** §5.1 — the band's forward-looking fact, or null where there is none. */
    forward?: BandFact | null;
    email?: string; website?: string; msTitle?: string;
    /** The band's facts strip — derived by the page, which holds the query and the clock. */
    /* ⚠️ `sentLabel`/`sentValue` ARE RETIRED — they carried `q.dateSent` under a hardcoded
       "Requested" noun, which is the §5 fault: a different fact from the rail's anchor, mislabelled
       on every bucket. `anchorLabel`/`anchorValue` above replace them. */
    waitLabel?: string; waitValue?: string;
  };
  /** tasks-pages P5 — MOUNT 2 of 3: the item sheet's tag surface. The page supplies the ONE
   *  TagPicker for user-task cards; derived work cannot be tagged, so the slot stays empty. */
  tagsSlot?: (card: BoardCard) => React.ReactNode;
}



export const TodoDock: React.FC<TodoDockProps> = ({
  queue, card, activeKey, onSelect, onClose, timeline, materials, holders, onPrimary, primaryLabel, onCommitSend, sweep, onCommitSweep, journeyKind, journeyGaps, journeyRecord, onLeaveUnrecorded, recordSweep, onCommitRecordSweep, onDismissRecordSweep, journeyHolders, replyBy, verbs, ask, queryMethod, onMore, tagsSlot, handoff,
}) => {
  const surfaceRef = useRef<HTMLDivElement>(null);
  /* ⚠️ `confirmSend` IS RETIRED WITH THE CHECKBOX (Phase 6). It was the card's own copy of a
     decision the journey owns — and the card never read it back to anything, so it was a control
     whose only effect was to look like one. */
  const [copied, setCopied] = useState(false);
  /* ⚠️ THE VIEW IS THE CARD'S OWN STATE, and it is cleared whenever the docked card changes —
     otherwise stepping to the next task with ↑↓ would land you inside a half-filled form for a
     record you are no longer looking at. */
  const [draft, setDraft] = useState<JourneySendValues | null>(null);
  /**
   * ⚠️ THE SWEEP'S ANSWERS, ONE PER MEMBER, AND THEY RESET WITH THE CARD. A cohort you half-answered
   * and then walked away from must not reappear pre-ticked on the next card — the same reason
   * `draft` clears on `activeKey`. Nothing is pre-selected at any point, which is the one rule this
   * surface cannot bend: guessing an agent's requirements and having a writer accept it by not
   * looking is how bad data gets in.
   */
  const [recDraft, setRecDraft] = useState<RecordSweepRow[] | null>(null);
  const [sweepRows, setSweepRows] = useState<SweepRow[]>([]);
  const [saving, setSaving] = useState(false);

  /* ⚠️ THE PER-ITEM RESET WENT WITH `confirmSend` (Phase 6). It existed so a confirmation could
     not carry from one card to the next; the card confirms nothing now — it records — so there is
     no per-item decision left here to clear. */

  /* ⚠️ KEYBOARD. Esc closes, ↑↓ walk the queue, Enter is the primary. Bound on the surface rather
     than the document so it cannot reach past an open popover or a field the flow owns. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    /* ⚠️ ESCAPE CASCADES: the journey first, then the pane. A single handler that always closed the
       dock would throw away a half-filled form to do it — and leaving the journey writes nothing,
       so there is nothing to confirm. (The calendar consumes Escape on the CAPTURE phase before
       either of these sees it, which is its own existing rule.) */
    if (e.key === "Escape" && draft) { e.preventDefault(); setDraft(null); return; }
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    const editing = (e.target as HTMLElement)?.closest("input, textarea, select");
    if (editing) return; // never steal keys from something being typed into
    /* ⚠️ ↑↓ AND Enter ARE THE QUEUE'S, AND THE QUEUE IS NOT WHAT YOU ARE DOING. While the journey
       is open they would step the pane out from under a form in progress, or re-fire the deed that
       opened it. */
    if (draft) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const to = stepQueue(queue, card?.key ?? "", e.key === "ArrowDown" ? 1 : -1);
      if (to) { e.preventDefault(); onSelect(to.key); }
    }
    if (e.key === "Enter" && card) { e.preventDefault(); onPrimary(card); }
  };

  useEffect(() => { surfaceRef.current?.focus(); }, []);
  /* the journey belongs to the card that opened it — see the note on `draft` */
  useEffect(() => { setDraft(null); setSaving(false); setSweepRows([]); }, [activeKey]);

  if (!card) return null;

  const spec = sendSpecFor(card);
  const flow = dockFlowKind(card);
  const events = timeline(card);
  /* a note has no query, so it has no record column to fill — see the story column below */
  const isNote = flow === "user-task";
  /* ⚠️ THE SECTIONS ARE DECLARED, NOT BRANCHED. `paneSections` owns which kinds carry what; this
     component asks whether a section is present and renders it. A card that branched inline on
     `taskType` would grow a private opinion about each kind. */
  const sections = paneSections(card);
  const src = handoff?.(card) ?? {};
  /* ⚠️ THE PAIR TAKES THE ANCHOR AND THE ELAPSED; THE BAND TAKES THE FORWARD FACT. Two different
     moments, so neither repeats the other — §5's whole point. The band used to carry the anchor,
     which the pair also carries: the same figure twice on one card. */
  const facts = bandFacts(src.anchorLabel ?? null, src.anchorValue ?? null, src.waitLabel ?? null, src.waitValue ?? null);
  const forward: BandFact | null = src.forward ?? null;
  /* the stat pair reads the SAME two facts the band does — one derivation, two presentations */
  /* ⚠️ AGENT-NESS, NOT BUCKET — see `trackingStats`. A card that names an agent has no business
     showing the day its TASK was created; a note about nobody keeps that date because it is the
     only one it has. `card.who` counts: an imported card can name an agent it holds no id for. */
  const stats = trackingStats(facts, !!(card.agentId || card.who));
  /* ⚠️ RESOLVED ONCE — the body, the band's progress and the footer must all be answering about the
     same cohort, and three calls could disagree the moment the page's memo identity changes. */
  /* ⚠️ THE COHORT'S ANSWERS RESET WITH THE CARD, exactly as the sweep's do — a half-filled table
     carried onto a different task is answers about the wrong queries. */
  const recCohort = recordSweep?.(card);
  const recRows = recCohort
    ? (recDraft && recDraft.length === recCohort.length ? recDraft : recCohort)
    : [];
  const cohort = sweep?.(card);
  const rows = cohort
    ? (sweepRows.length === cohort.members.length ? sweepRows : cohort.members.map(() => emptySweepRow()))
    : [];
  const swept = cohort ? sweepAnswered(rows, cohort.rule) : 0;
  const hoff = handoffFor(card, src.email, src.website, src.msTitle);
  const who = card.who || "them";

  return (
    <div className="tdk" role="dialog" aria-label="Work surface" onKeyDown={onKeyDown} tabIndex={-1} ref={surfaceRef}>
      {/* ⚠️ THE HEAD ROW IS OUTSIDE THE CARD, and it is chrome about the card rather than part of
          it — where you are in the set, and the two steps through it. The arrows walk the SAME
          `stepQueue` the ↑↓ keys do, so the pointer path and the keyboard path cannot come to mean
          different things, and they disable at the ends rather than wrapping: a queue that loops
          has no end, and "last in the queue" is a fact worth arriving at. */}
      <div className="tdk-head">
        <span className="tdk-pos">{panePosition(queue, card.key, TASK_GROUP_META[liveFamily(card)].label) ?? ""}</span>
        <span className="tdk-headgrow" />
        <button
          type="button"
          className="tdk-nav"
          aria-label="Previous task"
          disabled={!stepQueue(queue, card.key, -1)}
          onClick={() => { const to = stepQueue(queue, card.key, -1); if (to) onSelect(to.key); }}
        >
          <ChevronLeft size={15} aria-hidden />
        </button>
        <button
          type="button"
          className="tdk-nav"
          aria-label="Next task"
          disabled={!stepQueue(queue, card.key, 1)}
          onClick={() => { const to = stepQueue(queue, card.key, 1); if (to) onSelect(to.key); }}
        >
          <ChevronRight size={15} aria-hidden />
        </button>
      </div>

      {/* ── THE WORK SURFACE ─────────────────────────────────────────────── */}
      <section className="tdk-w">
        {/* ⚠️ THE RIM IS A REAL CLIPPING CONTAINER, NOT A `::before` OVERLAY. Three layers: the
            card carries the white, the edge and 6px of padding; THIS carries the burgundy hairline,
            the smaller radius and `overflow: hidden`; the contents carry no radius of their own and
            are clipped to it. An overlay border is what spilled the MountCard header fill, and the
            tinted band fills right to this edge, so it would spill here too.

            ⚠️ AND THIS IS NOT THE FRAME RETIRED AT `acdf126`. That one was an inset RULE drawn on a
            white panel with the band held off it by margins — "a second border inside the first",
            and the note removing it was right about that. This one is the frame the band fills TO.
            Different object, same colour. */}
        <div className="tdk-rim">
        {/* ⚠️ THE DOCK-SEAL IS UNMOUNTED WITH THE PRIMARY IT RODE OVER (Phase 4) — the act is the
            command bar's now. `ArtSlot name="dock-seal"` and its 600ms are untouched in the sheet;
            the flourish returns the day a completion has a home in this surface again. */}
        {/**
          * ⚠️ THE BAND CARRIES THE IDENTITY, AND THE BODY NEVER REPEATS IT (corrections, Phase 1).
          * It held only a kind pill and the facts, so the agent's name rendered as a body element
          * in the RIGHT column while the facts floated across the title with nothing to align to.
          * That was the collision — not a spacing fault.
          *
          * One row, three parts: the identity block left, the facts right and top-aligned to it,
          * the motif behind both and clipped by the frame.
          *
          * ⚠️ `min-width: 0` ON THE IDENTITY BLOCK IS THE WHOLE FIX. Without it a long agency name
          * cannot wrap, so the block grows and shoves the facts off their own edge — which is what
          * "the facts float across the title" actually was.
          */}
        {/* ⚠️ THE VARIANT COMES FROM `bandVariant`, NOT FROM THE FAMILY. This read
            `fam-${bandFamily(card)}`, and family answers "how urgent is this" — `urgent` covers
            every send, every R&R and the offer alike, so nine cards of ten rendered pink. */}
        <div className={`tdk-band v-${bandVariant(card)}`}>
          <DockMotif motif={bandMotif(card)} />
          {/* ⚠️ NO MONOGRAM. It was an agency disc leading a surface whose job is to say what you
              are DOING; the writer already knows who they clicked. Removed rather than shrunk —
              a smaller disc is the same answer to the same wrong question. */}
          <div className="tdk-id">
            <span className="tdk-idtx">
              {/* the pre-line names the ACT, so the band reads as a sentence into the name */}
              {/* ⚠️ THE BAND STAYS AND ONLY THE PRE-LINE CHANGES. "Sending your partial to" becomes
                  "Recording what you sent to" — the same disc, name and agency throughout, so the
                  writer never loses who they are recording against half way through recording it. */}
              {/* ⚠️ A COHORT'S SUBJECT IS THE COUNT, NOT A NAME — "A materials list is missing for
                  / 16 agents". `bandSubject` would fall back to the card's title here, which is
                  already the row's own words ("16 materials wanted"), so the band would repeat the
                  rail. The sweep's own pre-line and count say the two halves of one sentence. */}
              {/* ⚠️ THE DEED FIRST AND LARGEST — `card.title`, the row's own words, so one task
                  never carries two names. The pre-line and the agent drop to the sub-line, where
                  they read as the sentence they always were. */}
              <span className="tdk-deed">
                {cohort ? `${cohort.members.length} ${cohort.members.length === 1 ? "agent" : "agents"}` : bandDeed(card)}
              </span>
              <span className="tdk-sub">
                {cohort ? SWEEP_PRELINE[cohort.rule]
                  : bandSubline(card, draft ? JOURNEY_PRELINE[journeyKind?.(card) ?? "send"] : bandPreline(card))}
              </span>
            </span>
          </div>
          {/* ⚠️ THE PROGRESS BLOCK REPORTS THIS PASS, NOT THE RECORD'S COMPLETENESS. It starts at
              zero every time the sweep is opened, which is honest: answers from a previous pass are
              already saved and are not part of what this one is doing. A bar that resumed would be
              claiming the cohort was partly done when in fact it was partly SMALLER. */}
          {cohort && (
            <span className="psw-prog">
              <span className="psw-progk">Answered</span>
              <span className="psw-progv">{swept} of {cohort.members.length}</span>
              <span className="psw-bar" aria-hidden>
                <i style={{ width: `${cohort.members.length ? (swept / cohort.members.length) * 100 : 0}%` }} />
              </span>
            </span>
          )}
          {/* ⚠️ TOP-ALIGNED TO THE IDENTITY BLOCK AND `flex-shrink: 0` — it is a fixed pair of
              facts beside a block that wraps, never the other way round. */}
          {/* ⚠️ THE BAND SHOWS THE ANCHOR ALONE. It showed both, and the stat pair three inches
              below showed the same two — one figure twice, in one glance. */}
          {forward && (
            <span className="tdk-facts">
              {[forward].map((f) => (
                <span className="tdk-fact" key={f.k}>
                  <span className="k">{f.k}</span>
                  <span className="v">{f.v}</span>
                </span>
              ))}
            </span>
          )}
          <button type="button" className="tdk-x" aria-label="Back to the board" onClick={onClose}>
            <X size={13} aria-hidden />
          </button>
        </div>

        {/* ⚠️ THE WORK SURFACE IS A TWO-COLUMN SHEET (board-optimise P4; ref board-optimised.html
            §2). The story ran ABOVE the work before, so the flow began below the fold on a long
            history and the two things you need at once — what happened, and what to do — could
            not be read together. This inner split stands; the OUTER 30/70 one does not — see the
            head note. */}
        {/**
          * ⚠️ THE OVERFLOW IS NOW EVIDENT, NOT MERELY REACHABLE — and the distinction is the whole
          * of this fix. The body DID scroll: measured on the deployed page, a wheel over it moved
          * it the full 111px and 251px of its overflow at two viewport heights. What it had was no
          * SIGNAL. This browser (and Nick's) draws overlay scrollbars, so a scroller at rest shows
          * nothing at all, and the last section simply looked cut off by the card's edge.
          *
          * ⚠️ IT RIDES THE SHARED `EdgeFadeScroll`, NEVER A FADE OF ITS OWN — the house rule, and
          * this component already answers the trap that would otherwise bite here: its recompute
          * runs on EVERY COMMIT, not only on a ResizeObserver, so a timeline that arrives from a
          * Firestore snapshot AFTER mount turns the fade on. A `ResizeObserver` alone says nothing
          * when a scroller's CONTENT grows inside it, which is exactly this surface's shape.
          *
          * `fade` is the card's own ground token, so the mist is the paper rather than a hex that
          * has to be kept in step with it.
          */}
        {/* ⚠️ THE CARD'S BODY BECOMES THE FORM — one scroller, two contents. Nothing overlays and
            nothing has to be dismissed, which is the whole of Item 9 and is also what removes the
            `inert` seal: a journey that is not an overlay never calls `useOverlay`. */}
        <EdgeFadeScroll
          /* ⚠️ THE FADE IS THE CARD'S GROUND, AND THE CARD IS WHITE NOW. It read `--paper`, which was
              correct while the body was parchment and would have drawn a cream mist over a white
              panel. */
          fade="var(--white, #ffffff)"
          outerClassName="tdk-scroll"
          scrollClassName={draft || cohort ? "tdk-body tdk-body--journey" : "tdk-body"}
          /* ⚠️ `display` IS PASSED, because the wrapper sets it INLINE and inline beats the class.
             Without this the two-column grid silently becomes a block and the doing column drops
             below the record on every card. */
          scrollStyle={{ display: draft || cohort || recCohort ? "block" : "grid" }}
        >
          {recCohort ? (
            <PaneRecordSweep rows={recRows} onChange={setRecDraft} />
          ) : cohort ? (
            <PaneSweep rule={cohort.rule} members={cohort.members} rows={rows} onChange={setSweepRows} />
          ) : draft ? (
            <PaneJourney
              kind={journeyKind?.(card) ?? "send"}
              gaps={journeyGaps?.(card)}
              holders={journeyHolders?.(card)}
              replyBy={replyBy?.(card)}
              wrote={{ title: card.title, ...(card.detail ? { detail: card.detail } : {}) }}
              materials={materials?.(card) ?? []}
              ask={ask?.(card)}
              record={journeyRecord?.(card)}
              onLeaveUnrecorded={onLeaveUnrecorded ? () => onLeaveUnrecorded(card) : undefined}
              value={draft}
              onChange={setDraft}
              onCancel={() => setDraft(null)}
            />
          ) : (
          <>
          <aside className="tdk-story" aria-label={isNote ? "Your note" : "Tracking"}>
            {/**
              * ⚠️ THE STAT PAIR IS THE BAND'S TWO FACTS, IN THE QUERY CENTRE'S GRAMMAR (Phase 2).
              * Icon tile, Playfair figure with the unit in Inter beside it, mono caption beneath —
              * the shape `.qp-stats` uses over there. The FIGURES are the same `figureFor` the rail
              * and the band already read, so a third statement of the wait is impossible.
              */}
            {stats.length > 0 && (
              <div className="tdk-tstats">
                {stats.map((st) => (
                  <div className="tdk-tstat" key={st.k}>
                    <span className="ico" aria-hidden>{st.icon}</span>
                    <span>
                      <span className="big">{st.v}{st.u && <span className="u">{st.u}</span>}</span>
                      <span className="k">{st.k}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/**
              * ⚠️ A NOTE LEADS WITH THE NOTE, AND SHOWS NO TRACKING. The note's words were in the
              * BOUNDED column beside a hint sentence while the wide column held a stat tile and an
              * empty Tracking section — the content of a note card pushed aside for a section that
              * had nothing to put in it. A note has no query and no history, so
              * "Nothing logged yet." here is an empty section pretending to be a populated one:
              * it is SUPPRESSED rather than filled with an empty state.
              */}
            {isNote ? (
              <>
                <p className="tdk-bignote">{card.title}</p>
                {card.detail && <p className="tdk-detail">{card.detail}</p>}
                {/* the hint is a CAPTION beneath the note, not a column beside it */}
                <div className="tdk-notehint">{recordNote(card)}</div>
                {card.record && <div className="tdk-ffsmall">Attached to <b>{card.record.replace(/^On /, "")}</b>.</div>}
              </>
            ) : (
              <>
                <div className="tdk-storyk">TRACKING</div>
            {/* Derived from the activity log, never stored. Absent when the record has no history
                yet, rather than an empty frame implying something is missing. */}
            {events.length > 0 ? (
              <ol className="tdk-tl">
                {events.map((e) => (
                  <li key={e.key}>
                    <span className="tdk-tlw">{e.when}</span>
                    {/**
                      * ⚠️ THE REAL `StatusDot`, IMPORTED — NEVER A RING DRAWN HERE. The previous
                      * pass built local rings from `statusDirection`, on my own earlier wording
                      * ("direction-coloured from the existing StatusDot logic"), and that wording
                      * was wrong: `StatusDot` is locked app-wide, never recreated locally, and
                      * even legends render the real component.
                      *
                      * ⚠️ WHAT THE LOCAL RINGS THREW AWAY, which is the reason it is a lock and not
                      * a preference. Outgoing is a burgundy ring with a pink centre and an arrow
                      * RIGHT; incoming a sage ring with a sage centre and an arrow LEFT; an offer a
                      * solid burgundy disc with a parchment tick; a closure a grey ring with an ×.
                      * A hollow circle beside a filled circle says none of that — it distinguishes
                      * two rungs without telling you what either one is.
                      *
                      * ⚠️ THE CONNECTOR IS STILL THE TRACK'S, not the list's: one rule between two
                      * marks, never a `border-left` drawn THROUGH them.
                      */}
                    <span className="tdk-tlm">
                      {e.status && <StatusDot status={e.status} overrideSize={20} decorative />}
                    </span>
                    <span className="tdk-tle">
                      {/* the event in 600, the channel appended in regular — one line, two weights */}
                      <b>{e.label}</b>{e.via && <span className="via"> · {e.via}</span>}
                      {/* anything the agent said, in their own words */}
                      {e.note && <span className="tdk-tlq">{e.note}</span>}
                      {/* ⚠️ THE BAR IS AGAINST THE AGENT'S STATED WINDOW, and both ends are
                          labelled — a bar with no scale is a shape, not a fact. Sage inside the
                          window, burgundy once past it, which is the same rule the rail's numeral
                          follows so the two surfaces cannot disagree about "late". */}
                      {e.progress && (
                        <span className="tdk-prog">
                          <span className="bar"><i className={e.progress.over ? "fill over" : "fill"} style={{ width: `${e.progress.pct}%` }} /></span>
                          <span className="ends"><span>{e.progress.from}</span><span>{e.progress.to}</span></span>
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="tdk-storynone">Nothing logged yet.</div>
            )}
                {/* ⚠️ §3.11 — WHAT THE RECORD SHOWS, beneath Tracking. These strings lived in the
                    DOING column keyed on `dockFlowKind`, which folds send and chase into one; they
                    are re-keyed on the BUCKET and moved here, not rewritten. */}
                <div className="tdk-recnote">{recordNote(card)}</div>
              </>
            )}
          </aside>

          <div className="tdk-work">
          {/**
            * ⚠️ THE BODY OMITS WHATEVER THE BAND IS SHOWING. (Amended — the rule here read "no
            * title and no agent here", which was true of the card it was written for and false of
            * the rest.)
            *
            * The original: the band says who this is and what the act is, so repeating either in
            * the body was what put a name in the right-hand column with the facts floating over
            * it. That reasoning is sound and unchanged FOR AN AGENT CARD, where `bandSubject`
            * returns the agent's name.
            *
            * ⚠️ WHAT IT ASSUMED, AND WHERE THAT FAILED: that the band always carries the subject.
            * On a user task `card.who` is `""`, so the band falls through to the standing label
            * "Your noteboard" — and a body that also withheld the title left the writer's own
            * words rendering nowhere on the page. The band was showing a LABEL, so the body had
            * nothing to omit.
            *
            * State the rule as the omission it is, and each card kind answers it for itself.
            */}

          {/* ── THE REAL FLOW, INLINE ────────────────────────────────────── */}
          <div className="tdk-flow">
            {flow === "agent-waiting" && spec && (
              <>
                <div className="tdk-fk">What goes</div>
                {/**
                  * ⚠️ A RECORD, NOT A CHOICE. This was a CHECKBOX — and a checkbox belongs to the
                  * JOURNEY, where the writer is choosing what went. On the reading card the same
                  * material is a statement of what is on file, so the tick is a MARK: it says
                  * "this is what would go", and it is not an input the card can be wrong about.
                  */}
                <div className="tdk-mats">
                  {(materials?.(card) ?? []).map((m) => (
                    <div className="tdk-mat" key={m.label}>
                      <span className="tdk-matic" aria-hidden>▤</span>
                      {/* ⚠️ NO SECOND LINE WHERE THERE IS NOTHING TRUE TO SAY — the element is absent, not empty. */}
                      <span className="tdk-mattx"><b>{m.label}</b>{m.sub && <span>{m.sub}</span>}</span>
                      <span className="tdk-mattick" aria-hidden>✓</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {flow === "agent-waiting" && !spec && (
              <div className="tdk-note">{HANDOFF_NOTE}</div>
            )}

            {flow === "offer" && (() => {
              /**
                * ⚠️ THE SECTION DOES NOT RENDER WHEN NOBODY IS HOLDING ANYTHING — it is not an
                * empty state. "No other agent holds your pages" is a sentence about a situation
                * that needs no action, and a heading over nothing is a section pretending to be
                * populated. The offer flow's own notify door still handles query-only agents.
                */
              const hold = holders?.(card) ?? [];
              /**
                * ⚠️ THE SECTION STATES ITS OWN EMPTINESS RATHER THAN VANISHING. A correctly-empty
                * section and an unbuilt one look identical on screen — neither the writer nor a
                * reviewer can tell which they are looking at, and §7 could not assert the
                * difference either.
                *
                * ⚠️ AND "NOBODY ELSE IS HOLDING ANYTHING" IS A FACT WORTH TELLING AT OFFER STAGE.
                * It means there is no one to notify, which is a real and reassuring answer rather
                * than an absence — the opposite of the empty-state-as-filler this codebase
                * otherwise refuses.
                */
              return (
                <>
                  <div className="tdk-fk">Who else holds material</div>
                  {!hold.length && <div className="tdk-holdnone">No other agent is holding material.</div>}
                  <div className="tdk-holds">
                    {hold.map((h) => (
                      <div className="tdk-hold" key={h.queryId}>
                        <span className="tdk-holdtx">
                          <b>{h.name}</b>
                          <span>{h.holds}{h.caution ? ` · ${h.caution}` : ""}</span>
                        </span>
                        {/* ⚠️ AN AFFORDANCE WITH NOTHING BEHIND IT GREYS AND SAYS WHY — it never
                            disappears and is never fabricated, the same law the hand-off follows. */}
                        {h.mail.href
                          ? <a className="tdk-holdmail" href={h.mail.href}>Draft a note</a>
                          : <span className="tdk-holdmail off" title={h.mail.why}>Draft a note</span>}
                      </div>
                    ))}
                  </div>
                  {hold.length > 0 && <div className="tdk-note">{HANDOFF_NOTE}</div>}
                </>
              );
            })()}

            {flow === "stale" && (
              <></>
            )}

            {flow === "user-task" && (
              <>
                {/**
                  * ⚠️ THE BODY OMITS WHATEVER THE BAND IS SHOWING — which is NOT the same rule as
                  * "the body never shows the title", and the difference is why the note's own words
                  * vanished from this page.
                  *
                  * The original rule was written for an AGENT card, where `bandSubject` returns the
                  * agent's name and repeating it in the body was the collision being fixed. For a
                  * user task `card.who` is always `""`, so `bandSubject` falls through to the
                  * STANDING LABEL "Your noteboard" — the band names the surface, not the note. With
                  * the title also withheld from the body, a note-taking feature rendered a pane that
                  * never showed you your note: every one read "Your note / Your noteboard" and
                  * nothing else, whatever it said.
                  *
                  * ⚠️ SO THE NOTE IS THE FIRST THING IN THE BODY, in the writer's own hand. It is
                  * the subject of the screen rather than a field on it — `card.detail` is the
                  * SECONDARY line and stays beneath it, which is the order it was always in.
                  */}
                {/* ⚠️ THE NOTE MOVED TO THE WIDE COLUMN (pane faults, Phase 2) — it is the content
                    of a note card, so it leads. Nothing is repeated here. */}
              </>
            )}

            {flow === "housekeeping" && (
              <></>
            )}
          </div>

          {/**
            * ⚠️ THE HAND-OFF — THE POINT OF THE PAGE (Phase 5). ScriptAlly does not send anything:
            * the send happens in the writer's own email or on the agency's site, and the app's job
            * is to hand them over with the recipient and subject already composed, then be told
            * what happened.
            *
            * ⚠️ AN AFFORDANCE WITH NOTHING BEHIND IT GREYS AND SAYS WHY — it never disappears and
            * it is never fabricated. A vanishing control leaves you wondering whether the app
            * knows something; a greyed one with "No email address on file for this agent" tells
            * you what to go and fix.
            *
            * ⚠️ AND THE LINK IS CALLED WHAT THE RECORD CALLS IT. There is no submissions-page
            * field on an agent, so this is "Their website" — labelling it a portal would assert
            * something the data does not know. (The `SAMPLE_PAGES` → "Opening sample" reasoning.)
            */}
          {sections.some((x) => x.id === "handoff") && (
            <div className="tdk-sect">
              <div className="tdk-sectk">{sections.find((x) => x.id === "handoff")!.label}</div>
              <div className="tdk-hoff">
                <a
                  className={`tdk-hbtn${hoff.mail.href ? "" : " off"}`}
                  href={hoff.mail.href ?? undefined}
                  title={hoff.mail.href ? `Open your email client to ${who}` : hoff.mail.why}
                  aria-disabled={hoff.mail.href ? undefined : true}
                  onClick={(e) => { if (!hoff.mail.href) e.preventDefault(); }}
                >
                  <Mail size={13} aria-hidden /> Open in email
                </a>
                <a
                  className={`tdk-hbtn quiet${hoff.web.href ? "" : " off"}`}
                  href={hoff.web.href ?? undefined}
                  target={hoff.web.href ? "_blank" : undefined}
                  rel="noreferrer"
                  title={hoff.web.href ? "Opens their website in a new tab" : hoff.web.why}
                  aria-disabled={hoff.web.href ? undefined : true}
                  onClick={(e) => { if (!hoff.web.href) e.preventDefault(); }}
                >
                  <Globe size={13} aria-hidden /> Their website
                </a>
              </div>
              {/* ⚠️ THE SUBJECT IS OFFERED AS TEXT AS WELL AS A LINK — a writer who composes in a
                  web client cannot use a `mailto:`, and would otherwise retype it. */}
              {hoff.subject && (
                <div className="tdk-subj">
                  <code>{hoff.subject}</code>
                  <button
                    type="button"
                    className="tdk-copy"
                    aria-label="Copy the subject line"
                    title={copied ? "Copied" : "Copy the subject line"}
                    onClick={() => {
                      void navigator.clipboard?.writeText(hoff.subject!).then(() => {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1600);
                      }).catch(() => { /* a refused clipboard is not an error worth a dialogue */ });
                    }}
                  >
                    <Copy size={12} aria-hidden />
                  </button>
                </div>
              )}
              <p className="tdk-hnote">{HANDOFF_NOTE}</p>
            </div>
          )}
          </div>{/* .tdk-work */}
          </>
          )}
        </EdgeFadeScroll>

        {/* ── THE FOOT ─────────────────────────────────────────────────────
            The flow's ink primary, the two quiet verbs, and where you are going next. */}

        {tagsSlot && card.userTaskId && (

          <div className="tdk-tags">{tagsSlot(card)}</div>

        )}

        {/**
          * ⚠️ THE CARD HAS A FOOTER AGAIN, AND THE DEED LIVES IN IT (ref `todo-journey-in-pane.html`
          * `.foot`). It was retired with the old foot bar on the reasoning that "two places to act
          * on one task is how they come to offer different verbs" — which was right about the
          * DANGER and wrong about the remedy: what the page ended up with was a card that simply
          * stops, its last section cut by the pane's edge, and the only act floating in a bar three
          * inches above the thing it acts on.
          *
          * ⚠️ THE VERB CANNOT DIVERGE, because there is one derivation. `primaryLabel` is the page's
          * own `rowPrimaryLabel` — the same function the command bar reads. That is what makes two
          * mounts safe where two vocabularies would not be.
          *
          * ⚠️ IT IS PINNED AND DOES NOT SCROLL. `flex: none` outside `.tdk-body`, so the body
          * scrolls under it and the deed is on screen whatever the record's length. That is also
          * what gives the body a bottom edge to scroll AGAINST — see the note on `.tdk-foot`.
          */}
        {/* ⚠️ PINNED, AS A SIBLING OF THE SCROLLER — see `PaneJourneyFoot`'s note for what building
            it inside the scroller actually did (the commit at y 1271 in a 1000px viewport). */}
        {recCohort && (
          <PaneRecordSweepFoot
            rows={recRows}
            onDismissAll={() => onDismissRecordSweep?.(card, recRows)}
            onCommit={async () => {
              if (!onCommitRecordSweep) return;
              setSaving(true);
              try { await onCommitRecordSweep(card, recRows); } finally { setSaving(false); }
            }}
            saving={saving}
          />
        )}

        {cohort && (
          <PaneSweepFoot
            rule={cohort.rule}
            rows={rows}
            onSkipRest={() => setSweepRows(skipTheRest(rows, cohort.rule))}
            onCommit={async () => {
              if (!onCommitSweep) return;
              setSaving(true);
              try { await onCommitSweep(card, rows); } finally { setSaving(false); }
            }}
            saving={saving}
          />
        )}

        {!cohort && !recCohort && draft && (
          <PaneJourneyFoot
            kind={journeyKind?.(card) ?? "send"}
            /* ⚠️ THE JOURNEY'S COMMIT NAMES THE DEED; THE CARD'S FOOTER SAYS "Action". That is the
               ref's own split and it is right: on the card the button OPENS something, so "Action"
               is honest; at the end of the form it PERFORMS something, and a button that performs
               must say what. `SendSpec.actLabel` exists for exactly this — its own comment calls it
               "the ink primary's words" — rather than a fourth phrasing invented here.
               `rowPrimaryLabel` is the ROW's shorthand and correctly returns "Action". */
            actLabel={(() => {
              const k = journeyKind?.(card) ?? "send";
              return k === "send" ? (spec?.actLabel ?? "Record it as sent") : JOURNEY_ACT[k];
            })()}
            value={draft}
            onCancel={() => setDraft(null)}
            onCommit={async () => {
              if (!onCommitSend) return;
              setSaving(true);
              try { await onCommitSend(card, draft); } finally { setSaving(false); }
            }}
            saving={saving}
          />
        )}

        {/* ⚠️ THE CARD'S FOOTER STANDS DOWN WHILE THE JOURNEY IS OPEN — the journey carries its own,
            with Cancel and the commit. Two footers would put two primaries on one card, and the
            outer one would offer to re-open a journey that is already open. */}
        {!draft && !cohort && !recCohort && (
          <div className="tdk-foot">
            {/* the consequence, stated before the act rather than discovered after it.
                ⚠️ IT TAKES THE REMAINING SPACE AND GIVES IT UP FIRST — `margin-right: auto` plus a
                min-width of 0, so on a narrow pane the hint truncates and then drops before any
                button wraps. Buttons never wrap to a second row: a verb on its own line reads as a
                different control from the three above it. */}
            <span className="tdk-foothint">Nothing is sent from here — this records what happened.</span>
            {(() => {
              const v = verbs?.(card);
              if (!v) return null;
              /* ⚠️ INAPPLICABLE VERBS GREY IN PLACE AND NEVER VANISH — an offer cannot be
                 dismissed, and a control that disappears leaves the writer wondering whether the
                 app knows something. The house disabled grammar, not opacity alone. */
              return (
                <>
                  <button type="button" className="tdk-vb" disabled={v.snooze.disabled}
                    onClick={(e) => v.snooze.onPress(e.currentTarget)}>
                    <Clock size={14} aria-hidden /> Snooze
                  </button>
                  <button type="button" className="tdk-vb" disabled={v.openQuery.disabled}
                    onClick={() => v.openQuery.onPress()}>
                    <ExternalLink size={14} aria-hidden /> Open query
                  </button>
                  <button type="button" className="tdk-vb" disabled={v.dismiss.disabled}
                    onClick={() => v.dismiss.onPress()}>
                    <X size={14} aria-hidden /> Dismiss
                  </button>
                  <span className="tdk-vbsep" aria-hidden />
                </>
              );
            })()}
            <button
              type="button"
              className="tdk-prime"
              onClick={() => {
                /* ⚠️ THE JOURNEY OPENS IN THE PANE WHERE ONE EXISTS FOR THIS BUCKET; everything else
                   still opens the takeover. That is what lets the buckets move one at a time. */
                if (onCommitSend) {
                  /* ⚠️ THE OFFER'S NOTIFY GROUPS SEED THE DRAFT — the two open differently, so the
                     opener needs the split rather than a flat list (see `seedNotify`). */
                  const h = journeyHolders?.(card);
                  setDraft(openSend(
                    (materials?.(card) ?? []).map((m) => m.label),
                    queryMethod?.(card),
                    new Date(),
                    (h?.holding ?? []).map((r) => r.queryId),
                    (h?.queried ?? []).map((r) => r.queryId),
                  ));
                  return;
                }
                onPrimary(card);
              }}
            >
              <Check size={14} aria-hidden />
              {primaryLabel?.(card) ?? "Action"}
            </button>
          </div>
        )}

        {/**
          * ⚠️ THE CARD'S FOOT BAR IS RETIRED (visual rebuild, Phase 4). It carried the ink primary,
          * the clock, the ⋯ and the NEXT line. Every one of those is on the COMMAND BAR now, which
          * spans both panes — and that is the point: two places to act on one task is how they
          * come to offer different verbs, and a bar inside the card could only ever act on the
          * card, while the page's bar states the list's count as well.
          *
          * ⚠️ WHAT WENT WITH IT, AND WHERE IT WENT: the named primary → the bar's pink button
          * (same `rowPrimaryLabel`); Snooze → the bar's clock, the FIFTH door onto the one dial;
          * ⋯ → the bar's `Open query` and `Dismiss`, which is what it actually reached; the
          * `NEXT:` forward look → the bar's previous/next pair, which says the same thing as a
          * position rather than as a name. Nothing became unreachable.
          */}
        </div>
      </section>
    </div>
  );
};
