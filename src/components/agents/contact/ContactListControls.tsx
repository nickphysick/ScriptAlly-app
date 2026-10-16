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
import { PopOption, PopSection, Popover, type PopoverState } from "../../shell/ListPills";
import { type GroupKey, GROUP_OPTIONS } from "../../../lib/contactList";

/** every popover the list's controls own — the bar's one and the strip's dropdowns */
export type ContactPop = "group" | "status" | "open" | "queried" | "more" | "filters";


/** v17 §B — the search box, on its own: the header's filter row holds it, beside the filter pills. */
export const ContactFind: React.FC<{
  find: string; onFind: (v: string) => void; findRef?: React.Ref<HTMLInputElement>; findKey?: React.ReactNode; disabled?: boolean;
}> = ({ find, onFind, findRef, findKey, disabled }) => (
  <label className="cl13-find cl17-find ltb-search" data-clv="find" data-cl13-find="banner" data-cl17="find">
    <svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
    <input ref={findRef} value={find} onChange={(e) => onFind(e.target.value)} placeholder="Find an agent" aria-label="Find an agent" disabled={disabled} />
    {findKey}
  </label>
);

/** v18 §B — the grouping menu on its own, opened by the list header's group name (the same options and handler as
 *  the Grouped pill had) */
export const GroupMenu: React.FC<{ groupKey: GroupKey; onGroup: (k: GroupKey) => void; pop: PopoverState<ContactPop> }> = ({ groupKey, onGroup, pop }) =>
  pop.open === "group" && pop.anchor?.closest('[data-cl18="list-header"]') ? (
    <Popover k="group" anchor={pop.anchor} width={280} label="Group the list">
      <PopSection title="Group the list by">
        {GROUP_OPTIONS.map((g) => (
          <PopOption key={g.key} k={`group:${g.key}`} kind="radio" on={groupKey === g.key} label={g.label} line={g.line}
            onPick={() => { onGroup(g.key); pop.close(); }} />
        ))}
      </PopSection>
    </Popover>
  ) : null;
