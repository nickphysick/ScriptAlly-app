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
import { CompsSavedMark, InYourQueryMark, VerifiedMark, CompsEmptySketch, ScoutEmptySketch } from "./compMarks";
import { useToast } from "../toast/ToastProvider";
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



// ── add / edit a comp, INSIDE the card ──
/**
 * ⚠️ THE MODAL IS WITHDRAWN (Amendment 1 §4). A writer adding comps is looking at the hero line they
 * are building and at the rows already in it, and a Form 11 shell covers exactly that. This takes
 * the add row's place, or the edited row's place, and everything else stays on screen.
 */
const CompInlineForm: React.FC<{
  mode: "add" | "edit";
  initial?: CompTitle;
  /** Every other comp's title — the duplicate check, case-insensitively. */
  otherTitles: { title: string; index: number }[];
  onSave: (draft: CompDraft) => void;
  onCancel: () => void;
  /** SHOW ME — cancels this form and points at the row already holding the title. */
  onShowExisting: (index: number) => void;
}> = ({ mode, initial, otherTitles, onSave, onCancel, onShowExisting }) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [publisher, setPublisher] = useState(initial?.publisher ?? "");
  const [year, setYear] = useState(initial?.year != null ? String(initial.year) : "");
  const [media, setMedia] = useState<CompMedia>(initial?.media ?? "book");
  const [axis, setAxis] = useState(initial?.matchAxis ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  /** null = fine · {kind:"empty"} = no title · {kind:"dup"} = already on the list */
  const [problem, setProblem] = useState<null | { kind: "empty" } | { kind: "dup"; title: string; index: number }>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const commit = () => {
    const parsedYear = Number.parseInt(year, 10);
    onSave({
      title: title.trim(),
      author: author.trim() || undefined,
      publisher: publisher.trim() || undefined,
      year: Number.isFinite(parsedYear) && parsedYear >= 1000 && parsedYear <= 2100 ? parsedYear : undefined,
      note: note.trim() || undefined,
      media,
      matchAxis: axis.trim() || undefined,
    });
  };

  /**
   * ⚠️ PRESENCE-ONLY ON TITLE. A comp is never validated for quality or recency and a save is never
   * blocked because a year is old — that would be the page appraising through the back door.
   *
   * ⚠️ A DUPLICATE IS REPORTED, NEVER REFUSED. The writer may have a reason; the app states the
   * collision factually and offers both outs. Refusing outright would make it the app's list.
   */
  const save = () => {
    const t = title.trim();
    if (!t) { setProblem({ kind: "empty" }); titleRef.current?.focus(); return; }
    const dup = otherTitles.find((o) => o.title.trim().toLowerCase() === t.toLowerCase());
    if (dup && problem?.kind !== "dup") { setProblem({ kind: "dup", title: dup.title, index: dup.index }); return; }
    commit();
  };

  return (
    <div
      className="ct-cform"
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        /* Enter and ⌘↵ both save — the second is the habit, the first is what the form looks like */
        if (e.key === "Enter") { e.preventDefault(); save(); }
      }}
    >
      <div className="fhead">
        <span className="ftitle">{mode === "edit" ? "Edit comp" : "Add a comp"}</span>
        <span className="esc">Esc to cancel · ⌘↵ to save</span>
      </div>

      <div className="ct-fgrid">
        <div className="ct-fld">
          <label htmlFor="ct-f-title">Title</label>
          <input
            id="ct-f-title" ref={titleRef} value={title} autoComplete="off"
            className={problem ? "warn" : undefined}
            placeholder="e.g. The Appeal"
            onChange={(e) => { setTitle(e.target.value); setProblem(null); }}
          />
        </div>
        <div className="ct-fld">
          <label htmlFor="ct-f-author">Author</label>
          <input id="ct-f-author" value={author} autoComplete="off" placeholder="e.g. Janice Hallett"
                 onChange={(e) => setAuthor(e.target.value)} />
        </div>
      </div>

      <div className="ct-fgrid three">
        <div className="ct-fld">
          <label htmlFor="ct-f-pub">Publisher</label>
          <input id="ct-f-pub" value={publisher} autoComplete="off" placeholder="Imprint / studio"
                 onChange={(e) => setPublisher(e.target.value)} />
        </div>
        <div className="ct-fld">
          <label htmlFor="ct-f-year">Year</label>
          <input id="ct-f-year" value={year} inputMode="numeric" maxLength={4} placeholder="2024"
                 onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} />
        </div>
        <div className="ct-fld">
          <label>Media</label>
          <BrandDropdown value={media} options={MEDIA_OPTIONS} onChange={(v) => setMedia(v as CompMedia)} />
        </div>
      </div>

      {/* ⚠️ ONE FREE-TEXT FIELD, NOT TWO. This IS `matchAxis` — the v5 ref called it "Why it comps"
          without knowing the field existed. Same storage, the ref's label. */}
      <div className="ct-fld wide">
        <label htmlFor="ct-f-axis">Why it comps <span className="opt">— optional</span></label>
        <input id="ct-f-axis" value={axis} placeholder="One line on what it shares with your book"
               onChange={(e) => setAxis(e.target.value)} />
      </div>

      <div className="ct-fld wide">
        <label htmlFor="ct-f-note">Your note <span className="opt">— optional</span></label>
        <input id="ct-f-note" value={note} placeholder="Anything you want to remember about it"
               onChange={(e) => setNote(e.target.value)} />
      </div>

      {problem && (
        <div className="ct-fnote">
          {problem.kind === "empty" ? (
            <span>A title is needed to save this comp.</span>
          ) : (
            <>
              <span>{problem.title} is already on your list.</span>
              <button type="button" onClick={() => { onCancel(); onShowExisting(problem.index); }}>Show me</button>
              <button type="button" onClick={commit}>Add anyway</button>
            </>
          )}
        </div>
      )}

      <div className="ct-fbot">
        <span className="hint">
          {mode === "edit"
            ? "Changes apply to your query line immediately"
            : "Only a title is required — fill in the rest whenever"}
        </span>
        <div className="btns">
          <button type="button" className="ct-btn-quiet" onClick={onCancel}>Cancel</button>
          <button type="button" className="ct-btn-pink" onClick={save}>
            {mode === "edit" ? "Save changes" : "Add comp"}
          </button>
        </div>
      </div>
    </div>
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

      {/* ⚠️ FACTUAL, NOT CONGRATULATORY — "you've worked through every suggestion", never "well
          done". And the slot is provisional like its twin in Your comps. */}
      {phase === "empty" && (
        <div className="ct-estate">
          <div className="ct-islot"><ScoutEmptySketch /></div>
          <div className="em">Nothing left from this run.</div>
          <div className="es">
            You&rsquo;ve worked through every suggestion. Send the Scout out again whenever your
            manuscript or your list has moved on.
          </div>
        </div>
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
  /* the row that just landed or was pointed at — the nonce restarts the animation on a repeat */
  const [flash, setFlash] = useState<{ index: number; nonce: number } | null>(null);
  /* the row sliding out; the write happens when it has gone, so the receipt and the gap agree */
  const [leaving, setLeaving] = useState<number | null>(null);
  const addRowRef = useRef<HTMLButtonElement>(null);
  const { showToast } = useToast();
  // null = closed; { index: null } = adding; { index } = editing that comp.
  const [formState, setFormState] = useState<{ index: number | null } | null>(null);

  const ordered = [...manuscripts].sort(
    (a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b))
  );

  /**
   * ⚠️ `N` OPENS THE ADD FORM, AND ONLY WHEN NOTHING EDITABLE HAS FOCUS. A bare letter shortcut that
   * fired while someone was typing a title would insert nothing and open a second form underneath
   * them. The hint on the add row is rendered now that the key exists — and not before.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      e.preventDefault();
      setFormState({ index: null });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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

  /**
   * ⚠️ AN UNDO INVERTS THE CURRENT LIST, NEVER THE ONE IT WAS BORN WITH. A receipt lives six
   * seconds, which is long enough for another edit to land first; a closure over `comps` would then
   * write back a snapshot and silently discard whatever happened in between.
   */
  const compsRef = useRef(comps);
  compsRef.current = comps;

  // ── comp writes (the single editing path) ──
  const writeComps = (next: CompTitle[]) => {
    if (!activeMs) return;
    void updateManuscript(activeMs.id, { comps: next.map(normalizeComp) });
  };
  const toggleInQuery = (index: number) =>
    writeComps(comps.map((c, i) => (i === index ? { ...c, inQuery: !c.inQuery } : c)));
  const moveComp = (from: number, to: number) => {
    if (to < 0 || to >= comps.length) return;
    writeComps(withCompMoved(comps, from, to));
  };
  const pointAt = (index: number) => setFlash({ index, nonce: Date.now() });

  const addComp = (draft: CompDraft) => {
    const next = withCompAdded(comps, { ...draft, source: "user" });
    writeComps(next);
    setFormState(null);
    pointAt(next.length - 1);
    /* ⚠️ FOCUS RETURNS TO THE ADD ROW. A writer adds three comps in one sitting; without this each
       one costs a trip back to the mouse. */
    window.setTimeout(() => addRowRef.current?.focus(), 40);
    showToast({
      message: `${draft.title} added`,
      sub: "Tick it to use it in your query line",
      undo: () => writeComps(compsRef.current.filter((c) => c !== next[next.length - 1])),
    });
  };

  /** ⚠️ AN EDIT IS UNDOABLE TOO, not just a deletion — the receipt restores the previous values. */
  const editComp = (index: number, draft: CompDraft) => {
    const before = comps[index];
    writeComps(withCompEdited(comps, index, draft));
    setFormState(null);
    pointAt(index);
    showToast({
      message: `${draft.title} updated`,
      sub: "Changes saved",
      undo: () => writeComps(compsRef.current.map((c, i) => (i === index ? before : c))),
    });
  };

  /**
   * ⚠️ THE RECEIPT STATES THE CONSEQUENCE THE ROW CANNOT SHOW. Removing a ticked comp rewrites the
   * query line above; removing an unticked one does not. The writer is looking at the gap in the
   * list, not at the sentence, so the receipt is where that difference gets said.
   *
   * ⚠️ AND UNDO RESTORES IT AT ITS ORIGINAL INDEX, never appended — position is the query line's
   * order, so putting it back at the end would quietly rewrite the sentence it was undoing.
   */
  const removeComp = (index: number) => {
    const gone = comps[index];
    setLeaving(index);
    window.setTimeout(() => {
      setLeaving(null);
      writeComps(withCompRemoved(compsRef.current, index));
      showToast({
        message: `${gone.title} removed`,
        sub: gone.inQuery ? "Your query line has been updated" : "No change to your query line",
        undo: () => {
          const back = [...compsRef.current];
          back.splice(index, 0, gone);
          writeComps(back);
          pointAt(index);
        },
      });
    }, 240);
  };

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

              {/* ⚠️ A STATE, NOT A FAILURE — and no upsell in this card. Free comps are unlimited;
                  the Pro boundary is the Scout and nothing else. */}
              {comps.length === 0 && formState?.index !== null ? (
                <div className="ct-estate">
                  <div className="ct-islot"><CompsEmptySketch /></div>
                  <div className="em">No comps yet.</div>
                  <div className="es">
                    Add the books your manuscript sits beside — the ones an agent would recognise — or
                    let the Scout find them for you.
                  </div>
                  <div className="eacts">
                    <button type="button" className="ct-btn-pink" onClick={() => setFormState({ index: null })}>
                      Add a comp
                    </button>
                  </div>
                </div>
              ) : comps.length === 0 ? null : (
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
                    /* ⚠️ THE FORM TAKES THE ROW'S PLACE, HOLDING ITS INDEX — the list does not
                       reflow around an editor appended somewhere else, and the rows above and below
                       stay exactly where the writer left them. */
                    if (formState?.index === i) {
                      return (
                        <CompInlineForm
                          key={`edit-${i}`}
                          mode="edit"
                          initial={c}
                          otherTitles={comps.map((x, xi) => ({ title: x.title, index: xi })).filter((x) => x.index !== i)}
                          onSave={(draft) => editComp(i, draft)}
                          onCancel={() => setFormState(null)}
                          onShowExisting={pointAt}
                        />
                      );
                    }
                    return (
                      <div
                        key={i}
                        className={`ct-crow${dragIndex === i ? " dragging" : ""}${flash?.index === i ? " land" : ""}${leaving === i ? " leaving" : ""}`}
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

              {/* ⚠️ THE HINT APPEARS ONLY NOW THAT THE KEY WORKS. Phase 2 deliberately rendered no
                  `N` affordance because the shortcut did not exist yet. */}
              {formState?.index === null ? (
                <CompInlineForm
                  mode="add"
                  otherTitles={comps.map((x, xi) => ({ title: x.title, index: xi }))}
                  onSave={addComp}
                  onCancel={() => setFormState(null)}
                  onShowExisting={pointAt}
                />
              ) : (
                <button
                  type="button"
                  ref={addRowRef}
                  className="ct-addrow"
                  disabled={comps.length >= MAX_COMPS}
                  onClick={() => setFormState({ index: null })}
                >
                  <span className="plus"><Plus /></span>
                  {comps.length >= MAX_COMPS ? "This list is full" : "Add a comp manually"}
                  {comps.length < MAX_COMPS && <span className="ct-kbd">N</span>}
                </button>
              )}

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

    </div>
  );
};
