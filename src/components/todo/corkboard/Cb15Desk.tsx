/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cb15Desk — the Corkboard's desktop page below its navy header, from 768px up (Corkboard v15, 18 Nov; ref
 * design-refs/corkboard-v15/corkboard-v15.html: `body()`, `pills()`, `wall()`, `pilesH()`, `about()`, `HOW`, and the
 * pop-overs). The phone keeps v2's components (CbToolRow, CbWall, CbPiles, CbMenu) and their layout.
 *
 *   the tool row   Corkboard | Stacks, "Find a note" (its matches marked in the words), the Order menu
 *   the pills      All, a pill per tag with its count, "+ New stack", then any filter as a removable chip; in an open
 *                  stack, the other stacks (drop targets)
 *   the wall       "Pinned to top" then "Everything else", or one "Your notes"; notes take the height of their words
 *                  and are DEALT into columns row-major (lib/corkboard `columnCount` from the wall's own width,
 *                  `dealColumns`); the last tile is "+ New note / or press N"
 *   a note         the words in the typewriter face, cut at LINE_CLAMP with "Read all"; the link chip (seal, name,
 *                  StatusDot and its word for a query); tags; "On your to-do list · <day>"; when it was added; the
 *                  navy pin badge; on hover or keyboard focus, Pin / Change colour / Turn into a task / More
 *   Stacks         one stack per tag A to Z (the newest note's words on top), Loose notes last, a started empty stack
 *                  dashed, "+ Start a stack"; open one to read it on the wall
 *   about          "Who your notes are about": a card per agent (seal, name, agency, count, status, five papers)
 *   day one        three examples with Keep this, the new-note tile, and "What you can do with a note"
 *
 * ⚠️ IT WRITES NOTHING. Every act is a callback to the page, which writes and gives the toast with its Undo.
 * ⚠️ FILTERING HIDES ON THIS PAGE (v2 faded): find, a tag, a figure or an agent leaves only what matches, as the ref.
 * ⚠️ DRAG: within Pinned or within Everything else only (a note never crosses the pinned line), or onto a tag pill /
 *    a stack to file it there. The page turns a reorder into My order.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { NoteColour, UserTask } from "../../../types";
import { NOTE_PAPERS, linkifyBody, paperHex } from "../../../lib/noteboard";
import {
  SORTS, SORT_LABEL, FIGURE_CHIP, columnCount, dealColumns, findPieces, sectionLine, wallSections, dayLabel,
  type BoardSort, type BoardView, type FigureKey, type Pile,
} from "../../../lib/corkboard";
import { StatusDot } from "../../StatusDot";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { CB15_ICON as I } from "./CbHeader";

/* ── what the page hands down ── */
export interface Cb15Link { kind: "agent" | "query" | "manuscript"; initials: string; name: string; status: string | null; word: string | null }
export interface Cb15Agent { id: string; name: string; initials: string; agency: string; status: string | null; word: string | null; notes: UserTask[] }
export interface Cb15DeskProps {
  /** settled: false holds the desk blank while the notes load (never the day-one page, then the board) */
  settled: boolean;
  /** every note, sorted (pinned first) — the unfiltered board */
  board: UserTask[];
  /** the board as the find, the tag, a figure and an agent leave it */
  shown: UserTask[];
  narrowing: boolean;
  view: BoardView;
  onView: (v: BoardView) => void;
  sort: BoardSort;
  onSort: (s: BoardSort) => void;
  find: string;
  onFind: (q: string) => void;
  findRef: React.RefObject<HTMLInputElement | null>;
  /** board pills: tag ids with their counts (any tag), A to Z */
  tags: { id: string; n: number }[];
  tag: string | null;
  onTag: (id: string | null) => void;
  special: FigureKey | null;
  onClearSpecial: () => void;
  about: Cb15Agent | null;
  onAbout: (agentId: string | null) => void;
  aboutRows: Cb15Agent[];
  quiet: boolean;
  stacks: Pile<UserTask>[];
  openStack: string | null;
  onOpenStack: (k: string | null) => void;
  tagLabel: (id: string) => string;
  linkOf: (n: UserTask) => Cb15Link | null;
  added: (n: UserTask) => string;
  fresh: string | null;
  todayYmd: string;
  sundayYmd: string;
  /* acts */
  onNew: () => void;
  onEdit: (n: UserTask) => void;
  onOpenLink: (n: UserTask) => void;
  onPin: (n: UserTask) => void;
  onColour: (n: UserTask, c: NoteColour) => void;
  onTask: (n: UserTask) => void;
  onUntask: (n: UserTask) => void;
  onFrontBack: (n: UserTask, where: "front" | "back") => void;
  onReorder: (from: string, before: string) => void;
  onStack: (n: UserTask, k: string) => void;
  onNewStack: (n: UserTask | null) => void;
  onRemove: (n: UserTask) => void;
  onKeep: (i: number) => void;
  examples: readonly { body: string; paper: NoteColour }[];
}

const nNotes = (n: number) => `${n} ${n === 1 ? "note" : "notes"}`;

/** The words, linkified by the app's one linkifier, with the find's matches marked. */
function words(text: string, q: string): React.ReactNode {
  const nodes = linkifyBody(text);
  return nodes.map((node, i) => {
    if (typeof node !== "string") return <React.Fragment key={i}>{node}</React.Fragment>;
    return <React.Fragment key={i}>{findPieces(node, q).map((p, j) => (p.hit ? <mark key={j}>{p.t}</mark> : <React.Fragment key={j}>{p.t}</React.Fragment>))}</React.Fragment>;
  });
}

/** The section heading (`.h2`): an optional lead (the back button), the title, the italic line. */
const H2: React.FC<{ cls?: string; t: React.ReactNode; p?: React.ReactNode; lead?: React.ReactNode; probe?: string }> = ({ cls = "", t, p, lead, probe }) => (
  <div className={`cb15-h2 ${cls}`} data-cb15={probe}>{lead}<h2>{t}</h2>{p !== undefined ? <p>{p}</p> : null}</div>
);

/* ══ the pop-overs (`.pop`): Change colour and More. Portalled, fixed to their button; Escape, a press outside and a
   scroll of 40px close them; the first item takes the focus and focus returns to the button. ══ */
const Pop: React.FC<{ anchor: HTMLElement; label: string; onClose: (back: boolean) => void; children: React.ReactNode; probe: string }> = ({ anchor, label, onClose, children, probe }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    const r = anchor.getBoundingClientRect();
    let top = r.bottom + 6;
    if (top + d.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - d.offsetHeight - 6);
    setPos({ left: Math.max(8, Math.min(window.innerWidth - 236, r.right - 228)), top });
  }, [anchor]);
  useEffect(() => { if (pos) ref.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [pos !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  useEscapeLayer(true, () => onClose(true), ESC_LEVEL.dialMenu ?? ESC_LEVEL.pageModal);
  useEffect(() => {
    const y0 = window.scrollY;
    const scroller = anchor.closest(".wpg-scroll") as HTMLElement | null;
    const s0 = scroller?.scrollTop ?? 0;
    const down = (e: PointerEvent) => { const t = e.target as Node; if (ref.current?.contains(t) || anchor.contains(t)) return; onClose(false); };
    const scroll = () => { if (Math.abs(window.scrollY - y0) > 40 || Math.abs((scroller?.scrollTop ?? 0) - s0) > 40) onClose(false); };
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("scroll", scroll, { passive: true, capture: true });
    window.addEventListener("resize", () => onClose(false), { once: true });
    return () => { document.removeEventListener("pointerdown", down, true); window.removeEventListener("scroll", scroll, true); };
  }, [anchor, onClose]);
  const keys = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const b = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    if (!b.length) return;
    const i = b.indexOf(document.activeElement as HTMLButtonElement);
    b[(i + (e.key === "ArrowDown" ? 1 : -1) + b.length) % b.length].focus();
  };
  return createPortal(
    <div ref={ref} className="cb15-layer cb15-pop" role="menu" aria-label={label} data-cb15={probe} onKeyDown={keys}
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0, visibility: "hidden" }}>
      {children}
    </div>,
    document.body,
  );
};

