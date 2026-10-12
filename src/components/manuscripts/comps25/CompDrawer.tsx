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
 */
import React, { useRef } from "react";
import type { CompTitle } from "../../../types";
import type { CompDraft } from "../../../lib/comps";
import type { CompRow } from "../../../lib/compsLibrary";
import { dayMonth } from "../../../lib/dates";
import { HalfDrawer } from "../../shell/HalfDrawer";
import { StatusDot } from "../../StatusDot";
import { CompFormBody, CompFormFoot, TypeIcon, splitTags, useCompForm } from "../CompForm";
import { CloseButton, KindIcon, LetterIcon, LockIcon } from "./marks";

export const DRAWER_WIDTH = "min(640px, 54vw)";

export type DrawerState =
  | { mode: "view"; key: string }
  | { mode: "edit"; key: string; focusNote?: boolean }
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
  onClose: () => void;
  onEdit: (focusNote?: boolean) => void;
  onBackToView: () => void;
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
  const byline = c ? [c.author?.trim(), c.publisher?.trim() || (row!.kind === "book" ? "publisher not recorded" : ""), c.year ? String(c.year) : ""].filter(Boolean).join(" · ") : "";
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
    <div className="cv-layer cv-dh" data-cv="drawer-head">
      {state?.mode === "add" || !row ? (
        <>
          {/* a new comp's disc is ringed, and shows the type chosen below */}
          <span className="cv-cdisc is-ring" data-cv="drawer-disc" data-media={form.f.media}><TypeIcon media={form.f.media} /></span>
          <div>
            <h3 className="cv-dt" data-cv="drawer-title">{first ? "Add your first comp" : "Add a comp"}</h3>
            <small className="cv-dby">A book, film or show your manuscript sits beside.</small>
          </div>
        </>
      ) : (
        <>
          <span className={`cv-cdisc${row.where === "none" ? " is-ring" : ""}`} data-cv="drawer-disc"><KindIcon kind={row.kind} /></span>
          <div>
            <h3 className="cv-dt" data-cv="drawer-title">{state?.mode === "edit" ? `Edit ${c!.title}` : c!.title}</h3>
            <small className="cv-dby">{byline}</small>
          </div>
        </>
      )}
      <CloseButton className="cv-x" data-cv="drawer-close" onClick={p.onClose} />
    </div>
  );

  const foot = editing ? (
    <CompFormFoot form={form}
      onCancel={() => (state!.mode === "edit" ? p.onBackToView() : p.onClose())}
      onRemove={state!.mode === "edit" ? p.onRemove : undefined} removeBlocked={p.removeBlocked} />
  ) : row ? (
    <div className="cv-layer cv-df" data-cv="drawer-foot">
      <span>{row.where === "sent" ? "Its letter has gone out, so this record is fixed." : "You can still change which letters name it."}</span>
      <span className="cv-bt">
        <button type="button" className="cv-ghost" data-cv="drawer-edit" onClick={() => p.onEdit(false)}>Edit</button>
        <button type="button" className="cv-pillbtn" data-cv="drawer-pick" disabled={!row.ready} onClick={p.onPick}>Log in a letter</button>
      </span>
    </div>
  ) : undefined;

  return (
    <HalfDrawer probe="comp" open={open} onClose={p.onClose} label={state?.mode === "add" ? "Add a comp" : state?.mode === "edit" ? "Edit a comp" : "Comp details"} width={DRAWER_WIDTH} head={head} foot={foot} bodyRef={bodyRef}>
      {editing ? (
        <CompFormBody form={form} first={first} row={state?.mode === "edit" ? row : null} />
      ) : row ? (
        <div className="cv-layer cv-db" data-cv="drawer-body">
          <div className="cv-stat">
            <div><span>Named in</span><b data-cv="stat-named">{row.letters.length ? row.letters.map((l) => l.short).join(", ") : "No letter yet"}</b></div>
            <div><span>Seen by</span><b data-cv="stat-seen">{row.queries.length ? `${row.queries.length} ${row.queries.length === 1 ? "agent" : "agents"}` : "No one yet"}</b></div>
            <div><span>Asked for more</span><b data-cv="stat-asked">{row.queries.length ? row.askedForMore : "—"}</b></div>
          </div>

          <h5 className="cv-h5">Why it compares</h5>
          {c!.note?.trim()
            ? <p className="cv-why">{c!.note}</p>
            : <p className="cv-why is-none">No note yet. <button type="button" className="cv-addl" data-cv="add-note" onClick={() => p.onEdit(true)}>Add one</button></p>}
          {/* `matchAxis` split on "·" (trimmed, empties dropped): no chips and no label when there are none */}
          {tags.length > 0 && (
            <>
              <h5 className="cv-h5" data-cv="drawer-tags-label">Matches on</h5>
              <div className="cv-tags" data-cv="drawer-tags">{tags.map((t, i) => <span key={`${t}-${i}`}>{t}</span>)}</div>
            </>
          )}

          <h5 className="cv-h5">Letters and packages</h5>
          {row.letters.length ? row.letters.map((l) => (
            <div key={l.id} className="cv-lt" data-cv="drawer-letter">
              <LetterIcon /><b>{l.short}</b>
              <span className="cv-pk">{l.packages.length ? `in ${l.packages.join(", ")}` : "in no package"}</span>
              <span className="cv-lk">{l.sent ? <><LockIcon />SENT</> : "NOT SENT"}</span>
            </div>
          )) : <div className="cv-empq">{row.ready ? "Not logged in any letter yet." : "Add a publisher before a letter can name it."}</div>}

          <h5 className="cv-h5">Queries it went out with · <span data-cv="drawer-qn">{row.queries.length}</span></h5>
          {row.queries.length ? (
            <div className="cv-qt" data-cv="drawer-queries">
              {row.queries.map((q) => (
                <div key={q.id} className="cv-qr" data-cv="drawer-query" data-q={q.id}>
                  <span className="cv-disc">{q.initials}</span>
                  <span><b>{q.agentName}</b><small>{q.agency}</small></span>
                  <span>
                    <span className="cv-st"><StatusDot status={q.status} overrideSize={14} decorative />{statusWord(q.status)}</span>
                    <small className="cv-via">{[p.letterShortOf(q.letterId), q.packageName].filter(Boolean).join(" · ")}</small>
                  </span>
                  <span className="cv-d">{q.dateSent ? dayMonth(q.dateSent).toUpperCase() : "NO DATE"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="cv-empq" data-cv="drawer-noq">
              {row.letters.length
                ? "The letter that names it hasn’t gone out yet. When it does, each query appears here."
                : "Once it’s logged in a letter, every query that letter goes out with appears here."}
            </div>
          )}
        </div>
      ) : null}
    </HalfDrawer>
  );
};
