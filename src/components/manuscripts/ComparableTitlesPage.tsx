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
 * internally). The masthead is the locked HubHeaderBar with the manuscript selector in its right
 * slot. Store only facts + one intent (`inQuery`); role / query line / health / recency are derived
 * at render (src/lib/compsPage.ts). Comp writes go through the shared updateManuscript path (a first
 * write on a legacy-string doc converts it to the structured array); every write runs through
 * normalizeComp so optional fields stay omit-empty (Firestore maps reject undefined).
 */
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Copy, Check, Pencil, X, AlertTriangle } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { CompMedia, CompTitle, Manuscript } from "../../types";
import { HubHeaderBar } from "../shell/HubHeaderBar";
import { FormShell } from "../forms/FormShell";
import { BrandDropdown } from "../forms/BrandDropdown";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { manuscriptComps, withCompAdded, withCompRemoved, MAX_COMPS } from "../../lib/comps";
import { compCounts, compMedia, compRole, currentYear, queryHealth, queryLine, recencyFlag } from "../../lib/compsPage";
import { FONT_SERIF } from "../../lib/designTokens";
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

/** Strip empty optionals / defaults so a comp map never carries undefined or a redundant default. */
export function normalizeComp(c: CompTitle): CompTitle {
  const out: CompTitle = { title: c.title.trim() };
  const author = c.author?.trim();
  if (author) out.author = author;
  const publisher = c.publisher?.trim();
  if (publisher) out.publisher = publisher;
  if (typeof c.year === "number" && Number.isFinite(c.year)) out.year = c.year;
  const note = c.note?.trim();
  if (note) out.note = note;
  const axis = c.matchAxis?.trim();
  if (axis) out.matchAxis = axis;
  if (c.media && c.media !== "book") out.media = c.media;
  if (c.inQuery) out.inQuery = true;
  if (c.source) out.source = c.source;
  return out;
}

/** The editable subset of a comp — everything the manual form lets a writer set. */
type CompDraft = Pick<CompTitle, "title" | "author" | "publisher" | "year" | "media" | "matchAxis">;

