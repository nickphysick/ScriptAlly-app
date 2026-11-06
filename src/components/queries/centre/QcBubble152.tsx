/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.1 §2.2 (design-refs/query-centre-v152-1/thread-edge-cases.html, thread-colours-3.html) — ONE BUBBLE,
 * drawn the same in the thread, the record form's draft (§2.9) and Fix a mistake, so the three cannot disagree.
 *
 * ⚠️ THE COLOUR RULE: your bubbles are paper (#f6f3ee) and always paper; the agent's are tinted by what the reply was
 *    (lib/qcThread152 tintOf), with a 1px inset edge. The glyph is ink on nothing — a StatusDot at 18px in a 26px box,
 *    no disc behind it; a pass and your closes are grey. No navy anywhere inside.
 * ⚠️ THE NUDGE'S "!" IS DRAWN HERE AND IN THE RECORD FORM ONLY, never on a row, pill, tag or Birds-eye bar (§2.4): it is not
 *    a status, so StatusDot stays the only status glyph.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";

/** §2.4 the nudge's glyph: a ring with "!" (nudge-icons.html, option A) */
export const NUDGE_MARK = (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#1c130f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-qc152="nudge-mark">
    <circle cx="10" cy="10" r="7" /><path d="M10 6.2v4.6" /><circle cx="10" cy="13.6" r="1" fill="#1c130f" stroke="none" />
  </svg>
);
const HOLD = <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#1c130f" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M7 10h6" strokeLinecap="round" /></svg>;

/** the glyph for a step: a StatusDot for a status, the "!" for a nudge, the offer's for telling others about one */
export function StepGlyph({ status, kind }: { status: QueryStatus | null; kind: "nudge" | "holding" | "told" | null }) {
  if (kind === "nudge") return NUDGE_MARK;
  if (kind === "holding") return HOLD;
  if (kind === "told") return <StatusDot status={QueryStatus.OFFER} overrideSize={18} decorative />;
  return status ? <StatusDot status={status} overrideSize={18} decorative /> : HOLD;
}

/* §2.2 a chip's small line icon: an envelope for the letter, a page for the synopsis, stacked pages for samples and the full */
const ICO_L = <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="m2.5 4.5 5.5 4 5.5-4" /></svg>;
const ICO_S = <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M4 2h6l2.5 2.5V14H4z" /><path d="M6 7h4M6 9.5h4" /></svg>;
const ICO_P = <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M5 2.5h7v10H5z" /><path d="M3.5 4.5v10h7" /></svg>;
export const chipIcon = (label: string) => (/letter/i.test(label) ? ICO_L : /synopsis/i.test(label) ? ICO_S : ICO_P);

export interface BubbleProps {
  side: "me" | "them";
  status: QueryStatus | null;
  kind: "nudge" | "holding" | "told" | null;
  title: string;
  date: string;
  dated: boolean;
  tint: { fill: string; edge: string } | null;
  grey: boolean;
  initials: string;
  /** the chip row: rendered by the caller (the thread's chips are buttons with tips; a draft's are plain) */
  chips?: React.ReactNode;
  via?: string | null;
  /** v152.2 §5 a line under the bubble ("Form rejection · open to more work") */
  sub?: string | null;
  quote?: string | null;
  follows?: string | null;
  nth?: string | null;
  /** §2.9 the record and edit forms' preview: a dashed edge and "· draft" after the title */
  draft?: boolean;
  /** the outer element's extra props (data-*, class, style) */
  outer?: Record<string, unknown>;
  /** after the bubble's contents (the thread's ✎ Edit) */
  after?: React.ReactNode;
  className?: string;
}

export const Bubble: React.FC<BubbleProps> = (b) => {
  const style = b.tint ? ({ ["--bt" as string]: b.tint.fill, ["--be" as string]: b.tint.edge } as React.CSSProperties) : undefined;
  return (
    <div {...(b.outer as React.HTMLAttributes<HTMLDivElement>)} className={`qc152-m ${b.side}${b.draft ? " drf" : ""}${b.className ? ` ${b.className}` : ""}`}>
      {b.side === "them" ? <span className="qc152-av" aria-hidden="true">{b.initials}</span> : null}
      <div className={`qc152-bx${b.tint ? " tinted" : ""}`} data-qc152="bubble" style={style}>
        {b.follows ? (
          <div className="qc152-fq" data-qc152="follows"><i /><b>Following up</b><span>{b.follows}</span></div>
        ) : null}
        <div className="qc152-bw">
          <span className={`qc152-g0${b.grey ? " grey" : ""}`} data-qc152="glyph">{StepGlyph({ status: b.status, kind: b.kind })}</span>
          <div className="qc152-qx">
            <div className="qc152-r1">
              <b data-qc152="msg-title">{b.title}</b>
              {b.nth ? <span className="qc152-nth" data-qc152="nth">{b.nth}</span> : null}
              {b.draft ? <span className="qc152-drt" data-qc152="draft-mark">· draft</span> : null}
              <span className={`qc152-dt${b.dated ? "" : " nod"}`} data-qc152="msg-date">{b.date}</span>
            </div>
            {b.chips || b.via ? <div className="qc152-r2">{b.chips}{b.via ? <em data-qc152="via">{b.via}</em> : null}</div> : null}
            {b.quote ? <div className="qc152-qt" data-qc152="quote">“{b.quote}”</div> : null}
            {b.sub ? <div className="qc1522-sb" data-qc1522="sub">{b.sub}</div> : null}
          </div>
        </div>
        {b.after}
      </div>
    </div>
  );
};
