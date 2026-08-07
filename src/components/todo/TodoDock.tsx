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
 * ⚠️ ONE ENGINE, TWO ENTRANCES. "Focused session" in the tool row and "Work the list" on Today
 * both open this. Two work surfaces would have to agree about what "done" means, and the first
 * time they disagreed one of them would be silently wrong.
 *
 * ⚠️ IT PERFORMS NOTHING ITSELF. Every act is handed up to the page, which runs the EXISTING
 * primitive — `recordMaterialsSent`, `quickDone`, the offer flow, the close dialogue. The dock
 * decides what to OFFER; it never decides what happens.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clock, MoreHorizontal, X } from "lucide-react";
import { BoardCard } from "../../lib/todoBoard";
import { ArtSlot } from "./ArtSlot";
import { bandFamily } from "../../lib/todoColumns";
import { dockFlowKind, sendSpecFor, nextInQueue, stepQueue, nextLabel, SendSpec } from "../../lib/todoDock";
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
  queue, activeKey, onSelect, onClose, timeline, onPrimary, onSnoozeDays, onMore, tagsSlot,
}) => {
  const card = queue.find((c) => c.key === activeKey) ?? queue[0];
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
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

  return (
    <div className="tdk" role="dialog" aria-label="Work surface" onKeyDown={onKeyDown} tabIndex={-1} ref={surfaceRef}>
      {/* ── LEFT · THE QUEUE ──────────────────────────────────────────────
          Slim rails in the board's own order. The docked one is ringed in ink; the others stay
          legible rather than dimmed, because they are where you are going next. */}
      <aside className="tdk-q" aria-label="Queue">
        <div className="tdk-qcap">{queue.length} to work through</div>
        {queue.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`tdk-rail fam-${bandFamily(c)}${c.key === card.key ? " on" : ""}`}
            aria-current={c.key === card.key ? "true" : undefined}
            onClick={() => onSelect(c.key)}
          >
            <span className="tdk-railk">{c.kind}</span>
            <span className="tdk-railt">{c.title}</span>
          </button>
        ))}
      </aside>

      {/* ── RIGHT · THE WORK SURFACE ─────────────────────────────────────── */}
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
            not be read together. The 30/70 outer split STANDS: a slide-over would hide the
            queue, and the queue is half the point. */}
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
          <span className="tdk-snzwrap">
            <button type="button" className="tdk-quiet" aria-label="Snooze" title="Snooze" aria-haspopup="menu" aria-expanded={snoozeOpen} onClick={() => setSnoozeOpen((v) => !v)}>
              <Clock size={14} aria-hidden />
            </button>
            {snoozeOpen && (
              <div className="tdk-snzmenu" role="menu" aria-label="Snooze">
                <button type="button" role="menuitem" onClick={() => { setSnoozeOpen(false); onSnoozeDays(card, 1, "tomorrow"); }}>Remind me tomorrow</button>
                {/* ⚠️ AN OFFER'S SNOOZE IS CAPPED AT TOMORROW — the week tier is ABSENT for it,
                    not disabled: a tier that can never be chosen is not a choice. */}
                {card.taskType !== "offer_received" && (
                  <button type="button" role="menuitem" onClick={() => { setSnoozeOpen(false); onSnoozeDays(card, 7, "in a week"); }}>Give it a week</button>
                )}
              </div>
            )}
          </span>
          <button type="button" className="tdk-quiet" aria-label="More" title="More" onClick={() => onMore(card)}>
            <MoreHorizontal size={15} aria-hidden />
          </button>
          <span className="tdk-next">{nextLabel(next) ?? "LAST IN THE QUEUE"}</span>
        </footer>
      </section>
    </div>
  );
};
