/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v40 — the shelf (ref `section.shelf`, tiles only) and its drawer (ref `.shd`). The shelf holds
 * every package that has gone out — locked, exactly as agents got it — active first and retired last (C). Opening a
 * tile shows what went, how it is doing and who got it, read-only (D, A8): its three actions are the only writes.
 * Markup is the ref's `tabsDecor` (TG t4) and `shelfDrawer`, with the `p6-` prefix.
 */
import React from "react";
import type { SubmissionPackage } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { iconOf } from "../../../lib/packagesV26";
import { canMakeActive, canRetire, dayMonth, shareText } from "../../../lib/packagesV40";
import { Mark, Pic } from "./icons";
import type { Pk26Model } from "./usePk26Model";

/** The ref's `LK`: the padlock beside "On query", on locked chips and in the drawer's header. */
export const Lock: React.FC = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.6" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
);

export const shortDate = (iso: string | undefined | null): string => dayMonth(iso ? Date.parse(iso) : null);

export const Pk40Shelf: React.FC<{ model: Pk26Model; shelf: SubmissionPackage[]; onOpen: (p: SubmissionPackage) => void }> = ({ model, shelf, onOpen }) => {
  const { active, matName } = model;
  return (
    <section className="p6-shelf" data-pk40="shelf" aria-label="On query">
      <div className="p6-sh-hd">
        <h3><Lock /> On query <em>{shelf.length}</em></h3>
        <span>{shelf.length ? "Locked, exactly as agents got them. Open one to see who got it." : ""}</span>
      </div>
      {shelf.length ? (
        <div className="p6-sh-tiles">
          {shelf.map((p) => {
            const f = model.facts(p);
            const use = active?.id === p.id;
            const ret = p.status === "Retired";
            const L = matName("let", p.queryLetterVersionId), Y = matName("syn", p.synopsisVersionId);
            const V = p.bookVersionId ? model.versionRows.find((v) => v.id === p.bookVersionId) ?? null : null;
            const Vn = V ? V.name : matName("ver", p.bookVersionId);
            return (
              <button type="button" key={p.id} className={`p6-sh-tile${use ? " p6-use" : ""}${ret ? " p6-ret" : ""}`} data-pk40="tile" data-pkid={p.id} onClick={() => onOpen(p)}>
                <span className="p6-st-h">
                  <span className="p6-sh-ic"><Pic ic={iconOf(p)} /></span>
                  <span className="p6-st-n"><b>{p.packageName}</b><small>{p.note ?? ""}</small></span>
                  {use ? <em>Active</em> : ret ? <em className="p6-r">Retired</em> : null}
                </span>
                <span className="p6-st-b">
                  <span className="p6-st-p"><i className="p6-t-let"><Mark k="let" /></i>{L ?? "–"}</span>
                  <span className={`p6-st-p${Y ? "" : " p6-o"}`}><i className="p6-t-syn"><Mark k="syn" /></i>{Y ?? "No synopsis"}</span>
                  <span className="p6-st-p"><i className="p6-v">{V ? (V.original ? "O" : V.num) : ""}</i>{Vn ?? "–"}</span>
                </span>
                <span className="p6-st-f">
                  <span className="p6-st-m"><b>{f.n}</b> sent</span>
                  <span className="p6-st-m"><b>{f.pct != null ? `${f.pct}%` : `${f.more} of ${f.n}`}</b> asked for more</span>
                  <span className="p6-st-bar"><u style={{ width: `${f.pct != null ? Math.min(100, f.pct * 2) : 0}%` }} /></span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="p6-sh-empty">Nothing has gone out yet. When you log a query with a package, it moves here and locks, exactly as agents got it.</p>
      )}
    </section>
  );
};

/** The shelf drawer (D): read-only, with "New package from this", "Make active" and "Retire". */
export const Pk40ShelfDrawer: React.FC<{
  model: Pk26Model;
  p: SubmissionPackage | null;
  onClose: () => void;
  onDuplicate: (p: SubmissionPackage) => void;
}> = ({ model, p, onClose, onDuplicate }) => {
  useEscapeLayer(!!p, onClose, ESC_LEVEL.pageDrawer);
  if (!p) return null;
  const { active, matName, extras } = model;
  const use = active?.id === p.id;
  const f = model.facts(p);
  const who = model.whoGot(p);
  const also = (p.extraIds ?? []).map((id) => extras.find((e) => e.id === id)?.name ?? "").filter(Boolean).join(", ");
  const row = (l: string, v: string) => <div className="p6-shd-r"><span>{l}</span><b>{v}</b></div>;
  const since = shortDate(p.firstSentAt);
  return (
    <div className="p6-layer">
      <div className="p6-shd p6-on" data-pk40="shd">
        <div className="p6-shd-dim" onClick={onClose} />
        <aside className="p6-shd-p" role="dialog" aria-modal="true" aria-label={p.packageName}>
          <header>
            <span className="p6-pkb-ic"><Pic ic={iconOf(p)} /></span>
            <div><b>{p.packageName}</b><small><Lock /> On query{since ? ` · locked since ${since}` : ""}{use ? " · Active" : ""}</small></div>
            <button type="button" className="p6-shd-x" aria-label="Close" onClick={onClose}>✕</button>
          </header>
          <div className="p6-shd-b">
            <p className="p6-shd-k">What went</p>
            {row("Query letter", matName("let", p.queryLetterVersionId) ?? "–")}
            {row("Synopsis", matName("syn", p.synopsisVersionId) ?? "None")}
            {row("Pages from", matName("ver", p.bookVersionId) ?? "–")}
            {row("Also sends", also || "Nothing else")}
            <p className="p6-shd-k">How it’s doing</p>
            <div className="p6-shd-st">
              <div><b>{f.n}</b><span>sent</span></div>
              <div><b>{shareText(f) === "–" ? `${f.more} of ${f.n}` : shareText(f)}</b><span>asked for more</span></div>
              <div><b>{f.days ?? "–"}</b><span>days to reply</span></div>
            </div>
            {who.length ? (
              <>
                <p className="p6-shd-k">Who got it</p>
                {who.map((w) => (
                  <div className="p6-shd-w" key={w.id}><i>{w.initials}</i><span><b>{w.name}</b><small>{[w.agency, w.date].filter(Boolean).join(" · ")}</small></span><em>{w.status}</em></div>
                ))}
              </>
            ) : null}
          </div>
          <footer>
            <button type="button" className="p6-shd-p1" data-pk40="dup" onClick={() => onDuplicate(p)}>New package from this</button>
            {canMakeActive(p, active?.id) ? <button type="button" className="p6-shd-p2" onClick={() => { onClose(); void model.makeActive(p); }}>Make active</button> : null}
            <span className="p6-sp" />
            {canRetire(p, active?.id) ? <button type="button" className="p6-shd-p3" onClick={() => { void model.retire(p).then((ok) => { if (ok) onClose(); }); }}>Retire</button> : null}
          </footer>
        </aside>
      </div>
    </div>
  );
};
