/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SECTION HEADER — Playfair title · mono meta · right-aligned actions ═══════════════════
 *
 * The `.sec` of `design-refs/manuscripts-book-profile.html` and the band head of the Submission
 * packages page, which are the same object. It was inline JSX in three places before this
 * (PackagesBand, MaterialsBand, TrackingBand) and would have become four the moment the book
 * profile drew its first block.
 *
 * ⚠️ THE TICK IS A PROP, AND BOTH ANSWERS ARE DELIBERATE. Packages puts a 56px burgundy tick on
 * the rule; the book profile carries no accent underline, by ruling. A shared component with a
 * default here would make one of its two callers an override — and two single-class rules on one
 * element are decided by stylesheet order, which is how this repo has lost a value before. Each
 * caller states what it wants.
 *
 * ⚠️ `actions` AND `children` ARE DIFFERENT SLOTS, and the difference is `margin-left: auto`.
 * `actions` is wrapped in `.sa-secacts`, which takes the auto margin for the GROUP so several
 * controls travel right together. `children` are bare siblings that stay inline beside the meta —
 * MaterialsBand's archived toggle is deliberately one of those (`.pkgb-arcToggle` carries no auto
 * margin, and that is the rendered behaviour this extraction had to preserve).
 */
import React from "react";
import "./containers.css";

export interface SectionHeaderProps {
  /** Ids the `<h2>` so the enclosing section can be `aria-labelledby` it. */
  headingId?: string;
  title: React.ReactNode;
  /** Mono uppercase meta beside the title — a count, a date, a standing figure. */
  meta?: React.ReactNode;
  /** Right-aligned action group. Wrapped in `.sa-secacts`, which owns the auto margin. */
  actions?: React.ReactNode;
  /** Bare siblings after the meta — inline, no auto margin, no wrapper. */
  children?: React.ReactNode;
  /** The burgundy accent tick on the rule. Packages: yes. Book profile: no. */
  tick?: boolean;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  headingId, title, meta, actions, children, tick = false, className,
}) => (
  <div className={`sa-sechead${tick ? " sa-sechead--tick" : ""}${className ? ` ${className}` : ""}`}>
    <h2 id={headingId}>{title}</h2>
    {meta !== undefined && meta !== null && <span className="sa-secmeta">{meta}</span>}
    {children}
    {actions && <span className="sa-secacts">{actions}</span>}
  </div>
);
