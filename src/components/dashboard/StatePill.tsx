/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatePill — a status glyph and its words on the state's own tint (v16, 18 Sep).
 *
 * ⚠️ IT MOVED HERE FROM `OneScreenBreakdown`, WHICH IS RETIRED. The breakdown's five columns are gone;
 * the pill is not — the activity feed states one on every entry, which is where the ref puts the verb.
 *
 * ⚠️ THE GLYPH IS `StatusDot` AND NOTHING ELSE. The house law is that a query status is only ever
 * drawn by that component; a row that is not about a query has no status to draw, so it takes the
 * stone pill and a plain dash, which is a mark rather than a status.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import type { QueryStatus } from "../../types";
import type { State } from "../../lib/queryCardFacts";

export const StatePill: React.FC<{
  /** the rung this event produced; null on a row that is not about a query */
  status: QueryStatus | null;
  /** the state whose token fills the pill; null takes the stone fill */
  state: State | null;
  label: string;
}> = ({ status, state, label }) => (
  <span className={`os-spill os-spill--${state ?? "none"}`}>
    {status
      ? <StatusDot status={status} overrideSize={12} decorative />
      : <span className="os-spill-d" aria-hidden="true" />}
    <span className="os-spill-l">{label}</span>
  </span>
);
