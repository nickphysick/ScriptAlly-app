/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Smart Import hand-off for photos (smart-import-photos-v1; ref design-refs/smart-import-photos-
 * v1.html #photos). It takes ConfirmScreen's place when the input is photos: the same heading and
 * subline, the same card and the same "What happens next", with the pages in place of the file.
 *
 * NOTHING IS SENT AND NOTHING IS SPENT UNTIL "Read my photos" IS PRESSED. Each page is the writer's
 * own image, prepared in the browser (photoPrepare.ts); the blur check runs there too and costs
 * nothing. A blurry page is named, never blocked.
 *
 * Pages are read in the order shown. A page is moved by dragging it onto another, or with Alt and
 * an arrow key while it has focus; the numbers follow every change.
 */
import React, { useEffect, useRef, useState } from "react";
import { StepColumn, OpenTitle, StepCard, QLabel, BackLink, StepFoot } from "./setupParts";
import { CONFIRM_TITLE, CONFIRM_SUB, HOW_EYEBROW } from "./ConfirmScreen";
import { PHOTOS_WORDS as W, PHOTO_HOW_STEPS, MAX_PAGES, photosLede, firstUnresolvedBlur } from "../../lib/photoImport";
import "./v9/onbV9.css";
import "./importFlow.css";
import "./photoImport.css";

export interface PhotoThumb {
  id: string;
  /** An object URL of the prepared page; null while it is being prepared or when it cannot be opened. */
  url: string | null;
  status: "preparing" | "ready" | "failed";
  blurry: boolean;
  kept: boolean;
}

export const PhotosScreen: React.FC<{
  pages: PhotoThumb[];
  onAdd: () => void;
  onReplace: (index: number) => void;
  onRemove: (index: number) => void;
  onKeep: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onBack: () => void;
  onRead: () => void;
  /** A plain sentence when the photos cannot be sent (too large together, even re-encoded). */
  message?: string | null;
  /** True while "Read my photos" is fitting the pages under the cap. */
  busy?: boolean;
}> = ({ pages, onAdd, onReplace, onRemove, onKeep, onMove, onBack, onRead, message, busy }) => {
  const ready = pages.filter((p) => p.status === "ready").length;
  const preparing = pages.some((p) => p.status === "preparing");
  const blurAt = firstUnresolvedBlur(pages);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  /* After a keyboard move the moved page keeps focus, wherever it now sits. */
  const focusId = useRef<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = focusId.current;
    if (!id) return;
    focusId.current = null;
    gridRef.current?.querySelector<HTMLElement>(`[data-photo-id="${id}"]`)?.focus();
  });
  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    const to = e.key === "ArrowLeft" ? i - 1 : i + 1;
    if (to < 0 || to >= pages.length) return;
    e.preventDefault();
    focusId.current = pages[i].id;
    onMove(i, to);
  };

  return (
    <StepColumn wide screen="photos">
      <OpenTitle title={CONFIRM_TITLE} sub={CONFIRM_SUB} />
      <div className="o9-conf">
        <StepCard className="o9-pop o9-d2">
          <QLabel>{W.label}</QLabel>
          <div className="o9-photos" data-sf="photos" ref={gridRef}>
            {pages.map((p, i) => {
              const hard = p.status === "ready" && p.blurry && !p.kept;
              return (
                <figure
                  key={p.id} className={`o9-pthumb${dragFrom === i ? " is-dragging" : ""}`} data-sf="photo" data-page={i + 1} data-status={p.status}
                  draggable={p.status !== "preparing"}
                  onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }}
                  onDragOver={(e) => { if (dragFrom !== null) e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); if (dragFrom !== null && dragFrom !== i) onMove(dragFrom, i); setDragFrom(null); }}
                  onDragEnd={() => setDragFrom(null)}
                >
                  <div
                    className="o9-pimg" tabIndex={0} role="img" data-photo-id={p.id}
                    aria-label={`${W.moveHint(i + 1, pages.length)}${hard ? ` ${W.hard}.` : ""}`}
                    onKeyDown={(e) => onKey(i, e)}
                  >
                    {p.status === "ready" && p.url && <img src={p.url} alt="" draggable={false} />}
                    {p.status === "preparing" && <span className="o9-pwait">{W.preparing}</span>}
                    {p.status === "failed" && <span className="o9-pwait o9-pwait--bad" data-sf="photo-failed">{W.cantOpen}</span>}
                    {hard && <span className="o9-pflag" data-sf="photo-hard">{W.hard}</span>}
                  </div>
                  <figcaption>
                    <b>{W.page(i + 1)}</b>
                    <span>
                      {p.status !== "failed" && <button type="button" className="sf-link sf-link--quiet" data-act="replace" onClick={() => onReplace(i)}>{W.replace}</button>}
                      <button type="button" className="sf-link sf-link--quiet" data-act="remove" onClick={() => onRemove(i)}>{W.remove}</button>
                    </span>
                  </figcaption>
                </figure>
              );
            })}
            <button type="button" className="o9-addpg" data-act="add" onClick={onAdd} disabled={pages.length >= MAX_PAGES}>
              <span aria-hidden="true">+</span>{W.add}
            </button>
          </div>
          {blurAt >= 0 && (
            <div className="o9-pnote" data-sf="photo-note">
              <span><b>{W.blurLead(blurAt + 1)}</b> {W.blurRest}</span>
              <button type="button" className="sf-link" data-act="replace-blurry" onClick={() => onReplace(blurAt)}>{W.replacePage(blurAt + 1)}</button>
              <button type="button" className="sf-link" data-act="keep" onClick={() => onKeep(blurAt)}>{W.keep}</button>
            </div>
          )}
          <p className="o9-small o9-ptip">{W.tip}</p>
          {message && <p className="o9-pnote" role="alert" data-sf="photo-message">{message}</p>}
          <p className="sf-lede o9-plede" data-sf="photos-lede">{photosLede(ready)}</p>
          <StepFoot left={<BackLink onClick={onBack} />}>
            <button type="button" className="sf-btn" data-act="read" onClick={onRead} disabled={ready === 0 || preparing || !!busy}>{W.primary}</button>
          </StepFoot>
        </StepCard>
        <aside className="o9-how" data-o9="how" aria-labelledby="o9-how-h">
          <p className="o9-howeye o9-rise" style={{ animationDelay: ".45s" }} id="o9-how-h" data-o9="how-eyebrow">{HOW_EYEBROW}</p>
          <ol className="o9-howlist">
            {PHOTO_HOW_STEPS.map((st, i) => (
              <li key={st.key} className="o9-rise" style={{ animationDelay: `${0.55 + i * 0.15}s` }}>
                <span className="o9-slot o9-howslot" data-o9="slot" data-slot={`handoff-${st.key}`} aria-hidden="true" />
                <span className="o9-howtx"><b>{st.title}</b><span data-o9="how-line">{st.line}</span></span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </StepColumn>
  );
};
