/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The step spine — dots, mono labels and hairline joins (ref:
 * design-refs/scriptally-onboarding-chrome-options.html, option B).
 *
 * ⚠️ IT RENDERS WHAT `onboardingSpine.ts` RETURNS AND DECIDES NOTHING. The branch-honesty rules —
 * the spine may shorten, never lengthen, and the capture choice is not an input — are properties of
 * that pure model. A component that computed its own steps would be a second place for them to be
 * got wrong.
 *
 * ⚠️ BELOW 760px THE DOTS ARE REPLACED BY THE MONO STRING, NOT SHRUNK. Three labelled dots in a
 * phone's header either wrap the header or truncate the labels, and a spine whose labels are
 * ellipsised has stopped saying where you are — which is the only thing it is for.
 */

import React from "react";
import { SpineStep, stepOfLabel } from "../../lib/onboardingSpine";

export const OnboardingSpine: React.FC<{
  steps: SpineStep[];
  /** Index of the step being walked. Pass `steps.length` for "everything complete". */
  activeIndex: number;
}> = ({ steps, activeIndex }) => (
  <>
    <div className="ob-spine" role="list" aria-label="Setup progress">
      {steps.map((s, i) => {
        const state = i < activeIndex ? "done" : i === activeIndex ? "now" : "todo";
        return (
          <React.Fragment key={s.id}>
            {i > 0 && <span className="ob-spjoin" aria-hidden="true" />}
            <div
              className={`ob-sp ob-sp--${state}`}
              role="listitem"
              /* The state is in the accessible name, not only in the colour — a dot that differs
                 from its neighbours by fill alone says nothing to a screen reader. */
              aria-current={state === "now" ? "step" : undefined}
            >
              <span className="ob-spdot" aria-hidden="true" />
              <span className="ob-splab">{s.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
    <span className="ob-spmob">{stepOfLabel(Math.min(activeIndex, steps.length - 1), steps.length)}</span>
  </>
);
