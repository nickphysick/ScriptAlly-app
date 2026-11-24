/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SearchDesk — ⌘K search at 768px and wider (search v1, ref design-refs/search-v1/search-v1.html `#pal`). The ink band,
 * the scope chips, a fixed-height body of list and (sheet ≥1180px) peek, and the footer. The phone keeps its own
 * palette in SearchPalette; the matching for both is lib/searchPalette.
 *
 * ⚠️ FOCUS NEVER LEAVES THE INPUT. Chips are not Tab stops (Tab moves the scope); a mousedown in the list or the peek
 * is prevented, so a click opens without blurring the field.
 * ⚠️ THE SELECTION FOLLOWS THE POINTER ONLY AFTER IT RESTS (110ms), so crossing rows on the way to the peek's buttons
 * does not change what the peek shows. Hover tints at once.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, HelpCircle, LayoutGrid, ListChecks, Mail, MessageSquare, Package, Reply, Send,
  Settings, StickyNote, Upload, UserPlus,
} from "lucide-react";
import { FeedIcon } from "../shared/FeedIcon";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";
import { STAGE_COLOURS, bandInk, stageOf, statusBand } from "../../lib/stageColours";
import { kindTileStyle } from "../../lib/kindColours";
import {
  GROUP_LABEL, PaletteItem, PaletteResult, PaletteRow, PaletteScope, SCOPE_CHIPS, highlightParts, isSelectable,
  secondLineParts, type HighlightPart, type PeekFact,
} from "../../lib/searchPalette";
import { initialsOf } from "../../lib/searchSuggestionsCore";
import { SHORTCUTS, isMac, keycaps, matchesShortcut } from "../../lib/shortcuts";
import "./searchV1.css";

/** The pointer must rest this long on a row before the selection (and the peek) follows it. */
export const DWELL_MS = 110;

const ID_ICON: Record<string, React.ReactNode> = {
  "act:query": <Send aria-hidden="true" />,
  "act:record": <Reply aria-hidden="true" />,
  "act:agent": <UserPlus aria-hidden="true" />,
  "act:import": <Upload aria-hidden="true" />,
  "act:feedback": <MessageSquare aria-hidden="true" />,
  /* feed wording v1.1: the feed's own "manuscript added" drawing, so search and the feed match */
  "act:manuscript": <FeedIcon kind="manuscript_added" bare />,
  "made:new-agent": <UserPlus aria-hidden="true" />,
  "page:account": <Settings aria-hidden="true" />,
  "page:task-settings": <Settings aria-hidden="true" />,
  "page:help": <HelpCircle aria-hidden="true" />,
};

/** What ↵ is called on each kind of row — the peek's filled button. */
function primaryLabel(it: PaletteItem): string {
  switch (it.kind) {
    case "agent": return "Open agent";
    case "query": return "Open query";
    case "task": return "Open task";
    case "note": return "Open on the Corkboard";
    case "material": return it.materialKind === "package" ? "Open package" : "Open query letter";
    case "action": return "Start";
    case "page": return `Go to ${it.title}`;
    case "help": return "Read";
  }
}

/** The one plain line the peek says about an action: what opening it does today (SearchPalette's perform). */
const ACTION_SAYS: Record<string, string> = {
  "act:query": "Opens Log a query.",
  "act:record": "Opens Record a response, starting with who replied.",
  "act:agent": "Opens a new agent card over this page.",
  "act:import": "Opens Import.",
  "act:feedback": "Opens the Give feedback panel.",
  "act:manuscript": "You can keep one manuscript during the beta. More are coming.",
  "made:new-agent": "Opens a new agent card over this page, with the name filled in.",
  "made:help-find": "Opens the Help centre.",
};

const Marked: React.FC<{ parts: HighlightPart[] }> = ({ parts }) => (
  <>{parts.map((p, j) => (p.match ? <mark key={j}>{p.text}</mark> : <React.Fragment key={j}>{p.text}</React.Fragment>))}</>
);

