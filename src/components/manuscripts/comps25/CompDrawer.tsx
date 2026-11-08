/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25, Part E: the comp drawer. A row opens it; "+ Add a comp" opens it on the
 * empty form; Edit swaps its body for the comp form. It floats on the right (HalfDrawer: 8px in,
 * 12px corners) and sits on the escape stack.
 *
 * Comps v26: add and edit are ONE form (`../CompForm`). The drawer calls its hook once, so the head
 * (the chosen type's disc, the drawer's only heading), the scrolling body and the pinned foot all
 * read the same state.
 *
 * ⚠️ PORTALLED, so everything in it hangs off `.cv-layer` (literals and `:root` tokens).
 *
 * Comps v30 §E: the drawer wears v30's dress (comps30/comps30.css, `.cp30-layer`): a navy head with the cream
 * media disc and the light ✕, three figures in one white box, sentence-case headings (no mono caps), the letters
 * with their query counts, the queries it went out with (an asked-for-more outcome in rust), and the footer note.
 * Its data, its journeys (edit, log in a letter), its focus return and its Escape stack are v28's, unchanged.
 */
import React, { useRef } from "react";
import type { CompTitle } from "../../../types";
import type { CompDraft } from "../../../lib/comps";
import type { CompRow } from "../../../lib/compsLibrary";
import { dayMonth } from "../../../lib/dates";
import { HalfDrawer } from "../../shell/HalfDrawer";
import { CompFormBody, CompFormFoot, TypeIcon, splitTags, useCompForm } from "../CompForm";
import { Close30, Env30, Media30 } from "../comps30/marks30";

export const DRAWER_WIDTH = "min(640px, 54vw)";

export type DrawerState =
  | { mode: "view"; key: string }
  /** `back`: opened from this comp's detail, so ✕, Escape, Cancel and Save return there (comps v28 §E) */
  | { mode: "edit"; key: string; focusNote?: boolean; back?: boolean }
  | { mode: "add" };

/** The same status words the Query Centre prints. */
const statusWord = (s: string): string => (s === "Rejected" ? "Passed" : s === "No Response" ? "Closed with no reply" : s.replace(/ (Requested|Sent)$/, (m) => m.toLowerCase()));

