/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE STEP STACK — the chassis, with no opinion about what the steps ask.
 *
 * Sections presented one at a time: the active one expanded, the rest collapsed to one-line
 * summaries you can click back into. Extracted from `QueryCreatePane` so recording a response can
 * wear the same grammar rather than a copy of it — a second implementation of this rhythm would
 * drift from the first the week after it was written.
 *
 * ⚠️ IT OWNS THE RHYTHM, NEVER THE CONTENT. Active/reached live with the CALLER, because a journey
 * whose steps change under it (the response takeover re-seats the stack when the outcome changes)
 * has to be able to move them. What lives here is everything that would otherwise be written twice:
 * the three treatments, the summary rows, the numbered head, the Back/Next footer, Enter-to-advance,
 * the focus-the-first-control effect, and the pulse.
 *
 * ⚠️ REQUIRED ≠ SEQUENTIAL. Nothing here gates saving — see `lib/stepStack.ts`, where the rule is
 * argued. The footer's terminal action is enabled by the CALLER's `canSave`, never by how far
 * through the stack anyone has walked.
 */
import React, { useEffect, useRef, useState } from "react";
import { indexIn, type StepState } from "../../lib/stepStack";

export interface StepDescriptor<T extends string> {
  id: T;
  /** The short name on the collapsed row. */
  short: string;
  /** The head shown while the section is open. */
  title: string;
  /** What the row says BEFORE it has been answered — anatomy without interrogation. */
  hint: string;
  /** Openly optional sections say so in their own head, rather than in a footnote. */
  optional?: boolean;
  /** The one-line value once the section has been passed. */
  summary?: string;
  /** Extra head content beside the title (create's "what she asks for" line). */
  head?: React.ReactNode;
  body: React.ReactNode;
}

export interface StepStackProps<T extends string> {
  order: readonly T[];
  steps: readonly StepDescriptor<T>[];
  active: T;
  states: Record<T, StepState>;
  /** Clicking a summary, or Back. */
  onJump: (id: T) => void;
  /** Next, and Enter. */
  onAdvance: () => void;
  onSave?: () => void;
  canSave?: boolean;
  saving?: boolean;
  saveLabel?: string;
  savingLabel?: string;
}

export function StepStack<T extends string>({
  order, steps, active, states, onJump, onAdvance,
  onSave, canSave = false, saving = false,
  saveLabel = "Save query", savingLabel = "Saving…",
}: StepStackProps<T>) {
  /* ── THE ACTIVE-STEP CUE (cue D, qc-focus.html) ────────────────────────────────────────
     ⚠️ THE PULSE IS AN INVITATION, NOT A STATUS. It says "act here"; the moment the writer does,
     it has been answered and stops — and it does not return for that step. A halo still breathing
     while you type reads as an unresolved alert about the thing you are already doing. CSS cannot
     know about engagement, so the class is REMOVED rather than overridden.

     ⚠️ AND THE REAL "YOU ARE HERE" IS DOM FOCUS. The focus ring and caret are a stronger signal
     than any animation, and they are what makes Enter-through work at all: without focus inside the
     section, Enter has nothing to accept from. The pulse is the decoration; this is the mechanism.
     It is also why reduced motion loses nothing that matters. */
  const [engaged, setEngaged] = useState(false);
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEngaged(false);
    const host = stackRef.current?.querySelector<HTMLElement>(`[data-step="${active}"] .qc-body`);
    /* The first thing a writer can actually type into or press. `disabled` and negative tabindex
       are excluded so focus never lands somewhere inert. */
    const first = host?.querySelector<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  }, [active]);

  /* ⚠️ ENTER ACCEPTS AND ADVANCES — except where Enter already means something. A textarea needs it
     for newlines (Notes), and an open menu needs it to choose the highlighted row (the manuscript
     picker, the unit menu), so those keep it and the stack does not steal it. On the LAST section
     there is nothing to advance to, so Enter falls through to the page's ⌘↵ save rather than being
     swallowed and looking broken. */
  const onStackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target as HTMLElement;
    if (el.tagName === "TEXTAREA" || el.isContentEditable) return;
    if (el.getAttribute("aria-haspopup") || el.getAttribute("aria-expanded") === "true") return;
    if (indexIn(order, active) >= order.length - 1) return;
    e.preventDefault();
    onAdvance();
  };

  /* ⚠️ A BUTTON, NOT AN INSTRUCTION. Each step's head carried `ENTER TO ACCEPT ⏎` — a sentence
     standing in for a control, which asks the writer to know a keyboard convention before they can
     move, and offers a pointer user nothing at all. Enter still commits the step; it simply stops
     being advertised, because the button now says what it does.

     ⚠️ AND IT NAMES ITS DESTINATION. "Next: What" is worth more than "Next" — the stack is short
     enough that knowing where you are going is knowing how much is left. */
  const stepFoot = (id: T) => {
    const i = indexIn(order, id);
    const next = i >= 0 && i < order.length - 1 ? order[i + 1] : null;
    const back = order[i - 1];
    const nextShort = next ? steps.find((s) => s.id === next)?.short ?? next : "";
    return (
      <div className="qc-sfoot">
        {back && (
          <button type="button" className="qc-back" onClick={() => onJump(back)}>← Back</button>
        )}
        {next ? (
          <button type="button" className="qc-next" onClick={onAdvance}>Next: {nextShort}</button>
        ) : onSave ? (
          /* ⚠️ TWO PRIMARIES, DELIBERATELY, because they act at different scopes: this finishes the
             STACK, the header's finishes the PANE. The step's takes the softer treatment so the
             header's stays the louder of the two. */
          <button type="button" className="qc-next" disabled={!canSave || saving} onClick={onSave}>
            {saving ? savingLabel : saveLabel}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className="qc-stack"
      ref={stackRef}
      onKeyDown={onStackKeyDown}
      onFocusCapture={() => setEngaged(true)}
      onInput={() => setEngaged(true)}
    >
      {steps.map((s) => {
        const state = states[s.id];
        return (
          <section
            key={s.id}
            className={`qc-sec qc-${state}${state === "active" && !engaged ? " qc-pulse" : ""}`}
            data-step={s.id}
            aria-labelledby={`qc-h-${s.id}`}
          >
            {state !== "active" && (
              <button type="button" className="qc-sum" onClick={() => onJump(s.id)}>
                <span className="qc-tick" aria-hidden="true">{state === "done" ? "✓" : ""}</span>
                <b>{s.short}</b>
                {state !== "done" && <span className="qc-stxt">{s.hint}</span>}
                {state === "done" && <span className="qc-sval">{s.summary}</span>}
                {state === "done" && <span className="qc-sedit">EDIT</span>}
                <span className="qc-schev" aria-hidden="true">›</span>
              </button>
            )}
            {state === "active" && (
              <>
                <div className="qc-shead">
                  <span className="qc-n" aria-hidden="true">{indexIn(order, s.id) + 1}</span>
                  <h3 id={`qc-h-${s.id}`}>{s.title}{s.optional && <span className="qc-opt"> · OPTIONAL</span>}</h3>
                  {s.head}
                </div>
                <div className="qc-body">{s.body}</div>
                {stepFoot(s.id)}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
