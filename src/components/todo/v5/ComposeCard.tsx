/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.1 §F — ADDING (AND EDITING) A TASK, ON THE DESK. A blank card in the desk where the v2 drawer used to
 * open: ✓ Task · ✎ Note, the title, a line more, when it's due and when it comes to the top of the tray (a task), the
 * paper (a note), one optional link, tags.
 *
 * ⚠️ IT WRITES NOTHING ITSELF. `onSave` is the page's, which writes through the existing writers (`addUserTask`, the
 *    note's own colour write, `updateUserTask` when editing) and answers whether it landed. A failed write keeps every
 *    word on the card and says so; nothing is ever half-saved.
 * ⚠️ IT CAPTURES EVERY FIELD THE COMPOSERS BEFORE IT DID — the v2 composer's text, due date and agent, and the full
 *    To-do composer's detail, surface offset and tags — and adds the link a task could always carry (query, agent or
 *    manuscript) and a note's paper. Editing cannot move a link: `updateUserTask` has no link fields, so the card shows
 *    the link and says it stays.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Agent, Manuscript, NoteColour, Query, SurfaceOffset, TagDef, UserTask } from "../../../types";
import { TagPicker } from "../TagPicker";
import { toggleTagSel } from "../../../lib/todoTags";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { TRAY_GROUPS } from "../../../lib/todoTray";
import { QUILL } from "./TrayDesk";
import { MONTHS_SHORT } from "../../../lib/dates";

export type ComposeLink = { kind: "query" | "agent" | "manuscript"; id: string; label: string; sub: string };
export interface ComposeDraft {
  mode: "task" | "note";
  text: string;
  detail: string;
  when: "this" | "next" | "later" | "pick" | null;
  /** the picked day (YYYY-MM-DD), for "pick" */
  date: string | null;
  surface: SurfaceOffset;
  link: ComposeLink | null;
  tags: string[];
  paper: NoteColour;
}
export const BLANK_DRAFT: ComposeDraft = { mode: "task", text: "", detail: "", when: null, date: null, surface: "on-day", link: null, tags: [], paper: "yellow" };

