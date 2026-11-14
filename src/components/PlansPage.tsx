/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Plans page — inside Settings (plans v3; ref: design-refs/plans-v3.html, the sheet only). A header, three plan
 * cards, and closed rows under them. Four viewers: a founding writer (today's only real one), and after launch an
 * account in its first days of Pro, one on Free, one on Pro.
 *
 * ⚠️ ONE LEAD CARD PER VIEWER — the plan being offered. It is tilted and raised, and its pill carries the page's one ✨ (the brief's "only emoji in the
 *    app" was not so: To-do's Housekeeping already had two — see plansPageV3.test). Cards that are not available step back. `plansModel` decides both; the render only draws.
 * ⚠️ PRICES ARE `lib/planRules`'; ROWS ARE `lib/planComparison`'; the comparison is the one `PlanTable`, unchanged.
 * ⚠️ NO BUY CONTROL WHILE `PLANS_ON_SALE` IS OFF (there is no payment path). "Choose Pro" exists only when selling is
 *    on; with it off, the "Not on sale yet" chip stands in its place.
 * ⚠️ NOTHING HERE STATES A PURCHASE. No payment exists, so the Pro viewer has no bought length, end date or receipt —
 *    its headline and card say only what the app holds.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronLeft } from "lucide-react";
import { useScriptAllyDb } from "../lib/db";
import { DAY_MS } from "../lib/entitlements";
import { PRO_PLANS, PRO_FROM, PLAN_LENGTHS_LINE, perMonth, planMonths, ROLL_ON_PRICE, FREE_PRICE, TRIAL_DAYS, type ProPlan } from "../lib/planRules";
import { PLANS_ON_SALE } from "../lib/selling";
import { PlanTable } from "./plans/PlanTable";
import "./settings/settings.css";
import "./plans/plansPage.css";

/** The length the picker opens on (the ref's `len=6`). */
const OPEN_MONTHS = 6;
/** The founding pass's size. ⚠️ NO CLIENT CONSTANT EXISTED (the live cap is a Firestore counter; Auth and Settings type
 *  the number into their own sentences), and `planRules` is out of this run's reach — so this page names it once, and every "50" on
 *  the page reads it. */
export const FOUNDING_CAP = 50;

/** Who is looking. `pending` (founding not yet known) is drawn as founding, as plans v2 did. */
export type PlansViewer = "founding" | "trial" | "free" | "pro";
export type PlanId = "free" | "pro" | "founding";

export const PLANS_COPY = {
  crumb: "Plan",
  head: {
    founding: ["The early bird gets the worm.", "Founding writers pay nothing. We only ask for your feedback."] as const,
    trial: (n: number) => [`You have ${n} day${n === 1 ? "" : "s"} of Pro left.`, "After that you're on Free. Nothing you've made is deleted."] as const,
    free: ["You're on Free.", "Pro adds letters, versions, packages and The Scout."] as const,
    /* ⚠️ WORDS WRITTEN FOR THIS RUN: the ref's "until 19 May" is a bought end date the app does not hold. */
    pro: ["You're on Pro.", `When it ends it rolls on monthly at £${ROLL_ON_PRICE}, until you stop it.`] as const,
  },
  name: { free: "Free", pro: "Pro", founding: "Founding writer" } as Record<PlanId, string>,
  tag: {
    free: "Everything you need to start querying.",
    pro: "The full toolkit, for as long as your campaign runs.",
    founding: `Everything in QueryHawk, on us, for our first ${FOUNDING_CAP} writers.`,
  } as Record<PlanId, string>,
  pill: { openNow: "Open now", atLaunch: "Opens at launch", open: "Open", taken: `All ${FOUNDING_CAP} places taken` },
  freeSub: "For as long as you like.",
  freeList: [
    "One manuscript",
    "Unlimited agents and queries",
    "Response tracking, to-do list and reminders",
    "Smart Import, to bring your list across",
    `${TRIAL_DAYS} days of full Pro to start`,
  ],
  freeTrialFoot: `Yours once your ${TRIAL_DAYS} days of Pro end.`,
  proLead: "Everything in Free, plus:",
  proList: ["Query letters", "Manuscript versions", "Submission packages, and which win requests", "Comparable titles", "The Scout", "Smart email drop"],
  proFrom: `From £${PRO_FROM}`,
  aMonth: "a month",
  proLengths: `For ${PLAN_LENGTHS_LINE}.`,
  foundingUnit: { yours: "for your whole campaign", closed: "for a whole campaign" },
  foundingSub: "No card, nothing to cancel.",
  foundingLead: "Everything in Pro, plus:",
  foundingList: ["Free for your whole querying campaign", "A direct line to our founder", "A say in what gets built next"],
  foundingFoot: "Thank you for helping us get this right.",
  yourPlan: "Your plan",
  notOnSale: "Not on sale yet",
  choosePro: "Choose Pro",
  lengthQ: "How long do you need Pro for?",
  compare: "Compare every feature",
  questions: "Questions",
} as const;

