/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from "react";
import { QueryStatus } from "../../../types";
import { StepGlyph } from "./QcBubble152";

export const ARW = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" /></svg>;
export const CLOCK = <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M8 4.6V8l2.3 1.4" /></svg>;

/**
 * Query card v158.1 (design-refs/query-card-v158-1/) — THE FOOTER, from either path (footer1522, or the older reply box).
 * One action: one row, as built — the status pill (which grows with its words) and the button. Two or three: two rows —
 * the status across the full width (no pill), and beneath it the actions on one line: a third action as the underlined
 * link at the far left, the second as an outlined button, the primary navy at the right. Labels, handlers, data-act and
 * test hooks are the paths' own; DOM order is reading order.
 */
export type FootAction = { label: string; act: string; run: () => void; hook: Record<string, string> };
type FootIconIn = { k: "stage"; status: QueryStatus } | { k: "ring"; p: number } | { k: "clock" } | { k: "grey"; status: QueryStatus };
export const Foot: React.FC<{ late: boolean; icon: FootIconIn; lead: string; sub: string; outer: Record<string, string>;
  primary: (FootAction & { tone: "navy" | "outline"; arrow?: boolean }) | null; others: (FootAction | null)[] }> = ({ late, icon, lead, sub, outer, primary, others }) => {
  const disc = icon.k === "clock" ? <span className="qc152-fc" data-qc152="foot-icon" aria-hidden="true">{CLOCK}</span>
    : icon.k === "ring" ? <span className="qc152-fr" data-qc152="foot-icon" style={{ ["--p" as string]: String(icon.p) }} aria-hidden="true" />
    : <span className={`qc152-fg${icon.k === "grey" ? " grey" : ""}`} data-qc152="foot-icon" aria-hidden="true">{StepGlyph({ status: icon.status, kind: null })}</span>;
  const words = <div className="qc152-rft"><b data-qc152="reply-lead">{lead}</b><span data-qc152="reply-sub">{sub}</span></div>;
  const prim = primary ? <button type="button" className={`qc152-rbtn ${primary.tone === "navy" ? "nv" : "gh"}`} {...primary.hook} data-tone={primary.tone} data-act={primary.act}
    onClick={primary.run}>{primary.label}{primary.arrow ?? primary.tone === "navy" ? ARW : null}</button> : null;
  const rest = others.filter((x): x is FootAction => !!x);
  const n = (primary ? 1 : 0) + rest.length;
  const cls = `qc152-rb${late ? " late" : ""}`;
  if (n <= 1) {
    /* one row, as built: the pill and the button (a lone link sits after it, as before) */
    return (
      <div className={cls} data-qc152="reply" data-rows="1" data-icon={icon.k} {...outer}>
        <div className="qc152-rf" data-qc152="reply-field">{disc}{words}</div>
        {prim}
        {rest.map((a) => <button key={a.act} type="button" className="qc1522-flink" {...a.hook} data-act={a.act} onClick={a.run}>{a.label}</button>)}
      </div>
    );
  }
  /* two rows: the first other action is the outlined button; a second other action is the link at the far left */
  const [second, third] = rest;
  return (
    <div className={`${cls} nf`} data-qc152="reply" data-rows="2" data-icon={icon.k} {...outer}>
      <div className="nf-st" data-qc152="reply-field">{disc}{words}</div>
      <div className="nf-ac" data-qc1581="actions">
        {third ? <button type="button" className="qc1522-flink" {...third.hook} data-act={third.act} onClick={third.run}>{third.label}</button> : null}
        <i className="nf-sp" aria-hidden="true" />
        {second ? <button type="button" className="qc152-rbtn gh2" {...second.hook} data-act={second.act} onClick={second.run}>{second.label}</button> : null}
        {prim}
      </div>
    </div>
  );
};

