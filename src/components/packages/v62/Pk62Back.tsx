/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 §5.5 — "What came back", shown only once a query has gone out with the package: the three
 * counts, the verdict (lib/packagesV62 §6.3), where it was copied from and what changed, and "Who got it" — one row per
 * query, its status drawn by StatusDot and named in the app's own words (statusWords).
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { whoGotLine } from "../../../lib/packagesV62";
import type { SubmissionPackage } from "../../../types";
import { M62 } from "./Pk62Icons";
import type { Pk62, PkInfo } from "./usePk62";

export const Pk62Back: React.FC<{ d: Pk62; i: PkInfo; onCopy: (p: SubmissionPackage) => void; onSeeQueries: (ids: string[]) => void }> = ({ d, i, onCopy, onSeeQueries }) => {
  const { counts: c, verdict: v, p } = i;
  if (!i.sent || !c.sent || !v) return null;
  const cmp = d.compare(i);
  const who = d.whoGot(i);
  return (
    <section className="k62-rc" aria-labelledby={`k62-back-${p.id}`} data-pk62="back">
      <div className="k62-rc-in">
        <div className="k62-rb k62-st"><span id={`k62-back-${p.id}`}>What came back</span>{i.sentIn ? <small>{i.sentIn}</small> : null}</div>
        <div className="k62-split">
          <section aria-label="The counts and what they tell you">
            <div className="k62-cells" data-pk62="cells">
              <div><b>{c.sent}</b><span>sent</span></div>
              <div><b>{c.replied}</b><span>replied</span></div>
              <div><b>{c.asked}</b><span>asked to read more</span></div>
            </div>
            <div className={`k62-verd k62-${v.kind}`} data-pk62="verdict" data-pk62-rule={v.rule}>
              <b>{v.heading}</b><p>{v.sentence}</p>
              {v.kind === "fix" && !i.retired ? <button type="button" className="k62-btn" data-pk62="copy-change" onClick={() => onCopy(p)}><M62 k="copy" />Copy it and change something</button> : null}
            </div>
            {cmp ? (
              <div className="k62-cmpl" data-pk62="copied-from">
                <p>Copied from <b>{cmp.name}</b>{cmp.tail ? <>, where <b>{cmp.tail}</b> asked to read more.</> : "."}</p>
                {cmp.chips.length ? <div className="k62-lin-c">{cmp.chips.map((x) => <span key={x} className="k62-chg">{x}</span>)}</div> : null}
              </div>
            ) : null}
          </section>
          <section aria-labelledby={`k62-who-${p.id}`}>
            <h3 className="k62-h3" id={`k62-who-${p.id}`}>Who got it<small>{whoGotLine(c)}</small></h3>
            <ul className="k62-lst" data-pk62="who">
              {who.map((w) => (
                <li key={w.id} className="k62-wr">
                  <span className="k62-wg"><StatusDot status={w.status} overrideSize={18} decorative /></span>
                  <span className="k62-lst-x"><b>{w.name}</b>{w.agency ? <span>{w.agency}</span> : null}</span>
                  <span className="k62-wr-s">{w.words}</span>
                  <time>{w.date}</time>
                </li>
              ))}
            </ul>
            <p className="k62-who-f"><button type="button" className="k62-go" data-pk62="see-queries" onClick={() => onSeeQueries(i.queries.map((q) => q.id))}>See these in Queries →</button></p>
          </section>
        </div>
      </div>
    </section>
  );
};
