/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The parts a set-up step is made of (onboarding v5, part 1): an OPEN title on the sheet, one white
 * card beneath it, option rows, and the foot. They replace `OnboardingCard` and `SelectRow` on
 * every screen this pack converts; their dress is in onboarding.css.
 *
 * ⚠️ A STEP'S TITLE IS OPEN — type on the sheet, with no navy, white or bordered box round it and no
 * drawing beside it. The navy panel belongs to the account screens alone.
 */

import React from "react";
import "./onboarding.css";

/** The single column a step sits in: 760 wide, left-aligned. `wide` is the fork's 1280. */
export const StepColumn: React.FC<{ wide?: boolean; screen: string; children: React.ReactNode }> = ({ wide, screen, children }) => (
  <div className={`sf-col${wide ? " sf-col--wide" : ""}`} data-screen={screen}>{children}</div>
);

export const OpenTitle: React.FC<{ title: string; sub?: React.ReactNode }> = ({ title, sub }) => (
  <header className="sf-open">
    <h1 className="sf-title">{title}</h1>
    {sub && <p className="sf-sub">{sub}</p>}
  </header>
);

export const StepCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <section className={`sf-card sf-stepcard${className ? " " + className : ""}`}>{children}</section>
);

/** The mono question label over a group of options or a file row. */
export const QLabel: React.FC<{ id?: string; children: React.ReactNode }> = ({ id, children }) => (
  <p className="sf-qlab" id={id}>{children}</p>
);

/**
 * One choice among several. ⚠️ A RADIO, IN A RADIO GROUP — `role="radio"` with `aria-checked`,
 * never `aria-pressed`: these are alternatives, and a toggle button says each can be on at once.
 */
export const OptionGroup: React.FC<{ labelledBy?: string; label?: string; children: React.ReactNode }> = ({ labelledBy, label, children }) => (
  <div className="sf-opts" role="radiogroup" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label}>{children}</div>
);

export const OptionRow: React.FC<{ title: string; desc: string; selected: boolean; onClick: () => void }> = ({ title, desc, selected, onClick }) => (
  <button type="button" role="radio" aria-checked={selected} className={`sf-opt${selected ? " is-on" : ""}`} onClick={onClick}>
    <span className="sf-optdot" aria-hidden="true">
      {selected && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
    <span className="sf-opttx">
      <span className="sf-optt">{title}</span>
      <span className="sf-optd">{desc}</span>
    </span>
  </button>
);

export const BackLink: React.FC<{ onClick: () => void; label?: string }> = ({ onClick, label = "‹ Back" }) => (
  <button type="button" className="sf-link" onClick={onClick}>{label}</button>
);

/** The card's foot: a text link on the left (or nothing), the primary on the right. */
export const StepFoot: React.FC<{ left?: React.ReactNode; children: React.ReactNode }> = ({ left, children }) => (
  <div className={`sf-cfoot${left ? "" : " sf-cfoot--end"}`}>
    {left}
    <span className="sf-footr">{children}</span>
  </div>
);

/** One rust sentence above the foot. */
export const FieldError: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="sf-err sf-err--card" role="alert">{children}</p>
);
