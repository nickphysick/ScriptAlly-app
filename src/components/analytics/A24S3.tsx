/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24 S3 — HOW MANY HAVE YOU SENT, AND WHEN? One column per calendar month from the first query to now
 * (`monthlySends`), the latest eighteen, zero months kept as a 4px stub with no count. The busiest month(s) in rust.
 *
 * ⚠️ RUST HERE MEANS "THE BUSIEST MONTH" AND NOTHING ELSE — no status is shown in this chart.
 */
import React from "react";
import { dLong, listWords, type V24 } from "../../lib/analyticsV24";
import { Block, type Reading } from "./A24Frame";

export function s3Readings(v: V24): Reading[] {
  const m = v.monthly;
  const b = m.busiest;
  return [
    { fig: m.lastThree === 0 ? "None" : String(m.lastThree), line: "sent in the last three months" },
    b.length ? { fig: String(b[0].count), line: `${b.length > 1 ? "each " : ""}in ${listWords(b.map((x) => x.long))}, your busiest ${b.length === 1 ? "month" : "months"}` } : { fig: "None", line: "sent in any month" },
    { fig: m.lastMs === null ? "None" : dLong(m.lastMs), line: "your most recent query" },
  ];
}

export const S3Body: React.FC<{ v: V24 }> = ({ v }) => {
  const shown = v.monthly.shown;
  const max = Math.max(1, ...shown.map((x) => x.count));
  return (
    <Block title="Queries sent each month" probe="months">
      {shown.length ? (
        <div className="a24-bars" data-a24="bars">
          {shown.map((x) => (
            <div key={x.key} className={`a24-bar${x.busiest ? " hi" : ""}`} data-a24="month" data-n={x.count} data-busiest={x.busiest ? "" : undefined}>
              <b>{x.count === 0 ? "" : x.count}</b>
              <i style={{ height: x.count === 0 ? "4px" : `calc((100% - 52px) * ${(x.count / max).toFixed(4)})` }} />
              <span title={`${x.long} ${x.year}`}>{x.label}</span>
            </div>
          ))}
        </div>
      ) : <p className="a24-none">None of your queries has a date sent yet.</p>}
    </Block>
  );
};
