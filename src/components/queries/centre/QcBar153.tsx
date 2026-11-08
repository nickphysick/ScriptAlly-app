/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153 — THE SLIM BAR at the top of the list column: one white bar that sticks under the sheet's lip.
 * The List / Birds-eye switch (its only entry point), the count, a search taking the rest of the width, then Sort and
 * Group, each showing its current value. In Birds-eye, Sort and Group are Birds-eye's own (its groupings and sorts
 * are not the list's).
 *
 * ⚠️ `/` IS NOT BOUND HERE: it is `SHORTCUTS.qcFind`, bound once in useQcListKeys, which focuses `findRef`.
 * ⚠️ THE SEARCH MATCHES THE AGENT'S NAME AND AGENCY ONLY (lib/qcSummary `matchesFind`), so its words say so.
 */
import React from "react";
import { usePopover } from "../../shell/ListPills";
import { RadioMenu151 } from "./QcToolbar140";
import { GROUP_1522, GROUP_MENU_HEAD, PACKAGE_LOCKED_LINE } from "../../../lib/qc1522";
import { BE_GROUPS, BE_SORTS, type BeGroup, type BeSort } from "../../../lib/qc150";
import type { GroupBy } from "../../../lib/qcCalView";
import type { Sort151 } from "../../../lib/qc151";
import { BAR_SORTS, barSortOf, FIND_PLACEHOLDER } from "../../../lib/qc153";
import "./qcv153.css";

export type View153 = "list" | "birds";
const LIST_I = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></svg>;
const BE_I = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2 4h7M5 8h9M3 12h6" /></svg>;
const FIND_I = <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>;
const CROSS = <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>;
const BE_GROUP_LINE: Record<BeGroup, string> = { urgency: "Overdue, upcoming, watch and wait", status: "Where each query stands", none: "One timeline" };
const BE_SORT_LINE: Record<BeSort, string> = { due: "Soonest first", wait: "Oldest query first", agent: "By name" };

type Pop = "sort" | "group";
export interface QcBar153Props {
  view: View153;
  onView: (v: View153) => void;
  loading: boolean;
  showing: number;
  total: number;
  find: string;
  onFind: (v: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  sort: Sort151;
  onSort: (s: Sort151) => void;
  group: GroupBy;
  onGroup: (g: GroupBy) => void;
  packageOk: boolean;
  beGroup: BeGroup;
  onBeGroup: (g: BeGroup) => void;
  beSort: BeSort;
  onBeSort: (s: BeSort) => void;
}

export const QcBar153: React.FC<QcBar153Props> = (p) => {
  const pop = usePopover<Pop>();
  const birds = p.view === "birds";
  const narrowed = p.showing !== p.total;
  const sortLabel = birds ? BE_SORTS.find((s) => s.key === p.beSort)?.label ?? "" : barSortOf(p.sort);
  const groupLabel = birds ? BE_GROUPS.find((g) => g.key === p.beGroup)?.label ?? "" : GROUP_1522.find((g) => g.key === p.group)?.label ?? "None";
  return (
    <div className="qc153-bar" data-qc153="bar" data-qc151="toolbar" data-qcv="ws-head">
      <div className="qc153-vsw" role="group" aria-label="View" data-qc151="switch">
        <button type="button" aria-pressed={!birds} data-v="list" disabled={p.loading} onClick={() => p.onView("list")}>{LIST_I}List</button>
        <button type="button" aria-pressed={birds} data-v="birds" disabled={p.loading} onClick={() => p.onView("birds")}>{BE_I}Birds-eye</button>
      </div>
      <span className="qc153-cnt" data-qc153="count" aria-live="polite">
        {p.loading ? " " : narrowed ? <><b>{p.showing}</b> of <b>{p.total}</b></> : <><b>{p.total}</b> {p.total === 1 ? "query" : "queries"}</>}
      </span>
      <label className="qc153-find" data-qc151="find" data-qc140="find">
        {FIND_I}
        <input ref={p.findRef} value={p.find} onChange={(e) => p.onFind(e.target.value)} placeholder={FIND_PLACEHOLDER} aria-label={FIND_PLACEHOLDER} autoComplete="off" disabled={p.loading} />
        {p.find
          ? <button type="button" className="qc153-findx" aria-label="Clear the search" data-qc151="find-clear" onClick={() => p.onFind("")}>{CROSS}</button>
          : <kbd aria-hidden="true">/</kbd>}
      </label>
      <button type="button" className="qc153-dd" data-qc153="sort" aria-haspopup="menu" aria-expanded={pop.open === "sort"} disabled={p.loading}
        aria-label={`Sort: ${sortLabel}`} onClick={(e) => pop.toggle("sort", e.currentTarget)}>
        <span aria-hidden="true">⇅</span><b>{sortLabel}</b>
      </button>
      <button type="button" className="qc153-dd" data-qc153="group" data-qc151={birds ? "be-group" : "group"} aria-haspopup="menu" aria-expanded={pop.open === "group"} disabled={p.loading}
        aria-label={`Group: ${groupLabel}`} onClick={(e) => pop.toggle("group", e.currentTarget)}>
        <span aria-hidden="true">▤</span><b>{groupLabel}</b>
      </button>

      {pop.open === "sort" && pop.anchor ? (birds
        ? <RadioMenu151 anchor={pop.anchor} title="Sort within groups by" k="be-sort" value={p.beSort}
            opts={BE_SORTS.map((o) => ({ key: o.key, label: o.label, line: BE_SORT_LINE[o.key] }))}
            onPick={(v) => { p.onBeSort(v as BeSort); pop.close(); }} />
        : <RadioMenu151 anchor={pop.anchor} title="Sort each group by" k="sort" value={barSortOf(p.sort)}
            opts={BAR_SORTS.map((o) => ({ key: o.label, label: o.label, line: o.line }))}
            onPick={(v) => { const o = BAR_SORTS.find((x) => x.label === v); if (o) p.onSort(o.sort); pop.close(); }} />
      ) : null}
      {pop.open === "group" && pop.anchor ? (birds
        ? <RadioMenu151 anchor={pop.anchor} title="Group Birds-eye by" k="be-group" value={p.beGroup}
            opts={BE_GROUPS.map((o) => ({ key: o.key, label: o.label, line: BE_GROUP_LINE[o.key] }))}
            onPick={(v) => { p.onBeGroup(v as BeGroup); pop.close(); }} />
        : <RadioMenu151 anchor={pop.anchor} title={GROUP_MENU_HEAD} k="group" value={p.group} plainHead
            opts={GROUP_1522.map((o) => {
              const locked = !!o.pro && !p.packageOk;
              return { key: o.key, label: o.label, line: locked ? PACKAGE_LOCKED_LINE : o.line, pro: o.pro, locked };
            })}
            onPick={(v) => { p.onGroup(v as GroupBy); pop.close(); }} />
      ) : null}
    </div>
  );
};
