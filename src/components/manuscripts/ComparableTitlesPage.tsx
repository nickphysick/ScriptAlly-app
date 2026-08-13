/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles — a manuscript-scoped workspace where a writer curates a single FLAT list of
 * comps (free), alongside "The Scout" (Pro), which will surface verified, web-scoured comps.
 * Route /manuscripts/comps; reached from the rail and each plate's MANAGE → link.
 * Single visual source of truth: design-refs/comparable-titles-flat.html.
 *
 * Workspace-fills layout (masthead flex-none over a two-panel split that fills the stage and scrolls
 * internally). The masthead is the standard PageHeader with the manuscript selector in its
 * tools slot (ChromeSlab and HubHeaderBar are both long deleted — shell rollout Phase 6 /
 * follow-up P3).
 * Store only facts + one intent (`inQuery`); role / query line / composition / age are derived
 * at render (src/lib/compsPage.ts). Comp writes go through the shared updateManuscript path (a first
 * write on a legacy-string doc converts it to the structured array); every write runs through
 * normalizeComp so optional fields stay omit-empty (Firestore maps reject undefined).
 */
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Copy, Check, Pencil, X, Sparkles, Lock, RefreshCw, BookOpen, Star, GripVertical } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { CompMedia, CompTitle, Manuscript } from "../../types";
import { PageHeader } from "../shell/PageHeader";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { FormShell } from "../forms/FormShell";
import { BrandDropdown } from "../forms/BrandDropdown";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import {
  CompDraft,
  isVerified,
  manuscriptComps,
  normalizeComp,
  withCompAdded,
  withCompEdited,
  withCompMoved,
  withCompRemoved,
  MAX_COMPS,
} from "../../lib/comps";
import { QueryFormat, compAge, compCounts, compMedia, compRole, currentYear, queryLine } from "../../lib/compsPage";
import { CompsSavedMark, InYourQueryMark, VerifiedMark } from "./compMarks";
import {
  CompSuggestion,
  SuggestCompsInput,
  fetchCompSuggestions,
  isProUser,
  scoutLive,
  suggestionToComp,
} from "../../lib/suggestComps";
import "./comps.css";

/** The Scout's scan narration — shown while the live discovery runs (dev/preview until the fn ships). */
const SCAN_STEPS = [
  "Reading logline & synopsis…",
  "Searching recent titles & best-of lists…",
  "Verifying candidates against catalogue…",
  "Cross-checking your agents’ wishlists…",
  "Ranking by fit — ready",
];
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Shared with the overview + the Package Builder — the section's single active-manuscript pointer. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

const MEDIA_OPTIONS: { value: CompMedia; label: string }[] = [
  { value: "book", label: "Book" },
  { value: "film", label: "Film" },
  { value: "tv", label: "TV" },
  { value: "other", label: "Other" },
];
const MEDIA_LABEL: Record<CompMedia, string> = { book: "Book", film: "Film", tv: "TV", other: "Other" };

/** First glyph of a title for the selector monogram. */
function monogram(title: string): string {
  return (title.trim()[0] || "·").toUpperCase();
}



