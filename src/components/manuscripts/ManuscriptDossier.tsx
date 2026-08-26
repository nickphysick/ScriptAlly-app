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
import { MoreHorizontal, Archive, Trash2, Pencil } from "lucide-react";
import { Manuscript, ManuscriptVersion, SubmissionPackage, Query, CompTitle } from "../../types";
import type { Activity, BookVersion } from "../../types";
import { bookVersionsOf, holdingRows, openingRows, unattributedOpening, unrecordedHolders } from "../../lib/bookVersions";
import { isRequest } from "../../lib/packageMetrics";
import { isShelvedPresentation, CLOSED_STATUSES } from "../../lib/manuscriptPage";
import { plateStats } from "../../lib/manuscriptPlate";
import { heroFacts, queryingSinceMs, atAGlance, glanceMeta, pitchMeta, profileDate } from "../../lib/manuscriptProfile";
import { standingTrack, furthestTrack, furthestReached, journeyMeta } from "../../lib/manuscriptJourney";
import { ManuscriptTabKey } from "./ManuscriptTabs";
import { ManuscriptHero } from "./ManuscriptHero";
import { OverviewPane } from "./OverviewPane";
import { JourneyPane } from "./JourneyPane";
import { CompsPane } from "./CompsPane";
import { VersionsPane } from "./VersionsPane";
import { BookVersionsPanel } from "./BookVersionsPanel";
import { PitchAsset, PitchAssetKey } from "../../lib/manuscriptPitch";
import { ManuscriptPlateEdit } from "./ManuscriptPlate";
import { PitchLine } from "../../lib/comps";
import "./manuscriptLibrary.css";
import "./bookProfile.css";

