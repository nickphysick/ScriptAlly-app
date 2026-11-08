/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153.1 (design-refs/query-centre-v153-1.html) — THE HEADER: straight on the page's doodle ground, no card
 * and no band. Three columns: the armchair hawk, the title block ("26 queries sent", the rule-flanked "for" line, the
 * buttons) and the stage ring card. It replaces v151.2's navy banner and v153's slim "This week" line.
 *
 * ⚠️ THE "for" LINE NAMES WHAT THE OLD COUNT LINE NAMED (`counts.ms`): the scoped manuscript, or the only one. With
 *    more than one manuscript and no scope the old line named none, so this one is left out rather than invented.
 * ⚠️ THE QUIET-WINDOW SETTING SURVIVES, after Record a response, as the same gear button it was in the banner.
 */
import React from "react";
import { QcQuietSetting } from "./QcQuietSetting";
import type { CountLine1512 } from "./QcPage151";
import "./qcv1531.css";

export const ARMCHAIR_HAWK = "/images/qc/qc-armchair-hawk.png?v=1";

/** "26 queries sent", "1 query sent" */
export const sentTitle = (n: number): string => `${n} ${n === 1 ? "query" : "queries"} sent`;

export const QcHeader1531: React.FC<{
  loading: boolean; onLog: () => void; onRecord: () => void; logDisabled?: boolean; logRef?: React.Ref<HTMLButtonElement>;
  counts?: CountLine1512 | null;
  quietWeeks?: number; onQuietWeeks?: (w: number) => void;
  /** the stage ring card (built by the page that owns the rail's filters) */
  ring?: React.ReactNode;
}> = ({ loading, onLog, onRecord, logDisabled = false, logRef, counts = null, quietWeeks, onQuietWeeks, ring = null }) => (
  <header className="qc1531-hd" data-qc151="header" data-qc1531="header" data-qcv="open-header" data-own-header="">
    <div className="qc1531-art" aria-hidden="true"><img src={ARMCHAIR_HAWK} alt="" width={190} /></div>
    <div className="qc1531-main">
      <h1 className="qc1531-t" data-page-title="true" data-qc151="title">{counts ? sentTitle(counts.sent) : " "}</h1>
      {counts?.ms ? (
        <p className="qc1531-for" data-qc1531="for"><i aria-hidden="true" /><span><em>for</em> {counts.ms}</span><i aria-hidden="true" /></p>
      ) : null}
      <div className="qc1531-acts">
        <button type="button" ref={logRef} className="qc1531-b qc1531-b--n" data-qc151="log" data-qcv="oh-log" disabled={loading || logDisabled} onClick={onLog}>+ Log a query</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-qc151="record" data-qcv="oh-record" disabled={loading} onClick={onRecord}>Record a response</button>
        {quietWeeks != null && onQuietWeeks ? <QcQuietSetting weeks={quietWeeks} onSet={onQuietWeeks} disabled={loading} /> : null}
      </div>
    </div>
    <div className="qc1531-rc">{ring}</div>
  </header>
);
