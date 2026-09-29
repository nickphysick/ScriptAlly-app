/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre with nothing in it (living headers §3; ref living-headers-v2.html, State Empty).
 *
 * ⚠️ NO PAGE TITLE AND NO RULE. The eyebrow carries the page's name; the heading is the situation
 * ("Nothing out yet") and the subline says what will happen. The same two buttons and the same
 * courier stand in the same places as on the populated hero — this renders the shared header in the
 * same `.qcv-group` box the populated page uses, so they cannot drift.
 *
 * ⚠️ ONLY FOR A PAGE WITH NOTHING IN IT. A view narrowed to zero by filters keeps its ordinary hero
 * and says "no matches" inside the list; the page decides that, on the account's own count.
 */
import React from "react";
import { PageHeader } from "../../shell/PageHeader";
import type { LivingRun } from "../../../lib/livingLine";
import { HERO_COURIER_MAP } from "./qcArt";
import "./qcvPage.css";
import "./qcvEmpty.css";
import "../../shell/livingExhibit.css";

export interface QcEmptyProps {
  /** The book the first query would be for, when the page can name one. */
  manuscriptTitle: string | null;
  onLog: () => void;
  onRecord: () => void;
  onImport: () => void;
  logRef?: React.Ref<HTMLButtonElement>;
  /** How the page looks once it has something in it (§4) — inert, from sample content only. */
  exhibition?: React.ReactNode;
}

export const QC_EMPTY_HEADING = "Nothing out yet";

export function qcEmptySubline(manuscriptTitle: string | null): LivingRun[] {
  return manuscriptTitle
    ? ["Log your first query for ", { ms: manuscriptTitle }, " and it lands here with its dates, what you sent, and every word back."]
    : ["Log your first query and it lands here with its dates, what you sent, and every word back."];
}

export const QcEmpty: React.FC<QcEmptyProps> = ({ manuscriptTitle, onLog, onRecord, onImport, logRef, exhibition }) => (
  <div className="qcv-group qcv-own" data-qcv="group" data-rail="beside" data-qcv-empty="">
    <PageHeader
      variant="full"
      title="Query Centre"
      living={{ count: 0, copy: () => ({ headline: "", subline: [] }), empty: { heading: QC_EMPTY_HEADING, subline: qcEmptySubline(manuscriptTitle) } }}
      primaryRef={logRef}
      primary={{ label: "+ Log a query", onClick: onLog }}
      secondary={{ label: "Record a response", onClick: onRecord }}
      art={<img src={`${HERO_COURIER_MAP.src}?v=${HERO_COURIER_MAP.version}`} width={HERO_COURIER_MAP.width} height={HERO_COURIER_MAP.height} alt="" />}
    />
    <div className="qcv-empty-below">
      {exhibition}
      <p className="lh-hint" data-lh="hint">
        Already querying?{" "}
        <a className="lh-hint-link" href="/import" onClick={(e) => { e.preventDefault(); onImport(); }}>Bring them in from a spreadsheet ›</a>
      </p>
    </div>
  </div>
);
