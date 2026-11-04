/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 Part D (screens 01–05, 16) — the packages rail: the left column of the workspace, as the
 * Contact list's address book puts agents beside their card. A white card (radius 20, the framed shadow), sticky at
 * the top of the page's scroller and never taller than the scrollport, its rows scrolling inside it.
 *
 * "All packages" and the live count on paper, then the groups Out with agents · Ready · Draft (each only when it has
 * packages), then Retired folded into a footer group, then "+ New package". A row is the package's tile, its name (and
 * Active) and ONE line in its stage's words (`railLine`): "{n} sent · {r}% asked for more" once ranked, "{n} sent ·
 * {k} of 4 answers in" before (the real MIN_SENDS_FOR_CLAIM), "Ready to send", or what a draft still needs (berry).
 * The open package's row wears a tint of its own colour and a 3px edge in it.
 *
 * Selecting a row changes which package the builder shows and nothing else: no scroll. ↑ / ↓ move between rows, Enter
 * or Space selects. A retired row opens its package drawer, as the retired label did (the builder shows live packages).
 * ⚠️ EVERY FIGURE IS THE PACKAGE DRAWER'S (`model.figPk`, packageReplies), so the rail, the drawer and Results agree.
 */
import React, { useRef } from "react";
import type { SubmissionPackage } from "../../../types";
import { MIN_SENDS_FOR_CLAIM } from "../../../lib/packagesV38";
import { packageStage } from "../../../lib/packagesV40";
import { pcStyle } from "../../../lib/packagesV39";
import { LIST_EMPTY, RAIL_TITLE, railGroups, railLine, railLineText, type RailLine } from "../../../lib/packagesV41";
import type { Pk26Model } from "../v26/usePk26Model";
import { PkTile } from "./Pk41Batch";

const Line: React.FC<{ l: RailLine }> = ({ l }) =>
  l.k === "rate" ? <small>{l.sent} sent · <b>{l.pct}%</b> asked for more</small>
    : l.k === "needs" ? <small><em>{l.text}</em></small>
      : <small>{railLineText(l)}</small>;

export const Pk41Rail: React.FC<{
  model: Pk26Model;
  currentId: string | null;
  showRetired: boolean;
  onShowRetired: (v: boolean) => void;
  onSelect: (p: SubmissionPackage) => void;
  onOpenRetired: (p: SubmissionPackage) => void;
  onNew: () => void;
}> = ({ model, currentId, showRetired, onShowRetired, onSelect, onOpenRetired, onNew }) => {
  const box = useRef<HTMLDivElement | null>(null);
  const { groups, retired } = railGroups(model.msPkgs, (p) => packageStage(p));
  const live = groups.reduce((n, g) => n + g.items.length, 0);
  const choose = (p: SubmissionPackage) => (packageStage(p) === "retired" ? onOpenRetired(p) : onSelect(p));
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>, p: SubmissionPackage) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(p); return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const rows = [...(box.current?.querySelectorAll<HTMLElement>("[data-pk41-row]") ?? [])];
    const i = rows.indexOf(e.currentTarget);
    rows[i + (e.key === "ArrowDown" ? 1 : -1)]?.focus();
  };
  const row = (p: SubmissionPackage) => {
    const st = packageStage(p), on = st !== "retired" && p.id === currentId;
    const l = railLine(st, model.figPk(p), { version: !!p.bookVersionId, letter: !!p.queryLetterVersionId }, MIN_SENDS_FOR_CLAIM);
    return (
      <div key={p.id} role="button" tabIndex={0} className={`p41-rr${on ? " p41-on" : ""}${st === "retired" ? " p41-ret" : ""}`} style={pcStyle(p)}
        data-pk41-row={p.id} data-stage={st} aria-current={on ? "true" : undefined} aria-label={`${p.packageName}: ${railLineText(l)}`}
        onClick={() => choose(p)} onKeyDown={(e) => onKey(e, p)}>
        <PkTile p={p} />
        <span><b>{p.packageName}{st !== "retired" && model.active?.id === p.id ? <em className="p41-act">Active</em> : null}</b><Line l={l} /></span>
      </div>
    );
  };
  return (
    <section className="p41-rail" aria-label="Your packages" data-pk41="rail">
      <div className="p41-rail-h" data-pk41="rail-head"><h2 className="p41-rail-t">{RAIL_TITLE} <i data-pk41="rail-count">{live}</i></h2></div>
      <div className="p41-rail-rows" ref={box} data-pk41="rail-rows">
        {groups.map((g) => (
          <div key={g.k} role="group" aria-label={g.label} data-pk41-group={g.k}>
            <div className="p41-rg"><span>{g.label}</span><i data-pk41-n="">{g.items.length}</i></div>
            {g.items.map(row)}
          </div>
        ))}
        {live ? null : <p className="p41-rail-empty" data-pk41="rail-empty">{LIST_EMPTY}</p>}
        {retired.length ? (
          <div role="group" aria-label="Retired" data-pk41-group="retired">
            <button type="button" className="p41-rg p41-rgt" aria-expanded={showRetired} data-pk41="retired-toggle" onClick={() => onShowRetired(!showRetired)}>
              <span>Retired</span><i data-pk41-n="">{retired.length}</i><em>{showRetired ? "Hide" : "Show"}</em>
            </button>
            {showRetired ? retired.map(row) : null}
          </div>
        ) : null}
      </div>
      <button type="button" className="p41-rail-new" data-pk41="rail-new" onClick={onNew}>+ New package</button>
    </section>
  );
};
