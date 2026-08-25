/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The packages band — one card per package, plus the ghost that builds another.
 * Design authority: design-refs/submission-packages-broadsheet.html (`.pkg-grid`).
 *
 * ⚠️ THE STAMP IS DERIVED FROM THE PACKAGE ID, NOT ITS POSITION (D7). An index-based choice
 * re-stamps every card below a deleted one, so archiving your first package would silently redraw
 * the rest — a change with no cause the writer can see. Nothing is stored: a `stamp` field would be
 * a decoration in the data model, and the first thing anyone would ask is why it cannot be chosen.
 *
 * ⚠️ AND THE BIN IS THE SAME `RemovePopover` THE SHEETS USE. A package nothing has been sent with is
 * deleted; one that has travelled is ARCHIVED, because it is the record of what went in an envelope
 * and a query still points at it. One component, one decision function, two record types.
 */
import { ArchivedToggle, ArchivedRow, ArchivedSection } from "./ArchivedRow";
import React from "react";
import { ManuscriptVersion, Query, SubmissionPackage } from "../../types";
import { packageTiles, tileFooter, composition } from "../../lib/packagesOverview";
import { isPackageLocked, LOCKED_NOTE, LOCKED_WHY } from "../../lib/packageMetrics";
import { packageStamp } from "../../lib/packageTracking";
import { IllustrationSlot } from "./IllustrationSlot";
import "./packagesBroadsheet.css";

export interface PackagesBandProps {
  packages: SubmissionPackage[];
  versions: ManuscriptVersion[];
  queries: Query[];
  onOpenPackage: (id: string) => void;
  onNewPackage: () => void;
  /**
   * ⚠️ THE EXPLAINER LIVES HERE AND NOT IN THE MASTHEAD (D4, amended). The brief asked for a
   * control "in the packages page header"; `PageHeader` variant="workspace" THROWS when handed one,
   * because a masthead with nothing actionable never needs restoring mid-visit. The band head is
   * this page's own, it already carries the count, and it does not scroll away — which is the
   * property the masthead law is protecting.
   */
  onHowItWorks?: () => void;
  /** ⚠️ THE HERO'S ONE SURVIVOR. The band head is where the ref puts a band's actions; the
   *  manuscript selector that briefly sat here is deleted (Phase 0) — it duplicated the sidebar's,
   *  and page-level scope never belonged to one band anyway. */
  sent?: number;
  /**
   * ⚠️ ARCHIVED ITEMS ARRIVE AS THEIR OWN LIST (F-H, D1/D3). They are never merged into the active
   * array, so the count above cannot see them whatever the toggle says.
   */
  archived: SubmissionPackage[];
  showArchived: boolean;
  onToggleArchived: () => void;
  onRestore: (id: string) => void | Promise<unknown>;
  /**
   * ⚠️ THE WAY FORWARD FROM A LOCKED PACKAGE (D-D2), AND IT SHIPS WITH THE LOCK. Without it the rule
   * is a dead end — the writer wanted a different combination and the app just refuses.
   */
  onDuplicatePackage?: (id: string) => void;
  /** Rendered per card when given — the archive/delete control. */
  renderRemove?: (pkg: SubmissionPackage) => React.ReactNode;
  /**
   * ⚠️ A RENDER PROP, following `renderRemove`'s own pattern (§3, ref 177 right panel). The derived
   * tracking block needs the page's agent lookup and its navigation, neither of which belongs to
   * this band — so the band says WHERE it goes and the page says what it is.
   */
  renderTracking?: (pkg: SubmissionPackage) => React.ReactNode;
}

