/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE PACKAGE DRAWER — clicking a card opens the thing ══════════════════════════════════════
 *
 * Design authority: design-refs/package-drawer.html.
 *
 * ⚠️ NOT `PackagesDrawer`, WHICH IS THE "HOW IT WORKS" EXPLAINER. The two names differ by one
 * letter, which is precisely the near-identical-sibling hazard this repo records — so this one is
 * `PackageDetailDrawer` and the file header says what the other one is. If you are about to edit
 * one of them, check which.
 *
 * ⚠️ IT REUSES `Form11Drawer`, THE SAME PRIMITIVE THE EXPLAINER SITS ON. That component owns the
 * scrim, the slide, the Escape and the outside-click; a second drawer implementation would own four
 * more copies of all of it.
 *
 * ⚠️ WHAT IT ADDS THAT NOTHING ELSE CAN: the OPENING LINES of each material — so a writer can tell
 * which letter this is without opening it — and WHO HOLDS IT, which the scorecard's "6 sent" has
 * never been able to answer.
 *
 * ⚠️ IT READS; IT DOES NOT EDIT (D16). The only actions are in the footer. Editing here would need a
 * draft, a discard and a dirty check, and would stop this being the cheap answer to "what is this?"
 */
import React, { useRef } from "react";
import { Form11Drawer, type Form11DrawerHandle } from "../Form11Drawer";
import { StatusDot } from "../StatusDot";
import { CardBand, BAND_CLASS } from "./CardBand";
import {
  drawerSlots, drawerHolders, drawerReturns, returnsLine, LOCK_FOOTNOTE,
} from "../../lib/packageDrawer";
import { isPackageLocked } from "../../lib/packageMetrics";
import { shortDate } from "../../lib/createSummary";
import type { Agent, BookVersion, ManuscriptVersion, Query, SubmissionPackage } from "../../types";
import "./packageDetailDrawer.css";

export interface PackageDetailDrawerProps {
  pkg: SubmissionPackage | null;
  materials: readonly ManuscriptVersion[];
  bookVersions: readonly BookVersion[];
  queries: readonly Query[];
  agents: readonly Agent[];
  onClose: () => void;
  onOpenMaterial: (id: string) => void;
  /** Sent packages duplicate; unsent ones edit (D15). */
  onDuplicate: (id: string) => void;
  onEdit: (id: string) => void;
  onArchive: (id: string) => void;
}

