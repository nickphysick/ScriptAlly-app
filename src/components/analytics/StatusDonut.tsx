/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Where things stand" — every query in the range, in one of five roles.
 *
 * ⚠️ THE LIST IS THE LEGEND, and it carries the counts. A donut alone asks the reader to judge
 * angles; the ring gives the shape and the rows give the figures, which is what the two are
 * respectively good at.
 *
 * ⚠️ A ROLE WITH NO QUERIES IN IT IS ABSENT, NOT DRAWN AT ZERO. A legend row for a category the
 * writer has never been in is a line of the page spent saying nothing.
 *
 * ⚠️ THE ARC IS ONE `stroke-dasharray` ON A CIRCLE, not a path per segment. Arithmetic on arc
 * endpoints is where a donut usually goes wrong — a 359.9° segment flips its large-arc flag and
 * draws inside out. A dashed stroke cannot: the browser walks the circumference.
 */
import React from "react";
import { AnalyticsRow, statusBreakdown } from "../../lib/analytics";
import { useChartTip } from "./chartPlumbing";
import { useOpenTarget, svgDoor } from "./useOpenTarget";
import { AnalyticsTarget } from "./openInQueryCentre";

const SIZE = 168;
const C = SIZE / 2;
const R = 64;
const STROKE = 22;
const CIRC = 2 * Math.PI * R;

/* ⚠️ NONE OF THE FIVE ROLES IS EXACTLY EXPRESSIBLE by the hub's four-value param — `awaiting` is
   wider than "still out" and `closed` spans both settled roles — so each opens the hub unfiltered
   with its intent recorded. See FILTER_GAP. */
const roleTarget = (key: string): AnalyticsTarget => ({ kind: "unfiltered", intent: `donut:${key}` });

export const StatusDonut: React.FC<{ rows: AnalyticsRow[] }> = ({ rows }) => {
  const tip = useChartTip();
  const open = useOpenTarget();
  const segments = statusBreakdown(rows);
  const total = segments.reduce((n, s) => n + s.count, 0);

  if (total === 0) {
    return (
      <div className="an-emptystate">
        <p>No queries in this period. Choose a wider range, or the picture fills in as you send.</p>
      </div>
    );
  }

  let acc = 0;

  return (
    <>
      <div className="an-donutwrap">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img"
          aria-label={`${total} ${total === 1 ? "query" : "queries"} by where they stand`}>
          {segments.map((s) => {
            const fraction = s.count / total;
            /* the 2px shortfall is the gap between neighbouring segments — a hairline of ground
               rather than a stroke, so it works on any two adjacent fills */
            const lit = Math.max(0, CIRC * fraction - 2);
            const arc = (
              <circle
                key={s.key}
                className="an-arc"
                cx={C}
                cy={C}
                r={R}
                fill="none"
                stroke={s.colour}
                strokeWidth={STROKE}
                strokeDasharray={`${lit} ${CIRC - lit}`}
                /* start at twelve o'clock rather than three */
                strokeDashoffset={-acc * CIRC + CIRC * 0.25}
                {...svgDoor(open(roleTarget(s.key)), roleTarget(s.key), `${s.count} ${s.label.toLowerCase()}`)}
                {...tip.bind({
                  kicker: s.label,
                  headline: `${s.count} of ${total} · ${s.percent}%`,
                  detail: s.note,
                })}
              />
            );
            acc += fraction;
            return arc;
          })}
          <text x={C} y={C - 2} textAnchor="middle" className="an-donuttotal">{total}</text>
          <text x={C} y={C + 18} textAnchor="middle" className="an-axis an-axis--big">QUERIES</text>
        </svg>

        <div className="an-dlist">
          {segments.map((s) => (
            <button type="button" className="an-drow" key={s.key}
              onClick={open(roleTarget(s.key))}
              aria-label={`Open the Query Centre — ${s.count} ${s.label.toLowerCase()}`}
              {...tip.bind({ kicker: s.label, headline: `${s.count} of ${total} · ${s.percent}%`, detail: s.note })}>
              <span className="an-sw" style={{ background: s.colour }} />
              <span className="an-dname">{s.label}</span>
              <span className="an-dn">{s.count}</span>
              <span className="an-dp">{s.percent}%</span>
            </button>
          ))}
        </div>
      </div>
      {tip.node}
    </>
  );
};
