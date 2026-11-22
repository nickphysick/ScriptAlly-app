/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 §5.6 — "All your packages, side by side": a plain table, one row per package (retired ones
 * too), sent packages by their first query oldest first, then the unsent. Counts only — no rate, no rank, no chart.
 * A row opens on click or Enter.
 */
import React from "react";
import { iconOf } from "../../../lib/packagesV26";
import { contentsLine, tableOrder, tellsYou, totalsLine } from "../../../lib/packagesV62";
import type { SubmissionPackage } from "../../../types";
import { Pic } from "../v26/icons";
import type { Pk62 } from "./usePk62";

export const Pk62Table: React.FC<{ d: Pk62; pkgs: SubmissionPackage[]; onOpen: (p: SubmissionPackage) => void }> = ({ d, pkgs, onOpen }) => {
  const order = tableOrder(pkgs, (p) => (d.info(p).sent ? d.info(p).firstMs ?? Number.MAX_SAFE_INTEGER : null));
  const tot = totalsLine(d.totals);
  const dash = "–";
  return (
    <section className="k62-rc k62-allp" aria-labelledby="k62-allp-h" data-pk62="table">
      <div className="k62-rc-in">
        <div className="k62-rb k62-st"><span id="k62-allp-h">All your packages, side by side</span><small>{d.totals.sent ? "In the order you sent them" : "Nothing sent yet"}</small></div>
        <div className="k62-tbl">
          <table>
            <thead><tr><th scope="col">Package</th><th scope="col">Sent</th><th scope="col">Replied</th><th scope="col">Asked to read more</th><th scope="col">What it tells you</th></tr></thead>
            <tbody>
              {order.map((p) => {
                const i = d.info(p);
                const n = i.counts.sent > 0;
                return (
                  <tr key={p.id} tabIndex={0} data-pk62-tr={p.id} aria-label={`Open ${p.packageName}`}
                    onClick={() => onOpen(p)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onOpen(p); } }}>
                    <td><div className="k62-who"><span className="k62-disc"><Pic ic={iconOf(p)} cls="k62-pic" /></span><div>
                      <b>{p.packageName}{i.inUse ? <i className="k62-ptag">In use</i> : i.retired ? <i className="k62-ptag k62-off">Retired</i> : null}</b>
                      <em>{contentsLine(i.letter?.name ?? null, i.version?.name ?? null)}</em>
                    </div></div></td>
                    <td>{n ? i.counts.sent : dash}</td>
                    <td>{n ? i.counts.replied : dash}</td>
                    <td>{n ? i.counts.asked : dash}</td>
                    <td className="k62-tell">{tellsYou(i.verdict, p)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {tot ? <p className="k62-tbl-n" data-pk62="totals">{tot}</p> : null}
      </div>
    </section>
  );
};
