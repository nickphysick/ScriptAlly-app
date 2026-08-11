/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Comparable titles pane. Reference: design-refs/manuscripts-plate.html, `#pane-comps`.
 *
 * ⚠️ THIS TAB IS FREE, IN FULL. The shelf, the pitch box and the add tile are not gated and carry
 * no chip. Only THE SCOUT is Pro — it is the one genuinely gated thing on this page.
 *
 * ⚠️ THE STRIP HOLDS THE SAME SLOT ON EVERY PLAN AND IN EVERY STATE, so upgrading changes what a
 * strip says rather than what shape the page is. Three states, and two of them must not look alike:
 *
 *   FREE          → an OFFER. Pro chip, what the Scout does, `See how it works` + `Upgrade`.
 *   PRO + live    → a TOOL. No chip, one `Find comps` primary.
 *   PRO + down    → an OUTAGE. No chip, no offer, a mono `UNAVAILABLE` tag, a plain sentence and a
 *                   disabled button.
 *
 * ⚠️ THE OUTAGE MUST NOT WEAR THE OFFER'S CLOTHES. A paying user seeing a chip and an Upgrade
 * button because a function is undeployed is being sold something they already bought; a free user
 * seeing "unavailable just now" is being told a temporary lie about a permanent state. They are
 * different facts and they get different treatments.
 *
 * ⚠️ NO FABRICATED LAST-RUN LINE. The ref's Pro strip reads "Last run 2 August — 6 suggestions,
 * 3 added." NO FIELD ANYWHERE STORES THAT. The sentence renders without it rather than inventing a
 * history; `lastRun` exists as a prop so the day a real field lands it has somewhere to go.
 *
 * ⚠️ PROPS ONLY, AND IT EDITS NOTHING ITSELF. Add and remove are callbacks; the writes go through
 * the caller and the pure `withCompAdded`/`withCompRemoved`. See the report — whether this pane
 * and /manuscripts/comps can both stay live is a Phase 6 decision, not one this file makes.
 */
import React, { useEffect, useState } from "react";
import { CompTitle } from "../../types";
import { isOlderComp, pitchLine, pitchLineText } from "../../lib/comps";
import { PITCH_LABEL, PITCH_NEEDS_ONE, PITCH_NEEDS_TWO } from "../../lib/manuscriptTiles";
import { MagnifierMark } from "./manuscriptMarks";
import "./manuscriptPlate.css";

/** How long `Copy` reads `Copied` before it changes back. */
export const COPIED_MS = 1400;

export const SCOUT_BLURB =
  "Searches recent published fiction for titles that match this manuscript's category, genre and tone, with a note on why each one comps.";
export const SCOUT_DOWN = "The Scout is unavailable just now. Nothing has been lost — try again shortly.";

/** `L. Okafor · 2024`, dropping whichever half is absent, and the whole line when both are. */
export function compMetaLine(c: CompTitle): string | null {
  const parts = [c.author, typeof c.year === "number" ? String(c.year) : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export interface ManuscriptCompsPaneProps {
  comps: CompTitle[];
  /** `isProUser(currentUser)` — the ONE Pro predicate. Gates the Scout and nothing else here. */
  isPro: boolean;
  /** `scoutLive()` — whether the callable is actually reachable. Free users never see this state. */
  scoutAvailable: boolean;
  currentYear: number;
  /** Only rendered if a real field asserts it. There is no such field today. */
  lastRun?: string;
  onAddComp?: () => void;
  onRemoveComp?: (index: number) => void;
  onCopyPitch?: (text: string) => void;
  onFindComps?: () => void;
  onSeeHowItWorks?: () => void;
  onUpgrade?: () => void;
}

export const ManuscriptCompsPane: React.FC<ManuscriptCompsPaneProps> = ({
  comps,
  isPro,
  scoutAvailable,
  currentYear,
  lastRun,
  onAddComp,
  onRemoveComp,
  onCopyPitch,
  onFindComps,
  onSeeHowItWorks,
  onUpgrade,
}) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(t);
  }, [copied]);

  const pitch = pitchLine(comps);
  const pitchText = pitchLineText(comps);

  return (
    <div className="msv-padbody">
      {/* ── the pitch box ── */}
      <div className="msv-pitchbox">
        <div className="msv-pitchbody">
          <div className="msv-btilelab">{PITCH_LABEL}</div>
          {pitch.kind === "two" ? (
            <div className="msv-pitchline">
              <i>{pitch.a}</i><span className="msv-pitchm">meets</span><i>{pitch.b}</i>
            </div>
          ) : (
            /* Incomplete: the same threshold sentence the Details tile states. One wording. */
            <div className="msv-pitchwait">{pitch.kind === "one" ? PITCH_NEEDS_ONE : PITCH_NEEDS_TWO}</div>
          )}
        </div>
        {/* No line, nothing to copy — the control is absent rather than present and inert. */}
        {pitchText && (
          <button
            type="button"
            className="msv-linkline msv-pitchcopy"
            onClick={() => { onCopyPitch?.(pitchText); setCopied(true); }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      {/* ── the shelf ── */}
      <div className="msv-compgrid">
        {comps.map((c, i) => {
          const meta = compMetaLine(c);
          return (
            <div key={`${c.title}-${i}`} className="msv-comp">
              {/* The spine rotates through three accents by position — decorative, and in Editorial
                  three VALUES rather than three hues. */}
              <span className={`msv-compsp s${(i % 3) + 1}`} />
              <button
                type="button"
                className="msv-compx"
                aria-label={`Remove ${c.title}`}
                onClick={() => onRemoveComp?.(i)}
              >
                ×
              </button>
              <div className="msv-compt">{c.title}</div>
              {meta ? <div className="msv-compa">{meta}</div> : null}
              {isOlderComp(c.year, currentYear) ? <span className="msv-oldchip">Older comp</span> : null}
              {c.note ? <div className="msv-compn">{c.note}</div> : null}
            </div>
          );
        })}
        <button type="button" className="msv-addcomp" onClick={onAddComp}>＋ Add a comp</button>
      </div>

      {/* ── The Scout — one slot, three states ── */}
      <div className={`msv-offer${!isPro ? " msv-offer-free" : scoutAvailable ? "" : " msv-offer-down"}`}>
        <MagnifierMark size={46} />
        <div className="msv-offerbody">
          <div className="msv-offert">
            The Scout
            {!isPro && <span className="msv-prochip">Pro</span>}
            {isPro && !scoutAvailable && <span className="msv-outtag">Unavailable</span>}
          </div>
          <div className="msv-offerd">
            {isPro && !scoutAvailable ? SCOUT_DOWN : SCOUT_BLURB}
            {/* Only when a real field says so. Today nothing does, and nothing is invented. */}
            {isPro && scoutAvailable && lastRun ? ` ${lastRun}` : ""}
          </div>
        </div>
        <div className="msv-offeracts">
          {!isPro ? (
            <>
              <button type="button" className="msv-btn sm" onClick={onSeeHowItWorks}>See how it works</button>
              <button type="button" className="msv-btn sm msv-primary" onClick={onUpgrade}>Upgrade</button>
            </>
          ) : (
            <button
              type="button"
              className="msv-btn sm msv-primary"
              disabled={!scoutAvailable}
              onClick={onFindComps}
            >
              Find comps
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
