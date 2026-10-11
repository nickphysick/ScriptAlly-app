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

/** v137 — the header's fixed title, broken after the comma, and its accessible name */
export const QC_HEADER_TITLE = "Every query, in one place";
/** the subline: it names the manuscript when the page is scoped to one book */
export const qcHeaderSub = (msTitle: string | null): string =>
  msTitle ? `Send, track and chase your queries for ${msTitle}.` : "Send, track and chase your queries.";

/**
 * Query Centre v137 §A — THE ANALYTICS PANEL WITH A TITLE (the shared panel header's title kind). The big number
 * is gone from here: the first cell of "At a glance" carries it. No stamp, no faces row, no ruled corner.
 */
export const QcOpenHeader: React.FC<{
  /** the manuscript the page is scoped to; null when it is scoped to more than one book */
  msTitle?: string | null;
  loading: boolean;
  onLog: () => void;
  onRecord: () => void;
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
}> = ({ msTitle = null, loading, onLog, onRecord, logDisabled = false, logRef }) => (
  <PanelHeader
    kind="title" className="qcoh qcoh--137" attrs={{ "data-qcv": "open-header", "data-own-header": "" }}
    title={<span aria-label={QC_HEADER_TITLE}><span aria-hidden="true">Every query,<br />in one place</span></span>}
    sub={<span data-qcv="oh-sub">Send, track and chase your queries{msTitle ? <> for <i className="qcoh-ms" data-qcv="oh-ms">{msTitle}</i></> : null}.</span>}
    loading={loading}
    primary={{ label: "+ Log a query", onClick: onLog, disabled: logDisabled, btnRef: logRef, attrs: { "data-qcv": "oh-log" } }}
    secondary={{ label: "Record a response", onClick: onRecord, attrs: { "data-qcv": "oh-record" } }}
    /* the courier on his white disc (the file is the disc). Swappable by file (qcArt.ts). */
    art={<img data-qcv="oh-art" alt="" src={`${QC_COURIER_DISC.src}?v=${QC_COURIER_DISC.version}`} width={QC_COURIER_DISC.width} height={QC_COURIER_DISC.height} />}
  />
);