export interface ManuscriptDossierProps {
  manuscript: Manuscript;
  /** Display labels, already resolved through `genreDisplay` — never raw stored ids. */
  genres: string[];
  queries: Query[];
  /** ⚠️ MATERIALS, not book versions — the repo's older meaning of the word. See types.ts. */
  versions: ManuscriptVersion[];
  /** Read by the versions panel: the R&R link, and which version each holder holds. */
  activities: Activity[];
  /** Today, date-only, so a new version is stamped in the writer's own calendar. */
  today: string;
  /** Append or rename a book version — the panel hands back the whole next list. */
  onSaveBookVersions: (next: BookVersion[]) => void;
  packages: SubmissionPackage[];
  comps: CompTitle[];
  isPro: boolean;
  scoutAvailable: boolean;
  /** The pitch shelf's four pieces, derived by the page. */
  pitchAssets: PitchAsset[];
  pitch: PitchLine;
  pitchText: string | null;
  /** The elevator pitch as stored, or null when it has not been written. */
  elevatorPitch: string | null;
  /** Resolves an agent id to a display name — the canonical helper, never a local format. */
  agentName: (agentId: string) => string;
  synopsisVersionCount: number;
  synopsisDate: string | null;
  onSavePitch: (key: PitchAssetKey, text: string) => void;
  /**
   * The plate's inline editors. Absent → the plate is read-only, which is the state every spec that
   * predates the reframe still asserts.
   *
   * ⚠️ `onLogline` IS WIRED HERE, NOT PASSED THROUGH. The logline is a pitch-shelf asset, so its
   * edit is a TAB SWITCH to the shelf — one home per asset, and the page never needs to know.
   */
  plateEdit?: Omit<ManuscriptPlateEdit, "onLogline">;
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
  pitchAssets,
  pitch,
  pitchText,
  elevatorPitch,
  agentName,
  synopsisVersionCount,
  synopsisDate,
  onSavePitch,
  plateEdit,
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
  onOpenPackageBuilder, activities, today, onSaveBookVersions,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const shelved = isShelvedPresentation(manuscript);
  const stats = plateStats(queries);
  /**
   * ⚠️ THE HOLDERS ARE DERIVED ONCE AND READ TWICE — the Overview's table and the count in its
   * section header. Deriving them separately for the two is how a card comes to state a number its
   * own rows do not add up to.
   */
  const holders = holdingRows(queries, activities, bookVersionsOf(manuscript), agentName, (iso) => profileDate(Date.parse(iso)));
  const closed = queries.filter((q) => CLOSED_STATUSES.includes(q.status)).length;
  /* ⚠️ DERIVED ONCE AND READ THREE TIMES — the table, the track's footer and the section header's
     meta. Deriving it per consumer is how a card comes to state a furthest rung its own rows do
     not show. */
  const furthest = furthestTrack(queries, activities);
  /* Distinct AGENTS, not rows: two live sends to one agent is one agent holding something. */
  const agentsHolding = new Set(holders.map((h) => h.agent)).size;

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
        <ManuscriptHero
          title={manuscript.title}
          status={shelved ? "Shelved" : manuscript.status}
          shelved={shelved}
          genres={genres}
          wordCount={manuscript.wordCount}
          stats={stats}
          facts={heroFacts(stats.queriesSent, stats.responses, queryingSinceMs(queries))}
          edit={plateEdit}
          tab={tab}
          onTabChange={onTabChange}
          /* ⚠️ `notes` IS DELIBERATELY ABSENT UNTIL ITS PANE EXISTS. The tab declares itself
             counted and renders no count while the caller supplies none — which is the honest
             state, and the opposite of writing `0` for data nobody has fetched. */
          counts={{ comps: comps.length, versions: bookVersionsOf(manuscript).length }}
          actions={
            <>
              {/* A shelved manuscript offers no Send — the same rule the library grid applies. */}
              {!shelved && (
                <button type="button" className="msv-btn sm msv-primary" onClick={onSendQuery}>
                  Send a query
                </button>
              )}
              <button type="button" className="msv-btn sm" onClick={onOpenQueriesHub}>
                Query Centre ›
              </button>
              {/* Shelve / reactivate / guarded delete, and the three fields with no inline editor
                  (status, shelved reason, notes) reach their form through here. The design draws
                  two actions; dropping this would be a functional regression in a mockup's clothes. */}
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
                    {/*
                      ⚠️ "EDIT DETAILS" LIVES HERE NOW, and this is a deliberate deviation from
                      "the button disappears". It disappears FROM THE PLATE, which is what the
                      reframe was about — but three fields have no inline editor and no other
                      surface on this page: STATUS, SHELVED REASON and NOTES. Deleting the form
                      outright would strand them, which is a functional regression wearing a design
                      decision's clothes. Status leaves this form when Phase 6's decision sheet
                      lands; the other two need a home before the form can go.
                    */}
                    <button
                      onClick={() => { setMenuOpen(false); onEditDetails(); }}
                      className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-[#3a1c14] hover:bg-[rgba(138,158,136,0.14)] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      Edit details…
                    </button>
                    <div className="h-px bg-[#f0eae2] my-1 mx-1" />
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
            </>
          }
        />


        {/*
          ⚠️ THE PANE BODY IS THE ONLY THING THAT SCROLLS. The plateband and the tab row are
          `flex: 0 0 auto` above it; this takes the remainder with `min-height: 0` so it can be
          shorter than its content instead of pushing the card past the viewport.
        */}
        <div className="msv-dpane msp-pane">
          {/* ⚠️ Notes arrives in Phase 6; Comparable titles and Versions carry their existing
              panes across until Phase 5 re-cuts them. */}
          {tab === "overview" && (
            <OverviewPane
              pitch={elevatorPitch}
              pitchMeta={pitchMeta(elevatorPitch)}
              glance={atAGlance(stats.queriesSent, stats.responses, closed, agentsHolding)}
              glanceMeta={glanceMeta(stats.queriesSent, agentsHolding)}
              holders={holders}
              onOpenVersions={() => onTabChange("versions")}
            />
          )}

          {tab === "journey" && (
            <JourneyPane
              track={standingTrack(queries)}
              furthest={furthest}
              furthestLabel={furthestReached(furthest)}
              holders={holders}
              queriesSent={stats.queriesSent}
              journeyMeta={journeyMeta(stats.queriesSent, furthestReached(furthest))}
            />
          )}

          {tab === "comps" && (
            <CompsPane comps={comps} onManage={onAddComp} />
          )}

          {tab === "versions" && (
            <VersionsPane
              isPro={isPro}
              versions={bookVersionsOf(manuscript)}
              materials={versions}
              queries={queries}
              activities={activities}
              today={today}
              onSaveBookVersions={onSaveBookVersions}
              openings={openingRows(bookVersionsOf(manuscript), versions, packages, queries, isRequest)}
              unattributed={unattributedOpening(versions, packages, queries)}
              unrecordedHolders={unrecordedHolders(queries, activities)}
              holders={holders}
              onUpgrade={onOpenPlans}
            />
          )}
        </div>
      </div>
    </div>
  );
};
