/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import — the overview screen ("Here's what we found"). Sits between processing and the
 * duplicates/review stages: a positive arrival, not a to-do list. The haul + the two-tier breakdown
 * (a quick fix = gold/blocking, chances to sharpen = pink/optional) are derived LIVE from the parsed
 * result via reviewTallies — never hard-coded. Reuses the review chrome (ReviewShell) so the window,
 * nav and pink rim match the screens that follow.
 */
import React from "react";
import { SmartImportResult } from "../../types/smartImport";
import { parseModel, reviewTallies, unresolvedDuplicateAgentIds } from "../../lib/smartImportReviewModel";
import { ReviewShell } from "./SmartImportReview";

const MONO = "'JetBrains Mono',monospace";
const SERIF = "'Playfair Display',serif";
const CAVEAT = "'Caveat',cursive";

const C = {
  ink: "#3a1c14", burgundy: "#7c3a2a", muted: "#9a8c80", body: "#6a5c50", hairline: "#e7ddd2",
  parchment: "#fdfaf5", sageLight: "#e9ede6", sageDark: "#5a6e58", sageNote: "#cdd9c8",
  goldSoft: "#f4ead0", goldInk: "#6f5618", goldEdge: "#e5d29a",
  pinkBtn: "#f5e2da", pinkEdge: "#e8c8bc", pinkWash: "#faeee7",
};

interface Props {
  result: SmartImportResult;
  manuscriptTitle: string;
  userName?: string;
  onContinue: () => void;
}

/** Plain-English summary of what the fixes actually are (missing agency / suspected duplicates),
 *  count-aware so it reads true to the writer's file. */
function fixDescription(noAgency: number, dupAgents: number): string {
  const bits: string[] = [];
  if (noAgency) bits.push(`${noAgency === 1 ? "An agent is" : `${noAgency} agents are`} missing an agency`);
  if (dupAgents) bits.push(`${dupAgents === 1 ? "one looks" : "a few look"} like the same agent imported more than once`);
  if (!bits.length) return "A couple of details to sort before these can join.";
  const joined = bits.join(", and ");
  return `${joined[0].toUpperCase()}${joined.slice(1)}. These need sorting before they can join.`;
}

const Stat: React.FC<{ n: number | string; label: string }> = ({ n, label }) => (
  <div style={{ flex: 1, background: C.parchment, border: `1px solid ${C.hairline}`, borderRadius: 14, padding: "22px 24px", minWidth: 0 }}>
    <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 46, lineHeight: 1, color: C.burgundy }}>{n}</div>
    <div style={{ fontFamily: MONO, fontSize: 12, color: C.muted, marginTop: 8, letterSpacing: ".04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
  </div>
);

const Breakdown: React.FC<{ tone: "ok" | "fix" | "sharp"; glyph: string; title: string; count: number; desc: string; last?: boolean }> = ({ tone, glyph, title, count, desc, last }) => {
  const dot = tone === "ok" ? { background: C.sageLight, color: C.sageDark }
    : tone === "fix" ? { background: C.goldSoft, color: C.goldInk }
    : { background: C.pinkBtn, color: C.burgundy };
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "18px 22px", borderBottom: last ? "none" : "1px solid #f1e8de" }}>
      <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, marginTop: 1, ...dot }}>{glyph}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 16, color: C.ink }}>
          {title}
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 6, marginLeft: 8, verticalAlign: 1, ...dot }}>{count}</span>
        </div>
        <div style={{ fontSize: 13.5, color: C.body, marginTop: 3, maxWidth: 560 }}>{desc}</div>
      </div>
    </div>
  );
};

