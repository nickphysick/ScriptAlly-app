/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v27 Part B — THE BOOK VIEW (`#bx` in design-refs/manuscripts-v27/manuscripts-v27.html): a book that opens.
 *
 *   1. the dim fades in and the closed book slides in from the right (600ms), settling centred
 *   2. it holds on the cover (280ms; the prompt's "about 350", trimmed so the turn ends inside lock B1's 1.8s)
 *   3. the cover swings open on its spine (rotateY −180°, 900ms) while the book glides so the spread is centred
 *   4. the page text fades in once the pages are flat; × appears and takes focus
 *   closing runs it backwards: the cover shuts, then the book slides away, then focus returns to the opener — or, where
 *   the close was for Edit details, the drawer opens instead.
 *
 * ⚠️ PORTALLED TO THE BODY AND SEALED WITH `useOverlay` (`#root` goes inert; focus is trapped in the stage; Escape and
 *    a press on the dim close it). Reduced motion: the spread is shown at once, nothing slides or turns.
 * ⚠️ EVERY ROW IS A FACT OR IT IS OMITTED. No dash, no "Not set": the book view shows what is written down.
 */
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlay } from "../../shell/useOverlay";
import type { BookRow, WhereItsBeen } from "../../../lib/manuscriptV27";
import { paragraphs } from "../../../lib/manuscriptV27";
import { QuotedLine } from "../v28/QuotedLine";

export type BookField = "logline" | "elevatorPitch" | "synopsis";

const SLIDE_MS = 600;
const HOLD_MS = 280;
const TURN_MS = 900;
const SHUT_MS = 820;
const AWAY_MS = 420;

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const X = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" /></svg>
);

export interface BookViewProps {
  title: string;
  author: string | null;
  kicker: string | null;
  words: string | null;
  rows: BookRow[];
  stats: WhereItsBeen;
  logline: string;
  pitch: string;
  synopsis: string;
  /** closed: the parent unmounts the view */
  onClosed: () => void;
  /** closed in order to edit: the drawer opens, on a field when one is named */
  onEdit: (field?: BookField) => void;
  onQueryCentre: () => void;
}

export const BookView: React.FC<BookViewProps> = (p) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const xRef = useRef<HTMLButtonElement>(null);
  const [cls, setCls] = useState<string>(reduced() ? "on in open" : "on");
  const timers = useRef<number[]>([]);
  const closing = useRef(false);
  const after = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

  /* open: the slide starts in the first layout pass (a forced reflow, not a frame wait, so lock B1's clock is honest) */
  useLayoutEffect(() => {
    if (reduced()) { xRef.current?.focus(); return () => timers.current.forEach(clearTimeout); }
    void rootRef.current?.offsetWidth;
    setCls("on in");
    after(SLIDE_MS + HOLD_MS, () => {
      setCls("on in open");
      after(TURN_MS, () => xRef.current?.focus());
    });
    return () => timers.current.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { onClosed, onEdit } = p;
  const close = useCallback((then?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    timers.current.forEach(clearTimeout);
    if (reduced()) { (then ?? onClosed)(); return; }
    setCls("on in");
    after(SHUT_MS, () => {
      setCls("on");
      after(AWAY_MS, () => (then ?? onClosed)());
    });
  }, [onClosed]);
  const edit = (field?: BookField) => close(() => onEdit(field));

  const { trapTab, scrimClick } = useOverlay(rootRef, {
    onEscape: () => close(), captureEscape: true, scrimClasses: ["ms27-bx-dim"], onScrimClick: () => close(),
  });

  const none = (field: BookField) => (
    <p className="ms27-bx-none" data-ms27bx={`none-${field}`}>Not written yet. <button type="button" className="ms27-bx-lnk" onClick={() => edit(field)}>Add one</button></p>
  );
  const syn = paragraphs(p.synopsis);

  const node = (
    <div className={`ms27-bx msv12-layer ${cls}`} id="bx" data-ms27bx="root" onKeyDown={trapTab} onClick={scrimClick}>
      <div className="ms27-bx-dim" data-ms27bx="dim" />
      <div className="ms27-bx-stage" ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="ms27-bxT" tabIndex={-1} data-ms27bx="stage">
        <button type="button" ref={xRef} className="ms27-bx-x" aria-label="Close the book" data-ms27bx="x" onClick={() => close()}><X /></button>
        <div className="ms27-bx-book" data-ms27bx="book">
          <section className="ms27-bx-pg ms27-bx-right" aria-label="Logline, pitch and synopsis" data-ms27bx="right">
            <div className="ms27-bx-in">
              <h4>Logline</h4>
              {p.logline.trim() ? <p className="ms27-bx-lg"><QuotedLine text={p.logline} /></p> : none("logline")}
              <h4>Elevator pitch</h4>
              {p.pitch.trim() ? <p className="ms27-bx-pt" data-ms27bx="pitch">{p.pitch.trim()}</p> : none("elevatorPitch")}
              <h4>Synopsis</h4>
              {syn.length ? syn.map((t, i) => <p key={i} className="ms27-bx-sy">{t}</p>) : none("synopsis")}
            </div>
            <div className="ms27-bx-ft">
              <span className="ms27-bx-pn">ii</span><span className="ms27-bx-sp" />
              <button type="button" className="ms27-bx-b g" data-ms27bx="close" onClick={() => close()}>Close</button>
              <button type="button" className="ms27-bx-b p" data-ms27bx="edit" onClick={() => edit()}>Edit</button>
            </div>
          </section>
          <div className="ms27-bx-cover" data-ms27bx="cover">
            <div className="ms27-bx-front" aria-hidden="true">
              <i className="ms27-bx-spine" />
              <div className="ms27-bx-label">
                {p.kicker ? <span className="ms27-bx-k">{p.kicker}</span> : null}
                <b>{p.title}</b>
                {p.author ? <><i /><span className="ms27-bx-au">{p.author}</span></> : null}
              </div>
              {p.words ? <span className="ms27-bx-wd">{p.words} words</span> : null}
            </div>
            <section className="ms27-bx-pg ms27-bx-left" aria-label="The book's details" data-ms27bx="left">
              <div className="ms27-bx-in">
                <p className="ms27-bx-ey">— The book —</p>
                <h3 id="ms27-bxT">{p.title}</h3>
                {p.author ? <p className="ms27-bx-by"><em>by</em> {p.author}</p> : null}
                <dl className="ms27-bx-dl" data-ms27bx="rows">
                  {p.rows.map((r) => (
                    <div className="ms27-bx-r" key={r.key} data-row={r.key}>
                      <dt>{r.label}</dt><dd>{r.dot ? <i className="ms27-bx-sd" aria-hidden="true" /> : null}{r.value}</dd>
                    </div>
                  ))}
                </dl>
                <h4>Where it&rsquo;s been</h4>
                <div className="ms27-bx-st" data-ms27bx="stats">
                  <div><b>{p.stats.sent}</b><span>{p.stats.sent === 1 ? "query sent" : "queries sent"}</span></div>
                  <div><b>{p.stats.askedForMore}</b><span>asked for more</span></div>
                  <div><b>{p.stats.withAgents}</b><span>with agents</span></div>
                </div>
                <button type="button" className="ms27-bx-lnk ms27-bx-qc" data-ms27bx="qc" onClick={() => close(p.onQueryCentre)}>See them in the Query Centre &rarr;</button>
              </div>
              <div className="ms27-bx-ft"><span className="ms27-bx-pn">i</span></div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
  return typeof document === "undefined" ? node : createPortal(node, document.body);
};
