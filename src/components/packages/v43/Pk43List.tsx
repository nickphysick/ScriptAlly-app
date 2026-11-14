/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 Phase 2 (ref screens 01, 03) — "YOUR PACKAGES", the list on the left of the desk, in place of
 * v42's stat tiles. One row per live package in the order the tiles used (the model's `live`); a row is Query letters'
 * row (`.qlp-row`, queryLetters.css, reused — not restyled): the navy icon tile and the name in the typewriter, the note
 * in italic beneath, the berry flag on the package new queries go out with, and under a dashed rule the package's one
 * figure — exactly its v42 tile's (`tileFoot` over v41's `railLine`, so every number is packageReplies') — with a thin
 * navy bar beside percentages and counts.
 *
 * The open package's row is `aria-current="true"` (the 2px navy ring); a row is a button and opens its package in the
 * builder, as a tile did. "Retired (n)" shows the retired packages as faded rows ("Hide retired" puts them away); a
 * retired row opens its package drawer, as a retired tile did.
 */
import React from "react";
import type { SubmissionPackage } from "../../../types";
import { MIN_SENDS_FOR_CLAIM } from "../../../lib/packagesV38";
import { packageStage } from "../../../lib/packagesV40";
import { railLine } from "../../../lib/packagesV41";
import { retiredLink, tileFoot } from "../../../lib/packagesV42";
import { GOING_OUT, LIST_TITLE, NO_NOTE } from "../../../lib/packagesV43";
import { Ic, TICK } from "../../letters/letterBits";
import type { Pk26Model } from "../v26/usePk26Model";
import { PkTile } from "../v42/PkTile";

/** The row's figure and, for a percentage or a count, how full its bar is (0–100). */
export function rowFigure(model: Pk26Model, p: SubmissionPackage): { big: string; label: string; bar: number | null } {
  const st = packageStage(p);
  const has = { version: !!p.bookVersionId, letter: !!p.queryLetterVersionId };
  const l = railLine(st, model.figPk(p), has, MIN_SENDS_FOR_CLAIM);
  const f = tileFoot(l, has);
  const bar = l.k === "rate" ? l.pct : l.k === "answers" ? Math.round((100 * l.got) / Math.max(1, l.need))
    : l.k === "needs" ? 50 * ((has.version ? 1 : 0) + (has.letter ? 1 : 0)) : null;
  return { ...f, bar };
}

export const Pk43List: React.FC<{
  model: Pk26Model;
  openId: string | null;
  /** the package new queries go out with (the manuscript's active package), or none */
  goingId: string | null;
  /** the flag stamps in after Change (Phase 3) */
  stamp: boolean;
  showRetired: boolean;
  onShowRetired: (v: boolean) => void;
  onSelect: (p: SubmissionPackage) => void;
  onOpenRetired: (p: SubmissionPackage) => void;
  onNew: () => void;
}> = ({ model, openId, goingId, stamp, showRetired, onShowRetired, onSelect, onOpenRetired, onNew }) => {
  const retired = model.msPkgs.filter((p) => packageStage(p) === "retired");
  const row = (p: SubmissionPackage) => {
    const ret = packageStage(p) === "retired";
    const f = rowFigure(model, p);
    const going = !ret && p.id === goingId;
    return (
      <button key={p.id} type="button" className={`qlp-row pk43-row${ret ? " pk43-row--ret" : ""}`} data-pk43-row={p.id} data-stage={packageStage(p)}
        aria-current={!ret && p.id === openId ? "true" : "false"} onClick={() => (ret ? onOpenRetired(p) : onSelect(p))}>
        <span className="pk43-row-h">
          <PkTile p={p} cls="pk43-ic" />
          <span className="pk43-row-t">
            <span className="qlp-row-n" data-pk43="row-name">{p.packageName}</span>
            <span className="qlp-row-s">{p.note?.trim() ? p.note : NO_NOTE}</span>
          </span>
        </span>
        {going ? <span className={`qlp-flag${stamp ? " qlp-flag--stamp" : ""}`} data-pk43="flag"><Ic d={TICK} w={2.4} />{GOING_OUT}</span> : null}
        <span className="qlp-row-f" data-pk43="row-figure">
          <span><b>{f.big}</b>{f.label ? ` ${f.label}` : ""}</span>
          {f.bar !== null ? <span className="qlp-bar" aria-hidden="true"><i style={{ width: `${f.bar}%` }} /></span> : null}
        </span>
      </button>
    );
  };
  return (
    <nav className="qlp-list pk43-list" aria-label={LIST_TITLE} data-pk43="list">
      <h2 className="qlp-h2">{LIST_TITLE}</h2>
      <div className="qlp-rows" data-pk43="rows">
        {model.live.map(row)}
        {showRetired ? retired.map(row) : null}
      </div>
      <div className="pk43-list-f">
        <button type="button" className="qlp-lnk" data-pk43="list-new" onClick={onNew}>+ New package</button>
        {retired.length ? (
          <button type="button" className="qlp-lnk" data-pk43="retired-toggle" aria-expanded={showRetired} onClick={() => onShowRetired(!showRetired)}>
            {retiredLink(retired.length, showRetired)}
          </button>
        ) : null}
      </div>
    </nav>
  );
};
