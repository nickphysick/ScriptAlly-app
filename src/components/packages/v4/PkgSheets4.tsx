/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v4 Parts C and D — THE PACKAGES SHEET and THE MATERIALS SHEET: white, radius 20, the Query
 * Centre v138 sheet's shadow, under a navy top row.
 *
 * ⚠️ PAGE-LOCAL COPIES of the v138 sheet, its top row, its search, its bands and its heading strip (all of which are
 *    page-local to the Query Centre, `QcList138` / qcvList138.css), from the same values. Lift candidates.
 * ⚠️ ONE ORDER, SO "newest" IS NOT A CONTROL: In use puts the package used for new queries first, then newest.
 */
import React, { useEffect, useRef, useState } from "react";
import type { SubmissionPackage } from "../../../types";
import type { MatKind } from "../../../lib/packagesPage";
import { ICON, KIND_ICON, PkgCard4, pkgs, qs, type CardSlots } from "./parts";
import type { Split } from "../../../lib/packageReplies";
import type { MaterialWithNote } from "./usePackagesModel";

const RETIRED_KEY = "sa.pk4.retiredOpen";
const readOpen = (): boolean => { try { return sessionStorage.getItem(RETIRED_KEY) === "1"; } catch { return false; } };

/** v138.1's in-sheet search: `/` focuses it from anywhere outside a field; Escape clears it */
export const SheetSearch: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea, select, [contenteditable='true']"))) return;
      if (!ref.current || ref.current.getClientRects().length === 0) return;
      e.preventDefault();
      ref.current.focus();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  return (
    <label className="pk4-search" data-pk4="search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input ref={ref} value={value} placeholder={placeholder} aria-label={placeholder} autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && value) { e.preventDefault(); e.stopPropagation(); onChange(""); } }} />
      <kbd aria-hidden="true">/</kbd>
    </label>
  );
};

export interface CardData { pkg: SubmissionPackage; slots: CardSlots; split: Split; sent: boolean; forNew: boolean }

export const PackagesSheet: React.FC<{
  live: CardData[];
  retired: CardData[];
  total: number;
  filtered: boolean;
  /** Retired is part of the filter: its band opens with it */
  retiredForced: boolean;
  noneLive: boolean;
  openId: string | null;
  find: string;
  onFind: (v: string) => void;
  onClearAll: () => void;
  onOpen: (p: SubmissionPackage) => void;
  onNew: () => void;
}> = ({ live, retired, total, filtered, retiredForced, noneLive, openId, find, onFind, onClearAll, onOpen, onNew }) => {
  const [retOpen, setRetOpen] = useState<boolean>(readOpen);
  const shownRet = retOpen || retiredForced || noneLive;
  const toggle = () => {
    const next = !shownRet;
    setRetOpen(next);
    try { sessionStorage.setItem(RETIRED_KEY, next ? "1" : "0"); } catch { /* */ }
  };
  const shownCount = live.length + retired.length;
  const card = (c: CardData) => (
    <PkgCard4 key={c.pkg.id} pkg={c.pkg} slots={c.slots} split={c.split} sent={c.sent} forNew={c.forNew} open={openId === c.pkg.id} onOpen={() => onOpen(c.pkg)} />
  );
  return (
    <section className="pk4-ws" data-pk4="pkg-sheet" aria-label="Your packages">
      <div className="pk4-wsh" data-pk4="pkg-top">
        <p className="pk4-say" data-pk4="showing">
          {filtered
            ? <>Showing <b data-pk4="shown">{shownCount}</b> <span className="pk4-dim">of</span> <b data-pk4="total">{total}</b></>
            : <>Showing all <b data-pk4="total">{total}</b> {total === 1 ? "package" : "packages"}</>}
          <span className="pk4-dim">, sorted by</span> <u className="pk4-u">newest</u>
          {filtered ? <button type="button" className="pk4-clear" data-pk4="clear-all" onClick={onClearAll}>Clear all</button> : null}
        </p>
        <SheetSearch value={find} onChange={onFind} placeholder="Find a package or material" />
      </div>
      {noneLive ? null : (
        <>
          <div className="pk4-band pk4-band--use" data-pk4="band-use" role="heading" aria-level={3}>
            <span className="pk4-bic">{ICON.parcel}</span><span className="pk4-bt">In use</span>
            <span className="pk4-bn" data-pk4="band-n">{pkgs(live.length).toUpperCase()}</span>
            <span className="pk4-bh">For new queries first, then newest</span>
          </div>
          <div className="pk4-grid" data-pk4="grid-use">
            {live.map(card)}
            {filtered ? null : (
              <button type="button" className="pk4-newc" data-pk4="new-tile" onClick={onNew}>
                + New package<span>One query letter, one synopsis and one version of your manuscript, saved together.</span>
              </button>
            )}
            {filtered && live.length === 0 ? <p className="pk4-nomatch" data-pk4="no-match">No package in use matches. <button type="button" onClick={onClearAll}>Clear all</button></p> : null}
          </div>
        </>
      )}
      {noneLive ? (
        <div className="pk4-nonelive" data-pk4="none-live">
          <span className="pk4-band pk4-band--use pk4-band--flat"><span className="pk4-bic">{ICON.parcel}</span><span className="pk4-bt">In use</span><span className="pk4-bn">0 PACKAGES</span></span>
          <p>Nothing in use right now. Start a new package, or restore one from Retired.</p>
          <button type="button" className="pk4-btn pk4-btn--dark" data-pk4="none-new" onClick={onNew}>+ New package</button>
        </div>
      ) : null}
      {retired.length ? (
        <>
          <button type="button" className="pk4-band pk4-band--ret" data-pk4="band-ret" aria-expanded={shownRet} onClick={toggle}>
            <span className="pk4-bic">{ICON.box}</span><span className="pk4-bt">Retired</span>
            <span className="pk4-bn" data-pk4="band-n">{pkgs(retired.length).toUpperCase()}</span>
            <span className="pk4-bh">History kept <i className="pk4-chev" aria-hidden="true">▾</i></span>
          </button>
          {shownRet ? <div className="pk4-grid pk4-grid--ret" data-pk4="grid-ret">{retired.map(card)}</div> : null}
        </>
      ) : null}
      <div className="pk4-wspad" aria-hidden="true" />
    </section>
  );
};

