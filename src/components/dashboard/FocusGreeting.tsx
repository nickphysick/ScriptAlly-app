/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * v37 salutation greeting + focus slot. Centred: mono eyebrow (date · week of querying) →
 * `Good {daypart}, {firstName}` (plain Playfair — no italics, no colour on the name) → the
 * attention chip (statement, not button-styled; toggles the To-do focus) → the four CTAs.
 * The greeting row is the focus-slot grid: left column sets the row height; the right track
 * hosts one absolutely-positioned panel (To-do card or a focused stat) with the Flip hand-off.
 * While any focus is open, a mini-grid of the other stats unfolds beneath the CTAs.
 */
import React, { useEffect, useRef } from "react";
import { chipText, longDate, salutation, weekOfQuerying } from "../../lib/dashboardStats";
import { Query } from "../../types";
import { FocusKey, FocusSlot } from "./focusSlot";
import { StatDef, StatFocusPanel, StatMini } from "./DashboardStatsRow";

const CTA_ICONS = {
  send: <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true"><path d="M21 3L10 14" /><path d="M21 3l-7 18-4-7-7-4 18-7z" /></svg>,
  record: <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true"><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 5 5v1" /></svg>,
  agent: <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M18 8v6M15 11h6" /></svg>,
  manuscript: <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z" /></svg>,
};

interface FocusGreetingProps {
  firstName: string;
  queries: Query[];
  urgentCount: number;
  slot: FocusSlot;
  statDefs: StatDef[];
  /** The real To-do card (OverToYou with its live handlers + onClose), supplied by Dashboard. */
  todoPanel: React.ReactNode;
  onSendQuery: () => void;
  onRecordResponse: () => void;
  onAddAgent: () => void;
  onAddManuscript: () => void;
}

export const FocusGreeting: React.FC<FocusGreetingProps> = ({
  firstName,
  queries,
  urgentCount,
  slot,
  statDefs,
  todoPanel,
  onSendQuery,
  onRecordResponse,
  onAddAgent,
  onAddManuscript,
}) => {
  const chipRef = useRef<HTMLButtonElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const prevShown = useRef<FocusKey | null>(null);

  // A11y focus management: into the slot panel when it opens, back to the chip when it closes.
  useEffect(() => {
    const was = prevShown.current;
    prevShown.current = slot.shown;
    if (slot.shown && !was) {
      const panel = sideRef.current?.querySelector<HTMLElement>(".sa-focus-panel");
      panel?.focus?.();
    } else if (!slot.shown && was) {
      chipRef.current?.focus();
    }
  }, [slot.shown]);

  // Completing the last urgent task: reset via the close choreography (the chip then fades
  // out through its `gone` class below).
  useEffect(() => {
    if (urgentCount === 0 && slot.focus === "todo" && !slot.animating) slot.request(null);
  }, [urgentCount, slot]);

  const now = new Date();
  const split = slot.focus !== null;
  const minisCols3 = split && slot.focus !== "todo";

  const panelState = (key: FocusKey): string | null => {
    if (slot.leaving === key) return "leaving";
    if (slot.shown === key) return slot.arriving === key ? "arriving" : "shown";
    return null;
  };

  return (
    <div className={`sa-greet${split ? " split" : ""}`}>
      <div className="sa-greet-main">
        <div className="sa-greet-eyebrow">
          <span>{longDate(now)}</span>
          <span>·</span>
          <span>{weekOfQuerying(queries, now)} of querying</span>
        </div>
        <h1 className="sa-greet-hi">
          {salutation(now)}, <em>{firstName}</em>
        </h1>
        <div>
          <button
            ref={chipRef}
            type="button"
            className={`sa-chip${urgentCount === 0 ? " gone" : ""}`}
            onClick={() => slot.request(slot.focus === "todo" ? null : "todo")}
            aria-expanded={slot.focus !== null}
            aria-haspopup="true"
          >
            <span className="sa-chip-dot" aria-hidden="true" />
            <span>{chipText(urgentCount)}</span>
            <svg className="sa-chip-chev" width={10} height={10} viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </div>
        <div className="sa-greet-ctas">
          <button type="button" className="sa-cta" onClick={onSendQuery}>{CTA_ICONS.send}Send query</button>
          <button type="button" className="sa-cta" onClick={onRecordResponse}>{CTA_ICONS.record}Record a response</button>
          <span className="sa-cta-div" aria-hidden="true" />
          <button type="button" className="sa-cta" onClick={onAddAgent}>{CTA_ICONS.agent}Add agent</button>
          <button type="button" className="sa-cta" onClick={onAddManuscript}>{CTA_ICONS.manuscript}Add manuscript</button>
        </div>

        {/* Mini stats while a focus is open — the focused metric's mini is absent. */}
        <div className={`sa-minis${minisCols3 ? " cols3" : ""}`} aria-hidden={!split}>
          {statDefs.filter((d) => d.key !== slot.focus).map((d) => (
            <StatMini key={d.key} def={d} onPin={() => { if (!slot.animating) slot.request(d.key); }} />
          ))}
        </div>
      </div>

      {/* The focus track — panels are absolute so the left column alone sets the row height. */}
      <div className="sa-greet-side" ref={sideRef}>
        {(slot.shown === "todo" || slot.leaving === "todo") && (
          <div
            className={`sa-focus-panel${panelState("todo") === "leaving" ? " leaving" : panelState("todo") === "arriving" ? " arriving" : ""}`}
            tabIndex={-1}
            role="region"
            aria-label="To-do list"
          >
            {todoPanel}
          </div>
        )}
        {statDefs.map((d) => {
          const st = panelState(d.key);
          if (!st) return null;
          return (
            <StatFocusPanel
              key={d.key}
              def={d}
              className={st === "leaving" ? "leaving" : st === "arriving" ? "arriving" : undefined}
              onUnpin={() => { if (!slot.animating) slot.request(null); }}
            />
          );
        })}
      </div>
    </div>
  );
};
