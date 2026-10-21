/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v20 §A — THE TITLE ROW, between the hero and the list card (design-refs/contact-list-v20/, screens 01, 02,
 * 09). Left to right: the live count ("All 41 agents" / "5 of 41 agents"), the Cards / List pill, and Full screen.
 *
 *   - The count is the list's own: `shown` is the agents actually showing (the applied row's figure), `total` every agent
 *     on file. "All N" when nothing narrows the list. It is `aria-live="polite"`, so a filter change is spoken.
 *   - The pill is a tablist (←/→ switch). It and the toolbar's switch (ContactViewSwitch) read and write ONE state, the
 *     page's `view`.
 *   - Full screen calls the shared pin hook through the page's toggle; F, Esc, the memory and the scroll are the hook's.
 *
 * Not drawn in full screen (the page leaves it out).
 */
import React from "react";
import type { ContactView } from "../../../lib/contactListMemory";
import "./contactV20.css";

export const VIEW_CARDS_ICON = (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="2" y="2" width="5" height="5" rx="1.2" /><rect x="9" y="2" width="5" height="5" rx="1.2" />
    <rect x="2" y="9" width="5" height="5" rx="1.2" /><rect x="9" y="9" width="5" height="5" rx="1.2" />
  </svg>
);
export const VIEW_LIST_ICON = (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <path d="M5.5 4h8.5M5.5 8h8.5M5.5 12h8.5" /><circle cx="2.4" cy="4" r=".8" fill="currentColor" stroke="none" />
    <circle cx="2.4" cy="8" r=".8" fill="currentColor" stroke="none" /><circle cx="2.4" cy="12" r=".8" fill="currentColor" stroke="none" />
  </svg>
);
/** the four corners: Full screen (and Exit full screen) */
export const FULL_ICON = (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 5.5V2h3.5M10.5 2H14v3.5M14 10.5V14h-3.5M5.5 14H2v-3.5" />
  </svg>
);

export const VIEW_LABEL: Record<ContactView, string> = { cards: "Cards", list: "List" };
const VIEWS: readonly ContactView[] = ["cards", "list"];

/** the count's words: "All 41 agents", "5 of 41 agents", "1 agent" */
export function countTitle(shown: number, total: number, narrowed: boolean): string {
  if (!narrowed) return total === 1 ? "1 agent" : `All ${total} agents`;
  return `${shown} of ${total} ${total === 1 ? "agent" : "agents"}`;
}

/**
 * The Cards / List switch: a tablist with ← and → between its two tabs. "pill" is the title row's (labelled); "icons" is
 * the toolbar's (icon buttons named by aria-label, whose words show in full screen at 1600px and over). Both are the
 * same state.
 */
export const ContactViewSwitch: React.FC<{
  view: ContactView;
  onView: (v: ContactView) => void;
  variant: "pill" | "icons";
  labels?: boolean;
  disabled?: boolean;
  probe: string;
}> = ({ view, onView, variant, labels = true, disabled = false, probe }) => {
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = VIEWS.indexOf(view);
    const next = VIEWS[(i + (e.key === "ArrowRight" ? 1 : -1) + VIEWS.length) % VIEWS.length];
    onView(next);
    requestAnimationFrame(() => e.currentTarget?.querySelector<HTMLElement>(`[data-view="${next}"]`)?.focus({ preventScroll: true }));
  };
  return (
    <div className={variant === "pill" ? "cl20-vs" : "cl20-vsi"} role="tablist" aria-label="Show the agents as" data-cl20={probe} onKeyDown={onKey}>
      {VIEWS.map((v) => {
        const on = view === v;
        return (
          <button key={v} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} data-view={v} disabled={disabled}
            aria-label={variant === "icons" ? VIEW_LABEL[v] : undefined} onClick={() => { if (!on) onView(v); }}>
            {v === "cards" ? VIEW_CARDS_ICON : VIEW_LIST_ICON}
            {/* the toolbar's switch always carries its words (shown in full screen at 1600 and over; its name otherwise) */}
            {labels || variant === "icons" ? <span className="cl20-vsl" aria-hidden={variant === "icons" || undefined}>{VIEW_LABEL[v]}</span> : null}
          </button>
        );
      })}
    </div>
  );
};

export const ContactTitleRow: React.FC<{
  shown: number;
  total: number;
  narrowed: boolean;
  view: ContactView;
  onView: (v: ContactView) => void;
  onFull: () => void;
  rowRef?: React.Ref<HTMLDivElement>;
}> = ({ shown, total, narrowed, view, onView, onFull, rowRef }) => (
  <div className="cl20-tr" data-cl20="title-row" ref={rowRef}>
    <h2 className="cl20-ttl" data-cl20="count" aria-live="polite" aria-atomic="true">{countTitle(shown, total, narrowed)}</h2>
    <ContactViewSwitch view={view} onView={onView} variant="pill" probe="view-pill" />
    {/* data-cl19="pin" / data-cl16="full": the v16–v19 locks find the full-screen control by these, and this is it while the
        title row shows (the toolbar's carries them in full screen and once this row has scrolled away) */}
    <button type="button" className="cl20-fs" data-cl20="full" data-cl19="pin" data-cl16="full" data-pin-list="" aria-pressed={false} aria-keyshortcuts="F" onClick={onFull}>
      {FULL_ICON}<span>Full screen</span>
      <span className="cl20-tip" aria-hidden="true">Full screen<kbd>F</kbd></span>
    </button>
  </div>
);