/* ═════ Part D · the materials sheet ═════ */
const COL: { kind: MatKind; title: string; add: string }[] = [
  { kind: "letter", title: "Query letters", add: "+ Add a query letter" },
  { kind: "synopsis", title: "Synopses", add: "+ Add a synopsis" },
  { kind: "version", title: "Manuscript versions", add: "+ Add a manuscript version" },
];

export const MaterialsSheet: React.FC<{
  mats: Record<MatKind, MaterialWithNote[]>;
  /** packages holding a material now, and the queries sent with it (credited, edition-true) */
  use: (m: MaterialWithNote) => { packages: number; sent: number };
  goneOut: (m: MaterialWithNote) => boolean;
  openId: string | null;
  onOpen: (m: MaterialWithNote) => void;
  onAdd: (k: MatKind) => void;
}> = ({ mats, use, goneOut, openId, onOpen, onAdd }) => {
  const [awayOpen, setAwayOpen] = useState<Record<string, boolean>>({});
  const onFile = mats.letter.filter((m) => !m.retired).length + mats.synopsis.filter((m) => !m.retired).length + mats.version.length;
  const row = (m: MaterialWithNote) => {
    const u = use(m);
    const line = u.packages ? `In ${pkgs(u.packages)} · ${u.sent ? `sent with ${qs(u.sent)}` : "not sent yet"}` : "Not in a package yet";
    return (
      <button key={m.id} type="button" className="pk4-mr" data-pk4="mat-row" data-id={m.id} data-open={openId === m.id ? "" : undefined} data-away={m.retired ? "" : undefined} onClick={() => onOpen(m)}>
        <strong>{m.name}{goneOut(m) ? <span className="pk4-mlock" aria-label="Gone out">{ICON.lock}</span> : null}</strong>
        {m.note ? <i>{m.note}</i> : null}
        <span className="pk4-mono" data-pk4="mat-line">{line}</span>
      </button>
    );
  };
  return (
    <section className="pk4-ws pk4-ws--mats" data-pk4="mat-sheet" aria-label="Your materials">
      <div className="pk4-wsh" data-pk4="mat-top">
        <p className="pk4-say">Your materials, <span className="pk4-dim"><b data-pk4="on-file">{onFile}</b> on file</span></p>
        <span className="pk4-mono pk4-wsnote">Choose one to read or edit it</span>
      </div>
      <div className="pk4-mats" data-pk4="mat-cols">
        {COL.map((c) => {
          const all = mats[c.kind];
          const live = all.filter((m) => !m.retired);
          const away = all.filter((m) => m.retired);
          const open = !!awayOpen[c.kind];
          return (
            <div key={c.kind} className="pk4-mcol" data-pk4="mat-col" data-k={c.kind}>
              <div className="pk4-hdstrip" data-pk4="mat-head">
                <span className="pk4-hdi">{KIND_ICON[c.kind]}</span>
                <span className="pk4-hdt">{c.title}</span>
                <span className="pk4-hdn" data-pk4="mat-n">{live.length}</span>
              </div>
              {live.length ? live.map(row) : <div className="pk4-mnone">None yet.</div>}
              {away.length ? (
                <>
                  <button type="button" className="pk4-maway" data-pk4="show-away" aria-expanded={open} onClick={() => setAwayOpen((o) => ({ ...o, [c.kind]: !open }))}>
                    {open ? "Hide put away" : `Show put away · ${away.length}`}
                  </button>
                  {open ? <div className="pk4-awaylist">{away.map(row)}</div> : null}
                </>
              ) : null}
              <button type="button" className="pk4-madd" data-pk4="mat-add" data-k={c.kind} onClick={() => onAdd(c.kind)}>{c.add}</button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
