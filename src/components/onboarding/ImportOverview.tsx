/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import — the overview screen ("Here's what we found"). A positive arrival between processing
 * and the review stages. The tally is grouped BY POPULATION (Agents | Queries), never pooled — each
 * column reconciles to its own total. Agents have a blocking "A quick fix" tier (gold: missing agency
 * or a duplicate group); queries are never blocking, only optional "Chances to sharpen" (pink). Counts
 * are derived live via reviewTallies. Built to fit one viewport — totals fold into the column headers,
 * the manuscript is a chip, the why-line is a single strip, the top tip is a scrawl in the corner.
 */
import React from "react";
import { SmartImportResult } from "../../types/smartImport";
import { parseModel, reviewTallies } from "../../lib/smartImportReviewModel";
import { ReviewShell } from "./SmartImportReview";

const MONO = "'JetBrains Mono',monospace";
const SERIF = "'Playfair Display',serif";
const CAVEAT = "'Caveat',cursive";

const C = {
  ink: "#3a1c14", burgundy: "#7c3a2a", muted: "#9a8c80", body: "#6a5c50", hairline: "#e7ddd2",
  parchment: "#fdfaf5", sageLight: "#e9ede6", sageDark: "#5a6e58",
  goldSoft: "#f4ead0", goldInk: "#6f5618",
  pinkBtn: "#f5e2da", pinkEdge: "#e8c8bc", pinkWash: "#faeee7",
};

interface Props {
  result: SmartImportResult;
  manuscriptTitle: string;
  userName?: string;
  onContinue: () => void;
  onSkip?: () => void;
}

const Tier: React.FC<{ tone: "ok" | "fix" | "sharp"; glyph: string; title: string; count: number; desc: string; first?: boolean }> = ({ tone, glyph, title, count, desc, first }) => {
  const dot = tone === "ok" ? { background: C.sageLight, color: C.sageDark }
    : tone === "fix" ? { background: C.goldSoft, color: C.goldInk }
    : { background: C.pinkBtn, color: C.burgundy };
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 18px", borderTop: first ? "none" : "1px solid #f1e8de" }}>
      <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, marginTop: 1, ...dot }}>{glyph}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: C.ink }}>
          {title}
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 6, marginLeft: 7, verticalAlign: 1, ...dot }}>{count}</span>
        </div>
        <div style={{ fontSize: 13, color: C.body, marginTop: 3, lineHeight: 1.45 }}>{desc}</div>
      </div>
    </div>
  );
};

const Column: React.FC<{ label: string; total: number; children: React.ReactNode }> = ({ label, total, children }) => (
  // The card frame (overflow:hidden + borderRadius) clips the header fill to the rounded top corners —
  // canonical header-fill structure: no ::before overlay, no radius-matching on the header itself.
  <div style={{ border: `1px solid ${C.hairline}`, borderRadius: 13, background: C.parchment, overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "13px 18px", borderBottom: "1px solid #efe2d6", background: "#DCE0D9" }}>
      <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: C.ink, fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 22, color: C.burgundy }}>{total}<small style={{ fontFamily: MONO, fontSize: 9.5, color: C.muted, fontWeight: 400, letterSpacing: ".04em", marginLeft: 4 }}>in total</small></span>
    </div>
    {children}
  </div>
);

