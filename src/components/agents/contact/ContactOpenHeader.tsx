/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15 §2, v15.3 §2–3 — THE OPEN HEADER: no card, no band, no container. A two-column grid on the page —
 * the text block (the HERO NUMBER: the count large with "agents on file" beside it; one line under it; a row of agent
 * FACES coloured by query status, with a key; two buttons) and the flying hawk to its right, the two centred against
 * each other — closed by a hairline.
 *
 * ⚠️ THE FACES ARE `aria-hidden`; THE KEY IS THE TEXT. A disc is a pointer shortcut into that agent's card and carries
 * a tooltip; the key's three counts (every agent, never the discs shown) are what a reader is told.
 * ⚠️ THE ROW NEVER PUSHES INTO THE DRAWING: it is measured against the room the text block has (the header, less the
 * drawing and the column gap) and discs are dropped FROM THE END until it fits — never the key. The reading is of the
 * header's own width, which dropping a disc cannot move, so the answer cannot feed back into the question.
 *
 * ⚠️ PAGE-LOCAL, NOT `PageHeader` (ruling 8): the shared header has no hero-number typewriter title, no form without an
 * eyebrow, and no drawing in the flow beside the text. `/agents` therefore sits in the e2e censuses' own-header
 * list (`tests/e2e/plateRoutes.ts` OWN_HEADER_ROUTES), not the band or compact lists.
 *
 * ⚠️ THE TITLE KEEPS `data-page-title`, the hook the shared header gives every page title, so anything that asks
 * "has the page's title scrolled past?" finds this one too.
 *
 * ⚠️ THE ART IS SWAPPABLE BY FILE: no version query and no size the layout depends on — the sheet sets the width,
 * and the attributes only carry the drawing's ratio (a 2× export keeps it).
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { FACE_ORDER, FACE_WORDS, type FacesModel } from "../../../lib/contactFaces";
import "../../shell/headerPanel.css";
import "./contactV15.css";

/** the header's drawing: a flying hawk carrying an agent card, facing left, transparent */
export const CONTACT_HEADER_HAWK = { src: "/images/contact/contact-header-hawk.png", width: 576, height: 383 };

export const CONTACT_HEADER_SUB = "Your agent data underpins everything. Collate and manage it here.";

/** the banner above the list (v15.2 §4) — exact */
export const CONTACT_BANNER_LINE = "Your agent will be the one who champions your words.";

/** "{N} agents on file" — one agent is "1 agent on file" */
export const onFileTitle = (n: number): string => `${n} agent${n === 1 ? "" : "s"} on file`;

export const ContactOpenHeader: React.FC<{
  /** the living count; null while the page settles (the title holds its shape, painted over) */
  count: number | null;
  addRef?: React.Ref<HTMLButtonElement>;
  onAdd: () => void;
  /** scrolls to the list and puts the caret in its Find field (v15.2 §5) */
  onViewAll: () => void;
  /** the faces and their key (v15.3 §3); null while the page settles */
  faces?: FacesModel | null;
  /** a disc opens that agent's card */
  onOpenAgent?: (id: string) => void;
}> = ({ count, addRef, onAdd, onViewAll, faces = null, onOpenAgent }) => {
  const loading = count === null;
  const n = count ?? 0;
  const all = faces?.faces ?? [];
  /* discs dropped from the end so the row fits beside the drawing; reset whenever the header's width or the faces change */
  const hdRef = useRef<HTMLElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [drop, setDrop] = useState(0);
  const widthRef = useRef(0);
  useLayoutEffect(() => { setDrop(0); }, [faces]);
  useLayoutEffect(() => {
    const hd = hdRef.current;
    if (!hd || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const w = hd.clientWidth;
      if (Math.abs(w - widthRef.current) > 0.5) { widthRef.current = w; setDrop(0); }
    });
    widthRef.current = hd.clientWidth;
    ro.observe(hd);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const hd = hdRef.current, row = rowRef.current;
    if (!hd || !row || drop >= all.length) return;
    const img = hd.querySelector<HTMLElement>(".cl15-art img");
    const cs = getComputedStyle(hd);
    /* single column (the drawing stacked or absent) leaves the whole width */
    const beside = img && img.offsetWidth > 0 && img.getBoundingClientRect().top < row.getBoundingClientRect().bottom;
    const room = hd.clientWidth - (beside ? img!.offsetWidth + (parseFloat(cs.columnGap) || 0) : 0);
    if (room > 0 && row.scrollWidth > room + 0.5) setDrop((d) => d + 1);
  });
  const shown = all.slice(0, Math.max(0, all.length - drop));
  const more = (faces?.total ?? 0) - shown.length;
  return (
    <header ref={hdRef} className="cl15-hd hpanel hpanel--hero" data-cl15="header" data-own-header="" data-hpanel="" data-loading={loading ? "" : undefined}>
      <div className="cl15-txt" data-cl15="header-text">
        {/* the title's row: the h1, then the stamp — real text, OUTSIDE the h1, hidden at 0 and while loading */}
        <div className="cl15-trow">
        <h1 className="cl15-title" data-probe="title" data-page-title="" aria-label={onFileTitle(n)}>
          <span className="cl15-hn" data-cl15="hero-n">{loading ? "00" : n}</span>
          {/* a real space, so the title still READS "41 agents on file" as text (a flex row draws none; the gap is the sheet's) */}
          {" "}
          <span className="cl15-ht" data-cl15="hero-t">{n === 1 ? "agent on file" : "agents on file"}</span>
        </h1>
        {!loading && !!faces && faces.counts.none > 0 && <span className="hpanel-stamp" data-cl15="stamp">{faces.counts.none} not queried</span>}
        </div>
        <div ref={rowRef} className="cl15-faces" data-cl15="faces">
          {loading || !faces ? (
            <span className="cl15-fdiscs" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => <span key={i} className="cl15-face is-ph" style={{ zIndex: 8 - i }} />)}
            </span>
          ) : (
            <>
              {shown.length > 0 && (
                <span className="cl15-fdiscs" aria-hidden="true">
                  {shown.map((f, i) => (
                    <span key={f.id} className={`cl15-face is-${f.state}`} data-cl15="face" data-state={f.state} title={f.tip}
                      style={{ zIndex: shown.length - i }} onClick={onOpenAgent ? () => onOpenAgent(f.id) : undefined}>{f.initials}</span>
                  ))}
                </span>
              )}
              {more > 0 && shown.length > 0 && <span className="cl15-fmore" data-cl15="faces-more">+{more} more</span>}
              {/* the key is no longer drawn (header panel v2); its three counts stay, as one sentence a screen reader reads */}
              <span className="sr-only" data-cl15="faces-said">
                {FACE_ORDER.filter((st) => faces.counts[st] > 0).map((st) => `${faces.counts[st]} ${FACE_WORDS[st].key}`).join(", ")}.
              </span>
            </>
          )}
        </div>
        <div className="cl15-acts">
          <button ref={addRef} type="button" className="cl15-b1 hpanel-b1" data-cl15="add" onClick={onAdd} disabled={loading}>+ Add an agent</button>
          <button type="button" className="cl15-b2 hpanel-b2" data-cl15="view-all" onClick={onViewAll} disabled={loading}>View all agents</button>
        </div>
      </div>
      <div className="cl15-art" data-cl15="header-art" aria-hidden="true">
        <img src={CONTACT_HEADER_HAWK.src} width={CONTACT_HEADER_HAWK.width} height={CONTACT_HEADER_HAWK.height} alt="" />
      </div>
    </header>
  );
};
