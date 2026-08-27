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
import type { BookVersion } from "../../types";
import PARCEL_MARK from "../../assets/packages/package-mark.png";
import React, { useState } from "react";
import { nextSort, sortRows, sortArrow, barPct, type SortState, type SortKey } from "../../lib/ledgerSort";
import { ManuscriptVersion, Query, SubmissionPackage } from "../../types";
import { packageTiles, tileFooter, composition, type PackageTile } from "../../lib/packagesOverview";
import { isPackageLocked } from "../../lib/packageMetrics";
import { packageStamp } from "../../lib/packageTracking";
import { IllustrationSlot } from "./IllustrationSlot";
import { CardBand } from "./CardBand";
import { SectionHeader } from "../containers/SectionHeader";
import "./packagesBroadsheet.css";

export interface PackagesBandProps {
  /** The manuscript's orderings — the ledger's version column resolves against these. */
  bookVersions?: readonly BookVersion[];
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
  /**
   * Cross-highlighting (D19). The chip currently hovered in the rail, as `{kind, id}`, or null.
   *
   * ⚠️ POINTER-ONLY IS ACCEPTABLE HERE, AND THAT IS A DECISION RATHER THAN AN OVERSIGHT (D20).
   * The app rejected hover-to-REVEAL elsewhere, because a fact only reachable by hovering is a fact
   * some readers never get. This reveals NOTHING that is not already on screen: every row and every
   * chip is fully readable without it, and the highlight only makes an existing relationship
   * quicker to see. Adding a click would make "where is this used" a MODE the reader has to enter
   * and leave — worse than the thing it fixed. Do not "fix" this by adding one.
   */
  hoverChip?: { kind: string; id: string } | null;
  /** A ledger cell being hovered drives the rail the other way. */
  onHoverCell?: (v: { kind: string; id: string } | null) => void;
  /** Rendered per card when given — the archive/delete control. */
  renderRemove?: (pkg: SubmissionPackage) => React.ReactNode;
  /**
   * ⚠️ A RENDER PROP, following `renderRemove`'s own pattern (§3, ref 177 right panel). The derived
   * tracking block needs the page's agent lookup and its navigation, neither of which belongs to
   * this band — so the band says WHERE it goes and the page says what it is.
   */
  renderTracking?: (pkg: SubmissionPackage) => React.ReactNode;
}

/** The parcel in the name column. 26px per the ref — above the 20px stroke floor (F-BE). */
export const LEDGER_MARK_PX = 26;

