/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v38 — "Your packages" (ref `#pkl`, `renderPkl`): one label per package under the header. A live
 * label loads that package into the builder; a retired one opens the package drawer (retired packages can't be
 * edited). The selected label is the only one pressed. Markup is the ref's, with the `p8-` prefix
 * (pk38.generated.css).
 */
import React from "react";
import type { SubmissionPackage } from "../../../types";
import { iconOf } from "../../../lib/packagesV26";
import { labelStatus, ringOf, type Fig } from "../../../lib/packagesV38";
import { Pic } from "./icons";
import type { Pk26Model } from "./usePk26Model";

const C = 2 * Math.PI * 18;

/** The ref's `ringS`: filled share once ranked, dashed while too early, empty when not sent. */
export const Ring: React.FC<{ f: Fig }> = ({ f }) => {
  const r = ringOf(f);
  return (
    <span className={`p8-rg${r.k === "none" ? " p8-none" : r.k === "early" ? " p8-early" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" />
        {r.k === "none" ? null : <circle className="p8-v" cx="22" cy="22" r="18" strokeDasharray={r.k === "early" ? "3 4" : `${(C * r.pct) / 100} ${C}`} />}
      </svg>
    </span>
  );
};

export const Pk38Labels: React.FC<{
  model: Pk26Model;
  currentId: string | null;
  showRetired: boolean;
  onShowRetired: (v: boolean) => void;
  onPick: (p: SubmissionPackage) => void;
  onOpenRetired: (p: SubmissionPackage) => void;
  onNew: () => void;
}> = ({ model, currentId, showRetired, onShowRetired, onPick, onOpenRetired, onNew }) => {
  const { msPkgs, active } = model;
  const nret = msPkgs.filter((p) => p.status === "Retired").length;
  const list = msPkgs.filter((p) => showRetired || p.status !== "Retired");
  return (
    <nav className="p8-pkl" aria-label="Your packages" data-pk38="labels">
      <span className="p8-pkl-k">Your packages</span>
      <div className="p8-pkl-row">
        {list.map((p) => {
          const ret = p.status === "Retired";
          const on = !ret && p.id === currentId;
          const f = model.figPk(p);
          return (
            <button type="button" key={p.id} className={`p8-pkl-b${ret ? " p8-ret" : ""}${on ? " p8-on" : ""}`} aria-pressed={on} title={p.packageName}
              data-pkid={p.id} onClick={() => (ret ? onOpenRetired(p) : onPick(p))}>
              <span className="p8-shc-ic"><Pic ic={iconOf(p)} cls="p8-pic" /></span>
              <span className="p8-pkl-t"><b>{p.packageName}</b><small>{labelStatus(f, ret)}</small></span>
              {!ret && active?.id === p.id ? <em>Active</em> : null}
              <Ring f={f} />
            </button>
          );
        })}
        <button type="button" className="p8-pkl-new" onClick={onNew}>+ New package</button>
      </div>
      {nret ? <button type="button" className="p8-pkl-f" onClick={() => onShowRetired(!showRetired)}>{showRetired ? "Hide retired" : `Show retired (${nret})`}</button> : null}
    </nav>
  );
};