// ── add / edit a comp manually (locked FormShell + BrandDropdown) ──
const CompForm: React.FC<{
  mode: "add" | "edit";
  manuscriptTitle: string;
  initial?: CompTitle;
  onSave: (draft: CompDraft) => void;
  onClose: () => void;
}> = ({ mode, manuscriptTitle, initial, onSave, onClose }) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [publisher, setPublisher] = useState(initial?.publisher ?? "");
  const [year, setYear] = useState(initial?.year != null ? String(initial.year) : "");
  const [media, setMedia] = useState<CompMedia>(initial?.media ?? "book");
  const [axis, setAxis] = useState(initial?.matchAxis ?? "");
  /* ⚠️ CARRIED, NOT EDITED — YET, and carrying it is the whole point of this fix. The form has no
     note input until the pack's rebuild adds "Your note" beneath the match line; until then the
     draft passes the STORED note through untouched, so saving an edit cannot destroy it. When the
     input lands this becomes state and nothing else in this component changes. */
  const note = initial?.note;

  const dirty =
    title !== (initial?.title ?? "") ||
    author !== (initial?.author ?? "") ||
    publisher !== (initial?.publisher ?? "") ||
    year !== (initial?.year != null ? String(initial.year) : "") ||
    media !== (initial?.media ?? "book") ||
    axis !== (initial?.matchAxis ?? "");

  const submit = () => {
    const parsedYear = Number.parseInt(year, 10);
    onSave({
      title: title.trim(),
      author: author.trim() || undefined,
      publisher: publisher.trim() || undefined,
      year: Number.isFinite(parsedYear) && parsedYear >= 1000 && parsedYear <= 2100 ? parsedYear : undefined,
      note,
      media,
      matchAxis: axis.trim() || undefined,
    });
    onClose();
  };

  return (
    <FormShell
      preLabel={mode === "edit" ? "Editing a comp for" : "Adding a comp to"}
      name={manuscriptTitle}
      avatarInitials={monogram(manuscriptTitle)}
      buttonLabel={mode === "edit" ? "Save changes" : "Add to list"}
      submitDisabled={!title.trim()}
      onSubmit={submit}
      onClose={onClose}
      dirty={dirty}
    >
      <label className="sa-label" htmlFor="ct-comp-title">Title</label>
      <input
        id="ct-comp-title"
        className="sa-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="The comparable title"
        autoFocus
      />

      <div className="sa-row2">
        <div>
          <label className="sa-label" htmlFor="ct-comp-author">Author / creator</label>
          <input id="ct-comp-author" className="sa-input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Susanna Clarke" />
        </div>
        <div>
          <label className="sa-label" htmlFor="ct-comp-pub">Publisher</label>
          <input id="ct-comp-pub" className="sa-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Imprint / studio" />
        </div>
      </div>

      <div className="sa-row2">
        <div>
          <label className="sa-label" htmlFor="ct-comp-year">Year</label>
          <input
            id="ct-comp-year"
            className="sa-input"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            placeholder="YYYY"
          />
        </div>
        <div>
          <label className="sa-label">Media</label>
          <BrandDropdown
            value={media}
            options={MEDIA_OPTIONS}
            onChange={(v) => setMedia(v as CompMedia)}
          />
        </div>
      </div>

      <label className="sa-label" htmlFor="ct-comp-axis">Match axis</label>
      <input id="ct-comp-axis" className="sa-input" value={axis} onChange={(e) => setAxis(e.target.value)} placeholder="e.g. tone · atmosphere" />
    </FormShell>
  );
};

// ── The Scout (Pro; flagged) ──
const HowItWorks: React.FC<{ heading: string }> = ({ heading }) => (
  <div className="ct-how">
    <div className="ht">{heading}</div>
    <div className="ct-step">
      <span className="num">1</span>
      <div>
        <div className="st">Reads your book</div>
        <div className="sd">Your genre, logline &amp; synopsis — not just keywords.</div>
      </div>
    </div>
    <div className="ct-step">
      <span className="num">2</span>
      <div>
        <div className="st">Searches the web</div>
        <div className="sd">Recent titles, best-of lists &amp; debuts in your exact space.</div>
      </div>
    </div>
    <div className="ct-step">
      <span className="num">3</span>
      <div>
        <div className="st">Verifies every title</div>
        <div className="sd">Checked against a real catalogue — nothing invented.</div>
      </div>
    </div>
  </div>
);

