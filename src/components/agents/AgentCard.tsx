/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — the card FACE (design authority: design-refs/agent-list-mockup.html).
 *
 * Band (relationship pill · stars · pencil) → identity (avatar, Playfair name, italic agency, mono
 * meta) → your history → wishlist → materials wanted → note preview → footer (Log query ·
 * Submissions page), with the closed-for-submissions stamp over the whole face when their door is
 * shut. Every value is derived in src/lib/agentList.ts; nothing here is stored.
 *
 * Two locked-component rules hold: status visuals are the real `StatusDot` (never a local SVG
 * approximation), and the scene/rotor/face nesting is the flip structure Phase 3 completes — the
 * rotor must never gain an `overflow` property.
 */
import React from "react";
import { Pencil, Send } from "lucide-react";
import { Agent, Activity, Manuscript, Query } from "../../types";
import { agentInitials, agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { countryName, flagFor } from "../../lib/territory";
import { StatusDot } from "../StatusDot";
import "flag-icons/css/flag-icons.min.css";
import {
  agentRelationship,
  agentStateClass,
  cardHistory,
  closedStampDate,
  isDoorOpen,
  materialsSummary,
  metaTokens,
  notePreview,
  relationshipLabel,
  wishlistChips,
} from "../../lib/agentList";

/** Display-only amber stars. Per amendment A an UNRATED agent shows NO stars — never five hollow. */
const Stars: React.FC<{ rating?: number; size?: number }> = ({ rating, size = 11 }) => {
  if (!rating || rating < 1) return null;
  return (
    <span className="agl-stars" aria-label={`${rating} of 5 — fit`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z"
            fill={i <= rating ? "#BA7517" : "none"}
            stroke={i <= rating ? "#BA7517" : "#c9bda9"}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
};

const PinGlyph: React.FC = () => (
  <svg className="pinmark" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 17v5M6.5 12.5 5 14h14l-1.5-1.5V9a2 2 0 0 0-1-1.7L15 6V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v2l-1.5 1.3a2 2 0 0 0-1 1.7v3.5z" />
  </svg>
);

interface AgentCardProps {
  agent: Agent;
  /** True while this card is the one flipped open (one at a time — the parent enforces it). */
  flipped?: boolean;
  /** The editor face, mounted only for the flipped card. */
  editor?: React.ReactNode;
  queries: Query[];
  manuscripts: Manuscript[];
  activities: Activity[];
  /** Opens the flip editor (Phase 3 owns the flip itself). */
  onEdit: (agentId: string) => void;
  /** Log a query against this agent — preselects them in the focus form. */
  onLogQuery: (agent: Agent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, queries, manuscripts, activities, onEdit, onLogQuery, flipped = false, editor }) => {
  const stateClass = agentStateClass(agent, queries);
  const open = isDoorOpen(agent);
  const history = cardHistory(agent, queries, manuscripts);
  const { shown, more } = wishlistChips(agent);
  const materials = materialsSummary(agent);
  const preview = notePreview(agent);
  const website = (agent.website || "").trim();
  // WHERE they are. The flag comes from the installed flag-icons set (a class, not markup), so
  // every country resolves without hand-drawing SVGs. Absent country ⇒ no flag; absent city ⇒ the
  // country name stands in, because an empty line reads as missing data rather than as absence.
  const flagClass = flagFor(agent.country);
  const locationText = (agent.city || "").trim() || countryName(agent.country) || "";

  return (
    <div className={`agl-scene ${stateClass}`}>
      <div className={`agl-rotor${flipped ? " flipped" : ""}`}>
        <div className="agl-facef">
          <div className="agl-acard">
            <div className="agl-band">
              <span className="agl-tag">{relationshipLabel(agentRelationship(agent.id, queries))}</span>
              <Stars rating={agent.starRating} />
              <button
                type="button"
                className="agl-pencil"
                onClick={() => onEdit(agent.id)}
                title={`Edit ${agentPrimary(agent)}`}
                aria-label={`Edit ${agentPrimary(agent)}`}
              >
                <Pencil width={13} height={13} aria-hidden="true" />
              </button>
            </div>

            <div className="agl-main">
              <div className="agl-av">
                {agent.image ? (
                  <img src={agent.image} alt="" />
                ) : (
                  <div className="ini">{agentInitials(agent)}</div>
                )}
              </div>
              <div className="agl-who">
                <div className="agl-name">{agentPrimary(agent)}</div>
                <div className="agl-agency">{agentSecondary(agent)}</div>
                {/* WHERE they are — between the agency and the mono meta line. Rendered only when
                    the agent actually has a location: no country and no city means nothing to say,
                    and a placeholder would be noise on every unlocated record. */}
                {locationText && (
                  <div className="agl-loc">
                    {flagClass && <span className={`fl ${flagClass}`} aria-hidden="true" />}
                    <span className="ct">{locationText}</span>
                  </div>
                )}
                <div className="agl-meta">
                  {metaTokens(agent).map((t, i) => (
                    <React.Fragment key={t}>
                      {i > 0 && <span className="d" aria-hidden="true" />}
                      <span>{t}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="agl-body">
              <div>
                <div className="agl-sect">Your history</div>
                <div className="agl-hist">
                  {history.length ? (
                    history.map((h) => (
                      <React.Fragment key={h.queryId}>
                        <span className="agl-hdot" title={h.title}>
                          <StatusDot status={h.status} overrideSize={15} decorative />
                        </span>
                        <span className="lbl">{h.title}</span>
                      </React.Fragment>
                    ))
                  ) : (
                    <span className="agl-none">Never queried.</span>
                  )}
                </div>
              </div>

              <div className="agl-hr" />

              <div>
                <div className="agl-sect">Wishlist</div>
                <div className="agl-gtags">
                  {shown.length ? (
                    <>
                      {shown.map((g) => (
                        <span className="agl-gtag" key={g}>{g}</span>
                      ))}
                      {more > 0 && <span className="agl-gtag more">+{more}</span>}
                    </>
                  ) : (
                    <span className="agl-none">No wishlist recorded.</span>
                  )}
                </div>
              </div>

              <div className="agl-hr" />

              <div>
                <div className="agl-sect">Materials wanted</div>
                <div className="agl-matline">
                  {materials ?? <span className="agl-none">Nothing recorded — check their site.</span>}
                </div>
              </div>

              {preview && (
                <div className="agl-notep">
                  {preview.pinned && <PinGlyph />}
                  {preview.text}
                </div>
              )}
            </div>

            {!open && (
              <div className="agl-stamp" aria-hidden="true">
                <div className="agl-stamp-in">
                  <div className="s1">Closed for submissions</div>
                  <div className="s2">Last updated {closedStampDate(agent, activities) || "—"}</div>
                </div>
              </div>
            )}

            <div className="agl-foot">
              {open ? (
                <button type="button" className="agl-btn agl-btn-dark" onClick={() => onLogQuery(agent)}>
                  <Send width={13} height={13} aria-hidden="true" />
                  Log query
                </button>
              ) : (
                <button type="button" className="agl-btn" disabled title="Closed for submissions at the moment">
                  Log query
                </button>
              )}
              <button
                type="button"
                className="agl-btn agl-btn-ghost"
                disabled={!website}
                title={website ? `Open ${website}` : "No submissions page on file"}
                onClick={() => {
                  if (website) {
                    const href = /^https?:\/\//i.test(website) ? website : `https://${website}`;
                    window.open(href, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                Submissions page
              </button>
            </div>
          </div>
        </div>
        {/* Back face — pre-rotated 180° in CSS; mounted only while flipped so the editor's
            draft state is created fresh on open and torn down on close. */}
        <div className="agl-faceb" aria-hidden={!flipped}>{flipped ? editor : null}</div>
      </div>
    </div>
  );
};
