/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ManuscriptAgentSuggestions — the manuscript-scoped "agents who might suit" panel.
 *
 * Surfaces a few VERIFIED community-catalogue agents whose genre + wish list fit the current
 * manuscript, scored by the single shared engine in `communityMatch.ts`. This is the live home of
 * the (formerly orphaned) Discover engine; matching maths is unchanged. Word count still feeds the
 * internal score but is deliberately dropped from the display — fit is shown as a band, never a %.
 *
 * Built on MountPanel (real clipping frame) so the header band's fill stops at the rounded corners.
 * Every trust signal (open-to-queries, verified date) is conditional — never fabricated.
 *
 * Critical colours are inline styles (never Tailwind classes — they've silently overridden inline
 * colours in this codebase before). Layout/spacing via Tailwind is fine.
 */
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { CommunityAgent, Manuscript, SubmissionStatus } from "../types";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import { MountPanel } from "./MountPanel";
import { scoreCommunityAgent, MATCH_THRESHOLD } from "../lib/communityMatch";
import { agencyKey, nameCompatible } from "../lib/smartImportReviewModel";
import { PREDEFINED_GENRES, AGE_CATEGORIES } from "../lib/manuscripts";
import {
  parchment,
  burgundy,
  deepBurgundy,
  bodyInk,
  mutedInk,
  headingInk,
  labelColor,
  sageText,
  statusSageFill,
  buttonPinkBg,
  buttonPinkBorder,
  buttonPinkHoverBg,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
} from "../lib/designTokens";
import { Compass, Check, ShieldCheck, Plus } from "lucide-react";

const CAVEAT = "'Caveat', cursive";
const AMBER = "#b98a4e"; // "Possible fit" accent — not a status colour, so kept literal here
const SAGE_RULE = "rgba(90,110,88,0.28)";
const MAX_SUGGESTIONS = 5;

// Wish-list highlight stop-list (DISPLAY ONLY — never affects the match score). We don't light up
// bare genre/category names (already conveyed by the genre chip) or generic fillers, so the emphasis
// lands on the distinctive craft/setting/theme terms. Sourced from the app's own genre vocabulary
// (PREDEFINED_GENRES + AGE_CATEGORIES, split into word tokens) so it stays in step with the rest of the
// app; sub-genre flavours like "gothic"/"steampunk"/"clockpunk"/"celtic" aren't in that vocabulary, so
// they remain highlighted. Conservative by design: when unsure, a term stays lit.
const HIGHLIGHT_STOPWORDS = new Set<string>([
  ...PREDEFINED_GENRES.flatMap(g => g.toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean),
  ...AGE_CATEGORIES.flatMap(a => a.toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean),
  "fiction", "fictional", "novel", "novels", "story", "stories", "book", "books", "genre", "general",
]);

interface ManuscriptAgentSuggestionsProps {
  manuscript: Manuscript;
}

interface ScoredMatch {
  agent: CommunityAgent;
  score: number;
  overlappingWords: string[];
  genreScore: number;
  mswlScore: number;
}

/** Fit band from the /75 engine score: Strong ≥62, Good ≥52, else Possible (≥ MATCH_THRESHOLD, 42).
 *  Proportional to the old /90 cutoffs (≈83% / 69% / 56%). Adjustable; never shown as a raw %. */
function fitBand(score: number): { label: string; bg: string; fg: string; border: string } {
  if (score >= 62) return { label: "Strong fit", bg: statusSageFill, fg: sageText, border: SAGE_RULE };
  if (score >= 52) return { label: "Good fit", bg: "#f3ede4", fg: mutedInk, border: "rgba(124,58,42,0.16)" };
  return { label: "Possible fit", bg: "rgba(185,138,78,0.13)", fg: AMBER, border: "rgba(185,138,78,0.38)" };
}