const ScoutResultCard: React.FC<{
  s: CompSuggestion;
  onShelf: boolean;
  onAdd: () => void;
}> = ({ s, onShelf, onAdd }) => {
  const meta = [s.author, s.publisher].filter(Boolean).join(" · ");
  return (
    <div className="ct-rcard">
      <div className="ct-rc-top">
        <span className="ct-rc-title">{s.title}</span>
        <span className="ct-rc-year">{s.year}</span>
      </div>
      {meta && <div className="ct-rc-meta">{meta}</div>}
      {/* ⚠️ UNCONDITIONAL, AND THAT IS THE CONTRACT — every suggestion carries a verification record
          or the validator dropped it, so there is no unverified row for a branch to handle. It also
          NAMES the catalogue now rather than saying the word "catalogue": the record exists, so the
          chip can state which one answered instead of asserting that one did.
          ⚠️ SAME CLASS AS THE COMP ROW'S — one chip, both cards. */}
      <div className="ct-chips" style={{ marginTop: 7 }}>
        <span className="ct-chip verified">
          <Check size={10} /> Verified · {s.verification.catalogue}
        </span>
      </div>
      <div className="ct-why">
        <div className="ct-why-cap">Why this fits</div>
        <div className="ct-why-txt">{s.why}</div>
      </div>
      {s.agentMatch != null && s.agentMatch > 0 && (
        <div className="ct-agent-hook">
          <Star size={13} />
          <span>
            <b>
              {s.agentMatch} agent{s.agentMatch > 1 ? "s" : ""}
            </b>{" "}
            on your list wishlist books like this
          </span>
        </div>
      )}
      <div className="ct-rc-foot">
        <div className="ct-links">
          {s.links?.bookshop && (
            <a href={s.links.bookshop} target="_blank" rel="noreferrer">
              <BookOpen size={11} /> Bookshop
            </a>
          )}
          {s.links?.googleBooks && (
            <a href={s.links.googleBooks} target="_blank" rel="noreferrer">
              <BookOpen size={11} /> Google Books
            </a>
          )}
        </div>
        <button type="button" className="ct-addshelf" disabled={onShelf} onClick={onAdd}>
          {onShelf ? <Check size={12} /> : <Plus size={12} />}
          {onShelf ? "Added" : "Add to list"}
        </button>
      </div>
    </div>
  );
};

type ScoutPhase = "idle" | "scanning" | "done" | "empty" | "notyet" | "error";

