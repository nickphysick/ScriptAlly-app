/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PlansPage — the presentational Free-vs-Pro plans page. VISUAL LAYER ONLY: no billing, no Stripe,
 * no entitlement/gating, no plan state, no Firestore. The price is display copy. There is
 * deliberately NO plan-selection control: no payment path exists, so each card's foot states
 * "coming soon" honestly (the AccountSettings ComingSoonPill pattern) instead of presenting a
 * button that does nothing. Self-serve upgrade is a separate decision — do not wire upgradeToPro
 * here (it would hollow out every plan gate in the app). Reuses the shared MountPanel clipping
 * card, the dashboard page-ground token, the uniform band-header pieces, and the existing
 * colour/font tokens.
 */
import React from "react";
import { MountPanel } from "./MountPanel";
import { PageHeader } from "./shell/PageHeader";
import { PlanComparison } from "./plans/PlanComparison";
import { useScriptAllyDb } from "../lib/db";
import { isProUser } from "../lib/suggestComps";
import {
  parchment,
  sageBandGradient,
  sageBandRule,
  pinkBandGradient,
  pinkBandRule,
  statusSageFill,
  burgundy,
  headingInk,
  bodyInk,
  mutedInk,
  sageText,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
} from "../lib/designTokens";
import { BookOpen, Star, Heart, List, Check, X } from "lucide-react";

const AMBER = "#b98a4e";

/* ── Uniform band header: burgundy rule + Playfair title + (strapline | mono sub) + far-right emblem.
 *    Reuses the dashboard panel-header pieces; `variant` swaps the sage band for the pink one. ── */
