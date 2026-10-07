/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CONTACT LIST'S EXHIBITION (living headers §4, re-cut by v12 P5 to the mock's `.empty`):
 * the anthracite banner, then TWO features rendered LIVE by the page's own components over the
 * sample constant — the card index (dividers + dossier rows, the query column hidden, at the
 * mock's .82 zoom) and the Housekeeping rail at 340. The v11 exhibit's count cards, header row
 * and side-by-side page replica retired with it — `CountCards` lost its last renderer in the
 * same commit.
 *
 * ⚠️ THE SAMPLE GOES THROUGH THE PAGE'S OWN PIPELINE at a FIXED clock, on the PAGE'S OWN v12
 * DEFAULTS — surname order, letter grouping — so the preview's dividers are what the page would
 * draw for these agents. No store, no fetch, no subscription (LH6/LH8).
 *
 * ⚠️ INERT: `LivingExhibition` marks the band `inert` + `aria-hidden` and takes pointer events
 * away, so the handlers below are required props and nothing more. The pics' feet dissolve by
 * MASK, never a painted gradient — the band's surface is translucent white over the page
 * ground, so there is no colour a painted fade could match (the house never-paint-a-rectangle
 * law's cousin).
 */
import React from "react";
import { QueryStatus, SubmissionStatus, type Agent, type Query } from "../../../types";
import { buildQcRows } from "../../../lib/qcSummary";
import { agentFacts, contactGroups, sortFacts } from "../../../lib/contactList";
import { agentRows } from "../../../lib/contactList";
import { hkModel } from "../../../lib/contactHousekeeping";
import { LivingExhibition } from "../../shell/LivingExhibition";
import { ContactRows } from "./ContactRows";
import { HousekeepingPreview } from "./ContactHousekeeping";
import { contactPrefsOf } from "../../../lib/contactPrefs";
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

/** How many rows the card-index preview shows — three, as the v11 band did; the mask fades the foot. */
export const CONTACT_EXHIBIT_ROWS = 3;

const ROWS = buildQcRows([...CONTACT_SAMPLE_QUERIES], [...CONTACT_SAMPLE_AGENTS], [], CONTACT_SAMPLE_NOW);
const FACTS = CONTACT_SAMPLE_AGENTS.map((a) => agentFacts(a, ROWS, null));
const ORDERED = sortFacts(FACTS, "surname", () => false, CONTACT_SAMPLE_NOW);
const SHOWN = ORDERED.slice(0, CONTACT_EXHIBIT_ROWS);
const GROUPS = contactGroups("letter", SHOWN);
const BY_ID = new Map(SHOWN.map((x) => [x.agent.id, x]));
/* Housekeeping v2's model over the sample — a picture of the drawer's list, never live (Contact list
   v13 P5 swapped the rail's body for the drawer's; the exhibit's chrome and copy stay as v12 built them) */
const HK = hkModel(
  CONTACT_SAMPLE_AGENTS,
  (a) => {
    const mine = agentRows(ROWS, a.id, null);
    return { live: mine.some((r) => r.court !== "closed"), fits: false, queried: mine.length > 0, passedOn: false, hasReopenTask: false };
  },
  contactPrefsOf(null, new Date(CONTACT_SAMPLE_NOW)),
);
const HK_BOOK = { title: null, genre: null, genres: [] };

const noop = () => {};

export const ContactExhibit: React.FC = () => (
  <LivingExhibition label={CONTACT_EXHIBIT_LABEL}>
    {/* the anthracite banner (the mock's .ban) — the claim the two previews then show */}
    <div className="clv-eban" data-clv="eban">
      <h2>A card for every agent.</h2>
      <p>Everything you know about them, kept in one place and ready the moment you query.</p>
    </div>
    <div className="clv-vis" data-clv="vis">
      <div className="clv-vf" data-clv="vf-index">
        <div className="clv-pic">
          <div className="clv-pvw clv-pv1">
            <ContactRows groups={GROUPS} byId={BY_ID} nowMs={CONTACT_SAMPLE_NOW} genreHit={() => false}
              openId={null} onOpen={noop} onAddGenres={noop} onAddWishlist={noop}
              trayFor={() => ({ label: "Open card", act: "qc", ghost: true })} onAct={noop} />
          </div>
        </div>
        <h3>The card index.</h3>
        <p>Every agent as a card: who they are, what they want, how fast they reply, and where your query stands. Click one for the full record.</p>
      </div>
      <div className="clv-vf" data-clv="vf-hk">
        <div className="clv-pic">
          <div className="clv-pvw clv-pv2">
            <div className="clv-hkrail">
              <div className="clv-tray">
                <img className="clv-peek" src="/images/qc/be-hawk-head.png" alt="" />
                <h2 className="clv-tray-t">Housekeeping</h2>
                <p className="clv-tray-c"><b>{`${HK.items.length} GAP${HK.items.length === 1 ? "" : "S"}`}</b>{` · ${HK.gapAgents} AGENT${HK.gapAgents === 1 ? "" : "S"} · ${HK.complete} OF ${HK.total} COMPLETE`}</p>
              </div>
              <div className="clv-railbody">
                <HousekeepingPreview model={HK} book={HK_BOOK} />
              </div>
            </div>
          </div>
        </div>
        <h3>Housekeeping.</h3>
        <p>What’s missing from a profile, and what filling it in would unlock: a reply date, a better match, a reminder when a list reopens.</p>
      </div>
    </div>
  </LivingExhibition>
);
