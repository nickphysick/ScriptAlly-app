/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list — Query Centre layout v1 (design-refs/contact-list-qc-layout-v7/contact-list-qc-layout-v7.html) — THE
 * VIEWS PANEL, replacing the v27 filter rail (ContactRail27, deleted with it). The card is the Query Centre's own
 * (`shell/ViewsPanel`, which `QcViews156` renders through); this file says only what the Contact list's views, rows and
 * counts are:
 *
 *   Views          All agents, then the four picks (`PICKS26`, in order), one at a time, each with its count; a pick at
 *                  0 fades and cannot be pressed (as v27's pills); All agents clears the pick
 *   Refine         Genres — every genre on file, multi-select, each with its count; a genre the book in scope carries
 *                  shows a small powder "your book" tag after its name (the rows' genre chips keep their ✓)
 *   More filters   Where they stand (the four groups) and Submissions (open to queries only), behind the full-width
 *                  row, open while one of them is set
 *   foot           "{n} showing" / "{n} of {total} showing" and the export, unchanged
 *
 * ⚠️ A PRESENTATION OF THE PAGE'S ONE FILTER STATE: every control writes through `onFilters` / `onSets` with
 *    lib/contactV27's own writers, and every count is lib/contactV27 `railCounts` (the list's own predicate, faceted).
 *    The one count it adds is All agents': the list under everything but the pick, by the same predicate.
 * ⚠️ ITS HOOKS ARE `data-clq`, NEVER `data-qc156`: every workspace page stays mounted, so a Query Centre probe that
 *    counts `[data-qc156=…]` across the document would otherwise count this panel too.
 */
import React from "react";
import type { AgentFacts, ContactFilters } from "../../../lib/contactList";
import { matchesContactFilters } from "../../../lib/contactList";
import { inSet, SET_LABEL, SET_ORDER, type SetKey } from "../../../lib/contactV24";
import { PICKS26, type Pick26Key } from "../../../lib/contactV26";
import { applyPick, pickOn, railCounts, railExport, railOn, railShowing, toggleGenre, toggleOpen, toggleSet, type Sets } from "../../../lib/contactV27";
import { ViewsPanel, type ViewIcon } from "../../shell/ViewsPanel";
import "../../queries/centre/qcv153.css";
import "../../queries/centre/qcv1531.css";
import "../../queries/centre/qcv154.css";
import "../../queries/centre/qcv156.css";
import "./contactQcLayout.css";

/** each pick's icon, from the Query Centre's five: Your move and Waiting are the Query Centre's own; Ready to query takes
 *  the paper plane and Missing details the document (no Query Centre view matches them) */
export const PICK_ICON: Record<Pick26Key, ViewIcon> = { you: "you", ready: "plane", wait: "clock", missing: "doc" };
/** the groups' descriptions, read as their titles (v27's tiles') */
const SET_TITLE: Record<SetKey, string> = {
  you: "Agents waiting on you", agent: "Queried, and waiting on the agent", none: "Agents you haven't queried yet", closed: "Passed, or closed with no reply",
};
/** All agents: the pick taken off (applyPick on the pick that is on clears it), nothing else touched */
export const clearPick = (f: ContactFilters): ContactFilters => { const k = pickOn(f); return k ? applyPick(f, k) : f; };

export interface ContactViewsProps {
  all: readonly AgentFacts[];
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  sets: Sets;
  onSets: (s: Sets) => void;
  /** Find (and any page-level pool) — every count is taken inside it */
  pool: (x: AgentFacts) => boolean;
  genreLabel: (key: string, raw: string) => string;
  /** a genre the manuscript in scope carries */
  genreHit?: (key: string) => boolean;
  showing: number;
  /** clears everything the applied row's "Clear filters" clears */
  onReset: () => void;
  onExport: () => void;
  loading?: boolean;
}

export const ContactViews: React.FC<ContactViewsProps> = (p) => {
  const f = p.filters;
  const on = railOn(f, p.sets);
  const counts = railCounts(p.all, f, p.sets, p.pool, p.genreLabel);
  const pick = pickOn(f);
  const bare = clearPick(f);
  const allN = p.all.reduce((n, x) => n + (p.pool(x) && inSet(x, p.sets) && matchesContactFilters(x, bare) ? 1 : 0), 0);
  return (
    <ViewsPanel hook="data-clq" label="Views" loading={!!p.loading}
      resetDisabled={on === 0} onReset={p.onReset}
      views={[
        { key: "all", label: "All agents", icon: "list", n: allN, on: pick === null, disabled: false, onPick: () => p.onFilters(bare) },
        ...PICKS26.map((k) => {
          const isOn = pick === k.key;
          const n = counts.picks[k.key];
          /* a second press on the pick that is on clears it, as v27's radio did (applyPick) */
          return { key: k.key, label: k.title, icon: PICK_ICON[k.key], n, on: isOn, title: k.line, disabled: !isOn && n === 0, onPick: () => p.onFilters(applyPick(f, k.key)) };
        }),
      ]}
      refine={[{
        id: "gn", label: "Genres",
        empty: <span className="clq-none" data-clq="genres-none">No genres on file yet</span>,
        ticks: counts.genres.map((g) => {
          const hit = !!p.genreHit?.(g.key);
          return {
            key: g.key, data: "genre", n: g.n, on: g.on, onToggle: () => p.onFilters(toggleGenre(f, g.key)),
            label: <>{g.label}{hit ? <span className="clq-yb" data-clq="your-book">your book</span> : null}</>,
          };
        }),
      }]}
      more={{
        summary: "Where they stand, submissions", active: !!p.sets?.length || f.open === "open",
        groups: [
          { id: "ws", label: "Where they stand", ticks: SET_ORDER.map((k) => ({
            key: k, data: "stand", label: SET_LABEL[k], n: counts.where[k], on: !!p.sets?.includes(k), title: SET_TITLE[k], onToggle: () => p.onSets(toggleSet(p.sets, k)),
          })) },
          { id: "sb", label: "Submissions", ticks: [{
            key: "open", data: "open-only", label: "Open to queries only", n: counts.open, on: f.open === "open", onToggle: () => p.onFilters(toggleOpen(f)),
          }] },
        ],
      }}
      showing={railShowing(p.showing, p.all.length, on > 0)}
      exportLabel={railExport(p.showing)} exportDisabled={p.showing === 0} onExport={p.onExport}
    />
  );
};