const BandHeader: React.FC<{
  title: string;
  Emblem: React.ComponentType<any>;
  variant?: "sage" | "pink";
  strapline?: string;
  mono?: string;
}> = ({ title, Emblem, variant = "sage", strapline, mono }) => {
  const pink = variant === "pink";
  const twoLine = !!(strapline || mono);
  return (
    <div
      style={{
        padding: "13px 18px 12px",
        background: pink ? pinkBandGradient : sageBandGradient,
        borderBottom: `1px solid ${pink ? pinkBandRule : sageBandRule}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{ width: 3, height: twoLine ? 34 : 18, borderRadius: 2, background: burgundy, marginRight: 12, flexShrink: 0, display: "inline-block" }}
        />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 500, color: headingInk, lineHeight: 1.15 }}>{title}</span>
          {strapline && (
            <span style={{ display: "block", fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14.5, color: burgundy, lineHeight: 1.25, marginTop: 1 }}>{strapline}</span>
          )}
          {mono && (
            <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: mutedInk, marginTop: 3 }}>{mono}</span>
          )}
        </span>
      </span>
      <Emblem style={{ width: 20, height: 20, color: burgundy, flexShrink: 0 }} strokeWidth={1.8} aria-hidden="true" />
    </div>
  );
};

/* ── Feature-inclusion marks (NOT StatusDot — these aren't query statuses). ── */
const Tick: React.FC = () => (
  <span
    aria-label="Included"
    role="img"
    style={{ width: 17, height: 17, borderRadius: "50%", background: burgundy, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
  >
    <Check style={{ width: 11, height: 11, color: parchment }} strokeWidth={3} aria-hidden="true" />
  </span>
);

const NoMark: React.FC = () => (
  <span
    aria-label="Not included"
    role="img"
    style={{ width: 17, height: 17, borderRadius: "50%", border: "1.5px solid #c4bcae", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
  >
    <X style={{ width: 10, height: 10, color: "#b3a99a" }} strokeWidth={3} aria-hidden="true" />
  </span>
);

/* ── The AccountSettings ComingSoonPill pattern (same styles) — an honest non-interactive marker
 *    for a control that does not exist yet. ── */
const ComingSoonPill: React.FC = () => (
  <span
    style={{
      fontFamily: FONT_MONO,
      fontSize: 9,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: mutedInk,
      background: "rgba(124,58,42,0.06)",
      border: "0.5px solid rgba(124,58,42,0.16)",
      borderRadius: 999,
      padding: "3px 8px",
      whiteSpace: "nowrap",
    }}
  >
    Coming soon
  </span>
);

/* ── Plan card ────────────────────────────────────────────────────────────── */
/* ⚠️ `PlanProps`, `PlanCard`, `Row`, `Cell`, `GROUPS`, `FOOTNOTES`, `cell` and `CompareCard` ARE
   ALL DELETED. Between them they stated what the plans include FOUR times on one page — two hero
   cards with their own feature arrays, and a grouped matrix with a third list under them — and
   quoted a price (£3.99 / £35) that no code path in this app can charge. The rows now live in
   `lib/planComparison`, the price comes from the locked `PRICING_TIERS`, and both this page and
   the settings card render the one `PlanComparison`.

   Two of the deleted matrix's claims were also wrong: it listed "Submission package builder" and
   "Agent matching & community access" as Pro-only, and neither is gated anywhere in the code. */

/* ── Founding-members card (pink band) ───────────────────────────────────── */
const FounderCard: React.FC = () => (
  <MountPanel>
    <BandHeader title="Founding members" Emblem={Heart} variant="pink" />
    <div style={{ padding: 22, display: "flex", flexDirection: "column" }}>
      <div className="founder-row" style={{ display: "flex", gap: 22, alignItems: "stretch" }}>
        {/* handwritten note */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: 25, fontWeight: 600, color: burgundy, lineHeight: 1.25, margin: 0 }}>
            Free Pro through beta —<br />
            <span style={{ color: sageText }}>then locked at half price for life.</span>
          </p>
        </div>
        {/* divider */}
        <div className="founder-divider" style={{ width: 1, background: "#e6dccf", flexShrink: 0 }} aria-hidden="true" />
        {/* detail */}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: FONT_SANS, fontSize: 13, color: mutedInk, lineHeight: 1.5, margin: "0 0 12px" }}>
            The first 50 sign-ups get full Pro free during the beta in exchange for occasional light feedback. When pricing goes live, founders keep Pro permanently discounted — a soft landing, not a billing cliff.
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              "Full Pro, no card required, throughout beta",
              "A couple of feedback questions now and then + a direct channel",
              "Permanent founder rate once Pro launches (e.g. 50% for life)",
            ].map((b) => (
              <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span aria-hidden="true" style={{ color: AMBER, fontFamily: FONT_MONO, fontSize: 13, lineHeight: 1.5, flexShrink: 0 }}>→</span>
                <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: bodyInk, lineHeight: 1.5 }}>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </MountPanel>
);

export const PlansPage: React.FC = () => {
  const { currentUser } = useScriptAllyDb();
  return (
  // No bespoke ground (capsule law — fixes P5 re-homing): the page inherits the content capsule.
  <div className="min-h-screen pb-16 font-sans" style={{ color: bodyInk }}>

    {/* scoped CSS: the founder row stacks below 640px (inline can't express media queries) */}
    <style>{`
      @media (max-width: 639px) {
        .founder-row { flex-direction: column; }
        .founder-divider { width: 100% !important; height: 1px; }
      }
    `}</style>

    <div className="relative" style={{ zIndex: 1, maxWidth: 880, margin: "0 auto", padding: "12px 16px 0" }}>
      {/* The standard page header (capsule fixes P5 — re-homed from the DELETED FocusShell):
          full variant replaces the centred italic hero; the mono "ScriptAlly · two tiers"
          strapline is dropped, not restyled (rollout report). */}
      <PageHeader
        variant="full"
        title="Choose your plan"
        description="Free covers the tracking; Pro adds the tools that think alongside you." /* PROVISIONAL copy (flyouts P3) — listed for Nick's review */
      />

      {/* ⚠️ ONE COMPARISON, SHARED WITH THE SETTINGS CARD (`components/plans/PlanComparison`).
          What stood here was TWO hardcoded plan cards — "£3.99 / month", "or £35/year · save ~27%"
          and a four-item feature list each — above a separate `GROUPS` matrix with a THIRD list of
          features. Four statements of what Pro includes, on one page, none of them reading the
          same source.
          ⚠️ AND THE PRICE WAS FICTION. There is no Stripe, no checkout, and `firestore.rules`
          denies a client-side plan change as its central guard; the locked marketing copy has said
          "Price to be confirmed · no payment path yet" the whole time. The figure is deleted
          rather than moved.
          No `onSeePlans` here — the CTA would point at this page, so the slot states the tier's
          own locked action word. */}
      <div style={{ marginBottom: 20 }}>
        <PlanComparison currentPlan={isProUser(currentUser) ? "pro" : "free"} />
      </div>

      {/* founding members */}
      <div style={{ marginBottom: 20 }}>
        <FounderCard />
      </div>

      {/* ⚠️ NO SECOND MATRIX. `CompareCard`, `GROUPS`, `FOOTNOTES`, `PlanCard` and `cell` are all
          deleted — the comparison above is the page's one statement of what the plans include. */}
    </div>
  </div>
  );
};
