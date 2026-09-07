/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QuickActionPopover — snooze and close as ONE decision each (quick actions §4;
 * ref design-refs/query-quick-actions-v2.html).
 *
 * ⚠️ THE PREMISE IT CORRECTS. `query-views-2` §2 said every list action opens the desk with the
 * drawer behind it, because the desk needs a host and its ghost rung needs a rail. That is right
 * for Record response and Mark sent, which COMPOSE a record and want the timeline visible while
 * they do it. It is wrong for snooze and close, which are one decision each: opening a drawer, a
 * desk and a preview rung to answer "in two weeks" costs the reader their place on the list and
 * three surfaces they did not ask for.
 *
 * ⚠️ SO THE RULE IS STATED AS AN ABSENCE, AND IT IS THE SECTION'S WHOLE CLAIM: no drawer, no
 * desk, no route change, and on the list no change of selection. A popover that quietly selected
 * the row would scroll the reading pane to it and re-render half the page — invisible in a
 * screenshot and obvious to anyone using it.
 *
 * ⚠️ ONE COMPONENT, THREE ANCHORS, IDENTICAL COPY. The list's action button, the drawer's verb
 * row and the dotted reminder phrase all mount THIS, so the three cannot drift into three
 * dialects of the same question. That is asserted by comparing the rendered text from each
 * anchor, not by three specs each checking its own copy.
 *
 * ⚠️ AND THE CHASSIS IS §1'S, NOT A SECOND ONE. `F12Popover chassis="mount"` already draws the
 * parchment rim, the framed body and the sage band; this passes a glyph and a title into it. A
 * bespoke shell here would be the fork the toolbar sections just finished removing.
 */
import React from "react";
import { F12Popover } from "../shell/F12Shell";
import { SnoozeDialBody } from "../todo/SnoozeDial";
import { QueryStatus } from "../../types";
import "./quickAction.css";

export type QuickActionKind = "snooze" | "close";

/** The three ways a query ends, in the ref's order, with the words the ref uses. */
export const CLOSE_REASONS: { status: QueryStatus; label: string; mark: string }[] = [
  { status: QueryStatus.REJECTED, label: "They passed", mark: "×" },
  { status: QueryStatus.WITHDRAWN, label: "I withdrew it", mark: "−" },
  { status: QueryStatus.NO_RESPONSE, label: "No reply — gone quiet", mark: "···" },
];

export interface QuickActionPopoverProps {
  kind: QuickActionKind;
  /** the query's own title, for the dial's accessible name — never rendered as a heading */
  title: string;
  /** "3 Oct", or null where no reminder is set yet */
  dueLabel: string | null;
  style?: React.CSSProperties;
  panelRef?: React.RefObject<HTMLElement | null>;
  onDismiss: () => void;
  /** snooze — the one write, in days, already the dial's own clamped value */
  onSnooze?: (days: number, when: string) => void;
  onStopNudging?: () => void;
  /** close — one activity, dated today */
  onCloseQuery?: (status: QueryStatus) => void;
  /** the full path out: the drawer at Tracking, where a date and a note are available */
  onOpenQuery?: () => void;
}

const BELL = (
  <span className="qa-glyph" aria-hidden="true">
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 20a2 2 0 004 0" />
    </svg>
  </span>
);
const CROSS = <span className="qa-glyph qa-glyph--dim" aria-hidden="true">{"×"}</span>;

export const QuickActionPopover: React.FC<QuickActionPopoverProps> = ({
  kind, title, dueLabel, style, panelRef, onDismiss,
  onSnooze, onStopNudging, onCloseQuery, onOpenQuery,
}) => (
  <F12Popover
    width={kind === "snooze" ? 268 : 250}
    chassis="mount"
    glyph={kind === "snooze" ? BELL : CROSS}
    title={kind === "snooze" ? "Snooze the nudge" : "Close this query"}
    style={style}
    panelRef={panelRef}
    onClose={onDismiss}
  >
    {kind === "snooze" ? (
      <>
        {/* ⚠️ THE SUB-LINE PROMISES WHAT THE WRITE ACTUALLY DOES, and the write is the reminder
            and nothing else — no activity, no status, no rung on the timeline. A sentence here
            saying anything wider would be copy asserting a behaviour the code does not have. */}
        <p className="qa-sub">
          {dueLabel
            ? <>Currently due <b>{dueLabel}</b>. Pushing it back changes only the reminder — nothing is recorded on the query.</>
            : <>No reminder is set yet. Choosing one changes only the reminder — nothing is recorded on the query.</>}
        </p>
        {/* ⚠️ THE TO-DO DIAL ITSELF, not a copy of it. It brings its own stops, its own ceiling
            clamp and its own "Pick a date…" picker, so this surface cannot offer a tier the
            writer is not allowed to write — which is exactly the guarantee a second dial here
            would have had to reimplement and would eventually have got wrong. */}
        <SnoozeDialBody
          card={{ taskType: "nudge_overdue", title }}
          onSnooze={(days, when) => onSnooze?.(days, when)}
          autoFocus
        />
        <div className="qa-sep" />
        <button type="button" className="qa-opt" onClick={() => onStopNudging?.()}>Stop nudging me</button>
      </>
    ) : (
      <>
        <p className="qa-sub">Records one activity dated today. The query moves to Closed and any nudge is retired.</p>
        {CLOSE_REASONS.map((r) => (
          <button key={r.status} type="button" className="qa-opt" onClick={() => onCloseQuery?.(r.status)}>
            <span className="qa-rdot" aria-hidden="true">{r.mark}</span>{r.label}
          </button>
        ))}
        <div className="qa-sep" />
        {/* ⚠️ THE QUICK PATH STAYS QUICK AND THE FULL PATH STAYS AVAILABLE. Three reasons and
            today's date answer the common case; a different date or a note is a different job,
            and this is the door to it rather than four more controls in a popover. */}
        <p className="qa-foot">
          Need a date or a note?{" "}
          <button type="button" className="qa-link" onClick={() => onOpenQuery?.()}>Open the query</button>
        </p>
      </>
    )}
  </F12Popover>
);
