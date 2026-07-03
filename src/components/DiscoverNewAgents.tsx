/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DiscoverNewAgents — the standalone "Discover new agents" page (Agents → sub-tab). It picks a
 * manuscript and renders the shared ManuscriptAgentSuggestions panel for it (panel reused untouched).
 *
 * Background uses the DASHBOARD page ground (`pageGround` = kraftGlow over kraft) so it matches the
 * Dashboard — deliberately NOT the sage Agents-database ground.
 *
 * Manuscript selector behaviour, keyed off the user's pickable (active/queryable) manuscripts:
 *   • 0 manuscripts → calm empty state + "Add a manuscript" CTA, no panel.
 *   • exactly 1     → auto-selected, selector hidden.
 *   • 2+            → pill selector ("Finding agents for"), defaulting to the first.
 *
 * Critical colours are inline (Tailwind has overridden inline-critical colours here before).
 */
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { pickableManuscripts } from "../lib/lifecycle";
import { ManuscriptAgentSuggestions } from "./ManuscriptAgentSuggestions";
import {
  pageGround,
  bodyInk,
  headingInk,
  mutedInk,
  burgundy,
  deepBurgundy,
  parchment,
  labelColor,
  buttonPinkBg,
  buttonPinkBorder,
  buttonPinkHoverBg,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
} from "../lib/designTokens";
import { BookOpen } from "lucide-react";

interface DiscoverNewAgentsProps {
  onNavigate?: (tab: string, subPageName?: string) => void;
}

export const DiscoverNewAgents: React.FC<DiscoverNewAgentsProps> = ({ onNavigate }) => {
  const { manuscripts } = useScriptAllyDb();
  const pickable = useMemo(() => pickableManuscripts(manuscripts), [manuscripts]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pickable.find(m => m.id === selectedId) || pickable[0];

  return (
    // Dashboard ground (kraftGlow over kraft). Fills the remaining stage height under the 44px
    // agents sub-nav (a flex child of the AppShell agents slot); grows + stage-scrolls when taller.
    // Was minHeight calc(100vh - 108px) against the retired 64px top bar.
    <div style={{ background: pageGround, color: bodyInk, flex: "1 0 auto" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px 44px" }}>
        {/* Page header */}
        <header style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: FONT_SERIF, fontSize: 26, fontWeight: 600, color: headingInk, lineHeight: 1.15, margin: 0 }}>
            Discover new agents
          </h1>
          <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 300, color: mutedInk, margin: "6px 0 0", lineHeight: 1.5 }}>
            Verified agents from the community catalogue who fit your manuscript.
          </p>
        </header>

        {pickable.length === 0 ? (
          /* 0 manuscripts → calm empty state */
          <div
            style={{
              background: parchment,
              border: "1px solid rgba(124,58,42,0.12)",
              borderRadius: 14,
              padding: "40px 28px",
              textAlign: "center",
            }}
          >
            <BookOpen aria-hidden="true" style={{ width: 30, height: 30, color: burgundy, opacity: 0.55, margin: "0 auto 12px" }} strokeWidth={1.6} />
            <div style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, color: bodyInk }}>
              Add a manuscript to discover agents
            </div>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13, color: mutedInk, lineHeight: 1.5, margin: "8px auto 18px", maxWidth: 420 }}>
              Once you've added a manuscript, ScriptAlly will suggest verified agents from the community
              catalogue whose genre and wish list fit it.
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}
              className="inline-flex items-center transition-colors"
              style={{
                fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: deepBurgundy,
                background: buttonPinkBg, border: `1px solid ${buttonPinkBorder}`, borderRadius: 9,
                padding: "8px 16px", cursor: "pointer",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = buttonPinkHoverBg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = buttonPinkBg; }}
            >
              Add a manuscript
            </button>
          </div>
        ) : (
          <>
            {/* Selector — only when there's a real choice (2+ pickable manuscripts) */}
            {pickable.length >= 2 && (
              <div style={{ marginBottom: 18 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: labelColor }}>
                  Finding agents for
                </span>
                <div className="flex flex-wrap" style={{ gap: 8, marginTop: 8 }}>
                  {pickable.map(m => {
                    const isSel = selected?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        aria-pressed={isSel}
                        className="text-left cursor-pointer transition-colors"
                        style={{
                          padding: "7px 13px",
                          borderRadius: 10,
                          border: `1px solid ${isSel ? "transparent" : "rgba(124,58,42,0.18)"}`,
                          background: isSel ? burgundy : parchment,
                          color: isSel ? "#ffffff" : bodyInk,
                        }}
                      >
                        <div style={{ fontFamily: FONT_SERIF, fontSize: 13.5, fontWeight: 600, lineHeight: 1.1 }}>
                          {m.title}
                        </div>
                        <div
                          style={{
                            fontFamily: FONT_MONO, fontSize: 9.5, marginTop: 3,
                            color: isSel ? "rgba(255,255,255,0.82)" : labelColor,
                          }}
                        >
                          {[m.genre, m.wordCount ? `${Math.round(m.wordCount / 1000)}k words` : ""].filter(Boolean).join(" · ")}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selected && <ManuscriptAgentSuggestions manuscript={selected} />}
          </>
        )}
      </div>
    </div>
  );
};
