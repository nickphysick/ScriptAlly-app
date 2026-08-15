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
import { Clock, MoreHorizontal, X, ChevronLeft, ChevronRight, Mail, Globe, Copy } from "lucide-react";
import { BoardCard } from "../../lib/todoBoard";
import { ArtSlot } from "./ArtSlot";
import { bandFamily } from "../../lib/todoColumns";
import { dockFlowKind, sendSpecFor, stepQueue, SendSpec } from "../../lib/todoDock";
import { handoffFor, panePosition, paneSections, bandFacts, trackingStats, bandPreline, bandSubject, bandUnder, HANDOFF_NOTE } from "../../lib/todoHandoff";
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
  /** The ring's state, from the same StatusDot logic the rest of the app draws. */
  ring?: "out" | "in" | "now";
}

export interface TodoDockProps {
  /** The queue — the board's current column order, filtered view already respected. */
  queue: BoardCard[];
  /** The docked card's key. */
  activeKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  /** The timeline, derived by the page from the activity log. */
  timeline: (card: BoardCard) => DockTimelineEvent[];
  /** The flow's ink act. `spec` is present only for the send flow. */
  /** ⚠️ NO `spec` — the primary OPENS THE JOURNEY and the journey commits, so the dock has
   *  nothing to pre-resolve. It used to hand a `SendSpec` straight to an inline write. */
  onPrimary: (card: BoardCard) => void;
  /* ⚠️ RETIRED WITH THE FOOT BAR (visual rebuild, Phase 4). The card no longer offers a snooze at
     all — the command bar does, opening the ONE dial. The prop is gone rather than left unused:
     an unused prop is a slot a future surface fills without anyone deciding it should exist. */
  onMore: (card: BoardCard) => void;
  /** The agent's own contact fields and the manuscript's title — the hand-off is built from the
   *  record or is absent; the pane never invents either. */
  handoff?: (card: BoardCard) => {
    email?: string; website?: string; msTitle?: string;
    /** The band's facts strip — derived by the page, which holds the query and the clock. */
    sentLabel?: string; sentValue?: string; waitLabel?: string; waitValue?: string;
  };
  /** tasks-pages P5 — MOUNT 2 of 3: the item sheet's tag surface. The page supplies the ONE
   *  TagPicker for user-task cards; derived work cannot be tagged, so the slot stays empty. */
  tagsSlot?: (card: BoardCard) => React.ReactNode;
}



