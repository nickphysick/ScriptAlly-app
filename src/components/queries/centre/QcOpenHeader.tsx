/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre — THE HEADER (header v3, 10 Oct; ref design-refs/shell/header-v3-qc.html). The shared panel
 * header (`shell/PanelHeader`), as a NUMBER page: "{N} queries sent", "for {manuscript}", two buttons, and the
 * courier on his white disc. v136's open, ruled-corner header is retired: no ruled lines, no margin line, no
 * rule, no stamp.
 *
 * ⚠️ {N} IS THE BANDS' OWN TOTAL (with you + with agents + closed), so the header and the two band labels
 *    cannot disagree (HV3 H3). A withdrawn or signed query sits in no court and is in neither.
 * ⚠️ THE SUBLINE NAMES A BOOK ONLY WHEN THE PAGE IS SCOPED TO ONE (`msTitle`): the Query Centre is not scoped by
 *    the sidebar's manuscript, and naming that book over every book's queries would be false.
 * ⚠️ PAGE-LOCAL MOUNT, SHARED PANEL: `/queries` is in the e2e censuses' OWN_HEADER_ROUTES. Desktop only — below
 *    768px the page renders the v126 page and its own header.
 */
import React from "react";
import { PanelHeader } from "../../shell/PanelHeader";
import { QC_COURIER_DISC } from "./qcArt";
import "./qcvOpenHeader.css";

/** "queries sent", or "query sent" for one */
export const sentWords = (n: number): string => (n === 1 ? "query sent" : "queries sent");
/** the h1's accessible name: "27 queries sent" */
export const sentTitle = (n: number): string => `${n} ${sentWords(n)}`;

export const QcOpenHeader: React.FC<{
  /** the bands' own total: with you + with agents + closed. null while the page settles. */
  sent: number | null;
  /** the manuscript the page is scoped to; null when it is scoped to more than one book */
  msTitle?: string | null;
  loading: boolean;
  onLog: () => void;
  onRecord: () => void;
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
}> = ({ sent, msTitle = null, loading, onLog, onRecord, logDisabled = false, logRef }) => {
  const pending = loading || sent === null;
  return (
    <PanelHeader
      kind="number" className="qcoh" attrs={{ "data-qcv": "open-header", "data-own-header": "" }}
      number={pending ? null : sent} words={sentWords(pending ? 2 : (sent as number))} loading={pending}
      sub={msTitle ? <>for <em>{msTitle}</em></> : undefined}
      primary={{ label: "+ Log a query", onClick: onLog, disabled: logDisabled, btnRef: logRef, attrs: { "data-qcv": "oh-log" } }}
      secondary={{ label: "Record a response", onClick: onRecord, attrs: { "data-qcv": "oh-record" } }}
      /* the courier on his white disc (the file is the disc). Swappable by file (qcArt.ts). */
      art={<img data-qcv="oh-art" alt="" src={`${QC_COURIER_DISC.src}?v=${QC_COURIER_DISC.version}`} width={QC_COURIER_DISC.width} height={QC_COURIER_DISC.height} />}
    />
  );
};