const ScoutPanel: React.FC<{
  isPro: boolean;
  input: SuggestCompsInput;
  shelfTitles: string[];
  onAddToShelf: (comp: CompTitle) => void;
  onUpgrade: () => void;
}> = ({ isPro, input, shelfTitles, onAddToShelf, onUpgrade }) => {
  const [phase, setPhase] = useState<ScoutPhase>("idle");
  const [results, setResults] = useState<CompSuggestion[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const shelf = new Set(shelfTitles.map((t) => t.trim().toLowerCase()));

  const runScout = async () => {
    if (!scoutLive()) {
      setPhase("notyet");
      return;
    }
    setPhase("scanning");
    setResults([]);
    try {
      const [data] = await Promise.all([fetchCompSuggestions(input), sleep(1500)]);
      setResults(data);
      setPhase(data.length ? "done" : "empty");
    } catch {
      setPhase("error");
    }
  };

  const addOne = (s: CompSuggestion) => {
    onAddToShelf(suggestionToComp(s));
    setAdded((prev) => new Set(prev).add(s.title.trim().toLowerCase()));
  };

  // Free tier — how-it-works + the Pro lock/upsell.
  if (!isPro) {
    return (
      <div className="ct-body">
        <div className="ct-scout-what">
          Your standing research assistant — finds verified, recent comps matched to your book.
        </div>
        <HowItWorks heading="What the Scout does" />
        <div className="ct-upsell">
          <div className="ghost">
            <div className="ct-rcard" style={{ opacity: 1, animation: "none" }}>
              <div className="ct-rc-top">
                <span className="ct-rc-title">A Marvellous Light</span>
                <span className="ct-rc-year">2021</span>
              </div>
              <div className="ct-rc-meta">Freya Marske · Tor</div>
              <div className="ct-why">
                <div className="ct-why-txt">Recent, magic-as-machinery, strong voice…</div>
              </div>
            </div>
          </div>
          <div className="lockwrap">
            <div className="lock">
              <Lock size={19} />
            </div>
            <h3>Unlock the Scout</h3>
            <p>
              Let ScriptAlly find verified comps you’d never surface alone — and add them straight to
              your list.
            </p>
            <button type="button" className="ct-btn-pro" onClick={onUpgrade}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pro tier — the live discovery (behind SCOUT_LIVE).
  return (
    <div className="ct-body">
      <div className="ct-scout-what">
        Your standing research assistant. It hunts down <b>verified, recent comps</b> matched to this
        manuscript — so you find books you’d never surface alone.
      </div>
      <HowItWorks heading="How it works" />

      <button type="button" className="ct-btn-pro" onClick={runScout} disabled={phase === "scanning"}>
        {phase === "scanning" ? (
          <>
            <span className="spin" /> Scouring &amp; verifying…
          </>
        ) : phase === "idle" || phase === "notyet" ? (
          <>
            <Sparkles size={15} /> Send the Scout out
          </>
        ) : (
          <>
            <RefreshCw size={15} /> Send out again
          </>
        )}
      </button>

      {phase === "scanning" && (
        <div className="ct-scan">
          {SCAN_STEPS.map((step, i) => (
            <div key={i} className="ct-scanline" style={{ animationDelay: `${i * 0.12}s` }}>
              <span className="tick">{i === SCAN_STEPS.length - 1 ? "✓" : "◇"}</span> {step}
            </div>
          ))}
        </div>
      )}

      {phase === "notyet" && (
        <div className="ct-notyet">
          <b>The Scout goes live soon.</b> We’re finishing its catalogue checks so every title it
          brings back is a real book with a real year — never invented. Until then, add your own comps
          on the left.
        </div>
      )}

      {phase === "error" && (
        <div className="ct-scout-err">The Scout couldn’t be reached just now — try again in a moment.</div>
      )}

      {phase === "empty" && (
        <div className="ct-notyet">No fresh comps this time — your list may already cover the space.</div>
      )}

      {phase === "done" && (
        <>
          <div className="ct-results">
            {results.map((s, i) => (
              <ScoutResultCard
                key={i}
                s={s}
                onShelf={shelf.has(s.title.trim().toLowerCase()) || added.has(s.title.trim().toLowerCase())}
                onAdd={() => addOne(s)}
              />
            ))}
          </div>
          <div className="ct-foot-note">
            Starting points to research — read them before you pitch them.
          </div>
        </>
      )}
    </div>
  );
};

/** The bold-title query-letter line rendered from derived parts. */
const QueryLineText: React.FC<{ parts: { title: string; attribution: string }[] }> = ({ parts }) => (
  <>
    For readers of{" "}
    {parts.map((p, i) => (
      <React.Fragment key={i}>
        {i > 0 && (i === parts.length - 1 ? " and " : ", ")}
        <b>{p.title}</b>
        {p.attribution}
      </React.Fragment>
    ))}
    .
  </>
);

export const ComparableTitlesPage: React.FC<{
  onNavigate?: (tab: string, subPageName?: string, opts?: { manuscriptId?: string }) => void;
}> = ({ onNavigate }) => {
  const { currentUser, manuscripts, updateManuscript } = useScriptAllyDb();

  /**
   * ⚠️ SCOPE IS THE SHELL'S, AND IT IS READ EVERY RENDER — never held in state here. The page's own
   * "Working on" chip is removed (baked decision 9): the shell's scope control writes
   * `scriptally_active_manuscript_id` and re-navigates, so a `useState` initialiser would latch the
   * value at mount and this page would quietly keep showing the previous book while the chrome above
   * it named the new one. Two controls for one fact was the reason to delete ours, not to keep a
   * copy of its state.
   */
  const selectedMsId = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const [copied, setCopied] = useState(false);
  /* ⚠️ LOCAL, NOT ROUTED AND NOT PERSISTED. The format is a way of looking at the same ticked comps,
     not a place in the app — writing it to the URL would turn a toggle into navigation the shell
     has to model. */
  const [format, setFormat] = useState<QueryFormat>("readers");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // null = closed; { index: null } = adding; { index } = editing that comp.
  const [formState, setFormState] = useState<{ index: number | null } | null>(null);

  const ordered = [...manuscripts].sort(
    (a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b))
  );

  if (!currentUser) return null;

  /* the shell's key may name a manuscript that has since gone; fall back to the first rather than
     rendering the no-manuscript state over a shelf that has books in it */
  const activeMs = manuscripts.find((m) => m.id === selectedMsId) ?? ordered[0] ?? null;
  const comps = activeMs ? manuscriptComps(activeMs) : [];
  const now = currentYear();
  const counts = compCounts(comps);
  const qline = queryLine(comps, activeMs?.title ?? "", format, now);
  /* derived at render from the record, like every other count on this page — never stored */
  const verifiedCount = comps.filter(isVerified).length;

  // ── comp writes (the single editing path) ──
  const writeComps = (next: CompTitle[]) => {
    if (!activeMs) return;
    void updateManuscript(activeMs.id, { comps: next.map(normalizeComp) });
  };
  const toggleInQuery = (index: number) =>
    writeComps(comps.map((c, i) => (i === index ? { ...c, inQuery: !c.inQuery } : c)));
  const removeComp = (index: number) => writeComps(withCompRemoved(comps, index));
  const moveComp = (from: number, to: number) => {
    if (to < 0 || to >= comps.length) return;
    writeComps(withCompMoved(comps, from, to));
  };
  const addComp = (draft: CompDraft) => writeComps(withCompAdded(comps, { ...draft, source: "user" }));
  const editComp = (index: number, draft: CompDraft) => writeComps(withCompEdited(comps, index, draft));

  const copyLine = async () => {
    if (qline.kind !== "line") return;
    try {
      await navigator.clipboard.writeText(qline.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  const editingComp = formState && formState.index != null ? comps[formState.index] : undefined;

  return (
    <div className="ctpage">
      {/* The standard page header (shell follow-up P3) — ChromeSlab retired. The pulse line is
          dropped with it (no meta slot under the header law); the manuscript selector keeps its
          function in the row below the rule until the sidebar switcher is live-wired. */}
      {/* ⚠️ THE CHROME IS OUT OF THE SCROLLER (amendment 9). Plate and tool row are rows 1 and 2;
          the desk is row 3.
          ⚠️ THIS PAGE STILL DOES NOT SCROLL AT PAGE LEVEL, and that is unchanged and correct — the
          desk fills row 3 exactly and the two panels scroll inside themselves, as they always have.
          So the plate holds its 88px here, for the same reason the Tasks family does: it is never
          covering anything that has to get past it.
          ⚠️ THE MODALS STAY OUTSIDE THE GRID, below it in `.ctpage` — fixed-position overlays have
          no business inside the scrollport they cover. */}
      <WorkspacePageGrid
        className="ct-wpg"
        scrollLabel="Comparable titles"
        plate={
          <PageHeader
          variant="workspace"
          mark="comps"
          /* ⚠️ NO COUNT ON THE PLATE — the slot is gone from the variant, and the shelf total moved to
             the tally slot in the row below rather than being dropped. THE RULE: the plate carries
             IDENTITY, the toolbar carries TALLIES and view state — the same split the Contact list has
             always had with its "16 OF 16". */
          title="Comparable titles"
          description="The books your manuscript sits beside, gathered and query-ready." /* PROVISIONAL copy (flyouts P3) — listed for Nick's review */
          />
        }
          /* ⚠️ NO TOOLBAR ROW ON THIS PAGE (Amendment 1 §1). The tally moved into the hero's stat
             rail and the manuscript selector is the shell's; what remained would have been an empty
             row drawing a hairline over nothing. The grid renders neither when the prop is absent. */
      >
      <div className="ct-pagebody">
        {!activeMs ? (
          <div className="ct-panel">
            <div className="ct-blank">
              <div className="q">No manuscript to compare yet.</div>
              <span className="lab">Add a manuscript to build its comp list</span>
            </div>
          </div>
        ) : (
          <>
            {/* ══ THE HERO — the composed line is the page; the list is the instrument that builds
                it (baked decision 1). ══ */}
            <div className="ct-hero">
              <div className="ct-hero-l">
                <div className="ct-eyebrow">
                  <span className="ct-lbl">Query letter line</span>
                  <span className="ct-chip ms">{activeMs.title}</span>
                </div>
                {/* ⚠️ `aria-live="polite"` ON THE LINE, announcing ONCE per tick. It is the region
                    that changes, so the whole recomposed sentence is read — not each fragment as it
                    arrives, which is what marking the segments live would produce. */}
                <div
                  className={`ct-hero-line${qline.kind === "line" ? "" : " empty"}`}
                  aria-live="polite"
                >
                  {qline.kind === "line"
                    ? qline.segments.map((seg, i) => (
                        <span key={i} className={seg.emphasis ?? undefined}>{seg.text}</span>
                      ))
                    : qline.prompt}
                </div>
                <div className="ct-hero-ctl">
                  <div className="ct-seg" role="group" aria-label="Query line format">
                    <button
                      type="button"
                      className={format === "readers" ? "on" : ""}
                      aria-pressed={format === "readers"}
                      onClick={() => setFormat("readers")}
                    >
                      For readers of
                    </button>
                    <button
                      type="button"
                      className={format === "meets" ? "on" : ""}
                      aria-pressed={format === "meets"}
                      onClick={() => setFormat("meets")}
                    >
                      X meets Y
                    </button>
                  </div>
                  {qline.kind === "line" && (
                    <button type="button" className="ct-copyb" onClick={copyLine}>
                      {copied ? <Check /> : <Copy />}
                      {copied ? "Copied" : "Copy line"}
                    </button>
                  )}
                  {qline.caption && <span className="ct-hero-cap">{qline.caption}</span>}
                </div>
              </div>
              {/* ⚠️ THREE STACKED ROWS WITH ILLUSTRATED MARKS — baked decision 3, not a box row.
                  All three counts are computed from the comps array; nothing here is stored. */}
              <div className="ct-hero-r">
                <div className="ct-hstat">
                  <span className="mark"><CompsSavedMark /></span>
                  <div>
                    <div className="n">{counts.total}</div>
                    <div className="l">Comps saved</div>
                  </div>
                </div>
                <div className="ct-hstat">
                  <span className="mark"><InYourQueryMark /></span>
                  <div>
                    <div className="n">{counts.inQuery}</div>
                    <div className="l">In your query</div>
                  </div>
                </div>
                <div className="ct-hstat">
                  <span className="mark"><VerifiedMark /></span>
                  <div>
                    <div className="n">{verifiedCount}</div>
                    <div className="l">Verified</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ct-split">
            {/* ── Your comps ── */}
            <section className="ct-panel">
              <div className="ct-band">
                <span className="bt">Your comps</span>
                <span className="ct-tag free">Free</span>
                <span className="bmeta">{counts.total} {counts.total === 1 ? "comp" : "comps"}</span>
              </div>

              {comps.length === 0 ? (
                <div className="ct-listempty">No comps yet — add one below.</div>
              ) : (
                <>
                  {/* the tick column reads as a column, rather than an unlabelled control */}
                  <div className="ct-thead">
                    <span />
                    <span>Query</span>
                    <span className="h3">Title</span>
                    <span className="h5">Edit</span>
                  </div>
                  {comps.map((c, i) => {
                    const role = compRole(c, now);
                    const media = compMedia(c);
                    const age = compAge(c, now);
                    const meta = [c.author, c.publisher].filter(Boolean).join(" · ");
                    return (
                      <div
                        key={i}
                        className={`ct-crow${dragIndex === i ? " dragging" : ""}`}
                        draggable
                        onDragStart={() => setDragIndex(i)}
                        onDragEnd={() => setDragIndex(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragIndex !== null) moveComp(dragIndex, i);
                          setDragIndex(null);
                        }}
                      >
                        {/* ⚠️ THE GRIP IS A BUTTON, NOT A DECORATION — reorder must be reachable
                            without a pointer. ⌥↑ / ⌥↓ on the focused grip moves the row, and the
                            move is announced politely rather than silently rearranging the list
                            under a keyboard user. */}
                        <button
                          type="button"
                          className="grip"
                          aria-label={`Reorder ${c.title}. Position ${i + 1} of ${comps.length}. Use Option with the up and down arrows to move it.`}
                          onKeyDown={(e) => {
                            if (!e.altKey) return;
                            if (e.key === "ArrowUp") { e.preventDefault(); moveComp(i, i - 1); }
                            if (e.key === "ArrowDown") { e.preventDefault(); moveComp(i, i + 1); }
                          }}
                        >
                          <GripVertical />
                        </button>
                        {/* ⚠️ `role="switch"` WITH `aria-checked`, LABELLED WITH ITS COMP. A bare
                            button would announce "In query" on every row with nothing to say which
                            comp it belonged to or whether it was on. */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!!c.inQuery}
                          aria-label={`Use ${c.title} in your query line`}
                          className={`ct-ck${c.inQuery ? " on" : ""}`}
                          onClick={() => toggleInQuery(i)}
                        >
                          <Check />
                        </button>
                        <div>
                          <div className="t">{c.title}</div>
                          <div className="a">
                            {meta || "—"}{c.year != null ? ` · ${c.year}` : ""}
                          </div>
                          {c.matchAxis && <div className="why">{c.matchAxis}</div>}
                          {c.note && <div className="why note">{c.note}</div>}
                          <div className="ct-roleline">{role.line}</div>
                        </div>
                        <div className="chips">
                          {isVerified(c) && (
                            <span className="ct-chip verified">
                              <Check /> Verified · {c.verification!.catalogue}
                            </span>
                          )}
                          {media !== "book" && <span className="ct-chip media">{MEDIA_LABEL[media]}</span>}
                          {age !== null && <span className="ct-chip age">{age} yrs ago</span>}
                        </div>
                        <div className="acts">
                          <button
                            type="button"
                            className="ct-iconbtn"
                            aria-label={`Edit ${c.title}`}
                            onClick={() => setFormState({ index: i })}
                          >
                            <Pencil />
                          </button>
                          <button
                            type="button"
                            className="ct-iconbtn"
                            aria-label={`Remove ${c.title}`}
                            onClick={() => removeComp(i)}
                          >
                            <X />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* ⚠️ NO `N` KEY HINT YET. The shortcut lands with the inline form in Phase 3, and a
                  hint for a key that does nothing advertises a shortcut the app does not have —
                  the same standing rule that kept ⌘L/⌘N off the shell's quick actions. */}
              <button
                type="button"
                className="ct-addrow"
                disabled={comps.length >= MAX_COMPS}
                onClick={() => setFormState({ index: null })}
              >
                <span className="plus"><Plus /></span>
                {comps.length >= MAX_COMPS ? "This list is full" : "Add a comp manually"}
              </button>

              {/* ⚠️ A STATEMENT ABOUT THE INDUSTRY, NOT ABOUT THIS LIST. It must never be reworded
                  into advice about the writer's own comps — that is the appraisal the sweep removed,
                  returning by the back door. */}
              <div className="ct-cfoot">
                <span className="ct-lbl">
                  Agents typically look for comps published within the last five years
                </span>
              </div>
            </section>

            {/* ── The Scout ── */}
            <section className="ct-panel">
              <div className="ct-band">
                <span className="bt">The Scout</span>
                <span className="ct-tag pro">Pro</span>
              </div>
              <ScoutPanel
                isPro={isProUser(currentUser)}
                input={{
                  manuscriptId: activeMs.id,
                  manuscriptTitle: activeMs.title,
                  ageCategory: activeMs.ageCategory,
                  genre: activeMs.genre,
                  logline: activeMs.logline || "",
                  shelfTitles: comps.map((c) => c.title),
                }}
                shelfTitles={comps.map((c) => c.title)}
                onAddToShelf={(comp) => writeComps(withCompAdded(comps, comp))}
                onUpgrade={() => onNavigate?.("plans")}
              />
            </section>
            </div>
          </>
        )}
      </div>
      </WorkspacePageGrid>

      {formState && activeMs && (
        <CompForm
          mode={formState.index == null ? "add" : "edit"}
          manuscriptTitle={activeMs.title}
          initial={editingComp}
          onSave={(draft) => (formState.index == null ? addComp(draft) : editComp(formState.index, draft))}
          onClose={() => setFormState(null)}
        />
      )}
    </div>
  );
};