const priceLine = (p: ProPlan) => (p.saving === null ? `One month of Pro.` : `£${perMonth(p)} a month. You save ${p.saving}%.`);

/** The existing after-launch questions (plans v2's `faq(false)`), carried across unchanged. */
export function afterLaunchQuestions(selling: boolean): [string, string][] {
  return [
    ["Will anything here charge me today?", selling ? "Only if you choose a plan. Nothing changes on your account until you do." : "No. Plans aren't on sale yet."],
    ["What happens when my plan ends?", `It rolls on to monthly at £${ROLL_ON_PRICE} so you don't lose Pro mid-campaign. We email you a week before, and stopping it takes one click, here on this page.`],
    ["What if I sign with an agent before it ends?", "Congratulations. Your plan simply runs to its end date. Your records stay yours, on any plan."],
    ["What happens to my Pro work if I go back to Free?", "Nothing is deleted. Your versions and packages are kept and open again if you come back to Pro."],
    ["Why can I only add one manuscript right now?", "Adding a second manuscript is coming soon."],
  ];
}

/* ══════════════ the model — pure, so every viewer is tested without a browser ══════════════ */
export type PriceMode = "free" | "from" | "length" | "founding";
export type CardFoot = "none" | "trialFree" | "founding" | "buy" | "notOnSale";
export interface PlanCardModel {
  id: PlanId;
  /** The plan being offered: tilted, raised, its pill navy with the ✨. Exactly one per viewer. */
  lead: boolean;
  /** Not available: stepped back. */
  wait: boolean;
  /** The founding pass after launch: stepped back further — paler, its text faded. */
  closed: boolean;
  pill: string;
  yours: boolean;
  price: PriceMode;
  picker: boolean;
  foot: CardFoot;
}
export interface PlansModel {
  head: readonly [string, string];
  cards: PlanCardModel[];
  /** Closed rows under the cards, in order. */
  rows: ("compare" | "questions")[];
}