/** Format an ISO verified date as "Mon YYYY"; null when absent/invalid (never fabricated). */
function verifiedLabel(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/** Render an MSWL excerpt with the matched keyword tokens picked out in burgundy. Bare genre/category
 *  names and generic fillers are filtered out (already conveyed by the genre chip); distinctive
 *  craft/setting/theme terms stay lit. Display-only — does NOT change the match score. */
function HighlightedWishlist({ notes, terms }: { notes: string; terms: string[] }): React.ReactElement {
  const shown = terms.filter(t => !HIGHLIGHT_STOPWORDS.has(t.toLowerCase()));
  const escaped = shown.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).filter(Boolean);
  if (escaped.length === 0) return <>{`“${notes}”`}</>;
  const termSet = new Set(shown.map(t => t.toLowerCase()));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = notes.split(re);
  return (
    <>
      {"“"}
      {parts.map((part, i) =>
        termSet.has(part.toLowerCase())
          ? <span key={i} style={{ color: burgundy, fontWeight: 600 }}>{part}</span>
          : <React.Fragment key={i}>{part}</React.Fragment>,
      )}
      {"”"}
    </>
  );
}

export const ManuscriptAgentSuggestions: React.FC<ManuscriptAgentSuggestionsProps> = ({ manuscript }) => {
  const { communityAgents, agents, addAgent } = useScriptAllyDb();

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);
  const [lastDismissed, setLastDismissed] = useState<{ id: string; name: string } | null>(null);

  // Already-held: exact name+agency, or a fuzzy agency+name match (reuses the Smart-Import dedupe).
  const isAlreadyHeld = (ca: CommunityAgent): boolean => {
    const caKey = agencyKey(ca.agency);
    return agents.some(a => {
      const exact =
        a.name.trim().toLowerCase() === ca.name.trim().toLowerCase() &&
        a.agency.trim().toLowerCase() === ca.agency.trim().toLowerCase();
      if (exact) return true;
      return agencyKey(a.agency) === caKey && nameCompatible(a.name, ca.name);
    });
  };

  const matches: ScoredMatch[] = useMemo(() => {
    if (!manuscript) return [];
    return (communityAgents || [])
      // Don't surface closed agents at all; "Unknown" is allowed through (its line is just omitted).
      .filter(ca => ca.submissionStatus !== SubmissionStatus.CLOSED)
      .filter(ca => !dismissed.has(ca.id))
      // Drop agents the user already holds — but keep a just-added one visible so its done-state shows.
      .filter(ca => added.has(ca.id) || !isAlreadyHeld(ca))
      .map(ca => {
        const { score, breakdown } = scoreCommunityAgent(ca, manuscript);
        return {
          agent: ca,
          score,
          overlappingWords: breakdown.overlappingWords,
          genreScore: breakdown.genreScore,
          mswlScore: breakdown.mswlScore,
        };
      })
      .filter(m => m.score >= MATCH_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS);
    // isAlreadyHeld closes over `agents`, which is in the dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityAgents, agents, manuscript, dismissed, added]);

  if (!manuscript) return null;

  const handleAdd = async (ca: CommunityAgent) => {
    setAdding(ca.id);
    try {
      const result = await addAgent({
        name: ca.name,
        agency: ca.agency,
        email: ca.email,
        website: ca.website,
        twitter: ca.twitter,
        bluesky: ca.bluesky,
        instagram: ca.instagram,
        genres: ca.genres,
        mswlNotes: ca.mswlNotes,
        starRating: ca.starRating,
        submissionStatus: ca.submissionStatus,
        responseTimeWeeks: ca.responseTimeWeeks,
        noResponseMeansNo: ca.noResponseMeansNo,
        submissionMethod: ca.submissionMethod,
        materialsWanted: ca.materialsWanted,
        notes: `Added from community suggestions — a genre/wish-list match for "${manuscript.title}".`,
      });
      if (result.success) {
        // Best-effort popularity bump on the shared catalogue doc (the only client write rules allow).
        try {
          await updateDoc(doc(db, "communityAgents", ca.id), { contributedByCount: increment(1) });
        } catch (countErr) {
          console.error("Failed to increment contributedByCount:", countErr);
        }
        setAdded(prev => new Set(prev).add(ca.id));
      } else {
        console.error("Failed to add community agent:", result.error);
      }
    } catch (err) {
      console.error("Error adding community agent:", err);
    } finally {
      setAdding(null);
    }
  };

  const dismiss = (ca: CommunityAgent) => {
    setDismissed(prev => new Set(prev).add(ca.id));
    setLastDismissed({ id: ca.id, name: ca.name });
  };

  const undoDismiss = () => {
    if (!lastDismissed) return;
    setDismissed(prev => {
      const next = new Set(prev);
      next.delete(lastDismissed.id);
      return next;
    });
    setLastDismissed(null);
  };

  const genreLabel = (manuscript.genre || "").trim();
  const metaGenre = genreLabel ? genreLabel.toUpperCase() : "YOUR MANUSCRIPT";

  return (
    <MountPanel style={{ background: parchment }}>
      {/* ── Uniform header: burgundy rule + Playfair title · mono meta + Compass emblem ── */}
      <div
        className="flex items-center justify-between flex-wrap"
        style={{
          padding: "13px 16px 12px",
          gap: 10,
          background: "linear-gradient(180deg, rgba(138,158,136,0.12), rgba(138,158,136,0.03))",
          borderBottom: `1px solid ${SAGE_RULE}`,
        }}
      >
        <span className="flex items-center" style={{ minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{ width: 3, height: 18, borderRadius: 2, background: burgundy, marginRight: 12, flexShrink: 0, display: "inline-block" }}
          />
          <span style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 500, color: headingInk, lineHeight: 1.1 }}>
            Agents who might suit this manuscript
          </span>
        </span>
        <span className="flex items-center" style={{ gap: 12, flexShrink: 0 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.06em", color: labelColor, whiteSpace: "nowrap" }}>
            {metaGenre} · {matches.length} candidate{matches.length === 1 ? "" : "s"}, ranked on fit
          </span>
          <Compass style={{ width: 20, height: 20, color: burgundy, flexShrink: 0 }} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "14px 16px 16px" }}>
        <p style={{ fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 300, color: mutedInk, lineHeight: 1.5, margin: "0 0 14px" }}>
          A few verified agents from the community catalogue whose genre and wish list fit this manuscript.
          Response data will come later.
        </p>

        {matches.length === 0 ? (
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontStyle: "italic",
              fontSize: 13,
              color: mutedInk,
              lineHeight: 1.5,
              textAlign: "center",
              padding: "26px 18px",
              background: "rgba(124,58,42,0.025)",
              border: "1px dashed rgba(124,58,42,0.16)",
              borderRadius: 10,
            }}
          >
            Nothing to suggest just yet — the community catalogue is still growing. Once there are verified
            agents who fit {genreLabel ? genreLabel : "this manuscript"}
            {manuscript.wordCount ? ` at around ${manuscript.wordCount.toLocaleString()} words` : ""}, a few will appear here.
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {matches.map(({ agent, score, overlappingWords, genreScore, mswlScore }) => {
              const band = fitBand(score);
              const isAdded = added.has(agent.id);
              const isAdding = adding === agent.id;
              const verified = verifiedLabel(agent.lastVerifiedDate);
              const isOpen = agent.submissionStatus === SubmissionStatus.OPEN;
              const showGenreChip = genreScore > 0 && genreLabel.length > 0;
              const showMswlChip = mswlScore > 0;
              return (
                <div
                  key={agent.id}
                  style={{
                    background: "#fffdf9",
                    border: "1px solid rgba(124,58,42,0.12)",
                    borderRadius: 11,
                    padding: "13px 14px",
                  }}
                >
                  {/* Top row: name + agency · fit band */}
                  <div className="flex items-start justify-between" style={{ gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: FONT_SERIF, fontSize: 15.5, fontWeight: 600, color: bodyInk, lineHeight: 1.2 }}>
                        {agent.name}
                      </div>
                      <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: mutedInk, marginTop: 1 }}>
                        {agent.agency || "Independent"}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 9.5,
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: band.fg,
                        background: band.bg,
                        border: `1px solid ${band.border}`,
                        borderRadius: 999,
                        padding: "3px 9px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {band.label}
                    </span>
                  </div>

                  {/* Matched-signal chips */}
                  {(showGenreChip || showMswlChip) && (
                    <div className="flex flex-wrap items-center" style={{ gap: 6, marginTop: 9 }}>
                      {showGenreChip && (
                        <span
                          className="inline-flex items-center"
                          style={{
                            gap: 4, fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 500, color: sageText,
                            background: statusSageFill, border: `1px solid ${SAGE_RULE}`, borderRadius: 999, padding: "2px 8px 2px 6px",
                          }}
                        >
                          <Check style={{ width: 11, height: 11, color: sageText }} strokeWidth={2.5} aria-hidden="true" />
                          {genreLabel}
                        </span>
                      )}
                      {showMswlChip && (
                        <span
                          className="inline-flex items-center"
                          style={{
                            gap: 4, fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 500, color: sageText,
                            background: statusSageFill, border: `1px solid ${SAGE_RULE}`, borderRadius: 999, padding: "2px 9px",
                          }}
                        >
                          Matches your wish list
                        </span>
                      )}
                    </div>
                  )}

                  {/* Wish-list excerpt (Caveat), matched terms in burgundy — only if present */}
                  {agent.mswlNotes && (
                    <p
                      style={{
                        fontFamily: CAVEAT, fontSize: 15.5, lineHeight: 1.3, color: "#4a3b32", margin: "9px 0 0",
                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}
                    >
                      <HighlightedWishlist notes={agent.mswlNotes} terms={overlappingWords} />
                    </p>
                  )}

                  {/* Trust strip — each item conditional, never fabricated */}
                  {(isOpen || verified) && (
                    <div className="flex flex-wrap items-center" style={{ gap: 14, marginTop: 11 }}>
                      {isOpen && (
                        <span className="inline-flex items-center" style={{ gap: 5, fontFamily: FONT_MONO, fontSize: 9.5, color: sageText }}>
                          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: "#7e9a7b", display: "inline-block" }} />
                          Open to queries
                        </span>
                      )}
                      {verified && (
                        <span className="inline-flex items-center" style={{ gap: 5, fontFamily: FONT_MONO, fontSize: 9.5, color: labelColor }}>
                          <ShieldCheck style={{ width: 12, height: 12, color: sageText }} strokeWidth={2} aria-hidden="true" />
                          Verified {verified}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between" style={{ gap: 10, marginTop: 12 }}>
                    {isAdded ? (
                      <span
                        className="inline-flex items-center"
                        style={{ gap: 5, fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color: sageText }}
                      >
                        <Check style={{ width: 14, height: 14, color: sageText }} strokeWidth={2.5} aria-hidden="true" />
                        Added to your agents
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(agent)}
                        disabled={isAdding}
                        className="inline-flex items-center transition-colors"
                        style={{
                          gap: 5, fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color: deepBurgundy,
                          background: buttonPinkBg, border: `1px solid ${buttonPinkBorder}`, borderRadius: 8,
                          padding: "6px 13px", cursor: isAdding ? "default" : "pointer", opacity: isAdding ? 0.6 : 1,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = buttonPinkHoverBg; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = buttonPinkBg; }}
                      >
                        <Plus style={{ width: 14, height: 14 }} strokeWidth={2.4} aria-hidden="true" />
                        {isAdding ? "Adding…" : "Add to my agents"}
                      </button>
                    )}
                    {!isAdded && (
                      <button
                        type="button"
                        onClick={() => dismiss(agent)}
                        className="transition-colors"
                        style={{
                          fontFamily: FONT_SANS, fontSize: 11.5, fontWeight: 500, color: labelColor,
                          background: "transparent", border: "none", cursor: "pointer", padding: "4px 2px",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = mutedInk; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = labelColor; }}
                      >
                        Not a fit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Session-only Undo for the last dismissal */}
        {lastDismissed && (
          <div
            className="flex items-center justify-between"
            style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 8,
              background: "rgba(124,58,42,0.04)", border: "1px solid rgba(124,58,42,0.10)",
            }}
          >
            <span style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: mutedInk }}>
              Removed <strong style={{ color: bodyInk, fontWeight: 600 }}>{lastDismissed.name}</strong> from suggestions
            </span>
            <button
              type="button"
              onClick={undoDismiss}
              style={{ fontFamily: FONT_SANS, fontSize: 11.5, fontWeight: 600, color: burgundy, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </MountPanel>
  );
};
