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
import { dockFlowKind, sendSpecFor, nextInQueue, stepQueue, nextLabel, SendSpec } from "../../lib/todoDock";
import { SnoozeDial } from "./SnoozeDial";
import { handoffFor, panePosition, paneSections, HANDOFF_NOTE } from "../../lib/todoHandoff";
import { liveFamily } from "../../lib/todoFamily";
import { TASK_GROUP_META } from "../../lib/todoGroups";
import "./todoDock.css";

export interface DockTimelineEvent {
  key: string;
  label: string;
  when: string;
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
  onPrimary: (card: BoardCard, spec: SendSpec | null) => void;
  /* ⚠️ A DATED VERB (tasks-pages P2, walk fix 2). The old `onSnooze(card)` handed the choice to
     a page popover that never mounted for the dock — the clock button silently did nothing. The
     dock owns its own tier menu now (capped for offers) and reports the CHOSEN date. */
  onSnoozeDays: (card: BoardCard, days: number, when: string) => void;
  onMore: (card: BoardCard) => void;
  /** The agent's own contact fields and the manuscript's title — the hand-off is built from the
   *  record or is absent; the pane never invents either. */
  handoff?: (card: BoardCard) => { email?: string; website?: string; msTitle?: string };
  /** tasks-pages P5 — MOUNT 2 of 3: the item sheet's tag surface. The page supplies the ONE
   *  TagPicker for user-task cards; derived work cannot be tagged, so the slot stays empty. */
  tagsSlot?: (card: BoardCard) => React.ReactNode;
}

/** The seal's own duration — the ref's 600ms, restated here because the mount owns the timer
 *  and the stylesheet owns the keyframe; artSlots.test.ts holds them equal. */
const SEAL_MS = 600;
const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The ink primary's words per flow — the act, never a bare "Done". */
function primaryLabel(card: BoardCard): string {
  const spec = sendSpecFor(card);
  if (spec) return spec.actLabel;
  switch (dockFlowKind(card)) {
    case "offer": return "Answer the offer";
    case "stale": return "Close this query";
    case "user-task": return "Mark it done";
    case "agent-waiting": return "Log the nudge";
    default: return "Fill in the gap";
  }
}

export const TodoDock: React.FC<TodoDockProps> = ({
  queue, activeKey, onSelect, onClose, timeline, onPrimary, onSnoozeDays, onMore, tagsSlot, handoff,
}) => {
  const card = queue.find((c) => c.key === activeKey) ?? queue[0];
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  /* ⚠️ THE DIAL, ANCHORED TO THE CLOCK (Phase 6) — one snooze surface, four doors. The tier menu
     that stood here is retired; its own note said it existed because "the old `onSnooze(card)`
     handed the choice to a page popover that never mounted for the dock". The dial mounts here
     now, so that reason is spent. */
  const snoozeBtn = useRef<HTMLButtonElement | null>(null);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  /* ⚠️ ART · DOCK-SEAL (board-optimise P3/P4) — the wax-seal moment: struck the instant a flow
     completes, BEFORE the card animates to Done. It is a flourish over a finished act, so it is
     never mounted under reduced motion at all — the CSS stop is the belt to this brace. */
  const [sealing, setSealing] = useState(false);

  /* A new item arrives with its own decisions unmade — a confirmation carried over from the last
     one would be the surface agreeing to something on your behalf. */
  useEffect(() => { setConfirmSend(false); setSnoozeOpen(false); setSealing(false); }, [activeKey]);

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
    if (e.key === "Enter" && card) { e.preventDefault(); onPrimary(card, sendSpecFor(card)); }
  };

  useEffect(() => { surfaceRef.current?.focus(); }, []);

  const next = useMemo(() => (card ? nextInQueue(queue, card.key) : null), [queue, card]);
  if (!card) return null;

  const spec = sendSpecFor(card);
  const flow = dockFlowKind(card);
  const events = timeline(card);
  /* ⚠️ THE SECTIONS ARE DECLARED, NOT BRANCHED. `paneSections` owns which kinds carry what; this
     component asks whether a section is present and renders it. A card that branched inline on
     `taskType` would grow a private opinion about each kind. */
  const sections = paneSections(card);
  const src = handoff?.(card) ?? {};
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
        {sealing && <ArtSlot name="dock-seal" />}
        <div className={`tdk-band fam-${bandFamily(card)}`}>
          <i>{[card.kind, card.due].filter(Boolean).join(" · ")}</i>
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
          <aside className="tdk-story" aria-label="The story so far">
            <div className="tdk-storyk">THE STORY SO FAR</div>
            {/* Derived from the activity log, never stored. Absent when the record has no history
                yet, rather than an empty frame implying something is missing. */}
            {events.length > 0 ? (
              <ol className="tdk-tl">
                {events.map((e) => (
                  <li key={e.key}><span className="tdk-tlw">{e.when}</span><span>{e.label}</span></li>
                ))}
              </ol>
            ) : (
              <div className="tdk-storynone">Nothing logged yet.</div>
            )}
          </aside>

          <div className="tdk-work">
          <h2 className="tdk-t">{card.title}</h2>
          {card.record && <div className="tdk-rec">{card.record}</div>}

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

        <footer className="tdk-foot">
          <button
            type="button"
            className="tdk-prime"
            disabled={flow === "agent-waiting" && !!spec && !confirmSend}
            onClick={() => {
              /* The seal is struck first and the act follows immediately — the flourish rides
                 over the completion rather than delaying it. */
              if (!reducedMotion()) {
                setSealing(true);
                window.setTimeout(() => setSealing(false), SEAL_MS);
              }
              onPrimary(card, spec);
            }}
          >
            {primaryLabel(card)}
          </button>
          {/* ⚠️ ONE SNOOZE SURFACE, AND THIS IS ITS FOURTH DOOR (Phase 6). The two-tier menu that
              stood here — "Remind me tomorrow" / "Give it a week" — is RETIRED, not reshaped. It
              was built because the page's dial "never mounted for the dock", which stopped being
              true the moment the pane and the rail shared a screen: the rail's clock, the ⋯ menu's
              `Snooze…`, the `s` key and this button all reach the SAME control now.
              ⚠️ AND THE CEILING COMES WITH IT. The tier menu hand-rolled the offer cap by omitting
              its week row; the dial reads `snoozeCeilingDays`, so an offer's track ends at
              tomorrow with the unreachable tail hatched and the reason stated beneath it. Two
              surfaces for one act is how they come to disagree about a limit. */}
          <button
            ref={snoozeBtn}
            type="button"
            className="tdk-quiet"
            aria-label="Snooze"
            title="Snooze"
            aria-haspopup="dialog"
            aria-expanded={snoozeOpen}
            onClick={() => setSnoozeOpen((v) => !v)}
          >
            <Clock size={14} aria-hidden />
          </button>
          {snoozeOpen && snoozeBtn.current && (
            <SnoozeDial
              card={card}
              anchor={snoozeBtn.current}
              onSnooze={(days, when) => { setSnoozeOpen(false); onSnoozeDays(card, days, when); }}
              onClose={(returnFocus) => { if (returnFocus) snoozeBtn.current?.focus(); setSnoozeOpen(false); }}
            />
          )}
          <button type="button" className="tdk-quiet" aria-label="More" title="More" onClick={() => onMore(card)}>
            <MoreHorizontal size={15} aria-hidden />
          </button>
          <span className="tdk-next">{nextLabel(next) ?? "LAST IN THE QUEUE"}</span>
        </footer>
      </section>
    </div>
  );
};
