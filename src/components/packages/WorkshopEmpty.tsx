/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WorkshopEmpty — the Workshop tab's first-run screen (ref design-refs/scriptally-packages-empty.html).
 *
 * Shown when the manuscript has nothing yet. Everything on it is PRESENTATIONAL and DERIVED: the
 * active step comes from what exists (materials? packages?), never from stored progress, so there is
 * no first-run flag to go stale. It writes nothing.
 *
 * How the sections degrade (the partial states the ref doesn't draw):
 *   · nothing at all      → steps at 1, the three type cards, the ghost package grid, example band.
 *   · materials, no packages → the type-card section is REPLACED by the real sidebar+grid (materials
 *     have content, so they render normally); the steps strip advances to 2 and stays, because the
 *     job it describes isn't finished. Handled by the caller — this component covers the first case.
 *   · some types missing  → the type cards render for every type regardless, each showing its own
 *     count; a type with materials shows the count rather than 0 and loses the pulse.
 */
import React from "react";
import { ComponentType, ManuscriptVersion } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES } from "./typeMeta";

/** Copy per material type — the ref's, verbatim. */
const CARD_COPY: Record<string, { desc: string; eg: string; add: string }> = {
  [ComponentType.QUERY_LETTER]: {
    desc: "The pitch itself — your hook, your comps, your bio. The one piece every package needs.",
    eg: "e.g. “Character-led letter”",
    add: "＋ Add a query letter",
  },
  [ComponentType.SYNOPSIS]: {
    desc: "The whole story, ending included. Agencies ask for wildly different lengths — keep a one-page and a two-page.",
    eg: "e.g. “One-page synopsis”",
    add: "＋ Add a synopsis",
  },
  [ComponentType.SAMPLE_PAGES]: {
    desc: "First three chapters, first fifty pages, prologue-first — whatever an agency's guidelines ask for.",
    eg: "e.g. “Chapters 1–3”",
    add: "＋ Add sample pages",
  },
};

const STEPS = [
  { head: "Add your materials", desc: "Your query letter, synopsis and sample pages — written here or pasted in." },
  { head: "Bundle them into a package", desc: "Pick one of each. Build as many versions as you like." },
  { head: "Send it with a query", desc: "Replies land against the package, and the Analytics tab does the rest." },
];

const cubeIcon = (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" /><path d="M4 7l8 4 8-4M12 11v10" />
  </svg>
);

/** The active step, DERIVED: 1 while there are no materials, 2 once there are but no package, 3 after. */
export function activeStep(materialCount: number, packageCount: number): 1 | 2 | 3 {
  if (materialCount === 0) return 1;
  if (packageCount === 0) return 2;
  return 3;
}

/**
 * Which first-run screen the Workshop tab owes, derived from what exists. Named and exported so the
 * rule is testable and stated once, rather than living as two inline expressions.
 *
 * ⚠️ THE DRAFT CLAUSE. An unsaved draft counts as a package for this decision: you have one in
 * progress, so you get the grid, not the first-run screen. Without it, starting a package from the
 * empty state would bounce you straight back to the empty state.
 */
export type FirstRunState = "empty" | "packages-only" | "populated";
export function firstRunState(materialCount: number, packageCount: number, draftCount: number): FirstRunState {
  if (packageCount > 0 || draftCount > 0) return "populated";
  return materialCount === 0 ? "empty" : "packages-only";
}

export interface WorkshopEmptyProps {
  versions: ManuscriptVersion[];
  /** Open the materials editor on a given type (the same editor the sidebar's "Edit materials" opens). */
  onAddMaterial: (type: ComponentType) => void;
  /** Start a new package — the same action as the header's "＋ New package". */
  onNewPackage: () => void;
  /** The EXISTING guided tour over example data. Never a second tour path. */
  onTryExample: () => void;
  /** Rendered above the packages section when materials already exist (the partial state). */
  packagesOnly?: boolean;
}