export const PackagesBand: React.FC<PackagesBandProps> = ({
  packages, versions, queries, bookVersions = [], hoverChip = null, onHoverCell, onOpenPackage, onNewPackage, onHowItWorks, sent, onDuplicatePackage, renderRemove, renderTracking,
  archived, showArchived, onToggleArchived, onRestore,
}) => {
  const tiles = packageTiles(packages, versions, queries, bookVersions);

  const [sort, setSort] = useState<SortState | null>(null);
  /**
   * ⚠️ THE ROWS AND THE PACKAGES ARE SORTED TOGETHER, because the row's own controls resolve
   * against `byId` rather than an index — but the SCALE MAXIMA are taken before sorting, from the
   * whole set. A maximum computed after a sort is the same number; computed per render over a
   * filtered set it would not be, and this is the place that would go wrong first.
   */
  const maxima = {
    sent: Math.max(...tiles.map((t) => t.sent), 0),
    replies: Math.max(...tiles.map((t) => t.replies), 0),
    requests: Math.max(...tiles.map((t) => t.requests), 0),
  };
  const rows = sortRows(tiles, sort);

  /** Which slot of a row matches the hovered chip — the row lights when any does (D19). */
  const rowUses = (t: PackageTile): boolean => {
    if (!hoverChip) return false;
    const p = byId.get(t.id);
    if (!p) return false;
    return hoverChip.kind === "let" ? p.queryLetterVersionId === hoverChip.id
      : hoverChip.kind === "syn" ? p.synopsisVersionId === hoverChip.id
        : p.bookVersionId === hoverChip.id;
  };
  const byId = new Map(packages.map((p) => [p.id, p]));

  return (
    <section className="pkgb-band" aria-labelledby="pkgb-pkg-h">
      <SectionHeader
        tick
        headingId="pkgb-pkg-h"
        title="Your packages"
        meta={`${packages.length} built${typeof sent === "number" ? ` · ${sent} sent` : ""}`}
        actions={<>{/**
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
        </>}
      />

      {/**
        * ⚠️ THE LEDGER (D12) — a table, because the question it answers is a comparison.
        *
        * The cards were a grid of objects: to ask "which combination is drawing requests" you had
        * to hold three numbers from one card in your head while you read the next. Ruled rows put
        * every package's letter, synopsis, version and three counts on one line, in fixed columns,
        * so the comparison is a glance down a column rather than an act of memory.
        *
        * ⚠️ RULES, NOT CELLS OR STRIPES. One hairline under each row and one under the heads; no
        * vertical borders, no alternating fill. A ruled table reads as a ledger; a bordered one
        * reads as a spreadsheet, and a striped one puts a second, meaningless grouping over the
        * real one.
        *
        * ⚠️ AND IT IS A REAL `<table>`. These are seven columns of one record — the semantics are
        * the accessibility, and a grid of divs would need row and column roles reinvented to say
        * what `<th>` already says.
        */}
      <div className="pkgb-ledgerwrap">
        <table className="pkgb-ledger">
          <thead>
            <tr>
              <th className="pkgb-lfirst">Package</th>
              <th>Covering letter</th>
              <th>Synopsis</th>
              <th>Version</th>
              {/* ⚠️ THE COUNT HEADS SORT (D21), and they are BUTTONS inside the `th` rather than a
                  click handler on the cell — a sortable column that only a mouse can reach is the
                  same fault as a mouse-only build path, one surface along. */}
              {(["sent", "replies", "requests"] as const).map((k) => (
                <th key={k} className={`pkgb-lnum${sort?.key === k ? " pkgb-lsorted" : ""}`}
                    aria-sort={sort?.key === k ? (sort.desc ? "descending" : "ascending") : "none"}>
                  <button type="button" className="pkgb-lsort" data-sort={k}
                          onClick={() => setSort((c) => nextSort(c, k))}>
                    {k === "sent" ? "Sent" : k === "replies" ? "Replied" : "Requests"}
                    <span className="pkgb-lar" aria-hidden="true">{sortArrow(sort, k)}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const foot = tileFooter(t);
              const pkg = byId.get(t.id);
              const locked = !!pkg && isPackageLocked(pkg);
              const parts = composition(t);
              return (
                <tr key={t.id} data-package={t.id} onClick={() => onOpenPackage(t.id)}
                    className={hoverChip ? (rowUses(t) ? "pkgb-lit" : "pkgb-dim") : undefined}>
                  <td className="pkgb-lfirst">
                    <span className="pkgb-pname">
                      {/* ⚠️ 26px, AND THE SAME ASSET THE STRIP USES. A second drawing of a parcel is
                          a second answer to what a package looks like. */}
                      <img src={PARCEL_MARK} alt="" width={LEDGER_MARK_PX} height={LEDGER_MARK_PX} />
                      <span className="pkgb-ptx">
                        <b>{t.name}</b>
                        {/**
                          * ⚠️ THE FREE-TEXT LINE KEEPS A HOME, AND THIS IS THE ONLY ONE LEFT. The
                          * ledger has no column for it — it is not a slot — and the drawer does not
                          * render it either, so dropping it with the card would have made something
                          * the writer typed invisible everywhere in the app. It sits under the name
                          * because that is where a note about THIS package belongs.
                          */}
                        {t.other && <span className="pkgb-pother">{t.other}</span>}
                        {/* ⚠️ THE LOCK IS A SUB-LINE, AND THE WAY ON IS THE DRAWER'S. The card's
                            lock line carried a sentence and a Duplicate button; in a ruled row a
                            sentence is a second row's worth of height on every sent package, and
                            Duplicate already lives in the drawer's footer. */}
                        {locked && <span className="pkgb-pst">Locked · sent with {t.sent}</span>}
                      </span>
                      {/**
                        * ⚠️ `DUPLICATE & EDIT` ON ROW HOVER (D22) — the way forward from a locked
                        * package, which the drawer also offers. It is a real BUTTON that stops the
                        * row's own click, not a styled span: the row opens the reader, and a
                        * control inside it that fell through to that would answer a different
                        * question from the one it asks.
                        *
                        * ⚠️ AND IT IS NOT HOVER-TO-REVEAL IN THE SENSE THIS APP REJECTS. It is an
                        * ACTION, available from the drawer on every package; hovering only brings
                        * it closer. Nothing here is the only route to a fact.
                        */}
                      {onDuplicatePackage && (
                        <button type="button" className="pkgb-rowdup"
                                onClick={(e) => { e.stopPropagation(); onDuplicatePackage(t.id); }}>
                          Duplicate &amp; edit
                        </button>
                      )}
                    </span>
                  </td>
                  {parts.map((part, i) => {
                    const kind = (["let", "syn", "ver"] as const)[i];
                    const p = byId.get(t.id);
                    /* the id this cell names, so hovering it can light the matching chip (D19) */
                    const cellId = !p ? "" : kind === "let" ? p.queryLetterVersionId
                      : kind === "syn" ? p.synopsisVersionId : (p.bookVersionId ?? "");
                    return (
                    <td key={i}
                        onMouseEnter={() => cellId && onHoverCell?.({ kind, id: cellId })}
                        onMouseLeave={() => onHoverCell?.(null)}>
                      {/* ⚠️ THE VERSION IS TINTED, THE MATERIALS ARE NOT — it is the one cell naming
                          a thing that lives on the manuscript rather than in this package. */}
                      <span className={`pkgb-slotv${i === 2 ? " pkgb-slotv--ver" : ""}${part.held ? "" : " pkgb-slotv--none"}`}>
                        {part.text}
                      </span>
                    </td>
                    );
                  })}
                  {"idle" in foot ? (
                    /* ⚠️ ONE CELL ACROSS THE THREE COUNT COLUMNS. Three zeros would be three true
                       figures that together state something false — that this package has been
                       tried and drew nothing. It has not been sent. */
                    <td className="pkgb-lnum pkgb-lidle" colSpan={3}>{foot.idle}</td>
                  ) : (
                    <>
                      {/* ⚠️ THE BAR IS A PROPORTION OF ITS OWN COLUMN'S MAXIMUM (D21), never the
                          table's. `Sent` and `Requests` are different quantities; one scale would
                          draw them as comparable and invite a comparison that means nothing.
                          ⚠️ AND THE NUMBER IS THE CLAIM. The bar exists so the eye can rank three
                          rows at a glance; it carries no figure of its own and is `aria-hidden`. */}
                      {(["sent", "replies", "requests"] as const).map((k) => (
                        <td key={k} className={`pkgb-lnum${t[k] === 0 ? " pkgb-lzero" : ""}${k === "requests" ? " pkgb-linb" : ""}`}>
                          <span className="pkgb-lv">{t[k]}</span>
                          {maxima[k] > 0 && (
                            <span className="pkgb-lbar" aria-hidden="true">
                              <i style={{ width: `${barPct(t[k], maxima[k])}%` }} />
                            </span>
                          )}
                        </td>
                      ))}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
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
          {/* ⚠️ A FULL-WIDTH LAST ROW (D12), in its own `tbody` so it carries no rule. In the grid
              the ghost was a card among cards; in a ledger a card-shaped thing beside ruled rows
              reads as a row that has gone wrong. Spanning every column says "this is not a
              package, it is how you make one". */}
          <tbody className="pkgb-ghostrow">
            <tr>
              <td colSpan={7}>
                <button type="button" className="pkgb-ghostpkg" onClick={onNewPackage}>
                  {/* ⚠️ `bare` — NO DASHED RIM (D7). The plate's dashed border says "artwork
                      pending", which is true of the inventory and not of a page a writer is
                      reading. The mark stays; the commission chrome does not. */}
                  <IllustrationSlot id="pkg-ghost" icon="parcelOpen" px={44} shape="bare" />
                  <span className="pkgb-gt">Build another package</span>
                  <span className="pkgb-gs">A different letter, a different synopsis.</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ArchivedSection show={showArchived} n={archived.length}>
        {archived.map((p) => (
          <ArchivedRow key={p.id} name={p.packageName} onRestore={() => void onRestore(p.id)} />
        ))}
      </ArchivedSection>
    </section>
  );
};
