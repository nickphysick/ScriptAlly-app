/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v12 — the comps rail: blush tray with the Archivist's cut-out art seated on its
 * right and bottom edges, the comps list, the Scout "Coming soon" card (every plan — D5), and the
 * footer. Adding a comp navigates to the Comparable titles page, which owns the form.
 */
import React from "react";
import type { CompTitle } from "../../../types";
import trayArt from "../../../assets/manuscripts/comps-tray-archivist.png";

export const CompsRail: React.FC<{
  comps: CompTitle[];
  tally: { total: number; inLetter: number };
  onAddComp: () => void;
  onOpenComps: () => void;
  onAddNote: () => void;
}> = ({ comps, tally, onAddComp, onOpenComps, onAddNote }) => (
  <aside className="msv12-rail" data-msv12="rail">
    <div className="msv12-tray" data-msv12="tray">
      <div className="msv12-traytext" data-msv12="tray-text">
        <div className="msv12-lbl">Comparable titles</div>
        <h3 className="msv12-trayh">Your comps</h3>
        {/* ⚠️ NO LETTER VERSION IN THE SENTENCE. The mock writes "named in query letter v3";
            `inQuery` is a bare flag on the comp, bound to no letter — so the sentence states what
            the record holds and nothing more (run report, deviation list). */}
        {tally.total > 0 ? (
          <div className="msv12-traysub">
            {tally.inLetter} of {tally.total} {tally.inLetter === 1 ? "is" : "are"} named in your query letter.
          </div>
        ) : (
          <div className="msv12-traysub">Books like yours, and why.</div>
        )}
        {tally.total > 0 ? (
          <div className="msv12-counts">
            <div className="msv12-cnt"><b>{tally.total}</b><span>Yours</span></div>
            <div className="msv12-cnt"><b>{tally.inLetter}</b><span>In letter</span></div>
          </div>
        ) : null}
      </div>
      <img
        className="msv12-trayart" data-msv12="tray-art" src={trayArt}
        alt="" aria-hidden="true"
      />
    </div>
    <div className="msv12-railbody">
      <div className="msv12-rh">Yours <span className="msv12-pill">{comps.length}</span></div>
      {comps.map((c, i) => (
        <div className="msv12-comp" data-msv12="comp" key={`${c.title}-${i}`}>
          <div className="msv12-spine" aria-hidden="true">
            <span className="msv12-si">{(c.title || "?").trim()[0]?.toUpperCase() ?? "?"}</span>
            {c.year ? <span className="msv12-sy">{c.year}</span> : null}
          </div>
          <div>
            <div className="msv12-ct2">{c.title}</div>
            <div className="msv12-ca">{[c.author, [c.publisher, c.year].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</div>
            {c.note ? (
              <div className="msv12-why">{c.note}</div>
            ) : (
              <div className="msv12-why">Not written yet.</div>
            )}
            <div className="msv12-inl">
              {c.inQuery ? <span className="msv12-tag">In query letter</span> : null}
              {!c.note ? (
                <button type="button" className="msv12-mini" onClick={onAddNote}>Add a note</button>
              ) : null}
            </div>
          </div>
        </div>
      ))}
      <div className="msv12-sooncard" data-msv12="scout">
        <div className="msv12-rh2">Scout<span className="msv12-soon msv12-soon--teal">Coming soon</span></div>
        <p>Suggests recently published comps from your genre and word count, for you to add or dismiss.</p>
      </div>
    </div>
    <div className="msv12-railfoot" data-msv12="rail-foot">
      <button type="button" className="msv12-btn" onClick={onAddComp}>+ Add a comp</button>
      <button type="button" className="msv12-link" onClick={onOpenComps}>Open Comparable titles</button>
    </div>
  </aside>
);
