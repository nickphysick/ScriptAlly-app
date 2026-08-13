/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dossier — one manuscript, opened from the library shelf.
 * Reference: design-refs/manuscript-library.html (view 2) + design-refs/manuscript-plate-inputs.html
 * (the white plateband, variant D plain).
 *
 * ⚠️ PROPS ONLY, and it was extracted for a reason rather than for tidiness. While the dossier lived
 * inline in `AllManuscripts` it was reachable only by clicking a card, and this repo's specs read
 * source with no jsdom — so no smoke could execute any of it. Phase 1 recorded that as a gap and
 * Phase 2 found the gap had ALREADY bitten: a `/* … *\/` block left in JSX children position was
 * rendering as literal text at the top of the card, through a green typecheck, a green build and
 * 4,632 green tests. As its own component it renders in a spec, and that class of fault is visible.
 *
 * ⚠️ MENU STATE LIVES HERE, NOT ABOVE. The lifecycle menu is the dossier's own UI, and hoisting it
 * would give the page a piece of state that means nothing while the shelf is showing.
 *
 * ⚠️ `now` AND `currentYear` ARE INJECTED. `onTheShelf` and the comp-age rule both read a clock; a
 * component that called `Date.now()` itself could not be asserted against a fixed date.
 */
import React, { useState } from "react";
import { MoreHorizontal, Archive, Trash2 } from "lucide-react";
import { Manuscript, ManuscriptVersion, SubmissionPackage, Query, CompTitle } from "../../types";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { plateStats } from "../../lib/manuscriptPlate";
import { outInTheWorld, comparableTitlesTile, onTheShelf, submissionMaterials } from "../../lib/manuscriptTiles";
import { ManuscriptPlate } from "./ManuscriptPlate";
import { ManuscriptTabs, ManuscriptTabKey } from "./ManuscriptTabs";
import { ManuscriptDetailTiles } from "./ManuscriptDetailTiles";
import { ManuscriptCompsPane } from "./ManuscriptCompsPane";
import { ManuscriptPackagesPane } from "./ManuscriptPackagesPane";
import "./manuscriptLibrary.css";

export interface ManuscriptDossierProps {
  manuscript: Manuscript;
  /** Display labels, already resolved through `genreDisplay` — never raw stored ids. */
  genres: string[];
  queries: Query[];
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  comps: CompTitle[];
  isPro: boolean;
  scoutAvailable: boolean;
  now: number;
  currentYear: number;
  tab: ManuscriptTabKey;
  onTabChange: (t: ManuscriptTabKey) => void;
  onBack: () => void;
  onSendQuery: () => void;
  onEditDetails: () => void;
  onShelveToggle: () => void;
  onDelete: () => void;
  onRemoveComp: (index: number) => void;
  onAddComp: () => void;
  onCopyPitch: (text: string) => void;
  onOpenPlans: () => void;
  onOpenQueriesHub: () => void;
  onOpenPackageBuilder: () => void;
}

export const ManuscriptDossier: React.FC<ManuscriptDossierProps> = ({
  manuscript,
  genres,
  queries,
  versions,
  packages,
  comps,
  isPro,
  scoutAvailable,
  now,
  currentYear,
  tab,
  onTabChange,
  onBack,
  onSendQuery,
  onEditDetails,
  onShelveToggle,
  onDelete,
  onRemoveComp,
  onAddComp,
  onCopyPitch,
  onOpenPlans,
  onOpenQueriesHub,
  onOpenPackageBuilder,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const shelved = isShelvedPresentation(manuscript);

  return (
    <div className="msv-doss">
      <button type="button" className="mlib-back" onClick={onBack}>
        ← All manuscripts
      </button>

      {/*
        ⚠️ ONE CARD. The library grid picks the subject; this renders it. The card is the same shape
        at one manuscript and at five.
      */}
      <div className="msv-card msv-dcard">
        <ManuscriptPlate
          title={manuscript.title}
          status={shelved ? "Shelved" : manuscript.status}
          shelved={shelved}
          genres={genres}
          wordCount={manuscript.wordCount}
          logline={manuscript.logline}
          stats={plateStats(queries)}
          onSendQuery={onSendQuery}
          onEditDetails={onEditDetails}
          /* Shelve / reactivate / guarded delete — the design draws two actions and this is a third,
             quiet one. It has no other surface on this page; see ManuscriptPlate's prop note. */
          lifecycle={
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="msv-btn sm"
                title="More actions"
                aria-label="More actions"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                style={{ padding: "6.5px 9px" }}
              >
                <MoreHorizontal />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-[34px] z-40 bg-white border border-[#e8e0d8] rounded-[11px] shadow-[0_12px_30px_rgba(58,28,20,0.16)] p-1.5 min-w-[186px]">
                    <button
                      onClick={() => { setMenuOpen(false); onShelveToggle(); }}
                      className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#3a1c14] hover:bg-[rgba(138,158,136,0.14)] cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      {manuscript.shelved ? "Reactivate" : "Shelve"}
                    </button>
                    <div className="h-px bg-[#f0eae2] my-1 mx-1" />
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(); }}
                      className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#a8442f] hover:bg-[rgba(168,68,47,0.08)] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      Delete…
                    </button>
                  </div>
                </>
              )}
            </div>
          }
        />

        <ManuscriptTabs active={tab} onChange={onTabChange} />

        {/*
          ⚠️ THE PANE BODY IS THE ONLY THING THAT SCROLLS. The plateband and the tab row are
          `flex: 0 0 auto` above it; this takes the remainder with `min-height: 0` so it can be
          shorter than its content instead of pushing the card past the viewport.
        */}
        <div className="msv-dpane">
          {tab === "details" && (
            <div className="msv-dbody">
              <ManuscriptDetailTiles
                world={outInTheWorld(queries)}
                comps={comparableTitlesTile(comps)}
                shelf={onTheShelf(manuscript, now)}
                materials={submissionMaterials(packages, versions)}
                onOpenQueriesHub={onOpenQueriesHub}
                /* A TAB SWITCH, not a navigation — the shelf is a pane of this card. */
                onOpenShelf={() => onTabChange("comps")}
                onEditDetails={onEditDetails}
                onOpenPackageBuilder={onOpenPackageBuilder}
              />
            </div>
          )}

          {tab === "comps" && (
            <ManuscriptCompsPane
              comps={comps}
              /* The ONE Pro predicate, gating the Scout strip and nothing else on this page. */
              isPro={isPro}
              scoutAvailable={scoutAvailable}
              currentYear={currentYear}
              onRemoveComp={onRemoveComp}
              onAddComp={onAddComp}
              onCopyPitch={onCopyPitch}
              onSeeHowItWorks={onOpenPlans}
              onUpgrade={onOpenPlans}
            />
          )}

          {tab === "packages" && (
            <ManuscriptPackagesPane
              versions={versions}
              packages={packages}
              onOpenBuilder={onOpenPackageBuilder}
            />
          )}
        </div>
      </div>
    </div>
  );
};
