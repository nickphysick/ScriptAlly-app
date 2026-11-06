/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v1 — one letter in the "Your letters" grid (design-refs/query-letters-v1, 02). The paper shows the
 * letter's opening paragraphs fading out; a name-only or file letter shows its file name and a document glyph instead.
 */
import React from "react";
import type { ManuscriptVersion } from "../../types";
import { dayMonth, formatDate } from "../../lib/dates";
import { changedLine, openingParas, type LetterFacts } from "../../lib/queryLetters";

export const fmtDay = (iso: string | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.getFullYear() === new Date().getFullYear() ? dayMonth(d) : formatDate(d, { day: "numeric", month: "short", year: "numeric" });
};

export const DocGlyph: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" />
  </svg>
);

/** A letter with no text here: the writer keeps it elsewhere and named the file. */
export const isFileOnly = (v: ManuscriptVersion): boolean => !v.contentDraft?.trim() && (v.contentType === "ref" || v.contentType === "file" || v.contentType === "link" || !!v.fileName);

export const LetterCard: React.FC<{
  facts: LetterFacts;
  inUse: boolean;
  first?: boolean;
  onOpen: (id: string) => void;
}> = ({ facts, inUse, first = false, onOpen }) => {
  const v = facts.letter;
  const draft = facts.sent === 0;
  const line = changedLine(v, first);
  const saved = fmtDay(v.createdDate);
  const paras = openingParas(v.contentDraft);
  return (
    <button
      type="button"
      className={`qlc${inUse ? " qlc--use" : ""}${draft && !inUse ? " qlc--draft" : ""}`}
      data-ql="card" data-id={v.id}
      onClick={() => onOpen(v.id)}
    >
      <span className="qlc-paper" aria-hidden="true">
        {inUse ? <span className="qlc-flag">In use for new queries</span> : draft ? <span className="qlc-flag qlc-flag--d">Draft</span> : null}
        {isFileOnly(v) ? (
          <span className="qlc-file"><DocGlyph /><span>{v.fileName || v.contentLink || "Kept in a file"}</span></span>
        ) : (
          <span className="qlc-lines">{paras.map((p, i) => <span key={i} className="qlc-p">{p}</span>)}</span>
        )}
      </span>
      <span className="qlc-body">
        <span className="qlc-name">{v.versionName}</span>
        <span className="qlc-note">{line ? `${line} · ` : ""}saved {saved}</span>
        <span className="qlc-foot" data-ql="card-foot">
          {draft ? (
            <span className="qlc-unsent">Not sent yet</span>
          ) : (
            <>
              <span className="qlc-n"><b>{facts.sent}</b> sent</span>
              <span className="qlc-n"><b>{facts.more}</b> asked for more</span>
              <span className="qlc-bar" title={`${facts.morePct}% asked for more`}><i style={{ width: `${Math.max(facts.morePct, 3)}%` }} /></span>
            </>
          )}
        </span>
      </span>
    </button>
  );
};

/** The last tile in the grid. */
export const NewLetterTile: React.FC<{ onNew: () => void }> = ({ onNew }) => (
  <button type="button" className="qlc qlc--new" data-ql="new-tile" onClick={onNew}>
    <span className="qlc-newin">
      <img src="/images/dash/quill.png" alt="" />
      <b>Write a new letter</b>
      <span>Start from scratch, or from a copy of one you've sent.</span>
    </span>
  </button>
);