// ── the right-of-masthead manuscript selector (design-ref .ms-header) ──
const CompsMsSelect: React.FC<{
  active: Manuscript;
  manuscripts: Manuscript[];
  onSelect: (id: string) => void;
}> = ({ active, manuscripts, onSelect }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="ct-mssel-wrap" ref={wrapRef}>
      <button
        type="button"
        className="ct-mssel"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mono">{monogram(active.title)}</span>
        <span>
          <span className="lab">Working on</span>
          <span className="val" style={{ display: "block" }}>{active.title}</span>
        </span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="ct-msmenu" role="listbox">
          {manuscripts.map((m) => {
            const shelved = isShelvedPresentation(m);
            const n = manuscriptComps(m).length;
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={m.id === active.id}
                className={`ct-msopt${m.id === active.id ? " on" : ""}${shelved ? " shelved" : ""}`}
                onClick={() => {
                  onSelect(m.id);
                  setOpen(false);
                }}
              >
                <span className="t">{m.title}</span>
                <span className="c">{shelved ? "SHELVED" : `${n} ${n === 1 ? "COMP" : "COMPS"}`}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

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

  const [selectedMsId, setSelectedMsId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_MS_KEY)
  );
  const [copied, setCopied] = useState(false);
  // null = closed; { index: null } = adding; { index } = editing that comp.
  const [formState, setFormState] = useState<{ index: number | null } | null>(null);

  const ordered = [...manuscripts].sort(
    (a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b))
  );

  useEffect(() => {
    if (ordered.length === 0) {
      if (selectedMsId !== null) setSelectedMsId(null);
      return;
    }
    if (!selectedMsId || !ordered.some((m) => m.id === selectedMsId)) {
      setSelectedMsId(ordered[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscripts]);

  if (!currentUser) return null;

  const selectMs = (id: string) => {
    setSelectedMsId(id);
    localStorage.setItem(ACTIVE_MS_KEY, id);
  };

  const activeMs = selectedMsId ? manuscripts.find((m) => m.id === selectedMsId) : null;
  const comps = activeMs ? manuscriptComps(activeMs) : [];
  const now = currentYear();
  const counts = compCounts(comps);
  const qline = queryLine(comps);
  const health = queryHealth(comps, now);

  // ── comp writes (the single editing path) ──
  const writeComps = (next: CompTitle[]) => {
    if (!activeMs) return;
    void updateManuscript(activeMs.id, { comps: next.map(normalizeComp) });
  };
  const toggleInQuery = (index: number) =>
    writeComps(comps.map((c, i) => (i === index ? { ...c, inQuery: !c.inQuery } : c)));
  const removeComp = (index: number) => writeComps(withCompRemoved(comps, index));
  const addComp = (draft: CompDraft) => writeComps(withCompAdded(comps, { ...draft, source: "user" }));
  const editComp = (index: number, draft: CompDraft) =>
    writeComps(
      comps.map((c, i) =>
        i === index ? { ...draft, source: c.source ?? "user", inQuery: c.inQuery } : c
      )
    );

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

  const pulse = activeMs ? (
    <span className="ct-pulse">
      {[activeMs.ageCategory, activeMs.genre].filter(Boolean).join(" ")} · <b>{counts.total}</b>{" "}
      {counts.total === 1 ? "comp" : "comps"} · <b>{counts.inQuery}</b> in your query
    </span>
  ) : (
    manuscripts.length === 0 ? "No manuscripts yet" : ""
  );

  return (
    <div className="ctpage">
      <div className="ct-mast">
        <HubHeaderBar
          title="Comparable titles"
          titleStyle={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 30, color: "var(--ct-ink)" }}
          subtitle={pulse}
          right={
            activeMs ? (
              <CompsMsSelect active={activeMs} manuscripts={ordered} onSelect={selectMs} />
            ) : undefined
          }
        />
      </div>

      <div className="ct-desk">
        {!activeMs ? (
          <div className="ct-panel" style={{ height: "100%" }}>
            <div className="ct-blank">
              <div className="q">No manuscript to compare yet.</div>
              <span className="lab">Add a manuscript to build its comp list</span>
            </div>
          </div>
        ) : (
          <div className="ct-split">
            {/* ── Your comps ── */}
            <section className="ct-panel">
              <div className="ct-band">
                <span className="bt">Your comps</span>
                <span className="ct-tag free">Free</span>
                <span className="bmeta">{counts.total} saved</span>
              </div>
              <div className="ct-body">
                {/* strategy strip */}
                <div className="ct-strat">
                  <div className="cap">
                    <span className="n">{counts.inQuery} in query</span> Query letter line · years verified
                  </div>
                  {qline.kind === "empty" ? (
                    <div className="ct-qtxt empty">{qline.prompt}</div>
                  ) : (
                    <div className="ct-qtxt">
                      <QueryLineText parts={qline.parts} />
                    </div>
                  )}
                  {health.status !== "empty" && (
                    <div className={`ct-hnote ${health.status}`}>
                      {health.status === "ok" ? <Check size={13} /> : <AlertTriangle size={13} />}
                      {health.text}
                    </div>
                  )}
                  {qline.kind === "line" && (
                    <button type="button" className="ct-qcopy" onClick={copyLine}>
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? "Copied" : "Copy for query letter"}
                    </button>
                  )}
                </div>

                <div className="ct-listcap">
                  All comps <span className="ln" /> tick the ones for your query
                </div>

                {comps.length === 0 ? (
                  <div className="ct-listempty">No comps yet — add one below, or send the Scout out.</div>
                ) : (
                  comps.map((c, i) => {
                    const role = compRole(c, now);
                    const media = compMedia(c);
                    const flag = recencyFlag(c, now);
                    const meta = [c.author, c.publisher].filter(Boolean).join(" · ");
                    return (
                      <div key={i} className={`ct-card${c.inQuery ? " inq" : ""}`}>
                        <div className="ct-cc-main">
                          <div className="ct-cc-titlerow">
                            <span className="ct-cc-title">{c.title}</span>
                            {c.year != null && <span className="ct-cc-year">{c.year}</span>}
                            <span className="ct-cc-role">{role.label}</span>
                          </div>
                          {meta && <div className="ct-cc-meta">{meta}</div>}
                          <div className="ct-cc-roleline">{role.line}</div>
                          <div className="ct-chips">
                            {media !== "book" && <span className="ct-chip media">{MEDIA_LABEL[media]}</span>}
                            {c.matchAxis && <span className="ct-chip axis">{c.matchAxis}</span>}
                            {flag && (
                              <span className="ct-chip warn">
                                <span className="dot" />
                                Old for a market comp
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ct-cc-side">
                          <button
                            type="button"
                            className={`ct-inq${c.inQuery ? " on" : ""}`}
                            aria-pressed={!!c.inQuery}
                            onClick={() => toggleInQuery(i)}
                          >
                            <span className="box">
                              <Check size={9} />
                            </span>
                            In query
                          </button>
                          <div style={{ display: "flex", gap: 2 }}>
                            <button
                              type="button"
                              className="ct-editbtn"
                              aria-label={`Edit ${c.title}`}
                              onClick={() => setFormState({ index: i })}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="ct-x"
                              aria-label={`Remove ${c.title}`}
                              onClick={() => removeComp(i)}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <button
                  type="button"
                  className="ct-addman"
                  disabled={comps.length >= MAX_COMPS}
                  onClick={() => setFormState({ index: null })}
                >
                  <Plus size={12} />
                  {comps.length >= MAX_COMPS ? "Shelf full (12)" : "Add a comp manually"}
                </button>
              </div>
            </section>

            {/* ── The Scout (Phase 4) ── */}
            <section className="ct-panel">
              <div className="ct-band">
                <span className="bt">The Scout</span>
                <span className="ct-tag pro">Pro</span>
              </div>
              <div className="ct-body" />
            </section>
          </div>
        )}
      </div>

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
