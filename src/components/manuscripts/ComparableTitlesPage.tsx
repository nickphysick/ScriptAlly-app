/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles — a manuscript-scoped workspace where a writer curates a single FLAT list of
 * comps (free), alongside "The Scout" (Pro), which will surface verified, web-scoured comps.
 * Route /manuscripts/comps; reached from the rail and each plate's MANAGE → link.
 * Single visual source of truth: design-refs/comparable-titles-v2-1.html.
 *
 * ⚠️ THIS PAGE TAKES THE SHARED MASTHEAD, like every other (Nick's call, reverting v2.1's opt-out).
 * `WorkspacePageGrid` is mounted with the standard `PageHeader`, so the page gets the §1 slab and
 * the §2 settle with no page-specific variant of either. It briefly drew its own static header
 * inside the sheet and hid the slab page-scoped; that reasoning was sound page-locally and is not
 * what the app does — one masthead, one settle, one Hide rule, everywhere.
 * Store only facts + one intent (`inQuery`); role / query line / composition / age are derived
 * at render (src/lib/compsPage.ts). Comp writes go through the shared updateManuscript path (a first
 * write on a legacy-string doc converts it to the structured array); every write runs through
 * normalizeComp so optional fields stay omit-empty (Firestore maps reject undefined).
 */
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Copy, Check, X, Sparkles, Lock, RefreshCw, BookOpen, Star, GripVertical } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { CompMedia, CompTitle, Manuscript } from "../../types";
/* ⚠️ THE SHARED MASTHEAD IS BACK (pinned chrome; Nick's call). This page briefly drew its own
   static header inside the sheet — a fair reading in isolation, and the wrong one across the app:
   page headers behave identically everywhere, and a page differing because two streams each decided
   sensibly on their own is the outcome to avoid. `OneScreenMark` stays imported for the tiles. */
import { PageHeader } from "../shell/PageHeader";
import { OneScreenMark } from "../dashboard/OneScreenMark";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { BrandDropdown } from "../forms/BrandDropdown";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { genreDisplay } from "../../lib/genres";
/* ⚠️ THE SHARED ASSET, NOT A TRACED COPY. `ManuscriptPlate`, `ManuscriptLibraryCard` and
   `OneScreenAuthor` all render this exact PNG on a white plate; tracing it here would fork
   one illustration into two that drift. One asset, one home. */
import manuscriptIcon from "../../assets/shell/manuscript-icon.png";
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
/* ⚠️ `compAge` AND `compRole` ARE NO LONGER READ HERE, and that is the point of §3 rather than a
   tidy-up. Both classify against a five-year cutoff — `compAge` returns null unless a book is
   OLDER than five years, so its chip appeared only on some rows, and `compRole` sorted comps
   into "Market comp" / "Tone comp" on the same boundary. A mark that lands on some of a
   writer's comps and not others is an appraisal of their choices delivered by presence. The
   card now reads `compAgeLine`, which has no cutoff at all. Both functions survive in
   compsPage.ts with their tests; whether they are retired is a §5 sweep question. */
import { QueryFormat, compAgeLine, compCounts, compFacets, compMedia, currentYear, queryLine } from "../../lib/compsPage";
/* ⚠️ `CompsSavedMark` / `InYourQueryMark` / `VerifiedMark` ARE NO LONGER IMPORTED. The hero's
   stat rail became the ref's bare number-and-label fact row, so nothing renders them. They are
   RETAINED in compMarks.tsx rather than deleted — they are finished illustration work and
   whether they come back is a design call, not a sweep. Flagged in the report. */
/* ⚠️ `CompsEmptySketch` IS NO LONGER IMPORTED (v3 §2). The comps empty state it drew was
   replaced by the feature block, so nothing renders it. It is RETAINED in compMarks.tsx
   rather than deleted — finished illustration work, and whether it returns is a design
   call, not a sweep. `ScoutEmptySketch` still draws the Scout's own empty result. */
import { ScoutEmptySketch } from "./compMarks";
import { FeatureBlock, StagesBlock } from "./compsMarketing";
import { useToast } from "../toast/ToastProvider";
import {
  CompSuggestion,
  ScoutRun,
  SuggestCompsInput,
  factsChip,
  fetchCompRun,
  isProUser,
  scoutLive,
  suggestionToComp,
  visibleSuggestions,
} from "../../lib/suggestComps";
import "./comps.css";


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

/**
 * ⚠️ THE RUNNING STATE NARRATES WHAT IS HAPPENING, and its three steps are the three things the
 * function actually does. Copy that promised a fourth stage the function does not perform would be a
 * claim like any other.
 */
const RUN_STEPS = ["Reading your manuscript", "Searching recent titles", "Verifying against a catalogue"];
/** ⚠️ A FLOOR, NOT A DELAY. A run that returns in 90ms would otherwise flash three steps and vanish. */
const RUN_FLOOR_MS = 450;

const sleepMs = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** `LAST SENT OUT — 13 AUG, 09:41`, or null when the run carried no usable timestamp. */
function lastSentOut(runAt: string): string | null {
  if (!runAt) return null;
  const d = new Date(runAt);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `Last sent out — ${date}, ${time}`;
}