export function plansModel(viewer: PlansViewer, trialDaysLeft: number | null, selling: boolean): PlansModel {
  const P = PLANS_COPY;
  switch (viewer) {
    case "founding":
      return {
        head: P.head.founding,
        cards: [
          { id: "free", lead: false, wait: true, closed: false, pill: P.pill.atLaunch, yours: false, price: "free", picker: false, foot: "none" },
          { id: "founding", lead: true, wait: false, closed: false, pill: P.pill.openNow, yours: true, price: "founding", picker: false, foot: "founding" },
          { id: "pro", lead: false, wait: true, closed: false, pill: P.pill.atLaunch, yours: false, price: "from", picker: false, foot: "none" },
        ],
        rows: ["compare"],
      };
    case "trial":
    case "free":
    case "pro": {
      const onPro = viewer === "pro";
      const free: PlanCardModel = { id: "free", lead: false, wait: false, closed: false, pill: P.pill.open, yours: !onPro, price: "free", picker: false, foot: viewer === "trial" ? "trialFree" : "none" };
      const pro: PlanCardModel = onPro
        /* ⚠️ No stop-rolling-on control exists in the app, so this card has no foot (the brief: "if one exists;
           otherwise no foot"); and no bought length is held, so it shows the from-price, not the ref's bought length and price. */
        ? { id: "pro", lead: true, wait: false, closed: false, pill: P.pill.open, yours: true, price: "from", picker: false, foot: "none" }
        : { id: "pro", lead: true, wait: false, closed: false, pill: P.pill.open, yours: false, price: "length", picker: true, foot: selling ? "buy" : "notOnSale" };
      const founding: PlanCardModel = { id: "founding", lead: false, wait: true, closed: true, pill: P.pill.taken, yours: false, price: "founding", picker: false, foot: "none" };
      const head = viewer === "trial" ? P.head.trial(trialDaysLeft ?? TRIAL_DAYS) : onPro ? P.head.pro : P.head.free;
      return { head, cards: [free, pro, founding], rows: ["compare", "questions"] };
    }
    default: {
      const unhandled: never = viewer;
      return unhandled;
    }
  }
}

/* ══════════════ the render ══════════════ */
/** 328px copies of the 800px art: the panel draws it at 164, so this is 2x and no more. */
const ART: Record<PlanId, string> = { free: "/images/tier-free-328.png", pro: "/images/tier-pro-328.png", founding: "/images/tier-founding-328.png" };

const LengthPicker: React.FC<{ len: ProPlan["months"]; setLen: (m: ProPlan["months"]) => void }> = ({ len, setLen }) => {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = PRO_PLANS.length;
    const j = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n : -1;
    if (j < 0) return;
    e.preventDefault();
    setLen(PRO_PLANS[j].months);
    (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus();
  };
  return (
    <div className="pl-len" role="radiogroup" aria-label={PLANS_COPY.lengthQ}>
      {PRO_PLANS.map((p, i) => (
        <button key={p.months} type="button" role="radio" aria-checked={p.months === len} tabIndex={p.months === len ? 0 : -1} onClick={() => setLen(p.months)} onKeyDown={(e) => onKey(e, i)}>
          <b>{planMonths(p.months)}</b><span>£{p.price}</span>
        </button>
      ))}
    </div>
  );
};

const PlanCard: React.FC<{ c: PlanCardModel; len: ProPlan["months"]; setLen: (m: ProPlan["months"]) => void }> = ({ c, len, setLen }) => {
  const P = PLANS_COPY;
  const cur = PRO_PLANS.find((p) => p.months === len)!;
  const cls = ["pl-tier", c.id === "pro" && "pl-tier--pro", c.id === "founding" && "pl3-found", c.lead && "is-lead", c.wait && "is-wait", c.closed && "is-closed"].filter(Boolean).join(" ");
  const [price, unit, sub] =
    c.price === "free" ? [FREE_PRICE, "", P.freeSub]
    : c.price === "founding" ? [FREE_PRICE, c.closed ? P.foundingUnit.closed : P.foundingUnit.yours, P.foundingSub]
    : c.price === "from" ? [P.proFrom, P.aMonth, P.proLengths]
    : [`£${cur.price}`, `for ${planMonths(cur.months)}`, priceLine(cur)];
  const lead = c.id === "pro" ? P.proLead : c.id === "founding" ? P.foundingLead : null;
  const list = c.id === "pro" ? P.proList : c.id === "founding" ? P.foundingList : P.freeList;
  return (
    <article className={cls} data-plan={c.id} data-lead={c.lead ? "1" : undefined} aria-labelledby={`pl3-h-${c.id}`}>
      <div className="pl3-art">
        <span className="pl3-pill" data-plans="pill">{c.lead && <span aria-hidden="true">{"✨ "}</span>}{c.pill}</span>
        {c.yours && <span className="plt-chip"><Check aria-hidden="true" />{P.yourPlan}</span>}
        <img src={ART[c.id]} alt="" width={164} height={164} decoding="async" />
      </div>
      <div className="pl3-in">
        <h3 id={`pl3-h-${c.id}`}>{P.name[c.id]}</h3>
        <p className="pl3-tag">{P.tag[c.id]}</p>
        <div className="pl-price"><b>{price}</b>{unit && <span>{unit}</span>}</div>
        <p className="pl-sub">{sub}</p>
        {c.picker && <LengthPicker len={len} setLen={setLen} />}
        <hr />
        <ul className="pl-feat">
          {lead && <li className="pl-lead">{lead}</li>}
          {list.map((t) => <li key={t}><Check aria-hidden="true" /><span>{t}</span></li>)}
        </ul>
        {c.foot !== "none" && (
          <div className="pl3-foot">
            {c.foot === "trialFree" ? P.freeTrialFoot
              : c.foot === "founding" ? P.foundingFoot
              : c.foot === "buy" ? <button type="button" className="plt-cream">{P.choosePro}</button>
              : <span className="plt-chip plt-chip--navy">{P.notOnSale}</span>}
          </div>
        )}
      </div>
    </article>
  );
};

