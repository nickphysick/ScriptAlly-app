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
 * v153.3 — the quiet-window setting has left the header for Settings → Preferences → Queries; the action row is the
 * two buttons and nothing else.
 */
import React from "react";
import type { CountLine1512 } from "./QcPage151";
import { FIRST_TITLE_155 } from "../../../lib/qc155";
import "./qcv1531.css";
import "./qcv1534.css";
import { OpenHeader } from "../../shell/OpenHeader";

export const ARMCHAIR_HAWK = "/images/qc/qc-armchair-hawk.png?v=1";

/** "26 queries sent", "1 query sent" */
export const sentTitle = (n: number): string => `${n} ${n === 1 ? "query" : "queries"} sent`;

/* Your notes v1: the frame is the shared `shell/OpenHeader`; openHeaderShared.test.tsx holds this markup byte-identical. */
export const QcHeader1531: React.FC<{
  loading: boolean; onLog: () => void; onRecord: () => void; logDisabled?: boolean; logRef?: React.Ref<HTMLButtonElement>;
  counts?: CountLine1512 | null;
  /** the stage ring card (built by the page that owns the rail's filters) */
  ring?: React.ReactNode;
}> = ({ loading, onLog, onRecord, logDisabled = false, logRef, counts = null, ring = null }) => (
  <OpenHeader
    attrs={{ "data-qc151": "header", "data-qc1531": "header", "data-qcv": "open-header", "data-own-header": "" }}
    art={<img src={ARMCHAIR_HAWK} alt="" width={190} />}
    /* v155 §2 — day one: "No queries yet" in place of "0 queries sent", in the same box */
    title={counts ? (counts.sent === 0 ? FIRST_TITLE_155 : sentTitle(counts.sent)) : " "}
    titleAttrs={{ "data-qc151": "title" }}
    forLine={counts?.ms ? { lead: "for", text: counts.ms, attrs: { "data-qc1531": "for" } } : null}
    actions={<>
      <button type="button" ref={logRef} className="qc1531-b qc1531-b--n" data-qc151="log" data-qcv="oh-log" disabled={loading || logDisabled} onClick={onLog}>+ Log a query</button>
      <button type="button" className="qc1531-b qc1531-b--g" data-qc151="record" data-qcv="oh-record" disabled={loading} onClick={onRecord}>Record a response</button>
    </>}
    ring={ring}
  />
);