/**
 * The returned-run status — "Returned 21 Aug · 3 titles" (v3 §4).
 *
 * ⚠️ IT COUNTS WHAT IS ON SCREEN, not what the run brought back. Dismissing a suggestion or adding
 * one to the shelf removes it from view, and a header still claiming the original figure would be
 * describing a list the reader can see is shorter.
 *
 * ⚠️ AND A MALFORMED DATE LOSES THE DATE, NEVER THE COUNT. The two facts are independent; dropping
 * both because one is unreadable states less than is known.
 */
function returnedLine(runAt: string, shown: number): string {
  const titles = `${shown} ${shown === 1 ? "title" : "titles"}`;
  const d = new Date(runAt);
  if (!runAt || Number.isNaN(d.getTime())) return `Returned · ${titles}`;
  return `Returned ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${titles}`;
}

/**
 * One suggestion row.
 *
 * ⚠️ THE GRID IS THE ALIGNMENT SPEC AND IT IS EXACT: `26px minmax(0,1fr) 104px`, `align-items:start`.
 * The action column is a FIXED width so every row's right edge is flush regardless of title length —
 * sizing it to content is what made the previous version ragged. And the why-line lives INSIDE
 * column two rather than spanning the grid, which is what stopped it running under the buttons.
 */
const ScoutRow: React.FC<{
  s: CompSuggestion;
  onShelf: boolean;
  leaving: boolean;
  onAdd: () => void;
  onDismiss: () => void;
}> = ({ s, onShelf, leaving, onAdd, onDismiss }) => {
  const facts = factsChip(s);
  /* ⚠️ "Matched on" NAMES FACTS, AND IT IS THE MODEL'S OWN AXIS SPLIT — never a score and never a
     ranking. "Thriller · Adult" is a fact about the query that surfaced this title; "87% match" or
     "Strong fit" would be a verdict about the writer's book, and no amount of hedging makes one into
     the other. If a future edit needs a number here, it is the wrong number. */
  const matched = compFacets(s);
  const spineText = [String(s.year), (s.media ?? "book").toUpperCase()].join(" · ");
  return (
    <div className={`ct-srow${leaving ? " gone" : ""}`}>
      {/* ⚠️ THE SAME SPINE AS THE COMP CARD (v2 §4), so a suggestion and a recorded comp read as the
          same kind of object — which is exactly what "Add to comps" turns one into. */}
      <div className={`ct-spine${(s.media ?? "book") === "book" ? "" : " screen"}`} aria-hidden="true">
        <span className="yr">{spineText}</span>
      </div>

      <div className="ct-cmain">
        <div className="ct-ctop">
          <span className="ct-ctitle">{s.title}</span>
          <span className="ct-cauthor">{s.author}</span>
        </div>
        {s.publisher && (
          <div className="ct-cmeta"><span><b>{s.publisher}</b></span></div>
        )}
        {matched.length > 0 && (
          <div className="ct-matchline">
            <span className="ct-lbl">Matched on</span>
            {matched.map((m) => <span key={m} className="ct-mchip">{m}</span>)}
          </div>
        )}
        {/* roman, not italic — it is a statement about the book, not a quotation */}
        <div className="why">{s.why}</div>
      </div>

      <div className="ct-saside">
        {/* ⚠️ THE SHARED CHIP, NAMING ITS CATALOGUE — the SAME component and colour as the comp
            card's. One claim, one treatment, both cards: a verification that read one way in the
            list and another in the panel would be two different claims about the same fact. This
            is also the page's provenance line; the ref draws library provenance ("Named on 3 agent
            wish lists"), which needs a library this Scout does not have. */}
        <span className="ct-chip verified"><Check /> Verified · {s.verification.catalogue}</span>
        {facts && <span className="ct-chip facts">{facts}</span>}
        <div className="sacts">
          {/* ⚠️ ADD IS PINK. Blue marks the tier; the verb belongs to the writer, like every action. */}
          <button type="button" className="ct-sadd" disabled={onShelf} onClick={onAdd}>
            {onShelf ? <Check /> : <Plus />}{onShelf ? "Added" : "Add to comps"}
          </button>
          <button type="button" className="ct-sdismiss" aria-label={`Dismiss ${s.title}`} onClick={onDismiss}>
            <X />
          </button>
        </div>
      </div>
    </div>
  );
};

type ScoutPhase = "idle" | "running" | "done" | "notyet" | "error";

