/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskPane — THE PORT of `design-refs/todo-actionbar-corrected.html`.
 *
 * ⚠️ THE MARKUP IS THE CONTRACT'S, ELEMENT FOR ELEMENT: `.pane` → `.ws` → `.paneCol` (`.fc.hdr`,
 * `.fc.work`, `.actbar`) beside `.fc.rec`. Class names are the contract's words; nothing is
 * renamed, nothing is added, and no class from the retired `TodoDock` appears anywhere here.
 *
 * ⚠️ THIS SUPERSEDES THE MATERIALS CONTRACT AND THE PANE CONTRACT FOR THE CHASSIS (workspace
 * round). What it replaces: a header band carrying the TILES, and a `.mid` scroller holding a form
 * card and a story card side by side. The record is a COLUMN now — it does not travel with the
 * work, and the tiles are inside it, because they are three facts about the record rather than
 * three facts about the task.
 *
 * ⚠️ THE PROP CONTRACT IS THE MOCKUP'S OWN `DATA` SHAPE. Its render reads
 * `{cls, deed, sub, btns, tiles, body, will, quiet, prim, tl}` and so does this. That is what stops the structure bending to suit the data: a journey supplies those
 * fields or it supplies null, and `null` is what the hidden tile row and the hidden timeline card
 * are FOR. Nothing here branches on a task type.
 *
 * ⚠️ THE BAND'S FIGURE IS GONE, NOT HIDDEN (pane round, Phase 2). The materials contract drew a
 * Playfair numeral on the right of the band; the pane contract's band is deed + sub + arrows, and
 * nothing renders a figure. So `fig`/`figU` are deleted rather than left as props with no reader —
 * the whole chain went with them (`PanePresence.figure`, `JourneyInputs.figure`, `.bandfig`), which
 * is the sweep the retirement asks for rather than four dead symbols in four files. The FIGURE
 * ITSELF still reaches the reader: it is the list row's right-hand fragment, which is where the
 * "two panes read as one page" rule always wanted it.
 *
 * ⚠️ BEHAVIOUR IS CARRIED, PRESENTATION IS NOT. The callbacks below are the retired pane's
 * contracts — the completion path, snooze, dismiss, open query, task navigation — and nothing else
 * crossed over: no styles, no layout, no markup.
 */
import React from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import type { TaskPaneFork, TaskPaneReceipt } from "../../lib/taskPaneJourney";
import { fillWidth, type PrimaryFill } from "../../lib/paneFill";
import "./taskPane.css";

/**
 * ⚠️ THE STORY HAS TWO KINDS OF ENTRY, AND THE TYPE SAYS SO (pane round, Phase 8).
 *
 * A STATUS event is drawn by the real `StatusDot` — the app's one drawing of a query status,
 * never recreated locally. A MARK is everything else the log holds: a nudge is the writer touching
 * the agent, not a status the query reached, and `NUDGE_SENT` has no `resultingStatus` precisely
 * because of that. The terminus is a third thing again — it is where the rail stops, not something
 * that happened.
 *
 * ⚠️ THE SPLIT IS HERE BECAUSE `StatusDot` WILL NOT REFUSE. Its prop is `QueryStatus | string`, so
 * "Nudge sent" and "Your turn" would go straight through it and render whatever the fallback
 * happens to be — a follow-up wearing the mark of a status it does not have. A permissive
 * signature is not a licence to pass anything; the caller that knows the difference is the one
 * that has to state it, and a discriminated union makes forgetting a compile error.
 */
interface RungBase {
  key: string;
  /** `.tl-e .t` — what happened */
  t: string;
  /** `.tl-e .d` — when, and how, in the mono beneath */
  d: string;
}
/** A rung that IS a query status. Nothing but an exact enum string reaches `StatusDot`. */
export interface TaskPaneStatusEvent extends RungBase {
  kind: "status";
  status: QueryStatus;
}
/** A rung that is NOT a status — today a nudge; a note kind arriving later needs no new branch. */
export interface TaskPaneMarkEvent extends RungBase {
  kind: "mark";
  /** `.tl-e.in` — the agent caused it. Presentation only; it does not make the rung a status. */
  incoming?: boolean;
}
/** The terminus: `['now', 'Your turn', 'Today']`. Part of the data, never appended by the pane. */
export interface TaskPaneNowEvent extends RungBase {
  kind: "now";
}
export type TaskPaneEvent = TaskPaneStatusEvent | TaskPaneMarkEvent | TaskPaneNowEvent;

