/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcSentence — THE LIST HEAD (v96 §2). One line, directly on the page with no container: the title
 * and its tally left, Find centred, and Filter · Group · Sort as icon-and-label controls right.
 *
 * ⚠️ §2 SAYS "it is the Contact list's head, so reuse that component", AND THE REFERENCE SAYS
 * OTHERWISE. Measured, side by side at 1512: the reference's title is **Source Serif 4 at 600/28px**
 * and the Contact list's is **Special Elite at 23px** (`--clv-type` is `--sp-type`). Same
 * ARRANGEMENT — title, tally, find, three icon controls — and a different object. `ContactControls`
 * is also bound to the contact filter model (`ContactFilters`, `STAND_LABEL`, its own options map),
 * so "reuse" would mean generalising a live page's component to serve two filter models, which is
 * how two surfaces come to disagree. The reference wins, as the pack says it does: this is built to
 * the reference, and what IS shared is shared properly — the four drawn control marks now live in
 * `components/shared/listControlIcons`, which both heads import.
 *
 * It was a SENTENCE: "All 26 queries, latest activity first", where the two phrases WERE the filter
 * and sort controls. The head states how much of the list you are looking at and the controls say
 * what is narrowing it, so the two halves no longer both describe the filter.
 *
 * ⚠️ NO PILLS, NO SECOND LINE, AND THE SORT IS NAMED ONCE. §6's baked decisions.
 *
 * ⚠️ THE FILTER CONTROL NAMES ITS VALUE WHERE THERE IS ONE — `filter with you ⌄` — and counts them
 * where there is more than one: `filter 2 on ⌄`. §2 specifies the second form and says the active
 * filters "show in the floating bar the app already has"; **there is no such bar on this page**.
 * `filterPills` exists, and only the EXPANDED view renders it. So the value goes where the other
 * two controls put theirs — inside the control, in ink — which is the reference's own grammar for
 * `group` and `sort`, loses nothing, and needs neither the second line §2 forbids nor a bar this
 * pack is not building.
 */
import React, { useCallback, useRef, useState } from "react";
import {
  DEFAULT_SORT, SORT_OPTIONS,
  type FilterOption, type QcFilter, type QcSort,
} from "../../../lib/qcSummary";
import { GROUP_BY_OPTIONS, type GroupBy } from "../../../lib/qcCalView";
import { QcMenu, type QcMenuGroup } from "./QcMenu";
import { FILTER_ICON, GROUP_ICON, SORT_ICON } from "../../shared/listControlIcons";
import "./qcvPage.css";

export interface ScopeOption { id: string; title: string; count: number }

type Open = "filter" | "group" | "sort" | null;