export const ImportOverview: React.FC<Props> = ({ result, manuscriptTitle, userName, onContinue }) => {
  const { agents, queries } = React.useMemo(() => parseModel(result), [result]);
  const t = React.useMemo(() => reviewTallies(agents, queries), [agents, queries]);

  // Fix breakdown for the description (counts only — the work happens on the review screens).
  const dupIds = React.useMemo(() => unresolvedDuplicateAgentIds(agents), [agents]);
  const liveAgents = agents.filter((a) => !a.deleted);
  const noAgency = liveAgents.filter((a) => !a.agency.trim()).length;
  const dupAgents = liveAgents.filter((a) => dupIds.has(a.id) && a.agency.trim()).length;

  const allClear = t.fix === 0 && t.sharpen === 0;
  const userInitial = userName ? userName[0].toUpperCase() : "?";

  return (
    <ReviewShell userInitial={userInitial} allClear={allClear}>
      <div style={{ position: "relative", padding: "42px 50px 38px" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>We've read your file</div>
        <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 34, margin: "8px 0 0", color: C.ink, lineHeight: 1.12 }}>Here's what we found</h1>
        <p style={{ fontFamily: CAVEAT, fontSize: 23, color: C.burgundy, margin: "14px 0 30px", maxWidth: 620, lineHeight: 1.4 }}>
          {allClear
            ? "It all read cleanly — your history's ready to come straight in."
            : "Most of it's ready to go. A few things need a quick fix first — and a handful are chances to sharpen your records."}
        </p>

        {/* Top tip — sage post-it (hidden on narrow widths via the rail being absolute) */}
        <div style={{ position: "absolute", top: 18, right: 34, width: 236, background: C.sageNote, borderRadius: 4, padding: "16px 20px 20px", boxShadow: "0 14px 26px -16px rgba(58,28,20,.4)", transform: "rotate(-2.2deg)" }}>
          <span style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", width: 13, height: 13, borderRadius: "50%", background: C.sageDark, boxShadow: "0 2px 4px rgba(0,0,0,.25)" }} />
          <h4 style={{ fontFamily: CAVEAT, fontSize: 25, color: C.sageDark, margin: "0 0 4px", textDecoration: "underline", textUnderlineOffset: 3 }}>Top tip</h4>
          <p style={{ fontFamily: CAVEAT, fontSize: 19.5, lineHeight: 1.34, color: "#3f5240", margin: 0 }}>Spend a bit of time getting these right. It pays dividends later!</p>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 30, maxWidth: 640 }}>
          <Stat n={t.agents} label="AGENTS" />
          <Stat n={t.queries} label="QUERIES" />
          <Stat n={1} label={`MANUSCRIPT · ${(manuscriptTitle || "").toUpperCase() || "YOUR BOOK"}`} />
        </div>

        <div style={{ border: `1px solid ${C.hairline}`, borderRadius: 14, overflow: "hidden" }}>
          <Breakdown tone="ok" glyph="✓" title="Ready to go" count={t.ready}
            desc="Read cleanly and good to import exactly as they are." />
          {t.fix > 0 && (
            <Breakdown tone="fix" glyph="!" title="A quick fix first" count={t.fix}
              desc={fixDescription(noAgency, dupAgents)} />
          )}
          {t.sharpen > 0 && (
            <Breakdown tone="sharp" glyph="✦" title="Chances to sharpen" count={t.sharpen}
              desc="A date to confirm here, a status to clarify there. Totally optional — but each one you add makes your tracking sharper." last />
          )}
        </div>

        {t.sharpen > 0 && (
          <div style={{ background: C.pinkWash, border: `1px solid ${C.pinkEdge}`, borderRadius: 14, padding: "18px 22px", marginTop: 22, display: "flex", gap: 13, alignItems: "flex-start" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={C.burgundy} style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z" /></svg>
            <p style={{ margin: 0, fontSize: 14, color: "#7a4636", lineHeight: 1.5 }}>
              <b style={{ color: C.ink }}>Why sharpen?</b> The fuller your records, the smarter ScriptAlly gets — a complete timeline means we can nudge you at the right moment, count your responses accurately, and show you exactly where you stand. Nothing here is required; it just makes everything that follows work better for you.
            </p>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 30 }}>
          <button onClick={onContinue}
            style={{ fontFamily: MONO, fontSize: 14, background: C.pinkBtn, color: C.burgundy, padding: "14px 26px", borderRadius: 11, fontWeight: 500, border: `1px solid ${C.pinkEdge}`, cursor: "pointer", transition: "background .25s,color .25s,border-color .25s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#c4d0c0"; e.currentTarget.style.color = C.sageDark; e.currentTarget.style.borderColor = "#aebfa9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.pinkBtn; e.currentTarget.style.color = C.burgundy; e.currentTarget.style.borderColor = C.pinkEdge; }}>
            {allClear ? "Bring it in →" : "Let's work through it →"}
          </button>
        </div>
      </div>
    </ReviewShell>
  );
};
