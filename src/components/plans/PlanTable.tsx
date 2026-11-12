/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The one plan table — "Everything, side by side" (non-workspace v1, Phase 4; ref: design-refs/plan-table-v1.html).
 * Rows from `lib/planComparison` (PLAN_GROUPS), prices from `lib/planRules`. Used by the signed-in Plans page and
 * the public Pricing page.
 *
 * Desktop: a table with the ref's "What Pro adds / Everything" switch (Pro adds first). Phone (<768px): Free and Pro
 * as a switch, Pro opening first, with "Show everything".
 *
 * ⚠️ NO BUY CONTROL UNLESS THE ONE SELLING FLAG IS ON (`PLANS_ON_SALE`, off). The ref's "Choose a length" is a buy
 *    control (it opens the length picker); with the flag off the Free viewer's Pro foot is empty.
 */
import React, { useState } from "react";
import { Check, Minus } from "lucide-react";
import { PLAN_GROUPS, PLAN_DIFFERS, rowDiffers, type PlanCell } from "../../lib/planComparison";
import { FREE_PRICE, PRO_FROM_LINE, FREE_TRIAL_LINE, PLAN_LENGTHS_LINE } from "../../lib/planRules";
import { PLANS_ON_SALE } from "../../lib/selling";
import { useIsMobile } from "../shell/mobileChrome";
import "./planTable.css";

export type PlanViewer = "free" | "founding" | "pro" | "public";

export const PLAN_TABLE = {
  heading: "Everything, side by side",
  diffLine: (n: number) => `The ${n} things Pro adds. Everything else is the same on both.`,
  allLine: "Every feature, on both plans.",
  diff: "What Pro adds",
  all: "Everything",
  yourPlan: "Your plan",
  yoursFounding: "Yours, as a founding writer",
  choose: "Choose a length",
  seePro: "See what Pro adds",
  showAll: "Show everything",
  showDiff: (n: number) => `Show only the ${n} things Pro adds`,
  proOnly: "Pro only",
} as const;

const CellMark: React.FC<{ cell: PlanCell }> = ({ cell }) => {
  switch (cell.kind) {
    case "figure": return <span className="plt-val">{cell.text}</span>;
    case "included": return <span className="plt-yes" role="img" aria-label="Included"><Check aria-hidden="true" /></span>;
    case "absent": return <span className="plt-no" role="img" aria-label="Not included"><Minus aria-hidden="true" /></span>;
    default: {
      const unhandled: never = cell;
      return unhandled;
    }
  }
};

export const PlanTable: React.FC<{ viewer: PlanViewer; onChooseLength?: () => void; forcePhone?: boolean }> = ({ viewer, onChooseLength, forcePhone }) => {
  const phone = useIsMobile() || !!forcePhone;
  const [diff, setDiff] = useState(true);
  const [tab, setTab] = useState<"free" | "pro">("pro");
  const [phAll, setPhAll] = useState(false);
  const canBuy = PLANS_ON_SALE && !!onChooseLength && (viewer === "free" || viewer === "public");

  if (phone) {
    const pro = tab === "pro";
    return (
      <section className="plt plt--phone" data-plan-table="phone" aria-labelledby="plt-h-ph">
        <div className="plt-phtop">
          <h3 id="plt-h-ph" className="plt-h">{PLAN_TABLE.heading}</h3>
          <div className="plt-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={!pro} onClick={() => { setTab("free"); setPhAll(true); }}><b>Free</b><span>{FREE_PRICE}</span></button>
            <button type="button" role="tab" className="plt-tab--pro" aria-selected={pro} onClick={() => { setTab("pro"); setPhAll(false); }}><b>Pro</b><span>{PRO_FROM_LINE}</span></button>
          </div>
        </div>
        {PLAN_GROUPS.map((g) => {
          const vis = g.rows.filter((r) => phAll || rowDiffers(r));
          if (!vis.length) return null;
          return (
            <div key={g.group}>
              <h4 className="plt-phg">{g.group}</h4>
              <div className="plt-phcard">
                {vis.map((r) => {
                  const cell = pro ? r.pro : r.free;
                  const off = cell.kind === "absent";
                  const only = pro && r.free.kind === "absent" && cell.kind === "included";
                  return (
                    <div key={r.label} className={`plt-phr${off ? " is-off" : ""}`}>
                      <div><b>{r.label}</b>{r.sub && !off && <small>{r.sub}</small>}</div>
                      {only ? <span className="plt-tag">{PLAN_TABLE.proOnly}</span> : <CellMark cell={cell} />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <button type="button" className="plt-more" onClick={() => setPhAll((v) => !v)}>{phAll ? PLAN_TABLE.showDiff(PLAN_DIFFERS) : PLAN_TABLE.showAll}</button>
        {(viewer === "free" || viewer === "public") && (canBuy && pro ? (
          <div className="plt-phcta"><button type="button" className="ph-primary" onClick={onChooseLength}>{PLAN_TABLE.choose}</button></div>
        ) : !pro ? (
          <div className="plt-phcta"><button type="button" className="ph-secondary" onClick={() => { setTab("pro"); setPhAll(false); }}>{PLAN_TABLE.seePro}</button></div>
        ) : null)}
      </section>
    );
  }

  return (
    <section className="plt" data-plan-table="desk" aria-labelledby="plt-h">
      <div className="plt-head">
        <div>
          <h2 id="plt-h" className="plt-h">{PLAN_TABLE.heading}</h2>
          <p className="plt-sub">{diff ? PLAN_TABLE.diffLine(PLAN_DIFFERS) : PLAN_TABLE.allLine}</p>
        </div>
        <div className="plt-seg" role="radiogroup" aria-label="What to show">
          <button type="button" role="radio" aria-checked={diff} onClick={() => setDiff(true)}>{PLAN_TABLE.diff}</button>
          <button type="button" role="radio" aria-checked={!diff} onClick={() => setDiff(false)}>{PLAN_TABLE.all}</button>
        </div>
      </div>
      <div className="plt-scroll">
        <table className="plt-t">
          <thead>
            <tr>
              <td />
              <th scope="col"><b>Free</b><span>{FREE_PRICE}</span><small>{FREE_TRIAL_LINE}</small></th>
              <th scope="col" className="plt-p"><b>Pro</b><span>{PRO_FROM_LINE}</span><small>{PLAN_LENGTHS_LINE}</small></th>
            </tr>
          </thead>
          <tbody>
            {PLAN_GROUPS.map((g) => {
              const vis = g.rows.filter((r) => !diff || rowDiffers(r));
              if (!vis.length) return null;
              return (
                <React.Fragment key={g.group}>
                  <tr className="plt-grp"><th scope="colgroup">{g.group}</th><td /><td className="plt-p" /></tr>
                  {vis.map((r) => (
                    <tr key={r.label} data-feature={r.feature ?? undefined}>
                      <th scope="row"><b>{r.label}</b>{r.sub && <small>{r.sub}</small>}</th>
                      <td data-col="free"><CellMark cell={r.free} /></td>
                      <td data-col="pro" className="plt-p"><CellMark cell={r.pro} /></td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <td>{viewer === "free" && <span className="plt-chip">{PLAN_TABLE.yourPlan}</span>}</td>
              <td className="plt-p">
                {viewer === "founding" ? <span className="plt-chip plt-chip--navy">{PLAN_TABLE.yoursFounding}</span>
                  : viewer === "pro" ? <span className="plt-chip plt-chip--navy">{PLAN_TABLE.yourPlan}</span>
                  : canBuy ? <button type="button" className="plt-cream" onClick={onChooseLength}>{PLAN_TABLE.choose}</button>
                  : null}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
};