/** The status chip: the status's band (Plumage colours v1; no outline on a chip), its stage's edge, the real StatusDot, and the status in words. */
const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const st = stageOf(status);
  return (
    <span className="sv1-chip" data-stage={st} style={{ background: statusBand(status), color: bandInk(status), borderColor: STAGE_COLOURS[st].edge }}>
      <StatusDot status={status as QueryStatus} overrideSize={14} tone="inherit" decorative />
      {status}
    </span>
  );
};

/** The 32px tile (44px in the peek), by kind. */
const Tile: React.FC<{ it: PaletteItem; big?: boolean; pageIcon?: (path: string) => React.ReactNode | null }> = ({ it, big, pageIcon }) => {
  const cls = `sv1-tile${big ? " sv1-tile--big" : ""}`;
  /* Plumage colours v1 — the four kind tiles (lib/kindColours): an agent's initials in ink on the Scout's teal; a query
     the paper with its status mark in ink (the status itself is the chip's, never the tile's) */
  if (it.kind === "agent") return <span className={cls} data-tile="agent" style={kindTileStyle("agent")}>{initialsOf(it.title)}</span>;
  if (it.kind === "query" && it.status) {
    return (
      <span className={cls} data-tile="query" style={kindTileStyle("query")}>
        <StatusDot status={it.status as QueryStatus} overrideSize={big ? 22 : 16} decorative />
      </span>
    );
  }
  if (it.kind === "note") return <span className={cls} data-tile="note" style={{ background: it.colour }}><StickyNote aria-hidden="true" /></span>;
  if (it.kind === "action") return <span className={cls} data-tile="action">{ID_ICON[it.id] ?? <Send aria-hidden="true" />}</span>;
  if (it.kind === "page") {
    const icon = (it.run.kind === "path" ? pageIcon?.(it.run.path) : null) ?? ID_ICON[it.id] ?? <LayoutGrid aria-hidden="true" />;
    return <span className={cls} data-tile="page">{icon}</span>;
  }
  if (it.kind === "task") return <span className={cls} data-tile="task" style={kindTileStyle("task")}><ListChecks aria-hidden="true" /></span>;
  if (it.kind === "material") return <span className={cls} data-tile="material" style={kindTileStyle("material")}>{it.materialKind === "package" ? <Package aria-hidden="true" /> : <Mail aria-hidden="true" />}</span>;
  return <span className={cls} data-tile="help"><HelpCircle aria-hidden="true" /></span>;
};

const Facts: React.FC<{ facts: PeekFact[] }> = ({ facts }) => (
  <div className="sv1-facts">
    {facts.map((f) => (
      <div key={f.label} className={`sv1-fact${f.wide ? " sv1-fact--wide" : ""}`}>
        <small>{f.label}</small>
        <div>{f.value}{f.line ? <span className="sv1-fact-line">{f.line}</span> : null}</div>
      </div>
    ))}
  </div>
);

export interface SearchDeskProps {
  term: string;
  setTerm: (t: string) => void;
  scope: PaletteScope;
  setScope: (s: PaletteScope) => void;
  result: PaletteResult;
  /** The sheet is 1180px or wider: the peek is drawn. */
  peek: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** ↵ (1) or ⌘↵ (2) on a row. */
  onActivate: (row: PaletteRow, which: 1 | 2) => void;
  onClose: () => void;
  activeManuscriptTitle?: string;
  pageIcon?: (path: string) => React.ReactNode | null;
}