/** One cell of the mockup's `tiles` array: `['Send to', '<a>Jonathan Marsh</a>', 'j.marsh@…']`. */
export interface TaskPaneTile {
  /** `.tile .k` */
  k: string;
  /** `.tile .val` — or, when absent, the mono `.val.absent` the mockup states absence in */
  val: React.ReactNode;
  /** `.tile .val small` — the second line, where there is one */
  small?: React.ReactNode;
  /** renders `.val.absent`: the mockup's own grammar for a fact the record does not hold */
  absent?: boolean;
}

/**
 * The mockup's `DATA[task]`, as a type. A journey fills this in; the pane renders it.
 */
export interface TaskPaneJourney {
  /** `u-now` · `u-house` · `u-yours` — the band's paper, set on `.v` exactly as the mockup does */
  cls: "u-now" | "u-house" | "u-yours";
  /** `.deed` — may carry an `<em>`, which the mockup renders burgundy italic */
  deed: React.ReactNode;
  /** `.deed.hand` — the Caveat variant a note's own words are written in */
  hand?: boolean;
  /** `.b-sub` */
  sub: React.ReactNode;
  /** `.bandbtns` — the mockup's `btns` array, in order */
  btns?: { label: string; onPress: (anchor: HTMLElement) => void }[];
  /** `.tiles.n{N}` — `null` hides the row, as the mockup's render does */
  tiles: TaskPaneTile[] | null;
  /* (`actTitle`/`actSub` are DELETED, not defaulted — workspace round, Phase 4. The whole chain went
     with them: `PaneCopy.heading`, `paneCopy(c).heading`, and `cardFootHint`, whose only caller was
     the sub-line. A prop with no reader is the shape this file has a standing note about.) */
  /** the journey's own fields — the whole of the worksheet */
  body: React.ReactNode;
  /** `.willrec b` — what pressing the primary will write */
  will: React.ReactNode;
  /** `.b-quiet` */
  quiet?: { label: string; onPress: () => void };
  /**
   * ⚠️ `.b-primary` — AND `null` IS THE FORK'S OWN STATE (journey round, Phase 2). While the fork is
   * showing, the pane has not been told what the writer wants, so there is no verb to offer and no
   * button is rendered. Snooze and Dismiss stay: both are honest answers to "not now".
   */
  prim: string | null;
  /** disables `.b-primary` — the mockup styles the state, so the pane can offer it */
  /** the primary's fill, its count and whether it has become ready — from `primaryFill` */
  fill?: PrimaryFill;
  /** the timeline card — `null` hides it, and the mid drops to one column */
  tl: TaskPaneEvent[] | null;
  /**
   * ⚠️ THE QUERY'S STATUS, ALREADY LABELLED. It arrives as the string `getStatusLabel` produces —
   * the app's ONE status-word function — rather than as a status this component would have to map.
   * A second map here is how the pane and the Query Centre come to call one status two things.
   */
  statusWord?: string;
  /** a cohort's numbers — present only on the bulk journey; see `taskPaneJourney` */
  bulk?: { count: number; touched: number };
  /**
   * ⚠️ WHAT IS STILL UNANSWERED, FROM THE ONE DECLARATION (steer round, Phase 5). The chip counts
   * this, the line names it, and the square sits on its first entry — three readings of one array
   * rather than three derivations that can drift.
   */
  missing?: { id: string; name: string }[];
  /** the writer pressed an incomplete primary; the bar states what is still owed */
  showMissing?: boolean;
  /** jump to a section and flash its label — the same route the square marks */
  onJump?: (id: string) => void;
  /** `.tl-foot a` */
  onOpenQuery?: () => void;
  /** ⚠️ THE ACTION BAR'S VERBS, on the pane because that is where the open task is (Phase 1/2).
   *  Absent means the journey does not offer it — the button is not rendered rather than disabled,
   *  because "this task cannot be snoozed" and "nothing is selected" are different sentences. */
  onSnooze?: (anchor: HTMLElement) => void;
  onDismiss?: () => void;
  /** the intent fork — present only while no intent is chosen */
  fork?: TaskPaneFork;
  /** the collapsed fork, once one is */
  receipt?: TaskPaneReceipt;
  /** answers were discarded when the intent changed */
  clearedNote?: boolean;
  /** the flow's own standing line — the fill-in's "records nothing and invents nothing" */
  flowInfo?: string;
}

