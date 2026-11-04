/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages — the package ring (ref `ringS`), read by the package drawer (Pk38Drawer). The labels row this file
 * used to hold (v39 Part B, `Pk39Labels`) is RETIRED by v41: the package list (packages/v41/Pk41List) replaces it.
 */
import React from "react";
import { ringOf, type Fig } from "../../../lib/packagesV38";

const C = 2 * Math.PI * 18;

/** The ref's `ringS`: filled share once ranked, dashed while too early, empty when not sent. `pre` is the sheet's prefix. */
export const Ring: React.FC<{ f: Fig; pre?: "p8" | "p9"; z?: number }> = ({ f, pre = "p8", z }) => {
  const r = ringOf(f);
  return (
    <span className={`${pre}-rg${r.k === "none" ? ` ${pre}-none` : r.k === "early" ? ` ${pre}-early` : ""}`} aria-hidden="true" style={z ? ({ "--z": `${z}px` } as React.CSSProperties) : undefined}>
      <svg viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" />
        {r.k === "none" ? null : <circle className={`${pre}-v`} cx="22" cy="22" r="18" strokeDasharray={r.k === "early" ? "3 4" : `${(C * r.pct) / 100} ${C}`} />}
      </svg>
    </span>
  );
};
