/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25, Part E: the comp drawer. "+ Add a comp" opens it on the empty form; Edit opens it on a comp's
 * form. It floats on the right (HalfDrawer: 8px in, 12px corners) and sits on the escape stack.
 *
 * Comps v26: add and edit are ONE form (`../CompForm`). The drawer calls its hook once, so the head
 * (the chosen type's disc, the drawer's only heading), the scrolling body and the pinned foot all
 * read the same state.
 *
 * ⚠️ PORTALLED, so everything in it hangs off `.cv-layer` (literals and `:root` tokens).
 *
 * Comps v30 §E: the drawer wears v30's dress (comps30/comps30.css, `.cp30-layer`): a navy head with the cream
 * media disc and the light ✕.
 * Comps v32: its detail view is retired — a comp's details live on the page, in the open comp beside the shelf. The
 * drawer adds and edits, nothing else (tests/e2e/RETIRED-comps-v32.md).
 */
import React, { useRef } from "react";
import type { CompTitle } from "../../../types";
import type { CompDraft } from "../../../lib/comps";
import type { CompRow } from "../../../lib/compsLibrary";
import { HalfDrawer } from "../../shell/HalfDrawer";
import { CompFormBody, CompFormFoot, TypeIcon, useCompForm } from "../CompForm";
import { Close30, Media30 } from "../comps30/marks30";

export const DRAWER_WIDTH = "min(640px, 54vw)";

export type DrawerState =
  | { mode: "edit"; key: string; focusNote?: boolean }
  | { mode: "add" };

export const CompDrawer: React.FC<{
  state: DrawerState | null;
  /** the comp being edited (null when adding) */
  row: CompRow | null;
  comps: readonly CompTitle[];
  /** why Remove is not offered, or null when it is */
  removeBlocked: string | null;
  /** ✕, Escape, Cancel and the dim */
  onClose: () => void;
  onSave: (draft: CompDraft) => void;
  /** `again`: the writer pressed "Add and add another", so the drawer stays open */
  onAdd: (draft: CompDraft, o: { again: boolean }) => void;
  onRemove: () => void;
  onShowExisting: (index: number) => void;
}> = (p) => {
  const { state, row } = p;
  const open = !!state && (state.mode === "add" || !!row);
  const c = row?.comp;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const first = p.comps.length === 0;
  const form = useCompForm({
    /* a new key whenever the drawer opens on something else, so the form starts from that comp */
    resetKey: !state ? "closed" : state.mode === "add" ? "add" : `edit:${state.key}`,
    mode: state?.mode === "edit" ? "edit" : "add",
    initial: state?.mode === "edit" ? c : undefined,
    focusNote: state?.mode === "edit" && !!state.focusNote,
    existing: p.comps.map((x, index) => ({ title: x.title, index })),
    first,
    onSave: (d, o) => (state?.mode === "edit" ? p.onSave(d) : p.onAdd(d, o)),
    onShowExisting: p.onShowExisting,
    onCleared: () => { if (bodyRef.current) bodyRef.current.scrollTop = 0; },
  });

  const editing = state?.mode === "edit" && !!row;
  const head = (
    <div className="cp30-layer cp30-dh" data-cv="drawer-head">
      {editing ? (
        <>
          <span className="cp30-md" data-cv="drawer-disc"><Media30 kind={row!.kind} /></span>
          <div className="cp30-dhx">
            <h3 className="cp30-dtl" data-cv="drawer-title">{`Edit ${c!.title}`}</h3>
            <span className="cp30-dby" data-cv="drawer-sub">Update its details.</span>
          </div>
        </>
      ) : (
        <>
          {/* a new comp's disc shows the type chosen below */}
          <span className="cp30-md" data-cv="drawer-disc" data-media={form.f.media}><TypeIcon media={form.f.media} /></span>
          <div className="cp30-dhx">
            <h3 className="cp30-dtl" data-cv="drawer-title">{first ? "Add your first comp" : "Add a comp"}</h3>
            <span className="cp30-dby" data-cv="drawer-sub">A book, film or show your manuscript sits beside.</span>
          </div>
        </>
      )}
      <Close30 data-cv="drawer-close" onClick={p.onClose} />
    </div>
  );

  const foot = state ? (
    <CompFormFoot form={form} onCancel={p.onClose}
      onRemove={state.mode === "edit" ? p.onRemove : undefined} removeBlocked={p.removeBlocked} />
  ) : undefined;

  return (
    <HalfDrawer probe="comp" open={open} onClose={p.onClose} onDim={p.onClose} label={state?.mode === "edit" ? "Edit a comp" : "Add a comp"} width={DRAWER_WIDTH} head={head} foot={foot} bodyRef={bodyRef}>
      {state ? <CompFormBody form={form} first={first} /> : null}
    </HalfDrawer>
  );
};
