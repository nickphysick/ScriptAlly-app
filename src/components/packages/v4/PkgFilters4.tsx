/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v4 Part B — THE FILTER ROW: Status · Query letter · Synopsis · Version · More filters, the
 * Contact list v17's pills and panels exactly.
 *
 * ⚠️ REUSED BY CLASS, NOT BY COMPONENT. `ContactFilterStrip` is bound to the contact filter model, so the markup is
 *    rebuilt here over the packages' own; the CLASSES are v17's (`cl14-fp cl17-fp`, `cl17-fpw`, `cl17-fpx`, the
 *    portalled `lpop cl17-pop` panel and its `cl17-opt` rows), whose rules are global and stated in literals in
 *    contactV17.css, so the two pages draw one pill and one panel. Outside presses, Escape and the scroll rule are
 *    the shared `usePopover`'s. A lift candidate: a shell FilterPill + FilterPanel.
 * ⚠️ STATUS IS ONE STATE WITH THE HEADER CARD'S ROWS: the page holds it and hands it to both.
 * ⚠️ A PACKAGE MATCHES A MATERIAL FILTER WHEN ITS CURRENT EDITION HOLDS IT — its live slots, which `editionsOf`
 *    guarantees are the current edition's — never any edition it has had.
 */
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PopoverState } from "../../shell/ListPills";
import type { SubmissionPackage } from "../../../types";
import { STATUS_LABEL, STATUS_ORDER, type StatusKey } from "./PkgHeader4";
import { pkgs } from "./parts";
import type { MaterialWithNote } from "./usePackagesModel";

export type PkgPop = "status" | "letter" | "synopsis" | "version" | "more";

export interface PkgFilters {
  status: StatusKey[];
  letters: string[];
  /** "" is No synopsis */
  synopses: string[];
  /** "" is Not recorded */
  versions: string[];
  note: boolean;
  also: boolean;
}
export const emptyPkgFilters = (): PkgFilters => ({ status: [], letters: [], synopses: [], versions: [], note: false, also: false });
export const filterCount = (f: PkgFilters): number =>
  (f.status.length ? 1 : 0) + (f.letters.length ? 1 : 0) + (f.synopses.length ? 1 : 0) + (f.versions.length ? 1 : 0) + (f.note ? 1 : 0) + (f.also ? 1 : 0);

/** Does a package pass the filters? `status` is the package's own key (Sent · Not sent yet · Retired). */
export function pkgMatches(p: SubmissionPackage, st: StatusKey, f: PkgFilters): boolean {
  if (f.status.length && !f.status.includes(st)) return false;
  if (f.letters.length && !f.letters.includes(p.queryLetterVersionId)) return false;
  if (f.synopses.length && !f.synopses.includes(p.synopsisVersionId || "")) return false;
  if (f.versions.length && !f.versions.includes(p.bookVersionId || "")) return false;
  if (f.note && !p.note?.trim()) return false;
  if (f.also && !p.otherMaterials?.trim()) return false;
  return true;
}

export const MORE_ROWS: { key: "note" | "also"; label: string; line: string }[] = [
  { key: "note", label: "Has a note", line: "You've written something about it" },
  { key: "also", label: "Also sends something", line: "Has an 'anything else' line" },
];

const Chevron: React.FC = () => (
  <svg className="cl17-chev" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" /></svg>
);

/** the drop-down: 10 under its pill (its left edge, or its right for More filters), scrolling inside */
const Panel: React.FC<{
  k: PkgPop; anchor: HTMLElement | null; id: string; title: string; note: string; align?: "left" | "right";
  showing: number; onClear?: () => void; onClose: () => void; children: React.ReactNode;
}> = ({ k, anchor, id, title, note, align = "left", showing, onClear, onClose, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const held = useRef(false);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  useLayoutEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    setPos(align === "right"
      ? { top: r.bottom + 10, right: Math.max(16, window.innerWidth - r.right) }
      : { top: r.bottom + 10, left: Math.max(16, Math.min(r.left, window.innerWidth - 300 - 16)) });
  }, [anchor, align]);
  useEffect(() => {
    if (!pos) return undefined;
    ref.current?.querySelector<HTMLElement>("[data-opt]")?.focus({ preventScroll: true });
    return () => { if (held.current && anchor?.isConnected) anchor.focus({ preventScroll: true }); };
  }, [pos, anchor]);
  if (!anchor || !pos) return null;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const opts = [...(ref.current?.querySelectorAll<HTMLElement>("[data-opt]") ?? [])];
    if (!opts.length) return;
    e.preventDefault();
    const i = opts.indexOf(document.activeElement as HTMLElement);
    opts[(i + (e.key === "ArrowDown" ? 1 : opts.length - 1) + (i < 0 && e.key === "ArrowUp" ? 1 : 0)) % opts.length].focus();
  };
  return createPortal(
    <div className="lpop cl17-pop pk4-pop" data-lpop={k} data-pk4="panel" id={id} role="dialog" aria-label={title} ref={ref} onKeyDown={onKey}
      onFocusCapture={() => { held.current = true; }}
      onBlurCapture={(e) => { if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) held.current = e.relatedTarget === null ? held.current : false; }}
      style={{ top: pos.top, left: pos.left, right: pos.right, maxHeight: `min(560px, calc(100vh - 220px), calc(100vh - ${Math.round(pos.top) + 16}px))` }}>
      <div className="cl17-pop-h" data-pk4="panel-head"><b>{title}</b><span>{note}</span></div>
      <div className="cl17-pop-b">{children}</div>
      <div className="cl17-pop-f" data-pk4="panel-foot">
        {onClear ? <button type="button" className="cl17-pop-clear" data-pk4="panel-clear" onClick={onClear}>Clear</button> : <span />}
        <button type="button" className="cl17-pop-show" data-pk4="panel-show" onClick={() => { anchor.focus({ preventScroll: true }); onClose(); }}>
          Show {showing} {showing === 1 ? "package" : "packages"}
        </button>
      </div>
    </div>,
    document.body,
  );
};

