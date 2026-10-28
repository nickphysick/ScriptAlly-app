/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 Phase 6 (ref `words`) — IN THEIR WORDS: on the paper-white band, every personal note an agent sent with
 * an answer (D5: a detailed rejection with its text, or a revise-and-resubmit's notes), shown exactly as stored, in
 * three filterable columns. A card opens the answer in the panel.
 *
 * ⚠️ THE NOTES ARE `noteItems` (lib/responses), newest answer first. Nothing is summarised, grouped by theme or rewritten.
 * ⚠️ With no note at all the section is not drawn (the reference's own rule).
 */
import React, { useState } from "react";
import { StatusDot } from "../StatusDot";
import { noteItems, respDate, type RespItem } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { STEP_WORD } from "./RspCarousel";

type Item = RespItem<QcRow>;
export type WordsFilter = "all" | "pass" | "req";

/** the card's foot glyph line: where a pass came, or the request it came with */
export const noteGlyphLine = (i: Item): string => i.group === "passed"
  ? (i.furthest === "query" ? "Passed on the query" : `Passed after the ${i.furthest}`)
  : (STEP_WORD[i.row.status] ?? "");

export const NoteCard: React.FC<{ i: Item; nowMs: number; onOpen?: () => void; example?: boolean }> = ({ i, nowMs, onOpen, example }) => (
  <article className="rsp5-qc" data-rsp5="note" data-id={example ? undefined : i.id} data-k={i.group} data-example={example ? "" : undefined}
    tabIndex={onOpen ? 0 : undefined} role={onOpen ? "button" : undefined}
    aria-label={onOpen ? `${i.row.agentName}'s note. Open the answer.` : undefined}
    onClick={onOpen} onKeyDown={onOpen ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } } : undefined}>
    <blockquote>{i.note}</blockquote>
    <div className="rsp5-qcf">
      <span className="rsp5-face" aria-hidden="true">{i.row.initials}</span>
      <span className="rsp5-qcw"><b>{i.row.agentName}</b><span>{i.row.agency}{i.answerMs != null ? ` · ${respDate(i.answerMs, nowMs)}` : ""}</span></span>
      <span className="rsp5-gl"><StatusDot status={i.row.status} overrideSize={14} decorative />{noteGlyphLine(i)}</span>
    </div>
  </article>
);

export const Rsp5Words: React.FC<{ items: readonly Item[]; nowMs: number; onOpen: (i: Item) => void }> = ({ items, nowMs, onOpen }) => {
  const [f, setF] = useState<WordsFilter>("all");
  const all = noteItems(items);
  if (!all.length) return null;
  const nPass = all.filter((i) => i.group === "passed").length;
  const nReq = all.length - nPass;
  const list = all.filter((i) => f === "all" || (f === "pass" ? i.group === "passed" : i.group === "more"));
  const chip = (k: WordsFilter, label: string, n: number) => (
    <button type="button" className="rsp5-chip" data-rsp5="words-chip" data-k={k} data-n={n} aria-pressed={f === k} onClick={() => setF(k)}>{label}<small>{n}</small></button>
  );
  return (
    <section className="rsp5-words" data-rsp5="words" data-rsp5-sec="words" aria-labelledby="rsp5-words-h">
      <div className="rsp5-h2row">
        <div className="rsp5-h2">
          <span className="rsp5-art rsp5-art--sm" aria-hidden="true">Art: letters pinned to a board</span>
          <div>
            <h2 id="rsp5-words-h" className="rsp5-h2t">In their words</h2>
            <p className="rsp5-sub">Every personal note an agent sent with their answer, exactly as you recorded it.</p>
          </div>
        </div>
        <div className="rsp5-chips" role="group" aria-label="Show">
          {chip("all", "All", all.length)}{chip("pass", "With a pass", nPass)}{chip("req", "With a request", nReq)}
        </div>
      </div>
      <div className="rsp5-qwall" data-rsp5="words-wall">
        {list.map((i) => <NoteCard key={i.id} i={i} nowMs={nowMs} onOpen={() => onOpen(i)} />)}
      </div>
      <p className="rsp5-wnote">To add a note to an answer, open it and choose Edit the response.</p>
    </section>
  );
};
