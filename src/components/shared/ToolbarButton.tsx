/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToolbarButton and ToolbarSearch — the Query Centre's toolbar row, shared (QC-chassis round,
 * Phase 1).
 *
 * ⚠️ THESE WERE NEVER COMPONENTS. Both were written inline in `Queries.tsx` — the three
 * Filter/Group/Sort buttons and the search field, ~40 lines of markup each time — so there was
 * nothing for a second page to mount and the only way to have the same toolbar was to type it
 * again. That is the fork this round's brief forbids, so the markup moved here and the Query
 * Centre's three call sites became three mounts of this.
 *
 * ⚠️ THE STYLESHEET DID NOT MOVE, for the same reason `StatTiles` left its own alone:
 * `queryCentreGrid.css` owns `.qcc-tb-btn`, `.qcc-tb-val`, `.qcc-tb-cnt`, `.qcc-tb-chev`,
 * `.qcc-tb-search` and `.qcc-tb-kbd`, and moving them would be a rename touching a hot stylesheet
 * for no gain. One place to restyle a toolbar control; two pages drawing it.
 *
 * ⚠️ THE TRIGGER REF IS A PROP AND THE PANEL IS NOT. Both pages anchor their popovers through
 * their own mechanism — the Query Centre through `useFixedMenu`, the To-do page through
 * `AnchoredPanel` — and a shared button that also owned the anchoring would force one of them to
 * change its popover to get a button. The button reports where it is; what opens there is the
 * page's business.
 */
import React from "react";
import "../queries/queryCentreGrid.css";

const Chev = () => (
  <svg className="qcc-tb-chev" width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="#7c3a2a" strokeWidth="2.4" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
);

export const ToolbarButton = React.forwardRef<HTMLButtonElement, {
  /** the control's own word — Filter, Group, Sort */
  label: string;
  /** the chosen value, rendered in ink beside the word. Absent on a control that holds a set. */
  value?: string;
  /** the count of active choices, for a control that holds a set. 0 renders nothing. */
  count?: number;
  icon: React.ReactNode;
  open: boolean;
  onClick: () => void;
}>(({ label, value, count, icon, open, onClick }, ref) => (
  <button
    type="button" className="qcc-tb-btn" ref={ref}
    aria-expanded={open} aria-haspopup="dialog"
    onClick={onClick}
  >
    {icon}
    {label}
    {value !== undefined && <span className="qcc-tb-val">{value}</span>}
    {!!count && <span className="qcc-tb-cnt">{count}</span>}
    <Chev />
  </button>
));
ToolbarButton.displayName = "ToolbarButton";

/** the toolbar's own icons, so two pages cannot draw Filter with two different glyphs */
export const ToolbarIcon = {
  filter: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 5h18M6 12h12M10 19h4" />
    </svg>
  ),
  group: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="18" height="6" rx="1.5" />
    </svg>
  ),
  sort: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M7 4v13M7 17l-3-3M7 17l3-3M17 20V7M17 7l-3 3M17 7l3 3" />
    </svg>
  ),
} as const;

export const ToolbarSearch = React.forwardRef<HTMLInputElement, {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
}>(({ value, onChange, placeholder, ariaLabel }, ref) => (
  <div className="qcc-tb-search">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a08a78" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" />
    </svg>
    <input
      type="search" value={value} placeholder={placeholder} aria-label={ariaLabel} ref={ref}
      onChange={(e) => onChange(e.target.value)}
    />
    {/* the `/` hint the ref draws, inside the field */}
    <span className="qcc-tb-kbd" aria-hidden="true">/</span>
  </div>
));
ToolbarSearch.displayName = "ToolbarSearch";
