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
import React from "react";
import type { LivingHeader } from "../../shell/PageHeader";
import { QC_PLATE_FIGURE } from "./qcArt";
import "./qcvOpenHeader.css";

export const QC_HEADER_SUB = "Send, track, and chase them from this page.";
/** what the title holds while the count settles: its own shape, painted over */
const PENDING_TITLE = "00 queries out";

export const QcOpenHeader: React.FC<{
  /** the living title's source; its headline is "{N} queries out" (lib/livingHeaders.qcHeaderCopy) */
  living?: LivingHeader;
  loading: boolean;
  onLog: () => void;
  onRecord: () => void;
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
}> = ({ living, loading, onLog, onRecord, logDisabled = false, logRef }) => {
  const pending = loading || !living || living.count === null;
  const title = pending ? PENDING_TITLE : living!.copy(living!.count as number).headline;
  return (
    <header className="qcoh" data-qcv="open-header" data-own-header="" data-loading={pending ? "" : undefined} aria-busy={pending || undefined}>
      <div className="qcoh-txt" data-qcv="oh-text">
        <h1 className="qcoh-title" data-probe="title" data-page-title="">{title}</h1>
        <p className="qcoh-sub" data-qcv="oh-sub">{QC_HEADER_SUB}</p>
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
