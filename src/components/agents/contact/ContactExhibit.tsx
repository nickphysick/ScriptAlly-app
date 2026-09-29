/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CONTACT LIST'S EXHIBITION (living headers §4) — how the page looks once a few agents are on
 * it, drawn by the page's OWN components (the count cards, the header row, the grouped rows and the
 * Housekeeping rail) over a SAMPLE constant declared here and nowhere else.
 *
 * ⚠️ THE SAMPLE GOES THROUGH THE PAGE'S OWN PIPELINE at a FIXED clock: `buildQcRows` → `agentFacts`
 * → `sortFacts` → `contactGroups`, `contactCensus` for the cards and `hkModel` for the rail. So the
 * band is what the page would draw for these agents, and it never reads the writer's data — no store,
 * no fetch, no subscription (LH6). The Housekeeping component keeps its own per-viewer grouping
 * preference in sessionStorage, as it does on the page; that is a UI setting, not data.
 *
 * ⚠️ INERT: `LivingExhibition` marks the band `inert` + `aria-hidden` and takes pointer events away,
 * so the handlers below are required props and nothing more. The rail is a STATIC box with the
 * rail's own markup — `ContactRail` measures the window and pins itself, which is the page's
 * behaviour, not a picture of it.
 */
import React from "react";
import { QueryStatus, SubmissionStatus, type Agent, type Query } from "../../../types";
import { buildQcRows } from "../../../lib/qcSummary";
import { agentFacts, contactCensus, contactGroups, emptyContactFilters, facetOptions, sortFacts } from "../../../lib/contactList";
import { agentRows } from "../../../lib/contactList";
import { hkModel } from "../../../lib/contactHousekeeping";
import { LivingExhibition } from "../../shell/LivingExhibition";
import { CountCards } from "./ContactCounts";
import { ContactControls } from "./ContactControls";
import { ContactRows } from "./ContactRows";
import { ContactHousekeeping } from "./ContactHousekeeping";
import "./contactV11.css";

export const CONTACT_EXHIBIT_LABEL = "HOW THE PAGE LOOKS ONCE YOU’VE ADDED A FEW";
export const CONTACT_SAMPLE_NOW = Date.UTC(2026, 8, 30, 12);
const DAY = 86_400_000;
const at = (daysAgo: number) => new Date(CONTACT_SAMPLE_NOW - daysAgo * DAY).toISOString();

const ag = (id: string, name: string, agency: string, over: Partial<Agent> = {}): Agent => ({
  id, userId: "sample", name, agency, genres: ["Thriller", "Crime"], country: "GB", city: "London",
  submissionStatus: SubmissionStatus.OPEN, responseTimeWeeks: 6, mswlNotes: "Pacy, twisty, character-led.", ...over,
} as unknown as Agent);

/** Sixteen agents — the ref's count — with a few gaps, so the rail has something to ask about. */
export const CONTACT_SAMPLE_AGENTS: readonly Agent[] = [
  ag("c1", "Aisha Kapoor", "The Lantern Agency"),
  ag("c2", "Marcus Reed", "Bloomsbury Quill", { responseTimeWeeks: 8 }),
  ag("c3", "Greg Panetta", "", { genres: [], mswlNotes: "", country: undefined, city: undefined }),
  ag("c4", "Sophie Dunn", "Ashgrove Literary", { responseTimeWeeks: 4 }),
  ag("c5", "Harriet Vane-Coe", "Stonebridge", { submissionStatus: SubmissionStatus.CLOSED }),
  ag("c6", "Jonathan Marsh", "The Marsh Agency", { responseTimeWeeks: 10, city: "Edinburgh" }),
  ag("c7", "Eleanor Whitfield", "Greenfield Literary", { mswlNotes: "" }),
  ag("c8", "Priya Nair", "Penhallow Literary"),
  ag("c9", "Owen Castell", "Northlight Agency", { country: "US", city: "New York" }),
  ag("c10", "Clara Montague", "Hollis & Grey", { responseTimeWeeks: 12 }),
  ag("c11", "Tomasz Wolski", "Ferrier Literary", { genres: [] }),
  ag("c12", "Ruth Adebayo", "Kingfisher Agency"),
  ag("c13", "Fenella Stroud", "Brightwater Books"),
  ag("c14", "Daniel Osei", "Marlow & Finch", { mswlNotes: "" }),
  ag("c15", "Imogen Hale", "Saltmarsh Literary", { country: "IE", city: "Dublin" }),
  ag("c16", "Lucas Brennan", "Oakfield Agency"),
];

