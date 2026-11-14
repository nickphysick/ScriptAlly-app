/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE WORKSPACE NAVY HEADER (Workspace headers v1, 14 Nov; design-refs/workspace-headers-v1): the Query Centre's navy
 * header and its collapsed bar, for the workspace pages that did not have them — Responses, Analytics, Discover,
 * Comparable titles, Versions, Manuscripts and the Corkboard. One component, so seven pages are not seven copies.
 *
 *   `shell/OpenHeader` (unchanged, through its slots) inside a `.qc151.qc153.wsnh` wrapper, so the Query Centre's own
 *   sheets dress it (qcv1531, qcv1534 §2–3, qcv156 §1); `shell/SlimBar` beside it, dressed by qcv156 §3 (whose `:is()`
 *   lists name `.wsnh`). The wrapper is `display: contents`: it draws no box, so the bar's sticky box is the PAGE's
 *   (it rides the whole page, as the Query Centre's does) while the selectors still see `.wsnh` as its parent.
 *
 * ⚠️ NO LOOK OF ITS OWN FOR THE HEADER OR THE BAR: every measurement is the Query Centre's sheets. This page's sheet
 *    (wsnh.css) adds only what Query letters v2.4 added to the same header — 48px under it and its card shadow, the
 *    227px height, the two-column grid when there is no right block, the drawing's 190 × 142 placeholder box — and the
 *    right block's words (the ref's `.cb`), which the Query Centre's "this week" line does not have.
 * ⚠️ THE DRAWING IS `ArtSlot` (`<page>-header`), a placeholder until the cut-out arrives: give that slot's brief in
 *    todo/ArtSlot.tsx its `src` and nothing here changes.
 * ⚠️ LOADING IS THE QUERY CENTRE'S: the title holds its box with a space, no ruled line, the buttons disabled, no
 *    right block and no bar (its figures arrive with the data).
 * ⚠️ HIDDEN IS INERT (SlimBar's own rule): `inert` and `aria-hidden` until the header has gone under the bar's line.
 * ⚠️ THE `data-*` PROBES: `data-wsnh="<part>"` on every piece, and `data-wsnh-page="<page>"` on the header.
 */
import React from "react";
import { OpenHeader } from "./OpenHeader";
import { SlimBar } from "./SlimBar";
import { ArtSlot, type ArtSlotName } from "../todo/ArtSlot";
import "../queries/centre/qcv1531.css";
import "../queries/centre/qcv1534.css";
import "../queries/centre/qcv156.css";
import "./wsnh.css";

/** the bar finds the header it stands in for beside it (both are the wrapper's children) */
const header = (row: HTMLElement) => row.parentElement?.querySelector<HTMLElement>(":scope > [data-wsnh='header']");
/** no pinned rows on these pages read `--pin-cover`: the bar writes it nowhere */
const cover = () => null;

export interface WorkspaceNavyHeaderProps {
  /** the page's key: the probe value and the drawing's slot (`<page>-header`) */
  page: string;
  art: ArtSlotName;
  title: React.ReactNode;
  /** the ruled line under the title: "<em>for</em> Murphy's Day Out", or the text alone with no lead */
  forLine?: { lead?: string; text: React.ReactNode } | null;
  /** the buttons, as `qc1531-b qc1531-b--n` (the primary) and `qc1531-b qc1531-b--g` */
  actions: React.ReactNode;
  /** the right block (OpenHeader's `ring` slot); none on an empty or early page */
  right?: React.ReactNode;
  /** the collapsed bar, or none (loading) */
  bar: {
    title: React.ReactNode;
    /** the words before the button */
    aside?: React.ReactNode;
    button: { label: string; onClick: () => void; disabled?: boolean };
  } | null;
  loading?: boolean;
  /** the title may wrap (Manuscripts: a book's name), at the same size, the header growing to fit */
  wrap?: boolean;
  className?: string;
}

export const WorkspaceNavyHeader: React.FC<WorkspaceNavyHeaderProps> = ({ page, art, title, forLine = null, actions, right = null, bar, loading = false, wrap = false, className }) => (
  <div className={`qc151 qc153 wsnh${className ? ` ${className}` : ""}`} data-wsnh="root">
    {bar && !loading ? (
      <SlimBar hook="data-wsnh" header={header} cover={cover}
        title={bar.title}
        right={bar.aside ? <span className="qc156-sw wsnh-sw" data-wsnh="slim-aside">{bar.aside}</span> : null}
        button={{ label: bar.button.label, onClick: bar.button.onClick, disabled: bar.button.disabled, probe: "slim-button" }} />
    ) : null}
    <OpenHeader
      className={`wsnh-hd${right && !loading ? "" : " wsnh-hd--two"}${wrap ? " wsnh-hd--wrap" : ""}`}
      attrs={{ "data-wsnh": "header", "data-wsnh-page": page, "data-own-header": "" }}
      art={<ArtSlot name={art} />}
      artClassName="wsnh-art"
      title={loading ? " " : title}
      titleAttrs={{ "data-wsnh": "title" }}
      forLine={!loading && forLine ? { lead: forLine.lead, text: forLine.text, attrs: { "data-wsnh": "for" } } : null}
      actions={actions}
      ring={right && !loading ? <div className="wsnh-rc" data-wsnh="right">{right}</div> : null}
    />
  </div>
);

/* ── the right block's pieces (the ref's `.cb`): a large figure or a ring, then the words ─────────────────────────── */

/** the large figure (the ref's `.cb-big`; `small` for a long one such as a word count) */
export const WsnhFigure: React.FC<{ children: React.ReactNode; small?: boolean }> = ({ children, small = false }) => (
  <b className={`wsnh-big${small ? " wsnh-big--sm" : ""}`} data-wsnh="figure">{children}</b>
);

/** a plain progress ring with its percentage in the middle (the ref's `.rg`): drawn from a figure the page has;
 *  `null` (nothing to divide by yet) is the track alone and a dash */
export const WsnhRing: React.FC<{ pct: number | null; label?: string }> = ({ pct, label }) => {
  const p = pct === null ? null : Math.max(0, Math.min(100, Math.round(pct)));
  const c = 2 * Math.PI * 50;
  return (
    <span className="wsnh-ring" data-wsnh="ring" data-pct={p ?? ""} aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(244,238,229,.18)" strokeWidth="10" />
        {p ? <circle cx="60" cy="60" r="50" fill="none" stroke="#f4eee5" strokeWidth="10" strokeLinecap="round" data-wsnh="ring-arc"
          strokeDasharray={`${(c * p) / 100} ${c}`} transform="rotate(-90 60 60)" /> : null}
      </svg>
      <b data-wsnh="ring-pct">{p === null ? "–" : `${p}%`}</b>
    </span>
  );
};

/** the words beside the figure: a lead, the name, the subline and any button or link */
export const WsnhWords: React.FC<{ lead?: React.ReactNode; name: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }> = ({ lead, name, sub, children }) => (
  <div className="wsnh-words" data-wsnh="words">
    {lead ? <span className="wsnh-k" data-wsnh="lead">{lead}</span> : null}
    <b className="wsnh-n" data-wsnh="name">{name}</b>
    {sub ? <span className="wsnh-s" data-wsnh="sub">{sub}</span> : null}
    {children}
  </div>
);
