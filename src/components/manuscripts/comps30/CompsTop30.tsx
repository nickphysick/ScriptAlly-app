/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v30 §A: the navy title card (Contact list v26's family, built page-local from its values; a lift
 * candidate beside `ContactHeader26`). Left: the title, one line, the buttons. Right, after a cream rule: the disc and
 * the HIGHLIGHT — the comp agents ask for more with most, or "Too soon to say", or "Nothing sent yet".
 *
 * ⚠️ THE RIGHT BLOCK NEVER SETS THE PANEL'S HEIGHT: it is centred in the row and the disc is a fixed size.
 * ⚠️ THE EMPTY PANEL IS THE SAME PANEL, with no rule and no highlight text.
 */
import React from "react";
import type { Highlight } from "../../../lib/compsShelf";
import { leadLine, numberWord } from "../../../lib/compsShelf";

export const COMPS_HEADER_ART = { src: "/images/comps/comps-header-disc.webp", version: "1fa669c9", width: 520, height: 470 } as const;
const disc = `${COMPS_HEADER_ART.src}?v=${COMPS_HEADER_ART.version}`;

export type TopState =
  | { kind: "loading" }
  | { kind: "nobook" }
  | { kind: "empty"; book: string }
  | { kind: "listed"; book: string; total: number; sent: number; highlight: Highlight; full: boolean };

const Disc: React.FC<{ badge?: string }> = ({ badge }) => (
  <span className="cp30-art" data-cp="disc">
    <img src={disc} alt="" width={150} height={150} />
    {badge ? <span className="cp30-badge" data-cp="hl-badge">{badge}</span> : null}
  </span>
);

const HighlightBlock: React.FC<{ h: Highlight; onOpen: (key: string) => void; onLetters: () => void }> = ({ h, onOpen, onLetters }) => (
  <div className="cp30-hl" data-cp="hl" data-hl={h.kind}>
    <Disc badge={h.kind === "ready" ? `${h.pct}%` : undefined} />
    <div className="cp30-ht">
      {h.kind === "ready" ? (
        <>
          <h3 className="cp30-hq">Agents ask for more most with</h3>
          <span className="cp30-big" data-cp="hl-title">{h.title}</span>
          <span className="cp30-sub">{h.asked} of the {h.queries} queries that named it led to a request.</span>
          <div className="cp30-ha">
            <button type="button" className="cp30-btn is-s is-sm" data-cp="hl-open" data-cx-key="hl-open" onClick={() => onOpen(h.key)}>Open</button>
            <button type="button" className="cp30-lnk" data-cp="hl-letters" onClick={onLetters}>Compare your letters</button>
          </div>
        </>
      ) : h.kind === "soon" ? (
        <>
          <h3 className="cp30-hq">Which comps are working?</h3>
          <span className="cp30-big" data-cp="hl-title">Too soon to say</span>
          <span className="cp30-sub">A comp needs about five queries before its figure means much. Your busiest has gone out with {numberWord(h.busiest)} {h.busiest === 1 ? "query" : "queries"}.</span>
          <div className="cp30-ha"><button type="button" className="cp30-lnk" data-cp="hl-letters" onClick={onLetters}>See your letters</button></div>
        </>
      ) : (
        <>
          <h3 className="cp30-hq">Which comps are working?</h3>
          <span className="cp30-big" data-cp="hl-title">Nothing sent yet</span>
          <span className="cp30-sub">Once a letter naming your comps goes out, you&rsquo;ll see how each one does here.</span>
        </>
      )}
    </div>
  </div>
);

export const CompsTop30: React.FC<{
  state: TopState;
  addRef?: React.Ref<HTMLButtonElement>;
  onAdd: () => void;
  onPick: () => void;
  onHow: () => void;
  onExplain: () => void;
  onOpen: (key: string) => void;
  onLetters: () => void;
}> = ({ state, addRef, onAdd, onPick, onHow, onExplain, onOpen, onLetters }) => (
  <section className="cp30-top" data-cp="top" data-top={state.kind} aria-labelledby="cp30-title">
    <div className="cp30-tx">
      <h1 className="cp30-title" id="cp30-title" data-page-title="">Comparable titles</h1>
      {state.kind === "listed" ? (() => {
        const l = leadLine(state.total, state.sent);
        return <p className="cp30-line" data-cp="lead">{l.before}<b>{state.book}</b>{l.after}</p>;
      })() : state.kind === "empty" ? (
        <p className="cp30-line" data-cp="lead">Keep a shelf of books, films and shows like <b>{state.book}</b>, add them to your query letters, and see which ones go out with the queries that get agents asking for more.</p>
      ) : state.kind === "nobook" ? (
        <p className="cp30-line" data-cp="lead">No manuscript to compare yet. Add one in Manuscripts, then build its comps here.</p>
      ) : (
        <p className="cp30-line" data-cp="lead" aria-hidden="true"><span className="cp30-sk" /></p>
      )}
      {state.kind === "listed" ? (
        <div className="cp30-acts">
          <button ref={addRef} type="button" className="cp30-btn is-p" data-cp="add" data-cx-key="add" disabled={state.full} onClick={onAdd}>+ Add a comp</button>
          <button type="button" className="cp30-btn is-s" data-cp="pick" data-cx-key="pick" onClick={onPick}>Log comps in a letter</button>
          <button type="button" className="cp30-lnk" data-cp="how" data-cx-key="how" onClick={onHow}>How comp tracking works</button>
        </div>
      ) : state.kind === "empty" ? (
        <div className="cp30-acts">
          <button ref={addRef} type="button" className="cp30-btn is-p" data-cp="add" data-cx-key="add" onClick={onAdd}>+ Add your first comp</button>
          <button type="button" className="cp30-btn is-s" data-cp="explain" data-cx-key="explain" onClick={onExplain}>What makes a good comp?</button>
        </div>
      ) : state.kind === "loading" ? (
        /* ⚠️ THE LOADING PANEL HOLDS THE LOADED ONE'S HEIGHT: a button row's box, invisible */
        <div className="cp30-acts" aria-hidden="true" style={{ visibility: "hidden" }}><span className="cp30-btn is-p">+</span></div>
      ) : null}
    </div>
    {state.kind === "listed"
      ? <HighlightBlock h={state.highlight} onOpen={onOpen} onLetters={onLetters} />
      : state.kind === "empty" || state.kind === "loading" ? <div className="cp30-hl is-bare" data-cp="hl" data-hl={state.kind}><Disc /></div> : null}
  </section>
);
