/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PlansPage — the presentational Free-vs-Pro plans page. VISUAL LAYER ONLY: no billing, no Stripe,
 * no entitlement/gating, no plan state, no Firestore. The price is display copy; CTAs are inert
 * placeholders (// TODO: wire later). Reuses the shared MountPanel clipping card, the dashboard
 * page-ground token, the uniform band-header pieces, and the existing colour/font tokens.
 */
import React from "react";
import { MountPanel } from "./MountPanel";
import {
  pageGround,
  PAGE_GRAIN,
  parchment,
  sageBandGradient,
  sageBandRule,
  pinkBandGradient,
  pinkBandRule,
  statusSageFill,
  buttonPinkBg,
  buttonPinkBorder,
  ghostButtonBorder,
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

/* ── Plan card ────────────────────────────────────────────────────────────── */
interface PlanProps {
  title: string;
  strapline: string;
  Emblem: React.ComponentType<any>;
  amount: string;
  per: string;
  pill?: string;
  features: string[];
  ctaLabel: string;
  ctaClass: string;
}

const PlanCard: React.FC<PlanProps> = ({ title, strapline, Emblem, amount, per, pill, features, ctaLabel, ctaClass }) => (
  <MountPanel fill style={{ height: "100%" }}>
    <BandHeader title={title} Emblem={Emblem} strapline={strapline} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 22px 22px" }}>
      {/* price block: amount + per baseline-aligned in an inner wrapper, pill a centred sibling */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 6, marginBottom: 20 }}>
        <span style={{ display: "inline-flex", alignItems: "baseline" }}>
          <span style={{ fontFamily: FONT_SERIF, fontSize: 34, fontWeight: 500, color: burgundy, lineHeight: 1 }}>{amount}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: mutedInk, marginLeft: 6 }}>{per}</span>
        </span>
        {pill && (
          <span
            style={{ marginLeft: 10, background: statusSageFill, color: sageText, border: "1px solid #cfdac9", borderRadius: 999, fontFamily: FONT_MONO, fontSize: 9.5, padding: "4px 9px", whiteSpace: "nowrap" }}
          >
            {pill}
          </span>
        )}
      </div>

      {/* feature list grows so the CTA pins to the bottom and both cards' CTAs align */}
      <ul style={{ flex: 1, listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 11 }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ marginTop: 1 }}><Tick /></span>
            <span style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: bodyInk, lineHeight: 1.4 }}>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={ctaClass}
        onClick={() => { /* TODO: wire plan selection later — presentational only for now */ }}
        style={{ marginTop: 22, width: "100%", padding: "11px 16px", borderRadius: 9, fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 500, color: burgundy, cursor: "pointer" }}
      >
        {ctaLabel}
      </button>
    </div>
  </MountPanel>
);

/* ── Compare-plans matrix data ───────────────────────────────────────────── */
type Cell = boolean | string;
interface Row {
  label: string;
  sub?: string;
  note?: string; // amber footnote marker
  free: Cell;
  pro: Cell;
}
const GROUPS: { name: string; rows: Row[] }[] = [
  {
    name: "Tracking",
    rows: [
      { label: "Manuscripts", free: "1", pro: "Unlimited" },
      { label: "Queries logged", free: "Unlimited", pro: "Unlimited" },
      { label: "Agents tracked", free: "Unlimited", pro: "Unlimited" },
      { label: "Analytics & query pipeline", free: true, pro: true },
      { label: "Reminders & follow-up nudges", free: true, pro: true },
    ],
  },
  {
    name: "Documents",
    rows: [
      {
        label: "Submission package builder",
        note: "②",
        sub: "Pair your best query letter, synopsis and pages into bespoke submission packages — then see at a glance which combination charms the most agents.",
        free: false,
        pro: true,
      },
    ],
  },
  {
    name: "Advanced time savers",
    rows: [
      {
        label: "Smart Import (onboarding)",
        note: "①",
        sub: "Bring the spreadsheet you've been wrangling and we'll spin it into a living database in moments.",
        free: true,
        pro: true,
      },
      {
        label: "Smart email-paste",
        sub: "Drop your email straight into ScriptAlly and we'll log the details in your database, completely hassle-free.",
        free: false,
        pro: true,
      },
    ],
  },
  {
    name: "Community",
    rows: [
      {
        label: "Contributes to community data",
        note: "③",
        sub: "Share your agent intel and response times to sharpen everyone's odds — your manuscripts and synopses always stay yours alone, never shared.",
        free: true,
        pro: true,
      },
      { label: "Agent matching & community access", free: false, pro: true },
    ],
  },
];

const FOOTNOTES: { marker: string; strong: string; rest: string }[] = [
  { marker: "①", strong: "Smart Import", rest: " stays free — it's the front door. A free user importing several books triggers a gentle “we found 3 manuscripts — Pro unlocks the rest” moment rather than failing." },
  { marker: "②", strong: "Submission package builder", rest: " is the Pro tool for combining query/synopsis/manuscript versions and tracking which performs best. Free users still record what they sent on each query in the normal log flow." },
  { marker: "③", strong: "Community", rest: " — every user feeds the shared pool that powers matching, but only agent details and response analytics. Manuscripts and synopses are never shared. Pro unlocks the matching insights and community access." },
];

