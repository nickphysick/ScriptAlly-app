/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Plans page — inside Settings (non-workspace v1, Phase 4; ref: design-refs/plans-v2.html, Redesign view, the
 * sheet only). Three states from the ref: founding writer, on Free, on Pro; an account inside its first 14 days is
 * drawn as Free with one line saying how many days of Pro are left.
 *
 * ⚠️ PRICES ARE `lib/planRules`'; ROWS ARE `lib/planComparison`'; the comparison is the one `PlanTable`.
 * ⚠️ NO BUY CONTROL WHILE `PLANS_ON_SALE` IS OFF (there is no payment path). The ref's "Choose N months · £X",
 *    "Add more time" and "Choose a length" are all behind it. The length picker stays: it shows each plan's price.
 * ⚠️ NOTHING HERE STATES A PURCHASE. No payment exists, so the Pro state has no bought date, end date or receipt.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronLeft } from "lucide-react";
import { useScriptAllyDb } from "../lib/db";
import { DAY_MS } from "../lib/entitlements";
import { PRO_PLANS, perMonth, planMonths, ROLL_ON_PRICE, FREE_PRICE, TRIAL_DAYS, type ProPlan } from "../lib/planRules";
import { PLANS_ON_SALE } from "../lib/selling";
import { planHeadline } from "../lib/settingsHeadline";
import { PlanTable, type PlanViewer } from "./plans/PlanTable";
import "./settings/settings.css";
import "./plans/plansPage.css";

/** The ref's "Fits your campaign" length. */
const FIT_MONTHS = 6;

export const PLANS_COPY = {
  crumb: "Plan",
  foundingHeadline: ["You're a founding writer. Nothing to choose, nothing to pay.", "Full QueryHawk Pro is yours for your whole querying campaign."] as const,
  freeSub: "Pro adds manuscript versions, submission packages and The Scout, for as long as your campaign runs.",
  foundingPlace: "Your founding place",
  foundingPlaceSub: "You're one of our first 50 writers. Thank you for helping us get this right.",
  foundingIncludes: [
    "Full QueryHawk Pro, free for your whole querying campaign",
    "A direct line to our founder",
    "Smart Import, to bring your existing list across",
  ],
  finished: "Finished querying?",
  finishedSub: "Just drop us a note to say you're done. There's nothing to cancel, and your records stay yours.",
  getInTouch: "Get in touch",
  thenH: "Then, once we launch:",
  thenP: "These are the plans for writers who join after you. None of it applies to you while you're a founding writer.",
  freeList: [
    `Your first ${TRIAL_DAYS} days are full Pro`,
    "One manuscript",
    "Unlimited agents and queries",
    "Response tracking, to-do list and reminders",
    "Bring your list across with Smart Import",
  ],
  proList: [
    "Query letters and manuscript versions, one for each draft",
    "Submission packages, and which ones win requests",
    "Comparable titles",
    "The Scout, for new agents and comps",
    "Smart email drop",
  ],
  freeSubLine: "For as long as you like.",
  everythingPlus: "Everything in Free, plus:",
  yourPlan: "Your plan",
  notOnSale: "Not on sale yet",
  lengthQ: "How long do you need Pro for?",
  fits: "Fits your campaign",
  small: `Plans roll on to monthly at £${ROLL_ON_PRICE} when they end. We'll remind you a week before, and you can stop it in one click. You never lose your records, whatever plan you're on.`,
  questions: "Questions",
  proRow: "Pro",
  proRowSub: "Every QueryHawk feature.",
} as const;

const priceLine = (p: ProPlan) => (p.saving === null ? `One month of Pro.` : `£${perMonth(p)} a month. You save ${p.saving}%.`);

function faq(founding: boolean): [string, string][] {
  return [
    ["Will anything here charge me today?", founding
      ? "No. Plans aren't on sale yet, and founding writers aren't charged at all."
      : PLANS_ON_SALE ? "Only if you choose a plan. Nothing changes on your account until you do." : "No. Plans aren't on sale yet."],
    ["What happens when my plan ends?", `It rolls on to monthly at £${ROLL_ON_PRICE} so you don't lose Pro mid-campaign. We email you a week before, and stopping it takes one click, here on this page.`],
    ["What if I sign with an agent before it ends?", "Congratulations. Your plan simply runs to its end date. Your records stay yours, on any plan."],
    ["What happens to my Pro work if I go back to Free?", "Nothing is deleted. Your versions and packages are kept and open again if you come back to Pro."],
    ["Why can I only add one manuscript right now?", "Adding a second manuscript is coming soon."],
  ];
}

