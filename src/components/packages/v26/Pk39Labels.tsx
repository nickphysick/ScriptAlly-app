/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39 Part B (design-refs/submission-packages-v39/, screens 02–03) — "Your packages": one label per
 * package (ref `#pkl`, `renderPkl`), each in the FULL package colour with a soft gloss, a cream icon tile, the name and
 * its status line, the white ring, and a white "Active" tab on its top edge. Labels share the row (flex 1 1 0, 200 to
 * 340 wide); "+ New package" is a compact dashed tile at the end. A live label loads that package into the builder; a
 * retired one (desaturated) opens the package drawer. The selected label is the only one pressed: lifted 2px and
 * ringed in its own colour behind a page-coloured gap. Markup is the ref's with the `p9-` prefix (pk39.generated.css);
 * every rule the colour drives is in pk39.css.
 * ⚠️ v38's labels (Pk38Labels, `p8-pkl`) are DELETED — this replaces them.
 */
import React from "react";
import type { SubmissionPackage } from "../../../types";
import { iconOf } from "../../../lib/packagesV26";
import { labelStatus, ringOf, type Fig } from "../../../lib/packagesV38";
import { pcStyle } from "../../../lib/packagesV39";
import { Pic } from "./icons";
import type { Pk26Model } from "./usePk26Model";

const C = 2 * Math.PI * 18;

/** The ref's `ringS`: filled share once ranked, dashed while too early, empty when not sent. `pre` is the sheet's prefix. */
export const Ring: React.FC<{ f: Fig; pre?: "p8" | "p9"; z?: number }> = ({ f, pre = "p8", z }) => {
  const r = ringOf(f);
  return (
    <span className={`${pre}-rg${r.k === "none" ? ` ${pre}-none` : r.k === "early" ? ` ${pre}-early` : ""}`} aria-hidden="true" style={z ? ({ "--z": `${z}px` } as React.CSSProperties) : undefined}>
      <svg viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" />
        {r.k === "none" ? null : <circle className={`${pre}-v`} cx="22" cy="22" r="18" strokeDasharray={r.k === "early" ? "3 4" : `${(C * r.pct) / 100} ${C}`} />}
      </svg>
    </span>
  );
};

export const LABELS_ART = "a hawk tying string round a parcel of pages";

export const Pk39Labels: React.FC<{
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
    <nav className="p9-pkl" aria-label="Your packages" data-pk38="labels" data-pk39="labels">
      <span className="p9-pkl-k">
        <span className="p9-ill p9-ill-s" title={`Illustration: ${LABELS_ART}`} aria-hidden="true"><i>Art</i></span>
        <h2 className="p9-pkl-h">Your packages</h2>
      </span>
      <div className="p9-pkl-row">
        {list.map((p) => {
          const ret = p.status === "Retired";
          const on = !ret && p.id === currentId;
          const f = model.figPk(p);
          return (
            <button type="button" key={p.id} className={`p9-pkl-b${ret ? " p9-ret" : ""}${on ? " p9-on" : ""}`} aria-pressed={on} title={p.packageName}
              style={pcStyle(p)} data-pkid={p.id} onClick={() => (ret ? onOpenRetired(p) : onPick(p))}>
              <span className="p9-shc-ic"><Pic ic={iconOf(p)} cls="p9-pic" /></span>
              <span className="p9-pkl-t"><b>{p.packageName}</b><small>{labelStatus(f, ret)}</small></span>
              {!ret && active?.id === p.id ? <em>Active</em> : null}
              <Ring f={f} pre="p9" z={26} />
            </button>
          );
        })}
        <button type="button" className="p9-pkl-new" onClick={onNew}>+ New package</button>
      </div>
      {nret ? <button type="button" className="p9-pkl-f" onClick={() => onShowRetired(!showRetired)}>{showRetired ? "Hide retired" : `Show retired (${nret})`}</button> : null}
    </nav>
  );
};