export interface TaskPaneProps {
  journey: TaskPaneJourney;
  onPrimary: () => void;
  /** carried behaviour: where you are in the queue, and how to move */
  nav?: { index: number; total: number; label: string; onPrev: () => void; onNext: () => void };
}

/* (`entryCount` is deleted with the count it fed — workspace round, Phase 1. The story header
   stopped stating "3 entries" when it became the Query Centre's status band, and the function has
   had no caller since; a reachability sweep is what this repo asks for rather than a dead symbol
   kept because it is small.) */

/**
 * ⚠️ ONE RUNG, THREE CASES, CLOSED WITH `never`. The next entry kind cannot be added without
 * saying how it is drawn — which is the guard the app-wide rule asks for and the reason the union
 * exists rather than a `kind` string with a default branch.
 */
function rung(e: TaskPaneEvent): React.ReactNode {
  switch (e.kind) {
    case "status":
      return (
        <div className="tl-e" key={e.key}>
          {/* the real dot, at the dense-timeline size `QueryTimeline` already uses; decorative
              because the event's own title sits beside it and states the same thing in words */}
          <span className="sd"><StatusDot status={e.status} overrideSize={12} decorative /></span>
          <div className="t">{e.t}</div>
          <div className="d">{e.d}</div>
        </div>
      );
    case "mark":
      return (
        <div className={e.incoming ? "tl-e minor in" : "tl-e minor"} key={e.key}>
          {/* ⚠️ EMPTY ON PURPOSE. `.sd` is a SLOT when a status dot goes in it and the GLYPH when
              nothing does, so a non-status rung needs no class the contract does not have. */}
          <span className="sd" />
          <div className="t">{e.t}</div>
          <div className="d">{e.d}</div>
        </div>
      );
    case "now":
      return (
        <div className="tl-e now" key={e.key}>
          <span className="sd" />
          <div className="t">{e.t}</div>
          <div className="d">{e.d}</div>
        </div>
      );
    default: {
      const unhandled: never = e;
      return unhandled;
    }
  }
}