export const SearchDesk: React.FC<SearchDeskProps> = ({
  term, setTerm, scope, setScope, result, peek, inputRef, onActivate, onClose, activeManuscriptTitle, pageIcon,
}) => {
  const { rows, counts, total, toks } = result;
  const listRef = useRef<HTMLDivElement>(null);
  const picks = useMemo(() => rows.map((r, i) => (isSelectable(r) ? i : -1)).filter((i) => i >= 0), [rows]);
  const [sel, setSel] = useState(-1);
  const [hov, setHov] = useState(-1);
  const dwell = useRef<number | undefined>(undefined);
  const mac = isMac();
  const MOD = mac ? "⌘" : "Ctrl";

  /* a new term or scope starts at the first row that can be chosen, at the top of the list */
  useEffect(() => {
    setSel(picks.length ? picks[0] : -1);
    setHov(-1);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(dwell.current), []);

  const selRow = sel >= 0 ? rows[sel] : undefined;
  const selItem = selRow?.type === "item" ? selRow.item : undefined;
  const second = selItem?.second;

  const enabledScopes = useMemo(() => SCOPE_CHIPS.filter((c) => {
    if (!toks.length || c.scope === "all" || c.scope === scope) return true;
    return (counts[c.scope as keyof typeof counts] ?? 0) > 0;
  }).map((c) => c.scope), [toks.length, counts, scope]);

  const move = useCallback((step: 1 | -1) => {
    if (!picks.length) return;
    let k = picks.indexOf(sel);
    k = (k + step + picks.length) % picks.length;
    const next = picks[k];
    setSel(next);
    if (k === 0 && listRef.current) listRef.current.scrollTop = 0;
    else listRef.current?.querySelector<HTMLElement>(`[data-idx="${next}"]`)?.scrollIntoView({ block: "nearest" });
  }, [picks, sel]);

  const cycleScope = useCallback((step: 1 | -1) => {
    const list = enabledScopes;
    let k = list.indexOf(scope);
    if (k < 0) k = 0; /* a scope with no chip (Show all actions or pages) steps from Everything */
    setScope(list[(k + step + list.length) % list.length]);
  }, [enabledScopes, scope, setScope]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      /* Esc clears the words first; a second Esc closes (Nick's ruling, as the Queries page does) */
      if (term) setTerm(""); else onClose();
      return;
    }
    if (matchesShortcut(SHORTCUTS.searchScope, e)) { e.preventDefault(); cycleScope(e.shiftKey ? -1 : 1); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); move(e.key === "ArrowDown" ? 1 : -1); return; }
    if (matchesShortcut(SHORTCUTS.searchSecond, e)) { e.preventDefault(); if (selRow && second) onActivate(selRow, 2); return; }
    if (e.key === "Enter") { e.preventDefault(); if (selRow) onActivate(selRow, 1); }
  };

  const hoverRow = (i: number) => {
    if (i !== hov) setHov(i);
    window.clearTimeout(dwell.current);
    if (i === sel) return;
    dwell.current = window.setTimeout(() => setSel(i), DWELL_MS);
  };

  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  const noun = toks.length > 1 ? "those words" : "that word";

  const rowEl = (r: PaletteRow, i: number) => {
    if (r.type === "head") {
      return <div key={`h${i}`} className="sv1-grp" role="presentation">{r.label}{r.count ? <i>{r.count}</i> : null}</div>;
    }
    if (r.type === "none") {
      return r.inScope ? (
        <div key={`n${i}`} className="sv1-none">
          <b>Nothing in {GROUP_LABEL[r.inScope as keyof typeof GROUP_LABEL] ?? r.inScope} for “{r.term}”</b>
          <span>There {r.elsewhere === 1 ? "is 1 match" : `are ${r.elsewhere} matches`} elsewhere.</span>
        </div>
      ) : (
        <div key={`n${i}`} className="sv1-none">
          <b>Nothing matches “{r.term}”</b>
          <span>No agent, query, task or note of yours has {noun}.</span>
        </div>
      );
    }
    const common = {
      id: `sp-row-${i}`, "data-idx": i, role: "option" as const, "aria-selected": i === sel,
      onMouseMove: () => hoverRow(i),
      onClick: () => { window.clearTimeout(dwell.current); setSel(i); onActivate(r, 1); },
    };
    if (r.type === "more") {
      return (
        <div key={`m${i}`} {...common} data-kind={r.type} className={`sv1-row sv1-row--more${i === sel ? " sel" : ""}${i === hov ? " hov" : ""}`}>
          <span className="sv1-tile" data-tile="more"><ArrowRight aria-hidden="true" /></span>
          <span className="sv1-tx"><span className="sv1-t1">{r.label}</span></span>
        </div>
      );
    }
    const it = r.item;
    const second2 = it.id === "act:query" && activeManuscriptTitle ? { parts: [{ text: `for ${activeManuscriptTitle}`, match: false }] } : secondLineParts(it, r.match, toks);
    return (
      <div
        key={`${it.id}-${i}`} {...common}
        data-kind={it.kind} data-id={it.id}
        aria-disabled={it.soon ? true : undefined}
        onMouseMove={it.soon ? undefined : common.onMouseMove}
        onClick={it.soon ? undefined : common.onClick}
        className={`sv1-row${i === sel ? " sel" : ""}${i === hov && !it.soon ? " hov" : ""}${it.soon ? " sv1-row--soon" : ""}`}
      >
        <Tile it={it} pageIcon={pageIcon} />
        <span className="sv1-tx">
          <span className="sv1-t1">{it.made ? it.title : <Marked parts={highlightParts(it.title, toks)} />}</span>
          {second2 && (
            <span className="sv1-t2">{second2.label ? <><em>{second2.label}:</em>{" "}</> : null}<Marked parts={second2.parts} /></span>
          )}
        </span>
        <span className="sv1-rt">
          {it.soon ? <span className="sv1-soon">SOON</span>
            : it.kind === "agent" ? (it.status ? <StatusChip status={it.status} /> : <span>Not queried</span>)
              : it.kind === "query" && it.status ? <StatusChip status={it.status} /> : null}
        </span>
      </div>
    );
  };

  const peekEl = () => {
    if (!selRow) return null;
    if (selRow.type === "more") {
      const name = selRow.scope === "all" ? "Everything" : GROUP_LABEL[selRow.scope];
      const say = "Shows every match here, with nothing held back.";
      return (
        <>
          <div className="sv1-pk-top"><span className="sv1-tile sv1-tile--big" data-tile="more"><ArrowRight aria-hidden="true" /></span><div><div className="sv1-pk-name">{name}</div></div></div>
          <p className="sv1-pk-text">{say}</p>
          <div className="sv1-pk-acts">
            <button type="button" tabIndex={-1} className="sv1-btn sv1-btn--main" onClick={() => onActivate(selRow, 1)}>
              <span>Show them</span><span className="sv1-key">↵</span>
            </button>
          </div>
        </>
      );
    }
    if (selRow.type !== "item") return null;
    const it = selRow.item;
    const p = it.peek;
    const head = (sub?: string) => (
      <div className="sv1-pk-top">
        <Tile it={it} big pageIcon={pageIcon} />
        <div className="sv1-pk-who">
          <div className="sv1-pk-name">{it.kind === "task" ? "Task" : it.kind === "note" ? "Note" : it.title}</div>
          {sub ? <div className="sv1-pk-sub">{sub}</div> : null}
        </div>
      </div>
    );
    let body: React.ReactNode;
    if (p?.kind === "agent") {
      const st = p.status ? stageOf(p.status) : null;
      body = (
        <>
          {head(p.sub)}
          {p.status && st ? (
            <div className="sv1-pk-band" style={{ background: statusBand(p.status), color: bandInk(p.status), borderColor: STAGE_COLOURS[st].edge }}>
              <StatusDot status={p.status as QueryStatus} overrideSize={22} tone="inherit" decorative />
              <div><b>{p.status}</b><span>{p.queriedLine}</span></div>
            </div>
          ) : <div className="sv1-pk-plain">Not queried for {p.manuscript}.</div>}
          <Facts facts={p.facts} />
        </>
      );
    } else if (p?.kind === "query") {
      const st = stageOf(p.status);
      body = (
        <>
          <div className="sv1-pk-band" style={{ background: statusBand(p.status), color: bandInk(p.status), borderColor: STAGE_COLOURS[st].edge }}>
            <StatusDot status={p.status as QueryStatus} overrideSize={22} tone="inherit" decorative />
            <div><b>{p.status}</b><span>{p.who}</span></div>
          </div>
          <Facts facts={p.facts} />
        </>
      );
    } else if (p?.kind === "task") {
      body = <>{head()}<p className="sv1-pk-text sv1-pk-text--task">{p.text}</p><Facts facts={p.facts} /></>;
    } else if (p?.kind === "note") {
      body = <>{head()}<div className="sv1-pk-note" style={{ background: p.colour }}>{p.text}</div></>;
    } else if (p?.kind === "material") {
      body = <>{head(p.sub)}<Facts facts={p.facts} /></>;
    } else if (it.kind === "help") {
      body = <>{head(it.made ? undefined : "Help centre")}<p className="sv1-pk-text">{it.made ? ACTION_SAYS[it.id] : p?.kind === "text" ? p.text : ""}</p></>;
    } else {
      const say = it.kind === "page" ? (it.subtitle ? `${it.subtitle}.` : `Goes to ${it.title}.`) : ACTION_SAYS[it.id] ?? "";
      body = <>{head()}<p className="sv1-pk-text">{say}</p></>;
    }
    return (
      <>
        {body}
        {!it.soon && (
          <div className="sv1-pk-acts">
            <button type="button" tabIndex={-1} className="sv1-btn sv1-btn--main" onClick={() => onActivate(selRow, 1)}>
              <span>{primaryLabel(it)}</span><span className="sv1-key">↵</span>
            </button>
            {it.second && (
              <button type="button" tabIndex={-1} className="sv1-btn" onClick={() => onActivate(selRow, 2)}>
                <span>{it.second.label}</span><span className="sv1-key">{MOD} ↵</span>
              </button>
            )}
          </div>
        )}
      </>
    );
  };

  const live = total === null ? "" : total === 1 ? "1 result" : `${total} results`;
  const secondCaps = keycaps(SHORTCUTS.searchSecond.chords[0], mac).join(" ");

  return (
    <div className={`sv1${peek ? "" : " sv1--nopeek"}`} onKeyDown={onKeyDown}>
      <div className="sv1-in">
        <svg className="sv1-in-ico" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search your agents, queries, tasks and notes"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search"
          role="combobox"
          aria-expanded
          aria-controls="sp-list"
          aria-activedescendant={sel >= 0 ? `sp-row-${sel}` : undefined}
        />
        {term ? (
          <button type="button" className="sv1-clr" tabIndex={-1} onMouseDown={keepFocus} onClick={() => { setTerm(""); inputRef.current?.focus(); }}>Clear</button>
        ) : null}
        <span className="sv1-key sv1-key--ink" aria-hidden="true">esc</span>
      </div>

      <div className="sv1-scopes" role="group" aria-label="Where to look" onMouseDown={keepFocus}>
        {SCOPE_CHIPS.map((c) => {
          const n = c.scope === "all" ? total : counts[c.scope as keyof typeof counts] ?? 0;
          const off = !enabledScopes.includes(c.scope);
          return (
            <button key={c.scope} type="button" tabIndex={-1} className="sv1-scope" data-scope={c.scope}
              aria-pressed={scope === c.scope} disabled={off} onClick={() => { setScope(c.scope); inputRef.current?.focus(); }}>
              {c.label}{toks.length ? <i>{n ?? 0}</i> : null}
            </button>
          );
        })}
        <span className="sv1-hint"><span className="sv1-key">{keycaps(SHORTCUTS.searchScope.chords[0], mac).join(" ")}</span>to narrow</span>
      </div>

      <div className="sv1-body">
        <div className="sv1-list" id="sp-list" role="listbox" aria-label="Results" ref={listRef} onMouseDown={keepFocus}
          onMouseLeave={() => { window.clearTimeout(dwell.current); setHov(-1); }}>
          {rows.map(rowEl)}
        </div>
        {peek && <aside className="sv1-peek" aria-live="polite" onMouseDown={keepFocus}>{peekEl()}</aside>}
      </div>

      <div className="sv1-foot">
        <span><span className="sv1-key">↑</span><span className="sv1-key">↓</span>Move</span>
        <span><span className="sv1-key">↵</span>Open</span>
        {second ? <span><span className="sv1-key">{secondCaps}</span>{second.label}</span> : null}
        <span className="sv1-foot-end"><span className="sv1-key">esc</span>{term ? "Clear" : "Close"}</span>
      </div>
      <div className="sv1-sr" aria-live="polite">{live}</div>
    </div>
  );
};