export const WorkshopEmpty: React.FC<WorkshopEmptyProps> = ({ versions, onAddMaterial, onNewPackage, onTryExample, packagesOnly }) => {
  const step = activeStep(versions.length, 0);

  return (
    <>
      <div className="pkgw-steps">
        {STEPS.map((s, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          return (
            <div key={s.head} className={`pkgw-stp${n === step ? " now" : n > step ? " dim" : ""}`}>
              <span className="no">{n}</span>
              <span>
                <span className="sh2">{s.head}</span>
                <div className="sd">{s.desc}</div>
              </span>
            </div>
          );
        })}
      </div>

      {!packagesOnly && (
        <>
          <div className="gsec" style={{ marginTop: 0 }}>
            <h2>Start with your materials</h2>
            <span className="cn">NOTHING ADDED YET</span>
          </div>
          <div className="grule p" />
          <div className="pkgw-lead">
            You need at least a query letter to build a package. Most writers keep two or three versions of each
            piece, then test which combination agents respond to.
          </div>

          <div className="pkgw-mgrid">
            {BUILDER_TYPES.map((t) => {
              const count = versions.filter((v) => v.componentType === t).length;
              const copy = CARD_COPY[t];
              // Only the query letter pulses, and only while it's still missing — it is the one
              // material a package cannot exist without.
              const pulses = t === ComponentType.QUERY_LETTER && count === 0;
              return (
                <div key={t} className={`pkgw-mcard${pulses ? " first" : ""}`}>
                  <div className="pkgw-band band">
                    <span className="pkgw-pill">{TYPE_META[t].plural}</span>
                    <span className="zero">{count}</span>
                  </div>
                  <div className="bd">
                    <span className="tile"><TypeGlyph type={t} size={20} /></span>
                    <div className="mt">{TYPE_META[t].plural}</div>
                    <div className="md">{copy.desc}</div>
                    <div className="eg">{copy.eg}</div>
                    <button type="button" className="add" onClick={() => onAddMaterial(t)}>{copy.add}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="gsec" style={{ marginTop: packagesOnly ? 0 : 44 }}>
        <h2>Your packages</h2>
        <span className="cn">NONE YET</span>
      </div>
      <div className="grule" />
      <div className="pkgw-lead">
        Once you&rsquo;ve added materials, your packages will live here — each one showing what&rsquo;s inside it and
        how it&rsquo;s performing.
      </div>

      <div className="pkgw-pgrid">
        <button type="button" className="pkgw-ghost mk" onClick={onNewPackage}>
          <span className="mkin">
            <span className="plus" aria-hidden="true">＋</span>
            <span className="mkt" style={{ display: "block" }}>Create your first package</span>
            <span className="mks" style={{ display: "block" }}>Name it, pick one of each material, and it&rsquo;s ready to send.</span>
          </span>
        </button>
        {/* Decorative shells only — they mimic the real card so the shape is legible before any data
            exists. aria-hidden and non-focusable: there is nothing here to read or operate. */}
        {[62, 48].map((w, i) => (
          <div key={i} className="pkgw-ghost" aria-hidden="true">
            <div className="gband"><span className="gpill" /></div>
            <div className="gbd">
              <div className="gline" style={{ width: `${w}%` }} />
              {[150, 120, 96].map((bw, j) => (
                <div key={j} className="grow2"><span className="gt2" /><span className="gbar" style={{ maxWidth: bw - i * 18 }} /></div>
              ))}
            </div>
            <div className="gfoot" />
          </div>
        ))}
      </div>
      <div className="pkgw-gcap"><span className="dsh" />This is the shape a package takes — three materials, a status, and its own results.</div>

      <div className="pkgw-exband">
        <span className="ic">{cubeIcon}</span>
        <span className="ext">
          <b>Rather see it working first?</b>
          Load a worked example — three finished packages with a fortnight of agent replies — and click around.
          Nothing is saved to your account.
        </span>
        <button type="button" className="go" onClick={onTryExample}>Try it with example data →</button>
      </div>
    </>
  );
};
