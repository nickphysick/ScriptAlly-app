/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The onboarding header — wordmark left, spine centre, a quiet exit right (ref:
 * design-refs/scriptally-onboarding-chrome-options.html, option B).
 *
 * ⚠️ THE DEFECT THIS FIXES IS THE EXIT'S PROMINENCE. What shipped had "Skip setup" as the ONLY
 * thing above the card — no wordmark, no position, no end in sight — so the loudest element on a
 * writer's first screen was the way out of the product. It is now a quiet underlined link in the
 * right-hand slot, and the two things that ground you (you are in ScriptAlly; here is how far is
 * left) are the ones with visual weight.
 *
 * ⚠️ IT IS NOT `MarketingShell`. The ref calls this `mk-head`, and the marketing tier's real
 * component takes no centre slot — it takes `{user, onNavigate, path, children}` and renders
 * auth-aware CTAs and the Features/About/Pricing/Contact links, none of which belong above a
 * signup flow. This is the same GRAMMAR built standalone, which is the skip-and-continue gate the
 * brief anticipated. Nothing about the marketing header is modified.
 *
 * ⚠️ NO `id` ON THE WORDMARK. `ScriptAllyLogo`'s DOM id is a prop precisely because two mounts
 * already carry it and `getElementById` returns whichever comes first; a third would silently
 * become the one an inspection measures.
 */

import React from "react";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { OnboardingSpine } from "./OnboardingSpine";
import { SpineStep } from "../../lib/onboardingSpine";

export const OnboardingHeader: React.FC<{
  /** Absent on the auth screens — they are not in the flow yet, so they show no position. */
  steps?: SpineStep[];
  activeIndex?: number;
  /** Absent on the handover, which has nothing left to skip. */
  onExit?: () => void;
  /** Verbatim from the ref. */
  exitLabel?: string;
}> = ({ steps, activeIndex = 0, onExit, exitLabel = "Skip for now" }) => (
  <header className="ob-head">
    <div className="ob-headbrand">
      <ScriptAllyLogo heightPx={26} />
    </div>

    {/* The centre slot. Empty on auth — the grid keeps its three columns either way, so the
        wordmark does not drift to the middle when there is no spine. */}
    <div className="ob-headmid">
      {steps && steps.length > 0 && <OnboardingSpine steps={steps} activeIndex={activeIndex} />}
    </div>

    <div className="ob-headright">
      {onExit && (
        <button type="button" className="ob-headexit" onClick={onExit}>
          {exitLabel}
        </button>
      )}
    </div>
  </header>
);
