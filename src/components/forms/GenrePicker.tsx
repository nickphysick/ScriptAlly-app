/**
 * GenrePicker — the taxonomy picker (interaction layer, Stage 3d). Search-first popover over the
 * shared genre taxonomy (src/lib/genres.ts): canonical genres, then the user's own in a "Your
 * genres" group. Stores IDs (never labels). Ghost completion; the option ⏎ will pick is visibly
 * ringed; the helper line states exactly what ⏎ does. When nothing matches, the personal-genre
 * escape is offered plainly ("⏎ to add '…' as your own") — created via onCreatePersonal
 * (db.addPersonalGenre), which runs the 3b guardrails (cap, junk, dedupe).
 *
 * Deviation from design-refs/contact-list-interactions.html (flagged): the prototype never creates
 * off-list genres. Standing decision #3 (the three-tier taxonomy) mandates the personal escape, so
 * it's built here per the prompt; the prototype simply predates it.
 *
 * Portalled to document.body inside a .t-f12 wrapper (tokens resolve; the pane's clip can't reach
 * it), positioned via useFixedMenu. Consumed by the agent + manuscript genre fields in 3e.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFixedMenu } from "./useFixedMenu";
import {
  CANONICAL_GENRES,
  matchKey,
  resolveGenre,
  genreDisplay,
  normaliseStoredGenre,
  type PersonalGenre,
} from "../../lib/genres";
import "./genrePicker.css";

interface Opt { id: string; label: string; personal: boolean; }

export const GenrePicker: React.FC<{
  /** Stored genre ids (legacy label strings tolerated on the way in). */
  value: string[];
  onChange: (ids: string[]) => void;
  personal?: PersonalGenre[];
  onCreatePersonal: (raw: string) => Promise<{ ok: true; id: string; label: string } | { ok: false; reason: string }>;
  /** true (default) = multi-select (agents); false = single (manuscript primary genre). */
  multi?: boolean;
}> = ({ value, onChange, personal = [], onCreatePersonal, multi = true }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { triggerRef, menuStyle } = useFixedMenu<HTMLButtonElement>(open);
  const inputRef = useRef<HTMLInputElement>(null);

  const options: Opt[] = useMemo(
    () => [
      ...CANONICAL_GENRES.map((g) => ({ id: g.id, label: g.label, personal: false })),
      ...personal.map((p) => ({ id: p.id, label: p.label, personal: true })),
    ],
    [personal]
  );

  const selectedIds = useMemo(
    () => new Set(value.map((v) => normaliseStoredGenre(v, personal))),
    [value, personal]
  );
  const isOn = (id: string) => selectedIds.has(id);

  const key = matchKey(q);
  // The visible option ⏎ will ring/pick (startsWith beats includes), across ALL options.
  const suggestion = useMemo(() => {
    if (!key) return null;
    return options.find((o) => matchKey(o.label).startsWith(key)) || options.find((o) => matchKey(o.label).includes(key)) || null;
  }, [key, options]);
  const resolution = useMemo(() => (q.trim() ? resolveGenre(q, "preview", personal) : null), [q, personal]);

  // Unifies a visible-list match with an alias-only match (e.g. "litfic") + the new-personal escape.
  const target = suggestion
    ? { id: suggestion.id, label: suggestion.label, kind: "existing" as const }
    : resolution && (resolution.status === "canonical" || resolution.status === "personal")
    ? { id: resolution.id, label: resolution.label, kind: "existing" as const }
    : resolution && resolution.status === "new-personal"
    ? { id: resolution.id, label: resolution.label, kind: "new" as const }
    : null;

  const visible = useMemo(() => (key ? options.filter((o) => matchKey(o.label).includes(key)) : options), [key, options]);

  useEffect(() => {
    if (open) { setQ(""); const t = window.setTimeout(() => inputRef.current?.focus(), 0); return () => window.clearTimeout(t); }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: MouseEvent) => { if (!(e.target as Element)?.closest?.(".gp-pop, .gp-trigger")) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open]);

  const toggle = (id: string) => {
    if (multi) {
      onChange(isOn(id) ? value.filter((v) => normaliseStoredGenre(v, personal) !== id) : [...value, id]);
    } else {
      onChange([id]);
      setOpen(false);
    }
  };

  const commit = async () => {
    if (!target) return;
    if (target.kind === "existing") { if (!isOn(target.id)) toggle(target.id); setQ(""); return; }
    const res = await onCreatePersonal(q);
    if (res.ok) { toggle(res.id); setQ(""); }
    // rejected / at-limit surface via the helper line; nothing else to do.
  };

  const helper: React.ReactNode = (() => {
    if (!q.trim()) return null;
    if (target?.kind === "existing") return isOn(target.id) ? <><b>{target.label}</b> is already added.</> : <>⏎ adds <b>{target.label}</b>.</>;
    if (target?.kind === "new") return <>⏎ to add “{target.label}” as your own.</>;
    if (resolution?.status === "at-limit") return <span className="gp-warn">{resolution.reason}</span>;
    return <span className="gp-warn">No genre matches “{q.trim()}”.</span>;
  })();

  const chips = value.map((v) => ({ raw: v, label: genreDisplay(v, personal) }));
  const ghost = suggestion && matchKey(suggestion.label).startsWith(key) && q
    ? <><b>{q}</b>{suggestion.label.slice(q.length)}</>
    : null;

  const renderOpt = (o: Opt) => (
    <button
      key={o.id}
      type="button"
      className={`gp-opt${o.personal ? " personal" : ""}${isOn(o.id) ? " on" : ""}${target && !suggestion && "id" in target && target.id === o.id ? " sug" : ""}${suggestion?.id === o.id ? " sug" : ""}`}
      onClick={() => toggle(o.id)}
    >
      <span>{o.label}</span>
      {isOn(o.id) && <span className="gp-tick" aria-hidden="true">✓</span>}
    </button>
  );

  return (
    <div className="gp-root">
      <div className="gp-chips">
        {chips.map((c) => (
          <span key={c.raw} className="gp-pill">
            {c.label}
            <button type="button" aria-label={`Remove ${c.label}`} onClick={() => onChange(value.filter((x) => x !== c.raw))}>✕</button>
          </span>
        ))}
        <button ref={triggerRef} type="button" className="gp-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">
          ＋ {multi || chips.length === 0 ? "Genre" : "Change"}
        </button>
      </div>
      {open && createPortal(
        <div className="t-f12">
          <div className="gp-pop" style={{ ...menuStyle }} role="dialog" aria-label="Choose a genre">
            <div className="gp-search">
              <span className="gp-ghost" aria-hidden="true">{ghost}</span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void commit(); } }}
                placeholder="Search genres…"
                aria-label="Search genres"
              />
            </div>
            {helper && <div className="gp-note">{helper}</div>}
            <div className="gp-list">
              {visible.filter((o) => !o.personal).map(renderOpt)}
              {visible.some((o) => o.personal) && <div className="gp-group">Your genres</div>}
              {visible.filter((o) => o.personal).map(renderOpt)}
              {visible.length === 0 && !target && <div className="gp-empty">Nothing matches — keep typing to add your own.</div>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
