/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ ALSO ON YOUR SHELF — rows, not a table ════════════════════════════════════════════════════
 *
 * ⚠️ NOT A RESTYLE OF THE TABLE. The table was spreadsheet chrome — column headers, a header row,
 * six columns — around what is usually one or two books. These are rows: no headers, no grid, one
 * figure rather than four, and each row is a card in its own right.
 *
 * ⚠️ THE CONTROL IS A REAL BUTTON, per row. A clickable row is not keyboard-reachable, announces
 * nothing, and does not fire on Enter or Space — and each Open names its book, because a column of
 * identical "Open" tells a screen-reader user nothing about which one they are on.
 */
import React from "react";
import { Manuscript, Query } from "../../types";
import { bookFigures } from "../../lib/bookFigures";
import "./manuscriptAlsoRows.css";

export interface ManuscriptAlsoRowsProps {
  manuscripts: Manuscript[];
  queries: Query[];
  genresOf: (m: Manuscript) => string[];
  statusOf: (m: Manuscript) => string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}

const byline = (genres: string[], wordCount?: number): string =>
  [...genres, wordCount ? `${wordCount.toLocaleString("en-GB")} words` : ""].filter(Boolean).join(" · ");

export const ManuscriptAlsoRows: React.FC<ManuscriptAlsoRowsProps> = ({
  manuscripts, queries, genresOf, statusOf, onOpen, onAdd,
}) => (
  <section className="mar">
    <div className="mar-head">
      <h2 className="mar-title">Also on your shelf</h2>
      {/* The count is of the ROWS, not the shelf — the hero is not "also". */}
      <span className="mar-count">
        {manuscripts.length} more
      </span>
    </div>

    {manuscripts.map((m) => {
      const figs = bookFigures(queries.filter((q) => q.manuscriptId === m.id));
      const sent = figs.find((f) => f.key === "sent")?.value ?? "0";
      return (
        <div className="mar-row" key={m.id}>
          {/* A book, not a rectangle: spine shadow left, page-edge radius right. */}
          <span className="mar-cover" aria-hidden="true" />
          <span className="mar-name">
            <span className="mar-rowtitle">{m.title}</span>
            <span className="mar-by">{byline(genresOf(m), m.wordCount)}</span>
          </span>
          <span className="mar-status">{statusOf(m)}</span>
          {/* ⚠️ ONE FIGURE, not four. The hero carries the record; these carry a glance. */}
          <span className="mar-fig">{sent} {sent === "1" ? "query" : "queries"}</span>
          <button type="button" className="mar-open" onClick={() => onOpen(m.id)}
                  aria-label={`Open ${m.title}`}>Open</button>
        </div>
      );
    })}

    {/* Dashed means provisional — the grammar the attachments add row already uses. */}
    <button type="button" className="mar-add" onClick={onAdd}>＋ Add a manuscript</button>
  </section>
);
