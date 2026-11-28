/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Birds-eye polish v1 §E — MY QUERIES ON TODAY (ref `S.pv="groups"`, `S.pvb="sand"`), in place of first look v1's
 * "next three weeks" preview on the phone's Today page.
 *
 * The app's framed card: a white card with a 6px rim, an inner frame (radius 12, a 1px line), the sand band reading
 * "My queries", then four rows — Needs action, Within their window, No reply date yet, Closed — each its label, a bar in
 * proportion to the largest count (150px at most) and the count; at the foot, "Birds-eye view ›". The counts are
 * Birds-eye's own groups (`bwGroups` over the same rows, `bwRowsOf`), so the card and the view always agree. A row with
 * nothing in it stays, showing 0 and no bar. A tap anywhere opens Birds-eye (the day's first look, or the fade).
 *
 * The frame's 12px radius, the sand and the bars' colours are the brief's own values, off the phone sheet's scale, so
 * they are set inline (as the stage colours are) rather than in the stylesheet the phone census counts.
 */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useV3Data } from "../v3/V3Provider";
import { DEFAULT_QUIET_WEEKS } from "../../../lib/queryState";
import { BW_GROUPS, bwGroups, type BwGroupName } from "../../../lib/birdsWorld";
import { beViewPath } from "../../../lib/phoneV5";
import { bwRowsOf } from "./bwRows";
import "./myQueries.css";

/** each group's bar: Needs action striped soft pink, waiting and no date navy, closed grey */
export const MQ_FILL: Record<BwGroupName, string> = {
  "Needs action": "repeating-linear-gradient(135deg, #e8c8bc 0 4px, #f6e6df 4px 7px)",
  "Within their window": "#2a3a52",
  "No reply date yet": "#2a3a52",
  Closed: "#d6d1c9",
};
export const MQ_MAX = 150;
/** the counts, in Birds-eye's group order, every group present (0 where empty) */
export function myQueriesCounts(groups: { t: BwGroupName; rows: unknown[] }[]): { t: BwGroupName; n: number }[] {
  return BW_GROUPS.map((t) => ({ t, n: groups.find((g) => g.t === t)?.rows.length ?? 0 }));
}
/** a bar's length: in proportion to the largest count, 150px at most; none at 0 */
export const mqWidth = (n: number, max: number): number => (n > 0 && max > 0 ? (n / max) * MQ_MAX : 0);
/** the Birds-eye mark (the ref's dock icon: the app's dock has no Birds-eye tab) */
const BE_ICON = "M4 6h9M7 11h12M4 16h7M9 20h11";

export const MyQueriesCard: React.FC = () => {
  const v = useV3Data();
  const navigate = useNavigate();
  const quietDays = (v.quietWeeks ?? DEFAULT_QUIET_WEEKS) * 7;
  const rows = useMemo(() => bwRowsOf(v.qs, v.now), [v.qs, v.now]);
  const counts = useMemo(() => myQueriesCounts(bwGroups(rows, "all", quietDays)), [rows, quietDays]);
  const max = Math.max(0, ...counts.map((c) => c.n));
  return (
    <button type="button" className="ps-card bwq" data-bwq="card" aria-label="My queries: open Birds-eye view" onClick={() => navigate(beViewPath(null))}>
      <span className="bwq-frame" style={{ borderRadius: 12 }}>
        <span className="bwq-band" style={{ background: "#f7efe3" }}>My queries</span>
        <span className="bwq-rows">
          {counts.map(({ t, n }) => (
            <span key={t} className="bwq-r" data-bwq="row" data-g={t} data-n={n}>
              <span className="bwq-l">{t}</span>
              {n > 0 ? <i className="bwq-bar" data-bwq="bar" style={{ width: mqWidth(n, max), background: MQ_FILL[t] }} /> : <i className="bwq-bar none" aria-hidden="true" />}
              <b className="bwq-n">{n}</b>
            </span>
          ))}
        </span>
        <span className="bwq-link" data-bwq="link" data-ps-cap="">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d={BE_ICON} /></svg>
          Birds-eye view ›
        </span>
      </span>
    </button>
  );
};
