/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — the empty shelf ════════════════════════════════════════════════════════
 *
 * ⚠️ THE REF DRAWS NO EMPTY STATE. This is built from the brief's prose, which means there is no
 * artefact to check it against — so it stays in the page's own established grammar (the capped
 * card, the mono label, the dashed commission slot) rather than inventing a treatment nobody has
 * seen. Anything here is a candidate for redrawing when a mockup arrives.
 *
 * ⚠️ THREE STAGES, AND ONLY THE THIRD IS CHIPPED. Putting a book on the shelf and seeing where its
 * queries stand are free; naming the openings you send is Pro. A chip on either of the first two
 * would sell a writer what they already have — which is why the tab rail carries exactly one chip
 * too, and why a Pro-selling surface has twice been retired from packages.
 *
 * ⚠️ IT SELLS NOTHING AND PROMISES NOTHING. No trial countdown, no "join N writers", no figure
 * about how many manuscripts anyone has. The page states what the app does and offers the one act
 * that gets you there.
 */
import React from "react";
import { SectionHeader } from "../containers/SectionHeader";
import { CappedCard } from "../containers/CappedCard";
import { Plus } from "lucide-react";
import "./bookProfile.css";

/**
 * The commission slots, keyed. The keys are the illustrator's inventory and the page's `data-slot`
 * at once, so the brief and the render cannot drift apart.
 */
export const STAGE_SLOTS = ["ms-stage-shelf", "ms-stage-standing", "ms-stage-versions"] as const;
export type StageSlot = (typeof STAGE_SLOTS)[number];

interface Stage {
  slot: StageSlot;
  title: string;
  body: string;
  pro?: boolean;
}

/** ⚠️ THE COPY DESCRIBES WHAT THE APP DOES TODAY — no future tense, no roadmap, no verdict. */
const STAGES: readonly Stage[] = [
  {
    slot: "ms-stage-shelf",
    title: "Put the book on the shelf",
    body: "Its title, its length, the genres you would put it under. Everything else on this page is derived from what happens to it afterwards.",
  },
  {
    slot: "ms-stage-standing",
    title: "See where every query stands",
    body: "One track for where each query is today, another for the furthest each one ever reached. A query appears once on each.",
  },
  {
    slot: "ms-stage-versions",
    title: "Name the openings you send",
    body: "An initial draft, a prologue-first reordering, a post-R&R revision — and which one each agent is holding.",
    pro: true,
  },
];

export interface ManuscriptsEmptyProps {
  onAdd: () => void;
}

export const ManuscriptsEmpty: React.FC<ManuscriptsEmptyProps> = ({ onAdd }) => (
  <>
    <SectionHeader title="Your shelf" meta="No manuscripts yet" />

    <div className="msp-hero msp-emptyhero">
      <div className="msp-banner" data-slot="ms-hero-banner" aria-hidden="true">
        <span className="msp-artkey">ms-hero-banner</span>
      </div>
      <div className="msp-heroin msp-emptyin">
        <h2 className="msp-emptyh">Nothing on the shelf yet.</h2>
        <p className="msp-emptylede">
          Add a manuscript and this page becomes its record — what it is, where it has been, and
          what every agent is holding.
        </p>
        <div>
          <button type="button" className="msv-btn msv-primary" onClick={onAdd}>
            <Plus />
            Add a manuscript
          </button>
        </div>
      </div>
    </div>

    <div className="msp-stages">
      {STAGES.map((s) => (
        <CappedCard
          key={s.slot}
          tint={s.pro ? "slate" : "sage"}
          label={s.title}
          right={s.pro ? "Pro" : undefined}
        >
          {/* ⚠️ DASHED MEANS PROVISIONAL — the app's grammar for artwork that has not arrived. The
              key is the commission's name, so the inventory and the page cannot drift. */}
          <div className="msp-stageslot" data-slot={s.slot} aria-hidden="true">
            <span className="msp-artkey">{s.slot}</span>
          </div>
          <p className="msp-stagebody">{s.body}</p>
        </CappedCard>
      ))}
    </div>
  </>
);