export const TaskPane: React.FC<TaskPaneProps> = ({ journey: d, onPrimary, nav }) => {
  /**
   * ⚠️ THE RECORD CARD RENDERS WHERE THERE IS A RECORD, AND ITS ABSENCE IS THE SPLIT'S OWN ANSWER
   * (workspace round, Phase 1). `panePresence` already decides this once, per card — tiles and a
   * timeline for a query, neither for a cohort or a note — so the split reads that decision rather
   * than taking a second one. A bulk journey concerns MANY queries and a note concerns none, so
   * neither has a single record to stand beside; both get the full-width worksheet, which is what
   * `.ws--solo` collapses the grid to.
   */
  const hasRecord = !!((d.tiles && d.tiles.length > 0) || (d.tl && d.tl.length > 0));

  /**
   * ⚠️ `useId`, NOT A LITERAL. Workspace pages stay MOUNTED under the display-toggling shell, so a
   * hard-coded id becomes a duplicate the moment a second surface renders this component — and an
   * `aria-describedby` resolving by id then points at whichever copy comes first in the document.
   * `TaskPaneBody` takes an `idPrefix` prop for the same reason; this needs one id, so it generates
   * one rather than growing a prop for it.
   */
  const countId = React.useId();

  /**
   * ⚠️ ONE NUDGE, AT THE TRANSITION, AND NEVER ON MOUNT (Phase 7). The contract asks for a single
   * 3.5% beat "at the moment it becomes ready" — the one "you can go now". A journey that requires
   * nothing (a note's tick, the fill-in's "I can't remember") is ready on its first render, so a
   * naive rising-edge check would fire the beat as the pane opens, where it means nothing.
   *
   * `null` is the never-rendered state, which is why the ref is not simply `false`: the first pass
   * records where the button started and beats for nothing.
   */
  const ready = d.fill?.ready ?? true;
  const [nudge, setNudge] = React.useState(false);
  const wasReady = React.useRef<boolean | null>(null);
  React.useEffect(() => {
    const first = wasReady.current === null;
    const rose = !first && ready && wasReady.current === false;
    wasReady.current = ready;
    if (!rose) return;
    setNudge(true);
    const t = setTimeout(() => setNudge(false), 420);
    return () => clearTimeout(t);
  }, [ready]);
  return (
    <div className="tpn">
      {/* ⚠️ THE COUNTER ROW IS GONE AND ITS HEIGHT WENT TO THE PANE (pane round, Phase 1). It said
          "TASK 11 OF 14 · YOUR TASKS" above the card — a number the list's own footer already
          states, spending ~40px to hold the pane's top edge below the list's. The arrows survive,
          in the band, where the contract puts them; the count does not survive at all, because the
          one that mattered is beside the rows it counts. */}
      {/* ⚠️ WORKSHEET LEFT, RECORD RIGHT (workspace round, Phase 1; ref
          `design-refs/todo-actionbar-corrected.html`). The middle used to be a WRAPPING FLEX ROW of
          a form card and a story card, both inside one scroller — so the story travelled with the
          form, the tiles sat in the header band, and a long journey scrolled the record out of
          sight exactly when it was being consulted. The record is a COLUMN now, 288px, and it does
          not move.

          ⚠️ THE TILES MOVED WITH IT, and out of the band entirely. They are three facts about the
          record; the band is the deed and the arrows and nothing else. */}
      <div className={`pane ${d.cls}`}>
        {/* ⚠️ THE HEADER SPANS THE WHOLE PANE, ABOVE BOTH COLUMNS (owner's call, mid-round). It was
            the first card INSIDE the worksheet column, which made the deed 390px wide at 1440 and
            put a hard edge between it and the record — as though the sentence were about the form
            rather than about the task. It is the task's own statement, and both columns are answers
            to it, so it sits above both.

            ⚠️ IT IS A SIBLING OF `.ws`, NOT A GRID ITEM SPANNING IT. A `grid-column: 1 / -1` row
            would have to share the grid's height model with the two columns beneath, and the whole
            of Phase 2 rests on `.ws` being a stretch row whose height IS the pane's remaining
            space. Header fixed, row fills — the same two-part chain, one level up. */}
        <div className="fc hdr"><div className="rim">
          <div className="band">
            <div style={{ minWidth: 0 }}>
              <div className={d.hand ? "deed hand" : "deed"}>{d.deed}</div>
              {/* absent, not empty — a rendered `.b-sub` holding nothing is a blank line under
                  the deed, and blank space under a heading reads as something that failed to
                  load */}
              {d.sub ? <div className="b-sub">{d.sub}</div> : null}
            </div>
            {/* ⚠️ THE ARROWS LIVE HERE, not in a counter row above the card — Phase 1's
                retirement. */}
            {nav && (
              <div className="b-nav">
                <button type="button" onClick={nav.onPrev} aria-label="Previous task">‹</button>
                <button type="button" onClick={nav.onNext} aria-label="Next task">›</button>
              </div>
            )}
          </div>
        </div></div>

        <div className={hasRecord ? "ws" : "ws solo"}>
          {/* ⚠️ THE PANE COLUMN'S TWO PARTS, IN ORDER — worksheet, then bar. The bar is the LAST
              CHILD of the column rather than anything's footer, which is what puts its bottom edge
              on the record's. */}
          <div className="paneCol">
            {/* ⚠️ THE WORK SCROLLS INSIDE THE CARD'S RIM, NEVER BEHIND THE BAR (Phase 2). `.rim`
                carries `overflow: hidden`, so work leaves at the card's edge and there is nothing
                underneath it to reappear in. The bar below is a SIBLING, not a lid. */}
            <div className="fc work"><div className="rim">
              {/* ⚠️ NO FORM HEADING AND NO SUB-LINE (workspace round, Phase 4). "Sent it? Note it
                  here" sat under a deed reading "Send your full manuscript for Murphy's Day Out to
                  Jonathan Marsh" — the same instruction, in weaker words, three centimetres below
                  the sentence that had already given it. The deed IS the heading. The close
                  journey's reassurance was real content rather than a restatement, so it moved to
                  the `When` row's hint, which is where it is read. */}
              <div className="workscroll">
                <div className="form">
                  {/* ⚠️ THE FORK IS THE FIRST QUESTION (journey round, Phase 2; ref
                      `design-refs/todo-journey-logic.html`). A journey starts with the DECISION, not
                      the paperwork: the pane asks what the writer wants to do, and each intent gets
                      its own short ledger, its own primary verb, and where it belongs a crossover
                      into a neighbouring journey. Before this the pane opened straight onto a form
                      that assumed the answer — a send card assumed you had sent it. */}
                  {d.fork && (
                    <div className="forkwrap">
                      <div className="forklbl">
                        {/* the steer square marks the FORK until an intent is chosen — one marker,
                            and it points at the thing you are up to, which is this */}
                        <span className="sqm" aria-hidden />
                        {d.fork.label}
                      </div>
                      <div className="fork" role="group" aria-label={d.fork.label}>
                        {d.fork.options.map((o) => (
                          <button type="button" className="fk" key={o.id}
                            onClick={() => d.fork!.onChoose(o.id)}>
                            <span className="t">{o.title}</span>
                            <span className="s">{o.subtitle}</span>
                            {/* ⚠️ A CROSSOVER SAYS SO BEFORE IT IS PRESSED. Swapping the whole
                                journey without warning would read as the pane losing its place. */}
                            {o.crossesTo && <span className="x">crosses to {o.crossesTo} →</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* the collapsed fork — one line, and the way back */}
                  {d.receipt && (
                    <div className="receipt">
                      {d.receipt.kind === "chose" ? (
                        <>
                          <span className="rk">You chose</span>
                          <span className="rv">{d.receipt.label}</span>
                          <button type="button" className="rlink"
                            onClick={d.receipt.onChange}>Change</button>
                        </>
                      ) : (
                        <>
                          <span className="rk">Crossed from</span>
                          <span className="rv">{d.receipt.journey}</span>
                          <button type="button" className="rlink"
                            onClick={d.receipt.onBack}>Go back</button>
                        </>
                      )}
                    </div>
                  )}

                  {/* ⚠️ SAID ONCE, AND ONLY WHERE ANSWERS WERE ACTUALLY DISCARDED. They answered a
                      different question, so keeping them would put the old intent's answers under
                      the new one's verb. */}
                  {d.clearedNote && (
                    <div className="cleared">Your answers to the previous choice were cleared.</div>
                  )}

                  {d.flowInfo && <div className="flowinfo">{d.flowInfo}</div>}

                  {d.body}
                </div>
              </div>
            </div></div>

            {/* ⚠️ THE ACTION BAR IS THE COLUMN'S LAST CHILD, and it is where Snooze and Dismiss
                live — they act on the OPEN TASK, and this is where the open task is. The
                will-record strip states the actual values the primary will write, so the button is
                never the only description of what pressing it does. */}
            <div className="actbar">
              {/* ⚠️ THE STRIP YIELDS TO THE MISSING LINE, IT DOES NOT COMPETE WITH IT. Both in the
                  bar at once is two sentences fighting for one row, and the will-record is restated
                  in the form — so when the writer has just been told what is still owed, that is
                  what the bar says. It comes back the moment the line clears. */}
              {/* ⚠️ THE LEAD-IN IS THE ONLY MONO LEFT, and it is a LABEL — "This records" names what
                  follows and then gets out of the way. The sentence after it is Inter, sentence
                  case and wrapping.
                  ⚠️ AND THE COMMENT SITS OUTSIDE THE `&&` — a braced comment is a CHILD, and there
                  is no child position at the head of an expression. */}
              {!(d.showMissing && d.missing && d.missing.length > 0) && (
                <span className="willrec"><span className="lead">This records</span>{d.will}</span>
              )}
              {d.showMissing && d.missing && d.missing.length > 0 && (
                /* ⚠️ IT WRAPS RATHER THAN TRUNCATING. A line that says which answers are missing is
                    useless with the last two clipped off — which is what `text-overflow: ellipsis`
                    would do to it, and why this is not the will-record strip wearing different
                    words. */
                <span className="miss">
                  Still to answer:{" "}
                  {d.missing.map((m, i) => (
                    <React.Fragment key={m.id}>
                      {i > 0 && (i === d.missing!.length - 1 ? " and " : ", ")}
                      <a href="#" onClick={(e) => { e.preventDefault(); d.onJump?.(m.id); }}>{m.name}</a>
                    </React.Fragment>
                  ))}
                </span>
              )}
              {d.onSnooze && (
                <button type="button" className="ab quiet"
                  onClick={(e) => d.onSnooze?.(e.currentTarget)}>Snooze</button>
              )}
              {d.onDismiss && (
                /* ⚠️ "Dismiss all" ON A COHORT, and the title says what "all" means. It dismisses
                   the COHORT TASK, not n queries — the queries are untouched, which is the
                   distinction the confirm dialog spends a paragraph on and this button has one word
                   for. */
                <button type="button" className="ab quiet" onClick={d.onDismiss}
                  title={d.bulk ? "Dismisses the whole cohort task — the queries are unchanged" : undefined}>
                  {d.bulk ? "Dismiss all" : "Dismiss"}
                </button>
              )}
              {/* ⚠️ THE COUNT RIDES ON THE PRIMARY, NOT BESIDE IT. A number elsewhere in the bar is
                  a fact about the form; on the button it is a fact about what pressing it will do —
                  and the button is where the writer's hand already is. Absent when complete, because
                  a chip reading "0 to answer" is a control describing its own emptiness. */}
              {/* ⚠️ NO PRIMARY UNTIL AN INTENT IS CHOSEN — there is no verb to offer yet, and a
                  button that guessed would be the pane assuming the answer to its own first
                  question. Snooze and Dismiss above stay, because both are honest answers to
                  "not now". */}
              {d.prim !== null && (() => {
                const f = d.fill ?? { pct: 1, count: null, ready: true };
                return (
                  <>
                    {/* ⚠️ THE COUNT SITS OUTSIDE THE BUTTON NOW (Phase 7), and this reverses an
                        earlier decision rather than drifting from it. It rode ON the primary as a
                        burgundy chip, which put a number counting REQUIREMENTS on a control whose
                        own label already counts something else on the cohort — and, once the
                        button fills in proportion to the same set, a chip restating it is the
                        third expression of one fact within four centimetres. Absent at zero. */}
                    {f.count && <span className="count" id={countId} aria-live="polite">{f.count}</span>}
                    <button
                      type="button"
                      className={"ab go prime" + (f.ready ? " ready" : "") + (nudge ? " nudge" : "")}
                      /**
                       * ⚠️ IT LOOKS DISABLED AND IS NOT, WHICH IS THE WHOLE OF THIS PHASE. A truly
                       * disabled button is a dead end — no click, no focus, nothing to announce and
                       * no way to discover what is missing. `onPrimary` already opens the first
                       * unanswered question and focuses it; `disabled` was preventing the one route
                       * out of the state it described.
                       */
                      aria-disabled={f.ready ? undefined : true}
                      aria-describedby={f.count ? countId : undefined}
                      onClick={onPrimary}
                    >
                      {/* the fill is a sibling, beneath the label — see `.prime .t`'s z-index */}
                      <span className="fill" style={{ width: fillWidth(f) }} aria-hidden />
                      <span className="t">{d.prim}</span>
                    </button>
                  </>
                );
              })()}
            </div>
          </div>

          {/* ⚠️ THE RECORD — one card, its own column, and it does not scroll with the work.
              Header and the query link are fixed; only the middle moves (Phase 2). */}
          {hasRecord && (
            <div className="fc rec"><div className="rim">
              {/* ⚠️ THE HEAD SPEAKS THE QUERY CENTRE'S VOICE (deed round, Phase 3): the sage band
                  the Tracking panel wears, with the query's own STATUS on the right in Playfair. It
                  was an entry COUNT — "3 entries" — which is a fact about the list rather than about
                  the query, and the one thing a writer glancing at a record wants is where the
                  query stands. `statusWord` arrives already through `getStatusLabel`, the app's ONE
                  status-word function, so this card and the Centre's pill cannot come to call one
                  status two things. */}
              <div className="rhead">
                <span className="t">The record</span>
                {d.statusWord && <span className="stat">{d.statusWord}</span>}
              </div>
              <div className="recscroll">
                {/* ⚠️ THE TILES ARE STACKED, NOT A ROW. A 288px column cannot carry three cells
                    side by side, and the facts read better one to a line with a hairline between
                    them than squeezed into thirds. */}
                {d.tiles && d.tiles.length > 0 && (
                  <div className="rtiles">
                    {d.tiles.map((t, i) => (
                      <div className="rtile" key={`${t.k}-${i}`}>
                        <div className="k">{t.k}</div>
                        {t.absent
                          ? <div className="v absent">{t.val}</div>
                          : <div className="v">{t.val}{t.small && <small>{t.small}</small>}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {d.tl && d.tl.length > 0 && (
                  <div className="rtl">
                    <div className="tl">{d.tl.map(rung)}</div>
                  </div>
                )}
              </div>
              {d.onOpenQuery && (
                <div className="rfoot">
                  <a href="#" onClick={(ev) => { ev.preventDefault(); d.onOpenQuery?.(); }}>
                    Open the full query →
                  </a>
                </div>
              )}
            </div></div>
          )}
        </div>
      </div>
    </div>
  );
};