export const TodoDock: React.FC<TodoDockProps> = ({
  queue, activeKey, onSelect, onClose, timeline, onPrimary, onMore, tagsSlot, handoff,
}) => {
  const card = queue.find((c) => c.key === activeKey) ?? queue[0];
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [copied, setCopied] = useState(false);

  /* A new item arrives with its own decisions unmade — a confirmation carried over from the last
     one would be the surface agreeing to something on your behalf. */
  useEffect(() => { setConfirmSend(false); }, [activeKey]);

  /* ⚠️ KEYBOARD. Esc closes, ↑↓ walk the queue, Enter is the primary. Bound on the surface rather
     than the document so it cannot reach past an open popover or a field the flow owns. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    const editing = (e.target as HTMLElement)?.closest("input, textarea, select");
    if (editing) return; // never steal keys from something being typed into
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const to = stepQueue(queue, card?.key ?? "", e.key === "ArrowDown" ? 1 : -1);
      if (to) { e.preventDefault(); onSelect(to.key); }
    }
    if (e.key === "Enter" && card) { e.preventDefault(); onPrimary(card); }
  };

  useEffect(() => { surfaceRef.current?.focus(); }, []);

  if (!card) return null;

  const spec = sendSpecFor(card);
  const flow = dockFlowKind(card);
  const events = timeline(card);
  /* ⚠️ THE SECTIONS ARE DECLARED, NOT BRANCHED. `paneSections` owns which kinds carry what; this
     component asks whether a section is present and renders it. A card that branched inline on
     `taskType` would grow a private opinion about each kind. */
  const sections = paneSections(card);
  const src = handoff?.(card) ?? {};
  const facts = bandFacts(src.sentLabel ?? null, src.sentValue ?? null, src.waitLabel ?? null, src.waitValue ?? null);
  /* the stat pair reads the SAME two facts the band does — one derivation, two presentations */
  const stats = trackingStats(facts);
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
        <div className={`tdk-band fam-${bandFamily(card)}`}>
          <div className="tdk-id">
            <span className="tdk-av" aria-hidden>{card.initials}</span>
            <span className="tdk-idtx">
              {/* the pre-line names the ACT, so the band reads as a sentence into the name */}
              <span className="tdk-pre">{bandPreline(card)}</span>
              <span className="tdk-name">{bandSubject(card)}</span>
              {bandUnder(card) && <span className="tdk-agency">{bandUnder(card)}</span>}
            </span>
          </div>
          {/* ⚠️ TOP-ALIGNED TO THE IDENTITY BLOCK AND `flex-shrink: 0` — it is a fixed pair of
              facts beside a block that wraps, never the other way round. */}
          {facts.length > 0 && (
            <span className="tdk-facts">
              {facts.map((f) => (
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
        <div className="tdk-body">
          <aside className="tdk-story" aria-label="Tracking">
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
            <div className="tdk-storyk">TRACKING</div>
            {/* Derived from the activity log, never stored. Absent when the record has no history
                yet, rather than an empty frame implying something is missing. */}
            {events.length > 0 ? (
              <ol className="tdk-tl">
                {events.map((e) => (
                  <li key={e.key} className={e.ring ? `r-${e.ring}` : undefined}>
                    <span className="tdk-tlw">{e.when}</span>
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
          </aside>

          <div className="tdk-work">
          {/* ⚠️ NO TITLE AND NO AGENT HERE (corrections, Phase 1). The band says who this is and
              what the act is; repeating either in the body was what put a name in the right-hand
              column with the facts floating over it. The body is the DOING. */}

          {/* ── THE REAL FLOW, INLINE ────────────────────────────────────── */}
          <div className="tdk-flow">
            {flow === "agent-waiting" && spec && (
              <>
                <div className="tdk-fk">What goes</div>
                {/* The writer CONFIRMS rather than chooses from scratch: the task already knows
                    what was asked for, and offering a free choice would invite the wrong one. */}
                <label className="tdk-check">
                  <input type="checkbox" checked={confirmSend} onChange={(e) => setConfirmSend(e.target.checked)} />
                  The {spec.material}{spec.isResubmit ? ", resubmitted" : ""} — as {card.who || "they"} asked
                </label>
              </>
            )}

            {flow === "agent-waiting" && !spec && (
              <div className="tdk-note">A nudge is a message, not a send — logging it records the chase.</div>
            )}

            {flow === "offer" && (
              <div className="tdk-note">An offer has a reply-by date. Answering it opens the offer flow, where the decision and the other agents are handled together.</div>
            )}

            {flow === "stale" && (
              <div className="tdk-note">Closing records no response — not a rejection, so your response rate stays honest.</div>
            )}

            {flow === "user-task" && (
              <>
                {card.detail && <p className="tdk-detail">{card.detail}</p>}
                <div className="tdk-note">Your own task — ticking it is what finishes it.</div>
              </>
            )}

            {flow === "housekeeping" && (
              <div className="tdk-note">A gap on the agent's record. Filling it opens their profile at the field.</div>
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
        </div>

        {/* ── THE FOOT ─────────────────────────────────────────────────────
            The flow's ink primary, the two quiet verbs, and where you are going next. */}

        {tagsSlot && card.userTaskId && (

          <div className="tdk-tags">{tagsSlot(card)}</div>

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
      </section>
    </div>
  );
};