export const CompDrawer: React.FC<{
  state: DrawerState | null;
  row: CompRow | null;
  comps: readonly CompTitle[];
  /** why Remove is not offered, or null when it is */
  removeBlocked: string | null;
  letterShortOf: (letterId: string) => string;
  /** close everything (the dim, and ✕/Escape anywhere but an edit opened from the detail) */
  onClose: () => void;
  /** ✕, Escape and Cancel: back to the detail when the edit was opened from it, else close */
  onBack: () => void;
  onEdit: (focusNote?: boolean) => void;
  onPick: () => void;
  onSave: (draft: CompDraft) => void;
  /** `again`: the writer pressed "Add and add another", so the drawer stays open */
  onAdd: (draft: CompDraft, o: { again: boolean }) => void;
  onRemove: () => void;
  onShowExisting: (index: number) => void;
}> = (p) => {
  const { state, row } = p;
  const open = !!state && (state.mode === "add" || !!row);
  const c = row?.comp;
  const editing = state?.mode === "edit" || state?.mode === "add";
  const byline = c ? [c.author?.trim(), c.publisher?.trim(), c.year ? String(c.year) : ""].filter(Boolean).join(" · ") : "";
  /** a letter's queries, of the ones this comp went out with */
  const sentWith = (letterId: string) => row ? row.queries.filter((q) => q.letterId === letterId).length : 0;
  const tags = c ? splitTags(c.matchAxis) : [];

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const first = p.comps.length === 0;
  const form = useCompForm({
    /* a new key whenever the drawer opens on something else, so the form starts from that comp */
    resetKey: !state ? "closed" : state.mode === "add" ? "add" : state.mode === "edit" ? `edit:${state.key}` : `view:${state.key}`,
    mode: state?.mode === "edit" ? "edit" : "add",
    initial: state?.mode === "edit" ? c : undefined,
    focusNote: state?.mode === "edit" && !!state.focusNote,
    existing: p.comps.map((x, index) => ({ title: x.title, index })),
    first,
    onSave: (d, o) => (state?.mode === "edit" ? p.onSave(d) : p.onAdd(d, o)),
    onShowExisting: p.onShowExisting,
    onCleared: () => { if (bodyRef.current) bodyRef.current.scrollTop = 0; },
  });

  const head = (
    <div className="cp30-layer cp30-dh" data-cv="drawer-head">
      {state?.mode === "add" || !row ? (
        <>
          {/* a new comp's disc shows the type chosen below */}
          <span className="cp30-md" data-cv="drawer-disc" data-media={form.f.media}><TypeIcon media={form.f.media} /></span>
          <div className="cp30-dhx">
            <h3 className="cp30-dtl" data-cv="drawer-title">{first ? "Add your first comp" : "Add a comp"}</h3>
            <span className="cp30-dby" data-cv="drawer-sub">A book, film or show your manuscript sits beside.</span>
          </div>
        </>
      ) : (
        <>
          <span className="cp30-md" data-cv="drawer-disc"><Media30 kind={row.kind} /></span>
          <div className="cp30-dhx">
            <h3 className="cp30-dtl" data-cv="drawer-title">{state?.mode === "edit" ? `Edit ${c!.title}` : c!.title}</h3>
            {byline ? <span className="cp30-dby" data-cv="drawer-sub">{byline}</span> : null}
          </div>
        </>
      )}
      <Close30 data-cv="drawer-close" onClick={editing ? p.onBack : p.onClose} />
    </div>
  );

  const pct = row && row.queries.length ? Math.round((row.askedForMore / row.queries.length) * 100) : null;
  const foot = editing ? (
    <CompFormFoot form={form}
      onCancel={() => (state!.mode === "edit" ? p.onBack() : p.onClose())}
      onRemove={state!.mode === "edit" ? p.onRemove : undefined} removeBlocked={p.removeBlocked} />
  ) : row ? (
    <div className="cp30-layer cp30-df" data-cv="drawer-foot">
      <p data-cv="drawer-foot-line">{row.letters.some((l) => l.sent) ? "A sent letter names it, so that record is fixed." : "You can change this comp freely."}</p>
      <button type="button" className="cp30-btn is-s is-sm" data-cv="drawer-edit" onClick={() => p.onEdit(false)}>Edit</button>
      <button type="button" className="cp30-btn is-p is-sm" data-cv="drawer-pick" disabled={!row.ready} onClick={p.onPick}>Log in a letter</button>
    </div>
  ) : undefined;

  return (
    <HalfDrawer probe="comp" open={open} onClose={editing ? p.onBack : p.onClose} onDim={p.onClose} label={state?.mode === "add" ? "Add a comp" : state?.mode === "edit" ? "Edit a comp" : "Comp details"} width={DRAWER_WIDTH} head={head} foot={foot} bodyRef={bodyRef}>
      {editing ? (
        <CompFormBody form={form} first={first} />
      ) : row ? (
        <div className="cp30-layer cp30-db" data-cv="drawer-body">
          <div className="cp30-figs" data-cv="drawer-figs">
            <div><b data-cv="stat-named">{row.letters.length}</b><span>{row.letters.length === 1 ? "letter names it" : "letters name it"}</span></div>
            <div><b data-cv="stat-seen">{row.queries.length}</b><span>{row.queries.length === 1 ? "query it went out with" : "queries it went out with"}</span></div>
            <div><b data-cv="stat-asked">{pct === null ? "–" : `${pct}%`}</b><span>{pct === null ? "none sent yet" : `${row.askedForMore} asked for more`}</span></div>
          </div>

          <h4 className="cp30-h4">Why it compares</h4>
          {c!.note?.trim()
            ? <p className="cp30-dwhy">{c!.note}</p>
            : <p className="cp30-dwhy is-none">No line yet. Add one so you remember why it&rsquo;s on your shelf.<button type="button" className="cp30-lnk" data-cv="add-note" onClick={() => p.onEdit(true)}>Add one</button></p>}
          {tags.length > 0 && (
            <div className="cp30-chips" data-cv="drawer-tags">{tags.map((t, i) => <span key={`${t}-${i}`} className="cp30-pill">{t}</span>)}</div>
          )}

          <h4 className="cp30-h4">Letters</h4>
          {row.letters.length ? row.letters.map((l) => {
            const n = sentWith(l.id);
            return (
              <div key={l.id} className="cp30-lrow" data-cv="drawer-letter">
                <Env30 /><b>{l.name}</b>
                <em data-cv="drawer-letter-state">{l.sent ? `Sent with ${n} · fixed` : "Not sent yet"}</em>
              </div>
            );
          }) : <p className="cp30-dnil">{row.ready ? "No letter names it yet." : "Add a publisher and a year before a letter can name it."}</p>}

          {row.queries.length ? (
            <>
              <h4 className="cp30-h4">Queries it went out with</h4>
              <div data-cv="drawer-queries">
                {row.queries.map((q) => (
                  <div key={q.id} className="cp30-ag" data-cv="drawer-query" data-q={q.id}>
                    <span className="cp30-av" aria-hidden="true">{q.initials}</span>
                    <span className="cp30-aw"><b>{q.agentName}</b>{q.agency ? <small>{q.agency}</small> : null}</span>
                    <span className={`cp30-r${q.asked ? " is-ask" : ""}`} data-cv="drawer-outcome">
                      {statusWord(q.status)}
                      <small>{[q.dateSent ? dayMonth(q.dateSent) : "No date", p.letterShortOf(q.letterId)].filter(Boolean).join(" · ")}</small>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </HalfDrawer>
  );
};