export const QcSentence: React.FC<{
  loading: boolean;
  calendar: boolean;
  filter: QcFilter;
  /** How many rows the list is showing, and how many the manuscript scope holds. */
  count: number;
  total: number;
  options: readonly FilterOption[];
  onFilter: (f: QcFilter) => void;
  sort: QcSort;
  onSort: (s: QcSort) => void;
  group: GroupBy;
  onGroup: (g: GroupBy) => void;
  /** Present only when the account has more than one manuscript. `null` is All. */
  scope?: { current: string | null; total: number; options: readonly ScopeOption[]; onScope: (id: string | null) => void } | null;
  scopeTitle: string | null;
  /** §2 — the Find field, the same search the Contact list's head carries. */
  find: string;
  onFind: (v: string) => void;
}> = ({ loading, calendar, filter, count, total, options, onFilter, sort, onSort, group, onGroup, scope, scopeTitle, find, onFind }) => {
  const [open, setOpen] = useState<Open>(null);
  const filterRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLButtonElement>(null);
  const sortRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(null), []);
  const toggle = (k: Exclude<Open, null>) => setOpen((o) => (o === k ? null : k));

  if (loading) {
    return (
      <div className="qcv-lhead" data-qcv="sentence">
        {/* ⚠️ `0.7em` AND `vertical-align: middle`, NOT A PIXEL HEIGHT ON THE BASELINE. An
            inline-block sits ON the baseline, so its height is added to the line box's descent and a
            24px pill made the old h2 33.4 against a loaded 27.4 — a 6px jump at the instant the
            cover lifts. Sized in the title's OWN em and centred on the line, the box keeps the
            height its type gives it at every width, which is the whole job of a placeholder. */}
        <h2 className="qcv-lh-ttl"><span className="qcv-sk" style={{ width: 230, height: "0.7em", display: "inline-block", verticalAlign: "middle" }} /></h2>
        <span />
        <div className="qcv-lh-ops"><span className="qcv-sk" style={{ width: 230, height: "0.7em", display: "inline-block", verticalAlign: "middle" }} /></div>
      </div>
    );
  }

  /* the scope narrows exactly as the filter does, so it counts towards "how many are on" */
  const facets = (filter === "all" ? 0 : 1) + (scope?.current ? 1 : 0);
  const chosen = options.find((o) => o.key === filter);
  const filterValue = facets === 0 ? null : facets === 1
    ? (filter === "all" ? scopeTitle : chosen?.label ?? null)
    : `${facets} on`;

  const filterGroups: QcMenuGroup[] = [
    { current: filter, items: options.map((o) => ({ key: o.key, label: o.label, count: o.count, swatch: o.swatch })), onPick: (k) => onFilter(k as QcFilter) },
    ...(scope ? [{
      heading: "Manuscript", current: scope.current ?? "",
      items: [{ key: "", label: "All manuscripts", count: scope.total }, ...scope.options.map((m) => ({ key: m.id, label: m.title, count: m.count }))],
      onPick: (k: string) => scope.onScope(k || null),
    }] : []),
  ];

  return (
    <div className="qcv-lhead" data-qcv="sentence">
      <h2 className="qcv-lh-ttl" data-qcv="lh-title">
        Your queries<small data-qcv="lh-tally">{count} OF {total}</small>
      </h2>
      {/* ⚠️ THE MAGNIFIER IS DRAWN. The reference types `⌕` (U+2315) in Special Elite, which does
          not carry it; a character is a request to a font and a path is a picture. */}
      <label className="qcv-lh-find" data-qcv="find">
        <svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={find}
          onChange={(e) => onFind(e.target.value)}
          placeholder="Find a query"
          aria-label="Find a query — agent or agency"
        />
      </label>
      <div className="qcv-lh-ops">
        <button ref={filterRef} type="button" className="qcv-op" data-qcv="pk-filter" data-on={facets > 0 || undefined}
          aria-haspopup="menu" aria-expanded={open === "filter"} onClick={() => toggle("filter")}>
          {FILTER_ICON} Filter{facets > 0 && <span className="qcv-nb" data-qcv="pk-n">{facets}</span>}
        </button>
        {/* ⚠️ GROUP IS THE EXPANDED VIEW'S OWN CONTROL — the same five options and the same
            next-action groups, read from `GROUP_BY_OPTIONS` rather than restated. */}
        <button ref={groupRef} type="button" className="qcv-op" data-qcv="pk-group" data-on={group !== "none" || undefined}
          aria-haspopup="menu" aria-expanded={open === "group"} onClick={() => toggle("group")}>
          {GROUP_ICON} Group
        </button>
        {!calendar && (
          <button ref={sortRef} type="button" className="qcv-op" data-qcv="pk-sort" data-on={sort !== DEFAULT_SORT || undefined}
            aria-haspopup="menu" aria-expanded={open === "sort"} onClick={() => toggle("sort")}>
            {SORT_ICON} Sort
          </button>
        )}
      </div>
      {open === "filter" && <QcMenu anchor={filterRef.current} label="Which queries" groups={filterGroups} onClose={close} />}
      {open === "group" && (
        <QcMenu anchor={groupRef.current} label="How to group them" onClose={close}
          groups={[{ current: group, items: GROUP_BY_OPTIONS.map((o) => ({ key: o.key, label: o.label })), onPick: (k) => onGroup(k as GroupBy) }]} />
      )}
      {open === "sort" && !calendar && (
        <QcMenu anchor={sortRef.current} label="In what order" onClose={close}
          groups={[{ current: sort, items: SORT_OPTIONS.map((o) => ({ key: o.key, label: o.label.replace(/^./, (c) => c.toUpperCase()) })), onPick: (k) => onSort(k as QcSort) }]} />
      )}
    </div>
  );
};