/* ══ the desk ══ */
export const Cb15Desk: React.FC<Cb15DeskProps> = (p) => {
  const wallRef = useRef<HTMLDivElement | null>(null);
  const [cols, setCols] = useState(4);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const [pop, setPop] = useState<{ kind: "colour" | "more"; id: string; anchor: HTMLElement } | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  /* the dragged note, set SYNCHRONOUSLY on dragstart: the state above only fades it (a beat later, as the ref), and a
     fast drag can reach its first dragover before that state lands */
  const dragRef = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null); // a note id, or "tag:<k>" for a pill / stack
  const closePop = React.useCallback((back: boolean) => { setPop((x) => { if (x && back) x.anchor.focus(); return null; }); }, []);

  /* the column count from the wall's own width, re-read as it changes */
  useLayoutEffect(() => {
    const el = wallRef.current;
    if (!el) return undefined;
    const put = () => setCols(columnCount(el.clientWidth));
    put();
    const ro = new ResizeObserver(put);
    ro.observe(el);
    return () => ro.disconnect();
  }, [p.settled, p.board.length === 0]);

  /* the tool row sticks at the collapsed bar's foot: READ off the bar (its sticky top plus its height), never a constant */
  const deskRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const desk = deskRef.current;
    const slim = desk?.closest(".cb2-page")?.querySelector<HTMLElement>('[data-wsnh="slim"]');
    if (!desk || !slim) return undefined;
    const put = () => desk.style.setProperty("--cb15-stick", `${(parseFloat(getComputedStyle(slim).top) || 0) + slim.offsetHeight}px`);
    put();
    const ro = new ResizeObserver(put);
    ro.observe(slim);
    return () => ro.disconnect();
  }, [p.settled, p.board.length === 0]);

  /* "Read all" shows only where the words are actually cut: measured after every render, and once the fonts land */
  useLayoutEffect(() => {
    const root = wallRef.current?.parentElement;
    if (!root) return;
    for (const b of Array.from(root.querySelectorAll<HTMLElement>(".cb15-nbody.cb15-clamp"))) {
      const btn = b.nextElementSibling as HTMLElement | null;
      if (btn?.classList.contains("cb15-readall")) btn.hidden = !(b.scrollHeight > b.clientHeight + 2);
    }
  });
  const [, bump] = useState(0);
  useEffect(() => { void document.fonts?.ready.then(() => bump((x) => x + 1)); }, []);

  /* the Order menu: closes on a press outside and on Escape */
  useEffect(() => {
    if (!sortOpen) return undefined;
    const down = (e: PointerEvent) => { if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false); };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [sortOpen]);
  useEscapeLayer(sortOpen, () => { setSortOpen(false); sortRef.current?.querySelector("button")?.focus(); }, ESC_LEVEL.dialMenu ?? ESC_LEVEL.pageModal);

  const byId = (id: string) => p.board.find((n) => n.id === id);
  const endDrag = () => { dragRef.current = null; setDrag(null); setOver(null); document.body.classList.remove("cb15-dragging"); };
  const dropTarget = (k: string) => ({
    "data-drop": k,
    onDragOver: (e: React.DragEvent) => {
      const d = dragRef.current ? byId(dragRef.current) : undefined;
      if (!d || (d.tags?.[0] ?? "") === k) return;
      e.preventDefault();
      if (over !== `tag:${k}`) setOver(`tag:${k}`);
    },
    onDragLeave: () => setOver((o) => (o === `tag:${k}` ? null : o)),
    onDrop: (e: React.DragEvent) => {
      const d = dragRef.current ? byId(dragRef.current) : undefined;
      e.preventDefault();
      endDrag();
      if (d && (d.tags?.[0] ?? "") !== k) p.onStack(d, k);
    },
  });

  /* ── one note ── */
  const note = (n: UserTask) => {
    const link = p.linkOf(n);
    const hex = paperHex(n.colour);
    const isOver = over === n.id;
    return (
      <div key={n.id} className={`cb15-note${p.fresh === n.id ? " cb15-new" : ""}${drag === n.id ? " cb15-drag" : ""}${isOver ? " cb15-dt" : ""}`}
        tabIndex={0} draggable data-cb15-note={n.id} data-pinned={n.pinned ? "" : undefined} style={{ ["--c" as string]: hex }}
        aria-label={`Note: ${n.text.slice(0, 60)}`}
        onClick={(e) => { if ((e.target as HTMLElement).closest("button, a")) return; p.onEdit(n); }}
        onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) { e.preventDefault(); p.onEdit(n); } }}
        onDragStart={(e) => {
          setPop(null);
          dragRef.current = n.id;
          e.dataTransfer.effectAllowed = "move";
          try { e.dataTransfer.setData("text/plain", n.id); } catch { /* some browsers refuse */ }
          window.setTimeout(() => { setDrag(n.id); document.body.classList.add("cb15-dragging"); }, 0);
        }}
        onDragEnd={endDrag}
        onDragOver={(e) => {
          const d = dragRef.current ? byId(dragRef.current) : undefined;
          if (!d || d.id === n.id || !!d.pinned !== !!n.pinned || p.view === "piles") return;
          e.preventDefault();
          if (over !== n.id) setOver(n.id);
        }}
        onDragLeave={() => setOver((o) => (o === n.id ? null : o))}
        onDrop={(e) => {
          const d = dragRef.current ? byId(dragRef.current) : undefined;
          if (!d || d.id === n.id || !!d.pinned !== !!n.pinned || p.view === "piles") return;
          e.preventDefault();
          endDrag();
          p.onReorder(d.id, n.id);
        }}>
        <div className="cb15-paper">
          <div className="cb15-nbody cb15-clamp">{words(n.text + (n.detail ? `\n${n.detail}` : ""), p.find)}</div>
          <button type="button" className="cb15-readall" hidden data-cb15="read-all" onClick={() => p.onEdit(n)}>Read all</button>
          <div className="cb15-nfoot">
            {link ? (
              <>
                <button type="button" className="cb15-lchip" data-cb15="link" data-kind={link.kind} title={link.word ?? undefined} onClick={() => p.onOpenLink(n)}>
                  <i className={link.kind === "manuscript" ? "cb15-ms" : undefined} aria-hidden="true">{link.initials}</i>
                  <span className="cb15-nm">{link.name}</span>
                  {link.status ? <span className="cb15-sd"><StatusDot status={link.status} overrideSize={16} tone="inherit" decorative /><span>{link.word}</span></span> : null}
                </button>
                <span className="cb15-w100" />
              </>
            ) : null}
            {(n.tags ?? []).map((t) => <span key={t} className="cb15-ntag">#{words(p.tagLabel(t), p.find)}</span>)}
            {n.dueDate ? <span className="cb15-ntodo" data-cb15="on-todo">{I.tick}{`On your to-do list · ${dayLabel(n.dueDate)}`}</span> : null}
            <span className="cb15-nwhen">{p.added(n)}</span>
          </div>
        </div>
        {n.pinned ? <span className="cb15-npin" title="Pinned to top" data-cb15="pin-badge">{I.pin}</span> : null}
        <div className={`cb15-nacts${pop?.id === n.id ? " cb15-open" : ""}`} data-cb15="acts">
          <button type="button" className={n.pinned ? "cb15-on" : undefined} aria-label={n.pinned ? "Unpin" : "Pin to top"} data-act="pin" draggable={false}
            onClick={() => p.onPin(n)}>{I.pin}</button>
          <button type="button" aria-label="Change colour" data-act="colour" aria-haspopup="menu" aria-expanded={pop?.id === n.id && pop.kind === "colour"} draggable={false}
            onClick={(e) => { const a = e.currentTarget; setPop((x) => (x?.id === n.id && x.kind === "colour" ? null : { kind: "colour", id: n.id, anchor: a })); }}>{I.col}</button>
          <button type="button" className={n.dueDate ? "cb15-on" : undefined} aria-label={n.dueDate ? "Take off your to-do list" : "Turn into a task"} data-act="task" draggable={false}
            onClick={() => (n.dueDate ? p.onUntask(n) : p.onTask(n))}>{I.todo}</button>
          <button type="button" aria-label="More" data-act="more" aria-haspopup="menu" aria-expanded={pop?.id === n.id && pop.kind === "more"} draggable={false}
            onClick={(e) => { const a = e.currentTarget; setPop((x) => (x?.id === n.id && x.kind === "more" ? null : { kind: "more", id: n.id, anchor: a })); }}>{I.more}</button>
        </div>
      </div>
    );
  };
  const ghost = (
    <button key="__ghost" type="button" className="cb15-ghost" data-cb15="ghost-new" onClick={p.onNew}>
      <span>+ New note<small>or press N</small></span>
    </button>
  );
  const wall = (items: React.ReactNode[], probe: string) => (
    <div className="cb15-wall" data-cb15={probe} data-cols={cols}>
      {dealColumns(items, cols).map((c, i) => <div key={i} className="cb15-wcol">{c}</div>)}
    </div>
  );

  /* ── the pop-overs' contents ── */
  const popNote = pop ? byId(pop.id) : undefined;
  const popNode = pop && popNote ? (
    <Pop anchor={pop.anchor} label={pop.kind === "colour" ? "Change colour" : "More"} onClose={closePop} probe={pop.kind === "colour" ? "colour-pop" : "more-pop"}>
      {pop.kind === "colour" ? (
        <>
          <h6>Paper</h6>
          <div className="cb15-sws">
            {NOTE_PAPERS.map((x) => (
              <button key={x.v} type="button" role="menuitemradio" aria-checked={paperHex(popNote.colour) === x.hex} aria-label={x.name} data-paper={x.v}
                className={paperHex(popNote.colour) === x.hex ? "cb15-on" : undefined} style={{ ["--c" as string]: x.hex, background: x.hex }}
                onClick={() => { closePop(false); p.onColour(popNote, x.v); }} />
            ))}
          </div>
        </>
      ) : (
        <>
          <button type="button" role="menuitem" data-m="edit" onClick={() => { closePop(false); p.onEdit(popNote); }}>{I.edit}Edit</button>
          {popNote.pinned ? null : (
            <>
              <button type="button" role="menuitem" data-m="front" onClick={() => { closePop(false); p.onFrontBack(popNote, "front"); }}>{I.up}Move to front</button>
              <button type="button" role="menuitem" data-m="back" onClick={() => { closePop(false); p.onFrontBack(popNote, "back"); }}>{I.down}Move to back</button>
            </>
          )}
          <hr />
          <h6>Move to stack</h6>
          {p.stacks.filter((s) => s.k && s.k !== (popNote.tags?.[0] ?? "")).map((s) => (
            <button key={s.k} type="button" role="menuitem" data-m="stack" data-k={s.k} onClick={() => { closePop(false); p.onStack(popNote, s.k); }}>#{p.tagLabel(s.k)}</button>
          ))}
          {popNote.tags?.[0] ? <button type="button" role="menuitem" data-m="stack" data-k="" onClick={() => { closePop(false); p.onStack(popNote, ""); }}>Loose notes</button> : null}
          <button type="button" role="menuitem" data-m="newstack" onClick={() => { closePop(false); p.onNewStack(popNote); }}>New stack…</button>
          <hr />
          <button type="button" role="menuitem" data-m="remove" onClick={() => { closePop(false); p.onRemove(popNote); }}>{I.bin}Remove</button>
        </>
      )}
    </Pop>
  ) : null;

  /* ── loading: a blank desk, never day one and then the board ── */
  if (!p.settled) return <div className="cb15-desk" data-cb15="desk" data-loading="" style={{ minHeight: 400 }} />;

  /* ── day one ── */
  if (p.board.length === 0) {
    return (
      <div className="cb15-desk" data-cb15="desk" data-state="day-one">
        <H2 cls="cb15-first" t="A few to get you going" p="General querying advice to start your board. Keep any you like, or write your own." probe="day-one" />
        <div ref={wallRef}>
          {wall([
            ...p.examples.map((e, i) => (
              <div key={`ex${i}`} className="cb15-note" data-cb15-example={i} style={{ ["--c" as string]: paperHex(e.paper) }}>
                <div className="cb15-paper">
                  <span className="cb15-extag">Example</span>
                  <div className="cb15-nbody" style={{ paddingRight: 64 }}>{e.body}</div>
                  <div className="cb15-nfoot"><button type="button" className="cb15-keep" data-cb15="keep" onClick={() => p.onKeep(i)}>Keep this</button></div>
                </div>
              </div>
            )),
            ghost,
          ], "wall")}
        </div>
        <How sundayYmd={p.sundayYmd} />
      </div>
    );
  }

  /* ── the tool row and the pills ── */
  const stacksView = p.view === "piles";
  const chips = (
    <>
      {p.special ? <button type="button" className="cb15-pill cb15-f" data-clear="special" onClick={p.onClearSpecial}>{FIGURE_CHIP[p.special]}<i aria-hidden="true">×</i></button> : null}
      {p.about ? <button type="button" className="cb15-pill cb15-f" data-clear="about" onClick={() => p.onAbout(null)}>{`About ${p.about.name}`}<i aria-hidden="true">×</i></button> : null}
    </>
  );
  let pills: React.ReactNode = null;
  if (!stacksView) {
    pills = (
      <>
        <button type="button" className={`cb15-pill${p.tag === null ? " cb15-on" : ""}`} aria-pressed={p.tag === null} data-tag="" onClick={() => p.onTag(null)}>All<em>{p.board.length}</em></button>
        {p.tags.map((t) => (
          <button key={t.id} type="button" className={`cb15-pill${p.tag === t.id ? " cb15-on" : ""}${over === `tag:${t.id}` ? " cb15-drop" : ""}`} aria-pressed={p.tag === t.id}
            data-tag={t.id} {...dropTarget(t.id)} onClick={() => p.onTag(p.tag === t.id ? null : t.id)}>#{p.tagLabel(t.id)}<em>{t.n}</em></button>
        ))}
        <button type="button" className="cb15-pill cb15-add" data-cb15="new-stack" onClick={() => p.onNewStack(null)}>+ New stack</button>
        {chips}
        {p.tags.length ? <span className="cb15-hint">Drag a note onto a tag to file it there</span> : null}
      </>
    );
  } else if (p.openStack !== null) {
    pills = (
      <>
        {p.stacks.filter((s) => s.k && s.k !== p.openStack).map((s) => (
          <button key={s.k} type="button" className={`cb15-pill${over === `tag:${s.k}` ? " cb15-drop" : ""}`} data-open={s.k} {...dropTarget(s.k)}
            onClick={() => p.onOpenStack(s.k)}>#{p.tagLabel(s.k)}<em>{s.notes.length}</em></button>
        ))}
        {chips}
        <span className="cb15-hint">Drag a note onto another stack to move it</span>
      </>
    );
  } else if (p.special || p.about) pills = chips;

  const toolRow = (
    <div className="cb15-tb" data-cb15="tools">
      <div className="cb15-vsw" role="tablist" aria-label="View">
        <button type="button" role="tab" className={!stacksView ? "cb15-on" : undefined} aria-selected={!stacksView} data-view="board" onClick={() => p.onView("board")}>{I.board}Corkboard</button>
        <button type="button" role="tab" className={stacksView ? "cb15-on" : undefined} aria-selected={stacksView} data-view="piles" onClick={() => p.onView("piles")}>{I.stack}Stacks</button>
      </div>
      <label className="cb15-find">
        {I.find}
        <input ref={p.findRef as React.RefObject<HTMLInputElement>} value={p.find} placeholder="Find a note" aria-label="Find a note" autoComplete="off" data-cb15="find"
          onChange={(e) => p.onFind(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape" && p.find) { e.preventDefault(); e.stopPropagation(); p.onFind(""); } }} />
        <kbd className="cb15-kbd">/</kbd>
      </label>
      <span className="cb15-gap" />
      <div className="cb15-dd" ref={sortRef}>
        <button type="button" aria-haspopup="true" aria-expanded={sortOpen} data-cb15="order" onClick={() => setSortOpen((o) => !o)}>
          <small>Order</small><b>{SORT_LABEL[p.sort]}</b><span aria-hidden="true">⌄</span>
        </button>
        {sortOpen ? (
          <div className="cb15-mn" role="menu" data-cb15="order-menu">
            {SORTS.map((s) => (
              <button key={s} type="button" role="menuitemradio" aria-checked={p.sort === s} className={p.sort === s ? "cb15-on" : undefined} data-sort={s}
                onClick={() => { p.onSort(s); setSortOpen(false); }}>
                {p.sort === s ? "✓ " : ""}{SORT_LABEL[s]}{s === "mine" ? <small>Drag notes to set it</small> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  /* ── the wall, the open stack, or the stacks ── */
  const total = p.board.length;
  const of = p.narrowing || stacksView ? total : null;
  let body: React.ReactNode;
  const clearAll = () => { p.onFind(""); p.onTag(null); p.onClearSpecial(); p.onAbout(null); };
  if (stacksView && p.openStack === null && !p.narrowing) {
    body = (
      <>
        <H2 cls="cb15-first" t="Your stacks" p="Each stack is a tag. Open one to read it." probe="stacks" />
        <div className="cb15-piles" data-cb15="piles">
          {p.stacks.map((s) => {
            const l = s.notes;
            const k = s.k;
            return (
              <button key={k || "__loose"} type="button" className={`cb15-pile${over === `tag:${k}` ? " cb15-drop" : ""}`} data-open={k} {...dropTarget(k)}
                aria-label={`${k ? `#${p.tagLabel(k)}` : "Loose notes"}, ${nNotes(l.length)}`} onClick={() => p.onOpenStack(k)}>
                <div className={`cb15-stack${l.length ? "" : " cb15-empty"}`}>
                  {l.length > 2 ? <i style={{ ["--c" as string]: paperHex(l[2].colour) }} /> : null}
                  {l.length > 1 ? <i className={l.length === 2 ? "cb15-only" : undefined} style={{ ["--c" as string]: paperHex(l[1].colour) }} /> : null}
                  {l.length ? <span style={{ ["--c" as string]: paperHex(l[0].colour) }}><span>{l[0].text}</span></span>
                    : <span>Nothing here yet.<br />Drag a note in.</span>}
                </div>
                <div className="cb15-plab"><b>{k ? `#${p.tagLabel(k)}` : "Loose notes"}</b><em>{nNotes(l.length)}</em></div>
              </button>
            );
          })}
          <button type="button" className="cb15-pile cb15-gh" data-cb15="start-stack" onClick={() => p.onNewStack(null)}>
            <div className="cb15-stack"><span>+ Start a stack</span></div>
            <div className="cb15-plab"><em>Name it and add notes</em></div>
          </button>
        </div>
      </>
    );
  } else {
    const list = p.shown;
    const { pinned, rest } = wallSections(list);
    const head: React.ReactNode[] = [];
    if (stacksView) {
      const name = p.openStack === null ? "Across your stacks" : p.openStack ? `#${p.tagLabel(p.openStack)}` : "Loose notes";
      head.push(<H2 key="h" cls="cb15-first" t={name} probe="stack-open"
        p={`${nNotes(list.length)}${p.openStack === "" ? " with no tag" : ""}`}
        lead={<button type="button" className="cb15-back" data-cb15="all-stacks" onClick={() => { p.onOpenStack(null); clearAll(); }}>{I.back}All stacks</button>} />);
    }
    if (!list.length) {
      const emptyStack = stacksView && p.openStack !== null && !p.narrowing;
      body = (
        <>
          {head}
          {stacksView ? null : <H2 cls="cb15-first" t="Your notes" p={`0${of !== null ? ` of ${of}` : ""} notes`} />}
          {emptyStack ? (
            <div className="cb15-none" data-cb15="stack-empty"><b>Nothing in this stack yet</b>Drag a note onto it, or pick this stack when you write one. <button type="button" onClick={p.onNew}>Write a note for it</button></div>
          ) : (
            <div className="cb15-none" data-cb15="no-match"><b>No notes match</b>Nothing on your board fits that. <button type="button" onClick={clearAll}>Show all notes</button></div>
          )}
        </>
      );
    } else if (stacksView) {
      body = <>{head}{wall([...list.map(note), ghost], "wall")}</>;
    } else if (pinned.length) {
      body = (
        <>
          <H2 cls="cb15-first" t="Pinned to top" p={pinned.length === 1 ? "It stays first, whatever the order." : "They stay first, whatever the order."} probe="sec-pinned" />
          {wall(pinned.map(note), "wall-pinned")}
          <H2 cls="cb15-next" t="Everything else" p={sectionLine(rest.length, of, p.sort)} probe="sec-rest" />
          {wall([...rest.map(note), ghost], "wall")}
        </>
      );
    } else {
      body = (
        <>
          <H2 cls="cb15-first" t="Your notes" p={sectionLine(rest.length, of, p.sort)} probe="sec-all" />
          {wall([...rest.map(note), ghost], "wall")}
        </>
      );
    }
  }

  return (
    <div ref={deskRef} className="cb15-desk" data-cb15="desk" data-state={stacksView ? (p.openStack === null ? "stacks" : "stack-open") : "board"}>
      {toolRow}
      {pills ? <div className="cb15-pills" data-cb15="pills">{pills}</div> : null}
      <div ref={wallRef} data-cb15="board">{body}</div>
      {p.quiet ? <How sundayYmd={p.sundayYmd} /> : !stacksView && p.aboutRows.length ? (
        <>
          <H2 t="Who your notes are about" p="Notes you’ve linked to an agent or a query. Pick a name to see only theirs." probe="about-head" />
          <div className="cb15-abs" data-cb15="about">
            {p.aboutRows.map((a) => {
              const on = p.about?.id === a.id;
              return (
                <button key={a.id} type="button" className={`cb15-ab${on ? " cb15-on" : ""}`} aria-pressed={on} data-about={a.id} onClick={() => p.onAbout(on ? null : a.id)}>
                  <span className="cb15-mono" aria-hidden="true">{a.initials}</span>
                  <span className="cb15-who"><b>{a.name}</b><em>{a.agency}</em></span>
                  <span className="cb15-cnt" data-cb15="about-count">{a.notes.length}<small>{a.notes.length === 1 ? "note" : "notes"}</small></span>
                  <span className="cb15-ln">
                    {a.status ? <span className="cb15-sw15" data-cb15="about-status"><StatusDot status={a.status} overrideSize={18} tone="inherit" decorative /><span>{a.word}</span></span> : null}
                    <span className="cb15-ms" aria-hidden="true">{a.notes.slice(0, 5).map((n) => <i key={n.id} style={{ ["--c" as string]: paperHex(n.colour) }} />)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
      {popNode}
    </div>
  );
};

/* ══ "What you can do with a note" (`.how`), the ref's copy ══ */
const How: React.FC<{ sundayYmd: string }> = ({ sundayYmd }) => (
  <>
    <H2 t="What you can do with a note" p="" probe="how-head" />
    <div className="cb15-how" data-cb15="how">
      <div>
        <div className="cb15-demo">
          <span className="cb15-lchip" style={{ boxShadow: "inset 0 0 0 1px #d9d0c3" }}>
            <i aria-hidden="true">CB</i><span className="cb15-nm">Clara Beaumont</span>
            <span className="cb15-sd"><StatusDot status="Partial Requested" overrideSize={16} tone="inherit" decorative /><span>Partial Requested</span></span>
          </span>
        </div>
        <h3>Say who it’s about</h3>
        <p>Link a note to an agent or a query and it carries their name. Later you can pull up everything you’ve noted about them.</p>
      </div>
      <div>
        <div className="cb15-demo">
          <div className="cb15-dstack" aria-hidden="true">
            <i style={{ background: "#e2e7ef", left: 14, top: 8 }} /><i style={{ background: "#f5e2d8", left: 7, top: 4 }} /><i style={{ background: "#faf0cf", left: 0, top: 0 }} />
          </div>
        </div>
        <h3>Sort notes into stacks</h3>
        <p>Give a note a tag, like #letter or #comps, and it joins that stack. Switch to Stacks to see them together.</p>
      </div>
      <div>
        <div className="cb15-demo"><span className="cb15-ntodo">{I.tick}{`On your to-do list · ${dayLabel(sundayYmd)}`}</span></div>
        <h3>Turn a note into a task</h3>
        <p>Pick a week and the note goes on your to-do list. It stays here too, so you don’t lose the detail.</p>
      </div>
    </div>
  </>
);
