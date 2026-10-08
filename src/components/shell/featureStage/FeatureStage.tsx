/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FEATURE STAGE (shell/featureStage) — a lede on the page, a featured card floating over the left edge of a white
 * panel, and a pickable list in the panel (Contact list v15 §4a; ref design-refs/contact-list-v15.html `.kk-band`, the
 * QF format). Built for the Contact list and named generically so another page can adopt it.
 *
 * ⚠️ THE QUERY CENTRE'S v132 BUILDS THE SAME COMPOSITION ("Recently updated": a lede, a featured card over an "Also
 * moved" panel) ON ITS OWN BRANCH, NOT YET MERGED (ruling 1). Nothing here reads it. The geometry the two prompts agree on
 * is matched: the panel runs 150 under the card (130 below 1440) with its content 178 in (152), the card is 300 wide (270),
 * and a picked card rises over 280ms. A later prompt unifies the two once both are on main.
 *
 *   ┌ lede ──────────┐┌ card ┐┌ panel ────────────────────────────────────────┐
 *   │ title          ││      │  header · note                                │
 *   │ sentence       ││      │  rows (pickable)                              │
 *   │ [ button ]     ││      │  and N more                                   │
 *   └────────────────┘└──────┘└───────────────────────────────────────────────┘
 *
 * ⚠️ THE LEDE SITS STRAIGHT ON THE PAGE — no well, no background. The panel runs 34 above and below the card's row, so
 *    the section's own margins carry the gaps the page states (desk → panel 66, panel → next 58; 56 / 50 below 1440).
 * ⚠️ THE CARD RISES ONLY WHEN IT CHANGES, never on first paint, and never under reduced motion — the Web Animations API,
 *    so no keyframe reads a custom property (a `var()` in `@keyframes` fails silently here).
 */
import React, { useEffect, useRef } from "react";
import "./featureStage.css";

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const FeatureStage: React.FC<{
  /** the section's probe (`data-fs`) and its state (`data-state`) */
  probe: string;
  state?: string;
  label: string;
  title: React.ReactNode;
  /** the title's size variant — "compact" for a longer title (the Contact list's "all queried") */
  titleSize?: "default" | "compact";
  sentence: React.ReactNode;
  /** anything under the sentence (a split line, a note) */
  extra?: React.ReactNode;
  action?: React.ReactNode;
  card: React.ReactNode;
  /** the page's own class on the card slot (its card's dress may be scoped to it) */
  cardClass?: string;
  /** changes when the featured card changes — the rise plays on a change, never on first paint */
  cardKey: string;
  /** null draws no panel (a state with nothing to list) */
  panel: React.ReactNode | null;
  /** the page's own class on the panel (a panel with its own header strip clips and drops its padding) */
  panelClass?: string;
}> = ({ probe, state, label, title, titleSize = "default", sentence, extra, action, card, cardClass, cardKey, panel, panelClass }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = cardRef.current?.firstElementChild as HTMLElement | null;
    if (!el || reducedMotion() || typeof el.animate !== "function") return;
    el.animate([{ opacity: 0.4, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
      { duration: 280, easing: "cubic-bezier(.2,.7,.2,1)" });
  }, [cardKey]);
  return (
    <section className={`fs${panel == null ? " fs--bare" : ""}`} aria-label={label} data-fs={probe} data-state={state}>
      <div className="fs-lede" data-fs-part="lede">
        <h2 className={`fs-title${titleSize === "compact" ? " is-compact" : ""}`} data-fs-part="title">{title}</h2>
        <p className="fs-sentence" data-fs-part="sentence">{sentence}</p>
        {extra}
        {action}
      </div>
      <div className={`fs-card${cardClass ? ` ${cardClass}` : ""}`} ref={cardRef} data-fs-part="card" data-card-key={cardKey}>{card}</div>
      {panel != null && <div className={`fs-panel${panelClass ? ` ${panelClass}` : ""}`} data-fs-part="panel">{panel}</div>}
    </section>
  );
};

/** The panel's header row: a title on the left, a note on the right (italic text, or the page's own pill), a hairline under. */
export const FeaturePanelHead: React.FC<{ title: React.ReactNode; note?: React.ReactNode }> = ({ title, note }) => (
  <div className="fs-ph" data-fs-part="panel-head">
    <h3>{title}</h3>
    {note && <span>{note}</span>}
  </div>
);

export interface FeatureRow {
  id: string;
  lead: React.ReactNode;
  name: string;
  sub: React.ReactNode;
  side?: React.ReactNode;
  /** the row's own control, shown at rest (reopening's Remind me) */
  action?: React.ReactNode;
}

/** The pickable list: a click, or Enter / Space on the focused row, picks it; the picked row is tinted. */
export const FeatureList: React.FC<{
  rows: readonly FeatureRow[];
  picked: string | null;
  onPick?: (id: string) => void;
}> = ({ rows, picked, onPick }) => (
  <ol className="fs-list" data-fs-part="list">
    {rows.map((r) => (
      <li key={r.id} className={`fs-row${picked === r.id ? " is-on" : ""}${onPick ? " is-pick" : ""}`} data-fs-row={r.id}
        aria-current={picked === r.id ? "true" : undefined}
        tabIndex={onPick ? 0 : undefined}
        onClick={onPick ? (e) => { if ((e.target as HTMLElement).closest("button, a")) return; onPick(r.id); } : undefined}
        onKeyDown={onPick ? (e) => {
          if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onPick(r.id); }
        } : undefined}>
        <span className="fs-lead" aria-hidden="true">{r.lead}</span>
        <span className="fs-m"><b>{r.name}</b><i>{r.sub}</i></span>
        <span className="fs-side">{r.side}{r.action}</span>
      </li>
    ))}
  </ol>
);