export const PackagesBand: React.FC<PackagesBandProps> = ({
  packages, versions, queries, onOpenPackage, onNewPackage, onHowItWorks, sent, onDuplicatePackage, renderRemove, renderTracking,
  archived, showArchived, onToggleArchived, onRestore,
}) => {
  const tiles = packageTiles(packages, versions, queries);
  const byId = new Map(packages.map((p) => [p.id, p]));

  return (
    <section className="pkgb-band" aria-labelledby="pkgb-pkg-h">
      <div className="pkgb-bandhead">
        <h2 id="pkgb-pkg-h">Your packages</h2>
        <span className="pkgb-tag">
          {packages.length} built{typeof sent === "number" ? ` · ${sent} sent` : ""}
        </span>
        {/* ⚠️ IT CHANGES NOTHING, so it is the quietest control on the page — a ghost beside the
            count, never a filled button competing with the page's actual work. */}
        <ArchivedToggle n={archived.length} on={showArchived} onClick={onToggleArchived} />
        {/* ⚠️ THE CTA CAME WITH THE SELECTOR (D1). Losing the hero left `＋ New package` reachable
            only through the ghost card at the END of the grid — a primary action behind a scroll,
            which is a regression the hero was hiding. The ref puts a band's actions in its head. */}
        <button type="button" className="pkgb-newpkg" onClick={onNewPackage}>＋ New package</button>
        {onHowItWorks && (
          <button type="button" className="pkgb-how" onClick={onHowItWorks}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
                 strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8.5v.01" />
            </svg>
            How it works
          </button>
        )}
      </div>

      <div className="pkgb-pkggrid">
        {tiles.map((t) => {
          const foot = tileFooter(t);
          const pkg = byId.get(t.id);
          return (
            <div key={t.id} className="pkgb-pkgcard" data-package={t.id}>
              {/* ⚠️ THE ART PANEL IS THE CARD'S LID (D-B1) — blush, dashed slot, parcel. It is what
                  makes a package read as an OBJECT you built rather than a row in a register, which
                  is the whole difference between this and the band it replaces. */}
              <div className="pkgb-pkgart">
                <span className="pkgb-pkgslot">
                  <IllustrationSlot id={`pkg-art-${t.id}`} icon="parcel" px={56} shape="chip" />
                </span>
              </div>
              <div className="pkgb-pkgbody">
                <h3 className="pkgb-pkgname">
                  <button type="button" className="pkgb-sopen" onClick={() => onOpenPackage(t.id)}>
                    {t.name}
                  </button>
                </h3>
                {/* ⚠️ ONE LINE, AND AN OMITTED SLOT IS A QUIET CLAUSE IN IT — `no sample`, not
                    `Not included`. This is a sentence about what the package sends; `Not included`
                    is a stated choice and belongs in the builder's list, where it reads as a row. */}
                <div className="pkgb-pkgcomp">
                  {composition(t).map((part, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && " · "}
                      {part.held ? <b>{part.text}</b> : <span className="pkgb-none">{part.text}</span>}
                    </React.Fragment>
                  ))}
                </div>
                {t.other && <div className="pkgb-pkgother">{t.other}</div>}
                {pkg && isPackageLocked(pkg) && (
                  <div className="pkgb-locked">
                    <span className="pkgb-locked-note">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                      {LOCKED_NOTE}
                    </span>
                    <span className="pkgb-locked-why">{LOCKED_WHY}</span>
                    {onDuplicatePackage && (
                      <button type="button" className="pkgb-dup" onClick={() => onDuplicatePackage(t.id)}>
                        Duplicate &amp; edit
                      </button>
                    )}
                  </div>
                )}
                {/* ⚠️ THE SCORECARD IS THE CARD'S FOOTER (D-B3) — these three numbers used to live in
                    a separate "Replies by package" panel, which stated per-package figures three
                    inches from the packages they described. On the card there is only one place to
                    read them, so the two cannot come to disagree. */}
                {"idle" in foot ? (
                  <div className="pkgb-score pkgb-score--idle">{foot.idle}</div>
                ) : (
                  <div className="pkgb-score">
                    <span className="pkgb-sc"><span className="pkgb-n">{t.sent}</span><span className="pkgb-l">Sent</span></span>
                    <span className="pkgb-sc"><span className="pkgb-n">{t.replies}</span><span className="pkgb-l">Replied</span></span>
                    <span className="pkgb-sc"><span className="pkgb-n">{t.requests}</span><span className="pkgb-l">Requests</span></span>
                  </div>
                )}
                {pkg && renderRemove?.(pkg)}
              </div>
            </div>
          );
        })}

        {/**
          * ⚠️ ONE GHOST, LAST (D2). TWO rendered here — `.pkgb-ghost.pkgb-pkgghost` at 54px and
          * `.pkgb-ghostpkg` at 44px — both calling `onNewPackage`, with copy differing by one word
          * ("a different length of synopsis" against "a different synopsis").
          *
          * ⚠️ THE CAUSE IS NOT A DOUBLE-RENDER OR A DOUBLE-JOIN (F-AU). They are two hand-written
          * elements, one a superseded version of the other, left side by side when a later pass
          * added its replacement without deleting what it replaced. The near-identical copy is what
          * hid it: a reader skims the pair as one block. Third time in this build that a superseded
          * thing has survived beside its replacement.
          *
          * ⚠️ AND THEY SHARED `id="pkg-ghost"`, so the document carried a duplicate id — the hazard
          * this repo already records for components that gain a second mount.
          *
          * The smaller one survives: a ghost must read as quieter and shorter than a real card
          * (D10), or a populated page stops reading as populated.
          */}
        <button type="button" className="pkgb-ghostpkg" onClick={onNewPackage}>
          <IllustrationSlot id="pkg-ghost" icon="parcelOpen" px={44} shape="chip" />
          <span className="pkgb-gt">Build another package</span>
          <span className="pkgb-gs">A different letter, a different synopsis.</span>
        </button>
      </div>
      <ArchivedSection show={showArchived} n={archived.length}>
        {archived.map((p) => (
          <ArchivedRow key={p.id} name={p.packageName} onRestore={() => void onRestore(p.id)} />
        ))}
      </ArchivedSection>
    </section>
  );
};
