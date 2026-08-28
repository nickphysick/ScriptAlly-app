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
import { Manuscript, ManuscriptVersion, SubmissionPackage, Query, CompTitle, UserTask } from "../../types";
import type { Activity, BookVersion } from "../../types";
import { bookVersionsOf, holdingRows, openingRows, unrecordedVersion, unrecordedHolders } from "../../lib/bookVersions";
import { isRequest } from "../../lib/packageMetrics";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { plateStats } from "../../lib/manuscriptPlate";
import { queryingSinceMs, pitchMeta, synopsisMeta, profileDate } from "../../lib/manuscriptProfile";
import { standingTrack, furthestTrack, furthestReached, journeyMeta } from "../../lib/manuscriptJourney";
import { ManuscriptTabKey } from "./ManuscriptTabs";
import { ManuscriptHero } from "./ManuscriptHero";
import { OverviewPane } from "./OverviewPane";
import { bookFigures } from "../../lib/bookFigures";
import { JourneyPane } from "./JourneyPane";
import { CompsPane } from "./CompsPane";
import { VersionsPane } from "./VersionsPane";
import { NotesPane } from "./NotesPane";
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
  /** The writer's working synopsis. NOT the packages synopsis materials — see types.ts. */
  synopsis: string | null;
  onSaveSynopsis: (next: string) => void;
  /** Rendered by the composition root, which owns the db context. See OverviewPane's note. */
  attachmentsSlot?: React.ReactNode;
  /** Resolves an agent id to a display name — the canonical helper, never a local format. */
  agentName: (agentId: string) => string;
  /** This manuscript's own notes — `UserTask` documents, the collection the Noteboard reads. */
  notes: UserTask[];
  /** Writes one against this manuscript. Absent → the pane reads without offering to write. */
  onWriteNote?: (text: string, detail: string) => void;
  onOpenNoteboard: () => void;
  /* ⚠️ THE PAGER LEFT FOR THE MASTHEAD. It pages the SHELF, so it belongs beside the
     departure and the book's actions rather than inside the book's own band. */
  /** The book band's ⋯ — lifecycle and the three fields with no inline editor. */
  bookActions?: React.ReactNode;
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
  /**
   * ⚠️ THE LIFECYCLE PROPS LEFT WITH THE ⋯ (amendment 2). Send a query, Query Centre, Edit details,
   * shelve and delete were the hero's action cluster; the cluster is retired and the ⋯ is
   * `ManuscriptActions` in the page's control row, which is where the handlers live. Left declared
   * here they would be four props nothing reads — the shape this repo keeps finding as dead weight
   * that looks like wiring.
   */
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
  synopsis,
  onSaveSynopsis, attachmentsSlot,
  agentName,
  notes,
  onWriteNote,
  onOpenNoteboard,
  bookActions,
  synopsisVersionCount,
  synopsisDate,
  onSavePitch,
  plateEdit,
  now,
  currentYear,
  tab,
  onTabChange,
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
  const since = queryingSinceMs(queries);
  /**
   * ⚠️ ONE DERIVATION, AND IT HAS ONE CONSUMER NOW. Overview's copy of this table is gone —
   * "Out with agents now" on Journey is the same table, and one fact with two homes disagrees the
   * moment either moves. Versions reads it too, for the version column Overview never had.
   */
  const holders = holdingRows(queries, activities, bookVersionsOf(manuscript), agentName, (iso) => profileDate(Date.parse(iso)));
  /* ⚠️ DERIVED ONCE AND READ THREE TIMES — the table, the track's footer and the section header's
     meta. Deriving it per consumer is how a card comes to state a furthest rung its own rows do
     not show. */
  const furthest = furthestTrack(queries, activities);

  return (
    <div className="msv-doss">
      {/**
        * ⚠️ THE BACK LINK IS GONE — it pointed at a destination that no longer exists. "All
        * manuscripts" meant the library grid, and there are two better routes to another book now:
        * the sidebar switcher, which names the current one on every page and never scrolls, and the
        * hero's chevrons, which page through the shelf in its own order. A link back to a list
        * nobody needs to visit is a step added to a journey that no longer has one.
        */}

      {/**
        * ⚠️ NO CARD. This used to be `.msv-card .msv-dcard` — 16px radius, border, shadow,
        * `overflow: hidden` — sitting inside `.ws-window`, which is the SAME treatment one level up.
        * A card inside a card, with the inner one clipping its own scroller.
        *
        * ⚠️ AND THE CLIP WAS THE EXPENSIVE HALF. `overflow: hidden` on the card is what forced
        * `.msv-dpane` to scroll internally, which is what forced the whole `flex: 1; min-height: 0`
        * chain above it, which is what forced the page to be `fill`. Removing the frame is a look;
        * removing the clip is what lets the page scroll as a page.
        */}
      <div className="msv-doss-body">
        <ManuscriptHero
          title={manuscript.title}
          status={shelved ? "Shelved" : manuscript.status}
          shelved={shelved}
          genres={genres}
          wordCount={manuscript.wordCount}
          stats={stats}
          edit={plateEdit}
          tab={tab}
          onTabChange={onTabChange}
          counts={{ comps: comps.length, versions: bookVersionsOf(manuscript).length, notes: notes.length }}
          /* ⚠️ THE HERO CARRIES NO ACTIONS NOW. Send a query and Query Centre are retired
             from it — the rail's collapsed primary is the page's one call to action — and the ⋯
             moved to the control row as `ManuscriptActions`, because shelve, reactivate, the
             guarded delete and the three fields with no inline editor have no other surface. */
          bookActions={bookActions}
        />


        {/*
          ⚠️ THE PANE BODY IS THE ONLY THING THAT SCROLLS. The plateband and the tab row are
          `flex: 0 0 auto` above it; this takes the remainder with `min-height: 0` so it can be
          shorter than its content instead of pushing the card past the viewport.
        */}
        {/**
          * ⚠️ THE FIGURES SIT UNDER THE TAB RAIL, NOT IN THE MASTHEAD. A masthead carrying live
          * figures becomes a dashboard, and `PageHeader` is shared by ten pages — its `count` slot
          * was deleted once already for exactly that reason.
          *
          * ⚠️ AND THE RECORD CARD'S THREE-FIGURE ROW WENT IN THE SAME EDIT. Three of these five
          * were stated there too; leaving both would have put the same numbers on one page twice.
          *
          * ⚠️ VALUE OVER LABEL HERE, LABEL OVER VALUE ON THE SHELF TILE. Deliberate: this is a page
          * being read, that is a card being scanned.
          */}
        <div className="msp-figstrip">
          {bookFigures(queries).map((f) => (
            <div key={f.key} className="msp-figcell">
              <div className="msp-fign">{f.value}</div>
              <div className="msp-figl">{f.label}</div>
            </div>
          ))}
        </div>

        <div className="msp-pane">
          {tab === "overview" && (
            <OverviewPane
              pitch={elevatorPitch}
              pitchMeta={pitchMeta(elevatorPitch)}
              onSavePitch={(next) => onSavePitch("elevator", next)}
              synopsis={synopsis}
              synopsisMeta={synopsisMeta(synopsis)}
              onSaveSynopsis={onSaveSynopsis}
              attachments={attachmentsSlot}
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
              openings={openingRows(bookVersionsOf(manuscript), packages, queries, isRequest)}
              unattributed={unrecordedVersion(packages, queries, isRequest)}
              unrecordedHolders={unrecordedHolders(queries, activities)}
              holders={holders}
              onUpgrade={onOpenPlans}
            />
          )}

          {tab === "notes" && (
            <NotesPane notes={notes} onWrite={onWriteNote} onOpenNoteboard={onOpenNoteboard} />
          )}
        </div>
      </div>
    </div>
  );
};
