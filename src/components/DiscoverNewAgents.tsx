/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DiscoverNewAgents — the "Discover new agents" page (Agents › Discover), Phase-1 redesign.
 *
 * Ranked agent suggestions with a transparent "why": fit band + /100 display score, why-chips,
 * a wish-list personalisation hook (matched MSWL terms highlighted via the shared scorer's
 * overlappingWords), a truthful trust story, priority LENSES that re-rank client-side over
 * signals that exist, working filters, and a session-only querying batch. All derivations live
 * in src/lib/discoverAgents.ts (unit-tested); the match maths is the untouched shared engine in
 * communityMatch.ts.
 *
 * Data honesty (hard rule): every trust signal is bound to a real field — "Verified {date}" from
 * lastVerifiedDate, open status from submissionStatus, reply time from responseTimeWeeks,
 * "Queried by N writers" zero-suppressed from communityQueryCount. CommunityAgent has NO
 * location or legitimacy (AAA/no-fee) fields yet, so: no location chip, no "Local first" lens,
 * no UK-only filter, and the trust banner uses the honest hand-verified copy — never the
 * fabricated version. "Add & draft query" is deliberately absent: LogQueryFocusForm has no
 * pre-fill seam (flagged follow-up), and query records are never created blind.
 *
 * Theming: consumes the shell theme tokens (on the AppShell root, so this route IS themed) with
 * Cappuccino fallbacks; page-scoped --dv-* tokens live in agents/discover.css. Buttons use the
 * shared .sa-btn treatment (v37: no primary/ghost split). Critical colours stay inline or in the
 * page CSS — never Tailwind colour classes (they've overridden inline-critical colours before).
 *
 * Layout model kept from the previous page: a flex child of the fillColumn agents slot under the
 * 44px sub-nav; the page grows and the STAGE scrolls (no 100vh/bar offsets). The batch tray is
 * position:sticky against the stage scrollport. Manuscript selector behaviour kept: 0 → empty
 * state, 1 → auto-selected + hidden, 2+ → pill selector.
 */
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { pickableManuscripts } from "../lib/lifecycle";
import { CommunityAgent, SubmissionStatus } from "../types";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import { agencyKey, nameCompatible } from "../lib/smartImportReviewModel";
import { genreWordCountRange } from "../lib/manuscripts";
import {
  buildDiscoverEntries,
  rankEntries,
  availableLenses,
  locationCoverage,
  isUkIreland,
  LENS_META,
  DiscoverLens,
  DiscoverEntry,
  score100,
  manuscriptReadiness,
  highlightSegments,
  topHookTerm,
  monthYearLabel,
  catalogueMeta,
} from "../lib/discoverAgents";
import { getHomeCountry, flagFor, agentLocation } from "../lib/territory";
import { FONT_SERIF, FONT_SANS, FONT_MONO } from "../lib/designTokens";
import { ChromeSlab } from "./shell/ChromeSlab";
import { BookOpen, ShieldCheck, Check, Plus, Bookmark, BookmarkCheck, X, Send } from "lucide-react";
import "flag-icons/css/flag-icons.min.css";
import "./agents/discover.css";

interface DiscoverNewAgentsProps {
  onNavigate?: (tab: string, subPageName?: string) => void;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const BAND_LABEL: Record<DiscoverEntry["tier"], string> = {
  strong: "Strong fit",
  good: "Good fit",
  possible: "Possible fit",
};

/** Which why-chip leads (accent fill) under each lens. */
const LENS_LEAD_CHIP: Record<DiscoverLens, string> = {
  best: "genre",
  mswl: "wish",
  fast: "replies",
  open: "genre",
  local: "loc",
};

const mono = (size: number): React.CSSProperties => ({
  fontFamily: FONT_MONO,
  fontSize: size,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
});

export const DiscoverNewAgents: React.FC<DiscoverNewAgentsProps> = ({ onNavigate }) => {
  const { communityAgents, agents, manuscripts, addAgent, currentUser } = useScriptAllyDb();
  const pickable = useMemo(() => pickableManuscripts(manuscripts), [manuscripts]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pickable.find((m) => m.id === selectedId) || pickable[0];

  // "Local" = the user's home market (stored homeCountry → browser guess → GB default).
  const homeCountry = getHomeCountry(currentUser);

  // Lens + filters — all client-side over the scored candidate set.
  const [lens, setLens] = useState<DiscoverLens>("best");
  const [openOnly, setOpenOnly] = useState(true); // matches the old behaviour (closed never shown)
  const [hideHeld, setHideHeld] = useState(true); // "Not already in my database"
  const [ukiOnly, setUkiOnly] = useState(false); // "UK & Ireland only" — off by default

  // Session-only card state (same lifetime as the old panel's dismiss/add sets).
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [lastDismissed, setLastDismissed] = useState<{ id: string; name: string } | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  // The querying batch — session-only bookmarks, no persistence, no schema.
  const [batch, setBatch] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);

  // Already-held: exact name+agency, or fuzzy agency+name (the Smart-Import dedupe, as before).
  const heldIds = useMemo(() => {
    const held = new Set<string>();
    for (const ca of communityAgents || []) {
      const caKey = agencyKey(ca.agency);
      const isHeld = agents.some((a) => {
        const exact =
          a.name.trim().toLowerCase() === ca.name.trim().toLowerCase() &&
          a.agency.trim().toLowerCase() === ca.agency.trim().toLowerCase();
        if (exact) return true;
        return agencyKey(a.agency) === caKey && nameCompatible(a.name, ca.name);
      });
      if (isHeld) held.add(ca.id);
    }
    return held;
  }, [communityAgents, agents]);

  const lenses = useMemo(() => availableLenses(communityAgents || []), [communityAgents]);
  const activeLens: DiscoverLens = lenses.includes(lens) ? lens : "best";

  // Location-backed controls render only when the catalogue actually carries location data.
  const hasLocations = useMemo(() => locationCoverage(communityAgents || []) > 0, [communityAgents]);

  const trust = useMemo(() => catalogueMeta(communityAgents || []), [communityAgents]);

  // Candidate set (threshold-gated, unsorted) → visible (filters + dismissals) → ranked by lens.
  const entries = useMemo(
    () => (selected ? buildDiscoverEntries(communityAgents || [], selected) : []),
    [communityAgents, selected],
  );
  const visible = useMemo(() => {
    let v = entries.filter((e) => !dismissed.has(e.agent.id));
    if (openOnly) v = v.filter((e) => e.agent.submissionStatus !== SubmissionStatus.CLOSED);
    if (ukiOnly) v = v.filter((e) => isUkIreland(e.agent.country));
    // Keep a just-added agent visible so its done-state shows (as the old panel did).
    if (hideHeld) v = v.filter((e) => added.has(e.agent.id) || !heldIds.has(e.agent.id));
    return rankEntries(v, activeLens, homeCountry);
  }, [entries, dismissed, openOnly, ukiOnly, hideHeld, heldIds, added, activeLens, homeCountry]);

  // First-run / zero-matches sell: no manuscripts at all, or a ZERO candidate set for the selected
  // one (entries is threshold-gated and pre-filter — matches merely hidden by filters/dismissals
  // keep the results view and its existing "hidden by your filters" affordance).
  const firstRun = pickable.length === 0 || entries.length === 0;
  const tryNextManuscript = () => {
    if (pickable.length < 2 || !selected) return;
    const i = pickable.findIndex((m) => m.id === selected.id);
    setSelectedId(pickable[(i + 1) % pickable.length].id);
  };

  const readiness = useMemo(
    () =>
      selected
        ? manuscriptReadiness(selected, genreWordCountRange(selected.ageCategory, selected.genre))
        : null,
    [selected],
  );

  const handleAdd = async (ca: CommunityAgent): Promise<boolean> => {
    setAdding(ca.id);
    try {
      const result = await addAgent({
        name: ca.name,
        agency: ca.agency,
        email: ca.email,
        website: ca.website,
        country: ca.country,
        city: ca.city,
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
        notes: selected
          ? `Added from Discover — a genre/wish-list match for "${selected.title}".`
          : "Added from Discover.",
      });
      if (result.success) {
        // Best-effort popularity bump on the shared catalogue doc (the only client write rules allow).
        try {
          await updateDoc(doc(db, "communityAgents", ca.id), { contributedByCount: increment(1) });
        } catch (countErr) {
          console.error("Failed to increment contributedByCount:", countErr);
        }
        setAdded((prev) => new Set(prev).add(ca.id));
        // An agent just added is no longer a bookmark candidate — keep the tray truthful.
        setBatch((prev) => {
          if (!prev.has(ca.id)) return prev;
          const next = new Set(prev);
          next.delete(ca.id);
          return next;
        });
        return true;
      }
      console.error("Failed to add community agent:", result.error);
      return false;
    } catch (err) {
      console.error("Error adding community agent:", err);
      return false;
    } finally {
      setAdding(null);
    }
  };

  const toggleBatch = (id: string) => {
    setBatch((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const batchAgents = useMemo(
    () => (communityAgents || []).filter((ca) => batch.has(ca.id)),
    [communityAgents, batch],
  );

  const handleAddAll = async () => {
    setBatchBusy(true);
    try {
      for (const ca of batchAgents) {
        if (added.has(ca.id) || heldIds.has(ca.id)) {
          setBatch((prev) => {
            const next = new Set(prev);
            next.delete(ca.id);
            return next;
          });
          continue;
        }
        const ok = await handleAdd(ca);
        if (ok) {
          setBatch((prev) => {
            const next = new Set(prev);
            next.delete(ca.id);
            return next;
          });
        }
        // Failures stay in the batch so nothing silently vanishes.
      }
    } finally {
      setBatchBusy(false);
    }
  };

  const dismiss = (ca: CommunityAgent) => {
    setDismissed((prev) => new Set(prev).add(ca.id));
    setLastDismissed({ id: ca.id, name: ca.name });
  };

  const undoDismiss = () => {
    if (!lastDismissed) return;
    setDismissed((prev) => {
      const next = new Set(prev);
      next.delete(lastDismissed.id);
      return next;
    });
    setLastDismissed(null);
  };

  /* ── Readiness line copy — computed, truthful, nothing fabricated ── */
  const readinessParts: string[] = [];
  if (selected && readiness) {
    if (readiness.fit && readiness.rangeLabel && selected.wordCount) {
      const verb =
        readiness.fit === "in" ? "sits in" : readiness.fit === "long" ? "runs long of" : "runs short of";
      const genreBit = [selected.ageCategory, selected.genre].filter(Boolean).join(" ");
      readinessParts.push(
        `${selected.wordCount.toLocaleString()} words ${verb} the ${readiness.rangeLabel} range${genreBit ? ` for ${genreBit}` : ""}`,
      );
    }
    if (readiness.hasLogline && readiness.hasComps) {
      readinessParts.push("logline ✓ · comps ✓");
    } else if (!readiness.hasLogline && !readiness.hasComps) {
      readinessParts.push("add a logline and comp titles — the wish-list match reads both");
    } else if (!readiness.hasLogline) {
      readinessParts.push("comps ✓ · add a logline to sharpen wish-list matching");
    } else {
      readinessParts.push("logline ✓ · add comp titles to sharpen wish-list matching");
    }
  }

  const hiddenByFilters = selected ? entries.filter((e) => !dismissed.has(e.agent.id)).length - visible.length : 0;

  return (
    <div className="dv2">
      {/* ── Page header — the unified ChromeSlab, mounted at the CONTENT-COLUMN level (outside
            the width-constrained .dv-wrap) so it spans rail edge to viewport edge like every
            other slabbed page. ── */}
      <ChromeSlab onNavigate={onNavigate} title="Discover new agents" />
      <div className="dv-wrap">
        {firstRun ? (
          /* ── First-run / zero-matches feature sell — hero + benefits + adaptive action strip +
                inert example card. Results chrome (trust banner, readiness, lenses, filters) is
                hidden here; the hero carries the vetting message. ── */
          <div className="dv-fr" style={{ fontFamily: FONT_SANS }}>
            <div>
              <div className="dv-fr-eyebrow">
                <span className="dv-pro">Pro</span>
                Discover new agents
              </div>
              <h2 className="dv-fr-title">
                Find the agents your book was <em>written for</em>.
              </h2>
              <p className="dv-fr-lead">
                ScriptAlly scores every agent in its hand-checked catalogue against your manuscript
                — genre, age category and wish-list overlap — and shows you why each one fits
                before you query.
              </p>
            </div>

            <div className="dv-fr-benefits">
              <div className="dv-card dv-fr-bcard">
                <span className="dv-fr-icon"><BookOpen aria-hidden="true" strokeWidth={1.8} /></span>
                <h3 className="dv-fr-btitle">Matched to your book</h3>
                <p className="dv-fr-bline">
                  Suggestions are ranked by real overlap with your genre, age category and themes —
                  not an alphabetical directory.
                </p>
              </div>
              <div className="dv-card dv-fr-bcard">
                <span className="dv-fr-icon"><ShieldCheck aria-hidden="true" strokeWidth={1.8} /></span>
                <h3 className="dv-fr-btitle">Every agent vetted</h3>
                <p className="dv-fr-bline">
                  Real agencies, hand-checked and kept current by ScriptAlly — and never one that
                  charges a reading fee.
                </p>
              </div>
              <div className="dv-card dv-fr-bcard">
                <span className="dv-fr-icon"><Send aria-hidden="true" strokeWidth={1.8} /></span>
                <h3 className="dv-fr-btitle">A head start on your query</h3>
                <p className="dv-fr-bline">
                  Each match pulls out the wish-list line to lead your letter with — the
                  personalisation already found for you.
                </p>
              </div>
            </div>

            <div className="dv-fr-strip">
              {pickable.length === 0 ? (
                <>
                  <p className="dv-fr-msg">Add a manuscript to discover agents who fit it.</p>
                  <button type="button" className="dv-fr-cta" onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}>
                    <Plus aria-hidden="true" strokeWidth={2.2} /> Add a manuscript
                  </button>
                </>
              ) : pickable.length === 1 ? (
                <p className="dv-fr-msg">
                  No matches for <strong>{selected?.title}</strong> yet — we'll surface fits here
                  as we add agents in {selected?.genre || "your genre"}. Check back soon.
                </p>
              ) : (
                <>
                  <p className="dv-fr-msg">
                    No matches for <strong>{selected?.title}</strong> yet — the catalogue's still
                    growing in {selected?.genre || "your genre"}.
                  </p>
                  <div className="flex flex-wrap" style={{ gap: 8 }}>
                    {pickable.map((m) => {
                      const isSel = selected?.id === m.id;
                      return (
                        <button key={m.id} type="button" className={`dv-mspill${isSel ? " on" : ""}`} onClick={() => setSelectedId(m.id)} aria-pressed={isSel}>
                          <div style={{ fontFamily: FONT_SERIF, fontSize: 13.5, fontWeight: 600, lineHeight: 1.1 }}>{m.title}</div>
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" className="dv-fr-cta" onClick={tryNextManuscript}>
                    Try another manuscript
                  </button>
                </>
              )}
            </div>

            {/* Example match — what a real suggestion looks like. Illustrative and inert; only
                real card capabilities shown (fit band, chips, wish-list hook, verified date, the
                real add/dismiss actions) — nothing fabricated. */}
            <div className="dv-fr-exwrap">
              <span className="dv-fr-exflag">Example</span>
              <div className="dv-card dv-fr-example" aria-label="Example of a match card">
                <div className="flex items-start justify-between" style={{ gap: 12 }}>
                  <div className="flex items-center" style={{ gap: 12, minWidth: 0 }}>
                    <span className="dv-fr-av" aria-hidden="true">EW</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 600, color: "var(--dv-ink)", lineHeight: 1.2 }}>
                        Eleanor Whitcombe
                      </div>
                      <div style={{ ...mono(10), color: "var(--dv-muted)", marginTop: 2 }}>Marsh &amp; Tide Literary</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end" style={{ gap: 5, flexShrink: 0 }}>
                    <span className="dv-band strong" style={{ fontFamily: FONT_MONO }}>{BAND_LABEL.strong}</span>
                    <span className="dv-fr-vbadge">Verified Jun 2026</span>
                  </div>
                </div>
                <div className="flex flex-wrap" style={{ gap: 6, marginTop: 11 }}>
                  <span className="dv-chip">Literary Fiction</span>
                  <span className="dv-chip">Matches your wish list</span>
                </div>
                <p style={{ fontFamily: FONT_SERIF, fontSize: 13, color: "var(--dv-ink)", lineHeight: 1.6, margin: "11px 0 0" }}>
                  "Quiet, voice-led stories about <span className="dv-fr-mark">family</span>,{" "}
                  <span className="dv-fr-mark">memory</span> and{" "}
                  <span className="dv-fr-mark">coastal communities</span> — I want prose with real
                  rhythm."
                </p>
                <p style={{ ...mono(9.5), color: "var(--dv-muted)", margin: "10px 0 0" }}>
                  Open to queries · Replies in ~8 wk
                </p>
                <div className="flex" style={{ gap: 9, marginTop: 13 }} aria-hidden="true">
                  <span className="sa-btn dv-btn" style={{ fontFamily: FONT_SANS }}>
                    <Plus style={{ width: 14, height: 14 }} strokeWidth={2.4} aria-hidden="true" /> Add to my agents
                  </span>
                  <span className="dv-quiet" style={{ fontFamily: FONT_SANS }}>Dismiss</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
        <p
          style={{
            fontFamily: FONT_SANS,
            fontSize: 13.5,
            fontWeight: 300,
            color: "var(--dv-muted)",
            margin: "0 0 16px",
            lineHeight: 1.5,
          }}
        >
          Ranked matches for your manuscript from the verified community catalogue — with the why
          behind every suggestion.
        </p>

        {/* ── Trust banner — the HONEST version: no legitimacy fields exist on the record yet,
              so no AAA/no-fee claims. Count + date are derived from real catalogue fields. ── */}
        <div className="dv-trust" style={{ marginBottom: 18 }}>
          <span className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
            <ShieldCheck
              aria-hidden="true"
              style={{ width: 18, height: 18, color: "var(--acc, #7c3a2a)", flexShrink: 0 }}
              strokeWidth={1.8}
            />
            <span style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: "var(--band-strong, #4a4036)", lineHeight: 1.45 }}>
              <strong style={{ fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 600 }}>
                Every agent here is hand-verified.
              </strong>{" "}
              A real agency, checked and kept current by ScriptAlly.
            </span>
          </span>
          <span style={{ ...mono(9.5), color: "var(--band-meta, #705e46)", whiteSpace: "nowrap", flexShrink: 0 }}>
            {trust.count} agent{trust.count === 1 ? "" : "s"}
            {trust.lastCheckedLabel ? ` · last checked ${trust.lastCheckedLabel}` : ""}
          </span>
        </div>

        {/* ── Results view — first-run (zero matches / no manuscripts) never reaches here ── */}
            {/* ── Manuscript selector — only when there's a real choice ── */}
            {pickable.length >= 2 && (
              <div style={{ marginBottom: 14 }}>
                <span style={{ ...mono(9.5), color: "var(--dv-muted)" }}>Finding agents for</span>
                <div className="flex flex-wrap" style={{ gap: 8, marginTop: 8 }}>
                  {pickable.map((m) => {
                    const isSel = selected?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`dv-mspill${isSel ? " on" : ""}`}
                        onClick={() => setSelectedId(m.id)}
                        aria-pressed={isSel}
                      >
                        <div style={{ fontFamily: FONT_SERIF, fontSize: 13.5, fontWeight: 600, lineHeight: 1.1 }}>
                          {m.title}
                        </div>
                        <div
                          style={{
                            fontFamily: FONT_MONO,
                            fontSize: 9.5,
                            marginTop: 3,
                            color: isSel ? "rgba(255,255,255,0.82)" : "var(--dv-muted)",
                          }}
                        >
                          {[m.genre, m.wordCount ? `${Math.round(m.wordCount / 1000)}k words` : ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Readiness line — word count vs the genre range + materials presence ── */}
            {selected && readinessParts.length > 0 && (
              <p
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 12,
                  color: "var(--dv-muted)",
                  margin: "0 0 16px",
                  lineHeight: 1.5,
                }}
              >
                <span style={{ ...mono(9.5), color: "var(--dv-muted)", marginRight: 8 }}>Readiness</span>
                {readinessParts.join(" · ")}
              </p>
            )}

            {/* ── Lenses + filters ── */}
            <div
              className="flex flex-wrap items-center justify-between"
              style={{ gap: 10, marginBottom: 8 }}
            >
              <div className="flex flex-wrap items-center" style={{ gap: 6 }} role="group" aria-label="Ranking lens">
                {lenses.map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={activeLens === l}
                    className={`dv-lens${activeLens === l ? " on" : ""}`}
                    style={{ fontFamily: FONT_SANS }}
                    onClick={() => setLens(l)}
                  >
                    {LENS_META[l].label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
                <button
                  type="button"
                  aria-pressed={openOnly}
                  className={`dv-filter${openOnly ? " on" : ""}`}
                  style={{ fontFamily: FONT_SANS }}
                  onClick={() => setOpenOnly((v) => !v)}
                >
                  {openOnly && <Check style={{ width: 11, height: 11 }} strokeWidth={2.5} aria-hidden="true" />}
                  Open to submissions
                </button>
                <button
                  type="button"
                  aria-pressed={hideHeld}
                  className={`dv-filter${hideHeld ? " on" : ""}`}
                  style={{ fontFamily: FONT_SANS }}
                  onClick={() => setHideHeld((v) => !v)}
                >
                  {hideHeld && <Check style={{ width: 11, height: 11 }} strokeWidth={2.5} aria-hidden="true" />}
                  Not already in my database
                </button>
                {hasLocations && (
                  <button
                    type="button"
                    aria-pressed={ukiOnly}
                    className={`dv-filter${ukiOnly ? " on" : ""}`}
                    style={{ fontFamily: FONT_SANS }}
                    onClick={() => setUkiOnly((v) => !v)}
                  >
                    {ukiOnly && <Check style={{ width: 11, height: 11 }} strokeWidth={2.5} aria-hidden="true" />}
                    UK &amp; Ireland only
                  </button>
                )}
              </div>
            </div>

            {/* ── Ranked-by caption — the order IS the rank (no numbering on cards) ── */}
            {selected && (
              <p style={{ ...mono(9.5), color: "var(--dv-muted)", margin: "0 0 12px" }}>
                {visible.length} match{visible.length === 1 ? "" : "es"} for {selected.title} ·{" "}
                {LENS_META[activeLens].caption}
              </p>
            )}

            {/* ── Cards ── */}
            {visible.length === 0 ? (
              <div
                style={{
                  fontFamily: FONT_SERIF,
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "var(--dv-muted)",
                  lineHeight: 1.5,
                  textAlign: "center",
                  padding: "26px 18px",
                  background: "var(--card, #fffefb)",
                  border: "1px dashed var(--dv-line)",
                  borderRadius: 10,
                }}
              >
                {hiddenByFilters > 0 ? (
                  <>
                    {hiddenByFilters} match{hiddenByFilters === 1 ? " is" : "es are"} hidden by your
                    filters.{" "}
                    <button
                      type="button"
                      className="dv-quiet"
                      style={{ fontFamily: FONT_SANS, fontWeight: 600, color: "var(--acc, #7c3a2a)" }}
                      onClick={() => {
                        setOpenOnly(false);
                        setHideHeld(false);
                        setUkiOnly(false);
                      }}
                    >
                      Show everything
                    </button>
                  </>
                ) : (
                  <>
                    Nothing to suggest just yet — the community catalogue is still growing. Once there
                    are verified agents who fit {selected?.genre || "this manuscript"}, they'll rank
                    here.
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 12 }}>
                {visible.map((entry) => {
                  const { agent, breakdown, score, tier } = entry;
                  const isAdded = added.has(agent.id);
                  const isHeld = heldIds.has(agent.id) && !isAdded;
                  const isAdding = adding === agent.id;
                  const inBatch = batch.has(agent.id);
                  const isOpen = agent.submissionStatus === SubmissionStatus.OPEN;
                  const isClosed = agent.submissionStatus === SubmissionStatus.CLOSED;
                  const verified = monthYearLabel(agent.lastVerifiedDate);
                  const checked = monthYearLabel(agent.lastCheckedDate);
                  const hook = topHookTerm(breakdown.overlappingWords);
                  const segments = agent.mswlNotes
                    ? highlightSegments(agent.mswlNotes, breakdown.overlappingWords)
                    : [];

                  // Why chips — each bound to a real contributing signal; the active lens's chip leads.
                  const chips: { key: string; label: React.ReactNode }[] = [];
                  if (breakdown.genreScore > 0 && (selected?.genre || "").trim()) {
                    chips.push({
                      key: "genre",
                      label: (
                        <>
                          <Check style={{ width: 11, height: 11 }} strokeWidth={2.5} aria-hidden="true" />
                          {selected?.genre}
                        </>
                      ),
                    });
                  }
                  if (breakdown.mswlScore > 0) {
                    chips.push({ key: "wish", label: "Matches your wish list" });
                  }
                  if (breakdown.ageScore > 0 && (selected?.ageCategory || "").trim()) {
                    chips.push({
                      key: "age",
                      label: (
                        <>
                          <Check style={{ width: 11, height: 11 }} strokeWidth={2.5} aria-hidden="true" />
                          {selected?.ageCategory}
                        </>
                      ),
                    });
                  }
                  if ((agent.responseTimeWeeks || 0) > 0) {
                    chips.push({ key: "replies", label: `Replies in ~${agent.responseTimeWeeks}wk` });
                  }
                  // Location chip — only when the record's country resolves (flag ⇒ known country).
                  const flag = flagFor(agent.country);
                  const location = agentLocation(agent);
                  if (flag && location) {
                    chips.push({
                      key: "loc",
                      label: (
                        <>
                          <span className={flag} aria-hidden="true" style={{ borderRadius: 2 }} />
                          {location}
                        </>
                      ),
                    });
                  }
                  const leadKey = LENS_LEAD_CHIP[activeLens];
                  chips.sort((a, b) => Number(b.key === leadKey) - Number(a.key === leadKey));

                  return (
                    <div key={agent.id} className={`dv-card${isHeld ? " held" : ""}`}>
                      {/* Identity row + fit band & score */}
                      <div className="flex items-start justify-between" style={{ gap: 12 }}>
                        <div className="flex items-center" style={{ gap: 12, minWidth: 0 }}>
                          <span className="dv-mono" style={{ fontFamily: FONT_SANS }} aria-hidden="true">
                            {getInitials(agent.name)}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: FONT_SERIF,
                                fontSize: 17,
                                fontWeight: 600,
                                color: "var(--dv-ink)",
                                lineHeight: 1.2,
                              }}
                            >
                              {agent.name}
                            </div>
                            <div style={{ ...mono(10), color: "var(--dv-muted)", marginTop: 2 }}>
                              {agent.agency || "Independent"}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end" style={{ gap: 5, flexShrink: 0 }}>
                          <span className={`dv-band ${tier}`} style={{ fontFamily: FONT_MONO }}>
                            {BAND_LABEL[tier]}
                          </span>
                          <span
                            title="Match score from genre, wish-list and age-category fit"
                            style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 700, color: "var(--dv-ink)", lineHeight: 1 }}
                          >
                            {score100(score)}
                            <span style={{ ...mono(9), color: "var(--dv-muted)", marginLeft: 3 }}>/100</span>
                          </span>
                        </div>
                      </div>

                      {/* Why chips */}
                      {chips.length > 0 && (
                        <div className="flex flex-wrap items-center" style={{ gap: 6, marginTop: 11 }}>
                          {chips.map((c) => (
                            <span
                              key={c.key}
                              className={`dv-chip${c.key === leadKey ? " lead" : ""}`}
                              style={{ fontFamily: FONT_SANS }}
                            >
                              {c.label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Wish-list personalisation hook — only when mswlNotes exists */}
                      {agent.mswlNotes && (
                        <div className="dv-wish">
                          <span style={{ ...mono(9), color: "var(--dv-muted)" }}>
                            Their wish list — your personalisation hook
                          </span>
                          <p className="dv-wish-quote">
                            {"“"}
                            {segments.map((seg, i) =>
                              seg.hit ? (
                                <span key={i} className="dv-wish-hit">
                                  {seg.text}
                                </span>
                              ) : (
                                <React.Fragment key={i}>{seg.text}</React.Fragment>
                              ),
                            )}
                            {"”"}
                          </p>
                          {hook && (
                            <p className="dv-wish-prompt" style={{ fontFamily: FONT_SANS }}>
                              They want <strong>{hook}</strong> — lead your query with it.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Meta strip — every item conditional on a real field, never fabricated */}
                      <div className="dv-meta" style={{ fontFamily: FONT_MONO }}>
                        {isOpen && (
                          <span className="item" style={{ color: "var(--dv-good)" }}>
                            <span
                              aria-hidden="true"
                              style={{ width: 6, height: 6, borderRadius: 999, background: "var(--dv-good)", display: "inline-block" }}
                            />
                            Open to queries
                          </span>
                        )}
                        {isClosed && <span className="item">Closed to queries</span>}
                        {(agent.responseTimeWeeks || 0) > 0 && (
                          <span className="item">
                            Replies ~{agent.responseTimeWeeks}wk
                            {agent.noResponseMeansNo ? " · may not reply" : ""}
                          </span>
                        )}
                        {verified ? (
                          <span className="item">
                            <ShieldCheck style={{ width: 12, height: 12, color: "var(--dv-good)" }} strokeWidth={2} aria-hidden="true" />
                            Verified {verified}
                          </span>
                        ) : checked ? (
                          /* Honest fallback when no verified date parses — real check date only. */
                          <span className="item">
                            <ShieldCheck style={{ width: 12, height: 12, color: "var(--dv-good)" }} strokeWidth={2} aria-hidden="true" />
                            Hand-verified · last checked {checked}
                          </span>
                        ) : null}
                        {(agent.communityQueryCount || 0) > 0 && (
                          <span className="item">
                            Queried by {agent.communityQueryCount} writer
                            {agent.communityQueryCount === 1 ? "" : "s"} here
                          </span>
                        )}
                      </div>

                      {/* Actions — "Add & draft query" deliberately absent (no pre-fill seam; see header) */}
                      <div className="flex items-center justify-between" style={{ gap: 10, marginTop: 13 }}>
                        <div className="flex items-center" style={{ gap: 8 }}>
                          {isHeld ? (
                            <span
                              className="inline-flex items-center"
                              style={{ gap: 5, fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color: "var(--dv-good)" }}
                            >
                              <Check style={{ width: 14, height: 14 }} strokeWidth={2.5} aria-hidden="true" />
                              In your agents
                            </span>
                          ) : isAdded ? (
                            <span
                              className="inline-flex items-center"
                              style={{ gap: 5, fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color: "var(--dv-good)" }}
                            >
                              <Check style={{ width: 14, height: 14 }} strokeWidth={2.5} aria-hidden="true" />
                              Added to your agents
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="sa-btn dv-btn"
                                style={{ fontFamily: FONT_SANS }}
                                disabled={isAdding || batchBusy}
                                onClick={() => handleAdd(agent)}
                              >
                                <Plus style={{ width: 14, height: 14 }} strokeWidth={2.4} aria-hidden="true" />
                                {isAdding ? "Adding…" : "Add to my agents"}
                              </button>
                              <button
                                type="button"
                                className="sa-btn dv-btn"
                                style={{ fontFamily: FONT_SANS }}
                                aria-pressed={inBatch}
                                onClick={() => toggleBatch(agent.id)}
                              >
                                {inBatch ? (
                                  <BookmarkCheck style={{ width: 14, height: 14 }} strokeWidth={2.2} aria-hidden="true" />
                                ) : (
                                  <Bookmark style={{ width: 14, height: 14 }} strokeWidth={2.2} aria-hidden="true" />
                                )}
                                {inBatch ? "In your batch" : "Add to batch"}
                              </button>
                            </>
                          )}
                        </div>
                        {!isAdded && !isHeld && (
                          <button
                            type="button"
                            className="dv-quiet"
                            style={{ fontFamily: FONT_SANS }}
                            onClick={() => dismiss(agent)}
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
                  marginTop: 12,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--card, #fffefb)",
                  border: "1px solid var(--dv-line)",
                }}
              >
                <span style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: "var(--dv-muted)" }}>
                  Removed{" "}
                  <strong style={{ color: "var(--dv-ink)", fontWeight: 600 }}>{lastDismissed.name}</strong>{" "}
                  from suggestions
                </span>
                <button
                  type="button"
                  className="dv-quiet"
                  style={{ fontFamily: FONT_SANS, fontWeight: 600, color: "var(--acc, #7c3a2a)" }}
                  onClick={undoDismiss}
                >
                  Undo
                </button>
              </div>
            )}

            {/* ── Querying batch tray — session-only, sticky against the stage scrollport ── */}
            {batch.size > 0 && (
              <div className="dv-batch" role="region" aria-label="Your querying batch" aria-live="polite">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_SERIF, fontSize: 14.5, fontWeight: 600, color: "var(--dv-ink)" }}>
                    Your querying batch · {batch.size}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: "var(--dv-muted)", marginTop: 2 }}>
                    Query in small batches of 5–10 — a focused round beats a blast.
                  </div>
                  <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
                    {batchAgents.map((ca) => (
                      <span key={ca.id} className="dv-batch-chip" style={{ fontFamily: FONT_SANS }}>
                        {ca.name}
                        <button
                          type="button"
                          aria-label={`Remove ${ca.name} from batch`}
                          onClick={() => toggleBatch(ca.id)}
                        >
                          <X style={{ width: 12, height: 12 }} strokeWidth={2.2} aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center" style={{ gap: 10, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="sa-btn dv-btn"
                    style={{ fontFamily: FONT_SANS }}
                    disabled={batchBusy}
                    onClick={handleAddAll}
                  >
                    <Plus style={{ width: 14, height: 14 }} strokeWidth={2.4} aria-hidden="true" />
                    {batchBusy ? "Adding…" : "Add all to my agents"}
                  </button>
                  <button
                    type="button"
                    className="dv-quiet"
                    style={{ fontFamily: FONT_SANS }}
                    disabled={batchBusy}
                    onClick={() => setBatch(new Set())}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
