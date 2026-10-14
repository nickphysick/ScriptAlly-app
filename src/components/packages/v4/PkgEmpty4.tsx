/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v4 Part F — THE EMPTY PAGE: with no packages for the manuscript (live or retired), no header
 * card, filters or sheets. A navy panel with the Archivist, "How it works" with one example package, and "Ways to
 * get started".
 *
 * ⚠️ PAGE-LOCAL, from the Contact list v17 empty page's values (`ContactEmptyPage` and the Query Centre's
 *    `QcEmpty138` are each page-local). Lift candidates: the navy panel, the section head, the ways cards.
 * ⚠️ THE EXAMPLE IS FIXED SAMPLE CONTENT: drawn here, never written, never counted, and never a package. It reads
 *    no store, so nothing about it can reach a derivation.
 */
import React from "react";
import { ICON, SplitKey } from "./parts";

export const PACKAGES_ARCHIVIST = {
  src: "/images/packages/packages-header-archivist.png", version: "6850f5c9", width: 788, height: 980,
  alt: "The Archivist carrying a tall stack of archive boxes",
} as const;

const POINTS: { icon: React.ReactNode; h: string; p: string }[] = [
  { icon: ICON.letter, h: "Keep what you send", p: "Paste in each query letter and synopsis once, so you always know exactly what an agent read." },
  { icon: ICON.parcel, h: "Send it in one go", p: "Pick a package when you log a query, and the letter, synopsis and version are all recorded with it." },
  { icon: ICON.bars, h: "See what gets replies", p: "Every reply counts towards the package and each part in it, so you can see which letter or opening agents ask for more of." },
];

export const PkgEmpty4: React.FC<{
  msTitle: string | null;
  /** the newest query letter on file, when there is one */
  newestLetter: { id: string; name: string } | null;
  onBuild: (letterId?: string) => void;
  onAdd: (kind: "letter" | "synopsis") => void;
}> = ({ msTitle, newestLetter, onBuild, onAdd }) => (
  <div className="pk4-empty" data-pk4="empty">
    <section className="pk4-np" data-pk4="empty-panel" data-own-header="">
      <div className="pk4-npt">
        <span className="pk4-npey">— SUBMISSION PACKAGES —</span>
        <h1 className="pk4-nph1" data-page-title="" data-pk4="empty-title"><span>Every package,<br />ready to send</span></h1>
        <p className="pk4-npl">
          Keep the letters, synopses and versions you send for <b className="pk4-npms">{msTitle || "your book"}</b>. Put them together once, log them with every query, and see which ones get agents asking for more.
        </p>
        <div className="pk4-npacts">
          <button type="button" className="pk4-npb1" data-pk4="empty-build" onClick={() => onBuild()}>+ Build your first package</button>
          <button type="button" className="pk4-npb2" data-pk4="empty-add" onClick={() => onAdd("letter")}>Add a material</button>
        </div>
      </div>
      <img className="pk4-npart" data-pk4="empty-art" src={`${PACKAGES_ARCHIVIST.src}?v=${PACKAGES_ARCHIVIST.version}`}
        width={PACKAGES_ARCHIVIST.width} height={PACKAGES_ARCHIVIST.height} alt={PACKAGES_ARCHIVIST.alt} />
    </section>

    <div className="pk4-esh"><h2>How it works</h2><span>One package, from letter to request</span></div>
    <div className="pk4-ex" data-pk4="example">
      <div className="pk4-ex-top"><b>Standard UK</b><i>An example package</i></div>
      <div className="pk4-chain">
        <div className="pk4-mt"><span className="pk4-ti">{ICON.letter}</span><span className="pk4-mtt"><span className="pk4-mono">Query letter</span><strong>Hook-first</strong></span></div>
        <div className="pk4-mt"><span className="pk4-ti">{ICON.synopsis}</span><span className="pk4-mtt"><span className="pk4-mono">Synopsis</span><strong>One-page</strong></span></div>
        <div className="pk4-mt"><span className="pk4-ti">{ICON.version}</span><span className="pk4-mtt"><span className="pk4-mono">Version</span><strong>Prologue first</strong></span></div>
        <div className="pk4-arrow" aria-hidden="true">→</div>
        <div className="pk4-pkx"><span className="pk4-mono">Logged with</span><b>14 queries</b></div>
        <div className="pk4-arrow" aria-hidden="true">→</div>
        <div className="pk4-res">
          <span className="pk4-mono">What came back</span>
          <span className="pk4-cb" role="img" aria-label="3 requests, 5 other replies, 4 still waiting, 2 no reply">
            <u className="pk4-rq" style={{ flex: "3 1 0" }} /><u className="pk4-rp" style={{ flex: "5 1 0" }} /><u className="pk4-wt" style={{ flex: "4 1 0" }} /><u className="pk4-nr" style={{ flex: "2 1 0" }} />
          </span>
          <p><b>3</b> requests, <b>5</b> other replies, <b>4</b> waiting</p>
        </div>
      </div>
      <div className="pk4-exkey"><SplitKey long /></div>
    </div>
    <div className="pk4-pts">
      {POINTS.map((x) => (
        <div key={x.h} className="pk4-pt"><span className="pk4-pti">{x.icon}</span><h3>{x.h}</h3><p>{x.p}</p></div>
      ))}
    </div>

    <div className="pk4-esh"><h2>Ways to get started</h2><span>Pick whichever suits you</span></div>
    <div className="pk4-ways" data-pk4="ways">
      {newestLetter ? (
        <div className="pk4-way pk4-way--n" data-pk4="way-1" data-ready="">
          <span className="pk4-wayq">Quickest</span>
          <h3>Your letter's ready</h3>
          <p><b>{newestLetter.name}</b> is saved. Build a package around it.</p>
          <button type="button" className="pk4-wayb" data-pk4="way-1-btn" onClick={() => onBuild(newestLetter.id)}>+ Build a package</button>
        </div>
      ) : (
        <div className="pk4-way pk4-way--n" data-pk4="way-1">
          <span className="pk4-wayq">Quickest</span>
          <h3>Start with your letter</h3>
          <p>Paste in the query letter you're sending now. You can build a package around it straight after.</p>
          <button type="button" className="pk4-wayb" data-pk4="way-1-btn" onClick={() => onAdd("letter")}>Add your query letter</button>
          <small>Synopses and versions can follow later</small>
        </div>
      )}
      <div className="pk4-way" data-pk4="way-2">
        <h3>Add a synopsis</h3>
        <p>Keep one or more synopses, such as a one-page and a two-page, and choose between them per package.</p>
        <button type="button" className="pk4-wayb" onClick={() => onAdd("synopsis")}>Add a synopsis</button>
      </div>
      <div className="pk4-way" data-pk4="way-3">
        <h3>Build a package</h3>
        <p>Already have your letter and synopsis? Put them together with a version of the book and name it.</p>
        <button type="button" className="pk4-wayb" onClick={() => onBuild()}>+ New package</button>
      </div>
    </div>
  </div>
);
