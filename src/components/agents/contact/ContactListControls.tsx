/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The list's ink bar's controls (Contact list v16 §C; ref design-refs/contact-list-v16/contact-list-v16.html
 * `#ctlrow`): Find with its "/" hint, then ☰ Grouped: No grouping ⌄ and its popover, then whatever the page puts
 * after (density, the key sheet, Full screen). All on white. There is NO sort pill: the column headings sort.
 * The filters are the strip's (ContactFilterStrip).
 *
 * The page owns the state and the ONE popover (the strip's dropdowns share it), so at most one is ever open.
 */
import React from "react";
import { ListPill, PopOption, PopSection, Popover, type PopoverState } from "../../shell/ListPills";
import { type GroupKey, GROUP_OPTIONS } from "../../../lib/contactList";

/** every popover the list's controls own — the bar's one and the strip's dropdowns */
export type ContactPop = "group" | "status" | "open" | "queried" | "more";

export interface ContactListControlsProps {
  find: string;
  onFind: (v: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  groupKey: GroupKey;
  onGroup: (k: GroupKey) => void;
  pop: PopoverState<ContactPop>;
  /** the "/" key cap on Find */
  findKey?: React.ReactNode;
  /** anything after the grouping: the density toggle, the key sheet, Full screen */
  extra?: React.ReactNode;
}

export const ContactListControls: React.FC<ContactListControlsProps> = ({
  find, onFind, findRef, groupKey, onGroup, pop, findKey, extra,
}) => {
  const group = GROUP_OPTIONS.find((g) => g.key === groupKey) ?? GROUP_OPTIONS[0];
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
      {/* v16 §C: no Sort pill — the column headings sort */}
      <ListPill k="group" icon={"☰"} prefix="Grouped:" value={group.label} caret set={groupKey !== "none"} open={mine("group")} onPress={(a) => pop.toggle("group", a)} />
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
    </div>
  );
};