/** The page body for one viewer — plain props, so the lab and the tests draw every state the route cannot reach. */
export const PlansView: React.FC<{ viewer: PlansViewer; trialDaysLeft: number | null; selling: boolean; onBack: () => void }> = ({ viewer, trialDaysLeft, selling, onBack }) => {
  const [len, setLen] = useState<ProPlan["months"]>(OPEN_MONTHS);
  const m = plansModel(viewer, trialDaysLeft, selling);
  const [h, d] = m.head;
  return (
    <div className="acct-page pl-page" data-plans-state={viewer}>
      <div className="acct-plane"><div className="acct-grid">
      <div className="acct-work pl-work">
        <button type="button" className="pl-crumb" onClick={onBack}><ChevronLeft aria-hidden="true" />{PLANS_COPY.crumb}</button>
        <header className="sc-ttl sc-ttl--live" data-plans="headline">
          <h1 className="sc-ttl-h">{h}</h1>
          <p className="sc-ttl-d">{d}</p>
        </header>
        <div className="pl3" data-plans="cards">
          {m.cards.map((c) => <PlanCard key={c.id} c={c} len={len} setLen={setLen} />)}
        </div>
        <div className="pl3-more">
          {m.rows.map((r) => (
            <details key={r} data-plans={r}>
              <summary>{r === "compare" ? PLANS_COPY.compare : PLANS_COPY.questions}<ChevronDown aria-hidden="true" /></summary>
              {r === "compare"
                ? <PlanTable viewer={viewer === "founding" ? "founding" : viewer === "pro" ? "pro" : "free"} />
                : afterLaunchQuestions(selling).map(([q, a]) => (
                    <details key={q} className="pl-q"><summary>{q}<ChevronDown aria-hidden="true" /></summary><p>{a}</p></details>
                  ))}
            </details>
          ))}
        </div>
      </div>
      </div></div>
    </div>
  );
};

/** The entitlement's basis → the viewer. `pending` is drawn as founding, as plans v2 did. */
export const plansViewerOf = (basis: string): PlansViewer =>
  basis === "founding" || basis === "pending" ? "founding" : basis === "pro" ? "pro" : basis === "trial" ? "trial" : "free";

export const PlansPage: React.FC = () => {
  const { entitlement } = useScriptAllyDb();
  const navigate = useNavigate();
  const viewer = plansViewerOf(entitlement.basis);
  const trialDaysLeft = entitlement.trialEndsMs ? Math.max(1, Math.ceil((entitlement.trialEndsMs - Date.now()) / DAY_MS)) : null;
  return <PlansView viewer={viewer} trialDaysLeft={trialDaysLeft} selling={PLANS_ON_SALE} onBack={() => navigate("/account/plan")} />;
};