let n = 0;
const q = (agentId: string, status: QueryStatus, sent: number, extra: Partial<Query> = {}): Query => ({
  id: `sample-c${++n}`, userId: "sample", manuscriptId: "sample-ms", agentId, packageId: "", personalisationNotes: "",
  sendMethod: "Email" as never, status, dateSent: at(sent), ...extra,
});

export const CONTACT_SAMPLE_QUERIES: readonly Query[] = [
  q("c1", QueryStatus.QUERIED, 47),
  q("c2", QueryStatus.PARTIAL_REQUESTED, 69, { partialRequestedDate: at(20), expectedSendDate: at(-3) }),
  q("c4", QueryStatus.QUERIED, 93),
  q("c5", QueryStatus.REJECTED, 147),
  q("c6", QueryStatus.PARTIAL_SENT, 60, { partialRequestedDate: at(45), partialSentDate: at(39) }),
  q("c7", QueryStatus.QUERIED, 30),
  q("c8", QueryStatus.FULL_REQUESTED, 110, { fullRequestedDate: at(15) }),
  q("c9", QueryStatus.QUERIED, 12),
  q("c10", QueryStatus.QUERIED, 19),
  q("c12", QueryStatus.QUERIED, 26),
  q("c13", QueryStatus.QUERIED, 2),
  q("c14", QueryStatus.QUERIED, 75),
  q("c15", QueryStatus.NO_RESPONSE, 200),
];

/** How many rows the band shows — the ref draws three and fades the foot. */
export const CONTACT_EXHIBIT_ROWS = 3;

const ROWS = buildQcRows([...CONTACT_SAMPLE_QUERIES], [...CONTACT_SAMPLE_AGENTS], [], CONTACT_SAMPLE_NOW);
const FACTS = CONTACT_SAMPLE_AGENTS.map((a) => agentFacts(a, ROWS, null));
const ORDERED = sortFacts(FACTS, "due", () => false, CONTACT_SAMPLE_NOW);
const SHOWN = ORDERED.slice(0, CONTACT_EXHIBIT_ROWS);
const GROUPS = contactGroups("stand", SHOWN);
const BY_ID = new Map(SHOWN.map((x) => [x.agent.id, x]));
const CENSUS = contactCensus(CONTACT_SAMPLE_AGENTS, ROWS, null);
const OPTIONS = facetOptions(FACTS, emptyContactFilters(), () => true);
const BAND = new Map(CONTACT_SAMPLE_AGENTS.map((a) => {
  const mine = agentRows(ROWS, a.id, null);
  return [a.id, mine.some((r) => r.court !== "closed") ? "live" as const : mine.length === 0 ? "never" as const : "closed" as const];
}));
const HK = hkModel(
  CONTACT_SAMPLE_AGENTS,
  (a) => ({ hasLiveQuery: BAND.get(a.id) === "live", hasReopenTask: false, nowMs: CONTACT_SAMPLE_NOW }),
  (a) => BAND.get(a.id) ?? "never",
);

const noop = () => {};
const none: ReadonlySet<never> = new Set();

export const ContactExhibit: React.FC = () => (
  <LivingExhibition label={CONTACT_EXHIBIT_LABEL}>
    <div className="lh-expg">
      <div className="lh-exmc clv-main">
        <CountCards cards={CENSUS.cards} sel={none} onToggle={noop} row />
        <ContactControls
          shownCount={ORDERED.length} total={CONTACT_SAMPLE_AGENTS.length}
          find="" onFind={noop} filters={emptyContactFilters()} onFilters={noop} options={OPTIONS}
          groupKey="stand" onGroup={noop} sortKey="due" onSort={noop} anyActive={false} onReset={noop}
        />
        <ContactRows groups={GROUPS} byId={BY_ID} nowMs={CONTACT_SAMPLE_NOW} genreHit={() => false}
          openId={null} onOpen={noop} onLogQuery={noop} onAddGenres={noop} />
      </div>
      <aside className="clv-rail lh-exrail">
        <div className="clv-hkrail">
          <div className="clv-tray">
            <img className="clv-peek" src="/images/qc/be-hawk-head.png" alt="" />
            <h2 className="clv-tray-t">Housekeeping</h2>
            <p className="clv-tray-c"><b>{HK.countsLine.gaps}</b>{HK.countsLine.rest}</p>
          </div>
          <div className="clv-railbody">
            <ContactHousekeeping model={HK} onOpen={noop} onEditAt={noop} onInlineSave={async () => {}} onChecked={async () => {}} onRemind={noop} />
          </div>
        </div>
      </aside>
    </div>
  </LivingExhibition>
);