const cell = (v: Cell) =>
  typeof v === "boolean"
    ? v
      ? <Tick />
      : <NoMark />
    : <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: bodyInk }}>{v}</span>;

const CompareCard: React.FC = () => (
  <MountPanel>
    <BandHeader title="Compare plans" Emblem={List} mono="feature by feature" />
    <div style={{ padding: "8px 22px 20px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${sageBandRule}` }}>
            <th style={{ textAlign: "left", padding: "12px 0 10px", fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: mutedInk, fontWeight: 500 }}>Feature</th>
            <th style={{ width: 130, textAlign: "center", padding: "12px 0 10px", fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: mutedInk, fontWeight: 500 }}>Free</th>
            <th style={{ width: 130, textAlign: "center", padding: "12px 0 10px", fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: burgundy, fontWeight: 600 }}>Pro</th>
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((g) => (
            <React.Fragment key={g.name}>
              <tr>
                <td colSpan={3} style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: sageText, padding: "16px 0 6px" }}>{g.name}</td>
              </tr>
              {g.rows.map((r) => (
                <tr key={r.label} style={{ borderTop: "0.5px solid #efe5da" }}>
                  <td style={{ padding: "10px 14px 10px 0", verticalAlign: "top" }}>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: bodyInk, lineHeight: 1.35 }}>
                      {r.label}
                      {r.note && <sup style={{ color: AMBER, fontSize: 9, marginLeft: 3 }}>{r.note}</sup>}
                    </div>
                    {r.sub && <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: mutedInk, lineHeight: 1.4, marginTop: 3, maxWidth: 520 }}>{r.sub}</div>}
                  </td>
                  <td style={{ textAlign: "center", verticalAlign: "top", padding: "10px 0" }}>
                    <span style={{ display: "inline-flex", justifyContent: "center" }}>{cell(r.free)}</span>
                  </td>
                  <td style={{ textAlign: "center", verticalAlign: "top", padding: "10px 0" }}>
                    <span style={{ display: "inline-flex", justifyContent: "center" }}>{cell(r.pro)}</span>
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
        {FOOTNOTES.map((fn) => (
          <p key={fn.marker} style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: mutedInk, lineHeight: 1.45, margin: 0 }}>
            <span style={{ color: AMBER, marginRight: 5 }}>{fn.marker}</span>
            <strong style={{ color: bodyInk, fontWeight: 600 }}>{fn.strong}</strong>
            {fn.rest}
          </p>
        ))}
      </div>
    </div>
  </MountPanel>
);

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

export const PlansPage: React.FC = () => (
  <div className="min-h-screen pb-16 font-sans" style={{ background: pageGround, color: bodyInk }}>
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, opacity: 0.25, pointerEvents: "none", zIndex: 0, backgroundImage: PAGE_GRAIN }} />

    {/* scoped CSS: CTA hovers (inline can't express :hover) + founder row stacks below 640px */}
    <style>{`
      .plans-cta-free { background: #fff; border: 1px solid ${ghostButtonBorder}; transition: background .15s, border-color .15s; }
      .plans-cta-free:hover { background: #fdf6f2; border-color: #c9a89e; }
      .plans-cta-pro { background: ${buttonPinkBg}; border: 1px solid ${buttonPinkBorder}; transition: background .15s, border-color .15s; }
      .plans-cta-pro:hover { background: #efd5ca; border-color: #d8a89a; }
      @media (max-width: 639px) {
        .founder-row { flex-direction: column; }
        .founder-divider { width: 100% !important; height: 1px; }
      }
    `}</style>

    <div className="relative" style={{ zIndex: 1, maxWidth: 880, margin: "0 auto", padding: "48px 16px 0" }}>
      {/* page header (not a card) */}
      <header style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontFamily: FONT_SERIF, fontSize: 27, fontWeight: 500, color: headingInk, lineHeight: 1.15, margin: 0 }}>
          Choose your <span style={{ fontStyle: "italic", color: burgundy }}>plan</span>
        </h1>
        <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: sageText, marginTop: 10 }}>
          ScriptAlly · two tiers
        </p>
      </header>

      {/* plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 20, marginBottom: 20 }}>
        <PlanCard
          title="Free"
          strapline="Query with confidence"
          Emblem={BookOpen}
          amount="£0"
          per="forever"
          features={["Unlimited queries & agents", "Full analytics & pipeline", "Reminders & follow-up nudges", "Smart Import on setup"]}
          ctaLabel="Get started"
          ctaClass="plans-cta-free"
        />
        <PlanCard
          title="Pro"
          strapline="Query with downright aplomb"
          Emblem={Star}
          amount="£3.99"
          per="/ month"
          pill="or £35/year · save ~27%"
          features={["Multiple manuscripts", "Submission package A/B testing", "Community-backed agent discovery", "Smart email drop"]}
          ctaLabel="Go Pro"
          ctaClass="plans-cta-pro"
        />
      </div>

      {/* founding members */}
      <div style={{ marginBottom: 20 }}>
        <FounderCard />
      </div>

      {/* compare matrix */}
      <CompareCard />
    </div>
  </div>
);