export const PkgFilters4: React.FC<{
  filters: PkgFilters;
  onFilters: (f: PkgFilters) => void;
  pop: PopoverState<PkgPop>;
  /** the packages each status holds, for the Status panel */
  statusCounts: Record<StatusKey, number>;
  letters: MaterialWithNote[];
  synopses: MaterialWithNote[];
  versions: MaterialWithNote[];
  /** how many packages (live and retired) hold a material in their current edition */
  inPackages: (kind: "letter" | "synopsis" | "version", id: string) => number;
  /** what the filters leave showing now */
  showing: number;
}> = ({ filters: f, onFilters, pop, statusCounts, letters, synopses, versions, inPackages, showing }) => {
  const uid = useId();
  const set = (patch: Partial<PkgFilters>) => onFilters({ ...f, ...patch });
  const mine = (k: PkgPop) => pop.open === k && pop.anchor?.closest('[data-pk4="fbar"]') != null;
  const pid = (k: PkgPop) => `${uid}-${k}`;
  const pill = (k: PkgPop, text: React.ReactNode, on: boolean, clear: () => void, chip?: React.ReactNode) => (
    <span className={`cl17-fpw${on ? " on" : ""}`} data-pk4="pill" data-k={k} data-on={on ? "" : undefined}>
      <button type="button" className={`cl14-fp cl14-fp--dd cl17-fp${on ? " on" : ""}`} data-pk4-dd={k} aria-haspopup="dialog" aria-expanded={mine(k)}
        aria-controls={mine(k) ? pid(k) : undefined} onClick={(e) => pop.toggle(k, e.currentTarget)}>
        <span className="cl17-fpl" data-pk4="pill-label">{text}</span>{chip}<Chevron />
      </button>
      {on ? (
        <button type="button" className="cl17-fpx" data-pk4="pill-clear" aria-label={`Clear ${k === "more" ? "more filters" : k}`} onClick={clear}>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2 2l6 6M8 2 2 8" /></svg>
        </button>
      ) : null}
    </span>
  );
  const toggle = <T extends string>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  /** the label a set pill shows: its one choice, or how many */
  const lab = (base: string, ids: string[], name: (id: string) => string, many: string) =>
    ids.length === 0 ? base : ids.length === 1 ? name(ids[0]) : `${ids.length} ${many}`;
  const nameOf = (list: MaterialWithNote[], none: string) => (id: string) => (id ? list.find((m) => m.id === id)?.name ?? none : none);
  const onMore = (f.note ? 1 : 0) + (f.also ? 1 : 0);
  /* put-away materials last, muted (the archive model keeps them resolvable) */
  const ordered = (list: MaterialWithNote[]) => [...list.filter((m) => !m.retired), ...list.filter((m) => m.retired)];
  const matRows = (kind: "letter" | "synopsis" | "version", list: MaterialWithNote[], chosen: string[], key: "letters" | "synopses" | "versions") =>
    ordered(list).map((m) => {
      const on = chosen.includes(m.id), n = inPackages(kind, m.id);
      return (
        <button key={m.id} type="button" className={`cl17-opt cl17-opt--2${on ? " on" : ""}${m.retired || n === 0 ? " zero" : ""}`} data-opt={`${kind}:${m.id}`}
          role="menuitemcheckbox" aria-checked={on} onClick={() => set({ [key]: toggle(chosen, m.id) } as Partial<PkgFilters>)}>
          <span className="cl17-bx" aria-hidden="true">{on ? "✓" : ""}</span>
          <span className="cl17-ol">{m.name}<i>{m.retired ? "Put away · " : ""}in {pkgs(n)}</i></span>
        </button>
      );
    });
  const noneRow = (kind: "synopsis" | "version", label: string, chosen: string[], key: "synopses" | "versions") => {
    const on = chosen.includes(""), n = inPackages(kind, "");
    return (
      <button type="button" className={`cl17-opt cl17-opt--2${on ? " on" : ""}${n === 0 ? " zero" : ""}`} data-opt={`${kind}:none`}
        role="menuitemcheckbox" aria-checked={on} onClick={() => set({ [key]: toggle(chosen, "") } as Partial<PkgFilters>)}>
        <span className="cl17-bx" aria-hidden="true">{on ? "✓" : ""}</span>
        <span className="cl17-ol">{label}<i>in {pkgs(n)}</i></span>
      </button>
    );
  };
  return (
    <div className="pk4-fr" data-pk4="filters">
      <div className="cl14-fbar cl17-fbar pk4-fbar" data-pk4="fbar" role="group" aria-label="Filter the packages">
        {pill("status", lab("Status", f.status, (k) => STATUS_LABEL[k as StatusKey], "statuses"), f.status.length > 0, () => set({ status: [] }))}
        {pill("letter", lab("Query letter", f.letters, nameOf(letters, "Query letter"), "letters"), f.letters.length > 0, () => set({ letters: [] }))}
        {pill("synopsis", lab("Synopsis", f.synopses, nameOf(synopses, "No synopsis"), "synopses"), f.synopses.length > 0, () => set({ synopses: [] }))}
        {pill("version", lab("Version", f.versions, nameOf(versions, "Not recorded"), "versions"), f.versions.length > 0, () => set({ versions: [] }))}
        {pill("more", "More filters", onMore > 0, () => set({ note: false, also: false }),
          <em className="cl17-fpn" data-pk4="more-count">{onMore ? `${onMore} on` : MORE_ROWS.length}</em>)}
      </div>

      {mine("status") && (
        <Panel k="status" id={pid("status")} anchor={pop.anchor} title="Where they stand" note="Pick any number" showing={showing}
          onClear={() => set({ status: [] })} onClose={pop.close}>
          {STATUS_ORDER.map((k) => {
            const on = f.status.includes(k);
            return (
              <button key={k} type="button" className={`cl17-opt${on ? " on" : ""}${statusCounts[k] === 0 ? " zero" : ""}`} data-opt={`status:${k}`}
                role="menuitemcheckbox" aria-checked={on} onClick={() => set({ status: toggle(f.status, k) })}>
                <span className="cl17-bx" aria-hidden="true">{on ? "✓" : ""}</span>
                <span className="cl17-dot" aria-hidden="true"><i className={`pk4-psw pk4-sg--${k}`} /></span>
                <span className="cl17-ol">{STATUS_LABEL[k]}</span>
                <small data-pk4="opt-count">{statusCounts[k]}</small>
              </button>
            );
          })}
        </Panel>
      )}
      {mine("letter") && (
        <Panel k="letter" id={pid("letter")} anchor={pop.anchor} title="Which letter?" note="Pick any number" showing={showing}
          onClear={f.letters.length ? () => set({ letters: [] }) : undefined} onClose={pop.close}>
          {matRows("letter", letters, f.letters, "letters")}
        </Panel>
      )}
      {mine("synopsis") && (
        <Panel k="synopsis" id={pid("synopsis")} anchor={pop.anchor} title="Which synopsis?" note="Pick any number" showing={showing}
          onClear={f.synopses.length ? () => set({ synopses: [] }) : undefined} onClose={pop.close}>
          {matRows("synopsis", synopses, f.synopses, "synopses")}
          {noneRow("synopsis", "No synopsis", f.synopses, "synopses")}
        </Panel>
      )}
      {mine("version") && (
        <Panel k="version" id={pid("version")} anchor={pop.anchor} title="Which version?" note="Pick any number" showing={showing}
          onClear={f.versions.length ? () => set({ versions: [] }) : undefined} onClose={pop.close}>
          {matRows("version", versions, f.versions, "versions")}
          {noneRow("version", "Not recorded", f.versions, "versions")}
        </Panel>
      )}
      {mine("more") && (
        <Panel k="more" id={pid("more")} anchor={pop.anchor} align="right" title="More filters" note="Switch on any you need" showing={showing}
          onClear={onMore ? () => set({ note: false, also: false }) : undefined} onClose={pop.close}>
          {MORE_ROWS.map((r) => (
            <button key={r.key} type="button" className={`cl17-opt cl17-opt--2 cl17-opt--sw${f[r.key] ? " on" : ""}`} data-opt={`more:${r.key}`}
              role="switch" aria-checked={f[r.key]} onClick={() => set({ [r.key]: !f[r.key] } as Partial<PkgFilters>)}>
              <span className="cl17-ol">{r.label}<i>{r.line}</i></span>
              <span className="cl17-sw" data-pk4="switch" data-on={f[r.key] ? "" : undefined} aria-hidden="true"><i /></span>
            </button>
          ))}
        </Panel>
      )}
    </div>
  );
};