/* ── dates: local days, YYYY-MM-DD ── */
const ymdOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayOf = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const plus = (ymd: string, n: number) => { const d = dayOf(ymd); d.setDate(d.getDate() + n); return ymdOf(d); };
/** the Sunday that ends this week (Monday to Sunday); today, on a Sunday */
export const sundayOf = (todayYmd: string): string => plus(todayYmd, (7 - dayOf(todayYmd).getDay()) % 7);
export const DUE_CHIPS = [
  { k: "this" as const, label: "This week", add: 0 },
  { k: "next" as const, label: "Next week", add: 7 },
  { k: "later" as const, label: "Later", add: 14 },
];
export const dueOf = (d: ComposeDraft, todayYmd: string): string | null => {
  if (d.when === "pick") return d.date;
  const c = DUE_CHIPS.find((x) => x.k === d.when);
  return c ? plus(sundayOf(todayYmd), c.add) : null;
};
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Sun 18 Oct" — the month from the app's one month table (lib/dates) */
export const dayLabel = (ymd: string) => { const d = dayOf(ymd); return `${WD[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
const SURFACE: { v: SurfaceOffset; label: string; say: string; lead: number }[] = [
  { v: "on-day", label: "On the day", say: "on the day", lead: 0 },
  { v: "day-before", label: "A day early", say: "a day early", lead: 1 },
  { v: "week-before", label: "A week early", say: "a week early", lead: 7 },
];
/** the day an own task joins the tray (its due day, less the chosen lead) */
export const surfaceDay = (dueYmd: string, s: SurfaceOffset) => plus(dueYmd, -(SURFACE.find((x) => x.v === s)?.lead ?? 0));

const PAPERS: { v: NoteColour; label: string }[] = [{ v: "yellow", label: "Yellow" }, { v: "pink", label: "Pink" }, { v: "sage", label: "Sage" }];
const PAPER_BG: Record<NoteColour, string> = { yellow: "#f8f0dc", pink: "#f6e2dc", sage: "#e3ebdf" };

/** the inline month calendar: Monday first, past days disabled — and, with `max`, every day after it (a snooze's cap) */
export const MonthCal: React.FC<{ todayYmd: string; value: string | null; onPick: (ymd: string) => void; max?: string | null; min?: string }> = ({ todayYmd, value, onPick, max = null, min }) => {
  const [anchor, setAnchor] = useState(() => { const d = dayOf(value ?? todayYmd); return new Date(d.getFullYear(), d.getMonth(), 1, 12); });
  const first = (anchor.getDay() + 6) % 7;
  const days = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const thisMonth = dayOf(todayYmd);
  const atStart = anchor.getFullYear() === thisMonth.getFullYear() && anchor.getMonth() === thisMonth.getMonth();
  const name = anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return (
    <div className="td5-cal" data-td5="calendar" role="group" aria-label="Pick a date">
      <div className="td5-calm">
        <b>{name}</b>
        <span>
          <button type="button" aria-label="Previous month" disabled={atStart} onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1, 12))}>‹</button>
          <button type="button" aria-label="Next month" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1, 12))}>›</button>
        </span>
      </div>
      <div className="td5-caldw" aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((x, i) => <i key={i}>{x}</i>)}</div>
      <div className="td5-calg">
        {Array.from({ length: first }, (_, i) => <i key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const ymd = ymdOf(new Date(anchor.getFullYear(), anchor.getMonth(), i + 1, 12));
          return (
            <button key={ymd} type="button" data-day={ymd} disabled={ymd < (min ?? todayYmd) || (!!max && ymd > max)} aria-pressed={value === ymd}
              data-today={ymd === todayYmd ? "" : undefined} onClick={() => onPick(ymd)}>{i + 1}</button>
          );
        })}
      </div>
    </div>
  );
};

export interface ComposeCardProps {
  todayYmd: string;
  draft: ComposeDraft;
  setDraft: (d: ComposeDraft) => void;
  /** editing an own task: the task, and the link it already carries (which cannot be moved) */
  edit: UserTask | null;
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  userTags: TagDef[];
  onCreateTag: (t: TagDef) => void;
  /** the page's save; resolves true when the write landed */
  onSave: () => Promise<boolean>;
  onCancel: () => void;
  /** the stamp, once the save has landed: ADDED / PINNED / SAVED */
  stamp: string | null;
}

export const ComposeCard: React.FC<ComposeCardProps> = ({ todayYmd, draft, setDraft, edit, queries, agents, manuscripts, userTags, onCreateTag, onSave, onCancel, stamp }) => {
  const d = draft;
  const isTask = d.mode === "task";
  const due = dueOf(d, todayYmd);
  const can = d.text.trim().length > 0 && (!isTask || !!due);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [cal, setCal] = useState(false);
  const [linking, setLinking] = useState(false);
  const [find, setFind] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const detailRef = useRef<HTMLTextAreaElement>(null);
  const set = (p: Partial<ComposeDraft>) => setDraft({ ...d, ...p });
  const g = TRAY_GROUPS.find((x) => x.id === "mine")!;

  /* focused on open, WITHOUT scrolling the page (the sheet is already where the writer is looking) */
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, []);
  /* the two text fields grow with what is written */
  const grow = (el: HTMLTextAreaElement | null) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } };
  useEffect(() => { grow(titleRef.current); grow(detailRef.current); }, [d.text, d.detail, d.mode]);

  /* Escape, one layer at a time: the calendar or the find list, then the card */
  useEscapeLayer(cal || linking, () => { setCal(false); setLinking(false); }, ESC_LEVEL.pageModal);
  useEscapeLayer(true, () => onCancel(), ESC_LEVEL.page);

  const save = async () => {
    if (!can || busy) return;
    setBusy(true);
    setFailed(false);
    const ok = await onSave();
    setBusy(false);
    if (!ok) setFailed(true);
  };

  const links = useMemo(() => {
    const q = find.trim().toLowerCase();
    const out: ComposeLink[] = [
      ...queries.map((x) => {
        const a = agents.find((y) => y.id === x.agentId);
        const name = (a?.name || a?.agency || "A query").trim();
        return { kind: "query" as const, id: x.id, label: name, sub: [a?.agency, String(x.status)].filter(Boolean).join(" · ") };
      }),
      ...agents.map((a) => ({ kind: "agent" as const, id: a.id, label: (a.name || a.agency || "An agent").trim(), sub: [a.agency, "Agent"].filter(Boolean).join(" · ") })),
      ...manuscripts.map((m) => ({ kind: "manuscript" as const, id: m.id, label: m.title || "A manuscript", sub: "Manuscript" })),
    ];
    return (q ? out.filter((l) => `${l.label} ${l.sub}`.toLowerCase().includes(q)) : out).slice(0, 40);
  }, [find, queries, agents, manuscripts]);

  const surfaceSay = SURFACE.find((x) => x.v === d.surface)?.say ?? "on the day";
  const consequence = isTask
    ? (due ? `Goes into Your tasks, due by ${dayLabel(due)}, and to the top of your tray ${surfaceSay}. Also on your corkboard.` : "Add a title and when it’s due.")
    : "Pinned to your corkboard. It won’t join your tray.";

  return (
    <article className="td5-dcard td5-compose" data-td5="compose" data-mode={d.mode} data-work="">
      <div className="td5-chead" data-td5="desk-head" style={{ background: isTask ? g.tint : PAPER_BG[d.paper], color: g.ink }}>
        <span className="td5-cn">{edit ? (isTask ? "Edit task" : "Edit note") : isTask ? "New task" : "New note"}</span>
        <span className="td5-why">{isTask ? "From you" : "For your corkboard"}</span>
        <span className="td5-sp" />
        {edit ? null : (
          <span className="td5-modeseg" role="group" aria-label="Task or note">
            <button type="button" data-td5="mode-task" aria-pressed={isTask} onClick={() => set({ mode: "task" })}>✓ Task</button>
            <button type="button" data-td5="mode-note" aria-pressed={!isTask} onClick={() => set({ mode: "note" })}>✎ Note</button>
          </span>
        )}
      </div>
      {stamp ? <div className="td5-stamp" data-td5="stamp" data-navy="" aria-hidden="true">{stamp}</div> : null}
      <div className="td5-cbody td5-cmp" data-td5="card-body">
        <textarea ref={titleRef} className="td5-cmp-title" data-note={isTask ? undefined : ""} rows={1} data-td5="compose-title"
          aria-label={isTask ? "What needs doing?" : "Your note"} placeholder={isTask ? "What needs doing?" : "Jot it down…"} value={d.text}
          onChange={(e) => set({ text: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void save(); } }} />
        <textarea ref={detailRef} className="td5-cmp-detail" rows={1} data-td5="compose-detail" aria-label="A little more" placeholder="Add a little more (optional)…"
          value={d.detail} onChange={(e) => set({ detail: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save(); } }} />
        {isTask ? (
          <>
            <div className="td5-q" data-td5="compose-due">
              <div className="td5-qh"><b>When is it due?</b>{due ? <span className="td5-r">Due by {dayLabel(due)}</span> : null}</div>
              <div className="td5-opts">
                {DUE_CHIPS.map((c) => (
                  <button key={c.k} type="button" className="td5-chp" data-when={c.k} aria-pressed={d.when === c.k} onClick={() => { set({ when: c.k }); setCal(false); }}>
                    {c.label}<small>by {dayLabel(plus(sundayOf(todayYmd), c.add))}</small>
                  </button>
                ))}
                <button type="button" className="td5-chp" data-when="pick" aria-pressed={d.when === "pick"} aria-expanded={cal} onClick={() => setCal((o) => !o)}>
                  {d.when === "pick" && d.date ? dayLabel(d.date) : "Pick a date"}
                </button>
              </div>
              {cal ? <MonthCal todayYmd={todayYmd} value={d.date} onPick={(ymd) => { set({ when: "pick", date: ymd }); setCal(false); }} /> : null}
            </div>
            <div className="td5-q" data-td5="compose-surface">
              <div className="td5-qh"><b>When should it come to the top of your tray?</b></div>
              <div className="td5-opts">
                {SURFACE.map((x) => <button key={x.v} type="button" className="td5-chp" data-surf={x.v} aria-pressed={d.surface === x.v} onClick={() => set({ surface: x.v })}>{x.label}</button>)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="td5-jn"><b>No date</b>Notes live on your corkboard. Nothing will chase you, and it won’t join your tray.</div>
            <div className="td5-q" data-td5="compose-paper">
              <div className="td5-qh"><b>Paper</b></div>
              <div className="td5-papers">
                {PAPERS.map((p) => <button key={p.v} type="button" className="td5-paper" data-paper={p.v} aria-pressed={d.paper === p.v} onClick={() => set({ paper: p.v })}>{p.label}</button>)}
              </div>
            </div>
          </>
        )}
        <div className="td5-q" data-td5="compose-link">
          <div className="td5-qh"><b>Link it to · optional</b></div>
          {d.link ? (
            <span className="td5-link" data-td5="compose-linked">
              <span className="td5-dn" aria-hidden="true">{d.link.kind === "manuscript" ? QUILL : d.link.label.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
              <b>{d.link.label}</b><small>{d.link.sub}</small>
              {edit ? null : <button type="button" aria-label="Remove the link" onClick={() => set({ link: null })}>×</button>}
            </span>
          ) : edit ? <p className="td5-cmp-say">Not linked to anything.</p> : (
            <button type="button" className="td5-addlink" data-td5="compose-addlink" aria-expanded={linking} onClick={() => setLinking((o) => !o)}>+ An agent or a query</button>
          )}
          {linking && !d.link ? (
            <div className="td5-linkpop" data-td5="compose-find">
              <input autoFocus placeholder="Find an agent, a query or a manuscript" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Find something to link" />
              <div className="td5-linklist">
                {links.map((l) => (
                  <button key={`${l.kind}-${l.id}`} type="button" data-link={`${l.kind}:${l.id}`} onClick={() => { set({ link: l }); setLinking(false); setFind(""); }}>
                    <b>{l.label}</b><small>{l.sub}</small>
                  </button>
                ))}
                {links.length ? null : <p className="td5-cmp-say">Nothing matches.</p>}
              </div>
            </div>
          ) : null}
          {d.link && edit ? <p className="td5-cmp-say">The link stays as it is when you edit.</p>
            : d.link && isTask && d.link.kind !== "manuscript" ? <p className="td5-cmp-say">It shows on {d.link.label}’s desk card, and in their profile.</p> : null}
        </div>
        <div className="td5-q" data-td5="compose-tags">
          <div className="td5-qh"><b>Tags · optional</b></div>
          <TagPicker compact tags={userTags} selected={d.tags} onToggle={(id) => set({ tags: toggleTagSel(d.tags, id) })}
            onCreate={(tag) => { onCreateTag(tag); set({ tags: [...d.tags, tag.id] }); }} />
        </div>
        {failed ? (
          <div className="td5-jn td5-jn--check" role="alert" data-td5="compose-failed"><b>Couldn’t save</b>Nothing was changed. Your words are kept. <button type="button" onClick={() => void save()}>Try again</button></div>
        ) : null}
      </div>
      <div className="td5-cfoot td5-cfoot--work" data-td5="card-foot">
        <span className="td5-note" data-td5="compose-consequence">{consequence}</span>
        <button type="button" className="td5-lnk" data-td5="compose-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="td5-b1" data-td5="compose-save" disabled={!can || busy} onClick={() => void save()}>
          {edit ? "Save the changes" : isTask ? "Add the task" : "Pin the note"}
        </button>
        <span className="td5-keys" aria-hidden="true"><kbd>↵</kbd> {isTask ? "adds" : "pins"}</span>
      </div>
    </article>
  );
};
