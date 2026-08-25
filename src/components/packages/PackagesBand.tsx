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
import { isPackageLocked } from "../../lib/packageMetrics";
import { packageStamp } from "../../lib/packageTracking";
import { IllustrationSlot } from "./IllustrationSlot";
import { CardBand } from "./CardBand";
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
        {/**
          * ⚠️ THE ACTIONS ARE A GROUP, IN A RULED ORDER (D3): How it works · Show archived ·
          * ＋ New package.
          *
          * ⚠️ `Show archived` SITS WITH THEM AND IS THE QUIETEST OF THE THREE. It modifies what the
          * band DISPLAYS rather than acting on the page, so it belongs in the group without
          * competing with the two that do something — and it already carries the quietest
          * treatment, which the re-order preserves rather than restyles.
          *
          * ⚠️ AND THE GROUP TAKES THE `margin-left: auto`, not its members. Three controls each
          * claiming auto would push only the first of them right and leave the rest trailing it.
          */}
        <span className="pkgb-bandacts">
          {onHowItWorks && (
            <button type="button" className="pkgb-how" onClick={onHowItWorks}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
                   strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8.5v.01" />
              </svg>
              How it works
            </button>
          )}
          <ArchivedToggle n={archived.length} on={showArchived} onClick={onToggleArchived} />
          {/* ⚠️ THE BAND'S PRIMARY ACTION, AND IT GENUINELY ACTS ON THIS BAND (D0d) — which is why
              it stayed when the manuscript selector beside it did not. */}
          <button type="button" className="pkgb-newpkg" onClick={onNewPackage}>＋ New package</button>
        </span>
      </div>

      <div className="pkgb-pkggrid">
        {tiles.map((t) => {
          const foot = tileFooter(t);
          const pkg = byId.get(t.id);
          return (
            <div key={t.id} className="pkgb-pkgcard pkgb-t-pkg" data-package={t.id}>
              {/**
                * ⚠️ THE ART PANEL IS DELETED, AND ITS GLYPH MOVES INTO A BAND HEAD (D4/D7). The panel
                * was a blush block with a dashed 56px slot, and it is the element that made the card
                * mostly decoration: half the card's height carrying no information. The band head
                * says the same thing — this is a package — in 16px, and colours the card by type
                * while it does so.
                *
                * ⚠️ AND THE GLYPH IS SOLID (D12). A dashed plate on a user-facing card is a
                * commission slot; at 16px this is an icon. The mockups and the artist's inventory
                * keep dashed, the served page does not.
                */}
              {/* ⚠️ THE SAME COMPONENT THE MATERIAL CARDS AND THE LEGEND RENDER. This head used to
                  hand-write its own parcel `<svg>` while the material cards went through
                  `TypeGlyph` — two ways of drawing one band head, before a legend asked for a
                  third. */}
              <CardBand kind="package" right={pkg && isPackageLocked(pkg) ? "Locked" : undefined} />
              <div className="pkgb-pkgbody">
                <h3 className="pkgb-pkgname">
                  <button type="button" className="pkgb-sopen" onClick={() => onOpenPackage(t.id)}>
                    {t.name}
                  </button>
                </h3>
                {/* ⚠️ ONE LINE, AND AN OMITTED SLOT IS A QUIET CLAUSE IN IT — `no sample`, not
                    `Not included`. This is a sentence about what the package sends; `Not included`
                    is a stated choice and belongs in the builder's list, where it reads as a row. */}
                {/**
                  * ⚠️ ROWS, NOT A COMMA SENTENCE (D6). The line used to read
                  * `Hook-first · One-page · no sample`, which is a sentence about what the package
                  * sends — fine in prose and unscannable in a grid, because the eye cannot tell
                  * which slot a value belongs to without reading the order.
                  *
                  * ⚠️ AND AN OMITTED SLOT IS MUTED ITALIC, not a quiet word in the sentence. The row
                  * already names the slot, so the value states the choice: `Not included`.
                  */}
                {composition(t).map((part, i) => (
                  <div className="pkgb-slotline" key={i}>
                    <span className="pkgb-sl">{part.label}</span>
                    <span className={`pkgb-sv${part.held ? "" : " pkgb-sv--none"}`}>{part.text}</span>
                  </div>
                ))}
                {t.other && <div className="pkgb-pkgother">{t.other}</div>}
                {/**
                  * ⚠️ ONE FOOTNOTE LINE (D8). The grey box carried `LOCKED_NOTE` over `LOCKED_WHY`
                  * — two sentences explaining a rule beside a card the writer is not editing. The
                  * line states the fact and offers the way forward; the DRAWER is where the lock
                  * explains itself, which is the one place the reason is being asked for.
                  */}
                {pkg && isPackageLocked(pkg) && (
                  <div className="pkgb-lockline">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    <span>Contents fixed — sent with {t.sent}</span>
                    {onDuplicatePackage && (
                      <button type="button" className="pkgb-dup" onClick={() => onDuplicatePackage(t.id)}>
                        Duplicate ›
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
          {/* ⚠️ `bare` — NO DASHED RIM (D7). The plate's dashed border says "artwork pending", which is
                 true of the inventory and not of a page a writer is reading. The mark stays; the
                 commission chrome does not. */}
            <IllustrationSlot id="pkg-ghost" icon="parcelOpen" px={44} shape="bare" />
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
