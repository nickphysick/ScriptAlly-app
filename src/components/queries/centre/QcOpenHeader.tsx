/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v133 — THE OPEN HEADER (design-refs/query-centre/query-centre-v133.html). No card, no
 * band, no disc: the living "{N} queries out" as a 72px typewriter title, one fixed line, two buttons,
 * and the courier at the column's right, hanging over the hairline that closes the header (the
 * Contact list v15.1 header's design, by Nick's ruling of 9 Oct, which supersedes the mock's placement).
 *
 * ⚠️ IT IS THE CONTACT LIST v15 HEADER'S SHAPE, BUILT BESIDE IT. `src/components/agents/**` is another
 * session's, so the values are restated here (qcvOpenHeader.css) rather than imported. The two are a
 * lift candidate into one `shell/` component, with v132's duplicates.
 *
 * ⚠️ PAGE-LOCAL, NOT `PageHeader`: `/queries` sits in the e2e censuses' OWN_HEADER_ROUTES
 * (tests/e2e/plateRoutes.ts). The phone (under 768px) keeps the v126 page and its `PageHeader` band.
 *
 * ⚠️ THE TITLE KEEPS `data-page-title`, the hook the shared header gives every page title.
 */
import React, { useRef } from "react";
import type { LivingHeader } from "../../shell/PageHeader";
import type { Faces } from "../../../lib/qcFaces";
import { HeaderSheet } from "../../shell/HeaderSheet";
import { QC_PLATE_FIGURE } from "./qcArt";
import { useTip } from "./QcList132";
import "./qcvOpenHeader.css";

export const QC_HEADER_SUB = "Send, track, and chase them from this page.";
/** what the hero number holds while the count settles: its own shape, painted over */
const PENDING_NUMBER = "00";
/** "queries out", or "query out" for one */
export const heroWords = (n: number): string => (n === 1 ? "query out" : "queries out");

/**
 * v134 §1 — THE FACES: up to eight agent discs, coloured by court, then "+N more". No key: the desk
 * states the split. The discs are `aria-hidden` and the row carries one sentence for a screen reader;
 * each disc shows the list's own popup (the agent's name; the stage and the court) and opens its query.
 */
const FacesRow: React.FC<{ faces: Faces | null; onFace?: (id: string) => void }> = ({ faces, onFace }) => {
  const ref = useRef<HTMLDivElement>(null);
  const tip = useTip(ref);
  /* loading: the row holds its height with three painted-over discs */
  if (!faces) return <div className="qcoh-faces" data-qcv="oh-faces" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className="qcoh-fc qcoh-fc--sk" style={{ zIndex: 8 - i }} />)}</div>;
  if (!faces.faces.length) return <div className="qcoh-faces" data-qcv="oh-faces" data-n="0" role="img" aria-label={faces.sentence} />;
  return (
    <div ref={ref} className="qcoh-faces" data-qcv="oh-faces" data-n={faces.faces.length} role="group" aria-label={faces.sentence} {...tip.handlers}>
      {faces.faces.map((f, i) => (
        <button key={f.id} type="button" tabIndex={-1} aria-hidden="true" className={`qcoh-fc qcoh-fc--${f.court}`}
          data-qcv="oh-face" data-court={f.court} data-qid={f.id} data-tip={f.name} data-tl={f.line} style={{ zIndex: faces.faces.length - i }}
          onClick={() => onFace?.(f.id)}>{f.initials}</button>
      ))}
      {faces.more > 0 && <span className="qcoh-more" data-qcv="oh-more" aria-hidden="true">+{faces.more} more</span>}
      {tip.node}
    </div>
  );
};

export const QcOpenHeader: React.FC<{
  /** the living title's source: its count is the hero number (lib/livingHeaders, the manuscript scope's) */
  living?: LivingHeader;
  loading: boolean;
  onLog: () => void;
  onRecord: () => void;
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
  /** the faces under the subheader; null while the page settles */
  faces?: Faces | null;
  onFace?: (id: string) => void;
}> = ({ living, loading, onLog, onRecord, logDisabled = false, logRef, faces = null, onFace }) => {
  const pending = loading || !living || living.count === null;
  const n = pending ? 0 : (living!.count as number);
  return (
    <header className="qcoh hsheet-host" data-qcv="open-header" data-own-header="" data-loading={pending ? "" : undefined} aria-busy={pending || undefined}>
      <HeaderSheet />
      <div className="qcoh-txt" data-qcv="oh-text">
        {/* THE HERO NUMBER (v134): the count set large, its words beside it on one baseline. One h1, two spans. */}
        <h1 className="qcoh-title" data-probe="title" data-page-title="" aria-label={pending ? undefined : `${n} ${heroWords(n)}`}>
          <span className="qcoh-hn" data-qcv="oh-hn">{pending ? PENDING_NUMBER : n}</span>
          <span className="qcoh-ht" data-qcv="oh-ht">{heroWords(pending ? 2 : n)}</span>
        </h1>
        <p className="qcoh-sub" data-qcv="oh-sub">{QC_HEADER_SUB}</p>
        <FacesRow faces={pending ? null : faces} onFace={onFace} />
        <div className="qcoh-acts">
          <button ref={logRef} type="button" className="qcoh-b1" data-qcv="oh-log" onClick={onLog} disabled={logDisabled || pending}>+ Log a query</button>
          <button type="button" className="qcoh-b2" data-qcv="oh-record" onClick={onRecord} disabled={pending}>Record a response</button>
        </div>
      </div>
      <img className="qcoh-art" data-qcv="oh-art" aria-hidden="true" alt=""
        src={`${QC_PLATE_FIGURE.src}?v=${QC_PLATE_FIGURE.version}`} width={QC_PLATE_FIGURE.width} height={QC_PLATE_FIGURE.height} />
    </header>
  );
};
