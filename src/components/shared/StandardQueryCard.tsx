/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE STANDARD QUERY CARD, read-only (Responses v6, design-refs/responses-v6/responses-v6.html `reqCard` / `.lc`): the
 * landing hero's living card, drawn from `src/marketing/heroCard.css`'s own `.mk-lc-*` classes and nothing else, unrotated,
 * on its 7px white mat.
 *
 * ⚠️ WHY A WRAPPER AND NOT THE HERO'S COMPONENT: `marketing/HeroCard.tsx` is hard-wired to its demo and its animation (it
 *    takes no data and writes its own DOM), and the in-app card, `QcQueryCard149`, is the Query Centre's side panel: it
 *    shows the package chip, and its respond and edit modes are wired to that page's writers. This file renders the same
 *    classes over data, and saves nothing. A LIFT CANDIDATE: QcQueryCard149's view mode is this card plus its tabs.
 * ⚠️ IT DECLARES THE FACES heroCard.css READS (`--mk-f-*`) on its own root, as qcv149card.css does, so it can sit on any
 *    page (and inside a portal).
 * ⚠️ `data-standard-card` IS ITS MARKER: a lock asserts a Responses carousel item is this component, not its look.
 */
import React, { useLayoutEffect, useRef } from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import "../../marketing/heroCard.css";
import "./standardQueryCard.css";

export interface StandardCardStep {
  key: string;
  status: QueryStatus | null;
  title: string;
  /** the italic qualifier after the title: "by email" */
  qualifier?: string | null;
  date: string | null;
  /** the materials on the step; `task` is the blush "✓ Task created" chip */
  chips?: { label: string; task?: boolean }[];
  note?: string | null;
}

export interface StandardQueryCardProps {
  band: { label: string; bg: string; fg: string; right?: string | null };
  agent: { initials: string; name: string; agency: string };
  pill: { status: QueryStatus; label: string; bg: string };
  book: { title: string; chips: readonly string[] };
  steps: readonly StandardCardStep[];
  foot: { text: string; late: boolean; action?: { label: string; onClick: () => void; data?: Record<string, string> } | null };
  /** the card opens (a stretched button under the content); absent on an example */
  onOpen?: () => void;
  openLabel?: string;
  /** an inert example: nothing is focusable */
  example?: boolean;
  data?: Record<string, string | undefined>;
  className?: string;
}

const CLOCK = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M8 4.6V8l2.4 1.6" /></svg>
);
const BOOK = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M3 5.5c3-1.3 6-1.3 9 .7 3-2 6-2 9-.7V19c-3-1.3-6-1.3-9 .7-3-2-6-2-9-.7Z" /><path d="M12 6.2v13.5" /></svg>
);

export const StandardQueryCard: React.FC<StandardQueryCardProps> = (p) => {
  const tlv = useRef<HTMLDivElement | null>(null);
  /* the timeline opens scrolled to its latest step (the ref's `t.scrollTop = t.scrollHeight`) */
  useLayoutEffect(() => { const t = tlv.current; if (t) t.scrollTop = t.scrollHeight; }, [p.steps.length]);
  const d = p.data ?? {};
  return (
    <article className={`sqc${p.className ? ` ${p.className}` : ""}`} data-standard-card="" data-example={p.example ? "" : undefined} {...d}>
      {p.onOpen && !p.example ? <button type="button" className="sqc-open" aria-label={p.openLabel ?? `${p.agent.name}. Open.`} onClick={p.onOpen} /> : null}
      <div className="mk-lc-in sqc-in">
        <div className="mk-lc-band sqc-band" style={{ background: p.band.bg, color: p.band.fg }}>
          <span>{p.band.label}</span>{p.band.right ? <span>{p.band.right}</span> : null}
        </div>
        <div className="mk-lc-agent">
          <span className="mk-lc-disc" aria-hidden="true">{p.agent.initials}</span>
          <span className="sqc-who"><div className="mk-lc-nm sqc-nm">{p.agent.name}</div><div className="mk-lc-ag sqc-ag">{p.agent.agency}</div></span>
          <span className="mk-lc-pill sqc-pill" style={{ background: p.pill.bg }}><StatusDot status={p.pill.status} overrideSize={15} decorative />{p.pill.label}</span>
        </div>
        <div className="mk-lc-ms sqc-ms">
          <span className="sqc-bk">{BOOK}</span>
          <span>
            <b>{p.book.title}</b>
            {p.book.chips.length ? <span className="mk-lc-chips">{p.book.chips.map((c) => <span key={c}>{c.toUpperCase()}</span>)}</span> : null}
          </span>
        </div>
        <div className="mk-lc-tabs" aria-hidden="true"><span>Tracking</span><span>Agent</span><span>Materials</span></div>
        <div className="mk-lc-tlv mk-lc-tlv--scroll sqc-tlv" ref={tlv} tabIndex={p.example ? -1 : 0} aria-label={`${p.agent.name}'s timeline`}>
          <ol className="mk-lc-steps sqc-steps">
            <i className="mk-lc-rail sqc-rail" aria-hidden="true" />
            {p.steps.map((s) => (
              <li key={s.key} className="mk-lc-step">
                <span className="sqc-g" aria-hidden="true">{s.status ? <StatusDot status={s.status} overrideSize={18} decorative /> : <i className="sqc-dot" />}</span>
                <span className="mk-lc-t">{s.title}{s.qualifier ? <> <i>{s.qualifier}</i></> : null}</span>
                <span className="mk-lc-d">{s.date ?? ""}</span>
                {s.chips && s.chips.length ? (
                  <span className="mk-lc-att">{s.chips.map((c) => <span key={c.label} className={c.task ? "sqc-tk" : undefined}>{c.label}</span>)}</span>
                ) : null}
                {s.note ? <p className="sqc-note">{"“"}{s.note}{"”"}</p> : null}
              </li>
            ))}
          </ol>
        </div>
        <div className="mk-lc-ft sqc-ft">
          <span className={p.foot.late ? "mk-late" : undefined} data-sqc="due">{CLOCK}{p.foot.text}</span>
          {p.foot.action ? (
            <button type="button" className="sqc-act" tabIndex={p.example ? -1 : undefined} onClick={p.foot.action.onClick} {...(p.foot.action.data ?? {})}>
              {p.foot.action.label}
            </button>
          ) : <i aria-hidden="true" />}
        </div>
      </div>
    </article>
  );
};