export const PackageDetailDrawer: React.FC<PackageDetailDrawerProps> = ({
  pkg, materials, bookVersions, queries, agents, onClose, onOpenMaterial, onDuplicate, onEdit, onArchive,
}) => {
  const ref = useRef<Form11DrawerHandle>(null);
  if (!pkg) return null;

  const locked = isPackageLocked(pkg);
  const slots = drawerSlots(pkg, materials, bookVersions);
  const holders = drawerHolders(pkg.id, queries, agents);
  const returns = drawerReturns(pkg.id, queries);

  return (
    <Form11Drawer
      ref={ref}
      isOpen
      onClose={onClose}
      width={472}
      tabLabel={`the package ${pkg.packageName}`}
      header={
        /**
         * ⚠️ THE HEAD REPEATS THE CARD'S BAND, IN THE SAME BLUE (D9) — so opening reads as the card
         * enlarging rather than as arriving somewhere else. It is `CardBand`, the same component the
         * card itself renders; a hand-drawn copy would drift the day the band is retoned.
         */
        <div className={`pkgdd-head ${BAND_CLASS.package}`}>
          <button type="button" className="pkgdd-x" aria-label="Close"
                  onClick={() => ref.current?.close(false)}>×</button>
          <CardBand kind="package" right={locked ? "Locked" : undefined} />
          <h2>{pkg.packageName}</h2>
          {/* The scorecard sits directly beneath the band, larger than the card's (D9). */}
          <div className="pkgdd-score">
            {([["Sent", returns.sent], ["Replied", returns.replied], ["Requests", returns.requests]] as const)
              .map(([k, v]) => (
                <div key={k} className="pkgdd-scell"><b>{v}</b><span>{k}</span></div>
              ))}
          </div>
        </div>
      }
      footer={
        <div className="pkgdd-foot">
          {/* ⚠️ D15 — A SENT PACKAGE DUPLICATES; AN UNSENT ONE EDITS. The lock is what decides, so
              the footer cannot offer an edit the rules would deny. */}
          {locked
            ? <button type="button" className="pkgdd-act" onClick={() => onDuplicate(pkg.id)}>Duplicate &amp; edit</button>
            : <button type="button" className="pkgdd-act" onClick={() => onEdit(pkg.id)}>Edit</button>}
          <button type="button" className="pkgdd-act" onClick={() => onArchive(pkg.id)}>Archive</button>
          <button type="button" className="pkgdd-close" onClick={() => ref.current?.close(false)}>Close</button>
        </div>
      }
    >
      <div className="pkgdd-body">
        {/**
          * ⚠️ THE DRAWER'S REASON TO EXIST (D10). Each slot in its own type colour, with the
          * material's opening lines — recognising a letter without opening it.
          */}
        <h3 className="pkgdd-sec">What&rsquo;s in it</h3>
        {slots.map((s) => (
          <div key={s.type} className={`pkgdd-slot ${BAND_CLASS[s.type]}`}>
            <CardBand kind={s.type} right={s.words ?? undefined} />
            <div className="pkgdd-slotbody">
              {s.name ? (
                <>
                  <div className="pkgdd-slotname">
                    {s.name}
                    {/**
                      * ⚠️ D11 — THE VERSION CHIP, INHERITED THROUGH THE SAMPLE. There is no version
                      * field on the package model, the builder, the card or the rules: the package
                      * reaches its opening by way of the material it holds, which is the one edge
                      * that stops the two ever disagreeing.
                      */}
                    {s.versionName && (
                      <span className="pkgb-mver"><span aria-hidden="true">§</span>{s.versionName}</span>
                    )}
                  </div>
                  {/* ⚠️ CLAMPED BY CSS, NOT BY SUBSTRING — see `drawerSlots`. */}
                  {s.opening && <p className="pkgdd-open">{s.opening}</p>}
                  {s.materialId && (
                    <button type="button" className="pkgdd-omat"
                            onClick={() => onOpenMaterial(s.materialId!)}>Open material ›</button>
                  )}
                </>
              ) : (
                /* ⚠️ AN EMPTY SLOT IS A ROW THAT SAYS SO. One that vanished would state nothing. */
                <p className="pkgdd-none">Not included</p>
              )}
            </div>
          </div>
        ))}

        {/**
          * ⚠️ D15 — AN UNSENT PACKAGE GETS THE SAME DRAWER MINUS WHAT DOES NOT EXIST. No holders, no
          * returns, no lock footnote: not greyed, not "0 sent", ABSENT. A section stating zero about
          * something that has never happened is chrome pretending to be a fact.
          */}
        {holders.length > 0 && (
          <>
            <h3 className="pkgdd-sec">Who has it</h3>
            <div className="pkgdd-holders">
              {holders.map((h) => (
                <div key={h.queryId} className="pkgdd-hrow">
                  {/* the real component, never a recreation */}
                  <StatusDot status={h.status} overrideSize={13} />
                  <span className="pkgdd-hagent">
                    {h.agent}
                    {h.agency && <em>{h.agency}</em>}
                  </span>
                  <span className="pkgdd-hsent">
                    {h.sentDate ? `Sent ${shortDate(h.sentDate)}` : "Date not recorded"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {returns.sent > 0 && (
          <>
            <h3 className="pkgdd-sec">What came back</h3>
            {/**
              * ⚠️ ONE LINE, NOT THREE BARS (D13). The ref draws a row per material and all three read
              * the same, because every material in a package rides the same sends — identical rows
              * are true, look broken, and invite a hunt for a difference that cannot exist. The
              * package is the unit that was sent, so the package is the unit that reports.
              */}
            <p className="pkgdd-returns">{returnsLine(returns)}</p>
          </>
        )}

        {/* ⚠️ D14 — THE LOCK IS A FOOTNOTE WITH ITS REASON, under the figures it protects. */}
        {locked && <p className="pkgdd-lock">{LOCK_FOOTNOTE}</p>}
      </div>
    </Form11Drawer>
  );
};
