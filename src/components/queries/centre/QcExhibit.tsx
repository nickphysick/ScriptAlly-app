/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE QUERY CENTRE'S EXHIBITION (living headers §4) — how the page looks once the writer is
 * querying, drawn by the page's OWN components (the courts, the sentence, the ledger's rows and the
 * Birds-eye view) over a SAMPLE constant declared here and nowhere else.
 *
 * ⚠️ THE SAMPLE STATES ONLY WHAT A QUERY DOCUMENT STATES — status and the request/send dates — never
 * a DERIVED field (`rejectedDate`, `lastStatusChange`), which have one writer (recomputeQuery's
 * single-writer lock). ⚠️ THE SAMPLE IS A CONSTANT, AND IT GOES THROUGH THE REAL DERIVATION. `buildQcRows` turns it into
 * rows at a FIXED clock, so what the band shows is what the page would show for those queries —
 * never a drawing of it — and it cannot change between renders or read anything live. No store, no
 * fetch, no subscription: this module imports no hook that reaches data (LH6 asserts that at the
 * source and on the page).
 *
 * ⚠️ AND IT IS INERT. `LivingExhibition` marks the band `inert` + `aria-hidden` and the sheet takes
 * pointer events away, so the handlers below are the components' required props and nothing more.
 * The Birds-eye view sits in a STATIC rail box, not in `QcRail` — that one measures the window and
 * pins itself, which is the page's behaviour, not a picture of it.
 */
import React from "react";
import { QueryStatus, type Agent, type Query } from "../../../types";
import { buildQcRows, courtTiles, filterOptions, sortRows, DEFAULT_SORT, type QcRow } from "../../../lib/qcSummary";
import { LivingExhibition } from "../../shell/LivingExhibition";
import { QcCourts } from "./QcCourts";
import { QcSentence } from "./QcSentence";
import { QcList } from "./QcList";
import { QcBirdsEye } from "./QcBirdsEye";
import "./qcvPage.css";
import "./qcvRail.css";

export const QC_EXHIBIT_LABEL = "HOW THE PAGE LOOKS ONCE YOU’RE QUERYING";

/** The sample's own clock — fixed, so the band is the same picture on every render and every day. */
export const QC_SAMPLE_NOW = Date.UTC(2026, 8, 30, 12);
const DAY = 86_400_000;
const at = (daysAgo: number) => new Date(QC_SAMPLE_NOW - daysAgo * DAY).toISOString();

const ag = (id: string, name: string, agency: string, weeks = 8): Agent =>
  ({ id, userId: "sample", name, agency, responseTimeWeeks: weeks, genres: [] } as unknown as Agent);

export const QC_SAMPLE_AGENTS: readonly Agent[] = [
  ag("s1", "Fenella Stroud", "Brightwater Books"),
  ag("s2", "Eleanor Whitfield", "Greenfield Literary", 4),
  ag("s3", "Jonathan Marsh", "The Marsh Agency", 10),
  ag("s4", "Aisha Kapoor", "The Lantern Agency", 6),
  ag("s5", "Marcus Reed", "Bloomsbury Quill"),
  ag("s6", "Sophie Dunn", "Ashgrove Literary", 4),
  ag("s7", "Harriet Vane-Coe", "Stonebridge"),
  ag("s8", "Priya Nair", "Penhallow Literary", 6),
  ag("s9", "Owen Castell", "Northlight Agency"),
  ag("s10", "Clara Montague", "Hollis & Grey", 12),
  ag("s11", "Tomasz Wolski", "Ferrier Literary"),
  ag("s12", "Ruth Adebayo", "Kingfisher Agency", 6),
];

let n = 0;
const q = (agentId: string, status: QueryStatus, sent: number, extra: Partial<Query> = {}): Query => ({
  id: `sample-${++n}`, userId: "sample", manuscriptId: "sample-ms", agentId, packageId: "", personalisationNotes: "",
  sendMethod: "Email" as never, status, dateSent: at(sent), ...extra,
});

