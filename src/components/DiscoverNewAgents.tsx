/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DiscoverNewAgents — the "Discover new agents" page (Agents › Discover).
 * Ref: design-refs/discover-final-d.html (approved — Matches + Empty · first run).
 *
 * Rendered in the AGENT-LIST v2 language: the page keeps the standard ShellV2 `PageHeader` and
 * mirrors the agent card's grammar (agentList.css `--agl-*` / `.agl-acard`, re-declared page-scoped
 * as `--dv-*` because `.agl-*` is scoped to `.aglist`). Each match is a printed card — ink border,
 * offset shadow, a fit BAND (sage for strong, tan for possible) carrying the fit pill and the
 * verified date, a taupe mono-initial avatar,
 * Playfair name + italic agency, flag + city, a mono meta line, the agency website as a real
 * link, and a "Why it fits" section. Grouped into Strong fits / Possible fits under the
 * agent-list section-rule pattern.
 *
 * PRO treatment ("rule + strip"): a Pro pill beside the title, a 2px Pro rule under the header,
 * and the vetting strip in the Pro tint directly beneath it — controls sit below the strip.
 *
 * Data honesty (hard rule): every signal is bound to a real field — "Verified {date}" from
 * lastVerifiedDate, open status from submissionStatus, reply time from responseTimeWeeks,
 * location from country/city (via the territory helpers), the website from `website`. Anything
 * absent is simply not rendered. CommunityAgent has NO legitimacy field (AAA membership / no-fee
 * assertion), so the vetting copy is the honest hand-checked version and never claims membership
 * of a body we can't evidence. The one exception, clearly labelled as such, is the "What a match
 * looks like" EXAMPLE card in the first-run state — illustrative, inert, and never presented as
 * a real catalogue record.
 *
 * All colour comes from existing tokens (the agent-list palette + the app-wide `--slate` Pro
 * family in index.css `:root`); page classes live in agents/discover.css. No hexes at the point
 * of use. The page paints no ground of its own — it inherits the ShellV2 content canvas, as the
 * agent list does.
 */
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { pickableManuscripts } from "../lib/lifecycle";
import { CommunityAgent, SubmissionStatus } from "../types";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import { agencyKey, nameCompatible } from "../lib/smartImportReviewModel";
import {
  buildDiscoverEntries,
  rankEntries,
  availableLenses,
  locationCoverage,
  isUkIreland,
  LENS_META,
  DiscoverLens,
  DiscoverEntry,
  displayTerms,
  monthYearLabel,
} from "../lib/discoverAgents";
import { getHomeCountry, flagFor, countryName } from "../lib/territory";
import { agentInitials, agentPrimary, agentSecondary } from "../lib/agentDisplay";
import { PageHeader } from "./shell/PageHeader";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import {
  ShieldCheck,
  Check,
  Plus,
  ChevronDown,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import "flag-icons/css/flag-icons.min.css";
import "./agents/discover.css";

interface DiscoverNewAgentsProps {
  /** Third param is the existing preselect seam (App.tsx stows opts.agentId/manuscriptId for the
   *  Log-a-Query form) — what "Draft a query" rides. */
  onNavigate?: (
    tab: string,
    subPageName?: string,
    opts?: { agentId?: string; manuscriptId?: string },
  ) => void;
}

/** Two display groups (the approved ref shows Strong / Possible only): the engine's `good` tier
 *  reads as a possible fit rather than earning its own band. */
const isStrong = (e: DiscoverEntry) => e.tier === "strong";

/**
 * A reserved slot for a feature animation in the first-run reel.
 *
 * These three panels are deliberate placeholders for Lottie files that don't exist yet. To drop a
 * real animation in, pass it as `children` at the call site — one line per column, e.g.
 *   <AnimationSlot label="Matched to your book">
 *     <Lottie animationData={matchedAnim} loop autoplay style={{ width: "100%", height: "100%" }} />
 *   </AnimationSlot>
 * Nothing else changes: the panel keeps its height, radius and place in the grid, and the dashed
 * placeholder chrome only renders while `children` is absent.
 */
const AnimationSlot: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => (
  <div className="dv-anim" role="img" aria-label={`${label} — illustration`}>
    {children ?? (
      <span className="ph" aria-hidden="true">
        <Sparkles strokeWidth={1.6} />
        <span>Animation</span>
      </span>
    )}
  </div>
);

/** Bare domain for display ("langleymoore.co.uk"); null when there's nothing usable. */
function siteLabel(website?: string): string | null {
  const raw = (website || "").trim();
  if (!raw) return null;
  return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "") || null;
}
/** Absolute href for a stored domain (records store bare domains). */
function siteHref(website: string): string {
  const raw = website.trim();
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** Mono meta line — open status · reply time · reply policy. Each part omitted when unknown. */
function metaLine(a: Pick<CommunityAgent, "submissionStatus" | "responseTimeWeeks" | "noResponseMeansNo">): string {
  const parts: string[] = [];
  if (a.submissionStatus === SubmissionStatus.OPEN) parts.push("Open to queries");
  else if (a.submissionStatus === SubmissionStatus.CLOSED) parts.push("Closed to queries");
  if ((a.responseTimeWeeks || 0) > 0) parts.push(`replies ~${a.responseTimeWeeks} wks`);
  if (a.noResponseMeansNo) parts.push("may not reply");
  return parts.join(" · ");
}

export const DiscoverNewAgents: React.FC<DiscoverNewAgentsProps> = ({ onNavigate }) => {
  const { communityAgents, agents, manuscripts, addAgent, currentUser } = useScriptAllyDb();
  const pickable = useMemo(() => pickableManuscripts(manuscripts), [manuscripts]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pickable.find((m) => m.id === selectedId) || pickable[0];

  // "Local" = the user's home market (stored homeCountry → browser guess → GB default).
  const homeCountry = getHomeCountry(currentUser);

  // Lens + filters — all client-side over the scored candidate set.
  const [lens, setLens] = useState<DiscoverLens>("best");
  const [openOnly, setOpenOnly] = useState(true); // closed agents hidden by default, as before
  const [hideHeld, setHideHeld] = useState(true); // "Not already in my database"
  const [ukiOnly, setUkiOnly] = useState(false); // "UK & Ireland only" — off by default

  // Session-only card state.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [lastDismissed, setLastDismissed] = useState<{ id: string; name: string } | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  // Already-held: exact name+agency, or fuzzy agency+name (the Smart-Import dedupe, as before).
  // Mapped community id → the USER's agent id, so "Draft a query" can preselect an agent the
  // writer already holds instead of adding a duplicate.
  const heldMap = useMemo(() => {
    const held = new Map<string, string>();
    for (const ca of communityAgents || []) {
      const caKey = agencyKey(ca.agency);
      const match = agents.find((a) => {
        const exact =
          a.name.trim().toLowerCase() === ca.name.trim().toLowerCase() &&
          a.agency.trim().toLowerCase() === ca.agency.trim().toLowerCase();
        if (exact) return true;
        return agencyKey(a.agency) === caKey && nameCompatible(a.name, ca.name);
      });
      if (match) held.set(ca.id, match.id);
    }
    return held;
  }, [communityAgents, agents]);

  const lenses = useMemo(() => availableLenses(communityAgents || []), [communityAgents]);
  const activeLens: DiscoverLens = lenses.includes(lens) ? lens : "best";

  // Location-backed controls render only when the catalogue actually carries location data.
  const hasLocations = useMemo(() => locationCoverage(communityAgents || []) > 0, [communityAgents]);

  // Candidate set (threshold-gated, unsorted) → visible (filters + dismissals) → ranked by lens.
  const entries = useMemo(
    () => (selected ? buildDiscoverEntries(communityAgents || [], selected) : []),
    [communityAgents, selected],
  );
  const visible = useMemo(() => {
    let v = entries.filter((e) => !dismissed.has(e.agent.id));
    if (openOnly) v = v.filter((e) => e.agent.submissionStatus !== SubmissionStatus.CLOSED);
    if (ukiOnly) v = v.filter((e) => isUkIreland(e.agent.country));
    // Keep a just-added agent visible so its done-state shows.
    if (hideHeld) v = v.filter((e) => added.has(e.agent.id) || !heldMap.has(e.agent.id));
    return rankEntries(v, activeLens, homeCountry);
  }, [entries, dismissed, openOnly, ukiOnly, hideHeld, heldMap, added, activeLens, homeCountry]);

  const strongFits = useMemo(() => visible.filter(isStrong), [visible]);
  const possibleFits = useMemo(() => visible.filter((e) => !isStrong(e)), [visible]);

  // First-run / zero-matches sell: no manuscripts at all, or a ZERO candidate set for the selected
  // one (entries is threshold-gated and pre-filter — matches merely hidden by filters keep the
  // results view and its own "hidden by your filters" affordance).
  const firstRun = pickable.length === 0 || entries.length === 0;

  const tryNextManuscript = () => {
    if (pickable.length < 2 || !selected) return;
    const i = pickable.findIndex((m) => m.id === selected.id);
    setSelectedId(pickable[(i + 1) % pickable.length].id);
  };

  /** Add a community agent to the user's database. Returns the new agent id, or null on failure. */
  const handleAdd = async (ca: CommunityAgent): Promise<string | null> => {
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
        return result.id ?? null;
      }
      console.error("Failed to add community agent:", result.error);
      return null;
    } catch (err) {
      console.error("Error adding community agent:", err);
      return null;
    } finally {
      setAdding(null);
    }
  };

  /** Draft a query: make sure the agent exists in the writer's database, then open the Log-a-Query
   *  form preselected on that agent + the current manuscript. Never creates a query record itself. */
  const handleDraft = async (ca: CommunityAgent) => {
    const existing = heldMap.get(ca.id);
    const agentId = existing ?? (await handleAdd(ca));
    if (!agentId) return;
    onNavigate?.("queries", "Log a query", { agentId, manuscriptId: selected?.id });
  };

  const dismiss = (ca: CommunityAgent) => {
    setDismissed((prev) => new Set(prev).add(ca.id));
    setLastDismissed({ id: ca.id, name: agentPrimary(ca) });
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

  const hiddenByFilters = selected
    ? entries.filter((e) => !dismissed.has(e.agent.id)).length - visible.length
    : 0;

  /* ── One match card ─────────────────────────────────────────────────────
     `example` renders the same markup inert (the first-run illustration). */
  const renderCard = (e: DiscoverEntry) => {
    const { agent } = e;
    const strong = isStrong(e);
    const verified = monthYearLabel(agent.lastVerifiedDate);
    const flag = flagFor(agent.country);
    const place = agent.city?.trim() || countryName(agent.country);
    const site = siteLabel(agent.website);
    const meta = metaLine(agent);
    const terms = displayTerms(e.breakdown.overlappingWords);
    const showGenre = e.breakdown.genreScore > 0 && Boolean((selected?.genre || "").trim());
    const isAdded = added.has(agent.id);
    const isBusy = adding === agent.id;
    const held = heldMap.has(agent.id);

    return (
      <article className="dv-ac" key={agent.id}>
        <div className={`band ${strong ? "strong" : "possible"}`}>
          <span className="st">{strong ? "Strong fit" : "Possible fit"}</span>
          {verified && (
            <span className="ver">
              <ShieldCheck aria-hidden="true" />
              Verified {verified}
            </span>
          )}
        </div>
        <div className="bd">
          <div className="who">
            <span className="av2" aria-hidden="true">{agentInitials(agent)}</span>
            <span style={{ minWidth: 0 }}>
              <span className="nm">{agentPrimary(agent)}</span>
              <span className="ag">{agentSecondary(agent)}</span>
              {flag && place && (
                <span className="loc">
                  <span className={flag} aria-hidden="true" />
                  {place}
                </span>
              )}
              {meta && <span className="meta">{meta}</span>}
              {site && (
                <a
                  className="site"
                  href={siteHref(agent.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink aria-hidden="true" />
                  <span>{site}</span>
                </a>
              )}
            </span>
          </div>

          {(showGenre || terms.length > 0) && (
            <div className="sect">
              <div className="sl">Why it fits</div>
              <div className="why">
                {showGenre && <span className="g">{selected?.genre}</span>}
                {showGenre && terms.length > 0 && " · "}
                {terms.length > 0 && (
                  <>
                    wish list matches{" "}
                    {terms.map((t, i) => (
                      <React.Fragment key={t}>
                        {i > 0 && ", "}
                        <b>{t}</b>
                      </React.Fragment>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="acts">
            {isAdded ? (
              <span className="dv-done">
                <Check aria-hidden="true" strokeWidth={2.5} />
                {held ? "In your agents" : "Added to your agents"}
              </span>
            ) : (
              <button type="button" className="dv-add" disabled={isBusy} onClick={() => handleAdd(agent)}>
                <Plus aria-hidden="true" strokeWidth={2.2} />
                {isBusy ? "Adding…" : "Add to my agents"}
              </button>
            )}
            <button type="button" className="dv-draft" disabled={isBusy} onClick={() => handleDraft(agent)}>
              Draft a query
            </button>
            <span className="spacer" />
            {!isAdded && (
              <button type="button" className="dv-dismiss" onClick={() => dismiss(agent)}>
                Not a fit
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  const section = (label: string, tier: "strong" | "possible", list: DiscoverEntry[]) =>
    list.length > 0 && (
      <>
        <div className="dv-gsec">
          <h2>{label}</h2>
          <span className="cn">{list.length}</span>
        </div>
        <div className={`dv-grule ${tier}`} />
        <div className="dv-grid">{list.map(renderCard)}</div>
      </>
    );

  /* ── First-run no-match strip — the pool first, then the three manuscript cases ── */
  const renderNoMatch = () => {
    // An EMPTY POOL is its own state (Tier 2 · Phase 7): communityAgents seeding is admin-gated,
    // so an unseeded catalogue is reachable in the wild — and it used to fall into the
    // "no matches for {title} yet" message below, which blames genre fit and offers
    // try-another-manuscript: a dead route when no manuscript could match an empty catalogue.
    // Said plainly instead, with no route offered — none exists from here. (Filters hiding
    // everything is the separate results-view state, which keeps its clear-filters way back.)
    if ((communityAgents || []).length === 0) {
      return (
        <div className="dv-nomatch">
          <div>
            <div className="nm1">
              The community catalogue is <b>empty</b> right now
            </div>
            <div className="nm2">
              There are no agents in the shared pool yet, so there is nothing to match against —
              for any manuscript. Check back once the catalogue has been stocked.
            </div>
          </div>
        </div>
      );
    }
    if (pickable.length === 0) {
      return (
        <div className="dv-nomatch">
          <div>
            <div className="nm1">
              Add a manuscript to see <b>your matches</b>
            </div>
            <div className="nm2">
              Discover scores the catalogue against a specific book — genre, age category and
              wish-list overlap — so it needs one to work from.
            </div>
          </div>
          <span className="sp" />
          <button
            type="button"
            className="go"
            onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}
          >
            Add a manuscript
          </button>
        </div>
      );
    }
    const genreBit = [selected?.ageCategory, selected?.genre].filter(Boolean).join(" ");
    const many = pickable.length >= 2;
    return (
      <div className="dv-nomatch">
        <div>
          <div className="nm1">
            No matches for <b>{selected?.title}</b> yet
          </div>
          <div className="nm2">
            {genreBit
              ? `The catalogue is still growing in ${genreBit}. `
              : "The catalogue is still growing. "}
            {many
              ? "Try another manuscript, or check back as we add agents in your genre."
              : "Check back as we add agents in your genre."}
          </div>
        </div>
        <span className="sp" />
        {many && (
          <button type="button" className="go" onClick={tryNextManuscript}>
            Try another manuscript
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="dv2">
      {/* THE shared page header — identical to the agent list's but for two things: the Pro pill
          beside the title, and the closing rule rendered 2px in the Pro token (discover.css). The
          manuscript selector occupies the same slot as the agent list's "Add new agent" button. */}
      {/* ⚠️ THE HEADER IS BACK INSIDE `.dv-wrap`, reversing the previous pass on purpose: a band was
          chrome and spanned the window, a PLATE is an object whose edges must meet the first and
          last card — and past the cap this centred column is the only place they agree. */}
      {/* ⚠️ THE CHROME IS OUT OF THE SCROLLER (amendment 9). The plate is row 1; the matches scroll
          in row 3. Discover passes NO toolbar, so the grid renders no row 2 and no hairline — it
          reserves nothing for a row it does not have. */}
      <WorkspacePageGrid className="dv-wpg" scrollLabel="Discover" plate={
        <PageHeader
            variant="workspace"
            mark="discover"
            title="Discover"
            description="Verified agents matched to your manuscript — with the reasons they fit."
            titleAdornment={<span className="dv-propill">Pro</span>}
            actionsSlot={
              selected ? (
                pickable.length >= 2 ? (
                  <button
                    type="button"
                    className="dv-msel"
                    onClick={tryNextManuscript}
                    title="Switch manuscript"
                  >
                    <span className="k">Finding for</span>
                    {selected.title}
                    <ChevronDown aria-hidden="true" />
                  </button>
                ) : (
                  <span className="dv-msel">
                    <span className="k">Finding for</span>
                    {selected.title}
                  </span>
                )
              ) : undefined
            }
        />
      }>
      <div className="dv-wrap">
        <div>
          {/* The vetting strip earns its place beside real matches; in the first-run state the
              no-match message takes this position instead. */}
          {!firstRun && (
            <div className="dv-trust">
              <ShieldCheck aria-hidden="true" />
              <span>
                <b>Every agent here is vetted.</b> A real agency, hand-checked and kept current —
                and never one that charges a fee.{" "}
                <button type="button" className="dv-verify" onClick={() => onNavigate?.("help")}>
                  How we verify →
                </button>
              </span>
            </div>
          )}

          {firstRun ? (
            <>
              {/* The no-match message takes the vetting strip's position, directly under the rule. */}
              {renderNoMatch()}

              {/* ── The centred feature reel — sits ON the page, no card wrapper ── */}
              <section className="dv-reel">
                <span className="dv-eyebrow">Pro · Discover new agents</span>
                <h2>The right agents are already looking for a book like yours.</h2>
                <p className="lead">
                  ScriptAlly scores every agent in its hand-checked catalogue against your
                  manuscript — genre, age category and wish-list overlap — and shows you why each
                  one fits before you query.
                </p>
                <div className="dv-cols">
                  <div className="dv-col">
                    <AnimationSlot label="Matched to your book" />
                    <h3>Matched to your book</h3>
                    <p>
                      Ranked by real overlap with your genre and themes — not an alphabetical
                      directory to trawl.
                    </p>
                  </div>
                  <div className="dv-col">
                    <AnimationSlot label="Every agent vetted" />
                    <h3>Every agent vetted</h3>
                    <p>
                      Real agencies, hand-checked and kept current — and never one that charges a
                      reading fee.
                    </p>
                  </div>
                  <div className="dv-col">
                    <AnimationSlot label="A head start on your query" />
                    <h3>A head start on your query</h3>
                    <p>
                      Each match pulls out the wish-list line to lead your letter with — the
                      personalisation, found for you.
                    </p>
                  </div>
                </div>
              </section>

              {/* ── What a match looks like — copy left, an inert ILLUSTRATION right ── */}
              <div className="dv-exrule" />
              <section className="dv-matchsec">
                <div>
                  <h2>What a match looks like</h2>
                  <p>
                    Every match tells you how strongly it fits and why — the genre overlap, and the
                    exact wish-list lines your book speaks to, ready to lead your query letter with.
                    You'll see where they're based, how long they take to reply, and a link straight
                    to their submission page. When one looks right, add them in a click — or start
                    the query there and then.
                  </p>
                </div>
                <div className="dv-exhold">
                  <span className="dv-exflag">Example</span>
                  <article className="dv-ac" aria-hidden="true">
                    <div className="band strong">
                      <span className="st">Strong fit</span>
                      <span className="ver">
                        <ShieldCheck aria-hidden="true" />
                        Verified Jun 2026
                      </span>
                    </div>
                    <div className="bd">
                      <div className="who">
                        <span className="av2">EW</span>
                        <span style={{ minWidth: 0 }}>
                          <span className="nm">Eleanor Whitcombe</span>
                          <span className="ag">Marsh &amp; Tide Literary</span>
                          <span className="loc">
                            <span className="fi fi-gb" />
                            London
                          </span>
                          <span className="meta">Open to queries · replies ~8 wks</span>
                          <span className="site">
                            <ExternalLink aria-hidden="true" />
                            <span>marshandtide.co.uk</span>
                          </span>
                        </span>
                      </div>
                      <div className="sect">
                        <div className="sl">Why it fits</div>
                        <div className="why">
                          <span className="g">Literary Fiction</span> · wish list matches{" "}
                          <b>family</b>, <b>memory</b>, <b>coastal communities</b>
                        </div>
                      </div>
                      <div className="acts">
                        <span className="dv-add">
                          <Plus aria-hidden="true" strokeWidth={2.2} />
                          Add to my agents
                        </span>
                        <span className="dv-draft">Draft a query</span>
                        <span className="spacer" />
                        <span className="dv-dismiss">Not a fit</span>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* ── Controls (below the Pro strip) ── */}
              <div className="dv-line">
                <span className="dv-cnt">Ranked by</span>
                {lenses.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`dv-ctl${activeLens === l ? " act" : ""}`}
                    aria-pressed={activeLens === l}
                    onClick={() => setLens(l)}
                  >
                    {LENS_META[l].label}
                  </button>
                ))}
                <span className="dv-push" />
                <span className="dv-cnt">
                  {visible.length} {visible.length === 1 ? "match" : "matches"}
                </span>
              </div>
              <div className="dv-line">
                <span className="dv-cnt">Filters</span>
                <button
                  type="button"
                  className={`dv-ctl${openOnly ? " act" : ""}`}
                  aria-pressed={openOnly}
                  onClick={() => setOpenOnly((v) => !v)}
                >
                  {openOnly && <Check aria-hidden="true" strokeWidth={2.6} />}
                  Open to submissions
                </button>
                <button
                  type="button"
                  className={`dv-ctl${hideHeld ? " act" : ""}`}
                  aria-pressed={hideHeld}
                  onClick={() => setHideHeld((v) => !v)}
                >
                  {hideHeld && <Check aria-hidden="true" strokeWidth={2.6} />}
                  Not already in my database
                </button>
                {hasLocations && (
                  <button
                    type="button"
                    className={`dv-ctl${ukiOnly ? " act" : ""}`}
                    aria-pressed={ukiOnly}
                    onClick={() => setUkiOnly((v) => !v)}
                  >
                    {ukiOnly && <Check aria-hidden="true" strokeWidth={2.6} />}
                    UK &amp; Ireland only
                  </button>
                )}
              </div>

              {visible.length === 0 ? (
                <div className="dv-nomatch" style={{ marginTop: 26 }}>
                  <div>
                    <div className="nm1">
                      Nothing showing for <b>{selected?.title}</b>
                    </div>
                    <div className="nm2">
                      {hiddenByFilters > 0
                        ? `${hiddenByFilters} ${hiddenByFilters === 1 ? "match is" : "matches are"} hidden by your filters.`
                        : "Every match has been set aside this session."}
                    </div>
                  </div>
                  <span className="sp" />
                  <button
                    type="button"
                    className="go"
                    onClick={() => {
                      setOpenOnly(false);
                      setHideHeld(false);
                      setUkiOnly(false);
                      setDismissed(new Set());
                      setLastDismissed(null);
                    }}
                  >
                    Show everything
                  </button>
                </div>
              ) : (
                <>
                  {section("Strong fits", "strong", strongFits)}
                  {section("Possible fits", "possible", possibleFits)}
                  {hiddenByFilters > 0 && (
                    <div className="dv-undo" style={{ marginTop: 22 }}>
                      <span>
                        {hiddenByFilters} more {hiddenByFilters === 1 ? "agent is" : "agents are"}{" "}
                        hidden by your filters.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenOnly(false);
                          setHideHeld(false);
                          setUkiOnly(false);
                        }}
                      >
                        Show them
                      </button>
                    </div>
                  )}
                </>
              )}

              {lastDismissed && (
                <div className="dv-undo">
                  <span>
                    Removed <strong>{lastDismissed.name}</strong> from your matches
                  </span>
                  <button type="button" onClick={undoDismiss}>
                    Undo
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </WorkspacePageGrid>
    </div>
  );
};
