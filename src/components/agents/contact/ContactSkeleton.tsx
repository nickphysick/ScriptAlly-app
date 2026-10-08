/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v13 §8 — THE LOADING BEAT. While the agents load, the page draws the desk (v15), the
 * next-step section, the "Your agents" bar's text, the A–Z strip and five rows as shimmering shapes;
 * the perched art, the pills, the tabs and the Housekeeping tab appear only with data.
 *
 * ⚠️ NOTHING JUMPS WHEN THE DATA ARRIVES BECAUSE THESE ARE THE PAGE'S OWN COMPONENTS (lock 12). Each
 * placeholder IS its real counterpart — the same `ContactDesk`, `ContactNextStep`, `YourAgentsBar`, `ContactIndexStrip` and
 * `ContactRows` — drawn over a handful of
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
import { deskModel } from "../../../lib/contactDesk";
import { ContactDesk } from "./ContactDesk";
import { YourAgentsBar } from "./YourAgentsBar";
import { ContactIndexStrip } from "./ContactIndexStrip";
import { ContactRows } from "./ContactRows";
import { ContactNextStep } from "./ContactNextStep";
import { nextStep } from "../../../lib/contactNextStep";
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
  /* v15 §3 — the desk over the same placeholders: three cards at their loaded size, painted over */
  const desk = useMemo(() => deskModel({ agents: PLACEHOLDERS, queries: [], msId: null, now: new Date(nowMs), hk: { complete: 0, total: PLACEHOLDERS.length, gaps: 0, gapAgents: 0 } }), [nowMs]);
  const facts = useMemo(() => sortFacts(PLACEHOLDERS.map((a) => agentFacts(a, [], null)), "surname"), []);
  const byId = useMemo(() => new Map(facts.map((x) => [x.agent.id, x])), [facts]);
  const groups = useMemo(() => contactGroups("letter", facts), [facts]);
  const counts = useMemo(() => letterCounts(facts), [facts]);

  return (
    <>
      <ContactDesk model={desk} onQueried={noop} onProfiles={noop} />
      {/* v14 §2 — the next-step section over the same placeholders: they are open, take the genre and are
          unqueried, so it draws its Ready state, the shape the page settles into most often */}
      <ContactNextStep
        step={nextStep({ agents: PLACEHOLDERS, queries: [], msId: null, book: ["Thriller"], todayIso: "2000-01-01" })}
        bookTitle={msTitle} genres="thrillers" factsById={byId} qFor={() => null} genreHit={() => false} todayIso="2000-01-01"
        reminded={() => false} discoverLive={false} discover={[]}
        onOpen={noop} onAct={noop} onAdd={noop} onSeeAll={noop} onOpenHk={noop} onNewAgent={noop} onDiscover={noop}
        onRemind={noop} onRemindAll={noop} onAddDiscover={noop}
      />
      <div className="clv-main">
        <section className="cl14-ws" aria-hidden="true">
          <YourAgentsBar shown={0} total={0} book={msTitle} you={0} ready={0} youOn={false} readyOn={false}
            onYou={noop} onReady={noop} art={perch} controls={controls} />
          {/* the strip's one line, held at its loaded height (34 + its 18 below); the controls wait for data */}
          <div className="cl14-frow"><div className="cl14-fbar" aria-hidden="true"><span className="cl14-fp" style={{ width: 420, visibility: "hidden" }} /></div></div>
          <div className="cl14-list">
          <ContactIndexStrip total={facts.length} counts={counts} marked={null} onPick={noop} />
          <div>
            <ContactRows
              groups={groups} totals={null} byId={byId} nowMs={nowMs} genreHit={() => false}
              openId={null} newId={null} onOpen={noop} onAddGenres={noop} onAddWishlist={noop}
              trayFor={() => PRIMARY} onAct={noop}
            />
          </div>
          </div>
        </section>
      </div>
    </>
  );
};
