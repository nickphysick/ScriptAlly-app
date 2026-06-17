/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DEV PREVIEW (Prompt 2) — temporary. A reachable place to exercise the email-import UI before the
 * commit step and a live deployment exist:
 *   · the live PasteEmailButton (Pro → flow, Free → upsell, per your real plan),
 *   · the entry-button visual in both Pro and Free states,
 *   · the review screen rendered from canned sample proposals (no function needed).
 *
 * RELOCATE/REMOVE next prompt: delete this file, its route in App.tsx, and the temp dropdown item
 * in Nav.tsx. The real entry button lives on the Record-a-response screen next prompt.
 */
import React from "react";
import { EntryButtonView } from "./parts";
import { PasteEmailButton } from "./PasteEmailButton";
import { EmailImportReview } from "./EmailImportReview";
import { SAMPLE_PROPOSAL_MATCHED, SAMPLE_PROPOSAL_NEW_AGENT } from "../../lib/emailImport";
import { pageGround, PAGE_GRAIN, headingInk, sageText, mutedInk, FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

const sectionLabel: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: sageText,
  margin: "0 0 12px",
};

export const EmailImportDevPage: React.FC<{
  onNavigate?: (tab: string, subPageName?: string) => void;
  onSuccessToast?: (msg: string) => void;
}> = ({ onNavigate, onSuccessToast }) => (
  <div className="min-h-screen pb-16" style={{ background: pageGround }}>
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, opacity: 0.25, pointerEvents: "none", zIndex: 0, backgroundImage: PAGE_GRAIN }} />
    <div className="relative" style={{ zIndex: 1, maxWidth: 620, margin: "0 auto", padding: "40px 16px 0", display: "flex", flexDirection: "column", gap: 30 }}>
      <header>
        <h1 style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 500, color: headingInk, margin: 0 }}>Email import — dev preview</h1>
        <p style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.08em", color: mutedInk, marginTop: 6 }}>
          PROMPT 2 · TEMPORARY — live extraction needs the function deployed (Blaze + API key); until then the paste call hits the graceful-error path.
        </p>
      </header>

      <section>
        <p style={sectionLabel}>Entry button — live (your plan)</p>
        <PasteEmailButton onNavigate={onNavigate} onSuccessToast={onSuccessToast} />
      </section>

      <section>
        <p style={sectionLabel}>Entry button — both states (visual)</p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: mutedInk, marginBottom: 6 }}>PRO</div>
            <EntryButtonView locked={false} />
          </div>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: mutedInk, marginBottom: 6 }}>FREE</div>
            <EntryButtonView locked />
          </div>
        </div>
      </section>

      <section>
        <p style={sectionLabel}>Review — matched (canned)</p>
        <EmailImportReview proposal={SAMPLE_PROPOSAL_MATCHED} manuscriptTitle="The Book of Lost Clockworks" />
      </section>

      <section>
        <p style={sectionLabel}>Review — new agent (canned)</p>
        <EmailImportReview proposal={SAMPLE_PROPOSAL_NEW_AGENT} manuscriptTitle="The Book of Lost Clockworks" />
      </section>
    </div>
  </div>
);
