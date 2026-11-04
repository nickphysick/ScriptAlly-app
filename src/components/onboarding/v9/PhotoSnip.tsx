/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The writer's own line above a review card's question (smart-import-photos-v1; ref #agents,
 * #queries): the line as read, quoted in the mono pill, and under it "Your page N." with "See the
 * whole page", which opens that page full size.
 *
 * ⚠️ THE CUT-OUT FROM THE PHOTO IS OFF (Nick, 4 Nov). The brief drew the line cut from the photo at
 * the model's `src.y` band, and that is built (PhotoSnip, below). The evaluation found the bands
 * unreliable — 18.1% contained their line (reports/smart-import-photos-v1/REPORT.md): the model spaces
 * them evenly instead of finding each line, so a cut-out shows a neighbour. The page number IS
 * reliable (869 of 870), so the page link stays. Turn CUT_FROM_BANDS on once the bands can be trusted.
 */
import React, { useEffect, useRef } from "react";
import type { PageSource } from "../../../types/smartImport";
import type { ReviewPhoto } from "../../../lib/photoImport";
import { snipRect, SNIP_MAX_WIDTH } from "../../../lib/photoImport";

export const SNIP_WORDS = {
  yourPage: (n: number) => `Your page ${n}.`,
  seePage: "See the whole page",
  close: "Close",
  pageTitle: (n: number) => `Your page ${n}`,
} as const;

/** The cut-out from the photo at the model's band. Off: see the note above. */
export const CUT_FROM_BANDS = false;

/** "Your page N." and "See the whole page". */
const PageCaption: React.FC<{ photo: ReviewPhoto; onSeePage: () => void }> = ({ photo, onSeePage }) => (
  <figcaption>
    {SNIP_WORDS.yourPage(photo.shown)}
    <button type="button" className="sf-link sf-link--quiet" data-act="see-page" onClick={onSeePage}>{SNIP_WORDS.seePage}</button>
  </figcaption>
);

/** The writer's line quoted (with its page, when known), or nothing. `photos` is the pages in the
 *  order they were sent, so `src.p` names one. */
export const PhotoLead: React.FC<{ src?: PageSource; lineRaw?: string; photos?: readonly ReviewPhoto[]; onSeePage: (photo: ReviewPhoto) => void }> = ({ src, lineRaw, photos, onSeePage }) => {
  const photo = src && photos ? photos[src.p - 1] : undefined;
  if (CUT_FROM_BANDS && src && photo) return <PhotoSnip src={src} photo={photo} onSeePage={() => onSeePage(photo)} />;
  if (!lineRaw) return null;
  return (
    <figure className="o9-snip o9-snip--quote" data-im="deck-line" {...(photo ? { "data-page": photo.shown } : {})}>
      <p className="o9-snipline"><span className="o9-raw">“{lineRaw}”</span></p>
      {photo && <PageCaption photo={photo} onSeePage={() => onSeePage(photo)} />}
    </figure>
  );
};

const PhotoSnip: React.FC<{ src: PageSource; photo: ReviewPhoto; onSeePage: () => void }> = ({ src, photo, onSeePage }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const r = snipRect(src, photo.width, photo.height);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (!live) return;
      const ctx = c.getContext("2d");
      ctx?.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, r.dw, r.dh);
    };
    img.src = photo.url;
    return () => { live = false; };
  }, [photo.url, r.sx, r.sy, r.sw, r.sh, r.dw, r.dh]);
  return (
    <figure className="o9-snip" data-im="deck-snip" data-page={photo.shown}>
      <canvas ref={ref} width={r.dw} height={r.dh} role="img" aria-label={`The line as written on your page ${photo.shown}`} style={{ width: `min(100%, ${Math.min(r.dw, SNIP_MAX_WIDTH)}px)` }} />
      <PageCaption photo={photo} onSeePage={onSeePage} />
    </figure>
  );
};

/** "See the whole page": the import's own confirm card (im-ask) holding the page, full size. */
export const PageView: React.FC<{ photo: ReviewPhoto; onClose: () => void }> = ({ photo, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return (
    <div className="im-askdim" data-im="page-dim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="im-ask o9-pageview" role="dialog" aria-modal="true" aria-labelledby="o9-page-h" data-im="page-view">
        <h2 className="im-askh" id="o9-page-h">{SNIP_WORDS.pageTitle(photo.shown)}</h2>
        <img src={photo.url} alt={`Your page ${photo.shown}, as photographed`} />
        <div className="im-askfoot">
          <button type="button" className="sf-btn sf-btn--sm" ref={closeRef} onClick={onClose} data-act="close-page">{SNIP_WORDS.close}</button>
        </div>
      </div>
    </div>
  );
};