const Tiers: React.FC<{ viewer: Exclude<PlanViewer, "public"> }> = ({ viewer }) => {
  const [len, setLen] = useState<ProPlan["months"]>(FIT_MONTHS);
  const cur = PRO_PLANS.find((p) => p.months === len)!;
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = PRO_PLANS.length;
    const j = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n : -1;
    if (j < 0) return;
    e.preventDefault();
    setLen(PRO_PLANS[j].months);
    (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus();
  };
  return (
    <>
      <div className="pl-tiers" data-plans="tiers">
        <div className="pl-tier">
          <h3>Free {viewer === "free" && <span className="plt-chip"><Check aria-hidden="true" />{PLANS_COPY.yourPlan}</span>}</h3>
          <div className="pl-price"><b>{FREE_PRICE}</b></div>
          <p className="pl-sub">{PLANS_COPY.freeSubLine}</p>
          <hr />
          <ul className="pl-feat">{PLANS_COPY.freeList.map((t) => <li key={t}><Check aria-hidden="true" /><span>{t}</span></li>)}</ul>
        </div>
        <div className="pl-tier pl-tier--pro">
          <h3>Pro {viewer === "pro" ? <span className="plt-chip plt-chip--navy"><Check aria-hidden="true" />{PLANS_COPY.yourPlan}</span> : viewer === "founding" || !PLANS_ON_SALE ? <span className="plt-chip plt-chip--navy">{PLANS_COPY.notOnSale}</span> : null}</h3>
          <div className="pl-price"><b>£{cur.price}</b><span>for {planMonths(cur.months)}</span></div>
          <p className="pl-sub">{priceLine(cur)}</p>
          <div className="pl-len" role="radiogroup" aria-label={PLANS_COPY.lengthQ}>
            {PRO_PLANS.map((p, i) => (
              <button key={p.months} type="button" role="radio" aria-checked={p.months === len} tabIndex={p.months === len ? 0 : -1} onClick={() => setLen(p.months)} onKeyDown={(e) => onKey(e, i)}>
                {p.months === FIT_MONTHS && viewer !== "founding" && <em>{PLANS_COPY.fits}</em>}
                <b>{planMonths(p.months)}</b><span>£{p.price}</span>
              </button>
            ))}
          </div>
          <hr />
          <ul className="pl-feat"><li className="pl-lead">{PLANS_COPY.everythingPlus}</li>{PLANS_COPY.proList.map((t) => <li key={t}><Check aria-hidden="true" /><span>{t}</span></li>)}</ul>
        </div>
      </div>
      <p className="pl-small">{PLANS_COPY.small}</p>
    </>
  );
};

export const PlansPage: React.FC = () => {
  const { entitlement } = useScriptAllyDb();
  const navigate = useNavigate();
  const basis = entitlement.basis;
  const viewer: Exclude<PlanViewer, "public"> = basis === "founding" || basis === "pending" ? "founding" : basis === "pro" ? "pro" : "free";
  const trialDaysLeft = entitlement.trialEndsMs ? Math.max(1, Math.ceil((entitlement.trialEndsMs - Date.now()) / DAY_MS)) : null;
  const [h, p] = viewer === "founding" ? PLANS_COPY.foundingHeadline : viewer === "free" && basis === "free" ? [planHeadline("free", null)[0], PLANS_COPY.freeSub] : planHeadline(basis, trialDaysLeft);

  return (
    <div className="acct-page pl-page" data-plans-state={basis === "trial" ? "trial" : viewer}>
      <div className="acct-work pl-work">
        <button type="button" className="pl-crumb" onClick={() => navigate("/account/plan")}><ChevronLeft aria-hidden="true" />{PLANS_COPY.crumb}</button>
        <header className="sc-ttl sc-ttl--live" data-plans="headline">
          <h1 className="sc-ttl-h">{h}</h1>
          <p className="sc-ttl-d">{basis === "trial" ? `${PLANS_COPY.freeSub} ${p.slice(p.indexOf("You have"))}` : p}</p>
        </header>

        {viewer === "founding" && (
          <>
            <section className="sc-card" aria-labelledby="pl-h-found">
              <div className="sc-ch"><h2 id="pl-h-found" className="sc-ch-h">{PLANS_COPY.foundingPlace}</h2><p className="sc-ch-p">{PLANS_COPY.foundingPlaceSub}</p></div>
              <ul className="pl-incl">{PLANS_COPY.foundingIncludes.map((t) => <li key={t}><Check aria-hidden="true" /><span>{t}</span></li>)}</ul>
              <div className="sc-row">
                <div className="sc-row-l"><div className="sc-lbl">{PLANS_COPY.finished}</div><div className="sc-dsc">{PLANS_COPY.finishedSub}</div></div>
                <div className="sc-ctl"><button type="button" className="acct-btn acct-btn--ghost pl-btn" onClick={() => navigate("/contact")}>{PLANS_COPY.getInTouch}</button></div>
              </div>
            </section>
            <div className="pl-then"><h2>{PLANS_COPY.thenH}</h2><p>{PLANS_COPY.thenP}</p></div>
            <Tiers viewer="founding" />
          </>
        )}
        {viewer === "free" && <Tiers viewer="free" />}
        {viewer === "pro" && (
          <section className="sc-card" aria-labelledby="pl-h-pro">
            <div className="sc-ch"><h2 id="pl-h-pro" className="sc-ch-h">{PLANS_COPY.yourPlan}</h2></div>
            <div className="sc-row"><div className="sc-row-l"><div className="sc-lbl">{PLANS_COPY.proRow}</div><div className="sc-dsc">{PLANS_COPY.proRowSub}</div></div></div>
          </section>
        )}

        <section className="sc-card pl-faq" aria-labelledby="pl-h-q">
          <div className="sc-ch"><h2 id="pl-h-q" className="sc-ch-h">{PLANS_COPY.questions}</h2></div>
          {faq(viewer === "founding").map(([q, a]) => (
            <details key={q} className="pl-q"><summary>{q}<ChevronDown aria-hidden="true" /></summary><p>{a}</p></details>
          ))}
        </section>

        <PlanTable viewer={viewer} />
      </div>
    </div>
  );
};
