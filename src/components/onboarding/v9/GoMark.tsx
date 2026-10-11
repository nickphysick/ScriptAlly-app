/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The success mark (onboarding v9): a sage disc whose tick draws itself, with a ring that pulses
 * out once. Three sizes: 84 (the summary and "Duplicates sorted"), 64, and 52 (the "all answered"
 * band, which has no ring).
 *
 * SAGE IS FOR THIS AND NOTHING ELSE. `--go` is read by the mark and by the "all answered" band;
 * lock S1 sweeps every set-up and review screen for any other element painted with it.
 *
 * Decorative: the words beside it say what happened, so the mark is hidden from assistive tech.
 */
import React from "react";
import "./onbV9.css";

export const GoMark: React.FC<{ size?: "lg" | "md" | "sm" }> = ({ size = "lg" }) => (
  <span className={`o9-gomark${size === "lg" ? "" : ` o9-gomark--${size}`}`} data-o9="gomark" aria-hidden="true">
    <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
  </span>
);
