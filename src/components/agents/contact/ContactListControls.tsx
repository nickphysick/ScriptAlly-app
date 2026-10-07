/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "Your agents" bar's controls (Contact list v14 §3–4; ref design-refs/contact-list-v14.html `.ctlrow`): Find
 * with its "/" hint, then the shared labelled pills — ☰ Grouped: Letter ⌄ · Sort: Surname, A to Z ⌄ joined to its
 * direction toggle — and their two popovers. All on white. The filters are the strip's (ContactFilterStrip).
 *
 * The page owns the state and the ONE popover (the strip's dropdowns share it), so at most one is ever open.
 */
import React from "react";
import { DirToggle, ListPill, PopOption, PopSection, Popover, type PopoverState } from "../../shell/ListPills";
import { type GroupKey, GROUP_OPTIONS, SORT_OPTIONS, type SortKey } from "../../../lib/contactList";

/** every popover the list's controls own — the bar's two and the strip's dropdowns */
export type ContactPop = "group" | "sort" | "status" | "open" | "queried" | "more";

export interface ContactListControlsProps {
  find: string;
  onFind: (v: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  groupKey: GroupKey;
  onGroup: (k: GroupKey) => void;
  sortKey: SortKey;
  reversed: boolean;
  onSort: (k: SortKey) => void;
  onReverse: () => void;
  pop: PopoverState<ContactPop>;
  /** the "/" key cap on Find */
  findKey?: React.ReactNode;
  /** anything after the sort (Phase 6: the density toggle and the key sheet) */
  extra?: React.ReactNode;
}

export const ContactListControls: React.FC<ContactListControlsProps> = ({
  find, onFind, findRef, groupKey, onGroup, sortKey, reversed, onSort, onReverse, pop, findKey, extra,
}) => {
  const group = GROUP_OPTIONS.find((g) => g.key === groupKey) ?? GROUP_OPTIONS[0];
  const sort = SORT_OPTIONS.find((s) => s.key === sortKey) ?? SORT_OPTIONS[0];
  const dir = sort.dir[reversed ? 1 : 0];
  const mine = (k: ContactPop) => pop.open === k && pop.anchor?.closest('[data-cl13-ctl="banner"]') != null;
  return (
    <div className="cl13-ctl" data-cl13-ctl="banner">
      <label className="cl13-find" data-clv="find" data-cl13-find="banner">
        <svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input ref={findRef} value={find} onChange={(e) => onFind(e.target.value)} placeholder="Find an agent" aria-label="Find an agent" />
        {findKey}
      </label>
      <ListPill k="group" icon={"☰"} prefix="Grouped:" value={group.label} caret set={groupKey !== "letter"} open={mine("group")} onPress={(a) => pop.toggle("group", a)} />
      <span className="lp-join">
        <ListPill k="sort" prefix="Sort:" value={sortKey === "surname" || sortKey === "agency" ? `${sort.label}, ${dir}` : sort.label} caret joined
          set={sortKey !== "surname" || reversed} open={mine("sort")} onPress={(a) => pop.toggle("sort", a)} />
        <DirToggle reversed={reversed} label={dir} onToggle={onReverse} />
      </span>
      {extra}

      {mine("group") && (
        <Popover k="group" anchor={pop.anchor} width={280} label="Group the list">
          <PopSection title="Group the list by">
            {GROUP_OPTIONS.map((g) => (
              <PopOption key={g.key} k={`group:${g.key}`} kind="radio" on={groupKey === g.key} label={g.label} line={g.line}
                onPick={() => { onGroup(g.key); pop.close(); }} />
            ))}
          </PopSection>
        </Popover>
      )}
      {mine("sort") && (
        <Popover k="sort" anchor={pop.anchor} width={290} label="Sort the list">
          <PopSection title="Sort within each group">
            {SORT_OPTIONS.map((s) => (
              <PopOption key={s.key} k={`sort:${s.key}`} kind="radio" on={sortKey === s.key} label={s.label} line={s.line}
                onPick={() => { onSort(s.key); pop.close(); }} />
            ))}
          </PopSection>
        </Popover>
      )}
    </div>
  );
};
