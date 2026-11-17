/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v15 Phase E (ref `words` as last defined, `spHTML`, `spDraw`, `qcard`) — IN THEIR WORDS: one note at a time.
 *
 *   left   the agents who wrote a note, newest first (seal, name, answer, date), each with the thin progress line
 *   right  the chosen note large, "{k} of {n}" with previous / next, the agent and agency, the answer pill and date,
 *          "{days} days after you queried · on the query / after the partial / after the full", and Open the card
 *
 * ⚠️ THE ADVANCE (decision 10): every 9 seconds (`NOTE_ADVANCE_MS`; a test may shorten it through
 *    `window.__RS15_ADVANCE_MS`), waiting while the pointer or focus is inside the section or a panel is open, stopping
 *    for good once the writer picks an agent or uses an arrow, and off under prefers-reduced-motion. Nothing loops.
 * ⚠️ A NOTE IS WHAT IT IS TODAY (decision 8): `hasNote` — a personal pass or a revision's notes, never summarised.
 * ⚠️ ONE NOTE: a single quote card. NONE: the page renders no section.
 */
import React, { useEffect, useRef, useState } from "react";
import { NOTE_ADVANCE_MS, noteStage, notesFor, noteSwitch, respDate, type NoteKind, type RespItem } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { StatusDot } from "../StatusDot";
import { STEP_WORD } from "./RspCarousel";

type Item = RespItem<QcRow>;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const advanceMs = () => {
  const w = typeof window !== "undefined" ? (window as unknown as { __RS15_ADVANCE_MS?: unknown }).__RS15_ADVANCE_MS : undefined;
  return typeof w === "number" && w > 0 ? w : NOTE_ADVANCE_MS;
};
/** the stage tone for a note's pill and its quote mark (the ref's `C` and `DP`): rose for a revision, grey for a pass */
export const noteTone = (i: Item): "p" | "x" => (i.group === "passed" ? "x" : "p");
/** the answer's words on the pill: "Passed", or the request's own status word */
export const answerWord = (i: Item): string => (i.group === "passed" ? "Passed" : STEP_WORD[i.row.status] ?? i.row.status);
const GO = (flip?: boolean) => (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={flip ? { transform: "scaleX(-1)" } : undefined}><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);

const Pill: React.FC<{ i: Item; nowMs: number }> = ({ i, nowMs }) => (
  <span className="rsp15-pl" data-rsp15="pill"><StatusDot status={i.row.status} overrideSize={16} decorative />{answerWord(i)}{i.answerMs != null ? ` · ${respDate(i.answerMs, nowMs)}` : ""}</span>
);

/** the single quote card (the ref's `qcard` with `big`), for exactly one note */
const QuoteCard: React.FC<{ i: Item; nowMs: number; selected: boolean; onOpen: () => void }> = ({ i, nowMs, selected, onOpen }) => (
  <button type="button" className={`rsp15-qt${selected ? " is-sel" : ""}`} data-rsp15="quote-card" data-tone={noteTone(i)} onClick={onOpen}>
    <span className="rsp15-mk" aria-hidden="true">{"“"}</span>
    <q data-rsp15="note">{i.note}</q>
    <span className="rsp15-by">
      <span className="rsp15-mono" aria-hidden="true">{i.row.initials}</span>
      <span className="rsp15-who"><b>{i.row.agentName}</b><em>{i.row.agency}</em></span>
      <Pill i={i} nowMs={nowMs} />
    </span>
    <span className="rsp15-act" aria-hidden="true">{GO()}</span>
  </button>
);

