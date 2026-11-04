/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 Part E (screens 01, 13, 15) — the package list: ONE white card under a navy bar, as the
 * Contact list's address book. The bar counts the live packages and carries the index tabs (All · Out with agents ·
 * Ready · Draft, each with its count; a tab with none is disabled) and "Show retired (n)". Then a row of column headings
 * and one hairline row per package: its tile, name (and Active), pieces; where it stands; sent; asked for more; and
 * "Open →" ("Finish →" for a draft). The package open in the builder below reads "Open below" instead, on a pale fill
 * with a navy left edge. A live row opens in the builder; a retired one opens its drawer, as the retired label did.
 *
 * ⚠️ EVERY FIGURE IS THE PACKAGE DRAWER'S (`model.figPk`, packageReplies), so the list, the drawer and Results agree.
 */
import React, { useState } from "react";
import type { SubmissionPackage } from "../../../types";
import { packageStage } from "../../../lib/packagesV40";
import { LIST_EMPTY, LIST_TABS, listFilter, packagesCount, rateWords, statusWords, tabCounts, type ListTab } from "../../../lib/packagesV41";
import type { Pk26Model } from "../v26/usePk26Model";
import { PkTile } from "./Pk41Batch";

export const Pk41List: React.FC<{
  model: Pk26Model;
  currentId: string | null;
  showRetired: boolean;
  onShowRetired: (v: boolean) => void;
  onOpen: (p: SubmissionPackage) => void;
  onOpenRetired: (p: SubmissionPackage) => void;
  onNew: () => void;
}> = ({ model, currentId, showRetired, onShowRetired, onOpen, onOpenRetired, onNew }) => {
  const [tab, setTab] = useState<ListTab>("all");
  const pkgs = model.msPkgs;
  const stageOf = (p: SubmissionPackage) => packageStage(p);
  const counts = tabCounts(pkgs.map(stageOf));
  const nret = pkgs.filter((p) => stageOf(p) === "retired").length;
  /* a tab emptied under the reader (its last package moved on) falls back to All */
  const t: ListTab = tab !== "all" && counts[tab] === 0 ? "all" : tab;
  const list = pkgs.filter((p) => listFilter(stageOf(p), t, showRetired && nret > 0));
  const pieces = (p: SubmissionPackage) => [
    p.bookVersionId ? model.versionRows.find((v) => v.id === p.bookVersionId)?.name : null,
    model.matName("let", p.queryLetterVersionId), model.matName("syn", p.synopsisVersionId),
  ].filter(Boolean).join(" · ") || "Nothing in it yet";
  return (
    <section className="p41-list" aria-label="Your packages" data-pk41="list">
      <div className="p41-lb" data-pk41="list-bar">
        <h2 className="p41-lb-h" data-pk41="list-count">{packagesCount(counts.all)}</h2>
        <div className="p41-idx" role="tablist" aria-label="Show">
          {LIST_TABS.map(([k, lab]) => (
            <button type="button" key={k} role="tab" aria-selected={t === k} disabled={k !== "all" && counts[k] === 0} data-pk41-tab={k} onClick={() => setTab(k)}>
              {lab}<i data-pk41-n="">{counts[k]}</i>
            </button>
          ))}
        </div>
        {nret ? <button type="button" className="p41-lnk p41-ret" data-pk41="show-retired" onClick={() => onShowRetired(!showRetired)}>{showRetired ? "Hide retired" : `Show retired (${nret})`}</button> : null}
      </div>
      <div className="p41-rows" role="table" aria-label="Packages">
        <div className="p41-hd2" role="row"><span role="columnheader">Package</span><span role="columnheader">Where it stands</span><span role="columnheader">Sent</span><span role="columnheader">Asked for more</span><span aria-hidden="true" /></div>
        {list.map((p) => {
          const st = stageOf(p), ret = st === "retired", on = !ret && p.id === currentId;
          const f = model.figPk(p), r = rateWords(f);
          const open = () => (ret ? onOpenRetired(p) : onOpen(p));
          return (
            <div key={p.id} role="row" tabIndex={0} className={`p41-row${on ? " p41-on" : ""}${ret ? " p41-ret" : ""}`} data-pk41-row={p.id} data-stage={st} aria-current={on ? "true" : undefined}
              onClick={open} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(); } }}>
              <span className="p41-rn" role="cell"><PkTile p={p} /><span><b>{p.packageName}{!ret && model.active?.id === p.id ? <em className="p41-act">Active</em> : null}</b><small title={pieces(p)}>{pieces(p)}</small></span></span>
              <span role="cell"><span className={`p41-st p41-st-${st}`} data-pk41="status"><i aria-hidden="true" />{statusWords(st, { version: !!p.bookVersionId, letter: !!p.queryLetterVersionId })}</span></span>
              <span className="p41-rc" role="cell" data-pk41="sent">{f.sent || "—"}</span>
              <span className={`p41-rr p41-rr-${r.k}`} role="cell" data-pk41="rate">{r.k === "rate" ? <b>{r.text}</b> : r.text}</span>
              <span className="p41-ra" role="cell">
                {on ? <em data-pk41="open-below">Open below</em>
                  : <button type="button" className="p41-go" tabIndex={-1} onClick={(e) => { e.stopPropagation(); open(); }}>{st === "draft" ? "Finish" : "Open"} →</button>}
              </span>
            </div>
          );
        })}
        {list.length ? null : <p className="p41-empty" data-pk41="list-empty">{LIST_EMPTY}</p>}
      </div>
      <button type="button" className="p41-newrow" data-pk41="list-new" onClick={onNew}>+ New package</button>
    </section>
  );
};