/** Twenty-seven queries — the ref's count — across every court, so each tile and each rail group has something in it. */
export const QC_SAMPLE_QUERIES: readonly Query[] = [
  q("s1", QueryStatus.QUERIED, 2),
  q("s2", QueryStatus.QUERIED, 930),
  q("s3", QueryStatus.PARTIAL_SENT, 60, { partialRequestedDate: at(45), partialSentDate: at(39) }),
  q("s3", QueryStatus.FULL_REQUESTED, 181, { fullRequestedDate: at(40) }),
  q("s4", QueryStatus.QUERIED, 47),
  q("s5", QueryStatus.PARTIAL_REQUESTED, 69, { partialRequestedDate: at(20), expectedSendDate: at(-3) }),
  q("s6", QueryStatus.QUERIED, 93),
  q("s7", QueryStatus.REJECTED, 147),
  q("s8", QueryStatus.REVISE_RESUBMIT, 120, { expectedSendDate: at(-30) }),
  q("s9", QueryStatus.OFFER, 110, { offerDate: at(6), offerResponseDeadline: at(-9) }),
  q("s10", QueryStatus.QUERIED, 12),
  q("s11", QueryStatus.QUERIED, 19),
  q("s12", QueryStatus.QUERIED, 26),
  q("s1", QueryStatus.FULL_SENT, 150, { fullRequestedDate: at(120), fullSentDate: at(110) }),
  q("s2", QueryStatus.QUERIED, 33),
  q("s4", QueryStatus.PARTIAL_SENT, 88, { partialRequestedDate: at(70), partialSentDate: at(64) }),
  q("s6", QueryStatus.NO_RESPONSE, 200),
  q("s7", QueryStatus.QUERIED, 8),
  q("s8", QueryStatus.QUERIED, 40),
  q("s9", QueryStatus.QUERIED, 54),
  q("s10", QueryStatus.QUERIED, 66),
  q("s11", QueryStatus.REJECTED, 99),
  q("s12", QueryStatus.QUERIED, 75),
  q("s5", QueryStatus.QUERIED, 81),
  q("s3", QueryStatus.QUERIED, 104),
  q("s10", QueryStatus.NO_RESPONSE, 260),
  q("s11", QueryStatus.QUERIED, 5),
];

/** The rows the band draws — built once, at module load, from the constant alone. */
export const QC_SAMPLE_ROWS: readonly QcRow[] = buildQcRows([...QC_SAMPLE_QUERIES], [...QC_SAMPLE_AGENTS], [], QC_SAMPLE_NOW);
/** How many ledger rows the band shows — the ref draws three and fades the foot. */
export const QC_EXHIBIT_ROWS = 3;

const noop = () => {};

export const QcExhibit: React.FC = () => {
  const ledger = sortRows(QC_SAMPLE_ROWS, DEFAULT_SORT);
  return (
    <LivingExhibition label={QC_EXHIBIT_LABEL}>
      <div className="lh-expg qcv-own">
        <div className="qcv-page lh-exmc">
          <QcCourts tiles={courtTiles(QC_SAMPLE_ROWS)} onCourt={noop} />
          <div className="qcv-ctl">
            <QcSentence
          find=""
          onFind={() => {}} loading={false} calendar={false} filter="all" total={QC_SAMPLE_ROWS.length} group="none" onGroup={() => {}} count={ledger.length} options={filterOptions(QC_SAMPLE_ROWS)}
              onFilter={noop} sort={DEFAULT_SORT} onSort={noop} scope={null} scopeTitle={null} />
          </div>
          <div className="qcv-stage">
            <section className="qcv-ledger">
              <QcList groups={[{ key: "all", label: "", rows: ledger.slice(0, QC_EXHIBIT_ROWS) }]} selectedId={null} onOpen={noop} nowMs={QC_SAMPLE_NOW} />
            </section>
          </div>
        </div>
        <aside className="qcv-rail lh-exrail">
          <QcBirdsEye rows={QC_SAMPLE_ROWS} nowMs={QC_SAMPLE_NOW} focus="all" onFocus={() => {}} onExpand={noop} />
        </aside>
      </div>
    </LivingExhibition>
  );
};