const ScoutPanel: React.FC<{
  isPro: boolean;
  input: SuggestCompsInput;
  shelfTitles: string[];
  onAddToShelf: (comp: CompTitle) => void;
  onUpgrade: () => void;
}> = ({ isPro, input, shelfTitles, onAddToShelf, onUpgrade }) => {
  const [phase, setPhase] = useState<ScoutPhase>("idle");
  const [run, setRun] = useState<ScoutRun | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const visible = run ? visibleSuggestions(run.suggestions, shelfTitles, dismissed) : [];

  const send = async () => {
    if (!scoutLive()) { setPhase("notyet"); return; }
    setPhase("running");
    setStep(0);
    const advance = window.setInterval(() => setStep((n) => Math.min(n + 1, RUN_STEPS.length - 1)), 320);
    try {
      const [data] = await Promise.all([fetchCompRun(input, isPro), sleepMs(RUN_FLOOR_MS)]);
      setRun(data);
      setDismissed([]);
      setPhase("done");
    } catch {
      setPhase("error");
    } finally {
      window.clearInterval(advance);
    }
  };

  /** ⚠️ THE ROW LEAVES BEFORE THE LIST CHANGES, so the gap and the receipt agree. */
  const slideOut = (title: string, after: () => void) => {
    setLeaving(title);
    window.setTimeout(() => { setLeaving(null); after(); }, 240);
  };

  /**
   * ⚠️ THE FREE STATE SHOWS THE SHAPE OF THE FEATURE, NEVER INVENTED BOOKS.
   *
   * The pack asks for the three most recent REAL suggestions, blurred. A free user has never run the
   * Scout — they cannot — so there are none, and the only way to fill that space is to make some up.
   * Blurring a fabricated title does not stop it being one, and this is the card whose footer
   * promises that nothing is invented: undercutting that promise inside the same card to sell the
   * feature the promise is about would be the worst place in the app to do it.
   *
   * So the veil sits over three empty row SKELETONS. The writer sees the shape, the density and the
   * fixed action column — everything the feature looks like — and no title they could mistake for a
   * real book. Deliberate deviation, reported.
   */
  if (!isPro) {
    return (
      <div className="ct-body">
        <div className="ct-upsell">
          {/* ⚠️ ONE BLURRED TEASER, AND IT IS DECORATION — `aria-hidden`, `inert`, and holding no
              real title. A screen reader must not read it and a Tab must not land in it: it is a
              picture of a card, not a card. `inert` is what actually removes it from the tab order;
              `aria-hidden` alone hides it from the reader while leaving it focusable, which is the
              worst of both — a control a keyboard user can reach and cannot hear.

              ⚠️ AND IT SHOWS NO NAMED TITLE. A blurred card carrying a real suggestion would be
              showing a free user the answer and charging them to read it; a placeholder shape says
              "there is something here" without pretending to be a specific book. */}
          <div className="ghost" aria-hidden="true" inert>
            <div className="ct-srow skeleton">
              <div className="ct-spine" />
              <div className="ct-cmain">
                <span className="bar w70" /><span className="bar w40" /><span className="bar w90" />
              </div>
              <div className="ct-saside"><span className="bar btn" /></div>
            </div>
          </div>
          <div className="lockwrap">
            <div className="lock"><Lock /></div>
            {/* ⚠️ NO COUNT AND NO "up to N". The ref's heading names 1,240 library titles; there is
                no library behind this Scout and no quota on this plan — free comps are unlimited and
                the Pro boundary is the Scout itself. A number here would be either invented or a
                limit that does not exist. */}
            <h3>The Scout finds titles shelved beside manuscripts like yours</h3>
            <p>
              Pro sends the Scout out to find recent comps in your category, each checked against a
              real catalogue and shown with the facts it matched on.
            </p>
            <button type="button" className="ct-btn-slate" onClick={onUpgrade}>
              See what the Scout finds — Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sent = run ? lastSentOut(run.runAt) : null;
  const returned = phase === "done" && run;
  return (
    <div className="ct-sbody">
      {/* ⚠️ THE IDLE STATE IS THE PANEL, not a strip above one (v3 §4). With nothing to list, the
          slot takes the height the suggestions will take, so the panel does not resize the first
          time a run comes back. Status, one line on what a run does, then the send. */}
      {phase === "idle" && !run && (
        <div className="ct-sidle">
          <div className="ct-sslot" data-slot="comp-scout-idle" aria-hidden="true">
            <span>comp-scout-idle</span><span>300×200</span>
          </div>
          <div className="ct-sstatus">Not sent out yet</div>
          <p className="ct-snote">
            The Scout reads your manuscript&rsquo;s details and returns recent, real titles that
            match it — with the reason each one surfaced.
          </p>
          <button type="button" className="ct-btn-blue" onClick={send}>Send the Scout out</button>
        </div>
      )}

      {/* ⚠️ THE RETURNED HEADER STATES WHEN AND HOW MANY, and the count is what is SHOWN. */}
      {returned && (
        <div className="ct-sstatus ct-sstatus--back">{returnedLine(run.runAt, visible.length)}</div>
      )}

      {(phase === "running" || phase === "notyet" || phase === "error") && (
        <div className="ct-sctl">
          <span className="dotok" aria-hidden="true" />
          <span className="status">{run ? (sent ?? "Sent out this session") : "Not sent out yet"}</span>
          <button type="button" className="ct-btn-blue" onClick={send} disabled={phase === "running"}>
            {phase === "running" ? "Sending…" : run ? "Send again" : "Send the Scout out"}
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="ct-runsteps" role="status" aria-live="polite">
          {RUN_STEPS.map((label, i) => (
            <div key={label} className={`ct-runstep${i === step ? " on" : ""}${i < step ? " done" : ""}`}>
              <span className="pip" aria-hidden="true" />{label}
            </div>
          ))}
        </div>
      )}

      {phase === "notyet" && (
        <div className="ct-notyet">
          <b>The Scout goes live soon.</b> Its catalogue checks are being finished, so every title it
          brings back is a real book with a real year. Until then, add your own comps on the left.
        </div>
      )}

      {/* ⚠️ STATES WHAT HAPPENED AND WHAT TO DO. No apology, no red, no stack detail. */}
      {phase === "error" && (
        <div className="ct-notyet">The Scout couldn&rsquo;t complete this run. Try sending it out again.</div>
      )}

      {phase === "done" && visible.length === 0 && (
        <div className="ct-estate">
          <div className="ct-islot" data-slot="scout-empty"><ScoutEmptySketch /></div>
          <div className="em">Nothing left from this run.</div>
          <div className="es">
            You&rsquo;ve worked through every suggestion. Send the Scout out again whenever your
            manuscript or your list has moved on.
          </div>
        </div>
      )}

      {phase === "done" && visible.map((s) => (
        <ScoutRow
          key={s.title}
          s={s}
          onShelf={shelfTitles.some((t) => t.trim().toLowerCase() === s.title.trim().toLowerCase())}
          leaving={leaving === s.title}
          onAdd={() => slideOut(s.title, () => onAddToShelf(suggestionToComp(s)))}
          onDismiss={() => slideOut(s.title, () => setDismissed((d) => [...d, s.title]))}
        />
      ))}

      {/* ⚠️ THE RE-RUN PINS TO THE FOOT via `margin-top: auto`, not a fixed height — the panel's
          height comes from the comps card beside it, and a number here would have to be kept in
          step with a list whose length the writer controls. */}
      {returned && (
        <button type="button" className="ct-btn-blue ct-srerun" onClick={send}>
          <RefreshCw aria-hidden="true" />Send the Scout out again
        </button>
      )}

      {/* ⚠️ THE CLAIM THE WHOLE CONTRACT EXISTS TO EARN — see `verification`. */}
      <div className="ct-sfoot">
        <Check />
        <span className="ct-lbl">Every title checked against a real catalogue — nothing invented</span>
      </div>
    </div>
  );
};

// ── Field notes: what a good comp does (v2 §2) ──
/**
 * ⚠️ GENERAL GUIDANCE, NEVER APPRAISAL. Every cell here describes what comps do IN GENERAL. No cell
 * may refer to the writer's own manuscript, their own comps, or how well they have chosen — that is
 * the appraisal line this page has already been walked back from once, and this card sits three
 * inches from the list it would be appraising.
 *
 * ⚠️ AND THE RECENCY CLAIM STAYS SOFT. "broadly the last three to five years", plus an attribution
 * line saying agents differ. The research behind this page found genuine disagreement, and tightening
 * either into a single hard number would have the app manufacture a consensus that does not exist.
 *
 * `slot` is the illustrator's brief — one named 120×64 slot per cell, dashed placeholder until the
 * artwork lands.
 */
interface FieldNote { slot: string; heading: string; body: string }

const COMP_JOBS: FieldNote[] = [
  { slot: "comp-job-shelf", heading: "Places it on a shelf",
    body: "Comps tell an agent exactly which section of the bookshop your manuscript belongs in." },
  { slot: "comp-job-readership", heading: "Names the readership",
    body: "They point to a set of readers who already buy books like yours." },
  { slot: "comp-job-sales", heading: "Backs the sales case",
    body: "Editors build a book's numbers partly on how its nearest neighbours actually sold." },
  { slot: "comp-job-tone", heading: "Carries the tone",
    body: "A well-chosen pair conveys how the book feels faster than any synopsis can." },
  { slot: "comp-job-current", heading: "Shows you read now",
    body: "Recent comps — broadly the last three to five years — show you know today's market, not the one you grew up reading." },
];

const COMP_MISSTEPS: FieldNote[] = [
  { slot: "comp-miss-giants", heading: "Comping the giants",
    body: "Global phenomena can't anchor a realistic case for a debut — and everyone names them." },
  { slot: "comp-miss-age", heading: "Reaching too far back",
    body: "A comp from another publishing era says the market has moved on without you." },
  { slot: "comp-miss-unread", heading: "Comping the unread",
    body: "Agents ask about comps. A title you haven't read is easily exposed." },
  { slot: "comp-miss-shelf", heading: "Crossing shelves",
    body: "Comps from the wrong category muddy where the book sits — and who it's for." },
  { slot: "comp-miss-count", heading: "Piling them on",
    body: "Two is the common counsel, three at most. A longer list dilutes the signal." },
];

const FIELD_NOTES_ATTRIBUTION =
  "Drawn from published agent and industry guidance. Agents differ on the details — some accept one older anchor title alongside fresh ones.";

/** ⚠️ THE `sa.` PREFIX IS THE HOUSE CONVENTION for a small per-user UI preference, and localStorage
 *  is deliberately the store rather than the user doc: a new field on `User` needs a Firestore
 *  allowlist entry and therefore a PROD rules deploy, which is Nick's and would leave the control
 *  silently denied until it landed. A fold state does not warrant that. */
const FIELD_NOTES_KEY = "sa.compsFieldNotes";

const FieldNotesCard: React.FC = () => {
  const [panel, setPanel] = useState<"jobs" | "missteps">("jobs");
  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(FIELD_NOTES_KEY) !== "collapsed"; } catch { return true; }
  });

  const toggle = () => {
    setOpen((was) => {
      const next = !was;
      try { localStorage.setItem(FIELD_NOTES_KEY, next ? "open" : "collapsed"); } catch { /* private mode */ }
      return next;
    });
  };

  const cells = panel === "jobs" ? COMP_JOBS : COMP_MISSTEPS;

  return (
    <section className="ct-panel ct-fnotes">
      <div className="ct-band">
        <span className="bt">What does a good comp do?</span>
        <span className="ct-tag free">Field notes</span>
        <div className="ct-fnhead">
          <div className="ct-seg" role="group" aria-label="Field notes">
            <button
              type="button"
              className={panel === "jobs" ? "on" : ""}
              aria-pressed={panel === "jobs"}
              onClick={() => setPanel("jobs")}
            >
              The five jobs
            </button>
            <button
              type="button"
              className={panel === "missteps" ? "on" : ""}
              aria-pressed={panel === "missteps"}
              onClick={() => setPanel("missteps")}
            >
              Common missteps
            </button>
          </div>
          <button
            type="button"
            className={`ct-fncollapse${open ? "" : " shut"}`}
            aria-expanded={open}
            onClick={toggle}
          >
            {open ? "Collapse" : "Expand"}
            <ChevronDown />
          </button>
        </div>
      </div>

      {open && (
        <div className="ct-fnbody">
          <div className={`ct-fngrid${panel === "missteps" ? " missteps" : ""}`}>
            {cells.map((c) => (
              <div key={c.slot} className="ct-fncell">
                {/* the illustrator's slot — named, sized, and dashed until the artwork arrives */}
                <div className="ct-fnslot" data-slot={c.slot} aria-hidden="true">
                  <span>{c.slot}</span>
                </div>
                <h4>{c.heading}</h4>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
          {/* ⚠️ THE ATTRIBUTION IS PART OF THE CLAIM, not a footnote to trim. It is what stops the
              five cells reading as house rules. */}
          <div className="ct-fnattr">{FIELD_NOTES_ATTRIBUTION}</div>
        </div>
      )}
    </section>
  );
};

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
  /**
   * The tile's pills — primary genre then age category, both resolved for DISPLAY through the shared
   * `genreDisplay` rather than rendered as stored ids.
   *
   * ⚠️ ABSENCE OMITS THE PILL, it never renders an empty one. A manuscript created without an age
   * category has two facts about it, not three, and a blank pill would state a category it does not
   * have.
   */
  const msPills = activeMs
    ? [genreDisplay(activeMs.genre), activeMs.ageCategory].filter((x): x is string => !!x && !!x.trim())
    : [];

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

  /* the first-visit Scout's scroll/focus target — see the `onScout` note below */
  const scoutRef = useRef<HTMLElement>(null);
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
        /**
         * ⚠️ THE SAME MASTHEAD EVERY OTHER PAGE PASSES. This was `masthead={null}` — the prop is
         * typed `React.ReactNode`, so `null` was a way to decline the shared header without editing
         * the grid. The reasoning was sound page-locally (a header that leaves with the content, on
         * the sheet's measure rather than the masthead's constant gutter) and it is not what the app
         * does: one masthead, one settle, one Hide rule, on all ten pages.
         *
         * ⚠️ THE COPY IS THE PAGE'S OWN, carried across verbatim from the header this replaces — the
         * title and the sentence beneath it are unchanged, only the thing rendering them.
         */
        masthead={(
          <PageHeader
            variant="workspace"
            mark="comps"
            title="Comparable titles"
            description="The books your manuscript sits beside, gathered and query-ready."
          />
        )}
      >
      <div className="ct-pagebody">
        {!activeMs ? (
          <div className="ct-panel">
            <div className="ct-blank">
              <div className="q">No manuscript to compare yet.</div>
              <span className="lab">Add a manuscript to build its comp list</span>
            </div>
          </div>
        ) : counts.total === 0 ? (
          /* ══ FIRST VISIT — no comps recorded (v3 §1) ══

             ⚠️ THE STATE IS A DERIVATION, NOT A FLAG. `counts.total === 0` and nothing else: no
             `hasSeenX` field, no localStorage, no manual toggle. Recording a first comp moves the
             page to the workspace on the next render because the count changed, which is the only
             thing that should be able to move it. The ref's state toggle is mockup scaffolding.

             ⚠️ AND THE ADD FORM IS HOSTED HERE TOO. In the workspace it lives inside the Your comps
             card; there is no such card in this state, so the same `CompInlineForm` takes the whole
             block when it opens. One form component, two homes — never a second form. */
          formState?.index === null ? (
            <section className="ct-panel ct-firstform">
              <div className="ct-band">
                <span className="bt">Add your first comp</span>
              </div>
              <CompInlineForm
                mode="add"
                otherTitles={[]}
                onSave={addComp}
                onCancel={() => setFormState(null)}
                onShowExisting={pointAt}
              />
            </section>
          ) : (
            <>
              <FeatureBlock
                onAddComp={() => setFormState({ index: null })}
                /* ⚠️ THE SCOUT IS ON THIS STATE TOO, SO THE CTA HAS A REAL DESTINATION (Nick's
                   call). It reads the MANUSCRIPT, not the shelf, so it already works with nothing
                   recorded — and an empty shelf is exactly when "find me some" is worth most. The
                   alternative was a button labelled "Try the Scout" that opened a comp form, which
                   is a control whose label does not describe what it does. */
                onScout={() => {
                  scoutRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  /* ⚠️ FOCUS FOLLOWS THE SCROLL, or a keyboard reader is moved somewhere their
                     focus is not and the next Tab returns them to the button they just left. */
                  scoutRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
                }}
              />

              {/* ⚠️ THE SAME `ScoutPanel`, NOT A FIRST-RUN COPY — same run, same phases, same
                  machinery. Only its placement differs between the two states. */}
              <section className="ct-panel ct-scout--solo" ref={scoutRef}>
                <div className="ct-band blue">
                  <span className="bt">The Scout</span>
                  <span className="ct-tag pro">Pro</span>
                </div>
                <ScoutPanel
                  isPro={isProUser(currentUser)}
                  input={{ manuscriptId: activeMs.id }}
                  shelfTitles={[]}
                  onAddToShelf={(comp) => writeComps(withCompAdded(comps, comp))}
                  onUpgrade={() => onNavigate?.("plans")}
                />
              </section>

              <StagesBlock />
            </>
          )
        ) : (
          <>

            {/* ══ THE TOP ROW — active manuscript left, the query line right (v2.1 §2) ══ */}
            <div className="ct-toprow">
              {/* ⚠️ THE TILE STATES, IT NEVER APPRAISES. Its foot line is a count of what is on the
                  shelf — never "enough", "still needs" or any other verdict about the writer's list,
                  and it is the only count above the fold now that the fact row and the tally are
                  gone.

                  ⚠️ AND EVERY ROW OMITS ITSELF WHEN ABSENT. No word count → no word-count line; no
                  genre → no pills. A dash or a zero here would assert something the record does not
                  say. */}
              {/* ⚠️ HORIZONTAL NOW, AND THE COMPRESSION IS THE POINT (v3 §4). The vertical tile was
                  296px tall and set the row's height; the working row wants roughly half that, so
                  the plate moved beside the details instead of above them. Nothing was dropped —
                  the word count and the comps figure became one mono line.

                  ⚠️ AND EVERY CLAUSE STILL OMITS ITSELF WHEN ABSENT. No word count → the line is the
                  comps figure alone; no genre → no pills. A dash or a zero would assert something
                  the record does not say. */}
              <div className="ct-mstile">
                <div className="ct-msplate">
                  <img src={manuscriptIcon} alt="" />
                </div>
                <div className="ct-mstile-body">
                  <span className="ct-lbl">Active manuscript</span>
                  <div className="ct-mstitle">{activeMs.title}</div>
                  {msPills.length > 0 && (
                    <div className="ct-mspills">
                      {msPills.map((label) => (
                        <span key={label} className="ct-mspill">{label}</span>
                      ))}
                    </div>
                  )}
                  {/* ⚠️ THE COMPS FIGURE IS DERIVED AT READ TIME from `compCounts`, the same function
                      the band's tally reads — one source, so the two cannot disagree. */}
                  <div className="ct-msmeta">
                    {activeMs.wordCount > 0 && <>{activeMs.wordCount.toLocaleString("en-GB")} words · </>}
                    <b>{counts.total} {counts.total === 1 ? "comp" : "comps"}</b>
                  </div>
                </div>
              </div>

              {/* ⚠️ THE CARD IS THE ROW'S RIGHT COLUMN NOW (v2.1 §2). It is the same `MountCard`
                  composition, moved — band, format toggle, tick-chips and actions are untouched.
                  What is new is that it must FILL a row whose height the tile sets, which is why
                  its body is a flex column and its actions row takes `margin-top: auto` rather
                  than a fixed height: the line stays at the top and the controls stay at the
                  bottom whatever the tile does. */}
            {/* ══ THE QUERY LETTER LINE (v2 §3) — the composed line is the page; the chips below it
                are the instrument that builds it (baked decision 1). ══ */}
            <section className="ct-panel ct-qline">
              <div className="ct-band">
                <span className="bt">Query letter line</span>
                <span className="ct-chip ms">{activeMs.title}</span>
                <div className="ct-fnhead">
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
                </div>
              </div>
              <div className="ct-qline-l">
                <div className="ct-qsplit">
                {/* ⚠️ `aria-live="polite"` ON THE LINE, announcing ONCE per tick. It is the region
                    that changes, so the whole recomposed sentence is read — not each fragment as it
                    arrives, which is what marking the segments live would produce. */}
                <div
                  className={`ct-qline-text${qline.kind === "line" ? "" : " empty"}`}
                  aria-live="polite"
                >
                  {qline.kind === "line"
                    ? qline.segments.map((seg, i) => (
                        <span key={i} className={seg.emphasis ?? undefined}>{seg.text}</span>
                      ))
                    : qline.prompt}
                </div>
                  {/* ⚠️ 156×118, AND IT HIDES RATHER THAN SQUASHING UNDER 980px. A slot that
                      shrinks with the column stops being the size it is briefed at, and the
                      illustrator would be drawing for a box that does not exist at that width. The
                      LINE keeps the flexible column, so a long sentence still has room. */}
                  <div className="ct-qslot" data-slot="comp-query-line" aria-hidden="true">
                    <span>comp-query-line</span>
                  </div>
                </div>

                {/* ⚠️ THE TICK LIVES HERE NOW, NOT ON THE CARD (v2 §3). A chip sits directly under
                    the sentence it changes, so ticking one is visibly composition rather than a
                    property being set on a record three sections down.

                    ⚠️ AND EACH CHIP KEEPS `role="switch"` + `aria-checked` + ITS COMP'S NAME. A bare
                    button would announce the title with nothing to say whether it was in the line —
                    which is the whole state the control exists to carry.

                    ⚠️ THE POSITION NUMBER IS SHOWN ONLY WHEN TICKED, because position is a fact
                    about the LINE, and an unticked comp is not in it. Numbering everything would
                    state an order the sentence does not have. */}
                <div className="ct-qchips" role="group" aria-label="Comps in your query line">
                  {comps.map((c, i) => {
                    const pos = comps.slice(0, i).filter((x) => x.inQuery).length + 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        role="switch"
                        aria-checked={!!c.inQuery}
                        aria-label={`Use ${c.title} in your query line`}
                        className={`ct-qchip${c.inQuery ? " on" : ""}`}
                        onClick={() => toggleInQuery(i)}
                      >
                        {c.inQuery && <span className="pos">{pos}</span>}
                        {c.title}
                      </button>
                    );
                  })}
                </div>

                <div className="ct-qline-ctl">
                  {qline.kind === "line" && (
                    <button type="button" className="ct-copyb" onClick={copyLine}>
                      {copied ? <Check /> : <Copy />}
                      {copied ? "Copied" : "Copy line"}
                    </button>
                  )}
                  {/* ⚠️ SEND TO PACKAGE IS NOT DRAWN, AND THE REASON IS NOT "there is no field".
                      There IS one — `ManuscriptVersion.contentDraft` holds the letter's text. The
                      reason is that there is no unambiguous TARGET and no safe write:
                        · a manuscript may have several packages, each with its own
                          `queryLetterVersionId`, so "the" query letter does not exist; and
                        · `contentDraft` is the writer's own prose, so the write is an edit to
                          their letter — appending blindly is not a placement, it is a mangling.
                      That makes this a flow with a target picker and an insertion decision, not a
                      button. Drawing it inert would be worse than its absence: an undo that
                      restores nothing is the shape this repo already has a law about, and a send
                      that sends nothing is the same fault. Requirements are in the report. */}
                  {qline.caption && <span className="ct-qline-cap">{qline.caption}</span>}
                </div>
              </div>
            </section>
            </div>

            <FieldNotesCard />

            <div className="ct-split">
            {/* ── Your comps ── */}
            <section className="ct-panel">
              <div className="ct-band">
                <span className="bt">Your comps</span>
                <span className="ct-tag free">Free</span>
                {/* ⚠️ THE TALLY AND THE ROW'S ADD BOTH READ ONE SOURCE. `compCounts` is the figure and
                    `setFormState` is the action the add ROW below already uses — this is a second
                    PLACE to reach it, never a second mechanism. */}
                <span className="bmeta">{counts.total} {counts.total === 1 ? "comp" : "comps"}</span>
                <button
                  type="button"
                  className="ct-bandbtn"
                  disabled={comps.length >= MAX_COMPS}
                  onClick={() => setFormState({ index: null })}
                >
                  Add a comp
                </button>
              </div>

              {/* ⚠️ NO EMPTY STATE IN THIS CARD ANY MORE (v3 §1). It could only render at zero
                  comps, and at zero comps the page renders the FIRST-VISIT state instead — so the
                  branch was unreachable the moment the page-level split landed. An unreachable
                  branch is worse than none: it reads as a state the card still has. */}
              <>
                  {comps.map((c, i) => {
                    const media = compMedia(c);
                    const ageLine = compAgeLine(c, now);
                    const facets = compFacets(c);
                    /* ⚠️ THE SPINE STATES ONLY WHAT IS RECORDED. No year → the media word alone;
                       the spine never invents a date to keep its shape. */
                    const spineText = [c.year != null ? String(c.year) : null, MEDIA_LABEL[media].toUpperCase()]
                      .filter(Boolean)
                      .join(" · ");
                    /* ⚠️ "Found via" IS DERIVED FROM `source`/`verification`, NEVER TYPED. The ref
                       draws prose ("Bookshop table, Waterstones") that this model has nowhere to
                       store, so the card states the provenance it actually holds and omits the row
                       when it holds none. */
                    const foundVia = isVerified(c)
                      ? `The Scout · ${c.verification!.catalogue}`
                      : c.source === "suggested"
                        ? "The Scout"
                        : c.source === "user"
                          ? "Added by you"
                          : null;
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
                        {/* ⚠️ THE SPINE IS THE ONE PLACE THIS DESIGN SPENDS ITS BOLDNESS — pink for a
                            book, sage for a screen comp. Everything around it stays quiet, which is
                            what lets the year read as a signature rather than as another chip. */}
                        <div className={`ct-spine${media === "book" ? "" : " screen"}`} aria-hidden="true">
                          <span className="yr">{spineText}</span>
                        </div>

                        <div className="ct-cmain">
                          <div className="ct-ctop">
                            <span className="ct-ctitle">{c.title}</span>
                            {c.author && <span className="ct-cauthor">{c.author}</span>}
                            {/* ⚠️ A FACT, AND IT APPEARS ON EVERY COMP THAT HAS A YEAR. No cutoff, no
                                colour, no icon, no ordering — see `compAgeLine`. A chip that shows up
                                on only some rows is a flag whatever its words say. */}
                            {ageLine && <span className="ct-agechip">{ageLine}</span>}
                          </div>
                          {(c.publisher || media !== "book") && (
                            <div className="ct-cmeta">
                              {c.publisher && <span><b>{c.publisher}</b></span>}
                              {media !== "book" && <span>{MEDIA_LABEL[media]}</span>}
                            </div>
                          )}
                          {facets.length > 0 && (
                            <div className="ct-facets">
                              {facets.map((f) => <span key={f} className="ct-facet">{f}</span>)}
                            </div>
                          )}
                          {c.note && <div className="ct-why">{c.note}</div>}
                        </div>

                        {/* ⚠️ THE ASIDE STATES WHAT IS RECORDED AND OMITS THE REST. The ref draws
                            "Reading · Read March 2026" and "Used in · 4 query letters"; this model
                            stores neither a reading date nor any link between a comp and a letter,
                            so both rows are absent rather than dashed or guessed. */}
                        <div className="ct-caside">
                          {/* ⚠️ THE SAME CHIP AS THE SUGGESTION'S, CATALOGUE AND ALL. A comp added
                              from the Scout carries its `verification` across, so the chip must not
                              change wording when the card changes kind — that would read as the
                              claim weakening on the way into the list. */}
                          {isVerified(c) && (
                            <span className="ct-chip verified">
                              <Check /> Verified · {c.verification!.catalogue}
                            </span>
                          )}
                          {foundVia && (
                            <div className="ct-factrow">
                              <span className="ct-lbl">Found via</span>
                              <span className="v">{foundVia}</span>
                            </div>
                          )}
                          {/* ⚠️ LABELLED BUTTONS, PER THE REF — an aside has room for words, and
                              "Edit" beats a pencil a reader has to decode.

                              ⚠️ AND THE GRIP STAYS, WHICH IS A DELIBERATE ADDITION TO THE REF'S TWO.
                              The list's ORDER is the query line's order, so reordering is a real
                              operation on this page, and it is the only one reachable without a
                              pointer (⌥↑ / ⌥↓ on the focused grip). Dropping it to match a mockup
                              would be a functional regression, and an accessibility one. Same
                              precedent as the Agents page keeping its ⋯ against a two-action ref. */}
                          <div className="ct-cacts">
                            <button
                              type="button"
                              className="ct-grip"
                              aria-label={`Reorder ${c.title}. Position ${i + 1} of ${comps.length}. Use Option with the up and down arrows to move it.`}
                              onKeyDown={(e) => {
                                if (!e.altKey) return;
                                if (e.key === "ArrowUp") { e.preventDefault(); moveComp(i, i - 1); }
                                if (e.key === "ArrowDown") { e.preventDefault(); moveComp(i, i + 1); }
                              }}
                            >
                              <GripVertical />
                            </button>
                            <button
                              type="button"
                              className="ct-minibtn"
                              onClick={() => setFormState({ index: i })}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ct-minibtn"
                              onClick={() => removeComp(i)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </>

              {/* ⚠️ THE HINT APPEARS ONLY NOW THAT THE KEY WORKS. Phase 2 deliberately rendered no
                  `N` affordance because the shortcut did not exist yet. */}
              {/* ⚠️ THE STAND-DOWN GUARD IS GONE WITH THE STATE IT GUARDED (v3 §1). It existed
                  because the card's empty state and this row both offered "add a comp" and stacked;
                  the card has no empty state now — at zero comps the page is the first-visit state —
                  so `comps.length === 0` is unreachable here and the row is simply always offered. */}
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
              {/* ⚠️ `blue` IS THE HALF THAT WAS MISSING. The tokens existed and were asserted; no
                  rule read them and no element asked for them, so this band drew sage like its
                  neighbour. */}
              <div className="ct-band blue">
                <span className="bt">The Scout</span>
                <span className="ct-tag pro">Pro</span>
              </div>
              <ScoutPanel
                isPro={isProUser(currentUser)}
                /* the id is the whole input — the function reads the manuscript itself */
                input={{ manuscriptId: activeMs.id }}
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
