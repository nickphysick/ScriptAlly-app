/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v167 §A (design-refs/query-card-v167/query-card-v167.html, "What's recorded: Nothing") — THE GHOST BAR.
 * A detail that is not recorded keeps its place in the tab's as-built shell and is drawn as a soft bar (#ebe5db, 12px,
 * fully rounded). On hover or keyboard focus of the box that edits it, the "+ Add …" words cross-fade in AT THE SAME
 * SPOT (opacity, 180ms): bar and words share one reserved space, so nothing changes size or position.
 *
 * ⚠️ NEVER SWAP BAR AND WORDS WITH `display` (or `hidden`, or a conditional render): the words would take their own
 *    height and the box would move. Lock 1 of the v167 measure mutates exactly that and must go red.
 * ⚠️ NO SENTENCE EXPLAINS THE GAP: no "Nothing saved yet", no "Nothing recorded". The bar is the whole statement.
 */
import React from "react";

/** one bar, `w` per cent of its row wide */
export const Bar: React.FC<{ w: number; dim?: boolean }> = ({ w, dim }) => (
  <span className={`qc167-g${dim ? " dim" : ""}`} data-qc167="bar" aria-hidden="true" style={{ ["--w" as string]: `${w}%` } as React.CSSProperties} />
);

/** a bar with its "+ Add …" words laid over it (absolutely: they take no room), shown on the host's hover or focus */
export const Ghost: React.FC<{ w: number; words: string | null }> = ({ w, words }) => (
  <span className="qc167-gw" data-qc167="ghost">
    <Bar w={w} />
    {words ? <span className="qc167-ga" data-qc167="words" aria-hidden="true">+ {words}</span> : null}
  </span>
);

/** the agent's seal: their initials on navy */
export const Seal: React.FC<{ initials: string; size?: "sm" | "md" }> = ({ initials, size = "md" }) => (
  <span className={`qc167-seal ${size}`} data-qc167="seal" aria-hidden="true">{initials}</span>
);

export const ARROW = <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>;
export const PENCIL = <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3z" /></svg>;

/** an editable box's own props: a button to the keyboard and to a screen reader, drawn as a box */
export const editable = (label: string, onOpen: (() => void) | null): Record<string, unknown> => (onOpen ? {
  role: "button", tabIndex: 0, "aria-label": label, "data-qc167-ed": "",
  onClick: onOpen,
  onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } },
} : {});