export const ImportOverview: React.FC<Props> = ({ result, manuscriptTitle, userName, onContinue, onSkip }) => {
  const { agents, queries } = React.useMemo(() => parseModel(result), [result]);
  const t = React.useMemo(() => reviewTallies(agents, queries), [agents, queries]);

  // Fix breakdown for the agent-column description (counts only).
  const liveAgents = agents.filter((a) => !a.deleted);
  const noAgency = liveAgents.filter((a) => !a.agency.trim()).length;
  const dupGroups = liveAgents.filter((a) => a.mergeWith.length > 0 && !a.mergeResolved).length; // leaders = group count
  const fixBits: string[] = [];
  if (dupGroups) fixBits.push(`${dupGroups} possible duplicate set${dupGroups === 1 ? "" : "s"} to merge`);
  if (noAgency) fixBits.push(`${noAgency} missing an agency`);
  const agentFixDesc = fixBits.length ? `${fixBits.join(", and ")}. These need sorting before they can join.` : "A couple of details to sort before these can join.";

  const allClear = t.agents.fix === 0 && t.queries.sharpen === 0;
  const userInitial = userName ? userName[0].toUpperCase() : "?";

  return (
    <ReviewShell userInitial={userInitial} allClear={allClear} fit>
      <div style={{ position: "relative", padding: "32px 40px 0", flex: "0 1 auto", minHeight: 0, overflowY: "auto" }}>
        {/* Scrawled corner note — muted grey handwriting, no card, slight tilt */}
        <div style={{ position: "absolute", top: 22, right: 30, width: 210, textAlign: "right", zIndex: 5, pointerEvents: "none" }}>
          <p style={{ fontFamily: CAVEAT, fontSize: 17, lineHeight: 1.3, color: "#a89b8e", margin: 0, transform: "rotate(-1.6deg)" }}>
            <b style={{ color: "#94867a", fontWeight: 600 }}>Top tip:</b> spend a bit of time getting these right, it pays dividends later
          </p>
        </div>

        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>We've read your file</div>
        <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 31, margin: "7px 0 0", color: C.ink, lineHeight: 1.1 }}>Here's what we found</h1>
        <p style={{ fontFamily: CAVEAT, fontSize: 21, color: C.burgundy, margin: "9px 0 4px", maxWidth: 600, lineHeight: 1.35 }}>
          {allClear
            ? "It all read cleanly — your history's ready to come straight in."
            : "Most of it's ready to go. A couple of agents need a quick fix first — and a handful of queries are chances to sharpen."}
        </p>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 11, color: C.muted, background: C.parchment, border: `1px solid ${C.hairline}`, borderRadius: 7, padding: "5px 11px", marginTop: 6 }}>
          📄 1 manuscript · {manuscriptTitle || "Your book"}
        </span>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 20 }}>
          <Column label="Agents" total={t.agents.total}>
            <Tier first tone="ok" glyph="✓" title="Ready to go" count={t.agents.ready}
              desc="Have an agency and read cleanly — good to import as they are." />
            {t.agents.fix > 0 && (
              <Tier tone="fix" glyph="!" title="A quick fix" count={t.agents.fix} desc={agentFixDesc} />
            )}
          </Column>

          <Column label="Queries" total={t.queries.total}>
            <Tier first tone="ok" glyph="✓" title="Ready to go" count={t.queries.ready}
              desc="Dates read, statuses clear — good to import as they are." />
            {t.queries.sharpen > 0 && (
              <Tier tone="sharp" glyph="✦" title="Chances to sharpen" count={t.queries.sharpen}
                desc="A few dates to confirm and statuses to clarify. Optional — each one makes your tracking sharper." />
            )}
          </Column>
        </div>

        {t.queries.sharpen > 0 && (
          <div style={{ display: "flex", gap: 11, alignItems: "flex-start", background: C.pinkWash, border: `1px solid ${C.pinkEdge}`, borderRadius: 12, padding: "13px 17px", marginTop: 18 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={C.burgundy} style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z" /></svg>
            <p style={{ margin: 0, fontSize: 13, color: "#7a4636", lineHeight: 1.45 }}>
              <b style={{ color: C.ink }}>Why sharpen?</b> The fuller your records, the smarter ScriptAlly gets — accurate response counts, nudges at the right moment, and a clear picture of where you stand. Nothing here is required; it just makes everything that follows work better for you.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px 22px", flexShrink: 0 }}>
        <button onClick={onSkip} disabled={!onSkip}
          style={{ fontFamily: MONO, fontSize: 12.5, color: C.muted, background: "none", border: "none", cursor: onSkip ? "pointer" : "default" }}>Skip setup</button>
        <button onClick={onContinue}
          style={{ fontFamily: MONO, fontSize: 13.5, background: C.pinkBtn, color: C.burgundy, padding: "13px 24px", borderRadius: 11, fontWeight: 500, border: `1px solid ${C.pinkEdge}`, cursor: "pointer", transition: "background .25s,color .25s,border-color .25s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#c4d0c0"; e.currentTarget.style.color = C.sageDark; e.currentTarget.style.borderColor = "#aebfa9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.pinkBtn; e.currentTarget.style.color = C.burgundy; e.currentTarget.style.borderColor = C.pinkEdge; }}>
          {allClear ? "Bring it in →" : "Let's work through it →"}
        </button>
      </div>
    </ReviewShell>
  );
};
