/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SET A QUERYING TARGET — the only way a target is set or changed.
 *
 * ⚠️ THE INLINE EDITOR IS GONE, AND THIS REPLACES IT WHOLE. The card used to carry a number input
 * and a period `<select>` in its own body, reached by clicking the count. That put an editing
 * surface inside a reporting one, and made the count look like a control. The count is plain text
 * now; this sheet is reached from `Set a target` when unset and from the `⋯` menu when set.
 *
 * ⚠️ IT IS THE LOCKED FORM 11 SHELL, NOT A LOCAL MODAL. `FormShell` owns the overlay, the
 * parchment card, the sage header band, the centred soft-pink button, and every exit — Cancel,
 * Escape and a backdrop click, all routed through one discard guard. Nothing about dismissal is
 * re-implemented here.
 */
import React, { useState } from "react";
import { FormShell } from "../forms/FormShell";
import {
  CADENCE_EACH, CADENCE_SEGMENT, nextPeriodStart, queriesNoun,
} from "../../lib/queryingGoals";
import type { GoalCadence } from "../../types";
import "./queryingGoals.css";

/** ⚠️ CLAMPED 1–99, and the clamp lives here rather than in the handlers so both ends agree. */
export const MIN_TARGET = 1;
export const MAX_TARGET = 99;
export const clampTarget = (n: number): number =>
  Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(Number.isFinite(n) ? n : MIN_TARGET)));

/* ⚠️ THREE, WHICH IS WHY `SegmentedToggle` IS NOT USED. That component is typed as a two-tuple of
   options — widening it would change every existing caller's types to serve one new form. The
   group below wears the same Form 11 tokens (soft-pink #f5e2da on #e8c8bc) and is keyboard-
   operable as a radiogroup, which is the part that matters. */
const CADENCES: GoalCadence[] = ["week", "fortnight", "month"];

export interface GoalTargetSheetProps {
  /** Pre-filled from the goal in force, or the defaults when there is none. */
  initialTarget: number;
  initialCadence: GoalCadence;
  now: Date;
  onCommit: (next: { target: number; cadence: GoalCadence }) => Promise<void> | void;
  onClose: () => void;
}

export const GoalTargetSheet: React.FC<GoalTargetSheetProps> = ({
  initialTarget, initialCadence, now, onCommit, onClose,
}) => {
  const [target, setTarget] = useState(clampTarget(initialTarget));
  const [cadence, setCadence] = useState<GoalCadence>(initialCadence);
  const [saving, setSaving] = useState(false);

  const dirty = target !== clampTarget(initialTarget) || cadence !== initialCadence;
  const step = (by: number) => setTarget((t) => clampTarget(t + by));

  const submit = async () => {
    setSaving(true);
    try {
      await onCommit({ target, cadence });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  /* ⚠️ ARROW KEYS MOVE BETWEEN SEGMENTS, because this is a radiogroup and a keyboard user should
     not have to tab through three buttons to change one answer. */
  const onSegKey = (e: React.KeyboardEvent) => {
    const i = CADENCES.indexOf(cadence);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault(); setCadence(CADENCES[(i + 1) % CADENCES.length]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault(); setCadence(CADENCES[(i - 1 + CADENCES.length) % CADENCES.length]);
    }
  };

  return (
    <FormShell
      preLabel="Querying goals"
      name="Set a querying target"
      avatarIcon={
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.6" /><circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      }
      buttonLabel="Set target"
      onSubmit={submit}
      submitting={saving}
      onClose={onClose}
      dirty={dirty}
    >
      <div className="gts-field">
        <span className="gts-lbl" id="gts-qty-label">Queries</span>
        <div className="gts-step" role="group" aria-labelledby="gts-qty-label">
          <button type="button" className="gts-stepb" onClick={() => step(-1)}
            disabled={target <= MIN_TARGET} aria-label="One fewer">−</button>
          <span className="gts-qty" aria-live="polite">{target}</span>
          <button type="button" className="gts-stepb" onClick={() => step(1)}
            disabled={target >= MAX_TARGET} aria-label="One more">+</button>
        </div>
      </div>

      <div className="gts-field">
        <span className="gts-lbl" id="gts-cad-label">Each</span>
        <div className="gts-seg" role="radiogroup" aria-labelledby="gts-cad-label" onKeyDown={onSegKey}>
          {CADENCES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cadence === c}
              tabIndex={cadence === c ? 0 : -1}
              className={cadence === c ? "gts-segb on" : "gts-segb"}
              onClick={() => setCadence(c)}
            >
              {CADENCE_SEGMENT[c]}
            </button>
          ))}
        </div>
      </div>

      {/*
        ⚠️ THE PREVIEW STATES WHAT WILL HAPPEN, and the restart date is DERIVED by the same
        `periodBounds` the card counts with — not a second calculation that could disagree with it.
        It reads the prospective grid rather than the stored one: a fortnight is anchored to the
        entry in force, and this entry does not exist yet, so the old anchor would preview a
        restart date the new goal will never use.
      */}
      <div className="gts-preview">
        <strong>{queriesNoun(target)} each {CADENCE_EACH[cadence]}.</strong>
        <span>The count starts again on {nextPeriodStart(cadence, now)}.</span>
      </div>
    </FormShell>
  );
};
