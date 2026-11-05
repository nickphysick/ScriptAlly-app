/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v42 Part C (screens 01, 03, 06, 14) — the stat tiles: a row on the page between the header and
 * the builder (never inside the builder), one tile per live package in the data's order. A tile is a button that opens
 * its package in the builder below, and nothing else: no scroll. Its top is white (the navy icon tile and the name in
 * the serif); its foot is beige, with the figure in the typewriter and its label in the serif, in its stage's words
 * (`tileFoot` over v41's `railLine`, so the figures are packageReplies' and the threshold is the real constant).
 *
 * The open tile is ringed in navy with a notch pointing down at the builder; the current batch (the manuscript's
 * active package) carries a small navy tag on its top edge — only one tile can. "Retired (n)" at the end of the row
 * shows the retired tiles (faded); it is absent at 0. A retired tile opens its package drawer, as v41's retired row
 * did: the builder shows live packages. ← / → move between tiles.
 */
import React, { useRef } from "react";
import type { SubmissionPackage } from "../../../types";
import { MIN_SENDS_FOR_CLAIM } from "../../../lib/packagesV38";
import { packageStage } from "../../../lib/packagesV40";
import { railLine } from "../../../lib/packagesV41";
import { CURRENT_BATCH, retiredLink, tileFoot } from "../../../lib/packagesV42";
import type { Pk26Model } from "../v26/usePk26Model";
import { PkTile } from "./PkTile";

export const Pk42Tiles: React.FC<{
  model: Pk26Model;
  currentId: string | null;
  showRetired: boolean;
  onShowRetired: (v: boolean) => void;
  onSelect: (p: SubmissionPackage) => void;
  onOpenRetired: (p: SubmissionPackage) => void;
}> = ({ model, currentId, showRetired, onShowRetired, onSelect, onOpenRetired }) => {
  const box = useRef<HTMLDivElement | null>(null);
  const live = model.live;
  const retired = model.msPkgs.filter((p) => packageStage(p) === "retired");
  const activeId = model.active && live.some((p) => p.id === model.active!.id) ? model.active.id : null;
  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const tiles = [...(box.current?.querySelectorAll<HTMLButtonElement>("[data-pk42-tile]") ?? [])];
    const i = tiles.indexOf(e.currentTarget);
    tiles[i + (e.key === "ArrowRight" ? 1 : -1)]?.focus();
  };
  const tile = (p: SubmissionPackage) => {
    const st = packageStage(p), ret = st === "retired";
    const has = { version: !!p.bookVersionId, letter: !!p.queryLetterVersionId };
    const f = tileFoot(railLine(st, model.figPk(p), has, MIN_SENDS_FOR_CLAIM), has);
    const on = !ret && p.id === currentId, cb = !ret && p.id === activeId;
    return (
      <button key={p.id} type="button" className={`p42-tile${on ? " p42-on" : ""}${ret ? " p42-ret" : ""}`} data-pk42-tile={p.id} data-stage={st}
        aria-pressed={ret ? undefined : on} aria-label={`${p.packageName}: ${f.big}${f.label ? ` ${f.label}` : ""}${cb ? `, ${CURRENT_BATCH.toLowerCase()}` : ""}`}
        onClick={() => (ret ? onOpenRetired(p) : onSelect(p))} onKeyDown={onKey}>
        {cb ? <em className="p42-cb" data-pk42="current-batch">{CURRENT_BATCH}</em> : null}
        <span className="p42-tt"><PkTile p={p} cls="p42-tic" /><span className="p42-tn" data-pk42="tile-name">{p.packageName}</span></span>
        <span className="p42-tf" data-pk42="tile-foot"><b className="p42-big">{f.big}</b>{f.label ? <span className="p42-bl">{f.label}</span> : null}</span>
      </button>
    );
  };
  return (
    <div className="p42-tiles" ref={box} role="group" aria-label="Your packages" data-pk42="tiles">
      {live.map(tile)}
      {showRetired ? retired.map(tile) : null}
      {retired.length ? (
        <button type="button" className="p42-retl" aria-expanded={showRetired} data-pk42="retired-toggle" onClick={() => onShowRetired(!showRetired)}>
          {retiredLink(retired.length, showRetired)}
        </button>
      ) : null}
    </div>
  );
};
