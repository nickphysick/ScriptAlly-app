/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 Phase 5 (ref screen 05) — DAY ONE's left column: with no package at all, the desk's list
 * column holds three numbered steps (navy discs, the step in the typewriter, one line in the serif) beside the
 * workspace, which holds v39.3's draft first package in the builder as built. v26's hero (Pk26Hero) is retired.
 */
import React from "react";
import { DAY_ONE_STEPS } from "../../../lib/packagesV43";

export const Pk43DayOne: React.FC = () => (
  <ol className="pk43-d1" aria-label="How packages work" data-pk43="day-one-steps">
    {DAY_ONE_STEPS.map(([t, s], i) => (
      <li key={t} data-pk43="day-one-step">
        <span className="pk43-d1-n" aria-hidden="true">{i + 1}</span>
        <span className="pk43-d1-t"><b>{t}</b><span>{s}</span></span>
      </li>
    ))}
  </ol>
);
