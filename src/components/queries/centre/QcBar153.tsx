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
import { ListBar } from "../../shell/ListBar";
import { RadioMenu151 } from "./QcToolbar140";
import { SortChipButton, SortChipMenu } from "../../shell/SortChip";
import { QC_LIST_SORT_FIELDS, QC_LIST_SORT_NAMED, sort151Of, sortValue151 } from "../../../lib/cardsSort";
import { GROUP_1522, GROUP_MENU_HEAD, PACKAGE_LOCKED_LINE } from "../../../lib/qc1522";
import { BE_GROUPS, BE_SORTS, type BeGroup, type BeSort } from "../../../lib/qc150";
import type { GroupBy } from "../../../lib/qcCalView";
import type { Sort151 } from "../../../lib/qc151";
import { FIND_PLACEHOLDER } from "../../../lib/qc153";
import "./qcv153.css";

export type View153 = "list" | "birds";
const LIST_I = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></svg>;
const BE_I = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2 4h7M5 8h9M3 12h6" /></svg>;
const BE_GROUP_LINE: Record<BeGroup, string> = { urgency: "Overdue, upcoming, watch and wait", status: "Where each query stands", none: "One timeline" };
const BE_SORT_LINE: Record<BeSort, string> = { due: "Soonest first", wait: "Oldest query first", agent: "By name" };
/** List filters v1 — the labelled chips' parts: the icon (navy), the muted word, the value, the caret */
const CARET = <svg className="lf-cv" viewBox="0 0 12 12" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M2 4h8L6 9z" /></svg>;
export const NO_GROUPING = { key: "none", label: "No grouping", line: "One list, in the order you sort by" } as const;

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
  /** v154 §6 — once the bar is stuck, the current group's name and count (kept through the fade-out) */
  stuckGroup?: { label: string; count: string } | null;
  stuckOn?: boolean;
  /** List filters v1 — Export, in the bar: the rows the list shows */
  onExport: () => void;
}

export const QcBar153: React.FC<QcBar153Props> = (p) => {
  const pop = usePopover<Pop>();
  const birds = p.view === "birds";
  const narrowed = p.showing !== p.total;
  const beSortLabel = BE_SORTS.find((s) => s.key === p.beSort)?.label ?? "";
  const groupLabel = birds ? BE_GROUPS.find((g) => g.key === p.beGroup)?.label ?? "" : GROUP_1522.find((g) => g.key === p.group)?.label ?? "None";
  const exportLabel = `Export ${p.showing} ${p.showing === 1 ? "query" : "queries"}`;
  return (
    <ListBar attrs={{ "data-qc153": "bar", "data-qc151": "toolbar", "data-qcv": "ws-head" }}
      lead={
      <div className="qc153-vsw" role="group" aria-label="View" data-qc151="switch">
        <button type="button" aria-pressed={!birds} data-v="list" disabled={p.loading} onClick={() => p.onView("list")}>{LIST_I}List</button>
        <button type="button" aria-pressed={birds} data-v="birds" disabled={p.loading} onClick={() => p.onView("birds")}>{BE_I}Birds-eye</button>
      </div>}
      /* v154 §6 — the count and, stuck, the current group cross-fade in one cell; the group is the eye's, not the
         screen reader's (the headings already name it) */
      count={
      <span className={`qc153-cnt qc154-tc${p.stuckOn ? " is-grp" : ""}`} data-qc153="count" data-stuck={p.stuckOn ? "" : undefined}>
        <span className="qc154-tn" aria-live="polite">{p.loading ? " " : narrowed ? <><b>{p.showing}</b> of <b>{p.total}</b></> : <><b>{p.total}</b> {p.total === 1 ? "query" : "queries"}</>}</span>
        <span className="qc154-tg" data-qc154="toolbar-group" aria-hidden="true">{p.stuckGroup ? <>{p.stuckGroup.label}<small>{p.stuckGroup.count}</small></> : null}</span>
      </span>}
      find={{ value: p.find, onChange: p.onFind, placeholder: FIND_PLACEHOLDER, inputRef: p.findRef, disabled: p.loading,
        attrs: { "data-qc151": "find", "data-qc140": "find" }, clearAttrs: { "data-qc151": "find-clear" } }}
      exportBtn={{ label: exportLabel, disabled: p.loading || p.showing === 0, onExport: p.onExport, attrs: { "data-qc153": "export" } }}>
      {/* List filters v1 — Sort is the shared SortChip on the list's one sort state; Birds-eye keeps its own sorts */}
      {birds
        ? <button type="button" className="qc153-dd" data-qc153="sort" aria-haspopup="menu" aria-expanded={pop.open === "sort"} disabled={p.loading}
            aria-label={`Sort: ${beSortLabel}`} onClick={(e) => pop.toggle("sort", e.currentTarget)}>
            <span className="lf-ic" aria-hidden="true">⇅</span><em className="lf-lab">Sort:</em><b>{beSortLabel}</b>{CARET}
          </button>
        : <SortChipButton labelled fields={QC_LIST_SORT_NAMED} value={sortValue151(p.sort)} open={pop.open === "sort"} className="qc153-dd" ns="qc153"
            disabled={p.loading} onToggle={(a) => pop.toggle("sort", a)} />}
      <button type="button" className="qc153-dd" data-qc153="group" data-qc151={birds ? "be-group" : "group"} aria-haspopup="menu" aria-expanded={pop.open === "group"} disabled={p.loading}
        aria-label={`Group: ${groupLabel}`} onClick={(e) => pop.toggle("group", e.currentTarget)}>
        <span className="lf-ic" aria-hidden="true">▤</span><em className="lf-lab">Group:</em><b>{groupLabel}</b>{CARET}
      </button>

      {pop.open === "sort" && pop.anchor ? (birds
        ? <RadioMenu151 anchor={pop.anchor} title="Sort within groups by" k="be-sort" value={p.beSort}
            opts={BE_SORTS.map((o) => ({ key: o.key, label: o.label, line: BE_SORT_LINE[o.key] }))}
            onPick={(v) => { p.onBeSort(v as BeSort); pop.close(); }} />
        : <SortChipMenu anchor={pop.anchor} fields={QC_LIST_SORT_FIELDS} value={sortValue151(p.sort)} ns="qc153" heading="Sort by" note={null}
            onChange={(v) => p.onSort(sort151Of(v))} />
      ) : null}
      {pop.open === "group" && pop.anchor ? (birds
        ? <RadioMenu151 anchor={pop.anchor} title="Group Birds-eye by" k="be-group" value={p.beGroup}
            opts={BE_GROUPS.map((o) => ({ key: o.key, label: o.label, line: BE_GROUP_LINE[o.key] }))}
            onPick={(v) => { p.onBeGroup(v as BeGroup); pop.close(); }} />
        : <RadioMenu151 anchor={pop.anchor} title={GROUP_MENU_HEAD} k="group" value={p.group} plainHead
            opts={[...GROUP_1522.map((o) => {
              const locked = !!o.pro && !p.packageOk;
              return { key: o.key, label: o.label, line: locked ? PACKAGE_LOCKED_LINE : o.line, pro: o.pro, locked };
            }), { ...NO_GROUPING, divide: true }]}
            onPick={(v) => { p.onGroup(v as GroupBy); pop.close(); }} />
      ) : null}
    </ListBar>
  );
};
