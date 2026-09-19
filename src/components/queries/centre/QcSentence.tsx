/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcSentence — "All 26 queries, latest activity first". The two phrases are the ONLY filter and sort
 * controls on the page: the first opens the filter (and, with more than one manuscript, the scope);
 * the second opens the sort. On the Calendar the second phrase is hidden — that view orders itself.
 */
import React, { useCallback, useRef, useState } from "react";
import { SORT_OPTIONS, filterPhrase, type FilterOption, type QcFilter, type QcSort } from "../../../lib/qcSummary";
import { QcMenu, type QcMenuGroup } from "./QcMenu";

export interface ScopeOption { id: string; title: string; count: number }

export const QcSentence: React.FC<{
  loading: boolean;
  calendar: boolean;
  filter: QcFilter;
  count: number;
  options: readonly FilterOption[];
  onFilter: (f: QcFilter) => void;
  sort: QcSort;
  onSort: (s: QcSort) => void;
  /** Present only when the account has more than one manuscript. `null` is All. */
  scope?: { current: string | null; total: number; options: readonly ScopeOption[]; onScope: (id: string | null) => void } | null;
  scopeTitle: string | null;
}> = ({ loading, calendar, filter, count, options, onFilter, sort, onSort, scope, scopeTitle }) => {
  const [open, setOpen] = useState<"filter" | "sort" | null>(null);
  const filterRef = useRef<HTMLButtonElement>(null);
  const sortRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(null), []);

  if (loading) {
    return <h2 className="qcv-sentence" data-qcv="sentence"><span className="qcv-sk" style={{ width: 420, height: 24, display: "inline-block" }} /></h2>;
  }
  const phrase = filterPhrase(filter, count, { manuscriptTitle: scopeTitle, calendar });
  const filterGroups: QcMenuGroup[] = [
    { current: filter, items: options.map((o) => ({ key: o.key, label: o.label, count: o.count, swatch: o.swatch })), onPick: (k) => onFilter(k as QcFilter) },
    ...(scope ? [{
      heading: "Manuscript", current: scope.current ?? "",
      items: [{ key: "", label: "All manuscripts", count: scope.total }, ...scope.options.map((m) => ({ key: m.id, label: m.title, count: m.count }))],
      onPick: (k: string) => scope.onScope(k || null),
    }] : []),
  ];
  return (
    <h2 className="qcv-sentence" data-qcv="sentence">
      <button ref={filterRef} type="button" className="qcv-pk" data-qcv="pk-filter" aria-haspopup="menu" aria-expanded={open === "filter"}
        onClick={() => setOpen((o) => (o === "filter" ? null : "filter"))}>{phrase}</button>
      {!calendar && (
        <>
          <span>, </span>
          <button ref={sortRef} type="button" className="qcv-pk" data-qcv="pk-sort" aria-haspopup="menu" aria-expanded={open === "sort"}
            onClick={() => setOpen((o) => (o === "sort" ? null : "sort"))}>{SORT_OPTIONS.find((o) => o.key === sort)?.label}</button>
        </>
      )}
      {open === "filter" && <QcMenu anchor={filterRef.current} label="Which queries" groups={filterGroups} onClose={close} />}
      {open === "sort" && !calendar && (
        <QcMenu anchor={sortRef.current} label="In what order" onClose={close}
          groups={[{ current: sort, items: SORT_OPTIONS.map((o) => ({ key: o.key, label: o.label.replace(/^./, (c) => c.toUpperCase()) })), onPick: (k) => onSort(k as QcSort) }]} />
      )}
    </h2>
  );
};