export const RspWords: React.FC<{
  items: readonly Item[];
  nowMs: number;
  msTitle: string | null;
  selectedId: string | null;
  /** a panel is open over the page: the advance waits */
  panelOpen: boolean;
  onOpen: (i: Item) => void;
}> = ({ items, nowMs, msTitle, selectedId, panelOpen, onOpen }) => {
  const [kind, setKind] = useState<NoteKind>("all");
  const [at, setAt] = useState(0);
  const [auto, setAuto] = useState(true);
  const root = useRef<HTMLElement | null>(null);
  const all = notesFor(items, "all");
  const list = notesFor(items, kind);
  const sw = noteSwitch(items);
  const n = list.length;
  const k = at < n ? at : 0;
  /* the advance: one timer per shown note; a hover, focus or open panel postpones it, a pick stops it for good */
  const hold = useRef(panelOpen);
  hold.current = panelOpen;
  useEffect(() => {
    if (!auto || n < 2 || reduced()) return undefined;
    let t = 0;
    const tick = () => {
      const el = root.current;
      if (el && (el.matches(":hover") || el.contains(document.activeElement) || hold.current)) { t = window.setTimeout(tick, 1500); return; }
      setAt((x) => ((x < n ? x : 0) + 1) % n);
    };
    t = window.setTimeout(tick, advanceMs());
    return () => window.clearTimeout(t);
  }, [auto, n, k]);
  if (!all.length) return null;
  const book = msTitle || "your book";
  const pick = (j: number) => { setAt(j); setAuto(false); };
  const head = (
    <div className="rsp15-h2" id="rsp15-words-h2">
      <h2 id="rsp15-words-h" className="rsp15-h2t">In their words</h2>
      <p>What agents wrote to you about {book}, as you recorded it.</p>
      <span className="rsp15-sp" />
      {sw ? (
        <div className="rsp15-seg" role="group" aria-label="Show notes" data-rsp15="words-seg">
          {([["all", "All", sw.all], ["pass", "From passes", sw.pass], ["req", "From requests", sw.req]] as [NoteKind, string, number][]).map(([v, l, c]) => (
            <button key={v} type="button" aria-pressed={kind === v} className={kind === v ? "on" : undefined} data-k={v}
              onClick={() => { setKind(v); setAt(0); }}>{l}<em>{c}</em></button>
          ))}
        </div>
      ) : null}
    </div>
  );
  if (n < 2) {
    return (
      <section className="rsp15-sec" data-rsp15="words" data-rsp5-sec="words" data-n={n} aria-labelledby="rsp15-words-h" ref={root}>
        {head}
        <div className="rsp15-words">{list.map((i) => <QuoteCard key={i.id} i={i} nowMs={nowMs} selected={selectedId === i.id} onOpen={() => onOpen(i)} />)}</div>
      </section>
    );
  }
  const i = list[k];
  return (
    <section className="rsp15-sec" data-rsp15="words" data-rsp5-sec="words" data-n={n} data-at={k} data-auto={auto ? "1" : "0"} aria-labelledby="rsp15-words-h" ref={root}>
      {head}
      <div className="rsp15-spot" data-rsp15="spot">
        <div className="rsp15-spl" role="tablist" aria-label="Agents who wrote a note">
          {list.map((x, j) => (
            <button key={x.id} type="button" role="tab" aria-selected={j === k} className={`rsp15-spi${j === k ? " on" : ""}${auto ? " run" : ""}`}
              data-rsp15="words-agent" data-id={x.id} onClick={() => pick(j)}>
              <span className="rsp15-mono" aria-hidden="true">{x.row.initials}</span>
              <span className="rsp15-who"><b>{x.row.agentName}</b><em>{answerWord(x)}</em></span>
              <small>{x.answerMs != null ? respDate(x.answerMs, nowMs) : ""}</small>
              {/* the thin progress line: keyed on the shown note, so it starts again with each */}
              <i key={j === k ? `run-${k}` : "idle"} aria-hidden="true" style={{ animationDuration: `${advanceMs()}ms` }} />
            </button>
          ))}
        </div>
        <div className="rsp15-spq" data-rsp15="words-note" data-tone={noteTone(i)} data-id={i.id}>
          <span className="rsp15-pg">
            <button type="button" aria-label="Previous note" data-rsp15="words-prev" onClick={() => pick((k - 1 + n) % n)}>{GO(true)}</button>
            <span data-rsp15="words-count">{k + 1} of {n}</span>
            <button type="button" aria-label="Next note" data-rsp15="words-next" onClick={() => pick((k + 1) % n)}>{GO()}</button>
          </span>
          <span className="rsp15-mk" aria-hidden="true">{"“"}</span>
          <q key={i.id} data-rsp15="note">{i.note}</q>
          <div className="rsp15-by">
            <span className="rsp15-mono" aria-hidden="true">{i.row.initials}</span>
            <span className="rsp15-who"><b>{i.row.agentName}</b><em>{i.row.agency}</em></span>
            <span className="rsp15-fc"><Pill i={i} nowMs={nowMs} /><br /><span data-rsp15="words-stage">{noteStage(i)}</span></span>
            <button type="button" className="rsp15-open" data-rsp15="open-card" onClick={() => onOpen(i)}>Open the card</button>
          </div>
        </div>
      </div>
    </section>
  );
};
