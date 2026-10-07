/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v13 §8 — THE LOADING BEAT. While the agents load, the page draws the strip, the
 * banner's text, the A–Z strip and five rows as shimmering shapes (v14 retired the carousel);
 * the perched art, the pills, the tabs and the Housekeeping tab appear only with data.
 *
 * ⚠️ NOTHING JUMPS WHEN THE DATA ARRIVES BECAUSE THESE ARE THE PAGE'S OWN COMPONENTS (lock 12). Each
 * placeholder IS its real counterpart — the same `ContactStrip`, `OpenBanner`, `Workspace`, `ContactIndexStrip` and `ContactRows` — drawn over a handful of
 * PLACEHOLDER agents through the page's own derivations, in the same parents, with their text made
 * transparent and a shimmer painted on (contactV13.css, `[data-loading]`). A box drawn by hand to
 * look the right size is right until the component it imitates changes.
 *
 * ⚠️ THE PLACEHOLDERS ARE SHAPED LIKE A TYPICAL AGENT, AND THAT IS THE ONE DEPENDENCY ON DATA. A row sits at its 80 floor
 * unless its contents are taller (a two-line wishlist at 1280 is 86), so the placeholder row is the floor.
 * Nothing here is interactive: the whole beat is `inert` and hidden from assistive technology.
 */
import React, { useMemo } from "react";
import type { Agent } from "../../../types";
import { agentFacts, contactGroups, letterCounts, sortFacts } from "../../../lib/contactList";
import { stripFacts } from "../../../lib/contactStrip";
import { ContactStrip } from "./ContactStrip";
import { OpenBanner } from "../../shell/OpenBanner";
import { Workspace } from "../../shell/Workspace";
import { ContactIndexStrip } from "./ContactIndexStrip";
import { ContactRows } from "./ContactRows";
import type { CardPrimary } from "../../../lib/agentCard";

/* ONE line, so a placeholder row sits at the row's own 80 floor at every width (a two-line wishlist
   made it 86 at 1280, measured) */
const WISH = "Character-led suspense.";
/** five rows under one letter */
const PLACEHOLDERS: Agent[] = ["Abbot", "Ashby", "Arden", "Avery", "Aston"].map((surname, i) => ({
  id: `sk-${i}`,
  name: `Agent ${surname}`,
  agency: `${surname} Literary`,
  /* no city and no reply time: the card's sub-line is then the agency alone, one line, as the harness
     account's first cards read (measured — with both, the sub-line wrapped and the head grew 11.8px) */
  genres: ["Thriller"],
  mswlNotes: WISH,
  materialsWanted: ["Query letter", "Synopsis"],
  submissionStatus: "Open",
}) as unknown as Agent);

const noop = () => {};
const PRIMARY = { act: "log", label: "Log a query" } as unknown as CardPrimary;

export const ContactSkeleton: React.FC<{
  /** the banner's sentence names the book, as the page's own does */
  msTitle: string | null;
  msGenre: string | null;
  /** the banner's controls, the page's own (drawn invisible: the pills appear only with data) */
  controls: React.ReactNode;
  perch: { src: string; width: number; height: number };
}> = ({ msTitle, msGenre, controls, perch }) => {
  const nowMs = useMemo(() => Date.now(), []);
  const strip = useMemo(() => stripFacts(PLACEHOLDERS, msGenre ? [msGenre] : [], nowMs), [msGenre, nowMs]);
  const facts = useMemo(() => sortFacts(PLACEHOLDERS.map((a) => agentFacts(a, [], null)), "surname", () => false, nowMs, false), [nowMs]);
  const byId = useMemo(() => new Map(facts.map((x) => [x.agent.id, x])), [facts]);
  const groups = useMemo(() => contactGroups("letter", facts, { fits: () => false, genreWord: null }), [facts]);
  const counts = useMemo(() => letterCounts(facts), [facts]);

  return (
    <>
      <ContactStrip facts={strip} />
      <div className="clv-main">
        <OpenBanner
          probe="contacts-sk"
          figure={perch}
          eyebrow={<span>Agents on file</span>}
          heading="Every agent, on file."
          sentence={msTitle
            ? <>Your card index for <b>{msTitle}</b>: what each agent wants, how fast they reply, and where your query to them stands.</>
            : <>Your card index: what each agent wants, how fast they reply, and where your query to them stands.</>}
          controls={controls}
        />
        <Workspace tray="var(--clv-slate-tray)" probe="contacts-sk">
          <ContactIndexStrip total={facts.length} counts={counts} marked={null} onPick={noop} />
          <div>
            <ContactRows
              groups={groups} totals={null} byId={byId} nowMs={nowMs} genreHit={() => false}
              openId={null} newId={null} onOpen={noop} onAddGenres={noop} onAddWishlist={noop}
              trayFor={() => PRIMARY} onAct={noop}
            />
          </div>
        </Workspace>
      </div>
    </>
  );
};
