/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The parts the import summary and the three review steps share (onboarding v5, part 2): the
 * stepper, a chip, an initials disc. Their dress is in importFlow.css.
 */
import React from "react";
import "./importFlow.css";
import { ImportStepId, IMPORT_STEP_LABEL } from "../../lib/importSummary";

export const Chip: React.FC<{ hot?: boolean; file?: boolean; children: React.ReactNode } & React.HTMLAttributes<HTMLSpanElement>> = ({ hot, file, children, className, ...rest }) => (
  <span className={`im-chip${hot ? " im-chip--hot" : ""}${file ? " im-chip--file" : ""}${className ? " " + className : ""}`} {...rest}>{children}</span>
);

export const initialsOf = (name: string): string => {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "–";
  return ((p[0][0] ?? "") + (p.length > 1 ? p[p.length - 1][0] ?? "" : "")).toUpperCase();
};

export const Disc: React.FC<{ initials: string; tone?: "live" | "closed" | "none" | "agency" }> = ({ initials, tone = "live" }) => (
  <span className={`im-disc${tone === "live" ? "" : ` im-disc--${tone}`}`} aria-hidden="true">{initials}</span>
);

const TICK = (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-11" /></svg>
);

/**
 * Duplicates · Agents · Queries · Import.
 *
 * ⚠️ IT IS NOT A CONTROL. It says where the writer is; `‹ Back` and the primary move between
 * steps. The numbers on the dots follow the steps shown, so a file with no duplicate sets counts
 * from Agents as 1.
 */
export const Stepper: React.FC<{
  steps: ImportStepId[];
  /** The current step, or null on the summary (where no step has begun). */
  current: ImportStepId | null;
  /** Summary only: what each step holds. */
  captions?: Partial<Record<ImportStepId, string>>;
  label: string;
}> = ({ steps, current, captions, label }) => {
  const at = current ? steps.indexOf(current) : -1;
  return (
    <ol className="im-steps" aria-label={label} data-im="steps">
      {steps.map((id, i) => {
        const state = at === -1 ? "todo" : i < at ? "done" : i === at ? "on" : "todo";
        return (
          <React.Fragment key={id}>
            {i > 0 && <li className="im-stln" aria-hidden="true" />}
            <li className={`im-st${state === "on" ? " is-on" : state === "done" ? " is-done" : ""}`} data-step={id} data-state={state}
                aria-current={state === "on" ? "step" : undefined}>
              <i>{state === "done" ? TICK : i + 1}</i>
              {IMPORT_STEP_LABEL[id]}
              {captions?.[id] && <small>{captions[id]}</small>}
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
};
