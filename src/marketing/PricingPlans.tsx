/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Free and Pro, as both widths draw them (pricing ladder, 26 Oct; refs
 * design-refs/pricing-plans-ladder-v1.html for the cards and the ladder, and
 * design-refs/pricing-phone-plans-v1.html for the phone, which shows them one at a time under tabs).
 *
 * ⚠️ ONE PRO CARD, TWO HOSTS. The desktop puts the cards side by side and opens the questions inline;
 * the phone shows one card at a time and opens the questions as a sheet. The card, its ladder and
 * their words are the same component either way, so the two widths cannot come to offer different
 * plans or say different things about renewal. The host passes only the "Which plan suits me best?"
 * control, because what it opens differs.
 *
 * ⚠️ THE LADDER SELECTS AND SELLS NOTHING. Choosing a row changes which row is checked, and nothing
 * else: there is no buy button and no payment path. A result from the questions checks the row that
 * fits and flags it "Fits your campaign" — exactly one row, the estimate's.
 *
 * ⚠️ RENEWAL IS SAID ONCE, QUIETLY: the small print under the lengths (and in full in the FAQ).
 */
import React from "react";
import {
  PV4_FREE, PV4_PRO, PRO_PLANS, PRO_CHOOSE, LADDER_SMALL, LADDER_LABEL, planMonths, planRungLine, JY_FITS,
  type ProPlan,
} from "./pricingCopy";
import { Price } from "./pricingParts";

export type Months = ProPlan["months"];

/** The compass on "Which plan suits me best?" — the ref's own drawing. */
export const Compass: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></svg>
);

/** The row an arrow key moves to: up / left back, down / right on, Home and End to the ends, wrapping. */
export const ladderStep = (from: Months, key: string): Months | null => {
  const i = PRO_PLANS.findIndex((p) => p.months === from);
  const n = PRO_PLANS.length;
  const to = key === "ArrowDown" || key === "ArrowRight" ? (i + 1) % n
    : key === "ArrowUp" || key === "ArrowLeft" ? (i - 1 + n) % n
    : key === "Home" ? 0 : key === "End" ? n - 1 : -1;
  return to < 0 ? null : PRO_PLANS[to].months;
};

/**
 * The four lengths as a radio group (ref `.ladder` / `.rung`). Roving focus: only the checked row is
 * in the tab order, and the arrow keys move the check and the focus together, as a radio group does.
 */
export const ProLadder: React.FC<{
  selected: Months;
  fit: Months | null;
  onSelect: (m: Months) => void;
}> = ({ selected, fit, onSelect }) => {
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const to = ladderStep(selected, e.key);
    if (to === null) return;
    e.preventDefault();
    onSelect(to);
    e.currentTarget.querySelector<HTMLElement>(`[data-m="${to}"]`)?.focus();
  };
  return (
    <div className="mk-ladder" role="radiogroup" aria-label={LADDER_LABEL} onKeyDown={onKey}>
      {PRO_PLANS.map((p) => {
        const line = planRungLine(p);
        const on = p.months === selected;
        return (
          <button
            key={p.months}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-m={p.months}
            className={"mk-rung" + (p.months === fit ? " mk-rung--fit" : "")}
            onClick={() => onSelect(p.months)}
          >
            <span className="mk-rungtext">
              <span className="mk-rungname">{planMonths(p.months)}</span>
              <span className="mk-rungline">{line.lead}{line.save && <em>{line.save}</em>}</span>
            </span>
            <span className="mk-rungprice">£{p.price}</span>
            {p.months === fit && <span className="mk-rungflag">{JY_FITS}</span>}
          </button>
        );
      })}
    </div>
  );
};

/** The Free card (ref `.card`). */
export const FreeCard: React.FC<{ id?: string; className?: string } & React.HTMLAttributes<HTMLElement>> = ({ className, ...rest }) => (
  <article className={"mk-lcard" + (className ? " " + className : "")} {...rest}>
    <div className="mk-lcardin">
      <h2 className="mk-lname">{PV4_FREE.name}</h2>
      <Price amount={PV4_FREE.price} />
      <p className="mk-lsub">{PV4_FREE.sub}</p>
      <ul className="mk-llist">{PV4_FREE.list.map((f) => <li key={f}>{f}</li>)}</ul>
    </div>
  </article>
);

/**
 * The Pro card (ref `.card--pro`, option 3): "Pro", "Choose how long to start with.", the ladder, the
 * small print, the host's "Which plan suits me best?" control, then "Everything in Free, plus:".
 */
export const ProCard: React.FC<{
  selected: Months;
  fit: Months | null;
  onSelect: (m: Months) => void;
  /** The host's "Which plan suits me best?" control. */
  suit: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "onSelect">> = ({ selected, fit, onSelect, suit, className, ...rest }) => (
  <article className={"mk-lcard mk-lcard--pro" + (className ? " " + className : "")} {...rest}>
    <div className="mk-lcardin">
      <h2 className="mk-lname">{PV4_PRO.name}</h2>
      <p className="mk-lsub">{PRO_CHOOSE}</p>
      <ProLadder selected={selected} fit={fit} onSelect={onSelect} />
      <p className="mk-lsmall">{LADDER_SMALL}</p>
      <div className="mk-lsuitwrap">{suit}</div>
      <ul className="mk-llist">
        <li className="mk-lplus">{PV4_PRO.plus}</li>
        {PV4_PRO.list.map((f) => <li key={f}>{f}</li>)}
      </ul>
    </div>
  </article>
);
