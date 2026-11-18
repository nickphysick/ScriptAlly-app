/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 §5.3 — "Your packages": a framed card with a sand band, one row per package that is not
 * retired (and the retired ones too, once "Retired ({n})" is pressed), and a foot with New package. The open package's
 * row is `aria-current`. It stays in view while the right column scrolls (CSS, above 900px).
 */
import React from "react";
import { iconOf } from "../../../lib/packagesV26";
import { contentsLine, packagesWord, resultLine } from "../../../lib/packagesV62";
import type { SubmissionPackage } from "../../../types";
import { Pic } from "../v26/icons";
import type { Pk62 } from "./usePk62";

export const Pk62List: React.FC<{
  d: Pk62;
  live: SubmissionPackage[];
  retired: SubmissionPackage[];
  showRetired: boolean;
  openId: string | null;
  stamp: boolean;
  onShowRetired: (on: boolean) => void;
  onOpen: (p: SubmissionPackage) => void;
  onNew: () => void;
}> = ({ d, live, retired, showRetired, openId, stamp, onShowRetired, onOpen, onNew }) => {
  const rows = showRetired ? [...live, ...retired] : live;
  return (
    <aside className="k62-rc k62-list" aria-label="Your packages" data-pk62="list">
      <div className="k62-rc-in">
        <div className="k62-rb k62-sd"><span>Your packages</span><small>{packagesWord(live.length)}</small></div>
        <div className="k62-plist">
          {rows.map((p) => {
            const i = d.info(p);
            const r = resultLine(i.counts, i.sent, p);
            return (
              <button key={p.id} type="button" className={`k62-prow${i.retired ? " k62-ret" : ""}`} aria-current={p.id === openId ? "true" : undefined}
                data-pk62-row={p.id} onClick={() => onOpen(p)}>
                <span className="k62-disc"><Pic ic={iconOf(p)} cls="k62-pic" /></span>
                <span className="k62-prow-x">
                  <span className="k62-prow-n"><b>{p.packageName}</b>
                    {i.inUse ? <i className={`k62-ptag${stamp ? " k62-stamp" : ""}`}>In use</i> : i.retired ? <i className="k62-ptag k62-off">Retired</i> : null}
                  </span>
                  <span className="k62-prow-c">{contentsLine(i.letter?.name ?? null, i.version?.name ?? null)}</span>
                  <span className="k62-prow-r" data-pk62="row-result">{r.lead ? <><b>{r.lead}</b> {r.text}</> : r.text}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="k62-plist-f">
          <button type="button" className="k62-go" data-pk62="list-new" onClick={onNew}>New package →</button>
          {retired.length ? (
            <button type="button" className="k62-go" data-pk62="retired-toggle" aria-pressed={showRetired} onClick={() => onShowRetired(!showRetired)}>
              {showRetired ? "Hide retired" : `Retired (${retired.length})`}
            </button>
          ) : null}
        </p>
      </div>
    </aside>
  );
};
