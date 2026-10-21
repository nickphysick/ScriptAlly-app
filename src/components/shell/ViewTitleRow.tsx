/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LIST TITLE ROW AND THE CARDS / LIST SWITCH, shared by the Contact list (v20 §A/§C) and the Query Centre (v142
 * §A). Lifted out of `agents/contact/ContactTitleRow` without changing a byte of what the Contact list renders: the
 * classes are still `cl20-*` and the Contact list's probes (`data-cl20`, `data-cl19="pin"`, `data-cl16="full"`) are
 * passed in by it, so its locks and its pixels are unchanged.
 *
 *   - The title is the list's own count ("All 41 agents" / "5 of 41 agents"), `aria-live="polite"`.
 *   - The switch is a tablist (← → switch). The title row's pill and a toolbar's icon switch read and write ONE state.
 *   - Full screen calls the shared pin hook through the page's toggle; F, Esc, the memory and the scroll are the hook's.
 *
 * ⚠️ EVERY PAGE STAYS MOUNTED, so each page's probes are its own (`ns`): a `[data-cl20]` query on /agents must never
 *    find the Query Centre's copy.
 */
import React from "react";
import "./viewTitleRow.css";

export type ListView = "cards" | "list";

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

export const VIEW_LABEL: Record<ListView, string> = { cards: "Cards", list: "List" };
const VIEWS: readonly ListView[] = ["cards", "list"];

/** the count's words: "All 41 agents", "5 of 41 agents", "1 agent" */
export function listCountTitle(shown: number, total: number, narrowed: boolean, one: string, many: string): string {
  if (!narrowed) return total === 1 ? `1 ${one}` : `All ${total} ${many}`;
  return `${shown} of ${total} ${total === 1 ? one : many}`;
}

/**
 * The Cards / List switch: a tablist with ← and → between its two tabs. "pill" is the title row's (labelled); "icons" is
 * a toolbar's (icon buttons named by aria-label). Both are the same state.
 */
export const ViewSwitch: React.FC<{
  view: ListView;
  onView: (v: ListView) => void;
  variant: "pill" | "icons";
  labels?: boolean;
  disabled?: boolean;
  /** the probe attribute's name (`data-${ns}`) and its value */
  ns: string;
  probe: string;
  /** "agents", "queries": the tablist's name is "Show the {noun} as" */
  noun: string;
}> = ({ view, onView, variant, labels = true, disabled = false, ns, probe, noun }) => {
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = VIEWS.indexOf(view);
    const next = VIEWS[(i + (e.key === "ArrowRight" ? 1 : -1) + VIEWS.length) % VIEWS.length];
    onView(next);
    requestAnimationFrame(() => e.currentTarget?.querySelector<HTMLElement>(`[data-view="${next}"]`)?.focus({ preventScroll: true }));
  };
  return (
    <div className={variant === "pill" ? "cl20-vs" : "cl20-vsi"} role="tablist" aria-label={`Show the ${noun} as`} {...{ [`data-${ns}`]: probe }} onKeyDown={onKey}>
      {VIEWS.map((v) => {
        const on = view === v;
        return (
          <button key={v} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} data-view={v} disabled={disabled}
            aria-label={variant === "icons" ? VIEW_LABEL[v] : undefined} onClick={() => { if (!on) onView(v); }}>
            {v === "cards" ? VIEW_CARDS_ICON : VIEW_LIST_ICON}
            {/* a toolbar's switch always carries its words (shown where its page says; its name otherwise) */}
            {labels || variant === "icons" ? <span className="cl20-vsl" aria-hidden={variant === "icons" || undefined}>{VIEW_LABEL[v]}</span> : null}
          </button>
        );
      })}
    </div>
  );
};

/** Between the hero and the list card: the count, the Cards / List pill and Full screen (with its F tooltip). */
export const ViewTitleRow: React.FC<{
  title: string;
  view: ListView;
  onView: (v: ListView) => void;
  onFull: () => void;
  ns: string;
  noun: string;
  /** extra probes on the Full screen button (the Contact list's v16–v19 locks find it by theirs) */
  fullAttrs?: Record<string, string>;
  disabled?: boolean;
  rowRef?: React.Ref<HTMLDivElement>;
}> = ({ title, view, onView, onFull, ns, noun, fullAttrs, disabled = false, rowRef }) => {
  const p = (v: string) => ({ [`data-${ns}`]: v });
  return (
    <div className="cl20-tr" {...p("title-row")} ref={rowRef}>
      <h2 className="cl20-ttl" {...p("count")} aria-live="polite" aria-atomic="true">{title}</h2>
      <ViewSwitch view={view} onView={onView} variant="pill" ns={ns} probe="view-pill" noun={noun} disabled={disabled} />
      <button type="button" className="cl20-fs" {...p("full")} {...fullAttrs} data-pin-list="" aria-pressed={false} aria-keyshortcuts="F" disabled={disabled} onClick={onFull}>
        {FULL_ICON}<span>Full screen</span>
        <span className="cl20-tip" aria-hidden="true">Full screen<kbd>F</kbd></span>
      </button>
    </div>
  );
};
