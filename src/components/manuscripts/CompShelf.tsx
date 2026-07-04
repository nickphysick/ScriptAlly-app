/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The comp shelf — the SINGLE editing surface for a manuscript's comparable titles, plus the
 * pitch-line block that composes itself from the first two shelf comps. The gold OLDER COMP
 * chip is derived at render via isOlderComp (shared with the Suggestions age caution) — never
 * stored. Persistence goes through the parent's updateManuscript write.
 */
import React, { useState } from "react";
import { CompTitle } from "../../types";
import { isOlderComp, pitchLine, pitchLineText, MAX_COMPS } from "../../lib/comps";

interface CompShelfProps {
  comps: CompTitle[];
  currentYear: number;
  onAdd: (comp: CompTitle) => void;
  onRemove: (index: number) => void;
}

/** "AUTHOR · YEAR" mono line — degrades gracefully when either half is absent. */
const byLine = (c: CompTitle): string | null => {
  const author = (c.author || "").trim().toUpperCase();
  if (author && c.year) return `${author} · ${c.year}`;
  if (author) return author;
  if (c.year) return String(c.year);
  return null;
};

const AddCompModal: React.FC<{ onSave: (comp: CompTitle) => void; onClose: () => void }> = ({
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [note, setNote] = useState("");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const yearNum = parseInt(year, 10);
    const validYear = Number.isFinite(yearNum) && yearNum >= 1000 && yearNum <= 2100;
    // Optional fields are OMITTED when empty — Firestore rejects undefined values inside maps.
    onSave({
      title: title.trim(),
      source: "user",
      ...(author.trim() ? { author: author.trim() } : {}),
      ...(validYear ? { year: yearNum } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    onClose();
  };

  return (
    <div className="msv-modal-scrim" onClick={onClose}>
      <div className="msv-modal" onClick={(e) => e.stopPropagation()}>
        <h4>Add a comp</h4>
        <form onSubmit={save}>
          <div className="msv-field">
            <label className="msv-lab" htmlFor="msv-comp-title">TITLE</label>
            <input
              id="msv-comp-title"
              className="msv-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="msv-field">
            <label className="msv-lab" htmlFor="msv-comp-author">AUTHOR</label>
            <input
              id="msv-comp-author"
              className="msv-input"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          <div className="msv-field">
            <label className="msv-lab" htmlFor="msv-comp-year">YEAR</label>
            <input
              id="msv-comp-year"
              className="msv-input"
              type="number"
              min={1000}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div className="msv-field">
            <label className="msv-lab" htmlFor="msv-comp-note">WHY IT COMPS</label>
            <input
              id="msv-comp-note"
              className="msv-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. sibling loyalty inside war machines"
            />
          </div>
          <div className="msv-modal-actions">
            <button type="button" className="msv-btn sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="msv-btn sm" disabled={!title.trim()}>
              Add to shelf
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CompShelf: React.FC<CompShelfProps> = ({ comps, currentYear, onAdd, onRemove }) => {
  const [addOpen, setAddOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const p = pitchLine(comps);
  const atCap = comps.length >= MAX_COMPS;

  const copy = () => {
    const text = pitchLineText(comps);
    if (!text) return;
    void navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <>
      <div className="msv-pitchblock">
        <div style={{ minWidth: 0 }}>
          <span className="msv-lab" style={{ display: "block", marginBottom: 5 }}>
            YOUR PITCH LINE
          </span>
          {p.kind === "two" && (
            <div className="msv-pitchline">
              <i>{p.a}</i>
              <span className="msv-meets"> meets </span>
              <i>{p.b}</i>
            </div>
          )}
          {p.kind === "one" && (
            <div className="msv-pitchline">
              <i>{p.a}</i>
              <span className="msv-meets"> meets </span>
              <span className="msv-hint">&hellip; one more comp completes the line</span>
            </div>
          )}
          {p.kind === "none" && (
            <div className="msv-hint">
              Your pitch line builds itself here once the shelf has two comps &mdash; the sentence
              agents scan for first.
            </div>
          )}
        </div>
        {p.kind === "two" && (
          <button type="button" className="msv-btn sm" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      {comps.length === 0 && (
        <p className="msv-shelfempty">
          No comps on the shelf yet &mdash; most agents expect two or three, published in the last
          five years.
        </p>
      )}

      <div className="msv-shelfgrid">
        {comps.map((c, i) => {
          const by = byLine(c);
          return (
            <div key={`${c.title}-${i}`} className="msv-comp">
              <button
                type="button"
                className="msv-comp-rm"
                title="Remove"
                aria-label={`Remove ${c.title}`}
                onClick={() => onRemove(i)}
              >
                &times;
              </button>
              <div className="msv-comp-t">{c.title}</div>
              {by && <div className="msv-comp-by msv-lab">{by}</div>}
              {c.note && <div className="msv-comp-note">{c.note}</div>}
              {isOlderComp(c.year, currentYear) && (
                <span className="msv-oldchip">OLDER COMP &middot; {c.year}</span>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="msv-addcomp"
          onClick={() => setAddOpen(true)}
          disabled={atCap}
          title={atCap ? `Shelf is full — ${MAX_COMPS} comps` : undefined}
        >
          <span className="msv-plus">+</span>
          <span className="msv-cap">ADD A COMP</span>
        </button>
      </div>

      {addOpen && <AddCompModal onSave={onAdd} onClose={() => setAddOpen(false)} />}
    </>
  );
};
